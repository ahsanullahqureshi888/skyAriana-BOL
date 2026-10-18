/**
 * Sky Ariana Enterprise Financial Period Management Service
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

import path from "path"
import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import type {
  AccountingPeriod,
  AccountPeriodBalance,
  PeriodSnapshot,
  AccountingPeriodSettings,
  PeriodAuditRecord,
  AssertPeriodOpenOptions,
} from "./period-types"

const PERIODS_FILE = getDataPath(".local-accounting-periods.json")
const BALANCES_FILE = getDataPath(".local-account-period-balances.json")
const SNAPSHOTS_FILE = getDataPath(".local-period-snapshots.json")
const SETTINGS_FILE = getDataPath(".local-accounting-period-settings.json")
const AUDIT_FILE = getDataPath(".local-period-audit.json")

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] || `Month ${monthNumber}`
}

export function formatPeriodCode(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function buildPeriodDates(year: number, month: number): { startDate: string; endDate: string } {
  const lastDay = getDaysInMonth(year, month)
  const mm = String(month).padStart(2, "0")
  return {
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`
  }
}

// -------------------------------------------------------------
// Settings Management
// -------------------------------------------------------------
export async function getPeriodSettings(): Promise<AccountingPeriodSettings> {
  const defaultSettings: AccountingPeriodSettings = {
    enablePeriodLock: true,
    currentPeriodId: "period-2026-09",
    requireBackupBeforeClose: true,
    requireReconciliationBeforeClose: true,
    allowWarningsOnClose: true,
    requireApprovalToReopen: true,
    allowCurrentPeriodAdjustment: true,
    updated_at: new Date().toISOString(),
    updated_by: "System",
  }
  const loaded = await readJsonFile<AccountingPeriodSettings>(SETTINGS_FILE, defaultSettings)
  return { ...defaultSettings, ...loaded }
}

export async function savePeriodSettings(
  settings: Partial<AccountingPeriodSettings>,
  actor = "Administrator"
): Promise<AccountingPeriodSettings> {
  const current = await getPeriodSettings()
  const updated: AccountingPeriodSettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
    updated_by: actor,
  }
  await writeJsonFile(SETTINGS_FILE, updated)
  return updated
}

// -------------------------------------------------------------
// Period CRUD & Initialization
// -------------------------------------------------------------
export async function getPeriods(): Promise<AccountingPeriod[]> {
  const periods = await readJsonFile<AccountingPeriod[]>(PERIODS_FILE, [])
  if (periods.length === 0) {
    return await ensureDefaultPeriods()
  }
  return periods.sort((a, b) => a.code.localeCompare(b.code))
}

export async function savePeriods(periods: AccountingPeriod[]): Promise<void> {
  await writeJsonFile(PERIODS_FILE, periods)
}

export async function ensureDefaultPeriods(): Promise<AccountingPeriod[]> {
  const existing = await readJsonFile<AccountingPeriod[]>(PERIODS_FILE, [])
  if (existing.length > 0) return existing

  const now = new Date()
  const nowYear = now.getFullYear() // 2026

  // Generate 2026 periods (Jan through Dec)
  const defaultPeriods: AccountingPeriod[] = []
  for (let m = 1; m <= 12; m++) {
    const dates = buildPeriodDates(nowYear, m)
    const code = formatPeriodCode(nowYear, m)
    const isPast = m < 9
    const isCurrent = m === 9
    defaultPeriods.push({
      id: `period-${code}`,
      period_type: "MONTHLY",
      year: nowYear,
      month: m,
      name: `${getMonthName(m)} ${nowYear}`,
      code,
      start_date: dates.startDate,
      end_date: dates.endDate,
      status: isPast ? "CLOSED" : "OPEN",
      opened_at: new Date(nowYear, m - 1, 1).toISOString(),
      opened_by: "System Initialization",
      closed_at: isPast ? new Date(nowYear, m, 1).toISOString() : undefined,
      closed_by: isPast ? "System Initializer" : undefined,
      lock_level: isPast ? "FULL" : "NONE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  await writeJsonFile(PERIODS_FILE, defaultPeriods)
  return defaultPeriods
}

export async function getPeriodById(id: string): Promise<AccountingPeriod | null> {
  const periods = await getPeriods()
  return periods.find((p) => p.id === id) || null
}

export async function getPeriodByCode(code: string): Promise<AccountingPeriod | null> {
  const periods = await getPeriods()
  return periods.find((p) => p.code === code) || null
}

/**
 * Returns the period for a given posting date (YYYY-MM-DD or ISO).
 * Auto-creates the monthly period if it doesn't exist yet.
 */
