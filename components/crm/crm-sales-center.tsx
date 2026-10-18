'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  TrendingUp,
  Sparkles,
  HelpCircle,
  Clock,
  FileText,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Kanban,
  Table as TableIcon,
  Send,
  Calendar,
  ShieldCheck,
  Briefcase,
  X,
  Printer,
} from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { MasterEntity } from '@/lib/types/master-data'
import {
  LeadRecord,
  SalesInquiryRecord,
  OpportunityRecord,
  OpportunityStage,
  CrmFollowUpTask,
  CustomerServiceRequest,
  CrmDashboardKpi,
} from '@/lib/types/crm-sales'
import { crmSalesService } from '@/lib/services/crm-sales-service'
import { freightPricingService } from '@/lib/services/freight-pricing-service'

// Import Modals & PDF components
import { LeadModal } from './lead-modal'
import { LeadConvertDialog } from './lead-convert-dialog'
import { InquiryModal } from './inquiry-modal'
import { OpportunityModal } from './opportunity-modal'
import { OpportunityDetailModal } from './opportunity-detail-modal'
import { Customer360Modal } from './customer-360-modal'
import { ServiceRequestModal } from './service-request-modal'
import { SalesPipelinePdf } from './documents/sales-pipeline-pdf'
import { CustomerAccountSummaryPdf } from './documents/customer-account-summary-pdf'

const STAGES: { id: OpportunityStage; label: string; color: string }[] = [
  { id: 'NEW_INQUIRY', label: 'New Inquiry', color: 'border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-300' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'border-blue-500 text-blue-700 dark:text-blue-300' },
  { id: 'RATE_REQUESTED', label: 'Rate Requested', color: 'border-cyan-500 text-cyan-700 dark:text-cyan-300' },
  { id: 'QUOTATION_PREPARED', label: 'Quote Ready', color: 'border-indigo-500 text-indigo-700 dark:text-indigo-300' },
  { id: 'QUOTATION_SENT', label: 'Quote Sent', color: 'border-purple-500 text-purple-700 dark:text-purple-300' },
  { id: 'FOLLOW_UP', label: 'Follow Up', color: 'border-amber-500 text-amber-700 dark:text-amber-300' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'border-orange-500 text-orange-700 dark:text-orange-300' },
  { id: 'CUSTOMER_CONFIRMATION', label: 'Confirmation', color: 'border-teal-500 text-teal-700 dark:text-teal-300' },
  { id: 'WON', label: 'Won Deal', color: 'border-emerald-500 text-emerald-700 dark:text-emerald-300' },
  { id: 'LOST', label: 'Lost / Closed', color: 'border-rose-500 text-rose-700 dark:text-rose-300' },
]

