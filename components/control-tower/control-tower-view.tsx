"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Plus,
  MessageSquare,
  FileText,
  DollarSign,
  FileCheck2,
  Search,
  ChevronDown,
  Calendar,
  Box,
  Truck,
  Ship,
  History,
  Download,
  Printer,
  Copy,
  Check,
  ClipboardList,
  Sparkles,
  Sun,
  Sunset,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useApp } from "@/lib/app-context"
import { KpiStrip } from "./kpi-strip"
import { MasterAttentionCenter } from "./master-attention-center"
import { WorkflowControlTowerWidget } from "@/components/workflow/workflow-control-tower-widget"
import { LiveOperationsBoard } from "./live-operations-board"
import { OperationsPanels } from "./operations-panels"
import { BolQuickDrawer, ContainerQuickDrawer, CustomerQuickDrawer } from "./quick-drawers"
import { OmniSearchDialog } from "./omni-search-dialog"
import { CopyWhatsAppModal } from "@/components/whatsapp/copy-whatsapp-modal"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import type { NormalizedWhatsAppShipment } from "@/lib/whatsapp/message-types"
import type {
  ControlTowerModel,
  PipelineStage,
  LiveShipmentRow,
  OmniSearchResult,
} from "@/lib/control-tower/types"

const DEFAULT_TOWER_DATA: ControlTowerModel = {
  generatedAt: new Date().toISOString(),
  kpis: {
    totalShipments: 0,
    activeMoving: 0,
    atBorder: 0,
    inRoadTransit: 0,
    atPort: 0,
    onVessel: 0,
    arrivedDestination: 0,
    deliveredTotal: 0,
    needsAttentionCount: 0,
    criticalAttentionCount: 0,
    warningAttentionCount: 0,
    infoAttentionCount: 0,
    vgmPendingCount: 0,
    cutOffsTodayCount: 0,
    cutOffsNext48hCount: 0,
    incompleteDocsCount: 0,
    detentionRiskCount: 0,
  },
  financials: {
    isPermitted: false,
    currencyBreakdown: [],
    uninvoicedShipmentsCount: 0,
    overdueInvoicesCount: 0,
    totalInvoicedCount: 0,
    pendingReceiptsCount: 0,
  },
  attentionItems: [],
  shipments: [],
  stageCounts: {
    all: 0,
    preparing: 0,
    road_transit: 0,
    border_clearance: 0,
    port_operations: 0,
    on_vessel: 0,
    arrived_destination: 0,
    delivered: 0,
    delayed: 0,
  },
  borderStations: [],
  portOperations: [],
  containerRisks: [],
  documentCompliance: [],
  timelineEvents: [],
  activeRoutes: [],
  upcomingCutOffs: [],
  upcomingArrivals: [],
  vesselActivity: [],
}

interface ControlTowerViewProps {
  onOpenBol?: (bolNumber: string) => void
  onOpenLedger?: (accountName?: string, companyName?: string) => void
  onOpenOperationsReport?: (period?: string) => void
}

