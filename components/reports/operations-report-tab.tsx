"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  SavedDocument,
  OperationsPeriodType,
  OperationsReportModel,
  OperationsSnapshotMetadata,
  ShipmentActivityItem,
} from "@/lib/reports/types"
import {
  resolveOperationsPeriod,
  buildOperationsReport,
  validateOperationsReportTotals,
  saveOperationsReportSnapshot,
  getOperationsReportSnapshots,
  deleteOperationsReportSnapshot,
  formatDateInTimezone,
} from "@/lib/reports/operations-report"
import {
  exportOperationsReportToExcel,
  exportOperationsReportToCsv,
} from "@/lib/reports/operations-export"
import { OperationsReportPrintDocument } from "./operations-report-print-document"
import { BolQuickView } from "./bol-quick-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Truck,
  Ship,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  FileDown,
  RotateCcw,
  Search,
  Bookmark,
  Trash2,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  Eye,
  X,
} from "lucide-react"
import { toast } from "sonner"

interface OperationsReportTabProps {
  allDocs: SavedDocument[]
  onOpenBol?: (id: string) => void
  onEditBol?: (id: string) => void
  initialPeriod?: OperationsPeriodType
}

export function OperationsReportTab({
  allDocs,
  onOpenBol,
  onEditBol,
  initialPeriod = "today",
}: OperationsReportTabProps) {
  // Period & Filter State
  const [periodType, setPeriodType] = useState<OperationsPeriodType>(initialPeriod)
  const todayIso = formatDateInTimezone(new Date())
  const [customStart, setCustomStart] = useState<string>(todayIso)
  const [customEnd, setCustomEnd] = useState<string>(todayIso)
  const [weekStartDay, setWeekStartDay] = useState<1 | 6>(1) // 1 = Mon, 6 = Sat (Afghan work week)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL")
  const [showOnlyAttention, setShowOnlyAttention] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  // View & Modal State
  const [activeSubSection, setActiveSubSection] = useState<
    "shipments" | "routes" | "containers" | "trucks" | "documents" | "breakdown"
  >("shipments")
  const [selectedBolForQuickView, setSelectedBolForQuickView] = useState<SavedDocument | null>(null)
  const [showSnapshotsDialog, setShowSnapshotsDialog] = useState<boolean>(false)
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false)
  const [snapshots, setSnapshots] = useState<OperationsSnapshotMetadata[]>([])

  // Load snapshots on mount
  useEffect(() => {
    try {
      const list = getOperationsReportSnapshots()
      setSnapshots(list)
    } catch {
      // Ignore storage errors
    }
  }, [])

  // 1. Resolve Period
  const period = useMemo(() => {
    return resolveOperationsPeriod(
      periodType,
      customStart,
      customEnd,
      "Asia/Kabul",
      weekStartDay
    )
  }, [periodType, customStart, customEnd, weekStartDay])

  // 2. Build Single Source of Truth Report Model
  const report: OperationsReportModel = useMemo(() => {
    return buildOperationsReport(
      allDocs,
      period,
      {},
      "Sky Ariana Operations Desk",
      notes
    )
  }, [allDocs, period, notes])

  // Validate Totals
  useEffect(() => {
    const valid = validateOperationsReportTotals(report)
    if (!valid.isValid) {
      console.warn("Operations Report Totals Discrepancy:", valid.errors)
    }
  }, [report])

  // Filter Shipments based on active table filters
  const filteredShipments = useMemo(() => {
    let result = report.shipments

    // Status filter
    if (selectedStatusFilter !== "ALL") {
      result = result.filter((s) => s.operationalStatus === selectedStatusFilter)
    }

    // Attention only
    if (showOnlyAttention) {
      result = result.filter((s) => s.needsAttention)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.bolNumber.toLowerCase().includes(q) ||
          s.trackingNumber.toLowerCase().includes(q) ||
          s.shipperName.toLowerCase().includes(q) ||
          s.consigneeName.toLowerCase().includes(q) ||
          s.commodity.toLowerCase().includes(q) ||
          s.driverName.toLowerCase().includes(q) ||
          s.truckNumber.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.borderCrossing.toLowerCase().includes(q) ||
          s.port.toLowerCase().includes(q)
      )
    }

    return result
  }, [report.shipments, selectedStatusFilter, showOnlyAttention, searchQuery])

  // Handle Quick View click
  const handleOpenDoc = (item: ShipmentActivityItem) => {
    const rawDoc = allDocs.find((d) => d.id === item.id || d.bol_number === item.bolNumber)
    if (rawDoc) {
      setSelectedBolForQuickView(rawDoc)
    } else {
      toast.info(`Shipment BOL #${item.bolNumber}`)
    }
  }

  // Handle Export Excel
  const handleExportExcel = async () => {
    const toastId = toast.loading("Preparing Excel Operations Report...")
    try {
      await exportOperationsReportToExcel(report)
      toast.dismiss(toastId)
      toast.success("Excel Operations Report (.xlsx) downloaded successfully! 📊")
    } catch (err) {
      console.error(err)
      toast.error("Failed to export Excel file")
    }
  }

  // Handle Export CSV
  const handleExportCsv = () => {
    try {
      exportOperationsReportToCsv(report)
      toast.success("CSV Operations Report downloaded with UTF-8 BOM! 📑")
    } catch (err) {
      console.error(err)
      toast.error("Failed to export CSV file")
    }
  }

  // Handle Save Snapshot
  const handleSaveSnapshot = () => {
    try {
      const snapshot = saveOperationsReportSnapshot(report)
      const list = getOperationsReportSnapshots()
      setSnapshots(list)
      toast.success(`Operations Snapshot "${snapshot.title}" saved! 💾`, {
        description: `Archived ${snapshot.shipmentCount} shipments for ${snapshot.dateRangeLabel}`,
      })
    } catch (err) {
      console.error(err)
      toast.error("Failed to save report snapshot")
    }
  }

  // Handle Delete Snapshot
  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      deleteOperationsReportSnapshot(id)
      const list = getOperationsReportSnapshots()
      setSnapshots(list)
      toast.success("Snapshot deleted")
    } catch {
      toast.error("Failed to delete snapshot")
    }
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP OPERATIONS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Truck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Operations Report Center
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-primary/15 text-primary border border-primary/20">
                Phase 3 Unified Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live status, border clearances, container inventory, driver dispatches, and management reporting.
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintModal(true)}
              className="text-xs h-8 gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Print / PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-8 gap-1.5 border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel (.xlsx)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs h-8 gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV (UTF-8)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSnapshot}
              className="text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Snapshot</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSnapshotsDialog(true)}
              className="text-xs h-8 gap-1 text-slate-600 dark:text-slate-400"
            >
              <span>History ({snapshots.length})</span>
            </Button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Period:
            </span>
            {(
              [
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "this_week", label: "This Week" },
                { id: "last_week", label: "Last Week" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPeriodType(btn.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  periodType === btn.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Week Start Option */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Week Starts:</span>
            <select
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(Number(e.target.value) as 1 | 6)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-slate-800 dark:text-slate-200"
            >
              <option value={1}>Monday (ISO Standard)</option>
              <option value={6}>Saturday (Afghanistan / GCC)</option>
            </select>
          </div>
        </div>

        {/* Custom Range Picker Inputs */}
        {periodType === "custom" && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Custom Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">From:</label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs w-36 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">To:</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs w-36 bg-white dark:bg-slate-900"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">({period.label})</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. OPERATIONAL SUMMARY KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Shipments</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{report.summary.totalShipments}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Filtered in period</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3.5 bg-blue-50/20">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Active In Transit</span>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{report.summary.activeShipments}</div>
          <span className="text-[10px] text-blue-600/70 block mt-0.5">Moving or at borders</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3.5 bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Delivered</span>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{report.summary.deliveredShipments}</div>
          <span className="text-[10px] text-emerald-600/70 block mt-0.5">Completed cycles</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Containers</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{report.summary.totalContainers}</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">{report.containerActivity.length} Active Boxes</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Weight</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(report.summary.totalGrossWeightKg / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400">MT</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
            {report.summary.totalGrossWeightKg.toLocaleString()} KG
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 rounded-xl p-3.5 bg-purple-50/20">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Dispatched Trucks</span>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">{report.summary.totalTrucks}</div>
          <span className="text-[10px] text-purple-600/70 block mt-0.5">Afghan transit plates</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. OPERATIONAL STATUS FILTER STRIP */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Pipeline Status:
            </span>
            <button
              onClick={() => setSelectedStatusFilter("ALL")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedStatusFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              ALL ({report.summary.totalShipments})
            </button>
            {report.summary.statusCategories.map((cat) => (
              <button
                key={cat.statusCategory}
                onClick={() => setSelectedStatusFilter(cat.statusCategory)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedStatusFilter === cat.statusCategory
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>{cat.statusCategory}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedStatusFilter === cat.statusCategory ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Attention toggle */}
          {report.summary.needsAttentionCount > 0 && (
            <button
              onClick={() => setShowOnlyAttention(!showOnlyAttention)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                showOnlyAttention
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Attention ({report.summary.needsAttentionCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Immediate Attention Warning Callout */}
      {report.needsAttention.length > 0 && !showOnlyAttention && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Immediate Operational Attention Required ({report.needsAttention.length} Issues)</span>
            </div>
            <button
              onClick={() => setShowOnlyAttention(true)}
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
            >
              Filter table to attention items →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {report.needsAttention.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSearchQuery(item.bolNumber)}
                className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 cursor-pointer hover:border-amber-400 transition-colors"
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">BOL #{item.bolNumber}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    item.severity === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {item.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">{item.issue}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-SECTION TAB NAVIGATION */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          {(
            [
              { id: "shipments", label: "Shipments Activity", icon: Truck, count: filteredShipments.length },
              { id: "routes", label: "Routes & Gateways", icon: MapPin, count: report.routeActivity.length },
              { id: "containers", label: "Container Inventory", icon: Ship, count: report.containerActivity.length },
              { id: "trucks", label: "Trucks & Dispatches", icon: Layers, count: report.truckActivity.length },
              { id: "documents", label: "Document Checklist", icon: FileText, count: report.documentStatusSummary.length },
              { id: "breakdown", label: "Daily Breakdown", icon: Clock, count: report.dailyBreakdown.length },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubSection === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubSection(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
                  isActive
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? "bg-primary/10 text-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* 5. SUB-SECTION CONTENT PANELS */}
      {/* ========================================================================= */}

      {/* PANEL A: SHIPMENTS ACTIVITY */}
      {activeSubSection === "shipments" && (
        <div className="space-y-4">
          {/* Search bar & active filter pills */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search BOL #, shipper, driver, plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Showing {filteredShipments.length} of {report.shipments.length} shipments</span>
              {(selectedStatusFilter !== "ALL" || showOnlyAttention || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedStatusFilter("ALL")
                    setShowOnlyAttention(false)
                    setSearchQuery("")
                  }}
                  className="text-primary font-medium hover:underline text-xs"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Shipment Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-2xs">
                  <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3">BOL Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Shipper / Consignee</th>
                    <th className="py-2.5 px-3">Commodity</th>
                    <th className="py-2.5 px-3 text-right">Gross Wt (KG)</th>
                    <th className="py-2.5 px-3">Origin → Destination</th>
                    <th className="py-2.5 px-3">Afghan Plate / Driver</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No shipments found matching the selected period and criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((s) => (
                      <tr
                        key={s.id || s.bolNumber}
                        onClick={() => handleOpenDoc(s)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{s.bolNumber}</span>
                            {s.needsAttention && (
                              <span
                                title={s.attentionReasons.join("; ")}
                                className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                              />
                            )}
                          </div>
                          {s.trackingNumber && s.trackingNumber !== s.bolNumber && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Ref: {s.trackingNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {s.issueDate}
                        </td>
                        <td className="py-2.5 px-3 max-w-[160px]">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{s.shipperName}</div>
                          <div className="text-[11px] text-slate-500 truncate">{s.consigneeName}</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[130px] truncate text-slate-700 dark:text-slate-300">
                          {s.commodity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                          {s.grossWeightKg.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
                          <div>{s.origin} → {s.destination}</div>
                          {s.borderCrossing && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              Via: {s.borderCrossing}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {s.truckNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">{s.driverName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.operationalStatus === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : s.operationalStatus === "AT BORDER"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}>
                            {s.operationalStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDoc(s)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PANEL B: ROUTES & GATEWAYS */}
      {activeSubSection === "routes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Active Corridors & Volumes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <th className="py-2 px-3">Route</th>
                    <th className="py-2 px-3">Transit Border</th>
                    <th className="py-2 px-3">Port</th>
                    <th className="py-2 px-3 text-center">Shipments</th>
                    <th className="py-2 px-3 text-center">Containers</th>
                    <th className="py-2 px-3 text-right">Gross Wt (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.routeActivity.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{r.route}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.border}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.port}</td>
                      <td className="py-2 px-3 text-center font-bold text-primary">{r.shipmentCount}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.containerCount}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {(r.grossWeightKg / 1000).toFixed(1)} MT
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            {/* Border Stations Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">
                Border Transit Points
              </h4>
              <div className="space-y-2">
                {report.borderActivity.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.borderStation}</span>
                    <div className="text-right">
                      <span className="font-bold text-primary mr-2">{b.shipmentCount} shipments</span>
                      <span className="text-slate-400 font-mono">{(b.grossWeightKg / 1000).toFixed(1)} MT</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ports Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">
                Ports of Call / Transshipment
              </h4>
              <div className="space-y-2">
                {report.portActivity.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.portName}</span>
                    <div className="text-right">
                      <span className="font-bold text-primary mr-2">{p.containerCount} containers</span>
                      <span className="text-slate-400 font-mono">{(p.grossWeightKg / 1000).toFixed(1)} MT</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL C: CONTAINER INVENTORY */}
      {activeSubSection === "containers" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ship className="w-4 h-4 text-primary" /> Active Container Tracking & Categories
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Total Containers: {report.containerActivity.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <th className="py-2.5 px-3">Container Number</th>
                  <th className="py-2.5 px-3">Size / Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">BOL Number</th>
                  <th className="py-2.5 px-3">Shipper / Consignee</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.containerActivity.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No containers recorded in this operating period.
                    </td>
                  </tr>
                ) : (
                  report.containerActivity.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {c.containerNumber}
                      </td>
                      <td className="py-2.5 px-3">{c.containerType}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.category === "Reefer" ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          {c.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-primary font-medium">{c.bolNumber}</td>
                      <td className="py-2.5 px-3 max-w-[160px] truncate text-slate-600 dark:text-slate-400">
                        {c.shipper} → {c.consignee}
                      </td>
                      <td className="py-2.5 px-3">{c.destination}</td>
                      <td className="py-2.5 px-3 text-slate-500">{c.port}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL D: TRUCKS & DISPATCHES */}
      {activeSubSection === "trucks" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" /> Driver Dispatches & Afghan License Plates
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                License plate sequencing preserved strictly without string distortion.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total Dispatches: {report.truckActivity.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <th className="py-2.5 px-3">Afghan Truck Plate</th>
                  <th className="py-2.5 px-3">Driver Name</th>
                  <th className="py-2.5 px-3">Father Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Border Crossing</th>
                  <th className="py-2.5 px-3">BOL Reference</th>
                  <th className="py-2.5 px-3 text-right">Rent / Cost</th>
                  <th className="py-2.5 px-3 text-center">Clearance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.truckActivity.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No truck dispatches recorded in this operating period.
                    </td>
                  </tr>
                ) : (
                  report.truckActivity.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/30">
                        {t.truckNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{t.driverName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{t.driverFatherName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{t.driverPhone}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{t.borderCrossing}</td>
                      <td className="py-2.5 px-3 font-mono text-primary font-medium">{t.bolNumber}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {t.rentAmount > 0 ? `${t.rentAmount.toLocaleString()} ${t.rentCurrency}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL E: DOCUMENT CHECKLIST */}
      {activeSubSection === "documents" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Document Clearance Status Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verification matrix for BOL, Commercial Invoice, Packing List, Transit Paper, and Phyto Certificate.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <th className="py-2.5 px-3">BOL Number</th>
                  <th className="py-2.5 px-3">Shipper / Consignee</th>
                  <th className="py-2.5 px-3 text-center">BOL</th>
                  <th className="py-2.5 px-3 text-center">Commercial Inv</th>
                  <th className="py-2.5 px-3 text-center">Packing List</th>
                  <th className="py-2.5 px-3 text-center">Transit Paper</th>
                  <th className="py-2.5 px-3 text-center">Phyto Cert</th>
                  <th className="py-2.5 px-3 text-center">Overall Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.documentStatusSummary.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{d.bolNumber}</td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-600 dark:text-slate-400">
                      {d.shipperName}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {d.hasBol ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {d.hasCommercialInvoice ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {d.hasPackingList ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {d.hasTransitPaper ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {d.hasPhyto ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.isComplete
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        {d.isComplete ? "COMPLETE" : `${d.missingCount} MISSING`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL F: DAILY BREAKDOWN */}
      {activeSubSection === "breakdown" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Day-by-Day Activity Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-center">Shipments</th>
                  <th className="py-2 px-3 text-center">Containers</th>
                  <th className="py-2 px-3 text-right">Gross Weight (KG)</th>
                  <th className="py-2 px-3 text-right">Gross Weight (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.dailyBreakdown.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-white">{d.date}</td>
                    <td className="py-2 px-3 text-center font-bold text-primary">{d.shipments}</td>
                    <td className="py-2 px-3 text-center font-mono">{d.containers}</td>
                    <td className="py-2 px-3 text-right font-mono">{d.grossWeightKg.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {(d.grossWeightKg / 1000).toFixed(1)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. OPERATING REMARKS / NOTES */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
          Operations Manager Remarks & Transit Notes
        </h4>
        <Textarea
          placeholder="Add operational notes, border delay warnings, road clearance status, or instructions to be included on exported reports..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-xs min-h-[70px] bg-slate-50 dark:bg-slate-800/50"
        />
      </div>

      {/* ========================================================================= */}
      {/* 7. PRINTABLE A4 MODAL */}
      {/* ========================================================================= */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-slate-100 dark:bg-slate-950">
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Print Preview — {report.metadata.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Formal A4 operations report layout ready for physical printing or PDF generation.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>

          <div className="p-6">
            <OperationsReportPrintDocument report={report} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. SNAPSHOTS HISTORY DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={showSnapshotsDialog} onOpenChange={setShowSnapshotsDialog}>
        <DialogContent className="max-w-xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" />
              Saved Operations Report Snapshots
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Point-in-time report snapshots stored locally. Deleting a snapshot never touches actual BOL data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto">
            {snapshots.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">
                No snapshots saved yet. Click &quot;Save Snapshot&quot; on any report to archive a point-in-time view.
              </p>
            ) : (
              snapshots.map((s) => (
                <div
                  key={s.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</h5>
                    <div className="text-[10px] text-slate-500 mt-0.5 space-x-2">
                      <span>Saved: {s.savedAt}</span>
                      <span>•</span>
                      <span>{s.shipmentCount} Shipments</span>
                      <span>•</span>
                      <span className="font-mono">{s.totalGrossWeightKg.toLocaleString()} KG</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteSnapshot(s.id, e)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 9. BOL QUICK VIEW DRAWER */}
      {/* ========================================================================= */}
      {selectedBolForQuickView && (
        <BolQuickView
          doc={selectedBolForQuickView}
          onClose={() => setSelectedBolForQuickView(null)}
          onEditBol={onEditBol}
          onOpenPreview={onOpenBol}
        />
      )}
    </div>
  )
}
