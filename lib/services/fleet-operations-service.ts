/**
 * Fleet, Truck & Driver Operations Service
 * Sky Ariana Limited — Road Freight Operations
 */

import {
  TruckRecord,
  DriverRecord,
  RoadTripRecord,
  TransloadEvent,
  BreakdownEvent,
  PodRecord,
  TripExpenseLine,
  FleetSummaryKpi,
  TruckStatus,
  DriverStatus,
  RoadTripStatus,
  PlateCountry,
} from '@/lib/types/fleet-operations'

// ==========================================
// SEED DATA: TRUCKS
// ==========================================
export const SEED_TRUCKS: TruckRecord[] = [
  {
    id: 'trk-af-001',
    truckCode: 'TRK-AF-001',
    plateNumber: '2877',
    plateCountry: 'AF',
    plateProvince: 'Kabul',
    plateLetter: 'ل',
    ownership: 'OWNED',
    truckType: 'TRAILER_40FT',
    makeModel: 'Mercedes-Benz Actros 1844',
    yearOfManufacture: 2019,
    capacityTons: 28,
    maxCbm: 86,
    isReefer: false,
    truckingCompanyId: 'tc-sky-fleet',
    truckingCompanyName: 'Sky Ariana Internal Fleet',
    currentStatus: 'ON_TRIP',
    currentLocationName: 'Islam Qala - Herat Highway KM 60',
    currentBorderStation: 'Islam Qala',
    assignedDriverId: 'drv-001',
    assignedDriverName: 'Ahmadullah Niazi',
    assignedTripId: 'trp-2026-0001',
    assignedBolNumber: 'BOL-2026-0041',
    insuranceExpiry: '2026-12-31',
    roadPermitExpiry: '2026-11-15',
    fitnessExpiry: '2026-10-30',
    gpsDeviceInstalled: true,
    notes: 'Heavy payload certified; dual fuel tanks installed.',
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-03-20T10:30:00Z',
  },
  {
    id: 'trk-af-002',
    truckCode: 'TRK-AF-002',
    plateNumber: '35974',
    plateCountry: 'AF',
    plateProvince: 'Herat',
    plateLetter: 'ل',
    ownership: 'OWNED',
    truckType: 'REEFER_TRUCK',
    makeModel: 'Volvo FH 500 Globetrotter',
    yearOfManufacture: 2021,
    capacityTons: 25,
    maxCbm: 82,
    isReefer: true,
    reeferGensetUnit: 'Thermo King SLXi 400 Whisper',
    truckingCompanyId: 'tc-sky-fleet',
    truckingCompanyName: 'Sky Ariana Internal Fleet',
    currentStatus: 'BORDER_WAITING',
    currentLocationName: 'Islam Qala Afghan Customs Gate',
    currentBorderStation: 'Islam Qala',
    assignedDriverId: 'drv-002',
    assignedDriverName: 'Mohammad Dawood Popal',
    assignedTripId: 'trp-2026-0002',
    assignedBolNumber: 'BOL-2026-0042',
    insuranceExpiry: '2026-09-30',
    roadPermitExpiry: '2026-08-20',
    fitnessExpiry: '2026-09-15',
    gpsDeviceInstalled: true,
    notes: 'Temperature-monitored reefer trailer; pharmaceutical & perishable certified.',
    isActive: true,
    createdAt: '2026-01-18T09:00:00Z',
    updatedAt: '2026-03-22T14:15:00Z',
  },
  {
    id: 'trk-af-003',
    truckCode: 'TRK-AF-003',
    plateNumber: '14820',
    plateCountry: 'AF',
    plateProvince: 'Kandahar',
    plateLetter: 'ش',
    ownership: 'DEDICATED_CONTRACT',
    truckType: 'TRAILER_40FT',
    makeModel: 'MAN TGX 26.480',
    yearOfManufacture: 2018,
    capacityTons: 30,
    maxCbm: 90,
    isReefer: false,
    truckingCompanyId: 'tc-afg-kdr',
    truckingCompanyName: 'Maiwand Transport Services',
    currentStatus: 'AVAILABLE',
    currentLocationName: 'Kabul ACCS Logistics Hub',
    insuranceExpiry: '2026-11-20',
    roadPermitExpiry: '2026-10-10',
    fitnessExpiry: '2026-11-01',
    gpsDeviceInstalled: false,
    notes: 'Ready for southern transit or northern Hairatan dispatch.',
    isActive: true,
    createdAt: '2026-02-01T11:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
  },
  {
    id: 'trk-ir-001',
    truckCode: 'TRK-IR-001',
    plateNumber: '72 B 845 IR',
    plateCountry: 'IR',
    ownership: 'INTERCHANGE',
    truckType: 'CONTAINER_CHASSIS',
    makeModel: 'Scania R450 Streamline',
    yearOfManufacture: 2020,
    capacityTons: 26,
    maxCbm: 85,
    isReefer: false,
    truckingCompanyId: 'tc-iran-transit',
    truckingCompanyName: 'Parsian Highway Transit Mashhad',
    currentStatus: 'ON_TRIP',
    currentLocationName: 'Bandar Abbas - Dogharoon Highway KM 310',
    currentBorderStation: 'Islam Qala / Dogharoon',
    assignedDriverId: 'drv-004',
    assignedDriverName: 'Reza Hosseini',
    assignedTripId: 'trp-2026-0003',
    assignedBolNumber: 'BOL-2026-0043',
    insuranceExpiry: '2026-10-15',
    roadPermitExpiry: '2026-12-01',
    gpsDeviceInstalled: true,
    notes: 'Iranian transit partner truck hauling 40HC import from Bandar Abbas Port to Dogharoon.',
    isActive: true,
    createdAt: '2026-02-10T12:00:00Z',
    updatedAt: '2026-03-22T16:00:00Z',
  },
  {
    id: 'trk-af-004',
    truckCode: 'TRK-AF-004',
    plateNumber: '41209',
    plateCountry: 'AF',
    plateProvince: 'Balkh',
    plateLetter: 'ل',
    ownership: 'MARKET_HIRED',
    truckType: 'FLATBED',
    makeModel: 'Mercedes-Benz 1934 (SK Series)',
    yearOfManufacture: 2012,
    capacityTons: 24,
    currentStatus: 'MAINTENANCE',
    currentLocationName: 'Mazar-i-Sharif Commercial Workshop',
    insuranceExpiry: '2026-07-20',
    notes: 'Brake drum overhaul and clutch plate servicing.',
    isActive: true,
    createdAt: '2026-02-15T08:30:00Z',
    updatedAt: '2026-03-22T11:00:00Z',
  },
]

