"use client"

import type { ShippingDocumentData } from "@/lib/utils/shipping-documents"
import { Truck } from "lucide-react"

export interface PackingListPdfPageProps {
  data: ShippingDocumentData
  logoUrl?: string
  companyName?: string
  companySubtitle?: string
}

/**
 * PackingListPdfPage - Professional A4 Shipping Document Packing List.
 * Fully automated from BOL master record with dedicated Driver & Transport information.
 * Supports multi-commodity items, clean styling, and strict 1-page A4 fit.
 */
export function PackingListPdfPage({
  data,
  logoUrl,
  companyName,
  companySubtitle,
}: PackingListPdfPageProps) {
  const displayCompanyName = companyName || data.companyName || "SKY ARIANA LTD"
  const displaySubtitle = companySubtitle || data.companySubtitle || "International Transportation • Transit • Forwarding"

  const detailRows = [
    ["B/L Number", data.bolNumber, "Booking Number", data.bookingNumber],
    ["Invoice Number", data.invoiceNumber, "Invoice Date", data.invoiceDate || data.date],
    ["Container Number", data.containerNumber, "Seal Number", data.sealNumber],
    ["Container Type", data.containerType, "Vessel / Voyage", [data.vesselName, data.voyageNumber].filter(Boolean).join(" / ")],
    ["Port of Loading", data.portOfLoading, "Port of Discharge", data.portOfDischarge],
    ["Final Destination", data.finalDestination, "Packing Date", data.packingDateMonthYear || data.date],
  ]

  const cntrSealLines = data.containers && data.containers.length > 0
    ? data.containers.map((c) => `${c.containerNumber}${c.sealNumber ? ` / ${c.sealNumber}` : ""}`).join(", ")
    : data.containerNumber

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

  const hasDriverInfo = Boolean(
    data.driverName ||
    data.driverFatherName ||
    data.truckNumber ||
    data.driverContact ||
    data.driverRent
  )

  return (
    <section
      data-shipping-preview="packing-list"
      className="flex h-[297mm] w-[210mm] max-h-[297mm] max-w-[210mm] flex-col overflow-hidden bg-white p-[9mm] text-slate-950 font-sans box-border select-none"
      style={{ width: "210mm", height: "297mm", maxHeight: "297mm" }}
    >
      {/* Top purple brand ribbon */}
      <div className="h-2 bg-[#583184] -mx-[9mm] -mt-[9mm] mb-3" />

      {/* Header with logo & titles */}
      <header className="flex items-start justify-between border-b border-slate-300 pb-2.5 shrink-0">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || "/images/logo.png"}
            alt={displayCompanyName}
            className="h-12 w-12 object-contain"
            onError={(e) => {
              ;(e.target as HTMLElement).style.display = "none"
            }}
          />
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-950">{displayCompanyName}</h2>
            <p className="text-[9.5px] font-semibold text-slate-500">{displaySubtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-black tracking-[0.14em] text-[#583184]">PACKING LIST</h1>
          <p className="mt-0.5 text-[9.5px] font-bold text-slate-600">
            {[
              data.bolNumber ? `B/L: ${data.bolNumber}` : "",
              data.invoiceNumber ? `INV: ${data.invoiceNumber}` : "",
              data.date ? `DATE: ${data.date}` : "",
            ]
              .filter(Boolean)
              .join("  •  ")}
          </p>
        </div>
      </header>

      {/* Exporter / Shipper & Importer / Consignee */}
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 text-[9px] shrink-0">
        <div className="min-h-20 rounded-lg border border-slate-300 bg-slate-50/70 p-2">
          <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">Exporter / Shipper</p>
          <p className="mt-0.5 text-[10px] font-black text-slate-950">{data.shipper || "—"}</p>
          {data.shipperAddress && <p className="mt-0.5 whitespace-pre-line leading-relaxed text-slate-700 text-[8.5px]">{data.shipperAddress}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3 text-[8.5px] text-slate-900">
            {data.shipperPhone && <p><span className="font-bold">Phone:</span> {data.shipperPhone}</p>}
            {data.shipperLicence && <p><span className="font-bold">Licence:</span> {data.shipperLicence}</p>}
          </div>
        </div>

        <div className="min-h-20 rounded-lg border border-slate-300 bg-slate-50/70 p-2">
          <p className="text-[7.5px] font-black uppercase tracking-wider text-[#583184]">Importer / Consignee</p>
          <p className="mt-0.5 text-[10px] font-black text-slate-950">{data.consignee || "—"}</p>
          {data.consigneeAddress && <p className="mt-0.5 whitespace-pre-line leading-relaxed text-slate-700 text-[8.5px]">{data.consigneeAddress}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3 text-[8.5px] text-slate-900">
            {data.consigneeGst && <p><span className="font-bold">GST:</span> {data.consigneeGst}</p>}
            {data.consigneeFssai && <p><span className="font-bold">FSSAI:</span> {data.consigneeFssai}</p>}
            {data.consigneePhone && <p><span className="font-bold">Cell:</span> {data.consigneePhone}</p>}
            {data.consigneeEmail && <p><span className="font-bold">Email:</span> {data.consigneeEmail}</p>}
          </div>
        </div>
      </div>

      {/* DEDICATED DRIVER & TRANSPORT INFORMATION CARD (Requested by user) */}
      <div className="mt-2.5 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2 shrink-0">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-indigo-700" />
            <span className="text-[8px] font-black uppercase tracking-wider text-indigo-900">
              Driver & Transport Information
            </span>
          </div>
          <span className="text-[8px] font-bold text-indigo-700 font-[vazirmatn]">
            مشخصات موټر او راننده
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[8.5px]">
          <div>
            <p className="text-[7px] font-black uppercase text-indigo-600">Truck / Vehicle No</p>
            <p className="font-black text-slate-900 font-mono text-[9px]">{data.truckNumber || "—"}</p>
          </div>
          <div>
            <p className="text-[7px] font-black uppercase text-indigo-600">Driver Name</p>
            <p className="font-black text-slate-900">
              {data.driverName || "—"}
              {data.driverFatherName && <span className="font-normal text-slate-500 text-[7.5px]"> s/o {data.driverFatherName}</span>}
            </p>
          </div>
          <div>
            <p className="text-[7px] font-black uppercase text-indigo-600">Driver Contact</p>
            <p className="font-bold text-slate-900 font-mono">{data.driverContact || "—"}</p>
          </div>
          <div>
            <p className="text-[7px] font-black uppercase text-indigo-600">Driver Freight / Rent</p>
            <p className="font-black text-slate-900 font-mono">
              {[data.driverRent, data.driverRentCurrency].filter(Boolean).join(" ") || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Shipment & Logistics Details Table */}
      <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-300 text-[8px] shrink-0">
        {detailRows.map(([leftLabel, leftValue, rightLabel, rightValue], idx) => (
          <div key={idx} className="grid grid-cols-[95px_1fr_95px_1fr] border-b border-slate-200 last:border-b-0">
            <span className="bg-slate-50 px-2 py-1 font-black text-slate-500 uppercase">{leftLabel}</span>
            <span className="px-2 py-1 font-bold text-slate-900 truncate">{leftValue || "—"}</span>
            <span className="border-l border-slate-200 bg-slate-50 px-2 py-1 font-black text-slate-500 uppercase">{rightLabel}</span>
            <span className="px-2 py-1 font-bold text-slate-900 truncate">{rightValue || "—"}</span>
          </div>
        ))}
      </div>

      {/* Packages & Commodity Table (Supports Multi-Commodity rows) */}
      <div className="mt-2.5 flex-1 min-h-0 flex flex-col">
        <table className="w-full table-fixed border-collapse text-[8px]">
          <thead className="bg-[#583184] text-white">
            <tr>
              <th className="w-[22%] border border-[#583184] p-1.5 text-left font-black tracking-wider text-[7.5px]">CONTAINER / SEAL</th>
              <th className="w-[16%] border border-[#583184] p-1.5 text-left font-black tracking-wider text-[7.5px]">MARKS & NUMBERS</th>
              <th className="w-[20%] border border-[#583184] p-1.5 text-left font-black tracking-wider text-[7.5px]">PACKAGES & KIND</th>
              <th className="w-[24%] border border-[#583184] p-1.5 text-left font-black tracking-wider text-[7.5px]">COMMODITY / HS CODE</th>
              <th className="w-[9%] border border-[#583184] p-1.5 text-left font-black tracking-wider text-[7.5px]">GROSS WT</th>
              <th className="w-[9%] border border-[#583184] p-1.5 text-left font-black tracking-wider text-[7.5px]">NET WT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="h-11 align-top border-b border-slate-200 last:border-b-0">
                <td className="border border-slate-300 p-1.5 font-semibold text-slate-900 break-words text-[7.5px]">
                  {idx === 0 ? cntrSealLines : ""}
                </td>
                <td className="border border-slate-300 p-1.5 font-semibold text-slate-900 break-words text-[7.5px]">
                  {idx === 0 ? (data.marksAndNumbers || "N/M") : ""}
                </td>
                <td className="border border-slate-300 p-1.5 font-black text-slate-950 text-[8px]">
                  {item.packageCountText} {item.packageType}
                </td>
                <td className="border border-slate-300 p-1.5 font-semibold text-slate-900 text-[8px]">
                  <span className="font-bold">{item.commodity || "—"}</span>
                  {item.hsCode && <span className="mt-0.5 block font-mono text-[7px] text-slate-600">HS CODE: {item.hsCode}</span>}
                </td>
                <td className="border border-slate-300 p-1.5 font-black text-slate-950 text-[8px]">{item.grossWeight || "—"}</td>
                <td className="border border-slate-300 p-1.5 font-black text-slate-950 text-[8px]">{item.netWeight || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Summary Grid */}
      <div className="mt-2 grid grid-cols-4 gap-2 text-[8px] shrink-0">
        {[
          ["TOTAL PACKAGES", [data.packageCountText, data.packageType].filter(Boolean).join(" ")],
          ["TOTAL GROSS WT", data.grossWeight],
          ["TOTAL NET WT", data.netWeight],
          ["MEASUREMENT / CBM", data.measurement],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-300 bg-slate-50 p-1.5">
            <p className="text-[6.5px] font-black uppercase text-[#583184]">{label}</p>
            <p className="mt-0.5 font-black text-slate-900">{value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Footer & Authorized Signatures */}
      <footer className="mt-2.5 pt-2 text-[7.5px] text-slate-500 shrink-0">
        <div className="flex items-end justify-between">
          <p className="italic">We certify that this packing list is true and correct and covers the full consignment detailed above.</p>
          <div className="w-44 border-t border-slate-900 pt-1 text-center font-black text-slate-900">
            AUTHORIZED SIGNATURE / STAMP
          </div>
        </div>
        <div className="mt-2 border-t border-slate-200 pt-1 text-center font-bold text-slate-600">
          {displayCompanyName} • International Transportation • Transit • Forwarding
        </div>
      </footer>
    </section>
  )
}

export default PackingListPdfPage
