from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models import BillOfLading
from backend.routes.generic import build_crud_router
from backend.schemas.core import BillOfLadingCreate, BillOfLadingUpdate

router = build_crud_router(
    BillOfLading, 
    "bill-of-lading", 
    create_schema=BillOfLadingCreate, 
    update_schema=BillOfLadingUpdate
)


@router.get("/tools/next-number")
async def next_bol_number(db: AsyncSession = Depends(get_db)):
    year = datetime.now().year
    count_stmt = select(func.count()).select_from(BillOfLading)
    result = await db.execute(count_stmt)
    count = result.scalar() + 1
    return {"success": True, "bolNumber": f"BOL-{year}-NSA{count:03d}", "source": "python-fastapi"}
