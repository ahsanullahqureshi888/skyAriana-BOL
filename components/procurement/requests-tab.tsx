"use client"

import React, { useState } from "react"
import { Search, Plus, Filter, MoreHorizontal, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function RequestsTab() {
  const [searchTerm, setSearchTerm] = useState("")

  const DUMMY_REQUESTS = [
    { id: "PR-2026-00125", shipment: "NSA583", service: "ROAD_FREIGHT", route: "Dogharoon -> Herat", equipment: "1 x 40RF", requestedBy: "Ops Team", status: "OPEN", date: "2026-09-24" },
    { id: "PR-2026-00126", shipment: "NSA584", service: "SEA_FREIGHT", route: "Jebel Ali -> Bandar Abbas", equipment: "2 x 20GP", requestedBy: "Sales Team", status: "RATE_REQUESTED", date: "2026-09-25" },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search requests..." 
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
          <Plus className="h-4 w-4 mr-2" /> New Request
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th className="px-4 py-3 font-bold">Request No</th>
              <th className="px-4 py-3 font-bold">Shipment</th>
              <th className="px-4 py-3 font-bold">Service</th>
              <th className="px-4 py-3 font-bold">Route</th>
              <th className="px-4 py-3 font-bold">Equipment</th>
              <th className="px-4 py-3 font-bold">Requested By</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DUMMY_REQUESTS.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" /> {r.id}
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{r.shipment}</td>
                <td className="px-4 py-3 text-slate-600">{r.service}</td>
                <td className="px-4 py-3 text-slate-600">{r.route}</td>
                <td className="px-4 py-3 text-slate-600">{r.equipment}</td>
                <td className="px-4 py-3 text-slate-600">{r.requestedBy}</td>
                <td className="px-4 py-3 text-slate-600">{r.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'RATE_REQUESTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}
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
