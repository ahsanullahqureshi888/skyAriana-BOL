"use client"

import React, { useState, useEffect } from "react"
import {
  Activity,
  Zap,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Server,
  Trash2,
  Clock,
  Layers,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface MemoryInfo {
  jsHeapSizeLimit?: number
  totalJSHeapSize?: number
  usedJSHeapSize?: number
}

export function PerformanceDiagnosticsTab() {
  const [isProbing, setIsProbing] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [apiStatus, setApiStatus] = useState<"ok" | "degraded" | "error" | "untested">("untested")
  const [storageUsageBytes, setStorageUsageBytes] = useState<number>(0)
  const [storageItemsCount, setStorageItemsCount] = useState<number>(0)
  const [domNodeCount, setDomNodeCount] = useState<number>(0)
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryInfo | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [copied, setCopied] = useState(false)

  const scanEnvironment = () => {
    if (typeof window === "undefined") return

    setIsOnline(navigator.onLine)

    // DOM Node Count
    try {
      const nodes = document.getElementsByTagName("*").length
      setDomNodeCount(nodes)
    } catch {}

    // Storage calculation
    try {
      let total = 0
      let count = 0
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) {
          const val = window.localStorage.getItem(key) || ""
          total += (key.length + val.length) * 2 // UTF-16
          count++
        }
      }
      setStorageUsageBytes(total)
      setStorageItemsCount(count)
    } catch {}

    // Performance memory (Chromium / Electron)
    try {
      const perf = window.performance as any
      if (perf && perf.memory) {
        setMemoryMetrics({
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          usedJSHeapSize: perf.memory.usedJSHeapSize,
        })
      }
    } catch {}
  }

  useEffect(() => {
    scanEnvironment()
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const runLatencyProbe = async () => {
    setIsProbing(true)
    const start = performance.now()
    try {
      const res = await fetch("/api/bol?action=next-number", { cache: "no-store" })
      const elapsed = Math.round(performance.now() - start)
      setLatencyMs(elapsed)
      if (res.ok) {
        setApiStatus(elapsed < 150 ? "ok" : "degraded")
        toast.success(`Probe complete: ${elapsed}ms roundtrip`)
      } else {
        setApiStatus("degraded")
        toast.warning(`Probe responded with status ${res.status} (${elapsed}ms)`)
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start)
      setLatencyMs(elapsed)
      setApiStatus("error")
      toast.error(`Probe failed: ${err?.message || "Network error"}`)
    } finally {
      setIsProbing(false)
      scanEnvironment()
    }
  }

  const handleClearModuleCache = () => {
    try {
      sessionStorage.removeItem("sky_chunk_auto_reload")
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            if (name.includes("next") || name.includes("chunk")) {
              caches.delete(name)
            }
          })
        })
      }
      toast.success("Module and chunk cache cleared")
    } catch (e: any) {
      toast.error(`Failed to clear cache: ${e.message}`)
    }
  }

  const handlePruneDrafts = () => {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key && (key.includes("temp-draft") || key.includes("test-") || key.includes("debug-"))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k))
      scanEnvironment()
      toast.success(`Pruned ${keysToRemove.length} temporary cached drafts`)
    } catch (e: any) {
      toast.error(`Failed to prune drafts: ${e.message}`)
    }
  }

  const handleCopyDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      network: {
        online: isOnline,
        latencyMs,
        apiStatus,
      },
      storage: {
        localStorageItems: storageItemsCount,
        localStorageUsedKB: Math.round(storageUsageBytes / 1024),
      },
      runtime: {
        domNodes: domNodeCount,
        memoryUsedMB: memoryMetrics?.usedJSHeapSize ? Math.round(memoryMetrics.usedJSHeapSize / 1048576) : "N/A",
        memoryLimitMB: memoryMetrics?.jsHeapSizeLimit ? Math.round(memoryMetrics.jsHeapSizeLimit / 1048576) : "N/A",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      },
    }
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Diagnostics report copied to clipboard")
  }

  const storageMB = (storageUsageBytes / (1024 * 1024)).toFixed(2)
  const storagePercent = Math.min(100, Math.round((storageUsageBytes / (5 * 1024 * 1024)) * 100))

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">System Performance & Diagnostics</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of network latency, DOM tree complexity, chunk caching, and local storage utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runLatencyProbe}
            disabled={isProbing}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isProbing ? "animate-spin" : ""}`} />
            {isProbing ? "Probing..." : "Test Latency"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyDiagnostics}
            className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy Report"}
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Network & Latency */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Network Health</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {latencyMs !== null ? `${latencyMs}ms` : isOnline ? "Online" : "Offline"}
            </span>
            {latencyMs !== null && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  latencyMs < 100
                    ? "bg-emerald-500/20 text-emerald-400"
                    : latencyMs < 300
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {latencyMs < 100 ? "Excellent" : latencyMs < 300 ? "Moderate" : "High Latency"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {isOnline ? "Continuous WebSocket & HTTP capability" : "Offline storage active"}
          </p>
        </div>

        {/* Card 2: LocalStorage Quota */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Local Storage</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{storageMB} MB</span>
            <span className="text-xs text-slate-400">/ ~5.0 MB</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                storagePercent > 80 ? "bg-rose-500" : storagePercent > 50 ? "bg-amber-400" : "bg-blue-500"
              }`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">{storageItemsCount} records stored in browser cache</p>
        </div>

        {/* Card 3: Active DOM Elements */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">DOM Complexity</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{domNodeCount.toLocaleString()}</span>
            <span className="text-xs text-slate-400">nodes</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {domNodeCount < 1500 ? "Optimal DOM tree footprint" : "Moderate layout complexity"}
          </p>
        </div>

        {/* Card 4: JS Memory Heap */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Memory Allocation</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {memoryMetrics?.usedJSHeapSize
                ? `${Math.round(memoryMetrics.usedJSHeapSize / 1048576)} MB`
                : "Protected"}
            </span>
            {memoryMetrics?.totalJSHeapSize && (
              <span className="text-xs text-slate-400">
                / {Math.round(memoryMetrics.totalJSHeapSize / 1048576)} MB
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Active JavaScript engine heap</p>
        </div>
      </div>

      {/* Maintenance & Optimization Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Quick Optimization Actions
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white">Purge Chunk & Module Cache</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Flushes stale script chunk cache tags and resets auto-reload locks to fix hanging module loads.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearModuleCache}
              className="border-slate-700 hover:bg-slate-800 text-xs shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Flush Cache
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white">Prune Stale Temporary Drafts</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Safely removes orphaned test tokens and transient drafts while preserving all verified BOLs and ledgers.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePruneDrafts}
              className="border-slate-700 hover:bg-slate-800 text-xs shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
              Prune Drafts
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
