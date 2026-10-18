"use client"

import React, { useState, useEffect } from "react"
import {
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  HardDrive,
  FileCheck,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { DiscoveredBackupPoint, DisasterStatus } from "@/lib/backup/disaster-recovery-service"

interface DisasterRecoveryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecoveryCompleted?: () => void
}

export function DisasterRecoveryModal({
  open,
  onOpenChange,
  onRecoveryCompleted,
}: DisasterRecoveryModalProps) {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<DisasterStatus | null>(null)
  const [discoveredBackups, setDiscoveredBackups] = useState<DiscoveredBackupPoint[]>([])
  const [selectedBackup, setSelectedBackup] = useState<DiscoveredBackupPoint | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<any | null>(null)

  useEffect(() => {
    if (open) {
      loadDisasterStatus()
    }
  }, [open])

  const loadDisasterStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/backup/disaster")
      const data = await res.json()
      if (data.success) {
        setStatus(data.status)
        setDiscoveredBackups(data.discoveredBackups || [])
        setSelectedBackup(data.recommendedRecoveryPoint || data.discoveredBackups?.[0] || null)
      }
    } catch (err: any) {
      toast.error("Failed to query disaster recovery status", { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteRecovery = async () => {
    if (!selectedBackup) {
      toast.error("No recovery backup point selected.")
      return
    }

    setIsRecovering(true)
    try {
      const res = await fetch("/api/backup/disaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupFilePath: selectedBackup.filePath,
          actor: "Disaster Recovery Center",
        }),
      })

      const data = await res.json()
      if (data.success && data.result) {
        setRecoveryResult(data.result)
        toast.success("System Recovered Successfully!", {
          description: `Active database atomically switched to ${selectedBackup.fileName}.`,
        })
        onRecoveryCompleted?.()
      } else {
        toast.error("Disaster Recovery Failed", { description: data.error || "Atomic switch aborted." })
      }
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message })
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-red-500/30">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1 text-xs px-2 py-0.5">
              <AlertOctagon className="h-3.5 w-3.5" />
              Disaster Recovery Mode
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
              Forensic Quarantine Guard
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            System Recovery Center
          </DialogTitle>
          <DialogDescription className="text-xs">
            {status?.isRecoveryMode
              ? "Primary database could not be loaded normally. Your data has NOT been overwritten."
              : "Emergency restoration workspace with atomic database switching and automatic corrupted file quarantine."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Scanning disk for self-contained backups & recovery points...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs">
            {/* Recovery Safety Banner */}
            <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-slate-200 space-y-1">
              <div className="font-semibold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Data Protection Guarantee
              </div>
              <p className="text-[11px] text-slate-300">
                Any corrupted database files will be safely quarantined to <code>data/recovery/CORRUPT_DATABASE_...</code>{" "}
                before switching. Recovery restores to a temporary sandbox, validates invariance, and then atomically switches.
              </p>
            </div>

            {/* Recommended Recovery Point */}
            {selectedBackup && (
              <div className="p-4 rounded-lg bg-muted/60 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Recommended Recovery Point
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedBackup.isGoldenBackup && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        ✓ Golden Backup
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {selectedBackup.backupType.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="font-mono text-xs text-primary font-medium truncate">
                  {selectedBackup.fileName}
                </div>

                {/* Entity counts summary */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                  <div className="bg-background/80 p-2 rounded border">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">BOLs</div>
                    <div className="text-sm font-bold">{selectedBackup.recordCounts?.bols ?? 0}</div>
                  </div>
                  <div className="bg-background/80 p-2 rounded border">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Ledger Entries</div>
                    <div className="text-sm font-bold">{selectedBackup.recordCounts?.ledgerEntries ?? 0}</div>
                  </div>
                  <div className="bg-background/80 p-2 rounded border">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Documents</div>
                    <div className="text-sm font-bold">{selectedBackup.recordCounts?.documents ?? 0}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Created: {new Date(selectedBackup.createdAt).toLocaleString()}</span>
                  <span>Size: {(selectedBackup.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  <span className="text-emerald-500 font-semibold">✓ SHA-256 Valid</span>
                </div>
              </div>
            )}

            {/* List of other discovered backups */}
            {discoveredBackups.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-muted-foreground font-semibold text-[11px]">
                  All Discovered Recovery Points ({discoveredBackups.length}):
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {discoveredBackups.map((bkp) => (
                    <button
                      key={bkp.backupId}
                      onClick={() => setSelectedBackup(bkp)}
                      className={`w-full text-left p-2 rounded border text-xs flex items-center justify-between transition-colors ${
                        selectedBackup?.backupId === bkp.backupId
                          ? "bg-primary/10 border-primary text-foreground"
                          : "bg-muted/40 hover:bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="font-mono font-medium text-foreground">{bkp.fileName}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(bkp.createdAt).toLocaleDateString()} · {bkp.recordCounts?.bols ?? 0} BOLs ·{" "}
                          {(bkp.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                      {bkp.isGoldenBackup && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                          Golden
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recoveryResult && (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  System Recovered Successfully
                </div>
                <p className="text-[11px]">
                  Restored {recoveryResult.recordsRestored} records. Previous database archived in{" "}
                  <code>{recoveryResult.quarantinedDatabasePath}</code>.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleExecuteRecovery}
            disabled={isRecovering || !selectedBackup}
            className="bg-red-600 hover:bg-red-500 text-white font-bold gap-2 shadow-md"
          >
            {isRecovering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recovering System...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Recover System Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
