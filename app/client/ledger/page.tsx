"use client"
import React, { useState, useEffect } from "react"
import { Search, Printer, FileSpreadsheet, ArrowDownLeft, ArrowUpRight, DollarSign, Wallet } from "lucide-react"

export default function ClientLedgerPage() {
  const [ledgerData, setLedgerData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/client/ledger")
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success) setLedgerData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Auditing customer ledger statement...</p>
      </div>
    )
  }

  const currencies = Object.keys(ledgerData?.summary || {})
  const activeCurrencies = selectedCurrency === "ALL" ? currencies : [selectedCurrency]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Account Ledger Statement</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Complete transaction history with verified mathematical invariance: Net Balance = Total Debit - Total Credit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all border border-slate-700"
          >
            <Printer className="w-4 h-4" /> Print Statement
          </button>
        </div>
      </div>

      {/* Currency Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currencies.map(curr => {
          const s = ledgerData.summary[curr]
          const isDue = s.netBalance > 0
          const isZero = s.netBalance === 0
          return (
            <div 
              key={curr} 
              onClick={() => setSelectedCurrency(selectedCurrency === curr ? "ALL" : curr)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedCurrency === curr || selectedCurrency === "ALL"
                  ? 'bg-slate-900 border-slate-700 shadow-md'
                  : 'bg-slate-900/50 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{curr} Account</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {s.transactionsCount} Entries
                </span>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-black ${isDue ? 'text-red-400' : isZero ? 'text-slate-300' : 'text-emerald-400'}`}>
                  {curr} {Math.abs(s.netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-[11px] font-bold">
                  {isDue ? (
                    <span className="text-red-400">Total Outstanding Balance</span>
                  ) : isZero ? (
                    <span className="text-slate-400">Account Settled</span>
                  ) : (
                    <span className="text-emerald-400">Available Prepayment Credit</span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                <span>Total Debit: {s.totalDebit.toLocaleString()}</span>
                <span>Total Credit: {s.totalCredit.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCurrency("ALL")}
            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
              selectedCurrency === "ALL" ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Currencies
          </button>
          {currencies.map(curr => (
            <button
              key={curr}
              onClick={() => setSelectedCurrency(curr)}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                selectedCurrency === curr ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search description or reference..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Ledger Statements per Currency */}
      {activeCurrencies.map(curr => {
        const statement = ledgerData.statements?.[curr] || []
        const filteredEntries = statement.filter((e: any) => {
          if (!search.trim()) return true
          const q = search.toLowerCase()
          return (
            (e.description && e.description.toLowerCase().includes(q)) ||
            (e.reference && e.reference.toLowerCase().includes(q))
          )
        })

        return (
          <div key={curr} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-0">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-white">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>{curr} Chronological Statement</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                Net: {curr} {ledgerData.summary?.[curr]?.netBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/40 border-b border-slate-800 font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Reference / Doc</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Debit (Due)</th>
                    <th className="px-6 py-3.5 text-right">Credit (Paid)</th>
                    <th className="px-6 py-3.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEntries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-300 whitespace-nowrap">{entry.date}</td>
                      <td className="px-6 py-3.5 font-mono font-bold text-white whitespace-nowrap">{entry.reference || "—"}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-200">{entry.description}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-red-400">
                        {entry.debit > 0 ? entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-400">
                        {entry.credit > 0 ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-black text-white">
                        {entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-bold">
                        No transactions recorded for this currency statement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
