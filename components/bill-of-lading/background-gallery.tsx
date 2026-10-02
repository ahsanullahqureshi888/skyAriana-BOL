"use client"

import React, { useState } from 'react'
import {
  Check,
  Search,
  Sparkles,
  Shield,
  Ship,
  Truck,
  Plane,
  Mountain,
  Layers,
  FileText,
  Sliders,
  X,
  Eye,
  Maximize2,
  RotateCcw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { DOCUMENT_BACKGROUNDS, type DocumentBackground } from '@/lib/document-backgrounds'
import { WatermarkThumbnail } from './watermark-thumbnail'

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  All: { label: 'All Watermarks', icon: Sparkles },
  Geometric: { label: 'Banknote Guilloche', icon: Shield },
  Maritime: { label: 'Maritime & Port', icon: Ship },
  Overland: { label: 'Silk Road Transit', icon: Truck },
  Aviation: { label: 'Aviation & Air Cargo', icon: Plane },
  Mountains: { label: 'Mountain Topo', icon: Mountain },
  Classic: { label: 'Classic Blueprints', icon: Layers },
}

const CATEGORY_TAG_COLORS: Record<string, string> = {
  Maritime: 'bg-teal-900/90 text-teal-200 border-teal-500/40',
  Aviation: 'bg-sky-900/90 text-sky-200 border-sky-500/40',
  Overland: 'bg-amber-900/90 text-amber-200 border-amber-500/40',
  Mountains: 'bg-indigo-900/90 text-indigo-200 border-indigo-500/40',
  Geometric: 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40',
  Classic: 'bg-slate-800/90 text-slate-200 border-slate-600/40',
}

export interface BackgroundGalleryProps {
  value: string
  opacity?: number
  onOpacityChange?: (opacity: number) => void
  onSelect: (preset: DocumentBackground) => void
}

