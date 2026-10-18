"use client"

import React, { useState } from "react"
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  DollarSign,
  ArrowUpRight,
  Eye,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney, roundMoney } from "@/lib/utils/money"
import type {
  SupplierPaymentRecord,
  SupplierBillRecord,
  SupplierProfile,
  SupplierPaymentAllocation,
} from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceSupplierPaymentsTabProps {
  payments: SupplierPaymentRecord[]
  bills: SupplierBillRecord[]
  suppliers: SupplierProfile[]
  onRefresh: () => void
}

export function FinanceSupplierPaymentsTab({
  payments,
  bills,
  suppliers,
  onRefresh,
}: FinanceSupplierPaymentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")

  // Record Payment Modal State
  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState<
    "Bank Transfer" | "Cash" | "Exchange" | "Cheque" | "Other"
  >("Bank Transfer")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [bankReference, setBankReference] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Custom bill allocations
  const [allocations, setAllocations] = useState<Record<string, number>>({})

  // Voucher Preview
  const [previewPayment, setPreviewPayment] = useState<SupplierPaymentRecord | null>(null)

  // Filter unpaid bills for selected supplier
  const supplierUnpaidBills = bills.filter(
    (b) => b.supplierId === selectedSupplierId && b.outstandingPayable > 0 && b.status !== "void"
  )

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    if (supplierFilter !== "all" && p.supplierId !== supplierFilter) return false
    if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = p.paymentNumber.toLowerCase().includes(q)
      const matchSupp = p.supplierName.toLowerCase().includes(q)
      const matchRef = p.referenceNumber.toLowerCase().includes(q)
      if (!matchNum && !matchSupp && !matchRef) return false
    }
    return true
  })

  // KPIs
  const totalDisbursed = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalAdvances = payments.reduce((sum, p) => sum + (p.supplierAdvance || 0), 0)
  const currentMonth = new Date().toISOString().substring(0, 7)
  const disbursedThisMonth = payments
    .filter((p) => (p.paymentDate || "").startsWith(currentMonth))
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  // Allocate payment automatically across unpaid bills
  const handleAutoAllocate = (totalAmount: number) => {
    let remaining = totalAmount
    const newAlloc: Record<string, number> = {}
    for (const bill of supplierUnpaidBills) {
      if (remaining <= 0) break
      const toAlloc = Math.min(remaining, bill.outstandingPayable)
      newAlloc[bill.id] = toAlloc
      remaining = roundMoney(remaining - toAlloc, 2)
    }
    setAllocations(newAlloc)
  }

  const handleAmountChange = (val: string) => {
    setPaymentAmount(val)
    const num = Number(val) || 0
    handleAutoAllocate(num)
  }

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId)
    setAllocations({})
    const sup = suppliers.find((s) => s.id === supId)
    if (sup) {
      setCurrency(sup.currency || "USD")
    }
  }

  const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0)
  const numAmount = Number(paymentAmount) || 0
  const calculatedAdvance = Math.max(0, roundMoney(numAmount - allocatedTotal, 2))

  const handleRecordPayment = async () => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier")
      return
    }
    if (numAmount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }
    if (!referenceNumber.trim()) {
      toast.error("Payment reference is required (e.g. wire reference, receipt #)")
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) {
      toast.error("Supplier profile not found")
      return
    }

    try {
      setIsSubmitting(true)
      const allocPayload: SupplierPaymentAllocation[] = Object.entries(allocations)
        .filter(([_, amt]) => amt > 0)
        .map(([billId, amt]) => {
          const matched = bills.find((b) => b.id === billId)
          return {
            billId,
            billNumber: matched?.billNumber || billId,
            allocatedAmount: amt,
          }
        })

      const payload = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: numAmount,
        currency,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        bankReference: bankReference.trim(),
        remarks: remarks.trim(),
        allocations: allocPayload,
      }

      const res = await fetch("/api/finance/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(
          `Supplier Payment ${data.payment?.paymentNumber || ""} recorded successfully!`
        )
        setIsRecordOpen(false)
        setSelectedSupplierId("")
        setPaymentAmount("")
        setReferenceNumber("")
        setBankReference("")
        setRemarks("")
        setAllocations({})
        onRefresh()
      } else {
        toast.error(data.error || "Failed to record payment")
      }
    } catch (err: any) {
      toast.error(`Error recording payment: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Total Disbursements</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(totalDisbursed, "USD")}
            </div>
            <p className="text-[11px] text-slate-400">{payments.length} payments recorded</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatMoney(disbursedThisMonth, "USD")}
            </div>
            <p className="text-[11px] text-slate-400">Month: {currentMonth}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Supplier Advances Held</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatMoney(totalAdvances, "USD")}
            </div>
            <p className="text-[11px] text-slate-400">Prepayments / Credits</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Active Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {suppliers.length}
            </div>
            <p className="text-[11px] text-slate-400">Vendors & shipping lines</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by Payment #, Supplier, Ref #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Suppliers ({suppliers.length})</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Methods</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Exchange">Exchange</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <Button
          onClick={() => setIsRecordOpen(true)}
          className="h-9 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Disburse Supplier Payment
        </Button>
      </div>

      {/* Payments Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Payment #</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Reference #</th>
                <th className="px-3 py-2.5 text-right">Amount Paid</th>
                <th className="px-3 py-2.5 text-right">Bills Settled</th>
                <th className="px-3 py-2.5 text-right">Supplier Advance</th>
                <th className="px-3 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    No supplier payments recorded yet. Click &quot;Disburse Supplier Payment&quot; to pay a supplier.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {pmt.paymentNumber}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {pmt.paymentDate}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {pmt.supplierName}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {pmt.paymentMethod}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {pmt.referenceNumber || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(pmt.amount, pmt.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                      {pmt.allocations?.length || 0} bills
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-purple-600 dark:text-purple-400">
                      {pmt.supplierAdvance > 0 ? formatMoney(pmt.supplierAdvance, pmt.currency) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewPayment(pmt)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Disburse Supplier Payment (Settle Costs)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Supplier *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Choose Supplier to Pay --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Payable: {formatMoney(s.outstandingPayable, s.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Total Disbursed Amount *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Date
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Exchange">Hawala / Exchange</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reference # / Voucher *
                </label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. TR-98214 or Cash Slip"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Bill Allocation Section */}
            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Allocate Payment to Outstanding Supplier Bills
                </span>
                <span className="text-[11px] text-slate-500">
                  {supplierUnpaidBills.length} unpaid bill(s)
                </span>
              </div>

              {supplierUnpaidBills.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
                  {selectedSupplierId
                    ? "No pending unpaid bills for this supplier. Full amount will be recorded as Supplier Advance."
                    : "Select a supplier to see outstanding bills."}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {supplierUnpaidBills.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {b.billNumber} • Inv: {b.supplierInvoiceNumber || "N/A"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Date: {b.billDate} • Total: {formatMoney(b.totalAmount, b.currency)} •
                          Outstanding:{" "}
                          <span className="font-bold text-amber-600">
                            {formatMoney(b.outstandingPayable, b.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Allocated:</span>
                        <Input
                          type="number"
                          step="0.01"
                          max={b.outstandingPayable}
                          value={allocations[b.id] ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0
                            setAllocations({ ...allocations, [b.id]: Math.min(val, b.outstandingPayable) })
                          }}
                          className="h-7 w-24 text-right text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Advance Warning / Summary */}
              <div className="rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Payment:</span>
                  <span className="font-bold">{formatMoney(numAmount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Allocated to Bills:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatMoney(allocatedTotal, currency)}
                  </span>
                </div>
                {calculatedAdvance > 0 && (
                  <div className="flex justify-between font-bold text-purple-600 dark:text-purple-400 border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span>Retained as Supplier Advance:</span>
                    <span>{formatMoney(calculatedAdvance, currency)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Remarks / Banking Details
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Bank transfer code, exchange dealer name, special instructions..."
                className="mt-1 h-16 w-full rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={isSubmitting}
              className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
            >
              {isSubmitting ? "Recording..." : "Record Payment & Update Ledger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voucher Preview Dialog */}
      <Dialog open={!!previewPayment} onOpenChange={() => setPreviewPayment(null)}>
        <DialogContent className="max-w-xl">
          {previewPayment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Supplier Payment Voucher #{previewPayment.paymentNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paid to: {previewPayment.supplierName} • {previewPayment.paymentDate}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Voucher
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Method:</span>{" "}
                  <span className="font-semibold">{previewPayment.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500">Ref / Check #:</span>{" "}
                  <span className="font-mono font-semibold">{previewPayment.referenceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Disbursed Amount:</span>{" "}
                  <span className="font-bold text-emerald-600">
                    {formatMoney(previewPayment.amount, previewPayment.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Supplier Advance:</span>{" "}
                  <span className="font-semibold text-purple-600">
                    {previewPayment.supplierAdvance > 0
                      ? formatMoney(previewPayment.supplierAdvance, previewPayment.currency)
                      : "None"}
                  </span>
                </div>
              </div>

              {previewPayment.allocations && previewPayment.allocations.length > 0 && (
                <div className="rounded border border-slate-200 overflow-hidden text-xs dark:border-slate-800">
                  <div className="bg-slate-50 p-2 font-bold text-slate-600 dark:bg-slate-800">
                    Settled Bills Breakdown
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[11px] text-slate-500 dark:bg-slate-900">
                      <tr>
                        <th className="p-2">Bill Number</th>
                        <th className="p-2 text-right">Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewPayment.allocations.map((a, i) => (
                        <tr key={i}>
                          <td className="p-2 font-medium">{a.billNumber}</td>
                          <td className="p-2 text-right font-bold text-emerald-600">
                            {formatMoney(a.allocatedAmount, previewPayment.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {previewPayment.remarks && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded dark:bg-slate-900">
                  <span className="font-semibold">Notes:</span> {previewPayment.remarks}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
