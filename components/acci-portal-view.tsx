"use client"

import { useState, useRef } from "react"
import { 
  Building2, 
  FileText, 
  Package, 
  Plane, 
  ShieldCheck, 
  Printer, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function AcciPortalView() {
  const [currentPath, setCurrentPath] = useState("/acci-laravel/index.html")
  const [activeTab, setActiveTab] = useState<"invoice" | "packing-list" | "safta" | "airwaybill" | "stickers">("invoice")
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

  const handleNavigateTab = (tab: "invoice" | "packing-list" | "safta" | "airwaybill" | "stickers") => {
    setActiveTab(tab)
    setIsLoading(true)
    let path = "/acci-laravel/index.html"
    if (tab === "packing-list") {
      path = "/acci-laravel/index.html#packing-list"
    } else if (tab === "safta") {
      path = "/acci-laravel/index.html#safta"
    } else if (tab === "airwaybill") {
      path = "/acci-laravel/index.html#airwaybill"
    } else if (tab === "stickers") {
      path = "/acci-laravel/index.html#stickers"
    }
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
    <div className={`w-full overflow-hidden bg-[#070d18] flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-full min-h-0"}`}>
      {/* Floating Executive Ribbon */}
      <div className="absolute top-2.5 right-3.5 z-30 flex items-center gap-1.5 bg-slate-900/95 hover:bg-slate-900 backdrop-blur-2xl border border-amber-500/30 p-1.5 rounded-2xl shadow-2xl shadow-amber-950/50 transition-all max-w-[95vw] overflow-x-auto no-scrollbar">
        {/* Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-black mr-1 shadow-inner shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <Building2 className="h-3.5 w-3.5 text-amber-400" />
          <span>ACCI Chamber Suite</span>
        </div>

        {/* Tab Selectors */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigateTab("invoice")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === "invoice" ? "bg-amber-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Commercial Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTab("packing-list")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === "packing-list" ? "bg-amber-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Packing List</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTab("safta")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === "safta" ? "bg-amber-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>SAFTA Origin</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTab("airwaybill")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === "airwaybill" ? "bg-amber-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            <span>Air Waybill</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-800 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrint}
            className="h-7 px-2.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800"
            title="Print Official Document"
          >
            <Printer className="h-3.5 w-3.5 mr-1 text-amber-400" />
            <span className="hidden sm:inline">Print A4</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-7 w-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Reload Form"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenExternal}
            className="h-7 w-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Open in Full Window"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-7 w-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="relative w-full flex-1 h-full min-h-0 bg-slate-950">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-20 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <Building2 className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs font-bold text-amber-300">Loading ACCI Trade Document Suite...</p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={currentPath}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-white"
          title="ACCI Chamber of Commerce & Investment Portal"
        />
      </div>
    </div>
  )
}

