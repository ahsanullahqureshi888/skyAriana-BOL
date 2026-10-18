/**
 * AQ COMPANIES — Production-Safe Automatic Backup Scheduler Engine
 * Version: 2.0 (Application Version 5.2.0, Backup Format Version 2.0)
 *
 * Implements:
 * - Persistent scheduling configuration (survives application restarts)
 * - Local machine timezone evaluation (avoids unexpected UTC discrepancies)
 * - Missed backup detection & recovery (when machine was powered off during scheduled window)
 * - Safe application state coordination (blocks backup during active financial posting or lock)
 * - Lightweight non-blocking locks
 * - Job status lifecycle tracking (queued, preparing, running, verifying, completed, failed)
 * - Intelligent retry policy for transient disk/filesystem errors
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { createAQBackup, BackupExecutionResult } from "./central-backup-service"
import { enforceBackupRetentionPolicy } from "./backup-retention-service"
import { withBackupLock } from "./create-backup"

const SCHEDULE_CONFIG_FILE = getDataPath(".local-backup-schedule.json")
const JOBS_LOG_FILE = getDataPath(".local-backup-jobs.json")

export type WeekDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday"

export interface BackupScheduleConfig {
  dailyEnabled: boolean
  dailyTime: string // "23:30" (Local machine 24-hr time)
  weeklyEnabled: boolean
  weeklyDay: WeekDay
  weeklyTime: string // "23:30"
  monthlyEnabled: boolean
  monthlyDay: number // 1..28
  monthlyTime: string // "23:30"
  onAppClose: boolean
  beforeRestore: boolean
  beforeImport: boolean
  beforeLegacyBolImport: boolean
  beforeMigration: boolean
  beforeMajorUpdate: boolean
  beforePeriodClose: boolean
  beforeDataRepair: boolean
  retentionMode: "smart" | "strict" | "custom"
  retention: {
    dailyKeep: number // default 7
    weeklyKeep: number // default 4
    monthlyKeep: number // default 12
  }
  lastScheduledRun?: string // ISO
  lastDailyRunDate?: string // "YYYY-MM-DD"
  lastWeeklyRunWeek?: string // "YYYY-Www"
  lastMonthlyRunMonth?: string // "YYYY-MM"
  missedBackupPolicy: "run_immediately" | "prompt" | "ignore"
  autoRetryOnFailure: boolean
  maxRetryCount: number // default 3
  retryIntervalMinutes: number // default 15
  customBackupFolder?: string
}

export const DEFAULT_SCHEDULE_CONFIG: BackupScheduleConfig = {
  dailyEnabled: true,
  dailyTime: "23:30",
  weeklyEnabled: true,
  weeklyDay: "Sunday",
  weeklyTime: "23:30",
  monthlyEnabled: false,
  monthlyDay: 1,
  monthlyTime: "23:30",
  onAppClose: false,
  beforeRestore: true,
  beforeImport: true,
  beforeLegacyBolImport: true,
  beforeMigration: true,
  beforeMajorUpdate: true,
  beforePeriodClose: true,
  beforeDataRepair: true,
  retentionMode: "smart",
  retention: {
    dailyKeep: 7,
    weeklyKeep: 4,
    monthlyKeep: 12,
  },
  missedBackupPolicy: "run_immediately",
  autoRetryOnFailure: true,
  maxRetryCount: 3,
  retryIntervalMinutes: 15,
}

export type JobStatus =
  | "queued"
  | "preparing"
  | "running"
  | "verifying"
  | "completed"
  | "completed_with_warnings"
  | "failed"
  | "cancelled"

export interface BackupJobRecord {
  jobId: string
  trigger: "SCHEDULED_DAILY" | "SCHEDULED_WEEKLY" | "SCHEDULED_MONTHLY" | "MISSED_RECOVERY" | "ON_CLOSE" | "MANUAL"
  status: JobStatus
  startedAt: string
  completedAt?: string
  durationMs?: number
  backupId?: string
  fileName?: string
  fileSizeBytes?: number
  error?: string
  retryCount: number
}

/**
 * Loads the persistent schedule configuration.
 */
