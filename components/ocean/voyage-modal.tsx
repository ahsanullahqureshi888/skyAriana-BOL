'use client'

import React, { useState } from 'react'
import { X, Navigation, Plus, Trash2, Calendar } from 'lucide-react'
import {
  VoyageRecord,
  VoyageStatus,
  ScheduleSource,
  PortCallRecord,
  VesselRecord,
} from '@/lib/types/ocean-vessel'

interface VoyageModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (voyage: VoyageRecord) => void
  vessels: VesselRecord[]
  existingVoyage?: VoyageRecord | null
}

export function VoyageModal({
  isOpen,
  onClose,
  onSave,
  vessels,
  existingVoyage,
}: VoyageModalProps) {
  const [vesselId, setVesselId] = useState(existingVoyage?.vesselId || (vessels[0]?.id || ''))
  const [voyageNumber, setVoyageNumber] = useState(existingVoyage?.voyageNumber || '')
  const [serviceName, setServiceName] = useState(existingVoyage?.serviceName || '')
  const [originPortName, setOriginPortName] = useState(
    existingVoyage?.originPortName || 'Bandar Abbas (Shahid Rajaee)'
  )
  const [destinationPortName, setDestinationPortName] = useState(
    existingVoyage?.destinationPortName || 'Jebel Ali (Port Rashid/JEA)'
  )
  const [plannedEtd, setPlannedEtd] = useState(
    existingVoyage?.plannedEtd ? existingVoyage.plannedEtd.split('T')[0] : '2026-03-25'
  )
  const [plannedEta, setPlannedEta] = useState(
    existingVoyage?.plannedEta ? existingVoyage.plannedEta.split('T')[0] : '2026-03-27'
  )
  const [status, setStatus] = useState<VoyageStatus>(existingVoyage?.status || 'PLANNED')
  const [source, setSource] = useState<ScheduleSource>(existingVoyage?.source || 'SHIPPING_LINE')
  const [notes, setNotes] = useState(existingVoyage?.notes || '')

  // Ordered Port Calls
  const [portCalls, setPortCalls] = useState<PortCallRecord[]>(
    existingVoyage?.portCalls || [
      {
        id: 'pc-init-1',
        sequence: 1,
        portId: 'loc-bnd',
        portName: 'Bandar Abbas (Shahid Rajaee)',
        terminalName: 'Shahid Rajaee Terminal 2',
        countryCode: 'IR',
        plannedArrival: '2026-03-24T08:00:00Z',
        plannedDeparture: '2026-03-25T18:00:00Z',
        status: 'PLANNED',
      },
      {
        id: 'pc-init-2',
        sequence: 2,
        portId: 'loc-jea',
        portName: 'Jebel Ali',
        terminalName: 'DP World Terminal 1',
        countryCode: 'AE',
        plannedArrival: '2026-03-27T10:00:00Z',
        plannedDeparture: '2026-03-28T16:00:00Z',
        status: 'PLANNED',
      },
    ]
  )

  if (!isOpen) return null

  const selectedVessel = vessels.find((v) => v.id === vesselId) || vessels[0]

  const handleAddPortCall = () => {
    const nextSeq = portCalls.length + 1
    const newPc: PortCallRecord = {
      id: `pc-${Date.now()}`,
      sequence: nextSeq,
      portId: 'loc-new',
      portName: 'New Port Call',
      countryCode: 'AE',
      plannedArrival: new Date().toISOString(),
      plannedDeparture: new Date().toISOString(),
      status: 'PLANNED',
    }
    setPortCalls([...portCalls, newPc])
  }

  const handleRemovePortCall = (id: string) => {
    if (portCalls.length <= 2) return // Require at least 2 ports
    setPortCalls(portCalls.filter((p) => p.id !== id))
  }

  const handleUpdatePortCall = (id: string, field: keyof PortCallRecord, val: any) => {
    setPortCalls(
      portCalls.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!voyageNumber.trim()) return

    const record: VoyageRecord = {
      id: existingVoyage?.id || `voy-${Date.now()}`,
      vesselId: selectedVessel?.id || 'ves-custom',
      vesselNameSnapshot: selectedVessel?.name || 'CUSTOM VESSEL',
      imoNumber: selectedVessel?.imoNumber,
      voyageNumber: voyageNumber.trim(),
      carrierId: selectedVessel?.carrierId || 'comp-carrier',
      carrierName: selectedVessel?.carrierName || 'Carrier Name',
      serviceName: serviceName.trim() || undefined,
      originPortId: 'loc-pol',
      originPortName: originPortName.trim(),
      destinationPortId: 'loc-pod',
      destinationPortName: destinationPortName.trim(),
      portCalls,
      plannedEtd: `${plannedEtd}T00:00:00Z`,
      plannedEta: `${plannedEta}T00:00:00Z`,
      actualDeparture: existingVoyage?.actualDeparture,
      actualArrival: existingVoyage?.actualArrival,
      status,
      source,
      lastUpdated: new Date().toISOString(),
      scheduleHistory: existingVoyage?.scheduleHistory || [],
      notes: notes.trim() || undefined,
    }

    onSave(record)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-2xs">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {existingVoyage ? 'Edit Voyage Schedule' : 'Create New Voyage Master'}
              </h2>
              <p className="text-xs text-slate-500">Carrier rotation, port calls, and schedule tracking</p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Vessel *</label>
              <select
                value={vesselId}
                onChange={(e) => setVesselId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.carrierName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voyage Number *</label>
              <input
                type="text"
                required
                value={voyageNumber}
                onChange={(e) => setVoyageNumber(e.target.value)}
                placeholder="e.g. 2604W or 012E"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service / Rotation Name</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Gulf-India Express (GIX)"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ScheduleSource)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              >
                <option value="SHIPPING_LINE">Shipping Line Official Notice</option>
                <option value="AGENT_UPDATE">Port Agent Notification</option>
                <option value="MANUAL">Manual Operations Entry</option>
                <option value="IMPORTED">Imported File</option>
                <option value="API">Carrier EDI / API</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Origin Port (POL)</label>
              <input
                type="text"
                value={originPortName}
                onChange={(e) => setOriginPortName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Port (POD)</label>
              <input
                type="text"
                value={destinationPortName}
                onChange={(e) => setDestinationPortName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Planned ETD *</label>
              <input
                type="date"
                required
                value={plannedEtd}
                onChange={(e) => setPlannedEtd(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Planned ETA *</label>
              <input
                type="date"
                required
                value={plannedEta}
                onChange={(e) => setPlannedEta(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voyage Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VoyageStatus)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
              >
                <option value="PLANNED">Planned</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="OPEN_FOR_BOOKING">Open for Booking</option>
                <option value="AT_ORIGIN_PORT">At Origin Port</option>
                <option value="LOADING">Loading in Progress</option>
                <option value="SAILED">Sailed</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="ARRIVED">Arrived</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Ordered Port Calls Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ordered Port Calls (Rotation)
              </span>
              <button
                type="button"
                onClick={handleAddPortCall}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Port Call
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {portCalls.map((pc, idx) => (
                <div key={pc.id} className="p-3 bg-white flex items-center gap-3 hover:bg-slate-50/50">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold shrink-0 border border-slate-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={pc.portName}
                      onChange={(e) => handleUpdatePortCall(pc.id, 'portName', e.target.value)}
                      placeholder="Port Name"
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 shadow-2xs"
                    />
                    <input
                      type="text"
                      value={pc.terminalName || ''}
                      onChange={(e) => handleUpdatePortCall(pc.id, 'terminalName', e.target.value)}
                      placeholder="Terminal (e.g. DP World T1)"
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 shadow-2xs"
                    />
                    <select
                      value={pc.status}
                      onChange={(e) => handleUpdatePortCall(pc.id, 'status', e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 shadow-2xs font-medium"
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="ARRIVING">Arriving</option>
                      <option value="BERTHED">Berthed</option>
                      <option value="DEPARTED">Departed</option>
                      <option value="SKIPPED">Skipped</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePortCall(pc.id)}
                    disabled={portCalls.length <= 2}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Voyage Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Feeder service connecting with mother vessel at Jebel Ali..."
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
              {existingVoyage ? 'Update Voyage' : 'Create Voyage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
