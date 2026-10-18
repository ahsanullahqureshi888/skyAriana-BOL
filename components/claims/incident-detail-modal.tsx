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
import {
  AlertTriangle,
  FileText,
  Package,
  Truck,
  Ship,
  Thermometer,
  Camera,
  Scale,
  Printer,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Edit,
} from "lucide-react"
import { toast } from "sonner"
import { IncidentRecord, EvidenceRecord } from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface IncidentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  incident: IncidentRecord
  onEdit?: (incident: IncidentRecord) => void
  onCreateClaim?: (incident: IncidentRecord) => void
  onPrintDamageReport?: (incident: IncidentRecord) => void
}

export function IncidentDetailModal({
  isOpen,
  onClose,
  incident,
  onEdit,
  onCreateClaim,
  onPrintDamageReport,
}: IncidentDetailModalProps) {
  const store = IncidentClaimsStore.getInstance()
  const evidenceList = store.getEvidenceByIncident(incident.id)
  const allClaims = store.getClaims()
  const linkedClaims = allClaims.filter((c) => incident.linkedClaimIds.includes(c.id) || c.incidentId === incident.id)

  const [activeTab, setActiveTab] = useState("summary")

  const copyWhatsAppNotice = () => {
    const text = store.generateFactualIncidentNotice(incident.id)
    navigator.clipboard.writeText(text)
    toast.success("Factual incident notice copied to clipboard.")
  }

  const severityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return <Badge variant="destructive">CRITICAL SEVERITY</Badge>
      case "HIGH":
        return <Badge className="bg-rose-500 text-white">HIGH SEVERITY</Badge>
      case "MEDIUM":
        return <Badge className="bg-amber-500 text-white">MEDIUM SEVERITY</Badge>
      default:
        return <Badge variant="secondary">LOW SEVERITY</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <DialogTitle className="text-base font-bold">
                {incident.incidentNumber} — {incident.incidentType.replace(/_/g, " ")}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {severityBadge(incident.severity)}
              <Badge variant="outline" className="font-semibold">
                {incident.status}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <span><strong>Customer:</strong> {incident.customerName}</span>
            <span><strong>Location:</strong> {incident.locationName} ({incident.locationType})</span>
            <span><strong>Date:</strong> {incident.incidentDate}</span>
            {incident.shipmentRef && <span><strong>BOL / Ref:</strong> {incident.shipmentRef}</span>}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid grid-cols-4 text-xs">
            <TabsTrigger value="summary">Operational Summary</TabsTrigger>
            <TabsTrigger value="inspection">Inspection Scope</TabsTrigger>
            <TabsTrigger value="evidence">Evidence ({evidenceList.length})</TabsTrigger>
            <TabsTrigger value="claims">Linked Claims ({linkedClaims.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: OPERATIONAL SUMMARY */}
          <TabsContent value="summary" className="space-y-4 pt-3 text-xs">
            {/* Blameless Fact Description Box */}
            <div className="bg-muted/40 p-3.5 rounded-lg border space-y-1.5">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Objective Factual Narrative:</span>
                <span className="text-[10px] text-muted-foreground font-normal">Strict Blameless Standard</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {incident.description}
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background p-3 rounded-lg border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Quantity Affected</span>
                <div className="text-sm font-bold mt-0.5">{incident.quantityAffected} Units / Cartons</div>
              </div>
              <div className="bg-background p-3 rounded-lg border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Weight Affected</span>
                <div className="text-sm font-bold mt-0.5">{incident.weightAffectedKg} kg</div>
              </div>
              <div className="bg-background p-3 rounded-lg border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Est. Cargo Value</span>
                <div className="text-sm font-bold mt-0.5 text-amber-600">
                  {incident.currency} {incident.estimatedValueAffected.toLocaleString()}
                </div>
              </div>
              <div className="bg-background p-3 rounded-lg border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Evidence Status</span>
                <div className="text-sm font-bold mt-0.5">{incident.evidenceStatus}</div>
              </div>
            </div>

            {/* Transport & Operational Equipment */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                Equipment & Transit Context
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {incident.truckPlate && (
                  <div>
                    <span className="text-muted-foreground">Truck Plate:</span>{" "}
                    <span className="font-semibold">{incident.truckPlate}</span>
                  </div>
                )}
                {incident.driverName && (
                  <div>
                    <span className="text-muted-foreground">Driver:</span>{" "}
                    <span className="font-semibold">{incident.driverName}</span>
                  </div>
                )}
                {incident.containerNumber && (
                  <div>
                    <span className="text-muted-foreground">Container:</span>{" "}
                    <span className="font-semibold uppercase">{incident.containerNumber}</span>
                  </div>
                )}
                {incident.vesselOrFlight && (
                  <div>
                    <span className="text-muted-foreground">Vessel / Flight:</span>{" "}
                    <span className="font-semibold">{incident.vesselOrFlight}</span>
                  </div>
                )}
                {incident.borderStation && (
                  <div>
                    <span className="text-muted-foreground">Border Post:</span>{" "}
                    <span className="font-semibold">{incident.borderStation}</span>
                  </div>
                )}
                {incident.warehouseName && (
                  <div>
                    <span className="text-muted-foreground">Warehouse:</span>{" "}
                    <span className="font-semibold">{incident.warehouseName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Operational Handling Metadata */}
            <div className="bg-muted/20 border rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Reported By:</span>{" "}
                <span className="font-semibold">{incident.reportedByName} ({incident.reportedBySource})</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assigned Handler:</span>{" "}
                <span className="font-semibold">{incident.assignedTo}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Recorded At:</span>{" "}
                <span>{new Date(incident.reportedDate).toLocaleString()}</span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SPECIFIC INSPECTION SCOPE */}
          <TabsContent value="inspection" className="space-y-4 pt-3 text-xs">
            {incident.damageDetails && (
              <div className="border rounded-lg p-3 space-y-2 bg-blue-500/5 border-blue-500/20">
                <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  Cargo Damage / Wetness Protocol
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">Pattern:</span>{" "}
                    <span className="font-semibold">{incident.damageDetails.damageType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Packages Damaged:</span>{" "}
                    <span className="font-bold text-rose-600">{incident.damageDetails.packagesAffected}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Consignment:</span>{" "}
                    <span className="font-semibold">{incident.damageDetails.totalShipmentPackages}</span>
                  </div>
                </div>
                <div className="pt-1 text-muted-foreground">
                  <strong>Observed At:</strong> {incident.damageDetails.observedAt}
                </div>
                {incident.damageDetails.inspectionNotes && (
                  <div className="pt-1 text-muted-foreground">
                    <strong>Inspection Notes:</strong> {incident.damageDetails.inspectionNotes}
                  </div>
                )}
              </div>
            )}

            {incident.shortageDetails && (
              <div className="border rounded-lg p-3 space-y-2 bg-amber-500/5 border-amber-500/20">
                <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Tally Shortage Verification
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">Manifest Count:</span>{" "}
                    <span className="font-semibold">{incident.shortageDetails.expectedQuantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Received:</span>{" "}
                    <span className="font-semibold">{incident.shortageDetails.actualQuantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Missing Units:</span>{" "}
                    <span className="font-bold text-rose-600">{incident.shortageDetails.shortageQuantity}</span>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  <strong>Location of Discovery:</strong> {incident.shortageDetails.whereDiscovered}
                </div>
              </div>
            )}

            {incident.temperatureDetails && (
              <div className="border rounded-lg p-3 space-y-2 bg-rose-500/5 border-rose-500/20">
                <div className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4" />
                  Cold Chain Excursion Data
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">Required Range:</span>{" "}
                    <span className="font-semibold">{incident.temperatureDetails.expectedRange}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recorded Temp:</span>{" "}
                    <span className="font-bold text-rose-600">{incident.temperatureDetails.recordedTemperature}°C</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    <span className="font-semibold">{incident.temperatureDetails.durationHours} Hours</span>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  <strong>Logger Source:</strong> {incident.temperatureDetails.source}
                </div>
              </div>
            )}

            {incident.containerDamageDetails && (
              <div className="border rounded-lg p-3 space-y-2 bg-purple-500/5 border-purple-500/20">
                <div className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Ship className="h-4 w-4" />
                  Container Structural Damage
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">Container:</span>{" "}
                    <span className="font-semibold uppercase">{incident.containerDamageDetails.containerNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location on Box:</span>{" "}
                    <span className="font-semibold">{incident.containerDamageDetails.damageLocation}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Repair Estimate:</span>{" "}
                    <span className="font-bold text-purple-600">USD {incident.containerDamageDetails.repairEstimateUsd}</span>
                  </div>
                </div>
              </div>
            )}

            {incident.detentionDetails && (
              <div className="border rounded-lg p-3 space-y-2 bg-indigo-500/5 border-indigo-500/20">
                <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Detention Overstay & Force Majeure Scope
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-muted-foreground">Carrier:</span>{" "}
                    <span className="font-semibold">{incident.detentionDetails.carrierName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Charge Days:</span>{" "}
                    <span className="font-bold text-rose-600">{incident.detentionDetails.chargeDays} Days</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carrier Billed:</span>{" "}
                    <span className="font-semibold">USD {incident.detentionDetails.actualCarrierCharge}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Disputed:</span>{" "}
                    <span className="font-bold text-indigo-600">USD {incident.detentionDetails.disputedAmount}</span>
                  </div>
                </div>
                <div className="text-muted-foreground pt-1">
                  <strong>Dispute Ground:</strong> {incident.detentionDetails.disputeReason}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: EVIDENCE VAULT */}
          <TabsContent value="evidence" className="space-y-3 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Attached Operational Evidence Files</span>
              <span className="text-[10px] text-muted-foreground">Secure Evidence Vault</span>
            </div>

            {evidenceList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Camera className="h-8 w-8 mx-auto opacity-40 mb-2" />
                No physical evidence items attached to this incident yet.
              </div>
            ) : (
              <div className="space-y-2">
                {evidenceList.map((ev) => (
                  <div key={ev.id} className="border rounded-lg p-3 bg-background flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <Camera className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{ev.fileName}</span>
                          {ev.customerVisible ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                              Customer Visible
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                              Internal Only
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{ev.description}</p>
                        {ev.annotationNote && (
                          <div className="text-[10px] text-primary/80 mt-1 italic">
                            Note: {ev.annotationNote}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground shrink-0 pl-2">
                      <div>{ev.source}</div>
                      <div>{new Date(ev.capturedDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: LINKED COMMERCIAL CLAIMS */}
          <TabsContent value="claims" className="space-y-3 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Commercial Demands & Claims</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  onCreateClaim?.(incident)
                  onClose()
                }}
              >
                + Register New Claim
              </Button>
            </div>

            {linkedClaims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Scale className="h-8 w-8 mx-auto opacity-40 mb-2" />
                No commercial claims filed for this incident yet.
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => {
                      onCreateClaim?.(incident)
                      onClose()
                    }}
                  >
                    File Commercial Claim
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedClaims.map((clm) => (
                  <div key={clm.id} className="border rounded-lg p-3 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold flex items-center gap-1.5 text-primary">
                        <Scale className="h-4 w-4" />
                        {clm.claimNumber} ({clm.claimType})
                      </div>
                      <Badge variant="outline" className="font-semibold">
                        {clm.claimStatus}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Claimant:</span> {clm.claimant}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Demanded:</span>{" "}
                        <span className="font-bold">{clm.currency} {clm.claimAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Outstanding Exposure:</span>{" "}
                        <span className="font-bold text-rose-600">{clm.currency} {clm.outstandingExposure.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={copyWhatsAppNotice}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy WhatsApp Notice
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onPrintDamageReport?.(incident)}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print Damage Protocol
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => {
                onEdit?.(incident)
                onClose()
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit Incident
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
