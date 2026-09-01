from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import BillOfLading, ExportAccount, ImportAccount, Invoice, LedgerEntry, Truck
from backend.services.crud import list_records

router = APIRouter(tags=["search"])


@router.get("")
async def global_search(q: str = Query(default=""), db: AsyncSession = Depends(get_db)):
    sources = [
        ("invoices", Invoice),
        ("bill_of_lading", BillOfLading),
        ("import_accounts", ImportAccount),
        ("export_accounts", ExportAccount),
        ("ledger_entries", LedgerEntry),
        ("trucks", Truck),
    ]
    results = []
    for source, model in sources:
        rows = await list_records(db, model, q=q, limit=25)
        for row in rows:
            payload = row.get("payload") or {}
            title = (
                row.get("invoice_number")
                or row.get("bol_number")
                or row.get("name")
                or row.get("driver_name")
                or row.get("bill_of_lading")
                or payload.get("name")
                or row.get("id")
            )
            results.append({"source": source, "id": row["id"], "title": title, "payload": payload})
    return {"success": True, "data": results, "source": "python-fastapi"}

