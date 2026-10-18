/**
 * Phase 25: CRM, Sales Pipeline & Customer Service Center Service Engine
 * Central stateful service for customer relationships, leads, inquiries,
 * sales opportunities, follow-up workflow, and customer service requests across Sky Ariana Limited.
 * 
 * Strict Guarantees:
 * - NO duplicate customer/company database (strictly shares MasterEntity).
 * - NO second quotation engine (strictly integrates with freightPricingService).
 * - NO sales-side ledger modification (customer finance balances are strictly read-only).
 * - NO AI-invented win probabilities or fake customer intent.
 * - Multi-currency pipeline segregation without cross-currency summing.
 * - Multi-PC optimistic locking (revision tokens) to prevent race-condition stage overwrites.
 */

import {
  LeadRecord,
  LeadStatus,
  LeadSource,
  SalesInquiryRecord,
  InquiryStatus,
  OpportunityRecord,
  OpportunityStage,
  OpportunityStatus,
  LostReason,
  CrmFollowUpTask,
  FollowUpStatus,
  CrmActivityRecord,
  CustomerServiceRequest,
  ServiceRequestStatus,
  ServiceRequestCategory,
  ServiceRequestPriority,
  ServiceRequestResponse,
  CustomerProfileCrmExtension,
  CrmDashboardKpi,
} from '../types/crm-sales'
import { freightPricingService } from './freight-pricing-service'
import { MasterEntity } from '../types/master-data'

export class CrmSalesStore {
  private static instance: CrmSalesStore

  private leads: LeadRecord[] = []
  private inquiries: SalesInquiryRecord[] = []
  private opportunities: OpportunityRecord[] = []
  private followUps: CrmFollowUpTask[] = []
  private activities: CrmActivityRecord[] = []
  private serviceRequests: CustomerServiceRequest[] = []
  private customerExtensions: Record<string, CustomerProfileCrmExtension> = {}

  private constructor() {
    this.seedInitialData()
    this.loadFromLocalStorage()
  }

  public static getInstance(): CrmSalesStore {
    if (!CrmSalesStore.instance) {
      CrmSalesStore.instance = new CrmSalesStore()
    }
    return CrmSalesStore.instance
  }

