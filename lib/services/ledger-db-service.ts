import path from "path"
import crypto from "crypto"
import { getDataPath } from "../server-paths"
import { readJsonFile, writeJsonFile, atomicWriteFile } from "./blob-db"
import {
  AccountRecord,
  LedgerTransactionRecord,
  PaymentRecord,
  LedgerImportBatchRecord,
  AuditLogRecord,
  LedgerDatabaseSchema,
  AccountType,
} from "../types/ledger-system"
import { getAccountLedgerDatabase, saveAccountLedgerDatabase } from "./account-ledger-storage-service"

const LEDGER_SYSTEM_FILE = getDataPath(".local-ledger-system.json")
const BACKUP_DIR = getDataPath("backups")

const INITIAL_DB: LedgerDatabaseSchema = {
  accounts: [],
  ledger_transactions: [],
  payments: [],
  import_batches: [],
  audit_logs: [],
  version: "1.0.0",
  updated_at: new Date().toISOString(),
}

let inMemoryDb: LedgerDatabaseSchema | null = null
let lastReadTime = 0
const TTL_MS = 2000

export function generateFingerprint(fields: {
  account_name: string
  source_sheet?: string
  source_row?: number
  date?: string
  debit: number
  credit: number
  reference?: string
  invoice?: string
  bol?: string
}): string {
  const norm = [
    fields.account_name.trim().toLowerCase(),
    (fields.source_sheet || "").trim().toLowerCase(),
    String(fields.source_row ?? ""),
    (fields.date || "").trim(),
    Number(fields.debit || 0).toFixed(2),
    Number(fields.credit || 0).toFixed(2),
    (fields.reference || "").trim().toLowerCase(),
    (fields.invoice || "").trim().toLowerCase(),
    (fields.bol || "").trim().toLowerCase(),
  ].join("|")
  return crypto.createHash("sha256").update(norm).digest("hex")
}

export async function getLedgerSystemDb(): Promise<LedgerDatabaseSchema> {
  const now = Date.now()
  if (inMemoryDb && now - lastReadTime < TTL_MS) {
    return structuredClone(inMemoryDb)
  }
  const db = await readJsonFile<LedgerDatabaseSchema>(LEDGER_SYSTEM_FILE, INITIAL_DB)
  inMemoryDb = structuredClone(db)
  lastReadTime = now
  return db
}

export async function saveLedgerSystemDb(db: LedgerDatabaseSchema): Promise<void> {
  db.updated_at = new Date().toISOString()
  inMemoryDb = structuredClone(db)
  lastReadTime = Date.now()
  await writeJsonFile(LEDGER_SYSTEM_FILE, db)
}

/**
 * Recalculates running balances for an account strictly in chronological order:
 * Balance = Previous Balance + Debit - Credit
 * Invariance check: Final Balance = Opening Balance + Total Debit - Total Credit
 */
export function recalculateAccountBalances(
  account: AccountRecord,
  transactions: LedgerTransactionRecord[]
): {
  updatedAccount: AccountRecord
  updatedTransactions: LedgerTransactionRecord[]
} {
  const activeTx = transactions
    .filter((tx) => tx.account_id === account.id && !tx.is_deleted)
    .sort((a, b) => {
      // Sort primarily by source_row if from same sheet, or by date
      if (a.source_sheet && a.source_sheet === b.source_sheet && a.source_row && b.source_row) {
        return a.source_row - b.source_row
      }
      return (a.transaction_date || "").localeCompare(b.transaction_date || "")
    })

  let running = Number(account.opening_balance) || 0
  let totalDebit = 0
  let totalCredit = 0

  const updatedTx = activeTx.map((tx) => {
    const dr = Number(tx.debit) || 0
    const cr = Number(tx.credit) || 0
    totalDebit += dr
    totalCredit += cr
    running = Math.round((running + dr - cr) * 100) / 100
    return {
      ...tx,
      debit: dr,
      credit: cr,
      running_balance: running,
      updated_at: new Date().toISOString(),
    }
  })

  totalDebit = Math.round(totalDebit * 100) / 100
  totalCredit = Math.round(totalCredit * 100) / 100
  const finalBalance = Math.round(((Number(account.opening_balance) || 0) + totalDebit - totalCredit) * 100) / 100

  const updatedAccount: AccountRecord = {
    ...account,
    total_debit: totalDebit,
    total_credit: totalCredit,
    current_balance: finalBalance,
    updated_at: new Date().toISOString(),
  }

  return { updatedAccount, updatedTransactions: updatedTx }
}

/**
 * Creates a full backup snapshot before or after major operations
 */
export async function createDatabaseBackup(backupLabel: string): Promise<string> {
  const db = await getLedgerSystemDb()
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFileName = `${backupLabel}-${timestamp}.json`
  const backupPath = path.join(BACKUP_DIR, backupFileName)
  await atomicWriteFile(backupPath, JSON.stringify(db, null, 2))
  return backupFileName
}

/**
 * Bridge synchronizer: ensures legacy `.local-account-ledgers.json` stays in sync
 * so existing views (BOLEditor, LedgerView, etc.) immediately see all accounts and records.
 */
