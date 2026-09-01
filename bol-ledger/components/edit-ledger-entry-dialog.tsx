import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Loader2, 
  Upload, 
  FileText, 
  Trash2, 
  Paperclip, 
  DollarSign, 
  TrendingUp, 
  Package,
} from 'lucide-react'
import { LedgerEntry } from '@/lib/types'
import { DescriptionPresetSelector } from '@/components/description-preset-selector'
import { ContainerPresetSelector } from './container-preset-selector'

interface EditLedgerEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: LedgerEntry | null
  onSave: (updatedEntry: Partial<LedgerEntry>) => Promise<void>
  onPdfUpload?: (file: File) => void | Promise<{ pathname: string; filename: string } | void>
  onPdfDelete?: (pathname: string) => Promise<void> | void
}

export function EditLedgerEntryDialog({
  open,
  onOpenChange,
  entry,
  onSave,
  onPdfUpload,
  onPdfDelete,
}: EditLedgerEntryDialogProps) {
  const [formData, setFormData] = useState<Partial<LedgerEntry>>(entry || {})
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (entry) {
      setFormData({
        ...entry,
        price: entry.price !== undefined ? entry.price : (entry.debit || 0),
        cost: entry.cost !== undefined ? entry.cost : (entry.shippingCost || 0),
        profit: entry.profit !== undefined ? entry.profit : ((entry.price || entry.debit || 0) - (entry.cost || entry.shippingCost || 0)),
      })
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        shipperDescription: '',
        invoiceNo: '',
        dateOfShip: '',
        barnamehNo: '',
        driverFreight: '',
        billOfLanding: '',
        surrenderedBL: false,
        containerNo: '',
        containerType: '',
        containerDetails: '',
        consignee: '',
        quantity: '',
        debit: 0,
        credit: 0,
        price: 0,
        cost: 0,
        profit: 0,
      })
    }
    setPdfFile(null)
  }, [entry, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const isNumeric = ['debit', 'credit', 'price', 'cost', 'profit', 'shippingCost'].includes(name)
    setFormData(prev => {
      const numVal = value === '' ? '' : (parseFloat(value) || 0)
      const updated = {
        ...prev,
        [name]: isNumeric ? numVal : value,
      }
      // Sync price with debit if linked
      if (name === 'price') {
        if (!prev.debit || prev.debit === prev.price) {
          updated.debit = numVal as any
        }
      }
      if (name === 'debit') {
        if (!prev.price || prev.price === prev.debit) {
          updated.price = numVal as any
        }
      }
      return updated
    })
  }

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
    }
  }

  const handleUploadPdf = async () => {
    if (!pdfFile || !onPdfUpload) return
    
    try {
      setIsUploadingPdf(true)
      const result = await onPdfUpload(pdfFile)
      if (result) {
        setFormData(prev => ({
          ...prev,
          pdfPathname: result.pathname,
        }))
        setPdfFile(null)
      }
    } catch (error) {
      console.error('[v0] PDF upload error:', error)
    } finally {
      setIsUploadingPdf(false)
    }
  }

  const handleRemovePdf = async () => {
    if (formData.pdfPathname && onPdfDelete) {
      try {
        await onPdfDelete(formData.pdfPathname)
        setFormData(prev => ({
          ...prev,
          pdfPathname: undefined,
        }))
      } catch (error) {
        console.error('[v0] PDF delete error:', error)
      }
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const debitNum = !formData.debit || (formData.debit as any) === '' ? 0 : Number(formData.debit) || 0
      const creditNum = !formData.credit || (formData.credit as any) === '' ? 0 : Number(formData.credit) || 0
      const priceNum = formData.price !== undefined && (formData.price as any) !== '' ? Number(formData.price) : debitNum
      const costNum = formData.cost !== undefined && (formData.cost as any) !== '' ? Number(formData.cost) : (formData.shippingCost ? Number(formData.shippingCost) : 0)
      const calculatedProfit = priceNum - costNum

      const finalFormData = {
        ...formData,
        debit: debitNum,
        credit: creditNum,
        price: priceNum,
        cost: costNum,
        profit: calculatedProfit,
        shippingCost: costNum,
        driverFreight:
          formData.driverFreight && formData.driverFreight.trim() !== ''
            ? formData.driverFreight.trim()
            : '',
      }
      await onSave(finalFormData)
      onOpenChange(false)
    } catch (error) {
      console.error('[v0] Error saving entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const debitVal = !formData.debit || (formData.debit as any) === '' ? 0 : Number(formData.debit) || 0
  const creditVal = !formData.credit || (formData.credit as any) === '' ? 0 : Number(formData.credit) || 0
  const netBalanceVal = debitVal - creditVal

  const priceVal = formData.price !== undefined && (formData.price as any) !== '' ? Number(formData.price) : debitVal
  const costVal = formData.cost !== undefined && (formData.cost as any) !== '' ? Number(formData.cost) : (formData.shippingCost ? Number(formData.shippingCost) : 0)
  const profitVal = priceVal - costVal
  const profitMargin = priceVal > 0 ? (profitVal / priceVal) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[96vw] lg:max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-50/95 backdrop-blur-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xl rounded-2xl sm:rounded-3xl focus:outline-none"
      >
        {/* Top Header with Live Metrics */}
        <DialogHeader className="border-b border-slate-200 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm inline-block"></span>
              <span>{entry ? 'Edit Ledger Entry / د بارنامې، لګښت او مالي حساب معلومات' : 'New Ledger Entry / نوی ثبت اضافه کول'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Complete logistics, container route, pricing, cost margin, and accounting ledger.
            </DialogDescription>
          </div>
          
          {/* Header Quick Metrics Summary */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Financial Overview Pill */}
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold">Revenue:</span>
                <span className="font-mono font-black text-blue-900">${priceVal.toLocaleString('en-US')}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold">Cost:</span>
                <span className="font-mono font-black text-amber-800">${costVal.toLocaleString('en-US')}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold">Profit:</span>
                <span className={`font-mono font-black ${profitVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {profitVal >= 0 ? `+$${profitVal.toLocaleString('en-US')}` : `-$${Math.abs(profitVal).toLocaleString('en-US')}`}
                </span>
              </div>
            </div>

            {/* Invariance Balance Pill */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-xs text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Balance:</span>
              <span className={`font-mono font-black ${
                netBalanceVal > 0 ? 'text-blue-950' : netBalanceVal < 0 ? 'text-emerald-800' : 'text-slate-600'
              }`}>
                {netBalanceVal >= 0 ? `+$${netBalanceVal.toLocaleString('en-US')}` : `-$${Math.abs(netBalanceVal).toLocaleString('en-US')}`} USD
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                netBalanceVal > 0 
                  ? 'bg-blue-200 text-blue-950 font-bold' 
                  : netBalanceVal < 0 
                  ? 'bg-emerald-200 text-emerald-950 font-bold' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {netBalanceVal > 0 ? 'Receivable' : netBalanceVal < 0 ? 'Surplus' : 'Settled'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            
            {/* PANEL 1: Logistics, Shipper & Container */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    1. Logistics & Route / د بار او کانتینر مشخصات
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  Route & Cargo
                </span>
              </div>

              {/* 4-Columns Grid in 1 row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Date / تاریخ</label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleChange}
                    className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-semibold h-8 rounded-lg text-slate-900 px-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Invoice / انوایس</label>
                  <Input
                    name="invoiceNo"
                    value={formData.invoiceNo || ''}
                    onChange={handleChange}
                    placeholder="INV-001"
                    className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-semibold h-8 rounded-lg text-slate-900 px-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Ship Date / د بار نېټه</label>
                  <Input
                    name="dateOfShip"
                    value={formData.dateOfShip || ''}
                    onChange={handleChange}
                    placeholder="01X40' RF"
                    className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-semibold h-8 rounded-lg text-slate-900 px-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Barnameh / بارنامه</label>
                  <Input
                    name="barnamehNo"
                    value={formData.barnamehNo || ''}
                    onChange={handleChange}
                    placeholder="BOL-2026-NSA001"
                    className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-mono font-bold text-blue-900 h-8 rounded-lg px-2"
                  />
                </div>
              </div>

              {/* Shipper & Route Preset Selector */}
              <div>
                <DescriptionPresetSelector
                  value={formData.shipperDescription || ''}
                  onChange={(newVal) => setFormData(prev => ({ ...prev, shipperDescription: newVal }))}
                  showQuickChips={true}
                />
              </div>

              {/* Consignee */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Consignee / وصول کوونکی (Receiver)</label>
                <Input
                  name="consignee"
                  value={formData.consignee || ''}
                  onChange={handleChange}
                  placeholder="Receiver or Company Name..."
                  className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-semibold h-8 rounded-lg text-slate-900"
                />
              </div>

              {/* Container Specifications */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 shadow-2xs">
                <ContainerPresetSelector
                  containerNo={formData.containerNo || ''}
                  containerType={formData.containerType || ''}
                  containerDetails={formData.containerDetails || ''}
                  onChangeContainerNo={(newNo) => setFormData(prev => ({ ...prev, containerNo: newNo }))}
                  onChangeContainerType={(newType) => setFormData(prev => ({ ...prev, containerType: newType }))}
                  onChangeContainerDetails={(newDetails) => setFormData(prev => ({ ...prev, containerDetails: newDetails }))}
                  showDetailsField={true}
                  showQuickChips={true}
                />
              </div>
            </div>

            {/* PANEL 2: Financials, Pricing, Cost, Profit & PDF Attachment */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    2. Financials, Cost, Profit & Price / مالي حساب او ګټه
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Margin & Identity
                </span>
              </div>

              {/* B/L & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Bill of Lading / B/L NO</label>
                  <Input
                    name="billOfLanding"
                    value={formData.billOfLanding || ''}
                    onChange={handleChange}
                    placeholder="Original B/L No..."
                    className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-semibold h-8 rounded-lg text-slate-900"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <Checkbox
                      id="surrenderedBL"
                      checked={formData.surrenderedBL || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, surrenderedBL: checked === true }))}
                      className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-emerald-600 rounded"
                    />
                    <label htmlFor="surrenderedBL" className="text-[11px] text-emerald-900 font-bold cursor-pointer select-none flex items-center gap-1">
                      <span>✓ Surrendered B/L (تسلیم شوی)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Quantity / بسته بندي او وزن</label>
                  <Input
                    name="quantity"
                    value={formData.quantity || ''}
                    onChange={handleChange}
                    placeholder="1476 CTNS • NW 21,500 KGS"
                    className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-semibold h-8 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Driver Freight */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Driver Freight / کرایه موتروان</label>
                  <span className="text-[10px] font-semibold text-slate-400">ټاکل شوي چټک نرخونه</span>
                </div>
                <Input
                  name="driverFreight"
                  value={formData.driverFreight || ''}
                  onChange={handleChange}
                  placeholder="45,000-AFN - کرایه واپسی"
                  className="bg-slate-50/70 border-slate-200 focus:bg-white focus:border-blue-500 text-xs font-bold text-slate-900 h-8 rounded-lg"
                />
                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {[
                    "45,000-AFN - کرایه واپسی",
                    "50,000-AFN - کرایه واپسی",
                    "60,000-AFN - کرایه رفت و برگشت",
                    "40,000-AFN - کرایه اسلام قلعه",
                    "کرایه مکمل پرداخت شد",
                    "$650 USD - بندرعباس",
                    "$850 USD - جبل علی",
                  ].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, driverFreight: f }))}
                      className="text-[10px] font-bold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-1 rounded-lg cursor-pointer transition-all hover:scale-[1.02] whitespace-nowrap shrink-0"
                    >
                      <span>⚡ {f}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-COLUMN PROFITABILITY & MARGIN CARD: PRICE | COST | PROFIT */}
              <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    <span>Price, Cost & Profit Analysis / د ګټې او مصارفو تحلیل</span>
                  </span>
                  <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full ${
                    profitVal > 0 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : profitVal < 0 
                      ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {profitVal > 0 ? `+${profitMargin.toFixed(1)}% Margin` : profitVal < 0 ? `${profitMargin.toFixed(1)}% Loss` : '0% Margin'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* 1. PRICE (Sales / Revenue) */}
                  <div className="bg-white p-2 rounded-xl border border-blue-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-blue-900 block">Price / خرڅلاو ($)</label>
                      <span className="text-[8.5px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Revenue</span>
                    </div>
                    <Input
                      type="number"
                      name="price"
                      value={formData.price !== undefined && formData.price !== null ? formData.price : (formData.debit !== undefined ? formData.debit : '')}
                      onChange={handleChange}
                      placeholder="3200"
                      step="0.01"
                      className="bg-white border-blue-300 focus:border-blue-500 text-xs font-mono font-black text-blue-950 h-7.5 rounded-lg px-2"
                    />
                  </div>

                  {/* 2. COST (Expense / Total Outflow) */}
                  <div className="bg-white p-2 rounded-xl border border-amber-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-amber-900 block">Cost / ټول لګښت ($)</label>
                      <span className="text-[8.5px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Expense</span>
                    </div>
                    <Input
                      type="number"
                      name="cost"
                      value={formData.cost !== undefined && formData.cost !== null ? formData.cost : (formData.shippingCost !== undefined ? formData.shippingCost : '')}
                      onChange={handleChange}
                      placeholder="2400"
                      step="0.01"
                      className="bg-white border-amber-300 focus:border-amber-500 text-xs font-mono font-black text-amber-900 h-7.5 rounded-lg px-2"
                    />
                  </div>

                  {/* 3. PROFIT (Live Calculated Net Profit) */}
                  <div className={`p-2 rounded-xl border shadow-xs flex flex-col justify-between ${
                    profitVal > 0 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : profitVal < 0 
                      ? 'bg-rose-50 border-rose-300 text-rose-950' 
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black block">Profit / خالصه ګټه</label>
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${
                        profitVal > 0 ? 'bg-emerald-200 text-emerald-900' : profitVal < 0 ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {profitVal > 0 ? 'Profitable' : profitVal < 0 ? 'Loss' : 'Break-Even'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between h-7.5 px-2 bg-white/90 rounded-lg border border-emerald-200/60 font-mono text-xs font-black">
                      <span className={profitVal > 0 ? 'text-emerald-700' : profitVal < 0 ? 'text-rose-700' : 'text-slate-600'}>
                        {profitVal >= 0 ? `+$${profitVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : `-$${Math.abs(profitVal).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                      </span>
                      <span className="text-[9px] text-slate-400 font-sans font-bold">USD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dual Ledger Financial Box: DEBIT | CREDIT | INVARIANCE IDENTITY */}
              <div className="bg-gradient-to-r from-rose-50/70 via-slate-50 to-emerald-50/70 p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-rose-50/90 p-2 rounded-xl border border-rose-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-rose-900 block">Debit / د پور حساب ($ USD)</label>
                      <span className="text-[8.5px] font-black text-rose-700 bg-rose-200 px-1.5 py-0.5 rounded">Billed</span>
                    </div>
                    <Input
                      type="number"
                      name="debit"
                      value={formData.debit !== undefined ? formData.debit : ''}
                      onChange={handleChange}
                      onFocus={(e) => {
                        if (!formData.debit || Number(formData.debit) === 0) {
                          setFormData(prev => ({ ...prev, debit: '' as any }))
                        } else {
                          e.target.select()
                        }
                      }}
                      onBlur={() => {
                        if (!formData.debit || (formData.debit as any) === '') {
                          setFormData(prev => ({ ...prev, debit: 0 }))
                        }
                      }}
                      step="0.01"
                      className="bg-white border-rose-300 focus:border-rose-500 text-xs font-mono font-black text-rose-700 h-7.5 rounded-lg px-2"
                    />
                  </div>

                  <div className="bg-emerald-50/90 p-2 rounded-xl border border-emerald-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-emerald-900 block">Credit / ترلاسه شوی مبلغ ($ USD)</label>
                      <span className="text-[8.5px] font-black text-emerald-700 bg-emerald-200 px-1.5 py-0.5 rounded">Paid</span>
                    </div>
                    <Input
                      type="number"
                      name="credit"
                      value={formData.credit !== undefined ? formData.credit : ''}
                      onChange={handleChange}
                      onFocus={(e) => {
                        if (!formData.credit || Number(formData.credit) === 0) {
                          setFormData(prev => ({ ...prev, credit: '' as any }))
                        } else {
                          e.target.select()
                        }
                      }}
                      onBlur={() => {
                        if (!formData.credit || (formData.credit as any) === '') {
                          setFormData(prev => ({ ...prev, credit: 0 }))
                        }
                      }}
                      step="0.01"
                      className="bg-white border-emerald-300 focus:border-emerald-500 text-xs font-mono font-black text-emerald-700 h-7.5 rounded-lg px-2"
                    />
                  </div>
                </div>

                {/* Accounting Invariance Identity Formula Bar */}
                <div className="flex items-center justify-between px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-[10px]">
                  <span className="font-semibold text-slate-500">Identity: Net Balance = Debit - Credit</span>
                  <span className={`font-mono font-black ${
                    netBalanceVal > 0 ? 'text-blue-900' : netBalanceVal < 0 ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {netBalanceVal >= 0 ? `+$${netBalanceVal.toLocaleString('en-US')}` : `-$${Math.abs(netBalanceVal).toLocaleString('en-US')}`} USD
                  </span>
                </div>
              </div>

              {/* Attached PDF Document */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Attached PDF Document / تړل شوی اسناد</label>
                {formData.pdfPathname ? (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl h-8">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span className="text-xs font-bold text-emerald-900 truncate">PDF Document Attached</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePdf}
                      className="h-6 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-100 px-2 font-bold rounded-md"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf"
                      onChange={handlePdfSelect}
                      disabled={isUploadingPdf}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPdf}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 text-xs h-8 justify-start font-semibold rounded-lg"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-slate-500 mr-2 shrink-0" />
                      <span className="truncate">
                        {pdfFile ? pdfFile.name : 'Click to select PDF document...'}
                      </span>
                    </Button>
                    {pdfFile && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadPdf}
                        disabled={isUploadingPdf}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 shrink-0 font-bold rounded-lg"
                      >
                        {isUploadingPdf ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1" />
                        )}
                        Upload
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Dialog Action Buttons */}
        <DialogFooter className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9 px-5 font-bold rounded-xl"
          >
            Cancel / لغوه
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xs h-9 px-7 shadow-md rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Entry / ثبت خوندي کول'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
