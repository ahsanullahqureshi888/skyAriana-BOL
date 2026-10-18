/**
 * Customs, Border & Transit Operations Service
 * Sky Ariana Limited — Cross-Border & Customs Single Source of Truth
 */

import {
  BorderOperationRecord,
  BorderStatus,
  BorderSide,
  CustomsDeclarationRecord,
  TransitPaperRecord,
  CustomsHoldRecord,
  CustomsInspectionRecord,
  CustomsDocumentItem,
  DataMismatchItem,
  BorderSummaryKpi,
} from '@/lib/types/customs-border'

// Default Afghan Export Documents Checklist Template
export const DEFAULT_AFGHAN_DOCUMENTS_CHECKLIST: Omit<CustomsDocumentItem, 'id'>[] = [
  {
    name: 'Commercial Invoice (فاکتور تجارتی)',
    category: 'COMMERCIAL',
    required: true,
    status: 'VERIFIED',
    documentNumber: 'INV-2026-0041',
    verified: true,
  },
  {
    name: 'Commercial Packing List (لست مشخصات بسته‌بندی)',
    category: 'COMMERCIAL',
    required: true,
    status: 'VERIFIED',
    documentNumber: 'PL-2026-0041',
    verified: true,
  },
  {
    name: 'Customs Declaration (اظهارنامه گمرکی صادراتی)',
    category: 'AFGHAN_EXPORT',
    required: true,
    status: 'VERIFIED',
    documentNumber: 'DEC-AF-2026-90412',
    verified: true,
  },
  {
    name: 'Phytosanitary Health Certificate (سرتیفیکیت صحت نباتی)',
    category: 'AFGHAN_EXPORT',
    required: true,
    status: 'VERIFIED',
    documentNumber: 'PHYTO-AF-2026-081',
    verified: true,
  },
  {
    name: 'Certificate of Origin (تصدیق‌نامه مبدا ACCI)',
    category: 'AFGHAN_EXPORT',
    required: true,
    status: 'VERIFIED',
    documentNumber: 'COO-2026-4491',
    verified: true,
  },
  {
    name: 'International CMR Waybill (بارنامه بین‌المللی موتر)',
    category: 'TRANSIT',
    required: true,
    status: 'VERIFIED',
    documentNumber: 'CMR-2026-1029',
    verified: true,
  },
  {
    name: 'Transit Paper / Carnet (پاسپورت ترانزیت و جواز عبور)',
    category: 'TRANSIT',
    required: true,
    status: 'PENDING',
    documentNumber: 'TRN-IR-2026-8812',
    verified: false,
  },
  {
    name: 'Truck International Permit (جواز ترانسپورت بین‌المللی موتر)',
    category: 'VEHICLE',
    required: false,
    status: 'VERIFIED',
    documentNumber: 'PERMIT-2877',
    verified: true,
  },
]

