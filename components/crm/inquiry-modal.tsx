"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  FileQuestion,
  Calculator,
  MessageSquare,
  Thermometer,
  Truck,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { SalesInquiryRecord, InquiryStatus, ServiceMode } from "@/lib/types/crm-sales"
import { crmSalesStore } from "@/lib/services/crm-sales-service"

interface InquiryModalProps {
  isOpen: boolean
  onClose: () => void
  inquiry?: SalesInquiryRecord | null
  onSaved?: (inquiry: SalesInquiryRecord) => void
  onQuoteGenerated?: (inquiry: SalesInquiryRecord, quoteNumber: string) => void
}

export function InquiryModal({
  isOpen,
  onClose,
  inquiry,
  onSaved,
  onQuoteGenerated,
}: InquiryModalProps) {
  const [formData, setFormData] = useState<Partial<SalesInquiryRecord>>({
    customerName: "",
    contactPerson: "",
    contactPhone: "",
    inquiryDate: new Date().toISOString().split("T")[0],
    serviceMode: "ROAD",
    origin: "Kabul ICD",
    destination: "Bandar Abbas Port",
    commodity: "General Merchandise",
    containerType: "40HC",
    containerQuantity: 1,
    requestedService: "FULL_WAY",
    status: "NEW",
    owner: "Bilal Ahmad (Senior Sales Lead)",
    source: "WHATSAPP",
    notes: "",
  })

  useEffect(() => {
    if (inquiry) {
      setFormData({ ...inquiry })
    } else {
      setFormData({
        customerName: "",
        contactPerson: "",
        contactPhone: "",
        inquiryDate: new Date().toISOString().split("T")[0],
        serviceMode: "ROAD",
        origin: "Kabul ICD",
        destination: "Bandar Abbas Port",
        commodity: "General Merchandise",
        containerType: "40HC",
        containerQuantity: 1,
        requestedService: "FULL_WAY",
        status: "NEW",
        owner: "Bilal Ahmad (Senior Sales Lead)",
        source: "WHATSAPP",
        notes: "",
      })
    }
  }, [inquiry, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName?.trim()) {
      toast.error("Please enter customer name.")
      return
    }

    try {
      const saved = crmSalesStore.saveInquiry(formData)
      toast.success(inquiry ? "Inquiry updated successfully." : `Inquiry ${saved.inquiryNumber} registered.`)
      onSaved?.(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save inquiry.")
    }
  }

  const handleGenerateQuote = () => {
    if (!formData.customerName?.trim()) {
      toast.error("Please enter customer name before generating quotation.")
      return
    }

    try {
      // 1. Save or update inquiry first
      const savedInq = crmSalesStore.saveInquiry(formData)
      // 2. Generate canonical quotation in Rates & Quotations engine
      const res = crmSalesStore.createQuoteFromInquiry(savedInq.id, 4800, 4100, "USD")

      toast.success(`Quotation ${res.quotationNumber} generated directly in Rates & Quotations module!`)
      onQuoteGenerated?.(res.inquiry, res.quotationNumber)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quotation.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-amber-500" />
            <DialogTitle>
              {inquiry ? `Edit Inquiry: ${inquiry.inquiryNumber}` : "Log Customer Freight Inquiry"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Capture customer trade inquiries and convert directly into formal Rates & Quotations records without dual calculation engines.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Customer & Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Customer / Trader *</Label>
              <Input
                placeholder="e.g. Ariana Saffron & Spices"
                className="text-xs mt-1"
                value={formData.customerName || ""}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Contact Person</Label>
              <Input
                placeholder="e.g. Haji Sultan"
                className="text-xs mt-1"
                value={formData.contactPerson || ""}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Phone / WhatsApp</Label>
              <Input
                placeholder="e.g. +93 79 900 1122"
                className="text-xs mt-1 font-mono"
                value={formData.contactPhone || ""}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Transport Route & Service Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold">Service Mode *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={formData.serviceMode}
                onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value as ServiceMode })}
              >
                <option value="ROAD">Road Freight (Trucking)</option>
                <option value="MULTIMODAL">Multimodal (Sea + Road)</option>
                <option value="REEFER">Reefer Temperature Controlled</option>
                <option value="AIR">Air Cargo</option>
                <option value="SEA">Ocean Container</option>
                <option value="DRY">Dry Bulk</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Origin / Loading Point *</Label>
              <Input
                className="text-xs mt-1"
                value={formData.origin || ""}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Destination / Delivery *</Label>
              <Input
                className="text-xs mt-1"
                value={formData.destination || ""}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Cargo & Equipment Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold">Commodity *</Label>
              <Input
                className="text-xs mt-1"
                value={formData.commodity || ""}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Equipment Type</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={formData.containerType}
                onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
              >
                <option value="40HC">40' High Cube Dry (40HC)</option>
                <option value="40RF">40' Reefer Container (40RF)</option>
                <option value="20GP">20' General Purpose (20GP)</option>
                <option value="20RF">20' Reefer Container (20RF)</option>
                <option value="OPEN_TOP">Open Top Container</option>
                <option value="FLATBED_TRUCK">Open Flatbed Truck</option>
                <option value="AIR_CARGO">Air Cargo Pallet / ULD</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Container / Unit Qty</Label>
              <Input
                type="number"
                min="1"
                className="text-xs mt-1 font-bold"
                value={formData.containerQuantity ?? 1}
                onChange={(e) => setFormData({ ...formData, containerQuantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Target Delivery Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={formData.requestedDeliveryDate || ""}
                onChange={(e) => setFormData({ ...formData, requestedDeliveryDate: e.target.value })}
              />
            </div>
          </div>

          {/* Reefer Details (if applicable) */}
          {(formData.serviceMode === "REEFER" || formData.containerType === "40RF" || formData.containerType === "20RF") && (
            <div className="border border-blue-500/20 bg-blue-500/5 p-3 rounded-lg grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Thermometer className="h-4 w-4" />
                  Required Temperature
                </Label>
                <Input
                  placeholder="e.g. +2°C to +8°C or -18°C"
                  className="text-xs mt-1"
                  value={formData.temperature || ""}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Reefer Equipment Scope</Label>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Includes generator clip-on genset fuel and border cross-dock temperature inspection protocols.
                </div>
              </div>
            </div>
          )}

          {/* Operational Notes */}
          <div>
            <Label className="text-xs font-semibold">Special Customer Instructions / Notes</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Free days required at destination port, specific customs clearance border requested, etc."
              className="text-xs mt-1"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-2 flex justify-between sm:justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs border-indigo-500/40 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              onClick={handleGenerateQuote}
            >
              <Calculator className="h-3.5 w-3.5 mr-1.5" />
              Generate Formal Quotation
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                {inquiry ? "Save Inquiry" : "Register Inquiry"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
