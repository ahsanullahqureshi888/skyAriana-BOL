from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional

from backend.migration.cleaners import safe_decimal


@dataclass
class AccountInvarianceResult:
    """Invariance evaluation result for a single account."""

    account_id: str
    account_name: str
    currency: str
    transaction_count: int
    total_debit: Decimal
    total_credit: Decimal
    expected_balance: Decimal
    reported_balance: Decimal
    variance: Decimal
    is_valid: bool
    is_chronological: bool
    step_errors: List[str] = field(default_factory=list)


@dataclass
class InvarianceAuditSummary:
    """Summary of accounting invariance verification across the entire ledger."""

    total_accounts_checked: int = 0
    accounts_passed: int = 0
    accounts_failed: int = 0
    total_transactions_checked: int = 0
    grand_total_debit: Decimal = field(default_factory=lambda: Decimal("0.0000"))
    grand_total_credit: Decimal = field(default_factory=lambda: Decimal("0.0000"))
    grand_net_balance: Decimal = field(default_factory=lambda: Decimal("0.0000"))
    all_passed: bool = True
    account_results: List[AccountInvarianceResult] = field(default_factory=list)


class AccountingInvarianceChecker:
    """Validates the fundamental accounting identity:

    Net Balance = Total Debit - Total Credit
    and chronological balance progression.
    """

    @staticmethod
    def verify_account(
        account_id: str,
        account_name: str,
        currency: str,
        transactions: List[Dict[str, Any]],
        reported_balance: Optional[Decimal] = None,
        tolerance: Decimal = Decimal("0.01"),
    ) -> AccountInvarianceResult:
        """Verify the accounting invariance and chronological consistency of an account's entries."""
        total_debit = Decimal("0.0000")
        total_credit = Decimal("0.0000")
        running_calc = Decimal("0.0000")
        step_errors = []
        is_chronological = True
        last_date = ""

        # Check chronological ordering and calculate totals
        for idx, txn in enumerate(transactions, start=1):
            date_str = str(txn.get("transaction_date") or txn.get("date") or "")
            if last_date and date_str and date_str < last_date:
                is_chronological = False
            if date_str:
                last_date = date_str

            debit = safe_decimal(txn.get("debit"))
            credit = safe_decimal(txn.get("credit"))
            total_debit += debit
            total_credit += credit
            running_calc += (debit - credit)

            # Check recorded running balance if present
            recorded_running = txn.get("running_balance") or txn.get("balance")
            if recorded_running is not None and recorded_running != "":
                rec_dec = safe_decimal(recorded_running)
                # Allow standard currency cent rounding tolerance (0.01) for displayed balances
                step_tol = max(tolerance, Decimal("0.01"))
                if abs(rec_dec - running_calc) > step_tol:
                    step_errors.append(
                        f"Step {idx} ({date_str}): expected running balance {running_calc}, recorded {rec_dec}"
                    )

        expected_balance = total_debit - total_credit
        if reported_balance is None:
            reported_balance = expected_balance

        variance = abs(expected_balance - reported_balance)
        is_valid = variance <= tolerance and len(step_errors) == 0

        return AccountInvarianceResult(
            account_id=account_id,
            account_name=account_name,
            currency=currency,
            transaction_count=len(transactions),
            total_debit=total_debit,
            total_credit=total_credit,
            expected_balance=expected_balance,
            reported_balance=reported_balance,
            variance=variance,
            is_valid=is_valid,
            is_chronological=is_chronological,
            step_errors=step_errors,
        )

    @classmethod
    def verify_all(
        cls,
        accounts: List[Dict[str, Any]],
        transactions_by_account: Dict[str, List[Dict[str, Any]]],
        tolerance: Decimal = Decimal("0.01"),
    ) -> InvarianceAuditSummary:
        """Verify invariance for all ledger accounts and build the audit summary."""
        summary = InvarianceAuditSummary()
        summary.total_accounts_checked = len(accounts)

        for acc in accounts:
            acc_id = str(acc.get("id") or acc.get("account_code") or acc.get("account_name"))
            acc_name = str(acc.get("account_name") or acc.get("name") or acc_id)
            currency = str(acc.get("currency") or "USD")
            reported_bal = safe_decimal(acc.get("current_balance")) if "current_balance" in acc else None

            txns = transactions_by_account.get(acc_id, [])
            if not txns:
                # Also try looking up by account_name if lookup by ID was empty
                txns = transactions_by_account.get(acc_name, [])

            res = cls.verify_account(
                account_id=acc_id,
                account_name=acc_name,
                currency=currency,
                transactions=txns,
                reported_balance=reported_bal,
                tolerance=tolerance,
            )

            summary.account_results.append(res)
            summary.total_transactions_checked += res.transaction_count
            summary.grand_total_debit += res.total_debit
            summary.grand_total_credit += res.total_credit

            if res.is_valid:
                summary.accounts_passed += 1
            else:
                summary.accounts_failed += 1

        summary.grand_net_balance = summary.grand_total_debit - summary.grand_total_credit
        summary.all_passed = summary.accounts_failed == 0
        return summary
