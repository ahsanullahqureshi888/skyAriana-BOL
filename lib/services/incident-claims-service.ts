/**
 * Phase 24: Claims, Damage, Detention & Incident Management Center Service
 * Central stateful engine for operational incidents, commercial claims, detention disputes,
 * and insurance files across Sky Ariana Limited.
 * 
 * Strict Guarantees:
 * - Clear separation between Incident (operational mishap) and Claim (commercial/financial demand).
 * - NO automatic legal liability assignment (Responsibility defaults to NOT_ASSESSED or UNDER_REVIEW).
 * - NO damage incident automatically reducing warehouse inventory.
 * - NO estimated detention treated as actual carrier charge.
 * - Multi-currency segregation: values preserved in original currency without mixing.
 * - Customer data isolation: internal fault analysis, supplier buy rates, and negotiation notes scrubbed.
 */

import {
  IncidentRecord,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  DamageDetails,
  ShortageDetails,
  WeightShortageDetails,
  ContainerDamageDetails,
  SealIncidentDetails,
  TemperatureIncidentDetails,
  DetentionDisputeDetails,
  EvidenceRecord,
  ClaimRecord,
  ClaimType,
  ClaimStatus,
  ResponsibilityStatus,
  ResponsiblePartyAssessment,
  SettlementRecord,
  InsurancePolicyRecord,
  InsuranceClaimRecord,
  ClaimsSummaryKpi,
} from '../types/incident-claims'

export class IncidentClaimsStore {
  private static instance: IncidentClaimsStore

  private incidents: IncidentRecord[] = []
  private claims: ClaimRecord[] = []
  private evidence: EvidenceRecord[] = []
  private insurancePolicies: InsurancePolicyRecord[] = []
  private insuranceClaims: InsuranceClaimRecord[] = []

  private constructor() {
    this.seedInitialData()
    this.loadFromLocalStorage()
  }

  public static getInstance(): IncidentClaimsStore {
    if (!IncidentClaimsStore.instance) {
      IncidentClaimsStore.instance = new IncidentClaimsStore()
    }
    return IncidentClaimsStore.instance
  }

