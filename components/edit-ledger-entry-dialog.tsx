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
import { DescriptionPresetSelector } from './description-preset-selector'
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
        containerType: '',
        containerDetails: '',
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
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[92vh] overflow-y-auto glass-strong border-blue-200 p-3.5 sm:p-4 shadow-2xl">
        <DialogHeader className="border-b border-blue-100 pb-2">
          <DialogTitle className="text-lg font-bold text-blue-950 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs"></span>
            Edit Ledger Entry
          </DialogTitle>
          <DialogDescription className="text-[11px] text-blue-700/80 font-medium">
            All fields rendered at a glance. Modify details below and click Save.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          {/* Side-by-Side 2 Equal Columns Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            {/* LEFT PANEL: Logistics & Document Details */}
            <div className="bg-gradient-to-br from-blue-50/60 via-white to-slate-50/50 p-3 rounded-xl border border-blue-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-blue-200/60 pb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 shadow-xs"></span>
                <h3 className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">1. Logistics & Document Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Date / تاریخ</label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleChange}
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Invoice No / انوایس</label>
                  <Input
                    name="invoiceNo"
                    value={formData.invoiceNo || ''}
                    onChange={handleChange}
                    placeholder="INV-001"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Date of Ship / د بار نېټه</label>
                  <Input
                    name="dateOfShip"
                    value={formData.dateOfShip || ''}
                    onChange={handleChange}
                    placeholder="01X40' RF"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Barnameh No / بارنامه</label>
                  <Input
                    name="barnamehNo"
                    value={formData.barnamehNo || ''}
                    onChange={handleChange}
                    placeholder="BOL-2026-NSA001"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-mono font-bold text-blue-900 h-8"
                  />
                </div>
              </div>

              <div>
                <DescriptionPresetSelector
                  value={formData.shipperDescription || ''}
                  onChange={(newVal) => setFormData(prev => ({ ...prev, shipperDescription: newVal }))}
                  showQuickChips={true}
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Consignee / وصول کوونکی</label>
                <Input
                  name="consignee"
                  value={formData.consignee || ''}
                  onChange={handleChange}
                  placeholder="Company Name"
                  className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950"
                />
              </div>

              <div className="bg-white/90 p-2 rounded-lg border border-blue-200/80 shadow-2xs">
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

            {/* RIGHT PANEL: Freight, Financials & PDF Attachment */}
            <div className="bg-gradient-to-br from-slate-50/60 via-white to-blue-50/50 p-3 rounded-xl border border-blue-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 border-b border-blue-200/60 pb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-xs"></span>
                <h3 className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">2. Freight, Financials & PDF Attachment</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Bill of Lading / B/L NO</label>
                  <Input
                    name="billOfLanding"
                    value={formData.billOfLanding || ''}
                    onChange={handleChange}
                    placeholder="Original B/L No..."
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950"
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <Checkbox
                      id="surrenderedBL"
                      checked={formData.surrenderedBL || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, surrenderedBL: checked === true }))}
                      className="h-3 w-3 border-blue-300 data-[state=checked]:bg-emerald-600"
                    />
                    <label htmlFor="surrenderedBL" className="text-[10px] text-blue-900 font-semibold cursor-pointer select-none">
                      Surrendered B/L
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Quantity / بسته بندي</label>
                  <Input
                    name="quantity"
                    value={formData.quantity || ''}
                    onChange={handleChange}
                    placeholder="1476 CTNS"
                    className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10.5px] font-bold text-blue-950 block">Driver Freight / کرایه موتر</label>
                  <span className="text-[9px] font-semibold text-slate-400">سریع کرایه</span>
                </div>
                <Input
                  name="driverFreight"
                  value={formData.driverFreight || ''}
                  onChange={handleChange}
                  placeholder="45,000-AFN - کرایه واپسی"
                  className="bg-white border-blue-300 focus:border-blue-500 text-xs font-bold text-blue-950 h-8"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    "45,000-AFN - کرایه واپسی",
                    "50,000-AFN - کرایه واپسی",
                    "60,000-AFN - کرایه رفت و برگشت",
                    "40,000-AFN - کرایه اسلام قلعه",
                    "کرایه مکمل پرداخت شد",
                  ].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, driverFreight: f }))}
                      className="text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <span>⚡ {f}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-50/70 p-1.5 rounded-lg border border-red-200">
                  <label className="text-[10.5px] font-bold text-red-700 block mb-0.5">Debit ($) / د پور حساب</label>
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
                    className="bg-white border-red-300 focus:border-red-500 text-xs font-mono font-bold text-red-600 h-8"
                  />
                </div>

                <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200">
                  <label className="text-[10.5px] font-bold text-emerald-800 block mb-0.5">Credit ($) / ترلاسه شوی مبلغ</label>
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
                    className="bg-white border-emerald-300 focus:border-emerald-500 text-xs font-mono font-bold text-emerald-700 h-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-blue-900 block mb-0.5">Attached PDF Document</label>
                {formData.pdfPathname ? (
                  <div className="flex items-center justify-between px-2.5 py-1 bg-emerald-100/90 border border-emerald-300 rounded-lg h-8">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <FileText className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span className="text-[11px] font-bold text-emerald-900 truncate">PDF Document Attached</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePdf}
                      className="h-5 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-200/50 px-1.5 font-bold"
                    >
                      <Trash2 className="h-2.5 w-2.5 mr-0.5" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center">
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
                      className="flex-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-900 text-xs h-8 justify-start font-semibold"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-blue-600 mr-1.5 shrink-0" />
                      <span className="truncate text-[11px]">
                        {pdfFile ? pdfFile.name : 'Click to select PDF document...'}
                      </span>
                    </Button>
                    {pdfFile && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadPdf}
                        disabled={isUploadingPdf}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-2.5 shrink-0 font-bold"
                      >
                        {isUploadingPdf ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
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

        <DialogFooter className="border-t border-blue-100 pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-blue-200 text-blue-800 hover:bg-blue-50 text-xs h-8 px-3.5 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs h-8 px-5 shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
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
