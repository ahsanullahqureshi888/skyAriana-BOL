import type { AttentionItem, AttentionSeverity, LiveShipmentRow, ContainerRiskSummary } from "./types"

const SNOOZE_STORAGE_KEY = "skybol:tower-snooze-v1"

export interface SnoozeRecord {
  snoozedUntil?: number
  acknowledged?: boolean
}

/**
 * Read snooze and acknowledgement map from client localStorage safely
 */
export function getSnoozeState(): Record<string, SnoozeRecord> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(SNOOZE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Save a snooze duration (in milliseconds) or acknowledge an alert
 */
export function setAttentionSnooze(itemId: string, durationMs: number | null, acknowledge = false): void {
  if (typeof window === "undefined") return
  try {
    const current = getSnoozeState()
    const now = Date.now()
    if (acknowledge) {
      current[itemId] = { acknowledged: true }
    } else if (durationMs !== null && durationMs > 0) {
      current[itemId] = { snoozedUntil: now + durationMs }
    } else {
      delete current[itemId]
    }
    window.localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(current))
    window.dispatchEvent(new CustomEvent("skybol:tower-snooze-updated", { detail: { itemId } }))
  } catch (err) {
    console.error("Failed to save snooze state:", err)
  }
}

/**
 * Filter out items that are currently snoozed or acknowledged
 */
export function applySnoozeFilter(items: AttentionItem[], snoozeMap: Record<string, SnoozeRecord>): AttentionItem[] {
  const now = Date.now()
  return items.filter((item) => {
    const record = snoozeMap[item.id]
    if (!record) return true
    if (record.acknowledged) return false
    if (record.snoozedUntil && record.snoozedUntil > now) return false
    return true
  })
}

/**
 * Sort attention items strictly by severity (Critical -> Warning -> Info) and timestamp
 */
