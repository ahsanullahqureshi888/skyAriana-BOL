from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


def resolve_app_data_dir(env_mode: str | None = None) -> Path:
    """Resolve the application data directory safely for Windows and other OS.

    In production (%LOCALAPPDATA%\\AQ COMPANIES\\data on Windows),
    or local data directory in development.
    """
    override = os.getenv("SKY_DATA_DIR")
    if override:
        path = Path(override).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    mode = (env_mode or os.getenv("APP_ENV") or os.getenv("NODE_ENV", "development")).lower()
    is_prod = mode in ("production", "prod") or os.getenv("SKY_DESKTOP") == "1"

    if is_prod and sys.platform == "win32":
        local_app_data = os.getenv("LOCALAPPDATA")
        if local_app_data:
            path = Path(local_app_data) / "AQ COMPANIES" / "data"
            path.mkdir(parents=True, exist_ok=True)
            return path

    root_dir = Path(__file__).resolve().parent.parent
    dev_path = root_dir / "data"
    dev_path.mkdir(parents=True, exist_ok=True)
    return dev_path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "AQ COMPANIES - Logistics & BOL Management Backend"
    APP_VERSION: str = "5.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = False

    HOST: str = "127.0.0.1"
    PORT: int = 8000

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    DATA_DIR: Path | None = None
    DATABASE_URL: str | None = None

    # Server PC & Office Networking Settings
    CONNECTION_MODE: str = "local"  # "local" vs "server"
    SERVER_NAME: str = "AQ-OFFICE-SERVER"
    MINIMUM_CLIENT_VERSION: str = "5.0.0"
    MAINTENANCE_MODE: bool = False

    # PostgreSQL Connection Pooling (Office Multi-PC Usage)
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in ("production", "prod") or os.getenv("SKY_DESKTOP") == "1"

    @property
    def resolved_data_dir(self) -> Path:
        if self.DATA_DIR:
            self.DATA_DIR.mkdir(parents=True, exist_ok=True)
            return self.DATA_DIR
        return resolve_app_data_dir(self.APP_ENV)

    @property
    def is_postgres(self) -> bool:
        url = (self.DATABASE_URL or "").lower()
        return "postgres" in url

    @property
    def is_sqlite(self) -> bool:
        return not self.is_postgres

    @property
    def sqlite_file_path(self) -> Path:
        if self.DATABASE_URL and "sqlite" in self.DATABASE_URL:
            raw = self.DATABASE_URL.split(":///")[-1]
            return Path(raw)
        return self.resolved_data_dir / "app.db"

    @property
    def resolved_database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
                url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
            elif url.startswith("postgresql://") and not (
                url.startswith("postgresql+asyncpg://") or url.startswith("postgresql+psycopg://")
            ):
                # Prefer asyncpg for asynchronous SQLAlchemy operations
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        db_file = self.resolved_data_dir / "app.db"
        return f"sqlite+aiosqlite:///{db_file.as_posix()}"

    @property
    def sync_database_url(self) -> str:
        url = self.resolved_database_url
        if url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql+psycopg://"):
            return url
        return url

    @property
    def logs_dir(self) -> Path:
        path = self.resolved_data_dir / "logs"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def backups_dir(self) -> Path:
        path = self.resolved_data_dir / "backups"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def exports_dir(self) -> Path:
        path = self.resolved_data_dir / "exports"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def reports_dir(self) -> Path:
        path = self.resolved_data_dir / "reports"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def uploads_dir(self) -> Path:
        path = self.resolved_data_dir / "uploads"
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
