/**
 * Sky Ariana AI Operations Assistant - Master Service
 * Coordinates intent routing, permission checking, structured retrieval,
 * and grounded answer compilation.
 */

import {
  AIUserSessionContext,
  AIChatMessage,
  AIResponsePayload,
  SupportedLanguage,
} from '@/lib/types/ai-assistant'
import { routeUserIntent } from './intent-router'
import { checkIntentPermission } from './permission-filter'
import { resolveCompanyEntity } from './entity-resolver'
import {
  lookupShipmentOrBol,
  lookupContainer,
  searchShipments,
  searchContainers,
  getStaleShipments,
  getBorderDelayedTrucks,
  getMissingDocuments,
  getCustomerBalances,
  getTodayPaymentsRecorded,
  getDailyOperationsTasks,
  getEntityAuditHistory,
  QueryExecutionResult,
} from './query-planner'
import { buildGroundedResponse } from './response-builder'
import { createActionProposal } from './action-planner'
import { generateAICompletion, getAIAssistantConfig } from './ai-provider'
import { crmSalesService } from '@/lib/services/crm-sales-service'

/**
 * Main query entry point for user prompts.
 */
export async function processUserQuery(
  prompt: string,
  user: AIUserSessionContext
): Promise<AIResponsePayload> {
  const text = prompt.trim()
  const language = user.language || 'EN'

  if (!text) {
    return {
      success: false,
      error: 'Empty prompt provided.',
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Please enter a question or reference number.',
        timestamp: new Date().toISOString(),
      },
    }
  }

  const lowerText = text.toLowerCase()

  // Guard A: Commercial Intent Speculation Rejection (Rule 189)
  if (
    lowerText.includes('accept our quotation') ||
    lowerText.includes('accept our quote') ||
    lowerText.includes('will this customer accept') ||
    lowerText.includes('will they buy')
  ) {
    return {
      success: true,
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Under Sky Ariana AI policy, commercial purchase intent and customer acceptance decisions cannot be speculated upon or presented as fact. Customer acceptance is strictly determined by commercial negotiations and formal customer confirmation. Consult the CRM Follow-Up center to engage the client directly.`,
        intent: 'INTENT_SPECULATION_REJECTED' as any,
        sourceTags: ['AI Safety Policy'],
        timestamp: new Date().toISOString(),
      },
    }
  }

  // Guard B: Rate Center Enforcement (Rule 188 - Never invent freight rates)
  if (
    lowerText.includes('prepare quote for') ||
    lowerText.includes('prepare a quote for') ||
    lowerText.includes('give me a rate for') ||
    lowerText.includes('what should we charge') ||
    lowerText.includes('invent rate')
  ) {
    return {
      success: true,
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Freight quotations must be prepared using validated tariff rate cards in the **Rates & Quotations Center**. In accordance with Sky Ariana operational rules, the AI assistant does not invent, fabricate, or guess freight rates. Please navigate to Rates & Quotations to create a verified quote.`,
        intent: 'RATE_INVENTION_REJECTED' as any,
        sourceTags: ['Rates & Pricing Master'],
        timestamp: new Date().toISOString(),
      },
    }
  }

  // Guard C: Grounded CRM Customer Follow-Ups Query (Rule 187)
  if (
    (lowerText.includes('follow-up') || lowerText.includes('followup') || lowerText.includes('follow up')) &&
    (lowerText.includes('today') || lowerText.includes('customer') || lowerText.includes('who') || lowerText.includes('which'))
  ) {
    const followUps = crmSalesService.getFollowUps()
    const todayStr = new Date().toISOString().split('T')[0]
    const pendingToday = followUps.filter((t) => t.status === 'PENDING' && (t.dueDate <= todayStr || t.dueDate === todayStr))

    if (pendingToday.length === 0) {
      return {
        success: true,
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `All scheduled CRM customer follow-ups for today are currently completed. No pending customer follow-ups required right now.`,
          intent: 'CRM_FOLLOW_UPS' as any,
          sourceTags: ['CRM Follow-Up Center'],
          timestamp: new Date().toISOString(),
        },
      }
    }

    const listText = pendingToday
      .map((t) => `• **${t.customerName}** (Due: ${t.dueDate}, Priority: ${t.priority}) — *${t.type}*: ${t.notes}`)
      .join('\n')

    return {
      success: true,
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Here are the active customer follow-up tasks requiring attention today:\n\n${listText}\n\n*Review and update tasks in the CRM & Sales workspace.*`,
        intent: 'CRM_FOLLOW_UPS' as any,
        sourceTags: ['CRM Follow-Up Center'],
        timestamp: new Date().toISOString(),
      },
    }
  }

  // 1. ROUTE INTENT & EXTRACT IDENTIFIERS
  const parsedIntent = routeUserIntent(text)

  // 2. STRICT PERMISSION CHECK (Before any data access)
  const permCheck = checkIntentPermission(user, parsedIntent.intent)
  if (!permCheck.allowed) {
    return {
      success: true,
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `⛔ **Access Denied**: ${permCheck.reason || 'You do not have permission to access this data.'}`,
        timestamp: new Date().toISOString(),
        isError: true,
      },
    }
  }

  // 3. ACTION PROPOSAL INTENT (e.g. "Update NSA583 to reached port")
  if (
    text.toLowerCase().startsWith('update ') ||
    text.toLowerCase().includes('change status of') ||
    text.toLowerCase().includes('mark reached')
  ) {
    const bolMatch = text.match(/\b(NSA\s?\d{3,6}|BOL-?[A-Z0-9-]{3,15})\b/i)
    if (bolMatch) {
      const bolNum = bolMatch[1].replace(/\s+/g, '').toUpperCase()
      const newLoc = text.includes('bandar abbas')
        ? 'Bandar Abbas'
        : text.includes('jebel ali')
        ? 'Jebel Ali'
        : text.includes('border')
        ? 'Islam Qala'
        : 'In Transit'

      const proposalRes = createActionProposal(
        {
          actionType: 'UPDATE_TRACKING',
          entityType: 'shipment',
          entityId: bolNum,
          entityRef: bolNum,
          title: `Update Tracking for ${bolNum}`,
          description: `Set status to "Reached Port" at ${newLoc}`,
          currentValues: { status: 'In Transit' },
          proposedValues: { status: 'at_port', currentLocation: newLoc },
        },
        user
      )

      if (proposalRes.proposal) {
        return {
          success: true,
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `I've prepared a tracking update for **${bolNum}**. Please review and confirm the proposed changes below:`,
            actionProposal: proposalRes.proposal,
            timestamp: new Date().toISOString(),
          },
        }
      }
    }
  }

  // 4. ENTITY RESOLUTION FOR COMPANIES
  let resolvedCompanyName = ''
  if (
    parsedIntent.intent === 'CUSTOMER_BALANCE' ||
    parsedIntent.intent === 'SEARCH_SHIPMENTS' ||
    parsedIntent.intent === 'SEARCH_CONTAINERS'
  ) {
    // Check if prompt contains a company name
    const tokens = text.replace(/where are|containers|shipments|how much does|owe us|balance/gi, '').trim()
    if (tokens.length >= 3) {
      const resolution = await resolveCompanyEntity(tokens)
      if (resolution.isAmbiguous) {
        const candidateNames = resolution.candidates.map((c) => `• ${c.name}`).join('\n')
        return {
          success: true,
          requiresClarification: true,
          clarificationOptions: resolution.candidates.map((c) => c.name),
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `I found multiple matching accounts for "${tokens}". Which company did you mean?\n\n${candidateNames}`,
            timestamp: new Date().toISOString(),
          },
        }
      } else if (resolution.exactMatch) {
        resolvedCompanyName = resolution.exactMatch.name
        parsedIntent.filters.companyName = resolvedCompanyName
      }
    }
  }

  // 5. STRUCTURED DATA QUERY EXECUTION
  let queryResult: QueryExecutionResult

  switch (parsedIntent.intent) {
    case 'LOOKUP_BOL':
    case 'LOOKUP_SHIPMENT':
      queryResult = await lookupShipmentOrBol(parsedIntent.targetIdentifier || text, user)
      break

    case 'LOOKUP_CONTAINER':
      queryResult = await lookupContainer(parsedIntent.targetIdentifier || text, user)
      break

    case 'STALE_TRACKING':
      queryResult = await getStaleShipments(user, 48)
      break

    case 'BORDER_STATUS':
      queryResult = await getBorderDelayedTrucks(user)
      break

    case 'PORT_STATUS':
      queryResult = await searchContainers({ stage: 'port' }, user)
      break

    case 'VESSEL_STATUS':
      queryResult = await searchShipments({ stage: 'sea' }, user)
      break

    case 'MISSING_DOCUMENTS':
      queryResult = await getMissingDocuments(user)
      break

    case 'CUSTOMER_BALANCE':
    case 'OVERDUE_INVOICES':
      queryResult = await getCustomerBalances(
        resolvedCompanyName || parsedIntent.filters.companyName || text,
        user
      )
      break

    case 'TODAY_PAYMENTS':
      queryResult = await getTodayPaymentsRecorded(user)
      break

    case 'TASK_STATUS':
      queryResult = await getDailyOperationsTasks(user)
      break

    case 'AUDIT_HISTORY':
      queryResult = await getEntityAuditHistory(parsedIntent.targetIdentifier || text, user)
      break

    case 'SEARCH_CONTAINERS':
      queryResult = await searchContainers(parsedIntent.filters, user)
      break

    case 'SEARCH_SHIPMENTS':
    default:
      queryResult = await searchShipments(parsedIntent.filters, user)
      break
  }

  // 6. BUILD GROUNDED BASE RESPONSE
  const grounded = buildGroundedResponse(parsedIntent.intent, queryResult, text, language)

  // 7. OPTIONAL GEMINI FLAVORING (Only for wording, never overrides verified facts)
  let finalContent = grounded.content
  const config = await getAIAssistantConfig()

  if (config.enabled && config.provider === 'gemini' && queryResult.records.length > 0) {
    const aiWording = await generateAICompletion(
      `User question: "${text}"\n\nVerified Database Facts (STRICT: Do NOT add external facts, do NOT hallucinate):\n${grounded.content}`,
      {
        userId: user.userId,
        systemPrompt:
          'You are SKY AI, the logistics operations assistant for Sky Ariana Limited. Explain the verified database facts concisely, respectfully, and clearly. Keep all BOL numbers, container numbers, and currency distinctions intact.',
      }
    )
    if (aiWording?.text) {
      finalContent = aiWording.text
    }
  }

  // 8. DYNAMIC ROLE SUGGESTIONS
  const suggestions = getRoleBasedSuggestions(user.role)

  return {
    success: true,
    suggestions,
    message: {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: finalContent,
      intent: parsedIntent.intent,
      cards: grounded.cards,
      sourceTags: grounded.sourceTags,
      recordCount: queryResult.totalMatches,
      timestamp: new Date().toISOString(),
    },
  }
}

function getRoleBasedSuggestions(role?: string): string[] {
  const norm = (role || '').toLowerCase()
  if (norm === 'accounting' || norm === 'accountant') {
    return [
      'Show overdue invoices',
      'Who paid today?',
      'Outstanding customer balances',
      'Today\'s financial summary',
    ]
  }
  if (norm === 'documents') {
    return [
      'Which shipments are missing documents?',
      'Show missing packing lists',
      'Which documents need correction?',
      'Documents ready for vessel departure',
    ]
  }
  if (norm === 'management' || norm === 'superadmin') {
    return [
      'What needs attention today?',
      'Make today\'s operations report',
      'Show border station delays',
      'Make today\'s WhatsApp status',
    ]
  }
  // Operations / default
  return [
    'Where are active containers?',
    'Which shipments are at the border?',
    'Show containers in Bandar Abbas',
    'Which shipments have stale tracking?',
  ]
}
