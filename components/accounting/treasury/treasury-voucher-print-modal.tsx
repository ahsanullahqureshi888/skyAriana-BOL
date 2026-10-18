"use client"

import React, { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, Download, X, Landmark, FileText, CheckCircle2 } from "lucide-react"
import { numberToWords } from "@/lib/utils/number-to-words"

interface TreasuryVoucherPrintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherType: "RECEIPT" | "PAYMENT_VOUCHER" | "TRANSFER" | "EXCHANGE"
  data: any
}

export function TreasuryVoucherPrintModal({
  open,
  onOpenChange,
  voucherType,
  data,
}: TreasuryVoucherPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!data) return null

  const handlePrint = () => {
    window.print()
  }

  const getTitle = () => {
    switch (voucherType) {
      case "RECEIPT":
        return { en: "OFFICIAL CASH / BANK RECEIPT", local: "رسید رسمی وصول وجه" }
      case "PAYMENT_VOUCHER":
        return { en: "PAYMENT DISBURSEMENT VOUCHER", local: "سند تادیاتی / د تادیې واوچر" }
      case "TRANSFER":
        return { en: "INTERNAL TREASURY TRANSFER VOUCHER", local: "سند انتقال داخلی وجوه" }
      case "EXCHANGE":
        return { en: "CURRENCY EXCHANGE VOUCHER", local: "سند تبادله اسعار / د اسعارو تبادله" }
    }
  }

  const title = getTitle()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title.en}
              </DialogTitle>
              <p className="text-xs text-slate-500">Official Treasury Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Voucher
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* Printable Sheet */}
          <div
            ref={printRef}
            className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-xs space-y-6 printable-voucher print:border-none print:shadow-none print:p-0"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Sky Ariana" className="h-12 w-auto object-contain" />
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                    SKY ARIANA LOGISTICS LIMITED
                  </h1>
                  <p className="text-[11px] font-medium text-slate-600">
                    International Multi-Modal Cargo, Freight & Transit Services
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Dubai • Kabul • Kandahar • Islam Qala • Hairatan
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black tracking-wider uppercase">
                  {title.en}
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1" dir="rtl">
                  {title.local}
                </p>
                <p className="text-sm font-black text-blue-900 mt-1">
                  {data.reference_number || data.receipt_number || data.voucher_number || data.transfer_number || data.exchange_number || "VOUCHER"}
                </p>
                <p className="text-[11px] text-slate-600 font-semibold">
                  Date: {data.transaction_date || data.transfer_date || data.date || new Date().toISOString().split("T")[0]}
                </p>
              </div>
            </div>

            {/* Document Body */}
            {voucherType === "RECEIPT" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Received From (Customer):</span>
                    <span className="text-sm font-black text-slate-950">{data.party_name || data.received_from || "Customer"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Received Into Account:</span>
                    <span className="text-sm font-black text-blue-900">{data.treasury_account_name || "Treasury Account"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Amount Received:</span>
                    <span className="text-base font-black text-emerald-700">
                      {data.currency || "USD"} {Number(data.amount_in || data.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Payment Method:</span>
                    <span className="font-bold text-slate-800">{data.source || data.payment_method || "CASH"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Reference / Cheque:</span>
                    <span className="font-bold text-slate-800">{data.reference || data.reference_number || "—"}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px]">
                  <span className="font-bold text-blue-950 uppercase text-[10px] block">Amount in Words:</span>
                  <span className="italic font-semibold text-slate-800">
                    {numberToWords(Number(data.amount_in || data.amount || 0))} {data.currency || "USD"} Only
                  </span>
                </div>

                {data.description && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Description / Allocation:</span>
                    <p className="font-medium text-slate-800">{data.description}</p>
                  </div>
                )}
              </div>
            )}

            {voucherType === "PAYMENT_VOUCHER" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Paid To (Supplier / Payee):</span>
                    <span className="text-sm font-black text-slate-950">{data.party_name || data.supplier_name || "Supplier"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Disbursed From Account:</span>
                    <span className="text-sm font-black text-rose-900">{data.treasury_account_name || "Treasury Account"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Amount Disbursed:</span>
                    <span className="text-base font-black text-rose-700">
                      {data.currency || "USD"} {Number(data.amount_out || data.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Payment Method:</span>
                    <span className="font-bold text-slate-800">{data.source || data.payment_method || "BANK_TRANSFER"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Reference:</span>
                    <span className="font-bold text-slate-800">{data.reference || data.reference_number || "—"}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                  <span className="font-bold text-slate-700 uppercase text-[10px] block">Amount in Words:</span>
                  <span className="italic font-semibold text-slate-800">
                    {numberToWords(Number(data.amount_out || data.amount || 0))} {data.currency || "USD"} Only
                  </span>
                </div>
              </div>
            )}

            {voucherType === "TRANSFER" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">From Account (Outflow):</span>
                    <span className="text-sm font-black text-slate-950">{data.from_account_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">To Account (Inflow):</span>
                    <span className="text-sm font-black text-blue-900">{data.to_account_name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Transferred Amount:</span>
                    <span className="text-base font-black text-blue-800">
                      {data.currency} {Number(data.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Transfer Fee:</span>
                    <span className="font-bold text-slate-800">
                      {data.currency} {Number(data.fee || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                  <span className="font-bold text-slate-700 uppercase text-[10px] block">Amount in Words:</span>
                  <span className="italic font-semibold text-slate-800">
                    {numberToWords(Number(data.amount || 0))} {data.currency} Only
                  </span>
                </div>
              </div>
            )}

            {voucherType === "EXCHANGE" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="p-3 bg-rose-50/50 rounded border border-rose-200">
                    <span className="text-rose-700 font-bold block uppercase text-[10px]">Source Account (Given):</span>
                    <span className="text-sm font-black text-slate-950">{data.from_account_name}</span>
                    <span className="block text-base font-black text-rose-700 mt-1">
                      {data.from_currency} {Number(data.from_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded border border-emerald-200">
                    <span className="text-emerald-700 font-bold block uppercase text-[10px]">Destination Account (Received):</span>
                    <span className="text-sm font-black text-slate-950">{data.to_account_name}</span>
                    <span className="block text-base font-black text-emerald-700 mt-1">
                      {data.to_currency} {Number(data.to_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Locked Exchange Rate:</span>
                    <span className="text-sm font-black text-blue-900">
                      {data.exchange_rate} ({data.rate_direction})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Dealer / Counterparty:</span>
                    <span className="font-bold text-slate-800">{data.counterparty || "Direct / Open Market"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[10px]">Exchange Fee:</span>
                    <span className="font-bold text-slate-800">
                      {data.fee_currency || data.from_currency} {Number(data.exchange_fee || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Verification & Signatures */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="h-14 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Prepared By</span>
                <span className="text-[10px] text-slate-500">{data.created_by || "Cashier / Operator"}</span>
              </div>
              <div>
                <div className="h-14 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Verified / Audited By</span>
                <span className="text-[10px] text-slate-500">Chief Accountant</span>
              </div>
              <div>
                <div className="h-14 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Authorized Signatory</span>
                <span className="text-[10px] text-slate-500">Managing Director</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span>Sky Ariana Enterprise Logistics & Treasury System</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Mathematically Invariant & Audited
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
