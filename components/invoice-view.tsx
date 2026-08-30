"use client"

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Printer, FileText, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApp } from '@/lib/app-context'
import { Invoice, InvoiceItem } from '@/lib/types'
import Image from 'next/image'

const emptyInvoice: Omit<Invoice, 'id' | 'companyId' | 'companyName'> = {
  invoiceNo: '',
  date: new Date().toISOString().split('T')[0],
  shipper: '',
  consignee: '',
  origin: '',
  destination: '',
  blNo: '',
  containers: '',
  items: [],
  exchangeRate: 168000,
  preparedBy: '',
  grandTotal: 0,
}

const emptyItem: Omit<InvoiceItem, 'id' | 'sNo'> = {
  description: '',
  containerSize: '',
  quantity: '',
  unit: '',
  grossWeight: '',
  price: 0,
  detentionDetails: '',
}

function InvoicePrintPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const existing = document.getElementById("sky-invoice-print-root") as HTMLDivElement | null
    const root = existing || document.createElement("div")

    root.id = "sky-invoice-print-root"
    root.className = "invoice-print-root"
    root.setAttribute("data-print-root", "true")
    document.body.appendChild(root)
    setContainer(root)

    return () => {
      if (!existing && root.parentElement === document.body) {
        document.body.removeChild(root)
      }
    }
  }, [])

  if (!container) return null
  return createPortal(children, container)
}

