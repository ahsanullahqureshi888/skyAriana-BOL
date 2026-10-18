from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.migration.cleaners import (
    clean_code,
    clean_text,
    safe_datetime,
    safe_decimal,
    safe_int,
)
from backend.migration.config import MigrationConfig
from backend.migration.relational_mapper import RelationalMapper
from backend.migration.report import MigrationReport
from backend.models.accounting import (
    ExpenseModel,
    InvoiceItemModel,
    InvoiceModel,
    LedgerAccountModel,
    LedgerModel,
    PaymentModel,
)
from backend.models.documents import DocumentModel
from backend.models.logistics import (
    BOLItemModel,
    BOLModel,
    ContainerModel,
    DriverModel,
    ShipmentModel,
    TruckModel,
)
from backend.models.parties import (
    CompanyModel,
    ConsigneeModel,
    CustomerModel,
    NotifyPartyModel,
    ShipperModel,
)
from backend.models.system import AuditLogModel

logger = logging.getLogger("sky_ariana.migration.loaders")


class DatabaseLoader:
    """Transactional, batch-safe database loader executing in proper relational order."""

    def __init__(self, session: AsyncSession, config: MigrationConfig, mapper: RelationalMapper, report: MigrationReport):
        self.session = session
        self.config = config
        self.mapper = mapper
        self.report = report

    async def _get_existing_keys(self, model: Any, column_name: str) -> Set[str]:
        """Fetch set of already existing unique keys to guarantee idempotency."""
        col = getattr(model, column_name)
        stmt = select(col)
        result = await self.session.execute(stmt)
        return {clean_code(val) for val in result.scalars().all() if val is not None}

    async def load_parties(
        self,
        companies: List[Dict[str, Any]],
        shippers: List[Dict[str, Any]],
        consignees: List[Dict[str, Any]],
        customers: List[Dict[str, Any]],
    ) -> None:
        """Load companies, shippers, consignees, and customers."""
        # 1. Companies
        existing_companies = await self._get_existing_keys(CompanyModel, "company_name")
        comp_inserted = 0
        for comp in companies:
            c_name = clean_text(comp.get("company_name") or comp.get("name") or "")
            if not c_name or clean_code(c_name) in existing_companies:
                # Still map to existing if already present
                continue
            code = clean_code(comp.get("code") or c_name[:10])
            model = CompanyModel(
                company_name=c_name,
                code=code,
                contact_phone=clean_text(comp.get("phone")),
                contact_email=clean_text(comp.get("email")),
                address=clean_text(comp.get("address")),
                city=clean_text(comp.get("city")),
                country=clean_text(comp.get("country", "Afghanistan")),
                is_active=True,
            )
            self.session.add(model)
            self.mapper.register_company(c_name, code, model.id)
            existing_companies.add(clean_code(c_name))
            comp_inserted += 1

        await self.session.flush()
        self.report.record_entity("companies", len(companies), len(companies), comp_inserted, len(companies) - comp_inserted)

        # 2. Shippers
        existing_shippers = await self._get_existing_keys(ShipperModel, "name")
        shp_inserted = 0
        for shp in shippers:
            s_name = clean_text(shp.get("name") or shp.get("shipper_name") or "")
            if not s_name:
                continue
            norm = clean_code(s_name)
            if norm in existing_shippers:
                continue
            model = ShipperModel(
                name=s_name,
                code=clean_code(shp.get("code") or s_name[:10]),
                contact_person=clean_text(shp.get("contact_person")),
                phone=clean_text(shp.get("phone")),
                email=clean_text(shp.get("email")),
                address=clean_text(shp.get("address")),
                city=clean_text(shp.get("city")),
                country=clean_text(shp.get("country")),
            )
            self.session.add(model)
            self.mapper.register_shipper(s_name, model.id)
            existing_shippers.add(norm)
            shp_inserted += 1

        await self.session.flush()
        self.report.record_entity("shippers", len(shippers), len(shippers), shp_inserted, len(shippers) - shp_inserted)

        # 3. Consignees
        existing_consignees = await self._get_existing_keys(ConsigneeModel, "name")
        cng_inserted = 0
        for cng in consignees:
            c_name = clean_text(cng.get("name") or cng.get("consignee_name") or "")
            if not c_name:
                continue
            norm = clean_code(c_name)
            if norm in existing_consignees:
                continue
            model = ConsigneeModel(
                name=c_name,
                code=clean_code(cng.get("code") or c_name[:10]),
                contact_person=clean_text(cng.get("contact_person")),
                phone=clean_text(cng.get("phone")),
                email=clean_text(cng.get("email")),
                address=clean_text(cng.get("address")),
                city=clean_text(cng.get("city")),
                country=clean_text(cng.get("country")),
            )
            self.session.add(model)
            self.mapper.register_consignee(c_name, model.id)
            existing_consignees.add(norm)
            cng_inserted += 1

        await self.session.flush()
        self.report.record_entity("consignees", len(consignees), len(consignees), cng_inserted, len(consignees) - cng_inserted)

        # 4. Customers
        existing_custs = await self._get_existing_keys(CustomerModel, "customer_name")
        cust_inserted = 0
        for cust in customers:
            c_name = clean_text(cust.get("customer_name") or cust.get("name") or cust.get("account_name") or "")
            if not c_name:
                continue
            norm = clean_code(c_name)
            if norm in existing_custs:
                continue
            model = CustomerModel(
                customer_name=c_name,
                customer_type=clean_text(cust.get("customer_type") or cust.get("type") or "importer"),
                phone=clean_text(cust.get("phone") or cust.get("contact")),
                company=clean_text(cust.get("company")),
                email=clean_text(cust.get("email")),
                address=clean_text(cust.get("address")),
            )
            self.session.add(model)
            self.mapper.register_customer(c_name, model.id)
            existing_custs.add(norm)
            cust_inserted += 1

        await self.session.flush()
        self.report.record_entity("customers", len(customers), len(customers), cust_inserted, len(customers) - cust_inserted)

    async def load_fleet(self, drivers: List[Dict[str, Any]], trucks: List[Dict[str, Any]]) -> None:
        """Load drivers and trucks."""
        # Drivers
        existing_drivers = await self._get_existing_keys(DriverModel, "driver_name")
        drv_inserted = 0
        for d in drivers:
            d_name = clean_text(d.get("driver_name") or d.get("name") or "")
            if not d_name:
                continue
            norm = clean_code(d_name)
            if norm in existing_drivers:
                continue
            model = DriverModel(
                driver_name=d_name,
                father_name=clean_text(d.get("father_name") or d.get("driverFatherName")),
                national_id=clean_text(d.get("national_id")),
                passport_number=clean_text(d.get("passport_number")),
                license_number=clean_text(d.get("license_number")),
                phone=clean_text(d.get("phone") or d.get("driverPhone")),
                is_active=True,
            )
            self.session.add(model)
            self.mapper.register_driver(d_name, model.id)
            existing_drivers.add(norm)
            drv_inserted += 1

        await self.session.flush()
        self.report.record_entity("drivers", len(drivers), len(drivers), drv_inserted, len(drivers) - drv_inserted)

        # Trucks
        existing_trucks = await self._get_existing_keys(TruckModel, "truck_number")
        trk_inserted = 0
        for t in trucks:
            t_num = clean_text(t.get("truck_number") or t.get("afghanPlate") or t.get("truckNo") or "")
            if not t_num:
                continue
            norm = clean_code(t_num)
            if norm in existing_trucks:
                continue
            d_id = self.mapper.resolve_driver_id(t.get("driver_name") or t.get("driverName"))
            model = TruckModel(
                truck_number=t_num,
                driver_id=d_id,
                driver_name=clean_text(t.get("driver_name") or t.get("driverName")),
                destination=clean_text(t.get("destination")),
                truck_model=clean_text(t.get("truck_model")),
                capacity_tons=safe_decimal(t.get("capacity_tons")),
            )
            self.session.add(model)
            self.mapper.register_truck(t_num, model.id)
            existing_trucks.add(norm)
            trk_inserted += 1

        await self.session.flush()
        self.report.record_entity("trucks", len(trucks), len(trucks), trk_inserted, len(trucks) - trk_inserted)

    async def load_bols(self, bols: List[Dict[str, Any]]) -> None:
        """Load Bills of Lading with items, cargo, driver rent, and border metadata."""
        existing_bols = await self._get_existing_keys(BOLModel, "bol_number")
        inserted = 0

        for b in bols:
            b_num = clean_code(
                b.get("bol_number")
                or b.get("billOfLadingNumber")
                or b.get("bolNo")
                or b.get("barnamehNo")
                or ""
            )
            if not b_num or b_num in existing_bols:
                continue

            driver_info = b.get("truck") if isinstance(b.get("truck"), dict) else {}
            driver_name = clean_text(
                b.get("driver_name")
                or b.get("driverName")
                or driver_info.get("driverName")
                or "Driver Unspecified"
            )
            father_name = clean_text(
                b.get("father_name")
                or b.get("driver_father_name")
                or driver_info.get("driverFatherName")
            )
            driver_rent = safe_decimal(
                b.get("driver_rent")
                or b.get("driverRent")
                or b.get("driverFreight")
                or driver_info.get("driverRent")
            )

            cargo_info = b.get("cargo") if isinstance(b.get("cargo"), dict) else {}
            carton_count = safe_int(
                b.get("carton_count")
                or b.get("cartons")
                or cargo_info.get("cartons")
                or b.get("number_of_packages")
            )
            gross_weight = safe_decimal(
                b.get("gross_weight_kg")
                or b.get("gross_weight")
                or b.get("grossWeight")
                or cargo_info.get("grossWeightKg")
            )
            net_weight = safe_decimal(
                b.get("net_weight_kg")
                or b.get("net_weight")
                or b.get("netWeight")
                or cargo_info.get("netWeightKg")
            )

            transport = b.get("transport") if isinstance(b.get("transport"), dict) else {}
            origin = clean_text(
                b.get("origin")
                or transport.get("origin")
                or transport.get("loadingPlace")
                or "Kandahar, Afghanistan"
            )
            destination = clean_text(
                b.get("destination")
                or transport.get("finalDestination")
                or transport.get("portOfDischarge")
            )
            border_station = clean_text(
                b.get("border_station")
                or transport.get("borderCrossing")
                or "Islam Qala"
            )

            finance = b.get("finance") if isinstance(b.get("finance"), dict) else {}
            freight_fee = safe_decimal(finance.get("freightAmount") or b.get("freight_fee") or b.get("freightAmount"))
            demurrage_fee = safe_decimal(finance.get("demurrageCost") or b.get("demurrage_fee"))
            doc_fee = safe_decimal(finance.get("documentationFee") or b.get("documentation_fee") or 150)
            currency = clean_code(finance.get("currency") or b.get("currency") or "USD")

            shipper_name = clean_text(
                (b.get("shipper") or {}).get("name") if isinstance(b.get("shipper"), dict) else b.get("shipper_name") or b.get("shipperName")
            )
            consignee_name = clean_text(
                (b.get("consignee") or {}).get("name") if isinstance(b.get("consignee"), dict) else b.get("consignee_name") or b.get("consigneeName")
            )

            issue_dt = safe_datetime(b.get("issue_date") or b.get("issueDate") or b.get("created_at") or b.get("createdAt"))

            model = BOLModel(
                bol_number=b_num,
                issue_date=issue_dt,
                origin=origin,
                destination=destination,
                border_station=border_station,
                driver_name=driver_name,
                father_name=father_name,
                driver_rent=driver_rent,
                carton_count=carton_count,
                gross_weight_kg=gross_weight,
                net_weight_kg=net_weight,
                cargo_description=clean_text(b.get("cargo_description") or cargo_info.get("descriptionOfGoods")),
                status=clean_text(b.get("status") or "active"),
                shipper_name=shipper_name,
                consignee_name=consignee_name,
                freight_fee=freight_fee,
                demurrage_fee=demurrage_fee,
                documentation_fee=doc_fee,
                currency=currency,
                exchange_rate=Decimal("1.0000"),
                shipper_id=self.mapper.resolve_shipper_id(shipper_name),
                consignee_id=self.mapper.resolve_consignee_id(consignee_name),
                driver_id=self.mapper.resolve_driver_id(driver_name),
                truck_id=self.mapper.resolve_truck_id(driver_info.get("afghanPlate")),
            )
            self.session.add(model)
            self.mapper.register_bol(b_num, model.id)
            existing_bols.add(b_num)
            inserted += 1

            # BOL Item
            desc = clean_text(cargo_info.get("commodity") or model.cargo_description or "General Cargo")
            item = BOLItemModel(
                bol_id=model.id,
                item_description=desc,
                carton_count=carton_count,
                gross_weight_kg=gross_weight,
                net_weight_kg=net_weight,
                volume_cbm=Decimal("0.0000"),
                package_type="cartons",
            )
            self.session.add(item)

        await self.session.flush()
        self.report.record_entity("bol_records", len(bols), len(bols), inserted, len(bols) - inserted)

    async def load_shipments_and_containers(self, shipments: List[Dict[str, Any]]) -> None:
        """Load shipments and containers linked to BOLs."""
        existing_trks = await self._get_existing_keys(ShipmentModel, "tracking_number")
        existing_ctrs = await self._get_existing_keys(ContainerModel, "container_number")
        shp_inserted = 0
        ctr_inserted = 0

        for s in shipments:
            ref_no = clean_code(s.get("referenceNumber") or s.get("bol_number") or "")
            trk_no = clean_code(s.get("id") or s.get("tracking_number") or f"TRK-{ref_no}")
            if not trk_no or trk_no in existing_trks:
                continue

            bol_id = self.mapper.resolve_bol_id(ref_no)
            transport = s.get("transport") if isinstance(s.get("transport"), dict) else {}
            origin = clean_text(s.get("currentLocation") or transport.get("origin") or "Kandahar")
            destination = clean_text(s.get("nextDestination") or transport.get("finalDestination") or "Destination")

            dep_dt = safe_datetime(s.get("createdAt"))
            arr_dt = safe_datetime(s.get("eta") or s.get("updatedAt"))

            ship_model = ShipmentModel(
                tracking_number=trk_no,
                reference_number=ref_no,
                bol_id=bol_id,
                bol_number=ref_no,
                origin=origin,
                destination=destination,
                status=clean_text(s.get("status") or "in_transit"),
                departure_date=dep_dt,
                arrival_date=arr_dt,
            )
            self.session.add(ship_model)
            existing_trks.add(trk_no)
            shp_inserted += 1

            # Container
            ctr_info = s.get("container") if isinstance(s.get("container"), dict) else {}
            ctr_no = clean_code(ctr_info.get("containerNumber") or s.get("containerNo") or "")
            if ctr_no and ctr_no not in existing_ctrs:
                ctr_model = ContainerModel(
                    container_number=ctr_no,
                    container_type=clean_text(ctr_info.get("containerType") or "40HC"),
                    seal_number=clean_text(ctr_info.get("sealNumber")),
                    tare_weight_kg=Decimal("0.0000"),
                    max_payload_kg=Decimal("0.0000"),
                    status="in_transit",
                    bol_id=bol_id,
                    shipment_id=ship_model.id,
                )
                self.session.add(ctr_model)
                existing_ctrs.add(ctr_no)
                ctr_inserted += 1

        await self.session.flush()
        self.report.record_entity("shipments", len(shipments), len(shipments), shp_inserted, len(shipments) - shp_inserted)
        self.report.record_entity("containers", ctr_inserted, ctr_inserted, ctr_inserted, 0)

    async def load_ledger_accounts(self, accounts: List[Dict[str, Any]]) -> None:
        """Load double-entry chart of accounts."""
        existing_codes = await self._get_existing_keys(LedgerAccountModel, "account_code")
        inserted = 0

        for a in accounts:
            code = clean_code(a.get("account_code") or a.get("id") or "")
            name = clean_text(a.get("account_name") or a.get("name") or code)
            if not code or code in existing_codes:
                continue

            balance = safe_decimal(a.get("current_balance"))
            currency = clean_code(a.get("currency") or "USD")
            acc_type = clean_text(a.get("account_type") or "customer")

            model = LedgerAccountModel(
                account_code=code,
                account_name=name,
                account_type=acc_type,
                currency=currency,
                current_balance=balance,
                is_active=True,
            )
            self.session.add(model)
            self.mapper.register_ledger_account(code, name, model.id, a.get("aliases"))
            existing_codes.add(code)
            inserted += 1

        await self.session.flush()
        self.report.record_entity("ledgers", len(accounts), len(accounts), inserted, len(accounts) - inserted)

    async def load_ledger_transactions(self, transactions: List[Dict[str, Any]]) -> None:
        """Load ledger entries in transactional batches."""
        inserted = 0
        batch_size = self.config.batch_size

        for i in range(0, len(transactions), batch_size):
            chunk = transactions[i : i + batch_size]
            for t in chunk:
                acc_ref = str(t.get("account_id") or t.get("account_name") or "")
                ledger_acc_id = self.mapper.resolve_ledger_account_id(acc_ref)

                b_num = clean_code(t.get("bol_number") or t.get("billOfLanding") or t.get("barnamehNo") or "")
                bol_id = self.mapper.resolve_bol_id(b_num)

                inv_num = clean_code(t.get("invoice_number") or t.get("invoiceNo") or "")
                inv_id = self.mapper.resolve_invoice_id(inv_num)

                debit = safe_decimal(t.get("debit"))
                credit = safe_decimal(t.get("credit"))
                balance = safe_decimal(t.get("running_balance") or t.get("balance"))
                date_str = str(t.get("transaction_date") or t.get("date") or "2026-01-01")

                model = LedgerModel(
                    account_id=acc_ref,
                    account_name=clean_text(t.get("account_name") or acc_ref),
                    transaction_date=date_str,
                    description=clean_text(t.get("description") or "Ledger Entry", max_length=256),
                    debit=debit,
                    credit=credit,
                    balance=balance,
                    currency=clean_code(t.get("currency") or "USD"),
                    fee_type=clean_text(t.get("fee_type") or "freight"),
                    exchange_rate=safe_decimal(t.get("exchange_rate") or "1.0000"),
                    reference_id=clean_text(t.get("reference_number") or b_num or inv_num),
                    ledger_account_id=ledger_acc_id,
                    bol_id=bol_id,
                    invoice_id=inv_id,
                )
                self.session.add(model)
                inserted += 1

            await self.session.flush()

        self.report.record_entity(
            "ledger_records",
            len(transactions),
            len(transactions),
            inserted,
            0,
        )

    async def load_invoices(self, invoices: List[Dict[str, Any]]) -> None:
        """Load invoices and nested invoice line items."""
        existing_invoices = await self._get_existing_keys(InvoiceModel, "invoice_number")
        inv_inserted = 0
        item_inserted = 0

        for inv in invoices:
            inv_no = clean_code(inv.get("invoice_number") or inv.get("id") or "")
            if not inv_no or inv_no in existing_invoices:
                continue

            b_num = clean_code(inv.get("bl_no") or inv.get("bol_number") or "")
            bol_id = self.mapper.resolve_bol_id(b_num)
            cust_name = clean_text(inv.get("buyer_name") or inv.get("customer_name") or "Direct Customer")
            cust_id = self.mapper.resolve_customer_id(cust_name)

            issue_dt = safe_datetime(inv.get("invoice_date") or inv.get("created_at"))
            due_dt = safe_datetime(inv.get("due_date"))

            freight_fee = safe_decimal(inv.get("freight_charges") or inv.get("freight_fee"))
            demurrage_fee = safe_decimal(inv.get("demurrage_charges") or inv.get("demurrage_fee"))
            doc_fee = safe_decimal(inv.get("documentation_charges") or inv.get("documentation_fee"))

            # Calculate total from items or provided total
            raw_items = inv.get("items") if isinstance(inv.get("items"), list) else []
            items_total = sum(
                (safe_decimal(it.get("quantity", 1)) * safe_decimal(it.get("unitPrice") or it.get("unit_price") or it.get("amount")))
                for it in raw_items
            )
            total = safe_decimal(inv.get("total_amount") or items_total or (freight_fee + demurrage_fee + doc_fee))

            model = InvoiceModel(
                invoice_number=inv_no,
                customer_id=cust_id,
                customer_name=cust_name,
                bol_id=bol_id,
                issue_date=issue_dt,
                due_date=due_dt,
                status=clean_text(inv.get("payment_status") or inv.get("status") or "draft"),
                subtotal=total,
                tax_amount=safe_decimal(inv.get("tax")),
                discount_total=safe_decimal(inv.get("discount")),
                total_amount=total,
                paid_amount=safe_decimal(inv.get("paid_amount")),
                freight_fee=freight_fee,
                demurrage_fee=demurrage_fee,
                documentation_fee=doc_fee,
                currency=clean_code(inv.get("currency") or "USD"),
                exchange_rate=Decimal("1.0000"),
                notes=clean_text(inv.get("notes") or inv.get("terms")),
            )
            self.session.add(model)
            self.mapper.register_invoice(inv_no, model.id)
            existing_invoices.add(inv_no)
            inv_inserted += 1

            for it in raw_items:
                qty = safe_decimal(it.get("quantity") or 1)
                unit_p = safe_decimal(it.get("unitPrice") or it.get("unit_price") or 0)
                amt = safe_decimal(it.get("amount") or (qty * unit_p))
                item_model = InvoiceItemModel(
                    invoice_id=model.id,
                    description=clean_text(it.get("description") or "Invoice line item"),
                    fee_category=clean_text(it.get("fee_category") or "general"),
                    quantity=qty,
                    unit_price=unit_p,
                    amount=amt,
                )
                self.session.add(item_model)
                item_inserted += 1

        await self.session.flush()
        self.report.record_entity("invoices", len(invoices), len(invoices), inv_inserted, len(invoices) - inv_inserted)
        self.report.record_entity("invoice_items", item_inserted, item_inserted, item_inserted, 0)

    async def load_payments(self, payments: List[Dict[str, Any]]) -> None:
        """Load payments and payment receipts."""
        existing_pmts = await self._get_existing_keys(PaymentModel, "payment_number")
        inserted = 0

        for p in payments:
            rcpt_no = clean_code(p.get("receipt_number") or p.get("payment_number") or p.get("id") or "")
            if not rcpt_no or rcpt_no in existing_pmts:
                continue

            p_date = safe_datetime(p.get("date") or p.get("payment_date") or p.get("created_at")) or datetime.now(timezone.utc)
            cust_name = clean_text(p.get("received_from") or p.get("account_name") or "Customer")
            cust_id = self.mapper.resolve_customer_id(cust_name)

            inv_no = clean_code(p.get("applied_invoice") or "")
            inv_id = self.mapper.resolve_invoice_id(inv_no)

            model = PaymentModel(
                payment_number=rcpt_no,
                invoice_id=inv_id,
                customer_id=cust_id,
                payment_date=p_date,
                amount=safe_decimal(p.get("amount")),
                currency=clean_code(p.get("currency") or "USD"),
                exchange_rate=Decimal("1.0000"),
                payment_method=clean_text(p.get("payment_method") or "cash"),
                reference_no=clean_text(p.get("reference") or p.get("payment_id")),
                notes=clean_text(p.get("notes")),
            )
            self.session.add(model)
            existing_pmts.add(rcpt_no)
            inserted += 1

        await self.session.flush()
        self.report.record_entity("payments", len(payments), len(payments), inserted, len(payments) - inserted)

    async def load_expenses(self, expenses: List[Dict[str, Any]]) -> None:
        """Load operational general expenses."""
        existing_expenses = await self._get_existing_keys(ExpenseModel, "expense_number")
        inserted = 0

        for exp in expenses:
            exp_no = clean_code(exp.get("expense_number") or exp.get("id") or exp.get("reference") or "")
            if not exp_no or exp_no in existing_expenses:
                continue

            exp_date = safe_datetime(exp.get("date") or exp.get("postingDate") or exp.get("created_at")) or datetime.now(timezone.utc)
            b_num = clean_code(exp.get("bol_number") or "")
            bol_id = self.mapper.resolve_bol_id(b_num)

            model = ExpenseModel(
                expense_number=exp_no,
                category=clean_text(exp.get("category") or "office"),
                amount=safe_decimal(exp.get("amount")),
                currency=clean_code(exp.get("currency") or "USD"),
                exchange_rate=Decimal("1.0000"),
                expense_date=exp_date,
                bol_id=bol_id,
                paid_to=clean_text(exp.get("vendorName") or exp.get("paid_to")),
                description=clean_text(exp.get("description") or "Operational Expense"),
                approved_by=clean_text(exp.get("approved_by") or exp.get("branch")),
            )
            self.session.add(model)
            existing_expenses.add(exp_no)
            inserted += 1

        await self.session.flush()
        self.report.record_entity("expenses", len(expenses), len(expenses), inserted, len(expenses) - inserted)

    async def load_audit_logs(self, logs: List[Dict[str, Any]]) -> None:
        """Load audit trail records."""
        inserted = 0
        for log in logs:
            action = clean_text(log.get("action") or "legacy_action")
            entity = clean_text(log.get("module") or log.get("entity_type") or "system")
            user = clean_text(log.get("actor") or log.get("user") or "system")

            model = AuditLogModel(
                username=user,
                action=action,
                entity_type=entity,
                entity_id=clean_text(log.get("entityId") or log.get("id")),
                old_values_json=clean_text(log.get("oldValue")),
                new_values_json=clean_text(log.get("newValue") or log.get("details")),
                ip_address=clean_text(log.get("ipAddress") or "127.0.0.1"),
            )
            self.session.add(model)
            inserted += 1

        await self.session.flush()
        self.report.record_entity("audit_logs", len(logs), len(logs), inserted, 0)

    async def load_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Load shipment documents."""
        inserted = 0
        for doc in documents:
            title = clean_text(doc.get("documentType") or doc.get("title") or "Document Package")
            b_num = clean_code(doc.get("bolNumber") or doc.get("bolId") or "")
            bol_id = self.mapper.resolve_bol_id(b_num)

            model = DocumentModel(
                title=title,
                document_type=clean_text(doc.get("documentType") or "bol_package"),
                bol_id=bol_id,
                file_path=clean_text(doc.get("filePath") or f"/documents/{doc.get('id')}.json"),
                file_size=safe_int(doc.get("fileSize") or 1024),
                mime_type="application/json",
            )
            self.session.add(model)
            inserted += 1

        await self.session.flush()
        self.report.record_entity("documents", len(documents), len(documents), inserted, 0)
