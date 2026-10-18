'use client'

import React from 'react'
import {
  AirShipmentBoardItem,
  FlightRecord,
  OffloadRecord,
  AirSummaryKpi,
} from '@/lib/types/air-freight'

interface AirOperationsReportPdfProps {
  shipments: AirShipmentBoardItem[]
  flights: FlightRecord[]
  offloads: OffloadRecord[]
  kpis: AirSummaryKpi
  printedBy?: string
}

export function AirOperationsReportPdf({
  shipments,
  flights,
  offloads,
  kpis,
  printedBy = 'Air Operations Control',
}: AirOperationsReportPdfProps) {
  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white text-slate-900 font-sans p-8 max-w-5xl mx-auto shadow-lg print:shadow-none print:p-4 print:max-w-none text-xs">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
            SKY ARIANA LIMITED
          </h1>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            AIR FREIGHT & AWB OPERATIONS MASTER REPORT • راپور عمومی کارګوی هوایی
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900">AIR OPERATIONS CENTER</p>
          <p className="text-[11px] text-slate-600 mt-1">Generated: {printDate}</p>
          <p className="text-[11px] text-slate-600">Officer: {printedBy}</p>
        </div>
      </div>

      {/* KPI Summary Block */}
      <div className="grid grid-cols-4 gap-3 mb-6 text-center">
        <div className="border border-slate-300 p-3 rounded bg-slate-50">
          <span className="text-[10px] uppercase text-slate-500 font-bold block">Active Air Shipments</span>
          <span className="text-lg font-bold text-slate-900 font-mono">{kpis.activeAirShipments}</span>
        </div>
        <div className="border border-slate-300 p-3 rounded bg-slate-50">
          <span className="text-[10px] uppercase text-slate-500 font-bold block">Departing Today</span>
          <span className="text-lg font-bold text-sky-700 font-mono">{kpis.departingToday}</span>
        </div>
        <div className="border border-slate-300 p-3 rounded bg-slate-50">
          <span className="text-[10px] uppercase text-slate-500 font-bold block">Cargo Offloads</span>
          <span className="text-lg font-bold text-rose-700 font-mono">{kpis.offloaded}</span>
        </div>
        <div className="border border-slate-300 p-3 rounded bg-slate-50">
          <span className="text-[10px] uppercase text-slate-500 font-bold block">Release Pending</span>
          <span className="text-lg font-bold text-amber-700 font-mono">{kpis.releasePending}</span>
        </div>
      </div>

      {/* Active Air Shipments Table */}
      <div className="border border-slate-300 rounded mb-6 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-300">
          Active Air Cargo Manifest ({shipments.length})
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600 uppercase">
              <th className="py-2 px-3">Booking Ref</th>
              <th className="py-2 px-3">MAWB #</th>
              <th className="py-2 px-3">Carrier</th>
              <th className="py-2 px-3">Route</th>
              <th className="py-2 px-3">Flight / Date</th>
              <th className="py-2 px-3">Pkgs / Chrg Wt</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {shipments.map((item) => (
              <tr key={item.id} className="text-slate-800">
                <td className="py-2 px-3 font-mono font-bold">{item.bookingReference}</td>
                <td className="py-2 px-3 font-mono text-sky-800">{item.mawbNumber}</td>
                <td className="py-2 px-3">{item.airlineName}</td>
                <td className="py-2 px-3 font-mono">{item.originAirportIata} ➡️ {item.destinationAirportIata}</td>
                <td className="py-2 px-3 font-mono text-[11px]">{item.currentFlightNumber} ({item.flightDate})</td>
                <td className="py-2 px-3 font-mono">{item.packagesCount} pcs | {item.chargeableWeightKg} kg</td>
                <td className="py-2 px-3 font-semibold">{item.shipmentStatus.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Offloads / Irregularities */}
      {offloads.length > 0 && (
        <div className="border border-rose-300 rounded mb-6 overflow-hidden bg-rose-50/30">
          <div className="bg-rose-100 px-4 py-2 font-bold text-rose-900 uppercase tracking-wider text-[11px] border-b border-rose-300">
            Cargo Offload & Irregularity Log ({offloads.length})
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rose-200 text-[10px] text-rose-800 uppercase">
                <th className="py-2 px-3">Booking</th>
                <th className="py-2 px-3">Offloaded Flight</th>
                <th className="py-2 px-3">Station</th>
                <th className="py-2 px-3">Reason Category</th>
                <th className="py-2 px-3">Rebooked Flight</th>
                <th className="py-2 px-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-200">
              {offloads.map((o) => (
                <tr key={o.id} className="text-slate-900">
                  <td className="py-2 px-3 font-mono font-bold">{o.bookingReference}</td>
                  <td className="py-2 px-3 font-mono text-rose-700">{o.originalFlightNumber}</td>
                  <td className="py-2 px-3 font-mono">{o.offloadAirportIata}</td>
                  <td className="py-2 px-3">{o.reason.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-3 font-mono text-emerald-800">{o.rebookedFlightNumber || 'Pending'}</td>
                  <td className="py-2 px-3">{o.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Sign-off */}
      <div className="flex justify-between items-center pt-6 border-t-2 border-slate-300 text-slate-500 text-[11px]">
        <span>Sky Ariana Limited • Air Cargo Control Division</span>
        <span>Strict Accounting & Aviation Invariance Certified</span>
      </div>
    </div>
  )
}
