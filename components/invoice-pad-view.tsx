"use client"

import { useState, useRef } from "react"
import { FileText, Printer, RefreshCw, Maximize2, Minimize2, ArrowUpRight, Sparkles } from "lucide-react"

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

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }

  return (
    <div className={`relative w-full overflow-hidden bg-slate-950 flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-[calc(100vh-58px)] min-h-[calc(100vh-58px)]"}`}>
      {/* Floating Executive Toolbar */}
      <div className="absolute top-2.5 right-3.5 z-30 flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-indigo-500/30 p-1.5 rounded-2xl shadow-2xl shadow-indigo-950/40 transition-all">
        {/* Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-black mr-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <FileText className="h-3.5 w-3.5 text-indigo-400" />
          <span>Invoice Pad A4</span>
        </div>

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
          title="Print or Save as A4 PDF"
        >
          <Printer className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Print A4</span>
        </button>

        {/* Reload */}
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center h-7.5 w-7.5 rounded-xl bg-slate-800/90 hover:bg-indigo-900/60 text-indigo-300 border border-slate-700 hover:border-indigo-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Reload Invoice Pad"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center justify-center h-7.5 w-7.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-amber-400" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-300" />}
        </button>

        {/* Open in External Tab */}
        <button
          type="button"
          onClick={handleOpenExternal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-600 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Open standalone invoice pad in a new tab"
        >
          <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Open in Tab</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="h-7 w-7 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <span className="mt-4 text-sm font-black text-white tracking-wide">Loading Commercial Invoice Pad...</span>
          <span className="text-xs text-indigo-400 font-semibold mt-1">Initializing customs calculation engine</span>
        </div>
      )}

      {/* Edge-to-Edge 100% Full Height Embedded Iframe */}
      <iframe
        ref={iframeRef}
        src="/invoice-pad/index.html"
        onLoad={() => setIsLoading(false)}
        className="w-full flex-1 border-0 block"
        style={{
          width: "100%",
          height: isFullscreen ? "100vh" : "calc(100vh - 58px)",
          minHeight: isFullscreen ? "100vh" : "calc(100vh - 58px)",
          flex: "1 1 0%",
          display: "block",
          border: "none"
        }}
        title="Sky Ariana Commercial Invoice Pad"
        allow="payment; camera; microphone; clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
      />
    </div>
  )
}
