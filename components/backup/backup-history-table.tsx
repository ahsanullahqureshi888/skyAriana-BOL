"use client"

import React, { useState } from "react"
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  FileCheck2,
  PlayCircle,
  Shield,
  FileArchive,
  FolderOpen,
  Info,
  Copy,
  Check,
  HardDrive,
  Calendar,
  Layers,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { BackupItem, BackupType } from "@/lib/backup/backup-types"

interface BackupHistoryTableProps {
  backups: BackupItem[]
  onVerify: (backupId: string) => void
  onTestRestore: (backupId: string) => void
  onOpenRestoreWizard: (backup: BackupItem) => void
  onToggleProtect: (backupId: string, currentStatus: boolean) => void
  onDelete: (backupId: string) => void
  onDownload: (backup: BackupItem) => void
  verifyingId: string | null
  drillingId: string | null
}

export function BackupHistoryTable({
  backups,
  onVerify,
  onTestRestore,
  onOpenRestoreWizard,
  onToggleProtect,
  onDelete,
  onDownload,
  verifyingId,
  drillingId,
}: BackupHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [selectedDetailBackup, setSelectedDetailBackup] = useState<BackupItem | null>(null)
  const [deleteTargetBackup, setDeleteTargetBackup] = useState<BackupItem | null>(null)
  const [isOpeningFolder, setIsOpeningFolder] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success(`Copied ${label} to clipboard`)
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev))
    }, 2000)
  }

  const handleOpenFolder = async () => {
    setIsOpeningFolder(true)
    try {
      const res = await fetch("/api/backup/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_folder" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Folder Opened", {
          description: data.message || "Opened backup repository in File Explorer",
        })
      } else {
        toast.error("Failed to open folder", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Network error opening folder", { description: err.message })
    } finally {
      setIsOpeningFolder(false)
    }
  }

  // Default sort: Newest first (Requirement 91)
  const sorted = [...backups].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const filtered = sorted.filter((b) => {
    const matchesSearch =
      b.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.note || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.createdBy.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === "ALL" || b.type === selectedType
    return matchesSearch && matchesType
  })

  const getTypeBadge = (type: BackupType) => {
    switch (type) {
      case "FULL":
        return <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[9px] px-1.5 py-0 font-bold">FULL</Badge>
      case "PRE_RESTORE":
      case "PRE_RESTORE_SAFETY":
        return <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[9px] px-1.5 py-0 font-bold">PRE-RESTORE</Badge>
      case "PRE_REPAIR_SAFETY":
        return <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 font-bold">PRE-REPAIR</Badge>
      case "PRE_IMPORT":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold">PRE-IMPORT</Badge>
      case "EMERGENCY":
        return <Badge className="bg-rose-600 hover:bg-rose-600 text-white text-[9px] px-1.5 py-0 font-bold">EMERGENCY</Badge>
      default:
        return <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-semibold">{type}</Badge>
    }
  }

  return (
    <div className="bg-card border rounded-xl shadow-2xs overflow-hidden flex flex-col">
      {/* Search and Filters Bar */}
      <div className="p-2 sm:p-2.5 bg-muted/30 border-b flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by filename, note, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-7.5 bg-background shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-0.5" />
            {(["ALL", "FULL", "PRE_RESTORE_SAFETY", "PRE_IMPORT", "MANUAL"] as const).map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="text-[11px] h-7 px-2 font-medium shadow-2xs"
              >
                {type === "PRE_RESTORE_SAFETY" ? "SAFETY" : type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenFolder}
              disabled={isOpeningFolder}
              className="text-[11px] h-7 px-2.5 font-medium gap-1 shadow-2xs"
              title="Open backup folder in local File Explorer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">{isOpeningFolder ? "Opening..." : "Open Folder"}</span>
            </Button>
            <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap hidden lg:inline">
              ({filtered.length}/{backups.length})
            </span>
          </div>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW (hidden on mobile < md) */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-275px)] min-h-[380px] relative">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b text-muted-foreground font-semibold text-[11px] shadow-2xs">
            <tr>
              <th className="py-2 px-3 min-w-[240px] max-w-[320px]">Archive Package</th>
              <th className="py-2 px-2.5 w-[105px]">Type</th>
              <th className="py-2 px-2.5 w-[130px]">Created</th>
              <th className="py-2 px-2.5 w-[140px]">Records</th>
              <th className="py-2 px-2.5 w-[75px]">Size</th>
              <th className="py-2 px-2.5 w-[110px]">Verification</th>
              <th className="py-2 px-2 text-center w-[55px]">Locked</th>
              <th className="py-2 px-3 text-right w-[270px] min-w-[270px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <FileArchive className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No backup archives match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isVerifying = verifyingId === item.id
                const isDrilling = drillingId === item.id

                return (
                  <tr key={item.id} className="even:bg-muted/15 hover:bg-primary/5 transition-colors text-[11px]">
                    <td className="py-1.5 px-3 min-w-[240px] max-w-[320px]">
                      <div className="font-mono font-semibold text-foreground truncate" title={item.fileName}>
                        {item.fileName}
                      </div>
                      {item.note && (
                        <div className="text-[10px] text-muted-foreground truncate" title={item.note}>
                          {item.note}
                        </div>
                      )}
                    </td>

                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {getTypeBadge(item.type)}
                    </td>

                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        by {item.createdBy}
                      </div>
                    </td>

                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-foreground">
                          {item.recordCounts?.totalRecords || item.recordCounts?.bols || 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          (B: {item.recordCounts?.bols || 0}, I: {item.recordCounts?.invoices || 0})
                        </span>
                      </div>
                    </td>

                    <td className="py-1.5 px-2.5 whitespace-nowrap font-mono text-muted-foreground">
                      {formatBytes(item.fileSizeBytes)}
                    </td>

                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {item.verificationStatus === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle className="h-3.5 w-3.5" />
                          VERIFIED
                        </span>
                      ) : item.verificationStatus === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          <XCircle className="h-3.5 w-3.5" />
                          FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          UNVERIFIED
                        </span>
                      )}
                    </td>

                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleProtect(item.id, item.protected)}
                        className={`p-1 rounded hover:bg-muted transition-colors ${
                          item.protected ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-muted-foreground"
                        }`}
                        title={item.protected ? "Protected from deletion. Click to unlock." : "Click to protect from deletion."}
                      >
                        {item.protected ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                    </td>

                    <td className="py-1.5 px-3 text-right whitespace-nowrap w-[270px] min-w-[270px]">
                      <div className="flex items-center justify-end gap-1">
                        {/* Details Modal Trigger */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDetailBackup(item)}
                          className="h-6 px-1.5 text-[10px] font-medium gap-1 hover:bg-muted"
                          title="View complete backup manifest, record counts, and SHA-256 checksum"
                        >
                          <Info className="h-3 w-3 text-muted-foreground" />
                          Details
                        </Button>

                        {/* Deep Verify Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onVerify(item.id)}
                          disabled={isVerifying}
                          className="h-6 px-1.5 text-[10px] font-medium gap-1 hover:bg-primary/10"
                          title="Verify archive CRC32, checksums and schema integrity"
                        >
                          <FileCheck2 className={`h-3 w-3 ${isVerifying ? "animate-spin text-primary" : ""}`} />
                          {isVerifying ? "Verifying..." : "Verify"}
                        </Button>

                        {/* Sandbox Drill Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTestRestore(item.id)}
                          disabled={isDrilling}
                          className="h-6 px-1.5 text-[10px] font-medium gap-1 hover:bg-muted"
                          title="Run in-memory sandbox restore drill without modifying database"
                        >
                          <PlayCircle className={`h-3 w-3 ${isDrilling ? "animate-spin text-primary" : ""}`} />
                          {isDrilling ? "Drilling..." : "Drill"}
                        </Button>

                        {/* Safe Restore Wizard */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenRestoreWizard(item)}
                          className="h-6 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 gap-1 shadow-2xs"
                          title="Open safe multi-step restore wizard"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </Button>

                        {/* Download Archive */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(item)}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Download ZIP package"
                        >
                          <Download className="h-3 w-3" />
                        </Button>

                        {/* Safe Delete with Confirmation (Requirement 22) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (item.protected) {
                              toast.info("Protected Backup", {
                                description: "This backup is locked. Unlock it first before deleting.",
                              })
                              return
                            }
                            setDeleteTargetBackup(item)
                          }}
                          disabled={item.protected}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-20"
                          title={item.protected ? "Protected items cannot be deleted" : "Delete backup"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE RESPONSIVE CARD VIEW (< md viewports, Requirements 82 & 105) */}
      <div className="block md:hidden divide-y divide-border/60 max-h-[calc(100vh-275px)] overflow-y-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileArchive className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No backup archives match your filter.
          </div>
        ) : (
          filtered.map((item) => {
            const isVerifying = verifyingId === item.id
            const isDrilling = drillingId === item.id

            return (
              <div
                key={item.id}
                className="bg-card border rounded-lg p-3 space-y-2.5 shadow-2xs hover:border-primary/40 transition-colors"
              >
                {/* Header: Type, Protected, Date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getTypeBadge(item.type)}
                    <button
                      type="button"
                      onClick={() => onToggleProtect(item.id, item.protected)}
                      className={`p-0.5 rounded hover:bg-muted transition-colors ${
                        item.protected ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-muted-foreground"
                      }`}
                      title={item.protected ? "Protected. Click to unlock." : "Click to protect."}
                    >
                      {item.protected ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    {new Date(item.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Package Filename */}
                <div>
                  <div className="font-mono text-xs font-semibold text-foreground truncate" title={item.fileName}>
                    {item.fileName}
                  </div>
                  {item.note && (
                    <div className="text-[10px] text-muted-foreground truncate">{item.note}</div>
                  )}
                </div>

                {/* Metrics Badges: Records, Size, Verification */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="bg-muted px-2 py-0.5 rounded font-mono font-medium">
                    {item.recordCounts?.totalRecords || item.recordCounts?.bols || 0} records
                  </span>
                  <span className="bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                    {formatBytes(item.fileSizeBytes)}
                  </span>
                  {item.verificationStatus === "VERIFIED" ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle className="h-3 w-3" /> VERIFIED
                    </span>
                  ) : item.verificationStatus === "FAILED" ? (
                    <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold">
                      <XCircle className="h-3 w-3" /> FAILED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-slate-500 font-medium">
                      <AlertTriangle className="h-3 w-3" /> UNVERIFIED
                    </span>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-1">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDetailBackup(item)}
                      className="h-6 px-1.5 text-[10px] font-medium"
                    >
                      <Info className="h-3 w-3 mr-0.5 text-muted-foreground" />
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onVerify(item.id)}
                      disabled={isVerifying}
                      className="h-6 px-1.5 text-[10px]"
                    >
                      <FileCheck2 className={`h-3 w-3 ${isVerifying ? "animate-spin text-primary" : ""}`} />
                      Verify
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTestRestore(item.id)}
                      disabled={isDrilling}
                      className="h-6 px-1.5 text-[10px]"
                    >
                      <PlayCircle className={`h-3 w-3 ${isDrilling ? "animate-spin text-primary" : ""}`} />
                      Drill
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenRestoreWizard(item)}
                      className="h-6 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700"
                    >
                      <RotateCcw className="h-3 w-3 mr-0.5" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(item)}
                      className="h-6 w-6 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (item.protected) {
                          toast.info("Protected Backup", {
                            description: "Unlock this backup first before deleting.",
                          })
                          return
                        }
                        setDeleteTargetBackup(item)
                      }}
                      disabled={item.protected}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive disabled:opacity-20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* DETAILS MODAL */}
      <Dialog open={selectedDetailBackup !== null} onOpenChange={(open) => !open && setSelectedDetailBackup(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              Backup Package Manifest & Integrity Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cryptographic verification, storage topology, and record breakdown for this archive package.
            </DialogDescription>
          </DialogHeader>

          {selectedDetailBackup && (
            <div className="space-y-4 text-xs py-1">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-muted/40 rounded-lg border">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Type</span>
                  <div className="mt-0.5">{getTypeBadge(selectedDetailBackup.type)}</div>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-lg border">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Size</span>
                  <div className="font-mono font-bold text-foreground mt-0.5">
                    {formatBytes(selectedDetailBackup.fileSizeBytes)}
                  </div>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-lg border">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Status</span>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    {selectedDetailBackup.verificationStatus === "VERIFIED" ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Unverified
                      </>
                    )}
                  </div>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-lg border">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Lock State</span>
                  <div className="font-semibold mt-0.5 flex items-center gap-1 text-foreground">
                    {selectedDetailBackup.protected ? (
                      <>
                        <Lock className="h-3.5 w-3.5 text-indigo-500" />
                        Protected
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5 opacity-40" />
                        Unprotected
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Package Filename & Note */}
              <div className="p-3 bg-muted/20 border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground text-[11px]">ARCHIVE PACKAGE NAME</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedDetailBackup.fileName, "fileName", "filename")}
                    className="h-6 px-1.5 text-[10px] gap-1"
                  >
                    {copiedKey === "fileName" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
                <div className="font-mono text-xs font-bold text-foreground break-all">
                  {selectedDetailBackup.fileName}
                </div>
                {selectedDetailBackup.note && (
                  <p className="text-[11px] text-muted-foreground italic">{selectedDetailBackup.note}</p>
                )}
              </div>

              {/* Record Counts Breakdown */}
              <div className="space-y-1.5">
                <span className="font-bold text-muted-foreground text-[11px] block">RECORD COUNTS BREAKDOWN</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Total Records</span>
                    <p className="font-mono font-bold text-base text-foreground">
                      {selectedDetailBackup.recordCounts?.totalRecords || selectedDetailBackup.recordCounts?.bols || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Bills of Lading</span>
                    <p className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                      {selectedDetailBackup.recordCounts?.bols || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Invoices</span>
                    <p className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                      {selectedDetailBackup.recordCounts?.invoices || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Ledger Entries</span>
                    <p className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                      {selectedDetailBackup.recordCounts?.ledgerEntries || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Shipments</span>
                    <p className="font-mono font-bold text-sm text-foreground">
                      {selectedDetailBackup.recordCounts?.shipments || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Accounts</span>
                    <p className="font-mono font-bold text-sm text-foreground">
                      {selectedDetailBackup.recordCounts?.accounts || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Companies</span>
                    <p className="font-mono font-bold text-sm text-foreground">
                      {selectedDetailBackup.recordCounts?.companies || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-background border rounded-lg">
                    <span className="text-muted-foreground text-[10px]">Documents</span>
                    <p className="font-mono font-bold text-sm text-foreground">
                      {selectedDetailBackup.recordCounts?.documents || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cryptographic SHA-256 Checksum */}
              <div className="p-3 bg-muted/20 border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground text-[11px] flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    SHA-256 CRYPTOGRAPHIC CHECKSUM
                  </span>
                  {selectedDetailBackup.checksum && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedDetailBackup.checksum, "checksum", "checksum")}
                      className="h-6 px-1.5 text-[10px] gap-1"
                    >
                      {copiedKey === "checksum" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      Copy
                    </Button>
                  )}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground break-all bg-background p-2 rounded border">
                  {selectedDetailBackup.checksum || "Available upon archive generation"}
                </div>
              </div>

              {/* Disk File Path */}
              <div className="p-3 bg-muted/20 border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground text-[11px] flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    FILE PATH ON DISK
                  </span>
                  {selectedDetailBackup.filePath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedDetailBackup.filePath, "filePath", "file path")}
                      className="h-6 px-1.5 text-[10px] gap-1"
                    >
                      {copiedKey === "filePath" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      Copy
                    </Button>
                  )}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground break-all bg-background p-2 rounded border">
                  {selectedDetailBackup.filePath}
                </div>
              </div>

              {/* Creator & Timestamps */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground bg-muted/10 p-2.5 rounded-lg border">
                <div>
                  <span className="font-bold block">Created:</span>
                  {new Date(selectedDetailBackup.createdAt).toLocaleString()} by {selectedDetailBackup.createdBy}
                </div>
                <div>
                  <span className="font-bold block">Engine Version:</span>
                  App v{selectedDetailBackup.appVersion || "5.2.0"} (Schema: {selectedDetailBackup.schemaVersion || 2})
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFolder}
                disabled={isOpeningFolder}
                className="text-xs gap-1"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {isOpeningFolder ? "Opening..." : "Open Folder"}
              </Button>
              {selectedDetailBackup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(selectedDetailBackup)}
                  className="text-xs gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedDetailBackup && (
                <Button
                  size="sm"
                  onClick={() => {
                    const item = selectedDetailBackup
                    setSelectedDetailBackup(null)
                    onOpenRestoreWizard(item)
                  }}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Wizard
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedDetailBackup(null)} className="text-xs">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAFE DELETE CONFIRMATION DIALOG (Requirement 22) */}
      <Dialog open={deleteTargetBackup !== null} onOpenChange={(open) => !open && setDeleteTargetBackup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm Permanent Archive Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action permanently deletes the backup package from disk and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTargetBackup && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                <span className="font-bold text-destructive text-[11px] block">BACKUP PACKAGE TO DELETE</span>
                <p className="font-mono font-bold text-foreground break-all">{deleteTargetBackup.fileName}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                  <span>Size: {formatBytes(deleteTargetBackup.fileSizeBytes)}</span>
                  <span>·</span>
                  <span>
                    Created:{" "}
                    {new Date(deleteTargetBackup.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  All database tables and attachments saved within this archive file will be permanently removed.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTargetBackup(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTargetBackup) {
                  const id = deleteTargetBackup.id
                  setDeleteTargetBackup(null)
                  onDelete(id)
                }
              }}
              className="text-xs font-bold gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
