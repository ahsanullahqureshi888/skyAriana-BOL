/**
 * Sky Ariana Atomic Month-End Closing Engine
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

import crypto from "crypto"
import { createFullSystemBackup } from "@/lib/backup/create-backup"
import type {
  AccountingPeriod,
  AccountPeriodBalance,
  PeriodSnapshot,
  MonthCloseOptions,
} from "./period-types"
import {
  getPeriodById,
  getPeriods,
  savePeriods,
  getPeriodSettings,
  savePeriodSettings,
  saveAccountPeriodBalances,
  getPeriodSnapshots,
  savePeriodSnapshots,
  logPeriodAudit,
  buildPeriodDates,
  getMonthName,
  formatPeriodCode,
} from "./period-service"
import { calculatePeriodBalances } from "./balance-calculator"
import { runPeriodCloseChecklist } from "./close-checklist-service"

export interface MonthCloseExecutionResult {
  success: boolean
  period: AccountingPeriod
  snapshot: PeriodSnapshot
  nextPeriod: AccountingPeriod
  preCloseBackupId?: string
  postCloseBackupId?: string
  balancesCount: number
  message: string
}

/**
 * Executes the atomic month-end close with pre-close backup,
 * immutable snapshot generation, carry-forward initialization, and post-close lock.
 */
