from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.config import settings
from backend.database import SessionLocal, engine, init_db
from backend.migration.config import MigrationConfig
from backend.migration.deduplicator import Deduplicator
from backend.migration.extractors import DataExtractor, ExtractedDataset
from backend.migration.invariance import AccountingInvarianceChecker
from backend.migration.loaders import DatabaseLoader
from backend.migration.relational_mapper import RelationalMapper
from backend.migration.report import MigrationReport

logger = logging.getLogger("sky_ariana.migration.pipeline")


class MigrationPipeline:
    """Automated, non-destructive ETL migration pipeline."""

    def __init__(self, config: Optional[MigrationConfig] = None):
        self.config = config or MigrationConfig()
        self.report = MigrationReport()
        self.mapper = RelationalMapper()
        self.deduplicator = Deduplicator()
        self.extractor = DataExtractor(self.config.base_dir)

    async def run(self) -> MigrationReport:
        """Execute the end-to-end migration pipeline."""
        logger.info("Starting Sky Ariana BOL ETL Migration Pipeline...")
        self.report.notes.append("Pipeline started.")

        custom_engine = None
        try:
            # 1. Initialize DB schema if needed
            if self.config.database_url:
                custom_engine = create_async_engine(
                    self.config.database_url,
                    connect_args={"check_same_thread": False} if "sqlite" in self.config.database_url else {},
                )
                from backend.database import Base
                import backend.models  # noqa: F401
                async with custom_engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
            else:
                await init_db()

            # 2. Extract data non-destructively
            logger.info("Extracting data from local snapshots...")
            dataset: ExtractedDataset = self.extractor.extract_all()
            self.report.files_scanned = dataset.scanned_files

            # 3. Deduplicate & Clean Entities
            logger.info("Deduplicating accounts and master entities...")
            unique_accounts = self.deduplicator.deduplicate_accounts(dataset.accounts)
            unique_bols = self.deduplicator.deduplicate_bols(dataset.bol_records)
            unique_shipments = self.deduplicator.deduplicate_shipments(dataset.shipments)
            unique_invoices = self.deduplicator.deduplicate_invoices(dataset.invoices)
            unique_txns = self.deduplicator.deduplicate_transactions(dataset.ledger_transactions)
            unique_payments = self.deduplicator.deduplicate_payments(dataset.payment_receipts)
            unique_expenses = self.deduplicator.deduplicate_expenses(dataset.expenses)
            unique_audit_logs = self.deduplicator.deduplicate_audit_logs(dataset.audit_logs)
            documents = dataset.documents

            # Extract distinct sub-entities for relational loading
            shippers_list = []
            consignees_list = []
            drivers_list = []
            trucks_list = []

            for b in unique_bols:
                if b.get("shipper"):
                    shippers_list.append(b["shipper"] if isinstance(b["shipper"], dict) else {"name": b["shipper"]})
                elif b.get("shipper_name"):
                    shippers_list.append({"name": b["shipper_name"]})

                if b.get("consignee"):
                    consignees_list.append(b["consignee"] if isinstance(b["consignee"], dict) else {"name": b["consignee"]})
                elif b.get("consignee_name"):
                    consignees_list.append({"name": b["consignee_name"]})

                if b.get("truck") and isinstance(b["truck"], dict):
                    t = b["truck"]
                    if t.get("driverName"):
                        drivers_list.append({"driver_name": t.get("driverName"), "father_name": t.get("driverFatherName"), "phone": t.get("driverPhone")})
                    if t.get("afghanPlate"):
                        trucks_list.append({"truck_number": t.get("afghanPlate"), "driver_name": t.get("driverName")})
                elif b.get("driver_name"):
                    drivers_list.append({"driver_name": b.get("driver_name"), "father_name": b.get("father_name")})

            for s in unique_shipments:
                if s.get("shipper") and isinstance(s["shipper"], dict):
                    shippers_list.append(s["shipper"])
                if s.get("consignee") and isinstance(s["consignee"], dict):
                    consignees_list.append(s["consignee"])
                if s.get("truck") and isinstance(s["truck"], dict):
                    t = s["truck"]
                    if t.get("driverName"):
                        drivers_list.append({"driver_name": t.get("driverName"), "father_name": t.get("driverFatherName"), "phone": t.get("driverPhone")})
                    if t.get("afghanPlate"):
                        trucks_list.append({"truck_number": t.get("afghanPlate"), "driver_name": t.get("driverName")})

            # 4. Verify Accounting Invariance
            logger.info("Performing Accounting Invariance check on transactions...")
            txns_by_acc: Dict[str, List[Dict[str, Any]]] = {}
            for t in unique_txns:
                acc_id = str(t.get("account_id") or t.get("account_name") or "")
                txns_by_acc.setdefault(acc_id, []).append(t)

            invariance_summary = AccountingInvarianceChecker.verify_all(unique_accounts, txns_by_acc)
            self.report.invariance_summary = invariance_summary
            logger.info(
                f"Invariance check completed: {invariance_summary.accounts_passed}/{invariance_summary.total_accounts_checked} passed. "
                f"Net Balance: {invariance_summary.grand_net_balance}"
            )

            # 5. Database Transaction Execution
            session_factory = SessionLocal
            if self.config.database_url:
                db_engine = create_async_engine(
                    self.config.database_url,
                    connect_args={"check_same_thread": False} if "sqlite" in self.config.database_url else {},
                )
                session_factory = async_sessionmaker(
                    bind=db_engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=AsyncSession
                )

            async with session_factory() as session:
                loader = DatabaseLoader(session, self.config, self.mapper, self.report)
                try:
                    # Load hierarchy
                    await loader.load_parties(
                        companies=[],
                        shippers=shippers_list,
                        consignees=consignees_list,
                        customers=unique_accounts,
                    )
                    await loader.load_fleet(drivers=drivers_list, trucks=trucks_list)
                    await loader.load_bols(bols=unique_bols)
                    await loader.load_shipments_and_containers(shipments=unique_shipments)
                    await loader.load_ledger_accounts(accounts=unique_accounts)
                    await loader.load_invoices(invoices=unique_invoices)
                    await loader.load_ledger_transactions(transactions=unique_txns)
                    await loader.load_payments(payments=unique_payments)
                    await loader.load_expenses(expenses=unique_expenses)
                    await loader.load_audit_logs(logs=unique_audit_logs)
                    await loader.load_documents(documents=documents)

                    if self.config.dry_run:
                        logger.info("DRY-RUN mode active: rolling back transaction.")
                        await session.rollback()
                        self.report.notes.append("DRY-RUN completed. Database rolled back cleanly.")
                    else:
                        logger.info("Committing database transaction...")
                        await session.commit()
                        self.report.notes.append("Production migration transaction committed successfully.")

                except Exception as exc:
                    logger.error(f"Migration error during loading: {exc}", exc_info=True)
                    await session.rollback()
                    self.report.success = False
                    self.report.errors.append(f"Database loading transaction aborted and rolled back: {exc}")
                    raise

        except Exception as exc:
            self.report.success = False
            self.report.errors.append(str(exc))
            logger.error(f"Migration pipeline encountered fatal error: {exc}", exc_info=True)

        finally:
            self.report.finish()
            # Save reports
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            json_report_path = self.config.report_dir / f"migration_audit_report_{ts}.json"
            md_report_path = self.config.report_dir / f"migration_audit_report_{ts}.md"
            self.report.save_json(json_report_path)
            self.report.save_markdown(md_report_path)
            logger.info(f"Audit reports written to:\n - {json_report_path}\n - {md_report_path}")

        return self.report
