"use client"

import React, { useState } from "react"
import {
  Calendar,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MonthlyComparisonRow } from "@/lib/types/management-reporting"

interface TabProps {
  monthlyData: MonthlyComparisonRow[]
  onMetricClick: (metricId: string, title: string) => void
}

export function MonthlyYtdTab({ monthlyData, onMetricClick }: TabProps) {
  const formatMoney = (amount: number, curr = "USD") => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Calculate YTD totals
  const ytdRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0)
  const ytdDirectCost = monthlyData.reduce((sum, m) => sum + m.directCost, 0)
  const ytdGrossProfit = monthlyData.reduce((sum, m) => sum + m.grossProfit, 0)
  const ytdExpenses = monthlyData.reduce((sum, m) => sum + m.operatingExpenses + m.payroll, 0)
  const ytdOperatingProfit = monthlyData.reduce((sum, m) => sum + m.operatingProfit, 0)
  const ytdGrossMargin = ytdRevenue > 0 ? ((ytdGrossProfit / ytdRevenue) * 100).toFixed(1) : "0.0"
  const ytdOperatingMargin = ytdRevenue > 0 ? ((ytdOperatingProfit / ytdRevenue) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              12-Month Comparison & Year-to-Date (YTD) Summary
            </h3>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-500/30 text-[11px] font-mono">
              Fiscal Year 2026
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sequential monthly performance, margin trends, and cumulative fiscal metrics
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-700"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
          Print Fiscal Statement
        </Button>
      </div>

      {/* YTD Cumulative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">YTD Gross Revenue</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {formatMoney(ytdRevenue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cumulative Jan–Sep 2026</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">YTD Gross Profit</span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500 text-emerald-600">
                {ytdGrossMargin}%
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatMoney(ytdGrossProfit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Revenue – Direct Carrier Costs</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">YTD Operating Overhead</span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {formatMoney(ytdExpenses)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Rent, Utilities, IT & Payroll</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">YTD Net Operating Profit</span>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500 text-blue-600">
                {ytdOperatingMargin}%
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {formatMoney(ytdOperatingProfit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Operating Earnings (EBIT)</div>
          </CardContent>
        </Card>
      </div>

      {/* 12-Month Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Monthly Performance Table (USD Base)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Closed months display audited snapshot seals; open current month updates live.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="text-left py-2.5 px-4 font-bold">Month</th>
                  <th className="text-center py-2.5 px-3 font-bold">Status</th>
                  <th className="text-center py-2.5 px-3 font-bold">Shipments</th>
                  <th className="text-right py-2.5 px-3 font-bold">Revenue</th>
                  <th className="text-right py-2.5 px-3 font-bold text-rose-600">Direct Cost</th>
                  <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Gross Profit</th>
                  <th className="text-right py-2.5 px-3 font-bold">Overhead</th>
                  <th className="text-right py-2.5 px-3 font-bold text-blue-600">Operating Profit</th>
                  <th className="text-right py-2.5 px-3 font-bold">Collected</th>
                  <th className="text-right py-2.5 px-3 font-bold">Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {monthlyData.map((m) => (
                  <tr key={m.monthCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {m.monthName}
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {m.isClosed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-mono flex items-center gap-0.5 justify-center">
                          <ShieldCheck className="h-2.5 w-2.5" /> Closed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-400 text-[9px] font-mono">
                          Open
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono">{m.shipmentsCount}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(m.revenue)}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">{formatMoney(m.directCost)}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(m.grossProfit)}</td>
                    <td className="text-right py-2.5 px-3 font-mono">{formatMoney(m.operatingExpenses + m.payroll)}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{formatMoney(m.operatingProfit)}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(m.customerReceipts)}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">{formatMoney(m.supplierPayments)}</td>
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
