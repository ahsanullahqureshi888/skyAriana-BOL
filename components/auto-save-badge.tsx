"use client"

import React from "react"
import { RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react"
import { AutoSaveStatus } from "@/lib/services/auto-save-engine"

interface AutoSaveBadgeProps {
  status: AutoSaveStatus
  lastSavedAt?: Date | null
  className?: string
  label?: string
  showTimestamp?: boolean
}

export function AutoSaveBadge({
  status,
  lastSavedAt,
  className = "",
  label,
  showTimestamp = true,
}: AutoSaveBadgeProps) {
  if (status === "idle" && !lastSavedAt) {
    return null
  }

  const timeStr = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : ""

  return (
    <div
      data-autosave-status={status}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`autosave-status inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold select-none ${
        status === "saving"
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          : status === "error"
          ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
      } ${className}`}
    >
      {status === "saving" ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
          <span>{label || "Saving..."}</span>
        </>
      ) : status === "error" ? (
        <>
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span>Save Error</span>
        </>
      ) : (
        <>
          <span className="autosave-status-dot relative flex h-2 w-2" aria-hidden="true">
            <span className="autosave-status-ripple absolute inline-flex h-full w-full rounded-full bg-emerald-400"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{label || "Auto-Saved"}</span>
          {showTimestamp && timeStr && (
            <span className="text-[10px] opacity-70 font-mono">({timeStr})</span>
          )}
        </>
      )}
    </div>
  )
}

