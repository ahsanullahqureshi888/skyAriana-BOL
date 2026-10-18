"use client"

import React from "react"
import { Calendar, Filter, DollarSign, Building2, MapPin, RefreshCw, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ReportFilters, ReportDatePreset } from "@/lib/types/management-reporting"

interface FilterBarProps {
  filters: ReportFilters
  onFiltersChange: (newFilters: ReportFilters) => void
  onRefresh: () => void
  isLoading?: boolean
}

export function ManagementReportFilterBar({ filters, onFiltersChange, onRefresh, isLoading }: FilterBarProps) {
  const datePresets: { value: ReportDatePreset; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "last_week", label: "Last Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "this_quarter", label: "This Quarter" },
    { value: "this_year", label: "This Year" },
    { value: "last_year", label: "Last Year" },
    { value: "ytd", label: "Year-to-Date" },
    { value: "custom", label: "Custom Range" },
  ]

  const currencies = ["ALL", "USD", "AED", "AFN"]
  const branches = ["All", "Kandahar", "Dubai", "Bandar Abbas"]

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs mb-4 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Period:</span>
          </div>

          <Select
            value={filters.datePreset}
            onValueChange={(val: ReportDatePreset) => onFiltersChange({ ...filters, datePreset: val })}
          >
            <SelectTrigger className="h-8 w-36 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              <SelectValue placeholder="Preset" />
            </SelectTrigger>
            <SelectContent>
              {datePresets.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filters.datePreset === "custom" && (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                className="h-8 w-32 text-xs"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                className="h-8 w-32 text-xs"
              />
            </div>
          )}

          {/* Currency Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 ml-1">
            {currencies.map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onFiltersChange({ ...filters, currency: curr })}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  (filters.currency || "ALL") === curr
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Branch Picker */}
          <Select
            value={filters.branch || "All"}
            onValueChange={(val) => onFiltersChange({ ...filters, branch: val })}
          >
            <SelectTrigger className="h-8 w-32 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              <Building2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b} value={b} className="text-xs">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: Refresh & Actions */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(filters.includeDrafts)}
              onChange={(e) => onFiltersChange({ ...filters, includeDrafts: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Include Drafts</span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
            <span>Update</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
