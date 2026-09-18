"use client"

import {
  type ShippingDocumentData,
  type CommodityItem,
  getStickerRouteBanner,
} from "@/lib/utils/shipping-documents"
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
 * StickerPdfPage - Official International Export Cargo Carton Sticker.
 * Exact 1:1 match to the authentic export cargo sticker specification:
 * - Crisp solid black border (140mm × 142mm)
 * - NAME AND COMPLETE ADDRESS OF EXPORTER header (bold black uppercase)
 * - Exporter Name in Royal Blue (#1a44a5) with Address, Phone, Licence No
 * - NAME AND COMPLETE ADDRESS OF IMPORTER header (bold black uppercase)
 * - Importer Name in Royal Blue (#1a44a5) with Address, GST, FSSAI, Phone, Email, PAN
 * - Bottom Left: Commodity, Country of Origin (AFGHANISTAN), Net Wt, Packing Date, Expiry Date, BY LAND TO INDIA (Green)
 * - Bottom Right: Vertically stacked badges (Veg Symbol + FSSAI Logo, Afghanistan Export Emblem)
 */
export function StickerPdfPage({
  data,
  commodityIndex,
  commodityItem,
}: StickerPdfPageProps) {
  const activeItem =
    commodityItem ||
    (commodityIndex !== undefined && data.commodities && data.commodities[commodityIndex]
      ? data.commodities[commodityIndex]
      : data.commodities?.[0])

  const activeCommodity = (activeItem?.commodity || data.commodity || "GREEN RAISINS").trim()
  const activeNetWeight = (activeItem?.netWeight || data.netWeight || "16 Kg").trim()
  const rawPackingDate = activeItem?.packingDateMonthYear || data.packingDateMonthYear || "SEP / 2026"
  const rawExpiryDate = activeItem?.expiryDateMonthYear || data.expiryDateMonthYear || "SEP / 2028"

  const activePackingDate = rawPackingDate.replace(/\s*\/\s*/g, " / ").toUpperCase()
  const activeExpiryDate = rawExpiryDate.replace(/\s*\/\s*/g, " / ").toUpperCase()

  // Exporter Info
  const shipperName = (data.shipper || "ABDUL QAYOOM S/O ABDULRAUF").trim()
  const shipperAddress = (data.shipperAddress || "KANDAHAR, AFGHANISTAN.").trim()
  const shipperPhone = (data.shipperPhone || "+93 701688 428").trim()
  const shipperLicence = (data.shipperLicence || "85 278").trim()

  // Importer Info
  const isDefaultNatures = !data.consignee || data.consignee.toUpperCase().includes("NATURES")
  const consigneeName = (data.consignee || "NATURES INTERNATIONAL").trim()
  const consigneeAddress = (
    data.consigneeAddress ||
    "2ND FLOOR, 266, KATRA PERAN TILAK BAZAR, KHARIBBAOLI,\nNEAR KHARI BAOLI, New Delhi, Central Delhi,Delhi, 110006"
  ).trim()

  const consigneeGst = (data.consigneeGst || (isDefaultNatures ? "07BMDPS3679B2ZW" : "")).trim()
  const consigneeFssai = (data.consigneeFssai || (isDefaultNatures ? "10019011006810" : "")).trim()
  const consigneePhone = (data.consigneePhone || (isDefaultNatures ? "+91-11-43552482, +91- 931 378 9960" : "")).trim()
  const consigneeEmail = (data.consigneeEmail || (isDefaultNatures ? "naturesinternational@aol.com" : "")).trim()
  const consigneePan = (data.consigneePan || (isDefaultNatures ? "BMDPS3679B" : "")).trim()

  // Route banner (defaults to BY LAND TO INDIA or dynamic destination)
  const routeBanner = getStickerRouteBanner(data)

  return (
    <section
      data-shipping-preview="stickers"
      className="flex h-[297mm] w-[210mm] max-h-[297mm] max-w-[210mm] flex-col items-center justify-center bg-slate-100/40 print:bg-white p-0 font-sans box-border overflow-hidden select-none"
      style={{ width: "210mm", height: "297mm", maxHeight: "297mm" }}
    >
      <article
        className="relative w-[140mm] h-[142mm] bg-white border-[1.5px] border-black p-5 text-black box-border shadow-md print:shadow-none flex flex-col justify-between overflow-hidden"
        style={{ width: "140mm", height: "142mm" }}
      >
        {/* TOP & MIDDLE: EXPORTER & IMPORTER */}
        <div className="space-y-3.5">
          {/* 1. EXPORTER SECTION */}
          <div className="space-y-1">
            <h2 className="text-[12.5px] font-black uppercase tracking-normal text-black leading-tight">
              NAME AND COMPLETE ADDRESS OF EXPORTER
            </h2>
            <p
              className={`text-[18.5px] font-black uppercase tracking-normal text-[#1a44a5] leading-tight ${
                isPashtoOrArabic(shipperName) ? "font-[vazirmatn]" : ""
              }`}
              dir={isPashtoOrArabic(shipperName) ? "rtl" : "ltr"}
            >
              {shipperName}
            </p>
            {shipperAddress && (
              <p
                className={`text-[12px] font-bold uppercase text-black leading-snug ${
                  isPashtoOrArabic(shipperAddress) ? "font-[vazirmatn]" : ""
                }`}
                dir={isPashtoOrArabic(shipperAddress) ? "rtl" : "ltr"}
              >
                {shipperAddress}
              </p>
            )}
            <div className="flex flex-col text-[11.5px] text-black leading-snug pt-0.5">
              {shipperPhone && (
                <p>
                  <span className="font-medium">Phone: </span>
                  <span className="font-bold">{shipperPhone}</span>
                </p>
              )}
              {shipperLicence && (
                <p>
                  <span className="font-medium">Licence No: </span>
                  <span className="font-bold">{shipperLicence}</span>
                </p>
              )}
            </div>
          </div>

          {/* 2. IMPORTER SECTION */}
          <div className="space-y-1">
            <h2 className="text-[12.5px] font-black uppercase tracking-normal text-black leading-tight">
              NAME AND COMPLETE ADDRESS OF IMPORTER
            </h2>
            <p
              className={`text-[18.5px] font-black uppercase tracking-normal text-[#1a44a5] leading-tight ${
                isPashtoOrArabic(consigneeName) ? "font-[vazirmatn]" : ""
              }`}
              dir={isPashtoOrArabic(consigneeName) ? "rtl" : "ltr"}
            >
              {consigneeName}
            </p>
            {consigneeAddress && (
              <p
                className={`text-[11px] font-normal text-black leading-snug whitespace-pre-line max-w-[132mm] ${
                  isPashtoOrArabic(consigneeAddress) ? "font-[vazirmatn]" : ""
                }`}
                dir={isPashtoOrArabic(consigneeAddress) ? "rtl" : "ltr"}
              >
                {consigneeAddress}
              </p>
            )}
            <div className="space-y-0.5 text-[11px] text-black leading-snug pt-0.5">
              {consigneeGst && (
                <p>
                  <span className="font-medium">GST: </span>
                  <span className="font-bold">{consigneeGst}</span>
                </p>
              )}
              {consigneeFssai && (
                <p>
                  <span className="font-medium">Fssai No: </span>
                  <span className="font-bold">{consigneeFssai}</span>
                </p>
              )}
              {consigneePhone && (
                <p>
                  <span className="font-medium">Phone No: </span>
                  <span className="font-bold">{consigneePhone}</span>
                </p>
              )}
              {consigneeEmail && (
                <p>
                  <span className="font-medium">Email id: </span>
                  <span className="font-semibold">{consigneeEmail}</span>
                </p>
              )}
              {consigneePan && (
                <p>
                  <span className="font-medium">Pan No: </span>
                  <span className="font-bold">{consigneePan}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. BOTTOM SECTION: COMMODITY & ROUTE (LEFT) + BADGES STACK (RIGHT) */}
        <div className="flex items-end justify-between gap-2 pt-1">
          {/* Left Column: Commodity Details & Green Route Banner */}
          <div className="space-y-1 text-[11.5px] text-black leading-normal flex-1">
            <p>
              <span className="font-medium">Name of Commodity: </span>
              <span className="font-black uppercase text-[12.5px]">{activeCommodity}</span>
            </p>
            <p>
              <span className="font-medium">Country of Origin: </span>
              <span className="font-black uppercase text-[12px]">AFGHANISTAN</span>
            </p>
            <p>
              <span className="font-medium">Net Wt: </span>
              <span className="font-bold text-[12px]">{activeNetWeight}</span>
            </p>
            <p>
              <span className="font-medium">Date of Packing: </span>
              <span className="font-bold uppercase">{activePackingDate}</span>
            </p>
            <p>
              <span className="font-medium">Date of Expiry: </span>
              <span className="font-bold uppercase">{activeExpiryDate}</span>
            </p>
            <p className="text-[16.5px] font-black uppercase text-[#237728] tracking-wider pt-2 leading-none">
              {routeBanner}
            </p>
          </div>

          {/* Right Column: Vertically Stacked Badges */}
          <div className="flex flex-col items-center justify-end shrink-0 w-[36mm] space-y-1.5 pb-0.5">
            {/* 1. Vegetarian Symbol + FSSAI Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STICKER_FSSAI_VEG_DATA_URL}
              alt="Veg and FSSAI Logo"
              className="h-[27mm] w-auto max-w-[34mm] object-contain"
            />
            {/* 2. Afghanistan Emblem Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STICKER_AFGHANISTAN_LOGO_DATA_URL}
              alt="Afghanistan Emblem"
              className="h-[20mm] w-auto max-w-[30mm] object-contain"
            />
          </div>
        </div>
      </article>
    </section>
  )
}

export default StickerPdfPage
