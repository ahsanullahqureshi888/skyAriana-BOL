"use client"

import React, { useState } from "react"
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/utils/money"
import type { FinanceInvoiceRecord, FinancePaymentRecord, FinanceReceiptRecord } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceReportsTabProps {
  invoices: FinanceInvoiceRecord[]
  payments: FinancePaymentRecord[]
  receipts: FinanceReceiptRecord[]
  activeCurrency: string
}

export function FinanceReportsTab({
  invoices,
  payments,
  receipts,
  activeCurrency,
}: FinanceReportsTabProps) {
  const [reportType, setReportType] = useState<"invoices" | "payments" | "daily_cash">("invoices")

  const handleExportCSV = () => {
    let headers: string[] = []
    let rows: any[][] = []
    let filename = `Finance-Report-${reportType}-${activeCurrency}.csv`

    if (reportType === "invoices") {
      headers = ["Invoice No", "Date", "Customer", "BOL", "Total", "Paid", "Outstanding", "Status"]
      rows = invoices.map((i) => [
        i.invoiceNumber,
        i.issueDate,
        `"${i.customerName}"`,
        `"${i.bolNumbers?.join(", ") || ""}"`,
        i.totalAmount,
        i.paidAmount,
        i.outstandingAmount,
        i.status,
      ])
    } else if (reportType === "payments") {
      headers = ["Payment No", "Date", "Customer", "Method", "Reference", "Amount", "Currency"]
      rows = payments.map((p) => [
        p.paymentNumber,
        p.paymentDate,
        `"${p.customerName}"`,
        p.paymentMethod,
        `"${p.referenceNumber || ""}"`,
        p.amount,
        p.currency,
      ])
    } else {
      headers = ["Type", "Reference", "Customer", "Amount", "Currency", "Date"]
      const today = new Date().toISOString().split("T")[0]
      rows = payments
        .filter((p) => p.paymentDate === today)
        .map((p) => ["Payment Received", p.paymentNumber, `"${p.customerName}"`, p.amount, p.currency, p.paymentDate])
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Financial report exported successfully!")
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={reportType === "invoices" ? "default" : "outline"}
            className="h-8 text-xs font-bold"
            onClick={() => setReportType("invoices")}
          >
            Invoice Register
          </Button>
          <Button
            size="sm"
            variant={reportType === "payments" ? "default" : "outline"}
            className="h-8 text-xs font-bold"
            onClick={() => setReportType("payments")}
          >
            Payment Register
          </Button>
          <Button
            size="sm"
            variant={reportType === "daily_cash" ? "default" : "outline"}
            className="h-8 text-xs font-bold"
            onClick={() => setReportType("daily_cash")}
          >
            Daily Cash / Bank Report
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 bg-slate-800 text-xs text-white"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" /> Print Register
          </Button>
        </div>
      </div>

      {/* Report View Panel */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {reportType === "invoices"
              ? "Comprehensive Invoice Register"
              : reportType === "payments"
              ? "Comprehensive Payment Register"
              : "Daily Cash & Bank Collection Report"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {reportType === "invoices" && (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3">Invoice No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {invoices.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {i.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{i.issueDate}</td>
                      <td className="px-4 py-3 font-semibold">{i.customerName}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {formatMoney(i.totalAmount, i.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">
                        {formatMoney(i.paidAmount, i.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600 font-bold">
                        {formatMoney(i.outstandingAmount, i.currency)}
                      </td>
                      <td className="px-4 py-3 text-center uppercase text-[10px] font-bold">
                        {i.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === "payments" && (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3">Payment No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {p.paymentNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.paymentDate}</td>
                      <td className="px-4 py-3 font-semibold">{p.customerName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.paymentMethod}</td>
                      <td className="px-4 py-3 font-mono">{p.referenceNumber || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === "daily_cash" && (
              <div className="p-8 text-center text-xs text-slate-500">
                <Calendar className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                Showing collections for Today ({new Date().toISOString().split("T")[0]}). All entries are segregated strictly by native currency.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
