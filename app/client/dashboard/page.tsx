"use client"
import React, { useState, useEffect } from "react"
import { 
  Truck, 
  Wallet, 
  FileText, 
  Anchor, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Copy, 
  Check, 
  CreditCard, 
  Clock, 
  Box, 
  ShieldAlert 
} from "lucide-react"
import Link from "next/link"

export default function ClientDashboard() {
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [recentShipments, setRecentShipments] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/client/dashboard").then(r => r.ok ? r.json() : null),
      fetch("/api/client/shipments").then(r => r.ok ? r.json() : null),
    ])
      .then(([dashData, shpData]) => {
        if (dashData?.kpis) setKpis(dashData.kpis)
        if (shpData?.shipments) setRecentShipments(shpData.shipments.slice(0, 5))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const copyUpdate = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading secure portal overview...</p>
      </div>
    )
  }

  if (!kpis) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold bg-slate-900 rounded-3xl border border-slate-800">
        Unable to load dashboard data. Please log in again.
      </div>
    )
  }

  const filteredShipments = recentShipments.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.referenceNumber && s.referenceNumber.toLowerCase().includes(q)) ||
      (s.commodity && s.commodity.toLowerCase().includes(q)) ||
      (s.containers && s.containers.some((c: any) => (c.containerNumber || "").toLowerCase().includes(q)))
    )
  })

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Real-time status of your active cargo, ledger balances, and documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/client/payments"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <CreditCard className="w-4 h-4" />
            Upload Payment Proof
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Shipments</div>
            <div className="text-3xl font-black text-blue-400">{kpis.activeShipments ?? 0}</div>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">In Transit / At Sea</div>
            <div className="text-3xl font-black text-amber-400">{kpis.atSea ?? 0}</div>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
            <Anchor className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Delivered Cargo</div>
            <div className="text-3xl font-black text-emerald-400">{kpis.delivered ?? 0}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Documents Ready</div>
            <div className="text-3xl font-black text-purple-400">{kpis.documentsReady ?? 0}</div>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Financial Demarcation & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outstanding Balance Breakdown */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <h2 className="font-black text-lg text-white">Account Balances (By Currency)</h2>
            </div>
            <Link href="/client/ledger" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ledger Statement <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.outstandingBalances && kpis.outstandingBalances.length > 0 ? (
              kpis.outstandingBalances.map((bal: any, idx: number) => {
                const isDue = bal.amount > 0
                const isZero = bal.amount === 0
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{bal.currency} Balance</div>
                    <div className="mt-2">
                      <div className={`text-2xl font-black ${isDue ? 'text-red-400' : isZero ? 'text-slate-300' : 'text-emerald-400'}`}>
                        {bal.currency} {Math.abs(bal.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="mt-1 text-[11px] font-bold">
                        {isDue ? (
                          <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Outstanding Due</span>
                        ) : isZero ? (
                          <span className="text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">Settled (0.00)</span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Available Credit</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-3 text-center py-6 text-slate-500 font-bold">
                No active currency balances recorded.
              </div>
            )}
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200 font-medium flex items-center gap-2">
            <span className="font-bold text-amber-400">Rule:</span>
            Ledger balances strictly satisfy Total Debit - Total Credit with independent currency segregation.
          </div>
        </div>

        {/* Quick Portal Navigation */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-black text-lg text-white mb-2">Direct Shortcuts</h3>
            <p className="text-slate-400 text-xs font-medium">Quickly jump to key sections of your account.</p>
            <div className="mt-4 space-y-2.5">
              <Link 
                href="/client/containers" 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white font-bold text-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Box className="w-4 h-4 text-blue-400" />
                  <span>Track Containers</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link 
                href="/client/invoices" 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white font-bold text-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Unpaid Invoices</span>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  {kpis.invoicesDue ?? 0}
                </span>
              </Link>

              <Link 
                href="/client/documents" 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white font-bold text-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Download Documents</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            For operational inquiries, WhatsApp Sky Ariana support with your BOL reference.
          </div>
        </div>
      </div>

      {/* Recent Shipments & Quick Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-lg text-white">Active Cargo & Shipments</h2>
            <p className="text-slate-400 text-xs font-medium">Customer-safe live timeline and container milestones.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search BOL or Container #..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">BOL / Ref #</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Commodity</th>
                <th className="px-6 py-3.5">Containers</th>
                <th className="px-6 py-3.5">Current Location</th>
                <th className="px-6 py-3.5 text-right">Quick Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredShipments.map(s => {
                const bolId = s.id || s.referenceNumber
                const summaryText = `Shipment Update: BOL ${bolId} | Commodity: ${s.commodity || 'Goods'} | Status: ${s.status.toUpperCase()} | Location: ${s.currentLocation || 'In Transit'} | ETA: ${s.eta || 'Pending'}`
                const isCopied = copiedId === s.id

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-white">{s.id}</div>
                      {s.referenceNumber && s.referenceNumber !== s.id && (
                        <div className="text-[11px] text-slate-400 font-bold">Ref: {s.referenceNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-300">
                      {s.commodity || "Commercial Cargo"}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-300">
                      {s.containers?.length || 1} Unit(s)
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {s.currentLocation || "In Transit"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => copyUpdate(summaryText, s.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all border border-slate-700"
                        title="Copy WhatsApp-friendly shipment status update"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{isCopied ? "Copied" : "Copy Update"}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    No matching shipments found.
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
