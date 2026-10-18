"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Sliders,
  Sparkles,
  Building2,
  ImageIcon,
  Stamp,
  Printer,
  FileText,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Globe,
  Search,
  Eye,
  Check,
  Shield,
  Phone,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BillOfLading, BillOfLadingFormData } from '@/lib/types/bill-of-lading'
import { DocumentBackground } from '@/lib/document-backgrounds'
import {
  BolDocumentSettings,
  DEFAULT_BOL_SETTINGS,
  SettingsTabId,
  SettingsTabMeta,
  CustomWatermarkItem,
} from './bol-settings-types'
import {
  loadBolDocumentSettings,
  saveBolDocumentSettings,
  exportSettingsToJson,
  validateAndImportSettingsJson,
} from './bol-settings-storage'
import dynamic from 'next/dynamic'
const LiveA4SettingsPreview = dynamic(() => import('./live-a4-settings-preview').then(m => m.LiveA4SettingsPreview), { ssr: false })
const WatermarkSettingsPanel = dynamic(() => import('./watermark-settings-panel').then(m => m.WatermarkSettingsPanel), { ssr: false })

export interface BolSettingsCenterProps {
  currentBol?: Partial<BillOfLadingFormData & BillOfLading> | null
  activeBgImageUrl: string
  activeBgOpacity: number
  onBgImageChange: (url: string) => void
  onBgOpacityChange: (opacity: number) => void
  showStampSignature: boolean
  onToggleStampSignature: (show: boolean) => void
  logoUrl: string
  onLogoChange: (url: string) => void
  companyName: string
  companyNamePersian: string
  companySubtitle: string
  companyPhone: string
  companyEmail: string
  companyAddress: string
  companyLicence: string
  onCompanyInfoChange: (info: {
    companyName?: string
    companyNamePersian?: string
    companySubtitle?: string
    companyPhone?: string
    companyEmail?: string
    companyAddress?: string
    companyLicence?: string
  }) => void
  iranOffice?: {
    iran_office_building?: string
    iran_office_location?: string
    iran_office_pobox?: string
    iran_office_telefax?: string
    iran_office_cellphone?: string
    iran_office_email?: string
  }
  onIranOfficeChange?: (info: any) => void
  onOpenDocumentCenter?: () => void
  onOpenPrintDialog?: () => void
  onSaveToCloud?: () => void
  isSaving?: boolean
}

const SETTINGS_TABS: SettingsTabMeta[] = [
  { id: 'watermark', label: 'Watermark', labelPersian: 'واترمارک', description: 'Document background & security patterns' },
  { id: 'branding', label: 'Logo & Branding', labelPersian: 'لوگو و برند', description: 'Official company logo and identity' },
  { id: 'stamp', label: 'Stamp & Signature', labelPersian: 'مهر و امضا', description: 'Carrier verification stamp and placement' },
  { id: 'general', label: 'General Profile', labelPersian: 'اطلاعات شرکت', description: 'Company name, address, and contact numbers' },
  { id: 'pdf-print', label: 'PDF & Print', labelPersian: 'پی‌دی‌اف و چاپ', description: 'Document dimensions, export quality & resolution' },
  { id: 'defaults', label: 'Defaults', labelPersian: 'پیش‌فرض‌ها', description: 'Default currency, language & border notes' },
  { id: 'backup', label: 'Backup & Restore', labelPersian: 'پشتیبان‌گیری', description: 'Export or import configuration JSON' },
]

