"use client"

import { useState, useRef } from "react"
import { FileText, Printer, RefreshCw, Maximize2, Minimize2, ArrowUpRight, Sparkles, ShieldCheck, Download, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
    <div className={`w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col gap-3 transition-all ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-2 max-w-none" : ""}`}>
      {/* Top Header Banner & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-2xl border border-indigo-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-indigo-950/5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/25">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                Sky Ariana Commercial Invoice Pad
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Print-Ready A4 Pad</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Official Commercial Invoices, Customs Valuations & Digital Signatures • <span className="font-[vazirmatn] text-indigo-700">سیستم صدور فاکتور تجاری</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <Button
            type="button"
            onClick={handlePrint}
            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 transition-all"
            title="Print / Save as A4 PDF"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            <span>Print A4 Invoice</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 px-3 rounded-xl border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-900 font-black text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
            title="Reload Invoice Pad"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-indigo-600 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 mr-1" /> : <Maximize2 className="h-3.5 w-3.5 mr-1" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenExternal}
            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950 hover:bg-slate-800 text-white font-black text-xs shadow-md shadow-slate-900/20 cursor-pointer active:scale-95 transition-all"
            title="Open standalone invoice pad in a new tab"
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5" />
            <span>Open in Tab</span>
          </Button>
        </div>
      </div>

      {/* Embedded Invoice Pad Application Frame */}
      <Card className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-indigo-200/60 bg-white shadow-xl shadow-slate-900/5 flex-1 min-h-[850px] h-[calc(100vh-180px)]">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md transition-opacity">
            <div className="relative">
              <div className="h-14 w-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="h-6 w-6 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <span className="mt-4 text-sm font-black text-slate-900">Loading Sky Ariana Invoice Pad...</span>
            <span className="text-xs text-slate-500 font-semibold mt-1">Initializing customs calculation engine</span>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          ref={iframeRef}
          src="/invoice-pad/index.html"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 rounded-2xl sm:rounded-3xl"
          title="Sky Ariana Invoice Pad System"
          allow="payment; camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
        />
      </Card>
    </div>
  )
}
