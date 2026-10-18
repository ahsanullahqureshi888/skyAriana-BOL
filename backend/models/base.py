from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


def generate_uuid() -> str:
    """Generate a standard string UUID4 for primary keys."""
    return str(uuid.uuid4())


class BaseModel(Base):
    """Abstract production base model with UUID primary keys, optimistic locking (revision),

    standard audit timestamps, and robust dictionary serialization.
    """

    __abstract__ = True

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    revision: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __mapper_args__ = {
        "version_id_col": revision,
    }

    def __init__(self, **kw: Any) -> None:
        if "id" not in kw or kw["id"] is None:
            kw["id"] = generate_uuid()
        if "revision" not in kw or kw["revision"] is None:
            kw["revision"] = 1
        if "created_at" not in kw or kw["created_at"] is None:
            kw["created_at"] = datetime.now(timezone.utc)
        if "updated_at" not in kw or kw["updated_at"] is None:
            kw["updated_at"] = datetime.now(timezone.utc)
        super().__init__(**kw)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize model columns to dictionary with Decimal, datetime, and UUID conversions."""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, (datetime, date)):
                result[column.name] = value.isoformat()
            elif isinstance(value, Decimal):
                result[column.name] = str(value)
            elif isinstance(value, uuid.UUID):
                result[column.name] = str(value)
            else:
                result[column.name] = value
        return result
