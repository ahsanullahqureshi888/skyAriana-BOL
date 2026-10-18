import path from "node:path"
import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import { getServerPaths, ensureServerDirectoriesSync } from "../server/paths"
import { readJsonFile, mutateJsonFile, writeJsonFile } from "../services/blob-db"
import { validateLedgerInvariance, type LedgerAuditResult } from "../services/ledger-sync-utils"
import { logAuditEvent } from "../server/audit"

export class ConflictError extends Error {
  statusCode: number
  currentVersion: number
  submittedVersion: number

  constructor(message: string, currentVersion: number, submittedVersion: number) {
    super(message)
    this.name = "ConflictError"
    this.statusCode = 409
    this.currentVersion = currentVersion
    this.submittedVersion = submittedVersion
  }
}

export class SecurityError extends Error {
  statusCode: number
  constructor(message: string) {
    super(message)
    this.name = "SecurityError"
    this.statusCode = 403
  }
}

export interface VersionedRecord {
  id: string
  version?: number
  updated_at?: string
  created_at?: string
  [key: string]: any
}

export interface SequenceCounters {
  bolSequence: number
  invoiceSequence: number
  ledgerSequence: number
  year: number
  updated_at: string
}

const DEFAULT_COUNTERS: SequenceCounters = {
  bolSequence: 470,
  invoiceSequence: 0,
  ledgerSequence: 1000,
  year: new Date().getFullYear(),
  updated_at: new Date().toISOString(),
}

/**
 * Validates that the requested storage path is not a forbidden network share (e.g. UNC path)
 */
export function assertSafeLocalPath(targetPath: string): void {
  if (targetPath.startsWith("\\\\") || targetPath.startsWith("//") || targetPath.includes("smb:")) {
    throw new SecurityError(
      "Direct database file access over network shares (UNC/SMB) is strictly prohibited. " +
      "Clients must interact with the database solely through the Sky Ariana Server API."
    )
  }
}

/**
 * Gets path to a database collection file inside the secure server storage.
 */
export function getDbFilePath(collectionName: string): string {
  const paths = ensureServerDirectoriesSync()
  assertSafeLocalPath(paths.database)

  const sanitized = path.basename(collectionName).replace(/[^a-zA-Z0-9._-]/g, "")
  const fullFileName = sanitized.endsWith(".json") ? sanitized : `${sanitized}.json`
  return path.join(paths.database, fullFileName)
}

/**
 * Reads a collection from the server database.
 */
export async function getServerCollection<T>(collectionName: string, fallback: T): Promise<T> {
  const filePath = getDbFilePath(collectionName)
  return readJsonFile<T>(filePath, fallback)
}

/**
 * Replaces or writes an entire collection.
 */
export async function setServerCollection<T>(collectionName: string, data: T): Promise<void> {
  const filePath = getDbFilePath(collectionName)
  await writeJsonFile<T>(filePath, data)
}

/**
 * Atomically generates the next sequential BOL number.
 * Thread-safe and process-safe.
 */
export async function getNextServerBolNumber(year?: number, customStartSeq?: number): Promise<string> {
  const targetYear = year || new Date().getFullYear()
  const counterFile = getDbFilePath("counters.json")
  const baselineStart = customStartSeq ? customStartSeq - 1 : 470

  let nextSeq = baselineStart + 1
  await mutateJsonFile<SequenceCounters>(counterFile, { ...DEFAULT_COUNTERS, year: targetYear, bolSequence: baselineStart }, (current) => {
    let curr = current || { ...DEFAULT_COUNTERS, year: targetYear, bolSequence: baselineStart }
    if (curr.year !== targetYear) {
      curr.year = targetYear
      curr.bolSequence = baselineStart
    }
    curr.bolSequence = (curr.bolSequence !== undefined ? curr.bolSequence : baselineStart) + 1
    curr.updated_at = new Date().toISOString()
    nextSeq = curr.bolSequence
    return curr
  })

  const padded = String(nextSeq).padStart(3, "0")
  return `BOL-${targetYear}-NSA${padded}`
}

/**
 * Atomically generates the next sequential Invoice number.
 */
