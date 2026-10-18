"use client"

import React from "react"
import {
  History,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ShieldCheck,
  RotateCcw,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ShipmentDocumentRecord } from "@/lib/types/shipment-document-package"

interface DocumentVersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: ShipmentDocumentRecord | null
}

export function DocumentVersionHistoryDialog({
  open,
  onOpenChange,
  document,
}: DocumentVersionHistoryDialogProps) {
  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <History className="h-4 w-4" />
            </span>
            Document Version History & Snapshots
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {document.documentNumber} ({document.documentType.replace("_", " ").toUpperCase()}) — Master BOL: {document.bolNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3 max-h-[440px] overflow-y-auto pr-1">
          {document.versions.map((ver, idx) => {
            const isCurrent = ver.versionNumber === document.currentVersion
            return (
              <div
                key={ver.id}
                className={`rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? "border-blue-300 bg-blue-50/50 shadow-xs dark:border-blue-800 dark:bg-blue-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      v{ver.versionNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isCurrent ? "Current Active Version" : `Archived Version ${ver.versionNumber}`}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        ver.status === "issued" || ver.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {ver.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {new Date(ver.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Reason:</span>{" "}
                  {ver.changeReason || "Created from master BOL"}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>Created by: {ver.createdBy}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    <span>Snapshot Hash: {ver.sourceSnapshot.snapshotHash.slice(0, 10)}...</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
