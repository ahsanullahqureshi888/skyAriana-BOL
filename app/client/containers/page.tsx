"use client"
import React, { useState, useEffect } from "react"
import { Search, Box, Anchor, MapPin, Calendar, CheckCircle2, Clock } from "lucide-react"

export default function ClientContainersPage() {
  const [containers, setContainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/client/containers")
      .then(res => {
        if (res.status === 401) {
          window.location.href = "/client/login"
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.success) setContainers(data.containers || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = containers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (c.containerNumber && c.containerNumber.toLowerCase().includes(q)) ||
      (c.sealNumber && c.sealNumber.toLowerCase().includes(q)) ||
      (c.bolNumber && c.bolNumber.toLowerCase().includes(q)) ||
      (c.vesselName && c.vesselName.toLowerCase().includes(q)) ||
      (c.currentLocation && c.currentLocation.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-400 text-sm">Loading container allocations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Container Tracking</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Real-time positions, seal verification, and vessel itineraries for your assigned containers.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Container #, Seal #, Vessel..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Containers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center font-black">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono font-black text-white text-base">{c.containerNumber}</div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase">{c.type || "40HC"} Container</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {c.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500 font-bold">BOL Reference:</span>
                <span className="font-mono font-bold text-white">{c.bolNumber}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500 font-bold">Seal Number:</span>
                <span className="font-mono font-bold text-amber-400">{c.sealNumber || "Pending"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500 font-bold">Commodity:</span>
                <span className="font-medium text-white truncate max-w-[160px]">{c.commodity || "General"}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Current Location: <strong className="text-white">{c.currentLocation}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Anchor className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Vessel: <strong className="text-white">{c.vesselName}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>ETA: <strong className="text-white">{c.eta}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-12 text-center text-slate-500 font-bold bg-slate-900 rounded-3xl border border-slate-800">
          No authorized containers found.
        </div>
      )}
    </div>
  )
}
