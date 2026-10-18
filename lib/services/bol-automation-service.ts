"use server"

import crypto from "crypto"
import { BillOfLadingFormData, BillOfLading } from "../types/bill-of-lading"
import { BolAutomationSettings, DEFAULT_BOL_AUTOMATION_SETTINGS, BolMatchResult } from "../types/bol-automation"
import { getNextAtomicBolNumber } from "./bol-sequence"
import { mutateJsonFile, readJsonFile, writeJsonFile } from "./blob-db"
import { getDataPath } from "../server-paths"

const SETTINGS_FILE = getDataPath(".local-bol-automation-settings.json")

export async function getBolAutomationSettings(): Promise<BolAutomationSettings> {
  try {
    const data = await readJsonFile(SETTINGS_FILE, DEFAULT_BOL_AUTOMATION_SETTINGS)
    return { ...DEFAULT_BOL_AUTOMATION_SETTINGS, ...(data || {}) }
  } catch (e) {
    return DEFAULT_BOL_AUTOMATION_SETTINGS
  }
}

export async function saveBolAutomationSettings(settings: Partial<BolAutomationSettings>) {
  await mutateJsonFile(SETTINGS_FILE, DEFAULT_BOL_AUTOMATION_SETTINGS, (current) => {
    return { ...current, ...settings }
  })
}

export function generateBolFingerprint(data: any): string {
  const parts = [
    data.source_file || "",
    data.source_sheet || "",
    data.source_row || "",
    data.issue_date || data.shipment_date || "",
    data.shipper_name || "",
    data.consignee_name || "",
    data.container_numbers || data.container_number || "",
    data.invoice_number || ""
  ]
  const str = parts.map(s => String(s).trim().toLowerCase()).join("|")
  return crypto.createHash("sha256").update(str).digest("hex")
}

export async function matchExistingBol(data: any, existingBols: BillOfLadingFormData[]): Promise<BolMatchResult> {
  if (!data) return { matched: false, reason: "No data", confidence: 0 }
  
  // 1. Existing Internal BOL ID
  if (data.id || data.bol_number) {
    const target = data.id || data.bol_number
    const found = existingBols.find(b => b.id === target || b.bol_number === target || b.internal_bol_number === target)
    if (found) return { matched: true, reason: "Internal BOL ID Match", confidence: 100, bolId: found.id || found.bol_number }
  }
  
  // 2. Shipping Line BOL (carrier_bol_number)
  if (data.carrier_bol_number) {
    const found = existingBols.find(b => b.carrier_bol_number === data.carrier_bol_number)
    if (found) return { matched: true, reason: "Carrier BOL Match", confidence: 95, bolId: found.id || found.bol_number }
  }
  
  // 3. Exact Source Fingerprint
  if (data.source_fingerprint) {
    const found = existingBols.find(b => b.source_fingerprint === data.source_fingerprint)
    if (found) return { matched: true, reason: "Source Fingerprint Match", confidence: 100, bolId: found.id || found.bol_number }
  }
  
  // 4. Exact combo: Shipper + Consignee + Date + Container
  const shipper = String(data.shipper_name || "").trim().toLowerCase()
  const consignee = String(data.consignee_name || "").trim().toLowerCase()
  const date = String(data.issue_date || data.shipment_date || "").trim()
  const container = String(data.container_numbers || data.container_number || "").trim()
  
  if (shipper && consignee && date && container) {
    const found = existingBols.find(b => {
      return String(b.shipper_name || "").trim().toLowerCase() === shipper &&
             String(b.consignee_name || "").trim().toLowerCase() === consignee &&
             String(b.issue_date || "").trim() === date &&
             String(b.container_numbers || "").trim().includes(container)
    })
    if (found) return { matched: true, reason: "Exact Combination Match", confidence: 90, bolId: found.id || found.bol_number }
  }
  
  return { matched: false, reason: "No match found", confidence: 0 }
}

export function calculateBolCompletion(data: any): number {
  const requiredFields = [
    "shipper_name", "consignee_name", "issue_date", "container_numbers", 
    "port_of_loading", "port_of_discharge", "cargo_description"
  ]
  let filled = 0
  requiredFields.forEach(f => {
    if (data[f] && String(data[f]).trim().length > 0) filled++
  })
  return Math.round((filled / requiredFields.length) * 100)
}

// Ensure the new fields exist
export async function generateInternalBolNumber(settings?: BolAutomationSettings): Promise<string> {
  return await getNextAtomicBolNumber()
}

export async function processShipmentEntryBatch(entries: any[]): Promise<any> {
  const settings = await getBolAutomationSettings()
  // Mock bulk process since we interact with client localStorage in the actual UI for BOLs
  // In a real DB scenario, we would transactionally insert here.
  return {
    entriesFound: entries.length,
    existingBolsMatched: 0,
    newBolsCreated: 0,
    draftBolsCreated: 0,
    containersLinked: 0,
    shippersLinked: 0,
    consigneesLinked: 0,
    invoicesLinked: 0,
    ledgerTransactionsLinked: 0,
    possibleDuplicates: 0,
    missingRequiredFields: 0,
    errors: 0
  }
}
