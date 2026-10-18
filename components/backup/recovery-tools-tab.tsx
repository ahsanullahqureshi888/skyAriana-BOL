"use client"

import React, { useState } from "react"
import {
  PlayCircle,
  Download,
  Upload,
  Shield,
  FileCheck2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BackupItem } from "@/lib/backup/backup-types"
import type { SandboxTestRestoreResult } from "@/lib/backup/validate-backup"

interface RecoveryToolsTabProps {
  latestBackup: BackupItem | null
  onRefreshBackups: () => void
}

export function RecoveryToolsTab({ latestBackup, onRefreshBackups }: RecoveryToolsTabProps) {
  // Sandbox Drill State
  const [isDrilling, setIsDrilling] = useState(false)
  const [drillResult, setDrillResult] = useState<SandboxTestRestoreResult | null>(null)
  const [drillError, setDrillError] = useState<string | null>(null)

  // Upload State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const runDrill = async () => {
    if (!latestBackup) return
    setIsDrilling(true)
    setDrillResult(null)
    setDrillError(null)

    try {
      const res = await fetch("/api/backup/test-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId: latestBackup.id }),
      })
      const data = await res.json()
      if (data.success && data.drillResult) {
        setDrillResult(data.drillResult)
      } else {
        setDrillError(data.error || "Sandbox drill failed")
      }
    } catch (err: any) {
      setDrillError(err?.message || "Sandbox drill network error")
    } finally {
      setIsDrilling(false)
    }
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("note", `Uploaded via Recovery Tools: ${file.name}`)
      formData.append("actor", "Admin User")

      const res = await fetch("/api/backup/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setUploadMessage({
          type: "success",
          text: `Backup ${data.backup.fileName} uploaded and verified successfully.`,
        })
        onRefreshBackups()
      } else {
        setUploadMessage({
          type: "error",
          text: data.error || "Upload failed verification",
        })
      }
    } catch (err: any) {
      setUploadMessage({
        type: "error",
        text: err?.message || "Upload request error",
      })
    } finally {
      setIsUploading(false)
      // Reset input
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-3 text-xs">
      {/* Tool 1: Sandbox Test Restore Drill */}
      <div className="bg-card/90 backdrop-blur border rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
              <PlayCircle className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              In-Memory Sandbox Test Restore Drill
            </h4>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Simulates a complete database restoration entirely in memory without writing to live files or disrupting operations.
            </p>
          </div>

          <Button
            size="sm"
            onClick={runDrill}
            disabled={!latestBackup || isDrilling}
            className="h-7.5 gap-1.5 text-xs font-semibold px-3 shadow-2xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDrilling ? "animate-spin" : ""}`} />
            {isDrilling ? "Running Drill..." : "Run Sandbox Drill Now"}
          </Button>
        </div>

        {latestBackup && (
          <div className="bg-muted/40 rounded p-2.5 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Target Archive: {latestBackup.fileName}</span>
            <span>Created: {new Date(latestBackup.createdAt).toLocaleDateString()}</span>
          </div>
        )}

        {drillResult && (
          <div
            className={`border rounded-lg p-3 ${
              drillResult.pass
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
            }`}
          >
            <div className="font-bold flex items-center gap-1.5 text-sm">
              {drillResult.pass ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {drillResult.pass ? "Sandbox Drill Passed 100%!" : "Sandbox Drill Encountered Issues"}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
              <div>Records Verified: <strong>{drillResult.recordsVerified}</strong></div>
              <div>Tables Checked: <strong>{drillResult.tablesVerified}</strong></div>
              <div>Attachments Intact: <strong>{drillResult.attachmentsVerified}</strong></div>
              <div>Execution Time: <strong>{(drillResult.durationMs / 1000).toFixed(2)}s</strong></div>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 mt-2 text-[11px]">
              Accounting Invariance: <strong>{drillResult.invarianceValid ? "Pass (Balanced)" : "Failed"}</strong>
            </div>

            {drillResult.relationalIssues.length > 0 && (
              <ul className="list-disc list-inside mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                {drillResult.relationalIssues.map((issue: string, idx: number) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {drillError && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-lg p-3 text-rose-900 dark:text-rose-200">
            <span className="font-bold">Drill Error:</span> {drillError}
          </div>
        )}
      </div>

      {/* Tool 2: External Backup Upload & Import */}
      <div className="bg-card/90 backdrop-blur border rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
              <Upload className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              Upload External Backup Package
            </h4>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Upload a previously downloaded <code className="font-mono text-[10px]">.zip</code> archive from another PC, external drive, or offsite server.
            </p>
          </div>

          <label className="cursor-pointer shrink-0">
            <input
              type="file"
              accept=".zip"
              onChange={handleUploadFile}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              asChild
              className="h-7.5 gap-1.5 text-xs font-semibold cursor-pointer px-3"
            >
              <span>
                <Upload className={`h-3.5 w-3.5 ${isUploading ? "animate-spin" : ""}`} />
                {isUploading ? "Uploading & Verifying..." : "Select Archive (.zip)"}
              </span>
            </Button>
          </label>
        </div>

        {uploadMessage && (
          <div
            className={`p-2.5 rounded-lg border ${
              uploadMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5 text-xs">
              {uploadMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {uploadMessage.text}
            </div>
          </div>
        )}
      </div>

      {/* Tool 3: Standalone Emergency JSON Data Export */}
      <div className="bg-card/90 backdrop-blur border rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
            <Download className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            Standalone Emergency JSON Snapshot
          </h4>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Download a portable, uncompressed, self-contained single JSON file of all core company records readable in any text editor.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("/api/backup/emergency-export", "_blank")}
          className="h-7.5 gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 shrink-0 px-3"
        >
          <Download className="h-3.5 w-3.5" />
          Download JSON Snapshot
        </Button>
      </div>
    </div>
  )
}
