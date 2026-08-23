from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import EXPORTS_DIR, FRONTEND_ORIGINS, REPORTS_DIR, UPLOADS_DIR
from backend.database import init_db
from backend.routes.accounts import export_accounts_router, import_accounts_router
from backend.routes.account_ledgers import router as account_ledgers_router
from backend.routes.auth import router as auth_router
from backend.routes.backup import router as backup_router
from backend.routes.bill_of_lading import router as bol_router
from backend.routes.excel import router as excel_router
from backend.routes.invoices import router as invoices_router
from backend.routes.ledgers import router as ledgers_router
from backend.routes.media import media_router, upload_router
from backend.routes.pdf import router as pdf_router
from backend.routes.reports import router as reports_router
from backend.routes.search import router as search_router
from backend.routes.settings import app_settings_router, company_settings_router, user_settings_router
from backend.routes.trucks import containers_router, trucks_router
from backend.routes.users import router as users_router


app = FastAPI(
    title="SKY ARIANA LIMITED API",
    version="1.0.0",
    description="FastAPI backend for invoices, BOL, ledgers, trucks, media, documents, settings, and reports.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

@app.on_event("startup")
async def on_startup() -> None:
    await init_db()

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request, exc):
    print(f"Database Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal database error occurred.", "source": "python-fastapi"},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": str(exc), "details": exc.errors(), "source": "python-fastapi"},
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "uploads": str(UPLOADS_DIR),
        "exports": str(EXPORTS_DIR),
        "reports": str(REPORTS_DIR),
    }


@app.get("/api/health")
def api_health():
    return health()


app.include_router(auth_router, prefix="/api/auth")
app.include_router(users_router, prefix="/api/users")
app.include_router(invoices_router, prefix="/api/invoices")
app.include_router(bol_router, prefix="/api/bill-of-lading")
app.include_router(bol_router, prefix="/api/bol")
app.include_router(import_accounts_router, prefix="/api/import-accounts")
app.include_router(export_accounts_router, prefix="/api/export-accounts")
app.include_router(account_ledgers_router, prefix="/api/account-ledgers")
app.include_router(ledgers_router, prefix="/api/ledger-entries")
app.include_router(trucks_router, prefix="/api/trucks")
app.include_router(containers_router, prefix="/api/containers")
app.include_router(media_router, prefix="/api/media")
app.include_router(upload_router, prefix="/api/upload")
app.include_router(upload_router, prefix="/api/media/upload")
app.include_router(pdf_router, prefix="/api/pdf")
app.include_router(excel_router, prefix="/api/excel")
app.include_router(company_settings_router, prefix="/api/company-settings")
app.include_router(company_settings_router, prefix="/api/settings")
app.include_router(user_settings_router, prefix="/api/user-settings")
app.include_router(app_settings_router, prefix="/api/app-settings")
app.include_router(reports_router, prefix="/api/reports")
app.include_router(search_router, prefix="/api/search")
app.include_router(backup_router, prefix="/api/backup")
