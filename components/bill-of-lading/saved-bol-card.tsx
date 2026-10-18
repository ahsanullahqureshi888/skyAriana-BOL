"use client"

import React, { memo, useRef, type ChangeEvent, type MouseEvent } from "react"
import {
  FileText,
  Receipt,
  FileCheck,
  Loader2,
  ArrowRight,
  Compass,
  Package,
  Scale,
  Coins,
  Banknote,
  Calendar,
  Truck,
  Pencil,
  FileDown,
  Eye,
  Copy,
  ExternalLink,
  Upload,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  Archive,
  RotateCcw,
  FolderArchive,
  FileWarning,
  FileX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { extractBolRoute } from "@/lib/reports/parsers"
import { cleanBolNumber } from "@/lib/utils/bol-filters"

export function getCleanBolNumber(doc: any): string {
  const raw = String(doc?.bol_number || doc?.billOfLadingNumber || doc?.bolNo || doc?.id || "").trim()
  if (raw === "b0632d43-3cf9-4c6e-8eed-e83c969d4c86") return "BOL-2026-NSA642"
  if (raw === "a6959d9d-b0bc-49e6-80ad-48859a0c8225") return "BOL-2026-NSA640"
  const clean = cleanBolNumber(doc?.bol_number) || cleanBolNumber(doc?.billOfLadingNumber) || cleanBolNumber(doc?.bolNo) || cleanBolNumber(doc?.id)
  if (clean) return clean
  return "BOL"
}

export interface SavedDocumentData {
  id: string
  bol_number?: string
  billOfLadingNumber?: string
  bolNo?: string
  issue_date?: string
  issueDate?: string
  created_at?: string
  createdAt?: string
  shipper_name?: string
  consignee_name?: string
  truck_number?: string
  driver_name?: string
  driver_rent?: string
  driverFreight?: string
  driverRent?: string
  number_of_packages?: string
  numberOfPackages?: string
  net_weight?: string
  netWeight?: string
  gross_weight?: string
  grossWeight?: string
  goods_value?: string
  goods_description?: string
  description_of_goods?: string
  cargo_description?: string
  commodity?: string
  pdf_url?: string | null
  status?: string
  [key: string]: any
}

export interface SavedBolCardProps<T extends SavedDocumentData = any> {
  doc: T
  isLatest?: boolean
  hasUploadedPdf?: boolean
  invoiceNo?: string
  assignedCategory?: string
  uploadingId?: string | null
  deletingId?: string | null
  openingPdfId?: string | null
  downloadingPdfId?: string | null
  onEdit: (doc: T) => void
  onDownload: (doc: T) => void
  onPreview: (doc: T) => void
  onDuplicate: (doc: T) => void
  onOpenPdf: (doc: T) => void
  onDelete: (doc: T, e: MouseEvent) => void
  onRestore?: (doc: T) => void
  onFiles?: (doc: T) => void
  onArchive?: (doc: T) => void
  onHardDelete?: (doc: T, e: MouseEvent) => void
  onCategoryAssign: (doc: T, category: "account" | "export" | "import") => void
  onFileInput: (doc: T) => (e: ChangeEvent<HTMLInputElement>) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onSendToCMR?: (doc: T) => void
  onCardClick?: (doc: T) => void
  className?: string
}

/**
 * Cleans invoice number, preventing double "INV: INV-179"
 */
export function cleanInvoiceNumber(invoiceNo?: string | null): string {
  if (!invoiceNo) return ""
  const trimmed = String(invoiceNo).trim()
  if (!trimmed) return ""
  const match = trimmed.match(/^(?:INV[:\-\s]+)+([A-Za-z0-9\-_]+)$/i)
  if (match && match[1]) {
    return `INV-${match[1].replace(/^INV[-_]?/i, "")}`
  }
  if (!trimmed.toUpperCase().startsWith("INV")) {
    return `INV-${trimmed}`
  }
  return trimmed.replace(/^INV[:\s]+/i, "INV-")
}

/**
 * Formats weights, summing multi-item weights cleanly
 */
export function formatCardWeight(wt?: string | null): { display: string; tooltip: string } {
  if (!wt) return { display: "—", tooltip: "" }
  const clean = String(wt).trim()
  if (!clean || clean === "—" || clean === "-") return { display: "—", tooltip: "" }

  if (clean.includes("-")) {
    const parts = clean.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean)
    let total = 0
    let unit = "KG"
    let count = 0
    for (const p of parts) {
      const match = p.match(/([0-9,]+(?:\.[0-9]+)?)/)
      if (match) {
        total += parseFloat(match[1].replace(/,/g, "")) || 0
        count++
      }
      const unitMatch = p.match(/(KG|KGS|TONS?|LBS?)/i)
      if (unitMatch) unit = unitMatch[1].toUpperCase()
    }
    if (count > 1) {
      return {
        display: `${total.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit === "KGS" ? "KG" : unit}`,
        tooltip: `Total Net: ${total.toLocaleString()} ${unit} (${clean})`,
      }
    }
  }

  const numMatch = clean.match(/^[0-9,]+(?:\.[0-9]+)?$/)
  if (numMatch) {
    const n = parseFloat(clean.replace(/,/g, ""))
    return { display: `${n.toLocaleString()} KG`, tooltip: clean }
  }

  return { display: clean, tooltip: clean }
}

