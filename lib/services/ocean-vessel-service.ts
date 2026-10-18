/**
 * Phase 22: Shipping Line, Vessel & Ocean Operations Center Service
 * Central stateful engine for sea-freight operations.
 * Enforces strict operational rules:
 * - No fake AIS or live positions (saved vessel schedule only).
 * - No automatic loading upon vessel departure.
 * - No automatic container discharge upon vessel arrival.
 * - No false rollovers on simple ETA change.
 * - Non-destructive Switch BL preservation.
 * - Carrier freight payment release blockers.
 * - Customer-safe bilingual WhatsApp alerts scrubbing carrier buy rates and internal costs.
 */

import {
  VesselRecord,
  VoyageRecord,
  PortCallRecord,
  OceanLegRecord,
  TransshipmentConnection,
  RolloverRecord,
  ContainerOceanStatus,
  BLWorkflowRecord,
  CarrierFinanceLink,
  OceanShipmentBoardItem,
  OceanSummaryKpi,
  ScheduleSource,
  BLDocType,
  BLReleaseStatus,
  VesselType,
} from '../types/ocean-vessel'

export class OceanVesselStore {
  private static instance: OceanVesselStore

  private vessels: VesselRecord[] = []
  private voyages: VoyageRecord[] = []
  private oceanLegs: OceanLegRecord[] = []
  private containers: ContainerOceanStatus[] = []
  private blWorkflows: BLWorkflowRecord[] = []
  private financeLinks: CarrierFinanceLink[] = []
  private rollovers: RolloverRecord[] = []

  private constructor() {
    this.seedInitialData()
  }

  public static getInstance(): OceanVesselStore {
    if (!OceanVesselStore.instance) {
      OceanVesselStore.instance = new OceanVesselStore()
    }
    return OceanVesselStore.instance
  }

