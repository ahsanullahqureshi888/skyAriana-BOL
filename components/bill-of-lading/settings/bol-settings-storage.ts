import { BolDocumentSettings, DEFAULT_BOL_SETTINGS, CustomWatermarkItem } from './bol-settings-types'

export const PRIMARY_SETTINGS_KEY = 'sky-bol-company-pdf-settings'
export const FALLBACK_SETTINGS_KEY = 'skybol:company-settings'
export const CUSTOM_WATERMARKS_STORAGE_KEY = 'skybol:custom-watermarks'

/**
 * Load complete BOL settings from local storage, merging with defaults
 */
export function loadBolDocumentSettings(): BolDocumentSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_BOL_SETTINGS }
  }

  try {
    const raw = window.localStorage.getItem(PRIMARY_SETTINGS_KEY) || window.localStorage.getItem(FALLBACK_SETTINGS_KEY)
    let parsed: any = {}
    if (raw) {
      try {
        parsed = JSON.parse(raw)
      } catch (err) {
        console.warn('[BOL Settings] Failed to parse stored settings JSON:', err)
      }
    }

    // Load custom watermarks from dedicated storage key if available
    let customWatermarks: CustomWatermarkItem[] = []
    try {
      const customRaw = window.localStorage.getItem(CUSTOM_WATERMARKS_STORAGE_KEY)
      if (customRaw) {
        customWatermarks = JSON.parse(customRaw)
      } else if (Array.isArray(parsed.customWatermarks)) {
        customWatermarks = parsed.customWatermarks
      }
    } catch {
      // Ignore
    }

    return {
      settings_version: parsed.settings_version || DEFAULT_BOL_SETTINGS.settings_version,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),

      companyName: parsed.companyName || DEFAULT_BOL_SETTINGS.companyName,
      companyNamePersian: parsed.companyNamePersian || DEFAULT_BOL_SETTINGS.companyNamePersian,
      companySubtitle: parsed.companySubtitle || DEFAULT_BOL_SETTINGS.companySubtitle,
      companyPhone: parsed.companyPhone || DEFAULT_BOL_SETTINGS.companyPhone,
      companyEmail: parsed.companyEmail || DEFAULT_BOL_SETTINGS.companyEmail,
      companyAddress: parsed.companyAddress || DEFAULT_BOL_SETTINGS.companyAddress,
      companyLicence: parsed.companyLicence || DEFAULT_BOL_SETTINGS.companyLicence,

      iranOffice: {
        iran_office_building: parsed.iranOffice?.iran_office_building ?? DEFAULT_BOL_SETTINGS.iranOffice.iran_office_building,
        iran_office_location: parsed.iranOffice?.iran_office_location ?? DEFAULT_BOL_SETTINGS.iranOffice.iran_office_location,
        iran_office_pobox: parsed.iranOffice?.iran_office_pobox ?? DEFAULT_BOL_SETTINGS.iranOffice.iran_office_pobox,
        iran_office_telefax: parsed.iranOffice?.iran_office_telefax ?? DEFAULT_BOL_SETTINGS.iranOffice.iran_office_telefax,
        iran_office_cellphone: parsed.iranOffice?.iran_office_cellphone ?? DEFAULT_BOL_SETTINGS.iranOffice.iran_office_cellphone,
        iran_office_email: parsed.iranOffice?.iran_office_email ?? DEFAULT_BOL_SETTINGS.iranOffice.iran_office_email,
      },

      logoUrl: parsed.logoUrl && !parsed.logoUrl.includes('aq-logo') ? parsed.logoUrl : DEFAULT_BOL_SETTINGS.logoUrl,

      defaultBgImageUrl: typeof parsed.bgImageUrl === 'string'
        ? parsed.bgImageUrl
        : (parsed.defaultBgImageUrl || DEFAULT_BOL_SETTINGS.defaultBgImageUrl),

      defaultBgOpacity: typeof parsed.bgOpacity === 'number'
        ? parsed.bgOpacity
        : (typeof parsed.defaultBgOpacity === 'number' ? parsed.defaultBgOpacity : DEFAULT_BOL_SETTINGS.defaultBgOpacity),

      watermarkFavorites: Array.isArray(parsed.watermarkFavorites)
        ? parsed.watermarkFavorites
        : DEFAULT_BOL_SETTINGS.watermarkFavorites,

      watermarkRecents: Array.isArray(parsed.watermarkRecents)
        ? parsed.watermarkRecents
        : DEFAULT_BOL_SETTINGS.watermarkRecents,

      customWatermarks,

      defaultShowStamp: parsed.defaultShowStamp !== undefined ? Boolean(parsed.defaultShowStamp) : DEFAULT_BOL_SETTINGS.defaultShowStamp,
      stampScale: typeof parsed.stampScale === 'number' ? parsed.stampScale : DEFAULT_BOL_SETTINGS.stampScale,
      stampPosition: parsed.stampPosition || DEFAULT_BOL_SETTINGS.stampPosition,

      pdfQuality: parsed.pdfQuality || DEFAULT_BOL_SETTINGS.pdfQuality,
      pdfImageCompression: parsed.pdfImageCompression !== undefined ? Boolean(parsed.pdfImageCompression) : DEFAULT_BOL_SETTINGS.pdfImageCompression,
      printPaper: 'A4',
      printOrientation: 'portrait',
      printScale: 100,

      defaultCurrency: parsed.defaultCurrency || DEFAULT_BOL_SETTINGS.defaultCurrency,
      defaultLanguage: parsed.defaultLanguage || DEFAULT_BOL_SETTINGS.defaultLanguage,
      defaultTransitBorderNote: parsed.defaultTransitBorderNote || DEFAULT_BOL_SETTINGS.defaultTransitBorderNote,
    }
  } catch (err) {
    console.error('[BOL Settings] Failed to load settings:', err)
    return { ...DEFAULT_BOL_SETTINGS }
  }
}

