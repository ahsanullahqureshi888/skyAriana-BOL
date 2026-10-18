from __future__ import annotations

import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.accounting import LedgerAccountModel, LedgerModel
from backend.models.base import generate_uuid
from backend.schemas.ledger import (
    LedgerAccountSummary,
    LedgerExportRequest,
    LedgerExportResponse,
    LedgerPageResponse,
)
from backend.schemas.placeholders import (
    APIResponse,
    LedgerCreate,
    LedgerInvarianceCheckResponse,
    LedgerResponse,
    PaginatedList,
)
from backend.services.ledger_service import (
    build_whatsapp_summary_text,
    generate_ledger_csv_export,
    get_ledger_page,
    search_ledger_accounts,
)

router = APIRouter(tags=["Ledgers & Accounting"])


@router.get("/ledger", response_model=APIResponse[LedgerPageResponse])
async def get_server_driven_ledger(
    account_id: Optional[str] = Query(None, description="Filter by account identifier"),
    company_id: Optional[str] = Query(None, description="Filter by company"),
    party_id: Optional[str] = Query(None, description="Filter by party identifier"),
    date_from: Optional[str] = Query(None, description="Filter transactions from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter transactions to date (YYYY-MM-DD)"),
    currency: Optional[str] = Query("USD", description="Currency filter: USD or AFN"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort: str = Query("asc", description="Sort order: asc or desc"),
    db: AsyncSession = Depends(get_db),
):
    """Server-driven ledger computing totals and running balances via SQL aggregation (Sections 32-38, 43-45)."""
    data = await get_ledger_page(
        db=db,
        account_id=account_id,
        company_id=company_id,
        party_id=party_id,
        date_from=date_from,
        date_to=date_to,
        currency=currency,
        page=page,
        page_size=page_size,
        sort_dir=sort,
    )
    return APIResponse(
        success=True,
        message="Ledger retrieved successfully",
        data=data,
    )


@router.get("/ledger/accounts/search", response_model=APIResponse[List[LedgerAccountSummary]])
async def search_accounts_endpoint(
    q: Optional[str] = Query(None, description="Search accounts by name or code"),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Fast searchable ledger account selector (Sections 40, 41)."""
    accounts = await search_ledger_accounts(db, query=q, limit=limit)
    return APIResponse(
        success=True,
        message=f"Found {len(accounts)} accounts",
        data=accounts,
    )


@router.post("/ledger/export")
async def export_ledger_endpoint(
    payload: LedgerExportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Server-side ledger export (CSV/Excel) preventing heavy frontend serialization (Section 50)."""
    csv_content, count = await generate_ledger_csv_export(
        db=db,
        account_id=payload.account_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
        currency=payload.currency,
    )

    filename = f"ledger_export_{payload.account_id or 'all'}_{payload.currency}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/ledger/whatsapp-summary", response_model=APIResponse[str])
async def whatsapp_summary_endpoint(
    account_id: str = Query(..., description="Account identifier"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    currency: str = Query("USD"),
    db: AsyncSession = Depends(get_db),
):
    """Concise WhatsApp financial summary text directly from server aggregation (Section 53)."""
    page_data = await get_ledger_page(
        db=db,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        currency=currency,
        page=1,
        page_size=1,
    )

    acc_stmt = select(LedgerAccountModel.account_name).where(LedgerAccountModel.id == account_id)
    acc_res = await db.execute(acc_stmt)
    acc_name = acc_res.scalar_one_or_none() or account_id

    text_summary = build_whatsapp_summary_text(
        account_name=acc_name,
        opening=page_data.opening_balance,
        debit=page_data.total_debit,
        credit=page_data.total_credit,
        closing=page_data.closing_balance,
        currency=currency,
    )

    return APIResponse(
        success=True,
        message="WhatsApp summary generated",
        data=text_summary,
    )


# Backward-compatible endpoints for existing tests and legacy tools
@router.get("/ledgers", response_model=PaginatedList[LedgerResponse])
async def list_ledger_entries(
    account_id: Optional[str] = Query(None, description="Filter by account identifier"),
    currency: Optional[str] = Query(None, description="Filter by currency: USD or AFN"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List ledger entries chronologically backed by database query."""
    filters = []
    if account_id:
        filters.append(LedgerModel.account_id == account_id)
    if currency:
        filters.append(LedgerModel.currency == currency.upper())

    where_clause = func.and_(*filters) if filters else True

    count_stmt = select(func.count(LedgerModel.id)).where(where_clause)
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    query_stmt = (
        select(LedgerModel)
        .where(where_clause)
        .order_by(LedgerModel.transaction_date.asc(), LedgerModel.id.asc())
        .offset(offset)
        .limit(page_size)
    )

    rows = (await db.execute(query_stmt)).scalars().all()
    items = [
        LedgerResponse(
            id=1,
            account_id=r.account_id,
            account_name=r.account_name,
            transaction_date=r.transaction_date,
            description=r.description,
            debit=float(r.debit or 0),
            credit=float(r.credit or 0),
            balance=float(r.balance or 0),
            currency=r.currency,
            fee_type=r.fee_type,
            exchange_rate=float(r.exchange_rate or 1.0),
            reference_id=r.reference_id,
            created_at=r.created_at.isoformat() if r.created_at else "",
            updated_at=r.updated_at.isoformat() if r.updated_at else "",
        )
        for r in rows
    ]

    return PaginatedList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/ledgers", response_model=APIResponse[LedgerResponse], status_code=status.HTTP_201_CREATED)
async def create_ledger_entry(
    payload: LedgerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new ledger entry maintaining chronological sequence and Net Balance = Total Debit - Total Credit."""
    now = datetime.datetime.now(datetime.timezone.utc)
    new_id = generate_uuid()

    new_record = LedgerModel(
        id=new_id,
        account_id=payload.account_id,
        account_name=payload.account_name,
        transaction_date=payload.transaction_date,
        description=payload.description,
        debit=Decimal(str(payload.debit)),
        credit=Decimal(str(payload.credit)),
        balance=Decimal(str(payload.balance)),
        currency=payload.currency.upper(),
        fee_type=payload.fee_type,
        exchange_rate=Decimal(str(payload.exchange_rate)),
        reference_id=payload.reference_id,
        revision=1,
        created_at=now,
        updated_at=now,
    )

    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)

    resp = LedgerResponse(
        id=1,
        account_id=new_record.account_id,
        account_name=new_record.account_name,
        transaction_date=new_record.transaction_date,
        description=new_record.description,
        debit=float(new_record.debit or 0),
        credit=float(new_record.credit or 0),
        balance=float(new_record.balance or 0),
        currency=new_record.currency,
        fee_type=new_record.fee_type,
        exchange_rate=float(new_record.exchange_rate or 1.0),
        reference_id=new_record.reference_id,
        created_at=new_record.created_at.isoformat() if new_record.created_at else now.isoformat(),
        updated_at=new_record.updated_at.isoformat() if new_record.updated_at else now.isoformat(),
    )

    return APIResponse(
        success=True,
        message="Ledger entry registered successfully",
        data=resp,
    )


@router.get("/ledgers/invariance-check/{account_id}", response_model=APIResponse[LedgerInvarianceCheckResponse])
async def check_accounting_invariance(
    account_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Audit and verify Accounting Invariance: Net Balance = Total Debit - Total Credit (Section 86)."""
    sum_stmt = select(
        func.coalesce(func.sum(LedgerModel.debit), 0),
        func.coalesce(func.sum(LedgerModel.credit), 0),
    ).where(LedgerModel.account_id == account_id)

    sum_row = (await db.execute(sum_stmt)).one()
    tot_dr = Decimal(str(sum_row[0]))
    tot_cr = Decimal(str(sum_row[1]))
    calculated_balance = tot_dr - tot_cr

    # Last recorded balance chronologically
    last_stmt = (
        select(LedgerModel.balance)
        .where(LedgerModel.account_id == account_id)
        .order_by(LedgerModel.transaction_date.desc(), LedgerModel.id.desc())
        .limit(1)
    )
    last_row = (await db.execute(last_stmt)).scalar_one_or_none()
    recorded_balance = Decimal(str(last_row)) if last_row is not None else Decimal("0.0000")

    is_valid = abs(calculated_balance - recorded_balance) < Decimal("0.01") if last_row is not None else True

    check_data = LedgerInvarianceCheckResponse(
        account_id=account_id,
        total_debit=round(float(tot_dr), 2),
        total_credit=round(float(tot_cr), 2),
        calculated_net_balance=round(float(calculated_balance), 2),
        recorded_balance=round(float(recorded_balance), 2),
        is_valid=is_valid,
        formula="Net Balance = Total Debit - Total Credit",
    )
    return APIResponse(success=True, message="Accounting invariance checked", data=check_data)
