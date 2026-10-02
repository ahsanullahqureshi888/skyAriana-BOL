"use client"

import React, { useState } from "react"
import {
  FileDiff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney } from "@/lib/utils/money"
import type { FinanceDebitNote, FinanceCreditNote } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceNotesTabProps {
  debitNotes: FinanceDebitNote[]
  creditNotes: FinanceCreditNote[]
  onRefresh: () => void
}

export function FinanceNotesTab({
  debitNotes,
  creditNotes,
  onRefresh,
}: FinanceNotesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"debit" | "credit">("debit")
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Form State
  const [customerName, setCustomerName] = useState("")
  const [bolNumber, setBolNumber] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")

  const handleCreateNote = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter a customer name")
      return
    }
    const numAmt = Number(amount) || 0
    if (numAmt <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for this adjustment note")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/finance/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteType: activeSubTab,
          customerId: `cust-${customerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          customerName,
          bolNumber: bolNumber.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          amount: numAmt,
          currency,
          reason,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create adjustment note")
      }

      toast.success(
        `${activeSubTab === "debit" ? "Debit Note" : "Credit Note"} ${
          data.data.noteNumber
        } posted to customer ledger!`
      )
      setIsModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeNotes = activeSubTab === "debit" ? debitNotes : creditNotes
  const filteredNotes = activeNotes.filter((n) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = n.noteNumber.toLowerCase().includes(q)
      const matchCust = n.customerName.toLowerCase().includes(q)
      const matchReason = n.reason.toLowerCase().includes(q)
      if (!matchNum && !matchCust && !matchReason) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Subtabs Switcher & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setActiveSubTab("debit")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeSubTab === "debit"
                  ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
              Debit Notes ({debitNotes.length})
            </button>
            <button
              onClick={() => setActiveSubTab("credit")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                activeSubTab === "credit"
                  ? "bg-white text-purple-700 shadow-sm dark:bg-slate-800 dark:text-purple-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-purple-600" />
              Credit Notes ({creditNotes.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Search ${activeSubTab} notes...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        <Button
          onClick={() => {
            setAmount("")
            setReason("")
            setIsModalOpen(true)
          }}
          className={`h-9 gap-1.5 text-xs font-semibold text-white ${
            activeSubTab === "debit"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          <Plus className="h-4 w-4" />
          Create {activeSubTab === "debit" ? "Debit Note" : "Credit Note"}
        </Button>
      </div>

      {/* Info Callout */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
        <span className="font-bold">Accounting Invariance Note:</span>{" "}
        {activeSubTab === "debit"
          ? "Debit Notes record additional charges, penalties, or under-billed freight to the customer (Increases customer receivable balance)."
          : "Credit Notes record allowances, damage discounts, or over-billed corrections to the customer (Decreases customer receivable balance)."}
      </div>

      {/* Notes Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Note Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Reference (BOL / Inv)</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Adjustment Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No {activeSubTab} notes found.
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((n) => (
                    <tr
                      key={n.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {n.noteNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {n.date}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {n.customerName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {n.bolNumber || n.invoiceNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {n.reason}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black ${
                          activeSubTab === "debit"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        {formatMoney(n.amount, n.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Posted to Ledger
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE NOTE DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Issue {activeSubTab === "debit" ? "Debit Note" : "Credit Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Customer Name *
                </label>
                <Input
                  placeholder="e.g. NAJEB AMIN LTD"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED</option>
                  <option value="AFN">AFN</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Adjustment Amount *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 h-8 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Related BOL / Invoice
                </label>
                <Input
                  placeholder="e.g. BOL-2026-NSA626"
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Reason for Adjustment *
              </label>
              <Input
                placeholder="e.g. Demurrage rate revision at border / Cargo weight discrepancy credit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Internal Remarks
              </label>
              <Input
                placeholder="Optional audit comments"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              className={`text-white ${
                activeSubTab === "debit"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
              onClick={handleCreateNote}
            >
              Post {activeSubTab === "debit" ? "Debit Note" : "Credit Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
