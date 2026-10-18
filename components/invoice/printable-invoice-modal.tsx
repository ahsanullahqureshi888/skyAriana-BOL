"use client"

import React, { useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer, Download, X, Building2, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { requestDocumentGeneration, triggerBrowserDownload } from "@/lib/api/document-client"

interface PrintableInvoiceModalProps {
  open: boolean
  onClose: () => void
  invoice: any
  bolData?: any
}

export function PrintableInvoiceModal({
  open,
  onClose,
  invoice,
  bolData,
}: PrintableInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false)

  if (!invoice) return null

  const handlePrint = () => {
    window.print()
  }

  const handleServerPdfDownload = async () => {
    setIsGeneratingPdf(true)
    try {
      const itemsList = (Array.isArray(invoice.items) ? invoice.items : []).map((it: any) => ({
        description: it.description || "Logistics Services",
        quantity: Number(it.quantity || 1),
        unit: it.unit || "CTNS",
        unit_price: Number(it.rate || it.unit_price || 0),
        amount: Number(it.amount || 0),
      }))

      if (itemsList.length === 0) {
        itemsList.push({
          description: invoice.notes || "Freight Forwarding Charges",
          quantity: 1,
          unit: "LUMP_SUM",
          unit_price: Number(invoice.freight_charges || invoice.amount || 0),
          amount: Number(invoice.freight_charges || invoice.amount || 0),
        })
      }

      const res = await requestDocumentGeneration(
        "invoice",
        {
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date || new Date().toISOString().split("T")[0],
          bol_number: invoice.bol_number || bolData?.bol_number || "",
          currency: invoice.currency || "USD",
          exporter_name: invoice.company_name || "SKY ARIANA LIMITED",
          consignee_name: invoice.billed_to || invoice.customer_name || "Consignee",
          items: itemsList,
          discount: Number(invoice.discount || 0),
          tax: Number(invoice.tax || 0),
          remarks: invoice.notes || "",
        },
        { asyncJob: false }
      )

      if (res.success && res.downloadUrl) {
        triggerBrowserDownload(res.downloadUrl, `${invoice.invoice_number}.pdf`)
        toast.success("Authoritative Commercial Invoice PDF downloaded!")
      } else {
        window.print()
      }
    } catch (err: any) {
      console.warn("Server PDF error, fallback to browser print:", err)
      window.print()
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const items = Array.isArray(invoice.items) ? invoice.items : []
  const subtotal = Number(invoice.freight_charges || 0)
  const tax = Number(invoice.tax || 0)
  const discount = Number(invoice.discount || 0)
  const grandTotal = subtotal - discount + tax

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-slate-100 border-none print:m-0 print:p-0 print:max-w-none print:shadow-none">
        {/* Modal Toolbar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-lg font-bold text-slate-800">
              Tax Invoice — {invoice.invoice_number}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleServerPdfDownload}
              disabled={isGeneratingPdf}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Fast PDF Export
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable A4 Sheet */}
        <div
          ref={printRef}
          className="mx-auto my-6 p-8 bg-white shadow-lg rounded-xl max-w-[800px] text-slate-800 print:shadow-none print:rounded-none print:my-0 print:p-6 print:max-w-full"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-blue-900 uppercase">
                SKY ARIANA LIMITED
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                International Freight Forwarding & Multi-Modal Logistics
              </p>
              <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                <p>Kabul • Herat • Bandar Abbas • Dubai</p>
                <p>Email: info@skyariana.com | Web: www.skyariana.com</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded font-bold text-sm tracking-wider uppercase mb-2 border border-blue-200">
                {invoice.invoice_type || "FREIGHT INVOICE"}
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Invoice No: <span className="font-mono">{invoice.invoice_number}</span>
              </p>
              <p className="text-xs text-slate-500">Date: {invoice.invoice_date}</p>
              <p className="text-xs text-slate-500">Due Date: {invoice.due_date || "Due on receipt"}</p>
            </div>
          </div>

          {/* Billed To & Shipment Metadata */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-6">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                BILLED TO / CUSTOMER
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {invoice.buyer_name || "Valued Customer"}
              </p>
              {invoice.buyer_address && <p className="text-slate-600 mt-0.5">{invoice.buyer_address}</p>}
              {invoice.buyer_contact && <p className="text-slate-600">Contact: {invoice.buyer_contact}</p>}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                SHIPMENT DETAILS
              </span>
              <div className="mt-1 space-y-0.5 text-slate-700">
                <p>
                  <span className="font-medium text-slate-500">BOL No:</span>{" "}
                  <span className="font-mono font-bold text-blue-900">{invoice.bl_no || "—"}</span>
                </p>
                {(invoice.origin || invoice.destination) && (
                  <p>
                    <span className="font-medium text-slate-500">Route:</span> {invoice.origin || "—"} →{" "}
                    {invoice.destination || "—"}
                  </p>
                )}
                {invoice.container_no && (
                  <p>
                    <span className="font-medium text-slate-500">Container:</span> {invoice.container_no}
                  </p>
                )}
                {invoice.truck_no && (
                  <p>
                    <span className="font-medium text-slate-500">Truck:</span> {invoice.truck_no}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-xs text-left border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50">
                <th className="py-2.5 px-3 font-bold text-slate-600">#</th>
                <th className="py-2.5 px-3 font-bold text-slate-600">Description</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-600">Qty</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-600">Rate</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-600">Amount ({invoice.currency || "USD"})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it: any, idx: number) => {
                const qty = Number(it.quantity) || 1
                const rate = Number(it.unitPrice) || 0
                const lineAmt = qty * rate
                return (
                  <tr key={it.id || idx}>
                    <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {it.description}
                      {it.containerNo && (
                        <span className="block text-[11px] text-slate-500">
                          Container: {it.containerNo}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {lineAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono font-medium">
                  {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {invoice.currency || "USD"}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 border-b text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">
                    -{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Tax:</span>
                  <span className="font-mono">
                    +{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-blue-950">
                  {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {invoice.currency || "USD"}
                </span>
              </div>
            </div>
          </div>

          {/* Banking / Instructions */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 mb-6">
            <p className="font-bold text-slate-800 mb-1">Bank Payment Instructions:</p>
            <p>Please quote Invoice Number <span className="font-mono font-bold">{invoice.invoice_number}</span> on bank transfer reference.</p>
            <p className="mt-1 text-[11px] text-slate-500">Payment Terms: {invoice.payment_terms || "Net 30"}. Thank you for your business.</p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between pt-6 border-t text-xs text-slate-500">
            <div>
              <p className="font-medium text-slate-800">Authorized Signature</p>
              <div className="mt-8 border-b border-slate-300 w-40"></div>
              <p className="mt-1 text-[10px]">Sky Ariana Accounts Dept.</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-slate-800">Client Acceptance</p>
              <div className="mt-8 border-b border-slate-300 w-40 ml-auto"></div>
              <p className="mt-1 text-[10px]">Sign & Date</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
