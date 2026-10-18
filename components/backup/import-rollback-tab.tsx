"use client"

import React, { useState, useEffect } from "react"
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  User,
  ShieldAlert,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import type { ImportBatchInfo } from "@/lib/backup/backup-types"

interface ImportRollbackTabProps {
  onRollbackComplete: () => void
}

export function ImportRollbackTab({ onRollbackComplete }: ImportRollbackTabProps) {
  const [batches, setBatches] = useState<ImportBatchInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<ImportBatchInfo | null>(null)
  const [forceRollback, setForceRollback] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadBatches = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/backup/rollback-import")
      const data = await res.json()
      if (data.success && Array.isArray(data.batches)) {
        setBatches(data.batches)
      }
    } catch (err) {
      console.error("Failed to load import batches:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBatches()
  }, [])

  const handleRollback = async () => {
    if (!selectedBatch) return
    setIsExecuting(true)
    setActionMessage(null)

    try {
      const res = await fetch("/api/backup/rollback-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatch.batchId,
          force: forceRollback,
          actor: "Admin User",
        }),
      })

      const data = await res.json()
      if (data.success) {
        setActionMessage({
          type: "success",
          text: `Batch ${selectedBatch.batchId} successfully rolled back. ${data.result.recordsRemoved} records removed. Safety backup: ${data.result.preRollbackBackupFile}`,
        })
        setSelectedBatch(null)
        setForceRollback(false)
        loadBatches()
        onRollbackComplete()
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Rollback failed",
        })
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.message || "Rollback request failed",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-card/90 backdrop-blur border rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <RotateCcw className="h-4.5 w-4.5 text-primary" />
            Bulk Import Rollback & Conflict Guard
          </h3>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Safely undo erroneous or contaminated bulk Excel/CSV imports with downstream transaction conflict protection.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadBatches} disabled={isLoading} className="h-7.5 gap-1 text-xs px-2.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Batches
        </Button>
      </div>

      {actionMessage && (
        <div
          className={`p-2.5 rounded-lg border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5 text-xs">
            {actionMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {actionMessage.text}
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-card border rounded-xl shadow-2xs overflow-hidden flex flex-col">
        <div className="p-2.5 sm:p-3 bg-muted/30 border-b flex items-center justify-between">
          <h4 className="font-bold text-xs sm:text-sm text-foreground">Registered Import Batches</h4>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[260px] relative">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b text-muted-foreground font-semibold text-[11px] shadow-2xs">
              <tr>
                <th className="py-2 px-3">Batch & File</th>
                <th className="py-2 px-3">Imported Date</th>
                <th className="py-2 px-3">Operator</th>
                <th className="py-2 px-3">Records Created</th>
                <th className="py-2 px-3">Conflict Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    Checking import batch histories...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No recent bulk import batches recorded.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{batch.fileName}</span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        ID: {batch.batchId}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(batch.importedAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        {batch.importedBy}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-foreground">
                      {batch.recordCount} records
                    </td>

                    <td className="py-2.5 px-3">
                      {batch.canRollback ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                          Safe to Rollback
                        </Badge>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                            Conflicts Detected
                          </Badge>
                          {batch.conflictReasons?.map((r, i) => (
                            <div key={i} className="text-[10px] text-muted-foreground">{r}</div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBatch(batch)}
                        className="h-7 text-xs border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
                      >
                        Rollback...
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {selectedBatch && (
        <Dialog open={Boolean(selectedBatch)} onOpenChange={() => !isExecuting && setSelectedBatch(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Bulk Import Rollback
              </DialogTitle>
              <DialogDescription className="text-xs">
                Batch: {selectedBatch.fileName} ({selectedBatch.recordCount} records)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200">
                <p className="font-semibold">Automated Safety Snapshot Guaranteed</p>
                <p className="text-[11px] mt-0.5">
                  A PRE_IMPORT safety backup will be created before removing records.
                </p>
              </div>

              {!selectedBatch.canRollback && (
                <div className="space-y-2 border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg text-rose-900 dark:text-rose-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    Downstream Conflicts Found
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {selectedBatch.conflictReasons?.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-2 pt-2 border-t border-rose-200/60">
                    <Checkbox
                      id="forceRollback"
                      checked={forceRollback}
                      onCheckedChange={(c) => setForceRollback(Boolean(c))}
                    />
                    <label htmlFor="forceRollback" className="text-[11px] font-semibold cursor-pointer">
                      I understand the risk and want to force rollback
                    </label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)} disabled={isExecuting} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRollback}
                disabled={(!selectedBatch.canRollback && !forceRollback) || isExecuting}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isExecuting ? "Rolling Back..." : "Execute Rollback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
