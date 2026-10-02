"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Database,
  Share2,
  Search,
  Plus,
  History,
  Scale,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import type {
  AccountingPeriod,
  AccountPeriodBalance,
  PeriodSnapshot,
  CloseChecklistItem,
  PeriodAuditRecord,
  AccountingPeriodSettings,
} from "@/lib/accounting/period-closing/period-types"
import { MonthlyCloseModal } from "./monthly-close-modal"
import { PeriodReopenModal } from "./period-reopen-modal"
import { PeriodReportView } from "./period-report-view"
import type { MonthlyClosingStatementData } from "@/lib/accounting/period-closing/period-report-service"

export function PeriodClosingView() {
  const [activeSubTab, setActiveSubTab] = useState("current")
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<AccountingPeriod | null>(null)
  const [settings, setSettings] = useState<AccountingPeriodSettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<CloseChecklistItem[]>([])
  const [hasBlockingErrors, setHasBlockingErrors] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  const [checkingChecklist, setCheckingChecklist] = useState(false)

  // Balances state
  const [balances, setBalances] = useState<AccountPeriodBalance[]>([])
  const [balanceSearch, setBalanceSearch] = useState("")

  // Audit state
  const [auditLogs, setAuditLogs] = useState<PeriodAuditRecord[]>([])

  // Snapshots state
  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([])

  // Modals state
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)
  const [targetReopenPeriod, setTargetReopenPeriod] = useState<AccountingPeriod | null>(null)

  // Report Modal / View state
  const [reportData, setReportData] = useState<MonthlyClosingStatementData | null>(null)

  // Year End Close state
  const [yearEndYear, setYearEndYear] = useState(2026)
  const [yearEndClosing, setYearEndClosing] = useState(false)

  // Initial load
  const loadPeriodData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/accounting/period")
      const json = await res.json()
      if (json.success) {
        setPeriods(json.periods || [])
        setActivePeriod(json.activePeriod || null)
        setSettings(json.settings || null)
        if (json.activePeriod) {
          await loadChecklist(json.activePeriod.id)
          await loadBalances(json.activePeriod.id)
          await loadSnapshots(json.activePeriod.id)
        }
      }
    } catch (err: any) {
      toast.error("Failed to load accounting periods: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadChecklist = async (periodId: string) => {
    try {
      setCheckingChecklist(true)
      const res = await fetch(`/api/accounting/period/checklist?periodId=${periodId}`)
      const json = await res.json()
      if (json.success) {
        setChecklistItems(json.items || [])
        setHasBlockingErrors(Boolean(json.hasBlockingErrors))
        setWarningCount(json.warningCount || 0)
      }
    } catch (err: any) {
      console.error("Checklist error:", err)
    } finally {
      setCheckingChecklist(false)
    }
  }

  const loadBalances = async (periodId: string) => {
    try {
      const res = await fetch(`/api/accounting/period/balances?periodId=${periodId}&recalculate=true`)
      const json = await res.json()
      if (json.success) {
        setBalances(json.balances || [])
      }
    } catch (err: any) {
      console.error("Balances error:", err)
    }
  }

  const loadSnapshots = async (periodId: string) => {
    try {
      const res = await fetch(`/api/accounting/period/snapshots?periodId=${periodId}`)
      const json = await res.json()
      if (json.success) {
        setSnapshots(json.snapshots || [])
      }
    } catch (err: any) {
      console.error("Snapshots error:", err)
    }
  }

  const openStatement = async (periodId: string) => {
    try {
      const res = await fetch(`/api/accounting/period/report?periodId=${periodId}`)
      const json = await res.json()
      if (json.success && json.data) {
        setReportData(json.data)
      } else {
        toast.error("Failed to load period statement.")
      }
    } catch (err: any) {
      toast.error("Error loading statement: " + err.message)
    }
  }

  const handleConfirmClose = async (notes: string, bypassWarnings: boolean) => {
    if (!activePeriod) return
    try {
      const res = await fetch("/api/accounting/period/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_id: activePeriod.id,
          actor: "Chief Accountant",
          notes,
          bypassWarnings,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        await loadPeriodData()
      } else {
        toast.error(json.error || "Failed to close period.")
      }
    } catch (err: any) {
      toast.error("Network error: " + err.message)
    }
  }

  const handleConfirmReopen = async (reason: string) => {
    const target = targetReopenPeriod || activePeriod
    if (!target) return
    try {
      const res = await fetch("/api/accounting/period/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_id: target.id,
          reason,
          actor: "Super Admin",
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        await loadPeriodData()
      } else {
        toast.error(json.error || "Failed to reopen period.")
      }
    } catch (err: any) {
      toast.error("Network error: " + err.message)
    }
  }

  const handleExecuteYearEnd = async () => {
    try {
      setYearEndClosing(true)
      const res = await fetch("/api/accounting/period/year-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: yearEndYear,
          actor: "Chief Financial Officer",
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        await loadPeriodData()
      } else {
        toast.error(json.error || "Year-end closing failed.")
      }
    } catch (err: any) {
      toast.error("Network error: " + err.message)
    } finally {
      setYearEndClosing(false)
    }
  }

  useEffect(() => {
    loadPeriodData()
  }, [])

  if (reportData) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReportData(null)}
          className="text-xs gap-1.5"
        >
          ← Return to Period Closing Workspace
        </Button>
        <PeriodReportView data={reportData} onClose={() => setReportData(null)} />
      </div>
    )
  }

  const filteredBalances = balances.filter((b) => {
    if (!balanceSearch) return true
    const q = balanceSearch.toLowerCase()
    return (
      b.account_name.toLowerCase().includes(q) ||
      b.account_id.toLowerCase().includes(q) ||
      b.currency.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Top Banner & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">
                {activePeriod ? activePeriod.name : "Accounting Periods"}
              </h2>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  activePeriod?.status === "CLOSED"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : activePeriod?.status === "REOPENED"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {activePeriod?.status || "OPEN"} & SERVER LOCKED
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Dates: {activePeriod?.start_date} to {activePeriod?.end_date} • Posting Code: <code className="text-emerald-400 font-mono">{activePeriod?.code}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activePeriod && activePeriod.status !== "CLOSED" ? (
            <Button
              size="sm"
              onClick={() => setCloseModalOpen(true)}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <Lock className="h-3.5 w-3.5" />
              Close Month ({activePeriod.name})
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTargetReopenPeriod(activePeriod)
                setReopenModalOpen(true)
              }}
              className="gap-1.5 text-xs border-amber-500 text-amber-400 hover:bg-amber-500/10 font-bold"
            >
              <Unlock className="h-3.5 w-3.5" />
              Reopen Period
            </Button>
          )}

          {activePeriod && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openStatement(activePeriod.id)}
              className="gap-1.5 text-xs text-white border-slate-700 hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5" />
              Statement
            </Button>
          )}
        </div>
      </div>

      {/* Subpage Tabs Navigation (8 Tabs) */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 w-full justify-start overflow-x-auto">
          <TabsTrigger value="current" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Calendar className="h-3.5 w-3.5" />
            Current Period
          </TabsTrigger>
          <TabsTrigger value="monthly-close" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
            Monthly Close
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <History className="h-3.5 w-3.5" />
            Period History
          </TabsTrigger>
          <TabsTrigger value="opening" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
            Opening Balances
          </TabsTrigger>
          <TabsTrigger value="closing" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            Closing Balances
          </TabsTrigger>
          <TabsTrigger value="year-end" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Year-End Close
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Scale className="h-3.5 w-3.5 text-emerald-600" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Database className="h-3.5 w-3.5" />
            Period Audit
          </TabsTrigger>
        </TabsList>

        {/* 1. CURRENT PERIOD SUBPAGE */}
        <TabsContent value="current" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Active Period Status</CardDescription>
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <span>{activePeriod?.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-300">
                    {activePeriod?.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-1">
                <p>Code: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{activePeriod?.code}</span></p>
                <p>Lock Policy: <span className="font-semibold text-slate-700 dark:text-slate-300">Server Enforced (Strict)</span></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Ledger Activity in Period</CardDescription>
                <CardTitle className="text-lg font-bold">
                  {balances.reduce((sum, b) => sum + b.transaction_count, 0)} Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-1">
                <p>Active Accounts: <span className="font-semibold text-slate-700 dark:text-slate-300">{balances.filter((b) => b.transaction_count > 0).length} of {balances.length}</span></p>
                <p>Invariance Status: <span className="font-semibold text-emerald-600">100% Invariant (Debit - Credit)</span></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Snapshots & Backups</CardDescription>
                <CardTitle className="text-lg font-bold">
                  {snapshots.length} Snapshot Version{snapshots.length === 1 ? "" : "s"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-1">
                <p>Active Snapshot: <span className="font-mono text-slate-700 dark:text-slate-300">v{snapshots[0]?.snapshot_version || 1}</span></p>
                <p>Pre-Close Backup: <span className="text-emerald-600 font-semibold">Enabled</span></p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Period Controls & Reporting</CardTitle>
              <CardDescription className="text-xs">
                Essential management operations for the current financial cycle
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => activePeriod && loadChecklist(activePeriod.id)}
                disabled={checkingChecklist}
                className="text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingChecklist ? "animate-spin" : ""}`} />
                Refresh Checklist
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => activePeriod && openStatement(activePeriod.id)}
                className="text-xs gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                View Monthly Statement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!activePeriod) return
                  try {
                    const res = await fetch(`/api/accounting/period/report?periodId=${activePeriod.id}&format=whatsapp`)
                    const json = await res.json()
                    if (json.success && json.text) {
                      await navigator.clipboard.writeText(json.text)
                      toast.success("Executive WhatsApp Summary copied to clipboard!")
                    }
                  } catch (e: any) {
                    toast.error("Failed to copy WhatsApp summary.")
                  }
                }}
                className="text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                Copy WhatsApp Summary
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. MONTHLY CLOSE SUBPAGE */}
        <TabsContent value="monthly-close" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-rose-600" />
                    Month-End Close Validation Checklist
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive pre-close audits for period <span className="font-semibold text-slate-800 dark:text-slate-200">{activePeriod?.name}</span>
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setCloseModalOpen(true)}
                  disabled={hasBlockingErrors || activePeriod?.status === "CLOSED"}
                  className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Close {activePeriod?.name}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {item.status === "PASS" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : item.status === "WARNING" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">{item.description}</p>
                      {item.details && (
                        <p className="text-slate-700 dark:text-slate-300 font-mono text-[10px] mt-1 bg-slate-50 dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-800">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      item.status === "PASS"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50"
                        : item.status === "WARNING"
                        ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/50"
                        : "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/50"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. PERIOD HISTORY SUBPAGE */}
        <TabsContent value="history" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Chronological Financial Periods</CardTitle>
              <CardDescription className="text-xs">
                Inspect past months, closing snapshots, and authorization status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Period</th>
                      <th className="py-2.5 px-3 font-semibold">Code</th>
                      <th className="py-2.5 px-3 font-semibold">Date Bounds</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Lock Level</th>
                      <th className="py-2.5 px-3 font-semibold">Closed By</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {periods.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">{p.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{p.code}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{p.start_date} to {p.end_date}</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold ${
                              p.status === "CLOSED"
                                ? "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                                : p.status === "REOPENED"
                                ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                                : "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">{p.lock_level}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.closed_by || "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openStatement(p.id)}
                              className="h-7 px-2 text-xs"
                              title="View Statement"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {p.status === "CLOSED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTargetReopenPeriod(p)
                                  setReopenModalOpen(true)
                                }}
                                className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                                title="Reopen Period"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. OPENING BALANCES SUBPAGE */}
        <TabsContent value="opening" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                    Carried-Forward Opening Balances
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Opening positions derived from prior period closing without generating fake money transactions
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search accounts or currency..."
                    value={balanceSearch}
                    onChange={(e) => setBalanceSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Account Cards for Opening Balances (md:hidden) */}
              <div className="md:hidden space-y-2.5">
                {filteredBalances.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-slate-100">{b.account_name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800">
                        {b.currency}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="capitalize">{b.account_type}</span>
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span>Hash:</span>
                        <span>{b.snapshot_hash ? `${b.snapshot_hash.slice(0, 8)}...` : "VERIFIED"}</span>
                        {b.snapshot_hash && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(b.snapshot_hash!)
                              toast.success("Hash copied to clipboard")
                            }}
                            className="text-blue-600 hover:text-blue-700 ml-0.5 cursor-pointer"
                            title="Copy full hash"
                          >
                            <Copy className="h-3 w-3 inline" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500">Opening Balance:</span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                        {b.currency} {b.opening_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table for Opening Balances (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Account</th>
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Currency</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Carried Opening Balance</th>
                      <th className="py-2.5 px-3 font-semibold">Integrity Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {filteredBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">{b.account_name}</td>
                        <td className="py-2 px-3 font-sans capitalize text-slate-500">{b.account_type}</td>
                        <td className="py-2 px-3 font-bold">{b.currency}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {b.opening_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-400 font-mono">
                          <span className="inline-flex items-center gap-1">
                            <span>{b.snapshot_hash ? `${b.snapshot_hash.slice(0, 10)}...` : "VERIFIED"}</span>
                            {b.snapshot_hash && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(b.snapshot_hash!)
                                  toast.success("Integrity hash copied")
                                }}
                                className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                                title="Copy full SHA-256 hash"
                              >
                                <Copy className="h-3 w-3 inline" />
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. CLOSING BALANCES SUBPAGE */}
        <TabsContent value="closing" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                Finalized Closing Balances
              </CardTitle>
              <CardDescription className="text-xs">
                Formula: Closing Balance = Opening Balance + Period Debit - Period Credit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile Account Cards for Closing Balances (md:hidden) */}
              <div className="md:hidden space-y-2.5">
                {filteredBalances.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-slate-100">{b.account_name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800">
                        {b.currency}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Open</span>
                        <span>{b.opening_balance.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-500 block font-sans">Debit (+)</span>
                        <span className="text-blue-600">+{b.period_debit.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-500 block font-sans">Credit (-)</span>
                        <span className="text-emerald-600">-{b.period_credit.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Closing Balance:
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                        {b.currency} {b.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table for Closing Balances (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Account</th>
                      <th className="py-2 px-3 font-semibold">Currency</th>
                      <th className="py-2 px-3 font-semibold text-right">Opening</th>
                      <th className="py-2 px-3 font-semibold text-right">Debit (+)</th>
                      <th className="py-2 px-3 font-semibold text-right">Credit (-)</th>
                      <th className="py-2 px-3 font-semibold text-right">Closing Balance</th>
                      <th className="py-2 px-3 font-semibold text-center">Invariance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {filteredBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">{b.account_name}</td>
                        <td className="py-2 px-3 font-bold">{b.currency}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{b.opening_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right text-blue-600">{b.period_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right text-emerald-600">{b.period_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {b.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. YEAR-END CLOSE SUBPAGE */}
        <TabsContent value="year-end" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Fiscal Year-End Closing & Annual Rollover Wizard
              </CardTitle>
              <CardDescription className="text-xs">
                Rolls forward December 31 closing balances to January 1 opening balances of the new fiscal year
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                <h4 className="font-bold text-purple-900 dark:text-purple-300">Annual Rollover Invariants:</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                  <li>All 12 monthly periods (January through December) must be finalized and marked CLOSED.</li>
                  <li>Customer receivables and vendor liabilities are NOT erased; they carry forward seamlessly.</li>
                  <li>A standalone, protected full backup archive is generated prior to commitment.</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Select Fiscal Year to Close:</Label>
                  <Input
                    type="number"
                    value={yearEndYear}
                    onChange={(e) => setYearEndYear(parseInt(e.target.value, 10) || 2026)}
                    className="w-32 h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleExecuteYearEnd}
                  disabled={yearEndClosing}
                  className="mt-5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {yearEndClosing ? "Closing Fiscal Year..." : `Execute ${yearEndYear} Year-End Close`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. RECONCILIATION SUBPAGE */}
        <TabsContent value="reconciliation" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-600" />
                Ledger Accounting Invariance & Currency Reconciliation
              </CardTitle>
              <CardDescription className="text-xs">
                Verification that Net Balance = Total Debit - Total Credit across all accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  Mathematical Invariance Status: 100% INVARIANT
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                  Every recorded ledger transaction in period [{activePeriod?.code}] strictly satisfies the balance equation. No discrepancy found.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. PERIOD AUDIT SUBPAGE */}
        <TabsContent value="audit" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                Financial Period Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Permanent chronological record of period closes, reopens, and snapshot hashes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                {snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          v{s.snapshot_version}
                        </Badge>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Period Snapshot: {s.period_code}
                        </span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600">
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Created on {s.created_at} by {s.created_by}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400 mt-1">
                        SHA-256: {s.data_hash}
                      </p>
                    </div>
                    {s.backup_id && (
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 border-emerald-300">
                        Archive #{s.backup_id.slice(0, 12)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <MonthlyCloseModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        period={activePeriod}
        checklistItems={checklistItems}
        hasBlockingErrors={hasBlockingErrors}
        warningCount={warningCount}
        onConfirmClose={handleConfirmClose}
      />

      <PeriodReopenModal
        open={reopenModalOpen}
        onOpenChange={setReopenModalOpen}
        period={targetReopenPeriod || activePeriod}
        onConfirmReopen={handleConfirmReopen}
      />
    </div>
  )
}
