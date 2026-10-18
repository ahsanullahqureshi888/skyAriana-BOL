export type CustomerPortalRole = "customer_admin" | "operations" | "accounts" | "viewer"

export type CustomerPortalStatus = "invited" | "active" | "suspended" | "disabled"

export interface CustomerPortalPermissions {
  viewShipments: boolean
  viewBol: boolean
  downloadBolPdf: boolean
  viewTracking: boolean
  viewContainerInfo: boolean
  viewVesselInfo: boolean
  viewDocuments: boolean
  downloadDocuments: boolean
  viewCommercialInvoice: boolean
  viewPackingList: boolean
  viewAccountLedger: boolean
  viewOutstandingBalance: boolean
  viewTransactionDetails: boolean
  viewReports: boolean
  generateTrackingPdf: boolean
  copyShipmentUpdate: boolean
}

export const DEFAULT_PORTAL_PERMISSIONS: CustomerPortalPermissions = {
  viewShipments: true,
  viewBol: true,
  downloadBolPdf: true,
  viewTracking: true,
  viewContainerInfo: true,
  viewVesselInfo: true,
  viewDocuments: true,
  downloadDocuments: true,
  viewCommercialInvoice: true,
  viewPackingList: true,
  viewAccountLedger: true,
  viewOutstandingBalance: true,
  viewTransactionDetails: true,
  viewReports: true,
  generateTrackingPdf: true,
  copyShipmentUpdate: true,
}

export const ROLE_BASED_DEFAULT_PERMISSIONS: Record<CustomerPortalRole, CustomerPortalPermissions> = {
  customer_admin: {
    ...DEFAULT_PORTAL_PERMISSIONS,
  },
  operations: {
    ...DEFAULT_PORTAL_PERMISSIONS,
    viewAccountLedger: false,
    viewOutstandingBalance: false,
    viewTransactionDetails: false,
  },
  accounts: {
    ...DEFAULT_PORTAL_PERMISSIONS,
    viewContainerInfo: false,
    viewVesselInfo: false,
  },
  viewer: {
    viewShipments: true,
    viewBol: true,
    downloadBolPdf: false,
    viewTracking: true,
    viewContainerInfo: false,
    viewVesselInfo: false,
    viewDocuments: false,
    downloadDocuments: false,
    viewCommercialInvoice: false,
    viewPackingList: false,
    viewAccountLedger: false,
    viewOutstandingBalance: false,
    viewTransactionDetails: false,
    viewReports: false,
    generateTrackingPdf: false,
    copyShipmentUpdate: false,
  },
}

export interface CustomerPortalUser {
  id: string
  customerId: string // Linked to canonical Account/Company id (e.g. acc-xxx)
  customerName: string // Canonical Company Name (e.g. NAJEB AMIN LTD)
  username: string
  email: string
  contactName?: string
  phone?: string
  passwordHash: string
  salt: string
  role: CustomerPortalRole
  status: CustomerPortalStatus
  preferredLanguage: "en" | "fa" | "ps"
  permissions: CustomerPortalPermissions
  linkedBolCount?: number
  lastLogin?: string
  lastActivity?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerPortalSession {
  sessionId: string
  userId: string
  customerId: string
  customerName: string
  username: string
  role: CustomerPortalRole
  permissions: CustomerPortalPermissions
  preferredLanguage: "en" | "fa" | "ps"
  isAdminPreview?: boolean
  expiresAt: number
}

export interface CustomerVisibleMilestone {
  id: string
  location: string
  status: string
  title: string
  description?: string
  timestamp: string
  actualDate?: string
  completed: boolean
}

export interface CustomerShipmentSummary {
  id: string
  referenceNumber: string
  bolNumber: string
  issueDate: string
  commodity: string
  cartons: number
  packageType: string
  netWeightKg: number
  grossWeightKg: number
  origin: string
  destination: string
  currentLocation: string
  currentStatus: string
  containerNumber?: string
  containerType?: string
  vesselName?: string
  voyageNumber?: string
  eta?: string
  etd?: string
  customerRole: "shipper" | "consignee" | "notify" | "client"
  isStarred?: boolean
  customerReference?: string
}

export interface CustomerShipmentDetail extends CustomerShipmentSummary {
  loadingPlace?: string
  borderCrossing?: string
  portOfLoading?: string
  portOfDischarge?: string
  containers: {
    containerNumber: string
    containerType: string
    sealNumber?: string
  }[]
  truck?: {
    afghanPlate?: string
  }
  vessel?: {
    vesselName: string
    voyageNumber: string
    etd?: string
    eta?: string
  }
  milestones: CustomerVisibleMilestone[]
  documents: CustomerDocumentItem[]
}

export interface CustomerDocumentItem {
  id: string
  shipmentId: string
  bolNumber: string
  documentType: string
  title: string
  fileName: string
  fileSize?: number
  createdDate: string
  downloadUrl: string
  customerVisible: boolean
}

export interface CustomerTransactionItem {
  id: string
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  currency: string
  bolNumber?: string
  containerNumber?: string
}

export interface CustomerLedgerSummary {
  customerName: string
  balancesByCurrency: {
    currency: string
    totalDebit: number
    totalCredit: number
    outstandingBalance: number
  }[]
  transactions: CustomerTransactionItem[]
  lastTransactionDate?: string
}

export type PortalRequestType = "document" | "correction" | "tracking" | "account" | "other"
export type PortalRequestStatus = "open" | "in_review" | "resolved" | "closed"

export interface CustomerPortalRequest {
  id: string
  customerId: string
  customerName: string
  userId: string
  userName: string
  shipmentId?: string
  bolNumber?: string
  requestType: PortalRequestType
  subject: string
  message: string
  status: PortalRequestStatus
  adminResponse?: string
  respondedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerPortalNotification {
  id: string
  customerId: string
  userId?: string // specific user or all company users
  shipmentId?: string
  bolNumber?: string
  title: string
  message: string
  eventType: "status_update" | "vessel_departed" | "eta_update" | "document_available" | "delivered" | "statement_ready"
  read: boolean
  createdAt: string
}

export interface CustomerPortalSettings {
  portalEnabled: boolean
  companyName: string
  companyLogoUrl: string
  supportContactEmail: string
  supportContactPhone: string
  defaultLanguage: "en" | "fa" | "ps"
  sessionDurationHours: number
  features: {
    enableLedger: boolean
    enableDocuments: boolean
    enableReports: boolean
    enableSupportRequests: boolean
    enableNotifications: boolean
    enableExcelExport: boolean
  }
}

export const DEFAULT_PORTAL_SETTINGS: CustomerPortalSettings = {
  portalEnabled: true,
  companyName: "SKY ARIANA LIMITED",
  companyLogoUrl: "/logo.png",
  supportContactEmail: "portal-support@skyariana.com",
  supportContactPhone: "+93 70 000 0000",
  defaultLanguage: "en",
  sessionDurationHours: 24,
  features: {
    enableLedger: true,
    enableDocuments: true,
    enableReports: true,
    enableSupportRequests: true,
    enableNotifications: true,
    enableExcelExport: true,
  },
}
