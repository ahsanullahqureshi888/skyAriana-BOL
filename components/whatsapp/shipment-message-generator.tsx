"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Hash,
  Info,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  RotateCcw,
  Send,
  ShieldCheck,
  Ship,
  Truck,
  User,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type {
  NormalizedWhatsAppShipment,
  WhatsAppDateFormat,
  WhatsAppLanguage,
  WhatsAppMessageType,
  WhatsAppSettings,
} from "@/lib/whatsapp/message-types"
import { buildWhatsAppMessage, formatDate } from "@/lib/whatsapp/message-builder"
import { buildWhatsAppDeepLink, getAvailableRecipients } from "@/lib/whatsapp/phone-normalizer"

interface ShipmentMessageGeneratorProps {
  shipment: NormalizedWhatsAppShipment | null
  settings?: WhatsAppSettings
  onOpenBol?: (bolNumber: string) => void
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

export function ShipmentMessageGenerator({
  shipment,
  settings,
  onOpenBol,
}: ShipmentMessageGeneratorProps) {
  const [messageType, setMessageType] = useState<WhatsAppMessageType>("customer_update")
  const [language, setLanguage] = useState<WhatsAppLanguage>(settings?.defaultLanguage || "en")
  const [isCustomerSafe, setIsCustomerSafe] = useState(true)
  const [selectedRecipientPhone, setSelectedRecipientPhone] = useState<string>("")
  const [customText, setCustomText] = useState<string>("")
  const [isCopied, setIsCopied] = useState(false)

  const recipients = useMemo(() => {
    return shipment ? getAvailableRecipients(shipment) : []
  }, [shipment])

  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientPhone) {
      setSelectedRecipientPhone(recipients[0].normalizedPhone)
    }
  }, [recipients, selectedRecipientPhone])

  const generatedMessage = useMemo(() => {
    if (!shipment) return ""
    return buildWhatsAppMessage(shipment, {
      messageType,
      language,
      isCustomerSafe,
      settings,
    })
  }, [shipment, messageType, language, isCustomerSafe, settings])

  useEffect(() => {
    setCustomText(generatedMessage)
    setIsCopied(false)
  }, [generatedMessage])

  if (!shipment) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Shipment Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Search by BOL number, container, truck, shipper, or destination above to load real shipment tracking data.
        </p>
      </div>
    )
  }

  const handleCopy = async () => {
    const text = customText || generatedMessage
    if (!text) return

    let copied = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        copied = copyWithFallback(text)
      }
    } else {
      copied = copyWithFallback(text)
    }

    if (copied) {
      setIsCopied(true)
      toast.success("✓ Copied for WhatsApp")
      setTimeout(() => setIsCopied(false), 2500)

      fetch("/api/whatsapp/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bolNumber: shipment.bolNumber,
          language,
          messageType,
          action: "copied",
          isInternal: !isCustomerSafe,
          recipientPhone: selectedRecipientPhone,
          messageText: text,
        }),
      }).catch(() => {})
    } else {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleOpenWhatsApp = () => {
    const text = customText || generatedMessage
    const link = buildWhatsAppDeepLink(selectedRecipientPhone, text)
    window.open(link, "_blank", "noopener,noreferrer")

    fetch("/api/whatsapp/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bolNumber: shipment.bolNumber,
        language,
        messageType,
        action: "opened_whatsapp",
        isInternal: !isCustomerSafe,
        recipientPhone: selectedRecipientPhone,
        messageText: text,
      }),
    }).catch(() => {})
  }

  const isRtl = language === "fa" || language === "ps" || language === "ur" || language === "fa_ps"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT PANE: Operational Shipment Information (Cols 1 to 5) */}
      <Card className="lg:col-span-5 rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm shadow-blue-500/5">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Shipment Information
              </CardTitle>
            </div>
            {onOpenBol && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenBol(shipment.bolNumber)}
                className="h-7 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                Open BOL ➔
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs">
          {/* Key Identifiers Banner */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">BOL Number:</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
                {shipment.bolNumber}
              </span>
            </div>
            {shipment.invoiceNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {shipment.invoiceNumber}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                {shipment.statusDisplay}
              </Badge>
            </div>
          </div>

          {/* Route & Ports */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Route & Transit</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Current Location</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {shipment.currentLocation}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Destination</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {shipment.destination}
                </span>
              </div>
            </div>
          </div>

          {/* Transport Units */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transport Units</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Container</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {shipment.containerNumber || "N/A"}
                </span>
                {shipment.containerType && (
                  <span className="text-[10px] text-slate-500 block">{shipment.containerType}</span>
                )}
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Truck / Plate</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {shipment.truckNumber || "N/A"}
                </span>
                {shipment.driver?.name && (
                  <span className="text-[10px] text-slate-500 block truncate">{shipment.driver.name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Parties</div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div>
                <span className="text-[10px] text-slate-400 block">Shipper</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">{shipment.shipper.name}</span>
                {shipment.shipper.phone && (
                  <span className="text-[10px] text-blue-600 block">{shipment.shipper.phone}</span>
                )}
              </div>
              <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5">
                <span className="text-[10px] text-slate-400 block">Consignee</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">{shipment.consignee.name}</span>
                {shipment.consignee.phone && (
                  <span className="text-[10px] text-blue-600 block">{shipment.consignee.phone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Cargo Specs */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cargo & Weight</div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="font-medium text-slate-800 dark:text-slate-200">{shipment.commodity}</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                {shipment.packagesFormatted && <span>Packages: {shipment.packagesFormatted}</span>}
                {shipment.netWeightKg && <span>NW: {shipment.netWeightKg.toLocaleString()} KG</span>}
              </div>
            </div>
          </div>

          {/* Schedules */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">ETA</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {shipment.eta ? formatDate(shipment.eta) : "Not available"}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Last Updated</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {formatDate(shipment.lastUpdated)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT PANE: Message Controls & WhatsApp Live Preview (Cols 6 to 12) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Controls Ribbon */}
        <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm shadow-blue-500/5">
          <CardContent className="p-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Message Type */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Message Format</Label>
                <Select value={messageType} onValueChange={(v) => setMessageType(v as WhatsAppMessageType)}>
                  <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-950 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_update">Professional Customer Update</SelectItem>
                    <SelectItem value="short_update">Short Shipment Update</SelectItem>
                    <SelectItem value="ops_short">Operations Short (1-Line)</SelectItem>
                    <SelectItem value="truck_update">Truck Status Update</SelectItem>
                    <SelectItem value="container_update">Container Status Update</SelectItem>
                    <SelectItem value="document_update">Document Checklist</SelectItem>
                    <SelectItem value="vessel_update">Multi-Leg / Vessel Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as WhatsAppLanguage)}>
                  <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-950 font-medium">
                    <Globe className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fa">Persian / Dari (فارسی)</SelectItem>
                    <SelectItem value="ps">Pashto (پښتو)</SelectItem>
                    <SelectItem value="ur">Urdu (اردو)</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                    <SelectItem value="en_fa">Bilingual (English + فارسی)</SelectItem>
                    <SelectItem value="en_ps">Bilingual (English + پښتو)</SelectItem>
                    <SelectItem value="en_hi">Bilingual (English + हिन्दी)</SelectItem>
                    <SelectItem value="fa_ps">Bilingual (فارسی + پښتو)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Recipient Phone</Label>
                {recipients.length > 0 ? (
                  <Select value={selectedRecipientPhone} onValueChange={setSelectedRecipientPhone}>
                    <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-950 font-medium">
                      <User className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                      <SelectValue placeholder="Select Recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((r) => (
                        <SelectItem key={r.normalizedPhone} value={r.normalizedPhone}>
                          {r.label}: {r.name} ({r.rawPhone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-8.5 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-center">
                    No phone on record
                  </div>
                )}
              </div>
            </div>

            {/* Mode & Safety Settings */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Switch
                  id="generator-safe-mode"
                  checked={isCustomerSafe}
                  onCheckedChange={setIsCustomerSafe}
                />
                <Label htmlFor="generator-safe-mode" className="text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {isCustomerSafe ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Customer Safe Mode Active</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-700 dark:text-amber-400 font-bold">Internal Operations Mode</span>
                    </>
                  )}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomText(generatedMessage)}
                className="h-7 text-xs font-semibold text-slate-500 hover:text-slate-900 gap-1"
                title="Reset manual edits"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Generated</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Phone-Style Preview Card */}
        <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm shadow-emerald-500/5 overflow-hidden">
          {/* Chat Header Bar */}
          <div className="bg-emerald-700 dark:bg-emerald-800 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                SA
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">
                  {selectedRecipientPhone
                    ? `Recipient: ${selectedRecipientPhone}`
                    : "WhatsApp Message Preview"}
                </div>
                <div className="text-[10px] text-emerald-100">
                  {isCustomerSafe ? "Customer Verified Template" : "Internal Restricted"}
                </div>
              </div>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] border-none">
              Live Preview
            </Badge>
          </div>

          {/* WhatsApp Chat Background Body */}
          <div className="p-4 bg-slate-100/70 dark:bg-slate-950/60 min-h-[260px] flex flex-col justify-between">
            {/* Chat Bubble */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-2 max-w-full">
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={10}
                dir={isRtl ? "rtl" : "ltr"}
                className="w-full text-xs font-mono border-none focus-visible:ring-0 p-0 resize-y leading-relaxed bg-transparent text-slate-900 dark:text-slate-100 shadow-none"
                placeholder="Message preview..."
              />
              <div className="text-right text-[10px] text-slate-400 font-mono">
                {customText.length} chars • {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="text-[11px] text-slate-500">
                Click <b>Copy Message</b> to send via any channel, or open conversation directly.
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopy}
                  className={`h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer transition-all ${
                    isCopied
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  }`}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{isCopied ? "✓ Copied" : "Copy Message"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenWhatsApp}
                  className="h-9 px-3.5 text-xs font-bold border-emerald-300 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ExternalLink className="h-4 w-4 text-emerald-600" />
                  <span>Open WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
