"use client"

import React, { useState } from "react"
import { BookingMaster } from "@/lib/types/booking"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Ship, CalendarDays, MoreHorizontal } from "lucide-react"
import { BookingDetailModal } from "./booking-detail-modal"

export function BookingTable({ bookings, searchQuery }: { bookings: BookingMaster[], searchQuery: string }) {
  const [selectedBooking, setSelectedBooking] = useState<BookingMaster | null>(null)

  const filtered = bookings.filter(b => 
    !searchQuery || 
    b.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.vessel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.shipper?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-100 text-emerald-800'
      case 'PENDING_CONFIRMATION': return 'bg-amber-100 text-amber-800'
      case 'SAILED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3">Booking No.</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Containers</th>
              <th className="px-4 py-3">Vessel / Voyage</th>
              <th className="px-4 py-3">ETD</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              filtered.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {booking.bookingNumber || "PENDING"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${getStatusColor(booking.status)} border-transparent`}>
                      {booking.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-slate-700">{booking.pol}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium text-slate-700">{booking.pod}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {booking.containerQuantity} × {booking.containerType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {booking.vessel ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                        <Ship className="h-3 w-3" />
                        {booking.vessel} {booking.voyage && `| ${booking.voyage}`}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">TBA</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {booking.etd ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CalendarDays className="h-3 w-3" />
                        {booking.etd}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">TBA</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-blue-600 hover:bg-blue-50"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {selectedBooking && (
        <BookingDetailModal 
          open={!!selectedBooking} 
          onOpenChange={(v) => !v && setSelectedBooking(null)} 
          booking={selectedBooking} 
        />
      )}
    </div>
  )
}
