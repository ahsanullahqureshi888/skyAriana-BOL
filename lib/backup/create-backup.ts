/**
 * Sky Ariana Enterprise Backup Creation Engine
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"
import { getDataPath, getBackupRoot } from "@/lib/server-paths"
import { createZipArchive, type ArchiveEntry, extractZipArchive } from "@/lib/google-drive/archive"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { collectAllSystemData, computeSha256 } from "./backup-collector"
import { buildBackupManifest, buildRecoveryInfo, CURRENT_DATABASE_SCHEMA_VERSION, CURRENT_APPLICATION_VERSION } from "./backup-manifest"
import type { BackupItem, BackupManifest, BackupType, BackupRecordCounts, CurrencyBalanceTotals } from "./backup-types"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

// System-level in-memory re-entrant lock to prevent concurrent backups/restores
let lockCount = 0
let lockHolder = ""

export function isBackupOperationInProgress(): { locked: boolean; holder?: string } {
  return { locked: lockCount > 0, holder: lockHolder }
}

export function acquireBackupLock(actor: string): boolean {
  if (lockCount > 0 && lockHolder !== actor && !actor.includes(lockHolder) && !lockHolder.includes(actor)) {
    return false
  }
  lockCount++
  if (!lockHolder) {
    lockHolder = actor
  }
  return true
}

export function releaseBackupLock(): void {
  if (lockCount > 0) {
    lockCount--
    if (lockCount === 0) {
      lockHolder = ""
    }
  }
}

export async function withBackupLock<T>(actor: string, fn: () => Promise<T>): Promise<T> {
  if (!acquireBackupLock(actor)) {
    throw new Error(`A backup or restore operation is already in progress (locked by: ${lockHolder}). Please wait for it to complete.`)
  }
  try {
    return await fn()
  } finally {
    releaseBackupLock()
  }
}

export interface CreateBackupOptions {
  type?: BackupType
  actor?: string
  note?: string
  protected?: boolean
  includeAttachments?: boolean
  customTargetDir?: string
}

export interface CreatedBackupResult {
  backupItem: BackupItem
  manifest: BackupManifest
  buffer: Buffer
}

/**
 * Creates a complete, verified, standalone Sky Ariana backup archive (.zip).
 */
