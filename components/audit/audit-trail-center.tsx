"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useApp } from "@/lib/app-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  User,
  Layers,
  FileText,
  DollarSign,
  Lock,
  Database,
  Truck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Laptop,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AuditEvent,
  AuditFilterParams,
  AuditIntegrityReport,
  AuditActionCode,
  AuditEntityType,
  AuditSource,
} from "@/lib/audit/audit-types"
import {
  queryAuditEvents,
  verifyAuditChainIntegrity,
  exportAuditCsv,
  getAllAuditEvents,
} from "@/lib/audit/audit-trail-service"

type QuickFilterOption =
  | "all"
  | "today"
  | "24h"
  | "7days"
  | "month"
  | "finance"
  | "bol"
  | "tracking"
  | "documents"
  | "security"
  | "database"

export function AuditTrailCenter() {
  const { setView } = useApp()
  const { currentUser, isSuperAdmin, isAdmin, hasPermission, canViewProfit } = usePermissions()

  const [events, setEvents] = useState<AuditEvent[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(50)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilterOption>("all")
  const [selectedUser, setSelectedUser] = useState("all")
  const [selectedModule, setSelectedModule] = useState("all")
  const [selectedAction, setSelectedAction] = useState<string>("all")
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all")
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline")

  // Modals & Drawers
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [integrityReport, setIntegrityReport] = useState<AuditIntegrityReport | null>(null)
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false)
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({})

  // -------------------------------------------------------------
  // Load & Query Data
  // -------------------------------------------------------------
  const loadEvents = useCallback(() => {
    const now = new Date()
    let startDate: string | undefined

    if (quickFilter === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    } else if (quickFilter === "24h") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    } else if (quickFilter === "7days") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (quickFilter === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }

    let moduleFilter = selectedModule !== "all" ? selectedModule : undefined
    if (quickFilter === "bol") moduleFilter = "bol"
    if (quickFilter === "tracking") moduleFilter = "tracking"
    if (quickFilter === "documents") moduleFilter = "documents"
    if (quickFilter === "finance") moduleFilter = "accounting"
    if (quickFilter === "security") moduleFilter = "security"
    if (quickFilter === "database") moduleFilter = "database"

    const filterParams: AuditFilterParams = {
      search: searchQuery || undefined,
      startDate,
      userId: selectedUser !== "all" ? selectedUser : undefined,
      module: moduleFilter,
      action: selectedAction !== "all" ? (selectedAction as AuditActionCode) : undefined,
      entityType: selectedEntityType !== "all" ? (selectedEntityType as AuditEntityType) : undefined,
      onlyCritical: onlyCritical || quickFilter === "security",
      page: currentPage,
      limit,
    }

    const res = queryAuditEvents(filterParams)
    setEvents(res.events)
    setTotalCount(res.totalCount)
    setTotalPages(res.totalPages)
  }, [
    searchQuery,
    quickFilter,
    selectedUser,
    selectedModule,
    selectedAction,
    selectedEntityType,
    onlyCritical,
    currentPage,
    limit,
  ])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // -------------------------------------------------------------
  // KPI Metrics Calculation
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const all = getAllAuditEvents()
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const todayEvents = all.filter((e) => e.timestamp.startsWith(todayStr))
    const uniqueUsersToday = new Set(todayEvents.map((e) => e.actor.userId)).size

    return {
      total: all.length,
      today: todayEvents.length,
      usersToday: uniqueUsersToday,
      bol: all.filter((e) => e.module === "bol" || e.entityType === "BOL").length,
      tracking: all.filter((e) => e.module === "tracking" || e.entityType === "TRACKING_EVENT").length,
      documents: all.filter((e) => e.module === "documents" || e.entityType === "DOCUMENT").length,
      finance: all.filter((e) => e.module === "accounting" || e.entityType === "LEDGER" || e.entityType === "INVOICE" || e.entityType === "PAYMENT").length,
      security: all.filter((e) => e.module === "security" || e.action === "PERMISSION_CHANGE" || e.action === "LOGIN" || e.action === "DATABASE_RESTORE").length,
      database: all.filter((e) => e.action === "DATABASE_RESTORE" || e.action === "BACKUP" || e.action === "MIGRATION").length,
    }
  }, [events])

  // -------------------------------------------------------------
  // Cryptographic Verification
  // -------------------------------------------------------------
  const handleVerifyIntegrity = () => {
    setIsVerifyingIntegrity(true)
    setTimeout(() => {
      const report = verifyAuditChainIntegrity()
      setIntegrityReport(report)
      setIsVerifyingIntegrity(false)
      if (report.verified) {
        toast.success("Audit Trail Cryptographically Verified (No tampering detected)")
      } else {
        toast.error("Integrity Alert: Hash chain checksum mismatch!")
      }
    }, 400)
  }

  // -------------------------------------------------------------
  // CSV Export
  // -------------------------------------------------------------
  const handleExportCsv = () => {
    const canViewFinance = isSuperAdmin || isAdmin || canViewProfit
    const csv = exportAuditCsv(events, canViewFinance)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `skyariana-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exported audit trail to CSV")
  }

  const toggleExpand = (id: string) => {
    setExpandedEventIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Executive Header Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  AUDIT TRAIL & CHANGE HISTORY CENTER
                </h1>
                <span className="text-xs text-amber-300 font-[vazirmatn] font-bold" dir="rtl">
                  مرکز ثبت تاریخچه و تغییرات سامانه
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Users • Changes • Records • Financial Alterations • Security • Tamper-Resistant Events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleVerifyIntegrity}
              disabled={isVerifyingIntegrity}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              {isVerifyingIntegrity ? "Verifying..." : "Verify Audit Integrity (بررسی صحت)"}
            </Button>
            <Button
              onClick={handleExportCsv}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-9 px-3.5 rounded-xl cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              Export CSV (اکسل)
            </Button>
          </div>
        </div>

        {/* Integrity Verified Banner if evaluated */}
        {integrityReport && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs flex items-center justify-between gap-3 border ${
              integrityReport.verified
                ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/70 border-rose-500/40 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {integrityReport.verified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-bold">{integrityReport.message}</span>
              <span className="text-[11px] opacity-80">({integrityReport.totalEvents} sequential events checked)</span>
            </div>
            <button
              type="button"
              onClick={() => setIntegrityReport(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Changes Today</span>
          <div className="text-xl font-black text-blue-950 font-mono mt-1">{metrics.today}</div>
          <span className="text-[10px] text-emerald-600 font-bold">24h recorded</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Staff</span>
          <div className="text-xl font-black text-indigo-950 font-mono mt-1">{metrics.usersToday}</div>
          <span className="text-[10px] text-slate-500">logged in today</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">BOL Edits</span>
          <div className="text-xl font-black text-blue-900 font-mono mt-1">{metrics.bol}</div>
          <span className="text-[10px] text-blue-600 font-bold">cargo & borders</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tracking</span>
          <div className="text-xl font-black text-teal-900 font-mono mt-1">{metrics.tracking}</div>
          <span className="text-[10px] text-teal-600 font-bold">milestone updates</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Documents</span>
          <div className="text-xl font-black text-amber-900 font-mono mt-1">{metrics.documents}</div>
          <span className="text-[10px] text-amber-600 font-bold">invoices & packs</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Finance</span>
          <div className="text-xl font-black text-emerald-900 font-mono mt-1">{metrics.finance}</div>
          <span className="text-[10px] text-emerald-600 font-bold">payments & ledgers</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Security</span>
          <div className="text-xl font-black text-purple-900 font-mono mt-1">{metrics.security}</div>
          <span className="text-[10px] text-purple-600 font-bold">roles & logins</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Database</span>
          <div className="text-xl font-black text-rose-900 font-mono mt-1">{metrics.database}</div>
          <span className="text-[10px] text-rose-600 font-bold">backups & restores</span>
        </div>
      </div>

      {/* Global Search & Quick Filter Bar */}
      <div className="space-y-2.5">
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by BOL Number, Container, Booking, Invoice, User Name, Field..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterModalOpen(true)}
              className="text-xs font-bold h-9 rounded-xl border-slate-200 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Advanced Filters
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadEvents}
              className="text-xs font-bold h-9 px-3 rounded-xl border-slate-200 cursor-pointer"
              title="Refresh audit feed"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "timeline" ? "bg-white text-blue-950 shadow-xs font-black" : "text-slate-600"
                }`}
              >
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "table" ? "bg-white text-blue-950 shadow-xs font-black" : "text-slate-600"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {[
            { id: "all", label: "All Changes" },
            { id: "today", label: "Today" },
            { id: "24h", label: "Last 24 Hours" },
            { id: "7days", label: "Last 7 Days" },
            { id: "month", label: "This Month" },
            { id: "finance", label: "Finance Changes" },
            { id: "bol", label: "BOL Changes" },
            { id: "tracking", label: "Tracking Changes" },
            { id: "documents", label: "Document Changes" },
            { id: "security", label: "Security & Logins" },
            { id: "database", label: "Database Restores" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setQuickFilter(pill.id as QuickFilterOption)
                setCurrentPage(1)
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                quickFilter === pill.id
                  ? "bg-blue-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Feed Area */}
      {events.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-slate-200/80 text-slate-400 space-y-2">
          <Clock className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No audit events match current criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting search terms, widening the date range, or selecting "All Changes".
          </p>
        </div>
      ) : viewMode === "timeline" ? (
        /* TIMELINE VIEW */
        <div className="space-y-4">
          {events.map((event) => {
            const isExpanded = !!expandedEventIds[event.eventId]
            const isCreate = event.action === "CREATE"
            const isReverse = event.action === "REVERSE" || event.action === "CANCEL"
            const isRestore = event.action === "DATABASE_RESTORE" || event.action === "RESTORE"
            const isPermission = event.action === "PERMISSION_CHANGE"

            return (
              <div
                key={event.eventId}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide border ${
                        isCreate
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isReverse
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : isRestore
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : isPermission
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-900 border-blue-200"
                      }`}
                    >
                      {event.action}
                    </span>

                    <span className="font-mono text-xs font-black text-slate-900">
                      {event.entityType}: {event.entityReference || event.entityId}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      (Seq #{event.sequenceNumber})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {event.businessTimestamp}
                    </span>
                    <span className="hidden md:inline text-[10px] text-slate-400">
                      UTC: {event.timestamp.slice(11, 19)}
                    </span>
                  </div>
                </div>

                {/* Actor & Source Ribbon */}
                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-slate-900">{event.actor.userName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-[10px] font-bold text-slate-700">
                      {event.actor.userRole}
                    </span>
                    {event.actor.deviceId && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <Laptop className="w-3 h-3 text-slate-400" />
                        {event.actor.deviceId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Source: <strong className="text-slate-700">{event.source}</strong></span>
                    {event.correlationId && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
                        Batch: {event.correlationId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason Banner if provided */}
                {event.reason && (
                  <div className="text-xs text-slate-700 bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl">
                    <strong className="text-amber-950">Change Rationale: </strong>
                    {event.reasonPreset && <span className="font-bold">[{event.reasonPreset}] </span>}
                    {event.reason}
                  </div>
                )}

                {/* Changed Fields Summary */}
                {event.changedFields.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Modified Fields ({event.changedFields.length}):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {event.changedFields.map((cf, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 text-xs flex flex-col justify-between gap-1.5"
                        >
                          <span className="font-bold text-slate-800">{cf.friendlyLabel}:</span>
                          <div className="flex items-center gap-2 text-slate-900 font-mono text-[11px] overflow-x-auto">
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 line-through">
                              {String(cf.oldValue)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-black">
                              {String(cf.newValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer with Cryptographic Hash */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
                  <div className="flex items-center gap-2">
                    <span>ID: {event.eventId}</span>
                    <span>•</span>
                    <span>SHA-256: {event.eventHash.slice(0, 16)}...</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(event.eventId)}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    {isExpanded ? "Hide Details" : "Show Technical Details"}
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expandable Technical Details */}
                {isExpanded && (
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono space-y-1.5 overflow-x-auto animate-in fade-in duration-200">
                    <div><strong>Canonical Hash:</strong> {event.eventHash}</div>
                    <div><strong>Previous Hash:</strong> {event.previousHash}</div>
                    <div><strong>Module:</strong> {event.module}</div>
                    {event.ipAddress && <div><strong>IP Address:</strong> {event.ipAddress}</div>}
                    {event.databaseRevision && <div><strong>DB Revision:</strong> #{event.databaseRevision}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3">Seq</th>
                  <th className="p-3">Business Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Ref</th>
                  <th className="p-3">Changed Fields Summary</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((e) => (
                  <tr key={e.eventId} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-400">#{e.sequenceNumber}</td>
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {e.businessTimestamp}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{e.actor.userName}</div>
                      <div className="text-[10px] text-slate-400">{e.actor.userRole}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-mono text-[10px] font-black border border-blue-200">
                        {e.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {e.entityReference || e.entityId}
                    </td>
                    <td className="p-3 text-slate-600 max-w-sm truncate">
                      {e.changedFields.length > 0
                        ? e.changedFields.map((c) => `${c.friendlyLabel}: ${c.oldValue} → ${c.newValue}`).join("; ")
                        : e.reason || "Record action committed"}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 text-xs shadow-xs">
          <span className="text-slate-500 font-mono">
            Showing {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalCount)} of {totalCount} events
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="text-xs h-8 px-3 rounded-xl cursor-pointer"
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="text-xs h-8 px-3 rounded-xl cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Audit Trail Multi-Criteria Filter</h3>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Module Area</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="all">All Modules</option>
                  <option value="bol">BOL & Manifests</option>
                  <option value="tracking">Container Tracking</option>
                  <option value="documents">Document Center</option>
                  <option value="accounting">Accounting & Finance</option>
                  <option value="security">Security & Roles</option>
                  <option value="database">Database & Backups</option>
                  <option value="settings">System Settings</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Code</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="all">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="POST">POST</option>
                  <option value="REVERSE">REVERSE</option>
                  <option value="APPROVE">APPROVE</option>
                  <option value="REJECT">REJECT</option>
                  <option value="MERGE">MERGE</option>
                  <option value="DATABASE_RESTORE">DATABASE RESTORE</option>
                  <option value="PERMISSION_CHANGE">PERMISSION CHANGE</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Entity Type</label>
                <select
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="all">All Entities</option>
                  <option value="BOL">BOL</option>
                  <option value="SHIPMENT">SHIPMENT</option>
                  <option value="TRACKING_EVENT">TRACKING EVENT</option>
                  <option value="CONTAINER">CONTAINER</option>
                  <option value="DOCUMENT">DOCUMENT</option>
                  <option value="INVOICE">INVOICE</option>
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="LEDGER">LEDGER</option>
                  <option value="COMPANY">COMPANY</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="critCheck"
                  checked={onlyCritical}
                  onChange={(e) => setOnlyCritical(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="critCheck" className="font-bold text-slate-800 cursor-pointer">
                  Show Only Critical Security & Financial Actions
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedModule("all")
                  setSelectedAction("all")
                  setSelectedEntityType("all")
                  setSelectedUser("all")
                  setOnlyCritical(false)
                }}
                className="text-xs font-bold h-8 rounded-xl cursor-pointer"
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsFilterModalOpen(false)
                  setCurrentPage(1)
                  loadEvents()
                }}
                className="bg-blue-900 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
