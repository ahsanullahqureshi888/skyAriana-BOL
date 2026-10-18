"use client"

import React, { useState } from "react"
import { Search, Plus, Filter, MoreHorizontal, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function OrdersTab() {
  const [searchTerm, setSearchTerm] = useState("")

  const DUMMY_ORDERS = [
    { id: "SO-2026-00125", supplier: "FastTrack Logistics", shipment: "NSA583", service: "ROAD_FREIGHT", expectedCost: 8500, currency: "USD", status: "CONFIRMED", invoice: "INV-992", payment: "PENDING" },
    { id: "SO-2026-00126", supplier: "Oceanic Shipping Lines", shipment: "NSA584", service: "SEA_FREIGHT", expectedCost: 12000, currency: "USD", status: "APPROVED", invoice: "-", payment: "-" },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search orders..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[300px] h-9 bg-white"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" /> Filter
          </Button>
        </div>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9">
          <Plus className="h-4 w-4 mr-2" /> Create Order
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th className="px-4 py-3 font-bold">Order No</th>
              <th className="px-4 py-3 font-bold">Supplier</th>
              <th className="px-4 py-3 font-bold">Shipment</th>
              <th className="px-4 py-3 font-bold">Service</th>
              <th className="px-4 py-3 font-bold text-right">Expected Cost</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Invoice</th>
              <th className="px-4 py-3 font-bold">Payment</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DUMMY_ORDERS.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" /> {o.id}
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{o.supplier}</td>
                <td className="px-4 py-3 text-slate-600">{o.shipment}</td>
                <td className="px-4 py-3 text-slate-600">{o.service}</td>
                <td className="px-4 py-3 text-right font-black text-slate-900">{o.currency} {o.expectedCost.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 font-semibold">{o.invoice}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.payment === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {o.payment}
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
