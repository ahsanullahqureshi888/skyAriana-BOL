'use client'

import React, { useState } from 'react'
import { X, RefreshCw, AlertTriangle } from 'lucide-react'
import { VoyageRecord, VesselRecord } from '@/lib/types/ocean-vessel'

interface RolloverModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    containerNumber: string
    bookingId: string
    bookingNumber: string
    bolNumber?: string
    originalVesselId: string
    originalVesselName: string
    originalVoyageNumber: string
    originalEtd: string
    newVesselId: string
    newVesselName: string
    newVoyageNumber: string
    newEtd: string
    reason: string
    recordedBy: string
  }) => void
  vessels: VesselRecord[]
  voyages: VoyageRecord[]
  initialContainerNumber?: string
  initialBookingNumber?: string
  initialBolNumber?: string
  initialVesselId?: string
  initialVesselName?: string
  initialVoyageNumber?: string
  initialEtd?: string
}

export function RolloverModal({
  isOpen,
  onClose,
  onSave,
  vessels,
  voyages,
  initialContainerNumber,
  initialBookingNumber,
  initialBolNumber,
  initialVesselId,
  initialVesselName,
  initialVoyageNumber,
  initialEtd,
}: RolloverModalProps) {
  const [containerNumber, setContainerNumber] = useState(initialContainerNumber || '')
  const [bookingNumber, setBookingNumber] = useState(initialBookingNumber || '')
  const [bolNumber, setBolNumber] = useState(initialBolNumber || '')
  const [originalVesselName, setOriginalVesselName] = useState(initialVesselName || 'BARGE ARIA 1')
  const [originalVoyageNumber, setOriginalVoyageNumber] = useState(initialVoyageNumber || '080')
  const [originalEtd, setOriginalEtd] = useState(
    initialEtd ? initialEtd.split('T')[0] : '2026-03-20'
  )

  const [newVoyageId, setNewVoyageId] = useState(voyages[0]?.id || '')
  const [reason, setReason] = useState('Feeder barge capacity shut-out at Shahid Rajaee Quay')
  const [recordedBy, setRecordedBy] = useState('Ocean Operations Officer')

  if (!isOpen) return null

  const selectedNewVoyage = voyages.find((v) => v.id === newVoyageId) || voyages[0]
  const selectedNewVessel =
    vessels.find((v) => v.id === selectedNewVoyage?.vesselId) ||
    vessels.find((v) => v.name === selectedNewVoyage?.vesselNameSnapshot) ||
    vessels[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!containerNumber.trim() || !reason.trim()) return

    onSave({
      containerNumber: containerNumber.trim().toUpperCase(),
      bookingId: `bk-${containerNumber.trim()}`,
      bookingNumber: bookingNumber.trim() || 'BKG-REF',
      bolNumber: bolNumber.trim() || undefined,
      originalVesselId: initialVesselId || 'ves-orig',
      originalVesselName,
      originalVoyageNumber,
      originalEtd: `${originalEtd}T00:00:00Z`,
      newVesselId: selectedNewVessel?.id || 'ves-new',
      newVesselName: selectedNewVoyage?.vesselNameSnapshot || selectedNewVessel?.name || 'New Vessel',
      newVoyageNumber: selectedNewVoyage?.voyageNumber || '001',
      newEtd: selectedNewVoyage?.plannedEtd || new Date().toISOString(),
      reason: reason.trim(),
      recordedBy: recordedBy.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 shadow-2xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Container Rollover</h2>
              <p className="text-xs text-slate-500">Explicit vessel shut-out / rollover transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-medium">
          {/* Invariance Alert */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>No False Rollovers:</strong> A simple schedule date change must NEVER create a rollover.
              Rollovers are only recorded when a container was bumped/shut out and officially reassigned to another
              vessel or voyage.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Container Number *</label>
              <input
                type="text"
                required
                value={containerNumber}
                onChange={(e) => setContainerNumber(e.target.value)}
                placeholder="e.g. TCKU8819201"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Number</label>
              <input
                type="text"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="e.g. BKG-HLC-2026-1029"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          {/* Original Allocation Box */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Previous Allocation (Shut Out)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Vessel:</span>
                <input
                  type="text"
                  value={originalVesselName}
                  onChange={(e) => setOriginalVesselName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 w-full shadow-2xs"
                />
              </div>
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Voyage:</span>
                <input
                  type="text"
                  value={originalVoyageNumber}
                  onChange={(e) => setOriginalVoyageNumber(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 w-full shadow-2xs font-mono"
                />
              </div>
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Original ETD:</span>
                <input
                  type="date"
                  value={originalEtd}
                  onChange={(e) => setOriginalEtd(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 w-full shadow-2xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* New Reassigned Voyage Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Assigned Vessel & Voyage *
            </label>
            <select
              value={newVoyageId}
              onChange={(e) => setNewVoyageId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
            >
              {voyages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vesselNameSnapshot} — Voy: {v.voyageNumber} (ETD: {v.plannedEtd.split('T')[0]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rollover Reason *</label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Shut-out due to terminal stack weight limits or vessel overbooking..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recorded By *</label>
            <input
              type="text"
              required
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition text-xs"
            >
              Confirm Rollover
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
