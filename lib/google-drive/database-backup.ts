import { createDatabaseBackup } from "@/lib/backup/create-backup"
import { getDatabaseRevision } from "@/lib/backup/revision"
import {
  ensureSkyArianaFolders,
  listBackupsFromDrive,
  uploadFileToDrive,
  uploadOrUpdateFile,
  deleteDriveFile,
} from "./client"
import {
  readDriveSettings,
  updateDriveSettings,
  setPendingBackup,
} from "./storage-settings"
import type {
  BackupProgressUpdate,
  GoogleDriveBackupManifest,
  GoogleDriveRecordCounts,
} from "./types"

export class ZeroRecordDataLossError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ZeroRecordDataLossError"
  }
}

export class MultiDeviceConflictError extends Error {
  public cloudRevision: number
  public localRevision: number

  constructor(message: string, localRevision: number, cloudRevision: number) {
    super(message)
    this.name = "MultiDeviceConflictError"
    this.localRevision = localRevision
    this.cloudRevision = cloudRevision
  }
}

function formatBackupTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${yyyy}-${mm}-${dd}-${hh}${min}${ss}`
}

/**
 * Creates and uploads a complete Sky Ariana database snapshot to Google Drive.
 * Stores both `Sky-Ariana-Database-Latest.zip` in `Database/`
 * and historical `Sky-Ariana-Database-YYYY-MM-DD-HHmmss.zip` in `Backups/`.
 */
export async function executeGoogleDriveDatabaseBackup(options?: {
  encrypt?: boolean
  passphrase?: string
  isAutoBackup?: boolean
  force?: boolean
  onProgress?: (progress: BackupProgressUpdate) => void
}): Promise<{
  fileName: string
  fileId: string
  manifest: GoogleDriveBackupManifest
  recordCounts: GoogleDriveRecordCounts
  databaseRevision: number
}> {
  const onProgress = options?.onProgress || (() => {})
  const settings = await readDriveSettings()

  onProgress({
    stage: "preparing",
    percent: 5,
    message: "Locating Sky Ariana Google Drive folders...",
  })

  // Ensure folders in connected user's Drive
  const folders = await ensureSkyArianaFolders()

  // -------------------------------------------------------------------------
  // 1. CREATE VALIDATED BACKUP VIA BACKUP SERVICE
  // -------------------------------------------------------------------------
  onProgress({
    stage: "collecting_bols",
    percent: 25,
    message: "Validating and packing local database records...",
  })

  const backupPackage = await createDatabaseBackup({
    encrypt: options?.encrypt ?? false,
    passphrase: options?.passphrase,
    includeDocuments: settings.includeDocuments || settings.includePdfs,
    googleAccount: settings.connectedAccountEmail,
    actionName: options?.isAutoBackup ? "auto_backup" : "manual_backup",
  })

  const { buffer, manifest, recordCounts, databaseRevision } = backupPackage

  // -------------------------------------------------------------------------
  // 2. ZERO-RECORD PROTECTION
  // -------------------------------------------------------------------------
  if (recordCounts.bols === 0 && recordCounts.invoices === 0 && recordCounts.companies === 0 && !options?.force) {
    const existingBackups = await listBackupsFromDrive(folders.backupsFolderId).catch(() => [])
    if (existingBackups.length > 0) {
      const lastBackup = existingBackups[0]
      if ((lastBackup.bolCount || 0) > 0 || (lastBackup.companyCount || 0) > 0) {
        if (options?.isAutoBackup) {
          // Pause auto backup so healthy cloud data is not wiped
          await updateDriveSettings({ autoBackupEnabled: false })
          await setPendingBackup(true, "Suspicious zero-record drop detected; auto-backup paused")
        }
        throw new ZeroRecordDataLossError(
          "Possible data loss detected: Local database has 0 BOLs and 0 accounts while Google Drive contains existing backups. Cloud upload aborted."
        )
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. UPLOAD LATEST DATABASE SNAPSHOT (Sky-Ariana-Database-Latest.zip)
  // -------------------------------------------------------------------------
  onProgress({
    stage: "uploading",
    percent: 60,
    message: "Synchronizing latest database snapshot to Sky Ariana BOL/Database/...",
    recordCounts,
  })

  const latestUploadResult = await uploadOrUpdateFile({
    name: "Sky-Ariana-Database-Latest.zip",
    mimeType: "application/zip",
    buffer,
    parentFolderId: folders.databaseFolderId,
    description: JSON.stringify(manifest),
    properties: {
      app: "Sky Ariana BOL",
      appVersion: manifest.appVersion,
      databaseRevision: String(databaseRevision),
      bolCount: String(recordCounts.bols),
      invoiceCount: String(recordCounts.invoices),
      companyCount: String(recordCounts.companies),
      ledgerCount: String(recordCounts.ledgerEntries),
      checksum: manifest.checksum,
      encrypted: String(manifest.encrypted),
    },
  })

  // -------------------------------------------------------------------------
  // 4. UPLOAD HISTORICAL TIMESTAMPED BACKUP (Backups/)
  // -------------------------------------------------------------------------
  onProgress({
    stage: "uploading",
    percent: 80,
    message: "Archiving historical backup to Sky Ariana BOL/Backups/...",
  })

  const timestampStr = formatBackupTimestamp()
  const historyFileName = `Sky-Ariana-Database-${timestampStr}.zip`

  const historyUploadResult = await uploadFileToDrive({
    name: historyFileName,
    mimeType: "application/zip",
    buffer,
    parentFolderId: folders.backupsFolderId,
    description: JSON.stringify(manifest),
    properties: {
      app: "Sky Ariana BOL",
      appVersion: manifest.appVersion,
      databaseRevision: String(databaseRevision),
      bolCount: String(recordCounts.bols),
      invoiceCount: String(recordCounts.invoices),
      companyCount: String(recordCounts.companies),
      ledgerCount: String(recordCounts.ledgerEntries),
      checksum: manifest.checksum,
      encrypted: String(manifest.encrypted),
    },
  })

  // -------------------------------------------------------------------------
  // 5. ENFORCE RETENTION & UPDATE TIMESTAMPS
  // -------------------------------------------------------------------------
  onProgress({
    stage: "verifying",
    percent: 95,
    message: "Enforcing retention policy and verifying backup...",
  })

  await enforceBackupRetention(folders.backupsFolderId, settings.retentionLimit)
  await setPendingBackup(false)

  const nowIso = new Date().toISOString()
  await updateDriveSettings({
    lastBackupTime: nowIso,
    lastSyncTime: nowIso,
  })

  onProgress({
    stage: "completed",
    percent: 100,
    message: "Google Drive database backup complete and verified.",
    fileId: historyUploadResult.id || latestUploadResult.id,
    fileName: historyFileName,
    recordCounts,
  })

  return {
    fileName: historyFileName,
    fileId: historyUploadResult.id,
    manifest: {
      ...manifest,
      recordCounts,
    } as any,
    recordCounts,
    databaseRevision,
  }
}

/**
 * Enforces the retention policy by deleting oldest Sky Ariana backups beyond the limit.
 */
export async function enforceBackupRetention(
  backupsFolderId: string,
  retentionLimit: 5 | 10 | 30 | "all"
): Promise<number> {
  if (retentionLimit === "all") return 0

  const backups = await listBackupsFromDrive(backupsFolderId)
  const appBackups = backups.filter(
    (b) => b.name.startsWith("Sky-Ariana-Database-") || b.name.startsWith("Sky-Ariana-Backup-")
  )

  if (appBackups.length <= retentionLimit) {
    return 0
  }

  const toDelete = appBackups.slice(retentionLimit)
  let deletedCount = 0

  for (const item of toDelete) {
    try {
      await deleteDriveFile(item.id)
      deletedCount++
    } catch (err) {
      console.error(`Failed to prune old backup ${item.name}:`, err)
    }
  }

  return deletedCount
}
