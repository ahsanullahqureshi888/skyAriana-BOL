"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Folder,
  FolderOpen,
  FileText,
  UploadCloud,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Archive,
  Image as ImageIcon,
  Shield,
  Truck,
  FileSpreadsheet,
  Award,
  DollarSign,
  Layers,
  Send,
  Eye,
  Check,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  ShipmentFileRecord,
  DocumentCategoryCode,
  FileCenterFilterOptions,
  FileCenterSummaryKPI,
  DocumentChecklistItem,
  BOLChecklistSummary,
} from "@/lib/types/shipment-file"
import dynamic from "next/dynamic"
const FilePreviewModal = dynamic(() => import("./file-preview-modal").then(m => m.FilePreviewModal), { ssr: false })
const FileUploadModal = dynamic(() => import("./file-upload-modal").then(m => m.FileUploadModal), { ssr: false })
import { toast } from "sonner"

type FileCenterSubpage =
  | "all"
  | "shipment"
  | "bol"
  | "customs"
  | "shipping"
  | "financial"
  | "truck"
  | "certificates"
  | "photos"
  | "missing"
  | "recent"
  | "archive"

const SUBPAGES: { key: FileCenterSubpage; label: string; icon: any; categoryCode?: DocumentCategoryCode }[] = [
  { key: "all", label: "All Files", icon: Layers },
  { key: "shipping", label: "Shipping Documents", icon: Folder, categoryCode: "SHIPPING" },
  { key: "customs", label: "Customs Documents", icon: Shield, categoryCode: "CUSTOMS" },
  { key: "commercial", label: "Commercial Invoices", icon: FileSpreadsheet, categoryCode: "COMMERCIAL" } as any,
  { key: "certificates", label: "Certificates", icon: Award, categoryCode: "CERTIFICATES" },
  { key: "truck", label: "Truck & Driver", icon: Truck, categoryCode: "TRANSPORT" },
  { key: "financial", label: "Financial & Receipts", icon: DollarSign, categoryCode: "FINANCIAL" },
  { key: "photos", label: "Photos Gallery", icon: ImageIcon, categoryCode: "PHOTOS" },
  { key: "missing", label: "Missing Documents", icon: AlertTriangle },
  { key: "recent", label: "Recently Uploaded", icon: Clock },
  { key: "archive", label: "Archive", icon: Archive },
]

