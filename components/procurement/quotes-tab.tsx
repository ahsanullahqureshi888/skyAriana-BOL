"use client"

import React, { useState } from "react"
import { Search, Filter, MoreHorizontal, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function QuotesTab() {
  const [searchTerm, setSearchTerm] = useState("")

  const DUMMY_QUOTES = [
    { id: "Q-2026-881", rfq: "RFQ-2026-00125", supplier: "FastTrack Logistics", currency: "USD", total: 8500, validity: "2026-10-01", transit: "5 Days", selected: true, status: "SELECTED" },
    { id: "Q-2026-882", rfq: "RFQ-2026-00125", supplier: "Global Road Ways", currency: "USD", total: 8750, validity: "2026-10-05", transit: "4 Days", selected: false, status: "NOT_SELECTED" },
    { id: "Q-2026-883", rfq: "RFQ-2026-00126", supplier: "Oceanic Shipping Lines", currency: "USD", total: 12000, validity: "2026-10-15", transit: "22 Days", selected: false, status: "UNDER_REVIEW" },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search quotes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[300px] h-9 bg-white"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" /> Filter
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th className="px-4 py-3 font-bold">Quote Ref</th>
              <th className="px-4 py-3 font-bold">RFQ</th>
              <th className="px-4 py-3 font-bold">Supplier</th>
              <th className="px-4 py-3 font-bold text-right">Total Cost</th>
              <th className="px-4 py-3 font-bold text-center">Transit</th>
              <th className="px-4 py-3 font-bold text-center">Validity</th>
              <th className="px-4 py-3 font-bold text-center">Selected</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DUMMY_QUOTES.map((q) => (
              <tr key={q.id} className={`hover:bg-slate-50 transition-colors ${q.selected ? 'bg-emerald-50/30' : ''}`}>
                <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" /> {q.id}
                </td>
                <td className="px-4 py-3 text-slate-600">{q.rfq}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{q.supplier}</td>
                <td className="px-4 py-3 text-right font-black text-slate-900">{q.currency} {q.total.toLocaleString()}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{q.transit}</td>
                <td className="px-4 py-3 text-center text-slate-600">{q.validity}</td>
                <td className="px-4 py-3 text-center">
                  {q.selected && <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    q.status === 'SELECTED' ? 'bg-emerald-100 text-emerald-700' : 
                    q.status === 'NOT_SELECTED' ? 'bg-slate-100 text-slate-500' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
