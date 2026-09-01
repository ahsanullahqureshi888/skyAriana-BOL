"use client"

import React, { useState, useMemo } from "react"
import {
  Truck,
  Ship,
  DollarSign,
  Percent,
  ShieldAlert,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Check,
  FileText,
  Calculator,
  Layers,
  Sparkles,
  TrendingUp,
  MapPin,
  Anchor,
  Globe2,
  RefreshCw,
  Share2,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Coins,
  ChevronRight,
  Info,
  ThermometerSnowflake,
  Zap,
  Shield,
  Box,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useApp } from "@/lib/app-context"
import {
  dougharounToMersinLegs,
  nimrozToBandarAbbasLegs,
  dogharonToMersinReeferLegs,
  dogharonToMersinReeferCosts,
  OCEAN_FREIGHT_PRESETS,
  EXPORT_CORRIDOR_PRESETS,
  generateMultiLegQuote,
  exportCorridorToBillOfLadingRoutes,
  generateQuoteLedgerJournal,
} from "@/lib/services/multi-leg-quote-service"
import type { ExportLeg, ExportCorridorPreset, OceanFreightPreset, EquipmentType } from "@/lib/types/export-routing"

interface ExportLogisticsCalculatorProps {
  onApplyToBOL?: (routes: any[], freightUSD: number, equipmentType?: string) => void
  onPostToLedger?: (journalEntries: any[]) => void
  className?: string
}

