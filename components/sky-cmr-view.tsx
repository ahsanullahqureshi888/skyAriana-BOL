"use client"

import { useState, useRef } from "react"
import { Truck, Printer, RefreshCw, Maximize2, Minimize2, ArrowUpRight, FileCheck, Layers, Sparkles, ShieldCheck } from "lucide-react"

export function SkyCmrView() {
  const [currentPath, setCurrentPath] = useState("/sky-cmr-border/index.html")
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
      iframeRef.current.src = currentPath + (currentPath.includes("?") ? "&" : "?") + "t=" + Date.now()
    }
  }

  const handleOpenExternal = () => {
    window.open(currentPath, "_blank", "noopener,noreferrer")
  }

  const handleNavigate = (path: string) => {
    setIsLoading(true)
    setCurrentPath(path)
    if (iframeRef.current) {
      iframeRef.current.src = path
    }
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
    <div className={`w-full overflow-hidden bg-[#090d16] flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-full min-h-0"}`}>
      {/* Floating Executive Glass Ribbon */}
      <div className="absolute top-2.5 right-3.5 z-30 flex items-center gap-1.5 bg-slate-900/92 hover:bg-slate-900 backdrop-blur-2xl border border-blue-500/30 p-1.5 rounded-2xl shadow-2xl shadow-blue-950/50 transition-all">
        {/* Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-950/70 border border-blue-500/30 text-blue-300 text-[11px] font-black mr-1 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <Truck className="h-3.5 w-3.5 text-blue-400" />
          <span>Sky CMR Border</span>
          <span className="text-[9.5px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-md font-mono border border-blue-400/20">
            Express
          </span>
        </div>

        {/* Route / View Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => handleNavigate("/sky-cmr-border/index.html")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              currentPath.includes("index.html")
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
            title="Complete International CMR Editor & Saved Archive"
          >
            <FileCheck className="h-3.5 w-3.5 text-blue-300" />
            <span className="hidden sm:inline">Main CMR</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("/sky-cmr-border/cmr_page1.html")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              currentPath.includes("cmr_page1.html")
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
            title="CMR Waybill Page 1 (Consignment & Shipper / Consignee)"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-300" />
            <span className="hidden sm:inline">Page 1</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("/sky-cmr-border/cmr_page2.html")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              currentPath.includes("cmr_page2.html")
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
            title="CMR Waybill Page 2 (Border & Customs Transit Document)"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Page 2</span>
          </button>
        </div>

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md cursor-pointer active:scale-95 transition-all"
          title="Print CMR Waybill"
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Print</span>
        </button>

        {/* Reload */}
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center h-7.5 w-7.5 rounded-xl bg-slate-800/90 hover:bg-blue-900/60 text-blue-300 border border-slate-700 hover:border-blue-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Reload CMR Module"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
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
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
          title="Open Sky CMR in a new browser tab"
        >
          <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Open in Tab</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090d16]/92 backdrop-blur-md transition-opacity">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Truck className="h-7 w-7 text-blue-400 animate-pulse" />
            </div>
          </div>
          <span className="mt-4 text-sm font-black text-white tracking-wide">Connecting to Sky CMR Border Waybill...</span>
          <span className="text-xs text-blue-400 font-semibold mt-1">International Consignment Note & Border Waybill System</span>
        </div>
      )}

      {/* 100% Full Height Iframe */}
      <iframe
        ref={iframeRef}
        src={currentPath}
        onLoad={() => setIsLoading(false)}
        className="w-full h-full flex-1 min-h-0 border-0 block bg-[#090d16]"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100%",
          flex: "1 1 0%",
          display: "block",
          border: "none",
          backgroundColor: "#090d16"
        }}
        title="Sky Ariana CMR International Consignment Note & Border Waybill"
        allow="payment; camera; microphone; clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
      />
    </div>
  )
}