// ==========================================
// SEED DATA: DRIVERS
// ==========================================
export const SEED_DRIVERS: DriverRecord[] = [
  {
    id: 'drv-001',
    driverCode: 'DRV-001',
    fullName: 'Ahmadullah Niazi',
    fatherName: 'Ghulam Sakhi',
    nationalIdTazkira: 'AFG-1392-884920',
    passportNumber: 'P01984210',
    passportExpiry: '2028-06-15',
    licenseNumber: 'LIC-KBL-77402',
    licenseType: 'Class 1 Heavy Trailer (درجه یک)',
    licenseExpiry: '2027-05-10',
    primaryPhone: '+93 79 912 3456',
    secondaryPhone: '+98 912 345 6789',
    emergencyContact: 'Mohammad Niazi (Brother) +93 70 012 3456',
    country: 'AF',
    city: 'Kabul',
    languagesSpoken: ['Pashto', 'Dari', 'Persian'],
    borderCrossingsHandled: ['Islam Qala', 'Torghundi', 'Dogharoon'],
    isCompanyEmployee: true,
    truckingCompanyId: 'tc-sky-fleet',
    truckingCompanyName: 'Sky Ariana Internal Fleet',
    currentStatus: 'ON_TRIP',
    currentLocationName: 'Islam Qala - Herat Highway KM 60',
    assignedTruckId: 'trk-af-001',
    assignedTruckPlate: '2877 کابل ل',
    currentTripId: 'trp-2026-0001',
    safetyRating: 5,
    verified: true,
    hidePrivateDocsFromCustomer: true,
    notes: 'Senior driver; 12 years cross-border experience between Iran and Afghanistan.',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-03-20T10:30:00Z',
  },
  {
    id: 'drv-002',
    driverCode: 'DRV-002',
    fullName: 'Mohammad Dawood Popal',
    fatherName: 'Abdul Karim',
    nationalIdTazkira: 'AFG-1388-349821',
    passportNumber: 'P02451982',
    passportExpiry: '2027-11-20',
    licenseNumber: 'LIC-HRT-33921',
    licenseType: 'Class 1 Heavy Reefer (درجه یک یخچالی)',
    licenseExpiry: '2028-01-15',
    primaryPhone: '+93 78 845 6789',
    secondaryPhone: '+98 935 845 1234',
    emergencyContact: 'Haji Popal (Father) +93 79 955 4433',
    country: 'AF',
    city: 'Herat',
    languagesSpoken: ['Dari', 'Pashto', 'Persian'],
    borderCrossingsHandled: ['Islam Qala', 'Dogharoon'],
    isCompanyEmployee: true,
    truckingCompanyId: 'tc-sky-fleet',
    truckingCompanyName: 'Sky Ariana Internal Fleet',
    currentStatus: 'BORDER_DELAYED',
    currentLocationName: 'Islam Qala Afghan Customs Gate',
    assignedTruckId: 'trk-af-002',
    assignedTruckPlate: '35974 هرات ل',
    currentTripId: 'trp-2026-0002',
    safetyRating: 4.8,
    verified: true,
    hidePrivateDocsFromCustomer: true,
    notes: 'Certified reefer operator. Handles perishable goods.',
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-03-22T14:15:00Z',
  },
  {
    id: 'drv-003',
    driverCode: 'DRV-003',
    fullName: 'Mirwais Barakzai',
    fatherName: 'Jan Mohammad',
    nationalIdTazkira: 'AFG-1395-194820',
    licenseNumber: 'LIC-KDR-11924',
    licenseType: 'Class 1 Heavy Trailer',
    licenseExpiry: '2027-08-30',
    primaryPhone: '+93 70 822 1199',
    country: 'AF',
    city: 'Kandahar',
    languagesSpoken: ['Pashto', 'Dari', 'Urdu'],
    borderCrossingsHandled: ['Spin Boldak', 'Chaman', 'Torkham'],
    isCompanyEmployee: false,
    truckingCompanyId: 'tc-afg-kdr',
    truckingCompanyName: 'Maiwand Transport Services',
    currentStatus: 'ACTIVE',
    currentLocationName: 'Kabul Logistics Hub',
    safetyRating: 4.5,
    verified: true,
    hidePrivateDocsFromCustomer: true,
    notes: 'Southern corridor specialist.',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
  },
  {
    id: 'drv-004',
    driverCode: 'DRV-004',
    fullName: 'Reza Hosseini',
    fatherName: 'Ali Asghar',
    passportNumber: 'I99284128',
    passportExpiry: '2029-04-10',
    licenseNumber: 'LIC-IR-MAS-8812',
    licenseType: 'Class 1 International Transit (پایه یک)',
    licenseExpiry: '2028-12-30',
    primaryPhone: '+98 915 220 4433',
    country: 'IR',
    city: 'Mashhad',
    languagesSpoken: ['Persian', 'Dari'],
    borderCrossingsHandled: ['Dogharoon', 'Islam Qala', 'Bandar Abbas Port'],
    isCompanyEmployee: false,
    truckingCompanyId: 'tc-iran-transit',
    truckingCompanyName: 'Parsian Highway Transit Mashhad',
    currentStatus: 'ON_TRIP',
    currentLocationName: 'Bandar Abbas - Dogharoon Highway KM 310',
    assignedTruckId: 'trk-ir-001',
    assignedTruckPlate: '72 B 845 IR',
    currentTripId: 'trp-2026-0003',
    safetyRating: 4.9,
    verified: true,
    hidePrivateDocsFromCustomer: true,
    notes: 'Handles Iranian long-haul container movements between Bandar Abbas and Dogharoon terminal.',
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-03-22T16:00:00Z',
  },
]

