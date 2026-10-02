"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  RateMasterRecord,
  QuotationRecord,
  ContainerType,
  ChargeMasterItem,
} from '@/lib/types/freight-pricing'
import { freightPricingService } from '@/lib/services/freight-pricing-service'
import { RateEditorDrawer } from '@/components/pricing/rate-editor-drawer'
import { QuotationBuilderDrawer } from '@/components/pricing/quotation-builder-drawer'
import { QuotationDetailModal } from '@/components/pricing/quotation-detail-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tag,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRightCircle,
  Eye,
  MessageSquare,
  Edit2,
  Trash2,
  RotateCcw,
  Layers,
  Coins,
  ShieldCheck,
  Building,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

type TabType = 'RATES' | 'QUOTES' | 'MATRIX' | 'CARRIERS' | 'CHARGES'

export function RatesQuotationsCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('RATES')
  const [rates, setRates] = useState<RateMasterRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [charges, setCharges] = useState<ChargeMasterItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [containerFilter, setContainerFilter] = useState<string>('ALL')

  // Modals
  const [isRateEditorOpen, setIsRateEditorOpen] = useState(false)
  const [selectedRateForEdit, setSelectedRateForEdit] = useState<RateMasterRecord | null>(null)

  const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false)
  const [selectedQuoteForEdit, setSelectedQuoteForEdit] = useState<QuotationRecord | null>(null)

  const [isQuoteDetailOpen, setIsQuoteDetailOpen] = useState(false)
  const [selectedQuoteForDetail, setSelectedQuoteForDetail] = useState<QuotationRecord | null>(null)

  const reloadData = () => {
    setRates(freightPricingService.getRates())
    setQuotations(freightPricingService.getQuotations())
    setCharges(freightPricingService.getChargeMaster())
  }

  useEffect(() => {
    reloadData()

    const handleUpdate = () => reloadData()
    window.addEventListener('skybol:rates-updated', handleUpdate)
    return () => window.removeEventListener('skybol:rates-updated', handleUpdate)
  }, [])

  // KPI Calculations
  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const activeRatesCount = useMemo(
    () => rates.filter((r) => r.isActive && (!r.validUntil || r.validUntil >= today)).length,
    [rates, today]
  )

  const expiringSoonCount = useMemo(
    () => rates.filter((r) => r.isActive && r.validUntil >= today && r.validUntil <= in30Days).length,
    [rates, today, in30Days]
  )

  const expiredRatesCount = useMemo(
    () => rates.filter((r) => r.validUntil && r.validUntil < today).length,
    [rates, today]
  )

  const openQuotesCount = useMemo(
    () => quotations.filter((q) => q.status === 'DRAFT' || q.status === 'PENDING_APPROVAL').length,
    [quotations]
  )

  const acceptedQuotesCount = useMemo(
    () => quotations.filter((q) => q.status === 'ACCEPTED' || q.status === 'CONVERTED').length,
    [quotations]
  )

  const convertedCount = useMemo(
    () => quotations.filter((q) => q.status === 'CONVERTED').length,
    [quotations]
  )

  // Filtered Rates
  const filteredRates = useMemo(() => {
    let list = rates
    if (containerFilter !== 'ALL') {
      list = list.filter((r) => r.containerType === containerFilter)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.rateCode.toLowerCase().includes(q) ||
          r.originName.toLowerCase().includes(q) ||
          r.destinationName.toLowerCase().includes(q) ||
          (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
          (r.customerName && r.customerName.toLowerCase().includes(q))
      )
    }
    return list
  }, [rates, containerFilter, searchTerm])

  // Filtered Quotes
  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return quotations
    const q = searchTerm.trim().toLowerCase()
    return quotations.filter(
      (qt) =>
        qt.quotationNumber.toLowerCase().includes(q) ||
        qt.customerName.toLowerCase().includes(q) ||
        qt.originName.toLowerCase().includes(q) ||
        qt.destinationName.toLowerCase().includes(q) ||
        (qt.commodity && qt.commodity.toLowerCase().includes(q))
    )
  }, [quotations, searchTerm])

  const handleDeleteRate = (id: string, name: string) => {
    if (confirm(`Delete rate card "${name}"?`)) {
      freightPricingService.deleteRate(id)
      reloadData()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 text-slate-900 dark:text-slate-100 space-y-6 max-w-[1850px] mx-auto">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & PRIMARY ACTIONS                                       */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
                RATES, QUOTATIONS & FREIGHT PRICING CENTER
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Freight Rates • Customer Offers • Costs • Margins • Validity
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectedQuoteForEdit(null)
              setIsQuoteBuilderOpen(true)
            }}
            className="h-9 sm:h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            + New Quote
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedRateForEdit(null)
              setIsRateEditorOpen(true)
            }}
            className="hidden sm:inline-flex h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Tag className="h-3.5 w-3.5 mr-1" />
            + New Rate Card
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="sm:hidden h-9 w-9 p-0 border-slate-200 dark:border-slate-800"
                title="More Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedRateForEdit(null)
                  setIsRateEditorOpen(true)
                }}
                className="cursor-pointer gap-2 font-medium text-xs"
              >
                <Tag className="h-3.5 w-3.5 text-blue-600" />
                + New Rate Card
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => reloadData()}
                className="cursor-pointer gap-2 font-medium text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
                Refresh Rates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN DASHBOARD KPI CARDS                                           */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Active Rate Cards</span>
            <Tag className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-black mt-1 text-slate-900 dark:text-slate-100">
            {activeRatesCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Expiring Soon (30d)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black mt-1 text-amber-600">
            {expiringSoonCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Expired Rates</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-black mt-1 text-rose-600">
            {expiredRatesCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Open Quotations</span>
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black mt-1 text-indigo-600">
            {openQuotesCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Accepted Quotes</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black mt-1 text-emerald-600">
            {acceptedQuotesCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Converted to BOL</span>
            <ArrowRightCircle className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-black mt-1 text-purple-600">
            {convertedCount}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. NAVIGATION TABS                                                    */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('RATES')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'RATES'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Active Rates ({rates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QUOTES')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'QUOTES'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Quotations Register ({quotations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MATRIX')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'MATRIX'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Rate Matrix View
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CARRIERS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'CARRIERS'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Carrier Buy Comparison
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CHARGES')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'CHARGES'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Charge Master ({charges.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by route, customer, carrier, commodity, or reference code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        {activeTab === 'RATES' && (
          <div className="w-full sm:w-44">
            <Select value={containerFilter} onValueChange={setContainerFilter}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                <SelectValue placeholder="All Containers" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">All Equipment</SelectItem>
                <SelectItem value="40HC">40' High Cube</SelectItem>
                <SelectItem value="40RF">40' Reefer</SelectItem>
                <SelectItem value="20GP">20' General Purpose</SelectItem>
                <SelectItem value="20RF">20' Reefer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 4. TAB CONTENTS                                                       */}
      {/* ===================================================================== */}

      {/* --- TAB: ACTIVE RATES --- */}
      {activeTab === 'RATES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
          {/* Mobile Structured Cards (< md) */}
          <div className="md:hidden space-y-3 p-3">
            {filteredRates.map((rate) => {
              const grossMargin = rate.baseSellRate - rate.baseBuyRate
              const marginPct = rate.baseSellRate > 0 ? Number(((grossMargin / rate.baseSellRate) * 100).toFixed(1)) : 0
              const isExpired = rate.validUntil && rate.validUntil < today

              return (
                <div
                  key={rate.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{rate.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {rate.rateCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {rate.originName} → {rate.destinationName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-bold font-mono text-[11px] shrink-0">
                      {rate.containerType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Scope / Mode</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {rate.serviceType.replace('_', ' ')} • {rate.transportMode}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Party</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                        {rate.customerName ? `Cust: ${rate.customerName}` : (rate.supplierName || 'Standard Market')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 text-center">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Quoted Sell</div>
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                        {rate.currency} {rate.baseSellRate.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-rose-500">Buy Cost</div>
                      <div className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                        {rate.currency} {rate.baseBuyRate.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-emerald-600">Est. Margin</div>
                      <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        +{grossMargin.toLocaleString()} ({marginPct}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Valid:</span>
                      <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {rate.validUntil || 'Open'}
                      </span>
                      {isExpired && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[9px] font-bold">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRateForEdit(rate)
                          setIsRateEditorOpen(true)
                        }}
                        className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRate(rate.id, rate.name)}
                        className="h-8 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredRates.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No rates found matching criteria.
              </div>
            )}
          </div>

          {/* Desktop Table (hidden on mobile, visible >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Route / Rate Name</th>
                  <th className="py-2.5 px-3">Equipment</th>
                  <th className="py-2.5 px-3">Scope / Mode</th>
                  <th className="py-2.5 px-3">Supplier / Customer</th>
                  <th className="py-2.5 px-3 text-right">Quoted Sell</th>
                  <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">Buy Cost</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Est. Margin</th>
                  <th className="py-2.5 px-3">Valid Until</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRates.map((rate) => {
                  const grossMargin = rate.baseSellRate - rate.baseBuyRate
                  const marginPct = rate.baseSellRate > 0 ? Number(((grossMargin / rate.baseSellRate) * 100).toFixed(1)) : 0
                  const isExpired = rate.validUntil && rate.validUntil < today

                  return (
                    <tr key={rate.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{rate.name}</span>
                          <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                            {rate.rateCode}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rate.originName} → {rate.destinationName}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-bold font-mono text-[10px]">
                          {rate.containerType}
                        </span>
                        {rate.reeferDetails && (
                          <span className="ml-1 text-[10px] text-cyan-600 font-semibold">
                            ❄️ {rate.reeferDetails.temperatureRange}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                          {rate.serviceType.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-slate-400">{rate.transportMode}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        {rate.customerName ? (
                          <span className="text-purple-600 font-semibold">
                            Cust: {rate.customerName}
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">
                            {rate.supplierName || 'Standard Market'}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {rate.currency} {rate.baseSellRate.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        {rate.currency} {rate.baseBuyRate.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{grossMargin.toLocaleString()} ({marginPct}%)
                      </td>

                      <td className="py-2.5 px-3">
                        <div className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                          {rate.validUntil}
                        </div>
                        {isExpired && (
                          <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">
                            EXPIRED
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRateForEdit(rate)
                              setIsRateEditorOpen(true)
                            }}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            title="Edit Rate Card"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRate(rate.id, rate.name)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-red-600"
                            title="Delete Rate"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredRates.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No rates found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: QUOTATIONS REGISTER --- */}
      {activeTab === 'QUOTES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
          {/* Mobile Structured Cards (< md) */}
          <div className="md:hidden space-y-3 p-3">
            {filteredQuotes.map((q) => (
              <div
                key={q.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span>{q.quotationNumber}</span>
                      {q.revision > 1 && (
                        <span className="text-[10px] text-blue-600 font-sans px-1 bg-blue-50 dark:bg-blue-950/60 rounded">
                          R{q.revision}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {q.customerName}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      q.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : q.status === 'CONVERTED'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                        : q.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : q.status === 'SENT'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 py-1.5 border-y border-slate-100 dark:border-slate-800/80">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {q.originName} → {q.destinationName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{q.containerQuantity} × {q.containerType}</span>
                    {q.commodity && <span>• {q.commodity}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 text-center">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400">Total Price</div>
                    <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                      {q.currency} {q.totalSellPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-emerald-600">Est. Margin</div>
                    <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      +{q.estimatedGrossMargin.toLocaleString()} ({q.marginPercentage}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <div className="text-[11px] text-slate-500">
                    Valid: <span className="font-medium text-slate-700 dark:text-slate-300">{q.validUntil}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedQuoteForDetail(q)
                      setIsQuoteDetailOpen(true)
                    }}
                    className="h-8 px-3 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                  </Button>
                </div>
              </div>
            ))}

            {filteredQuotes.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No quotations found.
              </div>
            )}
          </div>

          {/* Desktop Table (hidden on mobile, visible >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Quotation Ref</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Routing & Commodity</th>
                  <th className="py-2.5 px-3">Equipment</th>
                  <th className="py-2.5 px-3 text-right">Total Price</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Est. Margin</th>
                  <th className="py-2.5 px-3">Valid Until</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                      {q.quotationNumber}
                      {q.revision > 1 && (
                        <span className="ml-1 text-[10px] text-blue-600">R{q.revision}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{q.customerName}</div>
                      {q.customerContact && (
                        <div className="text-[10px] text-slate-400">{q.customerContact}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {q.originName} → {q.destinationName}
                      </div>
                      {q.commodity && (
                        <div className="text-[10px] text-slate-500">{q.commodity}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-semibold">
                      {q.containerQuantity} × {q.containerType}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {q.currency} {q.totalSellPrice.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{q.estimatedGrossMargin.toLocaleString()} ({q.marginPercentage}%)
                    </td>

                    <td className="py-2.5 px-3 text-slate-500">{q.validUntil}</td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : q.status === 'CONVERTED'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : q.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : q.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuoteForDetail(q)
                          setIsQuoteDetailOpen(true)
                        }}
                        className="h-7 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredQuotes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No quotations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: RATE MATRIX VIEW --- */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Corridor Rate Matrix (Sell Rates by Equipment)
            </h3>
            <p className="text-xs text-slate-500">
              Quick comparative pricing grid across major commercial trade routes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">Trade Corridor</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right">40' High Cube (40HC)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right text-cyan-600">40' Reefer (40RF)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-right">20' Dry (20GP)</th>
                  <th className="py-2.5 px-3 text-center">Typical Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                    Nhava Sheva (JNPT) → Kabul ICD
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold">
                    USD 7,500
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-cyan-700 dark:text-cyan-300">
                    USD 11,400
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-500">
                    USD 5,200
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-blue-600">
                    Multimodal (Full Way)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                    Bandar Abbas Port → Kabul ICD
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold">
                    USD 5,350
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-cyan-700 dark:text-cyan-300">
                    USD 7,800
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-500">
                    USD 3,800
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-blue-600">
                    Road Transit (Port to Door)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                    Karachi Port → Kandahar ICD
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold">
                    USD 3,650
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-cyan-700 dark:text-cyan-300">
                    USD 5,400
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-500">
                    USD 2,400
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-blue-600">
                    Road Transit (Chaman Route)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: CARRIER BUY COMPARISON --- */}
      {activeTab === 'CARRIERS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Carrier & Transporter Buy-Rate Comparison Desk
            </h3>
            <p className="text-xs text-slate-500">
              Objective comparison of supplier costs, free days, and validity dates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-slate-100">
                <span>Maersk Ocean Carrier</span>
                <span className="font-mono text-blue-600">USD 2,600 / 40HC</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Route: Nhava Sheva to Bandar Abbas</p>
              <div className="mt-2 text-[10px] text-slate-400">Free Days: 14 • Valid: 2026-12-31</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-slate-100">
                <span>MSC Mediterranean</span>
                <span className="font-mono text-blue-600">USD 2,520 / 40HC</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Route: Nhava Sheva to Bandar Abbas</p>
              <div className="mt-2 text-[10px] text-slate-400">Free Days: 10 • Valid: 2026-12-31</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-slate-100">
                <span>Herat Truckers Co-op</span>
                <span className="font-mono text-blue-600">USD 4,200 / Truck</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Route: Bandar Abbas to Kabul ICD</p>
              <div className="mt-2 text-[10px] text-slate-400">Free Days: 7 • Valid: 2026-12-31</div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: CHARGE MASTER --- */}
      {activeTab === 'CHARGES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Standard Logistics Charge Master
              </h3>
              <p className="text-xs text-slate-500">
                Configurable charge codes used across quotations, invoices, and supplier rate sheets.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {charges.map((c) => (
              <div
                key={c.code}
                className="p-2.5 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{c.name}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    Code: {c.code} • Category: {c.category}
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  {c.defaultCurrency} / {c.defaultUnit.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL DIALOGS                                                      */}
      {/* ===================================================================== */}
      {isRateEditorOpen && (
        <RateEditorDrawer
          open={isRateEditorOpen}
          onClose={() => {
            setIsRateEditorOpen(false)
            setSelectedRateForEdit(null)
          }}
          onSaved={() => reloadData()}
          initialRate={selectedRateForEdit}
        />
      )}

      {isQuoteBuilderOpen && (
        <QuotationBuilderDrawer
          open={isQuoteBuilderOpen}
          onClose={() => {
            setIsQuoteBuilderOpen(false)
            setSelectedQuoteForEdit(null)
          }}
          onSaved={() => reloadData()}
          initialQuote={selectedQuoteForEdit}
        />
      )}

      {isQuoteDetailOpen && selectedQuoteForDetail && (
        <QuotationDetailModal
          open={isQuoteDetailOpen}
          onClose={() => {
            setIsQuoteDetailOpen(false)
            setSelectedQuoteForDetail(null)
          }}
          quotation={selectedQuoteForDetail}
          onUpdated={() => reloadData()}
        />
      )}
    </div>
  )
}
