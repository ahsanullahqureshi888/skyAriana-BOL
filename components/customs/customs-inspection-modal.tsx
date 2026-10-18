"use client"

import React, { useState } from 'react'
import { X, Search, CheckCircle2, AlertCircle } from 'lucide-react'
import { InspectionType, InspectionStatus } from '@/lib/types/customs-border'

interface CustomsInspectionModalProps {
  isOpen: boolean
  onClose: () => void
  borderOperationId: string
  bolNumber: string
  onSave: (data: any) => void
}

export function CustomsInspectionModal({
  isOpen,
  onClose,
  borderOperationId,
  bolNumber,
  onSave,
}: CustomsInspectionModalProps) {
  const [inspectionType, setInspectionType] = useState<InspectionType>('X_RAY_SCAN')
  const [authority, setAuthority] = useState('Islam Qala Customs X-Ray Scanner Directorate')
  const [reason, setReason] = useState('Standard mandatory outbound container scanner imaging')
  const [result, setResult] = useState('Clean scan verified. No undeclared cargo or density anomalies detected.')
  const [inspectorName, setInspectorName] = useState('Inspector M. Qaderi')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      borderOperationId,
      inspectionType,
      authority,
      reason,
      result,
      inspectorName,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Record Customs Inspection
              </h3>
              <span className="font-mono text-xs text-slate-400">BOL: {bolNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Inspection Protocol / Type:</label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-indigo-500"
            >
              <option value="X_RAY_SCAN">X-RAY CONTAINER SCAN (اسکن اشعه ایکس)</option>
              <option value="PHYSICAL_TAILGATE">PHYSICAL TAILGATE INSPECTION (بازدید درب کانتینر)</option>
              <option value="FULL_DESTUFFING_INSPECTION">FULL DESTUFFING / UNLOAD INSPECTION (تخلیه و بارشماری کامل)</option>
              <option value="QUARANTINE_SAMPLING">AGRICULTURE QUARANTINE SAMPLING (نمونه‌برداری قرنطینه نباتی)</option>
              <option value="DOCUMENTARY_CHECK">DOCUMENTARY MANIFEST AUDIT (بررسی اسنادی و انطباق مانیفست)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Inspecting Authority / Officer:</label>
            <input
              type="text"
              required
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Inspector Name / Badge:</label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="e.g. Officer Qaderi"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Inspection Reason / Directive:</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Objective Inspection Findings & Outcome:
            </label>
            <textarea
              rows={3}
              required
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Factual text only (e.g. Seals checked intact, X-Ray scan clear, 1,427 cartons verified)."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            Compliance Policy: Store factual inspection outcomes only. Do not generate automated legal opinions.
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow"
            >
              Save Inspection Record
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