export async function executeMonthClose(
  options: MonthCloseOptions
): Promise<MonthCloseExecutionResult> {
  const { period_id, actor, notes, bypassWarnings } = options

  // 1. Fetch & Verify Period
  const period = await getPeriodById(period_id)
  if (!period) {
    throw new Error(`Accounting period '${period_id}' not found.`)
  }

  if (period.status === "CLOSED" || period.status === "ARCHIVED") {
    throw new Error(`Period [${period.code}] is already closed. To make changes, use the authorized Reopen workflow.`)
  }

  const settings = await getPeriodSettings()

  // 2. Run Checklist Validation
  const checklist = await runPeriodCloseChecklist(period)
  if (checklist.hasBlockingErrors) {
    const errorDetails = checklist.items
      .filter((i) => i.status === "BLOCKING_ERROR")
      .map((i) => `• ${i.title}: ${i.details || i.description}`)
      .join("\n")
    throw new Error(`Cannot close period [${period.code}]. Blocking errors detected:\n${errorDetails}`)
  }

  if (checklist.hasWarnings && !settings.allowWarningsOnClose && !bypassWarnings) {
    throw new Error(`Period [${period.code}] has ${checklist.warningCount} warning(s). Set 'bypassWarnings: true' or resolve them before closing.`)
  }

  // 3. Step 1: Mandatory Pre-Close Backup
  let preCloseBackupId: string | undefined
  if (settings.requireBackupBeforeClose) {
    try {
      const backupResult = await createFullSystemBackup({
        type: "PRE_CLOSE",
        actor,
        note: `Mandatory Pre-Close Snapshot for Period ${period.code} (${period.name})`,
        protected: true,
      })
      preCloseBackupId = backupResult.backupItem.id
    } catch (err: any) {
      console.error("[MonthClose] Pre-close backup failed:", err)
      // If backup fails and required, do not proceed with closing
      throw new Error(`Mandatory pre-close backup failed: ${err.message}. Aborting close to safeguard ledger data.`)
    }
  }

  // 4. Step 2: Compute Multi-Currency Balances & Invariance
  const calcResult = await calculatePeriodBalances(period)
  if (!calcResult.invariancePassed) {
    throw new Error(`Accounting invariance check failed: Net Balance != Opening + Debit - Credit for one or more accounts.`)
  }

  // Save the finalized balances
  await saveAccountPeriodBalances(calcResult.balances)

  // 5. Step 3: Create Versioned Immutable Snapshot
  const existingSnapshots = await getPeriodSnapshots(period.id)
  const nextVersion = existingSnapshots.length > 0
    ? Math.max(...existingSnapshots.map((s) => s.snapshot_version)) + 1
    : 1

  // Mark previous snapshots as SUPERSEDED
  const updatedOldSnapshots = existingSnapshots.map((s) => ({
    ...s,
    status: "SUPERSEDED" as const,
  }))

  // Generate SHA-256 hash over balances and financial totals
  const rawHashPayload = JSON.stringify({
    periodCode: period.code,
    version: nextVersion,
    totals: calcResult.summary.currencyTotals,
    balances: calcResult.balances.map((b) => ({
      acc: b.account_id,
      curr: b.currency,
      cl: b.closing_balance,
      sh: b.snapshot_hash,
    })),
  })
  const dataHash = crypto.createHash("sha256").update(rawHashPayload).digest("hex")

  const snapshotId = `snp-${period.code}-v${nextVersion}-${crypto.randomBytes(3).toString("hex")}`
  const newSnapshot: PeriodSnapshot = {
    id: snapshotId,
    period_id: period.id,
    period_code: period.code,
    snapshot_version: nextVersion,
    created_at: new Date().toISOString(),
    created_by: actor,
    data_hash: dataHash,
    status: "ACTIVE",
    pre_backup_id: preCloseBackupId,
    summary: {
      ...calcResult.summary,
      checklistResults: checklist.items,
    },
    balances: calcResult.balances,
  }

  await savePeriodSnapshots([...updatedOldSnapshots, newSnapshot])

  // 6. Step 4: Lock Current Period
  const allPeriods = await getPeriods()
  const pIdx = allPeriods.findIndex((p) => p.id === period.id)
  const nowIso = new Date().toISOString()

  const closedPeriod: AccountingPeriod = {
    ...period,
    status: "CLOSED",
    closed_at: nowIso,
    closed_by: actor,
    lock_level: "FULL",
    snapshot_id: snapshotId,
    pre_close_backup_id: preCloseBackupId,
    notes: notes || period.notes,
    updated_at: nowIso,
  }

  allPeriods[pIdx] = closedPeriod

  // 7. Step 5: Advance & Setup Next Period
  const nextMonth = period.month === 12 ? 1 : period.month + 1
  const nextYear = period.month === 12 ? period.year + 1 : period.year
  const nextCode = formatPeriodCode(nextYear, nextMonth)

  let nextPeriod = allPeriods.find((p) => p.code === nextCode)
  if (!nextPeriod) {
    const dates = buildPeriodDates(nextYear, nextMonth)
    nextPeriod = {
      id: `period-${nextCode}`,
      period_type: "MONTHLY",
      year: nextYear,
      month: nextMonth,
      name: `${getMonthName(nextMonth)} ${nextYear}`,
      code: nextCode,
      start_date: dates.startDate,
      end_date: dates.endDate,
      status: "OPEN",
      opened_at: nowIso,
      opened_by: actor,
      lock_level: "NONE",
      created_at: nowIso,
      updated_at: nowIso,
    }
    allPeriods.push(nextPeriod)
  } else if (nextPeriod.status === "CLOSED") {
    // If it was closed somehow, keep it, but normally it's OPEN
  } else {
    nextPeriod.status = "OPEN"
    nextPeriod.updated_at = nowIso
  }

  await savePeriods(allPeriods)

  // Update Settings currentPeriodId
  await savePeriodSettings({
    currentPeriodId: nextPeriod.id,
  }, actor)

  // 8. Step 6: Post-Close Protected Backup
  let postCloseBackupId: string | undefined
  try {
    const postBackup = await createFullSystemBackup({
      type: "PERIOD_ARCHIVE",
      actor,
      note: `Final Protected Archive for Closed Period ${period.code}`,
      protected: true,
    })
    postCloseBackupId = postBackup.backupItem.id
    closedPeriod.post_close_backup_id = postCloseBackupId

    // Update with post backup id
    const finalPeriods = await getPeriods()
    const idx = finalPeriods.findIndex((p) => p.id === closedPeriod.id)
    if (idx !== -1) {
      finalPeriods[idx] = closedPeriod
      await savePeriods(finalPeriods)
    }
  } catch (err: any) {
    console.warn("[MonthClose] Post-close backup warning:", err.message)
  }

  // 9. Step 7: Audit Logging
  await logPeriodAudit({
    period_id: period.id,
    period_code: period.code,
    action: "CLOSE",
    actor,
    reason: `Formal monthly close for ${period.name} (Snapshot v${nextVersion})`,
    snapshot_version: nextVersion,
    snapshot_hash: dataHash,
    details: {
      balancesCount: calcResult.balances.length,
      preCloseBackupId,
      postCloseBackupId,
      currencyTotals: calcResult.summary.currencyTotals,
    },
  })

  return {
    success: true,
    period: closedPeriod,
    snapshot: newSnapshot,
    nextPeriod,
    preCloseBackupId,
    postCloseBackupId,
    balancesCount: calcResult.balances.length,
    message: `Accounting Period [${period.code}] (${period.name}) closed and locked successfully. Next period [${nextPeriod.code}] is active with carried forward opening balances.`,
  }
}