export async function getPeriodForDate(dateStr?: string): Promise<AccountingPeriod> {
  let year: number
  let month: number

  if (dateStr && /^\d{4}-\d{2}/.test(dateStr)) {
    const parts = dateStr.slice(0, 7).split("-")
    year = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10)
  } else {
    const dateObj = dateStr ? new Date(dateStr) : new Date()
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
    year = validDate.getFullYear()
    month = validDate.getMonth() + 1
  }
  const code = formatPeriodCode(year, month)

  const periods = await getPeriods()
  let period = periods.find((p) => p.code === code)
  if (period) return period

  // Auto-generate period
  const dates = buildPeriodDates(year, month)
  period = {
    id: `period-${code}`,
    period_type: "MONTHLY",
    year,
    month,
    name: `${getMonthName(month)} ${year}`,
    code,
    start_date: dates.startDate,
    end_date: dates.endDate,
    status: "OPEN",
    opened_at: new Date().toISOString(),
    opened_by: "Auto-Provisioned",
    lock_level: "NONE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  periods.push(period)
  await savePeriods(periods)
  return period
}

export async function getActivePeriod(): Promise<AccountingPeriod> {
  const settings = await getPeriodSettings()
  if (settings.currentPeriodId) {
    const p = await getPeriodById(settings.currentPeriodId)
    if (p) return p
  }
  const todayPeriod = await getPeriodForDate()
  return todayPeriod
}

