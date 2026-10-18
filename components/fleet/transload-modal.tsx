"use client"

import React, { useState } from "react"
import { X, ArrowRightLeft, ShieldCheck, CheckCircle2 } from "lucide-react"
import { RoadTripRecord, TruckRecord, DriverRecord } from "@/lib/types/fleet-operations"
import { AfghanTruckPlate } from "@/components/ui/afghan-truck-plate"

interface TransloadModalProps {
  isOpen: boolean
  onClose: () => void
  trip: RoadTripRecord
  availableTrucks: TruckRecord[]
  availableDrivers: DriverRecord[]
  onTransload: (data: {
    transloadLocation: string
    transloadDate: string
    newTruckId: string
    newTruckPlate: string
    newDriverId: string
    newDriverName: string
    newDriverFatherName?: string
    sealNumberBefore: string
    sealNumberAfter: string
    cargoCondition: "INTACT_SOUND" | "DAMAGED_CARTONS" | "SEAL_BROKEN_INSPECTED" | "DISCREPANCY_NOTED"
    tallyCartonsCount: number
    remarks?: string
    recordedBy: string
  }) => void
}

export function TransloadModal({
  isOpen,
  onClose,
  trip,
  availableTrucks,
  availableDrivers,
  onTransload,
}: TransloadModalProps) {
  const [transloadLocation, setTransloadLocation] = useState(
    trip.borderStation ? `${trip.borderStation} Transshipment Yard` : "Islam Qala Border Terminal"
  )
  const [newTruckId, setNewTruckId] = useState(availableTrucks[0]?.id || "")
  const [newDriverId, setNewDriverId] = useState(availableDrivers[0]?.id || "")
  const [sealNumberBefore, setSealNumberBefore] = useState("ORIGIN-SEAL-01")
  const [sealNumberAfter, setSealNumberAfter] = useState(`AF-SEAL-${Math.floor(10000 + Math.random() * 90000)}`)
  const [cargoCondition, setCargoCondition] = useState<
    "INTACT_SOUND" | "DAMAGED_CARTONS" | "SEAL_BROKEN_INSPECTED" | "DISCREPANCY_NOTED"
  >("INTACT_SOUND")
  const [tallyCartonsCount, setTallyCartonsCount] = useState(1200)
  const [remarks, setRemarks] = useState("")
  const [recordedBy, setRecordedBy] = useState("Border Operations Supervisor")

  if (!isOpen) return null

  const selectedNewTruck = availableTrucks.find((t) => t.id === newTruckId)
  const selectedNewDriver = availableDrivers.find((d) => d.id === newDriverId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedNewTruck || !selectedNewDriver) {
      alert("Please select both a new destination truck and driver.")
      return
    }

    onTransload({
      transloadLocation: transloadLocation.trim(),
      transloadDate: new Date().toISOString(),
      newTruckId: selectedNewTruck.id,
      newTruckPlate: selectedNewTruck.plateNumber,
      newDriverId: selectedNewDriver.id,
      newDriverName: selectedNewDriver.fullName,
      newDriverFatherName: selectedNewDriver.fatherName,
      sealNumberBefore: sealNumberBefore.trim(),
      sealNumberAfter: sealNumberAfter.trim(),
      cargoCondition,
      tallyCartonsCount: Number(tallyCartonsCount),
      remarks: remarks.trim(),
      recordedBy: recordedBy.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-sm">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Execute Cargo Transload / Truck Exchange
              </h2>
              <p className="text-xs text-slate-500">
                Transfer freight from current truck to onward carrier (Trip: {trip.tripNumber})
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Current Vehicle (To Be Archived) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Origin / Replaced Vehicle (Will be archived in trip history)
              </span>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                Plate: {trip.truckPlate} ({trip.truckCountry})
              </div>
              <div className="text-xs text-slate-500">
                Driver: {trip.driverName} (s/o {trip.driverFatherName || "—"})
              </div>
            </div>
            {trip.truckCountry === "AF" && (
              <div className="scale-90 origin-right">
                <AfghanTruckPlate plateNumber={trip.truckPlate} size="compact" />
              </div>
            )}
          </div>

          {/* New Vehicle Allocation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Onward Vehicle & Driver Allocation
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Onward Truck *
                </label>
                <select
                  value={newTruckId}
                  onChange={(e) => setNewTruckId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {availableTrucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.plateNumber} ({t.plateProvince || t.plateCountry}) — {t.currentStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Onward Driver *
                </label>
                <select
                  value={newDriverId}
                  onChange={(e) => setNewDriverId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} (s/o {d.fatherName}) — {d.currentStatus}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedNewTruck && selectedNewTruck.plateCountry === "AF" && (
              <div className="flex justify-center p-2 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <AfghanTruckPlate
                  plateNumber={selectedNewTruck.plateNumber}
                  province={selectedNewTruck.plateProvince}
                  plateLetter={selectedNewTruck.plateLetter}
                  size="compact"
                />
              </div>
            )}
          </div>

          {/* Seals & Cargo Inspection */}
          <div className="space-y-3 p-3.5 rounded-xl border border-purple-200 dark:border-purple-950/60 bg-purple-50/40 dark:bg-purple-950/20">
            <h3 className="text-xs font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> Security Seals & Cargo Inspection
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Origin Seal (Cut / Removed)
                </label>
                <input
                  type="text"
                  value={sealNumberBefore}
                  onChange={(e) => setSealNumberBefore(e.target.value)}
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Security Seal (Applied)
                </label>
                <input
                  type="text"
                  value={sealNumberAfter}
                  onChange={(e) => setSealNumberAfter(e.target.value)}
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cargo Condition on Tally
                </label>
                <select
                  value={cargoCondition}
                  onChange={(e) => setCargoCondition(e.target.value as any)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="INTACT_SOUND">INTACT & SOUND (کاملاً سالم و بدون آسیب)</option>
                  <option value="DAMAGED_CARTONS">DAMAGED CARTONS (کارتن‌های آسیب‌دیده)</option>
                  <option value="SEAL_BROKEN_INSPECTED">CUSTOMS INSPECTED (بازرسی گمرکی)</option>
                  <option value="DISCREPANCY_NOTED">DISCREPANCY NOTED (مغایرت در تعداد)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tally Count (Cartons / Units)
                </label>
                <input
                  type="number"
                  value={tallyCartonsCount}
                  onChange={(e) => setTallyCartonsCount(Number(e.target.value))}
                  className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Location & Supervisor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Transshipment Location
              </label>
              <input
                type="text"
                value={transloadLocation}
                onChange={(e) => setTransloadLocation(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Verified By (Officer / Agent)
              </label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Inspection & Transload Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Cross-docked under supervisor oversight. All carton markings verified."
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
              className="px-5 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm & Execute Transload
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
