"use client"

import React, { useState, useEffect } from "react"
import {
  FileText,
  FileCheck2,
  FileSpreadsheet,
  Tags,
  Truck,
  ShieldAlert,
  Download,
  Printer,
  Copy,
  Check,
  History,
  AlertTriangle,
  Lock,
  RotateCcw,
  CheckCircle2,
  Share2,
  Clock,
  Sparkles,
  X,
  Building2,
  MapPin,
  Container,
  Calendar,
  ExternalLink,
  FileEdit,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import type {
  ShipmentDocumentPackage,
  ShipmentDocumentRecord,
  ShipmentDocumentType,
} from "@/lib/types/shipment-document-package"
import { DocumentEditorDrawer } from "./document-editor-drawer"
import { DocumentVersionHistoryDialog } from "./document-version-history-dialog"
import {
  generateCompleteShipmentPdfPackage,
  addCommercialInvoicePage,
  addPackingListPage,
  addTransitPaperPage,
  addPhytoDraftPage,
  addStickersSummaryPage,
} from "@/lib/utils/shipment-package-pdf"
import { registerPDFFonts } from "@/lib/utils/pdf-fonts"
import { toast } from "sonner"

interface ShipmentDocumentCenterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bolFormData: Partial<BillOfLadingFormData>
  onBolUpdated?: () => void
}

interface DocMetaConfig {
  icon: any
  label: string
  labelFa: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}

const DOC_TYPE_CONFIG: Record<ShipmentDocumentType, DocMetaConfig> = {
  commercial_invoice: {
    icon: FileSpreadsheet,
    label: "Commercial Invoice",
    labelFa: "فاکتور تجارتی",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-900/60",
    description: "Official customs & trade invoice declaring cargo valuation and terms",
  },
  packing_list: {
    icon: FileText,
    label: "Packing List",
    labelFa: "لیست بسته‌بندی",
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
    borderColor: "border-indigo-200 dark:border-indigo-900/60",
    description: "Itemized cargo carton count, gross and net weight specifications",
  },
  transit_paper: {
    icon: Truck,
    label: "Transit Paper",
    labelFa: "سند ترانزیت سرحدی",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-900/60",
    description: "Border crossing & road dispatch transit declaration for customs borders",
  },
  phytosanitary: {
    icon: ShieldAlert,
    label: "Phytosanitary Draft",
    labelFa: "گواهی قرنطین نباتی",
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
    borderColor: "border-rose-200 dark:border-rose-900/60",
    description: "Agricultural plant quarantine and health inspection draft",
  },
  stickers: {
    icon: Tags,
    label: "Container Stickers",
    labelFa: "برچسب و استیکر کانتینر",
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
    borderColor: "border-violet-200 dark:border-violet-900/60",
    description: "Standard pallet & container identification labels with markings",
  },
  bol_summary: {
    icon: FileCheck2,
    label: "BOL Summary",
    labelFa: "خلاصه بارنامه",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-900/60",
    description: "Official summary record of Bill of Lading multi-modal operations",
  },
}

