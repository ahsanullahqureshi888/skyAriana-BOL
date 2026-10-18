from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Set, Tuple

from backend.migration.cleaners import clean_code, clean_text, safe_decimal


@dataclass
class DeduplicationStats:
    """Statistics on records evaluated, retained, and deduplicated/merged."""

    entity_name: str
    total_found: int = 0
    unique_retained: int = 0
    duplicates_merged: int = 0


class Deduplicator:
    """Handles duplicate detection and safe resolution without losing historical data."""

    def __init__(self):
        self.stats: Dict[str, DeduplicationStats] = {}

    def _get_stat(self, name: str) -> DeduplicationStats:
        if name not in self.stats:
            self.stats[name] = DeduplicationStats(entity_name=name)
        return self.stats[name]

    def deduplicate_accounts(self, raw_accounts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate accounts by account_code and normalized account_name."""
        stat = self._get_stat("accounts")
        stat.total_found = len(raw_accounts)

        unique_by_name: Dict[str, Dict[str, Any]] = {}
        unique_by_code: Dict[str, Dict[str, Any]] = {}
        result: List[Dict[str, Any]] = []

        code_counter = 1

        for raw in raw_accounts:
            name = clean_text(raw.get("account_name") or raw.get("name") or "")
            if not name:
                continue

            norm_name = clean_code(name)
            raw_code = clean_code(raw.get("account_code") or raw.get("id") or "")

            existing = unique_by_name.get(norm_name) or (unique_by_code.get(raw_code) if raw_code else None)

            if existing:
                stat.duplicates_merged += 1
                # Merge missing properties
                if not existing.get("address") and raw.get("address"):
                    existing["address"] = raw.get("address")
                if not existing.get("contact") and raw.get("contact"):
                    existing["contact"] = raw.get("contact")
                if safe_decimal(raw.get("current_balance")) != 0 and safe_decimal(existing.get("current_balance")) == 0:
                    existing["current_balance"] = raw.get("current_balance")
                # Preserve alias
                aliases = existing.setdefault("aliases", [])
                if raw.get("id") and raw.get("id") not in aliases:
                    aliases.append(raw.get("id"))
            else:
                acc_code = raw_code if raw_code and len(raw_code) <= 64 else f"ACC-{code_counter:04d}"
                code_counter += 1
                acc_dict = dict(raw)
                acc_dict["account_name"] = name
                acc_dict["account_code"] = acc_code
                acc_dict.setdefault("aliases", [])
                if raw.get("id"):
                    acc_dict["aliases"].append(raw.get("id"))

                unique_by_name[norm_name] = acc_dict
                if acc_code:
                    unique_by_code[acc_code] = acc_dict
                result.append(acc_dict)

        stat.unique_retained = len(result)
        return result

    def deduplicate_bols(self, raw_bols: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate BOLs by normalized bol_number and merge richer subfields."""
        stat = self._get_stat("bol_records")
        stat.total_found = len(raw_bols)

        by_number: Dict[str, Dict[str, Any]] = {}

        for raw in raw_bols:
            b_num = clean_code(
                raw.get("bol_number")
                or raw.get("billOfLadingNumber")
                or raw.get("bolNo")
                or raw.get("barnamehNo")
                or ""
            )
            if not b_num:
                continue

            if b_num in by_number:
                stat.duplicates_merged += 1
                existing = by_number[b_num]
                # Merge richer data (prefer non-empty values)
                for key in ["driver", "truck", "shipper", "consignee", "cargo", "transport", "finance"]:
                    if not existing.get(key) and raw.get(key):
                        existing[key] = raw.get(key)
                # Merge weight/carton if existing has 0
                if safe_decimal(existing.get("gross_weight_kg")) == 0 and raw.get("gross_weight_kg"):
                    existing["gross_weight_kg"] = raw.get("gross_weight_kg")
                if safe_decimal(existing.get("net_weight_kg")) == 0 and raw.get("net_weight_kg"):
                    existing["net_weight_kg"] = raw.get("net_weight_kg")
            else:
                bol_dict = dict(raw)
                bol_dict["bol_number"] = b_num
                by_number[b_num] = bol_dict

        result = list(by_number.values())
        stat.unique_retained = len(result)
        return result

    def deduplicate_shipments(self, raw_shipments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate shipments by tracking_number or id."""
        stat = self._get_stat("shipments")
        stat.total_found = len(raw_shipments)

        seen_keys: Set[str] = set()
        result: List[Dict[str, Any]] = []

        for raw in raw_shipments:
            key = clean_code(raw.get("tracking_number") or raw.get("id") or raw.get("referenceNumber") or "")
            if not key or key in seen_keys:
                stat.duplicates_merged += 1
                continue
            seen_keys.add(key)
            result.append(raw)

        stat.unique_retained = len(result)
        return result

    def deduplicate_invoices(self, raw_invoices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate invoices by invoice_number."""
        stat = self._get_stat("invoices")
        stat.total_found = len(raw_invoices)

        by_num: Dict[str, Dict[str, Any]] = {}

        for raw in raw_invoices:
            inv_no = clean_code(raw.get("invoice_number") or raw.get("id") or "")
            if not inv_no:
                continue

            if inv_no in by_num:
                stat.duplicates_merged += 1
                # If existing has no items but this one does, adopt items
                if not by_num[inv_no].get("items") and raw.get("items"):
                    by_num[inv_no]["items"] = raw.get("items")
            else:
                inv_dict = dict(raw)
                inv_dict["invoice_number"] = inv_no
                by_num[inv_no] = inv_dict

        result = list(by_num.values())
        stat.unique_retained = len(result)
        return result

    def deduplicate_transactions(self, raw_txns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate ledger transactions using ID and cryptographic fingerprint."""
        stat = self._get_stat("ledger_records")
        stat.total_found = len(raw_txns)

        seen_ids: Set[str] = set()
        seen_fingerprints: Set[str] = set()
        result: List[Dict[str, Any]] = []

        for raw in raw_txns:
            if raw.get("is_deleted") is True:
                stat.duplicates_merged += 1
                continue

            tid = clean_text(raw.get("id") or "")
            fp = clean_text(raw.get("fingerprint") or "")

            if not fp:
                # Generate SHA-256 fingerprint from core attributes
                acc = str(raw.get("account_id") or raw.get("account_name") or "")
                dt = str(raw.get("transaction_date") or raw.get("date") or "")
                deb = str(safe_decimal(raw.get("debit")))
                crd = str(safe_decimal(raw.get("credit")))
                desc = clean_text(raw.get("description") or "")
                ref = clean_text(raw.get("reference_number") or raw.get("bol_number") or raw.get("billOfLanding") or "")
                raw_token = f"{acc}|{dt}|{deb}|{crd}|{desc}|{ref}"
                fp = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

            if (tid and tid in seen_ids) or (fp and fp in seen_fingerprints):
                stat.duplicates_merged += 1
                continue

            if tid:
                seen_ids.add(tid)
            if fp:
                seen_fingerprints.add(fp)

            result.append(raw)

        stat.unique_retained = len(result)
        return result

    def deduplicate_expenses(self, raw_expenses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate general expenses by expense_number or id."""
        stat = self._get_stat("expenses")
        stat.total_found = len(raw_expenses)

        seen: Set[str] = set()
        result: List[Dict[str, Any]] = []

        for exp in raw_expenses:
            key = clean_code(exp.get("expense_number") or exp.get("id") or exp.get("reference") or "")
            if not key or key in seen:
                stat.duplicates_merged += 1
                continue
            seen.add(key)
            result.append(exp)

        stat.unique_retained = len(result)
        return result

    def deduplicate_payments(self, raw_payments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate payments by receipt_number or payment_id."""
        stat = self._get_stat("payments")
        stat.total_found = len(raw_payments)

        seen: Set[str] = set()
        result: List[Dict[str, Any]] = []

        for p in raw_payments:
            key = clean_code(p.get("receipt_number") or p.get("payment_number") or p.get("id") or "")
            if not key or key in seen:
                stat.duplicates_merged += 1
                continue
            seen.add(key)
            result.append(p)

        stat.unique_retained = len(result)
        return result

    def deduplicate_audit_logs(self, raw_logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate audit logs by id."""
        stat = self._get_stat("audit_logs")
        stat.total_found = len(raw_logs)

        seen: Set[str] = set()
        result: List[Dict[str, Any]] = []

        for log in raw_logs:
            lid = clean_text(log.get("id") or "")
            if not lid or lid in seen:
                stat.duplicates_merged += 1
                continue
            seen.add(lid)
            result.append(log)

        stat.unique_retained = len(result)
        return result
