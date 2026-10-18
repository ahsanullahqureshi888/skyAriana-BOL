from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel

if TYPE_CHECKING:
    from backend.models.documents import DocumentModel
    from backend.models.logistics import BOLModel, ShipmentModel
    from backend.models.parties import CustomerModel


class LedgerAccountModel(BaseModel):
    """Account chart entity for double-entry ledger bookkeeping."""

    __tablename__ = "ledgers"

    account_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    account_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    account_type: Mapped[str] = mapped_column(
        String(64), default="customer", index=True, nullable=False
    )  # customer, vendor, expense, asset, liability
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)  # USD vs AFN
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    entries: Mapped[List[LedgerModel]] = relationship(
        "LedgerModel", back_populates="ledger_account", lazy="selectin"
    )


class LedgerModel(BaseModel):
    """Double-entry account ledger entry model.

    Strictly enforces the Accounting Invariance Identity:
    Net Balance = Total Debit - Total Credit
    """

    __tablename__ = "ledger_records"
    __table_args__ = (
        Index("ix_ledger_records_acc_date_id", "account_id", "transaction_date", "id"),
        Index("ix_ledger_records_acc_date_covering", "account_id", "transaction_date", "debit", "credit"),
        Index("ix_ledger_records_date_id", "transaction_date", "id"),
        Index("ix_ledger_records_curr_date_id", "currency", "transaction_date", "id"),
        Index("ix_ledger_records_curr_acc_date_id", "currency", "account_id", "transaction_date", "id"),
        Index("ix_ledger_records_curr_acc_date_cov", "currency", "account_id", "transaction_date", "debit", "credit"),
    )

    account_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    account_name: Mapped[str] = mapped_column(String(160), nullable=False)
    transaction_date: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(256), nullable=False)

    # Exact Decimal fields for financial numbers
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)

    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)  # USD vs AFN
    fee_type: Mapped[Optional[str]] = mapped_column(
        String(32), index=True, nullable=True
    )  # freight, demurrage, documentation, general
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("1.0000"), nullable=False
    )
    reference_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)

    # Foreign Keys
    ledger_account_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("ledgers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    invoice_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="SET NULL"), index=True, nullable=True
    )

    ledger_account: Mapped[Optional[LedgerAccountModel]] = relationship(
        "LedgerAccountModel", back_populates="entries", lazy="selectin"
    )
    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="ledgers", lazy="selectin"
    )
    invoice: Mapped[Optional[InvoiceModel]] = relationship(
        "InvoiceModel", back_populates="ledgers", lazy="selectin"
    )


class InvoiceModel(BaseModel):
    """Customer invoice entity with demarcated freight, demurrage, and documentation fees."""

    __tablename__ = "invoices"

    invoice_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    customer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("customers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    customer_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    issue_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True, nullable=False)

    # Financial Summary
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    discount_total: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )

    # Fee Demarcation
    freight_fee: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    demurrage_fee: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    documentation_fee: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)  # USD vs AFN
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("1.0000"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships with selectin lazy loading for async safety
    customer: Mapped[Optional[CustomerModel]] = relationship(
        "CustomerModel", back_populates="invoices", lazy="selectin"
    )
    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="invoices", lazy="selectin"
    )
    items: Mapped[List[InvoiceItemModel]] = relationship(
        "InvoiceItemModel", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[List[PaymentModel]] = relationship(
        "PaymentModel", back_populates="invoice", lazy="selectin"
    )
    discounts: Mapped[List[DiscountModel]] = relationship(
        "DiscountModel", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )
    ledgers: Mapped[List[LedgerModel]] = relationship(
        "LedgerModel", back_populates="invoice", lazy="selectin"
    )
    documents: Mapped[List[DocumentModel]] = relationship(
        "DocumentModel", back_populates="invoice", lazy="selectin"
    )


class InvoiceItemModel(BaseModel):
    """Line item in an invoice."""

    __tablename__ = "invoice_items"

    invoice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    fee_category: Mapped[str] = mapped_column(
        String(32), default="general", nullable=False
    )  # freight, demurrage, documentation, general
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("1.0000"), nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)

    invoice: Mapped[InvoiceModel] = relationship("InvoiceModel", back_populates="items", lazy="selectin")