export async function getNextServerInvoiceNumber(year?: number): Promise<string> {
  const targetYear = year || new Date().getFullYear()
  const counterFile = getDbFilePath("counters.json")

  let nextSeq = 1
  await mutateJsonFile<SequenceCounters>(counterFile, { ...DEFAULT_COUNTERS, year: targetYear }, (current) => {
    let curr = current || { ...DEFAULT_COUNTERS, year: targetYear }
    if (curr.year !== targetYear) {
      curr.year = targetYear
      curr.invoiceSequence = 0
    }
    curr.invoiceSequence = (curr.invoiceSequence || 0) + 1
    curr.updated_at = new Date().toISOString()
    nextSeq = curr.invoiceSequence
    return curr
  })

  const padded = String(nextSeq).padStart(4, "0")
  return `INV-${targetYear}-${padded}`
}

/**
 * Atomically generates the next sequential Ledger transaction ID.
 */
export async function getNextServerLedgerId(): Promise<string> {
  const counterFile = getDbFilePath("counters.json")

  let nextSeq = 1000
  await mutateJsonFile<SequenceCounters>(counterFile, DEFAULT_COUNTERS, (current) => {
    let curr = current || { ...DEFAULT_COUNTERS }
    curr.ledgerSequence = (curr.ledgerSequence || 1000) + 1
    curr.updated_at = new Date().toISOString()
    nextSeq = curr.ledgerSequence
    return curr
  })

  return `TX-${Date.now()}-${nextSeq}`
}

/**
 * Saves or updates a record using Optimistic Concurrency Control (OCC).
 * If expectedVersion is provided and differs from the current record's version,
 * a ConflictError (409) is thrown.
 */
export async function saveRecordWithVersion<T extends VersionedRecord>(
  collectionName: string,
  record: T,
  expectedVersion?: number,
  actor = "system"
): Promise<T> {
  const filePath = getDbFilePath(collectionName)
  let savedRecord: T | null = null

  await mutateJsonFile<T[]>(filePath, [], (records) => {
    const list = Array.isArray(records) ? records : []
    const index = list.findIndex((r) => r.id === record.id)

    if (index >= 0) {
      const existing = list[index]
      const currentVersion = existing.version ?? 1

      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        throw new ConflictError(
          `Record ${record.id} has been modified by another user or session. Current version: ${currentVersion}, submitted version: ${expectedVersion}.`,
          currentVersion,
          expectedVersion
        )
      }

      savedRecord = {
        ...existing,
        ...record,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
        created_at: existing.created_at || new Date().toISOString(),
      }
      list[index] = savedRecord
    } else {
      savedRecord = {
        ...record,
        version: 1,
        created_at: record.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      list.unshift(savedRecord)
    }

    return list
  })

  if (!savedRecord) {
    throw new Error(`Failed to save record ${record.id} in ${collectionName}`)
  }

  // Audit the modification
  void logAuditEvent({
    action: expectedVersion !== undefined ? "update" : "create",
    entity: collectionName.includes("bol") ? "bol" : collectionName.includes("invoice") ? "invoice" : "system",
    entityId: record.id,
    actor,
    details: { version: (savedRecord as VersionedRecord).version },
  })

  return savedRecord
}

/**
 * Saves ledger records while enforcing the Accounting Invariance Identity:
 * Net Balance = Total Debit - Total Credit
 */
export async function saveLedgerWithInvarianceCheck(
  accountName: string,
  entries: any[],
  actor = "system"
): Promise<{ success: boolean; audit: LedgerAuditResult }> {
  const filePath = getDbFilePath("account-ledgers.json")

  const currentStore = await readJsonFile<Record<string, any[]>>(filePath, {})
  const proposedStore = {
    ...currentStore,
    [accountName]: entries,
  }

  // Run strict mathematical invariance validation
  const auditResult = validateLedgerInvariance(proposedStore)
  if (!auditResult.isValid) {
    const errorDetails = auditResult.discrepancies.map((d) => d.message).join("; ")
    throw new Error(`Accounting Invariance Check Failed: ${errorDetails}`)
  }

  await mutateJsonFile<Record<string, any[]>>(filePath, {}, () => proposedStore)

  await logAuditEvent({
    action: "update_ledger",
    entity: "ledger",
    entityId: accountName,
    actor,
    details: {
      entriesCount: entries.length,
      netBalance: auditResult.netBalance,
    },
  })

  return { success: true, audit: auditResult }
}
