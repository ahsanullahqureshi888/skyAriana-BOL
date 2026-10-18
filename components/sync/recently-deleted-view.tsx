"use client"

import React, { useState, useEffect } from "react"
import {
  Trash2,
  RotateCcw,
  ShieldAlert,
  Clock,
  FileText,
  Building2,
  Calendar,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import type { Tombstone } from "@/lib/sync/types"

export function RecentlyDeletedView() {
  const [tombstones, setTombstones] = useState<Tombstone[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchTombstones = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sync/gdrive?action=tombstones")
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.tombstones)) {
          setTombstones(json.tombstones)
        }
      }
    } catch {
      toast.error("Failed to load recently deleted records.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTombstones()
  }, [])

  const handleRestore = async (tombstone: Tombstone) => {
    setActionLoading(tombstone.recordId)
    const toastId = toast.loading(`Restoring ${tombstone.title || tombstone.recordId}...`)
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore-tombstone",
          recordId: tombstone.recordId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`✓ ${tombstone.title || tombstone.recordId} restored successfully!`, { id: toastId })
        fetchTombstones()
      } else {
        toast.error("Could not restore record.", { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Restore error: ${e.message}`, { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDelete = async (recordId: string) => {
    setActionLoading(recordId)
    try {
      const res = await fetch("/api/sync/gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-tombstone",
          recordId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Record permanently removed.")
        fetchTombstones()
      }
    } catch {
      toast.error("Failed to permanently delete.")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Recently Deleted Records (Tombstones)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Synchronized records deleted on this or other devices. Records are automatically retained for 30 days before permanent cleanup.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 font-bold self-start">
            Retention: 30 Days
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {loading ? (
          <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">
            Loading recently deleted records...
          </div>
        ) : tombstones.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Trash2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">No recently deleted records</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Records deleted across connected devices will appear here for recovery.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tombstones.map((item) => (
              <div key={item.recordId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      {item.title || item.recordId}
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {item.type}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" /> Deleted: {new Date(item.deletedAt).toLocaleString()}
                      <span>• Device: {item.deletedByDevice}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === item.recordId}
                    onClick={() => handleRestore(item)}
                    className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={actionLoading === item.recordId}
                    onClick={() => handlePermanentDelete(item.recordId)}
                    className="h-8 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
