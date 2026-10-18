/**
 * AQ COMPANIES — Performance Markers & Telemetry Utility
 * Version: 5.2.0
 *
 * Implements high-resolution instrumentation for core user flows:
 * - APP_START / APP_READY
 * - SAVED_BOLS_OPEN / SAVED_BOLS_DATA_READY
 * - BOL_OPEN / BOL_HYDRATED
 * - A4_PREVIEW_OPEN / A4_PREVIEW_READY
 * - LEDGER_OPEN / LEDGER_READY
 * - REPORT_CENTER_OPEN / REPORT_CENTER_READY
 * - FILES_OPEN / FILES_READY
 * - PDF_GENERATE_START / PDF_GENERATE_DONE
 *
 * Production Safe:
 * - Zero overhead when debug is disabled
 * - No console spam in production builds
 * - Safe fallback if performance API is unavailable
 */

export const PERF_MARKERS = {
  APP_START: "APP_START",
  APP_READY: "APP_READY",
  SAVED_BOLS_OPEN: "SAVED_BOLS_OPEN",
  SAVED_BOLS_DATA_READY: "SAVED_BOLS_DATA_READY",
  BOL_OPEN: "BOL_OPEN",
  BOL_HYDRATED: "BOL_HYDRATED",
  A4_PREVIEW_OPEN: "A4_PREVIEW_OPEN",
  A4_PREVIEW_READY: "A4_PREVIEW_READY",
  LEDGER_OPEN: "LEDGER_OPEN",
  LEDGER_READY: "LEDGER_READY",
  REPORT_CENTER_OPEN: "REPORT_CENTER_OPEN",
  REPORT_CENTER_READY: "REPORT_CENTER_READY",
  FILES_OPEN: "FILES_OPEN",
  FILES_READY: "FILES_READY",
  PDF_GENERATE_START: "PDF_GENERATE_START",
  PDF_GENERATE_DONE: "PDF_GENERATE_DONE",
} as const

export type PerfMarkerName = keyof typeof PERF_MARKERS | string

const isDebug = () => {
  if (typeof window === "undefined") return false
  try {
    return (
      process.env.NODE_ENV !== "production" ||
      window.localStorage.getItem("sky_perf_debug") === "true"
    )
  } catch {
    return false
  }
}

/**
 * Record a high-resolution performance mark.
 */
export function markPerf(marker: PerfMarkerName): void {
  if (typeof performance === "undefined" || !performance.mark) return
  try {
    performance.mark(marker)
  } catch {}
}

/**
 * Measures the duration between start and end marks.
 * Returns measured duration in milliseconds, or null if marks missing.
 */
export function measurePerf(
  measureName: string,
  startMarker: PerfMarkerName,
  endMarker?: PerfMarkerName
): number | null {
  if (typeof performance === "undefined" || !performance.measure) return null
  try {
    if (!endMarker) {
      markPerf(`${measureName}_END`)
    }
    const end = endMarker || `${measureName}_END`
    const measure = performance.measure(measureName, startMarker, end)
    const duration = Math.round(measure.duration * 100) / 100

    if (isDebug()) {
      console.debug(`[PERF] ⏱️ ${measureName}: ${duration}ms`)
    }

    // Clean up temporary measures to prevent memory leaks in long sessions
    try {
      performance.clearMarks(startMarker)
      performance.clearMarks(end)
      performance.clearMeasures(measureName)
    } catch {}

    return duration
  } catch {
    return null
  }
}

/**
 * Start and measure an async operation automatically.
 */
export async function trackPerfAsync<T>(
  label: string,
  startMarker: PerfMarkerName,
  endMarker: PerfMarkerName,
  fn: () => Promise<T>
): Promise<T> {
  markPerf(startMarker)
  try {
    const res = await fn()
    markPerf(endMarker)
    measurePerf(label, startMarker, endMarker)
    return res
  } catch (err) {
    markPerf(endMarker)
    measurePerf(`${label}_ERROR`, startMarker, endMarker)
    throw err
  }
}
