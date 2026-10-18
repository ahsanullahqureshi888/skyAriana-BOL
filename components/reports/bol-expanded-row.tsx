"use client"

import React, { useState, useMemo } from "react"
import { SavedDocument } from "@/lib/reports/types"
import { formatDisplayDate, isRtlText, extractBolRoute, extractTruckNo, extractInvoiceNo } from "@/lib/reports/parsers"
import { extractDriverFatherName } from "@/lib/reports/export-excel"
import { parseSyncedCargoItems, splitMultiCargoItems } from "@/lib/utils/cargo-grid"
import { extractBolCargoAndRates } from "@/lib/reports/cargo-rate-extractor"
import type { BillOfLadingFormData, RouteStop } from "@/lib/types/bill-of-lading"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Building2,
  Users,
  Boxes,
  Truck,
  DollarSign,
  Compass,
  FileCheck,
  Edit,
  ExternalLink,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  MapPin,
  Scale,
  Calendar,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  Phone,
  Mail,
  FileDown,
  Hash,
  Share2,
} from "lucide-react"
import { toast } from "sonner"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import { buildManagementSummary } from "@/lib/whatsapp/bulk-message"

export interface BolExpandedRowProps {
  doc: SavedDocument
  visibleColSpan: number
  onEditBol?: (id: string) => void
  onOpenPreview?: (id: string) => void
  onClose?: () => void
}

type ExpandedTab = "shipment" | "parties" | "cargo" | "transport" | "financial" | "documents" | "notes"

