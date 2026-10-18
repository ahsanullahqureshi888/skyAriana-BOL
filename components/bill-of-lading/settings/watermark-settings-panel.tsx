"use client"

import React, { useState, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Star,
  Clock,
  Upload,
  Check,
  Search,
  Sliders,
  RotateCcw,
  Shield,
  Layers,
  Ship,
  Truck,
  Plane,
  Mountain,
  FileText,
  Trash2,
  Globe,
  FileCheck,
  X,
  Eye,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DOCUMENT_BACKGROUNDS, DocumentBackground } from '@/lib/document-backgrounds'
import { WatermarkThumbnail } from '../watermark-thumbnail'
import { CustomWatermarkItem } from './bol-settings-types'
import { CustomWatermarkDialog } from './custom-watermark-dialog'

export interface WatermarkSettingsPanelProps {
  activeWatermarkUrl: string
  activeOpacity: number
  onSelectWatermark: (preset: DocumentBackground) => void
  onOpacityChange: (opacity: number) => void
  defaultWatermarkUrl: string
  defaultOpacity: number
  onSetAsDefault: (url: string, opacity: number) => void
  onResetToDefault: () => void
  isOverride: boolean
  favorites: string[]
  onToggleFavorite: (label: string) => void
  recents: string[]
  customWatermarks: CustomWatermarkItem[]
  onAddCustomWatermark: (item: CustomWatermarkItem) => void
  onDeleteCustomWatermark: (id: string) => void
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  All: Sparkles,
  Favorites: Star,
  Custom: Upload,
  Geometric: Shield,
  Maritime: Ship,
  Overland: Truck,
  Aviation: Plane,
  Mountains: Mountain,
  Classic: Layers,
}

