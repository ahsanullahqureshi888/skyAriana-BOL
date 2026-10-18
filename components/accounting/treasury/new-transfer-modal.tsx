"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeftRight, Landmark, CheckCircle2, AlertCircle } from "lucide-react"
import type { TreasuryAccount } from "@/lib/types/treasury"

interface NewTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: TreasuryAccount[]
  onTransferComplete?: (transfer: any) => void
}

export function NewTransferModal({
  open,
  onOpenChange,
  accounts,
  onTransferComplete,
}: NewTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [fee, setFee] = useState("0")
  const [reference, setReference] = useState("")
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0])
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  // Filter eligible destination accounts: must match fromAccount currency and not be same account
  const eligibleToAccounts = accounts.filter(
    (a) => a.id !== fromAccountId && (!fromAccount || a.currency === fromAccount.currency)
  )

  const numAmount = parseFloat(amount) || 0
  const isOverdraft = Boolean(fromAccount && !fromAccount.allow_negative_balance && (fromAccount.current_balance - numAmount) < 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) {
      toast.error("Please select both source and destination accounts.")
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Transfer amount must be greater than zero.")
      return
    }
    if (isOverdraft) {
      toast.error(`Insufficient balance in source account [${fromAccount?.account_name}].`)
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/treasury/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          amount: numAmount,
          fee: parseFloat(fee) || 0,
          transfer_date: transferDate,
          reference: reference.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Internal transfer [${data.transfer.transfer_number}] completed!`)
        onTransferComplete?.(data)
        onOpenChange(false)
        setAmount("")
        setReference("")
        setRemarks("")
      } else {
        toast.error(data.error || "Failed to execute transfer.")
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
            <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Internal Fund Transfer
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Move company funds between bank accounts and cash boxes (Same Currency • Zero Net P&L Effect)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                From Account (Outflow) <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={fromAccountId}
                onValueChange={(val) => {
                  setFromAccountId(val)
                  setToAccountId("") // Reset destination
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Source Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.currency}) — {acc.currency} {Number(acc.current_balance).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                To Account (Inflow) <span className="text-rose-500">*</span>
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId} disabled={!fromAccountId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Destination Account" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleToAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transfer Amount ({fromAccount?.currency || "USD"}) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-9 text-sm font-bold font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transfer Fee (If Any)
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference / Slip No.
              </Label>
              <Input
                placeholder="e.g., ATM-Withdrawal / Cheque #104"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remarks
            </Label>
            <Textarea
              placeholder="e.g., Replenishing Dubai Cash Box from USD Bank Account."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
              disabled={isSubmitting || isOverdraft || !toAccountId}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting ? "Transferring..." : "Execute Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
