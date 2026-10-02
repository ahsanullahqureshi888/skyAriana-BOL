"use client"

import React, { useState } from "react"
import {
  FileText,
  Plus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Trash2,
  Eye,
  Send,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney, roundMoney } from "@/lib/utils/money"
import type { FinanceInvoiceRecord, FinanceInvoiceItem } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceInvoicesTabProps {
  invoices: FinanceInvoiceRecord[]
  onRefresh: () => void
}

export function FinanceInvoicesTab({ invoices, onRefresh }: FinanceInvoicesTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currencyFilter, setCurrencyFilter] = useState("all")

  // Create Invoice Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Net 15 Days")
  const [bolNumbersInput, setBolNumbersInput] = useState("")
  const [items, setItems] = useState<FinanceInvoiceItem[]>([
    {
      id: "item-1",
      description: "Sea Freight Charges",
      chargeType: "freight",
      quantity: 1,
      unit: "Container",
      unitPrice: 3500,
      amount: 3500,
      currency: "USD",
    },
  ])
  const [notes, setNotes] = useState("Payment due upon presentation of commercial documents.")

  // Preview Invoice State
  const [previewInvoice, setPreviewInvoice] = useState<FinanceInvoiceRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false
    if (currencyFilter !== "all" && inv.currency !== currencyFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNumber = inv.invoiceNumber.toLowerCase().includes(q)
      const matchCust = inv.customerName.toLowerCase().includes(q)
      const matchBol = inv.bolNumbers?.some((b) => b.toLowerCase().includes(q))
      if (!matchNumber && !matchCust && !matchBol) return false
    }
    return true
  })

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: "",
        chargeType: "freight",
        quantity: 1,
        unit: "Unit",
        unitPrice: 0,
        amount: 0,
        currency,
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    setItems(items.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, field: keyof FinanceInvoiceItem, val: any) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: val }
        if (field === "quantity" || field === "unitPrice") {
          const q = Number(field === "quantity" ? val : updated.quantity) || 0
          const p = Number(field === "unitPrice" ? val : updated.unitPrice) || 0
          updated.amount = roundMoney(q * p, 2)
        }
        return updated
      })
    )
  }

  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  const handleCreateInvoice = async (autoPost = false) => {
    if (!customerName.trim()) {
      toast.error("Please enter a customer name")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          currency,
          issueDate,
          dueDate,
          paymentTerms,
          bolNumbers: bolNumbersInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          items,
          notes,
          autoPost,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create invoice")
      }

      toast.success(
        autoPost
          ? `Invoice ${data.data.invoiceNumber} created and posted to ledger!`
          : `Draft invoice ${data.data.invoiceNumber} created`
      )
      setIsCreateOpen(false)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePostToLedger = async (invoiceId: string) => {
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", invoiceId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to post invoice")
      toast.success("Invoice posted to customer ledger successfully!")
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search invoice, customer, BOL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
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
          onClick={() => setIsCreateOpen(true)}
          className="h-9 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices List Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">BOL Reference</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ledger</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {inv.issueDate}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {inv.customerName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {inv.bolNumbers?.length > 0 ? (
                          inv.bolNumbers.join(", ")
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(inv.totalAmount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatMoney(inv.paidAmount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatMoney(inv.outstandingAmount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : inv.status === "partially_paid"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : inv.status === "overdue"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inv.postedToLedger ? (
                          <span
                            title={`Posted at ${inv.postedAt || "Ledger"}`}
                            className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          >
                            <CheckCircle2 className="h-3 w-3 text-blue-600" />
                            Posted
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                            onClick={() => handlePostToLedger(inv.id)}
                          >
                            Post
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                          onClick={() => setPreviewInvoice(inv)}
                          title="Preview & Print Invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE INVOICE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Create Commercial / Logistics Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Customer / Shipper Name *
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

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Payment Terms
                </label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Issue Date
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  BOL Numbers (comma-separated)
                </label>
                <Input
                  placeholder="e.g. BOL-2026-NSA626, BOL-2026-NSA627"
                  value={bolNumbersInput}
                  onChange={(e) => setBolNumbersInput(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Charge Line Items
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] font-bold"
                  onClick={addItem}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      className="h-8 flex-1 text-xs"
                    />
                    <select
                      value={item.chargeType}
                      onChange={(e) => updateItem(item.id, "chargeType", e.target.value)}
                      className="h-8 rounded border border-slate-200 px-2 text-[11px] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <option value="freight">Freight</option>
                      <option value="truck">Truck</option>
                      <option value="shipping_line">Shipping Line</option>
                      <option value="port">Port</option>
                      <option value="customs">Customs</option>
                      <option value="documentation">Documentation</option>
                      <option value="container">Container</option>
                      <option value="handling">Handling</option>
                      <option value="other">Other</option>
                    </select>
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      className="h-8 w-16 text-center text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                      className="h-8 w-24 text-right text-xs"
                    />
                    <div className="w-24 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatMoney(item.amount, currency)}
                    </div>
                    {items.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-end border-t border-slate-200 pt-2 text-xs font-bold dark:border-slate-800">
                <span>Subtotal: {formatMoney(calculatedSubtotal, currency)}</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Invoice Notes / Payment Instructions
              </label>
              <Input
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
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleCreateInvoice(false)}
            >
              Save as Draft
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => handleCreateInvoice(true)}
            >
              Save & Post to Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREVIEW & PRINT INVOICE MODAL */}
      {previewInvoice && (
        <Dialog open={Boolean(previewInvoice)} onOpenChange={() => setPreviewInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-white text-slate-900 font-sans text-xs">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    SKY ARIANA LIMITED
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    International Multimodal Logistics & Freight Forwarding
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Kandahar, Afghanistan | Dubai, UAE | Bandar Abbas, Iran
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-blue-800 uppercase tracking-wide">
                    COMMERCIAL INVOICE
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-900 mt-1">
                    {previewInvoice.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Date: {previewInvoice.issueDate}
                  </div>
                  {previewInvoice.dueDate && (
                    <div className="text-[11px] font-semibold text-rose-600">
                      Due: {previewInvoice.dueDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Bill To & References */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Billed To:
                  </span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {previewInvoice.customerName}
                  </div>
                  {previewInvoice.customerAddress && (
                    <div className="text-slate-600 mt-0.5">{previewInvoice.customerAddress}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    BOL References:
                  </span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    {previewInvoice.bolNumbers?.join(", ") || "—"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Terms: {previewInvoice.paymentTerms}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full my-4 text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[10px] font-bold uppercase text-slate-500">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">Type</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewInvoice.items?.map((item) => (
                    <tr key={item.id} className="py-2">
                      <td className="py-2 font-medium">{item.description}</td>
                      <td className="py-2 text-center text-slate-500 capitalize">{item.chargeType}</td>
                      <td className="py-2 text-center">{item.quantity} {item.unit}</td>
                      <td className="py-2 text-right font-mono">{formatMoney(item.unitPrice, previewInvoice.currency)}</td>
                      <td className="py-2 text-right font-mono font-bold">{formatMoney(item.amount, previewInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="border-t-2 border-slate-300 pt-3 flex justify-end">
                <div className="w-64 space-y-1.5 text-right text-xs">
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                    <span>Total Amount:</span>
                    <span>{formatMoney(previewInvoice.totalAmount, previewInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid Amount:</span>
                    <span>{formatMoney(previewInvoice.paidAmount, previewInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-rose-600 border-t border-slate-200 pt-1">
                    <span>Outstanding Balance:</span>
                    <span>{formatMoney(previewInvoice.outstandingAmount, previewInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Notes and Bank Details */}
              <div className="mt-8 border-t border-slate-200 pt-4 text-[10px] text-slate-500">
                <p className="font-bold text-slate-700">Bank Details for Wire Transfer:</p>
                <p>Bank: Bank Alfalah / Ghazanfar Bank | Beneficiary: SKY ARIANA LIMITED</p>
                <p className="mt-2 font-bold text-slate-700">Payment Terms:</p>
                <p>{previewInvoice.notes || "All payments strictly according to contract."}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setPreviewInvoice(null)}>
                Close
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Print A4 Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
