"use client"

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react"
import {
  SavedDocument,
  ReportTab,
  ComparisonMode,
  ReportFilterCriteria,
  SavedFilterPreset,
  SavedReportPreset,
  ReportHistoryEntry,
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
} from "@/lib/reports/grouping"
import {
  auditDataQuality,
  detectPossibleDuplicates,
} from "@/lib/reports/data-quality"
import { exportReportToExcel } from "@/lib/reports/export-excel"
import {
  getSavedFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
  getSavedReportPresets,
  saveReportPreset,
  deleteReportPreset,
  getReportHistory,
  addReportHistoryEntry,
} from "@/lib/reports/history-storage"
import {
  formatDisplayDate,
  isRtlText,
  extractInvoiceNo,
  extractTruckNo
} from "@/lib/reports/parsers"
import { OperationsReportTab } from "./operations-report-tab"
import { OperationsPeriodType } from "@/lib/reports/types"
import { ReportCharts } from "./report-charts"
import { BolQuickView } from "./bol-quick-view"
import { AdvancedFiltersDrawer } from "./advanced-filters"
import { buildManagementSummary } from "@/lib/whatsapp/bulk-message"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import { Button } from "@/components/ui/button"

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
  const [drillDownEntity, setDrillDownEntity] = useState<{
    type: "shipper" | "consignee" | "commodity" | "destination" | "missing_field"
    name: string
  } | null>(null)

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
  const [isFitScreen, setIsFitScreen] = useState(true)
  const [tableDensity, setTableDensity] = useState<"compact" | "normal">("compact")
  const [reportCompanyName, setReportCompanyName] = useState<string>("AQ COMPANIES")
  const reportRef = useRef<HTMLDivElement>(null)

  // Preset & History Storage
  const [savedFilters, setSavedFilters] = useState<SavedFilterPreset[]>([])
  const [savedReportPresets, setSavedReportPresets] = useState<SavedReportPreset[]>([])
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([])

  useEffect(() => {
    setSavedFilters(getSavedFilterPresets())
    setSavedReportPresets(getSavedReportPresets())
    setReportHistory(getReportHistory())
  }, [])

  // 1. Resolve Active Dataset based on Filters and Drill-downs
  const baseData = useMemo(() => {
    // Start with all documents from parent
    return documents
  }, [documents])

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
          (d) => (d.shipper_name || "").toLowerCase() === drillDownEntity.name.toLowerCase()
        )
      } else if (drillDownEntity.type === "consignee") {
        result = result.filter(
          (d) => (d.consignee_name || "").toLowerCase() === drillDownEntity.name.toLowerCase()
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
      }
    }

    return result
  }, [baseData, advancedFilters, searchQuery, drillDownEntity])

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

  // 2. Shared Calculation Engine Outputs
  const overviewKpis = useMemo(() => {
    return calculateOverviewKpis(filteredData)
  }, [filteredData])

  const periodComparison = useMemo(() => {
    return calculatePeriodComparison(filteredData, baseData, comparisonMode)
  }, [filteredData, baseData, comparisonMode])

  const shippersList = useMemo(() => groupShippers(filteredData), [filteredData])
  const consigneesList = useMemo(() => groupConsignees(filteredData), [filteredData])
  const commoditiesList = useMemo(() => groupCommodities(filteredData), [filteredData])
  const destinationsList = useMemo(() => groupDestinations(filteredData), [filteredData])
  const { containers: containerList, stats: containerStats } = useMemo(
    () => groupContainers(filteredData),
    [filteredData]
  )
  const monthlySummaries = useMemo(
    () => groupMonthly(filteredData, monthlyYear),
    [filteredData, monthlyYear]
  )
  const financialMetrics = useMemo(
    () => calculateFinancialMetrics(filteredData),
    [filteredData]
  )
  const dataQualityAudit = useMemo(() => auditDataQuality(filteredData), [filteredData])
  const possibleDuplicates = useMemo(
    () => detectPossibleDuplicates(filteredData),
    [filteredData]
  )

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
  const handleExportExcel = async () => {
    const toastId = toast.loading("Generating Excel (.xlsx) Report...")
    try {
      await exportReportToExcel(
        activeReportData,
        `Sky-Ariana-${activeTab.toUpperCase()}-Report`
      )
      toast.dismiss(toastId)
      toast.success("Excel (.xlsx) report generated successfully")

      // Record in history
      const entry: ReportHistoryEntry = {
        id: `hist-${Date.now()}`,
        reportName: `${activeTab.toUpperCase()} Operations Report`,
        reportType: activeTab,
        createdDate: new Date().toISOString(),
        createdBy: "System Administrator",
        filterRange: `${filteredData.length} records`,
        recordCount: activeReportData.length,
        fileName: `Sky-Ariana-${activeTab.toUpperCase()}-Report.xlsx`,
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

    // Prepend executive letterhead banner to print root
    const printLetterhead = document.createElement("div")
    printLetterhead.className = "print-letterhead-banner mb-3 border-b-2 border-slate-900 pb-2.5"
    printLetterhead.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 6px;">
        <div>
          <h1 style="font-size: 19px; font-weight: 900; color: #0a2540; text-transform: uppercase; margin: 0; letter-spacing: -0.5px;">${reportCompanyName || "AQ COMPANIES"}</h1>
          <p style="font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 2px 0 0 0; letter-spacing: 0.8px;">SKY ARIANA • INTERNATIONAL FREIGHT & MULTI-MODAL LOGISTICS MANAGEMENT</p>
          <p style="font-size: 11px; font-weight: 800; color: #1e3a8a; margin: 3px 0 0 0; text-transform: uppercase;">MASTER BILL OF LADING AUDIT & SHIPMENT MANIFEST (گزارش جامع بارنامه‌ها)</p>
        </div>
        <div style="text-align: right; font-size: 9px; font-weight: 600; color: #475569; line-height: 1.4;">
          <p style="margin: 0;"><span style="color: #64748b;">Audit Date:</span> <strong style="color: #0f172a; font-family: monospace;">${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString()}</strong></p>
          <p style="margin: 0;"><span style="color: #64748b;">Audited Records:</span> <strong style="color: #0f172a; font-family: monospace;">${activeReportData.length} Bills of Lading</strong></p>
          <p style="margin: 0;"><span style="color: #64748b;">Verification:</span> <strong style="color: #059669;">Verified Operations Record</strong></p>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px; padding: 5px 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
        <div><span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total BOLs</span><p style="font-size: 12px; font-weight: 900; color: #0f172a; margin: 0; font-family: monospace;">${activeReportData.length}</p></div>
        <div><span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Packages</span><p style="font-size: 12px; font-weight: 900; color: #0f172a; margin: 0; font-family: monospace;">${overviewKpis.totalPackages.toLocaleString()} CTNS</p></div>
        <div><span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Gross / Net Weight</span><p style="font-size: 12px; font-weight: 900; color: #0f172a; margin: 0; font-family: monospace;">${overviewKpis.totalGrossWeightKg.toLocaleString()} / ${overviewKpis.totalNetWeightKg.toLocaleString()} KG</p></div>
        <div><span style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Goods Value</span><p style="font-size: 12px; font-weight: 900; color: #059669; margin: 0; font-family: monospace;">$${(overviewKpis.currencyTotals.find(c => c.currency === "USD")?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
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
          pixelRatio: 2,
          quality: 0.98,
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
          },
          filter: (node: HTMLElement) => {
            const tagName = node.tagName?.toUpperCase?.()
            if (tagName === "BUTTON" || node.getAttribute?.("role") === "button") return false
            if (node.classList?.contains?.("no-print")) return false
            if (node.getAttribute?.("data-print-ignore") === "true") return false
            if (node.getAttribute?.("data-no-print") === "true") return false
            return true
          },
        })

        const imgData = canvas.toDataURL("image/jpeg", 0.98)
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
          pdf.addImage(imgData, "JPEG", xOffset, 0, finalWidthMM, finalHeightMM, undefined, "FAST")
        } else {
          // Multi-page logic for Detailed, Shippers, Commodities, etc.
          let heightLeft = canvasHeightMM
          let position = 0

          pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, canvasHeightMM, undefined, "FAST")
          heightLeft -= pdfHeight

          while (heightLeft > 0) {
            position -= pdfHeight
            pdf.addPage()
            pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, canvasHeightMM, undefined, "FAST")
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
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl border-slate-200 dark:border-slate-700 h-9 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Saved BOLs
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  REPORT CENTER
                </h1>
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Operations & Management
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Saved BOL • Shipment • Logistics • Financial Analytics
              </p>
            </div>
          </div>

          
          {/* Quick Actions (Fit Screen, Preview, Print, PDF, Excel, CSV) */}
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
            {/* View Settings Group */}
            <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFitScreen(!isFitScreen)}
                className={"h-8 px-2 rounded-lg text-xs font-bold transition-all " + (isFitScreen ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100")}
                title={isFitScreen ? "Standard width" : "Fit to width"}
              >
                {isFitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={"h-8 px-2.5 rounded-lg text-xs font-bold transition-all " + (isPreviewMode ? "bg-slate-800 text-white dark:bg-blue-600" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100")}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                {isPreviewMode ? "Exit Preview" : "A4 Preview"}
              </Button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setPdfOrientation("landscape")}
                className={"px-2.5 py-1 text-xs font-bold rounded-lg transition-all " + (pdfOrientation === "landscape" ? "bg-slate-800 text-white dark:bg-blue-600" : "text-slate-600 hover:bg-slate-100")}
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setPdfOrientation("portrait")}
                className={"px-2.5 py-1 text-xs font-bold rounded-lg transition-all " + (pdfOrientation === "portrait" ? "bg-slate-800 text-white dark:bg-blue-600" : "text-slate-600 hover:bg-slate-100")}
              >
                Portrait
              </button>
            </div>

            {/* Report Company Name */}
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

            {/* Direct Action Buttons: Print Report, Download PDF, Export Excel */}
            <Button
              onClick={handlePrint}
              className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
              title="Print this report / Save as PDF (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Print Report</span>
            </Button>

            <Button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 disabled:opacity-60"
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

            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="h-9 px-3 rounded-xl border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0 hidden sm:flex"
              title="Export report dataset to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs shrink-0">
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  More
                  <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 font-sans">
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
                <DropdownMenuItem onClick={handleExportExcel} className="text-xs font-bold text-emerald-700 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
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

        {/* Search & Filter Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search report data (BOL, Shipper, Cargo, Container, Truck...)"
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
            {/* Filter Drawer Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`h-9 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold ${
                Object.keys(advancedFilters).length > 0 ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700" : ""
              }`}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Advanced Filters
              {Object.keys(advancedFilters).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                  {Object.keys(advancedFilters).length}
                </span>
              )}
            </Button>

            {/* Compare Period Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-black uppercase text-slate-400">Compare:</span>
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
                className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="off">Compare: Off</option>
                <option value="previous_period">Previous Period</option>
                <option value="previous_month">Previous Month</option>
                <option value="previous_year">Previous Year</option>
              </select>
            </div>

            {/* Save Report Preset */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveCurrentReportPreset}
              className="h-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              title="Save current report parameters as a preset"
            >
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              Save Preset
            </Button>
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "operations", label: "Operations Reports", icon: Truck },
            { id: "detailed", label: "Detailed Report", icon: FileText },
            { id: "shippers", label: "Shippers", icon: Building2 },
            { id: "consignees", label: "Consignees", icon: Users },
            { id: "commodities", label: "Commodities", icon: Boxes },
            { id: "destinations", label: "Destinations", icon: Compass },
            { id: "containers", label: "Containers", icon: Truck },
            { id: "monthly", label: "Monthly", icon: Calendar },
            { id: "financial", label: "Financial", icon: DollarSign },
            {
              id: "missing_data",
              label: "Missing Data",
              icon: AlertTriangle,
              badge: dataQualityAudit.attentionRecords > 0 ? dataQualityAudit.attentionRecords : undefined,
            },
            { id: "saved_reports", label: "Saved Reports", icon: Bookmark },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ReportTab)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. MAIN REPORT CANVAS */}
      <div className={`flex-1 overflow-auto ${isFitScreen ? "p-1 sm:p-1.5 md:p-2" : "p-4 md:p-6"} print:p-0 print:overflow-visible bg-slate-100/50 dark:bg-slate-950/80 print:bg-white`}>
        <div
          ref={reportRef}
          className={`mx-auto bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 print:bg-white print:border-none print:shadow-none transition-all duration-200 ${
            isPreviewMode
              ? pdfOrientation === "landscape"
                ? "w-[1100px] min-h-[750px] p-8 my-6 rounded-2xl shadow-xl"
                : "w-[800px] min-h-[1100px] p-8 my-6 rounded-2xl shadow-xl"
              : isFitScreen
                ? "w-full max-w-none p-2 sm:p-3 my-0 rounded-2xl"
                : "w-full max-w-7xl p-6 md:p-8 my-2 rounded-2xl"
          }`}
        >
          {/* Optional Professional Cover Page (rendered when requested for PDF/Print) */}
          {includeCover && (
            <div
              className="p-12 mb-12 border-b-4 border-blue-900 text-white rounded-2xl print:rounded-none"
              style={{ background: "linear-gradient(180deg, #0f172a 0%, #172554 100%)" }}
            >
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-black text-2xl text-blue-400">
                  SA
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
            className="border-b-2 border-slate-900 pb-4 mb-6 print:pb-2.5 print:mb-3 flex flex-col sm:flex-row justify-between items-start gap-4 break-inside-avoid print:break-inside-avoid"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <div>
                  <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {reportCompanyName || "AQ COMPANIES"}
                  </h1>
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
                    {overviewKpis.totalPackages.toLocaleString()} <span className="text-xs print:text-[9px]">CTNS</span>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Top Shippers Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <p className="font-black text-slate-600 mb-2 uppercase text-[10px]">Top Shippers by Volume</p>
                    <div className="space-y-1.5">
                      {shippersList.slice(0, 4).map((s, idx) => (
                        <div key={s.shipperName} className="flex justify-between items-center">
                          <span className="font-semibold truncate max-w-[160px] text-slate-800">
                            {idx + 1}. {s.shipperName}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{s.bolCount} BOLs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Commodities Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <p className="font-black text-slate-600 mb-2 uppercase text-[10px]">Top Commodities</p>
                    <div className="space-y-1.5">
                      {commoditiesList.slice(0, 4).map((c, idx) => (
                        <div key={c.commodityName} className="flex justify-between items-center">
                          <span className="font-semibold truncate max-w-[160px] text-slate-800">
                            {idx + 1}. {c.commodityName}
                          </span>
                          <span className="font-mono font-bold text-blue-700">{c.bolCount} BOLs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Destinations Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <p className="font-black text-slate-600 mb-2 uppercase text-[10px]">Top Transit Hubs & Ports</p>
                    <div className="space-y-1.5">
                      {destinationsList.slice(0, 4).map((d, idx) => (
                        <div key={d.locationName} className="flex justify-between items-center">
                          <span className="font-semibold truncate max-w-[160px] text-slate-800">
                            {idx + 1}. {d.locationName}
                          </span>
                          <span className="font-mono font-bold text-purple-700">{d.bolCount} BOLs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DETAILED REPORT */}
          {/* ======================================================== */}
          {activeTab === "detailed" && (
            <div className="space-y-2.5">
              {/* Modern Glassmorphic Table Toolbar */}
              <div className="no-print print:hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm" data-no-print="true">
                {/* Selection Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-slate-800 dark:text-slate-200 select-none">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectPage}
                      className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Select Page ({paginatedRows.length})</span>
                  </label>

                  {filteredData.length > paginatedRows.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiltered}
                      className="h-7.5 px-2.5 text-xs rounded-xl border-blue-300 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-black shadow-2xs hover:bg-blue-100 cursor-pointer"
                    >
                      Select All {filteredData.length} Filtered BOLs
                    </Button>
                  )}

                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-lg cursor-pointer transition-all"
                    >
                      Clear ({selectedIds.length})
                    </button>
                  )}
                </div>

                {/* Right: Actions, Fit Screen, Density & Pagination */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Print, Download PDF, and Excel Buttons */}
                  <Button
                    type="button"
                    onClick={handlePrint}
                    className="h-8.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                    title="Print Saved BOL Report (A4 Landscape / Portrait)"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    <span>Print</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGeneratePdf}
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
                    onClick={handleExportExcel}
                    className="h-8.5 px-3 rounded-xl border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Export table data to Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Excel</span>
                  </Button>

                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

                  {/* Fit Screen Button Toggle */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFitScreen(!isFitScreen)}
                    className={`h-8.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isFitScreen
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                    title={isFitScreen ? "Switch to Scrollable Wide View" : "Fit all columns on screen at once without horizontal scrolling"}
                  >
                    {isFitScreen ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{isFitScreen ? "Fit Screen (فعال)" : "Wide Scroll"}</span>
                  </Button>

                  {/* Density Toggle (Compact vs Normal) */}
                  <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 h-8.5">
                    <button
                      type="button"
                      onClick={() => setTableDensity("compact")}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        tableDensity === "compact"
                          ? "bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-200 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                      title="Compact Density (Recommended for fitting everything on screen)"
                    >
                      Compact
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableDensity("normal")}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        tableDensity === "normal"
                          ? "bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-200 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                      title="Comfortable Density"
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
                      <option value="all">All ({activeReportData.length})</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table with Rebalanced Column Proportions */}
              <div className={`w-full ${isFitScreen ? "overflow-x-hidden" : "overflow-x-auto"} print:overflow-visible border border-slate-200/90 dark:border-slate-800 print:border-none rounded-2xl print:rounded-none max-h-[calc(100vh-210px)] print:max-h-none overflow-y-auto print:overflow-y-visible shadow-xs bg-white dark:bg-slate-900 scrollbar-thin`}>
                <table className={`w-full ${isFitScreen ? "table-fixed" : "min-w-[1300px]"} text-xs text-left border-collapse`}>
                  {isFitScreen && (
                    <colgroup>
                      <col style={{ width: "2.5%" }} />{/* # */}
                      <col style={{ width: "7.5%" }} />{/* BOL No */}
                      <col style={{ width: "6.0%" }} />{/* Date */}
                      <col style={{ width: "7.5%" }} />{/* Truck No */}
                      <col style={{ width: "5.0%" }} />{/* Invoice */}
                      <col style={{ width: "15.0%" }} />{/* Shipper */}
                      <col style={{ width: "15.0%" }} />{/* Consignee */}
                      <col style={{ width: "4.0%" }} />{/* Route */}
                      <col style={{ width: "11.0%" }} />{/* Packages */}
                      <col style={{ width: "6.5%" }} />{/* Gross Wt */}
                      <col style={{ width: "6.5%" }} />{/* Net Wt */}
                      <col style={{ width: "4.0%" }} />{/* Rate/KG */}
                      <col style={{ width: "7.5%" }} />{/* Value */}
                      <col style={{ width: "2.0%" }} />{/* PDF */}
                    </colgroup>
                  )}
                  <thead className="sticky top-0 z-10 bg-slate-900 text-slate-100 shadow-sm print:static print:table-header-group">
                    <tr className="border-b border-slate-700 bg-slate-900 text-slate-100">
                      <th className={`px-1.5 font-extrabold text-slate-300 text-center uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>#</th>
                      <th className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>BOL No.</th>
                      <th className={`px-1.5 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Date</th>
                      <th className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Truck No.</th>
                      <th className={`px-1.5 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Invoice</th>
                      <th className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Shipper</th>
                      <th className={`px-2 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Consignee</th>
                      <th className={`px-1.5 font-extrabold text-slate-200 uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Route</th>
                      <th className={`px-2 font-extrabold text-slate-200 text-right uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Packages</th>
                      <th className={`px-1.5 font-extrabold text-slate-200 text-right uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Gross Wt</th>
                      <th className={`px-1.5 font-extrabold text-slate-200 text-right uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Net Wt</th>
                      <th className={`px-1.5 font-extrabold text-slate-200 text-right uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Rate/KG</th>
                      <th className={`px-2 font-extrabold text-slate-200 text-right uppercase tracking-wider ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>Value</th>
                      <th className={`px-1 font-extrabold text-slate-300 text-center uppercase tracking-wider print:hidden no-print ${tableDensity === "compact" ? "py-2 text-[10px]" : "py-2.5 text-[11px]"}`}>PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedRows.map((doc, idx) => {
                      const rowNum = pageSize === "all" ? idx + 1 : (currentPage - 1) * pageSize + idx + 1
                      const isSelected = selectedIds.includes(doc.id)
                      const isShipperRtl = isRtlText(doc.shipper_name)
                      const isConsigneeRtl = isRtlText(doc.consignee_name)
                      const cellPad = tableDensity === "compact" ? "py-1.5 px-2 text-[10.5px]" : "py-2.5 px-2.5 text-xs"
                      const bolInfo = formatDisplayBolNo(doc.bol_number)
                      const compactDate = formatCompactDate(doc.issue_date || doc.created_at)
                      const truckText = extractTruckNo(doc) || "-"
                      const invText = extractInvoiceNo(doc) || "-"
                      const routeDisplay = doc.port_of_loading && doc.port_of_discharge
                        ? `${doc.port_of_loading} ➜ ${doc.port_of_discharge}`
                        : doc.port_of_discharge
                        ? `➜ ${doc.port_of_discharge}`
                        : doc.port_of_loading
                        ? `${doc.port_of_loading} ➜`
                        : "-"

                      return (
                        <tr
                          key={`${doc.id}-${idx}`}
                          onClick={() => setQuickViewDoc(doc)}
                          className={`cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? "bg-blue-50/90 dark:bg-blue-950/70 ring-1 ring-inset ring-blue-300 dark:ring-blue-700"
                              : idx % 2 === 1
                              ? "bg-slate-50/60 dark:bg-slate-800/30 hover:bg-blue-50/70 dark:hover:bg-blue-950/40"
                              : "bg-white dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-blue-950/40"
                          }`}
                        >
                          <td className={`${cellPad} font-bold text-slate-400 dark:text-slate-500 text-center tabular-nums`}>{rowNum}</td>
                          <td className={`${cellPad} truncate`} title={`Full BOL: ${bolInfo.full}`}>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/80 tracking-tight truncate max-w-full">
                              {bolInfo.display}
                            </span>
                          </td>
                          <td className={`${cellPad} font-medium text-slate-600 dark:text-slate-400 tabular-nums truncate`} title={formatDisplayDate(doc.issue_date || doc.created_at)}>
                            <span className="truncate">{compactDate}</span>
                          </td>
                          <td className={`${cellPad} truncate`} title={`${truckText}${doc.driver_rent ? ` • Driver Rent: ${doc.driver_rent}` : ""}`}>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{truckText}</span>
                              {doc.driver_rent && (
                                <span className="inline-flex items-center text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/70 rounded px-1 py-0.2 mt-0.5 w-fit max-w-full truncate" title={`Driver Rent: ${doc.driver_rent}`}>
                                  {doc.driver_rent}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${cellPad} truncate`} title={invText}>
                            {invText !== "-" && invText !== "NO" ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold tracking-tight truncate max-w-full">
                                {invText}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                            )}
                          </td>
                          <td
                            className={`${cellPad} font-semibold text-slate-900 dark:text-slate-100 truncate ${
                              isShipperRtl ? "text-right font-[vazirmatn]" : ""
                            }`}
                            dir={isShipperRtl ? "rtl" : "ltr"}
                            title={doc.shipper_name || "Missing"}
                          >
                            {doc.shipper_name || <span className="text-rose-500 italic font-normal">Missing</span>}
                          </td>
                          <td
                            className={`${cellPad} font-medium text-slate-800 dark:text-slate-200 truncate ${
                              isConsigneeRtl ? "text-right font-[vazirmatn]" : ""
                            }`}
                            dir={isConsigneeRtl ? "rtl" : "ltr"}
                            title={doc.consignee_name || "Missing"}
                          >
                            {doc.consignee_name || <span className="text-rose-500 italic font-normal">Missing</span>}
                          </td>
                          <td className={`${cellPad} text-slate-500 dark:text-slate-400 truncate`} title={routeDisplay}>
                            {routeDisplay !== "-" ? (
                              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{routeDisplay}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                            )}
                          </td>
                          <td className={`${cellPad} font-semibold tabular-nums text-right text-slate-800 dark:text-slate-200 truncate`} title={doc.number_of_packages || "-"}>
                            <span className="truncate">{doc.number_of_packages || "—"}</span>
                          </td>
                          <td className={`${cellPad} font-semibold tabular-nums text-right text-slate-700 dark:text-slate-300 truncate`} title={doc.gross_weight || "-"}>
                            <span className="truncate">{doc.gross_weight || "—"}</span>
                          </td>
                          <td className={`${cellPad} font-semibold tabular-nums text-right text-slate-700 dark:text-slate-300 truncate`} title={doc.net_weight || "-"}>
                            <span className="truncate">{doc.net_weight || "—"}</span>
                          </td>
                          <td className={`${cellPad} font-semibold tabular-nums text-right text-blue-700 dark:text-blue-300 truncate`} title={doc.rate_per_kgs || "-"}>
                            <span className="truncate">{doc.rate_per_kgs || "—"}</span>
                          </td>
                          <td className={`${cellPad} font-bold tabular-nums text-right text-emerald-700 dark:text-emerald-400 truncate`} title={doc.goods_value || "-"}>
                            <span className="truncate">{doc.goods_value || "—"}</span>
                          </td>
                          <td className={`${cellPad} text-center print:hidden no-print`}>
                            {doc.pdf_url ? (
                              <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" title="PDF Uploaded & Ready" />
                            ) : (
                              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" title="No PDF Attached" />
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {paginatedRows.length === 0 && (
                      <tr key="empty-bols">
                        <td colSpan={14} className="py-12 text-center text-slate-500 font-semibold text-sm">
                          No Saved BOL records match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {activeReportData.length > 0 && (
                    <tfoot className="sticky bottom-0 z-10 bg-slate-900 text-white font-bold print:static print:table-footer-group shadow-lg border-t-2 border-blue-500">
                      <tr className="bg-slate-900 text-white">
                        <td colSpan={8} className="py-2.5 px-3 text-right font-black text-white text-[11px] uppercase tracking-wider">
                          SUBTOTAL ({activeReportData.length} BOLS):
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white text-[11px] truncate" title={`${overviewKpis.totalPackages.toLocaleString()} CTNS`}>
                          {overviewKpis.totalPackages.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-1.5 text-right tabular-nums font-semibold text-slate-200 text-[10.5px] truncate" title={`${overviewKpis.totalGrossWeightKg.toLocaleString()} KG`}>
                          {overviewKpis.totalGrossWeightKg.toLocaleString()} KG
                        </td>
                        <td className="py-2.5 px-1.5 text-right tabular-nums font-semibold text-amber-300 text-[10.5px] truncate" title={`${overviewKpis.totalNetWeightKg.toLocaleString()} KG`}>
                          {overviewKpis.totalNetWeightKg.toLocaleString()} KG
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums font-medium text-slate-500 text-[10.5px]">
                          —
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-extrabold text-emerald-400 text-[11.5px] truncate">
                          ${(overviewKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="print:hidden no-print"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination Controls */}
              {pageSize !== "all" && totalPages > 1 && (
                <div className="no-print print:hidden flex items-center justify-between text-xs font-semibold text-slate-600 pt-2" data-no-print="true">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, activeReportData.length)} of{" "}
                    {activeReportData.length} BOLs
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="px-2 font-mono font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "shippers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <p className="font-bold text-slate-600">
                  Total Active Commercial Shippers: <span className="font-black text-slate-950 font-mono">{shippersList.length}</span>
                </p>
                <p className="text-[11px] text-slate-400 no-print print:hidden">Click any shipper to drill down into its individual BOL records</p>
              </div>

              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Shipper</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Total BOLs</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Packages</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Net Weight</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Gross Weight</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Goods Value (USD)</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Containers</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Top Destination</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Last Shipment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {shippersList.map((s, idx) => {
                      const isRtl = isRtlText(s.shipperName)
                      return (
                        <tr
                          key={`${s.shipperName}-${idx}`}
                          onClick={() => {
                            setDrillDownEntity({ type: "shipper", name: s.shipperName })
                            setActiveTab("detailed")
                          }}
                          className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                        >
                          <td className={`py-2 px-3 font-bold text-slate-950 max-w-[200px] xl:max-w-[260px] truncate ${isRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isRtl ? "rtl" : "ltr"} title={s.shipperName}>
                            {s.shipperName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">
                            {s.bolCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {s.packages.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {s.netWeightKg.toLocaleString()} KG
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {s.grossWeightKg.toLocaleString()} KG
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                            ${(s.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700">
                            {s.containerCount}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{s.topDestination}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{s.lastShipmentDate}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: CONSIGNEES REPORT */}
          {/* ======================================================== */}
          {activeTab === "consignees" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <p className="font-bold text-slate-600">
                  Total Active Consignees / Receivers: <span className="font-black text-slate-950 font-mono">{consigneesList.length}</span>
                </p>
                <p className="text-[11px] text-slate-400 no-print print:hidden">Click any consignee to inspect related shipment records</p>
              </div>

              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Consignee</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">BOLs</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Suppliers</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Packages</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Weight (KG)</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Goods Value (USD)</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Containers</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Destination</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Last Shipment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {consigneesList.map((c, idx) => {
                      const isRtl = isRtlText(c.consigneeName)
                      return (
                        <tr
                          key={`${c.consigneeName}-${idx}`}
                          onClick={() => {
                            setDrillDownEntity({ type: "consignee", name: c.consigneeName })
                            setActiveTab("detailed")
                          }}
                          className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                        >
                          <td className={`py-2 px-3 font-bold text-slate-950 max-w-[200px] xl:max-w-[260px] truncate ${isRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isRtl ? "rtl" : "ltr"} title={c.consigneeName}>
                            {c.consigneeName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">{c.bolCount}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{c.shipperCount}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{c.packages.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{c.netWeightKg.toLocaleString()} KG</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                            ${(c.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700">{c.containerCount}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{c.topDestination}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{c.lastShipmentDate}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: COMMODITIES REPORT */}
          {/* ======================================================== */}
          {activeTab === "commodities" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <p className="font-bold text-slate-600">
                  Cargo Types & Commodity Distribution: <span className="font-black text-slate-950 font-mono">{commoditiesList.length}</span>
                </p>
                <p className="text-[11px] text-slate-400 no-print print:hidden">Click a commodity to view corresponding shipments</p>
              </div>

              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Commodity</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">BOLs</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Packages</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Net Weight</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Goods Value (USD)</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Avg Value / BOL</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Destinations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {commoditiesList.map((c, idx) => (
                      <tr
                        key={`${c.commodityName}-${idx}`}
                        onClick={() => {
                          setDrillDownEntity({ type: "commodity", name: c.commodityName })
                          setActiveTab("detailed")
                        }}
                        className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 font-bold text-slate-950 max-w-[200px] xl:max-w-[260px] truncate" title={c.commodityName}>
                          {c.commodityName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">{c.bolCount}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{c.packages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{c.netWeightKg.toLocaleString()} KG</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                          ${(c.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          ${c.averageValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">{c.destinations.join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: DESTINATIONS REPORT */}
          {/* ======================================================== */}
          {activeTab === "destinations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <p className="font-bold text-slate-600">
                  Transit Ports, Border Stations & Delivery Hubs: <span className="font-black text-slate-950 font-mono">{destinationsList.length}</span>
                </p>
                <p className="text-[11px] text-slate-400 no-print print:hidden">Click a hub to drill down</p>
              </div>

              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Location</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Route Role</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">BOL Count</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Net Weight</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Goods Value (USD)</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Top Shippers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {destinationsList.map((d, idx) => (
                      <tr
                        key={`${d.type}-${d.locationName}-${idx}`}
                        onClick={() => {
                          setDrillDownEntity({ type: "destination", name: d.locationName })
                          setActiveTab("detailed")
                        }}
                        className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 font-bold text-slate-950 max-w-[200px] xl:max-w-[260px] truncate" title={d.locationName}>{d.locationName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              d.type === "POL"
                                ? "bg-amber-100 text-amber-800"
                                : d.type === "POD"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {d.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">{d.bolCount}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{d.netWeightKg.toLocaleString()} KG</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                          ${(d.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{d.topShippers.join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Container No.</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Type</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">BOL No.</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Shipper</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Commodity</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Weight</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Origin ➜ Destination</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {containerList.map((c, idx) => (
                      <tr key={`${c.containerNumber}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-black font-mono text-slate-950">{c.containerNumber}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {c.containerType}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{c.bolNumber}</td>
                        <td className="py-2 px-3 truncate max-w-[150px] font-semibold text-slate-800">{c.shipper}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{c.commodity}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{c.weightKg.toLocaleString()} KG</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px] truncate max-w-[160px]">{c.origin} ➜ {c.destination}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{c.date}</td>
                      </tr>
                    ))}
                    {containerList.length === 0 && (
                      <tr key="empty-containers">
                        <td colSpan={8} className="py-10 text-center text-slate-500 font-semibold">
                          No container equipment records found in the filtered BOL dataset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Month</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">BOLs</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Packages</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Net Weight</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Goods Value (USD)</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Containers</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Shippers</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Consignees</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlySummaries.map((m) => (
                      <tr key={m.monthKey} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-black text-slate-950 font-mono">{m.monthLabel}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">{m.bolCount}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{m.packages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{m.netWeightKg.toLocaleString()} KG</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                          ${(m.goodsValueByCurrency["USD"] || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700">{m.containerCount}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">{m.shipperCount}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">{m.consigneeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                {Object.entries(financialMetrics.currencyTotals).map(([curr, total]) => {
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

              {/* Missing Fields Breakdown */}
              <div className="w-full overflow-x-auto print:overflow-visible border border-slate-200 print:border-none rounded-xl print:rounded-none max-h-[calc(100vh-230px)] print:max-h-none overflow-y-auto print:overflow-y-visible scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                    <tr className="border-b-2 border-slate-900 bg-slate-100">
                      <th className="py-2.5 px-3 font-black text-slate-900">Field Name</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Severity</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-center">Missing Count</th>
                      <th className="py-2.5 px-3 font-black text-slate-900">Impact Description</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dataQualityAudit.issues.map((issue, idx) => (
                      <tr key={`${issue.field}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-black text-slate-900">{issue.label}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              issue.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : issue.severity === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-950">
                          {issue.missingCount}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
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
    </div>
  )
}
