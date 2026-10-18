from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.services.backup_service import (
    STATE_NORMAL,
    create_backup,
    execute_startup_recovery_check,
    get_backup_dir,
    get_database_path,
    get_free_disk_space_bytes,
    get_system_state,
    inspect_backup_file,
    list_all_backups,
    restore_backup,
    run_sqlite_integrity_check,
)

logger = logging.getLogger("aq_companies.routes.backups")

router = APIRouter(prefix="/backups", tags=["Backups"])


class BackupCreateRequest(BaseModel):
    backup_type: str = Field(default="MANUAL", description="MANUAL, SCHEDULED, or PRE_RESTORE")
    note: Optional[str] = Field(default=None, description="Optional note or reason for the backup")
    include_documents: bool = Field(default=False, description="Whether to include data/documents in the backup")
    force: bool = Field(default=False, description="Force backup even if disk space is below warning threshold")


class BackupInspectRequest(BaseModel):
    filename: str = Field(..., description="Backup filename to inspect")


class BackupRestoreRequest(BaseModel):
    filename: str = Field(..., description="Backup filename to restore")
    actor: str = Field(default="Administrator", description="User or role executing the restore")
    force_empty_override: bool = Field(default=False, description="Bypass safety check if backup has fewer records")


@router.get("", summary="List all verified backups")
async def get_backups():
    """List all verified backups stored in the authoritative backups repository."""
    try:
        backups = list_all_backups()
        free_bytes = get_free_disk_space_bytes()
        return {
            "success": True,
            "system_state": get_system_state(),
            "total_backups": len(backups),
            "free_disk_space_mb": round(free_bytes / (1024 * 1024), 2),
            "backups": backups,
        }
    except Exception as exc:
        logger.error(f"Failed to list backups: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(exc)}",
        )


@router.post("/create", status_code=status.HTTP_201_CREATED, summary="Create a new verified online backup")
async def create_new_backup(payload: BackupCreateRequest):
    """Generate a verified, non-blocking online SQLite backup (.zip) with SHA-256 and manifest."""
    try:
        result = await create_backup(
            backup_type=payload.backup_type,
            reason=payload.note or "Manual user-initiated backup",
            include_documents=payload.include_documents,
            force=payload.force,
        )
        return {
            "success": True,
            "message": "Backup created and verified successfully",
            "data": result,
            "backup": result,
        }
    except Exception as exc:
        logger.error(f"Backup creation failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {str(exc)}",
        )


@router.post("/inspect", summary="Inspect an existing backup archive")
async def inspect_backup(payload: BackupInspectRequest):
    """Deep inspect an existing backup file without restoring it."""
    # Ensure safe filename without traversal
    filename = Path(payload.filename).name
    backup_dir = get_backup_dir()

    # Search in backup dir
    candidate = None
    for p in backup_dir.rglob("*.zip"):
        if p.name == filename:
            candidate = p
            break

    if not candidate or not candidate.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup archive not found: {filename}",
        )

    inspection = inspect_backup_file(candidate)
    return {
        "success": inspection.get("valid", False),
        "data": inspection,
    }


@router.post("/restore", summary="Safely restore database from backup with rollback")
async def restore_from_backup(payload: BackupRestoreRequest):
    """Execute high-safety database restore workflow:
    1. Pre-validation and schema compatibility check
    2. Zero-data-loss empty backup block
    3. Mandatory pre-restore backup of live database
    4. Sandboxed staging integrity validation
    5. Atomic file swap with automatic rollback on error
    """
    filename = Path(payload.filename).name
    backup_dir = get_backup_dir()

    candidate = None
    for p in backup_dir.rglob("*.zip"):
        if p.name == filename:
            candidate = p
            break

    if not candidate or not candidate.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup archive not found: {filename}",
        )

    try:
        result = await restore_backup(
            backup_file_path=candidate,
            actor=payload.actor,
            force_empty_override=payload.force_empty_override,
        )
        return {
            "success": True,
            "message": "Database successfully restored and verified",
            "result": result,
        }
    except Exception as exc:
        logger.error(f"Database restore failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restore operation failed: {str(exc)}",
        )


@router.get("/integrity", summary="Check SQLite database integrity")
async def check_database_integrity():
    """Run full SQLite integrity check, foreign key checks, and schema validation."""
    try:
        live_db = get_database_path()
        integrity_result = run_sqlite_integrity_check(live_db)
        return {
            "success": integrity_result.get("ok", False),
            "result": integrity_result,
        }
    except Exception as exc:
        logger.error(f"Integrity check failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integrity check error: {str(exc)}",
        )


@router.get("/recovery-status", summary="Get crash detection and recovery status")
async def get_recovery_status():
    """Return session state, crash history, recovery logs, and current system state."""
    try:
        check_result = execute_startup_recovery_check()
        free_bytes = get_free_disk_space_bytes()
        return {
            "success": True,
            "system_state": get_system_state(),
            "recovery_info": check_result,
            "free_disk_space_mb": round(free_bytes / (1024 * 1024), 2),
            "is_disk_space_sufficient": free_bytes > (1024 * 1024 * 1024),
        }
    except Exception as exc:
        logger.error(f"Recovery status check failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recovery status error: {str(exc)}",
        )


@router.get("/download/{filename}", summary="Download backup archive")
async def download_backup_file(filename: str):
    """Safely download a verified backup archive (.zip)."""
    safe_name = Path(filename).name
    backup_dir = get_backup_dir()

    target_file = None
    for p in backup_dir.rglob("*.zip"):
        if p.name == safe_name:
            target_file = p
            break

    if not target_file or not target_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup archive not found",
        )

    return FileResponse(
        path=str(target_file),
        filename=safe_name,
        media_type="application/zip",
    )
