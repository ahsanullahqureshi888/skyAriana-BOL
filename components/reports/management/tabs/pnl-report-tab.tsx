"use client"

import React, { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProfitAndLossReport, PnLCurrencyReport } from "@/lib/types/management-reporting"

interface TabProps {
  data: ProfitAndLossReport | null
  onMetricClick: (metricId: string, title: string) => void
  selectedCurrency?: string
}

export function PnLReportTab({ data, onMetricClick, selectedCurrency = "ALL" }: TabProps) {
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<string>("USD")

  if (!data) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading Profit & Loss statement...</div>
  }

  // Filter currency reports based on selected currency
  const availableCurrencies = data.currencyReports.map((c) => c.currency)
  const currentReport =
    data.currencyReports.find((c) => c.currency === activeCurrencyTab) ||
    data.currencyReports[0]

  if (!currentReport) {
    return <div className="py-12 text-center text-xs text-slate-500">No P&L data recorded for this period.</div>
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
              Profit & Loss Statement (Multi-Currency)
            </h3>
            {data.isClosedPeriod ? (
              <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 text-[11px] flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3 w-3" /> Audited Snapshot Locked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[11px] font-mono">
                Live Open Period
              </Badge>
            )}
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
              {curr} Ledger
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          onClick={() => onMetricClick(`pnl:revenue:${currentReport.currency}`, "Gross Revenue")}
          className="cursor-pointer hover:border-blue-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {formatMoney(currentReport.revenue.totalRevenue)}
            </div>
            {currentReport.comparison && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+{currentReport.comparison.revenueVariancePct}% vs Prior Period</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() => onMetricClick(`pnl:direct_cost:${currentReport.currency}`, "Direct Operational Costs")}
          className="cursor-pointer hover:border-blue-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Direct Shipment Costs</span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatMoney(currentReport.directCosts.totalDirectCosts)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Carriers, Border, Transit & Port
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onMetricClick(`pnl:gross_profit:${currentReport.currency}`, "Gross Profit Margin")}
          className="cursor-pointer hover:border-blue-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Gross Profit</span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500 text-emerald-600 dark:text-emerald-400">
                {currentReport.grossMarginPct}% Margin
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatMoney(currentReport.grossProfit)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Revenue – Direct Leg Costs
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => onMetricClick(`pnl:operating_profit:${currentReport.currency}`, "Net Operating Profit")}
          className="cursor-pointer hover:border-blue-400 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Operating Profit</span>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500 text-blue-600 dark:text-blue-400">
                {currentReport.operatingMarginPct}% Margin
              </Badge>
            </div>
            <div className={`text-xl font-bold font-mono mt-1 ${currentReport.operatingProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatMoney(currentReport.operatingProfit)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Gross Profit – Overhead & Payroll
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Income Statement Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Detailed Income & Expense Schedule ({currentReport.currency})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Accounting invariance: Gross Profit = Revenue - Direct Costs; Operating Profit = Gross Profit - Operating Expenses
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-slate-300 dark:border-slate-700"
                onClick={() => window.print()}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Export / Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="text-left py-2.5 px-4 font-bold">Account / Category</th>
                  <th className="text-right py-2.5 px-4 font-bold">Current Period ({currentReport.currency})</th>
                  <th className="text-right py-2.5 px-4 font-bold">Prior Period</th>
                  <th className="text-right py-2.5 px-4 font-bold">Variance</th>
                  <th className="text-right py-2.5 px-4 font-bold">Variance %</th>
                  <th className="text-center py-2.5 px-4 font-bold w-16">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {/* 1. REVENUE SECTION */}
                <tr className="bg-blue-50/40 dark:bg-blue-950/20 font-bold text-blue-900 dark:text-blue-300">
                  <td colSpan={6} className="py-2 px-4 uppercase tracking-wider text-[11px]">
                    1. Operating Revenue (Accrual Invoices)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Ocean & Land Freight Revenue</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.revenue.freightRevenue)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:freight_revenue:${currentReport.currency}`, "Freight Revenue Line Items")}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Documentation & Border Clearance Fees</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.revenue.documentationRevenue)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:documentation_revenue:${currentReport.currency}`, "Documentation Revenue Line Items")}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Port Handling & Terminal Charges</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.revenue.handlingRevenue)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:handling_revenue:${currentReport.currency}`, "Handling Revenue Line Items")}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="bg-blue-50/30 dark:bg-blue-950/30 font-bold border-t border-b border-blue-200 dark:border-blue-900">
                  <td className="py-2.5 px-4 text-blue-900 dark:text-blue-300">TOTAL OPERATING REVENUE</td>
                  <td className="text-right py-2.5 px-4 font-mono text-blue-900 dark:text-blue-300 text-sm">
                    {formatMoney(currentReport.revenue.totalRevenue)}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-500">
                    {currentReport.comparison ? formatMoney(currentReport.comparison.revenuePrior) : "-"}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {currentReport.comparison ? `+${formatMoney(currentReport.comparison.revenueVarianceAbs)}` : "-"}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {currentReport.comparison ? `+${currentReport.comparison.revenueVariancePct}%` : "-"}
                  </td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:revenue:${currentReport.currency}`, "Total Revenue Drill-down")}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>

                {/* 2. DIRECT COSTS SECTION */}
                <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-bold text-rose-900 dark:text-rose-300">
                  <td colSpan={6} className="py-2 px-4 uppercase tracking-wider text-[11px]">
                    2. Direct Logistics & Transportation Costs (Cost of Goods Sold)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Shipping Line Container Slot Rates</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.directCosts.shippingLineCosts)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:shipping_line_costs:${currentReport.currency}`, "Shipping Line Cost Line Items")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Truck Freight & Border Transit Drivers</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.directCosts.truckCosts)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:truck_costs:${currentReport.currency}`, "Truck Rent Line Items")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Port Stevedoring, Wharfage & Storage</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.directCosts.portCosts)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:port_costs:${currentReport.currency}`, "Port Cost Line Items")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Border Customs & Transit Escort Clearance</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.directCosts.customsTransitCosts)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:customs_costs:${currentReport.currency}`, "Customs Cost Line Items")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="bg-rose-50/30 dark:bg-rose-950/30 font-bold border-t border-b border-rose-200 dark:border-rose-900">
                  <td className="py-2.5 px-4 text-rose-900 dark:text-rose-300">TOTAL DIRECT COSTS</td>
                  <td className="text-right py-2.5 px-4 font-mono text-rose-900 dark:text-rose-300 text-sm">
                    {formatMoney(currentReport.directCosts.totalDirectCosts)}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-500">
                    {currentReport.comparison ? formatMoney(currentReport.comparison.directCostsPrior) : "-"}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {currentReport.comparison ? `+${formatMoney(currentReport.comparison.directCostsVarianceAbs)}` : "-"}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {currentReport.comparison ? `+${currentReport.comparison.directCostsVariancePct}%` : "-"}
                  </td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:direct_costs:${currentReport.currency}`, "Direct Costs Drill-down")}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>

                {/* 3. GROSS PROFIT HIGHLIGHT */}
                <tr className="bg-emerald-100/50 dark:bg-emerald-950/40 font-black border-y-2 border-emerald-400 dark:border-emerald-600">
                  <td className="py-3 px-4 text-emerald-950 dark:text-emerald-200 text-sm">
                    GROSS PROFIT (Margin: {currentReport.grossMarginPct}%)
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400 text-base">
                    {formatMoney(currentReport.grossProfit)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {currentReport.comparison ? formatMoney(currentReport.comparison.grossProfitPrior) : "-"}
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                    {currentReport.comparison ? `+${formatMoney(currentReport.comparison.grossProfitVarianceAbs)}` : "-"}
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                    {currentReport.comparison ? `+${currentReport.comparison.grossProfitVariancePct}%` : "-"}
                  </td>
                  <td className="text-center py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:gross_profit:${currentReport.currency}`, "Gross Profit Calculation")}
                      className="h-6 w-6 p-0 text-emerald-700 dark:text-emerald-400"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>

                {/* 4. OPERATING EXPENSES SECTION */}
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200">
                  <td colSpan={6} className="py-2 px-4 uppercase tracking-wider text-[11px]">
                    3. Operating Expenses & Administrative Overhead
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Terminal & Office Lease / Rent</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.operatingExpenses.officeRent)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`expense:office_rent:${currentReport.currency}`, "Rent Vouchers")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                {currentReport.operatingExpenses.payroll > 0 && (
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-6 font-medium flex items-center gap-1.5">
                      <span>Staff Salaries & Direct Compensation</span>
                      <Badge variant="outline" className="text-[9px] px-1 h-4 border-slate-300">
                        Role-Protected
                      </Badge>
                    </td>
                    <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.operatingExpenses.payroll)}</td>
                    <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                    <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                    <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                    <td className="text-center py-2.5 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMetricClick(`payroll:summary:${currentReport.currency}`, "Payroll Breakdown")}
                        className="h-6 w-6 p-0 text-blue-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Utilities, Power & Communications</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.operatingExpenses.utilities)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`expense:utilities:${currentReport.currency}`, "Utilities Vouchers")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Cloud Infrastructure & IT Software</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.operatingExpenses.it)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`expense:it:${currentReport.currency}`, "IT Expenses")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-6 font-medium">Bank Wire Transfer & Exchange Handling Fees</td>
                  <td className="text-right py-2.5 px-4 font-mono font-semibold">{formatMoney(currentReport.operatingExpenses.bankCharges)}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-400">-</td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`expense:bank_charges:${currentReport.currency}`, "Bank Fee Vouchers")}
                      className="h-6 w-6 p-0 text-blue-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="bg-slate-100/50 dark:bg-slate-800/50 font-bold border-t border-b border-slate-300 dark:border-slate-700">
                  <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">TOTAL OPERATING EXPENSES</td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-800 dark:text-slate-200 text-sm">
                    {formatMoney(currentReport.operatingExpenses.totalOperatingExpenses)}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-500">
                    {currentReport.comparison ? formatMoney(currentReport.comparison.expensesPrior) : "-"}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {currentReport.comparison ? `+${formatMoney(currentReport.comparison.expensesVarianceAbs)}` : "-"}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {currentReport.comparison ? `+${currentReport.comparison.expensesVariancePct}%` : "-"}
                  </td>
                  <td className="text-center py-2.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:expenses:${currentReport.currency}`, "Operating Expenses Drill-down")}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>

                {/* 5. NET OPERATING PROFIT HIGHLIGHT */}
                <tr className="bg-blue-100/60 dark:bg-blue-950/60 font-black border-t-2 border-b-2 border-blue-500 dark:border-blue-500">
                  <td className="py-3.5 px-4 text-blue-950 dark:text-blue-100 text-sm">
                    NET OPERATING PROFIT (EBIT) — Margin: {currentReport.operatingMarginPct}%
                  </td>
                  <td className={`text-right py-3.5 px-4 font-mono text-base ${currentReport.operatingProfit >= 0 ? "text-blue-700 dark:text-blue-300" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatMoney(currentReport.operatingProfit)}
                  </td>
                  <td className="text-right py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {currentReport.comparison ? formatMoney(currentReport.comparison.operatingProfitPrior) : "-"}
                  </td>
                  <td className="text-right py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {currentReport.comparison ? `+${formatMoney(currentReport.comparison.operatingProfitVarianceAbs)}` : "-"}
                  </td>
                  <td className="text-right py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {currentReport.comparison ? `+${currentReport.comparison.operatingProfitVariancePct}%` : "-"}
                  </td>
                  <td className="text-center py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMetricClick(`pnl:operating_profit:${currentReport.currency}`, "Net Operating Profit Formula")}
                      className="h-6 w-6 p-0 text-blue-700 dark:text-blue-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
