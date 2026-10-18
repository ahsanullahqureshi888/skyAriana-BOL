import React, { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { ModuleLoadFallback } from "@/components/system/module-load-fallback"
import { ModuleLoadingSkeleton } from "@/components/system/module-loading-skeleton"

export interface SafeLazyOptions {
  moduleName?: string
  timeoutMs?: number
  maxRetries?: number
}

function timeoutPromise<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg))
    }, ms)

    promise
      .then((res) => {
        clearTimeout(timer)
        resolve(res)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

async function loadWithRetry(
  importer: () => Promise<any>,
  maxRetries: number = 2,
  moduleName: string = "Module",
  timeoutMs: number = 45000
): Promise<any> {
  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const mod = await timeoutPromise(
        importer(),
        timeoutMs,
        `Loading for ${moduleName} timed out after ${(timeoutMs / 1000).toFixed(1)}s`
      )
      return mod
    } catch (err: any) {
      lastError = err
      const errorMsg = String(err?.message || err || "")
      const isChunkError =
        err?.name === "ChunkLoadError" ||
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("Failed to load chunk") ||
        errorMsg.includes("_next/static/chunks") ||
        errorMsg.includes("CSS chunk") ||
        errorMsg.includes("Failed to fetch dynamically imported module")

      if (attempt < maxRetries) {
        // Retry chunk loading after exponential backoff
        await new Promise((resolve) => setTimeout(resolve, isChunkError ? 800 * (attempt + 1) : 300))
      }
    }
  }

  throw lastError
}

function extractComponent(mod: any): React.ComponentType<any> {
  if (mod && mod.__esModule && mod.default) {
    return mod.default
  }
  if (mod && typeof mod === "object" && mod.default) {
    return mod.default
  }
  if (typeof mod === "function") {
    return mod
  }
  return mod?.default || mod
}

export function safeLazy<T = any>(
  importer: () => Promise<any>,
  options: SafeLazyOptions = {}
): () => Promise<{ default: React.ComponentType<any> }> {
  const { moduleName = "Application View", maxRetries = 2, timeoutMs = 45000 } = options

  return async () => {
    try {
      const mod = await loadWithRetry(importer, maxRetries, moduleName, timeoutMs)
      const Comp = extractComponent(mod)
      return { default: Comp }
    } catch (initialError: any) {
      console.warn(`[safeLazy] Failed to load module "${moduleName}":`, initialError)

      // Instead of an unresolved hanging promise or app crash, return an interactive fallback component
      const FallbackComponent: React.FC<any> = (props: any) => {
        const [ResolvedComponent, setResolvedComponent] = useState<React.ComponentType<any> | null>(null)
        const [currentError, setCurrentError] = useState<any>(initialError)
        const [isRetrying, setIsRetrying] = useState(false)

        const handleRetry = useCallback(async () => {
          setIsRetrying(true)
          setCurrentError(null)
          try {
            const freshMod = await loadWithRetry(importer, maxRetries, moduleName, timeoutMs)
            const FreshComp = extractComponent(freshMod)
            setResolvedComponent(() => FreshComp)
          } catch (retryErr: any) {
            console.error(`[safeLazy] Retry failed for module "${moduleName}":`, retryErr)
            const errMsg = String(retryErr?.message || retryErr || "")
            const isChunk =
              retryErr?.name === "ChunkLoadError" ||
              errMsg.includes("Loading chunk") ||
              errMsg.includes("Failed to load chunk") ||
              errMsg.includes("_next/static/chunks")
            if (typeof window !== "undefined" && isChunk) {
              window.location.reload()
              return
            }
            setCurrentError(retryErr)
          } finally {
            setIsRetrying(false)
          }
        }, [])

        if (ResolvedComponent) {
          return React.createElement(ResolvedComponent, props)
        }

        return React.createElement(ModuleLoadFallback, {
          moduleName,
          error: currentError,
          onRetry: handleRetry,
          isRetrying,
        })
      }

      FallbackComponent.displayName = `SafeLazyFallback(${moduleName})`
      return { default: FallbackComponent }
    }
  }
}

/**
 * Creates a safe dynamically-loaded component with 4-layer defense:
 * 1. Safe dynamic import with retry
 * 2. 3-stage loading watchdog (0-2s spinner, 2-5s warning, 5s+ fallback)
 * 3. Network/chunk failure auto-recovery
 * 4. Graceful interactive fallback with Return to Dashboard
 */
export function createSafeModule<T = any>(
  moduleName: string,
  importer: () => Promise<any>,
  options?: { timeoutMs?: number; maxRetries?: number }
) {
  const isDev = process.env.NODE_ENV !== "production"
  const defaultTimeout = isDev ? 45000 : 15000
  const timeout = options?.timeoutMs ?? defaultTimeout
  return dynamic(
    safeLazy(importer, { moduleName, timeoutMs: timeout, maxRetries: options?.maxRetries ?? 2 }),
    {
      loading: () => React.createElement(ModuleLoadingSkeleton, { moduleName, timeoutMs: timeout }),
    }
  )
}
