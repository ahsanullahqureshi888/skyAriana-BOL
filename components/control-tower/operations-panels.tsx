"use client"

import React, { useState } from "react"
import {
  MapPin,
  Anchor,
  Box,
  FileCheck2,
  AlertTriangle,
  Clock,
  Truck,
  ExternalLink,
  Ship,
  CheckCircle2,
  AlertCircle,
  Compass,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  BorderStationSummary,
  PortOperationSummary,
  ContainerRiskSummary,
  DocumentComplianceRow,
  ActiveRouteSummary,
  UpcomingCutOffItem,
  UpcomingArrivalItem,
  VesselActivityItem,
  OperationalReadiness,
} from "@/lib/control-tower/types"

interface OperationsPanelsProps {
  borderStations: BorderStationSummary[]
  portOperations: PortOperationSummary[]
  containerRisks: ContainerRiskSummary[]
  documentCompliance: DocumentComplianceRow[]
  activeRoutes?: ActiveRouteSummary[]
  upcomingCutOffs?: UpcomingCutOffItem[]
  upcomingArrivals?: UpcomingArrivalItem[]
  vesselActivity?: VesselActivityItem[]
  readiness?: OperationalReadiness
  onOpenBol: (bolNumber: string) => void
  onOpenContainer: (containerNumber: string) => void
  onOpenCompliance: (bolNumber: string) => void
}

