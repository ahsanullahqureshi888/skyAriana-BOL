import { NextResponse } from "next/server"
import {
  getLedgerSystemDb,
  saveLedgerSystemDb,
  recalculateAccountBalances,
  syncToLegacyStorage,
} from "@/lib/services/ledger-db-service"
import { AuditLogRecord } from "@/lib/types/ledger-system"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { primary_account_id, duplicate_account_id, is_preview, user_name, reason } = body

    if (!primary_account_id || !duplicate_account_id) {
      return NextResponse.json(
        { success: false, error: "Both primary_account_id and duplicate_account_id are required" },
        { status: 400 }
      )
    }

    if (primary_account_id === duplicate_account_id) {
      return NextResponse.json(
        { success: false, error: "Cannot merge an account into itself" },
        { status: 400 }
      )
    }

    const db = await getLedgerSystemDb()
    const primary = db.accounts.find((a) => a.id === primary_account_id)
    const duplicate = db.accounts.find((a) => a.id === duplicate_account_id)

    if (!primary || !duplicate) {
      return NextResponse.json({ success: false, error: "One or both accounts could not be found" }, { status: 404 })
    }

    const txsToMove = db.ledger_transactions.filter((t) => t.account_id === duplicate.id && !t.is_deleted)
    const paymentsToMove = db.payments.filter((p) => p.account_id === duplicate.id)

    const resultingDebit = Math.round((primary.total_debit + duplicate.total_debit) * 100) / 100
    const resultingCredit = Math.round((primary.total_credit + duplicate.total_credit) * 100) / 100
    const resultingBalance = Math.round((resultingDebit - resultingCredit) * 100) / 100

    const preview = {
      primaryAccount: primary,
      duplicateAccount: duplicate,
      transactionsCount: txsToMove.length,
      paymentsCount: paymentsToMove.length,
      currentPrimaryBalance: primary.current_balance,
      duplicateBalance: duplicate.current_balance,
      resultingDebit,
      resultingCredit,
      resultingBalance,
    }

    if (is_preview) {
      return NextResponse.json({ success: true, preview })
    }

    // Execute Merge:
    // 1. Reassign transactions to primary account
    for (const tx of txsToMove) {
      tx.account_id = primary.id
      tx.remarks = `${tx.remarks ? tx.remarks + " | " : ""}Merged from ${duplicate.account_name}`
      tx.updated_at = new Date().toISOString()
    }

    // 2. Reassign payments to primary account
    for (const p of paymentsToMove) {
      p.account_id = primary.id
      p.notes = `${p.notes ? p.notes + " | " : ""}Merged from ${duplicate.account_name}`
    }

    // 3. Add duplicate aliases to primary
    const mergedAliases = Array.from(
      new Set([...primary.aliases, duplicate.account_name, duplicate.display_name, ...duplicate.aliases])
    )
    primary.aliases = mergedAliases

    // 4. Mark duplicate as merged
    duplicate.status = "merged"
    duplicate.merged_into = primary.id
    duplicate.updated_at = new Date().toISOString()

    // 5. Recalculate primary account balances
    const { updatedAccount, updatedTransactions } = recalculateAccountBalances(primary, db.ledger_transactions)
    const pIdx = db.accounts.findIndex((a) => a.id === primary.id)
    db.accounts[pIdx] = updatedAccount

    db.ledger_transactions = db.ledger_transactions.map((t) => {
      const up = updatedTransactions.find((ut) => ut.id === t.id)
      return up || t
    })

    // 6. Audit Log
    const auditLog: AuditLogRecord = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      entity_type: "account",
      entity_id: primary.id,
      account_id: primary.id,
      action: "merge",
      previous_value: { primaryId: primary.id, duplicateId: duplicate.id },
      new_value: preview,
      user: user_name || "Administrator",
      timestamp: new Date().toISOString(),
      reason: reason || `Merged ${duplicate.account_name} into ${primary.account_name}`,
    }
    db.audit_logs.push(auditLog)

    await saveLedgerSystemDb(db)
    await syncToLegacyStorage(db)

    return NextResponse.json({
      success: true,
      message: `Successfully merged "${duplicate.account_name}" into "${primary.account_name}".`,
      primaryAccount: updatedAccount,
    })
  } catch (error: any) {
    console.error("[api/accounting/merge POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
