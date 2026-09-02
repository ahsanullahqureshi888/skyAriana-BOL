"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Compass,
  Ship,
  Truck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Clock,
  ThermometerSnowflake,
  ShieldAlert,
  Sparkles,
  Layers,
  Copy,
  ChevronRight,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useApp } from "@/lib/app-context"

interface RouteOptimizerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyRoute?: (corridorId: string) => void
}

interface CorridorAnalysis {
  id: string
  name: string
  namePersian: string
  corridorType: "Reefer" | "Standard Dry" | "Rail / Intermodal"
  origin: string
  intermediate: string
  destination: string
  totalDistanceKm: number
  transitDays: number
  landCostUSD: number
  oceanCostUSD: number
  accessorialsUSD: number
  totalCostUSD: number
  recommendedPriceUSD: number
  marginPercent: number
  securityRating: "High" | "Medium" | "Monitored"
  escortRequired: boolean
  temperatureC?: string
}

const CORRIDORS: CorridorAnalysis[] = [
  {
    id: "corridor-dgh-mersin-nhava",
    name: "Dogharon ➔ Mersin Port ➔ Nhava Sheva",
    namePersian: "دوغارون به بندر مرسین و نهاوا شیوا هند (ریفر تخصصی)",
    corridorType: "Reefer",
    origin: "Islam Qala / Dogharon",
    intermediate: "Mersin Port (Turkey)",
    destination: "Nhava Sheva (India)",
    totalDistanceKm: 6420,
    transitDays: 18,
    landCostUSD: 5570,
    oceanCostUSD: 7020, // includes 8% TRF
    accessorialsUSD: 650, // plugging + escort
    totalCostUSD: 13240,
    recommendedPriceUSD: 15576,
    marginPercent: 15.0,
    securityRating: "High",
    escortRequired: true,
    temperatureC: "-18°C Frozen",
  },
  {
    id: "corridor-nimroz-abbas-jebel",
    name: "Zaranj / Nimroz ➔ Bandar Abbas ➔ Jebel Ali",
    namePersian: "زرنج نیمروز به بندرعباس و جبل علی دبی",
    corridorType: "Standard Dry",
    origin: "Zaranj / Milak Border",
    intermediate: "Bandar Abbas (Iran)",
    destination: "Jebel Ali / Dubai (UAE)",
    totalDistanceKm: 1850,
    transitDays: 7,
    landCostUSD: 3400,
    oceanCostUSD: 2850,
    accessorialsUSD: 350,
    totalCostUSD: 6600,
    recommendedPriceUSD: 7765,
    marginPercent: 15.0,
    securityRating: "High",
    escortRequired: false,
  },
  {
    id: "corridor-chabahar-mumbai",
    name: "Milak / Nimroz ➔ Chabahar Port ➔ Mumbai",
    namePersian: "مسیر ترانزیت چابهار به بندر بمبئی هند",
    corridorType: "Reefer",
    origin: "Zaranj / Nimroz",
    intermediate: "Chabahar Port (Iran)",
    destination: "Mumbai / Mundra (India)",
    totalDistanceKm: 2400,
    transitDays: 9,
    landCostUSD: 3800,
    oceanCostUSD: 3600,
    accessorialsUSD: 450,
    totalCostUSD: 7850,
    recommendedPriceUSD: 9235,
    marginPercent: 15.0,
    securityRating: "Monitored",
    escortRequired: true,
    temperatureC: "+4°C Chilled",
  },
  {
    id: "corridor-torghundi-poti",
    name: "Torghundi ➔ Caspian Rail ➔ Poti / Black Sea",
    namePersian: "تورغندی به ترانزیت ریلی خزر و بندر پوتی گرجستان",
    corridorType: "Rail / Intermodal",
    origin: "Torghundi Border",
    intermediate: "Turkmenbashi / Baku",
    destination: "Poti Port (Georgia / EU)",
    totalDistanceKm: 4200,
    transitDays: 22,
    landCostUSD: 6200,
    oceanCostUSD: 4500,
    accessorialsUSD: 800,
    totalCostUSD: 11500,
    recommendedPriceUSD: 13529,
    marginPercent: 15.0,
    securityRating: "Monitored",
    escortRequired: false,
  },
]

