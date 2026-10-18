import { app } from "electron"
import { spawn, exec, type ChildProcess } from "node:child_process"
import { existsSync, createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import path from "node:path"

export type ConnectionMode = "local" | "server"

export type ConnectionState =
  | "LOCAL_STARTING"
  | "LOCAL_READY"
  | "SERVER_CONNECTING"
  | "SERVER_READY"
  | "OFFLINE"
  | "FAILED"

export interface NetworkConfig {
  mode: ConnectionMode
  serverHost: string
  serverPort: number
  useSsl: boolean
  customUrl?: string
}

export interface ServerStatusInfo {
  server_name: string
  version: string
  minimum_client_version: string
  connection_mode: string
  database_type: string
  maintenance_mode: boolean
  uptime_seconds: number
  server_time: string
}

export interface NetworkStatus {
  mode: ConnectionMode
  state: ConnectionState
  baseUrl: string
  latencyMs?: number | null
  serverInfo?: ServerStatusInfo | null
  lastError?: string | null
}

export interface BackendProcessStatus {
  isRunning: boolean
  pid: number | null
  port: number
  baseUrl: string
  restartCount: number
  lastError: string | null
  mode: ConnectionMode
  state: ConnectionState
}

const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  mode: "local",
  serverHost: "192.168.1.100",
  serverPort: 8000,
  useSsl: false,
}

export class ElectronBackendManager {
  private static instance: ElectronBackendManager | null = null
  private process: ChildProcess | null = null
  private port: number = 8000
  private baseUrl: string = "http://127.0.0.1:8000"
  private isIntentionallyStopped: boolean = false
  private restartCount: number = 0
  private maxRestarts: number = 5
  private lastRestartTime: number = 0
  private lastError: string | null = null
  private dataDirectory: string = ""

  // Phase 7 Network & Office Multi-PC state
  private mode: ConnectionMode = "local"
  private state: ConnectionState = "LOCAL_STARTING"
  private latencyMs: number | null = null
  private serverInfo: ServerStatusInfo | null = null
  private networkConfig: NetworkConfig = { ...DEFAULT_NETWORK_CONFIG }

  public static getInstance(): ElectronBackendManager {
    if (!ElectronBackendManager.instance) {
      ElectronBackendManager.instance = new ElectronBackendManager()
    }
    return ElectronBackendManager.instance
  }

  public getStatus(): BackendProcessStatus {
    return {
      isRunning: this.process !== null && !this.process.killed,
      pid: this.process?.pid ?? null,
      port: this.port,
      baseUrl: this.baseUrl,
      restartCount: this.restartCount,
      lastError: this.lastError,
      mode: this.mode,
      state: this.state,
    }
  }

  public getNetworkStatus(): NetworkStatus {
    return {
      mode: this.mode,
      state: this.state,
      baseUrl: this.baseUrl,
      latencyMs: this.latencyMs,
      serverInfo: this.serverInfo,
      lastError: this.lastError,
    }
  }

