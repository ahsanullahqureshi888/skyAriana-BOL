/**
 * Sky Ariana Logistics — Canonical KPI Registry
 * Phase 27: Centralized KPI definitions with semantics, formulas, and date bases.
 */

import { KpiDefinition } from "@/lib/types/executive-bi"

export const KPI_REGISTRY: Record<string, KpiDefinition> = {
  ACTIVE_SHIPMENTS: {
    id: "kpi-active-shipments",
    code: "ACTIVE_SHIPMENTS",
    title: "Active In-Transit Shipments",
    titleFa: "محموله‌های فعال در حال ترانزیت",
    category: "OPERATIONAL",
    description: "Number of active consignments currently booked, loaded, or in-transit across border stations and corridors.",
    formula: "Count of shipments WHERE status IN ('BOOKED', 'DISPATCHED', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'AT_BORDER')",
    dateBasis: "Shipment issue date / Milestone last update",
    polarity: "neutral",
    format: "number",
  },

  DELIVERED_SHIPMENTS: {
    id: "kpi-delivered-shipments",
    code: "DELIVERED_SHIPMENTS",
    title: "Delivered Consignments",
    titleFa: "محموله‌های تحویل داده شده",
    category: "OPERATIONAL",
    description: "Total consignments successfully released and delivered to consignees within the selected timeframe.",
    formula: "Count of shipments WHERE status = 'DELIVERED'",
    dateBasis: "Final POD delivery confirmation date",
    polarity: "higher_is_positive",
    format: "number",
  },

  SERVICE_REVENUE: {
    id: "kpi-service-revenue",
    code: "SERVICE_REVENUE",
    title: "Service Revenue (Freight & Handling)",
    titleFa: "درآمد خالص خدمات حمل و نقل",
    category: "FINANCIAL",
    description: "Company earned revenue from freight, clearance, handling, and documentation fees. Strictly excludes commercial cargo value.",
    formula: "Sum of recognized sales invoices issued to clients (Demurrage + Freight + Handling)",
    dateBasis: "Invoice issue / posting date",
    polarity: "higher_is_positive",
    format: "currency",
    requiredPermission: "pnl_view",
    currencySensitive: true,
  },

  DIRECT_SHIPMENT_COST: {
    id: "kpi-direct-cost",
    code: "DIRECT_SHIPMENT_COST",
    title: "Direct Shipment Costs",
    titleFa: "هزینه‌های مستقیم عملیات و باربری",
    category: "FINANCIAL",
    description: "Direct carrier, shipping line, trucking driver rent, port terminal, and customs broker charges incurred.",
    formula: "Sum of approved supplier bills + driver trip payouts directly tied to shipments",
    dateBasis: "Bill date / Supplier payment posting date",
    polarity: "higher_is_negative",
    format: "currency",
    requiredPermission: "cost_view",
    currencySensitive: true,
  },

  SHIPMENT_GROSS_MARGIN: {
    id: "kpi-gross-margin",
    code: "SHIPMENT_GROSS_MARGIN",
    title: "Shipment Gross Margin",
    titleFa: "حاشیه سود ناخالص عملیاتی",
    category: "FINANCIAL",
    description: "Difference between earned logistics service revenue and direct supplier freight charges. Never labeled as Net Profit.",
    formula: "Service Revenue - Direct Shipment Costs",
    dateBasis: "Invoice and bill recognition dates within period",
    polarity: "higher_is_positive",
    format: "currency",
    requiredPermission: "profit_view",
    currencySensitive: true,
  },

  GROSS_MARGIN_PERCENT: {
    id: "kpi-gross-margin-pct",
    code: "GROSS_MARGIN_PERCENT",
    title: "Gross Margin %",
    titleFa: "درصد حاشیه سود ناخالص",
    category: "FINANCIAL",
    description: "Percentage yield of gross margin relative to earned service revenue.",
    formula: "(Shipment Gross Margin / Service Revenue) * 100 [Displays 'N/A' if Revenue is 0]",
    dateBasis: "Period recognition dates",
    polarity: "higher_is_positive",
    format: "percentage",
    requiredPermission: "margin_view",
  },

  ACTIVE_CONTAINERS: {
    id: "kpi-active-containers",
    code: "ACTIVE_CONTAINERS",
    title: "Active Containers Under Management",
    titleFa: "کانتینرهای فعال تحت مدیریت",
    category: "OPERATIONAL",
    description: "Containers currently tracked at ports, cross-docks, border stations, or en route.",
    formula: "Count of distinct active container numbers with status != 'RETURNED_EMPTY'",
    dateBasis: "Container tracking checkpoint date",
    polarity: "neutral",
    format: "number",
  },

  ACTIVE_TRUCKS: {
    id: "kpi-active-trucks",
    code: "ACTIVE_TRUCKS",
    title: "Active Road Trucks / Trips",
    titleFa: "کامیون‌های فعال در حال حمل زمینی",
    category: "OPERATIONAL",
    description: "Active road trucks dispatched across transit corridors (Islam Qala, Hairatan, Torghundi, Spin Boldak).",
    formula: "Count of road consignments WHERE status IN ('DISPATCHED', 'IN_TRANSIT', 'BORDER_CUSTOMS')",
    dateBasis: "Truck dispatch date",
    polarity: "neutral",
    format: "number",
  },

  BORDER_CLEARANCE_TURNAROUND: {
    id: "kpi-border-turnaround",
    code: "BORDER_CLEARANCE_TURNAROUND",
    title: "Avg Border Station Clearance Time",
    titleFa: "میانگین زمان ترخیص در گمرکات مرزی",
    category: "OPERATIONAL",
    description: "Average days elapsed between border arrival and customs departure clearance across all border checkpoints.",
    formula: "Sum(Clearance Exit Timestamp - Arrival Timestamp) / Cleared Shipments Count",
    dateBasis: "Border checkpoint entry/exit timestamps",
    polarity: "higher_is_negative",
    format: "days",
  },

  QUOTE_CONVERSION_RATE: {
    id: "kpi-quote-conversion",
    code: "QUOTE_CONVERSION_RATE",
    title: "Accepted Quote Conversion Rate",
    titleFa: "نرخ تبدیل پیش‌فاکتورها به بارنامه",
    category: "COMMERCIAL",
    description: "Ratio of client-accepted rate quotations that resulted in an active booked shipment.",
    formula: "(Converted Booked Shipments / Eligible Accepted Quotes) * 100 [Displays 'N/A' if No Quotes]",
    dateBasis: "Quote accepted date vs booking date",
    polarity: "higher_is_positive",
    format: "percentage",
  },

  OVERDUE_RECEIVABLES: {
    id: "kpi-overdue-receivables",
    code: "OVERDUE_RECEIVABLES",
    title: "Overdue Client Receivables",
    titleFa: "مطالبات معوق مشتریان",
    category: "FINANCIAL",
    description: "Unpaid customer invoice balances past their contractual credit due date (> 30 days).",
    formula: "Sum of unpaid customer invoices WHERE current_date > due_date",
    dateBasis: "Invoice payment due date",
    polarity: "higher_is_negative",
    format: "currency",
    requiredPermission: "receivables_report_view",
    currencySensitive: true,
  },

  OVERDUE_PAYABLES: {
    id: "kpi-overdue-payables",
    code: "OVERDUE_PAYABLES",
    title: "Overdue Carrier Payables",
    titleFa: "بدهی‌های معوق به شرکت‌های باربری",
    category: "FINANCIAL",
    description: "Outstanding carrier, shipping line, and customs broker bills past vendor due dates.",
    formula: "Sum of unpaid supplier bills WHERE current_date > due_date",
    dateBasis: "Supplier bill due date",
    polarity: "higher_is_negative",
    format: "currency",
    requiredPermission: "payables_report_view",
    currencySensitive: true,
  },

  OPEN_CLAIMS: {
    id: "kpi-open-claims",
    code: "OPEN_CLAIMS",
    title: "Open Cargo Claims & Disputes",
    titleFa: "دعاوی و پرونده‌های باز خسارت کالا",
    category: "RISK_COMPLIANCE",
    description: "Pending cargo loss, damage, border detention, or demurrage claims currently under dispute.",
    formula: "Count of claim incident files WHERE status IN ('OPEN', 'INVESTIGATION', 'DISPUTED')",
    dateBasis: "Claim incident filing date",
    polarity: "higher_is_negative",
    format: "number",
  },

  UNPOSTED_DOCS: {
    id: "kpi-unposted-docs",
    code: "UNPOSTED_DOCS",
    title: "Draft / Unposted Documents",
    titleFa: "اسناد و فاکتورهای پیش‌نویس ثبت‌نشده",
    category: "RISK_COMPLIANCE",
    description: "Documents, BOL drafts, or ledger adjustments pending formal validation and official posting.",
    formula: "Count of drafts WHERE status = 'DRAFT'",
    dateBasis: "Draft creation date",
    polarity: "higher_is_negative",
    format: "number",
  },

  OPERATIONAL_ATTENTION_COUNT: {
    id: "kpi-attention-count",
    code: "OPERATIONAL_ATTENTION_COUNT",
    title: "Urgent Attention Items",
    titleFa: "موارد نیازمند توجه فوری مدیریت",
    category: "RISK_COMPLIANCE",
    description: "Combined count of critical bottlenecks: border holds > 48h, tracking silence > 72h, overdue invoices > 60d, open claims.",
    formula: "Count(Border Holds > 48h + Invoices Overdue > 60d + Stale Tracking > 72h + High Claims)",
    dateBasis: "Real-time audit calculation",
    polarity: "higher_is_negative",
    format: "number",
  },
}

