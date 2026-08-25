"use client"

import { useEffect, useMemo, useState, useCallback, startTransition, memo, type ChangeEvent, type MouseEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Grid3X3,
  List,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Table,
  Trash2,
  Truck,
  Upload,
  X,
  Zap,
  ArrowUpDown,
  RotateCcw,
  Boxes,
  Scale,
  DollarSign,
  MapPin,
  User,
  Receipt,
  FileSpreadsheet,
  Cloud,
} from "lucide-react"
import { generateBOLPDFBlob, savePDFToDevice, buildBolSmartFileName } from "@/lib/utils/pdf-upload"
import { CloudSyncModal } from "./cloud-sync-modal"

type DocumentCategoryKey = "all" | "latest" | "account" | "export" | "import" | "with-pdf"
type ViewMode = "grid" | "list" | "table"
type SortOption = "latest" | "oldest" | "bol_asc" | "shipper_asc"

const DOCUMENT_CATEGORY_STORAGE_KEY = "sky-bol-document-categories"
const ACCOUNT_COMPANY_PDFS_STORAGE_KEY = "sky-bol-account-company-pdfs"
const ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY = "sky-bol-account-custom-companies"

interface SavedDocument {
  id: string
  bol_number: string
  issue_date: string
  shipper_name: string
  consignee_name: string
  truck_number?: string
  driver_name?: string
  driver_father_name?: string
  driver_contact?: string
  driver_rent?: string
  number_of_packages?: string
  kgs_per_carton?: string
  gross_weight_per_carton?: string
  rate_per_kgs?: string
  goods_value?: string
  net_weight?: string
  gross_weight?: string
  goods_description?: string
  description_of_goods?: string
  cargo_description?: string
  invoice_no?: string
  invoice_number?: string
  remarks?: string
  port_of_loading?: string
  port_of_discharge?: string
  place_of_delivery?: string
  origin_country?: string
  destination_country?: string
  container_numbers?: string
  seal_numbers?: string
  measurement?: string
  created_at: string
  pdf_url?: string | null
  pdf_uploaded_at?: string | null
}

interface AccountCompanyPdfFile {
  id: string
  name: string
  pdfUrl: string
  uploadedAt: string
}

interface AccountCompanyRecord {
  companyName: string
  pdfs: AccountCompanyPdfFile[]
  pdfUrl?: string | null
  uploadedAt?: string | null
}

interface SavedDocumentsProps {
  onLoadDocument: (id: string, targetTab?: string) => void
  refreshTrigger?: number
  variant?: "sidebar" | "sheet"
}

const categoryButtons: { key: DocumentCategoryKey; label: string }[] = [
  { key: "all", label: "All Documents" },
  { key: "latest", label: "⚡ Latest BOLs" },
  { key: "with-pdf", label: "📄 Uploaded PDFs" },
  { key: "account", label: "🏢 Account" },
  { key: "export", label: "📤 Export" },
  { key: "import", label: "📥 Import" },
]

function extractInvoiceNo(doc: SavedDocument): string {
  if (doc.invoice_no && doc.invoice_no.trim()) return doc.invoice_no.trim()
  if (doc.invoice_number && doc.invoice_number.trim()) return doc.invoice_number.trim()
  const texts = [
    doc.cargo_description,
    doc.goods_description,
    doc.description_of_goods,
    doc.remarks,
  ].filter(Boolean).join(" ")
  const match = texts.match(/(?:invoice|inv|fakt[ou]r|فاکتور)\s*(?:no|number|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]*)/i)
  return match?.[1]?.trim() || ""
}

interface DocumentGridCardProps {
  doc: SavedDocument
  isLatest: boolean
  hasUploadedPdf: boolean
  invoiceNo: string
  assignedCategory?: string
  uploadingId: string | null
  deletingId: string | null
  openingPdfId: string | null
  onEdit: (doc: SavedDocument) => void
  onDownload: (doc: SavedDocument) => void
  onPreview: (doc: SavedDocument) => void
  onDuplicate: (doc: SavedDocument) => void
  onOpenPdf: (doc: SavedDocument) => void
  onDelete: (id: string, e: MouseEvent) => void
  onCategoryAssign: (doc: SavedDocument, cat: Exclude<DocumentCategoryKey, "all" | "latest" | "with-pdf">) => void
  onFileInput: (doc: SavedDocument) => (e: ChangeEvent<HTMLInputElement>) => void
}

