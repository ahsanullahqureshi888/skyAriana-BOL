/**
 * Sky Ariana AI Operations Assistant - Entity & Company Resolver
 * Resolves company names and parties against Master Data and Accounts.
 * Prevents fuzzy guessing and prompts clarification for ambiguous matches.
 */

import { readJsonFile } from '@/lib/services/blob-db'
import { getDataPath } from '@/lib/server-paths'

export interface ResolvedEntityMatch {
  id: string
  name: string
  type: string
  aliases?: string[]
  accountId?: string
}

export interface EntityResolutionResult {
  exactMatch?: ResolvedEntityMatch
  candidates: ResolvedEntityMatch[]
  isAmbiguous: boolean
}

/**
 * Resolves a company/party query against Master Data and Account records.
 */
export async function resolveCompanyEntity(
  queryText: string
): Promise<EntityResolutionResult> {
  const cleanQuery = queryText.trim().toLowerCase()
  if (!cleanQuery) {
    return { candidates: [], isAmbiguous: false }
  }

  // Load accounts and master data
  const [accounts, masterData] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-accounts.json'), []),
    readJsonFile<any>(getDataPath('master-data.json'), { entities: [] }),
  ])

  const masterEntities: any[] = masterData.entities || []
  const allKnownEntities: ResolvedEntityMatch[] = []

  // Add from accounts
  for (const acc of accounts) {
    if (acc.name) {
      allKnownEntities.push({
        id: acc.id || acc.name,
        name: acc.name,
        type: 'ACCOUNT',
        accountId: acc.id,
      })
    }
    if (Array.isArray(acc.companies)) {
      for (const comp of acc.companies) {
        if (comp.name && comp.name !== acc.name) {
          allKnownEntities.push({
            id: comp.id || comp.name,
            name: comp.name,
            type: 'COMPANY',
            accountId: acc.id,
          })
        }
      }
    }
  }

  // Add from master entities
  for (const ent of masterEntities) {
    if (ent.name && !allKnownEntities.some((k) => k.name.toLowerCase() === ent.name.toLowerCase())) {
      allKnownEntities.push({
        id: ent.id,
        name: ent.name,
        type: ent.type || 'CUSTOMER',
        aliases: ent.aliases || [],
      })
    }
  }

  // 1. Exact Name or Alias Match
  const exact = allKnownEntities.find((e) => {
    if (e.name.toLowerCase() === cleanQuery) return true
    if (e.aliases?.some((a) => a.toLowerCase() === cleanQuery)) return true
    return false
  })

  if (exact) {
    return {
      exactMatch: exact,
      candidates: [exact],
      isAmbiguous: false,
    }
  }

  // 2. Substring & Token Matching
  const tokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2)
  const matches = allKnownEntities.filter((e) => {
    const eName = e.name.toLowerCase()
    if (eName.includes(cleanQuery)) return true
    const aliasMatch = e.aliases?.some((a) => a.toLowerCase().includes(cleanQuery))
    if (aliasMatch) return true

    // If query has multiple tokens (e.g. "najeb amin")
    if (tokens.length >= 2) {
      return tokens.every((t) => eName.includes(t))
    }
    return false
  })

  if (matches.length === 1) {
    return {
      exactMatch: matches[0],
      candidates: matches,
      isAmbiguous: false,
    }
  }

  if (matches.length > 1) {
    return {
      candidates: matches,
      isAmbiguous: true,
    }
  }

  return { candidates: [], isAmbiguous: false }
}
