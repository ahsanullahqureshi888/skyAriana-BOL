"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Cloud,
  CloudCheck,
  CloudAlert,
  RotateCw,
  Clock,
  HardDrive,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { SyncStatusState, SyncDevice } from "@/lib/sync/types"

interface SyncStateResponse {
  connected: boolean
  device: SyncDevice
  progress: {
    state: SyncStatusState
    lastSyncTime: string | null
    currentStep?: string
    error?: string | null
  }
  queueStats: {
    pending: number
    failed: number
    uploading: number
  }
  conflictsCount: number
}

interface HeaderCloudSyncButtonProps {
  onOpenSettings?: () => void
}

export function HeaderCloudSyncButton({ onOpenSettings }: HeaderCloudSyncButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncData, setSyncData] = useState<SyncStateResponse | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/sync/gdrive?action=status")
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setSyncData(json)
          setIsSyncing(json.progress?.state === "checking" || json.progress?.state === "uploading" || json.progress?.state === "merging")
        }
      }
    } catch {
      // Offline fallback
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchSyncStatus()
      }
    }, 30000)

    const handleCustomEvent = () => fetchSyncStatus()
    window.addEventListener("skybol:sync-progress", handleCustomEvent)
    window.addEventListener("skybol:sync-settings-updated", handleCustomEvent)
    window.addEventListener("focus", handleCustomEvent)

    return () => {
      clearInterval(interval)
      window.removeEventListener("skybol:sync-progress", handleCustomEvent)
      window.removeEventListener("skybol:sync-settings-updated", handleCustomEvent)
      window.removeEventListener("focus", handleCustomEvent)
    }
  }, [])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSyncNow = async () => {
    setIsSyncing(true)
    const toastId = toast.loading("Starting Google Drive synchronization...")
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger", force: true }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message || "✓ All changes synchronized", { id: toastId })
        fetchSyncStatus()
      } else {
        toast.error(json.message || "Sync encountered an error", { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  const state = syncData?.progress?.state || "idle"
  const pendingCount = (syncData?.queueStats?.pending || 0) + (syncData?.queueStats?.failed || 0)
  const conflictsCount = syncData?.conflictsCount || 0
  const isConnected = syncData?.connected ?? true

  // Format last sync time nicely
  const formatLastSync = (iso: string | null | undefined) => {
    if (!iso) return "Not synced yet"
    const date = new Date(iso)
    if (isNaN(date.getTime())) return "Recently"
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Small Header Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7.5 px-2 rounded-lg font-bold text-xs gap-1 transition-all duration-150 active:scale-95 cursor-pointer shrink-0 ${
          conflictsCount > 0
            ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
            : isSyncing
            ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : pendingCount > 0
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
        title="Google Drive Auto Sync"
      >
        {isSyncing ? (
          <>
            <span className="text-blue-600 font-bold">☁</span>
            <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          </>
        ) : conflictsCount > 0 ? (
          <>
            <span className="text-red-600 font-bold">☁</span>
            <span className="font-extrabold text-red-600">!</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <span className="text-amber-600 font-bold">☁</span>
            <span className="px-1 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black">
              {pendingCount}
            </span>
          </>
        ) : (
          <>
            <span className="text-emerald-600 font-bold">☁</span>
            <span className="text-emerald-600 font-black">✓</span>
          </>
        )}
      </Button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 slide-in-from-top-1.5 duration-180 ease-out text-left">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">☁</span>
              <span className="text-xs font-bold text-slate-900">Google Drive</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                isConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isConnected ? "Connected" : "Offline"}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Last Sync:
              </span>
              <span className="font-bold text-slate-800">{formatLastSync(syncData?.progress?.lastSyncTime)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Laptop className="w-3.5 h-3.5" /> Device:
              </span>
              <span className="font-bold text-slate-800 truncate max-w-[130px]" title={syncData?.device?.deviceName}>
                {syncData?.device?.deviceName || "Office PC"}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-500">Pending Changes:</span>
              <span
                className={`font-black ${pendingCount > 0 ? "text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded" : "text-emerald-700"}`}
              >
                {pendingCount}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-500">Conflicts:</span>
              <span
                className={`font-black ${conflictsCount > 0 ? "text-red-600 bg-red-50 px-1.5 py-0.2 rounded" : "text-slate-600"}`}
              >
                {conflictsCount}
              </span>
            </div>
          </div>

          {/* Current Step Message */}
          {syncData?.progress?.currentStep && isSyncing && (
            <div className="mt-2.5 p-2 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-800 font-medium animate-pulse">
              {syncData.progress.currentStep}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Synchronizing...
                </>
              ) : (
                "Sync Now"
              )}
            </Button>

            {onOpenSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  onOpenSettings()
                }}
                className="w-full text-slate-600 hover:text-slate-900 font-semibold text-[11px] h-7 cursor-pointer"
              >
                View Sync History & Settings →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
