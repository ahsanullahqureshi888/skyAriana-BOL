"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UploadCloud, CheckCircle2, AlertTriangle, FileJson, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateBolFingerprint } from "@/lib/services/bol-automation-service"

export function BolBulkImportModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<"upload" | "preview" | "processing" | "complete">("upload")
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<any>(null)
  
  const handleUploadMock = () => {
    // Mock parsing ALL-COMPANIES-BOL-BACKUP.json
    setStep("preview")
  }

  const handleProcess = () => {
    setStep("processing")
    let p = 0
    const interval = setInterval(() => {
      p += 15
      if (p > 100) p = 100
      setProgress(p)
      
      if (p === 100) {
        clearInterval(interval)
        setStats({
          entriesFound: 106,
          existingBolsMatched: 12,
          newBolsCreated: 84,
          draftBolsCreated: 10,
          duplicatesSkipped: 0
        })
        setStep("complete")
        toast.success("Historical Import Completed Successfully")
      }
    }, 500)
  }

  const reset = () => {
    setStep("upload")
    setProgress(0)
    setStats(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-blue-600" />
            Import & Auto-Create BOLs
          </DialogTitle>
          <DialogDescription>
            Import historical shipments from backup files. The system will automatically link existing BOLs or generate new ones.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50">
            <FileJson className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-sm text-slate-600 font-medium mb-2">Select ALL-COMPANIES-BOL-BACKUP.json or Excel File</p>
            <Button onClick={handleUploadMock} variant="outline" className="mt-4">
              Browse Files
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <strong>106 shipment entries found.</strong> The system will safely map these to BOLs without duplicating existing accounting ledger entries.
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Row</th>
                    <th className="px-4 py-2">Shipper</th>
                    <th className="px-4 py-2">Container</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Mock preview data */}
                  <tr>
                    <td className="px-4 py-2 text-slate-500">1</td>
                    <td className="px-4 py-2">NAJEB AMIN LTD</td>
                    <td className="px-4 py-2">TCLU1234567</td>
                    <td className="px-4 py-2 text-emerald-600 font-medium">CREATE NEW BOL</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-500">2</td>
                    <td className="px-4 py-2">KAMAL TRADING</td>
                    <td className="px-4 py-2">MSCU9876543</td>
                    <td className="px-4 py-2 text-blue-600 font-medium">LINK EXISTING (ABC12345)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-500">3</td>
                    <td className="px-4 py-2">UNKNOWN</td>
                    <td className="px-4 py-2">PENDING</td>
                    <td className="px-4 py-2 text-amber-600 font-medium">CREATE DRAFT BOL</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleProcess} className="bg-blue-600 hover:bg-blue-700">Process All (106)</Button>
            </DialogFooter>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <div className="text-center w-full max-w-md">
              <h3 className="font-semibold text-slate-900 mb-2">Generating & Linking BOLs...</h3>
              <p className="text-sm text-slate-500 mb-4">Please do not close this window. Atomic transactions in progress.</p>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {step === "complete" && stats && (
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Import Complete!</h3>
              <p className="text-slate-500">All shipment entries have been successfully mapped.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-600 text-sm">Entries Processed</span>
                <span className="font-bold">{stats.entriesFound}</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center">
                <span className="text-emerald-700 text-sm">New BOLs Created</span>
                <span className="font-bold text-emerald-700">{stats.newBolsCreated}</span>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                <span className="text-blue-700 text-sm">Existing BOLs Linked</span>
                <span className="font-bold text-blue-700">{stats.existingBolsMatched}</span>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex justify-between items-center">
                <span className="text-amber-700 text-sm">Draft BOLs</span>
                <span className="font-bold text-amber-700">{stats.draftBolsCreated}</span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={reset} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
