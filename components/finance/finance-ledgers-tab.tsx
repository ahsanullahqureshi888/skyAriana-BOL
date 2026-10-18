"use client"

import React, { useState } from "react"
import {
  BookOpen,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/utils/money"
import type { AccountRecord } from "@/lib/types/ledger-system"

interface FinanceLedgersTabProps {
  accounts: AccountRecord[]
  onOpenStatement: (customerName: string) => void
  onOpenRecordPayment: (customerName: string) => void
}

export function FinanceLedgersTab({
  accounts,
  onOpenStatement,
  onOpenRecordPayment,
}: FinanceLedgersTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("all")

  const filteredAccounts = accounts.filter((acc) => {
    if (acc.status === "archived" || acc.status === "merged") return false
    if (currencyFilter !== "all" && acc.currency !== currencyFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = acc.account_name.toLowerCase().includes(q)
      const matchCode = acc.account_code.toLowerCase().includes(q)
      if (!matchName && !matchCode) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customer, company, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Currencies</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED</option>
            <option value="AFN">AFN</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {filteredAccounts.length} Canonical Ledger Accounts
        </div>
      </div>

      {/* Ledgers Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Company / Customer Name</th>
                  <th className="px-4 py-3 text-center">Currency</th>
                  <th className="px-4 py-3 text-right">Opening Bal</th>
                  <th className="px-4 py-3 text-right">Total Debit (Billed)</th>
                  <th className="px-4 py-3 text-right">Total Credit (Paid)</th>
                  <th className="px-4 py-3 text-right">Current Balance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No customer ledger accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        {acc.account_code}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {acc.account_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {acc.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {formatMoney(acc.opening_balance, acc.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                        {formatMoney(acc.total_debit, acc.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600">
                        {formatMoney(acc.total_credit, acc.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        {formatMoney(acc.current_balance, acc.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] font-bold text-emerald-700"
                            onClick={() => onOpenRecordPayment(acc.account_name)}
                          >
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] font-bold text-blue-700"
                            onClick={() => onOpenStatement(acc.account_name)}
                          >
                            Statement
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
