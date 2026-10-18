"use client"

import React, { useMemo, useState, useRef, useEffect, useCallback, startTransition } from "react"
import {
  SavedDocument,
  ReportTab,
  ComparisonMode,
  ReportFilterCriteria,
  SavedFilterPreset,
  SavedReportPreset,
  ReportHistoryEntry,
  ContainerRecord,
  RouteSummary,
  TruckSummary,
  ShipperSummary,
  ConsigneeSummary,
  CommoditySummary,
  DestinationSummary,
  MonthlySummary,
  FinancialBreakdown,
} from "@/lib/reports/types"
import {
  calculateOverviewKpis,
  calculatePeriodComparison,
  applyReportFilters,
} from "@/lib/reports/calculations"
import {
  groupShippers,
  groupConsignees,
  groupCommodities,
  groupDestinations,
  groupContainers,
  groupMonthly,
  calculateFinancialMetrics,
  groupRoutes,
  groupTrucks,
} from "@/lib/reports/grouping"
import {
  auditDataQuality,
  detectPossibleDuplicates,
} from "@/lib/reports/data-quality"
import { exportReportToExcel, extractTransitBorderStation, extractDriverFatherName } from "@/lib/reports/export-excel"
import {
  getSavedFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
  getSavedReportPresets,
  saveReportPreset,
  deleteReportPreset,
  getReportHistory,
  addReportHistoryEntry,
  getDefaultReportPreset,
  setDefaultReportPreset,
} from "@/lib/reports/history-storage"
import {
  formatDisplayDate,
  isRtlText,
  extractInvoiceNo,
  extractTruckNo,
  extractBolRoute,
  extractCleanCommodity,
  parseWeight,
  parsePackages,
  parseMoney,
  normalizeDate,
} from "@/lib/reports/parsers"
import { parseSyncedCargoItems, splitMultiCargoItems } from "@/lib/utils/cargo-grid"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import { OperationsReportTab } from "./operations-report-tab"
import { OperationsPeriodType } from "@/lib/reports/types"
import { ReportCharts } from "./report-charts"
import { BolQuickView } from "./bol-quick-view"
import { DetailedReportTable } from "./detailed-report-table"
import { AdvancedFiltersDrawer } from "./advanced-filters"
import { ReportDataTable, ReportColumnDef, SummaryMetricPill } from "./report-data-table"
import { ReportDetailDrawer, DrawerKpiItem, DrawerBreakdownSection } from "./report-detail-drawer"
import { buildManagementSummary } from "@/lib/whatsapp/bulk-message"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import { Button } from "@/components/ui/button"
import { AQ_COMPANIES_LOGO_SRC } from "@/lib/reports/report-logo"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Printer,
  FileDown,
  FileSpreadsheet,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Truck,
  Building2,
  Users,
  Compass,
  Calendar,
  DollarSign,
  Layers,
  FileText,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Eye,
  Check,
  Bookmark,
  History,
  FileCheck,
  Maximize2,
  Minimize2,
  MessageSquare,
  Download,
  ChevronDown,
  Loader2,
  Navigation,
  Scale,
  Star,
  X,
  Trash2,
  Tag,
  MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"

interface SavedBolReportProps {
  documents: SavedDocument[]
  filteredDocuments: SavedDocument[]
  onClose: () => void
  selectedDocIds: string[]
  onLoadDocument?: (id: string, targetTab?: string) => void
  initialTab?: ReportTab
  initialPeriod?: OperationsPeriodType
}


function formatCompactDate(val: unknown): string {
  if (!val) return "-"
  const d = new Date(val as string)
  if (isNaN(d.getTime())) return String(val).slice(0, 10)
  const day = String(d.getUTCDate()).padStart(2, "0")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = months[d.getUTCMonth()]
  const yr = String(d.getUTCFullYear()).slice(-2)
  return `${day}-${month}-${yr}`
}

function formatDisplayBolNo(bolNumber?: string | null): { display: string; full: string } {
  if (!bolNumber) return { display: "-", full: "-" }
  const full = bolNumber.trim()
  const clean = full.replace(/^BOL-/i, "")
  return { display: clean, full }
}

