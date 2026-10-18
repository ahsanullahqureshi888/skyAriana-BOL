"use client"

import React, { useState, useEffect } from "react"
import { Ship, Package, Calendar, AlertTriangle, Clock, MapPin, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BookingTable } from "./booking-table"
import { ContainerTable } from "./container-table"
import { FreeTimeTracker } from "./free-time-tracker"
import { BookingService } from "@/lib/services/booking-service"
import { BookingMaster, ContainerLifecycle } from "@/lib/types/booking"

export function BookingContainerCenter() {
  const [activeTab, setActiveTab] = useState<"bookings" | "containers" | "calendar" | "attention">("bookings")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [bookings, setBookings] = useState<BookingMaster[]>([])
  const [containers, setContainers] = useState<ContainerLifecycle[]>([])

  useEffect(() => {
    // Load from local storage service
    setBookings(BookingService.getBookings())
    setContainers(BookingService.getContainers())
  }, [])

  const gateInPending = containers.filter(c => c.status === "VGM Ready" || c.status === "Stuffed").length
  const freeTimeAlerts = containers.filter(c => {
    // Mock logic for free time alerts in summary
    return c.emptyReturnDate === undefined && c.dischargeDate !== undefined
  }).length
  const returnPending = containers.filter(c => c.status === "Delivered").length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ship className="h-6 w-6 text-blue-600" />
            BOOKING & CONTAINER CONTROL CENTER
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Bookings • Containers • Shipping Lines • Vessel Planning</p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search Booking / Container / Vessel..." 
            className="pl-9 bg-white border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-semibold text-slate-500 mb-1">Confirmed</span>
            <span className="text-2xl font-black text-slate-900">{bookings.filter(b => b.status === "CONFIRMED").length}</span>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-semibold text-amber-700 mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Gate-In Pending
            </span>
            <span className="text-2xl font-black text-amber-900">{gateInPending}</span>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-semibold text-emerald-700 mb-1 flex items-center gap-1">
              <Ship className="h-3 w-3" /> Sailing
            </span>
            <span className="text-2xl font-black text-emerald-900">{containers.filter(c => c.status === "In Transit").length}</span>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-200 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-semibold text-rose-700 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Free Time Alert
            </span>
            <span className="text-2xl font-black text-rose-900">{freeTimeAlerts}</span>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-semibold text-purple-700 mb-1 flex items-center gap-1">
              <Package className="h-3 w-3" /> Return Pending
            </span>
            <span className="text-2xl font-black text-purple-900">{returnPending}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button 
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Bookings
        </button>
        <button 
          onClick={() => setActiveTab("containers")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'containers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Containers
        </button>
        <button 
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Calendar
        </button>
        <button 
          onClick={() => setActiveTab("attention")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attention' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Needs Attention
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "bookings" && (
          <BookingTable bookings={bookings} searchQuery={searchQuery} />
        )}
        {activeTab === "containers" && (
          <ContainerTable containers={containers} searchQuery={searchQuery} />
        )}
        {activeTab === "calendar" && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Calendar className="h-12 w-12 mb-4 opacity-20" />
            <p>Calendar view coming soon.</p>
          </div>
        )}
        {activeTab === "attention" && (
          <div className="max-w-4xl mx-auto py-8">
            <FreeTimeTracker />
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingContainerCenter
