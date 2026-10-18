"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Bell,
  MessageSquare,
  DollarSign,
  FileText,
  Calendar,
  Layers,
  Clock,
  Settings,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Send,
  Eye,
  Shield,
  Trash2,
  CheckCheck,
  ChevronRight,
  TrendingUp,
  Truck,
  ArrowRight,
  X,
  Phone,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import type {
  CommunicationHistoryRecord,
  CommunicationType,
  DailyStatusReportResult,
  MessageLanguage,
  MessageLengthMode,
  MessageTemplate,
  NotificationCategory,
  NotificationPriority,
  NotificationRecord,
  TemplateCategory,
} from "@/lib/types/communication"
import type { NotificationSummary } from "@/lib/services/notification-center-service"
import { UniversalWhatsAppDialog } from "./universal-whatsapp-dialog"
import { useApp } from "@/lib/app-context"

type ActiveTab =
  | "notifications"
  | "shipments"
  | "reminders"
  | "documents"
  | "daily-status"
  | "templates"
  | "history"
  | "settings"

export function CommunicationsWorkspace() {
  const { setView } = useApp()
  const [activeTab, setActiveTab] = useState<ActiveTab>("notifications")

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [notifSummary, setNotifSummary] = useState<NotificationSummary>({
    total: 0,
    unreadCount: 0,
    byCategory: {} as any,
    byPriority: {} as any,
  })
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<string>("ALL")
  const [notifPriorityFilter, setNotifPriorityFilter] = useState<string>("ALL")
  const [notifUnreadOnly, setNotifUnreadOnly] = useState(false)
  const [notifSearch, setNotifSearch] = useState("")

  // Shipment Message Generator State
  const [shipmentBol, setShipmentBol] = useState("")
  const [shipmentCategory, setShipmentCategory] = useState<TemplateCategory>("Shipment Created")
  const [shipmentLang, setShipmentLang] = useState<MessageLanguage>("en")
  const [shipmentLength, setShipmentLength] = useState<MessageLengthMode>("STANDARD")
  const [shipmentCustomerSafe, setShipmentCustomerSafe] = useState(true)
  const [shipmentRemark, setShipmentRemark] = useState("")
  const [shipmentPhone, setShipmentPhone] = useState("")
  const [shipmentMessageText, setShipmentMessageText] = useState("")
  const [shipmentLoading, setShipmentLoading] = useState(false)

  // Payment Reminders & Ledgers State
  const [reminderMode, setReminderMode] = useState<"invoice" | "account">("invoice")
  const [reminderInvoiceId, setReminderInvoiceId] = useState("")
  const [reminderLevel, setReminderLevel] = useState<"DUE_SOON" | "DUE_TODAY" | "OVERDUE_7" | "OVERDUE_URGENT">("DUE_SOON")
  const [reminderCustomerName, setReminderCustomerName] = useState("")
  const [reminderLang, setReminderLang] = useState<MessageLanguage>("en")
  const [reminderText, setReminderText] = useState("")
  const [reminderBalances, setReminderBalances] = useState<Array<{ currency: string; debit: number; credit: number; balance: number }>>([])
  const [reminderLoading, setReminderLoading] = useState(false)

  // Document Notices State
  const [docNoticeBol, setDocNoticeBol] = useState("")
  const [docNoticeTypes, setDocNoticeTypes] = useState<string[]>(["COMMERCIAL INVOICE", "PACKING LIST"])
  const [docNoticeLang, setDocNoticeLang] = useState<MessageLanguage>("en")
  const [docNoticeText, setDocNoticeText] = useState("")
  const [docNoticeLoading, setDocNoticeLoading] = useState(false)

  // Daily Status State
  const [dailyScope, setDailyScope] = useState<"all" | "customer" | "route">("all")
  const [dailyCustomer, setDailyCustomer] = useState("")
  const [dailyRoute, setDailyRoute] = useState("")
  const [dailyLang, setDailyLang] = useState<MessageLanguage>("en")
  const [dailyReport, setDailyReport] = useState<DailyStatusReportResult | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)

  // Templates State
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [editingTemplateContent, setEditingTemplateContent] = useState({ en: "", ps: "", fa: "", ur: "" })

  // History State
  const [history, setHistory] = useState<CommunicationHistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Universal Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogEntity, setDialogEntity] = useState<{ type: "BOL" | "INVOICE"; id: string; category?: TemplateCategory }>({
    type: "BOL",
    id: "",
  })

  // -------------------------------------------------------------
  // Data Fetching: Notifications
  // -------------------------------------------------------------
  const fetchNotifications = useCallback(async (evaluate = false) => {
    setNotifLoading(true)
    try {
      const params = new URLSearchParams()
      if (evaluate) params.set("evaluate", "true")
      if (notifCategoryFilter !== "ALL") params.set("category", notifCategoryFilter)
      if (notifPriorityFilter !== "ALL") params.set("priority", notifPriorityFilter)
      if (notifUnreadOnly) params.set("unreadOnly", "true")
      if (notifSearch.trim()) params.set("search", notifSearch.trim())

      const res = await fetch(`/api/notifications?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        if (data.summary) setNotifSummary(data.summary)
      }
    } catch (err: any) {
      toast.error("Failed to load notifications: " + err.message)
    } finally {
      setNotifLoading(false)
    }
  }, [notifCategoryFilter, notifPriorityFilter, notifUnreadOnly, notifSearch])

  // -------------------------------------------------------------
  // Data Fetching: Templates & History
  // -------------------------------------------------------------
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/communications/templates")
      const data = await res.json()
      if (data.success && data.templates) {
        setTemplates(data.templates)
        if (!selectedTemplate && data.templates.length > 0) {
          setSelectedTemplate(data.templates[0])
          setEditingTemplateContent(data.templates[0].content)
        }
      }
    } catch {
      // ignore
    }
  }, [selectedTemplate])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/communications/history?limit=100")
      const data = await res.json()
      if (data.success && data.history) {
        setHistory(data.history)
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    fetchTemplates()
    fetchHistory()
  }, [fetchNotifications, fetchTemplates, fetchHistory])

  // -------------------------------------------------------------
  // Actions: Notifications
  // -------------------------------------------------------------
  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        )
        setNotifSummary((prev: NotificationSummary) => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }))
      }
    } catch {
      toast.error("Failed to mark notification as read")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      const data = await res.json()
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        )
        setNotifSummary((prev: NotificationSummary) => ({ ...prev, unreadCount: 0 }))
        toast.success("All notifications marked as read")
      }
    } catch {
      toast.error("Failed to mark all as read")
    }
  }

  const handleDeleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        toast.success("Notification deleted")
      }
    } catch {
      toast.error("Failed to delete notification")
    }
  }

  // -------------------------------------------------------------
  // Actions: Generate Shipment Status
  // -------------------------------------------------------------
  const handleGenerateShipmentMessage = async () => {
    if (!shipmentBol.trim()) {
      toast.error("Please enter or select a BOL Number")
      return
    }
    setShipmentLoading(true)
    try {
      const res = await fetch("/api/communications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SHIPMENT_STATUS",
          entityType: "BOL",
          entityId: shipmentBol.trim(),
          category: shipmentCategory,
          language: shipmentLang,
          lengthMode: shipmentLength,
          isCustomerSafe: shipmentCustomerSafe,
          customRemark: shipmentRemark,
        }),
      })
      const data = await res.json()
      if (data.success && data.text) {
        setShipmentMessageText(data.text)
        if (data.context?.recipient_phone && !shipmentPhone) {
          setShipmentPhone(data.context.recipient_phone)
        }
        toast.success("Message generated from live database record")
      } else {
        toast.error(data.error || "Failed to generate message")
      }
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setShipmentLoading(false)
    }
  }

  // -------------------------------------------------------------
  // Actions: Generate Payment Reminder / Balance Summary
  // -------------------------------------------------------------
  const handleGenerateReminder = async () => {
    setReminderLoading(true)
    try {
      if (reminderMode === "invoice") {
        if (!reminderInvoiceId.trim()) {
          toast.error("Please enter an Invoice Number")
          setReminderLoading(false)
          return
        }
        const res = await fetch("/api/communications/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PAYMENT_REMINDER",
            entityType: "INVOICE",
            entityId: reminderInvoiceId.trim(),
            level: reminderLevel,
            language: reminderLang,
          }),
        })
        const data = await res.json()
        if (data.success && data.text) {
          setReminderText(data.text)
          toast.success("Payment reminder statement generated")
        } else {
          toast.error(data.error || "Failed to generate reminder")
        }
      } else {
        // Account Balance Summary
        if (!reminderCustomerName.trim()) {
          toast.error("Please enter a Customer or Account Name")
          setReminderLoading(false)
          return
        }
        const res = await fetch("/api/communications/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "BALANCE_SUMMARY",
            entityType: "CUSTOMER",
            entityId: reminderCustomerName.trim(),
            language: reminderLang,
          }),
        })
        const data = await res.json()
        if (data.success && data.text) {
          setReminderText(data.text)
          if (data.balances) setReminderBalances(data.balances)
          toast.success("Multi-currency account balance statement generated")
        } else {
          toast.error(data.error || "Failed to generate balance statement")
        }
      }
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setReminderLoading(false)
    }
  }

  // -------------------------------------------------------------
  // Actions: Generate Document Ready Notice
  // -------------------------------------------------------------
  const handleGenerateDocNotice = async () => {
    if (!docNoticeBol.trim()) {
      toast.error("Please enter a BOL Number")
      return
    }
    setDocNoticeLoading(true)
    try {
      const res = await fetch("/api/communications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DOCUMENT_NOTICE",
          entityType: "BOL",
          entityId: docNoticeBol.trim(),
          documentTypes: docNoticeTypes,
          language: docNoticeLang,
        }),
      })
      const data = await res.json()
      if (data.success && data.text) {
        setDocNoticeText(data.text)
        toast.success("Document availability notice generated")
      } else {
        toast.error(data.error || "Failed to generate document notice")
      }
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setDocNoticeLoading(false)
    }
  }

  // -------------------------------------------------------------
  // Actions: Generate Daily Status Digest
  // -------------------------------------------------------------
  const handleGenerateDailyStatus = async () => {
    setDailyLoading(true)
    try {
      const res = await fetch("/api/communications/daily-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: dailyScope,
          customerName: dailyCustomer,
          route: dailyRoute,
          language: dailyLang,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDailyReport(data)
        toast.success("Daily status report compiled from active shipments")
      } else {
        toast.error(data.error || "Failed to generate daily status")
      }
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setDailyLoading(false)
    }
  }

  // -------------------------------------------------------------
  // Generic Copy & WhatsApp Launcher Helper
  // -------------------------------------------------------------
  const copyText = async (text: string, entityId: string, type: any) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Message copied to clipboard! Ready to paste.")
      // Log audit
      await fetch("/api/communications/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communication_type: type,
          channel: "WHATSAPP",
          entity_type: "SYSTEM",
          entity_id: entityId || "SYSTEM",
          recipient_name: "Customer",
          recipient_phone: "",
          language: "en",
          message_text: text,
          generated_by: "Current Staff",
          sent_status: "COPIED",
        }),
      })
      fetchHistory()
    } catch {
      toast.error("Failed to copy text")
    }
  }

  const openWhatsApp = async (text: string, phoneStr: string, entityId: string, type: any) => {
    if (!text) return
    const clean = phoneStr.replace(/[^0-9+]/g, "").replace(/^\+/, "")
    const encoded = encodeURIComponent(text)
    const url = clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, "_blank")
    toast.success("WhatsApp opened with pre-filled message")

    // Log audit
    await fetch("/api/communications/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communication_type: type,
        channel: "WHATSAPP",
        entity_type: "SYSTEM",
        entity_id: entityId || "SYSTEM",
        recipient_name: "Customer",
        recipient_phone: clean,
        language: "en",
        message_text: text,
        generated_by: "Current Staff",
        sent_status: "OPENED_IN_WHATSAPP",
      }),
    })
    fetchHistory()
  }

  const isRtlLang = (l: MessageLanguage) => l === "ps" || l === "fa" || l === "ur"

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Sky Ariana Phase 20
            </span>
            <span className="text-xs text-slate-400">Enterprise Communications & Notification Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-emerald-400" />
            Communications & Notification Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Accurate, live-data WhatsApp messages, event notifications, multi-currency payment reminders & daily broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => fetchNotifications(true)}
            variant="outline"
            size="sm"
            disabled={notifLoading}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${notifLoading ? "animate-spin" : ""}`} />
            Scan Live Events
          </Button>

          <Button
            onClick={() => {
              setDialogEntity({ type: "BOL", id: "BOL-" })
              setDialogOpen(true)
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-sm font-medium"
          >
            <Send className="h-3.5 w-3.5" />
            Quick WhatsApp Update
          </Button>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Unread Alerts</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{notifSummary.unreadCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">High / Urgent Priority</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-0.5">
                {(notifSummary.byPriority?.HIGH || 0) + (notifSummary.byPriority?.URGENT || 0)}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Built-in Templates</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">{templates.length}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Messages Logged</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-0.5">{history.length}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        {[
          { id: "notifications", label: "Notification Center", icon: Bell, count: notifSummary.unreadCount },
          { id: "shipments", label: "Shipment WhatsApp", icon: Truck },
          { id: "reminders", label: "Payment Reminders & Ledgers", icon: DollarSign },
          { id: "documents", label: "Document Notices", icon: FileText },
          { id: "daily-status", label: "Daily Status Digest", icon: Calendar },
          { id: "templates", label: "Message Templates", icon: Layers },
          { id: "history", label: "Communication Audit Log", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-emerald-500 bg-slate-900 text-emerald-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NOTIFICATION CENTER */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative min-w-[200px] flex-1">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <Input
                  value={notifSearch}
                  onChange={(e) => setNotifSearch(e.target.value)}
                  placeholder="Search notifications..."
                  className="h-8 pl-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <select
                value={notifCategoryFilter}
                onChange={(e) => setNotifCategoryFilter(e.target.value)}
                className="h-8 text-xs rounded-md bg-slate-950 border-slate-800 text-slate-300 px-2"
              >
                <option value="ALL">All Categories</option>
                <option value="SHIPMENT">Shipment</option>
                <option value="TRACKING">Tracking</option>
                <option value="DOCUMENTS">Documents</option>
                <option value="ACCOUNTING">Accounting</option>
                <option value="PAYMENTS">Payments</option>
                <option value="SYSTEM">System</option>
              </select>

              <select
                value={notifPriorityFilter}
                onChange={(e) => setNotifPriorityFilter(e.target.value)}
                className="h-8 text-xs rounded-md bg-slate-950 border-slate-800 text-slate-300 px-2"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="INFO">Info</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={notifUnreadOnly}
                  onChange={(e) => setNotifUnreadOnly(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Unread only</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={notifSummary.unreadCount === 0}
                className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                Mark All Read
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/80">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-slate-300">All clear! No notifications found.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click &ldquo;Scan Live Events&rdquo; above to audit active shipments, overdue invoices, and document releases.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const isUnread = !n.read_at
                const isUrgent = n.priority === "URGENT"
                const isHigh = n.priority === "HIGH"

                return (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between p-3.5 rounded-xl border transition-colors ${
                      isUnread
                        ? "bg-slate-900/90 border-slate-700 shadow-sm"
                        : "bg-slate-950/60 border-slate-900/80 opacity-80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isUrgent
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : isHigh
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isUrgent ? "!" : n.category.slice(0, 1)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs font-semibold ${isUnread ? "text-white" : "text-slate-300"}`}>
                            {n.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 ${
                              isUrgent
                                ? "border-rose-500/40 text-rose-400 bg-rose-500/10"
                                : isHigh
                                ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                : "border-slate-700 text-slate-400"
                            }`}
                          >
                            {n.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-800 text-slate-400">
                            {n.category}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-mono text-emerald-400">
                            {n.entity_type}: {n.entity_id}
                          </span>
                          {n.action_url && (
                            <button
                              onClick={() => {
                                if (n.entity_type === "BOL") setView("bol")
                                else if (n.entity_type === "INVOICE") setView("invoice")
                                else if (n.entity_type === "DOCUMENT") setView("document-compliance")
                              }}
                              className="text-[11px] text-slate-400 hover:text-white underline flex items-center gap-1 cursor-pointer"
                            >
                              View Entity <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(n.id)}
                          className="h-7 text-[11px] text-emerald-400 hover:bg-emerald-950/40 px-2"
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNotif(n.id)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHIPMENT WHATSAPP UPDATES */}
      {/* ========================================================================= */}
      {activeTab === "shipments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls Form */}
          <div className="lg:col-span-5 space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-400" />
              Configure Shipment Update
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">BOL / Shipment Number *</label>
                <Input
                  value={shipmentBol}
                  onChange={(e) => setShipmentBol(e.target.value)}
                  placeholder="e.g. SCLJEANSA02230 or BMLWGCOD01102"
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Operational Milestone *</label>
                <select
                  value={shipmentCategory}
                  onChange={(e) => setShipmentCategory(e.target.value as TemplateCategory)}
                  className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
                >
                  <option value="Shipment Created">Shipment Created</option>
                  <option value="Truck Departed">Truck Departed</option>
                  <option value="At Border">At Border Station</option>
                  <option value="Border Cleared">Border Cleared</option>
                  <option value="Arrived Port">Arrived Port</option>
                  <option value="Vessel Departed">Vessel Departed</option>
                  <option value="At Sea">At Sea Update</option>
                  <option value="Arrived Destination">Arrived Destination</option>
                  <option value="Delivered">Delivered</option>
                  <option value="ETA Changed">ETA Changed</option>
                  <option value="Delay Notice">Delay Notice</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Language</label>
                  <select
                    value={shipmentLang}
                    onChange={(e) => setShipmentLang(e.target.value as MessageLanguage)}
                    className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
                  >
                    <option value="en">English (Official)</option>
                    <option value="ps">پښتو (Pashto)</option>
                    <option value="fa">دری / فارسی (Dari)</option>
                    <option value="ur">اردو (Urdu)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Format Length</label>
                  <select
                    value={shipmentLength}
                    onChange={(e) => setShipmentLength(e.target.value as MessageLengthMode)}
                    className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
                  >
                    <option value="STANDARD">Standard WhatsApp</option>
                    <option value="SHORT">Short (Single Line)</option>
                    <option value="DETAILED">Detailed Breakdown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Recipient Phone Number</label>
                <div className="relative">
                  <Phone className="h-3 w-3 absolute left-2.5 top-2.5 text-slate-500" />
                  <Input
                    value={shipmentPhone}
                    onChange={(e) => setShipmentPhone(e.target.value)}
                    placeholder="+93 7..."
                    className="h-8 pl-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Additional Operational Note (Optional)</label>
                <Input
                  value={shipmentRemark}
                  onChange={(e) => setShipmentRemark(e.target.value)}
                  placeholder="e.g. Cleared through customs line 2"
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={shipmentCustomerSafe}
                    onChange={(e) => setShipmentCustomerSafe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                  />
                  <span>Customer Safe Mode (Withhold internal costs &amp; driver phone)</span>
                </label>
              </div>

              <Button
                onClick={handleGenerateShipmentMessage}
                disabled={shipmentLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 shadow-sm"
              >
                {shipmentLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Pull Live Data &amp; Generate Update
              </Button>
            </div>
          </div>

          {/* Live Preview & Actions */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                Rendered WhatsApp Message
              </span>
              <span className="text-[11px] text-slate-500">
                {shipmentMessageText.length} characters
              </span>
            </div>

            <Textarea
              value={shipmentMessageText}
              onChange={(e) => setShipmentMessageText(e.target.value)}
              dir={isRtlLang(shipmentLang) ? "rtl" : "ltr"}
              rows={14}
              placeholder="Click 'Pull Live Data & Generate Update' to produce verified status message directly from database..."
              className={`w-full font-mono text-xs rounded-xl bg-slate-900 border-slate-800 text-slate-200 p-3.5 leading-relaxed focus:ring-1 focus:ring-emerald-500 shadow-inner ${
                isRtlLang(shipmentLang) ? "text-right" : "text-left"
              }`}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                onClick={() => copyText(shipmentMessageText, shipmentBol, "SHIPMENT_STATUS")}
                disabled={!shipmentMessageText}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy WhatsApp Text
              </Button>

              <Button
                onClick={() => openWhatsApp(shipmentMessageText, shipmentPhone, shipmentBol, "SHIPMENT_STATUS")}
                disabled={!shipmentMessageText}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Open in WhatsApp Web/App
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYMENT REMINDERS & MULTI-CURRENCY LEDGERS */}
      {/* ========================================================================= */}
      {activeTab === "reminders" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Financial Communication Generator
            </h3>

            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
              <button
                onClick={() => setReminderMode("invoice")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  reminderMode === "invoice" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Invoice Reminder
              </button>
              <button
                onClick={() => setReminderMode("account")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  reminderMode === "account" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Multi-Currency Ledger Balance
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {reminderMode === "invoice" ? (
                <>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Invoice Number *</label>
                    <Input
                      value={reminderInvoiceId}
                      onChange={(e) => setReminderInvoiceId(e.target.value)}
                      placeholder="e.g. INV-2026-0001 or INV-002"
                      className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Tone &amp; Urgency Stage</label>
                    <select
                      value={reminderLevel}
                      onChange={(e) => setReminderLevel(e.target.value as any)}
                      className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
                    >
                      <option value="DUE_SOON">Due Soon (Friendly Advance Notice)</option>
                      <option value="DUE_TODAY">Due Today (Prompt Settlement)</option>
                      <option value="OVERDUE_7">Overdue (7+ Days Notice)</option>
                      <option value="OVERDUE_URGENT">Urgent Overdue (Transit Suspension Warning)</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Customer / Account Name *</label>
                  <Input
                    value={reminderCustomerName}
                    onChange={(e) => setReminderCustomerName(e.target.value)}
                    placeholder="e.g. HAJI-ABDUL-WASE-KHAN-ALOKOZAY or SKY ARIANA"
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Searches local ledger balances with strictly segregated USD, AED, and AFN balances.
                  </p>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-medium block mb-1">Language</label>
                <select
                  value={reminderLang}
                  onChange={(e) => setReminderLang(e.target.value as MessageLanguage)}
                  className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
                >
                  <option value="en">English (Official)</option>
                  <option value="ps">پښتو (Pashto)</option>
                  <option value="fa">دری / فارسی (Dari)</option>
                  <option value="ur">اردو (Urdu)</option>
                </select>
              </div>

              <Button
                onClick={handleGenerateReminder}
                disabled={reminderLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 shadow-sm"
              >
                {reminderLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Generate Financial Statement
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {reminderBalances.length > 0 && reminderMode === "account" && (
              <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
                {reminderBalances.map((b) => (
                  <div key={b.currency} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 block">{b.currency}</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {b.balance.toLocaleString()} {b.currency}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Debit: {b.debit.toLocaleString()} | Credit: {b.credit.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              dir={isRtlLang(reminderLang) ? "rtl" : "ltr"}
              rows={14}
              placeholder="Rendered payment reminder or multi-currency ledger balance will appear here..."
              className={`w-full font-mono text-xs rounded-xl bg-slate-900 border-slate-800 text-slate-200 p-3.5 leading-relaxed focus:ring-1 focus:ring-emerald-500 shadow-inner ${
                isRtlLang(reminderLang) ? "text-right" : "text-left"
              }`}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                onClick={() =>
                  copyText(
                    reminderText,
                    reminderMode === "invoice" ? reminderInvoiceId : reminderCustomerName,
                    "PAYMENT_REMINDER"
                  )
                }
                disabled={!reminderText}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Statement
              </Button>

              <Button
                onClick={() =>
                  openWhatsApp(
                    reminderText,
                    "",
                    reminderMode === "invoice" ? reminderInvoiceId : reminderCustomerName,
                    "PAYMENT_REMINDER"
                  )
                }
                disabled={!reminderText}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DOCUMENT READY NOTICES */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Document Availability Notice
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">BOL Number *</label>
                <Input
                  value={docNoticeBol}
                  onChange={(e) => setDocNoticeBol(e.target.value)}
                  placeholder="e.g. SCLJEANSA02230"
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Released Document Types</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {["COMMERCIAL INVOICE", "PACKING LIST", "TRANSIT PAPER", "PHYTOSANITARY", "BILL OF LADING"].map(
                    (dt) => {
                      const isChecked = docNoticeTypes.includes(dt)
                      return (
                        <label key={dt} className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setDocNoticeTypes([...docNoticeTypes, dt])
                              else setDocNoticeTypes(docNoticeTypes.filter((x) => x !== dt))
                            }}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                          />
                          <span>{dt}</span>
                        </label>
                      )
                    }
                  )}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Language</label>
                <select
                  value={docNoticeLang}
                  onChange={(e) => setDocNoticeLang(e.target.value as MessageLanguage)}
                  className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
                >
                  <option value="en">English (Official)</option>
                  <option value="ps">پښتو (Pashto)</option>
                  <option value="fa">دری / فارسی (Dari)</option>
                  <option value="ur">اردو (Urdu)</option>
                </select>
              </div>

              <Button
                onClick={handleGenerateDocNotice}
                disabled={docNoticeLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 shadow-sm"
              >
                {docNoticeLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Generate Document Ready Notice
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <Textarea
              value={docNoticeText}
              onChange={(e) => setDocNoticeText(e.target.value)}
              dir={isRtlLang(docNoticeLang) ? "rtl" : "ltr"}
              rows={14}
              placeholder="Rendered document release notice will appear here..."
              className={`w-full font-mono text-xs rounded-xl bg-slate-900 border-slate-800 text-slate-200 p-3.5 leading-relaxed focus:ring-1 focus:ring-emerald-500 shadow-inner ${
                isRtlLang(docNoticeLang) ? "text-right" : "text-left"
              }`}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                onClick={() => copyText(docNoticeText, docNoticeBol, "DOCUMENT_NOTICE")}
                disabled={!docNoticeText}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Notice
              </Button>

              <Button
                onClick={() => openWhatsApp(docNoticeText, "", docNoticeBol, "DOCUMENT_NOTICE")}
                disabled={!docNoticeText}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DAILY STATUS DIGEST */}
      {/* ========================================================================= */}
      {activeTab === "daily-status" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 items-end text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Scope</label>
              <select
                value={dailyScope}
                onChange={(e) => setDailyScope(e.target.value as any)}
                className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
              >
                <option value="all">All Active Shipments</option>
                <option value="customer">Specific Customer</option>
                <option value="route">Specific Route</option>
              </select>
            </div>

            {dailyScope === "customer" && (
              <div>
                <label className="text-slate-300 font-medium block mb-1">Customer Name</label>
                <Input
                  value={dailyCustomer}
                  onChange={(e) => setDailyCustomer(e.target.value)}
                  placeholder="e.g. Kabul Traders"
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>
            )}

            {dailyScope === "route" && (
              <div>
                <label className="text-slate-300 font-medium block mb-1">Route / Station</label>
                <Input
                  value={dailyRoute}
                  onChange={(e) => setDailyRoute(e.target.value)}
                  placeholder="e.g. Islam Qala"
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>
            )}

            <div>
              <label className="text-slate-300 font-medium block mb-1">Language</label>
              <select
                value={dailyLang}
                onChange={(e) => setDailyLang(e.target.value as MessageLanguage)}
                className="w-full text-xs rounded-md bg-slate-950 border-slate-800 text-slate-200 p-2"
              >
                <option value="en">English</option>
                <option value="ps">پښتو (Pashto)</option>
                <option value="fa">دری (Dari)</option>
              </select>
            </div>

            <Button
              onClick={handleGenerateDailyStatus}
              disabled={dailyLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 shadow-sm"
            >
              {dailyLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
              )}
              Compile Daily Broadcast
            </Button>
          </div>

          {dailyReport && (
            <div className="space-y-4">
              {/* Daily KPI Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Active Shipments</span>
                  <span className="text-xl font-bold text-white">{dailyReport.stats.active}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">At Border</span>
                  <span className="text-xl font-bold text-amber-400">{dailyReport.stats.atBorder}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">At Port / Sea</span>
                  <span className="text-xl font-bold text-cyan-400">{dailyReport.stats.atPort + dailyReport.stats.atSea}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Delayed</span>
                  <span className="text-xl font-bold text-rose-400">{dailyReport.stats.delayed}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Arriving Today</span>
                  <span className="text-xl font-bold text-emerald-400">{dailyReport.stats.arrivingToday}</span>
                </div>
              </div>

              {/* Message Box */}
              <div className="space-y-2">
                <Textarea
                  value={dailyReport.formattedMessage}
                  onChange={(e) =>
                    setDailyReport({ ...dailyReport, formattedMessage: e.target.value })
                  }
                  dir={isRtlLang(dailyLang) ? "rtl" : "ltr"}
                  rows={14}
                  className={`w-full font-mono text-xs rounded-xl bg-slate-900 border-slate-800 text-slate-200 p-3.5 leading-relaxed focus:ring-1 focus:ring-emerald-500 shadow-inner ${
                    isRtlLang(dailyLang) ? "text-right" : "text-left"
                  }`}
                />

                <div className="flex items-center justify-end gap-2">
                  <Button
                    onClick={() => copyText(dailyReport.formattedMessage, "DAILY", "DAILY_STATUS")}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Broadcast Digest
                  </Button>

                  <Button
                    onClick={() => openWhatsApp(dailyReport.formattedMessage, "", "DAILY", "DAILY_STATUS")}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Open WhatsApp Broadcast
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MESSAGE TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Template List */}
          <div className="lg:col-span-4 space-y-2 max-h-[700px] overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Template Library ({templates.length})
            </h3>
            {templates.map((t) => {
              const isSelected = selectedTemplate?.id === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t)
                    setEditingTemplateContent(t.content)
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-emerald-950/30 border-emerald-500/60 shadow-sm"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{t.name}</span>
                    <Badge variant="outline" className="text-[10px] py-0 border-slate-700 text-slate-400">
                      {t.category}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                    <span>{t.length_mode}</span>
                    <span>{t.is_default ? "Built-in Standard" : "Custom"}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-8 space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            {selectedTemplate ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{selectedTemplate.name}</h3>
                    <p className="text-xs text-slate-400">Category: {selectedTemplate.category}</p>
                  </div>
                  {selectedTemplate.is_default && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      Protected Built-in Template
                    </Badge>
                  )}
                </div>

                {/* Variable Quick Chips */}
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Available Live Variables:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "{{bol_number}}",
                      "{{container_number}}",
                      "{{origin}}",
                      "{{destination}}",
                      "{{current_location}}",
                      "{{status}}",
                      "{{eta}}",
                      "{{vessel}}",
                      "{{voyage}}",
                      "{{consignee}}",
                      "{{commodity}}",
                      "{{invoice_number}}",
                      "{{outstanding}}",
                      "{{currency}}",
                    ].map((v) => (
                      <span
                        key={v}
                        onClick={() => {
                          navigator.clipboard.writeText(v)
                          toast.success(`Copied variable ${v} to clipboard`)
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 cursor-pointer hover:border-emerald-500/50"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Multilingual Textareas */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">English (Official)</label>
                    <Textarea
                      value={editingTemplateContent.en}
                      onChange={(e) =>
                        setEditingTemplateContent({ ...editingTemplateContent, en: e.target.value })
                      }
                      rows={4}
                      className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">پښتو (Pashto)</label>
                    <Textarea
                      value={editingTemplateContent.ps}
                      onChange={(e) =>
                        setEditingTemplateContent({ ...editingTemplateContent, ps: e.target.value })
                      }
                      dir="rtl"
                      rows={4}
                      className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-200 text-right"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">دری / فارسی (Dari)</label>
                    <Textarea
                      value={editingTemplateContent.fa}
                      onChange={(e) =>
                        setEditingTemplateContent({ ...editingTemplateContent, fa: e.target.value })
                      }
                      dir="rtl"
                      rows={4}
                      className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-200 text-right"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={async () => {
                      try {
                        const updated: MessageTemplate = {
                          ...selectedTemplate,
                          content: editingTemplateContent,
                          updated_by: "Current Staff",
                        }
                        const res = await fetch("/api/communications/templates", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(updated),
                        })
                        const data = await res.json()
                        if (data.success) {
                          toast.success("Template saved successfully")
                          fetchTemplates()
                        }
                      } catch {
                        toast.error("Failed to save template")
                      }
                    }}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Save Template Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Select a template from the left to view or edit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COMMUNICATION AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Communication Audit Trail ({history.length} events)
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={historyLoading}
              className="h-7 text-xs border-slate-800 text-slate-300 hover:bg-slate-900"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh Log
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Date &amp; Time</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No communications recorded yet. Messages copied or opened will be tracked here.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-900/80 transition-colors">
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {new Date(h.generated_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-white">{h.entity_id}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] py-0 border-slate-700 text-slate-300">
                          {h.communication_type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] py-0">
                          {h.channel}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>{h.recipient_name}</div>
                        {h.recipient_phone && (
                          <div className="text-[10px] text-slate-500 font-mono">{h.recipient_phone}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 ${
                            h.sent_status === "COPIED"
                              ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                              : h.sent_status === "OPENED_IN_WHATSAPP"
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              : "border-slate-700 text-slate-400"
                          }`}
                        >
                          {h.sent_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400">{h.generated_by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Universal WhatsApp Dialog Modal */}
      <UniversalWhatsAppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entityType={dialogEntity.type}
        entityId={dialogEntity.id}
        initialCategory={dialogEntity.category}
      />
    </div>
  )
}
