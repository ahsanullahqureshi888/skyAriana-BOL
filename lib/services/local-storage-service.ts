import path from "path"
import { mutateJsonFile, readJsonFile, writeJsonFile } from "./blob-db"
import { getDataPath } from "@/lib/server-paths"

const localBolsFile = getDataPath(".local-bols.json")
const fullSnapshotFile = getDataPath(".local-full-snapshot.json")

let memoryCacheBols: any[] | null = null
let lastCacheTime = 0
const CACHE_TTL_MS = 3000

async function readAllBols(): Promise<any[]> {
  const now = Date.now()
  if (memoryCacheBols && (now - lastCacheTime < CACHE_TTL_MS)) {
    return memoryCacheBols
  }
  const loaded = await readJsonFile<any[]>(localBolsFile, [])
  memoryCacheBols = loaded
  lastCacheTime = now
  return loaded
}

async function writeAllBols(bols: any[]): Promise<void> {
  await writeJsonFile<any[]>(localBolsFile, bols)
  memoryCacheBols = bols
  lastCacheTime = Date.now()

  await updateFullSnapshot(bols)
}

async function mutateAllBols(updater: (bols: any[]) => any[] | Promise<any[]>): Promise<any[]> {
  const next = await mutateJsonFile<any[]>(localBolsFile, [], async (current) => {
    const safeCurrent = Array.isArray(current) ? current : []
    return updater(safeCurrent)
  })
  memoryCacheBols = next
  lastCacheTime = Date.now()
  await updateFullSnapshot(next)
  return next
}

async function updateFullSnapshot(bols: any[]): Promise<void> {
  // Also update full snapshot so sync endpoints stay 100% consistent
  try {
    await mutateJsonFile<Record<string, any>>(fullSnapshotFile, {}, (snapshot) => ({
      ...(snapshot && typeof snapshot === "object" ? snapshot : {}),
      documents: bols,
      updated_at: new Date().toISOString(),
    }))
  } catch (error) {
    console.error("[local-storage] BOL saved but full snapshot update failed:", error)
  }
}

/**
 * Helper to harmonize BOL record properties across camelCase and snake_case
 */
function harmonizeBolRecord(data: any, bolNumber?: string): any {
  const num = (bolNumber || data?.bol_number || data?.billOfLadingNumber || data?.bolNo || data?.id || "").trim()
  const issueDate = data?.issue_date || data?.issueDate || new Date().toISOString().split("T")[0]
  const shipper = data?.shipper_name || data?.shipperName || ""
  const consignee = data?.consignee_name || data?.consigneeName || ""
  const truck = data?.truck_number || data?.truckNumber || ""
  const driver = data?.driver_name || data?.driverName || ""
  const driverRent = data?.driver_rent || data?.driverFreight || data?.driverRent || ""
  const pkgs = data?.number_of_packages || data?.numberOfPackages || ""
  const netWt = data?.net_weight || data?.netWeight || ""
  const grossWt = data?.gross_weight || data?.grossWeight || ""
  const cargoDesc = data?.cargo_description || data?.cargoDescription || ""
  const contType = data?.container_type || data?.containerType || ""
  const contSize = data?.container_size || data?.containerSize || ""
  const contNums = data?.container_numbers || data?.containerNumbers || ""

  return {
    ...data,
    id: num,
    bol_number: num,
    billOfLadingNumber: num,
    bolNo: num,
    issue_date: issueDate,
    issueDate,
    shipper_name: shipper,
    shipperName: shipper,
    consignee_name: consignee,
    consigneeName: consignee,
    truck_number: truck,
    truckNumber: truck,
    driver_name: driver,
    driverName: driver,
    driver_rent: driverRent,
    driverFreight: driverRent,
    number_of_packages: pkgs,
    numberOfPackages: pkgs,
    net_weight: netWt,
    netWeight: netWt,
    gross_weight: grossWt,
    grossWeight: grossWt,
    cargo_description: cargoDesc,
    cargoDescription: cargoDesc,
    container_type: contType,
    containerType: contType,
    container_size: contSize,
    containerSize: contSize,
    container_numbers: contNums,
    containerNumbers: contNums,
    updated_at: data?.updated_at || new Date().toISOString(),
    created_at: data?.created_at || new Date().toISOString(),
  }
}

/**
 * Store multiple BOLs locally in a single efficient write operation
 */
