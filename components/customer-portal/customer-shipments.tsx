"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Package,
  Search,
  Filter,
  MapPin,
  Ship,
  Truck,
  ArrowRight,
  FileText,
  Clock,
  Calendar,
  Layers,
  Table as TableIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CustomerPortalSession, CustomerShipmentSummary } from "@/lib/types/customer-portal"

interface CustomerShipmentsProps {
  session: CustomerPortalSession
  onSelectShipment: (shipmentId: string) => void
  onViewDocuments: (shipmentId?: string) => void
}

export function CustomerShipments({
  session,
  onSelectShipment,
  onViewDocuments,
}: CustomerShipmentsProps) {
  const [shipments, setShipments] = useState<CustomerShipmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchShipments = useCallback(async () => {
    setLoading(true)
    try {
      const qParams = new URLSearchParams({
        page: String(page),
        limit: "15",
      })
      if (query.trim()) qParams.set("q", query.trim())
      if (statusFilter !== "all") qParams.set("status", statusFilter)

      const res = await fetch(`/api/portal/shipments?${qParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.shipments)) {
          setShipments(data.shipments)
          setTotal(data.total || 0)
          setTotalPages(data.totalPages || 1)
        }
      }
    } catch (err) {
      console.error("Failed to load shipments:", err)
    } finally {
      setLoading(false)
    }
  }, [page, query, statusFilter])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  const statusOptions = [
    { id: "all", label: "All Statuses" },
    { id: "in_transit", label: "In Transit" },
    { id: "at_border", label: "At Border" },
    { id: "at_port", label: "At Port" },
    { id: "vessel_departed", label: "Vessel Departed" },
    { id: "arrived_destination", label: "Arriving Soon" },
    { id: "delivered", label: "Delivered" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span>My Shipments</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified consignments associated with <strong>{session.customerName}</strong> ({total} records)
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "cards" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "table" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search by BOL, container number, truck, vessel, or commodity..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus-visible:ring-blue-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setStatusFilter(opt.id)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === opt.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading your shipments...</div>
      ) : shipments.length === 0 ? (
        <Card className="bg-slate-900/70 border-slate-800 p-12 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No shipments matched your search</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or status filter. Only authorized consignments belonging to your company are visible.
          </p>
        </Card>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shipments.map((s) => (
            <Card
              key={s.id}
              className="bg-slate-900 border-slate-800 hover:border-slate-700 text-white rounded-xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="font-mono text-base font-black text-white block">
                      {s.bolNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">Ref: {s.referenceNumber}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 uppercase tracking-wide">
                    {s.currentStatus.replace("_", " ")}
                  </span>
                </div>

                {/* Cargo specs */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{s.commodity}</h4>
                  <p className="text-[11px] text-slate-400">
                    {s.cartons} {s.packageType} • Net: {s.netWeightKg.toLocaleString()} KG • Gross: {s.grossWeightKg.toLocaleString()} KG
                  </p>
                </div>

                {/* Logistics route */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{s.origin}</span>
                    <span className="text-slate-500">→</span>
                    <span className="truncate font-semibold text-white">{s.destination}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/50">
                    <span>Location: <strong className="text-slate-200">{s.currentLocation}</strong></span>
                    {s.eta && (
                      <span>ETA: <strong className="text-amber-400">{s.eta}</strong></span>
                    )}
                  </div>
                </div>

                {/* Container / Vessel */}
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  {s.containerNumber ? (
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {s.containerNumber} ({s.containerType || "40RF"})
                    </span>
                  ) : (
                    <span className="text-slate-500">Breakbulk / Road</span>
                  )}
                  {s.vesselName && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Ship className="w-3 h-3 text-cyan-400" />
                      <span className="truncate max-w-[120px]">{s.vesselName}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center gap-2">
                <Button
                  onClick={() => onSelectShipment(s.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-8 rounded-lg cursor-pointer"
                >
                  View Details & Tracking
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDocuments(s.id)}
                  className="h-8 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white cursor-pointer px-2.5"
                  title="View Documents"
                >
                  <FileText className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">BOL Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Commodity</th>
                  <th className="p-3">Packages / Weight</th>
                  <th className="p-3">Container</th>
                  <th className="p-3">Current Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">ETA</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-400">{s.bolNumber}</td>
                    <td className="p-3 text-slate-400">{s.issueDate}</td>
                    <td className="p-3 font-medium text-slate-200">{s.commodity}</td>
                    <td className="p-3 text-slate-300">
                      {s.cartons} {s.packageType} ({s.grossWeightKg.toLocaleString()} KG)
                    </td>
                    <td className="p-3 font-mono text-slate-400">{s.containerNumber || "-"}</td>
                    <td className="p-3 text-slate-200">{s.currentLocation}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 uppercase">
                        {s.currentStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{s.destination}</td>
                    <td className="p-3 text-amber-400 font-medium">{s.eta || "-"}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => onSelectShipment(s.id)}
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white cursor-pointer px-3"
                      >
                        Track
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages} ({total} total shipments)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
