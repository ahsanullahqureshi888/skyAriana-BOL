from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("sky_ariana.migration.extractors")


@dataclass
class ExtractedDataset:
    """Aggregated container of all raw extracted data from existing snapshots."""

    accounts: List[Dict[str, Any]] = field(default_factory=list)
    ledger_transactions: List[Dict[str, Any]] = field(default_factory=list)
    payment_receipts: List[Dict[str, Any]] = field(default_factory=list)
    shipments: List[Dict[str, Any]] = field(default_factory=list)
    bol_records: List[Dict[str, Any]] = field(default_factory=list)
    invoices: List[Dict[str, Any]] = field(default_factory=list)
    expenses: List[Dict[str, Any]] = field(default_factory=list)
    audit_logs: List[Dict[str, Any]] = field(default_factory=list)
    documents: List[Dict[str, Any]] = field(default_factory=list)

    # Discovered source files metadata
    scanned_files: List[Dict[str, Any]] = field(default_factory=list)


class DataExtractor:
    """Safe, non-destructive extractor for existing legacy JSON and Electron files.

    Guarantees:
    - Only opens files in read-only mode ('r', encoding='utf-8')
    - Never mutates, renames, writes to, or deletes original files
    - Gracefully handles missing files, malformed JSON, and empty lists
    """

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir

    def _read_json_file(self, file_path: Path) -> Optional[Any]:
        """Safely read a JSON file in read-only mode."""
        if not file_path.is_file():
            return None
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return json.load(f)
        except Exception as exc:
            logger.warning(f"Could not read source file {file_path}: {exc}")
            return None

    def extract_all(self) -> ExtractedDataset:
        """Scan and extract all legacy data sources into an ExtractedDataset."""
        dataset = ExtractedDataset()

        # 1. Primary: .local-ledger-system.json
        ledger_sys_file = self.base_dir / ".local-ledger-system.json"
        if not ledger_sys_file.is_file():
            ledger_sys_file = self.base_dir / "data" / ".local-ledger-system.json"
        ledger_sys_data = self._read_json_file(ledger_sys_file)
        if isinstance(ledger_sys_data, dict):
            dataset.scanned_files.append({
                "path": str(ledger_sys_file),
                "type": "ledger-system",
                "accounts": len(ledger_sys_data.get("accounts", [])),
                "transactions": len(ledger_sys_data.get("ledger_transactions", [])),
                "receipts": len(ledger_sys_data.get("payment_receipts", [])),
            })
            dataset.accounts.extend(ledger_sys_data.get("accounts", []))
            dataset.ledger_transactions.extend(ledger_sys_data.get("ledger_transactions", []))
            dataset.payment_receipts.extend(ledger_sys_data.get("payment_receipts", []))

        # 2. .local-accounts.json
        accs_file = self.base_dir / ".local-accounts.json"
        accs_data = self._read_json_file(accs_file)
        if isinstance(accs_data, list):
            dataset.scanned_files.append({"path": str(accs_file), "type": "accounts", "count": len(accs_data)})
            for acc in accs_data:
                # Normalize format to account dict
                dataset.accounts.append({
                    "id": acc.get("id"),
                    "account_code": acc.get("id") or acc.get("code"),
                    "account_name": acc.get("name"),
                    "account_type": acc.get("type", "customer"),
                    "address": acc.get("address"),
                    "contact": acc.get("contact"),
                    "currency": "USD",
                })

        # 3. .local-account-ledgers.json
        acledg_file = self.base_dir / ".local-account-ledgers.json"
        acledg_data = self._read_json_file(acledg_file)
        if isinstance(acledg_data, dict):
            raw_accs = acledg_data.get("accounts", [])
            raw_entries = acledg_data.get("ledgerEntries", {})
            total_entries = sum(len(v) for v in raw_entries.values()) if isinstance(raw_entries, dict) else 0
            dataset.scanned_files.append({
                "path": str(acledg_file),
                "type": "account-ledgers",
                "accounts": len(raw_accs),
                "entries": total_entries,
            })
            for acc_name in raw_accs:
                dataset.accounts.append({
                    "account_name": acc_name,
                    "account_type": "customer",
                    "currency": "USD",
                })
            if isinstance(raw_entries, dict):
                for acc_id_or_name, entry_list in raw_entries.items():
                    for entry in entry_list:
                        e_copy = dict(entry)
                        e_copy.setdefault("account_id", acc_id_or_name)
                        dataset.ledger_transactions.append(e_copy)

        # 4. .local-bol-account-ledgers.json
        bol_ledg_file = self.base_dir / ".local-bol-account-ledgers.json"
        bol_ledg_data = self._read_json_file(bol_ledg_file)
        if isinstance(bol_ledg_data, dict):
            raw_companies = bol_ledg_data.get("customCompanies", [])
            raw_records = bol_ledg_data.get("ledgerRecords", {})
            total_bol_entries = sum(len(v) for v in raw_records.values()) if isinstance(raw_records, dict) else 0
            dataset.scanned_files.append({
                "path": str(bol_ledg_file),
                "type": "bol-account-ledgers",
                "companies": len(raw_companies),
                "records": total_bol_entries,
            })
            for comp in raw_companies:
                dataset.accounts.append({
                    "account_name": comp,
                    "account_type": "customer",
                    "currency": "USD",
                })
            if isinstance(raw_records, dict):
                for comp_name, rec_list in raw_records.items():
                    for r in rec_list:
                        r_copy = dict(r)
                        r_copy.setdefault("account_id", comp_name)
                        r_copy.setdefault("account_name", comp_name)
                        r_copy.setdefault("bol_number", r.get("bolNo") or r.get("barnamehNo"))
                        dataset.ledger_transactions.append(r_copy)

        # 5. .local-shipments.json
        ship_file = self.base_dir / ".local-shipments.json"
        ship_data = self._read_json_file(ship_file)
        if isinstance(ship_data, list):
            dataset.scanned_files.append({"path": str(ship_file), "type": "shipments", "count": len(ship_data)})
            dataset.shipments.extend(ship_data)
            for s in ship_data:
                # Also derive BOL record metadata from shipment
                ref = s.get("referenceNumber")
                if ref:
                    bol_rec = {
                        "bol_number": ref,
                        "origin": (s.get("transport", {}) or {}).get("origin") or s.get("currentLocation") or "Kandahar",
                        "destination": (s.get("transport", {}) or {}).get("finalDestination") or s.get("nextDestination"),
                        "border_station": (s.get("transport", {}) or {}).get("borderCrossing") or "Islam Qala",
                        "status": s.get("status", "active"),
                        "shipper": s.get("shipper"),
                        "consignee": s.get("consignee"),
                        "cargo": s.get("cargo"),
                        "truck": s.get("truck"),
                        "container": s.get("container"),
                        "finance": s.get("finance"),
                        "created_at": s.get("createdAt"),
                        "updated_at": s.get("updatedAt"),
                    }
                    dataset.bol_records.append(bol_rec)

        # 6. .local-shipment-documents.json
        doc_file = self.base_dir / ".local-shipment-documents.json"
        doc_data = self._read_json_file(doc_file)
        if isinstance(doc_data, list):
            dataset.scanned_files.append({"path": str(doc_file), "type": "documents", "count": len(doc_data)})
            dataset.documents.extend(doc_data)
            for d in doc_data:
                # Extract snapshot BOL data if present
                src_snap = (d.get("sourceSnapshot") or {}).get("bolData")
                if isinstance(src_snap, dict) and (src_snap.get("bol_number") or src_snap.get("billOfLadingNumber")):
                    dataset.bol_records.append(src_snap)

        # 7. .local-bols.json
        bol_file = self.base_dir / ".local-bols.json"
        bol_data = self._read_json_file(bol_file)
        if isinstance(bol_data, list):
            dataset.scanned_files.append({"path": str(bol_file), "type": "bols", "count": len(bol_data)})
            dataset.bol_records.extend(bol_data)

        # 8. .local-invoices.json
        inv_file = self.base_dir / ".local-invoices.json"
        inv_data = self._read_json_file(inv_file)
        if isinstance(inv_data, list):
            dataset.scanned_files.append({"path": str(inv_file), "type": "invoices", "count": len(inv_data)})
            dataset.invoices.extend(inv_data)

        # 9. .local-general-expenses.json
        exp_file = self.base_dir / ".local-general-expenses.json"
        exp_data = self._read_json_file(exp_file)
        if isinstance(exp_data, list):
            dataset.scanned_files.append({"path": str(exp_file), "type": "expenses", "count": len(exp_data)})
            dataset.expenses.extend(exp_data)

        # 10. .local-audit-logs.json
        audit_file = self.base_dir / ".local-audit-logs.json"
        audit_data = self._read_json_file(audit_file)
        if isinstance(audit_data, list):
            dataset.scanned_files.append({"path": str(audit_file), "type": "audit-logs", "count": len(audit_data)})
            dataset.audit_logs.extend(audit_data)

        return dataset
