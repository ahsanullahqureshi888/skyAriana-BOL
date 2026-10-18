"use client"

import React, { useState } from "react"
import { X, Navigation, ShieldCheck, Box, Scale, CheckCircle2, AlertTriangle } from "lucide-react"
import { CargoLotRecord } from "@/lib/types/warehouse-cargo"

interface LoadingPlanDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (planData: any) => void
  availableLots: CargoLotRecord[]
}

export function LoadingPlanDrawer({ isOpen, onClose, onSave, availableLots }: LoadingPlanDrawerProps) {
  const [bolNumber, setBolNumber] = useState("BOL-2026-0041")
  const [shipmentId, setShipmentId] = useState("shp-2026-0041")
  const [containerNumber, setContainerNumber] = useState("MSKU9981240")
  const [containerType, setContainerType] = useState("40 HC")
  const [truckPlate, setTruckPlate] = useState("2877 کابل ل")
  const [loadingLocation, setLoadingLocation] = useState("Kandahar Central Export Hub Dock 1")
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split("T")[0])
  const [supervisorName, setSupervisorName] = useState("Haji Gul")
  const [notes, setNotes] = useState("")

  // Allocations mapping: lotId -> count
  const [selectedLots, setSelectedLots] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (availableLots[0]) {
      initial[availableLots[0].id] = availableLots[0].availableQuantity || availableLots[0].remainingQuantity
    }
    return initial
  })

  if (!isOpen) return null

  // Calculate planned totals
  let totalPlannedPackages = 0
  let totalPlannedGrossKg = 0
  let totalPlannedNetKg = 0

  const allocatedLotsPayload = Object.entries(selectedLots)
    .filter(([_, qty]) => qty > 0)
    .map(([lotId, qty]) => {
      const lot = availableLots.find((l) => l.id === lotId)
      if (!lot) return null
      const gross = Number((qty * lot.unitGrossWeightKg).toFixed(1))
      const net = Number((qty * lot.unitNetWeightKg).toFixed(1))
      totalPlannedPackages += qty
      totalPlannedGrossKg += gross
      totalPlannedNetKg += net

      return {
        cargoLotId: lot.id,
        lotNumber: lot.lotNumber,
        commodity: lot.commodity,
        packageType: lot.packageType,
        plannedPackages: qty,
        plannedGrossWeightKg: gross,
        plannedNetWeightKg: net,
        cargoMarks: lot.cargoMarks,
      }
    })
    .filter(Boolean)

  const maxPayloadKg = containerType.includes("40") ? 28000 : 21000
  const isOverweight = totalPlannedGrossKg > maxPayloadKg

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (totalPlannedPackages <= 0) {
      alert("Please allocate at least one cargo lot with quantity > 0.")
      return
    }

    onSave({
      bolNumber: bolNumber.trim().toUpperCase(),
      shipmentId,
      containerNumber: containerNumber.trim().toUpperCase() || undefined,
      containerType,
      truckPlate: truckPlate.trim() || undefined,
      plannedPackages: totalPlannedPackages,
      plannedGrossWeightKg: totalPlannedGrossKg,
      plannedNetWeightKg: totalPlannedNetKg,
      loadingLocation: loadingLocation.trim(),
      plannedDate,
      supervisorName: supervisorName.trim(),
      allocatedLots: allocatedLotsPayload,
      notes: notes.trim(),
    })

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
                Create Container / Truck Loading Plan
              </h2>
              <p className="text-xs text-slate-500">
                Pre-loading cargo staging, container capacity check & lot allocation
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
          {/* Target Shipment & Equipment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Target Shipping Manifest & Equipment
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bill of Lading (BOL) *
                </label>
                <input
                  type="text"
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  placeholder="e.g. BOL-2026-0041"
                  required
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Equipment Type
                </label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="40 HC">40 HC (High Cube Container)</option>
                  <option value="40 RF">40 RF (Reefer Refrigerated)</option>
                  <option value="20 GP">20 GP (Standard Container)</option>
                  <option value="TRAILER_40FT">40FT Road Transit Trailer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Container Number
                </label>
                <input
                  type="text"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                  placeholder="e.g. MSKU9981240"
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Truck Plate
                </label>
                <input
                  type="text"
                  value={truckPlate}
                  onChange={(e) => setTruckPlate(e.target.value)}
                  placeholder="e.g. 2877 کابل"
                  className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Allocation of Available Lots */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-600" /> Allocate Warehouse Cargo Lots
              </span>
              <span className="text-xs text-slate-400">Remaining physical stock is protected</span>
            </h3>

            {availableLots.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                No warehouse lots available for loading. Receive cargo first.
              </div>
            ) : (
              <div className="space-y-3">
                {availableLots.map((lot) => {
                  const maxAvail = lot.remainingQuantity
                  const currentAlloc = selectedLots[lot.id] || 0

                  return (
                    <div
                      key={lot.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100 font-mono">
                            {lot.lotNumber}
                          </strong>
                          <span className="text-slate-500 ml-2">({lot.customerName})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                          Available: {maxAvail} {lot.packageType}
                        </span>
                      </div>

                      <div className="text-slate-600 dark:text-slate-400">
                        {lot.commodity} • {lot.unitGrossWeightKg} KG/unit • {lot.warehousePosition}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="text-[11px] font-semibold text-slate-500">
                          Allocate for this Container:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={maxAvail}
                            value={currentAlloc}
                            onChange={(e) => {
                              const val = Math.min(maxAvail, Math.max(0, Number(e.target.value)))
                              setSelectedLots((prev) => ({ ...prev, [lot.id]: val }))
                            }}
                            className="w-24 text-right font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedLots((prev) => ({ ...prev, [lot.id]: maxAvail }))}
                            className="text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            Max All
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Planned Totals & Payload Check */}
          <div
            className={`p-4 rounded-xl border ${
              isOverweight
                ? "border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20"
                : "border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/60 dark:bg-indigo-950/20"
            } space-y-2`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-400 font-sans">
                Planned Total Packages:
              </span>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {totalPlannedPackages.toLocaleString()} Packages
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-400 font-sans">
                Planned Gross Weight:
              </span>
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {totalPlannedGrossKg.toLocaleString()} KG
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t border-slate-200/60 dark:border-slate-800 pt-2">
              <span className="text-slate-500 font-sans">Equipment Payload Limit ({containerType}):</span>
              <span className="text-slate-700 dark:text-slate-300">{maxPayloadKg.toLocaleString()} KG</span>
            </div>

            {isOverweight && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300 font-bold pt-1">
                <AlertTriangle className="w-4 h-4" /> Warning: Planned weight exceeds configured payload capacity by{" "}
                {(totalPlannedGrossKg - maxPayloadKg).toLocaleString()} KG!
              </div>
            )}
          </div>

          {/* Location & Supervisor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loading Dock / Yard
              </label>
              <input
                type="text"
                value={loadingLocation}
                onChange={(e) => setLoadingLocation(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loading Supervisor *
              </label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Loading Instructions / Stacking Plan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ensure even weight distribution across axles. Verify desiccants placed in container."
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
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
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Loading Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
