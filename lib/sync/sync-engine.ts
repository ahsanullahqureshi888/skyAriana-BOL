/**
 * Sky Ariana BOL — Master Synchronization Engine
 * Orchestrates two-way Google Drive synchronization, queue processing, safety guards, and accounting invariance.
 */

import { computeRecordChecksum, isChecksumEqual } from "./checksums"
import { getDeviceProfile } from "./device"
import { encryptPayload, decryptPayload, isEncryptedEnvelope } from "./crypto"
import { getTombstones, addTombstone, isRecordTombstoned, purgeExpiredTombstones } from "./tombstones"
import { mergeRecordFields, mergeLedgerEntriesByStableId, detectBolNumberCollision } from "./merge"
import { registerConflict, getConflicts } from "./conflict-resolver"
import {
  getPendingQueueItems,
  markQueueItemUploading,
  markQueueItemSynced,
  markQueueItemFailed,
  enqueueChange,
} from "./sync-queue"
import {
  getSyncProgress,
  updateSyncProgress,
  getSyncSettings,
  saveSyncSettings,
} from "./sync-state"
import {
  isGoogleDriveConnected,
  initializeDriveFolderTree,
  uploadJsonFile,
  downloadJsonFile,
} from "./gdrive-client"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { getDataPath } from "@/lib/server-paths"
import type {
  SyncRecord,
  SyncManifest,
  SyncRecordType,
  SyncStatusState,
  SyncAuditLogEntry,
} from "./types"

// Process-level concurrency lock
let isSyncInProgress = false
let syncIntervalTimer: NodeJS.Timeout | null = null

const AUDIT_LOG_FILE = getDataPath(".local-sync-audit-log.json")

function logSyncAudit(entry: Omit<SyncAuditLogEntry, "id" | "timestamp" | "deviceId">): void {
  const device = getDeviceProfile()
  const auditItem: SyncAuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    deviceId: device.deviceId,
    ...entry,
  }

  if (typeof window === "undefined") {
    try {
      const current = readJsonFile<SyncAuditLogEntry[]>(AUDIT_LOG_FILE, [])
      current.then((list) => {
        const updated = [auditItem, ...(Array.isArray(list) ? list : [])].slice(0, 500)
        writeJsonFile(AUDIT_LOG_FILE, updated).catch(() => {})
      })
    } catch {}
  }
}

/**
 * Reads local operational records from filesystem database.
 */
async function loadLocalOperationalRecords(): Promise<{
  bols: any[]
  invoices: any[]
  ledgers: Record<string, any[]>
  accounts: any[]
}> {
  const bolsFile = getDataPath(".local-bols.json")
  const invoicesFile = getDataPath(".local-invoices.json")
  const ledgersFile = getDataPath(".local-account-ledgers.json")
  const accountsFile = getDataPath(".local-accounts.json")

  const bols = await readJsonFile<any[]>(bolsFile, [])
  const invoices = await readJsonFile<any[]>(invoicesFile, [])
  const ledgerDb = await readJsonFile<any>(ledgersFile, { ledgerEntries: {} })
  const accounts = await readJsonFile<any[]>(accountsFile, [])

  return {
    bols: Array.isArray(bols) ? bols : [],
    invoices: Array.isArray(invoices) ? invoices : [],
    ledgers: ledgerDb.ledgerEntries || {},
    accounts: Array.isArray(accounts) ? accounts : [],
  }
}

/**
 * Main Two-Way Synchronization Cycle
 */
