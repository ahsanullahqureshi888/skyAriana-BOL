import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { getServerPaths, ensureServerDirectories } from "../server/paths"
import { getServerCollection } from "./engine"
import { validateLedgerInvariance, type LedgerAuditResult } from "../services/ledger-sync-utils"
import { SYSTEM_VERSION } from "../config/system-version"

export interface DiskSpaceInfo {
  freeBytes: number
  totalBytes: number
  freeGb: number
  totalGb: number
  percentFree: number
  lowDiskWarning: boolean // True if < 5 GB
}

export interface DatabaseHealthReport {
  status: "healthy" | "warning" | "error"
  timestamp: string
  version: string
  diskSpace: DiskSpaceInfo | null
  databaseWritable: boolean
  databaseReadable: boolean
  counts: {
    bols: number
    invoices: number
    accounts: number
    ledgerAccounts: number
    ledgerEntries: number
  }
  ledgerAudit: {
    isValid: boolean
    netBalance: number
    discrepancyCount: number
  }
  errors: string[]
  warnings: string[]
}

export interface PublicHealthResponse {
  status: "healthy" | "degraded" | "unhealthy"
  service: string
  version: string
  timestamp: string
  database: "ok" | "error"
}

/**
 * Checks available disk space on the drive hosting the database.
 */
export async function checkDiskSpace(targetDir: string): Promise<DiskSpaceInfo | null> {
  try {
    if (typeof fs.statfs === "function") {
      const stats = await fs.statfs(targetDir)
      const freeBytes = stats.bfree * stats.bsize
      const totalBytes = stats.blocks * stats.bsize
      const freeGb = Math.round((freeBytes / (1024 * 1024 * 1024)) * 100) / 100
      const totalGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100
      const percentFree = totalBytes > 0 ? Math.round((freeBytes / totalBytes) * 100) : 100

      return {
        freeBytes,
        totalBytes,
        freeGb,
        totalGb,
        percentFree,
        lowDiskWarning: freeGb < 5.0,
      }
    }
    return null
  } catch (err) {
    console.warn("[Health] Failed to measure disk space:", err)
    return null
  }
}

/**
 * Performs full internal health check of the server database and storage.
 */
export async function getFullHealthReport(): Promise<DatabaseHealthReport> {
  const errors: string[] = []
  const warnings: string[] = []
  const paths = await ensureServerDirectories()

  // 1. Check disk space
  const diskSpace = await checkDiskSpace(paths.root)
  if (diskSpace?.lowDiskWarning) {
    warnings.push(`Low disk space warning: Only ${diskSpace.freeGb} GB remaining on server drive (threshold: 5 GB).`)
  }

  // 2. Test write & read on database dir
  let databaseWritable = false
  let databaseReadable = false
  const testFile = path.join(paths.database, `.health-check-${Date.now()}.tmp`)
  try {
    await fs.writeFile(testFile, "OK", "utf-8")
    databaseWritable = true
    const read = await fs.readFile(testFile, "utf-8")
    if (read === "OK") {
      databaseReadable = true
    }
    await fs.unlink(testFile).catch(() => {})
  } catch (err) {
    try {
      const fallbackDir = typeof os.tmpdir === "function" ? os.tmpdir() : "/tmp"
      const testTmp = path.join(fallbackDir, `.health-check-${Date.now()}.tmp`)
      await fs.writeFile(testTmp, "OK", "utf-8")
      databaseWritable = true
      const read = await fs.readFile(testTmp, "utf-8")
      if (read === "OK") {
        databaseReadable = true
      }
      await fs.unlink(testTmp).catch(() => {})
    } catch (_) {
      errors.push(`Database storage access test failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 3. Check data counts
  const bols = await getServerCollection<any[]>("bols.json", [])
  const invoices = await getServerCollection<any[]>("invoices.json", [])
  const accounts = await getServerCollection<any[]>("accounts.json", [])
  const ledgers = await getServerCollection<Record<string, any[]>>("account-ledgers.json", {})

  let totalLedgerEntries = 0
  for (const acc of Object.keys(ledgers)) {
    if (Array.isArray(ledgers[acc])) {
      totalLedgerEntries += ledgers[acc].length
    }
  }

  // 4. Validate ledger invariance
  const ledgerAudit = validateLedgerInvariance(ledgers)
  if (!ledgerAudit.isValid) {
    warnings.push(`Ledger invariance detected ${ledgerAudit.discrepancies.length} discrepancies.`)
  }

  let status: DatabaseHealthReport["status"] = "healthy"
  if (errors.length > 0 || !databaseWritable || !databaseReadable) {
    status = "error"
  } else if (warnings.length > 0) {
    status = "warning"
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: SYSTEM_VERSION.version,
    diskSpace,
    databaseWritable,
    databaseReadable,
    counts: {
      bols: Array.isArray(bols) ? bols.length : 0,
      invoices: Array.isArray(invoices) ? invoices.length : 0,
      accounts: Array.isArray(accounts) ? accounts.length : 0,
      ledgerAccounts: Object.keys(ledgers).length,
      ledgerEntries: totalLedgerEntries,
    },
    ledgerAudit: {
      isValid: ledgerAudit.isValid,
      netBalance: ledgerAudit.netBalance,
      discrepancyCount: ledgerAudit.discrepancies.length,
    },
    errors,
    warnings,
  }
}

/**
 * Sanitized public health check for /api/health
 */
export async function getPublicHealth(): Promise<PublicHealthResponse> {
  try {
    const report = await getFullHealthReport()
    return {
      status: report.status === "error" ? "unhealthy" : report.status === "warning" ? "degraded" : "healthy",
      service: "Sky Ariana BOL Server",
      version: report.version,
      timestamp: report.timestamp,
      database: report.databaseWritable && report.databaseReadable ? "ok" : "error",
    }
  } catch {
    return {
      status: "unhealthy",
      service: "Sky Ariana BOL Server",
      version: SYSTEM_VERSION.version,
      timestamp: new Date().toISOString(),
      database: "error",
    }
  }
}
