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
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import {
  OpportunityRecord,
  OpportunityStage,
  OpportunityStatus,
} from "@/lib/types/crm-sales"
import { crmSalesStore } from "@/lib/services/crm-sales-service"

interface OpportunityModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity?: OpportunityRecord | null
  onSaved?: (opportunity: OpportunityRecord) => void
}

export function OpportunityModal({
  isOpen,
  onClose,
  opportunity,
  onSaved,
}: OpportunityModalProps) {
  const [formData, setFormData] = useState<Partial<OpportunityRecord>>({
    customerName: "",
    title: "",
    tradeLane: "Herat to Bandar Abbas",
    service: "FULL_WAY",
    commodity: "General Cargo",
    equipment: "1 × 40HC",
    expectedVolume: "1 container",
    expectedRevenue: 10000,
    currency: "USD",
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    owner: "Bilal Ahmad (Senior Sales Lead)",
    stage: "NEW_INQUIRY",
    status: "ACTIVE",
    nextAction: "Issue quotation from standard route tariff",
    notes: "",
  })

  useEffect(() => {
    if (opportunity) {
      setFormData({ ...opportunity })
    } else {
      setFormData({
        customerName: "",
        title: "",
        tradeLane: "Herat to Bandar Abbas",
        service: "FULL_WAY",
        commodity: "General Cargo",
        equipment: "1 × 40HC",
        expectedVolume: "1 container",
        expectedRevenue: 10000,
        currency: "USD",
        probability: 50,
        expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        owner: "Bilal Ahmad (Senior Sales Lead)",
        stage: "NEW_INQUIRY",
        status: "ACTIVE",
        nextAction: "Issue quotation from standard route tariff",
        notes: "",
      })
    }
  }, [opportunity, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName?.trim() || !formData.title?.trim()) {
      toast.error("Please enter both customer name and opportunity title.")
      return
    }

    try {
      const saved = crmSalesStore.saveOpportunity(formData)
      toast.success(opportunity ? "Opportunity updated successfully." : `Opportunity ${saved.opportunityNumber} created.`)
      onSaved?.(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save opportunity.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <DialogTitle>
              {opportunity ? `Edit Opportunity: ${opportunity.opportunityNumber}` : "Create Sales Opportunity"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict Standard: Opportunity value represents Sky Ariana freight service revenue. Do not enter commercial cargo goods value.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Grid 1: Basic Classification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Customer / Account *</Label>
              <Input
                placeholder="e.g. Ariana Saffron & Spices"
                className="text-xs mt-1"
                value={formData.customerName || ""}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Opportunity Title *</Label>
              <Input
                placeholder="e.g. Annual India Reefer Export Deal"
                className="text-xs mt-1"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Grid 2: Routing & Cargo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold">Trade Lane / Corridor</Label>
              <Input
                className="text-xs mt-1"
                value={formData.tradeLane || ""}
                onChange={(e) => setFormData({ ...formData, tradeLane: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Service Type</Label>
              <Input
                className="text-xs mt-1"
                value={formData.service || ""}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Equipment / Volume</Label>
              <Input
                className="text-xs mt-1"
                value={formData.equipment || ""}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              />
            </div>
          </div>

          {/* Grid 3: Financial Value & Pipeline Probability */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Expected Freight Revenue *</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1 font-bold"
                value={formData.expectedRevenue ?? 0}
                onChange={(e) => setFormData({ ...formData, expectedRevenue: Number(e.target.value) })}
                required
              />
              <span className="text-[10px] text-muted-foreground">Sky Ariana freight revenue only</span>
            </div>
            <div>
              <Label className="text-xs font-semibold">Currency *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="AFN">AFN (؋)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Internal Pipeline %</span>
                <span className="text-[10px] text-muted-foreground font-normal">User Estimate</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                className="text-xs mt-1"
                value={formData.probability ?? 50}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Grid 4: Stage & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Pipeline Stage *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as OpportunityStage })}
              >
                <option value="NEW_INQUIRY">New Inquiry</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="RATE_REQUESTED">Rate Requested</option>
                <option value="QUOTATION_PREPARED">Quotation Prepared</option>
                <option value="QUOTATION_SENT">Quotation Sent</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="CUSTOMER_CONFIRMATION">Customer Confirmation</option>
                <option value="WON">Won Business</option>
                <option value="LOST">Lost</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Assigned Sales Lead</Label>
              <Input
                className="text-xs mt-1"
                value={formData.owner || ""}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Expected Close Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={formData.expectedCloseDate || ""}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              />
            </div>
          </div>

          {/* Next Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold">Next Action Item *</Label>
              <Input
                placeholder="e.g. Follow up on tariff quotation and verify trailer availability"
                className="text-xs mt-1"
                value={formData.nextAction || ""}
                onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Next Action Target Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={formData.nextActionDate || ""}
                onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <Label className="text-xs font-semibold">Opportunity Notes</Label>
            <Textarea
              rows={2}
              placeholder="Commercial background, competitor quotes, customer volume seasonality."
              className="text-xs mt-1"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {opportunity ? "Save Changes" : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
