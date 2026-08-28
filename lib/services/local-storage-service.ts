import path from "path"
import { readJsonFile, writeJsonFile } from "./blob-db"

const localBolsFile = path.join(process.cwd(), ".local-bols.json")

let memoryCacheBols: any[] | null = null
let lastCacheTime = 0
const CACHE_TTL_MS = 5000

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
  memoryCacheBols = bols
  lastCacheTime = Date.now()
  await writeJsonFile<any[]>(localBolsFile, bols)
}

/**
 * Store BOL locally when Supabase is unavailable
 */
export async function storeLocalBOL(bolNumber: string, data: any): Promise<void> {
  const bols = await readAllBols()
  const existingIndex = bols.findIndex(b => b.id === bolNumber)
  const newBol = {
    ...data,
    id: bolNumber,
    created_at: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    bols[existingIndex] = newBol
  } else {
    bols.push(newBol)
  }

  await writeAllBols(bols)
  console.log(`[v0] Stored BOL locally: ${bolNumber}`)
}

/**
 * Retrieve locally stored BOL
 */
export async function getLocalBOL(bolNumber: string): Promise<any | null> {
  const bols = await readAllBols()
  const bol = bols.find(b => b.id === bolNumber)
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
  const bols = await readAllBols()
  const existingIndex = bols.findIndex(b => b.id === bolNumber)
  
  if (existingIndex >= 0) {
    bols[existingIndex] = {
      ...bols[existingIndex],
      ...data,
      updated_at: new Date().toISOString(),
    }
    await writeAllBols(bols)
    console.log(`[v0] Updated local BOL: ${bolNumber}`)
  }
}

/**
 * Delete locally stored BOL
 */
export async function deleteLocalBOL(bolNumber: string): Promise<void> {
  const bols = await readAllBols()
  const nextBols = bols.filter(b => b.id !== bolNumber)
  await writeAllBols(nextBols)
  console.log(`[v0] Deleted local BOL: ${bolNumber}`)
}

/**
 * Clear all local BOLs
 */
export async function clearLocalBOLs(): Promise<void> {
  await writeAllBols([])
  console.log(`[v0] Cleared all local BOLs`)
}
