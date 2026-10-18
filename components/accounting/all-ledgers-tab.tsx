"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { AccountRecord, AccountType } from "@/lib/types/ledger-system"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  SlidersHorizontal,
} from "lucide-react"

interface AllLedgersTabProps {
  onSelectAccount: (accountId: string) => void
  onNewAccountClick: () => void
}

type FilterCategory =
  | "all"
  | "customer"
  | "shipper"
  | "consignee"
  | "agent"
  | "supplier"
  | "company"
  | "office_expense"
  | "transportation"
  | "outstanding"
  | "credit"

export function AllLedgersTab({ onSelectAccount, onNewAccountClick }: AllLedgersTabProps) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState<FilterCategory>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("all")
  const tableScrollRef = useRef<HTMLDivElement>(null)

  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/accounting/ledgers?limit=200")
      const data = await res.json()
      if (res.ok && data.success) {
        setAccounts(data.accounts || [])
      }
    } catch (err) {
      console.error("Failed to load accounts:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const scrollToTop = () => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const currencies = useMemo(() => {
    const set = new Set<string>()
    accounts.forEach((a) => {
      if (a.currency) set.add(a.currency)
    })
    return Array.from(set)
  }, [accounts])

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Currency filter
      if (currencyFilter !== "all" && acc.currency !== currencyFilter) return false

      // Category filter
      if (category === "outstanding") {
        if (acc.current_balance <= 0.01) return false
      } else if (category === "credit") {
        if (acc.current_balance >= -0.01) return false
      } else if (category !== "all") {
        if (acc.account_type !== category) return false
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = acc.account_name.toLowerCase().includes(q)
        const matchDisplay = acc.display_name.toLowerCase().includes(q)
        const matchCode = (acc.account_code || "").toLowerCase().includes(q)
        const matchAliases = (acc.aliases || []).some((al) => al.toLowerCase().includes(q))
        if (!matchName && !matchDisplay && !matchCode && !matchAliases) return false
      }

      return true
    })
  }, [accounts, category, searchQuery, currencyFilter])

  // Real-time aggregate financial metrics strictly preserving Net Balance = Total Debit - Total Credit
  const aggregateTotals = useMemo(() => {
    let usdDebit = 0
    let usdCredit = 0
    let usdNet = 0
    let afnDebit = 0
    let afnCredit = 0
    let afnNet = 0
    let outstandingCount = 0
    let creditCount = 0
    let settledCount = 0

    filteredAccounts.forEach((acc) => {
      const cur = (acc.currency || "USD").toUpperCase()
      const debit = Number(acc.total_debit) || 0
      const credit = Number(acc.total_credit) || 0
      const net = debit - credit

      if (cur === "USD") {
        usdDebit += debit
        usdCredit += credit
        usdNet += net
      } else if (cur === "AFN") {
        afnDebit += debit
        afnCredit += credit
        afnNet += net
      }

      if (acc.current_balance > 0.01) {
        outstandingCount++
      } else if (acc.current_balance < -0.01) {
        creditCount++
      } else {
        settledCount++
      }
    })

    return {
      usdDebit,
      usdCredit,
      usdNet,
      hasUsd: usdDebit > 0 || usdCredit > 0 || Math.abs(usdNet) > 0.01,
      afnDebit,
      afnCredit,
      afnNet,
      hasAfn: afnDebit > 0 || afnCredit > 0 || Math.abs(afnNet) > 0.01,
      outstandingCount,
      creditCount,
      settledCount,
    }
  }, [filteredAccounts])

  const accountTypeCategories = useMemo(
    () => [
      { id: "all", label: "All", fullLabel: "All Ledgers", count: accounts.length },
      {
        id: "customer",
        label: "Customers",
        fullLabel: "Customer Ledgers",
        count: accounts.filter((a) => a.account_type === "customer").length,
      },
      {
        id: "company",
        label: "Companies",
        fullLabel: "Company Ledgers",
        count: accounts.filter((a) => a.account_type === "company").length,
      },
      {
        id: "transportation",
        label: "Transportation",
        fullLabel: "Transportation Ledgers",
        count: accounts.filter((a) => a.account_type === "transportation").length,
      },
      {
        id: "shipper",
        label: "Shippers",
        fullLabel: "Shipper Ledgers",
        count: accounts.filter((a) => a.account_type === "shipper").length,
      },
      {
        id: "consignee",
        label: "Consignees",
        fullLabel: "Consignee Ledgers",
        count: accounts.filter((a) => a.account_type === "consignee").length,
      },
      {
        id: "agent",
        label: "Agents",
        fullLabel: "Agent Ledgers",
        count: accounts.filter((a) => a.account_type === "agent").length,
      },
      {
        id: "supplier",
        label: "Suppliers",
        fullLabel: "Supplier Ledgers",
        count: accounts.filter((a) => a.account_type === "supplier").length,
      },
      {
        id: "office_expense",
        label: "Office",
        fullLabel: "Office Expense Ledgers",
        count: accounts.filter((a) => a.account_type === "office_expense").length,
      },
    ],
    [accounts]
  )

  const balanceCategories = useMemo(
    () => [
      {
        id: "outstanding",
        label: "Outstanding",
        fullLabel: "Outstanding Balances (Receivables)",
        count: accounts.filter((a) => a.current_balance > 0.01).length,
        type: "outstanding" as const,
      },
      {
        id: "credit",
        label: "Credit / Advance",
        fullLabel: "Credit Balances (Advances / Payables)",
        count: accounts.filter((a) => a.current_balance < -0.01).length,
        type: "credit" as const,
      },
    ],
    [accounts]
  )

  const getTypeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case "customer":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
      case "company":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
      case "transportation":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
      case "supplier":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
      case "shipper":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
      case "consignee":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
      case "agent":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-3">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-100/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 shrink-0">
        {/* Left: Account Types */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {accountTypeCategories.map((cat) => {
            const isSelected = category === cat.id
            const hasItems = cat.count > 0

            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as FilterCategory)}
                title={cat.fullLabel}
                className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border select-none ${
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-xs"
                    : hasItems
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 shadow-2xs"
                    : "bg-white/60 border-slate-200/60 text-slate-400 hover:bg-white hover:text-slate-600 dark:bg-slate-900/40 dark:border-slate-800/60 dark:text-slate-500"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    isSelected
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : hasItems
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      : "bg-slate-100/60 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right: Balance Status Highlights */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 sm:pt-0 sm:pl-2 sm:border-l border-slate-200 dark:border-slate-700">
          {balanceCategories.map((cat) => {
            const isSelected = category === cat.id

            if (cat.type === "outstanding") {
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id as FilterCategory)}
                  title={cat.fullLabel}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border select-none ${
                    isSelected
                      ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                      : "bg-amber-50/90 border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800/70 dark:text-amber-300 shadow-2xs"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              )
            }

            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as FilterCategory)}
                title={cat.fullLabel}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border select-none ${
                  isSelected
                    ? "bg-purple-700 border-purple-700 text-white shadow-xs"
                    : "bg-purple-50/90 border-purple-200 text-purple-900 hover:bg-purple-100 dark:bg-purple-950/40 dark:border-purple-800/70 dark:text-purple-300 shadow-2xs"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-purple-200/80 text-purple-950 dark:bg-purple-900/60 dark:text-purple-200"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search company name, ledger title, code, alias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50/80 focus:bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Currency:</span>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="h-9 px-2.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">All Currencies</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          {(searchQuery || currencyFilter !== "all" || category !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setCurrencyFilter("all")
                setCategory("all")
              }}
              className="h-9 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Filters
            </Button>
          )}

          <Button
            size="sm"
            onClick={onNewAccountClick}
            className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Account Ledger
          </Button>
        </div>
      </div>

      {/* Account Ledgers List / Table Container */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Table Viewport with vertical & horizontal scroll and sticky header */}
        <div
          ref={tableScrollRef}
          tabIndex={0}
          role="region"
          aria-label="Accounting Ledgers Table"
          className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100dvh-295px)] min-h-[380px] scrollbar-thin [scrollbar-color:rgba(148,163,184,0.45)_transparent] focus:outline-none focus:ring-1 focus:ring-blue-500/20"
        >
          <table className="w-full text-left text-xs border-collapse min-w-[960px]">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-850/95 backdrop-blur-md text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 shadow-2xs">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">#</th>
                <th className="py-3 px-4 min-w-[240px] sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Account Name / Company</th>
                <th className="py-3 px-3.5 w-28 sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Type</th>
                <th className="py-3 px-3 w-20 sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Currency</th>
                <th className="py-3 px-4 w-32 text-right sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Total Debit</th>
                <th className="py-3 px-4 w-32 text-right sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Total Credit</th>
                <th className="py-3 px-4 w-36 text-right sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Net Balance</th>
                <th className="py-3 px-3.5 w-28 text-center sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Status</th>
                <th className="py-3 px-3.5 w-24 text-center sticky top-0 bg-slate-100/95 dark:bg-slate-850/95">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="text-xs font-semibold">Loading ledger accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="h-7 w-7 text-slate-400 mx-auto" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No account ledgers match your criteria.</p>
                      <p className="text-[11px] text-slate-500">Try adjusting your category filter, currency, or search query.</p>
                      {(searchQuery || category !== "all" || currencyFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("")
                            setCategory("all")
                            setCurrencyFilter("all")
                          }}
                          className="mt-2 text-xs"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => {
                  const currSym = acc.currency === "AFN" ? "؋" : "$"
                  const isOut = acc.current_balance > 0.01
                  const isAdv = acc.current_balance < -0.01

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => onSelectAccount(acc.id)}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group select-none"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {acc.display_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono text-[10px]">
                            {acc.account_code || "0AC"}
                          </span>
                          {acc.source && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              Sheet: {acc.source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold capitalize border ${getTypeBadgeClass(acc.account_type)}`}
                        >
                          {acc.account_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {acc.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                        {currSym}{acc.total_debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {currSym}{acc.total_credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-mono text-[11px] ${
                            isOut
                              ? "bg-amber-100 text-amber-900 border border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800/60"
                              : isAdv
                              ? "bg-purple-100 text-purple-900 border border-purple-200/80 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800/60"
                              : "text-slate-500 bg-slate-100 dark:bg-slate-800"
                          }`}
                        >
                          {currSym}{Math.abs(acc.current_balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{isAdv ? " CR" : ""}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Outstanding
                          </span>
                        ) : isAdv ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            Advance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            Settled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectAccount(acc.id)
                          }}
                        >
                          <span>Open</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Financial Summary & Aggregate Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredAccounts.length}</span> of {accounts.length} Accounts
            </span>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {aggregateTotals.outstandingCount} Outstanding
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-medium text-purple-700 dark:text-purple-400">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                {aggregateTotals.creditCount} Credit
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                {aggregateTotals.settledCount} Settled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Currency Totals */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {aggregateTotals.hasUsd && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="font-semibold text-slate-500">USD Net:</span>
                  <span className={`font-bold ${aggregateTotals.usdNet >= 0 ? "text-amber-700 dark:text-amber-400" : "text-purple-700 dark:text-purple-400"}`}>
                    ${aggregateTotals.usdNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {aggregateTotals.hasAfn && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="font-semibold text-slate-500">AFN Net:</span>
                  <span className={`font-bold ${aggregateTotals.afnNet >= 0 ? "text-amber-700 dark:text-amber-400" : "text-purple-700 dark:text-purple-400"}`}>
                    ؋{aggregateTotals.afnNet.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={scrollToTop}
              className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 gap-1 cursor-pointer"
              title="Scroll to top of list"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>Top</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
