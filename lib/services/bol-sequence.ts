import { getDataPath } from "@/lib/server-paths"
import { mutateJsonFile, readJsonFile } from "@/lib/services/blob-db"
import * as localStorage from "@/lib/services/local-storage-service"
import { createClient } from "@/lib/supabase/server"

const SEQUENCE_FILE = getDataPath(".local-bol-sequence.json")
export const START_SEQUENCE = 619
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
 * Non-destructive peek: Returns what the next BOL number will be without burning or advancing the sequence.
 */
export async function getNextAvailableBolNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const state = await readJsonFile<BolSequenceState>(SEQUENCE_FILE, {
    year: currentYear,
    sequence: START_SEQUENCE - 1,
    startSequence: START_SEQUENCE,
    prefix: DEFAULT_BOL_PREFIX,
    updated_at: new Date().toISOString(),
  })

  const configuredStart = typeof state?.startSequence === "number" ? state.startSequence : START_SEQUENCE
  const currentSeq = typeof state?.sequence === "number" ? state.sequence : (configuredStart - 1)
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

  let updatedSequence = suffix
  await mutateJsonFile(
    SEQUENCE_FILE,
    { year: currentYear, sequence: START_SEQUENCE - 1, startSequence: START_SEQUENCE, prefix: DEFAULT_BOL_PREFIX, updated_at: new Date().toISOString() },
    (current: BolSequenceState) => {
      const configuredStart = typeof current?.startSequence === "number" ? current.startSequence : START_SEQUENCE
      const currentSeq = typeof current?.sequence === "number" ? current.sequence : (configuredStart - 1)
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

  let allocatedSeq = START_SEQUENCE
  let prefix = DEFAULT_BOL_PREFIX

  await mutateJsonFile(
    SEQUENCE_FILE,
    { year: currentYear, sequence: START_SEQUENCE - 1, startSequence: START_SEQUENCE, prefix: DEFAULT_BOL_PREFIX, updated_at: new Date().toISOString() },
    async (current: BolSequenceState) => {
      prefix = normalizeBolPrefix(current?.prefix, currentYear)
      const configuredStart = typeof current?.startSequence === "number" ? current.startSequence : START_SEQUENCE
      let currentSeq = typeof current?.sequence === "number" ? current.sequence : (configuredStart - 1)

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