export function WatermarkSettingsPanel({
  activeWatermarkUrl,
  activeOpacity,
  onSelectWatermark,
  onOpacityChange,
  defaultWatermarkUrl,
  defaultOpacity,
  onSetAsDefault,
  onResetToDefault,
  isOverride,
  favorites,
  onToggleFavorite,
  recents,
  customWatermarks,
  onAddCustomWatermark,
  onDeleteCustomWatermark,
}: WatermarkSettingsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [cardDensity, setCardDensity] = useState<'compact' | 'comfortable'>('compact')
  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [customToDelete, setCustomToDelete] = useState<CustomWatermarkItem | null>(null)

  // Merge built-in watermarks and custom watermarks
  const allWatermarks: DocumentBackground[] = useMemo(() => {
    const customConverted: DocumentBackground[] = customWatermarks.map((cw) => ({
      label: cw.label,
      category: cw.category || 'Custom',
      url: cw.url,
      opacity: cw.opacity,
    }))
    return [...DOCUMENT_BACKGROUNDS, ...customConverted]
  }, [customWatermarks])

  // Active watermark preset
  const activePreset = useMemo(() => {
    return allWatermarks.find((item) => item.url === activeWatermarkUrl)
  }, [allWatermarks, activeWatermarkUrl])

  // Recommended opacity for active item
  const recommendedOpacity = activePreset?.opacity ?? defaultOpacity

  // Categories list
  const categoryKeys = useMemo(() => {
    const set = new Set(allWatermarks.map((item) => item.category))
    return ['All', 'Favorites', ...Array.from(set)]
  }, [allWatermarks])

  // Filtered watermarks
  const filteredWatermarks = useMemo(() => {
    return allWatermarks.filter((item) => {
      // Category filter
      if (selectedCategory === 'Favorites') {
        if (!favorites.includes(item.label)) return false
      } else if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const target = `${item.label} ${item.category}`.toLowerCase()
        if (!target.includes(q)) return false
      }

      return true
    })
  }, [allWatermarks, selectedCategory, favorites, searchQuery])

  // Recent presets
  const recentPresets = useMemo(() => {
    return recents
      .map((label) => allWatermarks.find((w) => w.label === label))
      .filter((w): w is DocumentBackground => Boolean(w))
      .slice(0, 5)
  }, [recents, allWatermarks])

  return (
    <div className="space-y-4">
      {/* 1. Master Watermark Header & Opacity Control Center */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 p-4 text-white shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Active Watermark Status & Metadata */}
          <div className="flex items-center gap-3.5">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow ring-1 ring-white/20 select-none">
              {activeWatermarkUrl && (
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none"
                  style={{
                    backgroundImage: `url('${activeWatermarkUrl}')`,
                    opacity: Math.max(0.04, Math.min(0.40, activeOpacity)),
                  }}
                />
              )}
              <div className="relative z-10 flex h-full flex-col justify-between text-[4px] leading-tight text-slate-800">
                <div className="border-b border-blue-900/40 pb-0.5 font-black text-blue-950">SKY ARIANA</div>
                <div className="space-y-0.5">
                  <div className="h-0.5 w-8 bg-slate-300 rounded" />
                  <div className="h-0.5 w-10 bg-slate-200 rounded" />
                </div>
                <div className="border-t border-slate-200 pt-0.5 font-mono text-blue-900 font-bold">$18,450</div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {activePreset?.label ?? (activeWatermarkUrl ? 'Custom Watermark' : 'Clean White Paper')}
                </h3>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                  {activePreset?.category ?? 'Standard'}
                </span>

                {/* Source Badge: Global Default vs BOL Override */}
                {isOverride ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold">
                    <FileCheck className="h-3 w-3" /> Source: BOL Override
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 text-[10px] font-bold">
                    <Globe className="h-3 w-3" /> Source: Global Default
                  </span>
                )}
              </div>

              {/* Opacity Readout & Quick Restoration */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs">
                <span className="text-slate-300">
                  Active Opacity: <strong className="text-amber-400 font-mono text-sm">{Math.round(activeOpacity * 100)}%</strong>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Rec: {Math.round(recommendedOpacity * 100)}%
                </span>

                {Math.round(activeOpacity * 100) !== Math.round(recommendedOpacity * 100) && (
                  <button
                    type="button"
                    onClick={() => onOpacityChange(recommendedOpacity)}
                    className="text-[11px] font-semibold text-blue-300 hover:text-white underline cursor-pointer"
                  >
                    Use Recommended ({Math.round(recommendedOpacity * 100)}%)
                  </button>
                )}

                {isOverride && (
                  <button
                    type="button"
                    onClick={onResetToDefault}
                    className="text-[11px] font-semibold text-amber-300 hover:text-amber-100 underline cursor-pointer"
                  >
                    Reset to Default ({Math.round(defaultOpacity * 100)}%)
                  </button>
                )}

                {activeWatermarkUrl && (
                  <button
                    type="button"
                    onClick={() => onSetAsDefault(activeWatermarkUrl, activeOpacity)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer ml-auto"
                    title="Make this watermark and opacity the new system global default for future documents"
                  >
                    Set as Global Default ✓
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Continuous Slider & Quick Buttons */}
          <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[300px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-amber-400" /> Opacity Slider:
              </span>
              <span className="font-mono font-bold text-amber-400">{Math.round(activeOpacity * 100)}%</span>
            </div>

            <input
              type="range"
              min="0.01"
              max="0.40"
              step="0.01"
              aria-label="Active Watermark Opacity"
              value={Math.min(activeOpacity, 0.40)}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
            />

            <div className="flex items-center gap-1 pt-0.5">
              {[
                { label: '8%', val: 0.08 },
                { label: '12%', val: 0.12 },
                { label: '14%', val: 0.14 },
                { label: '18%', val: 0.18 },
                { label: '22%', val: 0.22 },
                { label: '24%', val: 0.24 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onOpacityChange(p.val)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                    Math.round(activeOpacity * 100) === Math.round(p.val * 100)
                      ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recently Used Row */}
      {recentPresets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold shrink-0 text-[11px]">
            <Clock className="h-3.5 w-3.5" /> Recent:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentPresets.map((preset) => {
              const isCurrent = activeWatermarkUrl === preset.url
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSelectWatermark(preset)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Search, Category Filter Chips & Upload Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guilloche, port, flight, map…"
            className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Card Density Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCardDensity('compact')}
              className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                cardDensity === 'compact'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setCardDensity('comfortable')}
              className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                cardDensity === 'comfortable'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Comfortable
            </button>
          </div>

          {/* Upload Button */}
          <Button
            size="sm"
            onClick={() => setIsUploaderOpen(true)}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Custom
          </Button>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-1.5">
        {categoryKeys.map((catKey) => {
          const Icon = CATEGORY_ICONS[catKey] ?? Sparkles
          const isSelected = selectedCategory === catKey
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setSelectedCategory(catKey)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-900 text-white shadow-xs ring-2 ring-blue-600 dark:bg-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className={`h-3 w-3 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
              <span>{catKey}</span>
            </button>
          )
        })}
      </div>

      {/* 4. Watermark Grid */}
      <div
        className={`grid gap-2.5 ${
          cardDensity === 'compact'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3'
        }`}
      >
        {filteredWatermarks.map((item) => {
          const isSelected = activeWatermarkUrl === item.url
          const isFav = favorites.includes(item.label)
          const customItem = customWatermarks.find((cw) => cw.url === item.url)
          const isSvg = item.url.toLowerCase().endsWith('.svg') || item.url.startsWith('data:image/svg')

          return (
            <div
              key={item.label}
              role="button"
              data-watermark-card="true"
              tabIndex={0}
              aria-label={`Select ${item.label} watermark`}
              aria-pressed={isSelected}
              onClick={() => onSelectWatermark(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectWatermark(item)
                }
              }}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 [content-visibility:auto] [contain-intrinsic-size:160px] ${
                isSelected
                  ? 'border-2 border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
              }`}
            >
              {/* Thumbnail Stage */}
              <div
                className={`relative w-full overflow-hidden bg-slate-50/80 dark:bg-slate-950/40 p-2 flex items-center justify-center ${
                  cardDensity === 'compact' ? 'h-32 sm:h-36' : 'h-40 sm:h-44'
                }`}
              >
                <WatermarkThumbnail
                  url={item.url}
                  label={item.label}
                  category={item.category}
                  highContrast={true}
                  className="h-full max-h-full"
                />

                {/* Top-Left Format Tag */}
                <span className="absolute left-2 top-2 rounded bg-slate-900/80 text-white px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider shadow-2xs backdrop-blur-xs">
                  {isSvg ? 'Vector SVG' : item.url ? 'Image' : 'Blank'}
                </span>

                {/* Top-Right Badges & Favorite Toggle */}
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(item.label)
                    }}
                    className={`p-1 rounded-full shadow-xs cursor-pointer transition-colors ${
                      isFav
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white/90 text-slate-400 hover:text-amber-500'
                    }`}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </button>

                  {customItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCustomToDelete(customItem)
                      }}
                      className="p-1 rounded-full bg-white/90 text-slate-400 hover:text-red-600 shadow-xs cursor-pointer transition-colors"
                      title="Delete custom watermark"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}

                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[9px] font-bold shadow-sm">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                      Selected
                    </span>
                  )}
                </div>
              </div>

              {/* Information Row */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between flex-1">
                <div>
                  <p
                    className={`text-xs font-bold truncate transition-colors ${
                      isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100 group-hover:text-blue-600'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.category}
                  </p>
                </div>

                <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[9.5px] text-slate-400 font-mono">
                  <span>Rec:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                    {Math.round(item.opacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredWatermarks.length === 0 && (
        <div className="p-8 text-center border border-dashed rounded-xl bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500">No watermarks match your search criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('All')
            }}
            className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Custom Watermark Dialog */}
      <CustomWatermarkDialog
        open={isUploaderOpen}
        onOpenChange={setIsUploaderOpen}
        onSaveWatermark={(item) => {
          onAddCustomWatermark(item)
          onSelectWatermark({
            label: item.label,
            category: item.category,
            url: item.url,
            opacity: item.opacity,
          })
        }}
      />

      {/* Delete Confirmation Modal for Custom Watermark */}
      {customToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Delete Custom Watermark?
            </h4>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to remove &quot;{customToDelete.label}&quot;? Built-in watermarks will remain unaffected.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setCustomToDelete(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                onClick={() => {
                  onDeleteCustomWatermark(customToDelete.id)
                  setCustomToDelete(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
