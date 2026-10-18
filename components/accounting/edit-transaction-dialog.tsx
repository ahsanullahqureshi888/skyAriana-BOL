"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LedgerTransactionRecord } from "@/lib/types/ledger-system"
import { toast } from "sonner"
import { Edit3, Trash2, Loader2, AlertTriangle } from "lucide-react"

interface EditTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: LedgerTransactionRecord | null
  onTransactionUpdated?: () => void
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onTransactionUpdated,
}: EditTransactionDialogProps) {
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [debit, setDebit] = useState("")
  const [credit, setCredit] = useState("")
  const [reference, setReference] = useState("")
  const [invoice, setInvoice] = useState("")
  const [bol, setBol] = useState("")
  const [remarks, setRemarks] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (transaction) {
      setDate(transaction.transaction_date || "")
      setDescription(transaction.description || "")
      setDebit(String(transaction.debit || 0))
      setCredit(String(transaction.credit || 0))
      setReference(transaction.reference_number || "")
      setInvoice(transaction.invoice_number || "")
      setBol(transaction.bol_number || "")
      setRemarks(transaction.remarks || "")
      setReason("")
      setConfirmDelete(false)
    }
  }, [transaction])

  if (!transaction) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const dr = parseFloat(debit) || 0
    const cr = parseFloat(credit) || 0

    if (dr === 0 && cr === 0) {
      toast.error("At least one amount (Debit or Credit) must be greater than zero.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch("/api/accounting/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transaction.id,
          transaction_date: date,
          description: description.trim(),
          debit: dr,
          credit: cr,
          reference_number: reference.trim(),
          invoice_number: invoice.trim(),
          bol_number: bol.trim(),
          remarks: remarks.trim(),
          reason: reason.trim() || "Transaction edited by user",
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Transaction updated and running balances recalculated.")
        onOpenChange(false)
        if (onTransactionUpdated) onTransactionUpdated()
      } else {
        toast.error(data.error || "Failed to update transaction.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/accounting/transactions?id=${transaction.id}&reason=${encodeURIComponent(reason || "Soft-deleted by user")}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Transaction soft-deleted and balance updated.")
        onOpenChange(false)
        if (onTransactionUpdated) onTransactionUpdated()
      } else {
        toast.error(data.error || "Failed to delete transaction.")
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
            <Edit3 className="h-5 w-5 text-amber-600" />
            Edit Ledger Transaction
          </DialogTitle>
          <p className="text-xs text-slate-500">
            {transaction.source_sheet ? `Origin: Sheet "${transaction.source_sheet}" (Row ${transaction.source_row})` : "Manual Entry"}
          </p>
        </DialogHeader>

        {confirmDelete ? (
          <div className="space-y-4 py-3">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-900 dark:text-red-200">Confirm Soft Delete</h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  This transaction will be archived in the audit trail and excluded from the running balance calculations.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reason for deletion *</Label>
              <Input
                placeholder="e.g. Duplicate entry / Cancelled invoice"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
                onClick={handleDelete}
              >
                {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                Confirm Delete
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Date</Label>
                <Input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Debit ({transaction.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={debit}
                  onChange={(e) => setDebit(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Credit ({transaction.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-slate-600">Reference</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-0.5 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-slate-600">Invoice</Label>
                <Input
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  className="mt-0.5 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-slate-600">BOL</Label>
                <Input
                  value={bol}
                  onChange={(e) => setBol(e.target.value)}
                  className="mt-0.5 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reason for edit / Audit Note</Label>
              <Input
                placeholder="e.g. Corrected invoice number"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Entry
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
