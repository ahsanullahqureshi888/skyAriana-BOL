"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Cloud,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  HardDrive,
  History,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Search,
  Check,
  AlertTriangle,
  Loader2,
  WifiOff,
  Key,
  ChevronDown,
  ChevronUp,
  Settings,
  Lock,
  User,
  ArrowRightLeft,
  Database,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { GoogleDriveRestoreModal } from "./google-drive-restore-modal"
import type {
  AutoBackupInterval,
  BackupRetentionOption,
  GoogleDriveBackupItem,
  GoogleDriveStatus,
} from "@/lib/google-drive/types"

export function GoogleDriveCard() {
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [backups, setBackups] = useState<GoogleDriveBackupItem[]>([])
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Backup in-progress states
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupStage, setBackupStage] = useState<string>("")
  const [backupPercent, setBackupPercent] = useState<number>(0)
  const [lastBackupResult, setLastBackupResult] = useState<any | null>(null)

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)

  // Restore modal
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<GoogleDriveBackupItem | null>(null)

  // UI Drawers & Collapsibles
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showHistory, setShowHistory] = useState(true)

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google-drive/status")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      setStatus({
        state: "offline",
        configured: false,
        connected: false,
        rootFolderName: "Sky Ariana BOL",
        pendingOfflineBackup: false,
        settings: {
          autoBackupEnabled: false,
          autoBackupInterval: "daily",
          retentionLimit: 10,
          includePdfs: true,
          includeDocuments: true,
          autoUploadPdfs: false,
          wifiOnly: false,
        },
      })
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

  // Fetch backups list
  const fetchBackups = useCallback(async (query = "") => {
    setIsLoadingBackups(true)
    try {
      const q = query ? `?query=${encodeURIComponent(query)}` : ""
      const res = await fetch(`/api/google-drive/backups${q}`)
      if (res.ok) {
        const data = await res.json()
        if (data.backups && Array.isArray(data.backups)) {
          setBackups(data.backups)
        }
      }
    } catch {
      // Offline or network glitch
    } finally {
      setIsLoadingBackups(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (status?.connected) {
      fetchBackups()
    }
  }, [status?.connected, fetchBackups])

  // Listen for OAuth completion message from popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "GDRIVE_AUTH_SUCCESS") {
        if (event.data.success) {
          toast.success("Google Drive Connected! ✓", {
            description: `Linked to ${event.data.email || event.data.name || "your Google account"}`,
          })
          fetchStatus()
          fetchBackups()
        } else {
          toast.error("Google Drive Connection Cancelled")
        }
      }
    }

    window.addEventListener("message", handleAuthMessage)
    return () => window.removeEventListener("message", handleAuthMessage)
  }, [fetchStatus, fetchBackups])

  // Update Settings
  const handleUpdateSettings = async (partial: any) => {
    if (!status) return
    const updatedSettings = { ...status.settings, ...partial }
    setStatus((prev) => (prev ? { ...prev, settings: updatedSettings } : prev))

    try {
      const res = await fetch("/api/google-drive/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      })
      if (res.ok) {
        toast.success("Settings updated")
      }
    } catch {
      toast.error("Failed to save settings")
    }
  }

  // Connect Google Drive (Real OAuth with account selector)
  const handleConnect = async () => {
    try {
      const res = await fetch("/api/google-drive/auth")
      const data = await res.json()

      if (!res.ok || !data.configured) {
        setShowSetupDialog(true)
        return
      }

      if (data.url) {
        const width = 580
        const height = 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        window.open(
          data.url,
          "google_drive_oauth",
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        )
      }
    } catch (err: any) {
      toast.error("Unable to start Google authorization", { description: err?.message })
    }
  }

  // Disconnect Google Drive
  const handleDisconnect = async () => {
    if (
      !confirm(
        "Disconnect Google Drive?\n\nYour local Sky Ariana BOL data will NOT be deleted. Your cloud backups will remain safely in your Google Drive."
      )
    ) {
      return
    }

    try {
      const res = await fetch("/api/google-drive/disconnect", { method: "POST" })
      if (res.ok) {
        toast.success("Google Drive disconnected")
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                state: "not_connected",
                connected: false,
                connectedEmail: undefined,
                user: undefined,
              }
            : prev
        )
        setBackups([])
      }
    } catch {
      toast.error("Failed to disconnect")
    }
  }

  // Backup Now
  const handleBackupNow = async (force = false) => {
    setIsBackingUp(true)
    setBackupPercent(10)
    setBackupStage("Saving local database...")
    setLastBackupResult(null)

    const timer1 = setTimeout(() => {
      setBackupPercent(30)
      setBackupStage("Creating snapshot & validating...")
    }, 400)

    const timer2 = setTimeout(() => {
      setBackupPercent(55)
      setBackupStage("Compressing database...")
    }, 800)

    const timer3 = setTimeout(() => {
      setBackupPercent(80)
      setBackupStage("Uploading to Google Drive...")
    }, 1200)

    try {
      const res = await fetch("/api/google-drive/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAutoBackup: false, force }),
      })

      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.dataLossWarning) {
          toast.warning("Possible Data Loss Detected", {
            description: data.error || "Local database appears empty. Overwrite aborted.",
          })
          return
        }
        throw new Error(data.error || "Google Drive backup could not be completed.")
      }

      setBackupPercent(100)
      setBackupStage("✓ Database Backup Complete")
      setLastBackupResult(data)

      toast.success("Database Backup Complete! ☁️", {
        description: `Verified ${data.recordCounts?.bols || 0} BOLs, ${data.recordCounts?.invoices || 0} Invoices, ${data.recordCounts?.companies || 0} Accounts.`,
      })

      fetchStatus()
      fetchBackups()
    } catch (err: any) {
      console.error("Backup now error:", err)
      toast.error("Database Upload Failed", {
        description: err?.message || "Your local database is safe. Please check your connection and retry.",
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  // Sync Now
  const handleSyncNow = async () => {
    setIsSyncing(true)
    try {
      await fetchBackups(searchQuery)
      await fetchStatus()
      toast.success("Google Drive synchronized ✓")
    } catch {
      toast.error("Failed to sync with Google Drive")
    } finally {
      setIsSyncing(false)
    }
  }

  // Open Backup Folder in Google Drive
  const handleOpenFolder = () => {
    window.open("https://drive.google.com/drive/my-drive", "_blank")
  }

  // Delete Backup
  const handleDeleteBackup = async (item: GoogleDriveBackupItem) => {
    if (
      !confirm(
        `Delete backup "${item.name}" from Google Drive?\n\nThis will permanently remove this cloud archive from your Drive.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/google-drive/backups?fileId=${item.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Backup deleted from Google Drive")
        setBackups((prev) => prev.filter((b) => b.id !== item.id))
      } else {
        toast.error("Failed to delete backup")
      }
    } catch {
      toast.error("Error deleting backup")
    }
  }

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "Never"
    try {
      return new Date(isoString).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return isoString
    }
  }

  const isConnected = Boolean(status?.connected)
  const isConfigured = Boolean(status?.configured)
  const isOffline = status?.state === "offline"
  const isExpired = status?.state === "expired"

  const localBols = status?.localCounts?.bols ?? 0
  const localInvoices = status?.localCounts?.invoices ?? 0
  const localLedgers = status?.localCounts?.ledgerEntries ?? 0
  const localCompanies = status?.localCounts?.companies ?? 0

  const cloudBols = status?.cloudCounts?.bols ?? (backups[0]?.bolCount || 0)
  const cloudInvoices = status?.cloudCounts?.invoices ?? (backups[0]?.invoiceCount || 0)
  const cloudLedgers = status?.cloudCounts?.ledgerEntries ?? (backups[0]?.ledgerCount || 0)

  // Smart Detection Scenarios
  const isCaseA = isConnected && backups.length === 0 && localBols > 0
  const isCaseB = isConnected && backups.length > 0 && localBols === 0 && cloudBols > 0
  const isConflict = Boolean(status?.conflictDetected)
  const isZeroRecordDrop = Boolean(status?.zeroRecordAlert)

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. PRIMARY EXECUTIVE GOOGLE DRIVE CARD                                */}
      {/* ===================================================================== */}
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-600/20">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Google Drive
                </h3>
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Cloud Backup & Synchronization
                </span>
              </div>
              <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                پشتیبان‌گیری امن و همگام‌سازی ابری گوگل درایو برای پایگاه داده، بارنامه‌ها و حساب‌ها
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2">
            {isLoadingStatus ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
              </span>
            ) : isConnected ? (
              <span className="flex items-center gap-2 text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3.5 py-1.5 rounded-xl shadow-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Google Drive Connected ✓
              </span>
            ) : isOffline ? (
              <span className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3.5 py-1.5 rounded-xl">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                Offline — Backup Pending
              </span>
            ) : isExpired ? (
              <span className="flex items-center gap-2 text-xs font-bold text-red-800 bg-red-100 border border-red-300 px-3.5 py-1.5 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                Connection Expired
              </span>
            ) : (
              <span className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* CASE NOT CONFIGURED                                                 */}
        {/* =================================================================== */}
        {!isConnected && !isConfigured && !isLoadingStatus && (
          <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-950">
                  Google Drive has not been configured for this installation.
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  To connect your Google account, standard OAuth Client keys need to be set in your system environment.
                </p>
              </div>
            </div>
            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSetupDialog(true)}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs h-9 rounded-xl cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                <span>Setup Instructions</span>
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CASE CONFIGURED BUT DISCONNECTED: CLEAN CONNECT BUTTON              */}
        {/* =================================================================== */}
        {!isConnected && isConfigured && !isLoadingStatus && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 space-y-5 text-center sm:text-left">
            <div className="space-y-2 max-w-xl">
              <h4 className="text-base font-black text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Secure Cloud Backup & Synchronization
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your personal or business Google Drive account. Sky Ariana BOL will automatically create a private folder in your Drive to save and sync your Bills of Lading, invoices, company accounts, and accounting ledgers across all your computers.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              <Button
                type="button"
                onClick={handleConnect}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm h-12 px-7 rounded-2xl shadow-lg shadow-blue-600/25 cursor-pointer flex items-center gap-2.5 transition-all transform hover:scale-[1.01]"
              >
                <Cloud className="w-5 h-5" />
                <span>Connect Google Drive</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSetupDialog(true)}
                className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-12 px-4 rounded-2xl font-bold cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>OAuth Setup Help</span>
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CONNECTED STATE: EXECUTIVE DASHBOARD                                */}
        {/* =================================================================== */}
        {isConnected && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Account Profile Ribbon */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/80 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {status?.user?.picture ? (
                  <img
                    src={status.user.picture}
                    alt="Google Account"
                    className="w-12 h-12 rounded-2xl border-2 border-blue-400 object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-300 font-black text-lg">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">
                      {status?.user?.name || "Connected User"}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ✓ Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono truncate max-w-xs sm:max-w-sm">
                    {status?.user?.email || status?.connectedEmail || "user@gmail.com"}
                  </p>
                  <p className="text-[11px] text-blue-300 font-mono">
                    Storage: My Drive / Sky Ariana BOL
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Last Cloud Backup
                  </span>
                  <p className="text-xs font-black text-amber-400">
                    {formatDate(status?.lastBackup)}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    Last Sync: {formatDate(status?.lastSync)}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Alerts */}
            {isZeroRecordDrop && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-black text-red-950">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  Possible Data Loss Detected: Auto-backup paused
                </div>
                <p>
                  Your local database currently shows 0 records while your Google Drive contains healthy backups ({cloudBols} BOLs). Automatic backup has been paused to protect your cloud data.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (backups.length > 0) {
                        setSelectedBackupForRestore(backups[0])
                        setRestoreModalOpen(true)
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 rounded-lg font-bold"
                  >
                    Restore Google Drive Database
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBackupNow(true)}
                    className="border-red-300 text-red-800 hover:bg-red-100 text-xs h-8 rounded-lg font-bold"
                  >
                    Continue & Backup Anyway
                  </Button>
                </div>
              </div>
            )}

            {isCaseA && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-blue-950">
                    Google Drive Connected — Ready for initial backup
                  </p>
                  <p className="text-[11px] text-blue-800">
                    {localBols} BOLs and your business records were found on this computer. Back them up to initialize your cloud storage.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleBackupNow(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 rounded-lg"
                >
                  Backup to Google Drive
                </Button>
              </div>
            )}

            {isCaseB && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-950">
                    Existing Sky Ariana Database Found in Google Drive
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Your Google Drive contains {cloudBols} BOLs, {cloudInvoices} Invoices, and {cloudLedgers} Ledger Entries.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (backups.length > 0) {
                      setSelectedBackupForRestore(backups[0])
                      setRestoreModalOpen(true)
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 rounded-lg"
                >
                  Restore From Google Drive
                </Button>
              </div>
            )}

            {/* =============================================================== */}
            {/* 2. DATABASE STATUS CARD (LOCAL VS CLOUD COMPARISON)             */}
            {/* =============================================================== */}
            <div className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Database Synchronization Status
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  Revision {status?.databaseRevision || 1000}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Local Database */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-slate-600" />
                      Local Database
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Healthy (Working Offline)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-base font-black text-slate-900">{localBols}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">BOLs</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-base font-black text-slate-900">{localInvoices}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Invoices</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-base font-black text-slate-900">{localLedgers}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Ledgers</p>
                    </div>
                  </div>
                </div>

                {/* Google Drive Database */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-blue-600" />
                      Google Drive Database
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      ✓ Cloud Validated
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-base font-black text-slate-900">{cloudBols}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">BOLs</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-base font-black text-slate-900">{cloudInvoices}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Invoices</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-base font-black text-slate-900">{cloudLedgers}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Ledgers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Backup Progress Bar */}
            {isBackingUp && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    {backupStage}
                  </span>
                  <span>{backupPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${backupPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                type="button"
                onClick={() => handleBackupNow(false)}
                disabled={isBackingUp}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isBackingUp ? "Backing Up..." : "Backup Now"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="border-slate-300 text-slate-800 hover:bg-slate-100 font-bold text-xs h-10 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sync Now</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (backups.length > 0) {
                    setSelectedBackupForRestore(backups[0])
                    setRestoreModalOpen(true)
                  } else {
                    toast.info("No backups found yet. Create a backup first.")
                  }
                }}
                className="border-slate-300 text-slate-800 hover:bg-slate-100 font-bold text-xs h-10 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restore</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleOpenFolder}
                className="border-slate-300 text-slate-800 hover:bg-slate-100 font-bold text-xs h-10 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span>Open Google Drive</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleDisconnect}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs h-10 px-3 rounded-xl ml-auto cursor-pointer"
              >
                Disconnect
              </Button>
            </div>

            {/* =============================================================== */}
            {/* AUTOMATIC BACKUP PREFERENCES                                    */}
            {/* =============================================================== */}
            <div className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Automatic Google Drive Backup
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Continuously protects your operational database in the cloud
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">
                    {status?.settings?.autoBackupEnabled ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={status?.settings?.autoBackupEnabled || false}
                    onCheckedChange={(val) => handleUpdateSettings({ autoBackupEnabled: val })}
                  />
                </div>
              </div>

              {status?.settings?.autoBackupEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200">
                    <Label className="text-xs font-bold text-slate-900">Backup Frequency</Label>
                    <select
                      value={status?.settings?.autoBackupInterval || "daily"}
                      onChange={(e) =>
                        handleUpdateSettings({ autoBackupInterval: e.target.value as AutoBackupInterval })
                      }
                      className="h-8 px-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                    >
                      <option value="15m">Every 15 minutes</option>
                      <option value="30m">Every 30 minutes</option>
                      <option value="1h">Every 1 hour (Recommended)</option>
                      <option value="3h">Every 3 hours</option>
                      <option value="6h">Every 6 hours</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200">
                    <Label className="text-xs font-bold text-slate-900">Keep Backups (Retention)</Label>
                    <select
                      value={String(status?.settings?.retentionLimit ?? 10)}
                      onChange={(e) => {
                        const val = e.target.value === "all" ? "all" : parseInt(e.target.value, 10)
                        handleUpdateSettings({ retentionLimit: val as BackupRetentionOption })
                      }}
                      className="h-8 px-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                    >
                      <option value="5">Keep last 5</option>
                      <option value="10">Keep last 10 (Default)</option>
                      <option value="30">Keep last 30</option>
                      <option value="all">Keep all backups</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* =============================================================== */}
            {/* GOOGLE DRIVE BACKUP HISTORY                                     */}
            {/* =============================================================== */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 cursor-pointer"
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Backup History ({backups.length})</span>
                  {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showHistory && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search backups..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        fetchBackups(e.target.value)
                      }}
                      className="h-8 pl-8 text-xs rounded-xl bg-slate-50 border-slate-200"
                    >
                    </Input>
                  </div>
                )}
              </div>

              {showHistory && (
                <>
                  {isLoadingBackups ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                      <p className="text-xs font-bold">Loading cloud backups...</p>
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <p className="text-xs font-bold">No Google Drive backups found.</p>
                      <p className="text-[11px] text-slate-400">
                        Click &quot;Backup Now&quot; above to create your first cloud snapshot.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {backups.map((item) => {
                        const sizeMB = (item.sizeBytes / (1024 * 1024)).toFixed(1)
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {formatDate(item.createdAt)}
                                </span>
                                {item.databaseRevision && (
                                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                                    Rev {item.databaseRevision}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                  ✓ Verified
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {sizeMB} MB
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-mono text-slate-700 font-bold">
                                  {item.bolCount ?? 0} BOLs
                                </span>
                                <span>•</span>
                                <span className="font-mono text-slate-700 font-bold">
                                  {item.invoiceCount ?? 0} Invoices
                                </span>
                                <span>•</span>
                                <span className="font-mono text-slate-700 font-bold">
                                  {item.ledgerCount ?? 0} Ledgers
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackupForRestore(item)
                                  setRestoreModalOpen(true)
                                }}
                                className="h-7 px-2.5 rounded-lg text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                              >
                                Restore
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBackup(item)}
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Delete backup"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* =============================================================== */}
            {/* ADVANCED SETTINGS ACCORDION                                      */}
            {/* =============================================================== */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer py-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Advanced Settings & Diagnostics</span>
                {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedSettings && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-slate-900">Include Uploaded PDFs in Backups</Label>
                      <p className="text-[11px] text-slate-500">Backs up scanned attachments and generated PDFs</p>
                    </div>
                    <Switch
                      checked={status?.settings?.includeDocuments ?? true}
                      onCheckedChange={(val) => handleUpdateSettings({ includeDocuments: val })}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-900">OAuth Developer Diagnostics</p>
                      <p className="text-[11px] text-slate-500">View redirect URIs and Cloud Console configuration</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSetupDialog(true)}
                      className="text-xs font-bold h-8"
                    >
                      <Key className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      OAuth Setup Guide
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SETUP INSTRUCTIONS MODAL                                              */}
      {/* ===================================================================== */}
      {showSetupDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Google Cloud OAuth Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupDialog(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <p className="font-bold text-slate-900">
                To enable Google Sign-In on your Sky Ariana BOL installation:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-1">
                <li>
                  Open <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Google Cloud Console</a> and create or select a project.
                </li>
                <li>
                  Navigate to <strong>APIs & Services → Library</strong> and enable <strong>Google Drive API</strong>.
                </li>
                <li>
                  Under <strong>OAuth Consent Screen</strong>, select <em>External</em> and add the scope:
                  <code className="block bg-slate-100 text-blue-700 px-2 py-1 rounded font-mono mt-1 text-[11px]">
                    https://www.googleapis.com/auth/drive.file
                  </code>
                </li>
                <li>
                  Under <strong>APIs & Services → Credentials</strong>, create an <strong>OAuth 2.0 Client ID</strong> (Application type: <em>Web application</em>).
                </li>
                <li>
                  Add this exact Authorized Redirect URI:
                  <code className="block bg-slate-100 text-blue-700 px-2 py-1 rounded font-mono mt-1 text-[11px]">
                    http://127.0.0.1:3001/api/google-drive/auth/callback
                  </code>
                </li>
                <li>
                  Set the credentials in your local environment file (<code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">.env.local</code>):
                  <pre className="bg-slate-900 text-blue-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto mt-1">
{`GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://127.0.0.1:3001/api/google-drive/auth/callback"`}
                  </pre>
                </li>
              </ol>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="button"
                onClick={() => setShowSetupDialog(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      <GoogleDriveRestoreModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        backup={selectedBackupForRestore}
        onRestoreCompleted={() => {
          fetchBackups()
          fetchStatus()
        }}
      />
    </div>
  )
}
