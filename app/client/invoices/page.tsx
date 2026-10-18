"use client"
import React, { useState, useEffect } from "react"
import { Search, Receipt, Calendar, AlertCircle, CheckCircle2, ChevronRight, ArrowUpRight, DollarSign } from "lucide-react"
import Link from "next/link"

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "UNPAID" | "PAID" | "OVERDUE">("ALL")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/client/invoices")
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success) setInvoices(data.invoices || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = invoices.filter(inv => {
    if (filter === "UNPAID" && (inv.status === "PAID" || inv.status === "OVERDUE")) return false
    if (filter === "PAID" && inv.status !== "PAID") return false
    if (filter === "OVERDUE" && inv.status !== "OVERDUE") return false

    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.bolNumber && inv.bolNumber.toLowerCase().includes(q)) ||
      (inv.cargoDescription && inv.cargoDescription.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading billing invoices...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Commercial & Freight Invoices</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Access your issued invoices, payment statuses, and detailed charge breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/client/payments"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            Submit Payment Proof
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "UNPAID", "OVERDUE", "PAID"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                filter === f 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === "ALL" ? "All Invoices" : f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Invoice # or BOL..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">BOL Ref</th>
                <th className="px-6 py-4">Issue / Due Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filtered.map(inv => {
                const isOverdue = inv.status === "OVERDUE"
                const isPaid = inv.status === "PAID"
                return (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-black text-white">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{inv.cargoDescription || "Freight Charges"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-300">
                      {inv.bolNumber}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-300 font-bold">{inv.invoiceDate || "—"}</div>
                      <div className={`text-[11px] font-medium ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                        Due: {inv.dueDate || "Upon Receipt"}
                        {isOverdue && ` (${inv.daysOverdue}d overdue)`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-white">
                        {inv.currency} {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {inv.outstandingAmount > 0 && inv.outstandingAmount !== inv.totalAmount && (
                        <div className="text-[11px] text-amber-400 font-bold">
                          Due: {inv.currency} {inv.outstandingAmount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPaid 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : isOverdue 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/client/invoices/${encodeURIComponent(inv.id)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-black transition-colors border border-slate-700"
                      >
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    No invoices matching your selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
