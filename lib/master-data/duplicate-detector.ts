import { MasterEntity } from '@/lib/types/master-data'

export interface DuplicateMatch {
  existingEntityId: string
  existingEntityName: string
  matchedField: 'taxId' | 'phone' | 'email' | 'name' | 'alias'
  confidence: 'EXACT' | 'HIGH' | 'MEDIUM'
  reason: string
}

export interface DuplicateCluster {
  id: string
  primary: MasterEntity
  duplicates: {
    entity: MasterEntity
    matches: DuplicateMatch[]
  }[]
}

const COMMON_CORP_SUFFIXES = [
  'llc', 'l.l.c.', 'l.l.c', 'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation',
  'co', 'co.', 'company', 'fze', 'fzco', 'spc', 's.p.c.', 'gmbh', 'sa', 's.a.', 'bv', 'b.v.',
  'logistics', 'freight', 'cargo', 'transport', 'shipping', 'general trading', 'trading'
]

/**
 * Normalizes a company or person name by lowercasing, stripping special characters,
 * and stripping non-distinctive corporate/logistics suffixes.
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return ''
  let cleaned = name.toLowerCase().trim()
  
    // Collapse dots inside acronyms/words ("L.L.C." -> "LLC", "CO." -> "CO")
  cleaned = cleaned.replace(/\.(?=\s|$|[a-z])/g, '')

  // Replace remaining punctuation with space
  cleaned = cleaned.replace(/[\,\-\_\&\/\(\)\#\@\+\:]+/g, ' ')
  
  // Tokenize
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  
  // Filter out common suffixes if there are enough remaining tokens
  const filteredTokens = tokens.filter((tok, idx) => {
    // Keep single token even if it looks like a suffix
    if (tokens.length === 1) return true
    return !COMMON_CORP_SUFFIXES.includes(tok)
  })

  const result = (filteredTokens.length > 0 ? filteredTokens : tokens).join(' ')
  return result.trim()
}

/**
 * Normalizes a tax ID / TRN / license number by removing spaces, hyphens, and slashes.
 */
export function normalizeTaxId(taxId?: string): string {
  if (!taxId) return ''
  return taxId.toUpperCase().replace(/[\s\-\_\.\/]+/g, '').trim()
}

/**
 * Normalizes a phone number to digits only (retains leading + if international).
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '')
  if (!digitsOnly) return ''
  return hasPlus ? `+${digitsOnly}` : digitsOnly
}

/**
 * Calculates Dice coefficient between two strings based on bigrams
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  if (s1 === s2) return 1.0
  if (s1.length < 2 || s2.length < 2) return 0.0

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>()
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2))
    }
    return bigrams
  }

  const b1 = getBigrams(s1)
  const b2 = getBigrams(s2)
  let intersection = 0
  for (const item of b1) {
    if (b2.has(item)) intersection++
  }

  return (2.0 * intersection) / (b1.size + b2.size)
}

/**
 * Checks if candidate entity details collide with any existing entities in the database.
 */
