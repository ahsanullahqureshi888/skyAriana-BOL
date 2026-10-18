"use client"

import React, { useState } from "react"
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
  Scale,
  ShieldCheck,
  AlertTriangle,
  History,
  FileCheck2,
} from "lucide-react"
import { toast } from "sonner"
import {
  ClaimRecord,
  ResponsibilityStatus,
} from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface ResponsibilityModalProps {
  isOpen: boolean
  onClose: () => void
  claim: ClaimRecord
  onSaved?: (updatedClaim: ClaimRecord) => void
}

export function ResponsibilityModal({
  isOpen,
  onClose,
  claim,
  onSaved,
}: ResponsibilityModalProps) {
  const store = IncidentClaimsStore.getInstance()

  const [status, setStatus] = useState<ResponsibilityStatus>(
    claim.responsibilityStatus || "UNDER_REVIEW"
  )
  const [assessedPartyName, setAssessedPartyName] = useState(
    claim.responsiblePartyName || ""
  )
  const [partyType, setPartyType] = useState(
    claim.responsiblePartyAssessment?.partyType || "TRANSPORTER"
  )
  const [reason, setReason] = useState(
    claim.responsiblePartyAssessment?.reason || ""
  )
  const [evidenceReference, setEvidenceReference] = useState(
    claim.responsiblePartyAssessment?.evidenceReference || ""
  )
  const [assessedBy, setAssessedBy] = useState("Karim Dad (Authorized Claims Officer)")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (status !== "NOT_ASSESSED" && status !== "NO_RESPONSIBILITY_ASSIGNED") {
      if (!assessedPartyName.trim()) {
        toast.error("Please specify the assessed responsible party.")
        return
      }
      if (!reason.trim() || reason.trim().length < 15) {
        toast.error("Please document the technical reason and grounds in detail (minimum 15 characters).")
        return
      }
      if (!evidenceReference.trim()) {
        toast.error("Please cite supporting evidence references (e.g. photos, surveyor protocol, circular).")
        return
      }
    }

    try {
      const updated = store.recordResponsibilityAssessment(claim.id, {
        status,
        assessedPartyName,
        partyType,
        reason,
        evidenceReference,
        assessedBy,
      })
      toast.success("Responsibility assessment recorded with evidentiary justification.")
      onSaved?.(updated)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to record responsibility assessment.")
    }
  }

  const previousAssessments = claim.responsiblePartyAssessment?.previousAssessments || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            <DialogTitle>Evaluate Commercial Responsibility</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict Standard: Liability is never assigned automatically. Human officer approval and cited evidence are mandatory.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Claim Reference Banner */}
          <div className="bg-muted/40 p-3 rounded-lg border text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground">Claim File:</span> {claim.claimNumber} ({claim.customerName})
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Exposure: {claim.currency} {claim.outstandingExposure.toLocaleString()}
            </Badge>
          </div>

          {/* Assessment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Responsibility Determination *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={status}
                onChange={(e) => setStatus(e.target.value as ResponsibilityStatus)}
              >
                <option value="UNDER_REVIEW">Under Active Review (Technical Assessment Pending)</option>
                <option value="AGREED_PARTY_RESPONSIBILITY">Agreed Single Party Responsibility</option>
                <option value="SHARED_RESPONSIBILITY">Shared / Multi-Party Apportioned Responsibility</option>
                <option value="DISPUTED">Disputed Liability (Contested by Respondent)</option>
                <option value="NO_RESPONSIBILITY_ASSIGNED">No Responsibility Assigned (Force Majeure / Inconclusive)</option>
                <option value="NOT_ASSESSED">Not Assessed</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Party Category</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={partyType}
                onChange={(e) => setPartyType(e.target.value)}
              >
                <option value="TRANSPORTER">Transporter / Trucking Company</option>
                <option value="DRIVER">Individual Driver</option>
                <option value="SHIPPING_LINE">Shipping Line / Ocean Carrier</option>
                <option value="AIRLINE">Airline Carrier / Handling Agent</option>
                <option value="WAREHOUSE">Warehouse / Cross-Dock Terminal</option>
                <option value="CUSTOMS">Customs / Border Authority</option>
                <option value="INSURANCE_COMPANY">Cargo Insurer</option>
                <option value="SHIPPER">Shipper / Packing Defect</option>
                <option value="CONSIGNEE">Consignee Receiving Delay</option>
                <option value="FORCE_MAJEURE">Force Majeure / Sovereign Event</option>
              </select>
            </div>
          </div>

          {/* Party Name */}
          <div>
            <Label className="text-xs font-semibold">Assessed Party Name *</Label>
            <Input
              placeholder="e.g. Transporter Ahmad Yar Logistics / Driver Mohammad Rahim"
              className="text-xs mt-1"
              value={assessedPartyName}
              onChange={(e) => setAssessedPartyName(e.target.value)}
              required
            />
          </div>

          {/* Technical Ground */}
          <div>
            <Label className="text-xs font-semibold">Factual Determination & Technical Grounds *</Label>
            <Textarea
              rows={3}
              placeholder="Provide explicit technical evidence justifying this assessment (e.g. Joint damage protocol confirmed tarpaulin tear at time of arrival; or Temperature logger proves cold-chain breakdown on tarmac)."
              className="text-xs mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {/* Evidence Citation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                Cited Evidence References *
              </Label>
              <Input
                placeholder="e.g. Photo evid-001, Joint Protocol signed 2026-03-18"
                className="text-xs mt-1"
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Authorized Assessor Signature *
              </Label>
              <Input
                className="text-xs mt-1"
                value={assessedBy}
                onChange={(e) => setAssessedBy(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Audit History of Prior Assessments */}
          {previousAssessments.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Audit Trail of Previous Determinations ({previousAssessments.length})
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {previousAssessments.map((prev, idx) => (
                  <div key={idx} className="text-[11px] p-2 rounded bg-background border flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{prev.assessedPartyName || "Unassigned"} ({prev.status})</div>
                      <div className="text-muted-foreground">{prev.reason}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right shrink-0">
                      <div>{prev.changedBy}</div>
                      <div>{new Date(prev.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Save Determination
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
