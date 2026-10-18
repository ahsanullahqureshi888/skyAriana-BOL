"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, ExternalLink, Globe, Lock, MessageSquare, RotateCcw, ShieldCheck, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { NormalizedWhatsAppShipment, WhatsAppLanguage, WhatsAppMessageType } from "@/lib/whatsapp/message-types"
import { buildWhatsAppMessage } from "@/lib/whatsapp/message-builder"
import { buildWhatsAppDeepLink, getAvailableRecipients } from "@/lib/whatsapp/phone-normalizer"

interface CopyWhatsAppModalProps {
  shipment: NormalizedWhatsAppShipment | null
  isOpen: boolean
  onClose: () => void
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

export function CopyWhatsAppModal({ shipment, isOpen, onClose }: CopyWhatsAppModalProps) {
  const [messageType, setMessageType] = useState<WhatsAppMessageType>("customer_update")
  const [language, setLanguage] = useState<WhatsAppLanguage>("en")
  const [isCustomerSafe, setIsCustomerSafe] = useState(true)
  const [recipientPhone, setRecipientPhone] = useState<string>("")
  const [customText, setCustomText] = useState("")
  const [isCopied, setIsCopied] = useState(false)

  const recipients = useMemo(() => {
    return shipment ? getAvailableRecipients(shipment) : []
  }, [shipment])

  // Select default recipient
  useEffect(() => {
    if (recipients.length > 0 && !recipientPhone) {
      setRecipientPhone(recipients[0].normalizedPhone)
    }
  }, [recipients, recipientPhone])

  // Generate standard message
  const generatedMessage = useMemo(() => {
    if (!shipment) return ""
    return buildWhatsAppMessage(shipment, {
      messageType,
      language,
      isCustomerSafe,
    })
  }, [shipment, messageType, language, isCustomerSafe])

  // Update custom text whenever generated message changes
  useEffect(() => {
    setCustomText(generatedMessage)
    setIsCopied(false)
  }, [generatedMessage])

  if (!shipment) return null

  const handleCopy = async () => {
    const textToCopy = customText || generatedMessage
    if (!textToCopy) return

    let copied = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy)
        copied = true
      } catch {
        copied = copyWithFallback(textToCopy)
      }
    } else {
      copied = copyWithFallback(textToCopy)
    }

    if (copied) {
      setIsCopied(true)
      toast.success("✓ Copied for WhatsApp")
      setTimeout(() => setIsCopied(false), 2500)

      // Record audit
      fetch("/api/whatsapp/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bolNumber: shipment.bolNumber,
          language,
          messageType,
          action: "copied",
          isInternal: !isCustomerSafe,
          recipientPhone,
          messageText: textToCopy,
        }),
      }).catch(() => {})
    } else {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleOpenWhatsApp = () => {
    const textToSend = customText || generatedMessage
    const link = buildWhatsAppDeepLink(recipientPhone, textToSend)
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
        recipientPhone,
        messageText: textToSend,
      }),
    }).catch(() => {})
  }

  const isRtl = language === "fa" || language === "ps" || language === "ur" || language === "fa_ps"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl border-slate-200">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>WhatsApp Shipment Update</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200">
                    {shipment.bolNumber}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {shipment.shipper.name} ➔ {shipment.consignee.name}
                </DialogDescription>
              </div>
            </div>
            {/* Customer Safe Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {isCustomerSafe ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400">Customer Safe</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-amber-700 dark:text-amber-400">Internal Mode</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Form Controls */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30">
          {/* Message Type */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">Message Type</Label>
            <Select value={messageType} onValueChange={(v) => setMessageType(v as WhatsAppMessageType)}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_update">Professional Update</SelectItem>
                <SelectItem value="short_update">Short Update</SelectItem>
                <SelectItem value="ops_short">Operations Short (1-Line)</SelectItem>
                <SelectItem value="truck_update">Truck Status</SelectItem>
                <SelectItem value="container_update">Container Status</SelectItem>
                <SelectItem value="document_update">Document Checklist</SelectItem>
                <SelectItem value="vessel_update">Vessel / Legs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600">Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as WhatsAppLanguage)}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <Globe className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
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
            <Label className="text-[11px] font-bold text-slate-600">Recipient Phone</Label>
            {recipients.length > 0 ? (
              <Select value={recipientPhone} onValueChange={setRecipientPhone}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <User className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
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
              <div className="h-8 px-2.5 rounded-md border border-slate-200 bg-slate-100 text-[11px] text-slate-500 flex items-center">
                No phone stored
              </div>
            )}
          </div>
        </div>

        {/* Preview and Edit Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Message Preview (Editable)</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCustomText(generatedMessage)}
              className="h-6 text-[11px] text-slate-500 hover:text-slate-800 gap-1 px-2"
              title="Reset to automatically generated message"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>

          {/* Phone-like Preview Card */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 shadow-inner">
            <Textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={8}
              dir={isRtl ? "rtl" : "ltr"}
              className="w-full text-xs font-mono bg-white/90 dark:bg-slate-950/80 border-emerald-200/60 focus-visible:ring-emerald-500 resize-y p-3 leading-relaxed shadow-2xs"
            />
          </div>

          {/* Mode Switch */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch
                id="safe-mode-toggle"
                checked={isCustomerSafe}
                onCheckedChange={setIsCustomerSafe}
              />
              <Label htmlFor="safe-mode-toggle" className="text-xs font-medium cursor-pointer text-slate-600">
                Customer Safe Mode (Hides rates & operational remarks)
              </Label>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {customText.length} characters
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              className={`h-8 px-4 text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                isCopied
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              }`}
            >
              {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? "✓ Copied" : "Copy Message"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="h-8 px-3 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
              <span>Open WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
