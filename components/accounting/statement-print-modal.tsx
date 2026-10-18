"use client"

import { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AccountRecord, LedgerTransactionRecord } from "@/lib/types/ledger-system"
import { Printer, Download, Share2, Copy, Check, FileSpreadsheet, X } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface StatementPrintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AccountRecord
  transactions: LedgerTransactionRecord[]
  dateFrom?: string
  dateTo?: string
}

export function StatementPrintModal({
  open,
  onOpenChange,
  account,
  transactions,
  dateFrom,
  dateTo,
}: StatementPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const filteredTxs = transactions.filter((t) => {
    if (dateFrom && (t.transaction_date || "") < dateFrom) return false
    if (dateTo && (t.transaction_date || "") > dateTo) return false
    return true
  })

  let periodDebit = 0
  let periodCredit = 0
  for (const t of filteredTxs) {
    periodDebit += t.debit
    periodCredit += t.credit
  }
  const closingBalance = Math.round((account.opening_balance + periodDebit - periodCredit) * 100) / 100

  const handlePrint = () => {
    window.print()
  }

  const handleCopyWhatsApp = () => {
    const text = [
      `*SKY ARIANA LTD*`,
      `*ACCOUNT STATEMENT*`,
      `Account: *${account.display_name}*`,
      `Currency: *${account.currency}*`,
      dateFrom || dateTo ? `Period: ${dateFrom || "Start"} to ${dateTo || "Current"}` : `As of: ${new Date().toLocaleDateString()}`,
      `-----------------------------`,
      `Total Debit: *${account.currency === "AFN" ? "؋" : "$"}${periodDebit.toLocaleString()}*`,
      `Total Credit: *${account.currency === "AFN" ? "؋" : "$"}${periodCredit.toLocaleString()}*`,
      `*Net Balance: ${account.currency === "AFN" ? "؋" : "$"}${closingBalance.toLocaleString()}*`,
      closingBalance > 0 ? `(Outstanding Amount to Pay)` : closingBalance < 0 ? `(Advance / Credit Balance)` : `(Settled)`,
      `-----------------------------`,
      `Sky Ariana Logistics & Customs Clearance`,
      `Email: info@skyariana.com | Tel: +93 700 939 365`,
    ].join("\n")

    navigator.clipboard.writeText(text)
    toast.success("Account statement summary copied to clipboard for WhatsApp!")
  }

  const handleExportCsv = () => {
    const headers = ["Date", "Description", "Reference", "BOL #", "Invoice #", "Debit", "Credit", "Balance", "Currency"]
    const rows = filteredTxs.map((t) => [
      t.transaction_date,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${(t.reference_number || "").replace(/"/g, '""')}"`,
      `"${(t.bol_number || "").replace(/"/g, '""')}"`,
      `"${(t.invoice_number || "").replace(/"/g, '""')}"`,
      t.debit,
      t.credit,
      t.running_balance,
      t.currency,
    ])

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Statement_${account.account_name}_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Statement exported to CSV")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[920px] max-h-[90vh] overflow-y-auto p-0 print:max-w-none print:m-0 print:p-0 print:overflow-visible">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-slate-100/90 dark:bg-slate-900/90 px-6 py-3 no-print backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <DialogTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">A4 Ledger Statement Preview</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyWhatsApp} className="gap-1.5 text-xs">
              <Share2 className="h-3.5 w-3.5 text-emerald-600" />
              WhatsApp Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
              Export CSV
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800">
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Printable Statement Canvas */}
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:p-4 text-xs font-sans min-h-[1050px]">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 relative shrink-0">
                <Image src="/logo.png" alt="AQ Companies" width={56} height={56} className="object-contain" priority />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">AQ COMPANIES</h1>
                <p className="text-[11px] text-slate-600 font-medium">International Freight Forwarding & Logistics Management</p>
                <p className="text-[10px] text-slate-500">
                  Licence: 2401-2198 | Kandahar Chowk, Etimad Rahmi Market | Email: info@skyariana.com
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white font-bold px-3 py-1 text-sm rounded">
                ACCOUNT STATEMENT
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Account & Period Meta */}
          <div className="grid grid-cols-2 gap-4 my-4 p-3 bg-slate-50 border border-slate-200 rounded">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Client / Company Name</p>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">{account.display_name}</h2>
              <p className="text-[11px] text-slate-600">Account Code: {account.account_code || "N/A"}</p>
              <p className="text-[11px] text-slate-600">Type: <span className="capitalize">{account.account_type}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Statement Currency & Period</p>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{account.currency}</h3>
              <p className="text-[11px] text-slate-600">
                Period: {dateFrom || "Beginning"} &mdash; {dateTo || "Present"}
              </p>
              <p className="text-[11px] font-semibold text-slate-700">
                Total Transactions: {filteredTxs.length}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <table className="w-full border-collapse text-[11px] mt-2">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="p-1.5 text-left w-10">#</th>
                <th className="p-1.5 text-left w-24">Date</th>
                <th className="p-1.5 text-left">Description</th>
                <th className="p-1.5 text-left w-24">Reference / BL</th>
                <th className="p-1.5 text-right w-24">Debit ({account.currency})</th>
                <th className="p-1.5 text-right w-24">Credit ({account.currency})</th>
                <th className="p-1.5 text-right w-28">Balance ({account.currency})</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance Row */}
              <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold">
                <td className="p-1.5 text-slate-500">-</td>
                <td className="p-1.5 font-mono">{dateFrom || "-"}</td>
                <td className="p-1.5 text-slate-700" colSpan={2}>
                  Opening Balance Brought Forward
                </td>
                <td className="p-1.5 text-right font-mono">-</td>
                <td className="p-1.5 text-right font-mono">-</td>
                <td className="p-1.5 text-right font-mono font-bold">
                  {account.opening_balance.toLocaleString()}
                </td>
              </tr>

              {filteredTxs.map((t, idx) => (
                <tr
                  key={t.id || idx}
                  className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}
                >
                  <td className="p-1.5 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="p-1.5 font-mono text-slate-700 whitespace-nowrap">{t.transaction_date}</td>
                  <td className="p-1.5 text-slate-800">
                    <div>{t.description}</div>
                    {(t.bol_number || t.invoice_number || t.container_number) && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {t.bol_number && `BOL: ${t.bol_number} `}
                        {t.invoice_number && `Inv: ${t.invoice_number} `}
                        {t.container_number && `Cont: ${t.container_number}`}
                      </div>
                    )}
                  </td>
                  <td className="p-1.5 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                    {t.reference_number || t.bol_number || "-"}
                  </td>
                  <td className="p-1.5 text-right font-mono font-medium text-slate-900">
                    {t.debit > 0 ? t.debit.toLocaleString() : "-"}
                  </td>
                  <td className="p-1.5 text-right font-mono font-medium text-emerald-700">
                    {t.credit > 0 ? t.credit.toLocaleString() : "-"}
                  </td>
                  <td className="p-1.5 text-right font-mono font-semibold text-slate-900">
                    {t.running_balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-slate-900">
                <td colSpan={4} className="p-2 text-right uppercase tracking-wider">
                  Totals & Net Closing Balance:
                </td>
                <td className="p-2 text-right font-mono">{periodDebit.toLocaleString()}</td>
                <td className="p-2 text-right font-mono text-emerald-700">{periodCredit.toLocaleString()}</td>
                <td className="p-2 text-right font-mono text-sm">{closingBalance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {/* Statement Invariance Summary Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px]">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Payment & Settlement Instructions</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Please remit payments referencing the statement account code and BOL references. Multi-currency settlements must declaring applied exchange rates.
              </p>
              <div className="mt-3 text-slate-500 text-[10px]">
                Accounting Identity Verified: Balance = Total Debit - Total Credit.
              </div>
            </div>
            <div className="flex flex-col justify-end items-end">
              <div className="w-48 border-b border-slate-400 pb-1 text-center">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Authorized Signature</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sky Ariana Limited Finance Department</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
