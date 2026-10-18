from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy import delete, select, text
from sqlalchemy.orm.exc import StaleDataError

from backend.database import SessionLocal, init_db
from backend.models import (
    AgentModel,
    AttachmentModel,
    AuditLogModel,
    BackupModel,
    Base,
    BOLItemModel,
    BOLModel,
    ClientModel,
    CommodityModel,
    CompanyModel,
    ConsigneeModel,
    ContainerModel,
    CustomerModel,
    DiscountModel,
    DocumentModel,
    DriverModel,
    ExpenseModel,
    FreightChargeModel,
    InvoiceItemModel,
    InvoiceModel,
    LedgerAccountModel,
    LedgerModel,
    LocationModel,
    NotifyPartyModel,
    PackingListModel,
    PaymentModel,
    PhytosanitaryCertificateModel,
    PortModel,
    ReportModel,
    RouteModel,
    SettingModel,
    ShipmentModel,
    ShipperModel,
    SupplierModel,
    TransitPaperModel,
    TruckModel,
    UserModel,
)


@pytest.fixture(autouse=True)
async def setup_models_db():
    await init_db()
    yield
    async with SessionLocal() as session:
        await session.execute(delete(BOLModel).where(BOLModel.bol_number.like("BOL-REL-%")))
        await session.execute(delete(BOLModel).where(BOLModel.bol_number.like("BOL-AF-%")))
        await session.execute(delete(LedgerModel).where(LedgerModel.description.like("Logistics entry %")))
        await session.execute(delete(LedgerModel).where(LedgerModel.description.like("Container freight invoice #INV-%")))
        await session.commit()


