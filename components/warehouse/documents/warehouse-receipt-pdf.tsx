"use client"

import React from 'react'
import Image from 'next/image'
import { WarehouseReceiptRecord } from '@/lib/types/warehouse-cargo'
import { Printer, X } from 'lucide-react'

interface WarehouseReceiptPdfProps {
  receipt: WarehouseReceiptRecord
  onClose?: () => void
}

export function WarehouseReceiptPdf({ receipt, onClose }: WarehouseReceiptPdfProps) {
  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto shadow-lg border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-4 text-xs font-sans">
      {/* Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Warehouse Cargo Receipt Preview</span>
          <span className="text-slate-400 font-mono text-[11px]">({receipt.receiptNumber})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt (A4)
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
          <div className="inline-block bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-sm uppercase tracking-wider mb-1">
            OFFICIAL WAREHOUSE CARGO RECEIPT
          </div>
          <div className="text-[11px] font-bold text-slate-800 font-mono">
            WHR: {receipt.receiptNumber}
          </div>
          <div className="text-[10px] text-slate-500">
            Received: {new Date(receipt.receivedDate).toLocaleDateString()} {new Date(receipt.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold">
            Condition: {receipt.condition}
          </div>
        </div>
      </div>

      {/* Bilingual Subtitle */}
      <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded mb-4 text-[11px]">
        <span className="font-semibold text-slate-700">Official Non-Negotiable Cargo Receiving & Inward Tally Voucher</span>
        <span className="font-bold text-slate-800" dir="rtl">رسید رسمی تحویل و شمارش فیزیکی کالا در انبار</span>
      </div>

      {/* =================================================================== */}
      {/* 2. FACILITY & CUSTOMER DETAILS                                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border border-slate-200">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            RECEIVING FACILITY & LOCATION:
          </span>
          <div className="font-bold text-xs text-slate-900">{receipt.warehouseName}</div>
          <div className="text-slate-600 mt-0.5">
            <strong>Storage Staging:</strong> {receipt.storageAreaName || 'Zone A — Main Bay'}
          </div>
          {receipt.linkedBolNumber && (
            <div className="text-blue-700 font-medium mt-1">
              <strong>Linked BOL:</strong> {receipt.linkedBolNumber}
            </div>
          )}
          {receipt.linkedShipmentId && (
            <div className="text-slate-500 text-[10px]">
              Shipment ID: {receipt.linkedShipmentId}
            </div>
          )}
        </div>

        <div className="border-l border-slate-200 pl-4 space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            DEPOSITOR / SHIPPER / CLIENT:
          </span>
          <div className="font-bold text-xs text-slate-900">{receipt.customerName}</div>
          <div className="text-slate-600">
            <strong>Shipper:</strong> {receipt.shipperName}
          </div>
          {receipt.deliveringParty && (
            <div className="text-slate-500">
              <strong>Delivering Party:</strong> {receipt.deliveringParty}
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. INBOUND TRANSPORT / VEHICLE                                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-white border border-slate-200 rounded">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Inbound Vehicle Plate</span>
          <span className="font-bold text-slate-900 font-mono text-xs">
            {receipt.deliveringTruckPlate || 'Direct Delivery'}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Delivering Driver</span>
          <span className="font-semibold text-slate-800">
            {receipt.deliveringDriverName || 'Not recorded'}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver Phone</span>
          <span className="font-mono text-slate-700">
            {receipt.deliveringDriverPhone || '—'}
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. CARGO TALLY & WEIGHT SPECIFICATIONS                              */}
      {/* =================================================================== */}
      <div className="border border-slate-200 rounded overflow-hidden mb-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
              <th className="p-2">Item / Commodity</th>
              <th className="p-2 text-center">Package Type</th>
              <th className="p-2 text-right">Package Count</th>
              <th className="p-2 text-right">Net Weight (KG)</th>
              <th className="p-2 text-right">Gross Weight (KG)</th>
              <th className="p-2 text-center">Physical Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            <tr>
              <td className="p-2 font-bold text-slate-900">
                {receipt.commodity}
                <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                  Standard Afghan export grade specifications
                </span>
              </td>
              <td className="p-2 text-center font-semibold text-slate-700">
                {receipt.packageType}
              </td>
              <td className="p-2 text-right font-black text-slate-900 text-sm">
                {receipt.totalPackages.toLocaleString()}
              </td>
              <td className="p-2 text-right font-mono font-medium text-slate-700">
                {receipt.totalNetWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1 })}
              </td>
              <td className="p-2 text-right font-mono font-black text-slate-900">
                {receipt.totalGrossWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1 })}
              </td>
              <td className="p-2 text-center">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {receipt.condition}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
              <td colSpan={2} className="p-2 text-slate-700 uppercase">
                Total Intake Tally:
              </td>
              <td className="p-2 text-right font-black text-slate-900 text-sm">
                {receipt.totalPackages.toLocaleString()} {receipt.packageType}
              </td>
              <td className="p-2 text-right font-mono text-slate-800">
                {receipt.totalNetWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1 })} KG
              </td>
              <td className="p-2 text-right font-mono text-slate-950 font-black">
                {receipt.totalGrossWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1 })} KG
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 5. RECEIVING INSPECTION CHECKLIST & NOTES                            */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Inward Cargo Verification Checklist
          </span>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Count Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Weighbridge Slip Matched</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Condition & Odor Free</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Export Marks Checked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Waybill Received</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Storage Assigned</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Warehouse Remarks & Instructions
          </span>
          <p className="text-[10px] text-slate-700 leading-relaxed">
            {receipt.customerSafeNotes || receipt.internalNotes || 'All cartons received in good merchantable order. Stored in dry ventilated export staging area pending container stuffing.'}
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 6. SIGNATURES & RECONCILIATION                                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center">
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Delivering Carrier / Driver</span>
          <span className="text-[9px] text-slate-500">Name, Signature & Stamp</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Warehouse Tally Clerk</span>
          <span className="text-[9px] text-slate-500">Physical Count & Scale Verification</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-12 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10px] block">Warehouse Manager</span>
          <span className="text-[9px] text-slate-500">Sky Ariana Limited Authorized Signatory</span>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
        This Warehouse Cargo Receipt confirms physical intake into custody. Goods held subject to standard multimodal warehousing & forwarding regulations.
      </div>
    </div>
  )
}
