"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  FileText,
  Package,
  Truck,
  Ship,
  Plane,
  Thermometer,
  ShieldAlert,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import {
  IncidentRecord,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  ReportedBySource,
} from "@/lib/types/incident-claims"
import { IncidentClaimsStore } from "@/lib/services/incident-claims-service"

interface IncidentModalProps {
  isOpen: boolean
  onClose: () => void
  incident?: IncidentRecord | null
  onSaved?: (incident: IncidentRecord) => void
}

export function IncidentModal({ isOpen, onClose, incident, onSaved }: IncidentModalProps) {
  const store = IncidentClaimsStore.getInstance()

  const [formData, setFormData] = useState<Partial<IncidentRecord>>({
    incidentType: "WET_CARGO",
    severity: "MEDIUM",
    status: "OPEN",
    reportedBySource: "STAFF",
    currency: "USD",
    quantityAffected: 0,
    weightAffectedKg: 0,
    estimatedValueAffected: 0,
  })

  // Specific detail fields
  const [damageType, setDamageType] = useState("WET")
  const [packagesAffected, setPackagesAffected] = useState(0)
  const [totalShipmentPackages, setTotalShipmentPackages] = useState(0)
  const [damageObservedAt, setDamageObservedAt] = useState("")
  
  const [expectedQuantity, setExpectedQuantity] = useState(0)
  const [actualQuantity, setActualQuantity] = useState(0)
  const [shortageWhere, setShortageWhere] = useState("")

  const [containerNumber, setContainerNumber] = useState("")
  const [containerDamageLocation, setContainerDamageLocation] = useState("")
  const [containerRepairEstimate, setContainerRepairEstimate] = useState(0)

  const [tempExpectedRange, setTempExpectedRange] = useState("+2°C to +8°C")
  const [tempRecorded, setTempRecorded] = useState(0)
  const [tempDuration, setTempDuration] = useState(0)

  useEffect(() => {
    if (incident) {
      setFormData({ ...incident })
      if (incident.damageDetails) {
        setDamageType(incident.damageDetails.damageType)
        setPackagesAffected(incident.damageDetails.packagesAffected)
        setTotalShipmentPackages(incident.damageDetails.totalShipmentPackages)
        setDamageObservedAt(incident.damageDetails.observedAt)
      }
      if (incident.shortageDetails) {
        setExpectedQuantity(incident.shortageDetails.expectedQuantity)
        setActualQuantity(incident.shortageDetails.actualQuantity)
        setShortageWhere(incident.shortageDetails.whereDiscovered)
      }
      if (incident.containerDamageDetails) {
        setContainerNumber(incident.containerDamageDetails.containerNumber)
        setContainerDamageLocation(incident.containerDamageDetails.damageLocation)
        setContainerRepairEstimate(incident.containerDamageDetails.repairEstimateUsd || 0)
      }
      if (incident.temperatureDetails) {
        setTempExpectedRange(incident.temperatureDetails.expectedRange)
        setTempRecorded(incident.temperatureDetails.recordedTemperature)
        setTempDuration(incident.temperatureDetails.durationHours || 0)
      }
    } else {
      setFormData({
        incidentType: "WET_CARGO",
        incidentDate: new Date().toISOString().split("T")[0],
        severity: "MEDIUM",
        status: "OPEN",
        reportedBySource: "STAFF",
        reportedByName: "Operations Desk",
        assignedTo: "Karim Dad (Claims Desk)",
        currency: "USD",
        locationType: "WAREHOUSE",
        locationName: "Kabul Cargo Complex",
        quantityAffected: 0,
        weightAffectedKg: 0,
        estimatedValueAffected: 0,
        description: "",
      })
      setDamageType("WET")
      setPackagesAffected(0)
      setTotalShipmentPackages(0)
      setDamageObservedAt("")
      setExpectedQuantity(0)
      setActualQuantity(0)
      setShortageWhere("")
      setContainerNumber("")
      setContainerDamageLocation("")
      setContainerRepairEstimate(0)
      setTempExpectedRange("+2°C to +8°C")
      setTempRecorded(0)
      setTempDuration(0)
    }
  }, [incident, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description || formData.description.trim().length < 10) {
      toast.error("Please provide an objective, factual description of at least 10 characters.")
      return
    }

    if (!formData.customerName || formData.customerName.trim().length === 0) {
      toast.error("Please specify customer name or shipper/consignee.")
      return
    }

    const payload: Partial<IncidentRecord> = {
      ...formData,
    }

    // Attach specific typed details based on incident category
    if (
      formData.incidentType === "CARGO_DAMAGE" ||
      formData.incidentType === "WET_CARGO" ||
      formData.incidentType === "PACKAGING_DAMAGE"
    ) {
      payload.damageDetails = {
        damageType: (damageType as any) || "WET",
        packagesAffected: Number(packagesAffected) || Number(formData.quantityAffected) || 0,
        totalShipmentPackages: Number(totalShipmentPackages) || 0,
        unaffectedPackages: Math.max(0, (Number(totalShipmentPackages) || 0) - (Number(packagesAffected) || 0)),
        description: formData.description || "",
        observedAt: damageObservedAt || `${formData.incidentDate} during unloading`,
      }
    } else if (formData.incidentType === "CARGO_SHORTAGE" || formData.incidentType === "CARGO_LOSS") {
      const exp = Number(expectedQuantity) || 0
      const act = Number(actualQuantity) || 0
      payload.shortageDetails = {
        expectedQuantity: exp,
        actualQuantity: act,
        shortageQuantity: Math.max(0, exp - act),
        packageType: "Cartons / Units",
        whereDiscovered: shortageWhere || formData.locationName || "Tally check",
      }
    } else if (formData.incidentType === "CONTAINER_DAMAGE") {
      payload.containerDamageDetails = {
        containerNumber: containerNumber || formData.containerNumber || "UNSPECIFIED",
        damageLocation: containerDamageLocation || "Body / Door / Floor",
        damageType: "STRUCTURAL_DAMAGE",
        repairEstimateUsd: Number(containerRepairEstimate) || 0,
      }
    } else if (formData.incidentType === "TEMPERATURE_EXCEPTION") {
      payload.temperatureDetails = {
        expectedRange: tempExpectedRange,
        recordedTemperature: Number(tempRecorded),
        unit: "°C",
        source: "Data Logger / Sensor",
        recordedAt: `${formData.incidentDate} Transit Period`,
        durationHours: Number(tempDuration),
        affectedCargo: "Cold-chain perishable cargo",
      }
    }

    try {
      const saved = store.saveIncident(payload)
      toast.success(incident ? "Incident updated successfully." : `Incident ${saved.incidentNumber} created.`)
      onSaved?.(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save incident.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>
              {incident ? `Edit Incident: ${incident.incidentNumber}` : "Log Operational Incident"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict blameless standard: Record factual operational occurrences without assigning legal blame or altering inventory balances.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Top Banner Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-start gap-2 text-amber-800 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Policy Enforcement:</span> Incident records do not create automatic legal liability, do not deduce warehouse stock balances, and do not directly charge customer ledgers.
            </div>
          </div>

          {/* Grid 1: Basic Classification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Incident Type *</Label>
              <select
                className="w-full mt-1 px-3 py-2 text-xs border rounded-md bg-background"
                value={formData.incidentType}
                onChange={(e) => setFormData({ ...formData, incidentType: e.target.value as IncidentType })}
              >
                <option value="WET_CARGO">Wet Cargo / Water Ingress</option>
                <option value="CARGO_DAMAGE">Cargo Physical Damage</option>
                <option value="CARGO_SHORTAGE">Cargo Shortage (Missing Units)</option>
                <option value="CARGO_EXCESS">Cargo Excess (Over-tally)</option>
                <option value="CARGO_LOSS">Total / Severe Cargo Loss</option>
                <option value="PACKAGING_DAMAGE">Packaging / Carton Tear</option>
                <option value="CONTAINER_DAMAGE">Container Equipment Damage</option>
                <option value="SEAL_ISSUE">Seal Broken / Tampered / Mismatch</option>
                <option value="TEMPERATURE_EXCEPTION">Temperature Excursion</option>
                <option value="TRUCK_BREAKDOWN">Truck Mechanical Breakdown</option>
                <option value="TRUCK_ACCIDENT">Road Traffic Accident</option>
                <option value="CUSTOMS_INCIDENT">Customs Hold / Border Delay</option>
                <option value="DETENTION">Carrier Detention Overstay</option>
                <option value="DEMURRAGE">Port Demurrage</option>
                <option value="OTHER">Other Operational Incident</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Severity Level *</Label>
              <select
                className="w-full mt-1 px-3 py-2 text-xs border rounded-md bg-background"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as IncidentSeverity })}
              >
                <option value="LOW">Low (Cosmetic / Minor Delay)</option>
                <option value="MEDIUM">Medium (Physical Disruption)</option>
                <option value="HIGH">High (Substantial Value / Delay)</option>
                <option value="CRITICAL">Critical (Total Loss / Regulatory Action)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Incident Date *</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={formData.incidentDate || ""}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Grid 2: Shipment & Customer Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Customer / Consignee *</Label>
              <Input
                placeholder="e.g. Ariana Saffron & Spices"
                className="text-xs mt-1"
                value={formData.customerName || ""}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Shipment Ref / BOL Number</Label>
              <Input
                placeholder="e.g. BOL-2026-0412"
                className="text-xs mt-1"
                value={formData.shipmentRef || ""}
                onChange={(e) => setFormData({ ...formData, shipmentRef: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Booking / Waybill Ref</Label>
              <Input
                placeholder="e.g. BK-KBL-892"
                className="text-xs mt-1"
                value={formData.bookingReference || ""}
                onChange={(e) => setFormData({ ...formData, bookingReference: e.target.value })}
              />
            </div>
          </div>

          {/* Grid 3: Operational Equipment / Location */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold">Location Type</Label>
              <select
                className="w-full mt-1 px-3 py-2 text-xs border rounded-md bg-background"
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
              >
                <option value="WAREHOUSE">Warehouse / Logistics Hub</option>
                <option value="BORDER_CROSSING">Border Crossing / Customs Station</option>
                <option value="PORT">Ocean Port / Inland Terminal</option>
                <option value="AIRPORT">Airport Cargo Terminal</option>
                <option value="HIGHWAY">En Route Highway</option>
                <option value="CUSTOMER_PREMISES">Customer Site / Delivery Point</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Location Name *</Label>
              <Input
                placeholder="e.g. Kabul Cargo Complex"
                className="text-xs mt-1"
                value={formData.locationName || ""}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Truck Plate / Vehicle</Label>
              <Input
                placeholder="e.g. KBL-48192"
                className="text-xs mt-1"
                value={formData.truckPlate || ""}
                onChange={(e) => setFormData({ ...formData, truckPlate: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Container Number</Label>
              <Input
                placeholder="e.g. TCLU7849201"
                className="text-xs mt-1 uppercase"
                value={formData.containerNumber || ""}
                onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Grid 4: Affected Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-3 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold">Qty Affected (Cartons/Units)</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1"
                value={formData.quantityAffected ?? 0}
                onChange={(e) => setFormData({ ...formData, quantityAffected: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Weight Affected (kg)</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1"
                value={formData.weightAffectedKg ?? 0}
                onChange={(e) => setFormData({ ...formData, weightAffectedKg: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Est. Cargo Value Affected</Label>
              <Input
                type="number"
                min="0"
                className="text-xs mt-1"
                value={formData.estimatedValueAffected ?? 0}
                onChange={(e) => setFormData({ ...formData, estimatedValueAffected: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Currency</Label>
              <select
                className="w-full mt-1 px-3 py-2 text-xs border rounded-md bg-background"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="AFN">AFN (؋)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Specific Section 1: Wet / Damage Details */}
          {(formData.incidentType === "WET_CARGO" ||
            formData.incidentType === "CARGO_DAMAGE" ||
            formData.incidentType === "PACKAGING_DAMAGE") && (
            <div className="border border-blue-500/20 bg-blue-500/5 p-3 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Package className="h-4 w-4" />
                Damage Scope & Inspection Protocol
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Damage Pattern</Label>
                  <select
                    className="w-full mt-1 px-3 py-1.5 text-xs border rounded-md bg-background"
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                  >
                    <option value="WET">Water Soaked / Moisture</option>
                    <option value="CRUSHED">Crushed / Compressed</option>
                    <option value="TORN">Torn Outer Packaging</option>
                    <option value="BROKEN">Broken / Fractured Item</option>
                    <option value="CONTAMINATED">Chemical / Odor Contamination</option>
                    <option value="MISSING_CONTENTS">Tampered / Missing Contents</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Damaged Packages</Label>
                  <Input
                    type="number"
                    className="text-xs mt-1"
                    value={packagesAffected}
                    onChange={(e) => setPackagesAffected(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Total Consignment Packages</Label>
                  <Input
                    type="number"
                    className="text-xs mt-1"
                    value={totalShipmentPackages}
                    onChange={(e) => setTotalShipmentPackages(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific Section 2: Shortage Details */}
          {(formData.incidentType === "CARGO_SHORTAGE" || formData.incidentType === "CARGO_LOSS") && (
            <div className="border border-amber-500/20 bg-amber-500/5 p-3 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <FileText className="h-4 w-4" />
                Tally Shortage Verification
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Manifest Expected Count</Label>
                  <Input
                    type="number"
                    className="text-xs mt-1"
                    value={expectedQuantity}
                    onChange={(e) => setExpectedQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Actual Counted Packages</Label>
                  <Input
                    type="number"
                    className="text-xs mt-1"
                    value={actualQuantity}
                    onChange={(e) => setActualQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Shortage Quantity (Difference)</Label>
                  <div className="mt-1 px-3 py-2 text-xs font-bold border rounded-md bg-muted text-rose-600">
                    {Math.max(0, expectedQuantity - actualQuantity)} Packages Missing
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specific Section 3: Container Damage */}
          {formData.incidentType === "CONTAINER_DAMAGE" && (
            <div className="border border-purple-500/20 bg-purple-500/5 p-3 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <Ship className="h-4 w-4" />
                Container Equipment Inspection
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Container Number</Label>
                  <Input
                    className="text-xs mt-1 uppercase"
                    placeholder="e.g. MSKU9812901"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label className="text-xs">Damage Location On Box</Label>
                  <Input
                    className="text-xs mt-1"
                    placeholder="e.g. Door Rod, Corner Casting, Roof Panel"
                    value={containerDamageLocation}
                    onChange={(e) => setContainerDamageLocation(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Repair Estimate (USD)</Label>
                  <Input
                    type="number"
                    className="text-xs mt-1"
                    value={containerRepairEstimate}
                    onChange={(e) => setContainerRepairEstimate(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific Section 4: Temperature Excursion */}
          {formData.incidentType === "TEMPERATURE_EXCEPTION" && (
            <div className="border border-rose-500/20 bg-rose-500/5 p-3 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <Thermometer className="h-4 w-4" />
                Cold Chain Thermal Excursion Record
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Required Temp Range</Label>
                  <Input
                    className="text-xs mt-1"
                    placeholder="+2°C to +8°C"
                    value={tempExpectedRange}
                    onChange={(e) => setTempExpectedRange(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Recorded Temperature (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="text-xs mt-1 text-rose-600 font-bold"
                    value={tempRecorded}
                    onChange={(e) => setTempRecorded(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Excursion Duration (Hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    className="text-xs mt-1"
                    value={tempDuration}
                    onChange={(e) => setTempDuration(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description (Factual Prompt) */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Objective Factual Description *</Label>
              <span className="text-[10px] text-muted-foreground">Describe only observed facts; avoid speculative fault</span>
            </div>
            <Textarea
              rows={3}
              placeholder="e.g. During container de-stuffing at Bay 3, 10 corrugated cartons were observed with fresh water soaking on the base. Tarpaulin was torn at rear latch. No blame is stated."
              className="text-xs mt-1"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Reporting Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Reported Source</Label>
              <select
                className="w-full mt-1 px-3 py-2 text-xs border rounded-md bg-background"
                value={formData.reportedBySource}
                onChange={(e) => setFormData({ ...formData, reportedBySource: e.target.value as ReportedBySource })}
              >
                <option value="STAFF">Operations Staff</option>
                <option value="WAREHOUSE">Warehouse Team</option>
                <option value="DRIVER">Truck Driver</option>
                <option value="CUSTOMS">Customs Official</option>
                <option value="CUSTOMER">Customer / Consignee</option>
                <option value="SHIPPING_LINE">Shipping Line / Port</option>
                <option value="AIRLINE">Airline Ground Handler</option>
                <option value="AGENT">Border Clearing Agent</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reported By Name</Label>
              <Input
                placeholder="e.g. Ahmad Wali (Supervisor)"
                className="text-xs mt-1"
                value={formData.reportedByName || ""}
                onChange={(e) => setFormData({ ...formData, reportedByName: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Assigned Claims Handler</Label>
              <Input
                placeholder="e.g. Karim Dad (Claims Lead)"
                className="text-xs mt-1"
                value={formData.assignedTo || ""}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              {incident ? "Save Changes" : "Log Incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
