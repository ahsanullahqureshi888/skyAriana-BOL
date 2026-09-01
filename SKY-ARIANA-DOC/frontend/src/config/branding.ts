import defaultLogo from '../assets/logo_optimized.png'
import { MASTER_LOGO_DATA_URI } from './logoBase64'
import type { CompanyBranding } from '../types'

export const BRAND_LOGO_SRC = MASTER_LOGO_DATA_URI || defaultLogo

export const DEFAULT_COMPANY_NAME = 'SKY ARIANA GROUP OF COMPANIES'
export const DEFAULT_COMPANY_SUBTITLE = 'IMPORT • EXPORT • LOGISTICS • CARGO • FREIGHT'
export const COMPANY_BRANDING_STORAGE_KEY = 'company-branding'

export const readCachedCompanyBranding = (): CompanyBranding | undefined => {
  if (typeof window === 'undefined') return undefined

  try {
    const value = JSON.parse(window.localStorage.getItem(COMPANY_BRANDING_STORAGE_KEY) || 'null')
    if (!value || typeof value.company_name !== 'string' || !value.company_name.trim()) return undefined
    return {
      company_name: value.company_name,
      subtitle: typeof value.subtitle === 'string' ? value.subtitle : DEFAULT_COMPANY_SUBTITLE,
      logo_path: typeof value.logo_path === 'string' ? value.logo_path : null,
    }
  } catch {
    return undefined
  }
}

export const cacheCompanyBranding = (branding: CompanyBranding) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COMPANY_BRANDING_STORAGE_KEY, JSON.stringify(branding))
}

export const resolveBrandAssetUrl = (path?: string) => {
  if (!path) return BRAND_LOGO_SRC
  if (path.startsWith('data:image/')) return path
  if (path === 'uploads/logo.png' || path === 'logo.png' || path === '/logo.png' || path === '/uploads/logo.png') {
    return BRAND_LOGO_SRC
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && path.includes('localhost:8000')) {
      const pathname = path.replace(/https?:\/\/localhost:8000\/?/, '')
      return `/${pathname.replace(/\\/g, '/').replace(/^\/+/, '')}`
    }
    return path
  }
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      const origin = new URL(apiBase).origin
      return `${origin}/${normalized}`
    } catch {
      return `/${normalized}`
    }
  }
  return `/${normalized}`
}