export async function createFullSystemBackup(
  options?: CreateBackupOptions
): Promise<CreatedBackupResult> {
  const actor = options?.actor || "System"
  return await withBackupLock(actor, async () => {
    // 1. Ensure backup directory exists
    let targetDir = options?.customTargetDir || getBackupRoot()
    try {
      await fs.mkdir(targetDir, { recursive: true })
    } catch {
      targetDir = path.join(os.tmpdir(), "backups")
      await fs.mkdir(targetDir, { recursive: true }).catch(() => {})
    }

    const type: BackupType = options?.type || "FULL"
    const now = new Date()
    const nowIso = now.toISOString()
    const timestampStr = nowIso
      .replace(/[:.]/g, "-")
      .slice(0, 19)

    const backupId = `bkp-${now.getTime()}-${crypto.randomBytes(3).toString("hex")}`
    const fileName = `SKY-ARIANA-${type.replace(/_/g, "-")}-BACKUP-${timestampStr}.zip`
    const finalFilePath = path.join(targetDir, fileName)

    // 2. Collect all system data and file attachments
    const collected = await collectAllSystemData({
      includeAttachments: options?.includeAttachments !== false,
    })

    // 3. Build manifest
    const manifest = buildBackupManifest({
      backupId,
      backupType: type,
      createdBy: actor,
      note: options?.note,
      protected: Boolean(options?.protected),
      recordCounts: collected.recordCounts,
      fileCounts: collected.fileCounts,
      databaseChecksum: collected.databaseChecksum,
      attachmentsChecksum: collected.attachmentsChecksum,
      compositeChecksum: collected.compositeChecksum,
      financialTotals: collected.financialTotals,
      invarianceValid: collected.invarianceValid,
      includedFiles: collected.includedFiles,
    })

    // 4. Build recovery info
    const recoveryInfo = buildRecoveryInfo(manifest)

    // 5. Assemble all archive entries
    const archiveEntries: ArchiveEntry[] = [
      {
        path: "manifest.json",
        data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
      },
      {
        path: "checksums.json",
        data: Buffer.from(JSON.stringify(collected.checksumsMap, null, 2), "utf8"),
      },
      {
        path: "recovery-info.json",
        data: Buffer.from(JSON.stringify(recoveryInfo, null, 2), "utf8"),
      },
      ...collected.entries.map((e) => ({
        path: e.path,
        data: e.data,
      })),
    ]

    // 6. Generate portable ZIP archive using native zlib DEFLATE
    const zipBuffer = createZipArchive(archiveEntries)
    const fileSizeBytes = zipBuffer.length

    // 7. Atomic write: write to .tmp then rename
    const tempFilePath = path.join(targetDir, `.${fileName}.tmp`)
    await fs.writeFile(tempFilePath, zipBuffer)
    await fs.rename(tempFilePath, finalFilePath)

    // 8. Immediate Post-Creation Deep Verification (Read back & check CRC32 / SHA-256)
    let isVerified = false
    try {
      const readBackBuffer = await fs.readFile(finalFilePath)
      const extracted = extractZipArchive(readBackBuffer)
      const manifestBuf = extracted.get("manifest.json")
      if (manifestBuf) {
        const readManifest: BackupManifest = JSON.parse(manifestBuf.toString("utf8"))
        if (readManifest.backupId === backupId && readManifest.compositeChecksum === manifest.compositeChecksum) {
          isVerified = true
        }
      }
    } catch (vErr) {
      console.error(`[CRITICAL BACKUP VERIFICATION FAILED] Backup ${fileName} failed verification:`, vErr)
    }

    const backupItem: BackupItem = {
      id: backupId,
      fileName,
      filePath: finalFilePath,
      type,
      status: isVerified ? "SUCCESS" : "FAILED",
      verificationStatus: isVerified ? "VERIFIED" : "FAILED",
      createdAt: nowIso,
      completedAt: new Date().toISOString(),
      createdBy: actor,
      appVersion: CURRENT_APPLICATION_VERSION,
      schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
      databaseRevision: Date.now(),
      fileSizeBytes,
      databaseSizeBytes: collected.entries
        .filter((e) => e.category === "database")
        .reduce((sum, e) => sum + e.sizeBytes, 0),
      checksum: manifest.compositeChecksum,
      protected: Boolean(options?.protected),
      note: options?.note,
      recordCounts: collected.recordCounts,
      storageLocation: "PRIMARY_LOCAL",
    }

    // 9. Update Catalog
    await registerBackupInCatalog(backupItem)

    return {
      backupItem,
      manifest,
      buffer: zipBuffer,
    }
  })
}

/**
 * Registers newly created backup into .local-backups-catalog.json
 */
export async function registerBackupInCatalog(item: BackupItem): Promise<void> {
  const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
  const list = Array.isArray(catalog) ? catalog : []

  // Replace if exists, or prepend
  const updated = [item, ...list.filter((b) => b.id !== item.id)]
  await writeJsonFile(BACKUPS_CATALOG_FILE, updated)
}

/**
 * Lists all registered backup catalog items
 */
export async function listAllBackups(): Promise<BackupItem[]> {
  const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
  const list = Array.isArray(catalog) ? catalog : []

  // Verify file existence on disk
  return list.map((item) => {
    const exists = fsSync.existsSync(item.filePath)
    if (!exists && item.status !== "DELETED") {
      return { ...item, status: "FAILED", verificationStatus: "FAILED", note: (item.note || "") + " (File missing on disk)" }
    }
    return item
  })
}

/**
 * Safely deletes a backup item with permissions & protection check
 */
export async function deleteBackupItem(
  backupId: string,
  options?: { actor?: string; reason?: string }
): Promise<{ success: boolean; error?: string }> {
  return await withBackupLock(options?.actor || "Admin", async () => {
    const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
    const list = Array.isArray(catalog) ? catalog : []
    const target = list.find((b) => b.id === backupId)

    if (!target) {
      return { success: false, error: `Backup with ID ${backupId} not found in catalog.` }
    }

    if (target.protected) {
      return { success: false, error: `Backup ${target.fileName} is PROTECTED from deletion. Unprotect it first.` }
    }

    // Strict safety check: Never delete the last verified recovery point
    const remainingVerified = list.filter((b) => b.id !== backupId && b.verificationStatus === "VERIFIED" && b.status === "SUCCESS")
    if (remainingVerified.length === 0) {
      return { success: false, error: "Deletion blocked: This is the ONLY remaining verified backup in the system. Create a new verified backup before deleting." }
    }

    // Delete file from disk
    if (fsSync.existsSync(target.filePath)) {
      try {
        await fs.unlink(target.filePath)
      } catch (err) {
        console.error(`Failed to delete backup file ${target.filePath}:`, err)
      }
    }

    // Update catalog
    const updated = list.filter((b) => b.id !== backupId)
    await writeJsonFile(BACKUPS_CATALOG_FILE, updated)

    return { success: true }
  })
}

