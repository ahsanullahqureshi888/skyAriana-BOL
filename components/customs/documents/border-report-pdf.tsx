"use client"

import React from 'react'
import Image from 'next/image'
import { BorderOperationRecord } from '@/lib/types/customs-border'
import { Printer, X } from 'lucide-react'

interface BorderReportPdfProps {
  operation: BorderOperationRecord
  onClose?: () => void
}

export function BorderReportPdf({ operation, onClose }: BorderReportPdfProps) {
  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto shadow-lg border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-4 text-xs font-sans">
      {/* Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Border & Customs Operations Report</span>
          <span className="text-slate-400 font-mono text-[11px]">({operation.operationNumber})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report (A4)
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
              International Multimodal Logistics • Customs & Transit Operations
            </p>
            <p className="text-[10px] text-slate-400">
              Kabul • Kandahar • Herat • Islam Qala • Bandar Abbas • Dubai
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-sm uppercase tracking-wider mb-1">
            BORDER & CUSTOMS OPERATIONS REPORT
          </div>
          <div className="text-[11px] font-bold text-slate-800 font-mono">
            REF: {operation.operationNumber}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            BOL: {operation.bolNumber}
          </div>
          <div className="text-[10px] text-indigo-700 font-bold uppercase">
            Status: {operation.status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Bilingual Subtitle */}
      <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded mb-4 text-[11px]">
        <span className="font-semibold text-slate-700">Official Customs Clearance, Border Crossing & Transit Verification Sheet</span>
        <span className="font-bold text-slate-800" dir="rtl">گزارش رسمی تشریفات گمرکی، ترانزیت و عبور از مرز</span>
      </div>

      {/* =================================================================== */}
      {/* 2. SHIPMENT & BORDER CORRIDOR SPECIFICATIONS                         */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border border-slate-200">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            BORDER CROSSING & LOCATION:
          </span>
          <div className="font-bold text-xs text-slate-900">{operation.borderLocationName}</div>
          <div className="text-slate-600 mt-1">
            <strong>Route Corridor:</strong> {operation.routeLeg || 'International Transit Highway'}
          </div>
          <div className="text-slate-600 text-[10px] mt-0.5">
            Crossing Direction: <strong className="text-indigo-800">{operation.countryFrom} $\rightarrow$ {operation.countryTo}</strong>
          </div>
        </div>

        <div className="border-l border-slate-200 pl-4 space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            OFFICIAL CUSTOMS & TRANSIT IDENTIFIERS:
          </span>
          <div className="text-xs">
            <strong className="text-slate-700">Declaration Number:</strong>{' '}
            <span className="font-mono font-bold text-slate-900">{operation.declarationNumber || 'Direct Clearance'}</span>
          </div>
          {operation.transitReference && (
            <div className="text-xs text-emerald-800 font-semibold">
              Transit Carnet / Paper: <span className="font-mono">{operation.transitReference}</span>
            </div>
          )}
          {operation.customsReference && (
            <div className="text-[10px] text-slate-500">
              Customs Office Ref: <span className="font-mono">{operation.customsReference}</span>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. ASSIGNED TRANSPORT & DRIVER IDENTIFICATION                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-white border border-slate-200 rounded">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Transport Truck</span>
          <span className="font-bold text-slate-900 font-mono text-xs">
            {operation.truckPlate}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver Name</span>
          <span className="font-bold text-slate-800 text-xs">
            {operation.driverName}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver Contact</span>
          <span className="font-mono text-slate-700 text-xs">
            {operation.driverPhone || '—'}
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. CHRONOLOGICAL BORDER TIMELINE STAMPS                            */}
      {/* =================================================================== */}
      <div className="border border-slate-200 rounded overflow-hidden mb-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
              <th className="p-2">Border Operational Milestone</th>
              <th className="p-2">Location / Terminal Gate</th>
              <th className="p-2 text-center">Border Side</th>
              <th className="p-2">Date & Time Verified</th>
              <th className="p-2">Authorized Officer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            <tr>
              <td className="p-2 font-bold text-slate-900">1. Physical Arrival at Border</td>
              <td className="p-2 text-slate-700">{operation.borderLocationName} (Arrival Gate)</td>
              <td className="p-2 text-center font-mono font-bold text-slate-700">Side A ({operation.countryFrom})</td>
              <td className="p-2 font-mono text-slate-800">
                {operation.arrivalDate ? new Date(operation.arrivalDate).toLocaleString() : 'Pending'}
              </td>
              <td className="p-2 text-slate-600">Terminal Gate Attendant</td>
            </tr>
            <tr>
              <td className="p-2 font-bold text-slate-900">2. Customs Terminal Entry</td>
              <td className="p-2 text-slate-700">Customs Clearance & Inspection Buffer</td>
              <td className="p-2 text-center font-mono font-bold text-slate-700">Side A ({operation.countryFrom})</td>
              <td className="p-2 font-mono text-slate-800">
                {operation.customsEntryDate ? new Date(operation.customsEntryDate).toLocaleString() : 'In Queue'}
              </td>
              <td className="p-2 text-slate-600">Customs Tally Clerk</td>
            </tr>
            <tr>
              <td className="p-2 font-bold text-slate-900">3. Official Customs Clearance</td>
              <td className="p-2 text-slate-700">Customs Valuation & Duty Office</td>
              <td className="p-2 text-center font-mono font-bold text-slate-700">Side A ({operation.countryFrom})</td>
              <td className="p-2 font-mono text-slate-800">
                {operation.clearanceDate ? new Date(operation.clearanceDate).toLocaleString() : 'Under Processing'}
              </td>
              <td className="p-2 text-slate-600">{operation.agentName || 'Clearing Agent'}</td>
            </tr>
            <tr>
              <td className="p-2 font-bold text-slate-900">4. Physical Border Crossing / Exit</td>
              <td className="p-2 text-slate-700">International Zero Line Barrier Gate</td>
              <td className="p-2 text-center font-mono font-bold text-slate-700">Side B ({operation.countryTo})</td>
              <td className="p-2 font-mono text-slate-800">
                {operation.borderExitDate ? new Date(operation.borderExitDate).toLocaleString() : 'Awaiting Exit Queue'}
              </td>
              <td className="p-2 text-slate-600">Border Police / Security Gate</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 5. CLEARING AGENT & DOCUMENTS CHECKLIST                             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Verified Shipping & Customs Documents
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Commercial Invoice</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Packing List</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Customs Declaration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Phytosanitary Certificate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Certificate of Origin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>International CMR Waybill</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Customs Broker & Handling Remarks
          </span>
          <p className="text-[10px] text-slate-700 leading-relaxed">
            {operation.customerSafeNotes || 'All mandatory Afghan export documents verified and stamped. Cargo cleared for transit onward to destination.'}
          </p>
          {operation.agentName && (
            <div className="mt-2 text-[10px] text-slate-500">
              Assigned Broker: <strong className="text-slate-800">{operation.agentName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 6. SIGNATURES & STAMPS                                             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center">
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Clearing Customs Agent</span>
          <span className="text-[9px] text-slate-500">Stamp & Clearance Confirmation</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Transport Driver</span>
          <span className="text-[9px] text-slate-500">Signature & Document Acceptance</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Border Operations Manager</span>
          <span className="text-[9px] text-slate-500">Sky Ariana Limited Authorized Signatory</span>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
        This document constitutes an operational record of cross-border customs handling and verification under Sky Ariana Limited Multimodal logistics regulations.
      </div>
    </div>
  )
}