// ==========================================
// SEED DATA: ROAD TRIPS
// ==========================================
export const SEED_TRIPS: RoadTripRecord[] = [
  {
    id: 'trp-2026-0001',
    tripNumber: 'TRP-2026-0001',
    shipmentId: 'shp-2026-0041',
    bolNumber: 'BOL-2026-0041',
    legIndex: 1,
    originLocationName: 'Islam Qala Border Terminal',
    destinationLocationName: 'Kabul Customs Depot (ACCS)',
    borderStation: 'Islam Qala',
    plannedDepartureDate: '2026-03-20',
    actualDepartureDate: '2026-03-20T14:00:00Z',
    estimatedArrivalDate: '2026-03-23',
    truckId: 'trk-af-001',
    truckPlate: '2877',
    truckCountry: 'AF',
    driverId: 'drv-001',
    driverName: 'Ahmadullah Niazi',
    driverFatherName: 'Ghulam Sakhi',
    driverPhone: '+93 79 912 3456',
    agreedDriverRent: 75000,
    currency: 'AFN',
    advancePaid: 35000,
    balancePayable: 40000,
    status: 'IN_TRANSIT',
    currentLocationName: 'Islam Qala - Herat Highway KM 60',
    transloadHistory: [],
    breakdownHistory: [],
    expenses: [
      {
        id: 'exp-01',
        tripId: 'trp-2026-0001',
        category: 'FUEL',
        description: 'Diesel refuel at Herat Western Bypass pump (220 Liters)',
        amount: 14300,
        currency: 'AFN',
        receiptNumber: 'RCP-HRT-8821',
        date: '2026-03-20',
        paymentStatus: 'REIMBURSED',
      },
      {
        id: 'exp-02',
        tripId: 'trp-2026-0001',
        category: 'WEIGHBRIDGE',
        description: 'MoPW Weighbridge Scale clearance slip',
        amount: 500,
        currency: 'AFN',
        receiptNumber: 'WB-IQ-991',
        date: '2026-03-20',
        paymentStatus: 'REIMBURSED',
      },
    ],
    internalNotes: 'Driver instructed to maintain convoys through Ghorian-Herat highway stretch.',
    customerSafeNotes: 'Truck departed Islam Qala border terminal; moving smoothly towards Herat transit hub.',
    createdAt: '2026-03-19T10:00:00Z',
    updatedAt: '2026-03-20T16:30:00Z',
  },
  {
    id: 'trp-2026-0002',
    tripNumber: 'TRP-2026-0002',
    shipmentId: 'shp-2026-0042',
    bolNumber: 'BOL-2026-0042',
    legIndex: 2,
    originLocationName: 'Dogharoon / Islam Qala Border',
    destinationLocationName: 'Herat Industrial Park Warehouse 4',
    borderStation: 'Islam Qala',
    plannedDepartureDate: '2026-03-22',
    estimatedArrivalDate: '2026-03-23',
    truckId: 'trk-af-002',
    truckPlate: '35974',
    truckCountry: 'AF',
    driverId: 'drv-002',
    driverName: 'Mohammad Dawood Popal',
    driverFatherName: 'Abdul Karim',
    driverPhone: '+93 78 845 6789',
    agreedDriverRent: 28000,
    currency: 'AFN',
    advancePaid: 15000,
    balancePayable: 13000,
    status: 'AT_BORDER',
    currentLocationName: 'Islam Qala Afghan Customs Gate',
    transloadHistory: [
      {
        id: 'tsl-001',
        tripId: 'trp-2026-0002',
        transloadLocation: 'Dogharoon Zero Point Transshipment Yard',
        transloadDate: '2026-03-22T11:30:00Z',
        oldTruckId: 'trk-ir-999',
        oldTruckPlate: '44 C 192 IR',
        oldDriverId: 'drv-ir-999',
        oldDriverName: 'Hassan Rahmani',
        oldDriverFatherName: 'Gholam Reza',
        newTruckId: 'trk-af-002',
        newTruckPlate: '35974',
        newDriverId: 'drv-002',
        newDriverName: 'Mohammad Dawood Popal',
        newDriverFatherName: 'Abdul Karim',
        sealNumberBefore: 'IR-SEAL-88912',
        sealNumberAfter: 'AF-SEAL-44102',
        cargoCondition: 'INTACT_SOUND',
        tallyCartonsCount: 1420,
        remarks: 'Direct cross-dock transloading of reefer cargo. Genset operational at -18°C.',
        recordedBy: 'Zabiullah (Islam Qala Field Agent)',
        createdAt: '2026-03-22T12:00:00Z',
      },
    ],
    breakdownHistory: [],
    expenses: [
      {
        id: 'exp-03',
        tripId: 'trp-2026-0002',
        category: 'BORDER_CLEARANCE_FEE',
        description: 'Customs gate-in and phytosanitary inspection fee',
        amount: 4500,
        currency: 'AFN',
        receiptNumber: 'IQ-CUST-4412',
        date: '2026-03-22',
        paymentStatus: 'ADVANCED',
      },
    ],
    internalNotes: 'Transloaded successfully from Iranian truck; awaiting final customs stamp.',
    customerSafeNotes: 'Cargo transloaded into Afghan reefer trailer under constant temperature control at border.',
    createdAt: '2026-03-21T09:00:00Z',
    updatedAt: '2026-03-22T14:15:00Z',
  },
  {
    id: 'trp-2026-0003',
    tripNumber: 'TRP-2026-0003',
    shipmentId: 'shp-2026-0043',
    bolNumber: 'BOL-2026-0043',
    legIndex: 1,
    originLocationName: 'Bandar Abbas Shahid Rajaee Port',
    destinationLocationName: 'Dogharoon Border Terminal',
    borderStation: 'Islam Qala / Dogharoon',
    plannedDepartureDate: '2026-03-21',
    actualDepartureDate: '2026-03-21T18:00:00Z',
    estimatedArrivalDate: '2026-03-24',
    truckId: 'trk-ir-001',
    truckPlate: '72 B 845 IR',
    truckCountry: 'IR',
    driverId: 'drv-004',
    driverName: 'Reza Hosseini',
    driverFatherName: 'Ali Asghar',
    driverPhone: '+98 915 220 4433',
    agreedDriverRent: 1100,
    currency: 'USD',
    advancePaid: 500,
    balancePayable: 600,
    status: 'IN_TRANSIT',
    currentLocationName: 'Bandar Abbas - Dogharoon Highway KM 310',
    transloadHistory: [],
    breakdownHistory: [],
    expenses: [],
    internalNotes: 'Carrying 40HC container MSKU9981240. Onward transfer planned at Dogharoon.',
    customerSafeNotes: 'Container en route from Bandar Abbas Port to Dogharoon border terminal.',
    createdAt: '2026-03-20T12:00:00Z',
    updatedAt: '2026-03-22T16:00:00Z',
  },
]

