'use client'

import React, { useState } from 'react'
import { X, Calendar, Clock, AlertTriangle, CheckSquare } from 'lucide-react'
import { VoyageRecord, ScheduleSource } from '@/lib/types/ocean-vessel'
import { OceanVesselStore } from '@/lib/services/ocean-vessel-service'

interface ScheduleUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  voyage: VoyageRecord
  onConfirmUpdate: (
    voyageId: string,
    newEtd: string,
    newEta: string,
    reason: string,
    changedBy: string,
    source: ScheduleSource
  ) => void
}

export function ScheduleUpdateModal({
  isOpen,
  onClose,
  voyage,
  onConfirmUpdate,
}: ScheduleUpdateModalProps) {
  const [newEtd, setNewEtd] = useState(
    voyage.plannedEtd ? voyage.plannedEtd.split('T')[0] : '2026-03-25'
  )
  const [newEta, setNewEta] = useState(
    voyage.plannedEta ? voyage.plannedEta.split('T')[0] : '2026-03-28'
  )
  const [reason, setReason] = useState('Port congestion and weather delay at transshipment hub')
  const [changedBy, setChangedBy] = useState('Ocean Schedule Coordinator')
  const [source, setSource] = useState<ScheduleSource>('SHIPPING_LINE')

  if (!isOpen) return null

  // Preview affected bookings/legs
  const store = OceanVesselStore.getInstance()
  const { affectedLegs, excludedRolloverContainers } = store.previewVoyageScheduleChange(
    voyage.id,
    `${newEtd}T00:00:00Z`,
    `${newEta}T00:00:00Z`
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return

    onConfirmUpdate(
      voyage.id,
      `${newEtd}T00:00:00Z`,
      `${newEta}T00:00:00Z`,
      reason.trim(),
      changedBy.trim(),
      source
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Update Voyage Schedule & History</h2>
              <p className="text-xs text-slate-500">
                {voyage.vesselNameSnapshot} — Voy: {voyage.voyageNumber}
              </p>
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
          {/* Schedule Invariance Info */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Schedule Audit Trail:</strong> Updating ETD/ETA preserves the previous schedule in
              `scheduleHistory`. Existing completed legs and rolled-over containers will be protected from stale
              reversion.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold block mb-1">Current Planned ETD:</span>
              <span className="text-slate-900 font-mono font-bold">
                {new Date(voyage.plannedEtd).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold block mb-1">Current Planned ETA:</span>
              <span className="text-slate-900 font-mono font-bold">
                {new Date(voyage.plannedEta).toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Planned ETD *</label>
              <input
                type="date"
                required
                value={newEtd}
                onChange={(e) => setNewEtd(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Planned ETA *</label>
              <input
                type="date"
                required
                value={newEta}
                onChange={(e) => setNewEta(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as ScheduleSource)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
              >
                <option value="SHIPPING_LINE">Shipping Line Official Notice</option>
                <option value="AGENT_UPDATE">Port Agent Notification</option>
                <option value="MANUAL">Manual Operations Entry</option>
                <option value="API">Carrier EDI / API</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Updated By *</label>
              <input
                type="text"
                required
                value={changedBy}
                onChange={(e) => setChangedBy(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Delay / Revision Reason *</label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Berthing congestion at Jebel Ali Terminal 2..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
            />
          </div>

          {/* Mass Update Preview Panel */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Mass Propagation Preview ({affectedLegs.length} Shipments)
              </span>
            </div>
            <div className="text-slate-500">
              The following active bookings will automatically receive this schedule update:
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {affectedLegs.map((l) => (
                <div key={l.id} className="text-slate-700 font-mono flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                  <span className="font-semibold">{l.bookingNumber} ({l.bolNumber || 'N/A'})</span>
                  <span className="text-slate-500 text-[11px] font-medium">{l.containerNumbers.length} Ctrs</span>
                </div>
              ))}
            </div>
            {excludedRolloverContainers.length > 0 && (
              <div className="pt-1 text-rose-600 text-[11px] font-semibold">
                🛡️ {excludedRolloverContainers.length} Rolled-over container(s) are safely excluded.
              </div>
            )}
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
              Confirm Schedule Update
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
