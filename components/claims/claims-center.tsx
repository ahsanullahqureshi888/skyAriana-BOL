"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  AlertTriangle,
  Scale,
  Clock,
  ShieldCheck,
  Camera,
  DollarSign,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Upload,
  RefreshCw,
  Eye,
  ChevronRight,
  Package,
  Truck,
  Ship,
  Thermometer,
  FileCheck2,
  FileText,
  Copy,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderOpen,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

import {
  IncidentRecord,
  ClaimRecord,
  EvidenceRecord,
  InsurancePolicyRecord,
  InsuranceClaimRecord,
  ClaimsSummaryKpi,
  IncidentSeverity,
  IncidentStatus,
  ClaimStatus,
  ResponsibilityStatus,
} from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

// Modals
import { IncidentModal } from "./incident-modal"
import { ClaimModal } from "./claim-modal"
import { ResponsibilityModal } from "./responsibility-modal"
import { SettlementModal } from "./settlement-modal"
import { DetentionDisputeModal } from "./detention-dispute-modal"
import { IncidentDetailModal } from "./incident-detail-modal"
import { ClaimDetailModal } from "./claim-detail-modal"

// Documents
import { CargoDamageReportPdf } from "./documents/cargo-damage-report-pdf"
import { ClaimFileSummaryPdf } from "./documents/claim-file-summary-pdf"
import { CustomerClaimSummaryPdf } from "./documents/customer-claim-summary-pdf"

