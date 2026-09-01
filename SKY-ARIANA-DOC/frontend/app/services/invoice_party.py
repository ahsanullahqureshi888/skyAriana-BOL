from __future__ import annotations

import re
from typing import Any, Mapping


PARTY_DETAIL_FIELDS = (
    "companyName",
    "contactPerson",
    "address",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "phone",
    "altPhone",
    "email",
    "taxNumber",
    "licenseNumber",
    "website",
    "gstVatTrn",
    "importLicence",
    "accountNumber",
    "bankName",
    "iban",
    "swiftCode",
    "routingCode",
    "bankAddress",
    "notes",
    "instructions",
)


_STALE_NOTIFY_FRAGMENT = re.compile(r"\bNOTIFY\s+PARTY\s*:\s*", re.IGNORECASE)
_SHIPPER_CONSIGNEE_FIELDS = (
    "address",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "phone",
    "altPhone",
    "email",
    "taxNumber",
    "licenseNumber",
    "website",
    "notes",
    "instructions",
)


def _without_stale_notify_fragment(value: Any) -> str:
    """Remove legacy Notify Party text that was accidentally pasted into another party."""
    text = str(value or "").strip()
    marker = _STALE_NOTIFY_FRAGMENT.search(text)
    return text[:marker.start()].rstrip(" ,;.-") if marker else text


def normalize_party_snapshot(value: Any, *, strip_stale_notify_fragment: bool = False) -> dict[str, Any] | None:
    """Return a clean invoice snapshot, or None when every business field is empty."""
    if value is None:
        return None
    if hasattr(value, "model_dump"):
        data = value.model_dump()
    elif isinstance(value, Mapping):
        data = dict(value)
    else:
        return None

    if not any(str(data.get(field) or "").strip() for field in PARTY_DETAIL_FIELDS):
        return None

    normalized = dict(data)
    if strip_stale_notify_fragment:
        for field in _SHIPPER_CONSIGNEE_FIELDS:
            if field in normalized:
                normalized[field] = _without_stale_notify_fragment(normalized.get(field))

    primary_address = str(normalized.get("addressLine1") or normalized.get("address") or "").strip()
    normalized["address"] = primary_address
    normalized["addressLine1"] = primary_address
    normalized["notes"] = str(normalized.get("notes") or normalized.get("instructions") or "").strip()
    return normalized
