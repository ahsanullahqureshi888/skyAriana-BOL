'use client'

import React from 'react'
import { OpportunityRecord, OpportunityStage } from '@/lib/types/crm-sales'
import { Printer, ArrowLeft, TrendingUp, Layers, Calendar, DollarSign } from 'lucide-react'

interface SalesPipelinePdfProps {
  opportunities: OpportunityRecord[]
  onClose?: () => void
}

const STAGES: OpportunityStage[] = [
  'NEW_INQUIRY',
  'QUALIFIED',
  'RATE_REQUESTED',
  'QUOTATION_PREPARED',
  'QUOTATION_SENT',
  'FOLLOW_UP',
  'NEGOTIATION',
  'CUSTOMER_CONFIRMATION',
  'WON',
  'LOST',
]

export function SalesPipelinePdf({ opportunities, onClose }: SalesPipelinePdfProps) {
  const handlePrint = () => {
    window.print()
  }

  // Segregated Currency Totals (Strict Rule: never sum different currencies)
  const currencyTotals: Record<string, number> = {}
  opportunities.forEach((o) => {
    if (o.status !== 'LOST') {
      currencyTotals[o.currency] = (currencyTotals[o.currency] || 0) + o.expectedRevenue
    }
  })

  // By stage breakdown
  const stageBreakdown = STAGES.map((stg) => {
    const matched = opportunities.filter((o) => o.stage === stg)
    const stageCurrencies: Record<string, number> = {}
    matched.forEach((o) => {
      stageCurrencies[o.currency] = (stageCurrencies[o.currency] || 0) + o.expectedRevenue
    })
    const avgProb =
      matched.length > 0
        ? Math.round(matched.reduce((acc, curr) => acc + curr.probability, 0) / matched.length)
        : 0

    return {
      stage: stg,
      count: matched.length,
      currencies: stageCurrencies,
      avgProbability: avgProb,
    }
  })

  return (
    <div className="bg-slate-900 min-h-screen p-6 max-w-4xl mx-auto space-y-6 print:bg-white print:p-0 print:m-0 print:max-w-none text-slate-100 print:text-slate-900">
      
      {/* Top Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Sales Pipeline Management Report</h2>
          <p className="text-xs text-slate-400">Sky Ariana Commercial Division Executive Overview</p>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Pipeline Report
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="border border-slate-700/80 p-8 rounded-2xl bg-slate-950/40 print:border-none print:p-0 print:bg-white space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-700 pb-5 print:border-slate-300">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-amber-500 print:text-amber-700">
              SKY ARIANA LIMITED
            </h1>
            <p className="text-xs tracking-wider uppercase font-semibold text-slate-400 print:text-slate-600">
              Commercial Sales Pipeline & Freight Opportunity Audit
            </p>
            <p className="text-[11px] text-slate-400 print:text-slate-500">
              Official Management Performance & Pipeline Report
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-800 border border-slate-700 print:bg-slate-100 print:border-slate-300 px-3 py-1 rounded text-xs font-mono font-bold text-slate-200 print:text-slate-900">
              REPORT-{new Date().toISOString().split('T')[0]}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Active Opportunities: {opportunities.filter((o) => o.status === 'ACTIVE').length}
            </div>
          </div>
        </div>

        {/* Segregated Multi-Currency Pipeline Totals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
              Total Active Pipeline Value (Segregated Currencies)
            </h3>
            <span className="text-[10px] text-slate-500 italic">
              Freight service revenue only (strictly excludes cargo goods value)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border border-slate-800 print:border-slate-300 p-4 rounded-xl bg-slate-900/60 print:bg-slate-50">
            {Object.keys(currencyTotals).length === 0 ? (
              <div className="col-span-4 text-xs text-slate-400 py-2">No active opportunities in pipeline.</div>
            ) : (
              Object.entries(currencyTotals).map(([curr, total]) => (
                <div key={curr} className="p-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500">
                    {curr} Pipeline
                  </div>
                  <div className="text-xl font-bold text-white print:text-slate-900 mt-1">
                    {curr} {total.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stage-by-Stage Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
            Pipeline Distribution by Sales Stage
          </h3>

          <div className="overflow-x-auto rounded-lg border border-slate-800 print:border-slate-300">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-600 border-b border-slate-700 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Commercial Stage</th>
                  <th className="py-2.5 px-3">Deals Count</th>
                  <th className="py-2.5 px-4">Stage Freight Revenue (Segregated)</th>
                  <th className="py-2.5 px-3">Avg Win Est. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {stageBreakdown.map((row) => (
                  <tr key={row.stage}>
                    <td className="py-2 px-3 font-semibold text-white print:text-slate-900">
                      {row.stage.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 px-3">{row.count}</td>
                    <td className="py-2 px-4 font-mono">
                      {Object.keys(row.currencies).length === 0 ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        Object.entries(row.currencies).map(([c, val]) => (
                          <span key={c} className="mr-3 text-amber-400 print:text-amber-700 font-semibold">
                            {c} {val.toLocaleString()}
                          </span>
                        ))
                      )}
                    </td>
                    <td className="py-2 px-3">{row.avgProbability}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Opportunities List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
            Active Commercial Opportunities
          </h3>

          <div className="overflow-x-auto rounded-lg border border-slate-800 print:border-slate-300">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-600 border-b border-slate-700 print:border-slate-300">
                <tr>
                  <th className="py-2 px-3">Opp # & Title</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-2">Corridor</th>
                  <th className="py-2 px-2">Equipment</th>
                  <th className="py-2 px-2">Freight Value</th>
                  <th className="py-2 px-2">Stage</th>
                  <th className="py-2 px-2">Owner</th>
                  <th className="py-2 px-2">Close Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {opportunities.slice(0, 15).map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 px-3 font-semibold text-white print:text-slate-900">
                      {o.title}
                      <div className="text-[10px] text-slate-500 font-mono">{o.opportunityNumber}</div>
                    </td>
                    <td className="py-2 px-3">{o.customerName}</td>
                    <td className="py-2 px-2">{o.tradeLane}</td>
                    <td className="py-2 px-2">{o.equipment}</td>
                    <td className="py-2 px-2 font-bold text-amber-400 print:text-amber-700 font-mono">
                      {o.currency} {o.expectedRevenue.toLocaleString()}
                    </td>
                    <td className="py-2 px-2">{o.stage.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-2">{o.owner}</td>
                    <td className="py-2 px-2 text-slate-400 print:text-slate-500">{o.expectedCloseDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures & Disclaimers */}
        <div className="pt-8 border-t border-slate-800 print:border-slate-300 flex items-end justify-between text-xs text-slate-400 print:text-slate-600">
          <div>
            <div className="w-48 border-b border-slate-700 print:border-slate-400 mb-2"></div>
            <div>Commercial Sales Director</div>
            <div className="text-[10px] text-slate-500">Sky Ariana Limited Commercial Governance</div>
          </div>

          <div className="text-right">
            <div className="w-48 border-b border-slate-700 print:border-slate-400 mb-2 ml-auto"></div>
            <div>Finance & Audit Signoff</div>
            <div className="text-[10px] text-slate-500">Accounting Invariance & Revenue Compliance</div>
          </div>
        </div>

      </div>
    </div>
  )
}
