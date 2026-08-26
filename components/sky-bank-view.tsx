"use client"

import { useState, useRef } from "react"
import { Landmark, RefreshCw, Maximize2, Minimize2, ArrowUpRight, ShieldCheck, Wallet, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  return (
    <div className={`w-full h-full flex flex-col p-1.5 sm:p-2.5 gap-2 transition-all ${isFullscreen ? "fixed inset-0 z-[9999] bg-slate-950 p-1.5 h-screen w-screen" : "flex-1 h-[calc(100dvh-65px)]"}`}>
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-2xl border border-emerald-200/80 rounded-2xl px-3 py-1.5 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-600/20">
            <Landmark className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                Sky Ariana Bank & Financial Portal
              </h2>
              <span className="hidden sm:inline-flex px-2 py-0.2 text-[9px] font-black rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                <span>Live Portal</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate">
              Money Transactions & Hawala Receipt System • <span className="font-[vazirmatn] text-emerald-700">پورتال معاملات بانکی</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation Shortcut Pills */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Quick Route Switchers */}
          <div className="flex items-center gap-0.5 bg-emerald-50/80 p-0.5 rounded-lg border border-emerald-200/70">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate("/transactions")}
              className={`h-7 px-2 rounded-md text-[11px] font-black cursor-pointer transition-all ${
                currentUrl.includes("/transactions") ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-900 hover:bg-emerald-100"
              }`}
            >
              <CreditCard className="h-3 w-3 mr-1" />
              <span>Transactions</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate("/")}
              className={`h-7 px-2 rounded-md text-[11px] font-black cursor-pointer transition-all ${
                !currentUrl.includes("/transactions") ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-900 hover:bg-emerald-100"
              }`}
            >
              <Wallet className="h-3 w-3 mr-1" />
              <span>Dashboard</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 rounded-lg border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
            title="Reload Bank portal"
          >
            <RefreshCw className={`h-3 w-3 sm:mr-1 text-emerald-600 ${isLoading ? "animate-spin" : ""}`} />
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
            className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Open Sky Ariana Bank in a new tab"
          >
            <ArrowUpRight className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Open in Tab</span>
          </Button>
        </div>
      </div>

      {/* Embedded Application Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-white shadow-md flex-1 w-full h-full min-h-0">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md transition-opacity">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-emerald-600 animate-pulse" />
              </div>
            </div>
            <span className="mt-3 text-xs font-black text-slate-900">Loading Sky Ariana Bank Portal...</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Connecting to https://skyariana-bank.vercel.app</span>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 block"
          title="Sky Ariana Bank System"
          allow="payment; camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
        />
      </div>
    </div>
  )
}
