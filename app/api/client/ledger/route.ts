import { NextResponse } from "next/server"
import { requireClientSession, assertFinancialAccess } from "@/lib/auth/client-auth"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import { getAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import type { AccountRecord, LedgerTransactionRecord } from "@/lib/types/ledger-system"

export async function GET(req: Request) {
  try {
    const session = await requireClientSession()
    assertFinancialAccess(session)

    const url = new URL(req.url)
    const filterCurrency = (url.searchParams.get("currency") || "").toUpperCase()
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const bolFilter = (url.searchParams.get("bol") || "").trim().toLowerCase()

    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    // 1. Get Accounts from unified ledger system
    const db = await getLedgerSystemDb()
    const allAccounts = db.accounts || []
    
    // Fallback/enrich from local account ledgers if needed
    const oldDb = await getAccountLedgerDatabase()
    const oldAccounts = oldDb.accounts || []

    const matchingAccounts = allAccounts.filter((acc: AccountRecord) => {
      const accId = (acc.id || "").toLowerCase()
      const accName = (acc.account_name || "").toLowerCase()
      const compId = (acc.company_id || acc.customer_id || (acc as any).related_entity_id || "").toLowerCase()

      return (
        compId === companyId ||
        accId === companyId ||
        (companyName && (accName === companyName || accName.includes(companyName) || companyName.includes(accName)))
      )
    })

    const matchingAccountIds = new Set(matchingAccounts.map(a => a.id))

    // 2. Filter Transactions
    let transactions = (db.ledger_transactions || []).filter((tx: LedgerTransactionRecord) => {
      if (!matchingAccountIds.has(tx.account_id)) {
        // also check if account name matches company
        return false
      }
      if (tx.is_deleted) return false
      if (filterCurrency && (tx.currency || "").toUpperCase() !== filterCurrency) return false
      if (startDate && tx.transaction_date < startDate) return false
      if (endDate && tx.transaction_date > endDate) return false
      if (bolFilter && !(tx.bol_number || "").toLowerCase().includes(bolFilter)) return false
      return true
    })

    // If transactions array is empty in unified DB, check legacy store for account entries
    if (transactions.length === 0 && oldDb.ledgerEntries) {
      Object.entries(oldDb.ledgerEntries).forEach(([accKey, rows]) => {
        const cleanKey = accKey.toLowerCase()
        const isMatch = cleanKey === companyId || (companyName && cleanKey.includes(companyName))
        if (isMatch && Array.isArray(rows)) {
          rows.forEach((r: any, index: number) => {
            if (filterCurrency && (r.currency || "USD").toUpperCase() !== filterCurrency) return
            if (startDate && r.date < startDate) return
            if (endDate && r.date > endDate) return
            if (bolFilter && !(r.barnamehNo || r.bolNo || "").toLowerCase().includes(bolFilter)) return

            transactions.push({
              id: r.id || `tx-legacy-${index}`,
              account_id: accKey,
              transaction_date: r.date || "",
              transaction_type: r.debit ? "invoice" : "payment",
              description: r.description || r.details || "",
              reference_number: r.reference || r.refNo || "",
              invoice_number: r.invoiceNo || "",
              bol_number: r.barnamehNo || r.bolNo || "",
              debit: Number(r.debit) || 0,
              credit: Number(r.credit) || 0,
              running_balance: Number(r.balance) || 0,
              currency: (r.currency || "USD").toUpperCase(),
              created_at: r.date || new Date().toISOString(),
              updated_at: r.date || new Date().toISOString(),
            })
          })
        }
      })
    }

    // Sort chronologically ascending
    transactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())

    // Group summary by currency
    const summaryByCurrency: Record<string, {
      currency: string
      totalDebit: number
      totalCredit: number
      netBalance: number
      transactionCount: number
      isCreditBalance: boolean
      creditFormatted: string
    }> = {}

    // Track running balance calculation per currency to satisfy Invariance: Balance = Debit - Credit
    const runningCalc: Record<string, number> = {}

    const calculatedTransactions = transactions.map(tx => {
      const cur = (tx.currency || "USD").toUpperCase()
      if (!runningCalc[cur]) runningCalc[cur] = 0
      runningCalc[cur] += (Number(tx.debit) || 0) - (Number(tx.credit) || 0)

      if (!summaryByCurrency[cur]) {
        summaryByCurrency[cur] = {
          currency: cur,
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0,
          transactionCount: 0,
          isCreditBalance: false,
          creditFormatted: "",
        }
      }

      summaryByCurrency[cur].totalDebit += Number(tx.debit) || 0
      summaryByCurrency[cur].totalCredit += Number(tx.credit) || 0
      summaryByCurrency[cur].netBalance = runningCalc[cur]
      summaryByCurrency[cur].transactionCount += 1

      return {
        id: tx.id,
        date: tx.transaction_date,
        type: tx.transaction_type,
        description: tx.description,
        reference: tx.reference_number || tx.invoice_number || "-",
        bolNumber: tx.bol_number || "-",
        debit: Number(tx.debit) || 0,
        credit: Number(tx.credit) || 0,
        runningBalance: Math.round(runningCalc[cur] * 100) / 100,
        currency: cur,
      }
    })

    // Format available credits
    Object.values(summaryByCurrency).forEach(sum => {
      sum.totalDebit = Math.round(sum.totalDebit * 100) / 100
      sum.totalCredit = Math.round(sum.totalCredit * 100) / 100
      sum.netBalance = Math.round(sum.netBalance * 100) / 100
      if (sum.netBalance < 0) {
        sum.isCreditBalance = true
        sum.creditFormatted = `Available Credit: ${sum.currency} ${Math.abs(sum.netBalance).toLocaleString()}`
      }
    })

    return NextResponse.json({
      success: true,
      company: {
        id: session.companyId,
        name: session.companyName,
      },
      summary: summaryByCurrency,
      transactions: calculatedTransactions,
    })
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Ledger API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
