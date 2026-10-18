from backend.models import ExportAccount, ImportAccount
from backend.routes.generic import build_crud_router

import_accounts_router = build_crud_router(ImportAccount, "import-accounts")
export_accounts_router = build_crud_router(ExportAccount, "export-accounts")