  // ==========================================
  // 1. Initial Seed Data
  // ==========================================
  private seedInitialData() {
    // 1. Seed Incidents
    this.incidents = [
      {
        id: 'inc-00125',
        incidentNumber: 'INC-2026-00125',
        incidentType: 'WET_CARGO',
        incidentDate: '2026-03-18',
        reportedDate: '2026-03-18T10:30:00Z',
        shipmentRef: 'BOL-2026-0412',
        bolId: 'bol-0412',
        bolNumber: 'SKYA-BOL-2026-0412',
        bookingReference: 'BK-KBL-892',
        truckPlate: 'KBL-48192',
        driverName: 'Mohammad Rahim',
        warehouseName: 'Kabul Cargo Complex (Bay 4)',
        customerName: 'Ariana Saffron & Spice Traders',
        locationName: 'Kabul Cargo Complex, Afghanistan',
        locationType: 'WAREHOUSE',
        description: 'During offloading from truck KBL-48192, 10 outer corrugated master cartons of Super Negin Saffron were observed with heavy water soaking on the bottom layer. Wetness appears fresh.',
        quantityAffected: 10,
        weightAffectedKg: 120,
        estimatedValueAffected: 2000,
        currency: 'USD',
        severity: 'MEDIUM',
        status: 'UNDER_REVIEW',
        reportedBySource: 'WAREHOUSE',
        reportedByName: 'Ahmad Wali (Warehouse Supervisor)',
        assignedTo: 'Karim Dad (Claims Desk)',
        evidenceStatus: 'COMPLETE',
        claimLinked: true,
        linkedClaimIds: ['clm-00088'],
        notes: 'Pre-shipment inspection in Herat had clean bill. Tarpaulin on truck KBL-48192 had minor tear near rear latch.',
        damageDetails: {
          damageType: 'WET',
          packagesAffected: 10,
          totalShipmentPackages: 50,
          unaffectedPackages: 40,
          weightAffectedKg: 120,
          description: '10 master cartons soaked on bottom and sides. Internal sealed tin containers examined; moisture penetrated 4 outer boxes.',
          observedAt: '2026-03-18 10:15 AM during truck unstrapping',
          conditionBefore: 'Loaded in clean dry condition at Herat Transit Hub',
          conditionAfter: '10 cartons damp/wet, stacked separately on dry pallets',
          inspectionNotes: 'Joint inspection signed with truck driver Mohammad Rahim.',
        },
        createdAt: '2026-03-18T10:45:00Z',
        updatedAt: '2026-03-20T14:10:00Z',
      },
      {
        id: 'inc-00126',
        incidentNumber: 'INC-2026-00126',
        incidentType: 'CARGO_SHORTAGE',
        incidentDate: '2026-03-19',
        reportedDate: '2026-03-19T14:00:00Z',
        shipmentRef: 'BOL-2026-0388',
        bolId: 'bol-0388',
        bolNumber: 'SKYA-BOL-2026-0388',
        bookingReference: 'BK-MZ-102',
        truckPlate: 'MZ-88219',
        driverName: 'Abdul Samad',
        warehouseName: 'Mazar-i-Sharif Dry Port Yard',
        customerName: 'Balkh Agricultural Union',
        locationName: 'Hairatan Border Clearance Gate',
        locationType: 'BORDER_CROSSING',
        description: 'Tally count at Hairatan border customs inspection revealed 1,397 cartons of dried raisins instead of declared 1,407 cartons. Physical shortage of 10 cartons.',
        quantityAffected: 10,
        weightAffectedKg: 150,
        estimatedValueAffected: 1450,
        currency: 'USD',
        severity: 'MEDIUM',
        status: 'EVIDENCE_COLLECTION',
        reportedBySource: 'CUSTOMS',
        reportedByName: 'Inspector Mirwais (Customs Hairatan)',
        assignedTo: 'Nadir Khan (Transit Officer)',
        evidenceStatus: 'PARTIAL',
        claimLinked: false,
        linkedClaimIds: [],
        notes: 'Driver states seal was intact upon arrival at border. Customs tally sheet counter-signed.',
        shortageDetails: {
          expectedQuantity: 1407,
          actualQuantity: 1397,
          shortageQuantity: 10,
          packageType: 'Cartons (15kg Net)',
          whereDiscovered: 'Hairatan Border Gate 2 Customs ramp',
        },
        weightShortageDetails: {
          expectedNetKg: 21105,
          actualNetKg: 20955,
          differenceKg: 150,
          whereWeighed: 'Hairatan Port Weighbridge Scale #1',
        },
        createdAt: '2026-03-19T14:30:00Z',
        updatedAt: '2026-03-21T09:00:00Z',
      },
      {
        id: 'inc-00127',
        incidentNumber: 'INC-2026-00127',
        incidentType: 'TEMPERATURE_EXCEPTION',
        incidentDate: '2026-03-20',
        reportedDate: '2026-03-20T08:15:00Z',
        shipmentRef: 'BOL-2026-0504',
        bolId: 'bol-0504',
        bolNumber: 'SKYA-BOL-2026-0504',
        bookingReference: 'BK-AIR-602',
        vesselOrFlight: 'Kam Air FG-712 (DXB-KBL)',
        warehouseName: 'Kabul Airport Cold Room',
        customerName: 'Afghan National Pharma Care',
        locationName: 'Hamid Karzai International Airport (KBL)',
        locationType: 'AIRPORT',
        description: 'Cold-chain shipment of pediatric vaccines arrived at KBL cargo holding area. Temperature data logger download showed reading of +14.2°C for continuous 4.5 hours between tarmac transfer and cold storage transfer.',
        quantityAffected: 24,
        weightAffectedKg: 180,
        estimatedValueAffected: 6800,
        currency: 'USD',
        severity: 'HIGH',
        status: 'ACTION_REQUIRED',
        reportedBySource: 'WAREHOUSE',
        reportedByName: 'Dr. Zabiullah (Quality Assurance Officer)',
        assignedTo: 'Sohail Ahmad (Pharma Logistics Lead)',
        evidenceStatus: 'COMPLETE',
        claimLinked: true,
        linkedClaimIds: ['clm-00090'],
        notes: 'Ministry of Public Health quarantine hold placed pending sample stability test by central laboratory.',
        temperatureDetails: {
          expectedRange: '+2°C to +8°C',
          recordedTemperature: 14.2,
          unit: '°C',
          source: 'Sensitech TempTale Ultra Data Logger #SN-892110',
          recordedAt: '2026-03-20 03:45 AM - 08:15 AM',
          durationHours: 4.5,
          affectedCargo: 'Pediatric Vaccine Vials (24 Insulated Shippers)',
        },
        createdAt: '2026-03-20T08:30:00Z',
        updatedAt: '2026-03-22T11:45:00Z',
      },
      {
        id: 'inc-00128',
        incidentNumber: 'INC-2026-00128',
        incidentType: 'CONTAINER_DAMAGE',
        incidentDate: '2026-03-21',
        reportedDate: '2026-03-21T16:20:00Z',
        shipmentRef: 'BOL-2026-0490',
        bolId: 'bol-0490',
        bolNumber: 'SKYA-BOL-2026-0490',
        bookingReference: 'BK-SEA-331',
        containerNumber: 'TCLU7849201',
        truckPlate: 'HRT-19022',
        driverName: 'Faiz Mohammad',
        borderStation: 'Islam Qala Border Terminal',
        customerName: 'Khorasan Steel & Hardware Imports',
        locationName: 'Islam Qala Custom Terminal Yard',
        locationType: 'BORDER_CROSSING',
        description: 'During trailer uncoupling at Islam Qala container holding lot, right door locking cam keeper bent and bottom hinge pin cracked. Cargo inside intact.',
        quantityAffected: 1,
        weightAffectedKg: 0,
        estimatedValueAffected: 450,
        currency: 'USD',
        severity: 'LOW',
        status: 'OPEN',
        reportedBySource: 'DRIVER',
        reportedByName: 'Faiz Mohammad (Driver)',
        assignedTo: 'Nasirullah (Fleet & Equipment)',
        evidenceStatus: 'COMPLETE',
        claimLinked: false,
        linkedClaimIds: [],
        notes: 'Depot repair team mobilized. Surveyor estimate received from Islam Qala Mechanical Workshop.',
        containerDamageDetails: {
          containerNumber: 'TCLU7849201',
          damageLocation: 'Right Door Locking Cam Keeper & Bottom Hinge Pin',
          damageType: 'BENT_LOCKING_BAR',
          beforeCondition: 'Sound condition on EIR departure from Bandar Abbas',
          afterCondition: 'Door closes but cannot apply security bolt seal',
          inspectionReference: 'EIR-IQ-2026-981',
          repairEstimateUsd: 450,
          repairInvoiceRef: 'INV-IQ-REP-041',
          carrierReportRef: 'CARRIER-DAMAGE-TCLU7849201',
        },
        createdAt: '2026-03-21T16:45:00Z',
        updatedAt: '2026-03-22T10:00:00Z',
      },
      {
        id: 'inc-00129',
        incidentNumber: 'INC-2026-00129',
        incidentType: 'DETENTION',
        incidentDate: '2026-03-22',
        reportedDate: '2026-03-22T09:00:00Z',
        shipmentRef: 'BOL-2026-0350',
        bolId: 'bol-0350',
        bolNumber: 'SKYA-BOL-2026-0350',
        bookingReference: 'BK-OCN-449',
        containerNumber: 'MSCU4920184',
        customerName: 'Kabul Modern Construction Co.',
        locationName: 'Bandar Abbas Port Terminal (Return Depot)',
        locationType: 'PORT',
        description: 'Shipping line MSC invoiced detention of USD 3,400 on container MSCU4920184 alleging 17 excess days beyond 14 free days. Investigation confirms container was blocked at Islam Qala border for 12 days due to official Afghan-Iran border gate strike closure.',
        quantityAffected: 1,
        weightAffectedKg: 0,
        estimatedValueAffected: 3400,
        currency: 'USD',
        severity: 'HIGH',
        status: 'OPEN',
        reportedBySource: 'SHIPPING_LINE',
        reportedByName: 'MSC Line Accounts Team',
        assignedTo: 'Karim Dad (Claims Desk)',
        evidenceStatus: 'COMPLETE',
        claimLinked: true,
        linkedClaimIds: ['clm-00089'],
        notes: 'Dispute letter with official Customs Border Closure Circular sent to MSC Agency.',
        detentionDetails: {
          containerNumber: 'MSCU4920184',
          carrierName: 'MSC Mediterranean Shipping Company',
          arrivalDate: '2026-02-15',
          freeDays: 14,
          lastFreeDay: '2026-03-01',
          actualEmptyReturnDate: '2026-03-18',
          chargeDays: 17,
          carrierInvoiceRef: 'MSC-DET-INV-9921',
          configuredDailyRate: 200,
          estimatedExposure: 1000,
          actualCarrierCharge: 3400,
          disputedAmount: 2400,
          disputeReason: 'Force Majeure: Islam Qala border post official closure notice issued by Afghan Ministry of Finance customs department (12 days exempt).',
          resolutionStatus: 'PENDING_LINE_WAIVER',
        },
        createdAt: '2026-03-22T09:30:00Z',
        updatedAt: '2026-03-23T08:00:00Z',
      },
    ]

    // 2. Seed Evidence Records
    this.evidence = [
      {
        id: 'evid-001',
        incidentId: 'inc-00125',
        evidenceType: 'PHOTO',
        fileName: 'wet-cartons-unloading-bay4.jpg',
        fileUrl: '/uploads/claims/wet-cartons-unloading-bay4.jpg',
        capturedDate: '2026-03-18T10:20:00Z',
        source: 'Warehouse Camera #04',
        description: 'High-resolution photo showing bottom layer wetness on 10 saffron master cartons on truck bed.',
        annotationNote: 'Water stains clearly visible spreading from floorboard seams.',
        customerVisible: true,
        internalOnly: false,
        versionNumber: 1,
        createdAt: '2026-03-18T10:45:00Z',
      },
      {
        id: 'evid-002',
        incidentId: 'inc-00125',
        evidenceType: 'REPORT',
        fileName: 'joint-tally-inspection-signed.pdf',
        fileUrl: '/uploads/claims/joint-tally-inspection-signed.pdf',
        capturedDate: '2026-03-18T11:00:00Z',
        source: 'Joint Inspection Protocol',
        description: 'Bilingual cargo damage joint inspection protocol signed by Driver Mohammad Rahim and Supervisor Ahmad Wali.',
        annotationNote: 'Driver explicitly signed agreeing cartons arrived damp before warehouse intake.',
        customerVisible: true,
        internalOnly: false,
        versionNumber: 1,
        createdAt: '2026-03-18T11:15:00Z',
      },
      {
        id: 'evid-003',
        incidentId: 'inc-00127',
        evidenceType: 'PDF',
        fileName: 'temptale-ultra-datalogger-export.pdf',
        fileUrl: '/uploads/claims/temptale-ultra-datalogger-export.pdf',
        capturedDate: '2026-03-20T08:00:00Z',
        source: 'Sensitech Calibration Export',
        description: 'Complete temperature graph curve illustrating excursion from 03:45 to 08:15 with peak at +14.2°C.',
        annotationNote: 'Critical evidence for cold-chain insurance indemnity claim.',
        customerVisible: true,
        internalOnly: false,
        versionNumber: 1,
        createdAt: '2026-03-20T08:30:00Z',
      },
      {
        id: 'evid-004',
        incidentId: 'inc-00129',
        evidenceType: 'REPORT',
        fileName: 'islam-qala-border-closure-circular.pdf',
        fileUrl: '/uploads/claims/islam-qala-border-closure-circular.pdf',
        capturedDate: '2026-03-02T12:00:00Z',
        source: 'Ministry of Finance Customs Authority',
        description: 'Official government gazette circular confirming complete operational halt at Islam Qala customs terminal for 12 calendar days.',
        annotationNote: 'Force Majeure supporting document for detention waiver from MSC line.',
        customerVisible: true,
        internalOnly: false,
        versionNumber: 1,
        createdAt: '2026-03-22T09:40:00Z',
      },
    ]

    // 3. Seed Commercial Claims
    this.claims = [
      {
        id: 'clm-00088',
        claimNumber: 'CLM-2026-00088',
        incidentId: 'inc-00125',
        incidentNumber: 'INC-2026-00125',
        claimType: 'CUSTOMER_CLAIM',
        claimStatus: 'UNDER_REVIEW',
        customerName: 'Ariana Saffron & Spice Traders',
        claimant: 'Ariana Saffron & Spice Traders (Attn: Haji Sultan)',
        claimAgainst: 'Sky Ariana Limited / Transporter',
        claimDate: '2026-03-19',
        claimAmount: 2000,
        currency: 'USD',
        acceptedAmount: 0,
        settlementAmount: 0,
        recoveredAmount: 0,
        outstandingExposure: 2000,
        claimBasisDescription: 'Formal claim for water-damaged packaging and spoiled saffron in 4 retail outer packs. Requesting reimbursement of USD 2,000 for replacement cargo value and repackaging costs.',
        assignedTo: 'Karim Dad (Claims Lead)',
        responseDueDate: '2026-04-02',
        responsibilityStatus: 'UNDER_REVIEW',
        responsiblePartyName: 'Truck Transporter / Driver Rahim (Under Joint Review)',
        responsiblePartyAssessment: {
          status: 'UNDER_REVIEW',
          assessedPartyName: 'Truck Owner / Driver Mohammad Rahim',
          partyType: 'TRANSPORTER',
          reason: 'Initial inspection indicates tarpaulin rip allowed rain seepage during Herat-Kabul leg. Final liability review pending carrier insurer response.',
          evidenceReference: 'evid-001, evid-002',
          assessedBy: 'Karim Dad (Claims Desk)',
          assessedDate: '2026-03-20T10:00:00Z',
        },
        notes: 'Customer is a key account ($120k annual freight). Prioritize amicable commercial resolution. Recommended offer: USD 1,400 with 50% carrier subrogation recovery.',
        checklist: [
          { id: 'chk-1', documentType: 'CLAIM_FORM', title: 'Formal Customer Claim Letter', required: true, isCompleted: true },
          { id: 'chk-2', documentType: 'CARGO_DAMAGE_REPORT', title: 'Joint Damage Inspection Protocol', required: true, isCompleted: true },
          { id: 'chk-3', documentType: 'COMMERCIAL_INVOICE', title: 'Original Commercial Saffron Invoice', required: true, isCompleted: true },
          { id: 'chk-4', documentType: 'SURVEY_REPORT', title: 'Independent Marine Cargo Surveyor Report', required: false, isCompleted: false },
          { id: 'chk-5', documentType: 'CARRIER_STATEMENT', title: 'Driver/Carrier Explanatory Declaration', required: true, isCompleted: true },
        ],
        communications: [
          {
            id: 'comm-1',
            date: '2026-03-19 14:00',
            party: 'Haji Sultan (Ariana Saffron)',
            channel: 'EMAIL',
            subject: 'Formal Claim Submission - BOL-2026-0412 Wet Saffron',
            summary: 'Received official claim letter with purchase invoices and photos requesting USD 2,000 indemnity.',
          },
          {
            id: 'comm-2',
            date: '2026-03-20 11:30',
            party: 'Karim Dad (Sky Ariana)',
            channel: 'WHATSAPP',
            subject: 'Claim Acknowledgement & Protocol Review',
            summary: 'Sent formal acknowledgement with claim tracking reference CLM-2026-00088. Informed client that technical review is active.',
          },
        ],
        settlements: [],
        createdAt: '2026-03-19T14:15:00Z',
        updatedAt: '2026-03-20T15:00:00Z',
      },
      {
        id: 'clm-00089',
        claimNumber: 'CLM-2026-00089',
        incidentId: 'inc-00129',
        incidentNumber: 'INC-2026-00129',
        claimType: 'DETENTION_DISPUTE',
        claimStatus: 'NEGOTIATION',
        customerName: 'Kabul Modern Construction Co.',
        claimant: 'MSC Mediterranean Shipping Company',
        claimAgainst: 'Sky Ariana Limited / Consignee',
        claimDate: '2026-03-22',
        claimAmount: 3400,
        currency: 'USD',
        acceptedAmount: 1000,
        settlementAmount: 0,
        recoveredAmount: 0,
        outstandingExposure: 2400,
        claimBasisDescription: 'Shipping line detention invoice of USD 3,400 for 17 days. Disputed USD 2,400 representing 12 days of force majeure customs border closure certified by Afghan authorities.',
        assignedTo: 'Karim Dad (Claims Lead)',
        responseDueDate: '2026-03-29',
        responsibilityStatus: 'DISPUTED',
        responsiblePartyName: 'MSC Shipping Line (Force Majeure Dispute)',
        responsiblePartyAssessment: {
          status: 'DISPUTED',
          assessedPartyName: 'MSC Shipping Line / Force Majeure Event',
          partyType: 'SHIPPING_LINE',
          reason: 'Consignee and carrier both impeded by sovereign customs closure. Carrier contract clause 14 provides force majeure fee mitigation.',
          evidenceReference: 'evid-004',
          assessedBy: 'Karim Dad',
          assessedDate: '2026-03-22T11:00:00Z',
        },
        notes: 'MSC Agency Dubai acknowledged receipt of border circular. Case passed to regional claims director.',
        checklist: [
          { id: 'chk-d1', documentType: 'INVOICE', title: 'Carrier Detention Invoice', required: true, isCompleted: true },
          { id: 'chk-d2', documentType: 'BORDER_CIRCULAR', title: 'Ministry Border Closure Gazette Notice', required: true, isCompleted: true },
          { id: 'chk-d3', documentType: 'EIR_RECEIPT', title: 'Empty Return EIR Interchange Receipt', required: true, isCompleted: true },
        ],
        communications: [
          {
            id: 'comm-d1',
            date: '2026-03-22 10:15',
            party: 'MSC Dubai Detention Desk',
            channel: 'EMAIL',
            subject: 'Detention Notice Container MSCU4920184',
            summary: 'Carrier billed USD 3,400 for 17 days overstay at USD 200/day.',
          },
          {
            id: 'comm-d2',
            date: '2026-03-22 15:30',
            party: 'Sky Ariana Legal Desk',
            channel: 'EMAIL',
            subject: 'Formal Dispute & Waiver Request - Force Majeure',
            summary: 'Disputed 12 days ($2,400) under border force majeure clause and offered USD 1,000 for standard days.',
          },
        ],
        settlements: [],
        createdAt: '2026-03-22T10:00:00Z',
        updatedAt: '2026-03-23T08:30:00Z',
      },
      {
        id: 'clm-00090',
        claimNumber: 'CLM-2026-00090',
        incidentId: 'inc-00127',
        incidentNumber: 'INC-2026-00127',
        claimType: 'INSURANCE_CLAIM',
        claimStatus: 'SUBMITTED',
        customerName: 'Afghan National Pharma Care',
        claimant: 'Afghan National Pharma Care / Sky Ariana',
        claimAgainst: 'Asia Insurance Corporation Kabul',
        claimDate: '2026-03-21',
        claimAmount: 6800,
        currency: 'USD',
        acceptedAmount: 0,
        settlementAmount: 0,
        recoveredAmount: 0,
        outstandingExposure: 6800,
        claimBasisDescription: 'Cold-chain cargo loss under Marine & Cold Chain Policy POL-2026-002 due to thermal excursion beyond +8°C during air transit leg.',
        assignedTo: 'Sohail Ahmad (Pharma Logistics Lead)',
        responseDueDate: '2026-04-10',
        responsibilityStatus: 'UNDER_REVIEW',
        responsiblePartyName: 'Kam Air Ground Handling / Airport Terminal',
        responsiblePartyAssessment: {
          status: 'UNDER_REVIEW',
          assessedPartyName: 'Kam Air Ground Handling / Insurer Liability',
          partyType: 'INSURANCE_COMPANY',
          reason: 'Temp logger curve proves failure occurred during airport tarmac delay in direct sunlight.',
          evidenceReference: 'evid-003',
          assessedBy: 'Dr. Zabiullah',
          assessedDate: '2026-03-21T09:00:00Z',
        },
        notes: 'Asia Insurance appointed Lloyd’s agent surveyor in Kabul. Inspection completed 2026-03-22.',
        checklist: [
          { id: 'chk-p1', documentType: 'CLAIM_FORM', title: 'Formal Insurance Claim Form', required: true, isCompleted: true },
          { id: 'chk-p2', documentType: 'SURVEY_REPORT', title: 'Surveyor Thermographic Inspection Report', required: true, isCompleted: true },
          { id: 'chk-p3', documentType: 'TEMPERATURE_LOG', title: 'Calibrated Data Logger Download File', required: true, isCompleted: true },
          { id: 'chk-p4', documentType: 'MAWB_COPY', title: 'Kam Air Air Waybill Copy', required: true, isCompleted: true },
        ],
        communications: [
          {
            id: 'comm-p1',
            date: '2026-03-21 11:00',
            party: 'Asia Insurance Kabul Desk',
            channel: 'EMAIL',
            subject: 'Policy POL-2026-002 Claim Submission Notification',
            summary: 'File opened with reference AIC-CLM-9821. Surveyor assigned.',
          },
        ],
        settlements: [],
        createdAt: '2026-03-21T11:15:00Z',
        updatedAt: '2026-03-22T16:00:00Z',
      },
    ]

    // 4. Seed Insurance Policies
    this.insurancePolicies = [
      {
        id: 'pol-001',
        policyNumber: 'POL-2026-001',
        insurerName: 'Asia Insurance Corporation Afghanistan',
        insuredParty: 'Sky Ariana Limited & Cargo Owners',
        coveragePeriod: '2026-01-01 to 2026-12-31',
        coverageLimit: 500000,
        deductible: 500,
        currency: 'USD',
        policyDocumentRef: 'DOC-INS-POL-2026-001',
        status: 'ACTIVE',
      },
      {
        id: 'pol-002',
        policyNumber: 'POL-2026-002',
        insurerName: 'Kabul National Underwriters & Takaful',
        insuredParty: 'Sky Ariana Cold Chain Division',
        coveragePeriod: '2026-02-01 to 2027-01-31',
        coverageLimit: 250000,
        deductible: 1000,
        currency: 'USD',
        policyDocumentRef: 'DOC-INS-POL-2026-002',
        status: 'ACTIVE',
      },
    ]

    // 5. Seed Insurance Claims
    this.insuranceClaims = [
      {
        id: 'ins-clm-001',
        claimId: 'clm-00090',
        policyNumber: 'POL-2026-002',
        claimNumberFromInsurer: 'AIC-CLM-9821',
        insurerName: 'Asia Insurance Corporation Afghanistan',
        submittedDate: '2026-03-21',
        claimAmount: 6800,
        acceptedAmount: 0,
        currency: 'USD',
        surveyorName: 'Bureau Veritas Kabul Inspection Team',
        surveyReportDate: '2026-03-22',
        status: 'UNDER_ADJUSTMENT',
      },
    ]
  }

