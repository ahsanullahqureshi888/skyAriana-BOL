from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
import pytest
from sqlalchemy import select

from backend.migration.config import MigrationConfig
from backend.migration.pipeline import MigrationPipeline
from backend.migration.cleaners import safe_decimal, safe_datetime, clean_text
from backend.migration.deduplicator import Deduplicator
from backend.migration.invariance import AccountingInvarianceChecker
from backend.models.parties import CustomerModel, ShipperModel, ConsigneeModel
from backend.models.logistics import BOLModel, ShipmentModel
from backend.models.accounting import LedgerModel, LedgerAccountModel


def test_cleaners():
    assert safe_decimal("1,250.50") == Decimal("1250.5000")
    assert safe_decimal(1500) == Decimal("1500.0000")
    assert safe_decimal(None, Decimal("0.0000")) == Decimal("0.0000")
    assert safe_decimal("invalid", Decimal("0.0000")) == Decimal("0.0000")

    dt = safe_datetime("2026-09-23T10:00:00Z")
    assert dt is not None
    assert dt.year == 2026

    assert clean_text("  Kabul Port  ") == "Kabul Port"
    assert clean_text(None) == ""


def test_deduplicator():
    dedup = Deduplicator()
    accounts = [
        {"id": "ACC-1", "name": "Customer A"},
        {"id": "ACC-1", "name": "Customer A Duplicate"},
        {"id": "ACC-2", "name": "Customer B"},
    ]
    unique_accs = dedup.deduplicate_accounts(accounts)
    assert len(unique_accs) == 2
    assert unique_accs[0]["id"] == "ACC-1"
    assert unique_accs[1]["id"] == "ACC-2"

    bols = [
        {"bol_number": "BOL-101", "driver_name": "Driver 1"},
        {"bol_number": "BOL-101", "driver_name": "Driver 1 Copy"},
        {"bol_number": "BOL-102", "driver_name": "Driver 2"},
    ]
    unique_bols = dedup.deduplicate_bols(bols)
    assert len(unique_bols) == 2


def test_accounting_invariance_checker():
    accounts = [{"id": "ACC-100", "name": "Haji Trading Co"}]
    txns = {
        "ACC-100": [
            {"transaction_date": "2026-09-01", "debit": 5000, "credit": 0, "balance": 5000},
            {"transaction_date": "2026-09-05", "debit": 0, "credit": 2000, "balance": 3000},
            {"transaction_date": "2026-09-10", "debit": 1000, "credit": 0, "balance": 4000},
        ]
    }
    summary = AccountingInvarianceChecker.verify_all(accounts, txns)
    assert summary.total_accounts_checked == 1
    assert summary.accounts_passed == 1
    assert summary.accounts_failed == 0
    assert summary.grand_total_debit == Decimal("6000.0000")
    assert summary.grand_total_credit == Decimal("2000.0000")
    assert summary.grand_net_balance == Decimal("4000.0000")


@pytest.mark.asyncio
async def test_migration_pipeline_execution(tmp_path: Path):
    # Setup temporary SQLite database
    db_file = tmp_path / "test_migrated.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"
    report_dir = tmp_path / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)

    config = MigrationConfig(
        dry_run=False,
        database_url=db_url,
        report_dir=report_dir,
        batch_size=50,
    )

    pipeline = MigrationPipeline(config)
    report = await pipeline.run()

    assert report.success is True
    assert report.invariance_summary is not None
    assert report.invariance_summary.accounts_failed == 0
    assert report.entity_counts["ledger_records"]["inserted"] > 0
    assert report.entity_counts["customers"]["inserted"] > 0

    # Verify data in SQLite database directly
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    engine = create_async_engine(db_url, connect_args={"check_same_thread": False})
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession)

    async with session_factory() as session:
        # Check customers
        result = await session.execute(select(CustomerModel))
        customers = result.scalars().all()
        assert len(customers) > 0

        # Check ledger records
        result = await session.execute(select(LedgerModel))
        ledger_records = result.scalars().all()
        assert len(ledger_records) > 0

        # Check invariance on DB records
        total_debit = sum(Decimal(str(r.debit)) for r in ledger_records)
        total_credit = sum(Decimal(str(r.credit)) for r in ledger_records)
        assert total_debit > Decimal("0.0000")
        assert total_credit > Decimal("0.0000")
        assert len(ledger_records) == report.entity_counts["ledger_records"]["inserted"]

    await engine.dispose()
