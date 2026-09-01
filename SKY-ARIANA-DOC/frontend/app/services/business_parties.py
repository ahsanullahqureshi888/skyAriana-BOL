from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.models.models import BusinessParty


PARTY_TYPES = {"shipper", "notify_party", "consignee", "importer", "customer", "multi_role"}
BUSINESS_PARTY_ROLES = {"shipper", "exporter", "consignee", "importer", "buyer", "notify_party", "customer"}


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value).strip())
    return text or None


def normalize_phone(value: Any) -> str | None:
    value = clean_text(value)
    if not value:
        return None
    value = re.sub(r"^(?:TEL|PHONE(?: NO)?|MOBILE|WHATSAPP)\s*[:.]?\s*", "", value, flags=re.I)
    value = value.replace("â€“", "-").replace("â€”", "-")
    value = re.sub(r"[()\s-]+", "", value)
    if value.startswith("00"):
        value = "+" + value[2:]
    elif value and not value.startswith("+") and value.isdigit() and value.startswith(("93", "971", "91", "98")):
        value = "+" + value
    return value or None


def normalize_name(value: Any) -> str:
    text = clean_text(value) or ""
    text = text.upper()
    text = text.replace("&", " AND ")
    text = re.sub(r"\bM\s*/\s*S\.?\b", " ", text)
    text = re.sub(r"\bPVT\.?\s+LTD\.?\b", "PRIVATE LIMITED", text)
    text = re.sub(r"\bPRIVATE\s+LTD\.?\b", "PRIVATE LIMITED", text)
    text = re.sub(r"\bCO\.?\b", "COMPANY", text)
    text = re.sub(r"\bL\s*[.]?\s*L\s*[.]?\s*C\s*[.]?\b", "LLC", text)
    text = re.sub(r"\bF\s*[.]?\s*Z\s*[.]?\s*E\s*[.]?\b", "FZE", text)
    text = re.sub(r"\bF\s*[.]?\s*Z\s*[.]?\s*C\s*[.]?\s*O\s*[.]?\b", "FZCO", text)
    text = text.replace("GENERALTRADING", "GENERAL TRADING")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _normalised_values(values: Iterable[Any] | None) -> list[str]:
    result: list[str] = []
    for value in values or []:
        item = clean_text(value)
        if item and item not in result:
            result.append(item)
    return result


def _normalised_json_values(values: Iterable[Any] | None) -> list[Any]:
    result: list[Any] = []
    for value in values or []:
        if value is None or value == "":
            continue
        if value not in result:
            result.append(value)
    return result


def roles_for_record(data: dict[str, Any]) -> list[str]:
    raw_roles = data.get("roles") or []
    if isinstance(raw_roles, str):
        raw_roles = [raw_roles]
    roles = [clean_text(role) for role in raw_roles]
    roles = [role for role in roles if role in BUSINESS_PARTY_ROLES]
    party_type = clean_text(data.get("party_type"))
    if party_type in BUSINESS_PARTY_ROLES and party_type not in roles:
        roles.append(party_type)
    if party_type == "multi_role" and not roles:
        roles = ["customer"]
    return list(dict.fromkeys(roles))


def party_roles(party: BusinessParty) -> list[str]:
    roles = roles_for_record({"roles": party.roles or [], "party_type": party.party_type})
    return roles or [party.party_type]


