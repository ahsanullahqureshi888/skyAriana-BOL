"use client"

import React, { useState, useEffect } from "react"
import { AlertTriangle, RefreshCw, Home, Activity, Check, Copy, ChevronDown, ChevronUp } from "lucide-react"

export interface ModuleLoadFallbackProps {
  moduleName?: string
  error?: any
  onRetry?: () => void
  isRetrying?: boolean
}

export function ModuleLoadFallback({
  moduleName = "Application View",
  error,
  onRetry,
  isRetrying = false,
}: ModuleLoadFallbackProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timestamp] = useState(() => new Date().toISOString())
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true))

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const errorString = String(error?.message || error?.name || error || "Unknown chunk loading or module initialization error")
  const stackString = String(error?.stack || "")

  const handleReturnToDashboard = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skybol:navigate-view", { detail: { view: "shipments" } }))
    }
  }

  const handleCopyDiagnostics = () => {
    const diagnosticsData = {
      module: moduleName,
      timestamp,
      error: errorString,
      stack: stackString,
      isOnline,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      url: typeof window !== "undefined" ? window.location.href : "N/A",
    }
    navigator.clipboard.writeText(JSON.stringify(diagnosticsData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Module Failed to Load</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The software encountered an issue loading <span className="font-semibold text-amber-300">"{moduleName}"</span>. 
            This can happen when network connectivity drops or when new application code is deployed.
          </p>
        </div>

        {!isOnline && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-[11px] font-semibold text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Device is currently offline
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onRetry && (
            <button
              onClick={() => {
                const isChunk =
                  error?.name === "ChunkLoadError" ||
                  errorString.includes("Loading chunk") ||
                  errorString.includes("Failed to load chunk") ||
                  errorString.includes("_next/static/chunks")
                if (isChunk && typeof window !== "undefined") {
                  window.location.reload()
                } else if (onRetry) {
                  onRetry()
                }
              }}
              disabled={isRetrying}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Reloading Chunk..." : "Retry Loading"}
            </button>
          )}

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
          <div className="mt-4 pt-4 border-t border-slate-800/80 text-left space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                System Diagnostics
              </span>
              <button
                onClick={handleCopyDiagnostics}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 space-y-1.5 overflow-x-auto max-h-48 overflow-y-auto">
              <p><span className="text-slate-500">Module:</span> {moduleName}</p>
              <p><span className="text-slate-500">Timestamp:</span> {timestamp}</p>
              <p><span className="text-slate-500">Status:</span> {isOnline ? "Online" : "Offline"}</p>
              <p className="text-rose-400 break-all"><span className="text-slate-500">Error:</span> {errorString}</p>
              {stackString && (
                <pre className="text-[10px] text-slate-500 whitespace-pre-wrap font-mono mt-2 pt-2 border-t border-slate-800/60">
                  {stackString}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
