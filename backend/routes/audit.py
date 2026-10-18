"""Audit Log Inspection Routes for AQ COMPANIES."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth_middleware import require_permission
from backend.database import get_db
from backend.models.system import UserModel
from backend.services.audit_service import query_audit_logs

logger = logging.getLogger("aq_companies.routes.audit")

router = APIRouter(prefix="/audit", tags=["Security & Audit Logs"])


@router.get("/logs", summary="Query immutable security audit logs")
async def get_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. USER, BOL, LEDGER, AUTH)"),
    action: Optional[str] = Query(None, description="Filter by action (e.g. LOGIN_SUCCESS, USER_CREATE)"),
    username: Optional[str] = Query(None, description="Filter by username"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permission("audit_view")),
):
    """Retrieve immutable security audit trail entries."""
    logs, total = await query_audit_logs(
        db=db,
        entity_type=entity_type,
        action=action,
        username=username,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": logs,
    }
