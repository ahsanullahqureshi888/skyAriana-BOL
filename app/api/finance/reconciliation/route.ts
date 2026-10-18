import { NextResponse } from "next/server"
import { getAllFinanceInvoices, getAllFinancePayments } from "@/lib/services/finance-storage-service"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"

export async function GET() {
  try {
    const [invoices, payments, db] = await Promise.all([
      getAllFinanceInvoices(),
      getAllFinancePayments(),
      getLedgerSystemDb(),
    ])

    // 1. Unallocated payments
    const unallocatedPayments = payments.filter(
      (p) => p.unallocatedCredit > 0 || !p.allocations || p.allocations.length === 0
    )

    // 2. Open / partially paid invoices
    const openInvoices = invoices.filter((i) => i.outstandingAmount > 0 && i.status !== "cancelled")

    // 3. Customer outstanding summaries from canonical ledger
    const activeAccounts = db.accounts.filter(
      (a) => a.status === "active" && Math.abs(Number(a.current_balance) || 0) > 0.01
    )

    return NextResponse.json({
      success: true,
      unallocatedPayments,
      openInvoices,
      activeAccounts,
      stats: {
        totalUnallocatedPaymentsCount: unallocatedPayments.length,
        totalOpenInvoicesCount: openInvoices.length,
        totalActiveAccountsCount: activeAccounts.length,
      },
    })
  } catch (error: any) {
    console.error("[finance/reconciliation API] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
