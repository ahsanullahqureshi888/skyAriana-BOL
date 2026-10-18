from __future__ import annotations

import datetime
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.base import generate_uuid
from backend.schemas.placeholders import (
    APIResponse,
    PaginatedList,
    ShipmentCreate,
    ShipmentResponse,
)

router = APIRouter(prefix="/shipments", tags=["Shipments"])


@router.get("", response_model=PaginatedList[ShipmentResponse])
async def list_shipments(
    q: Optional[str] = Query(None, description="Search tracking number, reference, or BOL#"),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Server-side paginated and indexed shipment query (Sections 6, 7)."""
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    offset = (page - 1) * page_size

    where_clauses = []
    params: dict[str, Any] = {}

    if status_filter:
        where_clauses.append("status = :status")
        params["status"] = status_filter
    if q and q.strip():
        where_clauses.append(
            "(tracking_number LIKE :q OR reference_number LIKE :q OR bol_number LIKE :q OR origin LIKE :q OR destination LIKE :q)"
        )
        params["q"] = f"%{q.strip()}%"

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    count_sql = f"SELECT COUNT(*) FROM shipments {where_sql}"
    total = (await db.execute(text(count_sql), params)).scalar() or 0

    list_sql = f"""
        SELECT id, tracking_number, bol_number, origin, destination, status, carrier, created_at, updated_at
        FROM shipments
        {where_sql}
        ORDER BY created_at DESC, id DESC
        LIMIT :limit OFFSET :offset
    """
    params["limit"] = page_size
    params["offset"] = offset

    rows = (await db.execute(text(list_sql), params)).all()
    items = [
        ShipmentResponse(
            id=r[0],
            tracking_number=r[1],
            bol_number=r[2],
            origin=r[3] or "",
            destination=r[4] or "",
            status=r[5] or "in_transit",
            carrier=r[6],
            created_at=str(r[7]) if r[7] else datetime.datetime.now(datetime.timezone.utc).isoformat(),
            updated_at=str(r[8]) if r[8] else datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )
        for r in rows
    ]

    return PaginatedList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=APIResponse[ShipmentResponse], status_code=status.HTTP_201_CREATED)
async def create_shipment(payload: ShipmentCreate, db: AsyncSession = Depends(get_db)):
    """Create shipment with indexed duplicate checking and atomic transaction."""
    # Check duplicate tracking number
    check_sql = "SELECT id FROM shipments WHERE tracking_number = :tn LIMIT 1;"
    existing = (await db.execute(text(check_sql), {"tn": payload.tracking_number})).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tracking number {payload.tracking_number} already exists",
        )

    new_id = generate_uuid()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    insert_sql = """
        INSERT INTO shipments (id, tracking_number, bol_number, origin, destination, status, carrier, created_at, updated_at, revision)
        VALUES (:id, :tn, :bn, :org, :dst, :st, :cr, :cat, :uat, 1);
    """
    await db.execute(
        text(insert_sql),
        {
            "id": new_id,
            "tn": payload.tracking_number,
            "bn": payload.bol_number,
            "org": payload.origin,
            "dst": payload.destination,
            "st": payload.status or "in_transit",
            "cr": payload.carrier,
            "cat": now_iso,
            "uat": now_iso,
        },
    )
    await db.commit()

    record = ShipmentResponse(
        id=new_id,
        tracking_number=payload.tracking_number,
        bol_number=payload.bol_number,
        origin=payload.origin,
        destination=payload.destination,
        status=payload.status or "in_transit",
        carrier=payload.carrier,
        created_at=now_iso,
        updated_at=now_iso,
    )
    return APIResponse(success=True, message="Shipment created", data=record)


@router.get("/{tracking_number}", response_model=APIResponse[ShipmentResponse])
async def get_shipment(tracking_number: str, db: AsyncSession = Depends(get_db)):
    """Instant lookup of shipment by tracking number using indexed search."""
    sql = """
        SELECT id, tracking_number, bol_number, origin, destination, status, carrier, created_at, updated_at
        FROM shipments
        WHERE tracking_number = :tn OR id = :tn
        LIMIT 1;
    """
    row = (await db.execute(text(sql), {"tn": tracking_number})).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    record = ShipmentResponse(
        id=row[0],
        tracking_number=row[1],
        bol_number=row[2],
        origin=row[3] or "",
        destination=row[4] or "",
        status=row[5] or "in_transit",
        carrier=row[6],
        created_at=str(row[7]) if row[7] else "",
        updated_at=str(row[8]) if row[8] else "",
    )
    return APIResponse(success=True, message="Shipment retrieved", data=record)