// -------------------------------------------------------------
// Audit Trail
// -------------------------------------------------------------
export async function getPeriodAuditLogs(periodId?: string): Promise<PeriodAuditRecord[]> {
  const logs = await readJsonFile<PeriodAuditRecord[]>(AUDIT_FILE, [])
  if (!periodId) return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return logs.filter((l) => l.period_id === periodId).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function logPeriodAudit(entry: Omit<PeriodAuditRecord, "id" | "timestamp">): Promise<PeriodAuditRecord> {
  const logs = await readJsonFile<PeriodAuditRecord[]>(AUDIT_FILE, [])
  const newRecord: PeriodAuditRecord = {
    ...entry,
    id: `paud-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    timestamp: new Date().toISOString(),
  }
  logs.push(newRecord)
  await writeJsonFile(AUDIT_FILE, logs)
  return newRecord
}

// -------------------------------------------------------------
// Period Balances & Snapshots Persistence
// -------------------------------------------------------------
export async function getAccountPeriodBalances(periodId?: string): Promise<AccountPeriodBalance[]> {
  const balances = await readJsonFile<AccountPeriodBalance[]>(BALANCES_FILE, [])
  if (!periodId) return balances
  return balances.filter((b) => b.period_id === periodId)
}

export async function saveAccountPeriodBalances(balancesToSave: AccountPeriodBalance[]): Promise<void> {
  const current = await readJsonFile<AccountPeriodBalance[]>(BALANCES_FILE, [])
  const idsToSave = new Set(balancesToSave.map((b) => b.id))
  const filtered = current.filter((b) => !idsToSave.has(b.id))
  await writeJsonFile(BALANCES_FILE, [...filtered, ...balancesToSave])
}

export async function getPeriodSnapshots(periodId?: string): Promise<PeriodSnapshot[]> {
  const snapshots = await readJsonFile<PeriodSnapshot[]>(SNAPSHOTS_FILE, [])
  if (!periodId) return snapshots.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return snapshots
    .filter((s) => s.period_id === periodId)
    .sort((a, b) => b.snapshot_version - a.snapshot_version)
}

export async function savePeriodSnapshots(snapshots: PeriodSnapshot[]): Promise<void> {
  await writeJsonFile(SNAPSHOTS_FILE, snapshots)
}

// -------------------------------------------------------------
// Core Financial Lock Assertion
// -------------------------------------------------------------
/**
 * Asserts that the accounting period for the given posting date is open.
 * Throws a descriptive error if the period is CLOSED or ARCHIVED,
 * preventing any mutation unless explicit emergency override is granted.
 */
export async function assertAccountingPeriodOpen(
  postingDate?: string,
  options?: AssertPeriodOpenOptions
): Promise<{ period: AccountingPeriod; allowed: boolean; overrideUsed?: boolean }> {
  const settings = await getPeriodSettings()
  if (!settings.enablePeriodLock) {
    const period = await getPeriodForDate(postingDate)
    return { period, allowed: true }
  }

  const period = await getPeriodForDate(postingDate)

  if (period.status === "CLOSED" || period.status === "ARCHIVED") {
    // Check if emergency override is authorized
    if (options?.allowOverride) {
      const isSuper = options.role === "superadmin" || options.role === "admin"
      if (isSuper) {
        await logPeriodAudit({
          period_id: period.id,
          period_code: period.code,
          action: "FORCE_OVERRIDE",
          actor: options.actor || "Authorized Admin",
          reason: `Emergency override posting into closed period ${period.code} for ${options.entityType || "transaction"} ${options.entityId || ""}`,
          details: { options, postingDate }
        })
        return { period, allowed: true, overrideUsed: true }
      }
    }

    const activePeriod = await getActivePeriod()
    throw new Error(
      `Financial Period Lock Enforced: Period [${period.code}] (${period.name}) was finalized and closed on ${period.closed_at || "earlier"}. ` +
      `No new financial transactions, revisions, or deletions may be posted into a closed period. ` +
      `Please post adjustments into the current open period [${activePeriod.code}] (${activePeriod.name}) or request an authorized period reopen.`
    )
  }

  return { period, allowed: true }
}

/**
 * Validates that an incoming map of ledger records / entries does not quietly mutate,
 * insert, or delete transactions that belong to closed or archived periods.
 */
export async function assertLedgerMapNotViolatingClosedPeriods(
  incomingMap: Record<string, any[]>,
  existingMap: Record<string, any[]>,
  deletedList?: any[],
  options?: AssertPeriodOpenOptions
): Promise<void> {
  const settings = await getPeriodSettings()
  if (!settings.enablePeriodLock) return

  // Build a lookup map of existing rows
  const existingByIdOrBol = new Map<string, any>()
  for (const rows of Object.values(existingMap)) {
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row.id) existingByIdOrBol.set(`id:${row.id}`, row)
        const bolKey = (row.barnamehNo || row.bolNo || "").trim().toLowerCase()
        if (bolKey) existingByIdOrBol.set(`bol:${bolKey}`, row)
      }
    }
  }

  // Check incoming rows
  for (const rows of Object.values(incomingMap)) {
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const rowDate = row.date || row.dateOfShip || row.shipDate
        const idKey = row.id ? `id:${row.id}` : null
        const bolKey = (row.barnamehNo || row.bolNo || "").trim().toLowerCase()
          ? `bol:${(row.barnamehNo || row.bolNo || "").trim().toLowerCase()}`
          : null

        const existingRow = (idKey && existingByIdOrBol.get(idKey)) || (bolKey && existingByIdOrBol.get(bolKey))

        if (!existingRow) {
          // New row: ensure its date is not in a closed period
          await assertAccountingPeriodOpen(rowDate, {
            ...options,
            entityType: "ledger_entry",
            entityId: row.id || row.barnamehNo || row.bolNo,
          })
        } else {
          // Existing row: if financial fields or date changed, ensure neither old nor new date is in a closed period
          const existingDate = existingRow.date || existingRow.dateOfShip || existingRow.shipDate
          const debitChanged = Number(row.debit || 0) !== Number(existingRow.debit || 0)
          const creditChanged = Number(row.credit || 0) !== Number(existingRow.credit || 0)
          const dateChanged = Boolean(rowDate && existingDate && rowDate !== existingDate)

          if (debitChanged || creditChanged || dateChanged) {
            await assertAccountingPeriodOpen(existingDate, {
              ...options,
              entityType: "ledger_entry",
              entityId: row.id || row.barnamehNo || row.bolNo,
            })
            if (dateChanged) {
              await assertAccountingPeriodOpen(rowDate, {
                ...options,
                entityType: "ledger_entry",
                entityId: row.id || row.barnamehNo || row.bolNo,
              })
            }
          }
        }
      }
    }
  }

  // Check deleted list
  if (Array.isArray(deletedList)) {
    for (const del of deletedList) {
      const delEntry = del?.entry || del
      let delDate = delEntry?.date || delEntry?.dateOfShip || delEntry?.shipDate
      if (!delDate && (delEntry?.id || delEntry?.barnamehNo)) {
        const match = (delEntry.id && existingByIdOrBol.get(`id:${delEntry.id}`)) ||
          (delEntry.barnamehNo && existingByIdOrBol.get(`bol:${delEntry.barnamehNo.trim().toLowerCase()}`))
        if (match) {
          delDate = match.date || match.dateOfShip || match.shipDate
        }
      }
      if (delDate) {
        await assertAccountingPeriodOpen(delDate, {
          ...options,
          entityType: "ledger_entry",
          entityId: delEntry?.id || delEntry?.barnamehNo || delEntry?.bolNo,
        })
      }
    }
  }
}
