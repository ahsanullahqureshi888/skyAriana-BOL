"use client"

import type { ShippingDocumentData, CommodityItem } from "@/lib/utils/shipping-documents"
import {
  STICKER_FSSAI_VEG_DATA_URL,
  STICKER_AFGHANISTAN_LOGO_DATA_URL,
} from "@/lib/sticker-badges-data"
import { isPashtoOrArabic } from "@/lib/utils/pashto-bidi"

export interface StickerPdfPageProps {
  data: ShippingDocumentData
  logoUrl?: string
  companyName?: string
  commodityIndex?: number
  commodityItem?: CommodityItem
  cartonNumber?: number
  totalCartons?: number
}

/**
 * StickerPdfPage - Official International Export Cargo Sticker.
 * Fully compliant with global customs and food packaging requirements:
 * - High-definition 140mm × 130mm centered A4 card with corner crop marks
 * - Prominent "PRODUCE OF AFGHANISTAN" header with Carton Numbering badge
 * - Cross-referenced B/L, Invoice, Container, and Destination tracking bar
 * - Exporter Title & Bold Navy Blue Company Name (#1e40af)
 * - Importer Title & Bold Navy Blue Company Name (#1e40af)
 * - Full address lines, GST, FSSAI, Phone, Email, PAN
 * - Commodity Name, Gross Wt, Net Wt, Date of Packing, Date of Expiry
 * - Lot No in bold deep green (#007a3d)
 * - Authentic Veg + FSSAI combo badge and Afghanistan Export Emblem
 */
