"use client"

import React from 'react'
import Image from 'next/image'
import { DispatchEventRecord } from '@/lib/types/warehouse-cargo'
import { Printer, X } from 'lucide-react'

interface WarehouseDispatchPdfProps {
  dispatch: DispatchEventRecord
  onClose?: () => void
}

export function WarehouseDispatchPdf({ dispatch, onClose }: WarehouseDispatchPdfProps) {
  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto shadow-lg border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-4 text-xs font-sans">
      {/* Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Warehouse Dispatch Note / Exit Pass</span>
          <span className="text-slate-400 font-mono text-[11px]">({dispatch.dispatchNumber})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Gate Pass (A4)
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. HEADER & BRANDING                                                */}
      {/* =================================================================== */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Sky Ariana Limited"
            width={48}
            height={48}
            className="object-contain"
          />
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              SKY ARIANA LIMITED
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
              International Multimodal Logistics • Warehouse & Cargo Control
            </p>
            <p className="text-[10px] text-slate-400">
              Kabul • Kandahar • Herat • Islam Qala • Bandar Abbas • Dubai
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-emerald-800 text-white font-black text-xs px-3 py-1 rounded-sm uppercase tracking-wider mb-1">
            WAREHOUSE GATE EXIT PASS & DISPATCH NOTE
          </div>
          <div className="text-[11px] font-bold text-slate-800 font-mono">
            DISPATCH REF: {dispatch.dispatchNumber}
          </div>
          <div className="text-[10px] text-slate-500">
            Exit Date: {new Date(dispatch.dispatchDate).toLocaleDateString()} {new Date(dispatch.dispatchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[10px] text-blue-700 font-bold">
            Status: RELEASED & DEPARTED
          </div>
        </div>
      </div>

      {/* Bilingual Subtitle */}
      <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded mb-4 text-[11px]">
        <span className="font-semibold text-slate-700">Official Physical Cargo Dispatch Authorization & Exit Gate Pass</span>
        <span className="font-bold text-slate-800" dir="rtl">حواله رسمی خروج کالا و مجوز ترخیص دروازه انبار</span>
      </div>

      {/* =================================================================== */}
      {/* 2. DISPATCH & DESTINATION SPECIFICATIONS                           */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border border-slate-200">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            ORIGIN WAREHOUSE FACILITY:
          </span>
          <div className="font-bold text-xs text-slate-900">{dispatch.warehouseName}</div>
          <div className="text-slate-600 mt-1">
            <strong>Final Destination:</strong>{' '}
            <span className="font-semibold text-blue-800">{dispatch.destination}</span>
          </div>
          <div className="text-slate-500 text-[10px] mt-0.5">
            Facility ID: {dispatch.warehouseLocationId}
          </div>
        </div>

        <div className="border-l border-slate-200 pl-4 space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            SHIPPING ORDER & CROSS-REFERENCES:
          </span>
          <div className="text-xs">
            <strong className="text-slate-700">Bill of Lading (BOL):</strong>{' '}
            <span className="font-mono font-bold text-slate-900">{dispatch.bolNumber}</span>
          </div>
          {dispatch.shipmentId && (
            <div className="text-[10px] text-slate-600">
              Shipment ID: <span className="font-mono">{dispatch.shipmentId}</span>
            </div>
          )}
          {dispatch.containerNumber && (
            <div className="text-xs text-indigo-700 font-bold mt-1">
              Container No: <span className="font-mono">{dispatch.containerNumber}</span>
            </div>
          )}
          {dispatch.sealNumber && (
            <div className="text-xs text-emerald-700 font-bold">
              High-Security Seal: <span className="font-mono">{dispatch.sealNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. ASSIGNED TRANSPORT & DRIVER IDENTIFICATION                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-white border border-slate-200 rounded">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Truck / Plate</span>
          <span className="font-bold text-slate-900 font-mono text-xs">
            {dispatch.truckPlate}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver Name</span>
          <span className="font-bold text-slate-800 text-xs">
            {dispatch.driverName}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver Phone</span>
          <span className="font-mono text-slate-700 text-xs">
            {dispatch.driverPhone || '—'}
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. DISPATCH QUANTITY & WEIGHT SPECIFICATIONS                       */}
      {/* =================================================================== */}
      <div className="border border-slate-200 rounded overflow-hidden mb-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
              <th className="p-2">Description of Outbound Goods</th>
              <th className="p-2 text-right">Packages Dispatched</th>
              <th className="p-2 text-right">Gross Mass / Weight (KG)</th>
              <th className="p-2 text-center">Container / Equipment</th>
              <th className="p-2 text-center">Security Bolt Seal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            <tr>
              <td className="p-2 font-bold text-slate-900">
                Commercial Export Cargo Lot (Reconciled)
                <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                  BOL: {dispatch.bolNumber} | Destination: {dispatch.destination}
                </span>
              </td>
              <td className="p-2 text-right font-black text-slate-900 text-sm">
                {dispatch.packagesDispatched.toLocaleString()}
              </td>
              <td className="p-2 text-right font-mono font-black text-slate-900 text-sm">
                {dispatch.grossWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1 })} KG
              </td>
              <td className="p-2 text-center font-mono font-bold text-slate-800">
                {dispatch.containerNumber || 'Direct Truck'}
              </td>
              <td className="p-2 text-center font-mono font-black text-emerald-700">
                {dispatch.sealNumber || 'N/A'}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
              <td className="p-2 text-slate-700 uppercase">
                Total Authorized Gate Exit:
              </td>
              <td className="p-2 text-right font-black text-slate-900 text-sm">
                {dispatch.packagesDispatched.toLocaleString()} Packages
              </td>
              <td className="p-2 text-right font-mono font-black text-slate-950 text-sm">
                {dispatch.grossWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1 })} KG
              </td>
              <td colSpan={2} className="p-2 text-center text-slate-500 text-[10px]">
                Verified Weighbridge Gross Weight (VGM)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 5. DOCUMENTS HANDED OVER & RELEASE NOTES                           */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Original Shipping Documents Transferred to Driver
          </span>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {dispatch.documentsHandedOver?.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="font-semibold text-slate-800">{doc}</span>
              </div>
            )) || (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>CMR Waybill</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Original BOL Copy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Weighbridge Slip</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Commercial Packing List</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Dispatcher Instructions & Security Notes
          </span>
          <p className="text-[10px] text-slate-700 leading-relaxed">
            {dispatch.notes || 'Cargo and security seals verified intact prior to departure. Driver instructed to transit directly to destination border crossing without breaking seal.'}
          </p>
          <div className="mt-2 text-[10px] text-slate-500">
            Released by: <strong className="text-slate-800">{dispatch.releasedBy}</strong>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 6. SIGNATURES & EXIT RECONCILIATION                                */}
      {/* =================================================================== */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center">
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Warehouse Dispatch Officer</span>
          <span className="text-[9px] text-slate-500">Cargo Release Authorization</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Gate Security Officer</span>
          <span className="text-[9px] text-slate-500">Seal Verification & Gate Open</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Receiving Driver</span>
          <span className="text-[9px] text-slate-500">Seal & Cargo Acknowledgment</span>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
        This Gate Exit Pass is an official document of Sky Ariana Limited. Driver must present this pass upon request at customs border posts and terminal weighbridges.
      </div>
    </div>
  )
}
