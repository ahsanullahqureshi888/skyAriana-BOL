import path from "path"
import { readJsonFile, writeJsonFile } from "./blob-db"

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

  const next: BolAccountLedgerDatabase = {
    customCompanies: Array.isArray(data.customCompanies) ? data.customCompanies : existing.customCompanies,
    ledgerRecords: data.ledgerRecords && typeof data.ledgerRecords === "object" ? data.ledgerRecords : existing.ledgerRecords,
    deletedLedgerEntries: Array.isArray(data.deletedLedgerEntries) ? data.deletedLedgerEntries : existing.deletedLedgerEntries,
    updated_at: new Date().toISOString(),
  }

  await writeJsonFile(bolAccountLedgerFile, next)
  return next
}
