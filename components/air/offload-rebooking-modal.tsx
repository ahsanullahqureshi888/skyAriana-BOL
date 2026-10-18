'use client'

import React, { useState } from 'react'
import { X, AlertOctagon, RefreshCw, Plane, ShieldAlert, ArrowRight } from 'lucide-react'
import { OffloadReason, OffloadRecord } from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface OffloadRebookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (record: OffloadRecord) => void
  bookingId: string
  bookingReference: string
  currentFlightNumber: string
  originAirportIata: string
}

export function OffloadRebookingModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  bookingReference,
  currentFlightNumber,
  originAirportIata,
}: OffloadRebookingModalProps) {
  const [reason, setReason] = useState<OffloadReason>('AIRCRAFT_PAYLOAD_LIMIT')
  const [detailedReason, setDetailedReason] = useState('')
  const [offloadAirportIata, setOffloadAirportIata] = useState(originAirportIata)
  const [recordedBy, setRecordedBy] = useState('Air Operations Supervisor')

  // Rebooking fields
  const [isImmediateRebook, setIsImmediateRebook] = useState(true)
  const [rebookedFlightNumber, setRebookedFlightNumber] = useState('')
  const [rebookedDate, setRebookedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedReason.trim()) return

    const record = airFreightStore.recordOffload({
      bookingId,
      originalFlightNumber: currentFlightNumber,
      offloadAirportIata: offloadAirportIata.trim().toUpperCase(),
      reason,
      detailedReason: detailedReason.trim(),
      rebookedFlightNumber: isImmediateRebook && rebookedFlightNumber.trim() ? rebookedFlightNumber.trim().toUpperCase() : undefined,
      rebookedDate: isImmediateRebook && rebookedFlightNumber.trim() ? rebookedDate : undefined,
      recordedBy: recordedBy.trim(),
    })

    onSave(record)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-rose-900/60 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Log Cargo Offload & Rebooking
              </h2>
              <p className="text-xs text-slate-400">
                Booking: <span className="text-sky-300 font-mono">{bookingReference}</span> | Flight:{' '}
                <span className="text-rose-300 font-mono">{currentFlightNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong>Audit Invariance:</strong> Offload logs must preserve original flight records.
              Rebooking assigns an additional flight leg rather than erasing historical manifests.
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Offload Category Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as OffloadReason)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              <option value="AIRCRAFT_PAYLOAD_LIMIT">AIRCRAFT_PAYLOAD_LIMIT (Max Takeoff/Landing Weight Exceeded)</option>
              <option value="WEATHER_RESTRICTION">WEATHER_RESTRICTION (Adverse Weather / Runway Conditions)</option>
              <option value="TECHNICAL_AIRCRAFT_CHANGE">TECHNICAL_AIRCRAFT_CHANGE (Aircraft Downsizing / AOG)</option>
              <option value="COMMERCIAL_PRIORITY">COMMERCIAL_PRIORITY (Baggage / Priority Cargo Bump)</option>
              <option value="DOCUMENTATION_DISCREPANCY">DOCUMENTATION_DISCREPANCY (Customs or AWB hold)</option>
              <option value="SECURITY_CHECK_DELAY">SECURITY_CHECK_DELAY (Aviation Screening Issue)</option>
              <option value="CUSTOMS_HOLD">CUSTOMS_HOLD (Border Regulatory Hold)</option>
              <option value="OTHER">OTHER (Special Ramp Condition)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Offload Station / Airport</label>
              <input
                type="text"
                value={offloadAirportIata}
                onChange={(e) => setOffloadAirportIata(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 uppercase font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recorded By Staff</label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Detailed Reason / Incident Log
            </label>
            <textarea
              rows={3}
              value={detailedReason}
              onChange={(e) => setDetailedReason(e.target.value)}
              placeholder="Explain root cause (e.g. ambient temperature in Kabul rose to 38C requiring 1500kg cargo offload)..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
              required
            />
          </div>

          {/* Rebooking Section */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" /> Rebook onto Next Available Flight
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isImmediateRebook}
                  onChange={(e) => setIsImmediateRebook(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                />
                Rebook Now
              </label>
            </div>

            {isImmediateRebook && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Replacement Flight Number
                  </label>
                  <input
                    type="text"
                    value={rebookedFlightNumber}
                    onChange={(e) => setRebookedFlightNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. FG-712"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                    required={isImmediateRebook}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Rebooked Flight Date</label>
                  <input
                    type="date"
                    value={rebookedDate}
                    onChange={(e) => setRebookedDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    required={isImmediateRebook}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            <AlertOctagon className="w-4 h-4" />
            Confirm Offload & Rebook
          </button>
        </div>
      </div>
    </div>
  )
}
