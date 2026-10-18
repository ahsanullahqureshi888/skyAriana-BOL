import { NextResponse } from "next/server"
import {
  getLedgerSystemDb,
  saveLedgerSystemDb,
  recalculateAccountBalances,
  syncToLegacyStorage,
} from "@/lib/services/ledger-db-service"
import { PaymentRecord, LedgerTransactionRecord, AuditLogRecord } from "@/lib/types/ledger-system"
import crypto from "crypto"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const db = await getLedgerSystemDb()

    let payments = db.payments
    if (accountId) {
      payments = payments.filter((p) => p.account_id === accountId)
    }

    payments.sort((a, b) => (b.payment_date || "").localeCompare(a.payment_date || ""))

    return NextResponse.json({ success: true, payments })
  } catch (error: any) {
    console.error("[api/accounting/payments GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      account_id,
      payment_date,
      amount,
      currency,
      payment_method,
      reference,
      bank_reference,
      bol_reference,
      invoice_reference,
      notes,
      user_name,
    } = body

    const postingDate = body.posting_date || payment_date || new Date().toISOString().split("T")[0]
    await assertAccountingPeriodOpen(postingDate, {
      actor: user_name,
      allowOverride: body.allow_override,
      role: body.user_role,
      entityType: "payment",
    })

    if (!account_id) {
      return NextResponse.json({ success: false, error: "Account ID is required" }, { status: 400 })
    }

    const payAmount = Number(amount) || 0
    if (payAmount <= 0) {
      return NextResponse.json({ success: false, error: "Payment amount must be greater than zero." }, { status: 400 })
    }

    const db = await getLedgerSystemDb()
    const account = db.accounts.find((a) => a.id === account_id)
    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`
    const payCurrency = currency || account.currency || "USD"

    const paymentRecord: PaymentRecord = {
      id: paymentId,
      account_id: account.id,
      payment_date: payment_date || new Date().toISOString().split("T")[0],
      amount: payAmount,
      currency: payCurrency,
      payment_method: payment_method || "Cash",
      reference: reference || "",
      bank_reference: bank_reference || "",
      bol_reference: bol_reference || "",
      invoice_reference: invoice_reference || "",
      notes: notes || "",
      created_by: user_name || "Administrator",
      created_at: new Date().toISOString(),
    }

    db.payments.push(paymentRecord)

    // Automatically create Credit ledger transaction
    const txId = `TX-${account.id}-${paymentId}`
    const creditTx: LedgerTransactionRecord = {
      id: txId,
      account_id: account.id,
      transaction_date: paymentRecord.payment_date,
      transaction_type: "payment",
      description: `Payment Received (${paymentRecord.payment_method})${paymentRecord.reference ? ` - Ref: ${paymentRecord.reference}` : ""}`,
      reference_number: paymentRecord.reference || paymentRecord.bank_reference || paymentRecord.bol_reference || "",
      invoice_number: paymentRecord.invoice_reference || "",
      bol_number: paymentRecord.bol_reference || "",
      debit: 0,
      credit: payAmount,
      running_balance: 0, // Recalculated below
      currency: payCurrency,
      remarks: notes || `Payment recorded via ${paymentRecord.payment_method}`,
      source_file: "manual-payment",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    db.ledger_transactions.push(creditTx)

    // Recalculate balances
    const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
    const accIdx = db.accounts.findIndex((a) => a.id === account.id)
    db.accounts[accIdx] = updatedAccount

    db.ledger_transactions = db.ledger_transactions.map((t) => {
      const up = updatedTransactions.find((ut) => ut.id === t.id)
      return up || t
    })

    // Audit log
    const auditLog: AuditLogRecord = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      entity_type: "payment",
      entity_id: paymentId,
      account_id: account.id,
      action: "create",
      new_value: paymentRecord,
      user: user_name || "Administrator",
      timestamp: new Date().toISOString(),
      reason: `Recorded payment of ${payAmount} ${payCurrency}`,
    }
    db.audit_logs.push(auditLog)

    await saveLedgerSystemDb(db)
    await syncToLegacyStorage(db)

    return NextResponse.json({
      success: true,
      payment: paymentRecord,
      transaction: creditTx,
      account: updatedAccount,
    })
  } catch (error: any) {
    console.error("[api/accounting/payments POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
