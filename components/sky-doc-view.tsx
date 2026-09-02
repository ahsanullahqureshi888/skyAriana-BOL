"use client"

import { useState, useRef, useEffect } from "react"
import { 
  FileText, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Sparkles,
  ShieldCheck,
  Globe,
  Wifi,
  ChevronDown,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function SkyDocView() {
  const [currentUrl, setCurrentUrl] = useState("/sky-doc/index.html")
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [loadError, setLoadError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => {
    setIsLoading(true)
    setLoadError(false)
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl + (currentUrl.includes("?") ? "&" : "?") + "t=" + Date.now()
    }
  }


  const handleOpenExternal = () => {
    window.open(currentUrl, "_blank", "noopener,noreferrer")
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

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(130, Math.max(75, prev + delta)))
  }

  const handleResetZoom = () => {
    setZoomLevel(100)
  }

  // Keyboard shortcut listener for fast operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault()
        handleRefresh()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen, currentUrl])

  return (
    <div className={`w-full overflow-hidden bg-[#030914] flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-full min-h-0"}`}>
      
      {/* Top Animated Progress/Glow Strip */}
      <div className="w-full h-[2.5px] bg-gradient-to-r from-cyan-400 via-teal-500 to-blue-600 shadow-[0_1px_8px_rgba(6,182,212,0.4)] shrink-0" />

      {/* Floating Executive Glass Control Ribbon */}
      <div className="absolute top-3.5 right-4 z-30 flex items-center gap-1.5 bg-slate-900/95 hover:bg-slate-900 backdrop-blur-2xl border border-cyan-500/35 p-1.5 rounded-2xl shadow-2xl shadow-cyan-950/50 transition-all">
        
        {/* Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-black mr-1 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <FileText className="h-3.5 w-3.5 text-cyan-400" />
          <span className="tracking-tight font-extrabold">SKY DOC Live</span>
          <span className="hidden xl:inline text-[9.5px] text-cyan-400/70 font-mono">| Enterprise OS</span>
        </div>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/80 text-slate-300">
          <button
            type="button"
            onClick={() => handleZoom(-5)}
            disabled={zoomLevel <= 75}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-700 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 h-7 rounded-lg flex items-center justify-center hover:bg-slate-700 text-[11px] font-mono font-black text-cyan-300 transition-all cursor-pointer"
            title="Reset Zoom (100%)"
          >
            {zoomLevel}%
          </button>

          <button
            type="button"
            onClick={() => handleZoom(5)}
            disabled={zoomLevel >= 130}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-700 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Reload / Sync */}
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-800/90 hover:bg-cyan-900/70 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Reload Portal (Alt+R)"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
          title={isFullscreen ? "Exit Fullscreen (Alt+F)" : "Immersive Fullscreen (Alt+F)"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-amber-400" /> : <Maximize2 className="h-4 w-4 text-slate-300" />}
        </button>

        {/* Open in Separate Tab */}
        <button
          type="button"
          onClick={handleOpenExternal}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 border border-cyan-400/60 font-black shadow-md shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          title="Open in Separate Browser Tab / Window"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#030914]/90 backdrop-blur-lg transition-opacity duration-300">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin shadow-[0_0_20px_rgba(6,182,212,0.3)]" />
            <FileText className="absolute h-7 w-7 text-cyan-400 animate-pulse" />
          </div>
          <div className="mt-5 text-center">
            <p className="text-sm font-black text-white tracking-wide uppercase flex items-center justify-center gap-2">
              <span>Connecting to SKY DOC Portal</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </p>
            <p className="mt-1 text-xs text-cyan-300/80 font-bold font-[vazirmatn]">
              سیستم جامع اسناد و عملیات سکای آریانا
            </p>
            <p className="mt-2 text-[11px] text-slate-500 font-mono">
              https://skyariana-doc-ten.vercel.app/
            </p>
          </div>
        </div>
      )}

      {/* Embedded High-Performance Application Frame */}
      <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
        <iframe
          ref={iframeRef}
          src={currentUrl}
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            transformOrigin: "top left",
            width: zoomLevel !== 100 ? `${(100 / zoomLevel) * 100}%` : "100%",
            height: zoomLevel !== 100 ? `${(100 / zoomLevel) * 100}%` : "100%",
          }}
          className="border-0 bg-[#030914] flex-1 min-h-0"
          title="SKY DOC - Sky Ariana Enterprise Operating System"
          onLoad={() => {
            setIsLoading(false)
            setLoadError(false)
          }}
          onError={() => {
            setIsLoading(false)
            setLoadError(true)
          }}
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
        />
      </div>
    </div>
  )
}
