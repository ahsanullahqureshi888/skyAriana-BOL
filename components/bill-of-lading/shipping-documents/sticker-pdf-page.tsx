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
  companySubtitle?: string
  commodityIndex?: number
  commodityItem?: CommodityItem
  cartonNumber?: number
  totalCartons?: number
}

/**
 * StickerPdfPage - Official International Export Cargo Sticker.
 * Fully compliant with global customs and food packaging requirements:
 * - High-definition 142mm × 142mm centered A4 card with corner crop marks
 * - Prominent "PRODUCE OF AFGHANISTAN" header with Company Logo and Carton Numbering badge
 * - Cross-referenced B/L, Invoice, Destination, and Container/Truck vehicle tracking bar
 * - Exporter Title & Bold Navy Blue Company Name (#1e40af) with Licence & Contact
 * - Importer Title & Bold Navy Blue Company Name (#1e40af) with GST, FSSAI, Phone, Email, PAN
 * - Commodity Name, 4-box Physical Specs (Net Wt, Gross Wt, Date of Packing, Date of Expiry)
 * - Lot No in bold deep green (#007a3d)
 * - Official Customs Inspection & Verification Bar with FSSAI/Veg & Afghanistan Export Badges
 * - Authentic Brand Purple (#583184) "EXPORT STANDARD PACKAGING • OFFICIAL CUSTOMS COMPLIANT" Footer Strip
 */
