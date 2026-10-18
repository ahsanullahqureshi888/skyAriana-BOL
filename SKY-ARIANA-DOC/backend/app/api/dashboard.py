from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from decimal import Decimal
from app.database.session import get_db
from app.core.security import require_permission
from app.models.models import Invoice, Customer, Payment, ActivityLog, User
from app.schemas.schemas import DashboardSummary, MonthlyTotal, DashboardRecentActivity, InvoiceListItem, CustomerOut, PaymentOut, ActivityLogOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(require_permission("dashboard.view"))):
    invoices = db.query(Invoice).all()
    
    total_invoices = len(invoices)
    paid_invoices = sum(1 for i in invoices if i.status == "paid")
    unpaid_invoices = sum(1 for i in invoices if i.status == "unpaid")
    partial_invoices = sum(1 for i in invoices if i.status == "partial")
    
    today = date.today()
    overdue_invoices = sum(1 for i in invoices if i.status != "paid" and i.due_date < today)
    
    total_amount = sum(i.grand_total for i in invoices)
    amount_received = sum(i.paid_amount for i in invoices)
    outstanding_balance = sum(i.remaining_balance for i in invoices)
    
    return DashboardSummary(
        total_invoices=total_invoices,
        paid_invoices=paid_invoices,
        unpaid_invoices=unpaid_invoices,
        partial_invoices=partial_invoices,
        overdue_invoices=overdue_invoices,
        total_amount=total_amount,
        amount_received=amount_received,
        outstanding_balance=outstanding_balance
    )

@router.get("/monthly-totals", response_model=List[MonthlyTotal])
def get_monthly_totals(db: Session = Depends(get_db), current_user: User = Depends(require_permission("dashboard.view"))):
    invoices = db.query(Invoice).all()
    
    grouped = {}
    for i in invoices:
        month_str = i.invoice_date.strftime("%Y-%m")
        if month_str not in grouped:
            grouped[month_str] = {"total": Decimal("0.00"), "received": Decimal("0.00")}
        grouped[month_str]["total"] += i.grand_total
        grouped[month_str]["received"] += i.paid_amount
        
    results = []
    for m in sorted(grouped.keys()):
        results.append(MonthlyTotal(
            month=m,
            total=grouped[m]["total"],
            received=grouped[m]["received"]
        ))
        
    if not results:
        results = [
            MonthlyTotal(month=date.today().strftime("%Y-%m"), total=Decimal("0.00"), received=Decimal("0.00"))
        ]
        
    return results

@router.get("/recent-activity", response_model=DashboardRecentActivity)
def get_recent_activity(db: Session = Depends(get_db), current_user: User = Depends(require_permission("dashboard.view"))):
    latest_invs = db.query(Invoice).order_by(Invoice.created_at.desc()).limit(5).all()
    latest_invoices = []
    for inv in latest_invs:
        latest_invoices.append(InvoiceListItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            currency=inv.currency,
            status=inv.status,
            grand_total=inv.grand_total,
            paid_amount=inv.paid_amount,
            remaining_balance=inv.remaining_balance,
            customer_name=inv.customer.company_name,
            created_by_name=inv.creator.name
        ))
        
    latest_custs = db.query(Customer).order_by(Customer.created_at.desc()).limit(5).all()
    recent_pmts = db.query(Payment).order_by(Payment.created_at.desc()).limit(5).all()
    
    recent_logs_db = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10).all()
    recent_logs = []
    for l in recent_logs_db:
        recent_logs.append(ActivityLogOut(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else "System",
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            details=l.details,
            created_at=l.created_at
        ))
        
    return DashboardRecentActivity(
        latest_invoices=latest_invoices,
        latest_customers=latest_custs,
        recent_payments=recent_pmts,
        recent_logs=recent_logs
    )

@router.get("/logs", response_model=List[ActivityLogOut])
def get_all_logs(
    search: str = None,
    action: str = None,
    entity_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("activity.view"))
):
    query = db.query(ActivityLog)
    if search:
        query = query.filter(ActivityLog.details.like(f"%{search}%"))
    if action:
        query = query.filter(ActivityLog.action == action)
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
        
    logs = query.order_by(ActivityLog.created_at.desc()).limit(100).all()
    results = []
    for l in logs:
        results.append(ActivityLogOut(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else "System",
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            details=l.details,
            created_at=l.created_at
        ))
    return results
