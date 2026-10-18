import { DocumentMetadata, DocumentType, DocumentStatus, DocumentVersion, ComplianceValidationResult, ComplianceProfile, DataConsistencyMatch } from "../types/document-compliance"
import { getLedgerSystemDb, saveLedgerSystemDb } from "./ledger-db-service"
import { mutateJsonFile } from "./blob-db"
import { getDataPath } from "../server-paths"
import crypto from "crypto"

export interface DocumentComplianceDatabase {
  documents: DocumentMetadata[]
  versions: DocumentVersion[]
  profiles: ComplianceProfile[]
}

const DB_FILE = getDataPath("document-compliance.json")

const DEFAULT_PROFILE: ComplianceProfile = {
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

export async function getDocumentComplianceDb(): Promise<DocumentComplianceDatabase> {
  return await mutateJsonFile<DocumentComplianceDatabase>(DB_FILE, {
    documents: [],
    versions: [],
    profiles: [DEFAULT_PROFILE]
  }, (db) => db)
}

export async function saveDocumentComplianceDb(db: DocumentComplianceDatabase): Promise<void> {
  await mutateJsonFile<DocumentComplianceDatabase>(DB_FILE, db, () => db)
}

export async function getShipmentDocuments(bolId: string): Promise<DocumentMetadata[]> {
  const db = await getDocumentComplianceDb()
  return db.documents.filter(d => d.bolId === bolId && !d.isArchived)
}

export async function upsertDocumentMetadata(doc: Partial<DocumentMetadata> & { bolId: string, type: DocumentType }): Promise<DocumentMetadata> {
  const db = await getDocumentComplianceDb()
  const existingIndex = db.documents.findIndex(d => d.bolId === doc.bolId && d.type === doc.type && !d.isArchived)
  
  const now = new Date().toISOString()
  
  if (existingIndex >= 0) {
    const existing = db.documents[existingIndex]
    const updated = {
      ...existing,
      ...doc,
      version: existing.version + 1,
      updatedAt: now
    }
    db.documents[existingIndex] = updated
    
    // Save new version
    db.versions.push({
      versionId: crypto.randomBytes(6).toString("hex"),
      documentId: updated.id,
      versionNumber: updated.version,
      filePath: updated.filePath || "",
      createdAt: now,
      createdBy: doc.createdBy || "system",
      status: updated.status
    })
    
    await saveDocumentComplianceDb(db)
    return updated
  } else {
    const newDoc: DocumentMetadata = {
      id: crypto.randomBytes(6).toString("hex"),
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
    db.versions.push({
      versionId: crypto.randomBytes(6).toString("hex"),
      documentId: newDoc.id,
      versionNumber: 1,
      filePath: newDoc.filePath || "",
      createdAt: now,
      createdBy: newDoc.createdBy,
      status: newDoc.status
    })
    
    await saveDocumentComplianceDb(db)
    return newDoc
  }
}

export async function evaluateShipmentCompliance(bolId: string, bolData: any): Promise<ComplianceValidationResult> {
  const docs = await getShipmentDocuments(bolId)
  const db = await getDocumentComplianceDb()
  
  // Find applicable profile
  // Simplistic matching: just use default for now
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
  
  // Exclude overridden NOT_REQUIRED docs
  const explicitlyNotRequired = docs.filter(d => d.status === "NOT_REQUIRED").map(d => d.type)
  const effectiveRequiredCount = requiredTypes.filter(rt => !explicitlyNotRequired.includes(rt)).length
  const completionScore = effectiveRequiredCount > 0 ? Math.round((completedCount / effectiveRequiredCount) * 100) : 100
  
  const stageReadiness: Record<string, boolean> = {}
  for (const [stage, stageReqs] of Object.entries(profile.stageRequirements)) {
    let ready = true
    for (const sReq of stageReqs) {
      if (explicitlyNotRequired.includes(sReq as DocumentType)) continue;
      const found = docs.find(d => d.type === sReq && (d.status === "APPROVED" || d.status === "GENERATED" || d.status === "UPLOADED"))
      if (!found) {
        ready = false
        break
      }
    }
    stageReadiness[stage] = ready
  }
  
  // Mock data mismatch check (extend logic later with actual BOL data)
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
