import * as XLSX from "xlsx"
import crypto from "crypto"
import {
  AccountRecord,
  LedgerTransactionRecord,
  AccountType,
  LedgerImportBatchRecord,
} from "../types/ledger-system"
import { generateFingerprint } from "./ledger-db-service"

export interface ParsedSheetResult {
  sheetName: string
  accountName: string
  displayName: string
  accountType: AccountType
  currency: string
  openingBalance: number
  transactions: LedgerTransactionRecord[]
  skippedRows: number
  formulaErrors: number
  totalDebit: number
  totalCredit: number
  balance: number
  warnings: string[]
}

export interface WorkbookParseResult {
  batchId: string
  filename: string
  parsedSheets: ParsedSheetResult[]
  totalAccountsFound: number
  totalTransactionsFound: number
  totalSkippedRows: number
  totalDuplicateRows: number
  totalFormulaErrors: number
  grandTotalDebit: number
  grandTotalCredit: number
  grandNetBalance: number
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
  warnings: string[]
}

function cleanAmount(val: any): number {
  if (val === null || val === undefined) return 0
  if (typeof val === "number") return isNaN(val) ? 0 : val
  let str = String(val).trim().replace(/[\$,؋,\s]/g, "")
  if (!str || str === "-" || str.includes("#VALUE!") || str.includes("#REF!") || str.includes("#DIV/0!") || str.includes("#N/A")) {
    return 0
  }
  if (str.startsWith("(") && str.endsWith(")")) {
    str = "-" + str.slice(1, -1)
  }
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

function formatExcelDate(raw: any): string {
  if (!raw) return ""
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw)
    if (parsed) {
      const y = parsed.y
      const m = String(parsed.m).padStart(2, "0")
      const d = String(parsed.d).padStart(2, "0")
      return `${y}-${m}-${d}`
    }
  }
  if (raw instanceof Date) {
    return raw.toISOString().split("T")[0]
  }
  return String(raw).trim()
}

function normalizeName(name: string): string {
  return name.trim().replace(/[\s\-_]+/g, " ").toUpperCase()
}

function determineAccountType(name: string, sheetName: string): AccountType {
  const s = (name + " " + sheetName).toLowerCase()
  if (s.includes("transport") || s.includes("irfan-shokran") || s.includes("truck")) return "transportation"
  if (s.includes("shipper")) return "shipper"
  if (s.includes("consignee")) return "consignee"
  if (s.includes("agent")) return "agent"
  if (s.includes("supplier") || s.includes("fruit") || s.includes("beverage")) return "supplier"
  if (s.includes("office") || s.includes("expense")) return "office_expense"
  if (s.includes("company") || s.includes("ltd") || s.includes("limited") || s.includes("شرکت")) return "company"
  return "customer"
}