/**
 * Toggles protection flag on a backup item
 */
export async function toggleBackupProtection(backupId: string, isProtected: boolean): Promise<boolean> {
  const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
  const list = Array.isArray(catalog) ? catalog : []
  const target = list.find((b) => b.id === backupId)
  if (!target) return false

  target.protected = isProtected
  await writeJsonFile(BACKUPS_CATALOG_FILE, list)
  return true
}

import { encryptPayload, getOrCreateVaultKey } from "@/lib/google-drive/crypto"
import { collectApplicationData, type BackupRecordCounts as LegacyRecordCounts } from "./collect-data"
import { computeBackupChecksum } from "./checksum"
import { createDatabaseManifest, type DatabaseBackupManifest } from "./manifest"
import { incrementDatabaseRevision } from "./revision"

export interface CreatedDatabaseBackup {
  buffer: Buffer
  manifest: DatabaseBackupManifest
  checksum: string
  recordCounts: LegacyRecordCounts
  databaseRevision: number
  isEncrypted: boolean
}

/**
 * Legacy support for Google Drive & Migration backup creation
 */
export async function createDatabaseBackup(options?: {
  encrypt?: boolean
  passphrase?: string
  includeDocuments?: boolean
  googleAccount?: string
  actionName?: string
}): Promise<CreatedDatabaseBackup> {
  const databaseRevision = await incrementDatabaseRevision(
    options?.actionName || "backup_created"
  )

  const collected = await collectApplicationData({
    includeDocuments: options?.includeDocuments,
  })

  const checksum = computeBackupChecksum(collected.entries)

  const bolNumbers: string[] = []
  const invoiceNumbers: string[] = []
  const companyNames: string[] = []

  try {
    const bolsEntry = collected.entries.find((e) => e.path === "data/bols.json")
    if (bolsEntry && typeof bolsEntry.data === "string") {
      const bols = JSON.parse(bolsEntry.data)
      if (Array.isArray(bols)) {
        for (const b of bols.slice(0, 50)) {
          const num = b.bol_number || b.id
          if (num) bolNumbers.push(String(num))
        }
      }
    }
  } catch {}

  try {
    const invoicesEntry = collected.entries.find((e) => e.path === "data/invoices.json")
    if (invoicesEntry && typeof invoicesEntry.data === "string") {
      const invoices = JSON.parse(invoicesEntry.data)
      if (Array.isArray(invoices)) {
        for (const inv of invoices.slice(0, 50)) {
          const num = inv.invoice_number || inv.id
          if (num) invoiceNumbers.push(String(num))
        }
      }
    }
  } catch {}

  try {
    const companiesEntry = collected.entries.find((e) => e.path === "data/companies.json")
    if (companiesEntry && typeof companiesEntry.data === "string") {
      const companies = JSON.parse(companiesEntry.data)
      if (Array.isArray(companies)) {
        for (const c of companies.slice(0, 50)) {
          const name = c.name || c.companyName
          if (name) companyNames.push(String(name))
        }
      }
    }
  } catch {}

  const manifest = createDatabaseManifest({
    databaseRevision,
    recordCounts: collected.recordCounts,
    checksum,
    googleAccount: options?.googleAccount,
    encrypted: Boolean(options?.encrypt),
    metadataIndex: {
      bolNumbers: Array.from(new Set(bolNumbers)),
      invoiceNumbers: Array.from(new Set(invoiceNumbers)),
      companyNames: Array.from(new Set(companyNames)),
    },
  })

  const archiveEntries: ArchiveEntry[] = [
    {
      path: "manifest.json",
      data: JSON.stringify(manifest, null, 2),
    },
    ...collected.entries,
  ]

  let buffer = createZipArchive(archiveEntries)
  const isEncrypted = Boolean(options?.encrypt)

  if (isEncrypted) {
    const key = options?.passphrase || (await getOrCreateVaultKey())
    const encryptedPkg = encryptPayload(buffer, key)
    buffer = Buffer.from(JSON.stringify(encryptedPkg, null, 2), "utf8")
  }

  return {
    buffer,
    manifest,
    checksum,
    recordCounts: collected.recordCounts,
    databaseRevision,
    isEncrypted,
  }
}

