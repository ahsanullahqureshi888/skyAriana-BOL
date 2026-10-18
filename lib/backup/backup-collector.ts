/**
 * Sky Ariana Comprehensive Data & Attachment Collector
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getDataPath, getUploadPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import type { BackupRecordCounts, CurrencyBalanceTotals } from "./backup-types"

export interface ArchiveFileEntry {
  path: string
  data: Buffer
  checksum: string
  sizeBytes: number
  category: "database" | "attachment" | "setting" | "meta"
}

export interface CollectedBackupPackage {
  entries: ArchiveFileEntry[]
  checksumsMap: Record<string, string>
  recordCounts: BackupRecordCounts
  financialTotals: CurrencyBalanceTotals[]
  invarianceValid: boolean
  databaseChecksum: string
  attachmentsChecksum: string
  compositeChecksum: string
  includedFiles: string[]
  fileCounts: {
    databaseFiles: number
    attachmentFiles: number
    settingFiles: number
    totalFiles: number
  }
}

/**
 * Standard list of all database and system state files in Sky Ariana
 */
export const BACKUP_DATABASE_FILES = [
  { key: "bols", file: ".local-bols.json", targetPath: "database/bols.json" },
  { key: "bolSequence", file: ".local-bol-sequence.json", targetPath: "database/bol-sequence.json" },
  { key: "shipments", file: ".local-shipments.json", targetPath: "database/shipments.json" },
  { key: "containerBookings", file: ".local-container-bookings.json", targetPath: "database/container-bookings.json" },
  { key: "accounts", file: ".local-accounts.json", targetPath: "database/accounts.json" },
  { key: "masterEntities", file: ".local-master-entities.json", targetPath: "database/master-entities.json" },
  { key: "suppliers", file: ".local-suppliers.json", targetPath: "database/suppliers.json" },
  { key: "invoices", file: ".local-invoices.json", targetPath: "database/invoices.json" },
  { key: "financeInvoices", file: ".local-finance-invoices.json", targetPath: "database/finance-invoices.json" },
  { key: "financePayments", file: ".local-finance-payments.json", targetPath: "database/finance-payments.json" },
  { key: "financeReceipts", file: ".local-finance-receipts.json", targetPath: "database/finance-receipts.json" },
  { key: "financeRates", file: ".local-finance-rates.json", targetPath: "database/finance-rates.json" },
  { key: "shipmentCosts", file: ".local-shipment-costs.json", targetPath: "database/shipment-costs.json" },
  { key: "supplierBills", file: ".local-supplier-bills.json", targetPath: "database/supplier-bills.json" },
  { key: "supplierPayments", file: ".local-supplier-payments.json", targetPath: "database/supplier-payments.json" },
  { key: "supplierLedgers", file: ".local-supplier-ledgers.json", targetPath: "database/supplier-ledgers.json" },
  { key: "accountLedgers", file: ".local-account-ledgers.json", targetPath: "database/account-ledgers.json" },
  { key: "bolAccountLedgers", file: ".local-bol-account-ledgers.json", targetPath: "database/bol-account-ledgers.json" },
  { key: "ledgerSystem", file: ".local-ledger-system.json", targetPath: "database/ledger-system.json" },
  { key: "shipmentDocuments", file: ".local-shipment-documents.json", targetPath: "database/shipment-documents.json" },
  { key: "documentCompliance", file: "document-compliance.json", targetPath: "database/document-compliance.json" },
  { key: "portalAccounts", file: ".local-portal-accounts.json", targetPath: "database/portal-accounts.json" },
  { key: "customerPortalUsers", file: ".local-customer-portal-users.json", targetPath: "database/customer-portal-users.json" },
  { key: "rbacUsers", file: ".local-rbac-users.json", targetPath: "database/rbac-users.json" },
  { key: "rbacRoles", file: ".local-rbac-roles.json", targetPath: "database/rbac-roles.json" },
  { key: "workflowTasks", file: ".local-workflow-tasks.json", targetPath: "database/workflow-tasks.json" },
  { key: "dailyOps", file: ".local-daily-ops.json", targetPath: "database/daily-ops.json" },
  { key: "alerts", file: ".local-alerts.json", targetPath: "database/alerts.json" },
  { key: "approvals", file: ".local-approvals.json", targetPath: "database/approvals.json" },
  { key: "auditLogs", file: ".local-audit-logs.json", targetPath: "database/audit-logs.json" },
  { key: "fullSnapshot", file: ".local-full-snapshot.json", targetPath: "settings/full-snapshot.json" },
  { key: "accountingSettings", file: ".local-accounting-settings.json", targetPath: "settings/accounting-settings.json" },
  { key: "companyAccess", file: ".local-bol-company-access.json", targetPath: "settings/company-access.json" },
  { key: "syncCodes", file: ".local-sync-codes.json", targetPath: "settings/sync-codes.json" },
  { key: "device", file: ".local-device.json", targetPath: "settings/device.json" },
]

