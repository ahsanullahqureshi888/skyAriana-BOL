/**
 * Fleet, Truck & Driver Operations Center Types
 * Sky Ariana Limited — Road Freight Logistics
 */

export type PlateCountry = 'AF' | 'IR' | 'PK' | 'TR' | 'AE' | 'UZ' | 'TM' | 'TJ' | 'OTHER'

export type TruckOwnership = 
  | 'OWNED'               // Company owned fleet
  | 'DEDICATED_CONTRACT' // Contracted exclusively
  | 'MARKET_HIRED'       // Spot market / single trip hire
  | 'INTERCHANGE'        // Cross-border carrier swap

export type TruckType = 
  | 'TRAILER_40FT'
  | 'TRAILER_20FT'
  | 'REEFER_TRUCK'
  | 'FLATBED'
  | 'LOWBOY'
  | 'CONTAINER_CHASSIS'
  | 'BOX_TRUCK'
  | 'TANKER'

export type TruckStatus = 
  | 'AVAILABLE'           // Ready for assignment
  | 'ASSIGNED'            // Booked for upcoming trip
  | 'ON_TRIP'             // Actively moving on road
  | 'BORDER_WAITING'      // Queued at border station
  | 'CUSTOMS_CLEARANCE'   // Inside customs inspection yard
  | 'TRANSLOADING'        // Unloading/transferring to second truck
  | 'UNLOADING'           // At consignee destination
  | 'RETURNING_EMPTY'     // Returning to depot/border
  | 'MAINTENANCE'         // Scheduled service/workshop
  | 'BROKEN_DOWN'         // Breakdown on route
  | 'INACTIVE'            // Decommissioned or suspended

