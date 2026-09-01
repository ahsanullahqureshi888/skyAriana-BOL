from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import MediaFile, UploadedDocument
from backend.services.files import save_upload

media_router = APIRouter(tags=["media"])
upload_router = APIRouter(tags=["upload"])


def serialize_media(row: MediaFile | UploadedDocument) -> dict:
    metadata = dict(getattr(row, "metadata_json", {}) or {})
    is_document = isinstance(row, UploadedDocument)
    return {
        "id": row.id,
        "original_name": row.original_name,
        "file_name": row.file_name,
        "file_type": metadata.get("content_type", "application/octet-stream") if is_document else row.file_type,
        "media_type": "document" if is_document else row.media_type,
        "document_type": row.document_type if is_document else metadata.get("document_type", ""),
        "file_size": row.file_size,
        "storage_path": row.storage_path,
        "linked_type": row.linked_type,
        "linked_id": row.linked_id,
        "shipment_reference": getattr(row, "shipment_reference", metadata.get("shipment_reference", "")),
        "metadata": metadata,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


async def find_media_row(db: AsyncSession, media_id: str) -> MediaFile | UploadedDocument | None:
    return (await db.get(MediaFile, media_id)) or (await db.get(UploadedDocument, media_id))


@media_router.get("")
async def list_media(
    linked_type: str | None = Query(default=None),
    linked_id: str | None = Query(default=None),
    media_type: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    lt = str(linked_type).strip() if linked_type and not hasattr(linked_type, "default") else None
    li = str(linked_id).strip() if linked_id and not hasattr(linked_id, "default") else None
    mt = str(media_type).strip() if media_type and not hasattr(media_type, "default") else None

    statement = select(MediaFile).order_by(MediaFile.created_at.desc())
    if lt:
        statement = statement.where(MediaFile.linked_type == lt)
    if li:
        statement = statement.where(MediaFile.linked_id == li)
    if mt:
        statement = statement.where(MediaFile.media_type == mt)
    res = await db.execute(statement)
    rows = list(res.scalars().all())

    document_rows: list[UploadedDocument] = []
    if not mt or mt == "document":
        document_statement = select(UploadedDocument).order_by(UploadedDocument.created_at.desc())
        if lt:
            document_statement = document_statement.where(UploadedDocument.linked_type == lt)
        if li:
            document_statement = document_statement.where(UploadedDocument.linked_id == li)
        doc_res = await db.execute(document_statement)
        document_rows = list(doc_res.scalars().all())


    combined = [*rows, *document_rows]
    combined.sort(key=lambda row: row.created_at, reverse=True)
    return {"success": True, "data": [serialize_media(row) for row in combined], "source": "python-fastapi"}


@media_router.get("/{media_id}/file")
async def get_media_file(media_id: str, db: AsyncSession = Depends(get_db)):
    row = await find_media_row(db, media_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Media not found")
    path = Path(row.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing from storage")
    metadata = dict(getattr(row, "metadata_json", {}) or {})
    media_type = metadata.get("content_type", "application/octet-stream") if isinstance(row, UploadedDocument) else row.file_type
    return FileResponse(path, media_type=media_type, filename=row.original_name)


@media_router.get("/{media_id}")
async def get_media(media_id: str, db: AsyncSession = Depends(get_db)):
    row = await find_media_row(db, media_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"success": True, "data": serialize_media(row), "source": "python-fastapi"}


@media_router.put("/{media_id}")
async def update_media(media_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    row = await find_media_row(db, media_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Media not found")

    metadata = dict(getattr(row, "metadata_json", {}) or {})
    metadata.update(payload.get("metadata", {}))
    row.metadata_json = metadata

    if "original_name" in payload and not metadata.get("is_locked"):
        row.original_name = str(payload["original_name"])
    if isinstance(row, MediaFile) and "shipment_reference" in payload:
        row.shipment_reference = str(payload["shipment_reference"])

    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"success": True, "data": serialize_media(row), "source": "python-fastapi"}


@media_router.get("/{media_id}/download")
async def download_media(media_id: str, db: AsyncSession = Depends(get_db)):
    return await get_media_file(media_id, db)


@media_router.delete("/{media_id}")
async def delete_media(media_id: str, permanent: bool = Query(default=False), db: AsyncSession = Depends(get_db)):
    row = await find_media_row(db, media_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Media not found")
    path = Path(row.storage_path)
    await db.delete(row)
    await db.commit()
    if permanent and path.exists():
        path.unlink()
    return {"success": True, "data": {"id": media_id, "permanent": permanent}, "source": "python-fastapi"}


@upload_router.post("")
async def upload_file(
    file: UploadFile = File(...),
    linked_type: str = Form(default=""),
    linked_id: str = Form(default=""),
    shipment_reference: str = Form(default=""),
    category: str = Form(default=""),
    document_type: str = Form(default=""),
    status: str = Form(default="Uploaded"),
    tags: str = Form(default=""),
    notes: str = Form(default=""),
    invoice_no: str = Form(default=""),
    bill_of_lading_no: str = Form(default=""),
    container_no: str = Form(default=""),
    truck_no: str = Form(default=""),
    customer: str = Form(default=""),
    route: str = Form(default=""),
    is_locked: str = Form(default="false"),
    is_final: str = Form(default="false"),
    expiry_date: str = Form(default=""),
    due_date: str = Form(default=""),
    due_status: str = Form(default="No Due Date"),
    amount: str = Form(default=""),
    currency: str = Form(default="USD"),
    payment_status: str = Form(default="Unpaid"),
    paid_date: str = Form(default=""),
    bank_method: str = Form(default=""),
    reference_no: str = Form(default=""),
    seal_no: str = Form(default=""),
    container_size: str = Form(default=""),
    container_type: str = Form(default=""),
    owner_type: str = Form(default="Shipment"),
    owner_name: str = Form(default=""),
    quality_status: str = Form(default="Good Quality"),
    quality_notes: str = Form(default=""),
    folder: str = Form(default="SKY Desktop"),
    is_deleted: str = Form(default="false"),
    deleted_at: str = Form(default=""),
    is_archived: str = Form(default="false"),
    color_label: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    saved = await save_upload(file)
    metadata = {
        "shipment_reference": shipment_reference,
        "content_type": saved["file_type"],
        "category": category,
        "document_type": document_type,
        "status": status,
        "tags": tags,
        "notes": notes,
        "invoice_no": invoice_no,
        "bill_of_lading_no": bill_of_lading_no,
        "container_no": container_no,
        "truck_no": truck_no,
        "customer": customer,
        "route": route,
        "is_locked": is_locked == "true",
        "is_final": is_final == "true",
        "expiry_date": expiry_date,
        "due_date": due_date,
        "due_status": due_status,
        "amount": amount,
        "currency": currency,
        "payment_status": payment_status,
        "paid_date": paid_date,
        "bank_method": bank_method,
        "reference_no": reference_no,
        "seal_no": seal_no,
        "container_size": container_size,
        "container_type": container_type,
        "owner_type": owner_type,
        "owner_name": owner_name,
        "quality_status": quality_status,
        "quality_notes": quality_notes,
        "folder": folder,
        "is_deleted": is_deleted == "true",
        "deleted_at": deleted_at,
        "is_archived": is_archived == "true",
        "color_label": color_label,
        "timeline": [f"Uploaded {document_type or saved['media_type']}"],
        "ocr_status": "not_available",
        "processing_status": "Ready",
    }
    if saved["media_type"] == "document":
        row = UploadedDocument(
            original_name=saved["original_name"],
            file_name=saved["file_name"],
            document_type=document_type or Path(saved["file_name"]).suffix.lower().lstrip(".") or "document",
            file_size=saved["file_size"],
            storage_path=saved["storage_path"],
            linked_type=linked_type,
            linked_id=linked_id,
            metadata_json=metadata,
        )
    else:
        row = MediaFile(
            original_name=saved["original_name"],
            file_name=saved["file_name"],
            file_type=saved["file_type"],
            media_type=saved["media_type"],
            file_size=saved["file_size"],
            storage_path=saved["storage_path"],
            shipment_reference=shipment_reference,
            linked_type=linked_type,
            linked_id=linked_id,
            metadata_json=metadata,
        )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"success": True, "data": serialize_media(row), "source": "python-fastapi"}

