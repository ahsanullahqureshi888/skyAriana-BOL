from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import AuditLog


async def audit(
    db: AsyncSession,
    action: str,
    entity_type: str = "",
    entity_id: str = "",
    user_id: str = "",
    payload: dict | None = None,
) -> AuditLog:
    row = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        payload=payload or {},
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row

