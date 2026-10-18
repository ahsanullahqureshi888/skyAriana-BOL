/**
 * Sky Ariana BOL & Logistics - Python Backend API Client.
 *
 * Provides strongly-typed access to FastAPI backend endpoints (/api/v1),
 * including health checks, readiness probes, system diagnostics, and core operations.
 */

export interface HealthResponse {
  status: "healthy" | "unhealthy"
  service: string
  version: string
  timestamp: string
  uptime_seconds: number
}

export interface ReadyResponse {
  status: "ready" | "not_ready"
  database: "connected" | "disconnected"
  storage: "ready" | "error"
  checks: {
    database?: {
      connected: boolean
      journal_mode?: string
      foreign_keys?: boolean
      busy_timeout_ms?: number
      error?: string
    }
    storage?: {
      path: string
      writable: boolean
      error?: string | null
    }
  }
}

export interface SystemInfoResponse {
  app_name: string
  version: string
  environment: string
  is_production: boolean
  python_version: string
  platform: string
  database_url: string
  database_engine: string
  sqlite_version?: string
  wal_mode: boolean
  data_directory: string
  logs_directory: string
  backups_directory: string
  exports_directory: string
  reports_directory: string
  server_time: string
  uptime_seconds: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface StandardApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface BOLRecord {
  id?: number
  bol_number: string
  origin: string
  border_station: string
  driver_name: string
  father_name?: string | null
  driver_rent: number
  carton_count: number
  gross_weight_kg: number
  net_weight_kg: number
  cargo_description?: string | null
  destination?: string | null
  status: string
  freight_fee?: number
  demurrage_fee?: number
  documentation_fee?: number
  currency?: string
  exchange_rate?: number
  created_at?: string
  updated_at?: string
}

export interface LedgerRecord {
  id?: number
  account_id: string
  account_name: string
  transaction_date: string
  description: string
  debit: number
  credit: number
  balance: number
  currency: string
  fee_type?: string | null
  exchange_rate?: number
  reference_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface LedgerInvarianceResult {
  account_id: string
  total_debit: number
  total_credit: number
  calculated_net_balance: number
  recorded_balance: number
  is_valid: boolean
  formula: string
}

export interface CompanyRecord {
  id?: number
  code: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  created_at?: string
  updated_at?: string
}

export interface CustomerRecord {
  id?: number
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  company_name?: string | null
  address?: string | null
  created_at?: string
  updated_at?: string
}

export interface ShipmentRecord {
  id?: number
  tracking_number: string
  bol_number?: string | null
  status: string
  origin?: string | null
  destination?: string | null
  estimated_delivery?: string | null
  actual_delivery?: string | null
  created_at?: string
  updated_at?: string
}

export interface ReportRecord {
  id?: number
  report_type: string
  format: string
  file_url: string
  generated_by?: string | null
  created_at?: string
}

export interface BackupRecord {
  id?: number
  filename: string
  size_bytes: number
  status: string
  note?: string | null
  include_documents: boolean
  created_at?: string
}

export class BackendApiError extends Error {
  public readonly status: number
  public readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "BackendApiError"
    this.status = status
    this.details = details
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  params?: Record<string, string | number | boolean | null | undefined>
  timeoutMs?: number
}

export class BackendApiClient {
  private static instance: BackendApiClient | null = null
  private baseUrl: string
  private lastLatencyMs: number | null = null

  constructor(baseUrl?: string) {
    const defaultUrl =
      process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL ||
      process.env.PYTHON_BACKEND_URL ||
      "http://127.0.0.1:8000"
    this.baseUrl = (baseUrl || defaultUrl).replace(/\/+$/, "")
  }

  public static getInstance(): BackendApiClient {
    if (!BackendApiClient.instance) {
      BackendApiClient.instance = new BackendApiClient()
    }
    return BackendApiClient.instance
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, "")
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  public getLastLatencyMs(): number | null {
    return this.lastLatencyMs
  }

