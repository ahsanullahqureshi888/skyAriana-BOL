export enum ProcurementRequestStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  RATE_REQUESTED = "RATE_REQUESTED",
  QUOTES_RECEIVED = "QUOTES_RECEIVED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  ORDERED = "ORDERED",
  CANCELLED = "CANCELLED",
  CLOSED = "CLOSED"
}

export enum RFQStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED"
}

export enum SupplierQuoteStatus {
  RECEIVED = "RECEIVED",
  UNDER_REVIEW = "UNDER_REVIEW",
  SELECTED = "SELECTED",
  NOT_SELECTED = "NOT_SELECTED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED"
}

export enum ServiceOrderStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  SENT = "SENT",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  CLOSED = "CLOSED"
}

export enum OrderServiceType {
  ROAD_FREIGHT = "ROAD_FREIGHT",
  SEA_FREIGHT = "SEA_FREIGHT",
  AIR_FREIGHT = "AIR_FREIGHT",
  CUSTOMS = "CUSTOMS",
  BORDER_HANDLING = "BORDER_HANDLING",
  WAREHOUSING = "WAREHOUSING",
  CONTAINER_DEPOT = "CONTAINER_DEPOT",
  PORT_SERVICE = "PORT_SERVICE",
  DOCUMENTATION = "DOCUMENTATION",
  INSURANCE = "INSURANCE",
  SURVEY = "SURVEY",
  LOADING = "LOADING",
  UNLOADING = "UNLOADING",
  REEFER = "REEFER",
  OTHER = "OTHER"
}

export enum ContractStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  EXPIRING = "EXPIRING",
  EXPIRED = "EXPIRED",
  TERMINATED = "TERMINATED",
  ARCHIVED = "ARCHIVED"
}

export enum InvoiceMatchStatus {
  MATCHED = "MATCHED",
  VARIANCE = "VARIANCE",
  PARTIAL = "PARTIAL",
  NOT_MATCHED = "NOT_MATCHED",
  REVIEW_REQUIRED = "REVIEW_REQUIRED"
}

export interface ProcurementRequest {
  id: string; // PR-2026-00125
  shipmentId?: string;
  bolId?: string;
  bookingId?: string;
  serviceRequired: OrderServiceType;
  route?: string;
  origin?: string;
  destination?: string;
  containerType?: string;
  quantity: number;
  cargoDescription?: string;
  weightKgs?: number;
  requiredDate?: string;
  requestedBy: string;
  assignedBuyer?: string;
  status: ProcurementRequestStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRFQ {
  id: string; // RFQ-2026-00125
  procurementRequestId?: string;
  supplierIds: string[]; // List of Company IDs
  service: OrderServiceType;
  route?: string;
  equipment?: string;
  cargo?: string;
  dates?: string;
  requirements?: string;
  responseDeadline: string;
  status: RFQStatus;
  createdAt: string;
  createdBy: string;
}

export interface SupplierQuote {
  id: string;
  supplierId: string;
  rfqId?: string;
  quoteReference?: string;
  receivedDate: string;
  validUntil: string;
  currency: string;
  baseCost: number;
  additionalCharges: number;
  freeTimeDays?: number;
  transitTimeDays?: number;
  paymentTerms?: string;
  notes?: string;
  attachmentUrl?: string;
  status: SupplierQuoteStatus;
  selectedBy?: string;
  selectedDate?: string;
  selectionReason?: string;
  createdAt: string;
}

export interface ServiceOrder {
  id: string; // SO-2026-00125 or PO-2026-00125
  supplierId: string;
  shipmentId?: string;
  bolId?: string;
  bookingId?: string;
  service: OrderServiceType;
  route?: string;
  description: string;
  quantity: number;
  unit: string;
  currency: string;
  unitCost: number;
  totalExpectedCost: number;
  taxAmount?: number;
  validServiceDate?: string;
  paymentTerms?: string;
  supplierQuoteReference?: string;
  supplierQuoteId?: string;
  status: ServiceOrderStatus;
  createdBy: string;
  approvedBy?: string;
  supplierConfirmed: boolean;
  supplierConfirmedDate?: string;
  supplierConfirmedReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierContract {
  id: string;
  contractNumber: string;
  supplierId: string;
  serviceScope: string;
  effectiveDate: string;
  expiryDate: string;
  currency: string;
  paymentTerms: string;
  rateAgreementSummary?: string;
  attachmentUrls?: string[];
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceMatch {
  id: string;
  supplierId: string;
  invoiceId: string; // From Accounting
  orderId: string; // ServiceOrder ID
  orderAmount: number;
  invoiceAmount: number;
  variance: number;
  currency: string;
  matchStatus: InvoiceMatchStatus;
  varianceReason?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