export function FileCenterWorkspace() {
  const [subpage, setSubpage] = useState<FileCenterSubpage>("all")
  const [files, setFiles] = useState<ShipmentFileRecord[]>([])
  const [kpi, setKpi] = useState<FileCenterSummaryKPI | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>("")
  const [selectedBol, setSelectedBol] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [clientVisibleOnly, setClientVisibleOnly] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "date">("newest")

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<ShipmentFileRecord | null>(null)
  const [uploadCategory, setUploadCategory] = useState<DocumentCategoryCode>("SHIPPING")

  // WhatsApp Request Modal State
  const [requestDocModal, setRequestDocModal] = useState<{
    bolNumber: string
    documentType: string
    documentName: string
  } | null>(null)
  const [requestContactName, setRequestContactName] = useState<string>("")
  const [requestDueDate, setRequestDueDate] = useState<string>("")
  const [generatedWhatsApp, setGeneratedWhatsApp] = useState<string>("")

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const activeNav = SUBPAGES.find((s) => s.key === subpage)
      const params = new URLSearchParams()

      if (search.trim()) params.set("search", search.trim())
      if (selectedBol.trim()) params.set("bolNumber", selectedBol.trim())
      if (selectedStatus !== "ALL") params.set("status", selectedStatus)
      if (clientVisibleOnly) params.set("clientVisible", "true")
      params.set("sortBy", sortBy)

      if (activeNav?.categoryCode) {
        params.set("categoryCode", activeNav.categoryCode)
      }

      if (subpage === "archive") {
        params.set("includeArchived", "true")
        params.set("status", "ARCHIVED")
      }

      const res = await fetch(`/api/files?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setFiles(data.files || [])
        if (data.kpi) setKpi(data.kpi)
      }
    } catch (err: any) {
      console.error("Failed to load files:", err)
      toast.error("Failed to fetch documents")
    } finally {
      setLoading(false)
    }
  }, [subpage, search, selectedBol, selectedStatus, clientVisibleOnly, sortBy])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleOpenUploadForCategory = (cat: DocumentCategoryCode = "SHIPPING") => {
    setUploadCategory(cat)
    setIsUploadModalOpen(true)
  }

  const handleOpenWhatsAppRequest = (bolNumber: string, documentType: string, documentName: string) => {
    setRequestDocModal({ bolNumber, documentType, documentName })
    setRequestContactName("")
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    setRequestDueDate(in3Days)
    setGeneratedWhatsApp(
      `Salam,\n\nPlease provide the official document for our active shipment:\n📄 Document: *${documentName}*\n🚢 Bill of Lading: *${bolNumber}*\n📅 Due Date: ${in3Days}\n\nKindly send the scan or PDF for customs & clearance operations.\n\nThank you,\n*SKY ARIANA LOGISTICS*`
    )
  }

  const handleCopyWhatsApp = () => {
    if (!generatedWhatsApp) return
    navigator.clipboard.writeText(generatedWhatsApp)
    toast.success("WhatsApp document request message copied to clipboard!")
    setRequestDocModal(null)
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div data-file-center="true" className="w-full max-w-[1780px] mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 text-white flex items-center justify-center font-bold shadow-md shadow-blue-700/20 shrink-0">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 tracking-tight uppercase">
              Document & File Center
            </h1>
            <p className="text-xs text-slate-500">
              Digital shipment folders, customs documents, shipping-line B/Ls, truck credentials, invoices & inspection photos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFiles}
            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700 cursor-pointer gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenUploadForCategory("SHIPPING")}
            className="h-9 px-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Widgets */}
      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Files</span>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">{kpi.totalFiles}</p>
              <span className="text-[10px] text-blue-600 font-bold">{kpi.storageFormatted} storage</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Uploaded Today</span>
              <p className="text-xl font-black text-emerald-600">{kpi.filesUploadedToday}</p>
              <span className="text-[10px] text-slate-400">Active additions</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Review</span>
              <p className="text-xl font-black text-amber-600">{kpi.pendingReviewCount}</p>
              <span className="text-[10px] text-amber-700 font-bold">Needs verification</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Expired Docs</span>
              <p className="text-xl font-black text-rose-600">{kpi.expiredDocsCount}</p>
              <span className="text-[10px] text-rose-700 font-bold">Require renewal</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Client Portal Ready</span>
              <p className="text-xl font-black text-purple-600">{kpi.clientDocumentsReadyCount}</p>
              <span className="text-[10px] text-purple-700 font-bold">Released to clients</span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shipment Folders</span>
              <p className="text-xl font-black text-indigo-600">Active</p>
              <span className="text-[10px] text-slate-400">Linked to BOLs</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Subpage Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {SUBPAGES.map((s) => {
          const Icon = s.icon
          const isActive = subpage === s.key
          return (
            <button
              key={s.key}
              onClick={() => setSubpage(s.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search filename, doc number, BOL#, container, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>

          <input
            type="text"
            placeholder="Filter BOL#..."
            value={selectedBol}
            onChange={(e) => setSelectedBol(e.target.value)}
            className="w-36 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs font-bold text-blue-700 dark:text-blue-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved / Ready</option>
            <option value="FINAL">Final</option>
            <option value="RECEIVED">Received (Pending Review)</option>
            <option value="DRAFT">Draft</option>
            <option value="SUPERSEDED">Superseded Versions</option>
          </select>

          <label className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer text-xs font-bold">
            <input
              type="checkbox"
              checked={clientVisibleOnly}
              onChange={(e) => setClientVisibleOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Client Visible</span>
          </label>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="name">Sort: Filename</option>
            <option value="date">Sort: Issue Date</option>
          </select>
        </div>
      </div>

      {/* 5. Main Content View: Table vs Photos Gallery */}
      {subpage === "photos" ? (
        /* Photos Visual Gallery Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
              Shipment Inspection & Cargo Photos ({files.length})
            </span>
          </div>

          {files.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
              <ImageIcon className="h-10 w-10 mx-auto text-slate-300" />
              <p className="font-bold">No shipment inspection photos found matching current filters.</p>
              <Button size="sm" onClick={() => handleOpenUploadForCategory("PHOTOS")} className="rounded-xl">
                Upload Inspection Photos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileForPreview(file)}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-800 flex flex-col group"
                >
                  <div className="aspect-square bg-slate-950/10 dark:bg-slate-950/80 overflow-hidden relative flex items-center justify-center">
                    <img
                      src={`/api/files/${file.id}/preview`}
                      alt={file.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-slate-900/80 text-white text-[9px] uppercase font-bold">
                        {file.photo_type || "photo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate" title={file.file_name}>
                      {file.file_name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="font-bold text-blue-700 dark:text-blue-400 truncate max-w-24">
                        {file.bol_number}
                      </span>
                      <span>{file.uploaded_at.split("T")[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Document Files Table */
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Document / File</th>
                  <th className="px-3 py-3.5">Category</th>
                  <th className="px-3 py-3.5">BOL#</th>
                  <th className="px-3 py-3.5">Container</th>
                  <th className="px-3 py-3.5">Doc# & Date</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Client Portal</th>
                  <th className="px-3 py-3.5">Size</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold">No documents found matching current filters.</p>
                    </td>
                  </tr>
                ) : (
                  files.map((file) => {
                    const isExpired = file.expiry_date && file.expiry_date < today
                    return (
                      <tr
                        key={file.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedFileForPreview(file)}
                      >
                        {/* File Name & Version */}
                        <td className="px-4 py-3 min-w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 dark:text-slate-100 truncate max-w-xs hover:text-blue-600">
                                {file.file_name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <span>v{file.version}</span>
                                {file.document_type && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-28">{file.document_type.replace(/_/g, " ")}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {file.document_category_code}
                          </Badge>
                        </td>

                        {/* BOL */}
                        <td className="px-3 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                          {file.bol_number}
                        </td>

                        {/* Container */}
                        <td className="px-3 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {file.container_number || "—"}
                        </td>

                        {/* Doc Number & Date */}
                        <td className="px-3 py-3">
                          <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {file.document_number || "—"}
                          </p>
                          <span className="text-[10px] text-slate-400">{file.document_date || "—"}</span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <Badge
                            className={`text-[10px] font-bold ${
                              file.status === "FINAL" || file.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                : file.status === "SUPERSEDED"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-blue-100 text-blue-800 border-blue-300"
                            }`}
                          >
                            {file.status}
                          </Badge>
                        </td>

                        {/* Client Portal Visibility */}
                        <td className="px-3 py-3">
                          {file.client_visible ? (
                            <span className="text-purple-600 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Visible
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Hidden</span>
                          )}
                        </td>

                        {/* Size */}
                        <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">
                          {Math.round(file.file_size / 1024)} KB
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-blue-600"
                              onClick={() => setSelectedFileForPreview(file)}
                              title="Preview Document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            <a
                              href={`/api/files/${file.id}/download`}
                              download={file.file_name}
                              className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Download File"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Modals */}
      <FilePreviewModal
        file={selectedFileForPreview}
        open={Boolean(selectedFileForPreview)}
        onOpenChange={(open) => !open && setSelectedFileForPreview(null)}
        onFileUpdated={loadFiles}
      />

      <FileUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        defaultCategory={uploadCategory}
        onUploadSuccess={loadFiles}
      />

      {/* WhatsApp Document Request Modal */}
      {requestDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" />
                WhatsApp Document Request
              </h4>
              <button
                onClick={() => setRequestDocModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Generate a formatted WhatsApp message to request the missing{" "}
              <strong>{requestDocModal.documentName}</strong> for BOL{" "}
              <strong>{requestDocModal.bolNumber}</strong>.
            </p>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {generatedWhatsApp}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setRequestDocModal(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCopyWhatsApp}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Copy WhatsApp Message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
