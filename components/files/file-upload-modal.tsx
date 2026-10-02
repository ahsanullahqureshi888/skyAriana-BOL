"use client"

import React, { useState, useRef } from "react"
import {
  UploadCloud,
  FileText,
  X,
  Check,
  AlertTriangle,
  FolderPlus,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
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
import type { DocumentCategoryCode, DocumentType, PhotoType } from "@/lib/types/shipment-file"
import { toast } from "sonner"

interface StagedUploadItem {
  id: string
  file: File
  name: string
  size: number
  categoryCode: DocumentCategoryCode
  documentType: DocumentType
  bolNumber: string
  containerNumber: string
  documentNumber: string
  documentDate: string
  expiryDate: string
  clientVisible: boolean
  description: string
  photoType: PhotoType | null
}

interface FileUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultBolNumber?: string
  defaultContainerNumber?: string
  defaultCategory?: DocumentCategoryCode
  existingFileNames?: string[]
  onUploadSuccess?: () => void
}

const CATEGORY_OPTIONS: { code: DocumentCategoryCode; name: string }[] = [
  { code: "SHIPPING", name: "Shipping Documents (B/Ls, Booking, Release)" },
  { code: "CUSTOMS", name: "Customs & Transit Documents" },
  { code: "COMMERCIAL", name: "Commercial Invoices & Packing Lists" },
  { code: "CERTIFICATES", name: "Official Certificates (Phyto, Origin, Quarantine)" },
  { code: "TRANSPORT", name: "Truck & Driver Documents" },
  { code: "FINANCIAL", name: "Financial Invoices & Payment Receipts" },
  { code: "PHOTOS", name: "Photos (Cargo, Truck, Container, Seal)" },
  { code: "OTHER", name: "Other Supporting Files" },
]