@pytest.mark.asyncio
async def test_all_36_models_registered():
    """Verify that all 36 required domain models are defined in Base.metadata."""
    expected_tables = {
        # Parties (8)
        "companies",
        "shippers",
        "consignees",
        "notify_parties",
        "agents",
        "customers",
        "clients",
        "suppliers",
        # Logistics (10)
        "bol_records",
        "bol_items",
        "shipments",
        "containers",
        "trucks",
        "drivers",
        "routes",
        "ports",
        "locations",
        "commodities",
        # Accounting (8)
        "ledgers",
        "ledger_records",
        "invoices",
        "invoice_items",
        "payments",
        "expenses",
        "freight_charges",
        "discounts",
        # Documents (6)
        "packing_lists",
        "transit_papers",
        "phytosanitary_certificates",
        "documents",
        "attachments",
        "reports",
        # System (4)
        "users",
        "settings",
        "audit_logs",
        "backups",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"
    assert len(expected_tables) == 36


@pytest.mark.asyncio
async def test_uuid_primary_keys_and_timestamps():
    """Verify that new entities get 36-character UUID primary keys and UTC timestamps."""
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        company = CompanyModel(
            company_name=f"Test Logistics Corp {uid}",
            code=f"TLC-{uid}",
        )
        session.add(company)
        await session.commit()
        await session.refresh(company)

        assert len(company.id) == 36
        assert "-" in company.id
        assert company.revision == 1
        assert company.created_at is not None
        assert company.updated_at is not None

        d = company.to_dict()
        assert d["id"] == company.id
        assert d["company_name"] == f"Test Logistics Corp {uid}"
        assert isinstance(d["created_at"], str)


@pytest.mark.asyncio
async def test_accounting_invariance_and_decimal_precision():
    """Verify exact Decimal arithmetic for double-entry ledger bookkeeping.

    Net Balance = Total Debit - Total Credit
    Zero float rounding drift.
    """
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        account = LedgerAccountModel(
            account_code=f"ACC-CUST-{uid}",
            account_name=f"Kabul Importers Ltd {uid}",
            account_type="customer",
            currency="USD",
            current_balance=Decimal("0.0000"),
        )
        session.add(account)
        await session.flush()

        debit = Decimal("12345.6789")
        credit = Decimal("2345.6789")
        balance = debit - credit  # Exactly 10000.0000

        entry = LedgerModel(
            account_id=account.account_code,
            account_name=account.account_name,
            transaction_date="2026-09-23",
            description=f"Container freight invoice #INV-{uid}",
            debit=debit,
            credit=credit,
            balance=balance,
            currency="USD",
            fee_type="freight",
            exchange_rate=Decimal("1.0000"),
            ledger_account_id=account.id,
        )
        session.add(entry)
        await session.commit()
        await session.refresh(entry)

        assert isinstance(entry.debit, Decimal)
        assert isinstance(entry.credit, Decimal)
        assert isinstance(entry.balance, Decimal)
        assert entry.balance == entry.debit - entry.credit
        assert entry.balance == Decimal("10000.0000")

        d = entry.to_dict()
        assert d["debit"] == "12345.6789"
        assert d["credit"] == "2345.6789"
        assert d["balance"] == "10000.0000"


@pytest.mark.asyncio
async def test_multi_modal_bol_consistency():
    """Verify multi-modal BOL metadata retention:

    origin, transit border stations, driver name, father name, driver rent,
    carton count, gross weight, net weight, fee segregation.
    """
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        driver = DriverModel(
            driver_name=f"Ahmad Shah {uid}",
            father_name="Ghulam Sarwar",
            national_id=f"TAZ-{uid}",
            phone="+93700123456",
        )
        truck = TruckModel(
            truck_number=f"AFG-{uid}-KBL",
            driver_name=f"Ahmad Shah {uid}",
            capacity_tons=Decimal("28.5000"),
        )
        session.add_all([driver, truck])
        await session.flush()

        bol = BOLModel(
            bol_number=f"BOL-AF-{uid}",
            origin="Bandar Abbas Port",
            destination="Kabul Customs Terminal",
            border_station="Islam Qala",
            driver_name=driver.driver_name,
            father_name=driver.father_name,
            driver_rent=Decimal("1450.5000"),
            carton_count=1200,
            gross_weight_kg=Decimal("24500.7500"),
            net_weight_kg=Decimal("23800.2500"),
            cargo_description="Electronic appliances and computer accessories",
            status="active",
            shipper_name=f"Shipper Co {uid}",
            consignee_name=f"Consignee Co {uid}",
            notify_party_name=f"Notify Co {uid}",
            freight_fee=Decimal("3800.0000"),
            demurrage_fee=Decimal("150.0000"),
            documentation_fee=Decimal("75.0000"),
            currency="USD",
            exchange_rate=Decimal("1.0000"),
            driver_id=driver.id,
            truck_id=truck.id,
        )
        session.add(bol)
        await session.flush()

        item = BOLItemModel(
            bol_id=bol.id,
            item_description="Smart LED Displays 55-inch",
            carton_count=600,
            gross_weight_kg=Decimal("12250.3750"),
            net_weight_kg=Decimal("11900.1250"),
            volume_cbm=Decimal("45.5000"),
            package_type="cartons",
        )
        session.add(item)

        transit = TransitPaperModel(
            transit_paper_number=f"TP-{uid}",
            bol_id=bol.id,
            border_station="Islam Qala",
            customs_declaration_no=f"CD-{uid}",
            status="cleared",
        )
        session.add(transit)
        await session.commit()
        await session.refresh(bol)

        assert bol.border_station == "Islam Qala"
        assert bol.driver_rent == Decimal("1450.5000")
        assert bol.gross_weight_kg == Decimal("24500.7500")
        assert bol.shipper_name == f"Shipper Co {uid}"
        assert bol.consignee_name == f"Consignee Co {uid}"
        assert len(bol.items) == 1
        assert bol.items[0].carton_count == 600


@pytest.mark.asyncio
async def test_invoice_and_fee_demarcation_with_multi_currency():
    """Verify demarcation of Freight, Demurrage/Detention, and Documentation Fees

    with USD vs. AFN currency support and exchange rates.
    """
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        customer = CustomerModel(
            customer_name=f"Ariana Traders Co. {uid}",
            phone="+93799112233",
        )
        session.add(customer)
        await session.flush()

        invoice_afn = InvoiceModel(
            invoice_number=f"INV-{uid}-AFN",
            customer_id=customer.id,
            customer_name=customer.customer_name,
            status="issued",
            freight_fee=Decimal("266000.0000"),
            demurrage_fee=Decimal("10500.0000"),
            documentation_fee=Decimal("5250.0000"),
            subtotal=Decimal("281750.0000"),
            tax_amount=Decimal("0.0000"),
            discount_total=Decimal("5000.0000"),
            total_amount=Decimal("276750.0000"),
            paid_amount=Decimal("100000.0000"),
            currency="AFN",
            exchange_rate=Decimal("70.0000"),
        )
        session.add(invoice_afn)
        await session.flush()

        item1 = InvoiceItemModel(
            invoice_id=invoice_afn.id,
            description="Cross-border freight transport",
            fee_category="freight",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("266000.0000"),
            amount=Decimal("266000.0000"),
        )
        item2 = InvoiceItemModel(
            invoice_id=invoice_afn.id,
            description="Border transit documentation fee",
            fee_category="documentation",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("5250.0000"),
            amount=Decimal("5250.0000"),
        )
        session.add_all([item1, item2])

        payment = PaymentModel(
            payment_number=f"PAY-{uid}",
            invoice_id=invoice_afn.id,
            customer_id=customer.id,
            payment_date=invoice_afn.created_at,
            amount=Decimal("100000.0000"),
            currency="AFN",
            exchange_rate=Decimal("70.0000"),
            payment_method="hawala",
            reference_no=f"HWL-{uid}",
        )
        session.add(payment)

        discount = DiscountModel(
            invoice_id=invoice_afn.id,
            discount_type="fixed",
            discount_value=Decimal("5000.0000"),
            discount_amount=Decimal("5000.0000"),
            description="Preferred trader volume discount",
            authorized_by="Management",
        )
        session.add(discount)
        await session.commit()
        await session.refresh(invoice_afn)

        assert invoice_afn.currency == "AFN"
        assert invoice_afn.exchange_rate == Decimal("70.0000")
        assert invoice_afn.freight_fee == Decimal("266000.0000")
        assert invoice_afn.demurrage_fee == Decimal("10500.0000")
        assert invoice_afn.documentation_fee == Decimal("5250.0000")
        assert len(invoice_afn.items) == 2
        assert len(invoice_afn.payments) == 1
        assert len(invoice_afn.discounts) == 1


@pytest.mark.asyncio
async def test_optimistic_locking_revision():
    """Verify optimistic locking via the revision column.

    When an entity is updated, revision increments automatically.
    Concurrent updates with a stale revision fail with StaleDataError.
    """
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as session1:
        cust = CustomerModel(customer_name=f"Concurrency Test Customer {uid}")
        session1.add(cust)
        await session1.commit()
        await session1.refresh(cust)

        cust_id = cust.id
        assert cust.revision == 1

        cust.customer_name = f"Concurrency Updated by 1 {uid}"
        await session1.commit()
        await session1.refresh(cust)
        assert cust.revision == 2

    # Test stale data detection
    async with SessionLocal() as session_stale:
        loaded = (await session_stale.execute(
            select(CustomerModel).where(CustomerModel.id == cust_id)
        )).scalar_one()

        async with SessionLocal() as session_concurrent:
            conc = (await session_concurrent.execute(
                select(CustomerModel).where(CustomerModel.id == cust_id)
            )).scalar_one()
            conc.customer_name = f"Concurrent Writer Updated {uid}"
            await session_concurrent.commit()
            assert conc.revision == 3

        loaded.customer_name = f"Stale Update Should Fail {uid}"
        with pytest.raises(StaleDataError):
            await session_stale.commit()


@pytest.mark.asyncio
async def test_frequently_searched_field_indexes_created():
    """Verify explicit database indexes exist on key search columns."""
    async with SessionLocal() as session:
        result = await session.execute(
            text("SELECT tbl_name, name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%';")
        )
        indexes = {(row[0], row[1]) for row in result.fetchall()}
        index_names = {idx[1] for idx in indexes}

        expected_index_patterns = [
            "bol_records_bol_number",
            "bol_records_shipper_name",
            "bol_records_consignee_name",
            "bol_records_notify_party_name",
            "containers_container_number",
            "invoices_invoice_number",
            "invoices_due_date",
            "trucks_truck_number",
            "customers_customer_name",
            "companies_company_name",
            "shippers_name",
            "consignees_name",
            "notify_parties_name",
            "shipments_status",
            "shipments_reference_number",
            "shipments_departure_date",
            "shipments_arrival_date",
            "ledger_records_account_id",
            "ledger_records_transaction_date",
            "audit_logs_created_at",
        ]
        for pattern in expected_index_patterns:
            matching = [name for name in index_names if pattern in name]
            assert len(matching) > 0, f"Expected index containing '{pattern}' not found in DB! Existing: {index_names}"


@pytest.mark.asyncio
async def test_cross_model_relationship_navigation():
    """Verify bidirectional ORM navigation across parties, logistics, accounting, and documents."""
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as session:
        company = CompanyModel(company_name=f"Holding Corp {uid}", code=f"HC-{uid}")
        driver = DriverModel(driver_name=f"Nasir Khan {uid}", father_name="Abdul Ghani")
        truck = TruckModel(truck_number=f"TRK-{uid}", driver=driver)
        commodity = CommodityModel(commodity_name=f"Dried Figs {uid}", hs_code="08042000")
        route = RouteModel(route_name=f"Kabul-Hairatan {uid}", origin="Kabul", destination="Hairatan")
        customer = CustomerModel(customer_name=f"Mazar Imports {uid}")

        shipper = ShipperModel(name=f"Shipper {uid}", company=company)
        consignee = ConsigneeModel(name=f"Consignee {uid}", company=company)
        notify_party = NotifyPartyModel(name=f"Notify {uid}")

        session.add_all([company, driver, truck, commodity, route, customer, shipper, consignee, notify_party])
        await session.flush()

        bol = BOLModel(
            bol_number=f"BOL-REL-{uid}",
            origin="Hairatan",
            destination="Kabul",
            border_station="Hairatan",
            driver_name=driver.driver_name,
            company=company,
            shipper=shipper,
            consignee=consignee,
            notify_party=notify_party,
            driver=driver,
            truck=truck,
        )
        session.add(bol)
        await session.flush()

        item = BOLItemModel(bol=bol, commodity=commodity, item_description="Dried Figs 50kg Bags", carton_count=100)
        shipment = ShipmentModel(
            tracking_number=f"TRK-SHP-{uid}",
            reference_number=bol.bol_number,
            origin="Hairatan",
            destination="Kabul",
            bol=bol,
            route=route,
        )
        container = ContainerModel(container_number=f"CONT-{uid}", bol=bol, shipment=shipment)
        invoice = InvoiceModel(
            invoice_number=f"INV-REL-{uid}",
            customer=customer,
            bol=bol,
            customer_name=customer.customer_name,
        )
        account = LedgerAccountModel(account_code=f"ACC-{uid}", account_name=f"Ledger {uid}")
        session.add_all([item, shipment, container, invoice, account])
        await session.flush()

        ledger_entry = LedgerModel(
            account_id=account.account_code,
            account_name=account.account_name,
            transaction_date="2026-09-23",
            description=f"Logistics entry {uid}",
            ledger_account=account,
            bol=bol,
            invoice=invoice,
        )
        payment = PaymentModel(
            payment_number=f"PAY-REL-{uid}",
            customer=customer,
            invoice=invoice,
            payment_date=datetime.now(timezone.utc),
            amount=Decimal("500.0000"),
        )
        expense = ExpenseModel(
            expense_number=f"EXP-{uid}",
            category="customs",
            amount=Decimal("120.0000"),
            expense_date=datetime.now(timezone.utc),
            bol=bol,
            description="Border clearance fee",
        )
        freight_charge = FreightChargeModel(
            bol=bol,
            shipment=shipment,
            charge_type="road_freight",
            amount=Decimal("800.0000"),
        )
        discount = DiscountModel(
            invoice=invoice,
            bol=bol,
            discount_type="fixed",
            discount_value=Decimal("50.0000"),
            discount_amount=Decimal("50.0000"),
        )
        transit_paper = TransitPaperModel(
            transit_paper_number=f"TP-REL-{uid}",
            bol=bol,
            border_station="Hairatan",
        )
        packing_list = PackingListModel(
            packing_list_number=f"PK-REL-{uid}",
            bol=bol,
            shipment=shipment,
        )
        doc = DocumentModel(
            title=f"BOL Scanned Copy {uid}",
            document_type="bol_scan",
            bol=bol,
            shipment=shipment,
            invoice=invoice,
            file_path=f"/uploads/bol-{uid}.pdf",
        )
        session.add_all([ledger_entry, payment, expense, freight_charge, discount, transit_paper, packing_list, doc])
        await session.commit()

        # Query back and verify bi-directional navigation
        queried_bol = (await session.execute(
            select(BOLModel).where(BOLModel.id == bol.id)
        )).scalar_one()

        # 1. BOL to Parties
        assert queried_bol.company.company_name == f"Holding Corp {uid}"
        assert queried_bol.shipper.name == f"Shipper {uid}"
        assert queried_bol.consignee.name == f"Consignee {uid}"
        assert queried_bol.notify_party.name == f"Notify {uid}"
        assert queried_bol.driver.driver_name == f"Nasir Khan {uid}"
        assert queried_bol.truck.truck_number == f"TRK-{uid}"

        # 2. BOL to Logistics Items & Relations
        assert len(queried_bol.items) == 1
        assert queried_bol.items[0].commodity.commodity_name == f"Dried Figs {uid}"
        assert len(queried_bol.shipments) == 1
        assert queried_bol.shipments[0].route.route_name == f"Kabul-Hairatan {uid}"
        assert len(queried_bol.containers) == 1
        assert queried_bol.containers[0].shipment.tracking_number == f"TRK-SHP-{uid}"

        # 3. BOL to Accounting & Documents
        assert len(queried_bol.invoices) == 1
        assert queried_bol.invoices[0].customer.customer_name == f"Mazar Imports {uid}"
        assert len(queried_bol.ledgers) == 1
        assert queried_bol.ledgers[0].ledger_account.account_code == f"ACC-{uid}"
        assert len(queried_bol.expenses) == 1
        assert len(queried_bol.freight_charges) == 1
        assert len(queried_bol.discounts) == 1
        assert len(queried_bol.transit_papers) == 1
        assert len(queried_bol.packing_lists) == 1
        assert len(queried_bol.documents) == 1

        # 4. Reverse navigation via async queries
        queried_customer = (await session.execute(
            select(CustomerModel).where(CustomerModel.id == customer.id)
        )).scalar_one()
        assert queried_customer.invoices[0].invoice_number == f"INV-REL-{uid}"
        assert queried_customer.payments[0].payment_number == f"PAY-REL-{uid}"

        queried_driver = (await session.execute(
            select(DriverModel).where(DriverModel.id == driver.id)
        )).scalar_one()
        assert queried_driver.trucks[0].truck_number == f"TRK-{uid}"

        queried_company = (await session.execute(
            select(CompanyModel).where(CompanyModel.id == company.id)
        )).scalar_one()
        assert queried_company.shippers[0].name == f"Shipper {uid}"
        assert queried_company.consignees[0].name == f"Consignee {uid}"


@pytest.mark.asyncio
async def test_to_dict_date_and_uuid_serialization():
    """Verify that to_dict converts date, datetime, UUID, and Decimal to strings safely."""
    setting = SettingModel(
        key="app_test_key",
        category="system",
        value="test_value",
    )
    d = setting.to_dict()
    assert isinstance(d["id"], str)
    assert isinstance(d["revision"], int)
    assert isinstance(d["created_at"], str)
    assert d["key"] == "app_test_key"