  // ==========================================
  // 1. Initial Seed Data
  // ==========================================
  private seedInitialData() {
    // 1. Leads
    this.leads = [
      {
        id: 'lead-00125',
        leadNumber: 'LEAD-2026-00125',
        companyName: 'Nadir Afghan Pine Nut Processing LLC',
        contactPerson: 'Haji Nadir Alokozay',
        phone: '+93 79 912 3456',
        whatsApp: '+93 79 912 3456',
        email: 'nadir@afghanpinenuts.com',
        country: 'Afghanistan',
        city: 'Kabul',
        source: 'WHATSAPP',
        interestedService: 'AIR',
        tradeLane: 'Kabul (KBL) to Guangzhou (CAN)',
        origin: 'Kabul International Airport',
        destination: 'Guangzhou Baiyun Airport',
        commodity: 'Shelled Pine Nuts (Jalghoza)',
        expectedVolume: '5,000 kg / week',
        containerType: 'AIR_CARGO',
        notes: 'Inquired via WhatsApp for air cargo charter availability during peak harvest season.',
        owner: 'Bilal Ahmad (Senior Sales Lead)',
        status: 'QUALIFIED',
        nextFollowUp: new Date().toISOString().split('T')[0],
        createdAt: '2026-03-15T09:00:00Z',
        updatedAt: '2026-03-20T11:00:00Z',
      },
      {
        id: 'lead-00126',
        leadNumber: 'LEAD-2026-00126',
        companyName: 'Kabul Central Medical Supplies',
        contactPerson: 'Dr. Homayoun Raufi',
        phone: '+93 70 023 9876',
        email: 'procurement@kabulmedical.af',
        country: 'Afghanistan',
        city: 'Kabul',
        source: 'PHONE',
        interestedService: 'REEFER',
        tradeLane: 'Bandar Abbas to Kabul via Islam Qala',
        origin: 'Bandar Abbas Port',
        destination: 'Kabul ICD',
        commodity: 'Temperature-controlled Pharmaceuticals',
        expectedVolume: '2 x 40RF per month',
        containerType: '40RF',
        notes: 'Needs continuous +2°C to +8°C cold chain monitoring with clip-on genset.',
        owner: 'Massoud Khan (Commercial Executive)',
        status: 'QUALIFYING',
        nextFollowUp: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        createdAt: '2026-03-18T14:30:00Z',
        updatedAt: '2026-03-21T10:15:00Z',
      },
      {
        id: 'lead-00127',
        leadNumber: 'LEAD-2026-00127',
        companyName: 'Khorasan Natural Marble & Granite',
        contactPerson: 'Haji Qayoom Herawi',
        phone: '+93 78 845 1122',
        country: 'Afghanistan',
        city: 'Herat',
        source: 'WALK_IN',
        interestedService: 'ROAD',
        tradeLane: 'Herat to Bandar Abbas',
        origin: 'Chesht-e-Sharif Quarry, Herat',
        destination: 'Bandar Abbas Port (Export)',
        commodity: 'Raw White Onyx Marble Blocks',
        expectedVolume: '20 flatbed trucks',
        notes: 'Walk-in inquiry at Herat office. Demands competitive road freight with fast customs transit at Islam Qala.',
        owner: 'Bilal Ahmad (Senior Sales Lead)',
        status: 'NEW',
        createdAt: '2026-03-22T08:45:00Z',
        updatedAt: '2026-03-22T08:45:00Z',
      },
      {
        id: 'lead-00128',
        leadNumber: 'LEAD-2026-00128',
        companyId: 'comp-hind-afg',
        companyName: 'Hind-Afghan Spice Importers Delhi',
        contactPerson: 'Rajesh Kumar',
        phone: '+91 98 1122 3344',
        email: 'rajesh@delhispicetrading.in',
        country: 'India',
        city: 'New Delhi',
        source: 'EMAIL',
        interestedService: 'MULTIMODAL',
        tradeLane: 'Nhava Sheva (JNPT) to Kabul via Bandar Abbas',
        commodity: 'Black Pepper & Cardamom',
        expectedVolume: '3 x 40HC',
        containerType: '40HC',
        notes: 'Regular buyer of Afghan dry fruits looking for return multimodal freight from Mumbai to Kabul.',
        owner: 'Massoud Khan (Commercial Executive)',
        status: 'CONVERTED',
        convertedOpportunityId: 'opp-00125',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-10T16:00:00Z',
      },
    ]

    // 2. Inquiries
    this.inquiries = [
      {
        id: 'inq-00125',
        inquiryNumber: 'INQ-2026-00125',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        contactPerson: 'Haji Sultan Mohammad',
        contactPhone: '+93 79 900 1122',
        inquiryDate: '2026-03-16',
        serviceMode: 'REEFER',
        origin: 'Herat Transit Terminal',
        destination: 'Nhava Sheva Port, India',
        routeId: 'rt-hrt-nsa-reefer',
        routeName: 'Herat to Nhava Sheva Multimodal Reefer',
        commodity: 'Super Negin Saffron (Export Grade)',
        packagesCount: 120,
        weightKg: 1400,
        containerType: '40RF',
        containerQuantity: 1,
        temperature: '+15°C Humidity Controlled',
        requestedService: 'FULL_WAY',
        requestedDeliveryDate: '2026-04-10',
        specialRequirements: 'High-security bolt seals and continuous temperature logger reading required.',
        status: 'QUOTED',
        owner: 'Bilal Ahmad (Senior Sales Lead)',
        quotationId: 'quot-saffron-01',
        source: 'WHATSAPP',
        notes: 'Customer accepted provisional rate. Preparing formal revised quote with insurance.',
        createdAt: '2026-03-16T11:00:00Z',
        updatedAt: '2026-03-18T14:00:00Z',
      },
      {
        id: 'inq-00126',
        inquiryNumber: 'INQ-2026-00126',
        customerId: 'comp-balkh-agri',
        customerName: 'Balkh Agricultural Union',
        contactPerson: 'Abdul Rahman',
        contactPhone: '+93 70 044 5566',
        inquiryDate: '2026-03-19',
        serviceMode: 'MULTIMODAL',
        origin: 'Mazar-i-Sharif Dry Port',
        destination: 'Jebel Ali Port, UAE',
        commodity: 'Green & Golden Raisins (Best Grade)',
        packagesCount: 2800,
        weightKg: 42000,
        containerType: '40HC',
        containerQuantity: 2,
        requestedService: 'FULL_WAY',
        requestedDeliveryDate: '2026-04-20',
        status: 'READY_TO_QUOTE',
        owner: 'Massoud Khan (Commercial Executive)',
        source: 'PHONE',
        notes: 'Inquired for standard 40HC dry containers via Hairatan / Bandar Abbas corridor.',
        createdAt: '2026-03-19T13:30:00Z',
        updatedAt: '2026-03-21T09:00:00Z',
      },
      {
        id: 'inq-00127',
        inquiryNumber: 'INQ-2026-00127',
        customerName: 'Afghan National Pharma Care',
        contactPerson: 'Dr. Zabiullah',
        contactPhone: '+93 77 788 9900',
        inquiryDate: '2026-03-20',
        serviceMode: 'AIR',
        origin: 'Dubai International Airport (DXB)',
        destination: 'Hamid Karzai International Airport (KBL)',
        commodity: 'Emergency Vaccines & Injectables',
        packagesCount: 24,
        weightKg: 180,
        containerType: 'AIR_CARGO',
        containerQuantity: 1,
        temperature: '+2°C to +8°C',
        requestedService: 'PORT_TO_PORT',
        requestedDeliveryDate: '2026-03-28',
        specialRequirements: 'Immediate cold storage tarmac transit at KBL.',
        status: 'RATE_REQUESTED',
        owner: 'Sohail Ahmad (Pharma Logistics Lead)',
        source: 'EMAIL',
        notes: 'Checking scheduled Kam Air cargo space and cold storage bay availability.',
        createdAt: '2026-03-20T10:00:00Z',
        updatedAt: '2026-03-22T08:00:00Z',
      },
    ]

    // 3. Opportunities
    this.opportunities = [
      {
        id: 'opp-00125',
        opportunityNumber: 'OPP-2026-00125',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        inquiryId: 'inq-00125',
        title: 'Ariana Saffron Annual India Export Contract (12 x 40RF)',
        tradeLane: 'Herat to Nhava Sheva (JNPT) via Bandar Abbas',
        service: 'FULL_WAY Multimodal Reefer',
        commodity: 'Super Negin Saffron',
        equipment: '12 × 40RF',
        expectedVolume: '12 containers over 6 months',
        expectedRevenue: 34200, // Expected freight service revenue only
        currency: 'USD',
        probability: 75, // Internal Pipeline Estimate (configured user percentage)
        targetStartDate: '2026-04-01',
        expectedCloseDate: '2026-04-05',
        owner: 'Bilal Ahmad (Senior Sales Lead)',
        stage: 'NEGOTIATION',
        status: 'ACTIVE',
        nextAction: 'Follow up on revised insurance terms and lock booking confirmation',
        nextActionDate: new Date().toISOString().split('T')[0],
        linkedQuotationIds: ['SA-QT-2026-00125', 'SA-QT-2026-00125-R1'],
        revision: 2,
        notes: 'Client requested complimentary GPS reefer tracker app access. Commercial margin is sound.',
        createdAt: '2026-03-16T12:00:00Z',
        updatedAt: '2026-03-22T15:00:00Z',
      },
      {
        id: 'opp-00126',
        opportunityNumber: 'OPP-2026-00126',
        customerId: 'comp-balkh-agri',
        customerName: 'Balkh Agricultural Union',
        inquiryId: 'inq-00126',
        title: 'Balkh Raisins Summer Transit to Dubai (2 x 40HC)',
        tradeLane: 'Mazar-i-Sharif to Jebel Ali Port, UAE',
        service: 'FULL_WAY Dry Container Transit',
        commodity: 'Dried Raisins',
        equipment: '2 × 40HC',
        expectedVolume: '2 containers',
        expectedRevenue: 14800,
        currency: 'USD',
        probability: 60,
        targetStartDate: '2026-04-15',
        expectedCloseDate: '2026-04-10',
        owner: 'Massoud Khan (Commercial Executive)',
        stage: 'QUOTATION_SENT',
        status: 'ACTIVE',
        nextAction: 'Confirm empty container positioning at Hairatan yard',
        nextActionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        linkedQuotationIds: ['SA-QT-2026-00128'],
        revision: 1,
        notes: 'Quote sent via WhatsApp with 14 free days at destination port.',
        createdAt: '2026-03-19T15:00:00Z',
        updatedAt: '2026-03-21T11:00:00Z',
      },
      {
        id: 'opp-00127',
        opportunityNumber: 'OPP-2026-00127',
        customerId: 'comp-kabul-const',
        customerName: 'Kabul Modern Construction Co.',
        title: 'Kabul Construction Steel Rebar Transit from Dubai',
        tradeLane: 'Jebel Ali to Kabul via Islam Qala',
        service: 'FULL_WAY Heavy Cargo Transit',
        commodity: 'Construction Steel & Fittings',
        equipment: '8 × 40GP',
        expectedVolume: '8 containers',
        expectedRevenue: 48000,
        currency: 'USD',
        probability: 100,
        targetStartDate: '2026-03-10',
        expectedCloseDate: '2026-03-14',
        owner: 'Bilal Ahmad (Senior Sales Lead)',
        stage: 'WON',
        status: 'WON',
        linkedQuotationIds: ['SA-QT-2026-00110'],
        acceptedQuotationId: 'SA-QT-2026-00110',
        convertedShipmentId: 'BOL-2026-0350', // Prevents duplicate conversion
        nextAction: 'Operations monitoring container return at Bandar Abbas depot',
        revision: 3,
        notes: 'Client approved quote. 8 containers shipped successfully.',
        createdAt: '2026-03-05T09:00:00Z',
        updatedAt: '2026-03-14T17:00:00Z',
      },
      {
        id: 'opp-00128',
        opportunityNumber: 'OPP-2026-00128',
        customerId: 'comp-kandahar-pome',
        customerName: 'Kandahar Pomegranate Fresh Trade',
        title: 'Kandahar Fresh Pomegranate Express Air Charter',
        tradeLane: 'Kandahar (KDH) to Dubai (DXB)',
        service: 'AIR_ONLY Dedicated Cargo Charter',
        commodity: 'Fresh Pomegranates',
        equipment: 'IL-76 Charter Flight',
        expectedVolume: '40 tons',
        expectedRevenue: 22000,
        currency: 'USD',
        probability: 0,
        expectedCloseDate: '2026-03-12',
        owner: 'Massoud Khan (Commercial Executive)',
        stage: 'LOST',
        status: 'LOST',
        lostReason: 'PRICE',
        lostCompetitor: 'Local Cross-Border Truckers Union',
        lostNotes: 'Customer opted for cheaper overland route through Chaman border due to tight margins.',
        nextAction: 'Keep relationship warm for upcoming melon harvest season',
        revision: 2,
        linkedQuotationIds: ['SA-QT-2026-00098'],
        notes: 'Lost strictly on transport price difference.',
        createdAt: '2026-03-02T10:00:00Z',
        updatedAt: '2026-03-12T14:00:00Z',
      },
      {
        id: 'opp-00129',
        opportunityNumber: 'OPP-2026-00129',
        customerId: 'comp-gulf-merch',
        customerName: 'Gulf Merchant Logistics FZE',
        title: 'Dubai JAFZA Hub Consolidated Road Freight',
        tradeLane: 'Dubai to Herat via Bandar Abbas',
        service: 'MULTIMODAL Cross-Dock Transit',
        commodity: 'General Consumer Electronics',
        equipment: '3 × 40HC',
        expectedVolume: '3 containers',
        expectedRevenue: 35000,
        currency: 'AED', // Segregated currency
        probability: 40,
        targetStartDate: '2026-04-25',
        expectedCloseDate: '2026-04-18',
        owner: 'Bilal Ahmad (Senior Sales Lead)',
        stage: 'QUALIFIED',
        status: 'ACTIVE',
        nextAction: 'Request ocean carrier spot rates for JAFZA pickup',
        nextActionDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        linkedQuotationIds: [],
        revision: 1,
        notes: 'Inquiry in AED currency. Separate pipeline tracking enforced.',
        createdAt: '2026-03-21T11:00:00Z',
        updatedAt: '2026-03-22T09:30:00Z',
      },
    ]

    // 4. Follow-Up Tasks
    this.followUps = [
      {
        id: 'task-001',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        opportunityId: 'opp-00125',
        quotationId: 'SA-QT-2026-00125-R1',
        dueDate: new Date().toISOString().split('T')[0], // Due Today
        assignedUser: 'Bilal Ahmad',
        type: 'QUOTE_FOLLOW_UP',
        priority: 'HIGH',
        status: 'PENDING',
        notes: 'Call Haji Sultan to finalize booking confirmation on 12-container saffron contract.',
        createdAt: '2026-03-21T10:00:00Z',
      },
      {
        id: 'task-002',
        customerId: 'comp-balkh-agri',
        customerName: 'Balkh Agricultural Union',
        opportunityId: 'opp-00126',
        dueDate: '2026-03-20', // Overdue
        assignedUser: 'Massoud Khan',
        type: 'PHONE',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: 'Overdue follow-up: Check if dry fruit export permit was granted by Ministry of Commerce.',
        createdAt: '2026-03-18T09:00:00Z',
      },
      {
        id: 'task-003',
        customerId: 'comp-kabul-medical',
        customerName: 'Kabul Central Medical Supplies',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Upcoming
        assignedUser: 'Massoud Khan',
        type: 'MEETING',
        priority: 'NORMAL',
        status: 'PENDING',
        notes: 'Meet Dr. Homayoun to inspect sample cold box packaging specifications.',
        createdAt: '2026-03-21T14:00:00Z',
      },
      {
        id: 'task-004',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        quotationId: 'SA-QT-2026-00125',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        assignedUser: 'Bilal Ahmad',
        type: 'QUOTE_FOLLOW_UP',
        priority: 'HIGH',
        status: 'PENDING',
        notes: 'Quote SA-QT-2026-00125 will expire in 3 days. Send validity reminder.',
        createdAt: '2026-03-22T08:00:00Z',
      },
    ]

    // 5. Customer Activities
    this.activities = [
      {
        id: 'act-001',
        date: '2026-03-22T10:15:00Z',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        contactPerson: 'Haji Sultan Mohammad',
        user: 'Bilal Ahmad',
        channel: 'PHONE',
        direction: 'OUTBOUND',
        subject: 'Reefer Monitoring Discussion',
        summary: 'Discussed real-time GPS temperature monitoring and 14 free days at Nhava Sheva. Customer requested updated quote.',
        relatedOpportunityId: 'opp-00125',
        relatedQuoteId: 'SA-QT-2026-00125',
        nextAction: 'Send revised quotation SA-QT-2026-00125-R1',
        nextActionDate: '2026-03-23',
        createdAt: '2026-03-22T10:20:00Z',
      },
      {
        id: 'act-002',
        date: '2026-03-21T15:30:00Z',
        customerId: 'comp-balkh-agri',
        customerName: 'Balkh Agricultural Union',
        contactPerson: 'Abdul Rahman',
        user: 'Massoud Khan',
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        subject: 'Empty Container Inbound Inquiry',
        summary: 'Customer messaged inquiring if 40HC containers are ready at Hairatan depot. Informed them 6 units are available.',
        relatedOpportunityId: 'opp-00126',
        nextAction: 'Follow up on customs papers',
        createdAt: '2026-03-21T15:40:00Z',
      },
    ]

    // 6. Customer Service Requests
    this.serviceRequests = [
      {
        id: 'sr-00125',
        requestNumber: 'SR-2026-00125',
        customerId: 'comp-kabul-const',
        customerName: 'Kabul Modern Construction Co.',
        contactPerson: 'Engineer Tariq',
        contactPhone: '+93 79 933 4455',
        shipmentId: 'bol-0350',
        bolNumber: 'SKYA-BOL-2026-0350',
        containerNumber: 'MSCU4920184',
        category: 'TRACKING',
        subject: 'Container Current Location Inquiry',
        description: 'Client asks for exact ETA of steel container MSCU4920184 returning empty to Bandar Abbas port depot.',
        priority: 'NORMAL',
        status: 'IN_PROGRESS',
        assignedTo: 'Karim Dad (Operations Support)',
        createdAt: '2026-03-22T09:00:00Z',
        dueDate: '2026-03-23T12:00:00Z',
        customerVisible: true,
        responses: [
          {
            id: 'resp-1',
            user: 'Karim Dad',
            date: '2026-03-22T10:30:00Z',
            channel: 'WHATSAPP',
            response: 'Container MSCU4920184 cleared Islam Qala border gate yesterday. Currently en route to Bandar Abbas container terminal.',
            customerVisible: true,
          },
        ],
      },
      {
        id: 'sr-00126',
        requestNumber: 'SR-2026-00126',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        contactPerson: 'Haji Sultan Mohammad',
        contactPhone: '+93 79 900 1122',
        shipmentId: 'bol-0412',
        bolNumber: 'SKYA-BOL-2026-0412',
        category: 'DOCUMENT',
        subject: 'Copy of Non-Negotiable Bill of Lading Request',
        description: 'Customer requests certified PDF copy of Bill of Lading for Indian customs bank clearance.',
        priority: 'HIGH',
        status: 'RESOLVED',
        assignedTo: 'Ahmad Wali (Documentation Desk)',
        createdAt: '2026-03-20T11:00:00Z',
        resolvedAt: '2026-03-20T14:00:00Z',
        resolution: 'Certified digital BOL copy DOC-BOL-0412 dispatched to customer portal and email.',
        customerVisible: true,
        responses: [
          {
            id: 'resp-2',
            user: 'Ahmad Wali',
            date: '2026-03-20T14:00:00Z',
            channel: 'PORTAL',
            response: 'Document has been uploaded to your secure customer portal under Shipment SKYA-BOL-2026-0412.',
            customerVisible: true,
          },
        ],
      },
      {
        id: 'sr-00127',
        requestNumber: 'SR-2026-00127',
        customerId: 'comp-ariana-saffron',
        customerName: 'Ariana Saffron & Spice Traders',
        shipmentId: 'bol-0412',
        bolNumber: 'SKYA-BOL-2026-0412',
        category: 'CLAIM',
        subject: 'Cargo Water Damage Complaint (10 Cartons Saffron)',
        description: 'Client reports moisture damage observed during unloading at Kabul Cargo Complex.',
        priority: 'URGENT',
        status: 'WAITING_INTERNAL',
        assignedTo: 'Karim Dad (Claims Desk)',
        createdAt: '2026-03-18T10:30:00Z',
        customerVisible: true,
        linkedIncidentId: 'inc-00125',
        linkedClaimId: 'clm-00088',
        responses: [
          {
            id: 'resp-3',
            user: 'Karim Dad',
            date: '2026-03-18T11:30:00Z',
            channel: 'EMAIL',
            response: 'Joint damage protocol completed with warehouse supervisor. File officially escalated to Claims Management Center under ref CLM-2026-00088.',
            customerVisible: true,
          },
        ],
      },
    ]
  }

