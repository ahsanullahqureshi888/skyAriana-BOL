import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { getServerPaths, ensureServerDirectories } from "../server/paths"
import { createZipArchive, extractZipArchive, type ArchiveEntry } from "../google-drive/archive"
import { createDatabaseManifest, type DatabaseBackupManifest } from "../backup/manifest"
import type { BackupRecordCounts } from "../backup/collect-data"
import { computeBackupChecksum } from "../backup/checksum"
import { validateLedgerInvariance } from "../services/ledger-sync-utils"
import { logAuditEvent } from "../server/audit"

export interface ServerBackupInfo {
  filename: string
  filePath: string
  sizeBytes: number
  createdAt: string
  manifest?: DatabaseBackupManifest
}

export interface ServerRestoreResult {
  success: boolean
  preRestoreBackupPath?: string
  restoredFiles: string[]
  error?: string
}

function formatDateForFilename(date: Date): string {
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
 * Creates a server backup ZIP file in C:\ProgramData\SkyArianaBOL\backups\
 */
export async function createServerBackup(options?: {
  actor?: string
  label?: string
}): Promise<ServerBackupInfo> {
  const paths = await ensureServerDirectories()
  const now = new Date()
  const dateStr = formatDateForFilename(now)
  const filename = `Sky-Ariana-Server-Backup-${dateStr}.zip`
  const targetPath = path.join(paths.backups, filename)

  const archiveEntries: ArchiveEntry[] = []
  const recordCounts: BackupRecordCounts = {
    bols: 0,
    invoices: 0,
    companies: 0,
    ledgerEntries: 0,
    accounts: 0,
    shipments: 0,
  }

  // 1. Collect all files in database directory
  if (existsSync(paths.database)) {
    const dbFiles = await fs.readdir(paths.database)
    for (const f of dbFiles) {
      const fullPath = path.join(paths.database, f)
      const stat = await fs.stat(fullPath)
      if (stat.isFile()) {
        const content = await fs.readFile(fullPath)
        archiveEntries.push({
          path: `database/${f}`,
          data: content,
        })

        // Tally counts if JSON
        if (f.endsWith(".json")) {
          try {
            const parsed = JSON.parse(content.toString("utf8"))
            if (f.includes("bol")) {
              recordCounts.bols = Array.isArray(parsed) ? parsed.length : 0
            } else if (f.includes("invoice")) {
              recordCounts.invoices = Array.isArray(parsed) ? parsed.length : 0
            } else if (f.includes("account-ledger")) {
              let count = 0
              if (typeof parsed === "object" && parsed !== null) {
                for (const k of Object.keys(parsed)) {
                  if (Array.isArray(parsed[k])) count += parsed[k].length
                }
              }
              recordCounts.ledgerEntries = count
            } else if (f.includes("account")) {
              recordCounts.accounts = Array.isArray(parsed) ? parsed.length : 0
            }
          } catch {
            // Ignore parse errors for counting
          }
        }
      }
    }
  }

  // 2. Collect files in config directory
  if (existsSync(paths.config)) {
    const configFiles = await fs.readdir(paths.config)
    for (const f of configFiles) {
      const fullPath = path.join(paths.config, f)
      const stat = await fs.stat(fullPath)
      if (stat.isFile()) {
        const content = await fs.readFile(fullPath)
        archiveEntries.push({
          path: `config/${f}`,
          data: content,
        })
      }
    }
  }

  // 3. Create manifest and checksum
  const checksum = computeBackupChecksum(archiveEntries)
  const manifest = createDatabaseManifest({
    databaseRevision: Date.now(),
    recordCounts,
    checksum,
    encrypted: false,
  })

  archiveEntries.unshift({
    path: "manifest.json",
    data: JSON.stringify(manifest, null, 2),
  })

  // 4. Create ZIP and save
  const zipBuffer = createZipArchive(archiveEntries)
  await fs.writeFile(targetPath, zipBuffer)

  // 5. Log audit
  await logAuditEvent({
    action: "create_backup",
    entity: "backup",
    entityId: filename,
    actor: options?.actor || "system",
    details: {
      filename,
      sizeBytes: zipBuffer.length,
      recordCounts,
    },
  })

  return {
    filename,
    filePath: targetPath,
    sizeBytes: zipBuffer.length,
    createdAt: now.toISOString(),
    manifest,
  }
}

/**
 * Lists all existing server backups sorted newest first.
 */
export async function listServerBackups(): Promise<ServerBackupInfo[]> {
  const paths = await ensureServerDirectories()
  if (!existsSync(paths.backups)) return []

  const files = await fs.readdir(paths.backups)
  const backups: ServerBackupInfo[] = []

  for (const f of files) {
    if (f.endsWith(".zip")) {
      const filePath = path.join(paths.backups, f)
      try {
        const stat = await fs.stat(filePath)
        let manifest: DatabaseBackupManifest | undefined = undefined

        // Try extracting just manifest
        try {
          const buf = await fs.readFile(filePath)
          const extracted = extractZipArchive(buf)
          const mBuf = extracted.get("manifest.json")
          if (mBuf) {
            manifest = JSON.parse(mBuf.toString("utf8"))
          }
        } catch {
          // If manifest extraction fails, still show the file
        }

        backups.push({
          filename: f,
          filePath,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          manifest,
        })
      } catch (err) {
        console.warn(`[Backup] Error inspecting ${f}:`, err)
      }
    }
  }

  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Restores a server backup with automated pre-restore backup and rollback protection.
 */
export async function restoreServerBackup(
  backupFileName: string,
  options?: { actor?: string }
): Promise<ServerRestoreResult> {
  const paths = await ensureServerDirectories()
  const backupPath = path.isAbsolute(backupFileName)
    ? backupFileName
    : path.join(paths.backups, path.basename(backupFileName))

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`)
  }

  // 1. Read & validate archive before touching anything
  const zipBuffer = await fs.readFile(backupPath)
  let extractedMap: Map<string, Buffer>
  try {
    extractedMap = extractZipArchive(zipBuffer)
  } catch (err) {
    throw new Error(`Corrupt backup archive: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Check manifest if available
  const manifestData = extractedMap.get("manifest.json")
  if (manifestData) {
    try {
      const manifest: DatabaseBackupManifest = JSON.parse(manifestData.toString("utf8"))
      if (manifest.schemaVersion && manifest.schemaVersion > 2) {
        throw new Error(`Unsupported backup schema version: ${manifest.schemaVersion}`)
      }
    } catch (e: any) {
      if (e.message.includes("Unsupported backup schema")) throw e
    }
  }

  // 2. Validate ledger invariance in the backup if ledger exists
  const ledgerData = extractedMap.get("database/account-ledgers.json") || extractedMap.get("data/account-ledgers.json")
  if (ledgerData) {
    try {
      const ledgers = JSON.parse(ledgerData.toString("utf8"))
      const audit = validateLedgerInvariance(ledgers)
      if (!audit.isValid) {
        throw new Error(`Cannot restore backup: contains invalid ledger calculations (debit/credit mismatch).`)
      }
    } catch (e: any) {
      if (e.message.includes("invalid ledger calculations")) throw e
    }
  }

  // 3. Create pre-restore safety backup
  let preRestoreInfo: ServerBackupInfo | null = null
  try {
    preRestoreInfo = await createServerBackup({
      actor: options?.actor || "system",
      label: "pre-restore-safety-snapshot",
    })
  } catch (backupErr) {
    console.warn("[Restore] Warning: could not create pre-restore backup:", backupErr)
  }

  // 4. Perform extraction / overwrite
  const restoredFiles: string[] = []
  try {
    for (const [entryPath, buf] of extractedMap.entries()) {
      if (entryPath === "manifest.json") continue

      // Map entry paths to server structure
      let targetFile: string | null = null
      if (entryPath.startsWith("database/") || entryPath.startsWith("data/")) {
        const baseName = path.basename(entryPath)
        targetFile = path.join(paths.database, baseName)
      } else if (entryPath.startsWith("config/")) {
        const baseName = path.basename(entryPath)
        targetFile = path.join(paths.config, baseName)
      }

      if (targetFile) {
        await fs.writeFile(targetFile, buf)
        restoredFiles.push(targetFile)
      }
    }

    await logAuditEvent({
      action: "restore_backup",
      entity: "backup",
      entityId: path.basename(backupPath),
      actor: options?.actor || "system",
      details: {
        restoredFrom: path.basename(backupPath),
        preRestoreBackup: preRestoreInfo?.filename,
        filesRestoredCount: restoredFiles.length,
      },
    })

    return {
      success: true,
      preRestoreBackupPath: preRestoreInfo?.filePath,
      restoredFiles,
    }
  } catch (restoreError) {
    // Attempt rollback if pre-restore backup exists
    if (preRestoreInfo) {
      try {
        console.error("[Restore] Error during restore. Rolling back to pre-restore backup...", restoreError)
        const rollbackZip = await fs.readFile(preRestoreInfo.filePath)
        const rollbackFiles = extractZipArchive(rollbackZip)
        for (const [rPath, rBuf] of rollbackFiles.entries()) {
          if (rPath.startsWith("database/")) {
            await fs.writeFile(path.join(paths.database, path.basename(rPath)), rBuf)
          }
        }
      } catch (rollbackErr) {
        console.error("[Restore] Fatal: Rollback also failed:", rollbackErr)
      }
    }
    throw restoreError
  }
}

/**
 * Prunes old backups, keeping the most recent `maxKeep` backups.
 */
export async function pruneServerBackups(maxKeep = 10): Promise<number> {
  const backups = await listServerBackups()
  if (backups.length <= maxKeep) return 0

  const toDelete = backups.slice(maxKeep)
  let deletedCount = 0

  for (const b of toDelete) {
    try {
      await fs.unlink(b.filePath)
      deletedCount++
    } catch (e) {
      console.error(`[Backup Prune] Failed to delete ${b.filePath}:`, e)
    }
  }

  return deletedCount
}
