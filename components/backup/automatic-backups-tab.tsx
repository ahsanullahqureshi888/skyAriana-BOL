"use client"

import React, { useState, useEffect } from "react"
import {
  Clock,
  ShieldCheck,
  Calendar,
  Save,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { DisasterRecoveryConfig } from "@/lib/backup/backup-types"

interface AutomaticBackupsTabProps {
  initialConfig: DisasterRecoveryConfig | null
  onConfigUpdated: (config: DisasterRecoveryConfig) => void
}

export function AutomaticBackupsTab({
  initialConfig,
  onConfigUpdated,
}: AutomaticBackupsTabProps) {
  const [config, setConfig] = useState<DisasterRecoveryConfig>({
    autoBackupEnabled: true,
    dailyBackupTime: "23:00",
    weeklyFullBackup: true,
    monthlyArchive: true,
    retention: {
      dailyKeep: 30,
      weeklyKeep: 12,
      monthlyKeep: 12,
    },
    primaryStoragePath: "data/backups",
    secondaryBackupEnabled: false,
    cloudBackupEnabled: false,
    cloudBackupStatus: "DISABLED",
  })

  // Extended automatic triggers
  const [beforeRestore, setBeforeRestore] = useState(true)
  const [beforeImport, setBeforeImport] = useState(true)
  const [beforeMigration, setBeforeMigration] = useState(true)
  const [onAppClose, setOnAppClose] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
    }
  }, [initialConfig])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          triggers: {
            beforeRestore,
            beforeImport,
            beforeMigration,
            onAppClose,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Automatic Backup Settings Saved")
        onConfigUpdated(config)
      } else {
        toast.error("Failed to save settings", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Error saving configuration", { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Info Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Automatic Backup Policies & Triggers
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Configure automated safety snapshots before dangerous events and scheduled daily/weekly backups.
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Policies"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-6">
          {/* Automatic Triggers (Recommended Defaults) */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Critical Safety Triggers
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Before Restore Snapshot
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Creates an atomic rollback snapshot immediately before any restore operation.
                  </p>
                </div>
                <Switch checked={beforeRestore} onCheckedChange={setBeforeRestore} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Before Major Import Snapshot
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Captures database state before bulk imports of BOL or ledger data.
                  </p>
                </div>
                <Switch checked={beforeImport} onCheckedChange={setBeforeImport} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Before Database Migration
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically backs up before schema upgrades or version migrations.
                  </p>
                </div>
                <Switch checked={beforeMigration} onCheckedChange={setBeforeMigration} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-600" />
                    On Application Close
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Saves a verified backup snapshot whenever the desktop app is closed.
                  </p>
                </div>
                <Switch checked={onAppClose} onCheckedChange={setOnAppClose} />
              </div>
            </div>
          </div>

          {/* Scheduled Periodic Backups */}
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Scheduled Calendar Backups
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">Daily Backup</Label>
                  <Switch
                    checked={config.autoBackupEnabled}
                    onCheckedChange={(c) => setConfig({ ...config, autoBackupEnabled: c })}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Execution Time:</span>
                  <Input
                    type="time"
                    value={config.dailyBackupTime}
                    onChange={(e) => setConfig({ ...config, dailyBackupTime: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">Weekly Full Archive</Label>
                  <Switch
                    checked={config.weeklyFullBackup}
                    onCheckedChange={(c) => setConfig({ ...config, weeklyFullBackup: c })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Creates a weekly standalone ZIP container with attachments every Sunday.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">Monthly Long-Term Archive</Label>
                  <Switch
                    checked={config.monthlyArchive}
                    onCheckedChange={(c) => setConfig({ ...config, monthlyArchive: c })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Creates an indelible protected archive on the 1st of every month.
                </p>
              </div>
            </div>
          </div>

          {/* Retention Policy */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Retention Policy & Rotation
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Older backups are safely rotated. Protected backups and the last verified backup are NEVER deleted.
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Safe Retention: ACTIVE
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Keep Daily Backups</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={config.retention.dailyKeep}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retention: { ...config.retention, dailyKeep: parseInt(e.target.value) || 30 },
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">Default: 30 days</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Keep Weekly Backups</Label>
                <Input
                  type="number"
                  min="1"
                  max="104"
                  value={config.retention.weeklyKeep}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retention: { ...config.retention, weeklyKeep: parseInt(e.target.value) || 12 },
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">Default: 12 weeks</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Keep Monthly Archives</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={config.retention.monthlyKeep}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retention: { ...config.retention, monthlyKeep: parseInt(e.target.value) || 12 },
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">Default: 12 months</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
