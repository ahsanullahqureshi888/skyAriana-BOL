"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Scale,
  FileCheck,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  Send,
  Printer,
  Copy,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  History,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import {
  ClaimRecord,
  ClaimStatus,
  ResponsibilityStatus,
  ClaimCommunicationItem,
} from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface ClaimDetailModalProps {
  isOpen: boolean
  onClose: () => void
  claim: ClaimRecord
  onEdit?: (claim: ClaimRecord) => void
  onAssessResponsibility?: (claim: ClaimRecord) => void
  onRecordSettlement?: (claim: ClaimRecord) => void
  onPrintSummary?: (claim: ClaimRecord) => void
}

export function ClaimDetailModal({
  isOpen,
  onClose,
  claim,
  onEdit,
  onAssessResponsibility,
  onRecordSettlement,
  onPrintSummary,
}: ClaimDetailModalProps) {
  const store = IncidentClaimsStore.getInstance()
  const [activeTab, setActiveTab] = useState("demand")
  const [checklist, setChecklist] = useState(claim.checklist || [])

  // New communication inline form
  const [commSubject, setCommSubject] = useState("")
  const [commParty, setCommParty] = useState("")
  const [commChannel, setCommChannel] = useState<any>("WHATSAPP")
  const [commSummary, setCommSummary] = useState("")
  const [showAddComm, setShowAddComm] = useState(false)

  const toggleChecklistItem = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    )
    setChecklist(updated)
    store.saveClaim({ id: claim.id, checklist: updated })
    toast.success("Checklist progress saved.")
  }

  const handleAddCommunication = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commSubject.trim() || !commParty.trim() || !commSummary.trim()) {
      toast.error("Please fill in all communication fields.")
      return
    }

    const newComm: ClaimCommunicationItem = {
      id: `comm-${Date.now()}`,
      date: new Date().toLocaleString(),
      party: commParty,
      channel: commChannel,
      subject: commSubject,
      summary: commSummary,
    }

    const updatedCommunications = [newComm, ...(claim.communications || [])]
    store.saveClaim({ id: claim.id, communications: updatedCommunications })
    claim.communications = updatedCommunications
    toast.success("Communication recorded in claim file log.")
    setCommSubject("")
    setCommParty("")
    setCommSummary("")
    setShowAddComm(false)
  }

  const copyCustomerWhatsApp = () => {
    const text = store.generateCustomerWhatsAppUpdate(claim.id)
    navigator.clipboard.writeText(text)
    toast.success("Customer WhatsApp update copied to clipboard (all internal margins scrubbed).")
  }

  const claimStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case "SETTLED":
        return <Badge className="bg-emerald-600 text-white font-semibold">SETTLED</Badge>
      case "ACCEPTED":
      case "PARTIALLY_ACCEPTED":
        return <Badge className="bg-teal-600 text-white font-semibold">{status}</Badge>
      case "UNDER_REVIEW":
      case "NEGOTIATION":
        return <Badge className="bg-indigo-600 text-white font-semibold">{status}</Badge>
      case "DOCUMENTS_PENDING":
        return <Badge className="bg-amber-600 text-white font-semibold">DOCUMENTS PENDING</Badge>
      case "REJECTED":
        return <Badge variant="destructive" className="font-semibold">REJECTED</Badge>
      default:
        return <Badge variant="secondary" className="font-semibold">{status}</Badge>
    }
  }

  const responsibilityBadge = (resp: ResponsibilityStatus) => {
    switch (resp) {
      case "AGREED_PARTY_RESPONSIBILITY":
        return <Badge className="bg-emerald-600 text-white">LIABILITY ASSIGNED</Badge>
      case "SHARED_RESPONSIBILITY":
        return <Badge className="bg-teal-600 text-white">SHARED LIABILITY</Badge>
      case "DISPUTED":
        return <Badge className="bg-rose-600 text-white">DISPUTED</Badge>
      case "UNDER_REVIEW":
        return <Badge className="bg-indigo-600 text-white">UNDER REVIEW</Badge>
      case "NO_RESPONSIBILITY_ASSIGNED":
        return <Badge variant="outline">FORCE MAJEURE / NONE</Badge>
      default:
        return <Badge variant="secondary">NOT ASSESSED</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600" />
              <DialogTitle className="text-base font-bold">
                {claim.claimNumber} — {claim.customerName}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {claimStatusBadge(claim.claimStatus)}
              {responsibilityBadge(claim.responsibilityStatus)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <span><strong>Claimant:</strong> {claim.claimant}</span>
            <span><strong>Against:</strong> {claim.claimAgainst}</span>
            <span><strong>Filed Date:</strong> {claim.claimDate}</span>
            {claim.incidentNumber && <span><strong>Incident:</strong> {claim.incidentNumber}</span>}
          </div>
        </DialogHeader>

        {/* Financial KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-muted/40 p-3 rounded-lg border text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Claim Demand</span>
            <div className="text-sm font-bold mt-0.5">
              {claim.currency} {claim.claimAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Settled / Paid</span>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">
              {claim.currency} {claim.settlementAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Outstanding Exposure</span>
            <div className="text-sm font-bold text-rose-600 mt-0.5">
              {claim.currency} {claim.outstandingExposure.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Response Target</span>
            <div className="text-sm font-bold mt-0.5">
              {claim.responseDueDate || "None specified"}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid grid-cols-6 text-xs">
            <TabsTrigger value="demand">Demand & Grounds</TabsTrigger>
            <TabsTrigger value="checklist">Checklist ({checklist.filter((c) => c.isCompleted).length}/{checklist.length})</TabsTrigger>
            <TabsTrigger value="comms">Communications ({claim.communications?.length || 0})</TabsTrigger>
            <TabsTrigger value="liability">Liability Assessment</TabsTrigger>
            <TabsTrigger value="settlements">Settlements ({claim.settlements?.length || 0})</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp Draft</TabsTrigger>
          </TabsList>

          {/* TAB 1: DEMAND & BASIS */}
          <TabsContent value="demand" className="space-y-4 pt-3 text-xs">
            <div className="border rounded-lg p-3.5 bg-background space-y-2">
              <div className="font-semibold text-foreground">Commercial Claim Justification:</div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {claim.claimBasisDescription || "No written basis provided."}
              </p>
            </div>

            {claim.notes && (
              <div className="border border-rose-500/30 bg-rose-500/5 rounded-lg p-3.5 space-y-1">
                <div className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Internal Negotiation Strategy (Confidential — Strictly Never Disclosed to Customer)
                </div>
                <p className="text-rose-900 dark:text-rose-200 text-xs">
                  {claim.notes}
                </p>
              </div>
            )}

            <div className="border rounded-lg p-3 bg-muted/20 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Assigned Officer:</span>{" "}
                <span className="font-semibold">{claim.assignedTo}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Responsible Party:</span>{" "}
                <span className="font-semibold">{claim.responsiblePartyName || "Under Review / Unassigned"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Registration Stamp:</span>{" "}
                <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: DOCUMENT CHECKLIST */}
          <TabsContent value="checklist" className="space-y-3 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Required Verification Documents</span>
              <span className="text-[10px] text-muted-foreground">Click checkbox to update verification status</span>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                    item.isCompleted ? "bg-emerald-500/5 border-emerald-500/30" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <div className={`font-semibold ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Type: {item.documentType}</div>
                    </div>
                  </div>
                  {item.required && (
                    <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">
                      Mandatory
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: COMMUNICATION LOG */}
          <TabsContent value="comms" className="space-y-3 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Counterparty Exchange & Correspondence</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowAddComm(!showAddComm)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Entry
              </Button>
            </div>

            {showAddComm && (
              <form onSubmit={handleAddCommunication} className="border p-3 rounded-lg bg-muted/20 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold">Contact Party / Person</span>
                    <Input
                      placeholder="e.g. Haji Sultan (Ariana Saffron)"
                      className="text-xs mt-1"
                      value={commParty}
                      onChange={(e) => setCommParty(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold">Channel</span>
                    <select
                      className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                      value={commChannel}
                      onChange={(e) => setCommChannel(e.target.value)}
                    >
                      <option value="WHATSAPP">WhatsApp Message / Call</option>
                      <option value="EMAIL">Official Email</option>
                      <option value="PHONE">Direct Phone Call</option>
                      <option value="LETTER">Formal Paper Letter</option>
                      <option value="MEETING">In-Person Meeting</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold">Subject / Title</span>
                    <Input
                      placeholder="e.g. Discussion of tariff waiver"
                      className="text-xs mt-1"
                      value={commSubject}
                      onChange={(e) => setCommSubject(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold">Summary of Discussion</span>
                  <Input
                    placeholder="Summarize key remarks, counter-offers, or timeline agreements."
                    className="text-xs mt-1"
                    value={commSummary}
                    onChange={(e) => setCommSummary(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowAddComm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                    Save Record
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {(claim.communications || []).map((c) => (
                <div key={c.id} className="border rounded-lg p-3 bg-background space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      {c.subject}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {c.channel} | {c.date}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    <strong>Counterparty:</strong> {c.party}
                  </div>
                  <p className="text-muted-foreground text-xs">{c.summary}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: LIABILITY ASSESSMENT */}
          <TabsContent value="liability" className="space-y-4 pt-3 text-xs">
            <div className="border rounded-lg p-3.5 bg-background space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Commercial Liability & Fault Evaluation
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAssessResponsibility?.(claim)}
                >
                  Update Assessment
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="font-bold">{claim.responsibilityStatus}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Responsible Party:</span>{" "}
                  <span className="font-semibold">{claim.responsiblePartyName || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Evaluated By:</span>{" "}
                  <span>{claim.responsiblePartyAssessment?.assessedBy || "Not assessed"}</span>
                </div>
              </div>

              {claim.responsiblePartyAssessment?.reason && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">Factual Grounds & Technical Reasons:</span>
                  <p className="text-muted-foreground bg-muted/20 p-2.5 rounded border leading-relaxed">
                    {claim.responsiblePartyAssessment.reason}
                  </p>
                </div>
              )}

              {claim.responsiblePartyAssessment?.evidenceReference && (
                <div>
                  <span className="text-muted-foreground font-semibold">Cited Supporting Evidence:</span>{" "}
                  <span className="font-mono text-primary">{claim.responsiblePartyAssessment.evidenceReference}</span>
                </div>
              )}
            </div>

            {/* Previous Assessments Audit Trail */}
            {(claim.responsiblePartyAssessment?.previousAssessments || []).length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
                <div className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Historical Liability Determinations Audit Log
                </div>
                <div className="space-y-1.5">
                  {claim.responsiblePartyAssessment?.previousAssessments?.map((prev, idx) => (
                    <div key={idx} className="p-2 border rounded bg-background text-[11px] flex justify-between">
                      <div>
                        <strong>{prev.assessedPartyName}</strong> ({prev.status}) — {prev.reason}
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0 pl-2">
                        {prev.changedBy} | {new Date(prev.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 5: SETTLEMENTS */}
          <TabsContent value="settlements" className="space-y-4 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Recorded Commercial Settlements</span>
              {claim.outstandingExposure > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onRecordSettlement?.(claim)}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Record Settlement
                </Button>
              )}
            </div>

            {claim.settlements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <DollarSign className="h-8 w-8 mx-auto opacity-40 mb-2" />
                No settlements recorded yet. Outstanding balance is {claim.currency} {claim.outstandingExposure.toLocaleString()}.
              </div>
            ) : (
              <div className="space-y-2">
                {claim.settlements.map((s) => (
                  <div key={s.id} className="border rounded-lg p-3 bg-background flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-emerald-600 flex items-center gap-2">
                        <span>{s.currency} {s.settlementAmount.toLocaleString()}</span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {s.settlementType}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Ref: <code className="font-mono">{s.financeTransactionRef}</code> | Approved by: {s.approvedBy}
                      </div>
                      {s.notes && <div className="text-[11px] text-muted-foreground mt-0.5 italic">{s.notes}</div>}
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <div>{s.settlementDate}</div>
                      <div className="font-mono text-[9px] text-muted-foreground/60">{s.idempotencyKey.slice(0, 18)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 6: CUSTOMER WHATSAPP DRAFT */}
          <TabsContent value="whatsapp" className="space-y-4 pt-3 text-xs">
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-3 flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Privacy Protection Active:</span> This message is automatically sanitized. Internal carrier buy rates, freight profit margins, and internal blame notes are strictly excluded.
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
              {store.generateCustomerWhatsAppUpdate(claim.id)}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={copyCustomerWhatsApp}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy WhatsApp Text
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={copyCustomerWhatsApp}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              WhatsApp Notice
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onPrintSummary?.(claim)}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print Claim File Summary
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => {
                onEdit?.(claim)
                onClose()
              }}
            >
              Edit Claim
            </Button>
            <Button type="button" size="sm" className="text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
