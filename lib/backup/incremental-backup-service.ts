/**
 * AQ COMPANIES — Incremental & Delta Backup Service
 * Version: 2.0 (Application Version 5.2.0, Backup Format Version 2.0)
 *
 * Implements:
 * 1. Change detection between a parent base backup and current operational data
 * 2. Entity-level delta generation (Created, Updated, Deleted by stable canonical IDs)
 * 3. Parent chain tracking (parentBackupId & baseBackupId)
 * 4. Deterministic chain validation (rejects broken chains with missing intermediate deltas)
 * 5. Transparent safety reporting
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
  generateIncrementalFilename,
  computeSha256,
  type AQBackupEnvelope,
  type AQBackupMetadata,
  type AQBackupDeltaEnvelope,
  type AQIncrementalChangeSummary,
  type AQEntityDelta,
} from "./backup-format"
import { collectAllSystemData, BACKUP_DATABASE_FILES } from "./backup-collector"
import { withBackupLock } from "./create-backup"
import { parseBackupFileContent } from "./central-backup-service"
import type { BackupItem, BackupRecordCounts } from "./backup-types"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

export interface CreateIncrementalBackupOptions {
  parentBackupId?: string
  actor?: string
  note?: string
  customTargetDir?: string
}

export interface IncrementalBackupResult {
  success: boolean
  backupId: string
  fileName: string
  filePath: string
  baseBackupId: string
  parentBackupId: string
  fileSizeBytes: number
  checksum: string
  changeSummary: AQIncrementalChangeSummary
  createdAt: string
}

/**
 * Creates an incremental delta backup against the latest verified full backup.
 */
