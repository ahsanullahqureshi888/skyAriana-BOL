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
  UserPlus,
  Sparkles,
  Phone,
  MessageSquare,
  Globe,
  Truck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { LeadRecord, LeadSource, LeadStatus } from "@/lib/types/crm-sales"
import { crmSalesStore } from "@/lib/services/crm-sales-service"

interface LeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead?: LeadRecord | null
  quickMode?: boolean
  onSaved?: (lead: LeadRecord) => void
}

export function LeadModal({
  isOpen,
  onClose,
  lead,
  quickMode = false,
  onSaved,
}: LeadModalProps) {
  const [isQuick, setIsQuick] = useState(quickMode)
  const [formData, setFormData] = useState<Partial<LeadRecord>>({
    companyName: "",
    contactPerson: "",
    phone: "",
    whatsApp: "",
    email: "",
    country: "Afghanistan",
    city: "Kabul",
    source: "WHATSAPP",
    interestedService: "ROAD",
    tradeLane: "",
    commodity: "",
    expectedVolume: "",
    containerType: "40HC",
    notes: "",
    owner: "Bilal Ahmad (Senior Sales Lead)",
    status: "NEW",
    nextFollowUp: new Date(Date.now() + 86400000).toISOString().split("T")[0],
  })

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead })
      setIsQuick(false)
    } else {
      setIsQuick(quickMode)
      setFormData({
        companyName: "",
        contactPerson: "",
        phone: "",
        whatsApp: "",
        email: "",
        country: "Afghanistan",
        city: "Kabul",
        source: "WHATSAPP",
        interestedService: "ROAD",
        tradeLane: "",
        commodity: "",
        expectedVolume: "",
        containerType: "40HC",
        notes: "",
        owner: "Bilal Ahmad (Senior Sales Lead)",
        status: "NEW",
        nextFollowUp: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      })
    }
  }, [lead, quickMode, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.companyName?.trim()) {
      toast.error("Please enter company or prospect name.")
      return
    }

    if (!formData.phone?.trim() && !formData.email?.trim()) {
      toast.error("Please provide at least a phone number or email address.")
      return
    }

    try {
      const saved = crmSalesStore.saveLead(formData)
      toast.success(lead ? "Lead updated successfully." : `Lead ${saved.leadNumber} created.`)
      onSaved?.(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save lead.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-fuchsia-600" />
              <DialogTitle>
                {lead ? `Edit Lead: ${lead.leadNumber}` : isQuick ? "Quick Lead Intake" : "Register Sales Lead"}
              </DialogTitle>
            </div>
            {!lead && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7"
                onClick={() => setIsQuick(!isQuick)}
              >
                {isQuick ? "Switch to Full Mode" : "⚡ Switch to Quick Mode"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isQuick
              ? "Fast phone / WhatsApp inquiry intake. Minimal required fields to start following up immediately."
              : "Capture full commercial profile, trade lanes, equipment preferences, and assigned sales owner."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Lead Form Fields */}
          {isQuick ? (
            <div className="space-y-3 bg-fuchsia-500/5 border border-fuchsia-500/20 p-3.5 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Company / Trader Name *</Label>
                  <Input
                    placeholder="e.g. Nadir Pine Nuts LLC"
                    className="text-xs mt-1"
                    value={formData.companyName || ""}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Phone / WhatsApp Number *</Label>
                  <Input
                    placeholder="e.g. +93 79 912 3456"
                    className="text-xs mt-1 font-mono"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsApp: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Interested Route / Corridor</Label>
                  <Input
                    placeholder="e.g. Kabul to Guangzhou or Herat to BND"
                    className="text-xs mt-1"
                    value={formData.tradeLane || ""}
                    onChange={(e) => setFormData({ ...formData, tradeLane: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Next Follow-Up Date</Label>
                  <Input
                    type="date"
                    className="text-xs mt-1"
                    value={formData.nextFollowUp || ""}
                    onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Initial Inquired Requirements</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Needs 40RF reefer or air freight rate for 4,000 kg nuts."
                  className="text-xs mt-1"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            // Full Lead Form
            <div className="space-y-4">
              {/* Grid 1: Basic Identifiers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Company Name *</Label>
                  <Input
                    placeholder="e.g. Afghan Agro Export Corp"
                    className="text-xs mt-1"
                    value={formData.companyName || ""}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
                  <Label className="text-xs font-semibold">Lead Source *</Label>
                  <select
                    className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                  >
                    <option value="WHATSAPP">WhatsApp Message</option>
                    <option value="PHONE">Direct Phone Call</option>
                    <option value="REFERRAL">Customer Referral</option>
                    <option value="WALK_IN">Office Walk-In</option>
                    <option value="EMAIL">Email Inquiry</option>
                    <option value="WEBSITE">Website Form</option>
                    <option value="AGENT">Border / Port Agent</option>
                    <option value="SALES_VISIT">Sales Rep Field Visit</option>
                    <option value="EXISTING_CUSTOMER">Existing Customer Expansion</option>
                    <option value="UNKNOWN">Unknown Source</option>
                  </select>
                </div>
              </div>

              {/* Grid 2: Communication & Location */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Phone Number *</Label>
                  <Input
                    placeholder="+93 ..."
                    className="text-xs mt-1 font-mono"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">WhatsApp Number</Label>
                  <Input
                    placeholder="+93 ..."
                    className="text-xs mt-1 font-mono"
                    value={formData.whatsApp || ""}
                    onChange={(e) => setFormData({ ...formData, whatsApp: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="info@..."
                    className="text-xs mt-1"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">City & Country</Label>
                  <Input
                    placeholder="Kabul, Afghanistan"
                    className="text-xs mt-1"
                    value={`${formData.city || "Kabul"}, ${formData.country || "Afghanistan"}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(",")
                      setFormData({
                        ...formData,
                        city: parts[0]?.trim() || "Kabul",
                        country: parts[1]?.trim() || "Afghanistan",
                      })
                    }}
                  />
                </div>
              </div>

              {/* Grid 3: Cargo & Logistics Scope */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border">
                <div>
                  <Label className="text-xs font-semibold">Service Mode</Label>
                  <select
                    className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                    value={formData.interestedService}
                    onChange={(e) => setFormData({ ...formData, interestedService: e.target.value as any })}
                  >
                    <option value="ROAD">Road Freight Trucking</option>
                    <option value="MULTIMODAL">Multimodal (Sea + Road)</option>
                    <option value="REEFER">Reefer Cold-Chain</option>
                    <option value="AIR">Air Cargo</option>
                    <option value="SEA">Ocean Container</option>
                    <option value="DRY">Dry Bulk / General</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Trade Lane</Label>
                  <Input
                    placeholder="e.g. Herat to Nhava Sheva"
                    className="text-xs mt-1"
                    value={formData.tradeLane || ""}
                    onChange={(e) => setFormData({ ...formData, tradeLane: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Commodity</Label>
                  <Input
                    placeholder="e.g. Saffron, Raisins, Marble"
                    className="text-xs mt-1"
                    value={formData.commodity || ""}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Equipment / Volume</Label>
                  <Input
                    placeholder="e.g. 40RF / 2 units per month"
                    className="text-xs mt-1"
                    value={formData.expectedVolume || ""}
                    onChange={(e) => setFormData({ ...formData, expectedVolume: e.target.value })}
                  />
                </div>
              </div>

              {/* Grid 4: Status & Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Lead Status</Label>
                  <select
                    className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                  >
                    <option value="NEW">New Lead</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFYING">Qualifying Requirements</option>
                    <option value="QUALIFIED">Qualified (Ready for Quote)</option>
                    <option value="UNQUALIFIED">Unqualified</option>
                    <option value="CONVERTED">Converted to Customer</option>
                    <option value="CLOSED">Closed / Inactive</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Assigned Sales Owner</Label>
                  <Input
                    className="text-xs mt-1"
                    value={formData.owner || ""}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Next Follow-Up</Label>
                  <Input
                    type="date"
                    className="text-xs mt-1"
                    value={formData.nextFollowUp || ""}
                    onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs font-semibold">Commercial Discussion Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="Record customer preferences, target transit times, or specific customs border requirements."
                  className="text-xs mt-1"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
              {lead ? "Save Changes" : isQuick ? "⚡ Save Quick Lead" : "Save Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
