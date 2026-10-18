from __future__ import annotations

from typing import Any
from datetime import datetime

from pydantic import BaseModel, Field


class PayloadMixin(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class GenericRecordCreate(PayloadMixin):
    id: str | None = None

    model_config = {
        "extra": "allow"
    }

class GenericRecordUpdate(PayloadMixin):
    model_config = {
        "extra": "allow"
    }


class BillOfLadingCreate(GenericRecordCreate):
    bol_number: str | None = None
    shipper_name: str | None = None
    consignee_name: str | None = None
    status: str | None = None


class BillOfLadingUpdate(GenericRecordUpdate):
    bol_number: str | None = None
    shipper_name: str | None = None
    consignee_name: str | None = None
    status: str | None = None


class InvoiceCreate(GenericRecordCreate):
    invoice_number: str | None = None
    customer_name: str | None = None
    status: str | None = None


class InvoiceUpdate(GenericRecordUpdate):
    invoice_number: str | None = None
    customer_name: str | None = None
    status: str | None = None


class LedgerEntryCreate(GenericRecordCreate):
    account_id: str | None = None
    account_type: str | None = None
    invoice_no: str | None = None
    bill_of_lading: str | None = None
    debit: float | None = None
    credit: float | None = None


class LedgerEntryUpdate(GenericRecordUpdate):
    account_id: str | None = None
    account_type: str | None = None
    invoice_no: str | None = None
    bill_of_lading: str | None = None
    debit: float | None = None
    credit: float | None = None
