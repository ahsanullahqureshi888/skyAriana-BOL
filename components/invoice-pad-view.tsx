"use client"

import { useState, useRef } from "react"
import { FileText, Printer, RefreshCw, Maximize2, Minimize2, ArrowUpRight } from "lucide-react"

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
    <div className={`w-full overflow-hidden bg-slate-950 flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-[calc(100vh-56px)] min-h-0"}`}>
      {/* Floating Minimal Controls */}
      <div className="absolute top-2.5 right-4 z-30 flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-indigo-500/30 p-1 rounded-xl shadow-2xl transition-all">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer active:scale-95"
          title="Print A4 PDF"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print</span>
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800 hover:bg-indigo-900 text-indigo-300 border border-slate-700 cursor-pointer active:scale-95"
          title="Reload"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer active:scale-95"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-amber-400" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-300" />}
        </button>

        <button
          type="button"
          onClick={handleOpenExternal}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 cursor-pointer active:scale-95"
          title="Open in new tab"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin" />
          <span className="mt-3 text-xs font-bold text-white tracking-wide">Loading Invoice Pad...</span>
        </div>
      )}

      {/* 100% Full Height Iframe */}
      <iframe
        ref={iframeRef}
        src="/invoice-pad/index.html"
        onLoad={() => setIsLoading(false)}
        className="w-full h-full flex-1 min-h-0 border-0 block bg-slate-950"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100%",
          border: "none",
          display: "block"
        }}
        title="Sky Ariana Commercial Invoice Pad"
        allow="payment; camera; microphone; clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
      />
    </div>
  )
}