/**
 * Persist BOL settings to localStorage atomically
 */
export function saveBolDocumentSettings(settings: BolDocumentSettings): boolean {
  if (typeof window === 'undefined') return false

  try {
    const payload = {
      ...settings,
      lastUpdated: new Date().toISOString(),
      // Keep legacy property names for compatibility with older code paths
      bgImageUrl: settings.defaultBgImageUrl,
      bgOpacity: settings.defaultBgOpacity,
    }

    const serialized = JSON.stringify(payload)
    window.localStorage.setItem(PRIMARY_SETTINGS_KEY, serialized)
    window.localStorage.setItem(FALLBACK_SETTINGS_KEY, serialized)

    // Save custom watermarks separately
    if (settings.customWatermarks) {
      window.localStorage.setItem(CUSTOM_WATERMARKS_STORAGE_KEY, JSON.stringify(settings.customWatermarks))
    }

    return true
  } catch (err) {
    console.error('[BOL Settings] Failed to save settings to localStorage:', err)
    return false
  }
}

/**
 * Export settings JSON (strips any live keys/secrets)
 */
export function exportSettingsToJson(settings: BolDocumentSettings): string {
  const exportPayload: Partial<BolDocumentSettings> = {
    settings_version: settings.settings_version || '5.0.0',
    lastUpdated: new Date().toISOString(),
    companyName: settings.companyName,
    companyNamePersian: settings.companyNamePersian,
    companySubtitle: settings.companySubtitle,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    companyAddress: settings.companyAddress,
    companyLicence: settings.companyLicence,
    iranOffice: settings.iranOffice,
    logoUrl: settings.logoUrl.startsWith('data:') ? 'custom-logo' : settings.logoUrl,
    defaultBgImageUrl: settings.defaultBgImageUrl,
    defaultBgOpacity: settings.defaultBgOpacity,
    defaultShowStamp: settings.defaultShowStamp,
    stampScale: settings.stampScale,
    stampPosition: settings.stampPosition,
    pdfQuality: settings.pdfQuality,
    pdfImageCompression: settings.pdfImageCompression,
    printPaper: settings.printPaper,
    printOrientation: settings.printOrientation,
    printScale: settings.printScale,
    defaultCurrency: settings.defaultCurrency,
    defaultLanguage: settings.defaultLanguage,
    defaultTransitBorderNote: settings.defaultTransitBorderNote,
    watermarkFavorites: settings.watermarkFavorites,
  }

  return JSON.stringify(exportPayload, null, 2)
}

