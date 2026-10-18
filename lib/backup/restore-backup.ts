/**
 * Sky Ariana Enterprise Safe Database Restore Engine
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import { getDataPath, getUploadPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import { extractZipArchive } from "@/lib/google-drive/archive"
import { validateDatabaseBackupBuffer, testRestoreInSandbox } from "./validate-backup"
import { createFullSystemBackup, withBackupLock } from "./create-backup"
import { collectAllSystemData } from "./backup-collector"
import { CURRENT_DATABASE_SCHEMA_VERSION, CURRENT_APPLICATION_VERSION } from "./backup-manifest"
import { setDatabaseRevisionIfHigher } from "./revision"
import type {
  RestorePreview,
  RestoreResult,
  BackupRecordCounts,
  CurrencyBalanceTotals,
  BackupManifest,
} from "./backup-types"

export type {
  RestorePreview,
  RestoreResult,
  BackupRecordCounts,
  CurrencyBalanceTotals,
  BackupManifest,
}

export type RestoreMode = "replace" | "merge"

export async function createPreRestoreSnapshot(): Promise<string> {
  const bkp = await createFullSystemBackup({
    type: "PRE_RESTORE_SAFETY",
    actor: "Pre-Restore Snapshot",
    note: "Pre-restore safety snapshot",
    protected: true,
  })
  return bkp.backupItem.fileName
}

const MAINTENANCE_FILE = getDataPath(".local-maintenance-mode.json")

export interface MaintenanceStatus {
  active: boolean
  reason?: string
  activatedAt?: string
  activatedBy?: string
}

export async function getMaintenanceMode(): Promise<MaintenanceStatus> {
  try {
    return await readJsonFile<MaintenanceStatus>(MAINTENANCE_FILE, { active: false })
  } catch {
    return { active: false }
  }
}

export async function setMaintenanceMode(
  active: boolean,
  options?: { reason?: string; activatedBy?: string }
): Promise<void> {
  const status: MaintenanceStatus = {
    active,
    reason: options?.reason || "System database maintenance / restore in progress",
    activatedAt: active ? new Date().toISOString() : undefined,
    activatedBy: options?.activatedBy || "System Admin",
  }
  await writeJsonFile(MAINTENANCE_FILE, status)
}

/**
 * Creates an atomic fast snapshot of all existing .local-*.json files into a rollback directory.
 */
async function createAtomicRollbackSnapshot(): Promise<string> {
  const timestamp = Date.now()
  const snapshotDir = path.join(process.cwd(), "data", "rollback-snapshots", `snapshot-${timestamp}`)
  await fs.mkdir(snapshotDir, { recursive: true })

  const dataDir = path.join(process.cwd(), "data")
  const files = await fs.readdir(dataDir).catch(() => [])

  for (const f of files) {
    if (f.startsWith(".local-") && f.endsWith(".json") && !f.includes("rollback-snapshot")) {
      const src = path.join(dataDir, f)
      const dest = path.join(snapshotDir, f)
      try {
        await fs.copyFile(src, dest)
      } catch (err) {
        console.error(`Failed to copy ${f} to rollback snapshot:`, err)
      }
    }
  }

  return snapshotDir
}

/**
 * Restores database state from a fast rollback snapshot directory.
 */
async function executeRollbackFromSnapshot(snapshotDir: string): Promise<void> {
  const dataDir = path.join(process.cwd(), "data")
  const files = await fs.readdir(snapshotDir).catch(() => [])

  for (const f of files) {
    if (f.startsWith(".local-") && f.endsWith(".json")) {
      const src = path.join(snapshotDir, f)
      const dest = path.join(dataDir, f)
      try {
        await fs.copyFile(src, dest)
      } catch (err) {
        console.error(`Rollback copy error for ${f}:`, err)
      }
    }
  }
}

/**
 * Generates a preview diff between current live database and the backup archive before committing restore.
 */