export function ExportLogisticsCalculator({
  onApplyToBOL,
  onPostToLedger,
  className = "",
}: ExportLogisticsCalculatorProps) {
  const { setView } = useApp()

  // Selected Preset or Custom
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>("corridor-dgh-mersin-reefer")
  const [legs, setLegs] = useState<ExportLeg[]>(() => JSON.parse(JSON.stringify(dogharonToMersinReeferLegs)))

  // Simulation Parameters
  const [equipmentType, setEquipmentType] = useState<EquipmentType>("40RF")
  const [temperatureSetting, setTemperatureSetting] = useState<string>("-18°C Frozen")
  const [oceanFreight, setOceanFreight] = useState<number>(7020.0) // $6,500 + 8% TRF
  const [riskBuffer, setRiskBuffer] = useState<number>(0.0)
  const [targetMargin, setTargetMargin] = useState<number>(15.0) // 15% Target Profit Margin
  const [pricingMethod, setPricingMethod] = useState<"margin" | "markup">("margin")
  const [destinationPortName, setDestinationPortName] = useState<string>("Mersin Port (40RF Reefer + 8% TRF)")
  const [currencyMode, setCurrencyMode] = useState<"USD" | "AFN">("USD")
  const [shipperName, setShipperName] = useState<string>("Ariana Reefer Consignments")

  // Copy state
  const [copiedEnglish, setCopiedEnglish] = useState(false)
  const [copiedPersian, setCopiedPersian] = useState(false)

  // Switch Corridor Preset
  const handleSelectCorridor = (preset: ExportCorridorPreset) => {
    setSelectedCorridorId(preset.id)
    setLegs(JSON.parse(JSON.stringify(preset.legs)))
    setRiskBuffer(preset.defaultRiskBuffer)
    setTargetMargin(preset.defaultTargetMargin)
    setEquipmentType(preset.equipmentType || "40RF")
    if (preset.temperatureSetting) {
      setTemperatureSetting(preset.temperatureSetting)
    }
    if (preset.defaultOceanFreight > 0) {
      setOceanFreight(preset.defaultOceanFreight)
    }
    toast.success(`Loaded ${preset.name}`, {
      description: preset.namePersian,
    })
  }

  // Handle Ocean Preset Selection
  const handleSelectOceanPreset = (preset: OceanFreightPreset) => {
    setOceanFreight(preset.defaultCostUSD)
    setDestinationPortName(preset.destinationPort)
    if (preset.isReeferRate) {
      setEquipmentType("40RF")
      if (!temperatureSetting) setTemperatureSetting("-18°C Frozen")
    }
    toast.info(`Ocean Destination: ${preset.destinationPort}`, {
      description: `Rate: $${preset.defaultCostUSD} USD ${preset.trfIncluded ? "(incl. 8% TRF)" : ""} • Est. ${preset.transitDaysEstimated} Days`,
    })
  }

  // Leg Manipulation
  const handleUpdateLeg = (index: number, field: keyof ExportLeg, value: any) => {
    setLegs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAddLeg = () => {
    const newLeg: ExportLeg = {
      id: `leg-custom-${Date.now()}`,
      location: "New Transit Point",
      locationPersian: "ایستگاه ترانزیتی جدید",
      costType: "Handling / Accessorial Fee",
      costTypePersian: "هزینه حمل و ترانزیت",
      cost: 150.0,
      transportMode: "truck",
      notes: "Custom transit stop or accessorial checkpoint",
    }
    setLegs((prev) => [...prev, newLeg])
    setSelectedCorridorId("custom")
  }

  const handleRemoveLeg = (index: number) => {
    if (legs.length <= 1) {
      toast.warning("At least one transit leg is required")
      return
    }
    setLegs((prev) => prev.filter((_, i) => i !== index))
    setSelectedCorridorId("custom")
  }

  // Compute Quote Result
  const quoteResult = useMemo(() => {
    return generateMultiLegQuote(oceanFreight, legs, riskBuffer, targetMargin, {
      destinationPort: destinationPortName,
      pricingMethod,
      shipperName,
      equipmentType,
      temperatureSetting,
    })
  }, [oceanFreight, legs, riskBuffer, targetMargin, pricingMethod, destinationPortName, shipperName, equipmentType, temperatureSetting])

  // Copy Handlers
  const handleCopyEnglish = () => {
    navigator.clipboard.writeText(quoteResult.formattedDossierText)
    setCopiedEnglish(true)
    setTimeout(() => setCopiedEnglish(false), 2000)
    toast.success("Quotation Dossier Copied", {
      description: "English quotation copied to clipboard",
    })
  }

  const handleCopyPersian = () => {
    navigator.clipboard.writeText(quoteResult.formattedDossierPersian)
    setCopiedPersian(true)
    setTimeout(() => setCopiedPersian(false), 2000)
    toast.success("پیش‌فاکتور کاپی شد", {
      description: "متن فارسی/پشتو کوتیشن در حافظه ذخیره گردید",
    })
  }

  // Apply directly to Bill of Lading
  const handleApplyToBOL = () => {
    const bolRoutes = exportCorridorToBillOfLadingRoutes(legs)
    if (onApplyToBOL) {
      onApplyToBOL(bolRoutes, quoteResult.finalQuotedPriceUSD, equipmentType)
    } else {
      try {
        const draftKey = "skybol:active-export-routes-draft"
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({
            routes: bolRoutes,
            shipping_cost: quoteResult.finalQuotedPriceUSD.toString(),
            equipment_type: equipmentType,
            temperature_setting: temperatureSetting,
            container_type: equipmentType,
            remarks: `Export Multi-Leg Corridor (${equipmentType}): ${quoteResult.destinationPort} | Base: $${quoteResult.totalBaseCostUSD} + Margin: ${quoteResult.targetMarginPercent}%${quoteResult.escortFeeUSD > 0 ? ` | Escort Fee: $${quoteResult.escortFeeUSD}` : ""}${quoteResult.pluggingFeeUSD > 0 ? ` | Plugging: $${quoteResult.pluggingFeeUSD}` : ""}`,
          })
        )
        toast.success("Export Corridor Applied to Bill of Lading", {
          description: `${bolRoutes.length} route stops loaded with ${equipmentType} specifications`,
        })
        setView("bol")
      } catch (err) {
        toast.error("Failed to transfer routes to BOL editor")
      }
    }
  }

  // Post to Company Ledger
  const handlePostLedger = () => {
    const journal = generateQuoteLedgerJournal(quoteResult, shipperName)
    if (onPostToLedger) {
      onPostToLedger(journal)
    } else {
      toast.success("Accounting Ledger Journal Generated", {
        description: `Verified Balance Invariance: Debit $${journal[0].debitUSD} = Balance $${journal[0].balanceUSD}`,
      })
    }
  }

  return (
    <div className={`space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 ${className}`}>
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Export & Reverse-Transit Logistics Engine
                </h2>
                {quoteResult.isReefer && (
                  <Badge className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 text-[11px] gap-1 font-bold">
                    <ThermometerSnowflake className="w-3.5 h-3.5" />
                    Reefer ({equipmentType})
                  </Badge>
                )}
              </div>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
                Inland Border Clearance, Plugging Charges, Escort Service (مامور بدرقه), TRF Taxes & Multi-Leg Quotes
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Actions */}
        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setCurrencyMode("USD")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currencyMode === "USD"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => setCurrencyMode("AFN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currencyMode === "AFN"
                  ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              ؋ AFN
            </button>
          </div>

          <Button
            onClick={handleApplyToBOL}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
          >
            <Truck className="w-4 h-4" />
            Apply to BOL
          </Button>
        </div>
      </div>

      {/* Corridor Preset Selector Tabs (3 Corridors) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EXPORT_CORRIDOR_PRESETS.map((preset) => {
          const isSelected = selectedCorridorId === preset.id
          const isReeferCard = preset.routeCode === "DGH-MERSIN-REEFER"
          return (
            <div
              key={preset.id}
              onClick={() => handleSelectCorridor(preset)}
              className={`cursor-pointer rounded-2xl p-4 md:p-5 border transition-all duration-200 ${
                isSelected
                  ? isReeferCard
                    ? "bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40"
                    : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-500/80 shadow-md ring-1 ring-blue-500/40"
                  : "bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-900 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        isSelected
                          ? isReeferCard
                            ? "bg-cyan-600 text-white border-cyan-600"
                            : "bg-blue-600 text-white border-blue-600"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {preset.routeCode === "DGH-MERSIN-REEFER"
                        ? "❄️ Route 3 (Reefer)"
                        : preset.routeCode === "DGH-MERSIN"
                        ? "🇹🇷 Route 1 (Dry)"
                        : "🇮🇷 Route 2 (South)"}
                    </Badge>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium line-clamp-2">
                    {preset.description}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-sans mt-1" dir="rtl">
                    {preset.namePersian}
                  </p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-[10px] text-zinc-400 block">Legs Total</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    ${preset.legs.reduce((s, l) => s + l.cost, 0).toLocaleString()} USD
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Transit & Accessorials */}
        <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Transit & Fees</span>
              <Truck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {currencyMode === "USD"
                ? `$${quoteResult.inlandAndBorderCostUSD.toLocaleString()}`
                : `؋${quoteResult.inlandAndBorderCostAFN.toLocaleString()}`}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">{legs.length} Stops (Escort / Plug)</p>
          </CardContent>
        </Card>

        {/* Card 2: Ocean Freight (with TRF) */}
        <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Ocean Freight</span>
              <Ship className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {currencyMode === "USD"
                ? `$${quoteResult.oceanFreightCostUSD.toLocaleString()}`
                : `؋${quoteResult.oceanFreightCostAFN.toLocaleString()}`}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">Includes 8% TRF Tax</p>
          </CardContent>
        </Card>

        {/* Card 3: Escort & Plugging */}
        <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Escort & Plug</span>
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              ${(quoteResult.escortFeeUSD + quoteResult.pluggingFeeUSD).toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              {quoteResult.escortFeeUSD > 0 ? "مامور بدرقه + " : ""}
              {quoteResult.pluggingFeeUSD > 0 ? "Plugging" : "None"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Base COGS (Grand Total Base Cost) */}
        <Card className="bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Grand Total Cost</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {currencyMode === "USD"
                ? `$${quoteResult.totalBaseCostUSD.toLocaleString()}`
                : `؋${quoteResult.totalBaseCostAFN.toLocaleString()}`}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">Total Base Operating Cost</p>
          </CardContent>
        </Card>

        {/* Card 5: Target Profit */}
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 rounded-xl shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Net Profit</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg md:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
              {currencyMode === "USD"
                ? `$${quoteResult.grossProfitUSD.toLocaleString()}`
                : `؋${quoteResult.grossProfitAFN.toLocaleString()}`}
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {quoteResult.targetMarginPercent}% Margin ({quoteResult.effectiveMarkupPercent.toFixed(1)}% Markup)
            </p>
          </CardContent>
        </Card>

        {/* Card 6: Final Customer Quote */}
        <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 text-white rounded-xl shadow-md border-0 col-span-2 md:col-span-1">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-blue-100">
              <span className="text-[11px] font-bold uppercase tracking-wider">Final Quote</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-white">
              {currencyMode === "USD"
                ? `$${quoteResult.finalQuotedPriceUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : `؋${quoteResult.finalQuotedPriceAFN.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-[10px] text-blue-200 truncate">Total / (1 - Margin)</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Legs Table & Quotation Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Chronological Leg Node Sequence Table */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Chronological Route Nodes & Fee Schedule
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Configure Escort Service (مامور بدرقه), Plugging charges, road trucking, and commissions
                </p>
              </div>
              <Button
                onClick={handleAddLeg}
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1 border-dashed border-zinc-300 dark:border-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Leg
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3 w-10">#</th>
                    <th className="p-3">Location / Stop</th>
                    <th className="p-3">Fee / Cost Type</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Cost (USD)</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {legs.map((leg, index) => (
                    <tr
                      key={leg.id || index}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-zinc-400">
                        {index + 1}
                      </td>
                      <td className="p-3 space-y-1 min-w-[160px]">
                        <Input
                          value={leg.location}
                          onChange={(e) => handleUpdateLeg(index, "location", e.target.value)}
                          className="h-8 text-xs font-semibold bg-white dark:bg-zinc-900"
                          placeholder="Stop Location"
                        />
                        {leg.notes && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block line-clamp-1">
                            {leg.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <Input
                          value={leg.costType}
                          onChange={(e) => handleUpdateLeg(index, "costType", e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-zinc-900"
                          placeholder="e.g. Escort Service, Plugging Charges"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={leg.transportMode || "truck"}
                          onChange={(e) => handleUpdateLeg(index, "transportMode", e.target.value)}
                          className="h-8 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 text-zinc-800 dark:text-zinc-200"
                        >
                          <option value="truck">🚛 Truck</option>
                          <option value="customs">🏛️ Customs / Escort</option>
                          <option value="vessel">🚢 Port / Reefer</option>
                          <option value="train">🚆 Train</option>
                        </select>
                      </td>
                      <td className="p-3 text-right min-w-[110px]">
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-zinc-400 font-mono">$</span>
                          <Input
                            type="number"
                            step="10"
                            value={leg.cost}
                            onChange={(e) => handleUpdateLeg(index, "cost", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs font-mono font-bold text-right pl-6 bg-white dark:bg-zinc-900"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLeg(index)}
                          className="h-7 w-7 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-50 dark:bg-zinc-900/60 font-bold border-t border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <td colSpan={4} className="p-3 text-right text-zinc-600 dark:text-zinc-400">
                      Transit & Accessorial Legs Total:
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-950 dark:text-zinc-50">
                      ${quoteResult.inlandAndBorderCostUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Quotation Parameters Card */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-500" />
                Equipment, Ocean Freight & Margin Formula Controls
              </h3>
              <Badge variant="outline" className="text-[11px] font-mono">
                Formula: Grand Total Cost / (1 - Margin)
              </Badge>
            </div>

            {/* Equipment Type & Temperature Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-blue-500" />
                  Equipment Type:
                </label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 font-semibold"
                >
                  <option value="40RF">❄️ 40RF - 40ft High Cube Reefer (Plugging Active)</option>
                  <option value="20RF">❄️ 20RF - 20ft Standard Reefer (Plugging Active)</option>
                  <option value="40HR">❄️ 40HR - 40ft High Cube Reefer</option>
                  <option value="40HC">📦 40HC - 40ft High Cube Dry Standard</option>
                  <option value="20GP">📦 20GP - 20ft General Purpose Dry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-500" />
                  Temperature Setting:
                </label>
                <Input
                  value={temperatureSetting}
                  onChange={(e) => setTemperatureSetting(e.target.value)}
                  placeholder="e.g. -18°C Frozen / +4°C Chilled"
                  className="h-8 text-xs bg-white dark:bg-zinc-800 font-semibold"
                />
              </div>
            </div>

            {/* Ocean Destination Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Ocean Freight Presets (Including TRF):
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {OCEAN_FREIGHT_PRESETS.map((preset) => {
                  const isMatch = oceanFreight === preset.defaultCostUSD
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectOceanPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs ${
                        isMatch
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/30"
                          : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="font-bold truncate">{preset.destinationPort.split("(")[0]}</div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                        <span className="font-mono font-semibold">${preset.defaultCostUSD}</span>
                        <span>{preset.isReeferRate ? "❄️ Reefer" : "📦 Dry"}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Parameter Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Ocean Freight Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-600 dark:text-zinc-400">Ocean Freight ($)</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    ${oceanFreight.toLocaleString()}
                  </span>
                </div>
                <Input
                  type="number"
                  step="20"
                  value={oceanFreight}
                  onChange={(e) => setOceanFreight(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs font-mono font-semibold"
                />
              </div>

              {/* Risk Buffer */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-600 dark:text-zinc-400">Risk Buffer ($)</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    ${riskBuffer.toLocaleString()}
                  </span>
                </div>
                <Input
                  type="number"
                  step="25"
                  value={riskBuffer}
                  onChange={(e) => setRiskBuffer(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs font-mono font-semibold"
                />
              </div>

              {/* Target Margin % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-600 dark:text-zinc-400">Target Margin (%)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {targetMargin}%
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="95"
                  step="1"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs font-mono font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Breakdown, Cost Distribution & Formal Dossier (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Visual Cost Allocation Progress Bars */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                Cost Breakdown & Revenue Share
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500">
                100% Total Quoted
              </span>
            </h3>

            {/* Stacked Percentage Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                {quoteResult.escortFeeUSD > 0 && (
                  <div
                    style={{ width: `${(quoteResult.escortFeeUSD / quoteResult.finalQuotedPriceUSD) * 100}%` }}
                    className="bg-amber-500 hover:opacity-90 transition-all"
                    title={`Escort Service: $${quoteResult.escortFeeUSD}`}
                  />
                )}
                {quoteResult.pluggingFeeUSD > 0 && (
                  <div
                    style={{ width: `${(quoteResult.pluggingFeeUSD / quoteResult.finalQuotedPriceUSD) * 100}%` }}
                    className="bg-cyan-500 hover:opacity-90 transition-all"
                    title={`Plugging Charges: $${quoteResult.pluggingFeeUSD}`}
                  />
                )}
                <div
                  style={{ width: `${(quoteResult.inlandTruckingCostUSD / quoteResult.finalQuotedPriceUSD) * 100}%` }}
                  className="bg-blue-500 hover:opacity-90 transition-all"
                  title={`Inland Trucking: $${quoteResult.inlandTruckingCostUSD}`}
                />
                <div
                  style={{ width: `${(quoteResult.oceanFreightTotalUSD / quoteResult.finalQuotedPriceUSD) * 100}%` }}
                  className="bg-indigo-500 hover:opacity-90 transition-all"
                  title={`Ocean Freight (TRF): $${quoteResult.oceanFreightTotalUSD}`}
                />
                <div
                  style={{ width: `${(quoteResult.grossProfitUSD / quoteResult.finalQuotedPriceUSD) * 100}%` }}
                  className="bg-emerald-500 hover:opacity-90 transition-all"
                  title={`Net Profit: $${quoteResult.grossProfitUSD}`}
                />
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                {quoteResult.escortFeeUSD > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                    <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Escort (مامور بدرقه)
                    </span>
                    <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                      ${quoteResult.escortFeeUSD}
                    </span>
                  </div>
                )}

                {quoteResult.pluggingFeeUSD > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40">
                    <span className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      Plugging (7 Days)
                    </span>
                    <span className="font-mono font-bold text-cyan-900 dark:text-cyan-200">
                      ${quoteResult.pluggingFeeUSD}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Inland Trucking
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    ${quoteResult.inlandTruckingCostUSD}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Ocean + TRF
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    ${quoteResult.oceanFreightTotalUSD}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 col-span-2">
                  <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Net Profit ({quoteResult.targetMarginPercent}% Margin)
                  </span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                    ${quoteResult.grossProfitUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bilingual Quotation Dossier Preview */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Formal Quotation Dossier
              </h3>
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={handleCopyEnglish}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  {copiedEnglish ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  EN
                </Button>
                <Button
                  onClick={handleCopyPersian}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  {copiedPersian ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  فا / پښتو
                </Button>
              </div>
            </div>

            <div className="bg-zinc-900 text-zinc-200 p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[300px] border border-zinc-800 select-all">
              <pre className="whitespace-pre">{quoteResult.formattedDossierText}</pre>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                onClick={handlePostLedger}
                variant="outline"
                className="w-full text-xs font-semibold gap-1.5 h-9 rounded-xl border-zinc-300 dark:border-zinc-700"
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Post Ledger Journal
              </Button>
              <Button
                onClick={handleApplyToBOL}
                className="w-full text-xs font-semibold gap-1.5 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Truck className="w-4 h-4" />
                Load into BOL Draft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
