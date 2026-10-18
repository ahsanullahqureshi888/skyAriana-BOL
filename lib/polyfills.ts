/**
 * Polyfill crypto.randomUUID for environments where it is missing,
 * including non-secure contexts (e.g., LAN IP addresses over HTTP, older WebViews).
 */
if (typeof globalThis !== "undefined") {
  if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = {} as any
  }
  if (typeof globalThis.crypto.randomUUID !== "function") {
    globalThis.crypto.randomUUID = function (): `${string}-${string}-${string}-${string}-${string}` {
      if (typeof globalThis.crypto?.getRandomValues === "function") {
        const bytes = new Uint8Array(16)
        globalThis.crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }) as `${string}-${string}-${string}-${string}-${string}`
    }
  }
}

export function safeRandomUUID(): string {
  if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.randomUUID === "function") {
    try {
      return globalThis.crypto.randomUUID()
    } catch {}
  }
  if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Global ChunkLoadError auto-recovery for development and production HMR/rebuilds.
 * When the server rebuilds or restarts, stale browser tabs fail to fetch removed chunk hashes.
 * This listener catches the chunk failure and automatically reloads the page once.
 */
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const error = event.error || event.message
    const errorStr = String(error?.message || error || "")
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      errorStr.includes("Loading chunk") ||
      errorStr.includes("Failed to load chunk") ||
      errorStr.includes("_next/static/chunks") ||
      String(event?.message || "").includes("Loading chunk")

    if (isChunkError) {
      const storageKey = "aq_chunk_reload_timestamp"
      const lastReload = Number(sessionStorage.getItem(storageKey) || 0)
      const now = Date.now()
      // Only reload if we haven't reloaded for a chunk error within the last 15 seconds
      if (now - lastReload > 15000) {
        sessionStorage.setItem(storageKey, String(now))
        console.warn("[ChunkRecovery] Outdated webpack chunk detected. Reloading page to load latest build assets...")
        window.location.reload()
      }
    }
  })
}

/**
 * Storage quota overflow protection.
 * Prevents QuotaExceededError from crashing React components when saving cached documents or ledgers.
 */
if (typeof window !== "undefined" && window.Storage) {
  try {
    const originalSetItem = window.Storage.prototype.setItem
    window.Storage.prototype.setItem = function (key: string, value: string) {
      try {
        originalSetItem.call(this, key, value)
      } catch (err: any) {
        const isQuota =
          err?.name === "QuotaExceededError" ||
          err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          err?.code === 22 ||
          err?.code === 1014

        if (isQuota) {
          console.warn(`[Polyfill] Storage quota exceeded for "${key}". Pruning non-critical client caches...`)
          try {
            this.removeItem("skybol:backup-documents")
            this.removeItem("sky-bol-browser-documents")
            originalSetItem.call(this, key, value)
            return
          } catch {
            console.warn(`[Polyfill] Safely suppressed persistent QuotaExceededError for "${key}"`)
            return
          }
        }
        throw err
      }
    }
  } catch {}
}
