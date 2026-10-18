"use client"

import React, { useState, useEffect } from "react"
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Laptop,
  Clock,
  ShieldCheck,
  Settings2,
  Sliders,
  FileText,
  Building2,
  RefreshCw,
  HardDrive,
  Download,
  Share2,
  ExternalLink,
  Edit2,
  Trash2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ConflictResolutionDialog } from "./conflict-resolution-dialog"
import { toast } from "sonner"
import type {
  SyncSettings,
  SyncDevice,
  SyncDiagnosticsReport,
  SyncConflict,
  SyncAuditLogEntry,
  SyncIntervalOption,
} from "@/lib/sync/types"

export function GoogleDriveSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings | null>(null)
  const [device, setDevice] = useState<SyncDevice | null>(null)
  const [diagnostics, setDiagnostics] = useState<SyncDiagnosticsReport | null>(null)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null)
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState("")

  const fetchSyncData = async () => {
    try {
      // Fetch status & settings
      const statusRes = await fetch("/api/sync/gdrive?action=status")
      if (statusRes.ok) {
        const json = await statusRes.json()
        if (json.success) {
          setSettings(json.settings)
          setDevice(json.device)
          setNewDeviceName(json.device?.deviceName || "")
        }
      }

      // Fetch conflicts
      const conflictsRes = await fetch("/api/sync/gdrive?action=conflicts")
      if (conflictsRes.ok) {
        const json = await conflictsRes.json()
        if (json.success && Array.isArray(json.conflicts)) {
          setConflicts(json.conflicts)
        }
      }

      // Fetch diagnostics
      const diagRes = await fetch("/api/sync/gdrive?action=diagnostics")
      if (diagRes.ok) {
        const json = await diagRes.json()
        if (json.success) {
          setDiagnostics(json.report)
        }
      }
    } catch (e) {
      console.error("[sync-settings] Failed to load sync data:", e)
    }
  }

  useEffect(() => {
    fetchSyncData()
  }, [])

  const updateSettingField = async (updates: Partial<SyncSettings>) => {
    if (!settings) return
    const updated = { ...settings, ...updates }
    setSettings(updated)
    setIsSaving(true)
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", settings: updated }),
      })
      if (res.ok) {
        toast.success("Settings updated successfully.")
      }
    } catch {
      toast.error("Failed to persist sync settings.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleCategory = (catKey: keyof SyncSettings["categories"]) => {
    if (!settings) return
    const currentCats = { ...settings.categories }
    currentCats[catKey] = !currentCats[catKey]
    updateSettingField({ categories: currentCats })
  }

  const handleTriggerSync = async () => {
    setIsSyncing(true)
    const toastId = toast.loading("Executing full Google Drive synchronization...")
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger", force: true }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "✓ All changes synchronized successfully", { id: toastId })
        fetchSyncData()
      } else {
        toast.error(json.message || "Sync failed", { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Sync error: ${e.message}`, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveDeviceName = async () => {
    if (!newDeviceName.trim()) return
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename-device", deviceName: newDeviceName.trim() }),
      })
      if (res.ok) {
        toast.success(`Device renamed to «${newDeviceName.trim()}»`)
        setIsEditingDeviceName(false)
        fetchSyncData()
      }
    } catch {
      toast.error("Failed to rename device.")
    }
  }

  const handleRetryFailed = async () => {
    const toastId = toast.loading("Retrying queued operations...")
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-failed" }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Retrying ${json.retriedCount} operations in background.`, { id: toastId })
        fetchSyncData()
      }
    } catch {
      toast.error("Retry failed.", { id: toastId })
    }
  }

  const handleExportDiagnostics = () => {
    if (!diagnostics) return
    const sanitized = {
      ...diagnostics,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `skybol-sync-diagnostics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Diagnostic report exported.")
  }

  if (!settings) {
    return <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">Loading Google Drive Sync configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle Banner */}
      <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Google Drive Automatic Data Sync</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Phase 2 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                Seamless multi-device synchronization keeping the application local-first and offline-first. Changes safely sync across office PCs, laptops, and mobile devices without overwriting newer records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-700">
              Synchronization: <span className={settings.enabled ? "text-blue-600" : "text-slate-400"}>{settings.enabled ? "ON" : "OFF"}</span>
            </span>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(val) => updateSettingField({ enabled: val })}
              className="cursor-pointer data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>

        {/* Status Strip when ON */}
        {settings.enabled && (
          <div className="mt-5 pt-4 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-bold text-slate-400">Connection:</span>
              <span className="inline-flex items-center gap-1.5 font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-bold text-slate-400">Last Sync:</span>
              <span className="font-bold text-slate-800">
                {diagnostics?.lastSuccessfulSync ? new Date(diagnostics.lastSuccessfulSync).toLocaleString() : "Just now"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-bold text-slate-400">Current Device:</span>
              <span className="font-bold text-slate-800 truncate" title={device?.deviceName}>
                {device?.deviceName || "Office PC"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600 justify-start sm:justify-end">
              <Button
                size="sm"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="h-7 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isSyncing ? <RotateCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Sync Now
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Active Conflicts Alert Banner if any */}
      {conflicts.length > 0 && (
        <Card className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-900">
                  {conflicts.length} Synchronization Conflict{conflicts.length > 1 ? "s" : ""} Detected
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Records were modified on another device concurrently. Review and reconcile to prevent data overwrite.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setActiveConflict(conflicts[0])
                setIsConflictModalOpen(true)
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 cursor-pointer"
            >
              Review Conflicts ({conflicts.length})
            </Button>
          </div>
        </Card>
      )}

      {/* Sync Behavior & Frequency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-600" /> Automation & Event Triggers
          </CardTitle>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Sync Automatically</span>
                <span className="text-[11px] text-slate-500">Run background sync periodically based on interval.</span>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(val) => updateSettingField({ autoSync: val })}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Sync on App Start</span>
                <span className="text-[11px] text-slate-500">Fetch latest cloud updates when application opens.</span>
              </div>
              <Switch
                checked={settings.syncOnStart}
                onCheckedChange={(val) => updateSettingField({ syncOnStart: val })}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Sync on App Close</span>
                <span className="text-[11px] text-slate-500">Flush pending queue to Google Drive prior to exit.</span>
              </div>
              <Switch
                checked={settings.syncOnClose}
                onCheckedChange={(val) => updateSettingField({ syncOnClose: val })}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Sync After Important Changes</span>
                <span className="text-[11px] text-slate-500">Immediately queue sync when saving a BOL or posting ledger.</span>
              </div>
              <Switch
                checked={settings.syncAfterImportantChanges}
                onCheckedChange={(val) => updateSettingField({ syncAfterImportantChanges: val })}
                className="cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Sync Interval */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-indigo-600" /> Sync Interval
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mb-4">
            Changes are debounced and batched to avoid excessive API requests.
          </CardDescription>

          <div className="space-y-2 text-xs">
            {[
              { id: "5m", label: "Every 5 minutes", desc: "High frequency for active office collaboration" },
              { id: "15m", label: "Every 15 minutes (Default)", desc: "Balanced performance and battery efficiency" },
              { id: "30m", label: "Every 30 minutes", desc: "Light background updates" },
              { id: "60m", label: "Every hour", desc: "Minimal bandwidth consumption" },
              { id: "manual", label: "Manual only", desc: "Only synchronize when clicking 'Sync Now'" },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  settings.interval === opt.id
                    ? "border-blue-300 bg-blue-50/60 text-blue-950 font-bold"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="syncInterval"
                  value={opt.id}
                  checked={settings.interval === opt.id}
                  onChange={() => updateSettingField({ interval: opt.id as SyncIntervalOption })}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <span className="block text-xs">{opt.label}</span>
                  <span className="block text-[10.5px] text-slate-400 font-normal">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Operational Categories Selection */}
      <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Operational Data Synchronization Scope
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Select which categories are synchronized across devices. Default: All operational records ON.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200 self-start">
            Granular Per-Record Sync
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
          {[
            { key: "bols", label: "Bills of Lading (BOL)", icon: "📦" },
            { key: "invoices", label: "Commercial Invoices", icon: "📑" },
            { key: "packingLists", label: "Packing Lists", icon: "📋" },
            { key: "cargoStickers", label: "Cargo Stickers", icon: "🏷️" },
            { key: "accountLedgers", label: "Account Ledgers", icon: "💼" },
            { key: "companyAccounts", label: "Company Accounts", icon: "🏢" },
            { key: "shippers", label: "Shippers Directory", icon: "🚢" },
            { key: "consignees", label: "Consignees", icon: "📥" },
            { key: "notifyParties", label: "Notify Parties", icon: "🔔" },
            { key: "routePresets", label: "Route Presets", icon: "🗺️" },
            { key: "companySettings", label: "Company Settings", icon: "⚙️" },
            { key: "uploadedDocuments", label: "Uploaded Documents (PDF)", icon: "📎" },
            { key: "generatedPdfs", label: "Generated PDFs", icon: "🖨️" },
          ].map((item) => {
            const isChecked = !!settings.categories[item.key as keyof SyncSettings["categories"]]
            return (
              <label
                key={item.key}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isChecked
                    ? "border-emerald-200 bg-emerald-50/40 text-emerald-950 font-bold"
                    : "border-slate-200 bg-slate-50/50 text-slate-400"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleToggleCategory(item.key as keyof SyncSettings["categories"])}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <span className="text-sm">{item.icon}</span>
                <span className="text-xs truncate">{item.label}</span>
              </label>
            )
          })}
        </div>
      </Card>

      {/* Device Identity & Connected Stations */}
      <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
          <Laptop className="w-4 h-4 text-slate-700" /> Device Identity & Connected Stations
        </CardTitle>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3">
          <div>
            <div className="flex items-center gap-2">
              {isEditingDeviceName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="h-8 text-xs font-bold w-52"
                    placeholder="Enter device friendly name"
                  />
                  <Button size="sm" onClick={handleSaveDeviceName} className="h-8 text-xs font-bold bg-blue-600 text-white">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDeviceName(false)} className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <h4 className="text-xs font-black text-slate-900">{device?.deviceName || "Office PC"}</h4>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-bold">
                    Current Device
                  </Badge>
                  <button
                    onClick={() => setIsEditingDeviceName(true)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                    title="Rename Device"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Permanent Device ID: <code className="text-slate-700 font-mono font-bold">{device?.deviceId}</code> • Platform: {device?.platform} • Version: {device?.appVersion}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Last active: {new Date(device?.lastSeenAt || Date.now()).toLocaleTimeString()}
          </div>
        </div>
      </Card>

      {/* Diagnostics Panel */}
      <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Synchronization Health Diagnostics
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Live status of cloud connection, queue integrity, and conflict counters.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportDiagnostics}
              className="h-8 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export Diagnostic Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryFailed}
              className="h-8 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" /> Retry Failed Ops
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10.5px]">Connection</span>
            <span className="font-bold text-emerald-700">{diagnostics?.connection || "OK"}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10.5px]">Pending Queue</span>
            <span className="font-bold text-slate-800">{diagnostics?.pendingQueueCount || 0}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10.5px]">Failed Operations</span>
            <span className={`font-bold ${(diagnostics?.failedOperationsCount || 0) > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {diagnostics?.failedOperationsCount || 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10.5px]">Active Conflicts</span>
            <span className={`font-bold ${(diagnostics?.conflictsCount || 0) > 0 ? "text-amber-600" : "text-slate-800"}`}>
              {diagnostics?.conflictsCount || 0}
            </span>
          </div>
        </div>
      </Card>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionDialog
        conflict={activeConflict}
        open={isConflictModalOpen}
        onOpenChange={setIsConflictModalOpen}
        onResolved={() => {
          fetchSyncData()
          setIsConflictModalOpen(false)
        }}
      />
    </div>
  )
}