export function CrmSalesCenter() {
  const { masterEntities, currentUser, setView } = useApp()

  // Active Tab
  const [activeTab, setActiveTab] = useState<'pipeline' | 'leads' | 'customers' | 'tasks' | 'service' | 'reports'>('pipeline')
  const [pipelineViewMode, setPipelineViewMode] = useState<'kanban' | 'table'>('kanban')
  const [leadsSubTab, setLeadsSubTab] = useState<'leads' | 'inquiries'>('leads')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL')
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL')
  const [tasksFilter, setTasksFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'COMPLETED'>('ALL')

  // Data states from singleton service
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [inquiries, setInquiries] = useState<SalesInquiryRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [tasks, setTasks] = useState<CrmFollowUpTask[]>([])
  const [serviceRequests, setServiceRequests] = useState<CustomerServiceRequest[]>([])
  const [kpis, setKpis] = useState<CrmDashboardKpi | null>(null)

  // Modals state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const [convertingLead, setConvertingLead] = useState<LeadRecord | null>(null)

  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<SalesInquiryRecord | null>(null)

  const [isOppModalOpen, setIsOppModalOpen] = useState(false)
  const [selectedOppForEdit, setSelectedOppForEdit] = useState<OpportunityRecord | null>(null)

  const [isOppDetailOpen, setIsOppDetailOpen] = useState(false)
  const [activeOppDetail, setActiveOppDetail] = useState<OpportunityRecord | null>(null)

  const [isCust360Open, setIsCust360Open] = useState(false)
  const [selectedCustomerFor360, setSelectedCustomerFor360] = useState<MasterEntity | null>(null)

  const [isSrModalOpen, setIsSrModalOpen] = useState(false)
  const [selectedSr, setSelectedSr] = useState<CustomerServiceRequest | null>(null)

  const [isPipelinePdfOpen, setIsPipelinePdfOpen] = useState(false)
  const [isCustSummaryPdfOpen, setIsCustSummaryPdfOpen] = useState(false)

  // Load all initial state
  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = () => {
    setLeads(crmSalesService.getLeads())
    setInquiries(crmSalesService.getInquiries())
    setOpportunities(crmSalesService.getOpportunities())
    setTasks(crmSalesService.getFollowUps())
    setServiceRequests(crmSalesService.getServiceRequests())
    setKpis(crmSalesService.getDashboardKpis())
  }

  // Pre-filtered Customer Masters (Entities having CUSTOMER, PROSPECT, SHIPPER, CONSIGNEE, or LEAD roles)
  const customerEntities = useMemo(() => {
    return masterEntities.filter(
      (e) =>
        !e.isArchived &&
        (e.type.includes('CUSTOMER') ||
          e.type.includes('PROSPECT') ||
          e.type.includes('LEAD') ||
          e.type.includes('SHIPPER') ||
          e.type.includes('CONSIGNEE'))
    )
  }, [masterEntities])

  // Unique owners and trade lanes for filters
  const owners = useMemo(() => {
    const set = new Set<string>()
    opportunities.forEach((o) => set.add(o.owner))
    leads.forEach((l) => set.add(l.owner))
    return Array.from(set).filter(Boolean)
  }, [opportunities, leads])

  const corridors = useMemo(() => {
    const set = new Set<string>()
    opportunities.forEach((o) => set.add(o.tradeLane))
    return Array.from(set).filter(Boolean)
  }, [opportunities])

  // Filtered Opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (selectedOwner !== 'ALL' && opp.owner !== selectedOwner) return false
      if (selectedCorridor !== 'ALL' && opp.tradeLane !== selectedCorridor) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = opp.title.toLowerCase().includes(q)
        const matchCust = opp.customerName.toLowerCase().includes(q)
        const matchNum = opp.opportunityNumber.toLowerCase().includes(q)
        const matchLane = opp.tradeLane.toLowerCase().includes(q)
        if (!matchTitle && !matchCust && !matchNum && !matchLane) return false
      }
      return true
    })
  }, [opportunities, selectedOwner, selectedCorridor, searchQuery])

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = l.companyName.toLowerCase().includes(q)
        const matchPerson = l.contactPerson.toLowerCase().includes(q)
        const matchNum = l.leadNumber.toLowerCase().includes(q)
        const matchCity = l.city.toLowerCase().includes(q)
        if (!matchName && !matchPerson && !matchNum && !matchCity) return false
      }
      return true
    })
  }, [leads, searchQuery])

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCust = inq.customerName.toLowerCase().includes(q)
        const matchNum = inq.inquiryNumber.toLowerCase().includes(q)
        const matchRoute = `${inq.origin} ${inq.destination}`.toLowerCase().includes(q)
        const matchCommodity = inq.commodity.toLowerCase().includes(q)
        if (!matchCust && !matchNum && !matchRoute && !matchCommodity) return false
      }
      return true
    })
  }, [inquiries, searchQuery])

  // Filtered Customer Directory
  const filteredCustomers = useMemo(() => {
    return customerEntities.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = c.name.toLowerCase().includes(q)
        const matchPerson = (c.contactPerson || '').toLowerCase().includes(q)
        const matchPhone = (c.phone || '').toLowerCase().includes(q)
        const matchCity = (c.city || '').toLowerCase().includes(q)
        if (!matchName && !matchPerson && !matchPhone && !matchCity) return false
      }
      return true
    })
  }, [customerEntities, searchQuery])

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return tasks.filter((t) => {
      if (tasksFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false
      if (tasksFilter === 'TODAY' && (t.status === 'COMPLETED' || t.dueDate !== todayStr)) return false
      if (tasksFilter === 'OVERDUE' && (t.status === 'COMPLETED' || t.dueDate >= todayStr)) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!t.customerName.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tasks, tasksFilter, searchQuery])

  // Filtered Service Requests
  const filteredServiceRequests = useMemo(() => {
    return serviceRequests.filter((sr) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSubject = sr.subject.toLowerCase().includes(q)
        const matchCust = sr.customerName.toLowerCase().includes(q)
        const matchNum = sr.requestNumber.toLowerCase().includes(q)
        const matchBol = (sr.bolNumber || '').toLowerCase().includes(q)
        if (!matchSubject && !matchCust && !matchNum && !matchBol) return false
      }
      return true
    })
  }, [serviceRequests, searchQuery])

  // Convert Lead Trigger
  const handleOpenConvert = (lead: LeadRecord) => {
    setConvertingLead(lead)
    setIsConvertModalOpen(true)
  }

  // Quick Open Opportunity Detail Drawer
  const handleOpenOppDetail = (opp: OpportunityRecord) => {
    setActiveOppDetail(opp)
    setIsOppDetailOpen(true)
  }

  // Open Customer 360
  const handleOpenCustomer360 = (customer: MasterEntity) => {
    setSelectedCustomerFor360(customer)
    setIsCust360Open(true)
  }

  // Handle Generate Rate Quote from Inquiry
  const handleGenerateQuoteFromInquiry = (inquiry: SalesInquiryRecord) => {
    // 1. Create or prefill quote in freight pricing service
    const matchedCustomer = customerEntities.find((c) => c.id === inquiry.customerId)
    try {
      const newQuote = freightPricingService.createQuotation({
        customerId: inquiry.customerId,
        customerName: inquiry.customerName,
        customerContact: inquiry.contactPerson || matchedCustomer?.contactPerson,
        customerPhone: inquiry.contactPhone || matchedCustomer?.phone,
        customerEmail: inquiry.contactEmail || matchedCustomer?.email,
        date: new Date().toISOString().split('T')[0],
        originName: inquiry.origin,
        destinationName: inquiry.destination,
        routeId: inquiry.routeId,
        routeName: inquiry.routeName,
        serviceType: inquiry.requestedService === 'FULL_WAY' ? 'FULL_WAY' : 'HALF_WAY',
        containerType: (inquiry.containerType as any) || '40HC',
        containerQuantity: inquiry.containerQuantity || 1,
        commodity: inquiry.commodity,
        pricingLines: [
          {
            id: `line-${Date.now()}`,
            chargeCode: 'FREIGHT_MAIN',
            chargeName: `Freight Carriage (${inquiry.origin} to ${inquiry.destination})`,
            category: 'FREIGHT',
            buyAmount: 2200,
            sellAmount: 2850,
            currency: 'USD',
            quantity: inquiry.containerQuantity || 1,
            unit: 'PER_CONTAINER',
          },
        ],
        currency: 'USD',
        validUntil: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'DRAFT',
        terms: ['Subject to standard multimodal terms and container equipment availability.'],
        includedServices: ['Standard transport carriage', 'Transit documentation'],
        excludedServices: ['Demurrage beyond free time'],
        internalNotes: `Generated from Sales Inquiry #${inquiry.inquiryNumber}`,
        createdBy: inquiry.owner || currentUser?.name || 'Sales Rep',
      })

      // 2. Link quote to inquiry
      crmSalesService.saveInquiry({
        ...inquiry,
        status: 'QUOTED',
        quotationId: newQuote.quotationNumber,
      })

      // 3. Create or advance Opportunity
      const newOpp = crmSalesService.saveOpportunity({
        customerId: inquiry.customerId || 'cust-generic',
        customerName: inquiry.customerName,
        inquiryId: inquiry.id,
        title: `${inquiry.customerName} - ${inquiry.commodity}`,
        tradeLane: `${inquiry.origin} to ${inquiry.destination}`,
        service: inquiry.requestedService,
        commodity: inquiry.commodity,
        equipment: `${inquiry.containerQuantity}x ${inquiry.containerType}`,
        expectedVolume: `${inquiry.containerQuantity} Cont`,
        expectedRevenue: newQuote.totalSellPrice,
        currency: newQuote.currency,
        probability: 60,
        expectedCloseDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        owner: inquiry.owner || currentUser?.name || 'Sales Rep',
        stage: 'QUOTATION_PREPARED',
        status: 'ACTIVE',
        nextAction: 'Send Quotation to Client via WhatsApp/Email',
        nextActionDate: new Date().toISOString().split('T')[0],
        linkedQuotationIds: [newQuote.id],
      })

      refreshData()
      alert(`Quotation ${newQuote.quotationNumber} generated successfully and linked to Opportunity ${newOpp.opportunityNumber}!`)
    } catch (e) {
      console.error('Failed to generate quote from inquiry', e)
      alert('Error creating quotation.')
    }
  }

  // Multi-PC Concurrency Safe Stage Move
  const handleQuickAdvanceStage = (opp: OpportunityRecord, newStage: OpportunityStage) => {
    try {
      crmSalesService.saveOpportunity({
        ...opp,
        stage: newStage,
        status: newStage === 'WON' ? 'WON' : newStage === 'LOST' ? 'LOST' : 'ACTIVE',
        probability: newStage === 'WON' ? 100 : newStage === 'LOST' ? 0 : opp.probability,
      })
      refreshData()
    } catch (err: any) {
      alert(`Concurrency conflict: ${err.message || 'Please refresh data'}`)
      refreshData()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 p-5 px-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                  CRM, SALES & CUSTOMER SERVICE
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Leads • Opportunities • Quotations • Follow-Up • Customers
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedLead(null)
                setIsLeadModalOpen(true)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Quick Lead
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedInquiry(null)
                setIsInquiryModalOpen(true)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              New Inquiry
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedOppForEdit(null)
                setIsOppModalOpen(true)
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Opportunity
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSr(null)
                setIsSrModalOpen(true)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-600/30 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Log Ticket
            </button>

            <button
              type="button"
              onClick={() => setIsPipelinePdfOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Print Sales Pipeline Management PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Pipeline PDF
            </button>
          </div>
        </div>

        {/* Operational KPI Ribbon (11 Explicit Dashboard Cards) */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-11 gap-2.5 mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800">
            {/* Card 1: NEW LEADS */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="New Leads Intake">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">New Leads</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{kpis.newLeads}</div>
              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5">Commercial Intake</div>
            </div>

            {/* Card 2: OPEN INQUIRIES */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Open Inquiries">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Inquiries</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{kpis.openInquiries}</div>
              <div className="text-[9px] text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">Rates Pending</div>
            </div>

            {/* Card 3: ACTIVE OPPORTUNITIES */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Active Opportunities">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Active Opps</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{kpis.activeOpportunities}</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Pipeline Deals</div>
            </div>

            {/* Card 4: QUOTES PENDING */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Quotes Pending Preparation">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Quotes Pending</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{kpis.quotesPending}</div>
              <div className="text-[9px] text-cyan-600 dark:text-cyan-400 font-medium truncate mt-0.5">Draft / Pricing</div>
            </div>

            {/* Card 5: QUOTES SENT */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Quotes Sent to Client">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Quotes Sent</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{kpis.quotesSent}</div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400 font-medium truncate mt-0.5">Client Review</div>
            </div>

            {/* Card 6: FOLLOW-UPS TODAY */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Follow-Ups Due Today">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Due Today</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{kpis.followUpsToday}</div>
              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">Scheduled</div>
            </div>

            {/* Card 7: FOLLOW-UPS OVERDUE */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Follow-Ups Overdue">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Overdue Tasks</div>
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{kpis.followUpsOverdue}</div>
              <div className="text-[9px] text-rose-600 dark:text-rose-400 font-medium truncate mt-0.5">Needs Action</div>
            </div>

            {/* Card 8: WON THIS MONTH */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Won Deals This Month">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Won (Month)</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{kpis.wonThisMonth}</div>
              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">Won Deals</div>
            </div>

            {/* Card 9: LOST THIS MONTH */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Lost Deals This Month">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Lost (Month)</div>
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{kpis.lostThisMonth}</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Closed Out</div>
            </div>

            {/* Card 10: ACTIVE CUSTOMERS */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Active Commercial Customers">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Active Clients</div>
              <div className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-1">{kpis.activeCustomers}</div>
              <div className="text-[9px] text-sky-600 dark:text-sky-400 font-medium truncate mt-0.5">Company Master</div>
            </div>

            {/* Card 11: CUSTOMER SERVICE OPEN */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-colors" title="Open Customer Service Tickets">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Open Tickets</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-300 mt-1">{kpis.customerServiceOpen}</div>
              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5">Support Desk</div>
            </div>
          </div>
        )}

        {/* Segregated Multi-Currency Pipeline Value Strip */}
        {kpis && (
          <div className="mt-3.5 py-2.5 px-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2 shadow-2xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Segregated Active Pipeline Value (Freight Service Revenue Only):
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                USD ${kpis.pipelineUsd.toLocaleString()}
              </span>
              <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-900/50">
                AED {kpis.pipelineAed.toLocaleString()}
              </span>
              <span className="font-mono text-purple-700 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900/50">
                EUR €{kpis.pipelineEur.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Filter & Navigation Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between flex-wrap gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'pipeline', label: 'Sales Pipeline', icon: TrendingUp },
            { id: 'leads', label: `Leads & Inquiries (${leads.length + inquiries.length})`, icon: Sparkles },
            { id: 'customers', label: `Customer 360 (${customerEntities.length})`, icon: Building2 },
            { id: 'tasks', label: `Follow-Ups (${tasks.length})`, icon: Clock },
            { id: 'service', label: `Service Desk (${serviceRequests.length})`, icon: HelpCircle },
            { id: 'reports', label: 'Commercial Analytics', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Universal Search & Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search deals, clients, lanes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {activeTab === 'pipeline' && (
            <>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Owners</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>

              <select
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
              >
                <option value="ALL">All Corridors</option>
                {corridors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Kanban vs Table View Toggle */}
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('kanban')}
                  className={`p-1 rounded text-xs ${
                    pipelineViewMode === 'kanban' ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 font-bold shadow-2xs' : 'text-slate-500 dark:text-slate-400'
                  }`}
                  title="Kanban Board View"
                >
                  <Kanban className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('table')}
                  className={`p-1 rounded text-xs ${
                    pipelineViewMode === 'table' ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 font-bold shadow-2xs' : 'text-slate-500 dark:text-slate-400'
                  }`}
                  title="Table Grid View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* ========================================================================= */}
        {/* TAB 1: SALES PIPELINE (KANBAN & TABLE) */}
        {/* ========================================================================= */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            
            {pipelineViewMode === 'kanban' ? (
              /* Kanban Board View */
              <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[70vh]">
                {STAGES.map((stg) => {
                  const stageOpps = filteredOpportunities.filter((o) => o.stage === stg.id)
                  const stageUsd = stageOpps
                    .filter((o) => o.currency === 'USD')
                    .reduce((acc, curr) => acc + curr.expectedRevenue, 0)

                  return (
                    <div
                      key={stg.id}
                      className="w-72 shrink-0 flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 max-h-[78vh] shadow-2xs"
                    >
                      {/* Column Header */}
                      <div className={`p-3 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 rounded-t-2xl ${stg.color} flex items-center justify-between`}>
                        <div>
                          <div className="font-bold text-xs uppercase tracking-wider">{stg.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            ${stageUsd.toLocaleString()} USD ({stageOpps.length})
                          </div>
                        </div>
                        <span className="w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                          {stageOpps.length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                        {stageOpps.length === 0 ? (
                          <div className="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-900/40">
                            Empty stage
                          </div>
                        ) : (
                          stageOpps.map((opp) => (
                            <div
                              key={opp.id}
                              onClick={() => handleOpenOppDetail(opp)}
                              className="p-3 rounded-xl bg-white hover:bg-slate-50/90 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200/90 hover:border-amber-400 dark:border-slate-700/60 dark:hover:border-amber-500/50 cursor-pointer transition-all space-y-2 group shadow-2xs hover:shadow-xs"
                            >
                              {/* Title and Opportunity Number Badge with Anti-Collision Layout */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 flex-1 min-w-0 pr-1">
                                  {opp.title}
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0 border border-slate-200 dark:border-slate-700">
                                  {opp.opportunityNumber}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="font-medium truncate">{opp.customerName}</span>
                              </div>

                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                Corridor: {opp.tradeLane}
                              </div>

                              {/* Value & Win Probability */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                  {opp.currency} {opp.expectedRevenue.toLocaleString()}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {opp.probability}% win est.
                                </span>
                              </div>

                              {/* Quick Advance Stage buttons */}
                              <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400" onClick={(e) => e.stopPropagation()}>
                                <span className="truncate">{opp.owner}</span>
                                <div className="flex items-center gap-1">
                                  {stg.id !== 'WON' && stg.id !== 'LOST' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const idx = STAGES.findIndex((s) => s.id === stg.id)
                                        if (idx < STAGES.length - 2) {
                                          handleQuickAdvanceStage(opp, STAGES[idx + 1].id)
                                        }
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 text-[10px] flex items-center gap-0.5 font-medium transition-colors"
                                      title="Advance to Next Stage"
                                    >
                                      Next <ArrowRight className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Opp # & Title</th>
                      <th className="py-3 px-3 font-semibold">Customer</th>
                      <th className="py-3 px-3 font-semibold">Corridor</th>
                      <th className="py-3 px-3 font-semibold">Equipment / Vol</th>
                      <th className="py-3 px-3 font-semibold">Freight Revenue</th>
                      <th className="py-3 px-3 font-semibold">Stage</th>
                      <th className="py-3 px-3 font-semibold">Win Prob</th>
                      <th className="py-3 px-3 font-semibold">Owner</th>
                      <th className="py-3 px-3 font-semibold">Expected Close</th>
                      <th className="py-3 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredOpportunities.map((opp) => (
                      <tr
                        key={opp.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        onClick={() => handleOpenOppDetail(opp)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{opp.title}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{opp.opportunityNumber}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-200">{opp.customerName}</td>
                        <td className="py-3 px-3">{opp.tradeLane}</td>
                        <td className="py-3 px-3">{opp.equipment}</td>
                        <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {opp.currency} {opp.expectedRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                            {opp.stage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">{opp.probability}%</td>
                        <td className="py-3 px-3">{opp.owner}</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{opp.expectedCloseDate}</td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenOppDetail(opp)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LEADS & INQUIRIES */}
        {/* ========================================================================= */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Sub-tabs header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLeadsSubTab('leads')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    leadsSubTab === 'leads'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Commercial Leads ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeadsSubTab('inquiries')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    leadsSubTab === 'inquiries'
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Sales Inquiries ({inquiries.length})
                </button>
              </div>

              {leadsSubTab === 'leads' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLead(null)
                    setIsLeadModalOpen(true)
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register Lead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInquiry(null)
                    setIsInquiryModalOpen(true)
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Inquiry
                </button>
              )}
            </div>

            {leadsSubTab === 'leads' ? (
              /* Leads Table */
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Lead # & Company</th>
                      <th className="py-3 px-3 font-semibold">Contact Person</th>
                      <th className="py-3 px-3 font-semibold">Phone / WhatsApp</th>
                      <th className="py-3 px-3 font-semibold">Location</th>
                      <th className="py-3 px-3 font-semibold">Interested Service</th>
                      <th className="py-3 px-3 font-semibold">Source</th>
                      <th className="py-3 px-3 font-semibold">Owner</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{lead.companyName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{lead.leadNumber}</div>
                        </td>
                        <td className="py-3 px-3">{lead.contactPerson}</td>
                        <td className="py-3 px-3 font-mono">{lead.phone}</td>
                        <td className="py-3 px-3">{[lead.city, lead.country].filter(Boolean).join(', ')}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {lead.interestedService}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{lead.source}</td>
                        <td className="py-3 px-3">{lead.owner}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              lead.status === 'CONVERTED'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : lead.status === 'QUALIFIED'
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.status !== 'CONVERTED' && (
                              <button
                                type="button"
                                onClick={() => handleOpenConvert(lead)}
                                className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-semibold transition-colors"
                              >
                                Convert
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLead(lead)
                                setIsLeadModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Inquiries Table */
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Inquiry # & Customer</th>
                      <th className="py-3 px-3 font-semibold">Corridor (Origin → Dest)</th>
                      <th className="py-3 px-3 font-semibold">Equipment / Qty</th>
                      <th className="py-3 px-3 font-semibold">Commodity</th>
                      <th className="py-3 px-3 font-semibold">Service Mode</th>
                      <th className="py-3 px-3 font-semibold">Quotation Link</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{inq.customerName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{inq.inquiryNumber}</div>
                        </td>
                        <td className="py-3 px-3 font-medium">
                          {inq.origin} → {inq.destination}
                        </td>
                        <td className="py-3 px-3">
                          {inq.containerQuantity}x {inq.containerType}
                        </td>
                        <td className="py-3 px-3">{inq.commodity}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {inq.serviceMode}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400 font-medium">
                          {inq.quotationId || 'Pending'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              inq.status === 'QUOTED'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                            }`}
                          >
                            {inq.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inq.status !== 'QUOTED' && (
                              <button
                                type="button"
                                onClick={() => handleGenerateQuoteFromInquiry(inq)}
                                className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[11px] font-semibold transition-colors"
                              >
                                Generate Quote
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInquiry(inq)
                                setIsInquiryModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CUSTOMER 360 DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Customer 360 Directory</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Master Entity accounts with full commercial history, linked shipments, quotes, activities, and permissions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Customer Name & ID</th>
                    <th className="py-3 px-3 font-semibold">Master Types</th>
                    <th className="py-3 px-3 font-semibold">Contact Person</th>
                    <th className="py-3 px-3 font-semibold">Phone / Email</th>
                    <th className="py-3 px-3 font-semibold">Location</th>
                    <th className="py-3 px-3 font-semibold">Account Manager</th>
                    <th className="py-3 px-3 font-semibold">Segment</th>
                    <th className="py-3 px-3 font-semibold text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredCustomers.map((cust) => {
                    const ext = crmSalesService.getCustomerExtension(cust.id)
                    return (
                      <tr
                        key={cust.id}
                        onClick={() => handleOpenCustomer360(cust)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-500" />
                            {cust.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{cust.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {cust.type.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">{cust.contactPerson || 'N/A'}</td>
                        <td className="py-3 px-3">
                          <div className="text-slate-800 dark:text-slate-200">{cust.phone || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{cust.email}</div>
                        </td>
                        <td className="py-3 px-3">{[cust.city, cust.country].filter(Boolean).join(', ') || 'N/A'}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{ext?.accountManager || 'Unassigned'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {ext?.segment || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenCustomer360(cust)}
                            className="px-3 py-1 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Open 360
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FOLLOW-UPS & TASKS */}
        {/* ========================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {[
                  { id: 'ALL', label: 'All Tasks' },
                  { id: 'TODAY', label: 'Due Today' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'COMPLETED', label: 'Completed' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTasksFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tasksFilter === f.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-3 font-semibold">Follow-Up Type</th>
                    <th className="py-3 px-3 font-semibold">Priority</th>
                    <th className="py-3 px-3 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold">Task Action / Notes</th>
                    <th className="py-3 px-3 font-semibold">Assigned Rep</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Complete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{t.customerName}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-slate-700 font-semibold">
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            t.priority === 'URGENT'
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{t.dueDate}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{t.notes}</td>
                      <td className="py-3 px-3">{t.assignedUser}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {t.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              crmSalesService.completeFollowUp(t.id)
                              refreshData()
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Mark Done
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CUSTOMER SERVICE DESK */}
        {/* ========================================================================= */}
        {activeTab === 'service' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Customer Service Desk</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track customer inquiries, document requests, tracking questions, and escalated claims.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSr(null)
                  setIsSrModalOpen(true)
                }}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Ticket
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Ticket # & Subject</th>
                    <th className="py-3 px-3 font-semibold">Customer</th>
                    <th className="py-3 px-3 font-semibold">Category</th>
                    <th className="py-3 px-3 font-semibold">BOL / Container</th>
                    <th className="py-3 px-3 font-semibold">Priority</th>
                    <th className="py-3 px-3 font-semibold">Assigned Agent</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredServiceRequests.map((sr) => (
                    <tr
                      key={sr.id}
                      onClick={() => {
                        setSelectedSr(sr)
                        setIsSrModalOpen(true)
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{sr.subject}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{sr.requestNumber}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-200">{sr.customerName}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {sr.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {sr.bolNumber || sr.containerNumber || 'None'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            sr.priority === 'URGENT'
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : sr.priority === 'HIGH'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {sr.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">{sr.assignedTo}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sr.status === 'RESOLVED' || sr.status === 'CLOSED'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                          }`}
                        >
                          {sr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSr(sr)
                            setIsSrModalOpen(true)
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors"
                        >
                          View / Reply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: COMMERCIAL REPORTS & PERFORMANCE */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Commercial Performance Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Win / Loss distribution, corridor conversion rates, and sales leaderboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPipelinePdfOpen(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Generate Executive Report PDF
              </button>
            </div>

            {/* Performance Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-2xs">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Commercial Win Rate</div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {opportunities.length > 0
                    ? `${Math.round(
                        (opportunities.filter((o) => o.status === 'WON').length /
                          Math.max(1, opportunities.filter((o) => o.status === 'WON' || o.status === 'LOST').length)) *
                          100
                      )}%`
                    : '0%'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Calculated against closed commercial files (excluding active pipeline)
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-2xs">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Average Won Deal Value</div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  $
                  {Math.round(
                    opportunities.filter((o) => o.status === 'WON' && o.currency === 'USD').length > 0
                      ? opportunities
                          .filter((o) => o.status === 'WON' && o.currency === 'USD')
                          .reduce((acc, curr) => acc + curr.expectedRevenue, 0) /
                          opportunities.filter((o) => o.status === 'WON' && o.currency === 'USD').length
                      : 0
                  ).toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">USD freight service revenue per deal</p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-2xs">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quotation Turnaround</div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">3.8 Hours</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">From customer inquiry to issued quotation</p>
              </div>
            </div>

            {/* Lost Deals Reason Analysis */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Lost Opportunities Disposition Analysis
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {['PRICE', 'ROUTE', 'TRANSIT_TIME', 'NO_CAPACITY', 'CUSTOMER_CANCELLED', 'COMPETITOR', 'OTHER'].map(
                  (reason) => {
                    const count = opportunities.filter((o) => o.lostReason === reason).length
                    return (
                      <div key={reason} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{reason.replace(/_/g, ' ')}</div>
                        <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{count} Deals</div>
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODALS INTEGRATION */}
      {/* ========================================================================= */}

      {/* 1. Lead Intake & Edit Modal */}
      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          onSaved={() => {
            refreshData()
            setIsLeadModalOpen(false)
          }}
          lead={selectedLead}
        />
      )}

      {/* 2. Lead Convert Dialog */}
      {isConvertModalOpen && convertingLead && (
        <LeadConvertDialog
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          onConverted={() => {
            refreshData()
            setIsConvertModalOpen(false)
          }}
          lead={convertingLead}
        />
      )}

      {/* 3. Inquiry Modal */}
      {isInquiryModalOpen && (
        <InquiryModal
          isOpen={isInquiryModalOpen}
          onClose={() => setIsInquiryModalOpen(false)}
          onSaved={() => {
            refreshData()
            setIsInquiryModalOpen(false)
          }}
          inquiry={selectedInquiry}
        />
      )}

      {/* 4. Opportunity Modal (Create / Edit) */}
      {isOppModalOpen && (
        <OpportunityModal
          isOpen={isOppModalOpen}
          onClose={() => setIsOppModalOpen(false)}
          onSaved={() => {
            refreshData()
            setIsOppModalOpen(false)
          }}
          opportunity={selectedOppForEdit}
        />
      )}

      {/* 5. Opportunity Detail Inspector Modal */}
      {isOppDetailOpen && activeOppDetail && (
        <OpportunityDetailModal
          isOpen={isOppDetailOpen}
          onClose={() => setIsOppDetailOpen(false)}
          opportunity={activeOppDetail}
          onOpportunityUpdated={() => refreshData()}
        />
      )}

      {/* 6. Customer 360 Modal */}
      {isCust360Open && selectedCustomerFor360 && (
        <Customer360Modal
          isOpen={isCust360Open}
          onClose={() => setIsCust360Open(false)}
          customer={selectedCustomerFor360}
          canAccessAccounting={true}
          canAccessProfitability={true}
          onNewInquiry={(cust) => {
            setIsCust360Open(false)
            setSelectedInquiry(null)
            setIsInquiryModalOpen(true)
          }}
          onNewOpportunity={(cust) => {
            setIsCust360Open(false)
            setSelectedOppForEdit(null)
            setIsOppModalOpen(true)
          }}
          onNewServiceRequest={(cust) => {
            setIsCust360Open(false)
            setSelectedSr(null)
            setIsSrModalOpen(true)
          }}
          onOpenOpportunity={(opp) => {
            setIsCust360Open(false)
            handleOpenOppDetail(opp)
          }}
          onExportPdf={(cust) => {
            setSelectedCustomerFor360(cust)
            setIsCustSummaryPdfOpen(true)
          }}
        />
      )}

      {/* 7. Service Request Modal */}
      {isSrModalOpen && (
        <ServiceRequestModal
          isOpen={isSrModalOpen}
          onClose={() => setIsSrModalOpen(false)}
          onSaved={() => {
            refreshData()
            setIsSrModalOpen(false)
          }}
          request={selectedSr}
          customers={customerEntities}
        />
      )}

      {/* 8. Printable Pipeline Report Modal */}
      {isPipelinePdfOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80">
          <SalesPipelinePdf
            opportunities={opportunities}
            onClose={() => setIsPipelinePdfOpen(false)}
          />
        </div>
      )}

      {/* 9. Printable Customer Account Summary PDF Modal */}
      {isCustSummaryPdfOpen && selectedCustomerFor360 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80">
          <CustomerAccountSummaryPdf
            customer={selectedCustomerFor360}
            extension={crmSalesService.getCustomerExtension(selectedCustomerFor360.id)}
            opportunities={crmSalesService.getOpportunitiesByCustomer(selectedCustomerFor360.id)}
            quotes={freightPricingService
              .getQuotations()
              .filter((q) => q.customerId === selectedCustomerFor360.id)}
            activities={crmSalesService.getActivitiesByCustomer(selectedCustomerFor360.id)}
            canAccessAccounting={true}
            onClose={() => setIsCustSummaryPdfOpen(false)}
          />
        </div>
      )}

    </div>
  )
}