export function BackgroundGallery({
  value,
  opacity,
  onOpacityChange,
  onSelect,
}: BackgroundGalleryProps) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [previewModalItem, setPreviewModalItem] = useState<DocumentBackground | null>(null)
  const [previewModalOpacity, setPreviewModalOpacity] = useState<number>(0.14)
  const [showDocumentTextOverlay, setShowDocumentTextOverlay] = useState(true)

  // Categories list
  const rawCategories = ['All', ...Array.from(new Set(DOCUMENT_BACKGROUNDS.map((item) => item.category)))]

  // Filtered list
  const filtered = DOCUMENT_BACKGROUNDS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const searchTarget = `${item.label} ${item.category}`.toLowerCase()
    const matchesQuery = query.trim() === '' || searchTarget.includes(query.trim().toLowerCase())
    return matchesCategory && matchesQuery
  })

  const currentPreset = DOCUMENT_BACKGROUNDS.find((item) => item.url === value)
  const currentOpacity = opacity ?? currentPreset?.opacity ?? 0.14

  const handleOpenPreview = (item: DocumentBackground, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setPreviewModalItem(item)
    setPreviewModalOpacity(item.opacity || currentOpacity || 0.14)
  }

  const handleApplyPreset = (item: DocumentBackground) => {
    onSelect(item)
    // Clean White resets opacity to 0
    if (!item.url && onOpacityChange) {
      onOpacityChange(0)
    }
    // Note: Do not forcefully overwrite user's active document opacity when switching presets.
    // The user can explicitly click 'Use Recommended' if they want the preset default.
  }

  return (
    <div className="space-y-4 mb-4">
      {/* 1. Live Document Watermark Readability Preview Banner & Control Center */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-900 p-4 text-white shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Miniature Paper Simulation */}
          <div className="flex items-center gap-4">
            <div
              className="group/mini relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-blue-400 transition-all"
              onClick={() => {
                if (currentPreset) {
                  handleOpenPreview(currentPreset)
                } else if (value) {
                  handleOpenPreview({ label: 'Active Watermark', category: 'Custom', url: value, opacity: currentOpacity })
                }
              }}
              title="Click to view full A4 preview"
            >
              {/* Background Watermark Layer */}
              {value && (
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none transition-opacity duration-200"
                  style={{
                    backgroundImage: `url('${value}')`,
                    opacity: Math.max(0.04, Math.min(0.40, currentOpacity)),
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Mock Invoice & Waybill Text Lines */}
              <div className="relative z-10 flex h-full flex-col justify-between text-[4.5px] leading-tight text-slate-800 font-sans select-none">
                <div>
                  <div className="flex items-center justify-between border-b border-blue-900/40 pb-0.5 font-black text-blue-950">
                    <span>SKY ARIANA</span>
                    <span className="text-[3.5px] font-mono">B/L 84920</span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-slate-600">
                    <div className="h-0.5 w-10 bg-slate-400/80 rounded" />
                    <div className="h-0.5 w-14 bg-slate-300 rounded" />
                    <div className="h-0.5 w-8 bg-slate-300 rounded" />
                  </div>
                </div>
                <div className="space-y-0.5 border-t border-slate-200 pt-0.5 font-mono text-[4px] text-slate-700">
                  <div className="flex justify-between font-bold">
                    <span>NET WT:</span>
                    <span>24,800 KG</span>
                  </div>
                  <div className="flex justify-between text-blue-900 font-bold">
                    <span>BALANCE:</span>
                    <span>$12,450 USD</span>
                  </div>
                </div>
              </div>

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover/mini:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="h-4 w-4 text-white drop-shadow" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  {currentPreset?.label ?? (value ? 'Custom Watermark' : 'Clean White Paper')}
                </h4>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                  {currentPreset?.category ?? 'Base'}
                </span>
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPreset = DOCUMENT_BACKGROUNDS.find((b) => b.url === '')
                      if (cleanPreset) onSelect(cleanPreset)
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
                  >
                    Reset to Clean White
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Simulated A4 bill of lading sheet · High-resolution vector security ink with guaranteed typographic contrast.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                <div>
                  <span>Active Opacity: </span>
                  <span className="font-bold text-amber-400">{Math.round(currentOpacity * 100)}%</span>
                </div>
                {currentPreset && currentPreset.opacity > 0 && Math.round(currentPreset.opacity * 100) !== Math.round(currentOpacity * 100) && (
                  <button
                    type="button"
                    onClick={() => onOpacityChange && onOpacityChange(currentPreset.opacity)}
                    className="text-blue-300 hover:text-blue-100 underline text-[10px] cursor-pointer"
                    title={`Apply recommended ${Math.round(currentPreset.opacity * 100)}% opacity`}
                  >
                    Use Recommended ({Math.round(currentPreset.opacity * 100)}%)
                  </button>
                )}
                {currentPreset && (
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(currentPreset)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white text-[11px] font-sans font-semibold cursor-pointer ml-auto"
                  >
                    <Eye className="h-3.5 w-3.5 text-blue-400" />
                    Enlarge A4 Preview
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Unified Watermark Opacity & Readability Controls */}
          {onOpacityChange && value && (
            <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[310px] bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Sliders className="h-3.5 w-3.5 text-amber-400" />
                  <span>Document Opacity:</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {Math.round(currentOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.35"
                step="0.01"
                aria-label="Document Watermark Opacity"
                value={Math.min(currentOpacity, 0.35)}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
              />
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {[
                  { label: '8%', val: 0.08, title: 'Subtle 8%' },
                  { label: '12%', val: 0.12, title: 'Soft 12%' },
                  { label: '14%', val: 0.14, title: 'Clean 14%' },
                  { label: '18%', val: 0.18, title: 'Medium 18%' },
                  { label: '22%', val: 0.22, title: 'Bold 22%' },
                  { label: '28%', val: 0.28, title: 'Prominent 28%' },
                ].map((preset) => {
                  const isActive = Math.round(currentOpacity * 100) === Math.round(preset.val * 100)
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      title={preset.title}
                      onClick={() => onOpacityChange(preset.val)}
                      className={`rounded px-1.5 py-0.5 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300 shadow-xs'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Search backgrounds"
            placeholder="Search guilloche, mountain, port, flight…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 shrink-0" role="status">
          Showing <strong>{filtered.length}</strong> of {DOCUMENT_BACKGROUNDS.length} watermarks
        </p>
      </div>

      {/* Category Chips with Icons */}
      <div className="flex flex-wrap gap-1.5" aria-label="Background categories">
        {rawCategories.map((catKey) => {
          const meta = CATEGORY_META[catKey] ?? { label: catKey, icon: Sparkles }
          const Icon = meta.icon
          const isSelected = selectedCategory === catKey
          return (
            <button
              key={catKey}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedCategory(catKey)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-900 text-white shadow-xs ring-2 ring-blue-600 dark:bg-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{meta.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Watermark Grid - Smooth Page Scroll, No Nested Overflow Scrollbar */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1"
        aria-label="Document backgrounds"
      >
        {filtered.map((item) => {
          const isSelected = value === item.url
          const isSvg = item.url.toLowerCase().endsWith('.svg')

          return (
            <div
              key={item.label}
              role="button"
              tabIndex={0}
              aria-label={`Select ${item.label} watermark`}
              aria-pressed={isSelected}
              onClick={() => handleApplyPreset(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleApplyPreset(item)
                }
              }}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? 'border-2 border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
              }`}
            >
              {/* High-Clarity Thumbnail Container - Generous & Balanced */}
              <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-slate-50/80 dark:bg-slate-950/40 p-2 flex items-center justify-center">
                <WatermarkThumbnail
                  url={item.url}
                  label={item.label}
                  category={item.category}
                  highContrast={true}
                  className="h-full max-h-full"
                />

                {/* Top-Left Category & Format Badges */}
                <div className="absolute left-2 top-2 flex flex-col gap-1 items-start pointer-events-none z-10">
                  <span className="rounded bg-slate-900/85 dark:bg-slate-800/90 text-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shadow-2xs backdrop-blur-xs border border-white/10">
                    {isSvg ? 'Vector SVG' : item.url ? 'Illustration' : 'Blank'}
                  </span>
                  {item.category && item.category !== 'All' && (
                    <span className={`rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider shadow-2xs backdrop-blur-xs border ${CATEGORY_TAG_COLORS[item.category] || 'bg-slate-900/80 text-slate-300 border-white/10'}`}>
                      {item.category}
                    </span>
                  )}
                </div>

                {/* Top-Right Badges & Actions */}
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  {/* Quick A4 Preview Action Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenPreview(item, e)}
                    className="rounded-full bg-white/95 dark:bg-slate-900/95 p-1.5 text-slate-700 dark:text-slate-300 shadow-xs hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80 opacity-80 group-hover:opacity-100"
                    title={`Full A4 Preview: ${item.label}`}
                    aria-label={`Preview ${item.label}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  {/* Selected Indicator Badge */}
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-sm" title="Currently Selected">
                      <Check aria-hidden="true" className="h-3 w-3 stroke-[3]" />
                      Selected
                    </span>
                  )}
                </div>
              </div>

              {/* Information Row - Crisp Hierarchy */}
              <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-bold truncate transition-colors ${
                      isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}>
                      {item.label}
                    </p>
                    {isSelected && (
                      <span className="shrink-0 text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {CATEGORY_META[item.category]?.label ?? item.category}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
                  <span>Rec. Opacity:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {Math.round(item.opacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No backgrounds match your search query.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSelectedCategory('All')
            }}
            className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Reset search and filters
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Banknote guilloche, maritime compass roses, and Silk Road contours are generated as 100% self-contained vector SVGs. All artwork renders offline and supports crisp high-dpi vector printing.
      </p>

      {/* 4. Large A4 Document Mockup Preview Modal */}
      {previewModalItem && (
        <Dialog open={!!previewModalItem} onOpenChange={(open) => !open && setPreviewModalItem(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-950 text-white border-slate-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  A4 Bill of Lading Watermark Preview: {previewModalItem.label}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Authentic A4 document legibility test · Evaluates ink contrast with multi-modal cargo tables and stamps.
                </DialogDescription>
              </div>

              {/* Actions & Opacity Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDocumentTextOverlay(!showDocumentTextOverlay)}
                  className="text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  {showDocumentTextOverlay ? 'Watermark Only' : 'Show Document Text'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleApplyPreset(previewModalItem)
                    if (onOpacityChange && previewModalItem.url) {
                      onOpacityChange(previewModalOpacity)
                    }
                    setPreviewModalItem(null)
                  }}
                  className="text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Select This Watermark
                </Button>
              </div>
            </div>

            {/* Modal Body: Controls & Live A4 Sheet */}
            <div className="p-4 sm:p-6 bg-slate-950 flex flex-col items-center gap-4 overflow-y-auto max-h-[75vh]">
              {/* Opacity Adjustment Bar inside Modal */}
              <div className="w-full max-w-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Sliders className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-slate-300">Test Opacity:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm w-9 text-right">
                      {Math.round(previewModalOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.35"
                    step="0.01"
                    aria-label="Test Watermark Opacity"
                    value={Math.min(previewModalOpacity, 0.35)}
                    onChange={(e) => setPreviewModalOpacity(parseFloat(e.target.value))}
                    className="w-28 sm:w-36 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: '8%', val: 0.08 },
                    { label: '14%', val: 0.14 },
                    { label: '20%', val: 0.20 },
                    { label: '28%', val: 0.28 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPreviewModalOpacity(preset.val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        Math.round(previewModalOpacity * 100) === Math.round(preset.val * 100)
                          ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {previewModalItem.opacity > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewModalOpacity(previewModalItem.opacity)}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-300 hover:text-white bg-blue-950 border border-blue-800 cursor-pointer ml-1"
                    >
                      Rec ({Math.round(previewModalItem.opacity * 100)}%)
                    </button>
                  )}
                </div>
              </div>

              {/* Realistic A4 Document Sheet (210mm x 297mm Aspect Ratio) */}
              <div className="relative w-full max-w-lg aspect-[210/297] rounded-sm bg-white text-slate-900 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between border border-slate-300 select-none">
                {/* Background Watermark Layer at actual document opacity */}
                {previewModalItem.url && (
                  <div
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none transition-opacity duration-150"
                    style={{
                      backgroundImage: `url('${previewModalItem.url}')`,
                      opacity: previewModalOpacity,
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* Simulated Document Content Overlay */}
                {showDocumentTextOverlay && (
                  <div className="relative z-10 flex flex-col justify-between h-full font-sans text-slate-900">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between border-b-2 border-blue-950 pb-2">
                        <div>
                          <h1 className="text-sm sm:text-base font-black tracking-wider text-blue-950">
                            SKY ARIANA LOGISTICS SERVICES
                          </h1>
                          <p className="text-[8px] sm:text-[9px] text-slate-600 font-semibold tracking-wide">
                            INTERNATIONAL MULTI-MODAL BILL OF LADING & FREIGHT FORWARDING
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-blue-950 text-white font-mono font-bold text-[8px] sm:text-[10px] px-2 py-0.5 rounded">
                            BOL-2026-AF9482
                          </span>
                          <p className="text-[8px] font-mono text-slate-500 mt-0.5">DATE: 2026-09-29</p>
                        </div>
                      </div>

                      {/* Shipper & Consignee Box */}
                      <div className="grid grid-cols-2 gap-3 mt-3 border border-slate-300 rounded p-2 text-[8px] sm:text-[9px] bg-white/70 backdrop-blur-2xs">
                        <div>
                          <p className="font-bold text-blue-900 uppercase">Shipper / Exporter:</p>
                          <p className="font-semibold text-slate-800">AFGHAN DRY FRUIT PROCESSORS CORP</p>
                          <p className="text-slate-600">INDUSTRIAL PARK, DISTRICT 9, KABUL, AFGHANISTAN</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-900 uppercase">Consignee / Importer:</p>
                          <p className="font-semibold text-slate-800">GLOBAL AGRO COMMODITIES TRADING LLC</p>
                          <p className="text-slate-600">PORT RASHID FREE ZONE, DUBAI, UNITED ARAB EMIRATES</p>
                        </div>
                      </div>

                      {/* Transit & Border Route */}
                      <div className="mt-2.5 p-1.5 border border-slate-200 rounded text-[7.5px] sm:text-[8.5px] bg-slate-50/80 flex items-center justify-between font-mono">
                        <div>
                          <span className="font-bold text-slate-700">PORT OF LOADING:</span> KABUL CUSTOMS
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">BORDER TRANSIT:</span> ISLAM QALA / CHABAHAR
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">DISCHARGE:</span> DUBAI JEBEL ALI
                        </div>
                      </div>

                      {/* Cargo Description Table */}
                      <div className="mt-3 border border-slate-300 rounded overflow-hidden text-[7.5px] sm:text-[8.5px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-blue-950 text-white font-bold text-[7px] sm:text-[8px]">
                            <tr>
                              <th className="p-1">MARKS & NOS</th>
                              <th className="p-1">PACKAGES</th>
                              <th className="p-1">DESCRIPTION OF GOODS</th>
                              <th className="p-1 text-right">GROSS WT</th>
                              <th className="p-1 text-right">NET WT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white/75">
                            <tr>
                              <td className="p-1 font-mono">SA-01..305</td>
                              <td className="p-1 font-bold">305 CTNS</td>
                              <td className="p-1 font-medium">AFGHAN GREEN RAISINS (GRADE-A AAA)</td>
                              <td className="p-1 text-right font-mono">5,185 KG</td>
                              <td className="p-1 text-right font-mono">4,880 KG</td>
                            </tr>
                            <tr>
                              <td className="p-1 font-mono">SA-306..908</td>
                              <td className="p-1 font-bold">603 CTNS</td>
                              <td className="p-1 font-medium">KANDAHAR BLACK SHADRA RAISINS</td>
                              <td className="p-1 text-right font-mono">10,251 KG</td>
                              <td className="p-1 text-right font-mono">9,648 KG</td>
                            </tr>
                            <tr>
                              <td className="p-1 font-mono">SA-909..1454</td>
                              <td className="p-1 font-bold">546 CTNS</td>
                              <td className="p-1 font-medium">DRIED FIGS & WILD PISTACHIOS</td>
                              <td className="p-1 text-right font-mono">9,282 KG</td>
                              <td className="p-1 text-right font-mono">8,736 KG</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Totals & Stamp */}
                    <div className="border-t-2 border-blue-950 pt-2 text-[8px] sm:text-[9px]">
                      <div className="flex items-center justify-between font-mono">
                        <div>
                          <span className="font-bold">TOTAL PACKAGES: </span>
                          <span className="font-extrabold text-blue-950">1,454 CARTONS</span>
                        </div>
                        <div>
                          <span className="font-bold">TOTAL GROSS WEIGHT: </span>
                          <span className="font-extrabold text-blue-950">24,718 KG</span>
                        </div>
                        <div>
                          <span className="font-bold">NET BALANCE: </span>
                          <span className="font-black text-blue-900">$18,450.00 USD</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between text-[7px] text-slate-500">
                        <div>
                          <p className="font-bold text-slate-700">CARRIER'S VERIFICATION STAMP</p>
                          <p>Original Bill of Lading · Valid for International Customs Clearance</p>
                        </div>
                        <div className="text-right border-t border-slate-400 pt-1 w-32">
                          <p className="font-bold text-slate-800">AUTHORIZED SIGNATURE</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
