import { NextResponse } from "next/server"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import { getAllInvoices } from "@/lib/services/invoice-storage-service"
import { roundMoney, subtractMoney } from "@/lib/accounting/money"

export interface IntegrityIssue {
  id: string
  type: string
  bolNumber: string
  invoiceNumber: string
  accountName: string
  expected: number | string
  actual: number | string
  difference: number | string
  severity: "high" | "medium" | "low"
  action: string
}

export async function GET() {
  try {
    const db = await getLedgerSystemDb()
    const invoices = await getAllInvoices()

    const issues: IntegrityIssue[] = []
    const bolAccountingList = db.bol_accounting || []
    const bolChargesList = db.bol_charges || []
    const transactions = db.ledger_transactions.filter((t) => !t.is_deleted)
    const allocations = db.payment_allocations || []

    for (const ba of bolAccountingList) {
      const account = db.accounts.find((a) => a.id === ba.account_id)
      const accountName = account?.account_name || ba.bill_to_company_name

      // 1. Verify Charges Total matches BolAccounting total
      const charges = bolChargesList.filter((c) => c.bol_id === ba.bol_id)
      const chargesSum = charges.reduce((s, c) => s + (c.amount || 0), 0)

      if (ba.accounting_status === "POSTED" && Math.abs(subtractMoney(chargesSum, ba.total_charges)) > 0.05) {
        issues.push({
          id: `ISSUE-CHG-${ba.bol_id}`,
          type: "Charges vs Summary Mismatch",
          bolNumber: ba.bol_number,
          invoiceNumber: ba.invoice_number || "—",
          accountName,
          expected: chargesSum,
          actual: ba.total_charges,
          difference: roundMoney(chargesSum - ba.total_charges),
          severity: "high",
          action: "Recompute charges or save BOL accounting",
        })
      }

      // 2. Verify Posted BOL has a matching Ledger Debit Transaction
      if (ba.accounting_status === "POSTED") {
        const matchingDebit = transactions.filter(
          (t) =>
            t.account_id === ba.account_id &&
            t.debit > 0 &&
            (t.bol_id === ba.bol_id || t.bol_number === ba.bol_number) &&
            t.source_file === "BOL_SYSTEM"
        )

        if (matchingDebit.length === 0) {
          issues.push({
            id: `ISSUE-MISSING-TX-${ba.bol_id}`,
            type: "Missing Ledger Transaction",
            bolNumber: ba.bol_number,
            invoiceNumber: ba.invoice_number || "—",
            accountName,
            expected: ba.total_charges,
            actual: 0,
            difference: ba.total_charges,
            severity: "high",
            action: "Re-post BOL to ledger",
          })
        } else if (matchingDebit.length > 1) {
          issues.push({
            id: `ISSUE-DUP-TX-${ba.bol_id}`,
            type: "Duplicate Ledger Posting",
            bolNumber: ba.bol_number,
            invoiceNumber: ba.invoice_number || "—",
            accountName,
            expected: 1,
            actual: matchingDebit.length,
            difference: matchingDebit.length - 1,
            severity: "high",
            action: "Remove duplicate posting entry",
          })
        }
      }

      // 3. Verify Payment Allocations vs Amount Paid
      const bolAllocations = allocations.filter((a) => a.bol_id === ba.bol_id)
      const allocSum = bolAllocations.reduce((s, a) => s + (a.allocated_amount || 0), 0)

      if (Math.abs(subtractMoney(allocSum, ba.amount_paid)) > 0.05) {
        issues.push({
          id: `ISSUE-ALLOC-${ba.bol_id}`,
          type: "Payment Allocation Mismatch",
          bolNumber: ba.bol_number,
          invoiceNumber: ba.invoice_number || "—",
          accountName,
          expected: allocSum,
          actual: ba.amount_paid,
          difference: roundMoney(allocSum - ba.amount_paid),
          severity: "medium",
          action: "Re-sync payment allocations",
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: bolAccountingList.length,
      issuesCount: issues.length,
      issues,
    })
  } catch (error: any) {
    console.error("[api/accounting/integrity GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
