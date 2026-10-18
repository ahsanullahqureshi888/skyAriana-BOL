from __future__ import annotations

import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.schemas.placeholders import (
    APIResponse,
    CompanyCreate,
    CompanyResponse,
    PaginatedList,
)

router = APIRouter(prefix="/companies", tags=["Companies"])

_companies_store: dict[str, dict] = {}


@router.get("", response_model=PaginatedList[CompanyResponse])
async def list_companies(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    items = list(_companies_store.values())
    if search:
        s = search.lower()
        items = [c for c in items if s in c["company_name"].lower() or s in c["code"].lower()]
    start = (page - 1) * page_size
    paged = items[start : start + page_size]
    return PaginatedList(
        items=paged,
        total=len(items),
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=APIResponse[CompanyResponse], status_code=status.HTTP_201_CREATED)
async def create_company(payload: CompanyCreate):
    if payload.code in _companies_store:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Company with code {payload.code} already exists",
        )
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = {
        **payload.model_dump(),
        "id": len(_companies_store) + 1,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    _companies_store[payload.code] = record
    return APIResponse(success=True, message="Company created", data=record)


@router.get("/{code}", response_model=APIResponse[CompanyResponse])
async def get_company(code: str):
    if code not in _companies_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return APIResponse(success=True, message="Company retrieved", data=_companies_store[code])