export function ControlTowerView({
  onOpenBol,
  onOpenLedger,
  onOpenOperationsReport,
}: ControlTowerViewProps) {
  const { setView, currentUser, accounts, selectAccount, selectCompany } = useApp()
  const [data, setData] = useState<ControlTowerModel>(DEFAULT_TOWER_DATA)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<PipelineStage>("all")
  const [preset, setPreset] = useState<"live" | "morning" | "eod" | "handover">("live")
  const [refreshInterval, setRefreshInterval] = useState<number>(60) // in seconds
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("skybol:tower-privacy-mode") === "true"
    }
    return false
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOmniSearchOpen, setIsOmniSearchOpen] = useState(false)
  const [isDailyStatusOpen, setIsDailyStatusOpen] = useState(false)
  const [dailyStatusLang, setDailyStatusLang] = useState<"en" | "ps" | "fa" | "ur">("en")
  const [copiedStatus, setCopiedStatus] = useState(false)

  // Shift Notes State
  const [shiftNotes, setShiftNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("skybol:tower-shift-notes") || ""
    }
    return ""
  })

  // Quick Drawers state
  const [inspectedBol, setInspectedBol] = useState<string | null>(null)
  const [inspectedContainer, setInspectedContainer] = useState<string | null>(null)
  const [inspectedCustomer, setInspectedCustomer] = useState<string | null>(null)

  // WhatsApp modal state
  const [whatsAppTarget, setWhatsAppTarget] = useState<NormalizedWhatsAppShipment | null>(null)

  const fetchTowerData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    try {
      const userRole = currentUser?.role || "admin"
      const res = await fetch(`/api/control-tower?role=${encodeURIComponent(userRole)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        if (!silent) toast.error("Failed to update control tower data")
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Control tower fetch error:", err)
        if (!silent) toast.error("Connection error loading control tower")
      }
    } finally {
      clearTimeout(timer)
      if (!silent) setLoading(false)
    }
  }, [currentUser?.role])

  useEffect(() => {
    fetchTowerData()
  }, [fetchTowerData])

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return
    const timer = setInterval(() => {
      fetchTowerData(true)
    }, refreshInterval * 1000)
    return () => clearInterval(timer)
  }, [refreshInterval, fetchTowerData])

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setIsOmniSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const togglePrivacyMode = () => {
    const next = !privacyMode
    setPrivacyMode(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("skybol:tower-privacy-mode", String(next))
    }
    toast.info(next ? "Privacy Mode Enabled (Masking numbers & contacts)" : "Privacy Mode Disabled")
  }

  const handleNavigate = (view: any, param?: string) => {
    if (view === "bol") {
      if (onOpenBol && param) onOpenBol(param)
      else setView("bol")
    } else if (view === "accounting") {
      if (param && onOpenLedger) {
        onOpenLedger(param)
      } else {
        setView("accounting")
      }
    } else if (view === "document-compliance") {
      setView("document-compliance")
    } else if (view === "booking-containers") {
      setView("shipments")
      if (param) setInspectedContainer(param)
    } else if (view === "whatsapp") {
      setView("whatsapp")
    } else {
      setView(view)
    }
  }

  const handleSelectSearchResult = (res: OmniSearchResult) => {
    if (res.type === "bol" && res.targetParam) {
      setInspectedBol(res.targetParam)
    } else if (res.type === "container" && res.targetParam) {
      setInspectedContainer(res.targetParam)
    } else if (res.type === "customer" && res.targetParam) {
      setInspectedCustomer(res.targetParam)
    } else {
      handleNavigate(res.targetView, res.targetParam)
    }
  }

  const handleSaveShiftNotes = (text: string) => {
    setShiftNotes(text)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("skybol:tower-shift-notes", text)
    }
    toast.success("Shift Handover notes saved")
  }

  // Generate Daily Status Message in 4 Languages
  const generateDailyStatusText = () => {
    const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    const active = data.kpis.activeMoving
    const border = data.kpis.atBorder
    const transit = data.kpis.inRoadTransit
    const port = data.kpis.atPort
    const vessel = data.kpis.onVessel
    const arrived = data.kpis.arrivedDestination
    const attention = data.kpis.needsAttentionCount

    if (dailyStatusLang === "ps") {
      return `📢 د ای کیو کمپنیز لمټیډ (AQ COMPANIES) د عملیاتو ورځنی راپور
نیټه: ${todayStr}

📦 ټول فعال بارونه: ${active}
🚛 په لاره کې: ${transit}
📍 په سرحدي ګمرک کې: ${border}
⚓ په بندر کې (د کانتینر بارګیري): ${port}
🚢 په کښتۍ کې (سمندري حرکت): ${vessel}
🏁 مقصدي بندر ته ورسیدل: ${arrived}
⚠️ پاملرنې ته اړتیا: ${attention}

ټولې لارې د څارنې لاندې دي. د لا زیاتو معلوماتو لپاره اړیکه ونیسئ.
- AQ COMPANIES Logistics Control Tower`
    }

    if (dailyStatusLang === "fa") {
      return `📢 گزارش روزانه عملیات لجستیک شرکت‌های ای‌کیو (AQ COMPANIES)
تاریخ: ${todayStr}

📦 محموله‌های فعال: ${active}
🚛 در حال حرکت جاده‌ای: ${transit}
📍 در گمرک مرزی: ${border}
⚓ در محوطه اسکله و بارانداز: ${port}
🚢 بارگیری بر روی کشتی: ${vessel}
🏁 رسیده به بندر مقصد: ${arrived}
⚠️ موارد نیازمند اقدام فوری: ${attention}

تمام راهروهای ترانزیتی فعال و تحت کنترل هستند.
- برج مراقبت عملیات شرکت‌های ای‌کیو (AQ COMPANIES)`
    }

    if (dailyStatusLang === "ur") {
      return `📢 اے کیو کمپنیز لمٹیڈ یومیہ لاجسٹکس آپریشنز رپورٹ
تاریخ: ${todayStr}

📦 کل فعال ترسیلات: ${active}
🚛 سڑک کے راستے ٹرانزٹ: ${transit}
📍 بارڈر کسٹمز پر موجود: ${border}
⚓ پورٹ ٹرمینل پر: ${port}
🚢 بحری جہاز پر روانہ: ${vessel}
🏁 منزل مقصود پر پہنچ گئی: ${arrived}
⚠️ فوری توجہ طلب معاملات: ${attention}

تمام کارگو کی بحفاظت ترسیل جاری ہے۔
- AQ COMPANIES Logistics Control Tower`
    }

    // Default English
    return `📢 AQ COMPANIES LIMITED — DAILY LOGISTICS OPERATIONS REPORT
Date: ${todayStr}

📦 Total Active Shipments: ${active}
🚛 In Road Transit: ${transit}
📍 At Border Stations: ${border}
⚓ Port Operations & Gate-In: ${port}
🚢 Sea Transit (On Vessel): ${vessel}
🏁 Arrived at Destination: ${arrived}
⚠️ Critical Attention Items: ${attention}

Transit corridors (Kandahar / Dogharoon / Bandar Abbas / Nhava Sheva) are operating under active monitoring.
- AQ COMPANIES Logistics Control Tower`
  }

  const copyDailyStatusToClipboard = () => {
    const text = generateDailyStatusText()
    navigator.clipboard.writeText(text)
    setCopiedStatus(true)
    toast.success("Daily status report copied to clipboard!")
    setTimeout(() => setCopiedStatus(false), 2500)
  }

  const selectedBolShipment = data.shipments.find((s) => s.bolNumber === inspectedBol) || null
  const selectedContainerRisk = data.containerRisks.find((c) => c.containerNumber === inspectedContainer)

  return (
    <div className={`p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto transition-all ${isFullscreen ? "fixed inset-0 z-50 bg-background overflow-y-auto p-6" : ""}`}>
      {/* Top Header Command Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">
              AQ COMPANIES — Logistics Control Tower
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE TOWER</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operations • Shipments • Containers • Documents • Finance
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Omni Search Button */}
          <button
            type="button"
            onClick={() => setIsOmniSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search everything...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px]">
              Ctrl+K
            </kbd>
          </button>

          {/* Privacy Mode Toggle */}
          <Button
            size="sm"
            variant={privacyMode ? "default" : "outline"}
            className={`h-8 text-xs gap-1.5 cursor-pointer ${
              privacyMode ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
            }`}
            onClick={togglePrivacyMode}
            title={privacyMode ? "Privacy Mode ON (Masks balances and phone numbers)" : "Turn Privacy Mode ON"}
          >
            {privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{privacyMode ? "Privacy ON" : "Privacy Mode"}</span>
          </Button>

          {/* Refresh Timer Select */}
          <div className="flex items-center gap-1 border border-border rounded-lg bg-card/80 px-2 h-8 text-xs">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
            >
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={300}>5m</option>
              <option value={0}>Manual</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 cursor-pointer"
            onClick={() => fetchTowerData(false)}
            title="Refresh Control Tower Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 cursor-pointer"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Executive View"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>

          {/* + New Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>+ New</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView("bol")}>
                <FileText className="w-3.5 h-3.5 mr-2 text-blue-500" /> New BOL
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView("shipments")}>
                <Truck className="w-3.5 h-3.5 mr-2 text-amber-500" /> New Tracking Update
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView("invoice")}>
                <DollarSign className="w-3.5 h-3.5 mr-2 text-emerald-500" /> New Invoice
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView("accounting")}>
                <DollarSign className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Record Payment
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView("document-compliance")}>
                <FileCheck2 className="w-3.5 h-3.5 mr-2 text-teal-500" /> Upload Document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView("reports")}>
                <Calendar className="w-3.5 h-3.5 mr-2 text-red-500" /> Generate Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Operational View Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border shadow-xs text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-muted-foreground font-semibold px-1">View Mode:</span>
          <Button
            size="sm"
            variant={preset === "live" ? "default" : "ghost"}
            className={`h-7 text-xs gap-1.5 cursor-pointer ${preset === "live" ? "bg-primary text-primary-foreground font-bold" : ""}`}
            onClick={() => { setPreset("live"); setSelectedStage("all") }}
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Live Tower</span>
          </Button>

          <Button
            size="sm"
            variant={preset === "morning" ? "default" : "ghost"}
            className={`h-7 text-xs gap-1.5 cursor-pointer ${preset === "morning" ? "bg-amber-600 text-white font-bold" : ""}`}
            onClick={() => { setPreset("morning"); setSelectedStage("all") }}
          >
            <Sun className="w-3 h-3 text-amber-300" />
            <span>Morning Brief</span>
          </Button>

          <Button
            size="sm"
            variant={preset === "eod" ? "default" : "ghost"}
            className={`h-7 text-xs gap-1.5 cursor-pointer ${preset === "eod" ? "bg-purple-600 text-white font-bold" : ""}`}
            onClick={() => { setPreset("eod"); setSelectedStage("all") }}
          >
            <Sunset className="w-3 h-3 text-purple-300" />
            <span>End of Day</span>
          </Button>

          <Button
            size="sm"
            variant={preset === "handover" ? "default" : "ghost"}
            className={`h-7 text-xs gap-1.5 cursor-pointer ${preset === "handover" ? "bg-indigo-600 text-white font-bold" : ""}`}
            onClick={() => setPreset("handover")}
          >
            <BookOpen className="w-3 h-3 text-indigo-300" />
            <span>Daily Handover</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily Status Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 cursor-pointer"
            onClick={() => setIsDailyStatusOpen(true)}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Daily Status Report</span>
          </Button>

          {/* Today Report Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs font-semibold gap-1.5 cursor-pointer"
            onClick={() => setView("reports")}
          >
            <Calendar className="w-3 h-3 text-blue-500" />
            <span>Today Report</span>
          </Button>
        </div>
      </div>

      {/* Handover Notes Box (When Handover View Active) */}
      {preset === "handover" && (
        <Card className="border-indigo-500/40 bg-indigo-50/10">
          <CardHeader className="py-3 px-4 border-b border-border/80">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span>Shift Handover Notes & Pending Actions</span>
              </div>
              <span className="text-[11px] font-normal text-muted-foreground">Internal shift log</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <textarea
              value={shiftNotes}
              onChange={(e) => handleSaveShiftNotes(e.target.value)}
              placeholder="Record notes for the incoming operational shift (e.g. Container CRLU1234567 gate-in expected tomorrow at 09:00, driver Zalmay awaiting customs seal at Islam Qala)..."
              className="w-full min-h-[90px] p-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Author: <strong>{currentUser?.name || "Operator"}</strong></span>
              <span>Notes are saved locally and included in the handover brief.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Operational & Financial KPI Strip */}
      <KpiStrip
        kpis={data.kpis}
        financials={data.financials}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
        privacyMode={privacyMode}
      />

      {/* 2. Master Attention Center & Operations Workflow Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MasterAttentionCenter
            attentionItems={data.attentionItems}
            onNavigate={handleNavigate}
            onRefresh={() => fetchTowerData(true)}
          />
        </div>
        <div>
          <WorkflowControlTowerWidget onOpenWorkflow={() => setView('workflow')} />
        </div>
      </div>

      {/* 3. Live Operations Board */}
      <LiveOperationsBoard
        shipments={data.shipments}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
        stageCounts={data.stageCounts}
        onInspectBol={(b) => setInspectedBol(b)}
        onInspectContainer={(c) => setInspectedContainer(c)}
        onInspectCustomer={(cust) => setInspectedCustomer(cust)}
        onWhatsAppUpdate={(s) => {
          const norm = normalizeToWhatsAppShipment({
            id: s.id,
            referenceNumber: s.bolNumber,
            status: s.status as any,
            currentLocation: s.currentLocation,
            shipper: { name: s.shipperName },
            consignee: { name: s.consigneeName },
            container: { containerNumber: s.containerNumber, sealNumber: s.sealNumber },
            truck: { afghanPlate: s.truckPlate, driverName: s.driverName, driverPhone: s.driverPhone },
            vessel: { vesselName: s.vesselName, voyageNumber: s.voyageNumber },
            cargo: { cartons: s.packagesCount, commodity: s.commodity },
            transport: { origin: s.origin, finalDestination: s.destination },
          } as any)
          setWhatsAppTarget(norm)
        }}
        onOpenBolEditor={(b) => {
          if (onOpenBol) onOpenBol(b)
          else setView("bol")
        }}
        privacyMode={privacyMode}
      />

      {/* 4. Operations Control Panels (Border, Routes, Cut-Offs, Arrivals, Vessels, Port, Container, Compliance, Readiness) */}
      <OperationsPanels
        borderStations={data.borderStations}
        portOperations={data.portOperations}
        containerRisks={data.containerRisks}
        documentCompliance={data.documentCompliance}
        activeRoutes={data.activeRoutes}
        upcomingCutOffs={data.upcomingCutOffs}
        upcomingArrivals={data.upcomingArrivals}
        vesselActivity={data.vesselActivity}
        readiness={data.readiness}
        onOpenBol={(b) => setInspectedBol(b)}
        onOpenContainer={(c) => setInspectedContainer(c)}
        onOpenCompliance={(b) => {
          setView("document-compliance")
        }}
      />

      {/* 5. Today's Operations Feed & Timeline */}
      {data.timelineEvents.length > 0 && (
        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <History className="w-4 h-4 text-blue-500" />
              <span>Today&apos;s Operations Feed & Activity Timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 max-h-56 overflow-y-auto divide-y divide-border/40">
            {data.timelineEvents.map((evt) => (
              <div key={evt.id} className="py-2 flex items-start justify-between text-xs gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">{evt.title}</span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">{evt.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 text-[11px] text-muted-foreground">
                  <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="block text-[10px]">{new Date(evt.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Drawers */}
      <BolQuickDrawer
        bolNumber={inspectedBol}
        shipment={selectedBolShipment}
        onClose={() => setInspectedBol(null)}
        onOpenBolEditor={(b) => {
          setInspectedBol(null)
          if (onOpenBol) onOpenBol(b)
          else setView("bol")
        }}
        onOpenCompliance={(b) => {
          setInspectedBol(null)
          setView("document-compliance")
        }}
        privacyMode={privacyMode}
      />

      <ContainerQuickDrawer
        containerNumber={inspectedContainer}
        containerRisk={selectedContainerRisk}
        onClose={() => setInspectedContainer(null)}
        onOpenBookingModule={(c) => {
          setInspectedContainer(null)
          setView("shipments")
        }}
      />

      <CustomerQuickDrawer
        customerName={inspectedCustomer}
        shipments={data.shipments}
        onClose={() => setInspectedCustomer(null)}
        onOpenLedger={(c) => {
          setInspectedCustomer(null)
          if (onOpenLedger) onOpenLedger(c)
          else setView("accounting")
        }}
        privacyMode={privacyMode}
      />

      {/* Omni-Search Modal */}
      <OmniSearchDialog
        open={isOmniSearchOpen}
        onOpenChange={setIsOmniSearchOpen}
        shipments={data.shipments}
        onSelectResult={handleSelectSearchResult}
      />

      {/* WhatsApp Modal */}
      {whatsAppTarget && (
        <CopyWhatsAppModal
          shipment={whatsAppTarget}
          isOpen={Boolean(whatsAppTarget)}
          onClose={() => setWhatsAppTarget(null)}
        />
      )}

      {/* Daily Status Modal (Multi-Language: English, Pashto, Persian, Urdu) */}
      <Dialog open={isDailyStatusOpen} onOpenChange={setIsDailyStatusOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Generate Daily Operations Status</span>
              <Badge variant="outline" className="font-mono text-xs">4 Languages</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5 border-b border-border pb-2">
              <span className="text-xs font-semibold text-muted-foreground mr-2">Language:</span>
              <button
                type="button"
                onClick={() => setDailyStatusLang("en")}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                  dailyStatusLang === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusLang("ps")}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                  dailyStatusLang === "ps" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                پښتو (Pashto)
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusLang("fa")}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                  dailyStatusLang === "fa" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                فارسی (Dari)
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusLang("ur")}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                  dailyStatusLang === "ur" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                اردو (Urdu/Hindi)
              </button>
            </div>

            <textarea
              readOnly
              rows={11}
              value={generateDailyStatusText()}
              dir={dailyStatusLang === "ps" || dailyStatusLang === "fa" || dailyStatusLang === "ur" ? "rtl" : "ltr"}
              className="w-full p-3 font-mono text-xs rounded-lg border border-border bg-muted/40 text-foreground resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Ready to paste in WhatsApp group or email
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={() => setIsDailyStatusOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs gap-1.5"
                onClick={copyDailyStatusToClipboard}
              >
                {copiedStatus ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStatus ? "Copied!" : "Copy Message"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