/**
 * Validate and parse imported settings JSON
 */
export function validateAndImportSettingsJson(
  rawJson: string,
  currentSettings: BolDocumentSettings
): { isValid: boolean; updatedSettings?: BolDocumentSettings; error?: string } {
  try {
    const parsed = JSON.parse(rawJson)

    if (typeof parsed !== 'object' || parsed === null) {
      return { isValid: false, error: 'File does not contain a valid JSON object' }
    }

    // Security: Reject if contains suspicious keys
    const rawKeys = Object.keys(parsed).map((k) => k.toLowerCase())
    if (rawKeys.some((k) => k.includes('password') || k.includes('secret') || k.includes('token') || k.includes('api_key'))) {
      return { isValid: false, error: 'Import rejected: settings JSON cannot contain credentials or secret keys' }
    }

    const merged: BolDocumentSettings = {
      ...currentSettings,
      settings_version: parsed.settings_version || currentSettings.settings_version,
      lastUpdated: new Date().toISOString(),

      companyName: typeof parsed.companyName === 'string' ? parsed.companyName : currentSettings.companyName,
      companyNamePersian: typeof parsed.companyNamePersian === 'string' ? parsed.companyNamePersian : currentSettings.companyNamePersian,
      companySubtitle: typeof parsed.companySubtitle === 'string' ? parsed.companySubtitle : currentSettings.companySubtitle,
      companyPhone: typeof parsed.companyPhone === 'string' ? parsed.companyPhone : currentSettings.companyPhone,
      companyEmail: typeof parsed.companyEmail === 'string' ? parsed.companyEmail : currentSettings.companyEmail,
      companyAddress: typeof parsed.companyAddress === 'string' ? parsed.companyAddress : currentSettings.companyAddress,
      companyLicence: typeof parsed.companyLicence === 'string' ? parsed.companyLicence : currentSettings.companyLicence,

      iranOffice: {
        ...currentSettings.iranOffice,
        ...(typeof parsed.iranOffice === 'object' && parsed.iranOffice !== null ? parsed.iranOffice : {}),
      },

      defaultBgImageUrl: typeof parsed.defaultBgImageUrl === 'string' ? parsed.defaultBgImageUrl : currentSettings.defaultBgImageUrl,
      defaultBgOpacity: typeof parsed.defaultBgOpacity === 'number' ? Math.max(0, Math.min(0.40, parsed.defaultBgOpacity)) : currentSettings.defaultBgOpacity,

      defaultShowStamp: typeof parsed.defaultShowStamp === 'boolean' ? parsed.defaultShowStamp : currentSettings.defaultShowStamp,
      stampScale: typeof parsed.stampScale === 'number' ? parsed.stampScale : currentSettings.stampScale,
      stampPosition: parsed.stampPosition === 'bottom-right' ? 'bottom-right' : 'carrier-box',

      pdfQuality: ['standard', 'high', 'archive'].includes(parsed.pdfQuality) ? parsed.pdfQuality : currentSettings.pdfQuality,
      pdfImageCompression: typeof parsed.pdfImageCompression === 'boolean' ? parsed.pdfImageCompression : currentSettings.pdfImageCompression,

      defaultCurrency: parsed.defaultCurrency === 'AFN' ? 'AFN' : 'USD',
      defaultLanguage: ['fa', 'ps', 'en'].includes(parsed.defaultLanguage) ? parsed.defaultLanguage : currentSettings.defaultLanguage,
      defaultTransitBorderNote: typeof parsed.defaultTransitBorderNote === 'string' ? parsed.defaultTransitBorderNote : currentSettings.defaultTransitBorderNote,

      watermarkFavorites: Array.isArray(parsed.watermarkFavorites) ? parsed.watermarkFavorites : currentSettings.watermarkFavorites,
    }

    return { isValid: true, updatedSettings: merged }
  } catch (err: any) {
    return { isValid: false, error: `Invalid JSON format: ${err?.message || 'Parse error'}` }
  }
}
