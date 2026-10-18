"use client"

import React, { useState } from "react"
import {
  X,
  Navigation,
  ArrowRightLeft,
  Wrench,
  DollarSign,
  FileCheck2,
  Calendar,
  Phone,
  ShieldCheck,
  Plus,
  AlertTriangle,
} from "lucide-react"
import {
  RoadTripRecord,
  TruckRecord,
  DriverRecord,
  TripExpenseCategory,
  PodRecord,
} from "@/lib/types/fleet-operations"
import { AfghanTruckPlate } from "@/components/ui/afghan-truck-plate"

interface TripDetailModalProps {
  isOpen: boolean
  onClose: () => void
  trip: RoadTripRecord
  onOpenStatusModal: () => void
  onOpenTransloadModal: () => void
  onOpenBreakdownModal: () => void
  onAddExpense: (expense: {
    category: TripExpenseCategory
    description: string
    amount: number
    currency: "AFN" | "USD" | "IRR" | "PKR"
    receiptNumber?: string
    paymentStatus: "ADVANCED" | "REIMBURSED" | "PENDING" | "DEDUCTED_FROM_RENT"
  }) => void
  onRecordPod: (pod: Omit<PodRecord, "id" | "tripId" | "createdAt">) => void
}

export function TripDetailModal({
  isOpen,
  onClose,
  trip,
  onOpenStatusModal,
  onOpenTransloadModal,
  onOpenBreakdownModal,
  onAddExpense,
  onRecordPod,
}: TripDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "transload" | "breakdowns" | "expenses" | "pod">("overview")

  // New expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseCategory, setExpenseCategory] = useState<TripExpenseCategory>("FUEL")
  const [expenseDesc, setExpenseDesc] = useState("")
  const [expenseAmount, setExpenseAmount] = useState(5000)
  const [expenseCurrency, setExpenseCurrency] = useState<"AFN" | "USD" | "IRR" | "PKR">(trip.currency)
  const [expenseReceipt, setExpenseReceipt] = useState("")

  // POD form state
  const [receiverName, setReceiverName] = useState("")
  const [receiverPhone, setReceiverPhone] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0])
  const [deliveryLocation, setDeliveryLocation] = useState(trip.destinationLocationName)
  const [receivedCartons, setReceivedCartons] = useState(1200)
  const [damagedCartons, setDamagedCartons] = useState(0)
  const [shortageCartons, setShortageCartons] = useState(0)
  const [sealIntact, setSealIntact] = useState(true)
  const [podRemarks, setPodRemarks] = useState("")

  if (!isOpen) return null

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseDesc.trim() || expenseAmount <= 0) return

    onAddExpense({
      category: expenseCategory,
      description: expenseDesc.trim(),
      amount: Number(expenseAmount),
      currency: expenseCurrency,
      receiptNumber: expenseReceipt.trim() || undefined,
      paymentStatus: "REIMBURSED",
    })

    setExpenseDesc("")
    setExpenseAmount(5000)
    setExpenseReceipt("")
    setShowExpenseForm(false)
  }

  const handlePodSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiverName.trim()) {
      alert("Please provide the receiver's name.")
      return
    }

    onRecordPod({
      bolNumber: trip.bolNumber,
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim() || undefined,
      deliveryDate,
      deliveryLocation: deliveryLocation.trim(),
      receivedCartons: Number(receivedCartons),
      damagedCartons: Number(damagedCartons),
      shortageCartons: Number(shortageCartons),
      sealIntactOnArrival: sealIntact,
      remarks: podRemarks.trim() || undefined,
      signatureRecorded: true,
      verifiedBy: "Operations Receiving Agent",
    })
  }

  const totalExpenses = trip.expenses.reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {trip.tripNumber}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Leg {trip.legIndex}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    trip.status === "DELIVERED" || trip.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : trip.status === "BROKEN_DOWN"
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {trip.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bill of Lading: <strong className="text-slate-700 dark:text-slate-300">{trip.bolNumber}</strong> | Transit Route: {trip.originLocationName} → {trip.destinationLocationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vehicle & Financial Banner */}
        <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            {trip.truckCountry === "AF" ? (
              <AfghanTruckPlate plateNumber={trip.truckPlate} size="compact" />
            ) : (
              <div className="px-3 py-1 bg-yellow-400 text-slate-950 font-mono font-black text-sm rounded border border-slate-950">
                [{trip.truckCountry}] {trip.truckPlate}
              </div>
            )}

            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Driver: {trip.driverName}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Father: {trip.driverFatherName || "—"}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" /> {trip.driverPhone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-500 block">Agreed Rent:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {trip.agreedDriverRent.toLocaleString()} {trip.currency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Advance:</span>
              <span className="font-bold text-emerald-600">
                {trip.advancePaid.toLocaleString()} {trip.currency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Balance Due:</span>
              <span className="font-bold text-blue-600">
                {trip.balancePayable.toLocaleString()} {trip.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900 shrink-0">
          {[
            { id: "overview", label: "Overview & Milestones", icon: Navigation },
            { id: "transload", label: `Transloads (${trip.transloadHistory.length})`, icon: ArrowRightLeft },
            { id: "breakdowns", label: `Incidents (${trip.breakdownHistory.length})`, icon: Wrench },
            { id: "expenses", label: `Expenses (${trip.expenses.length})`, icon: DollarSign },
            { id: "pod", label: trip.pod ? "POD Sign-off (Verified)" : "Proof of Delivery", icon: FileCheck2 },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Routing Information
                  </h4>
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Origin Terminal:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{trip.originLocationName}</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Destination:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{trip.destinationLocationName}</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Customs Border Station:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {trip.borderStation || "Direct Inland"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Timeline & Schedules
                  </h4>
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Planned Departure:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono">
                      {trip.plannedDepartureDate}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Estimated Arrival (ETA):</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono">
                      {trip.estimatedArrivalDate}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500 block text-xs">Current Waypoint Checkpoint:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {trip.currentLocationName}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Internal Dispatch Notes (Internal Only)
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {trip.internalNotes || "No internal notes recorded."}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-1">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Customer-Safe Transit Note
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {trip.customerSafeNotes || "Shipment moving on schedule."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSLOAD HISTORY */}
          {activeTab === "transload" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Cross-Border & Terminal Transloads
                  </h4>
                  <p className="text-xs text-slate-500">
                    Historical record of all vehicle swaps and seal replacements for this leg
                  </p>
                </div>
                <button
                  onClick={onOpenTransloadModal}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Execute Transload
                </button>
              </div>

              {trip.transloadHistory.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                  No transloads recorded. Initial truck is hauling directly to destination.
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.transloadHistory.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {t.transloadLocation}
                        </span>
                        <span className="text-slate-400 font-mono">{t.transloadDate}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Previous Vehicle & Driver
                          </span>
                          <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            Plate: {t.oldTruckPlate}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Driver: {t.oldDriverName} (s/o {t.oldDriverFatherName || "—"})
                          </div>
                          <div className="text-slate-400 font-mono mt-1">
                            Cut Seal: {t.sealNumberBefore}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase font-bold">
                            Onward Vehicle & Driver
                          </span>
                          <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            Plate: {t.newTruckPlate}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Driver: {t.newDriverName} (s/o {t.newDriverFatherName || "—"})
                          </div>
                          <div className="text-emerald-700 dark:text-emerald-400 font-mono mt-1 font-bold">
                            Applied Seal: {t.sealNumberAfter}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>
                          Tally Count: <strong>{t.tallyCartonsCount} Cartons</strong> ({t.cargoCondition})
                        </span>
                        <span>Officer: {t.recordedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BREAKDOWNS */}
          {activeTab === "breakdowns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Incident & Breakdown Log
                  </h4>
                  <p className="text-xs text-slate-500">
                    Roadside technical breakdowns and relief vehicle assignments
                  </p>
                </div>
                <button
                  onClick={onOpenBreakdownModal}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center gap-1.5 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" /> Report / Resolve Breakdown
                </button>
              </div>

              {trip.breakdownHistory.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                  No breakdown incidents reported on this trip. Vehicle running smoothly.
                </div>
              ) : (
                <div className="space-y-3">
                  {trip.breakdownHistory.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/20 dark:bg-red-950/10 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-900 dark:text-red-300">
                          {b.issueDescription}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200">
                          {b.status}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        Location: {b.breakdownLocation} (Severity: {b.severity})
                      </div>
                      {b.mechanicDispatched && (
                        <div className="text-blue-600 dark:text-blue-400">
                          Mechanic Assistance: {b.mechanicDetails || "Dispatched roadside assistance"}
                        </div>
                      )}
                      {b.repairCost && (
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          Repair Expense: {b.repairCost.toLocaleString()} {b.currency}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Road Freight Disbursements & Expenses
                  </h4>
                  <p className="text-xs text-slate-500">
                    Fuel, weighbridge, toll roads, and border customs fees (Linked to Central Finance)
                  </p>
                </div>
                <button
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Expense Line
                </button>
              </div>

              {showExpenseForm && (
                <form
                  onSubmit={handleExpenseSubmit}
                  className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value as any)}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-900 dark:text-slate-100 font-bold"
                      >
                        <option value="FUEL">FUEL (دیزل / تیل)</option>
                        <option value="TOLL_ROAD">TOLL_ROAD (عوارض شاهراه)</option>
                        <option value="BORDER_CLEARANCE_FEE">BORDER_FEE (هزینه گمرک مرزی)</option>
                        <option value="WEIGHBRIDGE">WEIGHBRIDGE (باسکول)</option>
                        <option value="DRIVER_ALLOWANCE">ALLOWANCE (حق سفر / غذا)</option>
                        <option value="DRIVER_ADVANCE">ADVANCE (پیشکی)</option>
                        <option value="REPAIR_MAINTENANCE">REPAIR (تعمیرات سرراهی)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        placeholder="e.g. 200L Diesel at Ghorian fuel station"
                        required
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(Number(e.target.value))}
                        required
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Currency
                      </label>
                      <select
                        value={expenseCurrency}
                        onChange={(e) => setExpenseCurrency(e.target.value as any)}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-bold"
                      >
                        <option value="AFN">AFN</option>
                        <option value="USD">USD</option>
                        <option value="IRR">IRR</option>
                        <option value="PKR">PKR</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Receipt / Slip No.
                      </label>
                      <input
                        type="text"
                        value={expenseReceipt}
                        onChange={(e) => setExpenseReceipt(e.target.value)}
                        placeholder="e.g. RCP-4410"
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExpenseForm(false)}
                      className="px-3 py-1 rounded text-xs border border-slate-300 text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded text-xs bg-emerald-600 text-white font-bold"
                    >
                      Save Expense
                    </button>
                  </div>
                </form>
              )}

              {trip.expenses.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                  No road expenses logged for this trip yet.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Category</th>
                        <th className="px-3 py-2 font-semibold">Description</th>
                        <th className="px-3 py-2 font-semibold">Receipt No.</th>
                        <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {trip.expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                          <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">
                            {e.category}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                            {e.description}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">{e.receiptNumber || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {e.amount.toLocaleString()} {e.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                          Total Logged Expenses:
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600">
                          {totalExpenses.toLocaleString()} {trip.currency}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: POD */}
          {activeTab === "pod" && (
            <div className="space-y-4">
              {trip.pod ? (
                <div className="p-5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                        Signed Proof of Delivery (POD) Archived
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      Delivered: {trip.pod.deliveryDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Receiver Name:</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {trip.pod.receiverName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Contact Phone:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {trip.pod.receiverPhone || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block">Cartons Delivered:</span>
                      <strong className="text-sm text-slate-900 dark:text-slate-100">
                        {trip.pod.receivedCartons}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Damaged:</span>
                      <span
                        className={`text-sm font-bold ${
                          trip.pod.damagedCartons > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {trip.pod.damagedCartons}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Shortage:</span>
                      <span
                        className={`text-sm font-bold ${
                          trip.pod.shortageCartons > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {trip.pod.shortageCartons}
                      </span>
                    </div>
                  </div>

                  {trip.pod.remarks && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      <strong>Remarks:</strong> {trip.pod.remarks}
                    </div>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={handlePodSubmit}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" /> Complete Delivery & Record POD Sign-off
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Receiver / Warehouse Supervisor Name *
                      </label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="e.g. Haji Bashir (ACCS Kabul Store Manager)"
                        required
                        className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Receiver Phone
                      </label>
                      <input
                        type="tel"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="+93 70 123 4567"
                        className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Received Cartons
                      </label>
                      <input
                        type="number"
                        value={receivedCartons}
                        onChange={(e) => setReceivedCartons(Number(e.target.value))}
                        className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Damaged Cartons
                      </label>
                      <input
                        type="number"
                        value={damagedCartons}
                        onChange={(e) => setDamagedCartons(Number(e.target.value))}
                        className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Shortage Cartons
                      </label>
                      <input
                        type="number"
                        value={shortageCartons}
                        onChange={(e) => setShortageCartons(Number(e.target.value))}
                        className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-amber-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Remarks / Exceptions
                    </label>
                    <textarea
                      rows={2}
                      value={podRemarks}
                      onChange={(e) => setPodRemarks(e.target.value)}
                      placeholder="e.g. Physical inspection completed. All carton tags match commercial invoice."
                      className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 text-sm font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      Confirm POD & Mark Trip Complete
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStatusModal}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" /> Update Waypoint / WhatsApp
            </button>
            <button
              onClick={onOpenTransloadModal}
              className="px-3.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transload Vehicle
            </button>
            <button
              onClick={onOpenBreakdownModal}
              className="px-3.5 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" /> Incident Report
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
