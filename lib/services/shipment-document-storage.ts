import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "./blob-db"
import type {
  ShipmentDocumentRecord,
  ShipmentDocumentType,
} from "@/lib/types/shipment-document-package"

const SHIPMENT_DOCUMENTS_FILE = getDataPath(".local-shipment-documents.json")
const DOCUMENT_COUNTERS_FILE = getDataPath(".local-document-counters.json")

interface DocumentCounters {
  commercial_invoice: number
  packing_list: number
  transit_paper: number
  phytosanitary: number
  stickers: number
}

const DEFAULT_COUNTERS: DocumentCounters = {
  commercial_invoice: 1,
  packing_list: 1,
  transit_paper: 1,
  phytosanitary: 1,
  stickers: 1,
}

export async function getNextDocumentSequence(
  type: keyof DocumentCounters,
  prefix: string
): Promise<string> {
  const currentYear = new Date().getFullYear()
  let nextVal = 1

  await mutateJsonFile<DocumentCounters>(
    DOCUMENT_COUNTERS_FILE,
    DEFAULT_COUNTERS,
    (current) => {
      const existing =
        current && typeof current === "object" ? current : DEFAULT_COUNTERS
      nextVal =
        Number.isSafeInteger(existing[type]) && existing[type] > 0
          ? existing[type]
          : 1
      return {
        ...existing,
        [type]: nextVal + 1,
      }
    }
  )

  return `${prefix}-${currentYear}-${String(nextVal).padStart(4, "0")}`
}

export async function nextCommercialInvoiceNumber(): Promise<string> {
  return getNextDocumentSequence("commercial_invoice", "CI")
}

export async function nextPackingListNumber(): Promise<string> {
  return getNextDocumentSequence("packing_list", "PL")
}

export async function nextTransitPaperNumber(): Promise<string> {
  return getNextDocumentSequence("transit_paper", "TP")
}

export async function nextPhytoDraftNumber(): Promise<string> {
  return getNextDocumentSequence("phytosanitary", "PHY-DRAFT")
}

export async function getAllShipmentDocuments(): Promise<ShipmentDocumentRecord[]> {
  const docs = await readJsonFile<ShipmentDocumentRecord[]>(
    SHIPMENT_DOCUMENTS_FILE,
    []
  )
  if (!Array.isArray(docs)) return []
  return docs
}

export async function getShipmentDocumentsByBol(
  bolNumber: string
): Promise<ShipmentDocumentRecord[]> {
  const all = await getAllShipmentDocuments()
  const clean = bolNumber.trim().toLowerCase()
  return all.filter((d) => d.bolNumber.trim().toLowerCase() === clean)
}

export async function getShipmentDocumentById(
  id: string
): Promise<ShipmentDocumentRecord | null> {
  const all = await getAllShipmentDocuments()
  return all.find((d) => d.id === id) || null
}

export async function getShipmentDocumentByBolAndType(
  bolNumber: string,
  type: ShipmentDocumentType
): Promise<ShipmentDocumentRecord | null> {
  const all = await getAllShipmentDocuments()
  const clean = bolNumber.trim().toLowerCase()
  return (
    all.find(
      (d) =>
        d.bolNumber.trim().toLowerCase() === clean && d.documentType === type
    ) || null
  )
}

export async function saveShipmentDocument(
  doc: ShipmentDocumentRecord
): Promise<ShipmentDocumentRecord> {
  await mutateJsonFile<ShipmentDocumentRecord[]>(
    SHIPMENT_DOCUMENTS_FILE,
    [],
    (list) => {
      const existing = Array.isArray(list) ? list : []
      const idx = existing.findIndex(
        (d) =>
          d.id === doc.id ||
          (d.bolNumber.trim().toLowerCase() === doc.bolNumber.trim().toLowerCase() &&
            d.documentType === doc.documentType)
      )

      if (idx >= 0) {
        existing[idx] = {
          ...doc,
          updatedAt: new Date().toISOString(),
        }
        return existing
      }
      return [doc, ...existing]
    }
  )

  return doc
}

export async function saveShipmentDocumentsBatch(
  docs: ShipmentDocumentRecord[]
): Promise<ShipmentDocumentRecord[]> {
  if (!docs.length) return []

  await mutateJsonFile<ShipmentDocumentRecord[]>(
    SHIPMENT_DOCUMENTS_FILE,
    [],
    (list) => {
      const existing = Array.isArray(list) ? [...list] : []

      for (const doc of docs) {
        const idx = existing.findIndex(
          (d) =>
            d.id === doc.id ||
            (d.bolNumber.trim().toLowerCase() === doc.bolNumber.trim().toLowerCase() &&
              d.documentType === doc.documentType)
        )
        if (idx >= 0) {
          existing[idx] = {
            ...doc,
            updatedAt: new Date().toISOString(),
          }
        } else {
          existing.unshift(doc)
        }
      }

      return existing
    }
  )

  return docs
}
