"""Audit Logging Service for AQ COMPANIES.

Records immutable audit trails for critical business actions (BOL changes,
ledger mutations, payments, user authentication, and system restore attempts).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.base import generate_uuid
from backend.models.system import AuditLogModel

logger = logging.getLogger("aq_companies.audit")


async def record_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    entity_id: Optional[str] = None,
    old_values: Optional[dict[str, Any]] = None,
    new_values: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLogModel:
    """Write an immutable audit log entry into the authoritative audit_logs table."""
    try:
        old_json = json.dumps(old_values, default=str) if old_values is not None else None
        new_json = json.dumps(new_values, default=str) if new_values is not None else None

        entry = AuditLogModel(
            id=generate_uuid(),
            user_id=user_id,
            username=username or "system",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values_json=old_json,
            new_values_json=new_json,
            ip_address=ip_address,
        )
        db.add(entry)
        await db.flush()
        return entry
    except Exception as exc:
        logger.error(f"Failed to record audit event: {exc}", exc_info=True)
        raise


async def query_audit_logs(
    db: AsyncSession,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """Retrieve audit logs with optional filters."""
    query = select(AuditLogModel)

    if entity_type:
        query = query.where(AuditLogModel.entity_type == entity_type)
    if action:
        query = query.where(AuditLogModel.action == action)
    if username:
        query = query.where(AuditLogModel.username == username)

    query = query.order_by(AuditLogModel.created_at.desc())

    result = await db.execute(query.limit(limit).offset(offset))
    records = result.scalars().all()

    formatted = []
    for r in records:
        formatted.append({
            "id": r.id,
            "user_id": r.user_id,
            "username": r.username,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "old_values": json.loads(r.old_values_json) if r.old_values_json else None,
            "new_values": json.loads(r.new_values_json) if r.new_values_json else None,
            "ip_address": r.ip_address,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return formatted, len(formatted)
