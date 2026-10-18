"use client"

import { useState, useMemo } from "react"
import {
  X,
  MapPin,
  Clock,
  Truck,
  Ship,
  FileText,
  AlertTriangle,
  DollarSign,
  Copy,
  CheckCircle2,
  Send,
  Calendar,
  Layers,
  ShieldCheck,
  Building,
  User,
  ExternalLink,
  ChevronDown,
  History,
  Paperclip,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import type { ShipmentMaster, ShipmentStatus, DocumentMismatchAlert } from "@/lib/types/shipment"
import { validateShipmentDocuments, generateWhatsAppStatusMessage } from "@/lib/utils/shipment-utils"
import { normalizeToWhatsAppShipment } from "@/lib/whatsapp/normalized-shipment"
import { buildWhatsAppMessage } from "@/lib/whatsapp/message-builder"
import { toast } from "sonner"

interface ShipmentDetailDrawerProps {
  shipment: ShipmentMaster
  onClose: () => void
  onUpdateShipment: (updated: ShipmentMaster) => void
  onOpenBol?: (bolNumber: string) => void
  onOpenLedger?: (accountName?: string, companyName?: string) => void
}

export function ShipmentDetailDrawer({
  shipment,
  onClose,
  onUpdateShipment,
  onOpenBol,
  onOpenLedger,
}: ShipmentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "documents" | "finance" | "audit">("overview")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [copiedLang, setCopiedLang] = useState<string | null>(null)

  // Status update form state
  const [newLocation, setNewLocation] = useState(shipment.currentLocation || "")
  const [newStatus, setNewStatus] = useState<ShipmentStatus>(shipment.status)
  const [newDescription, setNewDescription] = useState("")
  const [newEta, setNewEta] = useState(shipment.eta || "")
  const [newDelayReason, setNewDelayReason] = useState(shipment.delayReason || "")

  // WhatsApp language selection
  const [whatsAppLang, setWhatsAppLang] = useState<"en" | "ps" | "fa" | "hi">("en")
  const [postUpdateNotification, setPostUpdateNotification] = useState(false)
  const [latestShipment, setLatestShipment] = useState<ShipmentMaster>(shipment)

  // Real-time document mismatch alerts
  const mismatchAlerts = useMemo<DocumentMismatchAlert[]>(() => {
    return validateShipmentDocuments(shipment)
  }, [shipment])

  // Document checklist computation
  const documentChecklist = useMemo(() => {
    const docs = shipment.documents || []
    const hasBol = docs.some((d) => d.documentType === "bol") || Boolean(shipment.referenceNumber)
    const hasInvoice = docs.some((d) => d.documentType === "commercial_invoice")
    const hasPackingList = docs.some((d) => d.documentType === "packing_list")
    const hasStickers = docs.some((d) => d.documentType === "stickers")
    const hasTransitPaper = docs.some((d) => d.documentType === "transit_paper")
    const hasPhyto = docs.some((d) => d.documentType === "phytosanitary")
    const hasAfghanDocs = docs.some((d) => (d.snapshotData?.afghanistan_documents || []).length > 0)
    const hasCustoms = docs.some((d) => d.documentType === "customs")

    const items = [
      { name: "Bill of Lading (BOL)", present: hasBol, type: "bol" },
      { name: "Commercial Invoice", present: hasInvoice, type: "commercial_invoice" },
      { name: "Packing List", present: hasPackingList, type: "packing_list" },
      { name: "Sticker Labels", present: hasStickers, type: "stickers" },
      { name: "Transit Paper", present: hasTransitPaper, type: "transit_paper" },
      { name: "Phytosanitary Certificate", present: hasPhyto, type: "phytosanitary" },
      { name: "Afghan Transit Documents", present: hasAfghanDocs, type: "afghan_docs" },
      { name: "Customs Clearance Papers", present: hasCustoms, type: "customs" },
    ]

    const completedCount = items.filter((i) => i.present).length
    return { items, completedCount, total: items.length }
  }, [shipment])

  // Handle saving quick status update
  const handleSaveStatusUpdate = async () => {
    setIsUpdatingStatus(true)
    try {
      const res = await fetch("/api/shipments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick_status_update",
          shipmentId: shipment.id,
          statusUpdate: {
            currentLocation: newLocation,
            status: newStatus,
            description: newDescription,
            eta: newEta,
            delayReason: newDelayReason,
            dateTime: new Date().toISOString(),
          },
          user: "Operations Desk",
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.shipment) {
          onUpdateShipment(body.shipment)
          setLatestShipment(body.shipment)
          setPostUpdateNotification(true)
          toast.success("Shipment tracking timeline updated successfully!")
          setNewDescription("")
        }
      } else {
        toast.error("Failed to update shipment status.")
      }
    } catch (err) {
      toast.error("Network error while updating status.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle WhatsApp message copy
  const handleCopyWhatsApp = (lang: "en" | "ps" | "fa" | "hi") => {
    const text = generateWhatsAppStatusMessage(shipment, lang)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedLang(lang)
      toast.success(`Copied ${lang.toUpperCase()} status broadcast message to clipboard!`)
      setTimeout(() => setCopiedLang(null), 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-black text-blue-700">{shipment.referenceNumber || shipment.id}</span>
            <Badge variant="outline" className="text-[10px] uppercase font-bold">
              {shipment.status.replace(/_/g, " ")}
            </Badge>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600 truncate max-w-48">{shipment.cargo?.commodity}</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenBol && shipment.referenceNumber && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onOpenBol(shipment.referenceNumber)
                }}
                className="h-7 px-2.5 text-xs font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 border-blue-200 rounded-lg cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Open BOL
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Tabs Navigation */}
        <div className="px-4 pt-2 border-b border-slate-100 bg-white shrink-0">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid grid-cols-5 h-8 p-0.5 bg-slate-100 rounded-xl text-xs font-bold">
              <TabsTrigger value="overview" className="rounded-lg text-[11px] py-1">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg text-[11px] py-1">Tracking</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg text-[11px] py-1">Documents ({documentChecklist.completedCount}/{documentChecklist.total})</TabsTrigger>
              <TabsTrigger value="finance" className="rounded-lg text-[11px] py-1">Finance</TabsTrigger>
              <TabsTrigger value="audit" className="rounded-lg text-[11px] py-1">Audit Log</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Post-Tracking-Update Action Banner (Requirement 70) */}
          {postUpdateNotification && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Tracking Updated Successfully</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const msg = buildWhatsAppMessage(normalizeToWhatsAppShipment(latestShipment), {
                      isCustomerSafe: true,
                      language: whatsAppLang,
                    })
                    navigator.clipboard?.writeText(msg)
                    toast.success("✓ Customer Safe Update Copied")
                  }}
                  className="h-7 px-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                >
                  Copy Customer Update
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const msg = buildWhatsAppMessage(normalizeToWhatsAppShipment(latestShipment), {
                      isCustomerSafe: false,
                      language: whatsAppLang,
                    })
                    navigator.clipboard?.writeText(msg)
                    toast.success("✓ Internal Update Copied")
                  }}
                  className="h-7 px-2.5 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  Copy Internal Update
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPostUpdateNotification(false)}
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Document Mismatch Alert Banner (shown across tabs if any exists) */}
          {mismatchAlerts.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>⚠ DOCUMENT MISMATCH DETECTED ({mismatchAlerts.length})</span>
              </div>
              {mismatchAlerts.map((alert, idx) => (
                <div key={idx} className="bg-white/80 p-2 rounded-xl text-[11px] border border-rose-100 text-slate-800 space-y-1">
                  <div className="font-semibold text-rose-700">{alert.label}</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>{alert.documentA}: <span className="font-mono font-bold text-slate-900">{alert.expectedValue}</span></div>
                    <div>{alert.documentB}: <span className="font-mono font-bold text-rose-700">{alert.actualValue}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Parties Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="bg-slate-50/70 border-slate-200 p-3 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3 text-blue-600" /> Shipper / Exporter
                  </div>
                  <div className="font-bold text-xs text-slate-900">{shipment.shipper?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{shipment.shipper?.address || "No address on file"}</div>
                  {shipment.shipper?.phone && <div className="text-[10px] text-slate-400 font-mono mt-1">Tel: {shipment.shipper.phone}</div>}
                </Card>

                <Card className="bg-slate-50/70 border-slate-200 p-3 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Building className="h-3 w-3 text-indigo-600" /> Consignee / Importer
                  </div>
                  <div className="font-bold text-xs text-slate-900">{shipment.consignee?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{shipment.consignee?.address || "No address on file"}</div>
                  {shipment.consignee?.fssaiNumber && <div className="text-[10px] text-slate-400 font-mono mt-1">FSSAI: {shipment.consignee.fssaiNumber}</div>}
                </Card>
              </div>

              {/* Cargo & Container Specs */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2.5">
                <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>Cargo & Packaging Specifications</span>
                  <Badge variant="secondary" className="font-mono text-[10px]">HS: {shipment.cargo?.hsCode}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Commodity</span>
                    <span className="font-bold text-slate-800">{shipment.cargo?.commodity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Packages</span>
                    <span className="font-bold text-slate-800">{shipment.cargo?.cartons} Cartons</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Gross Weight</span>
                    <span className="font-bold text-slate-800">{shipment.cargo?.grossWeightKg} KG</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Net Weight</span>
                    <span className="font-bold text-slate-800">{shipment.cargo?.netWeightKg} KG</span>
                  </div>
                </div>
              </div>

              {/* Equipment & Multimodal Transport */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2.5">
                <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>Container & Multimodal Equipment</span>
                  <Badge className="bg-blue-100 text-blue-800 font-mono text-[10px]">{shipment.container?.containerType || "40HC"}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Container Number</span>
                    <span className="font-mono font-bold text-slate-900">{shipment.container?.containerNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Seal Number</span>
                    <span className="font-mono font-bold text-slate-900">{shipment.container?.sealNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Driver & Truck</span>
                    <span className="font-bold text-slate-800">{shipment.truck?.driverName || "—"} ({shipment.truck?.afghanPlate || "Plate N/A"})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Origin & Loading</span>
                    <span className="font-medium text-slate-700">{shipment.transport?.origin} → {shipment.transport?.portOfLoading}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Discharge & Final</span>
                    <span className="font-medium text-slate-700">{shipment.transport?.portOfDischarge} → {shipment.transport?.finalDestination}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Vessel / Voyage</span>
                    <span className="font-medium text-slate-700">{shipment.vessel?.vesselName || "—"} {shipment.vessel?.voyageNumber ? `(V.${shipment.vessel.voyageNumber})` : ""}</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Generator Preview */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-emerald-600" />
                    WhatsApp Status Broadcast Message
                  </span>
                  <div className="flex items-center gap-1">
                    {(["en", "ps", "fa", "hi"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setWhatsAppLang(l)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          whatsAppLang === l
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100/50"
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <pre className="p-2.5 bg-white rounded-xl text-[11px] font-mono text-slate-700 whitespace-pre-wrap border border-emerald-100 leading-relaxed">
                  {generateWhatsAppStatusMessage(shipment, whatsAppLang)}
                </pre>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleCopyWhatsApp(whatsAppLang)}
                    className="h-7 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 cursor-pointer"
                  >
                    {copiedLang === whatsAppLang ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedLang === whatsAppLang ? "Copied!" : "Copy Broadcast Message"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE & QUICK UPDATE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {/* Quick Status Update Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span>Update Shipment Status</span>
                  <Badge variant="outline" className="text-[10px]">Appends to History</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Current Location</label>
                    <Input
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. Dogharoon Border"
                      className="h-8 text-xs rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                      className="w-full h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="cargo_loaded">Cargo Loaded</option>
                      <option value="in_transit">In Transit</option>
                      <option value="at_border">At Border</option>
                      <option value="at_port">At Port</option>
                      <option value="on_vessel">On Vessel</option>
                      <option value="arrived_destination">Arrived Destination</option>
                      <option value="delivered">Delivered</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Optional ETA</label>
                    <Input
                      value={newEta}
                      onChange={(e) => setNewEta(e.target.value)}
                      placeholder="e.g. 25 September 2026"
                      className="h-8 text-xs rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Delay Reason (if delayed)</label>
                    <Input
                      value={newDelayReason}
                      onChange={(e) => setNewDelayReason(e.target.value)}
                      placeholder="e.g. Customs document inspection"
                      className="h-8 text-xs rounded-xl bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Update Description / Remarks</label>
                    <Input
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Truck arrived at border station, awaiting clearance slip..."
                      className="h-8 text-xs rounded-xl bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleSaveStatusUpdate}
                    disabled={isUpdatingStatus}
                    className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                  >
                    {isUpdatingStatus ? "Saving..." : "Save Status & Timeline"}
                  </Button>
                </div>
              </div>

              {/* Visual Timeline Milestones */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="text-xs font-black text-slate-800">Operational Tracking Milestones</div>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {(shipment.milestones || []).map((m, idx) => {
                    const isCompleted = m.completed
                    const isCurrent = m.location.toLowerCase() === (shipment.currentLocation || "").toLowerCase()
                    return (
                      <div key={m.id || idx} className="relative group text-xs">
                        {/* Node marker */}
                        <div
                          className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            isCurrent
                              ? "border-blue-600 bg-blue-600 text-white animate-pulse"
                              : isCompleted
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isCompleted && !isCurrent && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`font-bold ${isCurrent ? "text-blue-700 font-black" : "text-slate-800"}`}>
                            {m.location} {isCurrent && <span className="ml-1 px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px]">● CURRENT</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{m.timestamp ? new Date(m.timestamp).toLocaleDateString() : ""}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">{m.title}</div>
                        {m.description && <div className="text-[10px] text-slate-400 mt-0.5">{m.description}</div>}
                        {m.delayReason && <div className="text-[10px] text-rose-600 font-bold mt-0.5">Delay: {m.delayReason}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS & CONTROL */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-blue-950">Document Control Completeness</div>
                  <div className="text-[11px] text-blue-700">Required export & transport clearance paperwork</div>
                </div>
                <div className="text-sm font-black font-mono text-blue-700 bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-xs">
                  {documentChecklist.completedCount} / {documentChecklist.total} COMPLETE
                </div>
              </div>

              {/* Checklist items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documentChecklist.items.map((doc, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      doc.present
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={`h-4 w-4 ${doc.present ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>{doc.name}</span>
                    </div>
                    <span>{doc.present ? "✅ Available" : "❌ Missing"}</span>
                  </div>
                ))}
              </div>

              {/* Document Snapshots List */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="text-xs font-black text-slate-800">Historical Document Snapshots</div>
                <p className="text-[11px] text-slate-500">
                  Documents maintain immutable snapshots so editing Master Party records does not modify historical legal papers.
                </p>
                <div className="space-y-1.5 pt-1">
                  {(shipment.documents || []).map((snap) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 uppercase">{snap.documentType.replace(/_/g, " ")}: </span>
                        <span className="font-mono text-blue-700 font-bold">{snap.documentNumber}</span>
                        <span className="text-slate-400 text-[10px] ml-2">v{snap.version} ({snap.status})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(snap.generatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {(shipment.documents || []).length === 0 && (
                    <div className="text-xs text-slate-400 py-2 text-center">No snapshots recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCE */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              {/* Financial KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <Card className="bg-slate-50 border-slate-200 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Customer Freight</div>
                  <div className="text-base font-black text-slate-900">${(shipment.finance?.customerAmount || 0).toLocaleString()}</div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Amount Received</div>
                  <div className="text-base font-black text-emerald-600">${(shipment.finance?.amountReceived || 0).toLocaleString()}</div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Customer Outstanding</div>
                  <div className="text-base font-black text-red-600">${(shipment.finance?.customerOutstanding || 0).toLocaleString()}</div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Supplier / Driver Rent</div>
                  <div className="text-base font-black text-slate-900">${(shipment.finance?.supplierCost || 0).toLocaleString()}</div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Supplier Paid</div>
                  <div className="text-base font-black text-emerald-600">${(shipment.finance?.amountPaid || 0).toLocaleString()}</div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Est. Profit / Margin</div>
                  <div className="text-base font-black text-blue-700">${(shipment.finance?.profitOrLoss || 0).toLocaleString()}</div>
                </Card>
              </div>

              {/* Link to Account Ledger button */}
              {onOpenLedger && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Relational Ledger Integration</div>
                    <div className="text-[11px] text-slate-500">Cross-reference with client debit/credit accounts</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose()
                      onOpenLedger(shipment.shipper?.name)
                    }}
                    className="text-xs font-bold gap-1.5 h-8 rounded-xl cursor-pointer"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    Open Account Ledger
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <History className="h-4 w-4 text-blue-600" />
                Immutable Audit Trail
              </div>
              <div className="space-y-1.5">
                {(shipment.auditLog || []).map((entry) => (
                  <div key={entry.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{entry.user}</span>
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="font-bold text-slate-800">{entry.actionDescription}</div>
                    {entry.oldValue && entry.newValue && (
                      <div className="text-[10px] text-slate-500">
                        Changed <span className="font-semibold text-slate-700">{entry.field}</span>: {String(entry.oldValue)} → {String(entry.newValue)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
