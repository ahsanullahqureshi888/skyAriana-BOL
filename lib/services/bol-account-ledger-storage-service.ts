import path from "path"
import { readJsonFile, writeJsonFile } from "./blob-db"
import { mergeLedgerRows } from "./account-ledger-storage-service"

export type BolAccountLedgerDatabase = {
  customCompanies: string[]
  ledgerRecords: Record<string, any[]>
  deletedLedgerEntries?: any[]
  updated_at?: string
}

const bolAccountLedgerFile = path.join(process.cwd(), ".local-bol-account-ledgers.json")

const emptyDatabase: BolAccountLedgerDatabase = {
  customCompanies: [],
  ledgerRecords: {},
  deletedLedgerEntries: [],
}

export async function getBolAccountLedgerDatabase() {
  const database = await readJsonFile<BolAccountLedgerDatabase>(bolAccountLedgerFile, emptyDatabase)

  return {
    customCompanies: Array.isArray(database.customCompanies) ? database.customCompanies : [],
    ledgerRecords: database.ledgerRecords && typeof database.ledgerRecords === "object" ? database.ledgerRecords : {},
    deletedLedgerEntries: Array.isArray(database.deletedLedgerEntries) ? database.deletedLedgerEntries : [],
    updated_at: database.updated_at || null,
  }
}

export async function saveBolAccountLedgerDatabase(data: Partial<BolAccountLedgerDatabase>) {
  const existing = await getBolAccountLedgerDatabase()

  const mergedDeleted = Array.from(new Set([
    ...(Array.isArray(existing.deletedLedgerEntries) ? existing.deletedLedgerEntries : []),
    ...(Array.isArray(data.deletedLedgerEntries) ? data.deletedLedgerEntries : []),
  ]))

  // Smart row-by-row merge for each company key
  const mergedRecords: Record<string, any[]> = { ...(existing.ledgerRecords || {}) }
  if (data.ledgerRecords && typeof data.ledgerRecords === "object") {
    for (const [key, rows] of Object.entries(data.ledgerRecords)) {
      if (Array.isArray(rows)) {
        mergedRecords[key] = mergeLedgerRows(mergedRecords[key] || [], rows)
      } else {
        mergedRecords[key] = rows
      }
    }
  }

  // Clean out any deleted rows from all company ledger records
  if (mergedDeleted.length > 0) {
    const delBolSet = new Set(
      mergedDeleted.map((d: any) => (d.entry?.barnamehNo || d.entry?.bolNo || '').trim().toLowerCase()).filter(Boolean)
    )
    const delIdSet = new Set(
      mergedDeleted.map((d: any) => d.entry?.id).filter(Boolean)
    )

    Object.keys(mergedRecords).forEach((key) => {
      if (Array.isArray(mergedRecords[key])) {
        mergedRecords[key] = mergedRecords[key].filter((row: any) => {
          const rBol = (row.barnamehNo || row.bolNo || '').trim().toLowerCase()
          const rId = row.id
          if (rId && delIdSet.has(rId)) return false
          if (rBol && delBolSet.has(rBol)) return false
          return true
        })
      }
    })
  }

  const next: BolAccountLedgerDatabase = {
    customCompanies: Array.isArray(data.customCompanies) ? data.customCompanies : existing.customCompanies,
    ledgerRecords: mergedRecords,
    deletedLedgerEntries: mergedDeleted,
    updated_at: new Date().toISOString(),
  }

  await writeJsonFile(bolAccountLedgerFile, next)
  const backupFile = path.join(process.cwd(), ".local-bol-account-ledgers.backup.json")
  try {
    await writeJsonFile(backupFile, next)
  } catch (e) {}

  return next
}
