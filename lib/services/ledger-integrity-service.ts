/**
 * Sky Ariana Ledger Data Integrity & Auto-Reconciliation Engine
 * Audits running balances, sequence numbers, and BOL references across all accounts.
 * Provides 1-click mathematical reconciliation and health reporting.
 */

import { toast } from "sonner"

export interface LedgerHealthIssue {
  accountId: string
  companyId: string
  accountName: string
  companyName: string
  entryIndex: number
  sNo: number
  issueType: "BALANCE_MISMATCH" | "NEGATIVE_BALANCE" | "MISSING_SNO" | "DUPLICATE_SNO"
  expectedValue: number | string
  actualValue: number | string
  details: string
}

export interface LedgerHealthReport {
  totalAccountsAudited: number
  totalCompaniesAudited: number
  totalEntriesAudited: number
  discrepanciesCount: number
  healthy: boolean
  issues: LedgerHealthIssue[]
  auditedAt: string
}

/**
 * Scan all stored ledgers in localStorage for mathematical discrepancies
 */
export function auditLedgerIntegrity(): LedgerHealthReport {
  const issues: LedgerHealthIssue[] = []
  let totalAccounts = 0
  let totalCompanies = 0
  let totalEntries = 0

  if (typeof window === "undefined") {
    return {
      totalAccountsAudited: 0,
      totalCompaniesAudited: 0,
      totalEntriesAudited: 0,
      discrepanciesCount: 0,
      healthy: true,
      issues: [],
      auditedAt: new Date().toISOString(),
    }
  }

  try {
    const rawAccounts = window.localStorage.getItem("sky-bol-browser-accounts") || window.localStorage.getItem("skybol:saved-accounts")
    const accounts = rawAccounts ? JSON.parse(rawAccounts) : []

    const rawLedgers = window.localStorage.getItem("skybol:account-ledgers")
    const ledgerMap: Record<string, any[]> = rawLedgers ? JSON.parse(rawLedgers) : {}

    // 1. Audit Structured Accounts
    if (Array.isArray(accounts)) {
      totalAccounts = accounts.length
      for (const acc of accounts) {
        if (!acc || !Array.isArray(acc.companies)) continue
        totalCompanies += acc.companies.length

        for (const comp of acc.companies) {
          if (!comp || !Array.isArray(comp.ledgerEntries)) continue
          const entries = comp.ledgerEntries
          totalEntries += entries.length

          let runningBalance = 0
          const seenSNos = new Set<number>()

          entries.forEach((entry: any, idx: number) => {
            const debit = Number(entry.debit) || 0
            const credit = Number(entry.credit) || 0
            runningBalance += debit - credit

            const actualBal = Number(entry.balance) || 0
            const sNo = Number(entry.sNo) || idx + 1

            // Check S.No duplication
            if (seenSNos.has(sNo)) {
              issues.push({
                accountId: acc.id,
                companyId: comp.id,
                accountName: acc.name,
                companyName: comp.name,
                entryIndex: idx,
                sNo,
                issueType: "DUPLICATE_SNO",
                expectedValue: idx + 1,
                actualValue: sNo,
                details: `Duplicate S.No ${sNo} found in ${acc.name} / ${comp.name}`,
              })
            }
            seenSNos.add(sNo)

            // Check Mathematical Running Balance (tolerance < 0.01)
            if (Math.abs(actualBal - runningBalance) > 0.01) {
              issues.push({
                accountId: acc.id,
                companyId: comp.id,
                accountName: acc.name,
                companyName: comp.name,
                entryIndex: idx,
                sNo,
                issueType: "BALANCE_MISMATCH",
                expectedValue: runningBalance,
                actualValue: actualBal,
                details: `Row ${sNo} (${entry.shipperDescription || "Entry"}): Balance recorded as $${actualBal.toLocaleString()} but calculated as $${runningBalance.toLocaleString()}`,
              })
            }
          })
        }
      }
    }

    // 2. Audit Flat Ledger Map
    Object.entries(ledgerMap).forEach(([key, entries]) => {
      if (!Array.isArray(entries)) return
      let runningBalance = 0
      entries.forEach((entry, idx) => {
        const debit = Number(entry.debit) || 0
        const credit = Number(entry.credit) || 0
        runningBalance += debit - credit
        const actualBal = Number(entry.balance) || 0

        if (Math.abs(actualBal - runningBalance) > 0.01) {
          issues.push({
            accountId: key,
            companyId: key,
            accountName: key,
            companyName: key,
            entryIndex: idx,
            sNo: entry.sNo || idx + 1,
            issueType: "BALANCE_MISMATCH",
            expectedValue: runningBalance,
            actualValue: actualBal,
            details: `Account [${key}] Row ${idx + 1}: Balance is $${actualBal.toLocaleString()} vs expected $${runningBalance.toLocaleString()}`,
          })
        }
      })
    })
  } catch (err) {
    console.error("Error during ledger integrity audit:", err)
  }

  return {
    totalAccountsAudited: totalAccounts,
    totalCompaniesAudited: totalCompanies,
    totalEntriesAudited: totalEntries,
    discrepanciesCount: issues.length,
    healthy: issues.length === 0,
    issues,
    auditedAt: new Date().toLocaleString(),
  }
}

