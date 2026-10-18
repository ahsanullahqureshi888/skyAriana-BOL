"use client"

import React from "react"
import {
  Building2,
  TrendingUp,
  Landmark,
  ChevronRight,
  Package,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BranchPerformanceRow } from "@/lib/types/management-reporting"

interface TabProps {
  branches: BranchPerformanceRow[]
  onMetricClick: (metricId: string, title: string) => void
}

export function BranchesPerformanceTab({ branches, onMetricClick }: TabProps) {
  const formatMoney = (amount: number, curr = "USD") => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Branch & Terminal Operations Performance
            </h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-500/30 text-[11px] font-mono">
              Multi-Branch Hubs
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational contribution, managed shipments, and localized treasury cash holdings
          </p>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {branches.map((b) => (
          <Card key={b.branchId} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {b.branchName} Hub
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {b.shipmentsManaged} Shipments
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Gross Revenue:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatMoney(b.revenue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Direct Shipment Costs:</span>
                <span className="font-mono font-medium text-rose-600 dark:text-rose-400">-{formatMoney(b.directCosts)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Gross Margin:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(b.grossProfit)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Branch Overhead & Pay:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">-{formatMoney(b.operatingExpenses + b.payroll)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800 pt-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded">
                <span className="font-bold text-blue-950 dark:text-blue-100">Contribution:</span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{formatMoney(b.operatingContribution)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>Treasury Cash ({b.activeTreasuryAccountsCount} accts):</span>
                <span className="font-mono font-semibold">{formatMoney(b.treasuryCashBalance)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparative Branch Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Comparative Branch Performance Register
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="text-left py-2.5 px-4 font-bold">Branch Name</th>
                  <th className="text-center py-2.5 px-3 font-bold">Shipments</th>
                  <th className="text-right py-2.5 px-3 font-bold">Revenue</th>
                  <th className="text-right py-2.5 px-3 font-bold text-rose-600">Direct Cost</th>
                  <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Gross Profit</th>
                  <th className="text-right py-2.5 px-3 font-bold">Overhead</th>
                  <th className="text-right py-2.5 px-3 font-bold text-blue-600">Contribution</th>
                  <th className="text-right py-2.5 px-4 font-bold">Treasury Holdings</th>
                  <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {branches.map((b) => (
                  <tr key={b.branchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{b.branchName} Hub</td>
                    <td className="text-center py-2.5 px-3 font-mono">{b.shipmentsManaged}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(b.revenue)}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">{formatMoney(b.directCosts)}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(b.grossProfit)}</td>
                    <td className="text-right py-2.5 px-3 font-mono">{formatMoney(b.operatingExpenses + b.payroll)}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{formatMoney(b.operatingContribution)}</td>
                    <td className="text-right py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{formatMoney(b.treasuryCashBalance)}</td>
                    <td className="text-center py-2.5 px-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMetricClick(`branch:${b.branchName}`, `${b.branchName} Hub Breakdown`)}
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
