"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, Copy, GitMerge, Laptop, Cloud, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import type { SyncConflict } from "@/lib/sync/types"

interface ConflictResolutionDialogProps {
  conflict: SyncConflict | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolved: (conflictId: string) => void
}

export function ConflictResolutionDialog({
  conflict,
  open,
  onOpenChange,
  onResolved,
}: ConflictResolutionDialogProps) {
  const [isResolving, setIsResolving] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<"keep_local" | "keep_cloud" | "merge" | "keep_both">("merge")

  if (!conflict) return null

  const localData = conflict.localRecord?.data || {}
  const cloudData = conflict.cloudRecord?.data || {}
  const recordLabel =
    localData.bol_number ||
    cloudData.bol_number ||
    localData.invoice_number ||
    cloudData.invoice_number ||
    conflict.recordId

  const handleResolve = async (strategy: "keep_local" | "keep_cloud" | "merge" | "keep_both") => {
    setIsResolving(true)
    const toastId = toast.loading("Resolving synchronization conflict...")
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve-conflict",
          conflictId: conflict.id,
          strategy,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`Conflict for ${recordLabel} resolved successfully.`, { id: toastId })
        onResolved(conflict.id)
        onOpenChange(false)
      } else {
        toast.error(`Resolution error: ${json.error || "Failed to resolve"}`, { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Failed to resolve: ${e.message}`, { id: toastId })
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-amber-600 mb-1">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base font-black text-slate-900">
              Synchronization Conflict: <span className="text-amber-700">{conflict.recordType.toUpperCase()} {recordLabel}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            This record was modified on another device while being edited offline locally. Choose how to reconcile the differences.
          </DialogDescription>
        </DialogHeader>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          {/* Local Version */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Laptop className="w-3.5 h-3.5 text-blue-600" /> Local Version
              </span>
              <Badge variant="outline" className="text-[10px] bg-white border-blue-200 text-blue-700 font-bold">
                v{conflict.localRecord.version}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Updated: {new Date(conflict.localRecord.updatedAt).toLocaleString()}
            </p>
            <div className="space-y-1.5 text-xs">
              {conflict.conflictingFields.map((field) => (
                <div key={field} className="bg-white p-2 rounded border border-blue-100">
                  <span className="font-bold text-slate-700 block text-[10.5px]">{field}:</span>
                  <span className="text-blue-950 font-semibold break-words">
                    {String(localData[field] || "(empty)")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cloud Version */}
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50/50 p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-100">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Cloud className="w-3.5 h-3.5 text-purple-600" /> Cloud Version
              </span>
              <Badge variant="outline" className="text-[10px] bg-white border-purple-200 text-purple-700 font-bold">
                v{conflict.cloudRecord.version}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Updated: {new Date(conflict.cloudRecord.updatedAt).toLocaleString()}
            </p>
            <div className="space-y-1.5 text-xs">
              {conflict.conflictingFields.map((field) => (
                <div key={field} className="bg-white p-2 rounded border border-purple-100">
                  <span className="font-bold text-slate-700 block text-[10.5px]">{field}:</span>
                  <span className="text-purple-950 font-semibold break-words">
                    {String(cloudData[field] || "(empty)")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resolution Options Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 block mb-2">Select Resolution Strategy:</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isResolving}
              onClick={() => handleResolve("keep_local")}
              className="h-10 text-xs font-bold justify-start border-blue-200 text-blue-800 hover:bg-blue-50 cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 mr-2 text-blue-600" /> Keep Local Version
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isResolving}
              onClick={() => handleResolve("keep_cloud")}
              className="h-10 text-xs font-bold justify-start border-purple-200 text-purple-800 hover:bg-purple-50 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 mr-2 text-purple-600" /> Keep Cloud Version
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isResolving}
              onClick={() => handleResolve("merge")}
              className="h-10 text-xs font-bold justify-start border-emerald-200 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Merge Changes (Auto-Combine)
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isResolving}
              onClick={() => handleResolve("keep_both")}
              className="h-10 text-xs font-bold justify-start border-amber-200 text-amber-800 hover:bg-amber-50 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-2 text-amber-600" /> Keep Both Copies (Clone Record)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
