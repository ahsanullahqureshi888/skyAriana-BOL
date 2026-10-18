"use client"

import React, { useState } from 'react'
import { X, FileText, AlertCircle, ShieldCheck } from 'lucide-react'
import { CustomsDeclarationType, DeclarationStatus } from '@/lib/types/customs-border'

interface DeclarationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialBol?: string
}

export function DeclarationModal({ isOpen, onClose, onSave, initialBol }: DeclarationModalProps) {
  const [declarationNumber, setDeclarationNumber] = useState(
    `DEC-AF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  )
  const [declarationType, setDeclarationType] = useState<CustomsDeclarationType>('EXPORT')
  const [country, setCountry] = useState('Afghanistan')
  const [customsOffice, setCustomsOffice] = useState('Islam Qala Customs Directorate (گمرک اسلام قلعه)')
  const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split('T')[0])
  const [exporter, setExporter] = useState('Alokozay Dried Fruits Processing Ltd.')
  const [importer, setImporter] = useState('Green Oasis Dry Foods Trading LLC (Dubai)')
  const [commodity, setCommodity] = useState('Afghan Green Raisins Grade A (Kishmish)')
  const [hsCode, setHsCode] = useState('0806.20.00')
  const [packages, setPackages] = useState(1427)
  const [packageType, setPackageType] = useState('CTNS')
  const [grossWeightKg, setGrossWeightKg] = useState(23545.5)
  const [netWeightKg, setNetWeightKg] = useState(22832.0)
  const [declaredValue, setDeclaredValue] = useState(45664.0)
  const [currency, setCurrency] = useState<'USD' | 'AFN' | 'IRR' | 'AED' | 'EUR'>('USD')
  const [status, setStatus] = useState<DeclarationStatus>('SUBMITTED')
  const [linkedBolNumber, setLinkedBolNumber] = useState(initialBol || 'BOL-2026-0041')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      declarationNumber,
      declarationType,
      country,
      customsOffice,
      declarationDate,
      exporter,
      importer,
      commodity,
      hsCode,
      packages: Number(packages),
      packageType,
      grossWeightKg: Number(grossWeightKg),
      netWeightKg: Number(netWeightKg),
      declaredValue: Number(declaredValue),
      currency,
      status,
      linkedBolNumber,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Official Customs Declaration Entry
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Declared values remain strictly separate from company freight revenues
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Reg Number, Type, Office */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Declaration Number:</label>
              <input
                type="text"
                required
                value={declarationNumber}
                onChange={(e) => setDeclarationNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Declaration Type:</label>
              <select
                value={declarationType}
                onChange={(e) => setDeclarationType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-blue-500"
              >
                <option value="EXPORT">EXPORT (صادرات)</option>
                <option value="TRANSIT">TRANSIT (ترانزیت عبوری)</option>
                <option value="IMPORT">IMPORT (واردات)</option>
                <option value="TEMPORARY_ADMISSION">TEMPORARY ADMISSION (ورود موقت)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Linked BOL:</label>
              <input
                type="text"
                required
                value={linkedBolNumber}
                onChange={(e) => setLinkedBolNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Customs Office & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Customs Directorate / Office:</label>
              <input
                type="text"
                required
                value={customsOffice}
                onChange={(e) => setCustomsOffice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Declaration Date:</label>
              <input
                type="date"
                required
                value={declarationDate}
                onChange={(e) => setDeclarationDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Exporter & Importer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Registered Exporter:</label>
              <input
                type="text"
                required
                value={exporter}
                onChange={(e) => setExporter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Foreign Importer / Consignee:</label>
              <input
                type="text"
                required
                value={importer}
                onChange={(e) => setImporter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Commodity & HS Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Commodity Description:</label>
              <input
                type="text"
                required
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Harmonized HS Code:</label>
              <input
                type="text"
                required
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-400 font-mono font-bold outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 5: Packages & Weights */}
          <div className="grid grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Packages:</label>
              <input
                type="number"
                required
                value={packages}
                onChange={(e) => setPackages(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Type:</label>
              <input
                type="text"
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Gross Wt (KG):</label>
              <input
                type="number"
                step="0.1"
                required
                value={grossWeightKg}
                onChange={(e) => setGrossWeightKg(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Net Wt (KG):</label>
              <input
                type="number"
                step="0.1"
                required
                value={netWeightKg}
                onChange={(e) => setNetWeightKg(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>
          </div>

          {/* Row 6: Declared Value & Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Declared Customs Value:</label>
              <input
                type="number"
                step="0.01"
                required
                value={declaredValue}
                onChange={(e) => setDeclaredValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Currency:</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="AFN">AFN (؋)</option>
                <option value="IRR">IRR (تومان/ریال)</option>
                <option value="AED">AED (درهم)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Declaration Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-blue-500"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PREPARED">PREPARED</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="REVIEW">REVIEW</option>
                <option value="INSPECTION">INSPECTION</option>
                <option value="HOLD">HOLD</option>
                <option value="CLEARED">CLEARED</option>
              </select>
            </div>
          </div>

          {/* Isolation banner */}
          <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl flex items-center gap-2 text-[11px] text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Accounting Invariance: Declared customs value is recorded strictly for tariff/customs inspection and will never alter customer freight invoices or accounting ledgers.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
            >
              Save Customs Declaration
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
