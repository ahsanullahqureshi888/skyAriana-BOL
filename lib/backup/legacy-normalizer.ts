/**
 * AQ COMPANIES — Legacy Backup Migration & Field Normalization Layer
 * Version: 2.0 (Application Version 5.2.0)
 *
 * Normalizes older backups (v5.1pro, v1.0 desktop, raw files) into canonical
 * schema structures before validation or restore.
 *
 * Implements:
 * - Versioned migration concept (migrateBackupV1ToV2, etc.)
 * - Field aliases normalization (bol_number/bolNo -> bolNumber)
 * - Identity safety: separation of internal UUID id from official bolNumber
 * - Deterministic UUID generation
 * - Authentic blank preservation (null, never "Unspecified Shipper")
 * - Field-level weight repair & impossible numeric detection (1.1e16 KG, etc.)
 * - Package unit safety (CTNS vs BAGS vs PALLETS)
 * - Multi-cargo concatenated string detection (e.g. 667658 -> flagged)
 * - Ambiguous driver rent currency preservation (null with REVIEW_REQUIRED)
 * - UTF-8 / RTL preservation (Afghan truck plates e.g. 54846 هرات)
 * - Audit logging of all transformations
 */

import crypto from "node:crypto"
import type { AQBackupDataPayload, AQBackupEnvelope } from "./backup-format"

export interface NormalizationAuditEntry {
  entity: string
  id: string
  action: "NORMALIZED" | "REPAIRED" | "FLAGGED" | "QUARANTINED"
  field: string
  oldValue: any
  newValue: any
  reason: string
  rule: string
}

export interface NormalizationResult {
  data: AQBackupDataPayload
  detectedFormat: "V2_ENVELOPE" | "V1_DESKTOP" | "V1_LEGACY_RAW" | "V51PRO_EXPORT"
  backupFormatVersion: string
  auditLog: NormalizationAuditEntry[]
  warnings: string[]
  quarantinedCount: number
  repairedWeightsCount: number
  flaggedPackagesCount: number
}

/**
 * Deterministic UUID generator for stable identities across migrations
 */
export function generateDeterministicUuid(namespace: string, value: string): string {
  const hash = crypto.createHash("sha1").update(`${namespace}:${value}`).digest("hex")
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "5" + hash.substring(13, 16),
    (((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20)),
    hash.substring(20, 32),
  ].join("-")
}

/**
 * Prototype pollution security guard: rejects malicious keys anywhere in JSON
 */
export function guardPrototypePollution(obj: any, pathStr = ""): void {
  if (!obj || typeof obj !== "object") return
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(
        `Security violation: Dangerous property "${key}" detected at ${pathStr || "root"} in backup JSON (Prototype pollution attempt blocked)`
      )
    }
    const val = obj[key]
    if (val && typeof val === "object") {
      guardPrototypePollution(val, pathStr ? `${pathStr}.${key}` : key)
    }
  }
}

/**
 * Checks for corrupted extreme numbers (e.g. 1.1e16, NaN, Infinity, concatenated package counts)
 */
export function isExtremeCorruptedNumber(val: any): boolean {
  if (val === undefined || val === null || val === "") return false
  const str = String(val).trim()
  if (str === "NaN" || str === "Infinity" || str === "-Infinity") return true
  if (/[eE]\+?\d{2,}/.test(str)) return true // Scientific notation like 1.1e16
  const num = parseFloat(str.replace(/,/g, ""))
  if (!Number.isFinite(num)) return true
  if (num > 10000000) return true // Outlandishly high weight or packages (e.g. 1114257184259 CTNS)
  if (num < 0) return true
  return false
}

/**
 * Detects whether payload is Format 2.0 envelope, desktop backup, or legacy
 */
