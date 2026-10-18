"use client"

import React, { useState } from 'react'
import { X, ShieldCheck, MapPin, Truck, User, FileText, Phone } from 'lucide-react'
import { BorderStatus } from '@/lib/types/customs-border'

interface BorderOperationDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}

const BORDER_CROSSINGS = [
  { id: 'loc-iq', name: 'Islam Qala / Dogharoon (AF -> IR)', countryFrom: 'AF', countryTo: 'IR' },
  { id: 'loc-hai', name: 'Hairatan / Termez (AF -> UZ)', countryFrom: 'AF', countryTo: 'UZ' },
  { id: 'loc-sb', name: 'Spin Boldak / Chaman (AF -> PK)', countryFrom: 'AF', countryTo: 'PK' },
  { id: 'loc-tor', name: 'Torghundi / Serkhetabat (AF -> TM)', countryFrom: 'AF', countryTo: 'TM' },
  { id: 'loc-mil', name: 'Milak / Zaranj (AF -> IR)', countryFrom: 'AF', countryTo: 'IR' },
  { id: 'loc-baz', name: 'Bazargan / Gürbulak (IR -> TR)', countryFrom: 'IR', countryTo: 'TR' },
]

export function BorderOperationDrawer({ isOpen, onClose, onSave }: BorderOperationDrawerProps) {
  const [bolNumber, setBolNumber] = useState('BOL-2026-0041')
  const [shipmentId, setShipmentId] = useState('shp-2026-0041')
  const [truckPlate, setTruckPlate] = useState('2877 کابل ل')
  const [driverName, setDriverName] = useState('Ahmadullah Niazi')
  const [driverPhone, setDriverPhone] = useState('+93 79 912 3456')
  const [containerNumber, setContainerNumber] = useState('MSKU9981240')
  const [selectedBorderIndex, setSelectedBorderIndex] = useState(0)
  const [agentName, setAgentName] = useState('Haji Mohammad Ebrahim Customs Clearance Agency')
  const [agentContact, setAgentContact] = useState('Haji Ebrahim')
  const [agentPhone, setAgentPhone] = useState('+98 915 321 9988')
  const [declarationNumber, setDeclarationNumber] = useState('DEC-AF-2026-90412')
  const [transitReference, setTransitReference] = useState('TRN-IR-2026-8812')
  const [internalNotes, setInternalNotes] = useState('')
  const [customerSafeNotes, setCustomerSafeNotes] = useState('Shipment approaching border station for customs clearance.')

  if (!isOpen) return null

  const selectedBorder = BORDER_CROSSINGS[selectedBorderIndex]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      bolNumber,
      shipmentId,
      truckPlate,
      driverName,
      driverPhone,
      containerNumber,
      borderLocationId: selectedBorder.id,
      borderLocationName: selectedBorder.name,
      countryFrom: selectedBorder.countryFrom,
      countryTo: selectedBorder.countryTo,
      routeLeg: selectedBorder.name,
      agentName,
      agentContact,
      agentPhone,
      agentWhatsApp: agentPhone,
      declarationNumber,
      transitReference,
      internalNotes,
      customerSafeNotes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Initiate Border Operation
              </h2>
              <p className="text-[11px] text-slate-400">
                Connect BOL, transport truck, customs crossing, and clearing agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Section 1: BOL & Transport */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Shipment & Transport Equipment
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Bill of Lading (BOL):</label>
                <input
                  type="text"
                  required
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Shipment ID:</label>
                <input
                  type="text"
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Truck Plate:</label>
                <input
                  type="text"
                  required
                  value={truckPlate}
                  onChange={(e) => setTruckPlate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Container Number:</label>
                <input
                  type="text"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                  placeholder="e.g. MSKU9981240"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver Name:</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver Phone:</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Border Crossing Location */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              2. Border Station & Transit Corridor
            </span>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Selected Crossing Gate:</label>
              <select
                value={selectedBorderIndex}
                onChange={(e) => setSelectedBorderIndex(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-indigo-500"
              >
                {BORDER_CROSSINGS.map((b, idx) => (
                  <option key={b.id} value={idx}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Two-Sided Border Model:</span>
              <span className="font-mono font-bold text-indigo-400">
                Country {selectedBorder.countryFrom} Side $\rightarrow$ Country {selectedBorder.countryTo} Side
              </span>
            </div>
          </div>

          {/* Section 3: Customs Clearing Agent */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              3. Assigned Customs Broker / Clearing Agent
            </span>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Broker Company Name:</label>
              <input
                type="text"
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Contact Person:</label>
                <input
                  type="text"
                  value={agentContact}
                  onChange={(e) => setAgentContact(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone / WhatsApp:</label>
                <input
                  type="text"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operational References & Notes */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              4. Customs References & Notes
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Declaration Number:</label>
                <input
                  type="text"
                  value={declarationNumber}
                  onChange={(e) => setDeclarationNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Transit Reference:</label>
                <input
                  type="text"
                  value={transitReference}
                  onChange={(e) => setTransitReference(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Customer-Safe Tracking Status:</label>
              <input
                type="text"
                value={customerSafeNotes}
                onChange={(e) => setCustomerSafeNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-300 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Internal Operations Notes:</label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Private broker commission, tariff codes, or internal handling instructions..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow transition"
            >
              Save Border Operation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
