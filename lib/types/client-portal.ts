export interface BolCompanyAccess {
  id: string
  bol_id: string
  company_id: string
  access_role?: "SHIPPER" | "CONSIGNEE" | "BILL_TO" | "NOTIFY" | "OTHER" | string
  access_level?: string
  can_view_tracking?: boolean
  can_view_documents?: boolean
  can_view_financials?: boolean
  granted_by?: string
  created_at: string
  updated_at: string
}

export type ClientPortalRole =
  | "CLIENT_ADMIN"
  | "CLIENT_ACCOUNTING"
  | "CLIENT_OPERATIONS"
  | "CLIENT_VIEWER"
  | "customer_admin"
  | "accounts"
  | "operations"
  | "viewer"

export type ClientPortalStatus =
  | "ACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "DISABLED"
  | "active"
  | "invited"
  | "suspended"
  | "disabled"

export interface ClientPortalPermissions {
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

export const DEFAULT_CLIENT_PERMISSIONS: Record<string, ClientPortalPermissions> = {
  CLIENT_ADMIN: {
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
  },
  CLIENT_ACCOUNTING: {
    viewShipments: true,
    viewBol: true,
    downloadBolPdf: true,
    viewTracking: true,
    viewContainerInfo: false,
    viewVesselInfo: false,
    viewDocuments: true,
    downloadDocuments: true,
    viewCommercialInvoice: true,
    viewPackingList: true,
    viewAccountLedger: true,
    viewOutstandingBalance: true,
    viewTransactionDetails: true,
    viewReports: true,
    generateTrackingPdf: false,
    copyShipmentUpdate: false,
  },
  CLIENT_OPERATIONS: {
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
    viewAccountLedger: false,
    viewOutstandingBalance: false,
    viewTransactionDetails: false,
    viewReports: true,
    generateTrackingPdf: true,
    copyShipmentUpdate: true,
  },
  CLIENT_VIEWER: {
    viewShipments: true,
    viewBol: true,
    downloadBolPdf: false,
    viewTracking: true,
    viewContainerInfo: true,
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

export interface ClientPortalUser {
  id: string
  customerId: string // Linked to canonical Company ID (e.g. comp-xxx or company name)
  customerName: string // Canonical Company Name
  username: string
  email: string
  contactName?: string
  phone?: string
  passwordHash: string
  salt: string
  role: ClientPortalRole
  status: ClientPortalStatus
  preferredLanguage?: "en" | "fa" | "ps"
  permissions?: Partial<ClientPortalPermissions>
  lastLogin?: string
  lastActivity?: string
  createdAt: string
  updatedAt: string
}

export type CustomerPortalUser = ClientPortalUser

export interface ClientSession {
  token: string
  userId: string
  companyId: string
  companyName: string
  username: string
  role: ClientPortalRole
  expiresAt: string
}

export type PaymentProofStatus = "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED"

export interface PaymentProofRecord {
  id: string
  companyId: string
  companyName: string
  invoiceNumber?: string
  bolNumber?: string
  amount: number
  currency: string
  reference?: string
  filePath?: string
  fileName?: string
  fileDataUrl?: string
  note?: string
  status: PaymentProofStatus
  submittedBy: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  createdAt: string
  updatedAt: string
}

export type ClientInquiryCategory = "TRACKING" | "DOCUMENTS" | "INVOICE" | "PAYMENT" | "CONTAINER" | "OTHER"
export type ClientInquiryStatus = "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED"

export interface ClientInquiryRecord {
  id: string
  companyId: string
  companyName: string
  bolNumber?: string
  category: ClientInquiryCategory
  subject: string
  message: string
  status: ClientInquiryStatus
  submittedBy: string
  response?: string
  respondedBy?: string
  respondedAt?: string
  createdAt: string
  updatedAt: string
}
