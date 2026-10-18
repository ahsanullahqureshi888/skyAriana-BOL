"use client"

import React, { useState } from "react"
import {
  FileCheck2,
  Lock,
  Download,
  Plus,
  ShieldCheck,
  Hash,
  Clock,
  UserCheck,
  CheckCircle,
  FileCode,
  FileSpreadsheet
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ManagementReportSnapshot, ReportFilters } from "@/lib/types/management-reporting"

interface TabProps {
  snapshots: ManagementReportSnapshot[]
  filters: ReportFilters
  onFinalizeSnapshot: (periodCode: string, notes: string) => Promise<void>
  onViewSnapshot: (snapshot: ManagementReportSnapshot) => void
}

export function CustomReportsTab({
  snapshots,
  filters,
  onFinalizeSnapshot,
  onViewSnapshot,
}: TabProps) {
  const [periodCodeInput, setPeriodCodeInput] = useState<string>(filters.periodCode || "2026-09")
  const [notesInput, setNotesInput] = useState<string>("")
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!periodCodeInput) return
    setIsFinalizing(true)
    setStatusMessage(null)
    try {
      await onFinalizeSnapshot(periodCodeInput, notesInput)
      setStatusMessage(`Snapshot successfully generated and cryptographically sealed for ${periodCodeInput}.`)
      setNotesInput("")
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message || "Failed to create snapshot"}`)
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Audited Report Snapshots & Management Finalization
            </h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-500/30 text-[11px] font-mono">
              SHA-256 Tamper-Proof
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Preserve immutable versions of monthly financial and operational statements for executive sign-off
          </p>
        </div>
      </div>

      {/* Snapshot Finalizer Form Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            Finalize Official Financial Period Snapshot
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Creates an immutable, cryptographically sealed record of P&L, Cash Flow, and Aging schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleFinalize} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Accounting Period Code (YYYY-MM)
                </label>
                <Input
                  value={periodCodeInput}
                  onChange={(e) => setPeriodCodeInput(e.target.value)}
                  placeholder="e.g. 2026-09"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Executive Notes / Audit Annotations
                </label>
                <Input
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Final board reviewed snapshot"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {statusMessage && (
              <div className={`p-3 rounded-lg text-xs ${statusMessage.startsWith("Error") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                {statusMessage}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isFinalizing}
                size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                {isFinalizing ? "Generating & Hashing..." : "Finalize & Seal Snapshot"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Snapshots Archive */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Immutable Snapshot Archive ({snapshots.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Every snapshot maintains version history and its exact cryptographic digest.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="text-left py-2.5 px-4 font-bold">Period Code</th>
                  <th className="text-center py-2.5 px-3 font-bold">Version</th>
                  <th className="text-center py-2.5 px-3 font-bold">Status</th>
                  <th className="text-left py-2.5 px-4 font-bold">SHA-256 Digest</th>
                  <th className="text-left py-2.5 px-4 font-bold">Timestamp & Author</th>
                  <th className="text-left py-2.5 px-4 font-bold">Notes</th>
                  <th className="text-center py-2.5 px-3 font-bold w-20">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {snapshots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No report snapshots finalized yet. Use the form above to generate your first snapshot.
                    </td>
                  </tr>
                ) : (
                  snapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {snap.periodCode}
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono font-semibold">
                        V{snap.snapshotVersion}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {snap.snapshotStatus === "FINAL" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-mono">
                            FINAL
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-300 text-[9px]">
                            SUPERSEDED
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500">
                        {snap.dataHash.substring(0, 16)}...
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                          {snap.generatedAt.split("T")[0]}
                        </div>
                        <div className="text-[10px] text-slate-400">{snap.generatedBy}</div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {snap.notes || "-"}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewSnapshot(snap)}
                          className="h-6 text-[10px] px-2 text-blue-600 border-blue-200"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
