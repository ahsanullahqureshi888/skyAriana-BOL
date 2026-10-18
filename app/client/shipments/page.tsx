"use client"
import React, { useState, useEffect } from "react"
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Box, 
  X, 
  FileText, 
  Anchor, 
  AlertCircle 
} from "lucide-react"

export default function ClientShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    fetch("/api/client/shipments")
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success) setShipments(data.shipments || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const openShipmentDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/client/shipments/${id}`)
      const data = await res.json()
      if (data?.success) {
        setSelectedShipment(data.shipment)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDetail(false)
    }
  }

  const filteredShipments = shipments.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.referenceNumber && s.referenceNumber.toLowerCase().includes(q)) ||
      (s.commodity && s.commodity.toLowerCase().includes(q)) ||
      (s.currentLocation && s.currentLocation.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading authorized shipments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Shipments & Bills of Lading</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Real-time status, timeline milestones, and container allocations for your cargo.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search BOL #, Commodity, Origin..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">BOL Reference</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Commodity</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">ETA</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredShipments.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-white">{s.id}</div>
                    {s.referenceNumber && s.referenceNumber !== s.id && (
                      <div className="text-[11px] text-slate-400 font-bold">Ref: {s.referenceNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-300">
                    {s.commodity || "General Cargo"}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <div className="text-xs font-bold text-white">{s.origin || "Origin"}</div>
                    <div className="text-[11px] text-slate-400">➔ {s.destination || "Destination"}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">
                    {s.eta || "Pending"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openShipmentDetail(s.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black transition-colors"
                    >
                      Track <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    No authorized shipments matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipment Detail Drawer / Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Shipment Details</div>
                <h2 className="text-xl md:text-2xl font-black text-white">{selectedShipment.id}</h2>
              </div>
              <button 
                onClick={() => setSelectedShipment(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[10px] font-bold uppercase text-slate-400">Current Status</div>
                <div className="text-sm font-black text-amber-400 mt-1 uppercase">{selectedShipment.status.replace(/_/g, " ")}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[10px] font-bold uppercase text-slate-400">Location</div>
                <div className="text-sm font-black text-white mt-1">{selectedShipment.currentLocation || "In Transit"}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Cartons</div>
                <div className="text-sm font-black text-white mt-1">{selectedShipment.cargo?.cartons || 0}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[10px] font-bold uppercase text-slate-400">Gross Weight</div>
                <div className="text-sm font-black text-white mt-1">{selectedShipment.cargo?.grossWeightKg?.toLocaleString() || 0} KG</div>
              </div>
            </div>

            {/* Cargo & Route */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Route Information</h3>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div><span className="font-bold text-white">Origin:</span> {selectedShipment.transport?.origin || "Afghanistan"}</div>
                  <div><span className="font-bold text-white">Port of Loading:</span> {selectedShipment.transport?.portOfLoading || "Bandar Abbas"}</div>
                  <div><span className="font-bold text-white">Port of Discharge:</span> {selectedShipment.transport?.portOfDischarge || "Nhava Sheva"}</div>
                  <div><span className="font-bold text-white">Final Destination:</span> {selectedShipment.transport?.finalDestination || "India"}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Cargo Specifications</h3>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div><span className="font-bold text-white">Commodity:</span> {selectedShipment.cargo?.commodity || "General"}</div>
                  <div><span className="font-bold text-white">Package Type:</span> {selectedShipment.cargo?.packageType || "Cartons"}</div>
                  <div><span className="font-bold text-white">Net Weight:</span> {selectedShipment.cargo?.netWeightKg?.toLocaleString() || 0} KG</div>
                  <div><span className="font-bold text-white">HS Code:</span> {selectedShipment.cargo?.hsCode || "N/A"}</div>
                </div>
              </div>
            </div>

            {/* Customer Safe Milestones Timeline */}
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3">Shipment Progress Timeline</h3>
              <div className="space-y-3">
                {selectedShipment.milestones && selectedShipment.milestones.length > 0 ? (
                  selectedShipment.milestones.map((m: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">{m.title || m.status}</span>
                          <span className="text-[10px] text-slate-400">{m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ""}</span>
                        </div>
                        {m.location && <div className="text-[11px] text-slate-400 mt-0.5">Location: {m.location}</div>}
                        {m.description && <div className="text-xs text-slate-300 mt-1">{m.description}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 font-bold p-4 bg-slate-800/30 rounded-xl text-center">
                    No milestone checkpoints posted yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedShipment(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
