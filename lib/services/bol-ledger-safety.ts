/**
 * Bill of Lading Ledger Safety & Financial Dependency Checker
 * Protects accounting invariance: Net Balance = Total Debit - Total Credit
 * Blocks hard deletion if active financial ledger records or transactions reference this BOL.
 */

import { getDataPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { cleanBolNumber } from "@/lib/utils/bol-filters"

export interface LedgerReferenceCheckResult {
  hasReferences: boolean
  count: number
  matchedBolNumber: string
  details: string[]
}

/**
 * Checks if a Bill of Lading is referenced in local or company account ledgers.
 */
export async function checkBolLedgerReferences(bolIdOrNumber: string): Promise<LedgerReferenceCheckResult> {
  const target = (cleanBolNumber(bolIdOrNumber) || bolIdOrNumber || "").trim().toLowerCase()
  if (!target) {
    return { hasReferences: false, count: 0, matchedBolNumber: "", details: [] }
  }

  const details: string[] = []
  let count = 0

  // 1. Check .local-account-ledgers.json
  try {
    const acctPath = getDataPath(".local-account-ledgers.json")
    const acctData = await readJsonFile<any>(acctPath, {})
    const ledgerEntries = acctData?.ledgerEntries || acctData || {}

    for (const [company, rows] of Object.entries<any>(ledgerEntries)) {
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const rowBol = cleanBolNumber(row.barnamehNo || row.bolNo || row.bol_number || row.bolNumber || "")
          if (rowBol && rowBol.toLowerCase() === target) {
            count++
            const amount = row.debit || row.credit || row.amount || 0
            details.push(`Account Ledger (${company}): ${rowBol} - ${row.shipperDescription || "Entry"} (Amount: ${amount})`)
          }
        }
      }
    }
  } catch (err) {
    console.warn("[bol-ledger-safety] Warning reading .local-account-ledgers.json:", err)
  }

  // 2. Check .local-bol-account-ledgers.json
  try {
    const bolLedgersPath = getDataPath(".local-bol-account-ledgers.json")
    const bolLedgersData = await readJsonFile<any>(bolLedgersPath, {})
    const ledgerRecords = bolLedgersData?.ledgerRecords || bolLedgersData || {}

    for (const [company, rows] of Object.entries<any>(ledgerRecords)) {
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const rowBol = cleanBolNumber(row.barnamehNo || row.bolNo || row.bol_number || row.bolNumber || "")
          if (rowBol && rowBol.toLowerCase() === target) {
            count++
            const amount = row.debit || row.credit || row.amount || 0
            details.push(`BOL Account Ledger (${company}): ${rowBol} - ${row.shipperDescription || "Entry"} (Amount: ${amount})`)
          }
        }
      }
    }
  } catch (err) {
    console.warn("[bol-ledger-safety] Warning reading .local-bol-account-ledgers.json:", err)
  }

  return {
    hasReferences: count > 0,
    count,
    matchedBolNumber: target.toUpperCase(),
    details: details.slice(0, 10), // Limit summary to 10 entries
  }
}