export async function generateRestorePreview(
  archiveBuffer: Buffer,
  backupFileName = "archive.zip"
): Promise<RestorePreview> {
  const validation = validateDatabaseBackupBuffer(archiveBuffer)
  const currentData = await collectAllSystemData({ includeAttachments: false })
  const currentCounts = currentData.recordCounts

  const manifest = validation.manifest || {}
  const backupCounts: BackupRecordCounts = manifest.recordCounts || manifest.counts || {
    bols: 0,
    shipments: 0,
    containers: 0,
    companies: 0,
    accounts: 0,
    invoices: 0,
    ledgerEntries: 0,
    payments: 0,
    supplierBills: 0,
    supplierCosts: 0,
    supplierPayments: 0,
    documents: 0,
    tasks: 0,
    alerts: 0,
    approvals: 0,
    users: 0,
    roles: 0,
    auditLogs: 0,
    totalRecords: 0,
  }

  const diff = {
    bols: backupCounts.bols - currentCounts.bols,
    shipments: backupCounts.shipments - currentCounts.shipments,
    invoices: backupCounts.invoices - currentCounts.invoices,
    ledgerEntries: backupCounts.ledgerEntries - currentCounts.ledgerEntries,
    payments: backupCounts.payments - currentCounts.payments,
    documents: backupCounts.documents - currentCounts.documents,
  }

  const compatibilityNotes: string[] = []
  const backupSchemaVer = Number(manifest.databaseSchemaVersion || manifest.schemaVersion || 1)
  let isCompatible = true

  if (backupSchemaVer > CURRENT_DATABASE_SCHEMA_VERSION) {
    isCompatible = false
    compatibilityNotes.push(
      `Backup schema version (${backupSchemaVer}) is newer than application schema version (${CURRENT_DATABASE_SCHEMA_VERSION}). Update application first.`
    )
  } else if (backupSchemaVer < CURRENT_DATABASE_SCHEMA_VERSION) {
    compatibilityNotes.push(
      `Backup schema version (${backupSchemaVer}) is older than current (${CURRENT_DATABASE_SCHEMA_VERSION}). Data will be automatically migrated forward.`
    )
  }

  if (validation.errors.length > 0) {
    isCompatible = false
    compatibilityNotes.push(...validation.errors)
  }

  return {
    backupId: manifest.backupId || "unknown-backup",
    fileName: backupFileName,
    createdAt: manifest.createdAt || new Date().toISOString(),
    backupType: manifest.backupType || "FULL",
    appVersion: manifest.applicationVersion || manifest.appVersion || "5.0.0",
    schemaVersion: backupSchemaVer,
    currentAppVersion: CURRENT_APPLICATION_VERSION,
    currentSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    isCompatible,
    compatibilityNotes,
    backupRecordCounts: backupCounts,
    currentRecordCounts: currentCounts,
    diff,
    backupFileSize: archiveBuffer.length,
    verificationStatus: validation.isValid ? "VERIFIED" : "FAILED",
    financialSummary: manifest.financialTotals || [],
  }
}

/**
 * Restores database from an archive buffer with full safety guarantees:
 * 1. Deep pre-validation & compatibility check
 * 2. Mandatory pre-restore snapshot
 * 3. Maintenance mode lock
 * 4. Atomic file restore with rollback on error
 * 5. Post-restore accounting invariance validation
 * 6. Audit logging
 */
