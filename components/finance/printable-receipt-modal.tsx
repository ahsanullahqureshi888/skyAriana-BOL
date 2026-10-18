"use client"

import React, { useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, X, Receipt, CheckCircle2 } from "lucide-react"
import { PaymentReceiptRecord } from "@/lib/types/bol-accounting"

interface PrintableReceiptModalProps {
  open: boolean
  onClose: () => void
  receipt: PaymentReceiptRecord | null
}

export function PrintableReceiptModal({
  open,
  onClose,
  receipt,
}: PrintableReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!receipt) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-slate-100 border-none print:m-0 print:p-0 print:max-w-none print:shadow-none">
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <DialogTitle className="text-lg font-bold text-slate-800">
              Payment Receipt — {receipt.receipt_number}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Receipt Card */}
        <div
          ref={printRef}
          className="mx-auto my-6 p-8 bg-white shadow-md rounded-xl max-w-[550px] text-slate-800 print:shadow-none print:rounded-none print:my-0 print:p-6 print:max-w-full"
        >
          {/* Header */}
          <div className="text-center border-b pb-4 mb-5">
            <h1 className="text-xl font-black tracking-tight text-blue-950 uppercase">
              SKY ARIANA LIMITED
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Official Accounting Payment Receipt
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Payment Confirmed
            </div>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between text-xs mb-4 text-slate-600">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Receipt No</p>
              <p className="font-mono font-bold text-slate-900 text-sm">{receipt.receipt_number}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
              <p className="font-medium text-slate-900">{receipt.date}</p>
            </div>
          </div>

          {/* Core Payment Details Box */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 mb-5">
            <div className="flex justify-between">
              <span className="text-slate-500">Received From:</span>
              <span className="font-bold text-slate-900">{receipt.received_from || receipt.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account:</span>
              <span className="font-medium text-slate-800">{receipt.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-medium text-slate-800">{receipt.payment_method}</span>
            </div>
            {receipt.reference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reference / Check / Tx:</span>
                <span className="font-mono text-slate-800">{receipt.reference}</span>
              </div>
            )}
            {receipt.applied_invoice && (
              <div className="flex justify-between">
                <span className="text-slate-500">Applied Invoice:</span>
                <span className="font-mono text-blue-800">{receipt.applied_invoice}</span>
              </div>
            )}
            {receipt.applied_bol && (
              <div className="flex justify-between">
                <span className="text-slate-500">Applied BOL:</span>
                <span className="font-mono text-blue-800">{receipt.applied_bol}</span>
              </div>
            )}
          </div>

          {/* Amount Paid Callout */}
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center mb-5">
            <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
              Amount Received
            </span>
            <div className="text-2xl font-mono font-black text-emerald-900 mt-0.5">
              {receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
              <span className="text-sm font-sans font-bold">{receipt.currency}</span>
            </div>
          </div>

          {/* Balance Remaining & Overpayment Credit */}
          <div className="space-y-1 text-xs border-t pt-3 mb-6">
            <div className="flex justify-between text-slate-600">
              <span>Remaining Invoice Balance:</span>
              <span className="font-mono font-bold text-slate-900">
                {receipt.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                {receipt.currency}
              </span>
            </div>
            {receipt.unallocated_credit && receipt.unallocated_credit > 0 ? (
              <div className="flex justify-between text-emerald-700 bg-emerald-50/70 p-1.5 rounded">
                <span>Unallocated Customer Credit:</span>
                <span className="font-mono font-bold">
                  +{receipt.unallocated_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  {receipt.currency}
                </span>
              </div>
            ) : null}
          </div>

          {/* Footer Signature */}
          <div className="flex justify-between items-end pt-4 border-t text-[11px] text-slate-500">
            <div>
              <p>Received By: <span className="font-medium text-slate-800">{receipt.received_by}</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sky Ariana Finance & Accounts</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-300 w-28 mb-1"></div>
              <p className="text-[10px]">Official Stamp / Seal</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
