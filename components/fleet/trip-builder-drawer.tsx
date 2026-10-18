"use client"

import React, { useState, useMemo } from "react"
import { X, Navigation, AlertTriangle, ShieldCheck, DollarSign, Calendar, MapPin, CheckCircle2 } from "lucide-react"
import { TruckRecord, DriverRecord, RoadTripRecord } from "@/lib/types/fleet-operations"
import { AfghanTruckPlate } from "@/components/ui/afghan-truck-plate"

interface TripBuilderDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    data: Omit<RoadTripRecord, "id" | "createdAt" | "updatedAt" | "transloadHistory" | "breakdownHistory" | "expenses">,
    override?: { allow: boolean; reason: string }
  ) => void
  trucks: TruckRecord[]
  drivers: DriverRecord[]
  existingTrips: RoadTripRecord[]
}

export function TripBuilderDrawer({
  isOpen,
  onClose,
  onSave,
  trucks,
  drivers,
  existingTrips,
}: TripBuilderDrawerProps) {
  const [bolNumber, setBolNumber] = useState("BOL-2026-0044")
  const [shipmentId, setShipmentId] = useState("shp-2026-0044")
  const [legIndex, setLegIndex] = useState(1)
  const [originLocationName, setOriginLocationName] = useState("Islam Qala Border Terminal")
  const [destinationLocationName, setDestinationLocationName] = useState("Kabul Customs Depot (ACCS)")
  const [borderStation, setBorderStation] = useState("Islam Qala")
  const [plannedDepartureDate, setPlannedDepartureDate] = useState(new Date().toISOString().split("T")[0])
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0]
  )

  const [selectedTruckId, setSelectedTruckId] = useState<string>(trucks[0]?.id || "")
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || "")

  const [agreedDriverRent, setAgreedDriverRent] = useState(70000)
  const [currency, setCurrency] = useState<"AFN" | "USD" | "IRR" | "PKR">("AFN")
  const [advancePaid, setAdvancePaid] = useState(30000)

  const [internalNotes, setInternalNotes] = useState("")
  const [allowOverride, setAllowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState("")

  // Real-time assignment conflict check
  const conflictReport = useMemo(() => {
    const activeTrips = existingTrips.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "DELIVERED"
    )
    const truckConflict = activeTrips.find((t) => t.truckId === selectedTruckId)
    const driverConflict = activeTrips.find((t) => t.driverId === selectedDriverId)

    const hasConflict = Boolean(truckConflict || driverConflict)
    return {
      hasConflict,
      truckConflict,
      driverConflict,
    }
  }, [selectedTruckId, selectedDriverId, existingTrips])

  if (!isOpen) return null

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId)
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId)
  const balancePayable = Math.max(0, agreedDriverRent - advancePaid)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTruck || !selectedDriver) {
      alert("Please select both a truck and a driver.")
      return
    }

    if (conflictReport.hasConflict && !allowOverride) {
      alert("Cannot dispatch: Truck or Driver is already assigned to an active trip. Enable Administrative Override if intentional.")
      return
    }

    const payload = {
      tripNumber: `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      shipmentId,
      bolNumber: bolNumber.trim().toUpperCase(),
      legIndex: Number(legIndex),
      originLocationName: originLocationName.trim(),
      destinationLocationName: destinationLocationName.trim(),
      borderStation: borderStation.trim(),
      plannedDepartureDate,
      estimatedArrivalDate,
      truckId: selectedTruck.id,
      truckPlate: selectedTruck.plateNumber,
      truckCountry: selectedTruck.plateCountry,
      driverId: selectedDriver.id,
      driverName: selectedDriver.fullName,
      driverFatherName: selectedDriver.fatherName,
      driverPhone: selectedDriver.primaryPhone,
      agreedDriverRent: Number(agreedDriverRent),
      currency,
      advancePaid: Number(advancePaid),
      balancePayable,
      status: "SCHEDULED" as const,
      currentLocationName: originLocationName.trim(),
      internalNotes: internalNotes.trim(),
      customerSafeNotes: `Road transport scheduled from ${originLocationName} to ${destinationLocationName}.`,
    }

    onSave(payload, { allow: allowOverride, reason: overrideReason })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Create Road Trip & Dispatch
              </h2>
              <p className="text-xs text-slate-500">
                Connect road leg to BOL with driver assignment & conflict checking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Shipment & BOL Reference */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Bill of Lading & Leg Scope
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Associated BOL Number *
                </label>
                <input
                  type="text"
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  placeholder="e.g. BOL-2026-0044"
                  required
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Leg Sequence
                </label>
                <select
                  value={legIndex}
                  onChange={(e) => setLegIndex(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value={1}>Leg 1 (Primary / Origin)</option>
                  <option value={2}>Leg 2 (Onward / Transload)</option>
                  <option value={3}>Leg 3 (Final Delivery)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Origin Waypoint / Terminal
                </label>
                <input
                  type="text"
                  value={originLocationName}
                  onChange={(e) => setOriginLocationName(e.target.value)}
                  placeholder="e.g. Islam Qala Border Terminal"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Destination Destination
                </label>
                <input
                  type="text"
                  value={destinationLocationName}
                  onChange={(e) => setDestinationLocationName(e.target.value)}
                  placeholder="e.g. Kabul Customs Depot (ACCS)"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customs Border Station
              </label>
              <select
                value={borderStation}
                onChange={(e) => setBorderStation(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="Islam Qala">Islam Qala (Iran / Herat Border)</option>
                <option value="Dogharoon / Islam Qala">Dogharoon / Islam Qala (Cross-Border Interchange)</option>
                <option value="Torghundi">Torghundi (Turkmenistan Border)</option>
                <option value="Hairatan">Hairatan (Uzbekistan Border)</option>
                <option value="Spin Boldak">Spin Boldak (Chaman / Pakistan Border)</option>
                <option value="Torkham">Torkham (Peshawar / Pakistan Border)</option>
                <option value="Aqina">Aqina (Turkmenistan Border)</option>
                <option value="Direct Road / Domestic">Direct Road / Domestic Afghanistan Transit</option>
              </select>
            </div>
          </div>

          {/* Vehicle & Driver Assignment */}
          <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-indigo-600" /> Vehicle & Driver Allocation
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Truck Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign Truck *
                </label>
                <select
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.plateNumber} ({t.plateProvince || t.plateCountry}) — {t.currentStatus} [{t.truckType}]
                    </option>
                  ))}
                </select>

                {selectedTruck && (
                  <div className="mt-2 p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status:</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        selectedTruck.currentStatus === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {selectedTruck.currentStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Driver Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign Driver *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} (s/o {d.fatherName}) — {d.currentStatus}
                    </option>
                  ))}
                </select>

                {selectedDriver && (
                  <div className="mt-2 p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Driver Phone:</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      {selectedDriver.primaryPhone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Plate Preview for Selected Truck */}
            {selectedTruck && selectedTruck.plateCountry === "AF" && (
              <div className="flex justify-center p-3 rounded-lg bg-slate-200/50 dark:bg-slate-950/60 border border-slate-300/60 dark:border-slate-800">
                <AfghanTruckPlate
                  plateNumber={selectedTruck.plateNumber}
                  province={selectedTruck.plateProvince}
                  plateLetter={selectedTruck.plateLetter}
                  size="compact"
                />
              </div>
            )}

            {/* Double Assignment Warning Banner */}
            {conflictReport.hasConflict && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Double Assignment Conflict Detected
                </div>
                <div className="text-xs space-y-1 pl-6">
                  {conflictReport.truckConflict && (
                    <p>
                      • <strong>Truck {selectedTruck?.plateNumber}</strong> is currently on trip{" "}
                      <strong>{conflictReport.truckConflict.tripNumber}</strong> (Status:{" "}
                      {conflictReport.truckConflict.status}).
                    </p>
                  )}
                  {conflictReport.driverConflict && (
                    <p>
                      • <strong>Driver {selectedDriver?.fullName}</strong> is currently on trip{" "}
                      <strong>{conflictReport.driverConflict.tripNumber}</strong> (Status:{" "}
                      {conflictReport.driverConflict.status}).
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="override"
                    checked={allowOverride}
                    onChange={(e) => setAllowOverride(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="override" className="text-xs font-bold block cursor-pointer">
                      Administrative Override: Pre-dispatch / Backhaul scheduled
                    </label>
                    {allowOverride && (
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="State reason (e.g. Return backhaul trip scheduled after current delivery)"
                        required
                        className="mt-1 w-full text-xs rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-900 dark:text-slate-100"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" /> Transit Timeline
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Planned Departure Date *
                </label>
                <input
                  type="date"
                  value={plannedDepartureDate}
                  onChange={(e) => setPlannedDepartureDate(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Arrival Date (ETA) *
                </label>
                <input
                  type="date"
                  value={estimatedArrivalDate}
                  onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Financials: Driver Rent */}
          <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Driver Rent & Payment Terms
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Agreed Driver Rent *
                </label>
                <input
                  type="number"
                  value={agreedDriverRent}
                  onChange={(e) => setAgreedDriverRent(Number(e.target.value))}
                  required
                  className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="AFN">AFN (افغانی)</option>
                  <option value="USD">USD ($)</option>
                  <option value="IRR">IRR (تومان / ریال)</option>
                  <option value="PKR">PKR (روپیه)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Advance Paid (پیشکی)
                </label>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-900 dark:text-emerald-200">
                Balance Payable on Delivery (باقیمانده هنگام تحویلی):
              </span>
              <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100 font-mono">
                {balancePayable.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal Dispatch Notes
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Escort required after Herat bypass. Driver must verify container seals before moving."
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Create Trip & Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
