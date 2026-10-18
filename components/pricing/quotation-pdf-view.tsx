"use client"

import React from 'react'
import Image from 'next/image'
import { QuotationRecord } from '@/lib/types/freight-pricing'

interface QuotationPdfViewProps {
  quotation: QuotationRecord
  onClose?: () => void
}

export function QuotationPdfView({ quotation, onClose }: QuotationPdfViewProps) {
  const curr = quotation.currency || 'USD'

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto shadow-lg border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-4 text-xs">
      {/* =================================================================== */}
      {/* 1. HEADER & BRANDING                                                */}
      {/* =================================================================== */}
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
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
              International Multimodal Logistics & Freight Forwarding
            </p>
            <p className="text-[10px] text-slate-400">
              Kabul • Herat • Dubai • Bandar Abbas • Mumbai
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-black text-sm px-3 py-1 rounded-sm uppercase tracking-wider mb-1">
            FREIGHT QUOTATION
          </div>
          <div className="text-xs font-bold text-slate-800">
            Ref: {quotation.quotationNumber}
            {quotation.revision > 1 && <span className="text-blue-600 ml-1">(Rev. {quotation.revision})</span>}
          </div>
          <div className="text-[10px] text-slate-500">Date: {quotation.date}</div>
          <div className="text-[10px] text-slate-500 font-bold">
            Valid Until: <span className="text-rose-600">{quotation.validUntil}</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CUSTOMER & ROUTE SUMMARY                                         */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded border border-slate-200 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            QUOTED TO (CUSTOMER):
          </span>
          <div className="font-bold text-sm text-slate-900">{quotation.customerName}</div>
          {quotation.customerContact && (
            <div className="text-slate-600">Attn: {quotation.customerContact}</div>
          )}
          {quotation.customerPhone && (
            <div className="text-slate-600">Tel: {quotation.customerPhone}</div>
          )}
          {quotation.customerAddress && (
            <div className="text-slate-500 text-[11px] mt-0.5">{quotation.customerAddress}</div>
          )}
        </div>

        <div className="border-l border-slate-200 pl-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            SHIPMENT & ROUTE SPECIFICATIONS:
          </span>
          <div>
            <strong className="text-slate-700">Origin:</strong> {quotation.originName}
          </div>
          <div>
            <strong className="text-slate-700">Destination:</strong> {quotation.destinationName}
          </div>
          <div>
            <strong className="text-slate-700">Service Scope:</strong>{' '}
            <span className="font-semibold text-blue-700">{quotation.serviceType.replace('_', ' ')}</span>
          </div>
          <div>
            <strong className="text-slate-700">Equipment:</strong>{' '}
            <span className="font-bold">{quotation.containerQuantity} × {quotation.containerType}</span>
          </div>
          {quotation.temperature && (
            <div>
              <strong className="text-slate-700">Required Temp:</strong>{' '}
              <span className="font-bold text-indigo-700">{quotation.temperature}</span>
            </div>
          )}
          {quotation.commodity && (
            <div>
              <strong className="text-slate-700">Commodity:</strong> {quotation.commodity}
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. ITEMIZE PRICING TABLE (CUSTOMER-SAFE: ONLY SELLING RATES!)       */}
      {/* =================================================================== */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
          Agreed Freight Charges & Fees
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-200">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
            <tr>
              <th className="py-2 px-3 border-r border-slate-200">#</th>
              <th className="py-2 px-3 border-r border-slate-200">Service Description</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center">Qty</th>
              <th className="py-2 px-3 border-r border-slate-200 text-center">Unit</th>
              <th className="py-2 px-3 border-r border-slate-200 text-right">Unit Rate ({curr})</th>
              <th className="py-2 px-3 text-right">Total Amount ({curr})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {quotation.pricingLines.map((line, idx) => {
              const lineTotal = line.isOptional ? 0 : (line.sellAmount || 0) * (line.quantity || 1)
              return (
                <tr key={line.id || idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    {line.chargeName}
                    {line.isIncludedInFreight && (
                      <span className="ml-2 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        INCLUDED IN FREIGHT
                      </span>
                    )}
                    {line.isOptional && (
                      <span className="ml-2 px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">
                        OPTIONAL SERVICE
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">
                    {line.quantity}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-500 text-[10px]">
                    {line.unit.replace('_', ' ')}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">
                    {line.isIncludedInFreight ? 'Included' : line.sellAmount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {line.isIncludedInFreight ? '0.00' : lineTotal.toLocaleString()}
                  </td>
                </tr>
              )
            })}

            {/* Discount line if present */}
            {quotation.discountAmount > 0 && (
              <tr className="bg-emerald-50/50">
                <td colSpan={5} className="py-2 px-3 text-right font-semibold text-emerald-800 border-r border-slate-200">
                  Commercial Discount ({quotation.discountType})
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                  - {quotation.discountAmount.toLocaleString()}
                </td>
              </tr>
            )}

            {/* Grand Total */}
            <tr className="bg-slate-900 text-white font-bold text-sm">
              <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider">
                TOTAL QUOTED FREIGHT ({curr})
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-base">
                {curr} {quotation.totalSellPrice.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =================================================================== */}
      {/* 4. INCLUDED & EXCLUDED SERVICES                                     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-[11px]">
        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded">
          <span className="font-bold text-emerald-900 uppercase block mb-1">
            ✓ INCLUDED IN THIS QUOTATION:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
            {quotation.includedServices.length > 0 ? (
              quotation.includedServices.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <>
                <li>Standard Carriage & Transit Insurance Bond</li>
                <li>Documentation and Port Release Fees</li>
              </>
            )}
          </ul>
        </div>

        <div className="p-3 bg-rose-50/60 border border-rose-200 rounded">
          <span className="font-bold text-rose-900 uppercase block mb-1">
            ✕ EXCLUDED FROM THIS QUOTATION:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-rose-800">
            {quotation.excludedServices.length > 0 ? (
              quotation.excludedServices.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <>
                <li>Afghanistan Destination Import Customs Duties & Taxes</li>
                <li>Terminal storage beyond free time allowance</li>
                <li>Cargo physical inspection charges by customs authorities</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. STANDARD TERMS & SIGNATURE BLOCK                                 */}
      {/* =================================================================== */}
      <div className="space-y-2 border-t border-slate-200 pt-4 text-[10px] text-slate-500">
        <div className="font-bold text-slate-700 uppercase">Standard Quotation Terms & Conditions:</div>
        <ul className="list-disc list-inside space-y-0.5">
          {quotation.terms.map((term, i) => (
            <li key={i}>{term}</li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
          <div>
            <div className="border-t border-slate-300 pt-2 font-bold text-slate-800">
              PREPARED BY: SKY ARIANA LIMITED
            </div>
            <div className="text-[10px] text-slate-400">Logistics Pricing Desk</div>
          </div>
          <div>
            <div className="border-t border-slate-300 pt-2 font-bold text-slate-800">
              ACCEPTED BY CUSTOMER
            </div>
            <div className="text-[10px] text-slate-400">Authorized Signature & Stamp</div>
          </div>
        </div>
      </div>

      {/* No-print Close / Print helper buttons */}
      <div className="mt-8 flex justify-end gap-2 no-print">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow"
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  )
}
