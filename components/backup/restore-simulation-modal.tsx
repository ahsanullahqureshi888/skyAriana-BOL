"use client"

import React, { useState } from "react"
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Clock,
  Sparkles,
  Loader2,
  HardDrive,
  Scale,
  FileText,
  BadgeAlert,
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
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import type { BackupItem } from "@/lib/backup/backup-types"

interface RestoreSimulationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  backupItem: BackupItem | null
  onSimulationCompleted?: () => void
}

export function RestoreSimulationModal({
  open,
  onOpenChange,
  backupItem,
  onSimulationCompleted,
}: RestoreSimulationModalProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [progressStep, setProgressStep] = useState<string>("")

  const handleRunSimulation = async () => {
    if (!backupItem?.filePath) {
      toast.error("No valid backup file selected for simulation.")
      return
    }

    setIsRunning(true)
    setResult(null)
    setProgressStep("Verifying SHA-256 Checksum...")

    try {
      setTimeout(() => setProgressStep("Spinning up isolated sandbox database..."), 400)
      setTimeout(() => setProgressStep("Restoring test data & normalizing aliases..."), 900)
      setTimeout(() => setProgressStep("Running Accounting Invariance & Relational Audit..."), 1500)

      const res = await fetch("/api/backup/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: backupItem.filePath,
          actor: "Operator Simulation",
        }),
      })

      const data = await res.json()
      if (data.success && data.result) {
        setResult(data.result)
        toast.success("Restore Simulation Completed", {
          description: data.result.success
            ? "Backup tested successfully. 100% losslessly recoverable."
            : "Simulation finished with warnings.",
        })
        onSimulationCompleted?.()
      } else {
        toast.error("Simulation Failed", { description: data.error || "Integrity error in test sandbox." })
        setResult(data.result || { success: false, errors: [data.error || "Simulation failed."] })
      }
    } catch (err: any) {
      toast.error("Simulation Execution Error", { description: err.message })
    } finally {
      setIsRunning(false)
      setProgressStep("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 flex items-center gap-1 text-xs px-2 py-0.5">
              <Sparkles className="h-3.5 w-3.5" />
              Isolated Test Sandbox
            </Badge>
            {result?.isGoldenBackup && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                ✓ Golden Backup / Known Good
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg font-bold">
            Simulate Restore (Test Sandbox Verification)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Restores the backup into a temporary sandbox environment, executes strict health checks,
            and validates accounting invariance without touching your live production database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Target Backup Card */}
          <div className="bg-muted/50 p-3 rounded-lg border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Target Backup:</span>
              <span className="font-mono text-[11px] text-muted-foreground">{backupItem?.id}</span>
            </div>
            <p className="font-mono text-xs text-primary truncate">{backupItem?.fileName}</p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t">
              <span>Size: {((backupItem?.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB</span>
              <span>Type: {backupItem?.type}</span>
              <span>Status: {backupItem?.verificationStatus}</span>
            </div>
          </div>

          {/* Running State */}
          {isRunning && (
            <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{progressStep || "Simulating Restoration..."}</span>
              </div>
              <Progress value={65} className="h-2" />
              <p className="text-[11px] text-muted-foreground">
                Testing tables, foreign keys, and debit/credit invariance in memory sandbox...
              </p>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div
              className={`p-4 rounded-lg border space-y-3 ${
                result.success
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : "bg-destructive/10 border-destructive/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-bold text-sm">
                    {result.success ? "Restore Simulation PASSED" : "Restore Simulation FAILED"}
                  </span>
                </div>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? "100% RECOVERABLE" : "ATTENTION REQUIRED"}
                </Badge>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
                <div className="bg-background/80 p-2 rounded border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">BOLs</div>
                  <div className="text-sm font-bold">{result.recordCounts?.bols ?? 0}</div>
                </div>
                <div className="bg-background/80 p-2 rounded border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Accounts</div>
                  <div className="text-sm font-bold">{result.recordCounts?.accounts ?? 0}</div>
                </div>
                <div className="bg-background/80 p-2 rounded border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Ledgers</div>
                  <div className="text-sm font-bold">{result.recordCounts?.ledgers ?? 0}</div>
                </div>
                <div className="bg-background/80 p-2 rounded border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Duration</div>
                  <div className="text-sm font-bold">{(result.durationMs / 1000).toFixed(2)}s</div>
                </div>
              </div>

              {/* Quality Checklist */}
              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>SHA-256 Checksum Verification:</span>
                  <span className={result.checksumVerified ? "text-emerald-500 font-bold" : "text-destructive font-bold"}>
                    {result.checksumVerified ? "✓ PASS" : "✗ FAIL"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Accounting Invariance (Debit - Credit = Net):</span>
                  <span
                    className={
                      result.accountingInvariancePassed ? "text-emerald-500 font-bold" : "text-destructive font-bold"
                    }
                  >
                    {result.accountingInvariancePassed ? "✓ PASS" : "✗ MISMATCH"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Relational Integrity & BOL Uniqueness:</span>
                  <span
                    className={
                      result.relationalIntegrityPassed ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"
                    }
                  >
                    {result.relationalIntegrityPassed ? "✓ PASS" : "⚠ WARNING"}
                  </span>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="p-2 bg-destructive/10 rounded border border-destructive/30 text-destructive text-[11px] space-y-1">
                  <strong>Errors:</strong>
                  {result.errors.map((e: string, i: number) => (
                    <div key={i}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleRunSimulation}
            disabled={isRunning || !backupItem}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run Restore Simulation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
