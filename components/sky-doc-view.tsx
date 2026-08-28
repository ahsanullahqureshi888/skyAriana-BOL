"use client"

import { useState, useRef } from "react"
import { FileText, RefreshCw, Maximize2, Minimize2, ExternalLink } from "lucide-react"

export function SkyDocView() {
  const [currentUrl, setCurrentUrl] = useState("https://skyariana-doc-ten.vercel.app/")
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => {
    setIsLoading(true)
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl
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

  return (
    <div className={`w-full overflow-hidden bg-[#040d1a] flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-full min-h-0"}`}>
      {/* Floating Executive Glass Ribbon */}
      <div className="absolute top-2.5 right-3.5 z-30 flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-cyan-500/30 p-1.5 rounded-2xl shadow-2xl shadow-cyan-950/40 transition-all">
        {/* Sky Doc Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] font-black mr-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <FileText className="h-3.5 w-3.5 text-cyan-400" />
          <span>Sky Doc Live</span>
        </div>

        {/* Reload */}
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center h-7.5 w-7.5 rounded-xl bg-slate-800/90 hover:bg-cyan-900/60 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Reload Sky Doc Portal"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
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

        {/* Open in New Window */}
        <button
          type="button"
          onClick={handleOpenExternal}
          className="flex items-center justify-center h-7.5 w-7.5 rounded-xl bg-slate-800/90 hover:bg-cyan-900/60 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Open in Separate Browser Tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <FileText className="absolute h-6 w-6 text-cyan-400" />
          </div>
          <p className="mt-4 text-xs font-black text-cyan-200 tracking-wider uppercase animate-pulse">
            Connecting to Sky Doc System...
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-semibold">
            Enterprise Document Management &amp; Operations
          </p>
        </div>
      )}

      {/* Embedded Application Frame */}
      <iframe
        ref={iframeRef}
        src={currentUrl}
        className="w-full h-full border-0 bg-slate-950 flex-1 min-h-0"
        title="SKY DOC - Sky Ariana Document System"
        onLoad={() => setIsLoading(false)}
        allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
      />
    </div>
  )
}
