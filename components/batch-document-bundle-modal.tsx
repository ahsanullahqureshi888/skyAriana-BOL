"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  FileCheck2,
  FileText,
  Printer,
  Download,
  Package,
  Plane,
  Truck,
  Building2,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Layers,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useApp } from "@/lib/app-context"
import { generateVerificationSignature } from "@/lib/services/qr-verification-service"

interface BatchDocumentBundleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeBolNumber?: string
  shipperName?: string
  consigneeName?: string
  containerNumber?: string
}

interface DocumentItem {
  id: string
  title: string
  titlePersian: string
  code: string
  category: "Customs" | "Transport" | "Origin" | "Commercial"
  pages: number
  status: "ready" | "optional"
  icon: React.ComponentType<{ className?: string }>
}

export function BatchDocumentBundleModal({
  open,
  onOpenChange,
  activeBolNumber = "BOL-EXP-2026-088",
  shipperName = "Sky Ariana Export Consignments",
  consigneeName = "International Trading Co.",
  containerNumber = "MSKU-982174-0",
}: BatchDocumentBundleModalProps) {
  const { setView } = useApp()
  const [selectedDocs, setSelectedDocs] = useState<string[]>([
    "bol-master",
    "cmr-consignment",
    "commercial-invoice",
    "packing-list",
    "safta-origin",
    "shipping-sticker",
  ])
  const [isExporting, setIsExporting] = useState(false)

  const docList: DocumentItem[] = [
    {
      id: "bol-master",
      title: "Master Bill of Lading (BOL)",
      titlePersian: "بارنامه بین‌المللی اصلی با مهر و امضای رسمی",
      code: "BOL-V3.2",
      category: "Transport",
      pages: 1,
      status: "ready",
      icon: FileText,
    },
    {
      id: "cmr-consignment",
      title: "Sky CMR International Waybill",
      titlePersian: "راهنامه تیر و سی‌ام‌آر ترانزیت سه زبانه (EN/FA/RU)",
      code: "CMR-TIR",
      category: "Transport",
      pages: 2,
      status: "ready",
      icon: Truck,
    },
    {
      id: "commercial-invoice",
      title: "ACCI Customs Commercial Invoice",
      titlePersian: "فاکتور تجاری رسمی اتاق تجارت با بارکد و QR",
      code: "INV-CUSTOMS",
      category: "Commercial",
      pages: 1,
      status: "ready",
      icon: FileCheck2,
    },
    {
      id: "packing-list",
      title: "Standardized Packing List",
      titlePersian: "فهرست بسته‌بندی کارتن‌ها، وزن خالص و ناخالص",
      code: "PKL-2026",
      category: "Customs",
      pages: 1,
      status: "ready",
      icon: Package,
    },
    {
      id: "safta-origin",
      title: "SAFTA Certificate of Origin",
      titlePersian: "گواهی مبدأ سفتای اتاق تجارت و صنایع افغانستان",
      code: "SAFTA-CO",
      category: "Origin",
      pages: 1,
      status: "ready",
      icon: Building2,
    },
    {
      id: "shipping-sticker",
      title: "Reefer Cargo Shipping Sticker",
      titlePersian: "لیبل حرارتی و استیکر کانتینری مشخصات کالا",
      code: "STICKER-A6",
      category: "Customs",
      pages: 1,
      status: "ready",
      icon: Layers,
    },
  ]

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const authCode = generateVerificationSignature({
    documentId: activeBolNumber,
    docType: "BOL",
    issueDate: new Date().toISOString().split("T")[0],
    shipper: shipperName,
    consignee: consigneeName,
    containerNumbers: containerNumber,
  })

  const handleBatchPrint = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      toast.success("Complete Logistics Docket Pack Generated", {
        description: `${selectedDocs.length} official documents compiled with cryptographic security seal #${authCode}.`,
      })
      window.print()
      onOpenChange(false)
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl bg-slate-950 text-white border-slate-800 shadow-2xl">
        <DialogHeader className="p-5 border-b border-slate-800 bg-slate-900/70 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Layers className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>1-Click Complete Logistics Document Docket</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                    Batch Export
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium">
                  Bundle Master BOL, CMR, Commercial Invoice, Packing List, and Origin Certificate
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Header Metadata Ribbon */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Consignment Ref</span>
              <span className="font-mono font-black text-white">{activeBolNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Container</span>
              <span className="font-mono font-bold text-amber-400">{containerNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Security Seal</span>
              <span className="font-mono font-bold text-emerald-400">{authCode}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Selected Documents</span>
              <span className="font-bold text-blue-400">{selectedDocs.length} of {docList.length}</span>
            </div>
          </div>

          {/* Document Checklist Selection */}
          <div className="space-y-2">
            {docList.map((doc) => {
              const isSelected = selectedDocs.includes(doc.id)
              const Icon = doc.icon
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-emerald-950/20 border-emerald-500/60 shadow-md shadow-emerald-950/30"
                      : "bg-slate-900/40 border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl border ${
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{doc.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {doc.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-[vazirmatn] font-bold" dir="rtl">
                        {doc.titlePersian}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 font-bold hidden sm:inline">
                      {doc.pages} {doc.pages === 1 ? "page" : "pages"}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-400 text-slate-950 font-black"
                          : "border-slate-700 bg-slate-900 text-transparent"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={selectedDocs.length === 0 || isExporting}
            onClick={handleBatchPrint}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Compiling {selectedDocs.length} Documents...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Batch Print / Export Complete Docket ({selectedDocs.length})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

