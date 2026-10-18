"use client"

import React, { useState } from "react"
import { Search, Plus, Filter, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function VendorsTab() {
  const [searchTerm, setSearchTerm] = useState("")

  const DUMMY_VENDORS = [
    { id: "V-001", name: "Oceanic Shipping Lines", roles: ["SHIPPING_LINE"], services: ["SEA_FREIGHT"], activeOrders: 12, openPayables: "USD 12,500", contracts: 1, documents: "Complete", status: "ACTIVE" },
    { id: "V-002", name: "FastTrack Logistics", roles: ["TRUCKING_COMPANY", "FREIGHT_FORWARDER"], services: ["ROAD_FREIGHT"], activeOrders: 5, openPayables: "USD 3,200", contracts: 0, documents: "Missing", status: "ACTIVE" },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search vendors..." 
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
          <Plus className="h-4 w-4 mr-2" /> Add Vendor
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th className="px-4 py-3 font-bold">Vendor</th>
              <th className="px-4 py-3 font-bold">Roles</th>
              <th className="px-4 py-3 font-bold">Services</th>
              <th className="px-4 py-3 font-bold text-right">Active Orders</th>
              <th className="px-4 py-3 font-bold text-right">Open Payables</th>
              <th className="px-4 py-3 font-bold text-center">Contracts</th>
              <th className="px-4 py-3 font-bold text-center">Documents</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DUMMY_VENDORS.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">{v.name}</td>
                <td className="px-4 py-3 text-slate-600">{v.roles.join(", ")}</td>
                <td className="px-4 py-3 text-slate-600">{v.services.join(", ")}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{v.activeOrders}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{v.openPayables}</td>
                <td className="px-4 py-3 text-center">{v.contracts}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.documents === "Complete" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {v.documents}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    {v.status}
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
