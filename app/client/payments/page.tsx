"use client"
import React, { useState, useEffect } from "react"
import { CreditCard, Upload, CheckCircle2, Clock, AlertCircle, Plus, X, Search, FileText } from "lucide-react"

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // Form state
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")
  const [reference, setReference] = useState("")
  const [bankName, setBankName] = useState("")
  const [notes, setNotes] = useState("")
  const [receiptBase64, setReceiptBase64] = useState("")
  const [receiptName, setReceiptName] = useState("")

  const fetchPayments = () => {
    fetch("/api/client/payments")
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success) setPayments(data.payments || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/client/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          paymentDate,
          paymentMethod,
          bankName,
          reference,
          notes,
          receiptData: receiptBase64,
          receiptFileName: receiptName,
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg("Payment proof submitted successfully! Our accounting department will verify and post it to your ledger.")
        setModalOpen(false)
        // Reset form
        setAmount("")
        setReference("")
        setNotes("")
        setReceiptBase64("")
        setReceiptName("")
        fetchPayments()
      } else {
        setErrorMsg(data.error || "Failed to submit payment proof.")
      }
    } catch (err: any) {
      setErrorMsg("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading payment history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Payments & Proof Submissions</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Confirmed credit transactions and bank slip proof uploads awaiting internal audit.
          </p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setErrorMsg(""); setSuccessMsg(""); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Upload className="w-4 h-4" />
          Upload Payment Slip
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Confirmed Ledger Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
          <div className="font-black text-white text-sm">Confirmed Payments on Record</div>
          <span className="text-xs text-slate-400 font-bold">{payments.length} Payments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/40 border-b border-slate-800 font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Payment Date</th>
                <th className="px-6 py-3.5">Reference / Slip #</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Amount Credited</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-slate-300">{p.date}</td>
                  <td className="px-6 py-3.5 font-mono font-bold text-white">{p.reference || "—"}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-200">{p.description}</td>
                  <td className="px-6 py-3.5 font-mono font-bold text-emerald-400">
                    {p.currency} {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-bold">
                    No confirmed ledger payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Payment Proof Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Accounting Verification</div>
                <h2 className="text-xl font-black text-white">Upload Payment Slip / Proof</h2>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitProof} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-400 uppercase mb-1.5">Amount Paid *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-400 uppercase mb-1.5">Currency *</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="USD">USD (United States Dollar)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="AFN">AFN (Afghan Afghani)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-400 uppercase mb-1.5">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-400 uppercase mb-1.5">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Wire / TT</option>
                    <option value="EXCHANGE">Hawala / Exchange Office</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-400 uppercase mb-1.5">Bank / Exchange Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. Dubai Islamic Bank"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-400 uppercase mb-1.5">Transaction / Slip Ref #</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="e.g. TT-9847291"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase mb-1.5">Attach Bank Slip / Screenshot *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-medium file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                />
                {receiptName && (
                  <div className="text-[11px] text-emerald-400 font-bold mt-1">
                    Attached: {receiptName}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-black text-slate-400 uppercase mb-1.5">Notes / Associated BOL</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Mention BOL number or invoice number this payment covers..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {submitting ? "Uploading..." : "Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
