import fs from "node:fs/promises"
import path from "node:path"
import { getDataPath, getUploadPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { getDatabaseRevision } from "./revision"

export interface BackupRecordCounts {
  bols: number
  invoices: number
  companies: number
  ledgerEntries: number
  accounts: number
  shipments: number
}

export interface CollectedData {
  entries: Array<{ path: string; data: Buffer | string }>
  recordCounts: BackupRecordCounts
  databaseRevision: number
  timestamp: string
}

/**
 * Collects all operational application files and counts from local datastores.
 * Does NOT modify, reset, or delete any local files.
 */
export async function collectApplicationData(options?: {
  includeDocuments?: boolean
  maxDocumentSizeMb?: number
}): Promise<CollectedData> {
  const [
    bols,
    invoices,
    accountLedgers,
    bolLedgers,
    accounts,
    shipments,
    fullSnapshot,
    databaseRevision,
  ] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
    readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), {}),
    readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipments.json"), []),
    readJsonFile<any>(getDataPath(".local-full-snapshot.json"), {}),
    getDatabaseRevision(),
  ])

  let bolCounter = ""
  let invoiceCounter = ""
  try {
    bolCounter = await fs.readFile(getDataPath(".bol-counter"), "utf8").catch(() => "")
    invoiceCounter = await fs.readFile(getDataPath(".invoice-counter"), "utf8").catch(() => "")
  } catch {}

  // Accurate ledger entry count across all accounts
  let totalLedgerEntries = 0
  if (accountLedgers && typeof accountLedgers === "object") {
    for (const key of Object.keys(accountLedgers)) {
      const val = accountLedgers[key]
      if (Array.isArray(val)) {
        totalLedgerEntries += val.length
      } else if (val?.entries && Array.isArray(val.entries)) {
        totalLedgerEntries += val.entries.length
      }
    }
  }

  const recordCounts: BackupRecordCounts = {
    bols: Array.isArray(bols) ? bols.length : 0,
    invoices: Array.isArray(invoices) ? invoices.length : 0,
    companies: Array.isArray(accounts) ? accounts.length : 0,
    ledgerEntries: totalLedgerEntries,
    accounts: Array.isArray(accounts) ? accounts.length : 0,
    shipments: Array.isArray(shipments) ? shipments.length : 0,
  }

  const entries: Array<{ path: string; data: Buffer | string }> = [
    { path: "data/bols.json", data: JSON.stringify(bols, null, 2) },
    { path: "data/invoices.json", data: JSON.stringify(invoices, null, 2) },
    { path: "data/account-ledgers.json", data: JSON.stringify(accountLedgers, null, 2) },
    { path: "data/bol-ledgers.json", data: JSON.stringify(bolLedgers, null, 2) },
    { path: "data/companies.json", data: JSON.stringify(accounts, null, 2) },
    { path: "data/shipments.json", data: JSON.stringify(shipments, null, 2) },
    { path: "data/settings.json", data: JSON.stringify(fullSnapshot?.companySettings || {}, null, 2) },
    { path: "data/route-presets.json", data: JSON.stringify(fullSnapshot?.routePresets || [], null, 2) },
    { path: "data/bol-counter.txt", data: bolCounter.trim() },
    { path: "data/invoice-counter.txt", data: invoiceCounter.trim() },
  ]

  // Collect documents if requested
  if (options?.includeDocuments) {
    const maxSizeBytes = (options.maxDocumentSizeMb || 15) * 1024 * 1024
    try {
      const uploadRoot = getUploadPath()
      const files = await fs.readdir(uploadRoot).catch(() => [] as string[])
      for (const file of files.slice(0, 100)) {
        try {
          const filePath = path.join(uploadRoot, file)
          const stat = await fs.stat(filePath)
          if (stat.isFile() && stat.size <= maxSizeBytes) {
            const buffer = await fs.readFile(filePath)
            entries.push({ path: `documents/${file}`, data: buffer })
          }
        } catch {}
      }
    } catch {}
  }

  return {
    entries,
    recordCounts,
    databaseRevision,
    timestamp: new Date().toISOString(),
  }
}
