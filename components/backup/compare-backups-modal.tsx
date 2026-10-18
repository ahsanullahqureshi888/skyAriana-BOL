"use client"

import React, { useState } from "react"
import { Scale, ArrowRight, CheckCircle2, Minus, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BackupItem, BackupRecordCounts } from "@/lib/backup/backup-types"

interface CompareBackupsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  backups: BackupItem[]
}

export function CompareBackupsModal({ open, onOpenChange, backups }: CompareBackupsModalProps) {
  const [backupAId, setBackupAId] = useState<string>(backups[1]?.id || backups[0]?.id || "")
  const [backupBId, setBackupBId] = useState<string>(backups[0]?.id || "")

  const backupA = backups.find((b) => b.id === backupAId)
  const backupB = backups.find((b) => b.id === backupBId)

  const diffCounts = (key: keyof BackupRecordCounts): number => {
    const valA = backupA?.recordCounts?.[key] ?? 0
    const valB = backupB?.recordCounts?.[key] ?? 0
    return valB - valA
  }

  const renderDiffBadge = (diff: number) => {
    if (diff > 0) {
      return (
        <span className="text-emerald-500 font-bold flex items-center gap-0.5">
          <Plus className="h-3 w-3" />
          {diff.toLocaleString()}
        </span>
      )
    }
    if (diff < 0) {
      return (
        <span className="text-red-500 font-bold flex items-center gap-0.5">
          <Minus className="h-3 w-3" />
          {Math.abs(diff).toLocaleString()}
        </span>
      )
    }
    return <span className="text-muted-foreground font-medium">0</span>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              <Scale className="h-3.5 w-3.5 mr-1" />
              Backup Comparison Tool
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold">Compare Backups</DialogTitle>
          <DialogDescription className="text-xs">
            Compare record counts, schema versions, and financial totals between any two historical backup points.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">Baseline Backup (Earlier):</label>
              <Select value={backupAId} onValueChange={setBackupAId}>
                <SelectTrigger className="text-xs truncate font-mono">
                  <SelectValue placeholder="Select Backup A" />
                </SelectTrigger>
                <SelectContent>
                  {backups.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.fileName} ({new Date(b.createdAt).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">Target Backup (Later):</label>
              <Select value={backupBId} onValueChange={setBackupBId}>
                <SelectTrigger className="text-xs truncate font-mono">
                  <SelectValue placeholder="Select Backup B" />
                </SelectTrigger>
                <SelectContent>
                  {backups.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.fileName} ({new Date(b.createdAt).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Table */}
          {backupA && backupB && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/70 border-b">
                    <th className="p-2.5 font-semibold text-muted-foreground">Entity Module</th>
                    <th className="p-2.5 font-semibold text-muted-foreground text-right font-mono truncate max-w-[140px]">
                      {backupA.fileName.slice(0, 18)}...
                    </th>
                    <th className="p-2.5 font-semibold text-muted-foreground text-right font-mono truncate max-w-[140px]">
                      {backupB.fileName.slice(0, 18)}...
                    </th>
                    <th className="p-2.5 font-semibold text-muted-foreground text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2.5 font-medium">Bills of Lading (BOLs)</td>
                    <td className="p-2.5 text-right font-mono">{backupA.recordCounts?.bols ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{backupB.recordCounts?.bols ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{renderDiffBadge(diffCounts("bols"))}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Companies & Shippers</td>
                    <td className="p-2.5 text-right font-mono">{backupA.recordCounts?.companies ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{backupB.recordCounts?.companies ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{renderDiffBadge(diffCounts("companies"))}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Chart of Accounts</td>
                    <td className="p-2.5 text-right font-mono">{backupA.recordCounts?.accounts ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{backupB.recordCounts?.accounts ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{renderDiffBadge(diffCounts("accounts"))}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Ledger Transactions</td>
                    <td className="p-2.5 text-right font-mono">{backupA.recordCounts?.ledgerEntries ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{backupB.recordCounts?.ledgerEntries ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{renderDiffBadge(diffCounts("ledgerEntries"))}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Commercial Invoices</td>
                    <td className="p-2.5 text-right font-mono">{backupA.recordCounts?.invoices ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{backupB.recordCounts?.invoices ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{renderDiffBadge(diffCounts("invoices"))}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Document Attachments</td>
                    <td className="p-2.5 text-right font-mono">{backupA.recordCounts?.documents ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{backupB.recordCounts?.documents ?? 0}</td>
                    <td className="p-2.5 text-right font-mono">{renderDiffBadge(diffCounts("documents"))}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-2.5 font-bold">Total Storage Size</td>
                    <td className="p-2.5 text-right font-mono">
                      {((backupA.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {((backupB.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {(((backupB.fileSizeBytes || 0) - (backupA.fileSizeBytes || 0)) / (1024 * 1024)).toFixed(2)} MB
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Comparison
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
