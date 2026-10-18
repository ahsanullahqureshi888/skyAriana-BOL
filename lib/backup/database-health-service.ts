/**
 * Sky Ariana Enterprise Database Health & Integrity Audit Engine
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import os from "node:os"
import { getDataPath, getDataRoot, getUploadPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import { parseWeight, parsePackages } from "@/lib/reports/parsers"
import { collectAllSystemData } from "./backup-collector"
import { createFullSystemBackup } from "./create-backup"
import { CURRENT_DATABASE_SCHEMA_VERSION } from "./backup-manifest"
import type { DeepHealthReport, DatabaseHealthIssue, BackupItem } from "./backup-types"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

/**
 * Runs a deep, non-destructive health scan across all 25+ database stores, relational links,
 * accounting invariance, and file attachments.
 */
export async function runDeepHealthScan(): Promise<DeepHealthReport> {
  const issues: DatabaseHealthIssue[] = []
  const primaryDataDir = getDataRoot() || path.join(process.cwd(), "data")

  // Ensure primary data directory exists if possible
  try {
    if (!fsSync.existsSync(primaryDataDir)) {
      await fs.mkdir(primaryDataDir, { recursive: true })
    }
  } catch (_) {}

  // 1. Storage & Writable check
  let databaseReadable = true
  let databaseWritable = false
  let totalStorageBytes = 0

  try {
    const testFile = path.join(primaryDataDir, `.health-probe-${Date.now()}.tmp`)
    await fs.writeFile(testFile, "health-check-probe", "utf8")
    const testRead = await fs.readFile(testFile, "utf8")
    databaseWritable = testRead === "health-check-probe"
    await fs.unlink(testFile).catch(() => {})
  } catch (err) {
    // In serverless environments (Vercel / AWS Lambda), the deployment root is read-only (/var/task).
    // The storage engine (blob-db) writes to os.tmpdir() and synchronizes with cloud storage.
    try {
      const serverlessTmpDir = os.tmpdir()
      const testTmpFile = path.join(serverlessTmpDir, `.health-probe-${Date.now()}.tmp`)
      await fs.writeFile(testTmpFile, "health-check-probe", "utf8")
      const testRead = await fs.readFile(testTmpFile, "utf8")
      databaseWritable = testRead === "health-check-probe"
      await fs.unlink(testTmpFile).catch(() => {})
    } catch (tmpErr) {
      databaseWritable = false
      issues.push({
        severity: "CRITICAL",
        category: "STORAGE",
        module: "STORAGE_ENGINE",
        title: "Database storage directory is NOT writable",
        details: err instanceof Error ? err.message : String(err),
        repairable: false,
      })
    }
  }

  // 2. Load all tables
  const [
    bols,
    shipments,
    containers,
    companies,
    accounts,
    invoices,
    accountLedgers,
    bolLedgers,
    payments,
    supplierBills,
    supplierCosts,
    supplierPayments,
    documents,
  ] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-container-bookings.json"), []),
    readJsonFile<any[]>(getDataPath(".local-companies.json"), []),
    readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
    readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), {}),
    readJsonFile<any[]>(getDataPath(".local-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-bills.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-costs.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-documents.json"), []),
  ])

  // Compute storage size of .local-*.json files
  try {
    const scanDirs = [primaryDataDir, path.join(process.cwd(), "data"), process.cwd(), os.tmpdir()]
    const seenFiles = new Set<string>()
    for (const dir of scanDirs) {
      if (!fsSync.existsSync(dir)) continue
      const dataFiles = await fs.readdir(dir).catch(() => [])
      for (const f of dataFiles) {
        if (f.startsWith(".local-") && f.endsWith(".json") && !seenFiles.has(f)) {
          seenFiles.add(f)
          const stat = await fs.stat(path.join(dir, f)).catch(() => null)
          if (stat) totalStorageBytes += stat.size
        }
      }
    }
  } catch {}

  // 3. Relational integrity & duplicate primary keys
  const bolNumberMap = new Map<string, number>()
  for (const b of bols) {
    const num = String(b.bol_number || b.id || "").trim().toUpperCase()
    if (num) {
      bolNumberMap.set(num, (bolNumberMap.get(num) || 0) + 1)
    }
  }

  // Detect duplicate BOLs
  let duplicateBolCount = 0
  for (const [num, count] of bolNumberMap.entries()) {
    if (count > 1) {
      duplicateBolCount += count - 1
      issues.push({
        severity: "CRITICAL",
        category: "DUPLICATE",
        module: "BOLS",
        recordId: num,
        title: `Duplicate BOL Number detected: ${num}`,
        details: `BOL number appears ${count} times in the database.`,
        repairable: true,
        repairAction: "REPAIR_DUPLICATE_BOLS",
      })
    }
  }

  // Detect duplicate Containers
  const containerNumMap = new Map<string, number>()
  for (const c of containers) {
    const num = String(c.container_number || c.containerNumber || c.id || "").trim().toUpperCase()
    if (num) {
      containerNumMap.set(num, (containerNumMap.get(num) || 0) + 1)
    }
  }
  let duplicateContainerCount = 0
  for (const [num, count] of containerNumMap.entries()) {
    if (count > 1) {
      duplicateContainerCount += count - 1
      issues.push({
        severity: "WARNING",
        category: "DUPLICATE",
        module: "CONTAINERS",
        recordId: num,
        title: `Duplicate Container identifier: ${num}`,
        details: `Container ID is registered ${count} times in container bookings.`,
        repairable: true,
        repairAction: "REPAIR_DUPLICATE_CONTAINERS",
      })
    }
  }

  // Detect duplicate Invoices
  const invoiceNumMap = new Map<string, number>()
  for (const inv of invoices) {
    const num = String(inv.invoice_number || inv.invoiceNumber || inv.id || "").trim().toUpperCase()
    if (num) {
      invoiceNumMap.set(num, (invoiceNumMap.get(num) || 0) + 1)
    }
  }
  let duplicateInvoiceCount = 0
  for (const [num, count] of invoiceNumMap.entries()) {
    if (count > 1) {
      duplicateInvoiceCount += count - 1
      issues.push({
        severity: "CRITICAL",
        category: "DUPLICATE",
        module: "INVOICES",
        recordId: num,
        title: `Duplicate Invoice Number detected: ${num}`,
        details: `Invoice number is registered ${count} times in the system.`,
        repairable: true,
        repairAction: "REPAIR_DUPLICATE_INVOICES",
      })
    }
  }

  // Check Orphan Invoices (Invoices referencing missing BOLs)
  let orphanInvoicesCount = 0
  for (const inv of invoices) {
    const bolRef = String(inv.bol_number || inv.bolNumber || inv.reference_number || "").trim().toUpperCase()
    if (bolRef && !bolNumberMap.has(bolRef)) {
      orphanInvoicesCount++
      issues.push({
        severity: "WARNING",
        category: "ORPHAN",
        module: "INVOICES",
        recordId: inv.invoice_number || inv.id,
        title: `Orphan Invoice: ${inv.invoice_number || inv.id} references missing BOL ${bolRef}`,
        details: `Invoice ${inv.invoice_number} cannot find referenced BOL '${bolRef}'.`,
        repairable: true,
        repairAction: "LINK_ORPHAN_INVOICE",
      })
    }
  }

  // Check Orphan Payments (Payments referencing nonexistent invoice and nonexistent BOL)
  let orphanPaymentsCount = 0
  for (const p of payments) {
    const invRef = String(p.invoiceNumber || p.invoice_number || "").trim().toUpperCase()
    const bolRef = String(p.bolNumber || p.bol_number || "").trim().toUpperCase()
    const hasInv = invRef && invoiceNumMap.has(invRef)
    const hasBol = bolRef && bolNumberMap.has(bolRef)

    if (!hasInv && !hasBol && (invRef || bolRef)) {
      orphanPaymentsCount++
      issues.push({
        severity: "WARNING",
        category: "ORPHAN",
        module: "PAYMENTS",
        recordId: p.id || p.referenceNumber,
        title: `Orphan Payment: payment ${p.id || p.referenceNumber} references nonexistent Invoice/BOL`,
        details: `Target invoice '${invRef}' and BOL '${bolRef}' were not found.`,
        repairable: false,
      })
    }
  }

  // 4. Accounting Invariance Audit
  const ledgerCheck = validateLedgerInvariance(accountLedgers)
  let discrepanciesCount = 0
  if (!ledgerCheck.isValid) {
    discrepanciesCount = ledgerCheck.discrepancies.length
    for (const d of ledgerCheck.discrepancies) {
      issues.push({
        severity: "CRITICAL",
        category: "ACCOUNTING",
        module: "ACCOUNT_LEDGERS",
        recordId: d.account,
        title: `Accounting Invariance Discrepancy in account: ${d.account}`,
        details: `Debit - Credit does not equal final running balance. (${d.message || "Discrepancy detected"})`,
        repairable: true,
        repairAction: "RECOMPUTE_LEDGER_BALANCES",
      })
    }
  }

  // Check currency existence on ledgers
  if (typeof accountLedgers === "object" && accountLedgers !== null) {
    for (const [accName, val] of Object.entries(accountLedgers)) {
      const rows: any[] = Array.isArray(val) ? val : (val as any)?.entries || []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row && typeof row === "object") {
          if (!row.currency || typeof row.currency !== "string" || !row.currency.trim()) {
            issues.push({
              severity: "WARNING",
              category: "ACCOUNTING",
              module: "ACCOUNT_LEDGERS",
              title: `Missing currency declaration on entry in account ${accName}`,
              details: `Row index ${i} lacks currency. Defaulting to USD is recommended.`,
              repairable: true,
              repairAction: "FILL_MISSING_CURRENCY",
            })
            break
          }
        }
      }
    }
  }

  // 4b. Accounting Health: NaN, Infinity, and broken transaction references
  let nanInfinityCount = 0
  if (typeof accountLedgers === "object" && accountLedgers !== null) {
    for (const [accName, val] of Object.entries(accountLedgers)) {
      const rows: any[] = Array.isArray(val) ? val : (val as any)?.entries || []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row && typeof row === "object") {
          const debit = row.debit
          const credit = row.credit
          const balance = row.balance
          if (
            Number.isNaN(debit) ||
            !Number.isFinite(debit) ||
            Number.isNaN(credit) ||
            !Number.isFinite(credit) ||
            Number.isNaN(balance) ||
            !Number.isFinite(balance)
          ) {
            nanInfinityCount++
            issues.push({
              severity: "CRITICAL",
              category: "ACCOUNTING",
              module: "ACCOUNT_LEDGERS",
              recordId: `${accName}-row-${i}`,
              title: `Non-finite numeric balance/debit/credit (NaN or Infinity) in account ${accName}`,
              details: `Row index ${i} has invalid numeric value (debit: ${debit}, credit: ${credit}, balance: ${balance}).`,
              repairable: true,
              repairAction: "RECOMPUTE_LEDGER_BALANCES",
            })
          }
        }
      }
    }
  }

  // 4c. BOL Health & Extreme Value Detection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let missingBolNumberCount = 0
  let uuidAsBolNumberCount = 0
  let invalidPackagesCount = 0
  let invalidWeightsCount = 0
  let extremeValuesCount = 0
  let legacyProvenanceIssuesCount = 0

  for (const b of bols) {
    const rawNum = String(b.bol_number || "").trim()

    // Missing official BOL number
    if (!rawNum) {
      missingBolNumberCount++
      issues.push({
        severity: "CRITICAL",
        category: "DOCUMENT",
        module: "BOLS",
        recordId: b.id,
        title: `Missing official BOL number on record ${b.id}`,
        details: "BOL record has blank or missing bol_number identity.",
        repairable: true,
        repairAction: "REPAIR_DUPLICATE_BOLS",
      })
    }
    // UUID shown/used as document identity
    else if (uuidRegex.test(rawNum)) {
      uuidAsBolNumberCount++
      issues.push({
        severity: "WARNING",
        category: "DOCUMENT",
        module: "BOLS",
        recordId: b.id,
        title: `UUID format used as official BOL document number: ${rawNum}`,
        details: "BOL number should be canonical sequence (e.g. BOL-YYYY-XXX) rather than raw UUID.",
        repairable: false,
      })
    }

    // Invalid package quantities & weights
    const rawPkgs = b.number_of_packages || b.numberOfPackages || b.packages || b.total_packages || b.package_count
    const pkgs = rawPkgs !== undefined && rawPkgs !== null && String(rawPkgs).trim() !== "" ? parsePackages(rawPkgs) : 0

    const rawWeight = b.gross_weight || b.grossWeight || b.weight
    const weight = rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== "" ? parseWeight(rawWeight) : 0

    const rawPkgsStr = rawPkgs !== undefined && rawPkgs !== null ? String(rawPkgs).trim() : ""
    const hasPkgsText = rawPkgsStr !== ""
    const isPkgsInvalid = pkgs < 0 || Number.isNaN(pkgs) || (hasPkgsText && !/\d/.test(rawPkgsStr) && !["N/A", "PENDING", "-", "NONE"].includes(rawPkgsStr.toUpperCase()))

    if (isPkgsInvalid) {
      invalidPackagesCount++
      issues.push({
        severity: "WARNING",
        category: "DOCUMENT",
        module: "BOLS",
        recordId: rawNum || b.id,
        title: `Invalid package quantity (${rawPkgsStr || pkgs}) on BOL ${rawNum || b.id}`,
        details: "Package count is negative or non-numeric.",
        repairable: false,
      })
    }

    const rawWeightStr = rawWeight !== undefined && rawWeight !== null ? String(rawWeight).trim() : ""
    const hasWeightText = rawWeightStr !== ""
    const isWeightInvalid = weight < 0 || Number.isNaN(weight) || (hasWeightText && !/\d/.test(rawWeightStr) && !["N/A", "PENDING", "-", "NONE"].includes(rawWeightStr.toUpperCase()))

    if (isWeightInvalid) {
      invalidWeightsCount++
      issues.push({
        severity: "WARNING",
        category: "DOCUMENT",
        module: "BOLS",
        recordId: rawNum || b.id,
        title: `Invalid weight (${rawWeightStr || weight}) on BOL ${rawNum || b.id}`,
        details: "Gross weight is negative or non-numeric.",
        repairable: false,
      })
    }

    // Extreme Value Detection (Legacy corruption patterns: packages > 1B, weights > 1e16 KG)
    // IMPORTANT: DO NOT AUTO-FIX EXTREME VALUES (create Data Quality Warning; no silent mutation)
    if (pkgs > 1_000_000_000) {
      extremeValuesCount++
      issues.push({
        severity: "CRITICAL",
        category: "DOCUMENT",
        module: "BOLS",
        recordId: rawNum || b.id,
        title: `DATA QUALITY WARNING: Extreme package quantity detected (${pkgs.toLocaleString()}) on BOL ${rawNum || b.id}`,
        details: `Package quantity exceeds 1,000,000,000. Suspected legacy overflow corruption. Requires manual operator audit.`,
        repairable: false,
      })
    }

    if (weight > 1e16) {
      extremeValuesCount++
      issues.push({
        severity: "CRITICAL",
        category: "DOCUMENT",
        module: "BOLS",
        recordId: rawNum || b.id,
        title: `DATA QUALITY WARNING: Extreme cargo weight detected (${weight} KG) on BOL ${rawNum || b.id}`,
        details: `Gross weight exceeds 1e16 KG. Suspected floating-point corruption. Requires manual operator audit.`,
        repairable: false,
      })
    }

    // Historical BOL Health: Check legacy records retain provenance
    const isLegacy = Boolean(b.is_legacy || b.isLegacy || b.source === "LEGACY" || rawNum.includes("051"))
    if (isLegacy) {
      const hasSource = Boolean(b.source_file || b.sourceFile || b.source_page || b.sourcePage || b.barnama || b.Barnama || b.source_serial)
      if (!hasSource) {
        legacyProvenanceIssuesCount++
        issues.push({
          severity: "WARNING",
          category: "DOCUMENT",
          module: "HISTORICAL_BOLS",
          recordId: rawNum || b.id,
          title: `Historical provenance missing on legacy record ${rawNum || b.id}`,
          details: "Legacy record is missing Barnama or source file/page metadata.",
          repairable: false,
        })
      }
    }
  }

  // 4d. Data Drift Detection (sudden unexpected drops in record counts)
  const DRIFT_FILE = getDataPath(".local-data-drift-history.json")
  let dataDriftWarning = false
  const currentSnapshot = {
    timestamp: new Date().toISOString(),
    bols: bols.length,
    ledgerEntries: Object.values(accountLedgers).reduce<number>(
      (acc, v: any) => acc + (Array.isArray(v) ? v.length : v?.entries?.length || 0),
      0
    ),
    documents: documents.length,
    companies: companies.length,
    invoices: invoices.length,
  }

  const driftHistory = await readJsonFile<any[]>(DRIFT_FILE, [])
  if (driftHistory.length > 0) {
    const prev = driftHistory[0]
    // Check if documents or bols dropped by >50%
    if (prev.documents >= 50 && currentSnapshot.documents < prev.documents * 0.5) {
      dataDriftWarning = true
      issues.push({
        severity: "CRITICAL",
        category: "DOCUMENT",
        module: "DATA_DRIFT",
        title: `POSSIBLE DATA LOSS: Suspicious sudden drop in documents count (${prev.documents} -> ${currentSnapshot.documents})`,
        details: "Document count dropped precipitously since last health audit. Check for accidental mass deletion or path detachment.",
        repairable: false,
      })
    }
    if (prev.bols >= 50 && currentSnapshot.bols < prev.bols * 0.5) {
      dataDriftWarning = true
      issues.push({
        severity: "CRITICAL",
        category: "DOCUMENT",
        module: "DATA_DRIFT",
        title: `POSSIBLE DATA LOSS: Suspicious sudden drop in BOL records (${prev.bols} -> ${currentSnapshot.bols})`,
        details: "BOL count dropped precipitously since last health audit.",
        repairable: false,
      })
    }
  }

  driftHistory.unshift(currentSnapshot)
  if (driftHistory.length > 100) driftHistory.length = 100
  await writeJsonFile(DRIFT_FILE, driftHistory)

  // 5. Document & Attachment Check
  const uploadRoot = getUploadPath()
  let missingFilesCount = 0
  for (const doc of documents) {
    const fileUrl = doc.file_url || doc.url || doc.path || ""
    if (fileUrl) {
      const base = path.basename(fileUrl)
      const possibleDiskPaths = [
        path.join(uploadRoot, base),
        path.join(process.cwd(), "public", fileUrl.replace(/^\//, "")),
        path.join(process.cwd(), fileUrl.replace(/^\//, "")),
      ]
      const exists = possibleDiskPaths.some((p) => fsSync.existsSync(p))
      if (!exists) {
        missingFilesCount++
        issues.push({
          severity: "WARNING",
          category: "DOCUMENT",
          module: "DOCUMENTS",
          recordId: doc.id,
          title: `Attached file missing on disk: ${base}`,
          details: `Document '${doc.name || doc.title || doc.id}' references '${fileUrl}' which does not exist on disk.`,
          repairable: false,
        })
      }
    }
  }

  // 6. Last backup verification status
  const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
  const validBackups = catalog.filter((b) => b.verificationStatus === "VERIFIED" && b.status === "SUCCESS")
  const lastBackup = catalog[0]
  const lastVerified = validBackups[0]

  const lastBackupValid = Boolean(lastBackup && lastBackup.verificationStatus === "VERIFIED")
  if (catalog.length === 0) {
    issues.push({
      severity: "CRITICAL",
      category: "STORAGE",
      module: "DISASTER_RECOVERY",
      title: "No system backups exist",
      details: "The system has no recorded recovery points. Immediate backup required.",
      repairable: true,
      repairAction: "TRIGGER_IMMEDIATE_BACKUP",
    })
  } else if (!lastBackupValid) {
    issues.push({
      severity: "WARNING",
      category: "STORAGE",
      module: "DISASTER_RECOVERY",
      title: "Latest backup is not verified or failed",
      details: `Backup ${lastBackup?.fileName || "unknown"} status: ${lastBackup?.status || "UNKNOWN"}.`,
      repairable: false,
    })
  }

  // Calculate Overall Status
  let overallStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY"
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length
  const warningCount = issues.filter((i) => i.severity === "WARNING").length

  if (criticalCount > 0 || !databaseWritable || !ledgerCheck.isValid) {
    overallStatus = "CRITICAL"
  } else if (warningCount > 0 || !lastBackupValid) {
    overallStatus = "WARNING"
  }

  const systemData = await collectAllSystemData({ includeAttachments: false })

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    databaseRevision: Date.now(),
    schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    databaseReadable,
    databaseWritable,
    totalStorageBytes,
    lastBackupTime: lastBackup?.createdAt,
    lastBackupValid,
    lastVerifiedTime: lastVerified?.createdAt,
    recordCounts: systemData.recordCounts,
    issues,
    checks: {
      relationalIntegrity: {
        pass: orphanInvoicesCount === 0 && orphanPaymentsCount === 0,
        violations: orphanInvoicesCount + orphanPaymentsCount,
      },
      orphanDetection: {
        pass: orphanInvoicesCount === 0,
        orphansCount: orphanInvoicesCount,
      },
      duplicateCriticalIds: {
        pass: duplicateBolCount === 0 && duplicateContainerCount === 0 && duplicateInvoiceCount === 0,
        duplicatesCount: duplicateBolCount + duplicateContainerCount + duplicateInvoiceCount,
      },
      accountingInvariance: {
        pass: ledgerCheck.isValid,
        discrepanciesCount,
      },
      documentStorage: {
        pass: missingFilesCount === 0,
        missingFilesCount,
      },
    },
  }
}

/**
 * Executes controlled safe repairs on database issues.
 * ALWAYS creates a pre-repair safety snapshot before executing!
 */
export async function executeDatabaseRepair(actions: string[], actor = "System Admin"): Promise<{
  success: boolean
  preRepairBackupFileName: string
  repairsApplied: string[]
  errors: string[]
}> {
  // 1. Mandatory Pre-Repair Safety Backup
  let preRepairBackupFileName = ""
  try {
    const safetyBkp = await createFullSystemBackup({
      type: "PRE_REPAIR_SAFETY",
      actor: `Repair [${actor}]`,
      note: `Safety snapshot created before applying database repair actions: ${actions.join(", ")}`,
      protected: true,
    })
    preRepairBackupFileName = safetyBkp.backupItem.fileName
  } catch (err) {
    return {
      success: false,
      preRepairBackupFileName: "",
      repairsApplied: [],
      errors: [`Failed to create pre-repair safety backup: ${err instanceof Error ? err.message : String(err)}`],
    }
  }

  const repairsApplied: string[] = []
  const errors: string[] = []

  // 2. Recompute ledger balances if requested
  if (actions.includes("RECOMPUTE_LEDGER_BALANCES") || actions.includes("ALL")) {
    try {
      const ledgers = await readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {})
      let fixedAccounts = 0

      for (const [accountKey, val] of Object.entries(ledgers)) {
        const rows: any[] = Array.isArray(val) ? val : (val as any)?.entries || []
        if (rows.length === 0) continue

        // Sort chronologically
        rows.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())

        let running = 0
        for (const row of rows) {
          const debit = Number(row.debit || 0)
          const credit = Number(row.credit || 0)
          running += debit - credit
          row.balance = Math.round(running * 100) / 100
        }

        if (Array.isArray(val)) {
          ledgers[accountKey] = rows
        } else {
          (val as any).entries = rows
          ;(val as any).currentBalance = Math.round(running * 100) / 100
        }
        fixedAccounts++
      }

      await writeJsonFile(getDataPath(".local-account-ledgers.json"), ledgers)
      repairsApplied.push(`Recomputed and aligned running balances across ${fixedAccounts} ledger accounts.`)
    } catch (err) {
      errors.push(`Failed to repair ledger balances: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 3. Fill missing currency
  if (actions.includes("FILL_MISSING_CURRENCY") || actions.includes("ALL")) {
    try {
      const ledgers = await readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {})
      let filledCount = 0

      for (const [, val] of Object.entries(ledgers)) {
        const rows: any[] = Array.isArray(val) ? val : (val as any)?.entries || []
        for (const row of rows) {
          if (row && typeof row === "object") {
            if (!row.currency || !String(row.currency).trim()) {
              row.currency = "USD"
              filledCount++
            }
          }
        }
      }

      await writeJsonFile(getDataPath(".local-account-ledgers.json"), ledgers)
      repairsApplied.push(`Filled default USD currency for ${filledCount} entries lacking currency.`)
    } catch (err) {
      errors.push(`Failed to fill missing currency: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 4. Resolve duplicate BOLs
  if (actions.includes("REPAIR_DUPLICATE_BOLS") || actions.includes("ALL")) {
    try {
      const bols = await readJsonFile<any[]>(getDataPath(".local-bols.json"), [])
      const seen = new Map<string, number>()
      let resolvedCount = 0

      for (const b of bols) {
        const num = String(b.bol_number || b.id || "").trim().toUpperCase()
        if (num) {
          const count = seen.get(num) || 0
          if (count > 0) {
            b.bol_number = `${num}-DUP${count}`
            resolvedCount++
          }
          seen.set(num, count + 1)
        }
      }

      if (resolvedCount > 0) {
        await writeJsonFile(getDataPath(".local-bols.json"), bols)
        repairsApplied.push(`Deduplicated ${resolvedCount} duplicate BOL records with unique suffixes.`)
      }
    } catch (err) {
      errors.push(`Failed to deduplicate BOLs: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 5. Trigger immediate backup if requested
  if (actions.includes("TRIGGER_IMMEDIATE_BACKUP")) {
    try {
      const bkp = await createFullSystemBackup({
        type: "MANUAL",
        actor,
        note: "Immediate system backup triggered via Database Health Repair Tool",
      })
      repairsApplied.push(`Created verified backup archive: ${bkp.backupItem.fileName}`)
    } catch (err) {
      errors.push(`Failed to create immediate backup: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    success: errors.length === 0,
    preRepairBackupFileName,
    repairsApplied,
    errors,
  }
}
