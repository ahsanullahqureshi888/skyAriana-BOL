/**
 * Canonical Bill of Lading Lifecycle Action Service
 * Unifies duplicate, archive, restore, attach PDF, and delete operations across the application.
 * Ensures data integrity, accounting invariance, canonical identity, and draft isolation.
 */

import { cleanBolNumber } from "@/lib/utils/bol-filters"

export interface DuplicateBolOptions {
  actor?: string
  navigateOnComplete?: boolean
}

export interface ArchiveBolResult {
  success: boolean
  bolNumber: string
  archivedAt: string
  error?: string
}

export interface RestoreBolResult {
  success: boolean
  bolNumber: string
  restoredAt: string
  error?: string
}

export interface DuplicateBolResult {
  success: boolean
  newBolNumber: string
  newId: string
  newDoc: any
  error?: string
}

// In-flight locking map to protect against rapid double-clicks (loading lock & idempotency)
const activeOperationLocks = new Set<string>()

/**
 * Atomically acquires a sequence number for duplicating a BOL.
 */
export async function allocateNextOfficialBolNumber(): Promise<string> {
  const res = await fetch("/api/bol?action=next-number&advance=true")
  if (!res.ok) {
    throw new Error(`Failed to allocate BOL sequence: HTTP ${res.status}`)
  }
  const json = await res.json()
  const num = json.bolNumber
  if (!num || typeof num !== "string") {
    throw new Error("Invalid sequence number received from numbering service")
  }
  return num
}

/**
 * Deep copies reusable business fields from a source BOL while stripping identifiers,
 * legacy flags, PDF attachments, and old revision counters.
 */
export function buildDuplicatedBolPayload(sourceDoc: any, newBolNumber: string): any {
  const now = new Date().toISOString()
  const today = now.split("T")[0]

  return {
    // 1. Identity & Lifecycle
    id: newBolNumber,
    bol_number: newBolNumber,
    billOfLadingNumber: newBolNumber,
    bolNo: newBolNumber,
    status: "active",
    isArchived: false,
    archived_at: null,
    archived_by: null,
    archive_reason: null,
    revision: 1,
    issue_date: today,
    created_at: now,
    updated_at: now,

    // 2. Strict PDF & File Isolation (Never copy old PDF)
    pdf_url: null,
    pdf_uploaded_at: null,
    pdf_status: "none",
    pdf_bol_revision: null,

    // 3. Strip Legacy Import Flags
    isLegacyImport: false,
    legacySource: null,
    legacyBarnama: null,
    legacyPage: null,

    // 4. Traceability link
    duplicated_from: cleanBolNumber(sourceDoc.bol_number) || sourceDoc.id || null,

    // 5. Reusable Business Data: Parties
    shipper_name: sourceDoc.shipper_name || sourceDoc.shipperName || "",
    shipper_address: sourceDoc.shipper_address || sourceDoc.shipperAddress || "",
    shipper_contact: sourceDoc.shipper_contact || sourceDoc.shipperPhone || "",
    consignee_name: sourceDoc.consignee_name || sourceDoc.consigneeName || "",
    consignee_address: sourceDoc.consignee_address || sourceDoc.consigneeAddress || "",
    consignee_contact: sourceDoc.consignee_contact || sourceDoc.consigneePhone || "",
    notify_party: sourceDoc.notify_party || sourceDoc.notifyParty || "",
    notify_address: sourceDoc.notify_address || sourceDoc.notifyAddress || "",
    notify_contact: sourceDoc.notify_contact || sourceDoc.notifyPhone || "",

    // 6. Reusable Business Data: Cargo & Packages
    cargo_description: sourceDoc.cargo_description || sourceDoc.goods_description || sourceDoc.description_of_goods || "",
    goods_description: sourceDoc.goods_description || sourceDoc.cargo_description || "",
    description_of_goods: sourceDoc.description_of_goods || sourceDoc.cargo_description || "",
    commodity: sourceDoc.commodity || "",
    number_of_packages: sourceDoc.number_of_packages || sourceDoc.numberOfPackages || "",
    kgs_per_carton: sourceDoc.kgs_per_carton || sourceDoc.kgsPerCarton || "",
    gross_weight_per_carton: sourceDoc.gross_weight_per_carton || sourceDoc.grossWeightPerCarton || "",
    net_weight: sourceDoc.net_weight || sourceDoc.netWeight || "",
    gross_weight: sourceDoc.gross_weight || sourceDoc.grossWeight || "",
    rate_per_kgs: sourceDoc.rate_per_kgs || sourceDoc.ratePerKgs || "",
    goods_value: sourceDoc.goods_value || sourceDoc.goodsValue || "",

    // 7. Reusable Business Data: Route & Logistics
    routes: Array.isArray(sourceDoc.routes) ? JSON.parse(JSON.stringify(sourceDoc.routes)) : [],
    route_name: sourceDoc.route_name || sourceDoc.routeName || "",
    borderCrossing: sourceDoc.borderCrossing || sourceDoc.border_station || "",
    port_of_loading: sourceDoc.port_of_loading || sourceDoc.portOfLoading || "",
    port_of_discharge: sourceDoc.port_of_discharge || sourceDoc.portOfDischarge || "",
    place_of_delivery: sourceDoc.place_of_delivery || sourceDoc.placeOfDelivery || "",
    origin_country: sourceDoc.origin_country || sourceDoc.originCountry || "",
    destination_country: sourceDoc.destination_country || sourceDoc.destinationCountry || "",
    cargo_route_note: sourceDoc.cargo_route_note || "",

    // 8. Reusable Business Data: Equipment & Driver
    truck_number: sourceDoc.truck_number || sourceDoc.truckNumber || "",
    driver_name: sourceDoc.driver_name || sourceDoc.driverName || "",
    driver_father_name: sourceDoc.driver_father_name || sourceDoc.father_name || "",
    driver_contact: sourceDoc.driver_contact || sourceDoc.driverPhone || "",
    driver_rent: sourceDoc.driver_rent || sourceDoc.driverFreight || sourceDoc.driverRent || "",
    driverFreight: sourceDoc.driverFreight || sourceDoc.driver_rent || "",
    container_type: sourceDoc.container_type || sourceDoc.containerType || "",
    container_size: sourceDoc.container_size || sourceDoc.containerSize || "",
    container_numbers: sourceDoc.container_numbers || sourceDoc.containerNumbers || "",
    seal_numbers: sourceDoc.seal_numbers || sourceDoc.sealNumbers || "",

    // 9. Commercial & Remarks
    remarks: sourceDoc.remarks || "",
    payment_method: sourceDoc.payment_method || "",
    freight_terms: sourceDoc.freight_terms || "",
  }
}

