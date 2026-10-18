"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  LocationRecord,
  LocationType,
  RouteMaster,
  LocationQualityAudit,
  LocationMigrationCandidate,
} from '@/lib/types/route-locations'
import { routeLocationService } from '@/lib/services/route-location-service'
import { locationMigrationAssistant } from '@/lib/services/location-migration-assistant'
import { LocationEditorDrawer } from '@/components/locations/location-editor-drawer'
import { RouteBuilderDrawer } from '@/components/locations/route-builder-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Anchor,
  Truck,
  Plane,
  Building2,
  Route,
  Search,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Compass,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  FileCheck2,
  Download,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

type TabType =
  | 'ALL'
  | 'SEAPORTS'
  | 'BORDERS'
  | 'AIRPORTS'
  | 'DEPOTS'
  | 'ROUTES'
  | 'MIGRATION'
  | 'QUALITY'

export function RouteLocationCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('ALL')
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [routes, setRoutes] = useState<RouteMaster[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [countryFilter, setCountryFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  // Modals & Drawers
  const [isLocEditorOpen, setIsLocEditorOpen] = useState(false)
  const [selectedLocForEdit, setSelectedLocForEdit] = useState<LocationRecord | null>(null)
  const [isRouteBuilderOpen, setIsRouteBuilderOpen] = useState(false)
  const [selectedRouteForEdit, setSelectedRouteForEdit] = useState<RouteMaster | null>(null)

  // Migration Assistant State
  const [migrationCandidates, setMigrationCandidates] = useState<LocationMigrationCandidate[]>([])
  const [migrationScannedDocs, setMigrationScannedDocs] = useState(0)
  const [isScanningMigration, setIsScanningMigration] = useState(false)

  // Quality Audit State
  const [qualityAudit, setQualityAudit] = useState<LocationQualityAudit | null>(null)

  const reloadData = () => {
    setLocations(routeLocationService.getLocations())
    setRoutes(routeLocationService.getRoutes())
    setQualityAudit(routeLocationService.runDataQualityAudit())
  }

  useEffect(() => {
    reloadData()

    const handleUpdate = () => {
      reloadData()
    }
    window.addEventListener('skybol:locations-updated', handleUpdate)
    return () => window.removeEventListener('skybol:locations-updated', handleUpdate)
  }, [])

  // Scan migration assistant
  const handleRunMigrationScan = () => {
    setIsScanningMigration(true)
    setTimeout(() => {
      const result = locationMigrationAssistant.scanExistingDocuments()
      setMigrationCandidates(result.uniqueCandidates)
      setMigrationScannedDocs(result.totalScannedDocs)
      setIsScanningMigration(false)
    }, 150)
  }

  // Location deletion
  const handleDeleteLocation = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete master location "${name}"?`)) {
      routeLocationService.deleteLocation(id)
      reloadData()
    }
  }

  // Route deletion
  const handleDeleteRoute = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete route "${name}"?`)) {
      routeLocationService.deleteRoute(id)
      reloadData()
    }
  }

  // Quick reverse route
  const handleQuickReverseRoute = (r: RouteMaster) => {
    if (confirm(`Generate reverse route for "${r.name}"?`)) {
      routeLocationService.generateReverseRoute(r)
      reloadData()
    }
  }

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    let list = locations

    // Tab-based type constraint
    if (activeTab === 'SEAPORTS') list = list.filter((l) => l.type === 'SEAPORT' || l.type === 'PORT')
    if (activeTab === 'BORDERS') list = list.filter((l) => l.type === 'BORDER')
    if (activeTab === 'AIRPORTS') list = list.filter((l) => l.type === 'AIRPORT' || l.type === 'RAIL_TERMINAL')
    if (activeTab === 'DEPOTS') list = list.filter((l) => l.type === 'CUSTOMS_POINT' || l.type === 'DEPOT' || l.type === 'WAREHOUSE')

    if (typeFilter !== 'ALL' && activeTab === 'ALL') {
      list = list.filter((l) => l.type === typeFilter)
    }

    if (countryFilter !== 'ALL') {
      list = list.filter((l) => l.countryCode === countryFilter)
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter((l) => {
        if (l.name.toLowerCase().includes(q)) return true
        if (l.nativeName && l.nativeName.toLowerCase().includes(q)) return true
        if (l.unlocode && l.unlocode.toLowerCase().includes(q)) return true
        if (l.iataCode && l.iataCode.toLowerCase().includes(q)) return true
        if (l.countryName.toLowerCase().includes(q)) return true
        if (l.provinceState && l.provinceState.toLowerCase().includes(q)) return true
        if (l.aliases && l.aliases.some((a) => a.toLowerCase().includes(q))) return true
        return false
      })
    }

    return list
  }, [locations, activeTab, typeFilter, countryFilter, searchTerm])

  // Filtered Routes
  const filteredRoutes = useMemo(() => {
    if (!searchTerm.trim()) return routes
    const q = searchTerm.trim().toLowerCase()
    return routes.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true
      if (r.code.toLowerCase().includes(q)) return true
      if (r.namePersian && r.namePersian.toLowerCase().includes(q)) return true
      return false
    })
  }, [routes, searchTerm])

  // KPI Calculations
  const seaportCount = useMemo(() => locations.filter((l) => l.type === 'SEAPORT' || l.type === 'PORT').length, [locations])
  const borderCount = useMemo(() => locations.filter((l) => l.type === 'BORDER').length, [locations])
  const airportCount = useMemo(() => locations.filter((l) => l.type === 'AIRPORT').length, [locations])
  const routeCount = useMemo(() => routes.length, [routes])
  const auditWarnings = useMemo(
    () => (qualityAudit?.missingTimezone || 0) + (qualityAudit?.missingUnlocode || 0) + (qualityAudit?.duplicateCandidates.length || 0),
    [qualityAudit]
  )

  const getTypeIcon = (type: LocationType) => {
    switch (type) {
      case 'SEAPORT':
      case 'PORT':
        return <Anchor className="h-4 w-4 text-blue-600" />
      case 'BORDER':
        return <Truck className="h-4 w-4 text-amber-600" />
      case 'AIRPORT':
        return <Plane className="h-4 w-4 text-indigo-600" />
      case 'CUSTOMS_POINT':
      case 'DEPOT':
        return <Building2 className="h-4 w-4 text-purple-600" />
      default:
        return <MapPin className="h-4 w-4 text-emerald-600" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 text-slate-900 dark:text-slate-100 space-y-6 max-w-[1850px] mx-auto">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & KPI CARDS                                             */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Route, Location, Border, Port & Airport Master Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Verified single source of truth for geographical points, multi-modal transit corridors, and route leg templates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectedRouteForEdit(null)
              setIsRouteBuilderOpen(true)
            }}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Route className="h-3.5 w-3.5 mr-1" />
            + New Route
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedLocForEdit(null)
              setIsLocEditorOpen(true)
            }}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            + New Location
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Total Locations</span>
            <MapPin className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black mt-1 text-slate-900 dark:text-slate-100">
            {locations.length}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Seaports</span>
            <Anchor className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-black mt-1 text-blue-600">
            {seaportCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Borders (2-Sided)</span>
            <Truck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black mt-1 text-amber-600">
            {borderCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Cargo Airports</span>
            <Plane className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black mt-1 text-indigo-600">
            {airportCount}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Active Routes</span>
            <Route className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-black mt-1 text-purple-600">
            {routeCount}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('QUALITY')}
          className={`p-3 bg-white dark:bg-slate-900 border rounded-lg shadow-xs cursor-pointer transition-colors ${
            auditWarnings > 0
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase">Data Quality</span>
            <ShieldAlert className={`h-4 w-4 ${auditWarnings > 0 ? 'text-amber-600' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-xl font-black mt-1 ${auditWarnings > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {auditWarnings === 0 ? 'Verified 100%' : `${auditWarnings} Alerts`}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. NAVIGATION TABS                                                    */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          All Locations ({locations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SEAPORTS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'SEAPORTS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Seaports ({seaportCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BORDERS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'BORDERS'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Border Crossings ({borderCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AIRPORTS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'AIRPORTS'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Airports & Rail
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DEPOTS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'DEPOTS'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Depots & Customs ICDs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ROUTES')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'ROUTES'
              ? 'bg-indigo-700 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Route Master ({routes.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('MIGRATION')
            handleRunMigrationScan()
          }}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'MIGRATION'
              ? 'bg-teal-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Migration Assistant
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QUALITY')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'QUALITY'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Data Quality & Audit
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 3. SEARCH & FILTER BAR                                                */}
      {/* ===================================================================== */}
      {activeTab !== 'MIGRATION' && activeTab !== 'QUALITY' && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by canonical name, alias (e.g. JNPT, Dogharoon), UN/LOCODE, IATA, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
            />
          </div>

          {activeTab === 'ALL' && (
            <div className="w-full sm:w-44">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">All Location Types</SelectItem>
                  <SelectItem value="SEAPORT">Seaports</SelectItem>
                  <SelectItem value="BORDER">Border Crossings</SelectItem>
                  <SelectItem value="AIRPORT">Airports</SelectItem>
                  <SelectItem value="CUSTOMS_POINT">Customs ICDs</SelectItem>
                  <SelectItem value="CITY">Cities</SelectItem>
                  <SelectItem value="DEPOT">Depots & Yards</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-40">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">All Countries</SelectItem>
                <SelectItem value="AF">Afghanistan (AF)</SelectItem>
                <SelectItem value="IR">Iran (IR)</SelectItem>
                <SelectItem value="AE">UAE (AE)</SelectItem>
                <SelectItem value="IN">India (IN)</SelectItem>
                <SelectItem value="PK">Pakistan (PK)</SelectItem>
                <SelectItem value="TR">Turkey (TR)</SelectItem>
                <SelectItem value="CN">China (CN)</SelectItem>
                <SelectItem value="UZ">Uzbekistan (UZ)</SelectItem>
                <SelectItem value="TM">Turkmenistan (TM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. CONTENT PANELS                                                     */}
      {/* ===================================================================== */}

      {/* --- TAB: ALL LOCATIONS / SEAPORTS / BORDERS / AIRPORTS / DEPOTS --- */}
      {activeTab !== 'ROUTES' && activeTab !== 'MIGRATION' && activeTab !== 'QUALITY' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Location Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Country / Province</th>
                  <th className="py-2.5 px-3">Codes</th>
                  <th className="py-2.5 px-3">Timezone</th>
                  <th className="py-2.5 px-3">Aliases & Specifics</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLocations.map((loc) => (
                  <tr
                    key={loc.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(loc.type)}
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {loc.name}
                          </span>
                          {loc.isHub && (
                            <span className="ml-1.5 px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                              HUB
                            </span>
                          )}
                          {loc.nativeName && (
                            <div className="text-[10px] text-slate-400 font-medium" dir="rtl">
                              {loc.nativeName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {loc.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {loc.countryName} ({loc.countryCode})
                      </div>
                      {loc.provinceState && (
                        <div className="text-[10px] text-slate-400">{loc.provinceState}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      {loc.unlocode && (
                        <div className="text-blue-600 font-bold">{loc.unlocode}</div>
                      )}
                      {loc.iataCode && (
                        <div className="text-indigo-600 font-bold">
                          {loc.iataCode} {loc.icaoCode ? `/ ${loc.icaoCode}` : ''}
                        </div>
                      )}
                      {!loc.unlocode && !loc.iataCode && (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {loc.timezone}
                    </td>

                    <td className="py-2.5 px-3 max-w-xs truncate">
                      {loc.borderInfo && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          Side A: {loc.borderInfo.sideAName} ↔ Side B: {loc.borderInfo.sideBName}
                        </div>
                      )}
                      {loc.seaportInfo && loc.seaportInfo.terminals.length > 0 && (
                        <div className="text-[10px] text-blue-700 dark:text-blue-400">
                          {loc.seaportInfo.terminals.length} Terminal(s)
                        </div>
                      )}
                      {loc.aliases && loc.aliases.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {loc.aliases.join(', ')}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLocForEdit(loc)
                            setIsLocEditorOpen(true)
                          }}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                          title="Edit Location"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(loc.id, loc.name)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-red-600"
                          title="Delete Location"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLocations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No locations found matching the current search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: ROUTE MASTER --- */}
      {activeTab === 'ROUTES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRoutes.map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-mono text-[10px] font-bold">
                        {r.code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                        {r.transitMode}
                      </span>
                      <span className="text-[10px] text-slate-400">v{r.version}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                      {r.name}
                    </h3>
                    {r.namePersian && (
                      <p className="text-xs text-slate-400 font-medium" dir="rtl">
                        {r.namePersian}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickReverseRoute(r)}
                      className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      title="Generate Return Route"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Return
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRouteForEdit(r)
                        setIsRouteBuilderOpen(true)
                      }}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoute(r.id, r.name)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Transit summary badges */}
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span>
                      {r.totalMinDays}-{r.totalMaxDays} Days (Avg: <strong className="text-blue-600">{r.totalAvgDays}d</strong>)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{r.totalDistanceKm.toLocaleString()} Km</span>
                  </div>
                  <div className="text-slate-500 text-[11px] ml-auto">
                    {r.legs.length} Transport Leg(s)
                  </div>
                </div>

                {/* Visual legs chain */}
                <div className="space-y-1.5 pt-1">
                  {r.legs.map((leg) => (
                    <div
                      key={leg.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50/70 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold">
                          {leg.legOrder}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {leg.fromLocationSnapshot?.canonicalName}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {leg.toLocationSnapshot?.canonicalName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[9px]">
                          {leg.mode}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {leg.avgDays}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredRoutes.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
              <Route className="h-10 w-10 mx-auto mb-2 opacity-50 text-indigo-500" />
              <p className="font-bold text-sm">No route templates found</p>
              <p className="text-xs">Create your first multi-modal corridor using the "+ New Route" button.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TAB: MIGRATION ASSISTANT --- */}
      {activeTab === 'MIGRATION' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FileCheck2 className="h-4 w-4 text-teal-600" />
                Historical Free-Text Location Migration Assistant
              </h2>
              <p className="text-xs text-slate-500">
                Scans existing BOL documents for unstandardized free-text names (e.g. "JNPT", "Dogharoon", "BandarAbbas") and links them safely to canonical master records.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleRunMigrationScan}
              disabled={isScanningMigration}
              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isScanningMigration ? 'animate-spin' : ''}`} />
              {isScanningMigration ? 'Scanning...' : 'Rescan Documents'}
            </Button>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400">
            Scanned <strong className="text-slate-900 dark:text-slate-100">{migrationScannedDocs}</strong> saved BOL documents and identified{' '}
            <strong className="text-slate-900 dark:text-slate-100">{migrationCandidates.length}</strong> unique free-text location entries.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Historical Free-Text</th>
                  <th className="py-2.5 px-3">Field Origin</th>
                  <th className="py-2.5 px-3">Occurrences</th>
                  <th className="py-2.5 px-3">Suggested Master Match</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {migrationCandidates.map((cand, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      "{cand.rawText}"
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">
                      {cand.fieldName}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                      {cand.occurrences}
                    </td>
                    <td className="py-2.5 px-3">
                      {cand.matchedLocationName ? (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {cand.matchedLocationName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No direct match</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cand.matchConfidence === 'EXACT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : cand.matchConfidence === 'ALIAS'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : cand.matchConfidence === 'FUZZY'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {cand.matchConfidence}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {cand.matchedLocationId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            locationMigrationAssistant.linkCandidateToLocation(
                              cand.rawText,
                              cand.matchedLocationId!
                            )
                            alert(`Linked "${cand.rawText}" to ${cand.matchedLocationName} without altering historical legal text.`)
                            handleRunMigrationScan()
                          }}
                          className="h-7 text-xs text-teal-700 border-teal-300 hover:bg-teal-50 font-semibold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-teal-600" />
                          Link Alias
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLocForEdit(null)
                            setIsLocEditorOpen(true)
                          }}
                          className="h-7 text-xs text-blue-600 hover:underline"
                        >
                          + Add to Master
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}

                {migrationCandidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No historical free-text locations found in current saved documents.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: DATA QUALITY AUDIT --- */}
      {activeTab === 'QUALITY' && qualityAudit && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Master Data Quality & Integrity Report
            </h2>
            <p className="text-xs text-slate-500">
              Monitors completeness of UN/LOCODE, IATA codes, IANA timezones, and prevents duplicate records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 font-semibold">Missing Timezone</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {qualityAudit.missingTimezone}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 font-semibold">Ports Missing UN/LOCODE</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {qualityAudit.missingUnlocode}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 font-semibold">Airports Missing IATA</span>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {qualityAudit.missingIata}
              </div>
            </div>
          </div>

          {/* Potential Duplicates Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Potential Duplicate Candidates ({qualityAudit.duplicateCandidates.length})
            </h3>
            {qualityAudit.duplicateCandidates.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>No duplicate locations detected. All canonical records, UN/LOCODEs, and IATA codes are unique.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {qualityAudit.duplicateCandidates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        {dup.name1} ↔ {dup.name2}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Reason: {dup.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL DIALOGS                                                      */}
      {/* ===================================================================== */}
      {isLocEditorOpen && (
        <LocationEditorDrawer
          open={isLocEditorOpen}
          onClose={() => {
            setIsLocEditorOpen(false)
            setSelectedLocForEdit(null)
          }}
          onSaved={() => {
            reloadData()
          }}
          initialLocation={selectedLocForEdit}
        />
      )}

      {isRouteBuilderOpen && (
        <RouteBuilderDrawer
          open={isRouteBuilderOpen}
          onClose={() => {
            setIsRouteBuilderOpen(false)
            setSelectedRouteForEdit(null)
          }}
          onSaved={() => {
            reloadData()
          }}
          initialRoute={selectedRouteForEdit}
        />
      )}
    </div>
  )
}
