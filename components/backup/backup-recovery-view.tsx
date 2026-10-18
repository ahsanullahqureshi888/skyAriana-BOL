"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShieldCheck,
  Archive,
  Activity,
  RotateCcw,
  Wrench,
  Settings,
  Plus,
  Clock,
  Sparkles,
  History,
  FileCheck,
} from "lucide-react"

import { OverviewTab } from "./overview-tab"
import { CreateBackupTab } from "./create-backup-tab"
import { RestoreBackupTab } from "./restore-backup-tab"
import { AutomaticBackupsTab } from "./automatic-backups-tab"
import { RestoreHistoryTab } from "./restore-history-tab"
import { BackupHistoryTable } from "./backup-history-table"
import { RestoreModalWizard } from "./restore-modal-wizard"
import { DatabaseHealthTab } from "./database-health-tab"
import { StorageSettingsTab } from "./storage-settings-tab"
import { RecoveryToolsTab } from "./recovery-tools-tab"
import { toast } from "sonner"

import type {
  BackupItem,
  DeepHealthReport,
  DisasterRecoveryConfig,
  BackupType,
} from "@/lib/backup/backup-types"

export function BackupRecoveryView() {
  const [activeTab, setActiveTab] = useState("overview")
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [healthReport, setHealthReport] = useState<DeepHealthReport | null>(null)
  const [config, setConfig] = useState<DisasterRecoveryConfig | null>(null)
  const [stats, setStats] = useState({
    totalBackups: 0,
    verifiedBackups: 0,
    protectedBackups: 0,
    lastSuccessfulBackup: null as string | null,
    lastAutomaticBackup: null as string | null,
    lastVerifiedTime: null as string | null,
    totalStorageBytes: 0,
    dataIntegrityStatus: "HEALTHY" as "HEALTHY" | "WARNING",
    restoreReadiness: "READY" as "READY" | "ATTENTION",
    backupLocation: "data/backups",
    preferredFolder: "data/backups",
    databaseRevision: 1000,
    isLocked: false,
    lockedBy: undefined as string | undefined,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [drillingId, setDrillingId] = useState<string | null>(null)

  // Restore wizard modal state
  const [restoreModalBackup, setRestoreModalBackup] = useState<BackupItem | null>(null)

  // Load backups list
  const loadBackups = async () => {
    try {
      const res = await fetch("/api/backup")
      const data = await res.json()
      if (data.success) {
        setBackups(data.backups || [])
        if (data.stats) {
          setStats((prev) => ({ ...prev, ...data.stats }))
        }
        if (data.config) setConfig(data.config)
      }
    } catch (err) {
      console.error("Failed to load backups:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load health report
  const loadHealthReport = async () => {
    setIsScanning(true)
    try {
      const res = await fetch("/api/backup/health")
      const data = await res.json()
      if (data.success && data.report) {
        setHealthReport(data.report)
      }
    } catch (err) {
      console.error("Failed to load health report:", err)
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    loadBackups()
    loadHealthReport()
  }, [])

  // Quick full backup
  const handleQuickFullBackup = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "full",
          format: "json",
          actor: "Admin User",
          note: "Quick full backup from Overview",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Full Backup Completed", {
          description: `${data.backup.fileName} verified successfully.`,
        })
        await loadBackups()
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("skybol:backup-completed"))
        }
      } else {
        toast.error("Backup Failed", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Network Error", { description: err.message })
    } finally {
      setIsCreating(false)
    }
  }

  // Verify single backup
  const handleVerify = async (backupId: string) => {
    setVerifyingId(backupId)
    try {
      const res = await fetch("/api/backup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Verification Passed", {
          description: `Backup ${backupId} checksum and structure valid.`,
        })
        await loadBackups()
      } else {
        toast.error("Verification Failed", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Verification request failed", { description: err?.message })
    } finally {
      setVerifyingId(null)
    }
  }

  // Run test restore drill
  const handleTestRestore = async (backupId: string) => {
    setDrillingId(backupId)
    try {
      const res = await fetch("/api/backup/test-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      })
      const data = await res.json()
      if (data.success) {
        const d = data.drillResult
        toast.info("Drill Result", {
          description: `Pass: ${d.pass ? "YES" : "NO"} · Records: ${d.recordsVerified} · Invariance: ${d.invarianceValid ? "BALANCED" : "DISCREPANCY"}`,
        })
      } else {
        toast.error("Drill Failed", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Drill Error", { description: err?.message })
    } finally {
      setDrillingId(null)
    }
  }

  // Toggle protection
  const handleToggleProtect = async (backupId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/backup/protect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId, protected: !currentStatus }),
      })
      const data = await res.json()
      if (data.success) {
        await loadBackups()
      }
    } catch (err) {
      console.error("Failed to toggle protection:", err)
    }
  }

  // Delete backup
  const handleDelete = async (backupId: string) => {
    if (!confirm("Are you sure you want to delete this backup package? This action cannot be undone.")) return
    try {
      const res = await fetch(`/api/backup?id=${encodeURIComponent(backupId)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Backup Deleted")
        await loadBackups()
      } else {
        toast.error("Cannot Delete Backup", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Delete Error", { description: err?.message })
    }
  }

  // Download backup
  const handleDownload = (backup: BackupItem) => {
    window.open(`/api/backup/download?id=${encodeURIComponent(backup.id)}`, "_blank")
  }

  return (
    <div className="space-y-4 w-full">
      {/* Module Title & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Data Protection & Backup Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                Enterprise Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Continuous SQLite & JSON snapshots, automated rollback points, and zero-data-loss recovery drills
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleQuickFullBackup}
            disabled={isCreating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isCreating ? "Backing Up..." : "1-Click Snapshot"}</span>
          </button>
        </div>
      </div>

      {/* Top Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <TabsList className="h-9 p-1 bg-muted/80 backdrop-blur rounded-lg inline-flex items-center gap-1 border shadow-2xs">
            <TabsTrigger value="overview" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="create" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <Plus className="h-3.5 w-3.5 text-primary" />
              Create Backup
            </TabsTrigger>
            <TabsTrigger value="history" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <Archive className="h-3.5 w-3.5" />
              Backup History ({backups.length})
            </TabsTrigger>
            <TabsTrigger value="restore" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              Restore Backup
            </TabsTrigger>
            <TabsTrigger value="auto" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              Automatic Backups
            </TabsTrigger>
            <TabsTrigger value="restore-history" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <History className="h-3.5 w-3.5" />
              Restore History
            </TabsTrigger>
            <TabsTrigger value="health" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <Activity className="h-3.5 w-3.5" />
              Database Health
              {healthReport && healthReport.issues.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {healthReport.issues.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="h-7 px-3 text-xs gap-1.5 font-semibold">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>AQ Companies v5.2.0</span>
            <span>·</span>
            <span>Format v2.0</span>
          </div>
        </div>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="outline-none">
          <OverviewTab
            stats={stats}
            backups={backups}
            onNavigateTab={(t) => setActiveTab(t)}
            onQuickFullBackup={handleQuickFullBackup}
            isCreating={isCreating}
          />
        </TabsContent>

        {/* 2. CREATE BACKUP TAB */}
        <TabsContent value="create" className="outline-none">
          <CreateBackupTab onBackupCreated={loadBackups} />
        </TabsContent>

        {/* 3. BACKUP HISTORY TAB */}
        <TabsContent value="history" className="outline-none">
          <BackupHistoryTable
            backups={backups}
            onVerify={handleVerify}
            onTestRestore={handleTestRestore}
            onOpenRestoreWizard={(b) => setRestoreModalBackup(b)}
            onToggleProtect={handleToggleProtect}
            onDelete={handleDelete}
            onDownload={handleDownload}
            verifyingId={verifyingId}
            drillingId={drillingId}
          />
        </TabsContent>

        {/* 4. RESTORE BACKUP TAB */}
        <TabsContent value="restore" className="outline-none">
          <RestoreBackupTab
            onRestoreSuccess={async () => {
              await loadBackups()
              await loadHealthReport()
            }}
          />
        </TabsContent>

        {/* 5. AUTOMATIC BACKUPS TAB */}
        <TabsContent value="auto" className="outline-none">
          <AutomaticBackupsTab
            initialConfig={config}
            onConfigUpdated={(cfg) => setConfig(cfg)}
          />
        </TabsContent>

        {/* 6. RESTORE HISTORY TAB */}
        <TabsContent value="restore-history" className="outline-none">
          <RestoreHistoryTab />
        </TabsContent>

        {/* 7. DATABASE HEALTH TAB */}
        <TabsContent value="health" className="outline-none">
          <DatabaseHealthTab
            report={healthReport}
            isLoading={isScanning}
            onRefresh={loadHealthReport}
            onRepairComplete={async () => {
              await loadHealthReport()
              await loadBackups()
            }}
          />
        </TabsContent>

        {/* 8. SETTINGS TAB */}
        <TabsContent value="settings" className="outline-none">
          <StorageSettingsTab
            initialConfig={config}
            onConfigUpdated={(cfg) => setConfig(cfg)}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Restore Wizard for direct card clicks */}
      {restoreModalBackup && (
        <RestoreModalWizard
          isOpen={Boolean(restoreModalBackup)}
          onClose={() => setRestoreModalBackup(null)}
          backup={restoreModalBackup}
          onRestoreSuccess={async () => {
            await loadBackups()
            await loadHealthReport()
            setRestoreModalBackup(null)
          }}
        />
      )}
    </div>
  )
}
