/**
 * Route & Location Master Types
 * Defines the canonical geographic and routing data model for Sky Ariana Limited.
 * Separates "WHERE" (locations, routes, legs) from "WHO" (companies, contacts, carriers).
 */

export type LocationType =
  | 'COUNTRY'
  | 'CITY'
  | 'BORDER'
  | 'CUSTOMS_POINT'
  | 'PORT'
  | 'SEAPORT'
  | 'DRY_PORT'
  | 'TERMINAL'
  | 'AIRPORT'
  | 'WAREHOUSE'
  | 'DEPOT'
  | 'FACTORY'
  | 'CUSTOMER_LOCATION'
  | 'RAIL_TERMINAL'
  | 'CHECKPOINT'
  | 'TRANSSHIPMENT_PORT'
  | 'OTHER'

export type LocationStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW'

export interface Coordinates {
  lat: number
  lng: number
}

export interface BorderCrossingInfo {
  sideACountry: string // e.g. "AF"
  sideAName: string    // e.g. "Islam Qala"
  sideBCountry: string // e.g. "IR"
  sideBName: string    // e.g. "Dogharoon"
  clearanceTypes: Array<'COMMERCIAL' | 'TRANSIT' | 'PASSENGER'>
  operatingHours?: string
  bottleneckNotes?: string
  roadConditions?: string
}

export interface PortTerminalInfo {
  terminalName: string
  code?: string
  draftMeters?: number
  maxVesselSize?: string
  containerHandling: boolean
  operatorName?: string
}

export interface SeaportInfo {
  unlocode: string // e.g. "IRBND"
  terminals: PortTerminalInfo[]
  seaCorridorNotes?: string
  customsTerminalCode?: string
}

export interface AirportInfo {
  iataCode: string // e.g. "KBL"
  icaoCode?: string // e.g. "OAKB"
  cargoFacility: boolean
  customsPointAvailable: boolean
}

export interface DepotInfo {
  storageType?: 'CONTAINER_YARD' | 'BONDED_WAREHOUSE' | 'COLD_STORAGE' | 'GENERAL'
  customsApproved?: boolean
  capacityTeu?: number
}

export interface LocationRecord {
  id: string
  code?: string // Custom internal reference code or UN/LOCODE/IATA
  name: string // Canonical English Name, e.g. "Bandar Abbas"
  nativeName?: string // Pashto / Dari / Arabic / Local, e.g. "بندر عباس"
  unlocode?: string // e.g. "IRBND"
  iataCode?: string // e.g. "KBL"
  icaoCode?: string // e.g. "OAKB"
  customsCode?: string
  type: LocationType
  status: LocationStatus
  countryCode: string // ISO 2-letter, e.g. "AF", "IR", "AE"
  countryName: string // e.g. "Afghanistan", "Iran", "United Arab Emirates"
  provinceState?: string // e.g. "Herat", "Hormozgan", "Dubai"
  coordinates?: Coordinates
  timezone: string // IANA timezone, e.g. "Asia/Kabul", "Asia/Tehran", "Asia/Dubai"
  aliases: string[] // Known variations e.g. ["BandarAbbas", "Bandar-e-Abbas", "BND"]
  isHub?: boolean // Major transit hub
  parentLocationId?: string // If this is a terminal under a Port or ICD under a City
  
  borderInfo?: BorderCrossingInfo
  seaportInfo?: SeaportInfo
  airportInfo?: AirportInfo
  depotInfo?: DepotInfo
  
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * Historical snapshot preserved inside BOLs, Shipments, and Invoices.
 * Invariant: Updating a master location name never silently alters historical legal documents.
 */
export interface LocationSnapshot {
  locationId?: string
  canonicalName: string
  unlocode?: string
  iataCode?: string
  countryCode: string
  countryName: string
  type: LocationType
  timezone: string
  displayText: string // Preserves exact raw text at the time document was drafted
  snapshotDate: string
}

export type TransportMode = 'TRUCK' | 'SEA' | 'AIR' | 'RAIL' | 'MULTIMODAL'

export interface RouteLeg {
  id: string
  legOrder: number
  fromLocationId: string
  fromLocationSnapshot: LocationSnapshot
  toLocationId: string
  toLocationSnapshot: LocationSnapshot
  mode: TransportMode
  minDays: number
  maxDays: number
  avgDays: number
  distanceKm?: number
  borderCrossingId?: string
  notes?: string
}

export interface RouteMaster {
  id: string
  code: string // e.g. "RT-BND-ISL-KBL"
  name: string // e.g. "Bandar Abbas to Kabul via Islam Qala"
  namePersian?: string // e.g. "بندر عباس به کابل از طریق اسلام قلعه"
  originId: string
  originSnapshot: LocationSnapshot
  destinationId: string
  destinationSnapshot: LocationSnapshot
  transitMode: TransportMode
  legs: RouteLeg[]
  totalMinDays: number
  totalMaxDays: number
  totalAvgDays: number
  totalDistanceKm: number
  isActive: boolean
  version: number
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * Route Snapshot attached to active shipments and BOL records.
 * Invariant: Master route changes do not mutate historical or active shipments without user consent.
 */
export interface RouteSnapshot {
  routeId: string
  routeCode: string
  routeName: string
  version: number
  transitMode: TransportMode
  legs: RouteLeg[]
  totalMinDays: number
  totalMaxDays: number
  totalAvgDays: number
  totalDistanceKm: number
  frozenAt: string
}

export interface LocationMigrationCandidate {
  rawText: string
  fieldName: string // e.g. "port_of_loading", "port_of_discharge", "place_of_delivery"
  occurrences: number
  matchedLocationId?: string
  matchedLocationName?: string
  matchConfidence: 'EXACT' | 'ALIAS' | 'FUZZY' | 'UNMATCHED'
  sampleDocumentIds: string[]
}

export interface LocationQualityAudit {
  totalLocations: number
  missingTimezone: number
  missingUnlocode: number // For Ports/Seaports
  missingIata: number // For Airports
  duplicateCandidates: Array<{
    name1: string
    id1: string
    name2: string
    id2: string
    reason: string
  }>
  unlinkedHistoricalTextCount: number
}
