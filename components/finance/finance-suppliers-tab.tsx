"use client"

import React, { useState } from "react"
import {
  Building2,
  Plus,
  Search,
  FileText,
  DollarSign,
  Printer,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney } from "@/lib/utils/money"
import type { SupplierProfile, SupplierCategory, SupplierLedgerTransaction } from "@/lib/types/finance"
import { toast } from "sonner"

const SUPPLIER_CATEGORIES: SupplierCategory[] = [
  "Shipping Line",
  "Trucking Company",
  "Transporter",
  "Customs Agent",
  "Port Agent",
  "Freight Forwarder",
  "Terminal",
  "Warehouse",
  "Loading Company",
  "Unloading Company",
  "Inspection Company",
  "Document Agent",
  "Exchange / Finance Agent",
  "Other Supplier",
]

interface FinanceSuppliersTabProps {
  suppliers: SupplierProfile[]
  onRefresh: () => void
}

export function FinanceSuppliersTab({ suppliers, onRefresh }: FinanceSuppliersTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<SupplierProfile | null>(null)
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerTransaction[]>([])
  const [isLoadingLedger, setIsLoadingLedger] = useState(false)

  // Form State
  const [name, setName] = useState("")
  const [category, setCategory] = useState<SupplierCategory>("Shipping Line")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [openingPayable, setOpeningPayable] = useState("0")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (selectedCategory !== "all" && s.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = s.name.toLowerCase().includes(q)
      const matchNum = s.supplierNumber.toLowerCase().includes(q)
      const matchCat = s.category.toLowerCase().includes(q)
      if (!matchName && !matchNum && !matchCat) return false
    }
    return true
  })

  // Aggregated KPIs
  const totalBills = suppliers.reduce((sum, s) => sum + s.totalBills, 0)
  const totalPaid = suppliers.reduce((sum, s) => sum + s.totalPaid, 0)
  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.outstandingPayable, 0)
  const totalAdvance = suppliers.reduce((sum, s) => sum + s.advancePaid, 0)

  const handleCreateSupplier = async () => {
    if (!name.trim()) {
      toast.error("Supplier name is required")
      return
    }
    try {
      setIsSubmitting(true)
      const res = await fetch("/api/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          currency,
          openingPayable: parseFloat(openingPayable) || 0,
          notes: notes.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Supplier ${data.supplier.name} created successfully!`)
        setIsAddOpen(false)
        setName("")
        setContactPerson("")
        setPhone("")
        setEmail("")
        setOpeningPayable("0")
        setNotes("")
        onRefresh()
      } else {
        toast.error(data.error || "Failed to create supplier")
      }
    } catch {
      toast.error("Network error while creating supplier")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenStatement = async (supplier: SupplierProfile) => {
    setSelectedSupplierForStatement(supplier)
    setIsLoadingLedger(true)
    try {
      const res = await fetch(`/api/finance/suppliers/${supplier.id}`)
      const data = await res.json()
      if (data.success) {
        setSupplierLedger(data.ledger || [])
      }
    } catch {
      toast.error("Failed to load supplier ledger transactions")
    } finally {
      setIsLoadingLedger(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Total Suppliers</span>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {suppliers.length}
            </div>
            <p className="mt-1 text-xs text-slate-400">Active transport & logistics partners</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Total Incurred Bills</span>
              <ArrowUpRight className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-400">
              ${formatMoney(totalBills)}
            </div>
            <p className="mt-1 text-xs text-slate-400">Total supplier invoices approved</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Total Paid</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ${formatMoney(totalPaid)}
            </div>
            <p className="mt-1 text-xs text-slate-400">Settled to shipping lines & agents</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Outstanding Payable</span>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
              ${formatMoney(totalOutstanding)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {totalAdvance > 0 ? `Advance Paid: $${formatMoney(totalAdvance)}` : "Current balance owed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search supplier, number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Categories</option>
            {SUPPLIER_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 font-bold shadow-sm">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Supplier Number</th>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Total Bills</th>
                <th className="px-4 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-right">Outstanding Payable</th>
                <th className="px-4 py-3 text-right">Advance Paid</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No suppliers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {s.supplierNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {s.name}
                      {s.contactPerson && (
                        <div className="text-[10px] font-normal text-slate-500">Contact: {s.contactPerson}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {s.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{s.currency}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {s.currency} {formatMoney(s.totalBills)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {s.currency} {formatMoney(s.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 dark:text-amber-400">
                      {s.currency} {formatMoney(s.outstandingPayable)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">
                      {s.advancePaid > 0 ? (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {s.currency} {formatMoney(s.advancePaid)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenStatement(s)}
                        className="h-7 gap-1 text-[11px] font-bold"
                      >
                        <FileText className="h-3.5 w-3.5" /> Ledger Statement
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Transport & Logistics Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Company Name *</label>
              <Input
                placeholder="e.g. MAERSK LINE AFGHANISTAN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Supplier Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupplierCategory)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                {SUPPLIER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Contact Person</label>
                <Input
                  placeholder="e.g. Ahmad Shah"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                <Input
                  placeholder="+93 79 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Default Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="AFN">AFN</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Opening Payable</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={openingPayable}
                  onChange={(e) => setOpeningPayable(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Notes / Terms</label>
              <Input
                placeholder="Payment terms, bank details, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateSupplier} disabled={isSubmitting} className="font-bold">
              {isSubmitting ? "Creating..." : "Save Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Statement Modal */}
      {selectedSupplierForStatement && (
        <Dialog
          open={Boolean(selectedSupplierForStatement)}
          onOpenChange={(open) => !open && setSelectedSupplierForStatement(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <DialogTitle className="text-base font-bold">
                    Supplier Statement: {selectedSupplierForStatement.name}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Supplier No: {selectedSupplierForStatement.supplierNumber} | Category:{" "}
                    {selectedSupplierForStatement.category}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Outstanding Payable</div>
                  <div className="text-lg font-black text-amber-700 dark:text-amber-400">
                    {selectedSupplierForStatement.currency}{" "}
                    {formatMoney(selectedSupplierForStatement.outstandingPayable)}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto py-2 text-xs">
              {isLoadingLedger ? (
                <div className="py-8 text-center text-slate-400">Loading statement transactions...</div>
              ) : supplierLedger.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No ledger transactions posted for this supplier.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Ref / BOL</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Bill Amount (+)</th>
                      <th className="px-3 py-2 text-right">Payment Paid (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {supplierLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-500">{tx.transactionDate}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {tx.transactionType}
                        </td>
                        <td className="px-3 py-2 font-mono">{tx.bolNumber || tx.referenceNumber}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{tx.description}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                          {tx.billAmount > 0 ? `${tx.currency} ${formatMoney(tx.billAmount)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {tx.paymentAmount > 0 ? `${tx.currency} ${formatMoney(tx.paymentAmount)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <DialogFooter className="border-t pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs font-bold"
              >
                <Printer className="h-3.5 w-3.5" /> Print Statement
              </Button>
              <Button size="sm" onClick={() => setSelectedSupplierForStatement(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
