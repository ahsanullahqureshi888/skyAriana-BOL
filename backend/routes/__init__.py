from backend.routes.system import router as system_router
from backend.routes.bols import router as bols_router
from backend.routes.ledgers import router as ledgers_router
from backend.routes.companies import router as companies_router
from backend.routes.customers import router as customers_router
from backend.routes.shipments import router as shipments_router
from backend.routes.reports import router as reports_router
from backend.routes.backups import router as backups_router
from backend.routes.parties import router as parties_router
from backend.routes.containers import router as containers_router
from backend.routes.documents import router as documents_router, jobs_router
from backend.routes.auth import router as auth_router
from backend.routes.audit import router as audit_router

__all__ = [
    "system_router",
    "bols_router",
    "ledgers_router",
    "companies_router",
    "customers_router",
    "shipments_router",
    "reports_router",
    "backups_router",
    "parties_router",
    "containers_router",
    "documents_router",
    "jobs_router",
    "auth_router",
    "audit_router",
]

