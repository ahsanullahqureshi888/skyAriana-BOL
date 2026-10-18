"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileCheck2, Search, ArrowRight, ShieldCheck, FileWarning, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useApp } from "@/lib/app-context"
import { toast } from "sonner"
import { ShipmentDocumentProfile } from "./shipment-document-profile"

export function DocumentComplianceWorkspace() {
  const { setView } = useApp()
  const [bols, setBols] = useState<any[]>([])
  const [selectedBol, setSelectedBol] = useState<any>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // Load local BOLs
    try {
      const storedLocal = window.localStorage.getItem("sky-bol-browser-documents") || "[]"
      const list = JSON.parse(storedLocal)
      setBols(list)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const filteredBols = bols.filter(b => {
    const term = search.toLowerCase()
    return (b.bol_number || "").toLowerCase().includes(term) ||
           (b.shipper_name || "").toLowerCase().includes(term) ||
           (b.consignee_name || "").toLowerCase().includes(term)
  })

  if (selectedBol) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => setSelectedBol(null)} className="mb-4">
          ← Back to Compliance Center
        </Button>
        <ShipmentDocumentProfile bolData={selectedBol} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            Document & Compliance Center
          </h1>
          <p className="text-slate-500 mt-1">Verify shipment documents, audit data consistency, and generate combined PDF files.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{bols.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Fully Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">0</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">0</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Missing Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shipment Compliance Status</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search BOL, Shipper, Consignee..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredBols.map((bol, idx) => {
              const uniqueKey = bol.id || bol.bol_number || bol.document_id || `bol-item-${idx}`
              return (
                <div
                  key={`${uniqueKey}-${idx}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all bg-white group cursor-pointer"
                  onClick={() => setSelectedBol(bol)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{bol.bol_number || 'DRAFT'}</div>
                      <div className="text-sm text-slate-500">{bol.shipper_name || 'N/A'} → {bol.consignee_name || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex -space-x-2">
                      {/* Mock document badges */}
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700" title="Bill of Lading">BL</div>
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700" title="Commercial Invoice">INV</div>
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400" title="Packing List">PL</div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              )
            })}
            {filteredBols.length === 0 && (
              <div className="py-12 text-center text-slate-500">No shipments found matching your search.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
