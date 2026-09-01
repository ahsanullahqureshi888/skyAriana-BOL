from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import BillOfLading, ExportAccount, ImportAccount, Invoice, LedgerEntry, MediaFile, Truck
from backend.services.crud import serialize_record

router = APIRouter(tags=["reports"])


@router.get("/summary")
async def summary(db: AsyncSession = Depends(get_db)):
    debit_res = await db.execute(select(func.coalesce(func.sum(LedgerEntry.debit), 0.0)))
    credit_res = await db.execute(select(func.coalesce(func.sum(LedgerEntry.credit), 0.0)))
    total_debit = round(float(debit_res.scalar() or 0.0), 2)
    total_credit = round(float(credit_res.scalar() or 0.0), 2)
    net_balance = round(total_debit - total_credit, 2)

    invoices_cnt = (await db.execute(select(func.count()).select_from(Invoice))).scalar() or 0
    bol_cnt = (await db.execute(select(func.count()).select_from(BillOfLading))).scalar() or 0
    import_cnt = (await db.execute(select(func.count()).select_from(ImportAccount))).scalar() or 0
    export_cnt = (await db.execute(select(func.count()).select_from(ExportAccount))).scalar() or 0
    ledger_cnt = (await db.execute(select(func.count()).select_from(LedgerEntry))).scalar() or 0
    trucks_cnt = (await db.execute(select(func.count()).select_from(Truck))).scalar() or 0
    media_cnt = (await db.execute(select(func.count()).select_from(MediaFile))).scalar() or 0

    return {
        "success": True,
        "data": {
            "invoices": invoices_cnt,
            "bill_of_lading": bol_cnt,
            "import_accounts": import_cnt,
            "export_accounts": export_cnt,
            "ledger_entries": ledger_cnt,
            "trucks": trucks_cnt,
            "media_files": media_cnt,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "balance": net_balance,
        },
        "source": "python-fastapi",
    }


@router.get("/monthly")
async def monthly(db: AsyncSession = Depends(get_db)):
    summary_data = (await summary(db))["data"]

    inv_stmt = select(Invoice).order_by(Invoice.created_at.desc()).limit(100)
    inv_rows = (await db.execute(inv_stmt)).scalars().all()

    ledger_stmt = select(LedgerEntry).order_by(LedgerEntry.created_at.desc()).limit(100)
    ledger_rows = (await db.execute(ledger_stmt)).scalars().all()

    return {
        "success": True,
        "data": {
            "summary": summary_data,
            "invoices": [serialize_record(row) for row in inv_rows],
            "ledger_entries": [serialize_record(row) for row in ledger_rows],
        },
        "source": "python-fastapi",
    }


@router.get("/customer")
async def customer_report(q: str = "", db: AsyncSession = Depends(get_db)):
    stmt = select(Invoice)
    if q:
        stmt = stmt.where(Invoice.customer_name.ilike(f"%{q}%"))
    stmt = stmt.order_by(Invoice.updated_at.desc()).limit(200)
    rows = (await db.execute(stmt)).scalars().all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}


@router.get("/shipper")
async def shipper_report(q: str = "", db: AsyncSession = Depends(get_db)):
    stmt = select(BillOfLading)
    if q:
        stmt = stmt.where(BillOfLading.shipper_name.ilike(f"%{q}%"))
    stmt = stmt.order_by(BillOfLading.updated_at.desc()).limit(200)
    rows = (await db.execute(stmt)).scalars().all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}


@router.get("/container")
async def container_report(q: str = "", db: AsyncSession = Depends(get_db)):
    stmt = select(Truck)
    if q:
        stmt = stmt.where(Truck.container_number.ilike(f"%{q}%"))
    stmt = stmt.order_by(Truck.updated_at.desc()).limit(200)
    rows = (await db.execute(stmt)).scalars().all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}


@router.get("/detention-demurrage")
async def detention_demurrage_report(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(LedgerEntry)
        .where(
            or_(
                LedgerEntry.invoice_no.ilike("%detention%"),
                LedgerEntry.invoice_no.ilike("%demurrage%"),
                LedgerEntry.bill_of_lading.ilike("%detention%"),
                LedgerEntry.bill_of_lading.ilike("%demurrage%"),
            )
        )
        .order_by(LedgerEntry.updated_at.desc())
        .limit(200)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}

