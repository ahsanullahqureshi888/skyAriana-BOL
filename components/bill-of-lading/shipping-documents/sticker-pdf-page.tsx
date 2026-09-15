"use client"

import type { ShippingDocumentData, CommodityItem } from "@/lib/utils/shipping-documents"
import {
  STICKER_FSSAI_VEG_DATA_URL,
  STICKER_AFGHANISTAN_LOGO_DATA_URL,
} from "@/lib/sticker-badges-data"

export interface StickerPdfPageProps {
  data: ShippingDocumentData
  logoUrl?: string
  companyName?: string
  commodityIndex?: number
  commodityItem?: CommodityItem
}

/**
 * StickerPdfPage - Authentic International Export Cargo Sticker.
 * Faithfully matches the official export sticker specification:
 * - Centered A4 single master sticker with solid black border (130mm × 120mm)
 * - Exporter Title & Bold Navy Blue Company Name (#1e40af)
 * - Importer Title & Bold Navy Blue Company Name (#1e40af)
 * - Full address lines, GST, FSSAI, Phone, Email, PAN
 * - Commodity Name, Net Wt, Date of Packing, Date of Expiry
 * - Lot No in bold deep green (#007a3d)
 * - Authentic Veg + FSSAI combo badge and Afghanistan Export Emblem in bottom-right
 */
export function StickerPdfPage({
  data,
  companyName,
  commodityIndex,
  commodityItem,
}: StickerPdfPageProps) {
  const displayShipper = data.shipper || companyName || data.companyName || "NASIB OBID AKBARI LTD"

  const activeItem =
    commodityItem ||
    (commodityIndex !== undefined && data.commodities && data.commodities[commodityIndex]
      ? data.commodities[commodityIndex]
      : data.commodities?.[0])

  const activeCommodity = activeItem?.commodity || data.commodity || "BLACK RAISINS"
  const activeNetWeight = activeItem?.netWeight || data.netWeight || "10 Kg"
  const activePackingDate = activeItem?.packingDateMonthYear || data.packingDateMonthYear || "JUL / 2026"
  const activeExpiryDate = activeItem?.expiryDateMonthYear || data.expiryDateMonthYear || "JUL / 2028"
  const lotNo = data.lotNo?.trim() || ""

  return (
    <section
      data-shipping-preview="stickers"
      className="flex h-[297mm] w-[210mm] max-h-[297mm] max-w-[210mm] flex-col items-center justify-center bg-white p-0 font-sans box-border overflow-hidden select-none"
      style={{ width: "210mm", height: "297mm", maxHeight: "297mm" }}
    >
      {/* Authentic Master Export Sticker Card */}
      <article
        className="relative w-[130mm] min-h-[118mm] bg-white border-2 border-black p-4 text-black box-border shadow-xs"
        style={{ width: "130mm", minHeight: "118mm" }}
      >
        {/* EXPORTER SECTION */}
        <div className="space-y-0.5">
          <h3 className="text-[11px] font-bold text-black uppercase tracking-tight leading-none">
            Name and Complete Address of Exporter
          </h3>
          <p className="text-[14px] font-black text-[#1e40af] tracking-tight leading-snug">
            {displayShipper}
          </p>
          {data.shipperAddress && (
            <p className="text-[9.5px] text-black font-normal leading-snug whitespace-pre-line max-w-[96mm]">
              {data.shipperAddress}
            </p>
          )}
          {data.shipperLicence && (
            <p className="text-[9.5px] text-black font-normal leading-none pt-0.5">
              <span className="font-bold">Licence No: </span>
              <span>{data.shipperLicence}</span>
            </p>
          )}
        </div>

        {/* IMPORTER SECTION */}
        <div className="mt-2.5 space-y-0.5">
          <h3 className="text-[11px] font-bold text-black uppercase tracking-tight leading-none">
            Name and Complete Address of Importer
          </h3>
          <p className="text-[13px] font-black text-[#1e40af] tracking-tight leading-snug">
            {data.consignee || "JDM ENTERPRISES"}
          </p>
          {data.consigneeAddress && (
            <p className="text-[9.5px] text-black font-normal leading-snug whitespace-pre-line max-w-[96mm]">
              {data.consigneeAddress}
            </p>
          )}

          {/* Identification Codes */}
          <div className="space-y-0.5 pt-0.5 text-[9.5px] text-black font-normal leading-tight">
            {data.consigneeGst && (
              <p>
                <span className="font-bold">GST: </span>
                <span>{data.consigneeGst}</span>
              </p>
            )}
            {data.consigneeFssai && (
              <p>
                <span className="font-bold">Fssai No: </span>
                <span>{data.consigneeFssai}</span>
              </p>
            )}
            {data.consigneePhone && (
              <p>
                <span className="font-bold">Phone No: </span>
                <span>{data.consigneePhone}</span>
              </p>
            )}
            {data.consigneeEmail && (
              <p>
                <span className="font-bold">Email id: </span>
                <span>{data.consigneeEmail}</span>
              </p>
            )}
            {data.consigneePan && (
              <p>
                <span className="font-bold">Pan No: </span>
                <span>{data.consigneePan}</span>
              </p>
            )}
          </div>
        </div>

        {/* COMMODITY & EXPORT SPECIFICATIONS */}
        <div className="mt-2.5 space-y-0.5 text-[9.5px] text-black font-normal leading-tight">
          <p>
            <span>Name of Commodity: </span>
            <span className="font-bold uppercase">{activeCommodity}</span>
          </p>
          <p>
            <span>Net Wt: </span>
            <span className="font-bold">{activeNetWeight}</span>
          </p>
          <p>
            <span>Date of Packing: </span>
            <span className="font-bold">{activePackingDate}</span>
          </p>
          <p>
            <span>Date of Expiry: </span>
            <span className="font-bold">{activeExpiryDate}</span>
          </p>
          {lotNo && (
            <p className="text-[13px] font-black text-[#007a3d] pt-1 leading-none">
              <span className="font-bold text-[#007a3d]">Lot No: </span>
              <span>{lotNo}</span>
            </p>
          )}
        </div>

        {/* BOTTOM-RIGHT AUTHENTIC BADGES (Veg+FSSAI combo & Afghanistan Logo) */}
        <div className="absolute right-3.5 bottom-3.5 flex flex-col items-center gap-1.5 pointer-events-none">
          {/* Veg Square + FSSAI Badge */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={STICKER_FSSAI_VEG_DATA_URL}
            alt="FSSAI & Veg Logo"
            className="h-9 w-11 object-contain"
          />
          {/* Afghanistan Export Emblem */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={STICKER_AFGHANISTAN_LOGO_DATA_URL}
            alt="Afghanistan Export Logo"
            className="h-9 w-9 object-contain"
          />
        </div>
      </article>
    </section>
  )
}

export default StickerPdfPage