def normalise_party_payload(data: dict[str, Any], *, party_type: str | None = None) -> dict[str, Any]:
    """Prepare an API or seed record without discarding source metadata."""
    result = dict(data)
    result["party_type"] = clean_text(party_type or result.get("party_type")) or "customer"
    display_name = clean_text(result.get("display_name") or result.get("canonical_name"))
    if not display_name:
        raise ValueError("Company name is required")
    result["canonical_name"] = clean_text(result.get("canonical_name") or display_name) or display_name
    result["display_name"] = display_name
    result["normalized_name"] = normalize_name(result.get("normalized_name") or display_name)
    result["roles"] = roles_for_record(result)
    if len(result["roles"]) > 1:
        result["party_type"] = "multi_role"
    for field in (
        "address_line1", "address_line2", "city", "state_region", "postal_code", "country", "country_code",
        "email", "trade_license_number", "tax_identification_number", "trn", "registration_number",
        "contact_person", "business_type", "website", "gstin", "iec", "pan", "fssai", "tin", "state_code",
        "notes", "source_name", "source_raw_text", "review_status", "import_batch_id",
    ):
        result[field] = clean_text(result.get(field))
    result["phone"] = normalize_phone(result.get("phone"))
    result["alternate_phones"] = [
        phone for phone in (normalize_phone(item) for item in result.get("alternate_phones") or [])
        if phone and phone != result["phone"]
    ]
    result["alternate_emails"] = _normalised_values(result.get("alternate_emails"))
    result["aliases"] = _normalised_values(result.get("aliases"))
    result["alternate_addresses"] = _normalised_values(result.get("alternate_addresses"))
    result["source_pages"] = sorted({int(page) for page in (result.get("source_pages") or []) if str(page).isdigit()})
    result["source_references"] = _normalised_values(result.get("source_references"))
    result["source_entries"] = _normalised_json_values(result.get("source_entries"))
    result["review_flags"] = _normalised_values(result.get("review_flags"))
    result["identifiers"] = {
        str(key): clean_text(value)
        for key, value in (result.get("identifiers") or {}).items()
        if clean_text(value)
    }
    # Keep identifier columns searchable while retaining the complete map.
    for key in ("gstin", "iec", "pan", "fssai", "tin", "trn", "state_code"):
        if not result.get(key) and result["identifiers"].get(key):
            result[key] = result["identifiers"][key]
        elif result.get(key):
            result["identifiers"].setdefault(key, result[key])
    result["identifier_provenance"] = _normalised_json_values(result.get("identifier_provenance"))
    result["field_provenance"] = result.get("field_provenance") or {}
    if not result.get("trade_license_number"):
        result["trade_license_number"] = result.get("iec") or result.get("registration_number")
    if not result.get("tax_identification_number"):
        result["tax_identification_number"] = result.get("pan") or result.get("tin")
    if result.get("review_flags") and not result.get("review_status"):
        result["review_status"] = "needs_review"
    result["review_status"] = result.get("review_status") or "verified_source"
    result["is_active"] = bool(result.get("is_active", True))
    result["is_archived"] = bool(result.get("is_archived", False))
    return result


def _party_identifier_map(value: BusinessParty | dict[str, Any]) -> dict[str, str]:
    if isinstance(value, BusinessParty):
        result = dict(value.identifiers or {})
        for key in ("gstin", "iec", "pan", "fssai", "tin", "trn", "state_code", "tax_identification_number", "trade_license_number", "registration_number"):
            item = getattr(value, key, None)
            if item:
                result.setdefault(key, item)
        return {key: str(item).strip().upper() for key, item in result.items() if item}
    result = dict(value.get("identifiers") or {})
    for key in ("gstin", "iec", "pan", "fssai", "tin", "trn", "state_code", "tax_identification_number", "trade_license_number", "registration_number"):
        item = value.get(key)
        if item:
            result.setdefault(key, item)
    return {key: str(item).strip().upper() for key, item in result.items() if item}


def party_to_snapshot(party: BusinessParty) -> dict[str, Any]:
    address_lines = [line for line in (party.address_line1, party.address_line2) if line]
    locality = ", ".join(item for item in (party.city, party.state_region, party.postal_code) if item)
    if locality:
        address_lines.append(locality)
    address = ", ".join(address_lines) if address_lines else None
    bank = party.bank_details or {}
    alternate_phones = party.alternate_phones or []
    identifiers = _party_identifier_map(party)
    return {
        "companyName": party.display_name or party.canonical_name,
        "contactPerson": party.contact_person,
        "address": address,
        "addressLine1": party.address_line1,
        "addressLine2": party.address_line2,
        "city": party.city,
        "state": party.state_region,
        "postalCode": party.postal_code,
        "country": party.country,
        "countryCode": party.country_code,
        "phone": party.phone,
        "altPhone": alternate_phones[0] if alternate_phones else None,
        "email": party.email,
        "taxNumber": party.trn or party.gstin or party.tax_identification_number or party.tin,
        "gstVatTrn": party.gstin or party.trn,
        "gstin": party.gstin,
        "iec": party.iec,
        "pan": party.pan,
        "fssai": party.fssai,
        "tin": party.tin,
        "trn": party.trn,
        "stateCode": party.state_code,
        "identifiers": identifiers,
        "licenseNumber": party.iec or party.trade_license_number,
        "importLicence": party.iec or party.trade_license_number,
        "website": party.website,
        "contactId": party.id,
        "partyId": party.id,
        "accountNumber": bank.get("accountNumber"),
        "bankName": bank.get("bankName"),
        "iban": bank.get("iban"),
        "swiftCode": bank.get("swiftCode"),
        "bankAddress": bank.get("bankAddress"),
        "notes": party.notes,
        "instructions": party.notes,
    }


def _merge_list(existing: Any, incoming: Any) -> list[Any]:
    result = list(existing or [])
    for value in incoming or []:
        if value and value not in result:
            result.append(value)
    return result


