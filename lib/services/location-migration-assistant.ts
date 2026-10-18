import { LocationMigrationCandidate } from '@/lib/types/route-locations'
import { routeLocationService } from '@/lib/services/route-location-service'

export interface ScanMigrationResult {
  totalScannedDocs: number
  totalLocationOccurrences: number
  uniqueCandidates: LocationMigrationCandidate[]
  matchedCount: number
  unmatchedCount: number
}

export class LocationMigrationAssistant {
  private static instance: LocationMigrationAssistant

  public static getInstance(): LocationMigrationAssistant {
    if (!LocationMigrationAssistant.instance) {
      LocationMigrationAssistant.instance = new LocationMigrationAssistant()
    }
    return LocationMigrationAssistant.instance
  }

  /**
   * Scans local documents and identifies free-text location mentions.
   */
  public scanExistingDocuments(): ScanMigrationResult {
    if (typeof window === 'undefined') {
      return {
        totalScannedDocs: 0,
        totalLocationOccurrences: 0,
        uniqueCandidates: [],
        matchedCount: 0,
        unmatchedCount: 0,
      }
    }

    const docSources = [
      'sky-bol-browser-documents',
      'skybol:saved-documents',
      'skybol:backup-documents',
    ]

    const allDocs: any[] = []
    const seenDocIds = new Set<string>()

    for (const src of docSources) {
      try {
        const raw = window.localStorage.getItem(src)
        if (raw) {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            for (const d of list) {
              const id = d.id || d.bol_number
              if (id && !seenDocIds.has(id)) {
                seenDocIds.add(id)
                allDocs.push(d)
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[LocationMigrationAssistant] Error reading ${src}:`, e)
      }
    }

    // Mapping: rawText -> candidate
    const candidateMap = new Map<string, LocationMigrationCandidate>()
    let totalOccurrences = 0

    const targetFields = [
      'port_of_loading',
      'port_of_discharge',
      'place_of_delivery',
      'transit_border',
      'origin_station',
      'border_station',
      'destination_station',
    ]

    for (const doc of allDocs) {
      const docId = doc.bol_number || doc.id || 'DOC-UNKNOWN'

      for (const field of targetFields) {
        const val = doc[field]
        if (typeof val === 'string' && val.trim().length > 1) {
          const cleanText = val.trim()
          totalOccurrences++

          const existing = candidateMap.get(cleanText)
          if (existing) {
            existing.occurrences++
            if (existing.sampleDocumentIds.length < 5 && !existing.sampleDocumentIds.includes(docId)) {
              existing.sampleDocumentIds.push(docId)
            }
          } else {
            // Test against routeLocationService
            const match = routeLocationService.resolveLocation(cleanText)
            let matchConfidence: LocationMigrationCandidate['matchConfidence'] = 'UNMATCHED'

            if (match) {
              const lowerClean = cleanText.toLowerCase()
              if (
                lowerClean === match.name.toLowerCase() ||
                (match.unlocode && lowerClean === match.unlocode.toLowerCase()) ||
                (match.iataCode && lowerClean === match.iataCode.toLowerCase())
              ) {
                matchConfidence = 'EXACT'
              } else if (match.aliases && match.aliases.some((a) => a.toLowerCase() === lowerClean)) {
                matchConfidence = 'ALIAS'
              } else {
                matchConfidence = 'FUZZY'
              }
            }

            candidateMap.set(cleanText, {
              rawText: cleanText,
              fieldName: field,
              occurrences: 1,
              matchedLocationId: match?.id,
              matchedLocationName: match?.name,
              matchConfidence,
              sampleDocumentIds: [docId],
            })
          }
        }
      }
    }

    const uniqueCandidates = Array.from(candidateMap.values()).sort(
      (a, b) => b.occurrences - a.occurrences
    )

    let matchedCount = 0
    let unmatchedCount = 0

    for (const c of uniqueCandidates) {
      if (c.matchedLocationId) matchedCount++
      else unmatchedCount++
    }

    return {
      totalScannedDocs: allDocs.length,
      totalLocationOccurrences: totalOccurrences,
      uniqueCandidates,
      matchedCount,
      unmatchedCount,
    }
  }

  /**
   * Applies non-destructive link:
   * Sets linked location while preserving the historical raw text.
   */
  public linkCandidateToLocation(rawText: string, canonicalLocationId: string): boolean {
    if (typeof window === 'undefined') return false

    const loc = routeLocationService.getLocationById(canonicalLocationId)
    if (!loc) return false

    // Also add rawText as an alias if not already present
    if (!loc.aliases.includes(rawText) && loc.name.toLowerCase() !== rawText.toLowerCase()) {
      routeLocationService.updateLocation(loc.id, {
        aliases: [...loc.aliases, rawText],
      })
    }

    // Save migration link in localStorage registry
    try {
      const stored = window.localStorage.getItem('skybol:location-migration-mappings')
      const mapping = stored ? JSON.parse(stored) : {}
      mapping[rawText] = {
        locationId: loc.id,
        canonicalName: loc.name,
        linkedAt: new Date().toISOString(),
      }
      window.localStorage.setItem('skybol:location-migration-mappings', JSON.stringify(mapping))
      return true
    } catch (e) {
      console.error('[LocationMigrationAssistant] Error saving link:', e)
      return false
    }
  }
}

export const locationMigrationAssistant = LocationMigrationAssistant.getInstance()
