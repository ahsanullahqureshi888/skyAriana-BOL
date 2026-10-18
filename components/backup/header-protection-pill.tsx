"use client"

import React, { useState, useEffect } from "react"
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react"

interface HeaderProtectionPillProps {
  onOpenBackupCenter: () => void
}

export function HeaderProtectionPill({ onOpenBackupCenter }: HeaderProtectionPillProps) {
  const [status, setStatus] = useState<"STRONGLY PROTECTED" | "PROTECTED" | "WARNING" | "AT RISK">("PROTECTED")

  useEffect(() => {
    let mounted = true
    const checkProtection = async () => {
      try {
        const res = await fetch("/api/backup/operations")
        const json = await res.json()
        if (mounted && json.success && json.data?.protectionStatus) {
          setStatus(json.data.protectionStatus)
        }
      } catch {}
    }

    checkProtection()
    const timer = setInterval(checkProtection, 60_000)
    const handleStatusUpdate = () => checkProtection()
    if (typeof window !== "undefined") {
      window.addEventListener("skybol:backup-completed", handleStatusUpdate)
      window.addEventListener("focus", handleStatusUpdate)
    }

    return () => {
      mounted = false
      clearInterval(timer)
      if (typeof window !== "undefined") {
        window.removeEventListener("skybol:backup-completed", handleStatusUpdate)
        window.removeEventListener("focus", handleStatusUpdate)
      }
    }
  }, [])

  const isProtected = status === "PROTECTED" || status === "STRONGLY PROTECTED"
  const isWarning = status === "WARNING"

  return (
    <button
      type="button"
      onClick={onOpenBackupCenter}
      title={`Data Protection Status: ${status} — Click to open Backup Center`}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
        isProtected
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          : isWarning
          ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
      }`}
    >
      {isProtected ? (
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
      ) : isWarning ? (
        <AlertTriangle className="h-3 w-3 text-amber-500" />
      ) : (
        <AlertOctagon className="h-3 w-3 text-red-500" />
      )}
      <span>{isProtected ? "✓ Protected" : isWarning ? "⚠ Warning" : "⚠ At Risk"}</span>
    </button>
  )
}