export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  const priorityScore: Record<AttentionSeverity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  }

  return [...items].sort((a, b) => {
    const diff = priorityScore[b.severity] - priorityScore[a.severity]
    if (diff !== 0) return diff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

/**
 * Generate Attention Items from live shipments, containers, and compliance records
 */
export function evaluateAttentionRules(params: {
  shipments: LiveShipmentRow[]
  containerRisks: ContainerRiskSummary[]
  overdueInvoices?: { invoiceNo: string; customerName: string; overdueDays: number; amount: number; currency: string }[]
  missingDocShipments?: { bolNumber: string; customer: string; missingList: string[] }[]
}): AttentionItem[] {
  const { shipments, containerRisks, overdueInvoices = [], missingDocShipments = [] } = params
  const items: AttentionItem[] = []
  const now = Date.now()

  // 1. Check Container Free Days & Detention Risks
  for (const c of containerRisks) {
    if (c.isOverdue) {
      items.push({
        id: `att-detention-${c.containerNumber}`,
        title: `Container Overdue: ${c.containerNumber}`,
        description: `Exceeded free days by ${Math.abs(c.daysRemaining)} days. Estimated detention exposure: $${c.estimatedDetentionUSD.toLocaleString()} USD.`,
        severity: "critical",
        category: "detention_freedays",
        containerNumber: c.containerNumber,
        bolNumber: c.bolNumber,
        timestamp: new Date().toISOString(),
        actionLabel: "View Containers",
        targetView: "booking-containers",
        targetParam: c.containerNumber,
      })
    } else if (c.daysRemaining <= 2 && c.daysRemaining > 0) {
      items.push({
        id: `att-freedays-${c.containerNumber}`,
        title: `Free Days Expiring Soon: ${c.containerNumber}`,
        description: `Only ${c.daysRemaining} free day(s) left before detention charges commence.`,
        severity: "warning",
        category: "detention_freedays",
        containerNumber: c.containerNumber,
        bolNumber: c.bolNumber,
        timestamp: new Date().toISOString(),
        actionLabel: "View Containers",
        targetView: "booking-containers",
        targetParam: c.containerNumber,
      })
    }
  }

  // 2. Check Cut-Offs & Stage Delays across Shipments
  for (const s of shipments) {
    // Port / VGM cut-off checks
    if (s.portCutOff) {
      const cutOffTime = new Date(s.portCutOff).getTime()
      const diffHours = (cutOffTime - now) / (1000 * 60 * 60)

      if (diffHours > 0 && diffHours <= 24) {
        items.push({
          id: `att-cutoff-port-${s.id}`,
          title: `Port Cut-off in <24h: ${s.bolNumber || s.referenceNumber}`,
          description: `Vessel cut-off scheduled for ${new Date(s.portCutOff).toLocaleDateString()} at ${s.destination || "Port"}. Ensure gate-in is verified.`,
          severity: "critical",
          category: "cut_off",
          shipmentId: s.id,
          bolNumber: s.bolNumber,
          containerNumber: s.containerNumber,
          timestamp: new Date().toISOString(),
          actionLabel: "Check Shipment",
          targetView: "shipments",
          targetParam: s.id,
        })
      } else if (diffHours > 24 && diffHours <= 48) {
        items.push({
          id: `att-cutoff-port-warn-${s.id}`,
          title: `Cut-off in 24-48h: ${s.bolNumber || s.referenceNumber}`,
          description: `Port cutoff approaching on ${new Date(s.portCutOff).toLocaleDateString()}. Confirm dispatch status.`,
          severity: "warning",
          category: "cut_off",
          shipmentId: s.id,
          bolNumber: s.bolNumber,
          containerNumber: s.containerNumber,
          timestamp: new Date().toISOString(),
          actionLabel: "Check Shipment",
          targetView: "shipments",
          targetParam: s.id,
        })
      }
    }

    // Missing Container or Seal on active road/port shipments
    if (s.stage !== "preparing" && s.stage !== "delivered") {
      if (!s.containerNumber || s.containerNumber === "TEMU0000000" || s.containerNumber.trim() === "") {
        items.push({
          id: `att-nocontainer-${s.id}`,
          title: `Missing Container Number: ${s.bolNumber || s.referenceNumber}`,
          description: `Shipment is in stage [${s.statusLabel}] but has no valid container number assigned.`,
          severity: "warning",
          category: "missing_data",
          shipmentId: s.id,
          bolNumber: s.bolNumber,
          timestamp: new Date().toISOString(),
          actionLabel: "Edit BOL",
          targetView: "bol",
          targetParam: s.bolNumber,
        })
      }
    }

    // Border Clearance Hold / Stagnant
    if (s.stage === "border_clearance" && s.daysInCurrentStage >= 3) {
      items.push({
        id: `att-border-hold-${s.id}`,
        title: `Border Delay (${s.daysInCurrentStage}d): ${s.bolNumber || s.referenceNumber}`,
        description: `Truck ${s.truckPlate || "Unknown"} driven by ${s.driverName || "Driver"} has been at ${s.currentLocation || "Border"} for ${s.daysInCurrentStage} days.`,
        severity: "warning",
        category: "customs_border",
        shipmentId: s.id,
        bolNumber: s.bolNumber,
        timestamp: new Date().toISOString(),
        actionLabel: "WhatsApp Update",
        targetView: "whatsapp",
        targetParam: s.bolNumber,
      })
    }

    // Inactive tracking > 48h
    if (s.stage !== "preparing" && s.stage !== "delivered" && s.daysInCurrentStage >= 2 && !s.lastCheckpointTime) {
      items.push({
        id: `att-stale-track-${s.id}`,
        title: `Tracking Update Required: ${s.bolNumber || s.referenceNumber}`,
        description: `No milestone or checkpoint update recorded in the last 48 hours for active shipment.`,
        severity: "info",
        category: "unresponsive_tracking",
        shipmentId: s.id,
        bolNumber: s.bolNumber,
        timestamp: new Date().toISOString(),
        actionLabel: "Update Status",
        targetView: "shipments",
        targetParam: s.id,
      })
    }
  }

  // 3. Check Incomplete Document Packages
  for (const doc of missingDocShipments) {
    items.push({
      id: `att-docs-${doc.bolNumber}`,
      title: `Missing Documents: ${doc.bolNumber}`,
      description: `Shipper ${doc.customer} is missing required documents: ${doc.missingList.join(", ")}.`,
      severity: "warning",
      category: "missing_docs",
      bolNumber: doc.bolNumber,
      timestamp: new Date().toISOString(),
      actionLabel: "Generate Docs",
      targetView: "document-compliance",
      targetParam: doc.bolNumber,
    })
  }

  // 4. Check Overdue Invoices
  for (const inv of overdueInvoices) {
    items.push({
      id: `att-inv-${inv.invoiceNo}`,
      title: `Overdue Invoice: ${inv.invoiceNo} (${inv.customerName})`,
      description: `Outstanding balance of ${inv.amount.toLocaleString()} ${inv.currency} is overdue by ${inv.overdueDays} days.`,
      severity: "critical",
      category: "overdue_finance",
      customerName: inv.customerName,
      invoiceNumber: inv.invoiceNo,
      timestamp: new Date().toISOString(),
      actionLabel: "Open Ledgers",
      targetView: "accounting",
      targetParam: inv.customerName,
    })
  }

  return sortAttentionItems(items)
}
