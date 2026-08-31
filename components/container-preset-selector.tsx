"use client"

import { useState, useEffect, useRef } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Boxes,
  ChevronDown,
  Search,
  Check,
  Plus,
  Trash2,
  X,
  Sparkles,
  ThermometerSnowflake,
  ShieldCheck,
  Zap,
  Wind,
} from "lucide-react"

export interface ContainerTypePreset {
  value: string
  label: string
  labelPs: string
  icon: string
  category: "reefer" | "dry" | "special"
}

export const CONTAINER_TYPE_PRESETS: ContainerTypePreset[] = [
  // Reefer
  { value: "1X40' RF", label: "40ft Reefer (1X40' RF)", labelPs: "۴۰ فوت یخچالی", icon: "❄️", category: "reefer" },
  { value: "1X40' HR", label: "40ft High Cube Reefer (1X40' HR)", labelPs: "۴۰ فوت های کیوب یخچالی", icon: "❄️", category: "reefer" },
  { value: "2X40' RF", label: "2x 40ft Reefer (2X40' RF)", labelPs: "۲ دانه ۴۰ فوت یخچالی", icon: "❄️", category: "reefer" },
  { value: "1X20' RF", label: "20ft Reefer (1X20' RF)", labelPs: "۲۰ فوت یخچالی", icon: "❄️", category: "reefer" },
  
  // Dry Standard
  { value: "1X40' HC", label: "40ft High Cube (1X40' HC)", labelPs: "۴۰ فوت های کیوب", icon: "📦", category: "dry" },
  { value: "1X40' Dry", label: "40ft Standard Dry (1X40' Dry)", labelPs: "۴۰ فوت معیاري وچ", icon: "📦", category: "dry" },
  { value: "2X40' HC", label: "2x 40ft High Cube (2X40' HC)", labelPs: "۲ دانه ۴۰ فوت های کیوب", icon: "📦", category: "dry" },
  { value: "1X20' GP", label: "20ft General Purpose (1X20' GP)", labelPs: "۲۰ فوت عمومي", icon: "📦", category: "dry" },
  { value: "1X40' Open Top", label: "40ft Open Top (1X40' OT)", labelPs: "۴۰ فوت سر خلاص", icon: "📦", category: "dry" },
  { value: "1X40' Flat Rack", label: "40ft Flat Rack (1X40' FR)", labelPs: "۴۰ فوت فلیټ ریک", icon: "📦", category: "dry" },

  // Special / Regional
  { value: "1X40J", label: "1X40J Combo Container", labelPs: "کانټینر 1X40J", icon: "🚢", category: "special" },
  { value: "1X45' HC", label: "45ft High Cube (1X45' HC)", labelPs: "۴۵ فوت های کیوب", icon: "🚢", category: "special" },
]

export const CONTAINER_PREFIX_SHORTCUTS = [
  "MSCU",
  "SEGU",
  "TGHU",
  "CMAU",
  "TCLU",
  "MEDU",
  "HLXU",
  "MAEU",
  "COSU",
]

export const CONTAINER_DETAILS_PRESETS = [
  { text: "❄️ -18°C یخچالی", label: "-18°C یخچالی", icon: "❄️" },
  { text: "❄️ +4°C یخچالی", label: "+4°C یخچالی", icon: "❄️" },
  { text: "📦 معمولي وچ (Dry Cargo)", label: "معمولي Dry", icon: "📦" },
  { text: "🔒 ګمرکي مهر (Customs Sealed)", label: "ګمرک مهر", icon: "🔒" },
  { text: "⚡ ژنراتور فعال (GenSet Attached)", label: "ژنراتور GenSet", icon: "⚡" },
  { text: "💨 دریچه بنده (Vent Closed)", label: "دریچه بنده", icon: "💨" },
  { text: "💨 دریچه ۲۵٪ خلاصه (Vent 25% Open)", label: "دریچه ۲۵٪", icon: "💨" },
  { text: "🏷️ فوډ ګریډ (Food Grade)", label: "Food Grade", icon: "🏷️" },
  { text: "📐 های کیوب ۹.۶ فوټه (High Cube 9'6\")", label: "High Cube 9'6\"", icon: "📐" },
]

const CUSTOM_CONTAINER_PRESETS_KEY = "skybol:custom-container-presets"

interface ContainerPresetSelectorProps {
  containerNo: string
  containerType?: string
  containerDetails?: string
  onChangeContainerNo: (val: string) => void
  onChangeContainerType?: (val: string) => void
  onChangeContainerDetails?: (val: string) => void
  showDetailsField?: boolean
  showQuickChips?: boolean
}

