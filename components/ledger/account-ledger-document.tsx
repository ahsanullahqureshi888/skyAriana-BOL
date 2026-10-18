"use client"

import React, { memo } from "react"
import { LedgerEntry } from "@/lib/types"

export interface LedgerCompanySettings {
  logoUrl?: string
  companyLogo?: string
  backgroundImage?: string
  companyName?: string
  companySubtitle?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLicence?: string
}

export interface AccountLedgerDocumentProps {
  accountName: string
  entries: LedgerEntry[]
  statementDate?: string
  dateRange?: { start?: string; end?: string }
  filterLabel?: string
  isFiltered?: boolean
  currency?: string
  companySettings?: LedgerCompanySettings
  mode?: "print" | "preview"
  orientation?: "landscape" | "portrait"
  dense?: boolean
  className?: string
}

/**
 * Builds a clean, Windows-safe filename for the exported Account Ledger PDF.
 * Example: RAHMAT_NAZAR_LTD_ACCOUNT_LEDGER_2026-10-03.pdf
 * NEVER includes BOL number in the ledger filename.
 */
export function buildLedgerPdfFileName(
  accountName: string,
  dateRange?: { start?: string; end?: string },
  isFiltered?: boolean
): string {
  const cleanAccount = (accountName || "ACCOUNT")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase()

  const today = new Date().toISOString().split("T")[0]

  if (dateRange?.start && dateRange?.end) {
    const s = dateRange.start.slice(0, 10)
    const e = dateRange.end.slice(0, 10)
    return `${cleanAccount}_LEDGER_${s}_TO_${e}.pdf`
  }

  const suffix = isFiltered ? "_FILTERED" : ""
  return `${cleanAccount}_ACCOUNT_LEDGER_${today}${suffix}.pdf`
}

/**
 * Calculates canonical totals for any subset of ledger entries.
 * Strictly separates USD balances from AFN driver rent.
 * Invariance: Net Balance = Total Debit - Total Credit
 */
export function calculateLedgerTotals(entries: LedgerEntry[]) {
  let totalDebit = 0
  let totalCredit = 0
  let totalDriverRentAFN = 0

  for (const entry of entries) {
    totalDebit += Number(entry.debit) || 0
    totalCredit += Number(entry.credit) || 0

    const rentStr = String(entry.driverFreight || "")
    if (rentStr.toUpperCase().includes("AFN")) {
      const match = rentStr.replace(/,/g, "").match(/\d+/)
      if (match) {
        totalDriverRentAFN += parseInt(match[0], 10) || 0
      }
    }
  }

  const closingBalance = totalDebit - totalCredit

  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance: Math.round(closingBalance * 100) / 100,
    totalDriverRentAFN: Math.round(totalDriverRentAFN),
    entryCount: entries.length,
  }
}

const MONEY_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formats a financial amount with 2 decimal places and standard comma separation.
 * Uses cached module-level formatter per Vercel Best Practice js-cache-function-results.
 */
function formatMoney(amount: number): string {
  return MONEY_FORMATTER.format(amount)
}

/**
 * 1. Document Header: Company branding, office details, and prominent account name.
 */
