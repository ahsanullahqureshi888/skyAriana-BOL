import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../services/api'
import type { CompanyBranding, CompanySettings } from '../types'
import { cacheCompanyBranding, COMPANY_BRANDING_STORAGE_KEY, readCachedCompanyBranding } from '../config/branding'

export const COMPANY_SETTINGS_QUERY_KEY = ['settings'] as const
export const COMPANY_BRANDING_QUERY_KEY = ['company-branding'] as const

export const useCompanySettings = () => useQuery<CompanySettings>({
  queryKey: COMPANY_SETTINGS_QUERY_KEY,
  queryFn: settingsApi.get,
  staleTime: 30_000,
})

export const useCompanyBranding = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const syncBranding = (event: StorageEvent) => {
      if (event.key !== COMPANY_BRANDING_STORAGE_KEY) return
      const cachedBranding = readCachedCompanyBranding()
      if (cachedBranding) queryClient.setQueryData(COMPANY_BRANDING_QUERY_KEY, cachedBranding)
    }

    window.addEventListener('storage', syncBranding)
    return () => window.removeEventListener('storage', syncBranding)
  }, [queryClient])

  return useQuery<CompanyBranding>({
    queryKey: COMPANY_BRANDING_QUERY_KEY,
    queryFn: async () => {
      const branding = await settingsApi.getPublicBranding()
      cacheCompanyBranding(branding)
      return branding
    },
    initialData: readCachedCompanyBranding,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
  })
}