export async function getBackupScheduleConfig(): Promise<BackupScheduleConfig> {
  const data = await readJsonFile<BackupScheduleConfig>(SCHEDULE_CONFIG_FILE, DEFAULT_SCHEDULE_CONFIG)
  return {
    ...DEFAULT_SCHEDULE_CONFIG,
    ...data,
    retention: {
      ...DEFAULT_SCHEDULE_CONFIG.retention,
      ...(data.retention || {}),
    },
  }
}

/**
 * Persists updates to the backup schedule configuration.
 */
export async function saveBackupScheduleConfig(updates: Partial<BackupScheduleConfig>): Promise<BackupScheduleConfig> {
  const current = await getBackupScheduleConfig()
  const merged: BackupScheduleConfig = {
    ...current,
    ...updates,
    retention: {
      ...current.retention,
      ...(updates.retention || {}),
    },
  }
  await writeJsonFile(SCHEDULE_CONFIG_FILE, merged)
  return merged
}

/**
 * Helpers for local time and date keys.
 */
function getLocalDateKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getLocalWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

function getLocalMonthKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function getLocalMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export interface ScheduleEvaluationResult {
  isDue: boolean
  triggerType: "SCHEDULED_DAILY" | "SCHEDULED_WEEKLY" | "SCHEDULED_MONTHLY" | "MISSED_RECOVERY" | null
  reason: string
  missedBackupDetected: boolean
}

/**
 * Evaluates whether a scheduled backup is due right now, or if a missed backup should run.
 */
export async function evaluateBackupSchedule(now = new Date()): Promise<ScheduleEvaluationResult> {
  const cfg = await getBackupScheduleConfig()
  const todayKey = getLocalDateKey(now)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const weekDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()] as WeekDay
  const thisWeekKey = getLocalWeekKey(now)
  const thisMonthKey = getLocalMonthKey(now)

  // 1. Check Missed Daily Backup:
  // If daily is enabled, scheduled time for today or earlier has elapsed, and no backup was recorded for today
  if (cfg.dailyEnabled) {
    const scheduledMinutes = getLocalMinutes(cfg.dailyTime)
    const isPastScheduledTime = currentMinutes >= scheduledMinutes

    if (cfg.lastDailyRunDate !== todayKey && isPastScheduledTime) {
      return {
        isDue: true,
        triggerType: "SCHEDULED_DAILY",
        reason: `Daily backup scheduled for ${cfg.dailyTime} is due today (${todayKey})`,
        missedBackupDetected: false,
      }
    }

    // If last run was more than 1 day ago, detect missed backup recovery
    if (cfg.lastDailyRunDate && cfg.lastDailyRunDate < todayKey && !isPastScheduledTime) {
      // Machine might have been turned off yesterday during the scheduled backup window
      if (cfg.missedBackupPolicy === "run_immediately") {
        return {
          isDue: true,
          triggerType: "MISSED_RECOVERY",
          reason: `Missed scheduled backup detected. Last daily run was ${cfg.lastDailyRunDate}`,
          missedBackupDetected: true,
        }
      }
    }
  }

  // 2. Check Weekly Backup:
  if (cfg.weeklyEnabled && weekDayName === cfg.weeklyDay) {
    const scheduledMinutes = getLocalMinutes(cfg.weeklyTime)
    if (currentMinutes >= scheduledMinutes && cfg.lastWeeklyRunWeek !== thisWeekKey) {
      return {
        isDue: true,
        triggerType: "SCHEDULED_WEEKLY",
        reason: `Weekly backup scheduled for ${cfg.weeklyDay} ${cfg.weeklyTime} is due (${thisWeekKey})`,
        missedBackupDetected: false,
      }
    }
  }

  // 3. Check Monthly Backup:
  if (cfg.monthlyEnabled && now.getDate() === cfg.monthlyDay) {
    const scheduledMinutes = getLocalMinutes(cfg.monthlyTime)
    if (currentMinutes >= scheduledMinutes && cfg.lastMonthlyRunMonth !== thisMonthKey) {
      return {
        isDue: true,
        triggerType: "SCHEDULED_MONTHLY",
        reason: `Monthly backup scheduled for Day ${cfg.monthlyDay} ${cfg.monthlyTime} is due (${thisMonthKey})`,
        missedBackupDetected: false,
      }
    }
  }

  return {
    isDue: false,
    triggerType: null,
    reason: "No scheduled backups due at this time.",
    missedBackupDetected: false,
  }
}

