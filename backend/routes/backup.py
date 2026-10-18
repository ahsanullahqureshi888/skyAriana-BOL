from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.config import BACKUPS_DIR
from backend.services.backup import create_backup_zip, restore_backup_zip
from backend.services.files import save_upload

router = APIRouter(tags=["backup"])


@router.get("/export")
def export_backup():
    archive = create_backup_zip()
    return FileResponse(archive, media_type="application/zip", filename=archive.name)


@router.post("/restore")
async def restore_backup(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Upload a ZIP backup archive")
    saved = await save_upload(file)
    restore_backup_zip(Path(saved["storage_path"]))
    return {"success": True, "data": {"restored_from": saved["original_name"]}, "source": "python-fastapi"}
