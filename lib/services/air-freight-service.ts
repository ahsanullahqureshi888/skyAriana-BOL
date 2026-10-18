/**
 * Phase 23: Air Freight & AWB Operations Center Service
 * Central stateful engine for air-cargo logistics across Sky Ariana Limited.
 * Strictly adheres to lib/types/air-freight.ts and core project rules:
 * - No fake live radar / ADS-B flight tracking.
 * - No automatic cargo loading upon flight departure.
 * - No automatic cargo discharge upon flight landing.
 * - Non-destructive flight rebooking preserving historical flight legs.
 * - 3-Way release separation (Airline != Customs != Terminal).
 * - Airline buy rates, margins, and private notes scrubbed from customer communications.
 * - Volumetric weight calculation with configurable IATA divisor (default 6000, express 5000).
 */

import {
  AirlineRecord,
  CargoTerminalRecord,
  AirBookingRecord,
  FlightRecord,
  AirLegRecord,
  TransitConnection,
  ULDRecord,
  OffloadRecord,
  MAWBRecord,
  HAWBRecord,
  CargoAcceptanceRecord,
  AirReleaseTracker,
  AirlineFinanceLink,
  AirShipmentBoardItem,
  AirSummaryKpi,
  DimensionItem,
  FlightStatus,
  OffloadReason,
} from '../types/air-freight'

export class AirFreightStore {
  private static instance: AirFreightStore

  private airlines: AirlineRecord[] = []
  private terminals: CargoTerminalRecord[] = []
  private bookings: AirBookingRecord[] = []
  private flights: FlightRecord[] = []
  private legs: AirLegRecord[] = []
  private ulds: ULDRecord[] = []
  private offloads: OffloadRecord[] = []
  private mawbs: MAWBRecord[] = []
  private hawbs: HAWBRecord[] = []
  private acceptances: CargoAcceptanceRecord[] = []
  private releases: AirReleaseTracker[] = []
  private financeLinks: AirlineFinanceLink[] = []

  private constructor() {
    this.seedInitialData()
  }

  public static getInstance(): AirFreightStore {
    if (!AirFreightStore.instance) {
      AirFreightStore.instance = new AirFreightStore()
    }
    return AirFreightStore.instance
  }

