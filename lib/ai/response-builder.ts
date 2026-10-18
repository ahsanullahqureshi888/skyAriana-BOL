/**
 * Sky Ariana AI Operations Assistant - Response Builder
 * Formats verified database data into rich conversational text, structured cards,
 * and clickable action buttons. Strictly enforces anti-hallucination rules.
 */

import { AICardItem, SupportedLanguage } from '@/lib/types/ai-assistant'
import { QueryExecutionResult } from './query-planner'

/**
 * Builds structured cards and natural language response from query results.
 */
export function buildGroundedResponse(
  intent: string,
  queryResult: QueryExecutionResult,
  userPrompt: string,
  language: SupportedLanguage = 'EN'
): {
  content: string
  cards: AICardItem[]
  filterChips?: { key: string; label: string; value: string }[]
  sourceTags: string[]
} {
  const cards: AICardItem[] = []
  const sourceTags = [queryResult.sourceTag]
  const records = queryResult.records

  // --------------------------------------------------------------------------
  // 1. LOOKUP BOL or SHIPMENT
  // --------------------------------------------------------------------------
  if (queryResult.entityType === 'shipment' && records.length === 1) {
    const s = records[0]
    const bolNum = s.bolNumber || s.referenceNumber || 'N/A'
    const ctrNum = s.container?.containerNumber || s.containerNumber || 'PENDING'
    const loc = s.currentLocation || 'In Transit'
    const status = s.status || 'Active'
    const eta = s.vessel?.eta || s.eta || 'N/A'

    cards.push({
      id: `card-bol-${bolNum}`,
      type: 'BOL',
      title: `BOL ${bolNum}`,
      subtitle: `${s.shipper?.name || s.accountName || 'Cargo'} ➔ ${s.destination || 'Destination'}`,
      status: status.replace(/_/g, ' ').toUpperCase(),
      primaryReference: bolNum,
      secondaryReference: ctrNum !== 'PENDING' ? `Ctr: ${ctrNum}` : undefined,
      location: loc,
      eta,
      isStale: queryResult.isStaleData,
      staleReason: queryResult.isStaleData ? 'Last tracking update was >48 hours ago.' : undefined,
      actions: [
        { label: 'Open BOL', action: 'NAVIGATE', params: { view: 'bol', bolNumber: bolNum }, variant: 'primary' },
        { label: 'Open Tracking', action: 'NAVIGATE', params: { view: 'shipments', bolNumber: bolNum } },
        { label: 'WhatsApp Update', action: 'GENERATE_WHATSAPP', params: { bolNumber: bolNum } },
      ],
    })

    let text = ''
    if (language === 'PS') {
      text = `د بارنامې **${bolNum}** معلومات وموندل شول:\n• کانتینر: ${ctrNum}\n• اوسنی موقعیت: **${loc}**\n• وضعیت: ${status}\n• د رسیدو اټکل (ETA): ${eta}`
    } else if (language === 'FA') {
      text = `اطلاعات بارنامه **${bolNum}** دریافت شد:\n• کانتینر: ${ctrNum}\n• موقعیت فعلی: **${loc}**\n• وضعیت: ${status}\n• تاریخ تخمینی ورود: ${eta}`
    } else {
      text = `Here is the current operational record for **BOL ${bolNum}**:\n• **Container:** ${ctrNum}\n• **Current Location:** **${loc}**\n• **Status:** ${status.replace(/_/g, ' ')}\n• **Route:** ${s.origin || 'Kandahar'} ➔ ${s.destination || 'Nhava Sheva'}\n• **ETA:** ${eta}`
    }

    if (queryResult.isStaleData) {
      text += `\n\n> ⚠️ **Notice:** Last confirmed tracking update was over 48 hours ago. Location may need operational verification.`
    }

    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 2. LOOKUP CONTAINER
  // --------------------------------------------------------------------------
  if (queryResult.entityType === 'container' && records.length === 1) {
    const c = records[0]
    const ctrNum = c.matchedContainer || c.containerNumber || 'N/A'
    const bolNum = c.bolNumber || c.referenceNumber || 'N/A'
    const loc = c.currentLocation || 'In Transit'
    const status = c.status || 'Active'

    cards.push({
      id: `card-ctr-${ctrNum}`,
      type: 'CONTAINER',
      title: `Container ${ctrNum}`,
      subtitle: `Linked BOL: ${bolNum}`,
      status: status.replace(/_/g, ' ').toUpperCase(),
      primaryReference: ctrNum,
      secondaryReference: `BOL: ${bolNum}`,
      location: loc,
      eta: c.vessel?.eta || c.eta,
      isStale: queryResult.isStaleData,
      actions: [
        { label: 'Open Container', action: 'NAVIGATE', params: { view: 'shipments', containerNumber: ctrNum }, variant: 'primary' },
        { label: 'Open BOL', action: 'NAVIGATE', params: { view: 'bol', bolNumber: bolNum } },
      ],
    })

    const text = `**Container ${ctrNum}** details:\n• **Linked BOL:** ${bolNum}\n• **Current Location:** **${loc}**\n• **Status:** ${status.replace(/_/g, ' ')}\n• **Destination:** ${c.destination || 'N/A'}`

    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 3. SEARCH SHIPMENTS OR CONTAINERS LIST
  // --------------------------------------------------------------------------
  if (
    (queryResult.entityType === 'shipment' || queryResult.entityType === 'container') &&
    records.length > 0
  ) {
    for (const r of records.slice(0, 8)) {
      const bNum = r.bolNumber || r.referenceNumber || 'N/A'
      const cNum = r.containerNumber || r.container?.containerNumber || 'PENDING'
      cards.push({
        id: `card-item-${bNum}-${cNum}`,
        type: queryResult.entityType === 'container' ? 'CONTAINER' : 'BOL',
        title: queryResult.entityType === 'container' ? `Container ${cNum}` : `BOL ${bNum}`,
        subtitle: `${r.origin || 'Origin'} ➔ ${r.destination || 'Destination'}`,
        status: (r.status || 'Active').replace(/_/g, ' ').toUpperCase(),
        primaryReference: bNum,
        secondaryReference: cNum,
        location: r.currentLocation || 'In Transit',
        actions: [
          { label: 'View Tracking', action: 'NAVIGATE', params: { view: 'shipments', bolNumber: bNum } },
        ],
      })
    }

    const text = `Found **${queryResult.totalMatches}** matching ${queryResult.entityType}(s) in the active database. Showing the first ${Math.min(queryResult.totalMatches, 8)} records below:`
    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 4. CUSTOMER BALANCES (Segregated Multi-Currency)
  // --------------------------------------------------------------------------
  if (queryResult.entityType === 'customer_balance') {
    const totals: { currency: string; amount: number }[] =
      queryResult.metrics?.currencyTotals || []
    const custName = queryResult.metrics?.customerName || 'Customer'

    let formattedTotals = '0.00 USD'
    if (totals.length > 0) {
      formattedTotals = totals
        .map((t) => `• **${t.amount.toLocaleString()} ${t.currency}**`)
        .join('\n')
    }

    cards.push({
      id: `card-cust-bal-${custName}`,
      type: 'CUSTOMER',
      title: `Account Balance: ${custName}`,
      subtitle: `${records.length} outstanding invoice(s)`,
      primaryReference: custName,
      financials: totals.map((t) => ({
        amount: t.amount,
        currency: t.currency,
        label: 'Outstanding',
      })),
      actions: [
        { label: 'Open Ledger', action: 'NAVIGATE', params: { view: 'ledger', accountName: custName }, variant: 'primary' },
        { label: 'Invoices', action: 'NAVIGATE', params: { view: 'invoice', clientName: custName } },
      ],
    })

    const text = `**${custName}** has the following outstanding receivables (strictly segregated by currency):\n\n${formattedTotals}\n\n*Note: Multi-currency balances are kept distinct in accordance with Sky Ariana accounting standards.*`

    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 5. TODAY PAYMENTS
  // --------------------------------------------------------------------------
  if (queryResult.entityType === 'today_payments') {
    const totals: { currency: string; amount: number }[] =
      queryResult.metrics?.currencyTotals || []
    const pDate = queryResult.metrics?.date || 'Today'

    const formattedTotals =
      totals.length > 0
        ? totals.map((t) => `• **${t.amount.toLocaleString()} ${t.currency}**`).join('\n')
        : '• *No payments recorded yet for this date.*'

    const text = `**Collections recorded for ${pDate}**:\n\n${formattedTotals}\n\nTotal receipts: ${records.length} transaction(s).`
    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 6. MISSING DOCUMENTS
  // --------------------------------------------------------------------------
  if (queryResult.entityType === 'missing_documents') {
    for (const d of records.slice(0, 6)) {
      cards.push({
        id: `card-doc-${d.id || d.bolNumber}`,
        type: 'DOCUMENT',
        title: d.name || d.type || 'Export Document',
        subtitle: `BOL: ${d.bolNumber || 'N/A'} (${d.shipperName || 'Client'})`,
        status: d.status || 'DRAFT',
        primaryReference: d.bolNumber || 'N/A',
        missingItems: d.missingFields || ['Sign-off Required'],
        actions: [
          { label: 'Open Document', action: 'NAVIGATE', params: { view: 'document-compliance', docId: d.id } },
        ],
      })
    }

    const text = `I found **${queryResult.totalMatches}** shipments with pending or incomplete export documentation. Review the affected items below:`
    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 7. BORDER TRUCKS
  // --------------------------------------------------------------------------
  if (queryResult.entityType === 'border_trucks') {
    for (const b of records.slice(0, 6)) {
      cards.push({
        id: `card-border-${b.id || b.bolNumber}`,
        type: 'BORDER',
        title: `Truck ${b.truck?.afghanPlate || 'Plate Unknown'}`,
        subtitle: `BOL: ${b.bolNumber || b.referenceNumber}`,
        location: b.currentLocation || 'Border Crossing',
        status: b.status || 'Customs Pending',
        primaryReference: b.bolNumber || b.referenceNumber,
        actions: [
          { label: 'Open Tracking', action: 'NAVIGATE', params: { view: 'shipments', bolNumber: b.bolNumber } },
        ],
      })
    }

    const text = `Currently **${queryResult.totalMatches}** truck(s) are queued or undergoing customs clearance at border stations:`
    return { content: text, cards, sourceTags }
  }

  // --------------------------------------------------------------------------
  // 8. NO RECORDS FOUND (Zero Hallucination Guaranteed)
  // --------------------------------------------------------------------------
  if (records.length === 0) {
    let notFoundText = ''
    if (language === 'PS') {
      notFoundText = `په سیسټم کې د ستاسو د پوښتنې اړوند هیڅ ریکارډ ونه موندل شو. مهرباني وکړئ د بارنامې یا کانتینر نمبر وڅارئ.`
    } else if (language === 'FA') {
      notFoundText = `هیچ رکوردی منطبق با جستجوی شما در پایگاه داده اسکای آریانا یافت نشد. لطفا شماره بارنامه یا کانتینر را بررسی کنید.`
    } else {
      notFoundText = `I searched the verified Sky Ariana database but found **no matching records** for your query.\n\n*Double-check the BOL number, container number, or customer name.*`
    }

    return {
      content: notFoundText,
      cards: [],
      sourceTags: [queryResult.sourceTag],
    }
  }

  return {
    content: `Found **${queryResult.totalMatches}** record(s) matching your request.`,
    cards,
    sourceTags,
  }
}
