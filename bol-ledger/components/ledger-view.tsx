"use client"

import { useState, useRef, useCallback } from 'react'
import { Plus, Trash2, Edit3, Printer, Receipt, Upload, FileSpreadsheet, FileText, X, Check, AlertCircle, Settings2, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContainerPresetSelector } from './container-preset-selector'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useApp } from '@/lib/app-context'
import { LedgerEntry } from '@/lib/types'
import { EditLedgerEntryDialog } from '@/components/edit-ledger-entry-dialog'
import * as XLSX from 'xlsx'
import Image from 'next/image'

// Column mapping type
interface ColumnMapping {
  date: number | null
  shipperDescription: number | null
  invoiceNo: number | null
  dateOfShip: number | null
  billOfLanding: number | null
  containerNo: number | null
  consignee: number | null
  quantity: number | null
  debit: number | null
  credit: number | null
}

// Known column header patterns for auto-detection
const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  date: [/^date$/i, /^تاریخ$/i, /^نېټه$/i, /date.*entry/i],
  shipperDescription: [/^shipper/i, /^description/i, /لیږدونکی/i, /تفصیل/i, /^details$/i, /^particulars$/i],
  invoiceNo: [/^invoice/i, /انوایس/i, /^inv.*no/i, /^invoice.*number/i],
  dateOfShip: [/date.*ship/i, /ship.*date/i, /د بار نېټه/i],
  billOfLanding: [/^b\/l/i, /^bl$/i, /bill.*land/i, /بی ال/i, /^bol$/i],
  containerNo: [/container/i, /کانټینر/i, /^cont.*no/i],
  consignee: [/consignee/i, /وصول کوونکی/i, /^receiver$/i],
  quantity: [/quantity/i, /qty/i, /تعداد/i, /بسته/i, /^pcs$/i, /^units$/i],
  debit: [/^debit$/i, /^dr$/i, /پور/i, /^amount.*debit/i],
  credit: [/^credit$/i, /^cr$/i, /ترلاسه/i, /^amount.*credit/i, /^payment$/i, /^received$/i],
}

const emptyEntry: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'> = {
  date: new Date().toISOString().split('T')[0],
  shipperDescription: '',
  invoiceNo: '',
  dateOfShip: '',
  billOfLanding: '',
  surrenderedBL: false,
  containerNo: '',
  containerType: '',
  containerDetails: '',
  consignee: '',
  quantity: '',
  debit: 0,
  credit: 0,
}

