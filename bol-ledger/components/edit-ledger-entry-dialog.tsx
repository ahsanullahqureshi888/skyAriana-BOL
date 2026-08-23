import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Upload, FileText, Trash2 } from 'lucide-react'
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
  const [formData, setFormData] = useState<Partial<LedgerEntry>>(
    entry || {
      date: new Date().toISOString().split('T')[0],
      shipperDescription: '',
      invoiceNo: '',
      dateOfShip: '',
      billOfLanding: '',
      surrenderedBL: false,
      containerNo: '',
      consignee: '',
      quantity: '',
      debit: 0,
      credit: 0,
    }
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'debit' || name === 'credit' ? parseFloat(value) || 0 : value,
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
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('[v0] Error saving entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ledger Entry</DialogTitle>
          <DialogDescription>Update the ledger entry details below</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              name="date"
              value={formData.date || ''}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Invoice No</label>
            <Input
              name="invoiceNo"
              value={formData.invoiceNo || ''}
              onChange={handleChange}
              placeholder="INV-001"
              className="mt-1"
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Description / Shipper</label>
            <Textarea
              name="shipperDescription"
              value={formData.shipperDescription || ''}
              onChange={handleChange}
              placeholder="1476 CTNS: GOLDEN RAISINS"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Date of Ship</label>
            <Input
              name="dateOfShip"
              value={formData.dateOfShip || ''}
              onChange={handleChange}
              placeholder="01X40' RF"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bill of Lading (B/L NO / بی ال)</label>
            <Input
              name="billOfLanding"
              value={formData.billOfLanding || ''}
              onChange={handleChange}
              placeholder="B/L-001"
              className="mt-1"
            />
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="surrenderedBL"
                checked={formData.surrenderedBL || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, surrenderedBL: checked === true }))}
              />
              <label htmlFor="surrenderedBL" className="text-sm text-muted-foreground cursor-pointer">
                Surrendered Bill of Lading
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Container No</label>
            <Input
              name="containerNo"
              value={formData.containerNo || ''}
              onChange={handleChange}
              placeholder="SEGU9872723"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Consignee</label>
            <Input
              name="consignee"
              value={formData.consignee || ''}
              onChange={handleChange}
              placeholder="Company Name"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input
              name="quantity"
              value={formData.quantity || ''}
              onChange={handleChange}
              placeholder="1476 CTNS"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Debit ($)</label>
            <Input
              type="number"
              name="debit"
              value={formData.debit !== undefined ? formData.debit : ''}
              onChange={handleChange}
              onFocus={(e) => {
                if (formData.debit === 0 || formData.debit === '0' || Number(formData.debit) === 0) {
                  setFormData(prev => ({ ...prev, debit: '' as any }))
                } else {
                  e.target.select()
                }
              }}
              onBlur={() => {
                if (formData.debit === '' || formData.debit === undefined) {
                  setFormData(prev => ({ ...prev, debit: 0 }))
                }
              }}
              step="0.01"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Credit ($)</label>
            <Input
              type="number"
              name="credit"
              value={formData.credit !== undefined ? formData.credit : ''}
              onChange={handleChange}
              onFocus={(e) => {
                if (formData.credit === 0 || formData.credit === '0' || Number(formData.credit) === 0) {
                  setFormData(prev => ({ ...prev, credit: '' as any }))
                } else {
                  e.target.select()
                }
              }}
              onBlur={() => {
                if (formData.credit === '' || formData.credit === undefined) {
                  setFormData(prev => ({ ...prev, credit: 0 }))
                }
              }}
              step="0.01"
              className="mt-1"
            />
          </div>

          {/* PDF Section */}
          <div className="col-span-2 border-t pt-4">
            <label className="text-sm font-medium block mb-2">Attach PDF</label>
            {formData.pdfPathname ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">PDF attached</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePdf}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfSelect}
                  disabled={isUploadingPdf}
                  className="flex-1"
                />
                {pdfFile && (
                  <Button
                    type="button"
                    onClick={handleUploadPdf}
                    disabled={isUploadingPdf}
                    className="gap-2"
                  >
                    {isUploadingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
