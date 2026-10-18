import path from "path"
import { mutateJsonFile, readJsonFile, writeJsonFile } from "./blob-db"
import { getDataPath } from "@/lib/server-paths"
import { incrementDatabaseRevision } from "@/lib/backup/revision"
import { scheduleAutoBackupOnDataChange } from "@/lib/google-drive/sync"
import seedBolsData from "@/lib/data/seed-bols.json"

const localBolsFile = getDataPath(".local-bols.json")
const fullSnapshotFile = getDataPath(".local-full-snapshot.json")

let memoryCacheBols: any[] | null = null
let memoryCacheIndex = new Map<string, any>()
let lastCacheTime = 0
let snapshotDebounceTimer: NodeJS.Timeout | null = null
const CACHE_TTL_MS = 60_000

function refreshIndex(bols: any[]): void {
  const idx = new Map<string, any>()
  for (const b of bols) {
    if (!b) continue
    const rawNum = b.bol_number ? String(b.bol_number).trim() : ""
    const rawId = b.id ? String(b.id).trim() : ""
    const bNum2 = b.billOfLadingNumber ? String(b.billOfLadingNumber).trim() : ""
    const bNum3 = b.bolNo ? String(b.bolNo).trim() : ""

    const registerKey = (k: string) => {
      if (!k) return
      const lower = k.toLowerCase()
      idx.set(lower, b)
      const alpha = lower.replace(/[^a-z0-9]/g, "")
      if (alpha.length > 3) idx.set(alpha, b)
      const digits = lower.match(/\d+$/)?.[0]
      if (digits && digits.length >= 3) idx.set(`digits:${digits}`, b)
    }

    registerKey(rawNum)
    registerKey(rawId)
    registerKey(bNum2)
    registerKey(bNum3)
  }
  memoryCacheIndex = idx
}

async function readAllBols(): Promise<any[]> {
  const now = Date.now()
  if (memoryCacheBols && memoryCacheBols.length > 0 && (now - lastCacheTime < CACHE_TTL_MS)) {
    return memoryCacheBols
  }
  const loaded = await readJsonFile<any[]>(localBolsFile, [])
  if (Array.isArray(loaded) && loaded.length > 0) {
    memoryCacheBols = loaded
    refreshIndex(loaded)
    lastCacheTime = now
    return loaded
  }

  // Cloud fallback: if local file is empty or missing (e.g. initial Vercel deploy), seed from bundled records
  const initialSeed = Array.isArray(seedBolsData) ? (seedBolsData as any[]) : []
  if (initialSeed.length > 0) {
    memoryCacheBols = initialSeed
    refreshIndex(initialSeed)
    lastCacheTime = now
    try {
      await writeJsonFile<any[]>(localBolsFile, initialSeed)
    } catch {}
    return initialSeed
  }

  memoryCacheBols = []
  refreshIndex([])
  lastCacheTime = now
  return []
}

async function writeAllBols(bols: any[]): Promise<void> {
  await writeJsonFile<any[]>(localBolsFile, bols)
  memoryCacheBols = bols
  refreshIndex(bols)
  lastCacheTime = Date.now()

  debouncedUpdateFullSnapshot(bols)
}

async function mutateAllBols(updater: (bols: any[]) => any[] | Promise<any[]>): Promise<any[]> {
  const next = await mutateJsonFile<any[]>(localBolsFile, [], async (current) => {
    const safeCurrent = Array.isArray(current) ? current : []
    return updater(safeCurrent)
  })
  memoryCacheBols = next
  refreshIndex(next)
  lastCacheTime = Date.now()
  debouncedUpdateFullSnapshot(next)
  return next
}

function debouncedUpdateFullSnapshot(bols: any[]): void {
  if (snapshotDebounceTimer) clearTimeout(snapshotDebounceTimer)
  snapshotDebounceTimer = setTimeout(async () => {
    try {
      await mutateJsonFile<Record<string, any>>(fullSnapshotFile, {}, (snapshot) => ({
        ...(snapshot && typeof snapshot === "object" ? snapshot : {}),
        documents: bols,
        updated_at: new Date().toISOString(),
      }))
    } catch (error) {
      console.error("[local-storage] BOL saved but full snapshot update failed:", error)
    }
  }, 1500)
}