export function computeSha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

/**
 * Collects all database records and file attachments into archive entries
 */
export async function collectAllSystemData(options?: {
  includeAttachments?: boolean
  maxAttachmentSizeMb?: number
}): Promise<CollectedBackupPackage> {
  const entries: ArchiveFileEntry[] = []
  const checksumsMap: Record<string, string> = {}
  const includedFiles: string[] = []

  let databaseFilesCount = 0
  let settingFilesCount = 0
  let attachmentFilesCount = 0

  // 1. Read all database and setting files
  for (const item of BACKUP_DATABASE_FILES) {
    const filePath = getDataPath(item.file)
    let buffer: Buffer

    if (fsSync.existsSync(filePath)) {
      try {
        buffer = await fs.readFile(filePath)
      } catch {
        buffer = Buffer.from("[]", "utf8")
      }
    } else {
      buffer = Buffer.from(item.file.includes("settings") || item.file.includes("snapshot") ? "{}" : "[]", "utf8")
    }

    const checksum = computeSha256(buffer)
    const category = item.targetPath.startsWith("settings/") ? "setting" : "database"
    if (category === "database") databaseFilesCount++
    if (category === "setting") settingFilesCount++

    entries.push({
      path: item.targetPath,
      data: buffer,
      checksum,
      sizeBytes: buffer.length,
      category,
    })
    checksumsMap[item.targetPath] = checksum
    includedFiles.push(item.targetPath)
  }

  // 2. Collect sequential counter files
  for (const counterName of [".bol-counter", ".invoice-counter"]) {
    const cPath = getDataPath(counterName)
    let cBuffer = Buffer.from("1", "utf8")
    if (fsSync.existsSync(cPath)) {
      try {
        cBuffer = await fs.readFile(cPath)
      } catch {}
    }
    const targetPath = `settings/${counterName.replace(/^\./, "")}.txt`
    const checksum = computeSha256(cBuffer)
    entries.push({
      path: targetPath,
      data: cBuffer,
      checksum,
      sizeBytes: cBuffer.length,
      category: "setting",
    })
    checksumsMap[targetPath] = checksum
    includedFiles.push(targetPath)
    settingFilesCount++
  }

  // 3. Compute accurate Record Counts
  const recordCounts = await calculateLiveRecordCounts()

  // 4. Compute Financial Totals by Currency
  const { financialTotals, invarianceValid } = await calculateFinancialTotals()

  // 5. Collect File Attachments (if enabled)
  if (options?.includeAttachments !== false) {
    const maxBytes = (options?.maxAttachmentSizeMb || 25) * 1024 * 1024
    const uploadDirs = [
      getUploadPath(),
      path.join(process.cwd(), "public", "uploads"),
      path.join(process.cwd(), "data", "documents"),
      path.join(process.cwd(), "data", "pdf"),
    ]

    const seenFiles = new Set<string>()
    for (const dir of uploadDirs) {
      if (fsSync.existsSync(dir)) {
        try {
          const files = await fs.readdir(dir)
          for (const file of files.slice(0, 150)) {
            const fullPath = path.join(dir, file)
            if (seenFiles.has(file)) continue
            seenFiles.add(file)

            try {
              const stat = await fs.stat(fullPath)
              if (stat.isFile() && stat.size <= maxBytes) {
                const fileBuf = await fs.readFile(fullPath)
                const targetPath = `attachments/${file}`
                const checksum = computeSha256(fileBuf)
                entries.push({
                  path: targetPath,
                  data: fileBuf,
                  checksum,
                  sizeBytes: fileBuf.length,
                  category: "attachment",
                })
                checksumsMap[targetPath] = checksum
                includedFiles.push(targetPath)
                attachmentFilesCount++
              }
            } catch {}
          }
        } catch {}
      }
    }
  }

  // 6. Compute Grouped and Composite Checksums
  const dbChecksumsStr = entries
    .filter((e) => e.category === "database" || e.category === "setting")
    .map((e) => `${e.path}:${e.checksum}`)
    .sort()
    .join("\n")
  const databaseChecksum = computeSha256(dbChecksumsStr)

  const attChecksumsStr = entries
    .filter((e) => e.category === "attachment")
    .map((e) => `${e.path}:${e.checksum}`)
    .sort()
    .join("\n")
  const attachmentsChecksum = computeSha256(attChecksumsStr || "none")

  const compositeChecksum = computeSha256(`${databaseChecksum}:${attachmentsChecksum}`)

  return {
    entries,
    checksumsMap,
    recordCounts,
    financialTotals,
    invarianceValid,
    databaseChecksum,
    attachmentsChecksum,
    compositeChecksum,
    includedFiles,
    fileCounts: {
      databaseFiles: databaseFilesCount,
      attachmentFiles: attachmentFilesCount,
      settingFiles: settingFilesCount,
      totalFiles: entries.length,
    },
  }
}