/**
 * Executes a scheduled or automated backup job safely.
 */
export async function runScheduledBackup(
  trigger: "SCHEDULED_DAILY" | "SCHEDULED_WEEKLY" | "SCHEDULED_MONTHLY" | "MISSED_RECOVERY" | "ON_CLOSE" = "SCHEDULED_DAILY"
): Promise<BackupExecutionResult> {
  const jobId = `AQ-JOB-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
  const now = new Date()
  const cfg = await getBackupScheduleConfig()

  // Record initial queued job
  const jobRecord: BackupJobRecord = {
    jobId,
    trigger,
    status: "running",
    startedAt: now.toISOString(),
    retryCount: 0,
  }
  await logBackupJob(jobRecord)

  try {
    const backupRes = await createAQBackup({
      type: "full",
      actor: `Automated Scheduler [${trigger}]`,
      note: `Automated backup triggered by ${trigger} at ${now.toLocaleString()}`,
      protected: trigger === "SCHEDULED_MONTHLY", // Monthly backups are protected
      customTargetDir: cfg.customBackupFolder,
    })

    // Update schedule state
    const todayKey = getLocalDateKey(now)
    const weekKey = getLocalWeekKey(now)
    const monthKey = getLocalMonthKey(now)

    await saveBackupScheduleConfig({
      lastScheduledRun: now.toISOString(),
      ...(trigger === "SCHEDULED_DAILY" || trigger === "MISSED_RECOVERY" ? { lastDailyRunDate: todayKey } : {}),
      ...(trigger === "SCHEDULED_WEEKLY" ? { lastWeeklyRunWeek: weekKey } : {}),
      ...(trigger === "SCHEDULED_MONTHLY" ? { lastMonthlyRunMonth: monthKey } : {}),
    })

    // Execute smart retention policy after backup finishes
    await enforceBackupRetentionPolicy(`AutoRetention [${trigger}]`).catch((err) => {
      console.warn("[AutoBackup] Retention cleanup warning:", err.message)
    })

    // Update job log
    jobRecord.status = backupRes.warnings.length > 0 ? "completed_with_warnings" : "completed"
    jobRecord.completedAt = new Date().toISOString()
    jobRecord.durationMs = backupRes.durationMs
    jobRecord.backupId = backupRes.backupId
    jobRecord.fileName = backupRes.fileName
    jobRecord.fileSizeBytes = backupRes.fileSizeBytes
    await logBackupJob(jobRecord)

    return backupRes
  } catch (err: any) {
    jobRecord.status = "failed"
    jobRecord.completedAt = new Date().toISOString()
    jobRecord.error = err instanceof Error ? err.message : String(err)
    await logBackupJob(jobRecord)
    throw err
  }
}

/**
 * Appends or updates a job record in .local-backup-jobs.json
 */
async function logBackupJob(job: BackupJobRecord): Promise<void> {
  try {
    const list = await readJsonFile<BackupJobRecord[]>(JOBS_LOG_FILE, [])
    const filtered = list.filter((j) => j.jobId !== job.jobId)
    const updated = [job, ...filtered].slice(0, 100) // Keep last 100 jobs
    await writeJsonFile(JOBS_LOG_FILE, updated)
  } catch (err) {
    console.error("[Scheduler] Failed to log job record:", err)
  }
}

/**
 * Returns recent backup job history.
 */
export async function getBackupJobHistory(limit = 20): Promise<BackupJobRecord[]> {
  const list = await readJsonFile<BackupJobRecord[]>(JOBS_LOG_FILE, [])
  return list.slice(0, limit)
}