  public getNetworkConfig(): NetworkConfig {
    return { ...this.networkConfig }
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  public getPort(): number {
    return this.port
  }

  private getConfigFile(): string {
    const baseDir = typeof app.getPath === "function" ? app.getPath("userData") : process.cwd()
    return path.join(baseDir, "network-config.json")
  }

  public loadNetworkConfig(): NetworkConfig {
    try {
      const cfgPath = this.getConfigFile()
      if (existsSync(cfgPath)) {
        const raw = readFileSync(cfgPath, "utf-8")
        const parsed = JSON.parse(raw)
        this.networkConfig = { ...DEFAULT_NETWORK_CONFIG, ...parsed }
      }
    } catch (err) {
      console.warn("[BackendManager] Failed to read network-config.json, using defaults:", err)
      this.networkConfig = { ...DEFAULT_NETWORK_CONFIG }
    }

    // Allow ENV override
    if (process.env.SKY_CONNECTION_MODE === "server") {
      this.networkConfig.mode = "server"
    }
    if (process.env.SKY_SERVER_URL) {
      this.networkConfig.customUrl = process.env.SKY_SERVER_URL
    }

    this.mode = this.networkConfig.mode
    return this.networkConfig
  }

  public saveNetworkConfig(updates: Partial<NetworkConfig>): NetworkConfig {
    this.networkConfig = { ...this.networkConfig, ...updates }
    try {
      const cfgPath = this.getConfigFile()
      writeFileSync(cfgPath, JSON.stringify(this.networkConfig, null, 2), "utf-8")
    } catch (err) {
      console.error("[BackendManager] Failed to save network-config.json:", err)
    }
    return this.networkConfig
  }

  private resolveServerUrl(cfg: NetworkConfig): string {
    if (cfg.customUrl && cfg.customUrl.trim().length > 0) {
      return cfg.customUrl.trim().replace(/\/+$/, "")
    }
    const proto = cfg.useSsl ? "https" : "http"
    return `${proto}://${cfg.serverHost.trim()}:${cfg.serverPort}`
  }

  public async testServerConnection(url: string): Promise<{
    success: boolean
    latencyMs: number
    serverInfo?: ServerStatusInfo
    error?: string
  }> {
    const targetUrl = url.trim().replace(/\/+$/, "")
    const statusUrl = `${targetUrl}/api/v1/system/server-status`
    const fallbackHealthUrl = `${targetUrl}/api/v1/health`
    const start = Date.now()

    try {
      // 1. Try server-status endpoint first (FastAPI backend)
      let res = await fetch(statusUrl, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const latencyMs = Date.now() - start
        const info = (await res.json()) as ServerStatusInfo
        return { success: true, latencyMs, serverInfo: info }
      }

      // 2. Fallback to /health probe
      res = await fetch(fallbackHealthUrl, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const latencyMs = Date.now() - start
        const data = await res.json()
        return {
          success: true,
          latencyMs,
          serverInfo: {
            server_name: "Office Server",
            version: data.version || "1.0.0",
            minimum_client_version: "1.0.0",
            connection_mode: "server",
            database_type: "unknown",
            maintenance_mode: false,
            uptime_seconds: data.uptime_seconds || 0,
            server_time: data.timestamp || new Date().toISOString(),
          },
        }
      }

      return {
        success: false,
        latencyMs: Date.now() - start,
        error: `Server responded with HTTP ${res.status}: ${res.statusText}`,
      }
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err.message || "Connection timed out or host unreachable.",
      }
    }
  }

  public async switchMode(
    mode: ConnectionMode,
    serverConfig?: Partial<NetworkConfig>
  ): Promise<NetworkStatus> {
    console.log(`[BackendManager] Switching connection mode to: ${mode}`)
    if (serverConfig) {
      this.saveNetworkConfig({ ...serverConfig, mode })
    } else {
      this.saveNetworkConfig({ mode })
    }
    this.mode = mode

    if (mode === "server") {
      // Gracefully terminate local process if running
      if (this.process) {
        await this.stop()
      }
      return this.connectToServer()
    } else {
      // Switch back to local mode
      this.state = "LOCAL_STARTING"
      await this.start(this.dataDirectory)
      return this.getNetworkStatus()
    }
  }

  private async connectToServer(): Promise<NetworkStatus> {
    this.state = "SERVER_CONNECTING"
    const targetUrl = this.resolveServerUrl(this.networkConfig)
    this.baseUrl = targetUrl

    const testRes = await this.testServerConnection(targetUrl)
    if (testRes.success) {
      this.state = "SERVER_READY"
      this.latencyMs = testRes.latencyMs
      this.serverInfo = testRes.serverInfo || null
      this.lastError = null
      process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL = this.baseUrl
      process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL = this.baseUrl
      console.log(`[BackendManager] Successfully connected to Central Server at ${this.baseUrl} (${this.latencyMs}ms)`)
    } else {
      this.state = "OFFLINE"
      this.latencyMs = null
      this.serverInfo = null
      this.lastError = testRes.error || "Cannot reach Central Server."
      console.warn(`[BackendManager] Central Server unreachable: ${this.lastError}`)
    }

    return this.getNetworkStatus()
  }