function extractCargoItemList(doc: any): string[] {
  if (Array.isArray(doc.cargo_items) && doc.cargo_items.length > 0) {
    return doc.cargo_items
      .map((it: any) => (typeof it === "string" ? it : it.description || it.commodity || ""))
      .filter(Boolean)
  }
  const raw = doc.goods_description || doc.cargo_description || doc.description_of_goods || ""
  if (!raw.trim()) {
    const pkgParts = splitMultiCargoItems(doc.number_of_packages)
    if (pkgParts.length > 0) return pkgParts
    return []
  }

  const lines = raw
    .split(/\r?\n|•|\u2022|\*|(?<=\w);|\|/)
    .map((l: string) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter((l: string) => {
      if (l.length < 2) return false
      if (/^📦?\s*(?:CONTAINER|CARGO|PARTICULARS|DOCUMENT|SHIPPING|DETAILS)/i.test(l)) return false
      if (/^Transit Date/i.test(l)) return false
      if (/^HS Code/i.test(l)) return false
      if (/^INV-?\d+/i.test(l)) return false
      if (/^Invoice\s*(?:NO)?:/i.test(l)) return false
      return true
    })
    .map((l: string) => {
      let cleaned = l.replace(/^Description:\s*/i, "").trim()
      if (cleaned.includes("│")) {
        const parts = cleaned.split("│").map((p) => p.trim()).filter((p) => !/invoice|inv-|transit date|hs code/i.test(p))
        cleaned = parts.join(" │ ")
      }
      return cleaned
    })
    .filter(Boolean)

  if (lines.length > 0) return lines

  const pkgParts = splitMultiCargoItems(doc.number_of_packages)
  if (pkgParts.length > 0) return pkgParts

  return raw.trim() ? [raw.trim()] : []
}

function getMissingFieldCategory(field: string): "Shipper" | "Consignee" | "Route" | "Truck" | "Weight" | "Other" {
  const f = field.toLowerCase()
  if (f.includes("shipper")) return "Shipper"
  if (f.includes("consignee") || f.includes("notify")) return "Consignee"
  if (f.includes("port") || f.includes("delivery") || f.includes("route")) return "Route"
  if (f.includes("truck") || f.includes("driver") || f.includes("plate") || f.includes("container")) return "Truck"
  if (f.includes("weight") || f.includes("package") || f.includes("cargo") || f.includes("goods") || f.includes("carton")) return "Weight"
  return "Other"
}

export function SavedBolReport({
  documents,
  filteredDocuments,
  onClose,
  selectedDocIds,
  onLoadDocument,
  initialTab = "overview",
  initialPeriod = "today",
}: SavedBolReportProps) {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab)
  const handleSwitchTab = useCallback((targetTab: ReportTab) => {
    startTransition(() => {
      setActiveTab(targetTab)
    })
  }, [])
  const [expandedCargoIds, setExpandedCargoIds] = useState<Set<string>>(new Set())
  const toggleCargoExpanded = (id: string) => {
    setExpandedCargoIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  type QuickDate = "all" | "today" | "yesterday" | "7days" | "30days" | "this_month" | "last_month" | "this_year"
  const [quickDate, setQuickDate] = useState<QuickDate>("all")
  const [drillDownEntity, setDrillDownEntity] = useState<{
    type: "shipper" | "consignee" | "commodity" | "destination" | "route" | "truck" | "missing_field" | "container" | "month"
    name: string
  } | null>(null)

  // Drill-down Detail Drawer State
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean
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
    matchingCount?: number
  }>({
    isOpen: false,
    entityType: "shipper",
    entityName: "",
    kpis: [],
  })

  // Quick View Drawer State
  const [quickViewDoc, setQuickViewDoc] = useState<SavedDocument | null>(null)

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState<ReportFilterCriteria>({})
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  // Comparison State
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("off")

  // Monthly Year Filter
  const [monthlyYear, setMonthlyYear] = useState<number | "all">(new Date().getFullYear())

  // Pagination State
  const [pageSize, setPageSize] = useState<number | "all">(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedDocIds)

  // Print & PDF Options
  const [includeCover, setIncludeCover] = useState(false)
  const [includeCharts, setIncludeCharts] = useState(true)
  const [pdfOrientation, setPdfOrientation] = useState<"landscape" | "portrait">("landscape")
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isFitScreen, setIsFitScreen] = useState(false)
  const [tableDensity, setTableDensity] = useState<"compact" | "normal">("compact")
  const [reportCompanyName, setReportCompanyName] = useState<string>("AQ COMPANIES")
  const reportRef = useRef<HTMLDivElement>(null)

  // Preset & History Storage
  const [savedFilters, setSavedFilters] = useState<SavedFilterPreset[]>([])
  const [savedReportPresets, setSavedReportPresets] = useState<SavedReportPreset[]>([])
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([])

  useEffect(() => {
    setSavedFilters(getSavedFilterPresets())
    const presets = getSavedReportPresets()
    setSavedReportPresets(presets)
    setReportHistory(getReportHistory())

    // If an initialTab was not provided or was default "overview", check if user has a default view
    if (!initialTab || initialTab === "overview") {
      const defPreset = getDefaultReportPreset()
      if (defPreset) {
        if (defPreset.reportType) setActiveTab(defPreset.reportType)
        if (defPreset.filters) setAdvancedFilters(defPreset.filters)
        if (defPreset.densityMode) setTableDensity(defPreset.densityMode)
        if (defPreset.orientation) setPdfOrientation(defPreset.orientation === "portrait" ? "portrait" : "landscape")
      }
    }
  }, [initialTab])

  const defaultPreset = useMemo(() => {
    return savedReportPresets.find((p) => p.isDefault) || null
  }, [savedReportPresets])

  const handleSetDefaultPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDefaultReportPreset(id)
    setSavedReportPresets(getSavedReportPresets())
    toast.success("Set as default Report Center view")
  }

  // Full Dataset State: Ensure reports always display the entire database of BOLs
  const [fullDataset, setFullDataset] = useState<SavedDocument[] | null>(null)
  const [isLoadingFullDataset, setIsLoadingFullDataset] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadAllBols = async () => {
      try {
        setIsLoadingFullDataset(true)
        const res = await fetch("/api/bol?all=true")
        if (res.ok) {
          const json = await res.json()
          if (isMounted && json?.data && Array.isArray(json.data) && json.data.length > 0) {
            setFullDataset(json.data)
          }
        }
      } catch (err) {
        console.warn("[SavedBolReport] Failed to fetch full BOL dataset:", err)
      } finally {
        if (isMounted) setIsLoadingFullDataset(false)
      }
    }
    void loadAllBols()
    return () => {
      isMounted = false
    }
  }, [])

  // 1. Resolve Active Dataset based on full fetched dataset or passed documents
  const baseData = useMemo(() => {
    if (fullDataset && fullDataset.length > 0) {
      return fullDataset
    }
    return documents
  }, [fullDataset, documents])

  // Extract unique options for quick dropdown filters
  const filterOptions = useMemo(() => {
    const shippers = new Set<string>()
    const consignees = new Set<string>()
    const commodities = new Set<string>()
    const destinations = new Set<string>()
    const routes = new Set<string>()

    for (const d of baseData) {
      if (d.shipper_name?.trim()) shippers.add(d.shipper_name.trim())
      if (d.consignee_name?.trim()) consignees.add(d.consignee_name.trim())
      const comm = extractCleanCommodity(d.cargo_description || d.goods_description)
      if (comm && comm !== "General Cargo") commodities.add(comm)
      const rInfo = extractBolRoute(d)
      if (rInfo.destination && rInfo.destination !== "—") destinations.add(rInfo.destination)
      if (rInfo.shortDisplay && rInfo.shortDisplay !== "—") routes.add(rInfo.shortDisplay)
    }

    return {
      shippers: Array.from(shippers).sort(),
      consignees: Array.from(consignees).sort(),
      commodities: Array.from(commodities).sort(),
      destinations: Array.from(destinations).sort(),
      routes: Array.from(routes).sort(),
    }
  }, [baseData])

  const filteredData = useMemo(() => {
    const combinedCriteria: ReportFilterCriteria = {
      ...advancedFilters,
      searchQuery,
    }

    let result = applyReportFilters(baseData, combinedCriteria)

    // Apply interactive drill-down filter if active
    if (drillDownEntity) {
      if (drillDownEntity.type === "shipper") {
        result = result.filter(
          (d) => ((d.shipper_name || "").trim() || "Unspecified Shipper").toLowerCase() === drillDownEntity.name.trim().toLowerCase()
        )
      } else if (drillDownEntity.type === "consignee") {
        result = result.filter(
          (d) => ((d.consignee_name || "").trim() || "Unspecified Consignee").toLowerCase() === drillDownEntity.name.trim().toLowerCase()
        )
      } else if (drillDownEntity.type === "commodity") {
        result = result.filter((d) => {
          const desc = (
            (d.cargo_description || "") +
            " " +
            (d.goods_description || "")
          ).toLowerCase()
          return desc.includes(drillDownEntity.name.toLowerCase())
        })
      } else if (drillDownEntity.type === "destination") {
        result = result.filter((d) => {
          const dest = (
            (d.port_of_discharge || "") +
            " " +
            (d.place_of_delivery || "")
          ).toLowerCase()
          return dest.includes(drillDownEntity.name.toLowerCase())
        })
      } else if (drillDownEntity.type === "route") {
        result = result.filter((d) => {
          const rInfo = extractBolRoute(d)
          const text = (rInfo.display + " " + rInfo.shortDisplay + " " + (d.cargo_route_note || "")).toLowerCase()
          return text.includes(drillDownEntity.name.toLowerCase())
        })
      } else if (drillDownEntity.type === "truck") {
        result = result.filter((d) => {
          const tText = (d.truck_number + " " + extractTruckNo(d)).toLowerCase()
          return tText.includes(drillDownEntity.name.toLowerCase())
        })
      } else if (drillDownEntity.type === "container") {
        result = result.filter((d) =>
          (d.container_numbers || "").toUpperCase().includes(drillDownEntity.name.toUpperCase())
        )
      } else if (drillDownEntity.type === "month") {
        result = result.filter((d) => {
          const dt = normalizeDate(d.issue_date || d.created_at)
          if (!dt) return false
          const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
          const mLabel = dt.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          return mKey === drillDownEntity.name || mLabel.toLowerCase() === drillDownEntity.name.toLowerCase()
        })
      } else if (drillDownEntity.type === "missing_field") {
        if (drillDownEntity.name === "container") {
          result = result.filter((d) => !d.container_numbers || !d.container_numbers.trim())
        } else if (drillDownEntity.name === "invoice") {
          result = result.filter((d) => !d.invoice_no && !d.invoice_number)
        } else if (drillDownEntity.name === "truck") {
          result = result.filter((d) => (!d.truck_number || !d.truck_number.trim()) && !extractTruckNo(d))
        } else if (drillDownEntity.name === "driver") {
          result = result.filter((d) => !d.driver_name || !d.driver_name.trim())
        } else if (drillDownEntity.name === "pdf") {
          result = result.filter((d) => !d.pdf_url)
        }
      }
    }

    return result
  }, [baseData, advancedFilters, searchQuery, drillDownEntity])

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count++
    if (advancedFilters.dateFrom || advancedFilters.dateTo) count++
    if (advancedFilters.shipper) count++
    if (advancedFilters.consignee) count++
    if (advancedFilters.commodity) count++
    if (advancedFilters.destination) count++
    if (advancedFilters.route) count++
    if (advancedFilters.truckNumber) count++
    if (advancedFilters.containerType && advancedFilters.containerType !== "all") count++
    if (advancedFilters.shipmentType && advancedFilters.shipmentType !== "all") count++
    if (advancedFilters.hasPdf && advancedFilters.hasPdf !== "all") count++
    if (advancedFilters.missingData && advancedFilters.missingData !== "all") count++
    if (drillDownEntity) count++
    return count
  }, [searchQuery, advancedFilters, drillDownEntity])

  const handleQuickDateSelect = (opt: QuickDate) => {
    startTransition(() => {
      setQuickDate(opt)
      if (opt === "all") {
        setAdvancedFilters((prev) => {
          const next = { ...prev }
          delete next.dateFrom
          delete next.dateTo
          return next
        })
        return
      }
      const now = new Date()
      const todayStr = now.toISOString().split("T")[0]

      let from = ""
      let to = todayStr

      if (opt === "today") {
        from = todayStr
        to = todayStr
      } else if (opt === "yesterday") {
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        from = y.toISOString().split("T")[0]
        to = from
      } else if (opt === "7days") {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        from = d.toISOString().split("T")[0]
      } else if (opt === "30days") {
        const d = new Date(now)
        d.setDate(d.getDate() - 30)
        from = d.toISOString().split("T")[0]
      } else if (opt === "this_month") {
        const d = new Date(now.getFullYear(), now.getMonth(), 1)
        from = d.toISOString().split("T")[0]
      } else if (opt === "last_month") {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const last = new Date(now.getFullYear(), now.getMonth(), 0)
        from = first.toISOString().split("T")[0]
        to = last.toISOString().split("T")[0]
      } else if (opt === "this_year") {
        const d = new Date(now.getFullYear(), 0, 1)
        from = d.toISOString().split("T")[0]
      }

      setAdvancedFilters((prev) => ({
        ...prev,
        dateFrom: from,
        dateTo: to,
      }))
    })
  }

  const handleClearAllFilters = () => {
    setSearchQuery("")
    setAdvancedFilters({})
    setDrillDownEntity(null)
    setQuickDate("all")
    toast.info("All filters cleared")
  }

  // Data to display in detailed tables / exports (honors manual row selections if any)
  const activeReportData = useMemo(() => {
    if (selectedIds.length > 0) {
      return filteredData.filter((d) => selectedIds.includes(d.id))
    }
    return filteredData
  }, [filteredData, selectedIds])

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    if (pageSize === "all") return activeReportData
    const start = (currentPage - 1) * pageSize
    return activeReportData.slice(start, start + pageSize)
  }, [activeReportData, currentPage, pageSize])

  const totalPages = pageSize === "all" ? 1 : Math.ceil(activeReportData.length / pageSize)

  // 2. Shared Calculation Engine Outputs (Lazy loaded and cached per filter revision)
  const overviewKpis = useMemo(() => {
    return calculateOverviewKpis(filteredData)
  }, [filteredData])

  const periodComparison = useMemo(() => {
    if (activeTab !== "overview" && activeTab !== "operations") return null
    return calculatePeriodComparison(filteredData, baseData, comparisonMode)
  }, [filteredData, baseData, comparisonMode, activeTab])

  // In-memory tab cache to avoid recomputing data when switching back and forth
  const reportDataCacheRef = useRef<Map<string, any>>(new Map())
  const lastFilterHashRef = useRef<string>("")

  const filterHash = useMemo(() => {
    return `${filteredData.length}:${searchQuery}:${JSON.stringify(advancedFilters)}:${drillDownEntity?.name || ""}`
  }, [filteredData.length, searchQuery, advancedFilters, drillDownEntity])

  if (lastFilterHashRef.current !== filterHash) {
    lastFilterHashRef.current = filterHash
    reportDataCacheRef.current.clear()
  }

  const shippersList = useMemo(() => {
    if (activeTab !== "shippers" && activeTab !== "operations" && activeTab !== "overview") {
      return (reportDataCacheRef.current.get("shippers") as ShipperSummary[]) || []
    }
    if (reportDataCacheRef.current.has("shippers")) {
      return reportDataCacheRef.current.get("shippers") as ShipperSummary[]
    }
    const result = groupShippers(filteredData)
    reportDataCacheRef.current.set("shippers", result)
    return result
  }, [filteredData, activeTab])

  const consigneesList = useMemo(() => {
    if (activeTab !== "consignees" && activeTab !== "operations" && activeTab !== "overview") {
      return (reportDataCacheRef.current.get("consignees") as ConsigneeSummary[]) || []
    }
    if (reportDataCacheRef.current.has("consignees")) {
      return reportDataCacheRef.current.get("consignees") as ConsigneeSummary[]
    }
    const result = groupConsignees(filteredData)
    reportDataCacheRef.current.set("consignees", result)
    return result
  }, [filteredData, activeTab])

  const commoditiesList = useMemo(() => {
    if (activeTab !== "commodities" && activeTab !== "operations" && activeTab !== "overview") {
      return (reportDataCacheRef.current.get("commodities") as CommoditySummary[]) || []
    }
    if (reportDataCacheRef.current.has("commodities")) {
      return reportDataCacheRef.current.get("commodities") as CommoditySummary[]
    }
    const result = groupCommodities(filteredData)
    reportDataCacheRef.current.set("commodities", result)
    return result
  }, [filteredData, activeTab])

  const destinationsList = useMemo(() => {
    if (activeTab !== "destinations" && activeTab !== "operations" && activeTab !== "overview") {
      return (reportDataCacheRef.current.get("destinations") as DestinationSummary[]) || []
    }
    if (reportDataCacheRef.current.has("destinations")) {
      return reportDataCacheRef.current.get("destinations") as DestinationSummary[]
    }
    const result = groupDestinations(filteredData)
    reportDataCacheRef.current.set("destinations", result)
    return result
  }, [filteredData, activeTab])

  const routesList = useMemo(() => {
    if (activeTab !== "routes" && activeTab !== "operations" && activeTab !== "overview") {
      return (reportDataCacheRef.current.get("routes") as RouteSummary[]) || []
    }
    if (reportDataCacheRef.current.has("routes")) {
      return reportDataCacheRef.current.get("routes") as RouteSummary[]
    }
    const result = groupRoutes(filteredData)
    reportDataCacheRef.current.set("routes", result)
    return result
  }, [filteredData, activeTab])

  const trucksList = useMemo(() => {
    if (activeTab !== "trucks" && activeTab !== "operations" && activeTab !== "overview") {
      return (reportDataCacheRef.current.get("trucks") as TruckSummary[]) || []
    }
    if (reportDataCacheRef.current.has("trucks")) {
      return reportDataCacheRef.current.get("trucks") as TruckSummary[]
    }
    const result = groupTrucks(filteredData)
    reportDataCacheRef.current.set("trucks", result)
    return result
  }, [filteredData, activeTab])

  // Driver Freight / Rent Disbursement Summary
  const driverRentSummary = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {}
    for (const doc of filteredData) {
      const raw = doc.driver_rent || (doc as any).driverFreight || (doc as any).driverRent || ""
      if (raw) {
        const { amount, currency } = parseMoney(raw)
        if (amount > 0) {
          if (!totals[currency]) totals[currency] = { amount: 0, count: 0 }
          totals[currency].amount += amount
          totals[currency].count += 1
        }
      }
    }
    return totals
  }, [filteredData])

  // Border Crossings & Transit Station Summary
  const borderStationsSummary = useMemo(() => {
    const counts: Record<string, { bols: number; packages: number; netWeight: number }> = {}
    for (const doc of filteredData) {
      const station = extractTransitBorderStation(doc)
      if (!counts[station]) counts[station] = { bols: 0, packages: 0, netWeight: 0 }
      counts[station].bols += 1
      counts[station].packages += parsePackages(doc.number_of_packages)
      counts[station].netWeight += parseWeight(doc.net_weight)
    }
    return Object.entries(counts)
      .filter(([st]) => st !== "-")
      .sort((a, b) => b[1].bols - a[1].bols)
  }, [filteredData])

  const { containers: containerList, stats: containerStats } = useMemo(() => {
    if (activeTab !== "containers") {
      return (
        reportDataCacheRef.current.get("containers") || {
          containers: [] as ContainerRecord[],
          stats: {
            total: 0,
            dry: 0,
            reefer: 0,
            twentyFt: 0,
            fortyFt: 0,
            fortyHc: 0,
            fortyRf: 0,
            other: 0,
          },
        }
      )
    }
    if (reportDataCacheRef.current.has("containers")) {
      return reportDataCacheRef.current.get("containers")
    }
    const result = groupContainers(filteredData)
    reportDataCacheRef.current.set("containers", result)
    return result
  }, [filteredData, activeTab])

  const monthlySummaries = useMemo(() => {
    const key = `monthly:${monthlyYear}`
    if (activeTab !== "monthly") {
      return (reportDataCacheRef.current.get(key) as any[]) || []
    }
    if (reportDataCacheRef.current.has(key)) {
      return reportDataCacheRef.current.get(key) as any[]
    }
    const result = groupMonthly(filteredData, monthlyYear)
    reportDataCacheRef.current.set(key, result)
    return result
  }, [filteredData, monthlyYear, activeTab])

  const financialMetrics: FinancialBreakdown = useMemo(() => {
    if (activeTab !== "financial") {
      return (
        (reportDataCacheRef.current.get("financial") as FinancialBreakdown) || {
          currencyTotals: {},
          averageValuePerBol: {},
          highestValue: null,
          lowestValue: null,
          byShipper: [],
          byCommodity: [],
          byDestination: [],
          byMonth: [],
        }
      )
    }
    if (reportDataCacheRef.current.has("financial")) {
      return reportDataCacheRef.current.get("financial") as FinancialBreakdown
    }
    const result = calculateFinancialMetrics(filteredData)
    reportDataCacheRef.current.set("financial", result)
    return result
  }, [filteredData, activeTab])

  const dataQualityAudit = useMemo(() => auditDataQuality(filteredData), [filteredData])

  const possibleDuplicates = useMemo(() => {
    if (activeTab !== "missing_data") return []
    return detectPossibleDuplicates(filteredData)
  }, [filteredData, activeTab])

  // Drill-down Detail Drawer Handlers
  const openDetailDrawerForEntity = useCallback(
    (
      type: "shipper" | "consignee" | "commodity" | "destination" | "route" | "truck" | "container" | "month",
      name: string
    ) => {
      let matching: SavedDocument[] = []
      let kpis: DrawerKpiItem[] = []
      let breakdowns: DrawerBreakdownSection[] = []

      if (type === "shipper") {
        matching = filteredData.filter(
          (d) => (d.shipper_name || "").trim().toLowerCase() === name.toLowerCase()
        )
        const totalPkgs = matching.reduce((sum, d) => sum + parsePackages(d.number_of_packages), 0)
        const totalNet =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.net_weight), 0) * 100) / 100
        const totalGross =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.gross_weight), 0) * 100) / 100
        const usdVal = matching.reduce((sum, d) => {
          const { amount, currency } = parseMoney(d.goods_value)
          return currency === "USD" ? sum + amount : sum
        }, 0)

        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Total Packages", value: totalPkgs.toLocaleString(), color: "slate" },
          { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
          { label: "Gross Weight", value: `${totalGross.toLocaleString()} KG`, color: "slate" },
          {
            label: "Goods Value (USD)",
            value: `$${usdVal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "emerald",
          },
        ]

        const consMap = new Map<string, number>()
        const commMap = new Map<string, number>()
        matching.forEach((d) => {
          if (d.consignee_name) {
            consMap.set(d.consignee_name.trim(), (consMap.get(d.consignee_name.trim()) || 0) + 1)
          }
          const c = extractCleanCommodity(d.cargo_description || d.goods_description || d.commodity)
          if (c && c !== "General Cargo") {
            commMap.set(c, (commMap.get(c) || 0) + 1)
          }
        })

        breakdowns = [
          {
            title: "Top Consignees / Receivers",
            items: Array.from(consMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([cName, cnt]) => ({
                label: cName,
                value: `${cnt} BOLs`,
              })),
          },
          {
            title: "Cargo Types & Commodities",
            items: Array.from(commMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([comm, cnt]) => ({
                label: comm,
                value: `${cnt} shipments`,
              })),
          },
        ]
      } else if (type === "consignee") {
        matching = filteredData.filter(
          (d) => (d.consignee_name || "").trim().toLowerCase() === name.toLowerCase()
        )
        const totalPkgs = matching.reduce((sum, d) => sum + parsePackages(d.number_of_packages), 0)
        const totalNet =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.net_weight), 0) * 100) / 100
        const totalGross =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.gross_weight), 0) * 100) / 100
        const usdVal = matching.reduce((sum, d) => {
          const { amount, currency } = parseMoney(d.goods_value)
          return currency === "USD" ? sum + amount : sum
        }, 0)

        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Total Packages", value: totalPkgs.toLocaleString(), color: "slate" },
          { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
          { label: "Gross Weight", value: `${totalGross.toLocaleString()} KG`, color: "slate" },
          {
            label: "Goods Value (USD)",
            value: `$${usdVal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "emerald",
          },
        ]

        const shipMap = new Map<string, number>()
        const commMap = new Map<string, number>()
        matching.forEach((d) => {
          if (d.shipper_name) {
            shipMap.set(d.shipper_name.trim(), (shipMap.get(d.shipper_name.trim()) || 0) + 1)
          }
          const c = extractCleanCommodity(d.cargo_description || d.goods_description || d.commodity)
          if (c && c !== "General Cargo") {
            commMap.set(c, (commMap.get(c) || 0) + 1)
          }
        })

        breakdowns = [
          {
            title: "Supplying Shippers",
            items: Array.from(shipMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([sName, cnt]) => ({
                label: sName,
                value: `${cnt} BOLs`,
              })),
          },
          {
            title: "Received Commodities",
            items: Array.from(commMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([comm, cnt]) => ({
                label: comm,
                value: `${cnt} shipments`,
              })),
          },
        ]
      } else if (type === "commodity") {
        matching = filteredData.filter((d) => {
          const c = extractCleanCommodity(d.cargo_description || d.goods_description || d.commodity)
          return (
            c.toLowerCase() === name.toLowerCase() ||
            (d.cargo_description || "").toLowerCase().includes(name.toLowerCase())
          )
        })
        const totalPkgs = matching.reduce((sum, d) => sum + parsePackages(d.number_of_packages), 0)
        const totalNet =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.net_weight), 0) * 100) / 100
        const totalGross =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.gross_weight), 0) * 100) / 100
        const usdVal = matching.reduce((sum, d) => {
          const { amount, currency } = parseMoney(d.goods_value)
          return currency === "USD" ? sum + amount : sum
        }, 0)

        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Total Packages", value: totalPkgs.toLocaleString(), color: "slate" },
          { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
          { label: "Gross Weight", value: `${totalGross.toLocaleString()} KG`, color: "slate" },
          {
            label: "Goods Value (USD)",
            value: `$${usdVal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "emerald",
          },
        ]

        const shipMap = new Map<string, number>()
        const destMap = new Map<string, number>()
        matching.forEach((d) => {
          if (d.shipper_name) {
            shipMap.set(d.shipper_name.trim(), (shipMap.get(d.shipper_name.trim()) || 0) + 1)
          }
          const dest = d.port_of_discharge || d.place_of_delivery || d.destination_country || ""
          if (dest) destMap.set(dest.trim(), (destMap.get(dest.trim()) || 0) + 1)
        })

        breakdowns = [
          {
            title: "Leading Shippers for this Cargo",
            items: Array.from(shipMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([sName, cnt]) => ({
                label: sName,
                value: `${cnt} shipments`,
              })),
          },
          {
            title: "Primary Transit Destinations",
            items: Array.from(destMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([dest, cnt]) => ({
                label: dest,
                value: `${cnt} BOLs`,
              })),
          },
        ]
      } else if (type === "destination") {
        matching = filteredData.filter((d) => {
          const dest = (
            d.port_of_discharge ||
            d.place_of_delivery ||
            d.destination_country ||
            ""
          ).toLowerCase()
          const pol = (d.port_of_loading || "").toLowerCase()
          return dest.includes(name.toLowerCase()) || pol.includes(name.toLowerCase())
        })
        const totalNet =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.net_weight), 0) * 100) / 100
        const totalGross =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.gross_weight), 0) * 100) / 100
        const usdVal = matching.reduce((sum, d) => {
          const { amount, currency } = parseMoney(d.goods_value)
          return currency === "USD" ? sum + amount : sum
        }, 0)

        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
          { label: "Gross Weight", value: `${totalGross.toLocaleString()} KG`, color: "slate" },
          {
            label: "Goods Value (USD)",
            value: `$${usdVal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "emerald",
          },
        ]

        const commMap = new Map<string, number>()
        const shipMap = new Map<string, number>()
        matching.forEach((d) => {
          const c = extractCleanCommodity(d.cargo_description || d.goods_description || d.commodity)
          if (c && c !== "General Cargo") {
            commMap.set(c, (commMap.get(c) || 0) + 1)
          }
          if (d.shipper_name) {
            shipMap.set(d.shipper_name.trim(), (shipMap.get(d.shipper_name.trim()) || 0) + 1)
          }
        })

        breakdowns = [
          {
            title: "Top Cargo Shipped Through Hub",
            items: Array.from(commMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([c, cnt]) => ({
                label: c,
                value: `${cnt} shipments`,
              })),
          },
          {
            title: "Active Shippers",
            items: Array.from(shipMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([s, cnt]) => ({
                label: s,
                value: `${cnt} BOLs`,
              })),
          },
        ]
      } else if (type === "route") {
        matching = filteredData.filter((d) => {
          const routeInfo = extractBolRoute(d)
          return (
            routeInfo.display.toLowerCase().includes(name.toLowerCase()) ||
            `${routeInfo.origin} ➜ ${routeInfo.destination}`.toLowerCase().includes(name.toLowerCase())
          )
        })
        const totalNet =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.net_weight), 0) * 100) / 100
        const usdVal = matching.reduce((sum, d) => {
          const { amount, currency } = parseMoney(d.goods_value)
          return currency === "USD" ? sum + amount : sum
        }, 0)

        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
          {
            label: "Goods Value (USD)",
            value: `$${usdVal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "emerald",
          },
        ]

        const truckMap = new Map<string, number>()
        matching.forEach((d) => {
          const t = extractTruckNo(d) || d.truck_number
          if (t) truckMap.set(t.trim(), (truckMap.get(t.trim()) || 0) + 1)
        })

        breakdowns = [
          {
            title: "Fleet Trucks on this Corridor",
            items: Array.from(truckMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([t, cnt]) => ({
                label: t,
                value: `${cnt} trips`,
              })),
          },
        ]
      } else if (type === "truck") {
        matching = filteredData.filter((d) => {
          const t = extractTruckNo(d) || d.truck_number || ""
          return t.toLowerCase().includes(name.toLowerCase())
        })
        const totalRent = matching.reduce((acc, d) => {
          const rentRaw = d.driver_rent || d.driverFreight || ""
          if (rentRaw.trim()) {
            const { amount, currency } = parseMoney(rentRaw)
            acc[currency] = (acc[currency] || 0) + amount
          }
          return acc
        }, {} as Record<string, number>)

        const rentStr =
          Object.entries(totalRent)
            .map(([curr, amt]) => `${amt.toLocaleString()} ${curr}`)
            .join(", ") || "—"

        kpis = [
          { label: "Total Trips / BOLs", value: matching.length, color: "blue" },
          { label: "Driver Rent Total", value: rentStr, color: "amber" },
          { label: "Last Driver", value: matching[0]?.driver_name || "—", color: "slate" },
        ]

        const routeMap = new Map<string, number>()
        matching.forEach((d) => {
          const r = extractBolRoute(d)
          if (r.shortDisplay !== "—") {
            routeMap.set(r.shortDisplay, (routeMap.get(r.shortDisplay) || 0) + 1)
          }
        })

        breakdowns = [
          {
            title: "Routes Driven",
            items: Array.from(routeMap.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([r, cnt]) => ({
                label: r,
                value: `${cnt} trips`,
              })),
          },
        ]
      } else if (type === "container") {
        matching = filteredData.filter((d) =>
          (d.container_numbers || "").toUpperCase().includes(name.toUpperCase())
        )
        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Assigned Shipper", value: matching[0]?.shipper_name || "—", color: "slate" },
          { label: "Destination", value: matching[0]?.port_of_discharge || "—", color: "slate" },
        ]
      } else if (type === "month") {
        matching = filteredData.filter((d) => {
          const dt = normalizeDate(d.issue_date || d.created_at)
          if (!dt) return false
          const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
          const mLabel = dt.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          return mKey === name || mLabel.toLowerCase() === name.toLowerCase()
        })
        const totalNet =
          Math.round(matching.reduce((sum, d) => sum + parseWeight(d.net_weight), 0) * 100) / 100
        const usdVal = matching.reduce((sum, d) => {
          const { amount, currency } = parseMoney(d.goods_value)
          return currency === "USD" ? sum + amount : sum
        }, 0)

        kpis = [
          { label: "Total BOLs", value: matching.length, color: "blue" },
          { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
          {
            label: "Goods Value (USD)",
            value: `$${usdVal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            color: "emerald",
          },
        ]
      }

      setDrawerState({
        isOpen: true,
        entityType: type,
        entityName: name,
        kpis,
        breakdowns,
        recentBols: matching,
        matchingCount: matching.length,
      })
    },
    [filteredData]
  )

  const handleViewMatchingBols = useCallback(
    (type: string, name: string) => {
      setDrillDownEntity({
        type: type as any,
        name,
      })
      setActiveTab("detailed")
      toast.info(`Filtering Detailed Report for ${type}: ${name}`)
    },
    []
  )

  // =========================================================================
  // Report Tab Columns & Summary Metrics
  // =========================================================================

  // 1. Shippers Columns & Metrics
  const shipperColumns: ReportColumnDef<ShipperSummary>[] = useMemo(
    () => [
      {
        id: "shipperName",
        header: "Shipper",
        accessor: (r) => r.shipperName,
        cell: (r) => {
          const isRtl = isRtlText(r.shipperName)
          return (
            <div
              className={`font-bold text-slate-950 dark:text-slate-100 max-w-[220px] truncate ${
                isRtl ? "text-right font-[vazirmatn]" : ""
              }`}
              dir={isRtl ? "rtl" : "ltr"}
              title={r.shipperName}
            >
              {r.shipperName}
            </div>
          )
        },
      },
      {
        id: "bolCount",
        header: "BOL Count",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "packages",
        header: "Packages",
        align: "right",
        sortable: true,
        accessor: (r) => r.packages,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.packages.toLocaleString()}
          </span>
        ),
      },
      {
        id: "netWeightKg",
        header: "Net Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.netWeightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.netWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "grossWeightKg",
        header: "Gross Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.grossWeightKg,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {r.grossWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueByCurrency["USD"] || 0,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${(r.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "topCommodity",
        header: "Commodities",
        accessor: (r) => r.topCommodity || r.commodities?.join(", ") || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] inline-block"
            title={r.commodities?.join(", ") || r.topCommodity || "—"}
          >
            {r.topCommodity || r.commodities?.slice(0, 2).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "topConsignee",
        header: "Top Consignee",
        accessor: (r) => r.topConsignee || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px] inline-block"
            title={r.topConsignee || "—"}
          >
            {r.topConsignee || "—"}
          </span>
        ),
      },
      {
        id: "topDestination",
        header: "Top Destination",
        accessor: (r) => r.topDestination,
        cell: (r) => (
          <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[150px] inline-block">
            {r.topDestination || "—"}
          </span>
        ),
      },
      {
        id: "containerCount",
        header: "Containers",
        align: "center",
        sortable: true,
        defaultHidden: true,
        accessor: (r) => r.containerCount,
        cell: (r) => (
          <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
            {r.containerCount}
          </span>
        ),
      },
      {
        id: "lastShipmentDate",
        header: "Last Shipment",
        align: "right",
        sortable: true,
        accessor: (r) => r.lastShipmentDate,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
            {r.lastShipmentDate || "—"}
          </span>
        ),
      },
    ],
    []
  )

  const shipperSummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalBols = shippersList.reduce((s, r) => s + r.bolCount, 0)
    const totalNet = Math.round(shippersList.reduce((s, r) => s + r.netWeightKg, 0))
    const totalUsd = shippersList.reduce((s, r) => s + (r.goodsValueByCurrency["USD"] || 0), 0)
    return [
      { label: "Active Shippers", value: shippersList.length, color: "blue" },
      { label: "Total BOLs", value: totalBols, color: "slate" },
      { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
    ]
  }, [shippersList])

  // 2. Consignees Columns & Metrics
  const consigneeColumns: ReportColumnDef<ConsigneeSummary>[] = useMemo(
    () => [
      {
        id: "consigneeName",
        header: "Consignee",
        accessor: (r) => r.consigneeName,
        cell: (r) => {
          const isRtl = isRtlText(r.consigneeName)
          return (
            <div
              className={`font-bold text-slate-950 dark:text-slate-100 max-w-[220px] truncate ${
                isRtl ? "text-right font-[vazirmatn]" : ""
              }`}
              dir={isRtl ? "rtl" : "ltr"}
              title={r.consigneeName}
            >
              {r.consigneeName}
            </div>
          )
        },
      },
      {
        id: "bolCount",
        header: "BOL Count",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "shipperCount",
        header: "Suppliers",
        align: "center",
        sortable: true,
        accessor: (r) => r.shipperCount,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {r.shipperCount}
          </span>
        ),
      },
      {
        id: "packages",
        header: "Packages",
        align: "right",
        sortable: true,
        accessor: (r) => r.packages,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.packages.toLocaleString()}
          </span>
        ),
      },
      {
        id: "netWeightKg",
        header: "Net Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.netWeightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.netWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "grossWeightKg",
        header: "Gross Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.grossWeightKg,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {r.grossWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueByCurrency["USD"] || 0,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${(r.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "topShipper",
        header: "Top Shipper",
        accessor: (r) => r.topShipper || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px] inline-block"
            title={r.topShipper || "—"}
          >
            {r.topShipper || "—"}
          </span>
        ),
      },
      {
        id: "topCommodity",
        header: "Commodities",
        accessor: (r) => r.topCommodity || r.commodities?.join(", ") || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 truncate max-w-[160px] inline-block"
            title={r.commodities?.join(", ") || r.topCommodity || "—"}
          >
            {r.topCommodity || r.commodities?.slice(0, 2).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "topDestination",
        header: "Destination / Port",
        accessor: (r) => r.topDestination,
        cell: (r) => (
          <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[150px] inline-block">
            {r.topDestination || "—"}
          </span>
        ),
      },
      {
        id: "lastShipmentDate",
        header: "Last Shipment",
        align: "right",
        sortable: true,
        accessor: (r) => r.lastShipmentDate,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
            {r.lastShipmentDate || "—"}
          </span>
        ),
      },
    ],
    []
  )

  const consigneeSummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalBols = consigneesList.reduce((s, r) => s + r.bolCount, 0)
    const totalNet = Math.round(consigneesList.reduce((s, r) => s + r.netWeightKg, 0))
    const totalUsd = consigneesList.reduce((s, r) => s + (r.goodsValueByCurrency["USD"] || 0), 0)
    return [
      { label: "Active Consignees", value: consigneesList.length, color: "blue" },
      { label: "Total BOLs", value: totalBols, color: "slate" },
      { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
    ]
  }, [consigneesList])

  // 3. Commodities Columns & Metrics
  const commodityColumns: ReportColumnDef<CommoditySummary>[] = useMemo(
    () => [
      {
        id: "commodityName",
        header: "Commodity",
        accessor: (r) => r.commodityName,
        cell: (r) => (
          <span
            className="font-bold text-slate-950 dark:text-slate-100 max-w-[220px] truncate inline-block"
            title={r.commodityName}
          >
            {r.commodityName}
          </span>
        ),
      },
      {
        id: "bolCount",
        header: "BOL Count",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "cargoRowCount",
        header: "Cargo Rows",
        align: "center",
        sortable: true,
        defaultHidden: true,
        accessor: (r) => r.cargoRowCount || r.bolCount,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {r.cargoRowCount || r.bolCount}
          </span>
        ),
      },
      {
        id: "packages",
        header: "Packages",
        align: "right",
        sortable: true,
        accessor: (r) => r.packages,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.packages.toLocaleString()} {r.packageUnit || ""}
          </span>
        ),
      },
      {
        id: "netWeightKg",
        header: "Net Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.netWeightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.netWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "grossWeightKg",
        header: "Gross Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.grossWeightKg || 0,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {(r.grossWeightKg || 0).toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueByCurrency["USD"] || 0,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${(r.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "averageValueUsd",
        header: "Avg Value / BOL",
        align: "right",
        sortable: true,
        accessor: (r) => r.averageValueUsd,
        cell: (r) => (
          <span className="font-mono text-slate-700 dark:text-slate-300">
            ${r.averageValueUsd.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "topShipper",
        header: "Top Shipper",
        accessor: (r) => r.topShipper || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px] inline-block"
            title={r.topShipper || "—"}
          >
            {r.topShipper || "—"}
          </span>
        ),
      },
      {
        id: "topConsignee",
        header: "Top Consignee",
        accessor: (r) => r.topConsignee || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px] inline-block"
            title={r.topConsignee || "—"}
          >
            {r.topConsignee || "—"}
          </span>
        ),
      },
      {
        id: "destinations",
        header: "Destinations",
        accessor: (r) => r.destinations.join(", "),
        cell: (r) => (
          <span
            className="text-slate-600 dark:text-slate-400 truncate max-w-[180px] inline-block"
            title={r.destinations.join(", ") || "—"}
          >
            {r.destinations.join(", ") || "—"}
          </span>
        ),
      },
    ],
    []
  )

  const commoditySummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalBols = commoditiesList.reduce((s, r) => s + r.bolCount, 0)
    const totalNet = Math.round(commoditiesList.reduce((s, r) => s + r.netWeightKg, 0))
    const totalUsd = commoditiesList.reduce((s, r) => s + (r.goodsValueByCurrency["USD"] || 0), 0)
    return [
      { label: "Cargo Types", value: commoditiesList.length, color: "blue" },
      { label: "Total BOLs", value: totalBols, color: "slate" },
      { label: "Total Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
    ]
  }, [commoditiesList])

  // 4. Destinations Columns & Metrics
  const destinationColumns: ReportColumnDef<DestinationSummary>[] = useMemo(
    () => [
      {
        id: "locationName",
        header: "Transit Hub / Port",
        accessor: (r) => r.locationName,
        cell: (r) => (
          <span
            className="font-bold text-slate-950 dark:text-slate-100 max-w-[200px] truncate inline-block"
            title={r.locationName}
          >
            {r.locationName}
          </span>
        ),
      },
      {
        id: "type",
        header: "Route Role",
        align: "center",
        sortable: true,
        accessor: (r) => r.type,
        cell: (r) => (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              r.type === "POL"
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                : r.type === "POD"
                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                : "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
            }`}
          >
            {r.type}
          </span>
        ),
      },
      {
        id: "country",
        header: "Country",
        accessor: (r) => r.country || "",
        cell: (r) => (
          <span className="text-slate-700 dark:text-slate-300 font-semibold">
            {r.country || "—"}
          </span>
        ),
      },
      {
        id: "bolCount",
        header: "BOL Count",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "packages",
        header: "Packages",
        align: "right",
        sortable: true,
        defaultHidden: true,
        accessor: (r) => r.packages || 0,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {(r.packages || 0).toLocaleString()}
          </span>
        ),
      },
      {
        id: "netWeightKg",
        header: "Net Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.netWeightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.netWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "grossWeightKg",
        header: "Gross Weight",
        align: "right",
        sortable: true,
        defaultHidden: true,
        accessor: (r) => r.grossWeightKg || 0,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {(r.grossWeightKg || 0).toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueByCurrency["USD"] || 0,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${(r.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "topShipper",
        header: "Top Shipper",
        accessor: (r) => r.topShipper || r.topShippers?.join(", ") || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px] inline-block"
            title={r.topShipper || r.topShippers?.join(", ") || "—"}
          >
            {r.topShipper || r.topShippers?.slice(0, 2).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "topCommodity",
        header: "Top Commodity",
        accessor: (r) => r.topCommodity || "",
        cell: (r) => (
          <span
            className="text-slate-700 dark:text-slate-300 truncate max-w-[150px] inline-block"
            title={r.topCommodity || "—"}
          >
            {r.topCommodity || "—"}
          </span>
        ),
      },
      {
        id: "lastShipmentDate",
        header: "Last Shipment",
        align: "right",
        sortable: true,
        accessor: (r) => r.lastShipmentDate || "",
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
            {r.lastShipmentDate || "—"}
          </span>
        ),
      },
    ],
    []
  )

  const destinationSummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalBols = destinationsList.reduce((s, r) => s + r.bolCount, 0)
    const totalNet = Math.round(destinationsList.reduce((s, r) => s + r.netWeightKg, 0))
    const totalUsd = destinationsList.reduce((s, r) => s + (r.goodsValueByCurrency["USD"] || 0), 0)
    return [
      { label: "Transit Hubs & Ports", value: destinationsList.length, color: "blue" },
      { label: "Total Route Mentions", value: totalBols, color: "slate" },
      { label: "Cargo Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
    ]
  }, [destinationsList])

  // 5. Routes Columns & Metrics
  const routeColumns: ReportColumnDef<RouteSummary>[] = useMemo(
    () => [
      {
        id: "routePath",
        header: "Transit Corridor (Origin ➜ Destination)",
        accessor: (r) => r.routePath,
        cell: (r) => (
          <div className="max-w-[260px] truncate" title={r.routePath}>
            <div className="flex items-center gap-1.5 font-bold text-slate-950 dark:text-slate-100">
              <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{r.origin}</span>
              <span className="text-slate-400">➜</span>
              <span className="text-blue-700 dark:text-blue-400">{r.destination}</span>
            </div>
            {r.routePath !== `${r.origin} ➜ ${r.destination}` && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                {r.routePath}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "borderCrossing",
        header: "Border Crossing / Via",
        accessor: (r) => r.borderCrossing || r.via || "",
        cell: (r) =>
          r.borderCrossing || r.via ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {r.borderCrossing || r.via}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "bolCount",
        header: "Total BOLs",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "packages",
        header: "Packages",
        align: "right",
        sortable: true,
        accessor: (r) => r.packages,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.packages.toLocaleString()}
          </span>
        ),
      },
      {
        id: "netWeightKg",
        header: "Net Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.netWeightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.netWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "grossWeightKg",
        header: "Gross Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.grossWeightKg,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400">
            {r.grossWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueByCurrency["USD"] || 0,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${(r.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "equipmentSplit",
        header: "Equipment Split",
        align: "center",
        cell: (r) => (
          <div className="flex items-center justify-center gap-1">
            {r.reeferCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200">
                {r.reeferCount} Reefer
              </span>
            )}
            {r.dryCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {r.dryCount} Dry
              </span>
            )}
          </div>
        ),
      },
    ],
    []
  )

  const routeSummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalBols = routesList.reduce((s, r) => s + r.bolCount, 0)
    const totalNet = Math.round(routesList.reduce((s, r) => s + r.netWeightKg, 0))
    const totalUsd = routesList.reduce((s, r) => s + (r.goodsValueByCurrency["USD"] || 0), 0)
    return [
      { label: "Corridors", value: routesList.length, color: "blue" },
      { label: "Total Trips", value: totalBols, color: "slate" },
      { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
    ]
  }, [routesList])

  // 6. Containers Columns & Metrics
  const containerColumns: ReportColumnDef<ContainerRecord>[] = useMemo(
    () => [
      {
        id: "containerNumber",
        header: "Container No.",
        accessor: (r) => r.containerNumber,
        cell: (r) => (
          <span className="font-mono font-black text-slate-950 dark:text-slate-100">
            {r.containerNumber}
          </span>
        ),
      },
      {
        id: "containerType",
        header: "Type",
        align: "center",
        sortable: true,
        accessor: (r) => r.containerType,
        cell: (r) => (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
              r.containerType.includes("RF") || r.containerType.includes("Reefer")
                ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {r.containerType}
          </span>
        ),
      },
      {
        id: "bolNumber",
        header: "BOL No.",
        accessor: (r) => r.bolNumber,
        cell: (r) => (
          <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
            {r.bolNumber}
          </span>
        ),
      },
      {
        id: "shipper",
        header: "Shipper",
        accessor: (r) => r.shipper,
        cell: (r) => (
          <span
            className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px] inline-block"
            title={r.shipper}
          >
            {r.shipper}
          </span>
        ),
      },
      {
        id: "consignee",
        header: "Consignee",
        accessor: (r) => r.consignee,
        cell: (r) => (
          <span
            className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px] inline-block"
            title={r.consignee}
          >
            {r.consignee}
          </span>
        ),
      },
      {
        id: "commodity",
        header: "Commodity",
        accessor: (r) => r.commodity,
        cell: (r) => (
          <span
            className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px] inline-block"
            title={r.commodity}
          >
            {r.commodity}
          </span>
        ),
      },
      {
        id: "weightKg",
        header: "Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.weightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.weightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "route",
        header: "Origin ➜ Destination",
        accessor: (r) => `${r.origin} ➜ ${r.destination}`,
        cell: (r) => (
          <span
            className="text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[170px] inline-block"
            title={`${r.origin} ➜ ${r.destination}`}
          >
            {r.origin} ➜ {r.destination}
          </span>
        ),
      },
      {
        id: "date",
        header: "Date",
        align: "right",
        sortable: true,
        accessor: (r) => r.date,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
            {r.date}
          </span>
        ),
      },
    ],
    []
  )

  const containerSummaryMetrics: SummaryMetricPill[] = useMemo(
    () => [
      { label: "Total Equipment", value: containerStats.total, color: "blue" },
      { label: "Dry Containers", value: containerStats.dry, color: "slate" },
      { label: "Reefer Containers", value: containerStats.reefer, color: "cyan" },
      { label: "40 FT / 40 HC", value: containerStats.fortyFt + containerStats.fortyHc, color: "purple" },
    ],
    [containerStats]
  )

  // 7. Trucks Columns & Metrics
  const truckColumns: ReportColumnDef<TruckSummary>[] = useMemo(
    () => [
      {
        id: "truckNumber",
        header: "Truck Plate No.",
        accessor: (r) => r.truckNumber,
        cell: (r) => (
          <span
            dir="ltr"
            className="inline-block px-2 py-0.5 rounded font-mono font-black bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            {r.truckNumber}
          </span>
        ),
      },
      {
        id: "plateRegion",
        header: "Region / Origin",
        accessor: (r) => r.plateRegion || "",
        cell: (r) => (
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {r.plateRegion || "—"}
          </span>
        ),
      },
      {
        id: "lastDriver",
        header: "Assigned Driver & Phone",
        accessor: (r) => `${r.lastDriver} ${r.lastDriverPhone || ""}`,
        cell: (r) => (
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{r.lastDriver}</p>
            {r.lastDriverPhone && r.lastDriverPhone !== "—" && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {r.lastDriverPhone}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "bolCount",
        header: "Total BOLs / Trips",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "totalDriverRent",
        header: "Total Driver Rent",
        align: "right",
        sortable: true,
        accessor: (r) => Object.values(r.totalDriverRent).reduce((s, v) => s + v, 0),
        cell: (r) => {
          const rentEntries = Object.entries(r.totalDriverRent)
          return (
            <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
              {rentEntries.length > 0 ? (
                rentEntries.map(([currency, val]) => (
                  <div key={currency}>
                    {val.toLocaleString()} {currency}
                  </div>
                ))
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          )
        },
      },
      {
        id: "topRoute",
        header: "Top Corridor",
        accessor: (r) => r.topRoute || r.routesUsed.join(", "),
        cell: (r) => (
          <span
            className="text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[200px] inline-block"
            title={r.routesUsed.join(", ") || r.topRoute || "—"}
          >
            {r.topRoute || r.routesUsed.join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "topShipper",
        header: "Primary Shipper",
        accessor: (r) => r.topShipper,
        cell: (r) => (
          <span
            className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] inline-block"
            title={r.topShipper}
          >
            {r.topShipper}
          </span>
        ),
      },
      {
        id: "lastShipmentDate",
        header: "Last Active Date",
        align: "right",
        sortable: true,
        accessor: (r) => r.lastShipmentDate,
        cell: (r) => (
          <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
            {r.lastShipmentDate}
          </span>
        ),
      },
    ],
    []
  )

  const truckSummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalTrips = trucksList.reduce((s, r) => s + r.bolCount, 0)
    return [
      { label: "Fleet Units", value: trucksList.length, color: "blue" },
      { label: "Total Trips / BOLs", value: totalTrips, color: "slate" },
    ]
  }, [trucksList])

  // 8. Monthly Columns & Metrics
  const monthlyColumns: ReportColumnDef<MonthlySummary>[] = useMemo(
    () => [
      {
        id: "monthLabel",
        header: "Operating Month",
        accessor: (r) => r.monthLabel,
        cell: (r) => (
          <span className="font-mono font-black text-slate-950 dark:text-slate-100">
            {r.monthLabel}
          </span>
        ),
      },
      {
        id: "bolCount",
        header: "BOLs",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "packages",
        header: "Packages",
        align: "right",
        sortable: true,
        accessor: (r) => r.packages,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.packages.toLocaleString()}
          </span>
        ),
      },
      {
        id: "netWeightKg",
        header: "Net Weight",
        align: "right",
        sortable: true,
        accessor: (r) => r.netWeightKg,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.netWeightKg.toLocaleString()} KG
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueByCurrency["USD"] || 0,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${(r.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "containerCount",
        header: "Containers",
        align: "center",
        sortable: true,
        accessor: (r) => r.containerCount,
        cell: (r) => (
          <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
            {r.containerCount}
          </span>
        ),
      },
      {
        id: "shipperCount",
        header: "Shippers",
        align: "center",
        sortable: true,
        accessor: (r) => r.shipperCount,
        cell: (r) => (
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {r.shipperCount}
          </span>
        ),
      },
      {
        id: "consigneeCount",
        header: "Consignees",
        align: "center",
        sortable: true,
        accessor: (r) => r.consigneeCount,
        cell: (r) => (
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {r.consigneeCount}
          </span>
        ),
      },
    ],
    []
  )

  const monthlySummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalBols = monthlySummaries.reduce((s, r) => s + r.bolCount, 0)
    const totalNet = Math.round(monthlySummaries.reduce((s, r) => s + r.netWeightKg, 0))
    const totalUsd = monthlySummaries.reduce((s, r) => s + (r.goodsValueByCurrency["USD"] || 0), 0)
    return [
      { label: "Operating Months", value: monthlySummaries.length, color: "blue" },
      { label: "Total BOLs", value: totalBols, color: "slate" },
      { label: "Net Weight", value: `${totalNet.toLocaleString()} KG`, color: "slate" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
    ]
  }, [monthlySummaries])

  // 9. Financial Monthly Columns & Rows (Adheres strictly to real stored fields; never fabricates profit)
  interface FinancialMonthlyRow {
    monthKey: string
    monthLabel: string
    bolCount: number
    goodsValueUsd: number
    goodsValueAfn: number
    driverRentAfn: number
    driverRentUsd: number
    freightUsd: number
    status: string
  }

  const financialMonthlyRows: FinancialMonthlyRow[] = useMemo(() => {
    return monthlySummaries.map((m) => {
      let driverRentAFN = 0
      let driverRentUSD = 0
      let freightUSD = 0
      for (const doc of filteredData) {
        const rawDate = doc.issue_date || doc.created_at || ""
        if (rawDate.startsWith(m.monthKey)) {
          const dRent = String(doc.driver_rent || (doc as any).driverFreight || (doc as any).driverRent || "")
          if (dRent) {
            const num = parseFloat(dRent.replace(/[^0-9.]/g, ""))
            if (!isNaN(num)) {
              if (dRent.toUpperCase().includes("USD") || dRent.includes("$")) {
                driverRentUSD += num
              } else {
                driverRentAFN += num
              }
            }
          }
          const fr = String((doc as any).freight || (doc as any).freight_charges || "")
          if (fr) {
            const num = parseFloat(fr.replace(/[^0-9.]/g, ""))
            if (!isNaN(num)) freightUSD += num
          }
        }
      }
      return {
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        bolCount: m.bolCount,
        goodsValueUsd: m.goodsValueByCurrency["USD"] || 0,
        goodsValueAfn: m.goodsValueByCurrency["AFN"] || 0,
        driverRentAfn: driverRentAFN,
        driverRentUsd: driverRentUSD,
        freightUsd: freightUSD,
        status: "Financial data incomplete",
      }
    })
  }, [monthlySummaries, filteredData])

  const financialColumns: ReportColumnDef<FinancialMonthlyRow>[] = useMemo(
    () => [
      {
        id: "monthLabel",
        header: "Operating Month",
        accessor: (r) => r.monthLabel,
        cell: (r) => (
          <span className="font-mono font-black text-slate-950 dark:text-slate-100">
            {r.monthLabel}
          </span>
        ),
      },
      {
        id: "bolCount",
        header: "BOLs",
        align: "center",
        sortable: true,
        accessor: (r) => r.bolCount,
        cell: (r) => (
          <span className="font-mono font-black text-blue-700 dark:text-blue-400">
            {r.bolCount}
          </span>
        ),
      },
      {
        id: "goodsValueUsd",
        header: "Goods Value (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.goodsValueUsd,
        cell: (r) => (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
            ${r.goodsValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        id: "driverRent",
        header: "Driver Rent",
        align: "right",
        cell: (r) => (
          <div className="font-mono text-xs">
            {r.driverRentAfn > 0 && (
              <span className="text-amber-700 dark:text-amber-400 block font-bold">
                AFN {r.driverRentAfn.toLocaleString()}
              </span>
            )}
            {r.driverRentUsd > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 block font-bold">
                ${r.driverRentUsd.toLocaleString()}
              </span>
            )}
            {r.driverRentAfn === 0 && r.driverRentUsd === 0 && (
              <span className="text-slate-400 font-medium">-</span>
            )}
          </div>
        ),
      },
      {
        id: "freightUsd",
        header: "Freight (USD)",
        align: "right",
        sortable: true,
        accessor: (r) => r.freightUsd,
        cell: (r) => (
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {r.freightUsd > 0 ? `$${r.freightUsd.toLocaleString()}` : "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Accounting Status",
        align: "center",
        cell: () => (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
            Financial data incomplete
          </span>
        ),
      },
    ],
    []
  )

  const financialSummaryMetrics: SummaryMetricPill[] = useMemo(() => {
    const totalUsd = financialMonthlyRows.reduce((s, r) => s + r.goodsValueUsd, 0)
    const totalDriverRentAfn = financialMonthlyRows.reduce((s, r) => s + r.driverRentAfn, 0)
    return [
      { label: "Operating Months", value: financialMonthlyRows.length, color: "blue" },
      {
        label: "Goods Value (USD)",
        value: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: "emerald",
      },
      {
        label: "Driver Rent (AFN)",
        value: `AFN ${totalDriverRentAfn.toLocaleString()}`,
        color: "amber",
      },
    ]
  }, [financialMonthlyRows])

  // Selection handlers
  const isAllPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((d) => selectedIds.includes(d.id))
  const isAllFilteredSelected =
    filteredData.length > 0 && selectedIds.length === filteredData.length

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedRows.map((d) => d.id))
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)))
    } else {
      const combined = new Set([...selectedIds, ...paginatedRows.map((d) => d.id)])
      setSelectedIds(Array.from(combined))
    }
  }

  const selectAllFiltered = () => {
    setSelectedIds(filteredData.map((d) => d.id))
    toast.info(`Selected all ${filteredData.length} filtered BOL records`)
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  // Export handlers
  const handleExportExcel = async (exportMode: "all" | "current" = "all") => {
    const isCurrentOnly = exportMode === "current"
    const toastId = toast.loading(
      isCurrentOnly
        ? `Generating Excel (.xlsx) for ${activeTab.toUpperCase()}...`
        : "Generating Complete Multi-Sheet Excel Workbook..."
    )
    try {
      const fileName = isCurrentOnly
        ? `Sky-Ariana-${activeTab.toUpperCase()}-View`
        : `Sky-Ariana-Operations-Full-Report`

      await exportReportToExcel(
        activeReportData,
        fileName,
        activeTab,
        exportMode
      )
      toast.dismiss(toastId)
      toast.success(
        isCurrentOnly
          ? `Excel report for ${activeTab.toUpperCase()} generated`
          : "Complete 12-sheet Excel report generated successfully"
      )

      // Record in history
      const entry: ReportHistoryEntry = {
        id: `hist-${Date.now()}`,
        reportName: isCurrentOnly
          ? `${activeTab.toUpperCase()} Operations Report`
          : "Complete Operations Workbook (12 Sheets)",
        reportType: activeTab,
        createdDate: new Date().toISOString(),
        createdBy: "System Administrator",
        filterRange: `${filteredData.length} records`,
        recordCount: activeReportData.length,
        fileName: `${fileName}.xlsx`,
      }
      addReportHistoryEntry(entry)
      setReportHistory(getReportHistory())
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate Excel file")
    }
  }

  const handleExportCSV = () => {
    try {
      const headers = [
        "#",
        "BOL Number",
        "Date",
        "Truck No",
        "Invoice",
        "Shipper",
        "Consignee",
        "Packages",
        "Net Weight (KG)",
        "Gross Weight (KG)",
        "Goods Value",
        "Origin",
        "Destination",
        "Containers",
        "PDF",
      ]

      const rows = activeReportData.map((d, i) => [
        i + 1,
        `"${d.bol_number || ""}"`,
        `"${formatDisplayDate(d.issue_date || d.created_at)}"`,
        `"${extractTruckNo(d)}"`,
        `"${extractInvoiceNo(d)}"`,
        `"${(d.shipper_name || "").replace(/"/g, '""')}"`,
        `"${(d.consignee_name || "").replace(/"/g, '""')}"`,
        `"${d.number_of_packages || ""}"`,
        `"${d.net_weight || ""}"`,
        `"${d.gross_weight || ""}"`,
        `"${d.goods_value || ""}"`,
        `"${(d.port_of_loading || "").replace(/"/g, '""')}"`,
        `"${(d.port_of_discharge || "").replace(/"/g, '""')}"`,
        `"${(d.container_numbers || "").replace(/"/g, '""')}"`,
        `"${(d.truck_number || "").replace(/"/g, '""')}"`,
        d.pdf_url ? "Yes" : "No",
      ])

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Sky-Ariana-Report-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 150)
      toast.success("CSV file downloaded")
    } catch {
      toast.error("Failed to export CSV")
    }
  }

  const handleCopyWhatsAppSummary = useCallback(async () => {
    try {
      const docs = activeReportData.length > 0 ? activeReportData : (documents || [])
      const normalized = docs.map((d) => normalizeToWhatsAppShipment(d))
      const summary = buildManagementSummary(normalized)
      await navigator.clipboard.writeText(summary)
      toast.success("WhatsApp Operations Summary copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy WhatsApp summary:", err)
      toast.error("Failed to copy WhatsApp summary")
    }
  }, [activeReportData, documents])

  const preparePrintRoot = useCallback(() => {
    const targetNode = reportRef.current
    if (!targetNode) return null

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0)
    }
    const scrollParent = targetNode.parentElement
    if (scrollParent) {
      scrollParent.scrollTop = 0
    }

    let printRoot = document.getElementById("sky-reports-print-root") as HTMLDivElement | null
    if (!printRoot) {
      printRoot = document.createElement("div")
      printRoot.id = "sky-reports-print-root"
      printRoot.className = "reports-print-root"
      printRoot.setAttribute("data-print-root", "true")
      document.body.appendChild(printRoot)
    }
    printRoot.innerHTML = ""

    const clone = targetNode.cloneNode(true) as HTMLElement
    clone.id = "sky-reports-cloned-print-canvas"
    clone.className = `reports-print-document font-sans text-slate-900 bg-white w-full p-0 m-0 border-none shadow-none`

    // Remove interactive elements
    clone.querySelectorAll("button, input, select, textarea, .no-print, [data-no-print='true'], [role='button']").forEach((el) => {
      el.remove()
    })

    clone.querySelectorAll("div").forEach((el) => {
      const txt = el.textContent || ""
      if ((txt.includes("Select Page") && txt.includes("Rows:")) || txt.includes("Select Page (") || txt.includes("Click any shipper to drill down")) {
        el.remove()
      }
    })

    // In Detailed Report, optimize print table layout & strip interactive PDF column
    if (activeTab === "detailed") {
      clone.querySelectorAll("th.print\\:hidden, td.print\\:hidden").forEach((el) => el.remove())
      clone.querySelectorAll("table").forEach((tbl) => {
        const headerRow = tbl.querySelector("thead tr")
        if (headerRow && headerRow.lastElementChild?.textContent?.trim() === "PDF") {
          headerRow.lastElementChild.remove()
          tbl.querySelectorAll("tbody tr").forEach((tr) => {
            if (tr.children.length >= 11) {
              tr.lastElementChild?.remove()
            }
          })
          const footerRow = tbl.querySelector("tfoot tr")
          if (footerRow && footerRow.lastElementChild) {
            footerRow.lastElementChild.remove()
          }
        }
      })
    }

    // Remove scroll/overflow limits
    clone.querySelectorAll(".overflow-y-auto, .overflow-x-auto, [class*='max-h-'], .scrollbar-thin").forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.classList.remove("overflow-y-auto", "overflow-x-auto", "scrollbar-thin")
      htmlEl.style.overflow = "visible"
      htmlEl.style.maxHeight = "none"
      htmlEl.style.height = "auto"
    })

    // Remove ellipsis truncation
    clone.querySelectorAll(".truncate, [class*='max-w-']").forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.classList.remove("truncate")
      htmlEl.style.whiteSpace = "normal"
      htmlEl.style.wordBreak = "break-word"
      htmlEl.style.maxWidth = "none"
    })

    // Remove sticky headers for print
    clone.querySelectorAll(".sticky").forEach((el) => {
      const htmlEl = el as HTMLElement
      htmlEl.classList.remove("sticky")
      htmlEl.style.position = "static"
    })

    // Proportional column widths for print table
    clone.querySelectorAll("table").forEach((tbl) => {
      tbl.classList.add("w-full", "border-collapse")
      tbl.style.width = "100%"
      tbl.style.tableLayout = "fixed"
    })

    // Remove duplicate on-screen header from clone since executive letterhead banner is prepended
    clone.querySelectorAll("[data-report-header='true']").forEach((el) => el.remove())

    // Prepend executive letterhead banner to print root
    const printLetterhead = document.createElement("div")
    printLetterhead.className = "print-letterhead-banner mb-3 border-b-2 border-slate-900 pb-2.5"
    printLetterhead.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 7px; border-bottom: 2px solid #0f172a;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 58px; height: 58px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; padding: 2px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); flex-shrink: 0;">
            <img
              src="${AQ_COMPANIES_LOGO_SRC}"
              alt="AQ COMPANIES"
              style="width: 100%; height: 100%; object-fit: contain;"
            />
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h1 style="font-size: 20px; font-weight: 900; color: #0a2540; text-transform: uppercase; margin: 0; letter-spacing: -0.5px; line-height: 1.1;">${reportCompanyName || "AQ COMPANIES"}</h1>
              <span style="font-size: 8.5px; font-weight: 800; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 1.5px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.6px;">${activeTab.replace("_", " ").toUpperCase()} REPORT</span>
            </div>
            <p style="font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 2px 0 0 0; letter-spacing: 0.8px;">SKY ARIANA • INTERNATIONAL FREIGHT & MULTI-MODAL LOGISTICS MANAGEMENT</p>
            <p style="font-size: 10.5px; font-weight: 800; color: #1e3a8a; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.2px;">MASTER BILL OF LADING AUDIT & SHIPMENT MANIFEST (گزارش جامع بارنامه‌ها)</p>
          </div>
        </div>
        <div style="text-align: right; font-size: 8.5px; font-weight: 600; color: #475569; line-height: 1.45; border-left: 2px solid #e2e8f0; padding-left: 12px;">
          <p style="margin: 0;"><span style="color: #64748b;">Audit Date:</span> <strong style="color: #0f172a; font-family: monospace;">${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString()}</strong></p>
          <p style="margin: 0;"><span style="color: #64748b;">Audited Records:</span> <strong style="color: #0f172a; font-family: monospace;">${activeReportData.length} Bills of Lading</strong></p>
          <p style="margin: 0;"><span style="color: #64748b;">Verification:</span> <strong style="color: #059669; font-weight: 800;">Verified Operations Record</strong></p>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 5px; padding: 6px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
        <div style="border-right: 1px solid #e2e8f0; padding-right: 6px;">
          <span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;">Total BOLs</span>
          <p style="font-size: 13px; font-weight: 900; color: #0f172a; margin: 0; font-family: monospace;">${activeReportData.length}</p>
        </div>
        <div style="border-right: 1px solid #e2e8f0; padding-right: 6px;">
          <span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;">Total Packages</span>
          <p style="font-size: 11.5px; font-weight: 900; color: #0f172a; margin: 0; font-family: monospace;">${Object.keys(overviewKpis.packageUnitsBreakdown || {}).length > 0 ? Object.entries(overviewKpis.packageUnitsBreakdown || {}).map(([unit, cnt]) => `${cnt.toLocaleString()} ${unit}`).join(" / ") : `${overviewKpis.totalPackages.toLocaleString()} PKGS`}</p>
        </div>
        <div style="border-right: 1px solid #e2e8f0; padding-right: 6px;">
          <span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px;">Gross / Net Weight</span>
          <p style="font-size: 12px; font-weight: 900; color: #0f172a; margin: 0; font-family: monospace;">${overviewKpis.totalGrossWeightKg.toLocaleString()} / ${overviewKpis.totalNetWeightKg.toLocaleString()} KG</p>
        </div>
        <div>
          <span style="font-size: 7.5px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.4px;">Total Goods Value</span>
          <p style="font-size: 12.5px; font-weight: 900; color: #059669; margin: 0; font-family: monospace;">$${(overviewKpis.currencyTotals.find(c => c.currency === "USD")?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
    `
    clone.prepend(printLetterhead)

    // Append official sign-off block
    const signOffBlock = document.createElement("div")
    signOffBlock.className = "print-audit-signoff mt-5 pt-3 border-t border-slate-300"
    signOffBlock.style.pageBreakInside = "avoid"
    signOffBlock.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 10px; font-size: 9px;">
        <div style="border-top: 1px dashed #94a3b8; padding-top: 4px;">
          <p style="font-weight: 800; color: #0f172a; margin: 0;">Prepared By (Logistics Officer):</p>
          <p style="color: #64748b; margin: 2px 0 0 0;">Signature & Date: ____________________</p>
        </div>
        <div style="border-top: 1px dashed #94a3b8; padding-top: 4px;">
          <p style="font-weight: 800; color: #0f172a; margin: 0;">Audited By (Operations Controller):</p>
          <p style="color: #64748b; margin: 2px 0 0 0;">Signature & Date: ____________________</p>
        </div>
        <div style="border: 1px dashed #94a3b8; border-radius: 4px; padding: 4px 6px; text-align: center;">
          <p style="font-weight: 800; color: #0f172a; margin: 0;">Management Approval & Official Stamp</p>
          <p style="color: #94a3b8; font-size: 8px; margin: 10px 0 0 0;">Official Seal / مهر و امضاء رسمی شرکت</p>
        </div>
      </div>
      <div style="margin-top: 8px; text-align: center; font-size: 7.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
        CONFIDENTIAL & OFFICIAL OPERATIONAL RECORD • SKY ARIANA BOL MANAGEMENT SYSTEM
      </div>
    `
    clone.appendChild(signOffBlock)

    printRoot.appendChild(clone)

    // Injected print CSS
    const existingStyle = document.getElementById("sky-reports-dynamic-print-style")
    if (existingStyle) existingStyle.remove()

    const isLandscape = pdfOrientation === "landscape" || activeTab === "detailed"
    const styleEl = document.createElement("style")
    styleEl.id = "sky-reports-dynamic-print-style"
    styleEl.innerHTML = `
      @page {
        size: ${isLandscape ? "A4 landscape" : "A4 portrait"} !important;
        margin: 5mm 6mm !important;
      }
      @media print {
        @page {
          size: ${isLandscape ? "A4 landscape" : "A4 portrait"} !important;
          margin: 5mm 6mm !important;
        }
        html, body {
          background: #ffffff !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #bol-print-preview-root,
        #bol-print-preview,
        [data-bol-print="true"],
        #sky-ledger-print-root,
        .ledger-print-root,
        #sky-invoice-print-root,
        .invoice-print-root {
          display: none !important;
        }
        #sky-reports-print-root,
        .reports-print-root {
          display: block !important;
          visibility: visible !important;
          width: 100% !important;
          background: #ffffff !important;
        }
        .reports-print-document table {
          display: table !important;
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          font-size: 8.5px !important;
        }
        .reports-print-document thead {
          display: table-header-group !important;
        }
        .reports-print-document thead tr {
          background: #0a2540 !important;
          color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .reports-print-document thead th {
          background: #0a2540 !important;
          color: #ffffff !important;
          border: 1px solid #334155 !important;
          padding: 3px 4px !important;
          font-size: 8.5px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
        }
        .reports-print-document tbody tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .reports-print-document tbody tr:nth-child(even) {
          background-color: #f8fafc !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .reports-print-document tbody td {
          border: 1px solid #cbd5e1 !important;
          padding: 2.5px 4px !important;
          font-size: 8.5px !important;
          line-height: 1.25 !important;
          vertical-align: middle !important;
        }
        .reports-print-document tfoot {
          display: table-footer-group !important;
        }
        .reports-print-document tfoot tr {
          background: #0a2540 !important;
          color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .reports-print-document tfoot td {
          border: 1px solid #334155 !important;
          padding: 3.5px 4px !important;
          font-weight: 900 !important;
          font-size: 9px !important;
          color: #ffffff !important;
        }
        .no-print, [data-no-print="true"], .print\\:hidden {
          display: none !important;
        }
      }
    `
    document.head.appendChild(styleEl)

    document.body.setAttribute("data-print-active", "reports")
    document.documentElement.setAttribute("data-print-active", "reports")
    document.body.setAttribute("data-print-orientation", isLandscape ? "landscape" : "portrait")
    document.documentElement.setAttribute("data-print-orientation", isLandscape ? "landscape" : "portrait")

    const cleanup = () => {
      document.body.removeAttribute("data-print-active")
      document.documentElement.removeAttribute("data-print-active")
      document.body.removeAttribute("data-print-orientation")
      document.documentElement.removeAttribute("data-print-orientation")
      const el = document.getElementById("sky-reports-dynamic-print-style")
      if (el) el.remove()
      if (printRoot) printRoot.innerHTML = ""
    }

    return cleanup
  }, [activeTab, pdfOrientation, activeReportData, overviewKpis, reportCompanyName])

  const handlePrint = useCallback(() => {
    const prevPageSize = pageSize
    setPageSize("all")
    const toastId = toast.loading("Preparing report for printing...")

    setTimeout(() => {
      try {
        const cleanup = preparePrintRoot()
        if (!cleanup) {
          toast.error("Report content not found", { id: toastId })
          setPageSize(prevPageSize)
          return
        }

        toast.dismiss(toastId)

        const handleAfterPrint = () => {
          cleanup()
          setPageSize(prevPageSize)
          window.removeEventListener("afterprint", handleAfterPrint)
        }

        window.addEventListener("afterprint", handleAfterPrint)

        // Trigger native browser print
        setTimeout(() => {
          window.print()
          setTimeout(handleAfterPrint, 4000)
        }, 150)
      } catch (err) {
        console.error("Print initialization failed:", err)
        toast.error("Failed to prepare report for printing", { id: toastId })
        setPageSize(prevPageSize)
      }
    }, 250)
  }, [pageSize, preparePrintRoot])

  // Listen for external print triggers (from top bar or Ctrl+P) and native browser print menu
  useEffect(() => {
    const onTriggerReportPrint = () => {
      handlePrint()
    }
    window.addEventListener("sky-trigger-report-print", onTriggerReportPrint)

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault()
        handlePrint()
      }
    }
    window.addEventListener("keydown", onKeyDown)

    const onBeforePrint = () => {
      if (document.body.getAttribute("data-print-active") !== "reports") {
        const prevPage = pageSize
        setPageSize("all")
        const cleanup = preparePrintRoot()
        if (cleanup) {
          const onAfter = () => {
            cleanup()
            setPageSize(prevPage)
            window.removeEventListener("afterprint", onAfter)
          }
          window.addEventListener("afterprint", onAfter)
        }
      }
    }
    window.addEventListener("beforeprint", onBeforePrint)

    return () => {
      window.removeEventListener("sky-trigger-report-print", onTriggerReportPrint)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("beforeprint", onBeforePrint)
    }
  }, [handlePrint, pageSize, preparePrintRoot])

  const handleGeneratePdf = async () => {
    if (!reportRef.current) return
    const prevPageSize = pageSize
    setPageSize("all")
    setIsGeneratingPdf(true)
    const toastId = toast.loading("Generating High-Resolution PDF Report...")

    setTimeout(async () => {
      let cleanup: (() => void) | null = null
      try {
        if (typeof document !== "undefined" && document.fonts) {
          await document.fonts.ready
        }

        cleanup = preparePrintRoot()

        // Cooperative yield so React finishes updating DOM for pageSize='all'
        await new Promise((resolve) => setTimeout(resolve, 50))

        const { toCanvas } = await import("html-to-image")
        const { jsPDF } = await import("jspdf")

        const isLandscape = pdfOrientation === "landscape"
        const element =
          document.getElementById("sky-reports-cloned-print-canvas") ||
          document.getElementById("sky-reports-print-root") ||
          reportRef.current!

        // Cooperative yield before heavy canvas capture
        await new Promise((resolve) => setTimeout(resolve, 0))

        const canvas = await toCanvas(element as HTMLElement, {
          pixelRatio: 3,
          quality: 1.0,
          cacheBust: false,
          skipFonts: true,
          backgroundColor: "#ffffff",
          style: {
            transform: "none",
            margin: "0",
            boxShadow: "none",
            opacity: "1",
            visibility: "visible",
            overflow: "visible",
            maxHeight: "none",
            height: "auto",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
          } as any,
          filter: (node: HTMLElement) => {
            const tagName = node.tagName?.toUpperCase?.()
            if (tagName === "BUTTON" || node.getAttribute?.("role") === "button") return false
            if (node.classList?.contains?.("no-print")) return false
            if (node.getAttribute?.("data-print-ignore") === "true") return false
            if (node.getAttribute?.("data-no-print") === "true") return false
            return true
          },
        })

        const imgData = canvas.toDataURL("image/jpeg", 0.99)
        if (!imgData || imgData === "data:,") {
          throw new Error("Failed to capture report visually. Please ensure the report is visible on screen.")
        }
        const pdf = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
        })

        const pdfWidth = isLandscape ? 297 : 210
        const pdfHeight = isLandscape ? 210 : 297
        const imgProps = pdf.getImageProperties(imgData)
        const canvasHeightMM = (imgProps.height * pdfWidth) / imgProps.width

        if (activeTab === "overview") {
          // Force Overview to fit on exactly 1 page
          let finalHeightMM = canvasHeightMM
          let finalWidthMM = pdfWidth
          
          if (canvasHeightMM > pdfHeight) {
            finalHeightMM = pdfHeight
            finalWidthMM = (imgProps.width * pdfHeight) / imgProps.height
          }
          
          const xOffset = (pdfWidth - finalWidthMM) / 2
          pdf.addImage(imgData, "JPEG", xOffset, 0, finalWidthMM, finalHeightMM, undefined, "SLOW")
        } else {
          // Multi-page logic for Detailed, Shippers, Commodities, etc.
          let heightLeft = canvasHeightMM
          let position = 0

          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, canvasHeightMM, undefined, "SLOW")
          heightLeft -= pdfHeight

          while (heightLeft > 0) {
            position -= pdfHeight
            pdf.addPage()
            pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, canvasHeightMM, undefined, "SLOW")
            heightLeft -= pdfHeight
          }
        }

        // Add page numbering & corporate footer to each page of the PDF
        const totalPdfPages = (pdf.internal as any).getNumberOfPages ? (pdf.internal as any).getNumberOfPages() : 1
        for (let i = 1; i <= totalPdfPages; i++) {
          pdf.setPage(i)
          pdf.setFontSize(8)
          pdf.setTextColor(148, 163, 184)
          pdf.text(
            `${reportCompanyName || "AQ COMPANIES"}  •  ${activeTab.toUpperCase()} REPORT  •  Page ${i} of ${totalPdfPages}  •  ${new Date().toLocaleDateString("en-GB")}`,
            pdfWidth - 8,
            pdfHeight - 3,
            { align: "right" }
          )
        }

        const sanitizedCompany = (reportCompanyName || "AQ-COMPANIES").trim().replace(/[^a-zA-Z0-9_-]/g, "_")
        const filename = `${sanitizedCompany}-${activeTab.toUpperCase()}-Report-${new Date().toISOString().split("T")[0]}.pdf`
        pdf.save(filename)

        // Record in history
        const entry: ReportHistoryEntry = {
          id: `hist-${Date.now()}`,
          reportName: `${activeTab.toUpperCase()} PDF Report`,
          reportType: activeTab,
          createdDate: new Date().toISOString(),
          createdBy: "System Administrator",
          filterRange: `${filteredData.length} records`,
          recordCount: activeReportData.length,
          fileName: filename,
        }
        addReportHistoryEntry(entry)
        setReportHistory(getReportHistory())
        toast.success("PDF Report Generated Successfully", { id: toastId })
      } catch (err) {
        console.error("PDF generation failed:", err)
        toast.error("Failed to generate PDF report", { id: toastId })
      } finally {
        if (cleanup) cleanup()
        setIsGeneratingPdf(false)
        setPageSize(prevPageSize)
      }
    }, 350)
  }

  // Preset operations
  const handleSaveFilter = (name: string, crit: ReportFilterCriteria) => {
    const preset: SavedFilterPreset = {
      id: `filter-${Date.now()}`,
      name,
      criteria: crit,
      createdAt: new Date().toISOString(),
    }
    saveFilterPreset(preset)
    setSavedFilters(getSavedFilterPresets())
  }

  const handleDeleteFilter = (id: string) => {
    deleteFilterPreset(id)
    setSavedFilters(getSavedFilterPresets())
  }

  const handleApplyPreset = (preset: SavedReportPreset) => {
    setActiveTab(preset.reportType)
    setAdvancedFilters(preset.filters || {})
    setPdfOrientation(preset.orientation === "portrait" ? "portrait" : "landscape")
    setIncludeCharts(preset.includeCharts)
    setIncludeCover(preset.includeCover)
    toast.success(`Loaded report preset: ${preset.name}`)
  }

  const handleSaveCurrentReportPreset = () => {
    const name = prompt("Enter a name for this report preset:")
    if (!name?.trim()) return
    const preset: SavedReportPreset = {
      id: `rep-preset-${Date.now()}`,
      name: name.trim(),
      reportType: activeTab,
      filters: advancedFilters,
      groupBy: "None",
      orientation: pdfOrientation,
      includeCharts,
      includeCover,
      createdAt: new Date().toISOString(),
    }
    saveReportPreset(preset)
    setSavedReportPresets(getSavedReportPresets())
    toast.success(`Saved preset "${name.trim()}"`)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden print:h-auto print:overflow-visible bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="print:hidden sticky top-0 z-20 flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        {/* ROW 1: Branding, Back Navigation, Subtitle & Personalization Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 sm:py-3 gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimeout(() => {
                  startTransition(() => {
                    onClose()
                  })
                }, 0)
              }}
              className="rounded-xl border-slate-200 dark:border-slate-700 h-9 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 shrink-0 pointer-events-none" />
              <span>Saved BOLs</span>
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0"></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h1 className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50 flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                  <span>REPORT CENTER</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0">
                  OPERATIONS & MANAGEMENT
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Saved BOL • Shipment • Logistics • Financial Analytics
              </p>
            </div>
          </div>

          {/* Row 1 Right: Saved Views & More Actions (Ample space, never clipped) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Saved Views Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shrink-0 cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none"
                  title="Load or manage saved views and presets"
                >
                  <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Saved Views</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 font-sans p-1.5 shadow-lg">
                <DropdownMenuLabel className="text-[11px] font-black uppercase text-slate-400 px-2 py-1">
                  Saved Configurations
                </DropdownMenuLabel>
                {savedReportPresets.map((preset) => {
                  const isCurrentDefault = preset.isDefault || defaultPreset?.id === preset.id
                  return (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="flex items-center justify-between text-xs font-semibold py-2 px-2 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Bookmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{preset.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleSetDefaultPreset(preset.id, e)}
                          title={isCurrentDefault ? "Current Default View" : "Set as Default View"}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
                            isCurrentDefault ? "text-amber-500 font-bold" : "text-slate-300 hover:text-slate-600"
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSaveCurrentReportPreset}
                  className="text-xs font-bold text-blue-700 dark:text-blue-400 cursor-pointer py-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5 mr-2" />
                  Save Current View As...
                </DropdownMenuItem>
                {defaultPreset && (
                  <DropdownMenuItem
                    onClick={() => {
                      setDefaultReportPreset(null)
                      setSavedReportPresets(getSavedReportPresets())
                      toast.info("Cleared default view")
                    }}
                    className="text-xs font-semibold text-slate-500 cursor-pointer py-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                    Reset Default View
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs shrink-0 cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none"
                  title="More actions and exports"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  <span>More</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 font-sans shadow-lg">
                <DropdownMenuLabel className="text-xs font-bold text-slate-500">Document Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handlePrint} className="text-xs font-bold cursor-pointer">
                  <Printer className="w-4 h-4 mr-2 text-slate-600" />
                  Print Report (Ctrl+P)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="text-xs font-bold text-blue-700 cursor-pointer">
                  <FileDown className="w-4 h-4 mr-2" />
                  Download PDF ({pdfOrientation})
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-bold text-slate-500">Data Exports</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExportExcel("all")} className="text-xs font-bold text-emerald-700 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx) — Complete (12 Sheets)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel("current")} className="text-xs font-bold text-emerald-800 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx) — Active View ({activeTab})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="text-xs font-bold cursor-pointer">
                  <FileText className="w-4 h-4 mr-2 text-slate-500" />
                  CSV File
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-bold text-slate-500">Communications</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleCopyWhatsAppSummary} className="text-xs font-bold text-emerald-600 cursor-pointer">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Copy WhatsApp Summary
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ROW 2: ACTION TOOLBAR (View Layout, Company Selector, Primary Exports) */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2 gap-2.5 bg-slate-50/70 dark:bg-slate-900/60">
          {/* Left Group: View & Organization Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Settings Group */}
            <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFitScreen(!isFitScreen)}
                className={"h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none " + (isFitScreen ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100")}
                title={isFitScreen ? "Standard width" : "Fit to width"}
              >
                {isFitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={"h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none " + (isPreviewMode ? "bg-slate-800 text-white dark:bg-blue-600" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100")}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                <span>{isPreviewMode ? "Exit Preview" : "A4 Preview"}</span>
              </Button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setPdfOrientation("landscape")}
                className={"px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none " + (pdfOrientation === "landscape" ? "bg-slate-800 text-white dark:bg-blue-600" : "text-slate-600 hover:bg-slate-100")}
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setPdfOrientation("portrait")}
                className={"px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none " + (pdfOrientation === "portrait" ? "bg-slate-800 text-white dark:bg-blue-600" : "text-slate-600 hover:bg-slate-100")}
              >
                Portrait
              </button>
            </div>

            {/* Report Company Selector */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 h-9 shadow-2xs gap-1.5 shrink-0" title="Company name displayed on printed report">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                type="text"
                value={reportCompanyName}
                onChange={(e) => setReportCompanyName(e.target.value)}
                placeholder="AQ COMPANIES"
                className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight bg-transparent focus:outline-none w-28 sm:w-36"
              />
            </div>
          </div>

          {/* Right Group: Primary Export Actions (Print, PDF, Excel) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handlePrint}
              className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Print this report / Save as PDF (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Print Report</span>
            </Button>

            <Button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 disabled:opacity-60 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Download complete report as PDF file"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 rounded-xl border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all hover:shadow-xs active:scale-95 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
                  title="Export report dataset to Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600/70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 font-sans shadow-xl border-emerald-200 dark:border-emerald-800">
                <DropdownMenuLabel className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Excel (.xlsx) Export Options
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => handleExportExcel("all")}
                  className="text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer py-2 focus:bg-emerald-50 dark:focus:bg-emerald-950/50"
                >
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Complete Audit Workbook (12 Sheets)
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal pl-5">
                      Full multi-sheet workbook with KPI summary, fleet, and financials
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleExportExcel("current")}
                  className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer py-2 focus:bg-slate-100 dark:focus:bg-slate-800"
                >
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5">
                      <FileDown className="w-3.5 h-3.5 text-blue-600" />
                      Active View Only ({activeTab.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal pl-5">
                      Lightweight export of current {activeTab} tab + Summary
                    </span>
                  </div>
                </DropdownMenuItem>

                {selectedIds.length > 0 && (
                  <DropdownMenuItem
                    onClick={() => handleExportExcel("all")}
                    className="text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer py-2 focus:bg-amber-50 dark:focus:bg-amber-950/50"
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                        Selected Rows Only ({selectedIds.length} BOLs)
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal pl-5">
                        Exports complete workbook filtered to selected items
                      </span>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Unified Global Report Filter Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Row 1: Search, Quick Dates, Advanced Filters Toggle, Clear All */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search BOL, Shipper, Cargo, Truck, Invoice..."
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick Date Filters Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "7days", label: "7 Days" },
                { id: "30days", label: "30 Days" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_year", label: "This Year" },
              ].map((btn) => {
                const isSelected =
                  (btn.id === "all" && !advancedFilters.dateFrom && !advancedFilters.dateTo) ||
                  quickDate === btn.id
                return (
                  <button
                    key={btn.id}
                    onClick={() => handleQuickDateSelect(btn.id as QuickDate)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer [&_span]:pointer-events-none [&_svg]:pointer-events-none ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {btn.label}
                  </button>
                )
              })}
            </div>

            {/* Right side: Advanced Filters & Clear */}
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`h-9 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold [&_span]:pointer-events-none [&_svg]:pointer-events-none ${
                  activeFiltersCount > 0
                    ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                <Filter className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Advanced Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="h-9 px-3 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
                  title="Clear all active filters"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Row 2: Quick Dimension Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
            {/* Shipper Select */}
            <select
              value={advancedFilters.shipper || ""}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, shipper: e.target.value || undefined }))}
              className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 truncate focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="">All Shippers ({filterOptions.shippers.length})</option>
              {filterOptions.shippers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Consignee Select */}
            <select
              value={advancedFilters.consignee || ""}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, consignee: e.target.value || undefined }))}
              className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 truncate focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="">All Consignees ({filterOptions.consignees.length})</option>
              {filterOptions.consignees.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Commodity Select */}
            <select
              value={advancedFilters.commodity || ""}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, commodity: e.target.value || undefined }))}
              className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 truncate focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="">All Commodities ({filterOptions.commodities.length})</option>
              {filterOptions.commodities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Route Select */}
            <select
              value={advancedFilters.route || ""}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, route: e.target.value || undefined }))}
              className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 truncate focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="">All Routes ({filterOptions.routes.length})</option>
              {filterOptions.routes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Equipment / Container Select */}
            <select
              value={advancedFilters.containerType || "all"}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, containerType: e.target.value === "all" ? undefined : e.target.value }))}
              className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 truncate focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="all">All Equipment</option>
              <option value="Reefer">Reefer Containers</option>
              <option value="Dry">Dry Containers</option>
              <option value="40 FT">40 FT Containers</option>
              <option value="20 FT">20 FT Containers</option>
              <option value="40 HC">40 FT High Cube</option>
              <option value="40 RF">40 FT Reefer</option>
            </select>

            {/* Audit / Missing Data Select */}
            <select
              value={advancedFilters.missingData || "all"}
              onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, missingData: e.target.value === "all" ? undefined : (e.target.value as any) }))}
              className="h-8.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 truncate focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="all">Audit: All Records</option>
              <option value="container">Missing Container</option>
              <option value="invoice">Missing Invoice</option>
              <option value="truck">Missing Truck</option>
              <option value="driver">Missing Driver</option>
              <option value="route">Missing Route</option>
              <option value="rate">Missing Rate</option>
              <option value="pdf">Missing PDF</option>
            </select>
          </div>

          {/* Row 3: Removable Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Active:</span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {(advancedFilters.dateFrom || advancedFilters.dateTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold text-[11px]">
                  Date: {advancedFilters.dateFrom || "Start"} ➜ {advancedFilters.dateTo || "Today"}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.dateFrom; delete n.dateTo; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.shipper && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold text-[11px]">
                  Shipper: {advancedFilters.shipper}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.shipper; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.consignee && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 font-bold text-[11px]">
                  Consignee: {advancedFilters.consignee}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.consignee; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.commodity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold text-[11px]">
                  Commodity: {advancedFilters.commodity}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.commodity; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.route && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-900 dark:text-cyan-200 font-bold text-[11px]">
                  Route: {advancedFilters.route}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.route; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.truckNumber && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold text-[11px]">
                  Truck: {advancedFilters.truckNumber}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.truckNumber; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.containerType && advancedFilters.containerType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 font-bold text-[11px]">
                  Container: {advancedFilters.containerType}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.containerType; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {advancedFilters.missingData && advancedFilters.missingData !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-bold text-[11px]">
                  Missing: {advancedFilters.missingData}
                  <button onClick={() => setAdvancedFilters((p) => { const n = { ...p }; delete n.missingData; return n })} className="hover:text-red-500 ml-1">×</button>
                </span>
              )}

              {drillDownEntity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[11px]">
                  {drillDownEntity.type.toUpperCase()}: {drillDownEntity.name}
                  <button onClick={() => setDrillDownEntity(null)} className="hover:text-red-200 ml-1">×</button>
                </span>
              )}

              <button
                onClick={handleClearAllFilters}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 underline ml-auto cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Top 8 Executive KPI Dashboard Cards (Always in sync with current filters) */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-2.5">
            {/* 1. Total BOLs */}
            <div
              onClick={() => handleSwitchTab("detailed")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view in Detailed Report"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-blue-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Total BOLs</span>
                <FileText className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1 truncate" title={`${filteredData.length} BOLs`}>
                {filteredData.length}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                {filteredData.length === baseData.length ? (
                  `${baseData.length} Total Records`
                ) : (
                  <span className="text-blue-600 font-extrabold">{filteredData.length} Filtered</span>
                )}
              </p>
            </div>

            {/* 2. Total Packages */}
            <div
              onClick={() => handleSwitchTab("detailed")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view in Detailed Report"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Packages</span>
                <Boxes className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-indigo-700 dark:text-indigo-400 mt-1 truncate" title={`${overviewKpis.totalPackages.toLocaleString()} Packages`}>
                {overviewKpis.totalPackages.toLocaleString()}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5" title={Object.entries(overviewKpis.packageUnitsBreakdown || {}).map(([unit, cnt]) => `${cnt.toLocaleString()} ${unit}`).join(" • ") || "Total Packages"}>
                {Object.keys(overviewKpis.packageUnitsBreakdown || {}).length > 0
                  ? Object.entries(overviewKpis.packageUnitsBreakdown || {})
                      .map(([unit, cnt]) => `${cnt.toLocaleString()} ${unit}`)
                      .join(" • ")
                  : "Cartons / CTNS"}
              </p>
            </div>

            {/* 3. Net Weight */}
            <div
              onClick={() => handleSwitchTab("detailed")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view in Detailed Report"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Net Weight</span>
                <Scale className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 truncate" title={`${overviewKpis.totalNetWeightKg.toLocaleString()} KG Net Weight`}>
                {overviewKpis.totalNetWeightKg.toLocaleString()} <span className="text-xs font-bold text-slate-500 font-sans">KG</span>
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">KG Net Weight</p>
            </div>

            {/* 4. Gross Weight */}
            <div
              onClick={() => handleSwitchTab("detailed")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view in Detailed Report"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-slate-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Gross Weight</span>
                <Scale className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-800 dark:text-slate-200 mt-1 truncate" title={`${overviewKpis.totalGrossWeightKg.toLocaleString()} KG Gross Weight`}>
                {overviewKpis.totalGrossWeightKg.toLocaleString()} <span className="text-xs font-bold text-slate-500 font-sans">KG</span>
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">KG Gross Weight</p>
            </div>

            {/* 5. Goods Value */}
            <div
              onClick={() => handleSwitchTab("financial")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view Financial Breakdown"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Goods Value</span>
                <DollarSign className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 truncate" title={`$${(overviewKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                ${(overviewKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                {overviewKpis.currencyTotals.filter((c) => c.currency !== "USD" && c.amount > 0).length > 0
                  ? overviewKpis.currencyTotals
                      .filter((c) => c.currency !== "USD" && c.amount > 0)
                      .map((c) => `+ ${c.amount.toLocaleString()} ${c.currency}`)
                      .join(" ")
                  : "USD Base"}
              </p>
            </div>

            {/* 6. Active Shippers */}
            <div
              onClick={() => handleSwitchTab("shippers")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view Shippers list"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-blue-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Active Shippers</span>
                <Building2 className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1 truncate" title={`${overviewKpis.totalShippers} Active Shippers`}>
                {overviewKpis.totalShippers}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">Exporters / Vendors</p>
            </div>

            {/* 7. Active Consignees */}
            <div
              onClick={() => handleSwitchTab("consignees")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-purple-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view Consignees list"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-purple-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Consignees</span>
                <Users className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-purple-700 dark:text-purple-400 mt-1 truncate" title={`${overviewKpis.totalConsignees} Consignees`}>
                {overviewKpis.totalConsignees}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">Importers / Receivers</p>
            </div>

            {/* 8. Missing Data / Quality */}
            <div
              onClick={() => handleSwitchTab("missing_data")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-amber-400 cursor-pointer transition-all hover:shadow-xs group min-w-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none"
              title="Click to view Data Completeness Audit"
            >
              <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-600">
                <span className="text-[10px] font-black uppercase tracking-wider">Missing Data</span>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1 truncate" title={`${overviewKpis.missingDataCount || 0} Missing Data Records`}>
                {overviewKpis.missingDataCount || 0}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  {overviewKpis.dataQualityScore || 100}% Score
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Drill-down Breadcrumb (if active) */}
        {drillDownEntity && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
              <span className="text-slate-500 dark:text-slate-400">Report Center</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="capitalize">{drillDownEntity.type}s</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-700 dark:text-blue-400 font-black">{drillDownEntity.name}</span>
              <span className="text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded-full ml-2 font-mono">
                {filteredData.length} records
              </span>
            </div>
            <button
              onClick={() => setDrillDownEntity(null)}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline cursor-pointer"
            >
              Clear Drill-down
            </button>
          </div>
        )}

        {/* Tab Navigation (Responsive Primary Tabs + More Reports Dropdown) */}
        {(() => {
          const primaryTabs = [
            { id: "overview" as ReportTab, label: "Overview", icon: Layers },
            { id: "operations" as ReportTab, label: "Operations Reports", icon: Truck },
            { id: "detailed" as ReportTab, label: "Detailed Report", icon: FileText },
            { id: "shippers" as ReportTab, label: "Shippers", icon: Building2 },
            { id: "consignees" as ReportTab, label: "Consignees", icon: Users },
            { id: "commodities" as ReportTab, label: "Commodities", icon: Boxes },
            { id: "routes" as ReportTab, label: "Routes", icon: Navigation },
            { id: "financial" as ReportTab, label: "Financial", icon: DollarSign },
          ]

          const secondaryTabs = [
            { id: "destinations" as ReportTab, label: "Destinations", icon: Compass },
            { id: "containers" as ReportTab, label: "Containers", icon: Boxes },
            { id: "trucks" as ReportTab, label: "Trucks", icon: Truck },
            { id: "monthly" as ReportTab, label: "Monthly", icon: Calendar },
            {
              id: "missing_data" as ReportTab,
              label: "Missing Data",
              icon: AlertTriangle,
              badge: (overviewKpis.missingDataCount || 0) > 0 ? overviewKpis.missingDataCount : undefined,
            },
            { id: "saved_reports" as ReportTab, label: "Saved Reports", icon: Bookmark },
          ]

          const activeSecondary = secondaryTabs.find((t) => t.id === activeTab)
          const isSecondaryActive = Boolean(activeSecondary)
          const secondaryBadgeTotal = secondaryTabs.reduce((sum, t) => sum + (t.badge || 0), 0)

          return (
            <div className="flex items-center gap-1 px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
              {primaryTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSwitchTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer shrink-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none ${
                      isActive
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}

              {/* Secondary Tabs / More Reports Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer shrink-0 [&_span]:pointer-events-none [&_svg]:pointer-events-none ${
                      isSecondaryActive
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                    title="Additional reports and analytics"
                  >
                    {activeSecondary ? (
                      <>
                        <activeSecondary.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{activeSecondary.label}</span>
                        {activeSecondary.badge !== undefined && (
                          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            {activeSecondary.badge}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        <span>More Reports</span>
                        {secondaryBadgeTotal > 0 && (
                          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            {secondaryBadgeTotal}
                          </span>
                        )}
                      </>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 font-sans p-1.5 shadow-lg">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                    Additional Reports
                  </DropdownMenuLabel>
                  {secondaryTabs.map((tab) => {
                    const Icon = tab.icon
                    const isTabActive = activeTab === tab.id
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => handleSwitchTab(tab.id)}
                        className={`flex items-center justify-between text-xs font-bold py-2 px-2.5 cursor-pointer rounded-lg [&_span]:pointer-events-none [&_svg]:pointer-events-none ${
                          isTabActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-black"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isTabActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                          <span className="truncate">{tab.label}</span>
                        </div>
                        {tab.badge !== undefined && (
                          <span className="ml-2 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                            {tab.badge}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })()}
      </div>

      {/* 2. MAIN REPORT CANVAS */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isFitScreen ? "p-1 sm:p-1.5 md:p-2" : "p-2 sm:p-3 md:p-4"} print:p-0 print:overflow-visible bg-slate-100/50 dark:bg-slate-950/80 print:bg-white`}>
        <div
          ref={reportRef}
          className={`mx-auto bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800 print:bg-white print:border-none print:shadow-none transition-all duration-200 ${
            isPreviewMode
              ? pdfOrientation === "landscape"
                ? "w-[1100px] min-h-[750px] p-8 my-6 rounded-2xl shadow-xl"
                : "w-[800px] min-h-[1100px] p-8 my-6 rounded-2xl shadow-xl"
              : isFitScreen
                ? "w-full max-w-none p-2 sm:p-3 my-0 rounded-xl"
                : "w-full min-w-0 max-w-full p-3 sm:p-4 md:p-5 my-0 rounded-xl"
          }`}
        >
          {/* Optional Professional Cover Page (rendered when requested for PDF/Print) */}
          {includeCover && (
            <div
              className="p-12 mb-12 border-b-4 border-blue-900 text-white rounded-2xl print:rounded-none"
              style={{ background: "linear-gradient(180deg, #0f172a 0%, #172554 100%)" }}
            >
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 overflow-hidden shadow-md">
                  <img
                    src={AQ_COMPANIES_LOGO_SRC}
                    alt="AQ COMPANIES"
                    className="w-full h-full object-contain filter drop-shadow-sm brightness-110"
                  />
                </div>
                <div className="text-right text-xs text-blue-200">
                  <p className="font-black text-sm text-white uppercase tracking-wide">{reportCompanyName || "AQ COMPANIES"}</p>
                  <p>International Transport & Logistics</p>
                </div>
              </div>

              <div className="mt-16 mb-12">
                <span className="text-xs font-black uppercase tracking-widest text-blue-400">
                  Operational Logistics Intelligence
                </span>
                <h1 className="text-4xl font-black mt-2 tracking-tight">
                  OPERATIONS & SHIPMENT REPORT
                </h1>
                <p className="text-lg text-blue-200 mt-2 capitalize">
                  {activeTab.replace("_", " ")} Analytics & Financial Overview
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-blue-800 text-xs text-blue-200">
                <div>
                  <span className="text-blue-400 uppercase font-black text-[10px]">Generated Date</span>
                  <p className="font-bold text-white mt-1">{new Date().toLocaleDateString("en-GB")}</p>
                </div>
                <div>
                  <span className="text-blue-400 uppercase font-black text-[10px]">Prepared By</span>
                  <p className="font-bold text-white mt-1">System Administrator</p>
                </div>
                <div>
                  <span className="text-blue-400 uppercase font-black text-[10px]">Records Audited</span>
                  <p className="font-bold text-white mt-1">{filteredData.length} Bills of Lading</p>
                </div>
              </div>
            </div>
          )}

          {/* Standard Report Top Title Header */}
          <div
            data-report-header="true"
            className="border-b-2 border-slate-900 pb-4 mb-6 print:hidden flex flex-col sm:flex-row justify-between items-start gap-4 break-inside-avoid"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
                <img
                  src={AQ_COMPANIES_LOGO_SRC}
                  alt="AQ COMPANIES"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                    {reportCompanyName || "AQ COMPANIES"}
                  </h1>
                  <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                    Official Manifest
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  International Transport & Multi-Modal Logistics
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-black text-blue-900 uppercase">
                    {activeTab.replace("_", " ")} REPORT
                  </span>
                  {selectedIds.length > 0 && (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Selected: {selectedIds.length} of {filteredData.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-xs font-semibold text-slate-600 space-y-1 border-l-2 border-slate-200 pl-4">
              <p className="flex justify-end gap-2">
                <span className="text-slate-400">Generated:</span>
                <span className="font-bold text-slate-900">
                  {new Date().toLocaleDateString("en-GB")} - {new Date().toLocaleTimeString()}
                </span>
              </p>
              <p className="flex justify-end gap-2">
                <span className="text-slate-400">Audited Scope:</span>
                <span className="font-bold text-slate-900">{filteredData.length} BOL Records</span>
              </p>
              <p className="flex justify-end gap-2">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-700">Verified Read-Only</span>
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* OPERATIONS REPORTS (PHASE 3) */}
          {/* ======================================================== */}
          {activeTab === "operations" && (
            <OperationsReportTab
              allDocs={filteredData}
              initialPeriod={initialPeriod}
              onOpenBol={(id) => {
                if (onLoadDocument) onLoadDocument(id, "preview")
              }}
              onEditBol={(id) => {
                if (onLoadDocument) onLoadDocument(id, "editor")
              }}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 10 Primary KPI Cards */}
              <div
                data-report-kpi-grid="true"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 gap-3 print:gap-1.5 print:mb-2.5 break-inside-avoid print:break-inside-avoid"
              >
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total BOLs</p>
                  <p className="text-2xl print:text-lg font-black text-slate-950 font-mono mt-1 print:mt-0.5">{overviewKpis.totalBols}</p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Shipments</p>
                  <p className="text-2xl print:text-lg font-black text-slate-900 font-mono mt-1 print:mt-0.5">{overviewKpis.totalShipments}</p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Packages</p>
                  <p className="text-2xl print:text-lg font-black text-blue-700 font-mono mt-1 print:mt-0.5">
                    {overviewKpis.totalPackages.toLocaleString()}
                  </p>
                  <p className="text-[10px] print:text-[8px] font-bold text-slate-500 truncate mt-0.5">
                    {Object.keys(overviewKpis.packageUnitsBreakdown || {}).length > 0
                      ? Object.entries(overviewKpis.packageUnitsBreakdown || {})
                          .map(([unit, cnt]) => `${cnt.toLocaleString()} ${unit}`)
                          .join(" • ")
                      : "Packages"}
                  </p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Net Weight</p>
                  <p className="text-2xl print:text-lg font-black text-amber-700 font-mono mt-1 print:mt-0.5">
                    {overviewKpis.totalNetWeightKg.toLocaleString()} <span className="text-xs print:text-[9px]">KG</span>
                  </p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Gross Weight</p>
                  <p className="text-2xl print:text-lg font-black text-slate-800 font-mono mt-1 print:mt-0.5">
                    {overviewKpis.totalGrossWeightKg.toLocaleString()} <span className="text-xs print:text-[9px]">KG</span>
                  </p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Containers</p>
                  <p className="text-2xl print:text-lg font-black text-purple-700 font-mono mt-1 print:mt-0.5">{overviewKpis.totalContainers}</p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Shippers</p>
                  <p className="text-2xl print:text-lg font-black text-slate-900 font-mono mt-1 print:mt-0.5">{overviewKpis.totalShippers}</p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Total Consignees</p>
                  <p className="text-2xl print:text-lg font-black text-slate-900 font-mono mt-1 print:mt-0.5">{overviewKpis.totalConsignees}</p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-slate-50/70 print:bg-slate-50/60 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Destinations</p>
                  <p className="text-2xl print:text-lg font-black text-slate-900 font-mono mt-1 print:mt-0.5">{overviewKpis.totalDestinations}</p>
                </div>
                <div
                  data-report-kpi-card="true"
                  className="p-3.5 print:p-2 rounded-xl print:rounded-lg border border-emerald-200 print:border-emerald-300 bg-emerald-50/50 print:bg-emerald-50/40 break-inside-avoid print:break-inside-avoid"
                >
                  <p className="text-[10px] print:text-[8.5px] font-black text-emerald-800 uppercase tracking-wider">Goods Value (USD)</p>
                  <p className="text-2xl print:text-lg font-black text-emerald-700 font-mono mt-1 print:mt-0.5">
                    ${(overviewKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              {/* Multi-Currency Declaration Box */}
              {overviewKpis.currencyTotals.length > 1 && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Declared Goods Value By Currency (Segregated)
                  </span>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {overviewKpis.currencyTotals.map((c) => (
                      <div key={c.currency} className="flex items-center gap-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-400">{c.currency}:</span>
                        <span className="text-slate-900">
                          {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auxiliary Metrics Bar */}
              <div
                data-report-aux-grid="true"
                className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2 text-xs print:text-[10px] print:mb-3 break-inside-avoid print:break-inside-avoid"
              >
                <div
                  data-report-aux-card="true"
                  className="p-3 print:p-1.5 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-white flex items-center justify-between"
                >
                  <span className="text-slate-500 font-bold">PDF Documents:</span>
                  <span className="font-mono font-black text-slate-900">
                    {overviewKpis.bolsWithPdf} <span className="text-slate-400 font-normal">/ {overviewKpis.totalBols}</span>
                  </span>
                </div>
                <div
                  data-report-aux-card="true"
                  className="p-3 print:p-1.5 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-white flex items-center justify-between"
                >
                  <span className="text-slate-500 font-bold">Export vs Import:</span>
                  <span className="font-mono font-black text-blue-700">
                    {overviewKpis.exportShipments} <span className="text-slate-400 font-normal">/ {overviewKpis.importShipments}</span>
                  </span>
                </div>
                <div
                  data-report-aux-card="true"
                  className="p-3 print:p-1.5 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-white flex items-center justify-between"
                >
                  <span className="text-slate-500 font-bold">Reefer Containers:</span>
                  <span className="font-mono font-black text-cyan-700">{overviewKpis.reeferContainers}</span>
                </div>
                <div
                  data-report-aux-card="true"
                  className="p-3 print:p-1.5 rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-white flex items-center justify-between"
                >
                  <span className="text-slate-500 font-bold">Dry Containers:</span>
                  <span className="font-mono font-black text-slate-700">{overviewKpis.dryContainers}</span>
                </div>
              </div>

              {/* Period Comparison Card (if enabled) */}
              {periodComparison && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                        Period Comparison ({periodComparison.comparisonLabel})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-white border border-blue-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">BOLs</p>
                      <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
                        {periodComparison.bols.current}
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold mt-1">
                        {periodComparison.bols.isNew ? (
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">New</span>
                        ) : periodComparison.bols.direction === "up" ? (
                          <span className="text-emerald-700 flex items-center">↑ {periodComparison.bols.changePercent}%</span>
                        ) : periodComparison.bols.direction === "down" ? (
                          <span className="text-red-600 flex items-center">↓ {Math.abs(periodComparison.bols.changePercent)}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                        <span className="text-[10px] text-slate-400">prev: {periodComparison.bols.previous}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-blue-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Net Weight</p>
                      <p className="text-xl font-black font-mono text-slate-900 mt-0.5">
                        {periodComparison.weightKg.current.toLocaleString()} <span className="text-[10px]">KG</span>
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold mt-1">
                        {periodComparison.weightKg.isNew ? (
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">New</span>
                        ) : periodComparison.weightKg.direction === "up" ? (
                          <span className="text-emerald-700 flex items-center">↑ {periodComparison.weightKg.changePercent}%</span>
                        ) : periodComparison.weightKg.direction === "down" ? (
                          <span className="text-red-600 flex items-center">↓ {Math.abs(periodComparison.weightKg.changePercent)}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                        <span className="text-[10px] text-slate-400">prev: {periodComparison.weightKg.previous.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-blue-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Goods Value (USD)</p>
                      <p className="text-xl font-black font-mono text-emerald-700 mt-0.5">
                        ${periodComparison.goodsValueUsd.current.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold mt-1">
                        {periodComparison.goodsValueUsd.isNew ? (
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">New</span>
                        ) : periodComparison.goodsValueUsd.direction === "up" ? (
                          <span className="text-emerald-700 flex items-center">↑ {periodComparison.goodsValueUsd.changePercent}%</span>
                        ) : periodComparison.goodsValueUsd.direction === "down" ? (
                          <span className="text-red-600 flex items-center">↓ {Math.abs(periodComparison.goodsValueUsd.changePercent)}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                        <span className="text-[10px] text-slate-400">prev: ${periodComparison.goodsValueUsd.previous.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-blue-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Containers</p>
                      <p className="text-xl font-black font-mono text-purple-700 mt-0.5">
                        {periodComparison.containers.current}
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold mt-1">
                        {periodComparison.containers.isNew ? (
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">New</span>
                        ) : periodComparison.containers.direction === "up" ? (
                          <span className="text-emerald-700 flex items-center">↑ {periodComparison.containers.changePercent}%</span>
                        ) : periodComparison.containers.direction === "down" ? (
                          <span className="text-red-600 flex items-center">↓ {Math.abs(periodComparison.containers.changePercent)}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                        <span className="text-[10px] text-slate-400">prev: {periodComparison.containers.previous}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Section */}
              <ReportCharts data={filteredData} includeCharts={includeCharts} chartView="overview" />

              {/* Management Summary Snapshot */}
              <div
                data-report-summary="true"
                className="p-5 print:p-3.5 rounded-2xl print:rounded-lg border border-slate-200 print:border-slate-300 bg-white space-y-4 print:space-y-2 break-inside-avoid print:break-inside-avoid print:mt-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    Executive Management Summary
                  </h3>
                  <span className="text-xs text-slate-400">Compact Operational Overview</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 text-xs">
                  {/* Top Shippers Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="font-black text-slate-600 mb-2 uppercase text-[10px] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Top Shippers
                      </p>
                      <div className="space-y-1.5">
                        {shippersList.slice(0, 4).map((s, idx) => (
                          <div key={s.shipperName} className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold truncate max-w-[130px] text-slate-800" title={s.shipperName}>
                              {idx + 1}. {s.shipperName}
                            </span>
                            <span className="font-mono font-bold text-slate-900 shrink-0">{s.bolCount} BOLs</span>
                          </div>
                        ))}
                        {shippersList.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No shippers recorded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Commodities Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="font-black text-slate-600 mb-2 uppercase text-[10px] flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-blue-600" />
                        Top Commodities
                      </p>
                      <div className="space-y-1.5">
                        {commoditiesList.slice(0, 4).map((c, idx) => (
                          <div key={c.commodityName} className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold truncate max-w-[130px] text-slate-800" title={c.commodityName}>
                              {idx + 1}. {c.commodityName}
                            </span>
                            <span className="font-mono font-bold text-blue-700 shrink-0">{c.bolCount} BOLs</span>
                          </div>
                        ))}
                        {commoditiesList.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No commodities recorded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Destinations Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="font-black text-slate-600 mb-2 uppercase text-[10px] flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-purple-600" />
                        Transit Hubs & Ports
                      </p>
                      <div className="space-y-1.5">
                        {destinationsList.slice(0, 4).map((d, idx) => (
                          <div key={d.locationName} className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold truncate max-w-[130px] text-slate-800" title={d.locationName}>
                              {idx + 1}. {d.locationName}
                            </span>
                            <span className="font-mono font-bold text-purple-700 shrink-0">{d.bolCount} BOLs</span>
                          </div>
                        ))}
                        {destinationsList.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No destinations recorded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Afghan Border Stations */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="font-black text-slate-600 mb-2 uppercase text-[10px] flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                        Border Crossings
                      </p>
                      <div className="space-y-1.5">
                        {borderStationsSummary.slice(0, 4).map(([station, stats], idx) => (
                          <div key={station} className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold truncate max-w-[130px] text-slate-800" title={station}>
                              {idx + 1}. {station.split(" ")[0]}
                            </span>
                            <span className="font-mono font-bold text-emerald-700 shrink-0">{stats.bols} BOLs</span>
                          </div>
                        ))}
                        {borderStationsSummary.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No border crossings</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Driver Freight Rent Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="font-black text-slate-600 mb-2 uppercase text-[10px] flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-amber-600" />
                        Driver Freight Rent
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(driverRentSummary).map(([curr, data]) => (
                          <div key={curr} className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-mono text-[9.5px] font-bold">
                                {curr}
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans">({data.count} trucks)</span>
                            </span>
                            <span className="font-mono font-bold text-amber-800 shrink-0">
                              {data.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        {Object.keys(driverRentSummary).length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No driver rent recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* TAB 2: DETAILED REPORT */}
          {/* ======================================================== */}
          {activeTab === "detailed" && (
            <div className="space-y-4">
              {drillDownEntity && (
                <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black uppercase tracking-wider text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">
                      Filtered by {drillDownEntity.type}
                    </span>
                    <span className="font-extrabold text-sm text-slate-950 dark:text-white">
                      {drillDownEntity.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      ({filteredData.length} matching {filteredData.length === 1 ? "record" : "records"})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDrillDownEntity(null)}
                    className="h-7 px-2.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  >
                    Clear Filter ✕
                  </Button>
                </div>
              )}
              <DetailedReportTable
                documents={baseData}
                filteredDocuments={filteredData}
                overviewKpis={overviewKpis}
                selectedDocIds={selectedIds}
                onToggleSelectId={(id) => {
                  setSelectedIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )
                }}
                onSelectAllFiltered={selectAllFiltered}
                onClearSelection={clearSelection}
                onSelectPage={(pageIds) => {
                  const allIn = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
                  if (allIn) {
                    setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
                  } else {
                    const combined = new Set([...selectedIds, ...pageIds])
                    setSelectedIds(Array.from(combined))
                  }
                }}
                onOpenQuickView={(doc) => setQuickViewDoc(doc)}
                onEditBol={(id) => {
                  if (onLoadDocument) {
                    onClose()
                    onLoadDocument(id, "form")
                  }
                }}
                onOpenPreview={(id) => {
                  if (onLoadDocument) {
                    onClose()
                    onLoadDocument(id, "preview")
                  }
                }}
                onPrintReport={handlePrint}
                onDownloadPdf={handleGeneratePdf}
                onExportExcel={handleExportExcel}
                isGeneratingPdf={isGeneratingPdf}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SHIPPERS REPORT */}
          {/* ======================================================== */}
          {activeTab === "shippers" && (
            <div className="space-y-4">
              <ReportDataTable<ShipperSummary>
                data={shippersList}
                columns={shipperColumns}
                defaultSortColumn="bolCount"
                defaultSortDirection="desc"
                searchPlaceholder="Search commercial shippers, commodities, destinations..."
                searchFilter={(s, q) =>
                  s.shipperName.toLowerCase().includes(q) ||
                  (s.topCommodity || "").toLowerCase().includes(q) ||
                  (s.topConsignee || "").toLowerCase().includes(q) ||
                  (s.topDestination || "").toLowerCase().includes(q) ||
                  (s.commodities || []).some((c) => c.toLowerCase().includes(q))
                }
                summaryMetrics={shipperSummaryMetrics}
                onRowClick={(s) => openDetailDrawerForEntity("shipper", s.shipperName)}
                emptyMessage="No commercial shippers match your filter criteria."
                tableAriaLabel="Commercial Shippers Report"
                renderMobileCard={(s) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs">{s.shipperName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {s.bolCount} BOLs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Packages</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{s.packages.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Net WT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{s.netWeightKg.toLocaleString()} KG</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Goods Value</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${(s.goodsValueByCurrency["USD"] || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Top Cargo</span>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200 block">{s.topCommodity || "-"}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px]">{s.lastShipmentDate ? formatDisplayDate(s.lastShipmentDate) : ""}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CONSIGNEES REPORT */}
          {/* ======================================================== */}
          {activeTab === "consignees" && (
            <div className="space-y-4">
              <ReportDataTable<ConsigneeSummary>
                data={consigneesList}
                columns={consigneeColumns}
                defaultSortColumn="bolCount"
                defaultSortDirection="desc"
                searchPlaceholder="Search receivers, suppliers, destinations..."
                searchFilter={(c, q) =>
                  c.consigneeName.toLowerCase().includes(q) ||
                  (c.topShipper || "").toLowerCase().includes(q) ||
                  (c.topCommodity || "").toLowerCase().includes(q) ||
                  (c.topDestination || "").toLowerCase().includes(q) ||
                  (c.commodities || []).some((comm) => comm.toLowerCase().includes(q))
                }
                summaryMetrics={consigneeSummaryMetrics}
                onRowClick={(c) => openDetailDrawerForEntity("consignee", c.consigneeName)}
                emptyMessage="No consignees or receivers match your filter criteria."
                tableAriaLabel="Consignees and Receivers Report"
                renderMobileCard={(c) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs">{c.consigneeName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {c.bolCount} BOLs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Packages</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.packages.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Net WT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.netWeightKg.toLocaleString()} KG</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Goods Value</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${(c.goodsValueByCurrency["USD"] || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Top Shipper</span>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200 block">{c.topShipper || "-"}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px]">{c.topDestination || ""}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: COMMODITIES REPORT */}
          {/* ======================================================== */}
          {activeTab === "commodities" && (
            <div className="space-y-4">
              <ReportDataTable<CommoditySummary>
                data={commoditiesList}
                columns={commodityColumns}
                defaultSortColumn="bolCount"
                defaultSortDirection="desc"
                searchPlaceholder="Search cargo types, shippers, destinations..."
                searchFilter={(c, q) =>
                  c.commodityName.toLowerCase().includes(q) ||
                  (c.topShipper || "").toLowerCase().includes(q) ||
                  (c.topConsignee || "").toLowerCase().includes(q) ||
                  c.destinations.some((d) => d.toLowerCase().includes(q))
                }
                summaryMetrics={commoditySummaryMetrics}
                onRowClick={(c) => openDetailDrawerForEntity("commodity", c.commodityName)}
                emptyMessage="No cargo commodities match your filter criteria."
                tableAriaLabel="Commodities and Cargo Report"
                renderMobileCard={(c) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs">{c.commodityName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {c.bolCount} BOLs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Packages</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.packages.toLocaleString()} {c.packageUnit || "CTNS"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Net WT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.netWeightKg.toLocaleString()} KG</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Goods Value</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${(c.goodsValueByCurrency["USD"] || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Top Shipper</span>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200 block">{c.topShipper || "-"}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: DESTINATIONS REPORT */}
          {/* ======================================================== */}
          {activeTab === "destinations" && (
            <div className="space-y-4">
              <ReportDataTable<DestinationSummary>
                data={destinationsList}
                columns={destinationColumns}
                defaultSortColumn="bolCount"
                defaultSortDirection="desc"
                searchPlaceholder="Search transit hubs, ports, countries..."
                searchFilter={(d, q) =>
                  d.locationName.toLowerCase().includes(q) ||
                  (d.country || "").toLowerCase().includes(q) ||
                  (d.topShipper || "").toLowerCase().includes(q) ||
                  (d.topCommodity || "").toLowerCase().includes(q) ||
                  d.topShippers.some((s) => s.toLowerCase().includes(q))
                }
                summaryMetrics={destinationSummaryMetrics}
                onRowClick={(d) => openDetailDrawerForEntity("destination", d.locationName)}
                emptyMessage="No transit hubs or delivery destinations match your filter criteria."
                tableAriaLabel="Destinations and Transit Hubs Report"
                renderMobileCard={(d) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-xs block">{d.locationName}</span>
                        {d.country && <span className="text-[10px] text-slate-400 font-bold uppercase">{d.country}</span>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {d.bolCount} BOLs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Net WT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{d.netWeightKg.toLocaleString()} KG</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Goods Value</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${(d.goodsValueByCurrency["USD"] || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: ROUTES & TRANSIT CORRIDORS REPORT */}
          {/* ======================================================== */}
          {activeTab === "routes" && (
            <div className="space-y-4">
              <ReportDataTable<RouteSummary>
                data={routesList}
                columns={routeColumns}
                defaultSortColumn="bolCount"
                defaultSortDirection="desc"
                searchPlaceholder="Search corridors, origins, destinations, border crossings..."
                searchFilter={(r, q) =>
                  r.routePath.toLowerCase().includes(q) ||
                  r.origin.toLowerCase().includes(q) ||
                  r.destination.toLowerCase().includes(q) ||
                  (r.borderCrossing || "").toLowerCase().includes(q) ||
                  (r.via || "").toLowerCase().includes(q)
                }
                summaryMetrics={routeSummaryMetrics}
                onRowClick={(r) => openDetailDrawerForEntity("route", r.routePath)}
                emptyMessage="No transit route records found in the filtered dataset."
                tableAriaLabel="Transit Routes and Corridors Report"
                renderMobileCard={(r) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs leading-snug">{r.routePath}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                        {r.bolCount} BOLs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Reefer / Dry</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{r.reeferCount} RF / {r.dryCount} Dry</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Net WT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{r.netWeightKg.toLocaleString()} KG</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: CONTAINERS REPORT */}
          {/* ======================================================== */}
          {activeTab === "containers" && (
            <div className="space-y-6">
              {/* Container Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                  <p className="text-xl font-black font-mono text-slate-900 mt-0.5">{containerStats.total}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-slate-400">Dry</p>
                  <p className="text-xl font-black font-mono text-slate-700 mt-0.5">{containerStats.dry}</p>
                </div>
                <div className="p-3 rounded-xl border border-cyan-200 bg-cyan-50">
                  <p className="text-[10px] font-black uppercase text-cyan-800">Reefer</p>
                  <p className="text-xl font-black font-mono text-cyan-700 mt-0.5">{containerStats.reefer}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-slate-400">20 FT</p>
                  <p className="text-xl font-black font-mono text-slate-900 mt-0.5">{containerStats.twentyFt}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-slate-400">40 FT</p>
                  <p className="text-xl font-black font-mono text-slate-900 mt-0.5">{containerStats.fortyFt}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-slate-400">40 HC</p>
                  <p className="text-xl font-black font-mono text-slate-900 mt-0.5">{containerStats.fortyHc}</p>
                </div>
                <div className="p-3 rounded-xl border border-cyan-200 bg-cyan-50">
                  <p className="text-[10px] font-black uppercase text-cyan-800">40 RF</p>
                  <p className="text-xl font-black font-mono text-cyan-700 mt-0.5">{containerStats.fortyRf}</p>
                </div>
              </div>

              {/* Containers Table */}
              <ReportDataTable<ContainerRecord>
                data={containerList}
                columns={containerColumns}
                defaultSortColumn="date"
                defaultSortDirection="desc"
                searchPlaceholder="Search container numbers, types, BOLs, shippers..."
                searchFilter={(c, q) =>
                  c.containerNumber.toLowerCase().includes(q) ||
                  c.containerType.toLowerCase().includes(q) ||
                  c.bolNumber.toLowerCase().includes(q) ||
                  c.shipper.toLowerCase().includes(q) ||
                  c.consignee.toLowerCase().includes(q) ||
                  c.commodity.toLowerCase().includes(q) ||
                  c.origin.toLowerCase().includes(q) ||
                  c.destination.toLowerCase().includes(q)
                }
                summaryMetrics={containerSummaryMetrics}
                onRowClick={(c) => openDetailDrawerForEntity("container", c.containerNumber)}
                emptyMessage="No container equipment records found in the filtered dataset."
                tableAriaLabel="Containers and Equipment Report"
                renderMobileCard={(c) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-black text-slate-900 dark:text-white text-xs">{c.containerNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                        {c.containerType}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">BOL Number</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{c.bolNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Shipper</span>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200 block">{c.shipper}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: TRUCKS & FLEET ACTIVITY REPORT */}
          {/* ======================================================== */}
          {activeTab === "trucks" && (
            <div className="space-y-4">
              <ReportDataTable<TruckSummary>
                data={trucksList}
                columns={truckColumns}
                defaultSortColumn="bolCount"
                defaultSortDirection="desc"
                searchPlaceholder="Search truck plates, drivers, corridors, shippers..."
                searchFilter={(t, q) =>
                  t.truckNumber.toLowerCase().includes(q) ||
                  t.lastDriver.toLowerCase().includes(q) ||
                  (t.lastDriverPhone || "").toLowerCase().includes(q) ||
                  (t.plateRegion || "").toLowerCase().includes(q) ||
                  (t.topRoute || "").toLowerCase().includes(q) ||
                  t.topShipper.toLowerCase().includes(q) ||
                  t.routesUsed.some((r) => r.toLowerCase().includes(q))
                }
                summaryMetrics={truckSummaryMetrics}
                onRowClick={(t) => openDetailDrawerForEntity("truck", t.truckNumber)}
                emptyMessage="No truck fleet records found in the filtered dataset."
                tableAriaLabel="Trucks and Fleet Activity Report"
                renderMobileCard={(t) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs block">{t.truckNumber}</span>
                        {t.plateRegion && <span className="text-[10px] text-slate-400 font-bold uppercase">{t.plateRegion}</span>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {t.bolCount} Shipments
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Driver</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{t.lastDriver || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Driver Rent</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          {(Object.entries(t.totalDriverRent || {}) as [string, number][]).map(([curr, amt]) => `${curr} ${amt.toLocaleString()}`).join(", ") || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: MONTHLY OPERATIONS REPORT */}
          {/* ======================================================== */}
          {activeTab === "monthly" && (
            <div className="space-y-6">
              {/* Year Filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-500">Year Filter:</span>
                  <select
                    value={monthlyYear}
                    onChange={(e) => setMonthlyYear(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Years</option>
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {monthlySummaries.length} operating months recorded
                </span>
              </div>

              {/* 4 Interactive Recharts Charts */}
              <ReportCharts
                data={filteredData}
                includeCharts={includeCharts}
                selectedYear={monthlyYear}
                chartView="monthly"
              />

              {/* Monthly Table */}
              <ReportDataTable<MonthlySummary>
                data={monthlySummaries}
                columns={monthlyColumns}
                defaultSortColumn="monthKey"
                defaultSortDirection="desc"
                searchPlaceholder="Search operating months..."
                searchFilter={(m, q) =>
                  m.monthLabel.toLowerCase().includes(q) || m.monthKey.toLowerCase().includes(q)
                }
                summaryMetrics={monthlySummaryMetrics}
                onRowClick={(m) => openDetailDrawerForEntity("month", m.monthLabel)}
                emptyMessage="No monthly operational data for the selected period."
                tableAriaLabel="Monthly Operations Report"
                renderMobileCard={(m) => (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs">{m.monthLabel}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {m.bolCount} BOLs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Packages</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{m.packages.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Net WT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{m.netWeightKg.toLocaleString()} KG</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Goods Value</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${(m.goodsValueByCurrency["USD"] || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Shippers</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{m.shipperCount} Active</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">Filter Detailed BOLs →</span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 9: FINANCIAL REPORT */}
          {/* ======================================================== */}
          {activeTab === "financial" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-amber-900 flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Multi-Currency Demarcation Principle</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Goods values in different currencies are never added together. Totals, averages, and rankings are calculated separately per base currency.
                  </p>
                </div>
              </div>

              {/* Currency Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.entries(financialMetrics.currencyTotals) as [string, number][]).map(([curr, total]) => {
                  const avg = financialMetrics.averageValuePerBol[curr] || 0
                  return (
                    <div key={curr} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                      <span className="text-[10px] font-black uppercase text-slate-400">Total Declared ({curr})</span>
                      <p className="text-2xl font-black font-mono text-slate-900 mt-1">
                        {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex justify-between text-[11px] text-slate-600">
                        <span>Average / BOL:</span>
                        <span className="font-bold font-mono">
                          {avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {curr}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* High & Low Value Transactions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {financialMetrics.highestValue && (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs">
                    <span className="text-[10px] font-black uppercase text-emerald-800">Highest Value Transaction</span>
                    <p className="text-2xl font-black font-mono text-emerald-800 mt-1">
                      {financialMetrics.highestValue.amount.toLocaleString()} {financialMetrics.highestValue.currency}
                    </p>
                    <p className="text-xs text-emerald-950 font-bold mt-1">
                      BOL: <span className="font-mono">{financialMetrics.highestValue.bolNumber}</span> • Shipper: {financialMetrics.highestValue.shipper}
                    </p>
                  </div>
                )}

                {financialMetrics.lowestValue && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400">Lowest Value Transaction</span>
                    <p className="text-2xl font-black font-mono text-slate-800 mt-1">
                      {financialMetrics.lowestValue.amount.toLocaleString()} {financialMetrics.lowestValue.currency}
                    </p>
                    <p className="text-xs text-slate-700 font-bold mt-1">
                      BOL: <span className="font-mono">{financialMetrics.lowestValue.bolNumber}</span> • Shipper: {financialMetrics.lowestValue.shipper}
                    </p>
                  </div>
                )}
              </div>

              {/* Monthly Financial Breakdown Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Monthly Operational Financial Audit
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Real stored amounts only • Invariance satisfied
                  </span>
                </div>
                <ReportDataTable<FinancialMonthlyRow>
                  data={financialMonthlyRows}
                  columns={financialColumns}
                  defaultSortColumn="monthKey"
                  defaultSortDirection="desc"
                  searchPlaceholder="Search operating months..."
                  searchFilter={(r, q) =>
                    r.monthLabel.toLowerCase().includes(q) || r.monthKey.toLowerCase().includes(q)
                  }
                  summaryMetrics={financialSummaryMetrics}
                  onRowClick={(r) => openDetailDrawerForEntity("month", r.monthLabel)}
                  emptyMessage="No financial operations recorded in the selected period."
                  tableAriaLabel="Monthly Financial Summary"
                  renderMobileCard={(r) => (
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-xs">{r.monthLabel}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {r.bolCount} BOLs
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Goods Value (USD)</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${r.goodsValueUsd.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Driver Rent</span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {r.driverRentAfn > 0 ? `AFN ${r.driverRentAfn.toLocaleString()}` : r.driverRentUsd > 0 ? `$${r.driverRentUsd.toLocaleString()}` : "-"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                          Incomplete
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">View Details →</span>
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Value by Shipper & Destination Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-100 font-black text-xs text-slate-900 uppercase">
                    Goods Value by Shipper (USD Top 10)
                  </div>
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-200">
                      {financialMetrics.byShipper.map((s, i) => (
                        <tr key={`${s.name}-${i}`} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800 truncate max-w-[180px]">
                            {i + 1}. {s.name}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            ${(s.currencyTotals["USD"] || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-100 font-black text-xs text-slate-900 uppercase">
                    Goods Value by Destination (USD Top 10)
                  </div>
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-200">
                      {financialMetrics.byDestination.map((d, i) => (
                        <tr key={`${d.name}-${i}`} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800 truncate max-w-[180px]">
                            {i + 1}. {d.name}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            ${(d.currencyTotals["USD"] || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 10: MISSING DATA & DATA QUALITY */}
          {/* ======================================================== */}
          {activeTab === "missing_data" && (
            <div className="space-y-6">
              {/* Quality Score Overview */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-600 bg-white flex flex-col items-center justify-center font-black text-blue-900 shadow-sm">
                    <span className="text-xl leading-none">{dataQualityAudit.qualityScorePercent}%</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Score</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Data Quality & Completeness Audit</h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {dataQualityAudit.totalRecords} Total BOLs • {dataQualityAudit.completeRecords} Complete •{" "}
                      <span className="text-amber-700 font-bold">{dataQualityAudit.attentionRecords} Need Attention</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-800 font-bold">
                    Critical: {dataQualityAudit.issues.filter((i) => i.severity === "critical").reduce((s, i) => s + i.missingCount, 0)}
                  </div>
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold">
                    Warning: {dataQualityAudit.issues.filter((i) => i.severity === "warning").reduce((s, i) => s + i.missingCount, 0)}
                  </div>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold">
                    Optional: {dataQualityAudit.issues.filter((i) => i.severity === "optional").reduce((s, i) => s + i.missingCount, 0)}
                  </div>
                </div>
              </div>

              {/* Missing Fields Breakdown Grouped by Category */}
              {(() => {
                const categoryOrder: Array<"Shipper" | "Consignee" | "Route" | "Truck" | "Weight" | "Other"> = [
                  "Shipper",
                  "Consignee",
                  "Route",
                  "Truck",
                  "Weight",
                  "Other",
                ]

                const groupedIssues = categoryOrder
                  .map((catName) => {
                    const catIssues = dataQualityAudit.issues.filter(
                      (i) => getMissingFieldCategory(i.field) === catName
                    )
                    const totalMissing = catIssues.reduce((sum, i) => sum + i.missingCount, 0)
                    return {
                      category: catName,
                      issues: catIssues,
                      totalMissing,
                    }
                  })
                  .filter((g) => g.issues.length > 0)

                return (
                  <div className="space-y-4">
                    {groupedIssues.map((group) => (
                      <div
                        key={group.category}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                      >
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              {group.category} Fields
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {group.issues.length} {group.issues.length === 1 ? "field" : "fields"}
                            </span>
                          </div>
                          <span className={`text-[11px] font-mono font-bold ${group.totalMissing > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {group.totalMissing} total missing entries
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                              <tr>
                                <th className="py-2 px-3 font-extrabold">Field Name</th>
                                <th className="py-2 px-3 font-extrabold">Severity</th>
                                <th className="py-2 px-3 font-extrabold text-center">Missing Count</th>
                                <th className="py-2 px-3 font-extrabold">Impact Description</th>
                                <th className="py-2 px-3 font-extrabold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {group.issues.map((issue, idx) => (
                                <tr key={`${issue.field}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                  <td className="py-2.5 px-3 font-black text-slate-900 dark:text-slate-100">{issue.label}</td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                        issue.severity === "critical"
                                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                          : issue.severity === "warning"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      }`}
                                    >
                                      {issue.severity}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-slate-950 dark:text-slate-50">
                                    {issue.missingCount}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                    {issue.severity === "critical"
                                      ? "Essential transport document requirement"
                                      : issue.severity === "warning"
                                      ? "Operational tracking or routing detail missing"
                                      : "Supplementary reference or attached file"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedIds(issue.affectedDocIds)
                                        setActiveTab("detailed")
                                        toast.info(`Filtered ${issue.affectedDocIds.length} BOLs missing ${issue.label}`)
                                      }}
                                      className="h-7 text-xs rounded-lg font-bold"
                                    >
                                      View Affected BOLs
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Duplicate Detection Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Duplicate Candidates & Collision Detection
                    </h3>
                    <p className="text-xs text-slate-500">
                      Non-destructive inspection of identical or suspiciously similar records
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {possibleDuplicates.length} candidate groups
                  </span>
                </div>

                {possibleDuplicates.length === 0 ? (
                  <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                    Zero Duplicate Collisions Detected across BOL numbers, Invoices, Containers and Trucks.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {possibleDuplicates.map((dup, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between gap-4 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                              {dup.reason}
                            </span>
                            <span className="font-mono font-black text-slate-900">{dup.identifier}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">
                            Found in {dup.docs.length} records:{" "}
                            {dup.docs.map((d) => d.bol_number || d.id).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setQuickViewDoc(dup.docs[0])}
                            className="h-7 text-xs rounded-lg font-bold"
                          >
                            Inspect First
                          </Button>
                          {dup.docs[1] && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setQuickViewDoc(dup.docs[1])}
                              className="h-7 text-xs rounded-lg font-bold"
                            >
                              Inspect Second
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 11: SAVED REPORTS & HISTORY */}
          {/* ======================================================== */}
          {activeTab === "saved_reports" && (
            <div className="space-y-6">
              {/* Presets Grid */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-600" />
                  Saved Report Presets (Regenerate on Live Data)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {savedReportPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {preset.reportType}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-2">{preset.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Orientation: {preset.orientation} • Charts: {preset.includeCharts ? "Yes" : "No"}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <Button
                          size="sm"
                          onClick={() => handleApplyPreset(preset)}
                          className="h-7 text-xs bg-blue-600 font-bold rounded-lg"
                        >
                          Open Live Report
                        </Button>
                        <button
                          onClick={() => {
                            deleteReportPreset(preset.id)
                            setSavedReportPresets(getSavedReportPresets())
                            toast.info(`Deleted preset ${preset.name}`)
                          }}
                          className="text-xs text-slate-400 hover:text-red-600 font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export History */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    Report Generation History Log
                  </h3>
                  {reportHistory.length > 0 && (
                    <span className="text-xs text-slate-400 font-semibold">
                      {reportHistory.length} exports logged
                    </span>
                  )}
                </div>

                {reportHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No reports generated yet in this session. Exporting PDF or Excel will record an entry here.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2.5 px-3 font-bold text-slate-700">Report Name</th>
                          <th className="py-2.5 px-3 font-bold text-slate-700">Type</th>
                          <th className="py-2.5 px-3 font-bold text-slate-700">Records</th>
                          <th className="py-2.5 px-3 font-bold text-slate-700">Generated Date</th>
                          <th className="py-2.5 px-3 font-bold text-slate-700">User</th>
                          <th className="py-2.5 px-3 font-bold text-slate-700">File Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportHistory.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{h.reportName}</td>
                            <td className="py-2 px-3 uppercase text-[10px] text-slate-500 font-mono">{h.reportType}</td>
                            <td className="py-2 px-3 font-mono font-bold text-blue-700">{h.recordCount}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{new Date(h.createdDate).toLocaleString()}</td>
                            <td className="py-2 px-3 text-slate-700">{h.createdBy}</td>
                            <td className="py-2 px-3 font-mono text-slate-500 truncate max-w-[200px]">{h.fileName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Printable Report Footer */}
          <div className="hidden print:flex items-center justify-between mt-8 pt-3 border-t border-slate-200 text-[9px] font-bold text-slate-500 break-inside-avoid">
            <span>{reportCompanyName || "AQ COMPANIES"} • OPERATIONS REPORT CENTER</span>
            <span>AUDITED REPORT • {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* 3. BOL QUICK-VIEW DRAWER */}
      <BolQuickView
        doc={quickViewDoc}
        onClose={() => setQuickViewDoc(null)}
        onEditBol={(id) => {
          if (onLoadDocument) {
            onClose()
            onLoadDocument(id, "form")
          }
        }}
        onOpenPreview={(id) => {
          if (onLoadDocument) {
            onClose()
            onLoadDocument(id, "preview")
          }
        }}
      />

      {/* 4. ADVANCED FILTERS DRAWER */}
      <AdvancedFiltersDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        criteria={advancedFilters}
        onApply={(crit) => {
          setAdvancedFilters(crit)
          toast.success("Filters applied")
        }}
        savedPresets={savedFilters}
        onSavePreset={handleSaveFilter}
        onDeletePreset={handleDeleteFilter}
      />

      {/* 5. ENTITY DETAIL DRILL-DOWN DRAWER */}
      <ReportDetailDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
        entityType={drawerState.entityType}
        entityName={drawerState.entityName}
        entityBadge={drawerState.entityBadge}
        kpis={drawerState.kpis}
        breakdowns={drawerState.breakdowns}
        recentBols={drawerState.recentBols}
        matchingCount={drawerState.matchingCount}
        onViewMatchingBols={() =>
          handleViewMatchingBols(drawerState.entityType, drawerState.entityName)
        }
        onOpenBolQuickView={(doc) => setQuickViewDoc(doc)}
      />
    </div>
  )
}
