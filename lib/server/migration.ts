import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { getServerPaths, ensureServerDirectories } from "./paths"
import { createDatabaseBackup } from "../backup/create-backup"
import { logAuditEvent } from "./audit"
import { readJsonFile, writeJsonFile } from "../services/blob-db"
import { getDataPath } from "../server-paths"

export interface MigrationResult {
  success: boolean
  preMigrationBackupPath: string
  copiedFiles: string[]
  recordCounts: Record<string, number>
  message: string
}

const DATA_FILES = [
  ".local-bols.json",
  ".local-invoices.json",
  ".local-account-ledgers.json",
  ".local-bol-account-ledgers.json",
  ".local-accounts.json",
  ".local-shipments.json",
  ".local-full-snapshot.json",
  ".bol-counter",
  ".invoice-counter",
]

/**
 * Migrates existing local database files into the dedicated server storage location,
 * creating a pre-migration backup archive first.
 */
export async function migrateToLocalServer(actor = "system"): Promise<MigrationResult> {
  const paths = await ensureServerDirectories()
  
  // 1. Create pre-migration backup first for absolute data safety
  const backup = await createDatabaseBackup({
    actionName: "pre-server-migration",
  })
  
  const backupFilename = `pre-server-migration-backup-${Date.now()}.zip`
  const preMigrationBackupPath = path.join(paths.backups, backupFilename)
  await fs.writeFile(preMigrationBackupPath, backup.buffer)

  // 2. Copy/sync each file to server database dir
  const copiedFiles: string[] = []
  const recordCounts: Record<string, number> = {}

  for (const file of DATA_FILES) {
    const srcPath = getDataPath(file)
    const destPath = path.join(/*turbopackIgnore: true*/ paths.database, file)

    if (existsSync(srcPath)) {
      try {
        const content = await fs.readFile(srcPath, "utf-8")
        await fs.writeFile(destPath, content, "utf-8")
        copiedFiles.push(file)

        if (file.endsWith(".json")) {
          try {
            const parsed = JSON.parse(content)
            recordCounts[file] = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length
          } catch {
            recordCounts[file] = 1
          }
        }
      } catch (err) {
        console.error(`[Migration] Failed to copy ${file}:`, err)
      }
    }
  }

  // Also copy uploaded documents if any
  const uploadsSrc = getDataPath("uploads")
  if (existsSync(uploadsSrc)) {
    try {
      const files = await fs.readdir(uploadsSrc)
      for (const f of files) {
        const srcFile = path.join(uploadsSrc, f)
        const destFile = path.join(paths.uploads, f)
        await fs.copyFile(srcFile, destFile).catch(() => {})
      }
      copiedFiles.push(`uploads (${files.length} files)`)
    } catch (err) {
      console.warn("[Migration] Could not copy uploads:", err)
    }
  }

  // 3. Log the audit event
  await logAuditEvent({
    action: "server_migration",
    entity: "system",
    actor,
    details: {
      preMigrationBackupPath,
      copiedFiles,
      recordCounts,
    },
  })

  return {
    success: true,
    preMigrationBackupPath,
    copiedFiles,
    recordCounts,
    message: "Data successfully migrated to central server storage with pre-migration backup preserved.",
  }
}
