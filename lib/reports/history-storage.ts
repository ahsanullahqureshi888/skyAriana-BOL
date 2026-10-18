/**
 * Sky Ariana Logistics — Report Center Presets & History Storage Engine
 * Strictly client-side preferences in localStorage. Never mutates database files.
 */

import { SavedFilterPreset, SavedReportPreset, ReportHistoryEntry } from "./types"

const FILTERS_STORAGE_KEY = "sky_report_saved_filters_v1"
const PRESETS_STORAGE_KEY = "sky_report_saved_presets_v1"
const HISTORY_STORAGE_KEY = "sky_report_history_v1"

const DEFAULT_FILTER_PRESETS: SavedFilterPreset[] = [
  {
    id: "preset-filter-1",
    name: "NAJEB AMIN → INDIA",
    criteria: { shipper: "Najeb Amin", destination: "Nhava Sheva" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-filter-2",
    name: "REEFER → NHAVA SHEVA",
    criteria: { containerType: "Reefer", destination: "Nhava Sheva" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-filter-3",
    name: "THIS MONTH",
    criteria: {
      dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-filter-4",
    name: "NO PDF ATTACHED",
    criteria: { hasPdf: "no" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-filter-5",
    name: "BANDAR ABBAS SHIPMENTS",
    criteria: { pod: "Bandar Abbas" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "preset-filter-6",
    name: "MERSIN SHIPMENTS",
    criteria: { pod: "Mersin" },
    createdAt: new Date().toISOString(),
  },
]

const DEFAULT_REPORT_PRESETS: SavedReportPreset[] = [
  {
    id: "rep-preset-1",
    name: "Current Month Operations Report",
    reportType: "overview",
    filters: {},
    groupBy: "None",
    orientation: "landscape",
    includeCharts: true,
    includeCover: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rep-preset-2",
    name: "Shipper Performance Analysis",
    reportType: "shippers",
    filters: {},
    groupBy: "Shipper",
    orientation: "portrait",
    includeCharts: true,
    includeCover: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rep-preset-3",
    name: "India Route Shipments Summary",
    reportType: "destinations",
    filters: { destination: "Nhava Sheva" },
    groupBy: "None",
    orientation: "landscape",
    includeCharts: false,
    includeCover: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rep-preset-4",
    name: "Reefer Container Fleet Overview",
    reportType: "containers",
    filters: { containerType: "Reefer" },
    groupBy: "None",
    orientation: "landscape",
    includeCharts: false,
    includeCover: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rep-preset-5",
    name: "Executive Management Summary",
    reportType: "overview",
    filters: {},
    groupBy: "None",
    orientation: "portrait",
    includeCharts: true,
    includeCover: true,
    createdAt: new Date().toISOString(),
  },
]

// ============================================
// SAVED FILTERS
// ============================================

export function getSavedFilterPresets(): SavedFilterPreset[] {
  if (typeof window === "undefined") return DEFAULT_FILTER_PRESETS
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(DEFAULT_FILTER_PRESETS))
      return DEFAULT_FILTER_PRESETS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_FILTER_PRESETS
  } catch {
    return DEFAULT_FILTER_PRESETS
  }
}

export function saveFilterPreset(preset: SavedFilterPreset): void {
  if (typeof window === "undefined") return
  try {
    const current = getSavedFilterPresets()
    const filtered = current.filter((p) => p.id !== preset.id && p.name !== preset.name)
    const updated = [preset, ...filtered]
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export function deleteFilterPreset(id: string): void {
  if (typeof window === "undefined") return
  try {
    const current = getSavedFilterPresets()
    const updated = current.filter((p) => p.id !== id)
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

// ============================================
// SAVED REPORT PRESETS
// ============================================

export function getSavedReportPresets(): SavedReportPreset[] {
  if (typeof window === "undefined") return DEFAULT_REPORT_PRESETS
  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(DEFAULT_REPORT_PRESETS))
      return DEFAULT_REPORT_PRESETS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_REPORT_PRESETS
  } catch {
    return DEFAULT_REPORT_PRESETS
  }
}

export function saveReportPreset(preset: SavedReportPreset): void {
  if (typeof window === "undefined") return
  try {
    const current = getSavedReportPresets()
    const filtered = current.filter((p) => p.id !== preset.id && p.name !== preset.name)
    const updated = [preset, ...filtered]
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export function deleteReportPreset(id: string): void {
  if (typeof window === "undefined") return
  try {
    const current = getSavedReportPresets()
    const updated = current.filter((p) => p.id !== id)
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

const DEFAULT_PRESET_ID_KEY = "sky_report_default_preset_id_v1"

export function getDefaultReportPreset(): SavedReportPreset | null {
  if (typeof window === "undefined") return null
  try {
    const defaultId = window.localStorage.getItem(DEFAULT_PRESET_ID_KEY)
    const presets = getSavedReportPresets()
    if (defaultId) {
      const found = presets.find((p) => p.id === defaultId)
      if (found) return found
    }
    const explicitlyMarked = presets.find((p) => p.isDefault)
    if (explicitlyMarked) return explicitlyMarked
    return null
  } catch {
    return null
  }
}

export function setDefaultReportPreset(id: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (!id) {
      window.localStorage.removeItem(DEFAULT_PRESET_ID_KEY)
      return
    }
    window.localStorage.setItem(DEFAULT_PRESET_ID_KEY, id)
    const presets = getSavedReportPresets().map((p) => ({
      ...p,
      isDefault: p.id === id,
    }))
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
  } catch {}
}

// ============================================
// REPORT EXPORT HISTORY
// ============================================

export function getReportHistory(): ReportHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addReportHistoryEntry(entry: ReportHistoryEntry): void {
  if (typeof window === "undefined") return
  try {
    const current = getReportHistory()
    // Retain newest 50 entries
    const updated = [entry, ...current].slice(0, 50)
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export function clearReportHistory(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch {}
}
