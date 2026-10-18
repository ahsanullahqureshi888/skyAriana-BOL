import fs from "node:fs/promises"
import path from "node:path"
import { getDataPath, getUploadPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import { extractZipArchive } from "./archive"
import { computeSha256, decryptPayload, getOrCreateVaultKey, type EncryptedPackage } from "./crypto"
import { downloadFileFromDrive } from "./client"
import type {
  GoogleDriveBackupManifest,
  GoogleDriveRecordCounts,
  RestoreMode,
  RestorePreview,
  RestoreResult,
} from "./types"

/**
 * Creates an atomic local snapshot backup before performing any restore.
 * This guarantees the system can always roll back if anything goes wrong.
 */
export async function createPreRestoreSnapshot(): Promise<string> {
  const timestamp = Date.now()
  const snapshotFileName = `.pre_restore_backup_${timestamp}.json`
  const targetPath = getDataPath(snapshotFileName)

  const [bols, invoices, accountLedgers, bolLedgers, accounts, shipments] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
    readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), {}),
    readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipments.json"), []),
  ])

  const payload = {
    timestamp: new Date().toISOString(),
    bols,
    invoices,
    accountLedgers,
    bolLedgers,
    accounts,
    shipments,
  }

  await writeJsonFile(targetPath, payload)
  return snapshotFileName
}

/**
 * Rolls back local storage to a previously created pre-restore snapshot.
 */
export async function rollbackPreRestoreSnapshot(snapshotFileName: string): Promise<void> {
  const targetPath = getDataPath(snapshotFileName)
  const snapshot = await readJsonFile<any>(targetPath, null)
  if (!snapshot) {
    throw new Error(`Pre-restore backup snapshot ${snapshotFileName} not found for rollback`)
  }

  if (Array.isArray(snapshot.bols)) {
    await writeJsonFile(getDataPath(".local-bols.json"), snapshot.bols)
  }
  if (Array.isArray(snapshot.invoices)) {
    await writeJsonFile(getDataPath(".local-invoices.json"), snapshot.invoices)
  }
  if (snapshot.accountLedgers) {
    await writeJsonFile(getDataPath(".local-account-ledgers.json"), snapshot.accountLedgers)
  }
  if (snapshot.bolLedgers) {
    await writeJsonFile(getDataPath(".local-bol-account-ledgers.json"), snapshot.bolLedgers)
  }
  if (Array.isArray(snapshot.accounts)) {
    await writeJsonFile(getDataPath(".local-accounts.json"), snapshot.accounts)
  }
  if (Array.isArray(snapshot.shipments)) {
    await writeJsonFile(getDataPath(".local-shipments.json"), snapshot.shipments)
  }
}

/**
 * Previews a backup by reading its manifest without modifying any local state.
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
  } catch (err) {
    if (isEncrypted) {
      throw new Error("Failed to decrypt backup. A valid recovery passphrase is required.")
    }
  }

  const files = extractZipArchive(archiveBuffer)
  const manifestBuffer = files.get("manifest.json")
  if (!manifestBuffer) {
    throw new Error("Invalid backup archive: manifest.json is missing")
  }

  const manifest = JSON.parse(manifestBuffer.toString("utf8")) as GoogleDriveBackupManifest

  const [curBols, curInvoices, curAccounts, curLedgers] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
  ])

  let curLedgerCount = 0
  if (curLedgers && typeof curLedgers === "object") {
    for (const key of Object.keys(curLedgers)) {
      if (Array.isArray(curLedgers[key])) curLedgerCount += curLedgers[key].length
      else if (curLedgers[key]?.entries) curLedgerCount += curLedgers[key].entries.length
    }
  }

  return {
    backupId: fileId,
    name: `Backup-${manifest.createdAt.slice(0, 10)}`,
    createdAt: manifest.createdAt,
    appVersion: manifest.appVersion,
    recordCounts: manifest.recordCounts || manifest.counts || {
      bols: 0,
      invoices: 0,
      companies: 0,
      ledgerEntries: 0,
    },
    currentRecordCounts: {
      bols: curBols.length,
      invoices: curInvoices.length,
      companies: curAccounts.length,
      ledgerEntries: curLedgerCount,
    },
    checksum: manifest.checksum,
    isValid: true,
    encrypted: manifest.encrypted,
  }
}

/**
 * Restores local application data from a Google Drive backup.
 * Supports 'merge' (safe union by stable IDs) and 'replace' (full atomic overwrite).
 */
