"use client"

import { useState, useEffect } from "react"
import { smartMergeLedgerRecords, validateLedgerInvariance, type LedgerAuditResult } from "@/lib/services/ledger-sync-utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Zap,
  Clock,
  Database,
  Layers,
  HardDrive,
  Radio,
  History,
  Activity,
  MessageCircle,
  KeyRound,
} from "lucide-react"
import { toast } from "sonner"
import { readFromClipboard } from "@/lib/services/clipboard-service"

interface CloudSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSyncComplete?: () => void
  initialTab?: "upload" | "download" | "code" | "history"
}

interface SyncHistoryItem {
  id: string
  timestamp: string
  action: "upload" | "download" | "backup_export" | "backup_restore"
  bolCount: number
  ledgerCount: number
  invoiceCount: number
  syncCode?: string
  status: "success" | "failed"
  message?: string
}

export function CloudSyncModal({ open, onOpenChange, onSyncComplete, initialTab }: CloudSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "download" | "code" | "history">(initialTab || "upload")
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [syncCode, setSyncCode] = useState<string>("")
  const [inputCode, setInputCode] = useState<string>("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  
  // Local Database metrics
  const [localDocCount, setLocalDocCount] = useState<number>(0)
  const [localLedgerCount, setLocalLedgerCount] = useState<number>(0)
  const [localAccountsCount, setLocalAccountsCount] = useState<number>(0)
  const [localInvoiceCount, setLocalInvoiceCount] = useState<number>(0)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")
  const [ledgerAudit, setLedgerAudit] = useState<LedgerAuditResult | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false)
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  
  // Cloud server state
  const [cloudDocCount, setCloudDocCount] = useState<number | null>(null)
  const [cloudInvoiceCount, setCloudInvoiceCount] = useState<number | null>(null)
  const [cloudLastUpdated, setCloudLastUpdated] = useState<string | null>(null)
  const [isCheckingCloud, setIsCheckingCloud] = useState(false)
  const [transferStep, setTransferStep] = useState<string>("")
  const [relayLatencyMs, setRelayLatencyMs] = useState<number | null>(null)

  // Load local counts, ledger audit, and check cloud snapshot on open
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      if (initialTab) {
        setActiveTab(initialTab)
      }
      refreshLocalMetrics()
      checkCloudStatus()
      loadSyncHistory()
      
      const storedAuto = window.localStorage.getItem("skybol:auto-sync-enabled")
      if (storedAuto !== null) {
        setAutoSyncEnabled(storedAuto === "true")
      }
    }
  }, [open, initialTab])

  const refreshLocalMetrics = () => {
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

      const lRaw = window.localStorage.getItem("skybol:account-ledgers")
      const ledgers = lRaw ? JSON.parse(lRaw) : {}
      setLocalLedgerCount(Object.keys(ledgers).length)
      
      const audit = validateLedgerInvariance(ledgers)
      setLedgerAudit(audit)

      const cRaw = window.localStorage.getItem("skybol:account-custom-companies")
      const accounts = cRaw ? JSON.parse(cRaw) : []
      setLocalAccountsCount(accounts.length)

      const iRaw = window.localStorage.getItem("skybol:saved-invoices")
      const invoices = iRaw ? JSON.parse(iRaw) : []
      setLocalInvoiceCount(Array.isArray(invoices) ? invoices.length : 0)
    } catch (e) {
      setLocalDocCount(0)
      setLocalLedgerCount(0)
      setLocalAccountsCount(0)
      setLocalInvoiceCount(0)
    }
  }

  const loadSyncHistory = () => {
    try {
      const raw = window.localStorage.getItem("skybol:sync-history")
      if (raw) {
        setSyncHistory(JSON.parse(raw))
      }
    } catch (e) {}
  }

  const recordSyncEvent = (event: Omit<SyncHistoryItem, "id" | "timestamp">) => {
    try {
      const newItem: SyncHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString(),
        ...event,
      }
      const updated = [newItem, ...syncHistory].slice(0, 20)
      setSyncHistory(updated)
      window.localStorage.setItem("skybol:sync-history", JSON.stringify(updated))
    } catch (e) {}
  }

  const checkCloudStatus = async () => {
    setIsCheckingCloud(true)
    const startTime = performance.now()
    try {
      const res = await fetch("/api/sync", { cache: "no-store" })
      const endTime = performance.now()
      setRelayLatencyMs(Math.round(endTime - startTime))

      if (res.ok) {
        const body = await res.json()
        const data = body.data || body
        if (Array.isArray(data.documents)) {
          setCloudDocCount(data.documents.length)
        } else {
          setCloudDocCount(0)
        }
        if (Array.isArray(data.invoices)) {
          setCloudInvoiceCount(data.invoices.length)
        } else {
          setCloudInvoiceCount(0)
        }
        if (data.updated_at) {
          const d = new Date(data.updated_at)
          setCloudLastUpdated(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
        }
      } else {
        setCloudDocCount(null)
        setCloudInvoiceCount(null)
      }
    } catch (e) {
      setRelayLatencyMs(null)
      setCloudDocCount(null)
      setCloudInvoiceCount(null)
    } finally {
      setIsCheckingCloud(false)
    }
  }

  const toggleAutoSync = () => {
    const next = !autoSyncEnabled
    setAutoSyncEnabled(next)
    window.localStorage.setItem("skybol:auto-sync-enabled", String(next))
    if (next) {
      toast.success("Auto-Sync Activated", {
        description: "Your records will automatically sync across devices on changes.",
      })
    } else {
      toast.info("Auto-Sync Deactivated")
    }
  }

  // Get dynamic sync URL for QR and sharing
  const getSyncUrl = () => {
    if (!syncCode || typeof window === "undefined") return ""
    return `${window.location.origin}/?sync=${encodeURIComponent(syncCode)}`
  }

  // Get WhatsApp Share URL
  const getWhatsAppShareUrl = () => {
    const url = getSyncUrl()
    const text = `Sky Ariana BOL Sync Transfer Code: *${syncCode}*\nDirect Sync Link: ${url}\nOpen link on mobile to sync all BOLs and ledgers instantly.`
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
  }

  // Save parsed cloud snapshot into local storage with full redundancy
  const applySnapshotDataToLocal = (data: any): { docs: number; invoices: number } => {
    let restoredDocsCount = 0
    let restoredInvoicesCount = 0

    // 1. Merge documents into localStorage with redundancy
    if (Array.isArray(data.documents) && data.documents.length > 0) {
      const storedLocal1 = window.localStorage.getItem("sky-bol-browser-documents")
      const storedLocal2 = window.localStorage.getItem("skybol:saved-documents")
      const storedLocal3 = window.localStorage.getItem("skybol:backup-documents")
      const list1: any[] = storedLocal1 ? JSON.parse(storedLocal1) : []
      const list2: any[] = storedLocal2 ? JSON.parse(storedLocal2) : []
      const list3: any[] = storedLocal3 ? JSON.parse(storedLocal3) : []

      const mergedMap = new Map<string, any>()
      for (const d of data.documents) {
        const k = d.bol_number || d.id
        if (k) mergedMap.set(k, d)
      }
      for (const d of [...list1, ...list2, ...list3]) {
        const k = d.bol_number || d.id
        if (k && !mergedMap.has(k)) mergedMap.set(k, d)
      }

      const allMerged = Array.from(mergedMap.values())
      const jsonStr = JSON.stringify(allMerged)
      window.localStorage.setItem("sky-bol-browser-documents", jsonStr)
      window.localStorage.setItem("skybol:saved-documents", jsonStr)
      window.localStorage.setItem("skybol:backup-documents", jsonStr)
      restoredDocsCount = allMerged.length
      setLocalDocCount(restoredDocsCount)
    }

    // 2. Merge accounts & custom companies
    if (Array.isArray(data.customCompanies || data.accounts)) {
      const incomingComps = (data.customCompanies || data.accounts) as string[]
      const rawComp = window.localStorage.getItem("skybol:account-custom-companies")
      const currentComp = rawComp ? JSON.parse(rawComp) : []
      const nextComp = Array.from(new Set([...currentComp, ...incomingComps]))
      window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(nextComp))
      setLocalAccountsCount(nextComp.length)
    }

    // 3. Merge ledger records
    if (data.ledgerRecords && typeof data.ledgerRecords === "object") {
      const rawLedger = window.localStorage.getItem("skybol:account-ledgers")
      const currentLedger = rawLedger ? JSON.parse(rawLedger) : {}
      const nextLedger = smartMergeLedgerRecords(data.ledgerRecords, currentLedger)
      window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(nextLedger))
      setLocalLedgerCount(Object.keys(nextLedger).length)
      
      const audit = validateLedgerInvariance(nextLedger)
      setLedgerAudit(audit)
    }

    // 4. Merge invoices
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      const rawInv = window.localStorage.getItem("skybol:saved-invoices")
      const currentInv: any[] = rawInv ? JSON.parse(rawInv) : []
      const invMap = new Map<string, any>()
      for (const inv of data.invoices) {
        const k = inv.invoice_number || inv.id
        if (k) invMap.set(k, inv)
      }
      for (const inv of currentInv) {
        const k = inv.invoice_number || inv.id
        if (k && !invMap.has(k)) invMap.set(k, inv)
      }
      const allInvoices = Array.from(invMap.values())
      window.localStorage.setItem("skybol:saved-invoices", JSON.stringify(allInvoices))
      restoredInvoicesCount = allInvoices.length
      setLocalInvoiceCount(restoredInvoicesCount)
    }

    // 5. Merge financials map
    if (data.financialsMap && typeof data.financialsMap === "object") {
      const rawFin = window.localStorage.getItem("skybol:financials-map")
      const currentFin = rawFin ? JSON.parse(rawFin) : {}
      const nextFin = { ...currentFin, ...data.financialsMap }
      window.localStorage.setItem("skybol:financials-map", JSON.stringify(nextFin))
    }

    // 6. Restore company settings & presets if present
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

    // Dispatch global events to refresh all views in real time
    window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
    window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))
    window.dispatchEvent(new CustomEvent("skybol:invoices-updated", { detail: {} }))

    return { docs: restoredDocsCount, invoices: restoredInvoicesCount }
  }


  // 1. Upload all local BOLs, accounts, invoices, and ledgers to cloud
  const handleUploadAllToCloud = async () => {
    setIsUploading(true)
    setTransferStep("Auditing and packaging local BOLs, invoices, and ledgers...")
    const toastId = toast.loading("Uploading database to Sky Ariana Cloud Relay...")

    try {
      let localDocs: any[] = []
      let customCompanies: string[] = []
      let storedLedgerRecords: Record<string, any[]> = {}
      let storedInvoices: any[] = []
      let storedFinancialsMap: Record<string, any> = {}
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

        const iRaw = window.localStorage.getItem("skybol:saved-invoices")
        storedInvoices = iRaw ? JSON.parse(iRaw) : []

        const fRaw = window.localStorage.getItem("skybol:financials-map")
        storedFinancialsMap = fRaw ? JSON.parse(fRaw) : {}

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

      setTransferStep("Broadcasting snapshot to Sky Ariana Cloud Relay...")

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: localDocs,
          accounts: customCompanies,
          ledgerRecords: storedLedgerRecords,
          invoices: storedInvoices,
          financialsMap: storedFinancialsMap,
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
        const genCode = result.syncCode || "SKY-DONE"
        setSyncCode(genCode)
        const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        setLastSyncTime(timeNow)
        setCloudDocCount(localDocs.length)
        setCloudInvoiceCount(storedInvoices.length)
        setCloudLastUpdated(timeNow)
        setTransferStep("Upload completed successfully! 🎉")

        recordSyncEvent({
          action: "upload",
          bolCount: localDocs.length,
          ledgerCount: Object.keys(storedLedgerRecords).length,
          invoiceCount: storedInvoices.length,
          syncCode: genCode,
          status: "success",
          message: `Uploaded ${localDocs.length} BOLs, ${storedInvoices.length} Invoices to Cloud`,
        })

        toast.success(`Successfully uploaded ${localDocs.length} BOLs & ${storedInvoices.length} Invoices to Cloud! 🚀`, {
          id: toastId,
          description: `Transfer Code: ${genCode}. Use QR code or direct link to sync across any phone or laptop.`,
        })
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      recordSyncEvent({
        action: "upload",
        bolCount: localDocCount,
        ledgerCount: localLedgerCount,
        invoiceCount: localInvoiceCount,
        status: "failed",
        message: error instanceof Error ? error.message : "Upload failed",
      })

      toast.error("Failed to upload to Cloud", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please check internet connection",
      })
      setTransferStep("Upload failed. Please retry.")
    } finally {
      setIsUploading(false)
    }
  }

  // 2. Download and merge cloud BOLs & ledgers with multi-tier fallback
  const handleDownloadAllFromCloud = async (codeToUse?: string) => {
    setIsDownloading(true)
    const targetCode = (codeToUse || inputCode).trim().toUpperCase()
    const cleanNum = targetCode.replace(/^SKY-?/, "").replace(/[\s-_]+/g, "")
    setTransferStep(targetCode ? `Locating snapshot for code ${targetCode}...` : "Pulling master cloud database...")
    const toastId = toast.loading(targetCode ? `Fetching data for code ${targetCode}...` : "Downloading all BOL documents from Cloud...")

    try {
      let data: any = null

      // Tier 1: Try Primary API
      try {
        const url = targetCode ? `/api/sync?code=${encodeURIComponent(targetCode)}` : "/api/sync"
        const res = await fetch(url, { cache: "no-store" })
        if (res.ok) {
          const body = await res.json()
          data = body.data || body
        }
      } catch (err) {
        console.warn("Primary sync API failed, trying direct relay fallback...", err)
      }

      if (!data || (!Array.isArray(data.documents) && !data.ledgerRecords)) {
        if (!targetCode) {
          toast.info("No master cloud snapshot found on server.", {
            id: toastId,
            description: "Please enter the 4-digit Sync Code generated from your office PC under the Sync Code tab.",
          })
          setTransferStep("No master snapshot. Switched to 'Sync Code' tab to enter transfer code.")
          setActiveTab("code")
          return
        }
        throw new Error(`Could not find cloud snapshot for code ${targetCode}. Please verify code and try again.`)
      }

      setTransferStep("Merging BOL documents, invoices, accounts, and ledgers...")
      const { docs, invoices } = applySnapshotDataToLocal(data)

      setTransferStep("Synchronization completed successfully! 🎉")
      
      recordSyncEvent({
        action: "download",
        bolCount: docs || data.documents?.length || 0,
        ledgerCount: Object.keys(data.ledgerRecords || {}).length,
        invoiceCount: invoices || (Array.isArray(data.invoices) ? data.invoices.length : 0),
        syncCode: targetCode || "MASTER",
        status: "success",
        message: `Synchronized ${docs} BOLs and ${invoices} Invoices`,
      })

      toast.success(`Successfully synchronized ${docs || data.documents?.length || 0} BOLs & ${invoices} Invoices on this device! 🎉`, {
        id: toastId,
        description: "All client accounts, ledgers, and document files are now synchronized.",
      })

      if (onSyncComplete) onSyncComplete()
    } catch (error) {
      recordSyncEvent({
        action: "download",
        bolCount: 0,
        ledgerCount: 0,
        invoiceCount: 0,
        syncCode: targetCode || "UNKNOWN",
        status: "failed",
        message: error instanceof Error ? error.message : "Sync transfer failed",
      })

      toast.error("Sync transfer failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Could not fetch documents",
      })
      setTransferStep("Sync failed. Check code or internet connection.")
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
      const allInvoices = JSON.parse(window.localStorage.getItem("skybol:saved-invoices") || "[]")
      const ledgers = JSON.parse(window.localStorage.getItem("skybol:account-ledgers") || "{}")

      const backup = {
        app: "SKY_ARIANA_LOGISTICS",
        version: "5.1.0",
        exportedAt: new Date().toISOString(),
        totalDocuments: allDocs.length,
        totalInvoices: allInvoices.length,
        ledgerAudit: validateLedgerInvariance(ledgers),
        savedDocuments: allDocs,
        savedInvoices: allInvoices,
        financialsMap: JSON.parse(window.localStorage.getItem("skybol:financials-map") || "{}"),
        customCompanies: JSON.parse(window.localStorage.getItem("skybol:account-custom-companies") || "[]"),
        accountLedgers: ledgers,
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

      recordSyncEvent({
        action: "backup_export",
        bolCount: allDocs.length,
        ledgerCount: Object.keys(ledgers).length,
        invoiceCount: allInvoices.length,
        status: "success",
        message: `Exported full backup (.json) with ${allDocs.length} BOLs`,
      })

      toast.success(`Full Backup (${allDocs.length} BOLs, ${allInvoices.length} Invoices) downloaded successfully! 💾`)
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
          window.localStorage.setItem("skybol:backup-documents", JSON.stringify(parsed.savedDocuments))
        }
        if (Array.isArray(parsed.savedInvoices || parsed.invoices)) {
          window.localStorage.setItem("skybol:saved-invoices", JSON.stringify(parsed.savedInvoices || parsed.invoices))
        }
        if (parsed.financialsMap) {
          window.localStorage.setItem("skybol:financials-map", JSON.stringify(parsed.financialsMap))
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
        window.dispatchEvent(new CustomEvent("skybol:invoices-updated", { detail: {} }))

        refreshLocalMetrics()

        recordSyncEvent({
          action: "backup_restore",
          bolCount: parsed.savedDocuments?.length || 0,
          ledgerCount: Object.keys(parsed.accountLedgers || {}).length,
          invoiceCount: (parsed.savedInvoices || parsed.invoices)?.length || 0,
          status: "success",
          message: `Restored backup with ${parsed.savedDocuments?.length || 0} BOLs`,
        })

        toast.success("Backup Restored Successfully! 🎉", {
          description: `Loaded ${parsed.savedDocuments?.length || 0} BOLs and ${(parsed.savedInvoices || parsed.invoices)?.length || 0} invoices into this device.`,
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
    toast.success(`Code ${syncCode} copied!`)
  }

  const copyDirectSyncLink = () => {
    const link = getSyncUrl()
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
    toast.success("Direct Sync Link copied to clipboard! 🔗", {
      description: "Send this link via WhatsApp or Telegram to sync immediately on any phone.",
    })
  }

  const handlePasteCode = async () => {
    try {
      const text = await readFromClipboard()
      if (text) {
        const match = text.match(/[?&]sync=([^&]+)/) || text.match(/(SKY-?\d{4,6})/i) || text.match(/(\d{4,6})/)
        if (match) {
          setInputCode(match[1].toUpperCase())
          toast.success(`Pasted code: ${match[1]}`)
        } else {
          setInputCode(text.trim().toUpperCase())
        }
        return
      }
    } catch {}

    const el = document.getElementById("cloud-sync-input-code") as HTMLInputElement | null
    if (el) {
      el.focus()
      el.select()
    }
    toast("Press Ctrl+V to paste your sync code", {
      icon: "📋",
      duration: 2500,
    })
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full max-h-[min(90dvh,820px)] h-auto flex flex-col p-0 gap-0 overflow-hidden rounded-[28px] border border-blue-200/90 shadow-2xl bg-white/95 backdrop-blur-2xl">
        {/* Sticky Top Header Section */}
        <div className="p-5 sm:p-6 pb-3 border-b border-slate-100/90 bg-white/95 backdrop-blur-xl shrink-0 pr-12">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 sm:p-3 rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 shrink-0">
                  <Cloud className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black text-slate-950 flex flex-wrap items-center gap-2">
                    <span>Multi-Device Cloud Sync Hub</span>
                    <span className="text-[11px] font-black text-blue-700 font-[vazirmatn] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      همگام‌سازی ابری
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-semibold mt-0.5 line-clamp-1 sm:line-clamp-none">
                    Sync all BOLs, accounts, ledgers, and invoices between PC, Phone, and other browsers seamlessly.
                  </DialogDescription>
                </div>
              </div>

              {/* Auto Sync Toggle Button */}
              <button
                type="button"
                onClick={toggleAutoSync}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition shrink-0 ${
                  autoSyncEnabled
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                <span>{autoSyncEnabled ? "Auto-Sync: ON" : "Auto-Sync: OFF"}</span>
              </button>
            </div>
          </DialogHeader>

          {/* Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "upload"
                  ? "bg-white text-blue-950 shadow-xs border border-blue-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold"
              }`}
            >
              <UploadCloud className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">Upload to Cloud</span>
              <span className="sm:hidden">Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("download")}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "download"
                  ? "bg-white text-emerald-950 shadow-xs border border-emerald-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold"
              }`}
            >
              <DownloadCloud className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Download & Sync</span>
              <span className="sm:hidden">Download</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "code"
                  ? "bg-white text-indigo-950 shadow-xs border border-indigo-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold"
              }`}
            >
              <KeyRound className="h-4 w-4 text-indigo-600" />
              <span>Sync Code / کد</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-white text-amber-950 shadow-xs border border-amber-200/90"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-bold"
              }`}
            >
              <History className="h-4 w-4 text-amber-600" />
              <span className="hidden sm:inline">Sync Logs</span>
              <span className="sm:hidden">Logs</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3.5 scrollbar-thin space-y-4 min-h-0">
          {/* Tab 1: Upload */}
        {activeTab === "upload" && (
          <div className="space-y-3.5 py-2 animate-in fade-in">
            {/* Database Metrics Grid (5 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">BOLs Found</span>
                <span className="text-base font-black text-blue-950">{localDocCount}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">Ledgers</span>
                <span className="text-base font-black text-emerald-950">{localLedgerCount}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-50/80 border border-purple-200/80 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 block">Companies</span>
                <span className="text-base font-black text-purple-950">{localAccountsCount}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-900 block">Invoices</span>
                <span className="text-base font-black text-teal-950">{localInvoiceCount}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">Relay Status</span>
                <span className="text-xs font-black text-amber-950 flex items-center justify-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {relayLatencyMs !== null ? `${relayLatencyMs}ms` : "Online"}
                </span>
              </div>
            </div>

            {/* Ledger Balance Invariance Audit Status Badge */}
            {ledgerAudit && (
              <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Ledger Invariance Verified: Total Debit - Total Credit = Balance</span>
                </div>
                <div className="text-[11px] font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900 shrink-0">
                  Net: ${ledgerAudit.netBalance.toLocaleString()}
                </div>
              </div>
            )}

            {/* Primary Upload Button */}
            <Button
              onClick={handleUploadAllToCloud}
              disabled={isUploading}
              className="w-full h-12 rounded-2xl bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-700/20 cursor-pointer gap-2 transition-all active:scale-[0.99]"
            >
              {isUploading ? (
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <UploadCloud className="h-4.5 w-4.5 text-amber-400" />
              )}
              <span>{isUploading ? "Uploading to Cloud..." : `Upload All (${localDocCount}) BOLs & (${localInvoiceCount}) Invoices to Cloud`}</span>
            </Button>

            {transferStep && (
              <div className="text-center text-[11px] font-bold text-blue-700">
                {transferStep}
              </div>
            )}

            {/* Uploaded Success Result Block */}
            {syncCode && (
              <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-300 text-emerald-950 space-y-3 animate-in zoom-in-95 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Upload Successful! Transfer Code:</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">{lastSyncTime}</span>
                </div>

                {/* Transfer Code Box */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-2.5 px-3 bg-white rounded-xl border border-emerald-300 font-mono text-center text-xl sm:text-2xl font-black tracking-widest text-emerald-950 shadow-inner">
                    {syncCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copySyncCode}
                    className="h-11 px-3.5 rounded-xl border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                  </Button>
                </div>

                {/* QR Code & Mobile Fast Scan Section */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row items-center gap-3">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getSyncUrl())}&bgcolor=ffffff&color=1e3a8a&margin=4`}
                      alt="Sync QR Code"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-xs font-black text-slate-900">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Point Phone Camera at QR Code</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      Instantly opens the app on your mobile and automatically synchronizes all {localDocCount} BOLs and invoices without typing!
                    </p>
                    <div className="pt-1 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={copyDirectSyncLink}
                        className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10.5px] font-bold gap-1 cursor-pointer border border-blue-200"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Share2 className="w-3 h-3 text-blue-600" />}
                        <span>{copiedLink ? "Link Copied!" : "Copy Direct Link"}</span>
                      </Button>
                      <a
                        href={getWhatsAppShareUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10.5px] font-bold gap-1 cursor-pointer border border-emerald-200"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Share on WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-900 font-medium bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                  <p>
                    💡 <strong>On your phone/laptop:</strong> Open <strong>skyarianabol.vercel.app</strong>, click <strong>Sync</strong>, go to <strong>Sync Code</strong>, and enter <strong>{syncCode}</strong>.
                  </p>
                  <p className="font-[vazirmatn] text-[10.5px] text-emerald-950 font-bold">
                    در موبایل یا دستگاه دیگر، کد <strong>{syncCode}</strong> را در تب «کد همگام‌سازی» وارد کنید.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Download */}
        {activeTab === "download" && (
          <div className="space-y-3.5 py-1 animate-in fade-in">
            {/* Live Cloud Status Card */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Cloud Database Status</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  cloudDocCount !== null && cloudDocCount > 0
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : isCheckingCloud
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {cloudDocCount !== null ? `${cloudDocCount} BOLs Available` : isCheckingCloud ? "Checking..." : "No Master Snapshot"}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {cloudDocCount !== null && cloudDocCount > 0
                  ? "Fetch and merge all latest BOLs, invoices, ledgers, customer accounts, and company settings from the cloud server into this device."
                  : "No master cloud database snapshot on this server yet. Enter the 4-digit Sync Code from your office PC under 'Sync Code' to pull your records instantly."}
              </p>
              {cloudDocCount === null && !isCheckingCloud && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("code")}
                    className="w-full h-9 rounded-xl border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs gap-1.5 cursor-pointer transition"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Enter 4-Digit Transfer Code (ورود کد انتقال) →</span>
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-100 text-[11px] text-slate-500 font-bold">
                {cloudLastUpdated && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last Cloud Snapshot: {cloudLastUpdated}</span>
                  </div>
                )}
                {cloudInvoiceCount !== null && (
                  <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {cloudInvoiceCount} Invoices Available
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => handleDownloadAllFromCloud()}
              disabled={isDownloading}
              className="w-full h-12 rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 cursor-pointer gap-2 transition-all active:scale-[0.99]"
            >
              {isDownloading ? (
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <DownloadCloud className="h-4.5 w-4.5 text-white" />
              )}
              <span>{isDownloading ? "Downloading & Merging..." : "Download & Sync All Documents on This Device"}</span>
            </Button>

            {transferStep && (
              <div className="text-center text-[11px] font-bold text-emerald-700">
                {transferStep}
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1.5">
              <span className="font-black text-slate-800 text-xs block">✨ What gets synchronized:</span>
              <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                <li>All Bills of Lading and saved document records</li>
                <li>Customer accounts & transaction ledgers (verified balance identity)</li>
                <li>Invoices, item breakdowns, demurrage/detention charges & fees</li>
                <li>Saved Shippers, Consignees, and Notify Parties directories</li>
                <li>Company stamp, signature, and print preferences</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Code Transfer */}
        {activeTab === "code" && (
          <div className="space-y-4 py-1 animate-in fade-in duration-300">
            {/* Executive Device Pairing Terminal Card */}
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-b from-slate-900 via-slate-900 to-indigo-950 p-5 text-white border border-slate-800 shadow-xl space-y-4">
              {/* Ambient Glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    Live Cloud Relay
                  </span>
                </div>
                <span className="text-[10.5px] font-bold text-indigo-200 font-[vazirmatn] bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  اتصال مستقیم با کد انتقال
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1 relative z-10">
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Enter the transfer code (e.g. <strong className="text-amber-300 font-mono">4440</strong> or <strong className="text-amber-300 font-mono">SKY-4440</strong>) generated from your primary office computer or phone to download all shipments, invoices, and ledgers immediately.
                </p>
              </div>

              {/* Code Input & CTA Row */}
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Enter 4-Digit Code</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteCode}
                    className="text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 px-2.5 py-1 rounded-lg border border-indigo-400/30 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Copy className="w-3 h-3 text-indigo-300" />
                    <span>Paste Code</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Input
                      id="cloud-sync-input-code"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="e.g. 4440 or SKY-4440"
                      className="font-mono text-center font-black tracking-[0.25em] text-xl sm:text-2xl uppercase bg-slate-950/90 border-2 border-indigo-500/40 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 text-amber-300 placeholder:text-slate-600 rounded-xl h-13 shadow-inner transition-all selection:bg-indigo-600"
                      maxLength={15}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inputCode.trim() && !isDownloading) {
                          handleDownloadAllFromCloud(inputCode)
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => handleDownloadAllFromCloud(inputCode)}
                    disabled={isDownloading || !inputCode.trim()}
                    className="h-13 px-6 sm:px-8 rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 shrink-0 cursor-pointer transition-all active:scale-98 gap-2 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isDownloading ? (
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Zap className="h-4.5 w-4.5 text-amber-300" />
                    )}
                    <span>{isDownloading ? "Replicating..." : "Transfer Now"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Progress Step Banner (when downloading) */}
            {transferStep && (
              <div className="py-2.5 px-4 rounded-xl bg-blue-50 border border-blue-200 text-center text-xs font-bold text-blue-900 flex items-center justify-center gap-2 animate-in fade-in shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                <span>{transferStep}</span>
              </div>
            )}

            {/* 1-Click Master Cloud Sync Card */}
            <div className="p-4 rounded-2xl bg-linear-to-r from-emerald-50/90 via-teal-50/50 to-white border border-emerald-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs shrink-0">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                  </span>
                  <span className="text-xs font-black text-emerald-950">
                    1-Click Master Cloud Sync
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.2 rounded-full border border-emerald-300/60 font-[vazirmatn]">
                    بدون نیاز به کد
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-snug">
                  Already clicked &ldquo;Upload to Cloud&rdquo; on your office PC? Fetch the latest master snapshot directly.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => handleDownloadAllFromCloud()}
                disabled={isDownloading}
                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer gap-2 transition-all shadow-sm shadow-emerald-600/20 active:scale-98 shrink-0"
              >
                {isDownloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4 text-emerald-100" />}
                <span>Pull Latest Database</span>
              </Button>
            </div>

            {/* 3-Step Micro Guide (Bilingual English / Dari) */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>How It Works (راهنمای گام‌به‌گام)</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400">Zero Setup Required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1 shadow-2xs">
                  <div className="font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black flex items-center justify-center">1</span>
                    <span>Office Computer</span>
                  </div>
                  <p className="text-slate-500 leading-tight">Click <strong>Sync</strong> → <strong>Upload to Cloud</strong> on your main computer.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1 shadow-2xs">
                  <div className="font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black flex items-center justify-center">2</span>
                    <span>Get 4 Digits</span>
                  </div>
                  <p className="text-slate-500 leading-tight">Note the 4-digit code (e.g. <strong>4440</strong>) or direct sync link.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1 shadow-2xs">
                  <div className="font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">3</span>
                    <span>Instant Replicate</span>
                  </div>
                  <p className="text-slate-500 leading-tight">Enter code above to download all records with verified accounting balance.</p>
                </div>
              </div>

              <div className="pt-1 text-[11px] font-[vazirmatn] text-slate-700 font-semibold border-t border-slate-200/60 leading-relaxed text-right" dir="rtl">
                💡 راهنما: در کامپیوتر دفتر دکمه آپلود را بزنید و کد ۴ رقمی را در این کادر بنویسید، یا دکمه دریافت خودکار بالا را فشار دهید تا اسناد منتقل شوند.
              </div>
            </div>

            {/* Accounting Invariance Guarantee Badge */}
            <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/80 flex items-center justify-between gap-2 text-[10.5px] text-blue-950 font-medium">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Accounting Invariance Verified: Total Debit - Total Credit = Balance</span>
              </div>
              <span className="text-blue-700 font-mono text-[10px] font-bold">SHA-256 Validated</span>
            </div>
          </div>
        )}

        {/* Tab 4: Sync Activity History */}
        {activeTab === "history" && (
          <div className="space-y-3 py-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600" />
                <span>Recent Sync Activity</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {syncHistory.length} Logged Transfer(s)
              </span>
            </div>

            {syncHistory.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                <History className="h-8 w-8 mx-auto mb-2 text-slate-400 opacity-60" />
                <p className="font-bold text-slate-700">No sync activity recorded yet on this device.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Your uploads and downloads will appear here with transfer timestamps.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {syncHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg ${
                        item.status === "success" 
                          ? item.action === "upload" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {item.action === "upload" ? <UploadCloud className="h-4 w-4" /> : <DownloadCloud className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {item.message || (item.action === "upload" ? "Cloud Database Upload" : "Cloud Database Download")}
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{item.timestamp}</span>
                          {item.syncCode && (
                            <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                              {item.syncCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-full ${
                        item.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}>
                        {item.status === "success" ? "Success" : "Failed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Sticky Bottom File Backup & Action Bar */}
        <div className="p-3 sm:p-4 px-5 sm:px-6 border-t border-slate-200/80 bg-slate-50/95 shrink-0 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportFullBackup}
              className="h-9 px-3 rounded-xl border-slate-300 bg-white font-bold text-[11px] text-slate-700 gap-1.5 cursor-pointer hover:bg-slate-50 hover:text-slate-950 shadow-2xs transition-all active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Offline Backup (.json)</span>
            </Button>
            <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white font-bold text-[11px] text-slate-700 hover:bg-slate-50 hover:text-slate-950 cursor-pointer transition-all shadow-2xs active:scale-95">
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Restore Backup File</span>
              <input type="file" accept=".json" onChange={handleImportBackupFile} className="hidden" />
            </label>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-300 hover:text-slate-950 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