/**
 * Format KPI value with divide-by-zero protection and polarity checks
 */
export function formatKpiValue(
  value: number | null | undefined,
  format: KpiDefinition["format"],
  currency: string = "USD"
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A"
  }

  switch (format) {
    case "currency": {
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value)
      return `${currency} ${formatted}`
    }
    case "percentage": {
      return `${value.toFixed(1)}%`
    }
    case "days": {
      return `${value.toFixed(1)} days`
    }
    case "number": {
      return new Intl.NumberFormat("en-US").format(Math.round(value))
    }
    case "decimal": {
      return value.toFixed(2)
    }
    default:
      return String(value)
  }
}

/**
 * Compute percentage difference safely with zero-division handling
 */
export function computeSafePercentageChange(
  current: number,
  previous: number
): { percent: number | null; text: string; trend: "up" | "down" | "flat" } {
  if (previous === 0) {
    if (current === 0) {
      return { percent: 0, text: "0.0%", trend: "flat" }
    }
    return { percent: null, text: "New Activity", trend: "up" }
  }

  const change = ((current - previous) / Math.abs(previous)) * 100
  const trend = change > 0.05 ? "up" : change < -0.05 ? "down" : "flat"
  const sign = change > 0 ? "+" : ""

  return {
    percent: Math.round(change * 10) / 10,
    text: `${sign}${change.toFixed(1)}%`,
    trend,
  }
}
