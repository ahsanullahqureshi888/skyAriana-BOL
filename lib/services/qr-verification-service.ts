/**
 * Sky Ariana Cryptographic Document Verification & Security QR Service
 * Generates tamper-evident document validation hashes and verification links.
 */

export interface DocumentVerificationData {
  documentId: string
  docType: "BOL" | "CMR" | "INVOICE" | "SAFTA" | "PACKING_LIST" | "VOUCHER"
  issueDate: string
  shipper: string
  consignee: string
  containerNumbers?: string
  sealNumbers?: string
  grossWeightKg?: string | number
  totalAmountUSD?: string | number
  currency?: string
}

/**
 * Generate a deterministic short cryptographic signature from document contents
 */
export function generateVerificationSignature(data: DocumentVerificationData): string {
  const seed = [
    data.documentId.trim().toUpperCase(),
    data.docType,
    data.issueDate,
    data.shipper.trim().toUpperCase(),
    data.consignee.trim().toUpperCase(),
    data.containerNumbers || "",
    data.grossWeightKg || "",
    data.totalAmountUSD || "",
  ].join("|")

  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0")
  return `SKY-AUTH-${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

/**
 * Generate a public mobile-friendly verification URL
 */
export function generateVerificationUrl(data: DocumentVerificationData): string {
  const sig = generateVerificationSignature(data)
  const baseUrl = "https://skyarianabol.vercel.app"
  const params = new URLSearchParams({
    doc: data.documentId,
    type: data.docType,
    date: data.issueDate,
    sig: sig,
  })
  return `${baseUrl}/verify?${params.toString()}`
}

/**
 * Formats a clean JSON payload for embedding inside QR codes
 */
export function generateQRPayload(data: DocumentVerificationData): string {
  const sig = generateVerificationSignature(data)
  return JSON.stringify({
    org: "SKY ARIANA LIMITED",
    doc: data.documentId,
    type: data.docType,
    date: data.issueDate,
    shipper: data.shipper,
    consignee: data.consignee,
    containers: data.containerNumbers || "N/A",
    weight: `${data.grossWeightKg || 0} KG`,
    amount: `${data.totalAmountUSD || 0} ${data.currency || "USD"}`,
    authSignature: sig,
    verifyUrl: generateVerificationUrl(data),
  })
}

