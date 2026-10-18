import { readStoredTokens, readDriveSettings, setPendingBackup, getPendingBackupStatus } from "./storage-settings"
import { isGoogleOAuthConfigured } from "./auth"
import {
  ensureSkyArianaFolders,
  getDriveStorageInfo,
  uploadFileToDrive,
  listBackupsFromDrive,
  findFileByName,
} from "./client"
import { executeGoogleDriveDatabaseBackup } from "./database-backup"
import { collectApplicationData } from "@/lib/backup/collect-data"
import { getDatabaseRevision } from "@/lib/backup/revision"
import type {
  AutoBackupInterval,
  DocumentCategory,
  GoogleDriveStatus,
  GoogleUserProfile,
} from "./types"

const INTERVAL_MS: Record<AutoBackupInterval, number> = {
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 1 * 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  manual: Infinity,
}

/**
 * Checks internet connectivity to Google's public endpoint.
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch("https://accounts.google.com/generate_204", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeout)
    return res.status === 204 || res.ok
  } catch {
    return false
  }
}

/**
 * Retrieves the comprehensive connection status of Google Drive.
 */
export async function getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  const oauthStatus = isGoogleOAuthConfigured()
  const tokens = await readStoredTokens()
  const settings = await readDriveSettings()
  const pending = await getPendingBackupStatus()
  const localData = await collectApplicationData().catch(() => null)
  const localRevision = await getDatabaseRevision().catch(() => 1000)

  const defaultStatus: GoogleDriveStatus = {
    state: "not_connected",
    configured: oauthStatus.configured,
    connected: false,
    rootFolderName: "Sky Ariana BOL",
    settings,
    pendingOfflineBackup: pending.pending,
    databaseRevision: localRevision,
    localCounts: localData?.recordCounts || {
      bols: 0,
      invoices: 0,
      companies: 0,
      ledgerEntries: 0,
    },
  }

  if (!tokens || !tokens.accessToken) {
    return defaultStatus
  }

  const userProfile: GoogleUserProfile = {
    email: tokens.email || settings.connectedAccountEmail,
    name: tokens.name || settings.connectedAccountName,
    picture: tokens.picture || settings.connectedAccountPicture,
  }

  // Check if token has expired and has no refresh token
  const isExpired = tokens.expiryDate < Date.now() && !tokens.refreshToken
  if (isExpired) {
    return {
      ...defaultStatus,
      state: "expired",
      connected: false,
      user: userProfile,
      connectedEmail: userProfile.email,
      lastBackup: settings.lastBackupTime,
      lastSync: settings.lastSyncTime,
      error: "Authorization has expired. Please reconnect Google Drive.",
    }
  }

  // Check connectivity
  const isOnline = await checkConnectivity()
  if (!isOnline) {
    return {
      ...defaultStatus,
      state: "offline",
      connected: true,
      user: userProfile,
      connectedEmail: userProfile.email,
      lastBackup: settings.lastBackupTime,
      lastSync: settings.lastSyncTime,
      error: "No Internet Connection. Cloud backup is pending.",
    }
  }

  // If online and had pending backup, trigger background retry
  if (pending.pending && settings.autoBackupEnabled) {
    void runPendingBackupRetry().catch(() => {})
  }

  // Fetch storage stats & cloud info
  let quota = null
  let cloudCounts = undefined
  let zeroRecordAlert = false
  let conflictDetected = false

  try {
    quota = await getDriveStorageInfo()
    if (!userProfile.name && quota.name) userProfile.name = quota.name
    if (!userProfile.email && quota.email) userProfile.email = quota.email
    if (!userProfile.picture && quota.picture) userProfile.picture = quota.picture

    const folders = await ensureSkyArianaFolders().catch(() => null)
    if (folders) {
      const recentBackups = await listBackupsFromDrive(folders.backupsFolderId).catch(() => [])
      if (recentBackups.length > 0) {
        const latest = recentBackups[0]
        cloudCounts = {
          bols: latest.bolCount || 0,
          invoices: latest.invoiceCount || 0,
          companies: latest.companyCount || 0,
          ledgerEntries: latest.ledgerCount || 0,
        }

        // Zero-record alert check
        if (
          (localData?.recordCounts.bols === 0 && (cloudCounts.bols || 0) > 0) ||
          (localData?.recordCounts.companies === 0 && (cloudCounts.companies || 0) > 0)
        ) {
          zeroRecordAlert = true
        }

        // Conflict check: cloud has higher revision and different device
        if (latest.databaseRevision && latest.databaseRevision > localRevision) {
          conflictDetected = true
        }
      }
    }
  } catch {}

  return {
    ...defaultStatus,
    state: "connected",
    connected: true,
    user: userProfile,
    connectedEmail: userProfile.email,
    cloudCounts,
    lastBackup: settings.lastBackupTime,
    lastSync: settings.lastSyncTime,
    conflictDetected,
    zeroRecordAlert,
    storageStats: {
      totalSpaceBytes: quota?.totalSpaceBytes,
      usedSpaceBytes: quota?.usedSpaceBytes,
      trashSpaceBytes: quota?.trashSpaceBytes,
    },
  }
}

