import path from "path"
import { readJsonFile, writeJsonFile } from "./blob-db"

export type AccountLedgerDatabase = {
  accounts: any[]
  ledgerEntries: Record<string, any[]>
  ledgerProfiles: Record<string, any>
  receipts: Record<string, any>
  deletedLedgerEntries?: any[]
  updated_at?: string
}

const ledgerDatabaseFile = path.join(process.cwd(), ".local-account-ledgers.json")

const emptyDatabase: AccountLedgerDatabase = {
  accounts: [],
  ledgerEntries: {},
  ledgerProfiles: {},
  receipts: {},
  deletedLedgerEntries: [],
}

let memoryCacheLedger: AccountLedgerDatabase | null = null
let lastLedgerCacheTime = 0
const LEDGER_TTL_MS = 3000

export async function getAccountLedgerDatabase() {
  const now = Date.now()
  let database: AccountLedgerDatabase
  if (memoryCacheLedger && (now - lastLedgerCacheTime < LEDGER_TTL_MS)) {
    database = memoryCacheLedger
  } else {
    database = await readJsonFile<AccountLedgerDatabase>(ledgerDatabaseFile, emptyDatabase)
    memoryCacheLedger = database
    lastLedgerCacheTime = now
  }

  return {
    accounts: Array.isArray(database.accounts) ? database.accounts : [],
    ledgerEntries: database.ledgerEntries && typeof database.ledgerEntries === "object" ? database.ledgerEntries : {},
    ledgerProfiles: database.ledgerProfiles && typeof database.ledgerProfiles === "object" ? database.ledgerProfiles : {},
    receipts: database.receipts && typeof database.receipts === "object" ? database.receipts : {},
    deletedLedgerEntries: Array.isArray(database.deletedLedgerEntries) ? database.deletedLedgerEntries : [],
    updated_at: database.updated_at || null,
  }
}

export async function saveAccountLedgerDatabase(data: Partial<AccountLedgerDatabase>) {
  const existing = await getAccountLedgerDatabase()

  // Safely merge accounts and ledger entries without losing other companies
  const mergedAccounts = Array.from(new Set([
    ...(Array.isArray(existing.accounts) ? existing.accounts : []),
    ...(Array.isArray(data.accounts) ? data.accounts : []),
  ]))

  const mergedLedgerEntries = {
    ...(existing.ledgerEntries || {}),
    ...(data.ledgerEntries || {}),
  }

  const mergedProfiles = {
    ...(existing.ledgerProfiles || {}),
    ...(data.ledgerProfiles || {}),
  }

  const mergedReceipts = {
    ...(existing.receipts || {}),
    ...(data.receipts || {}),
  }

  const mergedDeleted = Array.isArray(data.deletedLedgerEntries)
    ? data.deletedLedgerEntries
    : (Array.isArray(existing.deletedLedgerEntries) ? existing.deletedLedgerEntries : [])

  const next: AccountLedgerDatabase = {
    accounts: mergedAccounts,
    ledgerEntries: mergedLedgerEntries,
    ledgerProfiles: mergedProfiles,
    receipts: mergedReceipts,
    deletedLedgerEntries: mergedDeleted,
    updated_at: new Date().toISOString(),
  }

  memoryCacheLedger = next
  lastLedgerCacheTime = Date.now()

  // Write primary and backup files atomically
  await writeJsonFile(ledgerDatabaseFile, next)
  const backupFile = path.join(process.cwd(), ".local-account-ledgers.backup.json")
  try {
    await writeJsonFile(backupFile, next)
  } catch (e) {}

  return next
}
