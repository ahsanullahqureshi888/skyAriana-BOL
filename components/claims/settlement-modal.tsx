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
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  ShieldAlert,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import {
  ClaimRecord,
  SettlementType,
  SettlementRecord,
} from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface SettlementModalProps {
  isOpen: boolean
  onClose: () => void
  claim: ClaimRecord
  onSaved?: (updatedClaim: ClaimRecord) => void
}

export function SettlementModal({
  isOpen,
  onClose,
  claim,
  onSaved,
}: SettlementModalProps) {
  const store = IncidentClaimsStore.getInstance()

  const [settlementType, setSettlementType] = useState<SettlementType>("CREDIT_NOTE")
  const [settlementAmount, setSettlementAmount] = useState<number>(claim.outstandingExposure || 0)
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [approvedBy, setApprovedBy] = useState("Finance Controller (Sky Ariana)")
  const [financeTransactionRef, setFinanceTransactionRef] = useState(`TX-CLM-${Date.now().toString().slice(-6)}`)
  const [notes, setNotes] = useState("")
  const [idempotencyKey] = useState(`idemp-${claim.id}-${Date.now()}`)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!settlementAmount || settlementAmount <= 0) {
      toast.error("Please enter a valid settlement amount greater than 0.")
      return
    }

    if (settlementAmount > claim.outstandingExposure) {
      toast.error(`Settlement cannot exceed remaining outstanding exposure (${claim.currency} ${claim.outstandingExposure.toLocaleString()}).`)
      return
    }

    try {
      const updated = store.recordSettlement(claim.id, {
        claimId: claim.id,
        settlementType,
        settlementAmount: Number(settlementAmount),
        currency: claim.currency,
        settlementDate,
        approvedBy,
        financeTransactionRef,
        idempotencyKey,
        notes,
      })
      toast.success(`Settlement of ${claim.currency} ${settlementAmount.toLocaleString()} recorded successfully.`)
      onSaved?.(updated)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to record settlement.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <DialogTitle>Record Commercial Settlement</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict Accounting Invariance: Settlement transactions generate verified finance links. Multi-currency values are never mixed.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Claim Summary Box */}
          <div className="bg-muted/40 p-3 rounded-lg border grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Claimed</span>
              <div className="text-sm font-bold">{claim.currency} {claim.claimAmount.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Already Settled</span>
              <div className="text-sm font-bold text-emerald-600">{claim.currency} {claim.settlementAmount.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Remaining Exposure</span>
              <div className="text-sm font-bold text-rose-600">{claim.currency} {claim.outstandingExposure.toLocaleString()}</div>
            </div>
          </div>

          {/* Grid 1: Settlement Type & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Settlement Instrument *</Label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                value={settlementType}
                onChange={(e) => setSettlementType(e.target.value as SettlementType)}
              >
                <option value="CREDIT_NOTE">Commercial Credit Note (Against Freight)</option>
                <option value="DEBIT_NOTE">Debit Note (Issued to Carrier/Supplier)</option>
                <option value="BANK_PAYMENT">Direct Bank Wire Transfer</option>
                <option value="CASH_PAYMENT">Cash Payment Receipt</option>
                <option value="INSURANCE_RECOVERY">Insurance Recovery Claim Payout</option>
                <option value="SERVICE_CREDIT">Future Shipment Freight Credit</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Settlement Amount ({claim.currency}) *</Label>
              <Input
                type="number"
                min="0.01"
                max={claim.outstandingExposure}
                step="0.01"
                className="text-xs mt-1 font-bold text-emerald-600"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Grid 2: Date & Ref */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Effective Settlement Date *</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Finance Transaction / Voucher Ref</Label>
              <Input
                placeholder="e.g. TX-CR-2026-981"
                className="text-xs mt-1"
                value={financeTransactionRef}
                onChange={(e) => setFinanceTransactionRef(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Grid 3: Approver & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Authorized By (Finance / Management) *</Label>
              <Input
                className="text-xs mt-1"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Settlement Agreement Notes</Label>
              <Input
                placeholder="e.g. Full and final satisfaction of saffron damage"
                className="text-xs mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Idempotency Protection Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded border">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Idempotency token locked: <code className="text-[10px] font-mono">{idempotencyKey}</code> (Prevents duplicate ledger posting)</span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Authorize Settlement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
