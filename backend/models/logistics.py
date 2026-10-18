from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean,
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
    from backend.models.accounting import (
        DiscountModel,
        ExpenseModel,
        FreightChargeModel,
        InvoiceModel,
        LedgerModel,
    )
    from backend.models.documents import (
        DocumentModel,
        PackingListModel,
        PhytosanitaryCertificateModel,
        TransitPaperModel,
    )
    from backend.models.parties import (
        CompanyModel,
        ConsigneeModel,
        NotifyPartyModel,
        ShipperModel,
    )


class CommodityModel(BaseModel):
    """Cargo commodity classification model."""

    __tablename__ = "commodities"

    hs_code: Mapped[Optional[str]] = mapped_column(String(32), index=True, nullable=True)
    commodity_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_hazardous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    bol_items: Mapped[List[BOLItemModel]] = relationship(
        "BOLItemModel", back_populates="commodity", lazy="selectin"
    )


class DriverModel(BaseModel):
    """Driver profile entity with Afghan Tazkira and cross-border license."""

    __tablename__ = "drivers"

    driver_name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    father_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    national_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    passport_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    trucks: Mapped[List[TruckModel]] = relationship(
        "TruckModel", back_populates="driver", lazy="selectin"
    )
    bols: Mapped[List[BOLModel]] = relationship(
        "BOLModel", back_populates="driver", lazy="selectin"
    )


class TruckModel(BaseModel):
    """Truck/trailer fleet record entity."""

    __tablename__ = "trucks"

    truck_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    driver_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("drivers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    driver_name: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    container_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    truck_model: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    capacity_tons: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )

    driver: Mapped[Optional[DriverModel]] = relationship(
        "DriverModel", back_populates="trucks", lazy="selectin"
    )
    bols: Mapped[List[BOLModel]] = relationship(
        "BOLModel", back_populates="truck", lazy="selectin"
    )


class PortModel(BaseModel):
    """Port entity (dry port, sea port, border crossing)."""

    __tablename__ = "ports"

    port_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    port_name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    country: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    port_type: Mapped[str] = mapped_column(String(64), default="dry_port", nullable=False)


class LocationModel(BaseModel):
    """Geographic warehouse and terminal location entity."""

    __tablename__ = "locations"

    location_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    location_name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="Afghanistan", nullable=False)
    is_border: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RouteModel(BaseModel):
    """Transit route and border corridor definition."""

    __tablename__ = "routes"

    route_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    origin: Mapped[str] = mapped_column(String(128), nullable=False)
    destination: Mapped[str] = mapped_column(String(128), nullable=False)
    border_crossing: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    distance_km: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    transit_days_estimate: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    shipments: Mapped[List[ShipmentModel]] = relationship(
        "ShipmentModel", back_populates="route", lazy="selectin"
    )


