"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  UserNotificationView,
  NotificationMetrics,
  NotificationCategory,
  NotificationSeverity,
} from '@/lib/types/notification'
import { useApp } from '@/lib/app-context'
import { NotificationSettingsModal } from './notification-settings-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  Check,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  Pin,
  PinOff,
  Moon,
  Settings,
  RefreshCw,
  Search,
  ExternalLink,
  MessageSquare,
  FileText,
  Ship,
  Truck,
  Box,
  Zap,
  Filter,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

export function NotificationWorkspace() {
  const { currentUser, setView } = useApp()

  const [notifications, setNotifications] = useState<UserNotificationView[]>([])
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // Filters
  const [activeTab, setActiveTab] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | 'all'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<'none' | 'bol' | 'category'>('none')

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const currentUserName = currentUser?.username || currentUser?.name
  const currentUserRole = currentUser?.role
  const currentClientId = currentUser?.clientId
  const currentClientName = currentUser?.clientName

  const fetchNotifications = useCallback(async () => {
    if (!currentUserName || !currentUserRole) return
    setIsLoading(true)
    try {
      const q = new URLSearchParams({
        user: currentUserName,
        role: currentUserRole,
        ...(currentClientId ? { clientId: currentClientId } : {}),
        ...(currentClientName ? { clientName: currentClientName } : {}),
        activeOnly: statusFilter === 'active' ? 'true' : 'false',
      })
      const res = await fetch(`/api/notifications?${q.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          setNotifications(body.notifications || [])
          setMetrics(body.metrics)
        }
      }
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [currentUserName, currentUserRole, currentClientId, currentClientName, statusFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Run full evaluation scan
  const handleRunEvaluation = async () => {
    setIsEvaluating(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evaluate' }),
      })
      if (res.ok) {
        const body = await res.json()
        toast.success(`Evaluation complete: ${body.result?.createdOrUpdated || 0} alerts checked, ${body.result?.resolved || 0} resolved`)
        fetchNotifications()
      }
    } catch {
      toast.error('Failed to run evaluation scan')
    } finally {
      setIsEvaluating(false)
    }
  }

  // Mark all read
  const handleMarkAllRead = async () => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      if (res.ok) {
        toast.success('All notifications marked read')
        fetchNotifications()
      }
    } catch {
      toast.error('Failed to mark all read')
    }
  }

  // Action handlers
  const handleToggleRead = async (notif: UserNotificationView) => {
    if (!currentUser) return
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          action: 'markRead',
          deliveryId: notif.deliveryId,
        }),
      })
      fetchNotifications()
    } catch {
      toast.error('Failed to update read status')
    }
  }

  const handleAcknowledge = async (notif: UserNotificationView) => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          action: 'acknowledge',
          deliveryId: notif.deliveryId,
        }),
      })
      if (res.ok) {
        toast.success('Alert acknowledged')
        fetchNotifications()
      }
    } catch {
      toast.error('Failed to acknowledge alert')
    }
  }

  const handleSnooze = async (notif: UserNotificationView, hours: number) => {
    if (!currentUser) return
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          action: 'snooze',
          deliveryId: notif.deliveryId,
          untilISO: until,
        }),
      })
      if (res.ok) {
        toast.success(`Snoozed for ${hours >= 24 ? `${hours / 24} day(s)` : `${hours} hour(s)`}`)
        fetchNotifications()
      }
    } catch {
      toast.error('Failed to snooze alert')
    }
  }

  const handleTogglePin = async (notif: UserNotificationView) => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          action: 'pin',
          deliveryId: notif.deliveryId,
          pinned: !notif.pinned,
        }),
      })
      if (res.ok) {
        fetchNotifications()
      }
    } catch {
      toast.error('Failed to pin alert')
    }
  }

  const handleDeepLink = (notif: UserNotificationView) => {
    if (!notif.read) handleToggleRead(notif)
    if (notif.actionContext?.targetView) {
      setView(notif.actionContext.targetView as any)
    } else if (notif.category === 'DOCUMENTS') {
      setView('document-compliance')
    } else if (notif.category === 'FINANCE') {
      setView('accounting')
    } else if (notif.category === 'TRACKING') {
      setView('shipments')
    } else if (notif.category === 'WORKFLOW') {
      setView('workflow')
    } else {
      setView('bol')
    }
  }

  // Filter computation
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && n.read) return false
      if (activeTab === 'critical' && n.severity !== 'CRITICAL') return false
      if (activeTab !== 'all' && activeTab !== 'unread' && activeTab !== 'critical') {
        if (n.category.toLowerCase() !== activeTab.toLowerCase()) return false
      }

      // Severity dropdown
      if (severityFilter !== 'ALL' && n.severity !== severityFilter) return false

      // Status
      if (statusFilter === 'active' && n.isResolved) return false
      if (statusFilter === 'resolved' && !n.isResolved) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matches =
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.relatedBol && n.relatedBol.toLowerCase().includes(q)) ||
          (n.relatedContainer && n.relatedContainer.toLowerCase().includes(q)) ||
          (n.relatedCustomer && n.relatedCustomer.toLowerCase().includes(q)) ||
          (n.sourceRecordId && n.sourceRecordId.toLowerCase().includes(q))
        if (!matches) return false
      }

      return true
    })
  }, [notifications, activeTab, severityFilter, statusFilter, searchQuery])

  // Grouping computation
  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null
    const map = new Map<string, UserNotificationView[]>()
    for (const n of filteredNotifications) {
      const key =
        groupBy === 'bol'
          ? n.relatedBol || 'Other Shipments'
          : n.category.replace(/_/g, ' ')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    }
    return Array.from(map.entries())
  }, [filteredNotifications, groupBy])

  const severityBadges: Record<NotificationSeverity, { label: string; class: string }> = {
    CRITICAL: { label: 'CRITICAL', class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' },
    WARNING: { label: 'WARNING', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    INFO: { label: 'INFO', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    SUCCESS: { label: 'SUCCESS', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="h-6 w-6 text-blue-600" />
              Notification & Alert Center
            </h1>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
              Phase 13
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized operational inbox connecting Tracking, Bookings, Containers, Compliance, Finance, and Workflow.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Run Audit Scan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Mark All Read</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Settings className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">Preferences</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div
            onClick={() => setActiveTab('unread')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              activeTab === 'unread'
                ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 ring-2 ring-blue-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Unread Alerts</span>
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 block">
              {metrics.totalUnread}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('critical')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              activeTab === 'critical'
                ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Critical Cut-Offs</span>
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1 block">
              {metrics.totalCritical}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('all')}
            className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Warnings</span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
              {metrics.totalWarning}
            </span>
          </div>

          <div
            onClick={() => { setStatusFilter('active'); setActiveTab('all') }}
            className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Active Issues</span>
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1 block">
              {metrics.totalActiveIssues}
            </span>
          </div>

          <div
            onClick={() => { setStatusFilter('resolved'); setActiveTab('all') }}
            className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Resolved Today</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
              {metrics.resolvedToday}
            </span>
          </div>
        </div>
      )}

      {/* Category Tabs & Toolbar */}
      <div className="space-y-3">
        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'critical', label: 'Critical' },
            { id: 'operations', label: 'Operations' },
            { id: 'documents', label: 'Documents' },
            { id: 'booking', label: 'Bookings' },
            { id: 'container', label: 'Containers' },
            { id: 'finance', label: 'Finance' },
            { id: 'workflow', label: 'Workflow' },
            { id: 'customer_portal', label: 'Customer Portal' },
            { id: 'system', label: 'System' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by BOL, container, title, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 text-xs w-[125px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="active">Active Issues</SelectItem>
                <SelectItem value="resolved">Resolved History</SelectItem>
                <SelectItem value="all">All Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grouping switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg shrink-0 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-semibold px-1.5 hidden sm:inline">Group:</span>
            <button
              type="button"
              onClick={() => setGroupBy('none')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                groupBy === 'none'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('bol')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                groupBy === 'bol'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              By Shipment
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('category')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                groupBy === 'category'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              By Category
            </button>
          </div>
        </div>
      </div>

      {/* Main Notification Cards Stream */}
      {groupedData ? (
        <div className="space-y-6">
          {groupedData.map(([groupKey, groupItems]) => (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  {groupKey}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {groupItems.length} alert(s)
                </span>
              </div>
              <div className="space-y-2.5">
                {groupItems.map((n) => renderNotificationCard(n))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All clear!</p>
              <p className="text-xs text-slate-400 mt-1">No operational alerts or issues matching your current filters.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => renderNotificationCard(n))
          )}
        </div>
      )}

      {/* Settings Modal */}
      {currentUser && (
        <NotificationSettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userId={currentUser.username || currentUser.name}
        />
      )}
    </div>
  )

  function renderNotificationCard(n: UserNotificationView) {
    const isUrgent = n.severity === 'CRITICAL'
    const isWarning = n.severity === 'WARNING'
    const badgeSpec = severityBadges[n.severity] || severityBadges.INFO

    return (
      <div
        key={n.id}
        className={`p-4 rounded-xl border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          n.pinned
            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-900/60 ring-1 ring-amber-400/30'
            : !n.read
            ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60'
            : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 opacity-90'
        }`}
      >
        {/* Left icon & content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="shrink-0 mt-0.5">
            {isUrgent ? (
              <ShieldAlert className="h-5 w-5 text-rose-600 animate-pulse" />
            ) : isWarning ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Info className="h-5 w-5 text-blue-500" />
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`text-[10px] font-black ${badgeSpec.class}`}>
                {badgeSpec.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-semibold text-slate-500">
                {n.category}
              </Badge>
              <span className={`text-xs sm:text-sm font-bold truncate ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                {n.title}
              </span>
              {n.pinned && (
                <Badge className="text-[9px] font-bold bg-amber-500 text-white h-4 px-1 gap-0.5">
                  <Pin className="h-2.5 w-2.5" /> PINNED
                </Badge>
              )}
              {n.acknowledged && (
                <Badge className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 h-4 px-1.5">
                  ACKNOWLEDGED
                </Badge>
              )}
              {n.isResolved && (
                <Badge className="text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 h-4 px-1.5">
                  RESOLVED
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {n.message}
            </p>

            {/* Relational Context Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              {n.relatedBol && (
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                  BOL: {n.relatedBol}
                </span>
              )}
              {n.relatedContainer && (
                <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  CTR: {n.relatedContainer}
                </span>
              )}
              {n.relatedCustomer && (
                <span className="text-slate-600 dark:text-slate-300">
                  • {n.relatedCustomer}
                </span>
              )}
              <span className="text-slate-400">
                • {new Date(n.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions Bar */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          {/* Deep link button */}
          <Button
            size="sm"
            onClick={() => handleDeepLink(n)}
            className="h-7 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <span>{n.actionContext?.label || 'Open'}</span>
            <ExternalLink className="h-3 w-3" />
          </Button>

          {/* Acknowledge button */}
          {!n.acknowledged && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAcknowledge(n)}
              className="h-7 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950 cursor-pointer"
            >
              Acknowledge
            </Button>
          )}

          {/* Snooze dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer px-2"
                title="Snooze Alert"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-36">
              <DropdownMenuItem onClick={() => handleSnooze(n, 1)}>
                Snooze 1 Hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnooze(n, 24)}>
                Snooze Today (24h)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnooze(n, 48)}>
                Snooze 2 Days
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pin toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTogglePin(n)}
            className={`h-7 w-7 p-0 cursor-pointer ${n.pinned ? 'text-amber-600' : 'text-slate-400 hover:text-slate-700'}`}
            title={n.pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="h-3.5 w-3.5" />
          </Button>

          {/* Mark read toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleRead(n)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 cursor-pointer"
            title={n.read ? 'Mark as unread' : 'Mark as read'}
          >
            <Check className={`h-3.5 w-3.5 ${n.read ? 'text-emerald-500' : ''}`} />
          </Button>
        </div>
      </div>
    )
  }
}
