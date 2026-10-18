"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  LocationRecord,
  LocationType,
  LocationSnapshot,
} from '@/lib/types/route-locations'
import { routeLocationService } from '@/lib/services/route-location-service'
import { LocationEditorDrawer } from '@/components/locations/location-editor-drawer'
import {
  Search,
  MapPin,
  Anchor,
  Truck,
  Plane,
  Building2,
  ChevronDown,
  X,
  Plus,
  Check,
} from 'lucide-react'

interface LocationSelectorProps {
  value?: string // locationId, code, or raw text
  onChange: (location: LocationRecord | null, snapshot: LocationSnapshot | null) => void
  allowedTypes?: LocationType[]
  placeholder?: string
  label?: string
  disabled?: boolean
  allowRawText?: boolean
  showQuickAdd?: boolean
  className?: string
}

export function LocationSelector({
  value,
  onChange,
  allowedTypes,
  placeholder = 'Search port, border, airport, or city...',
  label,
  disabled = false,
  allowRawText = true,
  showQuickAdd = true,
  className = '',
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load locations
  useEffect(() => {
    const list = routeLocationService.getLocations()
    setLocations(list)

    const handleUpdate = () => {
      setLocations(routeLocationService.getLocations())
    }
    window.addEventListener('skybol:locations-updated', handleUpdate)
    return () => window.removeEventListener('skybol:locations-updated', handleUpdate)
  }, [])

  // Sync internal selected location with value prop
  useEffect(() => {
    if (!value) {
      setSelectedLocation(null)
      return
    }

    // Attempt direct ID match
    let found = locations.find((l) => l.id === value)
    if (!found) {
      // Attempt alias/code/name resolution
      found = routeLocationService.resolveLocation(value) || undefined
    }

    if (found) {
      setSelectedLocation(found)
    } else {
      setSelectedLocation(null)
    }
  }, [value, locations])

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered locations
  const filteredLocations = useMemo(() => {
    let list = locations

    if (allowedTypes && allowedTypes.length > 0) {
      list = list.filter((l) => allowedTypes.includes(l.type))
    }

    if (!searchTerm.trim()) {
      return list.slice(0, 30)
    }

    const term = searchTerm.trim().toLowerCase()
    return list.filter((l) => {
      if (l.name.toLowerCase().includes(term)) return true
      if (l.nativeName && l.nativeName.toLowerCase().includes(term)) return true
      if (l.unlocode && l.unlocode.toLowerCase().includes(term)) return true
      if (l.iataCode && l.iataCode.toLowerCase().includes(term)) return true
      if (l.countryName.toLowerCase().includes(term)) return true
      if (l.provinceState && l.provinceState.toLowerCase().includes(term)) return true
      if (l.aliases && l.aliases.some((a) => a.toLowerCase().includes(term))) return true
      return false
    })
  }, [locations, allowedTypes, searchTerm])

  const handleSelect = (loc: LocationRecord) => {
    setSelectedLocation(loc)
    const snapshot = routeLocationService.buildLocationSnapshot(loc)
    onChange(loc, snapshot)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedLocation(null)
    onChange(null, null)
    setSearchTerm('')
  }

  const handleSelectRawText = () => {
    if (!searchTerm.trim()) return
    const customSnapshot: LocationSnapshot = {
      canonicalName: searchTerm.trim(),
      countryCode: 'XX',
      countryName: 'Custom Location',
      type: 'OTHER',
      timezone: 'Asia/Kabul',
      displayText: searchTerm.trim(),
      snapshotDate: new Date().toISOString(),
    }
    setSelectedLocation(null)
    onChange(null, customSnapshot)
    setIsOpen(false)
    setSearchTerm('')
  }

  const getTypeIcon = (type: LocationType) => {
    switch (type) {
      case 'SEAPORT':
      case 'PORT':
        return <Anchor className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      case 'BORDER':
        return <Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      case 'AIRPORT':
        return <Plane className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
      case 'CUSTOMS_POINT':
      case 'DEPOT':
        return <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
      default:
        return <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>}

      {/* Selector Trigger Input */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between min-h-[34px] px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors bg-white dark:bg-slate-900 ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-800 hover:border-blue-500'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
      >
        <div className="flex items-center gap-2 truncate mr-1">
          {selectedLocation ? (
            <>
              {getTypeIcon(selectedLocation.type)}
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {selectedLocation.name}
              </span>
              {selectedLocation.unlocode && (
                <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono text-[10px]">
                  {selectedLocation.unlocode}
                </span>
              )}
              {selectedLocation.iataCode && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-mono text-[10px]">
                  {selectedLocation.iataCode}
                </span>
              )}
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                ({selectedLocation.countryCode})
              </span>
            </>
          ) : value ? (
            <>
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200 truncate">{value}</span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(selectedLocation || value) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] max-w-[420px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-xs">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/70 dark:bg-slate-800/40">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type name, alias (e.g. JNPT), or UN/LOCODE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* List of matched locations */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredLocations.map((loc) => {
              const isSelected = selectedLocation?.id === loc.id
              return (
                <div
                  key={loc.id}
                  onClick={() => handleSelect(loc)}
                  className={`flex items-start justify-between p-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getTypeIcon(loc.type)}</div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{loc.name}</span>
                        {loc.unlocode && (
                          <span className="px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono text-[9px] font-bold">
                            {loc.unlocode}
                          </span>
                        )}
                        {loc.iataCode && (
                          <span className="px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-mono text-[9px] font-bold">
                            {loc.iataCode}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {loc.countryName} ({loc.countryCode})
                        </span>
                      </div>
                      {loc.nativeName && (
                        <div className="text-[10px] text-slate-400 font-medium">{loc.nativeName}</div>
                      )}
                      {loc.aliases && loc.aliases.length > 0 && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Aliases: {loc.aliases.slice(0, 3).join(', ')}
                          {loc.aliases.length > 3 ? ` +${loc.aliases.length - 3}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5" />}
                </div>
              )
            })}

            {filteredLocations.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">
                No matching locations found.
              </div>
            )}
          </div>

          {/* Quick Raw Selection & Quick Add Drawer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 flex items-center justify-between gap-2">
            {allowRawText && searchTerm.trim() && (
              <button
                type="button"
                onClick={handleSelectRawText}
                className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 truncate"
              >
                Use raw text: <span className="font-bold">"{searchTerm.trim()}"</span>
              </button>
            )}

            {showQuickAdd && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setShowEditor(true)
                }}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add New Location
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showEditor && (
        <LocationEditorDrawer
          open={showEditor}
          onClose={() => setShowEditor(false)}
          onSaved={(newLoc) => {
            handleSelect(newLoc)
          }}
          presetType={allowedTypes && allowedTypes.length === 1 ? allowedTypes[0] : undefined}
        />
      )}
    </div>
  )
}
