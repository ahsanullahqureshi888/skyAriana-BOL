"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"

interface ModuleErrorBoundaryProps {
  moduleName?: string
  children: ReactNode
  onReset?: () => void
}

interface ModuleErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDiagnostics: boolean
  copied: boolean
}

export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  public state: ModuleErrorBoundaryState = {
    hasError: false,
    error: null,
    showDiagnostics: false,
    copied: false,
  }

  public static getDerivedStateFromError(error: Error): Partial<ModuleErrorBoundaryState> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ModuleErrorBoundary] Error in "${this.props.moduleName || 'Module'}":`, error, errorInfo)
  }

  private handleRetry = () => {
    const errorMsg = String(this.state.error?.message || "")
    const isChunk =
      this.state.error?.name === "ChunkLoadError" ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Failed to load chunk") ||
      errorMsg.includes("_next/static/chunks")
    if (isChunk && typeof window !== "undefined") {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  private handleReturnToDashboard = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skybol:navigate-view", { detail: { view: "shipments" } }))
    }
    this.setState({ hasError: false, error: null })
  }

  private handleCopyDiagnostics = () => {
    const data = {
      module: this.props.moduleName || "Unknown Module",
      timestamp: new Date().toISOString(),
      message: this.state.error?.message,
      stack: this.state.error?.stack,
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  public render() {
    if (this.state.hasError) {
      const { moduleName = "Module" } = this.props
      const errorMsg = this.state.error?.message || "An unexpected error occurred in this module."

      return (
        <div className="w-full min-h-[50vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {moduleName} Encountered an Issue
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                An isolated issue occurred while rendering this section. Your rest of the application, saved records, and ledger remain unaffected.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Module
              </button>

              <button
                type="button"
                onClick={this.handleReturnToDashboard}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-blue-400" />
                Return to Dashboard
              </button>

              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDiagnostics: !prev.showDiagnostics }))}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-slate-800 transition flex items-center gap-1 cursor-pointer"
              >
                Diagnostics
                {this.state.showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {this.state.showDiagnostics && (
              <div className="mt-4 pt-4 border-t border-slate-800 text-left space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Stack Trace</span>
                  <button
                    type="button"
                    onClick={this.handleCopyDiagnostics}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {this.state.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {this.state.copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg text-[10px] text-slate-300 font-mono overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {errorMsg}
                  {"\n\n"}
                  {this.state.error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
