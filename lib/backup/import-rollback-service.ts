/**
 * Sky Ariana Import Rollback & Conflict Engine
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { createFullSystemBackup } from "./create-backup"
import type { ImportBatchInfo } from "./backup-types"

const IMPORT_BATCHES_FILE = getDataPath(".local-import-batches.json")

export interface ImportRollbackResult {
  success: boolean
  batchId: string
  recordsRemoved: number
  preRollbackBackupFile?: string
  conflictsEncountered: string[]
  error?: string
}

/**
 * Lists all recorded import batches with real-time conflict status.
 */
export async function listImportBatches(): Promise<ImportBatchInfo[]> {
  const batches = await readJsonFile<ImportBatchInfo[]>(IMPORT_BATCHES_FILE, [])
  const list = Array.isArray(batches) ? batches : []

  // Load current payments and invoices to check for conflict
  const [payments, invoices, bols] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
  ])

  const paidInvoiceNumbers = new Set(
    payments.map((p) => String(p.invoiceNumber || p.invoice_number || "").trim().toUpperCase())
  )
  const paidBolNumbers = new Set(
    payments.map((p) => String(p.bolNumber || p.bol_number || "").trim().toUpperCase())
  )

  const liveBolNumbers = new Set(
    bols.map((b) => String(b.bol_number || b.id || "").trim().toUpperCase())
  )

  return list.map((b) => {
    const conflictReasons: string[] = []

    for (const bolNum of b.createdBolNumbers || []) {
      const upper = bolNum.toUpperCase()
      if (paidBolNumbers.has(upper)) {
        conflictReasons.push(`BOL ${bolNum} has received payments since import.`)
      }
      // Check if invoice tied to this BOL received payment
      const tiedInvoices = invoices.filter(
        (inv) => String(inv.bol_number || inv.bolNumber || "").toUpperCase() === upper
      )
      for (const inv of tiedInvoices) {
        const invNum = String(inv.invoice_number || "").toUpperCase()
        if (paidInvoiceNumbers.has(invNum)) {
          conflictReasons.push(`Invoice ${invNum} tied to BOL ${bolNum} has received payments.`)
        }
      }
    }

    return {
      ...b,
      canRollback: conflictReasons.length === 0,
      conflictReasons: conflictReasons.length > 0 ? conflictReasons : undefined,
    }
  })
}

/**
 * Registers a completed import batch
 */
export async function registerImportBatch(batch: {
  batchId: string
  fileName: string
  importedBy: string
  recordCount: number
  createdBolNumbers: string[]
}): Promise<void> {
  const batches = await readJsonFile<ImportBatchInfo[]>(IMPORT_BATCHES_FILE, [])
  const list = Array.isArray(batches) ? batches : []

  const item: ImportBatchInfo = {
    batchId: batch.batchId,
    importedAt: new Date().toISOString(),
    importedBy: batch.importedBy,
    fileName: batch.fileName,
    recordCount: batch.recordCount,
    createdBolNumbers: batch.createdBolNumbers,
    canRollback: true,
  }

  await writeJsonFile(IMPORT_BATCHES_FILE, [item, ...list.filter((x) => x.batchId !== batch.batchId)])
}

/**
 * Executes safe rollback of an import batch with conflict detection & safety snapshot.
 */
export async function executeImportRollback(
  batchId: string,
  options?: { actor?: string; force?: boolean }
): Promise<ImportRollbackResult> {
  const actor = options?.actor || "Admin"
  const batches = await listImportBatches()
  const targetBatch = batches.find((b) => b.batchId === batchId)

  if (!targetBatch) {
    return {
      success: false,
      batchId,
      recordsRemoved: 0,
      conflictsEncountered: [`Import batch ${batchId} not found.`],
      error: `Import batch ${batchId} does not exist.`,
    }
  }

  // Conflict check
  if (!targetBatch.canRollback && !options?.force) {
    return {
      success: false,
      batchId,
      recordsRemoved: 0,
      conflictsEncountered: targetBatch.conflictReasons || ["Downstream transactions conflict with rollback"],
      error: "Rollback blocked due to downstream financial/payment conflicts. Specify force=true to override.",
    }
  }

  // 1. Create Pre-Rollback Safety Backup
  let preRollbackFile = ""
  try {
    const safety = await createFullSystemBackup({
      type: "PRE_IMPORT",
      actor: `Rollback [${actor}]`,
      note: `Pre-rollback snapshot before rolling back import batch ${batchId} (${targetBatch.fileName})`,
      protected: true,
    })
    preRollbackFile = safety.backupItem.fileName
  } catch (err) {
    return {
      success: false,
      batchId,
      recordsRemoved: 0,
      conflictsEncountered: [],
      error: `Failed to create pre-rollback safety backup: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // 2. Remove records created by this batch
  const targetBolSet = new Set(targetBatch.createdBolNumbers.map((s) => s.trim().toUpperCase()))
  let recordsRemoved = 0

  // Filter BOLs
  const bols = await readJsonFile<any[]>(getDataPath(".local-bols.json"), [])
  const remainingBols = bols.filter((b) => {
    const num = String(b.bol_number || b.id || "").trim().toUpperCase()
    const match = targetBolSet.has(num) || (b.import_batch_id && b.import_batch_id === batchId)
    if (match) recordsRemoved++
    return !match
  })
  await writeJsonFile(getDataPath(".local-bols.json"), remainingBols)

  // Filter Shipments
  const shipments = await readJsonFile<any[]>(getDataPath(".local-shipments.json"), [])
  const remainingShipments = shipments.filter((s) => {
    const bolRef = String(s.bol_number || s.reference_number || s.id || "").trim().toUpperCase()
    const match = targetBolSet.has(bolRef) || (s.import_batch_id && s.import_batch_id === batchId)
    if (match) recordsRemoved++
    return !match
  })
  await writeJsonFile(getDataPath(".local-shipments.json"), remainingShipments)

  // Filter Invoices tied to rolled-back BOLs
  const invoices = await readJsonFile<any[]>(getDataPath(".local-invoices.json"), [])
  const remainingInvoices = invoices.filter((inv) => {
    const bolRef = String(inv.bol_number || inv.bolNumber || "").trim().toUpperCase()
    const match = targetBolSet.has(bolRef) || (inv.import_batch_id && inv.import_batch_id === batchId)
    if (match) recordsRemoved++
    return !match
  })
  await writeJsonFile(getDataPath(".local-invoices.json"), remainingInvoices)

  // Remove batch entry from catalog
  const updatedBatches = batches.filter((b) => b.batchId !== batchId)
  await writeJsonFile(IMPORT_BATCHES_FILE, updatedBatches)

  // Log in audit log
  try {
    const auditLogs = await readJsonFile<any[]>(getDataPath(".local-audit-logs.json"), [])
    auditLogs.unshift({
      id: `audit-rollback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "IMPORT_ROLLBACK",
      module: "IMPORT_ENGINE",
      actor,
      details: `Import batch ${batchId} (${targetBatch.fileName}) rolled back. ${recordsRemoved} records removed.`,
      preRollbackBackup: preRollbackFile,
    })
    await writeJsonFile(getDataPath(".local-audit-logs.json"), auditLogs.slice(0, 1000))
  } catch {}

  return {
    success: true,
    batchId,
    recordsRemoved,
    preRollbackBackupFile: preRollbackFile,
    conflictsEncountered: targetBatch.conflictReasons || [],
  }
}