  private seedInitialData() {
    // 1. Pre-seeded Vessels
    this.vessels = [
      {
        id: 'ves-001',
        name: 'MSC CLAUDIA',
        imoNumber: '9243382',
        carrierId: 'comp-msc',
        carrierName: 'Mediterranean Shipping Company (MSC)',
        vesselType: 'CONTAINER_MOTHER',
        flag: 'Panama',
        builtYear: 2004,
        teuCapacity: 6750,
        status: 'ACTIVE',
        notes: 'Main-line vessel on Gulf-India trade corridor',
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'ves-002',
        name: 'MAERSK HANOI',
        imoNumber: '9632064',
        carrierId: 'comp-maersk',
        carrierName: 'A.P. Moller - Maersk',
        vesselType: 'CONTAINER_MOTHER',
        flag: 'Singapore',
        builtYear: 2013,
        teuCapacity: 8800,
        status: 'ACTIVE',
        notes: 'Scheduled for direct Gulf-East Asia rotations',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'ves-003',
        name: 'CMA CGM NEVA',
        imoNumber: '9783100',
        carrierId: 'comp-cma',
        carrierName: 'CMA CGM Group',
        vesselType: 'CONTAINER_FEEDER',
        flag: 'Malta',
        builtYear: 2018,
        teuCapacity: 2200,
        status: 'ACTIVE',
        notes: 'Feeder link between Bandar Abbas and Jebel Ali',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'ves-004',
        name: 'BARGE ARIA 1',
        imoNumber: '8910442',
        carrierId: 'comp-hdasco',
        carrierName: 'HDASCO Shipping Line',
        vesselType: 'BARGE',
        flag: 'Iran',
        builtYear: 2010,
        teuCapacity: 450,
        status: 'ACTIVE',
        notes: 'Shuttle barge operating between Shahid Rajaee and regional hubs',
        createdAt: '2026-02-05T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'ves-005',
        name: 'HAPAG AL JASRAH',
        imoNumber: '9732321',
        carrierId: 'comp-hapag',
        carrierName: 'Hapag-Lloyd AG',
        vesselType: 'CONTAINER_MOTHER',
        flag: 'Liberia',
        builtYear: 2016,
        teuCapacity: 15000,
        status: 'ACTIVE',
        notes: 'Ultra-large container vessel calling Jebel Ali Terminal 2',
        createdAt: '2026-02-10T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
    ]

    // 2. Pre-seeded Voyages with Ordered Port Calls
    this.voyages = [
      {
        id: 'voy-001',
        vesselId: 'ves-003',
        vesselNameSnapshot: 'CMA CGM NEVA',
        imoNumber: '9783100',
        voyageNumber: '2604W',
        carrierId: 'comp-cma',
        carrierName: 'CMA CGM Group',
        serviceName: 'Gulf Shuttle Feeder',
        originPortId: 'loc-bnd',
        originPortName: 'Bandar Abbas (Shahid Rajaee)',
        destinationPortId: 'loc-jea',
        destinationPortName: 'Jebel Ali (Port Rashid/JEA)',
        portCalls: [
          {
            id: 'pc-1',
            sequence: 1,
            portId: 'loc-bnd',
            portName: 'Bandar Abbas (Shahid Rajaee)',
            terminalName: 'Shahid Rajaee Terminal 2',
            countryCode: 'IR',
            plannedArrival: '2026-03-20T10:00:00Z',
            plannedDeparture: '2026-03-22T18:00:00Z',
            actualArrival: '2026-03-20T11:30:00Z',
            actualDeparture: '2026-03-22T20:15:00Z',
            status: 'DEPARTED',
            berthStatus: 'BERTHED',
          },
          {
            id: 'pc-2',
            sequence: 2,
            portId: 'loc-jea',
            portName: 'Jebel Ali',
            terminalName: 'DP World Terminal 1',
            countryCode: 'AE',
            plannedArrival: '2026-03-24T08:00:00Z',
            plannedDeparture: '2026-03-25T14:00:00Z',
            status: 'ARRIVING',
            berthStatus: 'BERTHING_SCHEDULED',
          },
        ],
        plannedEtd: '2026-03-22T18:00:00Z',
        plannedEta: '2026-03-24T08:00:00Z',
        actualDeparture: '2026-03-22T20:15:00Z',
        status: 'SAILED',
        source: 'SHIPPING_LINE',
        lastUpdated: '2026-03-22T20:30:00Z',
        scheduleHistory: [
          {
            id: 'sh-1',
            voyageId: 'voy-001',
            changeTimestamp: '2026-03-21T14:00:00Z',
            previousEtd: '2026-03-22T12:00:00Z',
            newEtd: '2026-03-22T18:00:00Z',
            previousEta: '2026-03-24T04:00:00Z',
            newEta: '2026-03-24T08:00:00Z',
            reason: 'Tide restriction at Shahid Rajaee Berth 4',
            source: 'AGENT_UPDATE',
            changedBy: 'Port Operations Bandar Abbas',
          },
        ],
        notes: 'Feeder voyage carrying Afghan transit export containers',
      },
      {
        id: 'voy-002',
        vesselId: 'ves-001',
        vesselNameSnapshot: 'MSC CLAUDIA',
        imoNumber: '9243382',
        voyageNumber: '612E',
        carrierId: 'comp-msc',
        carrierName: 'Mediterranean Shipping Company (MSC)',
        serviceName: 'Gulf-India Express (GIX)',
        originPortId: 'loc-jea',
        originPortName: 'Jebel Ali',
        destinationPortId: 'loc-nsa',
        destinationPortName: 'Nhava Sheva (JNPT)',
        portCalls: [
          {
            id: 'pc-3',
            sequence: 1,
            portId: 'loc-jea',
            portName: 'Jebel Ali',
            terminalName: 'DP World Terminal 2',
            countryCode: 'AE',
            plannedArrival: '2026-03-26T06:00:00Z',
            plannedDeparture: '2026-03-27T16:00:00Z',
            status: 'PLANNED',
            berthStatus: 'WAITING_BERTH',
          },
          {
            id: 'pc-4',
            sequence: 2,
            portId: 'loc-nsa',
            portName: 'Nhava Sheva (JNPT)',
            terminalName: 'GTI Gateway Terminals India',
            countryCode: 'IN',
            plannedArrival: '2026-03-31T12:00:00Z',
            plannedDeparture: '2026-04-02T04:00:00Z',
            status: 'PLANNED',
          },
        ],
        plannedEtd: '2026-03-27T16:00:00Z',
        plannedEta: '2026-03-31T12:00:00Z',
        status: 'CONFIRMED',
        source: 'SHIPPING_LINE',
        lastUpdated: '2026-03-22T09:00:00Z',
        scheduleHistory: [],
        notes: 'Mother vessel connecting Afghan dried fruits to Mumbai/JNPT',
      },
      {
        id: 'voy-003',
        vesselId: 'ves-002',
        vesselNameSnapshot: 'MAERSK HANOI',
        imoNumber: '9632064',
        voyageNumber: '2603S',
        carrierId: 'comp-maersk',
        carrierName: 'A.P. Moller - Maersk',
        serviceName: 'Middle East - Mundra Shuttle',
        originPortId: 'loc-jea',
        originPortName: 'Jebel Ali',
        destinationPortId: 'loc-mun',
        destinationPortName: 'Mundra Port',
        portCalls: [
          {
            id: 'pc-5',
            sequence: 1,
            portId: 'loc-jea',
            portName: 'Jebel Ali',
            terminalName: 'DP World Terminal 1',
            countryCode: 'AE',
            plannedArrival: '2026-03-28T04:00:00Z',
            plannedDeparture: '2026-03-29T20:00:00Z',
            status: 'PLANNED',
          },
          {
            id: 'pc-6',
            sequence: 2,
            portId: 'loc-mun',
            portName: 'Mundra Port',
            terminalName: 'Adani International Container Terminal',
            countryCode: 'IN',
            plannedArrival: '2026-04-02T10:00:00Z',
            plannedDeparture: '2026-04-03T18:00:00Z',
            status: 'PLANNED',
          },
        ],
        plannedEtd: '2026-03-29T20:00:00Z',
        plannedEta: '2026-04-02T10:00:00Z',
        status: 'OPEN_FOR_BOOKING',
        source: 'SHIPPING_LINE',
        lastUpdated: '2026-03-22T08:00:00Z',
        scheduleHistory: [],
      },
    ]

    // 3. Pre-seeded Ocean Legs (Multi-Leg Transport)
    this.oceanLegs = [
      // Shipment 1: Leg 1 (Feeder: Bandar Abbas -> Jebel Ali)
      {
        id: 'leg-001',
        legNumber: 1,
        legLabel: 'First Leg (Feeder)',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolId: 'bol-2026-0041',
        bolNumber: 'BOL-2026-0041',
        carrierId: 'comp-cma',
        carrierName: 'CMA CGM Group',
        vesselId: 'ves-003',
        vesselName: 'CMA CGM NEVA',
        voyageId: 'voy-001',
        voyageNumber: '2604W',
        polId: 'loc-bnd',
        polName: 'Bandar Abbas (Shahid Rajaee)',
        podId: 'loc-jea',
        podName: 'Jebel Ali',
        etd: '2026-03-22T18:00:00Z',
        eta: '2026-03-24T08:00:00Z',
        actualDeparture: '2026-03-22T20:15:00Z',
        status: 'SAILED',
        containerNumbers: ['MSKU9981240', 'CMAU7718290'],
        blReference: 'CMA-BND-JEA-9011',
        notes: 'Loaded and sailed from Bandar Abbas',
      },
      // Shipment 1: Leg 2 (Mother: Jebel Ali -> Nhava Sheva)
      {
        id: 'leg-002',
        legNumber: 2,
        legLabel: 'Second Leg (Mother Vessel)',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolId: 'bol-2026-0041',
        bolNumber: 'BOL-2026-0041',
        carrierId: 'comp-msc',
        carrierName: 'Mediterranean Shipping Company (MSC)',
        vesselId: 'ves-001',
        vesselName: 'MSC CLAUDIA',
        voyageId: 'voy-002',
        voyageNumber: '612E',
        polId: 'loc-jea',
        polName: 'Jebel Ali',
        podId: 'loc-nsa',
        podName: 'Nhava Sheva (JNPT)',
        etd: '2026-03-27T16:00:00Z',
        eta: '2026-03-31T12:00:00Z',
        status: 'WAITING_VESSEL',
        containerNumbers: ['MSKU9981240', 'CMAU7718290'],
        blReference: 'MSC-JEA-NSA-4412',
        notes: 'Transshipment connection at Jebel Ali',
      },
      // Shipment 2: Direct or Leg 1 Waiting Loading
      {
        id: 'leg-003',
        legNumber: 1,
        legLabel: 'First Leg',
        bookingId: 'bk-2026-095',
        bookingNumber: 'BKG-MSK-2026-4401',
        bolId: 'bol-2026-0042',
        bolNumber: 'BOL-2026-0042',
        carrierId: 'comp-maersk',
        carrierName: 'A.P. Moller - Maersk',
        vesselId: 'ves-002',
        vesselName: 'MAERSK HANOI',
        voyageId: 'voy-003',
        voyageNumber: '2603S',
        polId: 'loc-jea',
        polName: 'Jebel Ali',
        podId: 'loc-mun',
        podName: 'Mundra Port',
        etd: '2026-03-29T20:00:00Z',
        eta: '2026-04-02T10:00:00Z',
        status: 'WAITING_VESSEL',
        containerNumbers: ['MRKU4490182'],
        notes: 'Containers gated in, awaiting vessel loading session',
      },
    ]

    // 4. Pre-seeded Container Ocean Status
    this.containers = [
      {
        containerNumber: 'MSKU9981240',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolNumber: 'BOL-2026-0041',
        currentLegNumber: 1,
        currentVesselName: 'CMA CGM NEVA',
        currentVoyageNumber: '2604W',
        pol: 'Bandar Abbas',
        pod: 'Nhava Sheva (via Jebel Ali)',
        stage: 'LOADED_ON_VESSEL',
        isLoadConfirmed: true,
        isRolledOver: false,
        lastEventDate: '2026-03-22T19:00:00Z',
        sealNumbers: ['CMA-SEAL-884102', 'AF-CUST-9921'],
        vgmWeightKg: 28450,
        vgmVerified: true,
        gateInDate: '2026-03-21T09:30:00Z',
        loadDate: '2026-03-22T19:00:00Z',
        notes: 'Confirmed loaded on CMA CGM NEVA by tally clerk',
      },
      {
        containerNumber: 'CMAU7718290',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolNumber: 'BOL-2026-0041',
        currentLegNumber: 1,
        currentVesselName: 'CMA CGM NEVA',
        currentVoyageNumber: '2604W',
        pol: 'Bandar Abbas',
        pod: 'Nhava Sheva (via Jebel Ali)',
        stage: 'LOADED_ON_VESSEL',
        isLoadConfirmed: true,
        isRolledOver: false,
        lastEventDate: '2026-03-22T19:15:00Z',
        sealNumbers: ['CMA-SEAL-884103'],
        vgmWeightKg: 27900,
        vgmVerified: true,
        gateInDate: '2026-03-21T10:00:00Z',
        loadDate: '2026-03-22T19:15:00Z',
      },
      {
        containerNumber: 'MRKU4490182',
        bookingId: 'bk-2026-095',
        bookingNumber: 'BKG-MSK-2026-4401',
        bolNumber: 'BOL-2026-0042',
        currentLegNumber: 1,
        currentVesselName: 'MAERSK HANOI',
        currentVoyageNumber: '2603S',
        pol: 'Jebel Ali',
        pod: 'Mundra Port',
        stage: 'GATE_IN',
        isLoadConfirmed: false, // In gate-in, not loaded yet!
        isRolledOver: false,
        lastEventDate: '2026-03-22T14:00:00Z',
        sealNumbers: ['MSK-SEAL-11029'],
        vgmWeightKg: 26500,
        vgmVerified: true,
        gateInDate: '2026-03-22T14:00:00Z',
      },
      // Exception / Unconfirmed container example
      {
        containerNumber: 'TCKU8819201',
        bookingId: 'bk-2026-088',
        bookingNumber: 'BKG-HLC-2026-1029',
        bolNumber: 'BOL-2026-0038',
        currentLegNumber: 1,
        currentVesselName: 'BARGE ARIA 1',
        currentVoyageNumber: '081',
        pol: 'Bandar Abbas',
        pod: 'Jebel Ali',
        stage: 'WAITING_LOADING',
        isLoadConfirmed: false, // Vessel sailed, container was unconfirmed!
        isRolledOver: true,
        lastEventDate: '2026-03-21T18:00:00Z',
        sealNumbers: ['HLC-9901'],
        vgmWeightKg: 27100,
        vgmVerified: true,
        gateInDate: '2026-03-20T12:00:00Z',
        notes: 'Rolled over due to vessel stack weight limit',
      },
    ]

    // 5. Pre-seeded Rollovers
    this.rollovers = [
      {
        id: 'roll-001',
        containerNumber: 'TCKU8819201',
        bookingId: 'bk-2026-088',
        bookingNumber: 'BKG-HLC-2026-1029',
        bolNumber: 'BOL-2026-0038',
        originalVesselId: 'ves-004',
        originalVesselName: 'BARGE ARIA 1',
        originalVoyageNumber: '080',
        originalEtd: '2026-03-20T16:00:00Z',
        newVesselId: 'ves-004',
        newVesselName: 'BARGE ARIA 1',
        newVoyageNumber: '081',
        newEtd: '2026-03-25T14:00:00Z',
        reason: 'Feeder barge capacity shut-out at Shahid Rajaee Quay 3',
        rolloverDate: '2026-03-20T18:00:00Z',
        recordedBy: 'Feeder Operations Supervisor',
      },
    ]

    // 6. Pre-seeded BL Lifecycle Workflows
    this.blWorkflows = [
      {
        id: 'blw-001',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolNumber: 'BOL-2026-0041',
        carrierId: 'comp-cma',
        carrierName: 'CMA CGM Group',
        blNumber: 'CMAU-2026-990182',
        blType: 'SEA_WAYBILL',
        siStatus: 'FINALIZED',
        siSubmittedAt: '2026-03-21T11:00:00Z',
        siSubmittedBy: 'Export Documentation Officer',
        siCutOff: '2026-03-21T18:00:00Z',
        draftVersions: [
          {
            versionNumber: 1,
            receivedDate: '2026-03-21T16:00:00Z',
            notes: 'Draft v1 received from carrier; consignee tax ID missing',
            correctionsRequested: 'Add Indian Consignee GSTIN and HS Code 0804.20',
          },
          {
            versionNumber: 2,
            receivedDate: '2026-03-22T10:00:00Z',
            notes: 'Draft v2 corrected by carrier documentation desk',
            approvedDate: '2026-03-22T11:30:00Z',
            approvedBy: 'Operations Manager',
          },
        ],
        currentDraftVersion: 2,
        isDraftApproved: true,
        finalBlIssuedDate: '2026-03-22T21:00:00Z',
        firstLegBlDocId: 'doc-bl-leg1-0041',
        secondLegBlDocId: 'doc-bl-leg2-0041',
        isSwitchBl: true,
        originalBlNumber: 'CMAU-2026-990182',
        switchBlNumber: 'SA-SWB-2026-041',
        switchLocation: 'Dubai, UAE',
        switchIssueDate: '2026-03-23T09:00:00Z',
        switchReason: 'Commercial shipper confidentiality requested by buyer',
        releaseStatus: 'SWB_ISSUED',
        deliveryOrderIssued: false,
        releaseBlocked: false,
      },
      {
        id: 'blw-002',
        bookingId: 'bk-2026-095',
        bookingNumber: 'BKG-MSK-2026-4401',
        bolNumber: 'BOL-2026-0042',
        carrierId: 'comp-maersk',
        carrierName: 'A.P. Moller - Maersk',
        blType: 'ORIGINAL_BL',
        siStatus: 'SUBMITTED',
        siSubmittedAt: '2026-03-22T15:00:00Z',
        siSubmittedBy: 'Documentation Lead',
        draftVersions: [],
        currentDraftVersion: 0,
        isDraftApproved: false,
        isSwitchBl: false,
        releaseStatus: 'DRAFT_PENDING',
        deliveryOrderIssued: false,
        releaseBlocked: true,
        releaseBlockReason: 'Carrier Freight Payment Pending (Requires finance settlement)',
      },
    ]

    // 7. Pre-seeded Carrier Finance Links (Accounting Integration)
    this.financeLinks = [
      {
        id: 'fin-001',
        bookingId: 'bk-2026-091',
        carrierId: 'comp-cma',
        carrierName: 'CMA CGM Group',
        invoiceNumber: 'INV-CMA-DXB-2026-4401',
        amount: 3200,
        currency: 'USD',
        dueDate: '2026-03-30',
        paidAmount: 3200,
        paymentStatus: 'PAID',
        accountingTxRef: 'TX-ACC-2026-0812',
        requiresPaymentForBlRelease: true,
        notes: 'Paid via Dubai bank wire; SWB release authorized by carrier',
      },
      {
        id: 'fin-002',
        bookingId: 'bk-2026-095',
        carrierId: 'comp-maersk',
        carrierName: 'A.P. Moller - Maersk',
        invoiceNumber: 'INV-MSK-DXB-2026-9018',
        amount: 1950,
        currency: 'USD',
        dueDate: '2026-03-28',
        paidAmount: 0,
        paymentStatus: 'PAYMENT_PENDING',
        requiresPaymentForBlRelease: true,
        notes: 'Carrier credit term requires payment before Original BL release',
      },
    ]
  }

  // === SUMMARY KPIS ===
  public getSummaryKpis(): OceanSummaryKpi {
    const board = this.getShipmentBoard()
    const now = new Date()

    return {
      activeOceanShipments: board.length,
      bookingPending: board.filter((b) => b.oceanStatus === 'PENDING').length,
      awaitingVessel: board.filter((b) => b.oceanStatus === 'WAITING_VESSEL').length,
      gateInComplete: this.containers.filter((c) => c.stage === 'GATE_IN').length,
      waitingLoading: this.containers.filter((c) => c.stage === 'WAITING_LOADING').length,
      onVessel: board.filter((b) => b.oceanStatus === 'LOADED' || b.oceanStatus === 'SAILED' || b.oceanStatus === 'IN_TRANSIT').length,
      atTransshipment: board.filter((b) => b.oceanStatus === 'AT_TRANSSHIPMENT' || b.isTransshipment).length,
      rolledOver: this.rollovers.length,
      arrivingSoon: board.filter((b) => {
        const etaDate = new Date(b.eta)
        const diffDays = (etaDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        return diffDays >= 0 && diffDays <= 3 && b.oceanStatus !== 'COMPLETED'
      }).length,
      discharged: this.containers.filter((c) => c.stage === 'DISCHARGED').length,
      blPending: this.blWorkflows.filter((w) => !w.finalBlIssuedDate).length,
      freightPaymentPending: this.financeLinks.filter((f) => f.paymentStatus === 'PAYMENT_PENDING').length,
      releasePending: this.blWorkflows.filter((w) => w.releaseStatus !== 'DELIVERY_ORDER_ISSUED' && w.releaseStatus !== 'SWB_ISSUED').length,
    }
  }

  // === SHIPMENT BOARD ===
  public getShipmentBoard(): OceanShipmentBoardItem[] {
    const board: OceanShipmentBoardItem[] = []

    for (const leg of this.oceanLegs) {
      const blWorkflow = this.blWorkflows.find((w) => w.bookingId === leg.bookingId)
      const finance = this.financeLinks.find((f) => f.bookingId === leg.bookingId)
      const isRolledOver = this.rollovers.some((r) => r.bookingId === leg.bookingId)

      // Attention flags
      let attentionReason: string | undefined
      if (isRolledOver) {
        attentionReason = 'Rolled Over to New Voyage'
      } else if (finance?.paymentStatus === 'PAYMENT_PENDING' && blWorkflow?.releaseBlocked) {
        attentionReason = 'Release Blocked: Freight Payment Pending'
      } else if (!blWorkflow?.isDraftApproved && leg.status === 'SAILED') {
        attentionReason = 'Vessel Sailed: BL Draft Still Pending'
      }

      board.push({
        id: leg.id,
        bolNumber: leg.bolNumber || 'N/A',
        bookingNumber: leg.bookingNumber,
        customerName: 'Haji Wase Alokozay / Ani Traders',
        carrierName: leg.carrierName,
        containerNumbers: leg.containerNumbers,
        currentLegNumber: leg.legNumber,
        totalLegs: this.oceanLegs.filter((l) => l.bookingId === leg.bookingId).length,
        currentVesselName: leg.vesselName,
        currentVoyageNumber: leg.voyageNumber,
        pol: leg.polName,
        pod: leg.podName,
        etd: leg.etd,
        eta: leg.eta,
        actualDeparture: leg.actualDeparture,
        actualArrival: leg.actualArrival,
        oceanStatus: leg.status,
        blStatus: blWorkflow ? blWorkflow.releaseStatus : 'DRAFT_PENDING',
        freightPaymentStatus: finance ? finance.paymentStatus : 'NOT_INVOICED',
        attentionReason,
        isRolledOver,
        isTransshipment: leg.legNumber > 1,
      })
    }

    return board
  }

  // === VESSELS ===
  public getVessels(): VesselRecord[] {
    return [...this.vessels]
  }

  public saveVessel(vessel: VesselRecord): { success: boolean; vessel: VesselRecord; warning?: string } {
    let warning: string | undefined
    // Check duplicate by IMO if present
    if (vessel.imoNumber) {
      const existing = this.vessels.find((v) => v.imoNumber === vessel.imoNumber && v.id !== vessel.id)
      if (existing) {
        warning = `A vessel with IMO ${vessel.imoNumber} already exists (${existing.name}). Please verify identity.`
      }
    }

    const idx = this.vessels.findIndex((v) => v.id === vessel.id)
    const now = new Date().toISOString()
    const updated = { ...vessel, updatedAt: now }

    if (idx >= 0) {
      this.vessels[idx] = updated
    } else {
      updated.createdAt = now
      this.vessels.push(updated)
    }

    return { success: true, vessel: updated, warning }
  }

  // === VOYAGES ===
  public getVoyages(): VoyageRecord[] {
    return [...this.voyages]
  }

  public saveVoyage(voyage: VoyageRecord): { success: boolean; voyage: VoyageRecord } {
    const idx = this.voyages.findIndex((v) => v.id === voyage.id)
    const now = new Date().toISOString()
    const updated = { ...voyage, lastUpdated: now }

    if (idx >= 0) {
      this.voyages[idx] = updated
    } else {
      this.voyages.push(updated)
    }
    return { success: true, voyage: updated }
  }

  /**
   * Update Voyage Schedule with Preserved History & Mass Update Preview
   */
  public updateVoyageSchedule(
    voyageId: string,
    newEtd: string,
    newEta: string,
    reason: string,
    changedBy: string,
    source: ScheduleSource = 'SHIPPING_LINE'
  ): { success: boolean; updatedVoyage?: VoyageRecord; affectedShipmentsCount: number } {
    const voyage = this.voyages.find((v) => v.id === voyageId)
    if (!voyage) return { success: false, affectedShipmentsCount: 0 }

    const now = new Date().toISOString()
    const historyItem = {
      id: `sh-${Date.now()}`,
      voyageId,
      changeTimestamp: now,
      previousEtd: voyage.plannedEtd,
      newEtd,
      previousEta: voyage.plannedEta,
      newEta,
      reason,
      source,
      changedBy,
    }

    voyage.scheduleHistory.push(historyItem)
    voyage.plannedEtd = newEtd
    voyage.plannedEta = newEta
    voyage.lastUpdated = now

    // Propagate to linked active ocean legs (EXCLUDING completed legs or rolled-over containers)
    let affectedCount = 0
    for (const leg of this.oceanLegs) {
      if (leg.voyageId === voyageId && leg.status !== 'COMPLETED' && leg.status !== 'ROLLED_OVER') {
        leg.etd = newEtd
        leg.eta = newEta
        affectedCount++
      }
    }

    return { success: true, updatedVoyage: voyage, affectedShipmentsCount: affectedCount }
  }

  public previewVoyageScheduleChange(
    voyageId: string,
    newEtd: string,
    newEta: string
  ): { affectedLegs: OceanLegRecord[]; excludedRolloverContainers: string[] } {
    const affectedLegs = this.oceanLegs.filter(
      (leg) => leg.voyageId === voyageId && leg.status !== 'COMPLETED' && leg.status !== 'ROLLED_OVER'
    )
    const excludedRolloverContainers = this.rollovers
      .filter((r) => r.originalVesselId === voyageId || r.originalVoyageNumber === voyageId)
      .map((r) => r.containerNumber)

    return { affectedLegs, excludedRolloverContainers }
  }

  /**
   * Actual Departure: Never overwrites planned ETD
   */
  public recordVesselActualDeparture(
    voyageId: string,
    actualDeparture: string,
    notes?: string
  ): { success: boolean; voyage?: VoyageRecord } {
    const voyage = this.voyages.find((v) => v.id === voyageId)
    if (!voyage) return { success: false }

    voyage.actualDeparture = actualDeparture
    voyage.status = 'SAILED'
    voyage.lastUpdated = new Date().toISOString()

    // Note: Do NOT automatically mark all containers as loaded!
    for (const leg of this.oceanLegs) {
      if (leg.voyageId === voyageId && leg.status !== 'COMPLETED') {
        leg.actualDeparture = actualDeparture
        leg.status = 'SAILED'
      }
    }

    return { success: true, voyage }
  }

  /**
   * Actual Arrival: Never overwrites planned ETA
   */
  public recordVesselActualArrival(
    voyageId: string,
    actualArrival: string,
    notes?: string
  ): { success: boolean; voyage?: VoyageRecord } {
    const voyage = this.voyages.find((v) => v.id === voyageId)
    if (!voyage) return { success: false }

    voyage.actualArrival = actualArrival
    voyage.status = 'ARRIVED'
    voyage.lastUpdated = new Date().toISOString()

    // Vessel arrived; containers are NOT automatically discharged
    for (const leg of this.oceanLegs) {
      if (leg.voyageId === voyageId && leg.status !== 'COMPLETED') {
        leg.actualArrival = actualArrival
        leg.status = 'IN_TRANSIT'
      }
    }

    return { success: true, voyage }
  }

  // === CONTAINER OCEAN EVENTS ===
  public recordContainerLoad(
    bookingId: string,
    containerNumber: string,
    vesselName: string,
    voyageNumber: string,
    port: string,
    date: string
  ): { success: boolean; error?: string } {
    let container = this.containers.find((c) => c.containerNumber === containerNumber)
    if (!container) {
      container = {
        containerNumber,
        bookingId,
        bookingNumber: bookingId,
        currentLegNumber: 1,
        currentVesselName: vesselName,
        currentVoyageNumber: voyageNumber,
        pol: port,
        pod: 'Destination',
        stage: 'LOADED_ON_VESSEL',
        isLoadConfirmed: true,
        isRolledOver: false,
        lastEventDate: date,
        sealNumbers: [],
        vgmVerified: true,
      }
      this.containers.push(container)
    } else {
      container.currentVesselName = vesselName
      container.currentVoyageNumber = voyageNumber
      container.stage = 'LOADED_ON_VESSEL'
      container.isLoadConfirmed = true
      container.loadDate = date
      container.lastEventDate = date
    }
    return { success: true }
  }

  public recordContainerDischarge(
    bookingId: string,
    containerNumber: string,
    port: string,
    date: string
  ): { success: boolean; error?: string } {
    const container = this.containers.find((c) => c.containerNumber === containerNumber)
    if (container) {
      container.stage = 'DISCHARGED'
      container.dischargeDate = date
      container.lastEventDate = date
      return { success: true }
    }
    return { success: false, error: 'Container not found' }
  }

  // === EXPLICIT ROLLOVER ===
  public recordRollover(data: {
    containerNumber: string
    bookingId: string
    bookingNumber: string
    bolNumber?: string
    originalVesselId: string
    originalVesselName: string
    originalVoyageNumber: string
    originalEtd: string
    newVesselId: string
    newVesselName: string
    newVoyageNumber: string
    newEtd: string
    reason: string
    recordedBy: string
  }): { success: boolean; rollover: RolloverRecord } {
    const now = new Date().toISOString()
    const rollover: RolloverRecord = {
      id: `roll-${Date.now()}`,
      containerNumber: data.containerNumber,
      bookingId: data.bookingId,
      bookingNumber: data.bookingNumber,
      bolNumber: data.bolNumber,
      originalVesselId: data.originalVesselId,
      originalVesselName: data.originalVesselName,
      originalVoyageNumber: data.originalVoyageNumber,
      originalEtd: data.originalEtd,
      newVesselId: data.newVesselId,
      newVesselName: data.newVesselName,
      newVoyageNumber: data.newVoyageNumber,
      newEtd: data.newEtd,
      reason: data.reason,
      rolloverDate: now,
      recordedBy: data.recordedBy,
    }

    this.rollovers.push(rollover)

    // Update container state
    const container = this.containers.find((c) => c.containerNumber === data.containerNumber)
    if (container) {
      container.isRolledOver = true
      container.currentVesselName = data.newVesselName
      container.currentVoyageNumber = data.newVoyageNumber
      container.stage = 'WAITING_LOADING'
      container.isLoadConfirmed = false
      container.lastEventDate = now
    }

    // Update ocean leg
    const leg = this.oceanLegs.find((l) => l.bookingId === data.bookingId)
    if (leg) {
      leg.vesselId = data.newVesselId
      leg.vesselName = data.newVesselName
      leg.voyageNumber = data.newVoyageNumber
      leg.etd = data.newEtd
      leg.status = 'ROLLED_OVER'
    }

    return { success: true, rollover }
  }

  // === OCEAN LEGS ===
  public getOceanLegs(): OceanLegRecord[] {
    return [...this.oceanLegs]
  }

  public saveOceanLeg(leg: OceanLegRecord): { success: boolean; leg: OceanLegRecord } {
    const idx = this.oceanLegs.findIndex((l) => l.id === leg.id)
    if (idx >= 0) {
      this.oceanLegs[idx] = leg
    } else {
      this.oceanLegs.push(leg)
    }
    return { success: true, leg }
  }

  // === TRANSSHIPMENT ===
  public getTransshipmentConnections(): TransshipmentConnection[] {
    const connections: TransshipmentConnection[] = []

    // Group legs by booking
    const bookingsMap = new Map<string, OceanLegRecord[]>()
    for (const leg of this.oceanLegs) {
      const existing = bookingsMap.get(leg.bookingId) || []
      existing.push(leg)
      bookingsMap.set(leg.bookingId, existing)
    }

    for (const [bookingId, legs] of bookingsMap.entries()) {
      if (legs.length >= 2) {
        legs.sort((a, b) => a.legNumber - b.legNumber)
        const leg1 = legs[0]
        const leg2 = legs[1]

        // Check if Leg 1 POD is Leg 2 POL
        if (leg1.podId === leg2.polId || leg1.podName === leg2.polName) {
          let dwellHours: number | undefined
          if (leg1.actualArrival && leg2.etd) {
            const arr = new Date(leg1.actualArrival).getTime()
            const etd = new Date(leg2.etd).getTime()
            dwellHours = Math.round((etd - arr) / (1000 * 3600))
          }

          let connectionStatus: TransshipmentConnection['connectionStatus'] = 'WAITING_DISCHARGE'
          let connectionRiskAlert: string | undefined

          if (leg1.status === 'SAILED' || leg1.status === 'IN_TRANSIT') {
            connectionStatus = 'WAITING_DISCHARGE'
          } else if (leg1.status === 'COMPLETED' || leg1.status === 'DISCHARGED') {
            if (leg2.status === 'LOADED') {
              connectionStatus = 'LOADED_ON_NEXT_VESSEL'
            } else if (leg2.status === 'SAILED') {
              connectionStatus = 'DEPARTED'
            } else {
              connectionStatus = 'DISCHARGED_WAITING_VESSEL'
            }
          }

          // Connection risk: if next ETD is less than 24h from incoming ETA
          const incEta = new Date(leg1.eta).getTime()
          const outEtd = new Date(leg2.etd).getTime()
          const gapHours = (outEtd - incEta) / (1000 * 3600)
          if (gapHours > 0 && gapHours < 24) {
            connectionStatus = 'CONNECTION_RISK'
            connectionRiskAlert = `Tight Transshipment Window: Outgoing ETD is only ${Math.round(gapHours)}h after incoming ETA`
          }

          connections.push({
            id: `ts-${bookingId}`,
            transshipmentPortId: leg1.podId,
            transshipmentPortName: leg1.podName,
            incomingLegId: leg1.id,
            incomingVesselName: leg1.vesselName,
            incomingVoyageNumber: leg1.voyageNumber,
            dischargeDate: leg1.actualArrival,
            outgoingLegId: leg2.id,
            outgoingVesselName: leg2.vesselName,
            outgoingVoyageNumber: leg2.voyageNumber,
            nextEtd: leg2.etd,
            dwellHours,
            connectionStatus,
            connectionRiskAlert,
          })
        }
      }
    }

    return connections
  }

  // === BL WORKFLOW & DRAFTS ===
  public getBLWorkflows(): BLWorkflowRecord[] {
    return [...this.blWorkflows]
  }

  public getBLWorkflowByBooking(bookingId: string): BLWorkflowRecord | undefined {
    return this.blWorkflows.find((b) => b.bookingId === bookingId)
  }

  public addDraftBLVersion(bookingId: string, notes: string): { success: boolean; version: number } {
    let blw = this.blWorkflows.find((b) => b.bookingId === bookingId)
    if (!blw) return { success: false, version: 0 }

    const newVersionNum = blw.draftVersions.length + 1
    blw.draftVersions.push({
      versionNumber: newVersionNum,
      receivedDate: new Date().toISOString(),
      notes,
    })
    blw.currentDraftVersion = newVersionNum
    blw.isDraftApproved = false
    blw.releaseStatus = 'DRAFT_PENDING'
    return { success: true, version: newVersionNum }
  }

  public requestBLCorrection(bookingId: string, correctionsRequested: string): { success: boolean } {
    const blw = this.blWorkflows.find((b) => b.bookingId === bookingId)
    if (!blw || blw.draftVersions.length === 0) return { success: false }

    const latest = blw.draftVersions[blw.draftVersions.length - 1]
    latest.correctionsRequested = correctionsRequested
    blw.siStatus = 'CORRECTION_REQUIRED'
    return { success: true }
  }

  public approveDraftBL(bookingId: string, approvedBy: string): { success: boolean } {
    const blw = this.blWorkflows.find((b) => b.bookingId === bookingId)
    if (!blw || blw.draftVersions.length === 0) return { success: false }

    const latest = blw.draftVersions[blw.draftVersions.length - 1]
    latest.approvedDate = new Date().toISOString()
    latest.approvedBy = approvedBy
    blw.isDraftApproved = true
    blw.releaseStatus = 'DRAFT_APPROVED'
    return { success: true }
  }

  public issueFinalBL(bookingId: string, blNumber: string, blType: BLDocType): { success: boolean } {
    const blw = this.blWorkflows.find((b) => b.bookingId === bookingId)
    if (!blw) return { success: false }

    blw.blNumber = blNumber
    blw.blType = blType
    blw.finalBlIssuedDate = new Date().toISOString()
    blw.releaseStatus = 'ISSUED'
    return { success: true }
  }

  public createSwitchBL(
    bookingId: string,
    switchBlNumber: string,
    switchLocation: string,
    reason: string
  ): { success: boolean } {
    const blw = this.blWorkflows.find((b) => b.bookingId === bookingId)
    if (!blw) return { success: false }

    // Preserve original BL! Never overwrite original
    blw.isSwitchBl = true
    blw.originalBlNumber = blw.blNumber
    blw.switchBlNumber = switchBlNumber
    blw.switchLocation = switchLocation
    blw.switchIssueDate = new Date().toISOString()
    blw.switchReason = reason
    return { success: true }
  }

  public updateBLReleaseStatus(
    bookingId: string,
    releaseStatus: BLReleaseStatus
  ): { success: boolean; error?: string } {
    const blw = this.blWorkflows.find((b) => b.bookingId === bookingId)
    if (!blw) return { success: false, error: 'BL Workflow not found' }

    // Check payment blocker rule
    const finance = this.financeLinks.find((f) => f.bookingId === bookingId)
    if (finance && finance.requiresPaymentForBlRelease && finance.paymentStatus === 'PAYMENT_PENDING') {
      blw.releaseBlocked = true
      blw.releaseBlockReason = 'Carrier Freight Payment is PENDING in Finance. Payment required for BL release.'
      return {
        success: false,
        error: 'Carrier Freight Payment is PENDING. Release cannot be granted until freight invoice is settled.',
      }
    }

    blw.releaseStatus = releaseStatus
    blw.releaseBlocked = false
    blw.releaseBlockReason = undefined
    return { success: true }
  }

  // === CARRIER FINANCE ===
  public getFinanceLinks(): CarrierFinanceLink[] {
    return [...this.financeLinks]
  }

  // === ROLLOVERS ===
  public getRollovers(): RolloverRecord[] {
    return [...this.rollovers]
  }

  // === CUSTOMER-SAFE BILINGUAL WHATSAPP GENERATOR ===
  public generateCustomerSafeWhatsAppMessage(bolNumber: string, eventType: string): string {
    const leg = this.oceanLegs.find((l) => l.bolNumber === bolNumber) || this.oceanLegs[0]
    const container = this.containers.find((c) => c.bolNumber === bolNumber) || this.containers[0]

    const etdFormatted = leg?.etd ? new Date(leg.etd).toLocaleDateString('en-GB') : 'TBA'
    const etaFormatted = leg?.eta ? new Date(leg.eta).toLocaleDateString('en-GB') : 'TBA'

    return `🌊 *SKY ARIANA LIMITED — OCEAN SHIPMENT UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *BOL:* ${bolNumber}
📦 *Container:* ${container?.containerNumber || 'N/A'}
🚢 *Vessel:* ${leg?.vesselName || 'Scheduled Vessel'}
🔢 *Voyage:* ${leg?.voyageNumber || 'TBA'}
📍 *Port of Loading (POL):* ${leg?.polName || 'Shahid Rajaee / Bandar Abbas'}
🏁 *Port of Discharge (POD):* ${leg?.podName || 'Destination Port'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Current Status:* ${eventType.replace(/_/g, ' ')}
📅 *ETD:* ${etdFormatted}
📅 *ETA:* ${etaFormatted}
${leg?.actualDeparture ? `⏱️ *Actual Departure:* ${new Date(leg.actualDeparture).toLocaleString('en-GB')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇦🇫 *اطلاعیه انتقال بحری — اسکای آریانا*
کانتینر شما در خط بحری با موفقیت ثبت و حرکت گردید. اسناد بارنامه و مراحل ترخیص طبق زمان‌بندی اعلام‌شده در حال اجرا می‌باشد.
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 *Tracking Portal:* https://skyariana.com/track?bol=${bolNumber}`
  }

  // === SCHEDULE CSV IMPORT PARSER ===
  public parseScheduleCsv(csvText: string): Array<{
    vessel: string
    voyage: string
    pol: string
    pod: string
    etd: string
    eta: string
    carrier: string
    status: 'NEW' | 'UPDATE' | 'POSSIBLE_DUPLICATE' | 'INVALID'
    notes?: string
  }> {
    const lines = csvText.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length <= 1) return []

    const header = lines[0].split(',').map((h) => h.trim().toUpperCase())
    const vslIdx = header.findIndex((h) => h.includes('VSL') || h.includes('VESSEL'))
    const voyIdx = header.findIndex((h) => h.includes('VOY') || h.includes('VOYAGE'))
    const polIdx = header.findIndex((h) => h.includes('POL') || h.includes('LOADING'))
    const podIdx = header.findIndex((h) => h.includes('POD') || h.includes('DISCHARGE'))
    const etdIdx = header.findIndex((h) => h.includes('ETD') || h.includes('DEPART'))
    const etaIdx = header.findIndex((h) => h.includes('ETA') || h.includes('ARRIV'))
    const carrierIdx = header.findIndex((h) => h.includes('CARRIER') || h.includes('LINE'))

    const results = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim())
      const vessel = parts[vslIdx >= 0 ? vslIdx : 0] || 'Unknown Vessel'
      const voyage = parts[voyIdx >= 0 ? voyIdx : 1] || '001'
      const pol = parts[polIdx >= 0 ? polIdx : 2] || 'Bandar Abbas'
      const pod = parts[podIdx >= 0 ? podIdx : 3] || 'Jebel Ali'
      const etd = parts[etdIdx >= 0 ? etdIdx : 4] || new Date().toISOString()
      const eta = parts[etaIdx >= 0 ? etaIdx : 5] || new Date().toISOString()
      const carrier = parts[carrierIdx >= 0 ? carrierIdx : 6] || 'Carrier'

      // Check existing
      const existing = this.voyages.find(
        (v) =>
          v.vesselNameSnapshot.toUpperCase() === vessel.toUpperCase() &&
          v.voyageNumber.toUpperCase() === voyage.toUpperCase()
      )

      let status: 'NEW' | 'UPDATE' | 'POSSIBLE_DUPLICATE' | 'INVALID' = 'NEW'
      let notes: string | undefined

      if (existing) {
        if (existing.plannedEtd !== etd || existing.plannedEta !== eta) {
          status = 'UPDATE'
          notes = `Updates planned dates from ${existing.plannedEtd.split('T')[0]} to ${etd.split('T')[0]}`
        } else {
          status = 'POSSIBLE_DUPLICATE'
          notes = 'Exact match found in voyage schedule database'
        }
      }

      results.push({ vessel, voyage, pol, pod, etd, eta, carrier, status, notes })
    }

    return results
  }
}
