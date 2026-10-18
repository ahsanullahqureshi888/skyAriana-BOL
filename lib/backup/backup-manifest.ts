/**
 * Sky Ariana Backup Manifest & Recovery Metadata Generator
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import type { BackupManifest, BackupRecordCounts, CurrencyBalanceTotals, BackupType } from "./backup-types"

export const CURRENT_DATABASE_SCHEMA_VERSION = 16
export const CURRENT_APPLICATION_VERSION = "Sky Ariana BOL v5.1.0"

export interface ManifestOptions {
  backupId: string
  backupType: BackupType
  createdBy: string
  note?: string
  protected?: boolean
  sourceDevice?: {
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
  financialTotals: CurrencyBalanceTotals[]
  invarianceValid: boolean
  includedFiles: string[]
}

/**
 * Builds the canonical manifest.json metadata structure for a backup package
 */
export function buildBackupManifest(options: ManifestOptions): BackupManifest {
  return {
    manifestVersion: 1,
    backupId: options.backupId,
    backupVersion: "5.1.0",
    applicationVersion: CURRENT_APPLICATION_VERSION,
    databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    databaseEngine: "JSON_BLOB_STORAGE",
    backupType: options.backupType,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdBy: options.createdBy || "System",
    note: options.note,
    protected: Boolean(options.protected),
    sourceDevice: options.sourceDevice || {
      deviceId: "sky-device-local",
      deviceName: "Sky Ariana Workstation",
    },
    recordCounts: options.recordCounts,
    fileCounts: options.fileCounts,
    databaseChecksum: options.databaseChecksum,
    attachmentsChecksum: options.attachmentsChecksum,
    compositeChecksum: options.compositeChecksum,
    backupStatus: "SUCCESS",
    verificationStatus: "VERIFIED",
    financialTotals: options.financialTotals,
    invarianceValid: options.invarianceValid,
    includedFiles: options.includedFiles,
  }
}

/**
 * Builds machine-readable recovery-info.json for disaster scenarios
 */
export function buildRecoveryInfo(manifest: BackupManifest): Record<string, any> {
  return {
    recoveryProtocol: "SKY_ARIANA_DISASTER_RECOVERY_V1",
    backupId: manifest.backupId,
    created: manifest.createdAt,
    appVersion: manifest.applicationVersion,
    schemaVersion: manifest.databaseSchemaVersion,
    checksum: manifest.compositeChecksum,
    recordCounts: manifest.recordCounts,
    instructions: [
      "1. Verify package checksum using SHA-256 before restoration.",
      "2. Unzip contents into temporary folder.",
      "3. Copy database JSON files from database/ folder to application data/ directory.",
      "4. Copy attachments from attachments/ folder to public/uploads/ or data/uploads/.",
      "5. Verify ledger invariance (Debit - Credit = Balance) for each account.",
      "6. Restart Sky Ariana BOL service.",
    ],
    technicalContact: "Sky Ariana IT & System Operations (support@skyariana.com)",
  }
}

/**
 * Checks compatibility between backup manifest and current runtime schema
 */
export function checkBackupCompatibility(manifest: BackupManifest): {
  isCompatible: boolean
  warnings: string[]
  errors: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!manifest || typeof manifest !== "object") {
    errors.push("Invalid or missing manifest metadata.")
    return { isCompatible: false, warnings, errors }
  }

  if (manifest.databaseSchemaVersion > CURRENT_DATABASE_SCHEMA_VERSION) {
    errors.push(
      `Backup was created with newer schema v${manifest.databaseSchemaVersion} (current runtime supports up to v${CURRENT_DATABASE_SCHEMA_VERSION}). Please update the software before restoring.`
    )
  } else if (manifest.databaseSchemaVersion < CURRENT_DATABASE_SCHEMA_VERSION) {
    warnings.push(
      `Backup was created with older schema v${manifest.databaseSchemaVersion}. Automated schema upgrade migrations will be executed during restoration.`
    )
  }

  if (!manifest.invarianceValid) {
    warnings.push("Backup manifest indicates an accounting imbalance existed at the time of creation.")
  }

  return {
    isCompatible: errors.length === 0,
    warnings,
    errors,
  }
}
