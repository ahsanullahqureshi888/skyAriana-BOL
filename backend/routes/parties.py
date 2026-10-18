"""Party search and recent cache routes."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.parties import PartySearchItem
from backend.schemas.placeholders import APIResponse
from backend.services.party_service import get_recent_parties, record_recent_party, search_parties

router = APIRouter(prefix="/parties", tags=["Parties & Master Data"])


@router.get("/search", response_model=APIResponse[List[PartySearchItem]])
async def party_search_endpoint(
    q: Optional[str] = Query(None, description="Prefix or substring search across party name/phone"),
    role: Optional[str] = Query(None, description="Role filter: SHIPPER, CONSIGNEE, NOTIFY_PARTY, CUSTOMER, AGENT, ALL"),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Ultra-fast async party selector search using prefix queries and LRU recent cache (Sections 3-5)."""
    items = await search_parties(db, query=q, role=role, limit=limit)
    return APIResponse(
        success=True,
        message=f"Found {len(items)} parties",
        data=items,
    )


@router.get("/recent", response_model=APIResponse[List[PartySearchItem]])
async def party_recent_endpoint(
    role: Optional[str] = Query(None, description="Role filter: SHIPPER, CONSIGNEE, NOTIFY_PARTY, CUSTOMER"),
):
    """Instant retrieval of recent/frequently used parties from in-memory cache (Section 5)."""
    items = get_recent_parties(role)
    return APIResponse(
        success=True,
        message="Recent parties retrieved",
        data=items,
    )
