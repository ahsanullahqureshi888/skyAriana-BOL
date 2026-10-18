"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Eye, FileText, Globe, Loader2, MessageCircle, Ship, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import {
  buildWhatsAppBilingualMessage,
  buildWhatsAppBOLMessage,
  buildWhatsAppQuickMessage,
  buildWhatsAppShipmentUpdate,
} from "@/lib/utils/bol-whatsapp-formatter"

type CopyMode = "full" | "update" | "bilingual" | "quick"

function copyWithFallback(message: string): void {
  const textarea = document.createElement("textarea")
  textarea.value = message
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  const selection = document.getSelection()
  const previousRange = selection?.rangeCount ? selection.getRangeAt(0) : null
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  try {
    textarea.select()
    if (!document.execCommand("copy")) throw new Error("Clipboard copy failed")
  } finally {
    textarea.remove()
    selection?.removeAllRanges()
    if (previousRange) selection?.addRange(previousRange)
    activeElement?.focus()
  }
}

export function CopyWhatsAppButton({ bol }: { bol: BillOfLadingFormData }) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied">("idle")
  const [previewMode, setPreviewMode] = useState<CopyMode | null>(null)
  const [customMessage, setCustomMessage] = useState("")
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  const messageFor = (mode: CopyMode): string => {
    switch (mode) {
      case "update": return buildWhatsAppShipmentUpdate(bol)
      case "bilingual": return buildWhatsAppBilingualMessage(bol)
      case "quick": return buildWhatsAppQuickMessage(bol)
      case "full": default: return buildWhatsAppBOLMessage(bol)
    }
  }

  // Update the editable textarea whenever the preview mode changes
  useEffect(() => {
    if (previewMode) {
      setCustomMessage(messageFor(previewMode) || "No BOL information available")
    }
  }, [previewMode, bol])

  const handleCopy = async (mode: CopyMode | "custom") => {
    if (status === "copying") return
    const message = mode === "custom" ? customMessage : messageFor(mode as CopyMode)
    if (!message.trim()) {
      toast.error("No BOL information available")
      return
    }
    setStatus("copying")
    try {
      if (!navigator.clipboard?.writeText) {
        copyWithFallback(message)
      } else {
        try {
          await navigator.clipboard.writeText(message)
        } catch {
          copyWithFallback(message)
        }
      }
      setStatus("copied")
      setPreviewMode(null)
      const labelMap: Record<string, string> = {
        full: "Full BOL copied for WhatsApp",
        update: "Shipment update copied for WhatsApp",
        bilingual: "Bilingual update copied for WhatsApp",
        quick: "Quick dispatch copied for WhatsApp",
        custom: "Customized message copied for WhatsApp",
      }
      toast.success(labelMap[mode] || "Copied for WhatsApp")
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("idle")
      toast.error("Could not copy message")
    }
  }

  return (
    <>
      <div className="inline-flex items-center rounded-lg shadow-2xs">
        <Button
          type="button" size="sm" variant="outline" onClick={() => void handleCopy("update")}
          disabled={status === "copying"}
          className="h-7.5 px-2.5 rounded-r-none border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs cursor-pointer gap-1.5"
          title="Copy shipment update as WhatsApp message"
          aria-label="Copy shipment update as WhatsApp message"
        >
          {status === "copying" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
            status === "copied" ? <Check className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{status === "copied" ? "Copied" : status === "copying" ? "Copying..." : "Copy WhatsApp"}</span>
          <span className="sm:hidden">{status === "copied" ? "Copied" : status === "copying" ? "Copying..." : "WhatsApp"}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" disabled={status === "copying"}
              className="h-7.5 w-7 p-0 rounded-l-none border-l-0 border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-800 cursor-pointer"
              title="WhatsApp message options" aria-label="WhatsApp message options">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => void handleCopy("update")} className="gap-2.5 cursor-pointer">
              <Ship className="h-4 w-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs">Shipment Update</span>
                <span className="text-[10px] text-muted-foreground">Clean executive format with emojis</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleCopy("bilingual")} className="gap-2.5 cursor-pointer">
              <Globe className="h-4 w-4 text-amber-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs">Bilingual (EN / دری)</span>
                <span className="text-[10px] text-muted-foreground">Dual-language for Afghan border</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleCopy("quick")} className="gap-2.5 cursor-pointer">
              <Zap className="h-4 w-4 text-purple-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs">Quick Dispatch</span>
                <span className="text-[10px] text-muted-foreground">Ultra-compact for drivers</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleCopy("full")} className="gap-2.5 cursor-pointer">
              <FileText className="h-4 w-4 text-emerald-600" />
              <div className="flex flex-col">
                <span className="font-medium text-xs">Full BOL Document</span>
                <span className="text-[10px] text-muted-foreground">Complete parties, rent, route & vessel</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPreviewMode("update")} className="gap-2 cursor-pointer">
              <Eye className="h-4 w-4" />Preview All Formats
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={previewMode !== null} onOpenChange={open => { if (!open) setPreviewMode(null) }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl p-0 overflow-hidden border-0 shadow-2xl bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xl font-sans">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-black tracking-tight m-0">WhatsApp Editor</DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                  Review or edit the message before copying to the clipboard.
                </DialogDescription>
              </div>
            </div>
            {/* Format Toggles */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-black/20 self-start sm:self-auto shrink-0 shadow-inner" role="group">
              <button type="button" onClick={() => setPreviewMode("update")} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${previewMode === "update" ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
                <Ship className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Update</span>
              </button>
              <button type="button" onClick={() => setPreviewMode("bilingual")} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${previewMode === "bilingual" ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
                <Globe className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Bilingual</span>
              </button>
              <button type="button" onClick={() => setPreviewMode("quick")} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${previewMode === "quick" ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
                <Zap className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Quick</span>
              </button>
              <button type="button" onClick={() => setPreviewMode("full")} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${previewMode === "full" ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
                <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Full BOL</span>
              </button>
            </div>
          </div>

          {/* Textarea Area */}
          <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 relative">
            <div className="absolute top-8 left-8 hidden sm:flex items-end justify-end pointer-events-none opacity-5">
               <MessageCircle className="w-64 h-64 text-emerald-900" />
            </div>
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/30 transition-shadow">
              <textarea 
                className="w-full h-[45vh] min-h-[300px] resize-y p-5 text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-mono bg-transparent focus:outline-none placeholder:text-slate-400" 
                dir="auto"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your WhatsApp message here..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setPreviewMode(null)}
              className="rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              disabled={status === "copying"} 
              onClick={() => void handleCopy("custom")}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 gap-2"
            >
              {status === "copying" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {status === "copying" ? "Copying..." : "Copy Edited Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

