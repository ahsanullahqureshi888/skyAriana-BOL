"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, FileDown, AlertTriangle } from "lucide-react"
import { ComplianceValidationResult } from "@/lib/types/document-compliance"
import { toast } from "sonner"

export function CombinedPdfGenerator({ bolData, open, onOpenChange, complianceResult }: { 
  bolData: any, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  complianceResult: ComplianceValidationResult
}) {
  const [loading, setLoading] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState<string[]>(["BILL_OF_LADING", "COMMERCIAL_INVOICE"])
  
  const handleGenerate = async () => {
    setLoading(true)
    try {
      const items = selectedDocs.map(d => ({
        type: d,
        title: d.replace(/_/g, " "),
        filePath: `mock_${d.toLowerCase()}.pdf` // In reality this comes from DocumentMetadata
      }))
      
      const res = await fetch("/api/documents/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bolNumber: bolData.bol_number,
          bolData,
          items
        })
      })
      
      if (!res.ok) throw new Error("Failed to generate PDF")
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisposition = res.headers.get("Content-Disposition")
      let filename = `${bolData.bol_number}_Shipment_File.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => window.URL.revokeObjectURL(url), 150)
      
      toast.success("Shipment PDF combined and downloaded!")
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error("Error generating PDF. Some files might be missing.")
    } finally {
      setLoading(false)
    }
  }
  
  const availableDocs = [
    { id: "BILL_OF_LADING", label: "Bill of Lading", warning: false },
    { id: "COMMERCIAL_INVOICE", label: "Commercial Invoice", warning: false },
    { id: "PACKING_LIST", label: "Packing List", warning: true },
    { id: "PHYTOSANITARY_CERTIFICATE", label: "Phytosanitary Certificate", warning: false }
  ]
  
  const toggleDoc = (id: string) => {
    if (selectedDocs.includes(id)) setSelectedDocs(selectedDocs.filter(d => d !== id))
    else setSelectedDocs([...selectedDocs, id])
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Complete Shipment File</DialogTitle>
          <DialogDescription>
            Select the documents to combine into a single PDF. The system will automatically add a Cover Page and Index.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {availableDocs.map(doc => (
              <div key={doc.id} className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                <Checkbox 
                  id={doc.id} 
                  checked={selectedDocs.includes(doc.id)} 
                  onCheckedChange={() => toggleDoc(doc.id)} 
                />
                <div className="grid gap-1.5 leading-none cursor-pointer" onClick={() => toggleDoc(doc.id)}>
                  <label htmlFor={doc.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    {doc.label}
                  </label>
                  {doc.warning && (
                    <p className="text-[11px] text-amber-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Data mismatch detected in this document
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={loading || selectedDocs.length === 0} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
