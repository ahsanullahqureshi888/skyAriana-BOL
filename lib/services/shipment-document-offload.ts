/**
 * Sky Ariana Logistics — Background Document Offload Service
 * 
 * Offloads heavy document compilation (Commercial Invoice, Packing List,
 * Transit Paper, Phytosanitary Certificate, Cargo Stickers, and Excel Workbooks)
 * to the background Python engine when running, preventing client-side main-thread UI freezes.
 * 
 * Provides transparent, 100% offline-first fallback to local vector/canvas generators
 * when the background service is unreachable.
 */

let _backendHealthCache: { available: boolean; timestamp: number } | null = null
const HEALTH_CACHE_TTL_MS = 30_000 // 30 seconds

/**
 * Checks if the backend document generation worker is available.
 * Cached for 30s with a strict 1500ms probe timeout to prevent blocking.
 */
export async function isDocumentBackendAvailable(): Promise<boolean> {
  const now = Date.now()
  if (_backendHealthCache && now - _backendHealthCache.timestamp < HEALTH_CACHE_TTL_MS) {
    return _backendHealthCache.available
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    const res = await fetch("/api/v1/reports", {
      method: "GET",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    const isOk = res.ok
    _backendHealthCache = { available: isOk, timestamp: now }
    return isOk
  } catch {
    _backendHealthCache = { available: false, timestamp: now }
    return false
  }
}

/**
 * Generic helper to post to the Python document engine and stream the resulting file blob.
 */
async function postAndDownloadBlob(
  endpoint: string,
  payload: Record<string, any>,
  timeoutMs: number = 8000
): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    if (!res.ok) return null

    const json = await res.json()
    if (!json.success || !json.data?.download_url) return null

    // Fetch the generated file binary
    const downloadRes = await fetch(json.data.download_url)
    if (!downloadRes.ok) return null

    const blob = await downloadRes.blob()
    return {
      blob,
      filename: json.data.filename || "document.pdf",
    }
  } catch (err) {
    console.warn(`[Document Offload] Backend request failed for ${endpoint}:`, err)
    return null
  }
}

/**
 * Offloads Commercial Invoice PDF compilation to the backend worker.
 */
export async function offloadCommercialInvoice(payload: {
  invoice_number: string
  invoice_date: string
  bol_number?: string
  currency?: string
  exporter_name: string
  exporter_address?: string
  consignee_name: string
  consignee_address?: string
  notify_party?: string
  country_of_origin?: string
  country_of_destination?: string
  port_of_loading?: string
  port_of_discharge?: string
  payment_terms?: string
  items: Array<{
    item_no?: number
    description: string
    hs_code?: string
    quantity: number
    unit?: string
    unit_price: number | string
    total_price?: number | string
  }>
  discount?: number
  tax?: number
  bank_details?: string
  remarks?: string
}): Promise<{ blob: Blob; filename: string } | null> {
  return postAndDownloadBlob("/api/v1/documents/invoice", payload)
}

/**
 * Offloads Packing List PDF compilation to the backend worker.
 */
export async function offloadPackingList(payload: {
  packing_list_no: string
  date: string
  bol_number?: string
  invoice_number?: string
  shipper_name: string
  consignee_name: string
  port_of_loading?: string
  port_of_discharge?: string
  items: Array<{
    item_no?: number
    container_no?: string
    seal_no?: string
    commodity: string
    cartons: number
    gross_weight_kg: number | string
    net_weight_kg: number | string
    marks?: string
  }>
  remarks?: string
}): Promise<{ blob: Blob; filename: string } | null> {
  return postAndDownloadBlob("/api/v1/documents/packing-list", payload)
}

/**
 * Offloads Transit Paper PDF compilation to the backend worker.
 */
export async function offloadTransitPaper(payload: {
  transit_number: string
  issue_date: string
  bol_number?: string
  truck_number: string
  driver_name: string
  driver_father_name?: string
  driver_license_passport?: string
  driver_phone?: string
  origin_city?: string
  destination_city?: string
  border_customs_station?: string
  container_number?: string
  seal_number?: string
  cargo_type?: string
  package_quantity?: number
  net_weight?: number | string
  gross_weight?: number | string
  customs_declaration_no?: string
  carrier_company?: string
  remarks?: string
}): Promise<{ blob: Blob; filename: string } | null> {
  return postAndDownloadBlob("/api/v1/documents/transit", payload)
}

/**
 * Offloads Phytosanitary Certificate PDF compilation to the backend worker.
 */
export async function offloadPhytosanitary(payload: {
  certificate_number: string
  issue_date: string
  bol_number?: string
  exporter_name: string
  exporter_address?: string
  consignee_name: string
  consignee_address?: string
  country_of_origin?: string
  country_of_destination?: string
  point_of_entry?: string
  commodity_name: string
  botanical_name?: string
  package_count?: number
  gross_weight?: number | string
  net_weight?: number | string
  treatment_type?: string
  treatment_duration_temp?: string
  chemical_concentration?: string
  inspection_date?: string
  remarks?: string
}): Promise<{ blob: Blob; filename: string } | null> {
  return postAndDownloadBlob("/api/v1/documents/phytosanitary", payload)
}

/**
 * Offloads Cargo Stickers PDF compilation to the backend worker.
 */
export async function offloadStickers(payload: {
  bol_number: string
  shipper_name: string
  consignee_name: string
  commodity: string
  container_number?: string
  gross_weight?: number | string
  destination?: string
  total_labels?: number
}): Promise<{ blob: Blob; filename: string } | null> {
  return postAndDownloadBlob("/api/v1/documents/stickers", payload)
}

/**
 * Offloads heavy ledger Excel export to the backend worker.
 */
export async function offloadLedgerExcelExport(payload: {
  account_name: string
  currency: string
  opening_balance: number | string
  entries: Array<{
    date: string
    bol_number?: string
    description: string
    debit: number | string
    credit: number | string
    balance: number | string
    truck_number?: string
    driver_name?: string
    notes?: string
  }>
}): Promise<{ blob: Blob; filename: string } | null> {
  return postAndDownloadBlob("/api/v1/documents/excel-export", payload, 12000)
}