export function ShipmentDocumentCenterModal({
  open,
  onOpenChange,
  bolFormData,
  onBolUpdated,
}: ShipmentDocumentCenterModalProps) {
  const [pkg, setPkg] = useState<ShipmentDocumentPackage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<ShipmentDocumentRecord | null>(null)
  const [selectedDocForHistory, setSelectedDocForHistory] = useState<ShipmentDocumentRecord | null>(null)
  const [isCopiedWhatsApp, setIsCopiedWhatsApp] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const bolNumber = bolFormData.bol_number || "DRAFT-BOL"

  const loadPackage = async () => {
    if (!bolFormData.bol_number) return
    try {
      setIsLoading(true)
      const res = await fetch("/api/shipment-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bolFormData),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load document package")
      setPkg(data.package)
    } catch (err: any) {
      console.error("Failed to load document package:", err)
      toast.error("Failed to prepare shipment documents")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadPackage()
    }
  }, [open, bolFormData.bol_number])

  const handleFinalize = async (docId: string, docName: string) => {
    try {
      const res = await fetch(`/api/shipment-documents/${docId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "Operations Specialist" }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to finalize document")

      toast.success(`${docName} finalized and locked with source snapshot!`)
      loadPackage()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleCreateRevision = async (docId: string, docName: string) => {
    try {
      const res = await fetch(`/api/shipment-documents/${docId}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Updated to reflect recent changes in master BOL",
          user: "Operations Specialist",
          bolData: bolFormData,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create revision")

      toast.success(`Revision created for ${docName}!`)
      loadPackage()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDownloadSingleDoc = async (docRecord: ShipmentDocumentRecord) => {
    try {
      toast.info(`Preparing ${docRecord.documentNumber} PDF...`)

      // 1. High-Speed Python Document Service Fast-Path (<20ms)
      try {
        let endpoint = ""
        let payload: any = null

        if (docRecord.documentType === "commercial_invoice") {
          endpoint = "/api/v1/documents/invoice"
          const d = (docRecord.documentData || {}) as any
          payload = {
            invoice_number: d.invoiceNumber || docRecord.documentNumber,
            invoice_date: d.invoiceDate || "",
            bol_number: d.bolNumber || docRecord.bolNumber,
            currency: d.currency || "USD",
            exporter_name: d.exporterName || "",
            exporter_address: d.exporterAddress || "",
            consignee_name: d.buyerName || d.consigneeName || "",
            consignee_address: d.buyerAddress || d.consigneeAddress || "",
            notify_party: d.notifyParty || "SAME AS CONSIGNEE",
            country_of_origin: d.originCountry || "AFGHANISTAN",
            country_of_destination: d.destinationCountry || "INDIA / UAE",
            port_of_loading: d.portOfLoading || "",
            port_of_discharge: d.portOfDischarge || "",
            payment_terms: d.paymentTerms || "T/T",
            items: (d.items || []).map((it: any) => ({
              description: it.commodityName || it.description || "Cargo",
              quantity: Number(it.quantity || it.packageCount || 1),
              unit: it.quantityUnit || it.packageType || "CTNS",
              unit_price: Number(it.invoiceRate || 0),
              amount: Number(it.invoiceValue || 0),
            })),
            discount: 0,
            tax: 0,
            bank_details: d.bankDetails || "",
            remarks: d.remarks || "",
          }
        } else if (docRecord.documentType === "packing_list") {
          endpoint = "/api/v1/documents/packing-list"
          const d = (docRecord.documentData || {}) as any
          payload = {
            packing_list_number: d.packingListNumber || docRecord.documentNumber,
            packing_list_date: d.packingListDate || "",
            bol_number: d.bolNumber || docRecord.bolNumber,
            invoice_number: d.invoiceNumber || "",
            exporter_name: d.exporterName || "",
            exporter_address: d.exporterAddress || "",
            consignee_name: d.consigneeName || "",
            consignee_address: d.consigneeAddress || "",
            items: (d.items || []).map((it: any) => ({
              package_no: it.marks || "1",
              description: it.commodityName || "Cargo",
              cartons: Number(it.packageCount || 1),
              net_weight_kg: Number(it.netWeight || 0),
              gross_weight_kg: Number(it.grossWeight || 0),
              measurement_cbm: 0,
            })),
            container_numbers: Array.isArray(d.containerNumbers) ? d.containerNumbers : (d.containerNumbers ? [d.containerNumbers] : []),
            seal_numbers: Array.isArray(d.sealNumbers) ? d.sealNumbers : (d.sealNumbers ? [d.sealNumbers] : []),
          }
        } else if (docRecord.documentType === "transit_paper") {
          endpoint = "/api/v1/documents/transit"
          const d = (docRecord.documentData || {}) as any
          payload = {
            transit_number: d.transitNumber || docRecord.documentNumber,
            transit_date: d.issueDate || "",
            bol_number: d.bolNumber || docRecord.bolNumber,
            border_station: d.borderCustoms || "Islam Qala / Torghundi",
            carrier_name: d.carrierName || "SKY ARIANA LOGISTICS",
            truck_number: d.truckPlate || "",
            driver_name: d.driverName || "",
            driver_father_name: d.driverFatherName || "",
            driver_license_id: d.driverLicense || "",
            driver_phone: d.driverPhone || "",
            shipper_name: d.shipperName || "",
            consignee_name: d.consigneeName || "",
            customs_declaration_no: d.customsDeclNumber || "",
            cargo_description: d.commodity || "",
            package_count: String(d.totalPackages || ""),
            gross_weight: String(d.grossWeight || ""),
            net_weight: String(d.netWeight || ""),
          }
        } else if (docRecord.documentType === "phytosanitary") {
          endpoint = "/api/v1/documents/phytosanitary"
          const d = (docRecord.documentData || {}) as any
          payload = {
            certificate_number: d.certNumber || docRecord.documentNumber,
            issue_date: d.issueDate || "",
            bol_number: d.bolNumber || docRecord.bolNumber,
            exporter_name: d.exporterName || "",
            consignee_name: d.consigneeName || "",
            botanical_name: d.botanicalName || "Ficus carica / Ferula foetida",
            commodity_description: d.commodity || "",
            number_of_packages: String(d.packageCount || ""),
            declared_weight: String(d.weight || ""),
            treatment_type: d.treatment || "METHYL BROMIDE FUMIGATION",
          }
        } else if (docRecord.documentType === "stickers") {
          endpoint = "/api/v1/documents/stickers"
          const d = (docRecord.documentData || {}) as any
          payload = {
            bol_number: d.bolNumber || docRecord.bolNumber,
            consignee_name: d.consigneeName || "",
            destination: d.destination || "",
            commodity: d.commodity || "",
            total_packages: Number(d.totalPackages || 10),
            container_number: d.containerNumber || "",
          }
        }

        if (endpoint && payload) {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(3500),
          })
          if (resp.ok) {
            const json = await resp.json()
            if (json.success && json.data?.download_url) {
              const a = document.createElement("a")
              a.href = json.data.download_url
              a.download = json.data.filename || `${docRecord.bolNumber}-${docRecord.documentType.toUpperCase()}.pdf`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              toast.success(`${docRecord.documentNumber} downloaded via high-speed PDF engine!`)
              return
            }
          }
        }
      } catch (backendError) {
        // Fallback transparently to browser-side jsPDF
      }

      // 2. Client-Side jsPDF Fallback (Offline-First Guarantee)
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      await registerPDFFonts(pdf)

      if (docRecord.documentType === "commercial_invoice") {
        addCommercialInvoicePage(pdf, docRecord.documentData as any)
      } else if (docRecord.documentType === "packing_list") {
        addPackingListPage(pdf, docRecord.documentData as any)
      } else if (docRecord.documentType === "transit_paper") {
        addTransitPaperPage(pdf, docRecord.documentData as any)
      } else if (docRecord.documentType === "phytosanitary") {
        addPhytoDraftPage(pdf, docRecord.documentData as any)
      } else if (docRecord.documentType === "stickers") {
        addStickersSummaryPage(pdf, docRecord.documentData as any)
      }

      pdf.save(`${docRecord.bolNumber}-${docRecord.documentType.toUpperCase()}.pdf`)
      toast.success(`${docRecord.documentNumber} downloaded!`)
    } catch (err: any) {
      toast.error(`PDF generation failed: ${err.message}`)
    }
  }

  const handleDownloadCompletePackage = async () => {
    if (!pkg) return
    try {
      setIsGeneratingPdf(true)
      toast.info("Generating unified shipment documentation package...")
      const mergedPdf = await generateCompleteShipmentPdfPackage(pkg)
      mergedPdf.save(`${pkg.bolNumber}-COMPLETE-DOCUMENTS.pdf`)
      toast.success("Complete Shipment Document Package downloaded successfully!")
    } catch (err: any) {
      toast.error(`Failed to generate complete package: ${err.message}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleCopyWhatsApp = () => {
    if (!pkg) return
    const lines = [
      `📦 *SHIPMENT DOCUMENT PACKAGE STATUS*`,
      `BOL: *${pkg.bolNumber}*`,
      `Customer: *${pkg.customerName}*`,
      `Destination: *${pkg.destination}*`,
      `Container: *${pkg.containerNumbers || "Pending"}*`,
      `Truck: *${pkg.truckNumber || "Pending"}*`,
      `--------------------------------`,
      `📋 *DOCUMENT READINESS (${pkg.documentsReadyCount}/${pkg.documentsTotalCount}):*`,
    ]

    Object.values(pkg.documents).forEach((d) => {
      const isReady = d.status === "ready" || d.status === "issued" || d.status === "approved"
      const icon = isReady ? "✅" : "⚠️"
      const label = d.documentType.replace("_", " ").toUpperCase()
      lines.push(`${icon} *${label}*: ${d.documentNumber} (${d.status.toUpperCase()})`)
      if (d.missingFields && d.missingFields.length > 0) {
        lines.push(`   └ Pending: ${d.missingFields.join(", ")}`)
      }
    })

    lines.push(`--------------------------------`)
    lines.push(`AQ Companies • Sky Ariana Limited`)

    navigator.clipboard.writeText(lines.join("\n"))
    setIsCopiedWhatsApp(true)
    toast.success("WhatsApp document status copied to clipboard!")
    setTimeout(() => setIsCopiedWhatsApp(false), 2500)
  }

  if (!pkg && isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md p-8 text-center rounded-3xl"
          showCloseButton={false}
        >
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <DialogTitle className="text-sm font-black text-slate-900">
              Loading Shipment Documents...
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Synchronizing master BOL data for <span className="font-mono font-bold text-blue-700">{bolNumber}</span>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const hasSourceChanges = pkg && Object.values(pkg.documents).some((d) => d.sourceDataChanged)
  const readyPercent = pkg ? Math.round((pkg.documentsReadyCount / pkg.documentsTotalCount) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-full h-[90vh] max-h-[920px] p-0 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:bg-slate-950 dark:border-slate-800 my-auto"
        showCloseButton={false}
      >
        {/* ================================================================= */}
        {/* 1. FIXED HEADER BAR                                               */}
        {/* ================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-slate-950 dark:text-slate-100 uppercase">
                  Shipment Document Package
                </DialogTitle>
                <span className="rounded-lg bg-blue-100/90 text-blue-900 border border-blue-200 px-2.5 py-0.5 text-xs font-black font-mono tracking-tight dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900">
                  {bolNumber}
                </span>
                <span className="hidden sm:inline-flex text-xs font-bold text-slate-400 select-none">•</span>
                <span className="hidden sm:inline-flex text-xs font-bold text-slate-600 dark:text-slate-400">
                  AQ Companies
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-500 truncate mt-0.5">
                Master Bill of Lading documentation suite • Cargo manifests, transit papers, packing lists & customs declarations
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyWhatsApp}
              className="h-9 gap-1.5 text-xs font-bold border-slate-300 hover:bg-slate-100 cursor-pointer shadow-2xs"
            >
              {isCopiedWhatsApp ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-slate-600" />}
              <span className="hidden sm:inline">{isCopiedWhatsApp ? "Copied!" : "WhatsApp Update"}</span>
            </Button>

            <Button
              size="sm"
              disabled={isGeneratingPdf}
              onClick={handleDownloadCompletePackage}
              className="h-9 gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-xs font-black text-white shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isGeneratingPdf ? "Building PDF..." : "Export Complete PDF"}</span>
            </Button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-500 flex items-center justify-center transition-all cursor-pointer dark:border-slate-800 dark:hover:bg-slate-900"
              title="Close window"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. READINESS & METADATA SUMMARY BAR                               */}
        {/* ================================================================= */}
        {pkg && (
          <div className="px-6 py-3 bg-slate-50/90 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                  Package Status:
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
                    pkg.isPackageComplete
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {pkg.isPackageComplete ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Ready for Clearance ({pkg.documentsReadyCount}/{pkg.documentsTotalCount})
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 text-amber-600" />
                      Pending Fields ({pkg.documentsReadyCount}/{pkg.documentsTotalCount} Ready)
                    </>
                  )}
                </span>
              </div>

              {/* Linear Progress Bar */}
              <div className="flex items-center gap-2">
                <div className="w-24 sm:w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      pkg.isPackageComplete ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-blue-600"
                    }`}
                    style={{ width: `${readyPercent}%` }}
                  />
                </div>
                <span className="font-mono font-black text-xs text-slate-700 dark:text-slate-300">
                  {readyPercent}%
                </span>
              </div>
            </div>

            {/* Quick Metadata Chips */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-wrap text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold dark:bg-slate-800 dark:border-slate-700">
                <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                <span className="max-w-36 truncate" title={pkg.customerName}>{pkg.customerName || "No Consignee"}</span>
              </span>

              <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold dark:bg-slate-800 dark:border-slate-700">
                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="max-w-32 truncate" title={pkg.destination}>{pkg.destination || "Destination"}</span>
              </span>

              <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold font-mono dark:bg-slate-800 dark:border-slate-700">
                <Container className="h-3 w-3 text-indigo-600 shrink-0" />
                <span className="max-w-28 truncate">{pkg.containerNumbers || "No Cont."}</span>
              </span>

              <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold font-mono dark:bg-slate-800 dark:border-slate-700">
                <Truck className="h-3 w-3 text-amber-600 shrink-0" />
                <span className="max-w-24 truncate">{pkg.truckNumber || "No Truck"}</span>
              </span>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. SCROLLABLE CARD MATRIX                                         */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Source Data Changed Alert Banner */}
          {hasSourceChanges && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-black text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                    Master BOL Updated After Document Generation:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                    Changes in cargo weights, driver, or container numbers were detected. Historical finalized snapshots remain preserved.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-extrabold uppercase text-amber-800 bg-amber-200/80 px-2.5 py-1 rounded-lg shrink-0 border border-amber-300 dark:bg-amber-900/60 dark:text-amber-200">
                Click Revise to re-sync
              </span>
            </div>
          )}

          {/* 6-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {/* ------------------------------------------------------------- */}
            {/* CARD 0: BILL OF LADING (MASTER RECORD)                        */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-blue-200 bg-white p-4.5 shadow-xs transition-all hover:shadow-md dark:border-blue-900/70 dark:bg-slate-900">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold dark:bg-blue-950 dark:text-blue-300 shrink-0">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                        Bill of Lading
                      </h3>
                      <p className="text-[10px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                        بارنامه بین‌المللی
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider dark:bg-blue-950 dark:text-blue-300">
                    MASTER
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Primary multi-modal transport document governing cross-border freight from origin to destination.
                </p>

                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-1.5 font-mono text-xs dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">BOL#:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">{bolNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-emerald-600">Active Master Record</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issued:</span>
                    <span className="text-slate-700 dark:text-slate-300">{bolFormData.issue_date || "Current"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Master Source of Truth
                </span>
                <span className="text-[10px] font-mono text-slate-400">v1.0 (Live)</span>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CARDS 1 to 5: CHILD GENERATED DOCUMENTS                       */}
            {/* ------------------------------------------------------------- */}
            {pkg &&
              Object.entries(pkg.documents).map(([key, doc]) => {
                const docType = key as ShipmentDocumentType
                const config = DOC_TYPE_CONFIG[docType] || {
                  icon: FileText,
                  label: docType.replace("_", " "),
                  labelFa: "",
                  color: "text-slate-700",
                  bgColor: "bg-slate-100",
                  borderColor: "border-slate-200",
                  description: "Generated shipment document",
                }
                const Icon = config.icon
                const isFinalized = doc.status === "issued" || doc.status === "approved"
                const isReady = doc.status === "ready" || isFinalized

                return (
                  <div
                    key={doc.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4.5 bg-white shadow-xs transition-all hover:shadow-md dark:bg-slate-900 ${
                      doc.sourceDataChanged
                        ? "border-amber-400 ring-2 ring-amber-400/20"
                        : isFinalized
                        ? "border-blue-300 dark:border-blue-900"
                        : isReady
                        ? "border-emerald-200/90 dark:border-emerald-900/50"
                        : "border-amber-200 dark:border-amber-900/50"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Top: Icon, Title, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-9 w-9 rounded-xl ${config.bgColor} ${config.color} flex items-center justify-center font-bold shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                              {config.label}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                              {config.labelFa}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {doc.sourceDataChanged && (
                            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                              UPDATED
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              isFinalized
                                ? "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                : isReady
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>

                      {/* Document Ref & Version */}
                      <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                          {doc.documentNumber}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          Version {doc.currentVersion}
                        </span>
                      </div>

                      {/* Missing Fields or Completion Checklist */}
                      {doc.missingFields.length > 0 ? (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/40 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>Required ({doc.missingFields.length} pending):</span>
                          </div>
                          <ul className="space-y-1 pl-1 text-[11px] text-slate-700 dark:text-slate-300">
                            {doc.missingFields.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 leading-tight">
                                <span className="text-amber-600 font-bold">•</span>
                                <span className="font-medium">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>All Required Fields Verified & Complete</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Matrix */}
                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDocForEdit(doc)}
                          className="h-8.5 text-xs font-bold rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <FileEdit className="h-3.5 w-3.5 text-slate-500" />
                          <span>Edit Details</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadSingleDoc(doc)}
                          className="h-8.5 text-xs font-bold rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-600" />
                          <span>PDF</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFinalized ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateRevision(doc.id, config.label)}
                            className="h-8 flex-1 text-xs font-bold rounded-xl text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Revise</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFinalize(doc.id, config.label)}
                            className="h-8 flex-1 text-xs font-bold rounded-xl text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Finalize & Lock</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDocForHistory(doc)}
                          className="h-8 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="View Version History & Snapshots"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. FIXED BOTTOM FOOTER                                            */}
        {/* ================================================================= */}
        {pkg && (
          <div className="px-6 py-4 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong className="text-slate-900 dark:text-white font-black">{pkg.documentsReadyCount}</strong> of <strong className="text-slate-900 dark:text-white font-black">{pkg.documentsTotalCount}</strong> child documents ready for border dispatch & customs clearance
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9.5 px-5 text-xs font-bold cursor-pointer rounded-xl border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Close
              </Button>

              <Button
                size="sm"
                disabled={isGeneratingPdf}
                onClick={handleDownloadCompletePackage}
                className="h-9.5 px-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 text-xs font-black text-white shadow-lg shadow-blue-900/25 rounded-xl cursor-pointer flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>{isGeneratingPdf ? "Building Document Package..." : "Download Complete Shipment PDF"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Drawers & Dialogs */}
        <DocumentEditorDrawer
          open={Boolean(selectedDocForEdit)}
          onOpenChange={(open) => !open && setSelectedDocForEdit(null)}
          document={selectedDocForEdit}
          onSaved={loadPackage}
        />

        <DocumentVersionHistoryDialog
          open={Boolean(selectedDocForHistory)}
          onOpenChange={(open) => !open && setSelectedDocForHistory(null)}
          document={selectedDocForHistory}
        />
      </DialogContent>
    </Dialog>
  )
}
