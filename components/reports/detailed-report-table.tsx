"use client"

import React, { useState, useMemo, useCallback, useEffect, startTransition } from "react"
import { SavedDocument, OverviewKpis } from "@/lib/reports/types"
import {
  formatDisplayDate,
  isRtlText,
  extractInvoiceNo,
  extractTruckNo,
  extractBolRoute,
  parseWeight,
  parsePackages,
  parseMoney,
} from "@/lib/reports/parsers"
import { extractDriverFatherName, extractTransitBorderStation } from "@/lib/reports/export-excel"
import { parseSyncedCargoItems } from "@/lib/utils/cargo-grid"
import { extractBolCargoAndRates } from "@/lib/reports/cargo-rate-extractor"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import { BolExpandedRow } from "./bol-expanded-row"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  Compass,
  Package,
  Layers,
  Phone,
  Edit,
  ExternalLink,
  Share2,
  Boxes,
  Loader2,
  Check,
  RotateCcw,
  Sparkles,
  Search,
} from "lucide-react"
import { toast } from "sonner"

export type TableDensity = "compact" | "normal"

export type SortField =
  | "idx"
  | "bol_number"
  | "issue_date"
  | "truck_number"
  | "invoice_no"
  | "shipper_name"
  | "consignee_name"
  | "notify_party"
  | "packages"
  | "net_weight"
  | "gross_weight"
  | "rate"
  | "goods_value"
  | "status"

export type SortOrder = "asc" | "desc"

export type ColumnId =
  | "idx"
  | "expand"
  | "bolNo"
  | "date"
  | "truckDriver"
  | "invoice"
  | "shipper"
  | "consignee"
  | "notify"
  | "cargo"
  | "route"
  | "packages"
  | "netWt"
  | "grossWt"
  | "rate"
  | "value"
  | "container"
  | "seal"
  | "status"
  | "pdf"
  | "actions"

export type ColumnPreset = "operations" | "finance" | "shipping" | "minimal" | "all"

export const COLUMN_DEFINITIONS: { id: ColumnId; label: string; minWidth: string; category: string }[] = [
  { id: "idx", label: "#", minWidth: "40px", category: "System" },
  { id: "expand", label: "Expand", minWidth: "32px", category: "System" },
  { id: "bolNo", label: "BOL No.", minWidth: "115px", category: "Shipment" },
  { id: "date", label: "Date", minWidth: "90px", category: "Shipment" },
  { id: "truckDriver", label: "Truck / Driver", minWidth: "155px", category: "Transport" },
  { id: "invoice", label: "Invoice", minWidth: "95px", category: "Financial" },
  { id: "shipper", label: "Shipper", minWidth: "170px", category: "Parties" },
  { id: "consignee", label: "Consignee", minWidth: "170px", category: "Parties" },
  { id: "notify", label: "Notify Party", minWidth: "150px", category: "Parties" },
  { id: "cargo", label: "Cargo Summary", minWidth: "210px", category: "Cargo" },
  { id: "route", label: "Route", minWidth: "170px", category: "Transport" },
  { id: "packages", label: "Packages", minWidth: "110px", category: "Cargo" },
  { id: "netWt", label: "Net Wt", minWidth: "105px", category: "Cargo" },
  { id: "grossWt", label: "Gross Wt", minWidth: "105px", category: "Cargo" },
  { id: "rate", label: "Rate/KG", minWidth: "95px", category: "Financial" },
  { id: "value", label: "Goods Value", minWidth: "135px", category: "Financial" },
  { id: "container", label: "Container", minWidth: "130px", category: "Transport" },
  { id: "seal", label: "Seal No.", minWidth: "100px", category: "Transport" },
  { id: "status", label: "Status", minWidth: "100px", category: "Shipment" },
  { id: "pdf", label: "PDF", minWidth: "70px", category: "System" },
  { id: "actions", label: "Actions", minWidth: "125px", category: "System" },
]

export const COLUMN_PRESETS: Record<ColumnPreset, { label: string; columns: ColumnId[] }> = {
  operations: {
    label: "Operations",
    columns: ["idx", "expand", "bolNo", "date", "truckDriver", "shipper", "consignee", "cargo", "route", "container", "status", "pdf", "actions"],
  },
  finance: {
    label: "Finance",
    columns: ["idx", "expand", "bolNo", "date", "invoice", "shipper", "consignee", "cargo", "rate", "value", "truckDriver", "pdf", "actions"],
  },
  shipping: {
    label: "Shipping",
    columns: ["idx", "expand", "bolNo", "date", "truckDriver", "container", "route", "packages", "netWt", "grossWt", "status", "pdf", "actions"],
  },
  minimal: {
    label: "Minimal",
    columns: ["idx", "expand", "bolNo", "date", "shipper", "consignee", "cargo", "value", "pdf", "actions"],
  },
  all: {
    label: "All Columns",
    columns: [
      "idx", "expand", "bolNo", "date", "truckDriver", "invoice", "shipper", "consignee",
      "notify", "cargo", "route", "packages", "netWt", "grossWt", "rate", "value",
      "container", "seal", "status", "pdf", "actions"
    ],
  },
}

export interface DetailedReportTableProps {
  documents: SavedDocument[]
  filteredDocuments: SavedDocument[]
  overviewKpis: OverviewKpis
  selectedDocIds: string[]
  onToggleSelectId: (id: string) => void
  onSelectAllFiltered: () => void
  onClearSelection: () => void
  onSelectPage: (pageIds: string[]) => void
  onOpenQuickView: (doc: SavedDocument) => void
  onEditBol?: (id: string) => void
  onOpenPreview?: (id: string) => void
  onPrintReport: () => void
  onDownloadPdf: () => void
  onExportExcel: () => void
  isGeneratingPdf?: boolean
}

const LOCAL_STORAGE_COLS_KEY = "aq_bol_report_visible_cols_v2"

const TOGGLEABLE_COLUMNS = COLUMN_DEFINITIONS.filter(
  (c) => c.id !== "idx" && c.id !== "expand" && c.id !== "bolNo"
)

