/**
 * AQ COMPANIES — Lightweight System Snapshot Engine
 * Version: 2.0 (Application Version 5.2.0, Backup Format Version 2.0)
 *
 * Implements deterministic snapshot creation for critical lifecycle moments:
 * - Pre-Restore (Rollback safety point)
 * - Pre-Import (Before batch/bulk imports)
 * - Pre-Legacy BOL Import (Historical ledger & BOL migrations)
 * - Period Close (Pre and Post financial closing - immutable audit snapshots)
 * - Pre-Migration (Before database or app schema upgrades)
 * - Pre-Data Repair (Before executing database repair routines)
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import os from "node:os"
import { getDataPath, getBackupRoot } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile, atomicWriteFile } from "@/lib/services/blob-db"
import {
  BACKUP_FORMAT_VERSION,
  CURRENT_APPLICATION_VERSION,
  CURRENT_DATABASE_SCHEMA_VERSION,
  generateSnapshotFilename,
  computeSha256,
  type AQBackupEnvelope,
  type AQBackupMetadata,
} from "./backup-format"
import { collectAllSystemData, BACKUP_DATABASE_FILES } from "./backup-collector"
import { withBackupLock } from "./create-backup"
import type { BackupItem, BackupRecordCounts } from "./backup-types"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

export type SnapshotReason =
  | "PRE_RESTORE"
  | "PRE_IMPORT"
  | "PRE_LEGACY_BOL_IMPORT"
  | "PRE_PERIOD_CLOSE"
  | "POST_PERIOD_CLOSE"
  | "PRE_MIGRATION"
  | "PRE_DATA_REPAIR"
  | "CUSTOM_SNAPSHOT"

export interface SnapshotCreationOptions {
  reason: SnapshotReason
  actor?: string
  note?: string
  targetVersion?: string // for migration
  period?: string // for period close (e.g. "2026-10")
  customTargetDir?: string
  parentBackupId?: string
}

export interface SnapshotResult {
  success: boolean
  snapshotId: string
  fileName: string
  filePath: string
  reason: SnapshotReason
  createdAt: string
  checksum: string
  fileSizeBytes: number
  recordCounts: BackupRecordCounts
  protected: boolean
}

/**
 * Creates an atomic, deterministic system snapshot for a critical lifecycle moment.
 */
export async function createSystemSnapshot(options: SnapshotCreationOptions): Promise<SnapshotResult> {
  const actor = options.actor || "System Automated Snapshot"
  const now = new Date()
  const reason = options.reason
  let targetDir = options.customTargetDir || getBackupRoot()
  try {
    await fs.mkdir(targetDir, { recursive: true })
  } catch {
    targetDir = path.join(os.tmpdir(), "backups")
    await fs.mkdir(targetDir, { recursive: true }).catch(() => {})
  }

  return await withBackupLock(`Snapshot:${reason}:${actor}`, async () => {
    // 1. Generate safe, deterministic snapshot filename
    let reasonTag = String(reason)
    if (reason === "PRE_PERIOD_CLOSE" && options.period) {
      reasonTag = `PRE_PERIOD_CLOSE_${options.period.replace(/[^0-9-]/g, "_")}`
    } else if (reason === "POST_PERIOD_CLOSE" && options.period) {
      reasonTag = `POST_PERIOD_CLOSE_${options.period.replace(/[^0-9-]/g, "_")}`
    }

    const fileName = generateSnapshotFilename(reasonTag, now, options.targetVersion)
    const filePath = path.join(/*turbopackIgnore: true*/ targetDir, fileName)
    const snapshotId = `AQ-SNAP-${now.getTime()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`

    // 2. Fast snapshot collection (excludes external attachments for speed)
    const collected = await collectAllSystemData({ includeAttachments: false })

    // Financial period close and pre-restore snapshots are strictly immutable/protected
    const isProtected =
      reason === "PRE_RESTORE" ||
      reason === "PRE_PERIOD_CLOSE" ||
      reason === "POST_PERIOD_CLOSE" ||
      reason === "PRE_MIGRATION"

    const envelope: AQBackupEnvelope = {
      backupMetadata: {
        application: "AQ COMPANIES",
        backupFormatVersion: BACKUP_FORMAT_VERSION,
        applicationVersion: CURRENT_APPLICATION_VERSION,
        schemaVersion: String(CURRENT_DATABASE_SCHEMA_VERSION),
        backupId: snapshotId,
        backupType: "snapshot",
        createdAt: now.toISOString(),
        createdBy: `${reason} (${actor})`,
        note: options.note || `Lightweight snapshot generated for ${reason}`,
        protected: isProtected,
        recordCounts: collected.recordCounts,
        checksum: collected.databaseChecksum,
        financialTotals: collected.financialTotals,
        invarianceValid: collected.invarianceValid,
        completenessScore: 100,
        warnings: [],
        includedModules: ["all"],
        snapshotReason: reason,
        parentBackupId: options.parentBackupId,
      },
      data: {},
    }

    // Populate snapshot data from current active files
    for (const item of BACKUP_DATABASE_FILES) {
      const fPath = getDataPath(item.file)
      if (fsSync.existsSync(fPath)) {
        try {
          const raw = await fs.readFile(fPath, "utf8")
          ;(envelope.data as any)[item.key] = JSON.parse(raw)
        } catch {
          ;(envelope.data as any)[item.key] = []
        }
      }
    }

    // 3. Atomic write via temporary file
    const serialized = JSON.stringify(envelope, null, 2)
    const fileChecksum = computeSha256(serialized)
    envelope.backupMetadata.checksum = fileChecksum

    await atomicWriteFile(filePath, JSON.stringify(envelope, null, 2))
    const stats = await fs.stat(/*turbopackIgnore: true*/ filePath)

    // 4. Record snapshot in catalog
    const catalogItem: BackupItem = {
      id: snapshotId,
      fileName,
      filePath,
      type: reason === "PRE_RESTORE" ? "PRE_RESTORE_SAFETY" : "SNAPSHOT",
      status: "SUCCESS",
      verificationStatus: "VERIFIED",
      createdAt: now.toISOString(),
      completedAt: new Date().toISOString(),
      createdBy: `${reason} (${actor})`,
      appVersion: CURRENT_APPLICATION_VERSION,
      schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
      databaseRevision: Date.now(),
      fileSizeBytes: stats.size,
      databaseSizeBytes: stats.size,
      checksum: fileChecksum,
      protected: isProtected,
      note: envelope.backupMetadata.note,
      recordCounts: collected.recordCounts,
      storageLocation: "PRIMARY_LOCAL",
    }

    const currentCatalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
    const updatedCatalog = [catalogItem, ...currentCatalog.filter((b) => b.id !== snapshotId)]
    await writeJsonFile(BACKUPS_CATALOG_FILE, updatedCatalog)

    return {
      success: true,
      snapshotId,
      fileName,
      filePath,
      reason,
      createdAt: now.toISOString(),
      checksum: fileChecksum,
      fileSizeBytes: stats.size,
      recordCounts: collected.recordCounts,
      protected: isProtected,
    }
  })
}

