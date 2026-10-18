'use client'

import React, { useState } from 'react'
import { X, FileText, AlertTriangle, CheckCircle, Plus, History, Printer } from 'lucide-react'
import { MAWBRecord, HAWBRecord, AWBStatus } from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface AWBWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveMawb: (mawb: MAWBRecord) => void
  onSaveHawb?: (hawb: HAWBRecord) => void
  bookingId: string
  bookingReference: string
  existingMawb?: MAWBRecord | null
}

const AIRLINE_PREFIX_MAP: Record<string, string> = {
  'airl-fg': '384',
  'airl-rq': '255',
  'airl-ek': '176',
  'airl-qr': '157',
  'airl-tk': '235',
  'airl-fz': '141',
}

export function AWBWorkflowModal({
  isOpen,
  onClose,
  onSaveMawb,
  onSaveHawb,
  bookingId,
  bookingReference,
  existingMawb,
}: AWBWorkflowModalProps) {
  const [activeTab, setActiveTab] = useState<'MAWB' | 'HAWB' | 'DRAFT_HISTORY'>('MAWB')

  // MAWB State
  const [mawbNumber, setMawbNumber] = useState(existingMawb?.mawbNumber || '384-')
  const [airlineId, setAirlineId] = useState(existingMawb?.airlineId || 'airl-fg')
  const [airlineName, setAirlineName] = useState(existingMawb?.airlineName || 'Kam Air')
  const [shipper, setShipper] = useState(existingMawb?.shipper || '')
  const [consignee, setConsignee] = useState(existingMawb?.consignee || '')
  const [originAirportIata, setOriginAirportIata] = useState(existingMawb?.originAirportIata || 'KBL')
  const [destinationAirportIata, setDestinationAirportIata] = useState(
    existingMawb?.destinationAirportIata || 'DXB'
  )
  const [packagesCount, setPackagesCount] = useState<number>(existingMawb?.packagesCount || 1)
  const [grossWeightKg, setGrossWeightKg] = useState<number>(existingMawb?.grossWeightKg || 0)
  const [chargeableWeightKg, setChargeableWeightKg] = useState<number>(
    existingMawb?.chargeableWeightKg || 0
  )
  const [awbStatus, setAwbStatus] = useState<AWBStatus>(existingMawb?.status || 'DRAFT')
  const [issueDate, setIssueDate] = useState(
    existingMawb?.issueDate || new Date().toISOString().split('T')[0]
  )
  const [flightNumber, setFlightNumber] = useState(existingMawb?.flightNumber || 'FG-711')
  const [notes, setNotes] = useState(existingMawb?.notes || '')

  // HAWB State (for linking)
  const [hawbNumber, setHawbNumber] = useState(`SKYA-HAWB-${Date.now().toString().slice(-4)}`)
  const [hawbCommodity, setHawbCommodity] = useState('General Air Cargo')

  if (!isOpen) return null

  // Prefix check
  const expectedPrefix = AIRLINE_PREFIX_MAP[airlineId]
  const enteredPrefix = mawbNumber.split('-')[0]?.trim()
  const isPrefixMismatch = expectedPrefix && enteredPrefix && enteredPrefix.length === 3 && enteredPrefix !== expectedPrefix

  const handleAirlineChange = (id: string) => {
    setAirlineId(id)
    if (id === 'airl-fg') setAirlineName('Kam Air')
    else if (id === 'airl-rq') setAirlineName('Ariana Afghan Airlines')
    else if (id === 'airl-ek') setAirlineName('Emirates SkyCargo')
    else if (id === 'airl-qr') setAirlineName('Qatar Airways Cargo')
    else if (id === 'airl-tk') setAirlineName('Turkish Cargo')
    else if (id === 'airl-fz') setAirlineName('flydubai Cargo')

    const p = AIRLINE_PREFIX_MAP[id]
    if (p && (!mawbNumber || mawbNumber.startsWith('384-') || mawbNumber.length < 5)) {
      setMawbNumber(`${p}-`)
    }
  }

  const handleSubmitMawb = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mawbNumber.trim()) return

    const prefix = mawbNumber.split('-')[0] || expectedPrefix || '384'

    const saved = airFreightStore.saveMawb({
      id: existingMawb?.id,
      bookingId,
      bookingReference,
      mawbNumber: mawbNumber.trim(),
      awbPrefix: prefix,
      airlineId,
      airlineName,
      shipper: shipper.trim() || 'Shipper',
      consignee: consignee.trim() || 'Consignee',
      originAirportIata: originAirportIata.trim().toUpperCase(),
      destinationAirportIata: destinationAirportIata.trim().toUpperCase(),
      packagesCount: Number(packagesCount),
      grossWeightKg: Number(grossWeightKg),
      chargeableWeightKg: Number(chargeableWeightKg),
      status: awbStatus,
      issueDate: awbStatus === 'ISSUED' ? issueDate : undefined,
      flightNumber: flightNumber.trim().toUpperCase(),
      notes: notes.trim() || undefined,
    })

    onSaveMawb(saved)
    onClose()
  }

  const handleCreateHawb = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hawbNumber.trim()) return

    const hawb = airFreightStore.saveHawb({
      hawbNumber: hawbNumber.trim(),
      mawbNumber: mawbNumber.trim(),
      bookingId,
      shipper: shipper.trim() || 'Shipper',
      consignee: consignee.trim() || 'Consignee',
      commodity: hawbCommodity.trim(),
      packagesCount: Number(packagesCount),
      grossWeightKg: Number(grossWeightKg),
      chargeableWeightKg: Number(chargeableWeightKg),
      issueDate: new Date().toISOString().split('T')[0],
      status: 'ISSUED',
    })

    if (onSaveHawb) onSaveHawb(hawb)
    setActiveTab('MAWB')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Air Waybill Management (MAWB / HAWB)
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

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('MAWB')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'MAWB'
                ? 'border-sky-500 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Master Air Waybill (MAWB)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HAWB')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'HAWB'
                ? 'border-sky-500 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Issue House AWB (HAWB)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DRAFT_HISTORY')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'DRAFT_HISTORY'
                ? 'border-sky-500 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Draft Versions History ({existingMawb?.draftVersions?.length || 1})
          </button>
        </div>

        {/* Tab 1: MAWB */}
        {activeTab === 'MAWB' && (
          <form onSubmit={handleSubmitMawb} className="flex-1 overflow-y-auto p-6 space-y-4">
            {isPrefixMismatch && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>AWB Prefix Notice:</strong> Selected airline {airlineName} standard 3-digit prefix is{' '}
                  <strong className="font-mono text-white">{expectedPrefix}</strong>, but entered prefix is{' '}
                  <strong className="font-mono text-white">{enteredPrefix}</strong>. Please confirm before final issuance.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Airline Partner</label>
                <select
                  value={airlineId}
                  onChange={(e) => handleAirlineChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="airl-fg">Kam Air (Prefix 384)</option>
                  <option value="airl-rq">Ariana Afghan Airlines (Prefix 255)</option>
                  <option value="airl-ek">Emirates SkyCargo (Prefix 176)</option>
                  <option value="airl-qr">Qatar Airways (Prefix 157)</option>
                  <option value="airl-tk">Turkish Cargo (Prefix 235)</option>
                  <option value="airl-fz">flydubai (Prefix 141)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  MAWB Number (3-digit prefix + 8 digits)
                </label>
                <input
                  type="text"
                  value={mawbNumber}
                  onChange={(e) => setMawbNumber(e.target.value)}
                  placeholder="e.g. 384-10293841"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Shipper Name & Address</label>
                <input
                  type="text"
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  placeholder="Shipper legal name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Consignee Name & Address</label>
                <input
                  type="text"
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="Consignee legal name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Origin Airport</label>
                <input
                  type="text"
                  value={originAirportIata}
                  onChange={(e) => setOriginAirportIata(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Destination Airport</label>
                <input
                  type="text"
                  value={destinationAirportIata}
                  onChange={(e) => setDestinationAirportIata(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Flight Number</label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. FG-711"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Packages Count</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Gross Weight (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={grossWeightKg}
                  onChange={(e) => setGrossWeightKg(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Chargeable Weight (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={chargeableWeightKg}
                  onChange={(e) => setChargeableWeightKg(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">AWB Workflow Status</label>
                <select
                  value={awbStatus}
                  onChange={(e) => setAwbStatus(e.target.value as AWBStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="DRAFT">DRAFT (Initial Air Freight Draft)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Carrier Reviewing Draft)</option>
                  <option value="CORRECTION_REQUIRED">CORRECTION_REQUIRED (Discrepancy Logged)</option>
                  <option value="APPROVED">APPROVED (Verified for Final Print)</option>
                  <option value="ISSUED">ISSUED (Official Master AWB Confirmed)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Handling Information / Special Endorsement
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Temperature control instructions, valuable cargo security details..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {existingMawb ? 'Update MAWB' : 'Save MAWB'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Issue HAWB */}
        {activeTab === 'HAWB' && (
          <form onSubmit={handleCreateHawb} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300">
              House Air Waybills (HAWB) are issued by <strong>SKY ARIANA LIMITED</strong> to individual shippers,
              consolidated under Master Air Waybill (MAWB) <strong>{mawbNumber}</strong>.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">HAWB Reference #</label>
                <input
                  type="text"
                  value={hawbNumber}
                  onChange={(e) => setHawbNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Master AWB Link</label>
                <input
                  type="text"
                  value={mawbNumber}
                  readOnly
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Commodity / Goods Description</label>
              <input
                type="text"
                value={hawbCommodity}
                onChange={(e) => setHawbCommodity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('MAWB')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Back to MAWB
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Issue House AWB
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Draft Versions History */}
        {activeTab === 'DRAFT_HISTORY' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <History className="w-4 h-4 text-sky-400" />
              <span>AWB Draft Version Audit Trail (v1, v2...)</span>
            </div>

            <div className="space-y-3">
              {existingMawb?.draftVersions && existingMawb.draftVersions.length > 0 ? (
                existingMawb.draftVersions.map((v, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400 font-mono">
                        Draft Version {v.versionNumber}
                      </span>
                      <span className="text-slate-400">{v.receivedDate}</span>
                    </div>
                    {v.notes && <p className="text-slate-300">{v.notes}</p>}
                    {v.correctionsRequested && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300">
                        <strong>Correction Requested:</strong> {v.correctionsRequested}
                      </div>
                    )}
                    {v.approvedDate && (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" /> Approved on {v.approvedDate} by {v.approvedBy}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No previous draft revisions recorded. Active draft is Version 1.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
