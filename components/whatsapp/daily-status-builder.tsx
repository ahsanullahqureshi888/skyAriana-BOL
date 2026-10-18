"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Building,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Filter,
  Layers,
  MapPin,
  MessageSquare,
  RefreshCw,
  Scissors,
  Ship,
  Sparkles,
  Split,
  Truck,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { NormalizedWhatsAppShipment, WhatsAppSettings } from "@/lib/whatsapp/message-types"
import {
  buildDailyInternalOperationsGroup,
  buildManagementSummary,
  filterShipmentsForBulk,
  generateDailyStatusMessage,
  type BulkFormat,
  type BulkGrouping,
} from "@/lib/whatsapp/bulk-message"
import { buildWhatsAppDeepLink } from "@/lib/whatsapp/phone-normalizer"

interface DailyStatusBuilderProps {
  shipments: NormalizedWhatsAppShipment[]
  settings?: WhatsAppSettings
}

function copyWithFallback(text: string): boolean {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  try {
    textarea.select()
    const success = document.execCommand("copy")
    return success
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

export function DailyStatusBuilder({ shipments, settings }: DailyStatusBuilderProps) {
  // Mode Preset
  const [preset, setPreset] = useState<"daily_all" | "internal_group" | "management">("daily_all")

  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [shipperFilter, setShipperFilter] = useState("all")
  const [destinationFilter, setDestinationFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [activeOnly, setActiveOnly] = useState(true)

  // Layout & Formatting
  const [grouping, setGrouping] = useState<BulkGrouping>("none")
  const [format, setFormat] = useState<BulkFormat>("compact")

  // Copy state
  const [copiedPart, setCopiedPart] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  // Filter options extraction
  const uniqueShippers = useMemo(() => {
    return Array.from(new Set(shipments.map((s) => s.shipper.name).filter(Boolean))).sort()
  }, [shipments])

  const uniqueDestinations = useMemo(() => {
    return Array.from(new Set(shipments.map((s) => s.destination).filter(Boolean))).sort()
  }, [shipments])

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(shipments.map((s) => s.currentLocation).filter(Boolean))).sort()
  }, [shipments])

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return filterShipmentsForBulk(shipments, {
      status: statusFilter,
      shipper: shipperFilter,
      destination: destinationFilter,
      location: locationFilter,
      activeOnly,
    })
  }, [shipments, statusFilter, shipperFilter, destinationFilter, locationFilter, activeOnly])

  // Generated message(s)
  const result = useMemo(() => {
    if (preset === "internal_group") {
      const text = buildDailyInternalOperationsGroup(filteredShipments, settings?.defaultDateFormat)
      return {
        fullMessage: text,
        isSplitNeeded: false,
        totalParts: 1,
        parts: [{ partNumber: 1, totalParts: 1, title: "Operations Group", text, shipmentRange: `1–${filteredShipments.length}` }],
      }
    }
    if (preset === "management") {
      const text = buildManagementSummary(filteredShipments, settings?.defaultDateFormat)
      return {
        fullMessage: text,
        isSplitNeeded: false,
        totalParts: 1,
        parts: [{ partNumber: 1, totalParts: 1, title: "Management Summary", text, shipmentRange: `1–${filteredShipments.length}` }],
      }
    }

    return generateDailyStatusMessage(filteredShipments, {
      grouping,
      format,
      dateFormat: settings?.defaultDateFormat,
    })
  }, [preset, filteredShipments, grouping, format, settings])

  const handleCopyPart = async (partNum: number, text: string) => {
    let ok = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        ok = true
      } catch {
        ok = copyWithFallback(text)
      }
    } else {
      ok = copyWithFallback(text)
    }

    if (ok) {
      setCopiedPart(partNum)
      toast.success(`✓ Message ${partNum} copied`)
      setTimeout(() => setCopiedPart(null), 2500)
    } else {
      toast.error("Failed to copy message")
    }
  }

  const handleCopyAll = async () => {
    let ok = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(result.fullMessage)
        ok = true
      } catch {
        ok = copyWithFallback(result.fullMessage)
      }
    } else {
      ok = copyWithFallback(result.fullMessage)
    }

    if (ok) {
      setCopiedAll(true)
      toast.success("✓ Complete daily status copied")
      setTimeout(() => setCopiedAll(false), 2500)
    } else {
      toast.error("Failed to copy")
    }
  }

  const handleOpenWhatsApp = (text: string) => {
    const link = buildWhatsAppDeepLink(null, text)
    window.open(link, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-4">
      {/* Top Presets Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={preset === "daily_all" ? "default" : "outline"}
            onClick={() => setPreset("daily_all")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Daily All Shipments</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={preset === "internal_group" ? "default" : "outline"}
            onClick={() => setPreset("internal_group")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Internal Ops Group</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={preset === "management" ? "default" : "outline"}
            onClick={() => setPreset("management")}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Management Summary</span>
          </Button>
        </div>

        <Badge variant="outline" className="text-xs font-mono font-bold bg-blue-50 text-blue-800 border-blue-200">
          {filteredShipments.length} Matching Shipments
        </Badge>
      </div>

      {/* Filter and Grouping Bar */}
      {preset === "daily_all" && (
        <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Shipper */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Shipper / Customer</Label>
                <Select value={shipperFilter} onValueChange={setShipperFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shippers</SelectItem>
                    {uniqueShippers.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Destination</Label>
                <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Destinations</SelectItem>
                    {uniqueDestinations.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="at_border">At Border</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="at_port">At Port</SelectItem>
                    <SelectItem value="vessel_departed">Vessel Departed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Group By */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Group By</Label>
                <Select value={grouping} onValueChange={(v) => setGrouping(v as BulkGrouping)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ungrouped (Flat)</SelectItem>
                    <SelectItem value="location">By Current Location</SelectItem>
                    <SelectItem value="status">By Status</SelectItem>
                    <SelectItem value="customer">By Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as BulkFormat)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact (3 lines)</SelectItem>
                    <SelectItem value="detailed">Detailed (Full)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Switch
                  id="bulk-active-toggle"
                  checked={activeOnly}
                  onCheckedChange={setActiveOnly}
                />
                <Label htmlFor="bulk-active-toggle" className="text-xs font-semibold cursor-pointer text-slate-700">
                  Active Shipments Only (Excludes delivered & cancelled)
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all")
                  setShipperFilter("all")
                  setDestinationFilter("all")
                  setLocationFilter("all")
                  setGrouping("none")
                }}
                className="h-7 text-xs text-slate-500 hover:text-slate-900"
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Length Alert & Splitting Information */}
      {result.isSplitNeeded && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-900 flex items-start gap-3 shadow-2xs">
          <Split className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 flex-1">
            <div className="font-bold text-sm">Large WhatsApp Update Detected</div>
            <p>
              This update exceeds typical WhatsApp single-message limits ({result.fullMessage.length.toLocaleString()}{" "}
              chars). The system has automatically divided it into <b>{result.totalParts} sequential messages</b> without
              cutting any shipment in half.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCopyAll}
            className="h-8 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white shrink-0 cursor-pointer"
          >
            {copiedAll ? "✓ Copied All" : "Copy Complete Text Anyway"}
          </Button>
        </div>
      )}

      {/* Preview Output */}
      {result.isSplitNeeded ? (
        <Tabs defaultValue="part-1" className="w-full space-y-3">
          <TabsList className="h-9 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            {result.parts.map((p) => (
              <TabsTrigger
                key={p.partNumber}
                value={`part-${p.partNumber}`}
                className="text-xs font-bold data-[state=active]:bg-white rounded-lg px-3"
              >
                {p.title} ({p.shipmentRange})
              </TabsTrigger>
            ))}
          </TabsList>

          {result.parts.map((p) => (
            <TabsContent key={p.partNumber} value={`part-${p.partNumber}`} className="space-y-3">
              <Card className="rounded-2xl border-slate-200/90 bg-white/95 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Message {p.partNumber} of {p.totalParts} (Shipments {p.shipmentRange})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {p.text.length} characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyPart(p.partNumber, p.text)}
                      className={`h-7 px-3 text-xs font-bold gap-1 cursor-pointer ${
                        copiedPart === p.partNumber
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {copiedPart === p.partNumber ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPart === p.partNumber ? "✓ Copied" : `Copy Message ${p.partNumber}`}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenWhatsApp(p.text)}
                      className="h-7 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      <span>Open in WhatsApp</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5">
                  <Textarea
                    readOnly
                    value={p.text}
                    rows={12}
                    className="w-full text-xs font-mono bg-slate-50/50 border-slate-200 leading-relaxed resize-y p-3"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="rounded-2xl border-slate-200/90 bg-white/95 shadow-2xs">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Generated WhatsApp Message</span>
              <span className="text-[10px] font-mono text-slate-400">
                {result.fullMessage.length} characters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCopyAll}
                className={`h-8 px-4 text-xs font-bold gap-1.5 cursor-pointer ${
                  copiedAll
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedAll ? "✓ Copied" : "Copy Message"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenWhatsApp(result.fullMessage)}
                className="h-8 px-3 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                <span>Open WhatsApp</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <Textarea
              readOnly
              value={result.fullMessage}
              rows={14}
              className="w-full text-xs font-mono bg-slate-50/50 border-slate-200 leading-relaxed resize-y p-3"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
