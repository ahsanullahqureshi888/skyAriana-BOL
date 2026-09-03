"use client"

import React, { useState, useEffect } from "react"
import {
  Sparkles,
  Plus,
  Truck,
  DollarSign,
  BarChart3,
  Search,
  Cloud,
  FileSpreadsheet,
  ShieldCheck,
  X,
  Layers,
  ChevronUp,
  Receipt,
  RotateCcw,
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { auditLedgerIntegrity, reconcileAllLedgers } from "@/lib/services/ledger-integrity-service"

interface QuickActionsWidgetProps {
  onOpenChat?: () => void
  onOpenCommandPalette?: () => void
  onOpenCloudSync?: () => void
}

export function QuickActionsWidget({
  onOpenChat,
  onOpenCommandPalette,
  onOpenCloudSync,
}: QuickActionsWidgetProps) {
  const { setView, view } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)

  // Close when clicking outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Run quick integrity check
  const handleRunAudit = () => {
    setIsAuditing(true)
    setTimeout(() => {
      const report = auditLedgerIntegrity()
      setIsAuditing(false)
      if (report.healthy) {
        toast.success(`🎉 Ledger Health 100%: All ${report.totalEntriesAudited} entries are mathematically verified!`)
      } else {
        toast.warning(
          `⚠️ Found ${report.discrepanciesCount} balance discrepancies. Click to auto-reconcile!`,
          {
            action: {
              label: "Fix Now",
              onClick: () => {
                const res = reconcileAllLedgers()
                toast.success(res.message)
              },
            },
            duration: 8000,
          }
        )
      }
      setIsOpen(false)
    }, 300)
  }

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 no-print flex flex-col items-end gap-2 select-none font-sans">
      
      {/* Expanded Speed Dial Menu */}
      {isOpen && (
        <div className="bg-white/95 dark:bg-[#0c0c0f]/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-2xl space-y-1.5 min-w-[240px] animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-black/5">
          
          <div className="px-2 py-1 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              ⚡ Quick Actions Menu
            </span>
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-mono">
              Shortcuts
            </Badge>
          </div>

          {/* Action 1: New Bill of Lading */}
          <button
            onClick={() => {
              setView("bol")
              setIsOpen(false)
              toast.success("Opened Bill of Lading Editor")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <span>New Bill of Lading (BOL)</span>
          </button>

          {/* Action 2: Route Cost Optimizer */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("skybol:open-route-optimizer"))
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <span>Route Cost Optimizer (Corridors)</span>
          </button>

          {/* Action 3: Complete Docket Pack */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("skybol:open-batch-bundle"))
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span>1-Click Complete Docket Pack</span>
          </button>

          {/* Action 4: Export Logistics Quote */}
          <button
            onClick={() => {
              setView("export-calculator")
              setIsOpen(false)
              toast.success("Opened Export Logistics & Reefer Quote Engine")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-950/60 hover:text-orange-600 dark:hover:text-orange-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <span>Export & Reefer Quote Engine</span>
          </button>

          {/* Action 5: ACCI Chamber Suite */}
          <button
            onClick={() => {
              setView("acci-portal")
              setIsOpen(false)
              toast.success("Opened ACCI Chamber Documents Portal")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-600 dark:hover:text-amber-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span>ACCI Origin & Trade Suite</span>
          </button>


          {/* Action 4: Sky Bank Portal */}
          <button
            onClick={() => {
              setView("bank")
              setIsOpen(false)
              toast.success("Opened Sky Bank Portal")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span>Sky Bank & Treasury Ledgers</span>
          </button>

          {/* Action 5: Sky CMR Waybill */}
          <button
            onClick={() => {
              setView("sky-cmr")
              setIsOpen(false)
              toast.success("Opened Sky CMR Express")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <span>Sky CMR International Waybill</span>
          </button>

          {/* Action 6: Company Ledger */}
          <button
            onClick={() => {
              setView("ledger")
              setIsOpen(false)
              toast.success("Opened Company Ledger")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span>Company Account Ledger</span>
          </button>

          {/* Action 7: Executive Analytics */}
          <button
            onClick={() => {
              setView("analytics")
              setIsOpen(false)
              toast.success("Opened Executive Analytics")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <span>Executive Analytics Dashboard</span>
          </button>

          {/* Action 8: Invoice Pad */}
          <button
            onClick={() => {
              setView("invoice-pad")
              setIsOpen(false)
              toast.success("Opened Commercial Invoice Pad")
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 dark:hover:text-purple-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <span>Commercial Invoice Pad</span>
          </button>

          {/* Action 9: Run Ledger Health Audit */}
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-600 dark:hover:text-amber-400 transition-all text-left cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
            </div>
            <span>Ledger Integrity Audit</span>
          </button>


          {/* Action 6: Command Palette Shortcut */}
          <button
            onClick={() => {
              if (onOpenCommandPalette) onOpenCommandPalette()
              setIsOpen(false)
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Search className="w-3.5 h-3.5" />
              </div>
              <span>Command Palette</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono text-zinc-400">
              Ctrl+K
            </kbd>
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <div className="flex items-center gap-2">
        
        {/* Quick AI Trigger */}
        {onOpenChat && (
          <Button
            size="icon"
            onClick={onOpenChat}
            className="h-9.5 w-9.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all"
            title="Launch Gemini AI Data Copilot"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </Button>
        )}

        {/* Speed Dial Menu Toggle Button */}
        <Button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`h-9.5 px-3.5 rounded-full font-extrabold text-xs transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5 ${
            isOpen
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
          }`}
        >
          {isOpen ? (
            <>
              <X className="w-4 h-4" />
              <span>Close</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Quick Actions</span>
            </>
          )}
        </Button>
      </div>

    </div>
  )
}
