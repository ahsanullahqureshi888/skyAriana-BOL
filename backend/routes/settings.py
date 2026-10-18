from backend.models import AppSettings, CompanySettings, UserSettings
from backend.routes.generic import build_crud_router

company_settings_router = build_crud_router(CompanySettings, "settings")
user_settings_router = build_crud_router(UserSettings, "user-settings")
app_settings_router = build_crud_router(AppSettings, "app-settings")
