"use client"

import React, { useState } from "react"
import { ContainerLifecycle } from "@/lib/types/booking"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, MapPin, Clock } from "lucide-react"
import { ContainerJourneyModal } from "./container-journey-modal"
import { FreeDayEngine } from "@/lib/services/booking-service"

export function ContainerTable({ containers, searchQuery }: { containers: ContainerLifecycle[], searchQuery: string }) {
  const [selectedContainer, setSelectedContainer] = useState<ContainerLifecycle | null>(null)

  const filtered = containers.filter(c => 
    !searchQuery || 
    c.containerNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sealNumbers?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Empty Released':
      case 'Empty Picked Up': return 'bg-slate-100 text-slate-800'
      case 'Stuffed':
      case 'VGM Ready': return 'bg-blue-100 text-blue-800'
      case 'Gate-In':
      case 'Loaded on Vessel': 
      case 'In Transit': return 'bg-emerald-100 text-emerald-800'
      case 'Discharged':
      case 'Delivered': return 'bg-amber-100 text-amber-800'
      case 'Empty Returned':
      case 'Completed': return 'bg-purple-100 text-purple-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const renderFreeDays = (container: ContainerLifecycle) => {
    if (container.status === 'Empty Returned' || container.status === 'Completed') {
      return <span className="text-xs text-slate-400">Returned</span>
    }

    const lastFreeDay = FreeDayEngine.calculateLastFreeDay(container)
    if (!lastFreeDay) return <span className="text-xs text-slate-400">N/A</span>

    const exposure = FreeDayEngine.calculateDetentionExposure(container)
    
    if (exposure > 0) {
      return (
        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-red-600">OVERDUE</span>
          <span className="text-[10px] text-red-500">Est. {exposure.toFixed(2)} USD</span>
        </div>
      )
    }

    const diff = lastFreeDay.getTime() - new Date().getTime()
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return (
      <div className="flex flex-col text-right">
        <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {daysLeft} Days Left
        </span>
        <span className="text-[10px] text-slate-500">Exp: {lastFreeDay.toLocaleDateString()}</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3">Container No.</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">VGM</th>
              <th className="px-4 py-3 text-right">Free Time</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No containers found.
                </td>
              </tr>
            ) : (
              filtered.map((container) => (
                <tr key={container.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{container.containerNumber || "TBA"}</span>
                      {container.ownerType && (
                        <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 h-4 border-slate-300">
                          {container.ownerType}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {container.containerType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${getStatusColor(container.status)} border-transparent`}>
                      {container.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {container.vgmStatus === 'Accepted' ? (
                        <span className="text-emerald-600 font-medium">{container.vgmWeight} {container.vgmUnit}</span>
                      ) : (
                        <span className="text-slate-400">{container.vgmStatus}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {renderFreeDays(container)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-blue-600 hover:bg-blue-50"
                      onClick={() => setSelectedContainer(container)}
                    >
                      Journey
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedContainer && (
        <ContainerJourneyModal
          open={!!selectedContainer}
          onOpenChange={(v) => !v && setSelectedContainer(null)}
          container={selectedContainer}
        />
      )}
    </div>
  )
}
