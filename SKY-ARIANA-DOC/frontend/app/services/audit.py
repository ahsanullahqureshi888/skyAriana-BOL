from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import models


SENSITIVE_PARTS = ("password", "password_hash", "token", "secret", "answer", "credential")


def _safe_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _safe_value(item)
            for key, item in value.items()
            if not any(part in str(key).lower() for part in SENSITIVE_PARTS)
        }
    if isinstance(value, list):
        return [_safe_value(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def request_metadata(request: Request | None) -> dict[str, str | None]:
    if not request:
        return {"ip_address": None, "user_agent": None, "request_id": None}
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "request_id": request.headers.get("x-request-id"),
    }


def write_audit(
    db: Session,
    *,
    actor_user_id: int | None,
    action: str,
    module: str,
    description: str,
    target_user_id: int | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    request: Request | None = None,
) -> models.AuditLog:
    metadata = request_metadata(request)
    safe_old = _safe_value(old_values) if old_values is not None else None
    safe_new = _safe_value(new_values) if new_values is not None else None
    record = models.AuditLog(
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
        module=module,
        description=description,
        old_values=safe_old,
        new_values=safe_new,
        ip_address=metadata["ip_address"],
        user_agent=metadata["user_agent"],
        request_id=metadata["request_id"],
    )
    db.add(record)

    # Keep the existing Activity History page populated while the richer audit
    # table stores the structured, security-sensitive metadata.
    details = {
        "description": description,
        "module": module,
        "target_user_id": target_user_id,
        "old_values": safe_old,
        "new_values": safe_new,
        "ip_address": metadata["ip_address"],
    }
    db.add(models.ActivityLog(
        user_id=actor_user_id,
        action=action,
        entity_type=module,
        entity_id=target_user_id,
        details=json.dumps(details, ensure_ascii=False),
    ))
    return record