export async function syncToLegacyStorage(db: LedgerDatabaseSchema): Promise<void> {
  try {
    const legacyDb = await getAccountLedgerDatabase()
    const legacyAccountNames = new Set(legacyDb.accounts || [])
    const legacyEntries: Record<string, any[]> = { ...(legacyDb.ledgerEntries || {}) }

    for (const acc of db.accounts) {
      if (acc.status === "archived" || acc.status === "merged") continue
      const name = acc.account_name || acc.display_name
      legacyAccountNames.add(name)

      const txs = db.ledger_transactions
        .filter((t) => t.account_id === acc.id && !t.is_deleted)
        .sort((a, b) => (a.source_row ?? 0) - (b.source_row ?? 0))

      legacyEntries[name] = txs.map((t, idx) => ({
        id: t.id,
        sNo: idx + 1,
        date: t.transaction_date,
        shipperDescription: t.description || t.shipper_name || "",
        invoiceNo: t.invoice_number || "",
        dateOfShip: t.transaction_date,
        billOfLanding: t.bol_number || "",
        surrenderedBL: false,
        containerNo: t.container_number || "",
        containerType: t.container_type || "",
        consignee: t.consignee_name || "",
        quantity: t.quantity_text || "",
        debit: t.debit,
        credit: t.credit,
        balance: t.running_balance,
        currency: t.currency || acc.currency,
        remarks: t.remarks || "",
        sourceFile: t.source_file,
        sourceSheet: t.source_sheet,
        sourceRow: t.source_row,
      }))
    }

    await saveAccountLedgerDatabase({
      ...legacyDb,
      accounts: Array.from(legacyAccountNames),
      ledgerEntries: legacyEntries,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[ledger-db-service] syncToLegacyStorage error:", err)
  }
}

/**
 * Reverse sync: import legacy format entries into new database schema
 */
export async function syncFromLegacyAccountLedgers(
  legacyEntries: Record<string, any[]>
): Promise<void> {
  try {
    const db = await getLedgerSystemDb()
    let changed = false

    for (const [accName, rows] of Object.entries(legacyEntries)) {
      if (!accName || !Array.isArray(rows) || rows.length === 0) continue

      let acc = db.accounts.find(
        (a) => a.account_name.toLowerCase() === accName.toLowerCase() || (a.aliases && a.aliases.includes(accName))
      )

      if (!acc) {
        acc = {
          id: `ACC-${crypto.randomBytes(5).toString("hex")}`,
          account_code: `AC-${db.accounts.length + 1}`,
          account_name: accName,
          display_name: accName,
          normalized_name: accName.toUpperCase(),
          aliases: [accName],
          account_type: "customer",
          currency: "USD",
          opening_balance: 0,
          total_debit: 0,
          total_credit: 0,
          current_balance: 0,
          status: "active",
          source: "syncFromLegacy",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        db.accounts.push(acc)
        changed = true
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const bolNo = (r.barnamehNo || r.bolNo || r.billOfLanding || "").trim()
        const debitVal = Number(r.debit) || 0
        const creditVal = Number(r.credit) || 0

        const fp = generateFingerprint({
          account_name: accName,
          source_sheet: accName,
          source_row: i,
          date: r.date,
          debit: debitVal,
          credit: creditVal,
          reference: bolNo,
        })

        const existingTx = db.ledger_transactions.find(
          (t) => (t.account_id === acc!.id && t.bol_number && t.bol_number === bolNo) || t.fingerprint === fp
        )

        if (!existingTx) {
          db.ledger_transactions.push({
            id: `TX-${acc.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            account_id: acc.id,
            transaction_date: r.date || new Date().toISOString().split("T")[0],
            transaction_type: debitVal > 0 ? "charge" : "payment",
            description: r.shipperDescription || r.description || "BOL Charge",
            reference_number: bolNo,
            invoice_number: r.invoiceNo || "",
            bol_number: bolNo,
            container_number: r.containerNo || "",
            container_type: r.containerType || "",
            consignee_name: r.consignee || "",
            shipper_name: r.shipperDescription || "",
            truck_number: r.truckNo || "",
            quantity_text: r.quantity || "",
            debit: debitVal,
            credit: creditVal,
            running_balance: 0,
            currency: r.currency || acc.currency,
            source_file: "legacy-sync",
            source_sheet: accName,
            source_row: i,
            fingerprint: fp,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          changed = true
        }
      }

      const { updatedAccount, updatedTransactions } = recalculateAccountBalances(acc, db.ledger_transactions)
      const accIdx = db.accounts.findIndex((a) => a.id === acc!.id)
      if (accIdx >= 0) db.accounts[accIdx] = updatedAccount
      db.ledger_transactions = db.ledger_transactions.filter((t) => t.account_id !== acc!.id).concat(updatedTransactions)
    }

    if (changed) {
      await saveLedgerSystemDb(db)
    }
  } catch (err) {
    console.error("[ledger-db-service] syncFromLegacyAccountLedgers error:", err)
  }
}

export const ledgerDbService = {
  getDb: getLedgerSystemDb,
  saveDb: saveLedgerSystemDb,
  recalculateAccountBalances,
  createDatabaseBackup,
  syncToLegacyStorage,
  syncFromLegacyAccountLedgers,
  generateFingerprint,
}
