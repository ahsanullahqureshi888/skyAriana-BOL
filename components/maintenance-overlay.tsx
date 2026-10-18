"use client"

import React, { useEffect, useState } from "react"
import { AlertCircle, RefreshCw, Lock } from "lucide-react"

export function MaintenanceOverlay() {
  const [inMaintenance, setInMaintenance] = useState(false)
  const [reason, setReason] = useState("")

  useEffect(() => {
    let isMounted = true

    const checkMaintenance = async () => {
      try {
        const res = await fetch("/api/backup", { cache: "no-store" })
        const data = await res.json()
        if (isMounted && data.stats?.isLocked) {
          setInMaintenance(true)
          setReason(data.stats.lockedBy ? `Operation locked by: ${data.stats.lockedBy}` : "Database maintenance in progress")
        } else if (isMounted) {
          setInMaintenance(false)
        }
      } catch {}
    }

    checkMaintenance()
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkMaintenance()
      }
    }, 60000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  if (!inMaintenance) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span>System Lock Active: {reason}. Writes are safely queued or restricted during backup/restore.</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Synchronizing
      </div>
    </div>
  )
}
