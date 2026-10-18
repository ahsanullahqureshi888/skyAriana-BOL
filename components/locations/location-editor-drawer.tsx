"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LocationRecord,
  LocationType,
  LocationStatus,
  PortTerminalInfo,
} from '@/lib/types/route-locations'
import { routeLocationService } from '@/lib/services/route-location-service'
import {
  Anchor,
  Plane,
  Truck,
  Building2,
  MapPin,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'

interface LocationEditorDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: (location: LocationRecord) => void
  initialLocation?: LocationRecord | null
  presetType?: LocationType
}

const COMMON_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', defaultTz: 'Asia/Kabul' },
  { code: 'IR', name: 'Iran', defaultTz: 'Asia/Tehran' },
  { code: 'AE', name: 'United Arab Emirates', defaultTz: 'Asia/Dubai' },
  { code: 'IN', name: 'India', defaultTz: 'Asia/Kolkata' },
  { code: 'PK', name: 'Pakistan', defaultTz: 'Asia/Karachi' },
  { code: 'TR', name: 'Turkey', defaultTz: 'Europe/Istanbul' },
  { code: 'CN', name: 'China', defaultTz: 'Asia/Shanghai' },
  { code: 'UZ', name: 'Uzbekistan', defaultTz: 'Asia/Tashkent' },
  { code: 'TM', name: 'Turkmenistan', defaultTz: 'Asia/Ashgabat' },
  { code: 'TJ', name: 'Tajikistan', defaultTz: 'Asia/Dushanbe' },
  { code: 'DE', name: 'Germany', defaultTz: 'Europe/Berlin' },
  { code: 'OTHER', name: 'Other Country', defaultTz: 'UTC' },
]

const TIMEZONES = [
  'Asia/Kabul',
  'Asia/Tehran',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Europe/Istanbul',
  'Asia/Shanghai',
  'Asia/Tashkent',
  'Asia/Ashgabat',
  'Asia/Dushanbe',
  'Europe/Berlin',
  'UTC',
]

