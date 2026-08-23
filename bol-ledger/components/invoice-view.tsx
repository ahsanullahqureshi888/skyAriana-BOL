"use client"

import { useState } from 'react'
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
    window.print()
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
      </div>
    )
  }

  // Invoice List View
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="text-muted-foreground">Generate invoices for {currentCompany.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 bg-white/30 hover:bg-white/50"
            onClick={() => setView('ledger')}
          >
            <FileText className="h-4 w-4" />
            Ledger
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Create Invoice
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
                      value={newInvoice.exchangeRate}
                      onChange={e => setNewInvoice({ ...newInvoice, exchangeRate: parseFloat(e.target.value) || 0 })}
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
                          value={newItem.price || ''}
                          onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
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
        <Card className="glass border-dashed border-2 border-primary/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-primary/40 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Invoices Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first invoice for this company
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companyInvoices.map(invoice => (
            <Card
              key={invoice.id}
              className="glass hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{invoice.invoiceNo}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
                  onClick={e => {
                    e.stopPropagation()
                    deleteInvoice(invoice.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{invoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span>{invoice.items.length}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-primary">{formatCurrency(invoice.grandTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
