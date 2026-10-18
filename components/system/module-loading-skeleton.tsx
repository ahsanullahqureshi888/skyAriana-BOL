"use client"

import React, { useState, useEffect } from "react"
import { AlertTriangle, RefreshCw, Home, Activity, ChevronDown, ChevronUp, Copy, Check, Clock } from "lucide-react"

export interface ModuleLoadingSkeletonProps {
  moduleName?: string
  timeoutMs?: number
  onRetry?: () => void
}

export function ModuleLoadingSkeleton({
  moduleName = "Module",
  timeoutMs = 6000,
  onRetry,
}: ModuleLoadingSkeletonProps) {
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timestamp] = useState(() => new Date().toISOString())
  const [isOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true))

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleReturnToDashboard = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skybol:navigate-view", { detail: { view: "shipments" } }))
    }
  }

  const handleManualRetry = () => {
    if (onRetry) {
      onRetry()
    } else if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  const handleCopyDiagnostics = () => {
    const diagnosticsData = {
      module: moduleName,
      timestamp,
      secondsElapsed,
      isOnline,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      url: typeof window !== "undefined" ? window.location.href : "N/A",
    }
    navigator.clipboard.writeText(JSON.stringify(diagnosticsData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isDev = process.env.NODE_ENV !== "production"
  const stage3Threshold = isDev ? 20 : 8
  const stage2Threshold = isDev ? 5 : 2

  // Stage 3: Delayed — Replace spinner with recovery card
  if (secondsElapsed >= stage3Threshold) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-slate-900/95 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Loading <span className="text-amber-300 font-semibold">{moduleName}</span> Delayed
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              This module is taking longer than expected ({secondsElapsed}s). You can retry fetching the module, return to the operations dashboard, or view diagnostics.
            </p>
          </div>

          {!isOnline && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-[11px] font-semibold text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Device is currently offline
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              onClick={handleManualRetry}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Loading
            </button>

            <button
              onClick={handleReturnToDashboard}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-blue-400" />
              Return to Dashboard
            </button>

            <button
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              Diagnostics
              {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showDiagnostics && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-left space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Diagnostics</span>
                <button
                  onClick={handleCopyDiagnostics}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 space-y-1">
                <p><span className="text-slate-500">Module:</span> {moduleName}</p>
                <p><span className="text-slate-500">Duration:</span> {secondsElapsed}s</p>
                <p><span className="text-slate-500">Online:</span> {isOnline ? "Yes" : "No"}</p>
                <p><span className="text-slate-500">Timestamp:</span> {timestamp}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Stage 2: Warning indicator
  if (secondsElapsed >= stage2Threshold) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in duration-150">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
          <img src="/logo.png" alt="AQ Companies" className="w-7 h-7 object-contain" />
        </div>
        <div className="h-1.5 w-36 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-amber-300">
            Loading {moduleName}... This is taking a moment ({secondsElapsed}s)
          </p>
          <p className="text-[11px] text-slate-500">Optimizing resources and initializing view components</p>
        </div>
      </div>
    )
  }

  // Stage 1: 0 - 2 seconds — Normal elegant loading
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in duration-100">
      <div className="w-12 h-12 rounded-2xl bg-blue-900/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
        <img src="/logo.png" alt="AQ Companies" className="w-8 h-8 object-contain" />
      </div>
      <div className="h-1.5 w-28 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
      </div>
      <p className="text-[11px] font-medium text-slate-400">Loading {moduleName}...</p>
    </div>
  )
}
