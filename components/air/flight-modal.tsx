'use client'

import React, { useState } from 'react'
import { X, Calendar, Clock, Plane, AlertCircle } from 'lucide-react'
import { FlightRecord, FlightStatus } from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface FlightModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (flight: FlightRecord) => void
  existingFlight?: FlightRecord | null
}

const COMMON_AIRLINES = [
  { id: 'airl-fg', name: 'Kam Air', iata: 'FG' },
  { id: 'airl-rq', name: 'Ariana Afghan Airlines', iata: 'RQ' },
  { id: 'airl-ek', name: 'Emirates SkyCargo', iata: 'EK' },
  { id: 'airl-qr', name: 'Qatar Airways Cargo', iata: 'QR' },
  { id: 'airl-tk', name: 'Turkish Cargo', iata: 'TK' },
  { id: 'airl-fz', name: 'flydubai Cargo', iata: 'FZ' },
]

export function FlightModal({ isOpen, onClose, onSave, existingFlight }: FlightModalProps) {
  const [flightNumber, setFlightNumber] = useState(existingFlight?.flightNumber || 'FG-')
  const [selectedAirlineId, setSelectedAirlineId] = useState(existingFlight?.airlineId || 'airl-fg')
  const [originAirportIata, setOriginAirportIata] = useState(existingFlight?.originAirportIata || 'KBL')
  const [destinationAirportIata, setDestinationAirportIata] = useState(
    existingFlight?.destinationAirportIata || 'DXB'
  )
  const [flightDate, setFlightDate] = useState(
    existingFlight?.flightDate || new Date().toISOString().split('T')[0]
  )
  const [scheduledDeparture, setScheduledDeparture] = useState(
    existingFlight?.scheduledDeparture || `${new Date().toISOString().split('T')[0]}T09:00:00Z`
  )
  const [scheduledArrival, setScheduledArrival] = useState(
    existingFlight?.scheduledArrival || `${new Date().toISOString().split('T')[0]}T12:00:00Z`
  )
  const [actualDeparture, setActualDeparture] = useState(existingFlight?.actualDeparture || '')
  const [actualArrival, setActualArrival] = useState(existingFlight?.actualArrival || '')
  const [aircraftType, setAircraftType] = useState(existingFlight?.aircraftType || 'Boeing 737-800')
  const [status, setStatus] = useState<FlightStatus>(existingFlight?.status || 'SCHEDULED')
  const [notes, setNotes] = useState(existingFlight?.notes || '')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!flightNumber.trim() || !originAirportIata.trim() || !destinationAirportIata.trim()) return

    const airlineObj = COMMON_AIRLINES.find((a) => a.id === selectedAirlineId)

    const saved = airFreightStore.saveFlight({
      id: existingFlight?.id,
      airlineId: selectedAirlineId,
      airlineName: airlineObj?.name || 'Kam Air',
      flightNumber: flightNumber.trim().toUpperCase(),
      originAirportIata: originAirportIata.trim().toUpperCase(),
      originAirportName: `${originAirportIata.trim().toUpperCase()} Airport`,
      destinationAirportIata: destinationAirportIata.trim().toUpperCase(),
      destinationAirportName: `${destinationAirportIata.trim().toUpperCase()} Airport`,
      flightDate,
      scheduledDeparture,
      scheduledArrival,
      actualDeparture: actualDeparture.trim() || undefined,
      actualArrival: actualArrival.trim() || undefined,
      aircraftType: aircraftType.trim() || 'Boeing 737-800',
      status,
      notes: notes.trim() || undefined,
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
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {existingFlight ? 'Edit Scheduled Flight' : 'Add Flight Schedule'}
              </h2>
              <p className="text-xs text-slate-400">
                Manage commercial cargo flight schedules and milestone timestamps
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="e.g. FG-711"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Origin Airport IATA</label>
              <input
                type="text"
                value={originAirportIata}
                onChange={(e) => setOriginAirportIata(e.target.value.toUpperCase())}
                placeholder="e.g. KBL"
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
                placeholder="e.g. DXB"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Aircraft Type</label>
              <input
                type="text"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                placeholder="e.g. Boeing 737-800"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Flight Date</label>
              <input
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Departure (ETD)</label>
              <input
                type="text"
                value={scheduledDeparture}
                onChange={(e) => setScheduledDeparture(e.target.value)}
                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Arrival (ETA)</label>
              <input
                type="text"
                value={scheduledArrival}
                onChange={(e) => setScheduledArrival(e.target.value)}
                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                required
              />
            </div>
          </div>

          {/* Actual Times (Never overwrites scheduled times) */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Actual Operational Milestones
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Actual Departure (ATD)</label>
                <input
                  type="text"
                  value={actualDeparture}
                  onChange={(e) => setActualDeparture(e.target.value)}
                  placeholder="e.g. 2026-03-25T09:45:00Z"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Actual Arrival (ATA)</label>
                <input
                  type="text"
                  value={actualArrival}
                  onChange={(e) => setActualArrival(e.target.value)}
                  placeholder="e.g. 2026-03-25T12:40:00Z"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Rule: Actual departure/arrival timestamps never overwrite initial scheduled ETD/ETA.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Flight Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FlightStatus)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CHECK_IN">CHECK_IN</option>
              <option value="CARGO_LOADING">CARGO_LOADING</option>
              <option value="DEPARTED">DEPARTED</option>
              <option value="IN_FLIGHT">IN_FLIGHT</option>
              <option value="ARRIVED">ARRIVED</option>
              <option value="DELAYED_SCHEDULE">DELAYED_SCHEDULE</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Operational Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ramp notes, aircraft tail number, cargo loading remarks..."
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
            {existingFlight ? 'Update Flight' : 'Add Flight'}
          </button>
        </div>
      </div>
    </div>
  )
}
