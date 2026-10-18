'use client'

import React, { useState } from 'react'
import { X, Layers, Ship, Calendar } from 'lucide-react'
import { OceanLegRecord, OceanLegStatus, VesselRecord, VoyageRecord } from '@/lib/types/ocean-vessel'

interface OceanLegModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (leg: OceanLegRecord) => void
  vessels: VesselRecord[]
  voyages: VoyageRecord[]
  existingLeg?: OceanLegRecord | null
}

export function OceanLegModal({
  isOpen,
  onClose,
  onSave,
  vessels,
  voyages,
  existingLeg,
}: OceanLegModalProps) {
  const [legNumber, setLegNumber] = useState(existingLeg?.legNumber || 1)
  const [legLabel, setLegLabel] = useState(
    existingLeg?.legLabel || (legNumber === 1 ? 'First Leg (Feeder)' : 'Second Leg (Mother Vessel)')
  )
  const [bookingNumber, setBookingNumber] = useState(existingLeg?.bookingNumber || 'BKG-CMA-2026-8819')
  const [bolNumber, setBolNumber] = useState(existingLeg?.bolNumber || 'BOL-2026-0041')
  const [voyageId, setVoyageId] = useState(existingLeg?.voyageId || (voyages[0]?.id || ''))
  const [polName, setPolName] = useState(existingLeg?.polName || 'Bandar Abbas (Shahid Rajaee)')
  const [podName, setPodName] = useState(existingLeg?.podName || 'Jebel Ali')
  const [etd, setEtd] = useState(existingLeg?.etd ? existingLeg.etd.split('T')[0] : '2026-03-25')
  const [eta, setEta] = useState(existingLeg?.eta ? existingLeg.eta.split('T')[0] : '2026-03-28')
  const [status, setStatus] = useState<OceanLegStatus>(existingLeg?.status || 'WAITING_VESSEL')
  const [containerNumbersText, setContainerNumbersText] = useState(
    existingLeg?.containerNumbers ? existingLeg.containerNumbers.join(', ') : 'MSKU9981240, CMAU7718290'
  )
  const [blReference, setBlReference] = useState(existingLeg?.blReference || '')
  const [notes, setNotes] = useState(existingLeg?.notes || '')

  if (!isOpen) return null

  const selectedVoyage = voyages.find((v) => v.id === voyageId) || voyages[0]
  const selectedVessel =
    vessels.find((v) => v.id === selectedVoyage?.vesselId) ||
    vessels.find((v) => v.name === selectedVoyage?.vesselNameSnapshot) ||
    vessels[0]

  const handleLegNumberChange = (num: number) => {
    setLegNumber(num)
    if (num === 1) setLegLabel('First Leg (Feeder)')
    else if (num === 2) setLegLabel('Second Leg (Mother Vessel)')
    else setLegLabel(`Ocean Leg ${num}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const containerNumbers = containerNumbersText
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0)

    const record: OceanLegRecord = {
      id: existingLeg?.id || `leg-${Date.now()}`,
      legNumber,
      legLabel,
      bookingId: existingLeg?.bookingId || `bk-${Date.now()}`,
      bookingNumber: bookingNumber.trim(),
      bolId: existingLeg?.bolId || 'bol-current',
      bolNumber: bolNumber.trim(),
      carrierId: selectedVessel?.carrierId || 'comp-carrier',
      carrierName: selectedVessel?.carrierName || 'Carrier Name',
      vesselId: selectedVessel?.id || 'ves-custom',
      vesselName: selectedVoyage?.vesselNameSnapshot || selectedVessel?.name || 'Vessel Name',
      voyageId: selectedVoyage?.id || 'voy-custom',
      voyageNumber: selectedVoyage?.voyageNumber || '001',
      polId: 'loc-pol',
      polName: polName.trim(),
      podId: 'loc-pod',
      podName: podName.trim(),
      etd: `${etd}T00:00:00Z`,
      eta: `${eta}T00:00:00Z`,
      actualDeparture: existingLeg?.actualDeparture,
      actualArrival: existingLeg?.actualArrival,
      status,
      containerNumbers,
      blReference: blReference.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    onSave(record)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {existingLeg ? 'Edit Ocean Leg' : 'Assign Ocean Transport Leg'}
              </h2>
              <p className="text-xs text-slate-500">Independent multi-leg routing (Leg 1, Leg 2, Leg 3...)</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Leg Sequence Number *</label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={legNumber}
                onChange={(e) => handleLegNumberChange(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Display Label</label>
              <input
                type="text"
                value={legLabel}
                onChange={(e) => setLegLabel(e.target.value)}
                placeholder="e.g. First Leg (Feeder)"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bill of Lading (BOL)</label>
              <input
                type="text"
                value={bolNumber}
                onChange={(e) => setBolNumber(e.target.value)}
                placeholder="e.g. BOL-2026-0041"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Reference *</label>
              <input
                type="text"
                required
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="e.g. BKG-CMA-2026-8819"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Voyage *</label>
            <select
              value={voyageId}
              onChange={(e) => setVoyageId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
            >
              {voyages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vesselNameSnapshot} — Voy: {v.voyageNumber} ({v.originPortName} → {v.destinationPortName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Port of Loading (POL)</label>
              <input
                type="text"
                value={polName}
                onChange={(e) => setPolName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Port of Discharge (POD)</label>
              <input
                type="text"
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ETD *</label>
              <input
                type="date"
                required
                value={etd}
                onChange={(e) => setEtd(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ETA *</label>
              <input
                type="date"
                required
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Leg Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OceanLegStatus)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
              >
                <option value="WAITING_VESSEL">Waiting Vessel</option>
                <option value="LOADED">Loaded on Vessel</option>
                <option value="SAILED">Sailed</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="AT_TRANSSHIPMENT">At Transshipment</option>
                <option value="DISCHARGED">Discharged</option>
                <option value="COMPLETED">Completed</option>
                <option value="ROLLED_OVER">Rolled Over</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Allocated Containers (Comma separated)</label>
            <input
              type="text"
              value={containerNumbersText}
              onChange={(e) => setContainerNumbersText(e.target.value)}
              placeholder="e.g. MSKU9981240, CMAU7718290"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leg Carrier BL Reference</label>
            <input
              type="text"
              value={blReference}
              onChange={(e) => setBlReference(e.target.value)}
              placeholder="e.g. CMA-BND-JEA-9011"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs transition text-xs"
            >
              {existingLeg ? 'Update Leg' : 'Assign Leg'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
