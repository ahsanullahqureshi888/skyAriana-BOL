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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, AlertTriangle, Lock, Loader2, Database } from "lucide-react"
import type { AccountingPeriod, CloseChecklistItem } from "@/lib/accounting/period-closing/period-types"

interface MonthlyCloseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: AccountingPeriod | null
  checklistItems: CloseChecklistItem[]
  hasBlockingErrors: boolean
  warningCount: number
  onConfirmClose: (notes: string, bypassWarnings: boolean) => Promise<void>
}

export function MonthlyCloseModal({
  open,
  onOpenChange,
  period,
  checklistItems,
  hasBlockingErrors,
  warningCount,
  onConfirmClose,
}: MonthlyCloseModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState("")
  const [notes, setNotes] = useState("")
  const [bypassWarnings, setBypassWarnings] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!period) return null

  const expectedText = `CLOSE ${period.name.toUpperCase()}`
  const isTextMatched = typedConfirmation.trim().toUpperCase() === expectedText
  const canSubmit = !hasBlockingErrors && isTextMatched && (!warningCount || bypassWarnings)

  const handleClose = async () => {
    if (!canSubmit) return
    try {
      setIsSubmitting(true)
      await onConfirmClose(notes, bypassWarnings)
      setTypedConfirmation("")
      setNotes("")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Lock className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">
              Execute Month-End Close & Lock: {period.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Finalize accounting records for {period.name} ({period.code}). Once closed, all financial mutations in this period are strictly locked on the server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Safeguard Highlights */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-blue-600" />
                Automatic Pre-Close Backup:
              </span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px]">
                MANDATORY ENABLED
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              A standalone verified backup (<code className="font-mono text-slate-700 dark:text-slate-300">SKY-ARIANA-{period.code}-PRE-CLOSE.zip</code>) will be created and verified before the lock takes effect.
            </p>
          </div>

          {/* Checklist Summary */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pre-Close Validation Checklist
            </Label>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2 rounded-md border border-slate-100 dark:border-slate-800 text-[11px] bg-white dark:bg-slate-950"
                >
                  <div className="flex items-center gap-2">
                    {item.status === "PASS" ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : item.status === "WARNING" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.title}</span>
                      {item.details && <p className="text-[10px] text-slate-500">{item.details}</p>}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-bold ${
                      item.status === "PASS"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50"
                        : item.status === "WARNING"
                        ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/50"
                        : "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/50"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings Acknowledgement */}
          {warningCount > 0 && !hasBlockingErrors && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4" />
                There are {warningCount} non-blocking warning(s).
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-900 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={bypassWarnings}
                  onChange={(e) => setBypassWarnings(e.target.checked)}
                  className="rounded border-amber-300"
                />
                I have reviewed these warnings and authorize month close anyway.
              </label>
            </div>
          )}

          {/* Notes / Closing Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 dark:text-slate-400">Closing Notes / Auditor Reference (Optional)</Label>
            <Textarea
              placeholder="e.g. Audited by Chief Accountant, reconciled with bank statements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-16"
            />
          </div>

          {/* Explicit Confirmation Input */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Type <code className="text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded font-mono font-bold">{expectedText}</code> to confirm:
            </Label>
            <Input
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={expectedText}
              className="text-xs font-mono"
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
            variant="destructive"
            size="sm"
            onClick={handleClose}
            disabled={!canSubmit || isSubmitting}
            className="gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Closing & Archiving...
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Execute Month Close
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
