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
  Clock,
  Ship,
  Calculator,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { DetentionDisputeDetails, IncidentRecord } from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface DetentionDisputeModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (incident: IncidentRecord) => void
}

export function DetentionDisputeModal({
  isOpen,
  onClose,
  onSaved,
}: DetentionDisputeModalProps) {
  const store = IncidentClaimsStore.getInstance()

  const [containerNumber, setContainerNumber] = useState("")
  const [carrierName, setCarrierName] = useState("MSC Mediterranean Shipping Company")
  const [arrivalDate, setArrivalDate] = useState("2026-03-01")
  const [freeDays, setFreeDays] = useState(14)
  const [actualReturnDate, setActualReturnDate] = useState("2026-03-22")
  const [dailyRate, setDailyRate] = useState(150)
  const [carrierInvoicedAmount, setCarrierInvoicedAmount] = useState(2550)
  const [exemptDays, setExemptDays] = useState(10) // e.g. 10 days customs border closure
  const [disputeReason, setDisputeReason] = useState(
    "Force Majeure: Official customs border post closure notice issued by Afghan Ministry of Finance (10 days exempt from demurrage/detention count)."
  )
  const [customerName, setCustomerName] = useState("Afghan Transit Importers Ltd")

  // Auto-calculated fields
  const [lastFreeDay, setLastFreeDay] = useState("")
  const [totalOverstayDays, setTotalOverstayDays] = useState(0)
  const [netBillableDays, setNetBillableDays] = useState(0)
  const [legitimateExposure, setLegitimateExposure] = useState(0)
  const [disputedAmount, setDisputedAmount] = useState(0)

  useEffect(() => {
    if (!arrivalDate) return

    const arr = new Date(arrivalDate)
    const lfd = new Date(arr.getTime() + (Number(freeDays) || 0) * 86400000)
    const lfdStr = lfd.toISOString().split("T")[0]
    setLastFreeDay(lfdStr)

    if (actualReturnDate) {
      const ret = new Date(actualReturnDate)
      const diffMs = ret.getTime() - lfd.getTime()
      const totalOverstay = Math.max(0, Math.ceil(diffMs / 86400000))
      setTotalOverstayDays(totalOverstay)

      const netDays = Math.max(0, totalOverstay - (Number(exemptDays) || 0))
      setNetBillableDays(netDays)

      const rate = Number(dailyRate) || 0
      const legit = netDays * rate
      setLegitimateExposure(legit)

      const carrierBilled = Number(carrierInvoicedAmount) || (totalOverstay * rate)
      setDisputedAmount(Math.max(0, carrierBilled - legit))
    }
  }, [arrivalDate, freeDays, actualReturnDate, dailyRate, carrierInvoicedAmount, exemptDays])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!containerNumber.trim()) {
      toast.error("Please enter container number.")
      return
    }

    const details: DetentionDisputeDetails = {
      containerNumber: containerNumber.toUpperCase(),
      carrierName,
      arrivalDate,
      freeDays: Number(freeDays),
      lastFreeDay,
      actualEmptyReturnDate: actualReturnDate,
      chargeDays: totalOverstayDays,
      carrierInvoiceRef: `INV-DET-${containerNumber.slice(-4)}`,
      configuredDailyRate: Number(dailyRate),
      estimatedExposure: legitimateExposure,
      actualCarrierCharge: Number(carrierInvoicedAmount),
      disputedAmount,
      disputeReason,
      resolutionStatus: "DISPUTED_WITH_CARRIER",
    }

    try {
      // 1. Create Incident
      const incident = store.saveIncident({
        incidentType: "DETENTION",
        incidentDate: actualReturnDate,
        containerNumber: containerNumber.toUpperCase(),
        customerName,
        locationName: `${carrierName} Return Depot`,
        locationType: "PORT",
        description: `Detention charge dispute on container ${containerNumber.toUpperCase()}. Carrier invoiced USD ${carrierInvoicedAmount.toLocaleString()} for ${totalOverstayDays} overstay days. Disputing USD ${disputedAmount.toLocaleString()} due to ${exemptDays} force majeure days.`,
        quantityAffected: 1,
        weightAffectedKg: 0,
        estimatedValueAffected: Number(carrierInvoicedAmount),
        currency: "USD",
        severity: "HIGH",
        status: "OPEN",
        reportedBySource: "SHIPPING_LINE",
        reportedByName: `${carrierName} Billing Desk`,
        detentionDetails: details,
      })

      // 2. Automatically link Commercial Claim for dispute management
      store.saveClaim({
        incidentId: incident.id,
        incidentNumber: incident.incidentNumber,
        claimType: "DETENTION_DISPUTE",
        claimStatus: "NEGOTIATION",
        customerName,
        claimant: carrierName,
        claimAgainst: "Sky Ariana Limited / Customer",
        claimDate: actualReturnDate,
        claimAmount: Number(carrierInvoicedAmount),
        currency: "USD",
        acceptedAmount: legitimateExposure,
        settlementAmount: 0,
        recoveredAmount: 0,
        outstandingExposure: disputedAmount,
        claimBasisDescription: disputeReason,
        assignedTo: "Karim Dad (Claims Lead)",
        responsibilityStatus: "DISPUTED",
        responsiblePartyName: `${carrierName} (Force Majeure Dispute)`,
        notes: `Carrier demands USD ${carrierInvoicedAmount}; Legitimate exposure is USD ${legitimateExposure}; Disputed balance: USD ${disputedAmount}.`,
      })

      toast.success(`Detention dispute registered for ${containerNumber.toUpperCase()} with USD ${disputedAmount.toLocaleString()} contested.`)
      onSaved?.(incident)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save detention dispute.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <DialogTitle>Detention & Demurrage Dispute Calculator</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict Separation: Estimated exposure is distinct from carrier invoices. Force majeure waiver petitions are tracked transparently.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Grid 1: Container & Carrier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Container Number *</Label>
              <Input
                placeholder="e.g. MSCU4920184"
                className="text-xs mt-1 uppercase font-mono"
                value={containerNumber}
                onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Carrier / Shipping Line *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
              >
                <option value="MSC Mediterranean Shipping Company">MSC (Mediterranean Shipping Co)</option>
                <option value="Maersk Line">Maersk Line</option>
                <option value="CMA CGM Group">CMA CGM</option>
                <option value="COSCO Shipping">COSCO Shipping</option>
                <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                <option value="ONE (Ocean Network Express)">ONE</option>
                <option value="Other Carrier / NVOCC">Other Carrier / NVOCC</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Customer / Consignee</Label>
              <Input
                className="text-xs mt-1"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Grid 2: Timeline Dates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold">Discharge Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Free Days Allowed</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1"
                value={freeDays}
                onChange={(e) => setFreeDays(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Last Free Day (LFD)</Label>
              <div className="mt-1 p-2 text-xs font-mono font-bold bg-muted border rounded-md">
                {lastFreeDay || "---"}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Actual Empty Return</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={actualReturnDate}
                onChange={(e) => setActualReturnDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Grid 3: Arithmetic & Disputed Days */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Carrier Daily Rate (USD)</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Carrier Billed Total (USD)</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1 font-bold text-rose-600"
                value={carrierInvoicedAmount}
                onChange={(e) => setCarrierInvoicedAmount(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Force Majeure Exempt Days</Label>
              <Input
                type="number"
                min="0"
                max={totalOverstayDays}
                className="text-xs mt-1 font-bold text-indigo-600"
                value={exemptDays}
                onChange={(e) => setExemptDays(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Calculation Summary Card */}
          <div className="border border-purple-500/30 bg-purple-500/5 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
              <Calculator className="h-4 w-4" />
              Detention Discrepancy Breakdown
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
              <div className="bg-background p-2 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Overstay</span>
                <div className="font-bold text-sm">{totalOverstayDays} Days</div>
              </div>
              <div className="bg-background p-2 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Legitimate Billable</span>
                <div className="font-bold text-sm text-emerald-600">USD {legitimateExposure.toLocaleString()} ({netBillableDays} d)</div>
              </div>
              <div className="bg-background p-2 rounded border border-rose-500/40">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-semibold">Contested / Disputed</span>
                <div className="font-bold text-sm text-rose-600 dark:text-rose-400">USD {disputedAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Dispute Grounds / Force Majeure Reason */}
          <div>
            <Label className="text-xs font-semibold">Formal Dispute Grounds & Waiver Justification *</Label>
            <Textarea
              rows={3}
              className="text-xs mt-1"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              File Detention Dispute
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
