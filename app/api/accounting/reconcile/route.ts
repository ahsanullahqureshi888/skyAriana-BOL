import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
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
      return NextResponse.json({ success: false, error: "ALL-COMPANIES.xlsx workbook not found on server" }, { status: 404 })
    }

    const workbook = XLSX.readFile(excelPath, { cellFormula: true, cellDates: true, cellNF: true })
    const parsed = parseAllCompaniesWorkbook(workbook, path.basename(excelPath))
    const db = await getLedgerSystemDb()

    const report = generateReconciliationReport(parsed, db)

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error: any) {
    console.error("[api/accounting/reconcile GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
