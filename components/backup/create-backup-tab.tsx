"use client"

import React, { useState } from "react"
import {
  Sparkles,
  Database,
  FileText,
  DollarSign,
  Truck,
  Settings,
  Sliders,
  CheckCircle2,
  Copy,
  Download,
  ShieldCheck,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  FileArchive,
  FileCode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import type { AQBackupType, AQBackupExtension } from "@/lib/backup/backup-format"

interface CreateBackupTabProps {
  onBackupCreated: () => void
}

export function CreateBackupTab({ onBackupCreated }: CreateBackupTabProps) {
  const [backupType, setBackupType] = useState<AQBackupType>("full")
  const [backupFormat, setBackupFormat] = useState<AQBackupExtension>("json")
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const [isProtected, setIsProtected] = useState(false)
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReverifying, setIsReverifying] = useState(false)
  const [isOpeningFolder, setIsOpeningFolder] = useState(false)

  // Custom module selection
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "bols",
    "shipments",
    "accounts",
    "companies",
    "invoices",
    "accountLedgers",
  ])

  // Last creation result card
  const [lastResult, setLastResult] = useState<any | null>(null)

  const handleModuleToggle = (mod: string) => {
    if (selectedModules.includes(mod)) {
      setSelectedModules(selectedModules.filter((m) => m !== mod))
    } else {
      setSelectedModules([...selectedModules, mod])
    }
  }

  const handleCreate = async (overrideType?: AQBackupType) => {
    const finalType = overrideType || backupType
    setIsSubmitting(true)
    setLastResult(null)

    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: finalType,
          format: backupFormat,
          includeAttachments: backupFormat === "zip" && includeAttachments,
          protected: isProtected,
          note,
          actor: "Admin User",
          selectedModules: finalType === "custom" ? selectedModules : undefined,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setLastResult(json)
        toast.success("Backup Completed & Verified", {
          description: `Backup ${json.backup.fileName} was created and passed SHA-256 validation.`,
        })
        onBackupCreated()
      } else {
        toast.error("Backup Failed", {
          description: json.error || "Failed to create backup package",
        })
      }
    } catch (err: any) {
      toast.error("Network Error", {
        description: err.message || "Failed to contact backup server",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard", { description: text })
  }

  const handleOpenFolder = async (filePath: string) => {
    setIsOpeningFolder(true)
    try {
      const res = await fetch("/api/backup/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_folder", filePath }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Folder Opened in Explorer", {
          description: data.openedFolder,
        })
      } else {
        toast.error("Could not open folder", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Error opening folder", { description: err.message })
    } finally {
      setIsOpeningFolder(false)
    }
  }

  const handleVerifyAgain = async (backupId: string) => {
    setIsReverifying(true)
    try {
      const res = await fetch("/api/backup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Re-Verification: PASS", {
          description: "Checksum and all database stores validated 100%.",
        })
      } else {
        toast.error("Re-Verification Failed", { description: data.error })
      }
    } catch (err: any) {
      toast.error("Verification Error", { description: err.message })
    } finally {
      setIsReverifying(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Primary Action Hero Card */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Create New Verified Backup
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Backups are written atomically to a temporary file, validated with SHA-256, and verified before completion.
              </CardDescription>
            </div>
            <Button
              size="lg"
              onClick={() => handleCreate("full")}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 shadow-md gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isSubmitting ? "Creating & Validating..." : "Create Full Backup"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-5">
          {/* Secondary Backup Types */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Backup Scope / Type
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setBackupType("full")}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  backupType === "full"
                    ? "border-emerald-600 bg-emerald-500/10 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Database className="h-4 w-4 text-emerald-600 mb-2" />
                <div>
                  <div className="font-bold text-xs">Full Backup</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">All tables & attachments</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackupType("data_only")}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  backupType === "data_only"
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <FileCode className="h-4 w-4 text-primary mb-2" />
                <div>
                  <div className="font-bold text-xs">Data Only</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Database records only</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackupType("bol_logistics_only")}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  backupType === "bol_logistics_only"
                    ? "border-blue-600 bg-blue-500/10 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Truck className="h-4 w-4 text-blue-600 mb-2" />
                <div>
                  <div className="font-bold text-xs">BOL / Logistics</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">BOLs, Cargo, Trucks</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackupType("accounting_only")}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  backupType === "accounting_only"
                    ? "border-amber-600 bg-amber-500/10 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <DollarSign className="h-4 w-4 text-amber-600 mb-2" />
                <div>
                  <div className="font-bold text-xs">Accounting Only</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Ledgers, Invoices, Cash</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackupType("documents_only")}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  backupType === "documents_only"
                    ? "border-indigo-600 bg-indigo-500/10 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <FileText className="h-4 w-4 text-indigo-600 mb-2" />
                <div>
                  <div className="font-bold text-xs">Documents Only</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">PDFs & compliance files</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackupType("custom")}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  backupType === "custom"
                    ? "border-purple-600 bg-purple-500/10 shadow-xs"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Sliders className="h-4 w-4 text-purple-600 mb-2" />
                <div>
                  <div className="font-bold text-xs">Custom Selection</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Choose modules</div>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Selection Options (when custom is selected) */}
          {backupType === "custom" && (
            <div className="p-4 bg-muted/40 rounded-lg border space-y-3">
              <Label className="text-xs font-semibold">Select Modules to Include in Backup:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: "bols", label: "Bills of Lading (BOLs)" },
                  { id: "shipments", label: "Shipments & Tracking" },
                  { id: "accounts", label: "Accounts & Master Entities" },
                  { id: "accountLedgers", label: "Financial Ledgers" },
                  { id: "invoices", label: "Invoices & Receipts" },
                  { id: "containerBookings", label: "Container Bookings" },
                  { id: "shipmentDocuments", label: "Saved Document Metadata" },
                  { id: "settings", label: "Application & BOL Settings" },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-2 bg-background rounded border cursor-pointer hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={selectedModules.includes(item.id)}
                      onCheckedChange={() => handleModuleToggle(item.id)}
                    />
                    <span className="font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Format and Storage Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            {/* Format Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Backup File Format
              </Label>
              <RadioGroup
                value={backupFormat}
                onValueChange={(val) => setBackupFormat(val as AQBackupExtension)}
                className="grid grid-cols-2 gap-2"
              >
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    backupFormat === "json" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setBackupFormat("json")}
                >
                  <RadioGroupItem value="json" id="fmt-json" />
                  <div>
                    <Label htmlFor="fmt-json" className="font-bold text-xs cursor-pointer">
                      Single JSON (.json)
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Fast, self-contained, human-readable envelope. Perfect for offsite backups.
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    backupFormat === "zip" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setBackupFormat("zip")}
                >
                  <RadioGroupItem value="zip" id="fmt-zip" />
                  <div>
                    <Label htmlFor="fmt-zip" className="font-bold text-xs cursor-pointer">
                      ZIP Container (.zip)
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Includes PDF attachments, manifest, and binary document files.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Note & Protection */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="backup-note" className="text-xs font-semibold">
                  Backup Note / Reference (Optional)
                </Label>
                <Input
                  id="backup-note"
                  placeholder="e.g. Pre-close month end / audit snapshot"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <Checkbox checked={isProtected} onCheckedChange={(c) => setIsProtected(Boolean(c))} />
                  <span className="font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Protect from automatic retention pruning
                  </span>
                </label>

                {backupFormat === "zip" && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <Checkbox
                      checked={includeAttachments}
                      onCheckedChange={(c) => setIncludeAttachments(Boolean(c))}
                    />
                    <span>Include PDF Attachments</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Trigger Customized Backup Button */}
          {backupType !== "full" && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleCreate()}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
              >
                {isSubmitting ? "Creating..." : `Create ${backupType.replace(/_/g, " ").toUpperCase()} Backup`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Result Card (Shown after successful creation) */}
      {lastResult && lastResult.backup && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm animate-in fade-in-50">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Backup Completed & Verified
              </CardTitle>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                Verification: PASS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background p-3 rounded-lg border">
              <div>
                <span className="text-muted-foreground">Backup ID:</span>
                <p className="font-mono font-bold text-foreground truncate">{lastResult.backup.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Filename:</span>
                <p className="font-mono font-medium text-foreground truncate">{lastResult.backup.fileName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">File Size:</span>
                <p className="font-bold text-foreground">
                  {(lastResult.backup.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Completeness Score:</span>
                <p className="font-bold text-emerald-600">
                  {lastResult.completenessScore ?? 100}% Integrity
                </p>
              </div>
            </div>

            {/* Record Counts Summary */}
            {lastResult.backup.recordCounts && (
              <div className="text-xs space-y-1">
                <span className="font-semibold text-muted-foreground">Recorded Counts:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="bg-background">
                    BOLs: {lastResult.backup.recordCounts.bols}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Shipments: {lastResult.backup.recordCounts.shipments}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Accounts: {lastResult.backup.recordCounts.accounts}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Invoices: {lastResult.backup.recordCounts.invoices}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Ledger Entries: {lastResult.backup.recordCounts.ledgerEntries}
                  </Badge>
                </div>
              </div>
            )}

            {/* Checksum & Path */}
            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground font-semibold">SHA-256 Checksum:</span>
              <p className="font-mono bg-muted/60 p-2 rounded text-[11px] break-all select-all">
                {lastResult.backup.checksum}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenFolder(lastResult.backup.filePath)}
                disabled={isOpeningFolder}
                className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {isOpeningFolder ? "Opening..." : "Open Folder"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(lastResult.backup.filePath)}
                className="gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy File Path
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleVerifyAgain(lastResult.backup.id)}
                disabled={isReverifying}
                className="gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isReverifying ? "animate-spin" : ""}`} />
                {isReverifying ? "Verifying..." : "Verify Again"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`/api/backup/download?id=${encodeURIComponent(lastResult.backup.id)}`, "_blank")
                }
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