  // ==========================================
  // 1. Initial Seed Data
  // ==========================================
  private seedInitialData() {
    // 1. Airlines
    this.airlines = [
      {
        id: 'airl-fg',
        legalName: 'Kam Air Cargo',
        displayName: 'Kam Air',
        iataCode: 'FG',
        icaoCode: 'KMF',
        awbPrefix: '384',
        country: 'Afghanistan',
        bookingContact: 'cargo-booking@kamair.com | +93 79 974 4444',
        cargoContact: 'kbl-cargo@kamair.com | +93 70 028 1111',
        documentationContact: 'awb-helpdesk@kamair.com',
        accountsContact: 'finance-cargo@kamair.com',
        website: 'https://www.kamair.com/cargo',
        status: 'ACTIVE',
        notes: 'Primary domestic and Gulf regional carrier out of KBL and KDH',
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'airl-rq',
        legalName: 'Ariana Afghan Airlines Cargo',
        displayName: 'Ariana Afghan Airlines',
        iataCode: 'RQ',
        icaoCode: 'AFG',
        awbPrefix: '255',
        country: 'Afghanistan',
        bookingContact: 'cargo@flyariana.com | +93 20 231 4444',
        cargoContact: 'kbl.station@flyariana.com',
        documentationContact: 'docs@flyariana.com',
        accountsContact: 'revenue-acct@flyariana.com',
        website: 'https://www.flyariana.com',
        status: 'ACTIVE',
        notes: 'National flag carrier operating scheduled cargo flights to DEL, DXB, and IST',
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'airl-ek',
        legalName: 'Emirates SkyCargo',
        displayName: 'Emirates',
        iataCode: 'EK',
        icaoCode: 'UAE',
        awbPrefix: '176',
        country: 'United Arab Emirates',
        bookingContact: 'skycargo.dxb@emirates.com | +971 4 214 4444',
        cargoContact: 'skycargokbl@emirates.com',
        documentationContact: 'skycargodocs@emirates.com',
        accountsContact: 'settlements.skycargo@emirates.com',
        website: 'https://www.skycargo.com',
        status: 'ACTIVE',
        notes: 'Global widebody carrier connecting Afghanistan cargo via Dubai hub',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'airl-qr',
        legalName: 'Qatar Airways Cargo',
        displayName: 'Qatar Airways',
        iataCode: 'QR',
        icaoCode: 'QTR',
        awbPrefix: '157',
        country: 'Qatar',
        bookingContact: 'cargores@qatarairways.com.qa',
        cargoContact: 'dohcargoops@qatarairways.com.qa',
        documentationContact: 'awbqc@qatarairways.com.qa',
        accountsContact: 'financeservices@qatarairways.com.qa',
        website: 'https://www.qrcargo.com',
        status: 'ACTIVE',
        notes: 'Connecting cargo via Hamad International Airport hub',
        createdAt: '2026-01-20T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'airl-tk',
        legalName: 'Turkish Cargo',
        displayName: 'Turkish Airlines',
        iataCode: 'TK',
        icaoCode: 'THY',
        awbPrefix: '235',
        country: 'Turkey',
        bookingContact: 'cargo@thy.com | +90 212 463 6363',
        cargoContact: 'istcargoops@thy.com',
        documentationContact: 'awbist@thy.com',
        accountsContact: 'cargofinance@thy.com',
        website: 'https://www.turkishcargo.com.tr',
        status: 'ACTIVE',
        notes: 'Widebody freighter direct connections via Istanbul SmartIST Hub',
        createdAt: '2026-01-20T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'airl-fz',
        legalName: 'flydubai Cargo',
        displayName: 'flydubai',
        iataCode: 'FZ',
        icaoCode: 'FDB',
        awbPrefix: '141',
        country: 'United Arab Emirates',
        bookingContact: 'cargo@flydubai.com',
        cargoContact: 'kblops@flydubai.com',
        status: 'ACTIVE',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
    ]

    // 2. Terminals
    this.terminals = [
      {
        id: 'term-kbl-1',
        airportId: 'loc-kbl',
        airportIata: 'KBL',
        terminalName: 'Kabul International Cargo Complex',
        terminalCode: 'KBL-CGO-1',
        handlingAgentName: 'Ariana Ground Handling & GAAC',
        customsOnsite: true,
        coldStorageAvailable: true,
        dangerousGoodsCertified: true,
        operatingHours: '06:00 - 20:00 Daily',
      },
      {
        id: 'term-kdh-1',
        airportId: 'loc-kdh',
        airportIata: 'KDH',
        terminalName: 'Kandahar Air Cargo Terminal',
        terminalCode: 'KDH-CGO-1',
        handlingAgentName: 'Kam Ground Services',
        customsOnsite: true,
        coldStorageAvailable: true,
        dangerousGoodsCertified: false,
        operatingHours: '07:00 - 18:00 Daily',
      },
      {
        id: 'term-dxb-1',
        airportId: 'loc-dxb',
        airportIata: 'DXB',
        terminalName: 'Dnata Cargo Mega Terminal DXB',
        terminalCode: 'DXB-DNATA-1',
        handlingAgentName: 'Dnata Cargo',
        customsOnsite: true,
        coldStorageAvailable: true,
        dangerousGoodsCertified: true,
        operatingHours: '24/7 Continuous',
      },
      {
        id: 'term-dwc-1',
        airportId: 'loc-dwc',
        airportIata: 'DWC',
        terminalName: 'Al Maktoum Cargo Gateway DWC',
        terminalCode: 'DWC-DNATA-2',
        handlingAgentName: 'Dnata Logistics',
        customsOnsite: true,
        coldStorageAvailable: true,
        dangerousGoodsCertified: true,
        operatingHours: '24/7 Continuous',
      },
      {
        id: 'term-ist-1',
        airportId: 'loc-ist',
        airportIata: 'IST',
        terminalName: 'SmartIST Turkish Cargo MegaHub',
        terminalCode: 'IST-SMART-1',
        handlingAgentName: 'Turkish Ground Services (TGS)',
        customsOnsite: true,
        coldStorageAvailable: true,
        dangerousGoodsCertified: true,
        operatingHours: '24/7 Continuous',
      },
      {
        id: 'term-del-1',
        airportId: 'loc-del',
        airportIata: 'DEL',
        terminalName: 'Celebi Delhi Cargo Terminal',
        terminalCode: 'DEL-CEL-1',
        handlingAgentName: 'Celebi Delhi Cargo Terminal Management',
        customsOnsite: true,
        coldStorageAvailable: true,
        dangerousGoodsCertified: true,
        operatingHours: '24/7 Continuous',
      },
    ]

    // 3. Flights
    this.flights = [
      {
        id: 'flt-fg711-260325',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        flightNumber: 'FG-711',
        originAirportIata: 'KBL',
        originAirportName: 'Kabul Hamid Karzai Int Airport',
        destinationAirportIata: 'DXB',
        destinationAirportName: 'Dubai International Airport',
        flightDate: '2026-03-25',
        scheduledDeparture: '2026-03-25T09:30:00Z',
        scheduledArrival: '2026-03-25T12:30:00Z',
        actualDeparture: '2026-03-25T09:45:00Z',
        actualArrival: '2026-03-25T12:40:00Z',
        aircraftType: 'Boeing 737-800',
        status: 'ARRIVED',
        source: 'AIRLINE',
        scheduleHistory: [],
        notes: 'Operating on time with high belly utilization',
        lastUpdated: '2026-03-25T12:45:00Z',
      },
      {
        id: 'flt-ek976-260326',
        airlineId: 'airl-ek',
        airlineName: 'Emirates SkyCargo',
        flightNumber: 'EK-976',
        originAirportIata: 'DXB',
        originAirportName: 'Dubai International Airport',
        destinationAirportIata: 'IST',
        destinationAirportName: 'Istanbul Airport',
        flightDate: '2026-03-26',
        scheduledDeparture: '2026-03-26T04:15:00Z',
        scheduledArrival: '2026-03-26T08:20:00Z',
        aircraftType: 'Boeing 777-200F',
        status: 'SCHEDULED',
        source: 'AIRLINE',
        scheduleHistory: [],
        notes: 'Direct freighter rotation to Istanbul MegaHub',
        lastUpdated: '2026-03-23T00:00:00Z',
      },
      {
        id: 'flt-rq901-260327',
        airlineId: 'airl-rq',
        airlineName: 'Ariana Afghan Airlines',
        flightNumber: 'RQ-901',
        originAirportIata: 'DEL',
        originAirportName: 'Delhi Indira Gandhi Int Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        flightDate: '2026-03-27',
        scheduledDeparture: '2026-03-27T11:00:00Z',
        scheduledArrival: '2026-03-27T13:30:00Z',
        aircraftType: 'Airbus A310-300',
        status: 'SCHEDULED',
        source: 'MANUAL',
        scheduleHistory: [],
        notes: 'Special pharma pallet pre-booked in temperature zone',
        lastUpdated: '2026-03-23T00:00:00Z',
      },
      {
        id: 'flt-fg712-260328',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        flightNumber: 'FG-712',
        originAirportIata: 'DXB',
        originAirportName: 'Dubai International Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        flightDate: '2026-03-28',
        scheduledDeparture: '2026-03-28T14:30:00Z',
        scheduledArrival: '2026-03-28T18:00:00Z',
        aircraftType: 'Boeing 737-800',
        status: 'SCHEDULED',
        source: 'AIRLINE',
        scheduleHistory: [],
        notes: 'Rebooked electronics shipment loaded for this rotation',
        lastUpdated: '2026-03-23T00:00:00Z',
      },
    ]

    // 4. Air Bookings
    this.bookings = [
      {
        id: 'book-af-001',
        bookingReference: 'SKY-AB-2026-001',
        bolNumber: 'BOL-KBL-2026-081',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        airlineAwbPrefix: '384',
        customerName: 'Herat Saffron Trading LLC',
        shipper: 'Herat Saffron Trading LLC',
        consignee: 'Gulf Spices & Gourmet Foods DMCC',
        commodity: 'Premium Organic Afghan Saffron & Pine Nuts',
        packagesCount: 45,
        packagingType: 'CARTONS',
        grossWeightKg: 680,
        dimensions: [
          { id: 'dim-1', lengthCm: 80, widthCm: 60, heightCm: 50, quantity: 30, unit: 'CM' },
          { id: 'dim-2', lengthCm: 40, widthCm: 40, heightCm: 40, quantity: 15, unit: 'CM' },
        ],
        volumetricDivisor: 6000,
        volumetricWeightKg: 720,
        chargeableWeightKg: 720,
        isWeightManualOverride: false,
        originAirportIata: 'KBL',
        originAirportName: 'Kabul Hamid Karzai Int Airport',
        destinationAirportIata: 'DXB',
        destinationAirportName: 'Dubai International Airport',
        transitAirportsIata: [],
        flightNumber: 'FG-711',
        flightDate: '2026-03-25',
        plannedEtd: '2026-03-25T09:30:00Z',
        plannedEta: '2026-03-25T12:30:00Z',
        serviceType: 'DIRECT',
        status: 'ARRIVED',
        mawbNumber: '384-10293841',
        hawbNumbers: [],
        notes: 'High-value agricultural cargo. Supervised security escort verified.',
        createdAt: '2026-03-22T08:00:00Z',
        updatedAt: '2026-03-25T13:00:00Z',
      },
      {
        id: 'book-af-002',
        bookingReference: 'SKY-AB-2026-002',
        bolNumber: 'BOL-KBL-2026-092',
        airlineId: 'airl-ek',
        airlineName: 'Emirates SkyCargo',
        airlineAwbPrefix: '176',
        customerName: 'Ariana Silk & Carpet Guild',
        shipper: 'Ariana Silk & Carpet Guild',
        consignee: 'Grand Bazaar Artisans A.S.',
        commodity: 'Handwoven Silk & Wool Rugs / Carpets',
        packagesCount: 28,
        packagingType: 'OTHER',
        grossWeightKg: 1420,
        dimensions: [
          { id: 'dim-3', lengthCm: 220, widthCm: 45, heightCm: 45, quantity: 28, unit: 'CM' },
        ],
        volumetricDivisor: 6000,
        volumetricWeightKg: 1039.5,
        chargeableWeightKg: 1420,
        isWeightManualOverride: false,
        originAirportIata: 'KBL',
        originAirportName: 'Kabul Hamid Karzai Int Airport',
        destinationAirportIata: 'IST',
        destinationAirportName: 'Istanbul Airport',
        transitAirportsIata: ['DXB'],
        flightNumber: 'FG-711 / EK-976',
        flightDate: '2026-03-25',
        plannedEtd: '2026-03-25T09:30:00Z',
        plannedEta: '2026-03-26T08:20:00Z',
        serviceType: 'CONNECTING',
        status: 'TRANSIT_AIRPORT',
        mawbNumber: '176-49201948',
        hawbNumbers: ['SKYA-IST-901'],
        notes: 'Two-leg transit route. First leg KBL-DXB on FG-711, second leg DXB-IST on EK-976.',
        createdAt: '2026-03-21T09:00:00Z',
        updatedAt: '2026-03-25T13:00:00Z',
      },
      {
        id: 'book-af-003',
        bookingReference: 'SKY-AB-2026-003',
        airlineId: 'airl-rq',
        airlineName: 'Ariana Afghan Airlines',
        airlineAwbPrefix: '255',
        customerName: 'Ariana Health & Hospital Supplies',
        shipper: 'Cipla India Distribution Ltd',
        consignee: 'Ariana Health & Hospital Supplies',
        commodity: 'Essential Vaccines & Antibiotic Injectables',
        packagesCount: 18,
        packagingType: 'BOXES',
        grossWeightKg: 520,
        dimensions: [
          { id: 'dim-4', lengthCm: 120, widthCm: 80, heightCm: 90, quantity: 4, unit: 'CM' },
        ],
        volumetricDivisor: 6000,
        volumetricWeightKg: 576,
        chargeableWeightKg: 576,
        isWeightManualOverride: false,
        originAirportIata: 'DEL',
        originAirportName: 'Delhi Indira Gandhi Int Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        transitAirportsIata: [],
        flightNumber: 'RQ-901',
        flightDate: '2026-03-27',
        plannedEtd: '2026-03-27T11:00:00Z',
        plannedEta: '2026-03-27T13:30:00Z',
        serviceType: 'PERISHABLE',
        status: 'ACCEPTED_BY_AIRLINE',
        mawbNumber: '255-83920147',
        hawbNumbers: [],
        notes: 'Cold chain integrity critical. Keep dry and store in Celebi DEL cold storage.',
        createdAt: '2026-03-23T11:00:00Z',
        updatedAt: '2026-03-23T16:00:00Z',
      },
      {
        id: 'book-af-004',
        bookingReference: 'SKY-AB-2026-004',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        airlineAwbPrefix: '384',
        customerName: 'Pamir Telecom & Network Systems',
        shipper: 'Al-Khaleej Microelectronics FZE',
        consignee: 'Pamir Telecom & Network Systems',
        commodity: 'Servers, Routers & Solar Inverter Assemblies',
        packagesCount: 34,
        packagingType: 'CRATES',
        grossWeightKg: 1850,
        dimensions: [
          { id: 'dim-5', lengthCm: 110, widthCm: 90, heightCm: 105, quantity: 12, unit: 'CM' },
        ],
        volumetricDivisor: 6000,
        volumetricWeightKg: 2079,
        chargeableWeightKg: 2079,
        isWeightManualOverride: false,
        originAirportIata: 'DXB',
        originAirportName: 'Dubai International Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        transitAirportsIata: [],
        flightNumber: 'FG-712',
        flightDate: '2026-03-28',
        plannedEtd: '2026-03-28T14:30:00Z',
        plannedEta: '2026-03-28T18:00:00Z',
        serviceType: 'DIRECT',
        status: 'REBOOKED',
        mawbNumber: '384-99201844',
        hawbNumbers: [],
        notes: 'Offloaded from FG-711 due to payload weight restrictions; successfully rebooked on FG-712.',
        createdAt: '2026-03-22T14:00:00Z',
        updatedAt: '2026-03-25T11:00:00Z',
      },
      {
        id: 'book-af-005',
        bookingReference: 'SKY-AB-2026-005',
        airlineId: 'airl-tk',
        airlineName: 'Turkish Cargo',
        airlineAwbPrefix: '235',
        customerName: 'Balkh Agro-Industrial Consortium',
        shipper: 'Anadolu Heavy Hydraulics San.',
        consignee: 'Balkh Agro-Industrial Consortium',
        commodity: 'Turbine Pump Seals & Replacement Valves',
        packagesCount: 12,
        packagingType: 'CRATES',
        grossWeightKg: 780,
        dimensions: [],
        volumetricDivisor: 6000,
        volumetricWeightKg: 690,
        chargeableWeightKg: 780,
        isWeightManualOverride: false,
        originAirportIata: 'IST',
        originAirportName: 'Istanbul Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        transitAirportsIata: ['DXB'],
        flightNumber: 'TK-6421',
        flightDate: '2026-03-28',
        plannedEtd: '2026-03-28T08:00:00Z',
        plannedEta: '2026-03-28T16:00:00Z',
        serviceType: 'CONNECTING',
        status: 'CARGO_RECEIVED',
        mawbNumber: '235-58291048',
        hawbNumbers: [],
        notes: 'Delivered to SmartIST cargo warehouse. Awaiting X-Ray screening and weighing certificate.',
        createdAt: '2026-03-23T15:00:00Z',
        updatedAt: '2026-03-23T18:00:00Z',
      },
    ]

    // 5. Air Legs
    this.legs = [
      {
        id: 'leg-001-1',
        legNumber: 1,
        legLabel: 'Leg 1 (Origin Direct Flight)',
        bookingId: 'book-af-001',
        bookingReference: 'SKY-AB-2026-001',
        mawbNumber: '384-10293841',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        flightNumber: 'FG-711',
        originAirportIata: 'KBL',
        originAirportName: 'Kabul Hamid Karzai Int Airport',
        destinationAirportIata: 'DXB',
        destinationAirportName: 'Dubai International Airport',
        scheduledDeparture: '2026-03-25T09:30:00Z',
        scheduledArrival: '2026-03-25T12:30:00Z',
        actualDeparture: '2026-03-25T09:45:00Z',
        actualArrival: '2026-03-25T12:40:00Z',
        status: 'ARRIVED_DESTINATION',
        notes: 'Arrived at Dnata Terminal 1',
      },
      {
        id: 'leg-002-1',
        legNumber: 1,
        legLabel: 'Leg 1 (Origin Feeder Flight)',
        bookingId: 'book-af-002',
        bookingReference: 'SKY-AB-2026-002',
        mawbNumber: '176-49201948',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        flightNumber: 'FG-711',
        originAirportIata: 'KBL',
        originAirportName: 'Kabul Hamid Karzai Int Airport',
        destinationAirportIata: 'DXB',
        destinationAirportName: 'Dubai International Airport',
        scheduledDeparture: '2026-03-25T09:30:00Z',
        scheduledArrival: '2026-03-25T12:30:00Z',
        actualDeparture: '2026-03-25T09:45:00Z',
        actualArrival: '2026-03-25T12:40:00Z',
        status: 'ARRIVED_TRANSIT',
        notes: 'Transferred to Dnata transit staging area',
      },
      {
        id: 'leg-002-2',
        legNumber: 2,
        legLabel: 'Leg 2 (Connecting Mainline Flight)',
        bookingId: 'book-af-002',
        bookingReference: 'SKY-AB-2026-002',
        mawbNumber: '176-49201948',
        airlineId: 'airl-ek',
        airlineName: 'Emirates SkyCargo',
        flightNumber: 'EK-976',
        originAirportIata: 'DXB',
        originAirportName: 'Dubai International Airport',
        destinationAirportIata: 'IST',
        destinationAirportName: 'Istanbul Airport',
        scheduledDeparture: '2026-03-26T04:15:00Z',
        scheduledArrival: '2026-03-26T08:20:00Z',
        status: 'CONFIRMED',
        notes: 'Pre-manifested on Boeing 777F',
      },
      {
        id: 'leg-003-1',
        legNumber: 1,
        legLabel: 'Leg 1 (Direct Inbound Flight)',
        bookingId: 'book-af-003',
        bookingReference: 'SKY-AB-2026-003',
        mawbNumber: '255-83920147',
        airlineId: 'airl-rq',
        airlineName: 'Ariana Afghan Airlines',
        flightNumber: 'RQ-901',
        originAirportIata: 'DEL',
        originAirportName: 'Delhi Indira Gandhi Int Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        scheduledDeparture: '2026-03-27T11:00:00Z',
        scheduledArrival: '2026-03-27T13:30:00Z',
        status: 'CONFIRMED',
        notes: 'Cold chain container loading reserved',
      },
      {
        id: 'leg-004-1',
        legNumber: 1,
        legLabel: 'Leg 1 (Original Offloaded Flight)',
        bookingId: 'book-af-004',
        bookingReference: 'SKY-AB-2026-004',
        mawbNumber: '384-99201844',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        flightNumber: 'FG-711',
        originAirportIata: 'DXB',
        originAirportName: 'Dubai International Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        scheduledDeparture: '2026-03-25T09:30:00Z',
        scheduledArrival: '2026-03-25T12:30:00Z',
        status: 'OFFLOADED',
        notes: 'Offloaded due to aircraft takeoff weight limitation',
      },
      {
        id: 'leg-004-2',
        legNumber: 2,
        legLabel: 'Leg 2 (Rebooked Replacement Flight)',
        bookingId: 'book-af-004',
        bookingReference: 'SKY-AB-2026-004',
        mawbNumber: '384-99201844',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        flightNumber: 'FG-712',
        originAirportIata: 'DXB',
        originAirportName: 'Dubai International Airport',
        destinationAirportIata: 'KBL',
        destinationAirportName: 'Kabul Hamid Karzai Int Airport',
        scheduledDeparture: '2026-03-28T14:30:00Z',
        scheduledArrival: '2026-03-28T18:00:00Z',
        status: 'CONFIRMED',
        notes: 'Secured on next available Kam Air rotation',
      },
    ]

    // 6. ULDs
    this.ulds = [
      {
        id: 'uld-01',
        uldNumber: 'AKE4491FG',
        uldType: 'AKE',
        palletPosition: 'F1',
        bookingReference: 'SKY-AB-2026-001',
        packagesCount: 45,
        grossWeightKg: 680,
        tareWeightKg: 65,
        buildUpStatus: 'LOADED',
        loadedFlightNumber: 'FG-711',
        notes: 'Kam Air certified LD3 container',
      },
      {
        id: 'uld-02',
        uldNumber: 'PMC9018EK',
        uldType: 'PMC',
        palletPosition: 'M4',
        bookingReference: 'SKY-AB-2026-002',
        packagesCount: 28,
        grossWeightKg: 1420,
        tareWeightKg: 110,
        buildUpStatus: 'READY_FOR_AIRCRAFT',
        loadedFlightNumber: 'EK-976',
        notes: 'Emirates main deck pallet netting inspected',
      },
      {
        id: 'uld-03',
        uldNumber: 'PAG1044TK',
        uldType: 'PAG',
        bookingReference: 'SKY-AB-2026-005',
        packagesCount: 12,
        grossWeightKg: 780,
        tareWeightKg: 95,
        buildUpStatus: 'AWAITING_BUILDUP',
        notes: 'Turkish Cargo empty pallet in staging queue',
      },
    ]

    // 7. Offloads
    this.offloads = [
      {
        id: 'off-001',
        bookingId: 'book-af-004',
        bookingReference: 'SKY-AB-2026-004',
        mawbNumber: '384-99201844',
        originalFlightNumber: 'FG-711',
        offloadAirportIata: 'DXB',
        offloadAirportName: 'Dubai International Airport',
        reason: 'AIRCRAFT_PAYLOAD_LIMIT',
        detailedReason: 'High ambient temperature in Kabul caused aircraft max take-off/landing weight penalty.',
        offloadDate: '2026-03-25T07:40:00Z',
        rebookedFlightNumber: 'FG-712',
        rebookedDate: '2026-03-28T14:30:00Z',
        status: 'REBOOKED',
        recordedBy: 'Farhad Rasooli (Air Operations Lead)',
      },
    ]

    // 8. MAWB Records
    this.mawbs = [
      {
        id: 'mawb-001',
        mawbNumber: '384-10293841',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        awbPrefix: '384',
        bookingId: 'book-af-001',
        bookingReference: 'SKY-AB-2026-001',
        bolNumber: 'BOL-KBL-2026-081',
        shipper: 'Herat Saffron Trading LLC',
        consignee: 'Gulf Spices & Gourmet Foods DMCC',
        originAirportIata: 'KBL',
        destinationAirportIata: 'DXB',
        packagesCount: 45,
        grossWeightKg: 680,
        chargeableWeightKg: 720,
        status: 'ISSUED',
        draftVersions: [
          {
            versionNumber: 1,
            receivedDate: '2026-03-23T10:00:00Z',
            approvedDate: '2026-03-24T12:00:00Z',
            approvedBy: 'Ahmad Qasim',
            notes: 'Initial airline draft approved without discrepancies.',
          },
        ],
        currentDraftVersion: 1,
        isDraftApproved: true,
        issueDate: '2026-03-24',
        flightNumber: 'FG-711',
        notes: 'VAL - Saffron Cargo - Supervised Security Hold',
      },
      {
        id: 'mawb-002',
        mawbNumber: '176-49201948',
        airlineId: 'airl-ek',
        airlineName: 'Emirates SkyCargo',
        awbPrefix: '176',
        bookingId: 'book-af-002',
        bookingReference: 'SKY-AB-2026-002',
        bolNumber: 'BOL-KBL-2026-092',
        shipper: 'Ariana Silk & Carpet Guild',
        consignee: 'Grand Bazaar Artisans A.S.',
        originAirportIata: 'KBL',
        destinationAirportIata: 'IST',
        packagesCount: 28,
        grossWeightKg: 1420,
        chargeableWeightKg: 1420,
        status: 'ISSUED',
        draftVersions: [
          {
            versionNumber: 1,
            receivedDate: '2026-03-23T14:00:00Z',
            notes: 'Initial draft with preliminary weight of 1380 kg.',
            correctionsRequested: 'Update gross weight to 1420 kg after terminal scale verification.',
          },
          {
            versionNumber: 2,
            receivedDate: '2026-03-24T15:00:00Z',
            approvedDate: '2026-03-24T16:00:00Z',
            approvedBy: 'Farhad Rasooli',
            notes: 'Version 2 with verified scale weight approved by Emirates cargo agent.',
          },
        ],
        currentDraftVersion: 2,
        isDraftApproved: true,
        issueDate: '2026-03-24',
        flightNumber: 'EK-976',
        notes: 'Transit via DXB. Keep dry. Do not drop.',
      },
      {
        id: 'mawb-003',
        mawbNumber: '255-83920147',
        airlineId: 'airl-rq',
        airlineName: 'Ariana Afghan Airlines',
        awbPrefix: '255',
        bookingId: 'book-af-003',
        bookingReference: 'SKY-AB-2026-003',
        shipper: 'Cipla India Distribution Ltd',
        consignee: 'Ariana Health & Hospital Supplies',
        originAirportIata: 'DEL',
        destinationAirportIata: 'KBL',
        packagesCount: 18,
        grossWeightKg: 520,
        chargeableWeightKg: 576,
        status: 'UNDER_REVIEW',
        draftVersions: [
          {
            versionNumber: 1,
            receivedDate: '2026-03-23T11:00:00Z',
            notes: 'Awaiting temperature data logger certificate attachment.',
          },
        ],
        currentDraftVersion: 1,
        isDraftApproved: false,
        flightNumber: 'RQ-901',
        notes: 'Vaccines +2 to +8 C. Urgent clearance upon landing.',
      },
    ]

    // 9. HAWB Records
    this.hawbs = [
      {
        id: 'hawb-001',
        hawbNumber: 'SKYA-IST-901',
        mawbNumber: '176-49201948',
        bookingId: 'book-af-002',
        shipper: 'Ariana Silk & Carpet Guild',
        consignee: 'Grand Bazaar Artisans A.S.',
        commodity: 'Handmade Silk Carpets 28 Bales',
        packagesCount: 28,
        grossWeightKg: 1420,
        chargeableWeightKg: 1420,
        issueDate: '2026-03-24',
        status: 'ISSUED',
        notes: 'House Air Waybill issued to Grand Bazaar Artisans A.S.',
      },
    ]

    // 10. Cargo Acceptances
    this.acceptances = [
      {
        id: 'acc-001',
        bookingId: 'book-af-001',
        bookingReference: 'SKY-AB-2026-001',
        mawbNumber: '384-10293841',
        airportIata: 'KBL',
        terminalName: 'Kabul International Cargo Complex',
        deliveryDate: '2026-03-24T14:30:00Z',
        deliveringTruckPlate: 'KBL-28492',
        deliveringDriverName: 'Mohammad Tariq',
        packagesReceived: 45,
        grossWeightReceivedKg: 680.5,
        terminalReceiptNumber: 'TRN-KBL-8821',
        securityStatus: 'COMPLETED',
        screeningNotes: 'Dual-View X-Ray and physical seal inspection passed without alarm.',
        airlineAcceptanceStatus: 'ACCEPTED',
        airlineAcceptanceRef: 'RCL-FG-2026-4421',
        airlineAcceptanceDate: '2026-03-24T15:30:00Z',
        recordedBy: 'Inspector Zabihullah (Civil Aviation Security)',
      },
      {
        id: 'acc-002',
        bookingId: 'book-af-002',
        bookingReference: 'SKY-AB-2026-002',
        mawbNumber: '176-49201948',
        airportIata: 'KBL',
        terminalName: 'Kabul International Cargo Complex',
        deliveryDate: '2026-03-24T11:00:00Z',
        deliveringTruckPlate: 'KBL-19384',
        deliveringDriverName: 'Jan Mohammad',
        packagesReceived: 28,
        grossWeightReceivedKg: 1420.0,
        terminalReceiptNumber: 'TRN-KBL-8799',
        securityStatus: 'COMPLETED',
        screeningNotes: 'Explosive Trace Detector swab clear. All bales tagged.',
        airlineAcceptanceStatus: 'ACCEPTED',
        airlineAcceptanceRef: 'RCL-EK-2026-109',
        airlineAcceptanceDate: '2026-03-24T12:00:00Z',
        recordedBy: 'Sergeant Noor Ahmad',
      },
      {
        id: 'acc-003',
        bookingId: 'book-af-003',
        bookingReference: 'SKY-AB-2026-003',
        mawbNumber: '255-83920147',
        airportIata: 'DEL',
        terminalName: 'Celebi Delhi Cargo Terminal',
        deliveryDate: '2026-03-23T15:00:00Z',
        deliveringDriverName: 'Rajesh Kumar',
        packagesReceived: 18,
        grossWeightReceivedKg: 520.0,
        terminalReceiptNumber: 'TRN-DEL-4491',
        securityStatus: 'COMPLETED',
        airlineAcceptanceStatus: 'ACCEPTED',
        airlineAcceptanceRef: 'RCL-RQ-DEL-02',
        airlineAcceptanceDate: '2026-03-23T16:00:00Z',
        recordedBy: 'Celebi Pharma Desk',
      },
    ]

    // 11. Air Release Trackers (3-Way Release)
    this.releases = [
      {
        id: 'rel-001',
        bookingId: 'book-af-001',
        mawbNumber: '384-10293841',
        airlineRelease: true,
        airlineReleaseDate: '2026-03-25T13:15:00Z',
        airlineReleaseRef: 'EK-REL-8821',
        customsRelease: true,
        customsReleaseDate: '2026-03-25T14:00:00Z',
        terminalRelease: true,
        terminalReleaseDate: '2026-03-25T14:30:00Z',
        deliveryOrderIssued: true,
        deliveryOrderDate: '2026-03-25T14:35:00Z',
        cargoAvailableForPickup: true,
        cargoAvailableDate: '2026-03-25T14:40:00Z',
        releaseBlocked: false,
      },
      {
        id: 'rel-002',
        bookingId: 'book-af-002',
        mawbNumber: '176-49201948',
        airlineRelease: false,
        customsRelease: false,
        terminalRelease: false,
        deliveryOrderIssued: false,
        cargoAvailableForPickup: false,
        releaseBlocked: false,
      },
      {
        id: 'rel-003',
        bookingId: 'book-af-003',
        mawbNumber: '255-83920147',
        airlineRelease: false,
        customsRelease: false,
        terminalRelease: false,
        deliveryOrderIssued: false,
        cargoAvailableForPickup: false,
        releaseBlocked: true,
        releaseBlockReason: 'Customer freight advance payment verification pending',
      },
    ]

    // 12. Airline Finance Links
    this.financeLinks = [
      {
        id: 'fin-001',
        bookingId: 'book-af-001',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        invoiceNumber: 'INV-FG-2026-993',
        amount: 2245,
        currency: 'USD',
        dueDate: '2026-03-31',
        paidAmount: 2245,
        paymentStatus: 'PAID',
        requiresPaymentForRelease: true,
        notes: 'Settled via prepaid airline corporate account.',
      },
      {
        id: 'fin-002',
        bookingId: 'book-af-002',
        airlineId: 'airl-ek',
        airlineName: 'Emirates SkyCargo',
        invoiceNumber: 'EK-CGO-88492',
        amount: 6030,
        currency: 'USD',
        dueDate: '2026-04-05',
        paidAmount: 0,
        paymentStatus: 'PAYMENT_PENDING',
        requiresPaymentForRelease: true,
        notes: 'Freight collect from Istanbul consignee upon arrival.',
      },
    ]
  }

  // ==========================================
  // 2. Volumetric & Chargeable Weight Calculations
  // ==========================================
  public calculateVolumetricWeight(
    dimensions: DimensionItem[],
    divisor: number = 6000
  ): { totalVolumeCbm: number; totalVolumetricWeightKg: number } {
    let totalVolumeCbm = 0
    let totalVolumetricWeightKg = 0

    for (const dim of dimensions) {
      const volCbm = (dim.lengthCm * dim.widthCm * dim.heightCm * dim.quantity) / 1000000
      const volWeightKg = (dim.lengthCm * dim.widthCm * dim.heightCm * dim.quantity) / divisor

      totalVolumeCbm += volCbm
      totalVolumetricWeightKg += volWeightKg
    }

    return {
      totalVolumeCbm: Number(totalVolumeCbm.toFixed(4)),
      totalVolumetricWeightKg: Number(totalVolumetricWeightKg.toFixed(2)),
    }
  }

  public determineChargeableWeight(
    grossWeightKg: number,
    volumetricWeightKg: number
  ): { chargeableWeightKg: number; isVolumetricPenalty: boolean; weightDifferenceKg: number } {
    const chargeable = Math.max(grossWeightKg, volumetricWeightKg)
    const isVolumetricPenalty = volumetricWeightKg > grossWeightKg
    const weightDifferenceKg = Math.abs(volumetricWeightKg - grossWeightKg)

    return {
      chargeableWeightKg: Number(chargeable.toFixed(2)),
      isVolumetricPenalty,
      weightDifferenceKg: Number(weightDifferenceKg.toFixed(2)),
    }
  }

  // ==========================================
  // 3. Getters & KPI Summaries
  // ==========================================
  public getAirlines(): AirlineRecord[] {
    return [...this.airlines]
  }

  public getTerminals(): CargoTerminalRecord[] {
    return [...this.terminals]
  }

  public getFlights(): FlightRecord[] {
    return [...this.flights]
  }

  public getBookings(): AirBookingRecord[] {
    return [...this.bookings]
  }

  public getLegs(): AirLegRecord[] {
    return [...this.legs]
  }

  public getULDs(): ULDRecord[] {
    return [...this.ulds]
  }

  public getOffloads(): OffloadRecord[] {
    return [...this.offloads]
  }

  public getMawbs(): MAWBRecord[] {
    return [...this.mawbs]
  }

  public getHawbs(): HAWBRecord[] {
    return [...this.hawbs]
  }

  public getAcceptances(): CargoAcceptanceRecord[] {
    return [...this.acceptances]
  }

  public getReleases(): AirReleaseTracker[] {
    return [...this.releases]
  }

  public getFinanceLinks(): AirlineFinanceLink[] {
    return [...this.financeLinks]
  }

  public getSummaryKpis(): AirSummaryKpi {
    const activeAirShipments = this.bookings.filter(
      (b) => !['COMPLETED', 'CANCELLED', 'RELEASED'].includes(b.status)
    ).length

    const bookingPending = this.bookings.filter((b) =>
      ['DRAFT', 'REQUESTED', 'PENDING_CONFIRMATION'].includes(b.status)
    ).length

    const awaitingAcceptance = this.bookings.filter((b) =>
      ['CONFIRMED', 'CARGO_NOT_RECEIVED'].includes(b.status)
    ).length

    const cargoAccepted = this.bookings.filter((b) =>
      ['CARGO_RECEIVED', 'ACCEPTED_BY_AIRLINE'].includes(b.status)
    ).length

    const awbPending = this.bookings.filter(
      (b) => !b.mawbNumber || b.status === 'AWB_PENDING'
    ).length

    const flightConfirmed = this.bookings.filter((b) => b.status === 'FLIGHT_CONFIRMED').length

    const departingToday = this.flights.filter((f) => f.status === 'DEPARTED').length

    const inTransit = this.bookings.filter((b) =>
      ['DEPARTED', 'IN_TRANSIT'].includes(b.status)
    ).length

    const atTransitAirport = this.bookings.filter((b) => b.status === 'TRANSIT_AIRPORT').length

    const offloaded = this.bookings.filter((b) => b.status === 'OFFLOADED').length

    const arrivingSoon = this.flights.filter((f) => f.status === 'IN_FLIGHT' || f.status === 'SCHEDULED').length

    const arrived = this.bookings.filter((b) => b.status === 'ARRIVED').length

    const releasePending = this.releases.filter(
      (r) => !r.cargoAvailableForPickup && !r.deliveryOrderIssued
    ).length

    return {
      activeAirShipments,
      bookingPending,
      awaitingAcceptance,
      cargoAccepted,
      awbPending,
      flightConfirmed,
      departingToday,
      inTransit,
      atTransitAirport,
      offloaded,
      arrivingSoon,
      arrived,
      releasePending,
    }
  }

  public getShipmentBoardItems(): AirShipmentBoardItem[] {
    return this.bookings.map((booking) => {
      const mawb = this.mawbs.find(
        (m) => m.bookingId === booking.id || (booking.mawbNumber && m.mawbNumber === booking.mawbNumber)
      )
      const bookingLegs = this.legs.filter((l) => l.bookingId === booking.id)
      const acceptance = this.acceptances.find((a) => a.bookingId === booking.id)
      const finance = this.financeLinks.find((f) => f.bookingId === booking.id)
      const isOffloaded = booking.status === 'OFFLOADED' || this.offloads.some((o) => o.bookingId === booking.id && o.status === 'OFFLOADED')

      const currentLeg = bookingLegs[0] || null

      let attentionReason: string | undefined
      if (isOffloaded) {
        attentionReason = 'Cargo offloaded - rebooking required'
      } else if (!booking.mawbNumber) {
        attentionReason = 'MAWB pending issuance'
      } else if (acceptance?.airlineAcceptanceStatus !== 'ACCEPTED') {
        attentionReason = 'Airline cargo acceptance pending'
      } else if (finance && finance.requiresPaymentForRelease && finance.paymentStatus !== 'PAID') {
        attentionReason = 'Freight settlement pending release'
      }

      return {
        id: booking.id,
        bookingReference: booking.bookingReference,
        bolNumber: booking.bolNumber,
        mawbNumber: booking.mawbNumber || 'PENDING',
        customerName: booking.customerName || booking.shipper,
        airlineName: booking.airlineName,
        currentFlightNumber: booking.flightNumber,
        currentLegNumber: currentLeg ? currentLeg.legNumber : 1,
        totalLegs: bookingLegs.length > 0 ? bookingLegs.length : 1,
        originAirportIata: booking.originAirportIata,
        destinationAirportIata: booking.destinationAirportIata,
        flightDate: booking.flightDate,
        etd: booking.plannedEtd,
        eta: booking.plannedEta,
        actualDeparture: currentLeg?.actualDeparture,
        actualArrival: currentLeg?.actualArrival,
        packagesCount: booking.packagesCount,
        grossWeightKg: booking.grossWeightKg,
        chargeableWeightKg: booking.chargeableWeightKg,
        shipmentStatus: booking.status,
        awbStatus: mawb ? mawb.status : 'DRAFT',
        acceptanceStatus: acceptance ? acceptance.airlineAcceptanceStatus : 'PENDING',
        paymentStatus: finance ? finance.paymentStatus : 'NOT_INVOICED',
        attentionReason,
        isOffloaded,
        isTransit: booking.serviceType === 'CONNECTING' || (booking.transitAirportsIata && booking.transitAirportsIata.length > 0),
      }
    })
  }

  // ==========================================
  // 4. Mutations & Operations
  // ==========================================

  // A. Save or Update Booking
  public saveBooking(data: Partial<AirBookingRecord>): AirBookingRecord {
    const now = new Date().toISOString()
    let booking: AirBookingRecord

    // Calculate dimensions & weights
    const dims: DimensionItem[] = data.dimensions || []
    const divisor = data.volumetricDivisor || 6000
    const volCalc = this.calculateVolumetricWeight(dims, divisor)
    const gross = data.grossWeightKg ?? 0
    const chargeable = data.isWeightManualOverride && data.chargeableWeightKg !== undefined
      ? data.chargeableWeightKg
      : Math.max(gross, volCalc.totalVolumetricWeightKg)

    if (data.id) {
      const idx = this.bookings.findIndex((b) => b.id === data.id)
      if (idx === -1) throw new Error(`Air booking not found: ${data.id}`)
      booking = {
        ...this.bookings[idx],
        ...data,
        grossWeightKg: gross,
        volumetricWeightKg: volCalc.totalVolumetricWeightKg,
        chargeableWeightKg: chargeable,
        updatedAt: now,
      } as AirBookingRecord
      this.bookings[idx] = booking
    } else {
      const newId = `book-af-${Date.now()}`
      const bookingRef = data.bookingReference || `SKY-AB-2026-${String(this.bookings.length + 1).padStart(3, '0')}`
      booking = {
        id: newId,
        bookingReference: bookingRef,
        airlineId: data.airlineId || 'airl-fg',
        airlineName: data.airlineName || 'Kam Air',
        airlineAwbPrefix: data.airlineAwbPrefix || '384',
        customerName: data.customerName || data.shipper || 'Valued Customer',
        shipper: data.shipper || 'Shipper',
        consignee: data.consignee || 'Consignee',
        commodity: data.commodity || 'General Cargo',
        packagesCount: data.packagesCount || 1,
        packagingType: data.packagingType || 'CARTONS',
        grossWeightKg: gross,
        dimensions: dims,
        volumetricDivisor: divisor,
        volumetricWeightKg: volCalc.totalVolumetricWeightKg,
        chargeableWeightKg: chargeable,
        isWeightManualOverride: !!data.isWeightManualOverride,
        weightOverrideReason: data.weightOverrideReason,
        originAirportIata: data.originAirportIata || 'KBL',
        originAirportName: data.originAirportName || `${data.originAirportIata || 'KBL'} Airport`,
        destinationAirportIata: data.destinationAirportIata || 'DXB',
        destinationAirportName: data.destinationAirportName || `${data.destinationAirportIata || 'DXB'} Airport`,
        transitAirportsIata: data.transitAirportsIata || [],
        flightNumber: data.flightNumber || 'FG-711',
        flightDate: data.flightDate || now.split('T')[0],
        plannedEtd: data.plannedEtd || now,
        plannedEta: data.plannedEta || now,
        serviceType: data.serviceType || 'DIRECT',
        status: data.status || 'REQUESTED',
        mawbNumber: data.mawbNumber,
        hawbNumbers: data.hawbNumbers || [],
        createdAt: now,
        updatedAt: now,
        ...data,
      } as AirBookingRecord
      this.bookings.push(booking)

      // Initialize 3-way release tracker
      this.releases.push({
        id: `rel-${Date.now()}`,
        bookingId: newId,
        mawbNumber: booking.mawbNumber || 'PENDING',
        airlineRelease: false,
        customsRelease: false,
        terminalRelease: false,
        deliveryOrderIssued: false,
        cargoAvailableForPickup: false,
        releaseBlocked: false,
      })
    }

    return booking
  }

  // B. Save or Update Flight
  public saveFlight(data: Partial<FlightRecord>): FlightRecord {
    const now = new Date().toISOString()
    let flight: FlightRecord

    if (data.id) {
      const idx = this.flights.findIndex((f) => f.id === data.id)
      if (idx === -1) throw new Error(`Flight not found: ${data.id}`)
      flight = {
        ...this.flights[idx],
        ...data,
        lastUpdated: now,
      } as FlightRecord
      this.flights[idx] = flight
    } else {
      const newId = `flt-${data.flightNumber?.replace(/[^a-zA-Z0-9]/g, '') || Date.now()}-${Date.now().toString().slice(-4)}`
      flight = {
        id: newId,
        airlineId: data.airlineId || 'airl-fg',
        airlineName: data.airlineName || 'Kam Air',
        flightNumber: data.flightNumber || 'FG-100',
        originAirportIata: data.originAirportIata || 'KBL',
        originAirportName: data.originAirportName || `${data.originAirportIata} Airport`,
        destinationAirportIata: data.destinationAirportIata || 'DXB',
        destinationAirportName: data.destinationAirportName || `${data.destinationAirportIata} Airport`,
        flightDate: data.flightDate || now.split('T')[0],
        scheduledDeparture: data.scheduledDeparture || now,
        scheduledArrival: data.scheduledArrival || now,
        aircraftType: data.aircraftType || 'Boeing 737-800',
        status: data.status || 'SCHEDULED',
        source: data.source || 'MANUAL',
        scheduleHistory: data.scheduleHistory || [],
        lastUpdated: now,
        ...data,
      } as FlightRecord
      this.flights.push(flight)
    }

    return flight
  }

  // C. Update Flight Operational Status (Departure / Arrival)
  public updateFlightStatus(
    flightId: string,
    newStatus: FlightStatus,
    actualTime?: string,
    notes?: string
  ): FlightRecord {
    const flight = this.flights.find((f) => f.id === flightId)
    if (!flight) throw new Error(`Flight not found: ${flightId}`)

    const now = actualTime || new Date().toISOString()
    flight.status = newStatus
    flight.lastUpdated = new Date().toISOString()
    if (notes) flight.notes = notes

    if (newStatus === 'DEPARTED' || newStatus === 'IN_FLIGHT') {
      flight.actualDeparture = now
      // Synchronize legs linked to this flight number
      this.legs
        .filter((l) => l.flightNumber === flight.flightNumber)
        .forEach((leg) => {
          leg.actualDeparture = now
          leg.status = 'DEPARTED'
          const booking = this.bookings.find((b) => b.id === leg.bookingId)
          if (booking && booking.status !== 'OFFLOADED') {
            booking.status = booking.serviceType === 'CONNECTING' ? 'IN_TRANSIT' : 'DEPARTED'
            booking.updatedAt = new Date().toISOString()
          }
        })
    } else if (newStatus === 'ARRIVED' || newStatus === 'COMPLETED') {
      flight.actualArrival = now
      this.legs
        .filter((l) => l.flightNumber === flight.flightNumber)
        .forEach((leg) => {
          leg.actualArrival = now
          const allLegs = this.legs.filter((l) => l.bookingId === leg.bookingId)
          const isLastLeg = leg.legNumber === allLegs.length
          leg.status = isLastLeg ? 'ARRIVED_DESTINATION' : 'ARRIVED_TRANSIT'
          const booking = this.bookings.find((b) => b.id === leg.bookingId)
          if (booking) {
            booking.status = isLastLeg ? 'ARRIVED' : 'TRANSIT_AIRPORT'
            booking.updatedAt = new Date().toISOString()
          }
        })
    }

    return flight
  }

  // D. Save or Update Flight Leg
  public saveFlightLeg(data: Partial<AirLegRecord>): AirLegRecord {
    let leg: AirLegRecord
    if (data.id) {
      const idx = this.legs.findIndex((l) => l.id === data.id)
      if (idx === -1) throw new Error(`Air leg not found: ${data.id}`)
      leg = { ...this.legs[idx], ...data } as AirLegRecord
      this.legs[idx] = leg
    } else {
      leg = {
        id: `leg-${Date.now()}`,
        legNumber: data.legNumber || 1,
        legLabel: data.legLabel || `Leg ${data.legNumber || 1}`,
        bookingId: data.bookingId || '',
        bookingReference: data.bookingReference || '',
        airlineId: data.airlineId || 'airl-fg',
        airlineName: data.airlineName || 'Kam Air',
        flightNumber: data.flightNumber || 'FG-100',
        originAirportIata: data.originAirportIata || 'KBL',
        originAirportName: data.originAirportName || 'Kabul Airport',
        destinationAirportIata: data.destinationAirportIata || 'DXB',
        destinationAirportName: data.destinationAirportName || 'Dubai Airport',
        scheduledDeparture: data.scheduledDeparture || '',
        scheduledArrival: data.scheduledArrival || '',
        status: data.status || 'CONFIRMED',
        ...data,
      } as AirLegRecord
      this.legs.push(leg)
    }
    return leg
  }

  // E. Record Cargo Acceptance & Screening
  public recordCargoAcceptance(data: Partial<CargoAcceptanceRecord>): CargoAcceptanceRecord {
    const now = new Date().toISOString()
    const booking = this.bookings.find((b) => b.id === data.bookingId)
    if (!booking) throw new Error(`Booking not found: ${data.bookingId}`)

    const rec: CargoAcceptanceRecord = {
      id: data.id || `acc-${Date.now()}`,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      mawbNumber: booking.mawbNumber,
      airportIata: data.airportIata || booking.originAirportIata,
      terminalName: data.terminalName || 'Airport Cargo Terminal',
      deliveryDate: data.deliveryDate || now,
      deliveringTruckPlate: data.deliveringTruckPlate,
      deliveringDriverName: data.deliveringDriverName,
      packagesReceived: data.packagesReceived ?? booking.packagesCount,
      grossWeightReceivedKg: data.grossWeightReceivedKg ?? booking.grossWeightKg,
      terminalReceiptNumber: data.terminalReceiptNumber || `TRN-${Date.now().toString().slice(-4)}`,
      securityStatus: data.securityStatus || 'COMPLETED',
      screeningNotes: data.screeningNotes,
      airlineAcceptanceStatus: data.airlineAcceptanceStatus || 'ACCEPTED',
      airlineAcceptanceRef: data.airlineAcceptanceRef || `RCL-${booking.airlineAwbPrefix}-${Date.now().toString().slice(-4)}`,
      airlineAcceptanceDate: data.airlineAcceptanceDate || now,
      rejectionReason: data.rejectionReason,
      notes: data.notes,
      recordedBy: data.recordedBy || 'Aviation Terminal Officer',
      ...data,
    }

    const existingIdx = this.acceptances.findIndex((a) => a.bookingId === booking.id)
    if (existingIdx >= 0) {
      this.acceptances[existingIdx] = rec
    } else {
      this.acceptances.push(rec)
    }

    // Update booking state
    if (rec.airlineAcceptanceStatus === 'ACCEPTED') {
      booking.status = 'ACCEPTED_BY_AIRLINE'
    } else if (rec.airlineAcceptanceStatus === 'REJECTED') {
      booking.status = 'CARGO_NOT_RECEIVED'
    } else {
      booking.status = 'CARGO_RECEIVED'
    }
    booking.updatedAt = now

    return rec
  }

  // F. Explicit Cargo Offload & Non-Destructive Rebooking
  public recordOffload(params: {
    bookingId: string
    originalFlightNumber: string
    offloadAirportIata: string
    offloadAirportName?: string
    reason: OffloadReason
    detailedReason: string
    rebookedFlightNumber?: string
    rebookedDate?: string
    recordedBy: string
  }): OffloadRecord {
    const booking = this.bookings.find((b) => b.id === params.bookingId)
    if (!booking) throw new Error(`Booking not found: ${params.bookingId}`)

    const now = new Date().toISOString()
    const offloadRecord: OffloadRecord = {
      id: `off-${Date.now()}`,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      mawbNumber: booking.mawbNumber || 'N/A',
      originalFlightNumber: params.originalFlightNumber,
      offloadAirportIata: params.offloadAirportIata,
      offloadAirportName: params.offloadAirportName || `${params.offloadAirportIata} Airport`,
      reason: params.reason,
      detailedReason: params.detailedReason,
      offloadDate: now,
      rebookedFlightNumber: params.rebookedFlightNumber,
      rebookedDate: params.rebookedDate,
      status: params.rebookedFlightNumber ? 'REBOOKED' : 'OFFLOADED',
      recordedBy: params.recordedBy,
    }

    this.offloads.push(offloadRecord)

    // Mark affected leg as OFFLOADED without deleting it
    const leg = this.legs.find(
      (l) => l.bookingId === booking.id && l.flightNumber === params.originalFlightNumber
    )
    if (leg) {
      leg.status = 'OFFLOADED'
    }

    // If rebooked flight provided, append new leg
    if (params.rebookedFlightNumber && params.rebookedDate) {
      const nextLegNum = (leg?.legNumber || 1) + 1
      const newLeg: AirLegRecord = {
        id: `leg-${Date.now()}`,
        legNumber: nextLegNum,
        legLabel: `Leg ${nextLegNum} (Rebooked Replacement Flight)`,
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        mawbNumber: booking.mawbNumber,
        airlineId: booking.airlineId,
        airlineName: booking.airlineName,
        flightNumber: params.rebookedFlightNumber,
        originAirportIata: params.offloadAirportIata,
        originAirportName: params.offloadAirportName || `${params.offloadAirportIata} Airport`,
        destinationAirportIata: booking.destinationAirportIata,
        destinationAirportName: booking.destinationAirportName,
        scheduledDeparture: params.rebookedDate,
        scheduledArrival: params.rebookedDate,
        status: 'CONFIRMED',
        notes: `Rebooked from offloaded flight ${params.originalFlightNumber}`,
      }
      this.legs.push(newLeg)
      booking.flightNumber = params.rebookedFlightNumber
      booking.status = 'REBOOKED'
    } else {
      booking.status = 'OFFLOADED'
    }

    booking.updatedAt = now
    return offloadRecord
  }

  // G. MAWB & HAWB Management
  public saveMawb(data: Partial<MAWBRecord>, editorName: string = 'Air Operations'): MAWBRecord {
    const now = new Date().toISOString()
    let mawb: MAWBRecord

    if (data.id) {
      const idx = this.mawbs.findIndex((m) => m.id === data.id)
      if (idx === -1) throw new Error(`MAWB not found: ${data.id}`)
      const prev = this.mawbs[idx]

      // Archive previous version into draftVersions
      const nextVer = (prev.currentDraftVersion || 1) + 1
      const draftHistory = prev.draftVersions ? [...prev.draftVersions] : []
      draftHistory.push({
        versionNumber: prev.currentDraftVersion || 1,
        receivedDate: prev.draftVersions?.[0]?.receivedDate || now,
        approvedDate: prev.isDraftApproved ? now : undefined,
        approvedBy: editorName,
        notes: data.notes || 'MAWB revised and re-issued.',
      })

      mawb = {
        ...prev,
        ...data,
        currentDraftVersion: nextVer,
        draftVersions: draftHistory,
      } as MAWBRecord
      this.mawbs[idx] = mawb
    } else {
      const prefix = data.mawbNumber ? data.mawbNumber.split('-')[0] : (data.awbPrefix || '384')
      mawb = {
        id: `mawb-${Date.now()}`,
        mawbNumber: data.mawbNumber || `${prefix}-00000000`,
        airlineId: data.airlineId || 'airl-fg',
        airlineName: data.airlineName || 'Kam Air',
        awbPrefix: prefix,
        bookingId: data.bookingId || '',
        bookingReference: data.bookingReference || '',
        shipper: data.shipper || 'Shipper',
        consignee: data.consignee || 'Consignee',
        originAirportIata: data.originAirportIata || 'KBL',
        destinationAirportIata: data.destinationAirportIata || 'DXB',
        packagesCount: data.packagesCount || 1,
        grossWeightKg: data.grossWeightKg || 1,
        chargeableWeightKg: data.chargeableWeightKg || 1,
        status: data.status || 'DRAFT',
        draftVersions: [
          {
            versionNumber: 1,
            receivedDate: now,
            notes: 'Initial draft version created.',
          },
        ],
        currentDraftVersion: 1,
        isDraftApproved: data.status === 'ISSUED',
        ...data,
      } as MAWBRecord
      this.mawbs.push(mawb)
    }

    // Link back to booking if present
    if (mawb.bookingId) {
      const booking = this.bookings.find((b) => b.id === mawb.bookingId)
      if (booking) {
        booking.mawbNumber = mawb.mawbNumber
        if (booking.status === 'DRAFT' || booking.status === 'REQUESTED') {
          booking.status = 'AWB_ISSUED'
        }
        booking.updatedAt = now
      }
    }

    return mawb
  }

  public saveHawb(data: Partial<HAWBRecord>): HAWBRecord {
    let hawb: HAWBRecord
    if (data.id) {
      const idx = this.hawbs.findIndex((h) => h.id === data.id)
      if (idx === -1) throw new Error(`HAWB not found: ${data.id}`)
      hawb = { ...this.hawbs[idx], ...data } as HAWBRecord
      this.hawbs[idx] = hawb
    } else {
      hawb = {
        id: `hawb-${Date.now()}`,
        hawbNumber: data.hawbNumber || `SKYA-HAWB-${Date.now().toString().slice(-4)}`,
        mawbNumber: data.mawbNumber || '',
        bookingId: data.bookingId || '',
        shipper: data.shipper || '',
        consignee: data.consignee || '',
        commodity: data.commodity || 'Handicrafts & General Cargo',
        packagesCount: data.packagesCount || 1,
        grossWeightKg: data.grossWeightKg || 1,
        chargeableWeightKg: data.chargeableWeightKg || 1,
        status: data.status || 'ISSUED',
        ...data,
      } as HAWBRecord
      this.hawbs.push(hawb)
    }

    if (hawb.bookingId) {
      const booking = this.bookings.find((b) => b.id === hawb.bookingId)
      if (booking && !booking.hawbNumbers.includes(hawb.hawbNumber)) {
        booking.hawbNumbers = [...booking.hawbNumbers, hawb.hawbNumber]
        booking.updatedAt = new Date().toISOString()
      }
    }

    return hawb
  }

  // H. 3-Way Release Tracker
  public updateReleaseTracker(releaseId: string, updates: Partial<AirReleaseTracker>): AirReleaseTracker {
    const tracker = this.releases.find((r) => r.id === releaseId)
    if (!tracker) throw new Error(`Release tracker not found: ${releaseId}`)

    Object.assign(tracker, updates)

    // Evaluate 3-Way Release
    const allThreeGranted = tracker.airlineRelease && tracker.customsRelease && tracker.terminalRelease
    const canPickup = allThreeGranted && !tracker.releaseBlocked
    tracker.cargoAvailableForPickup = canPickup

    if (canPickup && !tracker.cargoAvailableDate) {
      tracker.cargoAvailableDate = new Date().toISOString()
    }

    if (updates.deliveryOrderIssued) {
      tracker.deliveryOrderIssued = true
      tracker.deliveryOrderDate = updates.deliveryOrderDate || new Date().toISOString()
      const booking = this.bookings.find((b) => b.id === tracker.bookingId)
      if (booking) {
        booking.status = 'CARGO_AVAILABLE'
        booking.updatedAt = new Date().toISOString()
      }
    }

    return tracker
  }

  // I. Airline Finance Link
  public saveFinanceLink(data: Partial<AirlineFinanceLink>): AirlineFinanceLink {
    let link: AirlineFinanceLink
    if (data.id) {
      const idx = this.financeLinks.findIndex((f) => f.id === data.id)
      if (idx === -1) throw new Error(`Finance link not found: ${data.id}`)
      link = { ...this.financeLinks[idx], ...data } as AirlineFinanceLink
      this.financeLinks[idx] = link
    } else {
      link = {
        id: `fin-${Date.now()}`,
        bookingId: data.bookingId || '',
        airlineId: data.airlineId || '',
        airlineName: data.airlineName || '',
        amount: data.amount || 0,
        currency: data.currency || 'USD',
        paidAmount: data.paidAmount || 0,
        paymentStatus: data.paymentStatus || 'PAYMENT_PENDING',
        requiresPaymentForRelease: data.requiresPaymentForRelease ?? true,
        ...data,
      } as AirlineFinanceLink
      this.financeLinks.push(link)
    }
    return link
  }

  // ==========================================
  // 5. Customer-Safe WhatsApp Notification Generator
  // ==========================================
  public generateCustomerWhatsAppUpdate(
    bookingId: string,
    language: 'EN' | 'FA_PS' | 'BILINGUAL' = 'BILINGUAL'
  ): string {
    const booking = this.bookings.find((b) => b.id === bookingId)
    if (!booking) return 'Error: Booking not found.'

    const flightLegs = this.legs.filter((l) => l.bookingId === booking.id)
    const activeLeg = flightLegs[flightLegs.length - 1] || null
    const release = this.releases.find((r) => r.bookingId === booking.id)

    // English Text (strictly NO buy rates, NO internal margins, NO security officer details)
    const enLines: string[] = [
      `✈️ *SKY ARIANA AIR FREIGHT UPDATE*`,
      `*Booking Ref:* ${booking.bookingReference}`,
      booking.mawbNumber ? `*MAWB No:* ${booking.mawbNumber}` : null,
      booking.hawbNumbers.length > 0 ? `*HAWB No:* ${booking.hawbNumbers.join(', ')}` : null,
      `*Route:* ${booking.originAirportIata} ➡️ ${booking.destinationAirportIata} (${booking.serviceType})`,
      `*Commodity:* ${booking.commodity}`,
      `*Packages / Gross Weight:* ${booking.packagesCount} Pcs | ${booking.grossWeightKg} Kg Gross`,
      activeLeg ? `*Flight:* ${activeLeg.flightNumber} (${activeLeg.status.replace(/_/g, ' ')})` : null,
      `*Operational Status:* ${booking.status.replace(/_/g, ' ')}`,
      release?.cargoAvailableForPickup
        ? `✅ *CARGO CLEARED & READY FOR RELEASE AT ${booking.destinationAirportIata}*`
        : `⏳ Terminal Handling & Customs in progress.`,
      `*Support:* +93 79 974 4444 | ops@skyariana.com`,
    ].filter(Boolean) as string[]

    // Dari / Pashto Text
    const faLines: string[] = [
      `✈️ *معلومات کارګوی هوایی شرکت اسکای آریانا*`,
      `*شماره ثبت:* ${booking.bookingReference}`,
      booking.mawbNumber ? `*شماره بارنامه هوایی (MAWB):* ${booking.mawbNumber}` : null,
      `*مسیر پرواز:* ${booking.originAirportIata} ➡️ ${booking.destinationAirportIata}`,
      `*تعداد بسته‌ها و وزن:* ${booking.packagesCount} بسته | ${booking.grossWeightKg} کیلوگرام`,
      activeLeg ? `*شماره پرواز:* ${activeLeg.flightNumber}` : null,
      `*حالت عملیاتی:* ${booking.status.replace(/_/g, ' ')}`,
      release?.cargoAvailableForPickup
        ? `✅ *محموله ترخیص گردیده و آماده تحویل در میدان هوایی مقصد می‌باشد.*`
        : `⏳ امورات گمرکی و ترمینال در جریان است.`,
      `*ارتباط با ما:* ops@skyariana.com`,
    ].filter(Boolean) as string[]

    if (language === 'EN') return enLines.join('\n')
    if (language === 'FA_PS') return faLines.join('\n')
    return `${enLines.join('\n')}\n\n---\n\n${faLines.join('\n')}`
  }

  // ==========================================
  // 6. CSV Schedule Importer
  // ==========================================
  public importFlightScheduleCsv(csvText: string): { imported: number; errors: string[] } {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return { imported: 0, errors: ['CSV file is empty or missing headers.'] }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const errors: string[] = []
    let imported = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      try {
        const flightNum = cols[headers.indexOf('flightnumber')] || cols[0]
        const airlineId = cols[headers.indexOf('airlineid')] || 'airl-fg'
        const airlineName = cols[headers.indexOf('airlinename')] || 'Kam Air'
        const origin = cols[headers.indexOf('origin')] || cols[2] || 'KBL'
        const dest = cols[headers.indexOf('destination')] || cols[3] || 'DXB'
        const depTime = cols[headers.indexOf('departuretime')] || cols[4]
        const arrTime = cols[headers.indexOf('arrivaltime')] || cols[5]
        const aircraft = cols[headers.indexOf('aircraft')] || 'Boeing 737-800'

        if (!flightNum || !origin || !dest) {
          errors.push(`Row ${i + 1}: Missing required flight data (flight number, origin, or destination).`)
          continue
        }

        const now = new Date().toISOString()
        this.saveFlight({
          flightNumber: flightNum,
          airlineId,
          airlineName,
          originAirportIata: origin.toUpperCase(),
          destinationAirportIata: dest.toUpperCase(),
          flightDate: depTime ? depTime.split('T')[0] : now.split('T')[0],
          scheduledDeparture: depTime || now,
          scheduledArrival: arrTime || now,
          aircraftType: aircraft,
          status: 'SCHEDULED',
          source: 'IMPORTED',
        })
        imported++
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown parse error'}`)
      }
    }

    return { imported, errors }
  }