/**
 * Calculates live record counts across all registered entities
 */
export async function calculateLiveRecordCounts(): Promise<BackupRecordCounts> {
  const [
    bols,
    shipments,
    containerBookings,
    accounts,
    invoices,
    financeInvoices,
    accountLedgers,
    financePayments,
    supplierBills,
    supplierCosts,
    supplierPayments,
    documents,
    workflowTasks,
    dailyOps,
    alerts,
    approvals,
    rbacUsers,
    portalUsers,
    rbacRoles,
    auditLogs,
  ] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-container-bookings.json"), []),
    readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any[]>(getDataPath(".local-finance-invoices.json"), []),
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
    readJsonFile<any[]>(getDataPath(".local-finance-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-bills.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipment-costs.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipment-documents.json"), []),
    readJsonFile<any[]>(getDataPath(".local-workflow-tasks.json"), []),
    readJsonFile<any>(getDataPath(".local-daily-ops.json"), {}),
    readJsonFile<any[]>(getDataPath(".local-alerts.json"), []),
    readJsonFile<any[]>(getDataPath(".local-approvals.json"), []),
    readJsonFile<any[]>(getDataPath(".local-rbac-users.json"), []),
    readJsonFile<any[]>(getDataPath(".local-customer-portal-users.json"), []),
    readJsonFile<any[]>(getDataPath(".local-rbac-roles.json"), []),
    readJsonFile<any[]>(getDataPath(".local-audit-logs.json"), []),
  ])

  // Count ledger entries across dictionary
  let ledgerCount = 0
  if (accountLedgers && typeof accountLedgers === "object") {
    for (const key of Object.keys(accountLedgers)) {
      const val = accountLedgers[key]
      if (Array.isArray(val)) {
        ledgerCount += val.length
      } else if (val?.entries && Array.isArray(val.entries)) {
        ledgerCount += val.entries.length
      }
    }
  }

  // Count container records from shipments + bookings
  const containerSet = new Set<string>()
  if (Array.isArray(containerBookings)) {
    for (const b of containerBookings) {
      if (b.containerNumber) containerSet.add(String(b.containerNumber).toUpperCase())
    }
  }
  if (Array.isArray(shipments)) {
    for (const s of shipments) {
      if (s.containers && Array.isArray(s.containers)) {
        for (const c of s.containers) {
          if (c.containerNumber) containerSet.add(String(c.containerNumber).toUpperCase())
        }
      }
    }
  }

  const bLen = Array.isArray(bols) ? bols.length : 0
  const sLen = Array.isArray(shipments) ? shipments.length : 0
  const cLen = containerSet.size
  const coLen = Array.isArray(accounts) ? accounts.length : 0
  const invLen = Math.max(Array.isArray(invoices) ? invoices.length : 0, Array.isArray(financeInvoices) ? financeInvoices.length : 0)
  const payLen = Array.isArray(financePayments) ? financePayments.length : 0
  const sbLen = Array.isArray(supplierBills) ? supplierBills.length : 0
  const scLen = Array.isArray(supplierCosts) ? supplierCosts.length : 0
  const spLen = Array.isArray(supplierPayments) ? supplierPayments.length : 0
  const docLen = Array.isArray(documents) ? documents.length : 0
  const taskLen = (Array.isArray(workflowTasks) ? workflowTasks.length : 0) + (Array.isArray(dailyOps?.tasks) ? dailyOps.tasks.length : 0)
  const alertLen = Array.isArray(alerts) ? alerts.length : 0
  const appLen = Array.isArray(approvals) ? approvals.length : 0
  const userLen = (Array.isArray(rbacUsers) ? rbacUsers.length : 0) + (Array.isArray(portalUsers) ? portalUsers.length : 0)
  const roleLen = Array.isArray(rbacRoles) ? rbacRoles.length : 0
  const auditLen = Array.isArray(auditLogs) ? auditLogs.length : 0

  const total = bLen + sLen + cLen + coLen + invLen + ledgerCount + payLen + sbLen + scLen + spLen + docLen + taskLen + alertLen + appLen + userLen + roleLen + auditLen

  return {
    bols: bLen,
    shipments: sLen,
    containers: cLen,
    companies: coLen,
    accounts: coLen,
    invoices: invLen,
    ledgerEntries: ledgerCount,
    payments: payLen,
    supplierBills: sbLen,
    supplierCosts: scLen,
    supplierPayments: spLen,
    documents: docLen,
    tasks: taskLen,
    alerts: alertLen,
    approvals: appLen,
    users: userLen,
    roles: roleLen,
    auditLogs: auditLen,
    totalRecords: total,
  }
}

