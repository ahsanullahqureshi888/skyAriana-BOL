"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Unlock, AlertTriangle, Loader2, ShieldAlert, History } from "lucide-react"
import type { AccountingPeriod } from "@/lib/accounting/period-closing/period-types"

interface PeriodReopenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: AccountingPeriod | null
  onConfirmReopen: (reason: string) => Promise<void>
}

export function PeriodReopenModal({
  open,
  onOpenChange,
  period,
  onConfirmReopen,
}: PeriodReopenModalProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!period) return null

  const isReasonValid = reason.trim().length >= 10

  const handleReopen = async () => {
    if (!isReasonValid) return
    try {
      setIsSubmitting(true)
      await onConfirmReopen(reason.trim())
      setReason("")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Unlock className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">
              Authorize Reopening Period: {period.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Reopening a closed accounting period unlocks ledger postings for emergency corrections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Safeguard & Audit Notice */}
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
              <ShieldAlert className="h-4 w-4" />
              Automated Integrity Controls
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900/80 dark:text-amber-200/80">
              <li>A pre-reopen backup will be generated automatically.</li>
              <li>When re-closed, the system will create <strong>Snapshot Version 2</strong>, permanently retaining Version 1.</li>
              <li>A delta comparison will document every modified ledger balance for auditor review.</li>
            </ul>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mandatory Business Justification
              </Label>
              <span className={`text-[10px] ${reason.trim().length >= 10 ? "text-emerald-600" : "text-slate-400"}`}>
                {reason.trim().length}/10 characters min
              </span>
            </div>
            <Textarea
              placeholder="e.g. Correcting missing customs demurrage invoice #INV-9821 approved by CFO..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-24"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleReopen}
            disabled={!isReasonValid || isSubmitting}
            className="gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Authorizing & Safeguarding...
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Authorize & Reopen Period
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
