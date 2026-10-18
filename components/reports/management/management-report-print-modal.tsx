"use client"

import React from "react"
import { Printer, X, Download, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ProfitAndLossReport,
  ManagementCashFlowReport,
  ReceivablesReport,
  PayablesReport,
  ExecutiveDashboardData
} from "@/lib/types/management-reporting"

interface PrintModalProps {
  isOpen: boolean
  onClose: () => void
  overview: ExecutiveDashboardData | null
  pnl: ProfitAndLossReport | null
  cashflow: ManagementCashFlowReport | null
  receivables: ReceivablesReport | null
  payables: PayablesReport | null
}

export function ManagementReportPrintModal({
  isOpen,
  onClose,
  overview,
  pnl,
  cashflow,
  receivables,
  payables,
}: PrintModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const usdPnl = pnl?.currencyReports.find((r) => r.currency === "USD")
  const usdCash = cashflow?.currencyReports.find((r) => r.currency === "USD")
  const usdRec = receivables?.currencySummaries.find((s) => s.currency === "USD")
  const usdPay = payables?.currencySummaries.find((s) => s.currency === "USD")

  const formatMoney = (val?: number, curr = "USD") => {
    if (val === undefined || val === null) return "$0.00"
    return `${curr} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 my-8 print:my-0 print:p-6 print:border-none print:shadow-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Executive Management Reporting Pack — Print Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-6 text-slate-800 dark:text-slate-200">
          {/* Company Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                SKY ARIANA LOGISTICS & CARGO
              </h1>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                Multi-Modal Freight, Border Transit & Cross-Border Customs Escort
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Kandahar • Dubai (Jebel Ali) • Bandar Abbas • Hairatan • Islam Qala
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded">
                Executive Management Pack
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-2">
                Period: {overview?.periodLabel || "September 2026"}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Printed: {new Date().toISOString().split("T")[0]}
              </div>
            </div>
          </div>

          {/* 1. Executive Summary KPIs */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
              1. Executive KPI Summary
            </h4>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="border p-2 rounded">
                <div className="text-[10px] text-slate-500">Gross Revenue (USD)</div>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                  {formatMoney(usdPnl?.revenue.totalRevenue)}
                </div>
              </div>
              <div className="border p-2 rounded">
                <div className="text-[10px] text-slate-500">Gross Profit (USD)</div>
                <div className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
                  {formatMoney(usdPnl?.grossProfit)} ({usdPnl?.grossMarginPct}%)
                </div>
              </div>
              <div className="border p-2 rounded">
                <div className="text-[10px] text-slate-500">Net Operating Profit</div>
                <div className="text-sm font-bold font-mono text-blue-600 mt-0.5">
                  {formatMoney(usdPnl?.operatingProfit)} ({usdPnl?.operatingMarginPct}%)
                </div>
              </div>
              <div className="border p-2 rounded">
                <div className="text-[10px] text-slate-500">Net Cash Flow (USD)</div>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                  {formatMoney(usdCash?.netOperationalCashFlow)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Condensed P&L Schedule */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
              2. Profit & Loss Statement (USD Standard)
            </h4>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1 font-semibold">Total Operating Revenue (Invoices)</td>
                  <td className="py-1 text-right font-mono font-bold">{formatMoney(usdPnl?.revenue.totalRevenue)}</td>
                </tr>
                <tr>
                  <td className="py-1 pl-4 text-slate-600">- Freight Revenue</td>
                  <td className="py-1 text-right font-mono">{formatMoney(usdPnl?.revenue.freightRevenue)}</td>
                </tr>
                <tr>
                  <td className="py-1 pl-4 text-slate-600">- Documentation & Clearance</td>
                  <td className="py-1 text-right font-mono">{formatMoney(usdPnl?.revenue.documentationRevenue)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-1 font-semibold text-rose-700">Direct Shipment Costs (Carrier / Border)</td>
                  <td className="py-1 text-right font-mono font-bold text-rose-700">-{formatMoney(usdPnl?.directCosts.totalDirectCosts)}</td>
                </tr>
                <tr className="bg-emerald-50/70 font-bold border-t border-b border-emerald-300">
                  <td className="py-1.5 text-emerald-950 font-bold">GROSS PROFIT</td>
                  <td className="py-1.5 text-right font-mono text-emerald-700 font-black">{formatMoney(usdPnl?.grossProfit)}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold text-slate-700">Operating Expenses & Overhead</td>
                  <td className="py-1 text-right font-mono font-bold text-slate-700">-{formatMoney(usdPnl?.operatingExpenses.totalOperatingExpenses)}</td>
                </tr>
                <tr className="bg-blue-50/80 font-black border-t-2 border-b-2 border-blue-400">
                  <td className="py-2 text-blue-950 text-sm">NET OPERATING PROFIT (EBIT)</td>
                  <td className="py-2 text-right font-mono text-blue-900 text-sm font-black">{formatMoney(usdPnl?.operatingProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Aging Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
                3a. Accounts Receivable (USD)
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Outstanding:</span>
                  <span className="font-mono font-bold">{formatMoney(usdRec?.totalOutstanding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Current (Not Due):</span>
                  <span className="font-mono">{formatMoney(usdRec?.aging.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-700">Overdue (&gt;30d):</span>
                  <span className="font-mono font-bold text-rose-700">{formatMoney(usdRec?.totalOverdue)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-blue-600">
                  <span>Customer Advance Deposits:</span>
                  <span className="font-mono">{formatMoney(usdRec?.totalCreditAdvances)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1">
                3b. Accounts Payable (USD)
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Payable:</span>
                  <span className="font-mono font-bold text-rose-700">{formatMoney(usdPay?.totalPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Current (Not Due):</span>
                  <span className="font-mono">{formatMoney(usdPay?.aging.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-700">Overdue (&gt;30d):</span>
                  <span className="font-mono font-bold text-rose-700">{formatMoney(usdPay?.totalOverdue)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-600">
                  <span>Supplier Prepayments Held:</span>
                  <span className="font-mono">{formatMoney(usdPay?.totalAdvances)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit & Executive Sign-off Block */}
          <div className="pt-8 border-t border-slate-300 mt-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="border-b border-slate-400 pb-12 mb-1"></div>
                <div className="text-xs font-bold text-slate-800">Prepared by Finance Director</div>
                <div className="text-[10px] text-slate-500">Sky Ariana Accounting Department</div>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-12 mb-1"></div>
                <div className="text-xs font-bold text-slate-800">Reviewed by Operations Head</div>
                <div className="text-[10px] text-slate-500">Transit & Logistics Hubs</div>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-12 mb-1"></div>
                <div className="text-xs font-bold text-slate-800">Executive Managing Director</div>
                <div className="text-[10px] text-slate-500">Executive Board Approval</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