export function OperationsPanels({
  borderStations,
  portOperations,
  containerRisks,
  documentCompliance,
  activeRoutes = [],
  upcomingCutOffs = [],
  upcomingArrivals = [],
  vesselActivity = [],
  readiness,
  onOpenBol,
  onOpenContainer,
  onOpenCompliance,
}: OperationsPanelsProps) {
  const [activeTab, setActiveTab] = useState<
    "border" | "port" | "routes" | "cutoffs" | "arrivals" | "vessels" | "containers" | "compliance" | "readiness"
  >("border")

  const urgentCutOffsCount = upcomingCutOffs.filter((c) => c.severity === "critical" || c.severity === "warning").length

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Sub-panel navigation tabs */}
      <div className="p-2 bg-muted/40 border-b border-border flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("border")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "border"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-orange-500" />
          <span>Border Stations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("routes")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "routes"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          <span>Active Routes</span>
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {activeRoutes.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cutoffs")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "cutoffs"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-red-500" />
          <span>Upcoming Cut-Offs</span>
          {urgentCutOffsCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {urgentCutOffsCount}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("arrivals")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "arrivals"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-teal-500" />
          <span>Upcoming Arrivals</span>
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {upcomingArrivals.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vessels")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "vessels"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ship className="w-3.5 h-3.5 text-indigo-500" />
          <span>Vessel Activity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("port")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "port"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Anchor className="w-3.5 h-3.5 text-cyan-500" />
          <span>Port Operations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("containers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "containers"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Box className="w-3.5 h-3.5 text-purple-500" />
          <span>Containers & Free Days</span>
          {containerRisks.filter((c) => c.isOverdue).length > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {containerRisks.filter((c) => c.isOverdue).length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compliance")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "compliance"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Document Compliance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("readiness")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "readiness"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-500" />
          <span>Stage Readiness</span>
        </button>
      </div>

      {/* Tab 1: Border Control Stations */}
      {activeTab === "border" && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {borderStations.map((b) => (
            <div
              key={b.stationName}
              className="bg-background/80 p-3.5 rounded-xl border border-border/80 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{b.stationName}</span>
                  <Badge variant="secondary" className="font-bold">
                    {b.activeCount} Trucks
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5" dir="rtl">
                  {b.stationPersian}
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-muted-foreground flex items-center justify-between">
                  <span>Avg Customs Delay:</span>
                  <span className="font-medium text-foreground">{b.avgWaitDays} days</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Active Afghan Plates:</span>
                  <div className="flex flex-wrap gap-1">
                    {b.truckPlates.length > 0 ? (
                      b.truckPlates.slice(0, 4).map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] text-foreground font-semibold">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No trucks held</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Active Routes */}
      {activeTab === "routes" && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeRoutes.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-xs text-muted-foreground">
              No active routes currently recorded.
            </div>
          ) : (
            activeRoutes.map((r) => (
              <div
                key={r.routeName}
                className="bg-background/80 p-3.5 rounded-xl border border-border/80 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-foreground block">{r.routeName}</span>
                    <span className="text-[11px] text-muted-foreground">Corridor: Active Transit</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold bg-primary/10">
                    {r.activeCount} Shipments
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span>Containers: <strong className="text-foreground">{r.containersCount}</strong></span>
                  <span>Current Stage: <strong className="text-foreground">{r.currentStage}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Upcoming Cut-Offs */}
      {activeTab === "cutoffs" && (
        <div className="p-3">
          {upcomingCutOffs.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No scheduled upcoming cut-offs found in active records.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/70 pb-2">
                    <th className="py-2">Reference / Booking</th>
                    <th className="py-2">Container</th>
                    <th className="py-2">Cut-off Type</th>
                    <th className="py-2">Port / Terminal</th>
                    <th className="py-2">Deadline</th>
                    <th className="py-2">Time Remaining</th>
                    <th className="py-2 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {upcomingCutOffs.map((c) => {
                    const isPassed = c.severity === "passed"
                    const isCritical = c.severity === "critical"
                    const isWarning = c.severity === "warning"

                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 font-mono font-bold text-foreground">{c.bookingNumber}</td>
                        <td className="py-2 font-mono text-emerald-600 dark:text-emerald-400">{c.containerNumber}</td>
                        <td className="py-2 font-semibold text-muted-foreground">{c.cutOffType}</td>
                        <td className="py-2 text-foreground">{c.port}</td>
                        <td className="py-2 font-medium text-foreground">
                          {new Date(c.deadline).toLocaleDateString()} {new Date(c.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 font-bold">
                          {isPassed ? (
                            <span className="text-red-500">Passed</span>
                          ) : (
                            <span className={isCritical ? "text-red-600 dark:text-red-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                              {c.hoursRemaining} hour(s)
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={isCritical || isPassed ? "destructive" : isWarning ? "outline" : "secondary"}
                            className="text-[10px] font-bold uppercase"
                          >
                            {c.severity}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Upcoming Arrivals */}
      {activeTab === "arrivals" && (
        <div className="p-3">
          {upcomingArrivals.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No upcoming vessel or cargo arrivals scheduled in active records.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/70 pb-2">
                    <th className="py-2">BOL Number</th>
                    <th className="py-2">Container</th>
                    <th className="py-2">Vessel</th>
                    <th className="py-2">Destination Port</th>
                    <th className="py-2">ETA Discharge</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {upcomingArrivals.map((a) => (
                    <tr key={a.bolNumber} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <button
                          type="button"
                          onClick={() => onOpenBol(a.bolNumber)}
                          className="hover:underline cursor-pointer"
                        >
                          {a.bolNumber}
                        </button>
                      </td>
                      <td className="py-2 font-mono text-emerald-600 dark:text-emerald-400">{a.containerNumber}</td>
                      <td className="py-2 text-foreground font-medium">{a.vesselName}</td>
                      <td className="py-2 text-foreground">{a.destination}</td>
                      <td className="py-2 font-bold text-teal-600 dark:text-teal-400">
                        {new Date(a.eta).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-muted-foreground truncate max-w-[150px]">{a.customer}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 text-blue-600 cursor-pointer"
                          onClick={() => onOpenBol(a.bolNumber)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Vessel Activity */}
      {activeTab === "vessels" && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vesselActivity.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-xs text-muted-foreground">
              No vessels currently underway with assigned active shipments.
            </div>
          ) : (
            vesselActivity.map((v) => (
              <div
                key={`${v.vesselName}-${v.voyage}`}
                className="bg-background/80 p-3.5 rounded-xl border border-border/80 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Ship className="w-4 h-4 text-cyan-600" />
                      {v.vesselName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Voyage: {v.voyage}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                    {v.containersCount} Cnt
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <div>Route: <strong className="text-foreground">{v.route}</strong></div>
                  {v.eta && <div>ETA: <strong className="text-teal-600">{new Date(v.eta).toLocaleDateString()}</strong></div>}
                  <div>Status: <strong className="text-foreground">{v.status}</strong></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 6: Port Operations */}
      {activeTab === "port" && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {portOperations.map((p) => (
            <div
              key={p.portName}
              className="bg-background/80 p-3.5 rounded-xl border border-border/80 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{p.portName}</span>
                  <Badge variant="outline" className="font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30">
                    {p.activeCount} Active
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">Sea Corridor Terminal</span>
              </div>

              <div className="grid grid-cols-3 gap-1 py-1 text-center bg-muted/30 rounded-lg p-1.5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Gate-In</span>
                  <span className="text-sm font-black text-foreground">{p.gateInCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Loading</span>
                  <span className="text-sm font-black text-foreground">{p.loadingCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sailing</span>
                  <span className="text-sm font-black text-foreground">{p.vesselDepartingCount}</span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Cut-offs Approaching:</span>
                <span className="font-bold text-foreground">{p.upcomingCutoffsCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 7: Container Demurrage & Free Days */}
      {activeTab === "containers" && (
        <div className="p-3">
          {containerRisks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No active containers or tracked bookings found.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/70 pb-2">
                    <th className="py-2">Container</th>
                    <th className="py-2">Shipping Line</th>
                    <th className="py-2">Discharge Date</th>
                    <th className="py-2">Last Free Day</th>
                    <th className="py-2">Days Remaining</th>
                    <th className="py-2">Detention Exposure</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {containerRisks.map((c) => (
                    <tr key={c.containerNumber} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.containerNumber}
                      </td>
                      <td className="py-2 text-muted-foreground">{c.shippingLine || "Carrier"}</td>
                      <td className="py-2 text-foreground">
                        {c.dischargeDate ? new Date(c.dischargeDate).toLocaleDateString() : "Pending"}
                      </td>
                      <td className="py-2 text-foreground">
                        {c.lastFreeDay ? new Date(c.lastFreeDay).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2">
                        {c.isOverdue ? (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            OVERDUE ({Math.abs(c.daysRemaining)}d)
                          </Badge>
                        ) : c.daysRemaining <= 2 ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold">
                            {c.daysRemaining} days left
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{c.daysRemaining} days</span>
                        )}
                      </td>
                      <td className="py-2 font-bold text-red-600 dark:text-red-400">
                        {c.estimatedDetentionUSD > 0 ? `$${c.estimatedDetentionUSD.toLocaleString()} USD` : "$0 USD"}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 cursor-pointer text-blue-600 dark:text-blue-400"
                          onClick={() => onOpenContainer(c.containerNumber)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Document Compliance Status */}
      {activeTab === "compliance" && (
        <div className="p-3">
          {documentCompliance.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No active shipment compliance packages found.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/70 pb-2">
                    <th className="py-2">BOL Number</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2 text-center">BOL</th>
                    <th className="py-2 text-center">Comm. Invoice</th>
                    <th className="py-2 text-center">Packing List</th>
                    <th className="py-2 text-center">Transit Paper</th>
                    <th className="py-2 text-center">Phyto Draft</th>
                    <th className="py-2 text-center">Completeness</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {documentCompliance.map((d) => (
                    <tr key={d.bolNumber} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-mono font-bold text-foreground">
                        {d.bolNumber}
                      </td>
                      <td className="py-2 text-muted-foreground truncate max-w-[150px]">{d.customerName}</td>
                      <td className="py-2 text-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      </td>
                      <td className="py-2 text-center">
                        {d.hasCommercialInvoice ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                        ) : (
                          <span className="text-amber-500 font-bold">Pending</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {d.hasPackingList ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                        ) : (
                          <span className="text-amber-500 font-bold">Pending</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {d.hasTransitPaper ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                        ) : (
                          <span className="text-amber-500 font-bold">Pending</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {d.hasPhytoDraft ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                        ) : (
                          <span className="text-amber-500 font-bold">Pending</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${d.completenessPercent === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                          {d.completenessPercent}%
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 cursor-pointer text-blue-600 dark:text-blue-400"
                          onClick={() => onOpenCompliance(d.bolNumber)}
                        >
                          Open Package
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 9: Operational Readiness */}
      {activeTab === "readiness" && readiness && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">Ready For Border</span>
            <div className="text-2xl font-black text-foreground mt-1">{readiness.readyForBorder}</div>
            <span className="text-[11px] text-muted-foreground">All transit papers ready</span>
          </div>

          <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block">Not Ready For Border</span>
            <div className="text-2xl font-black text-foreground mt-1">{readiness.notReadyForBorder}</div>
            <span className="text-[11px] text-muted-foreground">Missing customs docs</span>
          </div>

          <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/30">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">Ready For Vessel</span>
            <div className="text-2xl font-black text-foreground mt-1">{readiness.readyForVessel}</div>
            <span className="text-[11px] text-muted-foreground">Container stuffed & doc clean</span>
          </div>

          <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/30">
            <span className="text-xs font-bold text-red-700 dark:text-red-300 block">Not Ready For Vessel</span>
            <div className="text-2xl font-black text-foreground mt-1">{readiness.notReadyForVessel}</div>
            <span className="text-[11px] text-muted-foreground">Missing container or docs</span>
          </div>
        </div>
      )}
    </div>
  )
}
