"use client"

import { useState, useRef, useCallback, useEffect, memo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Edit3, Printer, Receipt, Upload, FileSpreadsheet, FileText, X, Check, AlertCircle, Settings2, Loader2, Image as ImageIcon, CheckCircle2, RotateCcw, AlertTriangle, RefreshCw, Undo2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  consignee: '',
  quantity: '',
  debit: 0,
  credit: 0,
}

function LedgerPrintPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const existing = document.getElementById("sky-ledger-print-root") as HTMLDivElement | null
    const root = existing || document.createElement("div")

    root.id = "sky-ledger-print-root"
    root.className = "ledger-print-root"
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

export const LedgerView = memo(function LedgerView() {
  const {
    accounts,
    currentAccount,
    currentCompany,
    selectAccount,
    selectCompany,
    addLedgerEntry,
    updateLedgerEntry,
    deleteLedgerEntry,
    restoreLedgerEntry,
    restoreAllDeletedEntries,
    resyncMissingBols,
    deletedLedgerEntries,
    importLedgerEntries,
    setView,
    toggleSurrenderedBL,
    updateLedgerSettings,
    getLedgerSettings,
  } = useApp()
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
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete Confirmation Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null)

  // Restore & Resync States
  const [isRestoreOpen, setIsRestoreOpen] = useState(false)
  const [isResyncing, setIsResyncing] = useState(false)
  const [resyncStatusMessage, setResyncStatusMessage] = useState<string | null>(null)
  const [undoBanner, setUndoBanner] = useState<{ visible: boolean; entry: LedgerEntry | null }>({
    visible: false,
    entry: null,
  })

  if (!currentAccount || !currentCompany) return null

  const handleAddEntry = () => {
    addLedgerEntry(currentAccount.id, currentCompany.id, {
      ...newEntry,
      debit: !newEntry.debit || (newEntry.debit as any) === '' ? 0 : Number(newEntry.debit) || 0,
      credit: !newEntry.credit || (newEntry.credit as any) === '' ? 0 : Number(newEntry.credit) || 0,
    })
    setNewEntry(emptyEntry)
    setIsOpen(false)
  }

  const handleResyncBols = async () => {
    if (!currentAccount || !currentCompany) return
    setIsResyncing(true)
    try {
      const recovered = await resyncMissingBols(currentAccount.id, currentCompany.id)
      if (recovered > 0) {
        setResyncStatusMessage(`Successfully brought back ${recovered} missing BOL entry/entries into this ledger!`)
      } else {
        setResyncStatusMessage('All saved BOLs for this company are already active in the ledger.')
      }
    } catch (e) {
      setResyncStatusMessage('Could not resync BOLs. Please try again.')
    } finally {
      setIsResyncing(false)
      setTimeout(() => setResyncStatusMessage(null), 6000)
    }
  }

  const [printError, setPrintError] = useState<string | null>(null)

  const handlePrint = useCallback(() => {
    // Check if there's content to print
    if (!currentCompany || currentCompany.ledgerEntries.length === 0) {
      setPrintError('No ledger entries to print. Add some entries first.')
      setTimeout(() => setPrintError(null), 5000)
      return
    }

    // Inject A4 Landscape @page rule dynamically to force landscape print orientation
    let landscapeStyle = document.getElementById("sky-ledger-landscape-print-style") as HTMLStyleElement | null
    if (!landscapeStyle) {
      landscapeStyle = document.createElement("style")
      landscapeStyle.id = "sky-ledger-landscape-print-style"
      landscapeStyle.innerHTML = `
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 4mm !important;
          }
          html, body {
            background: #ffffff !important;
          }
        }
      `
      document.head.appendChild(landscapeStyle)
    }

    document.body.classList.add("ledger-landscape-active")

    const cleanup = () => {
      document.body.classList.remove("ledger-landscape-active")
      const styleEl = document.getElementById("sky-ledger-landscape-print-style")
      if (styleEl && styleEl.parentElement) {
        styleEl.parentElement.removeChild(styleEl)
      }
      window.removeEventListener("afterprint", cleanup)
    }

    window.addEventListener("afterprint", cleanup)

    // Use a slight delay to ensure DOM and print styles are ready
    setTimeout(() => {
      try {
        window.print()
      } catch (error) {
        console.error('Print error:', error)
        setPrintError('Failed to open print dialog. Please try again or use Ctrl+P.')
        setTimeout(() => setPrintError(null), 5000)
        cleanup()
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
    if (!editingEntry) return

    // Immediately update context state
    updateLedgerEntry(currentAccount.id, currentCompany.id, editingEntry.id, updatedData)

    try {
      await fetch('/api/ledger-entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          ...updatedData,
        }),
      })
    } catch (error) {
      console.log('[ledger-view] Offline mode, API patch skipped')
    }

    setIsEditOpen(false)
    setEditingEntry(null)
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

  const filteredEntries = currentCompany.ledgerEntries.filter((entry) => {
    if (startDate && entry.date && entry.date < startDate) return false
    if (endDate && entry.date && entry.date > endDate) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      const matchBarnameh = (entry.barnamehNo || "").toLowerCase().includes(q)
      const matchInvoice = (entry.invoiceNo || "").toLowerCase().includes(q)
      const matchConsignee = (entry.consignee || "").toLowerCase().includes(q)
      const matchContainer = (entry.containerNo || "").toLowerCase().includes(q)
      const matchDesc = (entry.shipperDescription || "").toLowerCase().includes(q)
      const matchDate = (entry.date || "").toLowerCase().includes(q)
      const matchDriver = (entry.driverFreight || "").toLowerCase().includes(q)
      return matchBarnameh || matchInvoice || matchConsignee || matchContainer || matchDesc || matchDate || matchDriver
    }
    return true
  })

  const totalDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0)
  const finalBalance = totalDebit - totalCredit

  const parseDriverFreightAFN = (e: LedgerEntry): number => {
    const freightStr = e.driverFreight?.trim()
    if (freightStr) {
      const cleanStr = freightStr.replace(/,/g, "")
      const match = cleanStr.match(/(\d+(?:\.\d+)?)/)
      if (match) {
        const val = parseFloat(match[1])
        if (!isNaN(val) && val > 0) {
          if (/AFN|افغانی|هرات/i.test(freightStr) || (val >= 1000 && !/\$|USD/i.test(freightStr))) {
            return val
          }
          return Math.round(val * 65)
        }
      }
    }
    return 0
  }

  const totalDriverRentAFN = filteredEntries.reduce(
    (sum, e) => sum + parseDriverFreightAFN(e),
    0
  )

  const handleExportExcel = () => {
    const exportData = filteredEntries.map((e, idx) => ({
      "S.NO": idx + 1,
      "DATE": e.date || "",
      "SHIPPER/DESCRIPTION": e.shipperDescription || "",
      "INVOICE NO": e.invoiceNo || "",
      "DATE OF SHIP": e.dateOfShip || "",
      "BARNAMEH NO": e.barnamehNo || "",
      "CONTAINER NO": e.containerNo || "",
      "CONSIGNEE": e.consignee || "",
      "QUANTITY": e.quantity || "",
      "DRIVER FREIGHT": e.driverFreight || "",
      "DEBIT (USD)": e.debit > 0 ? e.debit : "",
      "CREDIT (USD)": e.credit > 0 ? e.credit : "",
      "BALANCE (USD)": e.balance,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger")
    const fileName = `${currentCompany.name.replace(/[^a-z0-9]/gi, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const handleExportCSV = () => {
    const exportData = filteredEntries.map((e, idx) => ({
      "S.NO": idx + 1,
      "DATE": e.date || "",
      "SHIPPER/DESCRIPTION": e.shipperDescription || "",
      "INVOICE NO": e.invoiceNo || "",
      "DATE OF SHIP": e.dateOfShip || "",
      "BARNAMEH NO": e.barnamehNo || "",
      "CONTAINER NO": e.containerNo || "",
      "CONSIGNEE": e.consignee || "",
      "QUANTITY": e.quantity || "",
      "DRIVER FREIGHT": e.driverFreight || "",
      "DEBIT (USD)": e.debit > 0 ? e.debit : "",
      "CREDIT (USD)": e.credit > 0 ? e.credit : "",
      "BALANCE (USD)": e.balance,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet)
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${currentCompany.name.replace(/[^a-z0-9]/gi, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatAFN = (amount: number) => {
    return `${amount.toLocaleString('en-US')} AFN`
  }

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
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
      />

      {/* Top Banner Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 bg-white/80 backdrop-blur-xl border border-amber-200/60 rounded-3xl p-6 shadow-xl shadow-amber-900/5 relative overflow-hidden no-print">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title & Context */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Ledger
            </h2>
            <span className="px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
              <span>{currentAccount.name}</span>
            </span>
            <span className="px-3 py-1 text-xs font-black rounded-full bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 shadow-2xs">
              <span>{currentCompany.name}</span>
            </span>
            <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {currentCompany.ledgerEntries.length} entries
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-bold">
            Manage transactions and print statements
          </p>
        </div>

        {/* Top Ledger Summary Metric Badges (Inline) */}
        <div className="flex flex-wrap gap-3 xl:gap-4 relative z-10">
          <div className="px-4 py-3 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-[10px]">
              USD
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Debit (پور)</p>
              <p className="text-lg font-black text-blue-950 font-mono leading-none mt-0.5">${totalDebit.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="px-4 py-3 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-[10px]">
              REC
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Credit (ترلاسه)</p>
              <p className="text-lg font-black text-emerald-950 font-mono leading-none mt-0.5">${totalCredit.toLocaleString()}</p>
            </div>
          </div>

          <div className={`px-4 py-3 rounded-2xl bg-white/90 border shadow-sm flex items-center gap-3 min-w-[140px] ${
            finalBalance >= 0 ? 'border-amber-200' : 'border-red-200'
          }`}>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-black text-[10px] ${
              finalBalance >= 0 ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-red-100 border-red-200 text-red-800'
            }`}>
              BAL
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${finalBalance >= 0 ? 'text-amber-700' : 'text-red-600'}`}>Net (بیلانس)</p>
              <p className={`text-lg font-black font-mono leading-none mt-0.5 ${finalBalance >= 0 ? 'text-amber-950' : 'text-red-700'}`}>
                ${finalBalance.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="px-4 py-3 rounded-2xl bg-white/90 border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-[10px]">
              AFN
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Driver Rent</p>
              <p className="text-lg font-black text-slate-900 font-mono leading-none mt-0.5">{formatAFN(totalDriverRentAFN)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar - Premium Glass Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 no-print">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Account Selector */}
          <Select
            value={currentAccount.id}
            onValueChange={(accId) => {
              const acc = accounts.find(a => a.id === accId)
              if (acc) selectAccount(acc)
            }}
          >
            <SelectTrigger className="w-[200px] h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 text-sm font-bold text-slate-800 shadow-sm hover:bg-white/90 transition-all">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-slate-200/80 rounded-2xl">
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id} className="text-sm font-semibold rounded-xl">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Company Selector */}
          <Select
            value={currentCompany.id}
            onValueChange={(compId) => {
              const comp = currentAccount.companies.find(c => c.id === compId)
              if (comp) selectCompany(comp)
            }}
          >
            <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 text-sm font-bold text-slate-800 shadow-sm hover:bg-white/90 transition-all">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-slate-200/80 rounded-2xl">
              {currentAccount.companies.map(comp => (
                <SelectItem key={comp.id} value={comp.id} className="text-sm font-semibold rounded-xl">
                  {comp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-2xl h-12 px-5 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 font-bold shadow-sm transition-all"
            onClick={() => setView('invoice')}
          >
            <Receipt className="h-4 w-4" />
            Invoice
          </Button>
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="gap-2 rounded-2xl h-12 px-5 bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200 text-emerald-800 font-bold shadow-sm transition-all">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-strong border-emerald-200/60 rounded-2xl p-1">
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer hover:bg-emerald-50 font-semibold rounded-xl p-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer hover:bg-emerald-50 font-semibold rounded-xl p-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Export CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="gap-2 rounded-2xl h-12 px-5 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 font-bold shadow-sm transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isLoading ? 'Processing...' : 'Import'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-strong border-slate-200/80 rounded-2xl p-1">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer hover:bg-slate-50 font-semibold rounded-xl p-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Import from Excel (.xlsx, .csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer hover:bg-slate-50 font-semibold rounded-xl p-2">
                <FileText className="h-4 w-4 text-red-500" />
                Import from PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" variant="outline" className="gap-2 rounded-2xl h-12 px-5 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 font-bold shadow-sm transition-all" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>

          {/* Restore Deleted / Recycle Bin Button */}
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-2xl h-12 px-4 bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-sm transition-all"
            onClick={() => setIsRestoreOpen(true)}
            title="Restore Deleted Entries & BOLs / بېرته راوستل"
          >
            <RotateCcw className="h-4 w-4 text-amber-700" />
            <span>Restore / راوستل</span>
            {deletedLedgerEntries && deletedLedgerEntries.filter(d => d.companyId === currentCompany.id || d.accountId === currentAccount.id).length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black bg-amber-600 text-white rounded-full">
                {deletedLedgerEntries.filter(d => d.companyId === currentCompany.id || d.accountId === currentAccount.id).length}
              </span>
            )}
          </Button>

          <Button type="button" variant="outline" className="gap-2 rounded-2xl h-12 px-5 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 font-bold shadow-sm transition-all" onClick={() => setIsSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
          <Button type="button" onClick={() => setIsOpen(true)} className="gap-2 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all h-12 px-6">
            <Plus className="h-5 w-5 text-amber-400" />
            <span>Add Entry</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar - Premium Glass Design */}
      <div className="mb-6 p-5 rounded-3xl bg-white/80 border border-slate-200/80 shadow-lg shadow-slate-200/50 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 no-print relative overflow-hidden group hover:border-amber-400/60 transition-all">
        {/* Accent Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-900/10 via-indigo-800/10 to-amber-500/10 group-hover:from-blue-900 group-hover:via-indigo-800 group-hover:to-amber-500 transition-all duration-300" />
        
        <div className="flex flex-1 flex-wrap items-center gap-4 min-w-[280px]">
          <div className="relative flex-1 min-w-[240px]">
            <Input
              type="text"
              placeholder="Search Barnameh No, Invoice, Consignee, Container..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pr-10 rounded-2xl bg-white border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Date Range:</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-36 bg-white border-slate-200 text-xs font-bold text-slate-800 rounded-xl"
              />
              <span className="text-slate-400 font-bold">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-36 bg-white border-slate-200 text-xs font-bold text-slate-800 rounded-xl"
              />
            </div>
          </div>

          {(searchTerm || startDate || endDate) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
              }}
              className="h-11 rounded-2xl px-5 text-sm font-black text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              Reset Filters
            </Button>
          )}
        </div>

        <div className="text-sm font-bold text-slate-600 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5">
          Showing <span className="text-blue-900 font-extrabold text-base">{filteredEntries.length}</span> of {currentCompany.ledgerEntries.length} entries
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Container No / د کانټینر شمېره</label>
              <Input
                value={newEntry.containerNo}
                onChange={e => setNewEntry({ ...newEntry, containerNo: e.target.value })}
                className="bg-white/50 border-white/30"
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Debit / د پور حساب</label>
              <Input
                type="number"
                value={newEntry.debit !== undefined ? newEntry.debit : ''}
                onChange={e => setNewEntry({ ...newEntry, debit: e.target.value === '' ? '' as any : (parseFloat(e.target.value) || 0) })}
                onFocus={(e) => {
                  if (!newEntry.debit || Number(newEntry.debit) === 0) {
                    setNewEntry(prev => ({ ...prev, debit: '' as any }))
                  } else {
                    e.target.select()
                  }
                }}
                onBlur={() => {
                  if (!newEntry.debit || (newEntry.debit as any) === '') {
                    setNewEntry(prev => ({ ...prev, debit: 0 }))
                  }
                }}
                step="0.01"
                className="bg-white/50 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Credit / ترلاسه شوی مبلغ</label>
              <Input
                type="number"
                value={newEntry.credit !== undefined ? newEntry.credit : ''}
                onChange={e => setNewEntry({ ...newEntry, credit: e.target.value === '' ? '' as any : (parseFloat(e.target.value) || 0) })}
                onFocus={(e) => {
                  if (!newEntry.credit || Number(newEntry.credit) === 0) {
                    setNewEntry(prev => ({ ...prev, credit: '' as any }))
                  } else {
                    e.target.select()
                  }
                }}
                onBlur={() => {
                  if (!newEntry.credit || (newEntry.credit as any) === '') {
                    setNewEntry(prev => ({ ...prev, credit: 0 }))
                  }
                }}
                step="0.01"
                className="bg-white/50 border-white/30"
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
      <Card className="liquid-glass overflow-hidden rounded-2xl relative shadow-xl shadow-blue-900/5 border border-blue-200/60">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={getLedgerSettings().logoUrl || getLedgerSettings().companyLogo || "/logo.png"} 
                alt="SKY ARIANA Logo" 
                className="h-14 max-w-[140px] object-contain mb-1" 
              />
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
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '105px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">BARNAMEH NO</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">بارنامه</div>
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
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '85px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">DRIVER FREIGHT</div>
                    <div className="text-[8px] font-normal text-blue-600/70 leading-tight" dir="rtl">کرایه موتر / دریور</div>
                  </th>
                  <th className="border border-blue-200/60 px-1 py-2 text-center font-bold align-middle" style={{ width: '75px' }}>
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
                  <th className="border border-blue-200/60 px-1 py-2 bg-blue-50/40 text-center font-bold align-middle" style={{ width: '50px' }}>
                    <div className="text-[10px] uppercase leading-tight text-blue-900">ACTIONS</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
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
                              onClick={() => setIsOpen(true)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100/80 via-blue-50/60 to-white/60 font-semibold backdrop-blur-sm">
                      <td colSpan={10} className="border border-blue-200/60 px-1 py-1.5 text-right text-[10px] font-bold text-blue-900">TOTAL:</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-amber-800 font-mono font-bold bg-amber-50/60">0 AFN</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-900 font-mono font-bold">$0</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30"></td>
                    </tr>
                  </>
                ) : (
                  <>
                    {filteredEntries.map((entry, idx) => {
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
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>
                          <span className="font-mono text-[9.5px] font-bold text-blue-950">{entry.barnamehNo || ""}</span>
                        </td>
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
                            {entry.pdfPathname && (
                              <a
                                href={entry.pdfPathname}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                                title="Open Saved PDF Document"
                              >
                                <FileText className="h-3 w-3 text-red-500" />
                                <span>View PDF</span>
                              </a>
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
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>{entry.containerNo}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>{entry.consignee}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>{entry.quantity}</td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] ${isCredit ? 'border-emerald-300/60 text-emerald-900 bg-emerald-50/50' : 'border-blue-200/60 text-blue-900 bg-white/40'}`}>
                          <span className="font-semibold text-[9.5px] text-amber-900 font-mono">
                            {entry.driverFreight && entry.driverFreight.trim() !== ''
                              ? entry.driverFreight
                              : ''}
                          </span>
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-mono ${isCredit ? 'border-emerald-300/60 bg-emerald-50/50 text-red-600' : 'border-blue-200/60 bg-white/40 text-red-600'}`}>
                          <span className="font-bold text-red-600">{entry.debit > 0 ? formatCurrency(entry.debit) : ''}</span>
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-mono font-semibold ${isCredit ? 'border-emerald-300/60 bg-emerald-200/60 text-emerald-700' : 'border-blue-200/60 bg-white/40 text-emerald-600'}`}>
                          {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                        </td>
                        <td className={`border px-1 py-1.5 text-center text-[10px] font-mono font-bold ${isCredit ? 'border-emerald-300/60 bg-emerald-100/70 text-emerald-900' : 'border-blue-200/60 bg-blue-50/50 text-blue-900'}`}>
                          {formatCurrency(entry.balance)}
                        </td>
                        <td className={`border px-1 py-1 ${isCredit ? 'border-emerald-300/60 bg-emerald-50/50' : 'border-blue-200/60 bg-blue-50/30'}`}>
                          <div className="flex gap-0.5 justify-center items-center">
                            {entry.pdfPathname && (
                              <a
                                href={entry.pdfPathname}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open Saved PDF"
                                className="inline-flex items-center justify-center h-5 w-5 rounded text-red-600 hover:bg-red-100 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </a>
                            )}
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
                              className="h-5 w-5 hover:bg-red-100 hover:text-red-600 cursor-pointer"
                              title="Delete Ledger Row / حذف قطار"
                              onClick={() => {
                                setEntryToDelete(entry)
                                setIsDeleteDialogOpen(true)
                              }}
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
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px]"></td>
                        <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-blue-700 font-mono">$0</td>
                        <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30"></td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-100/80 via-blue-50/60 to-white/60 font-semibold backdrop-blur-sm">
                      <td colSpan={10} className="border border-blue-200/60 px-1 py-1.5 text-right text-[10px] font-bold text-blue-900">TOTAL:</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] text-amber-800 font-mono font-bold bg-amber-50/70">{formatAFN(totalDriverRentAFN)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] font-mono text-red-600 font-bold">{formatCurrency(totalDebit)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] font-mono text-emerald-600 font-bold">{formatCurrency(totalCredit)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 text-center text-[10px] font-mono text-blue-900 font-black">{formatCurrency(finalBalance)}</td>
                      <td className="border border-blue-200/60 px-1 py-1.5 bg-blue-50/30"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Driver Rent Summary Highlight Banner */}
          <div className="m-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 no-print backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                AFN
              </div>
              <div>
                <p className="text-xs font-black text-slate-950 flex items-center gap-2">
                  DRIVER RENT TOTAL (مجموع کرایه درایوران)
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold uppercase">
                    افغانی
                  </span>
                </p>
                <p className="text-[11px] font-semibold text-slate-700">Combined freight rent total for drivers calculated across active ledger entries</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-amber-950 bg-white border border-amber-300 px-3.5 py-1.5 rounded-xl shadow-xs inline-block font-mono">
                {formatAFN(totalDriverRentAFN)}
              </span>
            </div>
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

        {/* Print Table - Rendered via React Portal directly on document.body */}
        <LedgerPrintPortal>
          <div data-print-root="true" className="print-container print-wrapper ledger-print-root" style={{ position: 'relative', background: '#ffffff' }}>
            {/* Content Container */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Print Header with Logo, Company Info, and Account Info - Clean Blue Style */}
              <div className="print-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '6px',
                padding: '6px 12px',
                borderBottom: '2px solid #1e40af',
                background: '#eff6ff',
                borderRadius: '6px 6px 0 0'
              }}>
                {/* Left Side - Account/Shipper Info */}
                <div style={{ flex: '1', textAlign: 'left' }}>
                  <p style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '600', marginBottom: '1px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Account Ledger</p>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '2px' }}>{currentCompany.name}</p>
                  <p style={{ fontSize: '8.5px', color: '#60a5fa' }}>Account Holder / Shipper</p>
                  <p style={{ fontSize: '9px', color: '#1e40af', marginTop: '3px', fontWeight: '500' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                
                {/* Center - Logo and Company Name */}
                <div style={{ flex: '1', textAlign: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={getLedgerSettings().logoUrl || getLedgerSettings().companyLogo || "/logo.png"} 
                    alt="SKY ARIANA Logo" 
                    className="print-logo"
                    style={{ 
                      height: '46px', 
                      maxWidth: '130px', 
                      objectFit: 'contain',
                      marginBottom: '2px',
                      display: 'inline-block'
                    }} 
                  />
                  <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e40af', marginBottom: '1px' }}>SKY ARIANA</p>
                  <p style={{ fontSize: '9px', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase' }}>Transport & Logistics</p>
                </div>
                
                {/* Right Side - Company Address */}
                <div style={{ flex: '1', textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: '#1e40af', marginBottom: '2px' }}>AFGHANISTAN OFFICE</p>
                  <p style={{ fontSize: '7.5px', color: '#3b82f6', lineHeight: '1.4' }}>
                    2nd Floor, 16 No. Office,<br />
                    Shahidano Chowk, Etimad Rahmi Market,<br />
                    Kandahar, Afghanistan
                  </p>
                  <p style={{ fontSize: '7.5px', color: '#60a5fa', marginTop: '2px' }}>
                    Tel: +93 700 939 365<br />
                    info@skyariana.com
                  </p>
                  <p style={{ fontSize: '7px', color: '#93c5fd', marginTop: '1px' }}>Licence: 2401-2198</p>
                </div>
              </div>
              
              <table className="ledger-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '3%' }}>
                      <div className="header-en">S.NO</div>
                      <div className="header-ps">مسلسل شمېره</div>
                    </th>
                    <th style={{ width: '7%' }}>
                      <div className="header-en">DATE / تاریخ</div>
                      <div className="header-ps">نېټه</div>
                    </th>
                    <th style={{ width: '14%' }}>
                      <div className="header-en">SHIPPER/Description</div>
                      <div className="header-ps">لیږدونکی / تفصیل</div>
                    </th>
                    <th style={{ width: '6%' }}>
                      <div className="header-en">INVOICE.NO</div>
                      <div className="header-ps">انوایس</div>
                    </th>
                    <th style={{ width: '7%' }}>
                      <div className="header-en">DATE-OF-SHIP</div>
                      <div className="header-ps">د بار نېټه</div>
                    </th>
                    <th style={{ width: '8%' }}>
                      <div className="header-en">BARNAMEH NO</div>
                      <div className="header-ps">بارنامه</div>
                    </th>
                    <th style={{ width: '8%' }}>
                      <div className="header-en">BILL OF LADING</div>
                      <div className="header-ps">B/L NO / بی ال</div>
                    </th>
                    <th style={{ width: '7%' }}>
                      <div className="header-en">CONTAINER NO</div>
                      <div className="header-ps">د کانټینر شمېره</div>
                    </th>
                    <th style={{ width: '9%' }}>
                      <div className="header-en">CONSIGNEE</div>
                      <div className="header-ps">د مال وصول کوونکی</div>
                    </th>
                    <th style={{ width: '6%' }}>
                      <div className="header-en">QUANTITY / تعداد</div>
                      <div className="header-ps">د توکو بسته بندي</div>
                    </th>
                    <th style={{ width: '7%' }}>
                      <div className="header-en">DRIVER FREIGHT</div>
                      <div className="header-ps">کرایه موتر / دریور</div>
                    </th>
                    <th style={{ width: '6%' }}>
                      <div className="header-en">DEBIT</div>
                      <div className="header-ps">د پور حساب</div>
                    </th>
                    <th style={{ width: '6%' }}>
                      <div className="header-en">CREDIT</div>
                      <div className="header-ps">ترلاسه شوی مبلغ</div>
                    </th>
                    <th style={{ width: '6%' }}>
                      <div className="header-en">BALANCE USD</div>
                      <div className="header-ps">(USD) بیلانس</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, idx) => {
                    const isCredit = entry.credit > 0;
                    return (
                    <tr 
                      key={entry.id}
                      className={isCredit ? 'credit-row' : ''}
                    >
                      <td style={{ fontWeight: 500 }}>{entry.sNo}</td>
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
                      <td style={{ fontWeight: 'bold' }}>{entry.barnamehNo || ''}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span>{entry.billOfLanding}</span>
                          {entry.surrenderedBL && (
                            <span style={{ 
                              border: '1px solid #059669',
                              color: '#059669',
                              padding: '1px 4px',
                              fontSize: '6px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              backgroundColor: '#ecfdf5',
                              borderRadius: '2px',
                              whiteSpace: 'nowrap'
                            }}>Surrender</span>
                          )}
                        </div>
                      </td>
                      <td>{entry.containerNo}</td>
                      <td>{entry.consignee}</td>
                      <td>{entry.quantity}</td>
                      <td style={{ fontWeight: '600', color: '#78350f' }}>
                        {entry.driverFreight && entry.driverFreight.trim() !== ''
                          ? entry.driverFreight
                          : ''}
                      </td>
                      <td className="text-right debit-cell">{entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : ''}</td>
                      <td className="text-right credit-cell">{entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : ''}</td>
                      <td className="text-right balance-cell">${entry.balance.toLocaleString()}</td>
                    </tr>
                  );
                  })}
                  {/* Empty rows to fill page cleanly without overflow */}
                  {Array.from({ length: Math.max(0, 12 - currentCompany.ledgerEntries.length) }).map((_, idx) => (
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
                      <td></td>
                      <td></td>
                      <td className="balance-cell">$0</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="totals-row">
                    <td colSpan={10} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
                    <td className="text-center driver-cell" style={{ fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7' }}>{formatAFN(totalDriverRentAFN)}</td>
                    <td className="text-right debit-cell" style={{ fontWeight: 600 }}>${totalDebit.toLocaleString()}</td>
                    <td className="text-right credit-cell" style={{ fontWeight: 600 }}>${totalCredit.toLocaleString()}</td>
                    <td className="text-right balance-cell">${finalBalance.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Driver Total AFN Print Banner */}
              <div style={{ 
                marginTop: '8px', 
                marginBottom: '8px', 
                padding: '6px 12px', 
                backgroundColor: '#fffbeb', 
                border: '1px solid #fde68a', 
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#78350f' }}>
                  DRIVER RENT TOTAL (مجموع کرایه درایوران در افغانی):
                </span>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#92400e', fontFamily: 'monospace' }}>
                  {formatAFN(totalDriverRentAFN)} (افغانی)
                </span>
              </div>
              
              {/* Official Signature & Stamp Section */}
              <div className="print-signatures" style={{ 
                marginTop: '10px', 
                marginBottom: '6px',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end',
                padding: '0 12px'
              }}>
                <div style={{ textAlign: 'center', width: '28%' }}>
                  <div style={{ borderBottom: '1px border #94a3b8', height: '24px', marginBottom: '3px' }}></div>
                  <p style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1e3a8a' }}>PREPARED BY / ترتیب کوونکی</p>
                  <p style={{ fontSize: '6.5px', color: '#64748b' }}>Accountant Signature</p>
                </div>
                <div style={{ textAlign: 'center', width: '28%' }}>
                  <div style={{ borderBottom: '1px border #94a3b8', height: '24px', marginBottom: '3px' }}></div>
                  <p style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1e3a8a' }}>CHECKED BY / کتونکی</p>
                  <p style={{ fontSize: '6.5px', color: '#64748b' }}>Auditor Approval</p>
                </div>
                <div style={{ textAlign: 'center', width: '32%' }}>
                  <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', marginBottom: '3px' }}>
                    <span style={{ fontSize: '7px', color: '#94a3b8', fontStyle: 'italic' }}>[ OFFICIAL COMPANY STAMP ]</span>
                  </div>
                  <p style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1e3a8a' }}>AUTHORIZED STAMP & SIGNATURE</p>
                  <p style={{ fontSize: '6.5px', color: '#64748b' }}>د منلو امضا او ټاپه</p>
                </div>
              </div>

              {/* Print Footer - Premium Blue Executive Style */}
              <div className="print-footer" style={{ 
                padding: '5px 12px', 
                borderTop: '2px solid #1e3a8a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#eff6ff',
                borderRadius: '0 0 6px 6px'
              }}>
                <div style={{ fontSize: '7px', textAlign: 'left' }}>
                  <p style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '1px' }}>SKY ARIANA TRANSPORT & LOGISTICS</p>
                  <p style={{ color: '#3b82f6' }}>Licence: 2401-2198 | Cloud ERP Verified</p>
                </div>
                <div style={{ fontSize: '7px', textAlign: 'center' }}>
                  <p style={{ color: '#1e40af', fontWeight: '600' }}>info@skyariana.com | transport@skyariana.com</p>
                  <p style={{ color: '#3b82f6' }}>+93 700 939 365 | +93 711 435 529</p>
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right' }}>
                  <p style={{ color: '#1e40af' }}>2nd Floor, 16 No. Office, Shahidano Chowk</p>
                  <p style={{ color: '#3b82f6' }}>Etimad Rahmi Market, Kandahar, Afghanistan</p>
                </div>
              </div>
            </div>
          </div>
        </LedgerPrintPortal>
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

      {/* Delete Confirmation Dialog (Yes / No Modal) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-strong border-red-200 sm:max-w-md p-6 shadow-2xl rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100/90 text-red-600 shadow-sm">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Confirm Deletion</span>
                  <span className="text-xs text-red-700 font-[vazirmatn] font-bold">د ثبت حذف کول</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Are you sure you want to delete this ledger entry?
                </p>
              </div>
            </div>
          </DialogHeader>

          {entryToDelete && (
            <div className="my-3 p-4 bg-gradient-to-br from-red-50/80 via-white to-slate-50 rounded-2xl border border-red-200/80 text-xs space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-red-100">
                <span className="font-extrabold text-slate-700">Row #{entryToDelete.sNo}</span>
                <span className="font-mono font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                  {entryToDelete.barnamehNo || entryToDelete.billOfLanding || 'No BOL'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 font-bold block">Date:</span>
                  <span className="font-extrabold text-slate-800">{entryToDelete.date || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Invoice No:</span>
                  <span className="font-extrabold text-slate-800">{entryToDelete.invoiceNo || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-bold block">Description / Shipper:</span>
                  <span className="font-bold text-slate-800 truncate block">{entryToDelete.shipperDescription || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Debit:</span>
                  <span className="font-mono font-black text-red-600">{entryToDelete.debit > 0 ? formatCurrency(entryToDelete.debit) : '$0'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Credit:</span>
                  <span className="font-mono font-black text-emerald-600">{entryToDelete.credit > 0 ? formatCurrency(entryToDelete.credit) : '$0'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-600 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 flex items-start gap-2">
            <span className="text-amber-700 text-sm">💡</span>
            <span>
              <strong>Safe Deletion:</strong> You can bring back and restore this entry anytime using the <span className="font-black text-amber-900">"Restore / راوستل"</span> button in the toolbar.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setEntryToDelete(null)
              }}
              className="rounded-xl font-black text-xs h-10 px-4 border-slate-300"
            >
              No, Cancel / رد
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (entryToDelete && currentAccount && currentCompany) {
                  const toDelete = entryToDelete
                  deleteLedgerEntry(currentAccount.id, currentCompany.id, toDelete.id)
                  setUndoBanner({ visible: true, entry: toDelete })
                  setTimeout(() => {
                    setUndoBanner((prev) => (prev.entry?.id === toDelete.id ? { visible: false, entry: null } : prev))
                  }, 12000)
                }
                setIsDeleteDialogOpen(false)
                setEntryToDelete(null)
              }}
              className="rounded-xl font-black text-xs h-10 px-5 bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Delete / هو، حذف یې کړه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Deleted Entries & Re-sync BOLs Dialog */}
      <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <DialogContent className="glass-strong border-amber-200 sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl rounded-3xl">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 shadow-sm">
                  <RotateCcw className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>Restore Deleted Entries & Missing BOLs</span>
                    <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">بېرته راوستل</span>
                  </DialogTitle>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Recover any deleted row or re-sync missing BOLs created for {currentCompany.name}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {/* Quick Re-sync from BOL Database Button */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-blue-700" />
                  <span>Scan & Re-sync Missing BOLs</span>
                </h4>
                <p className="text-[11px] text-blue-800/80 font-semibold mt-0.5">
                  If you deleted a BOL entry or want to re-import all BOLs for this company from storage, click here.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleResyncBols}
                disabled={isResyncing}
                className="gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xs h-9 px-4 shrink-0 shadow-md shadow-blue-950/20 cursor-pointer"
              >
                {isResyncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Re-sync All BOLs</span>
                  </>
                )}
              </Button>
            </div>

            {resyncStatusMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{resyncStatusMessage}</span>
              </div>
            )}

            {/* Deleted Entries List */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-amber-600" />
                  <span>Recycle Bin / Recently Deleted Rows ({deletedLedgerEntries ? deletedLedgerEntries.filter(d => d.companyId === currentCompany.id || d.accountId === currentAccount.id).length : 0})</span>
                </h4>
                {deletedLedgerEntries && deletedLedgerEntries.filter(d => d.companyId === currentCompany.id || d.accountId === currentAccount.id).length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      restoreAllDeletedEntries(currentAccount.id, currentCompany.id)
                    }}
                    className="h-7 text-[11px] font-black text-emerald-700 hover:bg-emerald-50 border-emerald-300 rounded-lg"
                  >
                    Restore All
                  </Button>
                )}
              </div>

              {(!deletedLedgerEntries || deletedLedgerEntries.filter(d => d.companyId === currentCompany.id || d.accountId === currentAccount.id).length === 0) ? (
                <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2.5 border border-amber-200">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No deleted entries in the Recycle Bin.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    If you are looking for a deleted BOL, click the <strong className="text-blue-900">"Re-sync All BOLs"</strong> button above to scan all documents.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {deletedLedgerEntries
                    .filter(d => d.companyId === currentCompany.id || d.accountId === currentAccount.id)
                    .map((item) => (
                      <div
                        key={item.entry.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-amber-400 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-blue-950 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                              {item.entry.barnamehNo || item.entry.billOfLanding || 'No BOL'}
                            </span>
                            {item.entry.invoiceNo && (
                              <span className="text-[11px] font-bold text-slate-600">
                                {item.entry.invoiceNo}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.entry.date}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate mt-1">
                            {item.entry.shipperDescription || item.entry.consignee || 'Ledger Entry'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] mt-1">
                            {item.entry.debit > 0 && (
                              <span className="font-mono font-bold text-red-600">
                                Debit: {formatCurrency(item.entry.debit)}
                              </span>
                            )}
                            {item.entry.credit > 0 && (
                              <span className="font-mono font-bold text-emerald-600">
                                Credit: {formatCurrency(item.entry.credit)}
                              </span>
                            )}
                            {item.entry.driverFreight && (
                              <span className="text-amber-900 font-mono text-[10px]">
                                Rent: {item.entry.driverFreight}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            restoreLedgerEntry(item.entry.id)
                          }}
                          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-sm shrink-0 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore / راوستل</span>
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsRestoreOpen(false)}
              className="rounded-xl font-black text-xs h-10 px-5 bg-slate-900 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Floating Notification Banner */}
      {undoBanner.visible && undoBanner.entry && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-400" />
            <span className="text-xs font-bold text-slate-200">
              Row #{undoBanner.entry.sNo} ({undoBanner.entry.barnamehNo || undoBanner.entry.invoiceNo || 'Entry'}) deleted.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (undoBanner.entry) {
                restoreLedgerEntry(undoBanner.entry.id)
                setUndoBanner({ visible: false, entry: null })
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-1.5 h-8 rounded-xl gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Undo / بېرته راوستل</span>
          </Button>
          <button
            type="button"
            onClick={() => setUndoBanner({ visible: false, entry: null })}
            className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
})
