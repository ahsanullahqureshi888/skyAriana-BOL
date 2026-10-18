from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class PartySearchItem(BaseModel):
    """Lightweight party representation for auto-complete selectors."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str  # SHIPPER, CONSIGNEE, NOTIFY_PARTY, CUSTOMER, AGENT, SUPPLIER
    code: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "Afghanistan"
