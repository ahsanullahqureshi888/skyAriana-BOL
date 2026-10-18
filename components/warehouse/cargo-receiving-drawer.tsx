"use client"

import React, { useState } from "react"
import { X, PackagePlus, ShieldCheck, Scale, Truck, CheckCircle2, AlertCircle } from "lucide-react"
import { PackageType, CargoCondition } from "@/lib/types/warehouse-cargo"

interface CargoReceivingDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}

const PACKAGE_TYPES: PackageType[] = [
  "CTNS",
  "BAGS",
  "PALLETS",
  "BOXES",
  "CRATES",
  "SACKS",
  "DRUMS",
  "BUNDLES",
  "PIECES",
  "OTHER",
]

const CONDITIONS: CargoCondition[] = [
  "GOOD",
  "DAMAGED",
  "WET",
  "TORN_PACKAGING",
  "SHORT",
  "EXCESS",
  "REPACKING_REQUIRED",
  "OTHER",
]

export function CargoReceivingDrawer({ isOpen, onClose, onSave }: CargoReceivingDrawerProps) {
  const [warehouseLocationId, setWarehouseLocationId] = useState("loc-kdr")
  const [warehouseName, setWarehouseName] = useState("Kandahar Central Export Hub")
  const [storageAreaName, setStorageAreaName] = useState("Zone A — Dried Fruits Export Staging")
  const [customerName, setCustomerName] = useState("Haji Abdul Wase Khan Alokozay")
  const [shipperName, setShipperName] = useState("Alokozay Dried Fruits Processing Ltd.")
  const [linkedBolNumber, setLinkedBolNumber] = useState("")
  const [deliveringTruckPlate, setDeliveringTruckPlate] = useState("2877 کابل ل")
  const [deliveringDriverName, setDeliveringDriverName] = useState("Ahmadullah Niazi")
  const [deliveringDriverPhone, setDeliveringDriverPhone] = useState("+93 79 912 3456")

  // Cargo specs
  const [commodity, setCommodity] = useState("Afghan Green Raisins Grade A")
  const [totalPackages, setTotalPackages] = useState(1427)
  const [packageType, setPackageType] = useState<PackageType>("CTNS")
  const [unitNetWeightKg, setUnitNetWeightKg] = useState(16.0)
  const [unitGrossWeightKg, setUnitGrossWeightKg] = useState(16.5)
  const [actualScaleWeightKg, setActualScaleWeightKg] = useState(23520.0)
  const [cargoMarks, setCargoMarks] = useState("LG / RICHVALLY / PRODUCT OF AFGHANISTAN")
  const [batchNumber, setBatchNumber] = useState("BATCH-GR-2026-02")
  const [condition, setCondition] = useState<CargoCondition>("GOOD")
  const [internalNotes, setInternalNotes] = useState("")

  if (!isOpen) return null

  const calculatedNetKg = Number((totalPackages * unitNetWeightKg).toFixed(1))
  const calculatedGrossKg = Number((totalPackages * unitGrossWeightKg).toFixed(1))
  const weightVarianceKg = actualScaleWeightKg ? Number((actualScaleWeightKg - calculatedGrossKg).toFixed(1)) : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commodity.trim() || totalPackages <= 0) {
      alert("Please provide valid commodity and package count.")
      return
    }

    onSave({
      warehouseLocationId,
      warehouseName,
      storageAreaName,
      customerName: customerName.trim(),
      shipperName: shipperName.trim(),
      linkedBolNumber: linkedBolNumber.trim() || undefined,
      deliveringTruckPlate: deliveringTruckPlate.trim() || undefined,
      deliveringDriverName: deliveringDriverName.trim() || undefined,
      deliveringDriverPhone: deliveringDriverPhone.trim() || undefined,
      commodity: commodity.trim(),
      totalPackages: Number(totalPackages),
      packageType,
      unitNetWeightKg: Number(unitNetWeightKg),
      unitGrossWeightKg: Number(unitGrossWeightKg),
      actualMeasuredGrossWeightKg: actualScaleWeightKg ? Number(actualScaleWeightKg) : calculatedGrossKg,
      cargoMarks: cargoMarks.trim(),
      batchNumber: batchNumber.trim() || undefined,
      condition,
      internalNotes: internalNotes.trim(),
      customerSafeNotes: `Received ${totalPackages} ${packageType} of ${commodity} into ${warehouseName}.`,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-600 text-white shadow-sm">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Receive Cargo & Issue Warehouse Receipt
              </h2>
              <p className="text-xs text-slate-500">
                Physical cargo intake, packaging tally, weight verification & lot creation
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
          {/* Warehouse & Storage Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> Warehouse & Storage Staging
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Receiving Warehouse *
                </label>
                <select
                  value={warehouseLocationId}
                  onChange={(e) => {
                    setWarehouseLocationId(e.target.value)
                    if (e.target.value === "loc-kdr") setWarehouseName("Kandahar Central Export Hub")
                    else if (e.target.value === "loc-iq") setWarehouseName("Islam Qala Terminal Bonded Depot")
                    else if (e.target.value === "loc-bnd") setWarehouseName("Bandar Abbas Port Terminal Yard")
                    else setWarehouseName("Kabul ACCS Logistics Hub")
                  }}
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="loc-kdr">Kandahar Central Export Hub</option>
                  <option value="loc-iq">Islam Qala Terminal Bonded Depot</option>
                  <option value="loc-bnd">Bandar Abbas Port Cross-Dock Yard</option>
                  <option value="loc-kbl">Kabul ACCS Logistics Depot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Storage Zone / Bay
                </label>
                <input
                  type="text"
                  value={storageAreaName}
                  onChange={(e) => setStorageAreaName(e.target.value)}
                  placeholder="e.g. Zone A, Rack 02"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Customer & Delivering Party */}
          <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Ownership & Delivering Transporter
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Cargo Owner *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Haji Abdul Wase Khan Alokozay"
                  required
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Shipper / Supplier
                </label>
                <input
                  type="text"
                  value={shipperName}
                  onChange={(e) => setShipperName(e.target.value)}
                  placeholder="e.g. Alokozay Dried Fruits Processing Ltd."
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Delivering Truck Plate
                </label>
                <input
                  type="text"
                  value={deliveringTruckPlate}
                  onChange={(e) => setDeliveringTruckPlate(e.target.value)}
                  placeholder="e.g. 2877 کابل"
                  className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={deliveringDriverName}
                  onChange={(e) => setDeliveringDriverName(e.target.value)}
                  placeholder="e.g. Ahmadullah Niazi"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Linked BOL (Optional)
                </label>
                <input
                  type="text"
                  value={linkedBolNumber}
                  onChange={(e) => setLinkedBolNumber(e.target.value)}
                  placeholder="e.g. BOL-2026-0041"
                  className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 uppercase text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Commodity & Package Specs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" /> Commodity & Packaging Specifications
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Commodity Name *
                </label>
                <input
                  type="text"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  placeholder="e.g. Afghan Green Raisins Grade A (Kishmish)"
                  required
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Condition on Arrival
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CargoCondition)}
                  className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 text-slate-900 dark:text-slate-100"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Package Quantity *
                </label>
                <input
                  type="number"
                  value={totalPackages}
                  onChange={(e) => setTotalPackages(Number(e.target.value))}
                  required
                  className="w-full text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Package Unit Type
                </label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value as PackageType)}
                  className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  {PACKAGE_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Batch / Lot Code
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-01"
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Exact Weight Mathematics */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 space-y-3">
              <span className="text-xs font-bold text-teal-950 dark:text-teal-200 uppercase tracking-wider block">
                Unit Weights & Decimal-Safe Scale Reconciliation
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Net Wt per Unit (KG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={unitNetWeightKg}
                    onChange={(e) => setUnitNetWeightKg(Number(e.target.value))}
                    className="w-full text-sm font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Gross Wt per Unit (KG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={unitGrossWeightKg}
                    onChange={(e) => setUnitGrossWeightKg(Number(e.target.value))}
                    className="w-full text-sm font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Actual Scale Total (KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={actualScaleWeightKg}
                    onChange={(e) => setActualScaleWeightKg(Number(e.target.value))}
                    className="w-full text-sm font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-blue-600"
                  />
                </div>
              </div>

              {/* Side-by-side Weight Comparison */}
              <div className="pt-2 border-t border-teal-200 dark:border-teal-900/60 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500">Calculated Net: </span>
                  <strong>{calculatedNetKg.toLocaleString()} KG</strong>
                </div>
                <div>
                  <span className="text-slate-500">Calculated Gross: </span>
                  <strong>{calculatedGrossKg.toLocaleString()} KG</strong>
                </div>
                <div>
                  <span className="text-slate-500">Variance: </span>
                  <span className={`font-bold ${Math.abs(weightVarianceKg) > 20 ? "text-amber-600" : "text-emerald-600"}`}>
                    {weightVarianceKg > 0 ? `+${weightVarianceKg}` : weightVarianceKg} KG
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cargo Marks & Numbers (Stenciled on Cartons)
              </label>
              <input
                type="text"
                value={cargoMarks}
                onChange={(e) => setCargoMarks(e.target.value)}
                placeholder="e.g. LG / RICHVALLY / PRODUCT OF AFGHANISTAN"
                className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal Receiving & Inspection Notes
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Palletized 25 per tier. Sample box inspected for moisture."
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
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Receipt & Issue Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
