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
const LEDGER_TTL_MS = 1000

export function mergeLedgerRows(existingRows: any[] = [], incomingRows: any[] = []): any[] {
  if (!Array.isArray(existingRows)) existingRows = []
  if (!Array.isArray(incomingRows)) incomingRows = []

  const rowMap = new Map<string, any>()
  const getKey = (r: any) => {
    const bol = (r.barnamehNo || r.bolNo || "").trim().toLowerCase()
    return bol ? `bol:${bol}` : (r.id ? `id:${r.id}` : `desc:${(r.description || r.shipperDescription || "").trim().toLowerCase()}_${r.date || ""}`)
  }

  // Populate map with existing rows
  for (const row of existingRows) {
    const key = getKey(row)
    if (key) {
      rowMap.set(key, {
        ...row,
        debit: Number(row.debit) || 0,
        credit: Number(row.credit) || 0,
      })
    }
  }

  // Merge incoming rows intelligently
  for (const row of incomingRows) {
    const key = getKey(row)
    const existing = key ? rowMap.get(key) : null

    const incomingDebit = row.debit !== undefined && row.debit !== "" ? Number(row.debit) || 0 : undefined
    const incomingCredit = row.credit !== undefined && row.credit !== "" ? Number(row.credit) || 0 : undefined

    const mergedDebit = incomingDebit !== undefined ? incomingDebit : (existing ? (Number(existing.debit) || 0) : 0)
    const mergedCredit = incomingCredit !== undefined ? incomingCredit : (existing ? (Number(existing.credit) || 0) : 0)

    const merged = {
      ...(existing || {}),
      ...row,
      debit: mergedDebit,
      credit: mergedCredit,
      containerNo: row.containerNo || existing?.containerNo || "",
      containerType: row.containerType || existing?.containerType || "",
      containerDetails: row.containerDetails || existing?.containerDetails || "",
      driverFreight: row.driverFreight || row.driverRent || existing?.driverFreight || existing?.driverRent || "",
      driverRent: row.driverFreight || row.driverRent || existing?.driverFreight || existing?.driverRent || "",
      pdfFile: row.pdfFile || row.pdfPathname || existing?.pdfFile || existing?.pdfPathname || undefined,
      pdfPathname: row.pdfFile || row.pdfPathname || existing?.pdfFile || existing?.pdfPathname || undefined,
      surrenderedBL: row.surrenderedBL !== undefined ? Boolean(row.surrenderedBL) : Boolean(existing?.surrenderedBL),
    }

    if (key) {
      rowMap.set(key, merged)
    }
  }

  return Array.from(rowMap.values())
}

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

export function isCleanCompanyName(name: string): boolean {
  if (!name || typeof name !== "string") return false
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 80) return false
  if (/^(?:1X|2X|1\s*X|2\s*X)?\s*\d+\s*(?:FT|J|HC|GP|CTN)/i.test(trimmed)) return false
  if (/کندهار څخه|له کندهار|بندر ته|ټرنسپورټ/i.test(trimmed)) return false
  if (/(?:Raisins|Dry Figs|Apricots|Seeds|CTNS|KGS|BAGS)\s*[,|-]/i.test(trimmed)) return false
  return true
}

export async function saveAccountLedgerDatabase(data: Partial<AccountLedgerDatabase>) {
  const existing = await getAccountLedgerDatabase()

  // Safely merge accounts and filter out non-company noise
  const mergedAccounts = Array.from(new Set([
    ...(Array.isArray(existing.accounts) ? existing.accounts : []),
    ...(Array.isArray(data.accounts) ? data.accounts : []),
  ])).filter(isCleanCompanyName)

  // Smart row-by-row merge for each company key
  const mergedLedgerEntries: Record<string, any[]> = { ...(existing.ledgerEntries || {}) }
  if (data.ledgerEntries && typeof data.ledgerEntries === "object") {
    for (const [key, rows] of Object.entries(data.ledgerEntries)) {
      if (Array.isArray(rows)) {
        mergedLedgerEntries[key] = mergeLedgerRows(mergedLedgerEntries[key] || [], rows)
      } else {
        mergedLedgerEntries[key] = rows
      }
    }
  }

  const mergedProfiles = {
    ...(existing.ledgerProfiles || {}),
    ...(data.ledgerProfiles || {}),
  }

  const mergedReceipts = {
    ...(existing.receipts || {}),
    ...(data.receipts || {}),
  }

  const mergedDeleted = Array.from(new Set([
    ...(Array.isArray(existing.deletedLedgerEntries) ? existing.deletedLedgerEntries : []),
    ...(Array.isArray(data.deletedLedgerEntries) ? data.deletedLedgerEntries : []),
  ]))

  // Clean out any deleted rows from all company ledger keys
  if (mergedDeleted.length > 0) {
    const delBolSet = new Set(
      mergedDeleted.map((d: any) => (d.entry?.barnamehNo || d.entry?.bolNo || '').trim().toLowerCase()).filter(Boolean)
    )
    const delIdSet = new Set(
      mergedDeleted.map((d: any) => d.entry?.id).filter(Boolean)
    )

    Object.keys(mergedLedgerEntries).forEach((key) => {
      if (Array.isArray(mergedLedgerEntries[key])) {
        mergedLedgerEntries[key] = mergedLedgerEntries[key].filter((row: any) => {
          const rBol = (row.barnamehNo || row.bolNo || '').trim().toLowerCase()
          const rId = row.id
          if (rId && delIdSet.has(rId)) return false
          if (rBol && delBolSet.has(rBol)) return false
          return true
        })
      }
    })
  }

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