export const AccountLedgerHeader = memo(function AccountLedgerHeader({
  accountName,
  statementDate,
  companySettings,
}: {
  accountName: string
  statementDate: string
  companySettings?: LedgerCompanySettings
}) {
  const logo = companySettings?.logoUrl || companySettings?.companyLogo || "/logo.png"
  const address = companySettings?.companyAddress || "2nd Floor, 16 No. Office, Shahidano Chowk, Etimad Rahmi Market, Kandahar, Afghanistan"
  const phone = companySettings?.companyPhone || "+93 700 939 365, +93 711 435 529"
  const email = companySettings?.companyEmail || "info@skyariana.com"
  const licence = companySettings?.companyLicence || "2401-2198"

  return (
    <div
      className="ledger-statement-header print-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 16px 8px 16px",
        borderBottom: "1.5px solid #93c5fd",
        background: "linear-gradient(to right, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.9), rgba(239, 246, 255, 0.95))",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Left: Account & Document Identification */}
      <div style={{ flex: "1 1 33%", textAlign: "left", minWidth: 0 }}>
        <p style={{ fontSize: "8pt", color: "#1d4ed8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px 0" }}>
          OFFICIAL ACCOUNT LEDGER
        </p>
        <h1
          style={{
            fontSize: "14pt",
            fontWeight: 900,
            color: "#0f172a",
            margin: "0 0 2px 0",
            lineHeight: 1.15,
            wordBreak: "break-word",
            letterSpacing: "-0.02em",
          }}
        >
          {accountName}
        </h1>
        <p style={{ fontSize: "7.5pt", color: "#2563eb", fontWeight: 700, margin: "0 0 4px 0" }}>
          Account Holder / Shipper • صورت حساب شرکت
        </p>
        <p style={{ fontSize: "7pt", color: "#64748b", margin: 0, fontWeight: 600 }}>
          Statement Date: <span style={{ color: "#0f172a", fontWeight: 700 }}>{statementDate}</span>
        </p>
      </div>

      {/* Center: Company Logo & Brand */}
      <div style={{ flex: "1 1 34%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt="SKY ARIANA Logo"
          style={{ height: "42px", maxWidth: "150px", objectFit: "contain", marginBottom: "2px", display: "inline-block" }}
        />
        <p style={{ fontSize: "13pt", fontWeight: 900, color: "#1e3a8a", margin: 0, lineHeight: 1.1, letterSpacing: "0.02em" }}>
          SKY ARIANA
        </p>
        <p style={{ fontSize: "7pt", color: "#2563eb", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800, margin: "1px 0 0 0" }}>
          Transport & Logistics • Import & Export
        </p>
      </div>

      {/* Right: Office & Contact Information */}
      <div style={{ flex: "1 1 33%", textAlign: "right", minWidth: 0 }}>
        <p style={{ fontSize: "7.5pt", fontWeight: 800, color: "#1e3a8a", margin: "0 0 2px 0", textTransform: "uppercase" }}>
          AFGHANISTAN HEAD OFFICE
        </p>
        <p style={{ fontSize: "6.5pt", color: "#334155", lineHeight: 1.3, margin: "0 0 3px 0" }}>
          {address}
        </p>
        <p style={{ fontSize: "6.5pt", color: "#1d4ed8", lineHeight: 1.3, margin: 0, fontWeight: 700 }}>
          Tel: {phone} • {email}
        </p>
        <p style={{ fontSize: "6.5pt", color: "#64748b", margin: "2px 0 0 0", fontWeight: 600 }}>
          Gov Licence: <strong style={{ color: "#0f172a" }}>{licence}</strong>
        </p>
      </div>
    </div>
  )
})

/**
 * 2. Statement Metadata Banner: Filter context, date range, record count, and currency demarcation.
 */
export const AccountLedgerStatementMeta = memo(function AccountLedgerStatementMeta({
  entryCount,
  filterLabel,
  isFiltered,
  dateRange,
  currency = "USD",
}: {
  entryCount: number
  filterLabel?: string
  isFiltered?: boolean
  dateRange?: { start?: string; end?: string }
  currency?: string
}) {
  const periodText = dateRange?.start && dateRange?.end
    ? `${dateRange.start} – ${dateRange.end}`
    : "All Historical Transactions"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 16px",
        background: isFiltered ? "#fef3c7" : "#f1f5f9",
        borderBottom: "1px solid #cbd5e1",
        fontSize: "6.8pt",
        fontWeight: 700,
        color: "#334155",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span>
          Period: <strong style={{ color: "#0f172a" }}>{periodText}</strong>
        </span>
        <span>•</span>
        <span>
          Scope:{" "}
          <strong style={{ color: isFiltered ? "#b45309" : "#1e40af" }}>
            {filterLabel || (isFiltered ? "Filtered View" : "Full Canonical Ledger")}
          </strong>{" "}
          ({entryCount} {entryCount === 1 ? "Record" : "Records"})
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>
          Base Currency: <strong style={{ color: "#0f172a" }}>{currency}</strong>
        </span>
        <span>•</span>
        <span>
          Driver Rent: <strong style={{ color: "#0f172a" }}>AFN</strong>
        </span>
      </div>
    </div>
  )
})

