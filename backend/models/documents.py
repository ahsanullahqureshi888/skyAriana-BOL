from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel

if TYPE_CHECKING:
    from backend.models.accounting import InvoiceModel
    from backend.models.logistics import BOLModel, ShipmentModel


class PackingListModel(BaseModel):
    """Packing list document model."""

    __tablename__ = "packing_lists"

    packing_list_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    shipment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("shipments.id", ondelete="SET NULL"), index=True, nullable=True
    )
    total_packages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_gross_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    total_net_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    total_volume_cbm: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="packing_lists", lazy="selectin"
    )
    shipment: Mapped[Optional[ShipmentModel]] = relationship(
        "ShipmentModel", lazy="selectin"
    )


class TransitPaperModel(BaseModel):
    """Border transit paper / customs clearance voucher model."""

    __tablename__ = "transit_papers"

    transit_paper_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    border_station: Mapped[str] = mapped_column(
        String(128), index=True, nullable=False
    )  # e.g., Islam Qala, Torghundi, Hairatan, Spin Boldak
    customs_declaration_no: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    entry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    exit_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="cleared", index=True, nullable=False)

    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="transit_papers", lazy="selectin"
    )


class PhytosanitaryCertificateModel(BaseModel):
    """Agricultural and quarantine phytosanitary clearance certificate model."""

    __tablename__ = "phytosanitary_certificates"

    certificate_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    issuing_authority: Mapped[str] = mapped_column(String(160), nullable=False)
    inspection_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expiration_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    treatments_applied: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="valid", index=True, nullable=False)

    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="phytosanitary_certificates", lazy="selectin"
    )


class DocumentModel(BaseModel):
    """Generic document metadata entity (BOL scans, invoices, customs papers)."""

    __tablename__ = "documents"

    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )  # bol_scan, invoice_pdf, customs_declaration, packing_list, certificate
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    shipment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("shipments.id", ondelete="SET NULL"), index=True, nullable=True
    )
    invoice_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="SET NULL"), index=True, nullable=True
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf", nullable=False)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="documents", lazy="selectin"
    )
    shipment: Mapped[Optional[ShipmentModel]] = relationship(
        "ShipmentModel", back_populates="documents", lazy="selectin"
    )
    invoice: Mapped[Optional[InvoiceModel]] = relationship(
        "InvoiceModel", back_populates="documents", lazy="selectin"
    )


class AttachmentModel(BaseModel):
    """File attachments linked polymorphically to any entity."""

    __tablename__ = "attachments"
    __table_args__ = (
        Index("ix_attachment_link", "linked_type", "linked_id"),
    )

    linked_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    linked_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream", nullable=False)


class ReportModel(BaseModel):
    """Generated management and financial report artifact model."""

    __tablename__ = "reports"

    report_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    report_type: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )  # financial, bol_summary, customs, customer_ledger, audit
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    parameters_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    format: Mapped[str] = mapped_column(String(32), default="pdf", nullable=False)  # pdf, xlsx, json
