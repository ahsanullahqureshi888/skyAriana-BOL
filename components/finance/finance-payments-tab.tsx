"use client"

import React, { useState, useEffect } from "react"
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Receipt,
  Eye,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney, roundMoney } from "@/lib/utils/money"
import type { FinancePaymentRecord, FinanceInvoiceRecord } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinancePaymentsTabProps {
  payments: FinancePaymentRecord[]
  invoices: FinanceInvoiceRecord[]
  onRefresh: () => void
  onOpenReceipt: (receiptId: string) => void
}

export function FinancePaymentsTab({
  payments,
  invoices,
  onRefresh,
  onOpenReceipt,
}: FinancePaymentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("all")
  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Payment Form Fields
  const [customerName, setCustomerName] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState<any>("Bank Transfer")
  const [bankAccountName, setBankAccountName] = useState("Bank Alfalah USD")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")

  // Allocations to open customer invoices: invoiceId -> allocated amount
  const [allocatedAmounts, setAllocatedAmounts] = useState<Record<string, number>>({})

  // Open invoices for selected customer
  const customerOpenInvoices = invoices.filter(
    (inv) =>
      customerName.trim() &&
      inv.customerName.toLowerCase().includes(customerName.trim().toLowerCase()) &&
      inv.outstandingAmount > 0 &&
      inv.currency === currency &&
      inv.status !== "cancelled"
  )

  const numPaymentAmount = Number(amount) || 0
  const totalAllocated = Object.values(allocatedAmounts).reduce((sum, v) => sum + (v || 0), 0)
  const unallocatedCredit = Math.max(0, roundMoney(numPaymentAmount - totalAllocated, 2))

  const handleSetAllocation = (invoiceId: string, maxOut: number, val: string) => {
    const parsed = Number(val) || 0
    const clamped = Math.min(Math.max(0, parsed), maxOut)
    setAllocatedAmounts((prev) => ({
      ...prev,
      [invoiceId]: clamped,
    }))
  }

  const handleRecordPayment = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter a customer name")
      return
    }
    if (numPaymentAmount <= 0) {
      toast.error("Payment amount must be greater than zero")
      return
    }

    try {
      setIsSubmitting(true)
      const allocations = Object.entries(allocatedAmounts)
        .filter(([_, amt]) => amt > 0)
        .map(([invoiceId, amt]) => ({ invoiceId, amount: amt }))

      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: `cust-${customerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          customerName,
          amount: numPaymentAmount,
          currency,
          paymentDate,
          paymentMethod,
          bankAccountName,
          referenceNumber,
          notes,
          allocations,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record payment")
      }

      toast.success(
        `Payment ${data.data.payment.paymentNumber} recorded! Receipt ${data.data.receipt.receiptNumber} generated.`
      )
      setIsRecordOpen(false)
      onRefresh()
      if (data.data.receipt?.id) {
        onOpenReceipt(data.data.receipt.id)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredPayments = payments.filter((pay) => {
    if (currencyFilter !== "all" && pay.currency !== currencyFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = pay.paymentNumber.toLowerCase().includes(q)
      const matchCust = pay.customerName.toLowerCase().includes(q)
      const matchRef = pay.referenceNumber.toLowerCase().includes(q)
      if (!matchNum && !matchCust && !matchRef) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search payment, customer, ref..."
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

        <Button
          onClick={() => {
            setAllocatedAmounts({})
            setIsRecordOpen(true)
          }}
          className="h-9 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Record Payment Received
        </Button>
      </div>

      {/* Payments History Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Payment No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method / Account</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Amount Received</th>
                  <th className="px-4 py-3 text-right">Unallocated Credit</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No payments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr
                      key={pay.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {pay.paymentNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {pay.paymentDate}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {pay.customerName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {pay.paymentMethod}
                        {pay.bankAccountName ? ` (${pay.bankAccountName})` : ""}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {pay.referenceNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatMoney(pay.amount, pay.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {pay.unallocatedCredit > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatMoney(pay.unallocatedCredit, pay.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pay.receiptId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                            onClick={() => onOpenReceipt(pay.receiptId!)}
                          >
                            <Receipt className="mr-1 h-3 w-3" />
                            {pay.receiptNumber || "View Receipt"}
                          </Button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* RECORD PAYMENT MODAL */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Record Payment Received & Allocate Invoices
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  Amount Received *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 h-8 text-xs font-bold"
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Payment Date
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Exchange">Currency Exchange</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Bank / Cash Account
                </label>
                <Input
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Payment Reference / Bank Transaction ID
              </label>
              <Input
                placeholder="e.g. Wire Ref # 992812"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>

            {/* Invoices Allocation Grid */}
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <span className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                Allocate to Open Invoices ({currency})
              </span>

              {customerOpenInvoices.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No open unpaid invoices found for &ldquo;{customerName || "this customer"}&rdquo; in {currency}. Entire amount will be held as Unallocated Customer Credit.
                </p>
              ) : (
                <div className="space-y-2">
                  {customerOpenInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-3 rounded border border-slate-100 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-blue-700 dark:text-blue-400">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          BOL: {inv.bolNumbers?.join(", ") || "—"} | Total: {formatMoney(inv.totalAmount, inv.currency)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 text-[10px]">Outstanding:</span>
                        <div className="font-bold text-rose-600">
                          {formatMoney(inv.outstandingAmount, inv.currency)}
                        </div>
                      </div>

                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="Alloc Amt"
                          value={allocatedAmounts[inv.id] || ""}
                          onChange={(e) => handleSetAllocation(inv.id, inv.outstandingAmount, e.target.value)}
                          className="h-7 text-right text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Allocation Summary Bar */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-bold dark:border-slate-800">
                <span>Total Allocated: {formatMoney(totalAllocated, currency)}</span>
                <span className={unallocatedCredit > 0 ? "text-amber-600" : "text-slate-500"}>
                  Unallocated Customer Credit: {formatMoney(unallocatedCredit, currency)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleRecordPayment}
            >
              Confirm & Issue Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
