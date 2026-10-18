"use client"

import React from "react"
import { Printer, Download, X, ShieldCheck, Activity, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExecutiveBiPayload } from "@/lib/types/executive-bi"

interface ExecutiveManagementPackViewProps {
  payload: ExecutiveBiPayload
  onClose: () => void
}

export function ExecutiveManagementPackView({ payload, onClose }: ExecutiveManagementPackViewProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center overflow-y-auto p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 shadow-2xl print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm">Executive Management Performance Pack (A4 PDF)</span>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
            Cryptographically Grounded
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8">
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-slate-300 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Printable A4 Paper Document */}
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-12 print:shadow-none print:p-6 print:max-w-none print:w-full print:rounded-none font-sans text-xs">
        {/* Header Block */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-blue-950 uppercase">SKY ARIANA LIMITED</span>
              <span className="text-sm font-semibold text-slate-500">| شرکت حمل و نقل بین‌المللی اسکای آریانا</span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              International Multimodal Logistics & Afghan Border Transit Operations
            </p>
            <p className="text-[11px] text-slate-500">
              Dubai • Kabul • Herat • Hairatan • Islam Qala • Torghundi • Spin Boldak
            </p>
          </div>
          <div className="text-right">
            <Badge className="bg-blue-900 text-white font-mono uppercase text-[10px] mb-1">
              Executive Briefing
            </Badge>
            <p className="text-[11px] text-slate-500">Period: <span className="font-bold text-slate-800">{payload.periodLabel}</span></p>
            <p className="text-[11px] text-slate-500">Generated: <span className="font-bold text-slate-800">{new Date(payload.asOf).toLocaleDateString()}</span></p>
          </div>
        </div>

        {/* Executive Mandate & Statement */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            Executive Performance Summary
          </h2>
          <p className="text-slate-700 text-[11px] leading-relaxed">
            This executive management pack consolidates operational throughput, multi-currency recognized service revenues, direct logistics costs, and Afghan border station turnaround times for <span className="font-semibold">{payload.periodLabel}</span>. All figures reflect canonical accounting entries and physical consignment checkpoints without subjective adjustments.
          </p>
        </div>

        {/* Core KPI Matrix Grid */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider mb-3">Key Performance Indicator (KPI) Scorecard</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Active Shipments</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{String(payload.kpis.activeShipments.value)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{payload.kpis.activeShipments.changeText} vs comp</p>
            </div>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Delivered BOLs</p>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{String(payload.kpis.deliveredShipments.value)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{payload.kpis.deliveredShipments.changeText} vs comp</p>
            </div>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Service Revenue</p>
              <p className="text-lg font-black text-blue-900 mt-0.5">{String(payload.kpis.serviceRevenue.value)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{payload.kpis.serviceRevenue.changeText || "Recognized billing"}</p>
            </div>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
              <p className="text-[10px] uppercase font-semibold text-slate-500">Shipment Gross Margin</p>
              <p className="text-lg font-black text-emerald-800 mt-0.5">{String(payload.kpis.grossMargin.value)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Margin Yield: {String(payload.kpis.grossMarginPct.value)}</p>
            </div>
          </div>
        </div>

        {/* Multi-Currency P&L Segregation */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider mb-2">Segregated Service Billing by Currency</h3>
          <div className="grid grid-cols-3 gap-3">
            {["USD", "AFN", "AED"].map((curr) => {
              const rev = payload.revenueByCurrency.find((b) => b.currency === curr)?.amount || 0
              const cost = payload.directCostByCurrency.find((b) => b.currency === curr)?.amount || 0
              const margin = rev - cost
              return (
                <div key={curr} className="border border-slate-200 rounded p-3 bg-white">
                  <div className="flex items-center justify-between border-b pb-1 mb-2">
                    <span className="font-bold text-xs text-slate-800">{curr} Account Pool</span>
                    <Badge variant="outline" className="text-[10px]">{curr}</Badge>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Service Billings:</span>
                      <span className="font-semibold text-slate-900">{curr} {rev.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Direct Carrier Costs:</span>
                      <span className="font-semibold text-rose-700">{curr} {cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Gross Margin:</span>
                      <span className={margin >= 0 ? "text-emerald-700" : "text-rose-600"}>
                        {curr} {margin.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Transit Corridor Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider mb-2">Transit Corridors & Border Performance</h3>
          <table className="w-full border-collapse border border-slate-200 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-left">
                <th className="border border-slate-200 p-1.5 font-bold">Corridor Lane</th>
                <th className="border border-slate-200 p-1.5 font-bold">Border</th>
                <th className="border border-slate-200 p-1.5 font-bold">Mode</th>
                <th className="border border-slate-200 p-1.5 font-bold text-right">Shipments</th>
                <th className="border border-slate-200 p-1.5 font-bold text-right">Packages</th>
                <th className="border border-slate-200 p-1.5 font-bold text-right">Weight (kg)</th>
                <th className="border border-slate-200 p-1.5 font-bold text-right">Avg Days</th>
              </tr>
            </thead>
            <tbody>
              {payload.corridorPerformance.slice(0, 5).map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="border border-slate-200 p-1.5 font-medium">{c.origin} → {c.destination}</td>
                  <td className="border border-slate-200 p-1.5">{c.borderStation || "N/A"}</td>
                  <td className="border border-slate-200 p-1.5 uppercase text-[10px]">{c.mode}</td>
                  <td className="border border-slate-200 p-1.5 text-right font-bold">{c.shipmentCount}</td>
                  <td className="border border-slate-200 p-1.5 text-right">{c.totalPackages.toLocaleString()}</td>
                  <td className="border border-slate-200 p-1.5 text-right">{c.totalGrossWeightKg.toLocaleString()}</td>
                  <td className="border border-slate-200 p-1.5 text-right">{c.avgTransitDays.toFixed(1)} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Operational Attention & Critical Bottlenecks */}
        {payload.attentionQueue.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider mb-2">Priority Attention Items</h3>
            <div className="space-y-2">
              {payload.attentionQueue.slice(0, 4).map((item) => (
                <div key={item.id} className="border border-amber-200 bg-amber-50/50 rounded p-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.severity === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.severity}
                      </span>
                      <span className="font-bold text-slate-800">{item.title}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{item.description}</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 whitespace-nowrap ml-4">
                    <span>{item.daysElapsed} days elapsed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formal Executive Sign-off Block */}
        <div className="border-t-2 border-slate-800 pt-6 mt-8 flex justify-between items-end text-[11px] text-slate-600">
          <div>
            <p className="font-bold text-slate-800">Sky Ariana Operations & Finance Committee</p>
            <p className="text-[10px]">Authoritative Management Accounting Report</p>
          </div>
          <div className="text-center w-48 border-t border-slate-400 pt-1">
            <p className="font-bold text-slate-800">Authorized Signature & Seal</p>
            <p className="text-[10px] text-slate-400">Managing Director / CFO</p>
          </div>
        </div>
      </div>
    </div>
  )
}
