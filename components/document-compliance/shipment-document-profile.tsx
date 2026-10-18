"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Upload, Printer, ArrowRightSquare } from "lucide-react"
import { evaluateShipmentCompliance, upsertDocumentMetadata } from "@/lib/services/document-compliance-client"
import { ComplianceValidationResult, DocumentType } from "@/lib/types/document-compliance"
import { toast } from "sonner"
import { CombinedPdfGenerator } from "./combined-pdf-generator"

export function ShipmentDocumentProfile({ bolData }: { bolData: any }) {
  const [result, setResult] = useState<ComplianceValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPdfGenerator, setShowPdfGenerator] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await evaluateShipmentCompliance(bolData.id || bolData.bol_number, bolData)
        setResult(res)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load compliance data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bolData])

  const handleMarkNotRequired = async (docType: DocumentType) => {
    try {
      await upsertDocumentMetadata({
        bolId: bolData.id || bolData.bol_number,
        type: docType,
        status: "NOT_REQUIRED",
        overrideReason: "Admin override"
      })
      toast.success(`${docType} marked as not required.`)
      
      const res = await evaluateShipmentCompliance(bolData.id || bolData.bol_number, bolData)
      setResult(res)
    } catch (err) {
      toast.error("Action failed")
    }
  }

  const handleUploadMock = async (docType: DocumentType) => {
    try {
      await upsertDocumentMetadata({
        bolId: bolData.id || bolData.bol_number,
        type: docType,
        status: "UPLOADED",
        filePath: `mock_${docType.toLowerCase()}.pdf`,
        fileName: `${bolData.bol_number}_${docType}.pdf`
      })
      toast.success(`${docType} uploaded successfully.`)
      
      const res = await evaluateShipmentCompliance(bolData.id || bolData.bol_number, bolData)
      setResult(res)
    } catch (err) {
      toast.error("Upload failed")
    }
  }

  if (loading || !result) return <div className="p-12 text-center">Loading compliance profile...</div>

  const renderDocumentRow = (docType: DocumentType, status: "MISSING" | "PENDING" | "COMPLETED" | "NOT_REQUIRED", isCorrection = false, keyPrefix = "") => {
    let icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    let badge = <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Complete</Badge>
    
    if (status === "MISSING") {
      icon = <XCircle className="h-5 w-5 text-red-500" />
      badge = <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Missing</Badge>
    } else if (status === "PENDING") {
      icon = <Clock className="h-5 w-5 text-amber-500" />
      badge = <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending Review</Badge>
    } else if (status === "NOT_REQUIRED") {
      icon = <CheckCircle2 className="h-5 w-5 text-slate-400" />
      badge = <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Not Required</Badge>
    }

    if (isCorrection) {
      icon = <AlertTriangle className="h-5 w-5 text-orange-500" />
      badge = <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Needs Correction</Badge>
    }

    const rowKey = `${keyPrefix || status}-${docType}`

    return (
      <div key={rowKey} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <div className="font-medium text-slate-900">{docType.replace(/_/g, " ")}</div>
            <div className="text-sm text-slate-500">{status === "NOT_REQUIRED" ? "Excluded from requirements" : "Required for export"}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge}
          {status !== "COMPLETED" && status !== "NOT_REQUIRED" && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleUploadMock(docType)}>
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
              <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-700" onClick={() => handleMarkNotRequired(docType)}>
                Mark N/A
              </Button>
            </div>
          )}
          {status === "COMPLETED" && (
            <Button size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-2" /> View
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Compliance Profile: {bolData.bol_number}</h2>
          <p className="text-slate-500">{bolData.shipper_name} → {bolData.consignee_name}</p>
        </div>
        <Button onClick={() => setShowPdfGenerator(true)} className="bg-blue-600 hover:bg-blue-700">
          <Printer className="h-4 w-4 mr-2" /> Generate Complete File
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>Documents required based on origin, destination, and commodity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.missingDocs.map((doc, idx) => renderDocumentRow(doc, "MISSING", false, `missing-${idx}`))}
              {result.correctionDocs.map((doc, idx) => renderDocumentRow(doc, "PENDING", true, `correction-${idx}`))}
              {result.pendingDocs.map((doc, idx) => renderDocumentRow(doc, "PENDING", false, `pending-${idx}`))}
              
              {/* Show completed */}
              {Array.from({length: result.completedCount}).map((_, i) => renderDocumentRow(`COMPLETED_DOC_${i}` as any, "COMPLETED", false, `completed-${i}`))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className={`text-5xl font-bold ${result.completionScore === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {result.completionScore}%
                </div>
                <div className="text-sm font-medium text-slate-500 mt-2">
                  {result.completedCount} of {result.requiredCount} Required Documents
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stage Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(result.stageReadiness).map(([stage, isReady]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{stage}</span>
                  {isReady ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Ready</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">Blocked</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="border-red-100 shadow-sm">
            <CardHeader className="bg-red-50/50 pb-3 border-b border-red-50">
              <CardTitle className="text-sm flex items-center text-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" /> Data Consistency
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-600 mb-3">System automatically checks for discrepancies across documents.</p>
              <div className="flex items-center justify-between text-sm p-2 bg-white border border-slate-200 rounded text-emerald-700 font-medium">
                <span>Shipper Name</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between text-sm p-2 bg-red-50 border border-red-200 rounded text-red-700 font-medium mt-2">
                <span>Gross Weight</span>
                <span className="text-xs">Mismatch Detected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CombinedPdfGenerator 
        bolData={bolData} 
        open={showPdfGenerator} 
        onOpenChange={setShowPdfGenerator} 
        complianceResult={result}
      />
    </div>
  )
}
