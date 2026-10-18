"use client"

import React, { useState } from "react"
import { X, RefreshCw, ShieldCheck, Box, CheckCircle2 } from "lucide-react"
import { CargoLotRecord, PackageType } from "@/lib/types/warehouse-cargo"

interface RepackingModalProps {
  isOpen: boolean
  onClose: () => void
  lot: CargoLotRecord
  onRepack: (data: {
    cargoLotId: string
    originalPackages: number
    newPackages: number
    newPackageType: PackageType
    weightDifferenceKg: number
    packagingMaterialsUsed: string
    reason: string
    performedBy: string
  }) => void
}

export function RepackingModal({ isOpen, onClose, lot, onRepack }: RepackingModalProps) {
  const [originalPackages, setOriginalPackages] = useState(lot.holdQuantity || 10)
  const [newPackages, setNewPackages] = useState(lot.holdQuantity || 10)
  const [newPackageType, setNewPackageType] = useState<PackageType>(lot.packageType)
  const [weightDifferenceKg, setWeightDifferenceKg] = useState<number>(-1.5)
  const [packagingMaterialsUsed, setPackagingMaterialsUsed] = useState(
    "Heavy 5-ply corrugated export cartons with food-grade poly inner liners"
  )
  const [reason, setReason] = useState("Outer packaging torn in transit; contents sifted and packed into new cartons")
  const [performedBy, setPerformedBy] = useState("Warehouse Repacking Crew")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (originalPackages <= 0 || newPackages <= 0) {
      alert("Package counts must be greater than zero.")
      return
    }

    onRepack({
      cargoLotId: lot.id,
      originalPackages: Number(originalPackages),
      newPackages: Number(newPackages),
      newPackageType,
      weightDifferenceKg: Number(weightDifferenceKg),
      packagingMaterialsUsed: packagingMaterialsUsed.trim(),
      reason: reason.trim(),
      performedBy: performedBy.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Execute Cargo Repacking
              </h2>
              <p className="text-xs text-slate-500">
                Lot: {lot.lotNumber} ({lot.commodity})
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Damaged Packages Replaced *
              </label>
              <input
                type="number"
                value={originalPackages}
                onChange={(e) => setOriginalPackages(Number(e.target.value))}
                required
                className="w-full text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Sound Packages Produced *
              </label>
              <input
                type="number"
                value={newPackages}
                onChange={(e) => setNewPackages(Number(e.target.value))}
                required
                className="w-full text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Packaging Material
              </label>
              <select
                value={newPackageType}
                onChange={(e) => setNewPackageType(e.target.value as PackageType)}
                className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
              >
                <option value="CTNS">CTNS (Corrugated Cartons)</option>
                <option value="BAGS">BAGS (Poly Woven Bags)</option>
                <option value="BOXES">BOXES (Wooden Boxes)</option>
                <option value="SACKS">SACKS (Heavy Sacks)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Net Weight Variance (KG)
              </label>
              <input
                type="number"
                step="0.1"
                value={weightDifferenceKg}
                onChange={(e) => setWeightDifferenceKg(Number(e.target.value))}
                className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Packaging Materials Specification
            </label>
            <input
              type="text"
              value={packagingMaterialsUsed}
              onChange={(e) => setPackagingMaterialsUsed(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Repacking Justification & Notes
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
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
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Complete Repacking & Return to Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