class BOLModel(BaseModel):
    """Multi-modal Bill of Lading (BOL) database model with full Afghan border and financial demarcation."""

    __tablename__ = "bol_records"
    __table_args__ = (
        Index("ix_bol_records_status_date", "status", "issue_date"),
        Index("ix_bol_records_company_date", "company_id", "issue_date"),
        Index("ix_bol_records_shipper_date", "shipper_id", "issue_date"),
        Index("ix_bol_records_consignee_date", "consignee_id", "issue_date"),
    )

    bol_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    issue_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    origin: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    destination: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    border_station: Mapped[str] = mapped_column(
        String(128), index=True, nullable=False
    )  # e.g., Islam Qala, Torghundi, Hairatan, Spin Boldak
    driver_name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    father_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    driver_rent: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    carton_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gross_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    net_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    cargo_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True, nullable=False)

    # Party search strings for fast query indexing & legacy migration compatibility
    shipper_name: Mapped[Optional[str]] = mapped_column(String(200), index=True, nullable=True)
    consignee_name: Mapped[Optional[str]] = mapped_column(String(200), index=True, nullable=True)
    notify_party_name: Mapped[Optional[str]] = mapped_column(String(200), index=True, nullable=True)

    # Fee Segregation & Multi-Currency Demarcation (Exact Decimal types)
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

    # Foreign Keys
    company_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="SET NULL"), index=True, nullable=True
    )
    shipper_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("shippers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    consignee_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("consignees.id", ondelete="SET NULL"), index=True, nullable=True
    )
    notify_party_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("notify_parties.id", ondelete="SET NULL"), index=True, nullable=True
    )
    driver_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("drivers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    truck_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("trucks.id", ondelete="SET NULL"), index=True, nullable=True
    )

    # Relationships with selectin lazy loading for async safety
    company: Mapped[Optional[CompanyModel]] = relationship(
        "CompanyModel", back_populates="bols", lazy="selectin"
    )
    shipper: Mapped[Optional[ShipperModel]] = relationship(
        "ShipperModel", back_populates="bols", lazy="selectin"
    )
    consignee: Mapped[Optional[ConsigneeModel]] = relationship(
        "ConsigneeModel", back_populates="bols", lazy="selectin"
    )
    notify_party: Mapped[Optional[NotifyPartyModel]] = relationship(
        "NotifyPartyModel", back_populates="bols", lazy="selectin"
    )
    driver: Mapped[Optional[DriverModel]] = relationship(
        "DriverModel", back_populates="bols", lazy="selectin"
    )
    truck: Mapped[Optional[TruckModel]] = relationship(
        "TruckModel", back_populates="bols", lazy="selectin"
    )

    items: Mapped[List[BOLItemModel]] = relationship(
        "BOLItemModel", back_populates="bol", cascade="all, delete-orphan", lazy="selectin"
    )
    shipments: Mapped[List[ShipmentModel]] = relationship(
        "ShipmentModel", back_populates="bol", lazy="selectin"
    )
    containers: Mapped[List[ContainerModel]] = relationship(
        "ContainerModel", back_populates="bol", lazy="selectin"
    )
    invoices: Mapped[List[InvoiceModel]] = relationship(
        "InvoiceModel", back_populates="bol", lazy="selectin"
    )
    ledgers: Mapped[List[LedgerModel]] = relationship(
        "LedgerModel", back_populates="bol", lazy="selectin"
    )
    expenses: Mapped[List[ExpenseModel]] = relationship(
        "ExpenseModel", back_populates="bol", lazy="selectin"
    )
    freight_charges: Mapped[List[FreightChargeModel]] = relationship(
        "FreightChargeModel", back_populates="bol", cascade="all, delete-orphan", lazy="selectin"
    )
    discounts: Mapped[List[DiscountModel]] = relationship(
        "DiscountModel", back_populates="bol", lazy="selectin"
    )
    packing_lists: Mapped[List[PackingListModel]] = relationship(
        "PackingListModel", back_populates="bol", lazy="selectin"
    )
    transit_papers: Mapped[List[TransitPaperModel]] = relationship(
        "TransitPaperModel", back_populates="bol", lazy="selectin"
    )
    phytosanitary_certificates: Mapped[List[PhytosanitaryCertificateModel]] = relationship(
        "PhytosanitaryCertificateModel", back_populates="bol", lazy="selectin"
    )
    documents: Mapped[List[DocumentModel]] = relationship(
        "DocumentModel", back_populates="bol", lazy="selectin"
    )


class BOLItemModel(BaseModel):
    """Line items inside a Bill of Lading."""

    __tablename__ = "bol_items"

    bol_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="CASCADE"), index=True, nullable=False
    )
    commodity_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("commodities.id", ondelete="SET NULL"), index=True, nullable=True
    )
    item_description: Mapped[str] = mapped_column(String(255), nullable=False)
    carton_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gross_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    net_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    volume_cbm: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    package_type: Mapped[str] = mapped_column(String(64), default="cartons", nullable=False)

    bol: Mapped[BOLModel] = relationship("BOLModel", back_populates="items", lazy="selectin")
    commodity: Mapped[Optional[CommodityModel]] = relationship(
        "CommodityModel", back_populates="bol_items", lazy="selectin"
    )


class ShipmentModel(BaseModel):
    """Shipment tracker model linking to BOL and transit routes."""

    __tablename__ = "shipments"

    tracking_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    reference_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    bol_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    origin: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    destination: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="in_transit", index=True, nullable=False)
    carrier: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    departure_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    arrival_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    route_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("routes.id", ondelete="SET NULL"), nullable=True
    )

    bol: Mapped[Optional[BOLModel]] = relationship("BOLModel", back_populates="shipments", lazy="selectin")
    route: Mapped[Optional[RouteModel]] = relationship("RouteModel", back_populates="shipments", lazy="selectin")
    containers: Mapped[List[ContainerModel]] = relationship(
        "ContainerModel", back_populates="shipment", lazy="selectin"
    )
    freight_charges: Mapped[List[FreightChargeModel]] = relationship(
        "FreightChargeModel", back_populates="shipment", lazy="selectin"
    )
    documents: Mapped[List[DocumentModel]] = relationship(
        "DocumentModel", back_populates="shipment", lazy="selectin"
    )


class ContainerModel(BaseModel):
    """Shipping container unit entity."""

    __tablename__ = "containers"

    container_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    container_type: Mapped[str] = mapped_column(String(64), default="40HC", index=True, nullable=False)
    seal_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tare_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    max_payload_kg: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(64), default="in_transit", index=True, nullable=False)
    bol_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("bol_records.id", ondelete="SET NULL"), index=True, nullable=True
    )
    shipment_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("shipments.id", ondelete="SET NULL"), index=True, nullable=True
    )

    bol: Mapped[Optional[BOLModel]] = relationship("BOLModel", back_populates="containers", lazy="selectin")
    shipment: Mapped[Optional[ShipmentModel]] = relationship(
        "ShipmentModel", back_populates="containers", lazy="selectin"
    )
