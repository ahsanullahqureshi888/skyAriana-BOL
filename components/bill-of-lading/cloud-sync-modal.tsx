"use client"

import { useState, useEffect } from "react"
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
import {
  Cloud,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Share2,
  QrCode,
  Download,
  Upload,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

interface CloudSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSyncComplete?: () => void
}

export function CloudSyncModal({ open, onOpenChange, onSyncComplete }: CloudSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "download" | "code">("upload")
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [syncCode, setSyncCode] = useState<string>("")
  const [inputCode, setInputCode] = useState<string>("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [localDocCount, setLocalDocCount] = useState<number>(0)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      try {
        const raw1 = window.localStorage.getItem("skybol:saved-documents")
        const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
        const docs1 = raw1 ? JSON.parse(raw1) : []
        const docs2 = raw2 ? JSON.parse(raw2) : []
        const map = new Map<string, any>()
        for (const d of [...docs1, ...docs2]) {
          const k = d.bol_number || d.id
          if (k) map.set(k, d)
        }
        setLocalDocCount(map.size)
      } catch (e) {
        setLocalDocCount(0)
      }
    }
  }, [open])

  // 1. Upload all local BOLs, accounts, and ledgers to cloud
  const handleUploadAllToCloud = async () => {
    setIsUploading(true)
    const toastId = toast.loading("Uploading all BOL documents to Cloud...")

    try {
      let localDocs: any[] = []
      let customCompanies: string[] = []
      let storedLedgerRecords: Record<string, any[]> = {}
      let companySettings: any = null
      let routePresets: any[] = []
      let savedShippers: any[] = []
      let savedConsignees: any[] = []
      let savedNotifyParties: any[] = []

      try {
        const raw1 = window.localStorage.getItem("skybol:saved-documents")
        const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
        const docs1 = raw1 ? JSON.parse(raw1) : []
        const docs2 = raw2 ? JSON.parse(raw2) : []
        const map = new Map<string, any>()
        for (const d of [...docs1, ...docs2]) {
          const k = d.bol_number || d.id
          if (k) map.set(k, d)
        }
        localDocs = Array.from(map.values())

        const cRaw = window.localStorage.getItem("skybol:account-custom-companies")
        customCompanies = cRaw ? JSON.parse(cRaw) : []

        const lRaw = window.localStorage.getItem("skybol:account-ledgers")
        storedLedgerRecords = lRaw ? JSON.parse(lRaw) : {}

        const csRaw = window.localStorage.getItem("skybol:company-settings") || window.localStorage.getItem("skybol:pdf-company-settings")
        companySettings = csRaw ? JSON.parse(csRaw) : null

        const rpRaw = window.localStorage.getItem("skybol:saved-route-presets")
        routePresets = rpRaw ? JSON.parse(rpRaw) : []

        const shRaw = window.localStorage.getItem("skybol:saved-shippers")
        savedShippers = shRaw ? JSON.parse(shRaw) : []

        const coRaw = window.localStorage.getItem("skybol:saved-consignees")
        savedConsignees = coRaw ? JSON.parse(coRaw) : []

        const noRaw = window.localStorage.getItem("skybol:saved-notify-parties")
        savedNotifyParties = noRaw ? JSON.parse(noRaw) : []
      } catch (e) {}

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: localDocs,
          accounts: customCompanies,
          ledgerRecords: storedLedgerRecords,
          companySettings,
          routePresets,
          savedShippers,
          savedConsignees,
          savedNotifyParties,
        }),
      })

      if (!res.ok) {
        throw new Error("Cloud upload response error")
      }

      const result = await res.json()
      if (result.success) {
        setSyncCode(result.syncCode || "SKY-DONE")
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
        toast.success(`Successfully uploaded ${localDocs.length} BOL documents to Cloud! 🚀`, {
          id: toastId,
          description: `Sync Code: ${result.syncCode}. Use this code on any device to transfer instantly.`,
        })
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      toast.error("Failed to upload to Cloud", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please check internet connection",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 2. Download and merge all cloud BOLs & ledgers into current device
  const handleDownloadAllFromCloud = async (codeToUse?: string) => {
    setIsDownloading(true)
    const targetCode = codeToUse || inputCode.trim()
    const toastId = toast.loading(targetCode ? `Fetching data for code ${targetCode}...` : "Downloading all BOL documents from Cloud...")

    try {
      const url = targetCode ? `/api/sync?code=${encodeURIComponent(targetCode)}` : "/api/sync"
      const res = await fetch(url)

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Server responded with status ${res.status}`)
      }

      const body = await res.json()
      const data = body.data || body

      let restoredDocsCount = 0

      // Merge documents into localStorage
      if (Array.isArray(data.documents) && data.documents.length > 0) {
        const storedLocal1 = window.localStorage.getItem("sky-bol-browser-documents")
        const storedLocal2 = window.localStorage.getItem("skybol:saved-documents")
        const list1: any[] = storedLocal1 ? JSON.parse(storedLocal1) : []
        const list2: any[] = storedLocal2 ? JSON.parse(storedLocal2) : []

        const mergedMap = new Map<string, any>()
        for (const d of data.documents) {
          const k = d.bol_number || d.id
          if (k) mergedMap.set(k, d)
        }
        for (const d of [...list1, ...list2]) {
          const k = d.bol_number || d.id
          if (k && !mergedMap.has(k)) mergedMap.set(k, d)
        }

        const allMerged = Array.from(mergedMap.values())
        window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(allMerged))
        window.localStorage.setItem("skybol:saved-documents", JSON.stringify(allMerged))
        restoredDocsCount = allMerged.length
        setLocalDocCount(restoredDocsCount)
      }

      // Merge accounts & custom companies
      if (Array.isArray(data.customCompanies || data.accounts)) {
        const incomingComps = (data.customCompanies || data.accounts) as string[]
        const rawComp = window.localStorage.getItem("skybol:account-custom-companies")
        const currentComp = rawComp ? JSON.parse(rawComp) : []
        const nextComp = Array.from(new Set([...currentComp, ...incomingComps]))
        window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(nextComp))
      }

      // Merge ledger records
      if (data.ledgerRecords && typeof data.ledgerRecords === "object") {
        const rawLedger = window.localStorage.getItem("skybol:account-ledgers")
        const currentLedger = rawLedger ? JSON.parse(rawLedger) : {}
        const nextLedger = { ...currentLedger, ...data.ledgerRecords }
        window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(nextLedger))
      }

      // Restore presets and settings if present
      if (data.companySettings) {
        window.localStorage.setItem("skybol:company-settings", JSON.stringify(data.companySettings))
        window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(data.companySettings))
      }
      if (Array.isArray(data.routePresets) && data.routePresets.length > 0) {
        window.localStorage.setItem("skybol:saved-route-presets", JSON.stringify(data.routePresets))
      }
      if (Array.isArray(data.savedShippers) && data.savedShippers.length > 0) {
        window.localStorage.setItem("skybol:saved-shippers", JSON.stringify(data.savedShippers))
      }
      if (Array.isArray(data.savedConsignees) && data.savedConsignees.length > 0) {
        window.localStorage.setItem("skybol:saved-consignees", JSON.stringify(data.savedConsignees))
      }
      if (Array.isArray(data.savedNotifyParties) && data.savedNotifyParties.length > 0) {
        window.localStorage.setItem("skybol:saved-notify-parties", JSON.stringify(data.savedNotifyParties))
      }

      // Dispatch global events to refresh all views
      window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
      window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))

      toast.success(`Successfully synchronized ${restoredDocsCount || data.documents?.length || 0} BOLs on this device! 🎉`, {
        id: toastId,
      })

      if (onSyncComplete) onSyncComplete()
    } catch (error) {
      toast.error("Sync download failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Could not fetch documents",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // 3. Export Full JSON Backup
  const handleExportFullBackup = () => {
    try {
      const raw1 = window.localStorage.getItem("skybol:saved-documents")
      const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
      const docs1 = raw1 ? JSON.parse(raw1) : []
      const docs2 = raw2 ? JSON.parse(raw2) : []
      const map = new Map<string, any>()
      for (const d of [...docs1, ...docs2]) {
        const k = d.bol_number || d.id
        if (k) map.set(k, d)
      }
      const allDocs = Array.from(map.values())

      const backup = {
        app: "SKY_ARIANA_LOGISTICS",
        version: "3.2.0",
        exportedAt: new Date().toISOString(),
        totalDocuments: allDocs.length,
        savedDocuments: allDocs,
        customCompanies: JSON.parse(window.localStorage.getItem("skybol:account-custom-companies") || "[]"),
        accountLedgers: JSON.parse(window.localStorage.getItem("skybol:account-ledgers") || "{}"),
        companySettings: JSON.parse(window.localStorage.getItem("skybol:company-settings") || "{}"),
        routePresets: JSON.parse(window.localStorage.getItem("skybol:saved-route-presets") || "[]"),
        savedShippers: JSON.parse(window.localStorage.getItem("skybol:saved-shippers") || "[]"),
        savedConsignees: JSON.parse(window.localStorage.getItem("skybol:saved-consignees") || "[]"),
        savedNotifyParties: JSON.parse(window.localStorage.getItem("skybol:saved-notify-parties") || "[]"),
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sky_ariana_full_backup_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Full Backup (${allDocs.length} BOLs) downloaded successfully! 💾`)
    } catch (e) {
      toast.error("Failed to export backup")
    }
  }

  // 4. Restore Full JSON Backup File
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content)

        if (Array.isArray(parsed.savedDocuments)) {
          window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(parsed.savedDocuments))
          window.localStorage.setItem("skybol:saved-documents", JSON.stringify(parsed.savedDocuments))
        }
        if (Array.isArray(parsed.customCompanies)) {
          window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(parsed.customCompanies))
        }
        if (parsed.accountLedgers) {
          window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(parsed.accountLedgers))
        }
        if (parsed.companySettings) {
          window.localStorage.setItem("skybol:company-settings", JSON.stringify(parsed.companySettings))
          window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(parsed.companySettings))
        }
        if (Array.isArray(parsed.routePresets)) {
          window.localStorage.setItem("skybol:saved-route-presets", JSON.stringify(parsed.routePresets))
        }
        if (Array.isArray(parsed.savedShippers)) {
          window.localStorage.setItem("skybol:saved-shippers", JSON.stringify(parsed.savedShippers))
        }
        if (Array.isArray(parsed.savedConsignees)) {
          window.localStorage.setItem("skybol:saved-consignees", JSON.stringify(parsed.savedConsignees))
        }
        if (Array.isArray(parsed.savedNotifyParties)) {
          window.localStorage.setItem("skybol:saved-notify-parties", JSON.stringify(parsed.savedNotifyParties))
        }

        window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
        window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))

        toast.success("Backup Restored Successfully! 🎉", {
          description: `Loaded ${parsed.savedDocuments?.length || 0} documents into this device.`,
        })

        if (onSyncComplete) onSyncComplete()
        onOpenChange(false)
      } catch (err) {
        toast.error("Invalid Backup File format")
      }
    }
    reader.readAsText(file)
  }

  const copySyncCode = () => {
    if (!syncCode) return
    navigator.clipboard.writeText(syncCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2500)
    toast.success("Sync code copied to clipboard!")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-xl rounded-3xl border-blue-200 shadow-2xl p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/25">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>Multi-Device Cloud Sync Hub</span>
                <span className="text-xs font-bold text-amber-700 font-[vazirmatn]">/ همگام‌سازی ابری</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-semibold">
                Sync all BOLs, accounts, and ledgers between PC, Phone, and other browsers seamlessly.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "upload"
                ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
            <span>Upload to Cloud</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("download")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "download"
                ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DownloadCloud className="h-3.5 w-3.5 text-emerald-600" />
            <span>Download & Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "code"
                ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="h-3.5 w-3.5 text-purple-600" />
            <span>Sync Code / کد</span>
          </button>
        </div>

        {/* Tab 1: Upload */}
        {activeTab === "upload" && (
          <div className="space-y-4 py-3 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-linear-to-br from-blue-50/90 to-indigo-50/80 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-950">Local Documents Found</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-2xs">
                  {localDocCount} BOLs
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Push all your currently saved {localDocCount} Bills of Lading, client ledgers, and company settings to the cloud so all other devices can access them.
              </p>
            </div>

            <Button
              onClick={handleUploadAllToCloud}
              disabled={isUploading}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer gap-2"
            >
              {isUploading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4 text-amber-400" />
              )}
              <span>{isUploading ? "Uploading to Cloud..." : `Upload All (${localDocCount}) BOLs to Cloud / آپلود به سرور`}</span>
            </Button>

            {syncCode && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Upload Successful! Your 6-Digit Transfer Code:</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{lastSyncTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-2 px-3 bg-white rounded-xl border border-emerald-300 font-mono text-center text-lg font-black tracking-widest text-emerald-950 shadow-inner">
                    {syncCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copySyncCode}
                    className="h-10 rounded-xl border-emerald-300 bg-white font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCode ? "Copied!" : "Copy"}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  💡 On your phone or another device, open this modal, go to <strong>Sync Code</strong>, and enter <strong>{syncCode}</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Download */}
        {activeTab === "download" && (
          <div className="space-y-4 py-3 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950">Receive Cloud Documents</span>
              <p className="text-xs text-slate-600 font-medium">
                Fetch and merge all latest BOLs, ledgers, and accounts from the cloud server into this device.
              </p>
            </div>

            <Button
              onClick={() => handleDownloadAllFromCloud()}
              disabled={isDownloading}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer gap-2"
            >
              {isDownloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloud className="h-4 w-4 text-white" />
              )}
              <span>{isDownloading ? "Downloading & Merging..." : "Download & Sync All Documents on This Device"}</span>
            </Button>
          </div>
        )}

        {/* Tab 3: Code Transfer */}
        {activeTab === "code" && (
          <div className="space-y-4 py-3 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-purple-50/90 border border-purple-200/80 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-950">Transfer via 6-Digit Code</span>
              <p className="text-xs text-slate-600 font-medium">
                Enter the transfer code generated from your main computer to instantly sync all 58 BOLs and ledgers here.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Enter Sync Code (e.g. SKY-5821)</label>
              <div className="flex gap-2">
                <Input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="SKY-XXXX"
                  className="font-mono text-center font-black tracking-wider text-base uppercase bg-white border-slate-300 rounded-xl h-11"
                  maxLength={10}
                />
                <Button
                  onClick={() => handleDownloadAllFromCloud(inputCode)}
                  disabled={isDownloading || !inputCode.trim()}
                  className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shrink-0 cursor-pointer"
                >
                  {isDownloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Transfer Now"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom File Backup Quick Actions */}
        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportFullBackup}
              className="h-8.5 rounded-xl border-slate-200 font-bold text-[11px] gap-1.5 cursor-pointer hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Save Backup File (.json)</span>
            </Button>
            <label className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-xl border border-slate-200 bg-white font-bold text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs">
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Restore File</span>
              <input type="file" accept=".json" onChange={handleImportBackupFile} className="hidden" />
            </label>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
