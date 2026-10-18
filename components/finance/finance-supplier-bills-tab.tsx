"use client"

import React, { useState } from "react"
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Trash2,
  Eye,
  Building2,
  DollarSign,
  ArrowDownLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney, roundMoney } from "@/lib/utils/money"
import type {
  SupplierBillRecord,
  SupplierBillItem,
  SupplierProfile,
  CostCategory,
} from "@/lib/types/finance"
import { toast } from "sonner"

const COST_CATEGORIES: CostCategory[] = [
  "Ocean Freight",
  "Port Handling (Origin)",
  "Port Handling (Destination)",
  "Origin Customs Clearance",
  "Destination Customs Clearance",
  "Border Clearance (Islam Qala / Torghundi)",
  "Border Clearance (Hairatan)",
  "Border Clearance (Spin Boldak)",
  "Trucking / Driver Rent",
  "Loading Labor",
  "Unloading Labor",
  "Terminal Storage / Demurrage",
  "Container Detention",
  "Documentation / Transit Pass Fee",
  "Escort / Security Fee",
  "Insurance",
  "Commission / Agent Fee",
  "Bank / Exchange Commission",
  "Other Cost",
]

interface FinanceSupplierBillsTabProps {
  bills: SupplierBillRecord[]
  suppliers: SupplierProfile[]
  onRefresh: () => void
}

