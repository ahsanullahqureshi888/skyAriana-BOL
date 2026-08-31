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
  X,
  ExternalLink,
  PieChart as PieChartIcon,
  SlidersHorizontal,
  Sun,
  Moon,
  Info,
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
  const [dateFilter, setDateFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"overview" | "shippers" | "cashflow" | "commodities">("overview")
  const [currencyMode, setCurrencyMode] = useState<"USD" | "AFN">("USD")
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Master-Detail Table State
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 12

  // Refresh Analytics Data
  const refreshData = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      const refreshed = computeAnalyticsData({
        shipperFilter,
      })
      setData(refreshed)
      setIsLoading(false)
      toast.success("Analytics data updated successfully")
    }, 250)
  }, [shipperFilter])

  useEffect(() => {
    refreshData()
  }, [shipperFilter, dateFilter])

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
      if (!query) return true
      const bNum = (s.bol_number || "").toLowerCase()
      const sName = (s.shipper_name || "").toLowerCase()
      const cName = (s.consignee_name || "").toLowerCase()
      const desc = (s.cargo_description || "").toLowerCase()
      const cont = (s.container_number || s.truck_number || "").toLowerCase()
      return (
        bNum.includes(query) ||
        sName.includes(query) ||
        cName.includes(query) ||
        desc.includes(query) ||
        cont.includes(query)
      )
    })
  }, [data.rawShipments, searchQuery])

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-950 dark:text-zinc-50 transition-colors duration-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1720px] mx-auto space-y-6">
        
        {/* ================================================================= */}
        {/* 1. DASHBOARD HEADER & CONTROLS */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                Sky Ariana Executive Analytics
              </h1>
              <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                LIVE V3.2
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Multi-source intelligence for Bills of Lading, Account Ledgers, and Cashflow Statements • سیستم جامع تحلیل و داده‌ها
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

            {/* Excel Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAnalyticsToExcel(data)}
              className="gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Export</span>
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
        {/* 2. EXECUTIVE KPI CARDS (4 Cards Grid) */}
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
              <span className="text-zinc-400 font-medium">vs prior period</span>
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
                {data.kpis.totalPackagesCount.toLocaleString()} Cartons/Bags
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
                {data.kpis.activeShippersCount} Active Shippers
              </span>
            </div>
          </Card>
        </div>

        {/* ================================================================= */}
        {/* 3. NAVIGATION TABS FOR ANALYTICAL VIEWS */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview & Monthly Trends", icon: TrendingUp },
            { id: "shippers", label: "Shipper Volume & Aging", icon: Building2 },
            { id: "cashflow", label: "Cashflow & Financial Ledgers", icon: DollarSign },
            { id: "commodities", label: "Commodities & Logistics Distribution", icon: Boxes },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
        {/* 4. VISUALIZATION SECTION: 1 CHART PER ROW STANDARD */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Monthly Shipment Velocity & Invoiced Revenue Trend
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tracking consignment growth (Tons & Shipments) against total invoiced freight in USD
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
        )}

        {activeTab === "shippers" && (
          <div className="space-y-6">
            {/* Top 10 Shippers Volume */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Top 10 Shippers by Cargo Weight & Consignment Count
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ranked by total handled cargo volume (KGs) across all trade routes
                </p>
              </div>

              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topShippers}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                    <XAxis type="number" stroke="#71717a" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} width={160} />
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
                    <Bar dataKey="totalWeightKgs" name="Total Cargo Weight (KG)" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="packages" name="Packages (Cartons)" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Receivables Aging Breakdown */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Accounts Receivables Aging Distribution
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Analysis of unpaid balances by duration to manage cash recovery risk
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        )}

        {activeTab === "cashflow" && (
          <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
            <div className="mb-6">
              <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                Monthly Inflow (Credits) vs Outflow (Debits) Timeline
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Financial cashflow timeline and net balance progression across all accounts
              </p>
            </div>

            <div className="h-[380px] w-full">
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
        )}

        {activeTab === "commodities" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commodity Breakdown Donut Chart */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Cargo Commodity Category Distribution
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tonnage breakdown by product type (Dried Figs, Raisins, Apricots, Almonds, Pistachios)
                </p>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.commodities}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="name"
                    >
                      {data.commodities.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Consignee Ranking */}
            <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
              <div className="mb-6">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Top Consignees & Receiving Parties
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Leading receivers and delivery destinations across international ports
                </p>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[320px] pr-2">
                {data.topConsignees.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{c.name}</span>
                        <p className="text-[11px] text-zinc-400">{c.packages.toLocaleString()} Cartons</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {c.shipments} Shipments
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. MASTER-DETAIL DATA TABLE & INVESTIGATION SIDE PANEL */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          
          {/* Table Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <span>Shipment Records & Master Ledger Explorer</span>
                <span className="text-xs font-mono font-normal text-zinc-400">
                  ({filteredShipments.length} matching)
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click any row to open the deep investigation panel with full consignment particulars
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative min-w-[200px] sm:min-w-[240px]">
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

              {/* Shipper Dropdown Filter */}
              <select
                value={shipperFilter}
                onChange={(e) => {
                  setShipperFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Shippers</option>
                {uniqueShippers.map((s, idx) => (
                  <option key={idx} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Master-Detail Split View Container */}
          <div className="flex gap-4 items-start transition-all duration-300">
            
            {/* Primary Table (Full width or 2/3 when side panel is open) */}
            <div className={`transition-all duration-300 overflow-x-auto ${selectedShipment ? "w-full lg:w-2/3" : "w-full"}`}>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">BOL Number</th>
                      <th className="p-3">Date</th>
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
                            <td className="p-3 text-zinc-500 dark:text-zinc-400 max-w-[180px] truncate">
                              {s.cargo_description || s.number_of_packages || "—"}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold whitespace-nowrap">
                              {s.net_weight || s.gross_weight || "—"}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]">
                                Verified
                              </Badge>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-400">
                          No shipment records found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              <div className="flex items-center justify-between pt-3 text-xs text-zinc-500">
                <span>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredShipments.length} records)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Investigation Side Panel (Slides in when selected) */}
            {selectedShipment && (
              <div className="w-full lg:w-1/3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-950 dark:text-zinc-50">
                        Consignment Deep Dive
                      </h4>
                      <span className="font-mono text-[11px] font-bold text-blue-600">
                        {selectedShipment.bol_number}
                      </span>
                    </div>
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

                {/* Details Breakdown Cards */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Shipper / Exporter</span>
                    <p className="font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {selectedShipment.shipper_name || "—"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Consignee / Receiver</span>
                    <p className="font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {selectedShipment.consignee_name || "—"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Cargo & Packaging</span>
                    <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">
                      {selectedShipment.cargo_description || selectedShipment.number_of_packages || "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Net Weight</span>
                      <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {selectedShipment.net_weight || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Container / Truck</span>
                      <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {selectedShipment.container_number || selectedShipment.truck_number || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Transit Corridors</span>
                    <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">
                      {selectedShipment.port_of_loading || "Bandar Abbas / Chabahar"} ➔ {selectedShipment.place_of_delivery || "Nhava Sheva / Jebel Ali"}
                    </p>
                  </div>
                </div>

                {/* Quick Action Shortcuts */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setView("accounts")
                      toast.success("Navigating to Account Ledgers")
                    }}
                    className="w-full h-8 text-xs font-bold bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                    View Associated Ledger
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================================================================= */}
      {/* 6. GEMINI DATA CHAT PANEL SLIDE-OVER */}
      {/* ================================================================= */}
      <GeminiDataChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        analyticsData={data}
      />
    </div>
  )
}
