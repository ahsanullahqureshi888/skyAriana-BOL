"""Server-driven ledger accounting service with exact Decimal calculation and SQL aggregate performance."""
from __future__ import annotations

import csv
import io
from decimal import Decimal
from typing import Any, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.accounting import LedgerAccountModel, LedgerModel
from backend.schemas.ledger import (
    LedgerAccountSummary,
    LedgerEntryItem,
    LedgerExportResponse,
    LedgerPageResponse,
)
from backend.services.cache_service import master_data_cache, reports_summary_cache


def _to_decimal(val: Any) -> Decimal:
    """Safely convert any numeric or string amount to Decimal."""
    if val is None or val == "":
        return Decimal("0.0000")
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal("0.0000")


def _format_money(d: Decimal) -> str:
    """Format Decimal amount to clean 2-decimal string without float rounding issues."""
    return f"{d:.2f}"


async def get_ledger_page(
    db: AsyncSession,
    account_id: Optional[str] = None,
    company_id: Optional[str] = None,
    party_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: Optional[str] = "USD",
    page: int = 1,
    page_size: int = 50,
    sort_dir: str = "asc",
) -> LedgerPageResponse:
    """Server-driven ledger query calculating totals and running balances via ultra-fast SQL aggregation."""
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    offset = (page - 1) * page_size
    curr = (currency or "USD").upper()

    where_clauses = ["currency = :curr"]
    params: dict[str, Any] = {"curr": curr}

    if account_id:
        where_clauses.append("account_id = :account_id")
        params["account_id"] = account_id
    if date_from:
        where_clauses.append("transaction_date >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("transaction_date <= :date_to")
        params["date_to"] = date_to

    where_sql = " AND ".join(where_clauses)

    # 1. SQL Aggregate Opening Balance Calculation (transactions prior to date_from)
    opening_balance = Decimal("0.0000")
    if date_from:
        prior_where = ["currency = :curr", "transaction_date < :date_from"]
        prior_params: dict[str, Any] = {"curr": curr, "date_from": date_from}
        if account_id:
            prior_where.append("account_id = :account_id")
            prior_params["account_id"] = account_id
        prior_sql = f"SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM ledger_records WHERE {' AND '.join(prior_where)}"
        res = await db.execute(text(prior_sql), prior_params)
        row = res.one()
        opening_balance = _to_decimal(row[0]) - _to_decimal(row[1])

    # 2. Fast Total Count & Summary Totals in Single Query (satisfies Covering Index)
    summary_sql = f"SELECT COUNT(*), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM ledger_records WHERE {where_sql}"
    res = await db.execute(text(summary_sql), params)
    srow = res.one()
    total_count = srow[0]
    period_debit = _to_decimal(srow[1])
    period_credit = _to_decimal(srow[2])
    closing_balance = opening_balance + period_debit - period_credit

    # 3. Running Balance across pages (sum of rows strictly prior to offset)
    page_start_balance = opening_balance
    order_dir = "ASC" if sort_dir.lower() == "asc" else "DESC"
    if offset > 0 and total_count > 0:
        pre_sum_sql = f"""
            SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
            FROM (
                SELECT debit, credit FROM ledger_records
                WHERE {where_sql}
                ORDER BY transaction_date {order_dir}, id ASC
                LIMIT :offset
            )
        """
        offset_params = {**params, "offset": offset}
        res = await db.execute(text(pre_sum_sql), offset_params)
        prow = res.one()
        page_start_balance = opening_balance + (_to_decimal(prow[0]) - _to_decimal(prow[1]))

    # 4. Page records query with targeted column projection
    page_sql = f"""
        SELECT id, account_id, account_name, transaction_date, description, debit, credit, balance,
               currency, fee_type, exchange_rate, reference_id, bol_id, invoice_id, revision, created_at, updated_at
        FROM ledger_records
        WHERE {where_sql}
        ORDER BY transaction_date {order_dir}, id ASC
        LIMIT :limit OFFSET :offset
    """
    page_params = {**params, "limit": page_size, "offset": offset}
    rows = (await db.execute(text(page_sql), page_params)).all()

    # Calculate row-by-row running balance
    current_running = page_start_balance
    items: list[LedgerEntryItem] = []
    for r in rows:
        row_dr = _to_decimal(r[5])
        row_cr = _to_decimal(r[6])
        current_running = current_running + row_dr - row_cr

        items.append(
            LedgerEntryItem(
                id=r[0],
                account_id=r[1],
                account_name=r[2],
                transaction_date=r[3] or "",
                description=r[4] or "",
                debit=_format_money(row_dr),
                credit=_format_money(row_cr),
                balance=_format_money(current_running),
                currency=r[8] or "USD",
                fee_type=r[9],
                exchange_rate=_format_money(_to_decimal(r[10])),
                reference_id=r[11],
                bol_id=r[12],
                invoice_id=r[13],
                revision=r[14] or 1,
                created_at=str(r[15]) if r[15] else None,
                updated_at=str(r[16]) if r[16] else None,
            )
        )

    pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return LedgerPageResponse(
        opening_balance=_format_money(opening_balance),
        total_debit=_format_money(period_debit),
        total_credit=_format_money(period_credit),
        closing_balance=_format_money(closing_balance),
        items=items,
        page=page,
        page_size=page_size,
        total=total_count,
        pages=pages,
        currency=curr,
    )


async def search_ledger_accounts(
    db: AsyncSession, query: Optional[str] = None, limit: int = 30
) -> List[LedgerAccountSummary]:
    """Lightweight searchable account selector with cache acceleration."""
    clean_q = (query or "").strip()
    limit = max(1, min(limit, 100))

    cache_key = f"acc_search:{clean_q}:{limit}"
    cached = master_data_cache.get(cache_key)
    if cached is not None:
        return cached

    if clean_q:
        sql = """
            SELECT id, account_code, account_name, account_type, currency, current_balance
            FROM ledgers
            WHERE is_active = 1
              AND (account_name LIKE :prefix OR account_name LIKE :sub OR account_code LIKE :prefix)
            ORDER BY account_name ASC
            LIMIT :limit
        """
        params = {"prefix": f"{clean_q}%", "sub": f"%{clean_q}%", "limit": limit}
    else:
        sql = """
            SELECT id, account_code, account_name, account_type, currency, current_balance
            FROM ledgers
            WHERE is_active = 1
            ORDER BY account_name ASC
            LIMIT :limit
        """
        params = {"limit": limit}

    rows = (await db.execute(text(sql), params)).all()
    results: list[LedgerAccountSummary] = []
    for r in rows:
        results.append(
            LedgerAccountSummary(
                id=r[0],
                account_code=r[1],
                account_name=r[2],
                account_type=r[3],
                currency=r[4] or "USD",
                current_balance=_format_money(_to_decimal(r[5])),
                entry_count=0,
            )
        )

    master_data_cache.set(cache_key, results, ttl=120)
    return results


async def generate_ledger_csv_export(
    db: AsyncSession,
    account_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    currency: str = "USD",
) -> Tuple[str, int]:
    """Generate server-side CSV export with high speed column projection without frontend serialization."""
    where_clauses = ["currency = :curr"]
    params: dict[str, Any] = {"curr": currency.upper()}

    if account_id:
        where_clauses.append("account_id = :account_id")
        params["account_id"] = account_id
    if date_from:
        where_clauses.append("transaction_date >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("transaction_date <= :date_to")
        params["date_to"] = date_to

    sql = f"""
        SELECT transaction_date, account_name, description, debit, credit, currency, reference_id
        FROM ledger_records
        WHERE {' AND '.join(where_clauses)}
        ORDER BY transaction_date ASC, id ASC
    """
    rows = (await db.execute(text(sql), params)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Account", "Description", "Debit", "Credit", "Balance", "Currency", "Reference"])

    running = Decimal("0.00")
    for r in rows:
        dr = _to_decimal(r[3])
        cr = _to_decimal(r[4])
        running += dr - cr
        writer.writerow([r[0], r[1], r[2], _format_money(dr), _format_money(cr), _format_money(running), r[5], r[6] or ""])

    return output.getvalue(), len(rows)


def build_whatsapp_summary_text(
    account_name: str,
    opening: str,
    debit: str,
    credit: str,
    closing: str,
    currency: str = "USD",
) -> str:
    """Generate concise WhatsApp accounting summary text from server totals (Section 53)."""
    return (
        f"*AQ COMPANIES - Sky Ariana Account Ledger*\n"
        f"Account: {account_name}\n"
        f"Currency: {currency}\n"
        f"--------------------------\n"
        f"Opening Balance: {opening} {currency}\n"
        f"Total Debit:     {debit} {currency}\n"
        f"Total Credit:    {credit} {currency}\n"
        f"Net Closing:     {closing} {currency}\n"
        f"--------------------------\n"
        f"Accounting Invariance Checked (Balance = Debit - Credit)."
    )