export function LocationEditorDrawer({
  open,
  onClose,
  onSaved,
  initialLocation,
  presetType,
}: LocationEditorDrawerProps) {
  const [name, setName] = useState('')
  const [nativeName, setNativeName] = useState('')
  const [type, setType] = useState<LocationType>(presetType || 'CITY')
  const [status, setStatus] = useState<LocationStatus>('ACTIVE')
  const [countryCode, setCountryCode] = useState('AF')
  const [countryName, setCountryName] = useState('Afghanistan')
  const [provinceState, setProvinceState] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kabul')
  const [unlocode, setUnlocode] = useState('')
  const [iataCode, setIataCode] = useState('')
  const [icaoCode, setIcaoCode] = useState('')
  const [customsCode, setCustomsCode] = useState('')
  const [isHub, setIsHub] = useState(false)
  const [notes, setNotes] = useState('')

  // Aliases
  const [aliases, setAliases] = useState<string[]>([])
  const [newAlias, setNewAlias] = useState('')

  // Border specific
  const [sideACountry, setSideACountry] = useState('AF')
  const [sideAName, setSideAName] = useState('')
  const [sideBCountry, setSideBCountry] = useState('IR')
  const [sideBName, setSideBName] = useState('')
  const [clearanceCommercial, setClearanceCommercial] = useState(true)
  const [clearanceTransit, setClearanceTransit] = useState(true)
  const [clearancePassenger, setClearancePassenger] = useState(false)
  const [operatingHours, setOperatingHours] = useState('07:00 - 18:00')
  const [bottleneckNotes, setBottleneckNotes] = useState('')
  const [roadConditions, setRoadConditions] = useState('')

  // Port specific
  const [terminals, setTerminals] = useState<PortTerminalInfo[]>([])
  const [newTermName, setNewTermName] = useState('')
  const [newTermDraft, setNewTermDraft] = useState('')

  useEffect(() => {
    if (initialLocation) {
      setName(initialLocation.name)
      setNativeName(initialLocation.nativeName || '')
      setType(initialLocation.type)
      setStatus(initialLocation.status)
      setCountryCode(initialLocation.countryCode)
      setCountryName(initialLocation.countryName)
      setProvinceState(initialLocation.provinceState || '')
      setTimezone(initialLocation.timezone)
      setUnlocode(initialLocation.unlocode || '')
      setIataCode(initialLocation.iataCode || '')
      setIcaoCode(initialLocation.icaoCode || '')
      setCustomsCode(initialLocation.customsCode || '')
      setIsHub(!!initialLocation.isHub)
      setNotes(initialLocation.notes || '')
      setAliases(initialLocation.aliases || [])

      if (initialLocation.borderInfo) {
        setSideACountry(initialLocation.borderInfo.sideACountry)
        setSideAName(initialLocation.borderInfo.sideAName)
        setSideBCountry(initialLocation.borderInfo.sideBCountry)
        setSideBName(initialLocation.borderInfo.sideBName)
        setClearanceCommercial(initialLocation.borderInfo.clearanceTypes.includes('COMMERCIAL'))
        setClearanceTransit(initialLocation.borderInfo.clearanceTypes.includes('TRANSIT'))
        setClearancePassenger(initialLocation.borderInfo.clearanceTypes.includes('PASSENGER'))
        setOperatingHours(initialLocation.borderInfo.operatingHours || '')
        setBottleneckNotes(initialLocation.borderInfo.bottleneckNotes || '')
        setRoadConditions(initialLocation.borderInfo.roadConditions || '')
      }

      if (initialLocation.seaportInfo) {
        setTerminals(initialLocation.seaportInfo.terminals || [])
      }
    } else {
      // Reset defaults
      setName('')
      setNativeName('')
      setType(presetType || 'CITY')
      setStatus('ACTIVE')
      setCountryCode('AF')
      setCountryName('Afghanistan')
      setProvinceState('')
      setTimezone('Asia/Kabul')
      setUnlocode('')
      setIataCode('')
      setIcaoCode('')
      setCustomsCode('')
      setIsHub(false)
      setNotes('')
      setAliases([])
      setSideACountry('AF')
      setSideAName('')
      setSideBCountry('IR')
      setSideBName('')
      setClearanceCommercial(true)
      setClearanceTransit(true)
      setClearancePassenger(false)
      setOperatingHours('07:00 - 18:00')
      setBottleneckNotes('')
      setRoadConditions('')
      setTerminals([])
    }
  }, [initialLocation, presetType, open])

  // Country change handler
  const handleCountryChange = (code: string) => {
    setCountryCode(code)
    const match = COMMON_COUNTRIES.find((c) => c.code === code)
    if (match) {
      setCountryName(match.name)
      setTimezone(match.defaultTz)
    }
  }

  // Duplicate candidate check in real-time
  const duplicateCheck = useMemo(() => {
    if (!name.trim() && !unlocode.trim() && !iataCode.trim()) {
      return { hasDuplicate: false }
    }
    return routeLocationService.checkLocationDuplicate({
      id: initialLocation?.id,
      name: name.trim(),
      unlocode: unlocode.trim() || undefined,
      iataCode: iataCode.trim() || undefined,
    })
  }, [name, unlocode, iataCode, initialLocation])

  const handleAddAlias = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newAlias.trim()
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed])
      setNewAlias('')
    }
  }

  const handleRemoveAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter((a) => a !== aliasToRemove))
  }

  const handleAddTerminal = () => {
    if (!newTermName.trim()) return
    setTerminals([
      ...terminals,
      {
        terminalName: newTermName.trim(),
        draftMeters: newTermDraft ? parseFloat(newTermDraft) : undefined,
        containerHandling: true,
      },
    ])
    setNewTermName('')
    setNewTermDraft('')
  }

  const handleRemoveTerminal = (idx: number) => {
    setTerminals(terminals.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('Canonical location name is required.')
      return
    }

    const payload: Omit<LocationRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      nativeName: nativeName.trim() || undefined,
      type,
      status,
      countryCode,
      countryName,
      provinceState: provinceState.trim() || undefined,
      timezone,
      unlocode: unlocode.trim().toUpperCase() || undefined,
      iataCode: iataCode.trim().toUpperCase() || undefined,
      icaoCode: icaoCode.trim().toUpperCase() || undefined,
      customsCode: customsCode.trim() || undefined,
      isHub,
      aliases,
      notes: notes.trim() || undefined,
    }

    if (type === 'BORDER') {
      const clearanceTypes: Array<'COMMERCIAL' | 'TRANSIT' | 'PASSENGER'> = []
      if (clearanceCommercial) clearanceTypes.push('COMMERCIAL')
      if (clearanceTransit) clearanceTypes.push('TRANSIT')
      if (clearancePassenger) clearanceTypes.push('PASSENGER')

      payload.borderInfo = {
        sideACountry,
        sideAName: sideAName.trim() || name.trim(),
        sideBCountry,
        sideBName: sideBName.trim(),
        clearanceTypes,
        operatingHours: operatingHours.trim() || undefined,
        bottleneckNotes: bottleneckNotes.trim() || undefined,
        roadConditions: roadConditions.trim() || undefined,
      }
    }

    if (type === 'SEAPORT' || type === 'PORT') {
      payload.seaportInfo = {
        unlocode: unlocode.trim().toUpperCase() || '',
        terminals,
      }
    }

    if (type === 'AIRPORT') {
      payload.airportInfo = {
        iataCode: iataCode.trim().toUpperCase() || '',
        icaoCode: icaoCode.trim().toUpperCase() || undefined,
        cargoFacility: true,
        customsPointAvailable: true,
      }
    }

    let saved: LocationRecord
    if (initialLocation) {
      saved = routeLocationService.updateLocation(initialLocation.id, payload)
    } else {
      saved = routeLocationService.createLocation(payload)
    }

    onSaved(saved)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            {type === 'SEAPORT' || type === 'PORT' ? (
              <Anchor className="h-5 w-5 text-blue-600" />
            ) : type === 'BORDER' ? (
              <Truck className="h-5 w-5 text-amber-600" />
            ) : type === 'AIRPORT' ? (
              <Plane className="h-5 w-5 text-indigo-600" />
            ) : (
              <MapPin className="h-5 w-5 text-emerald-600" />
            )}
            <span>{initialLocation ? `Edit Location: ${initialLocation.name}` : 'Add New Master Location'}</span>
          </DialogTitle>
        </DialogHeader>

        {duplicateCheck.hasDuplicate && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Duplicate Warning</p>
              <p>{duplicateCheck.duplicateReason}. You can still save if this is an intentional distinction.</p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2 text-xs">
          {/* Top row: Name & Native Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Canonical English Name *</Label>
              <Input
                placeholder="e.g. Bandar Abbas, Islam Qala"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Native / Persian / Pashto Name</Label>
              <Input
                placeholder="e.g. بندر عباس، اسلام قلعه"
                value={nativeName}
                onChange={(e) => setNativeName(e.target.value)}
                className="mt-1 h-8 text-xs"
                dir="rtl"
              />
            </div>
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Location Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as LocationType)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="SEAPORT">Seaport (Oceanic)</SelectItem>
                  <SelectItem value="BORDER">Border Crossing (2-Sided)</SelectItem>
                  <SelectItem value="AIRPORT">Airport (Cargo)</SelectItem>
                  <SelectItem value="CUSTOMS_POINT">Inland Customs (ICD)</SelectItem>
                  <SelectItem value="CITY">City / Town</SelectItem>
                  <SelectItem value="DEPOT">Depot / Container Yard</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="RAIL_TERMINAL">Rail Terminal</SelectItem>
                  <SelectItem value="OTHER">Other Point</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Country *</Label>
              <Select value={countryCode} onValueChange={handleCountryChange}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {COMMON_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LocationStatus)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ACTIVE">Active (Operational)</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review / Bottleneck</SelectItem>
                  <SelectItem value="INACTIVE">Inactive / Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Province & Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Province / State / Emirate</Label>
              <Input
                placeholder="e.g. Herat, Hormozgan, Dubai"
                value={provinceState}
                onChange={(e) => setProvinceState(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">IANA Timezone *</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isHub"
                checked={isHub}
                onChange={(e) => setIsHub(e.target.checked)}
                className="rounded border-slate-300 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="isHub" className="text-xs font-semibold cursor-pointer">
                Major Logistics Hub
              </Label>
            </div>
          </div>

          {/* Conditional: Seaport UN/LOCODE */}
          {(type === 'SEAPORT' || type === 'PORT') && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
                <Anchor className="h-4 w-4" />
                <span>Seaport Details & Terminals</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">UN/LOCODE (5 Letters)</Label>
                  <Input
                    placeholder="e.g. IRBND, AEJEA, INNSA"
                    value={unlocode}
                    onChange={(e) => setUnlocode(e.target.value)}
                    maxLength={5}
                    className="mt-1 h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Customs Port Code</Label>
                  <Input
                    placeholder="e.g. BND-CUS"
                    value={customsCode}
                    onChange={(e) => setCustomsCode(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Terminals list */}
              <div>
                <Label className="text-xs font-semibold">Port Handling Terminals</Label>
                <div className="space-y-1.5 mt-1">
                  {terminals.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs"
                    >
                      <span className="font-medium">{t.terminalName}</span>
                      <div className="flex items-center gap-2">
                        {t.draftMeters && <span className="text-[10px] text-slate-500">Draft: {t.draftMeters}m</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveTerminal(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Terminal Name (e.g. Shahid Rajaee T1)"
                      value={newTermName}
                      onChange={(e) => setNewTermName(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="Draft (m)"
                      value={newTermDraft}
                      onChange={(e) => setNewTermDraft(e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddTerminal} className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Two-Sided Border Crossing */}
          {type === 'BORDER' && (
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                <Truck className="h-4 w-4" />
                <span>Two-Sided Border Crossing Configuration</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Side A (Entry / Exit Gate 1)</Label>
                  <Input
                    placeholder="Station Name (e.g. Islam Qala)"
                    value={sideAName}
                    onChange={(e) => setSideAName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Select value={sideACountry} onValueChange={setSideACountry}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {COMMON_COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Side B (Neighbor Gate 2)</Label>
                  <Input
                    placeholder="Station Name (e.g. Dogharoon)"
                    value={sideBName}
                    onChange={(e) => setSideBName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Select value={sideBCountry} onValueChange={setSideBCountry}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {COMMON_COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clearance types */}
              <div className="pt-1">
                <Label className="text-xs font-semibold">Permitted Clearance Operations</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearanceCommercial}
                      onChange={(e) => setClearanceCommercial(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600"
                    />
                    <span>Commercial Freight</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearanceTransit}
                      onChange={(e) => setClearanceTransit(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600"
                    />
                    <span>TIR / Transit Containers</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearancePassenger}
                      onChange={(e) => setClearancePassenger(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600"
                    />
                    <span>Passenger / Vehicle</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs">Customs Gate Operating Hours</Label>
                  <Input
                    placeholder="e.g. 07:00 - 18:00"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bottleneck / Wait Time Notes</Label>
                  <Input
                    placeholder="e.g. 2-3 days queue for fuel trucks"
                    value={bottleneckNotes}
                    onChange={(e) => setBottleneckNotes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Airport IATA / ICAO */}
          {type === 'AIRPORT' && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold">
                <Plane className="h-4 w-4" />
                <span>Airport Codes & Facilities</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">IATA Code (3 Letters) *</Label>
                  <Input
                    placeholder="e.g. KBL, DXB, IST"
                    value={iataCode}
                    onChange={(e) => setIataCode(e.target.value)}
                    maxLength={3}
                    className="mt-1 h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">ICAO Code (4 Letters)</Label>
                  <Input
                    placeholder="e.g. OAKB, OMDB, LTFM"
                    value={icaoCode}
                    onChange={(e) => setIcaoCode(e.target.value)}
                    maxLength={4}
                    className="mt-1 h-8 text-xs uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aliases Tag Manager */}
          <div>
            <Label className="text-xs font-semibold">
              Search Aliases & Alternative Spellings (Used for Fuzzy Auto-Match)
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-md mt-1 min-h-[42px]">
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px]"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => handleRemoveAlias(alias)}
                    className="hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              {aliases.length === 0 && (
                <span className="text-slate-400 text-xs italic">No aliases defined yet.</span>
              )}
            </div>
            <div className="flex gap-2 mt-1.5">
              <Input
                placeholder="Type alias (e.g. JNPT, Dogharoon) and press Add"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddAlias()
                  }
                }}
                className="h-8 text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => handleAddAlias()} className="h-8 text-xs">
                Add Alias
              </Button>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <Label className="text-xs font-semibold">Logistics & Route Notes</Label>
            <Input
              placeholder="e.g. Primary oceanic container entry point for Afghanistan commercial imports"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {initialLocation ? 'Save Changes' : 'Create Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
