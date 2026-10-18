"use client"
import React, { useState, useEffect } from "react"
import { Wallet, Upload, Download, Search } from "lucide-react"

export default function ClientFinancials() {
  const [ledgers, setLedgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // We would fetch /api/client/ledgers here.
    // For now we mock the API response structure that we will build next.
    setTimeout(() => {
      setLedgers([]) // Empty state for now since we haven't built the ledger API route yet
      setLoading(false)
    }, 500)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Financials & Invoices</h1>
          <p className="text-slate-500 font-medium">View your account statements and payment history.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-xl text-sm font-black transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            Upload Payment Proof
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center font-bold text-slate-500 animate-pulse">Loading financials...</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black">No Financial Records Found</h3>
          <p className="text-slate-500 font-medium max-w-sm mx-auto">
            You do not have any active ledger entries or invoices associated with your company yet.
          </p>
        </div>
      )}
    </div>
  )
}