export function ContainerPresetSelector({
  containerNo,
  containerType = "",
  containerDetails = "",
  onChangeContainerNo,
  onChangeContainerType,
  onChangeContainerDetails,
  showDetailsField = true,
  showQuickChips = true,
}: ContainerPresetSelectorProps) {
  const [typePopoverOpen, setTypePopoverOpen] = useState(false)
  const [detailsPopoverOpen, setDetailsPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [customTypes, setCustomTypes] = useState<string[]>([])
  const [newCustomInput, setNewCustomInput] = useState("")

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_CONTAINER_PRESETS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCustomTypes(parsed)
      }
    } catch {}
  }, [])

  const saveCustomType = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed || customTypes.includes(trimmed)) return
    const updated = [trimmed, ...customTypes]
    setCustomTypes(updated)
    try {
      window.localStorage.setItem(CUSTOM_CONTAINER_PRESETS_KEY, JSON.stringify(updated))
    } catch {}
    setNewCustomInput("")
  }

  const deleteCustomType = (val: string) => {
    const updated = customTypes.filter((c) => c !== val)
    setCustomTypes(updated)
    try {
      window.localStorage.setItem(CUSTOM_CONTAINER_PRESETS_KEY, JSON.stringify(updated))
    } catch {}
  }

  const handleSelectType = (typeVal: string) => {
    if (onChangeContainerType) {
      onChangeContainerType(typeVal)
    } else {
      // If no separate containerType handler, append or set into containerNo
      onChangeContainerNo(typeVal)
    }
    setTypePopoverOpen(false)
  }

  const handleApplyPrefix = (prefix: string) => {
    const current = (containerNo || "").trim()
    const parts = current.split(/\s+/)
    if (parts.length > 1 && CONTAINER_PREFIX_SHORTCUTS.includes(parts[0].toUpperCase())) {
      onChangeContainerNo(`${prefix} ${parts.slice(1).join(" ")}`)
    } else if (current) {
      onChangeContainerNo(`${prefix} ${current}`)
    } else {
      onChangeContainerNo(`${prefix} `)
    }
  }

  const handleSelectDetail = (detailVal: string) => {
    if (!onChangeContainerDetails) return
    const current = (containerDetails || "").trim()
    if (current) {
      if (!current.includes(detailVal)) {
        onChangeContainerDetails(`${current} | ${detailVal}`)
      }
    } else {
      onChangeContainerDetails(detailVal)
    }
    setDetailsPopoverOpen(false)
  }

  const filteredTypes = CONTAINER_TYPE_PRESETS.filter((item) => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      item.value.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.labelPs.toLowerCase().includes(q)
    )
  })

  // Quick chips for container type
  const quickTypeChips = [
    { label: "1X40' RF", ps: "یخچالی", icon: "❄️" },
    { label: "1X40' HC", ps: "های کیوب", icon: "📦" },
    { label: "1X40' Dry", ps: "معمولي", icon: "📦" },
    { label: "1X20' RF", ps: "۲۰ یخچالی", icon: "❄️" },
    { label: "1X20' GP", ps: "۲۰ عمومي", icon: "📦" },
    { label: "1X40J", ps: "1X40J", icon: "🚢" },
  ]

  return (
    <div className="space-y-2.5 w-full">
      {/* Top Row: Container Type & Container No Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Field 1: Container Type */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
              <Boxes className="w-3 h-3 text-blue-600" />
              <span>Container Type / د کانټینر ډول</span>
            </label>

            <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 rounded-md px-1.5 py-0.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                  <span>انتخاب ډول</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                className="w-80 sm:w-96 p-0 bg-white/98 backdrop-blur-xl border border-blue-200 shadow-2xl rounded-xl z-[150]"
                align="start"
                sideOffset={4}
              >
                {/* Header & Search */}
                <div className="p-2.5 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-blue-600" />
                      لیست انواع کانتینر (Container Types)
                    </span>
                    <button
                      type="button"
                      onClick={() => setTypePopoverOpen(false)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="لټون (Reefer, Dry, HC, 40ft...)"
                      className="pl-8 h-8 text-xs bg-white border-blue-200 focus:border-blue-500 rounded-lg text-slate-800"
                    />
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex gap-1 mt-2">
                    {[
                      { id: "all", label: "ټول (All)" },
                      { id: "reefer", label: "❄️ یخچالی" },
                      { id: "dry", label: "📦 وچ / عادي" },
                      { id: "special", label: "🚢 ځانګړي" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${
                          activeCategory === tab.id
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white/80 text-blue-900 hover:bg-blue-100/60 border border-blue-200/60"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                  {filteredTypes.map((t) => {
                    const isSelected = containerType === t.value || containerNo === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleSelectType(t.value)}
                        className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs font-semibold"
                            : "hover:bg-blue-50/80 text-slate-800 border border-transparent hover:border-blue-200/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{t.icon}</span>
                          <div>
                            <div className="font-bold text-[11px] leading-tight">{t.value}</div>
                            <div
                              className={`text-[10px] ${
                                isSelected ? "text-blue-100" : "text-slate-500"
                              }`}
                            >
                              {t.labelPs} • {t.label}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                      </button>
                    )
                  })}

                  {/* Custom Types */}
                  {customTypes.length > 0 && (
                    <div className="pt-2 border-t border-blue-100 mt-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">سفارشي انتخابونه</div>
                      {customTypes.map((c) => (
                        <div
                          key={c}
                          className="flex items-center justify-between p-1.5 hover:bg-blue-50/60 rounded-lg group"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectType(c)}
                            className="text-xs text-left font-medium text-slate-800 flex-1 truncate"
                          >
                            ⭐ {c}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomType(c)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Custom Type */}
                <div className="p-2 border-t border-blue-100 bg-slate-50/80 flex gap-1.5">
                  <Input
                    value={newCustomInput}
                    onChange={(e) => setNewCustomInput(e.target.value)}
                    placeholder="نوی ډول ورزیات کړئ..."
                    className="h-7 text-xs bg-white border-blue-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        saveCustomType(newCustomInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveCustomType(newCustomInput)}
                    disabled={!newCustomInput.trim()}
                    className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ثبت</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Input
            value={containerType || ""}
            onChange={(e) => onChangeContainerType && onChangeContainerType(e.target.value)}
            placeholder="مثال: 1X40' RF یا 1X40' HC"
            className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950"
          />

          {/* Quick Type Chips */}
          {showQuickChips && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {quickTypeChips.map((chip) => {
                const isActive = containerType === chip.label
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleSelectType(chip.label)}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white/90 text-blue-900 border-blue-200/90 hover:bg-blue-100/70 hover:border-blue-300"
                    }`}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Field 2: Container No (with Prefix Helper) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-blue-900 block">
              Container No / د کانټینر شمېره
            </label>
            <span className="text-[9.5px] font-semibold text-slate-500">شمېره یا بارکوډ</span>
          </div>

          <Input
            name="containerNo"
            value={containerNo || ""}
            onChange={(e) => onChangeContainerNo(e.target.value.toUpperCase())}
            placeholder="مثال: SEGU9872723 یا MSCU4591028"
            className="bg-white border-blue-200 focus:border-blue-500 text-xs font-mono font-bold h-9 text-blue-950 tracking-wider"
          />

          {/* Quick Prefix Pills */}
          {showQuickChips && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="text-[9.5px] font-bold text-slate-500 mr-0.5">مختاړی:</span>
              {CONTAINER_PREFIX_SHORTCUTS.slice(0, 6).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => handleApplyPrefix(pref)}
                  className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-slate-100/80 hover:bg-blue-100 text-slate-700 hover:text-blue-900 border border-slate-200/80 rounded transition-colors"
                >
                  +{pref}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Field 3: Container Details (د کانټینر تفصیلات / Details) */}
      {showDetailsField && (
        <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-200/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-blue-950 flex items-center gap-1">
              <ThermometerSnowflake className="w-3 h-3 text-emerald-600" />
              <span>Container Details & Conditions / د کانټینر تفصیلات او شرایط</span>
            </label>

            <Popover open={detailsPopoverOpen} onOpenChange={setDetailsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-md px-1.5 py-0.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  <span>انتخاب شرایط / تودوخه</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                className="w-72 sm:w-80 p-2 bg-white/98 backdrop-blur-xl border border-emerald-200 shadow-2xl rounded-xl z-[150]"
                align="end"
                sideOffset={4}
              >
                <div className="text-xs font-bold text-emerald-950 pb-1.5 mb-1.5 border-b border-emerald-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  شرایط او د یخچالي کانتینر درجه (Details)
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {CONTAINER_DETAILS_PRESETS.map((d) => (
                    <button
                      key={d.text}
                      type="button"
                      onClick={() => handleSelectDetail(d.text)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-emerald-50 text-xs font-medium text-slate-800 flex items-center gap-2 transition-colors"
                    >
                      <span>{d.icon}</span>
                      <span>{d.text}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Input
            value={containerDetails || ""}
            onChange={(e) => onChangeContainerDetails && onChangeContainerDetails(e.target.value)}
            placeholder="مثال: -18°C یخچالی | مهر ګمرک | GenSet ژنراتور لګیدلی"
            className="bg-white border-blue-200 focus:border-blue-500 text-xs font-medium h-8 text-blue-950"
          />

          {/* Quick Details Chips */}
          {showQuickChips && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {CONTAINER_DETAILS_PRESETS.slice(0, 5).map((chip) => {
                const isActive = (containerDetails || "").includes(chip.text)
                return (
                  <button
                    key={chip.text}
                    type="button"
                    onClick={() => handleSelectDetail(chip.text)}
                    className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                    }`}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
