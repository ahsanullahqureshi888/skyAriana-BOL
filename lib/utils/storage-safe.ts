/**
 * Safe client-side localStorage access utilities.
 * Handles QuotaExceededError, SSR safety, and automatic cache pruning to prevent UI crashes.
 */

export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  if (typeof window === "undefined") return fallback
  try {
    return window.localStorage.getItem(key)
  } catch {
    return fallback
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (err: any) {
    const isQuota =
      err?.name === "QuotaExceededError" ||
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err?.code === 22 ||
      err?.code === 1014

    if (isQuota) {
      console.warn(`[Storage] Quota exceeded while setting "${key}". Pruning redundant client caches...`)
      try {
        // Prune non-critical duplicate caches to free up megabytes
        window.localStorage.removeItem("skybol:backup-documents")
        window.localStorage.removeItem("sky-bol-browser-documents")
        // Try again with smaller payload if it's an array
        try {
          window.localStorage.setItem(key, value)
          return true
        } catch {
          // If still overflowing and payload is JSON array, slice to latest 100 items
          try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed) && parsed.length > 100) {
              const pruned = JSON.stringify(parsed.slice(0, 100))
              window.localStorage.setItem(key, pruned)
              return true
            }
          } catch {}
        }
      } catch (pruneErr) {
        console.warn("[Storage] Cache pruning error:", pruneErr)
      }
    }
    return false
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
