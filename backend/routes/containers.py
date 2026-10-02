"""Container lookup routes."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.placeholders import APIResponse
from backend.services.cache_service import master_data_cache
from backend.services.container_service import lookup_container

router = APIRouter(prefix="/containers", tags=["Containers"])


@router.get("/lookup", response_model=APIResponse[dict])
async def container_lookup_endpoint(
    number: Optional[str] = Query(None, description="Container number to lookup (e.g. MSKU1234567)"),
    container_number: Optional[str] = Query(None, description="Alias for container number"),
    db: AsyncSession = Depends(get_db),
):
    """Instant container lookup via indexed container_number column with caching (Section 30)."""
    target = (number or container_number or "").strip()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either 'number' or 'container_number' query parameter is required",
        )

    cache_key = f"container_lookup:{target.upper()}"
    cached = master_data_cache.get(cache_key)
    if cached is not None:
        return APIResponse(success=True, message="Container found", data=cached)

    res = await lookup_container(db, target)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container '{target}' not found",
        )

    master_data_cache.set(cache_key, res, ttl=120)
    return APIResponse(success=True, message="Container found", data=res)