// ==========================================
// SINGLETON IN-MEMORY DATABASE WITH SYNC
// ==========================================
class FleetOperationsStore {
  private trucks: TruckRecord[] = [...SEED_TRUCKS]
  private drivers: DriverRecord[] = [...SEED_DRIVERS]
  private trips: RoadTripRecord[] = [...SEED_TRIPS]

  public getKpis(): FleetSummaryKpi {
    const totalTrucks = this.trucks.filter((t) => t.isActive).length
    const availableTrucks = this.trucks.filter((t) => t.isActive && t.currentStatus === 'AVAILABLE').length
    const onTripTrucks = this.trucks.filter((t) => t.isActive && (t.currentStatus === 'ON_TRIP' || t.currentStatus === 'ASSIGNED')).length
    const atBorderTrucks = this.trucks.filter((t) => t.isActive && (t.currentStatus === 'BORDER_WAITING' || t.currentStatus === 'CUSTOMS_CLEARANCE' || t.currentStatus === 'TRANSLOADING')).length
    const maintenanceTrucks = this.trucks.filter((t) => t.isActive && (t.currentStatus === 'MAINTENANCE' || t.currentStatus === 'BROKEN_DOWN')).length
    const totalDrivers = this.drivers.length
    const activeDrivers = this.drivers.filter((d) => d.currentStatus === 'ACTIVE' || d.currentStatus === 'ON_TRIP').length
    const activeTrips = this.trips.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length
    const pendingPodCount = this.trips.filter((t) => t.status === 'POD_PENDING' || (t.status === 'DELIVERED' && !t.pod)).length

    return {
      totalTrucks,
      availableTrucks,
      onTripTrucks,
      atBorderTrucks,
      maintenanceTrucks,
      totalDrivers,
      activeDrivers,
      activeTrips,
      pendingPodCount,
    }
  }

