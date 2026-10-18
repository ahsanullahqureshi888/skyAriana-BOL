"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldCheck, AlertTriangle, AlertCircle, RefreshCw, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface IntegrityIssue {
  id: string
  type: string
  bolNumber: string
  invoiceNumber: string
  accountName: string
  expected: number | string
  actual: number | string
  difference: number | string
  severity: "high" | "medium" | "low"
  action: string
}

interface AccountingIntegrityDialogProps {
  open: boolean
  onClose: () => void
}

export function AccountingIntegrityDialog({
  open,
  onClose,
}: AccountingIntegrityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [issues, setIssues] = useState<IntegrityIssue[]>([])
  const [totalChecked, setTotalChecked] = useState(0)

  const runAudit = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/accounting/integrity")
      const data = await res.json()
      if (data.success) {
        setIssues(data.issues || [])
        setTotalChecked(data.totalChecked || 0)
      } else {
        toast.error(data.error || "Failed to run integrity check")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error running integrity check")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      runAudit()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800">
                  Accounting & BOL Integrity Audit
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Validates BOL charges, invoice totals, posted ledger debits, and payment allocations.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runAudit}
              disabled={loading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Re-Audit
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs">Auditing all active BOLs and ledger postings...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">100% Accounting Invariance Verified</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Checked {totalChecked} BOL records. All charges, invoice totals, posted debits, and allocations match with zero discrepancies.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Detected <strong>{issues.length}</strong> discrepancy issue(s) across {totalChecked} audited BOLs.
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">BOL</th>
                      <th className="py-2.5 px-3">Invoice</th>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3 text-right">Expected</th>
                      <th className="py-2.5 px-3 text-right">Actual</th>
                      <th className="py-2.5 px-3 text-right">Diff</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issues.map((iss) => (
                      <tr key={iss.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-800">{iss.type}</td>
                        <td className="py-2 px-3 font-mono text-blue-700">{iss.bolNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{iss.invoiceNumber}</td>
                        <td className="py-2 px-3 text-slate-700">{iss.accountName}</td>
                        <td className="py-2 px-3 text-right font-mono">{iss.expected}</td>
                        <td className="py-2 px-3 text-right font-mono">{iss.actual}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {iss.difference}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              iss.severity === "high"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {iss.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">{iss.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
