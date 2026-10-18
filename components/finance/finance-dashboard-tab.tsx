"use client"

import React from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/utils/money"
import type { FinanceOverviewKPIs } from "@/lib/types/finance"

interface FinanceDashboardTabProps {
  overview: FinanceOverviewKPIs | null
  activeCurrency: string
  onSelectCurrency: (curr: string) => void
  onNavigateTab: (tab: string) => void
}

export function FinanceDashboardTab({
  overview,
  activeCurrency,
  onSelectCurrency,
  onNavigateTab,
}: FinanceDashboardTabProps) {
  if (!overview) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading financial control center data...
      </div>
    )
  }

  const currencies = ["USD", "AED", "AFN", "EUR"]
  const currentTotal = overview.currencyTotals[activeCurrency] || {
    currency: activeCurrency,
    totalReceivable: 0,
    totalPayable: 0,
    netBalance: 0,
    overdueAmount: 0,
    todayReceived: 0,
    todayPaid: 0,
  }

  return (
    <div className="space-y-6">
      {/* Currency Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Primary Currency View:
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
            className="h-8 gap-1.5 text-xs font-semibold"
            onClick={() => onNavigateTab("invoices")}
          >
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            + New Invoice
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
            onClick={() => onNavigateTab("payments")}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Main KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Receivable */}
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Total Receivable ({activeCurrency})
            </CardTitle>
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/50">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {formatMoney(currentTotal.totalReceivable, activeCurrency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Customer ledger balances due
            </p>
          </CardContent>
        </Card>

        {/* Total Payable */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Total Payable ({activeCurrency})
            </CardTitle>
            <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/50">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {formatMoney(currentTotal.totalPayable, activeCurrency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Suppliers, shipping lines & truck costs
            </p>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Overdue Receivables
            </CardTitle>
            <div className="rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-950/50">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatMoney(currentTotal.overdueAmount, activeCurrency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {overview.overdueInvoiceCount} invoice(s) past due date
            </p>
          </CardContent>
        </Card>

        {/* Today's Receipts */}
        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Today's Receipts
            </CardTitle>
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/50">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(currentTotal.todayReceived, activeCurrency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Bank transfers & cash collected today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Currency Segregated Summary Grid */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Multi-Currency Position (Strict Currency Segregation)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {currencies.map((c) => {
              const item = overview.currencyTotals[c] || {
                totalReceivable: 0,
                totalPayable: 0,
                netBalance: 0,
              }
              return (
                <div
                  key={c}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {c} Ledger
                    </span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Active
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Receivable:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(item.totalReceivable, c)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payable:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(item.totalPayable, c)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold dark:border-slate-800">
                      <span className="text-slate-700 dark:text-slate-300">Net Position:</span>
                      <span
                        className={
                          item.netBalance >= 0 ? "text-blue-600" : "text-rose-600"
                        }
                      >
                        {formatMoney(item.netBalance, c)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attention & Action Alerts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          onClick={() => onNavigateTab("outstanding")}
          className="flex cursor-pointer items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 p-4 transition-all hover:bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/10"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-rose-600" />
            <div>
              <div className="text-sm font-bold text-rose-900 dark:text-rose-300">
                {overview.overdueInvoiceCount} Overdue Invoices
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-400">
                Click to view outstanding aging buckets
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-600 underline">Review →</span>
        </div>

        <div
          onClick={() => onNavigateTab("reconciliation")}
          className="flex cursor-pointer items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-4 transition-all hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/10"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                {overview.unmatchedPaymentCount} Unallocated Receipts
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                Payments with open customer credit
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-600 underline">Allocate →</span>
        </div>

        <div
          onClick={() => onNavigateTab("shipment_finance")}
          className="flex cursor-pointer items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-4 transition-all hover:bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/10"
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm font-bold text-blue-900 dark:text-blue-300">
                {overview.openShipmentFinanceCount} Open Shipments
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-400">
                Track revenue vs supplier direct costs
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 underline">Inspect →</span>
        </div>
      </div>
    </div>
  )
}