class PaymentModel(BaseModel):
    """Payment transaction applied against an invoice or customer balance."""

    __tablename__ = "payments"

    payment_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    invoice_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="SET NULL"), index=True, nullable=True
    )
    customer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("customers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)  # USD vs AFN
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("1.0000"), nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(64), default="bank_transfer", nullable=False
    )  # cash, bank_transfer, hawala, cheque
    reference_no: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer: Mapped[Optional[CustomerModel]] = relationship(
        "CustomerModel", back_populates="payments", lazy="selectin"
    )
    invoice: Mapped[Optional[InvoiceModel]] = relationship(
        "InvoiceModel", back_populates="payments", lazy="selectin"
    )


class ExpenseModel(BaseModel):
    """Operational expense voucher model."""

    __tablename__ = "expenses"

    expense_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )  # fuel, customs, driver_rent, handling, office
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)  # USD vs AFN
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("1.0000"), nullable=False
    )
    expense_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    paid_to: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="expenses", lazy="selectin"
    )


class FreightChargeModel(BaseModel):
    """Detailed freight surcharge item."""

    __tablename__ = "freight_charges"

    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="CASCADE"), index=True, nullable=True
    )
    shipment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("shipments.id", ondelete="SET NULL"), index=True, nullable=True
    )
    charge_type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # ocean_freight, road_freight, border_toll, terminal_handling
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("1.0000"), nullable=False
    )
    is_prepaid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="freight_charges", lazy="selectin"
    )
    shipment: Mapped[Optional[ShipmentModel]] = relationship(
        "ShipmentModel", back_populates="freight_charges", lazy="selectin"
    )


class DiscountModel(BaseModel):
    """Discount entry model applied on invoices or BOLs."""

    __tablename__ = "discounts"

    invoice_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), index=True, nullable=True
    )
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    discount_type: Mapped[str] = mapped_column(
        String(32), default="fixed", nullable=False
    )  # fixed, percentage
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    authorized_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    invoice: Mapped[Optional[InvoiceModel]] = relationship(
        "InvoiceModel", back_populates="discounts", lazy="selectin"
    )
    bol: Mapped[Optional[BOLModel]] = relationship(
        "BOLModel", back_populates="discounts", lazy="selectin"
    )


class JournalEntryModel(BaseModel):
    """General Ledger Journal Entry Voucher entity for double-entry bookkeeping."""

    __tablename__ = "journal_entries"
    __table_args__ = (
        Index("ix_journal_entries_date_num", "entry_date", "entry_number"),
    )

    entry_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    entry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    narration: Mapped[str] = mapped_column(Text, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("1.0000"), nullable=False)
    total_debit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    total_credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    is_posted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    source_module: Mapped[str] = mapped_column(String(64), default="general_journal", nullable=False)

    lines: Mapped[List[JournalLineModel]] = relationship(
        "JournalLineModel", back_populates="journal_entry", cascade="all, delete-orphan", lazy="selectin"
    )


class JournalLineModel(BaseModel):
    """Line item in a general ledger journal entry."""

    __tablename__ = "journal_lines"
    __table_args__ = (
        Index("ix_journal_lines_acc_entry", "account_id", "journal_entry_id"),
    )

    journal_entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("journal_entries.id", ondelete="CASCADE"), index=True, nullable=False
    )
    account_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    account_name: Mapped[str] = mapped_column(String(160), nullable=False)
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    memo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    journal_entry: Mapped[JournalEntryModel] = relationship(
        "JournalEntryModel", back_populates="lines", lazy="selectin"
    )
