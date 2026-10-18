"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Truck,
  Ship,
  FileText,
  AlertTriangle,
  Clock,
  MapPin,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Building,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ShipmentMaster, ShipmentStatus } from "@/lib/types/shipment"
import { toast } from "sonner"
import { useApp } from "@/lib/app-context"
import { CopyWhatsAppModal } from "@/components/whatsapp/copy-whatsapp-modal"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import type { NormalizedWhatsAppShipment } from "@/lib/whatsapp/message-types"
import { ShipmentDetailDrawer } from "./shipment-detail-drawer"

interface OperationsDashboardProps {
  onOpenBol?: (bolNumber: string) => void
  onOpenLedger?: (accountName?: string, companyName?: string) => void
  onOpenOperationsReport?: (period?: string) => void
}

export function ShipmentOperationsDashboard({ onOpenBol, onOpenLedger, onOpenOperationsReport }: OperationsDashboardProps) {
  const { setView } = useApp()
  const [shipments, setShipments] = useState<ShipmentMaster[]>([])
  const [whatsAppTarget, setWhatsAppTarget] = useState<NormalizedWhatsAppShipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedShipment, setSelectedShipment] = useState<ShipmentMaster | null>(null)
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({})

  const fetchShipments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/shipments", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setShipments(data.shipments || [])
        setLocationCounts(data.locationCounts || {})
      }
    } catch (err) {
      console.error("Failed to load shipments:", err)
      toast.error("Failed to load live operations data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  // Operational KPI calculation
  const metrics = useMemo(() => {
    const total = shipments.length
    const active = shipments.filter((s) => s.status !== "delivered" && s.status !== "cancelled").length
    const inTransit = shipments.filter((s) => s.status === "in_transit").length
    const atBorder = shipments.filter((s) => s.status === "at_border").length
    const atPort = shipments.filter((s) => s.status === "at_port" || s.status === "container_loading").length
    const onVessel = shipments.filter((s) => s.status === "on_vessel" || s.status === "vessel_departed").length
    const arrived = shipments.filter((s) => s.status === "arrived_destination").length
    const delivered = shipments.filter((s) => s.status === "delivered").length
    const delayed = shipments.filter((s) => s.status === "delayed" || Boolean(s.delayReason)).length
    const docsIncomplete = shipments.filter((s) => (s.documents || []).length < 4).length
    const paymentOutstanding = shipments.filter((s) => (s.finance?.customerOutstanding || 0) > 0).length

    return {
      total,
      active,
      inTransit,
      atBorder,
      atPort,
      onVessel,
      arrived,
      delivered,
      delayed,
      docsIncomplete,
      paymentOutstanding,
    }
  }, [shipments])

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false
      if (!searchQuery) return true

      const q = searchQuery.toLowerCase()
      const searchBlob = `${s.id} ${s.referenceNumber} ${s.shipper?.name} ${s.consignee?.name} ${s.container?.containerNumber} ${s.container?.sealNumber} ${s.truck?.driverName} ${s.vessel?.vesselName} ${s.currentLocation} ${s.cargo?.commodity}`.toLowerCase()
      return searchBlob.includes(q)
    })
  }, [shipments, searchQuery, statusFilter])

  // Delay & Exception Center Items
  const exceptionShipments = useMemo(() => {
    return shipments.filter((s) => {
      const isDelayed = s.status === "delayed" || Boolean(s.delayReason)
      const isDocsMissing = (s.documents || []).length < 3
      const isOutstanding = (s.finance?.customerOutstanding || 0) > 0
      const isMissingSeal = !s.container?.sealNumber || s.container?.sealNumber === "SL000000"
      return isDelayed || isDocsMissing || isOutstanding || isMissingSeal
    })
  }, [shipments])

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case "cargo_loaded":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Cargo Loaded</Badge>
      case "in_transit":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">In Transit</Badge>
      case "at_border":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">At Border</Badge>
      case "at_port":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">At Port</Badge>
      case "on_vessel":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">On Vessel</Badge>
      case "arrived_destination":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Arrived Port</Badge>
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>
      case "delayed":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Delayed</Badge>
      default:
        return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-[1780px] mx-auto animate-in fade-in duration-200">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Freight Operations & Shipment Master
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Live multimodal tracking, document control, accounting synchronization & automated updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('whatsapp')}
            className="text-xs font-bold gap-1.5 h-8.5 rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40 cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            WhatsApp Operations
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onOpenOperationsReport) {
                onOpenOperationsReport("today")
              }
              window.dispatchEvent(new CustomEvent("skybol:open-operations-report", { detail: { period: "today" } }))
              window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "saved-documents", tab: "saved-documents" } }))
              if (onOpenBol) {
                onOpenBol("")
              }
            }}
            className="text-xs font-bold gap-1.5 h-8.5 rounded-xl border-blue-300 text-blue-700 bg-blue-50/60 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/40 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            Operations Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchShipments}
            disabled={loading}
            className="text-xs font-bold gap-1.5 h-8.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">Active</p>
          <p className="text-xl font-black text-blue-700">{metrics.active}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">In Transit</p>
          <p className="text-xl font-black text-amber-600">{metrics.inTransit}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">At Border</p>
          <p className="text-xl font-black text-orange-600">{metrics.atBorder}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">At Port</p>
          <p className="text-xl font-black text-indigo-600">{metrics.atPort}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">On Vessel</p>
          <p className="text-xl font-black text-cyan-600">{metrics.onVessel}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">Arrived</p>
          <p className="text-xl font-black text-teal-600">{metrics.arrived}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">Delivered</p>
          <p className="text-xl font-black text-emerald-600">{metrics.delivered}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">Delayed</p>
          <p className="text-xl font-black text-rose-600">{metrics.delayed}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">Docs Pending</p>
          <p className="text-xl font-black text-purple-600">{metrics.docsIncomplete}</p>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm p-2.5 rounded-xl">
          <p className="text-[10px] font-bold uppercase text-slate-400">Outstanding</p>
          <p className="text-xl font-black text-red-600">{metrics.paymentOutstanding}</p>
        </Card>
      </div>

      {/* Location Summary & Delay Exception Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Live Location Summary */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <MapPin className="h-4 w-4 text-blue-600" />
              Live Location Distribution
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {Object.keys(locationCounts).length} Stations
            </Badge>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(locationCounts).map(([loc, count]) => (
                <button
                  key={loc}
                  onClick={() => setSearchQuery(loc)}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 transition-colors text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <span>{loc}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                    {count}
                  </span>
                </button>
              ))}
              {Object.keys(locationCounts).length === 0 && (
                <p className="text-xs text-slate-400 py-2">No location telemetry available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delay & Exception Center */}
        <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 bg-amber-50/60 border-b border-amber-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Delay & Exception Control Center ({exceptionShipments.length})
            </CardTitle>
            <span className="text-[11px] font-bold text-amber-700">Action Required</span>
          </CardHeader>
          <CardContent className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {exceptionShipments.slice(0, 5).map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedShipment(s)}
                className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-bold">
                    {s.referenceNumber || s.id}
                  </Badge>
                  <span className="font-bold text-slate-800 truncate">{s.shipper?.name}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600 truncate">{s.currentLocation}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(s.finance?.customerOutstanding || 0) > 0 && (
                    <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                      ${s.finance.customerOutstanding.toLocaleString()} Due
                    </Badge>
                  )}
                  {(s.documents || []).length < 3 && (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                      Docs Incomplete
                    </Badge>
                  )}
                  {Boolean(s.delayReason) && (
                    <span className="text-rose-600 font-bold text-[11px] truncate max-w-32">{s.delayReason}</span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            ))}
            {exceptionShipments.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                No exceptions detected. All shipments on schedule!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Active Shipments Table */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by ID, BOL, Container, Driver, Shipper, Commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses ({shipments.length})</option>
              <option value="cargo_loaded">Cargo Loaded</option>
              <option value="in_transit">In Transit</option>
              <option value="at_border">At Border</option>
              <option value="at_port">At Port</option>
              <option value="on_vessel">On Vessel</option>
              <option value="arrived_destination">Arrived Destination</option>
              <option value="delivered">Delivered</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Shipment / BOL</th>
                  <th className="py-2.5 px-3">Customer / Shipper</th>
                  <th className="py-2.5 px-3">Container & Seal</th>
                  <th className="py-2.5 px-3">Current Position</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Transport</th>
                  <th className="py-2.5 px-3 text-center">Docs</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredShipments.map((shipment) => {
                  const docCount = (shipment.documents || []).length
                  const outstanding = shipment.finance?.customerOutstanding || 0
                  return (
                    <tr
                      key={shipment.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                        {shipment.referenceNumber || shipment.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-44">{shipment.shipper?.name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-44">{shipment.consignee?.name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold text-slate-800">{shipment.container?.containerNumber || "—"}</div>
                        <div className="text-[10px] text-slate-500">Seal: {shipment.container?.sealNumber || "—"}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate max-w-36">{shipment.currentLocation}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-36">
                          Next: {shipment.nextDestination}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(shipment.status)}</td>
                      <td className="py-2.5 px-3 text-[11px]">
                        {shipment.truck?.driverName ? (
                          <div className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate max-w-28">{shipment.truck.driverName}</span>
                          </div>
                        ) : shipment.vessel?.vesselName ? (
                          <div className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Ship className="h-3.5 w-3.5 text-cyan-600" />
                            <span className="truncate max-w-28">{shipment.vessel.vesselName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                            docCount >= 4
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {docCount} / 8
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {outstanding > 0 ? (
                          <span className="text-red-600">${outstanding.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-600">Settled</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedShipment(shipment)}
                            className="h-7 px-2 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Inspect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWhatsAppTarget(normalizeToWhatsAppShipment(shipment))}
                            className="h-7 px-2 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-lg cursor-pointer gap-1"
                            title="Generate WhatsApp update"
                          >
                            <MessageSquare className="h-3 w-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </Button>
                          {onOpenBol && shipment.referenceNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenBol(shipment.referenceNumber)}
                              className="h-7 px-2 text-xs font-bold text-slate-700 rounded-lg cursor-pointer"
                            >
                              BOL
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredShipments.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                      No matching shipments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Shipment Detail Drawer Modal */}
      {selectedShipment && (
        <ShipmentDetailDrawer
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onUpdateShipment={(updated) => {
            setSelectedShipment(updated)
            setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }}
          onOpenBol={onOpenBol}
          onOpenLedger={onOpenLedger}
        />
      )}

      {/* WhatsApp Quick Modal */}
      {whatsAppTarget && (
        <CopyWhatsAppModal
          shipment={whatsAppTarget}
          isOpen={Boolean(whatsAppTarget)}
          onClose={() => setWhatsAppTarget(null)}
        />
      )}
    </div>
  )
}
