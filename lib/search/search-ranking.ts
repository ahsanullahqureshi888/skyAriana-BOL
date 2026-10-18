/**
 * Search Ranking & Relevance Engine
 * Sky Ariana Multi-Modal Logistics & Financial Suite
 */

import type { MatchType, SearchResultItem } from "./search-types"
import { normalizeIdentifier, normalizeCompanyName, stringSimilarity, normalizeSearchQuery, normalizePersianPashto } from "./search-normalizer"

export interface RankEvaluation {
  matchType: MatchType
  score: number
  matchedField: string
}

/**
 * Evaluates candidate string against query and computes match rank & score.
 */
export function evaluateFieldMatch(
  query: string,
  targetValue: string | undefined | null,
  fieldName: string,
  isIdField = false
): RankEvaluation | null {
  if (!query || !targetValue) return null

  const q = normalizeSearchQuery(normalizePersianPashto(query))
  const target = normalizeSearchQuery(normalizePersianPashto(targetValue))

  if (!q || !target) return null

  // 1. Exact ID / Reference match
  if (isIdField) {
    const qId = normalizeIdentifier(query)
    const targetId = normalizeIdentifier(targetValue)
    if (qId === targetId) {
      return {
        matchType: "exact_id",
        score: 1000,
        matchedField: `${fieldName}: ${targetValue}`,
      }
    }
  }

  // 2. Exact normalized match
  if (q === target) {
    return {
      matchType: "exact_normalized",
      score: 800,
      matchedField: `${fieldName}: ${targetValue}`,
    }
  }

  // Exact company normalized match
  const normQComp = normalizeCompanyName(query)
  const normTargetComp = normalizeCompanyName(targetValue)
  if (normQComp && normTargetComp && normQComp === normTargetComp) {
    return {
      matchType: "exact_normalized",
      score: 750,
      matchedField: `${fieldName}: ${targetValue}`,
    }
  }

  // 3. Prefix match (starts with)
  if (target.startsWith(q)) {
    return {
      matchType: "prefix",
      score: 500 + Math.max(0, 50 - (target.length - q.length)),
      matchedField: `${fieldName}: ${targetValue}`,
    }
  }

  // 4. Contains match (word boundary or substring)
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(q)}`, "i")
  if (wordBoundaryRegex.test(target)) {
    return {
      matchType: "contains",
      score: 350,
      matchedField: `${fieldName}: ${targetValue}`,
    }
  }

  if (target.includes(q)) {
    return {
      matchType: "contains",
      score: 300,
      matchedField: `${fieldName}: ${targetValue}`,
    }
  }

  // 5. Conservative fuzzy match (minimum similarity threshold 0.75 for long strings, 0.85 for short)
  if (q.length >= 4 && target.length >= 4) {
    const sim = stringSimilarity(query, targetValue)
    if (sim >= 0.75) {
      return {
        matchType: "fuzzy",
        score: Math.round(50 + sim * 40),
        matchedField: `${fieldName}: ${targetValue} (Possible Match)`,
      }
    }
  }

  return null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Sorts search results by score descending, preserving stable order on ties.
 */
export function sortSearchResults(results: SearchResultItem[]): SearchResultItem[] {
  return [...results].sort((a, b) => {
    // 1. Highest score first
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // 2. Exact matches always beat others
    const isAExact = a.matchType === "exact_id" || a.matchType === "exact_normalized"
    const isBExact = b.matchType === "exact_id" || b.matchType === "exact_normalized"
    if (isAExact && !isBExact) return -1
    if (!isAExact && isBExact) return 1

    // 3. Active status preference
    const aActive = a.metadata?.status !== "cancelled" && a.metadata?.status !== "archived"
    const bActive = b.metadata?.status !== "cancelled" && b.metadata?.status !== "archived"
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1

    // 4. Alphabetical title tie-break
    return a.title.localeCompare(b.title)
  })
}
