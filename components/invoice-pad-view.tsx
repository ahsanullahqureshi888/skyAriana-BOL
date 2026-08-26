"use client"

import { useState, useRef } from "react"
import { FileText, Printer, RefreshCw, Maximize2, Minimize2, ArrowUpRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InvoicePadView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus()
      iframeRef.current.contentWindow.print()
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    if (iframeRef.current) {
      iframeRef.current.src = "/invoice-pad/index.html?t=" + Date.now()
    }
  }

  const handleOpenExternal = () => {
    window.open("/invoice-pad/index.html", "_blank", "noopener,noreferrer")
  }

  return (
    <div className={`w-full h-full flex flex-col p-1.5 sm:p-2.5 gap-2 transition-all ${isFullscreen ? "fixed inset-0 z-[9999] bg-slate-950 p-1.5 h-screen w-screen" : "flex-1 h-[calc(100dvh-65px)]"}`}>
      {/* Top Header Banner & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-2xl border border-indigo-200/80 rounded-2xl px-3 py-1.5 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-sm shadow-indigo-600/20">
            <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate">
                Sky Ariana Commercial Invoice Pad
              </h2>
              <span className="hidden sm:inline-flex px-2 py-0.2 text-[9px] font-black rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                <span>Print-Ready A4</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate">
              Commercial Invoices, Customs Valuations & Signatures • <span className="font-[vazirmatn] text-indigo-700">سیستم صدور فاکتور تجاری</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <Button
            type="button"
            onClick={handlePrint}
            className="h-7 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Print / Save as A4 PDF"
          >
            <Printer className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Print A4</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 rounded-lg border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-900 font-black text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
            title="Reload Invoice Pad"
          >
            <RefreshCw className={`h-3 w-3 sm:mr-1 text-indigo-600 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 px-2 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3 sm:mr-1" /> : <Maximize2 className="h-3 w-3 sm:mr-1" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenExternal}
            className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-slate-900 to-blue-950 hover:bg-slate-800 text-white font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Open standalone invoice pad in a new tab"
          >
            <ArrowUpRight className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Open in Tab</span>
          </Button>
        </div>
      </div>

      {/* Embedded Invoice Pad Application Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-white shadow-md flex-1 w-full h-full min-h-0">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md transition-opacity">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <span className="mt-3 text-xs font-black text-slate-900">Loading Sky Ariana Invoice Pad...</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Initializing customs calculation engine</span>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          ref={iframeRef}
          src="/invoice-pad/index.html"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 block"
          title="Sky Ariana Invoice Pad System"
          allow="payment; camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
        />
      </div>
    </div>
  )
}
