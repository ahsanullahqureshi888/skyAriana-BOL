"""Extract, normalize, and review consignee records from the supplied PDF.

The PDF is a source document, not a trusted database export.  This script keeps
the original row/column values alongside normalized fields so an operator can
review OCR and identifier decisions later.

Examples (from the backend directory)::

    python scripts/extract_consignees.py --inspect
    python scripts/extract_consignees.py --write-seed
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = Path(r"C:\Users\HomePC\OneDrive\Desktop\CONSIGNEE - DATA.pdf")
DEFAULT_SEED = BACKEND_ROOT / "data" / "consignees_seed.json"

try:
    import pdfplumber
except ImportError as exc:  # pragma: no cover - the bundled runtime supplies this dependency.
    raise SystemExit("pdfplumber is required. Run with the bundled workspace Python runtime.") from exc


OCR_REPLACEMENTS = {
    "COMP ANY": "COMPANY",
    "COMPNAY": "COMPANY",
    "TRADNING": "TRADING",
    "OEVERSRSS": "OVERSEAS",
    "lNDlA": "INDIA",
    "DLEHI": "DELHI",
    "FASSI": "FSSAI",
    "FASSAI": "FSSAI",
    "FSAI": "FSSAI",
    "FASST": "FSSAI",
}

COUNTRY_ALIASES = {
    "INDIA": "IN",
    "INDIAN": "IN",
    "UAE": "AE",
    "UNITED ARAB EMIRATES": "AE",
    "DUBAI": "AE",
    "INDONESIA": "ID",
    "CANADA": "CA",
    "UNITED KINGDOM": "GB",
    "UK": "GB",
    "AFGHANISTAN": "AF",
}

EMAIL_RE = re.compile(r"[A-Z0-9._%+\-]+(?:\s+[A-Z0-9._%+\-]+){0,2}\s*@\s*[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)
EMAIL_COMPACT_RE = re.compile(r"[A-Z0-9._%+\-]+\s*@\s*[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?:\+|00)\s*\d[\d ()\-]{6,}\d|\b\d[\d ()\-]{8,}\d\b")
IDENTIFIER_LABELS = re.compile(
    r"\b(?:GST(?:IN)?(?:\s*(?:NO|NUMBER|UIN))?|IEC(?:\s*(?:NO|NUMBER|CODE))?|PAN(?:\s*(?:NO|NUMBER))?|F(?:SSAI|ASSAI|ASSI|SAI|ASST)(?:\s*(?:NO|NUMBER|LICENCE|LICENSE))?|TIN(?:\s*(?:NO|NUMBER))?|TRN(?:\s*(?:NO|NUMBER))?|(?:TAX|VAT)(?:\s*(?:NO|NUMBER|ID))?|STATE\s*CODE)\b",
    re.I,
)
BOUNDARY_LABELS = re.compile(
    r"\b(?:GST(?:IN)?|IEC|PAN|F(?:SSAI|ASSAI|ASSI|SAI|ASST)|TIN|TRN|TAX|VAT|STATE\s*CODE|PHONE|PHNO|PH|TEL|MOBILE|CONTACT(?:\s*NO)?|EMAIL(?:\s*(?:ID|ADDRESS))?|E[- ]?MAIL|ATTN|KIND\s+ATTN|WEB(?:SITE)?)\b",
    re.I,
)
PHONE_LABELS = re.compile(r"\b(?:PHONE|PHNO|PH|TEL|MOBILE|CONTACT(?:\s*NO)?|WHATSAPP)\b\s*(?:NO)?\s*[:.]?\s*", re.I)
EMAIL_LABELS = re.compile(r"\b(?:EMAIL(?:\s*(?:ID|ADDRESS))?|E[- ]?MAIL)\b\s*[:.]?\s*", re.I)
SOURCE_BOUNDARY_RE = re.compile(r"(?<=[A-Z0-9])(?=(?:GSTIN|GST|IEC|PAN|FSSAI|FASSAI|FASSI|FSAI|FASST|TIN|TRN|TAXNO|PHONE|PHNO|EMAIL|CONTACT\s*NO)\b)", re.I)


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    value = unicodedata.normalize("NFKC", str(value)).replace("\xa0", " ")
    value = value.replace("\u00e2\u20ac\u201c", "-").replace("\u00e2\u20ac\u201d", "-").replace("\u00e2\u20ac\u2122", "'")
    value = value.replace("\u00c2\u00b7", "-").replace("\u00c2", " ")
    value = value.replace("â€“", "-").replace("â€”", "-").replace("â€™", "'")
    return re.sub(r"\s+", " ", value).strip()


def clean_ocr_name(value: str) -> str:
    value = clean_text(value)
    for source, replacement in OCR_REPLACEMENTS.items():
        value = re.sub(rf"\b{re.escape(source)}\b", replacement, value, flags=re.I)
    return value


def normalize_name(value: str) -> str:
    text = clean_ocr_name(value).upper().replace("&", " AND ")
    text = re.sub(r"\bM\s*/\s*S\.?\b", " ", text)
    text = re.sub(r"\bPVT\.?\s+LTD\.?\b", "PRIVATE LIMITED", text)
    text = re.sub(r"\bPRIVATE\s+LTD\.?\b", "PRIVATE LIMITED", text)
    text = re.sub(r"\bCO\.?\b", "COMPANY", text)
    text = re.sub(r"\bL\s*[.]?\s*L\s*[.]?\s*C\s*[.]?\b", "LLC", text)
    text = re.sub(r"\bF\s*[.]?\s*Z\s*[.]?\s*E\s*[.]?\b", "FZE", text)
    text = re.sub(r"\bF\s*[.]?\s*Z\s*[.]?\s*C\s*[.]?\s*O\s*[.]?\b", "FZCO", text)
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_email(value: str) -> str | None:
    value = clean_text(value).lower().replace("mailto:", "")
    value = re.sub(r"\s+", "", value)
    if re.fullmatch(r"[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}", value):
        return value
    return None


def normalize_phone(value: str) -> str | None:
    value = clean_text(value)
    value = re.sub(r"^(?:TEL|PHONE(?: NO)?|MOBILE|WHATSAPP)\s*[:.]?\s*", "", value, flags=re.I)
    value = re.sub(r"[()\s-]+", "", value)
    if value.startswith("00"):
        value = "+" + value[2:]
    elif value.isdigit() and value.startswith(("91", "971", "93", "62", "44", "1")):
        value = "+" + value
    return value if len(re.sub(r"\D", "", value)) >= 7 else None


def distinct(values: Iterable[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        value = clean_text(value)
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def identifier_value(value: str) -> str:
    value = clean_text(value).rstrip(".,;:|")
    value = re.sub(r"\s+", "", value)
    return value.upper()


def line_values(details: list[str]) -> list[str]:
    lines: list[str] = []
    for detail in details:
        for line in re.split(r"[\r\n|]+", detail or ""):
            line = clean_text(line)
            line = SOURCE_BOUNDARY_RE.sub(" ", line)
            if line and line not in lines:
                lines.append(line)
    return lines


def extract_emails(text: str) -> tuple[list[str], bool]:
    labelled = EMAIL_LABELS.split(text)
    candidate_texts = labelled[1:] if len(labelled) > 1 else [text]
    raw_matches: list[str] = []
    for candidate in candidate_texts:
        raw_matches.extend((EMAIL_RE if len(labelled) > 1 else EMAIL_COMPACT_RE).findall(candidate))
    if not raw_matches and len(labelled) == 1:
        raw_matches = EMAIL_COMPACT_RE.findall(text)
    normalized: list[str] = []
    uncertain = False
    for match in raw_matches:
        value = normalize_email(match)
        if value:
            if value not in normalized:
                normalized.append(value)
        else:
            uncertain = True
    if "@" in text and not normalized:
        uncertain = True
    return normalized, uncertain


def extract_phones(lines: list[str]) -> list[str]:
    phones: list[str] = []
    for line in lines:
        matches = list(PHONE_LABELS.finditer(line))
        if not matches:
            continue
        for index, marker in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(line)
            segment = line[marker.end():end]
            # E-mail and compliance fields are common immediately after a
            # phone number in the source spreadsheet/PDF.
            segment = BOUNDARY_LABELS.split(segment, maxsplit=1)[0]
            for match in PHONE_RE.findall(segment):
                normalized = normalize_phone(match)
                if normalized and normalized not in phones:
                    phones.append(normalized)
    return phones


def extract_identifiers(lines: list[str]) -> tuple[dict[str, str], list[str], list[dict[str, Any]]]:
    identifiers: dict[str, str] = {}
    flags: list[str] = []
    provenance: list[dict[str, Any]] = []
    for line in lines:
        matches = list(IDENTIFIER_LABELS.finditer(line))
        for index, match in enumerate(matches):
            next_boundary = BOUNDARY_LABELS.search(line, match.end())
            next_start = next_boundary.start() if next_boundary else len(line)
            raw_value = clean_text(line[match.end():next_start])
            if "@" in raw_value:
                raw_value = " ".join(part for part in raw_value.split() if "@" not in part)
            value = identifier_value(raw_value)
            value = value.strip(" -/:;,.\t")
            label = re.sub(r"[^A-Z]", "", match.group(0).upper())
            if label.startswith("GST"):
                identifier_type = "gstin"
            elif label.startswith("IEC"):
                identifier_type = "iec"
            elif label.startswith("PAN"):
                identifier_type = "pan"
            # The source PDF contains several OCR variants (FSSAI, FASSI,
            # FSAI and FASST).  They all represent the Indian food licence.
            elif label.startswith("F"):
                identifier_type = "fssai"
            elif label.startswith("TIN"):
                identifier_type = "tin"
            elif label.startswith("TRN"):
                identifier_type = "trn"
            elif label.startswith("STATE"):
                identifier_type = "state_code"
            else:
                identifier_type = "tax_number"
            if not value or len(value) < 3:
                continue
            # A delimiter can separate two values without a repeated label.
            value = re.split(r"\s{2,}|[,;|/]\s*", value, maxsplit=1)[0].strip()
            if identifier_type in identifiers and identifiers[identifier_type] != value:
                flags.append(f"conflicting_{identifier_type}")
                provenance.append({"field": identifier_type, "originalValue": value, "confidence": "low", "requiresReview": True})
                continue
            identifiers[identifier_type] = value
            label_upper = re.sub(r"\s+", "", match.group(0).upper())
            ambiguous = label_upper.startswith(("FASSI", "FSAI", "FASST")) or "�" in raw_value or "?" in raw_value
            if ambiguous:
                flags.append(f"uncertain_{identifier_type}")
            provenance.append({"field": identifier_type, "originalValue": value, "normalizedValue": value, "confidence": "medium" if ambiguous else "high", "requiresReview": ambiguous})
    return identifiers, distinct(flags), provenance


def country_for(lines: list[str]) -> tuple[str | None, str | None]:
    joined = " ".join(lines).upper()
    for display, code in COUNTRY_ALIASES.items():
        if re.search(rf"\b{re.escape(display)}\b", joined) or display in {"INDIA", "UAE"} and display in joined:
            return display.title() if display != "UAE" else "United Arab Emirates", code
    return None, None


def address_lines(lines: list[str], company_name: str) -> list[str]:
    result: list[str] = []
    for line in lines:
        # The source repeats the company name at the start of the detail cell.
        line = re.sub(rf"^\s*{re.escape(company_name)}\s*", "", line, count=1, flags=re.I)
        line = re.sub(rf"^\s*{re.escape(clean_ocr_name(company_name))}\s*", "", line, count=1, flags=re.I)
        if "@" in line:
            line = EMAIL_LABELS.split(line, maxsplit=1)[0]
        line = BOUNDARY_LABELS.split(line, maxsplit=1)[0]
        line = re.sub(r"^(?:ADD(?:RESS)?|URBAN\s+OFFICE)\s*[:.\-]?\s*", "", line, flags=re.I)
        if not line:
            continue
        # Detail columns often repeat the legal name; keep it out of address fields.
        if len(result) == 0 and normalize_name(line) in {"", "ADDRESS", "DETAILS"}:
            continue
        if line not in result:
            result.append(line)
    return result[:5]


def field_provenance(name: str, identifiers: dict[str, str], identifier_sources: list[dict[str, Any]], email_review: bool, source_pages: list[int]) -> dict[str, Any]:
    result: dict[str, Any] = {
        "display_name": {"originalValue": name, "normalizedValue": clean_ocr_name(name), "confidence": "high", "requiresReview": clean_ocr_name(name) != name, "sourcePages": source_pages},
    }
    for item in identifier_sources:
        result[item["field"]] = {**item, "sourcePages": source_pages}
    if email_review:
        result["email"] = {"originalValue": "email-like source text", "confidence": "low", "requiresReview": True, "sourcePages": source_pages}
    return result


def parse_row(page_number: int, row: list[Any]) -> dict[str, Any] | None:
    if not row or not re.fullmatch(r"\s*\d+\s*", str(row[0] or "")):
        return None
    original_name = clean_text(row[1] if len(row) > 1 else "")
    if not original_name:
        return None
    columns = [clean_text(value) for value in row]
    details = columns[2:]
    lines = line_values(details)
    identifiers, identifier_flags, identifier_sources = extract_identifiers(lines)
    emails, email_review = extract_emails("\n".join(lines))
    phones = extract_phones(lines)
    country, country_code = country_for(lines)
    if not country and {"gstin", "iec", "pan", "fssai"}.intersection(identifiers):
        # These identifiers belong to India's statutory systems. This is more
        # reliable than a country word that may be omitted by a wrapped row.
        country, country_code = "India", "IN"
    address = address_lines(lines, original_name)
    address_text = ", ".join(address) if address else None
    postal_match = re.search(r"\b\d{5,6}\b", address_text or "")
    postal_code = postal_match.group(0) if postal_match else None
    if postal_code:
        address_text = re.sub(rf"[\s,\-]*{re.escape(postal_code)}", "", address_text or "", count=1).strip(" ,-")
    contact_person = None
    for line in lines:
        match = re.search(r"(?:CONTACT\s+PERSON|KIND\s+ATTN|ATTN|CONTACT)\s*[:\-]\s*(.+)$", line, re.I)
        if match:
            contact_person = clean_text(match.group(1))
            break
    display_name = clean_ocr_name(original_name)
    flags = list(identifier_flags)
    if display_name != original_name:
        flags.append("ocr_name_normalized")
    if email_review:
        flags.append("invalid_or_uncertain_email")
    if not country:
        flags.append("unrecognized_country")
    raw_text = "\n".join(columns[1:])
    source_entry = {
        "sourcePage": page_number,
        "sourceRow": int(str(row[0]).strip()),
        "originalName": original_name,
        "rawColumns": columns[1:],
        "rawText": raw_text,
    }
    return {
        "party_type": "consignee",
        "roles": ["consignee"],
        "canonical_name": display_name,
        "display_name": display_name,
        "normalized_name": normalize_name(display_name),
        "aliases": [original_name] if original_name != display_name else [],
        "address_line1": address_text,
        "address_line2": None,
        "alternate_addresses": [],
        "city": None,
        "state_region": None,
        "postal_code": postal_code,
        "country": country,
        "country_code": country_code,
        "phone": phones[0] if phones else None,
        "alternate_phones": phones[1:],
        "email": emails[0] if emails else None,
        "alternate_emails": emails[1:],
        "contact_person": contact_person,
        "business_type": None,
        "identifiers": identifiers,
        "identifier_provenance": identifier_sources,
        "gstin": identifiers.get("gstin"),
        "iec": identifiers.get("iec"),
        "pan": identifiers.get("pan"),
        "fssai": identifiers.get("fssai"),
        "tin": identifiers.get("tin"),
        "trn": identifiers.get("trn"),
        "state_code": identifiers.get("state_code"),
        "trade_license_number": identifiers.get("iec") or identifiers.get("registration_number"),
        "tax_identification_number": identifiers.get("pan") or identifiers.get("tin") or identifiers.get("tax_number"),
        "registration_number": identifiers.get("registration_number"),
        "source_name": "CONSIGNEE - DATA.pdf",
        "source_pages": [page_number],
        "source_references": [f"page {page_number}, row {int(str(row[0]).strip())}"],
        "source_raw_text": raw_text,
        "source_entries": [source_entry],
        "field_provenance": field_provenance(display_name, identifiers, identifier_sources, email_review, [page_number]),
        "review_flags": distinct(flags),
        "review_status": "needs_review" if flags else "verified_source",
        "is_active": True,
        "is_archived": False,
    }


def identifier_map(record: dict[str, Any]) -> dict[str, str]:
    return {key: value for key, value in (record.get("identifiers") or {}).items() if value}


def address_key(record: dict[str, Any]) -> str:
    return normalize_name(" ".join(str(record.get(field) or "") for field in ("address_line1", "address_line2", "city", "state_region", "country")))


def contact_keys(record: dict[str, Any]) -> set[str]:
    return {value for value in [record.get("phone"), record.get("email"), *(record.get("alternate_phones") or []), *(record.get("alternate_emails") or [])] if value}


def merge_values(existing: list[Any], incoming: Iterable[Any]) -> list[Any]:
    result = list(existing or [])
    for value in incoming:
        if value and value not in result:
            result.append(value)
    return result


def can_merge(existing: dict[str, Any], incoming: dict[str, Any]) -> tuple[bool, list[str]]:
    left_ids = identifier_map(existing)
    right_ids = identifier_map(incoming)
    shared = set(left_ids).intersection(right_ids)
    if any(left_ids[key] == right_ids[key] for key in shared):
        return True, []
    if shared and any(left_ids[key] != right_ids[key] for key in shared):
        return False, [f"conflicting_{key}" for key in shared]
    if existing.get("normalized_name") != incoming.get("normalized_name"):
        return False, []
    # Same legal name without identifiers is safe to consolidate.  When both
    # rows carry different identifiers, preserve both until reviewed.
    if left_ids and right_ids and left_ids != right_ids:
        return False, [f"conflicting_{key}" for key in set(left_ids).intersection(right_ids) if left_ids[key] != right_ids[key]] or ["conflicting_identifier"]
    if not left_ids or not right_ids:
        # Consolidate a sparse duplicate of the same exact legal name. Rows
        # with two populated but conflicting identifier sets remain separate.
        return True, []
    if address_key(existing) == address_key(incoming) or contact_keys(existing).intersection(contact_keys(incoming)):
        return True, []
    return not left_ids and not right_ids, []


def merge_record(existing: dict[str, Any], incoming: dict[str, Any]) -> None:
    for field in ("canonical_name", "display_name", "address_line1", "address_line2", "country", "phone", "email", "contact_person", "gstin", "iec", "pan", "fssai", "tin", "trn", "state_code", "trade_license_number", "tax_identification_number", "registration_number"):
        if not existing.get(field) and incoming.get(field):
            existing[field] = incoming[field]
    existing["aliases"] = merge_values(existing.get("aliases", []), incoming.get("aliases", []))
    existing["alternate_addresses"] = merge_values(existing.get("alternate_addresses", []), [incoming.get("address_line1"), incoming.get("address_line2")])
    existing["alternate_phones"] = merge_values(existing.get("alternate_phones", []), [incoming.get("phone"), *(incoming.get("alternate_phones") or [])])
    existing["alternate_emails"] = merge_values(existing.get("alternate_emails", []), [incoming.get("email"), *(incoming.get("alternate_emails") or [])])
    existing["source_pages"] = sorted(set(existing.get("source_pages", []) + incoming.get("source_pages", [])))
    existing["source_references"] = merge_values(existing.get("source_references", []), incoming.get("source_references", []))
    existing["source_entries"] = existing.get("source_entries", []) + incoming.get("source_entries", [])
    existing["review_flags"] = distinct(existing.get("review_flags", []) + incoming.get("review_flags", []))
    existing["review_status"] = "needs_review" if existing["review_flags"] else existing.get("review_status", "verified_source")
    existing["source_raw_text"] = "\n\n".join(merge_values([existing.get("source_raw_text", "")], [incoming.get("source_raw_text", "")]))
    existing["field_provenance"] = {**(existing.get("field_provenance") or {}), **(incoming.get("field_provenance") or {})}
    existing["identifiers"] = {**(existing.get("identifiers") or {}), **(incoming.get("identifiers") or {})}


def deduplicate(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    unique: list[dict[str, Any]] = []
    duplicates = 0
    for incoming in records:
        match = None
        conflict_flags: list[str] = []
        for candidate in unique:
            should_merge, flags = can_merge(candidate, incoming)
            if should_merge:
                match = candidate
                break
            if flags and candidate.get("normalized_name") == incoming.get("normalized_name"):
                conflict_flags.extend(flags)
        if match is not None:
            merge_record(match, incoming)
            duplicates += 1
        else:
            if conflict_flags:
                incoming["review_flags"] = distinct(incoming.get("review_flags", []) + conflict_flags + ["possible_duplicate_conflict"])
                incoming["review_status"] = "needs_review"
            unique.append(incoming)
    return unique, duplicates


def extract_records(pdf_path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    page_row_counts: dict[int, int] = defaultdict(int)
    with pdfplumber.open(pdf_path) as pdf:
        pages_processed = len(pdf.pages)
        for page_number, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables() or []:
                for raw_row in table:
                    parsed = parse_row(page_number, raw_row)
                    if parsed:
                        rows.append(parsed)
                        page_row_counts[page_number] += 1
    records, duplicates = deduplicate(rows)
    report = {
        "sourceName": pdf_path.name,
        "sourcePagesProcessed": pages_processed,
        "sourceRowsProcessed": len(rows),
        "distinctConsignees": len(records),
        "duplicateSourceRowsMerged": duplicates,
        "pageRowCounts": {str(page): count for page, count in sorted(page_row_counts.items())},
        "recordsFlaggedForReview": sum(1 for record in records if record.get("review_flags")),
    }
    return records, report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED)
    parser.add_argument("--write-seed", action="store_true")
    parser.add_argument("--inspect", action="store_true", help="Print a concise report and canonical names.")
    args = parser.parse_args()
    if not args.pdf.exists():
        raise SystemExit(f"PDF not found: {args.pdf}")
    records, report = extract_records(args.pdf)
    if args.write_seed:
        args.seed.parent.mkdir(parents=True, exist_ok=True)
        args.seed.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.inspect or not args.write_seed:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        for index, record in enumerate(records, 1):
            print(f"{index:03d} | {record['display_name']} | pages={','.join(map(str, record['source_pages']))} | flags={','.join(record.get('review_flags') or [])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
