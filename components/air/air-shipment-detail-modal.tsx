'use client'

import React, { useState } from 'react'
import {
  X,
  Plane,
  FileText,
  ShieldCheck,
  Scale,
  Clock,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Copy,
  Printer,
  ChevronRight,
  GitCommit,
  Truck,
  Building,
} from 'lucide-react'
import {
  AirBookingRecord,
  FlightRecord,
  AirLegRecord,
  MAWBRecord,
  HAWBRecord,
  CargoAcceptanceRecord,
  AirReleaseTracker,
  AirlineFinanceLink,
  OffloadRecord,
} from '@/lib/types/air-freight'
import { airFreightStore } from '@/lib/services/air-freight-service'

interface AirShipmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  booking: AirBookingRecord
  onEditBooking?: (booking: AirBookingRecord) => void
  onOpenAcceptance?: () => void
  onOpenAwb?: () => void
  onOpenRelease?: () => void
  onOpenOffload?: () => void
  onOpenPrint?: () => void
}

export function AirShipmentDetailModal({
  isOpen,
  onClose,
  booking,
  onEditBooking,
  onOpenAcceptance,
  onOpenAwb,
  onOpenRelease,
  onOpenOffload,
  onOpenPrint,
}: AirShipmentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    | 'OVERVIEW'
    | 'VOLUMETRIC'
    | 'LEGS'
    | 'ACCEPTANCE'
    | 'AWB'
    | 'RELEASE'
    | 'FINANCE'
    | 'WHATSAPP'
  >('OVERVIEW')

  const [copied, setCopied] = useState(false)
  const [waLanguage, setWaLanguage] = useState<'EN' | 'FA_PS' | 'BILINGUAL'>('BILINGUAL')

  if (!isOpen) return null

  // Fetch linked records
  const legs = airFreightStore.getLegs().filter((l) => l.bookingId === booking.id)
  const mawb = airFreightStore.getMawbs().find((m) => m.bookingId === booking.id || (booking.mawbNumber && m.mawbNumber === booking.mawbNumber))
  const hawbs = airFreightStore.getHawbs().filter((h) => h.bookingId === booking.id || (mawb && h.mawbNumber === mawb.mawbNumber))
  const acceptance = airFreightStore.getAcceptances().find((a) => a.bookingId === booking.id)
  const release = airFreightStore.getReleases().find((r) => r.bookingId === booking.id)
  const finance = airFreightStore.getFinanceLinks().find((f) => f.bookingId === booking.id)
  const offload = airFreightStore.getOffloads().find((o) => o.bookingId === booking.id)

  const whatsAppText = airFreightStore.generateCustomerWhatsAppUpdate(booking.id, waLanguage)

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsAppText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {booking.bookingReference}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {booking.status.replace(/_/g, ' ')}
                </span>
                {offload && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    OFFLOAD LOGGED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {booking.airlineName} • {booking.originAirportIata} ✈️ {booking.destinationAirportIata} •{' '}
                {booking.commodity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrint && (
              <button
                type="button"
                onClick={onOpenPrint}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
                title="Print Official A4 Sheet"
              >
                <Printer className="w-4 h-4 text-sky-400" /> Print
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: '1. Overview' },
            { id: 'VOLUMETRIC', label: '2. Volumetric Weight' },
            { id: 'LEGS', label: `3. Flight Legs (${legs.length})` },
            { id: 'ACCEPTANCE', label: '4. Acceptance & Security' },
            { id: 'AWB', label: '5. MAWB / HAWB' },
            { id: 'RELEASE', label: '6. 3-Way Release' },
            { id: 'FINANCE', label: '7. Carrier Finance' },
            { id: 'WHATSAPP', label: '8. Customer WhatsApp' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">Airline & Route</span>
                  <div className="text-sm font-bold text-white mb-1">{booking.airlineName}</div>
                  <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                    <span>{booking.originAirportIata}</span>
                    <span>➡️</span>
                    <span>{booking.destinationAirportIata}</span>
                    <span className="text-slate-400 text-[10px]">({booking.serviceType})</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">Packages & Weight</span>
                  <div className="text-sm font-bold text-white mb-1">
                    {booking.packagesCount} {booking.packagingType}
                  </div>
                  <div className="text-xs text-slate-300">
                    Gross: <span className="font-mono text-white font-bold">{booking.grossWeightKg} kg</span> | Chargeable:{' '}
                    <span className="font-mono text-emerald-400 font-bold">{booking.chargeableWeightKg} kg</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">Waybill Identifiers</span>
                  <div className="text-sm font-bold text-sky-300 font-mono mb-1">
                    MAWB: {booking.mawbNumber || 'Awaiting Issuance'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    BOL Ref: {booking.bolNumber || 'Direct Air Shipment'}
                  </div>
                </div>
              </div>

              {/* Shippers & Consignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                    Shipper / Exporter
                  </span>
                  <p className="text-sm font-medium text-white">{booking.shipper}</p>
                </div>
                <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                    Consignee / Importer
                  </span>
                  <p className="text-sm font-medium text-white">{booking.consignee}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3 pt-2">
                {onEditBooking && (
                  <button
                    type="button"
                    onClick={() => onEditBooking(booking)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Edit Booking Data
                  </button>
                )}
                {onOpenAcceptance && (
                  <button
                    type="button"
                    onClick={onOpenAcceptance}
                    className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Manage Cargo Acceptance
                  </button>
                )}
                {onOpenAwb && (
                  <button
                    type="button"
                    onClick={onOpenAwb}
                    className="px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Manage AWB & Drafts
                  </button>
                )}
                {onOpenRelease && (
                  <button
                    type="button"
                    onClick={onOpenRelease}
                    className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    3-Way Release
                  </button>
                )}
                {onOpenOffload && (
                  <button
                    type="button"
                    onClick={onOpenOffload}
                    className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Log Offload / Exception
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VOLUMETRIC */}
          {activeTab === 'VOLUMETRIC' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Scale Gross Weight</span>
                  <span className="text-xl font-bold text-white font-mono">{booking.grossWeightKg} Kg</span>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Volumetric Weight (Divisor: {booking.volumetricDivisor})</span>
                  <span className="text-xl font-bold text-amber-400 font-mono">
                    {booking.volumetricWeightKg} Kg
                  </span>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <span className="text-xs text-emerald-400 font-semibold block mb-1">Chargeable Weight Applied</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">
                    {booking.chargeableWeightKg} Kg
                  </span>
                </div>
              </div>

              {/* Dimensions list */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Piece Dimensions Breakdown
                </h3>
                {booking.dimensions && booking.dimensions.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {booking.dimensions.map((dim, idx) => (
                      <div key={dim.id || idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          {dim.quantity} piece(s) × {dim.lengthCm} × {dim.widthCm} × {dim.heightCm} cm
                        </span>
                        <span className="font-mono text-slate-400">
                          {((dim.lengthCm * dim.widthCm * dim.heightCm * dim.quantity) / 1000000).toFixed(4)} CBM
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No individual piece dimension lines saved.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FLIGHT LEGS */}
          {activeTab === 'LEGS' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Connecting multi-leg transit segments and flight milestones:
              </div>
              <div className="space-y-3">
                {legs.length > 0 ? (
                  legs.map((leg) => (
                    <div
                      key={leg.id}
                      className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{leg.flightNumber}</span>
                          <span className="text-xs text-slate-400">({leg.airlineName})</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {leg.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                          <span>{leg.originAirportIata}</span>
                          <span>✈️</span>
                          <span>{leg.destinationAirportIata}</span>
                        </div>
                      </div>

                      <div className="text-right text-xs space-y-1">
                        <div className="text-slate-400">
                          ETD: <span className="font-mono text-white">{leg.scheduledDeparture}</span>
                        </div>
                        <div className="text-slate-400">
                          ETA: <span className="font-mono text-white">{leg.scheduledArrival}</span>
                        </div>
                        {leg.actualDeparture && (
                          <div className="text-emerald-400 font-mono text-[11px]">
                            ATD: {leg.actualDeparture}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No flight legs assigned yet. Assign primary or connecting flights.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ACCEPTANCE & SECURITY */}
          {activeTab === 'ACCEPTANCE' && (
            <div className="space-y-4">
              {acceptance ? (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block mb-1">Terminal Facility</span>
                      <span className="font-semibold text-white">{acceptance.terminalName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Terminal Receipt #</span>
                      <span className="font-mono text-sky-400 font-semibold">
                        {acceptance.terminalReceiptNumber || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-slate-400 block mb-1">Delivered Truck / Driver</span>
                      <span className="text-slate-200">
                        {acceptance.deliveringDriverName || 'N/A'} ({acceptance.deliveringTruckPlate || 'No Plate'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Packages Received</span>
                      <span className="font-bold text-white">{acceptance.packagesReceived} pcs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Verified Scale Weight</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {acceptance.grossWeightReceivedKg} kg
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Security Screening Status</span>
                      <span className="font-bold text-emerald-400">{acceptance.securityStatus}</span>
                      <span className="text-slate-300 ml-2">({acceptance.screeningNotes})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">By: {acceptance.recordedBy}</span>
                  </div>

                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-cyan-400 block font-semibold">Airline Acceptance</span>
                      <span className="font-bold text-white">{acceptance.airlineAcceptanceStatus}</span>
                      {acceptance.airlineAcceptanceRef && (
                        <span className="text-cyan-300 font-mono ml-2">
                          Ref: {acceptance.airlineAcceptanceRef}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{acceptance.airlineAcceptanceDate}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Cargo acceptance record not created yet. Deliver cargo to terminal and perform screening.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AWB */}
          {activeTab === 'AWB' && (
            <div className="space-y-4">
              {mawb ? (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Master Air Waybill (MAWB)</span>
                      <span className="text-base font-bold text-sky-400 font-mono">{mawb.mawbNumber}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {mawb.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block mb-1">Airline Carrier</span>
                      <span className="text-white font-medium">{mawb.airlineName} (Prefix {mawb.awbPrefix})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Current Draft Version</span>
                      <span className="text-white font-mono font-bold">Version {mawb.currentDraftVersion}</span>
                    </div>
                  </div>

                  {hawbs.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-xs font-semibold text-slate-300 block mb-2">
                        Associated House AWBs (HAWB)
                      </span>
                      {hawbs.map((h) => (
                        <div
                          key={h.id}
                          className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <span className="font-mono text-sky-300 font-bold">{h.hawbNumber}</span>
                          <span className="text-slate-400">{h.commodity}</span>
                          <span className="font-mono text-emerald-400">{h.chargeableWeightKg} kg</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Master Air Waybill not created yet. Use the AWB Workflow modal to issue.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: RELEASE */}
          {activeTab === 'RELEASE' && (
            <div className="space-y-4">
              {release ? (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div
                    className={`p-3 rounded-lg border flex items-center gap-2 ${
                      release.cargoAvailableForPickup
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-semibold'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    }`}
                  >
                    {release.cargoAvailableForPickup ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>
                      {release.cargoAvailableForPickup
                        ? 'Cargo is 100% Cleared for Physical Handover to Consignee.'
                        : 'Physical delivery is blocked. All 3 gates must be cleared.'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[11px] mb-1">Airline Release</span>
                      <span className={release.airlineRelease ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {release.airlineRelease ? 'GRANTED' : 'PENDING'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[11px] mb-1">Customs Release</span>
                      <span className={release.customsRelease ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {release.customsRelease ? 'CLEARED' : 'PENDING'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[11px] mb-1">Terminal Release</span>
                      <span className={release.terminalRelease ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {release.terminalRelease ? 'SETTLED' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {release.releaseBlocked && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300">
                      <strong>Financial / Operational Hold Active:</strong> {release.releaseBlockReason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">Release tracker initializing...</div>
              )}
            </div>
          )}

          {/* TAB 7: FINANCE */}
          {activeTab === 'FINANCE' && (
            <div className="space-y-4">
              {finance ? (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Carrier Freight Invoice</span>
                      <span className="font-mono text-white font-bold">{finance.invoiceNumber || 'Pending Invoice'}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {finance.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block mb-1">Total Airline Payable</span>
                      <span className="text-base font-bold text-white font-mono">
                        ${finance.amount.toLocaleString()} {finance.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Paid Amount</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        ${finance.paidAmount.toLocaleString()} {finance.currency}
                      </span>
                    </div>
                  </div>

                  {finance.notes && (
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-300">
                      {finance.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No airline finance invoice linked yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 8: WHATSAPP */}
          {activeTab === 'WHATSAPP' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Customer-Safe Bilingual Notification Generator
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={waLanguage}
                    onChange={(e) => setWaLanguage(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                  >
                    <option value="BILINGUAL">Bilingual (English + Dari/Pashto)</option>
                    <option value="EN">English Only</option>
                    <option value="FA_PS">Dari / Pashto Only</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy Update'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {whatsAppText}
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <strong>Data Privacy Guarantee:</strong> Airline buy rates, internal agent profit margins,
                security officer names, and internal notes are automatically scrubbed from customer messages.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <span className="text-xs text-slate-500">
            Air Freight Center • Sky Ariana Limited
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
