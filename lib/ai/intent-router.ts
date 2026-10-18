/**
 * Sky Ariana AI Operations Assistant - Intent Router & Identifier Matcher
 * Fast-path deterministic detection for business references + NLP intent routing
 */

import { AIAssistantIntentType, AIQueryFilter } from '@/lib/types/ai-assistant'

export interface ParsedUserIntent {
  intent: AIAssistantIntentType
  confidence: number
  filters: AIQueryFilter
  isExactIdentifier: boolean
  targetIdentifier?: string
  proposedAction?: {
    actionType: string
    params: Record<string, any>
  }
}

// Regex patterns for authoritative business references
const CONTAINER_REGEX = /\b([A-Z]{4}\s?\d{7})\b/i
const BOL_REGEX = /\b(NSA[\s-]?\d{3,6}|BOL-?[A-Z0-9-]{3,15}|SKY-?[A-Z0-9-]{3,15})\b/i
const INVOICE_REGEX = /\b(INV-?[A-Z0-9-]{3,15})\b/i
const BOOKING_REGEX = /\b(BKG-?[A-Z0-9-]{3,15})\b/i
const TRUCK_PLATE_REGEX = /\b(\d{4,6}[A-Z]|\d{5})\b/i

/**
 * Parses user question and extracts intent, parameters, and filters.
 */
