"use client"

import { useState, useEffect } from "react"
import {
  CreditCard,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CustomerPortalSession, CustomerLedgerSummary } from "@/lib/types/customer-portal"

interface CustomerLedgerProps {
  session: CustomerPortalSession
}

export function CustomerLedgerView({ session }: CustomerLedgerProps) {
  const [ledger, setLedger] = useState<CustomerLedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<"month" | "year" | "all">("all")

  useEffect(() => {
    let isMounted = true
    const fetchLedger = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/portal/ledger?filter=${dateFilter}`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data.ledger) {
            setLedger(data.ledger)
          }
        }
      } catch (err) {
        console.error("Failed to load customer ledger:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchLedger()
    return () => {
      isMounted = false
    }
  }, [dateFilter])

  const handleDownloadStatement = () => {
    // Generate simple printable statement window
    if (!ledger) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const rowsHtml = ledger.transactions
      .map(
        (t) => `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace;">${t.reference}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${t.debit ? t.debit.toLocaleString() : "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${t.credit ? t.credit.toLocaleString() : "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${t.balance ? t.balance.toLocaleString() : "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${t.currency}</td>
      </tr>`
      )
      .join("")

    const balancesHtml = ledger.balancesByCurrency
      .map(
        (b) => `<div><strong>${b.currency}:</strong> Total Debit: ${b.totalDebit.toLocaleString()} | Total Credit: ${b.totalCredit.toLocaleString()} | <strong>Outstanding: ${b.outstandingBalance.toLocaleString()}</strong></div>`
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Account Statement - ${ledger.customerName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
            h1 { margin-bottom: 4px; font-size: 22px; }
            .header-info { margin-bottom: 24px; font-size: 13px; color: #555; }
            .balances { background: #f5f7fa; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #eee; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #ccc; }
          </style>
        </head>
        <body>
          <h1>SKY ARIANA LIMITED — CUSTOMER ACCOUNT STATEMENT</h1>
          <div class="header-info">
            <div><strong>Client:</strong> ${ledger.customerName}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="balances">
            <h3 style="margin-top:0; font-size: 14px;">Summary Balances</h3>
            ${balancesHtml}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th style="text-align: right;">Debit</th>
                <th style="text-align: right;">Credit</th>
                <th style="text-align: right;">Balance</th>
                <th style="text-align: center;">Currency</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>My Account Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified financial ledger and running balances for <strong>{session.customerName}</strong>
          </p>
        </div>

        <Button
          onClick={handleDownloadStatement}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 rounded-xl gap-2 cursor-pointer shadow-md"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Account Statement</span>
        </Button>
      </div>

      {/* Date Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
        {[
          { id: "all", label: "All Time" },
          { id: "year", label: "This Year" },
          { id: "month", label: "This Month" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setDateFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              dateFilter === f.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Multi-Currency Balances Cards */}
      {ledger && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ledger.balancesByCurrency.map((b) => (
            <Card
              key={b.currency}
              className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">{b.currency} Balance</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                  Net Outstanding Balance
                </span>
                <div
                  className={`text-2xl font-black font-mono mt-0.5 ${
                    b.outstandingBalance > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {b.outstandingBalance.toLocaleString()} {b.currency}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Debit</span>
                  <span className="font-mono font-semibold text-slate-300">
                    {b.totalDebit.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Credit</span>
                  <span className="font-mono font-semibold text-slate-300">
                    {b.totalCredit.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Transaction Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading ledger transactions...</div>
      ) : !ledger || ledger.transactions.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No transactions recorded</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Transactions posted against your company's consignments will appear here.
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Reference / BOL</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-right">Debit</th>
                  <th className="p-3.5 text-right">Credit</th>
                  <th className="p-3.5 text-right">Running Balance</th>
                  <th className="p-3.5 text-center">Currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledger.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-400 font-mono">{t.date}</td>
                    <td className="p-3.5 font-mono text-blue-400 font-bold">{t.reference}</td>
                    <td className="p-3.5 font-medium text-slate-200">{t.description}</td>
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      {t.debit ? t.debit.toLocaleString() : "-"}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      {t.credit ? t.credit.toLocaleString() : "-"}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                      {t.balance ? t.balance.toLocaleString() : "-"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-400">{t.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