/**
 * Computes financial ledger balances grouped strictly by currency (USD, AFN, AED, EUR)
 * and audits the accounting invariance (Debit - Credit = Balance).
 */
export async function calculateFinancialTotals(): Promise<{
  financialTotals: CurrencyBalanceTotals[]
  invarianceValid: boolean
}> {
  const [accountLedgers, bolLedgers] = await Promise.all([
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
    readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), {}),
  ])

  const totalsByCurrency: Record<string, { debit: number; credit: number; accounts: Set<string> }> = {
    USD: { debit: 0, credit: 0, accounts: new Set() },
    AFN: { debit: 0, credit: 0, accounts: new Set() },
    AED: { debit: 0, credit: 0, accounts: new Set() },
    EUR: { debit: 0, credit: 0, accounts: new Set() },
  }

  let invarianceValid = true

  const processLedgerDictionary = (dict: any) => {
    if (!dict || typeof dict !== "object") return
    for (const [accName, val] of Object.entries(dict)) {
      const rows: any[] = Array.isArray(val) ? val : Array.isArray((val as any)?.entries) ? (val as any).entries : []
      for (const row of rows) {
        const cur = (row.currency || "USD").toUpperCase()
        if (!totalsByCurrency[cur]) {
          totalsByCurrency[cur] = { debit: 0, credit: 0, accounts: new Set() }
        }
        totalsByCurrency[cur].accounts.add(accName)
        const d = Number(row.debit) || 0
        const c = Number(row.credit) || 0
        totalsByCurrency[cur].debit += d
        totalsByCurrency[cur].credit += c
      }
    }
  }

  processLedgerDictionary(accountLedgers)

  if (accountLedgers) {
    const invCheck = validateLedgerInvariance(accountLedgers)
    if (!invCheck.isValid) {
      invarianceValid = false
    }
  }

  const financialTotals: CurrencyBalanceTotals[] = Object.entries(totalsByCurrency)
    .filter(([_, data]) => data.debit > 0 || data.credit > 0 || data.accounts.size > 0)
    .map(([cur, data]) => ({
      currency: cur,
      totalDebit: Math.round(data.debit * 100) / 100,
      totalCredit: Math.round(data.credit * 100) / 100,
      netBalance: Math.round((data.debit - data.credit) * 100) / 100,
      accountCount: data.accounts.size,
    }))

  return {
    financialTotals,
    invarianceValid,
  }
}
