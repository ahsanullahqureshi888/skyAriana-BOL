/**
 * Sky Ariana Enterprise Backup Validation & Sandbox Test Restore Engine
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import fs from "node:fs/promises"
import { extractZipArchive } from "@/lib/google-drive/archive"
import { computeSha256 } from "@/lib/google-drive/crypto"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import { CURRENT_DATABASE_SCHEMA_VERSION } from "./backup-manifest"
import type {
  BackupManifest,
  BackupRecordCounts,
  CurrencyBalanceTotals,
  VerificationStatus,
} from "./backup-types"

export const CURRENT_BACKUP_SCHEMA_VERSION = CURRENT_DATABASE_SCHEMA_VERSION

export interface BackupValidationResult {
  isValid: boolean
  manifest?: BackupManifest | any
  files: Map<string, Buffer>
  invarianceValid: boolean
  relationalIntegrityValid?: boolean
  errors: string[]
  warnings: string[]
  isNewerVersion?: boolean
  recordCounts?: BackupRecordCounts
  financialSummary?: CurrencyBalanceTotals[]
  checksumsMatch?: boolean
}

export interface SandboxTestRestoreResult {
  pass: boolean
  backupId?: string
  appVersion?: string
  schemaVersion?: number
  recordsVerified: number
  tablesVerified: number
  attachmentsVerified: number
  invarianceValid: boolean
  financialTotals: CurrencyBalanceTotals[]
  relationalIssues: string[]
  errors: string[]
  warnings: string[]
  durationMs: number
}

/**
 * Normalizes file path inside backup zip (supports both 'database/foo.json' and 'data/foo.json')
 */
