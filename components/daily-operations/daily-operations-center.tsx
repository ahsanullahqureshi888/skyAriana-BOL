'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DailyTask,
  DailyTaskType,
  DailyTaskPriority,
  DailyTaskStatus,
  DailyTaskDepartment,
  DailyOperationsConfig,
  DailyOperationsSummaryMetrics,
  DailyOperationsReportRecord,
  CollectionNote,
} from '@/lib/types/daily-operations'
import { useApp } from '@/lib/app-context'
import {
  Sun,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  Plus,
  RefreshCw,
  FileText,
  Truck,
  Ship,
  DollarSign,
  Send,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Building2,
  MessageSquare,
  Users,
  Search,
  ExternalLink,
  Lock,
  ArrowRight,
  Sparkles,
  Sliders,
  Save,
} from 'lucide-react'
import { QuickTaskModal } from './quick-task-modal'

export function DailyOperationsCenter() {
  const { currentUser, setView } = useApp()

  const [activeTab, setActiveTab] = useState<
    'morning' | 'tasks' | 'operations' | 'finance' | 'documents' | 'eod_report' | 'settings'
  >('morning')

  // Data states
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [reports, setReports] = useState<DailyOperationsReportRecord[]>([])
  const [activeReport, setActiveReport] = useState<DailyOperationsReportRecord | null>(null)
  const [config, setConfig] = useState<DailyOperationsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false)

  // Filters
  const [taskScope, setTaskScope] = useState<'my' | 'team'>('my')
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE')
  const [searchQuery, setSearchQuery] = useState('')

  // Report Generator Controls
  const [selectedReportDate, setSelectedReportDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [managementNote, setManagementNote] = useState('')
  const [whatsappMode, setWhatsappMode] = useState<'SHORT' | 'DETAILED'>('SHORT')
  const [whatsappLang, setWhatsappLang] = useState<'EN' | 'PS' | 'FA'>('EN')
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false)
  const [reportActionLoading, setReportActionLoading] = useState(false)

  // Collection Note Modal state
  const [activeNoteTaskId, setActiveNoteTaskId] = useState<string | null>(null)
  const [noteMethod, setNoteMethod] = useState<'Phone' | 'WhatsApp' | 'Email' | 'In Person'>('Phone')
  const [noteText, setNoteText] = useState('')
  const [notePromiseDate, setNotePromiseDate] = useState('')
  const [noteResult, setNoteResult] = useState<any>('Payment Promised')

  // Feedback notifications
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'info'; text: string } | null>(
    null
  )

  const showBanner = (text: string, type: 'success' | 'info' = 'success') => {
    setBannerNotice({ text, type })
    setTimeout(() => setBannerNotice(null), 4000)
  }

  // Initial Data Fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/operations/daily')
      const data = await res.json()
      if (data.success) {
        setTasks(data.tasks || [])
        setConfig(data.config || null)
        setActiveReport(data.latestReport || null)
      }

      // Fetch reports history
      const rRes = await fetch('/api/operations/daily?view=reports')
      const rData = await rRes.json()
      if (rData.success) {
        setReports(rData.reports || [])
      }
    } catch (err) {
      console.error('Failed to load daily operations data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Run Morning / Daily System Scan
  const handleRunDailyScan = async () => {
    try {
      setScanning(true)
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-tasks',
          actor: currentUser?.name || currentUser?.username || 'Staff User',
        }),
      })
      const data = await res.json()
      if (data.success) {
        showBanner(
          `Morning scan complete! ${data.createdCount} new task(s) created, ${data.updatedCount} refreshed, ${data.resolvedCount} auto-resolved.`,
          'success'
        )
        await fetchData()
      }
    } catch (err: any) {
      alert(`Error during scan: ${err.message}`)
    } finally {
      setScanning(false)
    }
  }

  // Update Task Status
  const handleUpdateStatus = async (taskId: string, nextStatus: DailyTaskStatus) => {
    try {
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-task',
          id: taskId,
          updates: { status: nextStatus },
          actor: currentUser?.name || 'Staff User',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)))
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  // Submit Collection Note
  const handleSubmitCollectionNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeNoteTaskId || !noteText.trim()) return

    try {
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-collection-note',
          taskId: activeNoteTaskId,
          noteData: {
            date: new Date().toISOString().split('T')[0],
            user: currentUser?.name || 'Accountant',
            contactMethod: noteMethod,
            note: noteText.trim(),
            promisedDate: notePromiseDate || undefined,
            result: noteResult,
          },
          actor: currentUser?.name || 'Accountant',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setTasks((prev) => prev.map((t) => (t.id === activeNoteTaskId ? data.task : t)))
        setActiveNoteTaskId(null)
        setNoteText('')
        setNotePromiseDate('')
        showBanner('Collection note & follow-up date saved.', 'success')
      }
    } catch (err: any) {
      alert(`Failed to save note: ${err.message}`)
    }
  }

  // Generate End-of-Day Report
  const handleGenerateReport = async (forceRegenerate = false) => {
    try {
      setReportActionLoading(true)
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-report',
          reportDate: selectedReportDate,
          managementNote: managementNote.trim() || undefined,
          forceRegenerate,
          actor: currentUser?.name || 'Operations Manager',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setActiveReport(data.report)
        showBanner(`Daily report generated successfully (Rev ${data.report.version}).`, 'success')
        // Refresh reports list
        const rRes = await fetch('/api/operations/daily?view=reports')
        const rData = await rRes.json()
        if (rData.success) setReports(rData.reports || [])
      }
    } catch (err: any) {
      alert(`Error generating report: ${err.message}`)
    } finally {
      setReportActionLoading(false)
    }
  }

  // Finalize Report Snapshot
  const handleFinalizeReport = async () => {
    if (!activeReport) return
    if (!confirm('Are you sure you want to finalize this Daily Operations Report? Finalized reports are locked as official records.')) return

    try {
      setReportActionLoading(true)
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize-report',
          reportId: activeReport.id,
          actor: currentUser?.name || 'Executive Director',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setActiveReport(data.report)
        showBanner(`Report ${activeReport.id} finalized and snapshot locked.`, 'success')
      }
    } catch (err: any) {
      alert(`Error finalizing: ${err.message}`)
    } finally {
      setReportActionLoading(false)
    }
  }


  // Export Report to Excel CSV
  const handleExportExcel = () => {
    if (!activeReport) return

        const rows: (string | number | undefined | null)[][] = [
      ['SKY ARIANA LIMITED — DAILY OPERATIONS REPORT'],
      ['Report ID', activeReport.id],
      ['Date', activeReport.reportDate],
      ['Version', `Rev ${activeReport.version}`],
      ['Status', activeReport.status],
      ['Generated At', activeReport.generatedAt],
      ['Generated By', activeReport.generatedBy],
      [''],
      ['OPERATIONAL DISPATCHES'],
      ['BOL Number', 'Container Number', 'Current Location', 'Origin', 'Destination', 'Status', 'ETA'],
      ...activeReport.operations.map((o) => [
        o.bolNumber || '',
        o.containerNumber || '',
        o.currentLocation || '',
        o.origin || '',
        o.destination || '',
        o.status || '',
        o.eta || 'N/A',
      ]),
      [''],
      ['BORDER STATIONS & CLEARANCE DELAYS'],
      ['BOL Number', 'Truck Plate', 'Driver Name', 'Border Station', 'Waiting Hours', 'Status'],
      ...activeReport.border.map((b) => [
        b.bolNumber || '',
        b.truckPlate || '',
        b.driverName || '',
        b.borderName || '',
        String(b.waitingDurationHours ?? 0),
        b.status || '',
      ]),
      [''],
      ['INCOMPLETE & PENDING DOCUMENTS'],
      ['BOL Number', 'Customer', 'Document Type', 'Status', 'Missing Items'],
      ...activeReport.documents.map((d) => [
        d.bolNumber || '',
        d.customerName || '',
        d.documentName || '',
        d.status || '',
        (d.missingItems || []).join('; '),
      ]),
      [''],
      ['CUSTOMER PAYMENTS COLLECTED TODAY'],
      ['Customer', 'Amount', 'Currency', 'Reference', 'Invoice Number'],
      ...activeReport.customerPayments.map((p) => [
        p.customerName || '',
        String(p.amount ?? 0),
        p.currency || 'USD',
        p.reference || '',
        p.invoiceNumber || 'N/A',
      ]),
      [''],
      ['OVERDUE RECEIVABLES & COLLECTION FOLLOW-UPS'],
      ['Customer', 'Invoice Number', 'Outstanding Amount', 'Currency', 'Days Overdue', 'Next Action'],
      ...activeReport.outstanding.map((o) => [
        o.customerName || '',
        o.invoiceNumber || '',
        String(o.outstandingAmount ?? 0),
        o.currency || 'USD',
        String(o.daysOverdue ?? 0),
        o.nextAction || '',
      ]),
      [''],
      ['SUPPLIER BILLS & PAYABLES'],
      ['Supplier', 'Bill Number', 'Total Amount', 'Outstanding Amount', 'Currency', 'Due Date', 'Status'],
      ...activeReport.supplierPayments.map((s) => [
        s.supplierName || '',
        s.billNumber || '',
        String(s.totalAmount ?? 0),
        String(s.outstandingAmount ?? 0),
        s.currency || 'USD',
        s.dueDate || '',
        s.status || '',
      ]),
    ]

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const escaped = String(cell || '').replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(',')
      )
      .join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Daily_Operations_Report_${activeReport.reportDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showBanner('Report CSV exported successfully!', 'success')
  }

  // Copy WhatsApp Status
  const handleCopyWhatsApp = async () => {
    if (!activeReport) {
      await handleGenerateReport()
    }
    try {
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'whatsapp-status',
          reportId: activeReport?.id,
          mode: whatsappMode,
          language: whatsappLang,
        }),
      })
      const data = await res.json()
      if (data.success && data.text) {
        await navigator.clipboard.writeText(data.text)
        setCopiedWhatsapp(true)
        setTimeout(() => setCopiedWhatsapp(false), 2500)
        showBanner('WhatsApp daily status copied to clipboard!', 'success')
      }
    } catch (err: any) {
      alert(`Error generating WhatsApp text: ${err.message}`)
    }
  }

  // Top Summary Metric Calculations
  const summaryMetrics: DailyOperationsSummaryMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')

    return {
      activeShipments: activeReport?.summary.activeShipments || 0,
      updatesNeeded: tasks.filter((t) => t.task_type === 'TRACKING_UPDATE_REQUIRED' && t.status !== 'COMPLETED').length,
      atBorder: activeReport?.summary.atBorder || tasks.filter((t) => t.task_type === 'BORDER_FOLLOWUP' && t.status !== 'COMPLETED').length,
      atPort: activeReport?.summary.atPort || tasks.filter((t) => t.task_type === 'PORT_FOLLOWUP' && t.status !== 'COMPLETED').length,
      atSea: activeReport?.summary.atSea || 0,
      arrivingSoon: tasks.filter((t) => t.task_type === 'ETA_FOLLOWUP' && t.status !== 'COMPLETED').length,
      documentsPending: tasks.filter((t) => t.task_type === 'DOCUMENT_INCOMPLETE' && t.status !== 'COMPLETED').length,
      invoicesOverdue: tasks.filter((t) => (t.task_type === 'CUSTOMER_PAYMENT_FOLLOWUP' || t.task_type === 'INVOICE_FOLLOWUP') && t.status !== 'COMPLETED').length,
      customerFollowUps: tasks.filter((t) => t.task_type === 'CUSTOMER_PAYMENT_FOLLOWUP' && t.status !== 'COMPLETED').length,
      supplierPaymentsDue: tasks.filter((t) => t.task_type === 'SUPPLIER_PAYMENT_DUE' && t.status !== 'COMPLETED').length,
      pendingApprovals: tasks.filter((t) => t.task_type === 'APPROVAL_REQUIRED' && t.status !== 'COMPLETED').length,
      criticalIssues: tasks.filter((t) => t.priority === 'URGENT' && t.status !== 'COMPLETED').length,

      tasksCompletedToday: tasks.filter((t) => t.status === 'COMPLETED' && (t.completed_at || '').split('T')[0] === todayStr).length,
      tasksOpenToday: activeTasks.length,
      trackingUpdatesAddedToday: activeReport?.summary.trackingUpdatesAddedToday || 0,
      documentsFinalizedToday: activeReport?.summary.documentsFinalizedToday || 0,
      paymentsRecordedToday: activeReport?.summary.paymentsRecordedToday || 0,
      bolsCreatedToday: activeReport?.summary.bolsCreatedToday || 0,
    }
  }, [tasks, activeReport])

  // Morning Priorities Partitioning
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const morningPriorities = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')

    const urgent = active.filter((t) => t.priority === 'URGENT')
    const overdue = active.filter(
      (t) => t.priority !== 'URGENT' && ((t.status === 'OVERDUE') || (t.due_date && t.due_date < todayStr))
    )
    const dueToday = active.filter(
      (t) => t.priority !== 'URGENT' && t.status !== 'OVERDUE' && t.due_date === todayStr
    )
    const upcoming = active.filter(
      (t) =>
        t.priority !== 'URGENT' &&
        t.status !== 'OVERDUE' &&
        (!t.due_date || t.due_date > todayStr)
    )

    return { urgent, overdue, dueToday, upcoming }
  }, [tasks, todayStr])

  // Filtered Tasks for Task Grid
  const filteredTasks = useMemo(() => {
    let list = [...tasks]
    const curUser = (currentUser?.username || '').toLowerCase()

    if (taskScope === 'my') {
      list = list.filter(
        (t) =>
          (t.assigned_to && t.assigned_to.toLowerCase() === curUser) ||
          (!t.assigned_to && t.assigned_department === 'Operations')
      )
    }

    if (selectedDept !== 'ALL') {
      list = list.filter((t) => t.assigned_department === selectedDept)
    }

    if (selectedPriority !== 'ALL') {
      list = list.filter((t) => t.priority === selectedPriority)
    }

    if (selectedStatus === 'ACTIVE') {
      list = list.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
    } else if (selectedStatus !== 'ALL') {
      list = list.filter((t) => t.status === selectedStatus)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.bol_number && t.bol_number.toLowerCase().includes(q)) ||
          (t.account_name && t.account_name.toLowerCase().includes(q)) ||
          (t.container_number && t.container_number.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
    }

    return list
  }, [tasks, taskScope, selectedDept, selectedPriority, selectedStatus, searchQuery, currentUser])

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-6 space-y-6">
      {/* Toast / Banner Notification */}
      {bannerNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl animate-in slide-in-from-bottom duration-200 text-xs font-black">
          <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600 shrink-0" />
          <span>{bannerNotice.text}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-radial from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                Daily Operations Command
              </span>
              <span className="text-slate-400 text-xs font-mono font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <Sun className="w-7 h-7 text-amber-400 animate-pulse" />
              <span>DAILY OPERATIONS CENTER</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl mt-1">
              Today's shipments, follow-ups, documents, payments, and end-of-day operations reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleRunDailyScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              title="Runs automatic rules across shipments, borders, invoices, and documents"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning System...' : 'Run Morning Scan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuickTaskOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (12 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Active Shipments */}
        <div
          onClick={() => setActiveTab('operations')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Active Shipments</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summaryMetrics.activeShipments}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5 flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>In pipeline</span>
          </div>
        </div>

        {/* Card 2: Updates Needed */}
        <div
          onClick={() => {
            setActiveTab('tasks')
            setSelectedStatus('ACTIVE')
          }}
          className={`p-3.5 rounded-2xl border shadow-xs transition-all cursor-pointer ${
            summaryMetrics.updatesNeeded > 0
              ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Updates Needed</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {summaryMetrics.updatesNeeded}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-500 font-bold mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Stale tracking</span>
          </div>
        </div>

        {/* Card 3: At Border */}
        <div
          onClick={() => setActiveTab('operations')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">At Border</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summaryMetrics.atBorder}
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1">
            <span>Islam Qala / Torghundi</span>
          </div>
        </div>

        {/* Card 4: At Port */}
        <div
          onClick={() => setActiveTab('operations')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">At Port</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summaryMetrics.atPort}
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1">
            <span>Bandar Abbas / Chabahar</span>
          </div>
        </div>

        {/* Card 5: Documents Pending */}
        <div
          onClick={() => setActiveTab('documents')}
          className={`p-3.5 rounded-2xl border shadow-xs transition-all cursor-pointer ${
            summaryMetrics.documentsPending > 0
              ? 'bg-purple-50/70 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Docs Pending</div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {summaryMetrics.documentsPending}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-500 font-bold mt-0.5 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>Incomplete drafts</span>
          </div>
        </div>

        {/* Card 6: Invoices Overdue */}
        <div
          onClick={() => setActiveTab('finance')}
          className={`p-3.5 rounded-2xl border shadow-xs transition-all cursor-pointer ${
            summaryMetrics.invoicesOverdue > 0
              ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Invoices Overdue</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summaryMetrics.invoicesOverdue}
          </div>
          <div className="text-[10px] text-rose-700 dark:text-rose-500 font-bold mt-0.5 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>Collections pending</span>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-black">
        <button
          type="button"
          onClick={() => setActiveTab('morning')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'morning'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Morning Priorities / اولویت‌های صبح</span>
          {morningPriorities.urgent.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
              {morningPriorities.urgent.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'tasks'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>My & Team Tasks / وظایف تیم</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]">
            {tasks.filter((t) => t.status !== 'COMPLETED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'operations'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4 text-sky-400" />
          <span>Operations & Borders / عملیات و مرزها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'finance'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Follow-Up Center / پیگیری مالی</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'documents'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Documents & Approvals / اسناد و تاییدها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('eod_report')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'eod_report'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>End-of-Day Report / راپور روزانه</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Operations Settings / تنظیمات</span>
        </button>
      </div>

      {/* 4. Tab Content */}

      {/* =================================================================== */}
      {/* TAB 1: MORNING PRIORITIES                                           */}
      {/* =================================================================== */}
      {activeTab === 'morning' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Group 1: URGENT */}
          {morningPriorities.urgent.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Urgent Attention Required ({morningPriorities.urgent.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {morningPriorities.urgent.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onStatusChange={(s) => handleUpdateStatus(t.id, s)}
                    onAddNote={() => setActiveNoteTaskId(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group 2: OVERDUE */}
          {morningPriorities.overdue.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Overdue Follow-Ups ({morningPriorities.overdue.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {morningPriorities.overdue.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onStatusChange={(s) => handleUpdateStatus(t.id, s)}
                    onAddNote={() => setActiveNoteTaskId(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group 3: DUE TODAY */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Due Today ({morningPriorities.dueToday.length})</span>
            </div>
            {morningPriorities.dueToday.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 font-medium">
                No standard tasks due today. All active shipments are on schedule.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {morningPriorities.dueToday.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onStatusChange={(s) => handleUpdateStatus(t.id, s)}
                    onAddNote={() => setActiveNoteTaskId(t.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Group 4: UPCOMING */}
          {morningPriorities.upcoming.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <ChevronRight className="w-4 h-4" />
                <span>Upcoming & Carried Over ({morningPriorities.upcoming.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {morningPriorities.upcoming.slice(0, 8).map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onStatusChange={(s) => handleUpdateStatus(t.id, s)}
                    onAddNote={() => setActiveNoteTaskId(t.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MY & TEAM TASKS                                              */}
      {/* =================================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Controls Strip */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTaskScope('my')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                    taskScope === 'my'
                      ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  My Tasks ({tasks.filter((t) => t.status !== 'COMPLETED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskScope('team')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                    taskScope === 'team'
                      ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Team Tasks
                </button>
              </div>

              {/* Department Filter */}
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-hidden"
              >
                <option value="ALL">All Departments</option>
                <option value="Operations">Operations</option>
                <option value="Tracking">Tracking</option>
                <option value="Documents">Documents</option>
                <option value="Accounting">Accounting</option>
                <option value="Management">Management</option>
              </select>

              {/* Priority Filter */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="h-9 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-hidden"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search BOL, client, container..."
                className="w-full h-9 pl-9 pr-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-hidden"
              />
            </div>
          </div>

          {/* Tasks Grid */}
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
              No tasks found matching current filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onStatusChange={(s) => handleUpdateStatus(t.id, s)}
                  onAddNote={() => setActiveNoteTaskId(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: OPERATIONS & BORDERS                                         */}
      {/* =================================================================== */}
      {activeTab === 'operations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Border Station Trucks */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>Trucks & Containers at Border Stations (Islam Qala, Torghundi, Hairatan)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 text-xs font-black">
                {activeReport?.border.length || 0} active trucks
              </span>
            </div>

            {(!activeReport?.border || activeReport.border.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                No trucks currently reporting delays at border customs stations.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">BOL Number</th>
                      <th className="p-2.5">Truck / Plate</th>
                      <th className="p-2.5">Driver</th>
                      <th className="p-2.5">Border Station</th>
                      <th className="p-2.5">Arrival</th>
                      <th className="p-2.5">Waiting Duration</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeReport.border.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold font-mono text-blue-700 dark:text-blue-400">
                          {b.bolNumber}
                        </td>
                        <td className="p-2.5 font-mono">{b.truckPlate}</td>
                        <td className="p-2.5">{b.driverName}</td>
                        <td className="p-2.5 font-bold">{b.borderName}</td>
                        <td className="p-2.5">{b.arrivalDate}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              b.waitingDurationHours > 48
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}
                          >
                            {b.waitingDurationHours}h
                          </span>
                        </td>
                        <td className="p-2.5 capitalize">{b.status.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Port Operations */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Ship className="w-4 h-4 text-sky-500" />
                <span>Port Operations & Vessel Connections</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-300 text-xs font-black">
                {activeReport?.port.length || 0} at ports
              </span>
            </div>

            {(!activeReport?.port || activeReport.port.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                No containers waiting at maritime ports currently.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">BOL</th>
                      <th className="p-2.5">Container</th>
                      <th className="p-2.5">Port</th>
                      <th className="p-2.5">Vessel / Voyage</th>
                      <th className="p-2.5">ETD</th>
                      <th className="p-2.5">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeReport.port.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold font-mono text-blue-700 dark:text-blue-400">
                          {p.bolNumber}
                        </td>
                        <td className="p-2.5 font-mono">{p.containerNumber}</td>
                        <td className="p-2.5 font-bold">{p.portName}</td>
                        <td className="p-2.5">{p.vesselName ? `${p.vesselName} (${p.voyageNumber || 'N/A'})` : 'Awaiting Booking'}</td>
                        <td className="p-2.5">{p.etd || 'TBD'}</td>
                        <td className="p-2.5">{p.eta || 'TBD'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: FINANCIAL FOLLOW-UP CENTER                                  */}
      {/* =================================================================== */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Customer Collection Overdue Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Customer Receivables & Collection Follow-Up</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Overdue invoices and collection notes with recorded payment promise dates
                </p>
              </div>
            </div>

            {(!activeReport?.outstanding || activeReport.outstanding.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                No customer invoices are currently overdue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Customer</th>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Outstanding</th>
                      <th className="p-2.5">Overdue Days</th>
                      <th className="p-2.5">Next Action</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeReport.outstanding.map((o, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {o.customerName}
                        </td>
                        <td className="p-2.5 font-mono text-blue-700 dark:text-blue-400">
                          {o.invoiceNumber}
                        </td>
                        <td className="p-2.5 font-black text-rose-600 dark:text-rose-400 font-mono">
                          {o.outstandingAmount.toLocaleString()} {o.currency}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                              o.daysOverdue > 14
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}
                          >
                            {o.daysOverdue} days
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{o.nextAction || 'Follow up'}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const match = tasks.find(
                                (t) => t.invoice_number === o.invoiceNumber || t.account_name === o.customerName
                              )
                              if (match) setActiveNoteTaskId(match.id)
                              else {
                                // Trigger quick note
                                setActiveNoteTaskId(o.invoiceNumber)
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 transition-all"
                          >
                            Add Note
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supplier Payables Due */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-500" />
              <span>Supplier Bills & Transport Payables</span>
            </h3>

            {(!activeReport?.supplierPayments || activeReport.supplierPayments.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                No supplier bills currently pending payment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Supplier</th>
                      <th className="p-2.5">Bill #</th>
                      <th className="p-2.5">BOL</th>
                      <th className="p-2.5">Outstanding</th>
                      <th className="p-2.5">Due Date</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeReport.supplierPayments.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold">{s.supplierName}</td>
                        <td className="p-2.5 font-mono">{s.billNumber}</td>
                        <td className="p-2.5 font-mono text-slate-500">{s.bolNumber || 'N/A'}</td>
                        <td className="p-2.5 font-black text-slate-900 dark:text-white font-mono">
                          {s.outstandingAmount.toLocaleString()} {s.currency}
                        </td>
                        <td className="p-2.5">{s.dueDate}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              s.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                : s.status === 'DUE_TODAY'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: DOCUMENTS & APPROVALS                                        */}
      {/* =================================================================== */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Documents Pending Finalization */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>Incomplete Documents & Readiness Checklists</span>
            </h3>

            {(!activeReport?.documents || activeReport.documents.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                All export documents across active shipments are finalized and verified.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">BOL</th>
                      <th className="p-2.5">Customer</th>
                      <th className="p-2.5">Document</th>
                      <th className="p-2.5">Missing Items / Readiness</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeReport.documents.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold font-mono text-blue-700 dark:text-blue-400">
                          {d.bolNumber}
                        </td>
                        <td className="p-2.5">{d.customerName}</td>
                        <td className="p-2.5 font-bold">{d.documentName}</td>
                        <td className="p-2.5 text-rose-600 dark:text-rose-400 font-medium">
                          {d.missingItems?.join(', ') || 'Sign-off required'}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold text-[10px]">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Approvals */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Pending Four-Eyes Governance Approvals</span>
            </h3>

            {(!activeReport?.approvals || activeReport.approvals.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                No authorization requests currently pending.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Request Type</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Requester</th>
                      <th className="p-2.5">Waiting Time</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {activeReport.approvals.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold uppercase">{a.type.replace(/_/g, ' ')}</td>
                        <td className="p-2.5 font-black font-mono">
                          {a.amount ? `${a.amount.toLocaleString()} ${a.currency}` : 'Non-Monetary'}
                        </td>
                        <td className="p-2.5">{a.requester}</td>
                        <td className="p-2.5">{a.waitingDurationHours} hours</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold text-[10px]">
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: END-OF-DAY STATUS REPORT GENERATOR                           */}
      {/* =================================================================== */}
      {activeTab === 'eod_report' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Report Date:
              </label>
              <input
                type="date"
                value={selectedReportDate}
                onChange={(e) => setSelectedReportDate(e.target.value)}
                className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => handleGenerateReport(true)}
                disabled={reportActionLoading}
                className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-black text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {reportActionLoading ? 'Compiling...' : 'Generate Daily Report'}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* WhatsApp Quick Formats */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <select
                  value={whatsappMode}
                  onChange={(e) => setWhatsappMode(e.target.value as any)}
                  className="h-7 px-2 text-[11px] font-bold bg-transparent text-slate-700 dark:text-slate-200 outline-hidden"
                >
                  <option value="SHORT">Short Summary</option>
                  <option value="DETAILED">Detailed Dispatch</option>
                </select>
                <select
                  value={whatsappLang}
                  onChange={(e) => setWhatsappLang(e.target.value as any)}
                  className="h-7 px-2 text-[11px] font-bold bg-transparent text-slate-700 dark:text-slate-200 outline-hidden border-l border-slate-200 dark:border-slate-700"
                >
                  <option value="EN">English</option>
                  <option value="PS">پښتو (Pashto)</option>
                  <option value="FA">دری (Dari)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {copiedWhatsapp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWhatsapp ? 'Copied!' : 'Copy WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all cursor-pointer"
                title="Export complete report to Excel CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print A4</span>
              </button>

              {activeReport && activeReport.status !== 'FINAL' && (
                <button
                  type="button"
                  onClick={handleFinalizeReport}
                  disabled={reportActionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Finalize & Lock</span>
                </button>
              )}
            </div>
          </div>

          {/* Daily Management Note Input */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Daily Management Note / یادداشت روزانه مدیریت
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={managementNote}
                onChange={(e) => setManagementNote(e.target.value)}
                placeholder="e.g., 3 containers cleared customs at Bandar Abbas; road dispatches on schedule."
                className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => handleGenerateReport(true)}
                className="px-4 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 shrink-0"
              >
                Save Note
              </button>
            </div>
          </div>

          {/* Live Printable Report Preview */}
          {activeReport ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none">
              {/* Report Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    SKY ARIANA LIMITED — LOGISTICS & FINANCE
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    Official End-of-Day Status Report (تاریخ: {activeReport.reportDate})
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      activeReport.status === 'FINAL'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {activeReport.status} (Rev {activeReport.version})
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    Generated: {new Date(activeReport.generatedAt).toLocaleTimeString()} by {activeReport.generatedBy}
                  </div>
                </div>
              </div>

              {/* Management Note Callout */}
              {activeReport.managementNote && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 font-medium">
                  <span className="font-black">Executive Note: </span>
                  {activeReport.managementNote}
                </div>
              )}

              {/* Multi-Currency Financial Collections & Payables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900">
                  <div className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-400">
                    Collections Recorded Today (Segregated)
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-300 mt-1">
                    {activeReport.customerPaymentTotals.length > 0
                      ? activeReport.customerPaymentTotals.map((t) => `${t.amount.toLocaleString()} ${t.currency}`).join(' | ')
                      : '0.00 USD'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900">
                  <div className="text-[11px] font-black uppercase text-rose-800 dark:text-rose-400">
                    Total Overdue Receivables (Segregated)
                  </div>
                  <div className="text-sm font-black font-mono text-rose-900 dark:text-rose-300 mt-1">
                    {activeReport.outstandingTotals.length > 0
                      ? activeReport.outstandingTotals.map((t) => `${t.amount.toLocaleString()} ${t.currency}`).join(' | ')
                      : '0.00 USD'}
                  </div>
                </div>
              </div>

              {/* Report Summary Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {activeReport.summary.activeShipments}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Active Freight</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {activeReport.summary.atBorder}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Border Trucks</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {activeReport.summary.atPort}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Port Containers</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {activeReport.tasks.completedCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Tasks Resolved Today</div>
                </div>
              </div>

              {/* Operational Dispatches Table */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Active Dispatches & Movement Status
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                      <tr>
                        <th className="p-2">BOL</th>
                        <th className="p-2">Container</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Route</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {activeReport.operations.slice(0, 10).map((o, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono font-bold">{o.bolNumber}</td>
                          <td className="p-2 font-mono">{o.containerNumber}</td>
                          <td className="p-2 font-bold">{o.currentLocation}</td>
                          <td className="p-2">{o.origin} ➔ {o.destination}</td>
                          <td className="p-2 capitalize">{o.status.replace(/_/g, ' ')}</td>
                          <td className="p-2">{o.eta || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 font-medium">
              Click "Generate Daily Report" above to compile the operations report for {selectedReportDate}.
            </div>
          )}

          {/* Report History */}
          {reports.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Archived Daily Operations Reports ({reports.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveReport(r)}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl cursor-pointer transition-all"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {r.reportDate} (Rev {r.version})
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        {r.summary.activeShipments} active, {r.tasks.completedCount} tasks resolved
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'FINAL' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 7: DAILY OPERATIONS SETTINGS                                    */}
      {/* =================================================================== */}
      {activeTab === 'settings' && config && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Daily Operations Thresholds & Rules</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Configure follow-up intervals, overdue criteria, and automated department task assignment.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const res = await fetch('/api/operations/daily', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'update-config',
                      updates: config,
                      actor: currentUser?.name || 'Administrator',
                    }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    setConfig(data.config)
                    showBanner('Daily Operations configuration saved successfully.', 'success')
                  }
                } catch (err: any) {
                  alert(`Failed to save configuration: ${err.message}`)
                }
              }}
              className="space-y-6"
            >
              {/* Follow-up Thresholds */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Tracking & Movement Thresholds (Hours)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Road Transit Update Follow-Up (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={config.trackingFollowUpHoursRoad}
                      onChange={(e) =>
                        setConfig({ ...config, trackingFollowUpHoursRoad: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default: 24 hours</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Port Transit Follow-Up (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={config.trackingFollowUpHoursPort}
                      onChange={(e) =>
                        setConfig({ ...config, trackingFollowUpHoursPort: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default: 48 hours</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Sea Transit Follow-Up (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={config.trackingFollowUpHoursSea}
                      onChange={(e) =>
                        setConfig({ ...config, trackingFollowUpHoursSea: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default: 72 hours</span>
                  </div>
                </div>
              </div>

              {/* Station Delays & Milestones */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Border Station & Milestones
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Border Station Delay Warning (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={config.borderFollowUpHours}
                      onChange={(e) =>
                        setConfig({ ...config, borderFollowUpHours: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default: 48 hours</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      ETA Approaching Reminder (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={config.etaReminderDays}
                      onChange={(e) =>
                        setConfig({ ...config, etaReminderDays: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default: 2 days before arrival</span>
                  </div>
                </div>
              </div>

              {/* Documents & Finance Reminders */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Documents & Financial Reminders (Days)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Document Completion Deadline (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={config.documentReminderDays}
                      onChange={(e) =>
                        setConfig({ ...config, documentReminderDays: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Customer Collection Reminder (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={config.customerCollectionReminderDays}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          customerCollectionReminderDays: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Supplier Bill Due Reminder (Days Ahead)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={config.supplierDueReminderDays}
                      onChange={(e) =>
                        setConfig({ ...config, supplierDueReminderDays: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Department Auto-Assignment */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Automated Task Department Routing
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Tracking Tasks
                    </label>
                    <select
                      value={config.autoAssignRules.tracking}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          autoAssignRules: { ...config.autoAssignRules, tracking: e.target.value as any },
                        })
                      }
                      className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Tracking">Tracking</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Document Tasks
                    </label>
                    <select
                      value={config.autoAssignRules.documents}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          autoAssignRules: { ...config.autoAssignRules, documents: e.target.value as any },
                        })
                      }
                      className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Documents">Documents</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Accounting Tasks
                    </label>
                    <select
                      value={config.autoAssignRules.accounting}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          autoAssignRules: { ...config.autoAssignRules, accounting: e.target.value as any },
                        })
                      }
                      className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Accounting">Accounting</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Operations Tasks
                    </label>
                    <select
                      value={config.autoAssignRules.operations}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          autoAssignRules: { ...config.autoAssignRules, operations: e.target.value as any },
                        })
                      }
                      className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Operations">Operations</option>
                      <option value="Tracking">Tracking</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-black text-xs shadow-lg shadow-blue-900/20 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Note Modal */}
      {activeNoteTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Log Collection Follow-Up / ثبت پیگیری وصول
            </h3>
            <form onSubmit={handleSubmitCollectionNote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Contact Method / روش تماس
                </label>
                <select
                  value={noteMethod}
                  onChange={(e) => setNoteMethod(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Phone">Phone Call / تماس تلفنی</option>
                  <option value="WhatsApp">WhatsApp Message / واتساپ</option>
                  <option value="Email">Official Email / ایمیل</option>
                  <option value="In Person">In Person Meeting / حضوری</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Call Outcome / نتیجه
                </label>
                <select
                  value={noteResult}
                  onChange={(e) => setNoteResult(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Payment Promised">Payment Promised / وعده پرداخت</option>
                  <option value="Awaiting Bank Transfer">Awaiting Transfer / در انتظار حواله</option>
                  <option value="Disputed">Disputed / اختلاف حساب</option>
                  <option value="Follow Up Later">Follow Up Later / پیگیری مجدد</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Promised Payment Date / تاریخ وعده پرداخت
                </label>
                <input
                  type="date"
                  value={notePromiseDate}
                  onChange={(e) => setNotePromiseDate(e.target.value)}
                  className="w-full h-9 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Conversation Notes / یادداشت گفتگو
                </label>
                <textarea
                  rows={2}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Spoke with Finance Director; promised wire transfer by Thursday."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveNoteTaskId(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow-sm"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Task Modal */}
      <QuickTaskModal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        onTaskCreated={() => {
          fetchData()
          showBanner('New operational task created.', 'success')
        }}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-Component: TaskCard
// ----------------------------------------------------------------------------
function TaskCard({
  task,
  onStatusChange,
  onAddNote,
}: {
  task: DailyTask
  onStatusChange: (status: DailyTaskStatus) => void
  onAddNote: () => void
}) {
  const isOverdue = task.status === 'OVERDUE' || (task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'COMPLETED')

  return (
    <div
      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-md space-y-3 ${
        task.priority === 'URGENT'
          ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20'
          : isOverdue
          ? 'border-amber-300 dark:border-amber-900/80 bg-amber-50/20'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority Badge */}
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
              task.priority === 'URGENT'
                ? 'bg-rose-500 text-white'
                : task.priority === 'HIGH'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {task.priority}
          </span>

          {/* Department Badge */}
          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
            {task.assigned_department}
          </span>

          {/* Overdue Badge */}
          {isOverdue && (
            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 text-[10px] font-black">
              OVERDUE
            </span>
          )}
        </div>

        <span className="text-[10px] font-mono text-slate-400 font-bold">{task.id}</span>
      </div>

      {/* Title & Description */}
      <div>
        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5">
            {task.description}
          </p>
        )}
      </div>

      {/* Explanation for Automatic Tasks */}
      {task.explanation && (
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="font-bold text-slate-700 dark:text-slate-300">Trigger: </span>
          {task.explanation}
        </div>
      )}

      {/* Relational Indicators */}
      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 flex-wrap">
        {task.bol_number && (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-400">
            BOL: {task.bol_number}
          </span>
        )}
        {task.container_number && (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400">
            Ctr: {task.container_number}
          </span>
        )}
        {task.outstanding_amount !== undefined && (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400">
            {task.outstanding_amount.toLocaleString()} {task.currency}
          </span>
        )}
        {task.due_date && (
          <span className="text-slate-400 font-sans font-medium">
            Due: {task.due_date}
          </span>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.status !== 'COMPLETED' ? (
            <button
              type="button"
              onClick={() => onStatusChange('COMPLETED')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resolved</span>
            </span>
          )}

          {task.status === 'OPEN' && (
            <button
              type="button"
              onClick={() => onStatusChange('IN PROGRESS')}
              className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 font-bold text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Start
            </button>
          )}
        </div>

        {/* Action Button for Collection Follow-up */}
        {(task.task_type === 'CUSTOMER_PAYMENT_FOLLOWUP' || task.task_type === 'INVOICE_FOLLOWUP') && (
          <button
            type="button"
            onClick={onAddNote}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-[10px] hover:bg-blue-100 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Log Call</span>
          </button>
        )}
      </div>
    </div>
  )
}
