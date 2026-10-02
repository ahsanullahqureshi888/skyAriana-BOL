"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Upload, RotateCcw, ShieldCheck, Database, Loader2, Clock, HardDriveDownload } from "lucide-react"
import { toast } from "sonner"

interface BackupFile {
  filename: string
  size: number
  created_at: string
}

export function BackupRestoreTab() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const fetchBackups = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/accounting/backup")
      const data = await res.json()
      if (res.ok && data.success) {
        setBackups(data.backups || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true)
      const res = await fetch("/api/accounting/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Backup created: ${data.filename}`)
        fetchBackups()
      } else {
        toast.error(data.error || "Backup failed")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create backup")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore database from ${filename}? A rollback backup will be created before applying.`)) {
      return
    }

    try {
      setIsRestoring(true)
      const res = await fetch("/api/accounting/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", filename }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Restored ${data.accountsRestored} accounts and ${data.transactionsRestored} transactions successfully.`)
        fetchBackups()
      } else {
        toast.error(data.error || "Restore failed")
      }
    } catch (e: any) {
      toast.error(e.message || "Restore error")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string)
        if (!payload.accounts || !Array.isArray(payload.accounts)) {
          toast.error("Invalid ledger backup JSON file format.")
          return
        }

        if (!confirm(`Restore ${payload.accounts.length} accounts from uploaded file "${file.name}"?`)) {
          return
        }

        setIsRestoring(true)
        const res = await fetch("/api/accounting/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore", backup_payload: payload }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          toast.success(`Database restored from ${file.name}`)
          fetchBackups()
        } else {
          toast.error(data.error || "Restore failed")
        }
      } catch (err: any) {
        toast.error("Failed to parse JSON file.")
      } finally {
        setIsRestoring(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Accounting Snapshots & Rollback Protection</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated timestamped backups before and after Excel imports with one-click restore.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
          >
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDriveDownload className="h-3.5 w-3.5" />}
            Create Snapshot Now
          </Button>

          <label className="cursor-pointer">
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            <div className="h-8 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Upload className="h-3.5 w-3.5" />
              Upload & Restore
            </div>
          </label>
        </div>
      </div>

      {/* Backup Files Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Saved Snapshots ({backups.length})</h4>
          <Button variant="ghost" size="sm" onClick={fetchBackups} className="h-7 text-xs text-slate-500">
            <RotateCcw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-360px)] min-h-[260px] scrollbar-thin [scrollbar-color:rgba(148,163,184,0.45)_transparent]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-300 font-bold border-b sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="p-3 w-10 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">#</th>
                <th className="p-3 sticky top-0 bg-slate-100 dark:bg-slate-800">Backup File Name</th>
                <th className="p-3 w-36 sticky top-0 bg-slate-100 dark:bg-slate-800">Created Timestamp</th>
                <th className="p-3 w-28 text-right sticky top-0 bg-slate-100 dark:bg-slate-800">File Size</th>
                <th className="p-3 w-48 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading backups...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No backup files found yet. Click "Create Snapshot Now" above to save one.
                  </td>
                </tr>
              ) : (
                backups.map((b, idx) => (
                  <tr key={b.filename} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {b.filename}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      {(b.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <a
                        href={`/api/accounting/backup?file=${encodeURIComponent(b.filename)}`}
                        download={b.filename}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleRestore(b.filename)}
                        disabled={isRestoring}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