const DocumentGridCard = memo(function DocumentGridCard({
  doc,
  isLatest,
  hasUploadedPdf,
  invoiceNo,
  assignedCategory,
  uploadingId,
  deletingId,
  openingPdfId,
  onEdit,
  onDownload,
  onPreview,
  onDuplicate,
  onOpenPdf,
  onDelete,
  onCategoryAssign,
  onFileInput,
}: DocumentGridCardProps) {
  return (
    <article
      style={{ contentVisibility: "auto", containIntrinsicSize: "380px" }}
      className="group relative flex min-h-[360px] flex-col rounded-[22px] sm:rounded-[26px] border border-slate-200/90 bg-white/95 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-white hover:shadow-md overflow-hidden"
    >
      {/* Top Accent Gradient Line */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${isLatest ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-sm shadow-amber-500/50" : "bg-gradient-to-r from-[#0a2540] via-blue-600 to-indigo-500"}`} />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5 pt-1 relative z-10 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[72%] flex-wrap">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0a2540] via-blue-900 to-[#1d4ed8] px-2.5 py-1 text-[11px] font-black font-mono tracking-tight text-white shadow-sm shadow-blue-950/20 truncate">
            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-200" />
            <span className="truncate" title={doc.bol_number}>{doc.bol_number || "BOL"}</span>
          </div>
          {invoiceNo && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 text-[9.5px] font-black font-mono text-emerald-900 shadow-2xs shrink-0" title={`Invoice No: ${invoiceNo}`}>
              <Receipt className="h-3 w-3 text-emerald-700 shrink-0" />
              <span className="truncate">INV: {invoiceNo}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {isLatest && (
            <span className="rounded-full px-2 py-0.5 text-[8.5px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-xs uppercase tracking-wider">
              LATEST
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
            hasUploadedPdf ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs" : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}>
            {hasUploadedPdf ? "PDF" : "No PDF"}
          </span>
        </div>
      </div>

      {/* Shipper & Consignee */}
      <div className="mt-2.5 space-y-1 relative z-10">
        <p className="text-xs font-black text-slate-950 leading-snug break-words line-clamp-1" title={doc.shipper_name}>
          {doc.shipper_name || "No shipper"}
        </p>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1 border border-slate-200/80 text-[11px] font-bold text-slate-700 leading-tight" title={doc.consignee_name}>
          <ArrowRight className="h-3 w-3 text-blue-600 shrink-0" />
          <span className="truncate">{doc.consignee_name || "No consignee"}</span>
        </div>
      </div>

      {/* Route / Ports (if present) */}
      {(doc.port_of_loading || doc.port_of_discharge || doc.origin_country || doc.destination_country) && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100/80 border border-slate-200/70 rounded-lg px-2 py-0.5 relative z-10 truncate">
          <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
          <span className="truncate">
            {doc.port_of_loading || doc.origin_country || "Origin"} ➔ {doc.port_of_discharge || doc.destination_country || "Destination"}
          </span>
        </div>
      )}

      {/* Cargo & Weight Details Box */}
      {(doc.number_of_packages || doc.net_weight || doc.gross_weight || doc.goods_value || doc.rate_per_kgs) && (
        <div className="mt-2 rounded-xl bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200/80 p-2.5 text-[10.5px] space-y-1.5 relative z-10 shadow-2xs">
          {/* Row 1: Packages & Weights */}
          <div className="flex items-start justify-between gap-1.5 text-slate-800 font-extrabold flex-wrap">
            {doc.number_of_packages && (
              <div className="flex items-center gap-1 font-mono text-blue-950 font-black text-[10.5px]">
                <Boxes className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="break-words">{doc.number_of_packages}</span>
              </div>
            )}
            {(doc.net_weight || doc.gross_weight) && (
              <div className="flex items-center gap-1 font-mono text-slate-900 font-extrabold text-[10px] bg-white/90 border border-blue-100/90 px-1.5 py-0.5 rounded-md shrink-0 shadow-2xs ml-auto">
                <Scale className="h-3 w-3 text-indigo-600 shrink-0" />
                <span>{doc.net_weight ? `Net: ${doc.net_weight}` : `Gross: ${doc.gross_weight}`}</span>
              </div>
            )}
          </div>

          {/* Row 2: Goods Value & Rate */}
          {(doc.goods_value || doc.rate_per_kgs) && (
            <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-950 border-t border-blue-200/60 pt-1.5 font-bold flex-wrap">
              {doc.goods_value && (
                <div className="flex items-center gap-0.5 font-mono font-black text-emerald-900">
                  <DollarSign className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="break-words">{doc.goods_value}</span>
                </div>
              )}
              {doc.rate_per_kgs && (
                <div className="font-mono text-slate-600 text-[9.5px] bg-white/80 border border-slate-200/70 px-1.5 py-0.5 rounded shrink-0 ml-auto">
                  Rate: <span className="font-bold text-slate-900">{doc.rate_per_kgs}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Date & Truck */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 relative z-10">
        <div className="flex items-center gap-1.5 rounded-xl bg-white/90 px-2 py-1 border border-slate-200/60 shadow-2xs">
          <Calendar className="h-3 w-3 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-800 truncate">
            {doc.issue_date
              ? new Date(doc.issue_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "No date"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/90 px-2 py-1 border border-slate-200/60 shadow-2xs">
          <Truck className="h-3 w-3 text-indigo-600 shrink-0" />
          <span className="truncate font-bold text-slate-800">{doc.truck_number || "No truck #"}</span>
        </div>
      </div>

      {/* Driver & Rent (if present) */}
      {(doc.driver_name || doc.driver_rent) && (
        <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-slate-800 font-bold bg-amber-50/85 border border-amber-200/80 rounded-xl px-2.5 py-1.5 relative z-10 shadow-2xs flex-wrap">
          {doc.driver_name && (
            <div className="flex items-center gap-1 text-slate-950 font-extrabold min-w-0" dir="auto">
              <User className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span className="truncate">{doc.driver_name}</span>
            </div>
          )}
          {doc.driver_rent && (
            <div className="font-mono text-amber-950 font-black text-[10px] bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-lg shrink-0 ml-auto">
              {doc.driver_rent}
            </div>
          )}
        </div>
      )}

      {/* Category Tag Buttons */}
      <div className="mt-2 flex flex-wrap gap-1 relative z-10">
        {(["account", "export", "import"] as const).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryAssign(doc, category)}
            className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              assignedCategory === category
                ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                : "border-slate-200/80 bg-white/70 text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-white"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto grid gap-1.5 pt-3 border-t border-slate-100 relative z-10">
        {/* Primary Actions Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            onClick={() => onEdit(doc)}
            className="h-9 rounded-xl bg-gradient-to-r from-[#0a2540] to-[#1d4ed8] hover:from-[#001428] hover:to-[#1e40af] text-white font-black text-[11.5px] shadow-sm shadow-blue-900/20 cursor-pointer transition-all active:scale-95 px-2 flex items-center justify-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span>Edit BOL</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onDownload(doc)}
            className="h-9 rounded-xl border border-amber-300/80 bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-black text-[11px] cursor-pointer shadow-2xs transition-all active:scale-95 px-2 flex items-center justify-center gap-1.5"
          >
            <FileDown className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>Download</span>
          </Button>
        </div>

        {/* Secondary Quick Actions Row */}
        <div className="grid grid-cols-3 gap-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPreview(doc)}
            className="h-7.5 rounded-lg border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 font-bold text-[10px] cursor-pointer transition-all flex items-center justify-center px-1"
            title="Preview A4 Document"
          >
            <Eye className="h-3 w-3 mr-1 shrink-0 text-blue-600" />
            <span>Preview</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onDuplicate(doc)}
            className="h-7.5 rounded-lg border border-purple-200/80 bg-purple-50/70 hover:bg-purple-100/80 text-purple-700 font-bold text-[10px] cursor-pointer transition-all flex items-center justify-center px-1"
            title="Clone document with new BOL number"
          >
            <Copy className="h-3 w-3 mr-1 text-purple-600 shrink-0" />
            <span>Duplicate</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenPdf(doc)}
            disabled={!hasUploadedPdf || openingPdfId === doc.id}
            className="h-7.5 rounded-lg border border-emerald-200/80 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-700 font-bold text-[10px] disabled:border-slate-100 disabled:bg-slate-50/60 disabled:text-slate-300 cursor-pointer transition-all flex items-center justify-center px-1"
            title={hasUploadedPdf ? "Open uploaded PDF file" : "No uploaded PDF available"}
          >
            <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
            <span>File PDF</span>
          </Button>
        </div>

        {/* Attach PDF & Delete Row */}
        <div className="grid grid-cols-[1fr_auto] gap-1.5 pt-0.5">
          <label
            className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 px-2.5 text-[11px] font-bold text-slate-700 transition-all shadow-2xs ${
              uploadingId === doc.id ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {uploadingId === doc.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-blue-600" />
            )}
            <span>{hasUploadedPdf ? "Replace PDF" : "Attach PDF"}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={uploadingId === doc.id}
              onChange={onFileInput(doc)}
            />
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={(event) => onDelete(doc.id, event)}
            disabled={deletingId === doc.id}
            className="h-8 w-8 rounded-xl border border-red-200/80 bg-red-50/50 hover:bg-red-100/80 p-0 text-red-600 hover:text-red-700 cursor-pointer transition-all flex items-center justify-center"
            title="Delete document"
          >
            {deletingId === doc.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </article>
  )
})

export function SavedDocuments({ onLoadDocument, refreshTrigger, variant = "sidebar" }: SavedDocumentsProps) {
  const [documents, setDocuments] = useState<SavedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null)
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)
  const [uploadingCompanyName, setUploadingCompanyName] = useState<string | null>(null)
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null)
  const [openCompanyTabs, setOpenCompanyTabs] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [newCompanyName, setNewCompanyName] = useState("")
  const [activeCategory, setActiveCategory] = useState<DocumentCategoryKey>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("latest")
  const [documentCategories, setDocumentCategories] = useState<Record<string, Exclude<DocumentCategoryKey, "all" | "latest" | "with-pdf">>>({})
  const [accountCompanyPdfs, setAccountCompanyPdfs] = useState<Record<string, AccountCompanyRecord>>({})
  const [customAccountCompanies, setCustomAccountCompanies] = useState<string[]>([])
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false)

function parseBolSeq(bolNum: string): number {
  if (!bolNum) return 0
  const match = bolNum.match(/NSA(\d+)/i) || bolNum.match(/(\d+)\s*$/)
  if (match && match[1]) {
    const val = parseInt(match[1], 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/bol")
      let serverDocs: SavedDocument[] = []
      if (response.ok) {
        const result = await response.json()
        if (Array.isArray(result.data)) {
          serverDocs = result.data
        }
      }

      let clientLocalDocs: SavedDocument[] = []
      try {
        const storedLocal1 = window.localStorage.getItem("sky-bol-browser-documents")
        const storedLocal2 = window.localStorage.getItem("skybol:saved-documents")
        const list1: SavedDocument[] = storedLocal1 ? JSON.parse(storedLocal1) : []
        const list2: SavedDocument[] = storedLocal2 ? JSON.parse(storedLocal2) : []
        clientLocalDocs = [...list1, ...list2]
      } catch (e) {
        console.error("Error reading browser local documents:", e)
      }

      const mergedMap = new Map<string, SavedDocument>()
      for (const d of serverDocs) {
        const key = d.bol_number || d.id
        if (key) mergedMap.set(key, d)
      }
      for (const d of clientLocalDocs) {
        const key = d.bol_number || d.id
        if (key) mergedMap.set(key, d)
      }

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at || a.issue_date || 0).getTime()
        const dateB = new Date(b.created_at || b.issue_date || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
      })

      setDocuments(mergedList)
    } catch (error) {
      console.warn("Saved documents temporarily unavailable:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecoverAllBOLs = async () => {
    const toastId = toast.loading("Recovering saved BOL documents...")
    try {
      const response = await fetch("/api/bol")
      if (!response.ok) throw new Error("Failed to fetch server BOLs")
      const result = await response.json()
      const serverDocs: SavedDocument[] = Array.isArray(result.data) ? result.data : []

      let local1: SavedDocument[] = []
      let local2: SavedDocument[] = []
      try {
        local1 = JSON.parse(window.localStorage.getItem("sky-bol-browser-documents") || "[]")
        local2 = JSON.parse(window.localStorage.getItem("skybol:saved-documents") || "[]")
      } catch (e) {}

      const mergedMap = new Map<string, SavedDocument>()
      for (const doc of serverDocs) {
        const key = doc.bol_number || doc.id
        if (key) mergedMap.set(key, doc)
      }
      for (const doc of local1) {
        const key = doc.bol_number || doc.id
        if (key) mergedMap.set(key, doc)
      }
      for (const doc of local2) {
        const key = doc.bol_number || doc.id
        if (key) mergedMap.set(key, doc)
      }

      const allMerged = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at || a.issue_date || 0).getTime()
        const dateB = new Date(b.created_at || b.issue_date || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
      })

      window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(allMerged))
      window.localStorage.setItem("skybol:saved-documents", JSON.stringify(allMerged))

      setDocuments(allMerged)
      window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))

      toast.success(`Recovered ${allMerged.length} saved BOL documents!`, { id: toastId })
    } catch (err) {
      toast.error("Error recovering saved BOLs", { id: toastId })
    }
  }

  useEffect(() => {
    void fetchDocuments()

    const handleRefresh = (event?: CustomEvent) => {
      if (event?.detail && event.detail.bol_number) {
        try {
          const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
          const currentList: SavedDocument[] = storedLocal ? JSON.parse(storedLocal) : []
          const updatedList = [
            event.detail,
            ...currentList.filter((d) => (d.bol_number || d.id) !== (event.detail.bol_number || event.detail.id)),
          ]
          window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(updatedList))
        } catch (e) {
          console.error("Error storing local doc update:", e)
        }
      }
      void fetchDocuments()
    }

    window.addEventListener("skybol:documents-updated", handleRefresh as EventListener)
    window.addEventListener("skybol:account-ledger-updated", handleRefresh as EventListener)

    return () => {
      window.removeEventListener("skybol:documents-updated", handleRefresh as EventListener)
      window.removeEventListener("skybol:account-ledger-updated", handleRefresh as EventListener)
    }
  }, [refreshTrigger])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DOCUMENT_CATEGORY_STORAGE_KEY)
      if (stored) {
        setDocumentCategories(JSON.parse(stored))
      }

      const storedCompanyPdfs = window.localStorage.getItem(ACCOUNT_COMPANY_PDFS_STORAGE_KEY)
      if (storedCompanyPdfs) {
        const parsed = JSON.parse(storedCompanyPdfs) as Record<string, AccountCompanyRecord>
        const migrated = Object.fromEntries(
          Object.entries(parsed).map(([key, record]) => {
            if (Array.isArray(record.pdfs)) {
              return [key, record]
            }

            return [
              key,
              {
                companyName: record.companyName,
                pdfs: record.pdfUrl
                  ? [
                      {
                        id: `${key}-legacy`,
                        name: `${record.companyName}.pdf`,
                        pdfUrl: record.pdfUrl,
                        uploadedAt: record.uploadedAt || new Date().toISOString(),
                      },
                    ]
                  : [],
              },
            ]
          })
        )
        setAccountCompanyPdfs(migrated)
        window.localStorage.setItem(ACCOUNT_COMPANY_PDFS_STORAGE_KEY, JSON.stringify(migrated))
      }

      const storedCompanies = window.localStorage.getItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY)
      if (storedCompanies) {
        setCustomAccountCompanies(JSON.parse(storedCompanies))
      }
    } catch (error) {
      console.error("Error loading saved document settings:", error)
    }
  }, [])

  const getAssignedCategory = (doc: SavedDocument) => documentCategories[doc.id || doc.bol_number]

  const getDocumentSearchText = (doc: SavedDocument) => {
    const extra = doc as SavedDocument & {
      category?: string | null
      document_category?: string | null
      document_type?: string | null
      type?: string | null
      status?: string | null
      notes?: string | null
    }

    return [
      doc.bol_number,
      doc.shipper_name,
      doc.consignee_name,
      doc.truck_number,
      getAssignedCategory(doc),
      extra.category,
      extra.document_category,
      extra.document_type,
      extra.type,
      extra.status,
      extra.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  }

  const matchesCategory = (doc: SavedDocument, category: DocumentCategoryKey) => {
    if (category === "all" || category === "account") return true
    if (category === "with-pdf") return Boolean(doc.pdf_url)
    if (category === "latest") return true // Handled by filter/sort

    const assigned = getAssignedCategory(doc)
    if (assigned === category) return true

    const searchText = getDocumentSearchText(doc)
    const keywords: Record<Exclude<DocumentCategoryKey, "all" | "latest" | "with-pdf">, string[]> = {
      account: ["account", "accounts", "ledger", "invoice", "payment", "balance", "receipt"],
      export: ["export", "exports", "exporter", "outbound"],
      import: ["import", "imports", "importer", "inbound"],
    }

    return keywords[category].some((keyword) => searchText.includes(keyword))
  }

  // Sorted and Filtered Documents (Bringing Latest First by Default)
  const filteredDocuments = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    const filtered = documents.filter((doc) => {
      const matchesSearch = !cleanQuery || getDocumentSearchText(doc).includes(cleanQuery)
      return matchesSearch && matchesCategory(doc, activeCategory)
    })

    // Apply Sorting (Bringing Latest First by Default, tie-breaker by BOL sequence)
    return filtered.sort((a, b) => {
      if (sortBy === "latest") {
        const dateA = new Date(a.created_at || a.issue_date || 0).getTime()
        const dateB = new Date(b.created_at || b.issue_date || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
      }
      if (sortBy === "oldest") {
        const dateA = new Date(a.created_at || a.issue_date || 0).getTime()
        const dateB = new Date(b.created_at || b.issue_date || 0).getTime()
        if (dateA !== dateB) return dateA - dateB
        return parseBolSeq(a.bol_number || "") - parseBolSeq(b.bol_number || "")
      }
      if (sortBy === "bol_asc") {
        return (a.bol_number || "").localeCompare(b.bol_number || "")
      }
      if (sortBy === "shipper_asc") {
        return (a.shipper_name || "").localeCompare(b.shipper_name || "")
      }
      return 0
    })
  }, [documents, query, activeCategory, sortBy, documentCategories])

  // Get Top 6 Latest BOLs for the Top Feature Banner
  const latestTopBOLs = useMemo(() => {
    return [...documents]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.issue_date || 0).getTime()
        const dateB = new Date(b.created_at || b.issue_date || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
      })
      .slice(0, 6)
  }, [documents])

  const accountCompanies = useMemo(() => {
    const byName = new Map<string, { companyName: string; docs: SavedDocument[] }>()

    for (const companyName of customAccountCompanies) {
      const cleanName = companyName.trim()
      if (cleanName) {
        byName.set(cleanName.toLowerCase(), { companyName: cleanName, docs: [] })
      }
    }

    for (const companyRecord of Object.values(accountCompanyPdfs)) {
      const cleanName = companyRecord.companyName.trim()
      if (cleanName && !byName.has(cleanName.toLowerCase())) {
        byName.set(cleanName.toLowerCase(), { companyName: cleanName, docs: [] })
      }
    }

    for (const doc of documents) {
      const companyName = (doc.shipper_name || "Unnamed Shipper Company").trim()
      const key = companyName.toLowerCase()
      const existing = byName.get(key)

      if (existing) {
        existing.docs.push(doc)
      } else {
        byName.set(key, { companyName, docs: [doc] })
      }
    }

    return Array.from(byName.values()).sort((a, b) => a.companyName.localeCompare(b.companyName))
  }, [documents, documentCategories, customAccountCompanies, accountCompanyPdfs])

  const categoryCounts = useMemo(() => {
    return categoryButtons.reduce<Record<DocumentCategoryKey, number>>((counts, category) => {
      if (category.key === "latest") {
        counts[category.key] = Math.min(documents.length, 5)
      } else {
        counts[category.key] = documents.filter((doc) => matchesCategory(doc, category.key)).length
      }
      return counts
    }, { all: 0, latest: 0, account: 0, export: 0, import: 0, "with-pdf": 0 })
  }, [documents, documentCategories])

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyName) return null
    return accountCompanies.find((company) => company.companyName === selectedCompanyName) || null
  }, [accountCompanies, selectedCompanyName])

  const openCompanyTab = (companyName: string) => {
    setActiveCategory("account")
    setSelectedCompanyName(companyName)
    setOpenCompanyTabs((prev) => (
      prev.includes(companyName) ? prev : [...prev, companyName]
    ))
  }

  const closeCompanyTab = (companyName: string) => {
    setOpenCompanyTabs((prev) => {
      const next = prev.filter((tab) => tab !== companyName)
      if (selectedCompanyName === companyName) {
        setSelectedCompanyName(next[next.length - 1] || null)
      }
      return next
    })
  }

  const assignDocumentCategory = useCallback((doc: SavedDocument, category: Exclude<DocumentCategoryKey, "all" | "latest" | "with-pdf">) => {
    const documentId = doc.id || doc.bol_number

    startTransition(() => {
      setDocumentCategories((prev) => {
        const next = {
          ...prev,
          [documentId]: category,
        }

        try {
          window.localStorage.setItem(DOCUMENT_CATEGORY_STORAGE_KEY, JSON.stringify(next))
        } catch (e) {}
        return next
      })
    })

    toast.success(`Moved to ${category}`)
  }, [])

  const persistAccountCompanyPdfs = (records: Record<string, AccountCompanyRecord>) => {
    setAccountCompanyPdfs(records)
    window.localStorage.setItem(ACCOUNT_COMPANY_PDFS_STORAGE_KEY, JSON.stringify(records))
  }

  const persistCustomAccountCompanies = (companies: string[]) => {
    setCustomAccountCompanies(companies)
    window.localStorage.setItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY, JSON.stringify(companies))
  }

  const addAccountCompany = () => {
    const cleanName = newCompanyName.trim()
    if (!cleanName) {
      toast.error("Enter a company name first")
      return
    }

    const exists = accountCompanies.some((company) => company.companyName.toLowerCase() === cleanName.toLowerCase())
    if (exists) {
      toast.info("Company already exists")
      setNewCompanyName("")
      return
    }

    persistCustomAccountCompanies([...customAccountCompanies, cleanName])
    setNewCompanyName("")
    setActiveCategory("account")
    toast.success("Company category added")
  }

  const handleCompanyPDFUpload = async (companyName: string, file?: File | null) => {
    if (!file) return

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.")
      return
    }

    setUploadingCompanyName(companyName)
    try {
      const formData = new FormData()
      formData.append("pdf", file, file.name || `${companyName}.pdf`)
      formData.append("companyName", companyName)

      const response = await fetch("/api/account-company-pdf", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload company PDF")
      }

      const key = companyName.toLowerCase()
      const currentRecord = accountCompanyPdfs[key]
      const nextFile: AccountCompanyPdfFile = {
        id: crypto.randomUUID(),
        name: file.name || `${companyName}.pdf`,
        pdfUrl: result.data.pdfUrl,
        uploadedAt: result.data.uploadedAt,
      }

      persistAccountCompanyPdfs({
        ...accountCompanyPdfs,
        [key]: {
          companyName,
          pdfs: [nextFile, ...(currentRecord?.pdfs || [])],
        },
      })
      toast.success("Company PDF uploaded")
    } catch (error) {
      console.error("Company PDF upload error:", error)
      toast.error(error instanceof Error ? error.message : "Unable to upload company PDF")
    } finally {
      setUploadingCompanyName(null)
    }
  }

  const openCompanyPDF = (pdf: AccountCompanyPdfFile) => {
    window.open(pdf.pdfUrl, "_blank", "noopener,noreferrer")
  }

  const deleteCompanyPDF = async (companyName: string, pdf: AccountCompanyPdfFile) => {
    const key = companyName.toLowerCase()
    const record = accountCompanyPdfs[key]
    if (!record) return

    if (!confirm(`Remove ${pdf.name} from ${companyName}?`)) return

    try {
      await fetch(`/api/account-company-pdf?pdfUrl=${encodeURIComponent(pdf.pdfUrl)}`, {
        method: "DELETE",
      })
      const nextPdfs = record.pdfs.filter((item) => item.id !== pdf.id)
      const next = {
        ...accountCompanyPdfs,
        [key]: {
          ...record,
          pdfs: nextPdfs,
        },
      }
      persistAccountCompanyPdfs(next)
      toast.success("Company PDF removed")
    } catch (error) {
      console.error("Company PDF delete error:", error)
      toast.error("Unable to remove company PDF")
    }
  }

  const handleCompanyFileInput = (companyName: string) => (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const file = event.target.files?.[0]
    void handleCompanyPDFUpload(companyName, file)
    event.target.value = ""
  }

  const handleDelete = useCallback(async (id: string, event: MouseEvent) => {
    event.stopPropagation()
    if (!confirm("Delete this saved document?")) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/bol/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        startTransition(() => {
          setDocuments((prev) => prev.filter((doc) => doc.id !== id))
        })
        toast.success("Document deleted")
      } else {
        toast.error("Could not delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error("Could not delete document")
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handlePDFUpload = useCallback(async (doc: SavedDocument, file?: File | null) => {
    if (!file) return

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.")
      return
    }

    setUploadingId(doc.id)
    try {
      const formData = new FormData()
      formData.append("pdf", file, file.name || `${doc.bol_number || doc.id}.pdf`)
      formData.append("bolId", doc.id)
      formData.append("bolNumber", doc.bol_number || doc.id)

      const response = await fetch("/api/bol/pdf", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload PDF")
      }

      toast.success(doc.pdf_url ? "PDF replaced" : "PDF uploaded")
      await fetchDocuments()
      startTransition(() => {
        setActiveCategory("with-pdf")
      })
    } catch (error) {
      console.error("PDF upload error:", error)
      toast.error(error instanceof Error ? error.message : "Unable to upload PDF")
    } finally {
      setUploadingId(null)
    }
  }, [fetchDocuments])

  const handleDuplicate = useCallback(async (doc: SavedDocument) => {
    const toastId = toast.loading("Duplicating BOL...", {
      description: "Fetching next auto BOL number...",
    })
    try {
      const response = await fetch("/api/bol?action=next-number")
      const result = await response.json()
      const newBolNumber = result.bolNumber || "BOL-2026-NSA471"

      const clonedDoc = {
        ...doc,
        id: "",
        bol_number: newBolNumber,
        issue_date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      startTransition(() => {
        onLoadDocument(clonedDoc.id, "form")
      })
      toast.success(`Cloned as ${newBolNumber}!`, {
        id: toastId,
        description: "Document pre-filled with party and route info. Review and click Save.",
      })
    } catch (e) {
      toast.error("Failed to duplicate document", { id: toastId })
    }
  }, [onLoadDocument])

  const openUploadedPDF = useCallback(async (doc: SavedDocument) => {
    if (!doc.pdf_url) {
      toast.error("No uploaded PDF for this BOL")
      return
    }

    setOpeningPdfId(doc.id)
    try {
      const response = await fetch(`/api/bol/pdf?action=download&bolId=${doc.id}`)
      const result = await response.json()
      const pdfUrl = result?.data?.pdfUrl || doc.pdf_url

      if (!response.ok || !pdfUrl) {
        throw new Error(result.error || "Uploaded PDF not found")
      }

      window.open(pdfUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Open uploaded PDF error:", error)
      toast.error(error instanceof Error ? error.message : "Unable to open uploaded PDF")
    } finally {
      setOpeningPdfId(null)
    }
  }, [])

  // Direct Download of BOL PDF File
  const downloadBOLPDF = useCallback(async (doc: SavedDocument) => {
    setDownloadingPdfId(doc.id)
    startTransition(() => {
      onLoadDocument(doc.id, "preview")
      window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "preview", tab: "preview" } }))
    })
    
    toast.loading("Generating BOL PDF file...", { id: "doc-pdf-download" })

    setTimeout(async () => {
      try {
        const previewElement = document.querySelector('[data-pdf-export="true"]') as HTMLElement | null
        const fileName = buildBolSmartFileName(doc, doc.bol_number || doc.id, ".pdf")
        const pdfBlob = await generateBOLPDFBlob({
          fileName,
          previewElement,
          modern: {
            bolNumber: doc.bol_number || doc.id,
            issueDate: doc.issue_date || "",
            persianDateNumeric: "",
            formData: doc as unknown as import("@/lib/types/bill-of-lading").BillOfLadingFormData,
            logoUrl: "/images/logo.png",
            companyName: "SKY ARIANA LIMITED",
            companyNamePersian: "شرکت حمل و نقل بین المللی سکای آریانا لمیتد",
            companySubtitle: "Import & Export - International Transportation",
            companyPhone: "+93 700 939 365",
            companyEmail: "info@skyariana.com",
            companyAddress: "Kandahar, Afghanistan",
            companyLicence: "2401-2198",
          },
        })

        await savePDFToDevice(pdfBlob, fileName)
        toast.success("PDF Downloaded successfully!", {
          id: "doc-pdf-download",
          description: `${fileName} saved to your device.`,
        })
      } catch (err) {
        console.error("Failed to download PDF:", err)
        if (typeof document !== "undefined") {
          document.title = buildBolSmartFileName(doc, doc.bol_number || doc.id, "")
        }
        window.print()
      } finally {
        setDownloadingPdfId(null)
      }
    }, 350)
  }, [onLoadDocument])

  const viewBOLPreview = useCallback((doc: SavedDocument) => {
    if (typeof document !== "undefined") {
      document.title = buildBolSmartFileName(doc, doc.bol_number || doc.id, "")
    }
    startTransition(() => {
      onLoadDocument(doc.id, "preview")
      window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "preview", tab: "preview" } }))
    })
    toast.success("BOL preview opened", {
      description: `${doc.bol_number || "Document"} loaded in A4 Preview.`,
    })
  }, [onLoadDocument])

  const editBOL = useCallback((doc: SavedDocument) => {
    if (typeof document !== "undefined") {
      document.title = buildBolSmartFileName(doc, doc.bol_number || doc.id, "")
    }
    startTransition(() => {
      onLoadDocument(doc.id, "form")
      window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "form", tab: "form" } }))
    })
  }, [onLoadDocument])

  const downloadDocumentJSON = useCallback(async (doc: SavedDocument) => {
    try {
      const res = await fetch(`/api/bol/${doc.id}`)
      if (!res.ok) throw new Error("Failed to fetch document")
      const json = await res.json()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${doc.bol_number || doc.id}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Unable to download document data")
    }
  }, [])

  const handleFileInput = useCallback((doc: SavedDocument) => (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const file = event.target.files?.[0]
    void handlePDFUpload(doc, file)
    event.target.value = ""
  }, [handlePDFUpload])

  const handleExportToCSV = useCallback(() => {
    if (filteredDocuments.length === 0) {
      toast.error("No documents to export")
      return
    }

    const headers = [
      "BOL Number",
      "Issue Date",
      "Shipper",
      "Consignee",
      "Port of Loading",
      "Port of Discharge",
      "Packages",
      "Net Weight",
      "Gross Weight",
      "Goods Value",
      "Driver",
      "Truck Plate",
      "Container No",
      "Invoice No",
    ]

    const rows = filteredDocuments.map((doc) => [
      `"${(doc.bol_number || "").replace(/"/g, '""')}"`,
      `"${(doc.issue_date || "").replace(/"/g, '""')}"`,
      `"${(doc.shipper_name || "").replace(/"/g, '""')}"`,
      `"${(doc.consignee_name || "").replace(/"/g, '""')}"`,
      `"${(doc.port_of_loading || "").replace(/"/g, '""')}"`,
      `"${(doc.port_of_discharge || "").replace(/"/g, '""')}"`,
      `"${(doc.number_of_packages || "").replace(/"/g, '""')}"`,
      `"${(doc.net_weight || "").replace(/"/g, '""')}"`,
      `"${(doc.gross_weight || "").replace(/"/g, '""')}"`,
      `"${(doc.goods_value || "").replace(/"/g, '""')}"`,
      `"${(doc.driver_name || "").replace(/"/g, '""')}"`,
      `"${(doc.truck_number || "").replace(/"/g, '""')}"`,
      `"${(doc.container_numbers || "").replace(/"/g, '""')}"`,
      `"${(doc.invoice_no || doc.invoice_number || "").replace(/"/g, '""')}"`,
    ])

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    const dateStr = new Date().toISOString().split("T")[0]
    link.setAttribute("download", `sky-bol-export-${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("CSV Spreadsheet Exported! 📊", {
      description: `${filteredDocuments.length} اسناد بارنامه در قالب فایل اکسل با موفقیت دانلود شدند`,
    })
  }, [filteredDocuments])

  return (
    <Card className={`flex h-full flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/70 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.1)] backdrop-blur-2xl text-slate-900 ${variant === "sidebar" ? "w-full" : "md:w-96"}`}>
      
      {/* Header Bar - Responsive Desktop, Tablet, Mobile */}
      <CardHeader className="border-b border-white/80 bg-linear-to-b from-white/90 via-white/75 to-white/60 p-4 sm:p-6 backdrop-blur-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-blue-800 text-white shadow-lg shadow-blue-500/25">
              <Grid3X3 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="truncate text-lg sm:text-xl font-black text-slate-950 tracking-tight">Saved Documents</CardTitle>
                <span className="text-xs text-amber-700 font-[vazirmatn] font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  اسناد ذخیره شده
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Browse, search, edit & download all saved Bills of Lading and PDFs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-900 border border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>{documents.length} Total Saved</span>
            </div>
          </div>
        </div>

        {/* Search & View Control Options */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search BOL #, shipper, consignee, truck..."
              className="h-11 rounded-2xl border-blue-200 bg-slate-50/80 pl-10 pr-4 text-xs sm:text-sm font-bold text-slate-950 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Mode, Sort Selector, CSV Export & Recover Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportToCSV}
              className="h-8.5 rounded-xl border-emerald-300 bg-emerald-50/90 px-2.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 shadow-2xs cursor-pointer"
              title="Export currently filtered list to CSV / Excel spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600 shrink-0" />
              <span>Export CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCloudSyncModalOpen(true)}
              className="h-8.5 rounded-xl border-blue-300 bg-blue-50/90 px-2.5 text-xs font-black text-blue-900 hover:bg-blue-100 shadow-2xs cursor-pointer flex items-center gap-1"
              title="Cloud Sync: Upload/Download all 58 BOLs and ledgers across all devices & browsers"
            >
              <Cloud className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Cloud Sync / همگام‌سازی</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRecoverAllBOLs}
              className="h-8.5 rounded-xl border-slate-300 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 shadow-2xs cursor-pointer"
              title="Sync & recover all saved BOL documents from server & disk"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-600 shrink-0" />
              <span>Recover Saved BOLs</span>
            </Button>
            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 ml-1" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-1"
              >
                <option value="latest">Latest First (⚡ Default)</option>
                <option value="oldest">Oldest First</option>
                <option value="bol_asc">BOL Number (A-Z)</option>
                <option value="shipper_asc">Shipper Name (A-Z)</option>
              </select>
            </div>

            {/* View Mode Buttons (Grid, List, Table) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="Compact List View"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "list" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Detailed Table View"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar (Horizontal Scrollable for Mobile) */}
        <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categoryButtons.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => {
                setActiveCategory(category.key)
                if (category.key !== "account") {
                  setSelectedCompanyName(null)
                }
              }}
              className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                activeCategory === category.key
                  ? "border-blue-600 bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200"
              }`}
            >
              {category.label}
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeCategory === category.key ? "bg-white/25 text-white" : "bg-blue-100 text-blue-800"
              }`}>
                {category.key === "account" ? accountCompanies.length : categoryCounts[category.key]}
              </span>
            </button>
          ))}
        </div>

        {openCompanyTabs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            {openCompanyTabs.map((companyName) => (
              <div
                key={companyName}
                className={`inline-flex max-w-full items-center overflow-hidden rounded-xl border text-xs font-black shadow-xs transition-all ${
                  selectedCompanyName === companyName
                    ? "border-amber-500 bg-amber-500 text-white shadow-amber-500/20"
                    : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("account")
                    setSelectedCompanyName(companyName)
                  }}
                  className="min-w-0 truncate px-3 py-1.5"
                  title={companyName}
                >
                  {companyName}
                </button>
                <button
                  type="button"
                  onClick={() => closeCompanyTab(companyName)}
                  className={`flex h-7 w-7 items-center justify-center ${
                    selectedCompanyName === companyName ? "hover:bg-white/20" : "hover:bg-amber-200"
                  }`}
                  title="Close company tab"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      {/* Main Content View Container */}
      <CardContent className="min-h-[420px] flex-1 overflow-auto bg-slate-50/40 p-3 sm:p-5">
        
        {/* TOP LATEST BOLS HERO HIGHLIGHT STRIP (BRING UP THE LATEST BOL CREATIONS) */}
        {!isLoading && latestTopBOLs.length > 0 && activeCategory !== "account" && !query && (
          <div className="mb-6 rounded-[28px] border border-amber-300/70 bg-linear-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 p-4.5 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)] backdrop-blur-2xl relative overflow-hidden">
            {/* Soft Ambient Light Glow */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 bg-amber-400/20 rounded-full blur-3xl" />
            
            <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 flex items-center gap-2 tracking-tight">
                    LATEST BOL CREATIONS
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black shadow-xs">
                      6 RECENT
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 font-semibold">Your most recent Bill of Lading documents created in system</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1200px]:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 relative z-10">
              {latestTopBOLs.map((doc, idx) => (
                <div
                  key={`latest-${doc.id}`}
                  className="group relative rounded-2xl bg-white/85 backdrop-blur-xl border border-amber-200/80 p-3.5 shadow-sm hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[11px] font-mono shadow-2xs truncate">
                        #{doc.bol_number || "BOL"}
                      </span>
                      <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/90 border border-amber-200/60 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Clock className="w-2.5 h-2.5 text-amber-700" />
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Just now"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-black text-slate-950 truncate" title={doc.shipper_name}>
                      {doc.shipper_name || "No Shipper"}
                    </p>
                    <p className="text-[11px] text-slate-600 font-bold truncate flex items-center gap-1 mt-0.5">
                      <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{doc.consignee_name || "No Consignee"}</span>
                    </p>

                    {/* Quick Cargo & Logistics Details */}
                    {(doc.number_of_packages || doc.net_weight || doc.truck_number || doc.goods_value) && (
                      <div className="mt-2 flex items-center justify-between gap-1 text-[10px] bg-amber-50/90 border border-amber-200/80 rounded-lg px-2 py-1 text-amber-950 font-bold">
                        {(doc.number_of_packages || doc.net_weight) && (
                          <span className="truncate flex items-center gap-1">
                            <Boxes className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>{doc.number_of_packages || doc.net_weight}</span>
                          </span>
                        )}
                        {doc.truck_number && (
                          <span className="truncate flex items-center gap-1 font-mono text-[9.5px]">
                            <Truck className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>{doc.truck_number}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-amber-100/80 flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => editBOL(doc)}
                      className="flex-1 h-8 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBOLPDF(doc)}
                      className="flex-1 h-8 rounded-xl border-amber-300 bg-amber-50/80 text-amber-900 font-extrabold text-xs cursor-pointer hover:bg-amber-100 active:scale-95 transition-all"
                    >
                      <FileDown className="w-3 h-3 mr-1 text-amber-700" /> PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 shadow-sm">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">Loading saved documents...</p>
            </div>
          </div>
        ) : (
          <>
            {activeCategory === "account" && (
              <section className="mb-5 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      Account Company Categories
                    </h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Add each company name here, then upload that company&apos;s account PDF.
                    </p>
                  </div>

                  <div className="flex min-w-0 gap-2">
                    <Input
                      value={newCompanyName}
                      onChange={(event) => setNewCompanyName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          addAccountCompany()
                        }
                      }}
                      placeholder="Company name"
                      className="h-10 min-w-0 rounded-xl border-amber-200 bg-white text-sm focus:border-amber-400 focus:ring-amber-200"
                    />
                    <Button
                      type="button"
                      onClick={addAccountCompany}
                      className="h-10 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Add Company
                    </Button>
                  </div>
                </div>

                {accountCompanies.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    No account companies yet. Add a company name above.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {accountCompanies.map((company) => {
                      const record = accountCompanyPdfs[company.companyName.toLowerCase()]
                      const companyPdfCount = record?.pdfs.length || 0
                      const hasCompanyPdf = companyPdfCount > 0
                      const isUploading = uploadingCompanyName === company.companyName
                      const isSelected = selectedCompanyName === company.companyName

                      return (
                        <article
                          key={company.companyName}
                          className={`flex min-h-52 flex-col rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            isSelected
                              ? "border-amber-500 bg-amber-100/70"
                              : "border-amber-100 bg-amber-50/40 hover:border-amber-300"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => openCompanyTab(company.companyName)}
                            className="flex items-start justify-between gap-3 text-left"
                          >
                            <div className="min-w-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <h4 className="mt-3 truncate text-base font-black text-slate-950">
                                {company.companyName}
                              </h4>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {company.docs.length} linked BOL{company.docs.length === 1 ? "" : "s"}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                {companyPdfCount} uploaded PDF{companyPdfCount === 1 ? "" : "s"}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              hasCompanyPdf ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {isSelected ? "Open" : "Click"}
                            </span>
                          </button>

                          <div className="mt-auto grid gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openCompanyTab(company.companyName)}
                              className="h-10 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                            >
                              <Eye className="h-4 w-4" />
                              Open Company
                            </Button>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <label
                                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50 ${
                                  isUploading ? "pointer-events-none opacity-70" : ""
                                }`}
                              >
                                {isUploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                                Add PDF
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={handleCompanyFileInput(company.companyName)}
                                />
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openCompanyTab(company.companyName)}
                                className="h-10 rounded-xl border-blue-200 px-3 text-blue-700 hover:bg-blue-50"
                                title="View folder"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {selectedCompany && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Company Tab</p>
                        <h4 className="mt-1 text-xl font-black text-slate-950">{selectedCompany.companyName}</h4>
                      </div>
                      <label
                        className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-black text-white transition hover:bg-amber-700 ${
                          uploadingCompanyName === selectedCompany.companyName ? "pointer-events-none opacity-70" : ""
                        }`}
                      >
                        {uploadingCompanyName === selectedCompany.companyName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Add PDF to Company
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          disabled={uploadingCompanyName === selectedCompany.companyName}
                          onChange={handleCompanyFileInput(selectedCompany.companyName)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeCategory === "account" ? null : filteredDocuments.length === 0 ? (
              <div className="flex min-h-80 items-center justify-center">
                <div className="max-w-sm rounded-3xl border border-dashed border-blue-300 bg-white/90 p-8 text-center shadow-lg backdrop-blur-xl">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="text-lg font-extrabold text-blue-950">No documents found</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Try adjusting your search query or category filters.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. GRID VIEW MODE - BALANCED RESPONSIVE GRID WITH PREMIUM CARDS */}
                {viewMode === "grid" && (
                  <div className="grid gap-3 sm:gap-3.5 lg:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6">
                    {filteredDocuments.map((doc, idx) => (
                      <DocumentGridCard
                        key={doc.id}
                        doc={doc}
                        isLatest={idx < 2 && sortBy === "latest"}
                        hasUploadedPdf={Boolean(doc.pdf_url)}
                        invoiceNo={extractInvoiceNo(doc)}
                        assignedCategory={getAssignedCategory(doc)}
                        uploadingId={uploadingId}
                        deletingId={deletingId}
                        openingPdfId={openingPdfId}
                        onEdit={editBOL}
                        onDownload={downloadBOLPDF}
                        onPreview={viewBOLPreview}
                        onDuplicate={handleDuplicate}
                        onOpenPdf={openUploadedPDF}
                        onDelete={handleDelete}
                        onCategoryAssign={assignDocumentCategory}
                        onFileInput={handleFileInput}
                      />
                    ))}
              </div>
            )}

            {/* 2. COMPACT LIST VIEW MODE */}
            {viewMode === "list" && (
              <div className="space-y-3">
                {filteredDocuments.map((doc, idx) => {
                  const hasUploadedPdf = Boolean(doc.pdf_url)
                  const isLatest = idx < 2 && sortBy === "latest"
                  const invoiceNo = extractInvoiceNo(doc)

                  return (
                    <div
                      key={`list-${doc.id}`}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-black text-xs shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">{doc.bol_number || "BOL"}</span>
                            {invoiceNo && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black font-mono">
                                INV: {invoiceNo}
                              </span>
                            )}
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
                                LATEST
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-500">
                              • {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : "No date"}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                            <span className="font-extrabold text-slate-900">{doc.shipper_name}</span> ➔ {doc.consignee_name}
                          </p>
                          {(doc.number_of_packages || doc.net_weight || doc.goods_value) && (
                            <p className="text-[11px] font-bold text-blue-900 mt-1 flex items-center gap-2 flex-wrap">
                              {doc.number_of_packages && <span>📦 {doc.number_of_packages}</span>}
                              {doc.net_weight && <span>⚖️ {doc.net_weight}</span>}
                              {doc.goods_value && <span>💰 {doc.goods_value}</span>}
                              {doc.truck_number && <span>🚚 {doc.truck_number}</span>}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => editBOL(doc)}
                          className="h-9 px-3 rounded-xl bg-blue-600 text-white font-extrabold text-xs cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBOLPDF(doc)}
                          className="h-9 px-3 rounded-xl border-amber-300 bg-amber-50 text-amber-900 font-black text-xs cursor-pointer hover:bg-amber-100"
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1 text-amber-600" /> Download PDF
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => viewBOLPreview(doc)}
                          className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 3. DETAILED TABLE VIEW MODE */}
            {viewMode === "table" && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100/80 text-slate-900 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">BOL & Invoice #</th>
                      <th className="p-3.5">Issue Date</th>
                      <th className="p-3.5">Shipper</th>
                      <th className="p-3.5">Consignee</th>
                      <th className="p-3.5">Cargo / Weight</th>
                      <th className="p-3.5">Truck #</th>
                      <th className="p-3.5">PDF Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {filteredDocuments.map((doc, idx) => {
                      const hasUploadedPdf = Boolean(doc.pdf_url)
                      const isLatest = idx < 2 && sortBy === "latest"
                      const invoiceNo = extractInvoiceNo(doc)

                      return (
                        <tr key={`table-${doc.id}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-black text-blue-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{doc.bol_number || "N/A"}</span>
                              {invoiceNo && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 text-[9.5px] font-mono font-bold">
                                  {invoiceNo}
                                </span>
                              )}
                              {isLatest && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                                  LATEST
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 max-w-[160px] truncate">
                            {doc.shipper_name || "N/A"}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800 max-w-[160px] truncate">
                            {doc.consignee_name || "N/A"}
                          </td>
                          <td className="p-3.5 font-medium text-slate-700 max-w-[180px] truncate">
                            {doc.number_of_packages || doc.net_weight ? (
                              <span>{doc.number_of_packages} {doc.net_weight ? `(${doc.net_weight})` : ""}</span>
                            ) : "—"}
                          </td>
                          <td className="p-3.5">{doc.truck_number || "N/A"}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              hasUploadedPdf ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                            }`}>
                              {hasUploadedPdf ? "PDF Ready" : "No PDF"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => editBOL(doc)}
                                className="h-8 px-2.5 rounded-lg bg-blue-600 text-white font-extrabold text-[11px] cursor-pointer"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => downloadBOLPDF(doc)}
                                className="h-8 px-2.5 rounded-lg border-amber-300 bg-amber-50 text-amber-900 font-extrabold text-[11px] cursor-pointer hover:bg-amber-100"
                              >
                                PDF
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => viewBOLPreview(doc)}
                                className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </CardContent>

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        open={isCloudSyncModalOpen}
        onOpenChange={setIsCloudSyncModalOpen}
        onSyncComplete={fetchDocuments}
      />
    </Card>
  )
}


