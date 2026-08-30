"use client"

import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  ChevronDown,
  Search,
  Check,
  Snowflake,
  Box,
  Truck,
  Building2,
  Plus,
  Trash2,
  Layers,
} from "lucide-react"

export interface PresetCategory {
  id: string
  name: string
  icon: string
  options: string[]
}

const DEFAULT_PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: "reefer-mixed",
    name: "کانتینر یخچالی و ترکیبی (Reefer)",
    icon: "❄️",
    options: [
      "از دوغارون کانتینر معمولی از میرسن کانتینر یخچالی",
      "از دوغارون کانتینر یخچالی از میرسن کانتینر یخچالی",
      "از اسلام قلعه کانتینر معمولی از میرسن کانتینر یخچالی",
      "از اسلام قلعه کانتینر یخچالی از میرسن کانتینر یخچالی",
      "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی",
      "از اسلام قلعه کانتینر یخچالی از بندرعباس کانتینر یخچالی",
      "ترانزیت از میرسن - کانتینر ۴۰ فوت یخچالی (40' RF)",
      "ترانزیت از بندرعباس - کانتینر ۴۰ فوت یخچالی (40' RF)",
      "بارگیری مستقیم کانتینر یخچالی - هرات / اسلام قلعه / دوغارون / مرسین",
    ],
  },
  {
    id: "dry-standard",
    name: "کانتینر معمولی و خشک (Dry / Standard)",
    icon: "📦",
    options: [
      "از دوغارون کانتینر معمولی از میرسن کانتینر معمولی",
      "از دوغارون کانتینر معمولی از بندرعباس کانتینر معمولی",
      "از اسلام قلعه کانتینر معمولی از میرسن کانتینر معمولی",
      "از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر معمولی",
      "ترانزیت از میرسن - کانتینر ۴۰ فوت های کیوب (40' HC)",
      "ترانزیت از بندرعباس - کانتینر ۴۰ فوت معمولی (40' Dry)",
      "بارگیری مستقیم کانتینر معمولی - هرات / اسلام قلعه / دوغارون / مرسین",
      "بارگیری کانتینر معمولی - کابل / هرات / بندرعباس",
    ],
  },
  {
    id: "border-transit",
    name: "مسیرهای زمینی و مرزی (Transit Routes)",
    icon: "🚚",
    options: [
      "بارگیری از هرات به مرسین ترکیه - ترانزیت جاده ای",
      "بارگیری از کابل به مرسین ترکیه - ترانزیت جاده ای",
      "بارگیری از قندهار به مرسین ترکیه - ترانزیت جاده ای",
      "ترانزیت دوغارون - اسلام قلعه - مرسین",
      "ترانزیت دوغارون - اسلام قلعه - بندرعباس",
      "مسیر ترانزیت هرات - دوغارون - بازرگان - مرسین",
      "مسیر ترانزیت هرات - دوغارون - بندرعباس - جبل علی",
    ],
  },
  {
    id: "shippers",
    name: "شرکت‌های لیږدونکی (Registered Shippers)",
    icon: "🏢",
    options: [
      "NAJEB AMIN LTD",
      "PAHLAWAN NOORI LTD",
      "RAHMAT NAZAR LTD",
      "OMAR SHAHI LTD",
      "NAJIB ASAD LTD",
      "WASELA LTD",
      "ASADULLAH NIAMATULLAH HABIBI LTD",
      "HAJI NOOR MUHMMAD AYAZ NOORI",
      "KARAMAT SULAIMAN LTD",
      "SARWAR HEMATYAR LTD",
      "SADIQE MUJEEB POPAL LTD",
      "ETEHAD BEVERAGES COMPANY",
      "FAZEL BASIT L.T.D",
      "BAKHTAR IMPORTS AND EXPORTS L.L.C",
    ],
  },
]

const CUSTOM_PRESETS_STORAGE_KEY = "skybol:custom-description-presets"

interface DescriptionPresetSelectorProps {
  value: string
  onChange: (newValue: string) => void
  showQuickChips?: boolean
}

