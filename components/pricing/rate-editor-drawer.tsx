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
  RateMasterRecord,
  RateType,
  ServiceType,
  ContainerType,
  RateUnit,
  PricingChargeLine,
} from '@/lib/types/freight-pricing'
import { freightPricingService } from '@/lib/services/freight-pricing-service'
import { routeLocationService } from '@/lib/services/route-location-service'
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  Snowflake,
  ShieldAlert,
  Percent,
} from 'lucide-react'

interface RateEditorDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: (rate: RateMasterRecord) => void
  initialRate?: RateMasterRecord | null
}

const CONTAINER_TYPES: ContainerType[] = ['20GP', '40GP', '40HC', '20RF', '40RF', 'OPEN_TOP', 'FLAT_RACK']
const SERVICE_TYPES: ServiceType[] = [
  'FULL_WAY',
  'HALF_WAY',
  'PORT_TO_PORT',
  'DOOR_TO_PORT',
  'PORT_TO_DOOR',
  'DOOR_TO_DOOR',
  'ROAD_ONLY',
  'SEA_ONLY',
  'AIR_ONLY',
  'MULTIMODAL',
]

export function RateEditorDrawer({
  open,
  onClose,
  onSaved,
  initialRate,
}: RateEditorDrawerProps) {
  const [rateCode, setRateCode] = useState('')
  const [name, setName] = useState('')
  const [rateType, setRateType] = useState<RateType>('SELL_RATE')
  const [originName, setOriginName] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [routeId, setRouteId] = useState('')
  const [containerType, setContainerType] = useState<ContainerType>('40HC')
  const [serviceType, setServiceType] = useState<ServiceType>('FULL_WAY')
  const [rateUnit, setRateUnit] = useState<RateUnit>('PER_CONTAINER')
  const [currency, setCurrency] = useState('USD')
  const [baseBuyRate, setBaseBuyRate] = useState<number>(0)
  const [baseSellRate, setBaseSellRate] = useState<number>(0)
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [freeDays, setFreeDays] = useState<number>(14)
  const [notes, setNotes] = useState('')

  // Reefer details
  const [tempRange, setTempRange] = useState('-18°C')
  const [plugInIncluded, setPlugInIncluded] = useState(true)
  const [gensetIncluded, setGensetIncluded] = useState(true)

  // Itemized charges
  const [charges, setCharges] = useState<PricingChargeLine[]>([])
  const [routesList, setRoutesList] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    // Load routes from Route Master
    const rts = routeLocationService.getRoutes()
    setRoutesList(rts.map((r) => ({ id: r.id, name: r.name })))

    if (initialRate) {
      setRateCode(initialRate.rateCode)
      setName(initialRate.name)
      setRateType(initialRate.rateType)
      setOriginName(initialRate.originName)
      setDestinationName(initialRate.destinationName)
      setRouteId(initialRate.routeId || '')
      setContainerType(initialRate.containerType)
      setServiceType(initialRate.serviceType)
      setRateUnit(initialRate.rateUnit)
      setCurrency(initialRate.currency)
      setBaseBuyRate(initialRate.baseBuyRate)
      setBaseSellRate(initialRate.baseSellRate)
      setValidFrom(initialRate.validFrom)
      setValidUntil(initialRate.validUntil)
      setSupplierName(initialRate.supplierName || '')
      setCustomerName(initialRate.customerName || '')
      setFreeDays(initialRate.freeDays || 14)
      setNotes(initialRate.notes || '')
      setCharges(initialRate.charges ? JSON.parse(JSON.stringify(initialRate.charges)) : [])

      if (initialRate.reeferDetails) {
        setTempRange(initialRate.reeferDetails.temperatureRange || '-18°C')
        setPlugInIncluded(!!initialRate.reeferDetails.plugInIncluded)
        setGensetIncluded(!!initialRate.reeferDetails.gensetIncluded)
      }
    } else {
      const year = new Date().getFullYear()
      setRateCode(`RATE-${year}-${Math.floor(100 + Math.random() * 900)}`)
      setName('')
      setRateType('SELL_RATE')
      setOriginName('')
      setDestinationName('')
      setRouteId('')
      setContainerType('40HC')
      setServiceType('FULL_WAY')
      setRateUnit('PER_CONTAINER')
      setCurrency('USD')
      setBaseBuyRate(0)
      setBaseSellRate(0)
      setValidFrom(new Date().toISOString().split('T')[0])
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 3)
      setValidUntil(nextMonth.toISOString().split('T')[0])
      setSupplierName('')
      setCustomerName('')
      setFreeDays(14)
      setNotes('')
      setCharges([])
      setTempRange('-18°C')
      setPlugInIncluded(true)
      setGensetIncluded(true)
    }
  }, [initialRate, open])

  const isReefer = containerType === '20RF' || containerType === '40RF'
  const grossMargin = baseSellRate - baseBuyRate
  const marginPct = baseSellRate > 0 ? Number(((grossMargin / baseSellRate) * 100).toFixed(2)) : 0

  const handleAddCharge = () => {
    const newCharge: PricingChargeLine = {
      id: `ch-${Date.now()}`,
      chargeCode: 'MISC_FEE',
      chargeName: 'Additional Service / Handling',
      category: 'OTHER',
      buyAmount: 0,
      sellAmount: 0,
      currency,
      quantity: 1,
      unit: rateUnit,
    }
    setCharges([...charges, newCharge])
  }

  const handleUpdateCharge = (index: number, updates: Partial<PricingChargeLine>) => {
    const copy = [...charges]
    copy[index] = { ...copy[index], ...updates }
    setCharges(copy)
  }

  const handleRemoveCharge = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('Rate name is required')
      return
    }
    if (!originName.trim() || !destinationName.trim()) {
      alert('Origin and Destination are required')
      return
    }
    if (!validUntil) {
      alert('Valid Until date is required')
      return
    }

    const payload: Omit<RateMasterRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'> = {
      rateCode: rateCode.trim().toUpperCase(),
      name: name.trim(),
      rateType,
      originName: originName.trim(),
      destinationName: destinationName.trim(),
      routeId: routeId || undefined,
      routeName: routesList.find((r) => r.id === routeId)?.name || undefined,
      transportMode: serviceType === 'AIR_ONLY' ? 'AIR' : serviceType === 'SEA_ONLY' ? 'SEA' : serviceType === 'ROAD_ONLY' ? 'TRUCK' : 'MULTIMODAL',
      serviceType,
      containerType,
      rateUnit,
      currency,
      baseBuyRate,
      baseSellRate,
      charges,
      validFrom,
      validUntil,
      supplierName: supplierName.trim() || undefined,
      customerName: customerName.trim() || undefined,
      freeDays,
      notes: notes.trim() || undefined,
      isActive: true,
      reeferDetails: isReefer
        ? {
            temperatureRange: tempRange,
            plugInIncluded,
            gensetIncluded,
            monitoringIncluded: true,
          }
        : undefined,
    }

    let saved: RateMasterRecord
    if (initialRate) {
      saved = freightPricingService.updateRate(initialRate.id, payload)
    } else {
      saved = freightPricingService.createRate(payload)
    }

    onSaved(saved)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Tag className="h-5 w-5 text-indigo-600" />
            <span>{initialRate ? `Edit Freight Rate: ${initialRate.rateCode}` : 'Create New Freight Rate Master'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Rate Code & Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Rate Reference Code *</Label>
              <Input
                value={rateCode}
                onChange={(e) => setRateCode(e.target.value)}
                className="mt-1 h-8 text-xs font-mono font-bold uppercase"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold">Rate Name / Description *</Label>
              <Input
                placeholder="e.g. Nhava Sheva to Kabul 40RF Full-Way"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-8 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Rate Type, Container, Service Scope */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Rate Classification *</Label>
              <Select value={rateType} onValueChange={(v) => setRateType(v as RateType)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="SELL_RATE">Standard Sell Rate</SelectItem>
                  <SelectItem value="BUY_RATE">Supplier Buy Cost</SelectItem>
                  <SelectItem value="CUSTOMER_RATE">Customer-Specific Rate</SelectItem>
                  <SelectItem value="CONTRACT_RATE">Long-Term Contract Rate</SelectItem>
                  <SelectItem value="SPOT_RATE">Spot Market Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Equipment / Container *</Label>
              <Select value={containerType} onValueChange={(v) => setContainerType(v as ContainerType)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {CONTAINER_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} {c.includes('RF') ? '❄️ Reefer' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Service Scope *</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Route Template & Origin/Dest */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <Label className="text-xs font-semibold">Route Master Template</Label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select Route..." />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="none">None (Custom Corridor)</SelectItem>
                  {routesList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Origin Point *</Label>
              <Input
                placeholder="e.g. Nhava Sheva Port, India"
                value={originName}
                onChange={(e) => setOriginName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Destination Point *</Label>
              <Input
                placeholder="e.g. Kabul ICD, Afghanistan"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          {/* Financials: Buy Rate vs Sell Rate */}
          <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Freight Pricing & Estimated Gross Margin</span>
              <span className="text-[11px] font-mono text-slate-500">Currency: {currency}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Base Buy Cost ({currency}) *
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={baseBuyRate || ''}
                  onChange={(e) => setBaseBuyRate(parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-xs font-mono font-bold text-rose-700"
                  placeholder="Carrier Buy"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Quoted Sell Rate ({currency}) *
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={baseSellRate || ''}
                  onChange={(e) => setBaseSellRate(parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-xs font-mono font-bold text-blue-700"
                  placeholder="Customer Sell"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Pricing Unit</Label>
                <Select value={rateUnit} onValueChange={(v) => setRateUnit(v as RateUnit)}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="PER_CONTAINER">Per Container</SelectItem>
                    <SelectItem value="PER_KG">Per KG (Air)</SelectItem>
                    <SelectItem value="PER_TON">Per Metric Ton</SelectItem>
                    <SelectItem value="PER_CBM">Per CBM</SelectItem>
                    <SelectItem value="PER_SHIPMENT">Flat per Shipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Est. Gross Margin
                </Label>
                <div className="mt-1 h-8 px-2 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                  <span>+{grossMargin.toLocaleString()}</span>
                  <span className="text-[10px]">({marginPct}%)</span>
                </div>
              </div>
            </div>

            {grossMargin < 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-rose-100 text-rose-900 text-xs font-bold">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Negative Margin Warning: Sell price is lower than estimated carrier buy cost!</span>
              </div>
            )}
          </div>

          {/* Conditional Reefer Details */}
          {isReefer && (
            <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-cyan-900 dark:text-cyan-200 font-bold text-xs">
                <Snowflake className="h-4 w-4 text-cyan-600" />
                <span>Refrigerated Container (Reefer) Specifications</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">Temperature Range</Label>
                  <Input
                    value={tempRange}
                    onChange={(e) => setTempRange(e.target.value)}
                    placeholder="e.g. -18°C or +2°C to +8°C"
                    className="h-7 text-xs font-mono font-bold"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="plugIn"
                    checked={plugInIncluded}
                    onChange={(e) => setPlugInIncluded(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <Label htmlFor="plugIn" className="text-xs cursor-pointer">
                    Plug-In / Power Included
                  </Label>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="genset"
                    checked={gensetIncluded}
                    onChange={(e) => setGensetIncluded(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <Label htmlFor="genset" className="text-xs cursor-pointer">
                    Genset Generator Included
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Stakeholders & Validity Dates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold">Valid From *</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Valid Until *</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Supplier / Shipping Line</Label>
              <Input
                placeholder="e.g. Maersk, Herat Co-op"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Customer (If Customer Rate)</Label>
              <Input
                placeholder="Leave blank for general rate"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">Operational & Validity Notes</Label>
            <Input
              placeholder="e.g. Includes 14 free days demurrage at destination ICD"
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
          <Button onClick={handleSave} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {initialRate ? 'Save Rate Changes' : 'Create Rate Card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
