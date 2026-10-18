"use client"

import React, { useState } from "react"
import {
  Wallet,
  Plus,
  Search,
  Building2,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney } from "@/lib/utils/money"
import type { FinanceExpenseRecord } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceExpensesTabProps {
  expenses: FinanceExpenseRecord[]
  onRefresh: () => void
}

export function FinanceExpensesTab({ expenses, onRefresh }: FinanceExpensesTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currencyFilter, setCurrencyFilter] = useState("all")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [category, setCategory] = useState<any>("Truck")
  const [paidTo, setPaidTo] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [bolNumber, setBolNumber] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [reference, setReference] = useState("")

  const handleAddExpense = async () => {
    const numAmt = Number(amount) || 0
    if (numAmt <= 0) {
      toast.error("Expense amount must be greater than zero")
      return
    }
    if (!description.trim()) {
      toast.error("Please enter a description for the expense")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          category,
          paidTo: paidTo.trim() || "Supplier",
          description,
          amount: numAmt,
          currency,
          bolNumber: bolNumber.trim() || undefined,
          paymentMethod,
          reference,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record expense")

      toast.success("Expense recorded successfully!")
      setIsAddOpen(false)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category.toLowerCase() !== categoryFilter.toLowerCase())
      return false
    if (currencyFilter !== "all" && e.currency !== currencyFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchDesc = e.description.toLowerCase().includes(q)
      const matchVendor = e.paidTo.toLowerCase().includes(q)
      const matchBol = (e.bolNumber || "").toLowerCase().includes(q)
      if (!matchDesc && !matchVendor && !matchBol) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search expenses, BOL, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Categories</option>
            <option value="Truck">Truck</option>
            <option value="Shipping Line">Shipping Line</option>
            <option value="Port">Port</option>
            <option value="Customs">Customs</option>
            <option value="Documentation">Documentation</option>
            <option value="Handling">Handling</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Office">Office</option>
          </select>

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

        <Button
          onClick={() => {
            setAmount("")
            setDescription("")
            setIsAddOpen(true)
          }}
          className="h-9 gap-1.5 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          Record Expense
        </Button>
      </div>

      {/* Expenses Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Related BOL</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Method / Ref</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{exp.date}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {exp.paidTo}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                        {exp.bolNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {exp.description}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {exp.paymentMethod} {exp.reference ? `(${exp.reference})` : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(exp.amount, exp.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ADD EXPENSE DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record Operational / Shipment Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="Truck">Truck</option>
                  <option value="Shipping Line">Shipping Line</option>
                  <option value="Port">Port</option>
                  <option value="Customs">Customs</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Handling">Handling</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Office">Office</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Amount *</label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 h-8 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Currency *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900"
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
                <label className="font-semibold text-slate-700 dark:text-slate-300">Vendor / Payee</label>
                <Input
                  placeholder="e.g. Maersk / Driver Ahmad"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Related BOL (Optional)</label>
                <Input
                  placeholder="e.g. BOL-2026-NSA626"
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Description *</label>
              <Input
                placeholder="e.g. Border customs clearance fee at Islam Qala"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Receipt / Ref No</label>
                <Input
                  placeholder="e.g. REC-8891"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleAddExpense}
            >
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
