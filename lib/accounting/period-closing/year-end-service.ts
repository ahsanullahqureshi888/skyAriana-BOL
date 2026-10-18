/**
 * Sky Ariana Fiscal Year-End Closing & Annual Rollover Service
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

import crypto from "crypto"
import { createFullSystemBackup } from "@/lib/backup/create-backup"
import type {
  AccountingPeriod,
  AccountPeriodBalance,
  PeriodSnapshot,
  YearEndCloseOptions,
} from "./period-types"
import {
  getPeriods,
  savePeriods,
  getPeriodSettings,
  savePeriodSettings,
  saveAccountPeriodBalances,
  getAccountPeriodBalances,
  savePeriodSnapshots,
  getPeriodSnapshots,
  logPeriodAudit,
  buildPeriodDates,
  getMonthName,
  formatPeriodCode,
} from "./period-service"

export interface YearEndCloseResult {
  success: boolean
  year: number
  annualSnapshot: PeriodSnapshot
  nextYearPeriod: AccountingPeriod
  yearEndBackupId: string
  accountsRolledOver: number
  message: string
}

/**
 * Validates and executes the formal fiscal year-end close.
 * All 12 monthly periods of the year must be CLOSED.
 * Rolls December closing balances forward to January opening balances of next year.
 */
export async function executeYearEndClose(
  options: YearEndCloseOptions
): Promise<YearEndCloseResult> {
  const { year, actor, notes } = options
  const periods = await getPeriods()

  // 1. Verify all 12 months for this year are CLOSED
  const yearMonthlyPeriods = periods.filter((p) => p.year === year && p.period_type === "MONTHLY")
  if (yearMonthlyPeriods.length < 12) {
    throw new Error(`Cannot execute Year-End Close for ${year}: Only ${yearMonthlyPeriods.length} of 12 monthly periods exist.`)
  }

  const unclosedMonths = yearMonthlyPeriods.filter((p) => p.status !== "CLOSED" && p.status !== "ARCHIVED")
  if (unclosedMonths.length > 0) {
    const names = unclosedMonths.map((m) => `${m.name} (${m.status})`).join(", ")
    throw new Error(`Cannot close fiscal year ${year}: The following months are not finalized: ${names}. All 12 months must be CLOSED first.`)
  }

  // 2. Fetch December Closing Balances
  const decCode = `${year}-12`
  const decBalances = await getAccountPeriodBalances(`period-${decCode}`)
  if (decBalances.length === 0) {
    throw new Error(`Cannot find finalized balances for December ${year} [period-${decCode}]. Ensure December is formally closed before year-end wrap.`)
  }

  // 3. Mandatory Year-End Full Backup
  let yearEndBackupId = ""
  try {
    const backupResult = await createFullSystemBackup({
      type: "FULL",
      actor,
      note: `Fiscal Year ${year} Year-End Final Archive (Dec 31 Closing Roll-Forward)`,
      protected: true,
    })
    yearEndBackupId = backupResult.backupItem.id
  } catch (err: any) {
    console.error("[YearEndClose] Backup failed:", err)
    throw new Error(`Year-end safe archive failed: ${err.message}. Aborting year-end closing.`)
  }

  // 4. Create or Ensure January Period of Next Year
  const nextYear = year + 1
  const janCode = `${nextYear}-01`
  let allPeriods = await getPeriods()
  let janPeriod = allPeriods.find((p) => p.code === janCode)

  const nowIso = new Date().toISOString()
  if (!janPeriod) {
    const dates = buildPeriodDates(nextYear, 1)
    janPeriod = {
      id: `period-${janCode}`,
      period_type: "MONTHLY",
      year: nextYear,
      month: 1,
      name: `January ${nextYear}`,
      code: janCode,
      start_date: dates.startDate,
      end_date: dates.endDate,
      status: "OPEN",
      opened_at: nowIso,
      opened_by: actor,
      lock_level: "NONE",
      created_at: nowIso,
      updated_at: nowIso,
    }
    allPeriods.push(janPeriod)
  }

  // 5. Initialize Next Year's Opening Balances from December's Closing Balances
  const janBalancesToSave: AccountPeriodBalance[] = decBalances.map((dbRec) => {
    const payload = `${janCode}:${dbRec.account_id}:${dbRec.currency}:${dbRec.closing_balance}:0:0:${dbRec.closing_balance}`
    const hash = crypto.createHash("sha256").update(payload).digest("hex")
    return {
      id: `apb-${janCode}-${dbRec.account_id}-${dbRec.currency}`,
      period_id: janPeriod!.id,
      period_code: janCode,
      account_id: dbRec.account_id,
      account_name: dbRec.account_name,
      account_type: dbRec.account_type,
      currency: dbRec.currency,
      opening_balance: dbRec.closing_balance,
      period_debit: 0,
      period_credit: 0,
      closing_balance: dbRec.closing_balance,
      transaction_count: 0,
      snapshot_hash: hash,
      created_at: nowIso,
    }
  })

  await saveAccountPeriodBalances(janBalancesToSave)

  // 6. Create Annual Snapshot for the closed year
  const annualId = `period-${year}-ANNUAL`
  const rawHashPayload = JSON.stringify({
    year,
    decBalancesCount: decBalances.length,
    backupId: yearEndBackupId,
  })
  const annualHash = crypto.createHash("sha256").update(rawHashPayload).digest("hex")

  const annualSnapshot: PeriodSnapshot = {
    id: `snp-${year}-annual-${crypto.randomBytes(3).toString("hex")}`,
    period_id: annualId,
    period_code: `${year}`,
    snapshot_version: 1,
    created_at: nowIso,
    created_by: actor,
    data_hash: annualHash,
    status: "ACTIVE",
    backup_id: yearEndBackupId,
    summary: {
      totalAccounts: decBalances.length,
      activeAccounts: decBalances.length,
      totalTransactions: 0,
      currencyTotals: [],
      receivablesTotal: 0,
      payablesTotal: 0,
      customerCreditsTotal: 0,
      supplierAdvancesTotal: 0,
      revenueTotal: 0,
      costsTotal: 0,
      grossProfitTotal: 0,
      paymentTotals: 0,
      supplierPaymentTotals: 0,
      reconciliationValid: true,
      checklistResults: [],
    },
    balances: decBalances,
  }

  const existingSnapshots = await getPeriodSnapshots()
  await savePeriodSnapshots([...existingSnapshots, annualSnapshot])

  // Update Settings to switch current period to new year January
  await savePeriodSettings({
    currentPeriodId: janPeriod.id,
  }, actor)

  // 7. Audit Log
  await logPeriodAudit({
    period_id: annualId,
    period_code: `${year}`,
    action: "YEAR_END_CLOSE",
    actor,
    reason: `Fiscal Year ${year} Year-End Close executed. Rolled forward ${decBalances.length} account balances into January ${nextYear}.`,
    snapshot_hash: annualHash,
    details: {
      year,
      nextYear,
      yearEndBackupId,
      accountsRolledOver: decBalances.length,
      notes,
    },
  })

  return {
    success: true,
    year,
    annualSnapshot,
    nextYearPeriod: janPeriod,
    yearEndBackupId,
    accountsRolledOver: decBalances.length,
    message: `Fiscal Year ${year} successfully closed. All closing balances carried forward to January ${nextYear} without data loss.`,
  }
}
