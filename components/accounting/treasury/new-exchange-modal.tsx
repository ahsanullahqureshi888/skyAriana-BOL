"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { RefreshCw, Landmark, CheckCircle2, TrendingUp } from "lucide-react"
import type { TreasuryAccount } from "@/lib/types/treasury"

interface NewExchangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: TreasuryAccount[]
  onExchangeComplete?: (exchange: any) => void
}

export function NewExchangeModal({
  open,
  onOpenChange,
  accounts,
  onExchangeComplete,
}: NewExchangeModalProps) {
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [exchangeFee, setExchangeFee] = useState("0")
  const [counterparty, setCounterparty] = useState("")
  const [reference, setReference] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  // Cross-currency destination accounts must differ in currency
  const eligibleToAccounts = accounts.filter(
    (a) => a.id !== fromAccountId && (!fromAccount || a.currency !== fromAccount.currency)
  )
  const toAccount = accounts.find((a) => a.id === toAccountId)

  // Live effective rate calculation
  const numFrom = parseFloat(fromAmount) || 0
  const numTo = parseFloat(toAmount) || 0
  let effectiveRate = 0
  let rateLabel = "Rate"

  if (numFrom > 0 && numTo > 0 && fromAccount && toAccount) {
    if (fromAccount.currency === "AED" && toAccount.currency === "USD") {
      effectiveRate = Math.round((numFrom / numTo) * 10000) / 10000
      rateLabel = `${effectiveRate} AED per USD`
    } else if (fromAccount.currency === "USD" && toAccount.currency === "AED") {
      effectiveRate = Math.round((numTo / numFrom) * 10000) / 10000
      rateLabel = `${effectiveRate} AED per USD`
    } else {
      effectiveRate = Math.round((numTo / numFrom) * 100000) / 100000
      rateLabel = `1 ${fromAccount.currency} = ${effectiveRate} ${toAccount.currency}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) {
      toast.error("Please select both source and destination accounts.")
      return
    }
    if (numFrom <= 0 || numTo <= 0) {
      toast.error("Both given and received amounts must be greater than zero.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/treasury/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account_id: fromAccountId,
          from_amount: numFrom,
          to_account_id: toAccountId,
          to_amount: numTo,
          exchange_fee: parseFloat(exchangeFee) || 0,
          counterparty: counterparty.trim() || undefined,
          reference: reference.trim() || undefined,
          date,
          remarks: remarks.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Currency Exchange [${data.exchange.exchange_number}] executed successfully!`)
        onExchangeComplete?.(data)
        onOpenChange(false)
        setFromAmount("")
        setToAmount("")
        setReference("")
        setRemarks("")
      } else {
        toast.error(data.error || "Failed to execute currency exchange.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Execute Currency Exchange
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Cross-currency conversion between company accounts with permanent rate locking
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            {/* From Leg */}
            <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-2">
              <Label className="text-xs font-bold text-rose-950 dark:text-rose-300 block">
                Source Account (Given)
              </Label>
              <Select
                value={fromAccountId}
                onValueChange={(val) => {
                  setFromAccountId(val)
                  setToAccountId("")
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select Source Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="any"
                placeholder={`Amount in ${fromAccount?.currency || "Currency"}`}
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                required
                className="h-9 text-sm font-bold font-mono bg-white dark:bg-slate-900"
              />
              {fromAccount && (
                <p className="text-[10px] text-slate-500">
                  Available: {fromAccount.currency} {Number(fromAccount.current_balance).toLocaleString()}
                </p>
              )}
            </div>

            {/* To Leg */}
            <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <Label className="text-xs font-bold text-emerald-950 dark:text-emerald-300 block">
                Destination Account (Received)
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId} disabled={!fromAccountId}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
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
              <Input
                type="number"
                step="any"
                placeholder={`Amount in ${toAccount?.currency || "Currency"}`}
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                required
                className="h-9 text-sm font-bold font-mono bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Live Calculated Rate Card */}
          {effectiveRate > 0 && (
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Effective Exchange Rate:</span>
              </div>
              <span className="font-mono font-black text-blue-900 dark:text-blue-300">{rateLabel}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dealer / Counterparty
              </Label>
              <Input
                placeholder="e.g., Al-Ansari Exchange / Sarafa"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dealer Fee
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={exchangeFee}
                onChange={(e) => setExchangeFee(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Exchange Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reference / Deal Ticket #
            </Label>
            <Input
              placeholder="e.g., DEAL-9401 / Hawala Slip #88"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remarks
            </Label>
            <Textarea
              placeholder="e.g., Conversion of customer AED payment to USD Operating Bank."
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
              disabled={isSubmitting || !toAccountId || numFrom <= 0 || numTo <= 0}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting ? "Converting..." : "Lock & Execute Exchange"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
