import { ChangedField } from "./audit-types"

export const FRIENDLY_FIELD_LABELS: Record<string, string> = {
  // BOL & Shipments
  blNo: "Bill of Lading Number",
  bolNumber: "BOL Number",
  containerNo: "Container Number",
  containerNumber: "Container Number",
  consignee: "Consignee Name",
  consigneeAddressLine1: "Consignee Address",
  consigneeAddressLine2: "Consignee Secondary Address",
  shipper: "Shipper Name",
  shipperAddress: "Shipper Address",
  notifyParty: "Notify Party",
  destination: "Final Destination",
  origin: "Origin Port / Station",
  pol: "Port of Loading (POL)",
  pod: "Port of Discharge (POD)",
  transitBorder: "Transit Border Station",
  driverName: "Driver Name",
  driverFatherName: "Driver's Father Name",
  driverPhone: "Driver Contact Phone",
  truckNumber: "Truck / Vehicle Plate",
  grossWeight: "Gross Weight (KG)",
  netWeight: "Net Weight (KG)",
  cargoCartonCount: "Total Packages / Cartons",
  packages: "Package Count",
  goodsValue: "Declared Goods Value",
  status: "Status",
  eta: "Estimated Time of Arrival (ETA)",
  etd: "Estimated Time of Departure (ETD)",
  sealNumber: "Customs Container Seal",
  vgm: "Verified Gross Mass (VGM)",
  vesselName: "Vessel / Ship Name",
  voyageNumber: "Voyage Number",

  // Financial & Accounting
  amount: "Transaction Amount",
  currency: "Currency",
  debit: "Debit Amount",
  credit: "Credit Amount",
  balance: "Account Balance",
  grandTotal: "Invoice Grand Total",
  driverRent: "Driver Rent / Freight",
  exchangeRate: "Exchange Rate",
  paymentMethod: "Payment Method",
  referenceNumber: "Transaction Reference",
  bankAccount: "Bank Account",
  accountNumber: "Bank Account Number",
  supplierName: "Supplier / Carrier Name",
  invoiceNo: "Invoice Number",
  paidAmount: "Paid Amount",
  dueAmount: "Due Balance",

  // Master Data & Users
  companyName: "Company Name",
  phone: "Phone Number",
  email: "Email Address",
  taxNumber: "Tax Identification Number (TIN)",
  licenseNumber: "Commercial License Number",
  department: "Department",
  branch: "Office Branch",
  role: "System Role",
  password: "Password / Credential",
  permissions: "Permissions Scope",
  permissions_override: "Permission Overrides",
}

export function getFriendlyLabel(field: string): string {
  if (FRIENDLY_FIELD_LABELS[field]) return FRIENDLY_FIELD_LABELS[field]
  // Convert camelCase or snake_case to Title Case
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim()
}

export function isSensitiveField(field: string): boolean {
  const lower = field.toLowerCase()
  return (
    lower.includes("password") ||
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("auth") ||
    lower.includes("apikey") ||
    lower.includes("privatekey")
  )
}

export function isFinancialField(field: string): boolean {
  const lower = field.toLowerCase()
  return (
    lower.includes("debit") ||
    lower.includes("credit") ||
    lower.includes("balance") ||
    lower.includes("amount") ||
    lower.includes("rent") ||
    lower.includes("total") ||
    lower.includes("price") ||
    lower.includes("freight") ||
    lower.includes("profit") ||
    lower.includes("margin") ||
    lower.includes("cost")
  )
}

export function maskBankAccount(value: any): string {
  if (!value) return "Not Set"
  const str = String(value).trim()
  if (str.length <= 4) return "****"
  return `****${str.slice(-4)}`
}

export function formatFriendlyValue(field: string, val: any): any {
  if (val === null || val === undefined || val === "") {
    return "Not Set"
  }
  if (typeof val === "boolean") {
    return val ? "Yes" : "No"
  }
  if (isSensitiveField(field)) {
    return "[REDACTED]"
  }
  const lower = field.toLowerCase()
  if (lower.includes("bankaccount") || lower.includes("accountnumber") || lower.includes("iban")) {
    return maskBankAccount(val)
  }
  if (typeof val === "number") {
    // Check if it should format as currency/number
    return val.toLocaleString()
  }
  return val
}

export function computeStructuredDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined
): ChangedField[] {
  const changes: ChangedField[] = []
  const b = before || {}
  const a = after || {}

  const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]))

  // Exclude non-business metadata fields from diffing
  const ignoredKeys = new Set(["updatedAt", "updated_at", "lastModified", "timestamp", "eventHash", "_id"])

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue

    const oldVal = b[key]
    const newVal = a[key]

    // Primitive or direct equality comparison
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
      continue
    }

    const sensitive = isSensitiveField(key)
    const financial = isFinancialField(key)

    // Handle nested array of containers or items specifically
    if (Array.isArray(oldVal) && Array.isArray(newVal) && (key.toLowerCase().includes("container") || key.toLowerCase().includes("item"))) {
      const oldLen = oldVal.length
      const newLen = newVal.length
      changes.push({
        field: key,
        friendlyLabel: getFriendlyLabel(key),
        oldValue: `${oldLen} item(s)`,
        newValue: `${newLen} item(s)`,
        isSensitive: sensitive,
        isFinancial: financial,
      })
      continue
    }

    changes.push({
      field: key,
      friendlyLabel: getFriendlyLabel(key),
      oldValue: sensitive ? "[REDACTED]" : formatFriendlyValue(key, oldVal),
      newValue: sensitive ? "[REDACTED]" : formatFriendlyValue(key, newVal),
      isSensitive: sensitive,
      isFinancial: financial,
    })
  }

  return changes
}
