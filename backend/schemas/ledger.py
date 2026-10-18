from __future__ import annotations

from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LedgerEntryItem(BaseModel):
    """Ledger transaction row with exact serialized money strings and running balance."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    account_name: str
    transaction_date: str
    description: str
    debit: str
    credit: str
    balance: str
    currency: str = "USD"
    fee_type: Optional[str] = None
    exchange_rate: str = "1.0000"
    reference_id: Optional[str] = None
    bol_id: Optional[str] = None
    bol_number: Optional[str] = None
    invoice_id: Optional[str] = None
    revision: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class LedgerPageResponse(BaseModel):
    """Server-driven ledger response containing aggregate summary and paginated items."""
    opening_balance: str
    total_debit: str
    total_credit: str
    closing_balance: str
    items: List[LedgerEntryItem]
    page: int
    page_size: int
    total: int
    pages: int
    currency: str = "USD"


class LedgerAccountSummary(BaseModel):
    """Summary of a ledger account chart item."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_code: str
    account_name: str
    account_type: str
    currency: str = "USD"
    current_balance: str
    entry_count: int = 0


class LedgerExportRequest(BaseModel):
    """Request payload for server-side asynchronous or synchronous ledger export."""
    account_id: Optional[str] = None
    company_id: Optional[str] = None
    party_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    currency: str = "USD"
    export_format: str = "csv"  # csv or excel


class LedgerExportResponse(BaseModel):
    """Status and download url for ledger export."""
    job_id: str
    status: str  # completed or processing
    filename: str
    download_url: Optional[str] = None
    record_count: int = 0
