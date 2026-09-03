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
  LayoutDashboard,
  Plane,
  Tag,
  Award,
  FileSpreadsheet,
  Key,
  Copy,
  Check,
  ShieldCheck,
  Globe
} from "lucide-react"

const DOC_PORTAL_URL = "https://skyariana-doc-ten.vercel.app/"

export function SkyDocView() {
  const [currentUrl, setCurrentUrl] = useState(DOC_PORTAL_URL)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [loadError, setLoadError] = useState(false)
  const [copiedCreds, setCopiedCreds] = useState(false)
  const [showCredsHint, setShowCredsHint] = useState(false)
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

  const handleNavigate = (url: string) => {
    setIsLoading(true)
    setLoadError(false)
    setCurrentUrl(url)
    if (iframeRef.current) {
      iframeRef.current.src = url
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

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(130, Math.max(75, prev + delta)))
  }

  const handleResetZoom = () => {
    setZoomLevel(100)
  }

  const copyCredentials = () => {
    navigator.clipboard.writeText("admin@skyariana.com\nadmin123")
    setCopiedCreds(true)
    setTimeout(() => setCopiedCreds(false), 2500)
  }

  // Keyboard shortcut listener
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

  const isConsoleActive = currentUrl === DOC_PORTAL_URL || currentUrl === `${DOC_PORTAL_URL}#`
  const isInvoicesActive = currentUrl.includes("/invoices")
  const isStickersActive = currentUrl.includes("/shipping-stickers")
  const isWaybillsActive = currentUrl.includes("/air-waybills")
  const isSaftaActive = currentUrl.includes("/safta-certificates")
  const isA4PadActive = currentUrl.includes("/sky-doc/index.html")

  return (
    <div className={`w-full overflow-hidden bg-[#030914] flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-full min-h-0"}`}>
      
      {/* Top Animated Progress/Glow Strip */}
      <div className="w-full h-[2.5px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-600 shadow-[0_1px_8px_rgba(6,182,212,0.4)] shrink-0" />

      {/* Floating Executive Glass Control Ribbon */}
      <div className="absolute top-3.5 right-4 z-30 flex items-center gap-1.5 bg-slate-900/95 hover:bg-slate-900 backdrop-blur-2xl border border-cyan-500/35 p-1.5 rounded-2xl shadow-2xl shadow-cyan-950/50 transition-all max-w-[96vw] overflow-x-auto no-scrollbar">
        
        {/* Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-black mr-1 shadow-inner shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <FileText className="h-3.5 w-3.5 text-cyan-400" />
          <span className="tracking-tight font-extrabold">SKY DOC Live</span>
          <span className="hidden xl:inline text-[9.5px] text-cyan-400/70 font-mono">| Enterprise OS</span>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/80 text-xs text-slate-300 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigate(DOC_PORTAL_URL)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isConsoleActive
                ? "bg-cyan-600 text-slate-950 font-black shadow-xs"
                : "hover:bg-slate-700/80 text-slate-300"
            }`}
            title="Live Enterprise Logistics Console (Dashboard)"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Console</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(`${DOC_PORTAL_URL}invoices`)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isInvoicesActive
                ? "bg-cyan-600 text-slate-950 font-black shadow-xs"
                : "hover:bg-slate-700/80 text-slate-300"
            }`}
            title="Commercial Invoices"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(`${DOC_PORTAL_URL}shipping-stickers`)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isStickersActive
                ? "bg-cyan-600 text-slate-950 font-black shadow-xs"
                : "hover:bg-slate-700/80 text-slate-300"
            }`}
            title="Shipping Stickers & Labels"
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Stickers</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(`${DOC_PORTAL_URL}air-waybills`)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isWaybillsActive
                ? "bg-cyan-600 text-slate-950 font-black shadow-xs"
                : "hover:bg-slate-700/80 text-slate-300"
            }`}
            title="Air Waybills (IATA)"
          >
            <Plane className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Air Waybills</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(`${DOC_PORTAL_URL}safta-certificates`)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isSaftaActive
                ? "bg-cyan-600 text-slate-950 font-black shadow-xs"
                : "hover:bg-slate-700/80 text-slate-300"
            }`}
            title="SAFTA Certificates of Origin"
          >
            <Award className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">SAFTA</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("/sky-doc/index.html")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isA4PadActive
                ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                : "hover:bg-slate-700/80 text-slate-300"
            }`}
            title="A4 Commercial Invoice Pad (Single Sheet Editor)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">A4 Pad</span>
          </button>
        </div>

        {/* Credentials / Quick Access Helper */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCredsHint(prev => !prev)}
            className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
              showCredsHint
                ? "bg-cyan-500 text-slate-950 border-cyan-300"
                : "bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Credentials & Access Info"
          >
            <Key className="h-3.5 w-3.5" />
          </button>

          {showCredsHint && (
            <div className="absolute top-10 right-0 z-50 w-72 bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl text-xs text-slate-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  SKY DOC Portal Access
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Super Admin</span>
              </div>
              <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white font-semibold select-all">admin@skyariana.com</span>
                </div>
                <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-400">Pass:</span>
                  <span className="text-amber-300 font-semibold select-all">admin123</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedCreds ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-slate-950" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Login Credentials</span>
                  </>
                )}
              </button>
            </div>
          )}
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
              {currentUrl}
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
          className="border-0 bg-[#030914] flex-1 min-h-0 w-full h-full"
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
