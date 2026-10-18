"use client"

import React, { useState, useEffect } from "react"
import { ContainerLifecycle, ContainerEvent } from "@/lib/types/booking"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, Ship, Anchor, CheckCircle2, Clock } from "lucide-react"
import { BookingService, FreeDayEngine } from "@/lib/services/booking-service"

export function ContainerJourneyModal({ 
  open, 
  onOpenChange, 
  container 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  container: ContainerLifecycle 
}) {
  const [events, setEvents] = useState<ContainerEvent[]>([])

  useEffect(() => {
    if (container?.id) {
      setEvents(BookingService.getEvents(container.id))
    }
  }, [container])

  if (!container) return null

  const getJourneySteps = () => {
    return [
      { key: "emptyReleaseDate", label: "Empty Released", icon: <Package className="h-4 w-4" /> },
      { key: "emptyPickupDate", label: "Empty Picked Up", icon: <Truck className="h-4 w-4" /> },
      { key: "stuffingDate", label: "Stuffed", icon: <Package className="h-4 w-4" /> },
      { key: "gateInDate", label: "Gate-In", icon: <Anchor className="h-4 w-4" /> },
      { key: "loadedDate", label: "Loaded", icon: <Ship className="h-4 w-4" /> },
      { key: "dischargeDate", label: "Discharged", icon: <Anchor className="h-4 w-4" /> },
      { key: "deliveryDate", label: "Delivered", icon: <Truck className="h-4 w-4" /> },
      { key: "emptyReturnDate", label: "Empty Returned", icon: <Package className="h-4 w-4" /> },
    ]
  }

  const steps = getJourneySteps()
  const exposure = FreeDayEngine.calculateDetentionExposure(container)
  const lastFreeDay = FreeDayEngine.calculateLastFreeDay(container)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Package className="h-6 w-6 text-slate-400" />
                {container.containerNumber || "UNASSIGNED CONTAINER"}
                <Badge variant="outline" className="bg-white text-slate-700">{container.status}</Badge>
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {container.containerType} • {container.ownerType} • {container.sealNumbers?.join(", ") || "No Seals"}
              </p>
            </div>
            
            {lastFreeDay && (
              <div className={`px-4 py-2 rounded-lg border text-right ${exposure > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs font-bold ${exposure > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {exposure > 0 ? 'DETENTION INCURRED' : 'FREE TIME OK'}
                </p>
                <p className="text-sm font-black text-slate-900">
                  {exposure > 0 ? `$${exposure.toFixed(2)}` : `Exp: ${lastFreeDay.toLocaleDateString()}`}
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Lifecycle Timeline</h3>
          
          <div className="relative border-l-2 border-slate-200 ml-4 pl-8 space-y-8 py-2">
            {steps.map((step, idx) => {
              const dateVal = container[step.key as keyof ContainerLifecycle] as string | undefined
              const isCompleted = !!dateVal
              
              return (
                <div key={step.key} className="relative">
                  <div className={`absolute -left-[41px] top-0 h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white 
                    ${isCompleted ? 'border-emerald-500 text-emerald-600' : 'border-slate-200 text-slate-300'}`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
                  </div>
                  
                  <div>
                    <h4 className={`text-sm font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </h4>
                    {isCompleted ? (
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {new Date(dateVal).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        Pending
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {events.length > 0 && (
            <div className="mt-10 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> Event Log
              </h3>
              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className="text-sm flex items-start gap-3 bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-slate-500 whitespace-nowrap">{new Date(event.date).toLocaleDateString()}</span>
                    <div>
                      <span className="font-semibold text-slate-700">{event.eventType}</span>
                      {event.location && <span className="text-slate-400 ml-2">@ {event.location}</span>}
                      <p className="text-slate-600 text-xs mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
