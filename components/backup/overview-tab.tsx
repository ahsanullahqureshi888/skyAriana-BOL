"use client"

import React, { useState } from "react"
import {
  ShieldCheck,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Database,
  FileCheck,
  Layers,
  Sparkles,
  Lock,
  Scale,
  RotateCcw,
  AlertOctagon,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { RestoreSimulationModal } from "./restore-simulation-modal"
import { DisasterRecoveryModal } from "./disaster-recovery-modal"
import { CompareBackupsModal } from "./compare-backups-modal"
import { DataProtectionCard } from "./data-protection-card"
import type { BackupItem } from "@/lib/backup/backup-types"

interface OverviewTabProps {
  stats: {
    totalBackups: number
    verifiedBackups: number
    protectedBackups: number
    lastSuccessfulBackup: string | null
    lastAutomaticBackup: string | null
    lastVerifiedTime: string | null
    totalStorageBytes: number
    dataIntegrityStatus?: "HEALTHY" | "WARNING"
    restoreReadiness?: "READY" | "ATTENTION"
    backupLocation?: string
    preferredFolder?: string
    databaseRevision?: number
    isLocked?: boolean
    lockedBy?: string
  }
  backups?: BackupItem[]
  onNavigateTab: (tab: string) => void
  onQuickFullBackup: () => void
  isCreating: boolean
}

export function OverviewTab({
  stats,
  backups = [],
  onNavigateTab,
  onQuickFullBackup,
  isCreating,
}: OverviewTabProps) {
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [disasterOpen, setDisasterOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 MB"
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(2)} GB`
  }

  const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return "None recorded"
    try {
      const d = new Date(iso)
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return String(iso)
    }
  }

  // Calculate Global Protection Status
  const getProtectionStatus = () => {
    if (!stats.lastVerifiedTime) {
      return { status: "At Risk", variant: "destructive" as const, desc: "No verified backup found." }
    }
    const ageHours = (Date.now() - new Date(stats.lastVerifiedTime).getTime()) / (1000 * 60 * 60)
    if (ageHours <= 24) {
      return { status: "Protected", variant: "default" as const, desc: "Backup verified within 24 hours." }
    }
    if (ageHours <= 72) {
      return { status: "Warning", variant: "secondary" as const, desc: `Last verified backup was ${Math.round(ageHours)} hours ago.` }
    }
    return { status: "At Risk", variant: "destructive" as const, desc: "Backup overdue (> 72 hours)." }
  }

  const copyPath = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Path copied to clipboard", { description: text })
  }

  const openFolder = async (folderPath?: string) => {
    try {
      const res = await fetch("/api/backup/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_folder", filePath: folderPath }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Opened Backup Folder in Explorer", { description: data.openedFolder })
      } else {
        toast.error("Could not open folder", { description: data.error })
      }
    } catch (e: any) {
      toast.error("Error opening folder", { description: e.message })
    }
  }

  const protection = getProtectionStatus()
  const isHealthy = stats.dataIntegrityStatus !== "WARNING"
  const latestBackup = backups[0] || null

  return (
    <div className="space-y-4">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  protection.status === "Protected"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1 text-xs px-2.5 py-0.5"
                    : protection.status === "Warning"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1 text-xs px-2.5 py-0.5"
                    : "bg-red-500/20 text-red-300 border-red-500/30 flex items-center gap-1 text-xs px-2.5 py-0.5"
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {protection.status}: {protection.desc}
              </Badge>
              <Badge className="bg-primary/20 text-primary-foreground border-primary/30 text-xs">
                Format v2.0 · App v5.2.0
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              AQ Companies Backup & Safe Restore Center
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Multi-modal BOL logistics, accounting ledgers, and document archives protected with SHA-256 validation,
              deterministic Windows-safe storage, isolated test simulation, and atomic transactional recovery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={onQuickFullBackup}
              disabled={isCreating || stats.isLocked}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isCreating ? "Creating Verified Backup..." : "Create Full Backup"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigateTab("restore")}
              className="bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700 gap-2"
            >
              Restore Backup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Data Protection Card */}
      <DataProtectionCard
        onBackupNow={onQuickFullBackup}
        onOpenRecovery={() => setDisasterOpen(true)}
        onNavigateTab={onNavigateTab}
        isCreating={isCreating}
      />

      {/* Grid of Key Metrics (9 Core Dimensions: Last Backup, Auto Backup, Size, Integrity, DB Status, Readiness) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Last Successful Backup */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Last Backup
            </CardTitle>
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xs font-bold text-foreground truncate" title={stats.lastSuccessfulBackup || undefined}>
              {stats.lastSuccessfulBackup ? formatDate(stats.lastSuccessfulBackup) : "No backup yet"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              Verified with SHA-256
            </p>
          </CardContent>
        </Card>

        {/* 2. Last Automatic Backup */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Auto Backup
            </CardTitle>
            <Layers className="h-3.5 w-3.5 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xs font-bold text-foreground truncate" title={stats.lastAutomaticBackup || undefined}>
              {stats.lastAutomaticBackup ? formatDate(stats.lastAutomaticBackup) : "Scheduled Daily"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              Pre-Restore Snapshot ON
            </p>
          </CardContent>
        </Card>

        {/* 3. Latest Backup File Size */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Backup Size
            </CardTitle>
            <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xs font-bold text-foreground truncate">
              {latestBackup ? formatBytes(latestBackup.fileSizeBytes) : "—"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Envelope Format v2.0
            </p>
          </CardContent>
        </Card>

        {/* 4. Data Integrity Status */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Data Integrity
            </CardTitle>
            {isHealthy ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            )}
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${isHealthy ? "text-emerald-600" : "text-amber-600"}`}>
                {isHealthy ? "Healthy" : "Discrepancy"}
              </span>
              <Badge variant={isHealthy ? "default" : "destructive"} className="text-[9px] px-1 py-0">
                {isHealthy ? "PASS" : "CHECK"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Invariance: Debit - Credit
            </p>
          </CardContent>
        </Card>

        {/* 5. Database Status & Storage */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Database Status
            </CardTitle>
            <HardDrive className="h-3.5 w-3.5 text-purple-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xs font-bold text-foreground truncate">
              Rev #{stats.databaseRevision || 1000} · {stats.totalBackups} Backups
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatBytes(stats.totalStorageBytes)} storage used
            </p>
          </CardContent>
        </Card>

        {/* 6. Restore Readiness */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Restore Readiness
            </CardTitle>
            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xs font-bold text-emerald-600 truncate">
              {stats.verifiedBackups > 0 ? "100% Ready" : "Attention"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Rollback Auto-Enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Phase 2 Operational Tools Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Simulate Restore Card */}
        <Card className="border shadow-xs hover:border-indigo-500/50 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-400">
                <Sparkles className="h-4 w-4" />
                Restore Simulation
              </span>
              <Badge variant="outline" className="text-[10px]">
                Isolated Sandbox
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Test-restore any backup in a temporary memory sandbox to prove 100% data recoverability.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulationOpen(true)}
              disabled={!latestBackup}
              className="w-full text-xs font-semibold gap-1.5 mt-1 border-indigo-500/30 hover:bg-indigo-950/20 text-indigo-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Simulate Restore (Test Backup)
            </Button>
          </CardContent>
        </Card>

        {/* Compare Backups Tool */}
        <Card className="border shadow-xs hover:border-blue-500/50 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
                <Scale className="h-4 w-4" />
                Compare Backups
              </span>
              <Badge variant="outline" className="text-[10px]">
                Delta Analysis
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Compare record counts, ledger transactions, and document additions across any two backup points.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareOpen(true)}
              disabled={backups.length < 2}
              className="w-full text-xs font-semibold gap-1.5 mt-1 border-blue-500/30 hover:bg-blue-950/20 text-blue-300"
            >
              <Scale className="h-3.5 w-3.5" />
              Compare Two Backups
            </Button>
          </CardContent>
        </Card>

        {/* Disaster Recovery Mode */}
        <Card className="border shadow-xs hover:border-red-500/50 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-red-400">
                <AlertOctagon className="h-4 w-4" />
                Recovery Center
              </span>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                Atomic Switch
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Emergency recovery workspace with automatic damaged database quarantine and direct disk discovery.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisasterOpen(true)}
              className="w-full text-xs font-semibold gap-1.5 mt-1 border-red-500/30 hover:bg-red-950/20 text-red-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Open Recovery Center
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Storage Location & Auto Backup Information */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Storage Environment & Path Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Windows path support with full unicode, space handling, and portable path rebinding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 bg-muted/50 p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold">Active Backup Directory:</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyPath(stats.backupLocation || "data/backups")}
                    className="h-6 px-2 text-[10px] gap-1 hover:bg-muted"
                    title="Copy directory path"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openFolder(stats.backupLocation || "data/backups")}
                    className="h-6 px-2 text-[10px] gap-1 text-primary hover:bg-primary/10"
                    title="Open in Windows File Explorer"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Open Folder
                  </Button>
                </div>
              </div>
              <p className="font-mono text-foreground break-all select-all font-medium text-[11px]">
                {stats.backupLocation || "data/backups"}
              </p>
            </div>
            <div className="space-y-1 bg-muted/50 p-3 rounded-lg border">
              <span className="text-muted-foreground font-semibold">Automatic Protection Triggers:</span>
              <p className="text-foreground">
                Before Restore: <strong className="text-emerald-600">ENABLED</strong> · Before Import:{" "}
                <strong className="text-emerald-600">ENABLED</strong> · Daily:{" "}
                <strong className="text-emerald-600">SCHEDULED (11:30 PM)</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
            <span>
              Deterministic Windows-safe naming: <code>AQ_COMPANIES_FULL_BACKUP_YYYY-MM-DD_HHMMSS_v5.2.0.json</code>
            </span>
            <Button variant="link" size="sm" onClick={() => onNavigateTab("settings")} className="text-xs p-0 h-auto">
              Configure Storage Settings →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <RestoreSimulationModal
        open={simulationOpen}
        onOpenChange={setSimulationOpen}
        backupItem={latestBackup}
      />
      <DisasterRecoveryModal
        open={disasterOpen}
        onOpenChange={setDisasterOpen}
      />
      <CompareBackupsModal
        open={compareOpen}
        onOpenChange={setCompareOpen}
        backups={backups}
      />
    </div>
  )
}
