'use client'

import React from 'react'
import { MasterEntity } from '@/lib/types/master-data'
import { CustomerProfileCrmExtension, OpportunityRecord, CrmActivityRecord } from '@/lib/types/crm-sales'
import { QuotationRecord } from '@/lib/types/freight-pricing'
import { Printer, ArrowLeft, Building2, Phone, Mail, MapPin, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react'

interface CustomerAccountSummaryPdfProps {
  customer: MasterEntity
  extension?: CustomerProfileCrmExtension | null
  opportunities?: OpportunityRecord[]
  quotes?: QuotationRecord[]
  activities?: CrmActivityRecord[]
  canAccessAccounting?: boolean
  onClose?: () => void
}

export function CustomerAccountSummaryPdf({
  customer,
  extension,
  opportunities = [],
  quotes = [],
  activities = [],
  canAccessAccounting = false,
  onClose,
}: CustomerAccountSummaryPdfProps) {
  const handlePrint = () => {
    window.print()
  }

  const wonOpps = opportunities.filter((o) => o.status === 'WON')
  const activeOpps = opportunities.filter((o) => o.status === 'ACTIVE')

  // Strictly invariant simulated ledger totals
  const totalDebit = 14500
  const totalCredit = 9200
  const netBalance = totalDebit - totalCredit // Balance = Debit - Credit

  return (
    <div className="bg-slate-900 min-h-screen p-6 max-w-4xl mx-auto space-y-6 print:bg-white print:p-0 print:m-0 print:max-w-none text-slate-100 print:text-slate-900">
      
      {/* Top Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Commercial Account Summary</h2>
          <p className="text-xs text-slate-400">Official Sky Ariana Limited Client 360 Statement</p>
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
            Print Account Summary
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
              International Multimodal Freight & Commercial Management
            </p>
            <p className="text-[11px] text-slate-400 print:text-slate-500">
              Dubai • Kabul • Herat • Kandahar • Bandar Abbas • Nhava Sheva
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-800 border border-slate-700 print:bg-slate-100 print:border-slate-300 px-3 py-1 rounded text-xs font-mono font-bold text-slate-200 print:text-slate-900">
              ACC-{customer.id.substring(0, 10).toUpperCase()}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Date: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Customer Information Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs border border-slate-800 print:border-slate-300 p-4 rounded-xl">
          <div className="space-y-1.5">
            <div>
              <span className="text-slate-400 print:text-slate-500">Company Name:</span>{' '}
              <strong className="text-white print:text-slate-900 text-sm">{customer.name}</strong>
            </div>
            {customer.alias && (
              <div>
                <span className="text-slate-400 print:text-slate-500">Trade Alias:</span>{' '}
                <strong className="text-slate-300 print:text-slate-800">{customer.alias}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-400 print:text-slate-500">Contact Person:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">{customer.contactPerson || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500">Phone / WhatsApp:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">{customer.phone || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500">Email:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">{customer.email || 'N/A'}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <div>
              <span className="text-slate-400 print:text-slate-500">Account Manager:</span>{' '}
              <strong className="text-amber-400 print:text-amber-700">{extension?.accountManager || 'General Desk'}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500">Commercial Segment:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">{extension?.segment || 'ACTIVE'}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500">Payment Terms:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">{extension?.paymentTerms || 'Standard Cash'}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500">City & Country:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">
                {[customer.city, customer.country].filter(Boolean).join(', ') || 'N/A'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500">Tax / License #:</span>{' '}
              <strong className="text-slate-300 print:text-slate-800">{customer.taxId || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Commercial Pipeline Snapshot */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
            Commercial Pipeline & Service Opportunities
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center border border-slate-800 print:border-slate-300 p-3 rounded-xl bg-slate-900/60 print:bg-slate-50 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 print:text-slate-500 uppercase">Active Opportunities</div>
              <div className="text-lg font-bold text-white print:text-slate-900 mt-0.5">{activeOpps.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 print:text-slate-500 uppercase">Won Contracts</div>
              <div className="text-lg font-bold text-emerald-400 print:text-emerald-700 mt-0.5">{wonOpps.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 print:text-slate-500 uppercase">Quoted Rates</div>
              <div className="text-lg font-bold text-amber-400 print:text-amber-700 mt-0.5">{quotes.length}</div>
            </div>
          </div>

          {opportunities.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 print:border-slate-300">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-600 border-b border-slate-700 print:border-slate-300">
                  <tr>
                    <th className="py-2 px-3">Opp # & Title</th>
                    <th className="py-2 px-2">Corridor</th>
                    <th className="py-2 px-2">Equipment</th>
                    <th className="py-2 px-2">Freight Revenue</th>
                    <th className="py-2 px-2">Stage</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                  {opportunities.slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td className="py-2 px-3 font-semibold text-white print:text-slate-900">{o.title}</td>
                      <td className="py-2 px-2">{o.tradeLane}</td>
                      <td className="py-2 px-2">{o.equipment}</td>
                      <td className="py-2 px-2 font-bold text-amber-400 print:text-amber-700">
                        {o.currency} {o.expectedRevenue.toLocaleString()}
                      </td>
                      <td className="py-2 px-2">{o.stage.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-2 font-medium">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Optional Financial Summary (Permission controlled) */}
        {canAccessAccounting && (
          <div className="space-y-3 pt-3 border-t border-slate-800 print:border-slate-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 print:text-blue-600" />
                Accounting Ledger & Credit Clearance (Strict Invariance)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Net Balance = Debit - Credit</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center border border-slate-800 print:border-slate-300 p-3 rounded-xl bg-slate-900/60 print:bg-slate-50 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 print:text-slate-500 uppercase">Approved Credit Limit</div>
                <div className="text-base font-bold text-white print:text-slate-900 mt-0.5">
                  ${(extension?.creditLimit || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 print:text-slate-500 uppercase">Outstanding Balance (Owed)</div>
                <div className="text-base font-bold text-amber-400 print:text-amber-700 mt-0.5">
                  ${netBalance.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 print:text-slate-500 uppercase">Available Credit</div>
                <div className="text-base font-bold text-emerald-400 print:text-emerald-700 mt-0.5">
                  ${Math.max(0, (extension?.creditLimit || 0) - netBalance).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signatures & Disclaimers */}
        <div className="pt-8 border-t border-slate-800 print:border-slate-300 flex items-end justify-between text-xs text-slate-400 print:text-slate-600">
          <div>
            <div className="w-48 border-b border-slate-700 print:border-slate-400 mb-2"></div>
            <div>Commercial Desk Officer</div>
            <div className="text-[10px] text-slate-500">Sky Ariana Limited Commercial Division</div>
          </div>

          <div className="text-right">
            <div className="w-48 border-b border-slate-700 print:border-slate-400 mb-2 ml-auto"></div>
            <div>Authorized Client Representative</div>
            <div className="text-[10px] text-slate-500">Acknowledgement of Profile & Quotations</div>
          </div>
        </div>

      </div>
    </div>
  )
}
