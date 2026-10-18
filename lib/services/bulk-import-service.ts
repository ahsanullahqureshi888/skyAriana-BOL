"use client"

import { BulkImportBatch, BulkImportRow, ParsedBulkRow } from "../types/bulk-import"

const STORAGE_KEYS = {
  BATCHES: "sky-ariana-bulk-batches",
  ROWS: "sky-ariana-bulk-rows"
}

// Helpers
const readStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch {
    return defaultValue
  }
}

const writeStorage = (key: string, data: any) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error("Storage error:", e)
  }
}

export const BulkImportService = {
  getBatches: (): BulkImportBatch[] => {
    return readStorage<BulkImportBatch[]>(STORAGE_KEYS.BATCHES, []).sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
  },

  createBatch: (sourceType: BulkImportBatch["sourceType"], sourceFile?: string): BulkImportBatch => {
    const batch: BulkImportBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      batchReference: `BULK-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random()*1000)}`,
      sourceType,
      sourceFile,
      createdBy: "Current User", // Should come from context
      startedAt: new Date().toISOString(),
      rowsFound: 0, rowsValid: 0, rowsWarning: 0, rowsError: 0,
      rowsCreated: 0, rowsLinked: 0, rowsSkipped: 0,
      companiesCreated: 0, bolsCreated: 0, containersCreated: 0, documentsCreated: 0,
      status: "DRAFT"
    }

    const batches = BulkImportService.getBatches()
    batches.push(batch)
    writeStorage(STORAGE_KEYS.BATCHES, batches)
    return batch
  },

  saveRows: (batchId: string, parsedRows: ParsedBulkRow[], rawData: any[]) => {
    const rows = readStorage<BulkImportRow[]>(STORAGE_KEYS.ROWS, [])
    
    // Remove old rows for this draft batch if any
    const filteredRows = rows.filter(r => r.batchId !== batchId)
    
    const newRows: BulkImportRow[] = parsedRows.map((parsed, idx) => {
      // Create deterministic fingerprint
      const str = Object.values(parsed).join("|").toLowerCase()
      // simple hash for client side
      let hash = 0
      for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
      const fingerprint = "fp_" + Math.abs(hash)

      return {
        id: "row_" + Date.now() + "_" + idx,
        batchId,
        sourceRowIndex: idx + 1,
        rawData: rawData[idx] || {},
        parsedData: parsed,
        fingerprint,
        status: "READY", // will be updated by validation
        errorMessages: [],
        warningMessages: [],
        createdAt: new Date().toISOString()
      }
    })

    writeStorage(STORAGE_KEYS.ROWS, [...filteredRows, ...newRows])
    return newRows
  },

  getRowsForBatch: (batchId: string): BulkImportRow[] => {
    return readStorage<BulkImportRow[]>(STORAGE_KEYS.ROWS, []).filter(r => r.batchId === batchId)
  },

  validateBatch: (batchId: string): BulkImportRow[] => {
    const rows = BulkImportService.getRowsForBatch(batchId)
    // Client-side validation heuristics
    rows.forEach(row => {
      row.errorMessages = []
      row.warningMessages = []
      
      const d = row.parsedData
      
      if (!d.shipper) row.errorMessages.push("Shipper is required")
      if (!d.consignee) row.warningMessages.push("Consignee is highly recommended")
      if (!d.commodity) row.errorMessages.push("Commodity is required")
      
      if (d.containerNumber && !/^[A-Z]{4}[0-9]{7}$/.test(d.containerNumber.replace(/\s/g, ''))) {
        row.warningMessages.push("Container number format looks unusual")
      }

      if (row.errorMessages.length > 0) {
        row.status = "ERROR"
      } else if (row.warningMessages.length > 0) {
        row.status = "WARNING"
      } else {
        row.status = "VALID"
      }
    })

    const allRows = readStorage<BulkImportRow[]>(STORAGE_KEYS.ROWS, [])
    const updatedAllRows = allRows.map(r => r.batchId === batchId ? rows.find(nr => nr.id === r.id) || r : r)
    writeStorage(STORAGE_KEYS.ROWS, updatedAllRows)
    
    return rows
  }
}
