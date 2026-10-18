"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QuotationRecord } from '@/lib/types/freight-pricing'
import { freightPricingService } from '@/lib/services/freight-pricing-service'
import { QuotationPdfView } from '@/components/pricing/quotation-pdf-view'
import {
  FileText,
  MessageSquare,
  Printer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRightCircle,
  Eye,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  Clock,
} from 'lucide-react'

interface QuotationDetailModalProps {
  open: boolean
  onClose: () => void
  quotation: QuotationRecord
  onUpdated: () => void
}

export function QuotationDetailModal({
  open,
  onClose,
  quotation,
  onUpdated,
}: QuotationDetailModalProps) {
  const [viewMode, setViewMode] = useState<'CUSTOMER' | 'INTERNAL'>('CUSTOMER')
  const [showPdf, setShowPdf] = useState(false)
  const [whatsappLang, setWhatsappLang] = useState<'EN' | 'FA' | 'PS'>('EN')
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false)
  const [conversionMessage, setConversionMessage] = useState<string | null>(null)

  const curr = quotation.currency || 'USD'

  const handleCopyWhatsapp = () => {
    const text = freightPricingService.generateWhatsAppOffer(quotation, whatsappLang)
    navigator.clipboard.writeText(text)
    setCopiedWhatsapp(true)
    setTimeout(() => setCopiedWhatsapp(false), 2500)
  }

  const handleAccept = () => {
    if (confirm(`Record customer acceptance for quote ${quotation.quotationNumber}?`)) {
      freightPricingService.recordQuotationAcceptance(quotation.id)
      onUpdated()
    }
  }

  const handleReject = () => {
    const reason = prompt('Please enter rejection reason (e.g. price too high, schedule mismatch):')
    if (reason !== null) {
      freightPricingService.recordQuotationRejection(quotation.id, reason)
      onUpdated()
    }
  }

  const handleRevise = () => {
    if (confirm(`Create Revision (Rev. ${quotation.revision + 1}) for ${quotation.quotationNumber}?`)) {
      freightPricingService.createQuotationRevision(quotation.id)
      onUpdated()
      onClose()
    }
  }

  const handleConvertToShipment = () => {
    if (confirm(`Convert quotation ${quotation.quotationNumber} into an active Shipment and Bill of Lading?`)) {
      const res = freightPricingService.convertQuotationToShipment(quotation.id)
      if (res.success) {
        setConversionMessage(`🎉 Converted! Created Shipment ${res.shipmentId} (BOL: ${res.bolNumber})`)
        onUpdated()
      } else {
        alert(res.message)
      }
    }
  }

  if (showPdf) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 bg-slate-100">
          <QuotationPdfView quotation={quotation} onClose={() => setShowPdf(false)} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span>Quotation {quotation.quotationNumber}</span>
                {quotation.revision > 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-mono text-[10px]">
                    Rev. {quotation.revision}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    quotation.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : quotation.status === 'CONVERTED'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : quotation.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : quotation.status === 'SENT'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {quotation.status}
                </span>
              </DialogTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Created on {quotation.date} • Valid until {quotation.validUntil}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode('CUSTOMER')}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  viewMode === 'CUSTOMER'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="h-3 w-3 inline mr-1" />
                Customer View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('INTERNAL')}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  viewMode === 'INTERNAL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Lock className="h-3 w-3 inline mr-1" />
                Internal (Buy & Margin)
              </button>
            </div>
          </div>
        </DialogHeader>

        {conversionMessage && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-900 dark:text-purple-200 text-xs font-semibold">
            {conversionMessage}
          </div>
        )}

        <div className="space-y-4 pt-2 text-xs">
          {/* Customer & Route Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Customer</span>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {quotation.customerName}
              </div>
              {quotation.customerContact && (
                <div className="text-slate-500">Contact: {quotation.customerContact} ({quotation.customerPhone || 'No Phone'})</div>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Route & Equipment</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {quotation.originName} → {quotation.destinationName}
              </div>
              <div className="text-slate-500 mt-0.5">
                {quotation.containerQuantity} × {quotation.containerType} ({quotation.serviceType.replace('_', ' ')})
                {quotation.temperature ? ` • Temp: ${quotation.temperature}` : ''}
              </div>
            </div>
          </div>

          {/* Pricing Lines Table */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-2">
              Itemized Quotation Charges ({viewMode === 'CUSTOMER' ? 'Customer Selling Price' : 'Internal Buy vs Sell'})
            </h4>

            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Service Line</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  {viewMode === 'INTERNAL' && (
                    <th className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">
                      Buy Cost ({curr})
                    </th>
                  )}
                  <th className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">
                    Sell Price ({curr})
                  </th>
                  {viewMode === 'INTERNAL' && (
                    <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      Est. Margin
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotation.pricingLines.map((line, idx) => {
                  const buyLine = (line.buyAmount || 0) * (line.quantity || 1)
                  const sellLine = (line.sellAmount || 0) * (line.quantity || 1)
                  const marginLine = sellLine - buyLine

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {line.chargeName}
                        </span>
                        {line.isIncludedInFreight && (
                          <span className="ml-2 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] font-bold">
                            INCLUDED
                          </span>
                        )}
                        {line.isOptional && (
                          <span className="ml-2 px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 text-[9px]">
                            OPTIONAL
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{line.quantity}</td>
                      {viewMode === 'INTERNAL' && (
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                          {buyLine.toLocaleString()}
                        </td>
                      )}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {line.isIncludedInFreight ? '0.00' : sellLine.toLocaleString()}
                      </td>
                      {viewMode === 'INTERNAL' && (
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          +{marginLine.toLocaleString()}
                        </td>
                      )}
                    </tr>
                  )
                })}

                {/* Discount */}
                {quotation.discountAmount > 0 && (
                  <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                    <td colSpan={viewMode === 'INTERNAL' ? 3 : 2} className="py-1.5 px-3 font-semibold text-emerald-700">
                      Discount Applied ({quotation.discountType})
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                      - {quotation.discountAmount.toLocaleString()}
                    </td>
                    {viewMode === 'INTERNAL' && <td></td>}
                  </tr>
                )}

                {/* Totals */}
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                  <td colSpan={viewMode === 'INTERNAL' ? 2 : 1} className="py-2.5 px-3 uppercase text-slate-700 dark:text-slate-300">
                    Grand Total ({curr})
                  </td>
                  {viewMode === 'INTERNAL' && (
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 dark:text-rose-300">
                      {quotation.totalBuyCost.toLocaleString()}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono text-base text-blue-700 dark:text-blue-300">
                    {curr} {quotation.totalSellPrice.toLocaleString()}
                  </td>
                  {viewMode === 'INTERNAL' && (
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300">
                      +{quotation.estimatedGrossMargin.toLocaleString()} ({quotation.marginPercentage}%)
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Internal Margin Analysis (Only visible in INTERNAL mode) */}
          {viewMode === 'INTERNAL' && (
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  Estimated Gross Margin: {curr} {quotation.estimatedGrossMargin.toLocaleString()} ({quotation.marginPercentage}%)
                </p>
                <p className="text-[11px] text-slate-500">
                  Strict Invariant: Logistics margin estimate only. Actual shipment net profit is calculated in Accounting & Finance after all carrier invoices are posted.
                </p>
              </div>

              {quotation.marginPercentage < 5 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Low Margin Warning (&lt; 5%)</span>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp Copy Panel */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <span className="font-bold text-slate-800 dark:text-slate-200">Customer WhatsApp Offer:</span>
              <div className="flex gap-1">
                {(['EN', 'FA', 'PS'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setWhatsappLang(lang)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      whatsappLang === lang
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lang === 'EN' ? 'English' : lang === 'FA' ? 'فارسی / Dari' : 'پښتو'}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleCopyWhatsapp}
              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {copiedWhatsapp ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copiedWhatsapp ? 'Copied to Clipboard!' : 'Copy WhatsApp Offer'}
            </Button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdf(true)}
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Print / PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRevise}
              className="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Create Revision
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            {quotation.status !== 'ACCEPTED' && quotation.status !== 'CONVERTED' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Mark Rejected
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Record Acceptance
                </Button>
              </>
            )}

            {quotation.status === 'ACCEPTED' && !quotation.convertedShipmentId && (
              <Button
                size="sm"
                onClick={handleConvertToShipment}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                Convert to Active Shipment / BOL
              </Button>
            )}

            {quotation.convertedShipmentId && (
              <span className="px-3 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-xs">
                Converted: {quotation.convertedShipmentId}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