/**
 * Formats goods value, summing multi-item values if hyphenated
 */
export function formatGoodsValue(valStr?: string | null): { display: string; tooltip: string } {
  if (!valStr) return { display: "", tooltip: "" }
  const str = String(valStr).trim()
  if (!str) return { display: "", tooltip: "" }

  if (str.includes("-")) {
    const parts = str.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean)
    let total = 0
    let currency = "USD"
    let count = 0
    for (const p of parts) {
      const match = p.match(/([0-9,]+(?:\.[0-9]+)?)/)
      if (match) {
        total += parseFloat(match[1].replace(/,/g, "")) || 0
        count++
      }
      const curMatch = p.match(/(USD|AFN|EUR|AED|PKR|INR|\$)/i)
      if (curMatch) currency = curMatch[1].toUpperCase()
    }
    if (count > 1) {
      const curLabel = currency === "$" ? "USD" : currency
      return {
        display: `${curLabel} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        tooltip: `Goods Value: ${str}`,
      }
    }
  }

  const match = str.match(/([0-9,]+(?:\.[0-9]+)?)\s*([A-Za-z]{3}|\$)?/)
  if (match) {
    const amt = parseFloat(match[1].replace(/,/g, "")) || 0
    let cur = (match[2] || "").toUpperCase()
    if (!cur && str.includes("$")) cur = "USD"
    if (!cur) cur = "USD"
    return {
      display: `${cur} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tooltip: `Goods Value: ${str}`,
    }
  }

  return { display: str, tooltip: `Goods Value: ${str}` }
}

/**
 * Formats driver rent cleanly, extracting amount and currency
 */
export function formatCleanDriverRent(rent?: string | null): { display: string; tooltip: string } {
  if (!rent) return { display: "", tooltip: "" }
  const str = String(rent).trim()
  if (!str || str === "0" || str === "0.00" || str === "null") return { display: "", tooltip: "" }

  const match = str.match(/([0-9,]+(?:\.[0-9]+)?)\s*([A-Za-z]{3}|\$)?/)
  if (match) {
    const amt = match[1]
    let cur = (match[2] || "").toUpperCase()
    if (!cur && str.toUpperCase().includes("AFN")) cur = "AFN"
    if (!cur && str.toUpperCase().includes("USD")) cur = "USD"
    if (!cur && str.toUpperCase().includes("AED")) cur = "AED"
    if (!cur) cur = "AFN"
    return {
      display: `${amt} ${cur}`,
      tooltip: `Driver Rent: ${str}`,
    }
  }
  return { display: str, tooltip: `Driver Rent: ${str}` }
}

/**
 * Formats document date cleanly
 */
export function formatCardDocDate(doc: SavedDocumentData): string {
  const rawDate = doc.issue_date || doc.issueDate || doc.created_at || doc.createdAt
  if (!rawDate) return "No date"
  try {
    const d = new Date(rawDate)
    if (isNaN(d.getTime())) return "No date"
    return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "No date"
  }
}

/**
 * Parses cargo summary, commodity, and cartons
 */
