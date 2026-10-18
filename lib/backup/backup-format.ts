/**
 * AQ COMPANIES — Enterprise Backup Envelope & Format Specification
 * Version: 2.0 (Backup Format Version 2.0, Application Version 5.2.0)
 *
 * Defines the canonical backup envelope, metadata schemas, record count structures,
 * and deterministic Windows-safe naming conventions.
 */

import crypto from "node:crypto"
import type { BackupRecordCounts, CurrencyBalanceTotals } from "./backup-types"

export const BACKUP_FORMAT_VERSION = "2.0"
export const CURRENT_APPLICATION_VERSION = "5.2.0"
export const CURRENT_DATABASE_SCHEMA_VERSION = 2

export type AQBackupType =
  | "full"
  | "data_only"
  | "documents_only"
  | "accounting_only"
  | "bol_logistics_only"
  | "settings_only"
  | "custom"
  | "snapshot"
  | "incremental"

export type AQBackupExtension = "json" | "zip"

export interface AQIncrementalChangeSummary {
  createdCount: number
  updatedCount: number
  deletedCount: number
  baseBackupId: string
  parentBackupId: string
}

export interface AQEntityDelta {
  created: any[]
  updated: any[]
  deletedIds: string[]
}

export interface AQBackupDeltaPayload {
  baseBackupId: string
  parentBackupId: string
  changeSummary: AQIncrementalChangeSummary
  changes: Record<string, AQEntityDelta>
}

export interface AQBackupMetadata {
  application: "AQ COMPANIES"
  backupFormatVersion: string // e.g. "2.0"
  applicationVersion: string // e.g. "5.2.0"
  schemaVersion: string // e.g. "2.0"
  backupId: string
  backupType: AQBackupType
  createdAt: string // ISO UTC
  createdBy: string
  note?: string
  protected: boolean
  recordCounts: BackupRecordCounts
  checksum: string // SHA-256 of data payload or composite
  sourceDevice?: {
    deviceId: string
    deviceName: string
    platform?: string
  }
  financialTotals: CurrencyBalanceTotals[]
  invarianceValid: boolean
  completenessScore: number // 100 for perfect, reduced if warnings exist
  warnings: string[]
  includedModules: string[]
  attachmentFilesCount?: number
  uncompressedSizeBytes?: number
  // Phase 2 Fields:
  parentBackupId?: string
  baseBackupId?: string
  snapshotReason?: string
  restoreTestStatus?: "PASS" | "FAIL" | "UNTESTED"
  lastRestoreTestedAt?: string
  restoreTestDurationMs?: number
  isGoldenBackup?: boolean
  changeSummary?: AQIncrementalChangeSummary
}

export interface AQBackupDataPayload {
  bols?: any[]
  bolSequence?: any
  shipments?: any[]
  containerBookings?: any[]
  companies?: any[]
  accounts?: any[]
  masterEntities?: any[]
  suppliers?: any[]
  invoices?: any[]
  financeInvoices?: any[]
  financePayments?: any[]
  financeReceipts?: any[]
  financeRates?: any[]
  shipmentCosts?: any[]
  supplierBills?: any[]
  supplierCosts?: any[]
  supplierPayments?: any[]
  supplierLedgers?: any
  accountLedgers?: any
  bolAccountLedgers?: any
  ledgerSystem?: any
  shipmentDocuments?: any[]
  documentCompliance?: any
  portalAccounts?: any[]
  customerPortalUsers?: any[]
  rbacUsers?: any[]
  rbacRoles?: any[]
  workflowTasks?: any[]
  dailyOps?: any[]
  alerts?: any[]
  approvals?: any[]
  auditLogs?: any[]
  settings?: {
    fullSnapshot?: any
    accountingSettings?: any
    companyAccess?: any
    syncCodes?: any
    device?: any
    bolCounters?: Record<string, string>
    watermarkSettings?: any
    bolSettings?: any
    userPreferences?: any
  }
  documentsMetadata?: any[]
  documents?: any[]
}

/**
 * The Canonical V2 Backup Envelope
 */
export interface AQBackupEnvelope {
  backupMetadata: AQBackupMetadata
  data: AQBackupDataPayload
}

