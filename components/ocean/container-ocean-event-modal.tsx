'use client'

import React, { useState } from 'react'
import { X, Box, CheckCircle2, AlertCircle } from 'lucide-react'
import { ContainerOceanStage } from '@/lib/types/ocean-vessel'

interface ContainerOceanEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    containerNumber: string
    bookingId: string
    vesselName: string
    voyageNumber: string
    port: string
    date: string
    stage: ContainerOceanStage
    sealNumber?: string
    vgmVerified: boolean
    notes?: string
  }) => void
  initialContainerNumber?: string
  initialBookingId?: string
  initialVesselName?: string
  initialVoyageNumber?: string
}

export function ContainerOceanEventModal({
  isOpen,
  onClose,
  onSave,
  initialContainerNumber,
  initialBookingId,
  initialVesselName,
  initialVoyageNumber,
}: ContainerOceanEventModalProps) {
  const [containerNumber, setContainerNumber] = useState(initialContainerNumber || '')
  const [bookingId, setBookingId] = useState(initialBookingId || 'bk-2026-091')
  const [vesselName, setVesselName] = useState(initialVesselName || 'CMA CGM NEVA')
  const [voyageNumber, setVoyageNumber] = useState(initialVoyageNumber || '2604W')
  const [port, setPort] = useState('Bandar Abbas (Shahid Rajaee)')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [stage, setStage] = useState<ContainerOceanStage>('LOADED_ON_VESSEL')
  const [sealNumber, setSealNumber] = useState('')
  const [vgmVerified, setVgmVerified] = useState(true)
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!containerNumber.trim()) return

    onSave({
      containerNumber: containerNumber.trim().toUpperCase(),
      bookingId,
      vesselName,
      voyageNumber,
      port,
      date: new Date(date).toISOString(),
      stage,
      sealNumber: sealNumber.trim() || undefined,
      vgmVerified,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-2xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Container Ocean Event</h2>
              <p className="text-xs text-slate-500">Physical verified milestones (No automatic assumptions)</p>
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
          {/* Invariance warning */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <strong>Audit Safety:</strong> Vessel departure does NOT automatically confirm container loading.
              Only physical tally records, crane stowage confirmations, or gate records confirm container onboard status.
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
                placeholder="e.g. MSKU9981240"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Milestone *</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as ContainerOceanStage)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
              >
                <option value="GATE_IN">Gate-In Terminal</option>
                <option value="WAITING_LOADING">Waiting Loading Quay</option>
                <option value="LOADED_ON_VESSEL">Confirmed Loaded Onboard</option>
                <option value="DEPARTED">Vessel Departed with Container</option>
                <option value="TRANSSHIPMENT_DISCHARGE">Transshipment Discharge</option>
                <option value="TRANSSHIPMENT_LOAD">Transshipment Mother Load</option>
                <option value="DESTINATION_ARRIVAL">Destination Port Arrival</option>
                <option value="DISCHARGED">Confirmed Discharged</option>
                <option value="AVAILABLE">Available for Delivery</option>
                <option value="RELEASED">Carrier / DO Released</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vessel Name</label>
              <input
                type="text"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voyage Number</label>
              <input
                type="text"
                value={voyageNumber}
                onChange={(e) => setVoyageNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Port / Terminal</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bolt Seal Number</label>
              <input
                type="text"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                placeholder="e.g. CMA-SEAL-884102"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="vgm"
                checked={vgmVerified}
                onChange={(e) => setVgmVerified(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="vgm" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                VGM & Weight Cert Verified
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Remarks / Tally Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Crane operator tally sheet confirmed loaded in Bay 14..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
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
              Record Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
