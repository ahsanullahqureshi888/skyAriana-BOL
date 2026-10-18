/**
 * Warehouse, Cargo & Loading Control Center Types
 * Sky Ariana Limited — Physical Logistics & Cargo Handling
 */

export type WarehouseType =
  | 'REGIONAL_HUB'           // e.g. Kandahar Central Hub
  | 'BORDER_TERMINAL'        // e.g. Islam Qala Border Depot
  | 'PORT_CONTAINER_YARD'    // e.g. Bandar Abbas Terminal Yard
  | 'CUSTOMER_DEPOT'         // Consignee or Shipper factory warehouse
  | 'COLD_STORAGE'           // Reefer & perishable warehouse
  | 'THIRD_PARTY_FACILITY'   // Contracted commercial warehouse

export interface WarehouseStorageArea {
  id: string
  warehouseLocationId: string
  name: string                 // e.g. "Zone A - Dried Fruit Storage"
  zoneCode: string             // e.g. "ZA"
  aisle?: string               // e.g. "01"
  rack?: string                // e.g. "04"
  bay?: string                 // e.g. "B"
  position?: string            // e.g. "P-12"
  isReeferControlled?: boolean
  targetTemperature?: number   // in Celsius, e.g. -18 or +4
  currentCapacityUnits?: number
  maxCapacityUnits?: number
}

export type PackageType =
  | 'CTNS'
  | 'BAGS'
  | 'PALLETS'
  | 'BOXES'
  | 'CRATES'
  | 'SACKS'
  | 'DRUMS'
  | 'BUNDLES'
  | 'PIECES'
  | 'OTHER'

export type CargoCondition =
  | 'GOOD'
  | 'DAMAGED'
  | 'WET'
  | 'TORN_PACKAGING'
  | 'SHORT'
  | 'EXCESS'
  | 'REPACKING_REQUIRED'
  | 'OTHER'

export type CargoLotStatus =
  | 'RECEIVED'            // Freshly received, not yet shelved
  | 'IN_STORAGE'          // Shelved in warehouse area
  | 'UNALLOCATED'         // Free for allocation
  | 'ALLOCATED'           // Soft-reserved to a Shipment/BOL
  | 'READY_FOR_LOADING'   // Staged at loading dock
  | 'PARTIALLY_LOADED'    // Portions packed into truck/container
  | 'FULLY_LOADED'        // 100% loaded into transport equipment
  | 'DISPATCHED'          // Truck/container departed warehouse
  | 'ON_HOLD'             // Operational or document freeze
  | 'DAMAGED'             // Quarantine pending review
  | 'REPACKING'           // In repacking process
  | 'COMPLETED'           // All physical stock fulfilled & closed

export interface ReceivingChecklist {
  countVerified: boolean
  weightVerified: boolean
  cargoConditionChecked: boolean
  marksChecked: boolean
  documentsReceived: boolean
  storageAssigned: boolean
}

export interface WarehouseReceiptRecord {
  id: string
  receiptNumber: string           // e.g. "WHR-2026-00125"
  receivedDate: string            // ISO string
  warehouseLocationId: string     // Linked to Location Master
  warehouseName: string           // e.g. "Kandahar Central Export Hub"
  customerId?: string             // Linked to CRM/Account
  customerName: string            // e.g. "Haji Abdul Wase Khan Alokozay"
  shipperName: string             // e.g. "Alokozay Dried Fruits Processing Ltd."
  deliveringParty?: string        // Transporter or farm cooperative
  deliveringTruckPlate?: string   // Vehicle plate
  deliveringDriverName?: string
  deliveringDriverPhone?: string
  commodity: string               // e.g. "Afghan Green Raisins (Kishmish)"
  totalPackages: number           // e.g. 1427
  packageType: PackageType
  totalGrossWeightKg: number      // e.g. 23545.5
  totalNetWeightKg: number        // e.g. 22832.0
  condition: CargoCondition
  storageAreaName?: string        // e.g. "Zone A, Rack 2"
  linkedShipmentId?: string       // Optional link to active shipment
  linkedBolNumber?: string        // Optional link to existing BOL (can arrive before BOL!)
  checklist: ReceivingChecklist
  internalNotes?: string
  customerSafeNotes?: string
  createdAt: string
  updatedAt: string
}

