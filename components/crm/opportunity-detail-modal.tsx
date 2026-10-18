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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Copy,
  ArrowRight,
  ShieldAlert,
  Send,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import {
  OpportunityRecord,
  OpportunityStage,
  LostReason,
} from "@/lib/types/crm-sales"
import { crmSalesStore } from "@/lib/services/crm-sales-service"
import { freightPricingService } from "@/lib/services/freight-pricing-service"

interface OpportunityDetailModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity: OpportunityRecord
  onEdit?: (opp: OpportunityRecord) => void
  onOpportunityUpdated?: (opp: OpportunityRecord) => void
  onConvertToShipment?: (opp: OpportunityRecord) => void
}

const STAGES: { key: OpportunityStage; label: string }[] = [
  { key: "NEW_INQUIRY", label: "New Inquiry" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "RATE_REQUESTED", label: "Rate Requested" },
  { key: "QUOTATION_SENT", label: "Quote Sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
]

export function OpportunityDetailModal({
  isOpen,
  onClose,
  opportunity,
  onEdit,
  onOpportunityUpdated,
  onConvertToShipment,
}: OpportunityDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [opp, setOpp] = useState<OpportunityRecord>(opportunity)

  // Mark Lost state
  const [lostReason, setLostReason] = useState<LostReason>("PRICE")
  const [lostCompetitor, setLostCompetitor] = useState("")
  const [lostNotes, setLostNotes] = useState("")
  const [showLostForm, setShowLostForm] = useState(false)

  // Linked quotes from pricing service
  const allQuotes = freightPricingService.getQuotations()
  const linkedQuotes = allQuotes.filter(
    (q) =>
      opp.linkedQuotationIds.includes(q.quotationNumber) ||
      opp.linkedQuotationIds.includes(q.id) ||
      q.customerName.toLowerCase() === opp.customerName.toLowerCase()
  )

  const handleStageChange = (newStage: OpportunityStage) => {
    try {
      const updated = crmSalesStore.updateOpportunityStage(opp.id, newStage, opp.revision)
      setOpp(updated)
      toast.success(`Opportunity stage advanced to ${newStage.replace(/_/g, " ")}.`)
      onOpportunityUpdated?.(updated)
    } catch (err: any) {
      toast.error(err.message || "Failed to update stage.")
    }
  }

  const handleMarkWon = () => {
    const acceptedQuote = linkedQuotes.length > 0 ? linkedQuotes[0].quotationNumber : "SA-QT-CONFIRMED"
    try {
      const updated = crmSalesStore.markOpportunityWon(opp.id, acceptedQuote)
      setOpp(updated)
      toast.success(`Opportunity ${opp.opportunityNumber} marked WON!`)
      onOpportunityUpdated?.(updated)
    } catch (err: any) {
      toast.error(err.message || "Failed to mark won.")
    }
  }

  const handleMarkLostSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updated = crmSalesStore.markOpportunityLost(opp.id, lostReason, lostCompetitor, lostNotes)
      setOpp(updated)
      setShowLostForm(false)
      toast.success(`Opportunity ${opp.opportunityNumber} marked LOST.`)
      onOpportunityUpdated?.(updated)
    } catch (err: any) {
      toast.error(err.message || "Failed to mark lost.")
    }
  }

  const handleReopen = () => {
    try {
      const updated = crmSalesStore.reopenOpportunity(opp.id)
      setOpp(updated)
      toast.success(`Opportunity ${opp.opportunityNumber} reopened to Follow-Up stage.`)
      onOpportunityUpdated?.(updated)
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen opportunity.")
    }
  }

  const copyWhatsApp = () => {
    const msg = crmSalesStore.generateWhatsAppQuoteFollowUp(opp.id)
    navigator.clipboard.writeText(msg)
    toast.success("Customer quotation follow-up copied (internal buy costs and margins scrubbed).")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <DialogTitle className="text-base font-bold">
                {opp.opportunityNumber} — {opp.title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono font-bold">
                Rev {opp.revision}
              </Badge>
              {opp.status === "WON" ? (
                <Badge className="bg-emerald-600 text-white font-bold">WON BUSINESS</Badge>
              ) : opp.status === "LOST" ? (
                <Badge variant="destructive" className="font-bold">LOST</Badge>
              ) : (
                <Badge className="bg-indigo-600 text-white font-bold">{opp.stage.replace(/_/g, " ")}</Badge>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <span><strong>Customer:</strong> {opp.customerName}</span>
            <span><strong>Corridor:</strong> {opp.tradeLane}</span>
            <span><strong>Target Close:</strong> {opp.expectedCloseDate}</span>
            <span><strong>Sales Lead:</strong> {opp.owner}</span>
          </div>
        </DialogHeader>

        {/* Financial KPI Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Expected Revenue</span>
            <div className="text-base font-bold mt-0.5 text-foreground">
              {opp.currency} {opp.expectedRevenue.toLocaleString()}
            </div>
            <span className="text-[9px] text-muted-foreground">Sky Ariana freight service</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Pipeline Probability</span>
            <div className="text-base font-bold mt-0.5 text-indigo-600">
              {opp.probability}%
            </div>
            <span className="text-[9px] text-muted-foreground">Internal pipeline estimate</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Equipment Volume</span>
            <div className="text-sm font-bold mt-0.5">{opp.equipment}</div>
            <span className="text-[9px] text-muted-foreground">{opp.expectedVolume}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Current Stage</span>
            <div className="text-sm font-bold mt-0.5 text-foreground">{opp.stage.replace(/_/g, " ")}</div>
          </div>
        </div>

        {/* Interactive Stage Stepper */}
        {opp.status === "ACTIVE" && (
          <div className="flex items-center justify-between overflow-x-auto py-2 px-1 border rounded-lg bg-muted/20 text-xs">
            {STAGES.filter((s) => s.key !== "LOST").map((st, idx) => (
              <button
                key={st.key}
                type="button"
                onClick={() => handleStageChange(st.key)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors shrink-0 ${
                  opp.stage === st.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid grid-cols-4 text-xs">
            <TabsTrigger value="overview">Overview & Next Action</TabsTrigger>
            <TabsTrigger value="quotes">Quotations ({linkedQuotes.length})</TabsTrigger>
            <TabsTrigger value="actions">Win / Loss Control</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp Template</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 pt-3 text-xs">
            <div className="border rounded-lg p-3.5 bg-background space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Next Action Item:</span>
                {opp.nextActionDate && (
                  <span className="text-[10px] text-primary font-mono">Target: {opp.nextActionDate}</span>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {opp.nextAction}
              </p>
            </div>

            {opp.notes && (
              <div className="border rounded-lg p-3 bg-muted/20 space-y-1">
                <span className="font-semibold text-foreground">Commercial Background & Notes:</span>
                <p className="text-muted-foreground text-xs leading-relaxed">{opp.notes}</p>
              </div>
            )}

            {opp.status === "LOST" && (
              <div className="border border-rose-500/30 bg-rose-500/5 rounded-lg p-3 space-y-1.5 text-rose-800 dark:text-rose-300">
                <div className="font-semibold flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  Lost Opportunity Record
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Reason: <strong>{opp.lostReason}</strong></div>
                  <div>Competitor: <strong>{opp.lostCompetitor || "Not cited"}</strong></div>
                </div>
                {opp.lostNotes && <p className="text-[11px] italic mt-1">{opp.lostNotes}</p>}
              </div>
            )}

            {opp.status === "WON" && opp.convertedShipmentId && (
              <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-3 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div>
                  <span className="font-semibold">Converted to Operational Shipment:</span>{" "}
                  <code className="font-mono font-bold text-xs">{opp.convertedShipmentId}</code>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-400">
                  Duplicate Conversion Blocked
                </Badge>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: QUOTATIONS */}
          <TabsContent value="quotes" className="space-y-3 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Associated Freight Quotations</span>
              <span className="text-[10px] text-muted-foreground">Connected to Rates & Quotations Engine</span>
            </div>

            {linkedQuotes.length === 0 ? (
              <div className="text-center py-8 border rounded-lg text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto opacity-30 mb-2" />
                No quotation records currently linked to this opportunity.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedQuotes.map((q) => (
                  <div key={q.id} className="border rounded-lg p-3 bg-background flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-primary flex items-center gap-2">
                        <span>{q.quotationNumber}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {q.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">
                        Route: {q.originName} to {q.destinationName} | {q.containerQuantity} × {q.containerType}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-foreground">
                        {q.currency} {q.totalSellPrice.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Valid: {q.validUntil}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: WIN / LOSS ACTIONS */}
          <TabsContent value="actions" className="space-y-4 pt-3 text-xs">
            <div className="border rounded-lg p-3.5 space-y-3 bg-background">
              <div className="font-semibold text-foreground">Outcome Disposition Controls</div>

              {opp.status === "ACTIVE" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                    onClick={handleMarkWon}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Mark Won (Customer Confirmed)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-500/30 text-rose-600 hover:bg-rose-50 text-xs h-9"
                    onClick={() => setShowLostForm(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Mark Lost (Record Reason)
                  </Button>
                </div>
              )}

              {opp.status === "WON" && (
                <div className="space-y-2 pt-2">
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    ✓ Opportunity confirmed won.
                  </p>
                  {!opp.convertedShipmentId ? (
                    <Button
                      type="button"
                      className="bg-primary text-primary-foreground text-xs"
                      onClick={() => onConvertToShipment?.(opp)}
                    >
                      Convert to Operational Shipment / BOL
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Already converted to shipment <strong>{opp.convertedShipmentId}</strong>. Duplicate conversion prevented.
                    </div>
                  )}
                </div>
              )}

              {(opp.status === "LOST" || opp.status === "ON_HOLD") && (
                <div className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleReopen}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reopen Opportunity
                  </Button>
                </div>
              )}
            </div>

            {/* Mark Lost Form */}
            {showLostForm && (
              <form onSubmit={handleMarkLostSubmit} className="border border-rose-500/30 bg-rose-500/5 p-3 rounded-lg space-y-3">
                <div className="font-semibold text-rose-700 dark:text-rose-300">Document Lost Reason:</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Primary Lost Reason *</Label>
                    <select
                      className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value as LostReason)}
                    >
                      <option value="PRICE">Price / Freight Rate Higher</option>
                      <option value="ROUTE">Route / Border Station Preference</option>
                      <option value="TRANSIT_TIME">Transit Time Too Long</option>
                      <option value="NO_CAPACITY">No Container / Truck Capacity</option>
                      <option value="COMPETITOR">Competitor Won Contract</option>
                      <option value="CUSTOMER_CANCELLED">Customer Cancelled Shipment</option>
                      <option value="NO_RESPONSE">No Response from Client</option>
                      <option value="OTHER">Other Reason</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Winning Competitor (Optional)</Label>
                    <Input
                      placeholder="e.g. Local Trucker Union / Third-party Line"
                      className="text-xs mt-1"
                      value={lostCompetitor}
                      onChange={(e) => setLostCompetitor(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Specific Feedback / Notes</Label>
                  <Textarea
                    rows={2}
                    placeholder="Document specific client feedback to improve future quotation competitiveness."
                    className="text-xs mt-1"
                    value={lostNotes}
                    onChange={(e) => setLostNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowLostForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-rose-600 text-white hover:bg-rose-700">
                    Confirm Mark Lost
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          {/* TAB 4: WHATSAPP TEMPLATE */}
          <TabsContent value="whatsapp" className="space-y-4 pt-3 text-xs">
            <div className="bg-muted/40 p-3 rounded-lg border font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
              {crmSalesStore.generateWhatsAppQuoteFollowUp(opp.id)}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={copyWhatsApp}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy WhatsApp Update
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={copyWhatsApp}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            WhatsApp Quote
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => {
                onEdit?.(opp)
                onClose()
              }}
            >
              Edit Opportunity
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
