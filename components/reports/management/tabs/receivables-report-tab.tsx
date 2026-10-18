"use client"

import React, { useState } from "react"
import {
  Users,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowDownLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReceivablesReport, CustomerReceivableRow } from "@/lib/types/management-reporting"

interface TabProps {
  data: ReceivablesReport | null
  onMetricClick: (metricId: string, title: string) => void
  selectedCurrency?: string
}

export function ReceivablesReportTab({ data, onMetricClick, selectedCurrency = "ALL" }: TabProps) {
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<string>("USD")
  const [searchTerm, setSearchTerm] = useState<string>("")

  if (!data) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading Accounts Receivable schedule...</div>
  }

  const currencies = data.currencySummaries.map((s) => s.currency)
  const currentSummary =
    data.currencySummaries.find((s) => s.currency === activeCurrencyTab) ||
    data.currencySummaries[0]

  const filteredCustomers = data.customers
    .filter((c) => c.currency === activeCurrencyTab)
    .filter((c) =>
      searchTerm ? c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) : true
    )

  const formatMoney = (amount: number, curr = activeCurrencyTab) => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Accounts Receivable Aging Schedule
            </h3>
            <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-blue-500/30 text-[11px] font-mono">
              Invoiced vs Collected Aging
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            As of: <span className="font-semibold text-slate-700 dark:text-slate-200">{data.periodLabel}</span> ({data.dateRange.end})
          </p>
        </div>

        {/* Currency Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          {currencies.map((curr) => (
            <button
              key={curr}
              onClick={() => setActiveCurrencyTab(curr)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeCurrencyTab === curr
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {curr} Schedule
            </button>
          ))}
        </div>
      </div>

      {/* Aging Bucket KPI Summary Cards */}
      {currentSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Outstanding</span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                {formatMoney(currentSummary.totalOutstanding)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {currentSummary.customerCount} customers
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Current (Not Due)</span>
              <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(currentSummary.aging.current)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Within term</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">1 - 30 Days</span>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatMoney(currentSummary.aging.days1_30)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">First reminder</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">31 - 60 Days</span>
              <div className="text-base font-bold font-mono text-orange-600 dark:text-orange-400 mt-1">
                {formatMoney(currentSummary.aging.days31_60)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Escalated</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">61 - 90 Days</span>
              <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatMoney(currentSummary.aging.days61_90)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">High overdue</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-500">90+ Days</span>
              <div className="text-base font-bold font-mono text-rose-700 dark:text-rose-500 mt-1">
                {formatMoney(currentSummary.aging.days91_120 + currentSummary.aging.days120_plus)}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Immediate notice</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advance Payments & Credit Balances Banner */}
      {currentSummary && currentSummary.totalCreditAdvances > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowDownLeft className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-200">
                Customer Prepayments & Unallocated Advance Balances
              </span>
              <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                Customers have placed {formatMoney(currentSummary.totalCreditAdvances)} in advance deposits. In compliance with strict accounting standards, prepayments are kept strictly isolated and never netted against overdue invoices.
              </p>
            </div>
          </div>
          <Badge className="bg-blue-600 text-white font-mono text-xs">
            {formatMoney(currentSummary.totalCreditAdvances)} Held
          </Badge>
        </div>
      )}

      {/* Customer Aging Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Customer Aging Detail ({activeCurrencyTab})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by highest outstanding balance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="text-left py-2.5 px-4 font-bold">Customer Name</th>
                  <th className="text-right py-2.5 px-3 font-bold">Total Invoiced</th>
                  <th className="text-right py-2.5 px-3 font-bold">Collected</th>
                  <th className="text-right py-2.5 px-3 font-bold">Total Due</th>
                  <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Current</th>
                  <th className="text-right py-2.5 px-3 font-bold text-amber-600">1-30 d</th>
                  <th className="text-right py-2.5 px-3 font-bold text-orange-600">31-60 d</th>
                  <th className="text-right py-2.5 px-3 font-bold text-rose-600">60+ d</th>
                  <th className="text-center py-2.5 px-3 font-bold">Oldest Inv</th>
                  <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No customer receivables found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{cust.customerName}</div>
                        {cust.customerCreditBalance > 0 && (
                          <span className="text-[10px] text-blue-600 font-mono">
                            Deposit: {formatMoney(cust.customerCreditBalance)}
                          </span>
                        )}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(cust.invoicedCharges)}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatMoney(cust.paymentsReceived)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(cust.currentOutstanding)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                        {cust.aging.current > 0 ? formatMoney(cust.aging.current) : "-"}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                        {cust.aging.days1_30 > 0 ? formatMoney(cust.aging.days1_30) : "-"}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-orange-600 dark:text-orange-400">
                        {cust.aging.days31_60 > 0 ? formatMoney(cust.aging.days31_60) : "-"}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {(cust.aging.days61_90 + cust.aging.days91_120 + cust.aging.days120_plus) > 0
                          ? formatMoney(cust.aging.days61_90 + cust.aging.days91_120 + cust.aging.days120_plus)
                          : "-"}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {cust.oldestInvoiceNo ? (
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {cust.oldestInvoiceNo}
                            {cust.daysOutstanding > 0 && (
                              <Badge variant="destructive" className="ml-1 text-[9px] px-1 h-3.5 font-bold">
                                {cust.daysOutstanding}d
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMetricClick(`receivables:customer:${cust.customerName}:${activeCurrencyTab}`, `${cust.customerName} Invoices & Payments`)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                        >
                          <ChevronRight className="h-4 w-4" />
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
