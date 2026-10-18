import { getDataPath } from "@/lib/server-paths"
import { mutateJsonFile, readJsonFile } from "@/lib/services/blob-db"
import * as localStorage from "@/lib/services/local-storage-service"
import { createClient } from "@/lib/supabase/server"
import seedBolsData from "@/lib/data/seed-bols.json"

const SEQUENCE_FILE = getDataPath(".local-bol-sequence.json")
export const START_SEQUENCE = 685
export const DEFAULT_BOL_PREFIX = "BOL-2026-NSA"

export function normalizeBolPrefix(prefix?: string, year: number = new Date().getFullYear()): string {
  if (!prefix || prefix === "BOL-NSA") {
    return `BOL-${year}-NSA`
  }
  return prefix
}

const isUUID = (str?: any): boolean => {
  if (!str || typeof str !== "string") return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

export function extractBolNumberSuffix(bolNum: any): number {
  if (!bolNum) return 0
  const str = String(bolNum).trim()
  if (isUUID(str)) return 0
  const match = str.match(/NSA[-\s]*(\d+)/i) || str.match(/(\d+)\s*$/)
  if (match && match[1]) {
    const val = parseInt(match[1], 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

export interface BolSequenceState {
  year: number
  sequence: number
  startSequence: number
  prefix: string
  updated_at: string
}

/**
 * Dynamically scans bundled seed documents and local storage to determine the highest existing BOL number in the system.
 */
export async function scanHighestExistingBolNumber(): Promise<number> {
  let maxSeq = 0

  // 1. Scan bundled seed data (golden reference)
  try {
    const seed = Array.isArray(seedBolsData) ? seedBolsData : (seedBolsData as any)?.bols || []
    for (const b of seed) {
      const num = (b as any).bol_number || (b as any).billOfLadingNumber || (b as any).bolNo || (b as any).id
      const seq = extractBolNumberSuffix(num)
      if (seq > maxSeq) maxSeq = seq
    }
  } catch {}

  // 2. Scan local storage documents if available
  try {
    const localDocs = await localStorage.getAllLocalBOLs().catch(() => [])
    if (Array.isArray(localDocs)) {
      for (const b of localDocs) {
        const num = (b as any).bol_number || (b as any).billOfLadingNumber || (b as any).bolNo || (b as any).id
        const seq = extractBolNumberSuffix(num)
        if (seq > maxSeq) maxSeq = seq
      }
    }
  } catch {}

  return maxSeq
}

/**
 * Non-destructive peek: Returns what the next BOL number will be without burning or advancing the sequence.
 */
export async function getNextAvailableBolNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const highestExisting = await scanHighestExistingBolNumber()
  const minimumNext = Math.max(START_SEQUENCE, highestExisting + 1)

  const state = await readJsonFile<BolSequenceState>(SEQUENCE_FILE, {
    year: currentYear,
    sequence: minimumNext - 1,
    startSequence: minimumNext,
    prefix: DEFAULT_BOL_PREFIX,
    updated_at: new Date().toISOString(),
  })

  const configuredStart = Math.max(
    typeof state?.startSequence === "number" ? state.startSequence : minimumNext,
    minimumNext
  )
  const currentSeq = Math.max(
    typeof state?.sequence === "number" ? state.sequence : (configuredStart - 1),
    highestExisting
  )
  const prefix = normalizeBolPrefix(state?.prefix, currentYear)
  const nextSeq = Math.max(currentSeq + 1, configuredStart)

  return `${prefix}${nextSeq}`
}

/**
 * When a document is saved, ensure the sequence tracker advances past this saved BOL number.
 */
export async function advanceBolSequenceIfHigher(savedBolNumber: string): Promise<number> {
  const currentYear = new Date().getFullYear()
  const suffix = extractBolNumberSuffix(savedBolNumber)
  if (suffix <= 0) return 0

  const highestExisting = await scanHighestExistingBolNumber()
  const minimumNext = Math.max(START_SEQUENCE, highestExisting + 1)

  let updatedSequence = suffix
  await mutateJsonFile(
    SEQUENCE_FILE,
    {
      year: currentYear,
      sequence: minimumNext - 1,
      startSequence: minimumNext,
      prefix: DEFAULT_BOL_PREFIX,
      updated_at: new Date().toISOString(),
    },
    (current: BolSequenceState) => {
      const configuredStart = Math.max(
        typeof current?.startSequence === "number" ? current.startSequence : minimumNext,
        minimumNext
      )
      const currentSeq = Math.max(
        typeof current?.sequence === "number" ? current.sequence : (configuredStart - 1),
        highestExisting
      )
      const prefix = normalizeBolPrefix(current?.prefix, currentYear)

      if (suffix > currentSeq) {
        updatedSequence = suffix
        return {
          ...current,
          year: currentYear,
          sequence: suffix,
          startSequence: configuredStart,
          prefix,
          updated_at: new Date().toISOString(),
        }
      }
      updatedSequence = currentSeq
      return {
        ...current,
        prefix,
      }
    }
  )

  return updatedSequence
}

/**
 * Configures the starting sequence and prefix explicitly.
 */
export async function setBolStartingSequence(startSeq: number, prefix: string = DEFAULT_BOL_PREFIX): Promise<void> {
  const currentYear = new Date().getFullYear()
  await mutateJsonFile(
    SEQUENCE_FILE,
    { year: currentYear, sequence: startSeq - 1, startSequence: startSeq, prefix, updated_at: new Date().toISOString() },
    () => ({
      year: currentYear,
      sequence: startSeq - 1,
      startSequence: startSeq,
      prefix,
      updated_at: new Date().toISOString(),
    })
  )
}

/**
 * Atomically allocates and increments the next BOL sequence number.
 */
export async function getNextAtomicBolNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const highestExisting = await scanHighestExistingBolNumber()
  const minimumNext = Math.max(START_SEQUENCE, highestExisting + 1)

  let allocatedSeq = minimumNext
  let prefix = DEFAULT_BOL_PREFIX

  await mutateJsonFile(
    SEQUENCE_FILE,
    {
      year: currentYear,
      sequence: minimumNext - 1,
      startSequence: minimumNext,
      prefix: DEFAULT_BOL_PREFIX,
      updated_at: new Date().toISOString(),
    },
    async (current: BolSequenceState) => {
      prefix = normalizeBolPrefix(current?.prefix, currentYear)
      const configuredStart = Math.max(
        typeof current?.startSequence === "number" ? current.startSequence : minimumNext,
        minimumNext
      )
      let currentSeq = Math.max(
        typeof current?.sequence === "number" ? current.sequence : (configuredStart - 1),
        highestExisting
      )

      if (currentSeq < configuredStart - 1) {
        currentSeq = configuredStart - 1
      }

      allocatedSeq = currentSeq + 1
      return {
        year: currentYear,
        sequence: allocatedSeq,
        startSequence: configuredStart,
        prefix,
        updated_at: new Date().toISOString(),
      }
    }
  )

  return `${prefix}${allocatedSeq}`
}
