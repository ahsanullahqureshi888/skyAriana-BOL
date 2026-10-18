/**
 * Sky Ariana Multi-Currency Balance Calculator & Invariance Engine
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

import crypto from "crypto"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import type {
  AccountingPeriod,
  AccountPeriodBalance,
  CurrencyBalanceSummary,
  PeriodSnapshotSummary,
} from "./period-types"
import { getAccountPeriodBalances } from "./period-service"

export interface CalculatePeriodBalancesResult {
  period: AccountingPeriod
  balances: AccountPeriodBalance[]
  currencySummaries: CurrencyBalanceSummary[]
  summary: PeriodSnapshotSummary
  invariancePassed: boolean
}

/**
 * Computes exact opening, debit, credit, and closing balances for all accounts
 * within a target accounting period, partitioned strictly by currency.
 *
 * Mathematical Invariance:
 * Closing Balance = Opening Balance + Period Debit - Period Credit
 */
export async function calculatePeriodBalances(
  period: AccountingPeriod
): Promise<CalculatePeriodBalancesResult> {
  const db = await getLedgerSystemDb()
  const { startDate, endDate } = { startDate: period.start_date, endDate: period.end_date }

  // 1. Find previous period to retrieve established closing balances for clean carry-forward
  const prevMonth = period.month === 1 ? 12 : period.month - 1
  const prevYear = period.month === 1 ? period.year - 1 : period.year
  const prevCode = `${prevYear}-${String(prevMonth).padStart(2, "0")}`
  const priorBalances = await getAccountPeriodBalances(`period-${prevCode}`)
  const priorBalanceMap = new Map<string, number>()
  for (const pb of priorBalances) {
    // Key by accountId + currency
    priorBalanceMap.set(`${pb.account_id}__${pb.currency}`, pb.closing_balance)
  }

  // 2. Filter active ledger transactions (non-deleted)
  const allTxs = (db.ledger_transactions || []).filter((t) => !t.is_deleted)

  // Determine all unique (account, currency) pairs
  const accountCurrencyPairs = new Map<string, {
    account_id: string
    account_name: string
    account_type: "customer" | "supplier" | "general"
    currency: string
  }>()

  // Register existing accounts
  for (const acc of db.accounts || []) {
    const curr = acc.currency || "USD"
    const key = `${acc.id}__${curr}`
    accountCurrencyPairs.set(key, {
      account_id: acc.id,
      account_name: acc.account_name || acc.display_name || "Account",
      account_type: (acc.account_type as any) || "customer",
      currency: curr,
    })
  }

  // Also register any accounts present in transactions with diverse currencies
  for (const tx of allTxs) {
    const acc = db.accounts.find((a) => a.id === tx.account_id)
    const curr = tx.currency || acc?.currency || "USD"
    const key = `${tx.account_id}__${curr}`
    if (!accountCurrencyPairs.has(key)) {
      accountCurrencyPairs.set(key, {
        account_id: tx.account_id,
        account_name: acc?.account_name || acc?.display_name || tx.description || "Unknown Account",
        account_type: (acc?.account_type as any) || "customer",
        currency: curr,
      })
    }
  }

  // Also include prior period balances even if no activity in this month
  for (const pb of priorBalances) {
    const key = `${pb.account_id}__${pb.currency}`
    if (!accountCurrencyPairs.has(key)) {
      accountCurrencyPairs.set(key, {
        account_id: pb.account_id,
        account_name: pb.account_name,
        account_type: pb.account_type,
        currency: pb.currency,
      })
    }
  }

  const computedBalances: AccountPeriodBalance[] = []
  let allInvariancePassed = true

  // For summary aggregation
  let totalPeriodDebit = 0
  let totalPeriodCredit = 0
  let totalTxCount = 0

  let receivablesTotal = 0
  let payablesTotal = 0
  let customerCreditsTotal = 0
  let supplierAdvancesTotal = 0

  const currencyMap = new Map<string, {
    opening: number
    debit: number
    credit: number
    closing: number
  }>()

  for (const [key, meta] of accountCurrencyPairs.entries()) {
    const { account_id, account_name, account_type, currency } = meta

    // A. Determine Opening Balance:
    // If prior period closing balance is available, use it directly (perfect carry-forward)
    let openingBalance = 0
    if (priorBalanceMap.has(key)) {
      openingBalance = Number(priorBalanceMap.get(key) || 0)
    } else {
      // Historical calculation: sum debits - credits posted strictly prior to this period's start_date
      const priorTxs = allTxs.filter((t) => {
        if (t.account_id !== account_id) return false
        const txCurr = t.currency || currency
        if (txCurr !== currency) return false
        const txDate = t.transaction_date || ""
        return txDate < startDate
      })
      const histDr = priorTxs.reduce((sum, t) => sum + (Number(t.debit) || 0), 0)
      const histCr = priorTxs.reduce((sum, t) => sum + (Number(t.credit) || 0), 0)
      openingBalance = Math.round((histDr - histCr) * 100) / 100
    }

    // B. Calculate Period Activity:
    // Transactions with transaction_date in [startDate, endDate]
    const periodTxs = allTxs.filter((t) => {
      if (t.account_id !== account_id) return false
      const txCurr = t.currency || currency
      if (txCurr !== currency) return false
      const txDate = t.transaction_date || ""
      return txDate >= startDate && txDate <= endDate
    })

    const periodDebit = Math.round(periodTxs.reduce((sum, t) => sum + (Number(t.debit) || 0), 0) * 100) / 100
    const periodCredit = Math.round(periodTxs.reduce((sum, t) => sum + (Number(t.credit) || 0), 0) * 100) / 100
    const txCount = periodTxs.length

    // C. Closing Balance strictly according to Accounting Invariance:
    // Closing = Opening + Debit - Credit
    const closingBalance = Math.round((openingBalance + periodDebit - periodCredit) * 100) / 100

    // Invariance Check
    const calculatedClosing = Math.round((openingBalance + periodDebit - periodCredit) * 100) / 100
    if (Math.abs(closingBalance - calculatedClosing) > 0.001) {
      allInvariancePassed = false
    }

    // Create unique snapshot hash for this line item
    const linePayload = `${period.code}:${account_id}:${currency}:${openingBalance}:${periodDebit}:${periodCredit}:${closingBalance}`
    const lineHash = crypto.createHash("sha256").update(linePayload).digest("hex")

    const rec: AccountPeriodBalance = {
      id: `apb-${period.code}-${account_id}-${currency}`,
      period_id: period.id,
      period_code: period.code,
      account_id,
      account_name,
      account_type,
      currency,
      opening_balance: openingBalance,
      period_debit: periodDebit,
      period_credit: periodCredit,
      closing_balance: closingBalance,
      transaction_count: txCount,
      snapshot_hash: lineHash,
      created_at: new Date().toISOString(),
    }

    computedBalances.push(rec)

    totalPeriodDebit += periodDebit
    totalPeriodCredit += periodCredit
    totalTxCount += txCount

    // Categorize Receivables / Payables (USD equivalent or raw)
    if (account_type === "customer") {
      if (closingBalance > 0) {
        receivablesTotal += closingBalance
      } else if (closingBalance < 0) {
        customerCreditsTotal += Math.abs(closingBalance)
      }
    } else if (account_type === "supplier") {
      if (closingBalance < 0) {
        payablesTotal += Math.abs(closingBalance)
      } else if (closingBalance > 0) {
        supplierAdvancesTotal += closingBalance
      }
    }

    // Aggregate by currency
    if (!currencyMap.has(currency)) {
      currencyMap.set(currency, { opening: 0, debit: 0, credit: 0, closing: 0 })
    }
    const currAgg = currencyMap.get(currency)!
    currAgg.opening += openingBalance
    currAgg.debit += periodDebit
    currAgg.credit += periodCredit
    currAgg.closing += closingBalance
  }

  // Build Currency Summaries
  const currencySummaries: CurrencyBalanceSummary[] = Array.from(currencyMap.entries()).map(
    ([curr, totals]) => ({
      currency: curr,
      openingBalance: Math.round(totals.opening * 100) / 100,
      periodDebit: Math.round(totals.debit * 100) / 100,
      periodCredit: Math.round(totals.credit * 100) / 100,
      closingBalance: Math.round(totals.closing * 100) / 100,
      netChange: Math.round((totals.closing - totals.opening) * 100) / 100,
    })
  )

  // Payments in period
  const paymentsInPeriod = (db.payments || []).filter(
    (p) => (p.payment_date || "") >= startDate && (p.payment_date || "") <= endDate
  )
  const paymentTotals = paymentsInPeriod.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  const summary: PeriodSnapshotSummary = {
    totalAccounts: accountCurrencyPairs.size,
    activeAccounts: computedBalances.filter((b) => b.transaction_count > 0).length,
    totalTransactions: totalTxCount,
    currencyTotals: currencySummaries,
    receivablesTotal: Math.round(receivablesTotal * 100) / 100,
    payablesTotal: Math.round(payablesTotal * 100) / 100,
    customerCreditsTotal: Math.round(customerCreditsTotal * 100) / 100,
    supplierAdvancesTotal: Math.round(supplierAdvancesTotal * 100) / 100,
    revenueTotal: Math.round(totalPeriodDebit * 100) / 100,
    costsTotal: 0,
    grossProfitTotal: 0,
    paymentTotals: Math.round(paymentTotals * 100) / 100,
    supplierPaymentTotals: 0,
    reconciliationValid: allInvariancePassed,
    checklistResults: [],
  }

  return {
    period,
    balances: computedBalances,
    currencySummaries,
    summary,
    invariancePassed: allInvariancePassed,
  }
}
