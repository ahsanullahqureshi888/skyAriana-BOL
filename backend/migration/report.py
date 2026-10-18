from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.migration.invariance import InvarianceAuditSummary


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to properly serialize Decimals and datetimes."""

    def default(self, o: Any) -> Any:
        if isinstance(o, Decimal):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        if hasattr(o, "__dict__"):
            return o.__dict__
        return super().default(o)


@dataclass
class MigrationReport:
    """Detailed, human-readable migration audit report."""

    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    success: bool = True

    files_scanned: List[Dict[str, Any]] = field(default_factory=list)
    entity_counts: Dict[str, Dict[str, int]] = field(default_factory=dict)
    invariance_summary: Optional[InvarianceAuditSummary] = None
    errors: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

    def record_entity(self, name: str, found: int, valid: int, inserted: int, duplicates: int, errors: int = 0) -> None:
        self.entity_counts[name] = {
            "found": found,
            "valid": valid,
            "inserted": inserted,
            "duplicates_skipped": duplicates,
            "errors": errors,
        }

    def finish(self) -> None:
        self.end_time = datetime.now(timezone.utc)
        self.duration_seconds = round((self.end_time - self.start_time).total_seconds(), 2)

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": self.duration_seconds,
            "success": self.success,
            "files_scanned": self.files_scanned,
            "entity_counts": self.entity_counts,
            "errors": self.errors,
            "notes": self.notes,
        }
        if self.invariance_summary:
            data["accounting_invariance"] = {
                "total_accounts_checked": self.invariance_summary.total_accounts_checked,
                "accounts_passed": self.invariance_summary.accounts_passed,
                "accounts_failed": self.invariance_summary.accounts_failed,
                "total_transactions_checked": self.invariance_summary.total_transactions_checked,
                "grand_total_debit": str(self.invariance_summary.grand_total_debit),
                "grand_total_credit": str(self.invariance_summary.grand_total_credit),
                "grand_net_balance": str(self.invariance_summary.grand_net_balance),
                "all_passed": self.invariance_summary.all_passed,
            }
        return data

    def save_json(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, cls=DecimalEncoder)

    def to_markdown(self) -> str:
        lines = [
            "# Sky Ariana BOL — Data Migration Audit Report",
            "",
            f"- **Execution Timestamp**: `{self.start_time.isoformat()}`",
            f"- **Duration**: `{self.duration_seconds}s`",
            f"- **Status**: `{'SUCCESS' if self.success else 'FAILED'}`",
            "",
            "## 1. Discovered Data Sources",
            "| Source File | Records / Type | Accounts | Entries |",
            "| :--- | :--- | :--- | :--- |",
        ]

        for s in self.files_scanned:
            p = Path(s.get("path", "")).name
            t = s.get("type", "")
            c = s.get("count", s.get("records", s.get("entries", 0)))
            a = s.get("accounts", s.get("companies", "-"))
            lines.append(f"| `{p}` | {t} ({c}) | {a} | {c} |")

        lines.extend([
            "",
            "## 2. Record Counts & Migration Reconciliation",
            "| Entity Type | Scanned | Validated | Inserted | Duplicates Merged | Errors |",
            "| :--- | :--- | :--- | :--- | :--- | :--- |",
        ])

        for ent, counts in sorted(self.entity_counts.items()):
            lines.append(
                f"| **{ent}** | {counts['found']} | {counts['valid']} | {counts['inserted']} | "
                f"{counts['duplicates_skipped']} | {counts['errors']} |"
            )

        if self.invariance_summary:
            lines.extend([
                "",
                "## 3. Accounting Invariance Audit ($Net Balance = Debit - Credit$)",
                f"- **Accounts Checked**: `{self.invariance_summary.total_accounts_checked}`",
                f"- **Accounts Invariant (Passed)**: `{self.invariance_summary.accounts_passed}`",
                f"- **Accounts with Variance (Failed)**: `{self.invariance_summary.accounts_failed}`",
                f"- **Total Transactions Checked**: `{self.invariance_summary.total_transactions_checked}`",
                f"- **Grand Total Debit**: `${self.invariance_summary.grand_total_debit:,.4f}`",
                f"- **Grand Total Credit**: `${self.invariance_summary.grand_total_credit:,.4f}`",
                f"- **Grand Net Balance**: `${self.invariance_summary.grand_net_balance:,.4f}`",
                f"- **Invariant Identity Satisfied**: `{'YES (100% Invariant)' if self.invariance_summary.all_passed else 'NO'}`",
            ])

        if self.errors:
            lines.extend(["", "## 4. Migration Errors / Warnings"])
            for err in self.errors:
                lines.append(f"- ⚠️ {err}")
        else:
            lines.extend(["", "## 4. Migration Errors / Warnings", "- None. All transactions imported cleanly."])

        return "\n".join(lines)

    def save_markdown(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.to_markdown())
