'use client'

import React, { useState } from 'react'
import { X, CheckCircle, ShieldAlert, Truck, Scale, ShieldCheck } from 'lucide-react'
import {
  CargoAcceptanceRecord,
  SecurityScreeningStatus,
  TerminalAcceptanceStatus,
} from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface CargoAcceptanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (acceptance: CargoAcceptanceRecord) => void
  bookingId: string
  bookingReference: string
  existingAcceptance?: CargoAcceptanceRecord | null
}

export function CargoAcceptanceModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  bookingReference,
  existingAcceptance,
}: CargoAcceptanceModalProps) {
  const [terminalName, setTerminalName] = useState(
    existingAcceptance?.terminalName || 'Kabul International Cargo Complex'
  )
  const [airportIata, setAirportIata] = useState(existingAcceptance?.airportIata || 'KBL')
  const [deliveringDriverName, setDeliveringDriverName] = useState(
    existingAcceptance?.deliveringDriverName || ''
  )
  const [deliveringTruckPlate, setDeliveringTruckPlate] = useState(
    existingAcceptance?.deliveringTruckPlate || ''
  )
  const [packagesReceived, setPackagesReceived] = useState<number>(
    existingAcceptance?.packagesReceived || 1
  )
  const [grossWeightReceivedKg, setGrossWeightReceivedKg] = useState<number>(
    existingAcceptance?.grossWeightReceivedKg || 0
  )
  const [terminalReceiptNumber, setTerminalReceiptNumber] = useState(
    existingAcceptance?.terminalReceiptNumber || ''
  )
  const [securityStatus, setSecurityStatus] = useState<SecurityScreeningStatus>(
    existingAcceptance?.securityStatus || 'COMPLETED'
  )
  const [screeningNotes, setScreeningNotes] = useState(
    existingAcceptance?.screeningNotes || 'Dual-View X-Ray and physical seal inspection passed.'
  )
  const [airlineAcceptanceStatus, setAirlineAcceptanceStatus] = useState<TerminalAcceptanceStatus>(
    existingAcceptance?.airlineAcceptanceStatus || 'ACCEPTED'
  )
  const [airlineAcceptanceRef, setAirlineAcceptanceRef] = useState(
    existingAcceptance?.airlineAcceptanceRef || ''
  )
  const [rejectionReason, setRejectionReason] = useState(
    existingAcceptance?.rejectionReason || ''
  )
  const [recordedBy, setRecordedBy] = useState(
    existingAcceptance?.recordedBy || 'Aviation Terminal Officer'
  )

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const saved = airFreightStore.recordCargoAcceptance({
      id: existingAcceptance?.id,
      bookingId,
      bookingReference,
      airportIata: airportIata.trim().toUpperCase(),
      terminalName: terminalName.trim(),
      deliveringDriverName: deliveringDriverName.trim() || undefined,
      deliveringTruckPlate: deliveringTruckPlate.trim() || undefined,
      packagesReceived: Number(packagesReceived),
      grossWeightReceivedKg: Number(grossWeightReceivedKg),
      terminalReceiptNumber: terminalReceiptNumber.trim() || undefined,
      securityStatus,
      screeningNotes: screeningNotes.trim() || undefined,
      airlineAcceptanceStatus,
      airlineAcceptanceRef: airlineAcceptanceRef.trim() || undefined,
      rejectionReason: rejectionReason.trim() || undefined,
      recordedBy: recordedBy.trim(),
    })

    onSave(saved)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Cargo Acceptance & Security Screening
              </h2>
              <p className="text-xs text-slate-400">
                Booking: <span className="text-sky-300 font-mono">{bookingReference}</span>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Invariance Rule Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong>Aviation Operational Invariance:</strong> Physical delivery of cargo into the
              airport terminal warehouse is not equivalent to Airline Cargo Acceptance. The airline only
              accepts liability after certified weighbridge verification and civil aviation security clearance.
            </div>
          </div>

          {/* Section 1: Physical Delivery */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Truck className="w-4 h-4" /> 1. Terminal Reception & Physical Cargo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Terminal Facility</label>
                <input
                  type="text"
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Airport IATA</label>
                <input
                  type="text"
                  value={airportIata}
                  onChange={(e) => setAirportIata(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Delivering Driver Name</label>
                <input
                  type="text"
                  value={deliveringDriverName}
                  onChange={(e) => setDeliveringDriverName(e.target.value)}
                  placeholder="e.g. Mohammad Tariq"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Truck Plate Number</label>
                <input
                  type="text"
                  value={deliveringTruckPlate}
                  onChange={(e) => setDeliveringTruckPlate(e.target.value)}
                  placeholder="e.g. KBL-28492"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Packages Count</label>
                <input
                  type="number"
                  min="1"
                  value={packagesReceived}
                  onChange={(e) => setPackagesReceived(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Scale Weight (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={grossWeightReceivedKg}
                  onChange={(e) => setGrossWeightReceivedKg(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Terminal Receipt #</label>
                <input
                  type="text"
                  value={terminalReceiptNumber}
                  onChange={(e) => setTerminalReceiptNumber(e.target.value)}
                  placeholder="e.g. TRN-8821"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Aviation Security Screening */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 2. Aviation Security Screening
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Screening Result</label>
                <select
                  value={securityStatus}
                  onChange={(e) => setSecurityStatus(e.target.value as SecurityScreeningStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="COMPLETED">COMPLETED (Security Cleared)</option>
                  <option value="PENDING">PENDING (In Screening Queue)</option>
                  <option value="NOT_REQUIRED">NOT_REQUIRED</option>
                  <option value="ISSUE">ISSUE / ALARM (Further Inspection Required)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Screened / Logged By</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  placeholder="Officer name and badge #"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Screening Method & Remarks</label>
              <input
                type="text"
                value={screeningNotes}
                onChange={(e) => setScreeningNotes(e.target.value)}
                placeholder="e.g. Dual-View X-Ray + Explosive Trace Detector (ETD)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Section 3: Formal Airline Acceptance */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> 3. Official Airline Handover & Acceptance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Airline Acceptance Status</label>
                <select
                  value={airlineAcceptanceStatus}
                  onChange={(e) => setAirlineAcceptanceStatus(e.target.value as TerminalAcceptanceStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="ACCEPTED">ACCEPTED (Airline Accepted for Flight)</option>
                  <option value="PENDING">PENDING (Awaiting Airline Handover)</option>
                  <option value="CORRECTION_REQUIRED">CORRECTION_REQUIRED (Repacking/Weight Discrepancy)</option>
                  <option value="REJECTED">REJECTED (Refused by Carrier)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Airline Acceptance Ref / RCL #</label>
                <input
                  type="text"
                  value={airlineAcceptanceRef}
                  onChange={(e) => setAirlineAcceptanceRef(e.target.value)}
                  placeholder="e.g. RCL-FG-2026-4421"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {airlineAcceptanceStatus === 'REJECTED' && (
              <div>
                <label className="block text-xs font-medium text-rose-300 mb-1">Rejection Reason</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for carrier refusal (e.g. leakage, improper labeling)"
                  className="w-full bg-slate-800 border border-rose-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  required
                />
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Record Acceptance
          </button>
        </div>
      </div>
    </div>
  )
}
