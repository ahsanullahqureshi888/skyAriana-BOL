"use client"

import { useState, useMemo, useEffect, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Printer,
  Tags,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  CheckCircle2,
  X,
  FileDown,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ShippingDocumentData, ShippingDocumentKind, StickerLayout } from "@/lib/utils/shipping-documents"
import { PackingListPdfPage } from "./packing-list-pdf-page"
import { StickerPdfPage } from "./sticker-pdf-page"

export interface CombinedShippingPdfProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ShippingDocumentData
  logoUrl?: string
  companyName?: string
  companySubtitle?: string
  bolPreview: ReactNode
  onDownload: (kind: ShippingDocumentKind, stickerQuantity?: number, stickerLayout?: StickerLayout) => Promise<void>
  onPrint: (kind: ShippingDocumentKind, stickerQuantity?: number, stickerLayout?: StickerLayout) => Promise<void>
}

/**
 * CombinedShippingPdf - Executive 3-in-1 Shipping Document Center:
 * Page 1: Bill of Lading (Master B/L)
 * Page 2: Packing List (with Dedicated Driver & Transport Information)
 * Page 3: Export Cargo Sticker (Authentic Master Sticker with FSSAI, Veg, and Afghanistan badges)
 *
 * Primary Action: Single merged 3-page PDF download containing all documents in strict order.
 */
