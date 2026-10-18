from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import UploadedDocument
from backend.services.files import save_upload
from backend.services.pdf import extract_pdf_text

router = APIRouter(tags=["pdf"])


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    linked_type: str = Form(default=""),
    linked_id: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    saved = await save_upload(file)
    text = extract_pdf_text(Path(saved["storage_path"]))
    row = UploadedDocument(
        original_name=saved["original_name"],
        file_name=saved["file_name"],
        document_type="pdf",
        file_size=saved["file_size"],
        storage_path=saved["storage_path"],
        linked_type=linked_type,
        linked_id=linked_id,
        extracted_text=text,
        metadata_json={"content_type": saved["file_type"]},
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "success": True,
        "data": {
            "id": row.id,
            "original_name": row.original_name,
            "file_name": row.file_name,
            "file_size": row.file_size,
            "storage_path": row.storage_path,
            "linked_type": row.linked_type,
            "linked_id": row.linked_id,
            "extracted_text": row.extracted_text,
        },
        "source": "python-fastapi",
    }


@router.get("/preview")
async def preview_pdf(document_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    row = await db.get(UploadedDocument, document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="PDF not found")
    path = Path(row.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF file is missing")
    return FileResponse(path, media_type="application/pdf", filename=row.original_name)


@router.get("/{document_id}")
async def get_pdf(document_id: str, db: AsyncSession = Depends(get_db)):
    return await preview_pdf(document_id=document_id, db=db)


@router.delete("/{document_id}")
async def delete_pdf(document_id: str, permanent: bool = Query(default=False), db: AsyncSession = Depends(get_db)):
    row = await db.get(UploadedDocument, document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="PDF not found")
    path = Path(row.storage_path)
    await db.delete(row)
    await db.commit()
    if permanent and path.exists():
        path.unlink()
    return {"success": True, "data": {"id": document_id, "permanent": permanent}, "source": "python-fastapi"}

