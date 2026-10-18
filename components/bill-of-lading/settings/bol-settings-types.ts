export interface IranOfficeSettings {
  iran_office_building?: string
  iran_office_location?: string
  iran_office_pobox?: string
  iran_office_telefax?: string
  iran_office_cellphone?: string
  iran_office_email?: string
}

export interface CustomWatermarkItem {
  id: string
  label: string
  category: string
  url: string // Data URL or relative URL
  opacity: number
  format: 'svg' | 'png' | 'jpeg' | 'webp'
  createdAt: string
  version: number
  fileSizeBytes?: number
}

export interface BolDocumentSettings {
  settings_version: string // e.g. "5.0.0"
  lastUpdated: string

  // General Company Profile
  companyName: string
  companyNamePersian: string
  companySubtitle: string
  companyPhone: string
  companyEmail: string
  companyAddress: string
  companyLicence: string

  // Iran Office Information
  iranOffice: IranOfficeSettings

  // Logo & Branding
  logoUrl: string

  // Watermark Settings (Global Defaults)
  defaultBgImageUrl: string
  defaultBgOpacity: number
  watermarkFavorites: string[] // List of preset labels e.g. ["Premium Mountain", "Harbor Morning"]
  watermarkRecents: string[] // Recent preset labels
  customWatermarks: CustomWatermarkItem[]

  // Stamp & Signature
  defaultShowStamp: boolean
  stampScale: number // 0.8 to 1.5
  stampPosition: 'carrier-box' | 'bottom-right'

  // PDF & Print Preferences
  pdfQuality: 'standard' | 'high' | 'archive' // standard (1.5x), high (2x), archive (3x)
  pdfImageCompression: boolean
  printPaper: 'A4'
  printOrientation: 'portrait'
  printScale: number // 100%

  // Document Defaults
  defaultCurrency: 'USD' | 'AFN'
  defaultLanguage: 'en' | 'fa' | 'ps'
  defaultTransitBorderNote?: string
}

export const DEFAULT_BOL_SETTINGS: BolDocumentSettings = {
  settings_version: '5.0.0',
  lastUpdated: new Date().toISOString(),

  companyName: 'SKY ARIANA LIMITED',
  companyNamePersian: 'شرکت حمل و نقل بین المللی سکای آریانا لمیتد',
  companySubtitle: 'Import & Export - International Transportation',
  companyPhone: '+93 700 000 000',
  companyEmail: 'info@company.com',
  companyAddress: '2nd Floor, 16 No. Office, Shahidano, Chowk...',
  companyLicence: '2401-2198',

  iranOffice: {
    iran_office_building: 'CUBIC BUILDING',
    iran_office_location: 'BANDAR ABBASS - IRAN',
    iran_office_pobox: '7913973295',
    iran_office_telefax: '+98 76 32226028',
    iran_office_cellphone: '+98 09172325086',
    iran_office_email: 'info@balambarbaran.com',
  },

  logoUrl: '/images/sky-ariana-logo.png',

  defaultBgImageUrl: '/images/mountain-watermark-premium.png',
  defaultBgOpacity: 0.22,
  watermarkFavorites: ['Premium Mountain', 'Harbor Morning'],
  watermarkRecents: ['Harbor Morning', 'Premium Mountain', 'Horizon Route'],
  customWatermarks: [],

  defaultShowStamp: true,
  stampScale: 1.0,
  stampPosition: 'carrier-box',

  pdfQuality: 'high',
  pdfImageCompression: true,
  printPaper: 'A4',
  printOrientation: 'portrait',
  printScale: 100,

  defaultCurrency: 'USD',
  defaultLanguage: 'en',
  defaultTransitBorderNote: 'ISLAM QALA / TORGHUNDI',
}

export type SettingsTabId =
  | 'general'
  | 'watermark'
  | 'branding'
  | 'stamp'
  | 'pdf-print'
  | 'defaults'
  | 'backup'

export interface SettingsTabMeta {
  id: SettingsTabId
  label: string
  labelPersian: string
  description: string
}
