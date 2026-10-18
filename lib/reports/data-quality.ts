/**
 * Sky Ariana Logistics — Data Quality & Duplicate Detection Engine
 */

import {
  SavedDocument,
  DataQualityAudit,
  MissingDataIssue,
  PossibleDuplicate,
  SeverityLevel,
} from "./types"
import { normalizeDate } from "./parsers"

interface FieldAuditRule {
  field: keyof SavedDocument
  label: string
  severity: SeverityLevel
  validator: (doc: SavedDocument) => boolean
}

const AUDIT_RULES: FieldAuditRule[] = [
  // Critical
  {
    field: "shipper_name",
    label: "Shipper Name",
    severity: "critical",
    validator: (d) => Boolean(d.shipper_name && d.shipper_name.trim()),
  },
  {
    field: "consignee_name",
    label: "Consignee Name",
    severity: "critical",
    validator: (d) => Boolean(d.consignee_name && d.consignee_name.trim()),
  },
  {
    field: "cargo_description",
    label: "Cargo Description / Commodity",
    severity: "critical",
    validator: (d) =>
      Boolean(
        (d.cargo_description && d.cargo_description.trim()) ||
        (d.goods_description && d.goods_description.trim()) ||
        (d.description_of_goods && d.description_of_goods.trim())
      ),
  },
  {
    field: "number_of_packages",
    label: "Package / Carton Count",
    severity: "critical",
    validator: (d) => Boolean(d.number_of_packages && d.number_of_packages.trim() && !d.number_of_packages.includes("0")),
  },
  {
    field: "net_weight",
    label: "Net Weight",
    severity: "critical",
    validator: (d) => Boolean(d.net_weight && d.net_weight.trim()),
  },

  // Warning
  {
    field: "container_numbers",
    label: "Container Number",
    severity: "warning",
    validator: (d) => Boolean(d.container_numbers && d.container_numbers.trim()),
  },
  {
    field: "truck_number",
    label: "Truck License Plate",
    severity: "warning",
    validator: (d) => Boolean(d.truck_number && d.truck_number.trim()),
  },
  {
    field: "port_of_loading",
    label: "Port of Loading (POL)",
    severity: "warning",
    validator: (d) => Boolean(d.port_of_loading && d.port_of_loading.trim()),
  },
  {
    field: "port_of_discharge",
    label: "Port of Discharge (POD)",
    severity: "warning",
    validator: (d) => Boolean(d.port_of_discharge && d.port_of_discharge.trim()),
  },
  {
    field: "goods_value",
    label: "Declared Goods Value",
    severity: "warning",
    validator: (d) => Boolean(d.goods_value && d.goods_value.trim() && d.goods_value !== "0"),
  },

  // Optional
  {
    field: "notify_party_name",
    label: "Notify Party",
    severity: "optional",
    validator: (d) => {
      const np = d.notify_party_name || d.notify_party || (d as any).notifyParty
      return Boolean(np && String(np).trim())
    },
  },
  {
    field: "invoice_no",
    label: "Invoice Number",
    severity: "optional",
    validator: (d) => Boolean((d.invoice_no && d.invoice_no.trim()) || (d.invoice_number && d.invoice_number.trim())),
  },
  {
    field: "pdf_url",
    label: "Saved PDF Document",
    severity: "optional",
    validator: (d) => Boolean(d.pdf_url),
  },
]

/**
 * Audits Saved BOL database records for missing data fields.
 */
