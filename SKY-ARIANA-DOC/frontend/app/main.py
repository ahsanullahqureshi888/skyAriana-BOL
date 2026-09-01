from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import os
import shutil
import logging
from uuid import uuid4
from app.core.config import settings
from app.database.session import engine, SessionLocal, Base
from app.api import auth, invoices, customers, business_parties, products, settings as settings_api, dashboard, backup, user_management, system_update
from app.models import models
from app.core.security import get_password_hash
from decimal import Decimal
from datetime import date
from sqlalchemy import inspect, text
from app.services.invoice_party import normalize_party_snapshot
from app.services.access_control import ensure_access_control

app = FastAPI(title=settings.PROJECT_NAME)

logger = logging.getLogger("sky_ariana.api")


def request_id_for(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or str(uuid4())


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request.state.request_id = request.headers.get("x-request-id") or str(uuid4())
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled API error", extra={"request_id": request.state.request_id, "path": request.url.path})
        response = JSONResponse(
            status_code=500,
            content={"detail": "Unexpected server error. Please try again.", "requestId": request.state.request_id},
        )
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError):
    request_id = request_id_for(request)
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors()), "requestId": request_id},
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    request_id = request_id_for(request)
    headers = dict(exc.headers or {})
    headers["X-Request-ID"] = request_id
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": jsonable_encoder(exc.detail), "requestId": request_id},
        headers=headers,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(invoices.router, prefix=settings.API_V1_STR)
