"use client"

import { useState, useRef } from "react"
import { Landmark, RefreshCw, Maximize2, Minimize2, ArrowUpRight, ShieldCheck, Wallet, CreditCard } from "lucide-react"

export function SkyBankView() {
  const [currentUrl, setCurrentUrl] = useState("https://skyariana-bank.vercel.app/transactions")
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

  const handleNavigate = (path: string) => {
    setIsLoading(true)
    const target = `https://skyariana-bank.vercel.app${path}`
    setCurrentUrl(target)
    if (iframeRef.current) {
      iframeRef.current.src = target
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
    <div className={`relative w-full overflow-hidden bg-slate-950 flex flex-col ${isFullscreen ? "fixed inset-0 z-[99999] h-screen w-screen" : "flex-1 w-full h-[calc(100vh-58px)] min-h-[calc(100vh-58px)]"}`}>
      {/* Floating Executive Glass Ribbon */}
      <div className="absolute top-2.5 right-3.5 z-30 flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-emerald-500/30 p-1.5 rounded-2xl shadow-2xl shadow-emerald-950/40 transition-all">
        {/* Sky Bank Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-black mr-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Landmark className="h-3.5 w-3.5 text-emerald-400" />
          <span>Sky Bank Live</span>
        </div>

        {/* Route Selectors */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => handleNavigate("/transactions")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              currentUrl.includes("/transactions") ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Transactions</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("/")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              !currentUrl.includes("/transactions") ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold" : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>

        {/* Reload */}
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center h-7.5 w-7.5 rounded-xl bg-slate-800/90 hover:bg-emerald-900/60 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
          title="Reload Bank Portal"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
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
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
          title="Open Sky Ariana Bank in a new tab"
        >
          <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Open in Tab</span>
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Landmark className="h-7 w-7 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <span className="mt-4 text-sm font-black text-white tracking-wide">Connecting to Sky Ariana Bank...</span>
          <span className="text-xs text-emerald-400 font-semibold mt-1">https://skyariana-bank.vercel.app</span>
        </div>
      )}

      {/* Edge-to-Edge 100% Full Height Embedded Iframe */}
      <iframe
        ref={iframeRef}
        src={currentUrl}
        onLoad={() => setIsLoading(false)}
        className="w-full flex-1 border-0 block bg-[#f5f9ff]"
        style={{
          width: "100%",
          height: isFullscreen ? "100vh" : "calc(100vh - 58px)",
          minHeight: isFullscreen ? "100vh" : "calc(100vh - 58px)",
          flex: "1 1 0%",
          display: "block",
          border: "none"
        }}
        title="Sky Ariana Bank System"
        allow="payment; camera; microphone; clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
      />
    </div>
  )
}