export function FinanceSupplierBillsTab({
  bills,
  suppliers,
  onRefresh,
}: FinanceSupplierBillsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")

  // Create Bill Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [exchangeRate, setExchangeRate] = useState("1.0")
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [bolNumbersInput, setBolNumbersInput] = useState("")
  const [taxInput, setTaxInput] = useState("0")
  const [discountInput, setDiscountInput] = useState("0")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Items State
  const [items, setItems] = useState<SupplierBillItem[]>([
    {
      id: "sitem-1",
      costCategory: "Ocean Freight",
      description: "Freight Service",
      quantity: 1,
      rate: 1000,
      amount: 1000,
      currency: "USD",
    },
  ])

  // View Bill Modal
  const [previewBill, setPreviewBill] = useState<SupplierBillRecord | null>(null)

  // Filtered bills
  const filteredBills = bills.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false
    if (supplierFilter !== "all" && b.supplierId !== supplierFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = b.billNumber.toLowerCase().includes(q)
      const matchSupp = b.supplierName.toLowerCase().includes(q)
      const matchInv = b.supplierInvoiceNumber?.toLowerCase().includes(q)
      const matchBol = b.bolNumbers?.some((bol) => bol.toLowerCase().includes(q))
      if (!matchNum && !matchSupp && !matchInv && !matchBol) return false
    }
    return true
  })

  // KPIs
  const totalBilled = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
  const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0)
  const totalOutstanding = bills.reduce((sum, b) => sum + (b.outstandingPayable || 0), 0)
  const overdueCount = bills.filter((b) => b.status === "overdue").length

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `sitem-${Date.now()}`,
        costCategory: "Trucking / Driver Rent",
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        currency,
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    setItems(items.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, field: keyof SupplierBillItem, val: any) => {
    setItems(
      items.map((it) => {
        if (it.id !== id) return it
        const updated = { ...it, [field]: val }
        if (field === "quantity" || field === "rate") {
          const q = Number(field === "quantity" ? val : updated.quantity) || 0
          const r = Number(field === "rate" ? val : updated.rate) || 0
          updated.amount = roundMoney(q * r, 2)
        }
        return updated
      })
    )
  }

  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0)
  const tax = Number(taxInput) || 0
  const discount = Number(discountInput) || 0
  const grandTotal = Math.max(0, subtotal + tax - discount)

  const handleCreateBill = async () => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier")
      return
    }
    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) {
      toast.error("Supplier profile not found")
      return
    }

    try {
      setIsSubmitting(true)
      const bolList = bolNumbersInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        billDate,
        dueDate,
        currency,
        baseCurrency: "USD",
        exchangeRate: Number(exchangeRate) || 1.0,
        bolNumbers: bolList,
        items,
        tax,
        discount,
        notes,
      }

      const res = await fetch("/api/finance/supplier-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`Supplier Bill ${data.bill?.billNumber || ""} created successfully!`)
        setIsCreateOpen(false)
        // Reset form
        setSelectedSupplierId("")
        setSupplierInvoiceNumber("")
        setBolNumbersInput("")
        setTaxInput("0")
        setDiscountInput("0")
        setNotes("")
        setItems([
          {
            id: "sitem-1",
            costCategory: "Ocean Freight",
            description: "Freight Service",
            quantity: 1,
            rate: 1000,
            amount: 1000,
            currency: "USD",
          },
        ])
        onRefresh()
      } else {
        toast.error(data.error || "Failed to create supplier bill")
      }
    } catch (err: any) {
      toast.error(`Error creating bill: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Total Incurred Bills</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(totalBilled, "USD")}
            </div>
            <p className="text-[11px] text-slate-400">{bills.length} bills recorded</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Total Paid to Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalPaid, "USD")}
            </div>
            <p className="text-[11px] text-slate-400">Settled costs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Outstanding Payables</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatMoney(totalOutstanding, "USD")}
            </div>
            <p className="text-[11px] text-slate-400">Pending settlement</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-slate-500">Overdue Bills</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {overdueCount}
            </div>
            <p className="text-[11px] text-slate-400">Action needed</p>
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
              placeholder="Search by Bill #, Supplier, Inv #, BOL..."
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
                {s.name} ({s.category})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="posted">Posted</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </select>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="h-9 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Enter Supplier Bill
        </Button>
      </div>

      {/* Bills Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Bill Number</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Supplier Inv #</th>
                <th className="px-3 py-2.5">Bill / Due Date</th>
                <th className="px-3 py-2.5">BOLs Linked</th>
                <th className="px-3 py-2.5 text-right">Total Amount</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-3 py-2.5 text-right">Payable Balance</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                    No supplier bills found. Click &quot;Enter Supplier Bill&quot; to log incurred costs.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {bill.billNumber}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {bill.supplierName}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {bill.supplierInvoiceNumber || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      <div>{bill.billDate}</div>
                      {bill.dueDate && (
                        <div className="text-[10px] text-slate-400">Due: {bill.dueDate}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {bill.bolNumbers && bill.bolNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {bill.bolNumbers.map((b, i) => (
                            <span
                              key={i}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Direct Expense</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatMoney(bill.totalAmount, bill.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(bill.paidAmount, bill.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatMoney(bill.outstandingPayable, bill.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          bill.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : bill.status === "partially_paid"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : bill.status === "overdue"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {bill.status.toUpperCase().replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewBill(bill)}
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

      {/* Enter Supplier Bill Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Enter Supplier Bill (Incurred Shipment Cost)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Supplier *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Supplier Invoice / Ref #
                </label>
                <Input
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  placeholder="e.g. MSK-8921029"
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value)
                    setItems(items.map((it) => ({ ...it, currency: e.target.value })))
                  }}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="AFN">AFN - Afghan Afghani</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bill Date
                </label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Exchange Rate to USD
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Linked BOL Numbers (comma separated)
              </label>
              <Input
                value={bolNumbersInput}
                onChange={(e) => setBolNumbersInput(e.target.value)}
                placeholder="e.g. SA-2026-001, SA-2026-002"
                className="mt-1 h-9 text-xs"
              />
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Bill Line Items (Cost Breakdown)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="h-7 gap-1 text-[11px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-12 gap-2 items-center rounded-md border border-slate-200 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="col-span-3">
                      <select
                        value={it.costCategory}
                        onChange={(e) => updateItem(it.id, "costCategory", e.target.value)}
                        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {COST_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4">
                      <Input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, "description", e.target.value)}
                        placeholder="Description"
                        className="h-8 text-[11px]"
                      />
                    </div>

                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, "quantity", Number(e.target.value))}
                        placeholder="Qty"
                        className="h-8 text-[11px]"
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={it.rate}
                        onChange={(e) => updateItem(it.id, "rate", Number(e.target.value))}
                        placeholder="Rate"
                        className="h-8 text-[11px]"
                      />
                    </div>

                    <div className="col-span-1 text-right font-bold text-slate-800 dark:text-slate-200">
                      {it.amount}
                    </div>

                    <div className="col-span-1 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length <= 1}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Remarks */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes / Terms
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms, payment instructions, container demurrage details..."
                  className="mt-1 h-20 w-full rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1.5 text-xs text-right">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-semibold">{formatMoney(subtotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-slate-500">Tax / Customs Fee:</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={taxInput}
                    onChange={(e) => setTaxInput(e.target.value)}
                    className="h-7 w-24 text-right text-xs"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-slate-500">Discount / Rebate:</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="h-7 w-24 text-right text-xs"
                  />
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatMoney(grandTotal, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBill}
              disabled={isSubmitting}
              className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              {isSubmitting ? "Posting Bill..." : "Post Bill to Ledger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Bill Dialog */}
      <Dialog open={!!previewBill} onOpenChange={() => setPreviewBill(null)}>
        <DialogContent className="max-w-2xl">
          {previewBill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Supplier Bill #{previewBill.billNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supplier: {previewBill.supplierName} • Inv #{previewBill.supplierInvoiceNumber}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Bill Date:</span>{" "}
                  <span className="font-semibold">{previewBill.billDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">Due Date:</span>{" "}
                  <span className="font-semibold">{previewBill.dueDate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Linked BOLs:</span>{" "}
                  <span className="font-semibold">
                    {previewBill.bolNumbers?.join(", ") || "Direct expense"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className="font-bold text-blue-600 uppercase">{previewBill.status}</span>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 overflow-hidden text-xs dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-800">
                    <tr>
                      <th className="p-2">Category</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewBill.items.map((it, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{it.costCategory}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-300">{it.description}</td>
                        <td className="p-2 text-right">{it.quantity}</td>
                        <td className="p-2 text-right">{it.rate}</td>
                        <td className="p-2 text-right font-bold">
                          {formatMoney(it.amount, previewBill.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-right text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span>{formatMoney(previewBill.subtotal, previewBill.currency)}</span>
                </div>
                {previewBill.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax:</span>
                    <span>{formatMoney(previewBill.tax, previewBill.currency)}</span>
                  </div>
                )}
                {previewBill.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount:</span>
                    <span>-{formatMoney(previewBill.discount, previewBill.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 border-t pt-1">
                  <span>Total Bill Amount:</span>
                  <span>{formatMoney(previewBill.totalAmount, previewBill.currency)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Paid to Date:</span>
                  <span>{formatMoney(previewBill.paidAmount, previewBill.currency)}</span>
                </div>
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Outstanding Payable:</span>
                  <span>{formatMoney(previewBill.outstandingPayable, previewBill.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
