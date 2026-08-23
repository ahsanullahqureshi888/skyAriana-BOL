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
import { Loader2, Upload, FileText, Trash2, Paperclip } from 'lucide-react'
import { LedgerEntry } from '@/lib/types'

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
      setFormData(entry)
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
        consignee: '',
        quantity: '',
        debit: 0,
        credit: 0,
      })
    }
    setPdfFile(null)
  }, [entry, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'debit' || name === 'credit') ? (value === '' ? '' : (parseFloat(value) || 0)) : value,
    }))
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
      const finalFormData = {
        ...formData,
        debit: !formData.debit || (formData.debit as any) === '' ? 0 : Number(formData.debit) || 0,
        credit: !formData.credit || (formData.credit as any) === '' ? 0 : Number(formData.credit) || 0,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] overflow-y-auto glass-strong border-blue-200 p-5 shadow-2xl">
        <DialogHeader className="border-b border-blue-100 pb-2.5">
          <DialogTitle className="text-xl font-bold text-blue-950 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm"></span>
            Edit Ledger Entry
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-700/80 font-medium">
            All fields rendered at a glance without scrolling. Modify details below and click Save.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* Side-by-Side 2 Equal Columns Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* LEFT PANEL: Logistics & Document Details */}
            <div className="bg-gradient-to-br from-blue-50/60 via-white to-slate-50/50 p-4 rounded-xl border border-blue-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-blue-200/60 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm"></span>
                <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">1. Logistics & Document Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Date / تاریخ</label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleChange}
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Invoice No / انوایس</label>
                  <Input
                    name="invoiceNo"
                    value={formData.invoiceNo || ''}
                    onChange={handleChange}
                    placeholder="INV-001"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Date of Ship / د بار نېټه</label>
                  <Input
                    name="dateOfShip"
                    value={formData.dateOfShip || ''}
                    onChange={handleChange}
                    placeholder="01X40' RF"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Barnameh No / بارنامه</label>
                  <Input
                    name="barnamehNo"
                    value={formData.barnamehNo || ''}
                    onChange={handleChange}
                    placeholder="BOL-2026-NSA001"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-mono font-bold text-blue-900 h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-900 block mb-1">Description / Shipper / تفصیل</label>
                <Input
                  name="shipperDescription"
                  value={formData.shipperDescription || ''}
                  onChange={handleChange}
                  placeholder="1476 CTNS: GOLDEN RAISINS"
                  className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Container No / کانټینر</label>
                  <Input
                    name="containerNo"
                    value={formData.containerNo || ''}
                    onChange={handleChange}
                    placeholder="SEGU9872723"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Consignee / وصول کوونکی</label>
                  <Input
                    name="consignee"
                    value={formData.consignee || ''}
                    onChange={handleChange}
                    placeholder="Company Name"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Freight, Financials & PDF Attachment */}
            <div className="bg-gradient-to-br from-slate-50/60 via-white to-blue-50/50 p-4 rounded-xl border border-blue-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-blue-200/60 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm"></span>
                <h3 className="text-xs font-bold text-blue-958 uppercase tracking-wider">2. Freight, Financials & PDF Attachment</h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Bill of Lading / B/L NO</label>
                  <Input
                    name="billOfLanding"
                    value={formData.billOfLanding || ''}
                    onChange={handleChange}
                    placeholder="Original B/L No..."
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Checkbox
                      id="surrenderedBL"
                      checked={formData.surrenderedBL || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, surrenderedBL: checked === true }))}
                      className="h-3.5 w-3.5 border-blue-300 data-[state=checked]:bg-emerald-600"
                    />
                    <label htmlFor="surrenderedBL" className="text-[11px] text-blue-900 font-semibold cursor-pointer">
                      Surrendered B/L
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">Quantity / بسته بندي</label>
                  <Input
                    name="quantity"
                    value={formData.quantity || ''}
                    onChange={handleChange}
                    placeholder="1476 CTNS"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-950 block mb-1">Driver Freight / کرایه موتر</label>
                <Input
                  name="driverFreight"
                  value={formData.driverFreight || ''}
                  onChange={handleChange}
                  placeholder="60,000 AFN / $3,200"
                  className="bg-white border-blue-300 focus:border-blue-500 text-xs font-bold text-blue-950 h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-red-50/70 p-2 rounded-lg border border-red-200">
                  <label className="text-[11px] font-bold text-red-700 block mb-1">Debit ($) / د پور حساب</label>
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
                    className="bg-white border-red-300 focus:border-red-500 text-xs font-mono font-bold text-red-600 h-9"
                  />
                </div>

                <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                  <label className="text-[11px] font-bold text-emerald-800 block mb-1">Credit ($) / ترلاسه شوی مبلغ</label>
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
                    className="bg-white border-emerald-300 focus:border-emerald-500 text-xs font-mono font-bold text-emerald-700 h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-900 block mb-1">Attached PDF Document</label>
                {formData.pdfPathname ? (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-100/90 border border-emerald-300 rounded-lg h-9">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span className="text-xs font-bold text-emerald-900 truncate">PDF Document Attached</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePdf}
                      className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-200/50 px-2 font-bold"
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
                      className="flex-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-900 text-xs h-9 justify-start font-semibold"
                    >
                      <Paperclip className="h-4 w-4 text-blue-600 mr-2 shrink-0" />
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
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-3 shrink-0 font-bold"
                      >
                        {isUploadingPdf ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1" />
                        )}
                        Upload PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="border-t border-blue-100 pt-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-blue-200 text-blue-800 hover:bg-blue-50 text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs h-9 px-6 shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
