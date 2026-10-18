"use client"

import React from "react"
import { OperationsReportModel } from "@/lib/reports/types"
import { AlertTriangle, CheckCircle2, Clock, MapPin, Truck, Ship, FileText } from "lucide-react"

interface OperationsReportPrintDocumentProps {
  report: OperationsReportModel
}

export function OperationsReportPrintDocument({ report }: OperationsReportPrintDocumentProps) {
  const { metadata, summary, shipments, routeActivity, containerActivity, truckActivity, documentStatusSummary, needsAttention } = report

  return (
    <div className="print-report-root font-sans text-slate-900 bg-white text-[11px] leading-relaxed select-text print:p-0 print:m-0 p-8 max-w-[900px] mx-auto">
      {/* ========================================================================= */}
      {/* PAGE 1: COVER & EXECUTIVE SUMMARY */}
      {/* ========================================================================= */}
      <div className="page-section pb-8 border-b-2 border-slate-300 mb-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-primary/40 pb-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-xs">
                <img
                  src="/images/aq-companies-punisher-logo.png"
                  alt="AQ Companies"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                    AQ Companies
                  </h1>
                </div>
                <p className="text-[10px] text-slate-600 font-medium tracking-wide">
                  INTERNATIONAL MULTI-MODAL LOGISTICS & FREIGHT FORWARDING
                </p>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 pt-1">
              Cross-Border Transit • Customs Clearance • Port Operations (Bandar Abbas, Mersin, Jebel Ali)
            </p>
          </div>

          <div className="text-right space-y-0.5">
            <div className="inline-block px-2.5 py-1 bg-primary/10 text-primary font-bold text-xs uppercase rounded tracking-wider border border-primary/20">
              {metadata.periodType} Operations Report
            </div>
            <div className="text-[10px] text-slate-700 font-semibold pt-1">
              Date: <span className="font-mono">{metadata.generatedAt.split(" ")[0]}</span>
            </div>
            <div className="text-[9px] text-slate-500">
              Prepared by: <span className="font-medium text-slate-700">{metadata.generatedBy}</span>
            </div>
          </div>
        </div>

        {/* Report Title & Scope Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                Official Report Title
              </span>
              <h2 className="text-base font-bold text-slate-800">{metadata.title}</h2>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                Operating Window
              </span>
              <span className="font-semibold text-xs text-primary font-mono">
                {metadata.dateRangeLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" /> Key Operational Indicators
          </h3>
          <div className="grid grid-cols-4 gap-2.5">
            <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded text-center">
              <span className="text-[9px] font-medium text-slate-500 block uppercase">Total Shipments</span>
              <span className="text-lg font-bold text-slate-900">{summary.totalShipments}</span>
              <span className="text-[8px] text-slate-500 block">({summary.activeShipments} Active / {summary.deliveredShipments} Delivered)</span>
            </div>
            <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded text-center">
              <span className="text-[9px] font-medium text-slate-500 block uppercase">Cargo Units</span>
              <span className="text-lg font-bold text-slate-900">{summary.totalContainers} <span className="text-xs font-normal text-slate-500">Ctrs</span></span>
              <span className="text-[8px] text-slate-500 block">{summary.totalPackages.toLocaleString()} Packages</span>
            </div>
            <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded text-center">
              <span className="text-[9px] font-medium text-slate-500 block uppercase">Cargo Weight</span>
              <span className="text-lg font-bold text-slate-900">{(summary.totalGrossWeightKg / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-500">MT</span></span>
              <span className="text-[8px] text-slate-500 block">{summary.totalGrossWeightKg.toLocaleString()} KG Gross</span>
            </div>
            <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded text-center">
              <span className="text-[9px] font-medium text-slate-500 block uppercase">Trucks Dispatched</span>
              <span className="text-lg font-bold text-slate-900">{summary.totalTrucks}</span>
              <span className="text-[8px] text-slate-500 block">Active Drivers</span>
            </div>
          </div>
        </div>

        {/* Status Distribution Summary */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" /> Operational Pipeline Breakdown
          </h3>
          <div className="grid grid-cols-6 gap-2 text-center">
            {summary.statusCategories.map((cat) => (
              <div key={cat.statusCategory} className="border border-slate-200 p-2 rounded bg-white">
                <span className="text-[9px] font-semibold text-slate-600 block truncate">{cat.statusCategory}</span>
                <span className="text-sm font-bold text-slate-900">{cat.count}</span>
                <span className="text-[8px] text-slate-400 block">{cat.percentage.toFixed(0)}% active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention Block */}
        {needsAttention.length > 0 && (
          <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-3 mb-6 break-inside-avoid">
            <div className="flex items-center gap-1.5 mb-2 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide">
                Immediate Action Required ({needsAttention.length} Items)
              </h4>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-hidden">
              {needsAttention.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[10px] bg-white/80 p-1.5 rounded border border-amber-200">
                  <div>
                    <span className="font-bold text-slate-800 mr-2">BOL #{item.bolNumber}</span>
                    <span className="font-medium text-amber-900">{item.issue}</span>: {item.description}
                  </div>
                  <span className="text-amber-800 font-semibold uppercase text-[9px] ml-2 shrink-0">
                    Action: {item.suggestedAction}
                  </span>
                </div>
              ))}
              {needsAttention.length > 4 && (
                <p className="text-[9px] text-amber-800 text-center font-medium pt-0.5">
                  + {needsAttention.length - 4} more attention items detailed on subsequent pages.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Key Gateway & Routes Summary */}
        <div className="break-inside-avoid">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" /> Key Active Routes & Border Crossings
          </h3>
          <table className="w-full border-collapse border border-slate-200 text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-left font-semibold">
                <th className="p-1.5 border border-slate-200">Route</th>
                <th className="p-1.5 border border-slate-200">Transit Border</th>
                <th className="p-1.5 border border-slate-200">Port</th>
                <th className="p-1.5 border border-slate-200 text-center">Shipments</th>
                <th className="p-1.5 border border-slate-200 text-center">Containers</th>
                <th className="p-1.5 border border-slate-200 text-right">Gross Weight (MT)</th>
              </tr>
            </thead>
            <tbody>
              {routeActivity.slice(0, 5).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-1.5 border border-slate-200 font-medium">{r.route}</td>
                  <td className="p-1.5 border border-slate-200">{r.border}</td>
                  <td className="p-1.5 border border-slate-200">{r.port}</td>
                  <td className="p-1.5 border border-slate-200 text-center font-semibold">{r.shipmentCount}</td>
                  <td className="p-1.5 border border-slate-200 text-center">{r.containerCount}</td>
                  <td className="p-1.5 border border-slate-200 text-right">{(r.grossWeightKg / 1000).toFixed(1)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2+: SHIPMENT ACTIVITY DETAIL */}
      {/* ========================================================================= */}
      <div className="page-section pb-8 border-b-2 border-slate-300 mb-8 break-before-page">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" /> Comprehensive Shipment Movement Table
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">Total: {shipments.length} Records</span>
        </div>

        <table className="w-full border-collapse border border-slate-200 text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-left font-bold">
              <th className="p-1 border border-slate-200">BOL #</th>
              <th className="p-1 border border-slate-200">Date</th>
              <th className="p-1 border border-slate-200">Shipper</th>
              <th className="p-1 border border-slate-200">Consignee</th>
              <th className="p-1 border border-slate-200">Commodity</th>
              <th className="p-1 border border-slate-200">Pkgs</th>
              <th className="p-1 border border-slate-200 text-right">Gross (KG)</th>
              <th className="p-1 border border-slate-200">Origin → Dest</th>
              <th className="p-1 border border-slate-200">Driver / Plate</th>
              <th className="p-1 border border-slate-200 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, idx) => (
              <tr key={idx} className={`border-b border-slate-200 break-inside-avoid ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                <td className="p-1 border border-slate-200 font-mono font-semibold text-slate-900">{s.bolNumber}</td>
                <td className="p-1 border border-slate-200 text-slate-600 whitespace-nowrap">{s.issueDate}</td>
                <td className="p-1 border border-slate-200 truncate max-w-[100px]">{s.shipperName}</td>
                <td className="p-1 border border-slate-200 truncate max-w-[100px]">{s.consigneeName}</td>
                <td className="p-1 border border-slate-200 truncate max-w-[90px]">{s.commodity}</td>
                <td className="p-1 border border-slate-200">{s.packages}</td>
                <td className="p-1 border border-slate-200 text-right font-mono">{s.grossWeightKg.toLocaleString()}</td>
                <td className="p-1 border border-slate-200 text-slate-600 text-[8.5px] truncate max-w-[90px]">
                  {s.origin} → {s.destination}
                </td>
                <td className="p-1 border border-slate-200 text-[8.5px]">
                  <div>{s.driverName}</div>
                  <div className="font-mono text-slate-500">{s.truckNumber}</div>
                </td>
                <td className="p-1 border border-slate-200 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    s.operationalStatus === "DELIVERED"
                      ? "bg-emerald-100 text-emerald-800"
                      : s.operationalStatus === "AT BORDER"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {s.operationalStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: CONTAINERS, TRUCKS & DOCUMENT STATUS */}
      {/* ========================================================================= */}
      <div className="page-section pb-8 border-b-2 border-slate-300 mb-8 break-before-page">
        {/* Container Movements */}
        <div className="mb-6 break-inside-avoid">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-primary" /> Active Container Inventory ({containerActivity.length})
          </h3>
          <table className="w-full border-collapse border border-slate-200 text-[9.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-left font-semibold">
                <th className="p-1 border border-slate-200">Container #</th>
                <th className="p-1 border border-slate-200">Size / Type</th>
                <th className="p-1 border border-slate-200">Category</th>
                <th className="p-1 border border-slate-200">BOL #</th>
                <th className="p-1 border border-slate-200">Destination</th>
                <th className="p-1 border border-slate-200">Port</th>
                <th className="p-1 border border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {containerActivity.slice(0, 15).map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 break-inside-avoid">
                  <td className="p-1 border border-slate-200 font-mono font-semibold">{c.containerNumber}</td>
                  <td className="p-1 border border-slate-200">{c.containerType}</td>
                  <td className="p-1 border border-slate-200">{c.category}</td>
                  <td className="p-1 border border-slate-200 font-mono">{c.bolNumber}</td>
                  <td className="p-1 border border-slate-200">{c.destination}</td>
                  <td className="p-1 border border-slate-200">{c.port}</td>
                  <td className="p-1 border border-slate-200 text-center font-medium">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Truck & Driver Activity */}
        <div className="mb-6 break-inside-avoid">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" /> Truck & Driver Border Dispatches ({truckActivity.length})
          </h3>
          <table className="w-full border-collapse border border-slate-200 text-[9.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-left font-semibold">
                <th className="p-1 border border-slate-200">Afghan Truck Plate</th>
                <th className="p-1 border border-slate-200">Driver Name</th>
                <th className="p-1 border border-slate-200">Father Name</th>
                <th className="p-1 border border-slate-200">Phone</th>
                <th className="p-1 border border-slate-200">Border Crossing</th>
                <th className="p-1 border border-slate-200">BOL #</th>
                <th className="p-1 border border-slate-200 text-right">Rent</th>
              </tr>
            </thead>
            <tbody>
              {truckActivity.slice(0, 15).map((t, i) => (
                <tr key={i} className="hover:bg-slate-50 break-inside-avoid">
                  <td className="p-1 border border-slate-200 font-mono font-bold text-slate-900">{t.truckNumber}</td>
                  <td className="p-1 border border-slate-200 font-medium">{t.driverName}</td>
                  <td className="p-1 border border-slate-200 text-slate-600">{t.driverFatherName}</td>
                  <td className="p-1 border border-slate-200 text-slate-600">{t.driverPhone}</td>
                  <td className="p-1 border border-slate-200">{t.borderCrossing}</td>
                  <td className="p-1 border border-slate-200 font-mono">{t.bolNumber}</td>
                  <td className="p-1 border border-slate-200 text-right font-mono">
                    {t.rentAmount > 0 ? `${t.rentAmount.toLocaleString()} ${t.rentCurrency}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Document Checklist */}
        <div className="break-inside-avoid">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Document Clearance Checklist
          </h3>
          <table className="w-full border-collapse border border-slate-200 text-[9px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-left font-semibold">
                <th className="p-1 border border-slate-200">BOL #</th>
                <th className="p-1 border border-slate-200">Shipper</th>
                <th className="p-1 border border-slate-200 text-center">BOL</th>
                <th className="p-1 border border-slate-200 text-center">Comm. Inv</th>
                <th className="p-1 border border-slate-200 text-center">Packing List</th>
                <th className="p-1 border border-slate-200 text-center">Transit Paper</th>
                <th className="p-1 border border-slate-200 text-center">Phyto Cert</th>
                <th className="p-1 border border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {documentStatusSummary.slice(0, 10).map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 break-inside-avoid">
                  <td className="p-1 border border-slate-200 font-mono font-bold">{d.bolNumber}</td>
                  <td className="p-1 border border-slate-200 truncate max-w-[120px]">{d.shipperName}</td>
                  <td className="p-1 border border-slate-200 text-center">{d.hasBol ? "✓" : "—"}</td>
                  <td className="p-1 border border-slate-200 text-center">{d.hasCommercialInvoice ? "✓" : "—"}</td>
                  <td className="p-1 border border-slate-200 text-center">{d.hasPackingList ? "✓" : "—"}</td>
                  <td className="p-1 border border-slate-200 text-center">{d.hasTransitPaper ? "✓" : "—"}</td>
                  <td className="p-1 border border-slate-200 text-center">{d.hasPhyto ? "✓" : "—"}</td>
                  <td className="p-1 border border-slate-200 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      d.isComplete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {d.isComplete ? "COMPLETE" : `${d.missingCount} PENDING`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL SIGN-OFF & OPERATIONAL REMARKS */}
      {/* ========================================================================= */}
      <div className="break-inside-avoid pt-2">
        {metadata.notes && (
          <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6">
            <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider mb-1">
              Operations Manager Remarks
            </h4>
            <p className="text-[10px] text-slate-700 whitespace-pre-line">{metadata.notes}</p>
          </div>
        )}

        {/* Sign-off boxes */}
        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-center">
          <div>
            <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
            <p className="text-[9px] font-bold uppercase text-slate-700">Prepared By</p>
            <p className="text-[8px] text-slate-500">{metadata.generatedBy}</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
            <p className="text-[9px] font-bold uppercase text-slate-700">Operations Manager</p>
            <p className="text-[8px] text-slate-500">Border & Port Transit Coordinator</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
            <p className="text-[9px] font-bold uppercase text-slate-700">Managing Director / Executive Approval</p>
            <p className="text-[8px] text-slate-500">AQ Companies</p>
          </div>
        </div>

        {/* Print Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
          <span>AQ Companies • Cross-Border Multi-Modal Logistics System</span>
          <span>Official Operational Record • Non-Negotiable</span>
        </div>
      </div>
    </div>
  )
}
