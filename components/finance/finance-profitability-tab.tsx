"use client"

import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  Percent,
  Search,
  Building2,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  RefreshCw,
  Route,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/utils/money"
import type {
  ShipmentFinanceRecord,
  BolFinancialSummary,
  ProfitByCustomer,
  MonthlyProfitSummary,
  LossMakingShipment,
  RouteCostTemplate,
} from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceProfitabilityTabProps {
  shipmentFinances: ShipmentFinanceRecord[]
  activeCurrency: string
  onSelectCurrency: (curr: string) => void
}

type ProfitDimension = "bol" | "customer" | "monthly" | "loss-makers" | "templates"

export function FinanceProfitabilityTab({
  shipmentFinances,
  activeCurrency,
  onSelectCurrency,
}: FinanceProfitabilityTabProps) {
  const [dimension, setDimension] = useState<ProfitDimension>("bol")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Remote data states
  const [bolSummaries, setBolSummaries] = useState<BolFinancialSummary[]>([])
  const [customerProfits, setCustomerProfits] = useState<ProfitByCustomer[]>([])
  const [monthlyProfits, setMonthlyProfits] = useState<MonthlyProfitSummary[]>([])
  const [lossMakers, setLossMakers] = useState<LossMakingShipment[]>([])
  const [templates, setTemplates] = useState<RouteCostTemplate[]>([])

  const currencies = ["USD", "AED", "AFN", "EUR"]

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [bolsRes, custRes, monthRes, lossRes, tempRes] = await Promise.all([
        fetch(`/api/finance/profitability?view=bols&currency=${activeCurrency}`).then((r) => r.json()),
        fetch(`/api/finance/profitability?view=customers&currency=${activeCurrency}`).then((r) => r.json()),
        fetch(`/api/finance/profitability?view=monthly&currency=${activeCurrency}`).then((r) => r.json()),
        fetch(`/api/finance/profitability?view=loss-makers&currency=${activeCurrency}`).then((r) => r.json()),
        fetch(`/api/finance/profitability?view=templates&currency=${activeCurrency}`).then((r) => r.json()),
      ])

      if (bolsRes.success) setBolSummaries(bolsRes.data || [])
      if (custRes.success) setCustomerProfits(custRes.data || [])
      if (monthRes.success) setMonthlyProfits(monthRes.data || [])
      if (lossRes.success) setLossMakers(lossRes.data || [])
      if (tempRes.success) setTemplates(tempRes.data || [])
    } catch (err: any) {
      console.error("Error loading profitability data:", err)
      toast.error("Failed to load profitability metrics")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeCurrency])

  // Aggregate high-level totals
  const totalRevenue = bolSummaries.reduce((sum, b) => sum + (b.totalCustomerRevenue || 0), 0)
  const totalCost = bolSummaries.reduce((sum, b) => sum + (b.approvedSupplierCost || 0), 0)
  const overallGrossProfit = totalRevenue - totalCost
  const overallMargin =
    totalRevenue > 0 ? ((overallGrossProfit / totalRevenue) * 100).toFixed(1) : "N/A"

  // Filter helpers
  const q = searchQuery.toLowerCase().trim()
  const filteredBols = bolSummaries.filter(
    (b) =>
      !q ||
      b.bolNumber.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.route.toLowerCase().includes(q)
  )
  const filteredCustomers = customerProfits.filter(
    (c) => !q || c.customerName.toLowerCase().includes(q)
  )
  const filteredMonthly = monthlyProfits.filter((m) => !q || m.month.includes(q))
  const filteredLossMakers = lossMakers.filter(
    (l) =>
      !q ||
      l.bolNumber.toLowerCase().includes(q) ||
      l.customerName.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q)
  )

  return (
    <div className="space-y-4">
      {/* Top Controls & Currency Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Currency:
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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 gap-1 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Total Billed Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(totalRevenue, activeCurrency)}
            </div>
            <p className="text-[11px] text-slate-400">{bolSummaries.length} tracked shipments</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Incurred Supplier Costs</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(totalCost, activeCurrency)}
            </div>
            <p className="text-[11px] text-slate-400">Actual vendor expenses</p>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 ${
            overallGrossProfit >= 0 ? "border-l-emerald-500" : "border-l-rose-500"
          } shadow-sm`}
        >
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Net Gross Profit</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div
              className={`text-xl font-black ${
                overallGrossProfit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatMoney(overallGrossProfit, activeCurrency)}
            </div>
            <p className="text-[11px] text-slate-400">Revenue minus cost</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Overall Profit Margin</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {overallMargin !== "N/A" ? `${overallMargin}%` : "N/A"}
            </div>
            <p className="text-[11px] text-slate-400">
              {lossMakers.length} loss-making shipment(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Dimension Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
          <button
            onClick={() => setDimension("bol")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
              dimension === "bol"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            By BOL ({bolSummaries.length})
          </button>
          <button
            onClick={() => setDimension("customer")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
              dimension === "customer"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            By Customer ({customerProfits.length})
          </button>
          <button
            onClick={() => setDimension("monthly")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
              dimension === "monthly"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Monthly Trends
          </button>
          <button
            onClick={() => setDimension("loss-makers")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
              dimension === "loss-makers"
                ? "bg-rose-50 text-rose-700 shadow-sm dark:bg-rose-950/60 dark:text-rose-400"
                : "text-rose-600 hover:text-rose-800 dark:text-rose-400"
            }`}
          >
            Loss-Makers ({lossMakers.length})
          </button>
          <button
            onClick={() => setDimension("templates")}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
              dimension === "templates"
                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Route Cost Templates
          </button>
        </div>

        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* DIMENSION 1: BY BOL */}
      {dimension === "bol" && (
        <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2.5">BOL Number</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Route</th>
                  <th className="px-3 py-2.5 text-right">Revenue</th>
                  <th className="px-3 py-2.5 text-right">Supplier Cost</th>
                  <th className="px-3 py-2.5 text-right">Gross Profit</th>
                  <th className="px-3 py-2.5 text-right">Margin %</th>
                  <th className="px-3 py-2.5 text-right">Net Cash Exposure</th>
                  <th className="px-3 py-2.5 text-center">Profit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBols.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                      No BOL financial summaries found.
                    </td>
                  </tr>
                ) : (
                  filteredBols.map((b) => (
                    <tr key={b.bolNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {b.bolNumber}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {b.customerName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{b.route}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(b.totalCustomerRevenue, b.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {formatMoney(b.approvedSupplierCost, b.currency)}
                        {b.isCostOverrun && (
                          <span
                            className="ml-1 text-[10px] text-amber-600"
                            title="Actual costs exceed estimate"
                          >
                            ⚠️
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold ${
                          b.grossProfit > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : b.grossProfit < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600"
                        }`}
                      >
                        {formatMoney(b.grossProfit, b.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {b.marginPercent !== null ? `${b.marginPercent}%` : "N/A"}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-semibold ${
                          b.netCashExposure >= 0 ? "text-blue-600" : "text-amber-600"
                        }`}
                      >
                        {formatMoney(b.netCashExposure, b.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            b.profitStatus === "PROFITABLE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : b.profitStatus === "LOSS"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : b.profitStatus === "INCOMPLETE DATA"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {b.profitStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DIMENSION 2: BY CUSTOMER */}
      {dimension === "customer" && (
        <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Customer Name</th>
                  <th className="px-3 py-2.5 text-center">Shipments</th>
                  <th className="px-3 py-2.5 text-right">Total Revenue</th>
                  <th className="px-3 py-2.5 text-right">Total Supplier Cost</th>
                  <th className="px-3 py-2.5 text-right">Gross Profit</th>
                  <th className="px-3 py-2.5 text-right">Margin %</th>
                  <th className="px-3 py-2.5 text-right">Receivable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                      No customer profitability records found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {c.customerName}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{c.shipmentCount}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(c.totalRevenue, c.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {formatMoney(c.totalCost, c.currency)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold ${
                          c.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatMoney(c.grossProfit, c.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {c.marginPercent !== null ? `${c.marginPercent}%` : "N/A"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-600">
                        {formatMoney(c.outstandingReceivable, c.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DIMENSION 3: MONTHLY SUMMARY */}
      {dimension === "monthly" && (
        <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Month</th>
                  <th className="px-3 py-2.5 text-right">Revenue</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                  <th className="px-3 py-2.5 text-right">Gross Profit</th>
                  <th className="px-3 py-2.5 text-right">Margin %</th>
                  <th className="px-3 py-2.5 text-right">Customer Collections</th>
                  <th className="px-3 py-2.5 text-right">Supplier Disbursements</th>
                  <th className="px-3 py-2.5 text-right">Receivables</th>
                  <th className="px-3 py-2.5 text-right">Payables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMonthly.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                      No monthly summaries recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredMonthly.map((m) => (
                    <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {m.month}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(m.revenue, m.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {formatMoney(m.cost, m.currency)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold ${
                          m.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatMoney(m.grossProfit, m.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {m.marginPercent !== null ? `${m.marginPercent}%` : "N/A"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-600">
                        {formatMoney(m.customerPayments, m.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-purple-600">
                        {formatMoney(m.supplierPayments, m.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-amber-600">
                        {formatMoney(m.receivables, m.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-rose-600">
                        {formatMoney(m.payables, m.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DIMENSION 4: LOSS-MAKING SHIPMENTS */}
      {dimension === "loss-makers" && (
        <Card className="overflow-hidden border border-rose-200 shadow-sm dark:border-rose-950">
          <div className="bg-rose-50/70 p-3 border-b border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span className="text-xs font-bold text-rose-900 dark:text-rose-300">
              Loss-Making Shipments Audit: Where Supplier Costs Exceeded Customer Revenue
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2.5">BOL Number</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Route</th>
                  <th className="px-3 py-2.5 text-right">Revenue</th>
                  <th className="px-3 py-2.5 text-right">Supplier Cost</th>
                  <th className="px-3 py-2.5 text-right">Loss Amount</th>
                  <th className="px-3 py-2.5">Identified Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLossMakers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-emerald-600 font-semibold">
                      🎉 No loss-making shipments found! All shipments are profitable or breaking even.
                    </td>
                  </tr>
                ) : (
                  filteredLossMakers.map((l) => (
                    <tr key={l.bolNumber} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20">
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        {l.bolNumber}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {l.customerName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{l.route}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {formatMoney(l.revenue, l.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-rose-700 dark:text-rose-400">
                        {formatMoney(l.cost, l.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-rose-600 dark:text-rose-400">
                        -{formatMoney(l.lossAmount, l.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{l.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DIMENSION 5: ROUTE COST TEMPLATES */}
      {dimension === "templates" && (
        <div className="space-y-3">
          <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <strong>Route Cost Templates & Benchmarks:</strong> Standard cost breakdown guides for each transit corridor to ensure no expenses (border transit, port demurrage, driver rent) are omitted when quoting or costing shipments.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="border border-slate-200 shadow-sm dark:border-slate-800">
                <CardHeader className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {tpl.corridorName}
                    </CardTitle>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {tpl.currency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Origin: {tpl.origin} → Dest: {tpl.destination}
                  </p>
                </CardHeader>
                <CardContent className="p-3 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Corridor Transit Legs:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tpl.legs.map((leg, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          {leg}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Mandatory Cost Categories ({tpl.expectedCostCategories.length}):
                    </span>
                    <ul className="mt-1 list-inside list-disc text-[11px] text-slate-600 dark:text-slate-400">
                      {tpl.expectedCostCategories.map((cat, idx) => (
                        <li key={idx}>{cat}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
