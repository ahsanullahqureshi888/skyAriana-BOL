/**
 * Sky Ariana BOL - Optimized Company Stamp Signature Fallback
 * 
 * Replaces monolithic 1MB static base64 string with lightweight 1x1 transparent PNG fallback
 * and an on-demand async loader that fetches `/images/company_stamp_signature.png` without
 * bloating client bundle size.
 */

export const COMPANY_STAMP_SIGNATURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

let cachedStampDataUrl: string | null = null

export async function getCompanyStampDataUrl(): Promise<string> {
  if (cachedStampDataUrl) return cachedStampDataUrl
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/images/company_stamp_signature.png")
      if (res.ok) {
        const blob = await res.blob()
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const dataUrl = (reader.result as string) || COMPANY_STAMP_SIGNATURE_DATA_URL
            cachedStampDataUrl = dataUrl
            resolve(dataUrl)
          }
          reader.onerror = () => resolve(COMPANY_STAMP_SIGNATURE_DATA_URL)
          reader.readAsDataURL(blob)
        })
      }
    } catch {
      // Fallback on network failure
    }
  }
  return COMPANY_STAMP_SIGNATURE_DATA_URL
}
