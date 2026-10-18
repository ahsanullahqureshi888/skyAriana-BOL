'use client'

import React from 'react'
import {
  OceanShipmentBoardItem,
  VoyageRecord,
  TransshipmentConnection,
  RolloverRecord,
} from '@/lib/types/ocean-vessel'

interface OceanOperationsReportPdfProps {
  shipments: OceanShipmentBoardItem[]
  voyages: VoyageRecord[]
  transshipments: TransshipmentConnection[]
  rollovers: RolloverRecord[]
  generatedBy?: string
}

export function OceanOperationsReportPdf({
  shipments,
  voyages,
  transshipments,
  rollovers,
  generatedBy = 'Operations Dispatcher',
}: OceanOperationsReportPdfProps) {
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
            OCEAN FREIGHT OPERATIONS CONTROL REPORT • راپور عملیات ترانسپورت بحری
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Fleet Schedule • Voyages • Transshipment Connections • Container Tracking
          </p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-mono px-3 py-1 text-xs font-bold rounded">
            REPORT REF: SA-OCN-{Date.now().toString().slice(-6)}
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Generated: {printDate}</p>
          <p className="text-[11px] text-slate-600">Officer: {generatedBy}</p>
        </div>
      </div>

      {/* Summary KPI Cards (Print Style) */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Shipments</div>
          <div className="text-lg font-black text-slate-900">{shipments.length}</div>
        </div>
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Voyages</div>
          <div className="text-lg font-black text-slate-900">{voyages.length}</div>
        </div>
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Transshipment Hubs</div>
          <div className="text-lg font-black text-slate-900">{transshipments.length}</div>
        </div>
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Rollover Exceptions</div>
          <div className="text-lg font-black text-slate-900">{rollovers.length}</div>
        </div>
      </div>

      {/* Section 1: Active Ocean Shipments */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-200 px-3 py-1.5 rounded-t border-b border-slate-300 text-slate-800">
          1. Active Sea-Freight Shipments & Bill of Lading Manifest
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border border-slate-300 p-1.5 text-left">BOL Number</th>
              <th className="border border-slate-300 p-1.5 text-left">Booking / Carrier</th>
              <th className="border border-slate-300 p-1.5 text-left">Vessel / Voyage</th>
              <th className="border border-slate-300 p-1.5 text-left">Route (POL → POD)</th>
              <th className="border border-slate-300 p-1.5 text-left">ETD / ETA</th>
              <th className="border border-slate-300 p-1.5 text-center">Containers</th>
              <th className="border border-slate-300 p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="border border-slate-300 p-1.5 font-mono font-bold">{s.bolNumber}</td>
                <td className="border border-slate-300 p-1.5">
                  <div className="font-semibold">{s.bookingNumber}</div>
                  <div className="text-[10px] text-slate-500">{s.carrierName}</div>
                </td>
                <td className="border border-slate-300 p-1.5">
                  <div>{s.currentVesselName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Voy: {s.currentVoyageNumber}</div>
                </td>
                <td className="border border-slate-300 p-1.5">
                  {s.pol} → {s.pod}
                </td>
                <td className="border border-slate-300 p-1.5">
                  <div>ETD: {new Date(s.etd).toLocaleDateString('en-GB')}</div>
                  <div>ETA: {new Date(s.eta).toLocaleDateString('en-GB')}</div>
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono font-medium">
                  {s.containerNumbers.length}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold">
                  {s.oceanStatus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 2: Transshipment Connections */}
      {transshipments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-200 px-3 py-1.5 rounded-t border-b border-slate-300 text-slate-800">
            2. Transshipment Connections & Hub Dwell Analysis
          </h2>
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 p-1.5 text-left">Hub Port</th>
                <th className="border border-slate-300 p-1.5 text-left">Inbound Feeder Vessel</th>
                <th className="border border-slate-300 p-1.5 text-left">Outbound Mother Vessel</th>
                <th className="border border-slate-300 p-1.5 text-center">Dwell Time</th>
                <th className="border border-slate-300 p-1.5 text-center">Connection Status</th>
              </tr>
            </thead>
            <tbody>
              {transshipments.map((ts) => (
                <tr key={ts.id}>
                  <td className="border border-slate-300 p-1.5 font-bold">{ts.transshipmentPortName}</td>
                  <td className="border border-slate-300 p-1.5">
                    {ts.incomingVesselName} (Voy: {ts.incomingVoyageNumber})
                  </td>
                  <td className="border border-slate-300 p-1.5">
                    {ts.outgoingVesselName || 'TBA'} {ts.outgoingVoyageNumber ? `(Voy: ${ts.outgoingVoyageNumber})` : ''}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">
                    {ts.dwellHours !== undefined ? `${ts.dwellHours} hrs` : 'N/A'}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold">
                    {ts.connectionStatus.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signatures Footer */}
      <div className="mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1" />
          <div className="font-bold text-slate-900">Ocean Freight Coordinator</div>
          <div className="text-[10px] text-slate-500">مسوول هماهنگی ترانسپورت بحری</div>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1" />
          <div className="font-bold text-slate-900">Documentation & BL Lead</div>
          <div className="text-[10px] text-slate-500">مدیر اسناد و بارنامه بین‌المللی</div>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1" />
          <div className="font-bold text-slate-900">Head of Global Operations</div>
          <div className="text-[10px] text-slate-500">ریاست عمومی عملیات و ترانزیت</div>
        </div>
      </div>
    </div>
  )
}
