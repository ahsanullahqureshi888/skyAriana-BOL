"use client"

import { useState } from "react"
import { ShieldCheck, HardDrive, FileJson, ArrowRight, UploadCloud, Sparkles, QrCode, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CloudSyncModal } from "@/components/bill-of-lading/cloud-sync-modal"

interface FirstRunWizardProps {
  onComplete: () => void
  hasGoogleDriveAuth?: boolean
}

export function FirstRunWizard({ onComplete }: FirstRunWizardProps) {
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncInitialTab, setSyncInitialTab] = useState<"upload" | "download" | "code" | "history">("code")
  const [isLoading, setIsLoading] = useState(false)

  const handleStartEmpty = async () => {
    setIsLoading(true)
    try {
      window.localStorage.setItem("skybol:first-run-completed", "true")
      toast.success("Welcome! Starting with a fresh Sky Ariana workspace.")
      onComplete()
    } catch {
      toast.error("Failed to initialize workspace")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileRestore = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".zip,.json"
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return

      const toastId = toast.loading(`Reading backup file (${file.name})...`)

      // If user provided a .json backup file (exported from Cloud Sync)
      if (file.name.endsWith(".json")) {
        try {
          const reader = new FileReader()
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target?.result as string)
              if (data && (Array.isArray(data.savedDocuments) || Array.isArray(data.documents) || data.accountLedgers || data.ledgerRecords)) {
                // Save documents
                const docs = data.savedDocuments || data.documents || []
                if (Array.isArray(docs) && docs.length > 0) {
                  const jsonStr = JSON.stringify(docs)
                  window.localStorage.setItem("skybol:saved-documents", jsonStr)
                  window.localStorage.setItem("sky-bol-browser-documents", jsonStr)
                }

                // Save invoices
                const invoices = data.savedInvoices || data.invoices || []
                if (Array.isArray(invoices)) {
                  window.localStorage.setItem("skybol:saved-invoices", JSON.stringify(invoices))
                }

                // Save ledgers
                const ledgers = data.accountLedgers || data.ledgerRecords || {}
                if (ledgers && typeof ledgers === "object") {
                  window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(ledgers))
                }

                // Save custom companies
                const comps = data.customCompanies || data.accounts || []
                if (Array.isArray(comps)) {
                  window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(comps))
                }

                // Save settings & financials
                if (data.companySettings) {
                  window.localStorage.setItem("skybol:company-settings", JSON.stringify(data.companySettings))
                }
                if (data.financialsMap) {
                  window.localStorage.setItem("skybol:financials-map", JSON.stringify(data.financialsMap))
                }

                window.localStorage.setItem("skybol:first-run-completed", "true")
                toast.success(`Restored ${docs.length} BOLs and ${invoices.length} Invoices!`, { id: toastId })
                setTimeout(() => window.location.reload(), 800)
              } else {
                toast.error("Invalid Sky Ariana JSON backup format", { id: toastId })
              }
            } catch (err: any) {
              toast.error(`JSON parse error: ${err.message}`, { id: toastId })
            }
          }
          reader.readAsText(file)
        } catch (err: any) {
          toast.error(`Read error: ${err.message}`, { id: toastId })
        }
        return
      }

      // If user provided a .zip system backup
      const formData = new FormData()
      formData.append("file", file)
      formData.append("action", "commit")

      try {
        const res = await fetch("/api/system/restore", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()

        if (data.success) {
          toast.success("Successfully restored system from backup archive!", { id: toastId })
          window.localStorage.setItem("skybol:first-run-completed", "true")
          setTimeout(() => window.location.reload(), 1000)
        } else {
          toast.error(`Import failed: ${data.error}`, { id: toastId })
        }
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`, { id: toastId })
      }
    }
    input.click()
  }

  const openSyncWithTab = (tab: "code" | "download") => {
    setSyncInitialTab(tab)
    setShowSyncModal(true)
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-radial-[ellipse_80%_80%_at_50%_-20%] from-blue-900/30 via-slate-950 to-slate-950 p-4 sm:p-6 text-slate-100">
      <div className="max-w-2xl w-full bg-slate-900/90 backdrop-blur-2xl border border-blue-500/20 rounded-[32px] shadow-2xl shadow-blue-950/80 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="relative bg-linear-to-b from-blue-950/70 via-slate-900/90 to-slate-900 p-6 sm:p-8 border-b border-slate-800 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-linear-to-br from-blue-500/20 to-amber-500/10 rounded-2xl border border-blue-400/30 p-2.5 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
            <img src="/logo.png" alt="AQ Companies" className="w-full h-full object-contain" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AQ Companies Transit & Logistics Suite v5.1</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome to AQ Companies BOL
          </h1>
          <p className="text-xs sm:text-sm font-[vazirmatn] text-blue-200/80 font-bold mt-1">
            سیستم جامع مدیریت بارنامه، اسناد ترانزیت و حسابداری مالی
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Choose how you would like to start on this device. You can synchronize or import records at any time.
          </p>
        </div>

        {/* 3 Main Choice Cards */}
        <div className="p-5 sm:p-7 space-y-3.5">
          {/* Card 1: Start New Empty Workspace (Primary / Highlighted) */}
          <button
            type="button"
            onClick={handleStartEmpty}
            disabled={isLoading}
            className="w-full text-left group p-4 sm:p-5 rounded-2xl border-2 border-blue-500/50 hover:border-blue-400 bg-linear-to-r from-blue-950/40 via-blue-900/20 to-slate-800/60 hover:bg-blue-900/30 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-lg shadow-blue-950/40 relative overflow-hidden"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-blue-200 transition-colors">
                    Start Fresh Workspace
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Recommended / شروع سریع
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Launch immediately with clean database & ready-to-use BOL forms. No files needed.
                </p>
                <p className="text-[11px] font-[vazirmatn] text-blue-300/80 font-semibold mt-0.5">
                  ورود فوری به نرم‌افزار با پروفایل شرکتی آماده
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs font-black text-blue-400 group-hover:text-white shrink-0 group-hover:translate-x-1 transition-all">
              <span>Launch</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Card 2: Cloud Sync Hub (Pull from office PC) */}
          <button
            type="button"
            onClick={() => openSyncWithTab("code")}
            className="w-full text-left group p-4 sm:p-5 rounded-2xl border border-slate-700/80 hover:border-emerald-500/60 bg-slate-800/40 hover:bg-slate-800/80 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-white">
                    Sync from Another Device (Office PC or Phone)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300">
                    Cloud Hub
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Connect using a 4-digit code (e.g. 4440) generated from your office computer to pull all documents.
                </p>
                <p className="text-[11px] font-[vazirmatn] text-emerald-300/80 font-semibold mt-0.5">
                  همگام‌سازی سریع با کد ۴ رقمی از کامپیوتر یا گوشی
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-emerald-400 shrink-0 group-hover:translate-x-1 transition-all">
              <span>Connect</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Card 3: Local File Restore (.zip or .json) */}
          <button
            type="button"
            onClick={handleFileRestore}
            className="w-full text-left group p-4 sm:p-5 rounded-2xl border border-slate-700/80 hover:border-purple-500/60 bg-slate-800/40 hover:bg-slate-800/80 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500 group-hover:text-white transition-all shrink-0">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-white">
                    Restore from Backup File (.json / .zip)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300">
                    Local File
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Upload an exported Sky Ariana database file (.json or system .zip archive).
                </p>
                <p className="text-[11px] font-[vazirmatn] text-purple-300/80 font-semibold mt-0.5">
                  بازیابی پایگاه داده از فایل پشتیبان ذخیره شده
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-purple-400 shrink-0 group-hover:translate-x-1 transition-all">
              <span>Select File</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Footer Guarantee */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict Accounting Invariance: Net Balance = Total Debit - Total Credit</span>
          </div>
          <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">
            Hairatan • Islam Qala • Torghundi • Spin Boldak
          </span>
        </div>
      </div>

      {/* Cloud Sync Modal Component */}
      <CloudSyncModal
        open={showSyncModal}
        onOpenChange={setShowSyncModal}
        initialTab={syncInitialTab}
        onSyncComplete={() => {
          window.localStorage.setItem("skybol:first-run-completed", "true")
          window.location.reload()
        }}
      />
    </div>
  )
}
