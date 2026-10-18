'use client'

import React, { useState } from 'react'
import { X, Plane, Calculator, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import {
  AirBookingRecord,
  DimensionItem,
} from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface AirBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (booking: AirBookingRecord) => void
  existingBooking?: AirBookingRecord | null
}

const COMMON_AIRLINES = [
  { id: 'airl-fg', name: 'Kam Air', iata: 'FG', prefix: '384' },
  { id: 'airl-rq', name: 'Ariana Afghan Airlines', iata: 'RQ', prefix: '255' },
  { id: 'airl-ek', name: 'Emirates SkyCargo', iata: 'EK', prefix: '176' },
  { id: 'airl-qr', name: 'Qatar Airways Cargo', iata: 'QR', prefix: '157' },
  { id: 'airl-tk', name: 'Turkish Cargo', iata: 'TK', prefix: '235' },
  { id: 'airl-fz', name: 'flydubai Cargo', iata: 'FZ', prefix: '141' },
]

const COMMON_AIRPORTS = ['KBL', 'KDH', 'DXB', 'DWC', 'IST', 'DEL', 'DOH', 'ISB', 'TAS']

export function AirBookingModal({
  isOpen,
  onClose,
  onSave,
  existingBooking,
}: AirBookingModalProps) {
  const [bookingReference, setBookingReference] = useState(existingBooking?.bookingReference || '')
  const [selectedAirlineId, setSelectedAirlineId] = useState(existingBooking?.airlineId || 'airl-fg')
  const [shipper, setShipper] = useState(existingBooking?.shipper || '')
  const [consignee, setConsignee] = useState(existingBooking?.consignee || '')
  const [customerName, setCustomerName] = useState(existingBooking?.customerName || '')
  const [originAirportIata, setOriginAirportIata] = useState(existingBooking?.originAirportIata || 'KBL')
  const [destinationAirportIata, setDestinationAirportIata] = useState(
    existingBooking?.destinationAirportIata || 'DXB'
  )
  const [serviceType, setServiceType] = useState<'DIRECT' | 'CONNECTING' | 'EXPRESS' | 'GENERAL' | 'PERISHABLE'>(
    existingBooking?.serviceType || 'DIRECT'
  )
  const [transitAirportInput, setTransitAirportInput] = useState(
    existingBooking?.transitAirportsIata?.join(', ') || ''
  )
  const [commodity, setCommodity] = useState(existingBooking?.commodity || '')
  const [packagesCount, setPackagesCount] = useState<number>(existingBooking?.packagesCount || 1)
  const [packagingType, setPackagingType] = useState<
    'BOXES' | 'CARTONS' | 'CRATES' | 'PALLETS' | 'BAGS' | 'DRUMS' | 'OTHER'
  >(existingBooking?.packagingType || 'CARTONS')
  const [grossWeightKg, setGrossWeightKg] = useState<number>(existingBooking?.grossWeightKg || 0)
  const [volumetricDivisor, setVolumetricDivisor] = useState<number>(
    existingBooking?.volumetricDivisor || 6000
  )
  const [flightNumber, setFlightNumber] = useState(existingBooking?.flightNumber || 'FG-711')
  const [flightDate, setFlightDate] = useState(
    existingBooking?.flightDate || new Date().toISOString().split('T')[0]
  )
  const [dimensions, setDimensions] = useState<DimensionItem[]>(
    existingBooking?.dimensions && existingBooking.dimensions.length > 0
      ? existingBooking.dimensions
      : [
          { id: 'dim-1', lengthCm: 100, widthCm: 80, heightCm: 80, quantity: 1, unit: 'CM' },
        ]
  )
  const [notes, setNotes] = useState(existingBooking?.notes || '')

  if (!isOpen) return null

  // Dimension helpers
  const handleDimensionChange = (
    index: number,
    field: 'lengthCm' | 'widthCm' | 'heightCm' | 'quantity',
    value: number
  ) => {
    const updated = [...dimensions]
    updated[index] = { ...updated[index], [field]: Math.max(0, value) }
    setDimensions(updated)
  }

  const addDimensionRow = () => {
    setDimensions([
      ...dimensions,
      { id: `dim-${Date.now()}`, lengthCm: 100, widthCm: 100, heightCm: 100, quantity: 1, unit: 'CM' },
    ])
  }

  const removeDimensionRow = (index: number) => {
    if (dimensions.length <= 1) return
    setDimensions(dimensions.filter((_, i) => i !== index))
  }

  // Calculate live volumetric & chargeable weight
  const volCalc = airFreightStore.calculateVolumetricWeight(dimensions, volumetricDivisor)
  const chargeableCalc = airFreightStore.determineChargeableWeight(
    Number(grossWeightKg) || 0,
    volCalc.totalVolumetricWeightKg
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!shipper.trim() || !consignee.trim() || !commodity.trim()) return

    const airlineObj = COMMON_AIRLINES.find((a) => a.id === selectedAirlineId)
    const transitArr =
      serviceType === 'CONNECTING' && transitAirportInput.trim()
        ? transitAirportInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : []

    const saved = airFreightStore.saveBooking({
      id: existingBooking?.id,
      bookingReference: bookingReference.trim() || undefined,
      airlineId: selectedAirlineId,
      airlineName: airlineObj?.name || 'Kam Air',
      airlineAwbPrefix: airlineObj?.prefix || '384',
      customerName: customerName.trim() || shipper.trim(),
      shipper: shipper.trim(),
      consignee: consignee.trim(),
      originAirportIata: originAirportIata.trim().toUpperCase(),
      originAirportName: `${originAirportIata.trim().toUpperCase()} International Airport`,
      destinationAirportIata: destinationAirportIata.trim().toUpperCase(),
      destinationAirportName: `${destinationAirportIata.trim().toUpperCase()} International Airport`,
      transitAirportsIata: transitArr,
      serviceType,
      flightNumber: flightNumber.trim().toUpperCase(),
      flightDate,
      commodity: commodity.trim(),
      packagesCount: Number(packagesCount) || 1,
      packagingType,
      grossWeightKg: Number(grossWeightKg) || 0,
      volumetricWeightKg: volCalc.totalVolumetricWeightKg,
      chargeableWeightKg: chargeableCalc.chargeableWeightKg,
      dimensions,
      volumetricDivisor,
      notes: notes.trim() || undefined,
    })

    onSave(saved)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {existingBooking ? 'Edit Air Freight Booking' : 'New Air Freight Booking'}
              </h2>
              <p className="text-xs text-slate-400">
                Register airport-to-airport cargo movement with volumetric weight engine
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Carrier & Routing */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              1. Carrier & Airport Routing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Airline Partner</label>
                <select
                  value={selectedAirlineId}
                  onChange={(e) => setSelectedAirlineId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {COMMON_AIRLINES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.iata} - {a.prefix})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="DIRECT">Direct Flight</option>
                  <option value="CONNECTING">Connecting / Multi-Leg Transit</option>
                  <option value="GENERAL">General Air Freight</option>
                  <option value="EXPRESS">Express Air Cargo</option>
                  <option value="PERISHABLE">Perishable / Cold Chain</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Origin Airport</label>
                <input
                  type="text"
                  value={originAirportIata}
                  onChange={(e) => setOriginAirportIata(e.target.value.toUpperCase())}
                  list="airports-list"
                  placeholder="e.g. KBL"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Destination Airport</label>
                <input
                  type="text"
                  value={destinationAirportIata}
                  onChange={(e) => setDestinationAirportIata(e.target.value.toUpperCase())}
                  list="airports-list"
                  placeholder="e.g. DXB"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Flight Number</label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. FG-711"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono uppercase"
                  required
                />
              </div>
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
            </div>

            {serviceType === 'CONNECTING' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Transit Airports (comma separated, e.g. DXB, DOH)
                </label>
                <input
                  type="text"
                  value={transitAirportInput}
                  onChange={(e) => setTransitAirportInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DXB"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            )}

            <datalist id="airports-list">
              {COMMON_AIRPORTS.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </div>

          {/* Section 2: Parties & Commodity */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              2. Shippers & Cargo Description
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Shipper Name</label>
                <input
                  type="text"
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  placeholder="Exporter / Shipper entity"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Consignee Name</label>
                <input
                  type="text"
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="Receiver / Consignee entity"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer / Client Account</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Billing Customer Name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Commodity Nature of Goods</label>
                <input
                  type="text"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  placeholder="e.g. Organic Dried Fruits & Pine Nuts"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Packaging Type</label>
                <select
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="CARTONS">Cartons</option>
                  <option value="BOXES">Boxes</option>
                  <option value="CRATES">Crates</option>
                  <option value="PALLETS">Pallets</option>
                  <option value="BAGS">Bags</option>
                  <option value="DRUMS">Drums</option>
                  <option value="OTHER">Other Protective</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Physical & Volumetric Weight Engine */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  3. Volumetric & Chargeable Weight Calculator
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">IATA Divisor:</span>
                <select
                  value={volumetricDivisor}
                  onChange={(e) => setVolumetricDivisor(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value={6000}>6,000 (Standard Air Cargo)</option>
                  <option value={5000}>5,000 (Express / Courier)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Total Packages Count</label>
                <input
                  type="number"
                  min="1"
                  value={packagesCount}
                  onChange={(e) => setPackagesCount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Scale Gross Weight (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={grossWeightKg}
                  onChange={(e) => setGrossWeightKg(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Dimension Rows */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Package Dimensions (Length × Width × Height cm)
              </label>
              {dimensions.map((dim, idx) => (
                <div key={dim.id || idx} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="w-20">
                    <span className="text-[10px] text-slate-500 block">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={dim.quantity}
                      onChange={(e) => handleDimensionChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block">L (cm)</span>
                    <input
                      type="number"
                      min="1"
                      value={dim.lengthCm}
                      onChange={(e) => handleDimensionChange(idx, 'lengthCm', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block">W (cm)</span>
                    <input
                      type="number"
                      min="1"
                      value={dim.widthCm}
                      onChange={(e) => handleDimensionChange(idx, 'widthCm', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block">H (cm)</span>
                    <input
                      type="number"
                      min="1"
                      value={dim.heightCm}
                      onChange={(e) => handleDimensionChange(idx, 'heightCm', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDimensionRow(idx)}
                    disabled={dimensions.length <= 1}
                    className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addDimensionRow}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Dimension Line
              </button>
            </div>

            {/* Calculated Results Banner */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Volume</span>
                <span className="text-sm font-bold text-white font-mono">{volCalc.totalVolumeCbm} CBM</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Volumetric Weight</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {volCalc.totalVolumetricWeightKg} Kg
                </span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1">
                <span className="text-[11px] text-emerald-400 font-semibold block">Chargeable Weight</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {chargeableCalc.chargeableWeightKg} Kg
                </span>
              </div>
            </div>

            {chargeableCalc.isVolumetricPenalty && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Volumetric weight exceeds physical gross weight by{' '}
                  <strong>{chargeableCalc.weightDifferenceKg} kg</strong>. Chargeable weight will apply.
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Operational Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Operational Notes / Special Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions for ramp handling, warehouse escort, or security..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
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
            {existingBooking ? 'Update Booking' : 'Create Air Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
