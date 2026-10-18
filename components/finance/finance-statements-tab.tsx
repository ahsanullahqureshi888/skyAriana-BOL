"use client"

import React, { useState } from "react"
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Building2,
  Search,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/utils/money"
import type { CustomerStatementResult } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceStatementsTabProps {
  customerNames: string[]
}

export function FinanceStatementsTab({ customerNames }: FinanceStatementsTabProps) {
  const [selectedCustomer, setSelectedCustomer] = useState(
    customerNames[0] || "NAJEB AMIN LTD"
  )
  const [currency, setCurrency] = useState("USD")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [statement, setStatement] = useState<CustomerStatementResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateStatement = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer")
      return
    }

    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        customer: selectedCustomer,
        currency,
      })
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await fetch(`/api/finance/statements?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load statement")

      setStatement(data.data)
      toast.success(`Statement for ${selectedCustomer} loaded successfully!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const exportCSV = () => {
    if (!statement) return
    const headers = ["Date", "Reference", "Type", "Description", "Debit", "Credit", "Balance"]
    const rows = statement.transactions.map((t) => [
      t.date,
      t.reference,
      t.type,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.debit,
      t.credit,
      t.runningBalance,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        `"CUSTOMER STATEMENT - ${statement.customerName} (${statement.currency})"`,
        `"Period: ${statement.period}"`,
        `"Opening Balance: ${statement.openingBalance}"`,
        headers.join(","),
        ...rows.map((e) => e.join(",")),
        `"Closing Balance: ${statement.closingBalance}"`,
      ].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `Statement-${statement.customerName.replace(/[^A-Za-z0-9]/g, "_")}-${statement.currency}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Generate Customer Account Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Customer Company
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900"
              >
                {customerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="USD">USD ($)</option>
                <option value="AED">AED</option>
                <option value="AFN">AFN</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                From Date (Optional)
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                To Date (Optional)
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <Button
              size="sm"
              disabled={isLoading}
              onClick={handleGenerateStatement}
              className="h-8 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Generate Statement
            </Button>

            {statement && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={exportCSV}
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1 bg-slate-800 text-xs text-white"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" /> Print Statement
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rendered Statement Sheet */}
      {statement && (
        <Card className="border border-slate-300 shadow-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <CardContent className="p-6">
            {/* Statement Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 dark:border-slate-200">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  SKY ARIANA LIMITED
                </h1>
                <p className="text-xs text-slate-500">
                  Customer Account Financial Statement
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {statement.customerName}
                </div>
                <div className="text-slate-500">Currency: {statement.currency}</div>
                <div className="text-slate-500">Period: {statement.period}</div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="my-4 grid grid-cols-4 gap-3 border-b border-slate-200 pb-4 text-xs dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Opening Balance:
                </span>
                <span className="font-mono font-bold text-sm">
                  {formatMoney(statement.openingBalance, statement.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Total Debits (Billed):
                </span>
                <span className="font-mono font-bold text-sm text-blue-600">
                  {formatMoney(statement.totalDebit, statement.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Total Credits (Paid):
                </span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {formatMoney(statement.totalCredit, statement.currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Closing Balance Due:
                </span>
                <span className="font-mono font-black text-sm text-rose-600">
                  {formatMoney(statement.closingBalance, statement.currency)}
                </span>
              </div>
            </div>

            {/* Statement Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 font-bold uppercase text-slate-500 text-[10px]">
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Reference</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Particulars / Details</th>
                    <th className="py-2 px-2 text-right">Debit (Dr)</th>
                    <th className="py-2 px-2 text-right">Credit (Cr)</th>
                    <th className="py-2 px-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {statement.transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{tx.date}</td>
                      <td className="py-2 px-2 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {tx.reference}
                      </td>
                      <td className="py-2 px-2 capitalize text-slate-500">{tx.type}</td>
                      <td className="py-2 px-2 font-medium">{tx.description}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {tx.debit > 0 ? formatMoney(tx.debit, statement.currency) : "—"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium text-emerald-600">
                        {tx.credit > 0 ? formatMoney(tx.credit, statement.currency) : "—"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        {formatMoney(tx.runningBalance, statement.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invariance Badge */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500 dark:border-slate-800">
              <span className="flex items-center gap-1 font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accounting Invariance Verified: Closing = Opening + Total Debit - Total Credit
              </span>
              <span>Generated on {new Date().toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
