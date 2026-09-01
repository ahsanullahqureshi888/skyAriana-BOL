"use client"

import React, { useState, useEffect } from "react"
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Database,
  Trash2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface Snapshot {
  id: string
  timestamp: string
  label: string
  totalAccounts: number
  totalEntries: number
  totalInvoices: number
  data: any
}

export function DataBackupManager() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [isRestoring, setIsRestoring] = useState<boolean>(false)

  // Load existing snapshots from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("skybol:system-snapshots")
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) setSnapshots(list)
      }
    } catch (_) {}
  }, [])

  // Save snapshots list
  const saveSnapshots = (newList: Snapshot[]) => {
    setSnapshots(newList)
    try {
      window.localStorage.setItem("skybol:system-snapshots", JSON.stringify(newList))
    } catch (_) {}
  }

  // Create a new snapshot
  const handleCreateSnapshot = (customLabel?: string) => {
    setIsCreating(true)
    try {
      const accountsRaw = window.localStorage.getItem("sky-bol-browser-accounts") || window.localStorage.getItem("skybol:saved-accounts")
      const invoicesRaw = window.localStorage.getItem("skybol:invoices")
      const bolsRaw = window.localStorage.getItem("sky-bol-browser-documents") || window.localStorage.getItem("skybol:saved-documents")
      const ledgersRaw = window.localStorage.getItem("skybol:account-ledgers")
      const companySettingsRaw = window.localStorage.getItem("skybol:company-settings")
      const exchangeRatesRaw = window.localStorage.getItem("skybol:live-exchange-rates")

      const accounts = accountsRaw ? JSON.parse(accountsRaw) : []
      const invoices = invoicesRaw ? JSON.parse(invoicesRaw) : []
      const bols = bolsRaw ? JSON.parse(bolsRaw) : []
      const ledgers = ledgersRaw ? JSON.parse(ledgersRaw) : {}

      let totalEntries = 0
      if (Array.isArray(accounts)) {
        accounts.forEach((acc: any) => {
          if (Array.isArray(acc.companies)) {
            acc.companies.forEach((comp: any) => {
              if (Array.isArray(comp.ledgerEntries)) {
                totalEntries += comp.ledgerEntries.length
              }
            })
          }
        })
      }

      const snapshot: Snapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        label: customLabel || `Manual Checkpoint (${new Date().toLocaleTimeString()})`,
        totalAccounts: Array.isArray(accounts) ? accounts.length : 0,
        totalEntries,
        totalInvoices: Array.isArray(invoices) ? invoices.length : 0,
        data: {
          accounts,
          invoices,
          bols,
          ledgers,
          companySettings: companySettingsRaw ? JSON.parse(companySettingsRaw) : null,
          exchangeRates: exchangeRatesRaw ? JSON.parse(exchangeRatesRaw) : null,
        },
      }

      const updated = [snapshot, ...snapshots.slice(0, 19)] // Keep latest 20 snapshots
      saveSnapshots(updated)
      toast.success(`Created system snapshot "${snapshot.label}"!`)
    } catch (err: any) {
      toast.error(`Failed to create snapshot: ${err.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  // Restore snapshot
  const handleRestoreSnapshot = (snap: Snapshot) => {
    if (!confirm(`Are you sure you want to restore the system to snapshot "${snap.label}" created on ${snap.timestamp}? Current unsaved data will be replaced.`)) {
      return
    }

    setIsRestoring(true)
    try {
      const { accounts, invoices, bols, ledgers, companySettings, exchangeRates } = snap.data

      if (accounts) {
        window.localStorage.setItem("sky-bol-browser-accounts", JSON.stringify(accounts))
        window.localStorage.setItem("skybol:saved-accounts", JSON.stringify(accounts))
      }
      if (invoices) {
        window.localStorage.setItem("skybol:invoices", JSON.stringify(invoices))
      }
      if (bols) {
        window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(bols))
        window.localStorage.setItem("skybol:saved-documents", JSON.stringify(bols))
      }
      if (ledgers) {
        window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(ledgers))
      }
      if (companySettings) {
        window.localStorage.setItem("skybol:company-settings", JSON.stringify(companySettings))
        window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(companySettings))
      }
      if (exchangeRates) {
        window.localStorage.setItem("skybol:live-exchange-rates", JSON.stringify(exchangeRates))
      }

      window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
      window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))

      toast.success(`Successfully restored system to snapshot "${snap.label}"!`)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      toast.error(`Failed to restore snapshot: ${err.message}`)
    } finally {
      setIsRestoring(false)
    }
  }

  // Export full system backup to JSON file
  const handleExportFullJSON = () => {
    try {
      const accountsRaw = window.localStorage.getItem("sky-bol-browser-accounts") || window.localStorage.getItem("skybol:saved-accounts")
      const invoicesRaw = window.localStorage.getItem("skybol:invoices")
      const bolsRaw = window.localStorage.getItem("sky-bol-browser-documents") || window.localStorage.getItem("skybol:saved-documents")
      const ledgersRaw = window.localStorage.getItem("skybol:account-ledgers")
      const companySettingsRaw = window.localStorage.getItem("skybol:company-settings")
      const exchangeRatesRaw = window.localStorage.getItem("skybol:live-exchange-rates")

      const payload = {
        app: "SKY_ARIANA_OPERATING_SYSTEM",
        version: "3.2",
        exportedAt: new Date().toISOString(),
        data: {
          accounts: accountsRaw ? JSON.parse(accountsRaw) : [],
          invoices: invoicesRaw ? JSON.parse(invoicesRaw) : [],
          bols: bolsRaw ? JSON.parse(bolsRaw) : [],
          ledgers: ledgersRaw ? JSON.parse(ledgersRaw) : {},
          companySettings: companySettingsRaw ? JSON.parse(companySettingsRaw) : null,
          exchangeRates: exchangeRatesRaw ? JSON.parse(exchangeRatesRaw) : null,
        },
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `SkyAriana-Complete-Backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Downloaded complete system backup JSON file!")
    } catch (err: any) {
      toast.error(`Failed to export data: ${err.message}`)
    }
  }

  // Import full system backup from JSON file
  const handleImportFullJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)

        if (!parsed || !parsed.data) {
          throw new Error("Invalid backup file format. Expected a Sky Ariana backup envelope.")
        }

        const { accounts, invoices, bols, ledgers, companySettings, exchangeRates } = parsed.data

        if (Array.isArray(accounts)) {
          window.localStorage.setItem("sky-bol-browser-accounts", JSON.stringify(accounts))
          window.localStorage.setItem("skybol:saved-accounts", JSON.stringify(accounts))
        }
        if (Array.isArray(invoices)) {
          window.localStorage.setItem("skybol:invoices", JSON.stringify(invoices))
        }
        if (Array.isArray(bols)) {
          window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(bols))
          window.localStorage.setItem("skybol:saved-documents", JSON.stringify(bols))
        }
        if (ledgers && typeof ledgers === "object") {
          window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(ledgers))
        }
        if (companySettings) {
          window.localStorage.setItem("skybol:company-settings", JSON.stringify(companySettings))
          window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(companySettings))
        }
        if (exchangeRates) {
          window.localStorage.setItem("skybol:live-exchange-rates", JSON.stringify(exchangeRates))
        }

        window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
        window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))

        // Auto-create snapshot of imported state
        handleCreateSnapshot(`Imported from ${file.name}`)

        toast.success("Successfully restored system from backup file!")
        setTimeout(() => window.location.reload(), 1200)
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  // Delete snapshot
  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id)
    saveSnapshots(updated)
    toast.success("Snapshot deleted")
  }

  return (
    <div className="space-y-6">
      {/* Top Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">System Data & Snapshot Vault</h3>
            <p className="text-xs text-slate-400">
              1-click local checkpoints, full offline JSON export, and instant rollback protection.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleCreateSnapshot()}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40 text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {isCreating ? "Saving..." : "Create Checkpoint"}
          </Button>

          <Button
            variant="outline"
            onClick={handleExportFullJSON}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
            Export JSON
          </Button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5 text-amber-400" />
            <span>Restore JSON</span>
            <input type="file" accept=".json" onChange={handleImportFullJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Snapshots History Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Snapshot History ({snapshots.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Recent local checkpoints available for instant 1-click system rollback.
              </CardDescription>
            </div>
            <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-500/30 font-mono text-[10px]">
              Active Storage: Local / RAM
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Database className="h-8 w-8 mx-auto opacity-40 text-blue-400" />
              <p className="text-xs font-bold">No snapshots recorded yet.</p>
              <p className="text-[11px] text-slate-600">
                Click &quot;Create Checkpoint&quot; above to create your first protected snapshot!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 max-h-[380px] overflow-y-auto">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-200 truncate">{snap.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{snap.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                        {snap.totalAccounts} Accounts
                      </span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 font-mono font-bold">
                        {snap.totalEntries} Ledger Entries
                      </span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-indigo-400 font-mono">
                        {snap.totalInvoices} Invoices
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreSnapshot(snap)}
                      disabled={isRestoring}
                      className="h-7 px-2.5 rounded-lg text-xs font-bold bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border-indigo-500/30 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="h-7 w-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 cursor-pointer"
                      title="Delete Snapshot"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

