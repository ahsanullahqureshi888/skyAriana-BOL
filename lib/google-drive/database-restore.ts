import {
  restoreDatabaseArchiveBuffer,
  createPreRestoreSnapshot,
  type RestoreMode,
  type RestoreResult,
} from "@/lib/backup/restore-backup"
import { validateDatabaseBackupBuffer } from "@/lib/backup/validate-backup"
import { collectApplicationData } from "@/lib/backup/collect-data"
import { decryptPayload, getOrCreateVaultKey, type EncryptedPackage } from "./crypto"
import { downloadFileFromDrive, ensureSkyArianaFolders, findFileByName } from "./client"
import type { RestorePreview } from "./types"

/**
 * Previews a Google Drive database backup without modifying any local state.
 */
export async function previewGoogleDriveBackup(
  fileId: string,
  passphrase?: string
): Promise<RestorePreview> {
  let archiveBuffer = await downloadFileFromDrive(fileId)

  // Check if encrypted
  let isEncrypted = false
  try {
    const rawText = archiveBuffer.toString("utf8")
    if (rawText.includes("sky-ariana-vault-v1")) {
      isEncrypted = true
      const pkg = JSON.parse(rawText) as EncryptedPackage
      const key = passphrase || (await getOrCreateVaultKey())
      archiveBuffer = decryptPayload(pkg, key)
    }
  } catch {
    if (isEncrypted) {
      throw new Error("Failed to decrypt backup. A valid recovery passphrase is required.")
    }
  }

  const validation = validateDatabaseBackupBuffer(archiveBuffer)
  if (!validation.manifest) {
    throw new Error(validation.errors.join("; ") || "Invalid backup archive: missing manifest.json")
  }

  const { manifest } = validation
  const currentData = await collectApplicationData()

  return {
    backupId: fileId,
    name: `Backup-${manifest.createdAt.slice(0, 10)}`,
    createdAt: manifest.createdAt,
    appVersion: manifest.appVersion,
    databaseRevision: manifest.databaseRevision,
    recordCounts: manifest.counts || (manifest as any).recordCounts || {
      bols: 0,
      invoices: 0,
      companies: 0,
      ledgerEntries: 0,
    },
    currentRecordCounts: currentData.recordCounts,
    checksum: manifest.checksum,
    isValid: validation.isValid,
    encrypted: Boolean(manifest.encrypted),
    isNewerVersion: validation.isNewerVersion,
  }
}

/**
 * Restores local application data from a Google Drive backup.
 * Supports 'merge' (safe union by stable IDs) and 'replace' (full atomic overwrite).
 */
export async function restoreGoogleDriveBackup(options: {
  fileId?: string
  restoreLatest?: boolean
  mode: RestoreMode
  passphrase?: string
}): Promise<RestoreResult> {
  const { mode, passphrase } = options
  let resolvedFileId = options.fileId

  // If restoreLatest requested, find Sky-Ariana-Database-Latest.zip in Database/ folder
  if (!resolvedFileId && options.restoreLatest) {
    const folders = await ensureSkyArianaFolders()
    const latestFile = await findFileByName("Sky-Ariana-Database-Latest.zip", folders.databaseFolderId)
    if (!latestFile) {
      throw new Error("No 'Sky-Ariana-Database-Latest.zip' found in your Google Drive Database folder.")
    }
    resolvedFileId = latestFile.id
  }

  if (!resolvedFileId) {
    throw new Error("File ID or restoreLatest option is required to restore.")
  }

  let archiveBuffer = await downloadFileFromDrive(resolvedFileId)

  // Decrypt if encrypted
  let isEncrypted = false
  try {
    const rawText = archiveBuffer.toString("utf8")
    if (rawText.includes("sky-ariana-vault-v1")) {
      isEncrypted = true
      const pkg = JSON.parse(rawText) as EncryptedPackage
      const key = passphrase || (await getOrCreateVaultKey())
      archiveBuffer = decryptPayload(pkg, key)
    }
  } catch {
    if (isEncrypted) {
      throw new Error("Failed to decrypt backup. A valid recovery passphrase is required.")
    }
  }

  return restoreDatabaseArchiveBuffer({
    archiveBuffer,
    mode,
  })
}
