"use client"

import React, { useState } from "react"
import { BulkImportBatch, BulkImportRow } from "@/lib/types/bulk-import"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, Loader2 } from "lucide-react"

export function BulkPreviewSummary({ batch, rows, onComplete }: { batch: BulkImportBatch, rows: BulkImportRow[], onComplete: () => void }) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const validRows = rows.filter(r => r.status === "VALID")
  const warningRows = rows.filter(r => r.status === "WARNING")
  const errorRows = rows.filter(r => r.status === "ERROR")

  // Mock execution - in reality this calls the server action
  const handleExecute = async () => {
    setIsExecuting(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500))
    setIsExecuting(false)
    setIsDone(true)
  }

  if (isDone) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center animate-in zoom-in-95 duration-300">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Batch Complete</h2>
        <p className="text-slate-500 mb-8">Successfully processed {validRows.length + warningRows.length} shipments and generated BOLs, containers, and document drafts.</p>
        
        <div className="grid grid-cols-2 gap-4 text-left mb-8">
          <div className="bg-white border rounded-xl p-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">BOLs Created</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{validRows.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Containers Added</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{validRows.length}</p>
          </div>
        </div>

        <Button onClick={onComplete} className="w-full h-12 text-md">
          Start New Batch
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Ready to Create</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-4xl font-black text-emerald-900">{validRows.length}</p>
            <p className="text-xs text-emerald-700 mt-2 font-medium">Fully validated rows</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">Warnings</span>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-4xl font-black text-amber-900">{warningRows.length}</p>
            <p className="text-xs text-amber-700 mt-2 font-medium">Missing non-critical fields</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-red-800 uppercase tracking-wider">Errors (Blocked)</span>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-4xl font-black text-red-900">{errorRows.length}</p>
            <p className="text-xs text-red-700 mt-2 font-medium">Require correction before import</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-black text-lg text-slate-900 mb-4">Execution Rules</h3>
        
        <ul className="space-y-3 text-sm text-slate-600 mb-6">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>Operational records (BOLs, Containers, Documents) will be created securely.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>No automatic accounting/financial debits will be posted (Ledger remains untouched).</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>If an exact existing BOL is found, the row will be linked, not duplicated.</span>
          </li>
          <li className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span>The {errorRows.length} rows with errors will be completely skipped.</span>
          </li>
        </ul>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
          <Button 
            className="flex-1 h-12 text-md font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={isExecuting || (validRows.length === 0 && warningRows.length === 0)}
            onClick={handleExecute}
          >
            {isExecuting ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing Batch...</>
            ) : (
              `Create ${validRows.length + warningRows.length} Valid Shipments`
            )}
          </Button>
          
          <Button variant="outline" className="h-12 px-6 bg-slate-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Error Rows
          </Button>
        </div>
      </div>
    </div>
  )
}