app.include_router(customers.router, prefix=settings.API_V1_STR)
app.include_router(business_parties.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(backup.router, prefix=settings.API_V1_STR)
app.include_router(user_management.router, prefix=settings.API_V1_STR)
app.include_router(system_update.router, prefix=settings.API_V1_STR)




@app.on_event("startup")
def startup_db_seed():
    Base.metadata.create_all(bind=engine)
    user_cols = {column["name"] for column in inspect(engine).get_columns("users")}
    user_migrations = {
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "display_name": "VARCHAR",
        "username": "VARCHAR",
        "phone": "VARCHAR",
        "avatar_url": "VARCHAR",
        "employee_id": "VARCHAR",
        "job_title": "VARCHAR",
        "department": "VARCHAR",
        "role_id": "INTEGER",
        "status": "VARCHAR NOT NULL DEFAULT 'active'",
        "language": "VARCHAR NOT NULL DEFAULT 'en'",
        "timezone": "VARCHAR NOT NULL DEFAULT 'Asia/Kabul'",
        "must_change_password": "BOOLEAN NOT NULL DEFAULT 0",
        "password_changed_at": "DATETIME",
        "failed_login_attempts": "INTEGER NOT NULL DEFAULT 0",
        "locked_until": "DATETIME",
        "last_login_at": "DATETIME",
        "last_login_ip": "VARCHAR",
        "created_by": "INTEGER",
        "updated_at": "DATETIME",
        "updated_by": "INTEGER",
        "deleted_at": "DATETIME",
        "deleted_by": "INTEGER",
        "deletion_reason": "TEXT",
    }
    for column_name, definition in user_migrations.items():
        if column_name not in user_cols:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {definition}"))
    with engine.begin() as connection:
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users(username) WHERE username IS NOT NULL"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL"))
    # Lightweight SQLite-compatible migration for existing installations.
    existing_cols = {column["name"] for column in inspect(engine).get_columns("invoices")}
    if "freight_rate" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN freight_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00"))
    if "documentation_fees" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN documentation_fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00"))
    if "customs_clearance_fees" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN customs_clearance_fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00"))
    if "notify_party" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN notify_party JSON"))
    if "shipper_exporter" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN shipper_exporter JSON"))
    if "notify_party_same_as_consignee" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN notify_party_same_as_consignee BOOLEAN NOT NULL DEFAULT 0"))
    if "notify_party_customer_id" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN notify_party_customer_id INTEGER"))
    if "invoice_template" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN invoice_template VARCHAR NOT NULL DEFAULT 'premium_afghan_glass'"))
    if "consignee_buyer" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN consignee_buyer JSON"))
    if "notify_party_enabled" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN notify_party_enabled BOOLEAN NOT NULL DEFAULT 0"))
    if "shipper_party_id" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN shipper_party_id INTEGER"))
    if "notify_party_id" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN notify_party_id INTEGER"))
    if "consignee_party_id" not in existing_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN consignee_party_id INTEGER"))

    # Business-party role and consignee import metadata were added without
    # replacing the existing registry.  Keep this migration SQLite-safe for
    # the local desktop database and for older installations.
    business_party_cols = {column["name"] for column in inspect(engine).get_columns("business_parties")}
    business_party_migrations = {
        "roles": "JSON",
        "country_code": "VARCHAR",
        "contact_person": "VARCHAR",
        "business_type": "VARCHAR",
        "website": "VARCHAR",
        "gstin": "VARCHAR",
        "iec": "VARCHAR",
        "pan": "VARCHAR",
        "fssai": "VARCHAR",
        "tin": "VARCHAR",
        "state_code": "VARCHAR",
        "identifiers": "JSON",
        "identifier_provenance": "JSON",
        "field_provenance": "JSON",
        "source_entries": "JSON",
        "review_status": "VARCHAR",
        "import_batch_id": "VARCHAR",
    }
    for column_name, definition in business_party_migrations.items():
        if column_name not in business_party_cols:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE business_parties ADD COLUMN {column_name} {definition}"))
    with engine.begin() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_business_parties_gstin ON business_parties(gstin)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_business_parties_iec ON business_parties(iec)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_business_parties_pan ON business_parties(pan)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_business_parties_fssai ON business_parties(fssai)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_business_parties_review_status ON business_parties(review_status)"))

    invoice_item_cols = {column["name"] for column in inspect(engine).get_columns("invoice_items")}
    invoice_item_migrations = {
        "product_catalog_id": "VARCHAR",
        "product_name": "VARCHAR",
        "product_variety": "VARCHAR",
        "product_grade": "VARCHAR",
        "custom_grade": "VARCHAR",
        "quantity_unit": "VARCHAR NOT NULL DEFAULT 'PCS'",
        "package_count": "NUMERIC(12, 3) NOT NULL DEFAULT 0",
        "package_type": "VARCHAR",
        "net_weight": "NUMERIC(12, 3) NOT NULL DEFAULT 0",
        "gross_weight": "NUMERIC(12, 3) NOT NULL DEFAULT 0",
        "weight_unit": "VARCHAR NOT NULL DEFAULT 'KG'",
        "currency": "VARCHAR NOT NULL DEFAULT 'USD'",
        "price_basis": "VARCHAR NOT NULL DEFAULT 'Per KG'",
        "country_of_origin": "VARCHAR",
        "lot_batch_number": "VARCHAR",
        "remarks": "TEXT",
    }
    for column_name, definition in invoice_item_migrations.items():
        if column_name not in invoice_item_cols:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE invoice_items ADD COLUMN {column_name} {definition}"))

    customer_cols = {column["name"] for column in inspect(engine).get_columns("customers")}
    if "contact_type" not in customer_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE customers ADD COLUMN contact_type VARCHAR NOT NULL DEFAULT 'consignee'"))
    if "additional_details" not in customer_cols:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE customers ADD COLUMN additional_details JSON"))

    settings_cols = {column["name"] for column in inspect(engine).get_columns("company_settings")}
    settings_migrations = {
        "default_invoice_template": "VARCHAR NOT NULL DEFAULT 'premium_afghan_glass'",
        "invoice_watermark_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "invoice_watermark_opacity": "NUMERIC(4, 3) NOT NULL DEFAULT 0.06",
        "invoice_qr_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "invoice_seal_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "invoice_signature_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "invoice_stamp_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "invoice_color_printing_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "invoice_compact_layout_enabled": "BOOLEAN NOT NULL DEFAULT 0",
    }
    for column_name, definition in settings_migrations.items():
        if column_name not in settings_cols:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE company_settings ADD COLUMN {column_name} {definition}"))
    
    db = SessionLocal()
    try:
        # Remove stale links left by older builds when the saved invoice snapshot is empty.
        for invoice in db.query(models.Invoice).all():
            normalized_notify = normalize_party_snapshot(invoice.notify_party)
            normalized_shipper = normalize_party_snapshot(invoice.shipper_exporter, strip_stale_notify_fragment=True)
            normalized_consignee = normalize_party_snapshot(invoice.consignee_buyer, strip_stale_notify_fragment=True)
            if normalized_notify is None:
                invoice.notify_party = None
                invoice.notify_party_enabled = False
                invoice.notify_party_same_as_consignee = False
                invoice.notify_party_customer_id = None
            elif normalized_notify != invoice.notify_party:
                invoice.notify_party = normalized_notify
                invoice.notify_party_enabled = True
            if normalized_shipper != invoice.shipper_exporter:
                invoice.shipper_exporter = normalized_shipper
            if normalized_consignee != invoice.consignee_buyer:
                invoice.consignee_buyer = normalized_consignee
        db.commit()

        # Seed Users
        admin_user = db.query(models.User).filter(models.User.email == "admin@skyariana.com").first()
        if not admin_user:
            admin_user = models.User(
                name="Admin User",
                email="admin@skyariana.com",
                password_hash=get_password_hash("admin123"),
                role="Admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
        accountant = db.query(models.User).filter(models.User.email == "accountant@skyariana.com").first()
        if not accountant:
            accountant = models.User(
                name="Accountant User",
                email="accountant@skyariana.com",
                password_hash=get_password_hash("accountant123"),
                role="Accountant",
                is_active=True
            )
            db.add(accountant)
            
        staff = db.query(models.User).filter(models.User.email == "staff@skyariana.com").first()
        if not staff:
            staff = models.User(
                name="Staff User",
                email="staff@skyariana.com",
                password_hash=get_password_hash("staff123"),
                role="Staff",
                is_active=True
            )
            db.add(staff)
            
        viewer = db.query(models.User).filter(models.User.email == "viewer@skyariana.com").first()
        if not viewer:
            viewer = models.User(
                name="Viewer User",
                email="viewer@skyariana.com",
                password_hash=get_password_hash("viewer123"),
                role="Viewer",
                is_active=True
            )
            db.add(viewer)
            db.commit()
            
        # Seed Settings
        settings_api.get_or_create_settings(db)
        
        # Copy logo if present
        default_logo_dest = os.path.join(settings.UPLOAD_DIR, "logo.png")
        if os.path.exists("logo.png") and not os.path.exists(default_logo_dest):
            try:
                shutil.copy2("logo.png", default_logo_dest)
                s = db.query(models.CompanySettings).filter(models.CompanySettings.id == 1).first()
                if s:
                    s.logo_path = default_logo_dest
                    db.commit()
            except Exception:
                pass
                
        # Seed Customer
        wavelon = db.query(models.Customer).filter(models.Customer.company_name == "WAVELON IMPEX").first()
        if not wavelon:
            wavelon = models.Customer(
                company_name="WAVELON IMPEX",
                contact_person="Purchasing Director",
                address="A 4008, RKLP MARKET, SAROLI, SURAT, INDIA",
                country="India",
                phone="+91 261 440 9901",
                email="imports@wavelonimpex.in",
                tax_number="GST-36WAVELON9"
            )
            db.add(wavelon)
            db.commit()
            db.refresh(wavelon)
            
        # Seed Product
        figs = db.query(models.Product).filter(models.Product.name == "DRY FIGS").first()
        if not figs:
            figs = models.Product(
                name="DRY FIGS",
                description="High quality sun-dried organic figs",
                hs_code="0804.20.10",
                default_unit="KG",
                default_price=Decimal("15.50")
            )
            db.add(figs)
            db.commit()
            db.refresh(figs)
            
        # Seed Invoice
        inv = db.query(models.Invoice).filter(models.Invoice.invoice_number == "INV-SABBB-2026-001").first()
        if not inv:
            inv = models.Invoice(
                invoice_number="INV-SABBB-2026-001",
                invoice_date=date.today(),
                due_date=date.today(),
                customer_id=wavelon.id,
                currency="USD",
                status="unpaid",
                freight=Decimal("1200.00"),
                insurance=Decimal("150.00"),
                other_charges=Decimal("0.00"),
                discount=Decimal("0.00"),
                tax=Decimal("0.00"),
                notes="Standard commercial delivery by air cargo.",
                created_by=admin_user.id
            )
            item = models.InvoiceItem(
                description="DRY FIGS Grade A Premium",
                hs_code="0804.20.10",
                quantity=400,
                unit="KG",
                unit_price=Decimal("15.50")
            )
            inv.items.append(item)
            
            ship = models.ShipmentDetails(
                booking_number="BKG-AC-99401",
                bill_of_lading_number="AWB-098-1124908",
                container_number="N/A - AIR CARGO",
                container_type="AIR",
                seal_number="N/A",
                commodity="DRY FIGS",
                gross_weight=Decimal("12000.0"),
                net_weight=Decimal("12000.0"),
                package_count=400,
                package_type="BOXES",
                port_of_loading="KABUL INTERNATIONAL AIRPORT, KABUL, AFGHANISTAN",
                port_of_discharge="INDIRA GANDHI INTERNATIONAL AIRPORT, DELHI, INDIA",
                vessel_name="Kam Air Cargo",
                voyage_number="RQ-992",
                shipping_line="Kam Air",
                incoterms="CIP",
                etd=date.today(),
                eta=date.today()
            )
            inv.shipment_details = ship
            
            subtotal = Decimal(item.quantity) * item.unit_price
            inv.subtotal = subtotal
            inv.grand_total = subtotal + inv.freight + inv.insurance
            inv.remaining_balance = inv.grand_total
            
            db.add(inv)
            db.commit()

        ensure_access_control(db)
            
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "SKY ARIANA & BALAM BAR BARAN API is running."}

@app.get("/api/health")
def read_health():
    return {"status": "ok", "service": "sky-ariana-api"}
