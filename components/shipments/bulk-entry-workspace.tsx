"use client"

import React, { useState } from "react"
import { Database, FileSpreadsheet, LayoutGrid, CheckCircle2, ChevronRight, Play } from "lucide-react"
import { BulkInputMethods } from "./bulk-input-methods"
import { BulkDataGrid } from "./bulk-data-grid"
import { BulkPreviewSummary } from "./bulk-preview-summary"
import { BulkImportBatch, BulkImportRow, ParsedBulkRow } from "@/lib/types/bulk-import"
import { BulkImportService } from "@/lib/services/bulk-import-service"

export function BulkEntryWorkspace() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [batch, setBatch] = useState<BulkImportBatch | null>(null)
  const [rows, setRows] = useState<BulkImportRow[]>([])

  const handleInputComplete = (parsed: ParsedBulkRow[], raw: any[], sourceType: BulkImportBatch["sourceType"]) => {
    const newBatch = BulkImportService.createBatch(sourceType)
    const newRows = BulkImportService.saveRows(newBatch.id, parsed, raw)
    setBatch(newBatch)
    setRows(newRows)
    setStep(2) // Move to Grid Editor
  }

  const handleValidationRequest = () => {
    if (!batch) return
    const validatedRows = BulkImportService.validateBatch(batch.id)
    setRows(validatedRows)
    setStep(3) // Move to Preview / Execution
  }

  const handleBackToGrid = () => setStep(2)
  const handleStartOver = () => {
    setBatch(null)
    setRows([])
    setStep(1)
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 pb-12 h-[calc(100vh-80px)] flex flex-col">
      {/* Header & Stepper */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            BULK SHIPMENT ENTRY
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Create multiple BOLs, Containers, and Document drafts instantly.</p>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${step === 1 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="h-5 w-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">1</span>
            INPUT
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${step === 2 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="h-5 w-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">2</span>
            MAP & EDIT
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${step === 3 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="h-5 w-5 rounded-full bg-current text-white flex items-center justify-center text-[10px]">3</span>
            VALIDATE & RUN
          </div>
        </div>
      </div>

      {/* Main Workspace Area - takes remaining height */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {step === 1 && (
          <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
            <BulkInputMethods onComplete={handleInputComplete} />
          </div>
        )}

        {step === 2 && batch && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <LayoutGrid className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-800">Grid Editor ({rows.length} rows)</h3>
                <span className="text-xs px-2 py-1 bg-slate-200 rounded text-slate-600 font-mono">{batch.batchReference}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleStartOver} className="text-sm font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5">Cancel</button>
                <button 
                  onClick={handleValidationRequest}
                  className="text-sm font-bold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> Validate & Preview
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative">
              <BulkDataGrid rows={rows} batchId={batch.id} onChange={setRows} />
            </div>
          </div>
        )}

        {step === 3 && batch && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <Play className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">Ready to Execute</h3>
              </div>
              <button onClick={handleBackToGrid} className="text-sm font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg bg-white">
                Back to Edit
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50/30">
              <BulkPreviewSummary batch={batch} rows={rows} onComplete={() => setStep(1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
