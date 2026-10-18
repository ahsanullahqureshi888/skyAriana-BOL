"use client"

import React, { useState, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { LeadRecord } from "@/lib/types/crm-sales"
import { useApp } from "@/lib/app-context"
import { crmSalesStore } from "@/lib/services/crm-sales-service"
import { MasterEntity } from "@/lib/types/master-data"

interface LeadConvertDialogProps {
  isOpen: boolean
  onClose: () => void
  lead: LeadRecord
  onConverted?: (res: { lead: LeadRecord; opportunity: any }) => void
}

export function LeadConvertDialog({
  isOpen,
  onClose,
  lead,
  onConverted,
}: LeadConvertDialogProps) {
  const { masterEntities, addMasterEntity } = useApp()

  // Match detection
  const potentialMatches = useMemo(() => {
    return crmSalesStore.findDuplicateCompanies(
      {
        name: lead.companyName,
        phone: lead.phone,
        email: lead.email,
      },
      masterEntities || []
    )
  }, [lead, masterEntities])

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    potentialMatches.length > 0 ? potentialMatches[0].id : "NEW"
  )
  const [oppTitle, setOppTitle] = useState(
    `${lead.companyName} — ${lead.interestedService} Opportunity`
  )
  const [expectedRevenue, setExpectedRevenue] = useState(12000)
  const [currency, setCurrency] = useState("USD")

  const handleConvert = () => {
    try {
      let finalCompanyId = selectedCompanyId

      // If user chose to create a new Company Master
      if (selectedCompanyId === "NEW") {
        const newEntity: MasterEntity = {
          id: `entity-${Date.now()}`,
          name: lead.companyName,
          type: ["CUSTOMER", "LEAD"],
          phone: lead.phone,
          email: lead.email,
          contactPerson: lead.contactPerson,
          country: lead.country,
          city: lead.city,
          notes: `Created from lead ${lead.leadNumber}. ${lead.notes || ""}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        addMasterEntity(newEntity)
        finalCompanyId = newEntity.id
      }

      const result = crmSalesStore.convertLead(
        lead.id,
        finalCompanyId,
        oppTitle,
        Number(expectedRevenue) || 5000,
        currency
      )

      toast.success(`Lead ${lead.leadNumber} successfully converted to Opportunity ${result.opportunity.opportunityNumber}!`)
      onConverted?.(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to convert lead.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <DialogTitle>Convert Lead: {lead.leadNumber}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Strict Non-Duplication: Converts lead into canonical Company Master and generates an active Sales Opportunity.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Duplicate Detection Alert & Selector */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                Company Master Matching
              </span>
              {potentialMatches.length > 0 ? (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  {potentialMatches.length} Match(es) Found
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                  New Unique Company
                </Badge>
              )}
            </div>

            {potentialMatches.length > 0 ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Potential company match detected. Select an existing company or create a new entry:
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {potentialMatches.map((entity) => (
                    <label
                      key={entity.id}
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        selectedCompanyId === entity.id ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="companySelection"
                        checked={selectedCompanyId === entity.id}
                        onChange={() => setSelectedCompanyId(entity.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-foreground flex items-center justify-between">
                          <span>{entity.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{entity.id}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex gap-3 mt-0.5">
                          {entity.phone && <span>Phone: {entity.phone}</span>}
                          {entity.email && <span>Email: {entity.email}</span>}
                          <span>Roles: {entity.type.join(", ")}</span>
                        </div>
                      </div>
                    </label>
                  ))}

                  <label
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      selectedCompanyId === "NEW" ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="companySelection"
                      checked={selectedCompanyId === "NEW"}
                      onChange={() => setSelectedCompanyId("NEW")}
                    />
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Create Brand-New Company Master Record
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground bg-background p-2.5 rounded border">
                No matching legal entities found. A new canonical Company Master profile for <strong>{lead.companyName}</strong> will be registered with roles <Badge variant="secondary" className="text-[10px]">CUSTOMER</Badge> & <Badge variant="secondary" className="text-[10px]">LEAD</Badge>.
              </div>
            )}
          </div>

          {/* Linked Opportunity Settings */}
          <div className="border rounded-lg p-3 space-y-3 bg-background">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Generated Opportunity Parameters
            </div>

            <div>
              <Label className="text-xs font-semibold">Opportunity Title *</Label>
              <Input
                className="text-xs mt-1"
                value={oppTitle}
                onChange={(e) => setOppTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Expected Service Revenue *</Label>
                <Input
                  type="number"
                  min="0"
                  className="text-xs mt-1 font-bold"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(Number(e.target.value))}
                  required
                />
                <span className="text-[10px] text-muted-foreground">Sky Ariana freight revenue only (not goods value)</span>
              </div>
              <div>
                <Label className="text-xs font-semibold">Currency *</Label>
                <select
                  className="w-full mt-1 p-2 text-xs border rounded-md bg-background"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="AFN">AFN (؋)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleConvert}>
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
            Complete Lead Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