export function StickerPdfPage({
  data,
  logoUrl,
  companyName,
  companySubtitle,
  commodityIndex,
  commodityItem,
  cartonNumber = 1,
  totalCartons,
}: StickerPdfPageProps) {
  const displayCompany = companyName || data.companyName || "SKY ARIANA LIMITED"
  const displaySubtitle = companySubtitle || data.companySubtitle || "INTERNATIONAL TRANSPORTATION • FREIGHT FORWARDING"
  const displayShipper = data.shipper || "NASIB OBID AKBARI LTD"

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

  // Intelligent vehicle identification: fallback to Truck Number if Container Number is absent
  const hasContainer = Boolean(data.containerNumber && data.containerNumber !== "—" && data.containerNumber !== "N/M")
  const vehicleLabel = hasContainer ? "Container / Seal" : (data.truckNumber ? "Truck / موتر" : "Vehicle / Cntr")
  const vehicleValue = hasContainer
    ? [data.containerNumber, data.sealNumber].filter(Boolean).join(" / ")
    : (data.truckNumber || "—")

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
          className="relative w-[142mm] h-[142mm] bg-white border-2 border-slate-950 p-3.5 text-slate-950 box-border shadow-xs flex flex-col justify-between overflow-hidden"
          style={{ width: "142mm", height: "142mm" }}
        >
          {/* Top Authentic Export Header Bar */}
          <header className="border-b-2 border-slate-950 pb-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="h-10 w-10 object-contain shrink-0 rounded-full border border-slate-200 bg-white p-0.5 shadow-2xs"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-[12px] font-black tracking-tight text-slate-950 uppercase leading-none">
                    PRODUCE OF AFGHANISTAN
                  </h2>
                  <span className="text-[10px] font-bold text-slate-600 font-[vazirmatn] leading-none" dir="rtl">
                    د افغانستان صادراتي محصولات
                  </span>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-wider text-slate-600 truncate mt-0.5 leading-tight">
                  {displayCompany} • {displaySubtitle}
                </p>
                <p className="text-[6.5px] font-black uppercase tracking-widest text-[#583184] leading-tight">
                  OFFICIAL EXPORT CARGO IDENTIFICATION STICKER
                </p>
              </div>
            </div>

            {/* Carton Counter Badge */}
            <div className="rounded-lg border-2 border-slate-950 bg-slate-100 px-2.5 py-1 text-center shrink-0 shadow-2xs">
              <span className="block text-[6px] font-black uppercase tracking-wider text-slate-600 leading-none">
                Carton No
              </span>
              <span className="font-mono font-black text-[12px] text-slate-950 leading-tight">
                {cartonNumber} <span className="text-[8.5px] font-bold text-slate-500">OF</span> {displayTotalCartons}
              </span>
            </div>
          </header>

          {/* Logistics Cross-Reference Bar (4 Structured Cells) */}
          <div className="grid grid-cols-4 divide-x divide-slate-300 rounded border border-slate-300 bg-slate-50/90 text-[7px] font-medium text-slate-800 shrink-0">
            <div className="p-1 min-w-0">
              <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">B/L Number</span>
              <span className="font-mono font-black text-slate-950 truncate block leading-tight">{data.bolNumber || "—"}</span>
            </div>
            <div className="p-1 min-w-0">
              <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">Invoice No</span>
              <span className="font-mono font-black text-slate-950 truncate block leading-tight">{data.invoiceNumber || "—"}</span>
            </div>
            <div className="p-1 min-w-0">
              <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">Destination</span>
              <span className="font-bold text-slate-950 truncate block leading-tight">{data.finalDestination || data.portOfDischarge || "—"}</span>
            </div>
            <div className="p-1 min-w-0">
              <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">{vehicleLabel}</span>
              <span className={`font-bold text-slate-950 truncate block leading-tight ${isPashtoOrArabic(vehicleValue) ? "font-[vazirmatn]" : "font-mono"}`}>
                {vehicleValue}
              </span>
            </div>
          </div>

          {/* EXPORTER SECTION */}
          <div className="space-y-0.5 border-b border-slate-200 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 text-[6.5px] font-black text-[#1e40af] uppercase tracking-wide">
                <span>EXPORTER</span>
                <span>/</span>
                <span className="font-[vazirmatn]" dir="rtl">صادرکننده</span>
              </span>
              <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-tight">Name & Complete Address</span>
            </div>
            <p className={`text-[12px] font-black text-[#1e40af] tracking-tight leading-tight truncate ${isPashtoOrArabic(displayShipper) ? "font-[vazirmatn]" : ""}`}>
              {displayShipper}
            </p>
            {data.shipperAddress && (
              <p className={`text-[8px] text-slate-800 font-normal leading-tight line-clamp-2 max-w-[108mm] ${isPashtoOrArabic(data.shipperAddress) ? "font-[vazirmatn]" : ""}`}>
                {data.shipperAddress}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 text-[7.5px] text-slate-900 pt-0.5">
              {data.shipperLicence && (
                <p>
                  <span className="font-bold text-slate-600">Licence: </span>
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
          <div className="space-y-0.5 border-b border-slate-200 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 text-[6.5px] font-black text-[#1e40af] uppercase tracking-wide">
                <span>IMPORTER</span>
                <span>/</span>
                <span className="font-[vazirmatn]" dir="rtl">واردکننده</span>
              </span>
              <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-tight">Consignee Information</span>
            </div>
            <p className={`text-[12px] font-black text-[#1e40af] tracking-tight leading-tight truncate ${isPashtoOrArabic(data.consignee) ? "font-[vazirmatn]" : ""}`}>
              {data.consignee || "JDM ENTERPRISES"}
            </p>
            {data.consigneeAddress && (
              <p className={`text-[8px] text-slate-800 font-normal leading-tight line-clamp-2 max-w-[108mm] ${isPashtoOrArabic(data.consigneeAddress) ? "font-[vazirmatn]" : ""}`}>
                {data.consigneeAddress}
              </p>
            )}

            {/* Identification Codes Grid */}
            <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 pt-0.5 text-[7px] text-slate-900">
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
          <div className="space-y-1 shrink-0">
            <div className="flex items-center justify-between rounded bg-slate-50 border border-slate-200 px-2 py-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[7px] font-black text-slate-500 uppercase">Commodity:</span>
                <span className={`font-black uppercase text-slate-950 text-[10.5px] truncate ${isPashtoOrArabic(activeCommodity) ? "font-[vazirmatn]" : ""}`}>
                  {activeCommodity}
                </span>
              </div>
              {lotNo && (
                <span className="rounded bg-emerald-50 border border-emerald-300 px-1.5 py-0.2 text-[8.5px] font-black text-[#007a3d] shrink-0">
                  LOT: <span className="font-mono">{lotNo}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1 text-[7.5px]">
              <div className="rounded border border-slate-200 bg-slate-50/50 p-1 text-center">
                <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">Net Weight</span>
                <span className="font-mono font-black text-[9px] text-slate-950 leading-tight">{activeNetWeight}</span>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50/50 p-1 text-center">
                <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">Gross Weight</span>
                <span className="font-mono font-black text-[9px] text-slate-950 leading-tight">{activeGrossWeight || "—"}</span>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50/50 p-1 text-center">
                <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">Packed</span>
                <span className="font-mono font-black text-[9px] text-slate-950 leading-tight">{activePackingDate}</span>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50/50 p-1 text-center">
                <span className="block text-[6px] font-black uppercase text-slate-500 leading-tight">Expiry</span>
                <span className="font-mono font-black text-[9px] text-slate-950 leading-tight">{activeExpiryDate}</span>
              </div>
            </div>
          </div>

          {/* OFFICIAL CUSTOMS VERIFICATION & BADGES ROW */}
          <div className="flex items-center justify-between pt-0.5 shrink-0">
            <div className="text-[6.5px] text-slate-500 space-y-0.5">
              <p className="font-black uppercase tracking-wide text-slate-700 leading-tight">
                CUSTOMS INSPECTED • <span className="font-[vazirmatn]" dir="rtl">ګمرکي تفتیش</span>
              </p>
              <p className="font-semibold leading-tight">AFGHANISTAN CHAMBER OF COMMERCE & INDUSTRY (ACCI)</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Veg Square + FSSAI Badge */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STICKER_FSSAI_VEG_DATA_URL}
                alt="FSSAI & Veg Logo"
                className="h-8 w-11 object-contain"
              />
              {/* Afghanistan Export Emblem */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STICKER_AFGHANISTAN_LOGO_DATA_URL}
                alt="Afghanistan Export Logo"
                className="h-8 w-8 object-contain"
              />
            </div>
          </div>

          {/* Bottom Brand Purple Compliance Strip */}
          <footer className="-mx-3.5 -mb-3.5 bg-[#583184] py-1 text-center text-white shrink-0">
            <p className="text-[6.5px] font-black uppercase tracking-widest leading-none">
              EXPORT STANDARD PACKAGING • OFFICIAL CUSTOMS COMPLIANT
            </p>
          </footer>
        </article>
      </div>
    </section>
  )
}

export default StickerPdfPage
