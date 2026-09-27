"use client"

import React, { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Check,
  Plus,
  Trash2,
  Download,
  Filter,
  ArrowRight,
  Globe2,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

export interface SavedPartyItem {
  id: string
  name: string
  address?: string
  contact?: string
  email?: string
  savedAt?: string
}

interface PartyDirectoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: "CONSIGNEE" | "SHIPPER" | "NOTIFY_PARTY"
  parties: SavedPartyItem[]
  selectedPartyId?: string
  onSelectParty: (party: SavedPartyItem) => void
  onSaveNewParty?: (party: SavedPartyItem) => void
  onDeleteParty?: (id: string) => void
}

const ALPHABET = [
  "ALL",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0-9"
]

export function PartyDirectoryModal({
  open,
  onOpenChange,
  role,
  parties,
  selectedPartyId,
  onSelectParty,
  onSaveNewParty,
  onDeleteParty,
}: PartyDirectoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLetter, setSelectedLetter] = useState("ALL")
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newContact, setNewContact] = useState("")
  const [newEmail, setNewEmail] = useState("")

  const roleLabels = {
    CONSIGNEE: {
      title: "Consignee Master Directory",
      faTitle: "دایرکتوری جامع گیرندگان کالا",
      badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accentColor: "emerald",
      btnColor: "bg-emerald-600 hover:bg-emerald-700",
      entityLabel: "Consignee",
    },
    SHIPPER: {
      title: "Shipper Master Directory",
      faTitle: "دایرکتوری جامع فرستندگان کالا",
      badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
      accentColor: "blue",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      entityLabel: "Shipper",
    },
    NOTIFY_PARTY: {
      title: "Notify Party Directory",
      faTitle: "دایرکتوری طرف اطلاع",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
      accentColor: "amber",
      btnColor: "bg-amber-600 hover:bg-amber-700",
      entityLabel: "Notify Party",
    },
  }[role]

  // Filtered & Sorted parties list
  const filteredParties = useMemo(() => {
    let list = [...parties]

    // Sort alphabetically by name
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""))

    // Filter by alphabet letter
    if (selectedLetter !== "ALL") {
      if (selectedLetter === "0-9") {
        list = list.filter((p) => /^[0-9]/.test(p.name.trim()))
      } else {
        list = list.filter((p) => p.name.trim().toUpperCase().startsWith(selectedLetter))
      }
    }

    // Filter by search query
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((p) =>
        [p.name, p.address, p.contact, p.email]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q))
      )
    }

    return list
  }, [parties, selectedLetter, searchQuery])

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Please enter a company name.")
      return
    }

    const created: SavedPartyItem = {
      id: `party-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: newName.trim(),
      address: newAddress.trim(),
      contact: newContact.trim(),
      email: newEmail.trim(),
      savedAt: new Date().toISOString(),
    }

    if (onSaveNewParty) {
      onSaveNewParty(created)
    }

    toast.success(`Added "${created.name}" to directory!`)
    setNewName("")
    setNewAddress("")
    setNewContact("")
    setNewEmail("")
    setIsAddingNew(false)
  }

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parties, null, 2))
    const dlAnchor = document.createElement("a")
    dlAnchor.setAttribute("href", dataStr)
    dlAnchor.setAttribute("download", `skybol-${role.toLowerCase()}-directory-${parties.length}.json`)
    dlAnchor.click()
    toast.success(`Exported ${parties.length} directory records to JSON.`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${roleLabels.badgeColor}`}>
                {roleLabels.entityLabel}
              </span>
              <Badge variant="secondary" className="font-mono text-xs font-black">
                {parties.length} Total Verified Records
              </Badge>
              <span className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                {roleLabels.faTitle}
              </span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>{roleLabels.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Browse, search, filter, and instantly apply full company name and address records into your current Bill of Lading.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="h-8.5 text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
              title="Download entire directory file as JSON"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className={`h-8.5 text-xs font-bold text-white shadow-2xs cursor-pointer transition-all ${
                isAddingNew ? "bg-slate-700 hover:bg-slate-800" : roleLabels.btnColor
              }`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {isAddingNew ? "Cancel" : "Add New"}
            </Button>
          </div>
        </div>

        {/* Add New Party Drawer / Form */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateParty}
            className="p-4 sm:p-5 bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-900/40 animate-in slide-in-from-top-3 duration-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" /> Register New {roleLabels.entityLabel} in Directory
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">Will be immediately saved and available for all BOLs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Company Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. YAAQOUB HAMDAN GENERAL TRADING LLC"
                  className="h-8.5 text-xs bg-white dark:bg-slate-900 font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Contact Person / Phone</label>
                <Input
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="e.g. +971 4 226 8890"
                  className="h-8.5 text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Physical Address</label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Al Ras, Deira, P.O.Box 88201, Dubai, United Arab Emirates"
                  className="h-8.5 text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. ops@yaaqoubtrading.ae"
                  className="h-8.5 text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-end justify-end">
                <Button type="submit" size="sm" className={`h-8.5 text-xs font-bold text-white ${roleLabels.btnColor}`}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Save to Master Directory
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Search & Alphabet Filter Toolbar */}
        <div className="p-4 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search all ${parties.length} directory records (by name, country, city, address, phone)...`}
              className="pl-9 pr-9 h-10 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Alphabet quick jump row */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> A-Z:
            </span>
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(letter)}
                className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer shrink-0 text-xs ${
                  selectedLetter === letter
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs scale-105"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredParties.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <div className="text-sm font-bold">No {roleLabels.entityLabel.toLowerCase()}s found</div>
              <p className="text-xs max-w-sm mx-auto">
                No records match "{searchQuery}" {selectedLetter !== "ALL" ? `starting with ${selectedLetter}` : ""}.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedLetter("ALL")
                }}
                className="text-xs font-bold mt-2"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredParties.map((party) => {
                const isSelected = selectedPartyId === party.id
                return (
                  <div
                    key={party.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white dark:bg-slate-850 hover:bg-slate-50/80 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-800 shadow-2xs"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                          {party.name}
                        </div>
                        {isSelected && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>

                      {party.address && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{party.address}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {party.contact && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{party.contact}</span>
                          </div>
                        )}
                        {party.email && (
                          <div className="flex items-center gap-1 truncate max-w-[200px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{party.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {party.id.startsWith("local-") ? "System Seed" : "Saved Record"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {onDeleteParty && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete "${party.name}" from saved directory?`)) {
                                onDeleteParty(party.id)
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Delete party from directory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onSelectParty(party)
                            onOpenChange(false)
                          }}
                          className={`h-7.5 px-3 text-xs font-bold text-white shadow-2xs cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSelected ? "Selected" : "Apply to BOL"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Showing {filteredParties.length} of {parties.length} records
            </span>
            {searchQuery && (
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Filtered by: "{searchQuery}"
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