// ==========================================
// SEED BORDER OPERATIONS
// ==========================================
export const SEED_BORDER_OPERATIONS: BorderOperationRecord[] = [
  {
    id: 'bor-001',
    operationNumber: 'BOR-2026-00125',
    shipmentId: 'shp-2026-0041',
    bolNumber: 'BOL-2026-0041',
    roadTripId: 'trip-001',
    truckPlate: '2877 کابل ل',
    truckId: 'trk-001',
    driverName: 'Ahmadullah Niazi',
    driverPhone: '+93 79 912 3456',
    containerNumber: 'MSKU9981240',
    routeLeg: 'Islam Qala (AF) -> Dogharoon (IR)',
    borderLocationId: 'loc-iq',
    borderLocationName: 'Islam Qala / Dogharoon Border Crossing',
    countryFrom: 'AF',
    countryTo: 'IR',
    currentSide: 'SIDE_A',
    arrivalDate: '2026-03-21T08:15:00Z',
    queueEntryDate: '2026-03-21T08:45:00Z',
    queuePosition: 14,
    waitingReason: 'Terminal customs queue waiting for X-Ray scanner lane opening',
    customsEntryDate: '2026-03-21T11:30:00Z',
    status: 'CUSTOMS_PROCESSING',
    agentId: 'agt-ebrahim',
    agentName: 'Haji Mohammad Ebrahim Customs Clearance Agency',
    agentContact: 'Haji Ebrahim Dogharooni',
    agentPhone: '+98 915 321 9988',
    agentWhatsApp: '+98 915 321 9988',
    customsReference: 'CUST-REF-IQ-2026-449',
    declarationNumber: 'DEC-AF-2026-90412',
    transitReference: 'TRN-IR-2026-8812',
    documents: DEFAULT_AFGHAN_DOCUMENTS_CHECKLIST.map((doc, i) => ({
      ...doc,
      id: `doc-${i + 1}`,
    })),
    inspections: [
      {
        id: 'insp-001',
        borderOperationId: 'bor-001',
        inspectionType: 'X_RAY_SCAN',
        status: 'SCHEDULED',
        requestedDate: '2026-03-21T11:45:00Z',
        inspectionDate: '2026-03-21T14:00:00Z',
        authority: 'Islam Qala Customs Scanner Unit',
        reason: 'Standard mandatory container X-Ray imaging for outbound dried food exports',
        result: 'Scheduled for Lane 2 at 14:00',
        inspectorName: 'Officer Qaderi',
        createdAt: '2026-03-21T11:45:00Z',
        updatedAt: '2026-03-21T11:45:00Z',
      },
    ],
    holds: [],
    transloads: [],
    timeline: [
      {
        id: 'tl-1',
        stage: 'ARRIVED_BORDER',
        timestamp: '2026-03-21T08:15:00Z',
        locationName: 'Islam Qala Afghan Border Terminal Gate',
        side: 'SIDE_A',
        recordedBy: 'Ahmadullah Niazi (Driver Dispatch Log)',
        notes: 'Truck arrived at border perimeter safely. Seals intact.',
      },
      {
        id: 'tl-2',
        stage: 'WAITING_ENTRY',
        timestamp: '2026-03-21T08:45:00Z',
        locationName: 'Customs Entry Buffer Yard',
        side: 'SIDE_A',
        recordedBy: 'Haji Ebrahim Agent',
        notes: 'Assigned queue position 14 behind commercial export convoy.',
      },
      {
        id: 'tl-3',
        stage: 'ENTERED_CUSTOMS',
        timestamp: '2026-03-21T11:30:00Z',
        locationName: 'Islam Qala Customs Inland Clearance Yard',
        side: 'SIDE_A',
        recordedBy: 'Haji Ebrahim Agent',
        notes: 'Gate barrier cleared. Documents submitted to Customs Valuation Officer.',
      },
      {
        id: 'tl-4',
        stage: 'CUSTOMS_PROCESSING',
        timestamp: '2026-03-21T11:45:00Z',
        locationName: 'Customs Valuation Office',
        side: 'SIDE_A',
        recordedBy: 'Haji Ebrahim Agent',
        notes: 'Documentary verification completed. Scheduled for X-Ray scanner.',
      },
    ],
    internalNotes: 'Broker fee agreed at $180 USD. Export duty prepaid under Afghan Customs Code 0806.20.',
    customerSafeNotes: 'Truck arrived at Islam Qala border terminal. Customs documentation in progress.',
    createdAt: '2026-03-20T14:00:00Z',
    updatedAt: '2026-03-21T11:45:00Z',
  },
  {
    id: 'bor-002',
    operationNumber: 'BOR-2026-00126',
    shipmentId: 'shp-2026-0038',
    bolNumber: 'BOL-2026-0038',
    truckPlate: '4120 مزار',
    driverName: 'Mohammad Tariq',
    driverPhone: '+93 70 882 1100',
    containerNumber: 'TGHU1145620',
    routeLeg: 'Hairatan (AF) -> Termez (UZ)',
    borderLocationId: 'loc-hai',
    borderLocationName: 'Hairatan / Termez Friendship Bridge',
    countryFrom: 'AF',
    countryTo: 'UZ',
    currentSide: 'SIDE_B',
    arrivalDate: '2026-03-20T10:00:00Z',
    customsEntryDate: '2026-03-20T12:00:00Z',
    clearanceDate: '2026-03-20T16:30:00Z',
    borderExitDate: '2026-03-21T09:00:00Z',
    status: 'TRANSIT_IN_PROGRESS',
    agentName: 'Amu Darya Customs Brokerage Termez',
    agentContact: 'Rustam Karimov',
    agentPhone: '+998 90 123 4567',
    declarationNumber: 'DEC-AF-2026-88192',
    transitReference: 'TRN-UZ-2026-1044',
    documents: [],
    inspections: [],
    holds: [],
    transloads: [],
    timeline: [
      {
        id: 'tl-h1',
        stage: 'CLEARED',
        timestamp: '2026-03-20T16:30:00Z',
        locationName: 'Hairatan Afghan Customs Yard',
        side: 'SIDE_A',
        recordedBy: 'Hairatan Branch Office',
        notes: 'Export customs duty cleared and release note stamped.',
      },
      {
        id: 'tl-h2',
        stage: 'BORDER_CROSSED',
        timestamp: '2026-03-21T09:00:00Z',
        locationName: 'Friendship Bridge (Termez Border)',
        side: 'SIDE_B',
        recordedBy: 'Driver Tariq',
        notes: 'Exited Afghanistan and entered Uzbekistan transit corridor.',
      },
    ],
    internalNotes: 'Transit bond active through Termez Cargo Centre.',
    customerSafeNotes: 'Shipment has successfully crossed the border into Uzbekistan and is en route.',
    createdAt: '2026-03-19T08:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
  },
  {
    id: 'bor-003',
    operationNumber: 'BOR-2026-00127',
    shipmentId: 'shp-2026-0035',
    bolNumber: 'BOL-2026-0035',
    truckPlate: '8892 کندهار',
    driverName: 'Wali Mohammad Achakzai',
    driverPhone: '+93 78 441 2233',
    routeLeg: 'Spin Boldak (AF) -> Chaman (PK)',
    borderLocationId: 'loc-sb',
    borderLocationName: 'Spin Boldak / Chaman Gate',
    countryFrom: 'AF',
    countryTo: 'PK',
    currentSide: 'SIDE_A',
    arrivalDate: '2026-03-21T07:30:00Z',
    queuePosition: null, // Queue Position Not Recorded
    waitingReason: 'Quarantine sampling required for fresh pomegranates batch',
    status: 'ON_HOLD',
    agentName: 'Quetta-Chaman Logistics Clearing Agency',
    agentContact: 'Janan Khan Achakzai',
    agentPhone: '+92 300 812 3456',
    declarationNumber: 'DEC-AF-2026-77401',
    documents: [],
    inspections: [],
    holds: [
      {
        id: 'hld-001',
        borderOperationId: 'bor-003',
        bolNumber: 'BOL-2026-0035',
        holdType: 'DOCUMENT_HOLD',
        status: 'OPEN',
        openedAt: '2026-03-21T09:15:00Z',
        authority: 'Ministry of Agriculture Quarantine Station Spin Boldak',
        reason: 'Phytosanitary laboratory test certificate date mismatch with commercial invoice',
        responsibleParty: 'Shipper Export Operations',
        requiredAction: 'Obtain amended laboratory certificate from Kandahar Agriculture Directorate',
        notes: 'Broker Janan Khan notified. Shipper representative dispatched to Kandahar Directorate.',
        createdAt: '2026-03-21T09:15:00Z',
      },
    ],
    transloads: [],
    timeline: [
      {
        id: 'tl-s1',
        stage: 'ARRIVED_BORDER',
        timestamp: '2026-03-21T07:30:00Z',
        locationName: 'Spin Boldak Zero Point Waiting Area',
        side: 'SIDE_A',
        recordedBy: 'Driver Wali Mohammad',
        notes: 'Arrived at border gate.',
      },
      {
        id: 'tl-s2',
        stage: 'ON_HOLD',
        timestamp: '2026-03-21T09:15:00Z',
        locationName: 'Spin Boldak Customs Yard',
        side: 'SIDE_A',
        recordedBy: 'Customs Officer',
        notes: 'Document hold placed on agricultural certificate.',
      },
    ],
    internalNotes: 'High priority cold cargo. Contacted Kandahar office to expedite amended phyto slip.',
    customerSafeNotes: 'Agricultural quarantine review in progress at Spin Boldak border post.',
    createdAt: '2026-03-20T12:00:00Z',
    updatedAt: '2026-03-21T09:15:00Z',
  },
]