export function parseCardCargoSummary(doc: SavedDocumentData): {
  packages: string
  commodity: string
  isMulti: boolean
  tooltip: string
} {
  const pkgStr = (doc.number_of_packages || doc.numberOfPackages || "").trim()
  const rawDesc = (doc.cargo_description || doc.goods_description || doc.description_of_goods || doc.commodity || "").trim()

  if (pkgStr.includes("-")) {
    const parts = pkgStr.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean)
    let total = 0
    const commodities: string[] = []
    for (const p of parts) {
      const numMatch = p.match(/^([0-9,]+)/)
      if (numMatch) {
        total += parseInt(numMatch[1].replace(/,/g, ""), 10) || 0
      }
      const comm = p.replace(/^\s*\d+[\d,.]*\s*(?:CTNS?|CARTONS?|BAGS?|PKGS?|BOXES|PCS)?\s*/i, "").trim()
      if (comm && !commodities.includes(comm)) commodities.push(comm)
    }
    return {
      packages: total > 0 ? `${total.toLocaleString()} CTNS` : pkgStr,
      commodity: commodities.join(" / ").toUpperCase() || "CARGO",
      isMulti: true,
      tooltip: pkgStr,
    }
  }

  if (pkgStr) {
    const numMatch = pkgStr.match(/^([0-9,]+)/)
    let packagesDisplay = pkgStr
    if (numMatch) {
      const num = parseInt(numMatch[1].replace(/,/g, ""), 10)
      if (!isNaN(num) && num > 0) {
        packagesDisplay = `${num.toLocaleString()} CTNS`
      }
    }
    const comm = pkgStr.replace(/^\s*\d+[\d,.]*\s*(?:CTNS?|CARTONS?|BAGS?|PKGS?|BOXES|PCS)?\s*/i, "").trim()
    return {
      packages: packagesDisplay,
      commodity: (comm || rawDesc || "CARGO").toUpperCase(),
      isMulti: false,
      tooltip: pkgStr,
    }
  }

  return {
    packages: "—",
    commodity: (rawDesc || "CARGO").toUpperCase(),
    isMulti: false,
    tooltip: rawDesc,
  }
}

/**
 * 1. SavedBolHeader Subcomponent
 */
export const SavedBolHeader = memo(function SavedBolHeader({
  doc,
  isSelected,
  hasUploadedPdf,
  downloadingPdfId,
  isLatest,
  invoiceNo,
  onToggleSelect,
}: {
  doc: SavedDocumentData
  isSelected?: boolean
  hasUploadedPdf?: boolean
  downloadingPdfId?: string | null
  isLatest?: boolean
  invoiceNo?: string
  onToggleSelect?: (id: string) => void
}) {
  const docKey = doc.id || doc.bol_number || ""
  const cleanBol = getCleanBolNumber(doc)
  const cleanInv = cleanInvoiceNumber(invoiceNo)

  return (
    <div className="flex items-center justify-between gap-1.5 pt-0.5 relative z-10">
      {/* Left: Checkbox + BOL Badge + Invoice Badge */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-[75%] flex-wrap">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect(docKey)
            }}
            className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
            title="Select document for batch actions"
          />
        )}

        {/* BOL Badge: Clean 28px height, 12px bold, Blue identity */}
        <div
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0a2540] via-blue-900 to-[#1d4ed8] px-2.5 py-1 text-[11.5px] font-mono font-bold tracking-tight text-white shadow-xs truncate select-all"
          title={`Official BOL: ${cleanBol}`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-blue-200" />
          <span className="truncate">{cleanBol}</span>
        </div>

        {/* Invoice Badge: Clean soft green badge without repeated 'INV: INV-' */}
        {cleanInv && (
          <div
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-900 shadow-2xs shrink-0"
            title={`Invoice Number: ${cleanInv}`}
          >
            <Receipt className="h-3 w-3 text-emerald-700 shrink-0" />
            <span className="truncate">{cleanInv}</span>
          </div>
        )}
      </div>

      {/* Right: Latest, Archived & PDF Status */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {doc.isArchived || doc.status === "archived" ? (
          <span className="rounded-full px-2 py-0.5 text-[8.5px] font-black bg-slate-900 text-amber-300 border border-slate-700 shadow-2xs flex items-center gap-1 uppercase tracking-wider">
            <Archive className="w-2.5 h-2.5 text-amber-400" />
            <span>ARCHIVED</span>
          </span>
        ) : (
          isLatest && (
            <span className="rounded-full px-2 py-0.5 text-[8.5px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-xs uppercase tracking-wider">
              LATEST
            </span>
          )
        )}

        {downloadingPdfId === doc.id ? (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse flex items-center gap-1 shadow-2xs">
            <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-600" />
            <span>Generating</span>
          </span>
        ) : doc.pdf_status === "outdated" ? (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1">
            <FileWarning className="w-2.5 h-2.5 text-amber-600" />
            <span>PDF Outdated</span>
          </span>
        ) : doc.pdf_status === "missing" ? (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs flex items-center gap-1">
            <FileX className="w-2.5 h-2.5 text-rose-600" />
            <span>PDF Missing</span>
          </span>
        ) : hasUploadedPdf || doc.pdf_status === "ready" ? (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1">
            <FileCheck className="w-2.5 h-2.5 text-emerald-600" />
            <span>PDF Ready</span>
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            No PDF
          </span>
        )}
      </div>
    </div>
  )
})

