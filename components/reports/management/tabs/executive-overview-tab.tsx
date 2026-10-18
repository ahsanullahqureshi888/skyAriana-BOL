"use client"

import React from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  PackageCheck,
  AlertTriangle,
  Building2,
  Clock,
  ShieldCheck,
  FileText,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExecutiveDashboardData, ExecutiveKpiCard } from "@/lib/types/management-reporting"

interface TabProps {
  data: ExecutiveDashboardData | null
  onMetricClick: (metricId: string, title: string) => void
}

export function ExecutiveOverviewTab({ data, onMetricClick }: TabProps) {
  if (!data) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading executive overview...</div>
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP: Key Executive KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Executive Performance Indicators — {data.periodLabel}
          </h3>
          <Badge variant="outline" className="text-[11px] font-mono border-blue-500 text-blue-600 dark:text-blue-400">
            Live Posted Data
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.kpis.map((kpi) => (
            <Card
              key={kpi.id}
              onClick={() => onMetricClick(kpi.drilldownKey, kpi.title)}
              className="cursor-pointer transition-all hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{kpi.title}</span>
                  {kpi.badgeText && (
                    <Badge variant={kpi.badgeVariant as any || "outline"} className="text-[10px] h-5 px-1.5 font-bold">
                      {kpi.badgeText}
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {kpi.currency ? `${kpi.currency} ` : ""}
                    {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
                  </div>
                  {kpi.changePct !== undefined && (
                    <div
                      className={`flex items-center text-xs font-bold ${
                        kpi.changeDirection === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {kpi.changeDirection === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      <span>{Math.abs(kpi.changePct)}%</span>
                    </div>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{kpi.periodLabel}</span>
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline text-[10px]">
                    Trace records <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 2. SECOND: Financial & Multi-Currency Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.currencySummaries.map((c) => (
          <Card key={c.currency} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  <span>{c.currency} Financial Summary</span>
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {c.currency}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Accrual revenue vs direct costs and cash balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Revenue (Invoiced)</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {c.currency} {c.revenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Direct Shipment Costs</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {c.currency} {c.directCosts.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-1 rounded">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Gross Profit</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {c.currency} {c.grossProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Operating Expenses & Payroll</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {c.currency} {c.operatingExpenses.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 px-1 rounded">
                <span className="font-bold text-blue-950 dark:text-blue-300">Operating Profit</span>
                <span className="font-black text-blue-700 dark:text-blue-400 font-mono">
                  {c.currency} {c.operatingProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 pt-2">
                <span className="text-slate-500 font-semibold">Treasury Cash Available</span>
                <span className="font-black text-slate-900 dark:text-white font-mono">
                  {c.currency} {c.cashBalance.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. THIRD: Attention Required & Risk Alerts */}
      {data.attentionItems.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Attention & Operational Alerts ({data.attentionItems.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.attentionItems.map((att) => (
              <div
                key={att.id}
                className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                  att.severity === "CRITICAL"
                    ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200"
                }`}
              >
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${att.severity === "CRITICAL" ? "text-rose-600" : "text-amber-600"}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>{att.title}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {att.reference}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">{att.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FOURTH: Data Quality Completeness Panel */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Data Completeness Score: {data.dataQuality.qualityScorePct}%
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Audited against {data.dataQuality.totalShipmentsAnalyzed} shipment records in current period
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="text-slate-400 block">Missing Cost Records</span>
              <span className={`font-bold ${data.dataQuality.costIncompleteCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.dataQuality.costIncompleteCount} shipments
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Unposted Revenue</span>
              <span className={`font-bold ${data.dataQuality.revenueNotPostedCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.dataQuality.revenueNotPostedCount} shipments
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Unallocated Receipts</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {data.dataQuality.unallocatedPaymentsCount} payments
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