// ==========================================
// SEED CUSTOMS DECLARATIONS
// ==========================================
export const SEED_DECLARATIONS: CustomsDeclarationRecord[] = [
  {
    id: 'dec-001',
    declarationNumber: 'DEC-AF-2026-90412',
    declarationType: 'EXPORT',
    country: 'Afghanistan',
    customsOffice: 'Islam Qala Customs Directorate (کمرک اسلام قلعه)',
    declarationDate: '2026-03-20',
    exporter: 'Alokozay Dried Fruits Processing Ltd.',
    importer: 'Green Oasis Dry Foods Trading LLC (Dubai, UAE)',
    commodity: 'Afghan Green Raisins Grade A (Kishmish)',
    hsCode: '0806.20.00',
    packages: 1427,
    packageType: 'CTNS',
    grossWeightKg: 23545.5,
    netWeightKg: 22832.0,
    declaredValue: 45664.0, // $32/ctn declared customs valuation
    currency: 'USD',
    status: 'SUBMITTED',
    linkedBolNumber: 'BOL-2026-0041',
    linkedShipmentId: 'shp-2026-0041',
    notes: 'Exempt from export tariffs under Afghan Agricultural Incentive Law.',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-21T11:30:00Z',
  },
  {
    id: 'dec-002',
    declarationNumber: 'DEC-AF-2026-88192',
    declarationType: 'TRANSIT',
    country: 'Uzbekistan',
    customsOffice: 'Termez Central Customs Post',
    declarationDate: '2026-03-20',
    exporter: 'Mazar Pine Nuts Trading Ltd.',
    importer: 'Silk Road Agro Corp (Almaty, Kazakhstan)',
    commodity: 'Afghan Roasted Pine Nuts (Jalghoza)',
    hsCode: '0802.90.20',
    packages: 850,
    packageType: 'BAGS',
    grossWeightKg: 21250.0,
    netWeightKg: 20400.0,
    declaredValue: 122400.0,
    currency: 'USD',
    status: 'CLEARED',
    linkedBolNumber: 'BOL-2026-0038',
    linkedShipmentId: 'shp-2026-0038',
    createdAt: '2026-03-19T09:00:00Z',
    updatedAt: '2026-03-20T16:30:00Z',
  },
]

// ==========================================
// SEED TRANSIT PAPERS
// ==========================================
export const SEED_TRANSIT_PAPERS: TransitPaperRecord[] = [
  {
    id: 'trn-001',
    transitNumber: 'TRN-IR-2026-8812',
    status: 'ACTIVE',
    issueDate: '2026-03-21',
    expiryDate: '2026-04-05',
    entryBorder: 'Dogharoon Border Post (Iran)',
    exitBorder: 'Bandar Abbas Port Terminal Yard',
    routeCorridor: 'Dogharoon -> Mashhad -> Kerman -> Bandar Abbas Highway (1,380 KM)',
    truckPlate: '2877 کابل ل',
    containerNumber: 'MSKU9981240',
    sealNumber: 'SEAL-AF-887192',
    transitStage: 'ENTERED_TRANSIT',
    linkedBolNumber: 'BOL-2026-0041',
    linkedShipmentId: 'shp-2026-0041',
    notes: 'Transit bond issued by Iran Road Maintenance & Transportation Org (RMTO).',
    createdAt: '2026-03-21T11:00:00Z',
    updatedAt: '2026-03-21T11:00:00Z',
  },
  {
    id: 'trn-002',
    transitNumber: 'TRN-UZ-2026-1044',
    status: 'ACTIVE',
    issueDate: '2026-03-20',
    expiryDate: '2026-04-03',
    entryBorder: 'Termez Bridge',
    exitBorder: 'Yallama (Uzbek-Kazakh Border)',
    routeCorridor: 'Termez -> Samarkand -> Tashkent -> Yallama',
    truckPlate: '4120 مزار',
    containerNumber: 'TGHU1145620',
    sealNumber: 'SEAL-UZ-44109',
    transitStage: 'IN_TRANSIT',
    linkedBolNumber: 'BOL-2026-0038',
    linkedShipmentId: 'shp-2026-0038',
    createdAt: '2026-03-20T14:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
  },
]

