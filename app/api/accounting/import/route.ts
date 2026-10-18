import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"
import {
  getLedgerSystemDb,
  saveLedgerSystemDb,
  createDatabaseBackup,
  syncToLegacyStorage,
} from "@/lib/services/ledger-db-service"
import { parseAllCompaniesWorkbook } from "@/lib/services/excel-ledger-importer"
import { generateReconciliationReport } from "@/lib/services/ledger-reconciliation"

export async function GET() {
  try {
    const p1 = "C:\\Users\\Ahsanullah Qureshi\\Desktop\\ALL-COMPANIES.xlsx"
    const p2 = path.join(process.cwd(), "data", "uploads", "ALL-COMPANIES.xlsx")
    const p3 = path.join(process.cwd(), "public", "uploads", "ALL-COMPANIES.xlsx")

    let excelPath = ""
    if (fs.existsSync(p1)) excelPath = p1
    else if (fs.existsSync(p2)) excelPath = p2
    else if (fs.existsSync(p3)) excelPath = p3

    if (!excelPath) {
      return NextResponse.json({ success: false, error: "ALL-COMPANIES.xlsx workbook not found" }, { status: 404 })
    }

    const workbook = XLSX.readFile(excelPath, { cellFormula: true, cellDates: true, cellNF: true })
    const parsed = parseAllCompaniesWorkbook(workbook, path.basename(excelPath))

    return NextResponse.json({
      success: true,
      preview: {
        filename: parsed.filename,
        totalAccountsFound: parsed.totalAccountsFound,
        totalTransactionsFound: parsed.totalTransactionsFound,
        totalSkippedRows: parsed.totalSkippedRows,
        totalFormulaErrors: parsed.totalFormulaErrors,
        grandTotalDebit: parsed.grandTotalDebit,
        grandTotalCredit: parsed.grandTotalCredit,
        grandNetBalance: parsed.grandNetBalance,
        byCurrency: parsed.byCurrency,
        sheets: parsed.parsedSheets.map((s) => ({
          sheetName: s.sheetName,
          accountName: s.accountName,
          currency: s.currency,
          accountType: s.accountType,
          transactionCount: s.transactions.length,
          totalDebit: s.totalDebit,
          totalCredit: s.totalCredit,
          balance: s.balance,
        })),
      },
    })
  } catch (error: any) {
    console.error("[api/accounting/import GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const p1 = "C:\\Users\\Ahsanullah Qureshi\\Desktop\\ALL-COMPANIES.xlsx"
    const p2 = path.join(process.cwd(), "data", "uploads", "ALL-COMPANIES.xlsx")
    const p3 = path.join(process.cwd(), "public", "uploads", "ALL-COMPANIES.xlsx")

    let excelPath = ""
    if (fs.existsSync(p1)) excelPath = p1
    else if (fs.existsSync(p2)) excelPath = p2
    else if (fs.existsSync(p3)) excelPath = p3

    if (!excelPath) {
      return NextResponse.json({ success: false, error: "ALL-COMPANIES.xlsx workbook not found" }, { status: 404 })
    }

    // 1. Create Pre-Import Backup
    const preBackupFile = await createDatabaseBackup("backup-before-ledger-import")

    // 2. Parse workbook
    const workbook = XLSX.readFile(excelPath, { cellFormula: true, cellDates: true, cellNF: true })
    const parsed = parseAllCompaniesWorkbook(workbook, path.basename(excelPath))

    // 3. Prepare database records
    const db = await getLedgerSystemDb()
    const existingFingerprints = new Set(db.ledger_transactions.map((t) => t.fingerprint).filter(Boolean))

    let newAccountsCount = 0
    let newTransactionsCount = 0
    let duplicateTransactionsCount = 0

    for (const sheet of parsed.parsedSheets) {
      let acc = db.accounts.find(
        (a) =>
          a.account_name.toLowerCase() === sheet.accountName.toLowerCase() ||
          a.source === sheet.sheetName
      )

      if (!acc) {
        acc = {
          id: `ACC-${sheet.transactions[0]?.account_id || sheet.accountName.replace(/[^a-zA-Z0-9]/g, "")}`,
          account_code: `AC-${String(db.accounts.length + 1).padStart(6, "0")}`,
          account_name: sheet.accountName,
          display_name: sheet.displayName,
          normalized_name: sheet.accountName.toUpperCase().replace(/[\s\-_]+/g, " "),
          aliases: [sheet.sheetName],
          account_type: sheet.accountType,
          currency: sheet.currency,
          opening_balance: sheet.openingBalance,
          total_debit: sheet.totalDebit,
          total_credit: sheet.totalCredit,
          current_balance: sheet.balance,
          status: "active",
          source: sheet.sheetName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        db.accounts.push(acc)
        newAccountsCount++
      }

      for (const tx of sheet.transactions) {
        if (tx.fingerprint && existingFingerprints.has(tx.fingerprint)) {
          duplicateTransactionsCount++
          continue
        }
        if (tx.fingerprint) existingFingerprints.add(tx.fingerprint)
        tx.account_id = acc.id
        db.ledger_transactions.push(tx)
        newTransactionsCount++
      }
    }

    // Record Batch
    db.import_batches.push({
      id: parsed.batchId,
      filename: parsed.filename,
      import_date: new Date().toISOString(),
      imported_accounts: newAccountsCount,
      imported_transactions: newTransactionsCount,
      skipped_rows: parsed.totalSkippedRows,
      duplicate_rows: duplicateTransactionsCount,
      formula_errors: parsed.totalFormulaErrors,
      warnings: parsed.warnings,
      status: "completed",
    })

    // 4. Save Database atomically
    await saveLedgerSystemDb(db)

    // 5. Post-Import Backup
    const postBackupFile = await createDatabaseBackup("backup-after-ledger-import")

    // 6. Sync to Legacy Storage
    await syncToLegacyStorage(db)

    // 7. Generate Reconciliation Report
    const reconciliation = generateReconciliationReport(parsed, db)

    return NextResponse.json({
      success: true,
      message: "Import executed successfully!",
      preBackupFile,
      postBackupFile,
      importedAccounts: newAccountsCount,
      importedTransactions: newTransactionsCount,
      duplicatesSkipped: duplicateTransactionsCount,
      reconciliation,
    })
  } catch (error: any) {
    console.error("[api/accounting/import POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
