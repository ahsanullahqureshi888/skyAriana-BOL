"use client"

import React, { useState } from "react"
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Scale,
  Lock,
  Box,
} from "lucide-react"
import {
  LoadingPlanRecord,
  LoadingSessionRecord,
  CargoLotRecord,
} from "@/lib/types/warehouse-cargo"

interface ActiveLoadingModalProps {
  isOpen: boolean
  onClose: () => void
  plan: LoadingPlanRecord
  session: LoadingSessionRecord
  availableLots: CargoLotRecord[]
  onAddQuantity: (lotId: string, quantity: number) => void
  onCompleteSession: (data: {
    sealNumber: string
    vgmWeightKg?: number
    discrepancyType?: "NONE" | "SHORTAGE" | "EXCESS" | "WEIGHT_VARIANCE" | "DAMAGED_DURING_LOADING"
    discrepancyDetails?: string
    notes?: string
  }) => void
}

export function ActiveLoadingModal({
  isOpen,
  onClose,
  plan,
  session,
  availableLots,
  onAddQuantity,
  onCompleteSession,
}: ActiveLoadingModalProps) {
  // Input for adding quantity
  const [selectedLotId, setSelectedLotId] = useState(plan.allocatedLots[0]?.cargoLotId || "")
  const [addQty, setAddQty] = useState(200)

  // Completion state
  const [isFinishing, setIsFinishing] = useState(false)
  const [sealNumber, setSealNumber] = useState(session.sealNumber || `SEAL-${Math.floor(100000 + Math.random() * 900000)}`)
  const [vgmWeightKg, setVgmWeightKg] = useState(
    Number((session.totalGrossWeightLoadedKg + 3800).toFixed(1)) // + container tare ~3,800 KG
  )
  const [discrepancyType, setDiscrepancyType] = useState<
    "NONE" | "SHORTAGE" | "EXCESS" | "WEIGHT_VARIANCE" | "DAMAGED_DURING_LOADING"
  >("NONE")
  const [discrepancyDetails, setDiscrepancyDetails] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")

  if (!isOpen) return null

  const loadedCount = session.totalPackagesLoaded
  const plannedCount = plan.plannedPackages
  const remainingCount = Math.max(0, plannedCount - loadedCount)
  const progressPct = plannedCount > 0 ? Math.min(100, Math.round((loadedCount / plannedCount) * 100)) : 0

  const handleAddQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addQty <= 0) return
    onAddQuantity(selectedLotId, Number(addQty))
    setAddQty(100)
  }

  const handleFinalComplete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sealNumber.trim()) {
      alert("Please provide the security bolt seal number before completing stuffing.")
      return
    }

    onCompleteSession({
      sealNumber: sealNumber.trim(),
      vgmWeightKg: Number(vgmWeightKg),
      discrepancyType,
      discrepancyDetails: discrepancyDetails.trim() || undefined,
      notes: completionNotes.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Active Loading & Container Stuffing
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {session.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Plan: {plan.planNumber} • Container:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {plan.containerNumber || plan.truckPlate}
                </strong>{" "}
                ({plan.containerType}) • BOL: {plan.bolNumber}
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

        {/* Live Loading Progress Bar */}
        <div className="px-6 py-4 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-slate-600 dark:text-slate-400 font-sans">
              Loading Progress: {loadedCount.toLocaleString()} / {plannedCount.toLocaleString()} Packages
            </span>
            <span className="text-indigo-600 dark:text-indigo-400">{progressPct}%</span>
          </div>

          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Loaded: {loadedCount}</span>
            <span>Remaining: {remainingCount}</span>
            <span>Loaded Gross Wt: {session.totalGrossWeightLoadedKg.toLocaleString()} KG</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isFinishing ? (
            <>
              {/* Incremental Loading Intake */}
              <form
                onSubmit={handleAddQuantitySubmit}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Record Loaded Tally Increment
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Select Cargo Lot
                    </label>
                    <select
                      value={selectedLotId}
                      onChange={(e) => setSelectedLotId(e.target.value)}
                      className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                    >
                      {plan.allocatedLots.map((al) => {
                        const lot = availableLots.find((l) => l.id === al.cargoLotId)
                        return (
                          <option key={al.cargoLotId} value={al.cargoLotId}>
                            {al.lotNumber} — {al.commodity} (Remaining in Wh: {lot?.remainingQuantity || 0})
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Packages Loaded Now
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-1.5">
                    {[50, 100, 200, 500].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setAddQty(quick)}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      >
                        +{quick}
                      </button>
                    ))}
                    {remainingCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddQty(remainingCount)}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200"
                      >
                        All Remaining ({remainingCount})
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Confirm Loaded
                  </button>
                </div>
              </form>

              {/* Already Loaded Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Loaded Lots in this Session
                </h4>

                {session.loadedLots.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                    No cargo loaded into container yet. Add quantity above.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Lot Number</th>
                          <th className="px-3 py-2 text-right">Packages Loaded</th>
                          <th className="px-3 py-2 text-right">Net Weight</th>
                          <th className="px-3 py-2 text-right">Gross Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {session.loadedLots.map((ll) => (
                          <tr key={ll.cargoLotId}>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {ll.lotNumber}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              {ll.packagesLoaded} CTNS
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {ll.netWeightLoadedKg.toLocaleString()} KG
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100 font-bold">
                              {ll.grossWeightLoadedKg.toLocaleString()} KG
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Final Stuffing Sign-off Form */
            <form onSubmit={handleFinalComplete} className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-100 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Final Stuffing Verification & Container Sealing
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Total loaded: <strong>{loadedCount} Packages</strong> ({session.totalGrossWeightLoadedKg.toLocaleString()} KG Gross).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" /> High-Security Bolt Seal Number *
                  </label>
                  <input
                    type="text"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    placeholder="e.g. MSK-SEAL-88910"
                    required
                    className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-purple-600" /> Verified Gross Mass (VGM KG)
                  </label>
                  <input
                    type="number"
                    value={vgmWeightKg}
                    onChange={(e) => setVgmWeightKg(Number(e.target.value))}
                    className="w-full text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Discrepancy Exception (If Any)
                  </label>
                  <select
                    value={discrepancyType}
                    onChange={(e) => setDiscrepancyType(e.target.value as any)}
                    className="w-full text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="NONE">NONE (No Shortage or Discrepancy)</option>
                    <option value="SHORTAGE">SHORTAGE (Less packages than planned)</option>
                    <option value="EXCESS">EXCESS (More packages loaded than planned)</option>
                    <option value="WEIGHT_VARIANCE">WEIGHT VARIANCE (Scale differs from calculated)</option>
                    <option value="DAMAGED_DURING_LOADING">DAMAGED DURING STUFFING</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Discrepancy Explanation
                  </label>
                  <input
                    type="text"
                    value={discrepancyDetails}
                    onChange={(e) => setDiscrepancyDetails(e.target.value)}
                    placeholder="e.g. 5 cartons shortage staged for next container"
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Supervisor Notes
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Container clean, dry and odor-free before stuffing. Heavy bolt seal applied."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFinishing(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-600"
                >
                  Back to Loading Tally
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                >
                  Confirm Stuffing & Lock Seal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Supervisor: <strong>{session.supervisorName}</strong>
          </div>

          <div className="flex items-center gap-2">
            {!isFinishing ? (
              <button
                type="button"
                onClick={() => setIsFinishing(true)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Finish Loading & Seal Container
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsFinishing(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Continue Loading
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
