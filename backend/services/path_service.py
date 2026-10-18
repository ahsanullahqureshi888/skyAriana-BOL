"""Centralized Cross-Platform Application Path Service for AQ COMPANIES.

Standardizes all persistent directories, ensuring paths are dynamically resolved
from %LOCALAPPDATA%\\AQ COMPANIES on Windows (or SKY_DATA_DIR / dev root),
with strict avoidance of hardcoded user profile directories.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path


def get_app_data_dir() -> Path:
    """Resolve the master application data root directory.
    
    1. Respects SKY_DATA_DIR environment variable if specified.
    2. In production on Windows, resolves to %LOCALAPPDATA%\\AQ COMPANIES.
    3. In development, resolves to project-root / "data".
    """
    override = os.getenv("SKY_DATA_DIR")
    if override:
        p = Path(override).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    is_prod = (
        os.getenv("APP_ENV", "").lower() in ("production", "prod")
        or os.getenv("SKY_DESKTOP") == "1"
        or getattr(sys, "frozen", False)
    )

    if is_prod and sys.platform == "win32":
        local_app_data = os.getenv("LOCALAPPDATA")
        if local_app_data:
            p = Path(local_app_data) / "AQ COMPANIES"
            p.mkdir(parents=True, exist_ok=True)
            return p

    # Development fallback: project root
    root = Path(__file__).resolve().parent.parent.parent
    p = root / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_database_dir() -> Path:
    """Resolve directory containing the authoritative SQLite database."""
    base = get_app_data_dir()
    d = base / "Data" if (base / "Data").exists() or not (base / "app.db").exists() else base
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_database_path() -> Path:
    """Resolve the authoritative SQLite database file path.
    
    Checks for app.db or aq_companies.db in Data/ or root data/.
    """
    db_dir = get_database_dir()
    candidate_app = db_dir / "app.db"
    candidate_aq = db_dir / "aq_companies.db"
    base_app = get_app_data_dir() / "app.db"
    base_aq = get_app_data_dir() / "aq_companies.db"

    if candidate_app.exists():
        return candidate_app
    if candidate_aq.exists():
        return candidate_aq
    if base_app.exists():
        return base_app
    if base_aq.exists():
        return base_aq

    # Default to app.db in database directory
    return candidate_app


def get_backup_dir() -> Path:
    """Resolve persistent backups directory."""
    d = get_app_data_dir() / "Backups"
    if not d.exists() and (get_app_data_dir() / "backups").exists():
        d = get_app_data_dir() / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_recovery_dir() -> Path:
    """Resolve disaster recovery & corruption quarantine directory."""
    d = get_app_data_dir() / "Recovery"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_logs_dir() -> Path:
    """Resolve structured application & audit logs directory."""
    d = get_app_data_dir() / "Logs"
    if not d.exists() and (get_app_data_dir() / "logs").exists():
        d = get_app_data_dir() / "logs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_documents_dir() -> Path:
    """Resolve documents, attachments, and stamps storage directory."""
    d = get_app_data_dir() / "Documents"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_exports_dir() -> Path:
    """Resolve report & data export directory."""
    d = get_app_data_dir() / "Exports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_temp_dir() -> Path:
    """Resolve staging & temporary operational directory."""
    d = get_app_data_dir() / "Temp"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_config_dir() -> Path:
    """Resolve application settings and templates directory."""
    d = get_app_data_dir() / "Config"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_free_disk_space_bytes(path: Path | None = None) -> int:
    """Returns available free disk space in bytes for the target filesystem drive."""
    target = path or get_app_data_dir()
    try:
        usage = shutil.disk_usage(target)
        return usage.free
    except Exception:
        # Fallback to generous default if query fails
        return 10 * 1024 * 1024 * 1024
