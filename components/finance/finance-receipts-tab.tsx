"use client"

import React, { useState } from "react"
import {
  Receipt,
  Printer,
  Share2,
  Copy,
  Check,
  Search,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney } from "@/lib/utils/money"
import { buildPaymentReceiptWhatsAppMessage } from "@/lib/utils/finance-whatsapp"
import type { FinanceReceiptRecord } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceReceiptsTabProps {
  receipts: FinanceReceiptRecord[]
  selectedReceiptId?: string | null
  onClearSelectedReceipt?: () => void
}

export function FinanceReceiptsTab({
  receipts,
  selectedReceiptId,
  onClearSelectedReceipt,
}: FinanceReceiptsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("all")
  const [activeReceipt, setActiveReceipt] = useState<FinanceReceiptRecord | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // If a receipt was passed in to view, open it
  React.useEffect(() => {
    if (selectedReceiptId) {
      const found = receipts.find((r) => r.id === selectedReceiptId)
      if (found) setActiveReceipt(found)
    }
  }, [selectedReceiptId, receipts])

  const filteredReceipts = receipts.filter((rcp) => {
    if (currencyFilter !== "all" && rcp.currency !== currencyFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = rcp.receiptNumber.toLowerCase().includes(q)
      const matchCust = rcp.customerName.toLowerCase().includes(q)
      const matchFrom = rcp.receivedFrom.toLowerCase().includes(q)
      if (!matchNum && !matchCust && !matchFrom) return false
    }
    return true
  })

  const handleCopyWhatsApp = (rcp: FinanceReceiptRecord) => {
    const text = buildPaymentReceiptWhatsAppMessage(rcp)
    navigator.clipboard.writeText(text)
    setCopiedId(rcp.id)
    toast.success("Payment receipt message copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search receipt, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Currencies</option>
            <option value="USD">USD ($)</option>
            <option value="AED">AED</option>
            <option value="AFN">AFN</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Received From</th>
                  <th className="px-4 py-3">Applied Invoices</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No payment receipts found.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rcp) => (
                    <tr
                      key={rcp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {rcp.receiptNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rcp.receiptDate}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {rcp.receivedFrom}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rcp.appliedInvoices?.length > 0
                          ? rcp.appliedInvoices.join(", ")
                          : "Customer Credit"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rcp.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatMoney(rcp.amount, rcp.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-[10px] font-bold text-emerald-600"
                            onClick={() => handleCopyWhatsApp(rcp)}
                            title="Copy WhatsApp Receipt Message"
                          >
                            {copiedId === rcp.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Share2 className="h-3.5 w-3.5" />
                            )}
                            WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-[10px] font-bold"
                            onClick={() => setActiveReceipt(rcp)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PRINTABLE RECEIPT DIALOG */}
      {activeReceipt && (
        <Dialog
          open={Boolean(activeReceipt)}
          onOpenChange={() => {
            setActiveReceipt(null)
            if (onClearSelectedReceipt) onClearSelectedReceipt()
          }}
        >
          <DialogContent className="max-w-lg">
            <div className="rounded border border-slate-300 bg-white p-6 font-sans text-xs text-slate-900 shadow-sm">
              {/* Receipt Header */}
              <div className="border-b-2 border-slate-800 pb-3 text-center">
                <DialogTitle className="text-base font-black tracking-wider text-slate-900">
                  SKY ARIANA LIMITED
                </DialogTitle>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Official Payment Receipt
                </p>
              </div>

              {/* Receipt Body */}
              <div className="my-4 space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {activeReceipt.receiptNumber}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-500">Date:</span>
                  <span className="text-slate-800">{activeReceipt.receiptDate}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-500">Received From:</span>
                  <span className="font-bold text-slate-900">{activeReceipt.receivedFrom}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-500">Amount Paid:</span>
                  <span className="font-mono text-base font-black text-emerald-700">
                    {formatMoney(activeReceipt.amount, activeReceipt.currency)}
                  </span>
                </div>

                <div className="rounded bg-slate-50 p-2.5 border border-slate-200">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Amount in Words:
                  </span>
                  <p className="mt-0.5 font-serif italic text-slate-800">
                    &ldquo;{activeReceipt.amountInWords}&rdquo;
                  </p>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-500">Payment Mode:</span>
                  <span className="text-slate-800">{activeReceipt.paymentMethod}</span>
                </div>

                {activeReceipt.referenceNumber && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-500">Reference:</span>
                    <span className="font-mono text-slate-800">
                      {activeReceipt.referenceNumber}
                    </span>
                  </div>
                )}

                {activeReceipt.appliedInvoices?.length > 0 && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-500">Settled Invoices:</span>
                    <span className="font-semibold text-blue-700">
                      {activeReceipt.appliedInvoices.join(", ")}
                    </span>
                  </div>
                )}

                {activeReceipt.customerBalanceAfter !== undefined && (
                  <div className="flex justify-between border-t border-slate-300 pt-2 font-bold">
                    <span className="text-slate-700">Remaining Balance:</span>
                    <span className="font-mono text-slate-900">
                      {formatMoney(activeReceipt.customerBalanceAfter, activeReceipt.currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Authorized Footer */}
              <div className="mt-6 flex items-end justify-between border-t border-slate-300 pt-4 text-[10px]">
                <div>
                  <span className="text-slate-400">Authorized Signatory:</span>
                  <div className="mt-2 font-bold text-slate-800">
                    {activeReceipt.authorizedBy}
                  </div>
                </div>
                <div className="rounded border border-emerald-600/30 bg-emerald-50 px-2 py-1 text-center font-bold uppercase text-emerald-800">
                  Official Verification
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveReceipt(null)
                  if (onClearSelectedReceipt) onClearSelectedReceipt()
                }}
              >
                Close
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleCopyWhatsApp(activeReceipt)}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy WhatsApp Text
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 gap-1"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" /> Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
