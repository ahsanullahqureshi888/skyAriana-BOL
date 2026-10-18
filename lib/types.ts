export interface LedgerEntry {
  id: string
  sNo: number
  date: string
  shipperDescription: string
  invoiceNo: string
  dateOfShip: string
  barnamehNo?: string
  driverFreight?: string
  driverFreightCurrency?: "USD" | "AFN"
  driverFreightUSD?: number
  shippingCost?: number
  shippingCostCurrency?: "USD" | "AFN"
  shippingCostUSD?: number
  afnToUsdRate?: number
  billOfLanding: string
  surrenderedBL: boolean
  containerNo: string
  containerType?: string
  containerDetails?: string
  consignee: string
  quantity: string
  debit: number
  credit: number
  balance: number
  price?: number
  cost?: number
  profit?: number
  handlingCost?: number
  pdfPathname?: string
}

export interface LedgerSettings {
  companyLogo: string
  backgroundImage: string
  logoUrl?: string
}

export interface Company {
  id: string
  name: string
  ledgerEntries: LedgerEntry[]
  ledgerSettings?: LedgerSettings
  createdBy?: string
}

export interface Account {
  id: string
  name: string
  companies: Company[]
  createdBy?: string
  shipperUsername?: string
}

export interface InvoiceItem {
  id: string
  sNo: number
  description: string
  containerSize: string
  quantity: string
  unit: string
  grossWeight: string
  price: number
  detentionDetails?: string
}

export type UserRole =
  | "superadmin"
  | "admin"
  | "management"
  | "operations"
  | "accounting"
  | "accountant"
  | "documents"
  | "tracking"
  | "data_entry"
  | "viewer"
  | "client"
  | "shipper"

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  email?: string
  password?: string
  phone?: string
  department?: string
  branch?: string
  clientId?: string
  clientName?: string
  status?: 'active' | 'disabled' | 'inactive' | 'suspended' | 'locked' | 'pending'
  avatar?: string
  permissions_override?: import('@/lib/rbac/rbac-types').UserPermissionOverride[]
  createdAt?: string
  lastLogin?: string
  updatedAt?: string
  createdBy?: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  date: string
  companyId: string
  companyName: string
  shipper: string
  consignee: string
  origin: string
  destination: string
  blNo: string
  containers: string
  items: InvoiceItem[]
  exchangeRate: number
  preparedBy: string
  grandTotal: number
}
