import { NextResponse } from "next/server"
import { getLedgerSystemDb, saveLedgerSystemDb, recalculateAccountBalances } from "@/lib/services/ledger-db-service"
import { readJsonFile } from "@/lib/services/blob-db"
import { getDataPath } from "@/lib/server-paths"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const db = await getLedgerSystemDb()

    const account = db.accounts.find((a) => a.id === id || a.account_name === id || a.display_name === id)
    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    const transactions = db.ledger_transactions
      .filter((t) => t.account_id === account.id && !t.is_deleted)
      .sort((a, b) => {
        if (a.source_row && b.source_row && a.source_sheet === b.source_sheet) {
          return a.source_row - b.source_row
        }
        return (a.transaction_date || "").localeCompare(b.transaction_date || "")
      })

    const payments = db.payments.filter((p) => p.account_id === account.id)

    // Load linked shipments and BOLs from existing database files
    const shipmentsFile = getDataPath(".local-shipments.json")
    const savedShipments = await readJsonFile<any[]>(shipmentsFile, [])
    const linkedShipments = savedShipments.filter((s) => {
      const matchShipper = (s.shipper_name || "").toLowerCase().includes(account.account_name.toLowerCase())
      const matchConsignee = (s.consignee_name || "").toLowerCase().includes(account.account_name.toLowerCase())
      const matchCompany = (s.company || "").toLowerCase().includes(account.account_name.toLowerCase())
      return matchShipper || matchConsignee || matchCompany
    })

    const bolsFile = getDataPath(".local-bols.json")
    const savedBols = await readJsonFile<any[]>(bolsFile, [])
    const linkedBols = savedBols.filter((b) => {
      const matchShipper = (b.shipper_name || "").toLowerCase().includes(account.account_name.toLowerCase())
      const matchConsignee = (b.consignee_name || "").toLowerCase().includes(account.account_name.toLowerCase())
      return matchShipper || matchConsignee
    })

    const lastTxDate =
      transactions.length > 0 ? transactions[transactions.length - 1].transaction_date : account.created_at

    return NextResponse.json({
      success: true,
      account,
      transactions,
      payments,
      linkedShipments,
      linkedBols,
      stats: {
        totalDebit: account.total_debit,
        totalCredit: account.total_credit,
        currentBalance: account.current_balance,
        openingBalance: account.opening_balance,
        transactionCount: transactions.length,
        paymentCount: payments.length,
        lastTransactionDate: lastTxDate,
        linkedShipmentCount: linkedShipments.length,
        linkedBolCount: linkedBols.length,
      },
    })
  } catch (error: any) {
    console.error("[api/accounting/ledgers/[id] GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const db = await getLedgerSystemDb()

    const accIdx = db.accounts.findIndex((a) => a.id === id)
    if (accIdx === -1) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    const currentAcc = db.accounts[accIdx]

    if (body.currency && body.currency !== currentAcc.currency) {
      const hasTransactions = db.ledger_transactions.some(
        (t) => t.account_id === id && !t.is_deleted
      )
      if (hasTransactions) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot change currency of account [${currentAcc.account_name}] from ${currentAcc.currency} to ${body.currency} because active ledger transactions exist. Multi-currency segregation requires creating a separate currency sub-account or running an authorized ledger currency conversion.`
          },
          { status: 400 }
        )
      }
    }

    const updatedAcc = {
      ...currentAcc,
      display_name: body.display_name?.trim() || currentAcc.display_name,
      account_type: body.account_type || currentAcc.account_type,
      currency: body.currency || currentAcc.currency,
      aliases: Array.isArray(body.aliases) ? body.aliases : currentAcc.aliases,
      notes: body.notes !== undefined ? body.notes : currentAcc.notes,
      status: body.status || currentAcc.status,
      updated_at: new Date().toISOString(),
    }

    db.accounts[accIdx] = updatedAcc
    await saveLedgerSystemDb(db)

    return NextResponse.json({ success: true, account: updatedAcc })
  } catch (error: any) {
    console.error("[api/accounting/ledgers/[id] PATCH] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
