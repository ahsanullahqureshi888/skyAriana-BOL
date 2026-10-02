export const COMPANY_STAMP_SIGNATURE_SRC = "/images/company_stamp_signature.png"
export const COMPANY_STAMP_STORAGE_KEY = "sky_custom_stamp_signature"
export const COMPANY_STAMP_SCALE_KEY = "sky_custom_stamp_scale"
export const COMPANY_STAMP_ROTATION_KEY = "sky_custom_stamp_rotation"
export const COMPANY_STAMP_OPACITY_KEY = "sky_custom_stamp_opacity"
export const COMPANY_STAMP_TITLE_KEY = "sky_custom_stamp_title"
export const COMPANY_STAMP_SUBTITLE_KEY = "sky_custom_stamp_subtitle"
export const COMPANY_STAMP_ENABLED_KEY = "sky_custom_stamp_enabled"

export interface CompanyStampConfig {
  dataUrl: string
  scale: number
  rotation: number
  opacity: number
  signatoryTitle: string
  signatorySubtitle: string
  enabled: boolean
}

export const DEFAULT_STAMP_CONFIG: CompanyStampConfig = {
  dataUrl: COMPANY_STAMP_SIGNATURE_SRC,
  scale: 1.2,
  rotation: -1.5,
  opacity: 1.0,
  signatoryTitle: "FOR & ON BEHALF OF: SKY ARIANA LIMITED",
  signatorySubtitle: "مهر و امضای مجاز شرکت",
  enabled: true,
}

export function getStoredCompanyStamp(): string {
  if (typeof window === "undefined") return COMPANY_STAMP_SIGNATURE_SRC
  try {
    const stored = localStorage.getItem(COMPANY_STAMP_STORAGE_KEY)
    if (stored && stored.trim()) return stored
  } catch {}
  return COMPANY_STAMP_SIGNATURE_SRC
}

export function getStoredCompanyStampScale(): number {
  if (typeof window === "undefined") return 1.2
  try {
    const stored = localStorage.getItem(COMPANY_STAMP_SCALE_KEY)
    if (stored) {
      const num = parseFloat(stored)
      if (!isNaN(num) && num >= 0.4 && num <= 3.0) return num
    }
  } catch {}
  return 1.2
}

export function getStoredCompanyStampRotation(): number {
  if (typeof window === "undefined") return -1.5
  try {
    const stored = localStorage.getItem(COMPANY_STAMP_ROTATION_KEY)
    if (stored) {
      const num = parseFloat(stored)
      if (!isNaN(num) && num >= -45 && num <= 45) return num
    }
  } catch {}
  return -1.5
}

export function getStoredCompanyStampOpacity(): number {
  if (typeof window === "undefined") return 1.0
  try {
    const stored = localStorage.getItem(COMPANY_STAMP_OPACITY_KEY)
    if (stored) {
      const num = parseFloat(stored)
      if (!isNaN(num) && num >= 0.2 && num <= 1.0) return num
    }
  } catch {}
  return 1.0
}

export function getStoredCompanyStampConfig(): CompanyStampConfig {
  if (typeof window === "undefined") return { ...DEFAULT_STAMP_CONFIG }
  try {
    const dataUrl = localStorage.getItem(COMPANY_STAMP_STORAGE_KEY) || COMPANY_STAMP_SIGNATURE_SRC
    const scale = getStoredCompanyStampScale()
    const rotation = getStoredCompanyStampRotation()
    const opacity = getStoredCompanyStampOpacity()
    const signatoryTitle = localStorage.getItem(COMPANY_STAMP_TITLE_KEY) || DEFAULT_STAMP_CONFIG.signatoryTitle
    const signatorySubtitle = localStorage.getItem(COMPANY_STAMP_SUBTITLE_KEY) || DEFAULT_STAMP_CONFIG.signatorySubtitle
    const enabledRaw = localStorage.getItem(COMPANY_STAMP_ENABLED_KEY)
    const enabled = enabledRaw !== null ? enabledRaw === "true" : true

    return {
      dataUrl,
      scale,
      rotation,
      opacity,
      signatoryTitle,
      signatorySubtitle,
      enabled,
    }
  } catch {}
  return { ...DEFAULT_STAMP_CONFIG }
}

export function saveStoredCompanyStamp(dataUrl: string, scale?: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(COMPANY_STAMP_STORAGE_KEY, dataUrl)
    if (scale !== undefined) {
      localStorage.setItem(COMPANY_STAMP_SCALE_KEY, String(scale))
    }
    window.dispatchEvent(new CustomEvent("company_stamp_updated", { detail: { dataUrl, scale } }))
  } catch {}
}

export function saveStoredCompanyStampConfig(config: Partial<CompanyStampConfig>): void {
  if (typeof window === "undefined") return
  try {
    if (config.dataUrl !== undefined) {
      localStorage.setItem(COMPANY_STAMP_STORAGE_KEY, config.dataUrl)
    }
    if (config.scale !== undefined) {
      localStorage.setItem(COMPANY_STAMP_SCALE_KEY, String(config.scale))
    }
    if (config.rotation !== undefined) {
      localStorage.setItem(COMPANY_STAMP_ROTATION_KEY, String(config.rotation))
    }
    if (config.opacity !== undefined) {
      localStorage.setItem(COMPANY_STAMP_OPACITY_KEY, String(config.opacity))
    }
    if (config.signatoryTitle !== undefined) {
      localStorage.setItem(COMPANY_STAMP_TITLE_KEY, config.signatoryTitle)
    }
    if (config.signatorySubtitle !== undefined) {
      localStorage.setItem(COMPANY_STAMP_SUBTITLE_KEY, config.signatorySubtitle)
    }
    if (config.enabled !== undefined) {
      localStorage.setItem(COMPANY_STAMP_ENABLED_KEY, String(config.enabled))
    }

    window.dispatchEvent(new CustomEvent("company_stamp_updated", { detail: config }))
  } catch {}
}

export function resetStoredCompanyStamp(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(COMPANY_STAMP_STORAGE_KEY)
    localStorage.removeItem(COMPANY_STAMP_SCALE_KEY)
    localStorage.removeItem(COMPANY_STAMP_ROTATION_KEY)
    localStorage.removeItem(COMPANY_STAMP_OPACITY_KEY)
    localStorage.removeItem(COMPANY_STAMP_TITLE_KEY)
    localStorage.removeItem(COMPANY_STAMP_SUBTITLE_KEY)
    localStorage.removeItem(COMPANY_STAMP_ENABLED_KEY)
    window.dispatchEvent(new CustomEvent("company_stamp_updated", { detail: { ...DEFAULT_STAMP_CONFIG } }))
  } catch {}
}
