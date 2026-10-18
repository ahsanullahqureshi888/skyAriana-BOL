"use client"

import React, { useState } from "react"
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  Layers,
  FileText,
  DollarSign,
  AlertOctagon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { DeepHealthReport, DatabaseHealthIssue } from "@/lib/backup/backup-types"

interface DatabaseHealthTabProps {
  report: DeepHealthReport | null
  isLoading: boolean
  onRefresh: () => void
  onRepairComplete: () => void
}

export function DatabaseHealthTab({
  report,
  isLoading,
  onRefresh,
  onRepairComplete,
}: DatabaseHealthTabProps) {
  const [isRepairing, setIsRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<{
    success: boolean
    preRepairBackupFileName: string
    repairsApplied: string[]
    errors: string[]
  } | null>(null)

  const handleApplyRepairs = async (actions: string[] = ["ALL"]) => {
    setIsRepairing(true)
    setRepairResult(null)
    try {
      const res = await fetch("/api/backup/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions, actor: "Admin Health Dashboard" }),
      })
      const data = await res.json()
      if (data.success) {
        setRepairResult(data)
        onRepairComplete()
      } else {
        setRepairResult({
          success: false,
          preRepairBackupFileName: data.preRepairBackupFileName || "",
          repairsApplied: data.repairsApplied || [],
          errors: data.errors || [data.error || "Repair failed"],
        })
      }
    } catch (err: any) {
      setRepairResult({
        success: false,
        preRepairBackupFileName: "",
        repairsApplied: [],
        errors: [err?.message || "Repair network error"],
      })
    } finally {
      setIsRepairing(false)
    }
  }

  const checks = report?.checks

  return (
    <div className="space-y-4 text-xs">
      {/* Top Banner with Health Overview & Repair Button */}
      <div className="bg-card/90 backdrop-blur border rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-primary" />
            Continuous Database Health & Integrity Audit
          </h3>
          <p className="text-muted-foreground text-[11px] mt-0.5">
            Non-destructive audit of foreign key relations, accounting invariance equations, duplicate keys, and storage.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7.5 gap-1 text-xs px-2.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            {isLoading ? "Auditing..." : "Re-Scan Database"}
          </Button>

          <Button
            size="sm"
            onClick={() => handleApplyRepairs(["ALL"])}
            disabled={isRepairing || !report?.issues.some((i) => i.repairable)}
            className="h-7.5 gap-1.5 text-xs font-semibold bg-primary px-3 shadow-2xs"
            title="Applies safe auto-repairs after creating a pre-repair safety snapshot"
          >
            <Wrench className={`h-3.5 w-3.5 ${isRepairing ? "animate-spin" : ""}`} />
            {isRepairing ? "Repairing..." : "Safe Auto-Repair All"}
          </Button>
        </div>
      </div>

      {/* Repair Result Banner if applied */}
      {repairResult && (
        <div
          className={`border rounded-lg p-3 ${
            repairResult.success
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 text-sm">
            {repairResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {repairResult.success ? "Safe Repairs Successfully Applied" : "Repair Operation Encountered Errors"}
          </div>
          {repairResult.preRepairBackupFileName && (
            <p className="text-[11px] font-mono mt-0.5">
              Pre-repair safety backup created: {repairResult.preRepairBackupFileName}
            </p>
          )}
          {repairResult.repairsApplied.length > 0 && (
            <ul className="list-disc list-inside mt-1 text-[11px]">
              {repairResult.repairsApplied.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {repairResult.errors.length > 0 && (
            <ul className="list-disc list-inside mt-1 text-[11px] text-rose-600 dark:text-rose-400">
              {repairResult.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 5 Core Health Check Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Check 1: Relational Integrity */}
        <div className="bg-card border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Relational</span>
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="font-bold text-sm flex items-center gap-1">
            {checks?.relationalIntegrity.pass ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Intact
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> {checks?.relationalIntegrity.violations} Violations
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">BOLs, Invoices, Shipments</p>
        </div>

        {/* Check 2: Accounting Invariance */}
        <div className="bg-card border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Accounting Invariance</span>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="font-bold text-sm flex items-center gap-1">
            {checks?.accountingInvariance.pass ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Valid
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1">
                <XCircle className="h-4 w-4" /> {checks?.accountingInvariance.discrepanciesCount} Notice
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Debit - Credit = Balance</p>
        </div>

        {/* Check 3: Duplicate Critical IDs */}
        <div className="bg-card border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Key Uniqueness</span>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="font-bold text-sm flex items-center gap-1">
            {checks?.duplicateCriticalIds.pass ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Unique
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertOctagon className="h-4 w-4" /> {checks?.duplicateCriticalIds.duplicatesCount} Dups
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">No duplicate BOLs or Invoices</p>
        </div>

        {/* Check 4: Orphan Detection */}
        <div className="bg-card border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Orphan Records</span>
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="font-bold text-sm flex items-center gap-1">
            {checks?.orphanDetection.pass ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> 0 Orphans
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> {checks?.orphanDetection.orphansCount} Orphans
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">No disconnected child entries</p>
        </div>

        {/* Check 5: Document & Attachment Files */}
        <div className="bg-card border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Storage Files</span>
            <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="font-bold text-sm flex items-center gap-1">
            {checks?.documentStorage.pass ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> 100% Present
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> {checks?.documentStorage.missingFilesCount} Missing
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Files exist in uploads/</p>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-card border rounded-xl shadow-2xs overflow-hidden flex flex-col">
        <div className="p-2.5 sm:p-3 bg-muted/30 border-b flex items-center justify-between">
          <h4 className="font-bold text-xs sm:text-sm text-foreground">
            Detected Audit Issues ({report?.issues.length || 0})
          </h4>
          <span className="text-muted-foreground text-[10px] font-mono">
            Audit timestamp: {report?.timestamp ? new Date(report.timestamp).toLocaleTimeString() : "Never"}
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[260px] relative">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b text-muted-foreground font-semibold text-[11px] shadow-2xs">
              <tr>
                <th className="py-2 px-3 w-[100px]">Severity</th>
                <th className="py-2 px-2.5 w-[140px]">Category</th>
                <th className="py-2 px-2.5 w-[120px]">Module</th>
                <th className="py-2 px-2.5 w-[120px]">Record ID</th>
                <th className="py-2 px-3">Issue Title & Details</th>
                <th className="py-2 px-3 text-right w-[110px]">Repairable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!report || report.issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                    All database checks passed cleanly. Zero integrity issues detected!
                  </td>
                </tr>
              ) : (
                report.issues.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {issue.severity === "CRITICAL" ? (
                        <Badge className="bg-rose-600 text-white text-[10px]">CRITICAL</Badge>
                      ) : issue.severity === "WARNING" ? (
                        <Badge className="bg-amber-600 text-white text-[10px]">WARNING</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">INFO</Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground">
                      {issue.category}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                      {issue.module}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                      {issue.recordId || "—"}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">{issue.title}</div>
                      {issue.details && <div className="text-[11px] text-muted-foreground mt-0.5">{issue.details}</div>}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {issue.repairable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyRepairs([issue.repairAction || "ALL"])}
                          disabled={isRepairing}
                          className="h-6 text-[10px] px-2 border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                        >
                          Auto-Fix
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual check</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