export function ClaimsCenter() {
  const store = IncidentClaimsStore.getInstance()

  // State
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([])
  const [policies, setPolicies] = useState<InsurancePolicyRecord[]>([])
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaimRecord[]>([])
  const [kpis, setKpis] = useState<ClaimsSummaryKpi>({
    openIncidents: 0,
    openClaims: 0,
    cargoDamageCount: 0,
    shortageClaimsCount: 0,
    containerDamageCount: 0,
    detentionDisputesCount: 0,
    insuranceClaimsCount: 0,
    awaitingDocumentsCount: 0,
    underReviewCount: 0,
    awaitingResponseCount: 0,
    totalFinancialExposureUsd: 0,
    settledThisMonthCount: 0,
  })

  // Navigation & Search
  const [activeTab, setActiveTab] = useState<
    "incidents" | "claims" | "detention" | "insurance" | "evidence" | "settlements"
  >("incidents")
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  // Modal Triggers
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
  const [editingIncident, setEditingIncident] = useState<IncidentRecord | null>(null)

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [editingClaim, setEditingClaim] = useState<ClaimRecord | null>(null)
  const [initialClaimIncident, setInitialClaimIncident] = useState<IncidentRecord | null>(null)

  const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false)
  const [assessingClaim, setAssessingClaim] = useState<ClaimRecord | null>(null)

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)
  const [settlingClaim, setSettlingClaim] = useState<ClaimRecord | null>(null)

  const [isDetentionModalOpen, setIsDetentionModalOpen] = useState(false)

  const [inspectingIncident, setInspectingIncident] = useState<IncidentRecord | null>(null)
  const [inspectingClaim, setInspectingClaim] = useState<ClaimRecord | null>(null)

  // Document Views
  const [printingDamageReportIncident, setPrintingDamageReportIncident] = useState<IncidentRecord | null>(null)
  const [printingClaimSummary, setPrintingClaimSummary] = useState<ClaimRecord | null>(null)
  const [printingCustomerClaim, setPrintingCustomerClaim] = useState<ClaimRecord | null>(null)

  const reloadData = () => {
    setIncidents(store.getIncidents())
    setClaims(store.getClaims())
    setPolicies(store.getInsurancePolicies())
    setInsuranceClaims(store.getInsuranceClaims())
    setKpis(store.getSummaryKpis())
  }

  useEffect(() => {
    reloadData()
  }, [])

  // Search & Filter Computation
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSearch =
        searchTerm === "" ||
        inc.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.bolNumber && inc.bolNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inc.containerNumber && inc.containerNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inc.truckPlate && inc.truckPlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        inc.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchSeverity = severityFilter === "ALL" || inc.severity === severityFilter
      const matchStatus = statusFilter === "ALL" || inc.status === statusFilter

      return matchSearch && matchSeverity && matchStatus
    })
  }, [incidents, searchTerm, severityFilter, statusFilter])

  const filteredClaims = useMemo(() => {
    return claims.filter((clm) => {
      const matchSearch =
        searchTerm === "" ||
        clm.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clm.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clm.claimant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clm.incidentNumber && clm.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        clm.claimBasisDescription.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === "ALL" || clm.claimStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [claims, searchTerm, statusFilter])

  const detentionIncidents = useMemo(() => {
    return incidents.filter((i) => i.detentionDetails !== undefined || i.incidentType === "DETENTION" || i.incidentType === "DEMURRAGE")
  }, [incidents])

  // JSON Export / Import
  const handleExportJson = () => {
    const jsonStr = store.exportStateJson()
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sky-ariana-claims-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Claims & Incidents backup exported successfully.")
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      const res = store.importStateJson(content)
      if (res.success) {
        reloadData()
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    }
    reader.readAsText(file)
  }

  // Active Print Render
  if (printingDamageReportIncident) {
    return (
      <CargoDamageReportPdf
        incident={printingDamageReportIncident}
        onClose={() => setPrintingDamageReportIncident(null)}
      />
    )
  }

  if (printingClaimSummary) {
    return (
      <ClaimFileSummaryPdf
        claim={printingClaimSummary}
        onClose={() => setPrintingClaimSummary(null)}
      />
    )
  }

  if (printingCustomerClaim) {
    return (
      <CustomerClaimSummaryPdf
        claim={printingCustomerClaim}
        onClose={() => setPrintingCustomerClaim(null)}
      />
    )
  }

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return <Badge variant="destructive">CRITICAL</Badge>
      case "HIGH":
        return <Badge className="bg-rose-500 text-white">HIGH</Badge>
      case "MEDIUM":
        return <Badge className="bg-amber-500 text-white">MEDIUM</Badge>
      default:
        return <Badge variant="secondary">LOW</Badge>
    }
  }

  const getClaimStatusBadge = (st: ClaimStatus) => {
    switch (st) {
      case "SETTLED":
        return <Badge className="bg-emerald-600 text-white font-semibold">SETTLED</Badge>
      case "ACCEPTED":
      case "PARTIALLY_ACCEPTED":
        return <Badge className="bg-teal-600 text-white font-semibold">{st}</Badge>
      case "UNDER_REVIEW":
      case "NEGOTIATION":
        return <Badge className="bg-indigo-600 text-white font-semibold">{st}</Badge>
      case "DOCUMENTS_PENDING":
        return <Badge className="bg-amber-600 text-white font-semibold">PENDING DOCS</Badge>
      case "REJECTED":
        return <Badge variant="destructive">REJECTED</Badge>
      default:
        return <Badge variant="secondary">{st}</Badge>
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto text-foreground">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Claims, Damage, Detention & Incident Management Center
              </h1>
              <p className="text-xs text-muted-foreground">
                Single operational source of truth for cargo exceptions, equipment damages, demurrage disputes, insurance recoveries, and blameless evidence auditing.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setEditingIncident(null)
              setIsIncidentModalOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1 text-amber-600" />
            Log Incident
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setEditingClaim(null)
              setInitialClaimIncident(null)
              setIsClaimModalOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1 text-indigo-600" />
            Commercial Claim
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setIsDetentionModalOpen(true)}
          >
            <Clock className="h-3.5 w-3.5 mr-1 text-purple-600" />
            Detention Dispute
          </Button>

          <Button size="sm" variant="ghost" className="text-xs" onClick={handleExportJson}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Backup
          </Button>

          <label className="cursor-pointer">
            <Button size="sm" variant="ghost" className="text-xs" asChild>
              <span>
                <Upload className="h-3.5 w-3.5 mr-1" />
                Restore
              </span>
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
          </label>
        </div>
      </div>

      {/* 2. Top Notice of Strict Blameless Boundaries */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs flex items-start gap-2.5 text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Operational Invariance Identity:</span> Incident records document observable facts only and never alter warehouse inventory directly. Commercial liability is never assigned automatically; responsibility defaults to <code className="text-xs font-mono">NOT_ASSESSED</code> until verified by an authorized human adjuster with cited evidence.
        </div>
      </div>

      {/* 3. Dashboard KPI Ribbon (12 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Open Incidents</span>
          <div className="text-xl font-bold mt-1 text-foreground flex items-center justify-between">
            {kpis.openIncidents}
            <AlertTriangle className="h-4 w-4 text-amber-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Open Claims</span>
          <div className="text-xl font-bold mt-1 text-foreground flex items-center justify-between">
            {kpis.openClaims}
            <Scale className="h-4 w-4 text-indigo-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Cargo Damage / Wet</span>
          <div className="text-xl font-bold mt-1 text-blue-600 flex items-center justify-between">
            {kpis.cargoDamageCount}
            <Package className="h-4 w-4 text-blue-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Shortage Claims</span>
          <div className="text-xl font-bold mt-1 text-amber-600 flex items-center justify-between">
            {kpis.shortageClaimsCount}
            <FileText className="h-4 w-4 text-amber-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Container Damage</span>
          <div className="text-xl font-bold mt-1 text-purple-600 flex items-center justify-between">
            {kpis.containerDamageCount}
            <Ship className="h-4 w-4 text-purple-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Detention Overstay</span>
          <div className="text-xl font-bold mt-1 text-rose-600 flex items-center justify-between">
            {kpis.detentionDisputesCount}
            <Clock className="h-4 w-4 text-rose-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Insurance Claims</span>
          <div className="text-xl font-bold mt-1 text-teal-600 flex items-center justify-between">
            {kpis.insuranceClaimsCount}
            <ShieldCheck className="h-4 w-4 text-teal-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Awaiting Docs</span>
          <div className="text-xl font-bold mt-1 text-amber-600 flex items-center justify-between">
            {kpis.awaitingDocumentsCount}
            <FileCheck2 className="h-4 w-4 text-amber-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Under Review</span>
          <div className="text-xl font-bold mt-1 text-indigo-600 flex items-center justify-between">
            {kpis.underReviewCount}
            <HelpCircle className="h-4 w-4 text-indigo-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Awaiting Response</span>
          <div className="text-xl font-bold mt-1 text-purple-600 flex items-center justify-between">
            {kpis.awaitingResponseCount}
            <RefreshCw className="h-4 w-4 text-purple-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border border-rose-500/30">
          <span className="text-[10px] text-rose-600 uppercase font-bold">Financial Exposure (USD)</span>
          <div className="text-base font-bold mt-1 text-rose-600 flex items-center justify-between">
            ${kpis.totalFinancialExposureUsd.toLocaleString()}
            <DollarSign className="h-4 w-4 text-rose-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-3 bg-card border border-emerald-500/30">
          <span className="text-[10px] text-emerald-600 uppercase font-bold">Settled This Month</span>
          <div className="text-xl font-bold mt-1 text-emerald-600 flex items-center justify-between">
            {kpis.settledThisMonthCount}
            <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-80" />
          </div>
        </Card>
      </div>

      {/* 4. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/20 p-3 rounded-lg border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Universal Search across incidents, claims, BOLs, container numbers, truck plates, customers..."
            className="pl-9 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            className="text-xs p-2 border rounded-md bg-background"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            className="text-xs p-2 border rounded-md bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="EVIDENCE_COLLECTION">Evidence Collection</option>
            <option value="ACTION_REQUIRED">Action Required</option>
            <option value="RESOLVED">Resolved</option>
            <option value="SETTLED">Settled</option>
            <option value="CLOSED">Closed</option>
          </select>

          {(searchTerm || severityFilter !== "ALL" || statusFilter !== "ALL") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setSearchTerm("")
                setSeverityFilter("ALL")
                setStatusFilter("ALL")
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 5. Main Operational Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-6 text-xs">
          <TabsTrigger value="incidents">Incidents Board ({filteredIncidents.length})</TabsTrigger>
          <TabsTrigger value="claims">Commercial Claims ({filteredClaims.length})</TabsTrigger>
          <TabsTrigger value="detention">Demurrage & Detention ({detentionIncidents.length})</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Desk ({insuranceClaims.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Vault</TabsTrigger>
          <TabsTrigger value="settlements">Financial Settlements</TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* TAB 1: OPERATIONAL INCIDENTS BOARD */}
        {/* ========================================================= */}
        <TabsContent value="incidents" className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto opacity-30 mb-2" />
              No operational incidents matching the selected criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="border rounded-lg p-4 bg-card hover:bg-muted/10 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-primary">{inc.incidentNumber}</span>
                      <Badge variant="outline" className="font-semibold text-xs">
                        {inc.incidentType.replace(/_/g, " ")}
                      </Badge>
                      {getSeverityBadge(inc.severity)}
                      <Badge variant="secondary" className="text-xs">
                        {inc.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setInspectingIncident(inc)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingIncident(inc)
                          setIsIncidentModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setInitialClaimIncident(inc)
                          setEditingClaim(null)
                          setIsClaimModalOpen(true)
                        }}
                      >
                        + File Claim
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setPrintingDamageReportIncident(inc)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Customer:</span>{" "}
                      <strong>{inc.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{" "}
                      <span>{inc.locationName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Shipment / BOL:</span>{" "}
                      <span className="font-mono">{inc.bolNumber || inc.shipmentRef}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Observed:</span>{" "}
                      <span>{inc.incidentDate}</span>
                    </div>
                  </div>

                  {/* Narrative excerpt */}
                  <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border leading-relaxed">
                    {inc.description}
                  </p>

                  {/* Metrics Footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <div className="flex gap-4">
                      <span>Affected Qty: <strong>{inc.quantityAffected} Units</strong></span>
                      <span>Weight: <strong>{inc.weightAffectedKg} kg</strong></span>
                      <span>Est. Value: <strong className="text-amber-600">{inc.currency} {inc.estimatedValueAffected.toLocaleString()}</strong></span>
                      <span>Evidence: <strong>{inc.evidenceStatus}</strong></span>
                    </div>
                    <div>
                      {inc.linkedClaimIds.length > 0 ? (
                        <span className="text-indigo-600 font-semibold">
                          Linked to {inc.linkedClaimIds.length} Claim File(s)
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">No commercial claim linked</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: COMMERCIAL CLAIMS PORTFOLIO */}
        {/* ========================================================= */}
        <TabsContent value="claims" className="space-y-3">
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              <Scale className="h-8 w-8 mx-auto opacity-30 mb-2" />
              No commercial claims matching the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map((clm) => (
                <div
                  key={clm.id}
                  className="border rounded-lg p-4 bg-card hover:bg-muted/10 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-600">{clm.claimNumber}</span>
                      <Badge variant="outline" className="font-semibold text-xs">
                        {clm.claimType.replace(/_/g, " ")}
                      </Badge>
                      {getClaimStatusBadge(clm.claimStatus)}
                      <Badge variant="outline" className="text-xs">
                        Resp: {clm.responsibilityStatus}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setInspectingClaim(clm)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Inspect File
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setAssessingClaim(clm)
                          setIsResponsibilityModalOpen(true)
                        }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        Assess Fault
                      </Button>
                      {clm.outstandingExposure > 0 && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => {
                            setSettlingClaim(clm)
                            setIsSettlementModalOpen(true)
                          }}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />
                          Settle
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setPrintingClaimSummary(clm)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Financial & Party Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border text-xs">
                    <div>
                      <span className="text-muted-foreground">Claimant:</span>{" "}
                      <strong>{clm.claimant}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Demanded:</span>{" "}
                      <strong className="text-foreground">{clm.currency} {clm.claimAmount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Settled Amount:</span>{" "}
                      <strong className="text-emerald-600">{clm.currency} {clm.settlementAmount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Outstanding Exposure:</span>{" "}
                      <strong className="text-rose-600">{clm.currency} {clm.outstandingExposure.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Grounds narrative */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {clm.claimBasisDescription}
                  </p>

                  {/* Footer Meta */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                    <div className="flex gap-4">
                      <span>Assigned: <strong>{clm.assignedTo}</strong></span>
                      <span>Target Date: <strong>{clm.responseDueDate || "Pending"}</strong></span>
                      <span>Checklist: <strong>{clm.checklist.filter((c) => c.isCompleted).length}/{clm.checklist.length} Complete</strong></span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-6 text-[11px] p-0 text-emerald-600"
                        onClick={() => {
                          const update = store.generateCustomerWhatsAppUpdate(clm.id)
                          navigator.clipboard.writeText(update)
                          toast.success("Sanitized WhatsApp update copied.")
                        }}
                      >
                        Copy WhatsApp Update
                      </Button>
                      <span>|</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-6 text-[11px] p-0 text-primary"
                        onClick={() => setPrintingCustomerClaim(clm)}
                      >
                        Customer Statement
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 3: DEMURRAGE & DETENTION CONTROL */}
        {/* ========================================================= */}
        <TabsContent value="detention" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Detention & Demurrage Container Audits</h3>
              <p className="text-xs text-muted-foreground">
                Audit carrier detention invoices against free days, sovereign border closures, and force majeure circulars.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
              onClick={() => setIsDetentionModalOpen(true)}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              New Dispute Calculation
            </Button>
          </div>

          <div className="space-y-3">
            {detentionIncidents.map((inc) => {
              const det = inc.detentionDetails
              return (
                <div key={inc.id} className="border rounded-lg p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-purple-600">
                        {det ? det.containerNumber : inc.containerNumber || "CONTAINER"}
                      </span>
                      <Badge variant="outline">{det ? det.carrierName : "Carrier"}</Badge>
                      <Badge className="bg-purple-600 text-white text-xs">
                        {det ? det.resolutionStatus : "OPEN"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setInspectingIncident(inc)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View Full Details
                    </Button>
                  </div>

                  {det && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs bg-muted/20 p-3 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground">Arrival Date:</span>{" "}
                        <div><strong>{det.arrivalDate}</strong></div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Free Day:</span>{" "}
                        <div><strong>{det.lastFreeDay}</strong> ({det.freeDays} Free d)</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actual Empty Return:</span>{" "}
                        <div><strong>{det.actualEmptyReturnDate}</strong></div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Charge Days:</span>{" "}
                        <div><strong className="text-rose-600">{det.chargeDays} Days</strong></div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Carrier Billed:</span>{" "}
                        <div><strong className="text-rose-600">USD {det.actualCarrierCharge.toLocaleString()}</strong></div>
                      </div>
                    </div>
                  )}

                  {det && (
                    <div className="border border-purple-500/20 bg-purple-500/5 p-2.5 rounded text-xs space-y-1">
                      <div className="font-semibold text-purple-800 dark:text-purple-300">
                        Contested Dispute Grounds:
                      </div>
                      <p className="text-muted-foreground">{det.disputeReason}</p>
                      <div className="text-right pt-1 font-bold text-purple-700 dark:text-purple-300">
                        Contested Waiver Claim: USD {det.disputedAmount.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 4: CARGO INSURANCE DESK */}
        {/* ========================================================= */}
        <TabsContent value="insurance" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Active Cargo Insurance Policies & Claims</h3>
              <p className="text-xs text-muted-foreground">
                Marine, transit, and cold-chain floating policies underwritten for Afghan transit corridors.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((pol) => (
              <div key={pol.id} className="border rounded-lg p-4 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-teal-600 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    {pol.policyNumber}
                  </div>
                  <Badge className="bg-teal-600 text-white text-xs">{pol.status}</Badge>
                </div>
                <div className="text-xs text-foreground font-semibold">{pol.insurerName}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                  <div>Coverage Limit: <strong>{pol.currency} {pol.coverageLimit.toLocaleString()}</strong></div>
                  <div>Deductible: <strong>{pol.currency} {pol.deductible.toLocaleString()}</strong></div>
                  <div>Period: <strong>{pol.coveragePeriod}</strong></div>
                  <div>Insured: <strong>{pol.insuredParty}</strong></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Filed Insurance Claims Under Adjustment
            </h4>
            <div className="space-y-2">
              {insuranceClaims.map((ic) => (
                <div key={ic.id} className="border rounded-lg p-3 bg-card flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>{ic.claimNumberFromInsurer}</span>
                      <Badge variant="outline">{ic.insurerName}</Badge>
                      <Badge className="bg-indigo-600 text-white text-[10px]">{ic.status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Policy: {ic.policyNumber} | Surveyor: {ic.surveyorName || "Pending Appointment"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-teal-600">{ic.currency} {ic.claimAmount.toLocaleString()}</div>
                    <div className="text-muted-foreground text-[10px]">Submitted: {ic.submittedDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 5: EVIDENCE VAULT */}
        {/* ========================================================= */}
        <TabsContent value="evidence" className="space-y-4">
          <div>
            <h3 className="text-sm font-bold">Central Operational Evidence Vault</h3>
            <p className="text-xs text-muted-foreground">
              Repository of photos, video records, tally sheets, calibration downloads, and government gazettes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {store.getIncidents().flatMap((inc) => store.getEvidenceByIncident(inc.id)).map((ev) => (
              <div key={ev.id} className="border rounded-lg p-3.5 bg-card space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    <span>{ev.fileName}</span>
                  </div>
                  {ev.customerVisible ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                      Customer Safe
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                      Internal Only
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-[11px]">{ev.description}</p>
                {ev.annotationNote && (
                  <div className="bg-muted/30 p-2 rounded text-[11px] italic text-primary/80 border">
                    Note: {ev.annotationNote}
                  </div>
                )}
                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t">
                  <span>Source: {ev.source}</span>
                  <span>Captured: {new Date(ev.capturedDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 6: FINANCIAL SETTLEMENTS */}
        {/* ========================================================= */}
        <TabsContent value="settlements" className="space-y-4">
          <div>
            <h3 className="text-sm font-bold">General Ledger Settlements & Payout Audit</h3>
            <p className="text-xs text-muted-foreground">
              Discharged claims with verified finance transaction vouchers, idempotency tokens, and multi-currency protection.
            </p>
          </div>

          {claims.flatMap((c) => c.settlements).length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto opacity-30 mb-2" />
              No commercial settlements recorded yet.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b text-[11px] font-bold">
                    <th className="p-3">Claim Ref</th>
                    <th className="p-3">Settlement Date</th>
                    <th className="p-3">Instrument</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Finance Ref</th>
                    <th className="p-3">Approved By</th>
                    <th className="p-3">Idempotency Token</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {claims.flatMap((c) =>
                    c.settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/10">
                        <td className="p-3 font-mono font-bold text-primary">{c.claimNumber}</td>
                        <td className="p-3">{s.settlementDate}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {s.settlementType}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-emerald-600">
                          {s.currency} {s.settlementAmount.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-[11px]">{s.financeTransactionRef}</td>
                        <td className="p-3">{s.approvedBy}</td>
                        <td className="p-3 font-mono text-[10px] text-muted-foreground">
                          {s.idempotencyKey.slice(0, 16)}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* 6. Modals Mounting */}
      {/* ========================================================= */}
      {isIncidentModalOpen && (
        <IncidentModal
          isOpen={isIncidentModalOpen}
          onClose={() => {
            setIsIncidentModalOpen(false)
            setEditingIncident(null)
          }}
          incident={editingIncident}
          onSaved={() => reloadData()}
        />
      )}

      {isClaimModalOpen && (
        <ClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => {
            setIsClaimModalOpen(false)
            setEditingClaim(null)
            setInitialClaimIncident(null)
          }}
          claim={editingClaim}
          initialIncident={initialClaimIncident}
          onSaved={() => reloadData()}
        />
      )}

      {isResponsibilityModalOpen && assessingClaim && (
        <ResponsibilityModal
          isOpen={isResponsibilityModalOpen}
          onClose={() => {
            setIsResponsibilityModalOpen(false)
            setAssessingClaim(null)
          }}
          claim={assessingClaim}
          onSaved={() => reloadData()}
        />
      )}

      {isSettlementModalOpen && settlingClaim && (
        <SettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => {
            setIsSettlementModalOpen(false)
            setSettlingClaim(null)
          }}
          claim={settlingClaim}
          onSaved={() => reloadData()}
        />
      )}

      {isDetentionModalOpen && (
        <DetentionDisputeModal
          isOpen={isDetentionModalOpen}
          onClose={() => setIsDetentionModalOpen(false)}
          onSaved={() => reloadData()}
        />
      )}

      {inspectingIncident && (
        <IncidentDetailModal
          isOpen={!!inspectingIncident}
          onClose={() => setInspectingIncident(null)}
          incident={inspectingIncident}
          onEdit={(inc) => {
            setEditingIncident(inc)
            setIsIncidentModalOpen(true)
          }}
          onCreateClaim={(inc) => {
            setInitialClaimIncident(inc)
            setEditingClaim(null)
            setIsClaimModalOpen(true)
          }}
          onPrintDamageReport={(inc) => setPrintingDamageReportIncident(inc)}
        />
      )}

      {inspectingClaim && (
        <ClaimDetailModal
          isOpen={!!inspectingClaim}
          onClose={() => setInspectingClaim(null)}
          claim={inspectingClaim}
          onEdit={(clm) => {
            setEditingClaim(clm)
            setIsClaimModalOpen(true)
          }}
          onAssessResponsibility={(clm) => {
            setAssessingClaim(clm)
            setIsResponsibilityModalOpen(true)
          }}
          onRecordSettlement={(clm) => {
            setSettlingClaim(clm)
            setIsSettlementModalOpen(true)
          }}
          onPrintSummary={(clm) => setPrintingClaimSummary(clm)}
        />
      )}
    </div>
  )
}
