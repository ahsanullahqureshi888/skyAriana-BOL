"use client"

import React, { useEffect, useState } from "react"
import { X, ExternalLink, Calculator, Layers, FileText, ArrowRight, ShieldCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricDrilldownResponse } from "@/lib/types/management-reporting"

interface DrawerProps {
  metricId?: string | null
  metricTitle?: string
  isOpen: boolean
  onClose: () => void
  drilldownData?: MetricDrilldownResponse | null
  isLoading?: boolean
}

export function MetricDrilldownDrawer({
  metricId,
  metricTitle,
  isOpen,
  onClose,
  drilldownData: externalData,
  isLoading: externalLoading,
}: DrawerProps) {
  const [internalData, setInternalData] = useState<MetricDrilldownResponse | null>(null)
  const [internalLoading, setInternalLoading] = useState(false)

  const data = externalData !== undefined ? externalData : internalData
  const loading = externalLoading !== undefined ? externalLoading : internalLoading

  useEffect(() => {
    if (!isOpen || !metricId || externalData !== undefined) return
    setInternalLoading(true)
    fetch(`/api/reports/management/drilldown?metricId=${encodeURIComponent(metricId)}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.drilldown) {
          setInternalData(res.drilldown)
        }
      })
      .catch((err) => console.error("Drilldown fetch error:", err))
      .finally(() => setInternalLoading(false))
  }, [isOpen, metricId, externalData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {data?.metricTitle || metricTitle || "Metric Traceability Details"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audit reconciliation & underlying source records
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Metadata Card */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-300">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Accounting & Calculation Basis:</span>
              </div>
              <div className="font-mono text-[11px] text-blue-900 dark:text-blue-200 bg-white/80 dark:bg-slate-900/60 p-2 rounded border border-blue-200 dark:border-blue-800">
                {data?.formula || "Calculated as sum of all verified and posted transactions"}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                {data?.definition || "Accrual recognition adhering strictly to financial period closing boundaries."}
              </div>
            </div>

            {/* Total Reconciliation Banner */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Total Calculated</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {data ? `${data.currency} ${data.totalCalculated.toLocaleString()}` : "—"}
                </span>
              </div>
              <Badge variant="outline" className="text-xs font-bold gap-1 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{data?.includedRecordsCount || 0} Posted Records</span>
              </Badge>
            </div>

            {/* Records Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Underlying Source Records ({data?.records.length || 0})
              </h4>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading verified source transactions...</div>
              ) : data && data.records.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Reference</th>
                        <th className="p-2.5">Party / Description</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{r.date}</td>
                          <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {r.referenceNumber}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">
                            <div className="font-semibold">{r.partyName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.description}</div>
                          </td>
                          <td className="p-2.5 text-right font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
                            {r.currency} {r.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No underlying records found for this period.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