/**
 * Runs pending backup retry with exponential backoff protection.
 */
async function runPendingBackupRetry(): Promise<void> {
  const pending = await getPendingBackupStatus()
  if (!pending.pending) return

  const backoffDelay = Math.min(pending.attemptCount * 30_000, 300_000)
  if (pending.lastAttemptAt) {
    const elapsed = Date.now() - new Date(pending.lastAttemptAt).getTime()
    if (elapsed < backoffDelay) return
  }

  const isOnline = await checkConnectivity()
  if (!isOnline) return

  try {
    await executeGoogleDriveDatabaseBackup({ isAutoBackup: true })
    await setPendingBackup(false)
  } catch (err: any) {
    await setPendingBackup(true, err?.message)
  }
}

/**
 * Evaluates whether an automated backup should run and executes it if due.
 */
export async function runAutoBackupJob(force = false): Promise<boolean> {
  const settings = await readDriveSettings()
  if (!settings.autoBackupEnabled && !force) {
    return false
  }

  const tokens = await readStoredTokens()
  if (!tokens || !tokens.accessToken) {
    return false
  }

  // Check interval
  if (!force && settings.autoBackupInterval !== "manual") {
    const intervalMs = INTERVAL_MS[settings.autoBackupInterval]
    if (settings.lastBackupTime) {
      const elapsed = Date.now() - new Date(settings.lastBackupTime).getTime()
      if (elapsed < intervalMs) {
        return false // Not due yet
      }
    }
  }

  const isOnline = await checkConnectivity()
  if (!isOnline) {
    await setPendingBackup(true, "Offline during scheduled backup window")
    return false
  }

  try {
    await executeGoogleDriveDatabaseBackup({ isAutoBackup: true })
    await setPendingBackup(false)
    return true
  } catch (err: any) {
    console.error("[gdrive-sync] Auto-backup failed:", err)
    await setPendingBackup(true, err?.message)
    return false
  }
}

let changeDebounceTimer: NodeJS.Timeout | null = null

/**
 * Debounced trigger for auto-backup after important data modifications (Save BOL, Invoice, Ledger, etc.).
 */
export function scheduleAutoBackupOnDataChange(): void {
  if (changeDebounceTimer) {
    clearTimeout(changeDebounceTimer)
  }

  changeDebounceTimer = setTimeout(async () => {
    try {
      const settings = await readDriveSettings()
      if (!settings.autoBackupEnabled) return

      const tokens = await readStoredTokens()
      if (!tokens?.accessToken) return

      const isOnline = await checkConnectivity()
      if (!isOnline) {
        await setPendingBackup(true, "Pending offline sync after data change")
        return
      }

      await executeGoogleDriveDatabaseBackup({ isAutoBackup: true })
    } catch (err) {
      console.warn("[gdrive-sync] Debounced change backup deferred:", err)
    }
  }, 10_000) // 10 second debounce
}

/**
 * Uploads a generated single document PDF (BOL, Invoice, Packing List, Cargo Sticker, Ledger)
 * to its dedicated Google Drive subfolder.
 */
export async function uploadDocumentToGoogleDrive(options: {
  buffer: Buffer
  fileName: string
  category: DocumentCategory
  metadata?: Record<string, string>
}): Promise<{ fileId: string; fileName: string; folderName: string }> {
  const folders = await ensureSkyArianaFolders()

  let targetFolderId = folders.documentsFolderId
  let folderName = "Documents"

  switch (options.category) {
    case "bol":
      targetFolderId = folders.bolFolderId
      folderName = "BOL"
      break
    case "invoice":
      targetFolderId = folders.invoicesFolderId
      folderName = "Invoices"
      break
    case "packing-list":
      targetFolderId = folders.packingListsFolderId
      folderName = "Packing Lists"
      break
    case "cargo-sticker":
      targetFolderId = folders.cargoStickersFolderId
      folderName = "Cargo Stickers"
      break
    case "ledger":
      targetFolderId = folders.ledgersFolderId
      folderName = "Ledgers"
      break
    case "export":
      targetFolderId = folders.exportsFolderId
      folderName = "Exports"
      break
    default:
      targetFolderId = folders.documentsFolderId
      folderName = "Documents"
  }

  const uploadResult = await uploadFileToDrive({
    name: options.fileName,
    mimeType: "application/pdf",
    buffer: options.buffer,
    parentFolderId: targetFolderId,
    description: `Sky Ariana BOL generated ${options.category} document`,
    properties: {
      app: "Sky Ariana BOL",
      documentCategory: options.category,
      ...(options.metadata || {}),
    },
  })

  return {
    fileId: uploadResult.id,
    fileName: uploadResult.name,
    folderName,
  }
}