const DOCUMENT_TYPE_SUGGESTIONS: Record<DocumentCategoryCode, { type: DocumentType; label: string }[]> = {
  SHIPPING: [
    { type: "FIRST_LEG_BL", label: "First Leg B/L" },
    { type: "SECOND_LEG_BL", label: "Second Leg B/L" },
    { type: "FINAL_BL", label: "Final B/L" },
    { type: "SWITCH_BL", label: "Switch B/L" },
    { type: "HOUSE_BL", label: "House B/L" },
    { type: "MASTER_BL", label: "Master B/L" },
    { type: "DRAFT_BL", label: "Draft B/L" },
    { type: "SEAWAY_BILL", label: "Sea Waybill" },
    { type: "BOOKING_CONFIRMATION", label: "Booking Confirmation" },
    { type: "CONTAINER_RELEASE", label: "Container Release Order" },
    { type: "DELIVERY_ORDER", label: "Delivery Order (DO)" },
    { type: "VGM_DECLARATION", label: "VGM Certificate" },
  ],
  CUSTOMS: [
    { type: "AFGHAN_CUSTOMS_CLEARANCE", label: "Afghan Customs Clearance" },
    { type: "IRAN_CUSTOMS_CLEARANCE", label: "Iran Customs Clearance" },
    { type: "UAE_CUSTOMS_CLEARANCE", label: "UAE Customs Declaration" },
    { type: "TURKEY_CUSTOMS_CLEARANCE", label: "Turkey Customs Clearance" },
    { type: "TRANSIT_PERMIT", label: "Border Transit Paper" },
    { type: "BORDER_INSPECTION_SLIP", label: "Border Station Gate Pass" },
    { type: "CUSTOMS_DUTY_RECEIPT", label: "Customs Duty Receipt" },
  ],
  COMMERCIAL: [
    { type: "COMMERCIAL_INVOICE", label: "Commercial Invoice" },
    { type: "PACKING_LIST", label: "Itemized Packing List" },
    { type: "PURCHASE_INVOICE", label: "Purchase Invoice" },
    { type: "SALES_INVOICE", label: "Sales Invoice" },
    { type: "PROFORMA_INVOICE", label: "Proforma Invoice" },
  ],
  CERTIFICATES: [
    { type: "PHYTOSANITARY_CERTIFICATE", label: "Phytosanitary Certificate" },
    { type: "CERTIFICATE_OF_ORIGIN", label: "Certificate of Origin" },
    { type: "QUARANTINE_CERTIFICATE", label: "Quarantine Certificate" },
    { type: "FUMIGATION_CERTIFICATE", label: "Fumigation Certificate" },
    { type: "QUALITY_INSPECTION_CERTIFICATE", label: "Quality Inspection Certificate" },
  ],
  TRANSPORT: [
    { type: "TRUCK_REGISTRATION", label: "Truck Vehicle Registration" },
    { type: "DRIVER_LICENSE", label: "Driver Commercial License" },
    { type: "DRIVER_TAZKIRA_ID", label: "Driver Tazkira / ID" },
    { type: "ROAD_TRANSPORT_PERMIT", label: "Road Transit Permit" },
    { type: "VEHICLE_INSURANCE", label: "Vehicle Transit Insurance" },
  ],
  FINANCIAL: [
    { type: "PAYMENT_RECEIPT", label: "Payment Receipt" },
    { type: "BANK_SLIP", label: "Bank Deposit Slip" },
    { type: "CUSTOMER_INVOICE", label: "Customer Freight Invoice" },
    { type: "SUPPLIER_INVOICE", label: "Supplier / Transporter Bill" },
    { type: "EXPENSE_VOUCHER", label: "Expense Cash Voucher" },
  ],
  PHOTOS: [
    { type: "PHOTO_CARGO", label: "Cargo Goods Photo" },
    { type: "PHOTO_TRUCK", label: "Truck & Number Plate Photo" },
    { type: "PHOTO_CONTAINER", label: "Container Full View Photo" },
    { type: "PHOTO_SEAL", label: "Container Seal Close-up Photo" },
    { type: "PHOTO_LOADING", label: "Stuffing / Loading Photo" },
    { type: "PHOTO_UNLOADING", label: "Unloading / Gate Out Photo" },
    { type: "PHOTO_DAMAGE", label: "Damage & Incident Photo" },
    { type: "PHOTO_CUSTOMS", label: "Customs Inspection Photo" },
  ],
  OTHER: [
    { type: "SUPPORTING_DOCUMENT", label: "Supporting Attachment" },
    { type: "GENERAL_OTHER", label: "General Correspondence" },
  ],
}

