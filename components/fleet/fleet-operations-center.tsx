"use client"

import React, { useState, useMemo } from "react"
import {
  Truck,
  UserCheck,
  Navigation,
  ArrowRightLeft,
  Wrench,
  FileCheck2,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertTriangle,
  DollarSign,
  Phone,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import {
  TruckRecord,
  DriverRecord,
  RoadTripRecord,
  TruckStatus,
  DriverStatus,
  RoadTripStatus,
  TripExpenseCategory,
  PodRecord,
} from "@/lib/types/fleet-operations"
import { fleetOperationsService } from "@/lib/services/fleet-operations-service"
import { AfghanTruckPlate } from "@/components/ui/afghan-truck-plate"
import { TruckEditorDrawer } from "./truck-editor-drawer"
import { DriverEditorDrawer } from "./driver-editor-drawer"
import { TripBuilderDrawer } from "./trip-builder-drawer"
import { TripDetailModal } from "./trip-detail-modal"
import { TransloadModal } from "./transload-modal"
import { BreakdownModal } from "./breakdown-modal"
import { TruckStatusUpdateModal } from "./truck-status-update-modal"

export function FleetOperationsCenter() {
  // Local reactive states initialized from service singleton
  const [trucks, setTrucks] = useState<TruckRecord[]>(() => fleetOperationsService.getTrucks())
  const [drivers, setDrivers] = useState<DriverRecord[]>(() => fleetOperationsService.getDrivers())
  const [trips, setTrips] = useState<RoadTripRecord[]>(() => fleetOperationsService.getTrips())
  const [kpis, setKpis] = useState(() => fleetOperationsService.getKpis())

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    "trips" | "trucks" | "drivers" | "border-board" | "incidents" | "pod-register"
  >("trips")

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [tripStatusFilter, setTripStatusFilter] = useState<string>("ALL")
  const [truckStatusFilter, setTruckStatusFilter] = useState<string>("ALL")
  const [driverStatusFilter, setDriverStatusFilter] = useState<string>("ALL")

  // Modals & Drawers state
  const [isTruckDrawerOpen, setIsTruckDrawerOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<TruckRecord | null>(null)

  const [isDriverDrawerOpen, setIsDriverDrawerOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DriverRecord | null>(null)

  const [isTripDrawerOpen, setIsTripDrawerOpen] = useState(false)

  const [selectedTrip, setSelectedTrip] = useState<RoadTripRecord | null>(null)
  const [isTripDetailOpen, setIsTripDetailOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isTransloadModalOpen, setIsTransloadModalOpen] = useState(false)
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false)

  // Refresh helper
  const refreshAll = () => {
    setTrucks([...fleetOperationsService.getTrucks()])
    setDrivers([...fleetOperationsService.getDrivers()])
    setTrips([...fleetOperationsService.getTrips()])
    setKpis({ ...fleetOperationsService.getKpis() })
  }

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        searchQuery === "" ||
        t.tripNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bolNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.truckPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.originLocationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destinationLocationName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus = tripStatusFilter === "ALL" || t.status === tripStatusFilter
      return matchSearch && matchStatus
    })
  }, [trips, searchQuery, tripStatusFilter])

  // Filtered trucks
  const filteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      const matchSearch =
        searchQuery === "" ||
        t.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.truckCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.plateProvince && t.plateProvince.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.makeModel && t.makeModel.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchStatus = truckStatusFilter === "ALL" || t.currentStatus === truckStatusFilter
      return matchSearch && matchStatus
    })
  }, [trucks, searchQuery, truckStatusFilter])

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        searchQuery === "" ||
        d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fatherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.driverCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.primaryPhone.includes(searchQuery)

      const matchStatus = driverStatusFilter === "ALL" || d.currentStatus === driverStatusFilter
      return matchSearch && matchStatus
    })
  }, [drivers, searchQuery, driverStatusFilter])

  // Save Truck Handler
  const handleSaveTruck = (truck: TruckRecord) => {
    fleetOperationsService.saveTruck(truck)
    refreshAll()
  }

  // Save Driver Handler
  const handleSaveDriver = (driver: DriverRecord) => {
    fleetOperationsService.saveDriver(driver)
    refreshAll()
  }

  // Save Trip Handler
  const handleSaveTrip = (tripData: any, override?: { allow: boolean; reason: string }) => {
    const res = fleetOperationsService.createRoadTrip(tripData, {
      allowDoubleAssignmentOverride: override?.allow,
      overrideReason: override?.reason,
    })
    if (res.error) {
      alert(res.error)
      return
    }
    refreshAll()
  }

  // Update Status Handler
  const handleUpdateStatus = (
    status: RoadTripStatus,
    location: string,
    internalNotes?: string,
    customerSafeNotes?: string
  ) => {
    if (!selectedTrip) return
    const updated = fleetOperationsService.updateTripStatus(
      selectedTrip.id,
      status,
      location,
      internalNotes,
      customerSafeNotes
    )
    if (updated) setSelectedTrip({ ...updated })
    refreshAll()
  }

  // Transload Handler
  const handleTransload = (data: any) => {
    if (!selectedTrip) return
    const res = fleetOperationsService.recordTransload(selectedTrip.id, data)
    if (res.error) {
      alert(res.error)
      return
    }
    if (res.trip) setSelectedTrip({ ...res.trip })
    refreshAll()
  }

  // Breakdown Handler
  const handleReportBreakdown = (data: any) => {
    if (!selectedTrip) return
    const res = fleetOperationsService.recordBreakdown(selectedTrip.id, data)
    if (res.error) {
      alert(res.error)
      return
    }
    if (res.trip) setSelectedTrip({ ...res.trip })
    refreshAll()
  }

  // Resolve Breakdown Handler
  const handleResolveBreakdown = (breakdownId: string, resolution: any) => {
    if (!selectedTrip) return
    const res = fleetOperationsService.resolveBreakdown(selectedTrip.id, breakdownId, resolution)
    if (res.error) {
      alert(res.error)
      return
    }
    if (res.trip) setSelectedTrip({ ...res.trip })
    refreshAll()
  }

  // Add Expense Handler
  const handleAddExpense = (expenseData: any) => {
    if (!selectedTrip) return
    const res = fleetOperationsService.addTripExpense(selectedTrip.id, expenseData)
    if (res.error) {
      alert(res.error)
      return
    }
    if (res.trip) setSelectedTrip({ ...res.trip })
    refreshAll()
  }

  // Record POD Handler
  const handleRecordPod = (podData: any) => {
    if (!selectedTrip) return
    const res = fleetOperationsService.recordPod(selectedTrip.id, podData)
    if (res.error) {
      alert(res.error)
      return
    }
    if (res.trip) setSelectedTrip({ ...res.trip })
    refreshAll()
  }

  const borderBoard = fleetOperationsService.getAvailabilityBoard()

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-500 text-white shadow-md">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Fleet, Truck & Driver Operations Center
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Phase 19
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Road transport dispatch, Afghan license plates, cross-border movements, transloads & driver manifests
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingTruck(null)
              setIsTruckDrawerOpen(true)
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-blue-600" /> Register Truck
          </button>
          <button
            onClick={() => {
              setEditingDriver(null)
              setIsDriverDrawerOpen(true)
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-600" /> Add Driver
          </button>
          <button
            onClick={() => setIsTripDrawerOpen(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Navigation className="w-4 h-4" /> Create Trip & Dispatch
          </button>
        </div>
      </div>

      {/* Top Fleet KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Trucks</span>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {kpis.totalTrucks}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 block">Available Now</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">
            {kpis.availableTrucks}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-600 block">On Road</span>
          <div className="text-xl font-black text-blue-600 font-mono mt-0.5">
            {kpis.onTripTrucks}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-600 block">At Border</span>
          <div className="text-xl font-black text-amber-600 font-mono mt-0.5">
            {kpis.atBorderTrucks}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-red-600 block">Service / Repair</span>
          <div className="text-xl font-black text-red-600 font-mono mt-0.5">
            {kpis.maintenanceTrucks}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-purple-600 block">Active Drivers</span>
          <div className="text-xl font-black text-purple-600 font-mono mt-0.5">
            {kpis.activeDrivers} / {kpis.totalDrivers}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-indigo-600 block">Active Trips</span>
          <div className="text-xl font-black text-indigo-600 font-mono mt-0.5">
            {kpis.activeTrips}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-teal-600 block">Pending POD</span>
          <div className="text-xl font-black text-teal-600 font-mono mt-0.5">
            {kpis.pendingPodCount}
          </div>
        </div>
      </div>

      {/* Tabs Bar & Omnisearch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "trips", label: `Active Trips (${trips.length})`, icon: Navigation },
            { id: "trucks", label: `Fleet Master (${trucks.length})`, icon: Truck },
            { id: "drivers", label: `Drivers (${drivers.length})`, icon: UserCheck },
            { id: "border-board", label: "Border Board", icon: MapPin },
            { id: "incidents", label: "Incidents & Breakdowns", icon: Wrench },
            { id: "pod-register", label: "POD Sign-off", icon: FileCheck2 },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plate, driver, BOL, trip..."
            className="w-full text-xs rounded-lg pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* TAB 1: ACTIVE ROAD TRIPS */}
      {activeTab === "trips" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Road Freight Execution Register
            </span>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Status:</span>
              <select
                value={tripStatusFilter}
                onChange={(e) => setTripStatusFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="AT_BORDER">AT_BORDER</option>
                <option value="TRANSLOADING">TRANSLOADING</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="BROKEN_DOWN">BROKEN_DOWN</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Trip / BOL</th>
                  <th className="px-4 py-3">Transport Vehicle</th>
                  <th className="px-4 py-3">Assigned Driver</th>
                  <th className="px-4 py-3">Route Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Agreed Rent</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTrips.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {t.tripNumber}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {t.bolNumber}
                      </div>
                      <span className="text-[10px] text-slate-400">Leg {t.legIndex}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      {t.truckCountry === "AF" ? (
                        <div className="scale-90 origin-left">
                          <AfghanTruckPlate plateNumber={t.truckPlate} size="compact" />
                        </div>
                      ) : (
                        <div className="inline-block px-2.5 py-1 bg-yellow-400 text-slate-950 font-mono font-black text-xs rounded border border-slate-950">
                          [{t.truckCountry}] {t.truckPlate}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {t.driverName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        s/o {t.driverFatherName || "—"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {t.driverPhone}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {t.originLocationName} → {t.destinationLocationName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span>Border: {t.borderStation || "Direct Inland"}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ETA: {t.estimatedArrivalDate}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          t.status === "COMPLETED" || t.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : t.status === "BROKEN_DOWN"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse"
                            : t.status === "AT_BORDER" || t.status === "TRANSLOADING"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {t.status}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[140px]">
                        At: {t.currentLocationName}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {t.agreedDriverRent.toLocaleString()} {t.currency}
                      </div>
                      <div className="text-[11px] text-emerald-600">
                        Adv: {t.advancePaid.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Bal: {t.balancePayable.toLocaleString()}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedTrip(t)
                            setIsTripDetailOpen(true)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTrip(t)
                            setIsStatusModalOpen(true)
                          }}
                          title="Quick Waypoint & WhatsApp Update"
                          className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTrip(t)
                            setIsTransloadModalOpen(true)
                          }}
                          title="Transload to another truck"
                          className="p-1 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRUCK FLEET MASTER */}
      {activeTab === "trucks" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Fleet Asset Catalog & Compliance
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Status:</span>
              <select
                value={truckStatusFilter}
                onChange={(e) => setTruckStatusFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ON_TRIP">ON_TRIP</option>
                <option value="BORDER_WAITING">BORDER_WAITING</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="BROKEN_DOWN">BROKEN_DOWN</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrucks.map((truck) => (
              <div
                key={truck.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {truck.truckCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        truck.currentStatus === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : truck.currentStatus === "ON_TRIP"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : truck.currentStatus === "MAINTENANCE" || truck.currentStatus === "BROKEN_DOWN"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {truck.currentStatus}
                    </span>
                  </div>

                  {/* License Plate Display */}
                  <div className="flex justify-center p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    {truck.plateCountry === "AF" ? (
                      <AfghanTruckPlate
                        plateNumber={truck.plateNumber}
                        province={truck.plateProvince}
                        plateLetter={truck.plateLetter}
                        size="compact"
                      />
                    ) : (
                      <div className="px-4 py-2 bg-yellow-400 text-slate-950 font-mono font-black text-sm rounded border-2 border-slate-950">
                        [{truck.plateCountry}] {truck.plateNumber}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type & Spec:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {truck.truckType} ({truck.capacityTons}T / {truck.maxCbm || 85} CBM)
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Make & Model:</span>
                      <span className="text-slate-700 dark:text-slate-300">{truck.makeModel || "Standard Tractor"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Station:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {truck.currentLocationName}
                      </span>
                    </div>

                    {truck.isReefer && (
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold pt-1">
                        <Sparkles className="w-3.5 h-3.5" /> Reefer Generator: {truck.reeferGensetUnit || "Installed"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Permit: {truck.roadPermitExpiry || "Valid"}
                  </span>
                  <button
                    onClick={() => {
                      setEditingTruck(truck)
                      setIsTruckDrawerOpen(true)
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    Edit Vehicle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DRIVERS DIRECTORY */}
      {activeTab === "drivers" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Transit Drivers & Crew Register
              </span>
              <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3 h-3" /> Tazkira Protected
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Status:</span>
              <select
                value={driverStatusFilter}
                onChange={(e) => setDriverStatusFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
              >
                <option value="ALL">All Drivers</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_TRIP">ON_TRIP</option>
                <option value="BORDER_DELAYED">BORDER_DELAYED</option>
                <option value="RESTING">RESTING</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Driver Name & Father</th>
                  <th className="px-4 py-3">License & Classification</th>
                  <th className="px-4 py-3">Contact (Primary & SIM 2)</th>
                  <th className="px-4 py-3">Border Routes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {driver.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        ولد (Father): <strong>{driver.fatherName}</strong>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {driver.driverCode} • {driver.country === "AF" ? "Afghanistan" : "Iran"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {driver.licenseNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">{driver.licenseType}</div>
                      <div className="text-[10px] text-slate-400">
                        Tazkira / Passport: (Confidential)
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {driver.primaryPhone}
                      </div>
                      {driver.secondaryPhone && (
                        <div className="text-[11px] text-slate-500">
                          Alt: {driver.secondaryPhone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        {driver.borderCrossingsHandled?.join(", ") || "Islam Qala, Torghundi"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Base: {driver.city || "Herat"}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          driver.currentStatus === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : driver.currentStatus === "ON_TRIP"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {driver.currentStatus}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        At: {driver.currentLocationName}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setEditingDriver(driver)
                          setIsDriverDrawerOpen(true)
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AVAILABILITY & BORDER BOARD */}
      {activeTab === "border-board" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Border Transit Terminals & Depot Availability Board
            </h3>
            <p className="text-xs text-slate-500">
              Real-time fleet staging at Afghan transit border gateways
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(borderBoard).map(([station, data]) => (
              <div
                key={station}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {station}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {data.availableTrucks.length + data.waitingTrucks.length} Vehicles
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold">
                    <span>Available for Loading:</span>
                    <strong className="font-mono">{data.availableTrucks.length} Trucks</strong>
                  </div>

                  <div className="flex justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold">
                    <span>Queued at Customs / Transload:</span>
                    <strong className="font-mono">{data.waitingTrucks.length} Trucks</strong>
                  </div>

                  <div className="flex justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-semibold">
                    <span>Active Drivers Stationed:</span>
                    <strong className="font-mono">{data.availableDrivers.length} Drivers</strong>
                  </div>
                </div>

                {data.waitingTrucks.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Trucks in Border Customs Queue:
                    </span>
                    <div className="space-y-1">
                      {data.waitingTrucks.map((wt) => (
                        <div key={wt.id} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                          • {wt.plateNumber} ({wt.truckCode}) — {wt.currentStatus}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: INCIDENTS & BREAKDOWNS */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Highway Technical Failures & Incident Log
              </h3>
              <p className="text-xs text-slate-500">
                Active roadside mechanical issues requiring workshop repair or cargo transloading
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips
              .filter((t) => t.breakdownHistory.length > 0 || t.status === "BROKEN_DOWN")
              .map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/60 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-600">
                      {t.tripNumber} ({t.bolNumber})
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
                      {t.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div>
                      Truck: <strong>{t.truckPlate}</strong> | Driver: <strong>{t.driverName}</strong>
                    </div>
                    <div>Location: {t.currentLocationName}</div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {t.breakdownHistory.map((b) => (
                      <div key={b.id} className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 text-xs space-y-1">
                        <div className="font-bold text-red-950 dark:text-red-200">{b.issueDescription}</div>
                        <div className="text-slate-500">
                          {b.breakdownLocation} • Severity: {b.severity}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setSelectedTrip(t)
                        setIsBreakdownModalOpen(true)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Resolve Incident
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 6: POD REGISTER */}
      {activeTab === "pod-register" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Proof of Delivery (POD) Archive & Sign-offs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Trip / BOL</th>
                  <th className="px-4 py-3">Delivery Date</th>
                  <th className="px-4 py-3">Receiver Name</th>
                  <th className="px-4 py-3">Cartons Delivered</th>
                  <th className="px-4 py-3">Damages / Shortages</th>
                  <th className="px-4 py-3 text-right">POD Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{t.tripNumber}</div>
                      <div className="font-mono text-indigo-600 font-bold">{t.bolNumber}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono">
                      {t.pod?.deliveryDate || t.actualArrivalDate || "In Transit"}
                    </td>

                    <td className="px-4 py-3.5">
                      {t.pod?.receiverName || "Pending Delivery"}
                    </td>

                    <td className="px-4 py-3.5 font-bold font-mono">
                      {t.pod ? `${t.pod.receivedCartons} Cartons` : "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      {t.pod ? (
                        <span className="text-slate-600">
                          Dmg: {t.pod.damagedCartons} | Short: {t.pod.shortageCartons}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {t.pod ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          POD Signed
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTrip(t)
                            setIsTripDetailOpen(true)
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                        >
                          Sign POD
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWERS & MODALS */}
      <TruckEditorDrawer
        isOpen={isTruckDrawerOpen}
        onClose={() => setIsTruckDrawerOpen(false)}
        onSave={handleSaveTruck}
        initialTruck={editingTruck}
      />

      <DriverEditorDrawer
        isOpen={isDriverDrawerOpen}
        onClose={() => setIsDriverDrawerOpen(false)}
        onSave={handleSaveDriver}
        initialDriver={editingDriver}
      />

      <TripBuilderDrawer
        isOpen={isTripDrawerOpen}
        onClose={() => setIsTripDrawerOpen(false)}
        onSave={handleSaveTrip}
        trucks={trucks}
        drivers={drivers}
        existingTrips={trips}
      />

      {selectedTrip && (
        <>
          <TripDetailModal
            isOpen={isTripDetailOpen}
            onClose={() => setIsTripDetailOpen(false)}
            trip={selectedTrip}
            onOpenStatusModal={() => setIsStatusModalOpen(true)}
            onOpenTransloadModal={() => setIsTransloadModalOpen(true)}
            onOpenBreakdownModal={() => setIsBreakdownModalOpen(true)}
            onAddExpense={handleAddExpense}
            onRecordPod={handleRecordPod}
          />

          <TruckStatusUpdateModal
            isOpen={isStatusModalOpen}
            onClose={() => setIsStatusModalOpen(false)}
            trip={selectedTrip}
            onUpdate={handleUpdateStatus}
          />

          <TransloadModal
            isOpen={isTransloadModalOpen}
            onClose={() => setIsTransloadModalOpen(false)}
            trip={selectedTrip}
            availableTrucks={trucks.filter((t) => t.id !== selectedTrip.truckId)}
            availableDrivers={drivers.filter((d) => d.id !== selectedTrip.driverId)}
            onTransload={handleTransload}
          />

          <BreakdownModal
            isOpen={isBreakdownModalOpen}
            onClose={() => setIsBreakdownModalOpen(false)}
            trip={selectedTrip}
            availableTrucks={trucks.filter((t) => t.id !== selectedTrip.truckId)}
            availableDrivers={drivers.filter((d) => d.id !== selectedTrip.driverId)}
            activeBreakdown={selectedTrip.breakdownHistory[selectedTrip.breakdownHistory.length - 1]}
            onReportBreakdown={handleReportBreakdown}
            onResolveBreakdown={handleResolveBreakdown}
          />
        </>
      )}
    </div>
  )
}
