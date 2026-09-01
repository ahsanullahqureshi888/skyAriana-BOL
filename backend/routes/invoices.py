from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from backend.database import get_db
from backend.models import Invoice, InvoiceItem
from backend.routes.generic import build_crud_router
from backend.schemas.core import InvoiceCreate, InvoiceUpdate
from backend.services.crud import list_records, serialize_record, upsert_payload_record

router = build_crud_router(
    Invoice,
    "invoices",
    create_schema=InvoiceCreate,
    update_schema=InvoiceUpdate,
)


@router.get("/tools/next-number")
async def next_invoice_number(db: AsyncSession = Depends(get_db)):
    year = datetime.now().year
    count_stmt = select(func.count()).select_from(Invoice)
    result = await db.execute(count_stmt)
    count = (result.scalar() or 0) + 1
    return {"success": True, "invoiceNumber": f"INV-{year}-{count:04d}", "source": "python-fastapi"}


@router.get("/search/list")
async def search_invoices(q: str = Query(default=""), db: AsyncSession = Depends(get_db)):
    records = await list_records(db, Invoice, q=q)
    return {"success": True, "data": records, "source": "python-fastapi"}


@router.get("/{invoice_id}/items")
async def list_invoice_items(invoice_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(InvoiceItem).where(InvoiceItem.invoice_id == invoice_id).order_by(InvoiceItem.created_at)
    res = await db.execute(stmt)
    rows = res.scalars().all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}


@router.post("/{invoice_id}/items")
async def create_invoice_item(invoice_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    inv = await db.get(Invoice, invoice_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    payload = body.get("payload") if isinstance(body.get("payload"), dict) else body
    payload = {"invoice_id": invoice_id, **payload}
    row = await upsert_payload_record(db, InvoiceItem, payload)
    row.invoice_id = invoice_id
    row.description = str(payload.get("description") or "")
    row.quantity = str(payload.get("quantity") or "1")
    await db.commit()
    await db.refresh(row)
    return {"success": True, "data": serialize_record(row), "source": "python-fastapi"}


@router.put("/{invoice_id}/items/{item_id}")
async def update_invoice_item(invoice_id: str, item_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    row = await db.get(InvoiceItem, item_id)
    if row is None or row.invoice_id != invoice_id:
        raise HTTPException(status_code=404, detail="Invoice item not found")
    payload = body.get("payload") if isinstance(body.get("payload"), dict) else body
    row.payload = payload
    row.description = str(payload.get("description") or row.description)
    row.quantity = str(payload.get("quantity") or row.quantity)
    await db.commit()
    await db.refresh(row)
    return {"success": True, "data": serialize_record(row), "source": "python-fastapi"}


@router.delete("/{invoice_id}/items/{item_id}")
async def delete_invoice_item(invoice_id: str, item_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(InvoiceItem, item_id)
    if row is None or row.invoice_id != invoice_id:
        raise HTTPException(status_code=404, detail="Invoice item not found")
    await db.delete(row)
    await db.commit()
    return {"success": True, "data": {"id": item_id}, "source": "python-fastapi"}

