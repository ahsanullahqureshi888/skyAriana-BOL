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

export type UserRole = "superadmin" | "admin" | "accountant" | "viewer" | "shipper"

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  email?: string
  password?: string
  clientId?: string
  clientName?: string
  status?: 'active' | 'disabled'
  avatar?: string
  createdAt?: string
  lastLogin?: string
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
