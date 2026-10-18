'use client'

import React, { useState, useMemo } from 'react'
import {
  Plane,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Upload,
  RefreshCw,
  Eye,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Scale,
  GitCommit,
  Building,
  AlertOctagon,
  Lock,
  Unlock,
  X,
} from 'lucide-react'
import {
  AirShipmentBoardItem,
  AirBookingRecord,
  FlightRecord,
  AirLegRecord,
  MAWBRecord,
  HAWBRecord,
  CargoAcceptanceRecord,
  AirReleaseTracker,
  OffloadRecord,
  AirSummaryKpi,
} from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'
import { AirBookingModal } from './air-booking-modal'
import { FlightModal } from './flight-modal'
import { AirLegModal } from './air-leg-modal'
import { CargoAcceptanceModal } from './cargo-acceptance-modal'
import { AWBWorkflowModal } from './awb-workflow-modal'
import { OffloadRebookingModal } from './offload-rebooking-modal'
import { ThreeWayReleaseModal } from './three-way-release-modal'
import { AirShipmentDetailModal } from './air-shipment-detail-modal'
import { AirOperationsReportPdf } from './documents/air-operations-report-pdf'
import { AirShipmentSheetPdf } from './documents/air-shipment-sheet-pdf'

export function AirFreightCenter() {
  const store = airFreightStore

  // Operational State
  const [activeTab, setActiveTab] = useState<
    'shipments' | 'flights' | 'arrivals' | 'transit' | 'offloads' | 'awb' | 'directory' | 'import'
  >('shipments')

  const [searchQuery, setSearchQuery] = useState('')
  const [airlineFilter, setAirlineFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false)
  const [isLegModalOpen, setIsLegModalOpen] = useState(false)
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false)
  const [isAwbModalOpen, setIsAwbModalOpen] = useState(false)
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false)
  const [isOffloadModalOpen, setIsOffloadModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false)
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false)

  // Selected Records
  const [selectedBooking, setSelectedBooking] = useState<AirBookingRecord | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<FlightRecord | null>(null)
  const [selectedLeg, setSelectedLeg] = useState<AirLegRecord | null>(null)
  const [selectedAcceptance, setSelectedAcceptance] = useState<CargoAcceptanceRecord | null>(null)
  const [selectedMawb, setSelectedMawb] = useState<MAWBRecord | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<AirReleaseTracker | null>(null)

  // CSV Import Text state
  const [csvText, setCsvText] = useState('')
  const [csvFeedback, setCsvFeedback] = useState<{ imported: number; errors: string[] } | null>(null)

  // Reactive trigger
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  // Data queries
  const kpis: AirSummaryKpi = useMemo(() => store.getSummaryKpis(), [store, tick])
  const boardItems: AirShipmentBoardItem[] = useMemo(() => store.getShipmentBoardItems(), [store, tick])
  const flights: FlightRecord[] = useMemo(() => store.getFlights(), [store, tick])
  const legs: AirLegRecord[] = useMemo(() => store.getLegs(), [store, tick])
  const offloads: OffloadRecord[] = useMemo(() => store.getOffloads(), [store, tick])
  const mawbs: MAWBRecord[] = useMemo(() => store.getMawbs(), [store, tick])
  const hawbs: HAWBRecord[] = useMemo(() => store.getHawbs(), [store, tick])
  const airlines = useMemo(() => store.getAirlines(), [store, tick])
  const terminals = useMemo(() => store.getTerminals(), [store, tick])

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return boardItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.bookingReference.toLowerCase().includes(q) ||
        item.mawbNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.currentFlightNumber.toLowerCase().includes(q) ||
        item.originAirportIata.toLowerCase().includes(q) ||
        item.destinationAirportIata.toLowerCase().includes(q)

      const matchesAirline = airlineFilter === 'ALL' || item.airlineName.includes(airlineFilter)
      const matchesStatus = statusFilter === 'ALL' || item.shipmentStatus === statusFilter

      return matchesSearch && matchesAirline && matchesStatus
    })
  }, [boardItems, searchQuery, airlineFilter, statusFilter])

  // Handler helpers
  const handleOpenDetail = (bookingId: string) => {
    const b = store.getBookings().find((bk) => bk.id === bookingId)
    if (b) {
      setSelectedBooking(b)
      setIsDetailModalOpen(true)
    }
  }

  const handleOpenAcceptanceForBooking = (b: AirBookingRecord) => {
    setSelectedBooking(b)
    const acc = store.getAcceptances().find((a) => a.bookingId === b.id)
    setSelectedAcceptance(acc || null)
    setIsAcceptanceModalOpen(true)
  }

  const handleOpenAwbForBooking = (b: AirBookingRecord) => {
    setSelectedBooking(b)
    const m = store.getMawbs().find((item) => item.bookingId === b.id || item.mawbNumber === b.mawbNumber)
    setSelectedMawb(m || null)
    setIsAwbModalOpen(true)
  }

  const handleOpenReleaseForBooking = (b: AirBookingRecord) => {
    setSelectedBooking(b)
    const r = store.getReleases().find((rel) => rel.bookingId === b.id)
    if (r) {
      setSelectedRelease(r)
      setIsReleaseModalOpen(true)
    }
  }

  const handleOpenOffloadForBooking = (b: AirBookingRecord) => {
    setSelectedBooking(b)
    setIsOffloadModalOpen(true)
  }

  const handleOpenPrintForBooking = (b: AirBookingRecord) => {
    setSelectedBooking(b)
    setIsPrintSheetOpen(true)
  }

  const handleCsvImport = () => {
    if (!csvText.trim()) return
    const res = store.importFlightScheduleCsv(csvText)
    setCsvFeedback(res)
    refresh()
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl shadow-lg shadow-sky-500/20 text-white">
            <Plane className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Air Freight & AWB Operations Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Phase 23 Active
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              End-to-end air cargo command: Airlines, MAWB/HAWB, Flight Schedules, 3-Way Release & Offloads
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPrintReportOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Print Report
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedFlight(null)
              setIsFlightModalOpen(true)
            }}
            className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            + Flight Schedule
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedBooking(null)
              setIsBookingModalOpen(true)
            }}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + New Air Booking
          </button>
        </div>
      </div>

      {/* 2. 13 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Active Air</span>
          <span className="text-xl font-bold text-white font-mono">{kpis.activeAirShipments}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Booking Pending</span>
          <span className="text-xl font-bold text-amber-400 font-mono">{kpis.bookingPending}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Awaiting Acc.</span>
          <span className="text-xl font-bold text-indigo-400 font-mono">{kpis.awaitingAcceptance}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Cargo Accepted</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">{kpis.cargoAccepted}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">AWB Pending</span>
          <span className="text-xl font-bold text-rose-400 font-mono">{kpis.awbPending}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Flight Confirmed</span>
          <span className="text-xl font-bold text-sky-400 font-mono">{kpis.flightConfirmed}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Departing Today</span>
          <span className="text-xl font-bold text-cyan-400 font-mono">{kpis.departingToday}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">In Transit</span>
          <span className="text-xl font-bold text-purple-400 font-mono">{kpis.inTransit}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">At Transit Hub</span>
          <span className="text-xl font-bold text-amber-300 font-mono">{kpis.atTransitAirport}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Offloaded</span>
          <span className="text-xl font-bold text-rose-500 font-mono">{kpis.offloaded}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Arriving Soon</span>
          <span className="text-xl font-bold text-teal-400 font-mono">{kpis.arrivingSoon}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Arrived</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">{kpis.arrived}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl col-span-2 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Release Pending</span>
          <span className="text-xl font-bold text-amber-500 font-mono">{kpis.releasePending}</span>
        </div>
      </div>

      {/* 3. Operational Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'shipments', label: `Air Shipments (${boardItems.length})`, icon: Plane },
          { id: 'flights', label: `Flight Board (${flights.length})`, icon: Calendar },
          { id: 'arrivals', label: 'Arrivals & Dwell', icon: Clock },
          { id: 'transit', label: `Connecting Transit (${legs.filter((l) => l.legNumber > 1).length})`, icon: GitCommit },
          { id: 'offloads', label: `Offloads & Irregularities (${offloads.length})`, icon: AlertOctagon },
          { id: 'awb', label: `AWB Register (${mawbs.length})`, icon: FileText },
          { id: 'directory', label: `Airlines & Terminals (${airlines.length})`, icon: Building },
          { id: 'import', label: 'CSV Schedule & Backup', icon: Upload },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: ALL AIR SHIPMENTS */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Booking, MAWB #, Shipper, Flight, Airport..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={airlineFilter}
                onChange={(e) => setAirlineFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Airlines</option>
                <option value="Kam Air">Kam Air</option>
                <option value="Ariana">Ariana Afghan Airlines</option>
                <option value="Emirates">Emirates SkyCargo</option>
                <option value="Qatar">Qatar Airways</option>
                <option value="Turkish">Turkish Cargo</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="CARGO_RECEIVED">CARGO_RECEIVED</option>
                <option value="ACCEPTED_BY_AIRLINE">ACCEPTED_BY_AIRLINE</option>
                <option value="FLIGHT_CONFIRMED">FLIGHT_CONFIRMED</option>
                <option value="DEPARTED">DEPARTED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="ARRIVED">ARRIVED</option>
                <option value="CARGO_AVAILABLE">CARGO_AVAILABLE</option>
                <option value="OFFLOADED">OFFLOADED</option>
                <option value="REBOOKED">REBOOKED</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">MAWB #</th>
                    <th className="py-3 px-4">Airline & Flight</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Shipper / Client</th>
                    <th className="py-3 px-4">Pkgs / Chrg Wt</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">3-Way Release</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredShipments.map((item) => {
                    const rawBooking = store.getBookings().find((b) => b.id === item.id)
                    const releaseRec = store.getReleases().find((r) => r.bookingId === item.id)

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-400">
                          {item.bookingReference}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {item.mawbNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.airlineName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.currentFlightNumber} • {item.flightDate}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-200 flex items-center gap-1.5">
                            <span>{item.originAirportIata}</span>
                            <span>✈️</span>
                            <span>{item.destinationAirportIata}</span>
                          </div>
                          {item.isTransit && (
                            <span className="text-[10px] text-amber-400 block font-semibold">
                              Multi-Leg Transit ({item.totalLegs} legs)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="block truncate max-w-[150px]">{item.customerName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-white">{item.packagesCount} pcs</span>
                          <span className="text-slate-400 block text-[11px]">
                            {item.chargeableWeightKg} kg chrg
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {item.shipmentStatus.replace(/_/g, ' ')}
                          </span>
                          {item.attentionReason && (
                            <span className="text-[10px] text-amber-400 block font-medium mt-0.5">
                              ⚠️ {item.attentionReason}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {releaseRec?.cargoAvailableForPickup ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              CLEARED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item.id)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                              title="View Air Shipment Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {rawBooking && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrintForBooking(rawBooking)}
                                  className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Print Movement Sheet"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReleaseForBooking(rawBooking)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-slate-700 rounded-lg transition-colors"
                                  title="3-Way Release Control"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLIGHT BOARD */}
      {activeTab === 'flights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Commercial Cargo Flight Schedules & Status
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedFlight(null)
                setIsFlightModalOpen(true)
              }}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Flight
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-sky-400">{flight.flightNumber}</span>
                    <span className="text-xs text-slate-300">({flight.airlineName})</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {flight.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ORIGIN</span>
                    <span className="font-bold text-white text-sm">{flight.originAirportIata}</span>
                    <span className="text-[11px] text-slate-400 block">{flight.scheduledDeparture}</span>
                  </div>
                  <Plane className="w-5 h-5 text-sky-500" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">DESTINATION</span>
                    <span className="font-bold text-white text-sm">{flight.destinationAirportIata}</span>
                    <span className="text-[11px] text-slate-400 block">{flight.scheduledArrival}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Aircraft: {flight.aircraftType || 'Boeing 737'}</span>
                  <span>Date: {flight.flightDate}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFlight(flight)
                      setIsFlightModalOpen(true)
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                  >
                    Edit / Milestones
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ARRIVALS & DWELL */}
      {activeTab === 'arrivals' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-white">Destination Arrival & Airport Cargo Dwell</h3>
            <p className="text-xs text-slate-400">
              Shipments arrived at destination airport awaiting terminal clearance and consignee release:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boardItems
              .filter((item) => ['ARRIVED', 'CARGO_AVAILABLE'].includes(item.shipmentStatus))
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-sky-400">{item.bookingReference}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.shipmentStatus}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    MAWB: <strong className="font-mono text-white">{item.mawbNumber}</strong> | Consignee:{' '}
                    <strong>{item.customerName}</strong>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Landed at {item.destinationAirportIata} on flight {item.currentFlightNumber}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                    >
                      Inspect Release
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONNECTING TRANSIT */}
      {activeTab === 'transit' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-white">Connecting Multi-Leg Transit & Ramp Dwell</h3>
            <p className="text-xs text-slate-400">
              Cargo moving across multiple airport connection hubs with transit dwell monitoring:
            </p>
          </div>

          <div className="space-y-3">
            {boardItems
              .filter((i) => i.isTransit)
              .map((item) => (
                <div
                  key={item.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-sky-400">{item.bookingReference}</span>
                      <span className="text-xs text-slate-400 font-mono">({item.mawbNumber})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        TRANSIT HUB ACTIVE
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Route: {item.originAirportIata} ➡️ {item.destinationAirportIata} ({item.totalLegs} segments)
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                    >
                      View Segments
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: OFFLOADS */}
      {activeTab === 'offloads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Cargo Offloads & Aircraft Capacity Exceptions
            </h3>
          </div>

          <div className="space-y-3">
            {offloads.map((o) => (
              <div
                key={o.id}
                className="bg-slate-900 border border-rose-900/60 p-5 rounded-xl shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-rose-400">{o.bookingReference}</span>
                    <span className="text-xs text-slate-400 font-mono">MAWB: {o.mawbNumber}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {o.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">OFFLOADED FLIGHT</span>
                    <span className="font-mono text-white font-bold">{o.originalFlightNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">STATION AIRPORT</span>
                    <span className="font-mono text-white font-bold">{o.offloadAirportIata}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">REBOOKED FLIGHT</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {o.rebookedFlightNumber || 'Awaiting Rebook'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">LOGGED BY</span>
                    <span className="text-slate-300">{o.recordedBy}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <strong>Reason ({o.reason.replace(/_/g, ' ')}):</strong> {o.detailedReason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: AWB REGISTER */}
      {activeTab === 'awb' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Air Waybill Register (MAWB & HAWB)
            </h3>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">MAWB #</th>
                  <th className="py-3 px-4">Carrier</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Booking</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Draft Ver</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mawbs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{m.mawbNumber}</td>
                    <td className="py-3 px-4 text-white font-medium">{m.airlineName}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{m.awbPrefix}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{m.bookingReference}</td>
                    <td className="py-3 px-4 font-mono">
                      {m.originAirportIata} ➡️ {m.destinationAirportIata}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">v{m.currentDraftVersion}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: AIRLINES & TERMINALS DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Airlines */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Partner Airlines Directory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {airlines.map((a) => (
                <div key={a.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{a.displayName}</span>
                    <span className="font-mono text-sky-400 font-bold">{a.iataCode} • Prefix {a.awbPrefix}</span>
                  </div>
                  <p className="text-slate-400">{a.notes || a.legalName}</p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    Contact: {a.cargoContact || a.bookingContact || 'ops@airline.com'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminals */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Airport Cargo Terminals & Ground Handling
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {terminals.map((t) => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{t.terminalName}</span>
                    <span className="font-mono text-emerald-400 font-bold">{t.airportIata}</span>
                  </div>
                  <p className="text-slate-400">Handling: {t.handlingAgentName}</p>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-300">
                    <span>Customs: {t.customsOnsite ? '✅ Yes' : '❌ No'}</span>
                    <span>Cold Chain: {t.coldStorageAvailable ? '✅ Yes' : '❌ No'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: CSV IMPORT & BACKUP */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Import Airline Flight Schedules (CSV)</h3>
            <p className="text-xs text-slate-400">
              Paste CSV rows with headers:{' '}
              <code className="text-sky-300 font-mono">
                flightNumber,airlineId,origin,destination,departureTime,arrivalTime,aircraft
              </code>
            </p>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="FG-715,airl-fg,KBL,DXB,2026-03-29T09:30:00Z,2026-03-29T12:30:00Z,B737-800"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCsvImport}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Parse & Import Schedule
              </button>
              {csvFeedback && (
                <span className="text-xs text-emerald-400 font-semibold">
                  Imported {csvFeedback.imported} flight(s). Errors: {csvFeedback.errors.length}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-white">JSON State Snapshot</h3>
            <p className="text-xs text-slate-400">
              Export entire Air Freight operations state (bookings, flights, legs, AWB records, releases) to JSON:
            </p>
            <button
              type="button"
              onClick={() => {
                const json = store.exportStateJson()
                const blob = new Blob([json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `air-freight-state-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                setTimeout(() => URL.revokeObjectURL(url), 150)
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" /> Export JSON Snapshot
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isBookingModalOpen && (
        <AirBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false)
            setSelectedBooking(null)
          }}
          onSave={() => {
            refresh()
          }}
          existingBooking={selectedBooking}
        />
      )}

      {isFlightModalOpen && (
        <FlightModal
          isOpen={isFlightModalOpen}
          onClose={() => {
            setIsFlightModalOpen(false)
            setSelectedFlight(null)
          }}
          onSave={() => {
            refresh()
          }}
          existingFlight={selectedFlight}
        />
      )}

      {isAcceptanceModalOpen && selectedBooking && (
        <CargoAcceptanceModal
          isOpen={isAcceptanceModalOpen}
          onClose={() => setIsAcceptanceModalOpen(false)}
          onSave={() => refresh()}
          bookingId={selectedBooking.id}
          bookingReference={selectedBooking.bookingReference}
          existingAcceptance={selectedAcceptance}
        />
      )}

      {isAwbModalOpen && selectedBooking && (
        <AWBWorkflowModal
          isOpen={isAwbModalOpen}
          onClose={() => setIsAwbModalOpen(false)}
          onSaveMawb={() => refresh()}
          bookingId={selectedBooking.id}
          bookingReference={selectedBooking.bookingReference}
          existingMawb={selectedMawb}
        />
      )}

      {isReleaseModalOpen && selectedBooking && selectedRelease && (
        <ThreeWayReleaseModal
          isOpen={isReleaseModalOpen}
          onClose={() => setIsReleaseModalOpen(false)}
          onSave={() => refresh()}
          releaseTracker={selectedRelease}
          bookingReference={selectedBooking.bookingReference}
        />
      )}

      {isOffloadModalOpen && selectedBooking && (
        <OffloadRebookingModal
          isOpen={isOffloadModalOpen}
          onClose={() => setIsOffloadModalOpen(false)}
          onSave={() => refresh()}
          bookingId={selectedBooking.id}
          bookingReference={selectedBooking.bookingReference}
          currentFlightNumber={selectedBooking.flightNumber}
          originAirportIata={selectedBooking.originAirportIata}
        />
      )}

      {isDetailModalOpen && selectedBooking && (
        <AirShipmentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          onEditBooking={(b) => {
            setIsDetailModalOpen(false)
            setSelectedBooking(b)
            setIsBookingModalOpen(true)
          }}
          onOpenAcceptance={() => {
            setIsDetailModalOpen(false)
            handleOpenAcceptanceForBooking(selectedBooking)
          }}
          onOpenAwb={() => {
            setIsDetailModalOpen(false)
            handleOpenAwbForBooking(selectedBooking)
          }}
          onOpenRelease={() => {
            setIsDetailModalOpen(false)
            handleOpenReleaseForBooking(selectedBooking)
          }}
          onOpenOffload={() => {
            setIsDetailModalOpen(false)
            handleOpenOffloadForBooking(selectedBooking)
          }}
          onOpenPrint={() => {
            setIsDetailModalOpen(false)
            handleOpenPrintForBooking(selectedBooking)
          }}
        />
      )}

      {/* Printable Sheet Modal */}
      {isPrintSheetOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-bold text-white">Print Preview: Air Shipment Movement Sheet</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintSheetOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-800/50">
              <AirShipmentSheetPdf
                booking={selectedBooking}
                legs={legs.filter((l) => l.bookingId === selectedBooking.id)}
                mawb={mawbs.find((m) => m.bookingId === selectedBooking.id)}
                acceptance={store.getAcceptances().find((a) => a.bookingId === selectedBooking.id)}
                release={store.getReleases().find((r) => r.bookingId === selectedBooking.id)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Master Operations Report Modal */}
      {isPrintReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-bold text-white">Print Preview: Air Operations Master Report</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintReportOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-800/50">
              <AirOperationsReportPdf
                shipments={boardItems}
                flights={flights}
                offloads={offloads}
                kpis={kpis}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
