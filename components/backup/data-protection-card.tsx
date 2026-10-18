"use client"

import React, { useState, useEffect } from "react"
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  RefreshCw,
  FileCheck,
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  Terminal,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import type { ProtectionDashboardData, OperationalAlert } from "@/lib/backup/backup-protection-service"

interface DataProtectionCardProps {
  onBackupNow: () => void
  onOpenRecovery: () => void
  onNavigateTab: (tab: string) => void
  isCreating: boolean
}

export function DataProtectionCard({
  onBackupNow,
  onOpenRecovery,
  onNavigateTab,
  isCreating,
}: DataProtectionCardProps) {
  const [data, setData] = useState<ProtectionDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [drillRunning, setDrillRunning] = useState(false)
  const [alertsExpanded, setAlertsExpanded] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/backup/operations")
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch (err) {
      console.error("Failed to load operations dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const timer = setInterval(fetchDashboardData, 30_000)
    return () => clearInterval(timer)
  }, [])

  const handleRunDrill = async () => {
    setDrillRunning(true)
    setActionMessage("Running isolated recovery drill in sandbox...")
    try {
      const res = await fetch("/api/backup/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "drill" }),
      })
      const json = await res.json()
      if (json.success) {
        setActionMessage(`✓ Recovery drill passed in ${(json.result.durationMs / 1000).toFixed(1)}s!`)
      } else {
        setActionMessage(`⚠ Recovery drill failed: ${json.error || json.result?.errors?.join("; ") || "Audit failure"}`)
      }
      await fetchDashboardData()
    } catch (err: any) {
      setActionMessage(`Error running drill: ${err?.message || String(err)}`)
    } finally {
      setDrillRunning(false)
      setTimeout(() => setActionMessage(null), 8000)
    }
  }

  const handleRebuildCatalog = async () => {
    setActionMessage("Scanning backup folder and rebuilding catalog...")
    try {
      const res = await fetch("/api/backup/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rebuild_catalog" }),
      })
      const json = await res.json()
      if (json.success) {
        setActionMessage(`✓ Catalog rebuilt: ${json.result.discoveredCount} backups discovered on disk.`)
        await fetchDashboardData()
      }
    } catch (err: any) {
      setActionMessage(`Error rebuilding catalog: ${err?.message}`)
    } finally {
      setTimeout(() => setActionMessage(null), 6000)
    }
  }

  const handleDownloadReport = async () => {
    try {
      const res = await fetch("/api/backup/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report" }),
      })
      const json = await res.json()
      if (json.success) {
        // Trigger browser download of report json
        const blob = new Blob([JSON.stringify(json.report, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `AQ_BACKUP_HEALTH_REPORT_${new Date().toISOString().substring(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        setActionMessage("✓ System health report generated and downloaded.")
      }
    } catch (err: any) {
      setActionMessage(`Failed to export report: ${err?.message}`)
    } finally {
      setTimeout(() => setActionMessage(null), 6000)
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-900/60 p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="h-16 bg-slate-800/40 rounded"></div>
      </Card>
    )
  }

  const status = data?.protectionStatus || "PROTECTED"
  const isStrong = status === "STRONGLY PROTECTED"
  const isProtected = status === "PROTECTED" || isStrong
  const isWarning = status === "WARNING"
  const isAtRisk = status === "AT RISK"

  const statusBg = isStrong
    ? "from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40 text-emerald-300"
    : isProtected
    ? "from-teal-950/80 via-slate-900 to-slate-950 border-teal-500/40 text-teal-300"
    : isWarning
    ? "from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/40 text-amber-300"
    : "from-red-950/80 via-slate-900 to-slate-950 border-red-500/40 text-red-300"

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB"
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  return (
    <div className="space-y-3">
      {/* Primary Data Protection Card */}
      <Card className={`relative overflow-hidden border bg-gradient-to-br ${statusBg} p-5 shadow-lg`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Header */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                Data Protection Status
              </span>
              <Badge
                className={`font-black tracking-wider text-xs px-2.5 py-0.5 flex items-center gap-1.5 ${
                  isStrong
                    ? "bg-emerald-500 text-slate-950"
                    : isProtected
                    ? "bg-teal-500 text-slate-950"
                    : isWarning
                    ? "bg-amber-500 text-slate-950"
                    : "bg-red-600 text-white"
                }`}
              >
                {isStrong && <ShieldCheck className="h-3.5 w-3.5" />}
                {isProtected && !isStrong && <CheckCircle2 className="h-3.5 w-3.5" />}
                {isWarning && <AlertTriangle className="h-3.5 w-3.5" />}
                {isAtRisk && <AlertOctagon className="h-3.5 w-3.5" />}
                {status}
              </Badge>
              {data?.knownGoodCount ? (
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                  {data.knownGoodCount} Known Good Points
                </Badge>
              ) : null}
            </div>

            <p className="text-xs text-slate-300 max-w-xl">
              {data?.statusReasons.length
                ? data.statusReasons[0]
                : "Continuous cryptographic SHA-256 verification and isolated restoration testing active."}
            </p>
          </div>

          {/* Primary Operations Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onBackupNow}
              disabled={isCreating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md gap-2 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isCreating ? "Backing up..." : "Backup Now"}
            </Button>
            <Button
              onClick={handleRunDrill}
              disabled={drillRunning}
              variant="outline"
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-semibold gap-1.5 text-xs"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${drillRunning ? "animate-spin text-amber-400" : ""}`} />
              {drillRunning ? "Testing Restore..." : "Recovery Drill"}
            </Button>
            <Button
              onClick={onOpenRecovery}
              variant="outline"
              className="border-red-900/60 bg-red-950/40 hover:bg-red-900/60 text-red-200 font-semibold gap-1.5 text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              Recovery Center
            </Button>
          </div>
        </div>

        {/* Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
          <div className="rounded bg-slate-900/70 p-2.5 border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Last Verified Backup
            </div>
            <div className="text-xs font-bold text-white mt-1 truncate">
              {data?.latestVerifiedBackup
                ? new Date(data.latestVerifiedBackup.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "None"}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {data?.backupAgeHours !== null ? `${data?.backupAgeHours}h ago` : "No backup"}
            </div>
          </div>

          <div className="rounded bg-slate-900/70 p-2.5 border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <RotateCcw className="h-3 w-3 text-slate-400" />
              Last Restore Test
            </div>
            <div
              className={`text-xs font-bold mt-1 ${
                data?.lastRecoveryDrill?.result === "PASS"
                  ? "text-emerald-400"
                  : data?.lastRecoveryDrill?.result === "FAIL"
                  ? "text-red-400"
                  : "text-slate-400"
              }`}
            >
              {data?.lastRecoveryDrill
                ? `${data.lastRecoveryDrill.result} (${(data.lastRecoveryDrill.durationMs / 1000).toFixed(1)}s)`
                : "Untested"}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {data?.lastRecoveryDrill ? new Date(data.lastRecoveryDrill.testedAt).toLocaleDateString() : "Never"}
            </div>
          </div>

          <div className="rounded bg-slate-900/70 p-2.5 border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-slate-400" />
              Backup Storage
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {formatBytes(data?.storage.usedSpaceBytes || 0)} / {formatBytes(data?.storage.totalSpaceBytes || 0)}
            </div>
            <div
              className={`text-[10px] mt-0.5 font-semibold ${
                data?.storage.status === "HEALTHY"
                  ? "text-emerald-400"
                  : data?.storage.status === "WARNING"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {data?.storage.freeSpacePercent.toFixed(1)}% Free ({data?.storage.status})
            </div>
          </div>

          <div className="rounded bg-slate-900/70 p-2.5 border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              Known Good Points
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {data?.knownGoodCount || 0} Points
            </div>
            <div className="text-[10px] text-emerald-400/90 mt-0.5">
              Triple-certified
            </div>
          </div>

          <div className="rounded bg-slate-900/70 p-2.5 border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Activity className="h-3 w-3 text-slate-400" />
              Database Health
            </div>
            <div
              className={`text-xs font-bold mt-1 ${
                data?.databaseIntegrity.status === "HEALTHY" ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {data?.databaseIntegrity.status === "HEALTHY" ? "Healthy" : "Issues Detected"}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Invariance: {data?.databaseIntegrity.accountingInvariance}
            </div>
          </div>

          <div className="rounded bg-slate-900/70 p-2.5 border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Next Auto Backup
            </div>
            <div className="text-xs font-bold text-white mt-1 truncate">
              {data?.nextAutomaticBackup || "Not scheduled"}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Daily Schedule
            </div>
          </div>
        </div>

        {/* Action feedback banner */}
        {actionMessage ? (
          <div className="mt-3 p-2 bg-slate-950/90 border border-slate-700 rounded text-xs text-slate-200 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <span>{actionMessage}</span>
          </div>
        ) : null}

        {/* Secondary Technical Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs text-slate-400 border-t border-slate-800/40">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRebuildCatalog}
              className="hover:text-white underline underline-offset-2 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Rebuild Catalog from Disk
            </button>
            <span>·</span>
            <button
              onClick={handleDownloadReport}
              className="hover:text-white underline underline-offset-2 flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Export Health Report
            </button>
          </div>

          {data?.alerts.length ? (
            <button
              onClick={() => setAlertsExpanded(!alertsExpanded)}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {data.alerts.length} Active Alert{data.alerts.length > 1 ? "s" : ""}
              {alertsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="text-emerald-400/80 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Zero active operational alerts
            </span>
          )}
        </div>
      </Card>

      {/* Expandable Operational Alerts Drawer */}
      {alertsExpanded && data?.alerts.length ? (
        <Card className="border-amber-500/40 bg-slate-900/90 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs uppercase font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Operational Attention Required ({data.alerts.length})
            </h4>
            <span className="text-[10px] text-slate-400">Deduplicated operational alerts</span>
          </div>

          <div className="space-y-2.5">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  alert.severity === "CRITICAL"
                    ? "bg-red-950/30 border-red-800/60 text-red-200"
                    : alert.severity === "WARNING"
                    ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                    : "bg-sky-950/30 border-sky-800/60 text-sky-200"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-black">
                      {alert.severity}
                    </span>
                    {alert.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-slate-300"><strong>What happened:</strong> {alert.whatHappened}</p>
                <p className="text-slate-400"><strong>Why it matters:</strong> {alert.whyItMatters}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-emerald-300 font-semibold">
                    <strong>Recommended action:</strong> {alert.recommendedAction}
                  </span>
                  {alert.actionKey === "RUN_BACKUP_NOW" && (
                    <Button
                      size="sm"
                      onClick={onBackupNow}
                      disabled={isCreating}
                      className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Run Backup Now
                    </Button>
                  )}
                  {alert.actionKey === "TEST_RESTORE_AGAIN" && (
                    <Button
                      size="sm"
                      onClick={handleRunDrill}
                      disabled={drillRunning}
                      className="h-6 text-[10px] bg-amber-600 hover:bg-amber-500 text-white"
                    >
                      Test Restore Again
                    </Button>
                  )}
                  {alert.actionKey === "OPEN_STORAGE_SETTINGS" && (
                    <Button
                      size="sm"
                      onClick={() => onNavigateTab("storage")}
                      className="h-6 text-[10px] bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      Storage Settings
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