export async function storeLocalBOLsBatch(items: any[]): Promise<number> {
  if (!Array.isArray(items) || items.length === 0) return 0
  let mergedCount = 0
  await mutateAllBols((bols) => {
    const bolMap = new Map<string, any>()
    for (const b of bols) {
      const k = (b.bol_number || b.billOfLadingNumber || b.bolNo || b.id || "").trim().toLowerCase()
      if (k) bolMap.set(k, b)
    }
    for (const item of items) {
      const harmonized = harmonizeBolRecord(item)
      const k = (harmonized.bol_number || "").trim().toLowerCase()
      if (k) {
        const existing = bolMap.get(k)
        bolMap.set(k, { ...(existing || {}), ...harmonized, created_at: existing?.created_at || harmonized.created_at })
        mergedCount++
      }
    }
    return Array.from(bolMap.values())
  })
  console.log(`[v0] Stored batch of ${mergedCount} BOLs locally`)
  return mergedCount
}

/**
 * Store BOL locally with robust identifier matching
 */
export async function storeLocalBOL(bolNumber: string, data: any): Promise<void> {
  const target = (bolNumber || data?.bol_number || data?.billOfLadingNumber || data?.bolNo || data?.id || "").trim().toLowerCase()
  if (!target) throw new Error("A BOL number is required")
  await mutateAllBols((bols) => {
    const existingIndex = bols.findIndex((b) => [b.id, b.bol_number, b.billOfLadingNumber, b.bolNo]
      .some((value) => String(value || "").trim().toLowerCase() === target))
    const newBol = harmonizeBolRecord({
      ...data,
      created_at: data.created_at || (existingIndex >= 0 ? bols[existingIndex].created_at : new Date().toISOString()),
    }, bolNumber)
    if (existingIndex >= 0) bols[existingIndex] = { ...bols[existingIndex], ...newBol }
    else bols.unshift(newBol)
    return bols
  })
  console.log(`[v0] Stored BOL locally: ${bolNumber}`)
}

/**
 * Retrieve locally stored BOL
 */
export async function getLocalBOL(bolNumber: string): Promise<any | null> {
  const bols = await readAllBols()
  const target = (bolNumber || "").trim().toLowerCase()
  const bol = bols.find(b => {
    const bId = (b.id ? String(b.id) : "").trim().toLowerCase()
    const bNum = (b.bol_number ? String(b.bol_number) : "").trim().toLowerCase()
    const bNum2 = (b.billOfLadingNumber ? String(b.billOfLadingNumber) : "").trim().toLowerCase()
    const bNum3 = (b.bolNo ? String(b.bolNo) : "").trim().toLowerCase()
    return target && (bId === target || bNum === target || bNum2 === target || bNum3 === target)
  })
  if (bol) {
    console.log(`[v0] Retrieved local BOL: ${bolNumber}`)
  }
  return bol || null
}

/**
 * Get all locally stored BOLs
 */
export async function getAllLocalBOLs(): Promise<any[]> {
  const bols = await readAllBols()
  console.log(`[v0] Retrieved ${bols.length} local BOLs`)
  return bols
}

/**
 * Update locally stored BOL
 */
export async function updateLocalBOL(bolNumber: string, data: any): Promise<void> {
  const target = (bolNumber || data?.bol_number || data?.billOfLadingNumber || data?.bolNo || data?.id || "").trim().toLowerCase()
  if (!target) throw new Error("A BOL number is required")
  await mutateAllBols((bols) => {
    const existingIndex = bols.findIndex((b) => [b.id, b.bol_number, b.billOfLadingNumber, b.bolNo]
      .some((value) => String(value || "").trim().toLowerCase() === target))
    if (existingIndex >= 0) {
      bols[existingIndex] = harmonizeBolRecord({ ...bols[existingIndex], ...data, created_at: bols[existingIndex].created_at }, bolNumber)
    } else {
      bols.unshift(harmonizeBolRecord(data, bolNumber))
    }
    return bols
  })
  console.log(`[v0] Updated local BOL: ${bolNumber}`)
}

/**
 * Delete locally stored BOL
 */
export async function deleteLocalBOL(bolNumber: string): Promise<void> {
  const target = (bolNumber || "").trim().toLowerCase()
  if (!target) throw new Error("A BOL number is required")
  await mutateAllBols((bols) => bols.filter((b) => ![b.id, b.bol_number, b.billOfLadingNumber, b.bolNo]
    .some((value) => String(value || "").trim().toLowerCase() === target)))
  console.log(`[v0] Deleted local BOL: ${bolNumber}`)
}

/**
 * Clear all local BOLs
 */
export async function clearLocalBOLs(): Promise<void> {
  await writeAllBols([])
  console.log(`[v0] Cleared all local BOLs`)
}