export interface CargoLotRecord {
  id: string
  lotNumber: string               // e.g. "LOT-2026-0412"
  receiptId: string               // Linked receipt
  receiptNumber: string
  customerId: string
  customerName: string
  commodity: string               // e.g. "Green Raisins Grade A"
  packageType: PackageType
  receivedQuantity: number        // Exact original received units (e.g. 1427)
  reservedQuantity: number        // Soft-allocated to shipments (e.g. 1427)
  loadedQuantity: number          // Physically loaded so far (e.g. 800)
  remainingQuantity: number       // Physically in warehouse = received - loaded ± adjustments
  availableQuantity: number       // Available to allocate = received - reserved ± adjustments
  unitNetWeightKg: number         // e.g. 16.0 kg
  unitGrossWeightKg: number       // e.g. 16.5 kg
  packagingTareWeightKg: number   // e.g. 0.5 kg per carton
  calculatedNetWeightKg: number   // receivedQuantity * unitNetWeightKg
  calculatedGrossWeightKg: number // receivedQuantity * unitGrossWeightKg
  actualMeasuredGrossWeightKg?: number // Scale weighbridge measurement
  cargoMarks: string              // e.g. "LG / RICHVALLY / PRODUCT OF AFGHANISTAN"
  batchNumber?: string            // e.g. "BATCH-GR-2026-09"
  productionDate?: string
  expiryDate?: string
  condition: CargoCondition
  warehouseLocationId: string
  warehouseAreaId?: string
  warehousePosition?: string      // e.g. "Aisle 2, Bay 4"
  status: CargoLotStatus
  onHold: boolean
  holdQuantity?: number
  holdReason?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type StockMovementType =
  | 'RECEIPT'            // Initial physical cargo intake
  | 'TRANSFER'           // Moved between warehouses or zones
  | 'ALLOCATION'         // Soft reservation to shipment
  | 'DEALLOCATION'       // Released reservation
  | 'LOAD'               // Physically loaded into truck/container
  | 'UNLOAD'             // Destuffed/unloaded back into warehouse
  | 'REPACK'             // Repacked damaged cartons
  | 'ADJUSTMENT'         // Authorized inventory count correction
  | 'DISPATCH'           // Departed warehouse premises
  | 'RETURN'             // Returned from transit

export interface StockMovementRecord {
  id: string
  cargoLotId: string
  lotNumber: string
  receiptNumber: string
  movementType: StockMovementType
  quantity: number                // Delta count (+1427, -800, etc.)
  netWeightKg: number
  grossWeightKg: number
  fromLocation: string            // e.g. "Receiving Dock 1" or "Zone A Rack 2"
  toLocation: string              // e.g. "Zone A Rack 2" or "Container MSCU1234567"
  relatedShipmentId?: string
  relatedBolNumber?: string
  relatedTruckId?: string
  relatedTruckPlate?: string
  relatedContainerNumber?: string
  timestamp: string               // ISO string
  performedBy: string
  reason?: string
  notes?: string
}

export interface DamageReportRecord {
  id: string
  cargoLotId: string
  lotNumber: string
  packagesAffected: number
  damageType: 'TORN_CARTONS' | 'WATER_MOISTURE' | 'CRUSHED_BOXES' | 'INFESTATION' | 'SEAL_BROKEN' | 'OTHER'
  description: string
  reportedDate: string
  warehouseLocationId: string
  reportedBy: string
  photoUris?: string[]
  status: 'REPORTED' | 'UNDER_REVIEW' | 'REPACK_SCHEDULED' | 'ADJUSTED_RESOLVED'
  resolutionNotes?: string
  createdAt: string
}

export interface RepackingRecord {
  id: string
  cargoLotId: string
  lotNumber: string
  originalPackages: number        // e.g. 25 damaged cartons
  newPackages: number             // e.g. 25 new sound cartons
  newPackageType: PackageType
  weightDifferenceKg: number      // e.g. -2.5 kg loss
  packagingMaterialsUsed: string  // e.g. "25 heavy 5-ply corrugated export cartons with liners"
  reason: string
  performedBy: string
  date: string
  notes?: string
}

export interface LoadingPlanAllocatedLot {
  cargoLotId: string
  lotNumber: string
  commodity: string
  packageType: PackageType
  plannedPackages: number
  plannedGrossWeightKg: number
  plannedNetWeightKg: number
  cargoMarks: string
}

export interface LoadingPlanRecord {
  id: string
  planNumber: string              // e.g. "LP-2026-0089"
  shipmentId?: string
  bolNumber: string               // e.g. "BOL-2026-0041"
  containerNumber?: string        // e.g. "MSKU9981240"
  containerType?: string          // e.g. "40 HC"
  truckPlate?: string             // e.g. "2877 کابل"
  plannedPackages: number
  plannedGrossWeightKg: number
  plannedNetWeightKg: number
  loadingLocation: string         // e.g. "Kandahar Central Export Hub Dock 2"
  plannedDate: string
  supervisorName: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  allocatedLots: LoadingPlanAllocatedLot[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LoadedLotSessionDetail {
  cargoLotId: string
  lotNumber: string
  packagesLoaded: number
  grossWeightLoadedKg: number
  netWeightLoadedKg: number
}

export interface LoadingSessionRecord {
  id: string
  loadingPlanId: string
  planNumber: string
  shipmentId?: string
  bolNumber: string
  containerNumber?: string
  truckPlate?: string
  startedAt: string
  completedAt?: string
  supervisorName: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  loadedLots: LoadedLotSessionDetail[]
  totalPackagesLoaded: number
  totalGrossWeightLoadedKg: number
  sealNumber?: string             // Security bolt seal applied upon completion
  vgmWeightKg?: number            // Verified Gross Mass
  discrepancyType?: 'NONE' | 'SHORTAGE' | 'EXCESS' | 'WEIGHT_VARIANCE' | 'DAMAGED_DURING_LOADING'
  discrepancyDetails?: string
  notes?: string
}

export interface DispatchEventRecord {
  id: string
  dispatchNumber: string          // e.g. "DSP-2026-0078"
  dispatchDate: string
  shipmentId?: string
  bolNumber: string
  warehouseLocationId: string
  warehouseName: string
  truckPlate: string
  driverName: string
  driverPhone?: string
  containerNumber?: string
  sealNumber?: string
  packagesDispatched: number
  grossWeightKg: number
  destination: string
  documentsHandedOver: string[]   // ["CMR", "BOL Copy", "Weighbridge Slip", "Packing List"]
  releasedBy: string
  notes?: string
}

export interface DataConsistencyReport {
  shipmentId: string
  bolNumber: string
  warehousePackages: number
  packingListPackages: number
  bolPackages: number
  invoicePackages: number
  warehouseGrossWeightKg: number
  packingListGrossWeightKg: number
  bolGrossWeightKg: number
  invoiceGrossWeightKg: number
  packageMatches: boolean
  weightMatches: boolean
  packageDiscrepancy: number
  weightDiscrepancyKg: number
  notes: string
}

export interface WarehouseSummaryKpi {
  totalCargoInWarehouse: number
  receivedTodayCount: number
  awaitingAllocationCount: number
  readyForLoadingCount: number
  loadingTodayCount: number
  partiallyLoadedCount: number
  fullyLoadedCount: number
  damagedCargoCount: number
  shortageIssuesCount: number
  dispatchedTodayCount: number
}
