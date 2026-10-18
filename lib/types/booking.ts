export type BookingStatus = 
  | "DRAFT"
  | "REQUESTED"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "AMENDMENT_REQUESTED"
  | "AMENDED"
  | "CANCELLED"
  | "EMPTY_RELEASED"
  | "EMPTY_PICKED_UP"
  | "STUFFED"
  | "GATE_IN"
  | "VESSEL_CONFIRMED"
  | "LOADED"
  | "SAILED"
  | "COMPLETED"

export type ContainerType = 
  | "20 GP" | "40 GP" | "40 HC" | "40 RF" | "20 RF" | "Open Top" | "Flat Rack" | "Other"

export type ContainerOwnerType = "SOC" | "COC"

export type VGMStatus = 
  | "Not Required"
  | "Pending"
  | "Ready"
  | "Submitted"
  | "Accepted"
  | "Rejected"

export type ContainerStatus = 
  | "Pending"
  | "Empty Released"
  | "Empty Picked Up"
  | "Stuffed"
  | "VGM Ready"
  | "Gate-In"
  | "Loaded on Vessel"
  | "In Transit"
  | "Transshipment Arrival"
  | "Destination Arrival"
  | "Discharged"
  | "Delivered"
  | "Empty Returned"
  | "Completed"

export interface ShippingLine {
  id: string
  name: string
  shortCode: string
  contact: string
  email: string
  phone: string
  website?: string
  notes?: string
  active: boolean
}

export interface TransportLeg {
  id: string
  legOrder: number
  mode: "ocean" | "road" | "air" | "rail"
  origin: string
  destination: string
  carrierId?: string // ShippingLine ID
  bookingNumber?: string
  vessel?: string
  voyage?: string
  etd?: string // ISO date
  eta?: string // ISO date
  actualDeparture?: string
  actualArrival?: string
  status: "Pending" | "Active" | "Completed" | "Rolled Over" | "Cancelled"
}

export interface CutOffs {
  documentation?: string
  vgm?: string
  gateIn?: string
  port?: string
  si?: string
}

export interface BookingMaster {
  id: string
  bookingNumber: string
  bookingDate: string
  shippingLineId: string
  customerId?: string // Link to CRM/Accounts
  shipper: string
  linkedBolIds: string[] // Array of BOL IDs
  pol: string
  pod: string
  finalDestination: string
  containerType: ContainerType | string
  containerQuantity: number
  commodity: string
  grossWeight: string
  etd: string
  eta: string
  vessel: string
  voyage: string
  status: BookingStatus
  transportLegs: TransportLeg[]
  cutOffs: CutOffs
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FreeDaysConfig {
  detentionFreeDays: number
  demurrageFreeDays: number
  combinedFreeDays: number
  startDateRule: "Discharge Date" | "Availability Date" | "Actual Arrival" | "Custom Start Date"
  customStartDate?: string
  detentionTariff?: Array<{ daysStart: number, daysEnd: number | null, rate: number, currency: string }>
}

export interface ContainerLifecycle {
  id: string
  containerNumber: string
  containerType: ContainerType | string
  ownerType: ContainerOwnerType
  shippingLineId: string
  bookingId: string
  bolId?: string
  sealNumbers: string[] // Can have Shipping Line, Customs, Shipper seals
  
  // Lifecycle Dates (ISO Strings)
  emptyReleaseDate?: string
  emptyPickupDate?: string
  stuffingDate?: string
  gateInDate?: string
  loadedDate?: string
  dischargeDate?: string
  deliveryDate?: string
  emptyReturnDate?: string

  // Condition & Details
  emptyPickupDepot?: string
  emptyReturnDepot?: string
  condition?: "Good" | "Damaged" | "Needs Inspection"
  
  // VGM
  vgmWeight?: string
  vgmUnit?: "KG" | "LBS"
  vgmMethod?: "Method 1" | "Method 2"
  vgmStatus: VGMStatus
  
  status: ContainerStatus
  freeDaysConfig?: FreeDaysConfig
  
  createdAt: string
  updatedAt: string
}

export interface ContainerEvent {
  id: string
  containerId: string
  bookingId: string
  eventType: string
  description: string
  location?: string
  date: string
  userId?: string
}