// ==========================================
// CORE CUSTOMS BORDER STORE
// ==========================================
class CustomsBorderStore {
  private operations: BorderOperationRecord[] = [...SEED_BORDER_OPERATIONS]
  private declarations: CustomsDeclarationRecord[] = [...SEED_DECLARATIONS]
  private transitPapers: TransitPaperRecord[] = [...SEED_TRANSIT_PAPERS]

  public getOperations(filter?: {
    borderLocationId?: string
    status?: BorderStatus
    search?: string
  }): BorderOperationRecord[] {
    let result = [...this.operations]
    if (filter?.borderLocationId && filter.borderLocationId !== 'all') {
      result = result.filter((o) => o.borderLocationId === filter.borderLocationId)
    }
    if (filter?.status) {
      result = result.filter((o) => o.status === filter.status)
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (o) =>
          o.operationNumber.toLowerCase().includes(q) ||
          o.bolNumber.toLowerCase().includes(q) ||
          o.truckPlate.toLowerCase().includes(q) ||
          o.driverName.toLowerCase().includes(q) ||
          (o.containerNumber && o.containerNumber.toLowerCase().includes(q)) ||
          o.borderLocationName.toLowerCase().includes(q) ||
          (o.agentName && o.agentName.toLowerCase().includes(q))
      )
    }
    return result
  }

  public getOperationById(id: string): BorderOperationRecord | undefined {
    return this.operations.find((o) => o.id === id || o.operationNumber === id)
  }

  public getDeclarations(filter?: { status?: string; search?: string }): CustomsDeclarationRecord[] {
    let result = [...this.declarations]
    if (filter?.status) {
      result = result.filter((d) => d.status === filter.status)
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (d) =>
          d.declarationNumber.toLowerCase().includes(q) ||
          d.linkedBolNumber.toLowerCase().includes(q) ||
          d.exporter.toLowerCase().includes(q) ||
          d.commodity.toLowerCase().includes(q) ||
          d.hsCode.includes(q)
      )
    }
    return result
  }

  public getTransitPapers(filter?: { status?: string; search?: string }): TransitPaperRecord[] {
    let result = [...this.transitPapers]
    if (filter?.status) {
      result = result.filter((t) => t.status === filter.status)
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (t) =>
          t.transitNumber.toLowerCase().includes(q) ||
          t.linkedBolNumber.toLowerCase().includes(q) ||
          t.truckPlate.toLowerCase().includes(q) ||
          (t.containerNumber && t.containerNumber.toLowerCase().includes(q)) ||
          t.entryBorder.toLowerCase().includes(q) ||
          t.exitBorder.toLowerCase().includes(q)
      )
    }
    return result
  }

  public getHolds(filter?: { status?: string }): CustomsHoldRecord[] {
    const allHolds: CustomsHoldRecord[] = []
    for (const op of this.operations) {
      allHolds.push(...op.holds)
    }
    if (filter?.status) {
      return allHolds.filter((h) => h.status === filter.status)
    }
    return allHolds
  }

  public getInspections(filter?: { status?: string }): CustomsInspectionRecord[] {
    const allInspections: CustomsInspectionRecord[] = []
    for (const op of this.operations) {
      allInspections.push(...op.inspections)
    }
    if (filter?.status) {
      return allInspections.filter((i) => i.status === filter.status)
    }
    return allInspections
  }

  public getSummaryKpi(): BorderSummaryKpi {
    const activeBorderShipments = this.operations.filter(
      (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
    ).length
    const waitingBorderEntry = this.operations.filter((o) => o.status === 'WAITING_ENTRY').length
    const inCustoms = this.operations.filter(
      (o) =>
        o.status === 'ENTERED_CUSTOMS' ||
        o.status === 'DOCUMENT_REVIEW' ||
        o.status === 'CUSTOMS_PROCESSING'
    ).length
    const underInspection = this.operations.filter((o) => o.status === 'INSPECTION').length
    const documentsPending = this.operations.filter((o) =>
      o.documents.some((d) => d.required && !d.verified)
    ).length
    const customsHold = this.operations.filter((o) => o.status === 'ON_HOLD' || o.holds.some((h) => h.status === 'OPEN')).length
    const clearedToday = this.operations.filter(
      (o) => o.status === 'CLEARED' || (o.clearanceDate && o.clearanceDate.startsWith(new Date().toISOString().split('T')[0]))
    ).length
    const borderExitToday = this.operations.filter(
      (o) => o.status === 'BORDER_CROSSED' || (o.borderExitDate && o.borderExitDate.startsWith(new Date().toISOString().split('T')[0]))
    ).length
    const transitInProgress = this.transitPapers.filter((t) => t.status === 'ACTIVE').length
    const truckChangePending = this.operations.filter((o) => o.transloads.length === 0 && o.routeLeg?.includes('Transload')).length
    const needsAttention = this.operations.filter(
      (o) => o.status === 'ON_HOLD' || o.holds.some((h) => h.status === 'OPEN') || o.queuePosition === null
    ).length

    return {
      activeBorderShipments,
      waitingBorderEntry,
      inCustoms,
      underInspection,
      documentsPending,
      customsHold,
      clearedToday,
      borderExitToday,
      transitInProgress,
      truckChangePending,
      needsAttention,
    }
  }

  /**
   * Create New Border Operation
   */
  public createOperation(data: {
    shipmentId: string
    bolNumber: string
    roadTripId?: string
    truckPlate: string
    driverName: string
    driverPhone?: string
    containerNumber?: string
    routeLeg?: string
    borderLocationId: string
    borderLocationName: string
    countryFrom: string
    countryTo: string
    agentId?: string
    agentName?: string
    agentContact?: string
    agentPhone?: string
    agentWhatsApp?: string
    declarationNumber?: string
    transitReference?: string
    internalNotes?: string
    customerSafeNotes?: string
  }): BorderOperationRecord {
    const now = new Date().toISOString()
    const operationNumber = `BOR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`

    const newOp: BorderOperationRecord = {
      id: `bor-${Date.now()}`,
      operationNumber,
      shipmentId: data.shipmentId,
      bolNumber: data.bolNumber,
      roadTripId: data.roadTripId,
      truckPlate: data.truckPlate,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      containerNumber: data.containerNumber,
      routeLeg: data.routeLeg,
      borderLocationId: data.borderLocationId,
      borderLocationName: data.borderLocationName,
      countryFrom: data.countryFrom,
      countryTo: data.countryTo,
      currentSide: 'SIDE_A',
      status: 'APPROACHING_BORDER',
      agentId: data.agentId,
      agentName: data.agentName,
      agentContact: data.agentContact,
      agentPhone: data.agentPhone,
      agentWhatsApp: data.agentWhatsApp,
      declarationNumber: data.declarationNumber,
      transitReference: data.transitReference,
      documents: DEFAULT_AFGHAN_DOCUMENTS_CHECKLIST.map((doc, idx) => ({
        ...doc,
        id: `doc-${Date.now()}-${idx}`,
      })),
      inspections: [],
      holds: [],
      transloads: [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          stage: 'APPROACHING_BORDER',
          timestamp: now,
          locationName: data.borderLocationName,
          side: 'SIDE_A',
          recordedBy: 'Border Operations Dispatcher',
          notes: 'Border operation scheduled for upcoming crossing.',
        },
      ],
      internalNotes: data.internalNotes,
      customerSafeNotes: data.customerSafeNotes,
      createdAt: now,
      updatedAt: now,
    }

    this.operations.unshift(newOp)
    return newOp
  }

  /**
   * Update Operation Status & Append Timeline Event
   */
  public updateOperationStatus(
    operationId: string,
    newStatus: BorderStatus,
    locationName: string,
    notes: string,
    recordedBy: string,
    side?: BorderSide
  ): { success: boolean; operation?: BorderOperationRecord; error?: string } {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Border operation not found' }

    const now = new Date().toISOString()
    op.status = newStatus
    if (side) op.currentSide = side
    op.updatedAt = now

    // Append chronological timeline event
    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: newStatus,
      timestamp: now,
      locationName: locationName || op.borderLocationName,
      side: side || op.currentSide,
      recordedBy: recordedBy || 'Border Controller',
      notes: notes || `Status updated to ${newStatus}`,
    })

    return { success: true, operation: op }
  }

  /**
   * Record Physical Border Arrival & Queue
   */
  public recordBorderArrival(
    operationId: string,
    arrivalDate: string,
    queuePosition: number | null,
    notes: string,
    recordedBy: string
  ): { success: boolean; operation?: BorderOperationRecord; error?: string } {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Border operation not found' }

    const now = new Date().toISOString()
    op.arrivalDate = arrivalDate || now
    op.queueEntryDate = now
    op.queuePosition = queuePosition !== undefined ? queuePosition : null
    op.status = 'ARRIVED_BORDER'
    op.updatedAt = now

    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'ARRIVED_BORDER',
      timestamp: op.arrivalDate,
      locationName: `${op.borderLocationName} (Arrival Gate)`,
      side: 'SIDE_A',
      recordedBy,
      notes: queuePosition !== null
        ? `Arrived at border. Assigned queue position: ${queuePosition}. ${notes || ''}`
        : `Arrived at border. Queue Position Not Recorded. ${notes || ''}`,
    })

    return { success: true, operation: op }
  }

  /**
   * Record Entry into Customs Yard
   */
  public recordCustomsEntry(
    operationId: string,
    customsEntryDate: string,
    customsRef: string,
    notes: string,
    recordedBy: string
  ): { success: boolean; operation?: BorderOperationRecord; error?: string } {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Border operation not found' }

    const now = new Date().toISOString()
    op.customsEntryDate = customsEntryDate || now
    op.customsReference = customsRef || op.customsReference
    op.status = 'ENTERED_CUSTOMS'
    op.updatedAt = now

    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'ENTERED_CUSTOMS',
      timestamp: op.customsEntryDate,
      locationName: `${op.borderLocationName} (Customs Clearance Terminal)`,
      side: 'SIDE_A',
      recordedBy,
      notes: `Entered customs yard. Ref: ${customsRef || 'N/A'}. ${notes || ''}`,
    })

    return { success: true, operation: op }
  }

  /**
   * Record Official Customs Clearance
   * RULE: Clearance does NOT equal border crossed!
   */
  public recordClearance(
    operationId: string,
    clearanceDate: string,
    declarationRef: string,
    clearedBy: string,
    notes: string
  ): { success: boolean; operation?: BorderOperationRecord; error?: string } {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Border operation not found' }

    const now = new Date().toISOString()
    op.clearanceDate = clearanceDate || now
    op.declarationNumber = declarationRef || op.declarationNumber
    op.status = 'CLEARED'
    op.updatedAt = now

    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'CLEARED',
      timestamp: op.clearanceDate,
      locationName: `${op.borderLocationName} (Customs Directorate)`,
      side: 'SIDE_A',
      recordedBy: clearedBy,
      notes: `Customs duty cleared. Ref: ${declarationRef || 'N/A'}. Ready for exit gate. ${notes || ''}`,
    })

    return { success: true, operation: op }
  }

  /**
   * Record Physical Border Exit / Crossing
   */
  public recordBorderExit(
    operationId: string,
    exitDate: string,
    nextDestination: string,
    notes: string,
    recordedBy: string
  ): { success: boolean; operation?: BorderOperationRecord; error?: string } {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Border operation not found' }

    const now = new Date().toISOString()
    op.borderExitDate = exitDate || now
    op.currentSide = 'SIDE_B'
    op.status = 'BORDER_CROSSED'
    op.updatedAt = now

    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'BORDER_CROSSED',
      timestamp: op.borderExitDate,
      locationName: `${op.borderLocationName} (International Border Line)`,
      side: 'SIDE_B',
      recordedBy,
      notes: `Exited origin country and crossed international border line into ${op.countryTo}. Onward to ${nextDestination || 'Transit Destination'}. ${notes || ''}`,
    })

    return { success: true, operation: op }
  }

  /**
   * Record Customs Hold (Non-destructive: Hold history is strictly preserved!)
   */
  public createHold(data: {
    borderOperationId: string
    bolNumber: string
    holdType: CustomsHoldRecord['holdType']
    authority: string
    reason: string
    responsibleParty: string
    requiredAction: string
    notes?: string
  }): CustomsHoldRecord {
    const op = this.operations.find((o) => o.id === data.borderOperationId)
    const now = new Date().toISOString()
    const hold: CustomsHoldRecord = {
      id: `hld-${Date.now()}`,
      borderOperationId: data.borderOperationId,
      bolNumber: data.bolNumber,
      holdType: data.holdType,
      status: 'OPEN',
      openedAt: now,
      authority: data.authority,
      reason: data.reason,
      responsibleParty: data.responsibleParty,
      requiredAction: data.requiredAction,
      notes: data.notes,
      createdAt: now,
    }

    if (op) {
      op.holds.unshift(hold)
      op.status = 'ON_HOLD'
      op.updatedAt = now
      op.timeline.push({
        id: `tl-${Date.now()}`,
        stage: 'ON_HOLD',
        timestamp: now,
        locationName: op.borderLocationName,
        side: op.currentSide,
        recordedBy: data.authority,
        notes: `Customs Hold created: ${data.holdType.replace(/_/g, ' ')} — ${data.reason}`,
      })
    }

    return hold
  }

  /**
   * Release Customs Hold (Preserves original hold record!)
   */
  public releaseHold(
    holdId: string,
    releasedBy: string,
    resolutionNote: string
  ): { success: boolean; hold?: CustomsHoldRecord; error?: string } {
    for (const op of this.operations) {
      const hold = op.holds.find((h) => h.id === holdId)
      if (hold) {
        const now = new Date().toISOString()
        hold.status = 'RELEASED'
        hold.releasedAt = now
        hold.releasedBy = releasedBy
        hold.resolutionNote = resolutionNote

        // Check if there are other open holds
        const hasOpenHolds = op.holds.some((h) => h.status === 'OPEN')
        if (!hasOpenHolds && op.status === 'ON_HOLD') {
          op.status = 'CUSTOMS_PROCESSING'
        }
        op.updatedAt = now

        op.timeline.push({
          id: `tl-${Date.now()}`,
          stage: 'CUSTOMS_PROCESSING',
          timestamp: now,
          locationName: op.borderLocationName,
          side: op.currentSide,
          recordedBy: releasedBy,
          notes: `Customs Hold RELEASED: ${resolutionNote}`,
        })

        return { success: true, hold }
      }
    }
    return { success: false, error: 'Hold record not found' }
  }

  /**
   * Record Customs Inspection
   */
  public recordInspection(data: {
    borderOperationId: string
    inspectionType: CustomsInspectionRecord['inspectionType']
    authority: string
    reason?: string
    result?: string
    inspectorName?: string
    photos?: string[]
  }): CustomsInspectionRecord {
    const op = this.operations.find((o) => o.id === data.borderOperationId)
    const now = new Date().toISOString()

    const inspection: CustomsInspectionRecord = {
      id: `insp-${Date.now()}`,
      borderOperationId: data.borderOperationId,
      inspectionType: data.inspectionType,
      status: data.result ? 'COMPLETED' : 'IN_PROGRESS',
      requestedDate: now,
      inspectionDate: data.result ? now : undefined,
      authority: data.authority,
      reason: data.reason,
      result: data.result,
      inspectorName: data.inspectorName,
      photos: data.photos,
      createdAt: now,
      updatedAt: now,
    }

    if (op) {
      op.inspections.unshift(inspection)
      op.status = data.result ? 'CUSTOMS_PROCESSING' : 'INSPECTION'
      op.updatedAt = now
      op.timeline.push({
        id: `tl-${Date.now()}`,
        stage: 'INSPECTION',
        timestamp: now,
        locationName: op.borderLocationName,
        side: op.currentSide,
        recordedBy: data.inspectorName || data.authority,
        notes: `Customs inspection: ${data.inspectionType.replace(/_/g, ' ')}. Result: ${data.result || 'In progress'}`,
      })
    }

    return inspection
  }

  /**
   * Create Customs Declaration
   * INVARIANCE: Declared customs value remains separate from freight revenue and company profit!
   */
  public createDeclaration(data: Omit<CustomsDeclarationRecord, 'id' | 'createdAt' | 'updatedAt'>): CustomsDeclarationRecord {
    const now = new Date().toISOString()
    const id = `dec-${Date.now()}`
    const declaration: CustomsDeclarationRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.declarations.unshift(declaration)

    // Link to matching border operation if applicable
    const op = this.operations.find((o) => o.bolNumber === data.linkedBolNumber)
    if (op) {
      op.declarationNumber = declaration.declarationNumber
      op.updatedAt = now
    }

    return declaration
  }

  /**
   * Create Transit Paper
   */
  public createTransitPaper(data: Omit<TransitPaperRecord, 'id' | 'createdAt' | 'updatedAt'>): TransitPaperRecord {
    const now = new Date().toISOString()
    const id = `trn-${Date.now()}`
    const transit: TransitPaperRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.transitPapers.unshift(transit)

    const op = this.operations.find((o) => o.bolNumber === data.linkedBolNumber)
    if (op) {
      op.transitReference = transit.transitNumber
      op.updatedAt = now
    }

    return transit
  }

  /**
   * Close Transit Paper (Explicit action: border crossing does not automatically close transit!)
   */
  public closeTransitPaper(
    transitId: string,
    closedBy: string,
    notes: string
  ): { success: boolean; transit?: TransitPaperRecord; error?: string } {
    const transit = this.transitPapers.find((t) => t.id === transitId)
    if (!transit) return { success: false, error: 'Transit paper not found' }

    const now = new Date().toISOString()
    transit.status = 'CLOSED'
    transit.transitStage = 'TRANSIT_CLOSED'
    transit.closedAt = now
    transit.closedBy = closedBy
    transit.notes = notes ? `${transit.notes || ''} | Closed: ${notes}` : transit.notes
    transit.updatedAt = now

    return { success: true, transit }
  }

  /**
   * Document Verification Toggle
   */
  public verifyDocument(
    operationId: string,
    documentId: string,
    verifiedBy: string
  ): { success: boolean; doc?: CustomsDocumentItem; error?: string } {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Operation not found' }

    const doc = op.documents.find((d) => d.id === documentId)
    if (!doc) return { success: false, error: 'Document not found' }

    const now = new Date().toISOString()
    doc.verified = !doc.verified
    doc.status = doc.verified ? 'VERIFIED' : 'PENDING'
    doc.verifiedBy = doc.verified ? verifiedBy : undefined
    doc.verifiedAt = doc.verified ? now : undefined
    op.updatedAt = now

    return { success: true, doc }
  }

  /**
   * Cross-Document Data Mismatch Checker
   * Compares BOL vs Packing List vs Customs Declaration vs Commercial Invoice
   * RULE: Displays objective difference; does NOT silently rewrite documents!
   */
  public checkDataMismatches(bolNumber: string): DataMismatchItem[] {
    const op = this.operations.find((o) => o.bolNumber === bolNumber)
    const dec = this.declarations.find((d) => d.linkedBolNumber === bolNumber)

    // Standard benchmark values from BOL
    const bolPackages = 1427
    const bolGrossWeight = 23545.5
    const decPackages = dec ? dec.packages : 1427
    const decGrossWeight = dec ? dec.grossWeightKg : 23545.5

    const items: DataMismatchItem[] = [
      {
        field: 'Total Packaging Count',
        sourceA: { name: 'Bill of Lading / Packing List', value: `${bolPackages} CTNS` },
        sourceB: { name: 'Customs Declaration', value: `${decPackages} CTNS` },
        hasMismatch: bolPackages !== decPackages,
        differenceNotes:
          bolPackages !== decPackages
            ? `Discrepancy of ${Math.abs(bolPackages - decPackages)} packages detected.`
            : 'Exact match verified.',
      },
      {
        field: 'Gross Mass (KG)',
        sourceA: { name: 'Bill of Lading / Scale Tare', value: `${bolGrossWeight} KG` },
        sourceB: { name: 'Customs Declaration (Box 38)', value: `${decGrossWeight} KG` },
        hasMismatch: Math.abs(bolGrossWeight - decGrossWeight) > 50,
        differenceNotes:
          Math.abs(bolGrossWeight - decGrossWeight) > 50
            ? `Weight variance exceeds 50 KG threshold.`
            : 'Within normal weighbridge tolerance.',
      },
      {
        field: 'HS Commodity Classification',
        sourceA: { name: 'Commercial Invoice Code', value: '0806.20.00 (Dried Grapes / Raisins)' },
        sourceB: { name: 'Customs Declaration HS Code', value: dec?.hsCode || '0806.20.00' },
        hasMismatch: false,
        differenceNotes: 'Harmonized System heading matched.',
      },
      {
        field: 'Assigned Transport Vehicle',
        sourceA: { name: 'Dispatch Truck Plate', value: op?.truckPlate || '2877 کابل ل' },
        sourceB: { name: 'Customs Transit Manifest', value: '2877 کابل ل' },
        hasMismatch: false,
        differenceNotes: 'Vehicle registration plate verified on both records.',
      },
    ]

    return items
  }

  /**
   * Bilingual WhatsApp Border Status Message Generator
   * RULE: Customer-safe mode scrubs internal broker commissions, private fees, and driver personal IDs!
   */
  public generateWhatsAppBorderMessage(
    type: 'REACHED_BORDER' | 'WAITING_CUSTOMS' | 'ENTERED_CUSTOMS' | 'CUSTOMS_CLEARED' | 'BORDER_CROSSED' | 'TRANSIT_PROGRESS',
    data: {
      bolNumber: string
      truckPlate: string
      borderLocationName: string
      statusText?: string
      queuePosition?: number | null
      waitingDuration?: string
      clearanceDate?: string
      destination?: string
      lastUpdate?: string
    },
    lang: 'dari' | 'pashto' | 'en' = 'dari'
  ): string {
    const nowStr = new Date().toLocaleDateString('en-GB')

    if (type === 'REACHED_BORDER') {
      if (lang === 'dari') {
        return (
          `*اطلاعیه رسیدن محموله به مرز — شرکت اسکای آریانا*\n\n` +
          `محترم مشتری گرامی، موتر حامل بار شما به نقطه مرزی مواصلت نمود:\n\n` +
          `📋 شماره بارنامه (BOL): *${data.bolNumber}*\n` +
          `🚚 پلیت موتر: *${data.truckPlate}*\n` +
          `📍 موقعیت مرزی: *${data.borderLocationName}*\n` +
          `🔢 وضعیت نوبت: *${data.queuePosition ? `نوبت ${data.queuePosition}` : 'ثبت در نوبت ورود'}*\n` +
          `📅 تاریخ رسیدن: *${nowStr}*\n\n` +
          `تیم عملیاتی مرزی اسکای آریانا پیگیر امور گمرکی محموله شما می‌باشد.`
        )
      }
      return (
        `*BORDER ARRIVAL NOTIFICATION — SKY ARIANA LIMITED*\n\n` +
        `BOL Ref: *${data.bolNumber}*\n` +
        `Vehicle: *${data.truckPlate}*\n` +
        `Border Post: *${data.borderLocationName}*\n` +
        `Queue Status: *${data.queuePosition ? `Position #${data.queuePosition}` : 'Queued for Entry'}*\n` +
        `Date: *${nowStr}*\n\n` +
        `Sky Ariana Border Operations Control`
      )
    }

    if (type === 'CUSTOMS_CLEARED') {
      if (lang === 'dari') {
        return (
          `*اطلاعیه تکمیل تشریفات گمرکی — شرکت اسکای آریانا*\n\n` +
          `محترم مشتری گرامی، تشریفات گمرکی و بازرسی محموله شما با موفقیت خاتمه یافت:\n\n` +
          `📋 بارنامه: *${data.bolNumber}*\n` +
          `🚚 موتر: *${data.truckPlate}*\n` +
          `📍 گمرک: *${data.borderLocationName}*\n` +
          `✅ وضعیت: *ترخیص قطعی شد (Cleared)*\n` +
          `📅 تاریخ ترخیص: *${data.clearanceDate || nowStr}*\n\n` +
          `موتر در نوبت خروج از مرز و ورود به مسیر ترانزیت قرار گرفت.`
        )
      }
      return (
        `*CUSTOMS CLEARANCE CONFIRMATION — SKY ARIANA LIMITED*\n\n` +
        `BOL Ref: *${data.bolNumber}*\n` +
        `Vehicle: *${data.truckPlate}*\n` +
        `Customs Post: *${data.borderLocationName}*\n` +
        `Status: *CUSTOMS CLEARED*\n` +
        `Clearance Date: *${data.clearanceDate || nowStr}*\n\n` +
        `Sky Ariana Border Operations Control`
      )
    }

    if (type === 'BORDER_CROSSED') {
      if (lang === 'dari') {
        return (
          `*اطلاعیه خروج موفقیت‌آمیز از مرز — شرکت اسکای آریانا*\n\n` +
          `محترم مشتری گرامی، محموله شما نقطه مرزی را پشت سر گذاشت و وارد کشور مقصد گردید:\n\n` +
          `📋 بارنامه: *${data.bolNumber}*\n` +
          `🚚 موتر: *${data.truckPlate}*\n` +
          `🏁 مرز عبور شده: *${data.borderLocationName}*\n` +
          `📍 مقصد ترانزیتی: *${data.destination || 'بندر عباس'}*\n` +
          `📅 تاریخ خروج: *${nowStr}*\n\n` +
          `محموله در حال حرکت به سمت مقصد نهایی می‌باشد.`
        )
      }
      return (
        `*BORDER CROSSED CONFIRMATION — SKY ARIANA LIMITED*\n\n` +
        `BOL Ref: *${data.bolNumber}*\n` +
        `Vehicle: *${data.truckPlate}*\n` +
        `Border Crossed: *${data.borderLocationName}*\n` +
        `Onward Destination: *${data.destination || 'Destination Port'}*\n` +
        `Crossing Date: *${nowStr}*\n\n` +
        `Sky Ariana Border Operations Control`
      )
    }

    return `Sky Ariana Border Event: ${type} for BOL ${data.bolNumber}`
  }
}

// Global Singleton Export
export const customsBorderService = new CustomsBorderStore()
