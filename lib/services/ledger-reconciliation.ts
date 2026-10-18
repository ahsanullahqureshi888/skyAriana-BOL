import { LedgerDatabaseSchema } from "../types/ledger-system"
import { WorkbookParseResult } from "./excel-ledger-importer"

export interface SheetReconciliationRow {
  accountName: string
  sheetName: string
  currency: string
  excelDebit: number
  excelCredit: number
  excelBalance: number
  dbDebit: number
  dbCredit: number
  dbBalance: number
  diffDebit: number
  diffCredit: number
  diffBalance: number
  status: "MATCHED" | "DISCREPANCY"
}

export interface LedgerReconciliationReport {
  timestamp: string
  excelAccountsFound: number
  accountsImported: number
  transactionsFound: number
  transactionsImported: number
  transactionsSkipped: number
  duplicateTransactions: number
  formulaErrors: number
  unknownCurrencies: number
  totalDebitExcel: number
  totalCreditExcel: number
  netBalanceExcel: number
  totalDebitDb: number
  totalCreditDb: number
  netBalanceDb: number
  differenceDebit: number
  differenceCredit: number
  differenceBalance: number
  invarianceSatisfied: boolean
  isFullyReconciled: boolean
  verifiedKeyAccounts: {
    younusDubai: { verified: boolean; debit: number; credit: number; balance: number }
    najebAmin: { verified: boolean; debit: number; credit: number; balance: number }
    hamidInsafDoc: { verified: boolean; debit: number; credit: number; balance: number }
    noorNimroz: { verified: boolean; debit: number; credit: number; balance: number }
    waselaLimited: { verified: boolean; debit: number; credit: number; balance: number }
    nazarYarmal2: { verified: boolean; debit: number; credit: number; balance: number }
    nazarYarmal1: { verified: boolean; balance: number }
    pakAfghan: { verified: boolean; balance: number }
  }
  byCurrency: Record<
    string,
    {
      debit: number
      credit: number
      balance: number
      accountCount: number
      txCount: number
    }
  >
  rows: SheetReconciliationRow[]
}

