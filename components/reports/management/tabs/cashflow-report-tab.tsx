"use client"

import React, { useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Building2,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  ArrowRightLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ManagementCashFlowReport, CashFlowCurrencyReport } from "@/lib/types/management-reporting"

interface TabProps {
  data: ManagementCashFlowReport | null
  onMetricClick: (metricId: string, title: string) => void
  selectedCurrency?: string
}

export function CashFlowReportTab({ data, onMetricClick, selectedCurrency = "ALL" }: TabProps) {
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<string>("USD")

  if (!data) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading Cash Flow report...</div>
  }

  const availableCurrencies = data.currencyReports.map((c) => c.currency)
  const currentReport =
    data.currencyReports.find((c) => c.currency === activeCurrencyTab) ||
    data.currencyReports[0]

  if (!currentReport) {
    return <div className="py-12 text-center text-xs text-slate-500">No cash flow movements recorded.</div>
  }

  const formatMoney = (amount: number, curr = currentReport.currency) => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Operational Cash Flow Statement
            </h3>
            <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-blue-500/30 text-[11px] font-mono">
              Net External Cash Movements
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reporting Period: <span className="font-semibold text-slate-700 dark:text-slate-200">{data.periodLabel}</span> ({data.dateRange.start} to {data.dateRange.end})
          </p>
        </div>

        {/* Currency Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          {availableCurrencies.map((curr) => (
            <button
              key={curr}
              onClick={() => setActiveCurrencyTab(curr)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeCurrencyTab === curr
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {curr} Cash Flow
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          onClick={() => onMetricClick(`cashflow:inflows:${currentReport.currency}`, "Operating Cash Inflows")}
          className="cursor-pointer hover:border-emerald-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Inflows</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              +{formatMoney(currentReport.inflows.totalInflows)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Receipts from Customers
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onMetricClick(`cashflow:outflows:${currentReport.currency}`, "Operating Cash Outflows")}
          className="cursor-pointer hover:border-rose-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Outflows</span>
              <ArrowUpRight className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              -{formatMoney(currentReport.outflows.totalOutflows)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Suppliers, Rent & Expenses
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onMetricClick(`cashflow:net:${currentReport.currency}`, "Net Operational Cash Flow")}
          className="cursor-pointer hover:border-blue-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Operational Flow</span>
              <Badge variant="outline" className={`text-[10px] font-mono ${currentReport.netOperationalCashFlow >= 0 ? "border-emerald-500 text-emerald-600" : "border-rose-500 text-rose-600"}`}>
                {currentReport.netOperationalCashFlow >= 0 ? "Positive Flow" : "Negative Flow"}
              </Badge>
            </div>
            <div className={`text-xl font-bold font-mono mt-1 ${currentReport.netOperationalCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {currentReport.netOperationalCashFlow >= 0 ? "+" : ""}{formatMoney(currentReport.netOperationalCashFlow)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Inflows – Outflows (External Only)
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onMetricClick(`cashflow:closing_balance:${currentReport.currency}`, "Treasury Cash Balance")}
          className="cursor-pointer hover:border-blue-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ending Cash Balance</span>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {formatMoney(currentReport.closingCashBalance)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Across all {currentReport.currency} accounts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Internal Transfer & Currency Exchange Exclusion Note */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex items-start gap-3">
        <ArrowRightLeft className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-900 dark:text-amber-200">
            Accounting Integrity: Internal Transfers & Currency Exchanges Strictly Segregated
          </span>
          <p className="text-amber-700 dark:text-amber-400 mt-0.5">
            Internal transfers ({formatMoney(currentReport.internalTransfersVolume)}) and FX currency swaps ({formatMoney(currentReport.currencyExchangeVolume)}) shift liquidity between company bank accounts and cash boxes, but do not create external operational income or expenses. They are strictly excluded from Net Operational Cash Flow to guarantee accounting invariance.
          </p>
        </div>
      </div>

      {/* Treasury Accounts Breakdown Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Account Balance Movements ({currentReport.currency})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Opening Balance + Money Received - Money Disbursed = Ending Balance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="text-left py-2.5 px-4 font-bold">Account Name & Type</th>
                  <th className="text-right py-2.5 px-4 font-bold">Opening Balance</th>
                  <th className="text-right py-2.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">Money In (+)</th>
                  <th className="text-right py-2.5 px-4 font-bold text-rose-600 dark:text-rose-400">Money Out (-)</th>
                  <th className="text-right py-2.5 px-4 font-bold">Ending Balance</th>
                  <th className="text-center py-2.5 px-4 font-bold w-16">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {currentReport.accountBreakdown.map((acc) => (
                  <tr key={acc.accountId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{acc.accountName}</div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase">{acc.accountType}</div>
                    </td>
                    <td className="text-right py-2.5 px-4 font-mono font-medium">{formatMoney(acc.openingBalance)}</td>
                    <td className="text-right py-2.5 px-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(acc.moneyIn)}
                    </td>
                    <td className="text-right py-2.5 px-4 font-mono font-medium text-rose-600 dark:text-rose-400">
                      -{formatMoney(acc.moneyOut)}
                    </td>
                    <td className="text-right py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatMoney(acc.closingBalance)}
                    </td>
                    <td className="text-center py-2.5 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMetricClick(`treasury:account:${acc.accountId}`, `${acc.accountName} Transactions`)}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
