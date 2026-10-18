"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ShieldCheck, Landmark, CheckCircle2, AlertTriangle, Scale } from "lucide-react"
import type { TreasuryAccount } from "@/lib/types/treasury"

interface ReconciliationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: TreasuryAccount[]
  onReconciliationComplete?: (rec: any) => void
}

export function ReconciliationModal({
  open,
  onOpenChange,
  accounts,
  onReconciliationComplete,
}: ReconciliationModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [actualBalance, setActualBalance] = useState("")
  const [periodStart, setPeriodStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  )
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const account = accounts.find((a) => a.id === selectedAccountId)
  const systemBal = account ? Number(account.current_balance) : 0
  const actualBal = parseFloat(actualBalance) || 0
  const difference = Math.round((actualBal - systemBal) * 100) / 100
  const isMatched = account && Math.abs(difference) < 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId) {
      toast.error("Please select a treasury account to reconcile.")
      return
    }
    if (actualBalance === "" || isNaN(actualBal)) {
      toast.error("Please enter the actual counted cash or bank statement balance.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/treasury/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treasury_account_id: selectedAccountId,
          period_start: periodStart,
          period_end: periodEnd,
          actual_balance: actualBal,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          `Reconciliation logged! Status: ${data.data.status} (Difference: ${data.data.difference} ${account?.currency})`
        )
        onReconciliationComplete?.(data.data)
        onOpenChange(false)
        setActualBalance("")
        setNotes("")
      } else {
        toast.error(data.error || "Failed to log reconciliation.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Treasury Balance Reconciliation
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Audit System Balance vs. Physical Cash Count / Bank Statement Balance
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Treasury Account <span className="text-rose-500">*</span>
            </Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Account to Audit" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.account_type}) — {acc.currency} {Number(acc.current_balance).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Period Start Date
              </Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Period End Date
              </Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {account && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">System Balance:</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                  {account.currency} {systemBal.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Actual Count / Stmt:</span>
                <span className="text-sm font-black text-blue-600 font-mono">
                  {account.currency} {actualBal.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Difference:</span>
                <span
                  className={`text-sm font-black font-mono ${
                    isMatched ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {difference > 0 ? `+${difference}` : difference} {account.currency}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Actual Counted Cash / Bank Statement Balance ({account?.currency || "USD"}){" "}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
              required
              className="h-9 text-sm font-bold font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Auditor Notes & Reconciliation Remarks
            </Label>
            <Textarea
              placeholder="e.g., Physical cash count matched 100%. / Discrepancy of 50 USD under investigation."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedAccountId}
              className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving..." : "Save Reconciliation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
