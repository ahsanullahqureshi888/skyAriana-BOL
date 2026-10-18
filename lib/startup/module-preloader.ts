/**
 * Intelligent Module Preloader
 * Warms up JavaScript chunks during idle periods and on hover
 * for near-instant navigation without delaying initial startup.
 */

const preloadedSet = new Set<string>()

export function preloadModule(key: string, importer: () => Promise<any>): void {
  if (preloadedSet.has(key)) return
  preloadedSet.add(key)

  try {
    importer().catch((err) => {
      // Allow retry on future hover if failed
      preloadedSet.delete(key)
      console.debug(`[Preloader] Background prefetch for ${key} paused:`, err?.message)
    })
  } catch {}
}

export function scheduleIdlePreloads(
  modules: Array<{ key: string; importer: () => Promise<any> }>
): void {
  if (typeof window === "undefined") return

  const executePreloads = () => {
    modules.forEach(({ key, importer }, index) => {
      setTimeout(() => {
        preloadModule(key, importer)
      }, index * 500)
    })
  }

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(executePreloads, { timeout: 4000 })
  } else {
    setTimeout(executePreloads, 2000)
  }
}
