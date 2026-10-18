"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowUpRight, Landmark, CheckCircle2, AlertTriangle } from "lucide-react"
import type { TreasuryAccount } from "@/lib/types/treasury"

interface RecordSupplierPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: TreasuryAccount[]
  onPaymentRecorded?: (payment: any) => void
}

export function RecordSupplierPaymentModal({
  open,
  onOpenChange,
  accounts,
  onPaymentRecorded,
}: RecordSupplierPaymentModalProps) {
  const [supplierName, setSupplierName] = useState("")
  const [billNumber, setBillNumber] = useState("")
  const [bolNumber, setBolNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [paidFromAccountId, setPaidFromAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")
  const [reference, setReference] = useState("")
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0])
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-select first matching currency account
  useEffect(() => {
    if (accounts.length > 0 && !paidFromAccountId) {
      const match = accounts.find((a) => a.currency === currency && a.status === "ACTIVE")
      if (match) {
        setPaidFromAccountId(match.id)
      } else {
        setPaidFromAccountId(accounts[0].id)
      }
    }
  }, [accounts, currency, paidFromAccountId])

  const selectedAccount = accounts.find((a) => a.id === paidFromAccountId)
  const numAmount = parseFloat(amount) || 0
  const isOverdraft = Boolean(selectedAccount && !selectedAccount.allow_negative_balance && (selectedAccount.current_balance - numAmount) < 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierName.trim()) {
      toast.error("Supplier name is required.")
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid disbursement amount greater than zero.")
      return
    }
    if (!paidFromAccountId) {
      toast.error("Please select the source Treasury Account to disburse from.")
      return
    }
    if (isOverdraft) {
      toast.error(`Insufficient balance in [${selectedAccount?.account_name}]. Overdraft is not permitted.`)
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/treasury/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: supplierName.trim(),
          bill_number: billNumber.trim() || undefined,
          bol_number: bolNumber.trim() || undefined,
          amount: numAmount,
          currency,
          paid_from_account_id: paidFromAccountId,
          payment_method: paymentMethod,
          reference: reference.trim() || undefined,
          transaction_date: transactionDate,
          remarks: remarks.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Supplier Payment Voucher [${data.voucherNumber}] posted successfully!`)
        onPaymentRecorded?.(data)
        onOpenChange(false)
        // Reset form
        setSupplierName("")
        setBillNumber("")
        setBolNumber("")
        setAmount("")
        setReference("")
        setRemarks("")
      } else {
        toast.error(data.error || "Failed to record supplier payment.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error submitting payment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600/10 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Disburse Supplier Payment
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Reduces Supplier Payable + Creates Treasury Money-Out + Generates Payment Voucher (PV)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supplier / Payee Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g., Maersk Line / Torghundi Border Terminal"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Disbursement Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Amount <span className="text-rose-500">*</span>
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
                Currency <span className="text-rose-500">*</span>
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                  <SelectItem value="AFN">AFN (؋)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mandated Source Account */}
          <div className="space-y-1.5 p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
            <Label className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              PAID FROM (Source Treasury Account) <span className="text-rose-500">*</span>
            </Label>
            <Select value={paidFromAccountId} onValueChange={setPaidFromAccountId}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900">
                <SelectValue placeholder="Select Source Bank / Cash Box" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.currency}) — Balance: {acc.currency} {Number(acc.current_balance).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Current Balance:{" "}
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    {selectedAccount.currency} {Number(selectedAccount.current_balance).toLocaleString()}
                  </strong>
                </span>
                {isOverdraft && (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Insufficient Funds!
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Wire / TT</SelectItem>
                  <SelectItem value="CASH">Cash Disbursement</SelectItem>
                  <SelectItem value="EXCHANGE_DEALER">Exchange Dealer (Hawala)</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="INTERNAL_TRANSFER">Internal Settlement</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference / Swift / Cheque No.
              </Label>
              <Input
                placeholder="e.g., SWIFT-49102 / Chq #8832"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supplier Bill Ref (Optional)
              </Label>
              <Input
                placeholder="e.g., BILL-2026-0012"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                BOL Ref (Optional)
              </Label>
              <Input
                placeholder="e.g., SNJEANSA25056560"
                value={bolNumber}
                onChange={(e) => setBolNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remarks & Payment Purpose
            </Label>
            <Textarea
              placeholder="e.g., Freight settlement for ocean shipment, driver rent advance, etc."
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
              disabled={isSubmitting || isOverdraft}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting ? "Disbursing..." : "Post Payment Voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
