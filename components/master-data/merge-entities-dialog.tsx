"use client"

import React, { useState } from "react"
import { MasterEntity } from "@/lib/types/master-data"
import { DuplicateCluster } from "@/lib/master-data/duplicate-detector"
import { useApp } from "@/lib/app-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowRight, AlertTriangle, Building2, Merge } from "lucide-react"
import { toast } from "sonner"

interface MergeEntitiesDialogProps {
  cluster: DuplicateCluster | null
  isOpen: boolean
  onClose: () => void
  onMerged?: () => void
}

export function MergeEntitiesDialog({ cluster, isOpen, onClose, onMerged }: MergeEntitiesDialogProps) {
  const { mergeMasterEntities } = useApp()
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>("")

  if (!cluster) return null

  const allEntities = [cluster.primary, ...cluster.duplicates.map(d => d.entity)]
  const activePrimaryId = selectedPrimaryId || cluster.primary.id
  const activePrimary = allEntities.find(e => e.id === activePrimaryId) || cluster.primary
  const activeSecondaries = allEntities.filter(e => e.id !== activePrimaryId)

  const handleMergeAll = () => {
    try {
      for (const sec of activeSecondaries) {
        mergeMasterEntities(activePrimary.id, sec.id)
      }
      toast.success(`Successfully merged ${activeSecondaries.length} records into "${activePrimary.name}"`)
      onMerged?.()
      onClose()
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message || "Unknown error"}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Merge className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black dark:text-white">
                Reconcile & Merge Duplicate Entities
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the authoritative primary record. All roles, addresses, and bank accounts will be aggregated safely.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-4 text-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Duplicate Match Rationale:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              {cluster.duplicates.flatMap(d => d.matches).map((m, idx) => (
                <li key={idx}>
                  <span className="font-semibold uppercase tracking-wider text-[10px] px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 mr-1.5">
                    {m.confidence}
                  </span>
                  {m.reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Select Primary (Surviving) Record:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allEntities.map(ent => {
                const isSelected = ent.id === activePrimaryId
                return (
                  <div
                    key={ent.id}
                    onClick={() => setSelectedPrimaryId(ent.id)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-500 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-black text-sm text-slate-900 dark:text-white truncate pr-6">
                        {ent.name}
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                      )}
                    </div>

                    {ent.alias && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Alias: <span className="font-medium text-slate-700 dark:text-slate-300">"{ent.alias}"</span>
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {ent.type.map(t => (
                        <span key={t} className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-600 dark:text-slate-400">
                      {ent.taxId && <div><span className="text-slate-400">Tax ID:</span> <span className="font-mono">{ent.taxId}</span></div>}
                      {ent.phone && <div><span className="text-slate-400">Tel:</span> {ent.phone}</div>}
                      {ent.email && <div><span className="text-slate-400">Email:</span> {ent.email}</div>}
                      {ent.address && <div className="truncate"><span className="text-slate-400">Addr:</span> {ent.address}</div>}
                      {ent.bankDetails && ent.bankDetails.length > 0 && (
                        <div className="text-blue-600 dark:text-blue-400 font-semibold mt-1">
                          💳 {ent.bankDetails.length} bank account(s)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px]">
            <span className="font-bold text-slate-900 dark:text-white">Merge Outcome:</span> The surviving record will retain the primary name, tax ID, and address, while automatically incorporating all unique role tags, phone/email contact details, and bank accounts from the secondary record(s). The secondary record(s) will be retired without data loss.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="h-9">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleMergeAll}
            size="sm"
            className="gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Merge className="w-4 h-4" />
            Merge Into Selected Primary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
