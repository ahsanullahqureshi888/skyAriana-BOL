"use client"

import React from "react"
import { ClaimRecord } from "@/lib/types/incident-claims"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

interface ClaimFileSummaryPdfProps {
  claim: ClaimRecord
  onClose?: () => void
}

export function ClaimFileSummaryPdf({ claim, onClose }: ClaimFileSummaryPdfProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-background min-h-screen p-6 max-w-4xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none text-foreground">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">Commercial Claim Master File Summary</h2>
          <p className="text-xs text-muted-foreground">Internal Adjuster File: {claim.claimNumber}</p>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="h-4 w-4 mr-1.5" />
            Print File Summary
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
              Claims, Detention & Risk Management Division
            </p>
            <p className="text-[11px] text-muted-foreground">Master Adjuster File Record</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-primary/10 border border-primary/30 px-3 py-1.5 rounded text-xs font-bold font-mono">
              {claim.claimNumber}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Date Filed: {claim.claimDate}</div>
            <div className="text-[11px] font-semibold">Status: {claim.claimStatus}</div>
          </div>
        </div>

        {/* Claim Info Overview */}
        <div className="grid grid-cols-2 gap-4 text-xs border p-4 rounded-md">
          <div className="space-y-1.5">
            <div><span className="text-muted-foreground">Claimant:</span> <strong>{claim.claimant}</strong></div>
            <div><span className="text-muted-foreground">Customer:</span> <strong>{claim.customerName}</strong></div>
            <div><span className="text-muted-foreground">Claim Against:</span> <strong>{claim.claimAgainst}</strong></div>
            <div><span className="text-muted-foreground">Claim Type:</span> <strong>{claim.claimType}</strong></div>
          </div>
          <div className="space-y-1.5">
            <div><span className="text-muted-foreground">Incident Ref:</span> <strong>{claim.incidentNumber || "N/A"}</strong></div>
            <div><span className="text-muted-foreground">Assigned Officer:</span> <strong>{claim.assignedTo}</strong></div>
            <div><span className="text-muted-foreground">Target Resolution:</span> <strong>{claim.responseDueDate || "Pending"}</strong></div>
            <div><span className="text-muted-foreground">Liability Status:</span> <strong>{claim.responsibilityStatus}</strong></div>
          </div>
        </div>

        {/* Financial Accounting Invariance Grid */}
        <div className="grid grid-cols-3 gap-3 text-center border p-4 rounded-md bg-muted/20 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Claim Demanded</span>
            <div className="text-base font-bold mt-1">{claim.currency} {claim.claimAmount.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Settled / Discharged</span>
            <div className="text-base font-bold text-emerald-600 mt-1">{claim.currency} {claim.settlementAmount.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Outstanding Exposure</span>
            <div className="text-base font-bold text-rose-600 mt-1">{claim.currency} {claim.outstandingExposure.toLocaleString()}</div>
          </div>
        </div>

        {/* Commercial Demand Narrative */}
        <div className="border p-4 rounded-md space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wide">Commercial Basis & Demand Justification</div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{claim.claimBasisDescription}</p>
        </div>

        {/* Technical Liability Assessment */}
        {claim.responsiblePartyAssessment && (
          <div className="border p-4 rounded-md space-y-2 text-xs bg-muted/10">
            <div className="font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              Authorized Liability & Technical Evaluation
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Assessed Party:</span> <strong>{claim.responsiblePartyAssessment.assessedPartyName}</strong></div>
              <div><span className="text-muted-foreground">Assessed By:</span> <strong>{claim.responsiblePartyAssessment.assessedBy}</strong></div>
            </div>
            <div>
              <span className="text-muted-foreground">Technical Grounds:</span>
              <p className="mt-0.5 text-muted-foreground">{claim.responsiblePartyAssessment.reason}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cited Evidence:</span>{" "}
              <span className="font-mono text-primary font-bold">{claim.responsiblePartyAssessment.evidenceReference}</span>
            </div>
          </div>
        )}

        {/* Settlements Table */}
        <div className="border rounded-md overflow-hidden text-xs">
          <div className="bg-muted p-2 font-bold text-[11px]">Recorded Settlements & Ledger Payouts</div>
          {claim.settlements.length === 0 ? (
            <div className="p-3 text-muted-foreground text-center">No settlements recorded to date.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-background text-[10px] uppercase font-semibold text-muted-foreground">
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Finance Ref</th>
                  <th className="p-2">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claim.settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2">{s.settlementDate}</td>
                    <td className="p-2">{s.settlementType}</td>
                    <td className="p-2 font-bold text-emerald-600">{s.currency} {s.settlementAmount.toLocaleString()}</td>
                    <td className="p-2 font-mono">{s.financeTransactionRef}</td>
                    <td className="p-2">{s.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Approvals */}
        <div className="grid grid-cols-2 gap-6 pt-6 border-t text-xs text-center">
          <div className="border-t pt-2">
            <div className="font-bold">Claims Adjuster</div>
            <div className="h-10"></div>
            <div className="text-[10px] text-muted-foreground">{claim.assignedTo}</div>
          </div>
          <div className="border-t pt-2">
            <div className="font-bold">Finance & Legal Controller</div>
            <div className="h-10"></div>
            <div className="text-[10px] text-muted-foreground">Authorized Signature & Seal</div>
          </div>
        </div>
      </div>
    </div>
  )
}
