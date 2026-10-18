"use client"

import React, { useState } from "react"
import {
  Clock,
  AlertTriangle,
  Calendar,
  Share2,
  Copy,
  Check,
  Search,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/utils/money"
import { buildOutstandingBalanceWhatsAppMessage } from "@/lib/utils/finance-whatsapp"
import type { FinanceInvoiceRecord, AgingBucketSummary } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceOutstandingTabProps {
  invoices: FinanceInvoiceRecord[]
  agingSummary: AgingBucketSummary | null
  activeCurrency: string
  onSelectCurrency: (curr: string) => void
}

export function FinanceOutstandingTab({
  invoices,
  agingSummary,
  activeCurrency,
  onSelectCurrency,
}: FinanceOutstandingTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedCustomer, setCopiedCustomer] = useState<string | null>(null)

  const currencies = ["USD", "AED", "AFN", "EUR"]

  // Group outstanding invoices by customer for the active currency
  const customerMap = new Map<
    string,
    {
      customerName: string
      totalOutstanding: number
      overdueCount: number
      invoices: FinanceInvoiceRecord[]
      oldestDueDate?: string
    }
  >()

  const todayStr = new Date().toISOString().split("T")[0]

  invoices
    .filter(
      (inv) =>
        inv.currency.toUpperCase() === activeCurrency.toUpperCase() &&
        inv.outstandingAmount > 0 &&
        inv.status !== "cancelled"
    )
    .forEach((inv) => {
      const cname = inv.customerName.trim()
      const existing = customerMap.get(cname) || {
        customerName: cname,
        totalOutstanding: 0,
        overdueCount: 0,
        invoices: [],
      }

      existing.totalOutstanding += inv.outstandingAmount
      existing.invoices.push(inv)
      if (inv.dueDate && inv.dueDate < todayStr) {
        existing.overdueCount++
      }
      if (inv.dueDate) {
        if (!existing.oldestDueDate || inv.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = inv.dueDate
        }
      }
      customerMap.set(cname, existing)
    })

  const customerList = Array.from(customerMap.values()).filter((c) => {
    if (searchQuery.trim()) {
      return c.customerName.toLowerCase().includes(searchQuery.toLowerCase().trim())
    }
    return true
  })

  const handleCopyWhatsApp = (item: (typeof customerList)[0]) => {
    const text = buildOutstandingBalanceWhatsAppMessage(
      item.customerName,
      activeCurrency,
      item.totalOutstanding,
      item.overdueCount
    )
    navigator.clipboard.writeText(text)
    setCopiedCustomer(item.customerName)
    toast.success(`WhatsApp balance reminder copied for ${item.customerName}!`)
    setTimeout(() => setCopiedCustomer(null), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Currency Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Aging Currency:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            {currencies.map((curr) => (
              <button
                key={curr}
                onClick={() => onSelectCurrency(curr)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                  activeCurrency === curr
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Aging Buckets Overview Cards */}
      {agingSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="border-t-4 border-t-emerald-500 shadow-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[11px] font-bold uppercase text-slate-500">
                Current (Not Due)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-base font-black text-slate-900 dark:text-slate-100">
                {formatMoney(agingSummary.current, activeCurrency)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-amber-400 shadow-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[11px] font-bold uppercase text-slate-500">
                1–30 Days Overdue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-base font-black text-amber-600 dark:text-amber-400">
                {formatMoney(agingSummary.days1to30, activeCurrency)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500 shadow-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[11px] font-bold uppercase text-slate-500">
                31–60 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-base font-black text-orange-600 dark:text-orange-400">
                {formatMoney(agingSummary.days31to60, activeCurrency)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-rose-500 shadow-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[11px] font-bold uppercase text-slate-500">
                61–90 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-base font-black text-rose-600 dark:text-rose-400">
                {formatMoney(agingSummary.days61to90, activeCurrency)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-600 shadow-sm">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[11px] font-bold uppercase text-slate-500">
                90+ Days Critical
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-base font-black text-purple-700 dark:text-purple-400">
                {formatMoney(agingSummary.days90Plus, activeCurrency)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outstanding Receivables by Customer Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Customer Outstanding Balances ({activeCurrency})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Customer Company</th>
                  <th className="px-4 py-3 text-center">Unpaid Invoices</th>
                  <th className="px-4 py-3 text-center">Overdue Count</th>
                  <th className="px-4 py-3">Oldest Due Date</th>
                  <th className="px-4 py-3 text-right">Total Outstanding</th>
                  <th className="px-4 py-3 text-right">WhatsApp Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {customerList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No outstanding balances found in {activeCurrency}.
                    </td>
                  </tr>
                ) : (
                  customerList.map((c) => (
                    <tr
                      key={c.customerName}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {c.customerName}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {c.invoices.length}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.overdueCount > 0 ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {c.overdueCount} Overdue
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {c.oldestDueDate || "Due Date Not Set"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(c.totalOutstanding, activeCurrency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleCopyWhatsApp(c)}
                        >
                          {copiedCustomer === c.customerName ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy Reminder
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
