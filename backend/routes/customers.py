from __future__ import annotations

import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.schemas.placeholders import (
    APIResponse,
    CustomerCreate,
    CustomerResponse,
    PaginatedList,
)

router = APIRouter(prefix="/customers", tags=["Customers"])

_customers_store: list[dict] = []


@router.get("", response_model=PaginatedList[CustomerResponse])
async def list_customers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    items = list(_customers_store)
    if search:
        s = search.lower()
        items = [c for c in items if s in c["customer_name"].lower()]
    start = (page - 1) * page_size
    paged = items[start : start + page_size]
    return PaginatedList(
        items=paged,
        total=len(items),
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=APIResponse[CustomerResponse], status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerCreate):
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = {
        **payload.model_dump(),
        "id": len(_customers_store) + 1,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    _customers_store.append(record)
    return APIResponse(success=True, message="Customer created", data=record)
