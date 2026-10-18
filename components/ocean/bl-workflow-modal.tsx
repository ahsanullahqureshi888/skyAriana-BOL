'use client'

import React, { useState } from 'react'
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  ShieldCheck,
  RotateCw,
} from 'lucide-react'
import {
  BLWorkflowRecord,
  BLDocType,
  BLReleaseStatus,
  SIStatus,
} from '@/lib/types/ocean-vessel'

interface BLWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  workflow: BLWorkflowRecord
  onAddDraftVersion: (notes: string) => void
  onRequestCorrection: (correctionsRequested: string) => void
  onApproveDraft: (approvedBy: string) => void
  onIssueFinalBL: (blNumber: string, blType: BLDocType) => void
  onCreateSwitchBL: (switchBlNumber: string, location: string, reason: string) => void
  onUpdateReleaseStatus: (status: BLReleaseStatus) => void
}

export function BLWorkflowModal({
  isOpen,
  onClose,
  workflow,
  onAddDraftVersion,
  onRequestCorrection,
  onApproveDraft,
  onIssueFinalBL,
  onCreateSwitchBL,
  onUpdateReleaseStatus,
}: BLWorkflowModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'drafts' | 'final' | 'switch' | 'release'>('status')

  // Draft inputs
  const [draftNotes, setDraftNotes] = useState('')
  const [correctionNotes, setCorrectionNotes] = useState('')
  const [approverName, setApproverName] = useState('Operations Manager')

  // Final BL inputs
  const [finalBlNumber, setFinalBlNumber] = useState(workflow.blNumber || `CMAU-${Date.now().toString().slice(-6)}`)
  const [blType, setBlType] = useState<BLDocType>(workflow.blType || 'ORIGINAL_BL')

  // Switch BL inputs
  const [switchBlNumber, setSwitchBlNumber] = useState(workflow.switchBlNumber || `SA-SWB-2026-${Date.now().toString().slice(-4)}`)
  const [switchLocation, setSwitchLocation] = useState(workflow.switchLocation || 'Dubai, UAE')
  const [switchReason, setSwitchReason] = useState(workflow.switchReason || 'Commercial confidentiality requested by buyer')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ocean Bill of Lading Lifecycle Control</h2>
              <p className="text-xs text-slate-500">
                Booking: <span className="text-slate-900 font-mono font-semibold">{workflow.bookingNumber}</span> | BOL:{' '}
                <span className="text-blue-600 font-mono font-bold">{workflow.bolNumber}</span>
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

        {/* Tab navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-200 bg-slate-50/50 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'status'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Workflow Status
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'drafts'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Draft Versions ({workflow.draftVersions.length})
          </button>
          <button
            onClick={() => setActiveTab('final')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'final'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Final BL
          </button>
          <button
            onClick={() => setActiveTab('switch')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'switch'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Switch BL {workflow.isSwitchBl ? '✓' : ''}
          </button>
          <button
            onClick={() => setActiveTab('release')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'release'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Release & DO
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-medium flex-1">
          {/* TAB 1: WORKFLOW STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Shipping Instructions</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {workflow.siStatus}
                  </div>
                  {workflow.siSubmittedAt && (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Submitted: {new Date(workflow.siSubmittedAt).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Draft Approval</div>
                  <div
                    className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${
                      workflow.isDraftApproved ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {workflow.isDraftApproved ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Approved
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-600" /> Pending Review
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono font-medium">
                    Version: v{workflow.currentDraftVersion || 0}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Release Status</div>
                  <div className="text-sm font-bold text-blue-700 mt-1">
                    {workflow.releaseStatus.replace(/_/g, ' ')}
                  </div>
                  {workflow.releaseBlocked && (
                    <div className="text-[11px] text-rose-600 mt-1 font-semibold">
                      ⚠️ {workflow.releaseBlockReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Bill of Lading Progression
                </span>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">
                      ✓
                    </span>
                    <span className="text-slate-800 font-semibold">1. Shipping Instructions (SI) Lodged</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        workflow.draftVersions.length > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {workflow.draftVersions.length > 0 ? '✓' : '2'}
                    </span>
                    <span className="text-slate-800 font-semibold">
                      2. Carrier Draft BL Received ({workflow.draftVersions.length} versions)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        workflow.isDraftApproved
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {workflow.isDraftApproved ? '✓' : '3'}
                    </span>
                    <span className="text-slate-800 font-semibold">3. Draft BL Verification & Customer Approval</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        workflow.finalBlIssuedDate
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {workflow.finalBlIssuedDate ? '✓' : '4'}
                    </span>
                    <span className="text-slate-800 font-semibold">
                      4. Final BL Issued ({workflow.blType || 'OBL / SWB'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        workflow.releaseStatus === 'SWB_ISSUED' ||
                        workflow.releaseStatus === 'DELIVERY_ORDER_ISSUED' ||
                        workflow.releaseStatus === 'TELEX_RELEASE_CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {workflow.releaseStatus === 'SWB_ISSUED' ||
                      workflow.releaseStatus === 'DELIVERY_ORDER_ISSUED' ||
                      workflow.releaseStatus === 'TELEX_RELEASE_CONFIRMED'
                        ? '✓'
                        : '5'}
                    </span>
                    <span className="text-slate-800 font-semibold">5. Cargo Delivery Order / Carrier Release</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DRAFT VERSIONS */}
          {activeTab === 'drafts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Historical Drafts (Preserved)</span>
              </div>
              <div className="space-y-2">
                {workflow.draftVersions.map((dv) => (
                  <div
                    key={dv.versionNumber}
                    className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Draft Version v{dv.versionNumber}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Received: {new Date(dv.receivedDate).toLocaleString('en-GB')}
                      </span>
                    </div>
                    {dv.notes && <div className="text-slate-700">{dv.notes}</div>}
                    {dv.correctionsRequested && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                        <strong>Correction Requested:</strong> {dv.correctionsRequested}
                      </div>
                    )}
                    {dv.approvedDate && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
                        ✓ Approved on {new Date(dv.approvedDate).toLocaleString('en-GB')} by {dv.approvedBy}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Draft vNext */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-slate-800 block">Record New Draft Version from Carrier</span>
                <input
                  type="text"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="e.g. Revised draft received with correct HS code and container weights"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (draftNotes) {
                      onAddDraftVersion(draftNotes)
                      setDraftNotes('')
                    }
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                >
                  + Add Draft v{workflow.draftVersions.length + 1}
                </button>
              </div>

              {/* Request Correction & Approve */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                  <span className="text-xs font-bold text-rose-700 block">Request Draft Correction</span>
                  <input
                    type="text"
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="e.g. Shipper address typo on line 2..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (correctionNotes) {
                        onRequestCorrection(correctionNotes)
                        setCorrectionNotes('')
                      }
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    Submit Correction Request
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                  <span className="text-xs font-bold text-emerald-700 block">Approve Draft BL</span>
                  <input
                    type="text"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="Approver Name"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => onApproveDraft(approverName)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    Approve Current Draft (v{workflow.currentDraftVersion})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINAL BL */}
          {activeTab === 'final' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 shadow-2xs">
                Record the final signed Bill of Lading document issued by the shipping line.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Final BL Number *</label>
                  <input
                    type="text"
                    required
                    value={finalBlNumber}
                    onChange={(e) => setFinalBlNumber(e.target.value)}
                    placeholder="e.g. CMAU-2026-990182"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">BL Document Type</label>
                  <select
                    value={blType}
                    onChange={(e) => setBlType(e.target.value as BLDocType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-xs font-semibold"
                  >
                    <option value="ORIGINAL_BL">Original BL (3/3 Set)</option>
                    <option value="SEA_WAYBILL">Sea Waybill (Express Release)</option>
                    <option value="SURRENDER_BL">Surrendered BL</option>
                    <option value="TELEX_RELEASE">Telex Release</option>
                    <option value="HOUSE_BL">House BL</option>
                    <option value="MASTER_BL">Master BL</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onIssueFinalBL(finalBlNumber, blType)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs text-xs transition"
              >
                Confirm Final BL Issuance
              </button>
            </div>
          )}

          {/* TAB 4: SWITCH BL */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 shadow-2xs">
                <strong>Non-Destructive Invariance:</strong> Switch BL is stored as a linked document and NEVER
                overwrites the original Bill of Lading. Both document trails remain accessible for audit and compliance.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Original BL Number</label>
                  <input
                    type="text"
                    disabled
                    value={workflow.blNumber || 'CMAU-2026-990182'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 font-mono text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Switch BL Number *</label>
                  <input
                    type="text"
                    required
                    value={switchBlNumber}
                    onChange={(e) => setSwitchBlNumber(e.target.value)}
                    placeholder="e.g. SA-SWB-2026-041"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 shadow-2xs text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Switch Location</label>
                  <input
                    type="text"
                    value={switchLocation}
                    onChange={(e) => setSwitchLocation(e.target.value)}
                    placeholder="e.g. Dubai, UAE"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 shadow-2xs text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Switch Reason</label>
                  <input
                    type="text"
                    value={switchReason}
                    onChange={(e) => setSwitchReason(e.target.value)}
                    placeholder="e.g. Commercial confidentiality requested by buyer"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 shadow-2xs text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onCreateSwitchBL(switchBlNumber, switchLocation, switchReason)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-2xs text-xs transition"
              >
                Create Linked Switch BL
              </button>
            </div>
          )}

          {/* TAB 5: RELEASE & DELIVERY ORDER */}
          {activeTab === 'release' && (
            <div className="space-y-4">
              {workflow.releaseBlocked && (
                <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <strong>Release Blocker Active:</strong> {workflow.releaseBlockReason}
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-slate-700 uppercase block">Update Release Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onUpdateReleaseStatus('SURRENDER_REQUESTED')}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left text-slate-700 hover:text-blue-900 shadow-2xs font-semibold transition"
                  >
                    Surrender Requested
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReleaseStatus('SURRENDER_CONFIRMED')}
                    className="p-3 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-left text-slate-700 hover:text-emerald-900 shadow-2xs font-semibold transition"
                  >
                    Surrender Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReleaseStatus('TELEX_RELEASE_REQUESTED')}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left text-slate-700 hover:text-blue-900 shadow-2xs font-semibold transition"
                  >
                    Telex Release Requested
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReleaseStatus('TELEX_RELEASE_CONFIRMED')}
                    className="p-3 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-left text-slate-700 hover:text-emerald-900 shadow-2xs font-semibold transition"
                  >
                    Telex Release Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReleaseStatus('SWB_ISSUED')}
                    className="p-3 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-left text-slate-700 hover:text-emerald-900 shadow-2xs font-semibold transition"
                  >
                    Sea Waybill (SWB) Issued
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateReleaseStatus('DELIVERY_ORDER_ISSUED')}
                    className="p-3 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left text-slate-700 hover:text-blue-900 shadow-2xs font-semibold transition"
                  >
                    Delivery Order (DO) Issued
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
