'use client'

import React, { useState } from 'react'
import {
  X,
  Ship,
  Layers,
  Box,
  Calendar,
  FileText,
  DollarSign,
  Compass,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Copy,
  ExternalLink,
} from 'lucide-react'
import {
  OceanShipmentBoardItem,
  OceanLegRecord,
  ContainerOceanStatus,
  BLWorkflowRecord,
  CarrierFinanceLink,
  VoyageRecord,
} from '@/lib/types/ocean-vessel'

interface OceanShipmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  shipment: OceanShipmentBoardItem
  legs: OceanLegRecord[]
  containers: ContainerOceanStatus[]
  blWorkflow?: BLWorkflowRecord
  financeLink?: CarrierFinanceLink
  currentVoyage?: VoyageRecord
  onOpenLegModal: () => void
  onOpenContainerEventModal: () => void
  onOpenRolloverModal: () => void
  onOpenBLWorkflowModal: () => void
  onOpenPrintSheet: () => void
  onCopyWhatsApp: () => void
}

type DetailTab =
  | 'overview'
  | 'legs'
  | 'containers'
  | 'schedule'
  | 'bl'
  | 'finance'
  | 'tracking'
  | 'history'

export function OceanShipmentDetailModal({
  isOpen,
  onClose,
  shipment,
  legs,
  containers,
  blWorkflow,
  financeLink,
  currentVoyage,
  onOpenLegModal,
  onOpenContainerEventModal,
  onOpenRolloverModal,
  onOpenBLWorkflowModal,
  onOpenPrintSheet,
  onCopyWhatsApp,
}: OceanShipmentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  if (!isOpen) return null

  const filteredLegs = legs.filter((l) => l.bookingNumber === shipment.bookingNumber)
  const filteredContainers = containers.filter(
    (c) => c.bookingNumber === shipment.bookingNumber || shipment.containerNumbers.includes(c.containerNumber)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-2xs">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 font-mono">{shipment.bolNumber}</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {shipment.oceanStatus}
                </span>
                {shipment.isRolledOver && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    ROLLED OVER
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Booking: <span className="text-slate-800 font-mono font-semibold">{shipment.bookingNumber}</span> | Carrier:{' '}
                <span className="text-slate-800 font-semibold">{shipment.carrierName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCopyWhatsApp}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Alert
            </button>
            <button
              onClick={onOpenPrintSheet}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Sheet
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Ship className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('legs')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'legs'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Ocean Legs ({filteredLegs.length})
          </button>
          <button
            onClick={() => setActiveTab('containers')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'containers'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Containers ({filteredContainers.length})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Schedule History
          </button>
          <button
            onClick={() => setActiveTab('bl')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'bl'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> BL & Documents
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'finance'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Finance & Payment
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-3 py-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'tracking'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Tracking Timeline
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {shipment.attentionReason && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong>Attention:</strong> {shipment.attentionReason}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl shadow-2xs">
                  <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Customer / Consignee</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{shipment.customerName}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Direct Account Client</div>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl shadow-2xs">
                  <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Active Vessel & Voyage</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {shipment.currentVesselName} (Voy: {shipment.currentVoyageNumber})
                  </div>
                  <div className="text-[11px] text-blue-700 font-semibold mt-1">
                    Leg {shipment.currentLegNumber} of {shipment.totalLegs}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl shadow-2xs">
                  <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Port Routing</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {shipment.pol} → {shipment.pod}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    ETA: {new Date(shipment.eta).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              {/* Status Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Bill of Lading Status</span>
                  <div className="text-sm font-bold text-emerald-700 mt-1">
                    {shipment.blStatus.replace(/_/g, ' ')}
                  </div>
                  <button
                    onClick={onOpenBLWorkflowModal}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                  >
                    Open BL Workflow →
                  </button>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Carrier Payment Status</span>
                  <div
                    className={`text-sm font-bold mt-1 ${
                      shipment.freightPaymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {shipment.freightPaymentStatus.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    {financeLink ? `Invoice: ${financeLink.invoiceNumber || 'Pending'}` : 'Not Invoiced'}
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Quick Actions</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={onOpenContainerEventModal}
                      className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-lg text-xs font-semibold border border-cyan-200 shadow-2xs transition"
                    >
                      + Container Event
                    </button>
                    <button
                      onClick={onOpenRolloverModal}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-semibold border border-rose-200 shadow-2xs transition"
                    >
                      Record Rollover
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OCEAN LEGS */}
          {activeTab === 'legs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Multi-Leg Ocean Transport ({filteredLegs.length} Legs)
                </span>
                <button
                  onClick={onOpenLegModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  + Add Ocean Leg
                </button>
              </div>

              <div className="space-y-2">
                {filteredLegs.map((leg) => (
                  <div
                    key={leg.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                          {leg.legNumber}
                        </span>
                        <span className="font-bold text-slate-900">{leg.legLabel}</span>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-200/80 text-slate-700">
                          {leg.status}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 font-semibold">
                        {leg.polName} → {leg.podName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block font-medium">Vessel:</span>
                        <span className="text-slate-900 font-semibold">{leg.vesselName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-medium">Voyage:</span>
                        <span className="text-slate-900 font-mono font-semibold">{leg.voyageNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-medium">ETD / Actual Dep:</span>
                        <span className="text-slate-800">
                          {new Date(leg.etd).toLocaleDateString('en-GB')}
                          {leg.actualDeparture && ` (${new Date(leg.actualDeparture).toLocaleDateString('en-GB')})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-medium">ETA / Actual Arr:</span>
                        <span className="text-slate-800">
                          {new Date(leg.eta).toLocaleDateString('en-GB')}
                          {leg.actualArrival && ` (${new Date(leg.actualArrival).toLocaleDateString('en-GB')})`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CONTAINERS */}
          {activeTab === 'containers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Allocated Containers & Ocean Physical Status
                </span>
                <button
                  onClick={onOpenContainerEventModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  + Record Container Event
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {filteredContainers.map((ctr) => (
                  <div key={ctr.containerNumber} className="p-3.5 bg-white flex items-center justify-between hover:bg-slate-50/50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{ctr.containerNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ctr.isLoadConfirmed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {ctr.isLoadConfirmed ? 'LOAD CONFIRMED' : 'LOAD NOT CONFIRMED'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {ctr.stage}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Vessel: <strong className="text-slate-700">{ctr.currentVesselName}</strong></span>
                        <span>Seals: <strong className="text-slate-700">{ctr.sealNumbers.join(', ') || 'N/A'}</strong></span>
                        {ctr.vgmWeightKg && <span>VGM: <strong className="text-slate-700">{ctr.vgmWeightKg.toLocaleString()} KG</strong></span>}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-500 block font-medium">Last Updated:</span>
                      <span className="text-slate-800 font-semibold">
                        {new Date(ctr.lastEventDate).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SCHEDULE & HISTORY */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Voyage Schedule Revisions & Audit Log
              </span>
              {currentVoyage?.scheduleHistory && currentVoyage.scheduleHistory.length > 0 ? (
                <div className="space-y-2">
                  {currentVoyage.scheduleHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold text-amber-800">
                          ETA changed from {item.previousEta ? new Date(item.previousEta).toLocaleDateString('en-GB') : 'Initial'} to{' '}
                          {new Date(item.newEta).toLocaleDateString('en-GB')}
                        </span>
                        <span className="text-slate-500">
                          {new Date(item.changeTimestamp).toLocaleString('en-GB')}
                        </span>
                      </div>
                      <div className="text-slate-700"><strong>Reason:</strong> {item.reason || 'Operational update'}</div>
                      <div className="text-slate-500 text-[11px]">
                        Recorded by: {item.changedBy} | Source: {item.source}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-dashed border-slate-200">
                  No schedule revisions recorded. Operating on initial published rotation schedule.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BL & DOCUMENTS */}
          {activeTab === 'bl' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ocean Bill of Lading & Document Integration
                </span>
                <button
                  onClick={onOpenBLWorkflowModal}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                >
                  Manage BL Workflow →
                </button>
              </div>

              {blWorkflow ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Final BL: {blWorkflow.blNumber || 'Draft Pending'}
                      </span>
                      <span className="text-slate-600 font-mono font-semibold">{blWorkflow.blType}</span>
                    </div>
                    <div className="text-slate-600">
                      Shipping Instructions: <span className="text-emerald-700 font-semibold">{blWorkflow.siStatus}</span> | Draft Versions:{' '}
                      <span className="text-slate-900 font-bold">{blWorkflow.draftVersions.length}</span>
                    </div>
                    {blWorkflow.isSwitchBl && (
                      <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 font-medium">
                        <strong>Switch BL Active:</strong> {blWorkflow.switchBlNumber} (Original:{' '}
                        {blWorkflow.originalBlNumber})
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-dashed border-slate-200">
                  No BL workflow initiated for this booking yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINANCE & PAYMENT */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Carrier Freight Invoices & Release Blockers (Finance Integration)
              </span>

              {financeLink ? (
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      Invoice: {financeLink.invoiceNumber || 'Pending From Carrier'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        financeLink.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {financeLink.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500 block font-medium">Carrier:</span>
                      <span className="text-slate-900 font-semibold">{financeLink.carrierName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-medium">Total Freight Due:</span>
                      <span className="text-slate-900 font-bold text-sm">
                        ${financeLink.amount.toLocaleString()} {financeLink.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-medium">Due Date:</span>
                      <span className="text-slate-800 font-semibold">
                        {financeLink.dueDate ? new Date(financeLink.dueDate).toLocaleDateString('en-GB') : 'TBA'}
                      </span>
                    </div>
                  </div>

                  {financeLink.requiresPaymentForBlRelease && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                      <strong>Operational Policy:</strong> Carrier release requires full invoice settlement before
                      original or surrender BL release is authorized.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-dashed border-slate-200">
                  No carrier freight invoice linked from Finance Center.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TRACKING TIMELINE */}
          {activeTab === 'tracking' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Physical Ocean Movement Timeline (Verified Milestones Only)
              </span>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                <div className="relative">
                  <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <div className="font-bold text-slate-900">Gate-In Terminal</div>
                  <div className="text-slate-500 text-[11px]">Shahid Rajaee Terminal 2 (Bandar Abbas)</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <div className="font-bold text-slate-900">Loaded on Feeder Vessel</div>
                  <div className="text-slate-500 text-[11px]">CMA CGM NEVA (Voy: 2604W)</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div className="font-bold text-slate-900">Vessel Departed Origin Port</div>
                  <div className="text-slate-500 text-[11px]">
                    {shipment.actualDeparture
                      ? `Departed ${new Date(shipment.actualDeparture).toLocaleString('en-GB')}`
                      : 'Planned Departure'}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />
                  <div className="font-semibold text-slate-600">Transshipment Discharge (Jebel Ali)</div>
                  <div className="text-slate-400 text-[11px]">Scheduled Arrival: {new Date(shipment.eta).toLocaleDateString('en-GB')}</div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />
                  <div className="font-semibold text-slate-600">Destination Discharge & DO Release</div>
                  <div className="text-slate-400 text-[11px]">Nhava Sheva (JNPT)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Sky Ariana Limited — Ocean Freight Operations Control Tower
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
