"use client"

import { useState, useEffect, useMemo } from "react"
import { AccountRecord, LedgerTransactionRecord } from "@/lib/types/ledger-system"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Search, RotateCcw, AlertTriangle, FileSpreadsheet } from "lucide-react"

interface AgingItem {
  id: string
  accountId: string
  accountName: string
  invoiceNumber: string
  referenceNumber: string
  date: string
  originalAmount: number
  paid: number
  outstanding: number
  daysOutstanding: number
  currency: string
  bucket: "0-30" | "31-60" | "61-90" | "91-120" | "120+"
}

interface AgingReportTabProps {
  onSelectAccount: (accountId: string) => void
}

export function AgingReportTab({ onSelectAccount }: AgingReportTabProps) {
  const [items, setItems] = useState<AgingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBucket, setSelectedBucket] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const calculateAging = async () => {
      try {
        setIsLoading(true)
        const [resAcc, resTx] = await Promise.all([
          fetch("/api/accounting/ledgers?limit=200"),
          fetch("/api/accounting/transactions?limit=2000"),
        ])
        const dataAcc = await resAcc.json()
        const dataTx = await resTx.json()

        if (!dataAcc.success || !dataTx.success) return

        const accountsMap = new Map<string, AccountRecord>()
        for (const a of dataAcc.accounts || []) {
          accountsMap.set(a.id, a)
        }

        const now = new Date().getTime()
        const agingList: AgingItem[] = []

        // Find unpaid or partially paid debit transactions
        for (const t of dataTx.transactions || []) {
          if (t.debit <= 0) continue

          const acc = accountsMap.get(t.account_id)
          if (!acc || acc.current_balance <= 0) continue

          let txTime = 0
          if (t.transaction_date && t.transaction_date.includes("-")) {
            const parts = t.transaction_date.split("-")
            // Check if year is Solar Hijri (1404) or Gregorian (2025/2026)
            const y = parseInt(parts[0], 10)
            if (y > 1900) {
              txTime = new Date(t.transaction_date).getTime()
            } else {
              // Convert approx 1404 -> 2025/2026
              txTime = new Date(y + 621, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) || 1).getTime()
            }
          }

          const diffDays = txTime > 0 ? Math.max(0, Math.floor((now - txTime) / (1000 * 60 * 60 * 24))) : 60
          let bucket: AgingItem["bucket"] = "0-30"
          if (diffDays > 120) bucket = "120+"
          else if (diffDays > 90) bucket = "91-120"
          else if (diffDays > 60) bucket = "61-90"
          else if (diffDays > 30) bucket = "31-60"

          agingList.push({
            id: t.id,
            accountId: t.account_id,
            accountName: acc.display_name,
            invoiceNumber: t.invoice_number || t.reference_number || "INV-UNSPEC",
            referenceNumber: t.reference_number || t.bol_number || "-",
            date: t.transaction_date,
            originalAmount: t.debit,
            paid: 0,
            outstanding: t.debit,
            daysOutstanding: diffDays,
            currency: t.currency || acc.currency,
            bucket,
          })
        }

        agingList.sort((a, b) => b.daysOutstanding - a.daysOutstanding)
        setItems(agingList)
      } catch (e) {
        console.error("Aging calculation error:", e)
      } finally {
        setIsLoading(false)
      }
    }

    calculateAging()
  }, [])

  const bucketTotals = useMemo(() => {
    const buckets: Record<string, { count: number; totalUSD: number; totalAFN: number }> = {
      "0-30": { count: 0, totalUSD: 0, totalAFN: 0 },
      "31-60": { count: 0, totalUSD: 0, totalAFN: 0 },
      "61-90": { count: 0, totalUSD: 0, totalAFN: 0 },
      "91-120": { count: 0, totalUSD: 0, totalAFN: 0 },
      "120+": { count: 0, totalUSD: 0, totalAFN: 0 },
    }

    items.forEach((item) => {
      const b = buckets[item.bucket]
      if (b) {
        b.count++
        if (item.currency === "AFN") b.totalAFN += item.outstanding
        else b.totalUSD += item.outstanding
      }
    })

    return buckets
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedBucket !== "all" && item.bucket !== selectedBucket) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = item.accountName.toLowerCase().includes(q)
        const matchInv = item.invoiceNumber.toLowerCase().includes(q)
        const matchRef = item.referenceNumber.toLowerCase().includes(q)
        if (!matchName && !matchInv && !matchRef) return false
      }
      return true
    })
  }, [items, selectedBucket, searchQuery])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Clock className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-semibold">Calculating accounts receivable aging...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Aging Summary Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["0-30", "31-60", "61-90", "91-120", "120+"] as const).map((bKey) => {
          const b = bucketTotals[bKey] || { count: 0, totalUSD: 0, totalAFN: 0 }
          const isSelected = selectedBucket === bKey

          return (
            <div
              key={bKey}
              onClick={() => setSelectedBucket(isSelected ? "all" : bKey)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider">{bKey} Days</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-700/50 font-mono">
                  {b.count}
                </span>
              </div>
              <div className="mt-2 text-sm font-black font-mono">
                ${Math.round(b.totalUSD).toLocaleString()}
              </div>
              {b.totalAFN > 0 && (
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  ؋{Math.round(b.totalAFN).toLocaleString()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search account name, invoice #, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedBucket !== "all" && (
            <Badge variant="outline" className="text-xs">
              Filter: {selectedBucket} Days
            </Badge>
          )}
          {(selectedBucket !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedBucket("all")
                setSearchQuery("")
              }}
              className="h-8 text-xs text-slate-500"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Aging Table Container */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-320px)] min-h-[300px] scrollbar-thin [scrollbar-color:rgba(148,163,184,0.45)_transparent]">
          <table className="w-full text-left text-xs border-collapse min-w-[860px]">
            <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 w-10 sticky top-0 bg-slate-100 dark:bg-slate-800">#</th>
                <th className="py-2.5 px-3 min-w-[200px] sticky top-0 bg-slate-100 dark:bg-slate-800">Account Name</th>
                <th className="py-2.5 px-3 w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">Invoice #</th>
                <th className="py-2.5 px-3 w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">Date</th>
                <th className="py-2.5 px-3 w-28 text-right sticky top-0 bg-slate-100 dark:bg-slate-800">Original Amount</th>
                <th className="py-2.5 px-3 w-28 text-right sticky top-0 bg-slate-100 dark:bg-slate-800">Outstanding</th>
                <th className="py-2.5 px-3 w-24 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">Days Overdue</th>
                <th className="py-2.5 px-3 w-24 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">Category</th>
                <th className="py-2.5 px-3 w-20 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No overdue receivables matching filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const sym = item.currency === "AFN" ? "؋" : "$"
                  return (
                    <tr
                      key={item.id || idx}
                      onClick={() => onSelectAccount(item.accountId)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">{item.accountName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{item.invoiceNumber}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{item.date}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {sym}{item.originalAmount.toLocaleString()} {item.currency}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                        {sym}{item.outstanding.toLocaleString()} {item.currency}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold">
                        {item.daysOutstanding} d
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            item.bucket === "120+"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : item.bucket === "91-120"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          {item.bucket}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600 cursor-pointer">
                          Open
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Aging Summary Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            Overdue Invoices: <span className="font-bold text-slate-900 dark:text-white">{filteredItems.length}</span>
          </span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Total USD:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                ${filteredItems.filter((i) => (i.currency || "USD") === "USD").reduce((a, b) => a + b.outstanding, 0).toLocaleString()}
              </span>
            </div>
            {filteredItems.some((i) => i.currency === "AFN") && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Total AFN:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  ؋{filteredItems.filter((i) => i.currency === "AFN").reduce((a, b) => a + b.outstanding, 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
