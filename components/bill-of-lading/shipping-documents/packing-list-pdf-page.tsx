"use client"

import { useMemo } from "react"
import {
  parseCommodityItems,
  sumWeightStrings,
  type ShippingDocumentData,
} from "@/lib/utils/shipping-documents"
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
 * high-contrast fields, multi-commodity support (2, 3, 4, 5+ items stacked on top of each other),
 * and strict 1-page A4 balance.
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

  // Resilient multi-item resolution: if data.commodities has 1 item but input has multi-items, parse discrete records
  const items = useMemo(() => {
    if (data.commodities && data.commodities.length > 1) {
      return data.commodities
    }
    const parsed = parseCommodityItems(
      data.commodity,
      data.packageCountText || (data.packageCount ? String(data.packageCount) : ""),
      data.netWeight,
      data.grossWeight,
      "",
      "",
      data.packageType,
      data.hsCode,
      data.measurement,
      data.packingDateMonthYear,
      data.expiryDateMonthYear,
    )
    if (parsed.length > 1) {
      return parsed
    }
    return data.commodities && data.commodities.length > 0
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
  }, [data])

  // Compute grand totals for bottom summary cards
  const grandGrossWeight = useMemo(() => {
    if (items.length > 1) {
      let sum = 0
      let unit = "KG"
      let parsedAny = false
      for (const it of items) {
        const cleanedStr = String(it.grossWeight || "").replace(/,/g, "")
        const numMatch = cleanedStr.match(/\b\d+(?:\.\d+)?\b/)
        const num = numMatch ? parseFloat(numMatch[0]) : 0
        if (!isNaN(num) && num > 0) {
          sum += num
          parsedAny = true
        }
        const uMatch = String(it.grossWeight || "").match(/\b(KG|KGS|MT|TONS?|LBS?)\b/i)
        if (uMatch) unit = uMatch[1].toUpperCase()
      }
      if (parsedAny && sum > 0) return `${sum.toLocaleString("en-US")} ${unit}`
    }
    return sumWeightStrings(data.grossWeight) || data.grossWeight || "—"
  }, [items, data.grossWeight])

  const grandNetWeight = useMemo(() => {
    if (items.length > 1) {
      let sum = 0
      let unit = "KG"
      let parsedAny = false
      for (const it of items) {
        const cleanedStr = String(it.netWeight || "").replace(/,/g, "")
        const numMatch = cleanedStr.match(/\b\d+(?:\.\d+)?\b/)
        const num = numMatch ? parseFloat(numMatch[0]) : 0
        if (!isNaN(num) && num > 0) {
          sum += num
          parsedAny = true
        }
        const uMatch = String(it.netWeight || "").match(/\b(KG|KGS|MT|TONS?|LBS?)\b/i)
        if (uMatch) unit = uMatch[1].toUpperCase()
      }
      if (parsedAny && sum > 0) return `${sum.toLocaleString("en-US")} ${unit}`
    }
    return sumWeightStrings(data.netWeight) || data.netWeight || "—"
  }, [items, data.netWeight])

  const grandPackageCount = useMemo(() => {
    if (items.length > 1) {
      const sum = items.reduce((acc, it) => acc + (it.packageCount || 0), 0)
      if (sum > 0) {
        const pType = items[0]?.packageType || data.packageType || "Bags"
        return `${sum.toLocaleString("en-US")} ${pType}`
      }
    }
    return [data.packageCountText || (data.packageCount ? String(data.packageCount) : ""), data.packageType].filter(Boolean).join(" ") || "—"
  }, [items, data.packageCountText, data.packageCount, data.packageType])

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
      <div className="my-2.5 overflow-hidden rounded-lg border border-slate-300 shadow-2xs shrink-0">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-[#583184] text-white">
            <tr>
              <th className="w-[19%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">CONTAINER / VEHICLE</th>
              <th className="w-[17%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">MARKS & NUMBERS</th>
              <th className="w-[18%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">PACKAGES & KIND</th>
              <th className="w-[28%] p-2 text-left font-black tracking-wider text-[8.5px] uppercase">COMMODITY / HS CODE</th>
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

              const cellPadding = items.length <= 2 ? "p-2.5" : items.length === 3 ? "p-2" : "p-1.5"

              return (
                <tr key={idx} className="align-top bg-white hover:bg-slate-50/50">
                  {idx === 0 && (
                    <td
                      rowSpan={items.length}
                      className={`${cellPadding} font-bold text-slate-900 break-words text-[10px] border-r border-slate-200 align-top ${isPashtoOrArabic(cntrSealLines || "") ? "font-[vazirmatn]" : "font-mono"}`}
                    >
                      {cntrSealLines}
                    </td>
                  )}
                  {idx === 0 && (
                    <td
                      rowSpan={items.length}
                      className={`${cellPadding} font-semibold text-slate-900 break-words text-[10px] border-r border-slate-200 align-top ${isPashtoOrArabic(data.marksAndNumbers || "") ? "font-[vazirmatn]" : ""}`}
                    >
                      {data.marksAndNumbers || "N/M"}
                    </td>
                  )}
                  <td className={`${cellPadding} font-black text-slate-950 text-[11px] border-r border-slate-100`}>
                    <div className="flex items-center gap-1.5">
                      {items.length > 1 && (
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-purple-100 text-[#583184] text-[8.5px] font-black shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <span>{packDisplay}</span>
                    </div>
                  </td>
                  <td className={`${cellPadding} font-semibold text-slate-900 text-[10.5px] border-r border-slate-100`}>
                    <span className={`font-black uppercase text-slate-950 text-[11px] block leading-tight ${isPashtoOrArabic(item.commodity || data.commodity || "") ? "font-[vazirmatn]" : ""}`}>
                      {item.commodity || data.commodity || "—"}
                    </span>
                    {item.hsCode && (
                      <span className="mt-0.5 block font-mono font-bold text-[8.5px] text-slate-600">
                        HS: {item.hsCode}
                      </span>
                    )}
                  </td>
                  <td className={`${cellPadding} font-black font-mono text-slate-950 text-[11px] text-right border-r border-slate-100`}>
                    {item.grossWeight || (items.length === 1 ? data.grossWeight : "—")}
                  </td>
                  <td className={`${cellPadding} font-black font-mono text-slate-950 text-[11px] text-right`}>
                    {item.netWeight || (items.length === 1 ? data.netWeight : "—")}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary, Sign-off & Footer Group */}
      <div className="space-y-2.5 shrink-0">
        {/* Totals & Summary Grid */}
        <div className="grid grid-cols-4 gap-2.5 text-[9px] shrink-0">
          {/* TOTAL PACKAGES */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/90 p-2 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">TOTAL PACKAGES</p>
                {items.length > 1 && (
                  <span className="text-[7px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded font-mono">
                    {items.length} ITEMS
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono font-black text-slate-950 text-[13px] truncate leading-tight">
                {grandPackageCount}
              </p>
            </div>
            {items.length > 1 && (
              <div className="mt-1 pt-1 border-t border-slate-200/90 space-y-0.5 text-[8px] font-mono">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-500">#{i + 1}:</span>
                    <span className="font-bold text-slate-900 truncate ml-1">
                      {[it.packageCountText || (it.packageCount ? String(it.packageCount) : ""), it.packageType].filter(Boolean).join(" ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOTAL GROSS WEIGHT */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/90 p-2 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">TOTAL GROSS WEIGHT</p>
                {items.length > 1 && (
                  <span className="text-[7px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded font-mono">
                    {items.length} ITEMS
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono font-black text-slate-950 text-[13px] truncate leading-tight">
                {grandGrossWeight}
              </p>
            </div>
            {items.length > 1 && (
              <div className="mt-1 pt-1 border-t border-slate-200/90 space-y-0.5 text-[8px] font-mono">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-500">#{i + 1}:</span>
                    <span className="font-bold text-slate-900 truncate ml-1">{it.grossWeight || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOTAL NET WEIGHT */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/90 p-2 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">TOTAL NET WEIGHT</p>
                {items.length > 1 && (
                  <span className="text-[7px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded font-mono">
                    {items.length} ITEMS
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono font-black text-slate-950 text-[13px] truncate leading-tight">
                {grandNetWeight}
              </p>
            </div>
            {items.length > 1 && (
              <div className="mt-1 pt-1 border-t border-slate-200/90 space-y-0.5 text-[8px] font-mono">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-500">#{i + 1}:</span>
                    <span className="font-bold text-slate-900 truncate ml-1">{it.netWeight || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MEASUREMENT / CBM */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/90 p-2 shadow-2xs flex flex-col justify-between">
            <div>
              <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">MEASUREMENT / CBM</p>
              <p className="mt-0.5 font-mono font-black text-slate-950 text-[13px] truncate leading-tight">
                {data.measurement || "—"}
              </p>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-200/90 text-[8px] text-slate-500 font-semibold">
              <span>Standard Maritime / Transit</span>
            </div>
          </div>
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
