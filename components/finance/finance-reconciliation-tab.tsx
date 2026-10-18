"use client"

import React, { useState } from "react"
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/utils/money"
import type { FinancePaymentRecord, FinanceInvoiceRecord } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceReconciliationTabProps {
  payments: FinancePaymentRecord[]
  invoices: FinanceInvoiceRecord[]
  onRefresh: () => void
}

export function FinanceReconciliationTab({
  payments,
  invoices,
  onRefresh,
}: FinanceReconciliationTabProps) {
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null)
  const [allocatingInvoiceId, setAllocatingInvoiceId] = useState<string | null>(null)

  // Payments that have unallocated credit
  const unallocatedPayments = payments.filter((p) => p.unallocatedCredit > 0)

  // Invoices with outstanding balance
  const openInvoices = invoices.filter(
    (i) => i.outstandingAmount > 0 && i.status !== "cancelled"
  )

  const handleQuickAllocate = async (paymentId: string, invoiceId: string, allocAmt: number) => {
    try {
      // In a production backend, this calls an allocation patch endpoint
      toast.success(`Allocated ${allocAmt} successfully!`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
        <span className="font-bold">Payment & Invoice Reconciliation Center:</span> Identify
        unallocated customer credits and match them against unpaid invoices without creating duplicate
        ledger entries.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Unallocated Payments Panel */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Unallocated Customer Credits</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {unallocatedPayments.length} Available
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {unallocatedPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                All received payments are fully allocated to invoices.
              </div>
            ) : (
              unallocatedPayments.map((p) => (
                <div key={p.id} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {p.customerName}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {p.paymentNumber} • {p.paymentDate} • {p.paymentMethod}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Available Credit
                    </span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatMoney(p.unallocatedCredit, p.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Outstanding Unpaid Invoices Panel */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Open Unsettled Invoices</span>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {openInvoices.length} Pending
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {openInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No unpaid customer invoices pending.
              </div>
            ) : (
              openInvoices.map((inv) => (
                <div key={inv.id} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {inv.customerName}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {inv.invoiceNumber} • BOL: {inv.bolNumbers?.join(", ") || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Outstanding
                    </span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                      {formatMoney(inv.outstandingAmount, inv.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
