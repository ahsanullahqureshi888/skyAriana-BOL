import { NextResponse } from "next/server"
import {
  getLedgerSystemDb,
  saveLedgerSystemDb,
  recalculateAccountBalances,
  syncToLegacyStorage,
} from "@/lib/services/ledger-db-service"
import { LedgerTransactionRecord, AuditLogRecord } from "@/lib/types/ledger-system"
import crypto from "crypto"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const currency = searchParams.get("currency")
    const query = (searchParams.get("query") || "").trim().toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))

    const db = await getLedgerSystemDb()
    let txs = db.ledger_transactions.filter((t) => !t.is_deleted)

    if (accountId) {
      txs = txs.filter((t) => t.account_id === accountId)
    }

    if (currency) {
      txs = txs.filter((t) => t.currency === currency)
    }

    if (dateFrom) {
      txs = txs.filter((t) => (t.transaction_date || "") >= dateFrom)
    }

    if (dateTo) {
      txs = txs.filter((t) => (t.transaction_date || "") <= dateTo)
    }

    if (query) {
      txs = txs.filter((t) => {
        const desc = (t.description || "").toLowerCase()
        const ref = (t.reference_number || "").toLowerCase()
        const inv = (t.invoice_number || "").toLowerCase()
        const bol = (t.bol_number || "").toLowerCase()
        const cont = (t.container_number || "").toLowerCase()
        const cons = (t.consignee_name || "").toLowerCase()
        const ship = (t.shipper_name || "").toLowerCase()
        return (
          desc.includes(query) ||
          ref.includes(query) ||
          inv.includes(query) ||
          bol.includes(query) ||
          cont.includes(query) ||
          cons.includes(query) ||
          ship.includes(query)
        )
      })
    }

    const total = txs.length
    const paginated = txs.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      success: true,
      transactions: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("[api/accounting/transactions GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      account_id,
      transaction_date,
      description,
      debit,
      credit,
      currency,
      reference_number,
      invoice_number,
      bol_number,
      container_number,
      remarks,
      user_name,
    } = body

    const postingDate = body.posting_date || transaction_date || new Date().toISOString().split("T")[0]
    await assertAccountingPeriodOpen(postingDate, {
      actor: user_name,
      allowOverride: body.allow_override,
      role: body.user_role,
      entityType: "transaction",
    })

    if (!account_id) {
      return NextResponse.json({ success: false, error: "Account ID is required" }, { status: 400 })
    }

    const dr = Number(debit) || 0
    const cr = Number(credit) || 0

    if (dr === 0 && cr === 0) {
      return NextResponse.json(
        { success: false, error: "At least one amount (Debit or Credit) must be greater than zero." },
        { status: 400 }
      )
    }

    if (dr > 0 && cr > 0) {
      return NextResponse.json(
        { success: false, error: "A single transaction cannot have both Debit and Credit. Please enter separate entries." },
        { status: 400 }
      )
    }

    const db = await getLedgerSystemDb()
    const account = db.accounts.find((a) => a.id === account_id)
    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    const txId = `TX-${account.id}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`
    const txCurrency = currency || account.currency || "USD"

    const newTx: LedgerTransactionRecord = {
      id: txId,
      account_id: account.id,
      transaction_date: transaction_date || new Date().toISOString().split("T")[0],
      transaction_type: cr > 0 ? "payment" : "charge",
      description: description || (cr > 0 ? "Payment Received" : "Logistics Charge"),
      reference_number: reference_number || "",
      invoice_number: invoice_number || "",
      bol_number: bol_number || "",
      container_number: container_number || "",
      debit: dr,
      credit: cr,
      running_balance: 0, // Recalculated below
      currency: txCurrency,
      remarks: remarks || "",
      source_file: "manual",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    db.ledger_transactions.push(newTx)

    // Recalculate balances
    const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)

    // Update account in db
    const accIdx = db.accounts.findIndex((a) => a.id === account.id)
    db.accounts[accIdx] = updatedAccount

    // Update transactions in db
    db.ledger_transactions = db.ledger_transactions.map((t) => {
      const up = updatedTransactions.find((ut) => ut.id === t.id)
      return up || t
    })

    // Add Audit Log
    const auditLog: AuditLogRecord = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      entity_type: "transaction",
      entity_id: txId,
      account_id: account.id,
      action: "create",
      new_value: newTx,
      user: user_name || "Administrator",
      timestamp: new Date().toISOString(),
      reason: "Manual ledger entry created",
    }
    db.audit_logs.push(auditLog)

    await saveLedgerSystemDb(db)
    await syncToLegacyStorage(db)

    const savedTx = db.ledger_transactions.find((t) => t.id === txId)
    return NextResponse.json({ success: true, transaction: savedTx, account: updatedAccount })
  } catch (error: any) {
    console.error("[api/accounting/transactions POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, transaction_date, description, debit, credit, reference_number, invoice_number, bol_number, remarks, reason, user_name } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "Transaction ID is required" }, { status: 400 })
    }

    const db = await getLedgerSystemDb()
    const txIdx = db.ledger_transactions.findIndex((t) => t.id === id)
    if (txIdx === -1) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    const prevTx = db.ledger_transactions[txIdx]
    await assertAccountingPeriodOpen(prevTx.transaction_date, {
      actor: user_name,
      allowOverride: body.allow_override,
      role: body.user_role,
      entityType: "transaction",
      entityId: id,
    })
    if (transaction_date && transaction_date !== prevTx.transaction_date) {
      await assertAccountingPeriodOpen(transaction_date, {
        actor: user_name,
        allowOverride: body.allow_override,
        role: body.user_role,
        entityType: "transaction",
        entityId: id,
      })
    }

    const account = db.accounts.find((a) => a.id === prevTx.account_id)
    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    const dr = debit !== undefined ? Number(debit) || 0 : prevTx.debit
    const cr = credit !== undefined ? Number(credit) || 0 : prevTx.credit

    const updatedTx: LedgerTransactionRecord = {
      ...prevTx,
      transaction_date: transaction_date || prevTx.transaction_date,
      description: description !== undefined ? description : prevTx.description,
      debit: dr,
      credit: cr,
      reference_number: reference_number !== undefined ? reference_number : prevTx.reference_number,
      invoice_number: invoice_number !== undefined ? invoice_number : prevTx.invoice_number,
      bol_number: bol_number !== undefined ? bol_number : prevTx.bol_number,
      remarks: remarks !== undefined ? remarks : prevTx.remarks,
      updated_at: new Date().toISOString(),
    }

    db.ledger_transactions[txIdx] = updatedTx

    // Recalculate
    const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
    const accIdx = db.accounts.findIndex((a) => a.id === account.id)
    db.accounts[accIdx] = updatedAccount

    db.ledger_transactions = db.ledger_transactions.map((t) => {
      const up = updatedTransactions.find((ut) => ut.id === t.id)
      return up || t
    })

    // Audit Log
    const auditLog: AuditLogRecord = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      entity_type: "transaction",
      entity_id: id,
      account_id: account.id,
      action: "edit",
      previous_value: prevTx,
      new_value: updatedTx,
      user: user_name || "Administrator",
      timestamp: new Date().toISOString(),
      reason: reason || "Transaction edited",
    }
    db.audit_logs.push(auditLog)

    await saveLedgerSystemDb(db)
    await syncToLegacyStorage(db)

    return NextResponse.json({ success: true, transaction: updatedTx, account: updatedAccount })
  } catch (error: any) {
    console.error("[api/accounting/transactions PUT] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const reason = searchParams.get("reason") || "Deleted by user"
    const user_name = searchParams.get("user") || "Administrator"

    if (!id) {
      return NextResponse.json({ success: false, error: "Transaction ID is required" }, { status: 400 })
    }

    const db = await getLedgerSystemDb()
    const txIdx = db.ledger_transactions.findIndex((t) => t.id === id)
    if (txIdx === -1) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    const targetTx = db.ledger_transactions[txIdx]
    await assertAccountingPeriodOpen(targetTx.transaction_date, {
      actor: user_name,
      entityType: "transaction",
      entityId: id,
    })

    const account = db.accounts.find((a) => a.id === targetTx.account_id)
    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    // Soft delete
    db.ledger_transactions[txIdx] = {
      ...targetTx,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user_name,
    }

    // Recalculate
    const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
    const accIdx = db.accounts.findIndex((a) => a.id === account.id)
    db.accounts[accIdx] = updatedAccount

    db.ledger_transactions = db.ledger_transactions.map((t) => {
      const up = updatedTransactions.find((ut) => ut.id === t.id)
      return up || t
    })

    // Audit Log
    const auditLog: AuditLogRecord = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      entity_type: "transaction",
      entity_id: id,
      account_id: account.id,
      action: "delete",
      previous_value: targetTx,
      user: user_name,
      timestamp: new Date().toISOString(),
      reason,
    }
    db.audit_logs.push(auditLog)

    await saveLedgerSystemDb(db)
    await syncToLegacyStorage(db)

    return NextResponse.json({ success: true, message: "Transaction soft-deleted successfully", account: updatedAccount })
  } catch (error: any) {
    console.error("[api/accounting/transactions DELETE] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
