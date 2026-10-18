"use client"

import React, { useState } from "react"
import {
  TrendingUp,
  MapPin,
  Users,
  Package,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  RoutePerformanceRow,
  ShipmentProfitabilityRow,
  CustomerProfitabilityRow
} from "@/lib/types/management-reporting"

interface TabProps {
  routes: RoutePerformanceRow[]
  shipments: ShipmentProfitabilityRow[]
  customers: CustomerProfitabilityRow[]
  onMetricClick: (metricId: string, title: string) => void
}

export function ProfitabilityReportTab({ routes, shipments, customers, onMetricClick }: TabProps) {
  const [subView, setSubView] = useState<"routes" | "customers" | "shipments">("routes")
  const [searchTerm, setSearchTerm] = useState<string>("")

  const formatMoney = (amount: number, curr = "USD") => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Filtered views
  const filteredRoutes = routes.filter((r) =>
    searchTerm ? r.routeName.toLowerCase().includes(searchTerm.toLowerCase()) : true
  )

  const filteredCustomers = customers.filter((c) =>
    searchTerm ? c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) : true
  )

  const filteredShipments = shipments.filter((s) =>
    searchTerm
      ? s.bolNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  )

  // Quality banner count
  const incompleteCostCount = shipments.filter((s) => s.status === "COST_INCOMPLETE").length

  return (
    <div className="space-y-6">
      {/* Header and Subview Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Profitability & Contribution Analytics
            </h3>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-500/30 text-[11px] font-mono">
              Margin Integrity Enforced
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gross Margin = (Revenue - Direct Shipment Costs) / Revenue
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSubView("routes")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subView === "routes"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Route Margins ({routes.length})
          </button>
          <button
            onClick={() => setSubView("customers")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subView === "customers"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Customer Margins ({customers.length})
          </button>
          <button
            onClick={() => setSubView("shipments")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subView === "shipments"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Shipment / BOL Margins ({shipments.length})
          </button>
        </div>
      </div>

      {/* Incomplete Cost Warning Banner */}
      {incompleteCostCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-200">
              Data Quality Notice: {incompleteCostCount} Shipments have Unposted Direct Costs
            </span>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              These shipments have finalized customer invoices but missing supplier/carrier bills. They are flagged as <span className="font-mono font-bold text-amber-900">COST INCOMPLETE</span> to prevent showing misleading 100% gross profit margins to executive management.
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={`Search ${subView}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing {subView === "routes" ? filteredRoutes.length : subView === "customers" ? filteredCustomers.length : filteredShipments.length} records
        </div>
      </div>

      {/* 1. ROUTE PROFITABILITY VIEW */}
      {subView === "routes" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="text-left py-2.5 px-4 font-bold">Transit Route</th>
                    <th className="text-center py-2.5 px-3 font-bold">Shipments</th>
                    <th className="text-right py-2.5 px-3 font-bold">Total Revenue</th>
                    <th className="text-right py-2.5 px-3 font-bold text-rose-600">Direct Costs</th>
                    <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Gross Profit</th>
                    <th className="text-right py-2.5 px-3 font-bold">Margin %</th>
                    <th className="text-right py-2.5 px-3 font-bold">Avg Rev / Shpmt</th>
                    <th className="text-center py-2.5 px-3 font-bold">Transit Time</th>
                    <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredRoutes.map((r) => (
                    <tr key={r.routeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{r.routeName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>Via {r.borderStations.join(", ")}</span>
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono font-medium">
                        {r.shipmentsCount} {r.containersCount > 0 && <span className="text-slate-400">({r.containersCount} CTR)</span>}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(r.revenue)}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium text-rose-600 dark:text-rose-400">
                        {formatMoney(r.directCosts)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(r.grossProfit)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold">
                        <Badge variant="outline" className={`text-[10px] font-mono ${r.grossMarginPct >= 25 ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}`}>
                          {r.grossMarginPct}%
                        </Badge>
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {formatMoney(r.avgRevenuePerShipment)}
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {r.avgTransitDays} days
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMetricClick(`route:${r.routeId}`, `${r.routeName} Shipments`)}
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
      )}

      {/* 2. CUSTOMER PROFITABILITY VIEW */}
      {subView === "customers" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="text-left py-2.5 px-4 font-bold">Customer Name</th>
                    <th className="text-center py-2.5 px-3 font-bold">Shipments</th>
                    <th className="text-right py-2.5 px-3 font-bold">Revenue</th>
                    <th className="text-right py-2.5 px-3 font-bold text-rose-600">Direct Cost</th>
                    <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Gross Margin</th>
                    <th className="text-right py-2.5 px-3 font-bold">Margin %</th>
                    <th className="text-right py-2.5 px-3 font-bold">Collected</th>
                    <th className="text-right py-2.5 px-3 font-bold text-amber-600">Receivable</th>
                    <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredCustomers.map((c) => (
                    <tr key={c.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{c.customerName}</div>
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono font-medium">
                        {c.shipmentsCount} {c.containersCount > 0 && <span className="text-slate-400">({c.containersCount} CTR)</span>}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(c.revenue)}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium text-rose-600 dark:text-rose-400">
                        {formatMoney(c.directCosts)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(c.grossProfit)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold">
                        <Badge variant="outline" className={`text-[10px] font-mono ${c.grossMarginPct >= 20 ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}`}>
                          {c.grossMarginPct}%
                        </Badge>
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                        {formatMoney(c.paymentsReceived)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(c.outstandingReceivable)}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMetricClick(`customer:${c.customerId}`, `${c.customerName} Margin Breakdown`)}
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
      )}

      {/* 3. SHIPMENT / BOL PROFITABILITY VIEW */}
      {subView === "shipments" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="text-left py-2.5 px-4 font-bold">BOL Number & Route</th>
                    <th className="text-left py-2.5 px-3 font-bold">Customer</th>
                    <th className="text-center py-2.5 px-3 font-bold">Data Status</th>
                    <th className="text-right py-2.5 px-3 font-bold">Revenue</th>
                    <th className="text-right py-2.5 px-3 font-bold text-rose-600">Direct Cost</th>
                    <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Gross Profit</th>
                    <th className="text-right py-2.5 px-3 font-bold">Margin %</th>
                    <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredShipments.map((s) => (
                    <tr key={s.bolId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{s.bolNumber}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{s.route}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {s.customerName}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {s.status === "COMPLETE" && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                            Complete
                          </Badge>
                        )}
                        {s.status === "COST_INCOMPLETE" && (
                          <Badge variant="destructive" className="bg-amber-500 text-white text-[10px] font-bold">
                            Cost Incomplete
                          </Badge>
                        )}
                        {s.status === "REVENUE_NOT_POSTED" && (
                          <Badge variant="outline" className="text-rose-600 border-rose-400 text-[10px]">
                            No Revenue
                          </Badge>
                        )}
                        {s.status === "PENDING_APPROVAL" && (
                          <Badge variant="outline" className="text-slate-500 text-[10px]">
                            Draft
                          </Badge>
                        )}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(s.revenue)}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium text-rose-600 dark:text-rose-400">
                        {formatMoney(s.directCost)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(s.grossProfit)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold">
                        <Badge variant="outline" className={`text-[10px] font-mono ${s.marginPct >= 25 ? "border-emerald-500 text-emerald-600" : "border-slate-400 text-slate-600"}`}>
                          {s.marginPct}%
                        </Badge>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMetricClick(`shipment:${s.bolNumber}`, `${s.bolNumber} Margin Breakdown`)}
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
      )}
    </div>
  )
}
