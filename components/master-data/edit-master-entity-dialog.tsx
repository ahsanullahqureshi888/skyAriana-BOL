"use client"

import React, { useState, useEffect, useMemo } from "react"
import { MasterEntity, MasterEntityType, MasterEntityBankDetail } from "@/lib/types/master-data"
import { useApp } from "@/lib/app-context"
import { checkDuplicate, DuplicateMatch } from "@/lib/master-data/duplicate-detector"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, AlertTriangle, Building2, Landmark, Check, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

const ENTITY_TYPES: MasterEntityType[] = [
  "SHIPPER", "CONSIGNEE", "NOTIFY_PARTY", "AGENT", "SHIPPING_LINE", "AIRLINE", "DRIVER", "SUPPLIER", "CUSTOMER", "INSURANCE_COMPANY", "SURVEYOR", "LEAD", "PROSPECT", "FORMER_CUSTOMER", "PARTNER"
]

export function EditMasterEntityDialog({
  entity,
  isOpen,
  onClose
}: {
  entity: MasterEntity | null
  isOpen: boolean
  onClose: () => void
}) {
  const { addMasterEntity, updateMasterEntity, masterEntities } = useApp()

  const [name, setName] = useState("")
  const [alias, setAlias] = useState("")
  const [types, setTypes] = useState<MasterEntityType[]>([])
  const [taxId, setTaxId] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [bankDetails, setBankDetails] = useState<MasterEntityBankDetail[]>([])

  useEffect(() => {
    if (entity) {
      setName(entity.name || "")
      setAlias(entity.alias || "")
      setTypes(entity.type || ["SHIPPER"])
      setTaxId(entity.taxId || "")
      setEmail(entity.email || "")
      setPhone(entity.phone || "")
      setContactPerson(entity.contactPerson || "")
      setCountry(entity.country || "")
      setCity(entity.city || "")
      setAddress(entity.address || "")
      setNotes(entity.notes || "")
      setBankDetails(entity.bankDetails || [])
    } else {
      setName("")
      setAlias("")
      setTypes(["SHIPPER"])
      setTaxId("")
      setEmail("")
      setPhone("")
      setContactPerson("")
      setCountry("Afghanistan")
      setCity("")
      setAddress("")
      setNotes("")
      setBankDetails([])
    }
  }, [entity, isOpen])

  // Live duplicate detection
  const duplicateWarnings = useMemo(() => {
    if (!name.trim() && !taxId.trim() && !phone.trim()) return []
    return checkDuplicate(
      {
        name: name.trim(),
        alias: alias.trim() || undefined,
        taxId: taxId.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined
      },
      masterEntities,
      entity?.id
    )
  }, [name, alias, taxId, phone, email, masterEntities, entity?.id])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Entity Name is required.")
      return
    }
    if (types.length === 0) {
      toast.error("Please select at least one role/type (e.g. Shipper, Consignee).")
      return
    }

    const payload = {
      name: name.trim(),
      alias: alias.trim() || undefined,
      type: types,
      taxId: taxId.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      bankDetails: bankDetails.length > 0 ? bankDetails : undefined,
    }

    if (entity) {
      updateMasterEntity(entity.id, payload)
      toast.success(`Updated "${name}"`)
    } else {
      addMasterEntity(payload as any)
      toast.success(`Created "${name}" in Master Data`)
    }
    onClose()
  }

  const addBankDetail = () => {
    setBankDetails([
      ...bankDetails,
      { bankName: "", accountNo: "", swift: "", iban: "", currency: "USD" }
    ])
  }

  const updateBankDetail = (index: number, key: keyof MasterEntityBankDetail, value: string) => {
    const arr = [...bankDetails]
    arr[index] = { ...arr[index], [key]: value }
    setBankDetails(arr)
  }

  const removeBankDetail = (index: number) => {
    setBankDetails(bankDetails.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black dark:text-white">
                {entity ? `Edit Master Entity: ${entity.name}` : "Create Master Entity"}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative logistics party profile, cross-referenced across BOL, Invoices, and Ledgers.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Live Duplicate Warning Banner */}
        {duplicateWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Possible Duplicate Warning ({duplicateWarnings.length} match{duplicateWarnings.length > 1 ? 'es' : ''})
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {duplicateWarnings.map((w, idx) => (
                <li key={idx}>
                  <span className="font-bold">{w.existingEntityName}</span>: {w.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-5 py-2">
          {/* Roles Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Entity Roles <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {ENTITY_TYPES.map(t => {
                const checked = types.includes(t)
                return (
                  <label
                    key={t}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-all ${
                      checked
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (c) setTypes([...types, t])
                        else setTypes(types.filter(x => x !== t))
                      }}
                      className={checked ? "border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600" : ""}
                    />
                    <span>{t.replace("_", " ")}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Company / Legal Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. BAKHTAR LOGISTICS LLC"
                className="font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Alias / Commercial Trading Name
              </label>
              <Input
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="e.g. BAKHTAR TRADING"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tax ID / TRN / Licence No.
              </label>
              <Input
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                placeholder="e.g. 27-2509 or 100234567800003"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contact Person
              </label>
              <Input
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="e.g. Haji Ahmad Noori"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +93 700 123 456"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. info@bakhtar.com"
              />
            </div>
          </div>

          {/* Location & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Country
              </label>
              <Input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. Afghanistan, UAE, Turkey..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                City / Province
              </label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Kandahar, Kabul, Dubai..."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Registered / Official Address
              </label>
              <Textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Full street address, industrial park, warehouse number, P.O. Box..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Bank Details ({bankDetails.length})
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBankDetail}
                className="h-7 text-xs gap-1 font-bold dark:border-slate-700"
              >
                <Plus className="w-3 h-3" /> Add Bank
              </Button>
            </div>

            {bankDetails.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center border border-dashed border-slate-200 dark:border-slate-700">
                No bank accounts registered. Click "Add Bank" to record wire details.
              </p>
            ) : (
              <div className="space-y-2">
                {bankDetails.map((b, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-2 items-start"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                      <Input
                        value={b.bankName}
                        onChange={e => updateBankDetail(i, "bankName", e.target.value)}
                        placeholder="Bank Name (e.g. AIB, Ghazanfar Bank)"
                        className="h-8 text-xs font-medium"
                      />
                      <Input
                        value={b.accountNo}
                        onChange={e => updateBankDetail(i, "accountNo", e.target.value)}
                        placeholder="Account Number"
                        className="h-8 text-xs font-mono"
                      />
                      <Input
                        value={b.swift || ""}
                        onChange={e => updateBankDetail(i, "swift", e.target.value)}
                        placeholder="SWIFT / BIC"
                        className="h-8 text-xs font-mono"
                      />
                      <Input
                        value={b.iban || ""}
                        onChange={e => updateBankDetail(i, "iban", e.target.value)}
                        placeholder="IBAN"
                        className="h-8 text-xs font-mono sm:col-span-2"
                      />
                      <Input
                        value={b.currency || "USD"}
                        onChange={e => updateBankDetail(i, "currency", e.target.value)}
                        placeholder="Currency (USD, AED, AFN)"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBankDetail(i)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Operational Notes & Special Instructions
            </label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Requires surrendering original BL; customs broker contact in Islam Qala; payment terms 30 days..."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="h-9">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
          >
            <Check className="w-4 h-4" />
            {entity ? "Save Changes" : "Create Master Entity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
