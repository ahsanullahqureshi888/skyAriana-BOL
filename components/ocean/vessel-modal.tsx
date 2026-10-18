'use client'

import React, { useState } from 'react'
import { X, Ship, AlertTriangle } from 'lucide-react'
import { VesselRecord, VesselType, VesselStatus } from '@/lib/types/ocean-vessel'

interface VesselModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (vessel: VesselRecord) => void
  existingVessel?: VesselRecord | null
}

export function VesselModal({ isOpen, onClose, onSave, existingVessel }: VesselModalProps) {
  const [name, setName] = useState(existingVessel?.name || '')
  const [imoNumber, setImoNumber] = useState(existingVessel?.imoNumber || '')
  const [carrierId, setCarrierId] = useState(existingVessel?.carrierId || 'comp-msc')
  const [carrierName, setCarrierName] = useState(
    existingVessel?.carrierName || 'Mediterranean Shipping Company (MSC)'
  )
  const [vesselType, setVesselType] = useState<VesselType>(
    existingVessel?.vesselType || 'CONTAINER_MOTHER'
  )
  const [flag, setFlag] = useState(existingVessel?.flag || 'Panama')
  const [builtYear, setBuiltYear] = useState<number>(existingVessel?.builtYear || 2015)
  const [teuCapacity, setTeuCapacity] = useState<number>(existingVessel?.teuCapacity || 6500)
  const [status, setStatus] = useState<VesselStatus>(existingVessel?.status || 'ACTIVE')
  const [notes, setNotes] = useState(existingVessel?.notes || '')

  if (!isOpen) return null

  const handleCarrierChange = (val: string) => {
    setCarrierId(val)
    if (val === 'comp-msc') setCarrierName('Mediterranean Shipping Company (MSC)')
    else if (val === 'comp-maersk') setCarrierName('A.P. Moller - Maersk')
    else if (val === 'comp-cma') setCarrierName('CMA CGM Group')
    else if (val === 'comp-hapag') setCarrierName('Hapag-Lloyd AG')
    else if (val === 'comp-hdasco') setCarrierName('HDASCO Shipping Line')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const record: VesselRecord = {
      id: existingVessel?.id || `ves-${Date.now()}`,
      name: name.trim().toUpperCase(),
      imoNumber: imoNumber.trim() || undefined,
      carrierId,
      carrierName,
      vesselType,
      flag: flag.trim() || undefined,
      builtYear: Number(builtYear) || undefined,
      teuCapacity: Number(teuCapacity) || undefined,
      status,
      notes: notes.trim() || undefined,
      createdAt: existingVessel?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {existingVessel ? 'Edit Vessel Master' : 'Register New Vessel'}
              </h2>
              <p className="text-xs text-slate-500">Stable maritime fleet profile with IMO indexing</p>
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
          {/* IMO Identifier Notice */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Maritime Invariance:</strong> Prefer assigning an official IMO Number. Stable IMO
              identities prevent duplicate vessel profiles and preserve historical voyage displays if the ship is
              renamed later.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vessel Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MSC CLAUDIA"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IMO Number</label>
              <input
                type="text"
                value={imoNumber}
                onChange={(e) => setImoNumber(e.target.value)}
                placeholder="e.g. 9243382"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Line / Carrier *</label>
              <select
                value={carrierId}
                onChange={(e) => handleCarrierChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              >
                <option value="comp-msc">MSC (Mediterranean Shipping Co)</option>
                <option value="comp-maersk">Maersk Line</option>
                <option value="comp-cma">CMA CGM Group</option>
                <option value="comp-hapag">Hapag-Lloyd AG</option>
                <option value="comp-hdasco">HDASCO / IRISL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vessel Type</label>
              <select
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value as VesselType)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              >
                <option value="CONTAINER_MOTHER">Container Mother Vessel</option>
                <option value="CONTAINER_FEEDER">Container Feeder Vessel</option>
                <option value="BARGE">Barge / Shuttle Craft</option>
                <option value="GENERAL_CARGO">General Cargo Ship</option>
                <option value="BULK_CARRIER">Bulk Carrier</option>
                <option value="RORO">Ro-Ro Ship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Flag State</label>
              <input
                type="text"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="e.g. Panama"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Built Year</label>
              <input
                type="number"
                value={builtYear}
                onChange={(e) => setBuiltYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (TEU)</label>
              <input
                type="number"
                value={teuCapacity}
                onChange={(e) => setTeuCapacity(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fleet Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VesselStatus)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
            >
              <option value="ACTIVE">Active in Service</option>
              <option value="IN_DRYDOCK">In Drydock</option>
              <option value="UNDER_REPAIR">Under Maintenance</option>
              <option value="LAID_UP">Laid Up</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Designated feeder for Bandar Abbas - Jebel Ali shuttle rotations..."
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
              {existingVessel ? 'Update Vessel' : 'Save Vessel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
