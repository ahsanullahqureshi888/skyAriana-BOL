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
  QuotationRecord,
  ContainerType,
  ServiceType,
  PricingChargeLine,
  RateMasterRecord,
} from '@/lib/types/freight-pricing'
import { freightPricingService } from '@/lib/services/freight-pricing-service'
import { routeLocationService } from '@/lib/services/route-location-service'
import {
  FileText,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Percent,
  ShieldCheck,
  Building,
} from 'lucide-react'

interface QuotationBuilderDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: (quote: QuotationRecord) => void
  initialQuote?: QuotationRecord | null
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

export function QuotationBuilderDrawer({
  open,
  onClose,
  onSaved,
  initialQuote,
}: QuotationBuilderDrawerProps) {
  // Customer info
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Route & Equipment
  const [originName, setOriginName] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [routeId, setRouteId] = useState('')
  const [commodity, setCommodity] = useState('')
  const [containerType, setContainerType] = useState<ContainerType>('40HC')
  const [containerQuantity, setContainerQuantity] = useState<number>(1)
  const [serviceType, setServiceType] = useState<ServiceType>('FULL_WAY')
  const [temperature, setTemperature] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [validUntil, setValidUntil] = useState('')

  // Pricing lines
  const [pricingLines, setPricingLines] = useState<PricingChargeLine[]>([])

  // Discount
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE' | 'PER_CONTAINER'>('FIXED')
  const [discountValue, setDiscountValue] = useState<number>(0)

  // Terms & Exclusions
  const [terms, setTerms] = useState<string[]>([
    'Rate validity subject to space and equipment availability.',
    'Includes 14 days free demurrage / detention at destination.',
    'Destination import customs duties, storage, and taxes are excluded.',
  ])
  const [includedServices, setIncludedServices] = useState<string[]>([
    'Ocean Freight',
    'Transit Border Guarantee',
    'Inland Road Trucking',
  ])
  const [excludedServices, setExcludedServices] = useState<string[]>([
    'Afghanistan Import Customs Duties & Taxes',
    'Demurrage beyond free days',
  ])
  const [internalNotes, setInternalNotes] = useState('')

  // Matching rates state
  const [matchingRates, setMatchingRates] = useState<RateMasterRecord[]>([])
  const [routesList, setRoutesList] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const rts = routeLocationService.getRoutes()
    setRoutesList(rts.map((r) => ({ id: r.id, name: r.name })))

    if (initialQuote) {
      setCustomerName(initialQuote.customerName)
      setCustomerContact(initialQuote.customerContact || '')
      setCustomerPhone(initialQuote.customerPhone || '')
      setCustomerAddress(initialQuote.customerAddress || '')
      setOriginName(initialQuote.originName)
      setDestinationName(initialQuote.destinationName)
      setRouteId(initialQuote.routeId || '')
      setCommodity(initialQuote.commodity || '')
      setContainerType(initialQuote.containerType)
      setContainerQuantity(initialQuote.containerQuantity)
      setServiceType(initialQuote.serviceType)
      setTemperature(initialQuote.temperature || '')
      setCurrency(initialQuote.currency)
      setValidUntil(initialQuote.validUntil)
      setPricingLines(JSON.parse(JSON.stringify(initialQuote.pricingLines)))
      setDiscountType(initialQuote.discountType || 'FIXED')
      setDiscountValue(initialQuote.discountValue || 0)
      setTerms(initialQuote.terms || [])
      setIncludedServices(initialQuote.includedServices || [])
      setExcludedServices(initialQuote.excludedServices || [])
      setInternalNotes(initialQuote.internalNotes || '')
    } else {
      setCustomerName('')
      setCustomerContact('')
      setCustomerPhone('')
      setCustomerAddress('')
      setOriginName('')
      setDestinationName('')
      setRouteId('')
      setCommodity('')
      setContainerType('40HC')
      setContainerQuantity(1)
      setServiceType('FULL_WAY')
      setTemperature('')
      setCurrency('USD')
      const nextMonth = new Date()
      nextMonth.setDate(nextMonth.getDate() + 14)
      setValidUntil(nextMonth.toISOString().split('T')[0])
      setPricingLines([])
      setDiscountType('FIXED')
      setDiscountValue(0)
      setInternalNotes('')
    }
  }, [initialQuote, open])

  // Look up matching rates whenever route, container, or customer changes
  useEffect(() => {
    const matchRes = freightPricingService.findMatchingRates({
      routeId: routeId || undefined,
      originName: originName || undefined,
      destinationName: destinationName || undefined,
      containerType,
      serviceType,
    })
    setMatchingRates(matchRes.activeMatches)
  }, [routeId, originName, destinationName, containerType, serviceType])

  // Live calculation
  const totals = freightPricingService.calculatePricingTotals(
    pricingLines,
    discountType,
    discountValue,
    containerQuantity
  )

  const handleApplyRate = (rate: RateMasterRecord) => {
    setOriginName(rate.originName)
    setDestinationName(rate.destinationName)
    setServiceType(rate.serviceType)
    setContainerType(rate.containerType)
    setCurrency(rate.currency)
    if (rate.routeId) setRouteId(rate.routeId)

    if (rate.reeferDetails?.temperatureRange) {
      setTemperature(rate.reeferDetails.temperatureRange)
    }

    if (rate.charges && rate.charges.length > 0) {
      // Scale lines with container quantity
      const scaledLines = rate.charges.map((c) => ({
        ...c,
        id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        quantity: c.unit === 'PER_CONTAINER' ? containerQuantity : c.quantity,
      }))
      setPricingLines(scaledLines)
    } else {
      // Create single freight line
      setPricingLines([
        {
          id: `pl-${Date.now()}`,
          chargeCode: 'OCEAN_FREIGHT',
          chargeName: `${rate.name} Freight`,
          category: 'FREIGHT',
          buyAmount: rate.baseBuyRate,
          sellAmount: rate.baseSellRate,
          currency: rate.currency,
          quantity: containerQuantity,
          unit: rate.rateUnit,
        },
      ])
    }
  }

  const handleAddChargeLine = () => {
    const newLine: PricingChargeLine = {
      id: `pl-${Date.now()}`,
      chargeCode: 'MISC_FEE',
      chargeName: 'Freight Service Charge',
      category: 'FREIGHT',
      buyAmount: 0,
      sellAmount: 0,
      currency,
      quantity: 1,
      unit: 'PER_CONTAINER',
    }
    setPricingLines([...pricingLines, newLine])
  }

  const handleUpdateChargeLine = (idx: number, updates: Partial<PricingChargeLine>) => {
    const copy = [...pricingLines]
    copy[idx] = { ...copy[idx], ...updates }
    setPricingLines(copy)
  }

  const handleRemoveChargeLine = (idx: number) => {
    setPricingLines(pricingLines.filter((_, i) => i !== idx))
  }

  const handleSave = (status: QuotationRecord['status'] = 'DRAFT') => {
    if (!customerName.trim()) {
      alert('Customer name is required')
      return
    }
    if (!originName.trim() || !destinationName.trim()) {
      alert('Origin and Destination are required')
      return
    }
    if (pricingLines.length === 0) {
      alert('Please add at least one pricing line or apply a rate')
      return
    }

    const payload = {
      customerName: customerName.trim(),
      customerContact: customerContact.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      validUntil: validUntil || new Date().toISOString().split('T')[0],
      originName: originName.trim(),
      destinationName: destinationName.trim(),
      routeId: routeId || undefined,
      routeName: routesList.find((r) => r.id === routeId)?.name || undefined,
      commodity: commodity.trim() || undefined,
      containerType,
      containerQuantity,
      serviceType,
      temperature: temperature.trim() || undefined,
      currency,
      pricingLines,
      discountType,
      discountValue,
      terms,
      includedServices,
      excludedServices,
      status,
      internalNotes: internalNotes.trim() || undefined,
      createdBy: 'sales_desk',
    }

    let saved: QuotationRecord
    if (initialQuote) {
      saved = freightPricingService.updateQuotation(initialQuote.id, payload)
    } else {
      saved = freightPricingService.createQuotation(payload)
    }

    onSaved(saved)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span>{initialQuote ? `Edit Quotation: ${initialQuote.quotationNumber}` : 'Create Freight Quotation'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Section 1: Customer Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-indigo-600" />
              Customer Information
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Customer Company Name *</Label>
                <Input
                  placeholder="e.g. Alokozay Limited"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 h-8 text-xs font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input
                  placeholder="e.g. Haji Abdul Wase"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Phone / WhatsApp</Label>
                <Input
                  placeholder="e.g. +93 79 912 3456"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Route, Commodity & Equipment */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold">Origin Location *</Label>
              <Input
                placeholder="e.g. Nhava Sheva (JNPT)"
                value={originName}
                onChange={(e) => setOriginName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Destination Location *</Label>
              <Input
                placeholder="e.g. Kabul ICD"
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Container Type</Label>
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
              <Label className="text-xs font-semibold">Container Quantity</Label>
              <Input
                type="number"
                min="1"
                value={containerQuantity}
                onChange={(e) => setContainerQuantity(parseInt(e.target.value) || 1)}
                className="mt-1 h-8 text-xs font-bold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold">Service Scope</Label>
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
            <div>
              <Label className="text-xs font-semibold">Cargo Commodity</Label>
              <Input
                placeholder="e.g. Fresh Tea, Textiles, Pomegranates"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            {containerType.includes('RF') && (
              <div>
                <Label className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  Required Temperature
                </Label>
                <Input
                  placeholder="e.g. -18°C or +2°C to +8°C"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-1 h-8 text-xs font-mono font-bold"
                />
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold">Quote Validity Date *</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          {/* Section 3: Matching Rate Suggestions Panel */}
          {matchingRates.length > 0 && (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-2">
              <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200">
                <span className="font-bold flex items-center gap-1 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Matching Active Rates Found in Master ({matchingRates.length})
                </span>
                <span className="text-[10px] text-indigo-600">Click to auto-populate pricing lines</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {matchingRates.map((mr) => (
                  <div
                    key={mr.id}
                    onClick={() => handleApplyRate(mr)}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded cursor-pointer hover:border-indigo-500 hover:shadow-xs transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{mr.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {mr.serviceType.replace('_', ' ')} • {mr.supplierName || 'Standard Corridor'}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold text-blue-600">
                        {mr.currency} {mr.baseSellRate.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Buy: {mr.baseBuyRate.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Itemized Pricing Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase">
                Pricing Lines ({pricingLines.length})
              </span>
              <Button type="button" size="sm" onClick={handleAddChargeLine} className="h-7 text-xs bg-indigo-600 text-white font-semibold">
                <Plus className="h-3 w-3 mr-1" /> Add Charge Line
              </Button>
            </div>

            <div className="space-y-1.5">
              {pricingLines.map((line, idx) => (
                <div
                  key={line.id || idx}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                >
                  <div className="md:col-span-4">
                    <Input
                      placeholder="Service Charge Description"
                      value={line.chargeName}
                      onChange={(e) => handleUpdateChargeLine(idx, { chargeName: e.target.value })}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Buy Cost"
                      value={line.buyAmount || ''}
                      onChange={(e) => handleUpdateChargeLine(idx, { buyAmount: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs font-mono text-rose-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Sell Price"
                      value={line.sellAmount || ''}
                      onChange={(e) => handleUpdateChargeLine(idx, { sellAmount: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs font-mono font-bold text-blue-700"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.quantity || 1}
                      onChange={(e) => handleUpdateChargeLine(idx, { quantity: parseFloat(e.target.value) || 1 })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!line.isIncludedInFreight}
                        onChange={(e) => handleUpdateChargeLine(idx, { isIncludedInFreight: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span>Included</span>
                    </label>
                  </div>

                  <div className="md:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveChargeLine(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Discount & Financial Summary */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Discount:
                </span>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                  <SelectTrigger className="h-7 w-28 text-xs bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="PER_CONTAINER">Per Container</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-7 w-24 text-xs font-mono font-bold bg-white dark:bg-slate-900"
                  placeholder="0.00"
                />
              </div>

              <div className="text-right font-mono">
                <span className="text-[11px] text-slate-500 mr-2">Total Sell Price:</span>
                <span className="text-base font-black text-blue-700 dark:text-blue-300">
                  {currency} {totals.totalSellPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                <span>Total Buy Cost: <strong className="text-rose-700">{totals.totalBuyCost.toLocaleString()}</strong></span>
                <span>Discount: <strong>{totals.discountAmount.toLocaleString()}</strong></span>
                <span>Gross Margin: <strong className="text-emerald-700">+{totals.estimatedGrossMargin.toLocaleString()} ({totals.marginPercentage}%)</strong></span>
              </div>

              {totals.marginPercentage < 5 && (
                <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Margin &lt; 5%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('DRAFT')}
              className="h-8 text-xs font-semibold"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('APPROVED')}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Save & Approve Quote
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