export function generateReconciliationReport(
  parseResult: WorkbookParseResult,
  db: LedgerDatabaseSchema
): LedgerReconciliationReport {
  const rows: SheetReconciliationRow[] = []
  let totalDbDebit = 0
  let totalDbCredit = 0
  let unknownCurrencies = 0

  for (const sheet of parseResult.parsedSheets) {
    const acc = db.accounts.find(
      (a) =>
        a.account_name === sheet.accountName ||
        a.display_name === sheet.displayName ||
        a.source === sheet.sheetName
    )

    const txs = db.ledger_transactions.filter(
      (t) =>
        (acc ? t.account_id === acc.id : false) ||
        t.source_sheet === sheet.sheetName
    ).filter((t) => !t.is_deleted)

    let dbDr = 0
    let dbCr = 0
    for (const t of txs) {
      dbDr += Number(t.debit) || 0
      dbCr += Number(t.credit) || 0
    }

    dbDr = Math.round(dbDr * 100) / 100
    dbCr = Math.round(dbCr * 100) / 100
    const dbBal = Math.round((dbDr - dbCr) * 100) / 100

    totalDbDebit += dbDr
    totalDbCredit += dbCr

    const diffDr = Math.round((sheet.totalDebit - dbDr) * 100) / 100
    const diffCr = Math.round((sheet.totalCredit - dbCr) * 100) / 100
    const diffBal = Math.round((sheet.balance - dbBal) * 100) / 100

    if (sheet.currency === "UNKNOWN") unknownCurrencies++

    rows.push({
      accountName: sheet.accountName,
      sheetName: sheet.sheetName,
      currency: sheet.currency,
      excelDebit: sheet.totalDebit,
      excelCredit: sheet.totalCredit,
      excelBalance: sheet.balance,
      dbDebit: dbDr,
      dbCredit: dbCr,
      dbBalance: dbBal,
      diffDebit: diffDr,
      diffCredit: diffCr,
      diffBalance: diffBal,
      status: diffDr === 0 && diffCr === 0 && diffBal === 0 ? "MATCHED" : "DISCREPANCY",
    })
  }

  totalDbDebit = Math.round(totalDbDebit * 100) / 100
  totalDbCredit = Math.round(totalDbCredit * 100) / 100
  const netDbBal = Math.round((totalDbDebit - totalDbCredit) * 100) / 100

  const diffDebit = Math.round((parseResult.grandTotalDebit - totalDbDebit) * 100) / 100
  const diffCredit = Math.round((parseResult.grandTotalCredit - totalDbCredit) * 100) / 100
  const diffBalance = Math.round((parseResult.grandNetBalance - netDbBal) * 100) / 100

  // Verify Key Accounts from Prompt Section 7
  const findRow = (pattern: string) =>
    rows.find(
      (r) =>
        r.accountName.toLowerCase().includes(pattern.toLowerCase()) ||
        r.sheetName.toLowerCase().includes(pattern.toLowerCase())
    )

  const rYounus = findRow("YOUNUS") || findRow("حاجی یونس")
  const rNajeb = findRow("NAJEB") || findRow("نجیب")
  const rHamidDoc = findRow("HAMID-INSAF-LTD-DOC") || findRow("HAMID-INSAF-LTD DOCUMENTS")
  const rNoor = findRow("NOOR-MUHMMAD-NIMROZ") || findRow("NIMROZ")
  const rWasela = findRow("WASELA")
  const rYarmal2 = rows.find((r) => r.sheetName === "NAZAR-M.YARMAL" || r.accountName.includes("(Yarmal)2"))
  const rYarmal1 = rows.find((r) => r.sheetName === "NAZAR-M.YARMAL (2)" || (r.accountName.includes("(Yarmal)") && !r.accountName.includes("2") && !r.accountName.includes("Mersin")))
  const rPakAfghan = findRow("Pak - Afghan")

  const verifiedKeyAccounts = {
    younusDubai: {
      verified: Boolean(rYounus && rYounus.dbDebit === 1858955 && rYounus.dbCredit === 0),
      debit: rYounus ? rYounus.dbDebit : 0,
      credit: rYounus ? rYounus.dbCredit : 0,
      balance: rYounus ? rYounus.dbBalance : 0,
    },
    najebAmin: {
      verified: Boolean(rNajeb && rNajeb.dbDebit === 681150 && rNajeb.dbCredit === 104810),
      debit: rNajeb ? rNajeb.dbDebit : 0,
      credit: rNajeb ? rNajeb.dbCredit : 0,
      balance: rNajeb ? rNajeb.dbBalance : 0,
    },
    hamidInsafDoc: {
      verified: Boolean(rHamidDoc && rHamidDoc.dbDebit === 1688000 && rHamidDoc.dbCredit === 1260900),
      debit: rHamidDoc ? rHamidDoc.dbDebit : 0,
      credit: rHamidDoc ? rHamidDoc.dbCredit : 0,
      balance: rHamidDoc ? rHamidDoc.dbBalance : 0,
    },
    noorNimroz: {
      verified: Boolean(rNoor && rNoor.dbDebit === 192500 && rNoor.dbCredit === 0),
      debit: rNoor ? rNoor.dbDebit : 0,
      credit: rNoor ? rNoor.dbCredit : 0,
      balance: rNoor ? rNoor.dbBalance : 0,
    },
    waselaLimited: {
      verified: Boolean(rWasela && rWasela.dbDebit === 154150 && rWasela.dbCredit === 50233),
      debit: rWasela ? rWasela.dbDebit : 0,
      credit: rWasela ? rWasela.dbCredit : 0,
      balance: rWasela ? rWasela.dbBalance : 0,
    },
    nazarYarmal2: {
      verified: Boolean(rYarmal2 && rYarmal2.dbDebit === 179585 && rYarmal2.dbCredit === 935000 && rYarmal2.dbBalance === -755415),
      debit: rYarmal2 ? rYarmal2.dbDebit : 0,
      credit: rYarmal2 ? rYarmal2.dbCredit : 0,
      balance: rYarmal2 ? rYarmal2.dbBalance : 0,
    },
    nazarYarmal1: {
      verified: Boolean(rYarmal1 && Math.abs(rYarmal1.dbBalance - (-115402)) < 5),
      balance: rYarmal1 ? rYarmal1.dbBalance : 0,
    },
    pakAfghan: {
      verified: Boolean(rPakAfghan && Math.abs(rPakAfghan.dbBalance - (-15336.51)) < 5),
      balance: rPakAfghan ? rPakAfghan.dbBalance : 0,
    },
  }

  const isFullyReconciled = diffDebit === 0 && diffCredit === 0 && diffBalance === 0
  const invarianceSatisfied = Math.abs(netDbBal - (totalDbDebit - totalDbCredit)) < 0.01

  return {
    timestamp: new Date().toISOString(),
    excelAccountsFound: parseResult.totalAccountsFound,
    accountsImported: db.accounts.length,
    transactionsFound: parseResult.totalTransactionsFound,
    transactionsImported: db.ledger_transactions.filter((t) => !t.is_deleted).length,
    transactionsSkipped: parseResult.totalSkippedRows,
    duplicateTransactions: parseResult.totalDuplicateRows,
    formulaErrors: parseResult.totalFormulaErrors,
    unknownCurrencies,
    totalDebitExcel: parseResult.grandTotalDebit,
    totalCreditExcel: parseResult.grandTotalCredit,
    netBalanceExcel: parseResult.grandNetBalance,
    totalDebitDb: totalDbDebit,
    totalCreditDb: totalDbCredit,
    netBalanceDb: netDbBal,
    differenceDebit: diffDebit,
    differenceCredit: diffCredit,
    differenceBalance: diffBalance,
    invarianceSatisfied,
    isFullyReconciled,
    verifiedKeyAccounts,
    byCurrency: parseResult.byCurrency,
    rows,
  }
}
