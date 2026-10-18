from __future__ import annotations

from backend.database import Base
from backend.models.base import BaseModel, generate_uuid
from backend.models.parties import (
    AgentModel,
    ClientModel,
    CompanyModel,
    ConsigneeModel,
    CustomerModel,
    NotifyPartyModel,
    ShipperModel,
    SupplierModel,
)
from backend.models.logistics import (
    BOLItemModel,
    BOLModel,
    CommodityModel,
    ContainerModel,
    DriverModel,
    LocationModel,
    PortModel,
    RouteModel,
    ShipmentModel,
    TruckModel,
)
from backend.models.accounting import (
    DiscountModel,
    ExpenseModel,
    FreightChargeModel,
    InvoiceItemModel,
    InvoiceModel,
    JournalEntryModel,
    JournalLineModel,
    LedgerAccountModel,
    LedgerModel,
    PaymentModel,
)
from backend.models.documents import (
    AttachmentModel,
    DocumentModel,
    PackingListModel,
    PhytosanitaryCertificateModel,
    ReportModel,
    TransitPaperModel,
)
from backend.models.system import (
    AuditLogModel,
    BackupModel,
    SequenceCounterModel,
    SettingModel,
    UserModel,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",
    "generate_uuid",
    # Parties
    "CompanyModel",
    "ShipperModel",
    "ConsigneeModel",
    "NotifyPartyModel",
    "AgentModel",
    "CustomerModel",
    "ClientModel",
    "SupplierModel",
    # Logistics
    "BOLModel",
    "BOLItemModel",
    "ShipmentModel",
    "ContainerModel",
    "TruckModel",
    "DriverModel",
    "RouteModel",
    "PortModel",
    "LocationModel",
    "CommodityModel",
    # Accounting
    "LedgerAccountModel",
    "LedgerModel",
    "JournalEntryModel",
    "JournalLineModel",
    "InvoiceModel",
    "InvoiceItemModel",
    "PaymentModel",
    "ExpenseModel",
    "FreightChargeModel",
    "DiscountModel",
    # Documents
    "PackingListModel",
    "TransitPaperModel",
    "PhytosanitaryCertificateModel",
    "DocumentModel",
    "AttachmentModel",
    "ReportModel",
    # System
    "UserModel",
    "SettingModel",
    "AuditLogModel",
    "BackupModel",
    "SequenceCounterModel",
]
