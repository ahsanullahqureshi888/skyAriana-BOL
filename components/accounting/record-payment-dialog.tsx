"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentMethod } from "@/lib/types/ledger-system"
import { toast } from "sonner"
import { CreditCard, Loader2 } from "lucide-react"

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  accountName: string
  currency: string
  onPaymentSuccess?: () => void
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency,
  onPaymentSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash")
  const [reference, setReference] = useState("")
  const [bankReference, setBankReference] = useState("")
  const [bolReference, setBolReference] = useState("")
  const [invoiceReference, setInvoiceReference] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than zero.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          payment_date: paymentDate,
          amount: numAmount,
          currency,
          payment_method: paymentMethod,
          reference: reference.trim(),
          bank_reference: bankReference.trim(),
          bol_reference: bolReference.trim(),
          invoice_reference: invoiceReference.trim(),
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Payment of ${numAmount.toLocaleString()} ${currency} recorded successfully. Credit entry created.`)
        setAmount("")
        setReference("")
        setBankReference("")
        setBolReference("")
        setInvoiceReference("")
        setNotes("")
        onOpenChange(false)
        if (onPaymentSuccess) onPaymentSuccess()
      } else {
        toast.error(data.error || "Failed to record payment.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Record Payment (Credit Entry)
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account: <span className="font-semibold text-slate-800 dark:text-slate-200">{accountName}</span> ({currency})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Payment Amount ({currency}) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Payment Date *</Label>
              <Input
                type="text"
                required
                placeholder="YYYY-MM-DD or 1404-xx-xx"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash (نغدی)</SelectItem>
                  <SelectItem value="Bank">Bank Transfer (بانک)</SelectItem>
                  <SelectItem value="Exchange">Sarrafi / Exchange (صرافی)</SelectItem>
                  <SelectItem value="Transfer">Wire Transfer (حواله)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Receipt / Reference #</Label>
              <Input
                placeholder="e.g. REC-9923"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px] font-medium text-slate-600">Bank Reference</Label>
              <Input
                placeholder="e.g. NKB-4402"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-slate-600">BOL Reference</Label>
              <Input
                placeholder="e.g. SA-2026-001"
                value={bolReference}
                onChange={(e) => setBolReference(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-slate-600">Invoice Reference</Label>
              <Input
                placeholder="e.g. INV-080"
                value={invoiceReference}
                onChange={(e) => setInvoiceReference(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Remarks / Description</Label>
            <Textarea
              placeholder="e.g. نغدی وصول سوی بدست بلال احمد توسط صرافی..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                "Post Payment (Credit Entry)"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
