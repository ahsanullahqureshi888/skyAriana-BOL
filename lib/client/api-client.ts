/**
 * Client-side API client for communicating with the Sky Ariana Central Server.
 * Supports token authentication, connection status monitoring, latency measurement,
 * and automatic fallback / error recovery.
 */

export type ConnectionStatus = "connected" | "reconnecting" | "offline" | "unconfigured"

export interface ServerConnectionState {
  status: ConnectionStatus
  serverUrl: string
  latencyMs: number | null
  lastChecked: string | null
  errorMessage?: string
}

type StatusListener = (state: ServerConnectionState) => void

class ServerApiClient {
  private static instance: ServerApiClient
  private serverUrl: string = ""
  private token: string = ""
  private deviceId: string = ""
  private status: ConnectionStatus = "unconfigured"
  private latencyMs: number | null = null
  private lastChecked: string | null = null
  private listeners: Set<StatusListener> = new Set()
  private pingInterval: ReturnType<typeof setInterval> | null = null

  private constructor() {
    if (typeof window !== "undefined") {
      this.loadSettings()
      this.startHealthCheck()
    }
  }

  public static getInstance(): ServerApiClient {
    if (!ServerApiClient.instance) {
      ServerApiClient.instance = new ServerApiClient()
    }
    return ServerApiClient.instance
  }

  private loadSettings(): void {
    try {
      this.serverUrl = localStorage.getItem("sky_server_url") || ""
      this.token = localStorage.getItem("sky_server_token") || ""
      this.deviceId = localStorage.getItem("sky_server_device_id") || ""
      if (this.serverUrl && this.token) {
        this.status = "reconnecting"
      } else {
        this.status = "unconfigured"
      }
    } catch {
      // In SSR or if localStorage blocked
    }
  }

  public saveCredentials(serverUrl: string, token: string, deviceId: string): void {
    this.serverUrl = serverUrl.replace(/\/+$/, "")
    this.token = token
    this.deviceId = deviceId
    if (typeof window !== "undefined") {
      localStorage.setItem("sky_server_url", this.serverUrl)
      localStorage.setItem("sky_server_token", this.token)
      localStorage.setItem("sky_server_device_id", this.deviceId)
    }
    this.checkConnection()
  }

  public clearCredentials(): void {
    this.serverUrl = ""
    this.token = ""
    this.deviceId = ""
    this.status = "unconfigured"
    this.latencyMs = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("sky_server_url")
      localStorage.removeItem("sky_server_token")
      localStorage.removeItem("sky_server_device_id")
    }
    this.notify()
  }

  public getState(): ServerConnectionState {
    return {
      status: this.status,
      serverUrl: this.serverUrl,
      latencyMs: this.latencyMs,
      lastChecked: this.lastChecked,
    }
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const state = this.getState()
    for (const listener of this.listeners) {
      try {
        listener(state)
      } catch (err) {
        console.error("[ApiClient] Listener error:", err)
      }
    }
  }

  public async checkConnection(): Promise<boolean> {
    if (!this.serverUrl) {
      this.status = "unconfigured"
      this.notify()
      return false
    }

    const start = Date.now()
    try {
      const res = await fetch(`${this.serverUrl}/api/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        signal: AbortSignal.timeout(4000),
      })

      if (res.ok) {
        this.latencyMs = Date.now() - start
        this.status = "connected"
        this.lastChecked = new Date().toISOString()
        this.notify()
        return true
      } else {
        this.status = "reconnecting"
        this.lastChecked = new Date().toISOString()
        this.notify()
        return false
      }
    } catch {
      this.status = "offline"
      this.latencyMs = null
      this.lastChecked = new Date().toISOString()
      this.notify()
      return false
    }
  }

  private startHealthCheck(): void {
    if (this.pingInterval) clearInterval(this.pingInterval)
    this.pingInterval = setInterval(() => {
      if (this.serverUrl && this.token) {
        void this.checkConnection()
      }
    }, 15000) // Every 15 seconds
  }

  /**
   * Tests whether a given candidate server URL responds to /api/health
   */
  public async testServerUrl(url: string): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const cleanUrl = url.replace(/\/+$/, "")
    const start = Date.now()
    try {
      const res = await fetch(`${cleanUrl}/api/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` }
      }
      const data = await res.json()
      if (data.service?.includes("Sky Ariana")) {
        return { success: true, latencyMs: Date.now() - start }
      }
      return { success: false, error: "Server responded, but is not a Sky Ariana Server." }
    } catch (err: any) {
      return { success: false, error: err.message || "Connection timed out" }
    }
  }

  /**
   * Claim pairing code on remote server
   */
  public async pair(serverUrl: string, code: string, deviceName: string): Promise<boolean> {
    const cleanUrl = serverUrl.replace(/\/+$/, "")
    const res = await fetch(`${cleanUrl}/api/server/pairing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, deviceName }),
    })

    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to pair with server")
    }

    this.saveCredentials(cleanUrl, json.token, json.deviceId)
    return true
  }

  /**
   * Authenticated request to server
   */
  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.serverUrl) {
      throw new Error("Server URL is not configured.")
    }

    const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    const fullUrl = `${this.serverUrl}${cleanPath}`

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const res = await fetch(fullUrl, {
      ...options,
      headers,
    })

    if (!res.ok) {
      if (res.status === 401) {
        this.status = "unconfigured"
        this.notify()
      }
      const errorData = await res.json().catch(() => ({}))
      const err: any = new Error(errorData.error || `HTTP ${res.status}`)
      err.status = res.status
      err.data = errorData
      throw err
    }

    return res.json()
  }
}

export const apiClient = ServerApiClient.getInstance()
