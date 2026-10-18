"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  History,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Truck,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  NormalizedWhatsAppShipment,
  WhatsAppSettings,
} from "@/lib/whatsapp/message-types"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import { DEFAULT_WHATSAPP_SETTINGS } from "@/lib/whatsapp/constants"
import { ShipmentMessageGenerator } from "./shipment-message-generator"
import { DailyStatusBuilder } from "./daily-status-builder"
import { MessageTemplatesManager } from "./message-templates-manager"
import { WhatsAppHistoryView } from "./whatsapp-history-view"
import { WhatsAppSettingsDialog } from "./whatsapp-settings-dialog"
import { buildWhatsAppDeepLink } from "@/lib/whatsapp/phone-normalizer"

interface WhatsAppOperationsViewProps {
  initialBolNumber?: string
  onOpenBol?: (bolNumber: string) => void
  onOpenLedger?: (accountName?: string) => void
}

export function WhatsAppOperationsView({
  initialBolNumber,
  onOpenBol,
  onOpenLedger,
}: WhatsAppOperationsViewProps) {
  const [activeTab, setActiveTab] = useState<"generator" | "daily" | "selected" | "templates" | "history">("generator")
  const [shipments, setShipments] = useState<NormalizedWhatsAppShipment[]>([])
  const [selectedShipment, setSelectedShipment] = useState<NormalizedWhatsAppShipment | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Selected shipments for bulk combined action (Requirement 37)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Settings
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Fetch shipments and settings
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [shipmentsRes, bolsRes, settingsRes] = await Promise.allSettled([
        fetch("/api/shipments", { cache: "no-store" }),
        fetch("/api/bol", { cache: "no-store" }),
        fetch("/api/whatsapp/settings", { cache: "no-store" }),
      ])

      const list: NormalizedWhatsAppShipment[] = []
      const seenIds = new Set<string>()

      if (shipmentsRes.status === "fulfilled" && shipmentsRes.value.ok) {
        const body = await shipmentsRes.value.json()
        const raw = body.shipments || body.data || body || []
        if (Array.isArray(raw)) {
          for (const item of raw) {
            const norm = normalizeToWhatsAppShipment(item)
            if (!seenIds.has(norm.bolNumber)) {
              seenIds.add(norm.bolNumber)
              list.push(norm)
            }
          }
        }
      }

      if (bolsRes.status === "fulfilled" && bolsRes.value.ok) {
        const body = await bolsRes.value.json()
        const raw = Array.isArray(body) ? body : body.data || []
        for (const item of raw) {
          const norm = normalizeToWhatsAppShipment(item)
          if (!seenIds.has(norm.bolNumber)) {
            seenIds.add(norm.bolNumber)
            list.push(norm)
          }
        }
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        const body = await settingsRes.value.json()
        if (body.settings) {
          setSettings(body.settings)
        }
      }

      setShipments(list)

      // Set initial shipment
      if (list.length > 0) {
        if (initialBolNumber) {
          const found = list.find((s) => s.bolNumber.toLowerCase() === initialBolNumber.toLowerCase())
          setSelectedShipment(found || list[0])
        } else {
          setSelectedShipment(list[0])
        }
      }
    } catch (err) {
      console.error("Failed to load WhatsApp operations data:", err)
      toast.error("Could not load shipments for WhatsApp")
    } finally {
      setIsLoading(false)
    }
  }, [initialBolNumber])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Quick Universal Search across all operational fields (Requirement 3)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()

    return shipments.filter((s) => {
      const matchBol = s.bolNumber.toLowerCase().includes(q)
      const matchInv = s.invoiceNumber?.toLowerCase().includes(q)
      const matchShipper = s.shipper.name.toLowerCase().includes(q)
      const matchConsignee = s.consignee.name.toLowerCase().includes(q)
      const matchNotify = s.notifyParty?.name.toLowerCase().includes(q)
      const matchContainer = s.containerNumber?.toLowerCase().includes(q)
      const matchTruck = s.truckNumber?.toLowerCase().includes(q)
      const matchVessel = s.vesselName?.toLowerCase().includes(q)
      const matchVoyage = s.voyageNumber?.toLowerCase().includes(q)
      const matchCommodity = s.commodity.toLowerCase().includes(q)
      const matchDest = s.destination.toLowerCase().includes(q)
      const matchLoc = s.currentLocation.toLowerCase().includes(q)

      return (
        matchBol ||
        matchInv ||
        matchShipper ||
        matchConsignee ||
        matchNotify ||
        matchContainer ||
        matchTruck ||
        matchVessel ||
        matchVoyage ||
        matchCommodity ||
        matchDest ||
        matchLoc
      )
    })
  }, [shipments, searchQuery])

  const handleSelectSearchResult = (shipment: NormalizedWhatsAppShipment) => {
    setSelectedShipment(shipment)
    setSearchQuery("")
    setIsSearchOpen(false)
    setActiveTab("generator")
    toast.success(`Loaded ${shipment.bolNumber}`)
  }

  // Selected shipments management
  const toggleSelectShipment = (bol: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(bol)) next.delete(bol)
      else next.add(bol)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === shipments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(shipments.map((s) => s.bolNumber)))
    }
  }

  const selectedShipmentsList = useMemo(() => {
    return shipments.filter((s) => selectedIds.has(s.bolNumber))
  }, [shipments, selectedIds])

  return (
    <div className="w-full max-w-[1780px] mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* 1. Header & Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                WHATSAPP OPERATIONS CENTER
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Live Operations
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate shipment updates from live operational records
            </p>
          </div>
        </div>

        {/* Top Actions Ribbon (Requirement 2) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "generator" ? "default" : "outline"}
            onClick={() => setActiveTab("generator")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Shipment Update</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "daily" ? "default" : "outline"}
            onClick={() => setActiveTab("daily")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Daily Status</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "selected" ? "default" : "outline"}
            onClick={() => setActiveTab("selected")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Selected Shipments {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "templates" ? "default" : "outline"}
            onClick={() => setActiveTab("templates")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Message Templates</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-slate-900 cursor-pointer"
            title="WhatsApp Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Quick Universal Search (Requirement 3) */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search BOL, container, truck, shipper, consignee, vessel, commodity, destination..."
            className="h-10 pl-10 pr-4 text-xs sm:text-sm bg-white dark:bg-slate-900 rounded-xl border-slate-200 shadow-2xs"
          />
        </div>

        {/* Live Search Autocomplete Popup */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-11 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-h-80 overflow-y-auto divide-y divide-slate-100">
            {searchResults.slice(0, 10).map((res) => (
              <div
                key={res.bolNumber}
                onClick={() => handleSelectSearchResult(res)}
                className="p-3 hover:bg-blue-50/70 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      {res.bolNumber}
                    </span>
                    {res.containerNumber && (
                      <span className="font-mono text-[11px] text-slate-500">
                        • {res.containerNumber}
                      </span>
                    )}
                    {res.truckNumber && (
                      <span className="font-mono text-[11px] text-slate-500">
                        • Truck {res.truckNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 truncate">
                    {res.shipper.name} ➔ {res.consignee.name} ({res.commodity})
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                    {res.statusDisplay}
                  </Badge>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{res.currentLocation}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        {/* Tab 1: Single Shipment Message Generator */}
        <TabsContent value="generator" className="space-y-4 mt-0">
          <ShipmentMessageGenerator
            shipment={selectedShipment}
            settings={settings}
            onOpenBol={onOpenBol}
          />
        </TabsContent>

        {/* Tab 2: Daily All Shipments Status */}
        <TabsContent value="daily" className="space-y-4 mt-0">
          <DailyStatusBuilder
            shipments={shipments}
            settings={settings}
          />
        </TabsContent>

        {/* Tab 3: Selected Shipments Combined Message (Requirement 37) */}
        <TabsContent value="selected" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Shipment Checklist */}
            <Card className="lg:col-span-5 rounded-2xl border-slate-200/90 bg-white/95 shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-7 text-xs font-bold text-blue-600 hover:text-blue-800 px-2"
                  >
                    {selectedIds.size === shipments.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <Badge variant="outline" className="text-xs font-bold font-mono">
                  {selectedIds.size} of {shipments.length} Selected
                </Badge>
              </CardHeader>
              <CardContent className="p-2 space-y-1 max-h-[520px] overflow-y-auto">
                {shipments.map((s) => {
                  const isChecked = selectedIds.has(s.bolNumber)
                  return (
                    <div
                      key={s.bolNumber}
                      onClick={() => toggleSelectShipment(s.bolNumber)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isChecked
                          ? "border-blue-400 bg-blue-50/70"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-slate-900 block truncate">
                            {s.bolNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {s.shipper.name} • {s.commodity}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {s.statusDisplay}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Right: Combined Message Builder for Selected */}
            <div className="lg:col-span-7">
              {selectedShipmentsList.length > 0 ? (
                <DailyStatusBuilder
                  shipments={selectedShipmentsList}
                  settings={settings}
                />
              ) : (
                <Card className="rounded-2xl border-slate-200/90 bg-white/95 p-12 text-center text-xs text-slate-500 shadow-2xs">
                  <CheckSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  Select one or more shipments on the left to generate a combined status message.
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Templates Manager */}
        <TabsContent value="templates" className="space-y-4 mt-0">
          <MessageTemplatesManager currentShipment={selectedShipment} />
        </TabsContent>

        {/* Tab 5: History Audit */}
        <TabsContent value="history" className="space-y-4 mt-0">
          <WhatsAppHistoryView
            onSelectBol={(bol) => {
              const found = shipments.find((s) => s.bolNumber.toLowerCase() === bol.toLowerCase())
              if (found) {
                setSelectedShipment(found)
                setActiveTab("generator")
                toast.success(`Loaded ${bol}`)
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Settings Modal */}
      <WhatsAppSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(updated) => setSettings(updated)}
      />
    </div>
  )
}
