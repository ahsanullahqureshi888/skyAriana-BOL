from __future__ import annotations

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None


class PaginatedList(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int = 1
    page_size: int = 50


# --- BOL Schemas ---
class BOLBase(BaseModel):
    bol_number: str
    origin: str
    border_station: str  # Islam Qala, Torghundi, Hairatan, Spin Boldak
    driver_name: str
    father_name: Optional[str] = None
    driver_rent: float = 0.0
    carton_count: int = 0
    gross_weight_kg: float = 0.0
    net_weight_kg: float = 0.0
    cargo_description: Optional[str] = None
    destination: Optional[str] = None
    status: str = "active"
    freight_fee: float = 0.0
    demurrage_fee: float = 0.0
    documentation_fee: float = 0.0
    currency: str = "USD"  # USD vs AFN
    exchange_rate: float = 1.0


class BOLCreate(BOLBase):
    pass


class BOLResponse(BOLBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: str
    updated_at: str


# --- Ledger Schemas ---
class LedgerBase(BaseModel):
    account_id: str
    account_name: str
    transaction_date: str
    description: str
    debit: float = 0.0
    credit: float = 0.0
    balance: float = 0.0
    currency: str = "USD"  # USD or AFN
    fee_type: Optional[str] = None  # freight, demurrage, documentation, general
    exchange_rate: float = 1.0
    reference_id: Optional[str] = None


class LedgerCreate(LedgerBase):
    pass


class LedgerResponse(LedgerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: str
    updated_at: str


class LedgerInvarianceCheckResponse(BaseModel):
    account_id: str
    total_debit: float
    total_credit: float
    calculated_net_balance: float
    recorded_balance: float
    is_valid: bool
    formula: str = "Net Balance = Total Debit - Total Credit"


# --- Company Schemas ---
class CompanyBase(BaseModel):
    company_name: str
    code: str
    tax_number: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyResponse(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: str
    updated_at: str


# --- Customer Schemas ---
class CustomerBase(BaseModel):
    customer_name: str
    phone: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: str
    updated_at: str


# --- Shipment Schemas ---
class ShipmentBase(BaseModel):
    tracking_number: str
    bol_number: Optional[str] = None
    origin: str
    destination: str
    status: str = "in_transit"
    carrier: Optional[str] = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentResponse(ShipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str | int
    created_at: str
    updated_at: str


# --- Report Schemas ---
class ReportRequest(BaseModel):
    report_type: str  # ledger, bol_summary, financial, tax
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    format: str = "json"  # json, excel, pdf


class ReportResponse(BaseModel):
    report_id: str
    report_type: str
    status: str
    download_url: Optional[str] = None
    summary: dict = Field(default_factory=dict)


# --- Backup Schemas ---
class BackupCreateRequest(BaseModel):
    note: Optional[str] = None
    include_documents: bool = False


class BackupResponse(BaseModel):
    backup_id: str
    filename: str
    size_bytes: int
    created_at: str
    checksum: str
    status: str
