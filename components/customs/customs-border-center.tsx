"use client"

import React, { useState, useMemo } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Printer,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Download,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Lock,
} from 'lucide-react'
import {
  customsBorderService,
} from '@/lib/services/customs-border-service'
import {
  BorderOperationRecord,
  BorderStatus,
  CustomsDeclarationRecord,
  TransitPaperRecord,
  CustomsHoldRecord,
  CustomsInspectionRecord,
  DataMismatchItem,
} from '@/lib/types/customs-border'
import { BorderOperationDrawer } from './border-operation-drawer'
import { DeclarationModal } from './declaration-modal'
import { CustomsHoldModal } from './customs-hold-modal'
import { CustomsInspectionModal } from './customs-inspection-modal'
import { BorderOperationDetailModal } from './border-operation-detail-modal'
import { BorderReportPdf } from './documents/border-report-pdf'

type ActiveTab =
  | 'board'
  | 'declarations'
  | 'transit'
  | 'holds'
  | 'inspections'
  | 'mismatch'
  | 'movement'

export function CustomsBorderCenter() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('board')
  const [selectedBorderLocationId, setSelectedBorderLocationId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Service state hooks
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const refresh = () => setRefreshTrigger((prev) => prev + 1)

  const operations: BorderOperationRecord[] = useMemo(
    () => customsBorderService.getOperations(),
    [refreshTrigger]
  )
  const declarations: CustomsDeclarationRecord[] = useMemo(
    () => customsBorderService.getDeclarations(),
    [refreshTrigger]
  )
  const transitPapers: TransitPaperRecord[] = useMemo(
    () => customsBorderService.getTransitPapers(),
    [refreshTrigger]
  )
  const holds: CustomsHoldRecord[] = useMemo(
    () => customsBorderService.getHolds(),
    [refreshTrigger]
  )
  const inspections: CustomsInspectionRecord[] = useMemo(
    () => customsBorderService.getInspections(),
    [refreshTrigger]
  )
  const kpi = useMemo(() => customsBorderService.getSummaryKpi(), [refreshTrigger])

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false)
  const [detailOperation, setDetailOperation] = useState<BorderOperationRecord | null>(null)
  const [holdModalOperation, setHoldModalOperation] = useState<BorderOperationRecord | null>(null)
  const [releaseHoldTarget, setReleaseHoldTarget] = useState<CustomsHoldRecord | null>(null)
  const [inspectionModalOperation, setInspectionModalOperation] = useState<BorderOperationRecord | null>(null)
  const [previewPdfOperation, setPreviewPdfOperation] = useState<BorderOperationRecord | null>(null)

  // Filtered operations
  const filteredOperations = useMemo(() => {
    return operations.filter((op: BorderOperationRecord) => {
      const matchLoc =
        selectedBorderLocationId === 'all' || op.borderLocationId === selectedBorderLocationId
      const q = searchQuery.toLowerCase()
      const matchQuery =
        !q ||
        op.operationNumber.toLowerCase().includes(q) ||
        op.bolNumber.toLowerCase().includes(q) ||
        op.truckPlate.toLowerCase().includes(q) ||
        op.driverName.toLowerCase().includes(q) ||
        (op.containerNumber && op.containerNumber.toLowerCase().includes(q)) ||
        op.borderLocationName.toLowerCase().includes(q) ||
        (op.agentName && op.agentName.toLowerCase().includes(q))
      return matchLoc && matchQuery
    })
  }, [operations, selectedBorderLocationId, searchQuery])

  // WhatsApp copy handler
  const handleCopyWhatsApp = (
    type: 'REACHED_BORDER' | 'CUSTOMS_CLEARED' | 'BORDER_CROSSED',
    op: BorderOperationRecord
  ) => {
    const msg = customsBorderService.generateWhatsAppBorderMessage(
      type,
      {
        bolNumber: op.bolNumber,
        truckPlate: op.truckPlate,
        borderLocationName: op.borderLocationName,
        queuePosition: op.queuePosition,
        clearanceDate: op.clearanceDate,
      },
      'dari'
    )
    navigator.clipboard.writeText(msg)
    setCopiedText('Copied Dari WhatsApp message to clipboard!')
    setTimeout(() => setCopiedText(null), 3000)
  }

  // Export JSON/CSV snapshot
  const handleExportSnapshot = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            kpis: kpi,
            operations,
            declarations,
            transitPapers,
            holds,
          },
          null,
          2
        )
      )
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `sky-ariana-customs-border-${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & CONTROLS                                            */}
      {/* =================================================================== */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                  Customs, Border & Transit Operations
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  PHASE 21
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  TWO-SIDED BORDER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Declarations • Borders • Transit Papers • Customs Clearance • Brokerage
              </p>
            </div>
          </div>

          {/* Action buttons & Border Location Filter */}
          <div className="flex items-center flex-wrap gap-2.5">
            <select
              value={selectedBorderLocationId}
              onChange={(e) => setSelectedBorderLocationId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Border Stations (6 Crossings)</option>
              <option value="loc-iq">Islam Qala / Dogharoon (AF $\leftrightarrow$ IR)</option>
              <option value="loc-hai">Hairatan / Termez (AF $\leftrightarrow$ UZ)</option>
              <option value="loc-sb">Spin Boldak / Chaman (AF $\leftrightarrow$ PK)</option>
              <option value="loc-tor">Torghundi / Serkhetabat (AF $\leftrightarrow$ TM)</option>
              <option value="loc-mil">Milak / Zaranj (AF $\leftrightarrow$ IR)</option>
              <option value="loc-baz">Bazargan / Gürbulak (IR $\leftrightarrow$ TR)</option>
            </select>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-500/10 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Border Operation
            </button>

            <button
              onClick={() => setIsDeclarationModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md shadow-blue-600/10 transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
              File Declaration
            </button>

            <button
              onClick={handleExportSnapshot}
              title="Export Full Customs & Border Snapshot"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Copy Toast feedback */}
        {copiedText && (
          <div className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1.5 rounded flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            {copiedText}
          </div>
        )}
      </header>

      {/* =================================================================== */}
      {/* 2. 11 KPI SUMMARY CARDS                                             */}
      {/* =================================================================== */}
      <div className="px-6 pt-5 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2.5">
          {/* 1. Active Border Shipments */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active</span>
            <div className="my-1">
              <span className="text-lg font-black text-indigo-400">{kpi.activeBorderShipments}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">ops</span>
            </div>
            <span className="text-[9px] text-slate-500">In corridor</span>
          </div>

          {/* 2. Waiting Entry */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Waiting Entry</span>
            <div className="my-1">
              <span className="text-lg font-black text-amber-400">{kpi.waitingBorderEntry}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">trucks</span>
            </div>
            <span className="text-[9px] text-amber-500/80">Queue buffer</span>
          </div>

          {/* 3. In Customs */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">In Customs</span>
            <div className="my-1">
              <span className="text-lg font-black text-blue-400">{kpi.inCustoms}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">lots</span>
            </div>
            <span className="text-[9px] text-blue-500/80">Valuation / Duty</span>
          </div>

          {/* 4. Under Inspection */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inspection</span>
            <div className="my-1">
              <span className="text-lg font-black text-purple-400">{kpi.underInspection}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">scans</span>
            </div>
            <span className="text-[9px] text-purple-400/80">X-Ray / Tailgate</span>
          </div>

          {/* 5. Documents Pending */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Docs Pending</span>
            <div className="my-1">
              <span className="text-lg font-black text-orange-400">{kpi.documentsPending}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">unverified</span>
            </div>
            <span className="text-[9px] text-orange-400/80">Checklist gaps</span>
          </div>

          {/* 6. Customs Hold */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customs Hold</span>
            <div className="my-1">
              <span className="text-lg font-black text-rose-400">{kpi.customsHold}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">holds</span>
            </div>
            <span className="text-[9px] text-rose-400/80">Urgent review</span>
          </div>

          {/* 7. Cleared Today */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cleared Today</span>
            <div className="my-1">
              <span className="text-lg font-black text-emerald-400">{kpi.clearedToday}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">shipments</span>
            </div>
            <span className="text-[9px] text-emerald-400/80">Duty settled</span>
          </div>

          {/* 8. Border Exit Today */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Crossed Today</span>
            <div className="my-1">
              <span className="text-lg font-black text-teal-400">{kpi.borderExitToday}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">trucks</span>
            </div>
            <span className="text-[9px] text-teal-400/80">Side B entered</span>
          </div>

          {/* 9. Transit in Progress */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Transit Active</span>
            <div className="my-1">
              <span className="text-lg font-black text-cyan-400">{kpi.transitInProgress}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">carnets</span>
            </div>
            <span className="text-[9px] text-cyan-400/80">Bonded transit</span>
          </div>

          {/* 10. Truck Change Pending */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Transload</span>
            <div className="my-1">
              <span className="text-lg font-black text-purple-300">{kpi.truckChangePending}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">transfers</span>
            </div>
            <span className="text-[9px] text-purple-400/80">Cross-dock yard</span>
          </div>

          {/* 11. Needs Attention */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attention</span>
            <div className="my-1">
              <span className="text-lg font-black text-amber-300">{kpi.needsAttention}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">alerts</span>
            </div>
            <span className="text-[9px] text-amber-400/80">Delays / Holds</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TABS NAVIGATION & SEARCH                                         */}
      {/* =================================================================== */}
      <div className="px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'board'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Border Operations Board ({operations.length})
          </button>

          <button
            onClick={() => setActiveTab('declarations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'declarations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Customs Declarations ({declarations.length})
          </button>

          <button
            onClick={() => setActiveTab('transit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'transit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Transit Papers ({transitPapers.length})
          </button>

          <button
            onClick={() => setActiveTab('holds')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'holds'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Customs Holds ({holds.length})
          </button>

          <button
            onClick={() => setActiveTab('inspections')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'inspections'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Inspections ({inspections.length})
          </button>

          <button
            onClick={() => setActiveTab('mismatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'mismatch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Data Mismatch Check
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search BOL, truck, declaration, agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. MAIN CONTENT AREA                                                */}
      {/* =================================================================== */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* TAB 1: BORDER OPERATIONS BOARD */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active Cross-Border Operations Board
                </h2>
                <p className="text-xs text-slate-400">
                  Two-sided border tracking, customs queues, clearing agents, and live verification.
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Showing {filteredOperations.length} of {operations.length} active border movements
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Operation / BOL</th>
                      <th className="p-3">Transport Truck & Driver</th>
                      <th className="p-3">Border Crossing Station</th>
                      <th className="p-3 text-center">Border Side</th>
                      <th className="p-3">Current Stage</th>
                      <th className="p-3">Arrival & Queue</th>
                      <th className="p-3">Clearing Agent</th>
                      <th className="p-3 text-center">Checklist</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredOperations.map((op: BorderOperationRecord) => {
                      const isOnHold = op.status === 'ON_HOLD' || op.holds.some((h) => h.status === 'OPEN')
                      const isCleared = op.status === 'CLEARED'
                      const isCrossed = op.status === 'BORDER_CROSSED'

                      return (
                        <tr
                          key={op.id}
                          className={`hover:bg-slate-900/60 transition ${
                            isOnHold ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-mono font-bold text-white block">
                              {op.operationNumber}
                            </span>
                            <span className="font-mono text-[10px] text-indigo-400">
                              BOL: {op.bolNumber}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-100 block">
                              {op.truckPlate}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {op.driverName}
                            </span>
                            {op.containerNumber && (
                              <span className="block font-mono text-[10px] text-indigo-300">
                                {op.containerNumber}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-slate-200 block">
                              {op.borderLocationName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {op.countryFrom} $\rightarrow$ {op.countryTo}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                op.currentSide === 'SIDE_A'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {op.currentSide === 'SIDE_A' ? `Side A (${op.countryFrom})` : `Side B (${op.countryTo})`}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isOnHold
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : isCrossed
                                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                  : isCleared
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {op.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {op.arrivalDate ? (
                              <>
                                <div>{new Date(op.arrivalDate).toLocaleDateString()}</div>
                                <span className="font-mono text-[10px] text-slate-500">
                                  {op.queuePosition !== null
                                    ? `Queue #${op.queuePosition}`
                                    : 'Queue Position Not Recorded'}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-500">Approaching</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-slate-200 font-medium block">
                              {op.agentName || 'Self-clearing'}
                            </span>
                            {op.agentPhone && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {op.agentPhone}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono text-[11px] text-slate-300 font-bold">
                              {op.documents.filter((d) => d.verified).length}/{op.documents.length}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Detail */}
                              <button
                                onClick={() => setDetailOperation(op)}
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded text-[11px] font-medium transition"
                              >
                                Detail
                              </button>

                              {/* Print A4 Sheet */}
                              <button
                                onClick={() => setPreviewPdfOperation(op)}
                                title="Print Border Operations Sheet"
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-400" />
                              </button>

                              {/* WhatsApp Share */}
                              <button
                                onClick={() =>
                                  handleCopyWhatsApp(
                                    isCrossed
                                      ? 'BORDER_CROSSED'
                                      : isCleared
                                      ? 'CUSTOMS_CLEARED'
                                      : 'REACHED_BORDER',
                                    op
                                  )
                                }
                                title="Copy Dari WhatsApp Message"
                                className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded border border-emerald-800/60"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMS DECLARATIONS */}
        {activeTab === 'declarations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Official Customs Declarations
                </h2>
                <p className="text-xs text-slate-400">
                  Customs valuation, tariff headings (HS Codes), declared gross/net weights, and export offices.
                </p>
              </div>
              <button
                onClick={() => setIsDeclarationModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                File Declaration
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Declaration Number</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Customs Directorate</th>
                      <th className="p-3">Exporter & Importer</th>
                      <th className="p-3">HS Code & Commodity</th>
                      <th className="p-3 text-right">Packages</th>
                      <th className="p-3 text-right">Gross Wt</th>
                      <th className="p-3 text-right">Declared Value</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {declarations.map((dec) => (
                      <tr key={dec.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3">
                          <span className="font-mono font-bold text-indigo-400 block">
                            {dec.declarationNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            BOL: {dec.linkedBolNumber}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {dec.declarationDate}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-800 text-slate-300">
                            {dec.declarationType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 text-[11px]">
                          {dec.customsOffice}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-100 block">{dec.exporter}</span>
                          <span className="text-[10px] text-slate-400">{dec.importer}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-amber-400 block">
                            {dec.hsCode}
                          </span>
                          <span className="text-[11px] text-slate-300">{dec.commodity}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-white text-sm">
                          {dec.packages.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-200">
                          {dec.grossWeightKg.toLocaleString()} kg
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ${dec.declaredValue.toLocaleString()} {dec.currency}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dec.status === 'CLEARED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {dec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSIT PAPERS */}
        {activeTab === 'transit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  International Transit Papers & Corridors
                </h2>
                <p className="text-xs text-slate-400">
                  Bonded road transit, customs security seals, entry/exit border corridors, and explicit closure.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Transit Carnet #</th>
                      <th className="p-3">BOL Reference</th>
                      <th className="p-3">Truck & Container</th>
                      <th className="p-3">Entry Border Post</th>
                      <th className="p-3">Exit Border Post</th>
                      <th className="p-3">Corridor Route</th>
                      <th className="p-3 text-center">Security Bolt Seal</th>
                      <th className="p-3 text-center">Transit Stage</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {transitPapers.map((trn) => (
                      <tr key={trn.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {trn.transitNumber}
                        </td>
                        <td className="p-3 font-mono text-white">
                          {trn.linkedBolNumber}
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-200 block">{trn.truckPlate}</span>
                          {trn.containerNumber && (
                            <span className="font-mono text-[10px] text-indigo-300">{trn.containerNumber}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 font-medium">
                          {trn.entryBorder}
                        </td>
                        <td className="p-3 text-slate-300 font-medium">
                          {trn.exitBorder}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">
                          {trn.routeCorridor || 'Direct Corridor'}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-emerald-400">
                          {trn.sealNumber}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trn.status === 'CLOSED'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            {trn.transitStage}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {trn.status !== 'CLOSED' && (
                            <button
                              onClick={() => {
                                customsBorderService.closeTransitPaper(
                                  trn.id,
                                  'Border Exit Officer',
                                  'Exit verified and transit bond released.'
                                )
                                refresh()
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold border border-slate-700"
                            >
                              Close Transit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMS HOLDS */}
        {activeTab === 'holds' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active & Historical Customs Holds
                </h2>
                <p className="text-xs text-slate-400">
                  Document holds, valuation reviews, phytosanitary sampling, and authorized release resolutions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holds.map((hold) => {
                const isOpen = hold.status === 'OPEN'
                return (
                  <div
                    key={hold.id}
                    className={`bg-slate-950/80 border rounded-2xl p-5 shadow-lg flex flex-col justify-between ${
                      isOpen ? 'border-rose-900/60' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-400 text-xs">
                              {hold.holdType.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isOpen
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {hold.status}
                            </span>
                          </div>
                          <span className="font-mono text-white text-xs mt-1 block">
                            BOL: {hold.bolNumber}
                          </span>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-mono">
                          {new Date(hold.openedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] block">Authority</span>
                          <span className="text-slate-200 font-medium">{hold.authority}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] block">Reason for Hold</span>
                          <p className="text-slate-300 mt-0.5">{hold.reason}</p>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-amber-400 font-bold block text-[10px] uppercase">
                            Required Action
                          </span>
                          <p className="text-amber-200 mt-0.5">{hold.requiredAction}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Party: <strong className="text-slate-300">{hold.responsibleParty}</strong>
                      </span>
                      {isOpen ? (
                        <button
                          onClick={() => {
                            setReleaseHoldTarget(hold)
                            const op = operations.find((o) => o.id === hold.borderOperationId)
                            if (op) setHoldModalOperation(op)
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow"
                        >
                          Release Hold
                        </button>
                      ) : (
                        <span className="text-emerald-400 text-[11px] font-medium">
                          Resolved: {hold.resolutionNote}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 5: INSPECTIONS */}
        {activeTab === 'inspections' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Customs Inspections & Verification Outcomes
              </h2>
              <p className="text-xs text-slate-400">
                X-Ray scanner lane logs, quarantine sampling, tailgate physical inspections, and factual results.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inspections.map((insp) => (
                <div
                  key={insp.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-indigo-400 text-xs">
                        {insp.inspectionType.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                        {insp.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Authority</span>
                        <span className="text-slate-200 font-medium">{insp.authority}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Reason</span>
                        <span className="text-slate-300">{insp.reason}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Outcome</span>
                        <p className="text-emerald-300 mt-0.5 font-medium">{insp.result || 'Pending inspection'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                    Inspector: {insp.inspectorName || 'Customs Officer'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DATA MISMATCH CHECK */}
        {activeTab === 'mismatch' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Cross-Document Data Mismatch Checker
              </h2>
              <p className="text-xs text-slate-400">
                Compares Bill of Lading, Packing List, Customs Declaration, and Commercial Invoice. Shows objective differences without silent auto-correction.
              </p>
            </div>

            {/* Reconciliation table for primary seed shipment */}
            {(() => {
              const mismatchItems = customsBorderService.checkDataMismatches('BOL-2026-0041')
              return (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="font-mono font-bold text-white text-base">BOL-2026-0041</span>
                      <span className="text-slate-400 text-xs ml-2">Export Green Raisins (1,427 CTNS)</span>
                    </div>
                    <span className="px-3 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      NO CRITICAL MISMATCH DETECTED
                    </span>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                          <th className="p-3">Data Field</th>
                          <th className="p-3">Source Document A</th>
                          <th className="p-3">Source Document B</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3">Audit Finding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {mismatchItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/60 transition">
                            <td className="p-3 font-bold text-slate-100">{item.field}</td>
                            <td className="p-3">
                              <span className="text-[10px] text-slate-500 block">{item.sourceA.name}</span>
                              <span className="font-mono font-semibold text-slate-200">{item.sourceA.value}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] text-slate-500 block">{item.sourceB.name}</span>
                              <span className="font-mono font-semibold text-slate-200">{item.sourceB.value}</span>
                            </td>
                            <td className="p-3 text-center">
                              {item.hasMismatch ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                  MISMATCH
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  EXACT MATCH ✓
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">{item.differenceNotes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 5. MODALS & DRAWERS                                                 */}
      {/* =================================================================== */}
      {/* 1. New Border Operation Drawer */}
      <BorderOperationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={(data) => {
          customsBorderService.createOperation(data)
          setIsDrawerOpen(false)
          refresh()
        }}
      />

      {/* 2. File Customs Declaration Modal */}
      <DeclarationModal
        isOpen={isDeclarationModalOpen}
        onClose={() => setIsDeclarationModalOpen(false)}
        onSave={(data) => {
          customsBorderService.createDeclaration(data)
          setIsDeclarationModalOpen(false)
          refresh()
        }}
      />

      {/* 3. Border Operation Multi-Tab Detail Modal */}
      {detailOperation && (
        <BorderOperationDetailModal
          isOpen={true}
          onClose={() => setDetailOperation(null)}
          operation={detailOperation}
          mismatchItems={customsBorderService.checkDataMismatches(detailOperation.bolNumber)}
          onUpdateStatus={(stage, location, notes, recordedBy) => {
            customsBorderService.updateOperationStatus(
              detailOperation.id,
              stage,
              location,
              notes,
              recordedBy
            )
            refresh()
          }}
          onVerifyDocument={(docId) => {
            customsBorderService.verifyDocument(detailOperation.id, docId, 'Customs Inspector')
            refresh()
          }}
          onOpenHoldModal={() => setHoldModalOperation(detailOperation)}
          onReleaseHoldModal={(hold) => {
            setReleaseHoldTarget(hold)
            setHoldModalOperation(detailOperation)
          }}
          onOpenInspectionModal={() => setInspectionModalOperation(detailOperation)}
          onOpenPrintPdf={() => setPreviewPdfOperation(detailOperation)}
          onCopyWhatsApp={(type) => handleCopyWhatsApp(type, detailOperation)}
        />
      )}

      {/* 4. Customs Hold Create / Release Modal */}
      {holdModalOperation && (
        <CustomsHoldModal
          isOpen={true}
          onClose={() => {
            setHoldModalOperation(null)
            setReleaseHoldTarget(null)
          }}
          existingHold={releaseHoldTarget}
          borderOperationId={holdModalOperation.id}
          bolNumber={holdModalOperation.bolNumber}
          onCreateHold={(data) => {
            customsBorderService.createHold(data)
            refresh()
          }}
          onReleaseHold={(holdId, relBy, note) => {
            customsBorderService.releaseHold(holdId, relBy, note)
            refresh()
          }}
        />
      )}

      {/* 5. Customs Inspection Modal */}
      {inspectionModalOperation && (
        <CustomsInspectionModal
          isOpen={true}
          onClose={() => setInspectionModalOperation(null)}
          borderOperationId={inspectionModalOperation.id}
          bolNumber={inspectionModalOperation.bolNumber}
          onSave={(data) => {
            customsBorderService.recordInspection(data)
            refresh()
          }}
        />
      )}

      {/* 6. Printable A4 Border Report PDF Modal */}
      {previewPdfOperation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl my-auto">
            <BorderReportPdf
              operation={previewPdfOperation}
              onClose={() => setPreviewPdfOperation(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
