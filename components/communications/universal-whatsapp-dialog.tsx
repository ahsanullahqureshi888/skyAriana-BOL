"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Copy,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Eye,
  Shield,
  Send,
  Sparkles,
  Phone,
} from "lucide-react"
import { toast } from "sonner"
import type {
  MessageLanguage,
  MessageLengthMode,
  TemplateCategory,
} from "@/lib/types/communication"

export interface UniversalWhatsAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType?: "BOL" | "INVOICE" | "CUSTOMER"
  entityId?: string
  initialCategory?: TemplateCategory
  recipientPhone?: string
  recipientName?: string
}

export function UniversalWhatsAppDialog({
  open,
  onOpenChange,
  entityType = "BOL",
  entityId = "",
  initialCategory = "Shipment Created",
  recipientPhone = "",
  recipientName = "",
}: UniversalWhatsAppDialogProps) {
  const [language, setLanguage] = useState<MessageLanguage>("en")
  const [lengthMode, setLengthMode] = useState<MessageLengthMode>("STANDARD")
  const [category, setCategory] = useState<TemplateCategory>(initialCategory)
  const [isCustomerSafe, setIsCustomerSafe] = useState(true)
  const [customRemark, setCustomRemark] = useState("")
  const [phone, setPhone] = useState(recipientPhone)
  const [generatedText, setGeneratedText] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Synchronize initial state
  useEffect(() => {
    if (initialCategory) setCategory(initialCategory)
    if (recipientPhone) setPhone(recipientPhone)
  }, [initialCategory, recipientPhone])

  const generateMessage = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const res = await fetch("/api/communications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: entityType === "INVOICE" ? "PAYMENT_REMINDER" : "SHIPMENT_STATUS",
          entityType,
          entityId,
          category,
          language,
          lengthMode,
          isCustomerSafe,
          customRemark,
        }),
      })

      const data = await res.json()
      if (data.success && data.text) {
        setGeneratedText(data.text)
        if (!phone && data.context?.recipient_phone) {
          setPhone(data.context.recipient_phone)
        }
      } else {
        toast.error(data.error || "Failed to generate message")
      }
    } catch (err: any) {
      toast.error(err.message || "Error communicating with server")
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, category, language, lengthMode, isCustomerSafe, customRemark, phone])

  useEffect(() => {
    if (open && entityId) {
      generateMessage()
    }
  }, [open, entityId, generateMessage])

  const logStatus = async (status: "COPIED" | "OPENED_IN_WHATSAPP") => {
    try {
      await fetch("/api/communications/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communication_type: entityType === "INVOICE" ? "PAYMENT_REMINDER" : "SHIPMENT_STATUS",
          channel: "WHATSAPP",
          entity_type: entityType,
          entity_id: entityId,
          recipient_name: recipientName || "Customer",
          recipient_phone: phone || "",
          language,
          message_text: generatedText,
          generated_by: "Current Staff",
          sent_status: status,
        }),
      })
    } catch {
      // non-critical audit log
    }
  }

  const handleCopy = async () => {
    if (!generatedText) return
    try {
      await navigator.clipboard.writeText(generatedText)
      setCopied(true)
      toast.success("Message copied to clipboard! Ready to paste into WhatsApp.")
      await logStatus("COPIED")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Failed to copy text to clipboard")
    }
  }

  const handleOpenWhatsApp = async () => {
    if (!generatedText) return
    const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")
    const encodedMsg = encodeURIComponent(generatedText)
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`

    window.open(url, "_blank")
    await logStatus("OPENED_IN_WHATSAPP")
    toast.success("WhatsApp opened with pre-filled message.")
  }

  const isRtl = language === "ps" || language === "fa" || language === "ur"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                  WhatsApp Communication Center
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                    Live Data
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Target: <strong className="text-slate-200">{entityId}</strong> ({entityType})
                </DialogDescription>
              </div>
            </div>
            {isCustomerSafe && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] gap-1">
                <Shield className="h-3 w-3" /> Customer Safe (Anti-Leak)
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 pb-1 border-y border-slate-800">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as MessageLanguage)}
              className="w-full text-xs rounded-md bg-slate-800 border-slate-700 text-slate-200 p-1.5 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="en">English (Official)</option>
              <option value="ps">پښتو (Pashto)</option>
              <option value="fa">دری / فارسی (Dari)</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Format Length</label>
            <select
              value={lengthMode}
              onChange={(e) => setLengthMode(e.target.value as MessageLengthMode)}
              className="w-full text-xs rounded-md bg-slate-800 border-slate-700 text-slate-200 p-1.5 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="STANDARD">Standard WhatsApp</option>
              <option value="SHORT">Short (Single Line)</option>
              <option value="DETAILED">Detailed Breakdown</option>
            </select>
          </div>

          {entityType !== "INVOICE" && (
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Status Milestone</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className="w-full text-xs rounded-md bg-slate-800 border-slate-700 text-slate-200 p-1.5 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Shipment Created">Shipment Created</option>
                <option value="Truck Departed">Truck Departed</option>
                <option value="At Border">At Border Station</option>
                <option value="Border Cleared">Border Cleared</option>
                <option value="Arrived Port">Arrived at Port</option>
                <option value="Vessel Departed">Vessel Departed</option>
                <option value="At Sea">At Sea Update</option>
                <option value="Arrived Destination">Arrived Destination</option>
                <option value="Delivered">Delivered</option>
                <option value="ETA Changed">ETA Changed</option>
                <option value="Delay Notice">Delay Notice</option>
                <option value="Document Ready">Document Ready</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Recipient Phone</label>
            <div className="relative">
              <Phone className="h-3 w-3 absolute left-2 top-2.5 text-slate-500" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+93 7..."
                className="h-8 pl-7 text-xs bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Custom Remark & Toggles */}
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between text-xs text-slate-400">
          <Input
            value={customRemark}
            onChange={(e) => setCustomRemark(e.target.value)}
            placeholder="Add optional note/remark at bottom (e.g. Please bring original gate pass)..."
            className="h-7 text-xs bg-slate-800/80 border-slate-700 text-slate-200 flex-1"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={isCustomerSafe}
                onChange={(e) => setIsCustomerSafe(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
              />
              <span className="text-[11px]">Hide Internal Costs</span>
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateMessage}
              disabled={loading}
              className="h-7 text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Live Message Preview Box */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1">
              <Eye className="h-3 w-3 text-slate-400" /> Live Message Preview
            </span>
            <span className="text-[10px] text-slate-500">
              {generatedText.length} characters
            </span>
          </div>

          <Textarea
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            dir={isRtl ? "rtl" : "ltr"}
            rows={10}
            className={`w-full font-mono text-xs rounded-xl bg-slate-950/80 border-slate-800 text-slate-200 p-3 leading-relaxed focus:ring-1 focus:ring-emerald-500 ${
              isRtl ? "text-right" : "text-left"
            }`}
            placeholder="Generating live message..."
          />
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopy}
              disabled={!generatedText}
              variant="outline"
              size="sm"
              className={`border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/40 text-xs gap-1.5 ${
                copied ? "bg-emerald-950/60" : ""
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Text
                </>
              )}
            </Button>

            <Button
              onClick={handleOpenWhatsApp}
              disabled={!generatedText}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Open WhatsApp
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