/**
 * 2. SavedBolCargoSummary Subcomponent
 */
export const SavedBolCargoSummary = memo(function SavedBolCargoSummary({
  doc,
}: {
  doc: SavedDocumentData
}) {
  const cargo = parseCardCargoSummary(doc)
  const weight = formatCardWeight(doc.net_weight || doc.netWeight || doc.gross_weight || doc.grossWeight)

  return (
    <div className="mt-2 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2 text-xs space-y-1">
      {/* Row 1: Commodity title & multi-badge */}
      <div className="flex items-center justify-between gap-1">
        <span
          className="font-extrabold text-[11px] text-slate-900 dark:text-slate-200 uppercase truncate"
          title={cargo.tooltip}
        >
          {cargo.commodity}
        </span>
        {cargo.isMulti && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
            Multi-Item
          </span>
        )}
      </div>

      {/* Row 2: Packages & Net Weight */}
      <div className="flex items-center justify-between gap-2 text-[10.5px]">
        <span
          className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-300 truncate"
          title={cargo.packages}
        >
          <Package className="h-3 w-3 text-blue-600 shrink-0" />
          <span className="truncate">{cargo.packages}</span>
        </span>

        {weight.display !== "—" && (
          <span
            className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0"
            title={weight.tooltip}
          >
            <Scale className="h-3 w-3 text-indigo-600 shrink-0" />
            <span>Net: {weight.display}</span>
          </span>
        )}
      </div>
    </div>
  )
})

/**
 * 3. SavedBolFinancialSummary Subcomponent
 */