export function CombinedShippingPdf({
  open,
  onOpenChange,
  data,
  logoUrl,
  companyName,
  companySubtitle,
  bolPreview,
  onDownload,
  onPrint,
}: CombinedShippingPdfProps) {
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [zoom, setZoom] = useState<number>(1.0)
  const [busyAction, setBusyAction] = useState<"download" | "print" | null>(null)

  useEffect(() => {
    if (open) {
      setCurrentPage(1)
    }
  }, [open])

  const totalPages = 3

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const runAction = async (action: "download" | "print", kind: ShippingDocumentKind = "all") => {
    setBusyAction(action)
    try {
      if (action === "download") {
        await onDownload(kind, 1, "single")
      } else {
        await onPrint(kind, 1, "single")
      }
    } finally {
      setBusyAction(null)
    }
  }

  const downloadAllSeparatePdfs = async () => {
    setBusyAction("download")
    try {
      await onDownload("bol", 1, "single")
      await new Promise((resolve) => setTimeout(resolve, 350))
      await onDownload("packing-list", 1, "single")
      await new Promise((resolve) => setTimeout(resolve, 350))
      await onDownload("stickers", 1, "single")
    } finally {
      setBusyAction(null)
    }
  }

  // Render the active preview page
  const renderedPage = useMemo(() => {
    if (currentPage === 1) return bolPreview
    if (currentPage === 2) {
      return (
        <PackingListPdfPage
          data={data}
          logoUrl={logoUrl}
          companyName={companyName}
          companySubtitle={companySubtitle}
        />
      )
    }
    return (
      <StickerPdfPage
        data={data}
        logoUrl={logoUrl}
        companyName={companyName}
        companySubtitle={companySubtitle}
      />
    )
  }, [currentPage, bolPreview, data, logoUrl, companyName, companySubtitle])

  const pageTitle = useMemo(() => {
    if (currentPage === 1) return "Bill of Lading (Master B/L)"
    if (currentPage === 2) return "Packing List (with Driver Info)"
    return "Export Cargo Sticker Label (Master)"
  }, [currentPage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[94vh] max-h-[96vh] w-[96vw] max-w-[1550px] sm:max-w-[96vw] lg:max-w-[1550px] xl:max-w-[1600px] grid-rows-none flex-col gap-0 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-0 shadow-2xl shadow-purple-950/20"
        showCloseButton={false}
      >
        {/* Dialog Header */}
        <DialogHeader className="border-b border-slate-200 bg-white px-5 py-3.5 sm:px-6 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#583184] via-purple-700 to-indigo-800 text-white shadow-md shadow-purple-600/25 shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                    Shipping Document Center — Complete 3-Page PDF Set
                  </DialogTitle>
                  <span className="text-[10.5px] font-extrabold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full font-[vazirmatn]">
                    مرکز اسناد باربری و ترانزیت
                  </span>
                </div>
                <DialogDescription className="mt-0.5 text-xs font-semibold text-slate-500">
                  Page 1: BOL Master ➔ Page 2: Packing List (Driver Info) ➔ Page 3: Export Cargo Sticker
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 px-3.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-950 cursor-pointer border-slate-300"
              >
                <X className="h-4 w-4 mr-1 text-slate-500" />
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Body */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Left Sidebar */}
          <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50/95 lg:w-[380px] xl:w-[420px] lg:border-b-0 lg:border-r flex flex-col justify-between overflow-hidden">
            {/* Scrollable controls section */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Document Pages Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Document Pages ({currentPage} of {totalPages})
                  </p>
                  <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-md">
                    Total: 3 Pages
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Page 1: BOL */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-[0.985] cursor-pointer border ${
                      currentPage === 1
                        ? "bg-[#583184] text-white border-[#583184] shadow-md shadow-purple-500/25 ring-2 ring-purple-300"
                        : "bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200 hover:border-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        currentPage === 1 ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
                      }`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-xs">Page 1: Bill of Lading</p>
                        <p className={`text-[10px] ${currentPage === 1 ? "text-purple-200" : "text-slate-500"}`}>
                          Official International B/L Master
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      currentPage === 1 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      Master
                    </span>
                  </button>

                  {/* Page 2: Packing List */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(2)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-[0.985] cursor-pointer border ${
                      currentPage === 2
                        ? "bg-[#583184] text-white border-[#583184] shadow-md shadow-purple-500/25 ring-2 ring-purple-300"
                        : "bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200 hover:border-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        currentPage === 2 ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-xs">Page 2: Packing List</p>
                        <p className={`text-[10px] ${currentPage === 2 ? "text-purple-200" : "text-slate-500"}`}>
                          With Driver Info & Cargo Rows
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      currentPage === 2 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      Driver Info
                    </span>
                  </button>

                  {/* Page 3: Cargo Sticker */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(3)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-150 active:scale-[0.985] cursor-pointer border ${
                      currentPage === 3
                        ? "bg-[#583184] text-white border-[#583184] shadow-md shadow-purple-500/25 ring-2 ring-purple-300"
                        : "bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200 hover:border-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        currentPage === 3 ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
                      }`}>
                        <Tags className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-xs">Page 3: Export Cargo Sticker</p>
                        <p className={`text-[10px] ${currentPage === 3 ? "text-purple-200" : "text-slate-500"}`}>
                          Official Master Sticker Label
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      currentPage === 3 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      1 Sticker
                    </span>
                  </button>
                </div>
              </div>

              {/* Dedicated Driver Info Status Card */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    Driver & Vehicle Details
                  </span>
                  <span className="text-[9.5px] font-extrabold text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-2 py-0.5 rounded-md">
                    In Packing List
                  </span>
                </div>

                <div className="rounded-xl bg-white/90 border border-indigo-100 p-2.5 space-y-1 text-[10.5px]">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Truck Number:</span>
                    <span className="font-mono font-black text-slate-950">{data.truckNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Driver Name:</span>
                    <span className="font-bold text-slate-950 truncate">
                      {data.driverName || "—"}
                      {data.driverFatherName && <span className="font-normal text-slate-500"> (s/o {data.driverFatherName})</span>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Driver Contact:</span>
                    <span className="font-mono font-bold text-slate-900">{data.driverContact || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Driver Rent:</span>
                    <span className="font-mono font-black text-emerald-800">
                      {[data.driverRent, data.driverRentCurrency].filter(Boolean).join(" ") || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Master BOL Data Integrity Banner */}
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 p-3.5 text-xs text-purple-950 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Shipment Summary
                  </span>
                  <span className="text-[9.5px] font-extrabold text-purple-700 font-mono">
                    #{data.bolNumber || "BOL"}
                  </span>
                </div>

                <div className="rounded-xl bg-white/90 border border-purple-100 p-2.5 space-y-1 text-[10.5px] font-medium text-slate-700">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Commodity:</span>
                    <span className="font-bold text-slate-950 truncate">{data.commodity || "—"}</span>
                  </div>
                  {data.lotNo && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-500 font-bold shrink-0">Lot Number:</span>
                      <span className="font-black text-[#007a3d] truncate">{data.lotNo}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Packages:</span>
                    <span className="font-bold text-slate-950 truncate">{data.packageCountText || "—"} {data.packageType || "Cartons"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold shrink-0">Weights:</span>
                    <span className="font-bold text-slate-950 truncate">
                      {data.netWeight ? `Net: ${data.netWeight}` : ""} {data.grossWeight ? `(Gross: ${data.grossWeight})` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Action Footer - ALWAYS visible, never cut off */}
            <div className="shrink-0 p-4 sm:p-5 border-t border-slate-200 bg-white/95 backdrop-blur-md space-y-2.5 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              <Button
                type="button"
                onClick={() => runAction("download", "all")}
                disabled={busyAction !== null}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#583184] via-purple-700 to-[#47266b] hover:from-[#4a2770] hover:to-purple-900 text-white font-black shadow-lg shadow-purple-600/25 cursor-pointer text-xs transition-all active:scale-[0.98]"
              >
                {busyAction === "download" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Complete PDF (All 3 Pages)
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runAction("print", "all")}
                  disabled={busyAction !== null}
                  className="h-9 rounded-xl font-bold text-xs cursor-pointer border-slate-300 hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
                  Print All
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyAction !== null}
                      className="h-9 rounded-xl font-bold text-xs cursor-pointer border-slate-300 hover:bg-slate-50 flex items-center justify-between px-3"
                    >
                      <span>Individual...</span>
                      <ChevronDown className="h-3 w-3 ml-1 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5 shadow-xl">
                    <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase">
                      Individual Downloads
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={downloadAllSeparatePdfs} className="cursor-pointer text-xs font-bold py-2 text-purple-900 bg-purple-50/70 hover:bg-purple-100/80 rounded-xl">
                      <Download className="h-4 w-4 mr-2 text-purple-700" />
                      Download 3 Separate PDFs
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => runAction("download", "bol")} className="cursor-pointer text-xs font-semibold py-2">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      Bill of Lading Only (Page 1)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAction("download", "packing-list")} className="cursor-pointer text-xs font-semibold py-2">
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                      Packing List Only (Page 2)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAction("download", "stickers")} className="cursor-pointer text-xs font-semibold py-2">
                      <Tags className="h-4 w-4 mr-2 text-[#583184]" />
                      Export Cargo Sticker Only (Page 3)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => runAction("print", "all")} className="cursor-pointer text-xs font-semibold py-2">
                      <Printer className="h-4 w-4 mr-2 text-slate-600" />
                      Print Complete Consignment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </aside>

          {/* Right Main Preview Area */}
          <main className="flex flex-1 flex-col overflow-hidden bg-slate-200/75">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-2.5 text-xs shadow-xs shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-xl cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono font-black text-slate-800 text-xs px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-xl cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="ml-1.5 flex items-center gap-2 truncate">
                  <span className="font-black text-slate-900 truncate text-xs sm:text-sm">
                    {pageTitle}
                  </span>
                  <span className="text-[10.5px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 hidden md:inline shrink-0">
                    {currentPage === 1 ? "A4 Master B/L" : currentPage === 2 ? "A4 Packing List" : "A4 Cargo Sticker"}
                  </span>
                </div>
              </div>

              {/* Preview Actions & Zoom Controls */}
              <div className="flex items-center gap-2">
                {/* Direct Action for current page */}
                <div className="hidden sm:flex items-center gap-1.5 mr-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentPage === 1) runAction("download", "bol")
                      else if (currentPage === 2) runAction("download", "packing-list")
                      else runAction("download", "stickers")
                    }}
                    className="h-8 rounded-xl text-xs font-bold border-purple-200 bg-purple-50/50 text-purple-900 hover:bg-purple-100 cursor-pointer"
                    title="Download this active page as PDF"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1 text-purple-700" />
                    <span>Download Page</span>
                  </Button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-100/95 p-1 rounded-xl border border-slate-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom((z) => Math.max(0.35, Math.round((z - 0.08) * 100) / 100))}
                    className="h-7 w-7 rounded-lg cursor-pointer hover:bg-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-mono text-[11px] font-black text-slate-700 w-11 text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.08) * 100) / 100))}
                    className="h-7 w-7 rounded-lg cursor-pointer hover:bg-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <div className="h-4 w-px bg-slate-300 mx-0.5" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(0.72)}
                    className={`h-7 px-2 rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-all ${
                      Math.abs(zoom - 0.72) < 0.02 ? "bg-white shadow-2xs text-purple-900" : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Optimal Reading Size (72%)"
                  >
                    Fit View
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(1.0)}
                    className={`h-7 px-2 rounded-lg text-[10.5px] font-extrabold cursor-pointer transition-all ${
                      Math.abs(zoom - 1.0) < 0.02 ? "bg-white shadow-2xs text-purple-900" : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="100% Scale 1:1"
                  >
                    100%
                  </Button>
                </div>
              </div>
            </div>

            {/* Document Render Canvas */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center">
              <div
                className="relative flex items-center justify-center transition-all duration-200 ease-out my-auto"
                style={{
                  width: `${794 * zoom}px`,
                  minHeight: `${1123 * zoom}px`,
                }}
              >
                <div
                  data-shipping-preview="true"
                  className="origin-top-left rounded-sm shadow-[0_25px_70px_rgba(0,0,0,0.22)] bg-white transition-transform duration-200 ease-out will-change-transform"
                  style={{
                    width: "794px",
                    minHeight: "1123px",
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div key={currentPage} className="animate-page-crossfade">
                    {renderedPage}
                  </div>
                </div>
              </div>
            </div>

            {/* Persistent off-screen DOM elements for reliable HTML-to-Image PDF export of all 3 pages */}
            <div
              className="pointer-events-none fixed -left-[9999px] -top-[9999px] opacity-0"
              style={{ width: "210mm", height: "297mm", overflow: "hidden" }}
              aria-hidden="true"
            >
              {currentPage !== 2 && (
                <div data-shipping-preview-export="packing-list">
                  <PackingListPdfPage
                    data={data}
                    logoUrl={logoUrl}
                    companyName={companyName}
                    companySubtitle={companySubtitle}
                  />
                </div>
              )}
              {currentPage !== 3 && (
                <div data-shipping-preview-export="stickers">
                  <StickerPdfPage
                    data={data}
                    logoUrl={logoUrl}
                    companyName={companyName}
                    companySubtitle={companySubtitle}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CombinedShippingPdf
