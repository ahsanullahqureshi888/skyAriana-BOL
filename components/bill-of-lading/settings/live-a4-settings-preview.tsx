"use client"

import React, { useState } from 'react'
import { Eye, Maximize2, Shield, Layers, FileText, Stamp, CheckCircle2 } from 'lucide-react'
import { BillOfLading, BillOfLadingFormData } from '@/lib/types/bill-of-lading'
import { BolDocumentSettings } from './bol-settings-types'

export interface LiveA4SettingsPreviewProps {
  settings: BolDocumentSettings
  activeWatermarkUrl: string
  activeWatermarkOpacity: number
  activeWatermarkLabel?: string
  currentBol?: Partial<BillOfLadingFormData> | null
  showStamp?: boolean
  className?: string
}

export function LiveA4SettingsPreview({
  settings,
  activeWatermarkUrl,
  activeWatermarkOpacity,
  activeWatermarkLabel,
  currentBol,
  showStamp = true,
  className = '',
}: LiveA4SettingsPreviewProps) {
  const [highlightWatermarkOnly, setHighlightWatermarkOnly] = useState(false)

  // Use current BOL if available; otherwise use safe template satisfying accounting invariance
  const bolNumber = currentBol?.bol_number || 'BOL-2026-AF9482'
  const issueDate = currentBol?.issue_date || '2026-09-29'
  const shipperName = currentBol?.shipper_name || 'AFGHAN DRY FRUIT PROCESSORS CORP'
  const shipperAddress = currentBol?.shipper_address || 'INDUSTRIAL PARK, DISTRICT 9, KABUL, AFGHANISTAN'
  const consigneeName = currentBol?.consignee_name || 'GLOBAL AGRO COMMODITIES TRADING LLC'
  const consigneeAddress = currentBol?.consignee_address || 'PORT RASHID FREE ZONE, DUBAI, UNITED ARAB EMIRATES'
  const loadingPort = currentBol?.port_of_loading || 'KABUL CUSTOMS TERMINAL'
  const dischargePort = currentBol?.port_of_discharge || 'DUBAI JEBEL ALI PORT'
  const driverName = currentBol?.driver_name || 'Mohammad Rahim'
  const truckPlate = currentBol?.truck_number || '48291-KBL'

  // Accounting invariant: Net Balance = Total Debit - Total Credit
  const totalDebit = 22450.0
  const advanceCredit = 4000.0
  const netBalance = totalDebit - advanceCredit // $18,450.00 USD

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* Preview Header & Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Live A4 Document Preview</h4>
            <p className="text-[10px] text-slate-400">
              {activeWatermarkLabel ? `${activeWatermarkLabel} (${Math.round(activeWatermarkOpacity * 100)}%)` : 'Active Settings'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHighlightWatermarkOnly(!highlightWatermarkOnly)}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
            highlightWatermarkOnly
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
          title="Dim document text to clearly inspect watermark ink clarity"
        >
          {highlightWatermarkOnly ? 'Text Dimmed' : 'Inspect Watermark'}
        </button>
      </div>

      {/* Authentic A4 Document Sheet (210mm x 297mm = Aspect 210/297) */}
      <div className="relative aspect-[210/297] w-full rounded-xl bg-white text-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden p-4 sm:p-5 select-none flex flex-col justify-between">
        {/* Background Watermark Layer */}
        {activeWatermarkUrl && (
          <div
            className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none transition-opacity duration-150"
            style={{
              backgroundImage: `url('${activeWatermarkUrl}')`,
              opacity: Math.max(0.01, Math.min(0.40, activeWatermarkOpacity)),
            }}
            aria-hidden="true"
          />
        )}

        {/* Document Content Overlay */}
        <div
          className={`relative z-10 flex flex-col justify-between h-full font-sans transition-opacity duration-150 ${
            highlightWatermarkOnly ? 'opacity-25' : 'opacity-100'
          }`}
        >
          {/* Top Brand & BOL Header */}
          <div>
            <div className="flex items-start justify-between border-b-2 border-blue-950 pb-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.logoUrl || '/images/sky-ariana-logo.png'}
                  alt="Company Logo"
                  className="h-7 w-auto object-contain max-w-[90px]"
                />
                <div>
                  <h1 className="text-[11px] sm:text-xs font-black tracking-wide text-blue-950 leading-tight">
                    {settings.companyName || 'SKY ARIANA LOGISTICS'}
                  </h1>
                  <p className="text-[6.5px] sm:text-[7.5px] text-slate-500 font-bold uppercase tracking-wider">
                    {settings.companySubtitle || 'MULTI-MODAL BILL OF LADING'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-blue-950 text-white font-mono font-bold text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded">
                  {bolNumber}
                </span>
                <p className="text-[6.5px] font-mono text-slate-500 mt-0.5">DATE: {issueDate}</p>
              </div>
            </div>

            {/* Shipper & Consignee Box */}
            <div className="grid grid-cols-2 gap-2 mt-2 border border-slate-300 rounded p-1.5 text-[6.5px] sm:text-[7.5px] bg-white/70 backdrop-blur-2xs">
              <div>
                <p className="font-bold text-blue-900 uppercase">Shipper / Exporter:</p>
                <p className="font-semibold text-slate-800 truncate">{shipperName}</p>
                <p className="text-slate-500 text-[6px] truncate">{shipperAddress}</p>
              </div>
              <div>
                <p className="font-bold text-blue-900 uppercase">Consignee / Importer:</p>
                <p className="font-semibold text-slate-800 truncate">{consigneeName}</p>
                <p className="text-slate-500 text-[6px] truncate">{consigneeAddress}</p>
              </div>
            </div>

            {/* Multi-Modal Routing Strip */}
            <div className="mt-1.5 p-1 border border-slate-200 rounded text-[6px] sm:text-[7px] bg-slate-50/80 flex items-center justify-between font-mono">
              <div>
                <span className="font-bold text-slate-700">POL:</span> {loadingPort}
              </div>
              <div>
                <span className="font-bold text-slate-700">BORDER:</span> {settings.defaultTransitBorderNote || 'ISLAM QALA'}
              </div>
              <div>
                <span className="font-bold text-slate-700">POD:</span> {dischargePort}
              </div>
            </div>

            {/* Compact Cargo Lines */}
            <div className="mt-2 border border-slate-300 rounded overflow-hidden text-[6px] sm:text-[7px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-blue-950 text-white font-bold text-[6px]">
                  <tr>
                    <th className="p-0.5">MARKS & NOS</th>
                    <th className="p-0.5">PACKAGES</th>
                    <th className="p-0.5">COMMODITY</th>
                    <th className="p-0.5 text-right">WEIGHT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white/75 font-mono">
                  <tr>
                    <td className="p-0.5">SA-01..305</td>
                    <td className="p-0.5 font-bold">305 CTNS</td>
                    <td className="p-0.5 font-sans">AFGHAN GREEN RAISINS (AAA)</td>
                    <td className="p-0.5 text-right">5,185 KG</td>
                  </tr>
                  <tr>
                    <td className="p-0.5">SA-306..908</td>
                    <td className="p-0.5 font-bold">603 CTNS</td>
                    <td className="p-0.5 font-sans">KANDAHAR BLACK SHADRA</td>
                    <td className="p-0.5 text-right">10,251 KG</td>
                  </tr>
                  <tr>
                    <td className="p-0.5">SA-909..1454</td>
                    <td className="p-0.5 font-bold">546 CTNS</td>
                    <td className="p-0.5 font-sans">DRIED FIGS & PISTACHIOS</td>
                    <td className="p-0.5 text-right">9,282 KG</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Accounting & Stamp Box */}
          <div className="border-t-2 border-blue-950 pt-1.5 text-[6.5px] sm:text-[7.5px]">
            <div className="flex items-center justify-between font-mono">
              <div>
                <span className="font-bold">TOTAL: </span>
                <span className="font-bold text-blue-950">1,454 CTNS</span>
              </div>
              <div>
                <span className="font-bold">GROSS: </span>
                <span className="font-bold text-blue-950">24,718 KG</span>
              </div>
              <div>
                <span className="font-bold">NET BAL: </span>
                <span className="font-black text-blue-900">${netBalance.toLocaleString()}.00 USD</span>
              </div>
            </div>

            {/* Carrier Signature & Security Stamp Simulation */}
            <div className="mt-2 flex items-end justify-between text-[6px] text-slate-500 relative min-h-[38px]">
              <div>
                <p className="font-bold text-slate-700 uppercase">Carrier's Verification</p>
                <p className="text-[5px]">Official Stamp & Validated Routing</p>
                <p className="text-[5px] font-mono mt-0.5">DRIVER: {driverName} ({truckPlate})</p>
              </div>

              {/* Official Stamp Overlay */}
              {showStamp && (
                <div
                  className="absolute right-12 bottom-0 flex flex-col items-center justify-center p-1 rounded-full border-2 border-red-600 text-red-600 font-serif font-black text-[5px] uppercase tracking-wider rotate-[-12deg] shadow-xs select-none bg-red-50/20 backdrop-blur-2xs pointer-events-none"
                  style={{
                    transform: `rotate(-12deg) scale(${settings.stampScale || 1})`,
                  }}
                  title="Official Sky Ariana Security Verification Stamp"
                >
                  <span className="text-[4px] font-sans font-bold">★ CARRIER APPROVED ★</span>
                  <span className="text-[5px] tracking-tight">SKY ARIANA LOGISTICS</span>
                  <span className="text-[4px] font-mono">ORIGINAL VERIFIED</span>
                </div>
              )}

              <div className="text-right border-t border-slate-400 pt-0.5 w-24">
                <p className="font-bold text-slate-800 text-[6px]">AUTHORIZED SIGNATURE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
        <span>True A4 (210 × 297 mm)</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Live Sync Active
        </span>
      </div>
    </div>
  )
}
