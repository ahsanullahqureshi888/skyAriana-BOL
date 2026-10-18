"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AccountRecord } from "@/lib/types/ledger-system"
import { toast } from "sonner"
import { GitMerge, ArrowRight, AlertTriangle, Loader2, Check } from "lucide-react"

interface MergeAccountsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMergeComplete?: () => void
}

export function MergeAccountsDialog({ open, onOpenChange, onMergeComplete }: MergeAccountsDialogProps) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [primaryId, setPrimaryId] = useState("")
  const [duplicateId, setDuplicateId] = useState("")
  const [reason, setReason] = useState("")
  const [preview, setPreview] = useState<any | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  useEffect(() => {
    if (open) {
      fetch("/api/accounting/ledgers?limit=200")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setAccounts(data.accounts || [])
          }
        })
        .catch(() => {})
    } else {
      setPrimaryId("")
      setDuplicateId("")
      setReason("")
      setPreview(null)
    }
  }, [open])

  useEffect(() => {
    if (primaryId && duplicateId && primaryId !== duplicateId) {
      setIsLoadingPreview(true)
      fetch("/api/accounting/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_account_id: primaryId,
          duplicate_account_id: duplicateId,
          is_preview: true,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.preview) {
            setPreview(data.preview)
          } else {
            setPreview(null)
          }
        })
        .catch(() => setPreview(null))
        .finally(() => setIsLoadingPreview(false))
    } else {
      setPreview(null)
    }
  }, [primaryId, duplicateId])

  const handleMerge = async () => {
    if (!primaryId || !duplicateId) {
      toast.error("Please select both Primary and Duplicate accounts.")
      return
    }

    if (!confirm(`Are you sure you want to merge "${preview?.duplicateAccount?.display_name}" into "${preview?.primaryAccount?.display_name}"? This operation moves all transactions and recalculates balances.`)) {
      return
    }

    try {
      setIsMerging(true)
      const res = await fetch("/api/accounting/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_account_id: primaryId,
          duplicate_account_id: duplicateId,
          is_preview: false,
          reason: reason.trim() || "Manual merge by administrator",
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || "Accounts merged successfully.")
        onOpenChange(false)
        if (onMergeComplete) onMergeComplete()
      } else {
        toast.error(data.error || "Failed to merge accounts.")
      }
    } catch (err: any) {
      toast.error(err.message || "Merge failed")
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <GitMerge className="h-5 w-5 text-purple-600" />
            Merge Duplicate Accounts
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Select a primary master account to keep and a duplicate account to merge. All transaction rows and payments will be moved to the primary account.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Primary Account (To Keep) *
              </Label>
              <select
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
                className="mt-1 w-full h-9 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md outline-hidden font-medium"
              >
                <option value="">Select Primary Account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === duplicateId}>
                    {a.display_name} ({a.currency}) - Bal: {a.current_balance}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Duplicate Account (To Merge & Archive) *
              </Label>
              <select
                value={duplicateId}
                onChange={(e) => setDuplicateId(e.target.value)}
                className="mt-1 w-full h-9 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md outline-hidden font-medium"
              >
                <option value="">Select Duplicate Account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === primaryId}>
                    {a.display_name} ({a.currency}) - Bal: {a.current_balance}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Merge Justification / Audit Note</Label>
            <Input
              placeholder="e.g. Duplicate transliteration of same company (Najeb Amin Ltd vs NAJEB-AMIN-LTD)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {/* Merge Preview Box */}
          {isLoadingPreview && (
            <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              Calculating resulting balance and transaction impacts...
            </div>
          )}

          {preview && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold border-b pb-2">
                <span className="text-slate-700 dark:text-slate-300">Merge Impact Preview</span>
                <span className="text-purple-600">
                  Moving {preview.transactionsCount} Transactions, {preview.paymentsCount} Payments
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-2 bg-white dark:bg-slate-900 border rounded">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary Balance</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                    ${preview.currentPrimaryBalance.toLocaleString()}
                  </div>
                </div>

                <div className="p-2 bg-white dark:bg-slate-900 border rounded">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Duplicate Balance</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                    ${preview.duplicateBalance.toLocaleString()}
                  </div>
                </div>

                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Resulting Balance</span>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    ${preview.resultingBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!preview || isMerging}
              onClick={handleMerge}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
            >
              {isMerging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
              Confirm Account Merge
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
