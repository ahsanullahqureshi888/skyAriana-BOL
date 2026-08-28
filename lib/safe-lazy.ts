import React from "react"

export function safeLazy<T = any>(
  importer: () => Promise<any>
): () => Promise<{ default: React.ComponentType<any> }> {
  return async () => {
    try {
      const mod = await importer()
      if (mod && mod.__esModule && mod.default) {
        return mod
      }
      if (mod && typeof mod === "object" && mod.default) {
        return mod
      }
      if (typeof mod === "function") {
        return { default: mod }
      }
      return { default: mod }
    } catch (error: any) {
      const errorMsg = String(error?.message || error || "")
      const isChunkError =
        error?.name === "ChunkLoadError" ||
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("Failed to load chunk") ||
        errorMsg.includes("_next/static/chunks") ||
        errorMsg.includes("CSS chunk")

      if (isChunkError && typeof window !== "undefined") {
        const lastReload = Number(sessionStorage.getItem("sky_chunk_auto_reload") || "0")
        const now = Date.now()
        if (now - lastReload > 12000) {
          sessionStorage.setItem("sky_chunk_auto_reload", String(now))
          window.location.reload()
          return new Promise(() => {})
        }
      }
      throw error
    }
  }
}