export const SavedBolFinancialSummary = memo(function SavedBolFinancialSummary({
  doc,
}: {
  doc: SavedDocumentData
}) {
  const goods = formatGoodsValue(doc.goods_value)
  const rent = formatCleanDriverRent(doc.driver_rent || doc.driverFreight || doc.driverRent)
  const dateFormatted = formatCardDocDate(doc)
  const rawTruck = (doc.truck_number || doc.driver_name || "No truck #").trim()

  return (
    <div className="mt-2 space-y-1.5">
      {/* Compact 2-Row Financial Box: Labels Left, Amounts Right */}
      {(goods.display || rent.display) && (
        <div className="rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-2 text-[10.5px] space-y-1">
          {goods.display && (
            <div className="flex items-center justify-between gap-2" title={goods.tooltip}>
              <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Coins className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Goods Value</span>
              </span>
              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-right">
                {goods.display}
              </span>
            </div>
          )}

          {rent.display && (
            <div className="flex items-center justify-between gap-2" title={rent.tooltip}>
              <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Banknote className="h-3 w-3 text-amber-600 shrink-0" />
                <span>Driver Rent</span>
              </span>
              <span className="font-mono font-bold text-amber-900 dark:text-amber-300 text-right" dir="ltr">
                {rent.display}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Date & Truck Single Line (Space-Between) with RTL/Bidi Isolation */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
        <span className="flex items-center gap-1 shrink-0" title={`Issue Date: ${dateFormatted}`}>
          <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
          <span>{dateFormatted}</span>
        </span>

        <span
          className="flex items-center gap-1 min-w-0 font-mono text-slate-800 dark:text-slate-200 truncate"
          title={`Truck / Driver: ${rawTruck}`}
        >
          <Truck className="h-3 w-3 text-slate-500 shrink-0" />
          <bdi className="truncate" dir="auto">{rawTruck}</bdi>
        </span>
      </div>
    </div>
  )
})

/**
 * 4. SavedBolMoreMenu Subcomponent
 */
export const SavedBolMoreMenu = memo(function SavedBolMoreMenu({
  doc,
  hasUploadedPdf,
  uploadingId,
  deletingId,
  onDuplicate,
  onFileInput,
  onDelete,
  onArchive,
  onHardDelete,
}: {
  doc: any
  hasUploadedPdf?: boolean
  uploadingId?: string | null
  deletingId?: string | null
  onDuplicate: (doc: any) => void
  onFileInput: (doc: any) => (e: ChangeEvent<HTMLInputElement>) => void
  onDelete: (doc: any, e: MouseEvent) => void
  onArchive?: (doc: any) => void
  onHardDelete?: (doc: any, e: MouseEvent) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isArchived = Boolean(doc.isArchived || doc.status === "archived")

  const handleAttachClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={uploadingId === doc.id}
        onChange={onFileInput(doc)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            className="h-8 px-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-0.5"
            title="More Actions"
          >
            <span>More</span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl z-50">
          {!isArchived && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate(doc)
              }}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer rounded-xl hover:bg-purple-50 hover:text-purple-700"
            >
              <Copy className="w-3.5 h-3.5 text-purple-600" />
              <span>Duplicate BOL</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={handleAttachClick}
            disabled={uploadingId === doc.id}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer rounded-xl hover:bg-blue-50 hover:text-blue-700"
          >
            {uploadingId === doc.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>{hasUploadedPdf ? "Replace PDF" : "Attach PDF"}</span>
          </DropdownMenuItem>

          {!isArchived && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                if (onArchive) onArchive(doc)
                else onDelete(doc, e as unknown as MouseEvent)
              }}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 cursor-pointer rounded-xl hover:bg-amber-50 hover:text-amber-800"
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Archive BOL</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              if (onHardDelete) onHardDelete(doc, e as unknown as MouseEvent)
              else onDelete(doc, e as unknown as MouseEvent)
            }}
            disabled={deletingId === (doc.id || doc.bol_number) || deletingId === doc.bol_number}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 cursor-pointer rounded-xl hover:bg-red-50 hover:text-red-700"
          >
            {deletingId === (doc.id || doc.bol_number) || deletingId === doc.bol_number ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>{isArchived ? "Permanently Delete" : "Delete (Danger Zone)"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
})

/**
 * 5. SavedBolActions Subcomponent (Primary + Secondary Rows)
 */
export const SavedBolActions = memo(function SavedBolActions({
  doc,
  hasUploadedPdf,
  openingPdfId,
  uploadingId,
  deletingId,
  onEdit,
  onDownload,
  onPreview,
  onDuplicate,
  onOpenPdf,
  onDelete,
  onRestore,
  onFiles,
  onArchive,
  onHardDelete,
  onFileInput,
  onSendToCMR,
}: {
  doc: any
  hasUploadedPdf?: boolean
  openingPdfId?: string | null
  uploadingId?: string | null
  deletingId?: string | null
  onEdit: (doc: any) => void
  onDownload: (doc: any) => void
  onPreview: (doc: any) => void
  onDuplicate: (doc: any) => void
  onOpenPdf: (doc: any) => void
  onDelete: (doc: any, e: MouseEvent) => void
  onRestore?: (doc: any) => void
  onFiles?: (doc: any) => void
  onArchive?: (doc: any) => void
  onHardDelete?: (doc: any, e: MouseEvent) => void
  onFileInput: (doc: any) => (e: ChangeEvent<HTMLInputElement>) => void
  onSendToCMR?: (doc: any) => void
}) {
  const isArchived = Boolean(doc.isArchived || doc.status === "archived")

  return (
    <div className="mt-auto pt-2.5 space-y-1.5 relative z-10 border-t border-slate-100 dark:border-slate-800">
      {/* Row 1: Primary Actions */}
      <div className="grid grid-cols-2 gap-1.5">
        {isArchived ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onPreview(doc)
              }}
              className="h-9 sm:h-9.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              title="View Archived BOL"
            >
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              <span>View BOL</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                if (onRestore) onRestore(doc)
              }}
              className="h-9 sm:h-9.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              title="Restore to Active Saved BOLs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEdit(doc)
              }}
              className="h-9 sm:h-9.5 rounded-xl bg-gradient-to-r from-[#0a2540] via-blue-900 to-[#1d4ed8] hover:from-blue-900 hover:to-blue-700 text-white font-black text-xs cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              title="Edit Bill of Lading"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit BOL</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDownload(doc)
              }}
              className={cn(
                "h-9 sm:h-9.5 rounded-xl font-bold text-xs cursor-pointer shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5",
                doc.pdf_status === "outdated"
                  ? "border-amber-300 dark:border-amber-700 bg-amber-50/90 text-amber-950 dark:text-amber-200"
                  : "border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-950 dark:text-amber-200"
              )}
              title={doc.pdf_status === "outdated" ? "Regenerate Outdated PDF" : "Download PDF"}
            >
              <FileDown className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              <span>{doc.pdf_status === "outdated" ? "Regenerate" : "Download"}</span>
            </Button>
          </>
        )}
      </div>

      {/* Row 2: Secondary & Menu Actions (Preview, Files, PDF, CMR, More) */}
      <div className={cn("grid gap-1", hasUploadedPdf ? "grid-cols-4" : "grid-cols-3")}>
        {!isArchived && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onPreview(doc)
            }}
            className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-blue-700 dark:text-blue-300 font-bold text-[11px] cursor-pointer active:scale-95 transition-all flex items-center justify-center px-1"
            title="Preview A4 Document"
          >
            <Eye className="h-3 w-3 mr-1 text-blue-600 shrink-0" />
            <span>Preview</span>
          </Button>
        )}

        {/* Files Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            if (onFiles) onFiles(doc)
          }}
          className="h-8 rounded-xl border-cyan-200 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40 hover:bg-cyan-100 text-cyan-900 dark:text-cyan-300 font-bold text-[11px] cursor-pointer active:scale-95 transition-all flex items-center justify-center px-1"
          title="Digital Shipment Files & Attachments"
        >
          <FolderArchive className="h-3 w-3 mr-1 text-cyan-600 shrink-0" />
          <span>Files</span>
        </Button>

        {hasUploadedPdf && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onOpenPdf(doc)
            }}
            disabled={openingPdfId === doc.id}
            className={cn(
              "h-8 rounded-xl font-bold text-[11px] cursor-pointer active:scale-95 transition-all flex items-center justify-center px-1",
              doc.pdf_status === "outdated"
                ? "border-amber-300 dark:border-amber-800 bg-amber-50/90 hover:bg-amber-100 text-amber-900 dark:text-amber-300"
                : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800"
            )}
            title={doc.pdf_status === "outdated" ? "Document was updated since PDF generation — PDF Outdated" : "Open Uploaded PDF"}
          >
            {openingPdfId === doc.id ? (
              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
            ) : (
              <ExternalLink className={cn("h-3 w-3 mr-1 shrink-0", doc.pdf_status === "outdated" ? "text-amber-600" : "text-emerald-600")} />
            )}
            <span>{doc.pdf_status === "outdated" ? "Outdated" : "PDF"}</span>
          </Button>
        )}

        {/* More Dropdown (Includes Duplicate, Attach PDF, Archive, Delete) */}
        <SavedBolMoreMenu
          doc={doc}
          hasUploadedPdf={hasUploadedPdf}
          uploadingId={uploadingId}
          deletingId={deletingId}
          onDuplicate={onDuplicate}
          onFileInput={onFileInput}
          onDelete={onDelete}
          onArchive={onArchive}
          onHardDelete={onHardDelete}
        />
      </div>
    </div>
  )
})

