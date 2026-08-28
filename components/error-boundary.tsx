"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Download, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isChunkError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isChunkError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    const errorMsg = String(error?.message || error || "")
    const isChunk =
      error?.name === "ChunkLoadError" ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Failed to load chunk") ||
      errorMsg.includes("_next/static/chunks") ||
      errorMsg.includes("CSS chunk")

    return { hasError: true, error, errorInfo: null, isChunkError: isChunk }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo)
    this.setState({ errorInfo })

    const errorMsg = String(error?.message || error || "")
    const isChunk =
      error?.name === "ChunkLoadError" ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Failed to load chunk") ||
      errorMsg.includes("_next/static/chunks") ||
      errorMsg.includes("CSS chunk")

    if (isChunk && typeof window !== "undefined") {
      const lastReload = Number(sessionStorage.getItem("sky_error_boundary_reload") || "0")
      const now = Date.now()
      if (now - lastReload > 12000) {
        sessionStorage.setItem("sky_error_boundary_reload", String(now))
        window.location.reload()
      }
    }
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sky_error_boundary_reload", String(Date.now()))
      window.location.reload()
    }
  }

  private handleEmergencyBackup = () => {
    try {
      const backupData: Record<string, any> = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key && key.startsWith("sky")) {
          backupData[key] = window.localStorage.getItem(key)
        }
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `skyariana-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert("Could not generate emergency backup: " + e)
    }
  }

  private handleSafeReset = () => {
    if (confirm("This will safely refresh temporary cache while preserving your saved BOLs and Ledgers. Continue?")) {
      window.location.href = window.location.pathname
    }
  }

  public render() {
    if (this.state.hasError) {
      const { isChunkError } = this.state

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 text-white font-sans">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
              isChunkError 
                ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-cyan-500/10" 
                : "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-amber-500/10"
            }`}>
              {isChunkError ? <Sparkles className="w-8 h-8 animate-pulse" /> : <AlertTriangle className="w-8 h-8" />}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isChunkError ? "New Version Available / بروزرسانی جدید" : "Application Recovery Shield"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                {isChunkError 
                  ? "A new update for Sky Ariana has been deployed. Reload to activate the latest features. Your local data is safe."
                  : "The application encountered an unexpected runtime state. Your local data remains completely safe."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left overflow-auto max-h-32 text-[11px] font-mono text-rose-400">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={this.handleReload}
                className={`gap-2 text-white font-black rounded-xl h-11 shadow-lg cursor-pointer ${
                  isChunkError
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/25"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isChunkError ? "Update & Reload" : "Reload Application"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={this.handleEmergencyBackup}
                className="gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 font-black rounded-xl h-11 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download Backup</span>
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Sky Ariana Safe Recovery
              </span>
              <button
                type="button"
                onClick={this.handleSafeReset}
                className="hover:text-blue-400 underline cursor-pointer"
              >
                Safe URL Reset
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
