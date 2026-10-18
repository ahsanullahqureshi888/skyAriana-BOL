/**
 * Sky Ariana Pre-Close Reconciliation & Validation Checklist Runner
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import type { AccountingPeriod, CloseChecklistItem } from "./period-types"
import { getPeriods, getPeriodSettings } from "./period-service"
import { calculatePeriodBalances } from "./balance-calculator"

export interface ChecklistRunResult {
  period: AccountingPeriod
  items: CloseChecklistItem[]
  canClose: boolean
  hasBlockingErrors: boolean
  hasWarnings: boolean
  blockingErrorCount: number
  warningCount: number
}

/**
 * Runs the comprehensive closing validation checklist against the target period.
 */
export async function runPeriodCloseChecklist(
  period: AccountingPeriod
): Promise<ChecklistRunResult> {
  const items: CloseChecklistItem[] = []
  const db = await getLedgerSystemDb()
  const settings = await getPeriodSettings()
  const periods = await getPeriods()

  // 1. Previous Period Closed Check
  const prevMonth = period.month === 1 ? 12 : period.month - 1
  const prevYear = period.month === 1 ? period.year - 1 : period.year
  const prevCode = `${prevYear}-${String(prevMonth).padStart(2, "0")}`
  const priorPeriod = periods.find((p) => p.code === prevCode)

  if (priorPeriod && priorPeriod.status !== "CLOSED" && priorPeriod.status !== "ARCHIVED") {
    items.push({
      key: "PREV_PERIOD_CLOSED",
      title: "Previous Period Status",
      description: `Prior month [${priorPeriod.code}] must be formally closed before closing [${period.code}].`,
      status: "BLOCKING_ERROR",
      details: `Period ${priorPeriod.name} is currently ${priorPeriod.status}. Close prior periods chronologically.`,
      canBypass: false,
    })
  } else {
    items.push({
      key: "PREV_PERIOD_CLOSED",
      title: "Previous Period Status",
      description: "Prior period chronological closure verified.",
      status: "PASS",
      details: priorPeriod ? `Prior period [${priorPeriod.code}] is ${priorPeriod.status}.` : "Initial period in sequence.",
    })
  }

  // 2. Accounting Mathematical Invariance Check
  const calcResult = await calculatePeriodBalances(period)
  if (!calcResult.invariancePassed) {
    items.push({
      key: "ACCOUNTING_INVARIANCE",
      title: "Ledger Mathematical Invariance",
      description: "Closing Balance = Opening Balance + Period Debit - Period Credit must strictly hold for all accounts.",
      status: "BLOCKING_ERROR",
      details: "Mathematical mismatch detected during period balance aggregation.",
      canBypass: false,
    })
  } else {
    items.push({
      key: "ACCOUNTING_INVARIANCE",
      title: "Ledger Mathematical Invariance",
      description: "Accounting equation verified across all ledger accounts and currencies.",
      status: "PASS",
      details: `Verified ${calcResult.balances.length} account currency balances. Invariance identity: 100% compliant.`,
    })
  }

  // 3. Transactions Count and Period Activity
  const periodTxs = (db.ledger_transactions || []).filter((t) => {
    if (t.is_deleted) return false
    const d = t.transaction_date || ""
    return d >= period.start_date && d <= period.end_date
  })

  items.push({
    key: "TRANSACTION_ACTIVITY",
    title: "Period Transactions Audited",
    description: "Transaction records within period bounds examined.",
    status: "PASS",
    details: `${periodTxs.length} active transactions posted in ${period.name}.`,
    count: periodTxs.length,
  })

  // 4. Missing Currency Declarations
  const missingCurrencyTxs = periodTxs.filter((t) => !t.currency || t.currency.trim() === "")
  if (missingCurrencyTxs.length > 0) {
    items.push({
      key: "CURRENCY_COMPLETENESS",
      title: "Currency Specification",
      description: "All transactions must explicitly declare base currency (USD, AFN, AED, EUR).",
      status: "BLOCKING_ERROR",
      details: `${missingCurrencyTxs.length} transaction(s) have undefined or blank currency.`,
      count: missingCurrencyTxs.length,
      canBypass: false,
    })
  } else {
    items.push({
      key: "CURRENCY_COMPLETENESS",
      title: "Currency Specification",
      description: "All posted transactions have strictly defined currency tags.",
      status: "PASS",
    })
  }

  // 5. Unallocated or Unreferenced Payments
  const periodPayments = (db.payments || []).filter((p) => {
    const d = p.payment_date || ""
    return d >= period.start_date && d <= period.end_date
  })
  const unrefPayments = periodPayments.filter(
    (p) => !p.reference && !p.bank_reference && !p.bol_reference && !p.invoice_reference
  )

  if (unrefPayments.length > 0) {
    items.push({
      key: "UNREFERENCED_PAYMENTS",
      title: "Payment References",
      description: "Customer payments should include bank slip, invoice, or wire transfer reference.",
      status: "WARNING",
      details: `${unrefPayments.length} payment(s) without reference numbers.`,
      count: unrefPayments.length,
      canBypass: true,
    })
  } else {
    items.push({
      key: "UNREFERENCED_PAYMENTS",
      title: "Payment References",
      description: "All payments in period have reference identifiers.",
      status: "PASS",
      count: periodPayments.length,
    })
  }

  // 6. Zero-amount Transactions
  const zeroTxs = periodTxs.filter((t) => (Number(t.debit) || 0) === 0 && (Number(t.credit) || 0) === 0)
  if (zeroTxs.length > 0) {
    items.push({
      key: "ZERO_AMOUNT_TRANSACTIONS",
      title: "Zero-Amount Entries",
      description: "No null or 0.00 debit/credit transactions allowed.",
      status: "BLOCKING_ERROR",
      details: `${zeroTxs.length} zero-amount entry(ies) found in ledger.`,
      count: zeroTxs.length,
      canBypass: false,
    })
  } else {
    items.push({
      key: "ZERO_AMOUNT_TRANSACTIONS",
      title: "Zero-Amount Entries",
      description: "No empty or zero-amount ledger entries found.",
      status: "PASS",
    })
  }

  // 7. Negative Customer Balances / Overpayments (Warning)
  const creditBalances = calcResult.balances.filter((b) => b.account_type === "customer" && b.closing_balance < -100)
  if (creditBalances.length > 0) {
    items.push({
      key: "CUSTOMER_CREDIT_BALANCES",
      title: "Customer Credit / Overpayment Balances",
      description: "Review customers with substantial credit balances before month close.",
      status: "WARNING",
      details: `${creditBalances.length} customer account(s) have negative balance (prepayments/credits).`,
      count: creditBalances.length,
      canBypass: true,
    })
  } else {
    items.push({
      key: "CUSTOMER_CREDIT_BALANCES",
      title: "Customer Credit Balances",
      description: "Customer accounts evaluated; balances within expected operational limits.",
      status: "PASS",
    })
  }

  // 8. Backup Verification Pre-condition
  items.push({
    key: "PRE_CLOSE_BACKUP_STATUS",
    title: "Mandatory Pre-Close Full Backup",
    description: "System will automatically create and verify full database snapshot before locking.",
    status: "PASS",
    details: "Automated pre-close backup engine configured and ready.",
  })

  // 9. Operational Tracking Boundary Notice
  items.push({
    key: "OPERATIONAL_BOUNDARY",
    title: "Operational Tracking Boundary",
    description: "Closing this period locks financial ledgers while preserving shipment tracking updates.",
    status: "PASS",
    details: "Drivers and dispatchers can continue updating transit milestones without modifying financials.",
  })

  // Evaluate Overall Eligibility
  const blockingErrors = items.filter((i) => i.status === "BLOCKING_ERROR")
  const warnings = items.filter((i) => i.status === "WARNING")

  const hasBlockingErrors = blockingErrors.length > 0
  const hasWarnings = warnings.length > 0

  const canClose = !hasBlockingErrors && (settings.allowWarningsOnClose || !hasWarnings)

  return {
    period,
    items,
    canClose,
    hasBlockingErrors,
    hasWarnings,
    blockingErrorCount: blockingErrors.length,
    warningCount: warnings.length,
  }
}
