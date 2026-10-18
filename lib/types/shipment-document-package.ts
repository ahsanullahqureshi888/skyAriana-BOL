import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"

export type ShipmentDocumentType =
  | "commercial_invoice"
  | "packing_list"
  | "stickers"
  | "transit_paper"
  | "phytosanitary"
  | "bol_summary"

export type ShipmentDocumentStatus =
  | "not_created"
  | "draft"
  | "incomplete"
  | "ready"
  | "approved"
  | "issued"
  | "revised"
  | "void"

export type InvoiceRateBasis =
  | "PER_KG"
  | "PER_CARTON"
  | "PER_BAG"
  | "PER_UNIT"
  | "LUMP_SUM"

export interface ShipmentItem {
  id: string
  bolId: string
  commodityName: string
  hsCode: string
  marks?: string
  packageType: string
  packageCount: number
  unitWeight: number
  unitWeightUnit: "KG" | "LBS" | "MT"
  netWeight: number
  grossWeight: number
  quantity: number
  quantityUnit: string
  invoiceRate: number
  invoiceRateBasis: InvoiceRateBasis
  invoiceValue: number
  currency: string
  originCountry: string
  remarks?: string
}

export interface CommercialInvoiceData {
  invoiceNumber: string
  invoiceDate: string
  exporterName: string
  exporterAddress: string
  exporterPhone?: string
  exporterLicence?: string
  exporterTaxId?: string
  buyerName: string
  buyerAddress: string
  buyerPhone?: string
  buyerTaxId?: string
  buyerFssai?: string
  notifyParty?: string
  notifyPartyAddress?: string
  bolNumber: string
  containerNumbers: string
  sealNumbers: string
  items: ShipmentItem[]
  totalPackages: number
  packageType: string
  totalNetWeight: number
  totalGrossWeight: number
  totalGoodsValue: number
  currency: string
  incoterms: string
  originCountry: string
  destinationCountry: string
  portOfLoading: string
  portOfDischarge: string
  finalDestination: string
  paymentTerms?: string
  bankDetails?: string
  remarks?: string
  signatureDate?: string
  signedBy?: string
}

export interface PackingListData {
  packingListNumber: string
  packingListDate: string
  invoiceNumber: string
  bolNumber: string
  exporterName: string
  exporterAddress: string
  consigneeName: string
  consigneeAddress: string
  notifyParty?: string
  notifyPartyAddress?: string
  containerNumbers: string
  sealNumbers: string
  items: ShipmentItem[]
  totalPackages: number
  packageType: string
  totalNetWeight: number
  totalGrossWeight: number
  measurement?: string
  dimensions?: string
  originCountry: string
  destinationCountry: string
  portOfLoading: string
  portOfDischarge: string
  finalDestination: string
  driverName?: string
  driverFatherName?: string
  driverContact?: string
  truckNumber?: string
  remarks?: string
}

export interface StickerLabelData {
  bolNumber: string
  invoiceNumber: string
  shipperName: string
  consigneeName: string
  productName: string
  marksAndNumbers: string
  totalPackages: number
  packageType: string
  originCountry: string
  netWeightPerPackage: string
  grossWeightPerPackage: string
  lotNumber?: string
  expiryDate?: string
  packingDate?: string
  fssaiNumber?: string
  startNumber: number
  endNumber: number
  layout: "single" | "sheet"
}

export interface TransitPaperData {
  paperNumber: string
  issueDate: string
  bolNumber: string
  invoiceNumber: string
  shipperName: string
  consigneeName: string
  truckNumber: string
  driverName: string
  driverFatherName?: string
  driverContact?: string
  driverRent?: string
  driverRentCurrency?: string
  commodityDescription: string
  totalPackages: number
  packageType: string
  grossWeight: number
  netWeight: number
  originLocation: string
  transitBorderPoints: string[]
  routeDescription: string
  destinationLocation: string
  containerNumber?: string
  sealNumber?: string
  customsSealRequired?: boolean
  customsSealNote?: string
  remarks?: string
}

export interface PhytosanitaryCertificateDraftData {
  draftNumber: string
  creationDate: string
  bolNumber: string
  invoiceNumber?: string
  exporterName: string
  exporterAddress: string
  consigneeName: string
  consigneeAddress: string
  botanicalName?: string
  commercialDescription: string
  hsCode?: string
  totalPackages: number
  packageType: string
  netWeight: number
  grossWeight: number
  originCountry: string
  destinationCountry: string
  pointOfEntry?: string
  meansOfConveyance: string
  containerNumber?: string
  sealNumber?: string
  treatmentDate?: string
  treatmentType?: string
  chemicalActiveIngredient?: string
  durationAndTemperature?: string
  concentration?: string
  additionalDeclaration?: string
  isOfficialCertificateConfirmed: boolean
  officialCertificateNumber?: string
  officialIssueDate?: string
  inspectingAuthority?: string
  inspectorName?: string
  statusNotes: string
}

export type DocumentPayloadData =
  | CommercialInvoiceData
  | PackingListData
  | StickerLabelData
  | TransitPaperData
  | PhytosanitaryCertificateDraftData
  | Record<string, any>

export interface DocumentVersionRecord {
  id: string
  documentId: string
  versionNumber: number
  status: ShipmentDocumentStatus
  documentData: DocumentPayloadData
  sourceSnapshot: {
    bolData: Partial<BillOfLadingFormData>
    snapshotHash: string
    takenAt: string
  }
  changeReason?: string
  createdBy: string
  createdAt: string
  finalizedAt?: string
}

export interface DocumentAttachment {
  id: string
  documentId: string
  versionId?: string
  fileName: string
  fileType: string
  storagePath: string
  uploadedBy: string
  createdAt: string
  sourceType: "system_generated" | "uploaded_original"
}

export interface ShipmentDocumentRecord {
  id: string
  bolId: string
  bolNumber: string
  shipmentId: string
  documentType: ShipmentDocumentType
  documentNumber: string
  status: ShipmentDocumentStatus
  currentVersion: number
  required: boolean
  clientVisible: boolean
  clientDownloadable: boolean
  missingFields: string[]
  completenessScore: number // 0 - 100
  sourceDataChanged: boolean
  latestSourceHash: string
  documentData: DocumentPayloadData
  versions: DocumentVersionRecord[]
  attachments: DocumentAttachment[]
  printCount: number
  lastPrintedAt?: string
  lastPrintedBy?: string
  createdAt: string
  updatedAt: string
}

export interface ShipmentDocumentPackage {
  bolNumber: string
  shipmentId: string
  customerName: string
  destination: string
  containerNumbers: string
  truckNumber: string
  documentsReadyCount: number
  documentsTotalCount: number
  isPackageComplete: boolean
  missingSummary: Array<{
    documentType: ShipmentDocumentType
    missingFields: string[]
  }>
  documents: Record<ShipmentDocumentType, ShipmentDocumentRecord>
  updatedAt: string
}

export interface BulkDocumentCreationReport {
  bolsProcessed: number
  commercialInvoicesCreated: number
  packingListsCreated: number
  stickersCreated: number
  transitPapersCreated: number
  phytoDraftsCreated: number
  alreadyExistingCount: number
  incompleteCount: number
  errorsCount: number
  details: Array<{
    bolNumber: string
    status: "created" | "already_exists" | "incomplete" | "error"
    createdTypes: ShipmentDocumentType[]
    message?: string
  }>
}

export interface DocumentIntegrityIssue {
  bolNumber: string
  fieldName: string
  bolValue: string | number
  documentType: ShipmentDocumentType
  documentValue: string | number
  severity: "error" | "warning"
}
