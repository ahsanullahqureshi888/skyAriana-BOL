from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from backend.config import (
    UPLOAD_AUDIO_DIR,
    UPLOAD_EXCEL_DIR,
    UPLOAD_IMAGE_DIR,
    UPLOAD_LOGO_DIR,
    UPLOAD_OTHER_DIR,
    UPLOAD_PDF_DIR,
    UPLOAD_VIDEO_DIR,
)


IMAGE_TYPES = {"jpg", "jpeg", "png", "webp", "gif"}
VIDEO_TYPES = {"mp4", "mov", "avi", "webm"}
AUDIO_TYPES = {"mp3", "wav", "ogg", "m4a"}
DOCUMENT_TYPES = {"pdf", "xlsx", "xls", "csv", "doc", "docx"}


def sanitize_filename(filename: str) -> str:
    stem = Path(filename).stem.strip() or "file"
    suffix = Path(filename).suffix.lower()
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-")[:140] or "file"
    return f"{safe_stem}{suffix}"


def detect_media_type(filename: str, content_type: str = "") -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext in IMAGE_TYPES or content_type.startswith("image/"):
        return "image"
    if ext in VIDEO_TYPES or content_type.startswith("video/"):
        return "video"
    if ext in AUDIO_TYPES or content_type.startswith("audio/"):
        return "voice"
    if ext in {"xlsx", "xls", "csv"}:
        return "excel"
    if ext in {"svg", "ico"}:
        return "logo"
    if ext in DOCUMENT_TYPES:
        return "document"
    return "file"


def storage_folder_for(media_type: str) -> Path:
    if media_type == "image":
        return UPLOAD_IMAGE_DIR
    if media_type == "video":
        return UPLOAD_VIDEO_DIR
    if media_type == "voice":
        return UPLOAD_AUDIO_DIR
    if media_type == "document":
        return UPLOAD_PDF_DIR
    if media_type == "excel":
        return UPLOAD_EXCEL_DIR
    if media_type == "logo":
        return UPLOAD_LOGO_DIR
    return UPLOAD_OTHER_DIR


async def save_upload(file: UploadFile) -> dict:
    safe_name = sanitize_filename(file.filename or "upload.bin")
    media_type = detect_media_type(safe_name, file.content_type or "")
    folder = storage_folder_for(media_type)
    folder.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    final_name = f"{timestamp}_{uuid4().hex[:8]}_{safe_name}"
    final_path = folder / final_name

    size = 0
    with final_path.open("wb") as output:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            output.write(chunk)

    return {
        "original_name": file.filename or safe_name,
        "file_name": final_name,
        "file_type": file.content_type or "application/octet-stream",
        "media_type": media_type,
        "file_size": size,
        "storage_path": str(final_path),
    }