  private buildUrl(path: string, params?: RequestOptions["params"]): string {
    const fullPath = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`
    const url = new URL(fullPath)
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.set(key, String(val))
        }
      })
    }
    return url.toString()
  }

  private inFlightGetRequests: Map<string, Promise<unknown>> = new Map()

  public async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const isGet = !options.method || options.method.toUpperCase() === "GET"
    const targetUrl = this.buildUrl(path, options.params)

    let cacheKey = targetUrl
    if (options.headers) {
      cacheKey = `${targetUrl}|${JSON.stringify(options.headers)}`
    }

    if (isGet && this.inFlightGetRequests.has(cacheKey)) {
      return this.inFlightGetRequests.get(cacheKey) as Promise<T>
    }

    const execPromise = this.executeRequest<T>(targetUrl, options)

    if (isGet) {
      this.inFlightGetRequests.set(cacheKey, execPromise)
      execPromise.finally(() => {
        this.inFlightGetRequests.delete(cacheKey)
      })
    }

    return execPromise
  }

  private async executeRequest<T = unknown>(targetUrl: string, options: RequestOptions): Promise<T> {
    const { timeoutMs = 15000, body, headers, ...customInit } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const startTime = performance.now()

    try {
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData
      const reqHeaders: Record<string, string> = {
        Accept: "application/json",
        ...(headers as Record<string, string>),
      }
      if (!isFormData && body && typeof body === "object") {
        reqHeaders["Content-Type"] = "application/json"
      }

      const response = await fetch(targetUrl, {
        ...customInit,
        headers: reqHeaders,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      this.lastLatencyMs = performance.now() - startTime

      const contentType = response.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      const data = isJson ? await response.json() : await response.text()

      if (!response.ok) {
        const errorMsg =
          (typeof data === "object" && (data?.error || data?.detail || data?.message)) ||
          `Backend request failed with HTTP ${response.status}`
        throw new BackendApiError(String(errorMsg), response.status, data)
      }

      return data as T
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new BackendApiError(`Backend request timed out after ${timeoutMs}ms`, 408)
      }
      if (err instanceof BackendApiError) {
        throw err
      }
      throw new BackendApiError(err?.message || "Network communication error with Python backend", 0, err)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // System & Health Endpoints
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/v1/health")
  }

  public async getReady(): Promise<ReadyResponse> {
    return this.request<ReadyResponse>("/api/v1/ready")
  }

  public async getSystemInfo(): Promise<SystemInfoResponse> {
    return this.request<SystemInfoResponse>("/api/v1/system/info")
  }

  // Bills of Lading
  public readonly bols = {
    list: (params?: { search?: string; page?: number; page_size?: number }) =>
      this.request<PaginatedResult<BOLRecord>>("/api/v1/bols", { params }),
    get: (bolNumber: string) =>
      this.request<StandardApiResponse<BOLRecord>>(`/api/v1/bols/${encodeURIComponent(bolNumber)}`),
    create: (data: BOLRecord) =>
      this.request<StandardApiResponse<BOLRecord>>("/api/v1/bols", { method: "POST", body: data }),
    delete: (bolNumber: string) =>
      this.request<StandardApiResponse<boolean>>(`/api/v1/bols/${encodeURIComponent(bolNumber)}`, {
        method: "DELETE",
      }),
  }

  // Ledgers & Accounting
  public readonly ledgers = {
    list: (params?: { account_id?: string; currency?: string; page?: number; page_size?: number }) =>
      this.request<PaginatedResult<LedgerRecord>>("/api/v1/ledgers", { params }),
    create: (data: LedgerRecord) =>
      this.request<StandardApiResponse<LedgerRecord>>("/api/v1/ledgers", { method: "POST", body: data }),
    checkInvariance: (accountId: string) =>
      this.request<StandardApiResponse<LedgerInvarianceResult>>(
        `/api/v1/ledgers/invariance-check/${encodeURIComponent(accountId)}`
      ),
  }

  // Companies
  public readonly companies = {
    list: (params?: { search?: string; page?: number; page_size?: number }) =>
      this.request<PaginatedResult<CompanyRecord>>("/api/v1/companies", { params }),
    get: (code: string) =>
      this.request<StandardApiResponse<CompanyRecord>>(`/api/v1/companies/${encodeURIComponent(code)}`),
    create: (data: Omit<CompanyRecord, "id" | "created_at" | "updated_at">) =>
      this.request<StandardApiResponse<CompanyRecord>>("/api/v1/companies", { method: "POST", body: data }),
  }

  // Customers
  public readonly customers = {
    list: (params?: { search?: string; page?: number; page_size?: number }) =>
      this.request<PaginatedResult<CustomerRecord>>("/api/v1/customers", { params }),
    create: (data: Omit<CustomerRecord, "id" | "created_at" | "updated_at">) =>
      this.request<StandardApiResponse<CustomerRecord>>("/api/v1/customers", { method: "POST", body: data }),
  }

  // Shipments
  public readonly shipments = {
    list: (params?: { status?: string; page?: number; page_size?: number }) =>
      this.request<PaginatedResult<ShipmentRecord>>("/api/v1/shipments", { params }),
    get: (trackingNumber: string) =>
      this.request<StandardApiResponse<ShipmentRecord>>(`/api/v1/shipments/${encodeURIComponent(trackingNumber)}`),
    create: (data: Omit<ShipmentRecord, "id" | "created_at" | "updated_at">) =>
      this.request<StandardApiResponse<ShipmentRecord>>("/api/v1/shipments", { method: "POST", body: data }),
  }

  // Reports
  public readonly reports = {
    list: () => this.request<PaginatedResult<ReportRecord>>("/api/v1/reports"),
    generate: (payload: { report_type: string; format?: string; start_date?: string; end_date?: string }) =>
      this.request<StandardApiResponse<ReportRecord>>("/api/v1/reports/generate", { method: "POST", body: payload }),
  }

  // Backups
  public readonly backups = {
    list: () => this.request<PaginatedResult<BackupRecord>>("/api/v1/backups"),
    create: (payload?: { note?: string; include_documents?: boolean }) =>
      this.request<StandardApiResponse<BackupRecord>>("/api/v1/backups/create", { method: "POST", body: payload || {} }),
  }

  // Documents & PDF/Excel Generation
  public readonly documents = {
    generate: (type: string, data: Record<string, any>, asyncJob = false) =>
      this.request<StandardApiResponse<any>>(`/api/v1/documents/${type}`, {
        method: "POST",
        body: { ...data, async_job: asyncJob },
      }),
    list: (params?: { q?: string; document_type?: string; bol_id?: string; page?: number; page_size?: number }) =>
      this.request<PaginatedResult<any>>("/api/v1/documents", { params }),
    getDownloadUrl: (category: string, filename: string) =>
      `/api/v1/documents/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`,
  }

  // Background Document Jobs
  public readonly jobs = {
    get: (jobId: string) =>
      this.request<StandardApiResponse<any>>(`/api/v1/jobs/${encodeURIComponent(jobId)}`),
  }
}

export const backendApi = BackendApiClient.getInstance()