export interface TruckRecord {
  id: string
  truckCode: string               // e.g. "TRK-AF-012"
  plateNumber: string             // e.g. "2877"
  plateCountry: PlateCountry      // 'AF' | 'IR' | 'PK' etc.
  plateProvince?: string          // e.g. "Kabul", "Herat"
  plateLetter?: string            // e.g. "ل" (L)
  ownership: TruckOwnership
  truckType: TruckType
  makeModel?: string              // e.g. "Mercedes Actros 1844", "Volvo FH 500"
  yearOfManufacture?: number
  capacityTons: number            // e.g. 25
  maxCbm?: number                 // e.g. 85
  isReefer?: boolean
  reeferGensetUnit?: string       // e.g. "Thermo King SLXi 400"
  truckingCompanyId?: string      // Linked to Master Data Supplier/Carrier
  truckingCompanyName?: string    // e.g. "Ariana Afghan Transport Co."
  currentStatus: TruckStatus
  currentLocationName: string     // e.g. "Islam Qala Border Yard", "Kabul Customs Depot"
  currentBorderStation?: string   // e.g. "Islam Qala", "Torghundi", "Hairatan", "Spin Boldak"
  assignedDriverId?: string
  assignedDriverName?: string
  assignedTripId?: string
  assignedBolNumber?: string
  insuranceExpiry?: string        // ISO date
  roadPermitExpiry?: string       // Afghan MoPW / International CMR permit
  fitnessExpiry?: string
  gpsDeviceInstalled?: boolean
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type DriverStatus = 
  | 'ACTIVE'           // Ready for dispatch
  | 'ON_TRIP'          // Currently driving an active trip
  | 'RESTING'          // Mandatory rest / turnaround
  | 'BORDER_DELAYED'   // Held at border customs/immigration
  | 'ON_LEAVE'         // Vacation or medical leave
  | 'SUSPENDED'        // Safety or compliance hold
  | 'INACTIVE'         // Former driver

export interface DriverRecord {
  id: string
  driverCode: string              // e.g. "DRV-0089"
  fullName: string                // e.g. "Ahmadullah Niazi"
  fatherName: string              // e.g. "Ghulam Sakhi" (Crucial for Afghan ID / border manifest)
  nationalIdTazkira?: string      // Afghan Electronic / Paper Tazkira No.
  passportNumber?: string         // International passport (for Iran/Pakistan crossings)
  passportExpiry?: string
  licenseNumber: string           // Heavy vehicle license
  licenseType: string             // e.g. "Class 1 Heavy Trailer (درجه یک)"
  licenseExpiry?: string
  primaryPhone: string            // Afghan or regional SIM (+93 79 123 4567)
  secondaryPhone?: string         // WhatsApp or international SIM (e.g. +98 Iran SIM)
  emergencyContact?: string       // Name and phone
  country: string                 // "AF", "IR", "PK"
  city?: string                   // "Herat", "Kabul", "Mashhad"
  languagesSpoken?: string[]      // ["Dari", "Pashto", "Persian", "Urdu"]
  borderCrossingsHandled?: string[] // ["Islam Qala", "Torghundi", "Hairatan", "Dogharoon"]
  isCompanyEmployee: boolean      // true = direct payroll, false = owner-operator / third-party
  truckingCompanyId?: string
  truckingCompanyName?: string
  currentStatus: DriverStatus
  currentLocationName: string
  assignedTruckId?: string
  assignedTruckPlate?: string
  currentTripId?: string
  safetyRating?: number           // 1 to 5 stars
  verified: boolean
  hidePrivateDocsFromCustomer: boolean // STRICT PRIVACY: scrub Tazkira, Passport & Phone from customer views
  notes?: string
  createdAt: string
  updatedAt: string
}

export type RoadTripStatus = 
  | 'SCHEDULED'            // Planned, awaiting departure
  | 'DISPATCHED'           // Driver dispatched to pickup point
  | 'EN_ROUTE_ORIGIN'      // Moving towards loading point
  | 'LOADING'              // Loading cargo or stuffing container
  | 'IN_TRANSIT'           // Moving on road between cities
  | 'AT_BORDER'            // Waiting at international border terminal
  | 'BORDER_CLEARANCE'     // Undergoing customs inspection / doc processing
  | 'TRANSLOADING'         // Transferring cargo from one truck to another
  | 'EN_ROUTE_DESTINATION' // In transit inside destination country
  | 'DELIVERED'            // Cargo handed over to consignee
  | 'POD_PENDING'          // Delivered, awaiting signed receipt
  | 'COMPLETED'            // POD uploaded and trip closed
  | 'CANCELLED'            // Cancelled before dispatch
  | 'BROKEN_DOWN'          // Truck broken down on route

export interface TransloadEvent {
  id: string
  tripId: string
  shipmentId?: string
  transloadLocation: string       // e.g. "Islam Qala Transshipment Yard", "Dogharoon Border Terminal"
  transloadDate: string           // ISO date
  oldTruckId: string
  oldTruckPlate: string
  oldDriverId: string
  oldDriverName: string
  oldDriverFatherName?: string
  newTruckId: string
  newTruckPlate: string
  newDriverId: string
  newDriverName: string
  newDriverFatherName?: string
  sealNumberBefore: string        // Origin container/truck seal
  sealNumberAfter: string         // Newly applied security seal
  cargoCondition: 'INTACT_SOUND' | 'DAMAGED_CARTONS' | 'SEAL_BROKEN_INSPECTED' | 'DISCREPANCY_NOTED'
  tallyCartonsCount: number       // Counted during transloading
  remarks?: string
  recordedBy: string
  createdAt: string
}

export interface BreakdownEvent {
  id: string
  tripId: string
  truckId: string
  truckPlate: string
  driverId: string
  driverName: string
  breakdownLocation: string       // e.g. "Kabul-Kandahar Highway KM 145 (Ghazni Pass)"
  breakdownTime: string           // ISO string
  issueDescription: string        // e.g. "Turbocharger failure & coolant hose burst"
  severity: 'MINOR_ROADSIDE' | 'MODERATE_TOWING_REQUIRED' | 'CRITICAL_ENGINE_FAILURE'
  status: 
    | 'REPORTED'
    | 'ASSISTANCE_DISPATCHED'
    | 'UNDER_REPAIR'
    | 'REPAIRED_RESUMED'
    | 'CARGO_TRANSFERRED'
  mechanicDispatched?: boolean
  mechanicDetails?: string
  reliefTruckDispatched?: boolean
  reliefTruckId?: string
  reliefTruckPlate?: string
  resumedAt?: string
  repairCost?: number
  currency?: 'AFN' | 'USD' | 'IRR' | 'PKR'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PodRecord {
  id: string
  tripId: string
  shipmentId?: string
  bolNumber: string
  receiverName: string            // Consignee receiver / warehouse supervisor
  receiverPhone?: string
  deliveryDate: string            // ISO date
  deliveryLocation: string
  receivedCartons: number
  damagedCartons: number
  shortageCartons: number
  sealIntactOnArrival: boolean
  remarks?: string
  signatureRecorded: boolean
  photoUris?: string[]            // Stamped physical POD photos
  verifiedBy: string
  createdAt: string
}

export type TripExpenseCategory = 
  | 'FUEL'
  | 'TOLL_ROAD'
  | 'BORDER_CLEARANCE_FEE'
  | 'DRIVER_ALLOWANCE'
  | 'DRIVER_ADVANCE'
  | 'WEIGHBRIDGE'
  | 'ESCORT_SECURITY'
  | 'REPAIR_MAINTENANCE'
  | 'PARKING_DEPOT'
  | 'OTHER'

export interface TripExpenseLine {
  id: string
  tripId: string
  category: TripExpenseCategory
  description: string
  amount: number
  currency: 'AFN' | 'USD' | 'IRR' | 'PKR'
  receiptNumber?: string
  date: string
  paymentStatus: 'ADVANCED' | 'REIMBURSED' | 'PENDING' | 'DEDUCTED_FROM_RENT'
  accountingTransactionId?: string // Linked central ledger transaction reference
  notes?: string
}

export interface RoadTripRecord {
  id: string
  tripNumber: string              // e.g. "TRP-2026-0034"
  shipmentId?: string             // Linked shipment ID
  bolNumber: string               // Associated Bill of Lading
  legIndex: number                // 1 for first leg, 2 for onward transload leg
  originLocationName: string      // e.g. "Islam Qala Border Terminal"
  destinationLocationName: string // e.g. "Kabul Customs Depot (ACCS)"
  borderStation?: string          // e.g. "Islam Qala / Dogharoon"
  plannedDepartureDate: string
  actualDepartureDate?: string
  estimatedArrivalDate: string
  actualArrivalDate?: string
  
  // Current active vehicle & driver
  truckId: string
  truckPlate: string
  truckCountry: PlateCountry
  driverId: string
  driverName: string
  driverFatherName?: string
  driverPhone: string
  
  // Financial terms (Strictly internal, never sent to customers)
  agreedDriverRent: number
  currency: 'AFN' | 'USD' | 'IRR' | 'PKR'
  advancePaid: number
  balancePayable: number
  
  status: RoadTripStatus
  currentLocationName: string
  
  // History collections
  transloadHistory: TransloadEvent[]
  breakdownHistory: BreakdownEvent[]
  expenses: TripExpenseLine[]
  pod?: PodRecord
  
  internalNotes?: string
  customerSafeNotes?: string
  createdAt: string
  updatedAt: string
}

export interface FleetSummaryKpi {
  totalTrucks: number
  availableTrucks: number
  onTripTrucks: number
  atBorderTrucks: number
  maintenanceTrucks: number
  totalDrivers: number
  activeDrivers: number
  activeTrips: number
  pendingPodCount: number
}