/**
 * 3. Canonical Ledger Table with strictly proportioned 10 columns summing to 100%.
 * thead repeats on page breaks via display: table-header-group.
 * tr avoids breaks via break-inside: avoid.
 */
export const AccountLedgerTable = memo(function AccountLedgerTable({
  entries,
  currency = "USD",
  dense = false,
}: {
  entries: LedgerEntry[]
  currency?: string
  dense?: boolean
}) {
  // Compute running balance chronologically
  let running = 0
  const rowsWithBalance = entries.map((e, idx) => {
    const dr = Number(e.debit) || 0
    const cr = Number(e.credit) || 0
    running += dr - cr
    return {
      ...e,
      calculatedBalance: Math.round(running * 100) / 100,
      displaySNo: idx + 1,
    }
  })

  const fontSize = dense ? "6.5pt" : "7pt"
  const headerFontSizeEn = dense ? "7pt" : "7.5pt"
  const headerFontSizePs = dense ? "5pt" : "5.5pt"
  const cellPadding = dense ? "2.5px 2px" : "3.5px 3px"

  return (
    <table
      className="ledger-print-table"
      style={{
        width: "100%",
        minWidth: "100%",
        tableLayout: "fixed",
        borderCollapse: "collapse",
        margin: 0,
      }}
    >
      <thead>
        <tr style={{ background: "linear-gradient(to right, #dbeafe 0%, #eff6ff 50%, #ffffff 100%)" }}>
          {/* 1. S.NO (3.5%) */}
          <th style={{ width: "3.5%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>S.NO</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>شمېره</div>
          </th>

          {/* 2. DATE (7.0%) */}
          <th style={{ width: "7.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>DATE</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>نېټه / تاریخ</div>
          </th>

          {/* 3. SHIPPER / DESCRIPTION (19.0%) */}
          <th style={{ width: "19.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>SHIPPER / DETAILS</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>لیږدونکی / تفصیل</div>
          </th>

          {/* 4. INV.NO (7.0%) */}
          <th style={{ width: "7.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>INV.NO</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>انوایس</div>
          </th>

          {/* 5. BOL NO (8.5%) */}
          <th style={{ width: "8.5%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>BOL NO</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>بارنامه</div>
          </th>

          {/* 6. CONTAINER & TRUCK (12.0%) */}
          <th style={{ width: "12.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>CONTAINER / TRUCK</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>کانټینر / موټر</div>
          </th>

          {/* 7. QUANTITY (10.0%) */}
          <th style={{ width: "10.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>QUANTITY / CARGO</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>تعداد / توکي</div>
          </th>

          {/* 8. DRIVER RENT (9.0%) */}
          <th style={{ width: "9.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>RENT (AFN)</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>کرایه ډریور</div>
          </th>

          {/* 9. DEBIT (8.0%) */}
          <th style={{ width: "8.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#b91c1c", whiteSpace: "nowrap" }}>DEBIT ({currency})</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#b91c1c", direction: "rtl", whiteSpace: "nowrap" }}>د پور حساب</div>
          </th>

          {/* 10. CREDIT (8.0%) */}
          <th style={{ width: "8.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#047857", whiteSpace: "nowrap" }}>CREDIT ({currency})</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#047857", direction: "rtl", whiteSpace: "nowrap" }}>ترلاسه شوی</div>
          </th>

          {/* 11. BALANCE (8.0%) */}
          <th style={{ width: "8.0%", border: "1px solid #93c5fd", padding: cellPadding, textAlign: "center" }}>
            <div className="header-en" style={{ fontSize: headerFontSizeEn, fontWeight: 800, color: "#1e3a8a", whiteSpace: "nowrap" }}>BALANCE ({currency})</div>
            <div className="header-ps" style={{ fontSize: headerFontSizePs, fontWeight: 600, color: "#2563eb", direction: "rtl", whiteSpace: "nowrap" }}>بیلانس</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {rowsWithBalance.length === 0 ? (
          <tr>
            <td
              colSpan={11}
              style={{
                textAlign: "center",
                padding: "24px",
                color: "#64748b",
                fontSize: "9pt",
                fontWeight: 600,
                border: "1px solid #cbd5e1",
              }}
            >
              No ledger entries found for selected filter or period.
            </td>
          </tr>
        ) : (
          rowsWithBalance.map((entry, idx) => {
            const isCredit = entry.credit > 0
            const rowBg = isCredit ? "#ecfdf5" : idx % 2 === 0 ? "#ffffff" : "#f8fafc"
            const borderColor = isCredit ? "#a7f3d0" : "#cbd5e1"

            const bolText = (entry.billOfLanding || (entry as any).barnamehNo || "").trim()
            const containerTruck = [
              entry.containerNo && entry.containerNo !== "N/A" ? entry.containerNo : "",
              (entry as any).truck_number || (entry as any).truckNumber || "",
            ].filter(Boolean).join(" • ")

            return (
              <tr
                key={entry.id || `ledger-row-${idx}`}
                className={isCredit ? "credit-row" : "debit-row"}
                style={{
                  backgroundColor: rowBg,
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}
              >
                {/* 1. S.NO */}
                <td style={{ textAlign: "center", fontWeight: 700, color: isCredit ? "#065f46" : "#1e40af", fontSize, border: `1px solid ${borderColor}`, padding: cellPadding }}>
                  {entry.displaySNo}
                </td>

                {/* 2. DATE */}
                <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize, fontFamily: "var(--font-mono), monospace", border: `1px solid ${borderColor}`, padding: cellPadding, color: isCredit ? "#064e3b" : "#1e3a8a" }}>
                  {entry.date || "—"}
                </td>

                {/* 3. SHIPPER / DETAILS */}
                <td style={{ textAlign: "left", padding: "3px 4px", fontSize, lineHeight: 1.25, border: `1px solid ${borderColor}`, color: isCredit ? "#064e3b" : "#0f172a", wordBreak: "break-word" }}>
                  {isCredit ? (
                    <span style={{ fontWeight: 700 }}>
                      Payment Received / ترلاسه شوې پیسې: {entry.shipperDescription || "Credit Deposit"}
                    </span>
                  ) : (
                    <span>{entry.shipperDescription || "Cargo Transport"}</span>
                  )}
                  {entry.consignee && entry.consignee !== "N/A" && (
                    <div style={{ fontSize: "6.5pt", color: "#64748b", marginTop: "1px" }}>
                      Consignee: {entry.consignee}
                    </div>
                  )}
                </td>

                {/* 4. INV.NO */}
                <td style={{ textAlign: "center", fontWeight: 700, fontSize, fontFamily: "var(--font-mono), monospace", border: `1px solid ${borderColor}`, padding: cellPadding, color: isCredit ? "#047857" : "#1e3a8a" }}>
                  {entry.invoiceNo || "—"}
                </td>

                {/* 5. BOL NO */}
                <td style={{ textAlign: "center", fontWeight: 700, fontSize, fontFamily: "var(--font-mono), monospace", border: `1px solid ${borderColor}`, padding: cellPadding, color: "#1e3a8a" }}>
                  {bolText || "—"}
                </td>

                {/* 6. CONTAINER & TRUCK */}
                <td style={{ textAlign: "center", fontSize, border: `1px solid ${borderColor}`, padding: cellPadding, color: "#334155" }}>
                  <bdi dir="ltr" style={{ direction: "ltr", display: "inline-block" }}>
                    {containerTruck || entry.containerNo || "—"}
                  </bdi>
                </td>

                {/* 7. QUANTITY */}
                <td style={{ textAlign: "center", fontSize, border: `1px solid ${borderColor}`, padding: cellPadding, color: "#334155" }}>
                  {entry.quantity && entry.quantity !== "N/A" ? entry.quantity : "—"}
                </td>

                {/* 8. DRIVER RENT (AFN) */}
                <td style={{ textAlign: "center", fontSize, border: `1px solid ${borderColor}`, padding: cellPadding, color: "#475569" }}>
                  {entry.driverFreight ? (
                    <bdi dir="rtl" style={{ direction: "rtl", display: "inline-block", fontWeight: 600 }}>
                      {entry.driverFreight}
                    </bdi>
                  ) : (
                    "—"
                  )}
                </td>

                {/* 9. DEBIT */}
                <td style={{ textAlign: "right", paddingRight: "4px", fontWeight: 700, color: "#b91c1c", fontSize, border: `1px solid ${borderColor}`, fontFamily: "var(--font-mono), monospace" }}>
                  {entry.debit > 0 ? formatMoney(entry.debit) : "—"}
                </td>

                {/* 10. CREDIT */}
                <td style={{ textAlign: "right", paddingRight: "4px", fontWeight: 700, color: "#047857", fontSize, border: `1px solid ${borderColor}`, fontFamily: "var(--font-mono), monospace" }}>
                  {entry.credit > 0 ? formatMoney(entry.credit) : "—"}
                </td>

                {/* 11. BALANCE */}
                <td
                  style={{
                    textAlign: "right",
                    paddingRight: "4px",
                    fontWeight: 800,
                    fontSize,
                    border: `1px solid ${borderColor}`,
                    fontFamily: "var(--font-mono), monospace",
                    color: entry.calculatedBalance >= 0 ? "#1e3a8a" : "#b91c1c",
                  }}
                >
                  {formatMoney(entry.calculatedBalance)}
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
})

/**
 * 4. Summary Card: Financial invariant verification, debit, credit, net balance, and driver rent.
 */
export const AccountLedgerSummary = memo(function AccountLedgerSummary({
  totalDebit,
  totalCredit,
  closingBalance,
  totalDriverRentAFN,
  currency = "USD",
}: {
  totalDebit: number
  totalCredit: number
  closingBalance: number
  totalDriverRentAFN: number
  currency?: string
}) {
  const isDebitBalance = closingBalance >= 0

  return (
    <div
      className="ledger-summary-section"
      style={{
        marginTop: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "16px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Signatures & Verification */}
      <div style={{ flex: "1 1 50%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
          <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: "4px", textAlign: "center" }}>
            <p style={{ fontSize: "6.5pt", color: "#64748b", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
              PREPARED BY / ترتیب کوونکی
            </p>
            <p style={{ fontSize: "7.5pt", fontWeight: 800, color: "#1e3a8a", margin: "2px 0 0 0" }}>
              Accounts Department
            </p>
          </div>
          <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: "4px", textAlign: "center" }}>
            <p style={{ fontSize: "6.5pt", color: "#64748b", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>
              AUTHORIZED BY / تصدیق کوونکی
            </p>
            <p style={{ fontSize: "7.5pt", fontWeight: 800, color: "#1e3a8a", margin: "2px 0 0 0" }}>
              Sky Ariana Limited
            </p>
          </div>
        </div>
      </div>

      {/* Financial Totals Card */}
      <div
        style={{
          flex: "1 1 45%",
          border: "1.5px solid #93c5fd",
          borderRadius: "6px",
          background: "#f8fafc",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "linear-gradient(to right, #1e3a8a, #2563eb)",
            color: "#ffffff",
            padding: "5px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "7.5pt", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            ACCOUNT SUMMARY / خلاصه حساب
          </span>
          <span style={{ fontSize: "6.5pt", fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: "4px" }}>
            {currency} Base
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5pt" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "4px 10px", color: "#475569", fontWeight: 700 }}>
                Total Debit / پور (Shipments):
              </td>
              <td style={{ padding: "4px 10px", textAlign: "right", fontWeight: 800, color: "#b91c1c", fontFamily: "var(--font-mono), monospace" }}>
                ${formatMoney(totalDebit)} {currency}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "4px 10px", color: "#475569", fontWeight: 700 }}>
                Total Credit / ترلاسه شوې پیسې (Receipts):
              </td>
              <td style={{ padding: "4px 10px", textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "var(--font-mono), monospace" }}>
                ${formatMoney(totalCredit)} {currency}
              </td>
            </tr>
            <tr style={{ borderBottom: "1.5px solid #93c5fd", background: isDebitBalance ? "#eff6ff" : "#ecfdf5" }}>
              <td style={{ padding: "5px 10px", fontWeight: 900, color: isDebitBalance ? "#1e3a8a" : "#047857" }}>
                Closing Balance / پاتې حساب ({isDebitBalance ? "Receivable" : "Payable"}):
              </td>
              <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 900, fontSize: "9pt", color: isDebitBalance ? "#1e3a8a" : "#047857", fontFamily: "var(--font-mono), monospace" }}>
                ${formatMoney(Math.abs(closingBalance))} {currency}
              </td>
            </tr>
            {totalDriverRentAFN > 0 ? (
              <tr style={{ background: "#fef3c7" }}>
                <td style={{ padding: "4px 10px", color: "#92400e", fontWeight: 800 }}>
                  Total Driver Rent / مجموع کرایه موټر:
                </td>
                <td style={{ padding: "4px 10px", textAlign: "right", fontWeight: 800, color: "#92400e", fontFamily: "var(--font-mono), monospace" }}>
                  {totalDriverRentAFN.toLocaleString()} AFN
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
})

/**
 * 5. Footer: Confidentiality statement and document attribution.
 */
export const AccountLedgerFooter = memo(function AccountLedgerFooter({
  statementDate,
}: {
  statementDate: string
}) {
  return (
    <div
      className="print-footer"
      style={{
        marginTop: "14px",
        paddingTop: "6px",
        borderTop: "1px solid #cbd5e1",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "6.5pt",
        color: "#64748b",
        fontWeight: 600,
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <span>AQ COMPANIES • Sky Ariana International Transport & Logistics • Kandahar, Afghanistan</span>
      <span>Confidential Financial Record • Generated: {statementDate}</span>
    </div>
  )
})

/**
 * Canonical unified Account Ledger Document Component.
 * Used identically by Preview, Direct Print, and PDF Export.
 */
export const AccountLedgerDocument = memo(function AccountLedgerDocument({
  accountName,
  entries,
  statementDate,
  dateRange,
  filterLabel,
  isFiltered,
  currency = "USD",
  companySettings,
  orientation = "landscape",
  dense = false,
  className = "",
}: AccountLedgerDocumentProps) {
  const currentDate = statementDate || new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const totals = calculateLedgerTotals(entries)

  return (
    <div
      className={`account-ledger-print-root ledger-print-document ${className}`}
      style={{
        width: orientation === "landscape" ? "297mm" : "210mm",
        minHeight: orientation === "landscape" ? "210mm" : "297mm",
        background: "#ffffff",
        color: "#0f172a",
        padding: "8mm 10mm",
        boxSizing: "border-box",
        position: "relative",
        margin: "0 auto",
      }}
    >
      <style>{`
        @page {
          size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"};
          margin: 6mm 8mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .account-ledger-print-root {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .account-ledger-table {
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .account-ledger-table thead {
            display: table-header-group !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .account-ledger-table tbody {
            display: table-row-group !important;
          }
          .account-ledger-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .account-ledger-header, .account-ledger-meta, .account-ledger-summary, .print-footer {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      {/* 1. Statement Header */}
      <AccountLedgerHeader
        accountName={accountName}
        statementDate={currentDate}
        companySettings={companySettings}
      />

      {/* 2. Metadata Banner */}
      <AccountLedgerStatementMeta
        entryCount={entries.length}
        filterLabel={filterLabel}
        isFiltered={isFiltered}
        dateRange={dateRange}
        currency={currency}
      />

      {/* 3. Canonical Table */}
      <AccountLedgerTable
        entries={entries}
        currency={currency}
        dense={dense}
      />

      {/* 4. Financial Summary & Signatures */}
      <AccountLedgerSummary
        totalDebit={totals.totalDebit}
        totalCredit={totals.totalCredit}
        closingBalance={totals.closingBalance}
        totalDriverRentAFN={totals.totalDriverRentAFN}
        currency={currency}
      />

      {/* 5. Footer */}
      <AccountLedgerFooter statementDate={currentDate} />
    </div>
  )
})

export default AccountLedgerDocument