def _same_record(existing: BusinessParty, incoming: dict[str, Any]) -> bool:
    existing_ids = _party_identifier_map(existing)
    incoming_ids = _party_identifier_map(incoming)
    shared = set(existing_ids).intersection(incoming_ids)
    if any(existing_ids[key] == incoming_ids[key] for key in shared):
        return True
    if any(existing_ids[key] != incoming_ids[key] for key in shared):
        return False
    incoming_roles = set(incoming.get("roles") or [incoming.get("party_type")])
    existing_roles = set(party_roles(existing))
    name_matches = existing.normalized_name == incoming["normalized_name"]
    if not name_matches:
        aliases = [normalize_name(alias) for alias in (existing.aliases or [])]
        incoming_aliases = [normalize_name(alias) for alias in incoming.get("aliases") or []]
        name_matches = incoming["normalized_name"] in aliases or existing.normalized_name in incoming_aliases
    if not name_matches:
        return False
    if existing_roles.intersection(incoming_roles):
        return True
    address_match = normalize_name(" ".join(str(getattr(existing, field, "") or "") for field in ("address_line1", "address_line2", "city", "state_region", "country"))) == normalize_name(" ".join(str(incoming.get(field) or "") for field in ("address_line1", "address_line2", "city", "state_region", "country")))
    contacts = {existing.phone, existing.email, *(existing.alternate_phones or []), *(existing.alternate_emails or [])}
    incoming_contacts = {incoming.get("phone"), incoming.get("email"), *(incoming.get("alternate_phones") or []), *(incoming.get("alternate_emails") or [])}
    return bool((address_match and incoming.get("address_line1")) or contacts.intersection(incoming_contacts))


def find_matching_party(db: Session, incoming: dict[str, Any]) -> BusinessParty | None:
    candidates = db.query(BusinessParty).all()
    for candidate in candidates:
        if _same_record(candidate, incoming):
            return candidate
    return None


def merge_party_record(existing: BusinessParty, incoming: dict[str, Any], *, actor_id: int | None = None) -> bool:
    changed = False
    scalar_fields = (
        "canonical_name", "display_name", "normalized_name", "address_line1", "address_line2", "city",
        "state_region", "postal_code", "country", "country_code", "phone", "email", "trade_license_number",
        "tax_identification_number", "trn", "registration_number", "contact_person", "business_type", "website",
        "gstin", "iec", "pan", "fssai", "tin", "state_code", "notes", "source_name", "source_raw_text",
        "review_status", "import_batch_id",
    )
    for field in scalar_fields:
        incoming_value = incoming.get(field)
        if incoming_value and not getattr(existing, field):
            setattr(existing, field, incoming_value)
            changed = True
    current_roles = party_roles(existing)
    merged_roles = list(dict.fromkeys(current_roles + (incoming.get("roles") or [])))
    if merged_roles != (existing.roles or current_roles):
        existing.roles = merged_roles
        changed = True
    if len(merged_roles) > 1 and existing.party_type != "multi_role":
        existing.party_type = "multi_role"
        changed = True
    for field in ("alternate_phones", "alternate_emails", "aliases", "alternate_addresses", "source_pages", "source_references", "review_flags", "source_entries", "identifier_provenance"):
        merged = _merge_list(getattr(existing, field), incoming.get(field))
        if merged != (getattr(existing, field) or []):
            setattr(existing, field, merged)
            changed = True
    merged_identifiers = dict(existing.identifiers or {})
    for key, value in (incoming.get("identifiers") or {}).items():
        if value and not merged_identifiers.get(key):
            merged_identifiers[key] = value
    if merged_identifiers != (existing.identifiers or {}):
        existing.identifiers = merged_identifiers
        changed = True
    merged_provenance = dict(existing.field_provenance or {})
    for key, value in (incoming.get("field_provenance") or {}).items():
        if key not in merged_provenance:
            merged_provenance[key] = value
    if merged_provenance != (existing.field_provenance or {}):
        existing.field_provenance = merged_provenance
        changed = True
    if incoming.get("bank_details"):
        merged_bank = dict(existing.bank_details or {})
        for key, value in incoming["bank_details"].items():
            if value and not merged_bank.get(key):
                merged_bank[key] = value
        if merged_bank != (existing.bank_details or {}):
            existing.bank_details = merged_bank
            changed = True
    if incoming.get("review_flags") and existing.review_status != "needs_review":
        existing.review_status = "needs_review"
        changed = True
    if incoming.get("is_active") and not existing.is_active:
        existing.is_active = True
        changed = True
    if actor_id is not None:
        existing.updated_by = actor_id
    return changed


def create_party_from_payload(db: Session, payload: dict[str, Any], *, actor_id: int | None = None) -> BusinessParty:
    normalized = normalise_party_payload(payload)
    party = BusinessParty(**normalized, created_by=actor_id, updated_by=actor_id)
    db.add(party)
    db.flush()
    return party