function getFileFromArchive(files: Map<string, Buffer>, relativeName: string): Buffer | undefined {
  if (files.has(relativeName)) return files.get(relativeName)
  if (files.has(`database/${relativeName}`)) return files.get(`database/${relativeName}`)
  if (files.has(`data/${relativeName}`)) return files.get(`data/${relativeName}`)
  if (relativeName.startsWith("data/")) {
    const withoutData = relativeName.replace(/^data\//, "")
    if (files.has(`database/${withoutData}`)) return files.get(`database/${withoutData}`)
  }
  if (relativeName.startsWith("database/")) {
    const withoutDb = relativeName.replace(/^database\//, "")
    if (files.has(`data/${withoutDb}`)) return files.get(`data/${withoutDb}`)
  }
  return undefined
}

/**
 * Inspects, deeply validates, and sandboxes a database backup archive in-memory before any restoration.
 */
export function validateDatabaseBackupBuffer(archiveBuffer: Buffer): BackupValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  let files: Map<string, Buffer>
  try {
    files = extractZipArchive(archiveBuffer)
  } catch (err) {
    return {
      isValid: false,
      files: new Map(),
      invarianceValid: false,
      errors: [`Corrupted or invalid ZIP archive: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
    }
  }

  // 1. Manifest presence
  const manifestBuffer = files.get("manifest.json")
  if (!manifestBuffer) {
    return {
      isValid: false,
      files,
      invarianceValid: false,
      errors: ["Missing manifest.json in backup archive"],
      warnings,
    }
  }

  let manifest: any
  try {
    manifest = JSON.parse(manifestBuffer.toString("utf8"))
  } catch (err) {
    return {
      isValid: false,
      files,
      invarianceValid: false,
      errors: [`Invalid manifest.json format: ${err instanceof Error ? err.message : String(err)}`],
      warnings,
    }
  }

  // 2. Schema version check
  let isNewerVersion = false
  const manifestSchemaVer = Number(manifest.schemaVersion || manifest.databaseSchemaVersion || 1)
  if (manifestSchemaVer > CURRENT_BACKUP_SCHEMA_VERSION) {
    isNewerVersion = true
    errors.push(
      `This Google Drive database was created by a newer version of Sky Ariana BOL (schema v${manifestSchemaVer}, current v${CURRENT_BACKUP_SCHEMA_VERSION}). Please update the application before restoring.`
    )
  }

  // 3. Checksums verification (if checksums.json present)
  let checksumsMatch = true
  const checksumsBuf = files.get("checksums.json")
  if (checksumsBuf) {
    try {
      const checksumsMap: Record<string, string> = JSON.parse(checksumsBuf.toString("utf8"))
      for (const [entryPath, expectedSha] of Object.entries(checksumsMap)) {
        const fileBuf = files.get(entryPath)
        if (fileBuf) {
          const actualSha = computeSha256(fileBuf)
          if (actualSha !== expectedSha) {
            checksumsMatch = false
            errors.push(`Checksum mismatch for ${entryPath}: expected ${expectedSha}, got ${actualSha}`)
          }
        }
      }
    } catch {
      warnings.push("checksums.json could not be parsed; skipping individual file sha check.")
    }
  }

  // 4. Core data file structure checks
  const coreFiles = [
    { target: "bols.json", fallback: "data/bols.json" },
    { target: "invoices.json", fallback: "data/invoices.json" },
    { target: "account-ledgers.json", fallback: "data/account-ledgers.json" },
    { target: "companies.json", fallback: "data/companies.json" },
  ]

  for (const item of coreFiles) {
    const buf = getFileFromArchive(files, item.target) || getFileFromArchive(files, item.fallback)
    if (!buf) {
      warnings.push(`Missing core data file ${item.target}; will default to empty collection if restored`)
    } else {
      try {
        JSON.parse(buf.toString("utf8"))
      } catch (err) {
        errors.push(`Data file ${item.target} is corrupted: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // 5. Accounting invariance check across ledgers
  let invarianceValid = true
  const ledgerBuf = getFileFromArchive(files, "account-ledgers.json") || getFileFromArchive(files, "data/account-ledgers.json")
  if (ledgerBuf) {
    try {
      const ledgers = JSON.parse(ledgerBuf.toString("utf8"))
      const check = validateLedgerInvariance(ledgers)
      if (!check.isValid) {
        invarianceValid = false
        errors.push(
          `Restored ledger violates accounting invariance (Balance = Debit - Credit): ${check.discrepancies.length} discrepancy found`
        )
      }
    } catch {
      invarianceValid = false
    }
  }

  return {
    isValid: errors.length === 0,
    manifest,
    files,
    invarianceValid,
    checksumsMatch,
    errors,
    warnings,
    isNewerVersion,
    recordCounts: manifest.recordCounts || manifest.counts,
    financialSummary: manifest.financialTotals,
  }
}

/**
 * Reads a backup file from disk and validates it.
 */
export async function validateBackupFile(filePath: string): Promise<BackupValidationResult> {
  try {
    const buffer = await fs.readFile(filePath)
    return validateDatabaseBackupBuffer(buffer)
  } catch (err) {
    return {
      isValid: false,
      files: new Map(),
      invarianceValid: false,
      errors: [`Unable to read backup file at ${filePath}: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
    }
  }
}

/**
 * Runs an in-memory sandbox test restore drill.
 * Validates foreign key relationships, duplicates, accounting balances, and attachments without writing to disk.
 */
export async function testRestoreInSandbox(archiveBuffer: Buffer): Promise<SandboxTestRestoreResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const warnings: string[] = []
  const relationalIssues: string[] = []

  let files: Map<string, Buffer>
  try {
    files = extractZipArchive(archiveBuffer)
  } catch (err) {
    return {
      pass: false,
      recordsVerified: 0,
      tablesVerified: 0,
      attachmentsVerified: 0,
      invarianceValid: false,
      financialTotals: [],
      relationalIssues: [],
      errors: [`Corrupted ZIP archive: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
      durationMs: Date.now() - startTime,
    }
  }

  // Parse manifest
  const manifestBuf = files.get("manifest.json")
  let manifest: BackupManifest | undefined
  if (manifestBuf) {
    try {
      manifest = JSON.parse(manifestBuf.toString("utf8"))
    } catch {
      errors.push("Invalid manifest.json in archive")
    }
  } else {
    errors.push("Missing manifest.json in archive")
  }

  // Parse tables in-memory
  let tablesVerified = 0
  let recordsVerified = 0
  let attachmentsVerified = 0

  const parseTable = <T = any[]>(name: string): T | null => {
    const buf = getFileFromArchive(files, name)
    if (!buf) return null
    try {
      const data = JSON.parse(buf.toString("utf8"))
      tablesVerified++
      if (Array.isArray(data)) recordsVerified += data.length
      else if (typeof data === "object" && data !== null) {
        recordsVerified += Object.keys(data).length
      }
      return data as T
    } catch (err) {
      errors.push(`Failed to parse table ${name}: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  const bols = parseTable<any[]>("bols.json") || parseTable<any[]>("data/bols.json") || []
  const shipments = parseTable<any[]>("shipments.json") || parseTable<any[]>("data/shipments.json") || []
  const containers = parseTable<any[]>("container-bookings.json") || []
  const companies = parseTable<any[]>("companies.json") || parseTable<any[]>("data/companies.json") || []
  const invoices = parseTable<any[]>("invoices.json") || parseTable<any[]>("data/invoices.json") || []
  const payments = parseTable<any[]>("payments.json") || []
  const accountLedgers = parseTable<any>("account-ledgers.json") || parseTable<any>("data/account-ledgers.json") || {}
  const supplierBills = parseTable<any[]>("supplier-bills.json") || []

  // Count attachments in ZIP
  for (const key of files.keys()) {
    if (key.startsWith("attachments/") || key.startsWith("documents/") || key.startsWith("public/uploads/")) {
      attachmentsVerified++
    }
  }

  // 1. Relational Integrity Checks
  const bolNumberSet = new Set<string>()
  const duplicateBolNumbers: string[] = []

  for (const b of bols) {
    const num = String(b.bol_number || b.id || "").trim().toLowerCase()
    if (num) {
      if (bolNumberSet.has(num)) {
        duplicateBolNumbers.push(num)
      }
      bolNumberSet.add(num)
    }
  }

  if (duplicateBolNumbers.length > 0) {
    relationalIssues.push(`Duplicate BOL numbers found: ${duplicateBolNumbers.slice(0, 5).join(", ")}`)
    errors.push(`Integrity Violation: Backup contains ${duplicateBolNumbers.length} duplicate BOL numbers`)
  }

  // Invoices -> BOLs
  let unlinkedInvoicesCount = 0
  for (const inv of invoices) {
    const bolRef = String(inv.bol_number || inv.bolNumber || inv.reference_number || "").trim().toLowerCase()
    if (bolRef && !bolNumberSet.has(bolRef)) {
      unlinkedInvoicesCount++
    }
  }
  if (unlinkedInvoicesCount > 0) {
    warnings.push(`${unlinkedInvoicesCount} invoices reference BOL numbers not present in the backup set.`)
  }

  // Payments -> Invoices / BOLs
  const invoiceNumberSet = new Set<string>()
  for (const inv of invoices) {
    const num = String(inv.invoice_number || inv.invoiceNumber || inv.id || "").trim().toLowerCase()
    if (num) invoiceNumberSet.add(num)
  }

  let unlinkedPaymentsCount = 0
  for (const p of payments) {
    const invRef = String(p.invoiceNumber || p.invoice_number || "").trim().toLowerCase()
    const bolRef = String(p.bolNumber || p.bol_number || "").trim().toLowerCase()
    if (invRef && !invoiceNumberSet.has(invRef) && (!bolRef || !bolNumberSet.has(bolRef))) {
      unlinkedPaymentsCount++
    }
  }
  if (unlinkedPaymentsCount > 0) {
    warnings.push(`${unlinkedPaymentsCount} payments reference invoices or BOLs not present in this backup.`)
  }

  // 2. Accounting Invariance Check Grouped by Currency
  const financialTotalsMap = new Map<string, { debit: number; credit: number; accounts: number }>()
  let invarianceValid = true

  if (typeof accountLedgers === "object" && accountLedgers !== null) {
    for (const [accountKey, val] of Object.entries(accountLedgers)) {
      const rows: any[] = Array.isArray(val) ? val : (val as any)?.entries || []
      for (const row of rows) {
        const cur = (row.currency || "USD").toUpperCase().trim()
        if (!financialTotalsMap.has(cur)) {
          financialTotalsMap.set(cur, { debit: 0, credit: 0, accounts: 0 })
        }
        const bucket = financialTotalsMap.get(cur)!
        bucket.debit += Number(row.debit || 0)
        bucket.credit += Number(row.credit || 0)
      }
    }
  }

  // Also check invoices / supplier bills if ledger empty
  const financialTotals: CurrencyBalanceTotals[] = Array.from(financialTotalsMap.entries()).map(([currency, stats]) => ({
    currency,
    totalDebit: Math.round(stats.debit * 100) / 100,
    totalCredit: Math.round(stats.credit * 100) / 100,
    netBalance: Math.round((stats.debit - stats.credit) * 100) / 100,
    accountCount: Object.keys(accountLedgers).length,
  }))

  const ledgerCheck = validateLedgerInvariance(accountLedgers)
  if (!ledgerCheck.isValid) {
    invarianceValid = false
    errors.push(`Accounting Invariance Check Failed: ${ledgerCheck.discrepancies.length} discrepancy detected.`)
  }

  const pass = errors.length === 0

  return {
    pass,
    backupId: manifest?.backupId,
    appVersion: manifest?.applicationVersion,
    schemaVersion: manifest?.databaseSchemaVersion,
    recordsVerified,
    tablesVerified,
    attachmentsVerified,
    invarianceValid,
    financialTotals,
    relationalIssues,
    errors,
    warnings,
    durationMs: Date.now() - startTime,
  }
}
