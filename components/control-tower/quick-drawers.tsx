"use client"

import React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Truck,
  Ship,
  MapPin,
  Clock,
  ExternalLink,
  DollarSign,
  Package,
  Calendar,
  ShieldCheck,
  X,
} from "lucide-react"
import type { LiveShipmentRow, ContainerRiskSummary } from "@/lib/control-tower/types"

interface BolDrawerProps {
  bolNumber: string | null
  shipment: LiveShipmentRow | null
  onClose: () => void
  onOpenBolEditor: (bolNumber: string) => void
  onOpenCompliance: (bolNumber: string) => void
  privacyMode: boolean
}

export function BolQuickDrawer({
  bolNumber,
  shipment,
  onClose,
  onOpenBolEditor,
  onOpenCompliance,
  privacyMode,
}: BolDrawerProps) {
  if (!bolNumber || !shipment) return null

  return (
    <Sheet open={Boolean(bolNumber)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto p-6">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              BOL INSPECTION
            </Badge>
            <Badge variant="secondary" className="font-bold">
              {shipment.statusLabel}
            </Badge>
          </div>
          <SheetTitle className="font-mono text-xl font-black mt-2 text-foreground">
            {shipment.bolNumber}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {shipment.origin} → {shipment.destination}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 text-xs">
          {/* Parties */}
          <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Shipper / Exporter</span>
              <span className="font-semibold text-foreground text-sm">{shipment.shipperName || "Direct Shipper"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Consignee / Importer</span>
              <span className="font-semibold text-foreground text-sm">{shipment.consigneeName || "Consignee"}</span>
            </div>
          </div>

          {/* Cargo Details */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background p-2.5 rounded-lg border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Commodity</span>
              <span className="font-semibold text-foreground truncate block">{shipment.commodity}</span>
            </div>
            <div className="bg-background p-2.5 rounded-lg border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Packages</span>
              <span className="font-semibold text-foreground">{shipment.packagesCount} Cartons</span>
            </div>
            <div className="bg-background p-2.5 rounded-lg border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Gross Weight</span>
              <span className="font-semibold text-foreground">{shipment.grossWeightKg.toLocaleString()} KG</span>
            </div>
            <div className="bg-background p-2.5 rounded-lg border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Current Location</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500" />
                {shipment.currentLocation}
              </span>
            </div>
          </div>

          {/* Equipment & Transit */}
          <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Truck Afghan Plate:</span>
              <span className="font-mono font-bold text-foreground">{shipment.truckPlate || "Pending"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span className="font-semibold text-foreground">{shipment.driverName || "Pending"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Driver Contact:</span>
              <span className="font-mono text-foreground">
                {privacyMode ? "•••••••" : (shipment.driverPhone || "—")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Container Number:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {shipment.containerNumber || "Unassigned"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seal Number:</span>
              <span className="font-mono text-foreground">{shipment.sealNumber || "Pending"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vessel / Voyage:</span>
              <span className="font-medium text-foreground">
                {shipment.vesselName ? `${shipment.vesselName} (${shipment.voyageNumber || "N/A"})` : "Pending"}
              </span>
            </div>
          </div>

          {/* Document Package Completeness */}
          <div className="bg-background p-3 rounded-xl border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground block">Document Compliance Package</span>
              <span className="text-[11px] text-muted-foreground">
                {shipment.hasMissingDocs ? "Missing required shipping documents" : "All package documents verified"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold gap-1 cursor-pointer"
              onClick={() => onOpenCompliance(shipment.bolNumber)}
            >
              <span>View Docs</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            Close
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer text-xs gap-1"
            onClick={() => onOpenBolEditor(shipment.bolNumber)}
          >
            <FileText className="w-3.5 h-3.5" />
            Open Full BOL Editor
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface ContainerDrawerProps {
  containerNumber: string | null
  containerRisk?: ContainerRiskSummary
  onClose: () => void
  onOpenBookingModule: (containerOrBooking: string) => void
}

export function ContainerQuickDrawer({
  containerNumber,
  containerRisk,
  onClose,
  onOpenBookingModule,
}: ContainerDrawerProps) {
  if (!containerNumber) return null

  return (
    <Sheet open={Boolean(containerNumber)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto p-6">
        <SheetHeader className="pb-4 border-b border-border">
          <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            CONTAINER LIFECYCLE
          </Badge>
          <SheetTitle className="font-mono text-xl font-black mt-2 text-foreground">
            {containerNumber}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Line: {containerRisk?.shippingLine || "Carrier"} | Booking: {containerRisk?.bookingNumber || "Unlinked"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 text-xs">
          {/* Risk Alert */}
          {containerRisk?.isOverdue ? (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                ⚠️ Container Free Days Expired!
              </span>
              <p className="text-[11px] leading-relaxed">
                Exceeded agreed tariff free days by {Math.abs(containerRisk.daysRemaining)} days. Current estimated detention exposure: <strong>${containerRisk.estimatedDetentionUSD.toLocaleString()} USD</strong>.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              <span className="font-bold text-xs flex items-center gap-1.5">
                ✓ Free Days Status: OK
              </span>
              <p className="text-[11px] mt-0.5">
                {containerRisk?.daysRemaining ?? 14} days remaining before demurrage/detention charges apply.
              </p>
            </div>
          )}

          {/* Details */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discharge Date:</span>
              <span className="font-semibold text-foreground">
                {containerRisk?.dischargeDate ? new Date(containerRisk.dischargeDate).toLocaleDateString() : "Pending"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Free Day:</span>
              <span className="font-semibold text-foreground">
                {containerRisk?.lastFreeDay ? new Date(containerRisk.lastFreeDay).toLocaleDateString() : "Pending"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Associated BOL:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {containerRisk?.bolNumber || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose} className="cursor-pointer text-xs">
            Close
          </Button>
          <Button
            size="sm"
            variant="default"
            className="cursor-pointer text-xs gap-1"
            onClick={() => onOpenBookingModule(containerNumber)}
          >
            Open Booking & Containers Module
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface CustomerDrawerProps {
  customerName: string | null
  shipments: LiveShipmentRow[]
  onClose: () => void
  onOpenLedger: (customerName: string) => void
  privacyMode: boolean
}

export function CustomerQuickDrawer({
  customerName,
  shipments,
  onClose,
  onOpenLedger,
  privacyMode,
}: CustomerDrawerProps) {
  if (!customerName) return null

  const activeCustomerShipments = shipments.filter(
    (s) =>
      s.shipperName.toLowerCase() === customerName.toLowerCase() ||
      s.consigneeName.toLowerCase() === customerName.toLowerCase()
  )

  return (
    <Sheet open={Boolean(customerName)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto p-6">
        <SheetHeader className="pb-4 border-b border-border">
          <Badge variant="outline" className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            CUSTOMER PROFILE
          </Badge>
          <SheetTitle className="text-xl font-black mt-2 text-foreground truncate">
            {customerName}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {activeCustomerShipments.length} active shipment(s) currently in pipeline
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 text-xs">
          <div className="bg-muted/40 p-3 rounded-xl border border-border">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="font-semibold text-foreground">Active Shipments</span>
              <Badge variant="secondary">{activeCustomerShipments.length}</Badge>
            </div>
            <div className="divide-y divide-border/40 max-h-48 overflow-y-auto pt-2 space-y-1">
              {activeCustomerShipments.map((s) => (
                <div key={s.id} className="py-1.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-foreground">{s.bolNumber}</span>
                    <span className="text-[10px] text-muted-foreground block">{s.commodity}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {s.statusLabel}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose} className="cursor-pointer text-xs">
            Close
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs gap-1"
            onClick={() => onOpenLedger(customerName)}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Open Customer Ledger Account
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