export function routeUserIntent(prompt: string): ParsedUserIntent {
  const text = prompt.trim()
  const lower = text.toLowerCase()

  // --------------------------------------------------------------------------
  // 1. FAST-PATH: Exact Business Identifiers (No LLM needed)
  // --------------------------------------------------------------------------
  const containerMatch = text.match(CONTAINER_REGEX)
  if (containerMatch) {
    const rawCtr = containerMatch[1].replace(/\s+/g, '').toUpperCase()
    return {
      intent: 'LOOKUP_CONTAINER',
      confidence: 1.0,
      isExactIdentifier: true,
      targetIdentifier: rawCtr,
      filters: { containerNumber: rawCtr },
    }
  }

  const bolMatch = text.match(BOL_REGEX)
  if (bolMatch) {
    let rawBol = bolMatch[1].replace(/\s+/g, '').toUpperCase()
    if (/^NSA\d+$/i.test(rawBol)) {
      rawBol = rawBol.replace(/^(NSA)(\d+)$/i, '$1-$2')
    }
    // Check if user specifically asks for profit
    if (lower.includes('profit') || lower.includes('margin')) {
      return {
        intent: 'SHIPMENT_PROFIT',
        confidence: 0.95,
        isExactIdentifier: true,
        targetIdentifier: rawBol,
        filters: { bolNumber: rawBol },
      }
    }

    // Check if user wants WhatsApp update for this BOL
    if (lower.includes('whatsapp') || lower.includes('update customer') || lower.includes('tell customer')) {
      return {
        intent: 'WHATSAPP_STATUS',
        confidence: 0.95,
        isExactIdentifier: true,
        targetIdentifier: rawBol,
        filters: { bolNumber: rawBol },
      }
    }

    return {
      intent: 'LOOKUP_BOL',
      confidence: 1.0,
      isExactIdentifier: true,
      targetIdentifier: rawBol,
      filters: { bolNumber: rawBol },
    }
  }

  const invMatch = text.match(INVOICE_REGEX)
  if (invMatch) {
    const rawInv = invMatch[1].toUpperCase()
    return {
      intent: 'LOOKUP_INVOICE',
      confidence: 1.0,
      isExactIdentifier: true,
      targetIdentifier: rawInv,
      filters: { invoiceNumber: rawInv },
    }
  }

  const bkgMatch = text.match(BOOKING_REGEX)
  if (bkgMatch) {
    const rawBkg = bkgMatch[1].toUpperCase()
    return {
      intent: 'LOOKUP_BOOKING',
      confidence: 1.0,
      isExactIdentifier: true,
      targetIdentifier: rawBkg,
      filters: { bookingNumber: rawBkg },
    }
  }

  // --------------------------------------------------------------------------
  // 2. Navigation Intent
  // --------------------------------------------------------------------------
  if (
    lower.startsWith('open ') ||
    lower.startsWith('go to ') ||
    lower.startsWith('navigate to ') ||
    lower.includes('show module')
  ) {
    if (lower.includes('bol') || lower.includes('saved')) {
      return { intent: 'NAVIGATION', confidence: 0.95, isExactIdentifier: false, filters: { query: 'bol' } }
    }
    if (lower.includes('ledger') || lower.includes('accounting') || lower.includes('accounts')) {
      return { intent: 'NAVIGATION', confidence: 0.95, isExactIdentifier: false, filters: { query: 'ledger' } }
    }
    if (lower.includes('document') || lower.includes('compliance')) {
      return { intent: 'NAVIGATION', confidence: 0.95, isExactIdentifier: false, filters: { query: 'document-compliance' } }
    }
    if (lower.includes('tracking') || lower.includes('control tower') || lower.includes('shipment')) {
      return { intent: 'NAVIGATION', confidence: 0.95, isExactIdentifier: false, filters: { query: 'shipments' } }
    }
    if (lower.includes('daily') || lower.includes('operations')) {
      return { intent: 'NAVIGATION', confidence: 0.95, isExactIdentifier: false, filters: { query: 'daily-operations' } }
    }
  }

  // --------------------------------------------------------------------------
  // 3. Reports & WhatsApp Generation
  // --------------------------------------------------------------------------
  if (lower.includes('whatsapp') || lower.includes('واتساپ')) {
    return {
      intent: 'WHATSAPP_STATUS',
      confidence: 0.95,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  if (
    (lower.includes('report') || lower.includes('راپور') || lower.includes('گزارش')) &&
    (lower.includes('daily') || lower.includes('today') || lower.includes('monthly') || lower.includes('operations'))
  ) {
    return {
      intent: 'DAILY_REPORT',
      confidence: 0.95,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  // --------------------------------------------------------------------------
  // 4. Stale Tracking Queries
  // --------------------------------------------------------------------------
  if (
    lower.includes('stale') ||
    lower.includes('not updated') ||
    lower.includes('48 hours') ||
    lower.includes('24 hours') ||
    lower.includes('no recent status') ||
    lower.includes('needs update')
  ) {
    return {
      intent: 'STALE_TRACKING',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { isStale: true },
    }
  }

  // --------------------------------------------------------------------------
  // 5. Border Queues & Crossings
  // --------------------------------------------------------------------------
  if (
    lower.includes('border') ||
    lower.includes('dogharoon') ||
    lower.includes('islam qala') ||
    lower.includes('torghundi') ||
    lower.includes('hairatan') ||
    lower.includes('spin boldak') ||
    lower.includes('trucks at border')
  ) {
    return {
      intent: 'BORDER_STATUS',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { stage: 'border' },
    }
  }

  // --------------------------------------------------------------------------
  // 6. Port & Container Queries
  // --------------------------------------------------------------------------
  if (
    lower.includes('bandar abbas') ||
    lower.includes('jebel ali') ||
    lower.includes('at port') ||
    lower.includes('port containers') ||
    lower.includes('waiting at port')
  ) {
    return {
      intent: 'PORT_STATUS',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { stage: 'port' },
    }
  }

  if (
    lower.includes('vessel') ||
    lower.includes('etd') ||
    lower.includes('eta') ||
    lower.includes('arriving this week') ||
    lower.includes('departing this week') ||
    lower.includes('at sea')
  ) {
    return {
      intent: 'VESSEL_STATUS',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { stage: 'sea' },
    }
  }

  // --------------------------------------------------------------------------
  // 7. Documents & Compliance Queries
  // --------------------------------------------------------------------------
  if (
    lower.includes('missing document') ||
    lower.includes('missing packing') ||
    lower.includes('missing invoice') ||
    lower.includes('phytosanitary') ||
    lower.includes('incomplete document') ||
    lower.includes('need correction')
  ) {
    return {
      intent: 'MISSING_DOCUMENTS',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { hasMissingDocs: true },
    }
  }

  // --------------------------------------------------------------------------
  // 8. Finance, Ledgers & Invoices
  // --------------------------------------------------------------------------
  if (lower.includes('profit') || lower.includes('margin')) {
    return {
      intent: 'SHIPMENT_PROFIT',
      confidence: 0.85,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  if (
    lower.includes('paid today') ||
    lower.includes('today\'s payment') ||
    lower.includes('collections today') ||
    lower.includes('received today')
  ) {
    return {
      intent: 'TODAY_PAYMENTS',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { dateRange: { namedPeriod: 'today' } },
    }
  }

  if (lower.includes('unpaid') || lower.includes('overdue invoice')) {
    return {
      intent: 'OVERDUE_INVOICES',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: { isOverdue: true },
    }
  }

  if (
    lower.includes('how much') ||
    lower.includes('owe') ||
    lower.includes('balance') ||
    lower.includes('outstanding') ||
    lower.includes('باقیداری') ||
    lower.includes('حساب')
  ) {
    return {
      intent: 'CUSTOMER_BALANCE',
      confidence: 0.85,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  // --------------------------------------------------------------------------
  // 9. Tasks & Overdue Items
  // --------------------------------------------------------------------------
  if (lower.includes('task') || lower.includes('overdue') || lower.includes('pending action')) {
    return {
      intent: 'TASK_STATUS',
      confidence: 0.85,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  // --------------------------------------------------------------------------
  // 10. Audit History
  // --------------------------------------------------------------------------
  if (lower.includes('who changed') || lower.includes('audit') || lower.includes('history of')) {
    return {
      intent: 'AUDIT_HISTORY',
      confidence: 0.85,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  // --------------------------------------------------------------------------
  // 11. Control Tower / Morning / Attention Overview
  // --------------------------------------------------------------------------
  if (
    lower.includes('what needs attention') ||
    lower.includes('attention') ||
    lower.includes('morning brief') ||
    lower.includes('daily overview') ||
    lower.includes('what happened today') ||
    lower.includes('summary of today')
  ) {
    return {
      intent: 'CONTROL_TOWER_OVERVIEW',
      confidence: 0.9,
      isExactIdentifier: false,
      filters: {},
    }
  }

  // --------------------------------------------------------------------------
  // 12. General Search / Search Shipments
  // --------------------------------------------------------------------------
  if (lower.includes('container') || lower.includes('reefer')) {
    return {
      intent: 'SEARCH_CONTAINERS',
      confidence: 0.8,
      isExactIdentifier: false,
      filters: extractDateAndEntityFilters(lower),
    }
  }

  return {
    intent: 'SEARCH_SHIPMENTS',
    confidence: 0.7,
    isExactIdentifier: false,
    filters: extractDateAndEntityFilters(lower),
  }
}

function extractDateAndEntityFilters(lower: string): AIQueryFilter {
  const filter: AIQueryFilter = { query: lower }

  // Date filters
  if (lower.includes('today') || lower.includes('امروز') || lower.includes('نن')) {
    filter.dateRange = { namedPeriod: 'today' }
  } else if (lower.includes('yesterday') || lower.includes('دیروز') || lower.includes('پرون')) {
    filter.dateRange = { namedPeriod: 'yesterday' }
  } else if (lower.includes('this week') || lower.includes('این هفته') || lower.includes('دا اونۍ')) {
    filter.dateRange = { namedPeriod: 'this_week' }
  } else if (lower.includes('last week') || lower.includes('هفته گذشته')) {
    filter.dateRange = { namedPeriod: 'last_week' }
  } else if (lower.includes('this month') || lower.includes('این ماه')) {
    filter.dateRange = { namedPeriod: 'this_month' }
  }

  // Destination / Corridor mentions
  if (lower.includes('india') || lower.includes('nhava sheva') || lower.includes('mundra')) {
    filter.destination = 'Nhava Sheva'
  } else if (lower.includes('dubai') || lower.includes('jebel ali')) {
    filter.destination = 'Jebel Ali'
  } else if (lower.includes('mersin') || lower.includes('turkey')) {
    filter.destination = 'Mersin'
  } else if (lower.includes('china') || lower.includes('shanghai') || lower.includes('ningbo')) {
    filter.destination = 'China'
  }

  // Origin mentions
  if (lower.includes('kandahar')) filter.origin = 'Kandahar'
  if (lower.includes('kabul')) filter.origin = 'Kabul'
  if (lower.includes('herat')) filter.origin = 'Herat'

  return filter
}
