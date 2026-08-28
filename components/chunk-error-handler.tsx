"use client"

import { useEffect } from "react"

export function ChunkErrorHandler() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const errorMsg = reason?.message || String(reason || "")
      if (
        reason?.name === "ChunkLoadError" ||
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("Failed to load chunk") ||
        errorMsg.includes("_next/static/chunks")
      ) {
        event.preventDefault()
        const lastReload = Number(sessionStorage.getItem("sky_global_chunk_reload") || "0")
        const now = Date.now()
        if (now - lastReload > 12000) {
          sessionStorage.setItem("sky_global_chunk_reload", String(now))
          window.location.reload()
        }
      }
    }

    const handleError = (event: ErrorEvent) => {
      const errorMsg = event.message || String(event.error?.message || "")
      if (
        event.error?.name === "ChunkLoadError" ||
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("Failed to load chunk") ||
        errorMsg.includes("_next/static/chunks")
      ) {
        event.preventDefault()
        const lastReload = Number(sessionStorage.getItem("sky_global_chunk_reload") || "0")
        const now = Date.now()
        if (now - lastReload > 12000) {
          sessionStorage.setItem("sky_global_chunk_reload", String(now))
          window.location.reload()
        }
      }
    }

    window.addEventListener("unhandledrejection", handleRejection)
    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection)
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