export function BolSettingsCenter({
  currentBol,
  activeBgImageUrl,
  activeBgOpacity,
  onBgImageChange,
  onBgOpacityChange,
  showStampSignature,
  onToggleStampSignature,
  logoUrl,
  onLogoChange,
  companyName,
  companyNamePersian,
  companySubtitle,
  companyPhone,
  companyEmail,
  companyAddress,
  companyLicence,
  onCompanyInfoChange,
  iranOffice,
  onIranOfficeChange,
  onOpenDocumentCenter,
  onOpenPrintDialog,
  onSaveToCloud,
  isSaving = false,
}: BolSettingsCenterProps) {
  // Loaded permanent settings from storage (lazy initialized to eliminate mount cascade)
  const [savedSettings, setSavedSettings] = useState<BolDocumentSettings>(() => loadBolDocumentSettings())
  // Working draft of settings
  const [draftSettings, setDraftSettings] = useState<BolDocumentSettings>(() => savedSettings)
  // Active navigation tab
  const [activeTab, setActiveTab] = useState<SettingsTabId>('watermark')
  // Active watermark draft state (immediate live feedback)
  const [draftWatermarkUrl, setDraftWatermarkUrl] = useState(() => activeBgImageUrl || savedSettings.defaultBgImageUrl)
  const [draftWatermarkOpacity, setDraftWatermarkOpacity] = useState(() => activeBgOpacity ?? savedSettings.defaultBgOpacity)
  const [draftShowStamp, setDraftShowStamp] = useState(() => showStampSignature)
  const [draftLogoUrl, setDraftLogoUrl] = useState(() => logoUrl || savedSettings.logoUrl)

  // Tracking unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Sync external prop changes
  useEffect(() => {
    if (activeBgImageUrl) setDraftWatermarkUrl(activeBgImageUrl)
    if (activeBgOpacity !== undefined) setDraftWatermarkOpacity(activeBgOpacity)
    setDraftShowStamp(showStampSignature)
    if (logoUrl) setDraftLogoUrl(logoUrl)
  }, [activeBgImageUrl, activeBgOpacity, showStampSignature, logoUrl])

  // Mark unsaved changes when draft deviates from saved
  useEffect(() => {
    const isWatermarkChanged =
      draftWatermarkUrl !== activeBgImageUrl ||
      Math.round(draftWatermarkOpacity * 100) !== Math.round(activeBgOpacity * 100)
    const isStampChanged = draftShowStamp !== showStampSignature
    const isLogoChanged = draftLogoUrl !== logoUrl
    const isProfileChanged =
      draftSettings.companyName !== companyName ||
      draftSettings.companyAddress !== companyAddress ||
      draftSettings.companyPhone !== companyPhone ||
      draftSettings.companyEmail !== companyEmail ||
      draftSettings.companyLicence !== companyLicence

    setHasUnsavedChanges(isWatermarkChanged || isStampChanged || isLogoChanged || isProfileChanged)
  }, [
    draftWatermarkUrl,
    draftWatermarkOpacity,
    draftShowStamp,
    draftLogoUrl,
    draftSettings,
    activeBgImageUrl,
    activeBgOpacity,
    showStampSignature,
    logoUrl,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    companyLicence,
  ])

  // Is this watermark an override compared to global default?
  const isWatermarkOverride = useMemo(() => {
    return (
      draftWatermarkUrl !== savedSettings.defaultBgImageUrl ||
      Math.round(draftWatermarkOpacity * 100) !== Math.round(savedSettings.defaultBgOpacity * 100)
    )
  }, [draftWatermarkUrl, draftWatermarkOpacity, savedSettings])

  // APPLY ALL SETTINGS
  const handleApplySettings = () => {
    const updated: BolDocumentSettings = {
      ...draftSettings,
      defaultBgImageUrl: draftWatermarkUrl,
      defaultBgOpacity: draftWatermarkOpacity,
      defaultShowStamp: draftShowStamp,
      logoUrl: draftLogoUrl,
      lastUpdated: new Date().toISOString(),
    }

    // Persist to storage
    saveBolDocumentSettings(updated)
    setSavedSettings(updated)

    // Notify parent handlers
    onBgImageChange(draftWatermarkUrl)
    onBgOpacityChange(draftWatermarkOpacity)
    onToggleStampSignature(draftShowStamp)
    onLogoChange(draftLogoUrl)
    onCompanyInfoChange({
      companyName: draftSettings.companyName,
      companyNamePersian: draftSettings.companyNamePersian,
      companySubtitle: draftSettings.companySubtitle,
      companyPhone: draftSettings.companyPhone,
      companyEmail: draftSettings.companyEmail,
      companyAddress: draftSettings.companyAddress,
      companyLicence: draftSettings.companyLicence,
    })

    if (onIranOfficeChange && draftSettings.iranOffice) {
      onIranOfficeChange(draftSettings.iranOffice)
    }

    // Update recents
    const currentLabel =
      draftSettings.customWatermarks.find((cw) => cw.url === draftWatermarkUrl)?.label || 'Watermark'
    if (currentLabel) {
      const newRecents = [currentLabel, ...draftSettings.watermarkRecents.filter((r) => r !== currentLabel)].slice(0, 6)
      setDraftSettings((prev) => ({ ...prev, watermarkRecents: newRecents }))
    }

    setHasUnsavedChanges(false)
    toast.success('Document settings applied and saved successfully!')
  }

  // CANCEL / DISCARD DRAFT
  const handleCancelSettings = () => {
    setDraftSettings(savedSettings)
    setDraftWatermarkUrl(activeBgImageUrl)
    setDraftWatermarkOpacity(activeBgOpacity)
    setDraftShowStamp(showStampSignature)
    setDraftLogoUrl(logoUrl)
    setHasUnsavedChanges(false)
    toast.info('Draft changes discarded. Reverted to last saved settings.')
  }

  // SET AS GLOBAL DEFAULT
  const handleSetAsDefault = (url: string, opacity: number) => {
    const updated: BolDocumentSettings = {
      ...draftSettings,
      defaultBgImageUrl: url,
      defaultBgOpacity: opacity,
      lastUpdated: new Date().toISOString(),
    }
    saveBolDocumentSettings(updated)
    setSavedSettings(updated)
    setDraftSettings(updated)
    toast.success('Saved as system Global Default for all future documents!')
  }

  // RESET TO GLOBAL DEFAULT
  const handleResetToDefault = () => {
    setDraftWatermarkUrl(savedSettings.defaultBgImageUrl)
    setDraftWatermarkOpacity(savedSettings.defaultBgOpacity)
    toast.info(`Reset to Global Default (${Math.round(savedSettings.defaultBgOpacity * 100)}%)`)
  }

  // TOGGLE FAVORITE
  const handleToggleFavorite = (label: string) => {
    setDraftSettings((prev) => {
      const exists = prev.watermarkFavorites.includes(label)
      const nextFavs = exists
        ? prev.watermarkFavorites.filter((f) => f !== label)
        : [...prev.watermarkFavorites, label]
      const updated = { ...prev, watermarkFavorites: nextFavs }
      saveBolDocumentSettings(updated)
      return updated
    })
  }

  // ADD CUSTOM WATERMARK
  const handleAddCustomWatermark = (item: CustomWatermarkItem) => {
    setDraftSettings((prev) => {
      const next = [item, ...prev.customWatermarks.filter((w) => w.id !== item.id)]
      const updated = { ...prev, customWatermarks: next }
      saveBolDocumentSettings(updated)
      return updated
    })
    setDraftWatermarkUrl(item.url)
    setDraftWatermarkOpacity(item.opacity)
    toast.success(`Custom watermark "${item.label}" added to your library!`)
  }

  // DELETE CUSTOM WATERMARK
  const handleDeleteCustomWatermark = (id: string) => {
    setDraftSettings((prev) => {
      const next = prev.customWatermarks.filter((w) => w.id !== id)
      const updated = { ...prev, customWatermarks: next }
      saveBolDocumentSettings(updated)
      return updated
    })
    if (draftWatermarkUrl.includes(id)) {
      setDraftWatermarkUrl(savedSettings.defaultBgImageUrl)
      setDraftWatermarkOpacity(savedSettings.defaultBgOpacity)
    }
    toast.info('Custom watermark deleted.')
  }

  // LOGO UPLOAD
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file size exceeds 5MB limit. Please provide a lighter image.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setDraftLogoUrl(dataUrl)
        setDraftSettings((prev) => ({ ...prev, logoUrl: dataUrl }))
        toast.success('Logo updated in draft. Click Apply to save.')
      }
    }
    reader.readAsDataURL(file)
  }

  // EXPORT SETTINGS JSON
  const handleExportJson = () => {
    const jsonStr = exportSettingsToJson(draftSettings)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sky-ariana-bol-settings-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('BOL Settings exported successfully (without secrets).')
  }

  // IMPORT SETTINGS JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      const result = validateAndImportSettingsJson(text, draftSettings)
      if (!result.isValid || !result.updatedSettings) {
        toast.error(result.error || 'Failed to import settings JSON.')
        return
      }

      setDraftSettings(result.updatedSettings)
      setDraftWatermarkUrl(result.updatedSettings.defaultBgImageUrl)
      setDraftWatermarkOpacity(result.updatedSettings.defaultBgOpacity)
      setDraftShowStamp(result.updatedSettings.defaultShowStamp)
      setDraftLogoUrl(result.updatedSettings.logoUrl)
      setHasUnsavedChanges(true)
      toast.success('Settings imported into draft. Review and click "Apply Changes" to persist.')
    }
    reader.readAsText(file)
  }

  // RESET ALL SETTINGS
  const handleResetAll = () => {
    setDraftSettings(DEFAULT_BOL_SETTINGS)
    setDraftWatermarkUrl(DEFAULT_BOL_SETTINGS.defaultBgImageUrl)
    setDraftWatermarkOpacity(DEFAULT_BOL_SETTINGS.defaultBgOpacity)
    setDraftShowStamp(DEFAULT_BOL_SETTINGS.defaultShowStamp)
    setDraftLogoUrl(DEFAULT_BOL_SETTINGS.logoUrl)
    setResetConfirmOpen(false)
    setHasUnsavedChanges(true)
    toast.warning('Settings reset to system defaults. Click "Apply Changes" to confirm.')
  }

  return (
    <div className="space-y-4">
      {/* 1. Unsaved Changes Action Banner (Floating Sticky) */}
      {hasUnsavedChanges && (
        <div className="sticky top-2 z-40 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-sans shadow-xl border border-amber-400 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-slate-950 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Unsaved Settings Draft</p>
              <p className="text-[11px] opacity-90">
                You have active configuration changes. The live A4 preview reflects your draft in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelSettings}
              className="h-8 text-xs font-bold bg-white/90 text-slate-900 border-transparent hover:bg-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplySettings}
              className="h-8 text-xs font-black bg-slate-950 text-white hover:bg-slate-900 shadow-md cursor-pointer gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Apply & Save Settings
            </Button>
          </div>
        </div>
      )}

      {/* 2. Master Split Layout: 60% Left (Tabs & Controls) / 40% Right (Sticky Live A4 Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Controls & Settings Sub-tabs (7 cols on lg, 7 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* Header Card */}
          <Card className="bg-white/80 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                    <Sliders className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Document Configuration Center
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Manage watermarks, branding, security stamps, and export defaults
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 font-[vazirmatn] bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800/60">
                    مرکز تنظیمات اسناد
                  </span>
                </div>
              </div>

              {/* Sub-tab Navigation Strip */}
              <div className="flex items-center gap-1 overflow-x-auto pt-3 pb-0.5 border-t border-slate-200/60 dark:border-slate-800/60 mt-3">
                {SETTINGS_TABS.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {/* TAB 1: WATERMARK */}
              {activeTab === 'watermark' && (
                <WatermarkSettingsPanel
                  activeWatermarkUrl={draftWatermarkUrl}
                  activeOpacity={draftWatermarkOpacity}
                  onSelectWatermark={(preset) => {
                    setDraftWatermarkUrl(preset.url)
                    if (!preset.url) setDraftWatermarkOpacity(0)
                  }}
                  onOpacityChange={(op) => setDraftWatermarkOpacity(op)}
                  defaultWatermarkUrl={savedSettings.defaultBgImageUrl}
                  defaultOpacity={savedSettings.defaultBgOpacity}
                  onSetAsDefault={handleSetAsDefault}
                  onResetToDefault={handleResetToDefault}
                  isOverride={isWatermarkOverride}
                  favorites={draftSettings.watermarkFavorites}
                  onToggleFavorite={handleToggleFavorite}
                  recents={draftSettings.watermarkRecents}
                  customWatermarks={draftSettings.customWatermarks}
                  onAddCustomWatermark={handleAddCustomWatermark}
                  onDeleteCustomWatermark={handleDeleteCustomWatermark}
                />
              )}

              {/* TAB 2: LOGO & BRANDING */}
              {activeTab === 'branding' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-blue-600" /> Company Logo
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Appears in the top-left header of the Bill of Lading, Invoices, and Packing Lists.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-28 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={draftLogoUrl || '/images/sky-ariana-logo.png'}
                          alt="Company Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      <div className="space-y-2 flex-1 w-full sm:w-auto">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          aria-label="Upload company logo"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => logoInputRef.current?.click()}
                            className="text-xs h-8 gap-1.5 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5 text-blue-600" /> Upload New Logo
                          </Button>
                          {draftLogoUrl !== '/images/sky-ariana-logo.png' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDraftLogoUrl('/images/sky-ariana-logo.png')}
                              className="text-xs h-8 text-slate-500 hover:text-red-600 cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Default
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Recommended: Crisp PNG with transparent background or SVG vector. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STAMP & SIGNATURE */}
              {activeTab === 'stamp' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Stamp className="h-4 w-4 text-red-600" /> Carrier Verification Stamp
                        </h4>
                        <p className="text-xs text-slate-500">
                          Official Sky Ariana security seal placed in the carrier verification box.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftShowStamp(!draftShowStamp)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          draftShowStamp ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        role="switch"
                        aria-checked={draftShowStamp}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            draftShowStamp ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-bold block text-slate-800 dark:text-slate-200">Status</span>
                        <span className={draftShowStamp ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {draftShowStamp ? 'Enabled on Document ✓' : 'Hidden'}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-bold block text-slate-800 dark:text-slate-200">Position</span>
                        <span className="text-slate-600 dark:text-slate-300">Carrier Verification Box (A4 Footer)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GENERAL PROFILE */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  {/* Quick Export Actions */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-2">
                    {onOpenDocumentCenter && (
                      <Button
                        variant="outline"
                        onClick={onOpenDocumentCenter}
                        className="text-xs h-9 border-blue-200 text-blue-700 dark:text-blue-300 gap-1.5"
                      >
                        <Download className="h-4 w-4" /> Open Document Center
                      </Button>
                    )}
                    {onSaveToCloud && (
                      <Button
                        variant="outline"
                        onClick={onSaveToCloud}
                        className="text-xs h-9 border-emerald-200 text-emerald-700 dark:text-emerald-300 gap-1.5"
                      >
                        <Upload className="h-4 w-4" /> Save PDF to Cloud Storage
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-bold">Company Name (English)</Label>
                      <Input
                        value={draftSettings.companyName}
                        onChange={(e) =>
                          setDraftSettings({ ...draftSettings, companyName: e.target.value })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold font-[vazirmatn]" dir="rtl">
                        نام شرکت (فارسی)
                      </Label>
                      <Input
                        value={draftSettings.companyNamePersian}
                        onChange={(e) =>
                          setDraftSettings({ ...draftSettings, companyNamePersian: e.target.value })
                        }
                        dir="rtl"
                        className="mt-1 h-9 text-xs font-[vazirmatn]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Subtitle / Header Description</Label>
                    <Input
                      value={draftSettings.companySubtitle}
                      onChange={(e) =>
                        setDraftSettings({ ...draftSettings, companySubtitle: e.target.value })
                      }
                      className="mt-1 h-9 text-xs"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-blue-500" /> Phone
                      </Label>
                      <Input
                        value={draftSettings.companyPhone}
                        onChange={(e) =>
                          setDraftSettings({ ...draftSettings, companyPhone: e.target.value })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-blue-500" /> Email
                      </Label>
                      <Input
                        value={draftSettings.companyEmail}
                        onChange={(e) =>
                          setDraftSettings({ ...draftSettings, companyEmail: e.target.value })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-bold">Address</Label>
                      <Input
                        value={draftSettings.companyAddress}
                        onChange={(e) =>
                          setDraftSettings({ ...draftSettings, companyAddress: e.target.value })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Licence Number</Label>
                      <Input
                        value={draftSettings.companyLicence}
                        onChange={(e) =>
                          setDraftSettings({ ...draftSettings, companyLicence: e.target.value })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PDF & PRINT */}
              {activeTab === 'pdf-print' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Printer className="h-4 w-4 text-purple-600" /> Print & PDF Dimension Standards
                    </h4>
                    <p className="text-xs text-slate-500">
                      Standardized physical document dimensions and scale fidelity.
                    </p>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">Paper Size</span>
                        <strong className="text-slate-800 dark:text-slate-200">A4 (210 × 297 mm)</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">Orientation</span>
                        <strong className="text-slate-800 dark:text-slate-200">Portrait</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px]">Scale Invariance</span>
                        <strong className="text-slate-800 dark:text-slate-200">100% Unscaled</strong>
                      </div>
                    </div>

                    {onOpenPrintDialog && (
                      <Button
                        size="sm"
                        onClick={onOpenPrintDialog}
                        className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" /> Launch Official Print Dialog
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: DEFAULTS */}
              {activeTab === 'defaults' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-blue-600" /> New Document Defaults
                    </h4>
                    <p className="text-xs text-slate-500">
                      Settings applied when creating new Bills of Lading.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3.5 pt-1">
                      <div>
                        <Label className="text-xs font-bold">Default Currency</Label>
                        <select
                          value={draftSettings.defaultCurrency}
                          onChange={(e) =>
                            setDraftSettings({ ...draftSettings, defaultCurrency: e.target.value as any })
                          }
                          className="mt-1 h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="AFN">AFN (؋)</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold">Transit Border Note</Label>
                        <Input
                          value={draftSettings.defaultTransitBorderNote || ''}
                          onChange={(e) =>
                            setDraftSettings({ ...draftSettings, defaultTransitBorderNote: e.target.value })
                          }
                          placeholder="ISLAM QALA / TORGHUNDI"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: BACKUP & RESTORE */}
              {activeTab === 'backup' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Save className="h-4 w-4 text-emerald-600" /> Export & Import Configuration
                    </h4>
                    <p className="text-xs text-slate-500">
                      Backup document settings or restore configuration to another device. Secrets and credentials are automatically stripped.
                    </p>

                    <div className="flex flex-wrap gap-2.5 pt-2">
                      <Button
                        size="sm"
                        onClick={handleExportJson}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Export Settings JSON
                      </Button>

                      <input
                        ref={importInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportJson}
                        className="hidden"
                        aria-label="Import settings json"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => importInputRef.current?.click()}
                        className="text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-blue-600" /> Import Settings JSON
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setResetConfirmOpen(true)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Factory Defaults
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sticky Live A4 Preview (5 cols on lg, 5 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-4">
          <Card className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-3.5">
            <LiveA4SettingsPreview
              settings={draftSettings}
              activeWatermarkUrl={draftWatermarkUrl}
              activeWatermarkOpacity={draftWatermarkOpacity}
              activeWatermarkLabel={
                draftSettings.customWatermarks.find((cw) => cw.url === draftWatermarkUrl)?.label
              }
              currentBol={currentBol}
              showStamp={draftShowStamp}
            />
          </Card>
        </div>
      </div>

      {/* Factory Reset Confirmation Dialog */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-sm font-bold">Reset All BOL Settings?</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will restore company information, print preferences, and watermark defaults to factory settings. Uploaded custom watermarks will NOT be deleted.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setResetConfirmOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs" onClick={handleResetAll}>
                Confirm Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
