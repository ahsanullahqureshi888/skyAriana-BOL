"use client"

import { useState } from "react"
import { Check, Lock, Save, Settings, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { WhatsAppDateFormat, WhatsAppLanguage, WhatsAppSettings } from "@/lib/whatsapp/message-types"

interface WhatsAppSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: WhatsAppSettings
  onSave: (updated: WhatsAppSettings) => void
}

export function WhatsAppSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSave,
}: WhatsAppSettingsDialogProps) {
  const [formData, setFormData] = useState<WhatsAppSettings>({ ...settings })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast.success("WhatsApp settings saved successfully")
        onSave(formData)
        onClose()
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" />
            <DialogTitle className="text-sm font-bold">WhatsApp Operations Settings</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Configure header components, corporate signature, privacy options, and default formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs py-2">
          {/* Company Identity */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Corporate Branding & Signature
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Office Phone</Label>
                <Input
                  value={formData.companyPhone || ""}
                  onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  placeholder="+93 799 000 000"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-[11px] font-bold text-slate-600">Closing Signature</Label>
              <Textarea
                value={formData.signatureText}
                onChange={(e) => setFormData({ ...formData, signatureText: e.target.value })}
                rows={2}
                className="text-xs font-mono bg-white resize-none"
              />
            </div>
          </div>

          {/* Regional & Date Formatting */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Language & Date Preferences
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Default Language</Label>
                <Select
                  value={formData.defaultLanguage}
                  onValueChange={(v) => setFormData({ ...formData, defaultLanguage: v as WhatsAppLanguage })}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fa">Persian / Dari (فارسی)</SelectItem>
                    <SelectItem value="ps">Pashto (پښتو)</SelectItem>
                    <SelectItem value="ur">Urdu (اردو)</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600">Date Style</Label>
                <Select
                  value={formData.defaultDateFormat}
                  onValueChange={(v) => setFormData({ ...formData, defaultDateFormat: v as WhatsAppDateFormat })}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20 Sep 2026">20 Sep 2026</SelectItem>
                    <SelectItem value="20/09/2026">20/09/2026</SelectItem>
                    <SelectItem value="September 20, 2026">September 20, 2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Header Inclusion Toggles */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Message Header & Field Visibility
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                <Label htmlFor="inc-company" className="text-xs cursor-pointer">Include Company Name</Label>
                <Switch
                  id="inc-company"
                  checked={formData.includeCompanyName}
                  onCheckedChange={(c) => setFormData({ ...formData, includeCompanyName: c })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                <Label htmlFor="inc-bol" className="text-xs cursor-pointer">Include BOL Reference</Label>
                <Switch
                  id="inc-bol"
                  checked={formData.includeBol}
                  onCheckedChange={(c) => setFormData({ ...formData, includeBol: c })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                <Label htmlFor="inc-shipper" className="text-xs cursor-pointer">Include Shipper Name</Label>
                <Switch
                  id="inc-shipper"
                  checked={formData.includeShipper}
                  onCheckedChange={(c) => setFormData({ ...formData, includeShipper: c })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                <Label htmlFor="inc-container" className="text-xs cursor-pointer">Include Container/Truck</Label>
                <Switch
                  id="inc-container"
                  checked={formData.includeContainer}
                  onCheckedChange={(c) => setFormData({ ...formData, includeContainer: c })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                <Label htmlFor="inc-dest" className="text-xs cursor-pointer">Include Destination</Label>
                <Switch
                  id="inc-dest"
                  checked={formData.includeDestination}
                  onCheckedChange={(c) => setFormData({ ...formData, includeDestination: c })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                <Label htmlFor="inc-sig" className="text-xs cursor-pointer">Include Signature</Label>
                <Switch
                  id="inc-sig"
                  checked={formData.includeSignature}
                  onCheckedChange={(c) => setFormData({ ...formData, includeSignature: c })}
                />
              </div>
            </div>
          </div>

          {/* Privacy & Audit Settings (Requirement 50) */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Privacy & History Storage
            </span>
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
              <div className="space-y-0.5">
                <Label htmlFor="store-msg-toggle" className="text-xs font-bold cursor-pointer text-slate-800">
                  Store Message Text in History
                </Label>
                <p className="text-[11px] text-slate-500">
                  When enabled, the exact generated message copy is saved with the audit record. Default is OFF for confidentiality.
                </p>
              </div>
              <Switch
                id="store-msg-toggle"
                checked={formData.storeMessageTextInHistory}
                onCheckedChange={(c) => setFormData({ ...formData, storeMessageTextInHistory: c })}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Preferences</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
