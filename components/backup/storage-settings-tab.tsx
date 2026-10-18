"use client"

import React, { useState, useEffect } from "react"
import {
  Settings,
  Clock,
  HardDrive,
  Shield,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { DisasterRecoveryConfig } from "@/lib/backup/backup-types"

interface StorageSettingsTabProps {
  initialConfig: DisasterRecoveryConfig | null
  onConfigUpdated: (config: DisasterRecoveryConfig) => void
}

export function StorageSettingsTab({
  initialConfig,
  onConfigUpdated,
}: StorageSettingsTabProps) {
  const [config, setConfig] = useState<DisasterRecoveryConfig>(
    initialConfig || {
      autoBackupEnabled: true,
      dailyBackupTime: "23:00",
      weeklyFullBackup: true,
      monthlyArchive: true,
      retention: { dailyKeep: 14, weeklyKeep: 8, monthlyKeep: 12 },
      primaryStoragePath: "data/backups",
      secondaryBackupEnabled: false,
      cloudBackupEnabled: false,
      cloudBackupStatus: "DISABLED",
    }
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isPruning, setIsPruning] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig)
  }, [initialConfig])

  const handleSave = async (runPrune = false) => {
    if (runPrune) setIsPruning(true)
    else setIsSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch("/api/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, runPrune }),
      })
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(data.config)
        onConfigUpdated(data.config)
        const pruneInfo = data.pruneResult
          ? ` (${data.pruneResult.prunedCount} old backup(s) pruned, ${data.pruneResult.preservedCount} preserved)`
          : ""
        setSaveMessage({
          type: "success",
          text: `Settings saved successfully${pruneInfo}.`,
        })
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to update settings" })
      }
    } catch (err: any) {
      setSaveMessage({ type: "error", text: err?.message || "Settings request error" })
    } finally {
      setIsSaving(false)
      setIsPruning(false)
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="bg-card/90 backdrop-blur border rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-primary" />
            Automated Scheduling & Backup Retention Engine
          </h3>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Configure automated daily snapshot intervals, storage quotas, and safe retention pruning rules.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="h-7.5 gap-1.5 text-xs font-semibold px-3 shadow-2xs shrink-0"
        >
          <Save className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      {saveMessage && (
        <div
          className={`p-3 rounded-lg border ${
            saveMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5">
            {saveMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {saveMessage.text}
          </div>
        </div>
      )}

      {/* Grid: Schedule + Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Schedule Configuration */}
        <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Automatic Backup Schedule
          </h4>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoBackupEnabled"
                checked={config.autoBackupEnabled}
                onCheckedChange={(c) => setConfig({ ...config, autoBackupEnabled: Boolean(c) })}
              />
              <label htmlFor="autoBackupEnabled" className="font-semibold text-foreground cursor-pointer">
                Enable Daily Automatic Snapshots
              </label>
            </div>

            <div className="pl-6 space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Daily Backup Trigger Time:</span>
                <Input
                  type="time"
                  value={config.dailyBackupTime}
                  onChange={(e) => setConfig({ ...config, dailyBackupTime: e.target.value })}
                  className="w-32 h-7 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="weeklyFullBackup"
                  checked={config.weeklyFullBackup}
                  onCheckedChange={(c) => setConfig({ ...config, weeklyFullBackup: Boolean(c) })}
                />
                <label htmlFor="weeklyFullBackup" className="cursor-pointer">
                  Weekly Full Archive with All Attachments
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="monthlyArchive"
                  checked={config.monthlyArchive}
                  onCheckedChange={(c) => setConfig({ ...config, monthlyArchive: Boolean(c) })}
                />
                <label htmlFor="monthlyArchive" className="cursor-pointer">
                  Monthly Protected Financial Milestone Archive
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Retention Policy */}
        <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Retention & Quota Management
          </h4>

          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground block">Daily Snapshots</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={3}
                    max={90}
                    value={config.retention.dailyKeep}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        retention: { ...config.retention, dailyKeep: Number(e.target.value) || 14 },
                      })
                    }
                    className="h-7 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">days</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground block">Weekly Backups</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={2}
                    max={52}
                    value={config.retention.weeklyKeep}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        retention: { ...config.retention, weeklyKeep: Number(e.target.value) || 8 },
                      })
                    }
                    className="h-7 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">weeks</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground block">Monthly Archives</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={config.retention.monthlyKeep}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        retention: { ...config.retention, monthlyKeep: Number(e.target.value) || 12 },
                      })
                    }
                    className="h-7 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">months</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 rounded p-2.5 text-[11px] text-muted-foreground space-y-1 mt-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Immutable Retention Rules:
              </div>
              <p>• Protected archives (marked with lock) are NEVER deleted by retention pruning.</p>
              <p>• The latest verified recovery point is NEVER pruned regardless of age.</p>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(true)}
                disabled={isPruning}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className={`h-3.5 w-3.5 ${isPruning ? "animate-spin" : ""}`} />
                {isPruning ? "Pruning..." : "Run Retention Prune Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
