"use client"

import React from "react"
import { IncidentRecord } from "@/lib/types/incident-claims"
import { Button } from "@/components/ui/button"
import { Printer, Download } from "lucide-react"

interface CargoDamageReportPdfProps {
  incident: IncidentRecord
  onClose?: () => void
}

export function CargoDamageReportPdf({ incident, onClose }: CargoDamageReportPdfProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-background min-h-screen p-6 max-w-4xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none text-foreground">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">Cargo Damage & Shortage Inspection Report</h2>
          <p className="text-xs text-muted-foreground">Official Joint Inspection Protocol</p>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="h-4 w-4 mr-1.5" />
            Print Document
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="border border-foreground/20 p-8 rounded-lg print:border-none print:p-2 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-foreground/80 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-primary">SKY ARIANA LIMITED</h1>
            <p className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
              International Freight Forwarding & Logistics Management
            </p>
            <p className="text-[11px] text-muted-foreground">
              Kabul Cargo Complex | Islam Qala Border | Hairatan Dry Port | Bandar Abbas
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-primary/10 border border-primary/30 px-3 py-1.5 rounded text-xs font-bold font-mono">
              {incident.incidentNumber}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Date: {incident.incidentDate}
            </div>
            <div className="text-[11px] font-semibold text-foreground">
              BOL Ref: {incident.bolNumber || incident.shipmentRef}
            </div>
          </div>
        </div>

        {/* Title Banner (Bilingual) */}
        <div className="text-center py-2 bg-muted/30 border rounded">
          <h2 className="text-sm font-bold tracking-wide uppercase">
            Official Cargo Damage & Shortage Inspection Protocol
          </h2>
          <p className="text-xs font-serif text-muted-foreground" dir="rtl">
            د بار د زیان او کمښت د معاینې رسمي پروتوکول / صورت جلسه رسمی خسارت و کسر بار
          </p>
        </div>

        {/* Shipment & Transport Details */}
        <div className="grid grid-cols-2 gap-4 text-xs border p-4 rounded-md">
          <div className="space-y-1.5">
            <div><span className="text-muted-foreground">Customer / Consignee:</span> <strong>{incident.customerName}</strong></div>
            <div><span className="text-muted-foreground">Inspection Location:</span> <strong>{incident.locationName} ({incident.locationType})</strong></div>
            <div><span className="text-muted-foreground">Booking Reference:</span> <strong>{incident.bookingReference || "N/A"}</strong></div>
          </div>
          <div className="space-y-1.5">
            <div><span className="text-muted-foreground">Truck Plate / Trailer:</span> <strong>{incident.truckPlate || "N/A"}</strong></div>
            <div><span className="text-muted-foreground">Driver Name:</span> <strong>{incident.driverName || "N/A"}</strong></div>
            <div><span className="text-muted-foreground">Container Number:</span> <strong className="uppercase">{incident.containerNumber || "N/A"}</strong></div>
          </div>
        </div>

        {/* Factual Narrative */}
        <div className="border p-4 rounded-md space-y-2 text-xs">
          <div className="font-bold uppercase tracking-wide text-foreground">
            Objective Inspection Findings / حقایق لیدل شوي
          </div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {incident.description}
          </p>
        </div>

        {/* Affected Quantities & Measurements */}
        <div className="border rounded-md overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b text-[11px] font-bold">
                <th className="p-2.5">Category / Parameter</th>
                <th className="p-2.5">Manifested / Expected</th>
                <th className="p-2.5">Observed / Sound</th>
                <th className="p-2.5 text-rose-600">Affected / Damaged / Missing</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              <tr>
                <td className="p-2.5 font-medium">Packages / Units</td>
                <td className="p-2.5">{incident.damageDetails?.totalShipmentPackages || incident.shortageDetails?.expectedQuantity || "—"}</td>
                <td className="p-2.5">{incident.damageDetails?.unaffectedPackages || incident.shortageDetails?.actualQuantity || "—"}</td>
                <td className="p-2.5 font-bold text-rose-600">{incident.quantityAffected} Packages</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Cargo Weight (kg)</td>
                <td className="p-2.5">{incident.weightShortageDetails?.expectedNetKg || "—"}</td>
                <td className="p-2.5">{incident.weightShortageDetails?.actualNetKg || "—"}</td>
                <td className="p-2.5 font-bold text-rose-600">{incident.weightAffectedKg} kg</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Estimated Value Impact</td>
                <td className="p-2.5">—</td>
                <td className="p-2.5">—</td>
                <td className="p-2.5 font-bold text-rose-600">{incident.currency} {incident.estimatedValueAffected.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Specific Type Details */}
        {incident.damageDetails && (
          <div className="border p-3 rounded text-xs bg-muted/20 space-y-1">
            <span className="font-bold">Damage Observations:</span>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>Pattern: {incident.damageDetails.damageType}</div>
              <div>Inspection Timing: {incident.damageDetails.observedAt}</div>
              {incident.damageDetails.inspectionNotes && (
                <div className="col-span-2 italic">Notes: {incident.damageDetails.inspectionNotes}</div>
              )}
            </div>
          </div>
        )}

        {/* Signatures & Joint Endorsement Block */}
        <div className="pt-6 border-t space-y-4">
          <p className="text-[11px] text-muted-foreground italic">
            This document certifies joint physical inspection at the specified station. Signing acknowledges physical condition recorded and does not constitute final legal waiver of carrier or cargo owner rights.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-4 text-xs text-center">
            <div className="border-t pt-2 space-y-1">
              <div className="font-bold">Transporter / Driver</div>
              <div className="text-[11px] text-muted-foreground">امضاء موټرچلوونکی</div>
              <div className="h-10"></div>
              <div className="text-[10px] text-muted-foreground">Signature & Fingerprint</div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="font-bold">Receiving Supervisor</div>
              <div className="text-[11px] text-muted-foreground">تحویل اخیستونکی مسوول</div>
              <div className="h-10"></div>
              <div className="text-[10px] text-muted-foreground">Ahmad Wali (Warehouse)</div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="font-bold">Independent Surveyor / Customs</div>
              <div className="text-[11px] text-muted-foreground">رسمي مفتش یا ګمرک</div>
              <div className="h-10"></div>
              <div className="text-[10px] text-muted-foreground">Official Seal / Stamp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
