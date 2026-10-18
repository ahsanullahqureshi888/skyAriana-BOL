'use client'

import React, { useState, useMemo } from 'react'
import {
  Ship,
  Layers,
  Box,
  Calendar,
  FileText,
  DollarSign,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Upload,
  RefreshCw,
  Eye,
  ArrowRight,
  ChevronRight,
  Anchor,
  Send,
} from 'lucide-react'
import {
  OceanShipmentBoardItem,
  VesselRecord,
  VoyageRecord,
  OceanLegRecord,
  ContainerOceanStatus,
  BLWorkflowRecord,
  CarrierFinanceLink,
  TransshipmentConnection,
  RolloverRecord,
  OceanSummaryKpi,
  ScheduleSource,
  BLDocType,
  BLReleaseStatus,
  ContainerOceanStage,
} from '@/lib/types/ocean-vessel'
import { OceanVesselStore } from '@/lib/services/ocean-vessel-service'
import { VesselModal } from './vessel-modal'
import { VoyageModal } from './voyage-modal'
import { OceanLegModal } from './ocean-leg-modal'
import { ContainerOceanEventModal } from './container-ocean-event-modal'
import { RolloverModal } from './rollover-modal'
import { ScheduleUpdateModal } from './schedule-update-modal'
import { BLWorkflowModal } from './bl-workflow-modal'
import { OceanShipmentDetailModal } from './ocean-shipment-detail-modal'
import { OceanOperationsReportPdf } from './documents/ocean-operations-report-pdf'
import { OceanShipmentSheetPdf } from './documents/ocean-shipment-sheet-pdf'

