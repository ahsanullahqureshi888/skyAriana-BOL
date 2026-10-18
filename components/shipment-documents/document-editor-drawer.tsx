"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  Save,
  FileEdit,
  AlertCircle,
  Lock,
  CheckCircle2,
  DollarSign,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  ShipmentDocumentRecord,
  InvoiceRateBasis,
} from "@/lib/types/shipment-document-package"
import { toast } from "sonner"

interface DocumentEditorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: ShipmentDocumentRecord | null
  onSaved: () => void
}

export function DocumentEditorDrawer({
  open,
  onOpenChange,
  document,
  onSaved,
}: DocumentEditorDrawerProps) {
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (document) {
      setFormData({ ...(document.documentData || {}) })
    }
  }, [document])

  if (!document) return null

  const isFinalized = document.status === "issued" || document.status === "approved"

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/shipment-documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentData: formData }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update document")

      toast.success(`${document.documentType.replace("_", " ").toUpperCase()} updated successfully!`)
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <FileEdit className="h-4 w-4" />
            </span>
            Edit Document: {document.documentNumber}
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {document.documentType.replace("_", " ").toUpperCase()}
            </span>
            <span className="text-xs text-slate-400">Master BOL: {document.bolNumber}</span>
          </div>
        </DialogHeader>

        {isFinalized && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              This document is <strong>{document.status.toUpperCase()}</strong>. Editing directly is restricted; save changes as a revision if required.
            </span>
          </div>
        )}

        <div className="mt-4 space-y-4 text-xs">
          {/* COMMERCIAL INVOICE SPECIFIC FIELDS */}
          {document.documentType === "commercial_invoice" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Invoice Number</label>
                  <Input
                    value={formData.invoiceNumber || ""}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Invoice Date</label>
                  <Input
                    type="date"
                    value={formData.invoiceDate || ""}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Incoterms</label>
                  <select
                    value={formData.incoterms || "CFR"}
                    onChange={(e) => setFormData({ ...formData, incoterms: e.target.value })}
                    className="h-8 mt-1 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900"
                  >
                    <option value="FOB">FOB (Free on Board)</option>
                    <option value="CFR">CFR (Cost and Freight)</option>
                    <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                    <option value="DAP">DAP (Delivered at Place)</option>
                    <option value="EXW">EXW (Ex Works)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Currency</label>
                  <Input
                    value={formData.currency || "USD"}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Total Goods Value ($)</label>
                  <Input
                    type="number"
                    value={formData.totalGoodsValue || ""}
                    onChange={(e) => setFormData({ ...formData, totalGoodsValue: parseFloat(e.target.value) || 0 })}
                    className="h-8 mt-1 text-xs font-bold text-amber-700 dark:text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Buyer Name & Address</label>
                <Input
                  value={formData.buyerName || ""}
                  onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                  placeholder="Buyer Name"
                  className="h-8 mt-1 text-xs font-semibold"
                />
                <textarea
                  value={formData.buyerAddress || ""}
                  onChange={(e) => setFormData({ ...formData, buyerAddress: e.target.value })}
                  placeholder="Buyer Address, Tax ID, FSSAI..."
                  rows={2}
                  className="mt-1.5 w-full rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </>
          )}

          {/* PACKING LIST SPECIFIC FIELDS */}
          {document.documentType === "packing_list" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Measurement / CBM</label>
                  <Input
                    value={formData.measurement || ""}
                    onChange={(e) => setFormData({ ...formData, measurement: e.target.value })}
                    placeholder="e.g. 42.5 CBM"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Package Dimensions</label>
                  <Input
                    value={formData.dimensions || ""}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="Standard Corrugated Cartons"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Truck Number</label>
                  <Input
                    value={formData.truckNumber || ""}
                    onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Driver Contact</label>
                  <Input
                    value={formData.driverContact || ""}
                    onChange={(e) => setFormData({ ...formData, driverContact: e.target.value })}
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* TRANSIT PAPER SPECIFIC FIELDS */}
          {document.documentType === "transit_paper" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Truck License Plate</label>
                  <Input
                    value={formData.truckNumber || ""}
                    onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                    className="h-8 mt-1 text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Driver Name</label>
                  <Input
                    value={formData.driverName || ""}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Driver Phone</label>
                  <Input
                    value={formData.driverContact || ""}
                    onChange={(e) => setFormData({ ...formData, driverContact: e.target.value })}
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Route Description</label>
                <Input
                  value={formData.routeDescription || ""}
                  onChange={(e) => setFormData({ ...formData, routeDescription: e.target.value })}
                  className="h-8 mt-1 text-xs"
                />
              </div>
            </>
          )}

          {/* PHYTOSANITARY SPECIFIC FIELDS */}
          {document.documentType === "phytosanitary" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Botanical Name</label>
                  <Input
                    value={formData.botanicalName || ""}
                    onChange={(e) => setFormData({ ...formData, botanicalName: e.target.value })}
                    placeholder="Vitis vinifera"
                    className="h-8 mt-1 text-xs italic"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Point of Entry</label>
                  <Input
                    value={formData.pointOfEntry || ""}
                    onChange={(e) => setFormData({ ...formData, pointOfEntry: e.target.value })}
                    placeholder="Nhava Sheva Port, India"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Official Certificate No</label>
                  <Input
                    value={formData.officialCertificateNumber || ""}
                    onChange={(e) => setFormData({ ...formData, officialCertificateNumber: e.target.value })}
                    placeholder="Pending Official Issue"
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Quarantine Authority</label>
                  <Input
                    value={formData.inspectingAuthority || ""}
                    onChange={(e) => setFormData({ ...formData, inspectingAuthority: e.target.value })}
                    placeholder="Ministry of Agriculture"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* STICKER LABELS SPECIFIC FIELDS */}
          {document.documentType === "stickers" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Lot Number</label>
                  <Input
                    value={formData.lotNumber || ""}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Net Wt / Carton</label>
                  <Input
                    value={formData.netWeightPerPackage || ""}
                    onChange={(e) => setFormData({ ...formData, netWeightPerPackage: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">FSSAI / License No</label>
                  <Input
                    value={formData.fssaiNumber || ""}
                    onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-semibold"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
