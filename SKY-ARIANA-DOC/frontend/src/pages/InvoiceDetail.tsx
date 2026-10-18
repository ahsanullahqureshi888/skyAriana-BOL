import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '../services/api'
import { useApp } from '../App'
import { normalizeInvoiceParty } from '../utils/invoiceParty'
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Edit3, 
  DollarSign
} from 'lucide-react'

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useApp()
  const queryClient = useQueryClient()
  
  const invoiceId = parseInt(id || '0')

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: !!invoiceId
  })

  const { data: payments } = useQuery({
    queryKey: ['invoicePayments', invoiceId],
    queryFn: () => invoicesApi.getPayments(invoiceId),
    enabled: !!invoiceId
  })

  const [showPayModal, setShowPayModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Bank Transfer')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')

  const paymentMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.recordPayment(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoicePayments', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowPayModal(false)
      setAmount('')
      setRef('')
      setNotes('')
    }
  })

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    paymentMutation.mutate({
      amount: parseFloat(amount),
      payment_method: method,
      payment_date: date,
      reference_number: ref || undefined,
      notes: notes || undefined
    })
  }

  const handleDownloadPdf = () => {
    const token = localStorage.getItem('token') || ''
    window.open(invoicesApi.getPdfUrl(invoiceId, token), '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
        Failed to load invoice details. Make sure the invoice ID is valid.
      </div>
    )
  }

  const shipper = normalizeInvoiceParty(invoice.shipperExporter, true)
  const shipperAddressLines = shipper
    ? [
        shipper.addressLine1 || shipper.address,
        shipper.addressLine2,
        [shipper.city, shipper.state, shipper.postalCode].filter(Boolean).join(', '),
        shipper.country,
      ].filter((line, index, lines) => Boolean(line) && lines.indexOf(line) === index)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 hover:bg-slate-100 border border-slate-200 bg-white rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Invoice Details
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                invoice.status === 'paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                invoice.status === 'unpaid' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {invoice.status}
              </span>
            </h2>
            <p className="text-slate-400 text-sm">Invoice Number: {invoice.invoice_number}</p>
            <p className="mt-1 text-[11px] font-semibold text-blue-700">Template: {invoice.invoice_template === 'premium_afghan_heritage' ? 'Premium Afghan Heritage' : invoice.invoice_template === 'classic_afghan_blue_gold' ? 'Classic Afghan Blue & Gold' : 'Premium Afghan Glass'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status !== 'paid' && (
            <button
              onClick={() => {
                setAmount(invoice.remaining_balance.toString())
                setShowPayModal(true)
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <DollarSign size={16} />
              Record Payment
            </button>
          )}
          <Link
            to={`/invoices/${invoiceId}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </Link>
          <button
            onClick={() => navigate(`/invoice/${invoiceId}/print`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <Printer size={16} />
            Print Preview
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Seller / Exporter</span>
              {shipper ? (
                <>
                  <span className="font-bold text-slate-800 block text-base">{shipper.companyName || '—'}</span>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    {shipperAddressLines.map((line) => <span key={line} className="block">{line}</span>)}
                    {shipper.licenseNumber && <span className="block mt-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded inline-block">Licence: {shipper.licenseNumber}</span>}
                    {shipper.taxNumber && <span className="block mt-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded inline-block">TIN: {shipper.taxNumber}</span>}
                  </p>
                </>
              ) : <p className="text-slate-400 text-sm mt-2">No shipper details.</p>}
            </div>
            
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Buyer / Consignee</span>
              <span className="font-bold text-slate-800 block text-base">{invoice.customer?.company_name}</span>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {invoice.customer?.address && <span className="block">{invoice.customer.address}</span>}
                {invoice.customer?.country && <span className="block">{invoice.customer.country}</span>}
                {invoice.customer?.tax_number && <span className="block mt-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded inline-block">TIN: {invoice.customer.tax_number}</span>}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Commodity & Pricing</h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="p-4 w-12">No</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">HS Code</th>
                  <th className="p-4 text-right">Qty</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4 text-right">Price</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="p-4 text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-semibold text-slate-700">{item.description}</td>
                    <td className="p-4 font-mono text-slate-500 text-xs">{item.hs_code || 'N/A'}</td>
                    <td className="p-4 text-right font-medium">{item.quantity}</td>
                    <td className="p-4 text-slate-500 capitalize">{item.unit}</td>
                    <td className="p-4 text-right">{invoice.currency} {parseFloat(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-bold">{invoice.currency} {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invoice.shipment_details && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Shipment & Logistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Vessel / Voyage</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {invoice.shipment_details.vessel_name || 'N/A'} {invoice.shipment_details.voyage_number ? `v.${invoice.shipment_details.voyage_number}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Port of Loading</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.port_of_loading || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Port of Discharge</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.port_of_discharge || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Incoterms</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.incoterms || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Container / Seal</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.container_number || 'N/A'} / {invoice.shipment_details.seal_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Gross Weight</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.gross_weight ? `${invoice.shipment_details.gross_weight} kg` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Package Count</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.package_count || 'N/A'} {invoice.shipment_details.package_type || ''}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">B/L / AWB No</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">{invoice.shipment_details.bill_of_lading_number || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Financial Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{invoice.currency} {parseFloat(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(invoice.freight || 0) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Freight</span>
                  <span>{invoice.currency} {parseFloat(invoice.freight).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {parseFloat(invoice.insurance || 0) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Insurance</span>
                  <span>{invoice.currency} {parseFloat(invoice.insurance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {parseFloat(invoice.other_charges || 0) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Other Charges</span>
                  <span>{invoice.currency} {parseFloat(invoice.other_charges).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {parseFloat(invoice.discount || 0) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-{invoice.currency} {parseFloat(invoice.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {parseFloat(invoice.tax || 0) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>VAT / Tax</span>
                  <span>{invoice.currency} {parseFloat(invoice.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-slate-800 border-t border-slate-100 pt-3">
                <span>Grand Total</span>
                <span>{invoice.currency} {parseFloat(invoice.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Paid Amount</span>
                <span>{invoice.currency} {parseFloat(invoice.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-orange-600 border-t border-slate-100 pt-2.5">
                <span>Remaining Balance</span>
                <span>{invoice.currency} {parseFloat(invoice.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Payment History</h3>
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              {payments?.map((pay: any) => (
                <div key={pay.id} className="border-b border-slate-50 pb-3 text-sm">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{pay.payment_method}</span>
                    <span className="text-emerald-600">+{pay.currency} {parseFloat(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{pay.payment_date}</span>
                    {pay.reference_number && <span>Ref: {pay.reference_number}</span>}
                  </div>
                  {pay.notes && <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-1.5 rounded">{pay.notes}</p>}
                </div>
              ))}
              {(!payments || payments.length === 0) && (
                <p className="text-center text-slate-400 text-xs py-4">No payments recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-left" dir="ltr">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-500" />
                Record Payment
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Amount ({invoice.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reference Number / Transaction ID</label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. TXN-90812"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
                >
                  {paymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceDetail
