"use client"

import React, { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Truck,
  Ship,
  MapPin,
  Clock,
  Eye,
  MessageSquare,
  FileText,
  Search,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import type { LiveShipmentRow, PipelineStage } from "@/lib/control-tower/types"

interface LiveOperationsBoardProps {
  shipments: LiveShipmentRow[]
  selectedStage: PipelineStage
  onSelectStage: (stage: PipelineStage) => void
  stageCounts: Record<PipelineStage, number>
  onInspectBol: (bolNumber: string) => void
  onInspectContainer: (containerNumber: string) => void
  onInspectCustomer: (customerName: string) => void
  onWhatsAppUpdate: (shipment: LiveShipmentRow) => void
  onOpenBolEditor: (bolNumber: string) => void
  privacyMode: boolean
}

export function LiveOperationsBoard({
  shipments,
  selectedStage,
  onSelectStage,
  stageCounts,
  onInspectBol,
  onInspectContainer,
  onInspectCustomer,
  onWhatsAppUpdate,
  onOpenBolEditor,
  privacyMode,
}: LiveOperationsBoardProps) {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [filterQuery, setFilterQuery] = useState("")
  const [sortField, setSortField] = useState<"cutOff" | "days" | "bol">("cutOff")

  const stages: { id: PipelineStage; label: string; count: number }[] = [
    { id: "all", label: "All Shipments", count: stageCounts.all || 0 },
    { id: "preparing", label: "Preparing", count: stageCounts.preparing || 0 },
    { id: "road_transit", label: "Road Transit", count: stageCounts.road_transit || 0 },
    { id: "border_clearance", label: "Border Customs", count: stageCounts.border_clearance || 0 },
    { id: "port_operations", label: "Port Ops", count: stageCounts.port_operations || 0 },
    { id: "on_vessel", label: "On Vessel", count: stageCounts.on_vessel || 0 },
    { id: "arrived_destination", label: "Arrived Port", count: stageCounts.arrived_destination || 0 },
    { id: "delivered", label: "Delivered", count: stageCounts.delivered || 0 },
  ]

  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        // Stage filter
        if (selectedStage !== "all" && s.stage !== selectedStage) {
          return false
        }
        // Query filter
        if (!filterQuery) return true
        const q = filterQuery.toLowerCase()
        return (
          s.bolNumber.toLowerCase().includes(q) ||
          s.referenceNumber.toLowerCase().includes(q) ||
          s.shipperName.toLowerCase().includes(q) ||
          s.consigneeName.toLowerCase().includes(q) ||
          s.containerNumber.toLowerCase().includes(q) ||
          s.driverName.toLowerCase().includes(q) ||
          s.truckPlate.toLowerCase().includes(q) ||
          s.currentLocation.toLowerCase().includes(q) ||
          s.vesselName.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortField === "cutOff") {
          const aTime = a.portCutOff ? new Date(a.portCutOff).getTime() : 9999999999999
          const bTime = b.portCutOff ? new Date(b.portCutOff).getTime() : 9999999999999
          return aTime - bTime
        }
        if (sortField === "days") {
          return b.daysInCurrentStage - a.daysInCurrentStage
        }
        return a.bolNumber.localeCompare(b.bolNumber)
      })
  }, [shipments, selectedStage, filterQuery, sortField])

  const maskPhone = (phone?: string) => {
    if (!phone) return "—"
    if (privacyMode) return "•••••••"
    return phone
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Stage Tabs Bar */}
      <div className="bg-muted/30 p-2 border-b border-border flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {stages.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStage(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
                selectedStage === st.id
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStage === st.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {st.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded text-xs cursor-pointer ${
              viewMode === "table" ? "bg-muted text-foreground font-bold" : "text-muted-foreground"
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded text-xs cursor-pointer ${
              viewMode === "grid" ? "bg-muted text-foreground font-bold" : "text-muted-foreground"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-background/50">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
          <Input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter stage by BOL, Container, Driver, Port..."
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="h-8 text-xs bg-background border border-border rounded-lg px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="cutOff">Next Port Cut-off</option>
            <option value="days">Days in Stage (Longest)</option>
            <option value="bol">BOL Number</option>
          </select>
          <span className="text-xs font-semibold text-muted-foreground ml-2">
            Showing <strong>{filteredShipments.length}</strong> shipments
          </span>
        </div>
      </div>

      {/* Content Rendering: Table or Grid */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto max-h-[550px]">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <TableHead className="w-[140px]">BOL & Status</TableHead>
                <TableHead className="w-[180px]">Client / Route</TableHead>
                <TableHead className="w-[160px]">Current Location</TableHead>
                <TableHead className="w-[150px]">Truck & Driver</TableHead>
                <TableHead className="w-[150px]">Container & Vessel</TableHead>
                <TableHead className="w-[120px]">Cut-off / ETA</TableHead>
                <TableHead className="w-[100px]">Docs & Risk</TableHead>
                <TableHead className="text-right w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                    No shipments found in this stage or matching your query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors text-xs">
                    {/* BOL & Status */}
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        onClick={() => onInspectBol(s.bolNumber)}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {s.bolNumber}
                      </button>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-semibold bg-primary/10 text-foreground border-primary/20"
                        >
                          {s.statusLabel}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {s.daysInCurrentStage}d in stage
                      </span>
                    </TableCell>

                    {/* Client / Route */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onInspectCustomer(s.shipperName)}
                        className="font-semibold text-foreground hover:underline text-left block truncate max-w-[160px] cursor-pointer"
                        title={s.shipperName}
                      >
                        {s.shipperName || "Direct Shipper"}
                      </button>
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[160px]" title={s.consigneeName}>
                        → {s.consigneeName || "Consignee"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {s.origin} to {s.destination}
                      </span>
                    </TableCell>

                    {/* Current Location */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-foreground font-medium">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate max-w-[130px]" title={s.currentLocation}>
                          {s.currentLocation}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {s.lastCheckpointTime ? new Date(s.lastCheckpointTime).toLocaleDateString() : "Pending update"}
                      </span>
                    </TableCell>

                    {/* Truck & Driver */}
                    <TableCell>
                      <div className="font-mono text-foreground font-semibold">
                        {s.truckPlate || "Plate Pending"}
                      </div>
                      <div className="text-muted-foreground truncate max-w-[130px]" title={s.driverName}>
                        {s.driverName || "Driver Unassigned"}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {maskPhone(s.driverPhone)}
                      </span>
                    </TableCell>

                    {/* Container & Vessel */}
                    <TableCell>
                      {s.containerNumber && s.containerNumber !== "TEMU0000000" ? (
                        <button
                          type="button"
                          onClick={() => onInspectContainer(s.containerNumber)}
                          className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {s.containerNumber}
                        </button>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">Unassigned</span>
                      )}
                      <div className="text-muted-foreground truncate max-w-[130px]" title={s.vesselName}>
                        {s.vesselName ? `${s.vesselName} (Voy: ${s.voyageNumber || "N/A"})` : "Vessel Pending"}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {s.shippingLine || "Carrier"}
                      </span>
                    </TableCell>

                    {/* Cut-off / ETA */}
                    <TableCell>
                      {s.portCutOff ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Cut-Off</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {new Date(s.portCutOff).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                      {s.etaDischarge && (
                        <div className="mt-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">ETA Dest</span>
                          <span className="text-teal-600 dark:text-teal-400 font-medium">
                            {new Date(s.etaDischarge).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* Docs & Risk */}
                    <TableCell>
                      {s.hasMissingDocs ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Docs Incomplete</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </Badge>
                      )}
                      {s.attentionItems && s.attentionItems.length > 0 && (
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block mt-1">
                          {s.attentionItems.length} active issue(s)
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => onInspectBol(s.bolNumber)}
                          title="Quick Inspect BOL"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                          onClick={() => onWhatsAppUpdate(s)}
                          title="Send WhatsApp Update"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 cursor-pointer text-blue-600 dark:text-blue-400"
                          onClick={() => onOpenBolEditor(s.bolNumber)}
                          title="Open in BOL Editor"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Card Grid View */
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto">
          {filteredShipments.map((s) => (
            <div
              key={s.id}
              className="bg-background/80 p-3.5 rounded-xl border border-border/80 hover:border-primary/50 transition-all flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => onInspectBol(s.bolNumber)}
                    className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {s.bolNumber}
                  </button>
                  <div className="text-xs text-foreground font-semibold mt-0.5">{s.shipperName}</div>
                  <div className="text-[11px] text-muted-foreground">→ {s.consigneeName}</div>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/10">
                  {s.statusLabel}
                </Badge>
              </div>

              <div className="space-y-1 text-xs py-1 border-y border-border/50">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Location:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" />
                    {s.currentLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Truck / Driver:</span>
                  <span className="font-mono font-medium text-foreground">
                    {s.truckPlate || "N/A"} ({s.driverName || "Driver"})
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Container:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {s.containerNumber || "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {s.daysInCurrentStage}d in {s.statusLabel}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 cursor-pointer"
                    onClick={() => onInspectBol(s.bolNumber)}
                  >
                    <Eye className="w-3 h-3" />
                    Inspect
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    onClick={() => onWhatsAppUpdate(s)}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Notify
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
