"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowDownLeft, Landmark, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import type { TreasuryAccount } from "@/lib/types/treasury"

interface RecordCustomerReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: TreasuryAccount[]
  onReceiptRecorded?: (receipt: any) => void
}

export function RecordCustomerReceiptModal({
  open,
  onOpenChange,
  accounts,
  onReceiptRecorded,
}: RecordCustomerReceiptModalProps) {
  const [customerName, setCustomerName] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [bolNumber, setBolNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [receivedIntoAccountId, setReceivedIntoAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [reference, setReference] = useState("")
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0])
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-select first matching currency account
  useEffect(() => {
    if (accounts.length > 0 && !receivedIntoAccountId) {
      const match = accounts.find((a) => a.currency === currency && a.status === "ACTIVE")
      if (match) {
        setReceivedIntoAccountId(match.id)
      } else {
        setReceivedIntoAccountId(accounts[0].id)
      }
    }
  }, [accounts, currency, receivedIntoAccountId])

  const selectedAccount = accounts.find((a) => a.id === receivedIntoAccountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      toast.error("Customer name is required.")
      return
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than zero.")
      return
    }
    if (!receivedIntoAccountId) {
      toast.error("Please select the target Treasury Account where funds were received.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/treasury/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          invoice_number: invoiceNumber.trim() || undefined,
          bol_number: bolNumber.trim() || undefined,
          amount: numAmount,
          currency,
          received_into_account_id: receivedIntoAccountId,
          payment_method: paymentMethod,
          reference: reference.trim() || undefined,
          transaction_date: transactionDate,
          remarks: remarks.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Customer Receipt [${data.receiptNumber}] recorded successfully!`)
        onReceiptRecorded?.(data)
        onOpenChange(false)
        // Reset form
        setCustomerName("")
        setInvoiceNumber("")
        setBolNumber("")
        setAmount("")
        setReference("")
        setRemarks("")
      } else {
        toast.error(data.error || "Failed to record customer receipt.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error submitting receipt.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Customer Receipt
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Creates Customer Ledger Credit + Treasury Money-In + Generates Official Receipt
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g., NAJEB AMIN LTD / Hameed Traders"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receipt Date <span className="text-rose-500">*</span>
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
                Amount Received <span className="text-rose-500">*</span>
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

          {/* Mandated Target Account */}
          <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              RECEIVED INTO (Target Treasury Account) <span className="text-rose-500">*</span>
            </Label>
            <Select value={receivedIntoAccountId} onValueChange={setReceivedIntoAccountId}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900">
                <SelectValue placeholder="Select Destination Bank / Cash Box" />
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
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                Account Type: <span className="font-semibold">{selectedAccount.account_type}</span> • Current Balance:{" "}
                <span className="font-mono font-bold">
                  {selectedAccount.currency} {Number(selectedAccount.current_balance).toLocaleString()}
                </span>
              </p>
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
                  <SelectItem value="CASH">Cash in Hand</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Wire / TT</SelectItem>
                  <SelectItem value="EXCHANGE_DEALER">Exchange Dealer (Hawala)</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="INTERNAL_TRANSFER">Internal Deposit</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference / Cheque No. / Slip
              </Label>
              <Input
                placeholder="e.g., TT-98421 / Slip #501"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Allocate to Invoice (Optional)
              </Label>
              <Input
                placeholder="e.g., INV-2026-0042"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Allocate to BOL (Optional)
              </Label>
              <Input
                placeholder="e.g., SCLJEANSA02230"
                value={bolNumber}
                onChange={(e) => setBolNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remarks & Accounting Notes
            </Label>
            <Textarea
              placeholder="e.g., Received partial payment for dry fruits consignment. Customer promised remainder next week."
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
              disabled={isSubmitting}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting ? "Posting Payment..." : "Post Customer Receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
