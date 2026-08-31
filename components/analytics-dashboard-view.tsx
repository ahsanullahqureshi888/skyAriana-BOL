"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  Scale,
  Truck,
  Building2,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  ArrowUpDown,
  Coins,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Container,
  Ship,
  Globe2,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  ExternalLink,
  PieChart as PieChartIcon,
  SlidersHorizontal,
  FileText,
  Activity,
  History,
  Sun,
  Moon,
  Info,
  Check,
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import {
  computeAnalyticsData,
  exportAnalyticsToExcel,
  classifyBolStatus,
  parseAnyDate,
  type AnalyticsDataPayload,
} from "@/lib/services/analytics-service"
import { GeminiDataChatPanel } from "@/components/gemini-data-chat-panel"

const CHART_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#ef4444", // Rose
]

export function AnalyticsDashboardView() {
  const { setView } = useApp()

  // State Management
  const [data, setData] = useState<AnalyticsDataPayload>(() => computeAnalyticsData())
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [shipperFilter, setShipperFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"logistics" | "financials" | "reports" | "explorer">("logistics")
  const [currencyMode, setCurrencyMode] = useState<"USD" | "AFN">("USD")
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Master-Detail Table State
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Refresh Analytics Data
  const refreshData = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      const refreshed = computeAnalyticsData({
        shipperFilter,
        statusFilter,
      })
      setData(refreshed)
      setIsLoading(false)
      toast.success("Executive analytics refreshed successfully")
    }, 200)
  }, [shipperFilter, statusFilter])

  useEffect(() => {
    refreshData()
  }, [shipperFilter, statusFilter, dateFilter])

  // Extract unique shippers for filter dropdown
  const uniqueShippers = useMemo(() => {
    const set = new Set<string>()
    data.rawShipments.forEach((s) => {
      if (s.shipper_name) set.add(s.shipper_name.trim().toUpperCase())
    })
    return Array.from(set).sort()
  }, [data.rawShipments])

  // Filtered Table Rows
  const filteredShipments = useMemo(() => {
    return data.rawShipments.filter((s) => {
      const query = searchQuery.toLowerCase().trim()
      const bNum = (s.bol_number || "").toLowerCase()
      const sName = (s.shipper_name || "").toLowerCase()
      const cName = (s.consignee_name || "").toLowerCase()
      const desc = (s.cargo_description || "").toLowerCase()
      const cont = (s.container_number || s.truck_number || "").toLowerCase()
      const bolStatus = classifyBolStatus(s).toLowerCase()

      const matchesQuery =
        !query ||
        bNum.includes(query) ||
        sName.includes(query) ||
        cName.includes(query) ||
        desc.includes(query) ||
        cont.includes(query)

      const matchesShipper =
        shipperFilter === "all" || sName === shipperFilter.toLowerCase()

      const matchesStatus =
        statusFilter === "all" || bolStatus === statusFilter.toLowerCase()

      return matchesQuery && matchesShipper && matchesStatus
    })
  }, [data.rawShipments, searchQuery, shipperFilter, statusFilter])

  // Dynamic KPI Stats for Filtered Subset
  const filteredStats = useMemo(() => {
    let weight = 0
    let packages = 0
    filteredShipments.forEach((s) => {
      const rawW = parseFloat((s.net_weight || s.gross_weight || "0").replace(/[^0-9.]/g, ""))
      const rawP = parseInt((s.number_of_packages || "0").replace(/[^0-9]/g, ""), 10)
      if (!isNaN(rawW)) weight += rawW
      if (!isNaN(rawP)) packages += rawP
    })
    const invoiced = filteredShipments.length * 3600
    return {
      count: filteredShipments.length,
      weightTons: (weight / 1000).toFixed(1),
      packages,
      invoicedUSD: invoiced,
    }
  }, [filteredShipments])

  // Pagination calculation
  const totalPages = Math.ceil(filteredShipments.length / rowsPerPage) || 1
  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredShipments.slice(start, start + rowsPerPage)
  }, [filteredShipments, currentPage])

  // Currency helper
  const formatMoney = (usd: number) => {
    if (currencyMode === "AFN") {
      const afn = Math.round(usd * data.exchangeRate)
      return `${afn.toLocaleString()} AFN`
    }
    return `$${usd.toLocaleString()} USD`
  }

  // Print Handler
  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-950 dark:text-zinc-50 transition-colors duration-200 p-3 sm:p-6 lg:p-8">
      <div className="max-w-[1780px] mx-auto space-y-6">
        
        {/* ================================================================= */}
        {/* 1. DASHBOARD HEADER & QUICK ACTIONS */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                Sky Ariana Executive Analytics & Data Apps
              </h1>
              <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                ENTERPRISE V3.2
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Multi-source operational intelligence, transit tracking, customer ledger aging, and AI data assistant • سیستم جامع تحلیل و داده‌ها
            </p>
          </div>

          {/* Quick Actions & Copilot Launcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                onClick={() => setCurrencyMode("USD")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currencyMode === "USD"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrencyMode("AFN")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currencyMode === "AFN"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
              >
                AFN (؋)
              </button>
            </div>

            {/* AI Copilot Button */}
            <Button
              onClick={() => setIsChatOpen(true)}
              className="gap-1.5 h-9 px-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm shadow-blue-500/25 cursor-pointer text-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Data Copilot</span>
            </Button>

            {/* Multi-Tab Excel Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAnalyticsToExcel(data)}
              className="gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Export</span>
            </Button>

            {/* Print Report */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReport}
              className="gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer shadow-2xs no-print"
            >
              <Printer className="w-4 h-4 text-zinc-500" />
              <span>Print PDF</span>
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              disabled={isLoading}
              className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-500" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. EXECUTIVE KPI CARDS RIBBON (4 Primary KPI Cards) */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total BOL Shipments */}
          <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs transition-all hover:border-blue-300 dark:hover:border-blue-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Shipments (BOLs)
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 font-mono mt-1">
                  {data.kpis.totalShipments}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                +{data.kpis.shipmentsChangePercent}%
              </span>
              <span className="text-zinc-400 font-medium">{data.kpis.onTimeDeliveryRate}% On-Time SLA</span>
            </div>
          </Card>

          {/* Card 2: Cargo Weight & Packages */}
          <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs transition-all hover:border-emerald-300 dark:hover:border-emerald-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Cargo Weight
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 font-mono mt-1">
                  {(data.kpis.totalCargoWeightKgs / 1000).toFixed(1)} <span className="text-sm font-sans font-semibold text-zinc-400">Tons</span>
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                {data.kpis.totalPackagesCount.toLocaleString()} Units
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {data.kpis.totalContainersCount} Containers
              </span>
            </div>
          </Card>

          {/* Card 3: Invoiced vs Collected Cashflow */}
          <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Invoiced (Debits)
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 font-mono mt-1">
                  {formatMoney(data.kpis.totalGrossReceivablesUSD)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Collected: <strong className="text-emerald-600 font-mono">{formatMoney(data.kpis.totalReceivedUSD)}</strong></span>
              <span className="font-bold font-mono text-zinc-700 dark:text-zinc-300">
                {data.kpis.collectionRatePercent}% Rec.
              </span>
            </div>
          </Card>

          {/* Card 4: Net Outstanding Balance */}
          <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs transition-all hover:border-amber-300 dark:hover:border-amber-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Outstanding Receivables
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  {formatMoney(data.kpis.netOutstandingBalanceUSD)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Rate: <strong className="font-mono">1 USD = {data.exchangeRate} AFN</strong></span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">
                {data.kpis.activeShippersCount} Active Accounts
              </span>
            </div>
          </Card>
        </div>

        {/* ================================================================= */}
        {/* 3. NAVIGATION TABS (4 Core Application Views) */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: "logistics", label: "1. BOL & Logistics Operations", icon: Truck },
            { id: "financials", label: "2. Financial & Ledger Analytics", icon: DollarSign },
            { id: "reports", label: "3. Custom Reporting & Data Grid", icon: FileSpreadsheet },
            { id: "explorer", label: "4. Data Explorer & Audit Logs", icon: History },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: BOL & LOGISTICS OPERATIONS */}
        {/* ================================================================= */}
        {activeTab === "logistics" && (
          <div className="space-y-6">
            
            {/* Status Breakdown Cards (Pending, Dispatched, In Transit, Delivered) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Status: Delivered */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Delivered & Discharged</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200 mt-2">
                  {data.statusBreakdown.delivered} <span className="text-xs font-sans text-emerald-600 font-bold">({data.statusBreakdown.deliveredPct}%)</span>
                </h4>
                <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${data.statusBreakdown.deliveredPct}%` }} />
                </div>
              </div>

              {/* Status: In Transit */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">In Transit / On Ocean Vessel</span>
                  <Ship className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-2xl font-black font-mono text-blue-900 dark:text-blue-200 mt-2">
                  {data.statusBreakdown.inTransit} <span className="text-xs font-sans text-blue-600 font-bold">({data.statusBreakdown.inTransitPct}%)</span>
                </h4>
                <div className="w-full bg-blue-200 dark:bg-blue-900/60 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${data.statusBreakdown.inTransitPct}%` }} />
                </div>
              </div>

              {/* Status: Dispatched */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase">Dispatched / Waybill Issued</span>
                  <Truck className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-200 mt-2">
                  {data.statusBreakdown.dispatched} <span className="text-xs font-sans text-indigo-600 font-bold">({data.statusBreakdown.dispatchedPct}%)</span>
                </h4>
                <div className="w-full bg-indigo-200 dark:bg-indigo-900/60 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${data.statusBreakdown.dispatchedPct}%` }} />
                </div>
              </div>

              {/* Status: Pending / Border Clearance */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Pending / Border Checkpoint</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-2xl font-black font-mono text-amber-900 dark:text-amber-200 mt-2">
                  {data.statusBreakdown.pending + data.statusBreakdown.borderClearance} <span className="text-xs font-sans text-amber-600 font-bold">({data.statusBreakdown.pendingPct + data.statusBreakdown.borderClearancePct}%)</span>
                </h4>
                <div className="w-full bg-amber-200 dark:bg-amber-900/60 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${data.statusBreakdown.pendingPct + data.statusBreakdown.borderClearancePct}%` }} />
                </div>
              </div>
            </div>

            {/* Monthly Shipment Velocity & Invoiced Revenue Trend (1 Chart per row) */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                    Monthly Shipment Velocity & Invoiced Revenue Trend
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Consignment volume growth (Tons & BOLs) against invoiced freight in USD
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Shipments
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Cargo (Tons)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Invoiced ($)
                  </span>
                </div>
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(12, 12, 15, 0.95)",
                        borderColor: "#27272a",
                        borderRadius: "12px",
                        color: "#fafafa",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="shipments"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorShipments)"
                      name="Shipments"
                    />
                    <Area
                      type="monotone"
                      dataKey="weightTons"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorWeight)"
                      name="Weight (Tons)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Transit Corridors & Carrier Performance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* International Corridors */}
              <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
                <div className="mb-4">
                  <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-blue-500" />
                    <span>International Transit Corridors & Lead Times</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Live transit duration and on-time performance across trade borders
                  </p>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {data.corridors.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{c.corridorName}</span>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono text-[10px]">
                          {c.avgTransitDays} Days Avg
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Border: <strong className="text-zinc-700 dark:text-zinc-300">{c.border}</strong></span>
                        <span className="font-mono text-emerald-600 font-bold">{c.onTimeRate}% On-Time</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Equipment & Cargo Category Distribution */}
              <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
                <div className="mb-4">
                  <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                    <Container className="w-4 h-4 text-emerald-500" />
                    <span>Equipment & Container Distribution</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Volume breakdown by container size (40HQ, 40RF, 20GP, Transit Trucks)
                  </p>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {data.carriers.map((car, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{car.equipmentType}</span>
                        <p className="text-[11px] text-zinc-400">{car.weightTons} Tons Handled</p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{car.count} Units</span>
                        <span className="text-[11px] text-zinc-400 block">{car.percentage}% share</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: FINANCIAL & LEDGER ANALYTICS */}
        {/* ================================================================= */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            
            {/* Monthly Inflow vs Outflow Cashflow Timeline (1 Chart per row) */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Monthly Inflow (Credits) vs Outflow (Debits) Timeline
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Financial cashflow timeline and net balance progression across all accounts
                </p>
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.cashflow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                    <XAxis dataKey="period" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(12, 12, 15, 0.95)",
                        borderColor: "#27272a",
                        borderRadius: "12px",
                        color: "#fafafa",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="debits" name="Debits / Billed ($)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="credits" name="Credits / Received ($)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="netChange" name="Net Change ($)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Receivables Aging 4-Tier Breakdown */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Accounts Receivables Aging Distribution
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Analysis of unpaid balances by duration to manage cash recovery risk
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.agingBuckets.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40"
                  >
                    <span className="text-xs font-bold text-zinc-500 uppercase">{b.range}</span>
                    <h4 className="text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1">
                      {formatMoney(b.amountUSD)}
                    </h4>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full ${
                          idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${b.percentage}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1.5 block font-medium">
                      {b.percentage}% of outstanding portfolio
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Debtors & Credit Risk Ranking Table */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Customer Debtors & Aging Profile
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ranked by outstanding receivables and collection risk category
                </p>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Customer / Shipper</th>
                      <th className="p-3 text-center">Shipments</th>
                      <th className="p-3 text-right">Total Billed</th>
                      <th className="p-3 text-right">Total Paid</th>
                      <th className="p-3 text-right">Net Balance</th>
                      <th className="p-3 text-center">Aging Tier</th>
                      <th className="p-3 text-center">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {data.debtorProfiles.map((d, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{d.shipperName}</td>
                        <td className="p-3 text-center font-mono">{d.shipmentCount}</td>
                        <td className="p-3 text-right font-mono">{formatMoney(d.totalBilledUSD)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-semibold">{formatMoney(d.totalPaidUSD)}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-600">{formatMoney(d.netBalanceUSD)}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {d.agingTier}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={
                              d.riskLevel === "Critical"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : d.riskLevel === "High"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }
                          >
                            {d.riskLevel}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: CUSTOM REPORTING & FILTERABLE DATA GRID */}
        {/* ================================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            
            {/* Multi-Dimensional Filter Toolbar */}
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                    Multi-Dimensional Filter Controls
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reset Filters */}
                  {(shipperFilter !== "all" || statusFilter !== "all" || searchQuery !== "") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShipperFilter("all")
                        setStatusFilter("all")
                        setSearchQuery("")
                        setCurrentPage(1)
                      }}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter inputs grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Search BOL #, Shipper, Cargo..."
                    className="pl-9 h-9 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                {/* Shipper Filter */}
                <select
                  value={shipperFilter}
                  onChange={(e) => {
                    setShipperFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Shippers / Exporters</option>
                  {uniqueShippers.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Shipment Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="in transit">In Transit</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="border clearance">Border Clearance</option>
                  <option value="pending">Pending</option>
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Time / Complete History</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="thisyear">Current Year (2026)</option>
                </select>
              </div>

              {/* Dynamic Filter Summary Bar */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs flex-wrap gap-2 text-zinc-500">
                <div className="flex items-center gap-4">
                  <span>Filtered: <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{filteredStats.count} BOLs</strong></span>
                  <span>Tonnage: <strong className="text-emerald-600 font-mono">{filteredStats.weightTons} Tons</strong></span>
                  <span>Est. Freight: <strong className="text-blue-600 font-mono">{formatMoney(filteredStats.invoicedUSD)}</strong></span>
                </div>
                <span className="text-[11px] text-zinc-400">Click any row to open full particulars</span>
              </div>
            </div>

            {/* Master Data Grid Table */}
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex gap-4 items-start transition-all duration-300">
                
                {/* Table Container */}
                <div className={`transition-all duration-300 overflow-x-auto ${selectedShipment ? "w-full lg:w-2/3" : "w-full"}`}>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">BOL Number</th>
                          <th className="p-3">Issue Date</th>
                          <th className="p-3">Shipper</th>
                          <th className="p-3">Consignee</th>
                          <th className="p-3">Cargo Description</th>
                          <th className="p-3 text-right">Weight / Pkg</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-sans">
                        {paginatedShipments.length > 0 ? (
                          paginatedShipments.map((s, idx) => {
                            const isSelected = selectedShipment?.id === s.id || selectedShipment?.bol_number === s.bol_number
                            const status = classifyBolStatus(s)
                            return (
                              <tr
                                key={idx}
                                onClick={() => setSelectedShipment(isSelected ? null : s)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                    : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                                }`}
                              >
                                <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  {s.bol_number || "BOL-UNTITLED"}
                                </td>
                                <td className="p-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                  {s.issue_date || "—"}
                                </td>
                                <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100 max-w-[140px] truncate">
                                  {s.shipper_name || "—"}
                                </td>
                                <td className="p-3 text-zinc-700 dark:text-zinc-300 max-w-[140px] truncate">
                                  {s.consignee_name || "—"}
                                </td>
                                <td className="p-3 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                                  {s.cargo_description || s.number_of_packages || "—"}
                                </td>
                                <td className="p-3 text-right font-mono whitespace-nowrap">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {s.net_weight || s.gross_weight || "—"}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    className={
                                      status === "Delivered"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                        : status === "In Transit"
                                        ? "bg-blue-50 text-blue-700 border-blue-300"
                                        : status === "Dispatched"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                                        : "bg-amber-50 text-amber-700 border-amber-300"
                                    }
                                  >
                                    {status}
                                  </Badge>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-zinc-400">
                              No matching shipments found. Try clearing your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between pt-3 text-xs text-zinc-500">
                    <span>
                      Page {currentPage} of {totalPages} ({filteredShipments.length} total)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-7 w-7 rounded-lg"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-7 w-7 rounded-lg"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-7 w-7 rounded-lg"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-7 w-7 rounded-lg"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Side Inspection Drawer */}
                {selectedShipment && (
                  <div className="w-full lg:w-1/3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] font-bold font-mono uppercase text-blue-600">
                          {selectedShipment.bol_number}
                        </span>
                        <h4 className="font-black text-sm text-zinc-950 dark:text-zinc-50">
                          Consignment Particulars
                        </h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedShipment(null)}
                        className="h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Shipper</span>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {selectedShipment.shipper_name || "—"}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Consignee</span>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {selectedShipment.consignee_name || "—"}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Cargo & Weight</span>
                        <p className="text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {selectedShipment.cargo_description || selectedShipment.number_of_packages || "—"}
                        </p>
                        <p className="font-mono text-[11px] font-bold text-emerald-600 mt-1">
                          Net: {selectedShipment.net_weight || "—"} | Gross: {selectedShipment.gross_weight || "—"}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Container / Truck</span>
                        <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {selectedShipment.container_number || selectedShipment.truck_number || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setView("bol")
                          toast.success(`Opening ${selectedShipment.bol_number} in BOL Editor`)
                        }}
                        className="w-full h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Open in BOL Editor
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: INTERACTIVE DATA EXPLORER & AUDIT LOGS */}
        {/* ================================================================= */}
        {activeTab === "explorer" && (
          <div className="space-y-6">
            
            {/* Full-Text Universal Search & Audit Log Timeline */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    <span>Real-Time Audit Trail & Operational Events</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Chronological activity history across Bills of Lading, Account Ledgers, and Invoices
                  </p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-xs">
                  {data.auditLogs.length} Events Logged
                </Badge>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {data.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mt-0.5">
                        <History className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{log.entityRef}</span>
                          <Badge
                            className={
                              log.action === "Delivered"
                                ? "bg-emerald-100 text-emerald-800 text-[10px]"
                                : log.action === "Payment Posted"
                                ? "bg-blue-100 text-blue-800 text-[10px]"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 text-[10px]"
                            }
                          >
                            {log.action}
                          </Badge>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap text-[11px] text-zinc-400">
                      <span className="font-mono">{log.timestamp}</span>
                      <span className="block text-[10px]">{log.user}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* ================================================================= */}
      {/* 5. GEMINI DATA CHAT PANEL SLIDE-OVER */}
      {/* ================================================================= */}
      <GeminiDataChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        analyticsData={data}
      />
    </div>
  )
}
