"use client"

import React, { useState } from "react"
import { X, Navigation, Copy, Check, MessageSquare, ShieldCheck, MapPin } from "lucide-react"
import { RoadTripRecord, RoadTripStatus } from "@/lib/types/fleet-operations"
import { fleetOperationsService } from "@/lib/services/fleet-operations-service"

interface TruckStatusUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  trip: RoadTripRecord
  onUpdate: (status: RoadTripStatus, location: string, internalNotes?: string, customerSafeNotes?: string) => void
}

export function TruckStatusUpdateModal({ isOpen, onClose, trip, onUpdate }: TruckStatusUpdateModalProps) {
  const [status, setStatus] = useState<RoadTripStatus>(trip.status)
  const [currentLocationName, setCurrentLocationName] = useState(trip.currentLocationName || "")
  const [internalNotes, setInternalNotes] = useState(trip.internalNotes || "")
  const [customerSafeNotes, setCustomerSafeNotes] = useState(trip.customerSafeNotes || "")
  const [lang, setLang] = useState<"dari" | "pashto" | "en">("dari")
  const [copiedType, setCopiedType] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(status, currentLocationName.trim(), internalNotes.trim(), customerSafeNotes.trim())
    onClose()
  }

  const driverMsg = fleetOperationsService.generateDriverWhatsAppDispatch(trip, lang)
  const customerMsg = fleetOperationsService.generateCustomerSafeTruckUpdate(
    { ...trip, status, currentLocationName, customerSafeNotes },
    lang
  )

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Update Checkpoint & Milestone Status
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trip Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RoadTripStatus)}
                  className="w-full text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="SCHEDULED">SCHEDULED (برنامه‌ریزی شده)</option>
                  <option value="DISPATCHED">DISPATCHED (اعزام شده)</option>
                  <option value="LOADING">LOADING (در حال بارگیری)</option>
                  <option value="IN_TRANSIT">IN_TRANSIT (در حال حرکت در جاده)</option>
                  <option value="AT_BORDER">AT_BORDER (رسیده به گمرک مرزی)</option>
                  <option value="BORDER_CLEARANCE">BORDER_CLEARANCE (طی مراحل گمرکی)</option>
                  <option value="TRANSLOADING">TRANSLOADING (تخلیه و بارگیری مرزی)</option>
                  <option value="EN_ROUTE_DESTINATION">EN_ROUTE_DESTINATION (حرکت به سوی مقصد)</option>
                  <option value="DELIVERED">DELIVERED (رسیده به مقصد تحویلی)</option>
                  <option value="POD_PENDING">POD_PENDING (در انتظار رسید امضا شده)</option>
                  <option value="COMPLETED">COMPLETED (پایان سفر و تایید رسید)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> Current Checkpoint / Location *
                </label>
                <input
                  type="text"
                  value={currentLocationName}
                  onChange={(e) => setCurrentLocationName(e.target.value)}
                  placeholder="e.g. Islam Qala Customs Gate or Herat Bypass"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Internal Ops Notes (محرمانه)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal instructions or customs inspector notes"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer-Safe Note (اطلاعیه به مشتری)
                </label>
                <textarea
                  rows={2}
                  value={customerSafeNotes}
                  onChange={(e) => setCustomerSafeNotes(e.target.value)}
                  placeholder="Public note displayed to customer (e.g. Truck cleared border; en route to Kabul)"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save Milestone Update
              </button>
            </div>
          </form>

          {/* Instant WhatsApp Dispatch & Customer Update Tools */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  One-Click WhatsApp Broadcasts
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs">
                {(["dari", "pashto", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-colors ${
                      lang === l
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Driver Operational Dispatch */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Driver Dispatch Order
                  </span>
                  <button
                    onClick={() => copyToClipboard(driverMsg, "driver")}
                    className="p-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1 transition-colors"
                  >
                    {copiedType === "driver" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === "driver" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre
                  dir={lang === "en" ? "ltr" : "rtl"}
                  className="text-[11px] font-sans text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-36 overflow-y-auto bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  {driverMsg}
                </pre>
              </div>

              {/* Customer Safe Progress Update */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Customer Safe Update
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(customerMsg, "customer")}
                    className="p-1 rounded text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition-colors"
                  >
                    {copiedType === "customer" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === "customer" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre
                  dir={lang === "en" ? "ltr" : "rtl"}
                  className="text-[11px] font-sans text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-36 overflow-y-auto bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800"
                >
                  {customerMsg}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
