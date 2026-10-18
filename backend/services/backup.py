from __future__ import annotations

import shutil
import zipfile
from datetime import datetime
from pathlib import Path

from backend.config import BACKUPS_DIR, DATA_DIR, UPLOADS_DIR


def create_backup_zip() -> Path:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_path = BACKUPS_DIR / f"sky-logistics-backup-{stamp}.zip"
    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for source in (DATA_DIR, UPLOADS_DIR):
            if not source.exists():
                continue
            for file_path in source.rglob("*"):
                if file_path.is_file():
                    archive.write(file_path, file_path.relative_to(DATA_DIR.parent))
    return backup_path


def restore_backup_zip(backup_path: Path) -> None:
    with zipfile.ZipFile(backup_path, "r") as archive:
        for member in archive.namelist():
            if member.startswith(("data/", "uploads/")):
                archive.extract(member, DATA_DIR.parent)
