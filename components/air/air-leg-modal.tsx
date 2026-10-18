'use client'

import React, { useState } from 'react'
import { X, GitCommit, Plane, Calendar, Clock } from 'lucide-react'
import { AirLegRecord, AirLegStatus } from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface AirLegModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (leg: AirLegRecord) => void
  bookingId: string
  bookingReference: string
  existingLeg?: AirLegRecord | null
}

const COMMON_AIRLINES = [
  { id: 'airl-fg', name: 'Kam Air', iata: 'FG' },
  { id: 'airl-rq', name: 'Ariana Afghan Airlines', iata: 'RQ' },
  { id: 'airl-ek', name: 'Emirates SkyCargo', iata: 'EK' },
  { id: 'airl-qr', name: 'Qatar Airways Cargo', iata: 'QR' },
  { id: 'airl-tk', name: 'Turkish Cargo', iata: 'TK' },
  { id: 'airl-fz', name: 'flydubai Cargo', iata: 'FZ' },
]

export function AirLegModal({
  isOpen,
  onClose,
  onSave,
  bookingId,
  bookingReference,
  existingLeg,
}: AirLegModalProps) {
  const [legNumber, setLegNumber] = useState<number>(existingLeg?.legNumber || 1)
  const [legLabel, setLegLabel] = useState(
    existingLeg?.legLabel || `Leg ${existingLeg?.legNumber || 1} Flight`
  )
  const [flightNumber, setFlightNumber] = useState(existingLeg?.flightNumber || '')
  const [selectedAirlineId, setSelectedAirlineId] = useState(existingLeg?.airlineId || 'airl-fg')
  const [originAirportIata, setOriginAirportIata] = useState(existingLeg?.originAirportIata || 'KBL')
  const [destinationAirportIata, setDestinationAirportIata] = useState(
    existingLeg?.destinationAirportIata || 'DXB'
  )
  const [scheduledDeparture, setScheduledDeparture] = useState(
    existingLeg?.scheduledDeparture || new Date().toISOString()
  )
  const [scheduledArrival, setScheduledArrival] = useState(
    existingLeg?.scheduledArrival || new Date().toISOString()
  )
  const [actualDeparture, setActualDeparture] = useState(existingLeg?.actualDeparture || '')
  const [actualArrival, setActualArrival] = useState(existingLeg?.actualArrival || '')
  const [status, setStatus] = useState<AirLegStatus>(existingLeg?.status || 'CONFIRMED')
  const [notes, setNotes] = useState(existingLeg?.notes || '')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!flightNumber.trim() || !originAirportIata.trim() || !destinationAirportIata.trim()) return

    const airlineObj = COMMON_AIRLINES.find((a) => a.id === selectedAirlineId)

    const saved = airFreightStore.saveFlightLeg({
      id: existingLeg?.id,
      bookingId,
      bookingReference,
      legNumber: Number(legNumber),
      legLabel: legLabel.trim(),
      airlineId: selectedAirlineId,
      airlineName: airlineObj?.name || 'Kam Air',
      flightNumber: flightNumber.trim().toUpperCase(),
      originAirportIata: originAirportIata.trim().toUpperCase(),
      originAirportName: `${originAirportIata.trim().toUpperCase()} Airport`,
      destinationAirportIata: destinationAirportIata.trim().toUpperCase(),
      destinationAirportName: `${destinationAirportIata.trim().toUpperCase()} Airport`,
      scheduledDeparture,
      scheduledArrival,
      actualDeparture: actualDeparture.trim() || undefined,
      actualArrival: actualArrival.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
    })

    onSave(saved)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {existingLeg ? 'Edit Flight Leg' : 'Add Flight Leg'}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Leg Sequence #</label>
              <input
                type="number"
                min="1"
                value={legNumber}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setLegNumber(val)
                  setLegLabel(`Leg ${val} Flight`)
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Leg Label</label>
              <input
                type="text"
                value={legLabel}
                onChange={(e) => setLegLabel(e.target.value)}
                placeholder="e.g. Leg 1 (Origin Direct Flight)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Airline Carrier</label>
              <select
                value={selectedAirlineId}
                onChange={(e) => setSelectedAirlineId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {COMMON_AIRLINES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.iata})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Flight Number</label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="e.g. EK-976"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Origin Airport IATA</label>
              <input
                type="text"
                value={originAirportIata}
                onChange={(e) => setOriginAirportIata(e.target.value.toUpperCase())}
                placeholder="e.g. DXB"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Destination Airport IATA</label>
              <input
                type="text"
                value={destinationAirportIata}
                onChange={(e) => setDestinationAirportIata(e.target.value.toUpperCase())}
                placeholder="e.g. IST"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Departure</label>
              <input
                type="text"
                value={scheduledDeparture}
                onChange={(e) => setScheduledDeparture(e.target.value)}
                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Arrival</label>
              <input
                type="text"
                value={scheduledArrival}
                onChange={(e) => setScheduledArrival(e.target.value)}
                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Actual Departure</label>
              <input
                type="text"
                value={actualDeparture}
                onChange={(e) => setActualDeparture(e.target.value)}
                placeholder="Optional ATD"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Actual Arrival</label>
              <input
                type="text"
                value={actualArrival}
                onChange={(e) => setActualArrival(e.target.value)}
                placeholder="Optional ATA"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Leg Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AirLegStatus)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="PLANNED">PLANNED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="DEPARTED">DEPARTED</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="ARRIVED_TRANSIT">ARRIVED_TRANSIT</option>
              <option value="OFFLOADED">OFFLOADED</option>
              <option value="REBOOKED">REBOOKED</option>
              <option value="ARRIVED_DESTINATION">ARRIVED_DESTINATION</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Leg Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ULD position, connecting transfer desk remarks..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
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
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <Plane className="w-4 h-4" />
            {existingLeg ? 'Update Leg' : 'Add Leg'}
          </button>
        </div>
      </div>
    </div>
  )
}