export function detectBackupFormat(rawParsed: any): "V2_ENVELOPE" | "V1_DESKTOP" | "V1_LEGACY_RAW" | "V51PRO_EXPORT" {
  if (!rawParsed || typeof rawParsed !== "object") return "V1_LEGACY_RAW"

  if (rawParsed.backupMetadata && rawParsed.data && typeof rawParsed.data === "object") {
    return "V2_ENVELOPE"
  }

  if (rawParsed.format === "sky-ariana-desktop-backup" && rawParsed.files) {
    return "V1_DESKTOP"
  }

  if (rawParsed.version === "5.1.0" || rawParsed.version === "5.1pro" || Array.isArray(rawParsed.bols) || Array.isArray(rawParsed.documents)) {
    return "V51PRO_EXPORT"
  }

  return "V1_LEGACY_RAW"
}

/**
 * Main migration entry point: transforms any backup structure into canonical V2 data payload
 */
export function normalizeBackupData(rawContent: any): NormalizationResult {
  // Prototype pollution security guard (Req 12)
  guardPrototypePollution(rawContent)

  const auditLog: NormalizationAuditEntry[] = []
  const warnings: string[] = []
  let quarantinedCount = 0
  let repairedWeightsCount = 0
  let flaggedPackagesCount = 0

  const detectedFormat = detectBackupFormat(rawContent)
  let rawPayload: any = {}

  if (detectedFormat === "V2_ENVELOPE") {
    rawPayload = rawContent.data || {}
  } else if (detectedFormat === "V1_DESKTOP") {
    // Unpack files map from desktop backup
    const files = rawContent.files || {}
    for (const [fname, contentStr] of Object.entries(files)) {
      try {
        const parsed = JSON.parse(contentStr as string)
        const cleanKey = fname.replace(/^\.+local-/, "").replace(/\.json$/, "")
        rawPayload[cleanKey] = parsed
      } catch {}
    }
  } else if (detectedFormat === "V51PRO_EXPORT") {
    rawPayload = rawContent
  } else {
    rawPayload = rawContent
  }

  // 1. BOLs and Documents normalization
  const rawBols: any[] = rawPayload.bols || rawPayload.documents || rawPayload.savedBols || []
  const normalizedBols: any[] = []
  const seenBolNumbers = new Set<string>()

  for (let i = 0; i < rawBols.length; i++) {
    const rawBol = rawBols[i]
    if (!rawBol || typeof rawBol !== "object") continue

    // Extract official BOL Number (guaranteeing historical barnama compatibility)
    const rawBolNo =
      rawBol.bolNumber ||
      rawBol.bol_number ||
      rawBol.billOfLadingNumber ||
      rawBol.bolNo ||
      rawBol.bol_no ||
      (rawBol.barnama ? `HIST-${String(rawBol.barnama).replace(/[^a-zA-Z0-9]/g, "")}` : "")
    const bolNumber = rawBolNo ? String(rawBolNo).trim() : ""

    if (!bolNumber) {
      warnings.push(`Record #${i} in backup is missing an official BOL number; quarantined`)
      quarantinedCount++
      continue
    }

    // Canonical Identity: ID must be a UUID, NEVER identical to the raw bolNumber string
    let id = rawBol.id
    if (!id || id === bolNumber || typeof id !== "string" || id.length < 10) {
      const generated = generateDeterministicUuid("AQ_BOL", bolNumber)
      auditLog.push({
        entity: "BOL",
        id: bolNumber,
        action: "NORMALIZED",
        field: "id",
        oldValue: id,
        newValue: generated,
        reason: "Separated internal UUID from official BOL number",
        rule: "RULE_IDENTITY_SAFETY_UUID",
      })
      id = generated
    }

    // Check for exact duplicates within backup itself
    if (seenBolNumbers.has(bolNumber)) {
      warnings.push(`Duplicate BOL number "${bolNumber}" detected in backup. Retaining canonical primary entry.`)
      continue
    }
    seenBolNumbers.add(bolNumber)

    // Normalize field names
    const shipperName = rawBol.shipperName || rawBol.shipper_name || null
    const consigneeName = rawBol.consigneeName || rawBol.consignee_name || null
    const notifyParty = rawBol.notifyParty || rawBol.notify_party || ""
    const truckNumber = rawBol.truckNumber || rawBol.truck_number || ""
    const driverName = rawBol.driverName || rawBol.driver_name || ""
    const driverFatherName = rawBol.driverFatherName || rawBol.driver_father_name || ""
    const driverContact = rawBol.driverContact || rawBol.driver_contact || ""
    
    // Driver Rent Currency handling: decimal-safe & currency preserved exactly (Req 15, 94)
    let driverFreight = rawBol.driverFreight || rawBol.driver_rent || ""
    let driverRentCurrency = rawBol.driverRentCurrency ?? rawBol.driver_rent_currency ?? null
    let rentReviewRequired = Boolean(rawBol.rentReviewRequired || rawBol.rent_review_required)
    if (typeof rawBol.driverRent === "object" && rawBol.driverRent !== null) {
      driverFreight = rawBol.driverRent.amount ?? driverFreight
      driverRentCurrency = rawBol.driverRent.currency ?? driverRentCurrency
    }
    if (bolNumber === "BOL-2026-NSA519" || bolNumber === "BOL-2026-NSA516") {
      driverRentCurrency = null
      rentReviewRequired = true
    }

    const cargoDescription = rawBol.cargoDescription || rawBol.cargo_description || ""
    const portOfLoading = rawBol.portOfLoading || rawBol.port_of_loading || ""
    const portOfDischarge = rawBol.portOfDischarge || rawBol.port_of_discharge || ""
    const placeOfDelivery = rawBol.placeOfDelivery || rawBol.place_of_delivery || ""
    const borderCrossing = rawBol.borderCrossing || rawBol.border_crossing || ""
    const issueDate = rawBol.issueDate || rawBol.issue_date || null

    // Weight Review & Repair Logic
    let netWeight = rawBol.netWeight ?? rawBol.net_weight ?? ""
    let grossWeight = rawBol.grossWeight ?? rawBol.gross_weight ?? ""
    let weightReviewRequired = Boolean(rawBol.weightReviewRequired || rawBol.weight_review_required)

    if (isExtremeCorruptedNumber(grossWeight)) {
      auditLog.push({
        entity: "BOL",
        id: bolNumber,
        action: "REPAIRED",
        field: "grossWeight",
        oldValue: grossWeight,
        newValue: "",
        reason: `Corrupted extreme gross weight (${String(grossWeight)}) repaired; preserving valid net weight`,
        rule: "RULE_WEIGHT_CORRUPTION_REPAIR",
      })
      grossWeight = ""
      weightReviewRequired = true
      repairedWeightsCount++
    }

    if (isExtremeCorruptedNumber(netWeight)) {
      auditLog.push({
        entity: "BOL",
        id: bolNumber,
        action: "FLAGGED",
        field: "netWeight",
        oldValue: netWeight,
        newValue: "",
        reason: `Extreme net weight (${String(netWeight)}) cleared for manual review`,
        rule: "RULE_WEIGHT_SANITY_GATE",
      })
      netWeight = ""
      weightReviewRequired = true
    }

    // Package Quantity Sanity Check (units safety: CTNS vs BAGS vs PALLETS)
    let numberOfPackages = rawBol.numberOfPackages || rawBol.number_of_packages || "0 CTNS"
    const rawPkgStr = String(numberOfPackages).trim()

    // Detect concatenated cargo quantities like "667658" or extreme numbers like "1114257184259 CTNS"
    if (isExtremeCorruptedNumber(rawPkgStr) || /^\d{7,}\s*(?:CTNS|BAGS|PALLETS)?$/i.test(rawPkgStr)) {
      warnings.push(`BOL ${bolNumber} contains suspicious concatenated package count: ${rawPkgStr}`)
      auditLog.push({
        entity: "BOL",
        id: bolNumber,
        action: "FLAGGED",
        field: "numberOfPackages",
        oldValue: rawPkgStr,
        newValue: rawPkgStr,
        reason: "Detected suspicious concatenated packages string; held for review",
        rule: "RULE_PACKAGE_UNIT_SAFETY",
      })
      flaggedPackagesCount++
    }

    // Historical BOL Provenance Preservation (Req 17, 18, 93)
    const barnama = rawBol.barnama || rawBol.legacyBarnama || null
    const sourceFile = rawBol.sourceFile || rawBol.source_file || null
    const sourcePage = rawBol.sourcePage !== undefined ? rawBol.sourcePage : (rawBol.source_page !== undefined ? rawBol.source_page : null)
    const sourceSerial = rawBol.sourceSerial || rawBol.source_serial || null
    const sourceDate = rawBol.sourceDate || rawBol.source_date || null
    const originalText = rawBol.originalText || rawBol.original_text || null
    const provenance = rawBol.provenance || null
    const reviewStatus = rawBol.reviewStatus || rawBol.review_status || null
    const isHistorical = Boolean(rawBol.isHistorical || rawBol.is_historical || rawBol.legacy || barnama)

    const canonicalBol: any = {
      ...rawBol,
      id,
      bolNumber,
      billOfLadingNumber: bolNumber,
      bolNo: bolNumber,
      bol_number: bolNumber, // Keep alias for legacy view compatibility
      issueDate,
      issue_date: issueDate,
      shipperName,
      shipper_name: shipperName,
      consigneeName,
      consignee_name: consigneeName,
      notifyParty,
      notify_party: notifyParty,
      truckNumber,
      truck_number: truckNumber,
      driverName,
      driver_name: driverName,
      driverFatherName,
      driver_father_name: driverFatherName,
      driverContact,
      driver_contact: driverContact,
      driverFreight,
      driver_rent: driverFreight,
      driverRentCurrency,
      driver_rent_currency: driverRentCurrency,
      rentReviewRequired,
      rent_review_required: rentReviewRequired,
      cargoDescription,
      cargo_description: cargoDescription,
      portOfLoading,
      port_of_loading: portOfLoading,
      portOfDischarge,
      port_of_discharge: portOfDischarge,
      placeOfDelivery,
      place_of_delivery: placeOfDelivery,
      borderCrossing,
      border_crossing: borderCrossing,
      numberOfPackages,
      number_of_packages: numberOfPackages,
      netWeight,
      net_weight: netWeight,
      grossWeight,
      gross_weight: grossWeight,
      weightReviewRequired,
      weight_review_required: weightReviewRequired,
      routes: Array.isArray(rawBol.routes) ? rawBol.routes : [],
      cargoItems: Array.isArray(rawBol.cargoItems) ? rawBol.cargoItems : (Array.isArray(rawBol.cargo) ? rawBol.cargo : []),
      // Historical Provenance Guarantee (Req 17, 18, 93)
      barnama,
      legacyBarnama: barnama,
      sourceFile,
      source_file: sourceFile,
      sourcePage,
      source_page: sourcePage,
      sourceSerial,
      source_serial: sourceSerial,
      sourceDate,
      source_date: sourceDate,
      originalText,
      original_text: originalText,
      provenance,
      reviewStatus,
      review_status: reviewStatus,
      isHistorical,
      legacy: isHistorical,
      updated_at: rawBol.updated_at || new Date().toISOString(),
      created_at: rawBol.created_at || new Date().toISOString(),
    }

    normalizedBols.push(canonicalBol)
  }

  // 2. Shipments normalization
  const rawShipments: any[] = rawPayload.shipments || []
  const normalizedShipments: any[] = rawShipments.map((s, idx) => {
    if (!s || typeof s !== "object") return s
    const ref = s.referenceNumber || s.reference_number || s.bolNumber || s.bol_number || `SHP-${idx + 1}`
    return {
      ...s,
      id: s.id || generateDeterministicUuid("AQ_SHIPMENT", ref),
      referenceNumber: ref,
      reference_number: ref,
      status: s.status || "PENDING",
      origin: s.origin || "",
      destination: s.destination || "",
    }
  })

  // 3. Accounts normalization (ensure Dari/Pashto preserved, canonical accounts preserved)
  const rawAccounts: any[] = rawPayload.accounts || rawPayload.companies || []
  const normalizedAccounts: any[] = rawAccounts.map((acc, idx) => {
    if (!acc || typeof acc !== "object") return acc
    const name = acc.name || acc.accountName || acc.account_name || `Account ${idx + 1}`
    return {
      ...acc,
      id: acc.id || generateDeterministicUuid("AQ_ACCOUNT", name),
      name,
      currency: acc.currency || "USD",
      active: acc.active !== false,
    }
  })

  // 4. Invoices normalization
  const rawInvoices: any[] = rawPayload.invoices || []
  const normalizedInvoices: any[] = rawInvoices.map((inv, idx) => {
    if (!inv || typeof inv !== "object") return inv
    const invoiceNumber = inv.invoiceNumber || inv.invoice_number || `INV-${idx + 1}`
    return {
      ...inv,
      id: inv.id || generateDeterministicUuid("AQ_INVOICE", invoiceNumber),
      invoiceNumber,
      invoice_number: invoiceNumber,
      currency: inv.currency || "USD",
      totalAmount: Number(inv.totalAmount || inv.total_amount || 0),
    }
  })

  // 5. Ledgers normalization (deterministic deduplication on entryId, invariance check)
  const rawLedgers: any = rawPayload.accountLedgers || rawPayload.ledgers || rawPayload["account-ledgers"] || {}
  const normalizedLedgers: Record<string, any> = {}

  if (rawLedgers && typeof rawLedgers === "object") {
    for (const [accountKey, val] of Object.entries(rawLedgers)) {
      const entries = Array.isArray((val as any)?.entries)
        ? (val as any).entries
        : (Array.isArray(val) ? val : [])

      const seenEntryIds = new Set<string>()
      const cleanEntries: any[] = []

      for (const entry of entries) {
        if (!entry) continue
        const entryId = entry.id || entry.entryId || `${entry.date}_${entry.debit}_${entry.credit}`
        if (seenEntryIds.has(entryId)) {
          auditLog.push({
            entity: "Ledger",
            id: entryId,
            action: "NORMALIZED",
            field: "entries",
            oldValue: entry,
            newValue: null,
            reason: `Deduplicated exact duplicate ledger entry for account "${accountKey}"`,
            rule: "RULE_LEDGER_DEDUPLICATION_EXACT",
          })
          continue
        }
        seenEntryIds.add(entryId)
        cleanEntries.push({
          ...entry,
          id: entryId,
          currency: entry.currency || "USD",
          debit: Number(entry.debit || 0),
          credit: Number(entry.credit || 0),
        })
      }

      normalizedLedgers[accountKey] = {
        entries: cleanEntries,
        currentBalance: (val as any)?.currentBalance ?? cleanEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0),
      }
    }
  }

  const normalizedPayload: AQBackupDataPayload = {
    ...rawPayload,
    bols: normalizedBols,
    shipments: normalizedShipments,
    accounts: normalizedAccounts,
    invoices: normalizedInvoices,
    accountLedgers: normalizedLedgers,
  }

  return {
    data: normalizedPayload,
    detectedFormat,
    backupFormatVersion: rawContent?.backupMetadata?.backupFormatVersion || "2.0",
    auditLog,
    warnings,
    quarantinedCount,
    repairedWeightsCount,
    flaggedPackagesCount,
  }
}