  // ==========================================
  // 2. Storage Persistence (Local-first)
  // ==========================================
  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      const storedLeads = localStorage.getItem('sky_ariana_crm_leads_v1')
      if (storedLeads) this.leads = JSON.parse(storedLeads)

      const storedInquiries = localStorage.getItem('sky_ariana_crm_inquiries_v1')
      if (storedInquiries) this.inquiries = JSON.parse(storedInquiries)

      const storedOpps = localStorage.getItem('sky_ariana_crm_opportunities_v1')
      if (storedOpps) this.opportunities = JSON.parse(storedOpps)

      const storedFollowUps = localStorage.getItem('sky_ariana_crm_followups_v1')
      if (storedFollowUps) this.followUps = JSON.parse(storedFollowUps)

      const storedActivities = localStorage.getItem('sky_ariana_crm_activities_v1')
      if (storedActivities) this.activities = JSON.parse(storedActivities)

      const storedServiceReqs = localStorage.getItem('sky_ariana_crm_service_requests_v1')
      if (storedServiceReqs) this.serviceRequests = JSON.parse(storedServiceReqs)

      const storedExtensions = localStorage.getItem('sky_ariana_crm_customer_extensions_v1')
      if (storedExtensions) this.customerExtensions = JSON.parse(storedExtensions)
    } catch (e) {
      console.warn('Could not read CRM data from localStorage, using memory state', e)
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('sky_ariana_crm_leads_v1', JSON.stringify(this.leads))
      localStorage.setItem('sky_ariana_crm_inquiries_v1', JSON.stringify(this.inquiries))
      localStorage.setItem('sky_ariana_crm_opportunities_v1', JSON.stringify(this.opportunities))
      localStorage.setItem('sky_ariana_crm_followups_v1', JSON.stringify(this.followUps))
      localStorage.setItem('sky_ariana_crm_activities_v1', JSON.stringify(this.activities))
      localStorage.setItem('sky_ariana_crm_service_requests_v1', JSON.stringify(this.serviceRequests))
      localStorage.setItem('sky_ariana_crm_customer_extensions_v1', JSON.stringify(this.customerExtensions))
    } catch (e) {
      console.warn('Could not save CRM data to localStorage', e)
    }
  }

  // ==========================================
  // 3. Lead Methods
  // ==========================================
  public getLeads(): LeadRecord[] {
    return [...this.leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  public getLeadById(id: string): LeadRecord | undefined {
    return this.leads.find((l) => l.id === id || l.leadNumber === id)
  }

  public saveLead(data: Partial<LeadRecord>): LeadRecord {
    const now = new Date().toISOString()
    const isNew = !data.id

    let lead: LeadRecord
    if (isNew) {
      const count = this.leads.length + 1
      const pad = count.toString().padStart(5, '0')
      const leadNumber = data.leadNumber || `LEAD-2026-${pad}`

      lead = {
        id: `lead-${Date.now()}`,
        leadNumber,
        companyId: data.companyId,
        companyName: data.companyName || 'Unnamed Prospect',
        contactPerson: data.contactPerson || 'Contact Pending',
        phone: data.phone || '',
        whatsApp: data.whatsApp || data.phone || '',
        email: data.email,
        country: data.country || 'Afghanistan',
        city: data.city || 'Kabul',
        source: data.source || 'UNKNOWN',
        interestedService: data.interestedService || 'ROAD',
        tradeLane: data.tradeLane,
        origin: data.origin,
        destination: data.destination,
        commodity: data.commodity,
        expectedVolume: data.expectedVolume,
        containerType: data.containerType,
        notes: data.notes,
        owner: data.owner || 'General Sales Desk',
        status: data.status || 'NEW',
        nextFollowUp: data.nextFollowUp,
        createdAt: now,
        updatedAt: now,
      }
      this.leads.unshift(lead)
    } else {
      const idx = this.leads.findIndex((l) => l.id === data.id)
      if (idx === -1) throw new Error(`Lead ${data.id} not found`)
      lead = {
        ...this.leads[idx],
        ...data,
        updatedAt: now,
      }
      this.leads[idx] = lead
    }

    this.saveToLocalStorage()
    return lead
  }

  /**
   * Duplicate detection against Company Master (legal name, alias, phone, email, taxId).
   * Never auto-merges; returns matched candidates.
   */
  public findDuplicateCompanies(
    query: { name?: string; phone?: string; email?: string; taxId?: string },
    existingMasterEntities: MasterEntity[] = []
  ): MasterEntity[] {
    const qName = (query.name || '').trim().toLowerCase()
    const qPhone = (query.phone || '').trim().replace(/[\s\-\+\(\)]/g, '')
    const qEmail = (query.email || '').trim().toLowerCase()
    const qTaxId = (query.taxId || '').trim().toLowerCase()

    return existingMasterEntities.filter((entity) => {
      const eName = entity.name.toLowerCase()
      const eAlias = (entity.alias || '').toLowerCase()
      const ePhone = (entity.phone || '').replace(/[\s\-\+\(\)]/g, '')
      const eEmail = (entity.email || '').toLowerCase()
      const eTaxId = (entity.taxId || '').toLowerCase()

      const matchName = qName && (eName.includes(qName) || qName.includes(eName) || (eAlias && eAlias.includes(qName)))
      const matchPhone = qPhone && ePhone && (ePhone.includes(qPhone) || qPhone.includes(ePhone))
      const matchEmail = qEmail && eEmail && eEmail === qEmail
      const matchTaxId = qTaxId && eTaxId && eTaxId === qTaxId

      return matchName || matchPhone || matchEmail || matchTaxId
    })
  }

  /**
   * Convert Lead into Company Master reference and create linked Opportunity.
   */
  public convertLead(
    leadId: string,
    targetCompanyId: string,
    opportunityTitle?: string,
    expectedRevenue: number = 5000,
    currency: string = 'USD'
  ): { lead: LeadRecord; opportunity: OpportunityRecord } {
    const lead = this.leads.find((l) => l.id === leadId)
    if (!lead) throw new Error(`Lead ${leadId} not found`)

    const now = new Date().toISOString()
    const oppCount = this.opportunities.length + 1
    const oppNumber = `OPP-2026-${oppCount.toString().padStart(5, '0')}`

    const newOpp: OpportunityRecord = {
      id: `opp-${Date.now()}`,
      opportunityNumber: oppNumber,
      customerId: targetCompanyId,
      customerName: lead.companyName,
      title: opportunityTitle || `${lead.companyName} — ${lead.interestedService} Opportunity`,
      tradeLane: lead.tradeLane || (lead.origin && lead.destination ? `${lead.origin} to ${lead.destination}` : 'Corridor Pending'),
      service: lead.interestedService,
      commodity: lead.commodity || 'General Cargo',
      equipment: lead.containerType || '1 × 40HC',
      expectedVolume: lead.expectedVolume || '1 container',
      expectedRevenue,
      currency,
      probability: 50, // User-configured pipeline estimate
      expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      owner: lead.owner,
      stage: 'QUALIFIED',
      status: 'ACTIVE',
      nextAction: 'Prepare freight quotation from route pricing master',
      nextActionDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      linkedQuotationIds: [],
      revision: 1,
      notes: `Converted from ${lead.leadNumber}. Lead notes: ${lead.notes || 'None'}`,
      createdAt: now,
      updatedAt: now,
    }

    this.opportunities.unshift(newOpp)

    lead.status = 'CONVERTED'
    lead.companyId = targetCompanyId
    lead.convertedOpportunityId = newOpp.id
    lead.updatedAt = now

    this.saveToLocalStorage()
    return { lead, opportunity: newOpp }
  }

  // ==========================================
  // 4. Sales Inquiries
  // ==========================================
  public getInquiries(): SalesInquiryRecord[] {
    return [...this.inquiries].sort((a, b) => new Date(b.inquiryDate).getTime() - new Date(a.inquiryDate).getTime())
  }

  public saveInquiry(data: Partial<SalesInquiryRecord>): SalesInquiryRecord {
    const now = new Date().toISOString()
    const isNew = !data.id

    let inq: SalesInquiryRecord
    if (isNew) {
      const count = this.inquiries.length + 1
      const pad = count.toString().padStart(5, '0')
      const inquiryNumber = data.inquiryNumber || `INQ-2026-${pad}`

      inq = {
        id: `inq-${Date.now()}`,
        inquiryNumber,
        customerId: data.customerId,
        customerName: data.customerName || 'Pending Customer',
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        inquiryDate: data.inquiryDate || now.split('T')[0],
        serviceMode: data.serviceMode || 'ROAD',
        origin: data.origin || 'Kabul',
        destination: data.destination || 'Bandar Abbas',
        routeId: data.routeId,
        routeName: data.routeName,
        commodity: data.commodity || 'General Cargo',
        packagesCount: data.packagesCount,
        weightKg: data.weightKg,
        containerType: data.containerType || '40HC',
        containerQuantity: data.containerQuantity || 1,
        temperature: data.temperature,
        requestedService: data.requestedService || 'FULL_WAY',
        requestedDeliveryDate: data.requestedDeliveryDate,
        specialRequirements: data.specialRequirements,
        status: data.status || 'NEW',
        owner: data.owner || 'Sales Desk',
        quotationId: data.quotationId,
        source: data.source || 'WHATSAPP',
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      }
      this.inquiries.unshift(inq)
    } else {
      const idx = this.inquiries.findIndex((i) => i.id === data.id)
      if (idx === -1) throw new Error(`Inquiry ${data.id} not found`)
      inq = {
        ...this.inquiries[idx],
        ...data,
        updatedAt: now,
      }
      this.inquiries[idx] = inq
    }

    this.saveToLocalStorage()
    return inq
  }

  /**
   * Generates a formal quotation in the Rates & Quotations module from an inquiry.
   * Strictly reuses freightPricingService (NO duplicate quotation engine).
   */
  public createQuoteFromInquiry(
    inquiryId: string,
    sellRate: number = 4500,
    buyCost: number = 3800,
    currency: string = 'USD'
  ): { inquiry: SalesInquiryRecord; quotationNumber: string } {
    const inq = this.inquiries.find((i) => i.id === inquiryId)
    if (!inq) throw new Error(`Inquiry ${inquiryId} not found`)

    // Save quotation directly in canonical pricing engine
    const quote = freightPricingService.createQuotation({
      customerName: inq.customerName,
      customerPhone: inq.contactPhone,
      customerEmail: inq.contactEmail,
      date: new Date().toISOString().split('T')[0],
      originName: inq.origin,
      destinationName: inq.destination,
      commodity: inq.commodity,
      containerType: (inq.containerType as any) || '40HC',
      containerQuantity: inq.containerQuantity,
      serviceType: inq.requestedService === 'FULL_WAY' ? 'FULL_WAY' : 'HALF_WAY',
      temperature: inq.temperature,
      currency,
      pricingLines: [
        {
          id: `line-${Date.now()}`,
          chargeCode: 'FREIGHT_MAIN',
          chargeName: 'Freight Carriage (Main Leg)',
          category: 'FREIGHT',
          buyAmount: buyCost,
          sellAmount: sellRate,
          currency,
          quantity: inq.containerQuantity,
          unit: 'PER_CONTAINER',
        },
      ],
      terms: ['Standard Afghan Transit Conditions apply', 'Payment terms: 50% deposit, balance upon delivery'],
      includedServices: ['Standard transport carriage', 'Customs border crossing protocol documentation'],
      excludedServices: ['Demurrage and detention beyond free days', 'Cargo physical loss/damage insurance'],
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'SENT',
      notes: `Generated from Inquiry ${inq.inquiryNumber}`,
      createdBy: inq.owner,
    })

    inq.status = 'QUOTED'
    inq.quotationId = quote.quotationNumber
    inq.updatedAt = new Date().toISOString()

    this.saveToLocalStorage()
    return { inquiry: inq, quotationNumber: quote.quotationNumber }
  }

  // ==========================================
  // 5. Sales Opportunities & Pipeline
  // ==========================================
  public getOpportunities(): OpportunityRecord[] {
    return [...this.opportunities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  public getOpportunityById(id: string): OpportunityRecord | undefined {
    return this.opportunities.find((o) => o.id === id || o.opportunityNumber === id)
  }

  public saveOpportunity(data: Partial<OpportunityRecord>): OpportunityRecord {
    const now = new Date().toISOString()
    const isNew = !data.id

    let opp: OpportunityRecord
    if (isNew) {
      const count = this.opportunities.length + 1
      const pad = count.toString().padStart(5, '0')
      const opportunityNumber = data.opportunityNumber || `OPP-2026-${pad}`

      opp = {
        id: `opp-${Date.now()}`,
        opportunityNumber,
        customerId: data.customerId || 'comp-unassigned',
        customerName: data.customerName || 'General Customer',
        inquiryId: data.inquiryId,
        title: data.title || 'New Sales Opportunity',
        tradeLane: data.tradeLane || 'Regional Corridor',
        service: data.service || 'FULL_WAY',
        commodity: data.commodity || 'General Cargo',
        equipment: data.equipment || '1 × 40HC',
        expectedVolume: data.expectedVolume || '1 container',
        expectedRevenue: data.expectedRevenue || 0,
        currency: data.currency || 'USD',
        probability: data.probability !== undefined ? data.probability : 50,
        targetStartDate: data.targetStartDate,
        expectedCloseDate: data.expectedCloseDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        owner: data.owner || 'Sales Desk',
        stage: data.stage || 'NEW_INQUIRY',
        status: data.status || 'ACTIVE',
        lostReason: data.lostReason,
        lostCompetitor: data.lostCompetitor,
        lostNotes: data.lostNotes,
        nextAction: data.nextAction || 'Follow up quotation status',
        nextActionDate: data.nextActionDate,
        linkedQuotationIds: data.linkedQuotationIds || [],
        revision: 1,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      }
      this.opportunities.unshift(opp)
    } else {
      const idx = this.opportunities.findIndex((o) => o.id === data.id)
      if (idx === -1) throw new Error(`Opportunity ${data.id} not found`)

      // Optimistic locking revision protection
      if (data.revision !== undefined && data.revision !== this.opportunities[idx].revision) {
        throw new Error(
          `Conflict detected: Opportunity ${data.id} was updated on another screen. Please refresh before saving.`
        )
      }

      opp = {
        ...this.opportunities[idx],
        ...data,
        revision: (this.opportunities[idx].revision || 1) + 1,
        updatedAt: now,
      }
      this.opportunities[idx] = opp
    }

    this.saveToLocalStorage()
    return opp
  }

  /**
   * Advance or change opportunity stage with optimistic locking protection.
   */
  public updateOpportunityStage(
    oppId: string,
    newStage: OpportunityStage,
    expectedRevision?: number
  ): OpportunityRecord {
    const opp = this.opportunities.find((o) => o.id === oppId)
    if (!opp) throw new Error(`Opportunity ${oppId} not found`)

    if (expectedRevision !== undefined && opp.revision !== expectedRevision) {
      throw new Error(`Conflict detected: Opportunity was modified by another workstation. Please refresh.`)
    }

    opp.stage = newStage
    if (newStage === 'WON') {
      opp.status = 'WON'
    } else if (newStage === 'LOST') {
      opp.status = 'LOST'
    } else if (newStage === 'ON_HOLD') {
      opp.status = 'ON_HOLD'
    } else {
      opp.status = 'ACTIVE'
    }

    opp.revision += 1
    opp.updatedAt = new Date().toISOString()
    this.saveToLocalStorage()
    return opp
  }

  /**
   * Mark opportunity WON upon customer confirmation, linking accepted quote.
   * Tracks convertedShipmentId to prevent duplicate conversions.
   */
  public markOpportunityWon(
    oppId: string,
    acceptedQuoteId: string,
    createShipmentId?: string
  ): OpportunityRecord {
    const opp = this.opportunities.find((o) => o.id === oppId)
    if (!opp) throw new Error(`Opportunity ${oppId} not found`)

    opp.stage = 'WON'
    opp.status = 'WON'
    opp.probability = 100
    opp.acceptedQuotationId = acceptedQuoteId
    if (createShipmentId) {
      opp.convertedShipmentId = createShipmentId
    }
    opp.revision += 1
    opp.updatedAt = new Date().toISOString()

    this.saveToLocalStorage()
    return opp
  }

  /**
   * Mark opportunity LOST with recorded reason and competitor citation.
   */
  public markOpportunityLost(
    oppId: string,
    lostReason: LostReason,
    lostCompetitor?: string,
    lostNotes?: string
  ): OpportunityRecord {
    const opp = this.opportunities.find((o) => o.id === oppId)
    if (!opp) throw new Error(`Opportunity ${oppId} not found`)

    opp.stage = 'LOST'
    opp.status = 'LOST'
    opp.probability = 0
    opp.lostReason = lostReason
    opp.lostCompetitor = lostCompetitor
    opp.lostNotes = lostNotes
    opp.revision += 1
    opp.updatedAt = new Date().toISOString()

    this.saveToLocalStorage()
    return opp
  }

  /**
   * Reopen a Lost or On-Hold opportunity with audit retention.
   */
  public reopenOpportunity(oppId: string): OpportunityRecord {
    const opp = this.opportunities.find((o) => o.id === oppId)
    if (!opp) throw new Error(`Opportunity ${oppId} not found`)

    opp.stage = 'FOLLOW_UP'
    opp.status = 'ACTIVE'
    opp.probability = 50
    opp.revision += 1
    opp.updatedAt = new Date().toISOString()

    this.saveToLocalStorage()
    return opp
  }

  // ==========================================
  // 6. Follow-Up Tasks
  // ==========================================
  public getFollowUps(): CrmFollowUpTask[] {
    return [...this.followUps].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }

  public getFollowUpsToday(): CrmFollowUpTask[] {
    const today = new Date().toISOString().split('T')[0]
    return this.followUps.filter((t) => t.status === 'PENDING' && t.dueDate === today)
  }

  public getFollowUpsOverdue(): CrmFollowUpTask[] {
    const today = new Date().toISOString().split('T')[0]
    return this.followUps.filter((t) => t.status === 'PENDING' && t.dueDate < today)
  }

  public saveFollowUp(data: Partial<CrmFollowUpTask>): CrmFollowUpTask {
    const now = new Date().toISOString()
    const isNew = !data.id

    let task: CrmFollowUpTask
    if (isNew) {
      task = {
        id: `task-${Date.now()}`,
        customerId: data.customerId || '',
        customerName: data.customerName || 'Customer',
        opportunityId: data.opportunityId,
        quotationId: data.quotationId,
        dueDate: data.dueDate || now.split('T')[0],
        assignedUser: data.assignedUser || 'Sales Rep',
        type: data.type || 'QUOTE_FOLLOW_UP',
        priority: data.priority || 'NORMAL',
        status: data.status || 'PENDING',
        notes: data.notes || '',
        createdAt: now,
      }
      this.followUps.push(task)
    } else {
      const idx = this.followUps.findIndex((t) => t.id === data.id)
      if (idx === -1) throw new Error(`Task ${data.id} not found`)
      task = { ...this.followUps[idx], ...data }
      this.followUps[idx] = task
    }

    this.saveToLocalStorage()
    return task
  }

  public completeFollowUp(taskId: string): CrmFollowUpTask {
    const task = this.followUps.find((t) => t.id === taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)

    task.status = 'COMPLETED'
    task.completedAt = new Date().toISOString()
    this.saveToLocalStorage()
    return task
  }

  // ==========================================
  // 7. Customer Activities
  // ==========================================
  public getActivities(customerId?: string): CrmActivityRecord[] {
    if (customerId) {
      return this.activities
        .filter((a) => a.customerId === customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    return [...this.activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  public saveActivity(data: Partial<CrmActivityRecord>): CrmActivityRecord {
    const now = new Date().toISOString()
    const act: CrmActivityRecord = {
      id: `act-${Date.now()}`,
      date: data.date || now,
      customerId: data.customerId || '',
      customerName: data.customerName || 'Customer',
      contactPerson: data.contactPerson,
      user: data.user || 'Sales Rep',
      channel: data.channel || 'PHONE',
      direction: data.direction || 'OUTBOUND',
      subject: data.subject || 'Activity Logged',
      summary: data.summary || '',
      relatedOpportunityId: data.relatedOpportunityId,
      relatedQuoteId: data.relatedQuoteId,
      relatedShipmentId: data.relatedShipmentId,
      nextAction: data.nextAction,
      nextActionDate: data.nextActionDate,
      createdAt: now,
    }
    this.activities.unshift(act)
    this.saveToLocalStorage()
    return act
  }

  // ==========================================
  // 8. Customer Service Requests
  // ==========================================
  public getServiceRequests(customerId?: string): CustomerServiceRequest[] {
    if (customerId) {
      return this.serviceRequests
        .filter((r) => r.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return [...this.serviceRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  public getServiceRequestById(id: string): CustomerServiceRequest | undefined {
    return this.serviceRequests.find((r) => r.id === id || r.requestNumber === id)
  }

  public saveServiceRequest(data: Partial<CustomerServiceRequest>): CustomerServiceRequest {
    const now = new Date().toISOString()
    const isNew = !data.id

    let req: CustomerServiceRequest
    if (isNew) {
      const count = this.serviceRequests.length + 1
      const pad = count.toString().padStart(5, '0')
      const requestNumber = data.requestNumber || `SR-2026-${pad}`

      req = {
        id: `sr-${Date.now()}`,
        requestNumber,
        customerId: data.customerId || '',
        customerName: data.customerName || 'Customer',
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        shipmentId: data.shipmentId,
        bolNumber: data.bolNumber,
        containerNumber: data.containerNumber,
        category: data.category || 'TRACKING',
        subject: data.subject || 'Customer Service Request',
        description: data.description || '',
        priority: data.priority || 'NORMAL',
        status: data.status || 'OPEN',
        assignedTo: data.assignedTo || 'Operations Support',
        createdAt: now,
        dueDate: data.dueDate,
        resolvedAt: data.resolvedAt,
        resolution: data.resolution,
        customerVisible: data.customerVisible !== undefined ? data.customerVisible : true,
        linkedIncidentId: data.linkedIncidentId,
        linkedClaimId: data.linkedClaimId,
        responses: data.responses || [],
      }
      this.serviceRequests.unshift(req)
    } else {
      const idx = this.serviceRequests.findIndex((r) => r.id === data.id)
      if (idx === -1) throw new Error(`Service request ${data.id} not found`)
      req = { ...this.serviceRequests[idx], ...data }
      this.serviceRequests[idx] = req
    }

    this.saveToLocalStorage()
    return req
  }

  /**
   * Link customer service complaint into Incident / Claim (Phase 24 integration)
   */
  public escalateServiceRequestToClaim(
    requestId: string,
    incidentId: string,
    claimId?: string
  ): CustomerServiceRequest {
    const req = this.serviceRequests.find((r) => r.id === requestId)
    if (!req) throw new Error(`Service request ${requestId} not found`)

    req.category = 'CLAIM'
    req.status = 'IN_PROGRESS'
    req.linkedIncidentId = incidentId
    if (claimId) req.linkedClaimId = claimId

    req.responses.push({
      id: `resp-${Date.now()}`,
      user: 'Customer Support Escalation',
      date: new Date().toISOString(),
      channel: 'OTHER',
      response: `Escalated to formal Claims & Incident Center under ref ${incidentId}.`,
      customerVisible: true,
    })

    this.saveToLocalStorage()
    return req
  }

  // ==========================================
  // Customer 360 & Profiles
  // ==========================================
  public getCustomerExtension(customerId: string): CustomerProfileCrmExtension {
    if (!this.customerExtensions[customerId]) {
      this.customerExtensions[customerId] = {
        customerId,
        preferredTradeLanes: ['Karachi to Kabul', 'Bandar Abbas to Herat', 'Nhava Sheva to Kabul'],
        preferredServices: ['FULL_WAY', 'ROAD', 'REEFER'],
        preferredEquipment: ['40HC', '40RF'],
        commonCommodities: ['Dry Cargo', 'Perishables', 'Construction Materials'],
        tags: ['Key Account', 'Regular Shipper'],
        segment: 'ACTIVE',
        status: 'ACTIVE',
        accountManager: 'Commercial Sales Lead',
        creditLimit: 15000,
        paymentTerms: '50% upon departure, balance against BOL release',
        notes: 'Commercial profile managed in Sky Ariana CRM.',
      }
    }
    return this.customerExtensions[customerId]
  }

  public saveCustomerExtension(ext: CustomerProfileCrmExtension): void {
    this.customerExtensions[ext.customerId] = ext
    this.saveToLocalStorage()
  }

  public getOpportunitiesByCustomer(customerId: string): OpportunityRecord[] {
    return this.opportunities.filter((o) => o.customerId === customerId)
  }

  public getInquiriesByCustomer(customerId: string): SalesInquiryRecord[] {
    return this.inquiries.filter((i) => i.customerId === customerId)
  }

  public getActivitiesByCustomer(customerId: string): CrmActivityRecord[] {
    return this.getActivities(customerId)
  }

  public getFollowUpsByCustomer(customerId: string): CrmFollowUpTask[] {
    return this.followUps.filter((t) => t.customerId === customerId)
  }

  public getServiceRequestsByCustomer(customerId: string): CustomerServiceRequest[] {
    return this.serviceRequests.filter((s) => s.customerId === customerId)
  }

  public addActivity(data: Omit<CrmActivityRecord, 'id' | 'createdAt'>): CrmActivityRecord {
    const act: CrmActivityRecord = {
      ...data,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    this.activities.unshift(act)
    this.saveToLocalStorage()
    return act
  }

  public addServiceRequestResponse(
    requestId: string,
    resp: Omit<ServiceRequestResponse, 'id' | 'date'>
  ): void {
    const sr = this.serviceRequests.find((r) => r.id === requestId)
    if (!sr) return
    if (!sr.responses) sr.responses = []
    sr.responses.push({
      ...resp,
      id: `resp-${Date.now()}`,
      date: new Date().toISOString(),
    })
    this.saveToLocalStorage()
  }

  // ==========================================
  // 9. WhatsApp Sales Generator
  // Approved sell rates only; scrubs buy rates & margins
  // ==========================================
  public generateWhatsAppQuoteFollowUp(opportunityId: string): string {
    const opp = this.opportunities.find((o) => o.id === opportunityId)
    if (!opp) return 'Error: Opportunity not found'

    const quoteId = opp.acceptedQuotationId || (opp.linkedQuotationIds.length > 0 ? opp.linkedQuotationIds[0] : null)

    return `*SKY ARIANA LOGISTICS — QUOTATION FOLLOW-UP*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear *${opp.customerName}*,

Following up on our freight quotation proposal for your shipment:
*Route:* ${opp.tradeLane}
*Service:* ${opp.service}
*Equipment:* ${opp.equipment}
*Quoted Freight Rate:* ${opp.currency} ${opp.expectedRevenue.toLocaleString()}
${quoteId ? `*Quotation Reference:* ${quoteId}` : ''}

Please let us know if you have any questions or if you would like us to reserve equipment and position containers.

━━━━━━━━━━━━━━━━━━━━━━━━━━
_Sky Ariana Limited Commercial Desk | sales@skyariana.com | +93 79 000 1144_`
  }

  // ==========================================
  // 10. Dashboard & Summary KPIs
  // Segregated multi-currency pipeline totals
  // ==========================================
  public getDashboardKpis(): CrmDashboardKpi {
    const newLeads = this.leads.filter((l) => l.status === 'NEW' || l.status === 'CONTACTED').length
    const openInquiries = this.inquiries.filter((i) => i.status !== 'CLOSED' && i.status !== 'CANCELLED').length
    const activeOpportunities = this.opportunities.filter((o) => o.status === 'ACTIVE').length

    const quotesPending = this.opportunities.filter((o) => o.stage === 'RATE_REQUESTED' || o.stage === 'QUOTATION_PREPARED').length
    const quotesSent = this.opportunities.filter((o) => o.stage === 'QUOTATION_SENT' || o.stage === 'FOLLOW_UP').length

    const followUpsToday = this.getFollowUpsToday().length
    const followUpsOverdue = this.getFollowUpsOverdue().length

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const wonThisMonth = this.opportunities.filter((o) => {
      if (o.status !== 'WON') return false
      const d = new Date(o.updatedAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length

    const lostThisMonth = this.opportunities.filter((o) => {
      if (o.status !== 'LOST') return false
      const d = new Date(o.updatedAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length

    // Distinct customer count from active opportunities & inquiries
    const customerIds = new Set<string>()
    this.opportunities.forEach((o) => customerIds.add(o.customerName))
    this.inquiries.forEach((i) => customerIds.add(i.customerName))
    const activeCustomers = customerIds.size

    const customerServiceOpen = this.serviceRequests.filter((r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED').length

    // Multi-currency pipelines (Segregated, NEVER mixed!)
    const pipelineUsd = this.opportunities
      .filter((o) => o.currency === 'USD' && o.status === 'ACTIVE')
      .reduce((sum, o) => sum + o.expectedRevenue, 0)

    const pipelineAed = this.opportunities
      .filter((o) => o.currency === 'AED' && o.status === 'ACTIVE')
      .reduce((sum, o) => sum + o.expectedRevenue, 0)

    const pipelineEur = this.opportunities
      .filter((o) => o.currency === 'EUR' && o.status === 'ACTIVE')
      .reduce((sum, o) => sum + o.expectedRevenue, 0)

    return {
      newLeads,
      openInquiries,
      activeOpportunities,
      quotesPending,
      quotesSent,
      followUpsToday,
      followUpsOverdue,
      wonThisMonth,
      lostThisMonth,
      activeCustomers,
      customerServiceOpen,
      pipelineUsd,
      pipelineAed,
      pipelineEur,
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
        leads: this.leads,
        inquiries: this.inquiries,
        opportunities: this.opportunities,
        followUps: this.followUps,
        activities: this.activities,
        serviceRequests: this.serviceRequests,
      },
      null,
      2
    )
  }

  public importStateJson(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString)
      if (Array.isArray(data.leads)) this.leads = data.leads
      if (Array.isArray(data.inquiries)) this.inquiries = data.inquiries
      if (Array.isArray(data.opportunities)) this.opportunities = data.opportunities
      if (Array.isArray(data.followUps)) this.followUps = data.followUps
      if (Array.isArray(data.activities)) this.activities = data.activities
      if (Array.isArray(data.serviceRequests)) this.serviceRequests = data.serviceRequests

      this.saveToLocalStorage()
      return { success: true, message: `Successfully restored ${this.leads.length} leads and ${this.opportunities.length} opportunities.` }
    } catch (e: any) {
      return { success: false, message: `Failed to import CRM state: ${e.message}` }
    }
  }
}

export const crmSalesStore = CrmSalesStore.getInstance()
export const crmSalesService = crmSalesStore
