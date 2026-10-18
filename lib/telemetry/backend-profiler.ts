/**
 * AQ COMPANIES — Backend Profiling & Telemetry Utility
 * Version: 5.2.0
 *
 * Implements Section 4, 5, 6 of Performance Engineering Guidelines:
 * - Measures API routing, database queries, normalization, serialization, and payload sizes separately.
 * - STRICT PRIVACY: Logs ONLY route names, durations, counts, and byte sizes.
 * - NEVER logs customer names, financial values, or proprietary BOL data.
 */

export interface ProfileMetrics {
  route: string
  totalMs: number
  dbMs: number
  normalizeMs: number
  serializeMs: number
  payloadBytes: number
  payloadKb: number
  itemCount?: number
}

export class RouteProfiler {
  private startTime = performance.now()
  private dbTime = 0
  private normalizeTime = 0
  private serializeTime = 0
  private routeName: string

  constructor(routeName: string) {
    this.routeName = routeName
  }

  /**
   * Measure a database or filesystem query block.
   */
  async trackDb<T>(fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now()
    try {
      return await fn()
    } finally {
      this.dbTime += performance.now() - start
    }
  }

  /**
   * Measure a normalization or transformation block.
   */
  trackNormalize<T>(fn: () => T): T {
    const start = performance.now()
    try {
      return fn()
    } finally {
      this.normalizeTime += performance.now() - start
    }
  }

  /**
   * Measure JSON serialization / packaging.
   */
  trackSerialize<T>(fn: () => T): T {
    const start = performance.now()
    try {
      return fn()
    } finally {
      this.serializeTime += performance.now() - start
    }
  }

  /**
   * Complete profiling and log structured metrics without private data.
   */
  finish(payload: any, itemCount?: number): ProfileMetrics {
    const totalMs = Math.round((performance.now() - this.startTime) * 100) / 100
    const dbMs = Math.round(this.dbTime * 100) / 100
    const normalizeMs = Math.round(this.normalizeTime * 100) / 100
    const serializeMs = Math.round(this.serializeTime * 100) / 100

    let payloadBytes = 0
    if (typeof payload === "string") {
      payloadBytes = Buffer.byteLength(payload, "utf8")
    } else if (payload && typeof payload === "object") {
      try {
        payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8")
      } catch {
        payloadBytes = 0
      }
    }

    const payloadKb = Math.round((payloadBytes / 1024) * 10) / 10

    const metrics: ProfileMetrics = {
      route: this.routeName,
      totalMs,
      dbMs,
      normalizeMs,
      serializeMs,
      payloadBytes,
      payloadKb,
      itemCount,
    }

    // In development or when debug is active, log metrics (NO PRIVATE DATA)
    if (process.env.NODE_ENV !== "production" || process.env.PERF_DEBUG === "true") {
      console.log(
        `[PERF-TIMING] ${metrics.route} | total: ${metrics.totalMs}ms | db: ${metrics.dbMs}ms | normalize: ${metrics.normalizeMs}ms | serialize: ${metrics.serializeMs}ms | payload: ${metrics.payloadKb}KB${metrics.itemCount !== undefined ? ` | items: ${metrics.itemCount}` : ""}`
      )
    }

    return metrics
  }
}

export function createProfiler(routeName: string): RouteProfiler {
  return new RouteProfiler(routeName)
}