def _source_counts(records: list[dict[str, Any]]) -> tuple[int, int]:
    pages = {page for record in records for page in record.get("source_pages", []) if isinstance(page, int)}
    rows = sum(len(record.get("source_entries") or []) for record in records)
    return (max(pages) if pages else 0, rows)


def import_seed_records(
    db: Session,
    records: list[dict[str, Any]],
    *,
    actor_id: int | None = None,
    source_name: str = "ALL-SHIPPERS--.pdf",
    source_pages_processed: int | None = None,
    source_rows_processed: int | None = None,
    import_batch_id: str | None = None,
) -> dict[str, Any]:
    source_pages, source_rows = _source_counts(records)
    report: dict[str, Any] = {
        "sourceName": source_name,
        "sourcePagesProcessed": source_pages_processed or source_pages,
        "sourceRowsProcessed": source_rows_processed or source_rows,
        "sourceRecords": len(records),
        "distinctConsignees": len(records) if any(record.get("party_type") == "consignee" for record in records) else None,
        "shippersInserted": 0,
        "notifyPartiesInserted": 0,
        "consigneesInserted": 0,
        "existingBusinessPartiesMatched": 0,
        "rolesAdded": 0,
        "recordsUpdated": 0,
        "recordsSkipped": 0,
        "duplicatesMerged": 0,
        "aliasesCreated": 0,
        "alternateAddressesCreated": 0,
        "alternatePhonesCreated": 0,
        "alternateEmailsCreated": 0,
        "recordsFlaggedForReview": 0,
        "inserted": [],
        "updated": [],
        "skipped": [],
        "flagged": [],
    }
    for raw_record in records:
        raw_record = dict(raw_record)
        if import_batch_id:
            raw_record["import_batch_id"] = import_batch_id
        incoming = normalise_party_payload(raw_record)
        existing = find_matching_party(db, incoming)
        if existing:
            before_roles = set(party_roles(existing))
            before_aliases = len(existing.aliases or [])
            before_addresses = len(existing.alternate_addresses or [])
            before_phones = len(existing.alternate_phones or [])
            before_emails = len(existing.alternate_emails or [])
            changed = merge_party_record(existing, incoming, actor_id=actor_id)
            report["duplicatesMerged"] += 1
            report["existingBusinessPartiesMatched"] += 1
            report["rolesAdded"] += len(set(party_roles(existing)) - before_roles)
            report["aliasesCreated"] += max(0, len(existing.aliases or []) - before_aliases)
            report["alternateAddressesCreated"] += max(0, len(existing.alternate_addresses or []) - before_addresses)
            report["alternatePhonesCreated"] += max(0, len(existing.alternate_phones or []) - before_phones)
            report["alternateEmailsCreated"] += max(0, len(existing.alternate_emails or []) - before_emails)
            if changed:
                report["recordsUpdated"] += 1
                report["updated"].append({"id": existing.id, "name": existing.display_name})
            else:
                report["recordsSkipped"] += 1
                report["skipped"].append({"id": existing.id, "name": existing.display_name})
            if incoming.get("review_flags"):
                report["recordsFlaggedForReview"] += 1
                report["flagged"].append({"id": existing.id, "name": existing.display_name, "flags": incoming["review_flags"]})
            continue
        party = BusinessParty(**incoming, created_by=actor_id, updated_by=actor_id)
        db.add(party)
        db.flush()
        report["consigneesInserted" if "consignee" in (incoming.get("roles") or []) else "shippersInserted" if party.party_type == "shipper" else "notifyPartiesInserted" if party.party_type == "notify_party" else "recordsSkipped"] += 1
        report["inserted"].append({"id": party.id, "partyType": party.party_type, "roles": incoming.get("roles", []), "name": party.display_name})
        report["aliasesCreated"] += len(incoming.get("aliases") or [])
        report["alternateAddressesCreated"] += len(incoming.get("alternate_addresses") or [])
        report["alternatePhonesCreated"] += len(incoming.get("alternate_phones") or [])
        report["alternateEmailsCreated"] += len(incoming.get("alternate_emails") or [])
        if incoming.get("review_flags"):
            report["recordsFlaggedForReview"] += 1
            report["flagged"].append({"id": party.id, "name": party.display_name, "flags": incoming["review_flags"]})
    return report


def archive_party(party: BusinessParty, *, actor_id: int | None = None) -> None:
    party.is_archived = True
    party.is_active = False
    party.archived_at = datetime.utcnow()
    party.archived_by = actor_id
    party.updated_by = actor_id


def restore_party(party: BusinessParty, *, actor_id: int | None = None) -> None:
    party.is_archived = False
    party.is_active = True
    party.archived_at = None
    party.archived_by = None
    party.updated_by = actor_id