export function LedgerView() {
  const { currentAccount, currentCompany, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, importLedgerEntries, setView, toggleSurrenderedBL, updateLedgerSettings, getLedgerSettings } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isColumnMappingOpen, setIsColumnMappingOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newEntry, setNewEntry] = useState(emptyEntry)
  const [importedEntries, setImportedEntries] = useState<Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importFileName, setImportFileName] = useState<string>('')
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [excelData, setExcelData] = useState<(string | number | undefined)[][]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    shipperDescription: null,
    invoiceNo: null,
    dateOfShip: null,
    billOfLanding: null,
    containerNo: null,
    consignee: null,
    quantity: null,
    debit: null,
    credit: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!currentAccount || !currentCompany) return null

  const handleAddEntry = () => {
    addLedgerEntry(currentAccount.id, currentCompany.id, newEntry)
    setNewEntry(emptyEntry)
    setIsOpen(false)
  }

  const [printError, setPrintError] = useState<string | null>(null)

  const handlePrint = useCallback(() => {
    // Check if there's content to print
    if (!currentCompany || currentCompany.ledgerEntries.length === 0) {
      setPrintError('No ledger entries to print. Add some entries first.')
      setTimeout(() => setPrintError(null), 5000)
      return
    }

    // Use a slight delay to ensure DOM is ready
    setTimeout(() => {
      try {
        window.print()
      } catch (error) {
        console.error('Print error:', error)
        setPrintError('Failed to open print dialog. Please try again or use Ctrl+P.')
        setTimeout(() => setPrintError(null), 5000)
      }
    }, 100)
  }, [currentCompany])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Auto-detect column mapping based on header text
  const autoDetectColumns = useCallback((headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      date: null,
      shipperDescription: null,
      invoiceNo: null,
      dateOfShip: null,
      billOfLanding: null,
      containerNo: null,
      consignee: null,
      quantity: null,
      debit: null,
      credit: null,
    }

    headers.forEach((header, index) => {
      const headerLower = String(header).trim()
      
      for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
        if (mapping[field as keyof ColumnMapping] === null) {
          for (const pattern of patterns) {
            if (pattern.test(headerLower)) {
              mapping[field as keyof ColumnMapping] = index
              break
            }
          }
        }
      }
    })

    return mapping
  }, [])

  const parseDate = (value: unknown): string => {
    if (!value) return ''
    if (typeof value === 'number') {
      // Excel date serial number
      const date = new Date((value - 25569) * 86400 * 1000)
      return date.toISOString().split('T')[0]
    }
    if (typeof value === 'string') {
      // Try various date formats
      const dateStr = value.trim()
      
      // DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      
      // YYYY/MM/DD or YYYY-MM-DD
      const ymdMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      
      // Try native Date parsing
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
      
      return dateStr
    }
    return ''
  }

  const parseNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0
    
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0
    }

    const strValue = String(value).trim()
    if (!strValue) return 0

    // Handle currency formats like "$1,234.56", "1,234.56 AFN", etc.
    // Remove currency symbols and spaces, but keep minus sign and decimal point
    let cleanedValue = strValue
      .replace(/[^\d.\-,]/g, '') // Remove currency symbols, spaces, etc.
      .replace(/,/g, '') // Remove thousands separators

    // Handle formats like "1.234,56" (European)
    if (cleanedValue.includes(',') && cleanedValue.lastIndexOf(',') > cleanedValue.lastIndexOf('.')) {
      const parts = cleanedValue.split(',')
      if (parts[1] && parts[1].length === 2) {
        // Likely European format
        cleanedValue = cleanedValue.replace('.', '').replace(',', '.')
      }
    }

    const num = parseFloat(cleanedValue)
    return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0 // Round to 2 decimal places
  }

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      
      // Validate file is not empty
      if (data.byteLength === 0) {
        setImportError('The file is empty. Please select a valid Excel file.')
        return
      }

      // Parse workbook
      let workbook
      try {
        workbook = XLSX.read(data)
      } catch (parseError) {
        setImportError('Could not parse the file. Please ensure it is a valid Excel file (.xlsx, .xls, or .csv).')
        return
      }

      // Validate sheet exists
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setImportError('The Excel file contains no sheets. Please check your file.')
        return
      }

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      if (!worksheet) {
        setImportError('Could not read the first sheet in the Excel file.')
        return
      }

      // Convert to JSON with proper type handling
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as unknown[][]

      if (jsonData.length === 0) {
        setImportError('The file appears to be empty or has no data rows.')
        return
      }

      // Filter out completely empty rows
      const nonEmptyRows = jsonData.filter(row => 
        Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
      )

      if (nonEmptyRows.length < 2) {
        setImportError('The file must contain a header row and at least one data row.')
        return
      }

      // Get headers (first row)
      const headers = (nonEmptyRows[0] as (string | number | undefined)[]).map((h, idx) => {
        const headerText = String(h || '').trim()
        return headerText || `Column ${idx + 1}`
      })
      
      // Get data rows, filtering out completely blank rows
      const rows = nonEmptyRows.slice(1) as (string | number | undefined)[][]

      if (rows.length === 0) {
        setImportError('No data rows found in the file. Please check that your file contains data.')
        return
      }

      // Auto-detect column mapping
      const detectedMapping = autoDetectColumns(headers)

      setExcelHeaders(headers)
      setExcelData(rows)
      setColumnMapping(detectedMapping)
      setImportFileName(file.name)
      setIsColumnMappingOpen(true)
      setImportError(null)
    } catch (error) {
      console.error('[v0] Excel parsing error:', error)
      setImportError('Failed to parse the Excel file. Please ensure it is valid and try again.')
    }
  }

  const applyColumnMapping = useCallback(() => {
    const entries: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>[] = []
    const errors: string[] = []

    // Check if at least date column is mapped
    if (columnMapping.date === null) {
      setImportError('Please map at least the Date column to import data.')
      return
    }

    for (const row of excelData) {
      if (!row || row.length === 0) continue
      
      // Skip if all mapped cells are empty or undefined
      const hasData = Object.entries(columnMapping).some(([, colIndex]) => {
        if (colIndex === null) return false
        const cellValue = row[colIndex]
        return cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== ''
      })
      
      if (!hasData) continue

      try {
        // Validate required fields
        const dateValue = columnMapping.date !== null ? row[columnMapping.date] : null
        if (!dateValue || String(dateValue).trim() === '') {
          errors.push(`Row skipped: Missing date value`)
          continue
        }

        const parsedDate = parseDate(dateValue)
        if (!parsedDate) {
          errors.push(`Row skipped: Invalid date format: ${dateValue}`)
          continue
        }

        const entry: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'> = {
          date: parsedDate,
          shipperDescription: columnMapping.shipperDescription !== null ? String(row[columnMapping.shipperDescription] || '').trim() : '',
          invoiceNo: columnMapping.invoiceNo !== null ? String(row[columnMapping.invoiceNo] || '').trim() : '',
          dateOfShip: columnMapping.dateOfShip !== null ? parseDate(row[columnMapping.dateOfShip]) || '' : '',
          billOfLanding: columnMapping.billOfLanding !== null ? String(row[columnMapping.billOfLanding] || '').trim() : '',
          surrenderedBL: false,
          containerNo: columnMapping.containerNo !== null ? String(row[columnMapping.containerNo] || '').trim() : '',
          consignee: columnMapping.consignee !== null ? String(row[columnMapping.consignee] || '').trim() : '',
          quantity: columnMapping.quantity !== null ? String(row[columnMapping.quantity] || '').trim() : '',
          debit: columnMapping.debit !== null ? parseNumber(row[columnMapping.debit]) : 0,
          credit: columnMapping.credit !== null ? parseNumber(row[columnMapping.credit]) : 0,
        }
        
        // Ensure debit and credit are non-negative
        if (entry.debit < 0) entry.debit = Math.abs(entry.debit)
        if (entry.credit < 0) entry.credit = Math.abs(entry.credit)

        entries.push(entry)
      } catch (error) {
        console.error('[v0] Error processing row:', error)
        errors.push(`Row skipped due to processing error`)
      }
    }

    if (entries.length === 0) {
      const errorSummary = errors.length > 0 ? ` Errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}` : ''
      setImportError(`No valid entries found with the selected column mapping.${errorSummary}`)
      return
    }

    setImportedEntries(entries)
    setIsColumnMappingOpen(false)
    setIsImportOpen(true)
  }, [excelData, columnMapping])

  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry)
    setIsEditOpen(true)
  }

  const handleSaveEditedEntry = async (updatedData: Partial<LedgerEntry>) => {
    if (!currentAccount || !currentCompany) return

    if (!editingEntry) {
      const debitNum = !updatedData.debit || (updatedData.debit as any) === '' ? 0 : Number(updatedData.debit) || 0
      const creditNum = !updatedData.credit || (updatedData.credit as any) === '' ? 0 : Number(updatedData.credit) || 0
      addLedgerEntry(currentAccount.id, currentCompany.id, {
        date: updatedData.date || new Date().toISOString().split('T')[0],
        shipperDescription: updatedData.shipperDescription || '',
        invoiceNo: updatedData.invoiceNo || '',
        dateOfShip: updatedData.dateOfShip || '',
        barnamehNo: updatedData.barnamehNo || '',
        driverFreight: updatedData.driverFreight || '',
        billOfLanding: updatedData.billOfLanding || '',
        surrenderedBL: !!updatedData.surrenderedBL,
        containerNo: updatedData.containerNo || '',
        containerType: updatedData.containerType || '',
        containerDetails: updatedData.containerDetails || '',
        consignee: updatedData.consignee || '',
        quantity: updatedData.quantity || '',
        debit: debitNum,
        credit: creditNum,
        price: updatedData.price !== undefined ? updatedData.price : debitNum,
        cost: updatedData.cost !== undefined ? updatedData.cost : 0,
        profit: updatedData.profit !== undefined ? updatedData.profit : 0,
        shippingCost: updatedData.shippingCost !== undefined ? updatedData.shippingCost : (updatedData.cost || 0),
        pdfPathname: updatedData.pdfPathname,
      })
      setIsEditOpen(false)
      setEditingEntry(null)
      return
    }

    try {
      const response = await fetch('/api/ledger-entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          ...updatedData,
        }),
      })

      if (!response.ok) throw new Error('Failed to update entry')

      // Update the local state (this will be replaced with proper DB sync)
      const updatedEntry = await response.json()
      
      // Call context update with proper arguments
      updateLedgerEntry(currentAccount.id, currentCompany.id, updatedEntry.id, updatedEntry)
      setIsEditOpen(false)
      setEditingEntry(null)
    } catch (error) {
      console.error('[v0] Error saving entry:', error)
    }
  }

  const handleUploadPdfForEntry = async (file: File): Promise<{ pathname: string; filename: string } | void> => {
    if (!editingEntry) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entryId', editingEntry.id)

      const response = await fetch('/api/pdf-upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('PDF upload failed')

      const result = await response.json()
      return result
    } catch (error) {
      console.error('[v0] Error uploading PDF:', error)
    }
  }

  const handleDeletePdfForEntry = async (pathname: string) => {
    if (!editingEntry) return

    try {
      const response = await fetch(`/api/pdf-upload?pathname=${encodeURIComponent(pathname)}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('PDF delete failed')
    } catch (error) {
      console.error('[v0] Error deleting PDF:', error)
    }
  }

  const handlePDFUpload = async (file: File) => {
    try {
      setIsLoading(true)
      setImportError(null)

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setImportError('Please select a PDF file.')
        return
      }

      if (file.size === 0) {
        setImportError('The file is empty. Please select a valid PDF file.')
        return
      }

      // Dynamically import PDF parser (client-side only)
      const { parseLedgerPDF } = await import('@/lib/pdf-parser')

      // Parse PDF
      const pdfRows = await parseLedgerPDF(file)

      if (pdfRows.length === 0) {
        setImportError('No valid ledger entries found in the PDF.')
        return
      }

      // Convert PDF rows to ledger entries
      const entries: Omit<LedgerEntry, 'id' | 'sNo' | 'balance'>[] = pdfRows.map(row => ({
        date: row.date,
        shipperDescription: row.shipperDescription || '',
        invoiceNo: row.invoiceNo || '',
        dateOfShip: row.dateOfShip || '',
        billOfLanding: row.billOfLanding || '',
        surrenderedBL: false,
        containerNo: row.containerNo || '',
        consignee: row.consignee || '',
        quantity: row.quantity || '',
        debit: row.debit || 0,
        credit: row.credit || 0,
      }))

      setImportedEntries(entries)
      setImportFileName(file.name)
      setIsImportOpen(true)
      setIsLoading(false)
    } catch (error) {
      console.error('[v0] PDF import error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse PDF'
      setImportError(`PDF parsing failed: ${errorMsg}. Please ensure the file is a valid ledger PDF.`)
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    
    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      parseExcelFile(file)
    } else if (extension === 'pdf') {
      handlePDFUpload(file)
    } else {
      setImportError('Unsupported file format. Please use Excel (.xlsx, .xls, .csv) or PDF files.')
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (importedEntries.length === 0) return

    setIsLoading(true)
    try {
      // Attempt to save entries to database via API
      const entriesToSave = importedEntries.map(entry => ({
        company_id: currentCompany.id,
        date: entry.date,
        shipper_description: entry.shipperDescription,
        invoice_no: entry.invoiceNo,
        date_of_ship: entry.dateOfShip,
        bill_of_landing: entry.billOfLanding,
        container_no: entry.containerNo,
        consignee: entry.consignee,
        quantity: entry.quantity,
        debit: entry.debit,
        credit: entry.credit,
      }))

      const response = await fetch('/api/ledger-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesToSave }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to import entries to database')
      }

      // Also update in-memory state
      importLedgerEntries(currentAccount.id, currentCompany.id, importedEntries)
      setImportedEntries([])
      setIsImportOpen(false)
      setImportFileName('')
      setImportError(null)
    } catch (error) {
      console.error('[v0] Error importing entries:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to import entries'
      setImportError(
        `Import partially failed: ${errorMsg} Entries were added locally but may not have been saved to the database. Please try again or contact support.`
      )
    } finally {
      setIsLoading(false)
    }
  }

  const updateColumnMapping = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value === 'none' ? null : parseInt(value, 10)
    }))
  }

  const totalDebit = currentCompany.ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = currentCompany.ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
  const finalBalance = totalDebit - totalCredit

  const fieldLabels: Record<keyof ColumnMapping, { en: string; ps: string }> = {
    date: { en: 'Date', ps: 'تاریخ' },
    shipperDescription: { en: 'Shipper/Description', ps: 'لیږدونکی/تفصیل' },
    invoiceNo: { en: 'Invoice No', ps: 'انوایس' },
    dateOfShip: { en: 'Date of Ship', ps: 'د بار نېټه' },
    billOfLanding: { en: 'Bill of Landing', ps: 'بی ال' },
    containerNo: { en: 'Container No', ps: 'کانټینر' },
    consignee: { en: 'Consignee', ps: 'وصول کوونکی' },
    quantity: { en: 'Quantity', ps: 'تعداد' },
    debit: { en: 'Debit', ps: 'پور' },
    credit: { en: 'Credit', ps: 'ترلاسه' },
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
      />

      {/* Actions Bar - Glass Blue Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h2 className="text-3xl font-bold text-blue-900 tracking-tight">Ledger</h2>
          <p className="text-blue-600/70 mt-1">
            {currentCompany.name} - {currentCompany.ledgerEntries.length} entries
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 bg-white/50 hover:bg-blue-50/80 border-blue-200/60 text-blue-700 hover:text-blue-900 backdrop-blur-sm"
            onClick={() => setView('invoice')}
          >
            <Receipt className="h-4 w-4" />
            Invoice
          </Button>
          
          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="gap-2 bg-white/50 hover:bg-blue-50/80 border-blue-200/60 text-blue-700 hover:text-blue-900 backdrop-blur-sm" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isLoading ? 'Processing...' : 'Import'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-strong border-blue-200/50">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer hover:bg-blue-50/80">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Import from Excel (.xlsx, .csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer hover:bg-blue-50/80">
                <FileText className="h-4 w-4 text-red-500" />
                Import from PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" variant="outline" className="gap-2 bg-white/50 hover:bg-blue-50/80 border-blue-200/60 text-blue-700 hover:text-blue-900 backdrop-blur-sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="outline" className="gap-2 bg-white/50 hover:bg-blue-50/80 border-blue-200/60 text-blue-700 hover:text-blue-900 backdrop-blur-sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
          <Button type="button" onClick={() => { setEditingEntry(null); setIsEditOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Print Error Alert */}
      {printError && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 flex items-center gap-3 no-print">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">{printError}</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => setPrintError(null)} className="h-8 w-8 hover:bg-amber-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Import Error Alert */}
      {importError && (
        <div className="mb-4 p-4 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-200/60 flex items-center gap-3 no-print">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{importError}</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => setImportError(null)} className="h-8 w-8 hover:bg-red-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white/90 backdrop-blur-xl border border-blue-200/50 max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl shadow-blue-500/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-900">Add Ledger Entry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date / تاریخ</label>
              <Input
                type="date"
                value={newEntry.date}
                onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shipper/Description / لیږدونکی/تفصیل</label>
              <Input
                value={newEntry.shipperDescription}
                onChange={e => setNewEntry({ ...newEntry, shipperDescription: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice No / انوایس</label>
              <Input
                value={newEntry.invoiceNo}
                onChange={e => setNewEntry({ ...newEntry, invoiceNo: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Ship</label>
              <Input
                type="date"
                value={newEntry.dateOfShip}
                onChange={e => setNewEntry({ ...newEntry, dateOfShip: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bill of Landing / B/L NO</label>
              <Input
                value={newEntry.billOfLanding}
                onChange={e => setNewEntry({ ...newEntry, billOfLanding: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="col-span-full bg-slate-50/70 p-3 rounded-xl border border-blue-200/60 shadow-xs">
              <ContainerPresetSelector
                containerNo={newEntry.containerNo}
                containerType={newEntry.containerType || ''}
                containerDetails={newEntry.containerDetails || ''}
                onChangeContainerNo={val => setNewEntry({ ...newEntry, containerNo: val })}
                onChangeContainerType={val => setNewEntry({ ...newEntry, containerType: val })}
                onChangeContainerDetails={val => setNewEntry({ ...newEntry, containerDetails: val })}
                showDetailsField={true}
                showQuickChips={true}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Consignee / د مال وصول کوونکی</label>
              <Input
                value={newEntry.consignee}
                onChange={e => setNewEntry({ ...newEntry, consignee: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity / تعداد</label>
              <Input
                value={newEntry.quantity}
                onChange={e => setNewEntry({ ...newEntry, quantity: e.target.value })}
                className="bg-white/50 border-white/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Debit</label>
              <Input
                type="number"
                value={newEntry.debit !== undefined ? newEntry.debit : ''}
                onChange={e => setNewEntry({ ...newEntry, debit: e.target.value === '' ? '' as any : (parseFloat(e.target.value) || 0) })}
                onFocus={(e) => {
                  if (newEntry.debit === 0 || newEntry.debit === '0' || Number(newEntry.debit) === 0) {
                    setNewEntry(prev => ({ ...prev, debit: '' as any }))
                  } else {
                    e.target.select()
                  }
                }}
                onBlur={() => {
                  if (newEntry.debit === '' || newEntry.debit === undefined) {
                    setNewEntry(prev => ({ ...prev, debit: 0 }))
                  }
                }}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Credit</label>
              <Input
                type="number"
                value={newEntry.credit !== undefined ? newEntry.credit : ''}
                onChange={e => setNewEntry({ ...newEntry, credit: e.target.value === '' ? '' as any : (parseFloat(e.target.value) || 0) })}
                onFocus={(e) => {
                  if (newEntry.credit === 0 || newEntry.credit === '0' || Number(newEntry.credit) === 0) {
                    setNewEntry(prev => ({ ...prev, credit: '' as any }))
                  } else {
                    e.target.select()
                  }
                }}
                onBlur={() => {
                  if (newEntry.credit === '' || newEntry.credit === undefined) {
                    setNewEntry(prev => ({ ...prev, credit: 0 }))
                  }
                }}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white/30">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleAddEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Mapping Dialog */}
      <Dialog open={isColumnMappingOpen} onOpenChange={setIsColumnMappingOpen}>
        <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Map Excel Columns - {importFileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Match your Excel columns to the ledger fields. The system has auto-detected some mappings based on headers.
            </p>
            
            {/* Sample data preview */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Detected Headers:</h4>
              <div className="flex flex-wrap gap-2">
                {excelHeaders.map((header, index) => (
                  <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                    {index}: {header || '(empty)'}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(Object.entries(fieldLabels) as [keyof ColumnMapping, { en: string; ps: string }][]).map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <label className="text-sm font-medium">
                    {label.en} <span className="text-muted-foreground">/ {label.ps}</span>
                  </label>
                  <Select
                    value={columnMapping[field]?.toString() ?? 'none'}
                    onValueChange={(value) => updateColumnMapping(field, value)}
                  >
                    <SelectTrigger className="bg-white/50 border-white/30">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Skip --</SelectItem>
                      {excelHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {index}: {header || '(empty)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            {excelData.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Data Preview (first 3 rows):</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        {excelHeaders.map((header, index) => (
                          <TableHead key={index} className="whitespace-nowrap text-xs">
                            {header || `Col ${index}`}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excelData.slice(0, 3).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {excelHeaders.map((_, colIndex) => (
                            <TableCell key={colIndex} className="text-xs whitespace-nowrap">
                              {String(row[colIndex] || '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="gap-2 bg-white/30">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={applyColumnMapping} className="gap-2">
              <Check className="h-4 w-4" />
              Apply Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="glass-strong max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Import Preview - {importFileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Found {importedEntries.length} entries to import. Review and confirm below:
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Description</TableHead>
                    <TableHead className="whitespace-nowrap">Invoice</TableHead>
                    <TableHead className="whitespace-nowrap">Container</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Debit</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedEntries.slice(0, 10).map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.shipperDescription}</TableCell>
                      <TableCell>{entry.invoiceNo}</TableCell>
                      <TableCell>{entry.containerNo}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {importedEntries.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        ... and {importedEntries.length - 10} more entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="gap-2 bg-white/30">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmImport} className="gap-2">
              <Check className="h-4 w-4" />
              Import {importedEntries.length} Entries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger Table - Glass Blue/White Design */}
      <Card className="liquid-glass overflow-hidden rounded-2xl relative">
        {/* Background Image for Screen */}
        {getLedgerSettings().backgroundImage && (
          <div 
            className="absolute inset-0 pointer-events-none no-print"
            style={{
              backgroundImage: `url(${getLedgerSettings().backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.1,
              zIndex: 0,
            }}
          />
        )}
        
        {/* Glass overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white/20 to-blue-100/30 pointer-events-none no-print" style={{ zIndex: 1 }} />
        
        {/* Ledger Header with Logo and Info - Screen Version */}
        <div className="relative z-10 no-print border-b border-blue-200/50 bg-gradient-to-r from-blue-50/60 via-white/40 to-blue-50/60 backdrop-blur-sm">
          <div className="px-6 py-4 flex items-start justify-between">
            {/* Left - Account/Shipper Info */}
            <div className="flex-1">
              <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider mb-1">Account Ledger</p>
              <p className="text-lg font-bold text-blue-900">{currentCompany.name}</p>
              <p className="text-[10px] text-blue-500 mt-0.5">Account Holder / Shipper</p>
              <p className="text-xs text-blue-700 mt-2">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            {/* Center - Logo and Company Name */}
            <div className="flex-1 flex flex-col items-center">
              {getLedgerSettings().logoUrl ? (
                <img 
                  src={getLedgerSettings().logoUrl} 
                  alt="Company Logo" 
                  className="h-14 max-w-[140px] object-contain mb-2" 
                />
              ) : getLedgerSettings().companyLogo ? (
                <Image
                  src={getLedgerSettings().companyLogo}
                  alt="Company Logo"
                  width={140}
                  height={56}
                  className="object-contain mb-2"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <span className="text-xl font-bold text-blue-600">SA</span>
                </div>
              )}
              <p className="text-lg font-bold text-blue-800">SKY ARIANA</p>
              <p className="text-[10px] text-blue-600 tracking-[0.15em] uppercase">Transport & Logistics</p>
            </div>
            
            {/* Right - Company Address */}
            <div className="flex-1 text-right">
              <p className="text-[11px] font-semibold text-blue-700 mb-1">AFGHANISTAN OFFICE</p>
              <p className="text-[9px] text-blue-600 leading-relaxed">
                2nd Floor, 16 No. Office,<br />
                Shahidano Chowk, Etimad Rahmi Market,<br />
                Kandahar, Afghanistan
              </p>
              <p className="text-[9px] text-blue-500 mt-2">
                Tel: +93 700 939 365<br />
                info@skyariana.com
              </p>
              <p className="text-[8px] text-blue-400 mt-1">Licence: 2401-2198</p>
            </div>
          </div>
        </div>
        
        {/* Screen Table (hidden during print) */}
        <CardContent className="p-0 no-print relative z-10">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full border-collapse text-xs" style={{ minWidth: '1200px' }}>
              <thead>
                <tr className="bg-gradient-to-r from-blue-100/80 via-blue-50/60 to-white/60 backdrop-blur-sm">
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '45px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">S.NO</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">مسلسل شمېره</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '85px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">DATE / تاریخ</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">نېټه</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '150px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">SHIPPER/Description</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">لیږدونکی / تفصیل</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '80px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">INVOICE.NO</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">انوایس</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '90px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">DATE-OF-SHIP</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">د بار نېټه</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '110px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">BILL OF LANDING</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">B/L NO / بی ال</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '110px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">CONTIANER.NO</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">د کانټینر شمېره</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '110px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">CONSIGNEE</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">د مال وصول کوونکی</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '90px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">QUANTITY / تعداد</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">د توکو بسته بندي</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '70px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">DEBIT</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">د پور حساب</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '70px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">CREDIT</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">ترلاسه شوی مبلغ</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '85px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">BALANCE USD</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">(USD) بیلانس</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 bg-blue-50/40" style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {currentCompany.ledgerEntries.length === 0 ? (
                  <>
                    {/* Show 17 empty rows to match PDF */}
                    {Array.from({ length: 17 }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="bg-white/40 hover:bg-blue-50/40 transition-colors">
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-800">{idx + 1}</td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                        <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30">
                          <div className="flex gap-0.5 justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-blue-100 hover:text-blue-600"
                              onClick={() => { setEditingEntry(null); setIsEditOpen(true); }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100/80 via-blue-50/60 to-white/60 font-semibold backdrop-blur-sm">
                      <td colSpan={9} className="border border-blue-200/60 px-1 py-1.5 text-right text-[10px]"></td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-900 font-mono font-bold">$0</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30"></td>
                    </tr>
                  </>
                ) : (
                  <>
                    {currentCompany.ledgerEntries.map(entry => {
                      const isCredit = entry.credit > 0;
                      return (
                      <tr 
                        key={entry.id} 
                        className={`transition-colors ${
                          isCredit 
                            ? 'bg-emerald-100/70 hover:bg-emerald-200/70' 
                            : 'bg-white/40 hover:bg-blue-50/50'
                        }`}
                      >
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-medium ${isCredit ? 'border-emerald-300/60 text-emerald-800' : 'border-blue-200/60 text-blue-800'}`}>{entry.sNo}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] whitespace-nowrap ${isCredit ? 'border-emerald-300/60 text-emerald-900' : 'border-blue-200/60 text-blue-900'}`}>{entry.date}</td>
                        <td className={`border px-1 py-1.5 text-left text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 font-medium' : 'border-blue-200/60 text-blue-900'}`}>
                          {isCredit ? (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                              {entry.shipperDescription || 'RECEIVING MONEY'}
                            </span>
                          ) : entry.shipperDescription}
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900' : 'border-blue-200/60 text-blue-900'}`}>{entry.invoiceNo}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] whitespace-nowrap ${isCredit ? 'border-emerald-300/60 text-emerald-900' : 'border-blue-200/60 text-blue-900'}`}>{entry.dateOfShip}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 bg-emerald-50/50' : 'border-blue-200/60 bg-white/40'}`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-mono text-[9px] font-medium ${isCredit ? 'text-emerald-900' : 'text-blue-900'}`}>{entry.billOfLanding}</span>
                            {entry.surrenderedBL && (
                              <div className="inline-flex items-center justify-center">
                                <span className="border border-emerald-500 text-emerald-600 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider bg-emerald-50/80 rounded-sm">
                                  Surrender
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Checkbox
                                id={`surrendered-${entry.id}`}
                                checked={entry.surrenderedBL || false}
                                onCheckedChange={() => toggleSurrenderedBL(currentAccount.id, currentCompany.id, entry.id)}
                                className="h-3 w-3 border-blue-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                              <label htmlFor={`surrendered-${entry.id}`} className={`text-[8px] cursor-pointer transition-colors ${isCredit ? 'text-emerald-600/70 hover:text-emerald-800' : 'text-blue-600/70 hover:text-blue-800'}`}>
                                {entry.surrenderedBL ? 'Surrendered' : 'Surrender'}
                              </label>
                            </div>
                          </div>
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {entry.containerType && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-blue-100/90 text-blue-950 border border-blue-200 shadow-2xs">
                                {entry.containerType}
                              </span>
                            )}
                            <span className="font-mono font-bold text-[9.5px] text-blue-950 tracking-wider">
                              {entry.containerNo || (entry.containerType ? "" : "—")}
                            </span>
                            {entry.containerDetails && (
                              <span className="text-[8px] text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded px-1 max-w-[130px] truncate" title={entry.containerDetails}>
                                {entry.containerDetails}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>{entry.consignee}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>{entry.quantity}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-mono ${isCredit ? 'border-emerald-300/60 bg-emerald-50/50 text-red-600' : 'border-blue-200/60 bg-white/40 text-red-600'}`}>
                          {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-mono font-semibold ${isCredit ? 'border-emerald-300/60 bg-emerald-200/60 text-emerald-700' : 'border-blue-200/60 bg-white/40 text-emerald-600'}`}>
                          {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-mono font-bold ${isCredit ? 'border-emerald-300/60 bg-emerald-100/70 text-emerald-900' : 'border-blue-200/60 bg-blue-50/50 text-blue-900'}`}>
                          {formatCurrency(entry.balance)}
                        </td>
                        <td className={`border px-1 py-1 ${isCredit ? 'border-emerald-300/60 bg-emerald-50/50' : 'border-blue-200/60 bg-blue-50/30'}`}>
                          <div className="flex gap-0.5 justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-blue-100 hover:text-blue-600"
                              onClick={() => handleEditEntry(entry)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-red-100 hover:text-red-600"
                              onClick={() => deleteLedgerEntry(currentAccount.id, currentCompany.id, entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                    {/* Empty rows to fill to 17 */}
                    {Array.from({ length: Math.max(0, 17 - currentCompany.ledgerEntries.length) }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="bg-white/40 hover:bg-blue-50/40 transition-colors">
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-800">{currentCompany.ledgerEntries.length + idx + 1}</td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                        <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30"></td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100/80 via-blue-50/60 to-white/60 font-semibold backdrop-blur-sm">
                      <td colSpan={9} className="border border-blue-200/60 px-1 py-1.5 text-right text-[10px]"></td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] font-mono text-red-600">{formatCurrency(totalDebit)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] font-mono text-emerald-600">{formatCurrency(totalCredit)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] font-mono text-blue-900 font-bold">{formatCurrency(finalBalance)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Footer - Glass Blue Design */}
        <div className="border-t border-blue-200/50 px-4 py-4 text-center text-[9px] text-blue-700 leading-relaxed no-print bg-gradient-to-r from-blue-50/50 via-white/50 to-blue-50/50 backdrop-blur-sm">
          <p className="text-blue-800">info@skyariana.com, transport@skyariana.com</p>
          <p className="text-blue-600">MOB: +93 700 939 365, +93711 4355 29</p>
          <p className="mt-2 font-semibold text-blue-900">AFGHANISTAN OFFICE</p>
          <p className="text-blue-700">2nd FLOOR, 16 NO. OFFICE,</p>
          <p className="text-blue-700">SHAHIDANO, CHOWK, ETIMAD RAHMI MARKET ,</p>
          <p className="text-blue-700">KANDAHAR, AFGHANISTAN.</p>
          <p className="text-blue-600">LICENCE NUMBER: 2401-2198</p>
          <p className="text-blue-800 mt-1">EMAIL: info@skyariana.com, transport@skyariana.com</p>
          <p className="text-blue-600">MOB: +93 700 939 365, +93711 4355 29</p>
        </div>

        {/* Print Table - Glass Blue/White Design matching screen UI */}
        <div className="hidden print:block print-container print-wrapper" style={{ position: 'relative' }}>
          {/* Background Image */}
          <div 
            className="print-background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${getLedgerSettings().backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.1,
              zIndex: 0,
            }}
          />
          
          {/* Content over background */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Print Header with Logo, Company Info, and Account Info - Clean Blue Style */}
            <div className="print-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              marginBottom: '12px',
              padding: '12px 16px',
              borderBottom: '2px solid #1e40af',
              background: '#eff6ff',
              borderRadius: '8px 8px 0 0'
            }}>
              {/* Left Side - Account/Shipper Info */}
              <div style={{ flex: '1', textAlign: 'left' }}>
                <p style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600', marginBottom: '2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Account Ledger</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '3px' }}>{currentCompany.name}</p>
                <p style={{ fontSize: '9px', color: '#60a5fa' }}>Account Holder / Shipper</p>
                <p style={{ fontSize: '10px', color: '#1e40af', marginTop: '5px', fontWeight: '500' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              {/* Center - Logo and Company Name */}
              <div style={{ flex: '1', textAlign: 'center' }}>
                {getLedgerSettings().logoUrl ? (
                  <img 
                    src={getLedgerSettings().logoUrl} 
                    alt="Company Logo" 
                    className="print-logo"
                    style={{ 
                      height: '50px', 
                      maxWidth: '120px', 
                      objectFit: 'contain',
                      marginBottom: '5px',
                      display: 'inline-block'
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '5px'
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>SA</span>
                  </div>
                )}
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '2px' }}>SKY ARIANA</p>
                <p style={{ fontSize: '10px', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase' }}>Transport & Logistics</p>
              </div>
              
              {/* Right Side - Company Address */}
              <div style={{ flex: '1', textAlign: 'right' }}>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#1e40af', marginBottom: '3px' }}>AFGHANISTAN OFFICE</p>
                <p style={{ fontSize: '8px', color: '#3b82f6', lineHeight: '1.5' }}>
                  2nd Floor, 16 No. Office,<br />
                  Shahidano Chowk, Etimad Rahmi Market,<br />
                  Kandahar, Afghanistan
                </p>
                <p style={{ fontSize: '8px', color: '#60a5fa', marginTop: '4px' }}>
                  Tel: +93 700 939 365<br />
                  info@skyariana.com
                </p>
                <p style={{ fontSize: '7px', color: '#93c5fd', marginTop: '2px' }}>Licence: 2401-2198</p>
              </div>
            </div>
            
            <table className="ledger-print-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>
                    <div className="header-en">S.NO</div>
                    <div className="header-ps">مسلسل شمېره</div>
                  </th>
                  <th style={{ width: '75px' }}>
                    <div className="header-en">DATE / تاریخ</div>
                    <div className="header-ps">نېټه</div>
                  </th>
                  <th style={{ width: '140px' }}>
                    <div className="header-en">SHIPPER/Description</div>
                    <div className="header-ps">لیږدونکی / تفصیل</div>
                  </th>
                  <th style={{ width: '70px' }}>
                    <div className="header-en">INVOICE.NO</div>
                    <div className="header-ps">انوایس</div>
                  </th>
                  <th style={{ width: '75px' }}>
                    <div className="header-en">DATE-OF-SHIP</div>
                    <div className="header-ps">د بار نېټه</div>
                  </th>
                  <th style={{ width: '90px' }}>
                    <div className="header-en">BILL OF LANDING</div>
                    <div className="header-ps">B/L NO / بی ال</div>
                  </th>
                  <th style={{ width: '90px' }}>
                    <div className="header-en">CONTIANER.NO</div>
                    <div className="header-ps">د کانټینر شمېره</div>
                  </th>
                  <th style={{ width: '90px' }}>
                    <div className="header-en">CONSIGNEE</div>
                    <div className="header-ps">د مال وصول کوونکی</div>
                  </th>
                  <th style={{ width: '70px' }}>
                    <div className="header-en">QUANTITY / تعداد</div>
                    <div className="header-ps">د توکو بسته بندي</div>
                  </th>
                  <th style={{ width: '60px' }}>
                    <div className="header-en">DEBIT</div>
                    <div className="header-ps">د پور حساب</div>
                  </th>
                  <th style={{ width: '60px' }}>
                    <div className="header-en">CREDIT</div>
                    <div className="header-ps">ترلاسه شوی مبلغ</div>
                  </th>
                  <th style={{ width: '70px' }}>
                    <div className="header-en">BALANCE USD</div>
                    <div className="header-ps">(USD) بیلانس</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentCompany.ledgerEntries.map((entry) => {
                  const isCredit = entry.credit > 0;
                  return (
                  <tr 
                    key={entry.id}
                    className={isCredit ? 'credit-row' : ''}
                  >
                    <td style={{ fontWeight: 600 }}>{entry.sNo}</td>
                    <td>{entry.date}</td>
                    <td className="text-left" style={{ fontWeight: isCredit ? 600 : 'normal' }}>
                      {isCredit ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                          {entry.shipperDescription || 'RECEIVING MONEY'}
                        </span>
                      ) : entry.shipperDescription}
                    </td>
                    <td>{entry.invoiceNo}</td>
                    <td>{entry.dateOfShip}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontWeight: 'bold' }}>{entry.billOfLanding || '—'}</span>
                        {entry.surrenderedBL && (
                          <span style={{ 
                            border: '1px solid #059669',
                            color: '#059669',
                            padding: '0.5px 3.5px',
                            fontSize: '6px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            backgroundColor: '#ecfdf5',
                            borderRadius: '2px',
                            whiteSpace: 'nowrap'
                          }}>✓ Surrender</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' }}>
                        {entry.containerType && (
                          <span style={{ 
                            display: 'inline-block',
                            padding: '0.5px 3px', 
                            borderRadius: '3px', 
                            fontSize: '7px', 
                            fontWeight: 'bold', 
                            backgroundColor: '#dbeafe', 
                            color: '#1e3a8a', 
                            border: '1px solid #93c5fd',
                            whiteSpace: 'nowrap'
                          }}>
                            {entry.containerType}
                          </span>
                        )}
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '8px' }}>
                          {entry.containerNo || (entry.containerType ? "" : "—")}
                        </span>
                        {entry.containerDetails && (
                          <span style={{ 
                            fontSize: '6px', 
                            color: '#065f46', 
                            backgroundColor: '#ecfdf5', 
                            border: '1px solid #a7f3d0', 
                            borderRadius: '2px', 
                            padding: '0.5px 2px' 
                          }}>
                            {entry.containerDetails}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{entry.consignee}</td>
                    <td>{entry.quantity}</td>
                    <td className="text-right debit-cell">{entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : ''}</td>
                    <td className="text-right credit-cell">{entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : ''}</td>
                    <td className="text-right balance-cell">${entry.balance.toLocaleString()}</td>
                  </tr>
                );
                })}
                {/* Empty rows to fill page nicely without overflowing onto page 2 */}
                {Array.from({ length: Math.max(0, 10 - currentCompany.ledgerEntries.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td>{currentCompany.ledgerEntries.length + idx + 1}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="balance-cell">$0</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="totals-row">
                  <td colSpan={9} style={{ textAlign: 'right', fontWeight: 'bold' }}></td>
                  <td className="text-right debit-cell" style={{ fontWeight: 600 }}>${totalDebit.toLocaleString()}</td>
                  <td className="text-right credit-cell" style={{ fontWeight: 600 }}>${totalCredit.toLocaleString()}</td>
                  <td className="text-right balance-cell">${finalBalance.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            
            {/* Print Footer - Clean Blue Style */}
            <div className="print-footer" style={{ 
              marginTop: '12px', 
              padding: '10px 16px', 
              borderTop: '1px solid #93c5fd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: '#eff6ff',
              borderRadius: '0 0 8px 8px'
            }}>
              <div style={{ fontSize: '7px', textAlign: 'left' }}>
                <p style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '2px' }}>SKY ARIANA TRANSPORT & LOGISTICS</p>
                <p style={{ color: '#3b82f6' }}>Licence: 2401-2198</p>
              </div>
              <div style={{ fontSize: '7px', textAlign: 'center' }}>
                <p style={{ color: '#1e40af' }}>info@skyariana.com | transport@skyariana.com</p>
                <p style={{ color: '#3b82f6' }}>+93 700 939 365 | +93 711 435 529</p>
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right' }}>
                <p style={{ color: '#1e40af' }}>2nd Floor, 16 No. Office, Shahidano Chowk</p>
                <p style={{ color: '#3b82f6' }}>Etimad Rahmi Market, Kandahar, Afghanistan</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Ledger Entry Dialog */}
      <EditLedgerEntryDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        entry={editingEntry}
        onSave={handleSaveEditedEntry}
        onPdfUpload={handleUploadPdfForEntry}
        onPdfDelete={handleDeletePdfForEntry}
      />

      {/* Ledger Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ledger Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Company Logo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-16 border rounded flex items-center justify-center bg-gray-50 overflow-hidden">
                  {getLedgerSettings().companyLogo ? (
                    <Image
                      src={getLedgerSettings().companyLogo}
                      alt="Company Logo"
                      width={80}
                      height={60}
                      className="object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="/logo.png"
                    value={getLedgerSettings().companyLogo}
                    onChange={(e) => updateLedgerSettings(currentAccount!.id, currentCompany!.id, { companyLogo: e.target.value })}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter logo path (e.g., /logo.png)
                  </p>
                </div>
              </div>
            </div>

            {/* Background Image */}
            <div className="space-y-2">
              <label className="text-sm font-medium">PDF Background Image</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-16 border rounded flex items-center justify-center bg-gray-50 overflow-hidden">
                  {getLedgerSettings().backgroundImage ? (
                    <Image
                      src={getLedgerSettings().backgroundImage}
                      alt="Background"
                      width={80}
                      height={60}
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="/ledger-background.png"
                    value={getLedgerSettings().backgroundImage}
                    onChange={(e) => updateLedgerSettings(currentAccount!.id, currentCompany!.id, { backgroundImage: e.target.value })}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter background image path for PDF
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsSettingsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
