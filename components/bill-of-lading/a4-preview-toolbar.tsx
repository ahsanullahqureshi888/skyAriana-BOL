"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { DOCUMENT_BACKGROUNDS } from "@/lib/document-backgrounds"
import { CopyWhatsAppButton } from "./copy-whatsapp-button"
import { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import { buildWhatsAppBOLMessage } from "@/lib/utils/bol-whatsapp-formatter"
import { getStoredCompanyStampConfig, saveStoredCompanyStampConfig, type CompanyStampConfig } from "@/lib/company-stamp-data"
import { toast } from "sonner"
import {
  ArrowLeft,
  Printer,
  Save,
  FileText,
  Eye,
  Plus,
  Loader2,
  Package,
  Check,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sliders,
  Layers,
  Keyboard,
  Cloud,
  RefreshCw,
  FileSpreadsheet,
  MoreHorizontal,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from "lucide-react"
import type { PreviewMode } from "./use-a4-preview-scale"

export interface A4PreviewToolbarProps {
  bolNumber: string
  isLoading: boolean
  isSaving: boolean
  isEditMode: boolean
  hasUnsavedChanges?: boolean
  autoSaveStatus: "idle" | "saving" | "saved" | "local" | "error"
  lastAutoSaveTime?: string
  lastAutoSavedTime?: string | null
  previewMode: PreviewMode
  previewScale: number
  isFullscreen: boolean
  bgImageUrl: string | null
  bgOpacity: number
  showStampSignature: boolean
  formData: BillOfLadingFormData
  issueDate: string
  onBackToEditor: () => void
  onSave: () => void
  onSetPreviewMode: (mode: PreviewMode) => void
  onSetManualScale: (scale: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleFullscreen: () => void
  onSetBgImage: (url: string, opacity?: number) => void
  onSetBgOpacity: (opacity: number) => void
  onToggleStampSignature: () => void
  onDownloadPdf: (kind: "all" | "bol" | "packing-list" | "stickers") => void
  onDirectPrint: () => void
  onOpenDocumentCenter: () => void
  onOpenSavedDocuments: () => void
  onNewDocument: () => void
  onDuplicateCurrent: () => void
  onOpenCloudSync: () => void
  onOpenPdfSettings: () => void
  onOpenShortcuts: () => void
  onToggleDiagnostics?: () => void
}

function A4PreviewToolbarBase({
  bolNumber,
  isLoading,
  isSaving,
  isEditMode,
  hasUnsavedChanges = false,
  autoSaveStatus,
  lastAutoSaveTime,
  lastAutoSavedTime,
  previewMode,
  previewScale,
  isFullscreen,
  bgImageUrl,
  bgOpacity,
  showStampSignature,
  formData,
  issueDate,
  onBackToEditor,
  onSave,
  onSetPreviewMode,
  onSetManualScale,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onSetBgImage,
  onSetBgOpacity,
  onToggleStampSignature,
  onDownloadPdf,
  onDirectPrint,
  onOpenDocumentCenter,
  onOpenSavedDocuments,
  onNewDocument,
  onDuplicateCurrent,
  onOpenCloudSync,
  onOpenPdfSettings,
  onOpenShortcuts,
  onToggleDiagnostics,
}: A4PreviewToolbarProps) {
  const currentPreset = DOCUMENT_BACKGROUNDS.find((p) => p.url === bgImageUrl)

  const [stampScale, setStampScale] = React.useState(() => {
    if (typeof window !== "undefined") {
      return getStoredCompanyStampConfig().scale || 1.2
    }
    return 1.2
  })

  React.useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<CompanyStampConfig>>
      if (customEvent.detail?.scale !== undefined) {
        setStampScale(customEvent.detail.scale)
      }
    }
    window.addEventListener("company_stamp_updated", handleUpdate)
    return () => window.removeEventListener("company_stamp_updated", handleUpdate)
  }, [])

  const updateStampScale = (newScale: number) => {
    const clamped = Math.min(2.5, Math.max(0.5, Math.round(newScale * 100) / 100))
    setStampScale(clamped)
    saveStoredCompanyStampConfig({ scale: clamped })
  }

  return (
    <div
      role="toolbar"
      aria-label="A4 Preview Controls"
      className="a4-preview-toolbar flex items-center justify-between gap-1 sm:gap-1.5 px-2 py-1 min-h-[44px] h-11 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xs backdrop-blur-xl shrink-0 mb-1.5 overflow-x-auto no-scrollbar scrollbar-none print:hidden"
    >
      {/* ==================================================== */}
      {/* GROUP 1: LEFT (Editor Back, BOL Number, Save Status) */}
      {/* ==================================================== */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Back to BOL Editor Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onBackToEditor}
          className="h-7.5 px-2 sm:px-2.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs shadow-2xs cursor-pointer gap-1 transition-all shrink-0"
          title="Back to BOL Editor Form (Ctrl + Shift + F)"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="hidden xl:inline">BOL Editor</span>
          <span className="xl:hidden">Editor</span>
        </Button>

        {/* BOL Number Badge */}
        <div className="flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/60 px-2 py-0.5 shadow-2xs shrink-0">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-blue-700" />
          ) : (
            <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-xs tracking-tight">
              {bolNumber}
            </span>
          )}
        </div>

        {/* Compact Saved / Autosave Status */}
        <div role="status" aria-live="polite" className="hidden lg:flex items-center shrink-0">
          {autoSaveStatus === "saving" || isSaving ? (
            <div className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50/90 px-2 py-0.5 text-[10.5px] text-amber-900 font-bold shadow-2xs animate-pulse">
              <RefreshCw className="h-2.5 w-2.5 text-amber-600 animate-spin shrink-0" />
              <span>Autosaving…</span>
            </div>
          ) : autoSaveStatus === "saved" ? (
            <div
              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 shadow-2xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100/70 transition-all"
              title={`Draft autosaved at ${lastAutoSaveTime || lastAutoSavedTime || "just now"}. Press Ctrl+S to save official document.`}
              onClick={onSave}
            >
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden 2xl:inline">Autosaved ✓ {lastAutoSaveTime || lastAutoSavedTime ? `(${lastAutoSaveTime || lastAutoSavedTime})` : ""}</span>
              <span className="2xl:hidden">Autosaved ✓</span>
            </div>
          ) : autoSaveStatus === "local" ? (
            <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-800 shadow-2xs">
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-blue-600" />
              <span>Saved locally</span>
            </div>
          ) : hasUnsavedChanges ? (
            <div
              className="flex items-center gap-1 rounded-lg border border-emerald-300/80 bg-emerald-50/70 px-2 py-0.5 text-[10.5px] font-bold text-emerald-900 shadow-2xs dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              title="Previewing live draft changes. Click Save/Update to commit official BOL."
            >
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">Live Draft Preview</span>
              <span className="xl:hidden">Draft</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 shadow-2xs">
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
              <span>Saved ✓</span>
            </div>
          )}
        </div>

        {/* Quick Save / Update Button */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="h-7.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-2.5 text-xs font-black text-white shadow-2xs hover:shadow-xs cursor-pointer flex items-center shrink-0"
          title="Save / Update Document (Ctrl + S)"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          <span>{isEditMode ? "Update" : "Save"}</span>
        </Button>
      </div>

      {/* Subtle Divider */}
      <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

      {/* ==================================================== */}
      {/* GROUP 2: CENTER (Fit Page, Fit Width, Stepper Zoom)  */}
      {/* ==================================================== */}
      <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0">
        <button
          type="button"
          data-fit-page="true"
          onClick={() => onSetPreviewMode("page")}
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            previewMode === "page"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          }`}
          title="Fit complete physical A4 page on screen without scrolling (Ctrl + 0)"
        >
          Fit Page
        </button>

        <button
          type="button"
          data-fit-width="true"
          onClick={() => onSetPreviewMode("width")}
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            previewMode === "width"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          }`}
          title="Fit document width to screen; scroll vertically (Ctrl + Shift + 0)"
        >
          Fit Width
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          className="h-6 w-6 p-0 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer"
          title="Zoom Out (Ctrl + -)"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        {/* Interactive Percentage Label: Click to reset to 100% */}
        <button
          type="button"
          onClick={() => onSetManualScale(1.0)}
          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 min-w-[36px] text-center select-none cursor-pointer transition-colors ${
            previewMode === "manual" && Math.round(previewScale * 100) === 100
              ? "text-blue-600 dark:text-blue-400 font-black"
              : "text-slate-700 dark:text-slate-300"
          }`}
          title="Click to reset to 100% physical size (Ctrl + 1)"
        >
          {Math.round(previewScale * 100)}%
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          className="h-6 w-6 p-0 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer"
          title="Zoom In (Ctrl + +)"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Subtle Divider */}
      <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

      {/* ==================================================== */}
      {/* GROUP 3: RIGHT (Watermark, Stamp, Export, More Menu) */}
      {/* ==================================================== */}
      <div className="flex items-center justify-end gap-1.5 shrink-0">
        {/* High-Clarity Background & Watermark Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7.5 px-2 rounded-lg text-xs font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 gap-1.5 shadow-2xs cursor-pointer flex items-center shrink-0"
              title={`Background & Watermark: ${currentPreset?.label ?? "None"} (${Math.round(bgOpacity * 100)}%)`}
            >
              <Palette className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="hidden sm:inline text-xs font-bold">Watermark</span>
              {bgImageUrl ? (
                <span className="rounded bg-blue-100/90 dark:bg-blue-900/60 px-1 py-0.2 text-[10px] font-mono font-bold text-blue-800 dark:text-blue-200">
                  {Math.round(bgOpacity * 100)}%
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold">Off</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-68 max-h-88 overflow-y-auto p-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border-slate-200 dark:border-slate-800"
          >
            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 px-2 py-1">
              Document Background & Watermark
            </DropdownMenuLabel>
            {DOCUMENT_BACKGROUNDS.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => onSetBgImage(preset.url, preset.opacity)}
                className={`gap-2 text-xs font-bold cursor-pointer rounded-lg px-2 py-1.5 ${
                  bgImageUrl === preset.url
                    ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span>{preset.label}</span>
                {bgImageUrl === preset.url && (
                  <Check className="h-3.5 w-3.5 ml-auto text-blue-600 dark:text-blue-400" />
                )}
              </DropdownMenuItem>
            ))}
            {bgImageUrl && (
              <>
                <DropdownMenuSeparator className="my-1.5" />
                <div className="px-2 py-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-1">
                    Watermark Opacity
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "8%", val: 0.08 },
                      { label: "14%", val: 0.14 },
                      { label: "20%", val: 0.20 },
                      { label: "28%", val: 0.28 },
                    ].map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetBgOpacity(lvl.val)
                        }}
                        className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold text-center transition-all cursor-pointer ${
                          Math.round(bgOpacity * 100) === Math.round(lvl.val * 100)
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Unified Stamp & Signature Toggle & Scale Stepper */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs overflow-hidden h-7.5 shrink-0">
          <button
            type="button"
            onClick={onToggleStampSignature}
            className={`h-full px-2 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              showStampSignature
                ? "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            title="Toggle Official Stamp & Signature Overlay"
          >
            <span className="text-xs leading-none">{showStampSignature ? "🖋️" : "⚪"}</span>
            <span>Stamp</span>
          </button>

          {showStampSignature && (
            <div className="flex items-center border-l border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/40 px-0.5 h-full">
              <button
                type="button"
                onClick={() => updateStampScale(stampScale - 0.1)}
                className="h-5 w-4.5 flex items-center justify-center text-[11px] font-black text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded cursor-pointer"
                title="Make stamp smaller"
              >
                -
              </button>
              <span className="px-1 text-[10px] font-mono font-bold text-blue-900 dark:text-blue-100 select-none">
                {Math.round(stampScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => updateStampScale(stampScale + 0.1)}
                className="h-5 w-4.5 flex items-center justify-center text-[11px] font-black text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded cursor-pointer"
                title="Make stamp bigger"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* WhatsApp Button (Hidden below 2xl) */}
        <div className="hidden 2xl:block shrink-0">
          <CopyWhatsAppButton bol={{ ...formData, bol_number: bolNumber, issue_date: issueDate }} />
        </div>

        {/* Complete PDF Split Button */}
        <div className="inline-flex items-center rounded-lg shadow-sm shadow-sky-950/20 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={() => void onDownloadPdf("all")}
            disabled={isSaving}
            className="h-7.5 px-2.5 rounded-r-none bg-gradient-to-r from-[#0369a1] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white font-extrabold text-xs cursor-pointer gap-1"
            title="Download Complete PDF (Page 1: BOL, Page 2: Packing List, Page 3: Sticker Label)"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Complete PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                className="h-7.5 px-1 rounded-l-none border-l border-white/20 bg-[#0284c7] hover:bg-[#0369a1] text-white cursor-pointer"
                title="Download options"
              >
                <span className="text-[10px] opacity-80">▾</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5 shadow-xl dark:bg-slate-900 dark:border-slate-800">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Shipping documents
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => void onDownloadPdf("all")}
                className="gap-2 text-xs font-black text-[#0284c7] dark:text-sky-400 cursor-pointer"
              >
                <Package className="h-3.5 w-3.5" />
                <span>Download Complete PDF (All 3 Documents)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-slate-800" />
              <DropdownMenuItem
                onClick={() => void onDownloadPdf("bol")}
                className="gap-2 text-xs font-bold dark:text-slate-200 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Download BOL Only (Page 1)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void onDownloadPdf("packing-list")}
                className="gap-2 text-xs font-bold dark:text-slate-200 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Download Packing List Only (Page 2)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void onDownloadPdf("stickers")}
                className="gap-2 text-xs font-bold dark:text-slate-200 cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Download Sticker Label Only (Page 3)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Print Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDirectPrint}
          className="h-7.5 px-2 sm:px-2.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-2xs cursor-pointer gap-1 flex items-center shrink-0"
          title="Instant Print True A4 Document (Ctrl + P)"
        >
          <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          <span className="hidden sm:inline">Print</span>
        </Button>

        {/* Fullscreen Toggle Button - Clean Icon Button */}
        <Button
          type="button"
          size="sm"
          variant={isFullscreen ? "default" : "outline"}
          onClick={onToggleFullscreen}
          className={`h-7.5 w-7.5 p-0 rounded-lg font-bold shadow-2xs cursor-pointer transition-all flex items-center justify-center shrink-0 ${
            isFullscreen
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          }`}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Preview (Distraction-Free)"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>

        {/* More Actions Dropdown (•••) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-2xs shrink-0 cursor-pointer"
              title="More actions & secondary tools"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl p-1.5 shadow-xl dark:bg-slate-900 dark:border-slate-800"
          >
            {/* Small Screen Fallbacks for Stamp / WhatsApp */}
            <div className="2xl:hidden">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400">
                Quick Tools & Overlays
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={onToggleStampSignature}
                className="gap-2 text-xs font-bold cursor-pointer"
              >
                <span>{showStampSignature ? "🖋️ Turn Stamp OFF" : "🖋️ Turn Stamp ON"}</span>
              </DropdownMenuItem>
              {showStampSignature && (
                <div className="flex items-center justify-between px-2 py-1 text-xs">
                  <span className="text-[11px] text-slate-500 font-bold">Stamp Scale:</span>
                  <div className="inline-flex items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateStampScale(stampScale - 0.1)
                      }}
                      className="px-2 py-0.5 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-1.5 text-[10px] font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(stampScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateStampScale(stampScale + 0.1)
                      }}
                      className="px-2 py-0.5 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              <DropdownMenuItem
                onClick={() => {
                  try {
                    const msg = buildWhatsAppBOLMessage({ ...formData, bol_number: bolNumber, issue_date: issueDate })
                    if (navigator?.clipboard) {
                      void navigator.clipboard.writeText(msg)
                      toast.success("WhatsApp message copied to clipboard!")
                    }
                  } catch {
                    toast.error("Failed to copy WhatsApp summary")
                  }
                }}
                className="gap-2 text-xs font-bold cursor-pointer"
              >
                <span className="text-emerald-600 font-bold">📱</span>
                <span>Copy WhatsApp Summary</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem onClick={onDuplicateCurrent} className="gap-2 text-xs font-bold cursor-pointer">
              <Copy className="h-3.5 w-3.5 text-purple-600" />
              <span>Duplicate BOL</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+Shift+D</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenCloudSync} className="gap-2 text-xs font-bold cursor-pointer">
              <Cloud className="h-3.5 w-3.5 text-blue-600" />
              <span>Cloud Sync / Backup</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenPdfSettings} className="gap-2 text-xs font-bold cursor-pointer">
              <Sliders className="h-3.5 w-3.5 text-slate-600" />
              <span>BOL Print Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenDocumentCenter} className="gap-2 text-xs font-bold cursor-pointer">
              <Eye className="h-3.5 w-3.5 text-[#0284c7]" />
              <span>Preview Documents (3-in-1)</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="dark:bg-slate-800" />
            <DropdownMenuItem onClick={onOpenSavedDocuments} className="gap-2 text-xs font-bold cursor-pointer">
              <FileText className="h-3.5 w-3.5 text-emerald-600" />
              <span>Saved BOLs Archive</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewDocument} className="gap-2 text-xs font-bold cursor-pointer">
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>New BOL</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+Shift+N</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="dark:bg-slate-800" />
            <DropdownMenuItem onClick={onOpenShortcuts} className="gap-2 text-xs font-bold cursor-pointer">
              <Keyboard className="h-3.5 w-3.5 text-slate-600" />
              <span>Keyboard Shortcuts</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">Ctrl+/</span>
            </DropdownMenuItem>
            {onToggleDiagnostics && (
              <>
                <DropdownMenuSeparator className="dark:bg-slate-800" />
                <DropdownMenuItem onClick={onToggleDiagnostics} className="gap-2 text-xs font-mono text-slate-500 cursor-pointer">
                  <span>Diagnostics Overlay</span>
                  <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+X</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export const A4PreviewToolbar = React.memo(A4PreviewToolbarBase)