  // ==========================================
  // 2. Storage Persistence (Local-first)
  // ==========================================
  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      const storedIncidents = localStorage.getItem('sky_ariana_incidents_v1')
      if (storedIncidents) this.incidents = JSON.parse(storedIncidents)

      const storedClaims = localStorage.getItem('sky_ariana_claims_v1')
      if (storedClaims) this.claims = JSON.parse(storedClaims)

      const storedEvidence = localStorage.getItem('sky_ariana_evidence_v1')
      if (storedEvidence) this.evidence = JSON.parse(storedEvidence)

      const storedPolicies = localStorage.getItem('sky_ariana_insurance_policies_v1')
      if (storedPolicies) this.insurancePolicies = JSON.parse(storedPolicies)

      const storedInsClaims = localStorage.getItem('sky_ariana_insurance_claims_v1')
      if (storedInsClaims) this.insuranceClaims = JSON.parse(storedInsClaims)
    } catch (e) {
      console.warn('Could not read claims data from localStorage, using in-memory state', e)
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('sky_ariana_incidents_v1', JSON.stringify(this.incidents))
      localStorage.setItem('sky_ariana_claims_v1', JSON.stringify(this.claims))
      localStorage.setItem('sky_ariana_evidence_v1', JSON.stringify(this.evidence))
      localStorage.setItem('sky_ariana_insurance_policies_v1', JSON.stringify(this.insurancePolicies))
      localStorage.setItem('sky_ariana_insurance_claims_v1', JSON.stringify(this.insuranceClaims))
    } catch (e) {
      console.warn('Could not save claims data to localStorage', e)
    }
  }

  // ==========================================
  // 3. Incident Methods
  // ==========================================
  public getIncidents(): IncidentRecord[] {
    return [...this.incidents].sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime())
  }

  public getIncidentById(id: string): IncidentRecord | undefined {
    return this.incidents.find((i) => i.id === id || i.incidentNumber === id)
  }

  public saveIncident(data: Partial<IncidentRecord>): IncidentRecord {
    const now = new Date().toISOString()
    const isNew = !data.id

    let incident: IncidentRecord
    if (isNew) {
      const count = this.incidents.length + 1
      const pad = count.toString().padStart(5, '0')
      const incidentNumber = data.incidentNumber || `INC-2026-${pad}`

      incident = {
        id: `inc-${Date.now()}`,
        incidentNumber,
        incidentType: data.incidentType || 'OTHER',
        incidentDate: data.incidentDate || new Date().toISOString().split('T')[0],
        reportedDate: data.reportedDate || now,
        shipmentRef: data.shipmentRef || 'BOL-PENDING',
        bolId: data.bolId,
        bolNumber: data.bolNumber,
        bookingReference: data.bookingReference,
        containerNumber: data.containerNumber,
        truckPlate: data.truckPlate,
        driverName: data.driverName,
        warehouseName: data.warehouseName,
        borderStation: data.borderStation,
        portName: data.portName,
        vesselOrFlight: data.vesselOrFlight,
        customerName: data.customerName || 'Pending Customer Identification',
        locationName: data.locationName || 'Unspecified Location',
        locationType: data.locationType || 'TERMINAL',
        description: data.description || 'Factual operational incident recorded.',
        quantityAffected: data.quantityAffected || 0,
        weightAffectedKg: data.weightAffectedKg || 0,
        estimatedValueAffected: data.estimatedValueAffected || 0,
        currency: data.currency || 'USD',
        severity: data.severity || 'LOW',
        status: data.status || 'OPEN',
        reportedBySource: data.reportedBySource || 'STAFF',
        reportedByName: data.reportedByName || 'Operations Team',
        assignedTo: data.assignedTo || 'Claims Desk',
        evidenceStatus: data.evidenceStatus || 'NONE',
        claimLinked: data.claimLinked || false,
        linkedClaimIds: data.linkedClaimIds || [],
        notes: data.notes,
        damageDetails: data.damageDetails,
        shortageDetails: data.shortageDetails,
        weightShortageDetails: data.weightShortageDetails,
        containerDamageDetails: data.containerDamageDetails,
        sealDetails: data.sealDetails,
        truckIncidentDetails: data.truckIncidentDetails,
        temperatureDetails: data.temperatureDetails,
        detentionDetails: data.detentionDetails,
        createdAt: now,
        updatedAt: now,
      }
      this.incidents.unshift(incident)
    } else {
      const index = this.incidents.findIndex((i) => i.id === data.id)
      if (index === -1) {
        throw new Error(`Incident with id ${data.id} not found`)
      }
      incident = {
        ...this.incidents[index],
        ...data,
        updatedAt: now,
      }
      this.incidents[index] = incident
    }

    this.saveToLocalStorage()
    return incident
  }

  public deleteIncident(id: string): boolean {
    const initialLength = this.incidents.length
    this.incidents = this.incidents.filter((i) => i.id !== id)
    const deleted = this.incidents.length < initialLength
    if (deleted) {
      this.saveToLocalStorage()
    }
    return deleted
  }

  // ==========================================
  // 4. Claim Methods
  // ==========================================
  public getClaims(): ClaimRecord[] {
    return [...this.claims].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  public getClaimById(id: string): ClaimRecord | undefined {
    return this.claims.find((c) => c.id === id || c.claimNumber === id)
  }

  public saveClaim(data: Partial<ClaimRecord>): ClaimRecord {
    const now = new Date().toISOString()
    const isNew = !data.id

    let claim: ClaimRecord
    if (isNew) {
      const count = this.claims.length + 1
      const pad = count.toString().padStart(5, '0')
      const claimNumber = data.claimNumber || `CLM-2026-${pad}`

      claim = {
        id: `clm-${Date.now()}`,
        claimNumber,
        incidentId: data.incidentId || '',
        incidentNumber: data.incidentNumber || '',
        claimType: data.claimType || 'CUSTOMER_CLAIM',
        claimStatus: data.claimStatus || 'OPEN',
        customerName: data.customerName || 'General Client',
        claimant: data.claimant || 'Client Representative',
        claimAgainst: data.claimAgainst || 'Sky Ariana Limited',
        claimDate: data.claimDate || new Date().toISOString().split('T')[0],
        claimAmount: data.claimAmount || 0,
        currency: data.currency || 'USD',
        acceptedAmount: data.acceptedAmount || 0,
        settlementAmount: data.settlementAmount || 0,
        recoveredAmount: data.recoveredAmount || 0,
        outstandingExposure: (data.claimAmount || 0) - (data.settlementAmount || 0),
        claimBasisDescription: data.claimBasisDescription || '',
        assignedTo: data.assignedTo || 'Claims Desk',
        responseDueDate: data.responseDueDate,
        closedDate: data.closedDate,
        responsibilityStatus: data.responsibilityStatus || 'NOT_ASSESSED',
        responsiblePartyName: data.responsiblePartyName,
        responsiblePartyAssessment: data.responsiblePartyAssessment,
        notes: data.notes,
        checklist: data.checklist || [
          { id: `chk-${Date.now()}-1`, documentType: 'CLAIM_FORM', title: 'Formal Claim Demand', required: true, isCompleted: false },
          { id: `chk-${Date.now()}-2`, documentType: 'CARGO_DAMAGE_REPORT', title: 'Incident / Inspection Report', required: true, isCompleted: false },
          { id: `chk-${Date.now()}-3`, documentType: 'COMMERCIAL_INVOICE', title: 'Proof of Value / Commercial Invoice', required: true, isCompleted: false },
        ],
        communications: data.communications || [],
        settlements: data.settlements || [],
        createdAt: now,
        updatedAt: now,
      }
      this.claims.unshift(claim)

      // Link to incident if present
      if (claim.incidentId) {
        const incident = this.incidents.find((i) => i.id === claim.incidentId || i.incidentNumber === claim.incidentId)
        if (incident) {
          incident.claimLinked = true
          if (!incident.linkedClaimIds.includes(claim.id)) {
            incident.linkedClaimIds.push(claim.id)
          }
          incident.updatedAt = now
        }
      }
    } else {
      const index = this.claims.findIndex((c) => c.id === data.id)
      if (index === -1) {
        throw new Error(`Claim with id ${data.id} not found`)
      }
      claim = {
        ...this.claims[index],
        ...data,
        updatedAt: now,
      }
      // Recalculate outstanding exposure
      claim.outstandingExposure = Math.max(0, claim.claimAmount - (claim.settlementAmount || 0))
      this.claims[index] = claim
    }

    this.saveToLocalStorage()
    return claim
  }

  public deleteClaim(id: string): boolean {
    const initialLength = this.claims.length
    this.claims = this.claims.filter((c) => c.id !== id)
    const deleted = this.claims.length < initialLength
    if (deleted) {
      this.saveToLocalStorage()
    }
    return deleted
  }

  // ==========================================
  // 5. Responsibility Assessment (Authorized)
  // Strictly requires user input & cited evidence
  // ==========================================
  public recordResponsibilityAssessment(
    claimId: string,
    assessment: {
      status: ResponsibilityStatus
      assessedPartyName: string
      partyType: string
      reason: string
      evidenceReference: string
      assessedBy: string
    }
  ): ClaimRecord {
    const claim = this.claims.find((c) => c.id === claimId)
    if (!claim) throw new Error(`Claim ${claimId} not found`)

    const now = new Date().toISOString()
    const previousAssessments = claim.responsiblePartyAssessment?.previousAssessments || []
    
    if (claim.responsiblePartyAssessment) {
      previousAssessments.push({
        status: claim.responsibilityStatus,
        assessedPartyName: claim.responsiblePartyName,
        changedBy: claim.responsiblePartyAssessment.assessedBy || 'System',
        timestamp: claim.responsiblePartyAssessment.assessedDate || claim.updatedAt,
        reason: claim.responsiblePartyAssessment.reason || 'Status update',
      })
    }

    claim.responsibilityStatus = assessment.status
    claim.responsiblePartyName = assessment.assessedPartyName
    claim.responsiblePartyAssessment = {
      status: assessment.status,
      assessedPartyName: assessment.assessedPartyName,
      partyType: assessment.partyType,
      reason: assessment.reason,
      evidenceReference: assessment.evidenceReference,
      assessedBy: assessment.assessedBy,
      assessedDate: now,
      previousAssessments,
    }
    claim.updatedAt = now

    this.saveToLocalStorage()
    return claim
  }

  // ==========================================
  // 6. Settlements & Accounting Segregation
  // Idempotency enforced
  // ==========================================
  public recordSettlement(claimId: string, settlementData: Omit<SettlementRecord, 'id'>): ClaimRecord {
    const claim = this.claims.find((c) => c.id === claimId)
    if (!claim) throw new Error(`Claim ${claimId} not found`)

    // Check idempotencyKey to prevent duplicate ledger postings
    const duplicate = claim.settlements.find((s) => s.idempotencyKey === settlementData.idempotencyKey)
    if (duplicate) {
      return claim // Already processed safely
    }

    const newSettlement: SettlementRecord = {
      ...settlementData,
      id: `stl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }

    claim.settlements.push(newSettlement)
    
    // Tally settlements in claim currency only
    const totalSettled = claim.settlements
      .filter((s) => s.currency === claim.currency)
      .reduce((sum, s) => sum + s.settlementAmount, 0)
    
    claim.settlementAmount = totalSettled
    claim.outstandingExposure = Math.max(0, claim.claimAmount - totalSettled)

    if (claim.outstandingExposure === 0) {
      claim.claimStatus = 'SETTLED'
      claim.closedDate = settlementData.settlementDate || new Date().toISOString().split('T')[0]
    } else {
      claim.claimStatus = 'PARTIALLY_ACCEPTED'
    }

    claim.updatedAt = new Date().toISOString()
    this.saveToLocalStorage()
    return claim
  }

  // ==========================================
  // 7. Evidence Methods
  // ==========================================
  public getEvidenceByIncident(incidentId: string): EvidenceRecord[] {
    return this.evidence.filter((e) => e.incidentId === incidentId)
  }

  public saveEvidence(evidenceData: Partial<EvidenceRecord>): EvidenceRecord {
    const now = new Date().toISOString()
    const isNew = !evidenceData.id

    let item: EvidenceRecord
    if (isNew) {
      item = {
        id: `evid-${Date.now()}`,
        incidentId: evidenceData.incidentId || '',
        evidenceType: evidenceData.evidenceType || 'PHOTO',
        documentId: evidenceData.documentId,
        fileName: evidenceData.fileName || 'evidence-file',
        fileUrl: evidenceData.fileUrl || '/uploads/claims/evidence-placeholder.jpg',
        capturedDate: evidenceData.capturedDate || now,
        source: evidenceData.source || 'Operational Team',
        description: evidenceData.description || 'Uploaded operational proof.',
        annotationNote: evidenceData.annotationNote,
        customerVisible: evidenceData.customerVisible !== undefined ? evidenceData.customerVisible : false,
        internalOnly: evidenceData.internalOnly !== undefined ? evidenceData.internalOnly : true,
        versionNumber: evidenceData.versionNumber || 1,
        createdAt: now,
      }
      this.evidence.push(item)

      // Update incident evidence status
      const incident = this.incidents.find((i) => i.id === item.incidentId)
      if (incident) {
        const total = this.evidence.filter((e) => e.incidentId === item.incidentId).length
        incident.evidenceStatus = total >= 2 ? 'COMPLETE' : 'PARTIAL'
        incident.updatedAt = now
      }
    } else {
      const idx = this.evidence.findIndex((e) => e.id === evidenceData.id)
      if (idx === -1) throw new Error(`Evidence ${evidenceData.id} not found`)
      item = {
        ...this.evidence[idx],
        ...evidenceData,
      }
      this.evidence[idx] = item
    }

    this.saveToLocalStorage()
    return item
  }

  // ==========================================
  // 8. Insurance Policies & Claims
  // ==========================================
  public getInsurancePolicies(): InsurancePolicyRecord[] {
    return [...this.insurancePolicies]
  }

  public saveInsurancePolicy(policy: Partial<InsurancePolicyRecord>): InsurancePolicyRecord {
    const isNew = !policy.id
    let item: InsurancePolicyRecord
    if (isNew) {
      item = {
        id: `pol-${Date.now()}`,
        policyNumber: policy.policyNumber || `POL-2026-${Math.floor(Math.random() * 900 + 100)}`,
        insurerName: policy.insurerName || 'Afghanistan Cargo Insurer',
        insuredParty: policy.insuredParty || 'Sky Ariana Limited',
        coveragePeriod: policy.coveragePeriod || '2026-01-01 to 2026-12-31',
        coverageLimit: policy.coverageLimit || 100000,
        deductible: policy.deductible || 500,
        currency: policy.currency || 'USD',
        policyDocumentRef: policy.policyDocumentRef,
        status: policy.status || 'ACTIVE',
      }
      this.insurancePolicies.push(item)
    } else {
      const idx = this.insurancePolicies.findIndex((p) => p.id === policy.id)
      if (idx === -1) throw new Error(`Policy ${policy.id} not found`)
      item = { ...this.insurancePolicies[idx], ...policy }
      this.insurancePolicies[idx] = item
    }
    this.saveToLocalStorage()
    return item
  }

  public getInsuranceClaims(): InsuranceClaimRecord[] {
    return [...this.insuranceClaims]
  }

  public saveInsuranceClaim(claim: Partial<InsuranceClaimRecord>): InsuranceClaimRecord {
    const isNew = !claim.id
    let item: InsuranceClaimRecord
    if (isNew) {
      item = {
        id: `ins-clm-${Date.now()}`,
        claimId: claim.claimId || '',
        policyNumber: claim.policyNumber || 'POL-2026-001',
        claimNumberFromInsurer: claim.claimNumberFromInsurer || `INS-REF-${Math.floor(Math.random() * 90000 + 10000)}`,
        insurerName: claim.insurerName || 'Cargo Underwriters',
        submittedDate: claim.submittedDate || new Date().toISOString().split('T')[0],
        claimAmount: claim.claimAmount || 0,
        acceptedAmount: claim.acceptedAmount || 0,
        currency: claim.currency || 'USD',
        surveyorName: claim.surveyorName,
        surveyReportDate: claim.surveyReportDate,
        status: claim.status || 'SUBMITTED',
      }
      this.insuranceClaims.push(item)
    } else {
      const idx = this.insuranceClaims.findIndex((ic) => ic.id === claim.id)
      if (idx === -1) throw new Error(`Insurance Claim ${claim.id} not found`)
      item = { ...this.insuranceClaims[idx], ...claim }
      this.insuranceClaims[idx] = item
    }
    this.saveToLocalStorage()
    return item
  }

  // ==========================================
  // 9. Customer Privacy & WhatsApp Formatter
  // Strictly scrubs: buy rates, profit margins, private internal fault notes
  // ==========================================
  public generateCustomerWhatsAppUpdate(claimId: string): string {
    const claim = this.claims.find((c) => c.id === claimId)
    if (!claim) return 'Error: Claim file not found.'

    const incident = this.incidents.find((i) => i.id === claim.incidentId)

    const statusMap: Record<ClaimStatus, string> = {
      DRAFT: 'Drafting Review',
      OPEN: 'Received & Open for Technical Review',
      DOCUMENTS_PENDING: 'Awaiting Supporting Documents',
      UNDER_REVIEW: 'Under Active Investigation',
      SUBMITTED: 'Submitted for Formal Adjustment',
      AWAITING_RESPONSE: 'Awaiting Transporter / Surveyor Response',
      NEGOTIATION: 'Under Commercial Review',
      PARTIALLY_ACCEPTED: 'Partially Approved',
      ACCEPTED: 'Claim Approved',
      REJECTED: 'Claim Rejected with Cited Grounds',
      SETTLED: 'Fully Settled & Closed',
      WITHDRAWN: 'Withdrawn by Claimant',
      CLOSED: 'Claim Closed',
    }

    return `*SKY ARIANA LOGISTICS — CLAIM STATUS UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*File Reference:* ${claim.claimNumber}
*Shipment / BOL:* ${incident?.bolNumber || incident?.shipmentRef || 'Registered Shipment'}
*Customer:* ${claim.customerName}
*Claimed Amount:* ${claim.currency} ${claim.claimAmount.toLocaleString()}

*Current Status:* ${statusMap[claim.claimStatus] || claim.claimStatus}
*Assigned Officer:* ${claim.assignedTo}
${claim.responseDueDate ? `*Target Resolution Date:* ${claim.responseDueDate}` : ''}

*Factual Incident Summary:*
${incident ? incident.description.replace(/(\r\n|\n|\r)/gm, ' ') : 'Joint inspection report on record.'}

*Action Required from You:*
${
  claim.checklist.some((c) => !c.isCompleted && c.required)
    ? `Please submit remaining items: ${claim.checklist
        .filter((c) => !c.isCompleted && c.required)
        .map((c) => c.title)
        .join(', ')}`
    : 'No additional paperwork required at this time. Our team is finalizing the file.'
}

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Confidential notice issued by Sky Ariana Claims & Incident Management Center. For inquiries, reply directly to this message or contact claims@skyariana.com._`
  }

  public generateFactualIncidentNotice(incidentId: string): string {
    const inc = this.incidents.find((i) => i.id === incidentId)
    if (!inc) return 'Error: Incident record not found.'

    return `*SKY ARIANA LOGISTICS — FACTUAL INCIDENT NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Incident Ref:* ${inc.incidentNumber}
*Date Observed:* ${inc.incidentDate}
*Location:* ${inc.locationName} (${inc.locationType})
*Shipment / BOL:* ${inc.bolNumber || inc.shipmentRef}

*Factual Summary:*
${inc.description}

*Affected Scope:*
- Quantity: ${inc.quantityAffected} units / packages
- Weight: ${inc.weightAffectedKg} kg
- Severity Level: ${inc.severity}
- Evidence Status: ${inc.evidenceStatus}

*Current Action:*
Joint inspection completed. File has been placed under standard operational assessment. No final liability determination is made until technical inspection is completed.

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Sky Ariana Operations Control Center_`
  }

  // ==========================================
  // 10. Dashboard & Summary KPIs
  // Segregated multi-currency exposure calculation
  // ==========================================
  public getSummaryKpis(): ClaimsSummaryKpi {
    const openIncidents = this.incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED' && i.status !== 'CANCELLED').length
    const openClaims = this.claims.filter((c) => c.claimStatus !== 'SETTLED' && c.claimStatus !== 'CLOSED' && c.claimStatus !== 'REJECTED' && c.claimStatus !== 'WITHDRAWN').length

    const cargoDamageCount = this.incidents.filter((i) => i.incidentType === 'CARGO_DAMAGE' || i.incidentType === 'WET_CARGO' || i.incidentType === 'PACKAGING_DAMAGE').length
    const shortageClaimsCount = this.incidents.filter((i) => i.incidentType === 'CARGO_SHORTAGE' || i.incidentType === 'CARGO_LOSS').length
    const containerDamageCount = this.incidents.filter((i) => i.incidentType === 'CONTAINER_DAMAGE').length
    const detentionDisputesCount = this.incidents.filter((i) => i.incidentType === 'DETENTION' || i.incidentType === 'DEMURRAGE').length
    const insuranceClaimsCount = this.insuranceClaims.length

    const awaitingDocumentsCount = this.claims.filter((c) => c.claimStatus === 'DOCUMENTS_PENDING' || c.checklist.some((chk) => chk.required && !chk.isCompleted)).length
    const underReviewCount = this.claims.filter((c) => c.claimStatus === 'UNDER_REVIEW' || c.responsibilityStatus === 'UNDER_REVIEW').length
    const awaitingResponseCount = this.claims.filter((c) => c.claimStatus === 'AWAITING_RESPONSE' || c.claimStatus === 'NEGOTIATION').length

    // Financial Exposure USD only (Never mixing currencies)
    const totalFinancialExposureUsd = this.claims
      .filter((c) => c.currency === 'USD' && c.claimStatus !== 'SETTLED' && c.claimStatus !== 'CLOSED' && c.claimStatus !== 'REJECTED' && c.claimStatus !== 'WITHDRAWN')
      .reduce((sum, c) => sum + c.outstandingExposure, 0)

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const settledThisMonthCount = this.claims.filter((c) => {
      if (c.claimStatus !== 'SETTLED' || !c.closedDate) return false
      const closed = new Date(c.closedDate)
      return closed.getMonth() === currentMonth && closed.getFullYear() === currentYear
    }).length

    return {
      openIncidents,
      openClaims,
      cargoDamageCount,
      shortageClaimsCount,
      containerDamageCount,
      detentionDisputesCount,
      insuranceClaimsCount,
      awaitingDocumentsCount,
      underReviewCount,
      awaitingResponseCount,
      totalFinancialExposureUsd,
      settledThisMonthCount,
    }
  }

  // ==========================================
  // 11. State Export & Import (JSON Snapshot)
  // ==========================================
  public exportStateJson(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        incidents: this.incidents,
        claims: this.claims,
        evidence: this.evidence,
        insurancePolicies: this.insurancePolicies,
        insuranceClaims: this.insuranceClaims,
      },
      null,
      2
    )
  }

  public importStateJson(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString)
      if (Array.isArray(data.incidents)) this.incidents = data.incidents
      if (Array.isArray(data.claims)) this.claims = data.claims
      if (Array.isArray(data.evidence)) this.evidence = data.evidence
      if (Array.isArray(data.insurancePolicies)) this.insurancePolicies = data.insurancePolicies
      if (Array.isArray(data.insuranceClaims)) this.insuranceClaims = data.insuranceClaims

      this.saveToLocalStorage()
      return { success: true, message: `Successfully imported ${this.incidents.length} incidents and ${this.claims.length} claims.` }
    } catch (e: any) {
      return { success: false, message: `Failed to import JSON state: ${e.message}` }
    }
  }
}
