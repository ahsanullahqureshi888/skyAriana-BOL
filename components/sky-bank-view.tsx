"use client"

import { useState, useRef } from "react"
import { Landmark, ExternalLink, RefreshCw, Maximize2, Minimize2, ArrowUpRight, ShieldCheck, Sparkles, Wallet, CreditCard, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
    <div className={`w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col gap-3 transition-all ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-2 max-w-none" : ""}`}>
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-2xl border border-emerald-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-lg shadow-emerald-950/5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/25">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                Sky Ariana Bank & Financial Portal
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Live Banking System</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Online Banking, Transaction Ledgers & Financial Transfers • <span className="font-[vazirmatn] text-emerald-700">پورتال معاملات بانکی</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation Shortcut Pills */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Quick Route Switchers */}
          <div className="hidden md:flex items-center gap-1 bg-emerald-50/80 p-1 rounded-xl border border-emerald-200/70">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate("/transactions")}
              className={`h-7 px-2.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
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
              className={`h-7 px-2.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
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
            className="h-9 px-3 rounded-xl border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs shadow-2xs cursor-pointer active:scale-95 transition-all"
            title="Reload Bank portal"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-emerald-600 ${isLoading ? "animate-spin" : ""}`} />
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
            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
            title="Open Sky Ariana Bank in a new tab"
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5" />
            <span>Open in Tab</span>
          </Button>
        </div>
      </div>

      {/* Embedded Application Frame Card */}
      <Card className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-200/60 bg-white shadow-xl shadow-slate-900/5 flex-1 min-h-[750px] h-[calc(100vh-180px)]">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md transition-opacity">
            <div className="relative">
              <div className="h-14 w-14 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-emerald-600 animate-pulse" />
              </div>
            </div>
            <span className="mt-4 text-sm font-black text-slate-900">Loading Sky Ariana Bank Portal...</span>
            <span className="text-xs text-slate-500 font-semibold mt-1">Connecting to https://skyariana-bank.vercel.app</span>
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 rounded-2xl sm:rounded-3xl"
          title="Sky Ariana Bank System"
          allow="payment; camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
        />
      </Card>
    </div>
  )
}
