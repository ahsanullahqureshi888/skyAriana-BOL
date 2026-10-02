"use client"

import React, { useState } from "react"
import { ReportFilterCriteria, SavedFilterPreset } from "@/lib/reports/types"
import { Button } from "@/components/ui/button"
import {
  X,
  Filter,
  RotateCcw,
  BookmarkPlus,
  Trash2,
  Check,
} from "lucide-react"
import { toast } from "sonner"

interface AdvancedFiltersProps {
  isOpen: boolean
  onClose: () => void
  criteria: ReportFilterCriteria
  onApply: (newCriteria: ReportFilterCriteria) => void
  savedPresets: SavedFilterPreset[]
  onSavePreset: (name: string, criteria: ReportFilterCriteria) => void
  onDeletePreset: (id: string) => void
}

export function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  criteria,
  onApply,
  savedPresets,
  onSavePreset,
  onDeletePreset,
}: AdvancedFiltersProps) {
  const [form, setForm] = useState<ReportFilterCriteria>({ ...criteria })
  const [presetNameInput, setPresetNameInput] = useState("")
  const [isSavingPreset, setIsSavingPreset] = useState(false)

  if (!isOpen) return null

  const handleChange = (key: keyof ReportFilterCriteria, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleClear = () => {
    const empty: ReportFilterCriteria = {
      searchQuery: form.searchQuery || "",
    }
    setForm(empty)
    onApply(empty)
    toast.info("All filters cleared")
  }

  const handleApply = () => {
    onApply(form)
    onClose()
  }

  const handleSaveCurrentPreset = () => {
    if (!presetNameInput.trim()) {
      toast.error("Please enter a name for the saved filter")
      return
    }
    onSavePreset(presetNameInput.trim(), form)
    setPresetNameInput("")
    setIsSavingPreset(false)
    toast.success(`Filter "${presetNameInput.trim()}" saved`)
  }

  const handleSelectPreset = (preset: SavedFilterPreset) => {
    setForm({ ...preset.criteria, searchQuery: form.searchQuery })
    onApply({ ...preset.criteria, searchQuery: form.searchQuery })
    toast.success(`Applied preset: ${preset.name}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Filter className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">
                Advanced Report Filters
              </h2>
              <p className="text-[11px] text-slate-400">
                Filter across parties, routes, cargo and equipment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Filters Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Saved Filter Presets
            </span>
            {!isSavingPreset ? (
              <button
                onClick={() => setIsSavingPreset(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save Current
              </button>
            ) : (
              <button
                onClick={() => setIsSavingPreset(false)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>

          {isSavingPreset && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-lg border border-blue-200">
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="E.g. Kandahar Raisins to Dubai"
                className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
              />
              <Button size="sm" onClick={handleSaveCurrentPreset} className="h-7 text-xs bg-blue-600 font-bold">
                Save
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 hover:border-blue-300 text-slate-700"
              >
                <button
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePreset(preset.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-0.5"
                  title="Delete preset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Filter Inputs */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
          {/* Date Range */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Issue Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">From</span>
                <input
                  type="date"
                  value={form.dateFrom || ""}
                  onChange={(e) => handleChange("dateFrom", e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">To</span>
                <input
                  type="date"
                  value={form.dateTo || ""}
                  onChange={(e) => handleChange("dateTo", e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Entities & Parties
            </span>

            <div>
              <span className="text-[10px] text-slate-400">Shipper Name</span>
              <input
                type="text"
                value={form.shipper || ""}
                onChange={(e) => handleChange("shipper", e.target.value)}
                placeholder="Search shipper..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Consignee Name</span>
              <input
                type="text"
                value={form.consignee || ""}
                onChange={(e) => handleChange("consignee", e.target.value)}
                placeholder="Search consignee..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Notify Party</span>
              <input
                type="text"
                value={form.notify || ""}
                onChange={(e) => handleChange("notify", e.target.value)}
                placeholder="Search notify party..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Commodity */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Commodity / Description
            </label>
            <input
              type="text"
              value={form.commodity || ""}
              onChange={(e) => handleChange("commodity", e.target.value)}
              placeholder="E.g. Raisins, Figs, Caraway Seeds"
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Ports & Destination */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Ports & Locations
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Port of Loading (POL)</span>
                <input
                  type="text"
                  value={form.pol || ""}
                  onChange={(e) => handleChange("pol", e.target.value)}
                  placeholder="E.g. Kandahar"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Port of Discharge (POD)</span>
                <input
                  type="text"
                  value={form.pod || ""}
                  onChange={(e) => handleChange("pod", e.target.value)}
                  placeholder="E.g. Nhava Sheva"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Final Destination</span>
              <input
                type="text"
                value={form.destination || ""}
                onChange={(e) => handleChange("destination", e.target.value)}
                placeholder="E.g. Mumbai, Dubai, Mersin"
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Container & Transport */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Equipment & Vehicle
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Container Type</span>
                <select
                  value={form.containerType || "all"}
                  onChange={(e) => handleChange("containerType", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Equipment</option>
                  <option value="Dry">Dry Containers</option>
                  <option value="Reefer">Reefer Containers</option>
                  <option value="20 FT">20 FT Standard</option>
                  <option value="40 FT">40 FT Standard</option>
                  <option value="40 HC">40 FT High Cube</option>
                  <option value="40 RF">40 FT Reefer</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Container Number</span>
                <input
                  type="text"
                  value={form.containerNumber || ""}
                  onChange={(e) => handleChange("containerNumber", e.target.value)}
                  placeholder="Container #"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Truck License Plate</span>
                <input
                  type="text"
                  value={form.truckNumber || ""}
                  onChange={(e) => handleChange("truckNumber", e.target.value)}
                  placeholder="E.g. 26253 کابل"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Invoice Number</span>
                <input
                  type="text"
                  value={form.invoiceNumber || ""}
                  onChange={(e) => handleChange("invoiceNumber", e.target.value)}
                  placeholder="INV #"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Currency & PDF */}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <div>
              <span className="text-[10px] text-slate-400">Currency</span>
              <select
                value={form.currency || "all"}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Currencies</option>
                <option value="USD">USD ($)</option>
                <option value="AFN">AFN (افغانی)</option>
                <option value="AED">AED (درهم)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Saved PDF Status</span>
              <select
                value={form.hasPdf || "all"}
                onChange={(e) => handleChange("hasPdf", e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Records</option>
                <option value="yes">Only With PDF</option>
                <option value="no">Only Without PDF</option>
              </select>
            </div>
          </div>

          {/* Transit Route */}
          <div className="border-t border-slate-100 pt-3">
            <span className="text-[10px] text-slate-400">Transit Route / Border Station</span>
            <input
              type="text"
              value={form.route || ""}
              onChange={(e) => handleChange("route", e.target.value)}
              placeholder="E.g. Islam Qala, Bandar Abbas, Nhava Sheva"
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Missing Data Audit Drill-down */}
          <div className="border-t border-slate-100 pt-3">
            <span className="text-[10px] text-slate-400">Data Completeness & Audit Flags</span>
            <select
              value={form.missingData || "all"}
              onChange={(e) => handleChange("missingData", e.target.value as any)}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Documents (No Audit Filter)</option>
              <option value="container">Missing Container Number</option>
              <option value="invoice">Missing Invoice Number</option>
              <option value="truck">Missing Truck Number</option>
              <option value="driver">Missing Driver Name</option>
              <option value="route">Missing Route Details</option>
              <option value="rate">Missing Rate per KG</option>
              <option value="pdf">Missing Saved PDF File</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 h-9 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Clear All
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-slate-600 h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