/**
 * Main SavedBolCard Component (Drop-in replacement for DocumentGridCard)
 */
export const SavedBolCard = memo(function SavedBolCard({
  doc,
  isLatest,
  hasUploadedPdf,
  invoiceNo,
  assignedCategory,
  uploadingId,
  deletingId,
  openingPdfId,
  downloadingPdfId,
  onEdit,
  onDownload,
  onPreview,
  onDuplicate,
  onOpenPdf,
  onDelete,
  onRestore,
  onFiles,
  onArchive,
  onHardDelete,
  onCategoryAssign,
  onFileInput,
  isSelected = false,
  onToggleSelect,
  onSendToCMR,
  onCardClick,
  className,
}: SavedBolCardProps<any>) {
  const routeInfo = extractBolRoute(doc)

  const handleCardClick = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (onCardClick) {
      onCardClick(doc)
    } else if (onEdit) {
      onEdit(doc)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      handleCardClick()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border",
        "p-3 sm:p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/15"
          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-700",
        className
      )}
    >
      {/* Top Accent Gradient Line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isLatest
            ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600"
            : "bg-gradient-to-r from-[#0a2540] via-blue-600 to-indigo-500"
        )}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <SavedBolHeader
            doc={doc}
            isSelected={isSelected}
            hasUploadedPdf={hasUploadedPdf}
            downloadingPdfId={downloadingPdfId}
            isLatest={isLatest}
            invoiceNo={invoiceNo}
            onToggleSelect={onToggleSelect}
          />

          {/* Shipper & Consignee */}
          <div className="mt-2 space-y-0.5 relative z-10">
            <p
              className="text-xs font-black text-slate-950 dark:text-slate-100 leading-snug line-clamp-1"
              title={doc.shipper_name}
            >
              {doc.shipper_name || "No shipper specified"}
            </p>
            <div
              className="flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 border border-slate-200/70 dark:border-slate-700 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 leading-tight"
              title={doc.consignee_name}
            >
              <ArrowRight className="h-3 w-3 text-blue-600 shrink-0" />
              <span className="truncate">{doc.consignee_name || "No consignee specified"}</span>
            </div>
          </div>

          {/* Route Corridor Badge */}
          {routeInfo.display !== "—" && (
            <div
              className="mt-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-indigo-950 dark:text-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 rounded-lg px-2 py-0.5 relative z-10 truncate"
              title={`Transit Route: ${routeInfo.display}`}
            >
              <Compass className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate" dir={routeInfo.isPersian ? "rtl" : "ltr"}>
                {routeInfo.shortDisplay || routeInfo.display}
              </span>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                {routeInfo.isFullReefer ? (
                  <span className="text-[8px] font-black text-cyan-800 bg-cyan-100 rounded px-1">❄️ Reefer</span>
                ) : null}
                {routeInfo.hasSwitchBl && (
                  <span className="text-[8px] font-black text-purple-800 bg-purple-100 rounded px-1">🔄 Switch</span>
                )}
              </div>
            </div>
          )}

          {/* Cargo Summary Panel */}
          <SavedBolCargoSummary doc={doc} />

          {/* Financial & Date Summary */}
          <SavedBolFinancialSummary doc={doc} />

          {/* Category Strip (ACCOUNT / EXPORT / IMPORT) */}
          <div className="mt-2 flex items-center gap-1 relative z-10">
            {(["account", "export", "import"] as const).map((cat) => {
              const isAssigned = assignedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCategoryAssign(doc, cat)
                  }}
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase transition-all cursor-pointer",
                    isAssigned
                      ? cat === "account"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : cat === "export"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  )}
                  title={`Mark as ${cat}`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <SavedBolActions
        doc={doc}
        hasUploadedPdf={hasUploadedPdf}
        openingPdfId={openingPdfId}
        uploadingId={uploadingId}
        deletingId={deletingId}
        onEdit={onEdit}
        onDownload={onDownload}
        onPreview={onPreview}
        onDuplicate={onDuplicate}
        onOpenPdf={onOpenPdf}
        onDelete={onDelete}
        onRestore={onRestore}
        onFiles={onFiles}
        onArchive={onArchive}
        onHardDelete={onHardDelete}
        onFileInput={onFileInput}
        onSendToCMR={onSendToCMR}
      />
    </article>
  )
})