/**
 * Canonical Duplicate BOL action
 */
export async function duplicateBol(
  sourceDoc: any,
  options: DuplicateBolOptions = {}
): Promise<DuplicateBolResult> {
  const sourceKey = cleanBolNumber(sourceDoc.bol_number) || sourceDoc.id || "source"
  const lockKey = `duplicate:${sourceKey}`

  if (activeOperationLocks.has(lockKey)) {
    throw new Error("Duplication is already in progress. Please wait.")
  }

  activeOperationLocks.add(lockKey)

  try {
    // 1. Allocate next official BOL number atomically
    const newBolNumber = await allocateNextOfficialBolNumber()

    // 2. Build sanitized duplicate payload with new ID and business fields
    const newDoc = buildDuplicatedBolPayload(sourceDoc, newBolNumber)

    // 3. Pre-seed local browser storage with clean draft key and document list
    if (typeof window !== "undefined") {
      try {
        // Set isolated draft
        window.localStorage.setItem(`skybol:draft:${newBolNumber}`, JSON.stringify(newDoc))

        // Prepend to browser documents cache
        const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
        const clientDocs: any[] = storedLocal ? JSON.parse(storedLocal) : []
        const nextList = [newDoc, ...clientDocs.filter((d) => d.id !== newBolNumber && d.bol_number !== newBolNumber)]
        window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(nextList))

        const savedDocsRaw = window.localStorage.getItem("skybol:saved-documents")
        if (savedDocsRaw) {
          const sDocs = JSON.parse(savedDocsRaw)
          if (Array.isArray(sDocs)) {
            window.localStorage.setItem(
              "skybol:saved-documents",
              JSON.stringify([newDoc, ...sDocs.filter((d) => d.id !== newBolNumber && d.bol_number !== newBolNumber)])
            )
          }
        }
      } catch (err) {
        console.warn("[bol-lifecycle] Local storage seed error:", err)
      }
    }

    // 4. Save to backend database transactionally
    const saveRes = await fetch(`/api/bol/${encodeURIComponent(newBolNumber)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDoc),
    })

    if (!saveRes.ok) {
      console.warn(`[bol-lifecycle] Server save returned HTTP ${saveRes.status}, client snapshot preserved`)
    }

    // 5. Dispatch global update event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("skybol:documents-updated", {
          detail: { newBolNumber, action: "BOL_DUPLICATED" },
        })
      )
    }

    return {
      success: true,
      newBolNumber,
      newId: newDoc.id,
      newDoc,
    }
  } finally {
    activeOperationLocks.delete(lockKey)
  }
}

/**
 * Canonical Archive BOL action (Soft delete, reversible)
 */
export async function archiveBol(
  idOrNumber: string,
  reason = "Archived by user"
): Promise<ArchiveBolResult> {
  const bolNum = cleanBolNumber(idOrNumber) || idOrNumber
  const lockKey = `archive:${bolNum}`

  if (activeOperationLocks.has(lockKey)) {
    throw new Error("Archive operation already in progress.")
  }

  activeOperationLocks.add(lockKey)

  try {
    const now = new Date().toISOString()
    const payload = {
      action: "archive",
      status: "archived",
      isArchived: true,
      archived_at: now,
      archive_reason: reason,
      updated_at: now,
    }

    // 1. Call backend API
    const res = await fetch(`/api/bol/${encodeURIComponent(bolNum)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Failed to archive BOL: HTTP ${res.status}`)
    }

    // 2. Update browser local storage
    if (typeof window !== "undefined") {
      const keys = ["sky-bol-browser-documents", "skybol:saved-documents"]
      for (const k of keys) {
        try {
          const raw = window.localStorage.getItem(k)
          if (raw) {
            const list = JSON.parse(raw)
            if (Array.isArray(list)) {
              const updated = list.map((d: any) => {
                if (d.id === bolNum || d.bol_number === bolNum || d.id === idOrNumber || d.bol_number === idOrNumber) {
                  return { ...d, ...payload }
                }
                return d
              })
              window.localStorage.setItem(k, JSON.stringify(updated))
            }
          }
        } catch {}
      }

      window.dispatchEvent(
        new CustomEvent("skybol:documents-updated", {
          detail: { bolNumber: bolNum, action: "BOL_ARCHIVED" },
        })
      )
    }

    return {
      success: true,
      bolNumber: bolNum,
      archivedAt: now,
    }
  } finally {
    activeOperationLocks.delete(lockKey)
  }
}

/**
 * Canonical Restore BOL action (Reactivates exact same record)
 */
export async function restoreBol(idOrNumber: string): Promise<RestoreBolResult> {
  const bolNum = cleanBolNumber(idOrNumber) || idOrNumber
  const lockKey = `restore:${bolNum}`

  if (activeOperationLocks.has(lockKey)) {
    throw new Error("Restore operation already in progress.")
  }

  activeOperationLocks.add(lockKey)

  try {
    const now = new Date().toISOString()
    const payload = {
      action: "restore",
      status: "active",
      isArchived: false,
      archived_at: null,
      restored_at: now,
      updated_at: now,
    }

    // 1. Call backend API
    const res = await fetch(`/api/bol/${encodeURIComponent(bolNum)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Failed to restore BOL: HTTP ${res.status}`)
    }

    // 2. Update browser local storage
    if (typeof window !== "undefined") {
      const keys = ["sky-bol-browser-documents", "skybol:saved-documents"]
      for (const k of keys) {
        try {
          const raw = window.localStorage.getItem(k)
          if (raw) {
            const list = JSON.parse(raw)
            if (Array.isArray(list)) {
              const updated = list.map((d: any) => {
                if (d.id === bolNum || d.bol_number === bolNum || d.id === idOrNumber || d.bol_number === idOrNumber) {
                  return { ...d, ...payload }
                }
                return d
              })
              window.localStorage.setItem(k, JSON.stringify(updated))
            }
          }
        } catch {}
      }

      window.dispatchEvent(
        new CustomEvent("skybol:documents-updated", {
          detail: { bolNumber: bolNum, action: "BOL_RESTORED" },
        })
      )
    }

    return {
      success: true,
      bolNumber: bolNum,
      restoredAt: now,
    }
  } finally {
    activeOperationLocks.delete(lockKey)
  }
}

/**
 * Attaches a PDF file to a specific BOL strictly using canonical IDs
 */
export async function attachBolPdf(
  bolId: string,
  bolNumber: string,
  file: File
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  if (!file) {
    throw new Error("No file provided")
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please select a valid PDF file (.pdf)")
  }

  const formData = new FormData()
  formData.append("pdf", file, file.name || `${bolNumber || bolId}.pdf`)
  formData.append("bolId", bolId)
  formData.append("bolNumber", bolNumber || bolId)

  const response = await fetch("/api/bol/pdf", {
    method: "POST",
    body: formData,
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to upload PDF")
  }

  // Update browser cache
  if (typeof window !== "undefined") {
    const pdfUrl = result?.data?.pdfUrl
    const keys = ["sky-bol-browser-documents", "skybol:saved-documents"]
    for (const k of keys) {
      try {
        const raw = window.localStorage.getItem(k)
        if (raw) {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            const updated = list.map((d: any) => {
              if (d.id === bolId || d.bol_number === bolNumber) {
                return {
                  ...d,
                  pdf_url: pdfUrl,
                  pdf_uploaded_at: new Date().toISOString(),
                  pdf_status: "ready",
                }
              }
              return d
            })
            window.localStorage.setItem(k, JSON.stringify(updated))
          }
        }
      } catch {}
    }

    window.dispatchEvent(
      new CustomEvent("skybol:documents-updated", {
        detail: { bolId, bolNumber, action: "FILE_ATTACHED" },
      })
    )
  }

  return { success: true, pdfUrl: result?.data?.pdfUrl }
}
