"use client"

import React, { useState } from "react"
import { X, Wrench, AlertOctagon, CheckCircle2, Truck } from "lucide-react"
import { RoadTripRecord, TruckRecord, DriverRecord, BreakdownEvent } from "@/lib/types/fleet-operations"

interface BreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  trip: RoadTripRecord
  availableTrucks: TruckRecord[]
  availableDrivers: DriverRecord[]
  activeBreakdown?: BreakdownEvent
  onReportBreakdown: (data: {
    breakdownLocation: string
    issueDescription: string
    severity: "MINOR_ROADSIDE" | "MODERATE_TOWING_REQUIRED" | "CRITICAL_ENGINE_FAILURE"
    mechanicDispatched?: boolean
    mechanicDetails?: string
    notes?: string
  }) => void
  onResolveBreakdown: (breakdownId: string, resolution: any) => void
}

export function BreakdownModal({
  isOpen,
  onClose,
  trip,
  availableTrucks,
  availableDrivers,
  activeBreakdown,
  onReportBreakdown,
  onResolveBreakdown,
}: BreakdownModalProps) {
  const isResolving = Boolean(activeBreakdown)

  // Report state
  const [breakdownLocation, setBreakdownLocation] = useState(trip.currentLocationName || "Highway KM Marker")
  const [issueDescription, setIssueDescription] = useState("")
  const [severity, setSeverity] = useState<"MINOR_ROADSIDE" | "MODERATE_TOWING_REQUIRED" | "CRITICAL_ENGINE_FAILURE">(
    "MODERATE_TOWING_REQUIRED"
  )
  const [mechanicDispatched, setMechanicDispatched] = useState(true)
  const [mechanicDetails, setMechanicDetails] = useState("")

  // Resolve state
  const [resolutionAction, setResolutionAction] = useState<"REPAIRED_RESUMED" | "CARGO_TRANSFERRED">("REPAIRED_RESUMED")
  const [repairCost, setRepairCost] = useState(12000)
  const [currency, setCurrency] = useState<"AFN" | "USD" | "IRR" | "PKR">("AFN")
  const [reliefTruckId, setReliefTruckId] = useState(availableTrucks[0]?.id || "")
  const [reliefDriverId, setReliefDriverId] = useState(availableDrivers[0]?.id || "")
  const [resolutionNotes, setResolutionNotes] = useState("")

  if (!isOpen) return null

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueDescription.trim()) {
      alert("Please provide the technical issue description.")
      return
    }

    onReportBreakdown({
      breakdownLocation: breakdownLocation.trim(),
      issueDescription: issueDescription.trim(),
      severity,
      mechanicDispatched,
      mechanicDetails: mechanicDetails.trim(),
    })
    onClose()
  }

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBreakdown) return

    const reliefTruck = availableTrucks.find((t) => t.id === reliefTruckId)
    const reliefDriver = availableDrivers.find((d) => d.id === reliefDriverId)

    onResolveBreakdown(activeBreakdown.id, {
      action: resolutionAction,
      resumedAt: new Date().toISOString(),
      repairCost: Number(repairCost),
      currency,
      notes: resolutionNotes.trim(),
      reliefTruckId: resolutionAction === "CARGO_TRANSFERRED" ? reliefTruck?.id : undefined,
      reliefTruckPlate: resolutionAction === "CARGO_TRANSFERRED" ? reliefTruck?.plateNumber : undefined,
      reliefDriverId: resolutionAction === "CARGO_TRANSFERRED" ? reliefDriver?.id : undefined,
      reliefDriverName: resolutionAction === "CARGO_TRANSFERRED" ? reliefDriver?.fullName : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg text-white shadow-sm ${isResolving ? "bg-emerald-600" : "bg-red-600"}`}>
              {isResolving ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isResolving ? "Resolve Vehicle Breakdown" : "Report Roadside Breakdown Incident"}
              </h2>
              <p className="text-xs text-slate-500">
                Trip: {trip.tripNumber} — Truck {trip.truckPlate} ({trip.driverName})
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
        {!isResolving ? (
          <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Incident Location (Highway / KM Marker / City) *
              </label>
              <input
                type="text"
                value={breakdownLocation}
                onChange={(e) => setBreakdownLocation(e.target.value)}
                placeholder="e.g. Kabul - Kandahar Highway KM 145 (Ghazni Pass)"
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="MINOR_ROADSIDE">MINOR_ROADSIDE (Puncture, minor electrical, tire swap)</option>
                <option value="MODERATE_TOWING_REQUIRED">MODERATE_TOWING_REQUIRED (Radiator, alternator, clutch)</option>
                <option value="CRITICAL_ENGINE_FAILURE">CRITICAL_ENGINE_FAILURE (Engine, axle, gearbox - cargo transload needed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Technical Failure Description *
              </label>
              <textarea
                rows={3}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="e.g. Turbocharger seized and coolant pipe ruptured. Truck stopped on shoulder."
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mechanicDispatched}
                  onChange={(e) => setMechanicDispatched(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Mobile Mechanic / Roadside Rescue Dispatched
                </span>
              </label>

              {mechanicDispatched && (
                <input
                  type="text"
                  value={mechanicDetails}
                  onChange={(e) => setMechanicDetails(e.target.value)}
                  placeholder="e.g. Master Najib Mobile Workshop (+93 79 999 8888) en route"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-900 dark:text-slate-100"
                />
              )}
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
                className="px-5 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <AlertOctagon className="w-4 h-4" /> Register Incident & Halt Leg
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs">
              <span className="font-bold text-red-950 dark:text-red-200 block mb-0.5">
                Active Incident: {activeBreakdown?.issueDescription}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Location: {activeBreakdown?.breakdownLocation} (Severity: {activeBreakdown?.severity})
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Resolution Action *
              </label>
              <select
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value as any)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
              >
                <option value="REPAIRED_RESUMED">REPAIRED & RESUMED (تعمیر در محل و ادامه حرکت)</option>
                <option value="CARGO_TRANSFERRED">CARGO TRANSFERRED TO RELIEF TRUCK (انتقال بار به موتر کمکی)</option>
              </select>
            </div>

            {resolutionAction === "CARGO_TRANSFERRED" && (
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" /> Dispatch Relief Truck
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Relief Truck
                    </label>
                    <select
                      value={reliefTruckId}
                      onChange={(e) => setReliefTruckId(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-slate-100"
                    >
                      {availableTrucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.plateNumber} ({t.plateProvince || t.plateCountry})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Relief Driver
                    </label>
                    <select
                      value={reliefDriverId}
                      onChange={(e) => setReliefDriverId(e.target.value)}
                      className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-slate-100"
                    >
                      {availableDrivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} (s/o {d.fatherName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Repair / Rescue Cost
                </label>
                <input
                  type="number"
                  value={repairCost}
                  onChange={(e) => setRepairCost(Number(e.target.value))}
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
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="AFN">AFN (افغانی)</option>
                  <option value="USD">USD ($)</option>
                  <option value="IRR">IRR</option>
                  <option value="PKR">PKR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Resolution & Resumption Remarks
              </label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Radiator hose replaced roadside. Engine test ran 30 minutes, normal temperature."
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
                className="px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Close Incident & Resume Trip
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
