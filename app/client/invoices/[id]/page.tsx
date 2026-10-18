"use client"
import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Printer, Building2, CreditCard, ShieldCheck, Download } from "lucide-react"
import Link from "next/link"

export default function ClientInvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const id = params?.id as string
    if (!id) return
    fetch(`/api/client/invoices/${encodeURIComponent(id)}`)
      .then(res => {
        if (res.status === 401) {
          router.push("/client/login")
          return null
        }
        if (res.status === 403 || res.status === 404) {
          setError("Invoice not found or access is not authorized for your company.")
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.invoice) setInvoice(data.invoice)
        setLoading(false)
      })
      .catch(() => {
        setError("Error loading invoice.")
        setLoading(false)
      })
  }, [params, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading invoice specifications...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="text-red-400 font-bold">{error || "Invoice not found"}</div>
        <Link href="/client/invoices" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
      </div>
    )
  }

  const isPaid = invoice.status === "PAID"

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <Link href="/client/invoices" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all border border-slate-700"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800 pb-6 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black">
                SA
              </div>
              <span className="font-black text-xl text-white tracking-wider print:text-black">SKY ARIANA</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">
              {invoice.sellerName || "Sky Ariana International Logistics"}
            </div>
            {invoice.sellerAddress && (
              <div className="text-xs text-slate-400 print:text-slate-600">{invoice.sellerAddress}</div>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <div className="text-2xl font-black text-white print:text-black font-mono">{invoice.invoiceNumber}</div>
            <div className="text-xs text-slate-400 print:text-slate-600 font-bold">
              Issued: <span className="text-white print:text-black">{invoice.invoiceDate}</span>
            </div>
            <div className="text-xs text-slate-400 print:text-slate-600 font-bold">
              Due Date: <span className="text-white print:text-black">{invoice.dueDate || "Upon Receipt"}</span>
            </div>
            <div className="pt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 print:bg-slate-100 print:border-slate-200">
            <div className="font-black text-slate-400 uppercase tracking-wider mb-2">Billed To (Customer)</div>
            <div className="font-black text-sm text-white print:text-black">{invoice.buyerName}</div>
            {invoice.buyerAddress && <div className="text-slate-400 print:text-slate-600 mt-1">{invoice.buyerAddress}</div>}
            {invoice.buyerContact && <div className="text-slate-400 print:text-slate-600 mt-1">Contact: {invoice.buyerContact}</div>}
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 print:bg-slate-100 print:border-slate-200 space-y-1.5">
            <div className="font-black text-slate-400 uppercase tracking-wider mb-2">Shipment References</div>
            <div><span className="font-bold text-slate-400">Bill of Lading:</span> <span className="font-mono font-bold text-white print:text-black">{invoice.bolNumber}</span></div>
            <div><span className="font-bold text-slate-400">Commodity:</span> <span className="text-white print:text-black">{invoice.commodity || "Commercial Cargo"}</span></div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden print:border-slate-300">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-black print:bg-slate-100 print:text-slate-700">
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3 text-right">Rate</th>
                <th className="px-5 py-3 text-right">Amount ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-slate-200">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="px-5 py-3.5 font-bold text-white print:text-black">{item.description}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-300 print:text-slate-700">{item.quantity} {item.unit}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-300 print:text-slate-700">{parseFloat(item.unitPrice || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-white print:text-black">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500 font-bold">Standard shipment freight and documentation charges.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-6 pt-2">
          {/* Wire Bank Instructions */}
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/30 print:bg-slate-100 print:border-slate-300 text-xs space-y-1 max-w-sm">
            <div className="flex items-center gap-1.5 font-black text-amber-400 print:text-slate-900 uppercase">
              <CreditCard className="w-3.5 h-3.5" /> Wire Payment Details
            </div>
            {invoice.bankDetails?.bankName && <div><span className="font-bold text-slate-400">Bank:</span> {invoice.bankDetails.bankName}</div>}
            {invoice.bankDetails?.accountName && <div><span className="font-bold text-slate-400">Account:</span> {invoice.bankDetails.accountName}</div>}
            {invoice.bankDetails?.accountNumber && <div><span className="font-bold text-slate-400">A/C No:</span> {invoice.bankDetails.accountNumber}</div>}
            {invoice.bankDetails?.iban && <div><span className="font-bold text-slate-400">IBAN:</span> {invoice.bankDetails.iban}</div>}
            {invoice.bankDetails?.swiftCode && <div><span className="font-bold text-slate-400">SWIFT:</span> {invoice.bankDetails.swiftCode}</div>}
          </div>

          {/* Amount Calculation */}
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white print:text-black font-bold">{invoice.currency} {invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax:</span>
                <span className="font-mono text-white print:text-black">{invoice.currency} {invoice.tax.toLocaleString()}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Discount:</span>
                <span className="font-mono text-emerald-400">-{invoice.currency} {invoice.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-800 print:border-slate-300 flex justify-between text-base font-black">
              <span className="text-white print:text-black">Total Due:</span>
              <span className="text-amber-400 print:text-black">{invoice.currency} {invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