/**
 * Incremental Delta Backup Envelope
 */
export interface AQBackupDeltaEnvelope {
  backupMetadata: AQBackupMetadata
  delta: AQBackupDeltaPayload
}

/**
 * Manifest for ZIP container archives with attachments
 */
export interface AQZipManifest {
  manifestVersion: number
  backupId: string
  backupFormatVersion: string
  applicationVersion: string
  createdAt: string
  entries: {
    relativePath: string
    fileSize: number
    checksum: string
    category: "metadata" | "database" | "attachment" | "document" | "setting"
    entityRelation?: {
      entityType: "BOL" | "INVOICE" | "COMPANY"
      entityId: string
      bolNumber?: string
    }
  }[]
  totalFiles: number
  totalSizeBytes: number
  compositeChecksum: string
}

/**
 * Deterministic Windows-safe backup filename generator.
 * Format: AQ_COMPANIES_<TYPE>_BACKUP_YYYY-MM-DD_HHMMSS_v<APP_VERSION>.<EXT>
 * Never includes :, /, or \ characters.
 */
export function generateBackupFilename(
  type: AQBackupType = "full",
  extension: AQBackupExtension = "json",
  date: Date = new Date(),
  version: string = CURRENT_APPLICATION_VERSION
): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  const typeStr = type.toUpperCase().replace(/[^A-Z0-9]/g, "_")
  const safeTimestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`
  const safeVersion = version.replace(/[^a-zA-Z0-9.-]/g, "_")

  return `AQ_COMPANIES_${typeStr}_BACKUP_${safeTimestamp}_v${safeVersion}.${extension}`
}

/**
 * Deterministic Windows-safe rollback snapshot filename generator.
 */
export function generateRollbackSnapshotFilename(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  const safeTimestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`
  return `AQ_COMPANIES_PRE_RESTORE_${safeTimestamp}.json`
}

/**
 * Deterministic Windows-safe snapshot filename generator.
 * Formats:
 * - AQ_COMPANIES_PRE_RESTORE_YYYY-MM-DD_HHMMSS.json
 * - AQ_COMPANIES_PRE_IMPORT_YYYY-MM-DD_HHMMSS.json
 * - AQ_COMPANIES_PRE_PERIOD_CLOSE_YYYY-MM.json
 * - AQ_COMPANIES_PRE_MIGRATION_vX.Y.Z.json
 */
export function generateSnapshotFilename(
  reason: string,
  date: Date = new Date(),
  version?: string
): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  const safeReason = reason.toUpperCase().replace(/[^A-Z0-9_]/g, "_")

  // For monthly period closing: PRE_PERIOD_CLOSE_YYYY-MM
  if (safeReason.includes("PERIOD_CLOSE")) {
    if (/\d{4}[-_]\d{2}/.test(safeReason)) {
      const canonicalReason = safeReason.replace(/(\d{4})_(\d{2})/, "$1-$2")
      return `AQ_COMPANIES_${canonicalReason}.json`
    }
    return `AQ_COMPANIES_${safeReason}_${year}-${month}.json`
  }

  // For migrations: PRE_MIGRATION_vX.Y.Z
  if (safeReason.includes("MIGRATION") && version) {
    const safeVer = version.replace(/[^a-zA-Z0-9.-]/g, "_")
    return `AQ_COMPANIES_${safeReason}_v${safeVer}.json`
  }

  const safeTimestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`
  return `AQ_COMPANIES_${safeReason}_${safeTimestamp}.json`
}

/**
 * Deterministic Windows-safe incremental backup filename generator.
 * Format: AQ_COMPANIES_INCREMENTAL_BACKUP_YYYY-MM-DD_HHMMSS_v<APP_VERSION>.json
 */
export function generateIncrementalFilename(
  date: Date = new Date(),
  version: string = CURRENT_APPLICATION_VERSION
): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  const safeTimestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`
  const safeVersion = version.replace(/[^a-zA-Z0-9.-]/g, "_")
  return `AQ_COMPANIES_INCREMENTAL_BACKUP_${safeTimestamp}_v${safeVersion}.json`
}

/**
 * Computes SHA-256 hex digest for any string or buffer.
 */
export function computeSha256(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}
