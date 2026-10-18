import { DocumentMetadata, DocumentType, ComplianceValidationResult, ComplianceProfile, DataConsistencyMatch } from "../types/document-compliance"

const STORAGE_KEY = "skybol:document-compliance"

export interface DocumentComplianceClientDatabase {
  documents: DocumentMetadata[]
  profiles: ComplianceProfile[]
}

export const DEFAULT_PROFILE: ComplianceProfile = {
  id: "profile_default_export",
  name: "Default Export Profile",
  isDefault: true,
  requirements: {
    "BILL_OF_LADING": true,
    "COMMERCIAL_INVOICE": true,
    "PACKING_LIST": true,
    "TRANSIT_PAPER": true,
    "PHYTOSANITARY_CERTIFICATE": true,
    "CERTIFICATE_OF_ORIGIN": true,
  },
  stageRequirements: {
    "Before Border Exit": ["BILL_OF_LADING", "COMMERCIAL_INVOICE", "PACKING_LIST", "TRANSIT_PAPER", "PHYTOSANITARY_CERTIFICATE"],
    "Before Vessel Departure": ["CERTIFICATE_OF_ORIGIN"],
  }
}

function getStoredDb(): DocumentComplianceClientDatabase {
  if (typeof window === "undefined") {
    return { documents: [], profiles: [DEFAULT_PROFILE] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        documents: Array.isArray(parsed?.documents) ? parsed.documents : [],
        profiles: Array.isArray(parsed?.profiles) && parsed.profiles.length > 0 ? parsed.profiles : [DEFAULT_PROFILE]
      }
    }
  } catch (e) {
    console.warn("Failed to load document compliance from localStorage:", e)
  }
  return { documents: [], profiles: [DEFAULT_PROFILE] }
}

function saveStoredDb(db: DocumentComplianceClientDatabase) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (e) {
    console.warn("Failed to save document compliance to localStorage:", e)
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").substring(0, 12)
  }
  return Math.random().toString(36).substring(2, 14)
}

export async function getShipmentDocuments(bolId: string): Promise<DocumentMetadata[]> {
  const db = getStoredDb()
  return db.documents.filter(d => d.bolId === bolId && !d.isArchived)
}

export async function upsertDocumentMetadata(doc: Partial<DocumentMetadata> & { bolId: string, type: DocumentType }): Promise<DocumentMetadata> {
  const db = getStoredDb()
  const existingIndex = db.documents.findIndex(d => d.bolId === doc.bolId && d.type === doc.type && !d.isArchived)
  const now = new Date().toISOString()

  if (existingIndex >= 0) {
    const existing = db.documents[existingIndex]
    const updated: DocumentMetadata = {
      ...existing,
      ...doc,
      version: (existing.version || 1) + 1,
      updatedAt: now
    }
    db.documents[existingIndex] = updated
    saveStoredDb(db)
    return updated
  } else {
    const newDoc: DocumentMetadata = {
      id: generateId(),
      status: "NOT_STARTED",
      visibility: "INTERNAL_ONLY",
      source: "GENERATED",
      category: "OTHER_DOCUMENTS",
      version: 1,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      createdBy: doc.createdBy || "system",
      ...doc
    }
    db.documents.push(newDoc)
    saveStoredDb(db)
    return newDoc
  }
}

export async function evaluateShipmentCompliance(bolId: string, bolData: any): Promise<ComplianceValidationResult> {
  const docs = await getShipmentDocuments(bolId)
  const db = getStoredDb()
  const profile = db.profiles.find(p => p.isDefault) || DEFAULT_PROFILE
  const requiredTypes = Object.keys(profile.requirements).filter(t => profile.requirements[t]) as DocumentType[]

  const missingDocs: DocumentType[] = []
  const pendingDocs: DocumentType[] = []
  const correctionDocs: DocumentType[] = []
  let completedCount = 0

  for (const rType of requiredTypes) {
    const found = docs.find(d => d.type === rType)
    if (!found || found.status === "NOT_STARTED" || found.status === "MISSING") {
      missingDocs.push(rType)
    } else if (found.status === "NEEDS_CORRECTION") {
      correctionDocs.push(rType)
    } else if (found.status === "APPROVED" || found.status === "GENERATED" || found.status === "UPLOADED") {
      completedCount++
    } else {
      pendingDocs.push(rType)
    }
  }

  const explicitlyNotRequired = docs.filter(d => d.status === "NOT_REQUIRED").map(d => d.type)
  const effectiveRequiredCount = requiredTypes.filter(rt => !explicitlyNotRequired.includes(rt)).length
  const completionScore = effectiveRequiredCount > 0 ? Math.round((completedCount / effectiveRequiredCount) * 100) : 100

  const stageReadiness: Record<string, boolean> = {}
  for (const [stage, stageReqs] of Object.entries(profile.stageRequirements)) {
    let ready = true
    for (const sReq of stageReqs) {
      if (explicitlyNotRequired.includes(sReq as DocumentType)) continue
      const found = docs.find(d => d.type === sReq && (d.status === "APPROVED" || d.status === "GENERATED" || d.status === "UPLOADED"))
      if (!found) {
        ready = false
        break
      }
    }
    stageReadiness[stage] = ready
  }

  const dataMismatches: DataConsistencyMatch[] = []

  return {
    bolId,
    completionScore,
    requiredCount: effectiveRequiredCount,
    completedCount,
    missingDocs,
    pendingDocs,
    correctionDocs,
    stageReadiness,
    dataMismatches
  }
}