interface ColumnCustomizerProps {
  visibleColumns: Set<ColumnId>
  onToggleColumn: (colId: ColumnId) => void
  onApplyPreset: (preset: ColumnPreset) => void
}

const ColumnCustomizer = React.memo(function ColumnCustomizer({
  visibleColumns,
  onToggleColumn,
  onApplyPreset,
}: ColumnCustomizerProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    // Break out of synchronous event dispatch so button click responds immediately (< 16ms INP)
    startTransition(() => {
      setOpen(nextOpen)
    })
  }, [])

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8.5 px-3 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          <span>Columns ({visibleColumns.size})</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[80vh] overflow-y-auto rounded-xl p-2 font-medium">
        <DropdownMenuLabel className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Column Presets
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 p-1">
          {(["operations", "finance", "shipping", "minimal", "all"] as ColumnPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onApplyPreset(p)}
              className="px-2 py-1 rounded text-left text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 cursor-pointer transition-all"
            >
              {COLUMN_PRESETS[p].label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Toggle Individual Columns
        </DropdownMenuLabel>
        {TOGGLEABLE_COLUMNS.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visibleColumns.has(col.id)}
            onCheckedChange={() => onToggleColumn(col.id)}
            className="text-xs cursor-pointer"
          >
            {col.label} <span className="text-[10px] text-slate-400 ml-auto font-mono">({col.category})</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

export function DetailedReportTable({
  documents,
  filteredDocuments,
  overviewKpis,
  selectedDocIds,
  onToggleSelectId,
  onSelectAllFiltered,
  onClearSelection,
  onSelectPage,
  onOpenQuickView,
  onEditBol,
  onOpenPreview,
  onPrintReport,
  onDownloadPdf,
  onExportExcel,
  isGeneratingPdf = false,
}: DetailedReportTableProps) {
  // Density and sizing
  const [tableDensity, setTableDensity] = useState<TableDensity>("compact")
  const [isFitScreen, setIsFitScreen] = useState(false)
  const [pageSize, setPageSize] = useState<number | "all">(50)
  const [currentPage, setCurrentPage] = useState(1)

  // Sorting
  const [sortField, setSortField] = useState<SortField>("issue_date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  // Quick Filter Chips
  const [quickChip, setQuickChip] = useState<string>("all")

  // Visible Columns
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_COLS_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return new Set<ColumnId>(parsed as ColumnId[])
          }
        }
      } catch {}
    }
    return new Set<ColumnId>(COLUMN_PRESETS.operations.columns)
  })

  // Save column visibility changes
  const updateVisibleColumns = useCallback((cols: Set<ColumnId>) => {
    startTransition(() => {
      setVisibleColumns(cols)
    })
    setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOCAL_STORAGE_COLS_KEY, JSON.stringify(Array.from(cols)))
        } catch {}
      }
    }, 0)
  }, [])

  const applyPreset = useCallback((preset: ColumnPreset) => {
    updateVisibleColumns(new Set(COLUMN_PRESETS[preset].columns))
    toast.success(`Switched to ${COLUMN_PRESETS[preset].label} column preset`)
  }, [updateVisibleColumns])

  const toggleColumn = useCallback((colId: ColumnId) => {
    if (colId === "idx" || colId === "expand" || colId === "bolNo") return // Always visible
    startTransition(() => {
      setVisibleColumns((prev) => {
        const next = new Set(prev)
        if (next.has(colId)) next.delete(colId)
        else next.add(colId)
        setTimeout(() => {
          try {
            localStorage.setItem(LOCAL_STORAGE_COLS_KEY, JSON.stringify(Array.from(next)))
          } catch {}
        }, 0)
        return next
      })
    })
  }, [])

  // Ensure all rows are rendered during browser print / PDF export
  useEffect(() => {
    let prevSize: number | "all" = pageSize
    const handleBeforePrint = () => {
      prevSize = pageSize
      setPageSize("all")
    }
    const handleAfterPrint = () => {
      if (prevSize !== "all") {
        setPageSize(prevSize)
      }
    }
    window.addEventListener("beforeprint", handleBeforePrint)
    window.addEventListener("afterprint", handleAfterPrint)
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint)
      window.removeEventListener("afterprint", handleAfterPrint)
    }
  }, [pageSize])

  // Expanded Rows State
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set())
  const toggleRowExpanded = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpandedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllRows = () => {
    startTransition(() => {
      setExpandedDocIds(new Set(paginatedRows.map((r) => r.id)))
    })
    toast.info(`Expanded all ${paginatedRows.length} visible rows`)
  }

  const collapseAllRows = () => {
    startTransition(() => {
      setExpandedDocIds(new Set())
    })
    toast.info("Collapsed all rows")
  }

  // Apply Quick Filter Chips
  const chipFilteredData = useMemo(() => {
    if (quickChip === "all") return filteredDocuments
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]

    return filteredDocuments.filter((doc) => {
      const docDate = (doc.issue_date || doc.created_at || "").split("T")[0]
      const routeInfo = extractBolRoute(doc)

      if (quickChip === "today") {
        return docDate === todayStr
      }
      if (quickChip === "7days") {
        const diffDays = (now.getTime() - new Date(docDate).getTime()) / (1000 * 3600 * 24)
        return diffDays >= 0 && diffDays <= 7
      }
      if (quickChip === "thisMonth") {
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        return docDate.startsWith(ym)
      }
      if (quickChip === "reefer") {
        return Boolean(routeInfo.hasReefer || routeInfo.isFullReefer)
      }
      if (quickChip === "dry") {
        return !routeInfo.hasReefer && !routeInfo.isFullReefer
      }
      if (quickChip === "missingDocs") {
        return !doc.invoice_no || !doc.container_numbers || !doc.truck_number
      }
      if (quickChip === "noPdf") {
        return !doc.pdf_url
      }
      if (quickChip === "completed") {
        return Boolean(doc.pdf_url)
      }
      return true
    })
  }, [filteredDocuments, quickChip])

  // Sorting Handler
  const handleSort = (field: SortField) => {
    startTransition(() => {
      if (sortField === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortField(field)
        setSortOrder(field === "issue_date" || field === "goods_value" || field === "packages" ? "desc" : "asc")
      }
    })
  }

  // Sorted Dataset
  const sortedData = useMemo(() => {
    const list = [...chipFilteredData]
    list.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "bol_number":
          comparison = (a.bol_number || "").localeCompare(b.bol_number || "", undefined, { numeric: true })
          break
        case "issue_date":
          const dateA = new Date(a.issue_date || a.created_at || 0).getTime()
          const dateB = new Date(b.issue_date || b.created_at || 0).getTime()
          comparison = dateA - dateB
          break
        case "truck_number":
          comparison = (extractTruckNo(a) || "").localeCompare(extractTruckNo(b) || "")
          break
        case "invoice_no":
          comparison = (extractInvoiceNo(a) || "").localeCompare(extractInvoiceNo(b) || "", undefined, { numeric: true })
          break
        case "shipper_name":
          comparison = (a.shipper_name || "").localeCompare(b.shipper_name || "")
          break
        case "consignee_name":
          comparison = (a.consignee_name || "").localeCompare(b.consignee_name || "")
          break
        case "notify_party":
          const notifyA = (a.notify_party_name || a.notify_party || (a as any).notifyParty || "").trim()
          const notifyB = (b.notify_party_name || b.notify_party || (b as any).notifyParty || "").trim()
          comparison = notifyA.localeCompare(notifyB)
          break
        case "packages":
          comparison = parsePackages(a.number_of_packages) - parsePackages(b.number_of_packages)
          break
        case "net_weight":
          comparison = parseWeight(a.net_weight) - parseWeight(b.net_weight)
          break
        case "gross_weight":
          comparison = parseWeight(a.gross_weight) - parseWeight(b.gross_weight)
          break
        case "goods_value":
          comparison = parseMoney(a.goods_value).amount - parseMoney(b.goods_value).amount
          break
        case "status":
          const stA = a.pdf_url ? "PDF READY" : "SAVED"
          const stB = b.pdf_url ? "PDF READY" : "SAVED"
          comparison = stA.localeCompare(stB)
          break
        default:
          comparison = 0
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
    return list
  }, [chipFilteredData, sortField, sortOrder])

  // Paginated Rows
  const totalPages = pageSize === "all" ? 1 : Math.ceil(sortedData.length / pageSize)
  const paginatedRows = useMemo(() => {
    if (pageSize === "all") return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Selection helpers
  const isAllPageSelected = useMemo(() => {
    if (paginatedRows.length === 0) return false
    return paginatedRows.every((r) => selectedDocIds.includes(r.id))
  }, [paginatedRows, selectedDocIds])

  const handleToggleSelectPage = () => {
    if (isAllPageSelected) {
      // Unselect page rows
      const pageIds = new Set(paginatedRows.map((r) => r.id))
      const remaining = selectedDocIds.filter((id) => !pageIds.has(id))
      onClearSelection()
      remaining.forEach((id) => onToggleSelectId(id))
    } else {
      onSelectPage(paginatedRows.map((r) => r.id))
    }
  }

  // Calculate Page Subtotals
  const pageSubtotals = useMemo(() => {
    let pkgs = 0
    let net = 0
    let gross = 0
    let val = 0
    for (const r of paginatedRows) {
      pkgs += parsePackages(r.number_of_packages)
      const n = parseWeight(r.net_weight)
      net += n
      const g = parseWeight(r.gross_weight)
      gross += g > 0 ? g : n
      val += parseMoney(r.goods_value).amount
    }
    return { pkgs, net, gross, val }
  }, [paginatedRows])

  const visibleColsCount = visibleColumns.size

  return (
    <div className="space-y-2.5">
      {/* 1. AGGREGATE SUMMARY BANNER (ALL FILTERED RECORDS TOTALS) */}
      <div className="no-print print:hidden grid grid-cols-2 sm:grid-cols-5 gap-2 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3 rounded-2xl border border-blue-800/80 shadow-sm">
        <div className="border-r border-white/10 pr-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block">Filtered BOLs</span>
          <p className="text-base font-black font-mono mt-0.5">{filteredDocuments.length.toLocaleString()} <span className="text-xs font-normal text-blue-200">Shipments</span></p>
        </div>

        <div className="border-r border-white/10 pr-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block">Total Packages</span>
          <p className="text-base font-black font-mono mt-0.5">{overviewKpis.totalPackages.toLocaleString()} <span className="text-xs font-normal text-blue-200">CTNS</span></p>
        </div>

        <div className="border-r border-white/10 pr-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">Total Net Weight</span>
          <p className="text-base font-black font-mono mt-0.5 text-amber-300">{overviewKpis.totalNetWeightKg.toLocaleString()} <span className="text-xs font-normal text-amber-200">KG</span></p>
        </div>

        <div className="border-r border-white/10 pr-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Total Gross Weight</span>
          <p className="text-base font-black font-mono mt-0.5">{overviewKpis.totalGrossWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-300">KG</span></p>
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">Total Declared Value</span>
          <p className="text-base font-black font-mono text-emerald-300 mt-0.5">
            ${(overviewKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* 2. MODERN GLASSMORPHIC TOOLBAR */}
      <div className="no-print print:hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm" data-no-print="true">
        {/* Left: Checkboxes & Quick Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer font-extrabold text-slate-800 dark:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={isAllPageSelected}
              onChange={handleToggleSelectPage}
              className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Select Page ({paginatedRows.length})</span>
          </label>

          {filteredDocuments.length > paginatedRows.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAllFiltered}
              className="h-7.5 px-2.5 text-xs rounded-xl border-blue-300 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-black shadow-2xs hover:bg-blue-100 cursor-pointer"
            >
              Select All {filteredDocuments.length} Filtered BOLs
            </Button>
          )}

          {selectedDocIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-lg cursor-pointer transition-all"
            >
              Clear ({selectedDocIds.length})
            </button>
          )}

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all", label: "All" },
              { id: "today", label: "Today" },
              { id: "7days", label: "7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "reefer", label: "❄️ Reefer" },
              { id: "dry", label: "📦 Dry" },
              { id: "missingDocs", label: "⚠️ Missing Docs" },
              { id: "noPdf", label: "📄 No PDF" },
              { id: "completed", label: "✓ Completed" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setQuickChip(chip.id)
                    setCurrentPage(1)
                  })
                }}
                className={`px-2 py-0.8 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  quickChip === chip.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Columns Selector, Export, Print, Density & View Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column Customizer Dropdown */}
          <ColumnCustomizer
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            onApplyPreset={applyPreset}
          />

          {/* Expand/Collapse All Rows */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandedDocIds.size > 0 ? collapseAllRows : expandAllRows}
            className="h-8.5 px-2.5 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs"
            title={expandedDocIds.size > 0 ? "Collapse all open row details" : "Expand all rows on current page"}
          >
            {expandedDocIds.size > 0 ? "Collapse All" : "Expand All"}
          </Button>

          {/* Print, Download PDF, and Excel Buttons */}
          <Button
            type="button"
            onClick={onPrintReport}
            className="h-8.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
            title="Print Saved BOL Report (A4 Landscape / Portrait)"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>Print</span>
          </Button>

          <Button
            type="button"
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="h-8.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
            title="Download complete report as PDF"
          >
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>Download PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onExportExcel}
            className="h-8.5 px-3 rounded-xl border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Export table data to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel</span>
          </Button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

          {/* Fit Screen / Full Details Wide Scroll */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              startTransition(() => {
                setIsFitScreen(!isFitScreen)
              })
            }}
            className={`h-8.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isFitScreen
                ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
            title={!isFitScreen ? "Wide Scroll Active" : "Compact Screen Fit"}
          >
            {!isFitScreen ? <Maximize2 className="w-3.5 h-3.5 text-white" /> : <Minimize2 className="w-3.5 h-3.5 text-slate-600" />}
            <span>{!isFitScreen ? "Full Details" : "Compact Fit"}</span>
          </Button>

          {/* Density Toggle (Compact vs Normal) */}
          <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 h-8.5">
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  setTableDensity("compact")
                })
              }}
              className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                tableDensity === "compact"
                  ? "bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  setTableDensity("normal")
                })
              }}
              className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                tableDensity === "normal"
                  ? "bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Normal
            </button>
          </div>

          {/* Rows per page dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-0.5 h-8.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))
                setCurrentPage(1)
              }}
              className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value="all">All ({sortedData.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. MOBILE STRUCTURED CARDS (md:hidden) */}
      <div className="md:hidden space-y-3 print:hidden">
        {paginatedRows.map((doc, idx) => {
          const pkgs = parsePackages(doc.number_of_packages)
          const gross = parseWeight(doc.gross_weight)
          const net = parseWeight(doc.net_weight)
          const weightKg = gross > 0 ? gross : net
          const val = parseMoney(doc.goods_value).amount
          const isExpanded = expandedDocIds.has(doc.id)

          return (
            <div
              key={doc.id || `mobile-doc-${idx}`}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400">#{(currentPage - 1) * (pageSize === 'all' ? 0 : pageSize) + idx + 1}</span>
                  <span className="font-mono font-black text-xs text-blue-700 dark:text-blue-400">{doc.bol_number || "BOL"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">{formatDisplayDate(doc.issue_date || doc.created_at)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${
                    doc.pdf_url ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}>
                    {doc.pdf_url ? "PDF" : "SAVED"}
                  </span>
                </div>
              </div>

              {/* Shipper -> Consignee */}
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{doc.shipper_name || "Unknown Shipper"}</p>
                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <span>→</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{doc.consignee_name || "Unknown Consignee"}</span>
                </div>
              </div>

              {/* Packages, Weight & Goods Value */}
              <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Packages</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">{pkgs.toLocaleString()} CTNS</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Weight</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{weightKg.toLocaleString()} KG</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Goods Value</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">${val.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                  {doc.truck_number && <span>🚚 {doc.truck_number}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenQuickView(doc)}
                    className="h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    View
                  </Button>
                  {onEditBol && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditBol(doc.id)}
                      className="h-7 px-2.5 text-xs font-bold rounded-lg text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Edit
                    </Button>
                  )}
                  {onOpenPreview && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenPreview(doc.id)}
                      className="h-7 px-2 text-xs font-bold rounded-lg cursor-pointer"
                      title="Preview"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleRowExpanded(doc.id)}
                    className="h-7 px-1.5 text-xs rounded-lg cursor-pointer text-slate-400 hover:text-slate-600"
                    title={isExpanded ? "Collapse" : "More details"}
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Inline Expanded Mobile Drawer */}
              {isExpanded && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  {doc.cargo_description && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo:</span>
                      <p className="text-slate-800 dark:text-slate-200">{doc.cargo_description}</p>
                    </div>
                  )}
                  {doc.driver_name && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Driver:</span>
                      <p className="text-slate-800 dark:text-slate-200">{doc.driver_name} {doc.driver_rent ? `• Rent: ${doc.driver_rent}` : ""}</p>
                    </div>
                  )}
                  {doc.container_numbers && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Container:</span>
                      <p className="font-mono text-slate-800 dark:text-slate-200">{doc.container_numbers}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {paginatedRows.length === 0 && (
          <div className="py-8 text-center text-slate-500 font-semibold text-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            No Saved BOL records match the selected filters.
          </div>
        )}
      </div>

      {/* 4. MAIN DATA TABLE (Desktop & Tablet) */}
      <div className="hidden md:block print:block w-full overflow-x-auto print:overflow-visible border border-slate-200/90 dark:border-slate-800 print:border-none rounded-2xl print:rounded-none max-h-[calc(100vh-210px)] print:max-h-none overflow-y-auto print:overflow-y-visible shadow-xs bg-white dark:bg-slate-900 scrollbar-thin">
        <table className={`w-full ${isFitScreen ? "min-w-[1450px]" : "min-w-[1850px]"} text-xs text-left border-collapse`}>
          <thead className="sticky top-0 z-20 bg-slate-900 text-slate-100 shadow-sm print:static print:table-header-group">
            <tr className="border-b border-slate-700 bg-slate-900 text-slate-100">
              {/* Sticky # column */}
              {visibleColumns.has("idx") && (
                <th className={`px-2 font-extrabold text-slate-300 text-center uppercase tracking-wider sticky left-0 z-30 bg-slate-900 border-r border-slate-800 w-10 min-w-[40px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  #
                </th>
              )}

              {/* Sticky Expand column */}
              {visibleColumns.has("expand") && (
                <th className={`px-1.5 font-extrabold text-slate-300 text-center uppercase tracking-wider sticky left-[40px] z-30 bg-slate-900 border-r border-slate-800 w-8 min-w-[32px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  <span className="sr-only">Expand</span>
                </th>
              )}

              {/* Sticky BOL No. column */}
              {visibleColumns.has("bolNo") && (
                <th
                  onClick={() => handleSort("bol_number")}
                  className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider sticky left-[72px] z-30 bg-slate-900 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.35)] border-r border-slate-700 min-w-[115px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>BOL No.</span>
                    {sortField === "bol_number" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Date */}
              {visibleColumns.has("date") && (
                <th
                  onClick={() => handleSort("issue_date")}
                  className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[90px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {sortField === "issue_date" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Truck / Driver */}
              {visibleColumns.has("truckDriver") && (
                <th
                  onClick={() => handleSort("truck_number")}
                  className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[155px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Truck / Driver</span>
                    {sortField === "truck_number" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Invoice */}
              {visibleColumns.has("invoice") && (
                <th
                  onClick={() => handleSort("invoice_no")}
                  className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider min-w-[95px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice</span>
                    {sortField === "invoice_no" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Shipper */}
              {visibleColumns.has("shipper") && (
                <th
                  onClick={() => handleSort("shipper_name")}
                  className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[170px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Shipper</span>
                    {sortField === "shipper_name" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Consignee */}
              {visibleColumns.has("consignee") && (
                <th
                  onClick={() => handleSort("consignee_name")}
                  className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[170px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Consignee</span>
                    {sortField === "consignee_name" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Notify Party */}
              {visibleColumns.has("notify") && (
                <th
                  onClick={() => handleSort("notify_party")}
                  className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[150px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Notify Party</span>
                    {sortField === "notify_party" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Cargo Summary */}
              {visibleColumns.has("cargo") && (
                <th className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[210px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  Cargo Summary
                </th>
              )}

              {/* Route */}
              {visibleColumns.has("route") && (
                <th className={`px-2.5 font-extrabold text-slate-200 uppercase tracking-wider min-w-[170px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  Route & Border
                </th>
              )}

              {/* Packages */}
              {visibleColumns.has("packages") && (
                <th
                  onClick={() => handleSort("packages")}
                  className={`px-2.5 font-extrabold text-slate-200 text-right uppercase tracking-wider min-w-[110px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Packages</span>
                    {sortField === "packages" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Net Wt */}
              {visibleColumns.has("netWt") && (
                <th
                  onClick={() => handleSort("net_weight")}
                  className={`px-2 font-extrabold text-slate-200 text-right uppercase tracking-wider min-w-[105px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Wt</span>
                    {sortField === "net_weight" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Gross Wt */}
              {visibleColumns.has("grossWt") && (
                <th
                  onClick={() => handleSort("gross_weight")}
                  className={`px-2 font-extrabold text-slate-200 text-right uppercase tracking-wider min-w-[105px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Wt</span>
                    {sortField === "gross_weight" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Rate */}
              {visibleColumns.has("rate") && (
                <th className={`px-2 font-extrabold text-slate-200 text-right uppercase tracking-wider min-w-[95px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  Rate/KG
                </th>
              )}

              {/* Goods Value */}
              {visibleColumns.has("value") && (
                <th
                  onClick={() => handleSort("goods_value")}
                  className={`px-2.5 font-extrabold text-slate-200 text-right uppercase tracking-wider min-w-[135px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Goods Value</span>
                    {sortField === "goods_value" && (
                      sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Container */}
              {visibleColumns.has("container") && (
                <th className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider min-w-[130px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  Container
                </th>
              )}

              {/* Seal */}
              {visibleColumns.has("seal") && (
                <th className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider min-w-[100px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  Seal No.
                </th>
              )}

              {/* Status */}
              {visibleColumns.has("status") && (
                <th
                  onClick={() => handleSort("status")}
                  className={`px-2 font-extrabold text-slate-200 text-center uppercase tracking-wider min-w-[100px] cursor-pointer hover:text-white select-none ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}
                >
                  Status
                </th>
              )}

              {/* PDF */}
              {visibleColumns.has("pdf") && (
                <th className={`px-1.5 font-extrabold text-slate-300 text-center uppercase tracking-wider print:hidden no-print min-w-[70px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  PDF
                </th>
              )}

              {/* Actions */}
              {visibleColumns.has("actions") && (
                <th className={`px-2 font-extrabold text-slate-300 text-center uppercase tracking-wider print:hidden no-print min-w-[125px] ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {paginatedRows.map((doc, idx) => {
              const rowNum = pageSize === "all" ? idx + 1 : (currentPage - 1) * pageSize + idx + 1
              const isSelected = selectedDocIds.includes(doc.id)
              const isExpanded = expandedDocIds.has(doc.id)
              const cellPad = tableDensity === "compact" ? "py-2 px-2 text-[10.5px]" : "py-2.5 px-2.5 text-xs"

              const truckText = extractTruckNo(doc) || doc.truck_number || "—"
              const driverFatherName = extractDriverFatherName(doc)
              const borderStation = extractTransitBorderStation(doc)
              const invText = extractInvoiceNo(doc) || doc.invoice_no || (doc as any).invoice_number || "—"
              const routeInfo = extractBolRoute(doc)
              const syncedCargo = parseSyncedCargoItems(doc as unknown as Partial<BillOfLadingFormData>)
              const containerText = doc.container_numbers || (doc as any).container_number

              const isShipperRtl = isRtlText(doc.shipper_name)
              const isConsigneeRtl = isRtlText(doc.consignee_name)
              const notifyPartyText = (doc.notify_party_name || doc.notify_party || (doc as any).notifyParty || "").trim()
              const notifyAddressText = (doc.notify_party_address || (doc as any).notify_party_address || (doc as any).notifyPartyAddress || (doc as any).notifyAddress || "").trim()
              const isNotifyRtl = isRtlText(notifyPartyText)
              const isNotifySame = !notifyPartyText ||
                notifyPartyText.toUpperCase() === "SAME AS CONSIGNEE" ||
                notifyPartyText.toUpperCase() === "SAME" ||
                Boolean(doc.consignee_name && notifyPartyText.toUpperCase() === doc.consignee_name.trim().toUpperCase())

              // Comprehensive full cargo & multi-rate extraction
              const cargoData = extractBolCargoAndRates(doc)
              const isMultiCargo = cargoData.isMultiCargo

              return (
                <React.Fragment key={`${doc.id}-${idx}`}>
                  <tr
                    onDoubleClick={() => onOpenQuickView(doc)}
                    className={`transition-colors duration-150 group cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/70 ring-1 ring-inset ring-blue-300 dark:ring-blue-700"
                        : isExpanded
                        ? "bg-blue-50/40 dark:bg-blue-950/30"
                        : idx % 2 === 1
                        ? "bg-slate-50/60 dark:bg-slate-800/30 hover:bg-blue-50/60 dark:hover:bg-blue-950/40"
                        : "bg-white dark:bg-slate-900 hover:bg-blue-50/60 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    {/* Index + Select Checkbox */}
                    {visibleColumns.has("idx") && (
                      <td className={`${cellPad} font-bold text-slate-400 text-center tabular-nums sticky left-0 z-10 bg-inherit border-r border-slate-100 dark:border-slate-800`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              onToggleSelectId(doc.id)
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>{rowNum}</span>
                        </div>
                      </td>
                    )}

                    {/* Expand Toggle Chevron */}
                    {visibleColumns.has("expand") && (
                      <td
                        onClick={(e) => toggleRowExpanded(doc.id, e)}
                        className={`${cellPad} text-center sticky left-[40px] z-10 bg-inherit border-r border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900`}
                        title={isExpanded ? "Collapse Details" : "Expand Full Details"}
                      >
                        <button
                          type="button"
                          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-blue-600 transition-transform"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-blue-600" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    )}

                    {/* BOL Number (Sticky) */}
                    {visibleColumns.has("bolNo") && (
                      <td
                        onClick={() => onOpenQuickView(doc)}
                        className={`${cellPad} sticky left-[72px] z-10 bg-inherit shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200 dark:border-slate-800`}
                      >
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-[11px] bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 tracking-tight whitespace-nowrap hover:bg-blue-100 hover:text-blue-950 transition-colors"
                          title="Click to view details drawer"
                        >
                          {doc.bol_number || "BOL RECORD"}
                        </span>
                      </td>
                    )}

                    {/* Date */}
                    {visibleColumns.has("date") && (
                      <td className={`${cellPad} font-medium text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap`} title={doc.issue_date || doc.created_at}>
                        {formatDisplayDate(doc.issue_date || doc.created_at)}
                      </td>
                    )}

                    {/* Truck / Driver */}
                    {visibleColumns.has("truckDriver") && (
                      <td className={`${cellPad}`}>
                        <div className="flex flex-col min-w-0 space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]" dir="ltr">
                            {truckText}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                            {doc.driver_name && (
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={doc.driver_name}>
                                {doc.driver_name}
                              </span>
                            )}
                            {driverFatherName !== "-" && (
                              <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-sans" title={`Father: ${driverFatherName}`}>
                                (ولد {driverFatherName})
                              </span>
                            )}
                            {doc.driver_contact && (
                              <span className="font-mono text-slate-400 truncate" title={doc.driver_contact}>
                                • {doc.driver_contact}
                              </span>
                            )}
                          </div>
                          {(doc.driver_rent || (doc as any).driverFreight) && (
                            <span className="inline-flex items-center text-[9px] font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded px-1.5 py-0.2 w-fit whitespace-nowrap" title="Driver Rent / کرایه موتر">
                              {doc.driver_rent || (doc as any).driverFreight}
                            </span>
                          )}
                          {borderStation !== "-" && (
                            <span className="text-[9px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded px-1 w-fit whitespace-nowrap" title={`Transit Border: ${borderStation}`}>
                              📍 {borderStation.split(" ")[0]}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Invoice */}
                    {visibleColumns.has("invoice") && (
                      <td className={`${cellPad}`}>
                        {invText !== "—" && invText !== "NO" ? (
                          <div className="flex flex-col space-y-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold tracking-tight whitespace-nowrap w-fit">
                              {invText}
                            </span>
                            {(doc as any).invoice_date && (
                              <span className="text-[9.5px] text-slate-400 tabular-nums">
                                {(doc as any).invoice_date}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                        )}
                      </td>
                    )}

                    {/* Shipper */}
                    {visibleColumns.has("shipper") && (
                      <td
                        className={`${cellPad} font-semibold text-slate-900 dark:text-slate-100 whitespace-normal break-words ${isShipperRtl ? "text-right font-[vazirmatn]" : ""}`}
                        dir={isShipperRtl ? "rtl" : "ltr"}
                        title={(doc as any).shipper_address || doc.shipper_name || "Missing"}
                      >
                        <span className="hover:text-blue-600 transition-colors">
                          {doc.shipper_name || <span className="text-rose-500 italic font-normal">Missing</span>}
                        </span>
                      </td>
                    )}

                    {/* Consignee */}
                    {visibleColumns.has("consignee") && (
                      <td
                        className={`${cellPad} font-medium text-slate-800 dark:text-slate-200 whitespace-normal break-words ${isConsigneeRtl ? "text-right font-[vazirmatn]" : ""}`}
                        dir={isConsigneeRtl ? "rtl" : "ltr"}
                        title={(doc as any).consignee_address || doc.consignee_name || "Missing"}
                      >
                        <span className="hover:text-blue-600 transition-colors">
                          {doc.consignee_name || <span className="text-rose-500 italic font-normal">Missing</span>}
                        </span>
                      </td>
                    )}

                    {/* Notify Party */}
                    {visibleColumns.has("notify") && (
                      <td className={`${cellPad} text-slate-700 dark:text-slate-300 max-w-[170px]`}>
                        {isNotifySame ? (
                          <span className="text-slate-400 italic font-light text-xs" title="Same as Consignee">Same</span>
                        ) : (
                          <div
                            className="flex flex-col"
                            title={notifyAddressText ? `${notifyPartyText}\n${notifyAddressText}` : notifyPartyText}
                          >
                            <span
                              className={`font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors whitespace-normal break-words leading-tight ${isNotifyRtl ? "text-right font-[vazirmatn]" : ""}`}
                              dir={isNotifyRtl ? "rtl" : "ltr"}
                            >
                              {notifyPartyText}
                            </span>
                            {notifyAddressText && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={notifyAddressText}>
                                {notifyAddressText.split("\n")[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Cargo Summary */}
                    {visibleColumns.has("cargo") && (
                      <td className={`${cellPad} min-w-[220px]`}>
                        {cargoData.isMultiCargo ? (
                          <div className="flex flex-col space-y-1.5 py-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 font-black text-blue-900 dark:text-blue-200 bg-blue-100/90 dark:bg-blue-950/90 border border-blue-300 dark:border-blue-800 px-1.5 py-0.5 rounded text-[10px] w-fit shadow-2xs">
                                <Boxes className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                {cargoData.items.length} Cargo Items
                              </span>
                              {syncedCargo.totals.totalPackages > 0 && (
                                <span className="text-[9.5px] font-bold text-slate-400 tabular-nums">
                                  (Σ {syncedCargo.totals.totalPackages.toLocaleString()} {syncedCargo.totals.packageUnit})
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                              {cargoData.items.map((item, cIdx) => (
                                <div key={item.id || cIdx} className="pt-1 first:pt-0">
                                  <div className="flex items-start gap-1.5 text-[11px] leading-snug">
                                    <span className="w-3.5 h-3.5 rounded bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/80 dark:border-blue-800">
                                      {cIdx + 1}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 break-words" title={item.fullTitle}>
                                      {item.fullTitle}
                                    </span>
                                  </div>
                                  {(item.netWeight || item.rate) && (
                                    <div className="flex items-center gap-2 pl-5 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-wrap mt-0.5">
                                      {item.netWeight && (
                                        <span className="text-amber-700 dark:text-amber-400 font-semibold" title="Net Weight">
                                          ⚖️ {item.netWeight}
                                        </span>
                                      )}
                                      {item.rate && (
                                        <span className="text-blue-700 dark:text-blue-300 font-bold" title="Item Rate">
                                          @ {item.rate}
                                        </span>
                                      )}
                                      {item.goodsValue && (
                                        <span className="text-emerald-700 dark:text-emerald-400 font-medium" title="Item Goods Value">
                                          💵 {item.goodsValue}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-0.5 min-w-[180px]">
                            <span className="font-bold text-slate-900 dark:text-white break-words text-[11.5px]" title={cargoData.singleCommodityTitle}>
                              {cargoData.singleCommodityTitle}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono flex-wrap">
                              {cargoData.items[0]?.packageText && (
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  📦 {cargoData.items[0].packageText}
                                </span>
                              )}
                              {cargoData.items[0]?.netWeight && (
                                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                  • ⚖️ {cargoData.items[0].netWeight}
                                </span>
                              )}
                              {cargoData.items[0]?.rate && (
                                <span className="text-blue-600 dark:text-blue-400 font-bold">
                                  • @ {cargoData.items[0].rate}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Route & Border */}
                    {visibleColumns.has("route") && (
                      <td className={`${cellPad}`} title={routeInfo.display}>
                        {routeInfo.display !== "—" ? (
                          <div className="flex flex-col min-w-0 space-y-0.5">
                            <div className="inline-flex items-start gap-1 font-semibold text-slate-800 dark:text-slate-200">
                              <Compass className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                              <span className="truncate max-w-[150px]" dir={routeInfo.isPersian ? "rtl" : "ltr"}>
                                {routeInfo.shortDisplay || routeInfo.display}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {routeInfo.borderCrossing && (
                                <span className="inline-flex items-center text-[8.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 rounded px-1 py-0.2 whitespace-nowrap">
                                  {routeInfo.borderCrossing.split(" ")[0]}
                                </span>
                              )}
                              {routeInfo.isFullReefer ? (
                                <span className="inline-flex items-center text-[8px] font-black text-cyan-800 dark:text-cyan-200 bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 rounded px-1 py-0.2 whitespace-nowrap">
                                  ❄️ Full Reefer
                                </span>
                              ) : routeInfo.hasReefer ? (
                                <span className="inline-flex items-center text-[8px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 rounded px-1 py-0.2 whitespace-nowrap">
                                  ❄️ Reefer
                                </span>
                              ) : null}
                              {routeInfo.hasSwitchBl && (
                                <span className="inline-flex items-center text-[8px] font-black text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 border border-purple-300 rounded px-1 py-0.2 whitespace-nowrap">
                                  🔄 Switch BL
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                        )}
                      </td>
                    )}

                    {/* Packages */}
                    {visibleColumns.has("packages") && (
                      <td className={`${cellPad} font-bold tabular-nums text-right text-slate-800 dark:text-slate-200`}>
                        {isMultiCargo ? (
                          <span className="text-blue-900 dark:text-blue-300 font-black">
                            Σ {syncedCargo.totals.totalPackages.toLocaleString()} {syncedCargo.totals.packageUnit}
                          </span>
                        ) : (
                          <span>{doc.number_of_packages || "—"}</span>
                        )}
                      </td>
                    )}

                    {/* Net Wt */}
                    {visibleColumns.has("netWt") && (
                      <td className={`${cellPad} font-bold tabular-nums text-right text-amber-700 dark:text-amber-400`}>
                        {isMultiCargo ? (
                          <span>Σ {syncedCargo.totals.totalNetWeight.toLocaleString()} KG</span>
                        ) : (
                          <span>{doc.net_weight || "—"}</span>
                        )}
                      </td>
                    )}

                    {/* Gross Wt */}
                    {visibleColumns.has("grossWt") && (
                      <td className={`${cellPad} font-semibold tabular-nums text-right text-slate-700 dark:text-slate-300`}>
                        {isMultiCargo ? (
                          <span className="text-slate-900 dark:text-white font-bold">
                            Σ {syncedCargo.totals.totalGrossWeight.toLocaleString()} KG
                          </span>
                        ) : (
                          <span>{doc.gross_weight || "—"}</span>
                        )}
                      </td>
                    )}

                    {/* Rate */}
                    {visibleColumns.has("rate") && (
                      <td className={`${cellPad} font-semibold tabular-nums text-right text-blue-700 dark:text-blue-300 whitespace-nowrap min-w-[110px]`}>
                        {cargoData.isMultiRate ? (
                          <div className="flex flex-col items-end space-y-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-900 dark:text-blue-200 bg-blue-100/90 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 rounded px-1.5 py-0.2 mb-0.5 shadow-2xs">
                              {cargoData.allRates.length} Rates
                            </span>
                            <div className="space-y-0.5 w-full">
                              {cargoData.items.map((item, rIdx) => {
                                if (!item.rate) return null
                                return (
                                  <div
                                    key={rIdx}
                                    className="flex items-center justify-end gap-1.5 font-mono text-[11px]"
                                    title={`${item.fullTitle}: ${item.rate}`}
                                  >
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-sans">
                                      #{rIdx + 1}:
                                    </span>
                                    <span className="font-black text-blue-800 dark:text-blue-300">
                                      {item.rate}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : cargoData.isUniformRate ? (
                          <div className="flex flex-col items-end space-y-0.5">
                            <span className="font-black text-blue-800 dark:text-blue-300 text-[11px]">
                              {cargoData.allRates[0]}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                              (All {cargoData.items.length} Items)
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cargoData.displayRate || doc.rate_per_kgs || (doc as any).rate_per_kg || "—"}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Goods Value */}
                    {visibleColumns.has("value") && (
                      <td className={`${cellPad} font-extrabold tabular-nums text-right text-emerald-700 dark:text-emerald-400`}>
                        {isMultiCargo ? (
                          <span className="font-black text-emerald-800 dark:text-emerald-300">
                            Σ ${(syncedCargo.totals.totalGoodsValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span>{doc.goods_value || "—"}</span>
                        )}
                      </td>
                    )}

                    {/* Container */}
                    {visibleColumns.has("container") && (
                      <td className={`${cellPad} font-mono text-[11px]`}>
                        {containerText ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.2 whitespace-nowrap">
                            🏷️ {containerText}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                        )}
                      </td>
                    )}

                    {/* Seal */}
                    {visibleColumns.has("seal") && (
                      <td className={`${cellPad} font-mono text-slate-700 dark:text-slate-300`}>
                        {doc.seal_numbers || "—"}
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.has("status") && (
                      <td className={`${cellPad} text-center`}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                          doc.pdf_url
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        }`}>
                          {doc.pdf_url ? "PDF READY" : "SAVED"}
                        </span>
                      </td>
                    )}

                    {/* PDF Action */}
                    {visibleColumns.has("pdf") && (
                      <td className={`${cellPad} text-center print:hidden no-print`}>
                        {doc.pdf_url ? (
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                            title="Open / Download Attached PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" title="No PDF Attached" />
                        )}
                      </td>
                    )}

                    {/* Actions Column */}
                    {visibleColumns.has("actions") && (
                      <td className={`${cellPad} text-center print:hidden no-print`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenQuickView(doc)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                            title="Open Quick View Drawer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {onEditBol && (
                            <button
                              type="button"
                              onClick={() => onEditBol(doc.id)}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                              title="Edit in BOL Editor"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenPreview && (
                            <button
                              type="button"
                              onClick={() => onOpenPreview(doc.id)}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                              title="Open A4 Print Preview"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expandable Inline Row */}
                  {isExpanded && (
                    <BolExpandedRow
                      doc={doc}
                      visibleColSpan={visibleColsCount}
                      onEditBol={onEditBol}
                      onOpenPreview={onOpenPreview}
                      onClose={() => toggleRowExpanded(doc.id)}
                    />
                  )}
                </React.Fragment>
              )
            })}

            {paginatedRows.length === 0 && (
              <tr key="empty-bols">
                <td colSpan={visibleColsCount} className="py-12 text-center text-slate-500 font-semibold text-sm">
                  No Saved BOL records match the selected filters or quick chips.
                </td>
              </tr>
            )}
          </tbody>

          {/* TABLE FOOTER WITH SUB-TOTALS */}
          {sortedData.length > 0 && (
            <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-bold print:static print:table-footer-group shadow-lg border-t-2 border-blue-500 text-xs">
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="py-2.5 px-3 font-black text-white text-[11px] uppercase tracking-wider">
                  Page Subtotal ({paginatedRows.length} BOLs):
                </td>
                <td colSpan={visibleColsCount - 7} className="text-right text-slate-400 text-[10.5px]">
                  Showing {paginatedRows.length} of {sortedData.length} records
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white whitespace-nowrap">
                  {pageSubtotals.pkgs.toLocaleString()} CTNS
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-amber-300 whitespace-nowrap">
                  {pageSubtotals.net.toLocaleString()} KG
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-slate-200 whitespace-nowrap">
                  {pageSubtotals.gross.toLocaleString()} KG
                </td>
                <td className="py-2.5 px-1 text-right text-slate-500">—</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-extrabold text-emerald-400 whitespace-nowrap">
                  ${pageSubtotals.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={3} className="print:hidden no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 4. PAGINATION FOOTER */}
      {pageSize !== "all" && totalPages > 1 && (
        <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 pt-1" data-no-print="true">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} BOLs
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setCurrentPage(1)
                })
              }}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs rounded-lg"
            >
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setCurrentPage((p) => Math.max(1, p - 1))
                })
              }}
              disabled={currentPage === 1}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              Prev
            </Button>
            <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                })
              }}
              disabled={currentPage === totalPages}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setCurrentPage(totalPages)
                })
              }}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs rounded-lg"
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
