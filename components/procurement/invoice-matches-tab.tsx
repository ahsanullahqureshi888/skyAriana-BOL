"use client"

import React, { useState } from "react"
import { Search, Filter, MoreHorizontal, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InvoiceMatchesTab() {
  const [searchTerm, setSearchTerm] = useState("")

  const DUMMY_MATCHES = [
    { id: "M-001", invoice: "INV-992", supplier: "FastTrack Logistics", order: "SO-2026-00125", orderAmount: 8500, invoiceAmount: 8700, variance: 200, currency: "USD", matchStatus: "VARIANCE", dueDate: "2026-10-15" },
    { id: "M-002", invoice: "INV-993", supplier: "Border Customs LLC", order: "SO-2026-00119", orderAmount: 450, invoiceAmount: 450, variance: 0, currency: "USD", matchStatus: "MATCHED", dueDate: "2026-10-10" },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search matches..." 
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
              <th className="px-4 py-3 font-bold">Invoice</th>
              <th className="px-4 py-3 font-bold">Supplier</th>
              <th className="px-4 py-3 font-bold">Order</th>
              <th className="px-4 py-3 font-bold text-right">Order Amt</th>
              <th className="px-4 py-3 font-bold text-right">Invoice Amt</th>
              <th className="px-4 py-3 font-bold text-right">Variance</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-center">Due Date</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DUMMY_MATCHES.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" /> {m.invoice}
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{m.supplier}</td>
                <td className="px-4 py-3 text-slate-600">{m.order}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{m.currency} {m.orderAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{m.currency} {m.invoiceAmount.toLocaleString()}</td>
                <td className={`px-4 py-3 text-right font-black flex justify-end items-center gap-1 ${m.variance > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  {m.variance > 0 && <AlertCircle className="h-4 w-4" />}
                  {m.variance > 0 ? `+${m.variance.toLocaleString()}` : '0'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    m.matchStatus === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {m.matchStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{m.dueDate}</td>
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
