"use client"

import React, { useState } from "react"
import { SavedDocument } from "@/lib/reports/types"
import {
  formatDisplayDate,
  isRtlText,
  extractInvoiceNo,
  extractTruckNo,
  extractBolRoute,
} from "@/lib/reports/parsers"
import { parseSyncedCargoItems } from "@/lib/utils/cargo-grid"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import { cleanBolNumber } from "@/lib/utils/bol-filters"
import { Button } from "@/components/ui/button"
import {
  X,
  Edit,
  ExternalLink,
  FileDown,
  Truck,
  Package,
  Scale,
  DollarSign,
  MapPin,
  Boxes,
  Share2,
  Copy,
  Layers,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import { buildManagementSummary } from "@/lib/whatsapp/bulk-message"

interface BolQuickViewProps {
  doc: SavedDocument | null
  onClose: () => void
  onEditBol?: (id: string) => void
  onOpenPreview?: (id: string) => void
}

export function BolQuickView({
  doc,
  onClose,
  onEditBol,
  onOpenPreview,
}: BolQuickViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "cargo" | "parties" | "transport">("overview")

  if (!doc) return null

  const isShipperRtl = isRtlText(doc.shipper_name)
  const isConsigneeRtl = isRtlText(doc.consignee_name)
  const isNotifyRtl = isRtlText(doc.notify_party_name)

  const truckText = extractTruckNo(doc) || doc.truck_number || "—"
  const invText = extractInvoiceNo(doc) || doc.invoice_no || (doc as any).invoice_number || "—"
  const routeInfo = extractBolRoute(doc)
  const syncedCargo = parseSyncedCargoItems(doc as unknown as Partial<BillOfLadingFormData>)

  const handleCopyWhatsApp = async () => {
    try {
      const normalized = normalizeToWhatsAppShipment(doc)
      const summary = buildManagementSummary([normalized])
      await navigator.clipboard.writeText(summary)
      toast.success("WhatsApp summary copied to clipboard!")
    } catch {
      toast.error("Failed to copy WhatsApp summary")
    }
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(doc, null, 2))
      toast.success("Full BOL JSON copied to clipboard!")
    } catch {
      toast.error("Failed to copy JSON")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                BOL Quick Dossier
              </span>
              {doc.pdf_url ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  PDF Ready
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  No PDF
                </span>
              )}
              {routeInfo.hasReefer && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  ❄️ Reefer
                </span>
              )}
            </div>
            <h2 className="text-xl font-black font-mono tracking-tight text-white mt-1 truncate">
              {cleanBolNumber(doc.bol_number) || "Draft BOL Record"}
            </h2>
            <p className="text-xs text-slate-400">
              Issued: {formatDisplayDate(doc.issue_date || doc.created_at)} • Invoice: <span className="font-mono text-emerald-300">{invText}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {onEditBol && (
              <Button
                size="sm"
                onClick={() => onEditBol(doc.id)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs cursor-pointer shadow-xs"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit BOL
              </Button>
            )}

            {onOpenPreview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenPreview(doc.id)}
                className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold h-8 text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                A4 Preview
              </Button>
            )}

            {doc.pdf_url && (
              <a
                href={doc.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 h-8 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </a>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyWhatsApp}
              className="h-8 px-2.5 rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
              title="Copy WhatsApp Summary"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyJson}
              className="h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              title="Copy JSON Payload"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              JSON
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-4 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-850"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cargo")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1 ${
              activeTab === "cargo"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-850"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Cargo ({syncedCargo.items.length || 1})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("parties")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1 ${
              activeTab === "parties"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-850"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Parties</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("transport")}
            className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center gap-1 ${
              activeTab === "transport"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-850"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Transport & Route</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-800 dark:text-slate-200 text-xs">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Metrics Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-black uppercase">Packages</span>
                  </div>
                  <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {doc.number_of_packages || "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-black uppercase">Net Wt</span>
                  </div>
                  <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {doc.net_weight || "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Scale className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-black uppercase">Gross Wt</span>
                  </div>
                  <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {doc.gross_weight || "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase">Goods Value</span>
                  </div>
                  <p className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 truncate" title={doc.goods_value}>
                    {doc.goods_value || "—"}
                  </p>
                </div>
              </div>

              {/* Truck & Driver Summary Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Truck & Driver Particulars
                  </span>
                  {(doc.driver_rent || (doc as any).driverFreight) && (
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-2 py-0.5 rounded-lg" dir="ltr">
                      Rent: {doc.driver_rent || (doc as any).driverFreight}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Truck License Plate</span>
                    <p className="font-black font-mono text-slate-900 dark:text-white text-xs mt-0.5" dir="ltr">
                      {truckText}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Driver Name</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                      {doc.driver_name || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Driver Phone</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 text-xs mt-0.5" dir="ltr">
                      {doc.driver_contact || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parties Quick Summary */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shipper / فرستنده</span>
                  <p className={`font-bold text-slate-900 dark:text-white text-sm mt-0.5 ${isShipperRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isShipperRtl ? "rtl" : "ltr"}>
                    {doc.shipper_name || <span className="text-red-500 italic">Missing Shipper</span>}
                  </p>
                  {doc.shipper_address && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">
                      {doc.shipper_address}
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Consignee / گیرنده</span>
                  <p className={`font-bold text-slate-900 dark:text-white text-sm mt-0.5 ${isConsigneeRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isConsigneeRtl ? "rtl" : "ltr"}>
                    {doc.consignee_name || <span className="text-red-500 italic">Missing Consignee</span>}
                  </p>
                  {doc.consignee_address && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">
                      {doc.consignee_address}
                    </p>
                  )}
                </div>
              </div>

              {/* Route Summary */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold mb-1">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] uppercase tracking-wider">Multi-Modal Routing</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Port of Loading</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{doc.port_of_loading || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Port of Discharge</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{doc.port_of_discharge || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Final Destination</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{doc.place_of_delivery || doc.destination_country || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Container / Equipment</span>
                    <p className="font-bold font-mono text-slate-900 dark:text-white mt-0.5">{doc.container_numbers || "None declared"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CARGO SUB-TABLE */}
          {activeTab === "cargo" && (
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-slate-200">
                    <tr className="border-b border-slate-700">
                      <th className="py-2 px-2.5 font-extrabold text-[10px] uppercase">#</th>
                      <th className="py-2 px-2.5 font-extrabold text-[10px] uppercase">Packages</th>
                      <th className="py-2 px-2 font-extrabold text-[10px] text-right uppercase">Net / Ctn</th>
                      <th className="py-2 px-2 font-extrabold text-[10px] text-right uppercase">Gross / Ctn</th>
                      <th className="py-2 px-2 font-extrabold text-[10px] text-right uppercase">Net Wt</th>
                      <th className="py-2 px-2 font-extrabold text-[10px] text-right uppercase">Gross Wt</th>
                      <th className="py-2 px-2 font-extrabold text-[10px] text-right uppercase">Rate</th>
                      <th className="py-2 px-2.5 font-extrabold text-[10px] text-right uppercase">Goods Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {syncedCargo.items.length > 0 ? (
                      syncedCargo.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="py-2 px-2.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-800 dark:text-slate-200">{item.packageText || "—"}</td>
                          <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{item.netPerCarton || "—"}</td>
                          <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{item.grossPerCarton || "—"}</td>
                          <td className="py-2 px-2 text-right font-bold text-amber-600 dark:text-amber-400">{item.netWeight || "—"}</td>
                          <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{item.grossWeight || "—"}</td>
                          <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{item.rate || "—"}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.goodsValue || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-2.5 font-bold text-slate-400">1</td>
                        <td className="py-2 px-2.5 font-bold text-slate-800 dark:text-slate-200">{doc.number_of_packages || "—"}</td>
                        <td className="py-2 px-2 text-right text-slate-400">—</td>
                        <td className="py-2 px-2 text-right text-slate-400">—</td>
                        <td className="py-2 px-2 text-right font-bold text-amber-600 dark:text-amber-400">{doc.net_weight || "—"}</td>
                        <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">{doc.gross_weight || "—"}</td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{doc.rate_per_kg || (doc as any).rate || "—"}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{doc.goods_value || "—"}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-blue-500">
                    <tr>
                      <td colSpan={2} className="py-2 px-2.5 text-[10px] uppercase font-black text-slate-300">
                        Totals ({syncedCargo.items.length || 1} Items):
                      </td>
                      <td colSpan={2}></td>
                      <td className="py-2 px-2 text-right text-amber-300">
                        {syncedCargo.totals.totalNetWeight ? `${syncedCargo.totals.totalNetWeight.toLocaleString()} KG` : doc.net_weight || "—"}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-200">
                        {syncedCargo.totals.totalGrossWeight ? `${syncedCargo.totals.totalGrossWeight.toLocaleString()} KG` : doc.gross_weight || "—"}
                      </td>
                      <td></td>
                      <td className="py-2 px-2.5 text-right text-emerald-400 font-black">
                        {doc.goods_value || (syncedCargo.totals.totalGoodsValue ? `$${syncedCargo.totals.totalGoodsValue.toLocaleString()}` : "—")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Commodity Description */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description of Goods / Commodity</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1.5 whitespace-pre-wrap leading-relaxed text-xs">
                  {doc.cargo_description || doc.goods_description || doc.description_of_goods || doc.commodity || "No commodity declared"}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PARTIES */}
          {activeTab === "parties" && (
            <div className="space-y-4">
              {/* Shipper */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Shipper / فرستنده</span>
                  <span className="text-[10px] text-slate-400 font-mono">Role: Consignor</span>
                </div>
                <p className={`font-black text-slate-900 dark:text-white text-sm ${isShipperRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isShipperRtl ? "rtl" : "ltr"}>
                  {doc.shipper_name || "—"}
                </p>
                {doc.shipper_address && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {doc.shipper_address}
                  </p>
                )}
                {(doc.shipper_phone || (doc as any).shipper_email) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    {doc.shipper_phone && <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3" /> {doc.shipper_phone}</span>}
                    {(doc as any).shipper_email && <span className="flex items-center gap-1 font-mono"><Mail className="w-3 h-3" /> {(doc as any).shipper_email}</span>}
                  </div>
                )}
              </div>

              {/* Consignee */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Consignee / گیرنده</span>
                  <span className="text-[10px] text-slate-400 font-mono">Role: Recipient</span>
                </div>
                <p className={`font-black text-slate-900 dark:text-white text-sm ${isConsigneeRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isConsigneeRtl ? "rtl" : "ltr"}>
                  {doc.consignee_name || "—"}
                </p>
                {doc.consignee_address && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {doc.consignee_address}
                  </p>
                )}
                {(doc.consignee_phone || (doc as any).consignee_email) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    {doc.consignee_phone && <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3" /> {doc.consignee_phone}</span>}
                    {(doc as any).consignee_email && <span className="flex items-center gap-1 font-mono"><Mail className="w-3 h-3" /> {(doc as any).consignee_email}</span>}
                  </div>
                )}
              </div>

              {/* Notify Party */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Notify Party</span>
                  <span className="text-[10px] text-slate-400 font-mono">Role: Notice</span>
                </div>
                <p className={`font-bold text-slate-900 dark:text-white text-sm ${isNotifyRtl ? "text-right font-[vazirmatn]" : ""}`} dir={isNotifyRtl ? "rtl" : "ltr"}>
                  {doc.notify_party_name || "SAME AS CONSIGNEE"}
                </p>
                {doc.notify_party_address && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {doc.notify_party_address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TRANSPORT & ROUTE */}
          {activeTab === "transport" && (
            <div className="space-y-4">
              {/* Containers & Seals */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                  <Boxes className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-wider">Container & Seal Declarations</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Container Numbers</span>
                    <p className="font-black font-mono text-slate-900 dark:text-white mt-1">
                      {doc.container_numbers || (doc as any).container_number || "None declared"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Seal Numbers</span>
                    <p className="font-black font-mono text-slate-900 dark:text-white mt-1">
                      {doc.seal_numbers || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vessel & Ocean Leg */}
              {(doc.ocean_vessel || doc.voyage_no) && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Maritime Vessel & Voyage</span>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold">Vessel Name</span>
                      <p className="font-bold text-slate-900 dark:text-white">{doc.ocean_vessel || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold">Voyage No.</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">{doc.voyage_no || "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Waypoints */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Transit Stations & Ports</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">1. Place of Receipt / Loading:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{doc.place_of_receipt || doc.port_of_loading || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">2. Port of Discharge:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{doc.port_of_discharge || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">3. Final Delivery:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{doc.place_of_delivery || doc.destination_country || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono text-[11px]">ID: {doc.id}</span>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl font-bold cursor-pointer">
            Close Dossier
          </Button>
        </div>
      </div>
    </div>
  )
}