/**
 * 1-Click Auto-Reconciliation of all ledger balances across localStorage
 */
export function reconcileAllLedgers(): { fixedCount: number; message: string } {
  if (typeof window === "undefined") return { fixedCount: 0, message: "Browser environment required." }

  let fixedCount = 0

  try {
    // 1. Reconcile structured accounts
    const rawAccounts = window.localStorage.getItem("sky-bol-browser-accounts") || window.localStorage.getItem("skybol:saved-accounts")
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts)
      if (Array.isArray(accounts)) {
        for (const acc of accounts) {
          if (!acc || !Array.isArray(acc.companies)) continue
          for (const comp of acc.companies) {
            if (!comp || !Array.isArray(comp.ledgerEntries)) continue
            let runningBalance = 0
            comp.ledgerEntries.forEach((entry: any, idx: number) => {
              const debit = Number(entry.debit) || 0
              const credit = Number(entry.credit) || 0
              runningBalance += debit - credit
              if (Math.abs((Number(entry.balance) || 0) - runningBalance) > 0.01 || entry.sNo !== idx + 1) {
                entry.balance = runningBalance
                entry.sNo = idx + 1
                fixedCount++
              }
            })
          }
        }
        const updatedAccountsJson = JSON.stringify(accounts)
        window.localStorage.setItem("sky-bol-browser-accounts", updatedAccountsJson)
        window.localStorage.setItem("skybol:saved-accounts", updatedAccountsJson)
      }
    }

    // 2. Reconcile flat ledger map
    const rawLedgers = window.localStorage.getItem("skybol:account-ledgers")
    if (rawLedgers) {
      const ledgerMap: Record<string, any[]> = JSON.parse(rawLedgers)
      Object.keys(ledgerMap).forEach((key) => {
        const entries = ledgerMap[key]
        if (!Array.isArray(entries)) return
        let runningBalance = 0
        entries.forEach((entry: any, idx: number) => {
          const debit = Number(entry.debit) || 0
          const credit = Number(entry.credit) || 0
          runningBalance += debit - credit
          if (Math.abs((Number(entry.balance) || 0) - runningBalance) > 0.01 || entry.sNo !== idx + 1) {
            entry.balance = runningBalance
            entry.sNo = idx + 1
            fixedCount++
          }
        })
      })
      window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(ledgerMap))
    }

    // Notify components
    window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))
    window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))

    return {
      fixedCount,
      message: fixedCount > 0 ? `Successfully reconciled ${fixedCount} entry discrepancies!` : "All ledger balances are mathematically perfect.",
    }
  } catch (err: any) {
    console.error("Reconciliation error:", err)
    return {
      fixedCount: 0,
      message: `Error during reconciliation: ${err?.message || "Unknown error"}`,
    }
  }
}
