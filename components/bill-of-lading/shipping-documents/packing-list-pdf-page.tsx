"use client"

import type { ShippingDocumentData } from "@/lib/utils/shipping-documents"
import { Truck, ShieldCheck } from "lucide-react"
import { isPashtoOrArabic } from "@/lib/utils/pashto-bidi"

export interface PackingListPdfPageProps {
  data: ShippingDocumentData
  logoUrl?: string
  companyName?: string
  companySubtitle?: string
}

/**
 * PackingListPdfPage - Professional A4 Shipping Document Packing List.
 * Fully automated from BOL master record with dedicated Driver & Transport information.
 * Features enlarged readable typography, modern executive logistics UI styling,
 * high-contrast fields, multi-commodity support, and strict 1-page A4 balance.
 */
export function PackingListPdfPage({
  data,
  logoUrl,
  companyName,
  companySubtitle,
}: PackingListPdfPageProps) {
  const displayCompanyName = companyName || data.companyName || "SKY ARIANA LIMITED"
  const displaySubtitle = companySubtitle || data.companySubtitle || "Import & Export - International Transportation"

  const detailRows = [
    ["B/L Number", data.bolNumber, "Booking Number", data.bookingNumber],
    ["Invoice Number", data.invoiceNumber, "Invoice Date", data.invoiceDate || data.date],
    ["Container Number", data.containerNumber, "Seal Number", data.sealNumber],
    ["Container Type", data.containerType, "Vessel / Voyage", [data.vesselName, data.voyageNumber].filter(Boolean).join(" / ")],
    ["Port of Loading", data.portOfLoading, "Port of Discharge", data.portOfDischarge],
    ["Final Destination", data.finalDestination, "Packing Date", data.packingDateMonthYear || data.date],
  ]

  // Container or vehicle line for cargo table
  const cntrSealLines = data.containers && data.containers.length > 0
    ? data.containers.map((c) => `${c.containerNumber}${c.sealNumber ? ` / ${c.sealNumber}` : ""}`).join(", ")
    : [data.containerNumber, data.sealNumber].filter(Boolean).join(" / ") || (data.truckNumber ? `TRUCK: ${data.truckNumber}` : "—")

  const items = data.commodities && data.commodities.length > 0
    ? data.commodities
    : [
        {
          itemNo: 1,
          commodity: data.commodity,
          packageCount: data.packageCount,
          packageCountText: data.packageCountText,
          packageType: data.packageType,
          netWeight: data.netWeight,
          grossWeight: data.grossWeight,
          hsCode: data.hsCode,
        },
      ]

  return (
    <section
      data-shipping-preview="packing-list"
      className="flex h-[297mm] w-[210mm] max-h-[297mm] max-w-[210mm] flex-col justify-between overflow-hidden bg-white p-[10mm] text-slate-950 font-sans box-border select-none"
      style={{ width: "210mm", height: "297mm", maxHeight: "297mm" }}
    >
      {/* Top Header & Core Logistics Group */}
      <div className="space-y-3 shrink-0">
        {/* Top purple brand ribbon */}
        <div className="h-2.5 bg-[#583184] -mx-[10mm] -mt-[10mm] mb-3.5 shrink-0" />

        {/* Header with logo & titles */}
        <header className="flex items-center justify-between border-b-2 border-slate-900 pb-3 shrink-0">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/images/logo.png"}
              alt={displayCompanyName}
              className="h-14 w-14 object-contain rounded-full border border-slate-200 bg-white p-0.5 shadow-2xs shrink-0"
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = "none"
              }}
            />
            <div>
              <h2 className="text-[19px] font-black tracking-tight text-slate-950 uppercase leading-tight">
                {displayCompanyName}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-snug">
                {displaySubtitle}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-[26px] font-black tracking-[0.16em] text-[#583184] leading-tight">
              PACKING LIST
            </h1>
            <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-slate-100 border border-slate-200/90 px-2.5 py-1 text-[10.5px] font-bold text-slate-700">
              {data.bolNumber && (
                <span>
                  <span className="text-slate-500 font-medium">B/L:</span>{" "}
                  <span className="font-mono font-black text-slate-950">{data.bolNumber}</span>
                </span>
              )}
              {data.bolNumber && data.invoiceNumber && <span className="text-slate-300">•</span>}
              {data.invoiceNumber && (
                <span>
                  <span className="text-slate-500 font-medium">INV:</span>{" "}
                  <span className="font-mono font-black text-slate-950">{data.invoiceNumber}</span>
                </span>
              )}
              {(data.bolNumber || data.invoiceNumber) && (data.invoiceDate || data.date) && <span className="text-slate-300">•</span>}
              {(data.invoiceDate || data.date) && (
                <span>
                  <span className="text-slate-500 font-medium">DATE:</span>{" "}
                  <span className="font-mono font-black text-slate-950">{data.invoiceDate || data.date}</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Exporter / Shipper & Importer / Consignee Cards */}
        <div className="grid grid-cols-2 gap-3 text-[10px] shrink-0">
          {/* Exporter Card */}
          <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-2.5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-1 mb-1.5">
                <span className="inline-flex items-center gap-1 rounded bg-[#583184]/10 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-[#583184]">
                  EXPORTER / SHIPPER
                </span>
                <span className="text-[9px] font-bold text-slate-500 font-[vazirmatn]" dir="rtl">
                  صادرکننده
                </span>
              </div>
              <p className={`text-[13.5px] font-black text-[#1e40af] tracking-tight leading-snug ${isPashtoOrArabic(data.shipper) ? "font-[vazirmatn]" : ""}`}>
                {data.shipper || "—"}
              </p>
              {data.shipperAddress && (
                <p className={`mt-1 whitespace-pre-line leading-relaxed text-slate-800 text-[10px] ${isPashtoOrArabic(data.shipperAddress) ? "font-[vazirmatn]" : ""}`}>
                  {data.shipperAddress}
                </p>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-slate-900 border-t border-slate-200/80 pt-1.5">
              {data.shipperPhone && (
                <p>
                  <span className="font-bold text-slate-500">Phone: </span>
                  <span className="font-mono font-bold">{data.shipperPhone}</span>
                </p>
              )}
              {data.shipperLicence && (
                <p>
                  <span className="font-bold text-slate-500">Licence: </span>
                  <span className="font-mono font-bold">{data.shipperLicence}</span>
                </p>
              )}
            </div>
          </div>

          {/* Importer Card */}
          <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-2.5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-1 mb-1.5">
                <span className="inline-flex items-center gap-1 rounded bg-[#583184]/10 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-[#583184]">
                  IMPORTER / CONSIGNEE
                </span>
                <span className="text-[9px] font-bold text-slate-500 font-[vazirmatn]" dir="rtl">
                  واردکننده
                </span>
              </div>
              <p className={`text-[13.5px] font-black text-[#1e40af] tracking-tight leading-snug ${isPashtoOrArabic(data.consignee) ? "font-[vazirmatn]" : ""}`}>
                {data.consignee || "—"}
              </p>
              {data.consigneeAddress && (
                <p className={`mt-1 whitespace-pre-line leading-relaxed text-slate-800 text-[10px] ${isPashtoOrArabic(data.consigneeAddress) ? "font-[vazirmatn]" : ""}`}>
                  {data.consigneeAddress}
                </p>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9.5px] text-slate-900 border-t border-slate-200/80 pt-1.5">
              {data.consigneeGst && (
                <p className="truncate">
                  <span className="font-bold text-slate-500">GST: </span>
                  <span className="font-mono font-bold">{data.consigneeGst}</span>
                </p>
              )}
              {data.consigneeFssai && (
                <p className="truncate">
                  <span className="font-bold text-slate-500">FSSAI: </span>
                  <span className="font-mono font-bold">{data.consigneeFssai}</span>
                </p>
              )}
              {data.consigneePhone && (
                <p className="truncate">
                  <span className="font-bold text-slate-500">Cell: </span>
                  <span className="font-mono font-bold">{data.consigneePhone}</span>
                </p>
              )}
              {data.consigneeEmail && (
                <p className="truncate">
                  <span className="font-bold text-slate-500">Email: </span>
                  <span className="font-mono font-bold">{data.consigneeEmail}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* DEDICATED DRIVER & TRANSPORT INFORMATION CARD */}
        <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-purple-50/50 p-2.5 shadow-2xs shrink-0">
          <div className="flex items-center justify-between border-b border-indigo-200/80 pb-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-indigo-600 text-white shrink-0">
                <Truck className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-950">
                Driver & Transport Logistics Information
              </span>
            </div>
            <span className="text-[10px] font-bold text-indigo-800 font-[vazirmatn]" dir="rtl">
              مشخصات موټر، راننده او کرایه
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <div className="bg-white/90 border border-indigo-100 rounded-lg p-1.5">
              <p className="text-[7.5px] font-black uppercase text-indigo-700 leading-tight">Truck / Vehicle No</p>
              <p className={`mt-0.5 font-black text-slate-950 text-[12px] truncate leading-tight ${isPashtoOrArabic(data.truckNumber || "") ? "font-[vazirmatn]" : "font-mono"}`}>
                {data.truckNumber || "—"}
              </p>
            </div>
            <div className="bg-white/90 border border-indigo-100 rounded-lg p-1.5">
              <p className="text-[7.5px] font-black uppercase text-indigo-700 leading-tight">Driver Name</p>
              <p className={`mt-0.5 font-black text-slate-950 text-[12px] truncate leading-tight ${isPashtoOrArabic(data.driverName || "") ? "font-[vazirmatn]" : ""}`}>
                {data.driverName || "—"}
                {data.driverFatherName && (
                  <span className="font-normal text-slate-500 text-[9px]"> s/o {data.driverFatherName}</span>
                )}
              </p>
            </div>
            <div className="bg-white/90 border border-indigo-100 rounded-lg p-1.5">
              <p className="text-[7.5px] font-black uppercase text-indigo-700 leading-tight">Driver Contact</p>
              <p className="mt-0.5 font-bold text-slate-950 font-mono text-[11.5px] truncate leading-tight">
                {data.driverContact || "—"}
              </p>
            </div>
            <div className="bg-white/90 border border-indigo-100 rounded-lg p-1.5">
              <p className="text-[7.5px] font-black uppercase text-indigo-700 leading-tight">Driver Freight / Rent</p>
              <p className={`mt-0.5 font-black text-slate-950 text-[12px] truncate leading-tight ${isPashtoOrArabic(data.driverRent || "") ? "font-[vazirmatn]" : "font-mono"}`}>
                {[data.driverRent, data.driverRentCurrency].filter(Boolean).join(" ") || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Shipment & Logistics Details Table */}
        <div className="overflow-hidden rounded-lg border border-slate-300 shadow-2xs text-[9.5px] shrink-0">
          {detailRows.map(([leftLabel, leftValue, rightLabel, rightValue], idx) => (
            <div key={idx} className="grid grid-cols-[120px_1fr_120px_1fr] border-b border-slate-200 last:border-b-0">
              <span className="bg-slate-100/90 px-3 py-1.5 font-bold text-slate-600 uppercase text-[8.5px] tracking-wide border-r border-slate-200">
                {leftLabel}
              </span>
              <span className={`px-3 py-1.5 font-bold text-slate-950 text-[10.5px] truncate ${isPashtoOrArabic(leftValue || "") ? "font-[vazirmatn]" : ""}`}>
                {leftValue || "—"}
              </span>
              <span className="border-l border-r border-slate-200 bg-slate-100/90 px-3 py-1.5 font-bold text-slate-600 uppercase text-[8.5px] tracking-wide">
                {rightLabel}
              </span>
              <span className={`px-3 py-1.5 font-bold text-slate-950 text-[10.5px] truncate ${isPashtoOrArabic(rightValue || "") ? "font-[vazirmatn]" : ""}`}>
                {rightValue || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Packages & Commodity Table */}
      <div className="my-3 overflow-hidden rounded-lg border border-slate-300 shadow-2xs shrink-0">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-[#583184] text-white">
            <tr>
              <th className="w-[20%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">CONTAINER / VEHICLE</th>
              <th className="w-[18%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">MARKS & NUMBERS</th>
              <th className="w-[18%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">PACKAGES & KIND</th>
              <th className="w-[26%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">COMMODITY / HS CODE</th>
              <th className="w-[9%] p-2 text-right font-black tracking-wider text-[8.5px] uppercase">GROSS WT</th>
              <th className="w-[9%] p-2 text-right font-black tracking-wider text-[8.5px] uppercase">NET WT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, idx) => {
              const packDisplay = [
                item.packageCountText || (item.packageCount ? String(item.packageCount) : ""),
                item.packageType,
              ].filter(Boolean).join(" ") || data.packageCountText || item.packageType || "—"

              return (
                <tr key={idx} className="min-h-[52px] align-top bg-white hover:bg-slate-50/50">
                  <td className={`p-2.5 font-bold text-slate-900 break-words text-[10px] ${isPashtoOrArabic(cntrSealLines || "") ? "font-[vazirmatn]" : "font-mono"}`}>
                    {idx === 0 ? cntrSealLines : ""}
                  </td>
                  <td className={`p-2.5 font-semibold text-slate-900 break-words text-[10px] ${isPashtoOrArabic(data.marksAndNumbers || "") ? "font-[vazirmatn]" : ""}`}>
                    {idx === 0 ? (data.marksAndNumbers || "N/M") : ""}
                  </td>
                  <td className="p-2.5 font-black text-slate-950 text-[11px]">
                    {packDisplay}
                  </td>
                  <td className="p-2.5 font-semibold text-slate-900 text-[10.5px]">
                    <span className={`font-black uppercase text-slate-950 text-[11px] block leading-tight ${isPashtoOrArabic(item.commodity || data.commodity || "") ? "font-[vazirmatn]" : ""}`}>
                      {item.commodity || data.commodity || "—"}
                    </span>
                    {item.hsCode && (
                      <span className="mt-1 block font-mono font-bold text-[9px] text-slate-600">
                        HS CODE: {item.hsCode}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 font-black font-mono text-slate-950 text-[11px] text-right">
                    {item.grossWeight || data.grossWeight || "—"}
                  </td>
                  <td className="p-2.5 font-black font-mono text-slate-950 text-[11px] text-right">
                    {item.netWeight || data.netWeight || "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary, Sign-off & Footer Group */}
      <div className="space-y-3 shrink-0">
        {/* Totals & Summary Grid */}
        <div className="grid grid-cols-4 gap-2.5 text-[9px] shrink-0">
          {[
            ["TOTAL PACKAGES", [data.packageCountText || (data.packageCount ? String(data.packageCount) : ""), data.packageType].filter(Boolean).join(" ") || "—"],
            ["TOTAL GROSS WEIGHT", data.grossWeight || "—"],
            ["TOTAL NET WEIGHT", data.netWeight || "—"],
            ["MEASUREMENT / CBM", data.measurement || "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border-2 border-slate-200 bg-slate-50/90 p-2 shadow-2xs">
              <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">{label}</p>
              <p className="mt-0.5 font-mono font-black text-slate-950 text-[12.5px] truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Footer & Authorized Signatures */}
        <footer className="border-t border-slate-300 pt-2.5 text-[9px] text-slate-600 shrink-0">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-[110mm] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[9.5px]">
                <ShieldCheck className="h-4 w-4" />
                <span>OFFICIAL LOGISTICS VERIFICATION</span>
              </div>
              <p className="italic text-[9.5px] leading-relaxed text-slate-600">
                We certify that this packing list is authentic, true and correct, and covers the complete consignment described above.
              </p>
            </div>

            <div className="w-56 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 p-2 text-center shrink-0">
              <div className="border-b border-slate-300 pb-1 mb-1 text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">
                OFFICIAL CARRIER STAMP & SEAL
              </div>
              <div className="h-8 flex items-center justify-center text-[10px] font-black text-slate-900 uppercase tracking-wide">
                AUTHORIZED SIGNATURE
              </div>
            </div>
          </div>

          <div className="mt-2.5 border-t border-slate-200 pt-1.5 text-center font-bold text-slate-500 text-[9px] uppercase tracking-wider">
            {displayCompanyName} • INTERNATIONAL TRANSPORTATION • FREIGHT FORWARDING • TRANSIT
          </div>
        </footer>
      </div>
    </section>
  )
}

export default PackingListPdfPage
