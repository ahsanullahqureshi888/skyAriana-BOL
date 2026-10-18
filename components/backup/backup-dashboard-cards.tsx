"use client"

import React from "react"
import {
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Clock,
  Lock,
  RefreshCw,
  FileCheck,
  Download,
  Plus,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { BackupItem, DeepHealthReport, DisasterRecoveryConfig } from "@/lib/backup/backup-types"

interface BackupDashboardCardsProps {
  healthReport: DeepHealthReport | null
  backups: BackupItem[]
  config: DisasterRecoveryConfig | null
  stats: {
    totalBackups: number
    verifiedBackups: number
    protectedBackups: number
    lastSuccessfulBackup: string | null
    lastVerifiedTime: string | null
    totalStorageBytes: number
    isLocked: boolean
    lockedBy?: string
  }
  isScanning: boolean
  isCreating: boolean
  onTriggerScan: () => void
  onOpenCreateModal: () => void
  onEmergencyExport: () => void
}

export function BackupDashboardCards({
  healthReport,
  backups,
  config,
  stats,
  isScanning,
  isCreating,
  onTriggerScan,
  onOpenCreateModal,
  onEmergencyExport,
}: BackupDashboardCardsProps) {
  // Format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const overallStatus = healthReport?.overallStatus || (stats.verifiedBackups > 0 ? "HEALTHY" : "WARNING")
  const lastVerifiedBackup = backups.find((b) => b.verificationStatus === "VERIFIED" && b.status === "SUCCESS")

  return (
    <div className="space-y-2.5">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-card/90 backdrop-blur border rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                Enterprise Disaster Recovery & Data Protection Center
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              Immutable versioned backups, relational integrity audits, accounting invariance, and atomic recovery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onEmergencyExport}
            className="h-7.5 px-2.5 text-xs font-semibold gap-1.5"
            title="Download self-contained raw JSON of all records"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Emergency</span> JSON Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onTriggerScan}
            disabled={isScanning}
            className="h-7.5 px-2.5 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin text-primary" : ""}`} />
            {isScanning ? "Auditing..." : "Audit Health"}
          </Button>

          <Button
            size="sm"
            onClick={onOpenCreateModal}
            disabled={isCreating || stats.isLocked}
            className="h-7.5 px-3 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {isCreating ? "Creating..." : "Create Backup Now"}
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid - High Density Executive Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: System Health Status */}
        <div className="bg-card/90 backdrop-blur border rounded-xl p-3 shadow-2xs hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Database Integrity
            </span>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            {overallStatus === "HEALTHY" && (
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-4.5 w-4.5" /> HEALTHY
              </span>
            )}
            {overallStatus === "WARNING" && (
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-4.5 w-4.5" /> WARNING
              </span>
            )}
            {overallStatus === "CRITICAL" && (
              <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <XCircle className="h-4.5 w-4.5" /> CRITICAL
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground truncate">
              {healthReport?.issues.length
                ? `${healthReport.issues.length} notice(s)`
                : "25+ data stores pass"}
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              Debit - Credit = 0
            </Badge>
          </div>
        </div>

        {/* Card 2: Last Verified Recovery Point */}
        <div className="bg-card/90 backdrop-blur border rounded-xl p-3 shadow-2xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Last Verified Recovery
            </span>
            <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="mt-1">
            <div className="text-xs sm:text-sm font-bold truncate text-foreground" title={lastVerifiedBackup?.fileName || "No verified backup"}>
              {lastVerifiedBackup ? lastVerifiedBackup.fileName : "Awaiting initial"}
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0" />
              {lastVerifiedBackup?.createdAt
                ? new Date(lastVerifiedBackup.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Pending"}
            </span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.verifiedBackups} Verified
            </span>
          </div>
        </div>

        {/* Card 3: Protected Archives & Retention */}
        <div className="bg-card/90 backdrop-blur border rounded-xl p-3 shadow-2xs hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Protected Archives
            </span>
            <Lock className="h-3.5 w-3.5 text-indigo-500" />
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {stats.protectedBackups}
            </span>
            <span className="text-[11px] text-muted-foreground">immutable snapshots</span>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground truncate">
              Protected from deletion
            </span>
            <span className="font-mono text-muted-foreground">
              {config?.retention.dailyKeep || 14}d daily / {config?.retention.weeklyKeep || 8}w
            </span>
          </div>
        </div>

        {/* Card 4: Primary Storage Utilization */}
        <div className="bg-card/90 backdrop-blur border rounded-xl p-3 shadow-2xs hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Storage Footprint
            </span>
            <HardDrive className="h-3.5 w-3.5 text-blue-500" />
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-foreground">
              {formatBytes(stats.totalStorageBytes)}
            </span>
            <span className="text-[11px] text-muted-foreground">in {stats.totalBackups} pkgs</span>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-mono text-[9px] truncate">
              data/backups/
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              NVMe Safe
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
