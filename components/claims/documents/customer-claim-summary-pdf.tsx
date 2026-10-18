"use client"

import React from "react"
import { ClaimRecord } from "@/lib/types/incident-claims"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

interface CustomerClaimSummaryPdfProps {
  claim: ClaimRecord
  onClose?: () => void
}

export function CustomerClaimSummaryPdf({ claim, onClose }: CustomerClaimSummaryPdfProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-background min-h-screen p-6 max-w-4xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none text-foreground">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">Customer Claim Statement</h2>
          <p className="text-xs text-muted-foreground">Official Client Notice: {claim.claimNumber}</p>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="h-4 w-4 mr-1.5" />
            Print Customer Statement
          </Button>
        </div>
      </div>

      {/* Sheet Content */}
      <div className="border border-foreground/20 p-8 rounded-lg print:border-none print:p-2 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-foreground/80 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-primary">SKY ARIANA LIMITED</h1>
            <p className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
              Customer Care & Claims Administration Desk
            </p>
            <p className="text-[11px] text-muted-foreground">
              Official Commercial Claim File Status Statement
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-primary/10 border border-primary/30 px-3 py-1.5 rounded text-xs font-bold font-mono">
              {claim.claimNumber}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Date: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Recipient & Shipment */}
        <div className="grid grid-cols-2 gap-4 text-xs border p-4 rounded-md">
          <div className="space-y-1.5">
            <div><span className="text-muted-foreground">Valued Customer:</span> <strong>{claim.customerName}</strong></div>
            <div><span className="text-muted-foreground">Claimant Representative:</span> <strong>{claim.claimant}</strong></div>
            <div><span className="text-muted-foreground">Filing Date:</span> <strong>{claim.claimDate}</strong></div>
          </div>
          <div className="space-y-1.5">
            <div><span className="text-muted-foreground">Current File Status:</span> <strong>{claim.claimStatus}</strong></div>
            <div><span className="text-muted-foreground">Assigned Desk Officer:</span> <strong>{claim.assignedTo}</strong></div>
            <div><span className="text-muted-foreground">Target Completion:</span> <strong>{claim.responseDueDate || "Under active processing"}</strong></div>
          </div>
        </div>

        {/* Claim Financial Progress */}
        <div className="grid grid-cols-3 gap-3 text-center border p-4 rounded-md bg-muted/20 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Claimed Amount</span>
            <div className="text-base font-bold mt-1">{claim.currency} {claim.claimAmount.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Settled / Approved</span>
            <div className="text-base font-bold text-emerald-600 mt-1">{claim.currency} {claim.settlementAmount.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Under Technical Evaluation</span>
            <div className="text-base font-bold text-amber-600 mt-1">{claim.currency} {claim.outstandingExposure.toLocaleString()}</div>
          </div>
        </div>

        {/* Claim Summary */}
        <div className="border p-4 rounded-md space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wide">Summary of Claimed Item</div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{claim.claimBasisDescription}</p>
        </div>

        {/* Checklist Progress */}
        <div className="border rounded-md overflow-hidden text-xs">
          <div className="bg-muted p-2 font-bold text-[11px]">Supporting Documentation Status</div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-background text-[10px] uppercase font-semibold text-muted-foreground">
                <th className="p-2">Document</th>
                <th className="p-2">Category</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {claim.checklist.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 font-medium">{item.title}</td>
                  <td className="p-2 text-muted-foreground">{item.documentType}</td>
                  <td className="p-2 font-semibold">
                    {item.isCompleted ? (
                      <span className="text-emerald-600">✓ Received & Verified</span>
                    ) : item.required ? (
                      <span className="text-rose-600">Pending Customer Submission</span>
                    ) : (
                      <span className="text-muted-foreground">Optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Notice */}
        <div className="pt-6 border-t text-xs text-muted-foreground space-y-2">
          <p>
            Sky Ariana Limited is committed to transparent, fair, and prompt dispute resolution in accordance with international transport conventions and local transit regulations.
          </p>
          <div className="pt-4 text-center">
            <div className="font-bold text-foreground">Sky Ariana Customer Care & Claims Desk</div>
            <div className="text-[11px]">support@skyariana.com | claims@skyariana.com | +93 79 000 1122</div>
          </div>
        </div>
      </div>
    </div>
  )
}
