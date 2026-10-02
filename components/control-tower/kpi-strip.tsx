"use client"

import React from "react"
import {
  Truck,
  Ship,
  MapPin,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  ShieldAlert,
  CheckCircle2,
  FileWarning,
  Anchor,
  Box,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { OperationalKpiSummary, FinancialKpiSummary, PipelineStage } from "@/lib/control-tower/types"

interface KpiStripProps {
  kpis: OperationalKpiSummary
  financials: FinancialKpiSummary
  selectedStage: PipelineStage
  onSelectStage: (stage: PipelineStage) => void
  privacyMode: boolean
}

export function KpiStrip({
  kpis,
  financials,
  selectedStage,
  onSelectStage,
  privacyMode,
}: KpiStripProps) {
  const maskNumber = (val: number, cur: string) => {
    if (privacyMode) return `••••• ${cur}`
    return `${val.toLocaleString()} ${cur}`
  }

  return (
    <div className="space-y-3">
      {/* Primary Operational Row */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible no-scrollbar pb-1 sm:pb-0 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {/* Active Moving */}
        <button
          type="button"
          onClick={() => onSelectStage("all")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "all"
              ? "bg-blue-500/15 border-blue-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-blue-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Moving</span>
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.activeMoving}
          </div>
          <span className="text-[11px] text-muted-foreground">Total: {kpis.totalShipments}</span>
        </button>

        {/* Road Transit */}
        <button
          type="button"
          onClick={() => onSelectStage("road_transit")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "road_transit"
              ? "bg-amber-500/15 border-amber-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Road Transit</span>
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.inRoadTransit}
          </div>
          <span className="text-[11px] text-muted-foreground">Afghan corridor</span>
        </button>

        {/* At Border */}
        <button
          type="button"
          onClick={() => onSelectStage("border_clearance")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "border_clearance"
              ? "bg-orange-500/15 border-orange-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-orange-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">At Border</span>
            <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.atBorder}
          </div>
          <span className="text-[11px] text-muted-foreground">Customs station</span>
        </button>

        {/* At Port */}
        <button
          type="button"
          onClick={() => onSelectStage("port_operations")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "port_operations"
              ? "bg-cyan-500/15 border-cyan-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-cyan-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Port Ops</span>
            <Anchor className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.atPort}
          </div>
          <span className="text-[11px] text-muted-foreground">Gate-in & loading</span>
        </button>

        {/* On Vessel */}
        <button
          type="button"
          onClick={() => onSelectStage("on_vessel")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "on_vessel"
              ? "bg-indigo-500/15 border-indigo-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-indigo-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On Vessel</span>
            <Ship className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.onVessel}
          </div>
          <span className="text-[11px] text-muted-foreground">Sea transit</span>
        </button>

        {/* Arrived Destination */}
        <button
          type="button"
          onClick={() => onSelectStage("arrived_destination")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "arrived_destination"
              ? "bg-teal-500/15 border-teal-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-teal-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arrived Dest</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.arrivedDestination}
          </div>
          <span className="text-[11px] text-muted-foreground">Port of discharge</span>
        </button>

        {/* Delivered Total */}
        <button
          type="button"
          onClick={() => onSelectStage("delivered")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            selectedStage === "delivered"
              ? "bg-emerald-500/15 border-emerald-500 shadow-sm"
              : "bg-card/70 hover:bg-card/90 border-border/60 hover:border-emerald-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black tracking-tight text-foreground mt-1">
            {kpis.deliveredTotal}
          </div>
          <span className="text-[11px] text-muted-foreground">Completed</span>
        </button>

        {/* Needs Attention */}
        <button
          type="button"
          onClick={() => onSelectStage("all")}
          className={`shrink-0 min-w-[130px] sm:min-w-0 sm:shrink text-left p-3 rounded-xl border transition-all cursor-pointer ${
            kpis.criticalAttentionCount > 0
              ? "bg-red-500/15 border-red-500/70 shadow-sm shadow-red-500/10"
              : kpis.warningAttentionCount > 0
              ? "bg-amber-500/15 border-amber-500/70"
              : "bg-card/70 hover:bg-card/90 border-border/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attention</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.criticalAttentionCount > 0 ? "text-red-600 dark:text-red-400 animate-pulse" : "text-amber-500"}`} />
          </div>
          <div className="text-2xl font-black tracking-tight mt-1 text-foreground">
            {kpis.needsAttentionCount}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium mt-0.5">
            <span className="text-red-600 dark:text-red-400">{kpis.criticalAttentionCount} Crit</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">{kpis.warningAttentionCount} Warn</span>
          </div>
        </button>
      </div>

      {/* Secondary Operational & Cut-off Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-card/60 p-2.5 rounded-xl border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Cut-Offs Today</div>
              <div className="text-lg font-bold text-foreground">{kpis.cutOffsTodayCount}</div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">{kpis.cutOffsNext48hCount} next 48h</span>
        </div>

        <div className="bg-card/60 p-2.5 rounded-xl border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Detention Risk</div>
              <div className="text-lg font-bold text-foreground">{kpis.detentionRiskCount}</div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">&lt; 3 free days</span>
        </div>

        <div className="bg-card/60 p-2.5 rounded-xl border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileWarning className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Incomplete Docs</div>
              <div className="text-lg font-bold text-foreground">{kpis.incompleteDocsCount}</div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Drafts / pending</span>
        </div>

        <div className="bg-card/60 p-2.5 rounded-xl border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">VGM Pending</div>
              <div className="text-lg font-bold text-foreground">{kpis.vgmPendingCount}</div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Port gate requirement</span>
        </div>
      </div>

      {/* Strict Permission-Gated Financial Summary Row */}
      {financials.isPermitted && financials.currencyBreakdown && financials.currencyBreakdown.length > 0 && (
        <div className="bg-card/90 p-3 rounded-xl border border-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Accounting & Ledger Receivables (Separated by Currency)
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground">
              <span>Overdue Invoices: <strong className="text-red-600 dark:text-red-400 font-bold">{financials.overdueInvoicesCount}</strong></span>
              <span>Pending Receipts: <strong className="text-foreground font-semibold">{financials.pendingReceiptsCount}</strong></span>
              <span>Uninvoiced BOLs: <strong className="text-amber-600 dark:text-amber-400 font-semibold">{financials.uninvoicedShipmentsCount}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {financials.currencyBreakdown.map((item) => (
              <div
                key={item.currency}
                className="bg-background/80 p-2.5 rounded-lg border border-border/60 flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                    {item.currency}
                  </span>
                  <div className="text-base font-black text-foreground mt-1">
                    {maskNumber(item.receivables, item.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Net Balance</span>
                  <span className={`text-xs font-bold ${item.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {maskNumber(item.netBalance, item.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