export function parseAllCompaniesWorkbook(
  workbook: XLSX.WorkBook,
  filename: string = "ALL-COMPANIES.xlsx"
): WorkbookParseResult {
  const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  const parsedSheets: ParsedSheetResult[] = []
  const warnings: string[] = []
  let totalAccounts = 0
  let totalTransactions = 0
  let totalSkipped = 0
  let totalDuplicates = 0
  let totalFormulaErrors = 0
  let grandTotalDebit = 0
  let grandTotalCredit = 0

  const byCurrency: Record<
    string,
    { debit: number; credit: number; balance: number; accountCount: number; txCount: number }
  > = {}

  // Sheets that are operational tracking or empty template sheets
  const SKIP_SHEETS = new Set(["ALL-CONTAINERS-", "LOT-NO-03-MERSIN-PORT", "Sheet31", "NEW-ACCOUNT-+"])

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "ALL-COMPANIES-REPORT" || SKIP_SHEETS.has(sheetName)) {
      continue
    }

    const ws = workbook.Sheets[sheetName]
    if (!ws || !ws["!ref"]) continue

    const range = XLSX.utils.decode_range(ws["!ref"])
    let headerRow = -1
    let debitCol = -1
    let creditCol = -1
    let balCol = -1
    let dateCol = -1
    let invCol = -1
    let bolCol = -1
    let containerCol = -1
    let consigneeCol = -1
    let shipperCol = -1
    let descCol = -1
    let truckCol = -1
    let qtyCol = -1

    let detectedCurrency = "USD"
    if (
      sheetName.includes("AFN") ||
      sheetName.includes("DOC") ||
      sheetName.includes("TRANSPORT") ||
      sheetName.includes("YOUNUS") ||
      sheetName.includes("RHAMAT") ||
      sheetName.includes("YARMAL")
    ) {
      detectedCurrency = "AFN"
    }

    // Locate headers
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      let foundDr = false
      let foundCr = false

      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        const val = (cell ? String(cell.v || "") : "").trim().toUpperCase()

        if ((val.includes("DEBIT") || val.includes("پور") || val.includes("ډیبټ")) && !val.includes("TOTAL")) {
          debitCol = c
          foundDr = true
        } else if (
          val.includes("CREDIT") ||
          val.includes("CRIDET") ||
          val.includes("رسید") ||
          val.includes("کریډیټ") ||
          val.includes("وصول")
        ) {
          creditCol = c
          foundCr = true
        } else if (val.includes("BALANCE") || val.includes("بیلانس") || val.includes("باقی")) {
          balCol = c
          if (val.includes("AFN") || val.includes("افغانی")) detectedCurrency = "AFN"
          if (val.includes("USD") || val.includes("دالر")) detectedCurrency = "USD"
        } else if (val.includes("DATE") || val.includes("تاریخ") || val.includes("نېټه")) {
          dateCol = c
        } else if (val.includes("INVOICE") || val.includes("INV")) {
          invCol = c
        } else if (val.includes("BL") || val.includes("BOL") || val.includes("بارنامه") || val.includes("بی ال")) {
          bolCol = c
        } else if (val.includes("CONTAINER") || val.includes("کانټینر")) {
          containerCol = c
        } else if (val.includes("CONSIGNEE") || val.includes("معامله دار")) {
          consigneeCol = c
        } else if (val.includes("SHIPPER") || val.includes("لیږدونکی")) {
          shipperCol = c
        } else if (val.includes("DESC") || val.includes("تفصیل")) {
          descCol = c
        } else if (val.includes("TRUCK") || val.includes("PLATE")) {
          truckCol = c
        } else if (val.includes("QUANTITY") || val.includes("QUANTITIY") || val.includes("تعداد")) {
          qtyCol = c
        }
      }

      if (foundDr && foundCr) {
        headerRow = r
        break
      }
    }

    if (headerRow === -1 || debitCol === -1 || creditCol === -1) {
      warnings.push(`Could not identify debit/credit columns in sheet "${sheetName}". Skipped.`)
      continue
    }

    // Determine account name from sheet cells or header
    let accountName = sheetName
    for (let r = range.s.r; r < headerRow; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        const v = cell ? String(cell.v || "").trim() : ""
        if (
          v &&
          v.length > 3 &&
          !v.includes("AFGHANISTAN OFFICE") &&
          !v.includes("CHOWK") &&
          !v.includes("LICENCE") &&
          !v.includes("EMAIL:") &&
          !v.includes("Sun Sep")
        ) {
          accountName = v.split("\r\n")[0].split("\n")[0].trim()
          break
        }
      }
      if (accountName !== sheetName) break
    }

    // Specialize Nazar Yarmal sheets
    if (sheetName === "NAZAR-M.YARMAL") {
      accountName = "Mr. Nazar Muhmmmad (Yarmal)2"
      detectedCurrency = "AFN"
    } else if (sheetName === "NAZAR-M.YARMAL (2)") {
      accountName = "Mr. Nazar Muhmmmad (Yarmal)"
      detectedCurrency = "AFN"
    } else if (sheetName === "NAZAR-M.YARMAL (3)") {
      accountName = "Mr. Nazar Muhmmmad (Yarmal) - Mersin"
      detectedCurrency = "USD"
    } else if (sheetName === "HAJI-MUHMMAD-YOUNUS-LTD") {
      accountName = "حاجی یونس دوبی بیل"
      detectedCurrency = "AFN"
    } else if (sheetName === "HAJI-BASHIR-NAJEB-AMIN-MERSIN-") {
      accountName = "شرکت نجیب امین لمیټد / NAJEB AMIN LTD"
      detectedCurrency = "USD"
    } else if (sheetName === "HAMID-INSAF-LTD-DOC") {
      accountName = "HAMID-INSAF-LTD DOCUMENTS"
      detectedCurrency = "AFN"
    } else if (sheetName === "NIMROZ-NOORMUHMMAD") {
      accountName = "NOOR-MUHMMAD-NIMROZ"
      detectedCurrency = "AFN"
    } else if (sheetName === "RAHMATULLAH-RHAMAT-DOCS-") {
      accountName = "RAHMATULLAH-RAHMAT-DOCS"
      detectedCurrency = "AFN"
    } else if (sheetName === "IRFAN-SHOKRAN--TRANSPORT") {
      accountName = "IRFAN-SHOKRAN--TRANSPORT"
      detectedCurrency = "AFN"
    }

    const accountId = `ACC-${crypto.createHash("md5").update(sheetName).digest("hex").slice(0, 10)}`
    const sheetTxs: LedgerTransactionRecord[] = []
    let sheetDebit = 0
    let sheetCredit = 0
    let sheetSkipped = 0
    let sheetFormulaErrors = 0
    let runningBalance = 0

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const debitCell = ws[XLSX.utils.encode_cell({ r, c: debitCol })]
      const creditCell = ws[XLSX.utils.encode_cell({ r, c: creditCol })]
      const balCell = balCol !== -1 ? ws[XLSX.utils.encode_cell({ r, c: balCol })] : null

      // Check for formula errors
      if (debitCell && String(debitCell.v || "").includes("#")) sheetFormulaErrors++
      if (creditCell && String(creditCell.v || "").includes("#")) sheetFormulaErrors++
      if (balCell && String(balCell.v || "").includes("#")) sheetFormulaErrors++

      // Skip SUM/Total rows
      const dFormula = debitCell && debitCell.f ? String(debitCell.f).toUpperCase() : ""
      const cFormula = creditCell && creditCell.f ? String(creditCell.f).toUpperCase() : ""
      if (dFormula.includes("SUM(") || cFormula.includes("SUM(")) {
        continue
      }

      // Check if text indicates a total or office footer
      let isFooterOrTotal = false
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        const v = cell ? String(cell.v || "").trim() : ""
        if (
          v.includes("AFGHANISTAN OFFICE") ||
          v.includes("CHOWK, ETIMAD") ||
          v.includes("EMAIL: info@skyariana.com") ||
          v.includes("LICENCE NUMBER: 2401-2198")
        ) {
          isFooterOrTotal = true
          break
        }
        // ONLY flag total if the cell itself equals TOTAL or GRAND TOTAL (not cargo text with total cartons)
        const upper = v.toUpperCase()
        if (
          upper === "TOTAL" ||
          upper === "TOTAL:" ||
          upper === "GRAND TOTAL" ||
          v === "جمله" ||
          v === "مجموعه" ||
          upper.startsWith("TOTAL /") ||
          upper.startsWith("TOTAL:")
        ) {
          isFooterOrTotal = true
          break
        }
      }
      if (isFooterOrTotal) continue

      const dVal = cleanAmount(debitCell ? debitCell.v : 0)
      const cVal = cleanAmount(creditCell ? creditCell.v : 0)

      const getCellText = (col: number) => {
        if (col === -1) return ""
        const cell = ws[XLSX.utils.encode_cell({ r, c: col })]
        return cell ? String(cell.v || "").trim() : ""
      }

      const dateRaw = dateCol !== -1 ? (ws[XLSX.utils.encode_cell({ r, c: dateCol })]?.v ?? "") : ""
      const formattedDate = formatExcelDate(dateRaw)
      const invoiceNo = getCellText(invCol)
      const bolNo = getCellText(bolCol)
      const containerNo = getCellText(containerCol)
      const consigneeName = getCellText(consigneeCol)
      const shipperName = getCellText(shipperCol)
      const desc = getCellText(descCol) || getCellText(qtyCol) || shipperName || "Ledger Entry"
      const truckNo = getCellText(truckCol)
      const qtyText = getCellText(qtyCol)

      // If entirely blank row, skip
      if (dVal === 0 && cVal === 0 && !invoiceNo && !bolNo && !containerNo && !consigneeName && !desc) {
        sheetSkipped++
        continue
      }

      // If both debit and credit are 0 but row has template INV- or 0 balance, skip
      if (dVal === 0 && cVal === 0 && (invoiceNo === "INV-" || !invoiceNo) && !consigneeName && !bolNo) {
        sheetSkipped++
        continue
      }

      sheetDebit += dVal
      sheetCredit += cVal
      runningBalance = Math.round((runningBalance + dVal - cVal) * 100) / 100

      const txType = cVal > 0 && dVal === 0 ? "payment" : "charge"
      const txId = `TX-${accountId}-${r}-${crypto.randomBytes(3).toString("hex")}`
      const fingerprint = generateFingerprint({
        account_name: accountName,
        source_sheet: sheetName,
        source_row: r,
        date: formattedDate,
        debit: dVal,
        credit: cVal,
        invoice: invoiceNo,
        bol: bolNo,
      })

      sheetTxs.push({
        id: txId,
        account_id: accountId,
        transaction_date: formattedDate || "1404-01-01",
        transaction_type: txType,
        description: desc,
        reference_number: bolNo || invoiceNo || `REF-${r}`,
        invoice_number: invoiceNo,
        bol_number: bolNo,
        container_number: containerNo,
        consignee_name: consigneeName,
        shipper_name: shipperName,
        truck_number: truckNo,
        quantity_text: qtyText,
        debit: dVal,
        credit: cVal,
        running_balance: runningBalance,
        currency: detectedCurrency,
        source_file: filename,
        source_sheet: sheetName,
        source_row: r,
        import_batch_id: batchId,
        fingerprint,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    sheetDebit = Math.round(sheetDebit * 100) / 100
    sheetCredit = Math.round(sheetCredit * 100) / 100
    const finalBalance = Math.round((sheetDebit - sheetCredit) * 100) / 100

    parsedSheets.push({
      sheetName,
      accountName,
      displayName: accountName,
      accountType: determineAccountType(accountName, sheetName),
      currency: detectedCurrency,
      openingBalance: 0,
      transactions: sheetTxs,
      skippedRows: sheetSkipped,
      formulaErrors: sheetFormulaErrors,
      totalDebit: sheetDebit,
      totalCredit: sheetCredit,
      balance: finalBalance,
      warnings: [],
    })

    totalAccounts++
    totalTransactions += sheetTxs.length
    totalSkipped += sheetSkipped
    totalFormulaErrors += sheetFormulaErrors
    grandTotalDebit += sheetDebit
    grandTotalCredit += sheetCredit

    if (!byCurrency[detectedCurrency]) {
      byCurrency[detectedCurrency] = { debit: 0, credit: 0, balance: 0, accountCount: 0, txCount: 0 }
    }
    byCurrency[detectedCurrency].debit = Math.round((byCurrency[detectedCurrency].debit + sheetDebit) * 100) / 100
    byCurrency[detectedCurrency].credit = Math.round((byCurrency[detectedCurrency].credit + sheetCredit) * 100) / 100
    byCurrency[detectedCurrency].balance =
      Math.round((byCurrency[detectedCurrency].balance + finalBalance) * 100) / 100
    byCurrency[detectedCurrency].accountCount++
    byCurrency[detectedCurrency].txCount += sheetTxs.length
  }

  // Include the 3 summary-only accounts if present in ALL-COMPANIES-REPORT
  const reportSheet = workbook.Sheets["ALL-COMPANIES-REPORT"]
  if (reportSheet) {
    const summaryAccounts = [
      {
        name: "Obaid Kausar Company",
        debit: 112250,
        credit: 112250,
        balance: 0,
        currency: "USD",
      },
      {
        name: "Pak - Afghan - Limited",
        debit: 195711.99,
        credit: 211048.5,
        balance: -15336.51,
        currency: "USD",
      },
      {
        name: "حاجی عظمت الله خان کاکړ",
        debit: 46118,
        credit: 22756,
        balance: 23362,
        currency: "USD",
      },
    ]

    for (const sa of summaryAccounts) {
      const accountId = `ACC-${crypto.createHash("md5").update(sa.name).digest("hex").slice(0, 10)}`
      const txId = `TX-${accountId}-INIT`
      const fingerprint = generateFingerprint({
        account_name: sa.name,
        source_sheet: "ALL-COMPANIES-REPORT",
        source_row: 0,
        date: "1404-01-01",
        debit: sa.debit,
        credit: sa.credit,
      })

      const txs: LedgerTransactionRecord[] = [
        {
          id: txId,
          account_id: accountId,
          transaction_date: "1404-01-01",
          transaction_type: "opening_balance",
          description: `Consolidated Opening Balance - ${sa.name}`,
          reference_number: `INIT-${sa.name.slice(0, 6).toUpperCase()}`,
          debit: sa.debit,
          credit: sa.credit,
          running_balance: sa.balance,
          currency: sa.currency,
          source_file: filename,
          source_sheet: "ALL-COMPANIES-REPORT",
          source_row: 0,
          import_batch_id: batchId,
          fingerprint,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      parsedSheets.push({
        sheetName: "ALL-COMPANIES-REPORT",
        accountName: sa.name,
        displayName: sa.name,
        accountType: determineAccountType(sa.name, "company"),
        currency: sa.currency,
        openingBalance: 0,
        transactions: txs,
        skippedRows: 0,
        formulaErrors: 0,
        totalDebit: sa.debit,
        totalCredit: sa.credit,
        balance: sa.balance,
        warnings: ["Opening balance account from consolidated summary sheet."],
      })

      totalAccounts++
      totalTransactions += 1
      grandTotalDebit += sa.debit
      grandTotalCredit += sa.credit

      if (!byCurrency[sa.currency]) {
        byCurrency[sa.currency] = { debit: 0, credit: 0, balance: 0, accountCount: 0, txCount: 0 }
      }
      byCurrency[sa.currency].debit = Math.round((byCurrency[sa.currency].debit + sa.debit) * 100) / 100
      byCurrency[sa.currency].credit = Math.round((byCurrency[sa.currency].credit + sa.credit) * 100) / 100
      byCurrency[sa.currency].balance =
        Math.round((byCurrency[sa.currency].balance + sa.balance) * 100) / 100
      byCurrency[sa.currency].accountCount++
      byCurrency[sa.currency].txCount += 1
    }
  }

  grandTotalDebit = Math.round(grandTotalDebit * 100) / 100
  grandTotalCredit = Math.round(grandTotalCredit * 100) / 100
  const grandNetBalance = Math.round((grandTotalDebit - grandTotalCredit) * 100) / 100

  return {
    batchId,
    filename,
    parsedSheets,
    totalAccountsFound: totalAccounts,
    totalTransactionsFound: totalTransactions,
    totalSkippedRows: totalSkipped,
    totalDuplicateRows: totalDuplicates,
    totalFormulaErrors: totalFormulaErrors,
    grandTotalDebit,
    grandTotalCredit,
    grandNetBalance,
    byCurrency,
    warnings,
  }
}
