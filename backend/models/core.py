from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


def new_id() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.utcnow()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class JsonPayloadMixin(TimestampMixin):
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(80), default="admin", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    is_active: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class CompanySettings(JsonPayloadMixin, Base):
    __tablename__ = "company_settings"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True, default="default", nullable=False)


class UserSettings(JsonPayloadMixin, Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    key: Mapped[str] = mapped_column(String(120), default="default", index=True, nullable=False)


class Invoice(JsonPayloadMixin, Base):
    __tablename__ = "invoices"

    invoice_number: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), default="", index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(80), default="draft", index=True, nullable=False)


class InvoiceItem(JsonPayloadMixin, Base):
    __tablename__ = "invoice_items"

    invoice_id: Mapped[str] = mapped_column(String(64), ForeignKey("invoices.id"), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    quantity: Mapped[str] = mapped_column(String(80), default="1", nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class BillOfLading(JsonPayloadMixin, Base):
    __tablename__ = "bill_of_lading"

    bol_number: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    shipper_name: Mapped[str] = mapped_column(String(255), default="", index=True, nullable=False)
    consignee_name: Mapped[str] = mapped_column(String(255), default="", index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(80), default="draft", index=True, nullable=False)


class ImportAccount(JsonPayloadMixin, Base):
    __tablename__ = "import_accounts"

    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    account_type: Mapped[str] = mapped_column(String(80), default="import", index=True, nullable=False)


class ExportAccount(JsonPayloadMixin, Base):
    __tablename__ = "export_accounts"

    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    account_type: Mapped[str] = mapped_column(String(80), default="export", index=True, nullable=False)


class LedgerEntry(JsonPayloadMixin, Base):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        Index("ix_ledger_account_lookup", "account_id", "account_type"),
    )

    account_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    account_type: Mapped[str] = mapped_column(String(40), default="export", index=True, nullable=False)
    invoice_no: Mapped[str] = mapped_column(String(120), default="", index=True, nullable=False)
    bill_of_lading: Mapped[str] = mapped_column(String(160), default="", index=True, nullable=False)
    debit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pdf_file: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Truck(JsonPayloadMixin, Base):
    __tablename__ = "trucks"

    driver_name: Mapped[str] = mapped_column(String(255), default="", index=True, nullable=False)
    container_number: Mapped[str] = mapped_column(String(160), default="", index=True, nullable=False)
    track_no: Mapped[str] = mapped_column(String(160), default="", index=True, nullable=False)
    destination: Mapped[str] = mapped_column(String(255), default="", index=True, nullable=False)


class Container(JsonPayloadMixin, Base):
    __tablename__ = "containers"

    container_number: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    container_type: Mapped[str] = mapped_column(String(120), default="", index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(80), default="", index=True, nullable=False)


class MediaFile(TimestampMixin, Base):
    __tablename__ = "media_files"
    __table_args__ = (
        Index("ix_media_linked", "linked_type", "linked_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    media_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    shipment_reference: Mapped[str] = mapped_column(String(160), default="", index=True, nullable=False)
    linked_type: Mapped[str] = mapped_column(String(80), default="", index=True, nullable=False)
    linked_id: Mapped[str] = mapped_column(String(64), default="", index=True, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class UploadedDocument(TimestampMixin, Base):
    __tablename__ = "uploaded_documents"
    __table_args__ = (
        Index("ix_document_linked", "linked_type", "linked_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    linked_type: Mapped[str] = mapped_column(String(80), default="", index=True, nullable=False)
    linked_id: Mapped[str] = mapped_column(String(64), default="", index=True, nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class AppSettings(JsonPayloadMixin, Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(64), default="", index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), default="", index=True, nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), default="", index=True, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