  // ==========================================
  // 7. Full Snapshot Import / Export
  // ==========================================
  public exportStateJson(): string {
    return JSON.stringify(
      {
        airlines: this.airlines,
        terminals: this.terminals,
        bookings: this.bookings,
        flights: this.flights,
        legs: this.legs,
        ulds: this.ulds,
        offloads: this.offloads,
        mawbs: this.mawbs,
        hawbs: this.hawbs,
        acceptances: this.acceptances,
        releases: this.releases,
        financeLinks: this.financeLinks,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )
  }

  public importStateJson(jsonText: string): boolean {
    try {
      const data = JSON.parse(jsonText)
      if (Array.isArray(data.airlines)) this.airlines = data.airlines
      if (Array.isArray(data.terminals)) this.terminals = data.terminals
      if (Array.isArray(data.bookings)) this.bookings = data.bookings
      if (Array.isArray(data.flights)) this.flights = data.flights
      if (Array.isArray(data.legs)) this.legs = data.legs
      if (Array.isArray(data.ulds)) this.ulds = data.ulds
      if (Array.isArray(data.offloads)) this.offloads = data.offloads
      if (Array.isArray(data.mawbs)) this.mawbs = data.mawbs
      if (Array.isArray(data.hawbs)) this.hawbs = data.hawbs
      if (Array.isArray(data.acceptances)) this.acceptances = data.acceptances
      if (Array.isArray(data.releases)) this.releases = data.releases
      if (Array.isArray(data.financeLinks)) this.financeLinks = data.financeLinks
      return true
    } catch (e) {
      console.error('Failed to import Air Freight store state:', e)
      return false
    }
  }
}

export const airFreightStore = AirFreightStore.getInstance()
