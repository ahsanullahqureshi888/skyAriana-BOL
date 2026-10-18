"use client"

import React, { useState } from "react"
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Calendar,
  User,
  Shield,
  Tag,
  AlertTriangle,
  CheckCircle2,
  History,
  MessageSquare,
  Lock,
  Archive,
  Share2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ShipmentFileRecord } from "@/lib/types/shipment-file"
import { toast } from "sonner"

interface FilePreviewModalProps {
  file: ShipmentFileRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileUpdated?: () => void
}

export function FilePreviewModal({ file, open, onOpenChange, onFileUpdated }: FilePreviewModalProps) {
  const [zoom, setZoom] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [newNote, setNewNote] = useState<string>("")
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false)
  const [isReleasing, setIsReleasing] = useState<boolean>(false)

  if (!file) return null

  const isImage = ["jpg", "jpeg", "png", "webp"].includes(file.file_extension.toLowerCase())
  const isPdf = file.file_extension.toLowerCase() === "pdf"
  const previewUrl = `/api/files/${file.id}/preview`
  const downloadUrl = `/api/files/${file.id}/download`

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  const handleReleaseToClient = async () => {
    try {
      setIsReleasing(true)
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RELEASE_TO_CLIENT", userId: "Staff User" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Document released to Client Portal successfully")
        if (onFileUpdated) onFileUpdated()
      } else {
        toast.error(data.error || "Failed to release document")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error")
    } finally {
      setIsReleasing(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    try {
      setIsSubmittingNote(true)
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_NOTE", text: newNote.trim(), userId: "Staff User" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Internal note added")
        setNewNote("")
        if (onFileUpdated) onFileUpdated()
      } else {
        toast.error(data.error || "Failed to add note")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this document?")) return
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ARCHIVE", reason: "Manual user archive", userId: "Staff User" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Document archived successfully")
        onOpenChange(false)
        if (onFileUpdated) onFileUpdated()
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const today = new Date().toISOString().split("T")[0]
  const isExpired = file.expiry_date && file.expiry_date < today

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`w-full ${
          isFullscreen ? "max-w-[98vw] h-[98vh]" : "max-w-6xl h-[90vh] max-h-[920px]"
        } p-0 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:bg-slate-950 dark:border-slate-800 transition-all duration-300 my-auto`}
        showCloseButton={false}
      >
        {/* Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 truncate max-w-md">
                  {file.file_name}
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-[10px] font-bold">
                  v{file.version}
                </Badge>
                <Badge
                  className={`text-[10px] font-bold ${
                    file.status === "FINAL" || file.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : file.status === "SUPERSEDED"
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {file.status}
                </Badge>
                {file.client_visible && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold">
                    Client Portal Ready
                  </Badge>
                )}
                {isExpired && (
                  <Badge variant="destructive" className="text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Expired
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-[11px] text-slate-500 truncate mt-0.5">
                BOL: <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{file.bol_number}</span>
                {file.container_number ? ` • Container: ${file.container_number}` : ""} • Category:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{file.document_category_code}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRotate} title="Rotate 90°">
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleReset} title="Reset View">
                  <span className="text-[10px] font-bold">1:1</span>
                </Button>
              </div>
            )}

            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-xl border-slate-300"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <a
              href={downloadUrl}
              download={file.file_name}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-500 flex items-center justify-center transition-all cursor-pointer dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View (Preview Canvas 70% + Metadata Panel 30%) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100/60 dark:bg-slate-900/40">
          {/* Left Canvas: Document Preview */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-slate-900/5 dark:bg-slate-950/60">
            {isImage ? (
              <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt={file.file_name}
                  className="transition-transform duration-200 rounded-lg shadow-lg select-none"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    maxWidth: "100%",
                    maxHeight: "75vh",
                    objectFit: "contain",
                  }}
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={previewUrl}
                title={file.file_name}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-md"
              />
            ) : (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md max-w-md">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {file.file_name}
                </h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Direct in-browser preview is not available for .{file.file_extension} files. Download the file to view it on your device.
                </p>
                <a
                  href={downloadUrl}
                  download={file.file_name}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  <Download className="h-4 w-4" /> Download File ({Math.round(file.file_size / 1024)} KB)
                </a>
              </div>
            )}
          </div>

          {/* Right Sidebar: Metadata & Audit Panel */}
          <div className="w-full lg:w-88 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-5 space-y-4 text-xs">
              {/* Document Overview Card */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Document Identity
                </span>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doc#:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{file.document_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{file.document_date || "N/A"}</span>
                  </div>
                  {file.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expiry:</span>
                      <span className={isExpired ? "text-rose-600 font-bold" : "text-slate-700 dark:text-slate-300"}>
                        {file.expiry_date}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size:</span>
                    <span>{Math.round(file.file_size / 1024)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Checksum:</span>
                    <span className="text-[9px] truncate max-w-32" title={file.checksum}>
                      {file.checksum?.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Portal Visibility Section */}
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5 text-purple-600" />
                    Client Portal Access
                  </span>
                  <Badge variant={file.client_visible ? "default" : "secondary"} className="text-[9px]">
                    {file.client_visible ? "Visible" : "Hidden"}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {file.client_visible
                    ? "Authorized customer can view and download this file."
                    : "File is currently internal-only and not visible to the client."}
                </p>
                {!file.client_visible && (
                  <Button
                    size="sm"
                    disabled={isReleasing}
                    onClick={handleReleaseToClient}
                    className="w-full h-8 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Release to Client Portal
                  </Button>
                )}
              </div>

              {/* Internal Notes Feed */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Internal Staff Notes
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {file.internal_notes && file.internal_notes.length > 0 ? (
                    file.internal_notes.map((n) => (
                      <div key={n.id} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-[11px] space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                          <span>{n.user}</span>
                          <span className="text-slate-400">{n.date.split("T")[0]}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{n.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-[11px] italic">No internal notes added.</p>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                  <Button size="sm" type="submit" disabled={isSubmittingNote || !newNote.trim()} className="h-7 text-xs px-2.5 rounded-xl font-bold">
                    Add
                  </Button>
                </form>
              </div>

              {/* Audit Timeline */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> File Audit Log
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {file.audit_history?.map((h, i) => (
                    <div key={i} className="text-[10px] border-l-2 border-blue-400 pl-2 space-y-0.5">
                      <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>{h.event}</span>
                        <span className="text-slate-400">{h.timestamp.split("T")[0]}</span>
                      </div>
                      <p className="text-slate-500">{h.details || `By ${h.user}`}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger / Archive Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleArchive}
                  className="w-full text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40 rounded-xl"
                >
                  <Archive className="h-3.5 w-3.5 mr-1" />
                  Archive Document
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