export function isUUID(str?: any): boolean {
  if (!str || typeof str !== "string") return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

/**
 * Helper to harmonize BOL record properties across camelCase and snake_case
 */
function harmonizeBolRecord(data: any, bolNumber?: string): any {
  const validBolNumber = (
    (!isUUID(bolNumber) ? bolNumber : "") ||
    (!isUUID(data?.bol_number) ? data?.bol_number : "") ||
    (!isUUID(data?.billOfLadingNumber) ? data?.billOfLadingNumber : "") ||
    (!isUUID(data?.bolNo) ? data?.bolNo : "") ||
    (!isUUID(data?.id) ? data?.id : "") ||
    ""
  ).trim()

  const rawId = (data?.id || (!isUUID(bolNumber) ? bolNumber : "") || validBolNumber || "").trim()
  const num = validBolNumber
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

  const consigneeAddress = data?.consignee_address || data?.consigneeAddress || ""
  const consigneeContact = data?.consignee_contact || data?.consigneeContact || ""
  const consigneeEmail = data?.consignee_email || data?.consigneeEmail || ""
  const shipperAddress = data?.shipper_address || data?.shipperAddress || ""
  const shipperContact = data?.shipper_contact || data?.shipperContact || ""
  const shipperEmail = data?.shipper_email || data?.shipperEmail || ""
  const cargoRoute = data?.cargo_route_note || data?.cargoRouteNote || ""
  const kgsCtn = data?.kgs_per_carton || data?.kgsPerCarton || ""
  const grossCtn = data?.gross_weight_per_carton || data?.grossWeightPerCarton || ""
  const rateKgs = data?.rate_per_kgs || data?.ratePerKgs || ""
  const goodsVal = data?.goods_value || data?.goodsValue || ""
  const notes1 = data?.notes_1 !== undefined && data?.notes_1 !== null ? data.notes_1 : (data?.notes1 ?? "")
  const notes2 = data?.notes_2 !== undefined && data?.notes_2 !== null ? data.notes_2 : (data?.notes2 ?? "")

  return {
    ...data,
    id: num || rawId,
    bol_number: num,
    billOfLadingNumber: num,
    bolNo: num,
    issue_date: issueDate,
    issueDate,
    shipper_name: shipper,
    shipperName: shipper,
    shipper_address: shipperAddress,
    shipperAddress,
    shipper_contact: shipperContact,
    shipperContact,
    shipper_email: shipperEmail,
    shipperEmail,
    consignee_name: consignee,
    consigneeName: consignee,
    consignee_address: consigneeAddress,
    consigneeAddress,
    consignee_contact: consigneeContact,
    consigneeContact,
    consignee_email: consigneeEmail,
    consigneeEmail,
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
    cargo_route_note: cargoRoute,
    cargoRouteNote: cargoRoute,
    kgs_per_carton: kgsCtn,
    kgsPerCarton: kgsCtn,
    gross_weight_per_carton: grossCtn,
    grossWeightPerCarton: grossCtn,
    rate_per_kgs: rateKgs,
    ratePerKgs: rateKgs,
    goods_value: goodsVal,
    goodsValue: goodsVal,
    notes_1: notes1,
    notes_2: notes2,
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
      const k = (harmonized.bol_number || harmonized.id || "").trim().toLowerCase()
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
  const candidateNum = (
    (!isUUID(bolNumber) ? bolNumber : "") ||
    (!isUUID(data?.bol_number) ? data?.bol_number : "") ||
    (!isUUID(data?.billOfLadingNumber) ? data?.billOfLadingNumber : "") ||
    (!isUUID(data?.bolNo) ? data?.bolNo : "") ||
    (!isUUID(data?.id) ? data?.id : "") ||
    ""
  ).trim()

  const target = (candidateNum || bolNumber || data?.id || "").trim().toLowerCase()
  if (!target) throw new Error("A BOL number is required")
  await mutateAllBols((bols) => {
    const existingIndex = bols.findIndex((b) => [b.id, b.bol_number, b.billOfLadingNumber, b.bolNo]
      .some((value) => String(value || "").trim().toLowerCase() === target))
    const existing = existingIndex >= 0 ? bols[existingIndex] : null
    const effectiveBolNum = candidateNum || (existing && !isUUID(existing.bol_number) ? existing.bol_number : "")

    const newBol = harmonizeBolRecord({
      ...data,
      created_at: data.created_at || (existing ? existing.created_at : new Date().toISOString()),
    }, effectiveBolNum || undefined)
    if (existingIndex >= 0) bols[existingIndex] = { ...bols[existingIndex], ...newBol }
    else bols.unshift(newBol)
    return bols
  })
  console.log(`[v0] Stored BOL locally: ${candidateNum || bolNumber}`)
}

/**
 * Retrieve locally stored BOL
 */
export async function getLocalBOL(bolNumber: string): Promise<any | null> {
  const bols = await readAllBols()
  const target = (bolNumber || "").trim().toLowerCase()
  if (!target) return null

  // Fast O(1) indexed cache lookup
  const direct = memoryCacheIndex.get(target)
  if (direct) return direct

  const targetAlpha = target.replace(/[^a-z0-9]/g, "")
  if (targetAlpha.length > 3) {
    const alphaMatch = memoryCacheIndex.get(targetAlpha)
    if (alphaMatch) return alphaMatch
  }

  const targetDigits = target.match(/\d+$/)?.[0]
  if (targetDigits && targetDigits.length >= 3) {
    const digitMatch = memoryCacheIndex.get(`digits:${targetDigits}`)
    if (digitMatch) return digitMatch
  }

  const bol = bols.find(b => {
    const bId = (b.id ? String(b.id) : "").trim().toLowerCase()
    const bNum = (b.bol_number ? String(b.bol_number) : "").trim().toLowerCase()
    const bNum2 = (b.billOfLadingNumber ? String(b.billOfLadingNumber) : "").trim().toLowerCase()
    const bNum3 = (b.bolNo ? String(b.bolNo) : "").trim().toLowerCase()
    if (bId === target || bNum === target || bNum2 === target || bNum3 === target) return true

    if (targetAlpha && targetAlpha.length > 3) {
      if (bNum.replace(/[^a-z0-9]/g, "") === targetAlpha) return true
      if (bId.replace(/[^a-z0-9]/g, "") === targetAlpha) return true
    }

    if (targetDigits && targetDigits.length >= 3) {
      const bDigits = bNum.match(/\d+$/)?.[0]
      if (bDigits === targetDigits) return true
    }

    return false
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
  const candidateNum = (
    (!isUUID(bolNumber) ? bolNumber : "") ||
    (!isUUID(data?.bol_number) ? data?.bol_number : "") ||
    (!isUUID(data?.billOfLadingNumber) ? data?.billOfLadingNumber : "") ||
    (!isUUID(data?.bolNo) ? data?.bolNo : "") ||
    (!isUUID(data?.id) ? data?.id : "") ||
    ""
  ).trim()

  const target = (candidateNum || bolNumber || data?.id || "").trim().toLowerCase()
  if (!target) throw new Error("A BOL number is required")
  await mutateAllBols((bols) => {
    const existingIndex = bols.findIndex((b) => [b.id, b.bol_number, b.billOfLadingNumber, b.bolNo]
      .some((value) => String(value || "").trim().toLowerCase() === target))
    const existing = existingIndex >= 0 ? bols[existingIndex] : null
    const effectiveBolNum = candidateNum || (existing && !isUUID(existing.bol_number) ? existing.bol_number : "")

    if (existingIndex >= 0) {
      bols[existingIndex] = harmonizeBolRecord({ ...bols[existingIndex], ...data, created_at: bols[existingIndex].created_at }, effectiveBolNum || undefined)
    } else {
      bols.unshift(harmonizeBolRecord(data, effectiveBolNum || undefined))
    }
    return bols
  })
  console.log(`[v0] Updated local BOL: ${candidateNum || bolNumber}`)
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
