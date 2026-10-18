"use client"

import React, { useState } from 'react'
import {
  X,
  ShieldCheck,
  MapPin,
  Clock,
  Truck,
  User,
  Phone,
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Calendar,
  Lock,
  ArrowRight,
  Printer,
  Search,
} from 'lucide-react'
import {
  BorderOperationRecord,
  BorderStatus,
  BorderSide,
  CustomsDocumentItem,
  DataMismatchItem,
} from '@/lib/types/customs-border'

interface BorderOperationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  operation: BorderOperationRecord
  onUpdateStatus: (stage: BorderStatus, location: string, notes: string, recordedBy: string) => void
  onVerifyDocument: (documentId: string) => void
  onOpenHoldModal: () => void
  onReleaseHoldModal: (hold: any) => void
  onOpenInspectionModal: () => void
  onOpenPrintPdf: () => void
  onCopyWhatsApp: (type: any) => void
  mismatchItems: DataMismatchItem[]
}

type DetailTab =
  | 'overview'
  | 'timeline'
  | 'documents'
  | 'declaration'
  | 'transit'
  | 'holds'
  | 'inspections'
  | 'mismatch'

export function BorderOperationDetailModal({
  isOpen,
  onClose,
  operation,
  onUpdateStatus,
  onVerifyDocument,
  onOpenHoldModal,
  onReleaseHoldModal,
  onOpenInspectionModal,
  onOpenPrintPdf,
  onCopyWhatsApp,
  mismatchItems,
}: BorderOperationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  if (!isOpen) return null

  // Calculate waiting duration in hours
  let waitingHoursStr = 'N/A'
  if (operation.arrivalDate) {
    const start = new Date(operation.arrivalDate).getTime()
    const end = operation.borderExitDate
      ? new Date(operation.borderExitDate).getTime()
      : Date.now()
    const diffHours = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60)))
    waitingHoursStr = `${diffHours} hrs`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-xs">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-base">
                  {operation.operationNumber}
                </span>
                <span className="font-mono text-slate-400 text-xs">
                  (BOL: {operation.bolNumber})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    operation.status === 'CLEARED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : operation.status === 'BORDER_CROSSED'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : operation.status === 'ON_HOLD'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {operation.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {operation.borderLocationName} • Side: <strong className="text-slate-200">{operation.currentSide}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPrintPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              Print Sheet
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: `Timeline (${operation.timeline.length})` },
            { id: 'documents', label: `Documents (${operation.documents.length})` },
            { id: 'declaration', label: 'Declaration' },
            { id: 'transit', label: 'Transit Paper' },
            { id: 'holds', label: `Holds (${operation.holds.length})` },
            { id: 'inspections', label: `Inspections (${operation.inspections.length})` },
            { id: 'mismatch', label: 'Data Mismatch' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick Status Advancement Bar */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Quick Stage Update (Chronological Verification)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateStatus(
                        'ARRIVED_BORDER',
                        operation.borderLocationName,
                        'Truck physically arrived at border perimeter.',
                        'Border Clerk'
                      )
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium border border-slate-700"
                  >
                    1. Reached Border
                  </button>
                  <button
                    onClick={() =>
                      onUpdateStatus(
                        'ENTERED_CUSTOMS',
                        operation.borderLocationName,
                        'Vehicle entered customs clearance yard.',
                        'Border Clerk'
                      )
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium border border-slate-700"
                  >
                    2. Entered Customs
                  </button>
                  <button
                    onClick={() =>
                      onUpdateStatus(
                        'CLEARED',
                        operation.borderLocationName,
                        'Customs valuation and duty cleared.',
                        'Clearing Agent'
                      )
                    }
                    className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 rounded font-medium border border-emerald-800/60"
                  >
                    3. Customs Cleared
                  </button>
                  <button
                    onClick={() =>
                      onUpdateStatus(
                        'BORDER_CROSSED',
                        operation.borderLocationName,
                        'Vehicle crossed international border into destination country.',
                        'Gate Officer'
                      )
                    }
                    className="px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900 text-blue-400 rounded font-medium border border-blue-800/60"
                  >
                    4. Border Crossed
                  </button>
                  <button
                    onClick={onOpenHoldModal}
                    className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-400 rounded font-medium border border-rose-800/60 ml-auto"
                  >
                    + Place Hold
                  </button>
                  <button
                    onClick={onOpenInspectionModal}
                    className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-400 rounded font-medium border border-indigo-800/60"
                  >
                    + Log Inspection
                  </button>
                </div>
              </div>

              {/* Grid Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transport & Location */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Transport & Border Crossing
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Truck Plate:</span>
                    <span className="font-mono font-bold text-white text-xs">{operation.truckPlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver Name:</span>
                    <span className="text-slate-200 font-semibold">{operation.driverName}</span>
                  </div>
                  {operation.driverPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Driver Phone:</span>
                      <span className="font-mono text-slate-300">{operation.driverPhone}</span>
                    </div>
                  )}
                  {operation.containerNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Container:</span>
                      <span className="font-mono font-bold text-indigo-300">{operation.containerNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Border Location:</span>
                    <span className="text-right text-slate-200 font-medium">{operation.borderLocationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recorded Waiting Duration:</span>
                    <span className="font-mono font-bold text-amber-400">{waitingHoursStr}</span>
                  </div>
                </div>

                {/* Clearing Agent & Contacts */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assigned Customs Broker / Agent
                  </span>
                  <div className="text-xs font-bold text-slate-100">{operation.agentName || 'Self-clearing by Driver'}</div>
                  {operation.agentContact && (
                    <div className="text-slate-400">
                      Contact: <strong className="text-slate-300">{operation.agentContact}</strong>
                    </div>
                  )}
                  {operation.agentPhone && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${operation.agentPhone}`}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[11px]"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {operation.agentPhone}
                      </a>
                      <a
                        href={`https://wa.me/${operation.agentPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded font-semibold text-[11px] border border-emerald-800/60"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Share Status</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onCopyWhatsApp('CUSTOMS_CLEARED')}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-emerald-400" />
                        Cleared (Dari)
                      </button>
                      <button
                        onClick={() => onCopyWhatsApp('BORDER_CROSSED')}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-blue-400" />
                        Crossed (Dari)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Customer Safe Tracking Notes
                  </span>
                  <p className="text-slate-300 text-xs">
                    {operation.customerSafeNotes || 'Truck en route through border checkpoint.'}
                  </p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Internal Operations Notes
                  </span>
                  <p className="text-slate-400 text-xs">
                    {operation.internalNotes || 'No internal restrictions or confidential fee remarks recorded.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Chronological Border Checkpoint Audit Trail
              </span>
              <div className="relative border-l border-slate-800 ml-4 space-y-4 py-2">
                {operation.timeline.map((event) => (
                  <div key={event.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900" />
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">
                          {event.stage.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mb-1">
                        Location: <strong className="text-slate-200">{event.locationName}</strong>
                      </div>
                      <p className="text-slate-300 text-xs">{event.notes}</p>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Recorded by: {event.recordedBy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS CHECKLIST */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Afghan Export & Border Compliance Checklist
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Verified documents permit progression to customs clearance review.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-2.5">Document Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Document #</th>
                      <th className="p-2.5 text-center">Required</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {operation.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-2.5 font-medium text-slate-100">{doc.name}</td>
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{doc.category}</td>
                        <td className="p-2.5 font-mono text-slate-200">{doc.documentNumber || '—'}</td>
                        <td className="p-2.5 text-center">
                          {doc.required ? (
                            <span className="text-amber-400 font-bold">YES</span>
                          ) : (
                            <span className="text-slate-500">OPTIONAL</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              doc.verified
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => onVerifyDocument(doc.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                              doc.verified
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {doc.verified ? 'Verified ✓' : 'Mark Verified'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DECLARATION */}
          {activeTab === 'declaration' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    Official Customs Declaration
                  </span>
                  <span className="font-mono font-bold text-indigo-400 text-xs">
                    {operation.declarationNumber || 'Pending Filing'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">HS Heading</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">0806.20.00</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">Declared Value</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">$45,664.00 USD</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">Declared Gross Mass</span>
                    <span className="font-mono font-bold text-slate-200">23,545.5 KG</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">Duty Status</span>
                    <span className="font-bold text-blue-400">Exempt (Agri Incentive)</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-lg text-[11px] text-blue-300">
                  Value Isolation Notice: This declared value is for customs clearance appraisal only. It does not mix with freight revenue or corporate ledger balances.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSIT PAPER */}
          {activeTab === 'transit' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    International Transit Carnet / Paper
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {operation.transitReference || 'TRN-IR-2026-8812'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">Transit Route Corridor</span>
                    <span className="text-slate-200 font-semibold">
                      Dogharoon Border $\rightarrow$ Mashhad $\rightarrow$ Bandar Abbas Port
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">Security Bolt Seal</span>
                    <span className="font-mono font-bold text-emerald-400">SEAL-AF-887192</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HOLDS */}
          {activeTab === 'holds' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Active & Historical Customs Holds ({operation.holds.length})
                </span>
                <button
                  onClick={onOpenHoldModal}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs"
                >
                  + Place Hold
                </button>
              </div>

              {operation.holds.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  No active or historical customs holds on this border operation.
                </div>
              ) : (
                <div className="space-y-3">
                  {operation.holds.map((hold) => (
                    <div
                      key={hold.id}
                      className="bg-slate-950/80 p-4 rounded-xl border border-rose-900/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-400 text-xs">
                          {hold.holdType.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            hold.status === 'RELEASED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400 animate-pulse'
                          }`}
                        >
                          {hold.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        <strong>Reason:</strong> {hold.reason}
                      </div>
                      <div className="text-xs text-amber-300">
                        <strong>Required Action:</strong> {hold.requiredAction}
                      </div>
                      {hold.status === 'OPEN' && (
                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                          <button
                            onClick={() => onReleaseHoldModal(hold)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs shadow"
                          >
                            Release Hold
                          </button>
                        </div>
                      )}
                      {hold.status === 'RELEASED' && (
                        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                          Released by: {hold.releasedBy} | Note: {hold.resolutionNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: INSPECTIONS */}
          {activeTab === 'inspections' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Customs Inspections ({operation.inspections.length})
                </span>
                <button
                  onClick={onOpenInspectionModal}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs"
                >
                  + Log Inspection
                </button>
              </div>

              {operation.inspections.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  No inspections recorded yet for this crossing.
                </div>
              ) : (
                <div className="space-y-3">
                  {operation.inspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="bg-slate-950/80 p-4 rounded-xl border border-indigo-900/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-400 text-xs">
                          {insp.inspectionType.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {insp.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        <strong>Authority:</strong> {insp.authority}
                      </div>
                      <div className="text-xs text-slate-300">
                        <strong>Findings:</strong> {insp.result || 'Pending outcome'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: DATA MISMATCH CHECKER */}
          {activeTab === 'mismatch' && (
            <div className="space-y-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider block">
                Cross-Document Reconciliation (BOL vs PL vs Declaration vs Invoice)
              </span>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Source A</th>
                      <th className="p-2.5">Source B</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Audit Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {mismatchItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition">
                        <td className="p-2.5 font-bold text-slate-100">{item.field}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] text-slate-500 block">{item.sourceA.name}</span>
                          <span className="font-mono font-semibold text-slate-200">{item.sourceA.value}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-[10px] text-slate-500 block">{item.sourceB.name}</span>
                          <span className="font-mono font-semibold text-slate-200">{item.sourceB.value}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          {item.hasMismatch ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              MISMATCH
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              MATCH ✓
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-400 text-[11px]">{item.differenceNotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
