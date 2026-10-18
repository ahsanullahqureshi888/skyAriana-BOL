"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import {
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Layers,
  Database,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import type { GoogleDriveBackupItem, RestoreMode } from "@/lib/google-drive/types"

export interface GoogleDriveRestoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  backup: GoogleDriveBackupItem | null
  onRestoreCompleted?: () => void
}

export function GoogleDriveRestoreModal({
  open,
  onOpenChange,
  backup,
  onRestoreCompleted,
}: GoogleDriveRestoreModalProps) {
  const [mode, setMode] = useState<RestoreMode>("merge")
  const [confirmationInput, setConfirmationInput] = useState("")
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  if (!backup) return null

  const formattedDate = new Date(backup.createdAt).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const sizeFormatted = (backup.sizeBytes / (1024 * 1024)).toFixed(1) + " MB"
  const isReplaceMode = mode === "replace"
  const canProceed = !isReplaceMode || confirmationInput.trim().toUpperCase() === "RESTORE"

  const handleExecuteRestore = async () => {
    if (!canProceed) return

    setIsRestoring(true)
    setRestoreStatus(null)
    const toastId = toast.loading("Creating pre-restore backup & restoring data...")

    try {
      const response = await fetch("/api/google-drive/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          fileId: backup.id,
          mode,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMsg = data.error || "Restore failed. Pre-restore backup was automatically reinstated."
        setRestoreStatus({
          success: false,
          message: errorMsg,
          details: data,
        })
        toast.error("Restore Failed — Original Data Restored", {
          id: toastId,
          description: errorMsg,
        })
        return
      }

      setRestoreStatus({
        success: true,
        message: `Restore Successful! Mode: ${mode === "merge" ? "Merge (Safe Union)" : "Replace (Clean State)"}. Financial invariance verified.`,
        details: data,
      })

      toast.success("Restore Complete! 🎉", {
        id: toastId,
        description: `Restored ${data.restoredCounts?.bols || 0} BOLs, ${data.restoredCounts?.invoices || 0} Invoices, ${data.restoredCounts?.ledgerEntries || 0} Ledger rows.`,
      })

      // Dispatch event to refresh state across components
      window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
      window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))

      onRestoreCompleted?.()

      setTimeout(() => {
        onOpenChange(false)
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      console.error("Restore error:", err)
      const errStr = err?.message || "Restore operation could not be completed."
      setRestoreStatus({
        success: false,
        message: `Restore Failed — Original Data Restored: ${errStr}`,
      })
      toast.error("Restore Error", { id: toastId, description: errStr })
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg bg-slate-900 border-slate-800 text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5 text-blue-400">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <RotateCcw className="w-5 h-5 text-blue-400" />
            </div>
            <DialogTitle className="text-lg font-black text-white">
              Restore Google Drive Backup?
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Review the backup metadata and choose how you would like to restore your data.
          </DialogDescription>
        </DialogHeader>

        {/* Backup Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Backup Date:</span>
            <span className="font-bold text-slate-200">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">App Version / Size:</span>
            <span className="font-mono text-slate-300">
              v{backup.appVersion || "5.1.0"} • {sizeFormatted}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold uppercase">BOLs</p>
              <p className="text-sm font-black text-amber-400 font-mono mt-0.5">
                {backup.bolCount || 0}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Invoices</p>
              <p className="text-sm font-black text-blue-400 font-mono mt-0.5">
                {backup.invoiceCount || 0}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Accounts</p>
              <p className="text-sm font-black text-purple-400 font-mono mt-0.5">
                {backup.companyCount || 0}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Ledgers</p>
              <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                {backup.ledgerCount || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Pre-Restore Safety Badge */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Safety Guarantee:</strong> An automatic Pre-Restore Local Backup will be generated first. If post-restore integrity or ledger balance invariance fails, the original data is automatically restored.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-300">Restore Strategy</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("merge")}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                mode === "merge"
                  ? "bg-blue-950/60 border-blue-500/50 text-white shadow-md shadow-blue-950/40"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Merge With Current Data</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Default: Combines records using stable IDs. Never overwrites newer data.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("replace")}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                mode === "replace"
                  ? "bg-red-950/60 border-red-500/50 text-white shadow-md shadow-red-950/40"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Replace Current Data</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Overwrites local records completely with this backup state.
              </p>
            </button>
          </div>
        </div>

        {/* Replace Mode Confirmation */}
        {isReplaceMode && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-red-300">
              Replace mode requires confirmation. Type <span className="font-mono bg-red-950 px-1 py-0.5 rounded text-white">RESTORE</span> to continue:
            </p>
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="RESTORE"
              className="bg-slate-950 border-red-500/40 text-white placeholder:text-slate-600 font-mono text-xs uppercase"
            />
          </div>
        )}

        {/* Status Message */}
        {restoreStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              restoreStatus.success
                ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-200"
                : "bg-red-950/60 border border-red-500/40 text-red-200"
            }`}
          >
            {restoreStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{restoreStatus.message}</p>
              {restoreStatus.details?.preRestoreBackupFile && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Snapshot: {restoreStatus.details.preRestoreBackupFile}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleExecuteRestore}
            disabled={isRestoring || !canProceed}
            className={`gap-1.5 text-xs font-bold rounded-xl shadow-lg cursor-pointer ${
              isReplaceMode
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/30"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30"
            }`}
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isReplaceMode ? "Confirm & Replace" : "Merge & Restore"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
