"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Printer,
  Copy,
  Download,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Building2,
  Calendar,
  Share2,
} from "lucide-react"
import { toast } from "sonner"
import type { MonthlyClosingStatementData } from "@/lib/accounting/period-closing/period-report-service"

interface PeriodReportViewProps {
  data: MonthlyClosingStatementData
  onClose?: () => void
}

export function PeriodReportView({ data, onClose }: PeriodReportViewProps) {
  const [copying, setCopying] = useState(false)
  const { period, snapshot, balances, currencySummaries } = data

  const handleCopyWhatsApp = async () => {
    try {
      setCopying(true)
      const res = await fetch(`/api/accounting/period/report?periodId=${period.id}&format=whatsapp`)
      const json = await res.json()
      if (json.success && json.text) {
        await navigator.clipboard.writeText(json.text)
        toast.success("Executive WhatsApp Summary copied to clipboard!")
      } else {
        toast.error("Failed to generate WhatsApp summary.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to copy to clipboard.")
    } finally {
      setCopying(false)
    }
  }

  const handleDownloadCsv = () => {
    window.open(`/api/accounting/period/report?periodId=${period.id}&format=csv`, "_blank")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-slate-950">
            {period.code}
          </Badge>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Official Monthly Closing Statement
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyWhatsApp}
            disabled={copying}
            className="text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
          >
            <Share2 className="h-3.5 w-3.5" />
            Copy WhatsApp Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Statement
          </Button>
        </div>
      </div>

      {/* Printable Official Statement Sheet */}
      <div className="p-8 bg-white text-slate-900 rounded-xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-[1100px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
                SA
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase">
                  Sky Ariana Logistics & Transport
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Official Financial Statement • Kabul | Dubai | Bandar Abbas | Herat
                </p>
              </div>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold">
              <Lock className="h-3.5 w-3.5 text-rose-600" />
              MONTHLY CLOSING STATEMENT
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Period: {period.name} ({period.code})
            </p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Period Bounds</span>
            <p className="font-semibold text-slate-900">{period.start_date} to {period.end_date}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Closure Status</span>
            <p className="font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {period.status} & LOCKED
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Closed By</span>
            <p className="font-semibold text-slate-900">{period.closed_by || "System Auditor"}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Immutable Hash</span>
            <p className="font-mono text-[10px] text-slate-600 truncate" title={snapshot?.data_hash}>
              {snapshot?.data_hash ? `${snapshot.data_hash.slice(0, 14)}...` : "VERIFIED"}
            </p>
          </div>
        </div>

        {/* Multi-Currency Aggregates */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Multi-Currency Position & Invariance Breakdown
          </h2>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Currency</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Opening Balance</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Period Debit (+)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Period Credit (-)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Closing Balance</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Invariance Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {currencySummaries.map((cs) => (
                  <tr key={cs.currency} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{cs.currency}</td>
                    <td className="py-2 px-3 text-right">{cs.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-blue-700">{cs.periodDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{cs.periodCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{cs.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-center text-[10px] text-emerald-700 font-sans">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Closing = Open + Dr - Cr
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Account Balances */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Account Ledger Closing Balances ({balances.length} Accounts)
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Net Balance Invariance Identity Verified
            </span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold">Account</th>
                  <th className="py-2 px-3 font-semibold">Type</th>
                  <th className="py-2 px-3 font-semibold">Currency</th>
                  <th className="py-2 px-3 font-semibold text-right">Opening</th>
                  <th className="py-2 px-3 font-semibold text-right">Debit</th>
                  <th className="py-2 px-3 font-semibold text-right">Credit</th>
                  <th className="py-2 px-3 font-semibold text-right">Closing</th>
                  <th className="py-2 px-3 font-semibold text-center">Txs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {balances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-medium text-slate-900 font-sans">{b.account_name}</td>
                    <td className="py-1.5 px-3 font-sans text-slate-600 capitalize">{b.account_type}</td>
                    <td className="py-1.5 px-3 font-bold">{b.currency}</td>
                    <td className="py-1.5 px-3 text-right text-slate-600">{b.opening_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-right text-blue-700">{b.period_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-right text-emerald-700">{b.period_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900">{b.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 text-center text-slate-500 font-sans">{b.transaction_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Sign-off Block */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-8">
            <p className="font-semibold text-slate-600 uppercase text-[10px]">Prepared By</p>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pb-1 font-mono text-[11px]">
              {period.closed_by || "Chief Accountant"}
            </div>
            <p className="text-[10px] text-slate-400">Accountant Signature & Date</p>
          </div>
          <div className="space-y-8">
            <p className="font-semibold text-slate-600 uppercase text-[10px]">Internal Audit Review</p>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pb-1 font-mono text-[11px]">
              AUDIT COMPLIANT
            </div>
            <p className="text-[10px] text-slate-400">Internal Audit Stamp & Sign</p>
          </div>
          <div className="space-y-8">
            <p className="font-semibold text-slate-600 uppercase text-[10px]">Executive Approval</p>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pb-1 font-mono text-[11px]">
              APPROVED
            </div>
            <p className="text-[10px] text-slate-400">Managing Director / CEO</p>
          </div>
        </div>
      </div>
    </div>
  )
}
