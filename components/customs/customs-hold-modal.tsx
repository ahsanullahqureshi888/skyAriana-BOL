"use client"

import React, { useState } from 'react'
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { CustomsHoldRecord, CustomsHoldType } from '@/lib/types/customs-border'

interface CustomsHoldModalProps {
  isOpen: boolean
  onClose: () => void
  existingHold?: CustomsHoldRecord | null
  borderOperationId: string
  bolNumber: string
  onCreateHold?: (data: any) => void
  onReleaseHold?: (holdId: string, releasedBy: string, resolutionNote: string) => void
}

export function CustomsHoldModal({
  isOpen,
  onClose,
  existingHold,
  borderOperationId,
  bolNumber,
  onCreateHold,
  onReleaseHold,
}: CustomsHoldModalProps) {
  // Create mode state
  const [holdType, setHoldType] = useState<CustomsHoldType>('DOCUMENT_HOLD')
  const [authority, setAuthority] = useState('Islam Qala Customs Valuation Directorate')
  const [reason, setReason] = useState('')
  const [responsibleParty, setResponsibleParty] = useState('Shipper Export Operations')
  const [requiredAction, setRequiredAction] = useState('')

  // Release mode state
  const [releasedBy, setReleasedBy] = useState('Border Operations Controller')
  const [resolutionNote, setResolutionNote] = useState('')

  if (!isOpen) return null

  const isReleaseMode = !!existingHold

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCreateHold) return
    onCreateHold({
      borderOperationId,
      bolNumber,
      holdType,
      authority,
      reason,
      responsibleParty,
      requiredAction,
    })
    onClose()
  }

  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onReleaseHold || !existingHold) return
    onReleaseHold(existingHold.id, releasedBy, resolutionNote)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg border ${
                isReleaseMode
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isReleaseMode ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isReleaseMode ? 'Release Customs Hold' : 'Place Customs Hold'}
              </h3>
              <span className="font-mono text-xs text-slate-400">BOL: {bolNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* RELEASE MODE */}
        {isReleaseMode && existingHold ? (
          <form onSubmit={handleRelease} className="space-y-4 text-xs">
            <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Hold Type:</span>
                <span className="font-bold text-rose-400 font-mono">
                  {existingHold.holdType.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Authority:</span>
                <span className="text-slate-200">{existingHold.authority}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Reason:</span>
                <p className="text-slate-300 mt-0.5">{existingHold.reason}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Required Action:</span>
                <p className="text-amber-300 mt-0.5">{existingHold.requiredAction}</p>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Authorized Releasing Officer / Manager:
              </label>
              <input
                type="text"
                required
                value={releasedBy}
                onChange={(e) => setReleasedBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Resolution Explanation & Findings (Mandatory):
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Amended laboratory phytosanitary certificate received from Kandahar Agriculture Directorate, verified by customs officer, clearance stamped."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
              Audit Rule: Releasing this hold does NOT delete the original record. The entire incident history remains permanently in the shipment audit log.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow"
              >
                Confirm Hold Release
              </button>
            </div>
          </form>
        ) : (
          /* CREATE MODE */
          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Customs Hold Classification:</label>
              <select
                value={holdType}
                onChange={(e) => setHoldType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-rose-500"
              >
                <option value="DOCUMENT_HOLD">DOCUMENT HOLD (نقص در اسناد صادراتی)</option>
                <option value="INSPECTION_HOLD">INSPECTION HOLD (متوقف جهت بازرسی فیزیکی)</option>
                <option value="PAYMENT_HOLD">PAYMENT HOLD (عدم پرداخت تعرفه/عوارض)</option>
                <option value="CUSTOMS_REVIEW">CUSTOMS REVIEW (بررسی قیمت‌گذاری ارزش)</option>
                <option value="SEAL_ISSUE">SEAL ISSUE (مغایرت پلمپ/آسیب‌دیدگی)</option>
                <option value="DATA_MISMATCH">DATA MISMATCH (مغایرت لست مشخصات با اظهارنامه)</option>
                <option value="OTHER">OTHER OPERATIONAL HOLD (سایر توقف‌ها)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Enforcing Authority / Station:</label>
              <input
                type="text"
                required
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Reason for Customs Hold:</label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Discrepancy between certificate of origin seal and commercial invoice heading."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Responsible Party:</label>
                <select
                  value={responsibleParty}
                  onChange={(e) => setResponsibleParty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                >
                  <option value="Shipper Export Operations">Shipper / Exporter</option>
                  <option value="Customs Broker / Agent">Customs Broker</option>
                  <option value="Driver / Transport">Driver / Transporter</option>
                  <option value="Customs Directorate">Customs Authority</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Required Action:</label>
                <input
                  type="text"
                  required
                  value={requiredAction}
                  onChange={(e) => setRequiredAction(e.target.value)}
                  placeholder="e.g. Provide replacement stamp"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="p-2.5 rounded bg-rose-950/20 border border-rose-800/40 text-[11px] text-rose-300">
              Notification Trigger: Placing this hold will immediately alert the Control Tower, operations dispatcher, and assigned customs broker.
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow"
              >
                Register Customs Hold
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