export function RouteOptimizerModal({ open, onOpenChange, onApplyRoute }: RouteOptimizerModalProps) {
  const { setView } = useApp()
  const [selectedId, setSelectedId] = useState<string>("corridor-dgh-mersin-nhava")
  const selectedCorridor = CORRIDORS.find((c) => c.id === selectedId) || CORRIDORS[0]

  const handleApply = () => {
    if (onApplyRoute) {
      onApplyRoute(selectedId)
    } else {
      setView("export-calculator")
    }
    toast.success(`Applied ${selectedCorridor.name}`, {
      description: "Corridor routing, transit legs, and cost specs synchronized.",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl bg-slate-950 text-white border-slate-800 shadow-2xl">
        <DialogHeader className="p-5 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Multi-Corridor Route Cost Optimizer</span>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold">
                    AI Logistics Engine
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium">
                  Compare Afghan transit corridors, border clearance, reefer plugging, and net margins
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Corridor Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CORRIDORS.map((corridor) => {
              const isSelected = corridor.id === selectedId
              return (
                <div
                  key={corridor.id}
                  onClick={() => setSelectedId(corridor.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2.5 ${
                    isSelected
                      ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50 ring-1 ring-blue-500"
                      : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white">{corridor.name}</span>
                        {corridor.corridorType === "Reefer" && (
                          <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[9px] py-0 px-1.5 font-bold">
                            <ThermometerSnowflake className="w-2.5 h-2.5 mr-0.5" />
                            {corridor.temperatureC || "Reefer"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-[vazirmatn] font-bold" dir="rtl">
                        {corridor.namePersian}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-[10px]">
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block">Est. Transit</span>
                      <span className="font-mono font-bold text-slate-200">{corridor.transitDays} Days</span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block">Base Cost</span>
                      <span className="font-mono font-bold text-slate-200">${corridor.totalCostUSD.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block">Quote Rate</span>
                      <span className="font-mono font-bold text-emerald-400">${corridor.recommendedPriceUSD.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Corridor Detailed Inspection Pane */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-slate-900/60 to-slate-950 border border-blue-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                  Detailed Cost & Invariance Specification
                </span>
                <h3 className="text-sm font-black text-white">{selectedCorridor.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs font-mono font-bold">
                  Margin: {selectedCorridor.marginPercent}%
                </Badge>
                <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-xs font-mono font-bold">
                  {selectedCorridor.totalDistanceKm.toLocaleString()} KM
                </Badge>
              </div>
            </div>

            {/* Cost Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                  <Truck className="w-3 h-3 text-amber-400" />
                  Land & Border Transit
                </span>
                <span className="text-sm font-black font-mono text-white">${selectedCorridor.landCostUSD.toLocaleString()} USD</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                  <Ship className="w-3 h-3 text-blue-400" />
                  Ocean / Maritime Freight
                </span>
                <span className="text-sm font-black font-mono text-white">${selectedCorridor.oceanCostUSD.toLocaleString()} USD</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                  <ThermometerSnowflake className="w-3 h-3 text-cyan-400" />
                  Escort & Accessorials
                </span>
                <span className="text-sm font-black font-mono text-cyan-300">${selectedCorridor.accessorialsUSD.toLocaleString()} USD</span>
              </div>

              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-400 block flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  Target Client Quote
                </span>
                <span className="text-sm font-black font-mono text-emerald-300">${selectedCorridor.recommendedPriceUSD.toLocaleString()} USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 cursor-pointer"
          >
            <span>Apply Route to BOL & Quote Engine</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