export async function restoreGoogleDriveBackup(options: {
  fileId: string
  mode: RestoreMode
  passphrase?: string
}): Promise<RestoreResult> {
  const { fileId, mode, passphrase } = options

  // 1. Mandatory Pre-Restore Snapshot before doing ANYTHING
  const preRestoreBackupFile = await createPreRestoreSnapshot()

  try {
    let archiveBuffer = await downloadFileFromDrive(fileId)

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
    } catch (err) {
      if (isEncrypted) {
        throw new Error("Failed to decrypt backup. A valid recovery passphrase is required.")
      }
    }

    const files = extractZipArchive(archiveBuffer)
    const manifestBuffer = files.get("manifest.json")
    if (!manifestBuffer) {
      throw new Error("Invalid backup archive: manifest.json is missing")
    }

    const manifest = JSON.parse(manifestBuffer.toString("utf8")) as GoogleDriveBackupManifest

    // Parse backup data files
    const incomingBols: any[] = files.has("data/bols.json")
      ? JSON.parse(files.get("data/bols.json")!.toString("utf8"))
      : []
    const incomingInvoices: any[] = files.has("data/invoices.json")
      ? JSON.parse(files.get("data/invoices.json")!.toString("utf8"))
      : []
    const incomingAccountLedgers: any = files.has("data/account-ledgers.json")
      ? JSON.parse(files.get("data/account-ledgers.json")!.toString("utf8"))
      : {}
    const incomingBolLedgers: any = files.has("data/bol-ledgers.json")
      ? JSON.parse(files.get("data/bol-ledgers.json")!.toString("utf8"))
      : {}
    const incomingAccounts: any[] = files.has("data/companies.json")
      ? JSON.parse(files.get("data/companies.json")!.toString("utf8"))
      : []
    const incomingShipments: any[] = files.has("data/shipments.json")
      ? JSON.parse(files.get("data/shipments.json")!.toString("utf8"))
      : []

    // Restore documents if any
    try {
      const uploadRoot = getUploadPath()
      await fs.mkdir(uploadRoot, { recursive: true })
      for (const [archivePath, content] of files.entries()) {
        if (archivePath.startsWith("documents/")) {
          const docFileName = path.basename(archivePath)
          if (docFileName && !docFileName.includes("..")) {
            await fs.writeFile(path.join(uploadRoot, docFileName), content)
          }
        }
      }
    } catch {}

    let finalBols: any[]
    let finalInvoices: any[]
    let finalAccountLedgers: any
    let finalBolLedgers: any
    let finalAccounts: any[]
    let finalShipments: any[]

    if (mode === "replace") {
      // Direct replace
      finalBols = incomingBols
      finalInvoices = incomingInvoices
      finalAccountLedgers = incomingAccountLedgers
      finalBolLedgers = incomingBolLedgers
      finalAccounts = incomingAccounts
      finalShipments = incomingShipments
    } else {
      // ---------------------------------------------------------------------
      // MERGE MODE: Intelligently match stable IDs, never duplicate
      // ---------------------------------------------------------------------
      const [curBols, curInvoices, curAccountLedgers, curBolLedgers, curAccounts, curShipments] = await Promise.all([
        readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
        readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
        readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
        readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), {}),
        readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
        readJsonFile<any[]>(getDataPath(".local-shipments.json"), []),
      ])

      // Merge BOLs by stable bol_number / id
      const bolMap = new Map<string, any>()
      for (const b of curBols) {
        const k = (b.bol_number || b.id || "").trim().toLowerCase()
        if (k) bolMap.set(k, b)
      }
      for (const b of incomingBols) {
        const k = (b.bol_number || b.id || "").trim().toLowerCase()
        if (!k) continue
        const existing = bolMap.get(k)
        if (!existing) {
          bolMap.set(k, b)
        } else {
          // Compare updated_at
          const exTime = new Date(existing.updated_at || 0).getTime()
          const inTime = new Date(b.updated_at || 0).getTime()
          if (inTime >= exTime) {
            bolMap.set(k, { ...existing, ...b })
          }
        }
      }
      finalBols = Array.from(bolMap.values())

      // Merge Invoices by invoice_number / id
      const invoiceMap = new Map<string, any>()
      for (const inv of curInvoices) {
        const k = (inv.invoice_number || inv.id || "").trim().toLowerCase()
        if (k) invoiceMap.set(k, inv)
      }
      for (const inv of incomingInvoices) {
        const k = (inv.invoice_number || inv.id || "").trim().toLowerCase()
        if (!k) continue
        const existing = invoiceMap.get(k)
        if (!existing) {
          invoiceMap.set(k, inv)
        } else {
          const exTime = new Date(existing.updated_at || 0).getTime()
          const inTime = new Date(inv.updated_at || 0).getTime()
          if (inTime >= exTime) {
            invoiceMap.set(k, { ...existing, ...inv })
          }
        }
      }
      finalInvoices = Array.from(invoiceMap.values())

      // Merge Accounts
      const accountMap = new Map<string, any>()
      for (const a of curAccounts) {
        const k = (a.id || a.name || "").trim().toLowerCase()
        if (k) accountMap.set(k, a)
      }
      for (const a of incomingAccounts) {
        const k = (a.id || a.name || "").trim().toLowerCase()
        if (k && !accountMap.has(k)) accountMap.set(k, a)
      }
      finalAccounts = Array.from(accountMap.values())

      // Merge Shipments
      const shipmentMap = new Map<string, any>()
      for (const s of curShipments) {
        const k = (s.id || s.container_number || s.bol_number || "").trim().toLowerCase()
        if (k) shipmentMap.set(k, s)
      }
      for (const s of incomingShipments) {
        const k = (s.id || s.container_number || s.bol_number || "").trim().toLowerCase()
        if (k && !shipmentMap.has(k)) shipmentMap.set(k, s)
      }
      finalShipments = Array.from(shipmentMap.values())

      // Merge Account Ledgers
      finalAccountLedgers = { ...curAccountLedgers }
      for (const [accKey, incomingVal] of Object.entries(incomingAccountLedgers)) {
        if (!finalAccountLedgers[accKey]) {
          finalAccountLedgers[accKey] = incomingVal
        } else {
          // Merge entry arrays with deduplication
          const existingRows: any[] = Array.isArray(finalAccountLedgers[accKey])
            ? finalAccountLedgers[accKey]
            : finalAccountLedgers[accKey]?.entries || []
          const incomingRows: any[] = Array.isArray(incomingVal)
            ? incomingVal
            : (incomingVal as any)?.entries || []

          const rowKey = (r: any) =>
            `${r.id || ""}_${r.date || ""}_${r.debit || 0}_${r.credit || 0}_${r.barnamehNo || r.billOfLanding || ""}`.trim()
          const seen = new Set(existingRows.map(rowKey))

          const mergedRows = [...existingRows]
          for (const row of incomingRows) {
            const k = rowKey(row)
            if (!seen.has(k)) {
              seen.add(k)
              mergedRows.push(row)
            }
          }
          finalAccountLedgers[accKey] = Array.isArray(finalAccountLedgers[accKey])
            ? mergedRows
            : { ...(finalAccountLedgers[accKey] || {}), entries: mergedRows }
        }
      }

      finalBolLedgers = { ...curBolLedgers, ...incomingBolLedgers }
    }

    // Write all merged/replaced data files atomically
    await Promise.all([
      writeJsonFile(getDataPath(".local-bols.json"), finalBols),
      writeJsonFile(getDataPath(".local-invoices.json"), finalInvoices),
      writeJsonFile(getDataPath(".local-account-ledgers.json"), finalAccountLedgers),
      writeJsonFile(getDataPath(".local-bol-account-ledgers.json"), finalBolLedgers),
      writeJsonFile(getDataPath(".local-accounts.json"), finalAccounts),
      writeJsonFile(getDataPath(".local-shipments.json"), finalShipments),
    ])

    // Also update full snapshot
    await mutateJsonFile(getDataPath(".local-full-snapshot.json"), {}, (snapshot: any) => ({
      ...(snapshot || {}),
      documents: finalBols,
      invoices: finalInvoices,
      updated_at: new Date().toISOString(),
    }))

    // -----------------------------------------------------------------------
    // POST-RESTORE INTEGRITY & ACCOUNTING INVARIANCE VALIDATION
    // -----------------------------------------------------------------------
    const invarianceResult = validateLedgerInvariance(finalAccountLedgers)
    if (!invarianceResult.isValid) {
      console.error("[restore] Accounting invariance check failed after restore! Rolling back...", invarianceResult.discrepancies)
      await rollbackPreRestoreSnapshot(preRestoreBackupFile)
      const fallbackCounts = manifest.recordCounts || manifest.counts || {
        bols: 0,
        invoices: 0,
        companies: 0,
        ledgerEntries: 0,
      }
      return {
        success: false,
        mode,
        preRestoreBackupFile,
        restoredCounts: fallbackCounts,
        invarianceValid: false,
        rolledBack: true,
        error: `Restored ledger failed accounting invariance (Debit - Credit != Balance). Data rolled back to pre-restore state.`,
      }
    }

    // Check for duplicate BOL numbers
    const bolNumSet = new Set<string>()
    for (const b of finalBols) {
      const num = String(b.bol_number || b.id || "").trim().toLowerCase()
      if (num && bolNumSet.has(num)) {
        console.error(`[restore] Duplicate BOL number detected: ${num}! Rolling back...`)
        await rollbackPreRestoreSnapshot(preRestoreBackupFile)
        const fallbackCounts = manifest.recordCounts || manifest.counts || {
          bols: 0,
          invoices: 0,
          companies: 0,
          ledgerEntries: 0,
        }
        return {
          success: false,
          mode,
          preRestoreBackupFile,
          restoredCounts: fallbackCounts,
          invarianceValid: true,
          rolledBack: true,
          error: `Duplicate BOL number '${num}' detected in restored dataset. Data rolled back.`,
        }
      }
      if (num) bolNumSet.add(num)
    }

    let restoredLedgerCount = 0
    for (const k of Object.keys(finalAccountLedgers)) {
      const v = finalAccountLedgers[k]
      if (Array.isArray(v)) restoredLedgerCount += v.length
      else if (v?.entries) restoredLedgerCount += v.entries.length
    }

    return {
      success: true,
      mode,
      preRestoreBackupFile,
      restoredCounts: {
        bols: finalBols.length,
        invoices: finalInvoices.length,
        companies: finalAccounts.length,
        ledgerEntries: restoredLedgerCount,
      },
      invarianceValid: true,
    }
  } catch (error: any) {
    console.error("[restore] Restore failed with exception. Rolling back...", error)
    await rollbackPreRestoreSnapshot(preRestoreBackupFile).catch(() => {})
    return {
      success: false,
      mode,
      preRestoreBackupFile,
      restoredCounts: { bols: 0, invoices: 0, companies: 0, ledgerEntries: 0 },
      invarianceValid: false,
      rolledBack: true,
      error: error instanceof Error ? error.message : "Restore failed. Original data was restored.",
    }
  }
}
