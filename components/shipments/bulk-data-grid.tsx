"use client"

import React, { useState, useRef, useEffect } from "react"
import { BulkImportRow, ParsedBulkRow } from "@/lib/types/bulk-import"
import { AlertCircle, Plus, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const COLUMNS: { key: keyof ParsedBulkRow, label: string, width: string }[] = [
  { key: "date", label: "Date", width: "w-28" },
  { key: "shipper", label: "Shipper (Exporter)", width: "w-48" },
  { key: "consignee", label: "Consignee (Buyer)", width: "w-48" },
  { key: "commodity", label: "Commodity", width: "w-40" },
  { key: "packages", label: "Packages", width: "w-24" },
  { key: "grossWeight", label: "Weight", width: "w-24" },
  { key: "containerNumber", label: "Container No.", width: "w-36" },
  { key: "truckNumber", label: "Truck No.", width: "w-32" },
  { key: "destination", label: "Destination", width: "w-32" },
  { key: "bolNumber", label: "BOL No. (Optional)", width: "w-36" },
  { key: "remarks", label: "Remarks", width: "w-48" },
]

export function BulkDataGrid({ rows, batchId, onChange }: { rows: BulkImportRow[], batchId: string, onChange: (rows: BulkImportRow[]) => void }) {
  const [activeCell, setActiveCell] = useState<{rowId: string, colKey: string} | null>(null)
  
  const handleCellChange = (rowId: string, colKey: keyof ParsedBulkRow, value: string) => {
    const updated = rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          parsedData: { ...r.parsedData, [colKey]: value }
        }
      }
      return r
    })
    onChange(updated)
  }

  const addRow = () => {
    const newRow: BulkImportRow = {
      id: `row_${Date.now()}_new`,
      batchId,
      sourceRowIndex: rows.length + 1,
      rawData: {},
      parsedData: {},
      fingerprint: `fp_new_${Date.now()}`,
      status: "READY",
      errorMessages: [],
      warningMessages: [],
      createdAt: new Date().toISOString()
    }
    onChange([...rows, newRow])
  }

  const deleteRow = (rowId: string) => {
    onChange(rows.filter(r => r.id !== rowId))
  }

  const duplicateRow = (rowId: string) => {
    const source = rows.find(r => r.id === rowId)
    if (!source) return
    
    const newRow: BulkImportRow = {
      ...source,
      id: `row_${Date.now()}_dup`,
      sourceRowIndex: rows.length + 1,
      fingerprint: `fp_dup_${Date.now()}`,
      // Clear container and BOL info on duplicate to prevent instant conflicts
      parsedData: {
        ...source.parsedData,
        containerNumber: "",
        bolNumber: ""
      }
    }
    onChange([...rows, newRow])
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
            <tr>
              <th className="border border-slate-200 bg-slate-50 w-12 px-2 py-2 text-center text-slate-400 font-mono text-xs select-none">#</th>
              {COLUMNS.map(col => (
                <th key={col.key} className={`border border-slate-200 bg-slate-100 ${col.width} px-3 py-2 text-left font-semibold text-slate-700 select-none whitespace-nowrap`}>
                  {col.label}
                </th>
              ))}
              <th className="border border-slate-200 bg-slate-50 w-20 px-2 py-2 text-center text-slate-400 font-mono text-xs select-none sticky right-0 z-20">Act</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const hasErrors = row.errorMessages?.length > 0
              const hasWarnings = row.warningMessages?.length > 0
              
              return (
                <tr key={row.id} className={`group hover:bg-slate-50 ${hasErrors ? 'bg-red-50/30' : hasWarnings ? 'bg-amber-50/30' : ''}`}>
                  <td className="border border-slate-200 bg-slate-50/50 text-center text-slate-400 font-mono text-xs relative select-none">
                    {idx + 1}
                    {hasErrors && <AlertCircle className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-red-500" />}
                  </td>
                  
                  {COLUMNS.map(col => {
                    const isError = hasErrors && row.errorMessages.some(m => m.toLowerCase().includes(col.key.toLowerCase()))
                    
                    return (
                      <td key={col.key} className={`border border-slate-200 p-0 relative ${isError ? 'bg-red-50' : ''}`}>
                        <input
                          type="text"
                          value={row.parsedData[col.key] || ""}
                          onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                          onFocus={() => setActiveCell({ rowId: row.id, colKey: col.key })}
                          className={`w-full h-full min-h-[32px] px-3 py-1 outline-none text-slate-700 font-medium transition-all
                            ${activeCell?.rowId === row.id && activeCell?.colKey === col.key ? 'bg-blue-50/50 shadow-[inset_0_0_0_2px_#3b82f6]' : 'bg-transparent'}
                            ${isError ? 'text-red-700 placeholder:text-red-300' : ''}`}
                          placeholder="..."
                        />
                      </td>
                    )
                  })}

                  <td className="border border-slate-200 bg-white px-2 py-1 text-center sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => duplicateRow(row.id)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Duplicate Row">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteRow(row.id)} className="p-1 text-slate-400 hover:text-red-600 rounded" title="Delete Row">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
        <Button variant="outline" size="sm" onClick={addRow} className="bg-white">
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
        <div className="text-xs text-slate-500 font-medium">
          Use <kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm">Tab</kbd> and arrow keys to navigate.
        </div>
      </div>
    </div>
  )
}