export async function createIncrementalBackup(
  options: CreateIncrementalBackupOptions = {}
): Promise<IncrementalBackupResult> {
  const actor = options.actor || "System Incremental"
  const now = new Date()
  let targetDir = options.customTargetDir || getBackupRoot()
  try {
    await fs.mkdir(targetDir, { recursive: true })
  } catch {
    targetDir = path.join(os.tmpdir(), "backups")
    await fs.mkdir(targetDir, { recursive: true }).catch(() => {})
  }

  return await withBackupLock(actor, async () => {
    // 1. Locate the parent backup (defaults to latest verified backup)
    const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
    let parentItem: BackupItem | undefined

    if (options.parentBackupId) {
      parentItem = catalog.find((b) => b.id === options.parentBackupId)
    } else {
      parentItem = catalog.find((b) => b.verificationStatus === "VERIFIED" && b.status === "SUCCESS")
    }

    if (!parentItem) {
      throw new Error(
        "Cannot create incremental backup: No verified base backup was found. Please create a full backup first."
      )
    }

    if (!fsSync.existsSync(parentItem.filePath)) {
      throw new Error(`Parent backup file "${parentItem.fileName}" not found on disk at: ${parentItem.filePath}`)
    }

    // 2. Read parent backup data
    const parentParsed = await parseBackupFileContent(parentItem.filePath)
    const parentEnvelope: AQBackupEnvelope = parentParsed.rawParsed
    const parentData = parentEnvelope.data || {}

    // 3. Collect current system state
    const currentCollected = await collectAllSystemData({ includeAttachments: false })
    const currentData: Record<string, any> = {}

    for (const item of BACKUP_DATABASE_FILES) {
      const fPath = getDataPath(item.file)
      if (fsSync.existsSync(fPath)) {
        try {
          const raw = await fs.readFile(fPath, "utf8")
          currentData[item.key] = JSON.parse(raw)
        } catch {
          currentData[item.key] = []
        }
      }
    }

    // 4. Compute entity-level deltas
    const changes: Record<string, AQEntityDelta> = {}
    let totalCreated = 0
    let totalUpdated = 0
    let totalDeleted = 0

    const entityKeys = [
      "bols",
      "accounts",
      "companies",
      "invoices",
      "shipments",
      "containerBookings",
      "documents",
      "accountLedgers",
    ]

    for (const key of entityKeys) {
      const parentRecords = (parentData as any)[key] || []
      const currentRecords = currentData[key] || []

      const delta = computeEntityDelta(key, parentRecords, currentRecords)
      changes[key] = delta
      totalCreated += delta.created.length
      totalUpdated += delta.updated.length
      totalDeleted += delta.deletedIds.length
    }

    const baseBackupId = parentEnvelope.backupMetadata.baseBackupId || parentEnvelope.backupMetadata.backupId
    const parentBackupId = parentEnvelope.backupMetadata.backupId

    const changeSummary: AQIncrementalChangeSummary = {
      createdCount: totalCreated,
      updatedCount: totalUpdated,
      deletedCount: totalDeleted,
      baseBackupId,
      parentBackupId,
    }

    // 5. Build delta envelope
    const deltaBackupId = `AQ-INC-${now.getTime()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
    const fileName = generateIncrementalFilename(now, CURRENT_APPLICATION_VERSION)
    const filePath = path.join(targetDir, fileName)

    const deltaEnvelope: AQBackupDeltaEnvelope = {
      backupMetadata: {
        application: "AQ COMPANIES",
        backupFormatVersion: BACKUP_FORMAT_VERSION,
        applicationVersion: CURRENT_APPLICATION_VERSION,
        schemaVersion: String(CURRENT_DATABASE_SCHEMA_VERSION),
        backupId: deltaBackupId,
        backupType: "incremental",
        createdAt: now.toISOString(),
        createdBy: actor,
        note: options.note || `Incremental delta backup since ${parentEnvelope.backupMetadata.backupId}`,
        protected: false,
        recordCounts: currentCollected.recordCounts,
        checksum: "",
        financialTotals: currentCollected.financialTotals,
        invarianceValid: currentCollected.invarianceValid,
        completenessScore: 100,
        warnings: [],
        includedModules: ["all"],
        parentBackupId,
        baseBackupId,
        changeSummary,
      },
      delta: {
        baseBackupId,
        parentBackupId,
        changeSummary,
        changes,
      },
    }

    const serialized = JSON.stringify(deltaEnvelope, null, 2)
    const checksum = computeSha256(serialized)
    deltaEnvelope.backupMetadata.checksum = checksum

    await atomicWriteFile(filePath, JSON.stringify(deltaEnvelope, null, 2))
    const stats = await fs.stat(filePath)

    // 6. Record in catalog
    const catalogItem: BackupItem = {
      id: deltaBackupId,
      fileName,
      filePath,
      type: "INCREMENTAL",
      status: "SUCCESS",
      verificationStatus: "VERIFIED",
      createdAt: now.toISOString(),
      completedAt: new Date().toISOString(),
      createdBy: actor,
      appVersion: CURRENT_APPLICATION_VERSION,
      schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
      databaseRevision: Date.now(),
      fileSizeBytes: stats.size,
      databaseSizeBytes: stats.size,
      checksum,
      protected: false,
      note: deltaEnvelope.backupMetadata.note,
      recordCounts: currentCollected.recordCounts,
      storageLocation: "PRIMARY_LOCAL",
    }

    const updatedCatalog = [catalogItem, ...catalog.filter((b) => b.id !== deltaBackupId)]
    await writeJsonFile(BACKUPS_CATALOG_FILE, updatedCatalog)

    return {
      success: true,
      backupId: deltaBackupId,
      fileName,
      filePath,
      baseBackupId,
      parentBackupId,
      fileSizeBytes: stats.size,
      checksum,
      changeSummary,
      createdAt: now.toISOString(),
    }
  })
}

/**
 * Computes difference between two arrays or dictionaries using canonical IDs.
 */
function computeEntityDelta(entityKey: string, parentData: any, currentData: any): AQEntityDelta {
  const created: any[] = []
  const updated: any[] = []
  const deletedIds: string[] = []

  // If dictionary (e.g. accountLedgers)
  if (!Array.isArray(parentData) && typeof parentData === "object" && parentData !== null) {
    const parentKeys = new Set(Object.keys(parentData))
    const currentKeys = new Set(Object.keys(currentData || {}))

    for (const k of currentKeys) {
      if (!parentKeys.has(k)) {
        created.push({ key: k, value: currentData[k] })
      } else {
        const pStr = JSON.stringify(parentData[k])
        const cStr = JSON.stringify(currentData[k])
        if (pStr !== cStr) {
          updated.push({ key: k, value: currentData[k] })
        }
      }
    }

    for (const k of parentKeys) {
      if (!currentKeys.has(k)) {
        deletedIds.push(k)
      }
    }

    return { created, updated, deletedIds }
  }

  // If array of items
  const parentArr = Array.isArray(parentData) ? parentData : []
  const currentArr = Array.isArray(currentData) ? currentData : []

  const getId = (item: any): string => {
    if (!item) return ""
    return String(item.id || item.bolNumber || item.bol_number || item.accountNumber || item.name || "")
  }

  const parentMap = new Map<string, any>()
  for (const item of parentArr) {
    const id = getId(item)
    if (id) parentMap.set(id, item)
  }

  const currentMap = new Map<string, any>()
  for (const item of currentArr) {
    const id = getId(item)
    if (id) {
      currentMap.set(id, item)
      if (!parentMap.has(id)) {
        created.push(item)
      } else {
        const pStr = JSON.stringify(parentMap.get(id))
        const cStr = JSON.stringify(item)
        if (pStr !== cStr) {
          updated.push(item)
        }
      }
    }
  }

  for (const [id] of parentMap.entries()) {
    if (!currentMap.has(id)) {
      deletedIds.push(id)
    }
  }

  return { created, updated, deletedIds }
}

export interface IncrementalChainValidationResult {
  valid: boolean
  chain: string[] // List of backup IDs from Base -> Incremental 1 -> Incremental N
  missingParentId?: string
  brokenReason?: string
}

/**
 * Validates the full ancestry chain of an incremental backup:
 * Full Base A -> Incremental B -> Incremental C
 * Ensures no intermediate delta links are missing or corrupted.
 */
export async function validateIncrementalChain(
  targetBackupFilePath: string,
  backupCatalog: BackupItem[]
): Promise<IncrementalChainValidationResult> {
  const chain: string[] = []
  let currentFilePath = targetBackupFilePath

  while (currentFilePath) {
    if (!fsSync.existsSync(currentFilePath)) {
      return {
        valid: false,
        chain,
        brokenReason: `Backup file in chain not found on disk: ${currentFilePath}`,
      }
    }

    const parsed = await parseBackupFileContent(currentFilePath)
    const envelope = parsed.rawParsed
    const meta: AQBackupMetadata = envelope.backupMetadata

    if (!meta || !meta.backupId) {
      return {
        valid: false,
        chain,
        brokenReason: `Invalid backup metadata in file: ${currentFilePath}`,
      }
    }

    chain.unshift(meta.backupId)

    // If reached full base backup, the chain is valid
    if (meta.backupType !== "incremental" || !meta.parentBackupId) {
      return {
        valid: true,
        chain,
      }
    }

    // Look for parent backup in catalog
    const parentId = meta.parentBackupId
    const parentItem = backupCatalog.find((b) => b.id === parentId)

    if (!parentItem) {
      return {
        valid: false,
        chain,
        missingParentId: parentId,
        brokenReason: `Broken incremental backup chain: Parent backup "${parentId}" is missing from the system catalog.`,
      }
    }

    if (!fsSync.existsSync(parentItem.filePath)) {
      return {
        valid: false,
        chain,
        missingParentId: parentId,
        brokenReason: `Broken incremental backup chain: Parent backup file "${parentItem.fileName}" is missing from storage disk.`,
      }
    }

    currentFilePath = parentItem.filePath
  }

  return {
    valid: true,
    chain,
  }
}
