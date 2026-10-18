"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { PlusCircle, Loader2 } from "lucide-react"

interface NewLedgerEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  accountName: string
  currency: string
  onEntryCreated?: () => void
}

export function NewLedgerEntryDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  currency,
  onEntryCreated,
}: NewLedgerEntryDialogProps) {
  const [entryType, setEntryType] = useState<"debit" | "credit">("debit")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const [invoice, setInvoice] = useState("")
  const [bol, setBol] = useState("")
  const [container, setContainer] = useState("")
  const [consignee, setConsignee] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero.")
      return
    }

    if (!description.trim()) {
      toast.error("Please enter a description for this transaction.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          transaction_date: date,
          description: description.trim(),
          debit: entryType === "debit" ? numAmount : 0,
          credit: entryType === "credit" ? numAmount : 0,
          currency,
          reference_number: reference.trim(),
          invoice_number: invoice.trim(),
          bol_number: bol.trim(),
          container_number: container.trim(),
          consignee_name: consignee.trim(),
          remarks: remarks.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          `Transaction of ${numAmount.toLocaleString()} ${currency} (${entryType.toUpperCase()}) created successfully.`
        )
        setAmount("")
        setDescription("")
        setReference("")
        setInvoice("")
        setBol("")
        setContainer("")
        setConsignee("")
        setRemarks("")
        onOpenChange(false)
        if (onEntryCreated) onEntryCreated()
      } else {
        toast.error(data.error || "Failed to create ledger entry.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <PlusCircle className="h-5 w-5 text-blue-600" />
            New Ledger Entry
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account: <span className="font-semibold text-slate-800 dark:text-slate-200">{accountName}</span> ({currency})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Entry Type *</Label>
              <Select value={entryType} onValueChange={(v: "debit" | "credit") => setEntryType(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit (Charge / Receivables)</SelectItem>
                  <SelectItem value="credit">Credit (Payment / Advance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Amount ({currency}) *</Label>
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
              <Label className="text-xs font-semibold">Transaction Date *</Label>
              <Input
                type="text"
                required
                placeholder="YYYY-MM-DD or 1404-xx-xx"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Description *</Label>
            <Input
              required
              placeholder="e.g. Freight Charge - Kandahar to Nhava Sheva"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px] font-medium text-slate-600">Reference #</Label>
              <Input
                placeholder="e.g. REF-2026"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-slate-600">Invoice #</Label>
              <Input
                placeholder="e.g. INV-102"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-slate-600">BOL #</Label>
              <Input
                placeholder="e.g. SA-2026-0044"
                value={bol}
                onChange={(e) => setBol(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-medium text-slate-600">Container #</Label>
              <Input
                placeholder="e.g. MSKU9843210"
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-slate-600">Consignee</Label>
              <Input
                placeholder="e.g. Global Impex Ltd"
                value={consignee}
                onChange={(e) => setConsignee(e.target.value)}
                className="mt-0.5 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Remarks</Label>
            <Textarea
              placeholder="Optional remarks or transaction notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Transaction"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
