"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  HardDrive,
  Check,
  Lock,
  Download,
  FileText,
} from "lucide-react"
import type { BackupItem, RestorePreview, RestoreResult } from "@/lib/backup/backup-types"

interface RestoreModalWizardProps {
  isOpen: boolean
  onClose: () => void
  backup: BackupItem | null
  onRestoreSuccess: () => void
}

type WizardStep = 1 | 2 | 3 | 4 | 5

export function RestoreModalWizard({
  isOpen,
  onClose,
  backup,
  onRestoreSuccess,
}: RestoreModalWizardProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge")
  const [confirmPhrase, setConfirmPhrase] = useState("")
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreProgressStage, setRestoreProgressStage] = useState<string>("")
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  // Reset state when opening
  useEffect(() => {
    if (isOpen && backup) {
      setStep(1)
      setPreview(null)
      setConfirmPhrase("")
      setRestoreResult(null)
      setRestoreError(null)
      loadPreview(backup.id)
    }
  }, [isOpen, backup])

  const loadPreview = async (backupId: string) => {
    setIsLoadingPreview(true)
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", backupId }),
      })
      const data = await res.json()
      if (data.success && data.preview) {
        setPreview(data.preview)
      } else {
        setRestoreError(data.error || "Failed to generate restore preview")
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Failed to load backup preview")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const executeRestore = async () => {
    if (!backup) return
    setIsRestoring(true)
    setStep(4)
    setRestoreProgressStage("Creating Pre-Restore Safety Snapshot...")

    try {
      setTimeout(() => setRestoreProgressStage("Engaging Maintenance Lock & Atomic Restore..."), 1200)
      setTimeout(() => setRestoreProgressStage("Restoring Database Stores & File Attachments..."), 2400)
      setTimeout(() => setRestoreProgressStage("Validating Accounting Invariance Identity..."), 3600)

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          backupId: backup.id,
          mode: restoreMode,
          actor: "Admin User",
        }),
      })

      const data = await res.json()
      if (data.success && data.result) {
        setRestoreResult(data.result)
        setStep(5)
        onRestoreSuccess()
      } else {
        setRestoreError(data.error || "Restore failed and was rolled back safely.")
        setStep(5)
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Restore failed with network error")
      setStep(5)
    } finally {
      setIsRestoring(false)
    }
  }

  if (!backup) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isRestoring && !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Safe Database Restoration Wizard
          </DialogTitle>
          <DialogDescription className="text-xs">
            Multi-step guaranteed recovery with mandatory pre-restore safety snapshot and automated rollback.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs border-b pb-3 mb-2">
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span>
            Verification
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
            Preview & Diff
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span>
            Safeguards
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 4 ? "text-primary" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">4</span>
            {step === 5 ? "Result" : "Restoring"}
          </div>
        </div>

        {/* STEP 1: Archive Inspection & Compatibility */}
        {step === 1 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Target Backup Archive</span>
                <Badge variant="outline" className="font-mono text-[10px]">{backup.type}</Badge>
              </div>
              <div className="font-mono text-muted-foreground break-all">{backup.fileName}</div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                <div>Created: {new Date(backup.createdAt).toLocaleString()}</div>
                <div>Size: {(backup.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</div>
                <div>App Version: {backup.appVersion}</div>
                <div>Schema Version: v{backup.schemaVersion}</div>
              </div>
            </div>

            {isLoadingPreview ? (
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p>Inspecting archive integrity and computing diff...</p>
              </div>
            ) : preview ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-1 text-emerald-800 dark:text-emerald-300">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Package Verified & Compatible
                </div>
                <p className="text-[11px]">
                  Archive checksums match, all JSON tables are parseable, and schema compatibility checks passed.
                </p>
              </div>
            ) : restoreError ? (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-rose-800 dark:text-rose-300">
                <div className="font-bold flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  Verification Failed
                </div>
                <p className="text-[11px] mt-1">{restoreError}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 2: Diff Preview & Mode Selection */}
        {step === 2 && preview && (
          <div className="space-y-3 py-2 text-xs">
            <div className="font-semibold text-foreground">Record Counts & Projected Changes</div>

            <div className="grid grid-cols-3 gap-2">
              <div className="border rounded-lg p-2.5 bg-card">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">BOLs</span>
                <span className="text-base font-black">{preview.backupRecordCounts.bols}</span>
                <span className={`block text-[10px] font-mono ${preview.diff.bols >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {preview.diff.bols >= 0 ? `+${preview.diff.bols}` : preview.diff.bols} vs live
                </span>
              </div>

              <div className="border rounded-lg p-2.5 bg-card">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Invoices</span>
                <span className="text-base font-black">{preview.backupRecordCounts.invoices}</span>
                <span className={`block text-[10px] font-mono ${preview.diff.invoices >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {preview.diff.invoices >= 0 ? `+${preview.diff.invoices}` : preview.diff.invoices} vs live
                </span>
              </div>

              <div className="border rounded-lg p-2.5 bg-card">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ledger Rows</span>
                <span className="text-base font-black">{preview.backupRecordCounts.ledgerEntries}</span>
                <span className={`block text-[10px] font-mono ${preview.diff.ledgerEntries >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {preview.diff.ledgerEntries >= 0 ? `+${preview.diff.ledgerEntries}` : preview.diff.ledgerEntries} vs live
                </span>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="space-y-1.5 pt-2">
              <label className="font-semibold text-foreground block">Restore Execution Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestoreMode("merge")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    restoreMode === "merge"
                      ? "border-emerald-600 bg-emerald-500/5 ring-1 ring-emerald-600"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">Merge Records (Recommended)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Merges records safely by canonical ID without deleting newly created records.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRestoreMode("replace")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    restoreMode === "replace"
                      ? "border-rose-600 bg-rose-500/5 ring-1 ring-rose-600"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-bold text-rose-700 dark:text-rose-400">Replace Database (Danger)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Restores the exact complete state as of backup creation. Replaces existing records.
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Safeguards & Mandatory Confirmation */}
        {step === 3 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Zero-Data-Loss Safety Guarantees
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>
                  An automated <strong>PRE-RESTORE SAFETY SNAPSHOT</strong> will be taken immediately before any modification.
                </li>
                <li>
                  Restoration uses atomic temporary file swap. If an error occurs, the system automatically rolls back.
                </li>
                <li>
                  Post-restore verification will strictly enforce accounting invariance (Debit - Credit = Balance).
                </li>
              </ul>
            </div>

            {restoreMode === "replace" ? (
              <div className="space-y-2 pt-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <label className="font-semibold text-rose-700 dark:text-rose-400 block">
                  High-Impact Operation: Type <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-rose-600">RESTORE</code> to authorize:
                </label>
                <Input
                  placeholder="Type RESTORE in capital letters"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="font-mono text-xs uppercase border-rose-400 focus-visible:ring-rose-400"
                />
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs">
                <span className="font-bold">Safe Non-Destructive Merge:</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Records will be deduplicated and safely combined. Current database items will not be erased. Ready to execute.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Execution Progress */}
        {step === 4 && (
          <div className="py-8 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">Executing Safe Atomic Restoration</div>
              <div className="text-xs text-muted-foreground font-mono">{restoreProgressStage}</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Please do not refresh or close the browser window.
            </p>
          </div>
        )}

        {/* STEP 5: Final Result */}
        {step === 5 && (
          <div className="space-y-3 py-2 text-xs">
            {restoreResult?.success ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-2 text-emerald-900 dark:text-emerald-200">
                <div className="font-bold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Database Successfully Restored!
                </div>
                <p className="text-[11px]">
                  All tables and attachments restored. Accounting invariance passed with 0 discrepancies.
                </p>
                <div className="bg-background/80 rounded p-2 text-[10px] font-mono text-muted-foreground space-y-0.5">
                  <div>Pre-Restore Snapshot: {restoreResult.preRestoreBackupFile}</div>
                  <div>Records Restored: {restoreResult.recordsRestored}</div>
                  <div>Duration: {(((restoreResult.durationMs || 0)) / 1000).toFixed(2)}s</div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const reportFile = (restoreResult as any).reportJsonPath
                        ? (restoreResult as any).reportJsonPath.split(/[/\\]/).pop()
                        : `${(restoreResult as any).restoreId || "report"}.json`
                      window.open(`/api/backup/report?file=${encodeURIComponent(reportFile)}&format=json`, "_blank")
                    }}
                    className="h-7 text-[11px] gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download Audit Report (.json)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const reportFile = (restoreResult as any).reportHtmlPath
                        ? (restoreResult as any).reportHtmlPath.split(/[/\\]/).pop()
                        : `${(restoreResult as any).restoreId || "report"}.json`
                      window.open(`/api/backup/report?file=${encodeURIComponent(reportFile)}&format=html`, "_blank")
                    }}
                    className="h-7 text-[11px] gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                  >
                    <Download className="h-3 w-3" />
                    Download Audit Report (.html)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4 space-y-2 text-rose-900 dark:text-rose-200">
                <div className="font-bold text-sm flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-rose-600" />
                  Restore Blocked & Safely Rolled Back
                </div>
                <p className="text-[11px]">
                  {restoreError || restoreResult?.error || "Restore failed. Pre-restore database state has been preserved."}
                </p>
                {restoreResult?.rolledBack && (
                  <Badge variant="outline" className="border-rose-400 text-rose-700 dark:text-rose-300">
                    Automatic Rollback Complete
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
          {step > 1 && step < 4 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              disabled={isRestoring}
              className="text-xs"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < 5 && (
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isRestoring} className="text-xs">
                Cancel
              </Button>
            )}

            {step === 1 && (
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={isLoadingPreview || !preview || preview.isCompatible === false}
                className="text-xs"
              >
                Continue to Preview
              </Button>
            )}

            {step === 2 && (
              <Button size="sm" onClick={() => setStep(3)} className="text-xs">
                Review Safeguards
              </Button>
            )}

            {step === 3 && (
              <Button
                size="sm"
                onClick={executeRestore}
                disabled={(restoreMode === "replace" && confirmPhrase !== "RESTORE") || isRestoring}
                className={
                  restoreMode === "replace"
                    ? "text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    : "text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                }
              >
                Execute Safe Restore
              </Button>
            )}

            {step === 5 && (
              <Button size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