export function DescriptionPresetSelector({
  value,
  onChange,
  showQuickChips = true,
}: DescriptionPresetSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")
  const [customPresets, setCustomPresets] = useState<string[]>([])
  const [newCustomInput, setNewCustomInput] = useState("")
  const [appendMode, setAppendMode] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCustomPresets(parsed)
      }
    } catch {}
  }, [])

  const saveCustomPreset = (preset: string) => {
    const trimmed = preset.trim()
    if (!trimmed || customPresets.includes(trimmed)) return
    const updated = [trimmed, ...customPresets]
    setCustomPresets(updated)
    try {
      window.localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    setNewCustomInput("")
  }

  const deleteCustomPreset = (preset: string) => {
    const updated = customPresets.filter((p) => p !== preset)
    setCustomPresets(updated)
    try {
      window.localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  const handleSelectOption = (option: string) => {
    if (appendMode && value.trim()) {
      onChange(`${value.trim()} - ${option}`)
    } else {
      onChange(option)
    }
    setOpen(false)
  }

  const allCategories: PresetCategory[] = [
    ...DEFAULT_PRESET_CATEGORIES,
    ...(customPresets.length > 0
      ? [
          {
            id: "custom",
            name: "گزینه‌های سفارشی من (My Custom Presets)",
            icon: "⭐",
            options: customPresets,
          },
        ]
      : []),
  ]

  const filteredCategories = allCategories
    .map((cat) => {
      if (activeTab !== "all" && cat.id !== activeTab) return null
      const matches = cat.options.filter((opt) =>
        searchQuery.trim() ? opt.toLowerCase().includes(searchQuery.toLowerCase().trim()) : true
      )
      if (matches.length === 0) return null
      return { ...cat, options: matches }
    })
    .filter(Boolean) as PresetCategory[]

  const quickChips = [
    "از دوغارون کانتینر معمولی از میرسن کانتینر یخچالی",
    "از دوغارون کانتینر یخچالی از میرسن کانتینر یخچالی",
    "از اسلام قلعه کانتینر معمولی از میرسن کانتینر یخچالی",
    "ترانزیت از میرسن - کانتینر ۴۰ فوت یخچالی (40' RF)",
  ]

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
          <span>Description / Shipper / تفصیل</span>
        </label>
        
        {/* Preset Popover Trigger Button */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10.5px] font-bold bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border-blue-200 shadow-sm flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>انتخاب از لیست سریع (Presets)</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={4}
            className="w-[94vw] sm:w-[480px] p-3 shadow-2xl border-blue-200 bg-white/95 backdrop-blur-md rounded-xl z-[9999]"
          >
            <div className="space-y-2.5">
              {/* Header & Search */}
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h4 className="text-xs font-bold text-blue-950">لیست گزینه‌های سریع مسیر و کانتینر</h4>
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-slate-600 font-semibold cursor-pointer flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={appendMode}
                      onChange={(e) => setAppendMode(e.target.checked)}
                      className="rounded text-blue-600 h-3 w-3"
                    />
                    <span>اضافه به متن فعلی (Append)</span>
                  </label>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در گزینه‌ها (دوغارون، مرسین، یخچالی...)"
                  className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus:border-blue-500 rounded-lg text-slate-800"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-2 py-1 rounded-md font-bold whitespace-nowrap transition-colors ${
                    activeTab === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  🌐 همه (All)
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveTab(cat.id)}
                    className={`px-2 py-1 rounded-md font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                      activeTab === cat.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              {/* Options List Scrollable */}
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    موردی یافت نشد / No matching presets found
                  </div>
                ) : (
                  filteredCategories.map((cat) => (
                    <div key={cat.id} className="pt-2 first:pt-0 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 sticky top-0 bg-white/95 py-0.5">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {cat.options.map((opt) => {
                          const isSelected = value === opt || value.includes(opt)
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectOption(opt)}
                              className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between group transition-all ${
                                isSelected
                                  ? "bg-blue-100 text-blue-900 border border-blue-300 font-bold"
                                  : "hover:bg-blue-50 text-slate-800 border border-transparent hover:border-blue-100"
                              }`}
                            >
                              <span className="truncate" dir="auto">{opt}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {cat.id === "custom" && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteCustomPreset(opt)
                                    }}
                                    className="p-1 hover:text-red-600 text-slate-400 cursor-pointer"
                                    title="Delete custom preset"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </span>
                                )}
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                ) : (
                                  <span className="text-[10px] text-blue-600 font-bold">انتخاب</span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Custom Preset Input Footer */}
              <div className="border-t border-blue-100 pt-2 flex gap-1.5">
                <Input
                  value={newCustomInput}
                  onChange={(e) => setNewCustomInput(e.target.value)}
                  placeholder="افزودن گزینه دلخواه جدید به لیست..."
                  className="h-7 text-xs bg-slate-50 border-slate-200 text-slate-800"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      saveCustomPreset(newCustomInput)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveCustomPreset(newCustomInput)}
                  disabled={!newCustomInput.trim()}
                  className="h-7 px-2.5 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  ثبت گزینه
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Input Field */}
      <Input
        name="shipperDescription"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1476 CTNS: GOLDEN RAISINS / از دوغارون کانتینر معمولی از میرسن کانتینر یخچالی"
        className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-9 text-blue-950 shadow-xs"
      />

      {/* Quick 1-Click Preset Chips below Input */}
      {showQuickChips && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSelectOption(chip)}
              className="inline-flex items-center text-[9.5px] font-semibold bg-blue-50/70 hover:bg-blue-100/90 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-all hover:scale-[1.01]"
              title={`Click to apply: ${chip}`}
            >
              <span className="text-amber-500 mr-1 text-[9px]">⚡</span>
              <span className="truncate max-w-[210px] sm:max-w-none">{chip}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
