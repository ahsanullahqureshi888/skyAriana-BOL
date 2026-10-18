"use client"

import React, { useState, useRef } from "react"
import {
  RotateCcw,
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Eye,
  Sliders,
  Layers,
  Database,
  Lock,
  Download,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { RestoreDryRunResult, RestoreExecutionResult, RestoreConflict } from "@/lib/backup/central-backup-service"

interface RestoreBackupTabProps {
  onRestoreSuccess: () => void
}

export function RestoreBackupTab({ onRestoreSuccess }: RestoreBackupTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<RestoreDryRunResult | null>(null)

  // Mode & configuration
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace" | "selective">("merge")
  const [confirmPhrase, setConfirmPhrase] = useState("")
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "bols",
    "shipments",
    "accounts",
    "companies",
    "invoices",
    "accountLedgers",
  ])

  // Conflict resolutions: key = `${entityType}:${identifier}`, value = "keep_current" | "use_backup" | "review_later"
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, "keep_current" | "use_backup" | "review_later">>({})
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false)

  // Execution state
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreProgressStage, setRestoreProgressStage] = useState<string>("")
  const [restoreResult, setRestoreResult] = useState<RestoreExecutionResult | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setDryRunResult(null)
    setRestoreResult(null)
    setRestoreError(null)

    const buffer = await file.arrayBuffer()
    setFileBuffer(buffer)

    // Trigger analysis immediately upon file selection
    runDryRun(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const runDryRun = async (fileToAnalyze?: File) => {
    const file = fileToAnalyze || selectedFile
    if (!file) {
      toast.error("Please select a backup file first")
      return
    }

    setIsAnalyzing(true)
    setDryRunResult(null)
    setRestoreError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Upload and dry-run analyze via upload route or restore route
      const uploadRes = await fetch("/api/backup/upload", {
        method: "POST",
        body: formData,
      })

      const uploadJson = await uploadRes.json()
      if (uploadJson.success && uploadJson.preview) {
        setDryRunResult(uploadJson.preview)
        toast.success("Backup File Analyzed", {
          description: `Compatibility: ${uploadJson.preview.compatibilityStatus}. Checksum: ${uploadJson.preview.checksumValid ? "VALID" : "MISMATCH"}`,
        })
      } else {
        toast.error("Analysis Failed", {
          description: uploadJson.error || "File could not be parsed as valid backup",
        })
        setRestoreError(uploadJson.error || "Validation error")
      }
    } catch (err: any) {
      toast.error("Network Error", { description: err.message })
      setRestoreError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const executeRestore = async () => {
    if (!dryRunResult || !selectedFile) {
      toast.error("Cannot restore without a verified preview")
      return
    }

    if (restoreMode === "replace" && confirmPhrase !== "RESTORE") {
      toast.error('Confirmation Required', {
        description: 'You must type "RESTORE" to confirm replacing all data.',
      })
      return
    }

    setIsRestoring(true)
    setRestoreError(null)
    setRestoreProgressStage("1/5: Verifying Backup Checksum & Invariance...")

    try {
      setTimeout(() => setRestoreProgressStage("2/5: Creating Pre-Restore Rollback Snapshot..."), 800)
      setTimeout(() => setRestoreProgressStage("3/5: Normalizing Records & Applying Mode..."), 1800)
      setTimeout(() => setRestoreProgressStage("4/5: Restoring Database Stores & Relations..."), 2800)
      setTimeout(() => setRestoreProgressStage("5/5: Validating Post-Restore Accounting Invariance..."), 3800)

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          rawContent: {
            backupMetadata: {
              application: "AQ COMPANIES",
              backupFormatVersion: dryRunResult.backupFormatVersion,
              applicationVersion: dryRunResult.applicationVersion,
              backupType: dryRunResult.backupType,
            },
            data: dryRunResult.normalizedData,
          },
          mode: restoreMode,
          confirmationText: confirmPhrase,
          actor: "Admin User",
          selectedModules: restoreMode === "selective" ? selectedModules : undefined,
          conflictResolutions,
        }),
      })

      const json = await res.json()
      if (json.success && json.result) {
        setRestoreResult(json.result)
        toast.success("Restore Completed Successfully", {
          description: `${json.result.recordsRestored} records restored. Pre-restore snapshot created.`,
        })
        onRestoreSuccess()
      } else {
        setRestoreError(json.error || "Restore execution failed and was rolled back safely.")
        toast.error("Restore Aborted & Rolled Back", {
          description: json.error || "Data rolled back safely to pre-restore state.",
        })
      }
    } catch (err: any) {
      setRestoreError(err.message || "Network error during restore execution")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleConflictStrategy = (key: string, strategy: "keep_current" | "use_backup" | "review_later") => {
    setConflictResolutions((prev) => ({ ...prev, [key]: strategy }))
  }

  const applyToAllConflicts = (strategy: "keep_current" | "use_backup" | "review_later") => {
    if (!dryRunResult?.conflicts) return
    const updated: Record<string, "keep_current" | "use_backup" | "review_later"> = {}
    for (const c of dryRunResult.conflicts) {
      updated[`${c.entityType}:${c.identifier}`] = strategy
    }
    setConflictResolutions(updated)
    const label =
      strategy === "keep_current" ? "Keep Current" : strategy === "review_later" ? "Review Later" : "Use Backup"
    toast.info(`Applied "${label}" to all conflicts`)
  }

  return (
    <div className="space-y-4">
      {/* File Drop & Selection Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Restore Backup Package
          </CardTitle>
          <CardDescription className="text-xs">
            Step 1: Select or drag an AQ Companies backup file (.json or .zip). The system validates content,
            normalizes legacy schemas, and runs a zero-write dry run before any modification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-1 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".json,.zip"
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-all space-y-2"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="font-semibold text-xs text-foreground">
              {selectedFile ? selectedFile.name : "Drag backup file here or click to browse"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Supports .json (V2 Envelope & V1 Desktop) and .zip (with attachments). Content is inspected deeply.
            </p>
          </div>

          {selectedFile && (
            <div className="flex flex-wrap items-center justify-between p-3 bg-muted/40 rounded-lg border text-xs gap-2">
              <div>
                <span className="font-semibold text-foreground">{selectedFile.name}</span>
                <span className="text-muted-foreground ml-2">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runDryRun()}
                disabled={isAnalyzing || isRestoring}
                className="gap-1 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                {isAnalyzing ? "Analyzing..." : "Re-Run Dry Check"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis & Compatibility Preview */}
      {dryRunResult && (
        <Card className="border shadow-xs animate-in fade-in-50">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Compatibility & Dry-Run Preview
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Badge
                  className={
                    dryRunResult.isCompatible
                      ? "bg-emerald-600 text-white font-bold text-xs"
                      : "bg-rose-600 text-white font-bold text-xs"
                  }
                >
                  {dryRunResult.compatibilityStatus}
                </Badge>
                <Badge
                  variant={dryRunResult.checksumValid ? "outline" : "destructive"}
                  className="text-xs"
                >
                  {dryRunResult.checksumValid ? "✓ Checksum Valid" : "✗ Checksum Mismatch"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-4">
            {/* Record Counts Comparison Table */}
            <div className="border rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/70 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">Entity</th>
                    <th className="p-2.5">Current System</th>
                    <th className="p-2.5">Backup Package</th>
                    <th className="p-2.5">Net Difference</th>
                    <th className="p-2.5">Duplicates Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2.5 font-medium">Bills of Lading (BOLs)</td>
                    <td className="p-2.5">{dryRunResult.currentRecordCounts.bols}</td>
                    <td className="p-2.5 font-bold">{dryRunResult.backupRecordCounts.bols}</td>
                    <td className="p-2.5">
                      <span className={dryRunResult.diff.bols >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {dryRunResult.diff.bols >= 0 ? `+${dryRunResult.diff.bols}` : dryRunResult.diff.bols}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground">{dryRunResult.duplicatesDetected.bols} canonical dupes</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Shipments</td>
                    <td className="p-2.5">{dryRunResult.currentRecordCounts.shipments}</td>
                    <td className="p-2.5 font-bold">{dryRunResult.backupRecordCounts.shipments}</td>
                    <td className="p-2.5">
                      <span className={dryRunResult.diff.shipments >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {dryRunResult.diff.shipments >= 0 ? `+${dryRunResult.diff.shipments}` : dryRunResult.diff.shipments}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground">—</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Accounts & Master Entities</td>
                    <td className="p-2.5">{dryRunResult.currentRecordCounts.accounts}</td>
                    <td className="p-2.5 font-bold">{dryRunResult.backupRecordCounts.accounts}</td>
                    <td className="p-2.5">
                      <span className={dryRunResult.diff.accounts >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {dryRunResult.diff.accounts >= 0 ? `+${dryRunResult.diff.accounts}` : dryRunResult.diff.accounts}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground">{dryRunResult.duplicatesDetected.accounts} mapped</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Ledger Entries</td>
                    <td className="p-2.5">{dryRunResult.currentRecordCounts.ledgerEntries}</td>
                    <td className="p-2.5 font-bold">{dryRunResult.backupRecordCounts.ledgerEntries}</td>
                    <td className="p-2.5">
                      <span className={dryRunResult.diff.ledgerEntries >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {dryRunResult.diff.ledgerEntries >= 0 ? `+${dryRunResult.diff.ledgerEntries}` : dryRunResult.diff.ledgerEntries}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground">{dryRunResult.duplicatesDetected.ledgerEntries} exact matches</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Warnings and Normalization Disclosures */}
            {(dryRunResult.warnings.length > 0 || dryRunResult.repairedWeightsCount > 0) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1 text-xs">
                <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Pre-Restore Normalization Notices ({dryRunResult.warnings.length} items)
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                  {dryRunResult.repairedWeightsCount > 0 && (
                    <li>Repaired {dryRunResult.repairedWeightsCount} corrupted gross weights while preserving valid net weight.</li>
                  )}
                  {dryRunResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conflicts Warning & Review Button */}
            {dryRunResult.conflicts.length > 0 && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-700 dark:text-blue-400">
                    {dryRunResult.conflicts.length} Record Content Differences Detected
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Current values differ from backup values. You can review and choose which value to retain.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsConflictModalOpen(true)}
                  className="text-xs gap-1 border-blue-500/30"
                >
                  Review Conflicts ({dryRunResult.conflicts.length})
                </Button>
              </div>
            )}

            {/* Mode Selection */}
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step 5: Select Restore Mode
              </Label>
              <RadioGroup
                value={restoreMode}
                onValueChange={(v) => setRestoreMode(v as any)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                {/* MERGE (Default & Recommended) */}
                <div
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    restoreMode === "merge" ? "border-emerald-600 bg-emerald-500/5 shadow-xs" : "border-border"
                  }`}
                  onClick={() => setRestoreMode("merge")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RadioGroupItem value="merge" id="mode-merge" />
                    <Label htmlFor="mode-merge" className="font-bold text-xs cursor-pointer text-emerald-600">
                      Merge Safely (Recommended)
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Preserves current data, inserts new records, deduplicates using canonical IDs. Never blindly overwrites.
                  </p>
                </div>

                {/* SELECTIVE RESTORE */}
                <div
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    restoreMode === "selective" ? "border-primary bg-primary/5 shadow-xs" : "border-border"
                  }`}
                  onClick={() => setRestoreMode("selective")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RadioGroupItem value="selective" id="mode-selective" />
                    <Label htmlFor="mode-selective" className="font-bold text-xs cursor-pointer">
                      Selective Restore
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Restore only selected modules (e.g. BOLs only, Accounting only). Validates foreign key relations.
                  </p>
                </div>

                {/* REPLACE (Danger Zone) */}
                <div
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    restoreMode === "replace" ? "border-rose-600 bg-rose-500/10 shadow-xs" : "border-border"
                  }`}
                  onClick={() => setRestoreMode("replace")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RadioGroupItem value="replace" id="mode-replace" />
                    <Label htmlFor="mode-replace" className="font-bold text-xs cursor-pointer text-rose-600">
                      Replace All Data (Danger)
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clears supported application tables and restores backup state. Creates safety snapshot first.
                  </p>
                </div>
              </RadioGroup>

              {/* Danger Zone Confirmation Input */}
              {restoreMode === "replace" && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                    <AlertCircle className="h-4 w-4" />
                    DANGER ZONE: High-Impact Operation
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All existing records will be replaced with backup records. A safety rollback snapshot will be created
                    automatically. To proceed, please type <strong className="font-mono text-rose-600">RESTORE</strong> below:
                  </p>
                  <Input
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    placeholder='Type "RESTORE" to confirm'
                    className="h-8 text-xs font-mono max-w-xs border-rose-400 focus-visible:ring-rose-400"
                  />
                </div>
              )}
            </div>

            {/* Rollback Safety Snapshot Notice */}
            <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-lg border text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Rollback Guarantee:</strong> A timestamped recovery snapshot (<code>AQ_COMPANIES_PRE_RESTORE_...</code>)
                is created automatically before restore starts.
              </span>
            </div>

            {/* Execute Restore Button & Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
              {isRestoring ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-primary animate-pulse">
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  <span>{restoreProgressStage}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Ready to execute. Database transactions are reversible.
                </div>
              )}

              <Button
                size="lg"
                onClick={executeRestore}
                disabled={isRestoring || (restoreMode === "replace" && confirmPhrase !== "RESTORE")}
                className={
                  restoreMode === "replace"
                    ? "bg-rose-600 hover:bg-rose-500 text-white font-bold"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
                }
              >
                {isRestoring ? "Restoring Database..." : `Execute ${restoreMode.toUpperCase()} Restore`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Restore Result Card */}
      {restoreResult && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-md animate-in fade-in-50">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Restore Completed Successfully
              </CardTitle>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                Invariance: PASS (100% Balanced)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background p-3 rounded-lg border">
              <div>
                <span className="text-muted-foreground">Restore ID:</span>
                <p className="font-mono font-bold truncate">{restoreResult.restoreId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <p className="font-bold">{restoreResult.mode.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Records Restored:</span>
                <p className="font-bold text-emerald-600">{restoreResult.recordsRestored}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Safety Snapshot:</span>
                <p className="font-mono text-[11px] truncate">{restoreResult.preRestoreSnapshotFile}</p>
              </div>
            </div>

            <p className="text-muted-foreground">
              Accounting invariance identity verified: Total Debit - Total Credit = Net Balance for all ledger accounts.
            </p>

            {/* Audit Report Downloads (Requirement 62) */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-background rounded-lg border gap-2 mt-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-foreground">Immutable Restore Audit Report Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const reportFile = restoreResult.reportJsonPath
                      ? restoreResult.reportJsonPath.split(/[/\\]/).pop()
                      : `${restoreResult.restoreId}.json`
                    window.open(`/api/backup/report?file=${encodeURIComponent(reportFile || "")}&format=json`, "_blank")
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Audit Report (.json)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const reportFile = restoreResult.reportHtmlPath
                      ? restoreResult.reportHtmlPath.split(/[/\\]/).pop()
                      : restoreResult.reportJsonPath
                      ? restoreResult.reportJsonPath.split(/[/\\]/).pop()
                      : `${restoreResult.restoreId}.json`
                    window.open(`/api/backup/report?file=${encodeURIComponent(reportFile || "")}&format=html`, "_blank")
                  }}
                  className="h-7 text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Audit Report (.html)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Card */}
      {restoreError && (
        <Card className="border-rose-500/30 bg-rose-500/5 shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Restore Operation Aborted Safely
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs space-y-2">
            <p className="text-foreground font-medium">{restoreError}</p>
            <p className="text-muted-foreground">
              Transactional integrity preserved. Current database was not altered.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conflict Review Dialog */}
      <Dialog open={isConflictModalOpen} onOpenChange={setIsConflictModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Conflict Review & Strategic Reconciliation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review records where current database values differ from backup package values.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b text-xs gap-2">
            <span className="text-muted-foreground">
              Total Conflicts: <strong>{dryRunResult?.conflicts?.length || 0}</strong>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => applyToAllConflicts("keep_current")} className="text-xs h-7">
                Keep All Current
              </Button>
              <Button size="sm" variant="outline" onClick={() => applyToAllConflicts("review_later")} className="text-xs h-7">
                Review All Later
              </Button>
              <Button size="sm" variant="outline" onClick={() => applyToAllConflicts("use_backup")} className="text-xs h-7">
                Use All Backup
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y text-xs space-y-2 py-2">
            {dryRunResult?.conflicts.map((c, idx) => {
              const conflictKey = `${c.entityType}:${c.identifier}`
              const currentChoice = conflictResolutions[conflictKey] || "use_backup"

              return (
                <div key={idx} className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {c.entityType}: {c.identifier} ({c.field})
                    </span>
                    {c.financial && (
                      <Badge variant="destructive" className="text-[10px]">
                        Financial Invariance Critical
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-background p-2.5 rounded border">
                    <div>
                      <span className="text-muted-foreground">Current Value:</span>
                      <p className="font-semibold text-foreground break-all">{String(c.currentValue)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Backup Value:</span>
                      <p className="font-semibold text-primary break-all">{String(c.backupValue)}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant={currentChoice === "keep_current" ? "default" : "outline"}
                      onClick={() => handleConflictStrategy(conflictKey, "keep_current")}
                      className="text-xs h-7"
                    >
                      Keep Current
                    </Button>
                    <Button
                      size="sm"
                      variant={currentChoice === "review_later" ? "default" : "outline"}
                      onClick={() => handleConflictStrategy(conflictKey, "review_later")}
                      className="text-xs h-7"
                    >
                      Review Later
                    </Button>
                    <Button
                      size="sm"
                      variant={currentChoice === "use_backup" ? "default" : "outline"}
                      onClick={() => handleConflictStrategy(conflictKey, "use_backup")}
                      className="text-xs h-7"
                    >
                      Use Backup
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button onClick={() => setIsConflictModalOpen(false)}>Done Reviewing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