export function auditDataQuality(docs: SavedDocument[]): DataQualityAudit {
  if (docs.length === 0) {
    return {
      totalRecords: 0,
      completeRecords: 0,
      attentionRecords: 0,
      qualityScorePercent: 100,
      issues: [],
    }
  }

  const issueMap = new Map<string, MissingDataIssue>()
  for (const rule of AUDIT_RULES) {
    issueMap.set(rule.field as string, {
      field: rule.field as string,
      label: rule.label,
      severity: rule.severity,
      missingCount: 0,
      affectedDocIds: [],
    })
  }

  const attentionSet = new Set<string>()
  let totalFieldChecks = 0
  let passedFieldChecks = 0

  for (const doc of docs) {
    let hasAttention = false

    for (const rule of AUDIT_RULES) {
      totalFieldChecks++
      const isValid = rule.validator(doc)

      if (isValid) {
        passedFieldChecks++
      } else {
        const issue = issueMap.get(rule.field as string)!
        issue.missingCount++
        issue.affectedDocIds.push(doc.id)

        if (rule.severity === "critical" || rule.severity === "warning") {
          hasAttention = true
        }
      }
    }

    if (hasAttention) {
      attentionSet.add(doc.id)
    }
  }

  const completeRecords = docs.length - attentionSet.size
  const qualityScorePercent =
    totalFieldChecks > 0 ? Math.round((passedFieldChecks / totalFieldChecks) * 1000) / 10 : 100

  const issues = Array.from(issueMap.values())
    .filter((issue) => issue.missingCount > 0)
    .sort((a, b) => {
      const order: Record<SeverityLevel, number> = { critical: 1, warning: 2, optional: 3 }
      return order[a.severity] - order[b.severity] || b.missingCount - a.missingCount
    })

  return {
    totalRecords: docs.length,
    completeRecords,
    attentionRecords: attentionSet.size,
    qualityScorePercent,
    issues,
  }
}

/**
 * Identifies potential duplicate BOLs without destructive actions.
 */
export function detectPossibleDuplicates(docs: SavedDocument[]): PossibleDuplicate[] {
  const duplicates: PossibleDuplicate[] = []

  // 1. Same BOL Number
  const bolMap = new Map<string, SavedDocument[]>()
  for (const doc of docs) {
    if (!doc.bol_number) continue
    const norm = doc.bol_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!norm) continue
    if (!bolMap.has(norm)) bolMap.set(norm, [])
    bolMap.get(norm)!.push(doc)
  }
  for (const [norm, group] of bolMap.entries()) {
    if (group.length > 1) {
      duplicates.push({
        reason: "Same BOL Number",
        identifier: group[0].bol_number,
        docs: group,
      })
    }
  }

  // 2. Same Invoice Number
  const invMap = new Map<string, SavedDocument[]>()
  for (const doc of docs) {
    const inv = (doc.invoice_no || doc.invoice_number || "").trim().toUpperCase()
    if (!inv || inv === "-" || inv === "N/A") continue
    if (!invMap.has(inv)) invMap.set(inv, [])
    invMap.get(inv)!.push(doc)
  }
  for (const [inv, group] of invMap.entries()) {
    if (group.length > 1) {
      // Avoid reporting if it's already reported under BOL
      const alreadyReported = duplicates.some(
        (d) => d.reason === "Same BOL Number" && d.docs.length === group.length
      )
      if (!alreadyReported) {
        duplicates.push({
          reason: "Same Invoice Number",
          identifier: inv,
          docs: group,
        })
      }
    }
  }

  // 3. Same Container Number
  const containerMap = new Map<string, SavedDocument[]>()
  for (const doc of docs) {
    if (!doc.container_numbers) continue
    const tokens = doc.container_numbers
      .split(/[\n,;/]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length >= 6)

    for (const c of tokens) {
      if (!containerMap.has(c)) containerMap.set(c, [])
      const list = containerMap.get(c)!
      if (!list.some((d) => d.id === doc.id)) {
        list.push(doc)
      }
    }
  }
  for (const [cNum, group] of containerMap.entries()) {
    if (group.length > 1) {
      duplicates.push({
        reason: "Same Container Number",
        identifier: cNum,
        docs: group,
      })
    }
  }

  // 4. Same Shipper + Consignee + Date
  const tripMap = new Map<string, SavedDocument[]>()
  for (const doc of docs) {
    const s = String(doc.shipper_name || "").trim().toLowerCase()
    const c = String(doc.consignee_name || "").trim().toLowerCase()
    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (!s || !c || !d) continue

    const key = `${s}:::${c}:::${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!tripMap.has(key)) tripMap.set(key, [])
    tripMap.get(key)!.push(doc)
  }
  for (const [, group] of tripMap.entries()) {
    if (group.length > 1) {
      const alreadyInBol = duplicates.some(
        (d) => d.reason === "Same BOL Number" && d.docs[0].id === group[0].id
      )
      if (!alreadyInBol) {
        duplicates.push({
          reason: "Same Shipper + Consignee + Date",
          identifier: `${group[0].shipper_name} ➔ ${group[0].consignee_name}`,
          docs: group,
        })
      }
    }
  }

  return duplicates
}
