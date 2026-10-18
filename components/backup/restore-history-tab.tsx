"use client"

import React, { useState, useEffect } from "react"
import {
  RotateCcw,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { RestoreHistoryItem } from "@/lib/backup/central-backup-service"

export function RestoreHistoryTab() {
  const [history, setHistory] = useState<RestoreHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/backup/history")
      const json = await res.json()
      if (json.success) {
        setHistory(json.history || [])
      }
    } catch (err: any) {
      console.error("Failed to load restore history:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleRollback = async (item: RestoreHistoryItem) => {
    if (
      !confirm(
        `Are you sure you want to ROLLBACK restore "${item.restoreId}"?\n\nThis will safely revert your database back to the snapshot created before this restore: ${item.preRestoreSnapshotFile}.\n\nProceed?`
      )
    ) {
      return
    }

    setRollingBackId(item.restoreId)
    try {
      const res = await fetch("/api/backup/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreId: item.restoreId, actor: "Admin User" }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Rollback Succeeded", {
          description: `Database successfully reverted to snapshot: ${json.rolledBackToSnapshot}`,
        })
        await loadHistory()
      } else {
        toast.error("Rollback Failed", { description: json.error || "Failed to rollback restore" })
      }
    } catch (err: any) {
      toast.error("Network Error", { description: err.message })
    } finally {
      setRollingBackId(null)
    }
  }

  const handleDownloadReport = (fileName: string, format: "json" | "html") => {
    window.open(`/api/backup/report?file=${encodeURIComponent(fileName)}&format=${format}`, "_blank")
  }

  const filteredHistory = history.filter(
    (h) =>
      h.restoreId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.backupFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.actor.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                Restore Audit History & Reversible Rollback
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Every restore operation is logged immutably with operator, affected records, and rollback snapshot references.
              </CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search restore history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-1 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading restore audit history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
              No restore operations recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.restoreId}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/20 transition-all space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground text-sm">{item.restoreId}</span>
                      <Badge
                        variant={item.result === "SUCCESS" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {item.result}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {item.mode}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.timestamp)} · by {item.actor}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-2.5 rounded border">
                    <div>
                      <span className="text-muted-foreground">Records Restored:</span>
                      <p className="font-bold text-foreground">{item.recordsRestored}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conflicts Resolved:</span>
                      <p className="font-bold text-foreground">{item.conflictsCount ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Safety Snapshot:</span>
                      <p className="font-mono text-[11px] text-foreground truncate select-all">
                        {item.preRestoreSnapshotFile}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accounting Invariance:</span>
                      <p className="font-bold text-emerald-600">
                        {item.invarianceValid ? "PASS (Balanced)" : "FLAGGED"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex gap-2">
                      {item.reportFileName && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(item.reportFileName!, "json")}
                            className="text-xs h-7 gap-1"
                          >
                            <Download className="h-3 w-3" />
                            JSON Report
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(item.reportFileName!, "html")}
                            className="text-xs h-7 gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            HTML Report
                          </Button>
                        </>
                      )}
                    </div>

                    {item.canRollback && item.result === "SUCCESS" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRollback(item)}
                        disabled={rollingBackId === item.restoreId}
                        className="text-xs h-7 gap-1 font-semibold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        {rollingBackId === item.restoreId ? "Rolling back..." : "Rollback to Pre-Restore State"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
