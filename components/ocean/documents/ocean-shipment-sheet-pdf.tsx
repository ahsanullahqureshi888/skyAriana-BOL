'use client'

import React from 'react'
import {
  OceanShipmentBoardItem,
  OceanLegRecord,
  ContainerOceanStatus,
  BLWorkflowRecord,
} from '@/lib/types/ocean-vessel'

interface OceanShipmentSheetPdfProps {
  shipment: OceanShipmentBoardItem
  legs: OceanLegRecord[]
  containers: ContainerOceanStatus[]
  blWorkflow?: BLWorkflowRecord
  printedBy?: string
}

export function OceanShipmentSheetPdf({
  shipment,
  legs,
  containers,
  blWorkflow,
  printedBy = 'Ocean Operations Desk',
}: OceanShipmentSheetPdfProps) {
  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white text-slate-900 font-sans p-8 max-w-4xl mx-auto shadow-lg print:shadow-none print:p-4 print:max-w-none text-xs">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
            SKY ARIANA LIMITED
          </h1>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            OCEAN FREIGHT SHIPMENT & DELIVERY RELEASE SHEET • تصدیق‌نامه انتقال بحری
          </p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-mono px-3 py-1 text-xs font-bold rounded">
            BOL: {shipment.bolNumber}
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Printed: {printDate}</p>
          <p className="text-[11px] text-slate-600">User: {printedBy}</p>
        </div>
      </div>

      {/* Shipment & Booking Overview */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded mb-6 bg-slate-50">
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Booking Details</div>
          <div className="font-semibold text-slate-800 text-sm">{shipment.bookingNumber}</div>
          <div className="text-slate-600 mt-1">
            Shipping Line: <span className="font-medium text-slate-900">{shipment.carrierName}</span>
          </div>
          <div className="text-slate-600">
            Shipper / Client: <span className="font-medium text-slate-900">{shipment.customerName}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Bill of Lading & Release</div>
          <div className="font-semibold text-slate-800 text-sm">
            BL Ref: {blWorkflow?.blNumber || 'Draft Status'}
          </div>
          <div className="text-slate-600 mt-1">
            BL Type: <span className="font-medium text-slate-900">{blWorkflow?.blType || 'OBL / SWB'}</span>
          </div>
          <div className="text-slate-600">
            Release Status:{' '}
            <span className="font-bold text-slate-900">
              {blWorkflow?.releaseStatus || 'Pending Authorization'}
            </span>
          </div>
        </div>
      </div>

      {/* Ocean Legs Rotation */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-200 px-3 py-1.5 rounded-t border-b border-slate-300 text-slate-800">
          Ocean Legs & Vessel Rotation
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border border-slate-300 p-1.5 text-left">Leg</th>
              <th className="border border-slate-300 p-1.5 text-left">Vessel & Voyage</th>
              <th className="border border-slate-300 p-1.5 text-left">Port of Loading (POL)</th>
              <th className="border border-slate-300 p-1.5 text-left">Port of Discharge (POD)</th>
              <th className="border border-slate-300 p-1.5 text-left">ETD / Dep</th>
              <th className="border border-slate-300 p-1.5 text-left">ETA / Arr</th>
              <th className="border border-slate-300 p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((l) => (
              <tr key={l.id}>
                <td className="border border-slate-300 p-1.5 font-bold">Leg {l.legNumber}</td>
                <td className="border border-slate-300 p-1.5 font-medium">
                  {l.vesselName} (Voy: {l.voyageNumber})
                </td>
                <td className="border border-slate-300 p-1.5">{l.polName}</td>
                <td className="border border-slate-300 p-1.5">{l.podName}</td>
                <td className="border border-slate-300 p-1.5">
                  {new Date(l.etd).toLocaleDateString('en-GB')}
                </td>
                <td className="border border-slate-300 p-1.5">
                  {new Date(l.eta).toLocaleDateString('en-GB')}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Container Manifest & Seals */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-200 px-3 py-1.5 rounded-t border-b border-slate-300 text-slate-800">
          Container Equipment & Seal Records
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border border-slate-300 p-1.5 text-left">Container Number</th>
              <th className="border border-slate-300 p-1.5 text-left">Bolt Seal Numbers</th>
              <th className="border border-slate-300 p-1.5 text-center">VGM Verified</th>
              <th className="border border-slate-300 p-1.5 text-center">Load Status</th>
              <th className="border border-slate-300 p-1.5 text-right">Gross Weight</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((c) => (
              <tr key={c.containerNumber}>
                <td className="border border-slate-300 p-1.5 font-mono font-bold">
                  {c.containerNumber}
                </td>
                <td className="border border-slate-300 p-1.5 font-mono">
                  {c.sealNumbers.join(', ') || 'N/A'}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-emerald-700">
                  {c.vgmVerified ? 'VERIFIED' : 'PENDING'}
                </td>
                <td className="border border-slate-300 p-1.5 text-center">
                  <span className="font-semibold">
                    {c.isLoadConfirmed ? 'LOAD CONFIRMED' : 'UNCONFIRMED'}
                  </span>
                </td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">
                  {c.vgmWeightKg ? `${c.vgmWeightKg.toLocaleString()} KG` : 'TBA'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3-Party Signatures */}
      <div className="mt-12 pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1" />
          <div className="font-bold text-slate-900">Shipping Line Agent / Broker</div>
          <div className="text-[10px] text-slate-500">نماینده خط بحری</div>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1" />
          <div className="font-bold text-slate-900">Consignee Receiving Agent</div>
          <div className="text-[10px] text-slate-500">نماینده تحویل‌گیرنده</div>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1" />
          <div className="font-bold text-slate-900">Sky Ariana Operations Lead</div>
          <div className="text-[10px] text-slate-500">مسوول عملیات شرکت اسکای آریانا</div>
        </div>
      </div>
    </div>
  )
}