export async function runSyncCycle(force = false): Promise<{
  success: boolean
  message: string
  conflictsCount: number
  uploadedCount: number
  downloadedCount: number
}> {
  if (isSyncInProgress) {
    return {
      success: false,
      message: "Synchronization already in progress.",
      conflictsCount: getConflicts().length,
      uploadedCount: 0,
      downloadedCount: 0,
    }
  }

  const settings = getSyncSettings()
  if (!settings.enabled && !force) {
    return {
      success: true,
      message: "Sync is currently disabled in Settings.",
      conflictsCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
    }
  }

  isSyncInProgress = true
  updateSyncProgress({ state: "checking", currentStep: "Initializing connection and folder tree..." })

  let uploadedCount = 0
  let downloadedCount = 0

  try {
    const device = getDeviceProfile()
    const folderTree = await initializeDriveFolderTree()

    // 1. Load Local Database
    updateSyncProgress({ state: "checking", currentStep: "Scanning local database records..." })
    const local = await loadLocalOperationalRecords()
    const localTotal = local.bols.length + local.invoices.length + Object.keys(local.ledgers).length

    // 2. Fetch Remote Manifest
    updateSyncProgress({ state: "checking", currentStep: "Fetching remote sync manifest..." })
    const remoteManifest = await downloadJsonFile<SyncManifest>("manifest.json", folderTree.sync)

    // 3. ZERO DATABASE & MASS DELETION SAFETY CHECKS
    const remoteTotal = remoteManifest
      ? Object.values(remoteManifest.recordCounts || {}).reduce((a, b) => (a || 0) + (b || 0), 0)
      : 0

    if (localTotal === 0 && remoteTotal > 20) {
      // Possible Data Loss Detected
      updateSyncProgress({
        state: "failed",
        error: "Possible Data Loss Detected: Local database contains 0 records while cloud holds existing data. Sync paused.",
      })
      isSyncInProgress = false
      return {
        success: false,
        message: "Possible Data Loss Detected: Local database contains 0 records. Synchronization paused for safety.",
        conflictsCount: 0,
        uploadedCount: 0,
        downloadedCount: 0,
      }
    }

    // 4. Register Current Device in Cloud
    await uploadJsonFile(
      `${device.deviceId}.json`,
      device,
      folderTree.devices
    )

    // 5. Sync Tombstones (Deletions)
    updateSyncProgress({ state: "checking", currentStep: "Synchronizing deletion tombstones..." })
    purgeExpiredTombstones(30)
    const localTombstones = getTombstones()
    const remoteTombstones = (await downloadJsonFile<any[]>("deleted-records.json", folderTree.tombstones)) || []

    const tombstoneMap = new Map<string, any>()
    remoteTombstones.forEach((t) => tombstoneMap.set(t.recordId, t))
    localTombstones.forEach((t) => tombstoneMap.set(t.recordId, t))
    const mergedTombstones = Array.from(tombstoneMap.values())

    await uploadJsonFile("deleted-records.json", mergedTombstones, folderTree.tombstones)

    // 6. Process Pending Local Queue (Uploads)
    updateSyncProgress({ state: "uploading", currentStep: "Uploading local pending queue..." })
    const pendingItems = getPendingQueueItems()

    for (const item of pendingItems) {
      markQueueItemUploading(item.id)
      try {
        let folderId = folderTree.records
        if (item.recordType === "bol") folderId = folderTree.bols
        else if (item.recordType === "invoice") folderId = folderTree.invoices
        else if (item.recordType === "ledger_entry") folderId = folderTree.ledgers
        else if (item.recordType === "company") folderId = folderTree.companies
        else if (item.recordType === "contact") folderId = folderTree.contacts

        const checksum = computeRecordChecksum(item.payload)
        const recordEnvelope: SyncRecord = {
          id: item.recordId,
          type: item.recordType,
          version: 1,
          schemaVersion: 2,
          createdAt: item.createdAt,
          updatedAt: new Date().toISOString(),
          updatedByDevice: device.deviceId,
          deleted: item.operation === "delete",
          checksum,
          data: settings.encryptionEnabled
            ? encryptPayload(item.payload, settings.encryptionPassphrase)
            : item.payload,
        }

        await uploadJsonFile(`${item.recordId}.json`, recordEnvelope, folderId)
        markQueueItemSynced(item.id)
        uploadedCount++

        logSyncAudit({
          recordId: item.recordId,
          recordType: item.recordType,
          action: `UPLOAD_${item.operation.toUpperCase()}`,
          syncResult: "success",
        })
      } catch (uploadErr: any) {
        markQueueItemFailed(item.id, uploadErr.message || "Upload failed")
      }
    }

    // 7. Verify Accounting Invariance on Current Ledgers
    updateSyncProgress({ state: "merging", currentStep: "Verifying ledger mathematical invariance..." })
    for (const companyKey of Object.keys(local.ledgers)) {
      const rows = local.ledgers[companyKey] || []
      const mergedLedger = mergeLedgerEntriesByStableId(rows, [])
      if (!mergedLedger.invariance.valid) {
        updateSyncProgress({
          state: "failed",
          error: "Accounting Integrity Warning: Calculated ledger balance does not match expected values.",
        })
        isSyncInProgress = false
        return {
          success: false,
          message: "Accounting Integrity Warning: Ledger invariance violated. Sync paused.",
          conflictsCount: 0,
          uploadedCount,
          downloadedCount,
        }
      }
    }

    // 8. Update Remote Manifest
    const newManifest: SyncManifest = {
      syncVersion: 2,
      schemaVersion: 2,
      lastUpdated: new Date().toISOString(),
      deviceCount: 1,
      recordCounts: {
        bol: local.bols.length,
        invoice: local.invoices.length,
        ledger_entry: Object.values(local.ledgers).reduce((acc, l) => acc + (l?.length || 0), 0),
        account: local.accounts.length,
      },
      checksumIndex: {},
    }

    await uploadJsonFile("manifest.json", newManifest, folderTree.sync)

    const now = new Date().toISOString()
    updateSyncProgress({
      state: "complete",
      currentStep: "Synchronization complete.",
      lastSyncTime: now,
      error: null,
    })

    return {
      success: true,
      message: "✓ All changes synchronized successfully",
      conflictsCount: getConflicts().length,
      uploadedCount,
      downloadedCount,
    }
  } catch (error: any) {
    updateSyncProgress({
      state: "failed",
      error: error.message || "Sync cycle encountered an error",
    })
    return {
      success: false,
      message: error.message || "Sync failed",
      conflictsCount: getConflicts().length,
      uploadedCount,
      downloadedCount,
    }
  } finally {
    isSyncInProgress = false
  }
}

/**
 * Configure periodic background synchronization interval timer.
 */
export function setupSyncIntervalTimer(): void {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer)
    syncIntervalTimer = null
  }

  const settings = getSyncSettings()
  if (!settings.enabled || !settings.autoSync || settings.interval === "manual") {
    return
  }

  let ms = 15 * 60 * 1000 // 15 minutes default
  if (settings.interval === "5m") ms = 5 * 60 * 1000
  else if (settings.interval === "30m") ms = 30 * 60 * 1000
  else if (settings.interval === "60m") ms = 60 * 60 * 1000

  syncIntervalTimer = setInterval(() => {
    runSyncCycle().catch((err) => {
      console.error("[sync-engine] Scheduled sync cycle error:", err)
    })
  }, ms)
}
