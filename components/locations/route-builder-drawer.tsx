"use client"

import React, { useState, useEffect } from 'react'
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
  RouteMaster,
  RouteLeg,
  TransportMode,
  LocationRecord,
  LocationSnapshot,
} from '@/lib/types/route-locations'
import { routeLocationService } from '@/lib/services/route-location-service'
import { LocationSelector } from '@/components/locations/location-selector'
import {
  Route,
  Truck,
  Anchor,
  Plane,
  Train,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  CheckCircle2,
  Clock,
  Navigation,
} from 'lucide-react'

interface RouteBuilderDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: (route: RouteMaster) => void
  initialRoute?: RouteMaster | null
}

export function RouteBuilderDrawer({
  open,
  onClose,
  onSaved,
  initialRoute,
}: RouteBuilderDrawerProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [namePersian, setNamePersian] = useState('')
  const [transitMode, setTransitMode] = useState<TransportMode>('MULTIMODAL')
  const [isActive, setIsActive] = useState(true)
  const [notes, setNotes] = useState('')

  const [originLocation, setOriginLocation] = useState<LocationRecord | null>(null)
  const [originSnapshot, setOriginSnapshot] = useState<LocationSnapshot | null>(null)

  const [destinationLocation, setDestinationLocation] = useState<LocationRecord | null>(null)
  const [destinationSnapshot, setDestinationSnapshot] = useState<LocationSnapshot | null>(null)

  const [legs, setLegs] = useState<RouteLeg[]>([])

  useEffect(() => {
    if (initialRoute) {
      setCode(initialRoute.code)
      setName(initialRoute.name)
      setNamePersian(initialRoute.namePersian || '')
      setTransitMode(initialRoute.transitMode)
      setIsActive(initialRoute.isActive)
      setNotes(initialRoute.notes || '')
      setOriginSnapshot(initialRoute.originSnapshot)
      setDestinationSnapshot(initialRoute.destinationSnapshot)
      setLegs(initialRoute.legs ? JSON.parse(JSON.stringify(initialRoute.legs)) : [])
    } else {
      setCode(`RT-${Date.now().toString().slice(-6)}`)
      setName('')
      setNamePersian('')
      setTransitMode('MULTIMODAL')
      setIsActive(true)
      setNotes('')
      setOriginLocation(null)
      setOriginSnapshot(null)
      setDestinationLocation(null)
      setDestinationSnapshot(null)
      setLegs([])
    }
  }, [initialRoute, open])

  // Computed summary
  const summary = routeLocationService.calculateRouteTransit(legs)

  const handleAddLeg = () => {
    const lastLeg = legs[legs.length - 1]
    const fromLocId = lastLeg ? lastLeg.toLocationId : originLocation?.id || ''
    const fromSnap = lastLeg
      ? lastLeg.toLocationSnapshot
      : originSnapshot || {
          canonicalName: 'Origin Stop',
          countryCode: 'XX',
          countryName: 'Unknown',
          type: 'CITY',
          timezone: 'Asia/Kabul',
          displayText: 'Origin Stop',
          snapshotDate: new Date().toISOString(),
        }

    const newLeg: RouteLeg = {
      id: `leg-${Date.now()}-${legs.length + 1}`,
      legOrder: legs.length + 1,
      fromLocationId: fromLocId,
      fromLocationSnapshot: fromSnap,
      toLocationId: '',
      toLocationSnapshot: {
        canonicalName: '',
        countryCode: 'XX',
        countryName: 'Destination Stop',
        type: 'CITY',
        timezone: 'Asia/Kabul',
        displayText: '',
        snapshotDate: new Date().toISOString(),
      },
      mode: 'TRUCK',
      minDays: 1,
      maxDays: 3,
      avgDays: 2,
      distanceKm: 200,
    }

    setLegs([...legs, newLeg])
  }

  const handleUpdateLeg = (index: number, updates: Partial<RouteLeg>) => {
    const updated = [...legs]
    updated[index] = { ...updated[index], ...updates }
    setLegs(updated)
  }

  const handleRemoveLeg = (index: number) => {
    const filtered = legs.filter((_, idx) => idx !== index)
    // Reorder legOrder
    const reordered = filtered.map((leg, idx) => ({ ...leg, legOrder: idx + 1 }))
    setLegs(reordered)
  }

  const handleMoveLeg = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === legs.length - 1) return

    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const copy = [...legs]
    const temp = copy[index]
    copy[index] = copy[targetIdx]
    copy[targetIdx] = temp

    const reordered = copy.map((leg, idx) => ({ ...leg, legOrder: idx + 1 }))
    setLegs(reordered)
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('Route name is required')
      return
    }
    if (!originSnapshot) {
      alert('Origin location is required')
      return
    }
    if (!destinationSnapshot) {
      alert('Destination location is required')
      return
    }
    if (legs.length === 0) {
      alert('At least one route leg is required')
      return
    }

    const payload = {
      code: code.trim(),
      name: name.trim(),
      namePersian: namePersian.trim() || undefined,
      originId: originSnapshot.locationId || 'loc-origin',
      originSnapshot,
      destinationId: destinationSnapshot.locationId || 'loc-dest',
      destinationSnapshot,
      transitMode,
      legs,
      isActive,
      notes: notes.trim() || undefined,
    }

    let saved: RouteMaster
    if (initialRoute) {
      saved = routeLocationService.updateRoute(initialRoute.id, payload)
    } else {
      saved = routeLocationService.createRoute(payload)
    }

    onSaved(saved)
    onClose()
  }

  const handleGenerateReverse = () => {
    if (!initialRoute) return
    if (confirm(`Generate reverse return route for "${initialRoute.name}"?`)) {
      const rev = routeLocationService.generateReverseRoute(initialRoute)
      onSaved(rev)
      onClose()
    }
  }

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'SEA':
        return <Anchor className="h-3.5 w-3.5 text-blue-600" />
      case 'AIR':
        return <Plane className="h-3.5 w-3.5 text-indigo-600" />
      case 'RAIL':
        return <Train className="h-3.5 w-3.5 text-orange-600" />
      default:
        return <Truck className="h-3.5 w-3.5 text-amber-600" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <Route className="h-5 w-5 text-indigo-600" />
              <span>{initialRoute ? `Edit Route Template: ${initialRoute.code}` : 'Build Multi-Modal Route Master'}</span>
            </DialogTitle>
            {initialRoute && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateReverse}
                className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Generate Return Route
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Route Code *</Label>
              <Input
                placeholder="e.g. RT-BND-ISL-KBL"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 h-8 text-xs font-mono font-bold uppercase"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold">Route Name (English) *</Label>
              <Input
                placeholder="e.g. Bandar Abbas to Kabul via Islam Qala & Herat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          {/* Row 2: Persian Name & Overall Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold">Persian / Dari Route Name</Label>
              <Input
                placeholder="e.g. مسیر بندر عباس به کابل از طریق اسلام قلعه"
                value={namePersian}
                onChange={(e) => setNamePersian(e.target.value)}
                className="mt-1 h-8 text-xs"
                dir="rtl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Primary Transit Mode</Label>
              <Select value={transitMode} onValueChange={(v) => setTransitMode(v as TransportMode)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TRUCK">Road / Truck</SelectItem>
                  <SelectItem value="SEA">Sea / Ocean</SelectItem>
                  <SelectItem value="AIR">Air Cargo</SelectItem>
                  <SelectItem value="RAIL">Rail Freight</SelectItem>
                  <SelectItem value="MULTIMODAL">Multimodal (Sea/Road/Rail)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Origin & Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div>
              <LocationSelector
                label="Origin Port / City *"
                value={originSnapshot?.canonicalName}
                onChange={(loc, snap) => {
                  setOriginLocation(loc)
                  setOriginSnapshot(snap)
                }}
                placeholder="Select Origin (e.g. Bandar Abbas)..."
              />
            </div>
            <div>
              <LocationSelector
                label="Destination Terminal / City *"
                value={destinationSnapshot?.canonicalName}
                onChange={(loc, snap) => {
                  setDestinationLocation(loc)
                  setDestinationSnapshot(snap)
                }}
                placeholder="Select Destination (e.g. Kabul ICD)..."
              />
            </div>
          </div>

          {/* Multi-Legs Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Ordered Transport Legs ({legs.length})
                </Label>
                <p className="text-[11px] text-slate-500">
                  Define checkpoints, border stations, transloading points, and transit ranges.
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleAddLeg} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                <Plus className="h-3 w-3 mr-1" /> Add Route Leg
              </Button>
            </div>

            {legs.length === 0 && (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
                <Route className="h-8 w-8 mx-auto mb-1 opacity-50" />
                <p className="font-medium">No legs added yet.</p>
                <p className="text-[11px]">Click "Add Route Leg" above to create stops and transit segments.</p>
              </div>
            )}

            <div className="space-y-2.5">
              {legs.map((leg, index) => (
                <div
                  key={leg.id}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                        {leg.legOrder}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Leg {leg.legOrder}: {leg.fromLocationSnapshot?.canonicalName || 'From'} →{' '}
                        {leg.toLocationSnapshot?.canonicalName || 'To'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveLeg(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveLeg(index, 'down')}
                        disabled={index === legs.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLeg(index)}
                        className="p-1 text-red-400 hover:text-red-600 ml-2"
                        title="Remove Leg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Leg Pickers & Mode */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-1">
                    <div className="md:col-span-2">
                      <LocationSelector
                        label="From"
                        value={leg.fromLocationSnapshot?.canonicalName}
                        onChange={(loc, snap) => {
                          if (snap) {
                            handleUpdateLeg(index, {
                              fromLocationId: loc?.id || '',
                              fromLocationSnapshot: snap,
                            })
                          }
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <LocationSelector
                        label="To"
                        value={leg.toLocationSnapshot?.canonicalName}
                        onChange={(loc, snap) => {
                          if (snap) {
                            handleUpdateLeg(index, {
                              toLocationId: loc?.id || '',
                              toLocationSnapshot: snap,
                            })
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Mode</Label>
                      <Select
                        value={leg.mode}
                        onValueChange={(m) => handleUpdateLeg(index, { mode: m as TransportMode })}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="TRUCK">Truck / Road</SelectItem>
                          <SelectItem value="SEA">Sea Vessel</SelectItem>
                          <SelectItem value="AIR">Air Flight</SelectItem>
                          <SelectItem value="RAIL">Rail Freight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Leg Transit Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    <div>
                      <Label className="text-[11px] text-slate-500">Min Transit (Days)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={leg.minDays}
                        onChange={(e) => handleUpdateLeg(index, { minDays: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500">Max Transit (Days)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={leg.maxDays}
                        onChange={(e) => handleUpdateLeg(index, { maxDays: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500">Expected / Avg Days</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={leg.avgDays}
                        onChange={(e) => handleUpdateLeg(index, { avgDays: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs font-semibold text-blue-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500">Distance (Km)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={leg.distanceKm || ''}
                        onChange={(e) => handleUpdateLeg(index, { distanceKm: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* Leg Notes */}
                  <div>
                    <Input
                      placeholder="Leg clearance details, highway numbers, transloading notes..."
                      value={leg.notes || ''}
                      onChange={(e) => handleUpdateLeg(index, { notes: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Computed Route Summary Box */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Total Transit Range: {summary.totalMinDays} - {summary.totalMaxDays} Days
                </p>
                <p className="text-[11px] text-slate-500">
                  Expected Average: <span className="font-semibold text-blue-700 dark:text-blue-300">{summary.totalAvgDays} Days</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-indigo-600" />
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Total Distance: {summary.totalDistanceKm.toLocaleString()} Km
                </p>
                <p className="text-[11px] text-slate-500">Across {legs.length} transport legs</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {initialRoute ? 'Save Route Template' : 'Create Route'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
