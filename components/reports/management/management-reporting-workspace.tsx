"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  LayoutDashboard,
  FileSpreadsheet,
  ArrowRightLeft,
  Users,
  Building2,
  TrendingUp,
  Truck,
  DollarSign,
  Calendar,
  Lock,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ManagementReportFilterBar } from "./management-report-filter-bar"
import { MetricDrilldownDrawer } from "./metric-drilldown-drawer"
import { ExecutiveOverviewTab } from "./tabs/executive-overview-tab"
import { PnLReportTab } from "./tabs/pnl-report-tab"
import { CashFlowReportTab } from "./tabs/cashflow-report-tab"
import { ReceivablesReportTab } from "./tabs/receivables-report-tab"
import { PayablesReportTab } from "./tabs/payables-report-tab"
import { ProfitabilityReportTab } from "./tabs/profitability-report-tab"
import { OperationsAnalyticsTab } from "./tabs/operations-analytics-tab"
import { ExpensesPayrollTab } from "./tabs/expenses-payroll-tab"
import { MonthlyYtdTab } from "./tabs/monthly-ytd-tab"
import { CustomReportsTab } from "./tabs/custom-reports-tab"
import { ManagementReportPrintModal } from "./management-report-print-modal"
import {
  ReportFilters,
  ExecutiveDashboardData,
  ProfitAndLossReport,
  ManagementCashFlowReport,
  ReceivablesReport,
  PayablesReport,
  RoutePerformanceRow,
  ShipmentProfitabilityRow,
  CustomerProfitabilityRow,
  BranchPerformanceRow,
  ContainerPerformanceRow,
  CommodityAnalysisRow,
  TrackingPerformanceData,
  DocumentPerformanceData,
  MonthlyComparisonRow,
  ManagementReportSnapshot,
  MetricDrilldownResponse
} from "@/lib/types/management-reporting"
import { GeneralExpenseItem, PayrollRecord } from "@/lib/reports/management-reporting-service"

type TabKey =
  | "overview"
  | "pnl"
  | "cashflow"
  | "receivables"
  | "payables"
  | "profitability"
  | "operations"
  | "expenses"
  | "monthly"
  | "snapshots"

