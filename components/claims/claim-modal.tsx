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
import {
  DollarSign,
  FileCheck,
  Scale,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  ClaimRecord,
  ClaimType,
  ClaimStatus,
  IncidentRecord,
} from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface ClaimModalProps {
  isOpen: boolean
  onClose: () => void
  claim?: ClaimRecord | null
  initialIncident?: IncidentRecord | null
  onSaved?: (claim: ClaimRecord) => void
}

export function ClaimModal({
  isOpen,
  onClose,
  claim,
  initialIncident,
  onSaved,
}: ClaimModalProps) {
  const store = IncidentClaimsStore.getInstance()
  const incidents = store.getIncidents()

  const [formData, setFormData] = useState<Partial<ClaimRecord>>({
    claimType: "CUSTOMER_CLAIM",
    claimStatus: "OPEN",
    currency: "USD",
    claimAmount: 0,
    acceptedAmount: 0,
    settlementAmount: 0,
    recoveredAmount: 0,
    responsibilityStatus: "NOT_ASSESSED",
  })

  useEffect(() => {
    if (claim) {
      setFormData({ ...claim })
    } else {
      const inc = initialIncident || (incidents.length > 0 ? incidents[0] : null)
      setFormData({
        claimType: "CUSTOMER_CLAIM",
        claimStatus: "OPEN",
        incidentId: inc ? inc.id : "",
        incidentNumber: inc ? inc.incidentNumber : "",
        customerName: inc ? inc.customerName : "",
        claimant: inc ? inc.customerName : "Claimant Name",
        claimAgainst: "Sky Ariana Limited / Transporter",
        claimDate: new Date().toISOString().split("T")[0],
        claimAmount: inc ? inc.estimatedValueAffected : 1000,
        currency: inc ? inc.currency : "USD",
        acceptedAmount: 0,
        settlementAmount: 0,
        recoveredAmount: 0,
        claimBasisDescription: inc
          ? `Demand for indemnity regarding incident ${inc.incidentNumber} (${inc.description.slice(0, 100)}...)`
          : "",
        assignedTo: "Karim Dad (Claims Lead)",
        responseDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        responsibilityStatus: "NOT_ASSESSED",
        notes: "",
      })
    }
  }, [claim, initialIncident, isOpen])

  const handleIncidentSelect = (incidentId: string) => {
    const inc = incidents.find((i) => i.id === incidentId)
    if (inc) {
      setFormData((prev) => ({
        ...prev,
        incidentId: inc.id,
        incidentNumber: inc.incidentNumber,
        customerName: inc.customerName,
        claimAmount: inc.estimatedValueAffected || prev.claimAmount,
        currency: inc.currency || prev.currency,
        claimBasisDescription: prev.claimBasisDescription || `Commercial claim for incident ${inc.incidentNumber}`,
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.claimant || formData.claimant.trim().length === 0) {
      toast.error("Please enter claimant name.")
      return
    }

    if (!formData.claimAmount || Number(formData.claimAmount) <= 0) {
      toast.error("Please enter a valid claim amount greater than 0.")
      return
    }

    try {
      const saved = store.saveClaim(formData)
      toast.success(claim ? "Claim updated successfully." : `Claim ${saved.claimNumber} registered.`)
      onSaved?.(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save claim.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-500" />
            <DialogTitle>{claim ? `Edit Claim File: ${claim.claimNumber}` : "Register Commercial Claim Demand"}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            A Claim is a commercial/financial demand. Responsibility defaults to NOT_ASSESSED until formally evaluated by an authorized officer.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Incident Link */}
          <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-primary" />
              Link to Operational Incident
            </Label>
            <select
              className="w-full text-xs p-2 border rounded-md bg-background"
              value={formData.incidentId || ""}
              onChange={(e) => handleIncidentSelect(e.target.value)}
            >
              <option value="">-- Standalone Claim (No Direct Incident) --</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.incidentNumber} — {inc.incidentType} | {inc.customerName} ({inc.currency} {inc.estimatedValueAffected.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Grid 1: Claim Classification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Claim Type *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={formData.claimType}
                onChange={(e) => setFormData({ ...formData, claimType: e.target.value as ClaimType })}
              >
                <option value="CUSTOMER_CLAIM">Customer Claim</option>
                <option value="CARRIER_CLAIM">Claim Against Carrier / Transporter</option>
                <option value="DETENTION_DISPUTE">Detention / Demurrage Dispute</option>
                <option value="INSURANCE_CLAIM">Cargo Insurance Claim</option>
                <option value="SUPPLIER_CLAIM">Supplier Non-Conformity</option>
                <option value="OTHER">Other Dispute</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Claim Status *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={formData.claimStatus}
                onChange={(e) => setFormData({ ...formData, claimStatus: e.target.value as ClaimStatus })}
              >
                <option value="OPEN">Open (New Demand)</option>
                <option value="UNDER_REVIEW">Under Active Review</option>
                <option value="DOCUMENTS_PENDING">Awaiting Documents</option>
                <option value="AWAITING_RESPONSE">Awaiting Transporter / Surveyor</option>
                <option value="NEGOTIATION">Commercial Negotiation</option>
                <option value="PARTIALLY_ACCEPTED">Partially Accepted</option>
                <option value="ACCEPTED">Accepted / Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SETTLED">Settled & Closed</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Claim Date *</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={formData.claimDate || ""}
                onChange={(e) => setFormData({ ...formData, claimDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Grid 2: Claimant & Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Claimant (Demanding Party) *</Label>
              <Input
                placeholder="e.g. Ariana Saffron & Spice Traders"
                className="text-xs mt-1"
                value={formData.claimant || ""}
                onChange={(e) => setFormData({ ...formData, claimant: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Claim Against (Addressed To) *</Label>
              <Input
                placeholder="e.g. Sky Ariana Limited / Carrier"
                className="text-xs mt-1"
                value={formData.claimAgainst || ""}
                onChange={(e) => setFormData({ ...formData, claimAgainst: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Grid 3: Financial Exposure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold">Claim Amount Demanded *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="text-xs mt-1 font-bold"
                value={formData.claimAmount ?? 0}
                onChange={(e) => setFormData({ ...formData, claimAmount: Number(e.target.value) })}
                required
              />
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
              <Label className="text-xs font-semibold">Response Due Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={formData.responseDueDate || ""}
                onChange={(e) => setFormData({ ...formData, responseDueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Claim Basis Description */}
          <div>
            <Label className="text-xs font-semibold">Commercial Basis & Justification *</Label>
            <Textarea
              rows={3}
              placeholder="State the commercial justification provided in the formal demand letter (e.g. replacement cost of damaged goods, packaging rework, or demurrage waiver petition)."
              className="text-xs mt-1"
              value={formData.claimBasisDescription || ""}
              onChange={(e) => setFormData({ ...formData, claimBasisDescription: e.target.value })}
              required
            />
          </div>

          {/* Assigned Officer & Internal Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Assigned Claims Specialist</Label>
              <Input
                placeholder="e.g. Karim Dad"
                className="text-xs mt-1"
                value={formData.assignedTo || ""}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Internal Notes (Strictly Private)</span>
                <span className="text-[10px] text-rose-500 font-normal">Never shown to customer</span>
              </Label>
              <Input
                placeholder="e.g. Target settlement: $1,400 with 50% carrier subrogation"
                className="text-xs mt-1"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {claim ? "Save Claim File" : "Register Claim File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
