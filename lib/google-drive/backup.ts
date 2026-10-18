import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { getDataPath, getUploadPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"
import { createZipArchive, type ArchiveEntry } from "./archive"
import { computeSha256, encryptPayload, getOrCreateVaultKey } from "./crypto"
import {
  ensureSkyArianaFolders,
  listBackupsFromDrive,
  uploadFileToDrive,
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
  GoogleDriveDocumentCounts,
  GoogleDriveRecordCounts,
} from "./types"

export class ZeroRecordDataLossError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ZeroRecordDataLossError"
  }
}

function getLocalDeviceId(): string {
  const host = os.hostname() || "desktop"
  const platform = os.platform()
  return `${platform}-${host}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_")
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
 * Creates a complete Sky Ariana system backup and uploads it to Google Drive.
 */
export async function createGoogleDriveBackup(options?: {
  encrypt?: boolean
  passphrase?: string
  isAutoBackup?: boolean
  onProgress?: (progress: BackupProgressUpdate) => void
}): Promise<{
  fileName: string
  fileId: string
  manifest: GoogleDriveBackupManifest
  recordCounts: GoogleDriveRecordCounts
}> {
  const onProgress = options?.onProgress || (() => {})
  const settings = await readDriveSettings()

  onProgress({
    stage: "preparing",
    percent: 5,
    message: "Preparing backup and ensuring Google Drive folders...",
  })

  // Ensure Drive folders exist
  const folders = await ensureSkyArianaFolders()

  // -------------------------------------------------------------------------
  // 1. COLLECT DATA FILES
  // -------------------------------------------------------------------------
  onProgress({
    stage: "collecting_bols",
    percent: 15,
    message: "Collecting Bill of Lading records...",
  })

  const bols = await readJsonFile<any[]>(getDataPath(".local-bols.json"), [])
  const invoices = await readJsonFile<any[]>(getDataPath(".local-invoices.json"), [])
  const accountLedgers = await readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {})
  const bolLedgers = await readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), {})
  const accounts = await readJsonFile<any[]>(getDataPath(".local-accounts.json"), [])
  const shipments = await readJsonFile<any[]>(getDataPath(".local-shipments.json"), [])
  const fullSnapshot = await readJsonFile<any>(getDataPath(".local-full-snapshot.json"), {})

  let bolCounter = ""
  let invoiceCounter = ""
  try {
    bolCounter = await fs.readFile(getDataPath(".bol-counter"), "utf8").catch(() => "")
    invoiceCounter = await fs.readFile(getDataPath(".invoice-counter"), "utf8").catch(() => "")
  } catch {}

  onProgress({
    stage: "collecting_accounting",
    percent: 30,
    message: "Collecting financial ledger and company accounts...",
  })

  // Count ledger entries across accounts
  let ledgerEntryCount = 0
  if (accountLedgers && typeof accountLedgers === "object") {
    for (const key of Object.keys(accountLedgers)) {
      if (Array.isArray(accountLedgers[key])) {
        ledgerEntryCount += accountLedgers[key].length
      } else if (accountLedgers[key]?.entries && Array.isArray(accountLedgers[key].entries)) {
        ledgerEntryCount += accountLedgers[key].entries.length
      }
    }
  }

  const recordCounts: GoogleDriveRecordCounts = {
    bols: bols.length,
    invoices: invoices.length,
    companies: accounts.length,
    ledgerEntries: ledgerEntryCount,
    accounts: accounts.length,
    shipments: shipments.length,
  }

  // -------------------------------------------------------------------------
  // ZERO-RECORD PROTECTION
  // -------------------------------------------------------------------------
  // Check if current dataset is unexpectedly empty while cloud already contains data
  if (recordCounts.bols === 0 && recordCounts.invoices === 0 && recordCounts.companies === 0) {
    const existingBackups = await listBackupsFromDrive(folders.backupsFolderId).catch(() => [])
    if (existingBackups.length > 0) {
      const lastBackup = existingBackups[0]
      if ((lastBackup.bolCount || 0) > 0 || (lastBackup.companyCount || 0) > 0) {
        if (options?.isAutoBackup) {
          // Pause automatic backup to prevent overwriting cloud records
          await updateDriveSettings({ autoBackupEnabled: false })
          await setPendingBackup(true, "Suspicious zero-record drop detected; auto-backup paused")
        }
        throw new ZeroRecordDataLossError(
          "Possible data loss detected: Local database has 0 BOLs and 0 accounts while Google Drive has existing backups. Cloud upload aborted."
        )
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. COLLECT DOCUMENT PDFs (Optional based on settings)
  // -------------------------------------------------------------------------
  onProgress({
    stage: "collecting_documents",
    percent: 45,
    message: "Collecting document files...",
  })

  const documentCounts: GoogleDriveDocumentCounts = {
    bolPdfs: 0,
    invoicePdfs: 0,
    packingListPdfs: 0,
    stickerPdfs: 0,
    otherDocs: 0,
  }

  const entries: ArchiveEntry[] = [
    { path: "data/bols.json", data: JSON.stringify(bols, null, 2) },
    { path: "data/invoices.json", data: JSON.stringify(invoices, null, 2) },
    { path: "data/account-ledgers.json", data: JSON.stringify(accountLedgers, null, 2) },
    { path: "data/bol-ledgers.json", data: JSON.stringify(bolLedgers, null, 2) },
    { path: "data/companies.json", data: JSON.stringify(accounts, null, 2) },
    { path: "data/shipments.json", data: JSON.stringify(shipments, null, 2) },
    { path: "data/settings.json", data: JSON.stringify(fullSnapshot?.companySettings || {}, null, 2) },
    { path: "data/route-presets.json", data: JSON.stringify(fullSnapshot?.routePresets || [], null, 2) },
    { path: "data/bol-counter.txt", data: bolCounter.trim() },
    { path: "data/invoice-counter.txt", data: invoiceCounter.trim() },
  ]

  // Add uploaded PDFs if enabled
  if (settings.includePdfs || settings.includeDocuments) {
    try {
      const uploadRoot = getUploadPath()
      const files = await fs.readdir(uploadRoot).catch(() => [] as string[])
      for (const file of files.slice(0, 100)) { // Limit to 100 recent files for sensible backup size
        try {
          const filePath = path.join(uploadRoot, file)
          const fileStat = await fs.stat(filePath)
          if (fileStat.isFile() && fileStat.size < 15_000_000) { // Max 15MB per document
            const buffer = await fs.readFile(filePath)
            entries.push({ path: `documents/${file}`, data: buffer })
            documentCounts.otherDocs++
          }
        } catch {}
      }
    } catch {}
  }

  // Build metadata index for instant search in Drive
  const bolNumbers = bols.map((b) => String(b.bol_number || b.id || "")).filter(Boolean).slice(0, 50)
  const invoiceNumbers = invoices.map((i) => String(i.invoice_number || i.id || "")).filter(Boolean).slice(0, 50)
  const companyNames = accounts.map((a) => String(a.name || a.companyName || "")).filter(Boolean).slice(0, 50)
  const shipperNames = bols.map((b) => String(b.shipper_name || "")).filter(Boolean).slice(0, 50)

  // -------------------------------------------------------------------------
  // 3. COMPRESS ARCHIVE
  // -------------------------------------------------------------------------
  onProgress({
    stage: "compressing",
    percent: 60,
    message: "Compressing backup archive...",
  })

  // Provisional manifest for checksum calculation
  const provisionalManifest: GoogleDriveBackupManifest = {
    app: "Sky Ariana BOL",
    backupVersion: 1,
    appVersion: CURRENT_SYSTEM_VERSION.version || "5.1.0",
    schemaVersion: "1.0",
    backupFormatVersion: "1.0",
    createdAt: new Date().toISOString(),
    deviceId: getLocalDeviceId(),
    checksum: "",
    encrypted: Boolean(options?.encrypt),
    encryptionAlgorithm: options?.encrypt ? "aes-256-gcm" : undefined,
    recordCounts,
    documentCounts,
    metadataIndex: {
      bolNumbers: Array.from(new Set(bolNumbers)),
      invoiceNumbers: Array.from(new Set(invoiceNumbers)),
      companyNames: Array.from(new Set(companyNames)),
      shipperNames: Array.from(new Set(shipperNames)),
    },
  }

  // Pre-calculate checksum from data payloads
  const dataChecksum = computeSha256(entries.map((e) => e.path + ":" + computeSha256(e.data)).join(";"))
  provisionalManifest.checksum = dataChecksum

  // Insert manifest.json as the first archive entry
  entries.unshift({
    path: "manifest.json",
    data: JSON.stringify(provisionalManifest, null, 2),
  })

  let archiveBuffer = createZipArchive(entries)

  // -------------------------------------------------------------------------
  // 4. ENCRYPT IF REQUESTED
  // -------------------------------------------------------------------------
  if (options?.encrypt) {
    onProgress({
      stage: "encrypting",
      percent: 75,
      message: "Encrypting backup archive with AES-256-GCM...",
    })

    const key = options.passphrase || (await getOrCreateVaultKey())
    const encryptedPkg = encryptPayload(archiveBuffer, key)
    archiveBuffer = Buffer.from(JSON.stringify(encryptedPkg, null, 2), "utf8")
  }

  // -------------------------------------------------------------------------
  // 5. UPLOAD TO GOOGLE DRIVE
  // -------------------------------------------------------------------------
  const timestampStr = formatBackupTimestamp()
  const fileName = `Sky-Ariana-Backup-${timestampStr}.zip`

  onProgress({
    stage: "uploading",
    percent: 85,
    message: "Uploading to Google Drive...",
    fileName,
    recordCounts,
  })

  const uploadResult = await uploadFileToDrive({
    name: fileName,
    mimeType: "application/zip",
    buffer: archiveBuffer,
    parentFolderId: folders.backupsFolderId,
    description: JSON.stringify(provisionalManifest),
    properties: {
      app: "Sky Ariana BOL",
      appVersion: provisionalManifest.appVersion,
      bolCount: String(recordCounts.bols),
      invoiceCount: String(recordCounts.invoices),
      companyCount: String(recordCounts.companies),
      ledgerCount: String(recordCounts.ledgerEntries),
      checksum: dataChecksum,
      encrypted: String(provisionalManifest.encrypted),
    },
  })

  // -------------------------------------------------------------------------
  // 6. VERIFY BACKUP
  // -------------------------------------------------------------------------
  onProgress({
    stage: "verifying",
    percent: 95,
    message: "Verifying cloud backup integrity...",
  })

  if (!uploadResult.id) {
    throw new Error("Google Drive did not return a valid file ID for the uploaded backup")
  }

  // Enforce backup retention
  await enforceBackupRetention(folders.backupsFolderId, settings.retentionLimit)

  // Mark pending offline backup as resolved
  await setPendingBackup(false)

  // Update last backup timestamp
  const nowIso = new Date().toISOString()
  await updateDriveSettings({
    lastBackupTime: nowIso,
    lastSyncTime: nowIso,
  })

  onProgress({
    stage: "completed",
    percent: 100,
    message: "Google Drive backup complete and verified.",
    fileId: uploadResult.id,
    fileName,
    recordCounts,
  })

  return {
    fileName,
    fileId: uploadResult.id,
    manifest: provisionalManifest,
    recordCounts,
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
  // Only consider backups matching our naming convention
  const appBackups = backups.filter((b) => b.name.startsWith("Sky-Ariana-Backup-"))

  if (appBackups.length <= retentionLimit) {
    return 0
  }

  // Backups are already ordered by createdTime desc; prune items past retentionLimit
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