export function ManagementReportingWorkspace({ userRole = "admin" }: { userRole?: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [filters, setFilters] = useState<ReportFilters>({
    datePreset: "this_month",
    currency: "ALL",
    branch: "All",
  })

  const [loading, setLoading] = useState<boolean>(true)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false)

  // Data states
  const [overview, setOverview] = useState<ExecutiveDashboardData | null>(null)
  const [pnl, setPnl] = useState<ProfitAndLossReport | null>(null)
  const [cashflow, setCashflow] = useState<ManagementCashFlowReport | null>(null)
  const [receivables, setReceivables] = useState<ReceivablesReport | null>(null)
  const [payables, setPayables] = useState<PayablesReport | null>(null)
  const [routes, setRoutes] = useState<RoutePerformanceRow[]>([])
  const [shipments, setShipments] = useState<ShipmentProfitabilityRow[]>([])
  const [customers, setCustomers] = useState<CustomerProfitabilityRow[]>([])
  const [branches, setBranches] = useState<BranchPerformanceRow[]>([])
  const [containers, setContainers] = useState<ContainerPerformanceRow[]>([])
  const [commodities, setCommodities] = useState<CommodityAnalysisRow[]>([])
  const [tracking, setTracking] = useState<TrackingPerformanceData | null>(null)
  const [documents, setDocuments] = useState<DocumentPerformanceData | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyComparisonRow[]>([])
  const [expenses, setExpenses] = useState<GeneralExpenseItem[]>([])
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([])
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([])
  const [totalGeneralExpensesUsd, setTotalGeneralExpensesUsd] = useState<number>(0)
  const [totalPayrollUsd, setTotalPayrollUsd] = useState<number>(0)
  const [snapshots, setSnapshots] = useState<ManagementReportSnapshot[]>([])

  // Drilldown state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)
  const [selectedMetricTitle, setSelectedMetricTitle] = useState<string>("")

  const buildQuery = useCallback(
    (extra?: Record<string, string>) => {
      const p = new URLSearchParams()
      p.set("datePreset", filters.datePreset)
      if (filters.startDate) p.set("startDate", filters.startDate)
      if (filters.endDate) p.set("endDate", filters.endDate)
      if (filters.periodCode) p.set("periodCode", filters.periodCode)
      if (filters.branch && filters.branch !== "All") p.set("branch", filters.branch)
      if (filters.currency && filters.currency !== "ALL") p.set("currency", filters.currency)
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => p.set(k, v))
      }
      return p.toString()
    },
    [filters]
  )

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      const q = buildQuery()

      // Concurrent fetch of core reports
      const [
        overviewRes,
        pnlRes,
        cashflowRes,
        recRes,
        payRes,
        profitRoutesRes,
        profitShipmentsRes,
        profitCustomersRes,
        profitBranchesRes,
        opsRes,
        monthlyRes,
        expRes,
        snapRes,
      ] = await Promise.all([
        fetch(`/api/reports/management/overview?${q}`),
        fetch(`/api/reports/management/pnl?${q}`),
        fetch(`/api/reports/management/cashflow?${q}`),
        fetch(`/api/reports/management/receivables?${q}`),
        fetch(`/api/reports/management/payables?${q}`),
        fetch(`/api/reports/management/profitability?${buildQuery({ type: "route" })}`),
        fetch(`/api/reports/management/profitability?${buildQuery({ type: "shipment" })}`),
        fetch(`/api/reports/management/profitability?${buildQuery({ type: "customer" })}`),
        fetch(`/api/reports/management/profitability?${buildQuery({ type: "branch" })}`),
        fetch(`/api/reports/management/operations?${q}`),
        fetch(`/api/reports/management/monthly?${q}`),
        fetch(`/api/reports/management/expenses?${q}`),
        fetch(`/api/reports/management/snapshots`),
      ])

      if (overviewRes.ok) {
        const d = await overviewRes.json()
        if (d.success) setOverview(d.data)
      }

      if (pnlRes.ok) {
        const d = await pnlRes.json()
        if (d.success) setPnl(d.report)
      }

      if (cashflowRes.ok) {
        const d = await cashflowRes.json()
        if (d.success) setCashflow(d.report)
      }

      if (recRes.ok) {
        const d = await recRes.json()
        if (d.success) setReceivables(d.report)
      }

      if (payRes.ok) {
        const d = await payRes.json()
        if (d.success) setPayables(d.report)
      }

      if (profitRoutesRes.ok) {
        const d = await profitRoutesRes.json()
        if (d.success) setRoutes(d.routes || [])
      }

      if (profitShipmentsRes.ok) {
        const d = await profitShipmentsRes.json()
        if (d.success) setShipments(d.shipments || [])
      }

      if (profitCustomersRes.ok) {
        const d = await profitCustomersRes.json()
        if (d.success) setCustomers(d.customers || [])
      }

      if (profitBranchesRes.ok) {
        const d = await profitBranchesRes.json()
        if (d.success) setBranches(d.branches || [])
      }

      if (opsRes.ok) {
        const d = await opsRes.json()
        if (d.success) {
          setContainers(d.containerPerformance || [])
          setCommodities(d.commodityAnalysis || [])
          setTracking(d.trackingPerformance || null)
          setDocuments(d.documentPerformance || null)
        }
      }

      if (monthlyRes.ok) {
        const d = await monthlyRes.json()
        if (d.success) setMonthlyData(d.rows || [])
      }

      if (expRes.ok) {
        const d = await expRes.json()
        if (d.success) {
          setExpenses(d.generalExpenses || [])
          setPayrolls(d.payrollRecords || [])
          setExpensesByCategory(d.expensesByCategory || [])
          setTotalGeneralExpensesUsd(d.totalGeneralExpensesUsd || 0)
          setTotalPayrollUsd(d.totalPayrollUsd || 0)
        }
      }

      if (snapRes.ok) {
        const d = await snapRes.json()
        if (d.success) setSnapshots(d.snapshots || [])
      }
    } catch (e) {
      console.error("[Management Workspace] Failed to load data:", e)
    } finally {
      setLoading(false)
    }
  }, [buildQuery])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Drilldown handler
  const handleMetricClick = (metricId: string, title: string) => {
    setSelectedMetricId(metricId)
    setSelectedMetricTitle(title)
    setIsDrawerOpen(true)
  }

  // Finalize snapshot handler
  const handleFinalizeSnapshot = async (periodCode: string, notes: string) => {
    const res = await fetch("/api/reports/management/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodCode, notes, filters }),
    })
    const d = await res.json()
    if (!res.ok || !d.success) {
      throw new Error(d.error || "Failed to finalize snapshot")
    }
    // Refresh snapshot list
    const snapRes = await fetch("/api/reports/management/snapshots")
    if (snapRes.ok) {
      const snapJson = await snapRes.json()
      if (snapJson.success) setSnapshots(snapJson.snapshots)
    }
  }

  const navItems: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: "overview", label: "Executive Overview", icon: LayoutDashboard },
    { key: "pnl", label: "Profit & Loss", icon: FileSpreadsheet },
    { key: "cashflow", label: "Cash Flow", icon: ArrowRightLeft },
    { key: "receivables", label: "Receivables", icon: Users },
    { key: "payables", label: "Payables", icon: Building2 },
    { key: "profitability", label: "Profitability", icon: TrendingUp },
    { key: "operations", label: "Logistics Analytics", icon: Truck },
    { key: "expenses", label: "Overhead & Payroll", icon: DollarSign },
    { key: "monthly", label: "12-Month & YTD", icon: Calendar },
    { key: "snapshots", label: "Audited Snapshots", icon: Lock, count: snapshots.length },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight">MANAGEMENT REPORTING CENTER</h1>
            <Badge className="bg-blue-600 text-white font-mono text-[10px]">Phase 19 Live</Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Authoritative executive decision system uniting shipment operations, accrual profit &amp; loss, multi-currency cash flows, customer &amp; route profitability, and tamper-proof SHA-256 snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setIsPrintModalOpen(true)}
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Management Pack
          </Button>
          <Button
            onClick={fetchAllData}
            disabled={loading}
            size="sm"
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <ManagementReportFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={fetchAllData}
        isLoading={loading}
      />

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-blue-800 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <ExecutiveOverviewTab data={overview} onMetricClick={handleMetricClick} />
      )}

      {activeTab === "pnl" && (
        <PnLReportTab data={pnl} onMetricClick={handleMetricClick} selectedCurrency={filters.currency} />
      )}

      {activeTab === "cashflow" && (
        <CashFlowReportTab data={cashflow} onMetricClick={handleMetricClick} selectedCurrency={filters.currency} />
      )}

      {activeTab === "receivables" && (
        <ReceivablesReportTab data={receivables} onMetricClick={handleMetricClick} selectedCurrency={filters.currency} />
      )}

      {activeTab === "payables" && (
        <PayablesReportTab data={payables} onMetricClick={handleMetricClick} selectedCurrency={filters.currency} />
      )}

      {activeTab === "profitability" && (
        <ProfitabilityReportTab
          routes={routes}
          shipments={shipments}
          customers={customers}
          onMetricClick={handleMetricClick}
        />
      )}

      {activeTab === "operations" && (
        <OperationsAnalyticsTab
          containers={containers}
          commodities={commodities}
          tracking={tracking}
          documents={documents}
          onMetricClick={handleMetricClick}
        />
      )}

      {activeTab === "expenses" && (
        <ExpensesPayrollTab
          generalExpenses={expenses}
          payrollRecords={payrolls}
          expensesByCategory={expensesByCategory}
          totalGeneralExpensesUsd={totalGeneralExpensesUsd}
          totalPayrollUsd={totalPayrollUsd}
          userRole={userRole}
          onMetricClick={handleMetricClick}
        />
      )}

      {activeTab === "monthly" && (
        <MonthlyYtdTab monthlyData={monthlyData} onMetricClick={handleMetricClick} />
      )}

      {activeTab === "snapshots" && (
        <CustomReportsTab
          snapshots={snapshots}
          filters={filters}
          onFinalizeSnapshot={handleFinalizeSnapshot}
          onViewSnapshot={(s) => {
            if (s.pnlData) setPnl(s.pnlData)
            setActiveTab("pnl")
          }}
        />
      )}

      {/* Drill-down Drawer */}
      <MetricDrilldownDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        metricId={selectedMetricId}
        metricTitle={selectedMetricTitle}
      />

      {/* Print Preview Modal */}
      <ManagementReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        overview={overview}
        pnl={pnl}
        cashflow={cashflow}
        receivables={receivables}
        payables={payables}
      />
    </div>
  )
}
