import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { mutateJsonFile, readJsonFile } from "@/lib/services/blob-db"
import type { PaymentProofRecord, PaymentProofStatus } from "@/lib/types/client-portal"

const PAYMENT_PROOFS_FILE = getDataPath(".local-payment-proofs.json")

export async function getPaymentProofs(): Promise<PaymentProofRecord[]> {
  const proofs = await readJsonFile<PaymentProofRecord[]>(PAYMENT_PROOFS_FILE, [])
  if (!Array.isArray(proofs)) return []
  return proofs
}

export async function getPaymentProofsByCompanyId(companyId: string): Promise<PaymentProofRecord[]> {
  const proofs = await getPaymentProofs()
  const cleanId = (companyId || "").trim().toLowerCase()
  return proofs.filter(p => (p.companyId || "").trim().toLowerCase() === cleanId)
}

export async function getPaymentProofById(id: string): Promise<PaymentProofRecord | null> {
  const proofs = await getPaymentProofs()
  return proofs.find(p => p.id === id) || null
}

export async function createPaymentProof(data: {
  companyId: string
  companyName: string
  invoiceNumber?: string
  bolNumber?: string
  amount: number
  currency: string
  reference?: string
  filePath?: string
  fileName?: string
  fileDataUrl?: string
  note?: string
  submittedBy: string
}): Promise<PaymentProofRecord> {
  const now = new Date().toISOString()
  const newRecord: PaymentProofRecord = {
    id: `proof-${randomUUID()}`,
    companyId: data.companyId,
    companyName: data.companyName,
    invoiceNumber: data.invoiceNumber || "",
    bolNumber: data.bolNumber || "",
    amount: Number(data.amount) || 0,
    currency: (data.currency || "USD").toUpperCase(),
    reference: data.reference || "",
    filePath: data.filePath || "",
    fileName: data.fileName || "",
    fileDataUrl: data.fileDataUrl || "",
    note: data.note || "",
    status: "SUBMITTED",
    submittedBy: data.submittedBy,
    createdAt: now,
    updatedAt: now,
  }

  await mutateJsonFile<PaymentProofRecord[]>(PAYMENT_PROOFS_FILE, [], (current) => {
    const list = Array.isArray(current) ? current : []
    return [newRecord, ...list]
  })

  return newRecord
}

export async function reviewPaymentProof(
  id: string,
  status: PaymentProofStatus,
  reviewerName: string,
  reviewNotes?: string
): Promise<PaymentProofRecord | null> {
  let updatedRecord: PaymentProofRecord | null = null

  await mutateJsonFile<PaymentProofRecord[]>(PAYMENT_PROOFS_FILE, [], (current) => {
    const list = Array.isArray(current) ? current : []
    const idx = list.findIndex(p => p.id === id)
    if (idx === -1) return list

    updatedRecord = {
      ...list[idx],
      status,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || list[idx].reviewNotes || "",
      updatedAt: new Date().toISOString(),
    }

    list[idx] = updatedRecord
    return list
  })

  return updatedRecord
}