export function checkDuplicate(
  candidate: Partial<MasterEntity>,
  existingEntities: MasterEntity[],
  currentId?: string
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []
  if (!candidate || !existingEntities || existingEntities.length === 0) return matches

  const normCandidateName = normalizeCompanyName(candidate.name || '')
  const normCandidateAlias = candidate.alias ? normalizeCompanyName(candidate.alias) : ''
  const normCandidateTax = normalizeTaxId(candidate.taxId)
  const normCandidatePhone = normalizePhone(candidate.phone)
  const normCandidateEmail = (candidate.email || '').toLowerCase().trim()

  for (const existing of existingEntities) {
    if (currentId && existing.id === currentId) continue
    if (existing.isArchived) continue

    // 1. Tax ID check (Definitive match)
    if (normCandidateTax && existing.taxId) {
      const normExistingTax = normalizeTaxId(existing.taxId)
      if (normExistingTax && normCandidateTax === normExistingTax) {
        matches.push({
          existingEntityId: existing.id,
          existingEntityName: existing.name,
          matchedField: 'taxId',
          confidence: 'EXACT',
          reason: `Exact Tax ID / TRN match: "${existing.taxId}"`
        })
        continue // Tax ID match is definitive
      }
    }

    // 2. Email check
    if (normCandidateEmail && existing.email) {
      const normExistingEmail = existing.email.toLowerCase().trim()
      if (normExistingEmail && normCandidateEmail === normExistingEmail) {
        matches.push({
          existingEntityId: existing.id,
          existingEntityName: existing.name,
          matchedField: 'email',
          confidence: 'HIGH',
          reason: `Matching email address: "${existing.email}"`
        })
      }
    }

    // 3. Phone check
    if (normCandidatePhone && existing.phone) {
      const normExistingPhone = normalizePhone(existing.phone)
      if (normExistingPhone && normCandidatePhone.length >= 7 && normCandidatePhone === normExistingPhone) {
        matches.push({
          existingEntityId: existing.id,
          existingEntityName: existing.name,
          matchedField: 'phone',
          confidence: 'HIGH',
          reason: `Matching phone number: "${existing.phone}"`
        })
      }
    }

    // 4. Normalized Name & Alias check
    if (normCandidateName) {
      const normExistingName = normalizeCompanyName(existing.name)
      const normExistingAlias = existing.alias ? normalizeCompanyName(existing.alias) : ''

      if (normCandidateName === normExistingName) {
        matches.push({
          existingEntityId: existing.id,
          existingEntityName: existing.name,
          matchedField: 'name',
          confidence: 'EXACT',
          reason: `Normalized name exact match: "${existing.name}"`
        })
      } else if (normCandidateAlias && normCandidateAlias === normExistingName) {
        matches.push({
          existingEntityId: existing.id,
          existingEntityName: existing.name,
          matchedField: 'alias',
          confidence: 'HIGH',
          reason: `Alias matches existing entity name: "${existing.name}"`
        })
      } else if (normExistingAlias && normCandidateName === normExistingAlias) {
        matches.push({
          existingEntityId: existing.id,
          existingEntityName: existing.name,
          matchedField: 'name',
          confidence: 'HIGH',
          reason: `Name matches existing entity alias: "${existing.alias}"`
        })
      } else {
        // High fuzzy similarity check
        const similarity = stringSimilarity(normCandidateName, normExistingName)
        if (similarity >= 0.85) {
          matches.push({
            existingEntityId: existing.id,
            existingEntityName: existing.name,
            matchedField: 'name',
            confidence: similarity >= 0.92 ? 'HIGH' : 'MEDIUM',
            reason: `High phonetic/name similarity (${Math.round(similarity * 100)}%) with "${existing.name}"`
          })
        }
      }
    }
  }

  return matches
}

/**
 * Scans the entire master entities dataset and clusters duplicates together.
 */
export function findDuplicateClusters(entities: MasterEntity[]): DuplicateCluster[] {
  const activeEntities = entities.filter(e => !e.isArchived)
  const clusters: DuplicateCluster[] = []
  const processedIds = new Set<string>()

  for (let i = 0; i < activeEntities.length; i++) {
    const primary = activeEntities[i]
    if (processedIds.has(primary.id)) continue

    const candidateDups: { entity: MasterEntity; matches: DuplicateMatch[] }[] = []

    for (let j = i + 1; j < activeEntities.length; j++) {
      const secondary = activeEntities[j]
      if (processedIds.has(secondary.id)) continue

      const matches = checkDuplicate(secondary, [primary])
      if (matches.length > 0) {
        candidateDups.push({ entity: secondary, matches })
      }
    }

    if (candidateDups.length > 0) {
      processedIds.add(primary.id)
      candidateDups.forEach(d => processedIds.add(d.entity.id))

      clusters.push({
        id: `cluster-${primary.id}`,
        primary,
        duplicates: candidateDups
      })
    }
  }

  return clusters
}

/**
 * Merges a secondary entity into a primary entity, aggregating types, bank details, and preserving all data.
 */
export function mergeEntities(primary: MasterEntity, secondary: MasterEntity): MasterEntity {
  const combinedTypes = Array.from(new Set([...primary.type, ...secondary.type]))
  
  const existingBanks = primary.bankDetails || []
  const secondaryBanks = secondary.bankDetails || []
  const combinedBanks = [...existingBanks]
  
  for (const sb of secondaryBanks) {
    const exists = combinedBanks.some(b => b.accountNo === sb.accountNo && b.bankName.toLowerCase() === sb.bankName.toLowerCase())
    if (!exists) {
      combinedBanks.push(sb)
    }
  }

  return {
    ...primary,
    type: combinedTypes,
    alias: primary.alias || secondary.alias || undefined,
    address: primary.address || secondary.address || undefined,
    taxId: primary.taxId || secondary.taxId || undefined,
    email: primary.email || secondary.email || undefined,
    phone: primary.phone || secondary.phone || undefined,
    contactPerson: primary.contactPerson || secondary.contactPerson || undefined,
    country: primary.country || secondary.country || undefined,
    city: primary.city || secondary.city || undefined,
    bankDetails: combinedBanks.length > 0 ? combinedBanks : undefined,
    notes: [primary.notes, secondary.notes ? `[Merged from ${secondary.name}]: ${secondary.notes}` : '']
      .filter(Boolean)
      .join('\n\n') || undefined,
    updatedAt: new Date().toISOString()
  }
}