export function OceanOperationsCenter() {
  const store = OceanVesselStore.getInstance()

  // State
  const [activeTab, setActiveTab] = useState<
    'board' | 'voyages' | 'transshipment' | 'rollovers' | 'bl' | 'calendar' | 'carriers' | 'import'
  >('board')

  const [searchQuery, setSearchQuery] = useState('')
  const [carrierFilter, setCarrierFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals state
  const [isVesselModalOpen, setIsVesselModalOpen] = useState(false)
  const [isVoyageModalOpen, setIsVoyageModalOpen] = useState(false)
  const [isLegModalOpen, setIsLegModalOpen] = useState(false)
  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false)
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isBLModalOpen, setIsBLModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false)
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false)

  // Active selected item
  const [selectedShipment, setSelectedShipment] = useState<OceanShipmentBoardItem | null>(null)
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageRecord | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<BLWorkflowRecord | null>(null)
  const [csvInput, setCsvInput] = useState('')
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Reactive data fetches
  const kpi = store.getSummaryKpis()
  const shipments = store.getShipmentBoard()
  const vessels = store.getVessels()
  const voyages = store.getVoyages()
  const legs = store.getOceanLegs()
  const transshipments = store.getTransshipmentConnections()
  const rollovers = store.getRollovers()
  const workflows = store.getBLWorkflows()
  const financeLinks = store.getFinanceLinks()

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.bolNumber.toLowerCase().includes(q) ||
        s.bookingNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.carrierName.toLowerCase().includes(q) ||
        s.currentVesselName.toLowerCase().includes(q) ||
        s.currentVoyageNumber.toLowerCase().includes(q) ||
        s.containerNumbers.some((c) => c.toLowerCase().includes(q))

      const matchesCarrier = carrierFilter === 'ALL' || s.carrierName.includes(carrierFilter)
      const matchesStatus = statusFilter === 'ALL' || s.oceanStatus === statusFilter

      return matchesSearch && matchesCarrier && matchesStatus
    })
  }, [shipments, searchQuery, carrierFilter, statusFilter])

  // Handlers
  const handleCopyWhatsApp = (bol: string) => {
    const text = store.generateCustomerSafeWhatsAppMessage(bol, 'VESSEL_DEPARTED')
    navigator.clipboard.writeText(text)
    showToast('Customer-safe WhatsApp notification copied to clipboard!')
  }

  const handleParseCsv = () => {
    if (!csvInput.trim()) return
    const parsed = store.parseScheduleCsv(csvInput)
    setImportPreview(parsed)
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-2xs">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  SHIPPING LINE, VESSEL & OCEAN OPERATIONS
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  SEA FREIGHT CONTROL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Carriers • Vessels • Voyages • Ocean Legs • Transshipment • BL • Releases
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintReportOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Operations Report
            </button>
            <button
              onClick={() => setIsVesselModalOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" /> Register Vessel
            </button>
            <button
              onClick={() => setIsVoyageModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> Create Voyage
            </button>
          </div>
        </div>
      </header>

      {/* 13 KPI Summary Cards */}
      <section className="px-6 py-4 border-b border-slate-200 bg-white/60 overflow-x-auto">
        <div className="grid grid-cols-7 lg:grid-cols-13 gap-2 min-w-[1200px]">
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Active Sea</span>
            <span className="text-base font-extrabold text-slate-900">{kpi.activeOceanShipments}</span>
          </div>
          <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-amber-700 uppercase font-bold tracking-wider block">Bkg Pending</span>
            <span className="text-base font-extrabold text-amber-800">{kpi.bookingPending}</span>
          </div>
          <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider block">Wait Vessel</span>
            <span className="text-base font-extrabold text-blue-800">{kpi.awaitingVessel}</span>
          </div>
          <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider block">Gate-In OK</span>
            <span className="text-base font-extrabold text-emerald-800">{kpi.gateInComplete}</span>
          </div>
          <div className="p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-indigo-700 uppercase font-bold tracking-wider block">Wait Load</span>
            <span className="text-base font-extrabold text-indigo-800">{kpi.waitingLoading}</span>
          </div>
          <div className="p-2.5 bg-cyan-50/50 border border-cyan-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-cyan-700 uppercase font-bold tracking-wider block">On Vessel</span>
            <span className="text-base font-extrabold text-cyan-800">{kpi.onVessel}</span>
          </div>
          <div className="p-2.5 bg-purple-50/50 border border-purple-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-purple-700 uppercase font-bold tracking-wider block">Transshipment</span>
            <span className="text-base font-extrabold text-purple-800">{kpi.atTransshipment}</span>
          </div>
          <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-rose-700 uppercase font-bold tracking-wider block">Rolled Over</span>
            <span className="text-base font-extrabold text-rose-800">{kpi.rolledOver}</span>
          </div>
          <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-amber-700 uppercase font-bold tracking-wider block">Arriving Soon</span>
            <span className="text-base font-extrabold text-amber-800">{kpi.arrivingSoon}</span>
          </div>
          <div className="p-2.5 bg-teal-50/50 border border-teal-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-teal-700 uppercase font-bold tracking-wider block">Discharged</span>
            <span className="text-base font-extrabold text-teal-800">{kpi.discharged}</span>
          </div>
          <div className="p-2.5 bg-orange-50/50 border border-orange-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-orange-700 uppercase font-bold tracking-wider block">BL Pending</span>
            <span className="text-base font-extrabold text-orange-800">{kpi.blPending}</span>
          </div>
          <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-rose-700 uppercase font-bold tracking-wider block">Payment Pend</span>
            <span className="text-base font-extrabold text-rose-800">{kpi.freightPaymentPending}</span>
          </div>
          <div className="p-2.5 bg-sky-50/50 border border-sky-200 rounded-lg shadow-2xs">
            <span className="text-[10px] text-sky-700 uppercase font-bold tracking-wider block">Release Pend</span>
            <span className="text-base font-extrabold text-sky-800">{kpi.releasePending}</span>
          </div>
        </div>
      </section>

      {/* Tabs and Search Controls */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'board'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Ship className="w-3.5 h-3.5" /> Ocean Shipments
          </button>
          <button
            onClick={() => setActiveTab('voyages')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'voyages'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" /> Voyages & Port Calls
          </button>
          <button
            onClick={() => setActiveTab('transshipment')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'transshipment'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Transshipment Hub
          </button>
          <button
            onClick={() => setActiveTab('rollovers')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'rollovers'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Rollovers & Exceptions
          </button>
          <button
            onClick={() => setActiveTab('bl')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'bl'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> BL & Releases
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'calendar'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Schedule Calendar
          </button>
          <button
            onClick={() => setActiveTab('carriers')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'carriers'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Shipping Lines & Fleet
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'import'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Schedule Import
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BOL, container, vessel, voyage..."
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 w-64 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-medium"
          >
            <option value="ALL">All Carriers</option>
            <option value="MSC">MSC</option>
            <option value="Maersk">Maersk</option>
            <option value="CMA CGM">CMA CGM</option>
            <option value="HDASCO">HDASCO / IRISL</option>
          </select>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* VIEW 1: OCEAN SHIPMENT BOARD */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">BOL Reference</th>
                    <th className="p-3.5">Customer / Booking</th>
                    <th className="p-3.5">Current Leg & Vessel</th>
                    <th className="p-3.5">Route (POL → POD)</th>
                    <th className="p-3.5">ETD / ETA</th>
                    <th className="p-3.5 text-center">Containers</th>
                    <th className="p-3.5">BL Status</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-blue-700">{s.bolNumber}</div>
                        {s.attentionReason && (
                          <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                            {s.attentionReason}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{s.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{s.bookingNumber}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{s.currentVesselName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Voy: {s.currentVoyageNumber} • Leg {s.currentLegNumber}/{s.totalLegs}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 font-medium">{s.pol}</div>
                        <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                          → {s.pod}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 font-medium">
                          ETD: {new Date(s.etd).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          ETA: {new Date(s.eta).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-slate-800">
                          {s.containerNumbers.length}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {s.containerNumbers[0] || ''}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {s.blStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            s.freightPaymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {s.freightPaymentStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedShipment(s)
                            const wf = workflows.find((w) => w.bookingNumber === s.bookingNumber)
                            setSelectedWorkflow(wf || null)
                            setIsDetailModalOpen(true)
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition border border-slate-200 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: VOYAGES & PORT CALLS */}
        {activeTab === 'voyages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active Voyages & Maritime Rotations ({voyages.length} Voyages)
              </span>
              <button
                onClick={() => setIsVoyageModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> Create New Voyage
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {voyages.map((v) => (
                <div
                  key={v.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{v.vesselNameSnapshot}</h3>
                      <p className="text-xs text-slate-500 font-mono">
                        Voyage: {v.voyageNumber} • {v.carrierName}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {v.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">Rotation:</span>
                      <span className="font-semibold text-slate-900">
                        {v.originPortName} → {v.destinationPortName}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">Planned ETD / ETA:</span>
                      <span>
                        {new Date(v.plannedEtd).toLocaleDateString('en-GB')} →{' '}
                        {new Date(v.plannedEta).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    {v.actualDeparture && (
                      <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                        <span>Actual Departure:</span>
                        <span>{new Date(v.actualDeparture).toLocaleString('en-GB')}</span>
                      </div>
                    )}
                  </div>

                  {/* Port Calls List */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Port Calls:</span>
                    {v.portCalls.map((pc, idx) => (
                      <div
                        key={pc.id}
                        className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded"
                      >
                        <span className="text-slate-800 font-medium">
                          {idx + 1}. {pc.portName}
                        </span>
                        <span className="text-slate-500 font-medium">{pc.status}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => {
                        setSelectedVoyage(v)
                        setIsScheduleModalOpen(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold transition"
                    >
                      Update Schedule & History →
                    </button>
                    <span className="text-[10px] text-slate-400">Source: {v.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: TRANSSHIPMENT HUB */}
        {activeTab === 'transshipment' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 shadow-2xs">
              <strong>Transshipment Invariance:</strong> Hub dwell time is calculated from container discharge date
              to outgoing mother vessel departure. Connection risk alerts trigger if next ETD is too tight.
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {transshipments.map((ts) => (
                <div key={ts.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{ts.transshipmentPortName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {ts.connectionStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-3">
                      <span>
                        Inbound Feeder: <strong className="text-slate-900">{ts.incomingVesselName}</strong> (Voy: {ts.incomingVoyageNumber})
                      </span>
                      <span className="text-slate-400">→</span>
                      <span>
                        Outbound Mother: <strong className="text-slate-900">{ts.outgoingVesselName || 'Pending'}</strong>
                      </span>
                    </div>
                    {ts.connectionRiskAlert && (
                      <div className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        {ts.connectionRiskAlert}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-500 block font-medium">Dwell Time:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {ts.dwellHours !== undefined ? `${ts.dwellHours} Hours` : 'In Transit'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: ROLLOVERS & EXCEPTIONS */}
        {activeTab === 'rollovers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Container Rollover Audit Records ({rollovers.length})
              </span>
              <button
                onClick={() => setIsRolloverModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> Record Rollover
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {rollovers.map((r) => (
                <div key={r.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <span>{r.containerNumber}</span>
                      <span className="text-slate-500">({r.bookingNumber})</span>
                    </div>
                    <span className="text-slate-500 text-xs">
                      Rolled on: {new Date(r.rolloverDate).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Shut Out From:</span>
                      <span className="text-rose-700 font-semibold">
                        {r.originalVesselName} (Voy: {r.originalVoyageNumber})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Reassigned To:</span>
                      <span className="text-emerald-700 font-semibold">
                        {r.newVesselName} (Voy: {r.newVoyageNumber})
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>Reason:</strong> {r.reason} (Recorded by: {r.recordedBy})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: BL & RELEASES */}
        {activeTab === 'bl' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Booking / BOL</th>
                    <th className="p-3.5">Shipping Line</th>
                    <th className="p-3.5">Final BL Number</th>
                    <th className="p-3.5">BL Type</th>
                    <th className="p-3.5">SI Status</th>
                    <th className="p-3.5">Draft Versions</th>
                    <th className="p-3.5">Release Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-blue-700">{wf.bolNumber}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{wf.bookingNumber}</div>
                      </td>
                      <td className="p-3.5 text-slate-800 font-medium">{wf.carrierName}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-700">{wf.blNumber || 'Pending'}</td>
                      <td className="p-3.5 font-mono text-slate-700">{wf.blType}</td>
                      <td className="p-3.5">
                        <span className="text-emerald-700 font-semibold">{wf.siStatus}</span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        v{wf.currentDraftVersion} ({wf.draftVersions.length} versions)
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {wf.releaseStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedWorkflow(wf)
                            setIsBLModalOpen(true)
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          Manage BL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 6: SCHEDULE CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Upcoming Ocean Departures & Arrivals
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Upcoming Departures (Origin Ports)
                </span>
                <div className="space-y-2 text-xs">
                  {voyages.map((v) => (
                    <div key={v.id} className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80 flex justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{v.vesselNameSnapshot} (Voy: {v.voyageNumber})</div>
                        <div className="text-[11px] text-slate-500">{v.originPortName}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-700 font-bold">{new Date(v.plannedEtd).toLocaleDateString('en-GB')}</span>
                        <div className="text-[10px] text-slate-500 font-medium">{v.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                  Upcoming Arrivals (Destination Ports)
                </span>
                <div className="space-y-2 text-xs">
                  {voyages.map((v) => (
                    <div key={v.id} className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80 flex justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{v.vesselNameSnapshot} (Voy: {v.voyageNumber})</div>
                        <div className="text-[11px] text-slate-500">{v.destinationPortName}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-700 font-bold">{new Date(v.plannedEta).toLocaleDateString('en-GB')}</span>
                        <div className="text-[10px] text-slate-500 font-medium">{v.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: SHIPPING LINES & FLEET */}
        {activeTab === 'carriers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registered Shipping Lines & Maritime Vessels ({vessels.length})
              </span>
              <button
                onClick={() => setIsVesselModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Vessel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vessels.map((v) => (
                <div key={v.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs shadow-2xs hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {v.status}
                    </span>
                  </div>
                  <div className="text-slate-600 font-medium">Carrier: {v.carrierName}</div>
                  <div className="text-slate-500 flex items-center gap-3">
                    <span>IMO: {v.imoNumber || 'Unassigned'}</span>
                    <span>Flag: {v.flag || 'TBA'}</span>
                    {v.teuCapacity && <span>Cap: {v.teuCapacity.toLocaleString()} TEU</span>}
                  </div>
                  {v.notes && <div className="text-slate-600 text-[11px] pt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">{v.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 8: SCHEDULE IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-4 max-w-3xl">
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 shadow-2xs">
              Import revised vessel schedules via CSV format. The preview parser detects duplicates, updates, and new rotations.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Paste Schedule CSV</label>
              <textarea
                rows={5}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="VESSEL,VOYAGE,POL,POD,ETD,ETA,CARRIER&#10;MSC CLAUDIA,613E,Jebel Ali,Nhava Sheva,2026-04-05,2026-04-10,MSC"
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={handleParseCsv}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
              >
                Parse Schedule Preview
              </button>
            </div>

            {importPreview.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs bg-white shadow-2xs">
                {importPreview.map((row, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50/50">
                    <div>
                      <div className="font-bold text-slate-900">
                        {row.vessel} (Voy: {row.voyage})
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {row.pol} → {row.pod} | ETD: {row.etd.split('T')[0]} | ETA: {row.eta.split('T')[0]}
                      </div>
                      {row.notes && <div className="text-amber-700 font-medium text-[11px] mt-0.5">{row.notes}</div>}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        row.status === 'NEW'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : row.status === 'UPDATE'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals Mounting */}
      <VesselModal
        isOpen={isVesselModalOpen}
        onClose={() => setIsVesselModalOpen(false)}
        onSave={(v) => {
          store.saveVessel(v)
          showToast(`Vessel ${v.name} saved successfully!`)
        }}
      />

      <VoyageModal
        isOpen={isVoyageModalOpen}
        onClose={() => setIsVoyageModalOpen(false)}
        onSave={(v) => {
          store.saveVoyage(v)
          showToast(`Voyage ${v.voyageNumber} created successfully!`)
        }}
        vessels={vessels}
      />

      <OceanLegModal
        isOpen={isLegModalOpen}
        onClose={() => setIsLegModalOpen(false)}
        onSave={(leg) => {
          store.saveOceanLeg(leg)
          showToast(`Ocean Leg ${leg.legNumber} assigned successfully!`)
        }}
        vessels={vessels}
        voyages={voyages}
      />

      <ContainerOceanEventModal
        isOpen={isContainerModalOpen}
        onClose={() => setIsContainerModalOpen(false)}
        onSave={(data) => {
          if (data.stage === 'LOADED_ON_VESSEL') {
            store.recordContainerLoad(
              data.bookingId,
              data.containerNumber,
              data.vesselName,
              data.voyageNumber,
              data.port,
              data.date
            )
          } else if (data.stage === 'DISCHARGED') {
            store.recordContainerDischarge(data.bookingId, data.containerNumber, data.port, data.date)
          }
          showToast(`Container ${data.containerNumber} milestone recorded: ${data.stage}`)
        }}
      />

      <RolloverModal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
        onSave={(data) => {
          store.recordRollover(data)
          showToast(`Container ${data.containerNumber} rolled over successfully!`)
        }}
        vessels={vessels}
        voyages={voyages}
      />

      {selectedVoyage && (
        <ScheduleUpdateModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          voyage={selectedVoyage}
          onConfirmUpdate={(voyageId, newEtd, newEta, reason, changedBy, source) => {
            store.updateVoyageSchedule(voyageId, newEtd, newEta, reason, changedBy, source)
            showToast('Voyage schedule and history updated successfully!')
          }}
        />
      )}

      {selectedWorkflow && (
        <BLWorkflowModal
          isOpen={isBLModalOpen}
          onClose={() => setIsBLModalOpen(false)}
          workflow={selectedWorkflow}
          onAddDraftVersion={(notes) => {
            store.addDraftBLVersion(selectedWorkflow.bookingId, notes)
            showToast('New draft BL version registered!')
          }}
          onRequestCorrection={(notes) => {
            store.requestBLCorrection(selectedWorkflow.bookingId, notes)
            showToast('Correction requested from carrier!')
          }}
          onApproveDraft={(approver) => {
            store.approveDraftBL(selectedWorkflow.bookingId, approver)
            showToast('Draft BL approved!')
          }}
          onIssueFinalBL={(blNum, blType) => {
            store.issueFinalBL(selectedWorkflow.bookingId, blNum, blType)
            showToast('Final BL issued!')
          }}
          onCreateSwitchBL={(switchBlNum, loc, reason) => {
            store.createSwitchBL(selectedWorkflow.bookingId, switchBlNum, loc, reason)
            showToast('Switch BL created without overwriting original!')
          }}
          onUpdateReleaseStatus={(status) => {
            const res = store.updateBLReleaseStatus(selectedWorkflow.bookingId, status)
            if (!res.success) {
              showToast(res.error || 'Failed to update release')
            } else {
              showToast(`Release status updated: ${status}`)
            }
          }}
        />
      )}

      {selectedShipment && (
        <OceanShipmentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          shipment={selectedShipment}
          legs={legs}
          containers={store['containers']}
          blWorkflow={selectedWorkflow || undefined}
          financeLink={financeLinks.find((f) => f.bookingId === selectedShipment.bookingNumber)}
          currentVoyage={voyages.find((v) => v.voyageNumber === selectedShipment.currentVoyageNumber)}
          onOpenLegModal={() => setIsLegModalOpen(true)}
          onOpenContainerEventModal={() => setIsContainerModalOpen(true)}
          onOpenRolloverModal={() => setIsRolloverModalOpen(true)}
          onOpenBLWorkflowModal={() => {
            if (selectedWorkflow) setIsBLModalOpen(true)
          }}
          onOpenPrintSheet={() => setIsPrintSheetOpen(true)}
          onCopyWhatsApp={() => handleCopyWhatsApp(selectedShipment.bolNumber)}
        />
      )}

      {/* Print Report Preview Overlay */}
      {isPrintReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl flex justify-between items-center mb-4 text-white">
            <h2 className="text-lg font-bold">Print Preview: Ocean Operations Report</h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
              >
                Print Document
              </button>
              <button
                onClick={() => setIsPrintReportOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
            <OceanOperationsReportPdf
              shipments={shipments}
              voyages={voyages}
              transshipments={transshipments}
              rollovers={rollovers}
            />
          </div>
        </div>
      )}

      {/* Print Single Sheet Preview Overlay */}
      {isPrintSheetOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white">
            <h2 className="text-lg font-bold">Print Preview: Ocean Movement & Release Sheet</h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
              >
                Print Document
              </button>
              <button
                onClick={() => setIsPrintSheetOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
            <OceanShipmentSheetPdf
              shipment={selectedShipment}
              legs={legs.filter((l) => l.bookingNumber === selectedShipment.bookingNumber)}
              containers={store['containers'].filter(
                (c: ContainerOceanStatus) =>
                  c.bookingNumber === selectedShipment.bookingNumber ||
                  selectedShipment.containerNumbers.includes(c.containerNumber)
              )}
              blWorkflow={selectedWorkflow || undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