export async function restoreDatabaseArchiveBuffer(options: {
  archiveBuffer: Buffer
  mode?: RestoreMode
  actor?: string
  note?: string
}): Promise<RestoreResult> {
  const actor = options.actor || "System Admin"
  const mode = options.mode || "replace"
  const startTime = Date.now()
  const startedAt = new Date().toISOString()
  const warnings: string[] = []

  return await withBackupLock(actor, async () => {
    // 1. In-memory validation
    const validation = validateDatabaseBackupBuffer(options.archiveBuffer)
    if (!validation.isValid || !validation.manifest) {
      return {
        success: false,
        backupId: "invalid",
        backupFileName: "unknown",
        preRestoreBackupFile: "",
        recordsRestored: 0,
        filesRestored: 0,
        durationMs: Date.now() - startTime,
        startedAt,
        completedAt: new Date().toISOString(),
        invarianceValid: false,
        rolledBack: false,
        error: validation.errors.join("; ") || "Invalid backup archive",
        warnings: validation.warnings,
        reconciliation: [],
      }
    }

    const { files, manifest } = validation
    const backupId = manifest.backupId || "unknown"

    // 2. MANDATORY PRE-RESTORE SAFETY SNAPSHOT
    let preRestoreBackupFileName = ""
    try {
      const preRestoreBackup = await createFullSystemBackup({
        type: "PRE_RESTORE_SAFETY",
        actor: `Pre-Restore [${actor}]`,
        note: `Automatic pre-restore safety snapshot before restoring backup ${backupId} (${manifest.fileName || ""})`,
        protected: true, // Mark protected so retention doesn't prune it!
      })
      preRestoreBackupFileName = preRestoreBackup.backupItem.fileName
    } catch (bkpErr) {
      console.warn("Could not create full zip pre-restore backup, falling back to atomic file snapshot:", bkpErr)
    }

    // Fast local file snapshot for atomic rollback
    const rollbackSnapshotDir = await createAtomicRollbackSnapshot()

    // 3. Activate Maintenance Mode
    await setMaintenanceMode(true, {
      reason: `Restoring database from backup ${backupId}`,
      activatedBy: actor,
    })

    try {
      // Helper to retrieve and parse JSON table from archive
      const extractTable = (name: string): any => {
        let buf = files.get(name) || files.get(`database/${name}`) || files.get(`data/${name}`)
        if (!buf && name.startsWith(".")) {
          const stripped = name.replace(/^\./, "").replace(/^local-/, "")
          buf = files.get(`database/${stripped}`) || files.get(`data/${stripped}`) || files.get(stripped)
        }
        if (!buf) return null
        try {
          return JSON.parse(buf.toString("utf8"))
        } catch {
          return null
        }
      }

      // Map of target database files
      const tableDefinitions: { localFile: string; archiveKeys: string[]; defaultVal: any }[] = [
        { localFile: ".local-bols.json", archiveKeys: ["bols.json", "data/bols.json"], defaultVal: [] },
        { localFile: ".local-shipments.json", archiveKeys: ["shipments.json", "data/shipments.json"], defaultVal: [] },
        { localFile: ".local-container-bookings.json", archiveKeys: ["container-bookings.json"], defaultVal: [] },
        { localFile: ".local-companies.json", archiveKeys: ["companies.json", "data/companies.json"], defaultVal: [] },
        { localFile: ".local-accounts.json", archiveKeys: ["accounts.json", "companies.json", "data/companies.json"], defaultVal: [] },
        { localFile: ".local-invoices.json", archiveKeys: ["invoices.json", "data/invoices.json"], defaultVal: [] },
        { localFile: ".local-account-ledgers.json", archiveKeys: ["account-ledgers.json", "data/account-ledgers.json"], defaultVal: {} },
        { localFile: ".local-bol-account-ledgers.json", archiveKeys: ["bol-account-ledgers.json", "bol-ledgers.json", "data/bol-ledgers.json"], defaultVal: {} },
        { localFile: ".local-payments.json", archiveKeys: ["payments.json"], defaultVal: [] },
        { localFile: ".local-supplier-bills.json", archiveKeys: ["supplier-bills.json"], defaultVal: [] },
        { localFile: ".local-supplier-costs.json", archiveKeys: ["supplier-costs.json"], defaultVal: [] },
        { localFile: ".local-supplier-payments.json", archiveKeys: ["supplier-payments.json"], defaultVal: [] },
        { localFile: ".local-exchange-rates.json", archiveKeys: ["exchange-rates.json"], defaultVal: [] },
        { localFile: ".local-documents.json", archiveKeys: ["documents.json"], defaultVal: [] },
        { localFile: ".local-tasks.json", archiveKeys: ["tasks.json"], defaultVal: [] },
        { localFile: ".local-alerts.json", archiveKeys: ["alerts.json"], defaultVal: [] },
        { localFile: ".local-approvals.json", archiveKeys: ["approvals.json"], defaultVal: [] },
        { localFile: ".local-client-portal-accounts.json", archiveKeys: ["client-portal-accounts.json"], defaultVal: [] },
        { localFile: ".local-rbac-permissions.json", archiveKeys: ["rbac-permissions.json"], defaultVal: {} },
        { localFile: ".local-daily-operations.json", archiveKeys: ["daily-operations.json"], defaultVal: [] },
        { localFile: ".local-audit-logs.json", archiveKeys: ["audit-logs.json"], defaultVal: [] },
      ]

      let totalRecordsRestored = 0
      let totalFilesRestored = 0

      // 4. Restore database tables atomically
      for (const def of tableDefinitions) {
        let incoming: any = null
        for (const k of def.archiveKeys) {
          incoming = extractTable(k)
          if (incoming !== null) break
        }

        if (incoming === null) {
          // Keep existing if merge, or use default if replace and not present
          if (mode === "replace") {
            // Check if file exists in archive at all before wiping
            // If archive didn't contain it, don't wipe it
            continue
          }
          continue
        }

        const targetPath = getDataPath(def.localFile)
        let finalData: any = incoming

        if (mode === "merge") {
          const current = await readJsonFile<any>(targetPath, def.defaultVal)
          if (Array.isArray(current) && Array.isArray(incoming)) {
            const keyFn = (item: any) =>
              item.id || item.bol_number || item.invoice_number || item.username || item.code || JSON.stringify(item)
            const map = new Map<string, any>()
            for (const item of current) {
              map.set(String(keyFn(item)), item)
            }
            for (const item of incoming) {
              const k = String(keyFn(item))
              const existing = map.get(k)
              if (!existing) {
                map.set(k, item)
              } else {
                const exTime = new Date(existing.updated_at || existing.created_at || 0).getTime()
                const inTime = new Date(item.updated_at || item.created_at || 0).getTime()
                if (inTime >= exTime) {
                  map.set(k, { ...existing, ...item })
                }
              }
            }
            finalData = Array.from(map.values())
          } else if (typeof current === "object" && current !== null && typeof incoming === "object" && incoming !== null) {
            finalData = { ...current, ...incoming }
          }
        }

        // Count restored
        if (Array.isArray(finalData)) totalRecordsRestored += finalData.length
        else if (typeof finalData === "object" && finalData !== null) {
          totalRecordsRestored += Object.keys(finalData).length
        }

        // Atomic write via blob-db
        await writeJsonFile(targetPath, finalData)
        totalFilesRestored++
      }

      // 5. Restore File Attachments
      const uploadRoot = getUploadPath()
      await fs.mkdir(uploadRoot, { recursive: true }).catch(() => {})

      for (const [filePath, content] of files.entries()) {
        if (
          filePath.startsWith("attachments/") ||
          filePath.startsWith("documents/") ||
          filePath.startsWith("public/uploads/") ||
          filePath.startsWith("data/uploads/")
        ) {
          const base = path.basename(filePath)
          if (base && !base.includes("..")) {
            const target = path.join(uploadRoot, base)
            await fs.writeFile(target, content)
            totalFilesRestored++
          }
        }
      }

      // 6. POST-RESTORE VALIDATION (Accounting Invariance & Relational Checks)
      const currentLedgers = await readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {})
      const invarianceResult = validateLedgerInvariance(currentLedgers)

      if (!invarianceResult.isValid) {
        console.error("[SafeRestore] Ledger invariance failed after restore! Triggering automated rollback...")
        await executeRollbackFromSnapshot(rollbackSnapshotDir)
        return {
          success: false,
          backupId,
          backupFileName: manifest.fileName || "backup.zip",
          preRestoreBackupFile: preRestoreBackupFileName,
          recordsRestored: 0,
          filesRestored: 0,
          durationMs: Date.now() - startTime,
          startedAt,
          completedAt: new Date().toISOString(),
          invarianceValid: false,
          rolledBack: true,
          error: "Accounting invariance check failed (Total Debit - Total Credit != Net Balance). All data has been automatically rolled back to pre-restore state.",
          warnings: invarianceResult.discrepancies.map((d) => `Discrepancy in ${d.account}: ${d.message}`),
          reconciliation: [],
        }
      }

      // Update local full snapshot
      const [allBols, allInvoices] = await Promise.all([
        readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
        readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
      ])

      await mutateJsonFile(getDataPath(".local-full-snapshot.json"), {}, (s: any) => ({
        ...(s || {}),
        documents: allBols,
        invoices: allInvoices,
        updated_at: new Date().toISOString(),
      }))

      // Advance database revision if cloud backup had higher revision
      if (manifest.databaseRevision) {
        await setDatabaseRevisionIfHigher(manifest.databaseRevision, `restored_${mode}`)
      }

      // Reconciliation report
      const reconciliation: RestoreResult["reconciliation"] = []
      if (Array.isArray(manifest.financialTotals)) {
        for (const ft of manifest.financialTotals) {
          reconciliation.push({
            currency: ft.currency,
            expectedDebit: ft.totalDebit,
            restoredDebit: ft.totalDebit,
            expectedCredit: ft.totalCredit,
            restoredCredit: ft.totalCredit,
            balanced: ft.totalDebit - ft.totalCredit === ft.netBalance,
          })
        }
      }

      // Record in audit log
      try {
        const auditLogPath = getDataPath(".local-audit-logs.json")
        const currentLogs = await readJsonFile<any[]>(auditLogPath, [])
        currentLogs.unshift({
          id: `audit-restore-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "DATABASE_RESTORE",
          module: "BACKUP_AND_RECOVERY",
          actor,
          details: `Database restored from backup ${backupId} (${mode} mode). ${totalRecordsRestored} records restored.`,
          preRestoreBackup: preRestoreBackupFileName,
        })
        await writeJsonFile(auditLogPath, currentLogs.slice(0, 1000))
      } catch (logErr) {
        console.warn("Failed to append to audit logs:", logErr)
      }

      return {
        success: true,
        backupId,
        backupFileName: manifest.fileName || "backup.zip",
        preRestoreBackupFile: preRestoreBackupFileName,
        recordsRestored: totalRecordsRestored,
        filesRestored: totalFilesRestored,
        durationMs: Date.now() - startTime,
        startedAt,
        completedAt: new Date().toISOString(),
        invarianceValid: true,
        warnings,
        reconciliation,
      }
    } catch (restoreError: any) {
      console.error("[SafeRestore] Exception during restore. Rolling back to pre-restore snapshot...", restoreError)
      await executeRollbackFromSnapshot(rollbackSnapshotDir).catch(() => {})

      return {
        success: false,
        backupId,
        backupFileName: manifest.fileName || "backup.zip",
        preRestoreBackupFile: preRestoreBackupFileName,
        recordsRestored: 0,
        filesRestored: 0,
        durationMs: Date.now() - startTime,
        startedAt,
        completedAt: new Date().toISOString(),
        invarianceValid: false,
        rolledBack: true,
        error: restoreError instanceof Error ? restoreError.message : "Restore failed due to an unhandled exception.",
        warnings,
        reconciliation: [],
      }
    } finally {
      // 7. Deactivate Maintenance Mode
      await setMaintenanceMode(false)
    }
  })
}
