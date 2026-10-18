from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel

if TYPE_CHECKING:
    from backend.models.accounting import InvoiceModel, PaymentModel
    from backend.models.logistics import BOLModel


class CompanyModel(BaseModel):
    """Company profile entity."""

    __tablename__ = "companies"

    company_name: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    tax_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), default="Afghanistan", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    shippers: Mapped[List[ShipperModel]] = relationship(
        "ShipperModel", back_populates="company", lazy="selectin"
    )
    consignees: Mapped[List[ConsigneeModel]] = relationship(
        "ConsigneeModel", back_populates="company", lazy="selectin"
    )
    bols: Mapped[List[BOLModel]] = relationship(
        "BOLModel", back_populates="company", lazy="selectin"
    )


class ShipperModel(BaseModel):
    """Shipper (consignor) profile entity."""

    __tablename__ = "shippers"

    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    company_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="SET NULL"), index=True, nullable=True
    )
    contact_person: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    company: Mapped[Optional[CompanyModel]] = relationship(
        "CompanyModel", back_populates="shippers", lazy="selectin"
    )
    bols: Mapped[List[BOLModel]] = relationship(
        "BOLModel", back_populates="shipper", lazy="selectin"
    )


class ConsigneeModel(BaseModel):
    """Consignee (recipient) profile entity."""

    __tablename__ = "consignees"

    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    company_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="SET NULL"), index=True, nullable=True
    )
    contact_person: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    company: Mapped[Optional[CompanyModel]] = relationship(
        "CompanyModel", back_populates="consignees", lazy="selectin"
    )
    bols: Mapped[List[BOLModel]] = relationship(
        "BOLModel", back_populates="consignee", lazy="selectin"
    )


class NotifyPartyModel(BaseModel):
    """Notify party entity for shipment arrivals."""

    __tablename__ = "notify_parties"

    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    bols: Mapped[List[BOLModel]] = relationship(
        "BOLModel", back_populates="notify_party", lazy="selectin"
    )


class AgentModel(BaseModel):
    """Forwarding or customs clearance agent entity."""

    __tablename__ = "agents"

    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    agent_type: Mapped[str] = mapped_column(String(64), default="customs", index=True, nullable=False)
    border_station: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CustomerModel(BaseModel):
    """Customer entity model."""

    __tablename__ = "customers"

    customer_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    customer_type: Mapped[str] = mapped_column(String(64), default="importer", index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    invoices: Mapped[List[InvoiceModel]] = relationship(
        "InvoiceModel", back_populates="customer", lazy="selectin"
    )
    payments: Mapped[List[PaymentModel]] = relationship(
        "PaymentModel", back_populates="customer", lazy="selectin"
    )


class ClientModel(BaseModel):
    """Enterprise client profile entity with portal access and credit limits."""

    __tablename__ = "clients"

    client_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    account_number: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    portal_access: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    credit_limit: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )


class SupplierModel(BaseModel):
    """Supplier and logistics vendor entity."""

    __tablename__ = "suppliers"

    supplier_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    supplier_type: Mapped[str] = mapped_column(String(64), default="logistics", index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