export function BolExpandedRow({
  doc,
  visibleColSpan,
  onEditBol,
  onOpenPreview,
  onClose,
}: BolExpandedRowProps) {
  const [activeTab, setActiveTab] = useState<ExpandedTab>("cargo")
  const [showRawJson, setShowRawJson] = useState(false)

  // Parse multi-item cargo
  const syncedCargo = useMemo(() => {
    return parseSyncedCargoItems(doc as unknown as Partial<BillOfLadingFormData>)
  }, [doc])

  // Comprehensive cargo & multi-rate extraction
  const cargoData = useMemo(() => {
    return extractBolCargoAndRates(doc)
  }, [doc])

  // Extract clean commodities list
  const commodityList = useMemo(() => {
    const rawDesc = (doc.cargo_description || doc.description_of_goods || doc.goods_description) || ""
    if (!rawDesc) {
      return doc.commodity ? [doc.commodity] : []
    }
    const lines = rawDesc
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    const cleanLines = lines.filter((l) => {
      const u = l.toUpperCase()
      if (u.includes("CONTAINER & CARGO") || u.includes("CARGO PARTICULARS")) return false
      if (u.startsWith("TRANSIT DATE:") || u.startsWith("BORDER:") || u.startsWith("HS CODE:")) return false
      if (u.startsWith("INVOICE NO:") || u.startsWith("INV NO:") || u.startsWith("TRUCK NO:")) return false
      return true
    })
    const items: string[] = []
    for (const line of cleanLines) {
      if (line.includes(" - ") && /\d+\s*(?:CTNS|BAGS|PKGS|CARTONS|BOXES|PCS|KGS)/i.test(line)) {
        const parts = line.split(/\s*-\s*/)
        for (const p of parts) {
          const c = p.replace(/^[-•*•·]+\s*/, "").trim()
          if (c) items.push(c)
        }
      } else {
        const c = line.replace(/^[-•*•·]+\s*/, "").trim()
        if (c) items.push(c)
      }
    }
    return items.length > 0 ? items : (doc.commodity ? [doc.commodity] : ["—"])
  }, [doc])

  const routeInfo = useMemo(() => extractBolRoute(doc), [doc])
  const truckPlate = extractTruckNo(doc) || doc.truck_number || "—"
  const invoiceNo = extractInvoiceNo(doc) || doc.invoice_no || (doc as any).invoice_number || "—"

  const isShipperRtl = isRtlText(doc.shipper_name)
  const isConsigneeRtl = isRtlText(doc.consignee_name)
  const notifyPartyText = (doc.notify_party_name || doc.notify_party || (doc as any).notifyParty || "").trim()
  const notifyAddressText = (doc.notify_party_address || (doc as any).notifyAddress || "").trim()
  const isNotifyRtl = isRtlText(notifyPartyText)
  const isNotifySame = !notifyPartyText ||
    notifyPartyText.toUpperCase() === "SAME" ||
    notifyPartyText.toUpperCase() === "SAME AS CONSIGNEE" ||
    (doc.consignee_name && notifyPartyText.toLowerCase() === doc.consignee_name.toLowerCase())

  const handleCopyWhatsApp = async () => {
    try {
      const normalized = normalizeToWhatsAppShipment(doc)
      const text = buildManagementSummary([normalized])
      await navigator.clipboard.writeText(text)
      toast.success(`WhatsApp details for ${doc.bol_number || "BOL"} copied to clipboard!`)
    } catch {
      toast.error("Failed to copy WhatsApp summary")
    }
  }

  // Document checklist calculation
  const documentChecklist = useMemo(() => {
    const list = [
      { name: "Invoice Document", ready: Boolean(doc.invoice_no || (doc as any).invoice_number), ref: doc.invoice_no || (doc as any).invoice_number || "Missing" },
      { name: "Packing List Specification", ready: Boolean(doc.number_of_packages && doc.net_weight), ref: doc.number_of_packages || "Missing" },
      { name: "Truck Waybill / Driver Assigned", ready: Boolean(doc.truck_number || doc.driver_name), ref: doc.driver_name ? `${doc.driver_name} (${truckPlate})` : "Missing" },
      { name: "Container & Seal Verified", ready: Boolean(doc.container_numbers), ref: doc.container_numbers || "Not Assigned" },
      { name: "Official PDF Document", ready: Boolean(doc.pdf_url), ref: doc.pdf_url ? "Ready & Uploaded" : "Pending Generation" },
      { name: "Border Transit Manifest", ready: Boolean(routeInfo.borderCrossing || doc.cargo_route_note), ref: routeInfo.borderCrossing || "Direct Route" },
    ]
    const completedCount = list.filter((i) => i.ready).length
    return { list, completedCount, totalCount: list.length }
  }, [doc, truckPlate, routeInfo])

  return (
    <tr className="bg-slate-50/95 dark:bg-slate-900/90 border-y-2 border-blue-400 dark:border-blue-600 transition-all">
      <td colSpan={visibleColSpan} className="p-0">
        <div className="p-4 sm:p-5 space-y-4 max-w-full overflow-hidden">
          {/* Header Bar of Expanded Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono font-black text-xs shadow-xs">
                <FileText className="w-3.5 h-3.5" />
                {doc.bol_number || "BOL RECORD"}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Issued: <strong className="text-slate-800 dark:text-slate-200">{formatDisplayDate(doc.issue_date || doc.created_at)}</strong>
              </span>
              {doc.created_at && (
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  (Created: {new Date(doc.created_at).toLocaleDateString("en-GB")})
                </span>
              )}
              {/* Document Readiness Pill */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                documentChecklist.completedCount === documentChecklist.totalCount
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                Docs: {documentChecklist.completedCount}/{documentChecklist.totalCount}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {onEditBol && (
                <Button
                  size="sm"
                  onClick={() => onEditBol(doc.id)}
                  className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit in BOL Editor</span>
                </Button>
              )}

              {onOpenPreview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenPreview(doc.id)}
                  className="h-8 px-3 rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>A4 Print Preview</span>
                </Button>
              )}

              {doc.pdf_url && (
                <a
                  href={doc.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs shadow-2xs transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </a>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyWhatsApp}
                className="h-8 px-3 rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-xs"
                title="Copy WhatsApp Summary"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "cargo", label: `Cargo Breakdown (${syncedCargo.items.length})`, icon: Boxes },
              { id: "parties", label: "Parties Dossier", icon: Building2 },
              { id: "transport", label: "Transport & Route", icon: Truck },
              { id: "financial", label: "Financials", icon: DollarSign },
              { id: "shipment", label: "Shipment Overview", icon: Layers },
              { id: "documents", label: `Checklist (${documentChecklist.completedCount}/${documentChecklist.totalCount})`, icon: FileCheck },
              { id: "notes", label: "Operational Notes", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ExpandedTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* TAB 1: CARGO BREAKDOWN (SUB-TABLE) */}
          {activeTab === "cargo" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-700 dark:text-slate-300">
                  Itemized Cargo Breakdown ({syncedCargo.items.length} {syncedCargo.items.length === 1 ? "Line Item" : "Line Items"})
                </span>
                <span className="font-mono text-slate-500 text-[11px]">
                  Total: {syncedCargo.totals.totalPackages.toLocaleString()} {syncedCargo.totals.packageUnit} • {syncedCargo.totals.totalGrossWeight.toLocaleString()} {syncedCargo.totals.weightUnit} Gross
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10.5px] uppercase tracking-wider">
                      <th className="py-2 px-2.5 text-center w-8">#</th>
                      <th className="py-2 px-3 min-w-[180px]">Commodity / Description</th>
                      <th className="py-2 px-3 text-right min-w-[90px]">Packages</th>
                      <th className="py-2 px-3 text-right min-w-[80px]">Unit</th>
                      <th className="py-2 px-3 text-right min-w-[90px]">Net / Ctn</th>
                      <th className="py-2 px-3 text-right min-w-[90px]">Gross / Ctn</th>
                      <th className="py-2 px-3 text-right min-w-[100px]">Net Weight</th>
                      <th className="py-2 px-3 text-right min-w-[100px]">Gross Weight</th>
                      <th className="py-2 px-3 text-right min-w-[90px]">Rate</th>
                      <th className="py-2 px-3 text-right min-w-[110px]">Goods Value</th>
                      <th className="py-2 px-3 min-w-[110px]">Marks & Nos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {syncedCargo.items.map((item, cIdx) => {
                      const commName = cargoData.items[cIdx]?.fullTitle || cargoData.items[cIdx]?.commodity || commodityList[cIdx] || "Cargo"
                      return (
                        <tr key={item.id || cIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-2.5 text-center font-bold text-slate-400">{cIdx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {commName}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.packageText || "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 font-mono">
                            {syncedCargo.totals.packageUnit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.netPerCarton || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.grossPerCarton || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-900 dark:text-blue-300">
                            {item.netWeight || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.grossWeight || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                            {item.rate || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                            {item.goodsValue || "—"}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[140px]" title={(doc as any).marks_and_numbers || "—"}>
                            {(doc as any).marks_and_numbers || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Sub-table Totals Row */}
                  <tfoot>
                    <tr className="bg-slate-100/90 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 font-extrabold text-xs">
                      <td colSpan={2} className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 uppercase tracking-wider font-black">
                        Total Sum:
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-blue-950 dark:text-blue-200">
                        {syncedCargo.totals.totalPackages.toLocaleString()} {syncedCargo.totals.packageUnit}
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="py-2 px-3 text-right font-mono font-black text-blue-900 dark:text-blue-300">
                        {syncedCargo.totals.totalNetWeight.toLocaleString()} {syncedCargo.totals.weightUnit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-950 dark:text-white">
                        {syncedCargo.totals.totalGrossWeight.toLocaleString()} {syncedCargo.totals.weightUnit}
                      </td>
                      <td></td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 dark:text-emerald-300">
                        {syncedCargo.totals.totalGoodsValue > 0
                          ? `${syncedCargo.totals.totalGoodsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${syncedCargo.totals.currency}`
                          : "—"}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Full Description & Marks Box */}
              {(doc.cargo_description || doc.description_of_goods || (doc as any).marks_and_numbers) && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                  <span className="font-extrabold uppercase text-[10px] text-slate-400 block mb-1">Raw Description & Particulars of Cargo</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-[11.5px]">
                    {doc.cargo_description || doc.description_of_goods || doc.goods_description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PARTIES DOSSIER */}
          {activeTab === "parties" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Shipper Card */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>Shipper / فرستنده</span>
                </div>
                <div>
                  <p className={`font-black text-slate-900 dark:text-white text-xs ${isShipperRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isShipperRtl ? "rtl" : "ltr"}>
                    {doc.shipper_name || <span className="text-rose-500 italic">Not Specified</span>}
                  </p>
                  {(doc as any).shipper_address && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap leading-relaxed">
                      {(doc as any).shipper_address}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                  {(doc as any).shipper_licence && (
                    <p className="text-slate-500">
                      <strong className="text-slate-700 dark:text-slate-300">License / T.L:</strong> {(doc as any).shipper_licence}
                    </p>
                  )}
                  {(doc as any).shipper_contact && (
                    <p className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{(doc as any).shipper_contact}</span>
                    </p>
                  )}
                  {(doc as any).shipper_email && (
                    <p className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{(doc as any).shipper_email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Consignee Card */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Users className="w-4 h-4" />
                  <span>Consignee / گیرنده</span>
                </div>
                <div>
                  <p className={`font-black text-slate-900 dark:text-white text-xs ${isConsigneeRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isConsigneeRtl ? "rtl" : "ltr"}>
                    {doc.consignee_name || <span className="text-rose-500 italic">Not Specified</span>}
                  </p>
                  {(doc as any).consignee_address && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap leading-relaxed">
                      {(doc as any).consignee_address}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                  {(doc as any).consignee_contact && (
                    <p className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{(doc as any).consignee_contact}</span>
                    </p>
                  )}
                  {(doc as any).consignee_fssai && (
                    <p className="text-slate-500">
                      <strong className="text-slate-700 dark:text-slate-300">FSSAI / Tax ID:</strong> {(doc as any).consignee_fssai}
                    </p>
                  )}
                  {(doc as any).consignee_email && (
                    <p className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{(doc as any).consignee_email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Notify Party Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Notify Party / طرف مطلع</span>
                </div>
                <div>
                  {isNotifySame ? (
                    <p className="font-medium text-slate-400 italic text-xs">
                      SAME AS CONSIGNEE
                    </p>
                  ) : (
                    <>
                      <p className={`font-bold text-slate-900 dark:text-white text-xs ${isNotifyRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isNotifyRtl ? "rtl" : "ltr"}>
                        {notifyPartyText}
                      </p>
                      {notifyAddressText && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap leading-relaxed">
                          {notifyAddressText}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSPORT, ROUTE & EQUIPMENT */}
          {activeTab === "transport" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Truck & Driver Dossier */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Truck & Driver Operations</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Truck Plate</span>
                    <p className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5" dir="ltr">
                      {truckPlate}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Driver Rent</span>
                    <p className="font-mono font-black text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                      {doc.driver_rent || (doc as any).driverFreight || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Driver Name</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {doc.driver_name || "—"}{" "}
                      {extractDriverFatherName(doc) !== "-" ? `(ولد ${extractDriverFatherName(doc)})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Driver Contact</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5" dir="ltr">
                      {doc.driver_contact || "—"}
                    </p>
                  </div>
                </div>

                {/* Container Fleet Data */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Container Numbers</span>
                    <p className="font-mono font-black text-blue-900 dark:text-blue-300 text-xs mt-0.5">
                      {doc.container_numbers || "Not Declared"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Seal Numbers</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                      {doc.seal_numbers || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Equipment Type</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {(doc as any).container_type || (doc as any).equipment_type || (routeInfo.hasReefer ? "40RF Reefer" : "Standard Dry")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Temperature Setting</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                      {(doc as any).temperature_setting || (routeInfo.hasReefer ? "-18°C Frozen / Chilled" : "Ambient")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Route & Multi-Modal Steps */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <span>Multi-Modal Routing & Border Posts</span>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                  <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 block mb-0.5">Primary Route Corridor</span>
                  <p className="font-black text-blue-950 dark:text-blue-100 text-xs" dir={routeInfo.isPersian ? "rtl" : "ltr"}>
                    {routeInfo.display}
                  </p>
                  {routeInfo.borderCrossing && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-bold text-[10px]">
                      Border Crossing: {routeInfo.borderCrossing}
                    </span>
                  )}
                </div>

                {/* Ports & Marine Legs */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Port of Loading (POL)</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{doc.port_of_loading || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Port of Discharge (POD)</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{doc.port_of_discharge || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Place of Delivery</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{doc.place_of_delivery || doc.destination_country || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Vessel & Voyage</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {(doc as any).vessel_name ? `${(doc as any).vessel_name} / ${(doc as any).voyage_number || ""}` : "—"}
                    </p>
                  </div>
                </div>

                {/* Multi-stop Route Steps */}
                {doc.routes && doc.routes.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Waypoints & Legs</span>
                    <div className="flex items-center gap-1 flex-wrap text-[11px]">
                      {doc.routes.map((st, sIdx) => (
                        <span key={st.id || sIdx} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-800 dark:text-slate-200">
                          {st.transportMode === "vessel" ? "🚢" : st.transportMode === "airplane" ? "✈️" : "🚛"} {st.location || st.locationPersian}
                          {sIdx < doc.routes!.length - 1 && <span className="text-slate-400">→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIALS */}
          {activeTab === "financial" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30">
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block mb-0.5">Total Goods Value</span>
                <p className="text-base font-black font-mono text-emerald-900 dark:text-emerald-200">
                  {doc.goods_value || "—"}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Declared commercial value</span>
              </div>

              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 block mb-0.5">
                  Rate per Unit/KG {cargoData.isMultiRate ? `(${cargoData.allRates.length} Rates)` : ""}
                </span>
                {cargoData.isMultiRate ? (
                  <div className="space-y-1 mt-1 font-mono text-xs text-blue-950 dark:text-blue-100">
                    {cargoData.items.map((it, idx) => {
                      if (!it.rate) return null
                      return (
                        <div key={idx} className="flex items-center justify-between gap-1 border-b border-blue-200/50 dark:border-blue-800/50 pb-0.5 last:border-0">
                          <span className="text-[10px] text-slate-500 font-sans truncate max-w-[120px]" title={it.fullTitle}>
                            #{idx + 1} {it.commodity}:
                          </span>
                          <span className="font-bold">{it.rate}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-base font-black font-mono text-blue-900 dark:text-blue-200">
                    {cargoData.displayRate || doc.rate_per_kgs || "—"}
                  </p>
                )}
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5">Billing freight/cargo rate</span>
              </div>

              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block mb-0.5">Driver Rent</span>
                <p className="text-base font-black font-mono text-amber-900 dark:text-amber-200">
                  {doc.driver_rent || (doc as any).driverFreight || "—"}
                </p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Cash transport outlay</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Freight Terms</span>
                <p className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                  {(doc as any).freight_terms || "Prepaid"}
                </p>
                <span className="text-[10px] text-slate-500">Payable at: {(doc as any).freight_payable_at || "Origin"}</span>
              </div>
            </div>
          )}

          {/* TAB 5: SHIPMENT OVERVIEW */}
          {activeTab === "shipment" && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">BOL Identifier</span>
                <p className="font-mono font-black text-blue-900 dark:text-blue-200 text-sm mt-0.5">{doc.bol_number || "—"}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {doc.id}</p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Invoice Number</span>
                <p className="font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm mt-0.5">{invoiceNo}</p>
                {(doc as any).invoice_date && (
                  <p className="text-[10px] text-slate-500 mt-0.5">Date: {(doc as any).invoice_date}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Issue Date</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{formatDisplayDate(doc.issue_date || doc.created_at)}</p>
                {(doc as any).persianDateNumeric && (
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-[vazirmatn] mt-0.5" dir="rtl">{(doc as any).persianDateNumeric}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Status & Workflow</span>
                <p className="mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    {doc.pdf_url ? "PDF READY" : "SAVED RECORD"}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS CHECKLIST */}
          {activeTab === "documents" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {documentChecklist.list.map((item, idx) => (
                <div key={idx} className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  item.ready
                    ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                }`}>
                  {item.ready ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-[11px] text-slate-500 truncate" title={item.ref}>{item.ref}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 7: OPERATIONAL NOTES */}
          {activeTab === "notes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Responsible Officers & Stations</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300 block">Loading Responsible:</strong>
                    <span className="text-slate-600 dark:text-slate-400">{(doc as any).loading_responsible || (doc as any).loadingResponsible || "Kandahar Depot"}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300 block">Border Representative:</strong>
                    <span className="text-slate-600 dark:text-slate-400">{(doc as any).border_representative || (doc as any).borderRepresentative || "Islam Qala Agent"}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Cargo Route Note & Instructions</span>
                <p className="text-[11.5px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed font-[vazirmatn]" dir="rtl">
                  {doc.cargo_route_note || (doc as any).route_name || "مسیر استاندارد ترانزیتی"}
                </p>
                {doc.remarks && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                    <strong>Remarks:</strong> {doc.remarks}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Raw JSON Inspector */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showRawJson ? "Hide Raw Record JSON" : "Inspect Raw BOL JSON"}</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">
              Fields: {Object.keys(doc).length} • Read-Only
            </span>
          </div>

          {showRawJson && (
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[10px] max-h-60 overflow-y-auto leading-relaxed border border-slate-800 select-all">
              {JSON.stringify(doc, null, 2)}
            </pre>
          )}
        </div>
      </td>
    </tr>
  )
}
