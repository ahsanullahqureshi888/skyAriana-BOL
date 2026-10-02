"use client"

import React, { useEffect, useRef } from "react"
import {
  X,
  ArrowRight,
  ExternalLink,
  FileText,
  Calendar,
  Package,
  Weight,
  DollarSign,
  Truck,
  MapPin,
  ChevronRight,
  Eye,
  TrendingUp,
} from "lucide-react"
import { SavedDocument } from "@/lib/reports/types"
import { formatDisplayDate, extractBolRoute, extractTruckNo } from "@/lib/reports/parsers"
import { isRtlText } from "@/lib/reports/parsers"

export interface DrawerKpiItem {
  label: string
  value: string | number
  color?: "blue" | "emerald" | "amber" | "purple" | "slate"
}

export interface DrawerBreakdownSection {
  title: string
  items: Array<{
    label: string
    value: string | number
    sublabel?: string
  }>
}

interface ReportDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  entityType:
    | "shipper"
    | "consignee"
    | "commodity"
    | "destination"
    | "route"
    | "truck"
    | "container"
    | "month"
  entityName: string
  entityBadge?: string
  kpis: DrawerKpiItem[]
  breakdowns?: DrawerBreakdownSection[]
  recentBols?: SavedDocument[]
  onViewMatchingBols: () => void
  onOpenBolQuickView?: (doc: SavedDocument) => void
  matchingCount?: number
}

export function ReportDetailDrawer({
  isOpen,
  onClose,
  entityType,
  entityName,
  entityBadge,
  kpis,
  breakdowns = [],
  recentBols = [],
  onViewMatchingBols,
  onOpenBolQuickView,
  matchingCount,
}: ReportDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isRtl = isRtlText(entityName)
  const displayBadge =
    entityBadge ||
    (entityType === "shipper"
      ? "Commercial Shipper"
      : entityType === "consignee"
      ? "Consignee / Receiver"
      : entityType === "commodity"
      ? "Commodity / Cargo"
      : entityType === "destination"
      ? "Transit Hub / Port"
      : entityType === "route"
      ? "Transit Corridor"
      : entityType === "truck"
      ? "Fleet Transport"
      : entityType === "container"
      ? "Container Equipment"
      : "Operating Month")

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        className="absolute inset-y-0 right-0 max-w-full flex pl-10 animate-in slide-in-from-right duration-200"
      >
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* 1. DRAWER TOP HEADER */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                  {displayBadge}
                </span>
                {matchingCount !== undefined && (
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    {matchingCount} {matchingCount === 1 ? "Record" : "Records"}
                  </span>
                )}
              </div>
              <h2
                className={`text-lg font-black text-slate-950 dark:text-slate-100 mt-1 truncate ${
                  isRtl ? "text-right font-[vazirmatn]" : ""
                }`}
                dir={isRtl ? "rtl" : "ltr"}
                title={entityName}
              >
                {entityName}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. PROMINENT TOP ACTION: VIEW MATCHING BOLS */}
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40">
            <button
              type="button"
              onClick={() => {
                onViewMatchingBols()
                onClose()
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>View Matching BOL Records {matchingCount !== undefined ? `(${matchingCount})` : ""}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3. SCROLLABLE CONTENT BODY */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
            {/* Quick KPI Cards */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2.5">
                Performance & Operational Metrics
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {kpis.map((kpi, idx) => {
                  const borderBg =
                    kpi.color === "emerald"
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                      : kpi.color === "amber"
                      ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300"
                      : kpi.color === "purple"
                      ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"

                  return (
                    <div
                      key={`${kpi.label}-${idx}`}
                      className={`p-2.5 rounded-xl border ${borderBg}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        {kpi.label}
                      </span>
                      <p className="text-base sm:text-lg font-black font-mono mt-0.5 truncate">
                        {kpi.value}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Breakdowns (e.g. Commodities, Top Partners, Destinations) */}
            {breakdowns.map((section, sIdx) => (
              <div key={`${section.title}-${sIdx}`} className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {section.title}
                </p>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {section.items.length > 0 ? (
                    section.items.map((item, iIdx) => (
                      <div
                        key={`${item.label}-${iIdx}`}
                        className="py-2 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.label}
                          </p>
                          {item.sublabel && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.sublabel}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-black text-slate-950 dark:text-slate-100 shrink-0">
                          {item.value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 px-3 text-center text-slate-400 text-xs">
                      No breakdown data recorded
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Recent BOL Records (5–10 items) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Recent Bill of Lading Activity
                </p>
                <span className="text-[10px] text-slate-400">
                  Showing {Math.min(recentBols.length, 10)} recent
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {recentBols.length > 0 ? (
                  recentBols.slice(0, 10).map((bol, bIdx) => {
                    const routeInfo = extractBolRoute(bol)
                    const dateStr = formatDisplayDate(bol.issue_date || bol.created_at)

                    return (
                      <div
                        key={bol.id || bIdx}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-blue-700 dark:text-blue-400">
                              {bol.bol_number || "Draft BOL"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {dateStr}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px] mt-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {routeInfo.shortDisplay !== "—"
                                ? routeInfo.shortDisplay
                                : `${bol.port_of_loading || "Origin"} ➜ ${bol.port_of_discharge || "Dest"}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {bol.number_of_packages && (
                              <span>Pkg: {bol.number_of_packages}</span>
                            )}
                            {bol.net_weight && (
                              <span>Net: {bol.net_weight} KG</span>
                            )}
                            {bol.goods_value && (
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {bol.goods_value}
                              </span>
                            )}
                          </div>
                        </div>

                        {onOpenBolQuickView && (
                          <button
                            type="button"
                            onClick={() => onOpenBolQuickView(bol)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
                            title="Quick View BOL"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="py-6 px-4 text-center text-slate-400 text-xs">
                    No related BOL records found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. FOOTER */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Sky Ariana Read-Only Ledger Audit
            </span>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
