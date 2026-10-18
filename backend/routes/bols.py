from __future__ import annotations

import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models.base import generate_uuid
from backend.models.logistics import BOLItemModel, BOLModel, ContainerModel
from backend.schemas.bol import (
    BOLCheckNumberResponse,
    BOLCreateRequest,
    BOLDetail,
    BOLListItem,
    BOLPatchRequest,
    BOLSaveResponse,
    BOLSummary,
)
from backend.schemas.placeholders import (
    APIResponse,
    BOLResponse,
    PaginatedList,
)
from backend.services.bol_service import (
    check_bol_number_exists,
    create_bol_atomic,
    duplicate_bol,
    get_bol_detail,
    get_bol_summary,
    get_recent_bols,
    list_bols_paged,
    patch_bol,
)

router = APIRouter(prefix="/bols", tags=["Bill of Lading"])


@router.get("", response_model=PaginatedList[BOLListItem])
async def list_bols(
    q: Optional[str] = Query(None, description="Unified search for BOL#, container#, shipper, consignee, driver"),
    search: Optional[str] = Query(None, description="Alias for unified search"),
    company_id: Optional[str] = Query(None, description="Filter by company"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="Filter from issue date"),
    date_to: Optional[str] = Query(None, description="Filter to issue date"),
    shipper: Optional[str] = Query(None, description="Filter by shipper name"),
    consignee: Optional[str] = Query(None, description="Filter by consignee name"),
    notify_party: Optional[str] = Query(None, description="Filter by notify party name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve true server-side paginated lightweight BOL list with indexed search priority (Sections 7, 9, 10, 12, 13)."""
    search_term = q or search
    items, total, pages = await list_bols_paged(
        db=db,
        q=search_term,
        page=page,
        page_size=page_size,
        company_id=company_id,
        status_filter=status,
        date_from=date_from,
        date_to=date_to,
        shipper=shipper,
        consignee=consignee,
        notify_party=notify_party,
    )

    return PaginatedList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/summary", response_model=APIResponse[BOLSummary])
async def get_summary_endpoint(
    db: AsyncSession = Depends(get_db),
):
    """Fast database-aggregated totals for summary cards (Total BOLs, Packages, Weight, Goods Value)."""
    summary = await get_bol_summary(db)
    return APIResponse(
        success=True,
        message="BOL summary retrieved successfully",
        data=summary,
    )


@router.get("/recent", response_model=APIResponse[List[BOLListItem]])
async def get_recent_endpoint(
    limit: int = Query(6, ge=1, le=20, description="Number of recent records to return"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve top recent lightweight BOLs for the hero banner."""
    recent_items = await get_recent_bols(db, limit=limit)
    return APIResponse(
        success=True,
        message="Recent BOLs retrieved successfully",
        data=recent_items,
    )


@router.get("/check-number", response_model=APIResponse[BOLCheckNumberResponse])
async def check_number_endpoint(
    number: str = Query(..., description="BOL number to check for duplicate"),
    exclude_id: Optional[str] = Query(None, description="Optional ID to exclude (when editing)"),
    db: AsyncSession = Depends(get_db),
):
    """Fast indexed check to determine if a BOL number already exists (Section 29)."""
    result = await check_bol_number_exists(db, number, exclude_id)
    return APIResponse(
        success=True,
        message="BOL duplicate check completed",
        data=result,
    )


@router.get("/{bol_id_or_number}/details", response_model=APIResponse[BOLDetail])
async def get_bol_details_endpoint(
    bol_id_or_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve complete BOL information for editing without loading unrelated data (Sections 6, 8, 31)."""
    detail = await get_bol_detail(db, bol_id_or_number)
    return APIResponse(
        success=True,
        message="BOL details retrieved successfully",
        data=detail,
    )


@router.post("/{bol_id_or_number}/duplicate", response_model=APIResponse[BOLSaveResponse], status_code=status.HTTP_201_CREATED)
async def duplicate_bol_endpoint(
    bol_id_or_number: str,
    new_bol_number: str = Query(..., description="New unique BOL number for the cloned document"),
    db: AsyncSession = Depends(get_db),
):
    """Fast atomic duplicate creating a clean BOL without copying old audit or PDF history (Section 28)."""
    res = await duplicate_bol(db, bol_id_or_number, new_bol_number)
    return APIResponse(
        success=True,
        message="BOL duplicated successfully",
        data=res,
    )


@router.patch("/{bol_id_or_number}", response_model=APIResponse[BOLSaveResponse])
async def patch_bol_endpoint(
    bol_id_or_number: str,
    payload: BOLPatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Partial update with optimistic concurrency control (Sections 22, 23, 24, 83)."""
    res = await patch_bol(db, bol_id_or_number, payload)
    return APIResponse(
        success=True,
        message="BOL updated successfully",
        data=res,
    )


@router.post("", response_model=APIResponse[BOLResponse], status_code=status.HTTP_201_CREATED)
async def create_bol(
    payload: BOLCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new Bill of Lading with transaction safety and fee segregation (Sections 25, 26)."""
    response_data = await create_bol_atomic(db, payload)
    return APIResponse(
        success=True,
        message=f"Bill of Lading {response_data.bol_number} created successfully",
        data=response_data,
    )


@router.get("/{bol_number}", response_model=APIResponse[BOLResponse])
async def get_bol(
    bol_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve BOL record by BOL number."""
    stmt = select(BOLModel).where(
        or_(BOLModel.bol_number == bol_number, BOLModel.id == bol_number)
    )
    res = await db.execute(stmt)
    bol = res.scalar_one_or_none()
    if not bol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BOL number {bol_number} not found",
        )

    response_data = BOLResponse(
        id=1,
        bol_number=bol.bol_number,
        origin=bol.origin,
        border_station=bol.border_station,
        driver_name=bol.driver_name,
        father_name=bol.father_name,
        driver_rent=float(bol.driver_rent or 0),
        carton_count=bol.carton_count,
        gross_weight_kg=float(bol.gross_weight_kg or 0),
        net_weight_kg=float(bol.net_weight_kg or 0),
        cargo_description=bol.cargo_description,
        destination=bol.destination,
        status=bol.status,
        freight_fee=float(bol.freight_fee or 0),
        demurrage_fee=float(bol.demurrage_fee or 0),
        documentation_fee=float(bol.documentation_fee or 0),
        currency=bol.currency,
        exchange_rate=float(bol.exchange_rate or 1.0),
        created_at=bol.created_at.isoformat() if bol.created_at else "",
        updated_at=bol.updated_at.isoformat() if bol.updated_at else "",
    )
    return APIResponse(success=True, message="BOL retrieved", data=response_data)


@router.delete("/{bol_number}", response_model=APIResponse[bool])
async def delete_bol(
    bol_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete BOL record."""
    stmt = select(BOLModel).where(
        or_(BOLModel.bol_number == bol_number, BOLModel.id == bol_number)
    )
    res = await db.execute(stmt)
    bol = res.scalar_one_or_none()
    if not bol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BOL number {bol_number} not found",
        )
    await db.delete(bol)
    await db.commit()
    return APIResponse(success=True, message="BOL deleted", data=True)
