"use client"

import React, { useState, useMemo, useRef } from "react"
import {
  Search,
  Plus,
  Building2,
  Truck,
  Ship,
  User,
  Trash2,
  Edit2,
  Archive,
  AlertTriangle,
  ShieldCheck,
  Download,
  Upload,
  Merge,
  Filter,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Plane,
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { MasterEntity, MasterEntityType } from "@/lib/types/master-data"
import { findDuplicateClusters, DuplicateCluster } from "@/lib/master-data/duplicate-detector"
import {
  exportMasterEntitiesToCsv,
  parseMasterEntitiesFromCsv,
  downloadMasterEntitiesCsv,
} from "@/lib/master-data/export-import"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { EditMasterEntityDialog } from "./edit-master-entity-dialog"
import { MergeEntitiesDialog } from "./merge-entities-dialog"

const ENTITY_ICONS: Record<MasterEntityType, React.ElementType> = {
  SHIPPER: Building2,
  CONSIGNEE: Building2,
  NOTIFY_PARTY: User,
  AGENT: ShieldCheck,
  SHIPPING_LINE: Ship,
  AIRLINE: Plane,
  DRIVER: Truck,
  SUPPLIER: Building2,
  CUSTOMER: Building2,
  INSURANCE_COMPANY: ShieldCheck,
  SURVEYOR: Search,
  LEAD: Sparkles,
  PROSPECT: User,
  FORMER_CUSTOMER: Building2,
  PARTNER: ShieldCheck,
}

const ROLE_COLORS: Record<MasterEntityType, string> = {
  SHIPPER: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  CONSIGNEE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  NOTIFY_PARTY: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  AGENT: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  SHIPPING_LINE: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  AIRLINE: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  DRIVER: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  SUPPLIER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  CUSTOMER: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  INSURANCE_COMPANY: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  SURVEYOR: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  LEAD: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
  PROSPECT: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  FORMER_CUSTOMER: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  PARTNER: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
}

export function MasterDataView() {
  const { masterEntities, deleteMasterEntity, updateMasterEntity, importMasterEntities } = useApp()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<MasterEntityType | "ALL">("ALL")
  const [showArchived, setShowArchived] = useState(false)
  const [editEntity, setEditEntity] = useState<MasterEntity | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [activeClusterToMerge, setActiveClusterToMerge] = useState<DuplicateCluster | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Duplicate Clusters Detection
  const duplicateClusters = useMemo(() => {
    return findDuplicateClusters(masterEntities)
  }, [masterEntities])

  // Filtering
  const filtered = useMemo(() => {
    return masterEntities.filter(e => {
      if (!showArchived && e.isArchived) return false
      if (showArchived && !e.isArchived) return false

      const matchType = selectedType === "ALL" || e.type.includes(selectedType)
      const q = searchTerm.toLowerCase().trim()
      if (!q) return matchType

      const matchSearch =
        e.name.toLowerCase().includes(q) ||
        (e.alias && e.alias.toLowerCase().includes(q)) ||
        (e.taxId && e.taxId.toLowerCase().includes(q)) ||
        (e.phone && e.phone.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.contactPerson && e.contactPerson.toLowerCase().includes(q)) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.country && e.country.toLowerCase().includes(q)) ||
        (e.address && e.address.toLowerCase().includes(q))

      return matchType && matchSearch
    })
  }, [masterEntities, searchTerm, selectedType, showArchived])

  // Aggregate Counts
  const counts = useMemo(() => {
    const total = masterEntities.length
    const shippers = masterEntities.filter(e => e.type.includes("SHIPPER")).length
    const consignees = masterEntities.filter(e => e.type.includes("CONSIGNEE")).length
    const shippingLines = masterEntities.filter(e => e.type.includes("SHIPPING_LINE")).length
    const drivers = masterEntities.filter(e => e.type.includes("DRIVER")).length
    const duplicates = duplicateClusters.reduce((acc, c) => acc + c.duplicates.length, 0)

    return { total, shippers, consignees, shippingLines, drivers, duplicates }
  }, [masterEntities, duplicateClusters])

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? To keep records intact for previous BOLs, consider archiving instead.`)) {
      deleteMasterEntity(id)
      toast.success(`${name} deleted`)
    }
  }

  const handleToggleArchive = (entity: MasterEntity) => {
    const nextState = !entity.isArchived
    updateMasterEntity(entity.id, { isArchived: nextState })
    toast.success(nextState ? `Archived "${entity.name}"` : `Restored "${entity.name}"`)
  }

  const handleExportCsv = () => {
    downloadMasterEntitiesCsv(masterEntities, `sky-ariana-master-data-${new Date().toISOString().split("T")[0]}.csv`)
    toast.success(`Exported ${masterEntities.length} entities to CSV`)
  }

  const handleImportCsvClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseMasterEntitiesFromCsv(text)
        if (parsed.length === 0) {
          toast.error("No valid entity rows found in uploaded CSV file.")
          return
        }
        const importedCount = importMasterEntities(parsed)
        toast.success(`Successfully imported ${importedCount} master entities!`)
      } catch (err: any) {
        toast.error(`CSV parsing error: ${err.message}`)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-5">
      {/* Hidden CSV File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Client & Company Master Data Center
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Single canonical database for Shippers, Consignees, Notify Parties, Shipping Lines, Truckers, and Banking
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 font-bold text-xs dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImportCsvClick}
            className="h-9 gap-1.5 font-bold text-xs dark:border-slate-700"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Import CSV
          </Button>

          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            className="h-9 gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Master Entity
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Entities</span>
          <p className="text-xl font-black text-slate-900 dark:text-white">{counts.total}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Shippers</span>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300">{counts.shippers}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Consignees</span>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{counts.consignees}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">Shipping Lines</span>
          <p className="text-xl font-black text-cyan-700 dark:text-cyan-300">{counts.shippingLines}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">Truck Carriers</span>
          <p className="text-xl font-black text-orange-700 dark:text-orange-300">{counts.drivers}</p>
        </div>
        <div className={`p-3.5 rounded-xl border shadow-2xs ${
          counts.duplicates > 0
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
        }`}>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Duplicate Alerts</span>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{counts.duplicates}</p>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateClusters.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-300 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                {duplicateClusters.length} Potential Duplicate Cluster{duplicateClusters.length > 1 ? "s" : ""} Identified
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Found entities with matching Tax IDs, phones, or highly similar trading names. Reconcile records to maintain clean invoicing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setActiveClusterToMerge(duplicateClusters[0])}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
            >
              <Merge className="w-3.5 h-3.5" />
              Review & Merge ({duplicateClusters.length})
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by company name, alias, TRN/Tax ID, telephone, contact person, or address..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50/70 dark:bg-slate-950 border-none shadow-none text-xs sm:text-sm font-medium h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {(["ALL", "SHIPPER", "CONSIGNEE", "NOTIFY_PARTY", "SHIPPING_LINE", "DRIVER", "AGENT", "SUPPLIER"] as const).map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedType === t
                  ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              showArchived
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Archive className="w-3 h-3" />
            {showArchived ? "Showing Archived" : "Archived"}
          </button>
        </div>
      </div>

      {/* Grid of Entity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filtered.map(entity => {
          const hasBank = entity.bankDetails && entity.bankDetails.length > 0
          return (
            <Card
              key={entity.id}
              className="overflow-hidden border-slate-200/80 dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:shadow-md transition-all group relative flex flex-col justify-between"
            >
              <div className="p-4 space-y-3">
                {/* Header: Name + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white truncate" title={entity.name}>
                      {entity.name}
                    </h3>
                    {entity.alias && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                        "{entity.alias}"
                      </p>
                    )}
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      onClick={() => setEditEntity(entity)}
                      title="Edit Entity"
                      className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(entity)}
                      title={entity.isArchived ? "Restore Entity" : "Archive Entity"}
                      className="p-1 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entity.id, entity.name)}
                      title="Delete Entity"
                      className="p-1 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap gap-1">
                  {entity.type.map(t => {
                    const Icon = ENTITY_ICONS[t] || Building2
                    const colorClass = ROLE_COLORS[t] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    return (
                      <span
                        key={t}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${colorClass}`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {t.replace("_", " ")}
                      </span>
                    )
                  })}
                  {entity.isArchived && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      ARCHIVED
                    </span>
                  )}
                </div>

                {/* Details list */}
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  {entity.contactPerson && (
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{entity.contactPerson}</span>
                    </div>
                  )}
                  {entity.phone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono">{entity.phone}</span>
                    </div>
                  )}
                  {entity.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{entity.email}</span>
                    </div>
                  )}
                  {(entity.city || entity.country) && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{[entity.city, entity.country].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {entity.taxId && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[9px] font-black px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">TRN</span>
                      <span className="font-mono font-semibold">{entity.taxId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Bank Details & Metadata */}
              <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <div>
                  {hasBank ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CreditCard className="w-3 h-3" />
                      {entity.bankDetails!.length} bank acct{entity.bankDetails!.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-slate-400">No bank info</span>
                  )}
                </div>
                <div className="font-mono text-[9px] text-slate-400">
                  {entity.id.slice(0, 10)}
                </div>
              </div>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Master Entities Found</h3>
            <p className="text-xs max-w-sm mx-auto">
              No records match your active search or role filters. Adjust filters or add a new entity to the database.
            </p>
            <Button
              onClick={() => setIsAddOpen(true)}
              size="sm"
              className="mt-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Master Entity
            </Button>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      {(isAddOpen || editEntity) && (
        <EditMasterEntityDialog
          entity={editEntity}
          isOpen={true}
          onClose={() => {
            setIsAddOpen(false)
            setEditEntity(null)
          }}
        />
      )}

      {/* Merge Dialog */}
      {activeClusterToMerge && (
        <MergeEntitiesDialog
          cluster={activeClusterToMerge}
          isOpen={true}
          onClose={() => setActiveClusterToMerge(null)}
          onMerged={() => {
            // Find next cluster if any
            const remaining = findDuplicateClusters(masterEntities)
            setActiveClusterToMerge(remaining.length > 0 ? remaining[0] : null)
          }}
        />
      )}
    </div>
  )
}