export function StickerPdfPage({
  data,
  companyName,
  commodityIndex,
  commodityItem,
  cartonNumber = 1,
  totalCartons,
}: StickerPdfPageProps) {
  const displayShipper = data.shipper || companyName || data.companyName || "NASIB OBID AKBARI LTD"

  const activeItem =
    commodityItem ||
    (commodityIndex !== undefined && data.commodities && data.commodities[commodityIndex]
      ? data.commodities[commodityIndex]
      : data.commodities?.[0])

  const activeCommodity = activeItem?.commodity || data.commodity || "BLACK RAISINS"
  const activeNetWeight = activeItem?.netWeight || data.netWeight || "10 Kg"
  const activeGrossWeight = activeItem?.grossWeight || data.grossWeight || ""
  const activePackingDate = activeItem?.packingDateMonthYear || data.packingDateMonthYear || "JUL / 2026"
  const activeExpiryDate = activeItem?.expiryDateMonthYear || data.expiryDateMonthYear || "JUL / 2028"
  const lotNo = data.lotNo?.trim() || ""
  const displayTotalCartons = totalCartons || data.packageCount || 1

  return (
    <section
      data-shipping-preview="stickers"
      className="flex h-[297mm] w-[210mm] max-h-[297mm] max-w-[210mm] flex-col items-center justify-center bg-white p-0 font-sans box-border overflow-hidden select-none"
      style={{ width: "210mm", height: "297mm", maxHeight: "297mm" }}
    >
      {/* Authentic Master Export Sticker Card with Crop Guides */}
      <div className="relative p-3">
        {/* Corner Crop Guides for Precision Warehouse Cutting */}
        <span className="absolute top-0 left-0 text-slate-400 font-mono text-[10px] leading-none select-none">┌</span>
        <span className="absolute top-0 right-0 text-slate-400 font-mono text-[10px] leading-none select-none">┐</span>
        <span className="absolute bottom-0 left-0 text-slate-400 font-mono text-[10px] leading-none select-none">└</span>
        <span className="absolute bottom-0 right-0 text-slate-400 font-mono text-[10px] leading-none select-none">┘</span>

        <article
          className="relative w-[140mm] min-h-[132mm] bg-white border-2 border-slate-950 p-4 text-slate-950 box-border shadow-xs flex flex-col justify-between"
          style={{ width: "140mm", minHeight: "132mm" }}
        >
          {/* Top Authentic Export Header Bar */}
          <header className="border-b-2 border-slate-950 pb-2 mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[12.5px] font-black tracking-tight text-slate-950 uppercase leading-none">
                  PRODUCE OF AFGHANISTAN
                </h2>
                <span className="text-[10px] font-bold text-slate-600 font-[vazirmatn] leading-none" dir="rtl">
                  د افغانستان صادراتي محصولات
                </span>
              </div>
              <p className="text-[7.5px] font-extrabold uppercase tracking-widest text-[#583184] mt-1">
                Official Export Cargo Identification Sticker
              </p>
            </div>

            {/* Carton Counter Badge */}
            <div className="rounded-lg border border-slate-950 bg-slate-100 px-2 py-1 text-right shrink-0">
              <span className="block text-[6.5px] font-black uppercase tracking-wider text-slate-600 leading-none">
                Carton No
              </span>
              <span className="font-mono font-black text-[12px] text-slate-950 leading-tight">
                {cartonNumber} <span className="text-[9px] font-bold text-slate-500">OF</span> {displayTotalCartons}
              </span>
            </div>
          </header>

          {/* Logistics Cross-Reference Bar */}
          <div className="mb-2.5 grid grid-cols-4 gap-1.5 rounded-md border border-slate-300 bg-slate-50/80 p-1.5 text-[7.5px] font-medium text-slate-800">
            <div>
              <span className="block text-[6.5px] font-black uppercase text-slate-500">B/L Number</span>
              <span className="font-mono font-black text-slate-950 truncate block">{data.bolNumber || "—"}</span>
            </div>
            <div>
              <span className="block text-[6.5px] font-black uppercase text-slate-500">Invoice No</span>
              <span className="font-mono font-black text-slate-950 truncate block">{data.invoiceNumber || "—"}</span>
            </div>
            <div>
              <span className="block text-[6.5px] font-black uppercase text-slate-500">Destination</span>
              <span className="font-bold text-slate-950 truncate block">{data.finalDestination || data.portOfDischarge || "—"}</span>
            </div>
            <div>
              <span className="block text-[6.5px] font-black uppercase text-slate-500">Container / Seal</span>
              <span className="font-mono font-bold text-slate-950 truncate block">
                {[data.containerNumber, data.sealNumber].filter(Boolean).join(" / ") || "N/M"}
              </span>
            </div>
          </div>

          {/* EXPORTER SECTION */}
          <div className="space-y-0.5 border-b border-slate-200 pb-2 mb-2">
            <h3 className="text-[8.5px] font-black uppercase tracking-tight text-slate-600 leading-none">
              Name and Complete Address of Exporter
            </h3>
            <p className={`text-[13px] font-black text-[#1e40af] tracking-tight leading-snug ${isPashtoOrArabic(displayShipper) ? "font-[vazirmatn]" : ""}`}>
              {displayShipper}
            </p>
            {data.shipperAddress && (
              <p className={`text-[9px] text-slate-800 font-normal leading-snug whitespace-pre-line max-w-[102mm] ${isPashtoOrArabic(data.shipperAddress) ? "font-[vazirmatn]" : ""}`}>
                {data.shipperAddress}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 text-[8.5px] text-slate-900 pt-0.5">
              {data.shipperLicence && (
                <p>
                  <span className="font-bold text-slate-600">Licence No: </span>
                  <span className="font-mono font-bold">{data.shipperLicence}</span>
                </p>
              )}
              {data.shipperPhone && (
                <p>
                  <span className="font-bold text-slate-600">Tel: </span>
                  <span className="font-mono font-bold">{data.shipperPhone}</span>
                </p>
              )}
            </div>
          </div>

          {/* IMPORTER SECTION */}
          <div className="space-y-0.5 border-b border-slate-200 pb-2 mb-2">
            <h3 className="text-[8.5px] font-black uppercase tracking-tight text-slate-600 leading-none">
              Name and Complete Address of Importer
            </h3>
            <p className={`text-[12.5px] font-black text-[#1e40af] tracking-tight leading-snug ${isPashtoOrArabic(data.consignee) ? "font-[vazirmatn]" : ""}`}>
              {data.consignee || "JDM ENTERPRISES"}
            </p>
            {data.consigneeAddress && (
              <p className={`text-[9px] text-slate-800 font-normal leading-snug whitespace-pre-line max-w-[102mm] ${isPashtoOrArabic(data.consigneeAddress) ? "font-[vazirmatn]" : ""}`}>
                {data.consigneeAddress}
              </p>
            )}

            {/* Identification Codes Grid */}
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 pt-1 text-[8px] text-slate-900">
              {data.consigneeGst && (
                <p className="truncate">
                  <span className="font-bold text-slate-600">GST: </span>
                  <span className="font-mono font-bold">{data.consigneeGst}</span>
                </p>
              )}
              {data.consigneeFssai && (
                <p className="truncate">
                  <span className="font-bold text-slate-600">FSSAI: </span>
                  <span className="font-mono font-bold">{data.consigneeFssai}</span>
                </p>
              )}
              {data.consigneePan && (
                <p className="truncate">
                  <span className="font-bold text-slate-600">PAN: </span>
                  <span className="font-mono font-bold">{data.consigneePan}</span>
                </p>
              )}
              {data.consigneePhone && (
                <p className="truncate">
                  <span className="font-bold text-slate-600">Phone: </span>
                  <span className="font-mono font-bold">{data.consigneePhone}</span>
                </p>
              )}
              {data.consigneeEmail && (
                <p className="col-span-2 truncate">
                  <span className="font-bold text-slate-600">Email: </span>
                  <span className="font-mono font-bold">{data.consigneeEmail}</span>
                </p>
              )}
            </div>
          </div>

          {/* COMMODITY & EXPORT SPECIFICATIONS */}
          <div className="space-y-1 text-[9px] text-slate-900 leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Name of Commodity:</span>
              <span className={`font-black uppercase text-slate-950 text-[10.5px] ${isPashtoOrArabic(activeCommodity) ? "font-[vazirmatn]" : ""}`}>
                {activeCommodity}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[8.5px]">
              <div>
                <span className="font-bold text-slate-600">Net Wt: </span>
                <span className="font-mono font-black text-slate-950">{activeNetWeight}</span>
              </div>
              {activeGrossWeight && (
                <div>
                  <span className="font-bold text-slate-600">Gross Wt: </span>
                  <span className="font-mono font-black text-slate-950">{activeGrossWeight}</span>
                </div>
              )}
              <div>
                <span className="font-bold text-slate-600">Date of Packing: </span>
                <span className="font-mono font-black text-slate-950">{activePackingDate}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">Date of Expiry: </span>
                <span className="font-mono font-black text-slate-950">{activeExpiryDate}</span>
              </div>
            </div>

            {lotNo && (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 border border-emerald-300 text-[11px] font-black text-[#007a3d]">
                  <span>Lot No:</span>
                  <span className="font-mono">{lotNo}</span>
                </span>
              </div>
            )}
          </div>

          {/* BOTTOM-RIGHT AUTHENTIC BADGES (Veg+FSSAI combo & Afghanistan Logo) */}
          <div className="absolute right-3.5 bottom-3.5 flex flex-col items-center gap-1.5 pointer-events-none">
            {/* Veg Square + FSSAI Badge */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STICKER_FSSAI_VEG_DATA_URL}
              alt="FSSAI & Veg Logo"
              className="h-10 w-12 object-contain"
            />
            {/* Afghanistan Export Emblem */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STICKER_AFGHANISTAN_LOGO_DATA_URL}
              alt="Afghanistan Export Logo"
              className="h-10 w-10 object-contain"
            />
          </div>
        </article>
      </div>
    </section>
  )
}

export default StickerPdfPage