export function InvoiceView() {
  const { currentAccount, currentCompany, invoices, addInvoice, deleteInvoice, setView } = useApp()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [newInvoice, setNewInvoice] = useState(emptyInvoice)
  const [newItem, setNewItem] = useState(emptyItem)

  if (!currentAccount || !currentCompany) return null

  const companyInvoices = invoices.filter(inv => inv.companyId === currentCompany.id)

  const handleAddItem = () => {
    if (newItem.description.trim()) {
      const item: InvoiceItem = {
        ...newItem,
        id: crypto.randomUUID(),
        sNo: newInvoice.items.length + 1,
      }
      const updatedItems = [...newInvoice.items, item]
      const grandTotal = updatedItems.reduce((sum, i) => sum + i.price, 0)
      setNewInvoice({ ...newInvoice, items: updatedItems, grandTotal })
      setNewItem(emptyItem)
    }
  }

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = newInvoice.items
      .filter(i => i.id !== itemId)
      .map((item, index) => ({ ...item, sNo: index + 1 }))
    const grandTotal = updatedItems.reduce((sum, i) => sum + i.price, 0)
    setNewInvoice({ ...newInvoice, items: updatedItems, grandTotal })
  }

  const handleCreateInvoice = () => {
    if (newInvoice.invoiceNo.trim()) {
      addInvoice({
        ...newInvoice,
        companyId: currentCompany.id,
        companyName: currentCompany.name,
      })
      setNewInvoice(emptyInvoice)
      setIsCreateOpen(false)
    }
  }

  const handlePrint = () => {
    document.body.classList.remove('ledger-landscape-active')
    document.body.removeAttribute('data-print-mode')
    document.documentElement.removeAttribute('data-print-mode')
    document.body.setAttribute('data-print-active', 'invoice')
    document.documentElement.setAttribute('data-print-active', 'invoice')

    const cleanup = () => {
      document.body.removeAttribute('data-print-active')
      document.documentElement.removeAttribute('data-print-active')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    setTimeout(() => {
      window.print()
      setTimeout(cleanup, 2500)
    }, 50)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Invoice Preview Component
  if (selectedInvoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 no-print">
          <Button
            variant="outline"
            className="gap-2 bg-white/30 hover:bg-white/50"
            onClick={() => setSelectedInvoice(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          <Button variant="outline" className="gap-2 bg-white/30 hover:bg-white/50" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
        </div>

        <Card className="glass overflow-hidden max-w-4xl mx-auto">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 border-b border-border/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Image src="/logo.png" alt="Logo" width={100} height={75} className="object-contain" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">SKY ARIANA LIMITED</h1>
                  <p className="text-sm text-muted-foreground">شرکت حمل ونقل بین المللی سکای آریانا لمیتد</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Safe, Fast & Reliable Transport Services
                  </p>
                  <p className="text-xs text-muted-foreground">
                    خدمات خوندي، چټک او باوري ترانسپورت
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block bg-primary/10 px-4 py-2 rounded-lg">
                  <h2 className="text-xl font-bold text-primary">INVOICE</h2>
                  <p className="text-sm font-medium">{selectedInvoice.invoiceNo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-6 border-b border-border/50">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">DATE:</span>
                  <span>{selectedInvoice.date}</span>
                </div>
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">SHIPPER:</span>
                  <span>{selectedInvoice.shipper}</span>
                </div>
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">CONSIGNEE:</span>
                  <span>{selectedInvoice.consignee}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">B/L NO:</span>
                  <span>{selectedInvoice.blNo}</span>
                </div>
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">CONTAINERS:</span>
                  <span>{selectedInvoice.containers}</span>
                </div>
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">Origin:</span>
                  <span>{selectedInvoice.origin}</span>
                </div>
                <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">Destination:</span>
                  <span>{selectedInvoice.destination}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-center w-16">
                    <div>S.NO</div>
                    <div className="text-xs">شمېره</div>
                  </TableHead>
                  <TableHead>
                    <div>DESCRIPTIONS</div>
                    <div className="text-xs">تفصیل / محصول تفصیل</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div>CONTAINER SIZE</div>
                    <div className="text-xs">د کانټینر اندازه</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div>QUANTITY</div>
                    <div className="text-xs">تعداد</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div>UNIT</div>
                    <div className="text-xs">واحد</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div>GROSS-WEIGHT</div>
                    <div className="text-xs">ناخالص وزن</div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div>PRICE</div>
                    <div className="text-xs">قیمت</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedInvoice.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-medium">{item.sNo}</TableCell>
                    <TableCell>
                      <div>{item.description}</div>
                      {item.detentionDetails && (
                        <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                          {item.detentionDetails}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.containerSize}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-center">{item.grossWeight}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                  </TableRow>
                ))}
                {/* Grand Total */}
                <TableRow className="bg-primary/10 font-semibold">
                  <TableCell colSpan={6} className="text-right">Grand Total / مجموعه</TableCell>
                  <TableCell className="text-right font-mono text-primary text-lg">
                    {formatCurrency(selectedInvoice.grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Exchange Rate */}
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium">EX-CHANGE-RATE:</span> {selectedInvoice.exchangeRate.toLocaleString()}
            </div>
          </div>

          {/* Invoice Footer */}
          <div className="p-6 bg-muted/30 border-t border-border/50">
            <div className="flex justify-between items-end">
              <div className="text-sm">
                <p className="font-medium">Prepared By:</p>
                <p>{selectedInvoice.preparedBy}</p>
                <div className="mt-4 w-40 border-t border-foreground/30 pt-1 text-center">
                  <p className="text-xs text-muted-foreground">Signature</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">Thank you for your business and cooperation.</p>
                <p className="text-muted-foreground">ستاسو د همکارۍ او باور څخه مننه</p>
                <p className="text-xs text-muted-foreground mt-2">For any inquiry please contact our office.</p>
              </div>
            </div>
          </div>

          {/* Office Info */}
          <div className="p-4 bg-primary/5 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">AFGHANISTAN OFFICE</p>
                <p>2nd FLOOR, 16 NO. OFFICE, SHAHIDANO CHOWK</p>
                <p>KANDAHAR, AFGHANISTAN</p>
                <p>MOB: +93 700 939 365, +93711 4355 29</p>
                <p>EMAIL: info@skyariana.com</p>
              </div>
              <div className="text-right">
                <p className="font-medium">IRAN OFFICE</p>
                <p>CUBIC BUILDING - BANDAR ABBASS - IRAN</p>
                <p>P.O.BOX: 7913973295</p>
                <p>CELL PHONE: +9809172325086</p>
                <p>EMAIL: info@balambarbaran.com</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Invoice Print Portal */}
        <InvoicePrintPortal>
          <div data-print-root="true" className="invoice-print-root p-6 bg-white text-slate-900 font-sans">
            {/* Print Header */}
            <div className="flex items-start justify-between border-b-2 border-blue-900 pb-4 mb-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="SKY ARIANA LIMITED Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h1 className="text-xl font-bold text-blue-950">SKY ARIANA LIMITED</h1>
                  <p className="text-xs text-blue-800 font-semibold">شرکت حمل ونقل بین المللی سکای آریانا لمیتد</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Safe, Fast & Reliable Transport Services</p>
                  <p className="text-[10px] text-slate-600">خدمات خوندي، چټک او باوري ترانسپورت</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
                  <h2 className="text-lg font-black text-blue-900">INVOICE</h2>
                  <p className="text-xs font-bold text-blue-700">{selectedInvoice.invoiceNo}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 border border-blue-200 rounded-lg p-3 text-xs mb-4 bg-slate-50/50">
              <div className="space-y-1">
                <p><strong className="text-blue-900">DATE:</strong> {selectedInvoice.date}</p>
                <p><strong className="text-blue-900">SHIPPER:</strong> {selectedInvoice.shipper}</p>
                <p><strong className="text-blue-900">CONSIGNEE:</strong> {selectedInvoice.consignee}</p>
              </div>
              <div className="space-y-1">
                <p><strong className="text-blue-900">B/L NO:</strong> {selectedInvoice.blNo}</p>
                <p><strong className="text-blue-900">CONTAINERS:</strong> {selectedInvoice.containers}</p>
                <p><strong className="text-blue-900">ROUTE:</strong> {selectedInvoice.origin} → {selectedInvoice.destination}</p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-xs mb-4">
              <thead>
                <tr className="bg-blue-100 text-blue-950 border border-blue-900">
                  <th className="border border-blue-900 p-2 text-center w-12">#</th>
                  <th className="border border-blue-900 p-2 text-left">DESCRIPTIONS / تفصیل</th>
                  <th className="border border-blue-900 p-2 text-center">SIZE</th>
                  <th className="border border-blue-900 p-2 text-center">QTY</th>
                  <th className="border border-blue-900 p-2 text-center">UNIT</th>
                  <th className="border border-blue-900 p-2 text-center">GROSS WEIGHT</th>
                  <th className="border border-blue-900 p-2 text-right">PRICE (USD)</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item) => (
                  <tr key={item.id} className="border border-blue-200">
                    <td className="border border-blue-200 p-2 text-center">{item.sNo}</td>
                    <td className="border border-blue-200 p-2">
                      <div className="font-semibold">{item.description}</div>
                      {item.detentionDetails && (
                        <div className="text-[10px] text-slate-600 whitespace-pre-line mt-0.5">{item.detentionDetails}</div>
                      )}
                    </td>
                    <td className="border border-blue-200 p-2 text-center">{item.containerSize}</td>
                    <td className="border border-blue-200 p-2 text-center">{item.quantity}</td>
                    <td className="border border-blue-200 p-2 text-center">{item.unit}</td>
                    <td className="border border-blue-200 p-2 text-center">{item.grossWeight}</td>
                    <td className="border border-blue-200 p-2 text-right font-mono font-bold">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-900">
                  <td colSpan={6} className="border border-blue-200 p-2 text-right text-blue-950">Grand Total / مجموعه:</td>
                  <td className="border border-blue-200 p-2 text-right font-mono text-blue-900 text-sm">{formatCurrency(selectedInvoice.grandTotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Exchange Rate */}
            <p className="text-xs text-slate-600 mb-6">
              <strong>EX-CHANGE-RATE:</strong> {selectedInvoice.exchangeRate.toLocaleString()} AFN/USD
            </p>

            {/* Signatures */}
            <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs mt-8">
              <div>
                <p className="font-bold text-slate-800">Prepared By: {selectedInvoice.preparedBy}</p>
                <div className="mt-6 w-36 border-b border-slate-400 text-center pb-1">
                  <span className="text-[10px] text-slate-500">Authorized Signature</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-950">Thank you for your business and cooperation.</p>
                <p className="text-[10px] text-slate-600">ستاسو د همکارۍ او باور څخه مننه</p>
              </div>
            </div>

            {/* Print Footer */}
            <div className="mt-6 pt-3 border-t border-blue-200 flex justify-between text-[9px] text-slate-600 bg-slate-50 p-2 rounded">
              <div>
                <p className="font-bold text-blue-900">AFGHANISTAN OFFICE</p>
                <p>Kandahar, Afghanistan | MOB: +93 700 939 365</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-900">IRAN OFFICE</p>
                <p>Bandar Abbas, Iran | CELL: +98 09172325086</p>
              </div>
            </div>
          </div>
        </InvoicePrintPortal>
      </div>
    )
  }

  // Invoice List View
  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-white/80 backdrop-blur-xl border border-amber-200/60 rounded-3xl p-6 shadow-xl shadow-amber-900/5 relative overflow-hidden no-print">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Invoices
            </h2>
            <span className="px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
              <FileText className="w-3 h-3 text-amber-600" />
              <span>{currentCompany.name}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-bold">
            Generate and manage invoices for {currentCompany.name}
          </p>
        </div>

        <div className="flex gap-2 relative z-10">
          <Button
            variant="outline"
            className="gap-2 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm h-12 px-6"
            onClick={() => setView('ledger')}
          >
            <FileText className="h-4 w-4" />
            View Ledger
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all h-12 px-6 text-sm cursor-pointer">
                <Plus className="h-5 w-5 text-amber-400" />
                <span>Create Invoice</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Invoice Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Invoice No</label>
                    <Input
                      placeholder="DETN-001"
                      value={newInvoice.invoiceNo}
                      onChange={e => setNewInvoice({ ...newInvoice, invoiceNo: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={newInvoice.date}
                      onChange={e => setNewInvoice({ ...newInvoice, date: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exchange Rate</label>
                    <Input
                          type="number"
                          value={newInvoice.exchangeRate !== undefined ? newInvoice.exchangeRate : ''}
                          onChange={e => setNewInvoice({ ...newInvoice, exchangeRate: e.target.value === '' ? '' as any : (parseFloat(e.target.value) || 0) })}
                          className="bg-white/50"
                    />
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Shipper</label>
                    <Input
                      value={newInvoice.shipper}
                      onChange={e => setNewInvoice({ ...newInvoice, shipper: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Consignee</label>
                    <Input
                      value={newInvoice.consignee}
                      onChange={e => setNewInvoice({ ...newInvoice, consignee: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                </div>

                {/* Shipping Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Origin</label>
                    <Input
                      value={newInvoice.origin}
                      onChange={e => setNewInvoice({ ...newInvoice, origin: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Destination</label>
                    <Input
                      value={newInvoice.destination}
                      onChange={e => setNewInvoice({ ...newInvoice, destination: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">B/L NO</label>
                    <Input
                      value={newInvoice.blNo}
                      onChange={e => setNewInvoice({ ...newInvoice, blNo: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Containers</label>
                    <Input
                      placeholder="8X20HD, 1X40HC"
                      value={newInvoice.containers}
                      onChange={e => setNewInvoice({ ...newInvoice, containers: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prepared By</label>
                  <Input
                    value={newInvoice.preparedBy}
                    onChange={e => setNewInvoice({ ...newInvoice, preparedBy: e.target.value })}
                    className="bg-white/50"
                  />
                </div>

                {/* Items Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Invoice Items</h3>
                  
                  {/* Add Item Form */}
                  <div className="bg-muted/30 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Description</label>
                        <Input
                          placeholder="Detention"
                          value={newItem.description}
                          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Container Size</label>
                        <Input
                          placeholder="4X20HD"
                          value={newItem.containerSize}
                          onChange={e => setNewItem({ ...newItem, containerSize: e.target.value })}
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Quantity</label>
                        <Input
                          value={newItem.quantity}
                          onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                          className="bg-white/50"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Unit</label>
                        <Input
                          placeholder="ریال"
                          value={newItem.unit}
                          onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Gross Weight</label>
                        <Input
                          placeholder="265,000,000"
                          value={newItem.grossWeight}
                          onChange={e => setNewItem({ ...newItem, grossWeight: e.target.value })}
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Price (USD)</label>
                        <Input
                          type="number"
                          value={newItem.price !== undefined ? newItem.price : ''}
                          onChange={e => setNewItem({ ...newItem, price: e.target.value === '' ? '' as any : (parseFloat(e.target.value) || 0) })}
                          className="bg-white/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 mb-3">
                      <label className="text-xs font-medium">Detention Details (optional)</label>
                      <Textarea
                        placeholder="Container details, delay days, charges..."
                        value={newItem.detentionDetails}
                        onChange={e => setNewItem({ ...newItem, detentionDetails: e.target.value })}
                        className="bg-white/50"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAddItem} size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {/* Items List */}
                  {newInvoice.items.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newInvoice.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.sNo}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.containerSize}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell colSpan={3} className="text-right">Grand Total:</TableCell>
                          <TableCell className="text-right font-mono text-primary">
                            {formatCurrency(newInvoice.grandTotal)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateInvoice}>Create Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invoices Grid */}
      {companyInvoices.length === 0 ? (
        <Card className="glass border-2 border-dashed border-amber-300/80 rounded-3xl overflow-hidden shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-20 px-4 relative text-center">
            <div className="p-5 rounded-2xl bg-amber-100/80 mb-4 shadow-inner">
              <FileText className="h-12 w-12 text-amber-800" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No Invoices Yet</h3>
            <p className="text-slate-600 text-center mb-6 max-w-md font-medium text-sm">
              Create your first invoice for this company
            </p>
            <Button 
              type="button"
              onClick={() => setIsCreateOpen(true)} 
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 rounded-2xl px-6 cursor-pointer"
            >
              <Plus className="h-5 w-5 text-amber-400" />
              <span>Create Your First Invoice</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {companyInvoices.map(invoice => (
            <Card
              key={invoice.id}
              className="group relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-900/10 overflow-hidden cursor-pointer"
              onClick={() => setSelectedInvoice(invoice)}
            >
              {/* Top Accent Gradient Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-800 to-amber-500 group-hover:h-2 transition-all duration-300" />

              <div className="flex items-start justify-between gap-3 pt-1 mb-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-black text-slate-900 group-hover:text-blue-900 transition-colors truncate">
                      {invoice.invoiceNo}
                    </CardTitle>
                    <span className="text-xs text-amber-700 font-[vazirmatn] font-bold block">انوایس</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 rounded-xl"
                  onClick={e => {
                    e.stopPropagation()
                    deleteInvoice(invoice.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3 text-sm flex-1">
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-amber-50/30 transition-colors">
                  <span className="text-xs font-black text-slate-500">Date:</span>
                  <span className="font-bold text-slate-700">{invoice.date}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-amber-50/30 transition-colors">
                  <span className="text-xs font-black text-slate-500">Items:</span>
                  <span className="font-bold text-slate-700">{invoice.items.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100 group-hover:bg-blue-50 transition-colors">
                  <span className="text-xs font-black text-blue-800">Total:</span>
                  <span className="font-black text-blue-900 font-mono">{formatCurrency(invoice.grandTotal)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
