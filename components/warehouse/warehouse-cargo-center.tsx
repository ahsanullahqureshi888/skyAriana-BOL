"use client"

import React, { useState, useMemo } from 'react'
import {
  Boxes,
  PackagePlus,
  Truck,
  ClipboardList,
  Scale,
  History,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Share2,
  FileCheck,
  Search,
  Filter,
  Plus,
  Play,
  RotateCcw,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Lock,
  Download,
  Copy,
  Check,
} from 'lucide-react'
import {
  warehouseCargoService,
  SEED_WAREHOUSE_AREAS,
} from '@/lib/services/warehouse-cargo-service'
import {
  CargoLotRecord,
  WarehouseReceiptRecord,
  LoadingPlanRecord,
  LoadingSessionRecord,
  StockMovementRecord,
  DamageReportRecord,
  RepackingRecord,
  DispatchEventRecord,
  PackageType,
} from '@/lib/types/warehouse-cargo'
import { CargoReceivingDrawer } from './cargo-receiving-drawer'
import { LoadingPlanDrawer } from './loading-plan-drawer'
import { ActiveLoadingModal } from './active-loading-modal'
import { StockAdjustmentModal } from './stock-adjustment-modal'
import { RepackingModal } from './repacking-modal'
import { WarehouseReceiptPdf } from './documents/warehouse-receipt-pdf'
import { WarehouseDispatchPdf } from './documents/warehouse-dispatch-pdf'

type ActiveTab =
  | 'inventory'
  | 'receipts'
  | 'loading'
  | 'ledger'
  | 'damages'
  | 'consistency'
  | 'dispatch'

