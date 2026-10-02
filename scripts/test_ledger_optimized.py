import asyncio
import os
import sys
import time
from pathlib import Path
from decimal import Decimal
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal
from backend.schemas.ledger import LedgerEntryItem, LedgerPageResponse

def _to_decimal(val) -> Decimal:
    if val is None or val == "":
        return Decimal("0.0000")
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal("0.0000")

def _format_money(d: Decimal) -> str:
    return f"{d:.2f}"

async def optimized_get_ledger_page(db, account_id=None, date_from=None, date_to=None, currency="USD", page=1, page_size=100, sort_dir="asc"):
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    offset = (page - 1) * page_size
    curr = (currency or "USD").upper()

    where_clauses = ["currency = :curr"]
    params = {"curr": curr}

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

    # 1. Opening Balance prior to date_from
    opening_balance = Decimal("0.0000")
    if date_from:
        prior_where = ["currency = :curr", "transaction_date < :date_from"]
        prior_params = {"curr": curr, "date_from": date_from}
        if account_id:
            prior_where.append("account_id = :account_id")
            prior_params["account_id"] = account_id
        prior_sql = f"SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM ledger_records WHERE {' AND '.join(prior_where)}"
        res = await db.execute(text(prior_sql), prior_params)
        row = res.one()
        opening_balance = _to_decimal(row[0]) - _to_decimal(row[1])

    # 2. Fast summary count and totals in single query
    summary_sql = f"SELECT COUNT(*), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM ledger_records WHERE {where_sql}"
    res = await db.execute(text(summary_sql), params)
    srow = res.one()
    total_count = srow[0]
    period_debit = _to_decimal(srow[1])
    period_credit = _to_decimal(srow[2])
    closing_balance = opening_balance + period_debit - period_credit

    # 3. Running balance offset calculation
    page_start_balance = opening_balance
    if offset > 0 and total_count > 0:
        order_dir = "ASC" if sort_dir.lower() == "asc" else "DESC"
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

    # 4. Page records query
    order_dir = "ASC" if sort_dir.lower() == "asc" else "DESC"
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
    items = []
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

async def test():
    async with SessionLocal() as db:
        await db.execute(text("SELECT 1;"))
        t0 = time.perf_counter()
        resp = await optimized_get_ledger_page(db, account_id="ACC-138e08e812", currency="USD", page=1, page_size=100)
        ms = (time.perf_counter() - t0) * 1000
        print(f"Optimized get_ledger_page execution: {ms:.2f} ms (Total: {resp.total}, Items: {len(resp.items)}, Bal: {resp.closing_balance})")

if __name__ == "__main__":
    asyncio.run(test())
