from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)
    role: str = "Viewer"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    password: str = Field(min_length=8)


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    name: Optional[str] = None


class CustomerRead(CustomerBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BankAccountBase(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    currency: str = "USD"
    opening_balance: float = 0


class BankAccountCreate(BankAccountBase):
    pass


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    currency: Optional[str] = None
    opening_balance: Optional[float] = None


class BankAccountRead(BankAccountBase):
    id: int
    current_balance: float
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionBase(BaseModel):
    receipt_no: str
    date: date
    type: str = "Received"
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    subject: str
    amount: float
    currency: str
    equivalent_amount: float = 0
    equivalent_currency: str = "USD"
    payment_method: str
    bank_account_id: Optional[int] = None
    receiver_name: Optional[str] = None
    description: Optional[str] = None
    status: str = "Completed"


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    receipt_no: Optional[str] = None
    date: Optional[date] = None
    type: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    subject: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    equivalent_amount: Optional[float] = None
    equivalent_currency: Optional[str] = None
    payment_method: Optional[str] = None
    bank_account_id: Optional[int] = None
    receiver_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TransactionRead(TransactionBase):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    attachment_path: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LedgerRead(BaseModel):
    id: int
    transaction_id: int
    date: date
    description: str
    debit: float
    credit: float
    balance: float

    model_config = {"from_attributes": True}


class AttachmentRead(BaseModel):
    id: int
    transaction_id: Optional[int]
    file_name: str
    file_path: str
    file_type: Optional[str]
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class AuditLogRead(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: Optional[str] = None
    action: str
    table_name: str
    record_id: Optional[int]
    description: str
    ip_address: Optional[str]
    device_info: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SettingsRead(BaseModel):
    id: int
    company_name: str
    logo_path: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    receipt_footer: Optional[str]
    default_currency: str
    receipt_prefix: str
    auto_backup: bool
    last_backup_at: Optional[str]
    next_receipt_number: int

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_path: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    receipt_footer: Optional[str] = None
    default_currency: Optional[str] = None
    receipt_prefix: Optional[str] = None
    auto_backup: Optional[bool] = None
    last_backup_at: Optional[str] = None
    next_receipt_number: Optional[int] = None



class DashboardSummary(BaseModel):
    total_received: float
    total_paid: float
    total_balance: float
    todays_transactions: int
    monthly_transactions: int
    currency_totals: dict[str, float]


class ExtractedReceipt(BaseModel):
    receipt_no: Optional[str] = None
    date: Optional[date] = None
    customer_name: Optional[str] = None
    subject: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    equivalent_amount: Optional[float] = None
    equivalent_currency: Optional[str] = None
    payment_method: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_id: Optional[int] = None
    receiver_name: Optional[str] = None
    description: Optional[str] = None
    raw_text: str = ""
    temp_image_path: Optional[str] = None
    page_number: Optional[int] = None
    is_duplicate: bool = False
    duplicate_reason: Optional[str] = None



class OCRTransactionSave(BaseModel):
    receipt_no: str
    date: date
    type: str = "Received"
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    subject: str
    amount: float
    currency: str
    equivalent_amount: float = 0
    equivalent_currency: str = "USD"
    payment_method: str
    bank_account_id: Optional[int] = None
    receiver_name: Optional[str] = None
    description: Optional[str] = None
    status: str = "Completed"
    temp_image_path: Optional[str] = None


class OCRBatchSaveRequest(BaseModel):
    transactions: list[OCRTransactionSave]


class OCRBatchSaveResponse(BaseModel):
    imported_count: int
    skipped_count: int
    failed_count: int
    errors: list[str] = []
