"use client"

import React, { useState } from "react"
import {
  Building2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PayablesReport, SupplierPayableRow } from "@/lib/types/management-reporting"

interface TabProps {
  data: PayablesReport | null
  onMetricClick: (metricId: string, title: string) => void
  selectedCurrency?: string
}

export function PayablesReportTab({ data, onMetricClick, selectedCurrency = "ALL" }: TabProps) {
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<string>("USD")
  const [searchTerm, setSearchTerm] = useState<string>("")

  if (!data) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading Accounts Payable schedule...</div>
  }

  const currencies = data.currencySummaries.map((s) => s.currency)
  const currentSummary =
    data.currencySummaries.find((s) => s.currency === activeCurrencyTab) ||
    data.currencySummaries[0]

  const filteredSuppliers = data.suppliers
    .filter((s) => s.currency === activeCurrencyTab)
    .filter((s) =>
      searchTerm ? s.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) : true
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
              Accounts Payable Aging Schedule
            </h3>
            <Badge variant="outline" className="bg-rose-50/50 text-rose-600 border-rose-500/30 text-[11px] font-mono">
              Billed vs Disbursed Aging
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
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Payable</span>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                {formatMoney(currentSummary.totalPayable)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {currentSummary.supplierCount} vendors/carriers
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Current (Not Due)</span>
              <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(currentSummary.aging.current)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Within payment term</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">1 - 30 Days</span>
              <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatMoney(currentSummary.aging.days1_30)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pending disbursement</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">31 - 60 Days</span>
              <div className="text-base font-bold font-mono text-orange-600 dark:text-orange-400 mt-1">
                {formatMoney(currentSummary.aging.days31_60)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Follow-up due</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">61 - 90 Days</span>
              <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatMoney(currentSummary.aging.days61_90)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Carrier alert</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-500">90+ Days</span>
              <div className="text-base font-bold font-mono text-rose-700 dark:text-rose-500 mt-1">
                {formatMoney(currentSummary.aging.days91_120 + currentSummary.aging.days120_plus)}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Critical review</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Supplier Advance Prepayments Banner */}
      {currentSummary && currentSummary.totalAdvances > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                Supplier Prepayments & Active Vendor Advances
              </span>
              <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                Our company has deposited {formatMoney(currentSummary.totalAdvances)} in driver rent prepayments and carrier booking deposits. These advance balances are tracked independently and not subtracted from open supplier liabilities until final bills arrive.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            {formatMoney(currentSummary.totalAdvances)} Advanced
          </Badge>
        </div>
      )}

      {/* Supplier Aging Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Supplier Aging Detail ({activeCurrencyTab})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by highest outstanding payable
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter supplier..."
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
                  <th className="text-left py-2.5 px-4 font-bold">Supplier / Carrier Name</th>
                  <th className="text-right py-2.5 px-3 font-bold">Bills Received</th>
                  <th className="text-right py-2.5 px-3 font-bold">Payments Made</th>
                  <th className="text-right py-2.5 px-3 font-bold">Total Payable</th>
                  <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Current</th>
                  <th className="text-right py-2.5 px-3 font-bold text-amber-600">1-30 d</th>
                  <th className="text-right py-2.5 px-3 font-bold text-orange-600">31-60 d</th>
                  <th className="text-right py-2.5 px-3 font-bold text-rose-600">60+ d</th>
                  <th className="text-center py-2.5 px-3 font-bold">Oldest Bill</th>
                  <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No supplier payables found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => (
                    <tr key={supp.supplierId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{supp.supplierName}</div>
                        {supp.supplierAdvanceBalance > 0 && (
                          <span className="text-[10px] text-emerald-600 font-mono">
                            Prepayment: {formatMoney(supp.supplierAdvanceBalance)}
                          </span>
                        )}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(supp.billsReceived)}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatMoney(supp.paymentsMade)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatMoney(supp.currentPayable)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                        {supp.aging.current > 0 ? formatMoney(supp.aging.current) : "-"}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                        {supp.aging.days1_30 > 0 ? formatMoney(supp.aging.days1_30) : "-"}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-orange-600 dark:text-orange-400">
                        {supp.aging.days31_60 > 0 ? formatMoney(supp.aging.days31_60) : "-"}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {(supp.aging.days61_90 + supp.aging.days91_120 + supp.aging.days120_plus) > 0
                          ? formatMoney(supp.aging.days61_90 + supp.aging.days91_120 + supp.aging.days120_plus)
                          : "-"}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {supp.oldestBillNo ? (
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {supp.oldestBillNo}
                            {supp.daysOutstanding > 0 && (
                              <Badge variant="destructive" className="ml-1 text-[9px] px-1 h-3.5 font-bold">
                                {supp.daysOutstanding}d
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
                          onClick={() => onMetricClick(`payables:supplier:${supp.supplierName}:${activeCurrencyTab}`, `${supp.supplierName} Bills & Disbursements`)}
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
