"use client"

import React, { useState, useEffect } from "react"
import { BookingMaster, TransportLeg, ContainerLifecycle } from "@/lib/types/booking"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingService } from "@/lib/services/booking-service"
import { FileText, Ship, Anchor, AlertTriangle, Truck } from "lucide-react"

export function BookingDetailModal({ 
  open, 
  onOpenChange, 
  booking 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  booking: BookingMaster 
}) {
  const [containers, setContainers] = useState<ContainerLifecycle[]>([])

  useEffect(() => {
    if (booking?.id) {
      setContainers(BookingService.getContainersByBooking(booking.id))
    }
  }, [booking])

  if (!booking) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                {booking.bookingNumber}
                <Badge variant="outline" className="bg-white text-slate-700">{booking.status.replace(/_/g, ' ')}</Badge>
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                {booking.shipper}
              </p>
            </div>
            <Button variant="outline" className="bg-white">
              <FileText className="h-4 w-4 mr-2 text-slate-600" />
              Booking PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="routing">Multi-Leg Routing</TabsTrigger>
              <TabsTrigger value="containers">Containers ({containers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Port of Loading</p>
                  <p className="text-sm font-semibold text-slate-900">{booking.pol}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Port of Discharge</p>
                  <p className="text-sm font-semibold text-slate-900">{booking.pod}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Commodity</p>
                  <p className="text-sm font-semibold text-slate-900">{booking.commodity}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Volume</p>
                  <p className="text-sm font-semibold text-slate-900">{booking.containerQuantity} × {booking.containerType}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Cut-Offs
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="border-l-2 border-slate-200 pl-3">
                    <p className="text-slate-500 text-xs">VGM Cut-Off</p>
                    <p className="font-medium text-slate-900">{booking.cutOffs?.vgm || "TBA"}</p>
                  </div>
                  <div className="border-l-2 border-slate-200 pl-3">
                    <p className="text-slate-500 text-xs">Gate-In Cut-Off</p>
                    <p className="font-medium text-slate-900">{booking.cutOffs?.gateIn || "TBA"}</p>
                  </div>
                  <div className="border-l-2 border-slate-200 pl-3">
                    <p className="text-slate-500 text-xs">Doc Cut-Off</p>
                    <p className="font-medium text-slate-900">{booking.cutOffs?.documentation || "TBA"}</p>
                  </div>
                  <div className="border-l-2 border-slate-200 pl-3">
                    <p className="text-slate-500 text-xs">SI Cut-Off</p>
                    <p className="font-medium text-slate-900">{booking.cutOffs?.si || "TBA"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="routing" className="space-y-4">
              {(!booking.transportLegs || booking.transportLegs.length === 0) ? (
                <div className="text-center py-8 text-slate-500">
                  <Anchor className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No routing legs defined.
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-100 ml-4 pl-6 space-y-6 py-2">
                  {booking.transportLegs.sort((a,b) => a.legOrder - b.legOrder).map((leg) => (
                    <div key={leg.id} className="relative">
                      <div className="absolute -left-[35px] top-1 h-6 w-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600">
                        {leg.mode === "ocean" ? <Ship className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-sm">
                            Leg {leg.legOrder}: {leg.origin} → {leg.destination}
                          </h4>
                          <Badge variant="secondary" className="bg-slate-100">{leg.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Vessel:</span>
                            <p className="font-medium">{leg.vessel || "TBA"} {leg.voyage}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">ETD:</span>
                            <p className="font-medium">{leg.etd || "TBA"}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">ETA:</span>
                            <p className="font-medium">{leg.eta || "TBA"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="containers">
              {containers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No containers assigned to this booking yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {containers.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{c.containerNumber}</p>
                        <p className="text-xs text-slate-500">{c.containerType} • {c.ownerType}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
