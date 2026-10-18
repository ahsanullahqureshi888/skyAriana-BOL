"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Folder,
  FolderOpen,
  FileText,
  UploadCloud,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Plus,
  RefreshCw,
  Archive,
  Image,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type {
  DigitalShipmentFolder,
  ShipmentFileRecord,
  DocumentCategoryCode,
} from "@/lib/types/shipment-file"
import { FilePreviewModal } from "@/components/files/file-preview-modal"
import { FileUploadModal } from "@/components/files/file-upload-modal"
import { ShipmentFilesSkeleton } from "./shipment-files-skeleton"
import { toast } from "sonner"

interface BolFilesAttachmentsTabProps {
  bolNumber: string
  containerNumber?: string
  consigneeName?: string
  onRefreshParent?: () => void
}

export function BolFilesAttachmentsTab({
  bolNumber,
  containerNumber,
  consigneeName,
  onRefreshParent,
}: BolFilesAttachmentsTabProps) {
  const [folder, setFolder] = useState<DigitalShipmentFolder | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isPreparingZip, setIsPreparingZip] = useState<boolean>(false)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<ShipmentFileRecord | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<DocumentCategoryCode>("SHIPPING")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    SHIPPING: true,
    CUSTOMS: true,
    COMMERCIAL: true,
    CERTIFICATES: true,
    TRANSPORT: false,
    FINANCIAL: false,
    PHOTOS: true,
    OTHER: false,
  })

  const loadFolder = useCallback(async () => {
    if (!bolNumber) return
    setLoading(true)
    try {
      const res = await fetch(`/api/files/bol/${encodeURIComponent(bolNumber)}`)
      const data = await res.json()
      if (data.success && data.folder) {
        setFolder(data.folder)
        // Auto-collapse empty folders by default
        const initialCollapseState: Record<string, boolean> = {}
        data.folder.categories?.forEach((cat: { category_code: string; files: any[] }) => {
          initialCollapseState[cat.category_code] = cat.files && cat.files.length > 0
        })
        setExpandedCategories(initialCollapseState)
      }
    } catch (err: any) {
      console.error("Failed to load shipment folder:", err)
    } finally {
      setLoading(false)
    }
  }, [bolNumber])

  useEffect(() => {
    loadFolder()
  }, [loadFolder])

  const toggleCategory = (code: string) => {
    setExpandedCategories((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  const existingFileNames = useMemo(() => {
    if (!folder?.categories) return []
    const names: string[] = []
    folder.categories.forEach((cat) => {
      cat.files.forEach((f) => {
        if (f.file_name) names.push(f.file_name)
        if (f.original_file_name) names.push(f.original_file_name)
      })
    })
    return names
  }, [folder])

  const handleDownloadZip = () => {
    if (!bolNumber || isPreparingZip) return
    setIsPreparingZip(true)
    toast.info(`Preparing ZIP archive for ${bolNumber}...`, {
      description: "Packaging shipment documents in the background.",
      duration: 3500,
    })
    try {
      const downloadUrl = `/api/files/package/${encodeURIComponent(bolNumber)}/zip?scope=all`
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `${bolNumber}_Documents.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => {
        setIsPreparingZip(false)
        toast.success("ZIP download initiated")
      }, 1200)
    } catch (e) {
      setIsPreparingZip(false)
      toast.error("Failed to start ZIP download")
    }
  }

  if (loading && !folder) {
    return <ShipmentFilesSkeleton bolNumber={bolNumber} />
  }

  const checklist = folder?.checklist
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Shipment Folder Banner & Checklist */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-slate-900/10 border border-blue-200/80 dark:border-blue-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20 shrink-0">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Digital Shipment File
              </h3>
              <Badge className="bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-300 font-mono text-xs font-bold">
                {bolNumber}
              </Badge>
              {checklist && (
                <Badge
                  className={`text-[11px] font-bold ${
                    checklist.is_complete
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {checklist.is_complete ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Documents Complete ({checklist.completeness_ratio})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-600" />
                      Required Docs: {checklist.completeness_ratio} Complete
                    </span>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consignee:{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {(folder?.customer_name && folder.customer_name !== "Unassigned Customer")
                  ? folder.customer_name
                  : (consigneeName || folder?.customer_name || "Unassigned Customer")}
              </strong>{" "}
              • Total Attachments: <strong>{folder?.total_files || 0}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadZip}
            disabled={!folder || folder.total_files === 0 || isPreparingZip}
            className="h-9 px-3.5 text-xs font-bold rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer shadow-2xs gap-1.5"
          >
            {isPreparingZip ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                <span>Preparing ZIP...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>Download All (ZIP)</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedCategoryForUpload("SHIPPING")
              setIsUploadModalOpen(true)
            }}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* Missing Required Documents Alert Checklist (if incomplete) */}
      {checklist && !checklist.is_complete && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Missing Mandatory Shipment Documents
            </span>
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
              {checklist.items.filter((it) => it.is_mandatory && it.status !== "AVAILABLE").length} pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {checklist.items
              .filter((it) => it.is_mandatory && it.status !== "AVAILABLE")
              .map((it) => (
                <div
                  key={it.document_type}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-900/60 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{it.name}</p>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                      {it.status === "EXPIRED" ? "Expired Document" : "Required"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCategoryForUpload(it.category_code)
                      setIsUploadModalOpen(true)
                    }}
                    className="h-7 px-2 text-[10px] font-bold rounded-lg border-amber-300 hover:bg-amber-100 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                  >
                    Upload
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Structured Category Folders */}
      <div className="space-y-3">
        {folder?.categories.map((cat) => {
          const isExpanded = Boolean(expandedCategories[cat.category_code])
          const fileCount = cat.files.length

          return (
            <div
              key={cat.category_code}
              className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden shadow-xs"
            >
              {/* Folder Header */}
              <div
                onClick={() => toggleCategory(cat.category_code)}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-4 w-4 text-blue-600 shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                    {cat.category_name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                    {fileCount}
                  </Badge>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategoryForUpload(cat.category_code)
                      setIsUploadModalOpen(true)
                    }}
                    className="h-7 text-[11px] font-bold px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add File
                  </Button>
                </div>
              </div>

              {/* Folder File Grid */}
              {isExpanded && (
                <div className="p-4">
                  {fileCount === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <p>No documents attached in {cat.category_name} yet.</p>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setSelectedCategoryForUpload(cat.category_code)
                          setIsUploadModalOpen(true)
                        }}
                        className="text-xs font-bold text-blue-600 mt-1"
                      >
                        Upload to this folder
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {cat.files.map((file) => {
                        const isExpired = file.expiry_date && file.expiry_date < today
                        const isImage = ["jpg", "jpeg", "png", "webp"].includes(file.file_extension.toLowerCase())

                        return (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFileForPreview(file)}
                            className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-400 dark:hover:border-blue-700 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between space-y-2.5 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isImage ? (
                                  <Image className="h-4 w-4 text-purple-600 shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">
                                    {file.file_name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                      v{file.version || 1}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {Math.round(file.file_size / 1024)} KB
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <Badge
                                className={`text-[9px] font-bold shrink-0 ${
                                  file.status === "FINAL" || file.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                    : file.status === "SUPERSEDED"
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {file.status}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span>{file.document_date || file.uploaded_at.split("T")[0]}</span>
                              <div className="flex items-center gap-1.5">
                                {file.client_visible && (
                                  <span className="text-purple-600 font-bold" title="Visible in Customer Portal">
                                    Client Portal
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Expired
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={selectedFileForPreview}
        open={Boolean(selectedFileForPreview)}
        onOpenChange={(open) => !open && setSelectedFileForPreview(null)}
        onFileUpdated={loadFolder}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        defaultBolNumber={bolNumber}
        defaultContainerNumber={containerNumber}
        defaultCategory={selectedCategoryForUpload}
        existingFileNames={existingFileNames}
        onUploadSuccess={loadFolder}
      />
    </div>
  )
}
