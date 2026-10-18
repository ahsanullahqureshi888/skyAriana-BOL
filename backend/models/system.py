from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import BaseModel


class UserModel(BaseModel):
    """User account entity with role-based access control."""

    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(160), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), default="operator", index=True, nullable=False
    )  # admin, manager, accountant, operator, viewer
    password_hash: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SettingModel(BaseModel):
    """Global system and organizational settings entity."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="general", index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class AuditLogModel(BaseModel):
    """Audit trail record for all state mutations."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_created_at", "created_at"),
    )

    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # create, update, delete, export, login
    entity_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    old_values_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_values_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class BackupModel(BaseModel):
    """Database backup snapshot registry."""

    __tablename__ = "backups"

    backup_filename: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    backup_type: Mapped[str] = mapped_column(
        String(64), default="full", nullable=False
    )  # full, snapshot, json_sync
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="completed", index=True, nullable=False)
    checksum: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class SequenceCounterModel(BaseModel):
    """Concurrency-safe atomic sequence counter for BOLs, invoices, and journal entries."""

    __tablename__ = "sequence_counters"

    entity_type: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    prefix: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    current_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pad_length: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    suffix: Mapped[str] = mapped_column(String(32), default="", nullable=False)

