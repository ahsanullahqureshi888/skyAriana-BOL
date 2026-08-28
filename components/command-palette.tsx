"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useApp } from "@/lib/app-context"
import {
  Search,
  Building2,
  FileText,
  Receipt,
  Landmark,
  Settings,
  Cloud,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  Command,
  X,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  Truck,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCloudSync?: () => void
}

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  category: "Navigation" | "Documents" | "Accounts" | "Actions"
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  perform: () => void
}

export function CommandPalette({ open, onOpenChange, onOpenCloudSync }: CommandPaletteProps) {
  const { setView, accounts, selectAccount, selectCompany } = useApp()
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Listen for global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenChange(!open)
        return
      }

      // Alt + 1..8 Fast Navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "1") {
          e.preventDefault()
          setView("accounts")
        } else if (e.key === "2") {
          e.preventDefault()
          setView("companies")
        } else if (e.key === "3") {
          e.preventDefault()
          setView("ledger")
        } else if (e.key === "4") {
          e.preventDefault()
          setView("bol")
        } else if (e.key === "5") {
          e.preventDefault()
          setView("sky-cmr")
        } else if (e.key === "6") {
          e.preventDefault()
          setView("invoice-pad")
        } else if (e.key === "7") {
          e.preventDefault()
          setView("bank")
        } else if (e.key === "8") {
          e.preventDefault()
          setView("settings")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange, setView])

  // Retrieve saved BOL documents from localStorage for quick lookup
  const savedBols = useMemo(() => {
    if (typeof window === "undefined") return []
    try {
      const raw =
        window.localStorage.getItem("sky-bol-browser-documents") ||
        window.localStorage.getItem("skybol:saved-documents")
      if (raw) {
        const list = JSON.parse(raw)
        return Array.isArray(list) ? list : []
      }
    } catch (e) {}
    return []
  }, [open])

  // Build searchable items
  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-accounts",
        title: "Accounts & Shippers Hub",
        subtitle: "View all client accounts, ledger files & summary stats",
        category: "Navigation",
        icon: Building2,
        badge: "Alt+1",
        perform: () => {
          setView("accounts")
          onOpenChange(false)
        },
      },
      {
        id: "nav-bol",
        title: "Bill of Lading Editor",
        subtitle: "Create, edit, seal & print maritime/multimodal BOLs",
        category: "Navigation",
        icon: FileText,
        badge: "Alt+4",
        perform: () => {
          setView("bol")
          onOpenChange(false)
        },
      },
      {
        id: "nav-sky-cmr",
        title: "Sky CMR Border & International Consignment Note",
        subtitle: "Create, edit, auto-calculate & print international CMR border waybills",
        category: "Navigation",
        icon: Truck,
        badge: "Alt+5",
        perform: () => {
          setView("sky-cmr")
          onOpenChange(false)
        },
      },
      {
        id: "nav-invoice-pad",
        title: "Commercial Invoice Pad",
        subtitle: "Print-ready A4 commercial invoices, customs valuations & signatures",
        category: "Navigation",
        icon: Receipt,
        badge: "Alt+6",
        perform: () => {
          setView("invoice-pad")
          onOpenChange(false)
        },
      },
      {
        id: "nav-bank",
        title: "Sky Ariana Bank Portal",
        subtitle: "Live online banking, financial ledgers & currency transactions",
        category: "Navigation",
        icon: Landmark,
        badge: "Alt+7",
        perform: () => {
          setView("bank")
          onOpenChange(false)
        },
      },
      {
        id: "nav-settings",
        title: "System Settings & Roles",
        subtitle: "Manage users, access permissions, backups & cloud sync",
        category: "Navigation",
        icon: Settings,
        badge: "Alt+8",
        perform: () => {
          setView("settings")
          onOpenChange(false)
        },
      },
      {
        id: "action-cloud-sync",
        title: "Cloud Sync & Multi-Device Pairing",
        subtitle: "Synchronize all documents & ledgers instantly via secure relay code",
        category: "Actions",
        icon: Cloud,
        badge: "Cloud",
        perform: () => {
          onOpenChange(false)
          if (onOpenCloudSync) onOpenCloudSync()
        },
      },
    ]

    // Append Accounts
    for (const acc of accounts) {
      list.push({
        id: `acc-${acc.id}`,
        title: acc.name,
        subtitle: `${acc.companies?.length || 0} Shippers / Companies under this account`,
        category: "Accounts",
        icon: Building2,
        perform: () => {
          selectAccount(acc)
          setView("companies")
          onOpenChange(false)
        },
      })

      // Append Companies under Account
      for (const comp of acc.companies || []) {
        list.push({
          id: `comp-${comp.id}`,
          title: `${comp.name}`,
          subtitle: `Account: ${acc.name} • ${comp.ledgerEntries?.length || 0} Ledger Entries`,
          category: "Accounts",
          icon: FileSpreadsheet,
          perform: () => {
            selectAccount(acc)
            selectCompany(comp)
            setView("ledger")
            onOpenChange(false)
          },
        })
      }
    }

    // Append Saved BOLs
    for (const doc of savedBols.slice(0, 25)) {
      const blNum = doc.bol_number || doc.bill_of_lading_number || doc.id || "BOL"
      const shipper = doc.shipper_name || doc.shipper_line1 || ""
      const consignee = doc.consignee_name || doc.consignee_line1 || ""
      list.push({
        id: `bol-${doc.id || blNum}`,
        title: `BOL #${blNum}`,
        subtitle: [shipper, consignee].filter(Boolean).join(" ➔ ") || "Saved Bill of Lading",
        category: "Documents",
        icon: FileText,
        badge: "BOL",
        perform: () => {
          setView("bol")
          onOpenChange(false)
          window.dispatchEvent(
            new CustomEvent("skybol:load-bol-doc", { detail: { id: doc.id, doc } })
          )
        },
      })
    }

    // Append Saved CMR Waybills
    if (typeof window !== "undefined") {
      try {
        const rawCmr = window.localStorage.getItem("cmr_saved_archive")
        if (rawCmr) {
          const cmrList = JSON.parse(rawCmr)
          if (Array.isArray(cmrList)) {
            for (const doc of cmrList.slice(0, 25)) {
              const cmrNum = doc.cmr_number || doc.id || "CMR"
              const consignor = doc.consignor || ""
              const consignee = doc.consignee || ""
              list.push({
                id: `cmr-${doc.id || cmrNum}`,
                title: `${cmrNum} • ${doc.commodity || "Waybill"}`,
                subtitle: [consignor, consignee].filter(Boolean).join(" ➔ ") || "CMR International Waybill",
                category: "Documents",
                icon: Truck,
                badge: "CMR",
                perform: () => {
                  setView("sky-cmr")
                  onOpenChange(false)
                },
              })
            }
          }
        }
      } catch (e) {}
    }

    return list
  }, [accounts, savedBols, setView, selectAccount, selectCompany, onOpenChange, onOpenCloudSync])

  // Filter items by search query
  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase().trim()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    )
  }, [items, query])

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault()
      filtered[selectedIndex].perform()
    }
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white font-sans">
        <DialogTitle className="sr-only">Quick Command Hub</DialogTitle>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search accounts, BOLs, invoices, ledgers..."
            className="w-full bg-transparent border-0 outline-hidden text-sm sm:text-base text-white placeholder:text-slate-500 font-bold"
            autoFocus
          />
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
            ESC to close
          </span>
        </div>

        {/* List of Results */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-bold">
              No matching commands or documents found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.perform}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black truncate">{item.title}</span>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-md border ${
                            isSelected
                              ? "bg-white/20 border-white/30 text-white"
                              : "bg-slate-800/80 border-slate-700 text-slate-400"
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate font-medium mt-0.5 ${
                            isSelected ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 border ${
                        isSelected
                          ? "bg-white/25 border-white/40 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-bold">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Alt+1..7 Quick Jump</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sky Ariana Command Engine</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
