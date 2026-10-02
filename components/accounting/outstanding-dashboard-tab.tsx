"use client"

import { useState, useEffect, useMemo } from "react"
import { AccountRecord, LedgerTransactionRecord, PaymentRecord } from "@/lib/types/ledger-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Clock,
  CreditCard,
  Building2,
} from "lucide-react"

interface OutstandingDashboardTabProps {
  onSelectAccount: (accountId: string) => void
}

export function OutstandingDashboardTab({ onSelectAccount }: OutstandingDashboardTabProps) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [recentTxs, setRecentTxs] = useState<LedgerTransactionRecord[]>([])
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        const [resAcc, resTx, resPay] = await Promise.all([
          fetch("/api/accounting/ledgers?limit=200"),
          fetch("/api/accounting/transactions?limit=20"),
          fetch("/api/accounting/payments"),
        ])
        const dataAcc = await resAcc.json()
        const dataTx = await resTx.json()
        const dataPay = await resPay.json()

        if (dataAcc.success) setAccounts(dataAcc.accounts || [])
        if (dataTx.success) setRecentTxs(dataTx.transactions || [])
        if (dataPay.success) setRecentPayments(dataPay.payments || [])
      } catch (e) {
        console.error("Dashboard load failed:", e)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [])

  // Currency Grouped Stats
  const currencyStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalDebit: number
        totalCredit: number
        outstanding: number
        advance: number
        accountCount: number
        outstandingCount: number
        creditCount: number
        collectionRate: number
      }
    > = {}

    accounts.forEach((acc) => {
      const c = acc.currency || "USD"
      if (!stats[c]) {
        stats[c] = {
          totalDebit: 0,
          totalCredit: 0,
          outstanding: 0,
          advance: 0,
          accountCount: 0,
          outstandingCount: 0,
          creditCount: 0,
          collectionRate: 0,
        }
      }
      stats[c].totalDebit += acc.total_debit
      stats[c].totalCredit += acc.total_credit
      stats[c].accountCount++

      if (acc.current_balance > 0.01) {
        stats[c].outstanding += acc.current_balance
        stats[c].outstandingCount++
      } else if (acc.current_balance < -0.01) {
        stats[c].advance += Math.abs(acc.current_balance)
        stats[c].creditCount++
      }
    })

    Object.keys(stats).forEach((c) => {
      const s = stats[c]
      s.totalDebit = Math.round(s.totalDebit * 100) / 100
      s.totalCredit = Math.round(s.totalCredit * 100) / 100
      s.outstanding = Math.round(s.outstanding * 100) / 100
      s.advance = Math.round(s.advance * 100) / 100
      s.collectionRate = s.totalDebit > 0 ? Math.round((s.totalCredit / s.totalDebit) * 1000) / 10 : 0
    })

    return stats
  }, [accounts])

  // Top 10 Outstanding Accounts
  const topOutstanding = useMemo(() => {
    return [...accounts]
      .filter((a) => a.current_balance > 0.01)
      .sort((a, b) => b.current_balance - a.current_balance)
      .slice(0, 10)
  }, [accounts])

  // Top Advances / Credit Balances
  const topAdvances = useMemo(() => {
    return [...accounts]
      .filter((a) => a.current_balance < -0.01)
      .sort((a, b) => a.current_balance - b.current_balance)
      .slice(0, 5)
  }, [accounts])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Clock className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-semibold">Loading accounting dashboard metrics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Grouped Totals By Currency */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Currency-Segregated Ledger Portfolios
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(currencyStats).map(([curr, s]) => {
            const sym = curr === "AFN" ? "؋" : curr === "USD" ? "$" : curr
            const outstandingRate = s.totalDebit > 0 ? Math.round((s.outstanding / s.totalDebit) * 1000) / 10 : 0

            return (
              <Card
                key={curr}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm px-2 py-0.5 bg-slate-900 text-white rounded">
                      {curr}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Portfolio ({s.accountCount} Accounts)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      Coverage: {s.collectionRate}%
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      Outstanding: {outstandingRate}%
                    </span>
                  </div>
                </div>

                <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Debit</span>
                    <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                      {sym}{s.totalDebit.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Credit</span>
                    <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {sym}{s.totalCredit.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Net Outstanding</span>
                    <div className="text-base font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                      {sym}{s.outstanding.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">{s.outstandingCount} accounts</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Credit Advances</span>
                    <div className="text-base font-bold font-mono text-purple-700 dark:text-purple-400 mt-0.5">
                      {sym}{s.advance.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">{s.creditCount} accounts</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Top 10 Outstanding & Top Advances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 10 Outstanding */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Top 10 Outstanding Accounts</h4>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">Ordered by outstanding amount</span>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto scrollbar-thin [scrollbar-color:rgba(148,163,184,0.45)_transparent]">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
                <tr>
                  <th className="py-2 px-3 w-8 sticky top-0 bg-white dark:bg-slate-900">#</th>
                  <th className="py-2 px-3 sticky top-0 bg-white dark:bg-slate-900">Account Name</th>
                  <th className="py-2 px-3 w-20 sticky top-0 bg-white dark:bg-slate-900">Currency</th>
                  <th className="py-2 px-3 w-28 text-right sticky top-0 bg-white dark:bg-slate-900">Debit</th>
                  <th className="py-2 px-3 w-28 text-right sticky top-0 bg-white dark:bg-slate-900">Credit</th>
                  <th className="py-2 px-3 w-32 text-right sticky top-0 bg-white dark:bg-slate-900">Outstanding</th>
                  <th className="py-2 px-3 w-20 text-center sticky top-0 bg-white dark:bg-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {topOutstanding.map((acc, i) => {
                  const sym = acc.currency === "AFN" ? "؋" : "$"
                  return (
                    <tr
                      key={acc.id}
                      onClick={() => onSelectAccount(acc.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">{acc.display_name}</td>
                      <td className="py-2 px-3 font-mono font-semibold">{acc.currency}</td>
                      <td className="py-2 px-3 text-right font-mono">{sym}{acc.total_debit.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600">{sym}{acc.total_credit.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                        {sym}{acc.current_balance.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600">
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advances & Credit Balances */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Advance Balances</h4>
            </div>

            <div className="space-y-2.5">
              {topAdvances.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No credit advances recorded.</p>
              ) : (
                topAdvances.map((acc) => {
                  const sym = acc.currency === "AFN" ? "؋" : "$"
                  return (
                    <div
                      key={acc.id}
                      onClick={() => onSelectAccount(acc.id)}
                      className="p-2.5 rounded-lg border border-purple-200/50 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-400 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">{acc.display_name}</h5>
                        <p className="text-[10px] text-slate-500 font-mono">Currency: {acc.currency}</p>
                      </div>
                      <div className="text-right font-mono font-bold text-purple-700 dark:text-purple-300 text-xs">
                        {sym}{Math.abs(acc.current_balance).toLocaleString()} CR
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Advances represent prepayments or overpayments credited to customer accounts available to apply against future BOL charges.
          </div>
        </div>
      </div>

      {/* Recent Ledger Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Charges */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Recent Charges & Debits
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTxs
                  .filter((t) => t.debit > 0)
                  .slice(0, 5)
                  .map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 text-slate-500 font-mono text-[11px] w-20">{t.transaction_date}</td>
                      <td className="py-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{t.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.reference_number || t.bol_number || "-"}</div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-blue-600 w-24">
                        +{t.currency === "AFN" ? "؋" : "$"}{t.debit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Recent Payments & Credits
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTxs
                  .filter((t) => t.credit > 0)
                  .slice(0, 5)
                  .map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 text-slate-500 font-mono text-[11px] w-20">{t.transaction_date}</td>
                      <td className="py-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{t.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.reference_number || "Payment"}</div>
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-600 w-24">
                        -{t.currency === "AFN" ? "؋" : "$"}{t.credit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
