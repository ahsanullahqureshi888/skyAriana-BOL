/**
 * Sky Ariana Disaster Recovery, Database Safety & Enterprise Backup Types
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

export type BackupType =
  | "FULL"
  | "PRE_CLOSE"
  | "PERIOD_ARCHIVE"
  | "PRE_IMPORT"
  | "POST_IMPORT"
  | "PRE_MIGRATION"
  | "PRE_RESTORE"
  | "PRE_RESTORE_SAFETY"
  | "PRE_REPAIR_SAFETY"
  | "MANUAL"
  | "EMERGENCY"
  | "INCREMENTAL"
  | "SNAPSHOT"

export type BackupStatus =
  | "CREATING"
  | "VALIDATING"
  | "SUCCESS"
  | "WARNING"
  | "FAILED"
  | "DELETED"

export type VerificationStatus = "NOT_VERIFIED" | "VERIFIED" | "FAILED"

export type BackupHealthStatus = "HEALTHY" | "WARNING" | "FAILED" | "NOT_VERIFIED"

export interface BackupRecordCounts {
  bols: number
  shipments: number
  containers: number
  companies: number
  accounts: number
  invoices: number
  ledgerEntries: number
  payments: number
  supplierBills: number
  supplierCosts: number
  supplierPayments: number
  documents: number
  tasks: number
  alerts: number
  approvals: number
  users: number
  roles: number
  auditLogs: number
  totalRecords: number
}

export interface CurrencyBalanceTotals {
  currency: string
  totalDebit: number
  totalCredit: number
  netBalance: number
  accountCount: number
}

export interface BackupManifest {
  manifestVersion: number
  backupId: string
  backupVersion: string
  applicationVersion: string
  databaseSchemaVersion: number
  databaseEngine: "JSON_BLOB_STORAGE" | "SQLITE_INDEXED"
  backupType: BackupType
  createdAt: string
  completedAt?: string
  createdBy: string
  note?: string
  protected: boolean
  sourceDevice: {
    deviceId: string
    deviceName: string
    platform?: string
  }
  recordCounts: BackupRecordCounts
  fileCounts: {
    databaseFiles: number
    attachmentFiles: number
    settingFiles: number
    totalFiles: number
  }
  databaseChecksum: string
  attachmentsChecksum: string
  compositeChecksum: string
  backupStatus: BackupStatus
  verificationStatus: VerificationStatus
  financialTotals: CurrencyBalanceTotals[]
  invarianceValid: boolean
  includedFiles: string[]
}

export interface BackupItem {
  id: string
  fileName: string
  filePath: string
  type: BackupType
  status: BackupStatus
  verificationStatus: VerificationStatus
  createdAt: string
  completedAt?: string
  createdBy: string
  appVersion: string
  schemaVersion: number
  databaseRevision: number
  fileSizeBytes: number
  databaseSizeBytes: number
  checksum: string
  protected: boolean
  note?: string
  recordCounts: BackupRecordCounts
  storageLocation: "PRIMARY_LOCAL" | "SECONDARY_DIR" | "EXTERNAL_DRIVE" | "CLOUD"
}

export interface RestorePreview {
  backupId: string
  fileName: string
  createdAt: string
  backupType: BackupType
  appVersion: string
  schemaVersion: number
  currentAppVersion: string
  currentSchemaVersion: number
  isCompatible: boolean
  compatibilityNotes: string[]
  backupRecordCounts: BackupRecordCounts
  currentRecordCounts: BackupRecordCounts
  diff: {
    bols: number
    shipments: number
    invoices: number
    ledgerEntries: number
    payments: number
    documents: number
  }
  backupFileSize: number
  verificationStatus: VerificationStatus
  financialSummary: CurrencyBalanceTotals[]
}

export interface RestoreResult {
  success: boolean
  mode?: "replace" | "merge"
  backupId?: string
  backupFileName?: string
  preRestoreBackupFile: string
  recordsRestored?: number
  restoredCounts?: BackupRecordCounts | any
  filesRestored?: number
  durationMs?: number
  startedAt?: string
  completedAt?: string
  invarianceValid: boolean
  rolledBack?: boolean
  error?: string
  warnings?: string[]
  reconciliation?: {
    currency: string
    expectedDebit: number
    restoredDebit: number
    expectedCredit: number
    restoredCredit: number
    balanced: boolean
  }[]
}

export interface DatabaseHealthIssue {
  severity: "CRITICAL" | "WARNING" | "INFO"
  category: "RELATIONAL" | "ORPHAN" | "DUPLICATE" | "ACCOUNTING" | "DOCUMENT" | "STORAGE"
  module: string
  recordId?: string
  title: string
  details?: string
  repairable: boolean
  repairAction?: string
}

export interface DeepHealthReport {
  timestamp: string
  overallStatus: "HEALTHY" | "WARNING" | "CRITICAL"
  databaseRevision: number
  schemaVersion: number
  databaseReadable: boolean
  databaseWritable: boolean
  totalStorageBytes: number
  availableStorageBytes?: number
  lastBackupTime?: string
  lastBackupValid: boolean
  lastVerifiedTime?: string
  recordCounts: BackupRecordCounts
  issues: DatabaseHealthIssue[]
  checks: {
    relationalIntegrity: { pass: boolean; violations: number }
    orphanDetection: { pass: boolean; orphansCount: number }
    duplicateCriticalIds: { pass: boolean; duplicatesCount: number }
    accountingInvariance: { pass: boolean; discrepanciesCount: number }
    documentStorage: { pass: boolean; missingFilesCount: number }
  }
}

export interface DisasterRecoveryConfig {
  autoBackupEnabled: boolean
  dailyBackupTime: string // e.g. "23:00"
  weeklyFullBackup: boolean
  monthlyArchive: boolean
  retention: {
    dailyKeep: number // default 14
    weeklyKeep: number // default 8
    monthlyKeep: number // default 12
  }
  primaryStoragePath: string
  secondaryStoragePath?: string
  secondaryBackupEnabled: boolean
  cloudBackupEnabled: boolean
  cloudBackupStatus: "SYNCED" | "PENDING" | "FAILED" | "DISABLED"
  lastSuccessfulBackupTime?: string
  lastVerificationTime?: string
  lastHealthCheckTime?: string
}

export interface ImportBatchInfo {
  batchId: string
  importedAt: string
  importedBy: string
  fileName: string
  recordCount: number
  createdBolNumbers: string[]
  canRollback: boolean
  conflictReasons?: string[]
}
