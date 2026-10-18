"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { PackagePlus, Truck, FileText, ArrowRight, Loader2 } from "lucide-react"

export function QuickShipmentModal({ open, onOpenChange, onSaved }: { open: boolean, onOpenChange: (open: boolean) => void, onSaved?: (bol: any) => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shipper: "",
    consignee: "",
    commodity: "",
    container: "",
    route: "",
    invoice: ""
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Create new draft BOL payload
      const payload = {
        id: "SKY-BOL-" + Date.now(), // Generate mock ID for client demo
        bol_number: "SKY-BOL-" + Date.now(),
        internal_bol_number: "SKY-BOL-" + Date.now(),
        issue_date: formData.date,
        shipper_name: formData.shipper,
        consignee_name: formData.consignee,
        cargo_description: formData.commodity,
        container_numbers: formData.container,
        notes_1: formData.route,
        bol_source: "LIVE",
        auto_created: true,
        completion_status: 50,
        status: "DRAFT"
      }

      // Add to local storage
      const existingStr = window.localStorage.getItem("sky-bol-browser-documents") || "[]"
      const existing = JSON.parse(existingStr)
      window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify([payload, ...existing]))
      
      // Dispatch refresh event
      window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: payload }))
      
      toast.success("Shipment Entry Saved", {
        description: `Draft BOL ${payload.bol_number} automatically created.`
      })
      
      if (onSaved) onSaved(payload)
      onOpenChange(false)
    } catch (err) {
      toast.error("Failed to save shipment entry.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
            <PackagePlus className="h-6 w-6 text-blue-600" />
            Quick Shipment Entry
          </DialogTitle>
          <DialogDescription>
            Enter basic shipment details. A BOL will automatically be created and linked.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={formData.date} onChange={e => handleChange("date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input placeholder="INV-2026-..." value={formData.invoice} onChange={e => handleChange("invoice", e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Shipper</Label>
            <Input placeholder="Enter Shipper Name" value={formData.shipper} onChange={e => handleChange("shipper", e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Consignee</Label>
            <Input placeholder="Enter Consignee Name" value={formData.consignee} onChange={e => handleChange("consignee", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Commodity</Label>
            <Input placeholder="e.g. Black Raisins" value={formData.commodity} onChange={e => handleChange("commodity", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Container Number / Type</Label>
            <Input placeholder="TCLU1234567 40'RF" value={formData.container} onChange={e => handleChange("container", e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Route</Label>
            <Input placeholder="Kandahar -> Bandar Abbas -> Jebel Ali" value={formData.route} onChange={e => handleChange("route", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <FileText className="h-4 w-4" /> Auto-creates BOL
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !formData.shipper} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Save & Create BOL
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
