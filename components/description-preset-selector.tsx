"use client"

import { useState, useEffect, useRef } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  ChevronDown,
  Search,
  Check,
  Plus,
  Trash2,
  X,
  Flame,
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
    name: "کانتینر یخچالی و ترکیبی",
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
    name: "کانتینر معمولی و خشک",
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
    name: "مسیرهای زمینی و مرزی",
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
    name: "شرکت‌های لیږدونکی",
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCustomPresets(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery("")
    }
  }, [open])

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
            name: "سفارشی من",
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
    { label: "از دوغارون کانتینر معمولی از میرسن کانتینر یخچالی", short: "دوغارون معمولی → میرسن یخچالی", icon: "❄️" },
    { label: "از دوغارون کانتینر یخچالی از میرسن کانتینر یخچالی", short: "دوغارون یخچالی → میرسن یخچالی", icon: "❄️" },
    { label: "از اسلام قلعه کانتینر معمولی از میرسن کانتینر یخچالی", short: "اسلام قلعه معمولی → میرسن یخچالی", icon: "❄️" },
    { label: "ترانزیت از میرسن - کانتینر ۴۰ فوت یخچالی (40' RF)", short: "ترانزیت میرسن ۴۰ فوت RF", icon: "🚢" },
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
              className="h-6 px-2.5 text-[10.5px] font-bold bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border-blue-200 shadow-xs flex items-center gap-1.5 cursor-pointer rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>انتخاب از لیست گزینه‌ها</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={{ top: 60, bottom: 20, left: 16, right: 16 }}
            className="w-[95vw] sm:w-[460px] p-0 shadow-2xl border-blue-200/90 bg-white rounded-2xl z-[99999] overflow-hidden flex flex-col max-h-[75vh]"
          >
            {/* Popover Header */}
            <div dir="rtl" className="bg-gradient-to-r from-blue-600 to-indigo-700 px-3.5 py-2.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </span>
                <span className="text-xs font-bold tracking-wide">گزینه‌های آماده مسیر و کانتینر</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[10.5px] font-medium text-blue-100 cursor-pointer bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={appendMode}
                    onChange={(e) => setAppendMode(e.target.checked)}
                    className="rounded text-blue-600 h-3 w-3 accent-amber-400 cursor-pointer"
                  />
                  <span>اضافه کردن به متن فعلی</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search and Categories Box */}
            <div dir="rtl" className="p-3 space-y-2.5 bg-slate-50/80 border-b border-slate-200/70 shrink-0">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو (دوغارون، مرسین، یخچالی، معمولی...)"
                  className="h-8 pr-8 pl-3 text-xs bg-white border-slate-200 focus:border-blue-500 rounded-lg text-slate-800 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${
                    activeTab === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  🌐 همه موارد
                </button>
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveTab(cat.id)}
                    className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                      activeTab === cat.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Options List */}
            <div dir="rtl" className="overflow-y-auto p-3 space-y-3 flex-1 divide-y divide-slate-100 max-h-[300px]">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-1.5">
                  <Search className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                  <span>گزینه‌ای با عبارت جستجو شده پیدا نشد</span>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat.id} className="pt-2.5 first:pt-0 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between sticky top-0 bg-white py-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span className="text-blue-950 font-bold">{cat.name}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-600 font-bold px-1.5 py-0.2 rounded-full bg-slate-100">
                        {cat.options.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                      {cat.options.map((opt) => {
                        const isSelected = value === opt || value.includes(opt)
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`w-full text-right px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between group transition-all ${
                              isSelected
                                ? "bg-blue-50 text-blue-900 border border-blue-300 shadow-xs font-bold"
                                : "hover:bg-slate-50 text-slate-800 border border-transparent hover:border-slate-200"
                            }`}
                          >
                            <span className="truncate leading-relaxed">{opt}</span>
                            <div className="flex items-center gap-1.5 shrink-0 mr-2">
                              {cat.id === "custom" && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteCustomPreset(opt)
                                  }}
                                  className="p-1 hover:text-red-600 text-slate-400 cursor-pointer rounded hover:bg-red-50"
                                  title="حذف این گزینه سفارشی"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </span>
                              )}
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-100/80 px-1.5 py-0.5 rounded">
                                  <Check className="w-3 h-3 text-blue-600" />
                                  <span>انتخاب شده</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-600 font-bold transition-colors">
                                  انتخاب ↵
                                </span>
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

            {/* Add Custom Preset Footer */}
            <div dir="rtl" className="border-t border-slate-200 bg-slate-50/90 p-2.5 flex gap-1.5 shrink-0">
              <Input
                value={newCustomInput}
                onChange={(e) => setNewCustomInput(e.target.value)}
                placeholder="افزودن متن مسیر یا تفصیل جدید..."
                className="h-8 text-xs bg-white border-slate-200 text-slate-800 focus:border-blue-500"
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
                className="h-8 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 rounded-lg shadow-xs"
              >
                <Plus className="w-3 h-3 ml-1" />
                ثبت در لیست
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Input Field */}
      <Input
        name="shipperDescription"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1476 CTNS: GOLDEN RAISINS / از دوغارون کانتینر معمولی..."
        className="bg-white border-blue-200 focus:border-blue-500 text-xs font-semibold h-8 text-blue-950 shadow-2xs"
      />

      {/* Quick 1-Click Preset Chips below Input */}
      {showQuickChips && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSelectOption(chip.label)}
              className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 border border-blue-200 px-1.5 py-0.2 rounded cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] shadow-2xs"
              title={`Click to fill: ${chip.label}`}
            >
              <span className="text-[9.5px]">{chip.icon}</span>
              <span className="truncate max-w-[160px] sm:max-w-none">{chip.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
