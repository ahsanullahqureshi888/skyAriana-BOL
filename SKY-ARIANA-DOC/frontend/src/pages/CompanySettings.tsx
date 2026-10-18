import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage, settingsApi, systemUpdateApi } from '../services/api'
import { Building2, Save, X, Landmark, Image, ShieldAlert, Sparkles, Check, Upload } from 'lucide-react'
import { TemplateCards } from '../components/invoice-templates/TemplateSelector'
import type { CompanySettings as CompanySettingsData, InvoiceTemplateId } from '../types'
import { BRAND_LOGO_SRC, cacheCompanyBranding, DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_SUBTITLE, resolveBrandAssetUrl } from '../config/branding'
import { COMPANY_BRANDING_QUERY_KEY, COMPANY_SETTINGS_QUERY_KEY, useCompanySettings } from '../hooks/useCompanySettings'
import { ImageCropUploader } from '../components/common/ImageCropUploader'

const CompanySettings: React.FC = () => {
  const queryClient = useQueryClient()

  // Queries
  const { data: settings, isLoading, isError, error, refetch, isFetching } = useCompanySettings()

  // State
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'branding' | 'updates'>('profile')
  const [formState, setFormState] = useState<any>({
    company_name: '',
    subtitle: '',
    licence_number: '',
    website: '',
    default_currency: 'USD',
    default_language: 'en',
    watermark_enabled: true,
    default_invoice_template: 'premium_afghan_glass',
    invoice_watermark_enabled: true,
    invoice_watermark_opacity: 0.06,
    invoice_qr_enabled: true,
    invoice_seal_enabled: true,
    invoice_signature_enabled: true,
    invoice_stamp_enabled: true,
    invoice_color_printing_enabled: true,
    invoice_compact_layout_enabled: false,
    bank_details: {
      bank_name: '',
      beneficiary_name: '',
      account_number: '',
      swift_code: '',
      branch: ''
    }
  })
  
  const [isDirty, setIsDirty] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Populate state on load
  useEffect(() => {
    if (settings) {
      setFormState({
        company_name: settings.company_name || '',
        subtitle: settings.subtitle || '',
        licence_number: settings.licence_number || '',
        website: settings.website || '',
        default_currency: settings.default_currency || 'USD',
        default_language: settings.default_language || 'en',
        watermark_enabled: settings.watermark_enabled !== false,
        default_invoice_template: settings.default_invoice_template || 'premium_afghan_glass',
        invoice_watermark_enabled: settings.invoice_watermark_enabled !== false,
        invoice_watermark_opacity: Number(settings.invoice_watermark_opacity ?? 0.06),
        invoice_qr_enabled: settings.invoice_qr_enabled !== false,
        invoice_seal_enabled: settings.invoice_seal_enabled !== false,
        invoice_signature_enabled: settings.invoice_signature_enabled !== false,
        invoice_stamp_enabled: settings.invoice_stamp_enabled !== false,
        invoice_color_printing_enabled: settings.invoice_color_printing_enabled !== false,
        invoice_compact_layout_enabled: settings.invoice_compact_layout_enabled === true,
        bank_details: {
          bank_name: settings.bank_details?.bank_name || '',
          beneficiary_name: settings.bank_details?.beneficiary_name || '',
          account_number: settings.bank_details?.account_number || '',
          swift_code: settings.bank_details?.swift_code || '',
          branch: settings.bank_details?.branch || ''
        }
      })
      setIsDirty(false)
    }
  }, [settings])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  // Track edits
  const handleFieldChange = (field: string, value: any) => {
    setFormState((prev: any) => {
      const next = { ...prev, [field]: value }
      checkDirty(next)
      return next
    })
  }

  const handleBankFieldChange = (field: string, value: any) => {
    setFormState((prev: any) => {
      const next = {
        ...prev,
        bank_details: {
          ...prev.bank_details,
          [field]: value
        }
      }
      checkDirty(next)
      return next
    })
  }

  const checkDirty = (nextState: any) => {
    if (!settings) return
    const keys: (keyof CompanySettingsData)[] = ['company_name', 'subtitle', 'licence_number', 'website', 'default_currency', 'default_language', 'watermark_enabled', 'default_invoice_template', 'invoice_watermark_enabled', 'invoice_watermark_opacity', 'invoice_qr_enabled', 'invoice_seal_enabled', 'invoice_signature_enabled', 'invoice_stamp_enabled', 'invoice_color_printing_enabled', 'invoice_compact_layout_enabled']
    let dirty = false
    
    for (const key of keys) {
      if (nextState[key] !== settings[key]) {
        dirty = true
        break
      }
    }

    const bankKeys = ['bank_name', 'beneficiary_name', 'account_number', 'swift_code', 'branch']
    for (const key of bankKeys) {
      if ((nextState.bank_details?.[key] || '') !== (settings.bank_details?.[key] || '')) {
        dirty = true
        break
      }
    }
    
    setIsDirty(dirty)
  }

  const handleDiscard = () => {
    if (settings) {
      setFormState({
        company_name: settings.company_name || '',
        subtitle: settings.subtitle || '',
        licence_number: settings.licence_number || '',
        website: settings.website || '',
        default_currency: settings.default_currency || 'USD',
        default_language: settings.default_language || 'en',
        watermark_enabled: settings.watermark_enabled !== false,
        default_invoice_template: settings.default_invoice_template || 'premium_afghan_glass',
        invoice_watermark_enabled: settings.invoice_watermark_enabled !== false,
        invoice_watermark_opacity: Number(settings.invoice_watermark_opacity ?? 0.06),
        invoice_qr_enabled: settings.invoice_qr_enabled !== false,
        invoice_seal_enabled: settings.invoice_seal_enabled !== false,
        invoice_signature_enabled: settings.invoice_signature_enabled !== false,
        invoice_stamp_enabled: settings.invoice_stamp_enabled !== false,
        invoice_color_printing_enabled: settings.invoice_color_printing_enabled !== false,
        invoice_compact_layout_enabled: settings.invoice_compact_layout_enabled === true,
        bank_details: {
          bank_name: settings.bank_details?.bank_name || '',
          beneficiary_name: settings.bank_details?.beneficiary_name || '',
          account_number: settings.bank_details?.account_number || '',
          swift_code: settings.bank_details?.swift_code || '',
          branch: settings.bank_details?.branch || ''
        }
      })
      setIsDirty(false)
    }
  }

  // Mutations
  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (savedSettings) => {
      cacheCompanyBranding({
        company_name: savedSettings.company_name,
        subtitle: savedSettings.subtitle,
        logo_path: savedSettings.logo_path,
      })
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, savedSettings)
      queryClient.setQueryData(COMPANY_BRANDING_QUERY_KEY, {
        company_name: savedSettings.company_name,
        subtitle: savedSettings.subtitle,
        logo_path: savedSettings.logo_path,
      })
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: COMPANY_BRANDING_QUERY_KEY })
      setIsDirty(false)
      setNotice({ type: 'success', message: 'Company settings saved and applied across the workspace.' })
    },
    onError: (error) => {
      setNotice({ type: 'error', message: getApiErrorMessage(error, 'Company settings could not be saved.') })
    },
  })

  const handleSave = () => {
    const companyName = String(formState.company_name || '').trim()
    if (!companyName) {
      setActiveTab('profile')
      setNotice({ type: 'error', message: 'Company registered name is required.' })
      return
    }

    updateMutation.mutate({ ...formState, company_name: companyName })
  }

  const handleCroppedFileUpload = async (file: File, type: 'logo' | 'stamp' | 'signature') => {
    setUploadingField(type)
    try {
      let updatedSettings
      if (type === 'logo') {
        updatedSettings = await settingsApi.uploadLogo(file)
      } else if (type === 'stamp') {
        updatedSettings = await settingsApi.uploadStamp(file)
      } else if (type === 'signature') {
        updatedSettings = await settingsApi.uploadSignature(file)
      }
      cacheCompanyBranding({
        company_name: updatedSettings.company_name,
        subtitle: updatedSettings.subtitle,
        logo_path: updatedSettings.logo_path,
      })
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, updatedSettings)
      queryClient.setQueryData(COMPANY_BRANDING_QUERY_KEY, {
        company_name: updatedSettings.company_name,
        subtitle: updatedSettings.subtitle,
        logo_path: updatedSettings.logo_path,
      })
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: COMPANY_BRANDING_QUERY_KEY })
      setNotice({ type: 'success', message: `${type[0].toUpperCase()}${type.slice(1)} cropped & uploaded successfully.` })
    } catch (error) {
      setNotice({ type: 'error', message: getApiErrorMessage(error, `Failed to upload ${type}.`) })
    } finally {
      setUploadingField(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'stamp' | 'signature') => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleCroppedFileUpload(file, type)
  }

  const previewName = String(formState.company_name || '').trim() || DEFAULT_COMPANY_NAME
  const previewSubtitle = String(formState.subtitle || '').trim() || DEFAULT_COMPANY_SUBTITLE
  const previewLogo = resolveBrandAssetUrl(settings?.logo_path) || BRAND_LOGO_SRC

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-400 text-xs mt-3">Loading settings dashboard...</p>
      </div>
    )
  }

  if (isError || !settings) {
    return (
      <div className="company-settings-page space-y-6 pb-24 relative animate-fade-in">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Configuration</span>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 mt-0.5">
            <Building2 className="text-blue-600" size={24} />
            Company Settings
          </h2>
        </div>
        <section className="glass-panel p-8 rounded-2xl text-center max-w-2xl">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">Company settings could not be loaded</h3>
          <p className="text-sm text-slate-500 mt-2">
            {getApiErrorMessage(error, 'Check your access permissions or reconnect to the local API, then try again.')}
          </p>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm disabled:opacity-60"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Retrying…' : 'Try Again'}
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="company-settings-page space-y-6 pb-24 relative animate-fade-in">
      {notice && (
        <div className={`company-settings-notice company-settings-notice--${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite">
          {notice.type === 'success' ? <Check size={17} /> : <ShieldAlert size={17} />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss settings notification"><X size={15} /></button>
        </div>
      )}
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Configuration</span>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 mt-0.5">
          <Building2 className="text-blue-600" size={24} />
          Company Settings
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Configure corporate profile, beneficiary banking coordinates, A4 PDF layouts, and visual stamps.</p>
      </div>

      {/* Tabs list (frosted glass) */}
      <div className="glass-panel p-1.5 flex gap-2 self-start inline-flex rounded-xl flex-wrap">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Building2 size={14} />
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Landmark size={14} />
          Bank Details
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Image size={14} />
          Branding & Printing
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'updates'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={14} />
          Updates & Automation
        </button>
      </div>

      {/* Form content panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="glass-panel p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
                🏢 Company Profile details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Company Registered Name *</label>
                  <input
                    type="text"
                    required
                    aria-invalid={!String(formState.company_name || '').trim()}
                    value={formState.company_name}
                    onChange={(e) => handleFieldChange('company_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                  {!String(formState.company_name || '').trim() && <span className="mt-1 block text-[10px] font-semibold text-rose-600">Company name is required.</span>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Company Subtitle / Trade Scope</label>
                  <input
                    type="text"
                    value={formState.subtitle}
                    onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Commercial Licence Number</label>
                  <input
                    type="text"
                    value={formState.licence_number}
                    onChange={(e) => handleFieldChange('licence_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Official Website</label>
                  <input
                    type="text"
                    value={formState.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Default Invoicing Currency</label>
                  <select
                    value={formState.default_currency}
                    onChange={(e) => handleFieldChange('default_currency', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Default Panel Language</label>
                  <select
                    value={formState.default_language}
                    onChange={(e) => handleFieldChange('default_language', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="ru">Russian</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANK COORDINATES */}
          {activeTab === 'bank' && (
            <div className="glass-panel p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
                🏦 Beneficiary Bank Coordinates
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Receiving Bank Name</label>
                  <input
                    type="text"
                    value={formState.bank_details.bank_name}
                    onChange={(e) => handleBankFieldChange('bank_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Beneficiary Account Name</label>
                  <input
                    type="text"
                    value={formState.bank_details.beneficiary_name}
                    onChange={(e) => handleBankFieldChange('beneficiary_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Account Number / IBAN</label>
                  <input
                    type="text"
                    value={formState.bank_details.account_number}
                    onChange={(e) => handleBankFieldChange('account_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={formState.bank_details.swift_code}
                    onChange={(e) => handleBankFieldChange('swift_code', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Bank Branch / Address</label>
                <input
                  type="text"
                  value={formState.bank_details.branch}
                  onChange={(e) => handleBankFieldChange('branch', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: BRANDING */}
          {activeTab === 'branding' && (
            <div className="glass-panel p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
                🎨 Corporate Assets & Layout
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo Upload */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center min-h-[180px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Logo</span>
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden my-3 shadow-inner relative group">
                    <img src={previewLogo} className="object-contain max-h-full max-w-full" alt={`${previewName} logo`} />
                  </div>
                  <ImageCropUploader
                    title="Crop Company Logo (1:1)"
                    aspectRatio={1}
                    triggerLabel={uploadingField === 'logo' ? 'Uploading...' : 'Crop & Upload'}
                    isUploading={uploadingField === 'logo'}
                    onCropComplete={(file) => handleCroppedFileUpload(file, 'logo')}
                  />
                </div>

                {/* Stamp Upload */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center min-h-[180px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Corporate Stamp</span>
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden my-3 shadow-inner relative">
                    {settings?.stamp_path ? (
                      <img src={resolveBrandAssetUrl(settings.stamp_path)} className="object-contain max-h-full max-w-full" alt="Corporate Stamp" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase">No Stamp</span>
                    )}
                  </div>
                  <ImageCropUploader
                    title="Crop Corporate Stamp (4:3)"
                    aspectRatio={4/3}
                    triggerLabel={uploadingField === 'stamp' ? 'Uploading...' : 'Crop & Upload'}
                    isUploading={uploadingField === 'stamp'}
                    onCropComplete={(file) => handleCroppedFileUpload(file, 'stamp')}
                  />
                </div>

                {/* Signature Upload */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center min-h-[180px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Officer Signature</span>
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden my-3 shadow-inner relative">
                    {settings?.signature_path ? (
                      <img src={resolveBrandAssetUrl(settings.signature_path)} className="object-contain max-h-full max-w-full" alt="Signature" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase">No Signature</span>
                    )}
                  </div>
                  <ImageCropUploader
                    title="Crop Officer Signature (4:3)"
                    aspectRatio={4/3}
                    triggerLabel={uploadingField === 'signature' ? 'Uploading...' : 'Crop & Upload'}
                    isUploading={uploadingField === 'signature'}
                    onCropComplete={(file) => handleCroppedFileUpload(file, 'signature')}
                  />
                </div>
              </div>

              <section className="pt-5 border-t border-slate-100 space-y-4">
                <div><h4 className="text-sm font-extrabold text-slate-800">Commercial Invoice Templates</h4><p className="text-[11px] text-slate-500 mt-1">Choose the default design for new invoices. Existing invoices keep their saved template.</p></div>
                <TemplateCards value={formState.default_invoice_template as InvoiceTemplateId} onChange={(value) => handleFieldChange('default_invoice_template', value)} compact />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ['invoice_watermark_enabled','Show Afghanistan Watermark'],
                    ['invoice_qr_enabled','Show QR Code'],
                    ['invoice_seal_enabled','Show Footer Seal'],
                    ['invoice_signature_enabled','Show Signature'],
                    ['invoice_stamp_enabled','Show Company Stamp'],
                    ['invoice_color_printing_enabled','Use Color Printing'],
                    ['invoice_compact_layout_enabled','Enable Compact Layout'],
                  ].map(([key,label]) => <label key={key} className="template-setting-toggle"><span>{label}</span><input type="checkbox" checked={Boolean(formState[key])} onChange={(event) => handleFieldChange(key,event.target.checked)} /></label>)}
                </div>
                <label className="block text-xs font-bold text-slate-600">Watermark Opacity <span className="text-blue-600">{Math.round(Number(formState.invoice_watermark_opacity) * 100)}%</span><input className="w-full mt-2 accent-blue-600" type="range" min="0" max="0.2" step="0.01" value={formState.invoice_watermark_opacity} onChange={(event)=>handleFieldChange('invoice_watermark_opacity',Number(event.target.value))} /></label>
              </section>

              {/* Watermark toggle */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Display Background Watermark</h4>
                  <p className="text-[10px] text-slate-400">Renders a 3% opacity diagonal "SKY ARIANA" stamp behind print items.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.watermark_enabled}
                    onChange={(e) => handleFieldChange('watermark_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: UPDATES & AUTOMATION */}
          {activeTab === 'updates' && (
            <div className="glass-panel p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sparkles className="text-blue-600" size={18} />
                Software Updates & Change Automation
              </h3>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-blue-300">Antigravity Auto-Build Engine</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Check size={12} /> Live Auto-Draft Active
                  </span>
                </div>
                <h4 className="text-lg font-extrabold text-white">Auto-Generate Software Updates from Changes</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Whenever you make any change in Antigravity (editing values, toggling features, updating parties, or saving configurations), the system automatically drafts a new Software Update patch containing those changes.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-extrabold text-slate-900 block">Auto-Generate Software Updates from Changes</span>
                  <span className="text-xs text-slate-500 block">Automatically package system edits and configuration changes into ready-to-deploy software patch builds.</span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onChange={async (e) => {
                      const enabled = e.target.checked
                      try {
                        await systemUpdateApi.toggleAutoGenerate(enabled)
                        setNotice({ type: 'success', message: `Auto-Generate Software Updates from Changes set to ${enabled ? 'ON' : 'OFF'}.` })
                      } catch (err) {
                        setNotice({ type: 'error', message: 'Failed to update auto-generate setting.' })
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                </label>
              </div>

              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-between">
                <div className="text-xs text-blue-950 font-semibold">
                  <span>View and publish drafted software updates on the Software Updates page.</span>
                </div>
                <a
                  href="/software-update"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Go to Software Updates →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Info card (Side help panel) */}
        <div className="space-y-6">
          <div className="glass-panel company-identity-preview">
            <div className="company-identity-preview__top">
              <span>Live identity preview</span>
              <span className={isDirty ? 'is-pending' : 'is-synced'}>{isDirty ? 'Unsaved' : 'Synced'}</span>
            </div>
            <div className="company-identity-preview__brand">
              <img src={previewLogo} alt={`${previewName} logo preview`} />
              <div>
                <h3>{previewName}</h3>
                <p>{previewSubtitle}</p>
              </div>
            </div>
            <small>This identity is used by the sidebar, top header, dashboard, and new documents.</small>
          </div>
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-500" />
              Settings Guidance
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              These properties define the global metadata shown in the workspace and printed commercial invoices.
            </p>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-700 leading-normal">
              <strong>Note:</strong> Company identity changes apply immediately across the workspace and to new invoices. Existing records remain unchanged for historical integrity.
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar (when dirty) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-800 z-50 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">You have unsaved changes in settings.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDiscard}
              className="px-3.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-500/20 flex items-center gap-1"
            >
              <Save size={12} />
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanySettings
