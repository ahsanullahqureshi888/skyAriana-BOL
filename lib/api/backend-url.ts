/**
 * Utility for resolving and checking the health of the local FastAPI Python backend.
 * Caches health state with a 10s TTL to prevent route latency when Python backend is offline or on a custom port.
 */

let cachedIsHealthy: boolean | null = null
let lastHealthCheck = 0

export function getFastApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL ||
    process.env.PYTHON_BACKEND_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "")
}

export async function isFastApiHealthy(): Promise<boolean> {
  const now = Date.now()
  if (cachedIsHealthy !== null && now - lastHealthCheck < 10000) {
    return cachedIsHealthy
  }

  try {
    const healthUrl = `${getFastApiBaseUrl()}/api/v1/health`
    const res = await fetch(healthUrl, {
      signal: AbortSignal.timeout(300),
      headers: { Accept: "application/json" },
    })

    if (res.ok) {
      const data = await res.json().catch(() => null)
      cachedIsHealthy = data?.status === "healthy"
    } else {
      cachedIsHealthy = false
    }
  } catch {
    cachedIsHealthy = false
  }

  lastHealthCheck = now
  return cachedIsHealthy
}

export function resetFastApiHealthCache(): void {
  cachedIsHealthy = null
  lastHealthCheck = 0
}