  public getTrucks(filter?: { status?: TruckStatus; country?: PlateCountry; search?: string }): TruckRecord[] {
    let result = [...this.trucks]
    if (filter?.status) {
      result = result.filter((t) => t.currentStatus === filter.status)
    }
    if (filter?.country) {
      result = result.filter((t) => t.plateCountry === filter.country)
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (t) =>
          t.plateNumber.toLowerCase().includes(q) ||
          t.truckCode.toLowerCase().includes(q) ||
          (t.plateProvince && t.plateProvince.toLowerCase().includes(q)) ||
          (t.assignedDriverName && t.assignedDriverName.toLowerCase().includes(q)) ||
          (t.truckingCompanyName && t.truckingCompanyName.toLowerCase().includes(q))
      )
    }
    return result
  }

  public getTruckById(id: string): TruckRecord | undefined {
    return this.trucks.find((t) => t.id === id)
  }

  public saveTruck(truck: TruckRecord): TruckRecord {
    const idx = this.trucks.findIndex((t) => t.id === truck.id)
    const now = new Date().toISOString()
    if (idx >= 0) {
      this.trucks[idx] = { ...truck, updatedAt: now }
      return this.trucks[idx]
    } else {
      const newTruck: TruckRecord = {
        ...truck,
        id: truck.id || `trk-${Date.now()}`,
        truckCode: truck.truckCode || `TRK-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: now,
        updatedAt: now,
      }
      this.trucks.unshift(newTruck)
      return newTruck
    }
  }

  public getDrivers(filter?: { status?: DriverStatus; country?: string; search?: string }): DriverRecord[] {
    let result = [...this.drivers]
    if (filter?.status) {
      result = result.filter((d) => d.currentStatus === filter.status)
    }
    if (filter?.country) {
      result = result.filter((d) => d.country === filter.country)
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.fatherName.toLowerCase().includes(q) ||
          d.driverCode.toLowerCase().includes(q) ||
          d.licenseNumber.toLowerCase().includes(q) ||
          d.primaryPhone.includes(q) ||
          (d.passportNumber && d.passportNumber.toLowerCase().includes(q))
      )
    }
    return result
  }

  public getDriverById(id: string): DriverRecord | undefined {
    return this.drivers.find((d) => d.id === id)
  }

  public saveDriver(driver: DriverRecord): DriverRecord {
    const idx = this.drivers.findIndex((d) => d.id === driver.id)
    const now = new Date().toISOString()
    if (idx >= 0) {
      this.drivers[idx] = { ...driver, updatedAt: now }
      return this.drivers[idx]
    } else {
      const newDriver: DriverRecord = {
        ...driver,
        id: driver.id || `drv-${Date.now()}`,
        driverCode: driver.driverCode || `DRV-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: now,
        updatedAt: now,
      }
      this.drivers.unshift(newDriver)
      return newDriver
    }
  }

  public getTrips(filter?: { status?: RoadTripStatus; bolNumber?: string; search?: string }): RoadTripRecord[] {
    let result = [...this.trips]
    if (filter?.status) {
      result = result.filter((t) => t.status === filter.status)
    }
    if (filter?.bolNumber) {
      result = result.filter((t) => t.bolNumber.toLowerCase() === filter.bolNumber!.toLowerCase())
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (t) =>
          t.tripNumber.toLowerCase().includes(q) ||
          t.bolNumber.toLowerCase().includes(q) ||
          t.truckPlate.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.originLocationName.toLowerCase().includes(q) ||
          t.destinationLocationName.toLowerCase().includes(q)
      )
    }
    return result
  }

  public getTripById(id: string): RoadTripRecord | undefined {
    return this.trips.find((t) => t.id === id)
  }

  /**
   * Validate if truck or driver is already occupied on an active trip
   */
  public validateAssignment(
    truckId: string,
    driverId: string,
    excludeTripId?: string
  ): { canAssign: boolean; warnings: string[]; truckConflictTrip?: RoadTripRecord; driverConflictTrip?: RoadTripRecord } {
    const warnings: string[] = []
    let truckConflictTrip: RoadTripRecord | undefined
    let driverConflictTrip: RoadTripRecord | undefined

    const activeTrips = this.trips.filter(
      (t) => t.id !== excludeTripId && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'DELIVERED'
    )

    // Check truck
    truckConflictTrip = activeTrips.find((t) => t.truckId === truckId)
    if (truckConflictTrip) {
      warnings.push(`Truck is currently assigned to active trip ${truckConflictTrip.tripNumber} (Status: ${truckConflictTrip.status}).`)
    }

    // Check driver
    driverConflictTrip = activeTrips.find((t) => t.driverId === driverId)
    if (driverConflictTrip) {
      warnings.push(`Driver is currently assigned to active trip ${driverConflictTrip.tripNumber} (Status: ${driverConflictTrip.status}).`)
    }

    return {
      canAssign: warnings.length === 0,
      warnings,
      truckConflictTrip,
      driverConflictTrip,
    }
  }

  /**
   * Create Road Trip with safety validation and auto-sync to truck/driver status
   */
  public createRoadTrip(
    data: Omit<RoadTripRecord, 'id' | 'createdAt' | 'updatedAt' | 'transloadHistory' | 'breakdownHistory' | 'expenses'>,
    options?: { allowDoubleAssignmentOverride?: boolean; overrideReason?: string }
  ): { trip?: RoadTripRecord; error?: string } {
    const validation = this.validateAssignment(data.truckId, data.driverId)

    if (!validation.canAssign && !options?.allowDoubleAssignmentOverride) {
      return {
        error: `Double assignment blocked: ${validation.warnings.join(' ')} (Requires explicit administrative override).`,
      }
    }

    const now = new Date().toISOString()
    const tripId = `trp-${Date.now()}`
    const tripNumber = data.tripNumber || `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    const newTrip: RoadTripRecord = {
      ...data,
      id: tripId,
      tripNumber,
      transloadHistory: [],
      breakdownHistory: [],
      expenses: [],
      createdAt: now,
      updatedAt: now,
    }

    this.trips.unshift(newTrip)

    // Update truck status
    const truck = this.trucks.find((t) => t.id === data.truckId)
    if (truck) {
      truck.currentStatus = 'ON_TRIP'
      truck.assignedTripId = tripId
      truck.assignedDriverId = data.driverId
      truck.assignedDriverName = data.driverName
      truck.assignedBolNumber = data.bolNumber
      truck.currentLocationName = data.originLocationName
      truck.updatedAt = now
    }

    // Update driver status
    const driver = this.drivers.find((d) => d.id === data.driverId)
    if (driver) {
      driver.currentStatus = 'ON_TRIP'
      driver.currentTripId = tripId
      driver.assignedTruckId = data.truckId
      driver.assignedTruckPlate = data.truckPlate
      driver.currentLocationName = data.originLocationName
      driver.updatedAt = now
    }

    return { trip: newTrip }
  }

  /**
   * Update Trip status and checkpoint location
   */
  public updateTripStatus(
    tripId: string,
    status: RoadTripStatus,
    currentLocationName?: string,
    internalNotes?: string,
    customerSafeNotes?: string
  ): RoadTripRecord | undefined {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return undefined

    const now = new Date().toISOString()
    trip.status = status
    if (currentLocationName) trip.currentLocationName = currentLocationName
    if (internalNotes) trip.internalNotes = internalNotes
    if (customerSafeNotes) trip.customerSafeNotes = customerSafeNotes
    trip.updatedAt = now

    // Synchronize linked truck status
    const truck = this.trucks.find((t) => t.id === trip.truckId)
    if (truck) {
      if (currentLocationName) truck.currentLocationName = currentLocationName
      if (status === 'AT_BORDER') truck.currentStatus = 'BORDER_WAITING'
      else if (status === 'BORDER_CLEARANCE') truck.currentStatus = 'CUSTOMS_CLEARANCE'
      else if (status === 'TRANSLOADING') truck.currentStatus = 'TRANSLOADING'
      else if (status === 'IN_TRANSIT' || status === 'EN_ROUTE_DESTINATION') truck.currentStatus = 'ON_TRIP'
      else if (status === 'DELIVERED' || status === 'COMPLETED') {
        truck.currentStatus = 'AVAILABLE'
        truck.assignedTripId = undefined
        truck.assignedBolNumber = undefined
      } else if (status === 'BROKEN_DOWN') {
        truck.currentStatus = 'BROKEN_DOWN'
      }
      truck.updatedAt = now
    }

    // Synchronize driver status
    const driver = this.drivers.find((d) => d.id === trip.driverId)
    if (driver) {
      if (currentLocationName) driver.currentLocationName = currentLocationName
      if (status === 'AT_BORDER' || status === 'BORDER_CLEARANCE') driver.currentStatus = 'BORDER_DELAYED'
      else if (status === 'DELIVERED' || status === 'COMPLETED') {
        driver.currentStatus = 'ACTIVE'
        driver.currentTripId = undefined
      }
      driver.updatedAt = now
    }

    return trip
  }

  /**
   * Record Border / Yard Transload:
   * Retains the old truck and old driver in the trip's immutable transloadHistory!
   */
  public recordTransload(
    tripId: string,
    data: {
      transloadLocation: string
      transloadDate: string
      newTruckId: string
      newTruckPlate: string
      newDriverId: string
      newDriverName: string
      newDriverFatherName?: string
      sealNumberBefore: string
      sealNumberAfter: string
      cargoCondition: 'INTACT_SOUND' | 'DAMAGED_CARTONS' | 'SEAL_BROKEN_INSPECTED' | 'DISCREPANCY_NOTED'
      tallyCartonsCount: number
      remarks?: string
      recordedBy: string
    }
  ): { trip?: RoadTripRecord; transloadEvent?: TransloadEvent; error?: string } {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const now = new Date().toISOString()

    const event: TransloadEvent = {
      id: `tsl-${Date.now()}`,
      tripId,
      shipmentId: trip.shipmentId,
      transloadLocation: data.transloadLocation,
      transloadDate: data.transloadDate || now,
      oldTruckId: trip.truckId,
      oldTruckPlate: trip.truckPlate,
      oldDriverId: trip.driverId,
      oldDriverName: trip.driverName,
      oldDriverFatherName: trip.driverFatherName,
      newTruckId: data.newTruckId,
      newTruckPlate: data.newTruckPlate,
      newDriverId: data.newDriverId,
      newDriverName: data.newDriverName,
      newDriverFatherName: data.newDriverFatherName,
      sealNumberBefore: data.sealNumberBefore,
      sealNumberAfter: data.sealNumberAfter,
      cargoCondition: data.cargoCondition,
      tallyCartonsCount: data.tallyCartonsCount,
      remarks: data.remarks,
      recordedBy: data.recordedBy,
      createdAt: now,
    }

    // Append to transload history
    trip.transloadHistory.push(event)

    // Free the previous truck
    const oldTruck = this.trucks.find((t) => t.id === trip.truckId)
    if (oldTruck) {
      oldTruck.currentStatus = 'AVAILABLE'
      oldTruck.assignedTripId = undefined
      oldTruck.assignedBolNumber = undefined
      oldTruck.updatedAt = now
    }

    // Free the previous driver
    const oldDriver = this.drivers.find((d) => d.id === trip.driverId)
    if (oldDriver) {
      oldDriver.currentStatus = 'ACTIVE'
      oldDriver.currentTripId = undefined
      oldDriver.updatedAt = now
    }

    // Assign new truck and driver to current active leg
    trip.truckId = data.newTruckId
    trip.truckPlate = data.newTruckPlate
    trip.driverId = data.newDriverId
    trip.driverName = data.newDriverName
    trip.driverFatherName = data.newDriverFatherName

    // Lookup driver phone
    const newDriverObj = this.drivers.find((d) => d.id === data.newDriverId)
    if (newDriverObj) {
      trip.driverPhone = newDriverObj.primaryPhone
      newDriverObj.currentStatus = 'ON_TRIP'
      newDriverObj.currentTripId = trip.id
      newDriverObj.assignedTruckId = data.newTruckId
      newDriverObj.assignedTruckPlate = data.newTruckPlate
      newDriverObj.updatedAt = now
    }

    // Occupy new truck
    const newTruckObj = this.trucks.find((t) => t.id === data.newTruckId)
    if (newTruckObj) {
      trip.truckCountry = newTruckObj.plateCountry
      newTruckObj.currentStatus = 'ON_TRIP'
      newTruckObj.assignedTripId = trip.id
      newTruckObj.assignedBolNumber = trip.bolNumber
      newTruckObj.assignedDriverId = data.newDriverId
      newTruckObj.assignedDriverName = data.newDriverName
      newTruckObj.updatedAt = now
    }

    trip.status = 'IN_TRANSIT'
    trip.currentLocationName = data.transloadLocation
    trip.customerSafeNotes = `Cargo safely transloaded to truck ${data.newTruckPlate} at ${data.transloadLocation}. New seal: ${data.sealNumberAfter}.`
    trip.updatedAt = now

    return { trip, transloadEvent: event }
  }

  /**
   * Record Breakdown Incident
   */
  public recordBreakdown(
    tripId: string,
    data: {
      breakdownLocation: string
      issueDescription: string
      severity: 'MINOR_ROADSIDE' | 'MODERATE_TOWING_REQUIRED' | 'CRITICAL_ENGINE_FAILURE'
      mechanicDispatched?: boolean
      mechanicDetails?: string
      notes?: string
    }
  ): { trip?: RoadTripRecord; breakdownEvent?: BreakdownEvent; error?: string } {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const now = new Date().toISOString()
    const breakdown: BreakdownEvent = {
      id: `bd-${Date.now()}`,
      tripId,
      truckId: trip.truckId,
      truckPlate: trip.truckPlate,
      driverId: trip.driverId,
      driverName: trip.driverName,
      breakdownLocation: data.breakdownLocation,
      breakdownTime: now,
      issueDescription: data.issueDescription,
      severity: data.severity,
      status: data.mechanicDispatched ? 'ASSISTANCE_DISPATCHED' : 'REPORTED',
      mechanicDispatched: data.mechanicDispatched || false,
      mechanicDetails: data.mechanicDetails,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    }

    trip.breakdownHistory.push(breakdown)
    trip.status = 'BROKEN_DOWN'
    trip.currentLocationName = data.breakdownLocation
    trip.customerSafeNotes = `Truck paused en route at ${data.breakdownLocation} for technical maintenance.`
    trip.updatedAt = now

    // Mark truck broken down
    const truck = this.trucks.find((t) => t.id === trip.truckId)
    if (truck) {
      truck.currentStatus = 'BROKEN_DOWN'
      truck.currentLocationName = data.breakdownLocation
      truck.updatedAt = now
    }

    return { trip, breakdownEvent: breakdown }
  }

  /**
   * Resolve Breakdown: Repaired or relief truck transshipment
   */
  public resolveBreakdown(
    tripId: string,
    breakdownId: string,
    resolution: {
      action: 'REPAIRED_RESUMED' | 'CARGO_TRANSFERRED'
      resumedAt: string
      repairCost?: number
      currency?: 'AFN' | 'USD' | 'IRR' | 'PKR'
      notes?: string
      reliefTruckId?: string
      reliefTruckPlate?: string
      reliefDriverId?: string
      reliefDriverName?: string
      newSealNumber?: string
    }
  ): { trip?: RoadTripRecord; error?: string } {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const bd = trip.breakdownHistory.find((b) => b.id === breakdownId)
    if (!bd) return { error: `Breakdown event not found: ${breakdownId}` }

    const now = new Date().toISOString()
    bd.status = resolution.action
    bd.resumedAt = resolution.resumedAt || now
    bd.repairCost = resolution.repairCost
    bd.currency = resolution.currency || 'AFN'
    bd.notes = resolution.notes
    bd.updatedAt = now

    if (resolution.action === 'REPAIRED_RESUMED') {
      trip.status = 'IN_TRANSIT'
      trip.customerSafeNotes = 'Technical maintenance resolved. Movement resumed towards destination.'
      const truck = this.trucks.find((t) => t.id === trip.truckId)
      if (truck) truck.currentStatus = 'ON_TRIP'
    } else if (resolution.action === 'CARGO_TRANSFERRED' && resolution.reliefTruckId && resolution.reliefDriverId) {
      // Execute transload to relief vehicle
      this.recordTransload(tripId, {
        transloadLocation: bd.breakdownLocation,
        transloadDate: now,
        newTruckId: resolution.reliefTruckId,
        newTruckPlate: resolution.reliefTruckPlate || 'Relief Plate',
        newDriverId: resolution.reliefDriverId,
        newDriverName: resolution.reliefDriverName || 'Relief Driver',
        sealNumberBefore: 'EXISTING_SEAL',
        sealNumberAfter: resolution.newSealNumber || 'RELIEF-SEAL-01',
        cargoCondition: 'INTACT_SOUND',
        tallyCartonsCount: 0,
        remarks: `Transferred cargo to relief truck following engine breakdown. ${resolution.notes || ''}`,
        recordedBy: 'Fleet Operations Dispatcher',
      })
      bd.reliefTruckDispatched = true
      bd.reliefTruckId = resolution.reliefTruckId
      bd.reliefTruckPlate = resolution.reliefTruckPlate
    }

    trip.updatedAt = now
    return { trip }
  }

  /**
   * Record Proof of Delivery (POD)
   */
  public recordPod(
    tripId: string,
    data: Omit<PodRecord, 'id' | 'tripId' | 'createdAt'>
  ): { trip?: RoadTripRecord; pod?: PodRecord; error?: string } {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const now = new Date().toISOString()
    const pod: PodRecord = {
      ...data,
      id: `pod-${Date.now()}`,
      tripId,
      createdAt: now,
    }

    trip.pod = pod
    trip.status = 'COMPLETED'
    trip.actualArrivalDate = data.deliveryDate || now
    trip.customerSafeNotes = `Delivered to ${data.receiverName} on ${data.deliveryDate}. Received ${data.receivedCartons} cartons.`
    trip.updatedAt = now

    // Free truck
    const truck = this.trucks.find((t) => t.id === trip.truckId)
    if (truck) {
      truck.currentStatus = 'AVAILABLE'
      truck.assignedTripId = undefined
      truck.assignedBolNumber = undefined
      truck.updatedAt = now
    }

    // Free driver
    const driver = this.drivers.find((d) => d.id === trip.driverId)
    if (driver) {
      driver.currentStatus = 'ACTIVE'
      driver.currentTripId = undefined
      driver.updatedAt = now
    }

    return { trip, pod }
  }

  /**
   * Add Trip Expense Line
   */
  public addTripExpense(
    tripId: string,
    expense: Omit<TripExpenseLine, 'id' | 'tripId'>
  ): { trip?: RoadTripRecord; expense?: TripExpenseLine; error?: string } {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const newExpense: TripExpenseLine = {
      ...expense,
      id: `exp-${Date.now()}`,
      tripId,
    }

    trip.expenses.push(newExpense)
    trip.updatedAt = new Date().toISOString()
    return { trip, expense: newExpense }
  }

  /**
   * Generate Driver Operational Dispatch Message (WhatsApp)
   */
  public generateDriverWhatsAppDispatch(trip: RoadTripRecord, lang: 'dari' | 'pashto' | 'en' = 'dari'): string {
    const truck = this.getTruckById(trip.truckId)
    const plateStr = `${truck?.plateProvince || ''} ${trip.truckPlate}`.trim()

    if (lang === 'pashto') {
      return (
        `*د بار اخیستلو او حرکت امرپاڼه — سکای اریانا لمیټډ*\n\n` +
        `محترم موټرچلوونکی: *${trip.driverName}* (د ${trip.driverFatherName || '—'} زوی)\n` +
        `د موټر پلیټ شمېره: *${plateStr}*\n` +
        `د سفر شمېره: *${trip.tripNumber}*\n` +
        `د بارنامې شمېره (BOL): *${trip.bolNumber}*\n\n` +
        `📍 د بار بارولو ځای: *${trip.originLocationName}*\n` +
        `🏁 د بار رسولو منزل: *${trip.destinationLocationName}*\n` +
        `🛂 د ګمرک پوله: *${trip.borderStation || 'مستقیم'}*\n` +
        `📅 د حرکت نېټه: *${trip.plannedDepartureDate}*\n\n` +
        `💰 د موټر توافق شوې کرایه: *${trip.agreedDriverRent.toLocaleString()} ${trip.currency}*\n` +
        `💵 ورکړل شوی پیشکي (Advance): *${trip.advancePaid.toLocaleString()} ${trip.currency}*\n` +
        `⚖️ د رسیدلو وروسته پاتې رقم: *${trip.balancePayable.toLocaleString()} ${trip.currency}*\n\n` +
        `⚠️ *مهم لارښوونه:* لطفا د وزن تله (ترازو) او د ګمرک اسناد د لارې په اوږدو کې وساتئ او هر چک‌پاینټ ته د رسیدو پر مهال خپل وضعیت راپور کړئ.`
      )
    }

    if (lang === 'dari') {
      return (
        `*دستور حرکت و حواله باربری — شرکت اسکای آریانا لیمیتد*\n\n` +
        `راننده محترم: *${trip.driverName}* (فرزند ${trip.driverFatherName || '—'})\n` +
        `شماره پلیت موتر: *${plateStr}*\n` +
        `شماره سفر: *${trip.tripNumber}*\n` +
        `شماره بارنامه (BOL): *${trip.bolNumber}*\n\n` +
        `📍 محل بارگیری/مبداء: *${trip.originLocationName}*\n` +
        `🏁 مقصد تحویل دهی: *${trip.destinationLocationName}*\n` +
        `🛂 گمرک و مرز ترانزیتی: *${trip.borderStation || 'مستقیم'}*\n` +
        `📅 تاریخ حرکت: *${trip.plannedDepartureDate}*\n\n` +
        `💰 کرایه توافق شده موتر: *${trip.agreedDriverRent.toLocaleString()} ${trip.currency}*\n` +
        `💵 پیش‌پرداخت تسلیم شده: *${trip.advancePaid.toLocaleString()} ${trip.currency}*\n` +
        `⚖️ مانده قابل پرداخت پس از تحویلی و رسید: *${trip.balancePayable.toLocaleString()} ${trip.currency}*\n\n` +
        `⚠️ *نکات ضروری:* حفظ برگه باسکول و مهرهای گمرکی الزامی است. در صورت بروز هرگونه توقف یا نقص فنی سریعاً به مدیریت عملیات ترانزیت اطلاع دهید.`
      )
    }

    return (
      `*DRIVER DISPATCH ORDER — SKY ARIANA LIMITED*\n\n` +
      `Driver: *${trip.driverName}* (Father: ${trip.driverFatherName || 'N/A'})\n` +
      `Truck Plate: *${plateStr}*\n` +
      `Trip Ref: *${trip.tripNumber}*\n` +
      `BOL Ref: *${trip.bolNumber}*\n\n` +
      `📍 Origin / Pickup: *${trip.originLocationName}*\n` +
      `🏁 Destination: *${trip.destinationLocationName}*\n` +
      `🛂 Transit Border: *${trip.borderStation || 'Direct'}*\n` +
      `📅 Planned Departure: *${trip.plannedDepartureDate}*\n\n` +
      `💰 Agreed Driver Rent: *${trip.agreedDriverRent.toLocaleString()} ${trip.currency}*\n` +
      `💵 Advance Paid: *${trip.advancePaid.toLocaleString()} ${trip.currency}*\n` +
      `⚖️ Balance on Delivery / POD: *${trip.balancePayable.toLocaleString()} ${trip.currency}*\n\n` +
      `⚠️ Maintain weighbridge receipts and border stamps. Report waypoint arrivals immediately.`
    )
  }

  /**
   * Generate Customer-Safe Truck Update (WhatsApp)
   * GUARANTEE: Driver Tazkira, Passport, Personal Phone, and Driver Rent are NEVER exposed!
   */
  public generateCustomerSafeTruckUpdate(trip: RoadTripRecord, lang: 'dari' | 'pashto' | 'en' = 'dari'): string {
    const truck = this.getTruckById(trip.truckId)
    const plateStr = `${truck?.plateProvince || ''} ${trip.truckPlate}`.trim()
    const driverFirstName = trip.driverName.split(' ')[0]

    if (lang === 'dari') {
      return (
        `*اطلاعیه وضعیت انتقال محموله — اسکای آریانا لیمیتد*\n\n` +
        `محترم مشتری گرامی، وضعیت حمل جاده‌ای بارنامه *${trip.bolNumber}* به شرح زیر است:\n\n` +
        `🚛 موتر حمل بار: *${plateStr}*\n` +
        `👤 راننده موتر: *${driverFirstName}*\n` +
        `📍 موقعیت فعلی: *${trip.currentLocationName}*\n` +
        `🚦 وضعیت حرکت: *${trip.status}*\n` +
        `🏁 مقصد نهایی: *${trip.destinationLocationName}*\n` +
        `📅 تخمین رسیدن به مقصد: *${trip.estimatedArrivalDate}*\n\n` +
        `📝 یادداشت: ${trip.customerSafeNotes || 'محموله با رعایت کلیه استانداردهای ترانزیتی در حال انتقال است.'}\n\n` +
        `جهت هرگونه هماهنگی با دفتر مرکزی اسکای آریانا در ارتباط باشید.`
      )
    }

    if (lang === 'pashto') {
      return (
        `*د بار وړلو د وضعیت خبرتیا — سکای اریانا لمیټډ*\n\n` +
        `محترم پیرودونکی، د *${trip.bolNumber}* بارنامې د ځمکني ټرانسپورټ وضعیت:\n\n` +
        `🚛 د موټر شمېره: *${plateStr}*\n` +
        `👤 موټرچلوونکی: *${driverFirstName}*\n` +
        `📍 اوسنی موقعیت: *${trip.currentLocationName}*\n` +
        `🚦 روان وضعیت: *${trip.status}*\n` +
        `🏁 وروستی منزل: *${trip.destinationLocationName}*\n` +
        `📅 منزل ته د رسیدو اټکل: *${trip.estimatedArrivalDate}*\n\n` +
        `📝 یادونه: ${trip.customerSafeNotes || 'محموله په منظم ډول د منزل په لور روانه ده.'}\n\n` +
        `د نورو معلوماتو لپاره د سکای اریانا عملیاتي څانګې سره اړیکه ونیسئ.`
      )
    }

    return (
      `*ROAD TRANSIT STATUS UPDATE — SKY ARIANA LIMITED*\n\n` +
      `Dear Customer, here is the current road freight status for Bill of Lading *${trip.bolNumber}*:\n\n` +
      `🚛 Transport Vehicle: *${plateStr}*\n` +
      `👤 Driver: *${driverFirstName}*\n` +
      `📍 Current Waypoint: *${trip.currentLocationName}*\n` +
      `🚦 Leg Status: *${trip.status}*\n` +
      `🏁 Final Destination: *${trip.destinationLocationName}*\n` +
      `📅 ETA Destination: *${trip.estimatedArrivalDate}*\n\n` +
      `📝 Operational Note: ${trip.customerSafeNotes || 'Shipment moving on schedule in good order.'}\n\n` +
      `Sky Ariana Operations Control Center`
    )
  }

  /**
   * Get Availability Board
   */
  public getAvailabilityBoard() {
    const borders = ['Islam Qala', 'Torghundi', 'Hairatan', 'Spin Boldak', 'Kabul Depot', 'Other']

    const board: Record<string, { availableTrucks: TruckRecord[]; waitingTrucks: TruckRecord[]; availableDrivers: DriverRecord[] }> = {}

    borders.forEach((b) => {
      board[b] = {
        availableTrucks: this.trucks.filter((t) => t.isActive && t.currentStatus === 'AVAILABLE' && (t.currentLocationName.includes(b) || t.currentBorderStation === b)),
        waitingTrucks: this.trucks.filter((t) => t.isActive && (t.currentStatus === 'BORDER_WAITING' || t.currentStatus === 'CUSTOMS_CLEARANCE' || t.currentStatus === 'TRANSLOADING') && (t.currentLocationName.includes(b) || t.currentBorderStation === b)),
        availableDrivers: this.drivers.filter((d) => d.currentStatus === 'ACTIVE' && (d.currentLocationName.includes(b) || d.borderCrossingsHandled?.includes(b))),
      }
    })

    return board
  }
}

// Global Singleton Export
export const fleetOperationsService = new FleetOperationsStore()
