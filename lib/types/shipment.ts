export type ShipmentStatus =
  | "draft"
  | "cargo_loaded"
  | "in_transit"
  | "at_border"
  | "customs_pending"
  | "at_port"
  | "container_loading"
  | "on_vessel"
  | "vessel_departed"
  | "transshipment"
  | "arrived_destination"
  | "customs_cleared"
  | "delivered"
  | "delayed"
  | "cancelled"

export interface PartyMaster {
  id: string
  name: string
  namePersian?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  fssaiNumber?: string
  licenceNumber?: string
  type?: "shipper" | "consignee" | "notify" | "agent" | "transporter"
}

export interface CargoMaster {
  commodity: string
  hsCode: string
  cartons: number
  packageType: string
  grossWeightKg: number
  netWeightKg: number
  volumeCbm?: number
  descriptionOfGoods: string
  ratePerKg?: number
  goodsValueUSD?: number
}

export interface ContainerMaster {
  containerNumber: string
  containerType: "20GP" | "40GP" | "40HC" | "40RF" | "20RF" | "LCL" | string
  sealNumber: string
  isReefer?: boolean
  temperatureSetting?: string
  pluggingDays?: number
  gensetRequired?: boolean
  escortServiceRequired?: boolean
}

export interface TruckMaster {
  driverName: string
  driverFatherName?: string
  driverPhone?: string
  afghanPlate?: string
  iranianPlate?: string
  turkishPlate?: string
  trailerNumber?: string
  driverRent?: number
  driverRentCurrency?: "USD" | "AFN"
}

export interface VesselMaster {
  vesselName: string
  voyageNumber: string
  bookingNumber: string
  shippingLine: string
  feederVessel?: string
  etd?: string
  eta?: string
}

export interface TransportRouteMaster {
  origin: string
  loadingPlace: string
  borderCrossing: string
  portOfLoading: string
  transshipmentPort?: string
  portOfDischarge: string
  finalDestination: string
  routeTemplateId?: string
  routeName?: string
  transportMode: "multimodal" | "road" | "sea" | "air"
}

export interface StatusMilestone {
  id: string
  location: string
  status: ShipmentStatus | string
  title: string
  description?: string
  timestamp: string
  estimatedDate?: string
  actualDate?: string
  delayReason?: string
  updatedBy: string
  completed: boolean
}

export interface ShipmentFinance {
  freightAmount: number
  currency: "USD" | "AFN" | "AED" | "EUR" | "IRR"
  customerAmount: number
  amountReceived: number
  customerOutstanding: number
  supplierCost: number
  amountPaid: number
  supplierOutstanding: number
  portCharges: number
  detentionCost: number
  demurrageCost: number
  documentationFee: number
  truckFreight: number
  customsFee: number
  otherCosts: number
  profitOrLoss: number
}

export interface DocumentSnapshotItem {
  id: string
  documentType:
    | "bol"
    | "commercial_invoice"
    | "packing_list"
    | "stickers"
    | "transit_paper"
    | "phytosanitary"
    | "customs"
    | "other"
  documentNumber: string
  version: number
  status: "draft" | "reviewed" | "approved" | "final" | "surrendered" | "cancelled"
  pdfUrl?: string | null
  generatedAt: string
  generatedBy?: string
  snapshotData: Record<string, any>
}

export interface ShipmentAttachment {
  id: string
  category:
    | "BOL"
    | "Invoice"
    | "Packing List"
    | "Transit Paper"
    | "Phytosanitary"
    | "Customs"
    | "Driver"
    | "Truck"
    | "Container"
    | "Port"
    | "Customer"
    | "Other"
  fileName: string
  fileSize?: number
  fileUrl: string
  uploadedAt: string
  uploadedBy: string
}

export interface ShipmentAuditEntry {
  id: string
  timestamp: string
  user: string
  field: string
  oldValue: any
  newValue: any
  actionDescription: string
}

export interface ShipmentMaster {
  id: string // e.g. "SA-SHP-2026-0001"
  referenceNumber: string
  status: ShipmentStatus
  currentLocation: string
  nextDestination: string
  eta?: string
  delayReason?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  lastUpdatedBy: string

  // Relational Entities
  shipper: PartyMaster
  consignee: PartyMaster
  notifyParty?: PartyMaster

  cargo: CargoMaster
  transport: TransportRouteMaster
  container: ContainerMaster
  truck: TruckMaster
  vessel: VesselMaster

  // Finance
  finance: ShipmentFinance

  // Documents & Snapshots
  documents: DocumentSnapshotItem[]
  attachments: ShipmentAttachment[]

  // Milestones & Tracking History
  milestones: StatusMilestone[]

  // Non-destructive Audit Trail
  auditLog: ShipmentAuditEntry[]
}

export interface DocumentMismatchAlert {
  field: string
  label: string
  expectedValue: string
  actualValue: string
  documentA: string
  documentB: string
  severity: "error" | "warning"
}