export function FileUploadModal({
  open,
  onOpenChange,
  defaultBolNumber = "",
  defaultContainerNumber = "",
  defaultCategory = "SHIPPING",
  existingFileNames = [],
  onUploadSuccess,
}: FileUploadModalProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedUploadItem[]>([])
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Duplicate Warning Modal State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    file: StagedUploadItem
    existingFileId: string
  } | null>(null)

  // Heuristic category & type suggestion based on filename
  const suggestCategoryAndType = (
    fileName: string
  ): { category: DocumentCategoryCode; docType: DocumentType; photoType: PhotoType | null } => {
    const fn = fileName.toLowerCase()
    if (fn.includes("packing") || fn.includes("pl-") || fn.includes("p_l")) {
      return { category: "COMMERCIAL", docType: "PACKING_LIST", photoType: null }
    }
    if (fn.includes("invoice") || fn.includes("inv-") || fn.includes("commercial")) {
      return { category: "COMMERCIAL", docType: "COMMERCIAL_INVOICE", photoType: null }
    }
    if (fn.includes("phyto") || fn.includes("plant")) {
      return { category: "CERTIFICATES", docType: "PHYTOSANITARY_CERTIFICATE", photoType: null }
    }
    if (fn.includes("origin") || fn.includes("coo") || fn.includes("c_o")) {
      return { category: "CERTIFICATES", docType: "CERTIFICATE_OF_ORIGIN", photoType: null }
    }
    if (fn.includes("customs") || fn.includes("clearance") || fn.includes("gumruk")) {
      return { category: "CUSTOMS", docType: "AFGHAN_CUSTOMS_CLEARANCE", photoType: null }
    }
    if (fn.includes("first leg") || fn.includes("first_leg") || fn.includes("mbl") || fn.includes("hbl")) {
      return { category: "SHIPPING", docType: "FIRST_LEG_BL", photoType: null }
    }
    if (fn.includes("switch") || fn.includes("final bl") || fn.includes("final_bl")) {
      return { category: "SHIPPING", docType: "FINAL_BL", photoType: null }
    }
    if (fn.includes("receipt") || fn.includes("payment") || fn.includes("bank") || fn.includes("slip")) {
      return { category: "FINANCIAL", docType: "PAYMENT_RECEIPT", photoType: null }
    }
    if (fn.includes("driver") || fn.includes("tazkira") || fn.includes("license")) {
      return { category: "TRANSPORT", docType: "DRIVER_LICENSE", photoType: null }
    }
    if (fn.includes("truck") || fn.includes("plate") || fn.includes("veh")) {
      return { category: "TRANSPORT", docType: "TRUCK_REGISTRATION", photoType: null }
    }
    if (fn.includes("seal") || fn.includes("cargo") || fn.includes("photo") || /\.(jpg|jpeg|png|webp)$/i.test(fn)) {
      let pt: PhotoType = "cargo"
      if (fn.includes("seal")) pt = "seal"
      else if (fn.includes("truck")) pt = "truck"
      else if (fn.includes("container")) pt = "container"
      else if (fn.includes("damage")) pt = "damage"
      return { category: "PHOTOS", docType: "PHOTO_CARGO", photoType: pt }
    }
    return { category: defaultCategory, docType: "SUPPORTING_DOCUMENT", photoType: null }
  }

  const handleFilesAdded = (files: FileList | File[]) => {
    const today = new Date().toISOString().split("T")[0]
    const newItems: StagedUploadItem[] = []

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const suggestion = suggestCategoryAndType(f.name)
      newItems.push({
        id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        categoryCode: suggestion.category,
        documentType: suggestion.docType,
        bolNumber: defaultBolNumber,
        containerNumber: defaultContainerNumber,
        documentNumber: "",
        documentDate: today,
        expiryDate: "",
        clientVisible: suggestion.category !== "FINANCIAL" && suggestion.category !== "TRANSPORT",
        description: "",
        photoType: suggestion.photoType,
      })
    }

    setStagedFiles((prev) => [...prev, ...newItems])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files)
    }
  }

  const handleUpdateItem = (id: string, updates: Partial<StagedUploadItem>) => {
    setStagedFiles((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = { ...item, ...updates }
          // If category changed, update document type to first matching suggestion
          if (updates.categoryCode && updates.categoryCode !== item.categoryCode) {
            const suggestions = DOCUMENT_TYPE_SUGGESTIONS[updates.categoryCode]
            if (suggestions && suggestions.length > 0) {
              next.documentType = suggestions[0].type
            }
          }
          return next
        }
        return item
      })
    )
  }

  const handleRemoveItem = (id: string) => {
    setStagedFiles((prev) => prev.filter((item) => item.id !== id))
  }

  const uploadSingleItem = async (item: StagedUploadItem, allowDuplicate = false): Promise<boolean> => {
    const formData = new FormData()
    formData.append("file", item.file)
    formData.append("bolNumber", item.bolNumber.trim())
    if (item.containerNumber) formData.append("containerNumber", item.containerNumber.trim())
    formData.append("documentCategoryCode", item.categoryCode)
    formData.append("documentType", item.documentType)
    if (item.documentNumber) formData.append("documentNumber", item.documentNumber.trim())
    if (item.documentDate) formData.append("documentDate", item.documentDate)
    if (item.expiryDate) formData.append("expiryDate", item.expiryDate)
    if (item.description) formData.append("description", item.description)
    formData.append("clientVisible", item.clientVisible ? "true" : "false")
    formData.append("clientDownloadable", item.clientVisible ? "true" : "false")
    formData.append("source", "STAFF_UPLOAD")
    formData.append("uploadedBy", "Current User")
    if (item.photoType) formData.append("photoType", item.photoType)
    if (allowDuplicate) formData.append("allowDuplicate", "true")

    const res = await fetch("/api/files", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    if (res.status === 409 && data.isDuplicateWarning) {
      setDuplicateWarning({ file: item, existingFileId: data.existingFileId })
      return false
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to upload file")
    }

    return true
  }

  const handleUploadAll = async () => {
    if (stagedFiles.length === 0) return

    // Validation
    for (const item of stagedFiles) {
      if (!item.bolNumber.trim()) {
        toast.error(`Please assign a Bill of Lading (BOL#) for ${item.name}`)
        return
      }
    }

    setIsUploading(true)
    let successCount = 0

    try {
      for (const item of stagedFiles) {
        const ok = await uploadSingleItem(item)
        if (ok) {
          successCount++
        }
      }

      if (successCount === stagedFiles.length) {
        toast.success(`Successfully uploaded ${successCount} file(s)`)
        setStagedFiles([])
        onOpenChange(false)
        if (onUploadSuccess) onUploadSuccess()
      } else {
        // Remove successfully uploaded files from staging
        setStagedFiles((prev) => prev.slice(successCount))
      }
    } catch (err: any) {
      toast.error(err.message || "Upload encountered an error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmDuplicateAction = async (action: "USE_EXISTING" | "UPLOAD_NEW_VERSION" | "CANCEL") => {
    if (!duplicateWarning) return
    const { file } = duplicateWarning
    setDuplicateWarning(null)

    if (action === "CANCEL") {
      return
    }

    if (action === "USE_EXISTING") {
      toast.info("Using existing identical file record.")
      handleRemoveItem(file.id)
      return
    }

    if (action === "UPLOAD_NEW_VERSION") {
      setIsUploading(true)
      try {
        await uploadSingleItem(file, true)
        toast.success(`Uploaded ${file.name} as verified copy.`)
        handleRemoveItem(file.id)
        if (onUploadSuccess) onUploadSuccess()
      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setIsUploading(false)
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl w-full max-h-[92vh] h-auto p-0 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:bg-slate-950 dark:border-slate-800 my-auto"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-950 dark:text-slate-100 uppercase tracking-tight">
                  Upload Shipment Documents
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Attach official customs, shipping-line B/Ls, truck credentials, invoices, and photos to digital BOL folders
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-500 flex items-center justify-center transition-all cursor-pointer dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/30">
            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                isDragging
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30"
                  : "border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:border-slate-800"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.csv,.txt"
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(e.target.files)
                }}
              />
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center font-bold">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Drag & Drop shipment files here, or <span className="text-blue-600 underline">Browse Local Files</span>
                </p>
                <p className="text-xs text-slate-500">
                  Supports PDF, JPG, PNG, WEBP, DOCX, XLSX (Up to 50MB each) • Automatic category detection
                </p>
              </div>
            </div>

            {/* Staged Upload Items Table */}
            {stagedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Staged Files for Verification ({stagedFiles.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Review and confirm classification before final persistence
                  </span>
                </div>

                <div className="space-y-3">
                  {stagedFiles.map((item) => {
                    const currentSuggestions = DOCUMENT_TYPE_SUGGESTIONS[item.categoryCode] || []

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs dark:bg-slate-900 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Math.round(item.size / 1024)} KB
                              </span>
                              {existingFileNames.some((n) => n.toLowerCase() === item.name.toLowerCase()) && (
                                <div className="mt-1">
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                                    <span>Existing file detected — will create new version</span>
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Staged File Form Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                          {/* BOL Number Input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Bill of Lading (BOL#) *</label>
                            <input
                              type="text"
                              value={item.bolNumber}
                              placeholder="e.g. SKY-BOL-2026-00125"
                              onChange={(e) => handleUpdateItem(item.id, { bolNumber: e.target.value })}
                              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs font-bold text-blue-700 dark:text-blue-400"
                            />
                          </div>

                          {/* Container Number */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Container Number (Optional)</label>
                            <input
                              type="text"
                              value={item.containerNumber}
                              placeholder="e.g. TCLU1234567"
                              onChange={(e) => handleUpdateItem(item.id, { containerNumber: e.target.value })}
                              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
                            />
                          </div>

                          {/* Category Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Document Category *</label>
                            <select
                              value={item.categoryCode}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { categoryCode: e.target.value as DocumentCategoryCode })
                              }
                              className="w-full h-8 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                            >
                              {CATEGORY_OPTIONS.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Document Type Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Specific Document Type *</label>
                            <select
                              value={item.documentType}
                              onChange={(e) => handleUpdateItem(item.id, { documentType: e.target.value as DocumentType })}
                              className="w-full h-8 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
                            >
                              {currentSuggestions.map((s) => (
                                <option key={s.type} value={s.type}>
                                  {s.label}
                                </option>
                              ))}
                              <option value="SUPPORTING_DOCUMENT">Other Supporting Doc</option>
                            </select>
                          </div>

                          {/* Document Number */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Doc Reference Number</label>
                            <input
                              type="text"
                              value={item.documentNumber}
                              placeholder="e.g. INV-9002 / CERT-882"
                              onChange={(e) => handleUpdateItem(item.id, { documentNumber: e.target.value })}
                              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono"
                            />
                          </div>

                          {/* Document Date */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Issue Date</label>
                            <input
                              type="date"
                              value={item.documentDate}
                              onChange={(e) => handleUpdateItem(item.id, { documentDate: e.target.value })}
                              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                            />
                          </div>

                          {/* Expiry Date */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">Expiry Date (if applicable)</label>
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => handleUpdateItem(item.id, { expiryDate: e.target.value })}
                              className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                            />
                          </div>

                          {/* Client Visible Toggle */}
                          <div className="flex items-center gap-2 pt-5">
                            <input
                              type="checkbox"
                              id={`client-vis-${item.id}`}
                              checked={item.clientVisible}
                              onChange={(e) => handleUpdateItem(item.id, { clientVisible: e.target.checked })}
                              className="h-4 w-4 rounded-md border-slate-300 text-blue-600"
                            />
                            <label htmlFor={`client-vis-${item.id}`} className="text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                              Visible to Client Portal
                            </label>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              {stagedFiles.length > 0
                ? `${stagedFiles.length} file(s) staged for digital folder attachment`
                : "Select files to begin upload"}
            </span>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                disabled={isUploading || stagedFiles.length === 0}
                onClick={handleUploadAll}
                className="h-9 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {isUploading ? "Uploading & Indexing..." : `Save ${stagedFiles.length} Document(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Checksum Warning Modal */}
      {duplicateWarning && (
        <Dialog open={Boolean(duplicateWarning)} onOpenChange={(o) => !o && setDuplicateWarning(null)}>
          <DialogContent className="max-w-md p-6 text-center rounded-3xl">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-slate-100">
              Possible Duplicate File Detected
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
              A file with the exact same cryptographic checksum (SHA-256) is already attached to BOL{" "}
              <strong>{duplicateWarning.file.bolNumber}</strong>. How would you like to proceed?
            </DialogDescription>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConfirmDuplicateAction("USE_EXISTING")}
                className="w-full text-xs font-bold rounded-xl border-slate-300"
              >
                Use Existing Attached File
              </Button>

              <Button
                size="sm"
                onClick={() => handleConfirmDuplicateAction("UPLOAD_NEW_VERSION")}
                className="w-full text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upload Anyway (New Copy / Version)
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleConfirmDuplicateAction("CANCEL")}
                className="w-full text-xs font-semibold text-slate-500"
              >
                Cancel Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
