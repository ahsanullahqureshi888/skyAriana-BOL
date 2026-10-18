/**
 * Sky Ariana Authorized Period Reopen & Revision Tracking Service
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

import { createFullSystemBackup } from "@/lib/backup/create-backup"
import type {
  AccountingPeriod,
  PeriodSnapshot,
  PeriodReopenRequest,
  SnapshotDiffResult,
  SnapshotDiffItem,
} from "./period-types"
import {
  getPeriodById,
  getPeriods,
  savePeriods,
  logPeriodAudit,
  getPeriodSnapshots,
} from "./period-service"

export interface PeriodReopenResult {
  success: boolean
  period: AccountingPeriod
  preReopenBackupId?: string
  message: string
}

/**
 * Authorizes and reopens a previously closed accounting period.
 * Requires mandatory business reason and automatically generates a pre-reopen backup.
 */
export async function reopenAccountingPeriod(
  request: PeriodReopenRequest
): Promise<PeriodReopenResult> {
  const { period_id, reason, actor } = request

  if (!reason || reason.trim().length < 10) {
    throw new Error("A specific business justification (minimum 10 characters) is required to reopen a closed financial period.")
  }

  const period = await getPeriodById(period_id)
  if (!period) {
    throw new Error(`Period '${period_id}' not found.`)
  }

  if (period.status !== "CLOSED" && period.status !== "ARCHIVED") {
    throw new Error(`Period [${period.code}] is already ${period.status}. Only CLOSED or ARCHIVED periods can be reopened.`)
  }

  // 1. Mandatory Pre-Reopen Protected Backup
  let preReopenBackupId: string | undefined
  try {
    const backupResult = await createFullSystemBackup({
      type: "PRE_CLOSE",
      actor,
      note: `Pre-Reopen Snapshot for Period ${period.code} (${period.name}). Reason: ${reason}`,
      protected: true,
    })
    preReopenBackupId = backupResult.backupItem.id
  } catch (err: any) {
    console.error("[ReopenPeriod] Pre-reopen backup failed:", err)
    throw new Error(`Failed to create safeguard backup prior to reopening period: ${err.message}`)
  }

  // 2. Update Period Status
  const allPeriods = await getPeriods()
  const pIdx = allPeriods.findIndex((p) => p.id === period.id)
  const nowIso = new Date().toISOString()

  const reopenedPeriod: AccountingPeriod = {
    ...period,
    status: "REOPENED",
    reopened_at: nowIso,
    reopened_by: actor,
    reopen_reason: reason.trim(),
    lock_level: "SOFT",
    updated_at: nowIso,
  }

  allPeriods[pIdx] = reopenedPeriod
  await savePeriods(allPeriods)

  // 3. Log Audit Trail
  await logPeriodAudit({
    period_id: period.id,
    period_code: period.code,
    action: "REOPEN",
    actor,
    reason: reason.trim(),
    details: {
      preReopenBackupId,
      priorClosedAt: period.closed_at,
      priorClosedBy: period.closed_by,
      priorSnapshotId: period.snapshot_id,
    },
  })

  return {
    success: true,
    period: reopenedPeriod,
    preReopenBackupId,
    message: `Period [${period.code}] (${period.name}) reopened for authorized corrections. A safety backup (${preReopenBackupId}) was archived.`,
  }
}

/**
 * Computes detailed audit differences between two snapshot versions of the same period.
 * (e.g. Version 1 initial close vs Version 2 post-reopen re-close)
 */
export async function comparePeriodSnapshots(
  periodId: string,
  v1Number?: number,
  v2Number?: number
): Promise<SnapshotDiffResult> {
  const snapshots = await getPeriodSnapshots(periodId)
  if (snapshots.length < 2 && (!v1Number || !v2Number)) {
    throw new Error(`At least 2 snapshot versions are required to generate comparison differences. Current versions: ${snapshots.length}`)
  }

  const v1 = v1Number
    ? snapshots.find((s) => s.snapshot_version === v1Number)
    : snapshots[snapshots.length - 1] // Oldest
  const v2 = v2Number
    ? snapshots.find((s) => s.snapshot_version === v2Number)
    : snapshots[0] // Newest

  if (!v1 || !v2) {
    throw new Error("Specified snapshot versions could not be found.")
  }

  const differences: SnapshotDiffItem[] = []
  const totalDelta: Record<string, number> = {}

  const v1Balances = v1.balances || []
  const v2Balances = v2.balances || []

  const allKeys = new Set([
    ...v1Balances.map((b) => `${b.account_id}__${b.currency}`),
    ...v2Balances.map((b) => `${b.account_id}__${b.currency}`),
  ])

  for (const key of allKeys) {
    const b1 = v1Balances.find((b) => `${b.account_id}__${b.currency}` === key)
    const b2 = v2Balances.find((b) => `${b.account_id}__${b.currency}` === key)

    const accountId = b1?.account_id || b2?.account_id || "Unknown"
    const accountName = b2?.account_name || b1?.account_name || "Unknown"
    const currency = b1?.currency || b2?.currency || "USD"

    const v1Closing = b1?.closing_balance || 0
    const v2Closing = b2?.closing_balance || 0
    const delta = Math.round((v2Closing - v1Closing) * 100) / 100

    const v1Debit = b1?.period_debit || 0
    const v2Debit = b2?.period_debit || 0
    const v1Credit = b1?.period_credit || 0
    const v2Credit = b2?.period_credit || 0

    if (Math.abs(delta) > 0.001 || v1Debit !== v2Debit || v1Credit !== v2Credit) {
      differences.push({
        account_id: accountId,
        account_name: accountName,
        currency,
        v1_closing: v1Closing,
        v2_closing: v2Closing,
        delta,
        v1_debit: v1Debit,
        v2_debit: v2Debit,
        v1_credit: v1Credit,
        v2_credit: v2Credit,
      })

      totalDelta[currency] = Math.round(((totalDelta[currency] || 0) + delta) * 100) / 100
    }
  }

  return {
    period_code: v1.period_code,
    v1_version: v1.snapshot_version,
    v2_version: v2.snapshot_version,
    v1_created_at: v1.created_at,
    v2_created_at: v2.created_at,
    differences,
    totalDelta,
  }
}
