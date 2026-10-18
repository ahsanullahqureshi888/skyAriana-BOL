'use client'

import React, { useState } from 'react'
import { X, CheckCircle, AlertCircle, ShieldCheck, Lock, Unlock, FileCheck } from 'lucide-react'
import { AirReleaseTracker } from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface ThreeWayReleaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (tracker: AirReleaseTracker) => void
  releaseTracker: AirReleaseTracker
  bookingReference: string
}

export function ThreeWayReleaseModal({
  isOpen,
  onClose,
  onSave,
  releaseTracker,
  bookingReference,
}: ThreeWayReleaseModalProps) {
  const [airlineRelease, setAirlineRelease] = useState(releaseTracker.airlineRelease)
  const [airlineReleaseRef, setAirlineReleaseRef] = useState(releaseTracker.airlineReleaseRef || '')
  const [customsRelease, setCustomsRelease] = useState(releaseTracker.customsRelease)
  const [terminalRelease, setTerminalRelease] = useState(releaseTracker.terminalRelease)
  const [deliveryOrderIssued, setDeliveryOrderIssued] = useState(releaseTracker.deliveryOrderIssued)
  const [releaseBlocked, setReleaseBlocked] = useState(releaseTracker.releaseBlocked)
  const [releaseBlockReason, setReleaseBlockReason] = useState(
    releaseTracker.releaseBlockReason || ''
  )

  if (!isOpen) return null

  // Live calculation of release status
  const allThreeGranted = airlineRelease && customsRelease && terminalRelease
  const canPickup = allThreeGranted && !releaseBlocked

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updated = airFreightStore.updateReleaseTracker(releaseTracker.id, {
      airlineRelease,
      airlineReleaseRef: airlineReleaseRef.trim() || undefined,
      airlineReleaseDate: airlineRelease ? releaseTracker.airlineReleaseDate || new Date().toISOString() : undefined,
      customsRelease,
      customsReleaseDate: customsRelease ? releaseTracker.customsReleaseDate || new Date().toISOString() : undefined,
      terminalRelease,
      terminalReleaseDate: terminalRelease ? releaseTracker.terminalReleaseDate || new Date().toISOString() : undefined,
      deliveryOrderIssued,
      deliveryOrderDate: deliveryOrderIssued ? releaseTracker.deliveryOrderDate || new Date().toISOString() : undefined,
      releaseBlocked,
      releaseBlockReason: releaseBlocked ? releaseBlockReason.trim() : undefined,
    })

    onSave(updated)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                3-Way Air Cargo Release Control
              </h2>
              <p className="text-xs text-slate-400">
                Booking: <span className="text-sky-300 font-mono">{bookingReference}</span> | MAWB:{' '}
                <span className="text-emerald-300 font-mono">{releaseTracker.mawbNumber}</span>
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
          {/* Status Indicator Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              canPickup
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
          >
            {canPickup ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-bold text-sm block">
                {canPickup ? 'CARGO FULLY CLEARED FOR PHYSICAL RELEASE' : 'RELEASE PENDING CONFIRMATION'}
              </span>
              <span>
                {canPickup
                  ? 'All 3 release gates (Airline, Customs, Terminal) are verified and no financial holds exist.'
                  : 'Cargo delivery is blocked until all 3 releases are granted and financial holds are cleared.'}
              </span>
            </div>
          </div>

          {/* Gate 1: Airline Release */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">1. Airline Release (Freight & Documents)</span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={airlineRelease}
                  onChange={(e) => setAirlineRelease(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                Granted
              </label>
            </div>
            {airlineRelease && (
              <input
                type="text"
                value={airlineReleaseRef}
                onChange={(e) => setAirlineReleaseRef(e.target.value)}
                placeholder="Airline release reference / Stamp #"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            )}
          </div>

          {/* Gate 2: Customs Release */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">2. Customs Air Cargo Clearance</span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customsRelease}
                  onChange={(e) => setCustomsRelease(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                Customs Cleared
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Customs inspection, duty assessment, and exit release stamp confirmed.
            </p>
          </div>

          {/* Gate 3: Terminal Handling Release */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">3. Terminal Release (THC & Dwell Settled)</span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={terminalRelease}
                  onChange={(e) => setTerminalRelease(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                Terminal Settled
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Terminal handling charges (THC) and airport storage charges cleared.
            </p>
          </div>

          {/* Gate 4: Delivery Order (DO) */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">Official Delivery Order (DO) Issued</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={deliveryOrderIssued}
                onChange={(e) => setDeliveryOrderIssued(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              Issued
            </label>
          </div>

          {/* Financial / Operational Hold */}
          <div className="p-4 bg-rose-950/30 rounded-xl border border-rose-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300">
                {releaseBlocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="text-xs font-semibold">Financial / Operational Hold</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseBlocked}
                  onChange={(e) => setReleaseBlocked(e.target.checked)}
                  className="rounded bg-slate-800 border-rose-700 text-rose-500 focus:ring-0"
                />
                Active Hold
              </label>
            </div>

            {releaseBlocked && (
              <input
                type="text"
                value={releaseBlockReason}
                onChange={(e) => setReleaseBlockReason(e.target.value)}
                placeholder="Reason for financial or management hold..."
                className="w-full bg-slate-800 border border-rose-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                required={releaseBlocked}
              />
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Update Release Status
          </button>
        </div>
      </div>
    </div>
  )
}
