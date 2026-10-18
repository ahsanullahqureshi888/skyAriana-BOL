"use client"

import React, { useState, useEffect } from "react"
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Building,
  Box,
  FileText,
  Receipt,
  Truck,
  DollarSign,
  Download,
  Printer,
  RefreshCw,
  ArrowRight,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/lib/app-context"
import { toast } from "sonner"
import type { SearchResultItem } from "@/lib/search/search-types"

export function AdvancedSearchPage() {
  const { setView, currentUser } = useApp()
  const [query, setQuery] = useState("")
  const [recordType, setRecordType] = useState("all")
  const [companyName, setCompanyName] = useState("")
  const [route, setRoute] = useState("")
  const [status, setStatus] = useState("all")
  const [commodity, setCommodity] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalMatches: 0,
    totalPages: 1,
  })

  const canViewFinancials = currentUser?.role !== "client" && currentUser?.role !== "shipper"

  const executeSearch = async (targetPage = 1) => {
    setLoading(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (currentUser) {
        headers["x-user-role"] = currentUser.role || "admin"
        headers["x-user-id"] = currentUser.id || "staff"
        headers["x-user-name"] = currentUser.name || "Staff User"
        if ((currentUser as any).clientId) headers["x-client-id"] = (currentUser as any).clientId
        if ((currentUser as any).clientName) headers["x-client-name"] = (currentUser as any).clientName
      }

      const payload = {
        query,
        recordType: recordType !== "all" ? recordType : undefined,
        companyName: companyName || undefined,
        route: route || undefined,
        status: status !== "all" ? status : undefined,
        commodity: commodity || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        page: targetPage,
        limit: 20,
      }

      const res = await fetch("/api/search/advanced", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        setPagination(data.pagination || { page: targetPage, limit: 20, totalMatches: 0, totalPages: 1 })
        setPage(targetPage)
      } else {
        toast.error("Advanced search failed")
      }
    } catch (e) {
      console.error("Advanced search error:", e)
      toast.error("Failed to query records")
    } finally {
      setLoading(false)
    }
  }

  // Run search on mount and when filter criteria change
  useEffect(() => {
    executeSearch(1)
  }, [recordType, status])

  const handleReset = () => {
    setQuery("")
    setRecordType("all")
    setCompanyName("")
    setRoute("")
    setStatus("all")
    setCommodity("")
    setDateFrom("")
    setDateTo("")
    setMinAmount("")
    setMaxAmount("")
    executeSearch(1)
  }

  const exportCsv = () => {
    if (results.length === 0) {
      toast.error("No results to export")
      return
    }
    const headers = ["Type", "Identifier", "Title", "Subtitle", "Status", "Matched Field"]
    const rows = results.map((r) => [
      r.type,
      `"${r.id}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.subtitle.replace(/"/g, '""')}"`,
      `"${r.badgeText || ""}"`,
      `"${r.matchedField.replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `sky-ariana-search-export-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Exported search results to CSV")
  }

  return (
    <div className="max-w-[1700px] mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-blue-600" />
            <span>Advanced Search & Query Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Execute granular multi-criteria queries across all Bills of Lading, containers, clients, financial records, and tracking events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print View</span>
          </Button>
        </div>
      </div>

      {/* Multi-Criteria Filter Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Query Keyword */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Search Keywords</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 4440, TCLU, Dry Figs..."
              className="h-9 text-xs rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && executeSearch(1)}
            />
          </div>

          {/* Record Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Record Type</label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold cursor-pointer"
            >
              <option value="all">All Record Types</option>
              <option value="bol">Bills of Lading (BOL)</option>
              <option value="container">Containers</option>
              <option value="company">Companies & Accounts</option>
              <option value="invoice">Invoices</option>
              <option value="ledger">Ledgers</option>
              <option value="payment">Payments</option>
              <option value="truck">Trucks & Drivers</option>
              <option value="document">Trade Documents</option>
              <option value="route">Routes & Ports</option>
            </select>
          </div>

          {/* Company / Shipper */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Company / Party</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Najeb Amin, Manik..."
              className="h-9 text-xs rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && executeSearch(1)}
            />
          </div>

          {/* Route / Location */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Route / Port / Border</label>
            <Input
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g. Bandar Abbas, Dogharoon..."
              className="h-9 text-xs rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && executeSearch(1)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="cargo_loaded">Cargo Loaded (بارگیری)</option>
              <option value="in_transit">In Transit (در حال حرکت)</option>
              <option value="at_border">At Border (در مرز گمرک)</option>
              <option value="at_port">At Port (در بندرعباس)</option>
              <option value="on_vessel">On Vessel (روی کشتی)</option>
              <option value="transshipment">Transshipment (جبل علی)</option>
              <option value="arrived_destination">Arrived Destination (نوا شیوا)</option>
              <option value="delivered">Delivered (تحویل داده شد)</option>
              <option value="delayed">Delayed / Alert (تاخیر)</option>
            </select>
          </div>

          {/* Commodity */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Commodity</label>
            <Input
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Black Raisins, کشمش..."
              className="h-9 text-xs rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && executeSearch(1)}
            />
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Date From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Date To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Financial Filters Row (only for authorized roles) */}
        {canViewFinancials && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400">Min Amount ($)</label>
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400">Max Amount ($)</label>
              <Input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="50,000"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 font-bold">
            Found {pagination.totalMatches} Matching Record(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs font-bold rounded-xl cursor-pointer"
            >
              Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={() => executeSearch(1)}
              className="text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search Records</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10.5px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Identifier / Title</th>
                <th className="py-3 px-4">Details & Parties</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Connected Modules</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="font-bold">Filtering database records...</p>
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No records match the active criteria</p>
                    <p className="text-[11px] text-slate-500 mt-1">Try widening your date range or clearing specific filter keywords</p>
                  </td>
                </tr>
              ) : (
                results.map((item, idx) => (
                  <tr key={`${item.type}-${item.id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10.5px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.id}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        {item.subtitle}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.matchedField}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.badgeText && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${item.badgeColor || "bg-slate-100 text-slate-700"}`}>
                          {item.badgeText}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.connectedSummary ? (
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {item.connectedSummary.bolNumber && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              BOL: {item.connectedSummary.bolNumber}
                            </span>
                          )}
                          {item.connectedSummary.containerCount !== undefined && item.connectedSummary.containerCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {item.connectedSummary.containerCount} Cont
                            </span>
                          )}
                          {item.connectedSummary.invoiceCount !== undefined && item.connectedSummary.invoiceCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                              {item.connectedSummary.invoiceCount} Inv
                            </span>
                          )}
                          {item.connectedSummary.documentCount !== undefined && item.connectedSummary.documentCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {item.connectedSummary.documentCount} Docs
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (item.targetView) setView(item.targetView as any)
                            if (item.targetId) {
                              window.dispatchEvent(new CustomEvent("load-bol-draft", { detail: { id: item.targetId } }))
                            }
                          }}
                          className="h-7 px-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 px-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalMatches} results)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => executeSearch(pagination.page - 1)}
              className="h-7 px-2 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => executeSearch(pagination.page + 1)}
              className="h-7 px-2 rounded-lg cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