  private async reservePort(preferredPort: number = 8000): Promise<number> {
    const isPortAvailable = (p: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const s = createServer()
        s.once("error", () => resolve(false))
        s.once("listening", () => {
          s.close(() => resolve(true))
        })
        s.listen(p, "127.0.0.1")
      })
    }

    if (await isPortAvailable(preferredPort)) {
      return preferredPort
    }

    // Allocate ephemeral open port
    return new Promise((resolve, reject) => {
      const server = createServer()
      server.unref()
      server.on("error", reject)
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()
        const port = typeof address === "object" && address ? address.port : preferredPort
        server.close(() => resolve(port))
      })
    })
  }

  private resolvePythonInterpreter(): { executable: string; argsPrefix: string[] } {
    const cwd = process.cwd()
    const appPath = typeof app.getAppPath === "function" ? app.getAppPath() : cwd

    // 1. Packaged standalone executable (Production)
    if (app.isPackaged) {
      const packagedExe = path.join(process.resourcesPath, "backend", "aq-backend.exe")
      if (existsSync(packagedExe)) {
        return { executable: packagedExe, argsPrefix: [] }
      }
      const legacyExe = path.join(process.resourcesPath, "backend", "sky-backend.exe")
      if (existsSync(legacyExe)) {
        return { executable: legacyExe, argsPrefix: [] }
      }
      const packagedPython = path.join(process.resourcesPath, "python", "python.exe")
      if (existsSync(packagedPython)) {
        return { executable: packagedPython, argsPrefix: ["-m", "uvicorn", "backend.main:app"] }
      }
    }

    // 1b. Check if compiled standalone backend exists in resources folder during local testing
    const localCompiledBackend = path.join(cwd, "resources", "backend", "aq-backend.exe")
    if (existsSync(localCompiledBackend)) {
      return { executable: localCompiledBackend, argsPrefix: [] }
    }

    // 2. Development project virtual environment (.venv)
    const candidateDirs = [cwd, appPath]
    for (const dir of candidateDirs) {
      const venvPython = process.platform === "win32"
        ? path.join(dir, ".venv", "Scripts", "python.exe")
        : path.join(dir, ".venv", "bin", "python")

      if (existsSync(venvPython)) {
        return { executable: venvPython, argsPrefix: ["-m", "uvicorn", "backend.main:app"] }
      }
    }

    // 3. Fallback to system python
    return { executable: process.platform === "win32" ? "python.exe" : "python3", argsPrefix: ["-m", "uvicorn", "backend.main:app"] }
  }

  private async waitForHealth(url: string, timeoutMs: number = 20000): Promise<void> {
    const startTime = Date.now()
    const healthUrl = `${url}/api/v1/health`
    let delay = 100

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) })
        if (res.ok) {
          const data = (await res.json()) as any
          if (data && data.status === "healthy") {
            return
          }
        }
      } catch {
        // Retry on initial network wait
      }
      await new Promise((r) => setTimeout(r, delay))
      if (delay < 300) delay += 50
    }
    throw new Error(`Python backend failed to report healthy within ${timeoutMs}ms at ${healthUrl}`)
  }

  public async start(dataDirectory?: string): Promise<string> {
    this.loadNetworkConfig()

    // If configured for Server Mode, do not spawn local python process
    if (this.mode === "server") {
      await this.connectToServer()
      return this.baseUrl
    }

    if (this.process && !this.process.killed) {
      this.state = "LOCAL_READY"
      return this.baseUrl
    }

    this.state = "LOCAL_STARTING"
    this.isIntentionallyStopped = false
    this.dataDirectory = dataDirectory || this.dataDirectory || path.join(app.getPath("userData"), "data")

    // Determine target port & check if already running
    const envPort = process.env.PYTHON_BACKEND_PORT ? parseInt(process.env.PYTHON_BACKEND_PORT, 10) : 8000
    try {
      const probeRes = await fetch(`http://127.0.0.1:${envPort}/api/v1/health`, {
        signal: AbortSignal.timeout(500),
      })
      if (probeRes.ok) {
        const body = (await probeRes.json()) as any
        if (body?.status === "healthy") {
          console.log(`[BackendManager] Reusing active Python backend on port ${envPort}`)
          this.port = envPort
          this.baseUrl = `http://127.0.0.1:${envPort}`
          this.state = "LOCAL_READY"
          process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL = this.baseUrl
          process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL = this.baseUrl
          return this.baseUrl
        }
      }
    } catch {}

    this.port = await this.reservePort(envPort)
    this.baseUrl = `http://127.0.0.1:${this.port}`

    const { executable, argsPrefix } = this.resolvePythonInterpreter()

    const args = [
      ...argsPrefix,
      "--host",
      "127.0.0.1",
      "--port",
      String(this.port),
      "--log-level",
      app.isPackaged ? "warning" : "info",
    ]

    const logsDir = path.join(this.dataDirectory, "logs")
    mkdirSync(logsDir, { recursive: true })

    const stdoutLog = createWriteStream(path.join(logsDir, "backend-stdout.log"), { flags: "a" })
    const stderrLog = createWriteStream(path.join(logsDir, "backend-stderr.log"), { flags: "a" })

    const env = {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      SKY_DATA_DIR: this.dataDirectory,
      SKY_DESKTOP: "1",
      APP_ENV: app.isPackaged ? "production" : "development",
      PYTHON_BACKEND_PORT: String(this.port),
    }

    console.log(`[BackendManager] Launching local Python backend on ${this.baseUrl} with ${executable}`)

    this.process = spawn(executable, args, {
      cwd: app.isPackaged ? process.resourcesPath : process.cwd(),
      windowsHide: true,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    this.process.stdout?.pipe(stdoutLog)
    this.process.stderr?.pipe(stderrLog)

    this.process.on("error", (err) => {
      this.lastError = err.message
      this.state = "FAILED"
      console.error("[BackendManager] Backend process failed to spawn:", err)
    })

    this.process.on("exit", (code, signal) => {
      console.warn(`[BackendManager] Backend process exited with code ${code}, signal ${signal}`)
      this.process = null

      if (!this.isIntentionallyStopped && this.mode === "local") {
        this.handleUnexpectedExit()
      }
    })

    // Poll healthcheck
    try {
      await this.waitForHealth(this.baseUrl, 30000)
      console.log(`[BackendManager] Python backend verified ready at ${this.baseUrl}`)
      this.state = "LOCAL_READY"
      this.lastError = null
      process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL = this.baseUrl
      process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL = this.baseUrl
      return this.baseUrl
    } catch (err: any) {
      this.lastError = err.message
      this.state = "FAILED"
      await this.stop()
      throw err
    }
  }

  private handleUnexpectedExit(): void {
    const now = Date.now()
    if (now - this.lastRestartTime > 60000) {
      this.restartCount = 0
    }
    this.lastRestartTime = now

    if (this.restartCount < this.maxRestarts) {
      this.restartCount++
      const delayMs = Math.min(1000 * Math.pow(2, this.restartCount - 1), 8000)
      console.warn(`[BackendManager] Auto-restarting backend attempt ${this.restartCount}/${this.maxRestarts} in ${delayMs}ms`)
      setTimeout(() => {
        if (!this.isIntentionallyStopped && this.mode === "local") {
          this.start(this.dataDirectory).catch((err) => {
            console.error("[BackendManager] Auto-restart failed:", err)
          })
        }
      }, delayMs)
    } else {
      console.error("[BackendManager] Maximum restart limit reached. Backend will remain stopped.")
      this.state = "FAILED"
    }
  }

  public async stop(): Promise<void> {
    this.isIntentionallyStopped = true
    if (!this.process) return

    const pid = this.process.pid
    return new Promise((resolve) => {
      if (!this.process || this.process.killed) {
        this.process = null
        resolve()
        return
      }

      const cleanupTimer = setTimeout(() => {
        if (pid && process.platform === "win32") {
          exec(`taskkill /pid ${pid} /T /F`, () => resolve())
        } else {
          this.process?.kill("SIGKILL")
          resolve()
        }
      }, 3000)

      this.process.once("exit", () => {
        clearTimeout(cleanupTimer)
        this.process = null
        resolve()
      })

      this.process.kill("SIGTERM")
    })
  }
}

export const backendManager = ElectronBackendManager.getInstance()
