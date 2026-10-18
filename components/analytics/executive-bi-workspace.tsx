"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  Truck,
  Ship,
  Plane,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Search,
  ChevronRight,
  Info,
  Layers,
  ArrowUpDown,
  Lock,
  ExternalLink,
  CheckCircle2,
  X,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  FileText,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"
import {
  ExecutiveBiFilters,
  ExecutiveBiPayload,
  KpiCardData,
  AnalyticsPeriodPreset,
  AnalyticsComparisonMode,
  ExecutiveDrilldownRecord,
  OperationalAttentionItem,
} from "@/lib/types/executive-bi"
import { ExecutiveManagementPackView } from "./executive-management-pack-view"

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

export function ExecutiveBiWorkspace() {
  const { currentUser, setView } = useApp()
  const userRole = currentUser?.role || "admin"

  // Global Period & Comparison State
  const [period, setPeriod] = useState<AnalyticsPeriodPreset>("this_month")
  const [comparison, setComparison] = useState<AnalyticsComparisonMode>("prev_month")
  const [currencyMode, setCurrencyMode] = useState<"segregated" | "USD" | "AFN" | "AED">("segregated")

  // Global Filter State
  const [customerFilter, setCustomerFilter] = useState("all")
  const [routeFilter, setRouteFilter] = useState("all")
  const [modeFilter, setModeFilter] = useState<"all" | "road" | "sea" | "air" | "multimodal">("all")
  const [commodityFilter, setCommodityFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Active Tab
  const [activeTab, setActiveTab] = useState("overview")

  // Data & Loading State
  const [payload, setPayload] = useState<ExecutiveBiPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  // Drilldown Drawer State
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownKpi, setDrilldownKpi] = useState<string | null>(null)
  const [drilldownTitle, setDrilldownTitle] = useState("")
  const [drilldownRecords, setDrilldownRecords] = useState<ExecutiveDrilldownRecord[]>([])
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false)

  // Printable Management Pack Modal State
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Fetch Executive BI Payload
  const fetchExecutiveData = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const params = new URLSearchParams({
        period,
        comparison,
        currencyMode,
        role: userRole,
      })
      if (customerFilter !== "all") params.set("customer", customerFilter)
      if (routeFilter !== "all") params.set("route", routeFilter)
      if (modeFilter !== "all") params.set("mode", modeFilter)
      if (commodityFilter !== "all") params.set("commodity", commodityFilter)
      if (supplierFilter !== "all") params.set("supplier", supplierFilter)

      const res = await fetch(`/api/analytics/executive?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load executive analytics")
      const json = await res.json()
      if (json.success && json.data) {
        setPayload(json.data)
        setLastRefreshedAt(new Date())
        if (isManualRefresh) {
          toast.success("Executive BI data refreshed from canonical records")
        }
      }
    } catch (e: any) {
      console.error("[Executive BI] fetch error:", e)
      toast.error("Error loading analytics data: " + (e.message || "Unknown error"))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [period, comparison, currencyMode, customerFilter, routeFilter, modeFilter, commodityFilter, supplierFilter, userRole])

  useEffect(() => {
    fetchExecutiveData()
  }, [fetchExecutiveData])

  // Rebuild Derived Cache
  const handleRebuildCache = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch("/api/analytics/executive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          comparison,
          currencyMode,
          role: userRole,
          customer: customerFilter !== "all" ? customerFilter : undefined,
          route: routeFilter !== "all" ? routeFilter : undefined,
          mode: modeFilter !== "all" ? modeFilter : undefined,
        }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setPayload(json.data)
        setLastRefreshedAt(new Date())
        toast.success(`Analytics cache rebuilt successfully in ${json.durationMs}ms`)
      }
    } catch (e: any) {
      toast.error("Failed to rebuild cache: " + e.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Freeze Management Snapshot
  const handleFreezeSnapshot = async () => {
    try {
      const res = await fetch("/api/analytics/executive/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          comparison,
          currencyMode,
          role: userRole,
          title: `Executive Performance Snapshot (${payload?.periodLabel || "Current"})`,
          author: currentUser?.name || "Executive Management",
        }),
      })
      const json = await res.json()
      if (json.success && json.snapshot) {
        toast.success(`Snapshot ${json.snapshot.snapshotCode} frozen with SHA-256 hash ${json.snapshot.integrityHash.slice(0, 10)}...`)
      }
    } catch (e: any) {
      toast.error("Failed to freeze snapshot: " + e.message)
    }
  }

  // Open KPI Drilldown
  const handleOpenDrilldown = async (kpiKey: string, title: string) => {
    setDrilldownKpi(kpiKey)
    setDrilldownTitle(title)
    setDrilldownOpen(true)
    setIsDrilldownLoading(true)

    try {
      const params = new URLSearchParams({
        drilldownKpi: kpiKey,
        period,
        role: userRole,
      })
      const res = await fetch(`/api/analytics/executive?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setDrilldownRecords(json.records || [])
      }
    } catch (e) {
      toast.error("Failed to load drilldown records")
    } finally {
      setIsDrilldownLoading(false)
    }
  }

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (customerFilter !== "all") count++
    if (routeFilter !== "all") count++
    if (modeFilter !== "all") count++
    if (commodityFilter !== "all") count++
    if (supplierFilter !== "all") count++
    return count
  }, [customerFilter, routeFilter, modeFilter, commodityFilter, supplierFilter])

  const clearAllFilters = () => {
    setCustomerFilter("all")
    setRouteFilter("all")
    setModeFilter("all")
    setCommodityFilter("all")
    setSupplierFilter("all")
    setSearchQuery("")
    toast.info("All filters cleared")
  }

  // Unique lists for filter dropdowns from payload
  const uniqueCustomers = useMemo(() => {
    if (!payload?.customerPerformance) return []
    return payload.customerPerformance.map((c) => c.customerName)
  }, [payload])

  const uniqueRoutes = useMemo(() => {
    if (!payload?.corridorPerformance) return []
    return payload.corridorPerformance.map((c) => c.corridorKey)
  }, [payload])

  const uniqueSuppliers = useMemo(() => {
    if (!payload?.supplierPerformance) return []
    return payload.supplierPerformance.map((s) => s.supplierName)
  }, [payload])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 space-y-5 font-sans">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              EXECUTIVE BI & ANALYTICS CENTER
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs gap-1 py-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Canonical Invariance Verified
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Operations • Finance • Customers • Routes • Performance • Trends
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Last Refreshed: {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">Role: {userRole.toUpperCase()}</p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRebuildCache}
            disabled={isRefreshing}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? "animate-spin" : ""}`} />
            Rebuild Derived Analytics
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleFreezeSnapshot}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-9 gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Freeze Snapshot
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5 shadow-md shadow-blue-900/30">
                <Download className="w-3.5 h-3.5" />
                Export Management Pack
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 w-52">
              <DropdownMenuItem
                onClick={() => window.open(`/api/analytics/executive/export?format=excel&period=${period}`, "_blank")}
                className="hover:bg-slate-800 cursor-pointer gap-2 py-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Multi-Sheet Excel (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`/api/analytics/executive/export?format=csv&period=${period}`, "_blank")}
                className="hover:bg-slate-800 cursor-pointer gap-2 py-2"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Corridors CSV Export</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowPrintModal(true)}
                className="hover:bg-slate-800 cursor-pointer gap-2 py-2 border-t border-slate-800"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Printable A4 Brief (PDF)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Global Period & Filter Controls */}
      <div className="bg-slate-900/70 border border-slate-800/80 p-3.5 sm:p-4 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Period Selector Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Period:
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "this_quarter", label: "Quarter" },
              { id: "this_year", label: "Year" },
            ].map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={period === p.id ? "default" : "ghost"}
                onClick={() => setPeriod(p.id as AnalyticsPeriodPreset)}
                className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                  period === p.id
                    ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Comparison & Currency Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Comparison Dropdown */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400">Compare:</span>
              <select
                value={comparison}
                onChange={(e) => setComparison(e.target.value as AnalyticsComparisonMode)}
                aria-label="Compare Period"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="prev_month">vs Previous Month</option>
                <option value="prev_period">vs Previous Period</option>
                <option value="prev_year">vs Previous Year</option>
                <option value="none">No Comparison</option>
              </select>
            </div>

            {/* Currency Mode */}
            <div className="flex items-center gap-1 text-xs pl-2 border-l border-slate-700">
              <span className="text-slate-400">Currency:</span>
              <select
                value={currencyMode}
                onChange={(e) => setCurrencyMode(e.target.value as any)}
                aria-label="Currency Mode"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="segregated">Segregated (USD / AFN / AED)</option>
                <option value="USD">Normalized USD (1$ = 70 AFN)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Operational Filters Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Filters:
            </span>

            {/* Customer Filter */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              aria-label="Filter by Customer"
              className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 max-w-[150px] truncate"
            >
              <option value="all">All Customers</option>
              {uniqueCustomers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Route / Corridor Filter */}
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              aria-label="Filter by Route Corridor"
              className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 max-w-[160px] truncate"
            >
              <option value="all">All Corridors</option>
              {uniqueRoutes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as any)}
              aria-label="Filter by Transport Mode"
              className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
            >
              <option value="all">All Modes</option>
              <option value="road">Road Freight (Trucking)</option>
              <option value="sea">Ocean Freight</option>
              <option value="air">Air Cargo</option>
              <option value="multimodal">Multimodal Transit</option>
            </select>

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              aria-label="Filter by Vendor / Carrier"
              className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 max-w-[150px] truncate"
            >
              <option value="all">All Suppliers / Lines</option>
              {uniqueSuppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {activeFiltersCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
              >
                <X className="w-3 h-3" /> Reset Filters ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Period Range Label */}
          {payload && (
            <Badge variant="outline" className="text-slate-400 border-slate-700 text-[11px] py-0.5">
              Active Window: {payload.periodLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Loading Skeleton Indicator */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Computing executive intelligence from canonical logs...</p>
        </div>
      ) : payload ? (
        <>
          {/* 3. Main Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="border-b border-slate-800">
              <TabsList className="bg-transparent h-10 p-0 flex space-x-1 sm:space-x-3 overflow-x-auto scrollbar-none">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Business Overview
                </TabsTrigger>
                <TabsTrigger
                  value="operations"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Operations & Fleet
                </TabsTrigger>
                <TabsTrigger
                  value="finance"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Finance & Profitability
                </TabsTrigger>
                <TabsTrigger
                  value="sales"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Sales & CRM Pipeline
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Customers & Concentration
                </TabsTrigger>
                <TabsTrigger
                  value="routes"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Routes & Corridors
                </TabsTrigger>
                <TabsTrigger
                  value="procurement"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Procurement & Vendors
                </TabsTrigger>
                <TabsTrigger
                  value="claims"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  Claims & Risk
                </TabsTrigger>
                <TabsTrigger
                  value="attention"
                  className="data-[state=active]:bg-rose-600 data-[state=active]:text-white text-rose-400 hover:text-rose-300 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Operational Attention ({payload.attentionQueue.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: Business Overview */}
            <TabsContent value="overview" className="space-y-5">
              {/* Macro Executive KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <ExecutiveKpiCard
                  card={payload.kpis.activeShipments}
                  onClick={() => handleOpenDrilldown("ACTIVE_SHIPMENTS", payload.kpis.activeShipments.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.deliveredShipments}
                  onClick={() => handleOpenDrilldown("DELIVERED_SHIPMENTS", payload.kpis.deliveredShipments.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.serviceRevenue}
                  onClick={() => handleOpenDrilldown("SERVICE_REVENUE", payload.kpis.serviceRevenue.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.grossMargin}
                  onClick={() => handleOpenDrilldown("SHIPMENT_GROSS_MARGIN", payload.kpis.grossMargin.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.grossMarginPct}
                  onClick={() => handleOpenDrilldown("GROSS_MARGIN_PERCENT", payload.kpis.grossMarginPct.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.activeContainers}
                  onClick={() => handleOpenDrilldown("ACTIVE_CONTAINERS", payload.kpis.activeContainers.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.activeTrucks}
                  onClick={() => handleOpenDrilldown("ACTIVE_TRUCKS", payload.kpis.activeTrucks.title)}
                />
                <ExecutiveKpiCard
                  card={payload.kpis.operationalAttentionCount}
                  onClick={() => setActiveTab("attention")}
                />
              </div>

              {/* Macro Trend Chart & Transport Mode Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 7-Step Macro Trend Chart */}
                <Card className="lg:col-span-2 bg-slate-900/90 border-slate-800 text-slate-100">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                          Macro Shipment & Throughput Velocity
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          Active consignments and delivered milestones across period intervals
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                        Trend Line
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={payload.macroTrends}>
                        <defs>
                          <linearGradient id="shipmentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="periodLabel" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 8, fontSize: 11 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Area type="monotone" dataKey="shipmentCount" name="Total Shipments" stroke="#3b82f6" fillOpacity={1} fill="url(#shipmentGrad)" />
                        <Area type="monotone" dataKey="deliveredCount" name="Delivered Consignments" stroke="#10b981" fillOpacity={1} fill="url(#deliveredGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Volume by Mode Pie Chart */}
                <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      Transport Mode Distribution
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Road Trucking, Ocean Freight & Air Cargo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 flex flex-col justify-between">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={payload.volumeByMode}
                          dataKey="count"
                          nameKey="mode"
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {payload.volumeByMode.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                      {payload.volumeByMode.map((m, i) => (
                        <div key={m.mode} className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {m.mode}
                          </span>
                          <span className="font-semibold text-slate-200">{m.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Priority Attention Summary Bar */}
              {payload.attentionQueue.length > 0 && (
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {payload.attentionQueue.length} Operational Bottlenecks Detected
                      </h4>
                      <p className="text-xs text-slate-400">
                        Border customs delays, overdue invoices, and tracking silence requiring management intervention.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("attention")}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1"
                  >
                    Open Attention Queue
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Operations & Fleet */}
            <TabsContent value="operations" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <ExecutiveKpiCard card={payload.kpis.activeShipments} />
                <ExecutiveKpiCard card={payload.kpis.deliveredShipments} />
                <ExecutiveKpiCard card={payload.kpis.borderClearanceTurnaround} />
                <ExecutiveKpiCard card={payload.kpis.activeTrucks} />
              </div>

              {/* Corridor Throughput Performance Table */}
              <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Afghan Border Transit Corridors
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Live consignment volume, cartons, weights, and average transit turnaround
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-2.5">Corridor Route</th>
                          <th className="p-2.5">Border Station</th>
                          <th className="p-2.5">Mode</th>
                          <th className="p-2.5 text-right">Shipments</th>
                          <th className="p-2.5 text-right">Packages</th>
                          <th className="p-2.5 text-right">Gross Weight</th>
                          <th className="p-2.5 text-right">Avg Transit</th>
                          <th className="p-2.5 text-center">Border Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {payload.corridorPerformance.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-2.5 font-semibold text-slate-200">
                              {c.origin} <span className="text-slate-400 font-normal">→</span> {c.destination}
                            </td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-[10px]">
                                {c.borderStation || "Direct"}
                              </Badge>
                            </td>
                            <td className="p-2.5 uppercase text-[10px] text-slate-400">{c.mode}</td>
                            <td className="p-2.5 text-right font-bold text-white">{c.shipmentCount}</td>
                            <td className="p-2.5 text-right text-slate-300">{c.totalPackages.toLocaleString()} ctns</td>
                            <td className="p-2.5 text-right text-slate-300">{c.totalGrossWeightKg.toLocaleString()} kg</td>
                            <td className="p-2.5 text-right text-slate-300">{c.avgTransitDays.toFixed(1)} days</td>
                            <td className="p-2.5 text-center">
                              {c.activeHoldCount > 0 ? (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                                  {c.activeHoldCount} Hold
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  Normal Clearance
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Finance & Profitability */}
            <TabsContent value="finance" className="space-y-4">
              {payload.isFinanceRedacted ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
                  <Lock className="w-10 h-10 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-white">Financial Data Restricted</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    You do not possess the required RBAC permission (<code>view:finance_analytics</code>) to inspect company service revenue, supplier costs, and gross margins.
                  </p>
                </div>
              ) : (
                <>
                  {/* Accounting Invariance Identity Banner */}
                  <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-slate-200">Accounting Invariance Identity:</span>
                      <code className="text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/60 font-mono">
                        Net Balance = Total Debit - Total Credit | Gross Margin = Service Revenue - Direct Cost
                      </code>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                      100% Balanced
                    </Badge>
                  </div>

                  {/* Core Financial Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <ExecutiveKpiCard card={payload.kpis.serviceRevenue} />
                    <ExecutiveKpiCard card={payload.kpis.directCost} />
                    <ExecutiveKpiCard card={payload.kpis.grossMargin} />
                    <ExecutiveKpiCard card={payload.kpis.grossMarginPct} />
                  </div>

                  {/* Multi-Currency Segregation Grid */}
                  <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                        Segregated Currency Accounts (USD • AFN • AED)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Absolute isolation across currencies without mixed additions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {["USD", "AFN", "AED"].map((curr) => {
                          const rev = payload.revenueByCurrency.find((b) => b.currency === curr)?.amount || 0
                          const cost = payload.directCostByCurrency.find((b) => b.currency === curr)?.amount || 0
                          const margin = rev - cost
                          return (
                            <div key={curr} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="font-bold text-sm text-white">{curr} Pool</span>
                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                                  {curr}
                                </Badge>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-400">
                                  <span>Recognized Billings:</span>
                                  <span className="font-semibold text-slate-200">{curr} {rev.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>Direct Carrier Costs:</span>
                                  <span className="font-semibold text-rose-400">{curr} {cost.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-800 font-bold">
                                  <span className="text-slate-300">Gross Margin:</span>
                                  <span className={margin >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                    {curr} {margin.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Receivables & Payables Aging Schedules */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Receivables Aging */}
                    <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                          Client Receivables Aging Schedule
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          Unpaid customer invoices segmented by overdue tiers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {payload.receivablesAging.map((ag) => (
                          <div key={ag.currency} className="space-y-2 mb-3 last:mb-0">
                            <span className="text-xs font-semibold text-slate-300">{ag.currency} Receivables</span>
                            <div className="grid grid-cols-5 gap-1.5 text-[10px] text-center">
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">Current</p>
                                <p className="font-bold text-slate-200 mt-0.5">{ag.buckets.current.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">1-30d</p>
                                <p className="font-bold text-amber-300 mt-0.5">{ag.buckets.days1To30.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">31-60d</p>
                                <p className="font-bold text-amber-400 mt-0.5">{ag.buckets.days31To60.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">61-90d</p>
                                <p className="font-bold text-rose-400 mt-0.5">{ag.buckets.days61To90.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-rose-900/50">
                                <p className="text-rose-400 font-semibold">&gt; 90d</p>
                                <p className="font-bold text-rose-300 mt-0.5">{ag.buckets.daysOver90.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Payables Aging */}
                    <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                          Supplier & Carrier Payables Aging
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          Carrier, trucking and port bills past vendor credit terms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {payload.payablesAging.map((ag) => (
                          <div key={ag.currency} className="space-y-2 mb-3 last:mb-0">
                            <span className="text-xs font-semibold text-slate-300">{ag.currency} Payables</span>
                            <div className="grid grid-cols-5 gap-1.5 text-[10px] text-center">
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">Current</p>
                                <p className="font-bold text-slate-200 mt-0.5">{ag.buckets.current.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">1-30d</p>
                                <p className="font-bold text-amber-300 mt-0.5">{ag.buckets.days1To30.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">31-60d</p>
                                <p className="font-bold text-amber-400 mt-0.5">{ag.buckets.days31To60.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                <p className="text-slate-400">61-90d</p>
                                <p className="font-bold text-rose-400 mt-0.5">{ag.buckets.days61To90.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-rose-900/50">
                                <p className="text-rose-400 font-semibold">&gt; 90d</p>
                                <p className="font-bold text-rose-300 mt-0.5">{ag.buckets.daysOver90.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* TAB 4: Sales & CRM Pipeline */}
            <TabsContent value="sales" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <ExecutiveKpiCard card={payload.kpis.quoteConversionRate} />
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Quotations Sent</p>
                  <p className="text-xl font-bold text-white mt-1">{payload.salesPipeline.totalQuotationsSent}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Win Rate: {payload.salesPipeline.quoteWinRatePct}%</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Accepted Rate Quotes</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{payload.salesPipeline.acceptedQuotesCount}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{payload.salesPipeline.pendingQuotesCount} pending client decision</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Opportunities</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">${payload.salesPipeline.activeOpportunitiesValueUSD.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Unbilled pipeline volume</p>
                </Card>
              </div>

              {/* Pipeline Mathematical Ratio Explanation Card */}
              <Card className="bg-slate-900/90 border-slate-800 text-slate-100 p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Mathematically Defined Pipeline Conversion
                </h4>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <p className="text-slate-300">
                    <span className="font-semibold text-white">Conversion Formula:</span>{" "}
                    <code>(Converted Booked Shipments / Eligible Accepted Quotes) * 100</code>
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Zero-division protection: When eligible accepted quotes count is 0, the metric cleanly displays <code>N/A</code> rather than <code>Infinity</code> or NaN.
                  </p>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 5: Customers & Concentration */}
            <TabsContent value="customers" className="space-y-4">
              <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Customer Volume & Concentration Analysis
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Consignment frequency, package volumes, weight, and volume share %
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-2.5">Customer Name</th>
                          <th className="p-2.5 text-right">Shipments (BOLs)</th>
                          <th className="p-2.5 text-right">Packages</th>
                          <th className="p-2.5 text-right">Gross Weight</th>
                          <th className="p-2.5 text-right">Active In-Transit</th>
                          <th className="p-2.5 text-right">Volume Share %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {payload.customerPerformance.map((c) => (
                          <tr key={c.customerId} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-2.5 font-semibold text-slate-200">{c.customerName}</td>
                            <td className="p-2.5 text-right font-bold text-white">{c.shipmentCount}</td>
                            <td className="p-2.5 text-right text-slate-300">{c.packageCount.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-slate-300">{c.grossWeightKg.toLocaleString()} kg</td>
                            <td className="p-2.5 text-right">
                              <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px]">
                                {c.activeShipments} Active
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-semibold text-slate-200">{c.shareOfVolumePct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 6: Routes & Corridors */}
            <TabsContent value="routes" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Border Checkpoints</p>
                  <p className="text-xl font-bold text-white mt-1">5 Stations</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Islam Qala, Hairatan, Torghundi, Spin Boldak, Nimruz</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Avg Clearance Turnaround</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{String(payload.kpis.borderClearanceTurnaround.value)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Entry to border departure scan</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Border Holds</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {payload.corridorPerformance.reduce((acc, c) => acc + c.activeHoldCount, 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Awaiting customs documents</p>
                </Card>
              </div>

              {/* Corridors Table */}
              <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Corridor Throughput Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-2.5">Origin</th>
                          <th className="p-2.5">Destination</th>
                          <th className="p-2.5">Border</th>
                          <th className="p-2.5 text-right">Shipments</th>
                          <th className="p-2.5 text-right">Gross Weight</th>
                          <th className="p-2.5 text-right">Avg Transit Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {payload.corridorPerformance.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="p-2.5 font-semibold text-slate-200">{c.origin}</td>
                            <td className="p-2.5 text-slate-200">{c.destination}</td>
                            <td className="p-2.5 text-slate-400">{c.borderStation || "N/A"}</td>
                            <td className="p-2.5 text-right font-bold text-white">{c.shipmentCount}</td>
                            <td className="p-2.5 text-right text-slate-300">{c.totalGrossWeightKg.toLocaleString()} kg</td>
                            <td className="p-2.5 text-right text-slate-300">{c.avgTransitDays.toFixed(1)} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 7: Procurement & Vendors */}
            <TabsContent value="procurement" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <ExecutiveKpiCard card={payload.kpis.overduePayables} />
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Transport Vendors</p>
                  <p className="text-xl font-bold text-white mt-1">{payload.supplierPerformance.length}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Shipping lines, trucking agents & brokers</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Demurrage / Detention Exposure</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">$2,500</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Active port container detention</p>
                </Card>
              </div>

              {/* Supplier Performance Table */}
              <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Vendor Line Costs & Payout Schedules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-2.5">Supplier / Line Name</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5 text-right">Dispatches</th>
                          <th className="p-2.5 text-right">Cost Share %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {payload.supplierPerformance.map((s) => (
                          <tr key={s.supplierId} className="hover:bg-slate-800/50">
                            <td className="p-2.5 font-semibold text-slate-200">{s.supplierName}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                                {s.category}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-bold text-white">{s.shipmentCount}</td>
                            <td className="p-2.5 text-right text-slate-300">{s.shareOfCostPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 8: Claims & Risk */}
            <TabsContent value="claims" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <ExecutiveKpiCard card={payload.kpis.openClaims} />
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Claimed Amount USD</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">${payload.claimsSummary.claimedAmountUSD.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Disputed cargo claims</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Settled Claims</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">${payload.claimsSummary.settledAmountUSD.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{payload.claimsSummary.settledClaimsCount} cases resolved</p>
                </Card>
                <Card className="bg-slate-900/90 border-slate-800 p-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Avg Resolution Turnaround</p>
                  <p className="text-xl font-bold text-slate-200 mt-1">{payload.claimsSummary.avgResolutionDays} days</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Filing to formal settlement</p>
                </Card>
              </div>

              {/* Claims Breakdown by Type */}
              <Card className="bg-slate-900/90 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Claims & Incident Breakdown by Cause
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payload.claimsSummary.claimsByType.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold text-slate-200">{c.type}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">{c.count} Files</span>
                          <span className="font-bold text-rose-400">${c.claimedUSD.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 9: Operational Attention Center */}
            <TabsContent value="attention" className="space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    Operational & Financial Attention Queue
                  </h3>
                  <p className="text-xs text-slate-400">
                    Urgent bottlenecks requiring executive action (Border holds &gt; 48h, Stale tracking &gt; 72h, Overdue invoices &gt; 30d).
                  </p>
                </div>
                <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-xs py-0.5">
                  {payload.attentionQueue.length} Active Items
                </Badge>
              </div>

              {/* Attention List Items */}
              <div className="space-y-2.5">
                {payload.attentionQueue.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">All Operations Clear</h4>
                    <p className="text-xs text-slate-400">No overdue invoices, border holds, or tracking delays detected.</p>
                  </div>
                ) : (
                  payload.attentionQueue.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.severity === "critical"
                          ? "bg-rose-950/20 border-rose-900/50 hover:bg-rose-950/30"
                          : "bg-amber-950/20 border-amber-900/50 hover:bg-amber-950/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`text-[10px] font-bold uppercase ${
                              item.severity === "critical"
                                ? "bg-rose-600 text-white"
                                : "bg-amber-600 text-white"
                            }`}
                          >
                            {item.severity}
                          </Badge>
                          <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                            {item.category.replace(/_/g, " ")}
                          </Badge>
                          <span className="font-bold text-sm text-white">{item.title}</span>
                        </div>
                        <p className="text-xs text-slate-300">{item.description}</p>
                        <p className="text-[11px] text-slate-400 font-medium pt-1">
                          <span className="text-amber-400 font-semibold">Recommended Action:</span> {item.recommendedAction}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-xs text-slate-400 mr-2 font-mono">
                          {item.daysElapsed} days
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (item.referenceType === "invoice") setView("invoice")
                            else if (item.referenceType === "bol") setView("bol")
                            else setView("shipments")
                          }}
                          className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs h-8 gap-1"
                        >
                          Resolve
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      {/* 4. Interactive Drilldown Drawer */}
      <Sheet open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <SheetContent side="right" className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-xl w-full p-6 overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                Underlying Records
              </Badge>
              <SheetTitle className="text-base font-bold text-white uppercase">
                {drilldownTitle}
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-slate-400">
              Canonical operational & financial source records contributing to this metric
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-3">
            {isDrilldownLoading ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading drilldown source records...</p>
              </div>
            ) : drilldownRecords.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No matching records found.</p>
            ) : (
              drilldownRecords.map((rec) => (
                <div key={rec.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400">{rec.referenceNumber}</span>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                      {rec.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>{rec.entityName}</span>
                    {rec.amount !== undefined && (
                      <span className="font-bold text-emerald-400">{rec.currency} {rec.amount.toLocaleString()}</span>
                    )}
                  </div>
                  {rec.originDestination && (
                    <p className="text-[11px] text-slate-400">{rec.originDestination}</p>
                  )}
                  <p className="text-[10px] text-slate-500">{rec.detail}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 5. Printable Executive Management Pack Modal */}
      {showPrintModal && payload && (
        <ExecutiveManagementPackView
          payload={payload}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Interactive KPI Card Component with Formula Tooltip
// -------------------------------------------------------------
interface ExecutiveKpiCardProps {
  card: KpiCardData
  onClick?: () => void
}

function ExecutiveKpiCard({ card, onClick }: ExecutiveKpiCardProps) {
  const isClickable = Boolean(onClick && !card.isRedacted)

  return (
    <Card
      onClick={isClickable ? onClick : undefined}
      className={`bg-slate-900/90 border-slate-800 text-slate-100 transition-all ${
        isClickable ? "hover:border-blue-500/50 hover:bg-slate-850 cursor-pointer" : ""
      }`}
    >
      <CardContent className="p-4 space-y-2">
        {/* Top Header: Title & Info Tooltip */}
        <div className="flex items-start justify-between gap-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300 truncate max-w-[190px]">
              {card.title}
            </p>
            {card.titleFa && (
              <p className="text-[10px] text-slate-500 truncate max-w-[180px] font-sans" dir="rtl">
                {card.titleFa}
              </p>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full text-slate-500 hover:text-slate-200">
                <Info className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 bg-slate-950 border-slate-800 text-slate-200 p-3.5 text-xs space-y-2">
              <h5 className="font-bold text-white text-xs">What does this metric mean?</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">{card.explanation}</p>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Calculation Formula:</p>
                <code className="text-[11px] text-blue-300 block font-mono break-words">{card.formula}</code>
              </div>
              <div className="text-[10px] text-slate-500">
                <span>Date Basis: </span>
                <span className="text-slate-300 font-medium">{card.dateBasis}</span>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Value Display */}
        <div className="flex items-baseline justify-between pt-1">
          <p className="text-2xl font-black tracking-tight text-white">
            {String(card.value)}
          </p>

          {/* Change Delta Badge */}
          {card.changeText && !card.isRedacted && (
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-1.5 py-0.5 gap-0.5 ${
                card.status === "positive"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : card.status === "negative"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  : "border-slate-700 bg-slate-800 text-slate-400"
              }`}
            >
              {card.trend === "up" && <TrendingUp className="w-2.5 h-2.5" />}
              {card.trend === "down" && <TrendingDown className="w-2.5 h-2.5" />}
              {card.changeText}
            </Badge>
          )}
        </div>

        {/* Footer comparison caption */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
          <span>{card.comparisonLabel}</span>
          {isClickable && <span className="text-blue-400 hover:underline">Click to drill down →</span>}
        </div>
      </CardContent>
    </Card>
  )
}
