from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import models


def ledger_value(transaction: models.Transaction, currency: str) -> float:
    if transaction.currency == currency:
        return float(transaction.amount or 0)
    if transaction.equivalent_currency == currency:
        return float(transaction.equivalent_amount or 0)
    return float(transaction.amount or 0)


def recalculate_customer_ledger(db: Session, customer_id: int) -> None:
    with db.no_autoflush:
        db.execute(delete(models.CustomerLedger).where(models.CustomerLedger.customer_id == customer_id))
        balance = 0.0
        rows = db.scalars(
            select(models.Transaction)
            .where(models.Transaction.customer_id == customer_id)
            .order_by(models.Transaction.date, models.Transaction.id)
        ).all()
        for transaction in rows:
            if transaction.status == "Cancelled":
                debit = credit = 0.0
            elif transaction.type == "Paid":
                debit, credit = float(transaction.amount or 0), 0.0
            else:
                debit, credit = 0.0, float(transaction.amount or 0)
            balance = round(balance + debit - credit, 2)
            db.add(
                models.CustomerLedger(
                    customer_id=customer_id,
                    transaction_id=transaction.id,
                    date=transaction.date,
                    description=transaction.subject,
                    debit=debit,
                    credit=credit,
                    balance=balance,
                )
            )


def recalculate_bank_ledger(db: Session, bank_account_id: int) -> None:
    with db.no_autoflush:
        bank = db.get(models.BankAccount, bank_account_id)
        if not bank:
            return
        db.execute(delete(models.BankLedger).where(models.BankLedger.bank_account_id == bank_account_id))
        balance = float(bank.opening_balance or 0)

        rows = db.scalars(
            select(models.Transaction)
            .where(models.Transaction.bank_account_id == bank_account_id)
            .order_by(models.Transaction.date, models.Transaction.id)
        ).all()
        for transaction in rows:
            value = ledger_value(transaction, bank.currency)
            if transaction.status == "Cancelled":
                debit = credit = 0.0
            elif transaction.type == "Received":
                debit, credit = value, 0.0
            else:
                debit, credit = 0.0, value
            balance = round(balance + debit - credit, 2)
            db.add(
                models.BankLedger(
                    bank_account_id=bank_account_id,
                    transaction_id=transaction.id,
                    date=transaction.date,
                    description=transaction.subject,
                    debit=debit,
                    credit=credit,
                    balance=balance,
                )
            )
        bank.current_balance = round(balance, 2)




def recalculate_after_transaction(db: Session, transaction: models.Transaction, previous_customer_id: int | None = None, previous_bank_id: int | None = None) -> None:
    customer_ids = {transaction.customer_id, previous_customer_id}
    bank_ids = {transaction.bank_account_id, previous_bank_id}
    for customer_id in filter(None, customer_ids):
        recalculate_customer_ledger(db, int(customer_id))
    for bank_id in filter(None, bank_ids):
        recalculate_bank_ledger(db, int(bank_id))


def log_action(db: Session, user_id: int | None, action: str, table_name: str, record_id: int | None, description: str, ip_address: str | None = None, device_info: str | None = None) -> None:
    db.add(
        models.AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            description=description,
            ip_address=ip_address,
            device_info=device_info,
        )
    )