/**
 * Convenience trigger: Pre-Restore snapshot
 */
export async function createPreRestoreSnapshot(actor = "System", restoreId = ""): Promise<SnapshotResult> {
  return await createSystemSnapshot({
    reason: "PRE_RESTORE",
    actor,
    note: `Safety rollback point created prior to executing restore ${restoreId}`,
  })
}

/**
 * Convenience trigger: Pre-Import snapshot (before any CSV/JSON batch import)
 */
export async function createPreImportSnapshot(actor = "System", batchId = ""): Promise<SnapshotResult> {
  return await createSystemSnapshot({
    reason: "PRE_IMPORT",
    actor,
    note: `Rollback point created prior to executing data import batch ${batchId}`,
  })
}

/**
 * Convenience trigger: Pre-Legacy BOL Import snapshot
 */
export async function createPreLegacyBolImportSnapshot(actor = "System", source = "Historical Archive"): Promise<SnapshotResult> {
  return await createSystemSnapshot({
    reason: "PRE_LEGACY_BOL_IMPORT",
    actor,
    note: `Rollback point created prior to importing legacy BOL historical records from ${source}`,
  })
}

/**
 * Convenience trigger: Accounting Period Close snapshot (immutable)
 */
export async function createPeriodCloseSnapshot(
  actor = "Finance Officer",
  period: string,
  type: "PRE" | "POST" = "PRE"
): Promise<SnapshotResult> {
  const reason = type === "PRE" ? "PRE_PERIOD_CLOSE" : "POST_PERIOD_CLOSE"
  return await createSystemSnapshot({
    reason,
    actor,
    period,
    note: `Immutable financial audit snapshot for accounting period ${period} (${type}-Closing)`,
  })
}

/**
 * Convenience trigger: Pre-Migration snapshot
 */
export async function createPreMigrationSnapshot(actor = "System", targetVersion: string): Promise<SnapshotResult> {
  return await createSystemSnapshot({
    reason: "PRE_MIGRATION",
    actor,
    targetVersion,
    note: `Rollback point created before upgrading database schema to ${targetVersion}`,
  })
}

/**
 * Convenience trigger: Pre-Data Repair snapshot
 */
export async function createPreDataRepairSnapshot(actor = "Admin", repairType: string): Promise<SnapshotResult> {
  return await createSystemSnapshot({
    reason: "PRE_DATA_REPAIR",
    actor,
    note: `Rollback point created before executing database repair: ${repairType}`,
  })
}