export function WarehouseCargoCenter() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Service state hooks
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const refresh = () => setRefreshTrigger((prev) => prev + 1)

  const lots: CargoLotRecord[] = useMemo(() => warehouseCargoService.getLots(), [refreshTrigger])
  const receipts: WarehouseReceiptRecord[] = useMemo(() => warehouseCargoService.getReceipts(), [refreshTrigger])
  const loadingPlans: LoadingPlanRecord[] = useMemo(() => warehouseCargoService.getLoadingPlans(), [refreshTrigger])
  const loadingSessions: LoadingSessionRecord[] = useMemo(() => warehouseCargoService.getLoadingSessions(), [refreshTrigger])
  const movements: StockMovementRecord[] = useMemo(() => warehouseCargoService.getMovements(), [refreshTrigger])
  const damageReports: DamageReportRecord[] = useMemo(() => warehouseCargoService.getDamageReports(), [refreshTrigger])
  const repackingRecords: RepackingRecord[] = useMemo(() => warehouseCargoService.getRepackingRecords(), [refreshTrigger])
  const dispatches: DispatchEventRecord[] = useMemo(() => warehouseCargoService.getDispatches(), [refreshTrigger])
  const kpi = useMemo(() => warehouseCargoService.getSummaryKpi(), [refreshTrigger])

  // Modals state
  const [isReceivingOpen, setIsReceivingOpen] = useState(false)
  const [isLoadingPlanOpen, setIsLoadingPlanOpen] = useState(false)
  const [activeLoadingSession, setActiveLoadingSession] = useState<{
    plan: LoadingPlanRecord
    session: LoadingSessionRecord
  } | null>(null)
  const [adjustLot, setAdjustLot] = useState<CargoLotRecord | null>(null)
  const [repackLot, setRepackLot] = useState<CargoLotRecord | null>(null)
  const [damageLot, setDamageLot] = useState<CargoLotRecord | null>(null)
  const [previewReceipt, setPreviewReceipt] = useState<WarehouseReceiptRecord | null>(null)
  const [previewDispatch, setPreviewDispatch] = useState<DispatchEventRecord | null>(null)

  // Allocation modal quick input
  const [allocatingLot, setAllocatingLot] = useState<CargoLotRecord | null>(null)
  const [allocationBol, setAllocationBol] = useState('BOL-2026-0041')
  const [allocationQty, setAllocationQty] = useState<number>(500)

  // Damage report modal quick input
  const [damageQty, setDamageQty] = useState(10)
  const [damageType, setDamageType] = useState<'TORN_CARTONS' | 'WATER_MOISTURE' | 'CRUSHED_BOXES' | 'OTHER'>('TORN_CARTONS')
  const [damageDesc, setDamageDesc] = useState('')

  // Filtered lots
  const filteredLots = useMemo(() => {
    return lots.filter((lot: CargoLotRecord) => {
      const matchWarehouse =
        selectedWarehouseId === 'all' || lot.warehouseLocationId === selectedWarehouseId
      const q = searchQuery.toLowerCase()
      const matchQuery =
        !q ||
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.receiptNumber.toLowerCase().includes(q) ||
        lot.customerName.toLowerCase().includes(q) ||
        lot.commodity.toLowerCase().includes(q) ||
        lot.cargoMarks.toLowerCase().includes(q)
      return matchWarehouse && matchQuery
    })
  }, [lots, selectedWarehouseId, searchQuery])

  // Handle WhatsApp Copy
  const handleCopyWhatsApp = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText('Copied WhatsApp message to clipboard!')
    setTimeout(() => setCopiedText(null), 3000)
  }

  // Handle Allocation Submit
  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allocatingLot) return
    const res = warehouseCargoService.allocateCargo(
      allocatingLot.id,
      `shp-${allocationBol.toLowerCase()}`,
      allocationBol,
      Number(allocationQty)
    )
    if (!res.success) {
      alert(res.error || 'Failed to allocate cargo')
      return
    }
    setAllocatingLot(null)
    refresh()
  }

  // Handle Damage Report Submit
  const handleConfirmDamage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!damageLot) return
    warehouseCargoService.recordDamage({
      cargoLotId: damageLot.id,
      packagesAffected: Number(damageQty),
      damageType,
      description: damageDesc || 'Torn packaging during transport handling',
      reportedBy: 'Warehouse Floor Inspector',
      warehouseLocationId: damageLot.warehouseLocationId,
    })
    setDamageLot(null)
    setDamageDesc('')
    refresh()
  }

  // Export JSON/CSV
  const handleExportStockSummary = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            exportDate: new Date().toISOString(),
            kpis: kpi,
            cargoLots: lots,
            movements: movements.slice(0, 50),
          },
          null,
          2
        )
      )
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `sky-ariana-warehouse-stock-${new Date().toISOString().split('T')[0]}.json`)
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
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                  Warehouse, Cargo & Loading Control Center
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PHASE 20
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  ZERO NEGATIVE STOCK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical Inventory Invariance • Scale Weight Reconciliation • Container Stuffing & Exit Gate Passes
              </p>
            </div>
          </div>

          {/* Action buttons & Facility Filter */}
          <div className="flex items-center flex-wrap gap-2.5">
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="all">All Facilities (4 Warehouses)</option>
              <option value="loc-kdr">Kandahar Central Export Hub</option>
              <option value="loc-iq">Islam Qala Border Depot</option>
              <option value="loc-bnd">Bandar Abbas Port Yard</option>
              <option value="loc-kbl">Kabul Customs Inland Depot</option>
            </select>

            <button
              onClick={() => setIsReceivingOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-amber-500/10 transition active:scale-95"
            >
              <PackagePlus className="w-4 h-4" />
              New Cargo Intake (WHR)
            </button>

            <button
              onClick={() => setIsLoadingPlanOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md shadow-blue-600/10 transition active:scale-95"
            >
              <Truck className="w-4 h-4" />
              New Loading Plan (LP)
            </button>

            <button
              onClick={handleExportStockSummary}
              title="Export Full Warehouse Ledger & Stock Snapshot"
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
      {/* 2. 10 KPI SUMMARY CARDS                                             */}
      {/* =================================================================== */}
      <div className="px-6 pt-5 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2.5">
          {/* 1. Total in Warehouse */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Stock</span>
            <div className="my-1">
              <span className="text-lg font-black text-amber-400">{kpi.totalCargoInWarehouse.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">pkgs</span>
            </div>
            <span className="text-[9px] text-slate-500">Physical on-hand</span>
          </div>

          {/* 2. Received Today */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Received Today</span>
            <div className="my-1">
              <span className="text-lg font-black text-emerald-400">+{kpi.receivedTodayCount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">pkgs</span>
            </div>
            <span className="text-[9px] text-emerald-500/80">Inward tally</span>
          </div>

          {/* 3. Awaiting Allocation */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unallocated</span>
            <div className="my-1">
              <span className="text-lg font-black text-cyan-400">{kpi.awaitingAllocationCount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">pkgs</span>
            </div>
            <span className="text-[9px] text-cyan-500/80">Free for booking</span>
          </div>

          {/* 4. Ready for Loading */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ready to Load</span>
            <div className="my-1">
              <span className="text-lg font-black text-blue-400">{kpi.readyForLoadingCount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">pkgs</span>
            </div>
            <span className="text-[9px] text-blue-500/80">Staged at dock</span>
          </div>

          {/* 5. Loading Today */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Loading Active</span>
            <div className="my-1">
              <span className="text-lg font-black text-indigo-400">{kpi.loadingTodayCount}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">sessions</span>
            </div>
            <span className="text-[9px] text-indigo-400/80">Live tally intake</span>
          </div>

          {/* 6. Partially Loaded */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Partial Lots</span>
            <div className="my-1">
              <span className="text-lg font-black text-purple-400">{kpi.partiallyLoadedCount}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">lots</span>
            </div>
            <span className="text-[9px] text-purple-400/80">Split stuffing</span>
          </div>

          {/* 7. Fully Loaded */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fully Stuffed</span>
            <div className="my-1">
              <span className="text-lg font-black text-teal-400">{kpi.fullyLoadedCount}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">lots</span>
            </div>
            <span className="text-[9px] text-teal-400/80">100% packed</span>
          </div>

          {/* 8. Damaged / Quarantine */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quarantine</span>
            <div className="my-1">
              <span className="text-lg font-black text-rose-400">{kpi.damagedCargoCount}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">units</span>
            </div>
            <span className="text-[9px] text-rose-400/80">Hold for repack</span>
          </div>

          {/* 9. Shortage Issues */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variance Alert</span>
            <div className="my-1">
              <span className="text-lg font-black text-orange-400">{kpi.shortageIssuesCount}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">alerts</span>
            </div>
            <span className="text-[9px] text-orange-400/80">Scale/tally variance</span>
          </div>

          {/* 10. Dispatched Today */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dispatched</span>
            <div className="my-1">
              <span className="text-lg font-black text-emerald-300">{kpi.dispatchedTodayCount}</span>
              <span className="text-[10px] text-slate-500 ml-1 font-mono">trucks</span>
            </div>
            <span className="text-[9px] text-emerald-400/80">Gate pass closed</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TABS NAVIGATION & SEARCH                                         */}
      {/* =================================================================== */}
      <div className="px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Cargo Lots Inventory ({lots.length})
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Warehouse Receipts ({receipts.length})
          </button>

          <button
            onClick={() => setActiveTab('loading')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'loading'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Loading & Stuffing ({loadingSessions.length})
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Stock Movement Ledger ({movements.length})
          </button>

          <button
            onClick={() => setActiveTab('damages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'damages'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Damage & Repacking ({damageReports.length + repackingRecords.length})
          </button>

          <button
            onClick={() => setActiveTab('consistency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'consistency'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Data Consistency Panel
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'dispatch'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Dispatches & Gate Passes ({dispatches.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search lot, customer, BOL, commodity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. MAIN CONTENT AREA                                                */}
      {/* =================================================================== */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* TAB 1: CARGO LOTS INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Physical Cargo Inventory Lots
                </h2>
                <p className="text-xs text-slate-400">
                  Separation of soft allocation from physical loading. Invariance strictly maintained.
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Showing {filteredLots.length} of {lots.length} active lots
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Lot & Receipt #</th>
                      <th className="p-3">Client & Commodity</th>
                      <th className="p-3 text-center">Packaging</th>
                      <th className="p-3 text-right">Received</th>
                      <th className="p-3 text-right">Reserved</th>
                      <th className="p-3 text-right">Loaded</th>
                      <th className="p-3 text-right text-amber-400 font-bold">Remaining</th>
                      <th className="p-3 text-right text-emerald-400 font-bold">Available</th>
                      <th className="p-3 text-right">Unit Gross / Net</th>
                      <th className="p-3">Storage Rack</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredLots.map((lot: CargoLotRecord) => {
                      const isQuarantine = lot.onHold || lot.status === 'DAMAGED'
                      return (
                        <tr
                          key={lot.id}
                          className={`hover:bg-slate-900/60 transition ${
                            isQuarantine ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-mono font-bold text-white block">
                              {lot.lotNumber}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {lot.receiptNumber}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-100 block">
                              {lot.customerName}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {lot.commodity}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {lot.cargoMarks}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-800 text-slate-300 font-bold">
                              {lot.packageType}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            {lot.receivedQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-blue-400">
                            {lot.reservedQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-purple-400">
                            {lot.loadedQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-amber-400 text-sm">
                            {lot.remainingQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-400 text-sm">
                            {lot.availableQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                            <div>{lot.unitGrossWeightKg} kg gross</div>
                            <div className="text-slate-500">{lot.unitNetWeightKg} kg net</div>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-300 font-medium">
                              {lot.warehousePosition || 'Zone A'}
                            </span>
                            {lot.batchNumber && (
                              <span className="block font-mono text-[10px] text-slate-500">
                                {lot.batchNumber}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isQuarantine ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                QUARANTINE ({lot.holdQuantity || 0})
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lot.status === 'FULLY_LOADED'
                                    ? 'bg-teal-500/20 text-teal-400'
                                    : lot.status === 'PARTIALLY_LOADED'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : lot.status === 'READY_FOR_LOADING'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : lot.status === 'ALLOCATED'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {lot.status.replace(/_/g, ' ')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Allocate button */}
                              <button
                                onClick={() => {
                                  setAllocatingLot(lot)
                                  setAllocationQty(lot.availableQuantity)
                                }}
                                title="Allocate to Shipment / BOL"
                                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-[11px] font-medium transition"
                              >
                                Allocate
                              </button>

                              {/* Adjust button */}
                              <button
                                onClick={() => setAdjustLot(lot)}
                                title="Authorized Stock Adjustment"
                                className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded text-[11px] font-medium transition"
                              >
                                Adjust
                              </button>

                              {/* Repack button */}
                              <button
                                onClick={() => setRepackLot(lot)}
                                title="Repack Damaged Cartons"
                                className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded text-[11px] font-medium transition"
                              >
                                Repack
                              </button>

                              {/* Report Damage button */}
                              <button
                                onClick={() => setDamageLot(lot)}
                                title="Report Cargo Damage"
                                className="px-1.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 rounded text-[11px] font-medium transition"
                              >
                                <AlertTriangle className="w-3 h-3" />
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

        {/* TAB 2: WAREHOUSE RECEIPTS (WHR) */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Inward Warehouse Cargo Receipts (WHR)
                </h2>
                <p className="text-xs text-slate-400">
                  Scale weight verification, weighbridge slip reconciliation, and printable official receipts.
                </p>
              </div>
              <button
                onClick={() => setIsReceivingOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Intake New Cargo
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Receipt Number</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Facility</th>
                      <th className="p-3">Client / Depositor</th>
                      <th className="p-3">Delivering Truck & Driver</th>
                      <th className="p-3">Commodity</th>
                      <th className="p-3 text-right">Packages</th>
                      <th className="p-3 text-right">Gross Weight</th>
                      <th className="p-3 text-center">Condition</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {receipts.map((whr) => (
                      <tr key={whr.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3">
                          <span className="font-mono font-bold text-amber-400 block">
                            {whr.receiptNumber}
                          </span>
                          {whr.linkedBolNumber && (
                            <span className="text-[10px] text-blue-400 font-mono">
                              BOL: {whr.linkedBolNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {new Date(whr.receivedDate).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-500">
                            {new Date(whr.receivedDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-200 block">
                            {whr.warehouseName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {whr.storageAreaName || 'Zone A'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-100 block">
                            {whr.customerName}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {whr.shipperName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-200 block">
                            {whr.deliveringTruckPlate || 'Direct Delivery'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {whr.deliveringDriverName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-100 block">
                            {whr.commodity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Type: {whr.packageType}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-100 text-sm">
                          {whr.totalPackages.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-200">
                          {whr.totalGrossWeightKg.toLocaleString()} kg
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {whr.condition}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Printable PDF */}
                            <button
                              onClick={() => setPreviewReceipt(whr)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700 transition"
                            >
                              <Printer className="w-3 h-3 text-blue-400" />
                              Print A4
                            </button>

                            {/* WhatsApp Copy */}
                            <button
                              onClick={() => {
                                const msg = warehouseCargoService.generateWhatsAppWarehouseUpdate(
                                  'CARGO_RECEIVED',
                                  whr,
                                  'dari'
                                )
                                handleCopyWhatsApp(msg)
                              }}
                              title="Copy Dari WhatsApp Receipt"
                              className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-400 rounded text-[11px] border border-emerald-800/50 transition flex items-center gap-1"
                            >
                              <Share2 className="w-3 h-3" />
                              WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LOADING PLANS & ACTIVE SESSIONS */}
        {activeTab === 'loading' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Loading Plans & Container Stuffing Sessions
                </h2>
                <p className="text-xs text-slate-400">
                  Live incremental tally intake, container seal application, and verified gross mass (VGM) recording.
                </p>
              </div>
              <button
                onClick={() => setIsLoadingPlanOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Loading Plan
              </button>
            </div>

            {/* Active Sessions List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {loadingSessions.map((session) => {
                const plan = loadingPlans.find((lp) => lp.id === session.loadingPlanId)
                const plannedPkgs = plan?.plannedPackages || 1427
                const progressPct = Math.min(
                  100,
                  Math.round((session.totalPackagesLoaded / plannedPkgs) * 100)
                )

                return (
                  <div
                    key={session.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">
                              {session.planNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                session.status === 'COMPLETED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-blue-500/20 text-blue-400 animate-pulse'
                              }`}
                            >
                              {session.status}
                            </span>
                          </div>
                          <span className="text-slate-400 text-xs mt-0.5 block">
                            BOL: <strong className="text-slate-200">{session.bolNumber}</strong>
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Equipment / Transport
                          </span>
                          <span className="font-mono font-bold text-xs text-indigo-300">
                            {session.containerNumber || 'Direct Truck'}
                          </span>
                          {session.truckPlate && (
                            <span className="block font-mono text-[10px] text-slate-400">
                              {session.truckPlate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Stuffing Progress</span>
                          <span className="font-mono font-bold text-white">
                            {session.totalPackagesLoaded.toLocaleString()} / {plannedPkgs.toLocaleString()} pkgs ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPct >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-xs mb-3 font-mono">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Loaded Gross</span>
                          <span className="font-bold text-slate-200">
                            {session.totalGrossWeightLoadedKg.toLocaleString()} kg
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Security Seal</span>
                          <span className="font-bold text-emerald-400">
                            {session.sealNumber || 'Pending Seal'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">VGM Weight</span>
                          <span className="font-bold text-amber-300">
                            {session.vgmWeightKg ? `${session.vgmWeightKg.toLocaleString()} kg` : 'Unverified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Supervisor: <strong className="text-slate-300">{session.supervisorName}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {session.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => {
                              if (plan) {
                                setActiveLoadingSession({ plan, session })
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Resume Loading
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const msg = warehouseCargoService.generateWhatsAppWarehouseUpdate(
                                'CONTAINER_STUFFED',
                                { ...session, loadingLocation: plan?.loadingLocation },
                                'dari'
                              )
                              handleCopyWhatsApp(msg)
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/60 rounded-lg transition"
                          >
                            <Share2 className="w-3 h-3" />
                            Share Seal WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 4: IMMUTABLE STOCK MOVEMENT LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Immutable Physical Stock Movement Ledger
                </h2>
                <p className="text-xs text-slate-400">
                  Every intake, soft-allocation, loading, repack, and adjustment is recorded chronologically.
                </p>
              </div>

              {/* Accounting Invariance Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-600/40 rounded-lg text-emerald-400 text-xs font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>INVARIANCE AUDITED: Remaining = Received - Loaded ± Adjustments</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Lot / Ref #</th>
                      <th className="p-3 text-right">Qty Delta</th>
                      <th className="p-3 text-right">Gross Wt Delta</th>
                      <th className="p-3">From Location</th>
                      <th className="p-3">To Location</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {movements.map((mov) => {
                      const isPositive = mov.quantity > 0
                      const isNegative = mov.quantity < 0
                      return (
                        <tr key={mov.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {new Date(mov.timestamp).toLocaleDateString()}
                            <span className="block text-[10px] text-slate-500">
                              {new Date(mov.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                mov.movementType === 'RECEIPT'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : mov.movementType === 'LOAD'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : mov.movementType === 'ALLOCATION'
                                  ? 'bg-cyan-500/20 text-cyan-400'
                                  : mov.movementType === 'REPACK'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : mov.movementType === 'ADJUSTMENT'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-teal-500/20 text-teal-400'
                              }`}
                            >
                              {mov.movementType}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-white block">
                              {mov.lotNumber}
                            </span>
                            {mov.relatedBolNumber && (
                              <span className="text-[10px] text-blue-400 font-mono">
                                BOL: {mov.relatedBolNumber}
                              </span>
                            )}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold text-sm ${
                              isPositive
                                ? 'text-emerald-400'
                                : isNegative
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {isPositive ? `+${mov.quantity}` : mov.quantity}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-300">
                            {mov.grossWeightKg.toLocaleString()} kg
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {mov.fromLocation}
                          </td>
                          <td className="p-3 text-slate-200 text-[11px] font-medium">
                            {mov.toLocation}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {mov.performedBy}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">
                            {mov.reason || '—'}
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

        {/* TAB 5: DAMAGE & REPACKING */}
        {activeTab === 'damages' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Cargo Damage Reports & Authorized Repacking
              </h2>
              <p className="text-xs text-slate-400">
                Non-destructive damage recording, quarantine management, and repacking with tare weight variance tracking.
              </p>
            </div>

            {/* Damage Reports Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Active Damage Reports ({damageReports.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {damageReports.map((dmg) => (
                  <div
                    key={dmg.id}
                    className="bg-slate-950/60 border border-rose-900/40 rounded-xl p-4 shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-rose-400 text-xs">
                          {dmg.lotNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {dmg.damageType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="my-2">
                        <span className="text-xl font-black text-white">
                          {dmg.packagesAffected}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">packages affected</span>
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                        {dmg.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Reported by: {dmg.reportedBy}</span>
                      <span className="text-amber-400 font-medium">Status: {dmg.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repacking Records Grid */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Repacking Audit Records ({repackingRecords.length})
              </h3>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Date</th>
                      <th className="p-3">Lot Number</th>
                      <th className="p-3 text-right">Original Pkgs</th>
                      <th className="p-3 text-right">New Pkgs</th>
                      <th className="p-3 text-center">New Package Type</th>
                      <th className="p-3 text-right">Weight Diff (KG)</th>
                      <th className="p-3">Packaging Materials</th>
                      <th className="p-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {repackingRecords.map((rep: RepackingRecord) => (
                      <tr key={rep.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(rep.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">
                          {rep.lotNumber}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-400">
                          {rep.originalPackages}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                          {rep.newPackages}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                            {rep.newPackageType}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          {rep.weightDifferenceKg > 0 ? `+${rep.weightDifferenceKg}` : rep.weightDifferenceKg} kg
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {rep.packagingMaterialsUsed}
                        </td>
                        <td className="p-3 text-slate-300 font-medium text-[11px]">
                          {rep.performedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DATA CONSISTENCY RECONCILIATION */}
        {activeTab === 'consistency' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Data Consistency & Manifest Reconciliation Panel
              </h2>
              <p className="text-xs text-slate-400">
                Four-way automatic audit: Warehouse Loaded Cargo vs Commercial Packing List vs Bill of Lading vs Commercial Invoice.
              </p>
            </div>

            {/* Reconciliation Card for Active BOL */}
            {(() => {
              const consistency = warehouseCargoService.getDataConsistencyCheck(
                'shp-2026-0041',
                'BOL-2026-0041'
              )
              return (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white font-mono">
                          {consistency.bolNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          {consistency.packageMatches ? 'MANIFEST RECONCILED' : 'DISCREPANCY ALERT'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Shipment ID: {consistency.shipmentId} • Customer: Haji Abdul Wase Khan Alokozay
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Tolerance Threshold:</span>
                      <span className="font-mono text-xs font-bold text-slate-200">±0 Pkgs / ±50 KG</span>
                    </div>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Warehouse Loaded */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                        1. Physical Warehouse Loaded
                      </span>
                      <div className="text-xl font-black text-white font-mono">
                        {consistency.warehousePackages.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">CTNS</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        {consistency.warehouseGrossWeightKg.toLocaleString()} KG Gross
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 block">
                        Source: Loading Session Barcode Tally
                      </span>
                    </div>

                    {/* Packing List */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                        2. Commercial Packing List
                      </span>
                      <div className="text-xl font-black text-white font-mono">
                        {consistency.packingListPackages.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">CTNS</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        {consistency.packingListGrossWeightKg.toLocaleString()} KG Gross
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 block">
                        Source: Export Processing Factory
                      </span>
                    </div>

                    {/* Bill of Lading */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                        3. Bill of Lading (BOL)
                      </span>
                      <div className="text-xl font-black text-white font-mono">
                        {consistency.bolPackages.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">CTNS</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        {consistency.bolGrossWeightKg.toLocaleString()} KG Gross
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 block">
                        Source: Sky Ariana BOL Master
                      </span>
                    </div>

                    {/* Commercial Invoice */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                        4. Commercial Invoice
                      </span>
                      <div className="text-xl font-black text-white font-mono">
                        {consistency.invoicePackages.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">CTNS</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        {consistency.invoiceGrossWeightKg.toLocaleString()} KG Gross
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 block">
                        Source: Accounting & Finance
                      </span>
                    </div>
                  </div>

                  {/* Audit Finding */}
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide block">
                        Audit Verdict: Complete Invariance Confirmed
                      </span>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {consistency.notes} Physical warehouse count exactly matches the customs declaration, bill of lading, and freight invoice. No unauthorized variance detected.
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* TAB 7: DISPATCHES & GATE PASSES */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Outbound Warehouse Gate Exit Passes & Dispatches
                </h2>
                <p className="text-xs text-slate-400">
                  Authorized cargo releases, driver handover records, and printable gate passes.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Dispatch Ref #</th>
                      <th className="p-3">Exit Date</th>
                      <th className="p-3">BOL Reference</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3">Transport Truck</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3 text-right">Packages</th>
                      <th className="p-3 text-right">Gross Weight</th>
                      <th className="p-3 text-center">Security Seal</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {dispatches.map((dsp) => (
                      <tr key={dsp.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {dsp.dispatchNumber}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {new Date(dsp.dispatchDate).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-500">
                            {new Date(dsp.dispatchDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-white">
                          {dsp.bolNumber}
                        </td>
                        <td className="p-3 font-semibold text-blue-300">
                          {dsp.destination}
                        </td>
                        <td className="p-3 font-mono text-slate-200">
                          {dsp.truckPlate}
                        </td>
                        <td className="p-3 text-slate-300">
                          {dsp.driverName}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-white text-sm">
                          {dsp.packagesDispatched.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-200">
                          {dsp.grossWeightKg.toLocaleString()} kg
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">
                          {dsp.sealNumber || 'Direct Truck'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setPreviewDispatch(dsp)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700 transition"
                          >
                            <Printer className="w-3 h-3 text-emerald-400" />
                            Print Gate Pass
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 5. MODALS & DRAWERS                                                 */}
      {/* =================================================================== */}
      {/* Cargo Receiving Drawer */}
      <CargoReceivingDrawer
        isOpen={isReceivingOpen}
        onClose={() => setIsReceivingOpen(false)}
        onSave={(data) => {
          warehouseCargoService.createReceipt(data)
          setIsReceivingOpen(false)
          refresh()
        }}
      />

      {/* Loading Plan Drawer */}
      <LoadingPlanDrawer
        isOpen={isLoadingPlanOpen}
        onClose={() => setIsLoadingPlanOpen(false)}
        availableLots={lots}
        onSave={(data) => {
          const newPlan = warehouseCargoService.createLoadingPlan(data)
          // Automatically start loading session
          warehouseCargoService.startLoadingSession(newPlan.id, data.supervisorName || 'Warehouse Supervisor')
          setIsLoadingPlanOpen(false)
          refresh()
        }}
      />

      {/* Active Loading & Container Stuffing Modal */}
      {activeLoadingSession && (
        <ActiveLoadingModal
          isOpen={true}
          onClose={() => setActiveLoadingSession(null)}
          plan={activeLoadingSession.plan}
          session={activeLoadingSession.session}
          availableLots={lots}
          onAddQuantity={(lotId, qty) => {
            const res = warehouseCargoService.addLoadedQuantity(
              activeLoadingSession.session.id,
              lotId,
              qty
            )
            if (!res.success) {
              alert(res.error || 'Failed to add loaded quantity')
            }
            refresh()
          }}
          onCompleteSession={(compData) => {
            warehouseCargoService.completeLoadingSession(
              activeLoadingSession.session.id,
              compData
            )
            // Also generate dispatch record automatically if ready
            warehouseCargoService.dispatchCargo({
              dispatchDate: new Date().toISOString(),
              shipmentId: activeLoadingSession.session.shipmentId,
              bolNumber: activeLoadingSession.session.bolNumber,
              warehouseLocationId: 'loc-kdr',
              warehouseName: 'Kandahar Central Export Hub',
              truckPlate: activeLoadingSession.session.truckPlate || '2877 کابل ل',
              driverName: 'Ahmadullah Niazi',
              driverPhone: '+93 79 912 3456',
              containerNumber: activeLoadingSession.session.containerNumber,
              sealNumber: compData.sealNumber,
              packagesDispatched: activeLoadingSession.session.totalPackagesLoaded,
              grossWeightKg: activeLoadingSession.session.totalGrossWeightLoadedKg,
              destination: 'Bandar Abbas Port Terminal Yard',
              documentsHandedOver: ['CMR Waybill', 'Original BOL Copy', 'Weighbridge Slip', 'Commercial Packing List'],
              releasedBy: 'Warehouse Operations Dispatcher',
              notes: compData.notes || 'Full container sealed and departed warehouse premises.',
            })
            setActiveLoadingSession(null)
            refresh()
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustLot && (
        <StockAdjustmentModal
          isOpen={true}
          onClose={() => setAdjustLot(null)}
          lot={adjustLot}
          onAdjust={(lotId, adj, reason, user) => {
            const res = warehouseCargoService.executeStockAdjustment(lotId, adj, reason, user)
            if (!res.success) {
              alert(res.error || 'Adjustment blocked')
            }
            setAdjustLot(null)
            refresh()
          }}
        />
      )}

      {/* Repacking Modal */}
      {repackLot && (
        <RepackingModal
          isOpen={true}
          onClose={() => setRepackLot(null)}
          lot={repackLot}
          onRepack={(repackData) => {
            warehouseCargoService.executeRepacking(repackData)
            setRepackLot(null)
            refresh()
          }}
        />
      )}

      {/* Soft Allocation Modal Quick Dialog */}
      {allocatingLot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">
                  Soft Allocate Cargo Lot
                </h3>
                <span className="font-mono text-xs text-amber-400">
                  {allocatingLot.lotNumber}
                </span>
              </div>
              <button
                onClick={() => setAllocatingLot(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAllocation} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Commodity:</span>
                  <span className="text-slate-200 font-medium">{allocatingLot.commodity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available to Allocate:</span>
                  <span className="text-emerald-400 font-mono font-bold">{allocatingLot.availableQuantity} {allocatingLot.packageType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Physical Remaining:</span>
                  <span className="text-amber-400 font-mono font-bold">{allocatingLot.remainingQuantity} {allocatingLot.packageType}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Target BOL Number:
                </label>
                <input
                  type="text"
                  required
                  value={allocationBol}
                  onChange={(e) => setAllocationBol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Quantity to Reserve ({allocatingLot.packageType}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={allocatingLot.availableQuantity}
                  required
                  value={allocationQty}
                  onChange={(e) => setAllocationQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-2.5 rounded bg-blue-950/20 border border-blue-800/40 text-[11px] text-blue-300">
                Soft allocation reserves stock for shipping documents without changing physical warehouse count until physical loading occurs.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAllocatingLot(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cargo Damage Incident Quick Dialog */}
      {damageLot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase text-rose-400">
                  Report Cargo Damage / Quarantine
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  Lot: {damageLot.lotNumber} ({damageLot.commodity})
                </span>
              </div>
              <button
                onClick={() => setDamageLot(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDamage} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Damage Classification:
                </label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                >
                  <option value="TORN_CARTONS">Torn Cartons / Damaged Packaging</option>
                  <option value="WATER_MOISTURE">Water / Rain Moisture Ingress</option>
                  <option value="CRUSHED_BOXES">Crushed / Squeezed Boxes</option>
                  <option value="OTHER">Other Defect</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Number of Damaged Packages:
                </label>
                <input
                  type="number"
                  min={1}
                  max={damageLot.remainingQuantity}
                  required
                  value={damageQty}
                  onChange={(e) => setDamageQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description of Defect & Condition:
                </label>
                <textarea
                  rows={3}
                  required
                  value={damageDesc}
                  onChange={(e) => setDamageDesc(e.target.value)}
                  placeholder="e.g. 10 cartons arrived with broken corner corners, raisins intact but export packaging torn."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-800/40 text-[11px] text-rose-300">
                Non-destructive action: Stock will be placed on quarantine hold. Physical count will not be removed until authorized repacking or adjustment is executed.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDamageLot(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow"
                >
                  Record Quarantine Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Receipt PDF Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl my-auto">
            <WarehouseReceiptPdf
              receipt={previewReceipt}
              onClose={() => setPreviewReceipt(null)}
            />
          </div>
        </div>
      )}

      {/* Warehouse Dispatch PDF Modal */}
      {previewDispatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl my-auto">
            <WarehouseDispatchPdf
              dispatch={previewDispatch}
              onClose={() => setPreviewDispatch(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
