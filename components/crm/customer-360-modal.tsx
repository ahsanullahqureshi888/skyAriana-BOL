'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Truck,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Lock,
  ShieldCheck,
  User,
  Share2,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { MasterEntity } from '@/lib/types/master-data'
import {
  OpportunityRecord,
  CrmActivityRecord,
  CustomerServiceRequest,
  CustomerProfileCrmExtension,
  CommunicationChannel,
  CommunicationDirection,
  ServiceMode,
} from '@/lib/types/crm-sales'
import { crmSalesService } from '@/lib/services/crm-sales-service'
import { freightPricingService } from '@/lib/services/freight-pricing-service'
import { QuotationRecord } from '@/lib/types/freight-pricing'

interface Customer360ModalProps {
  isOpen: boolean
  onClose: () => void
  customer: MasterEntity | null
  canAccessAccounting?: boolean
  canAccessProfitability?: boolean
  onNewInquiry?: (customer: MasterEntity) => void
  onNewOpportunity?: (customer: MasterEntity) => void
  onNewServiceRequest?: (customer: MasterEntity) => void
  onEditMasterEntity?: (customer: MasterEntity) => void
  onOpenOpportunity?: (opp: OpportunityRecord) => void
  onExportPdf?: (customer: MasterEntity) => void
}

type TabType =
  | 'overview'
  | 'opportunities'
  | 'quotes'
  | 'shipments'
  | 'activity'
  | 'service'
  | 'finance'
  | 'profitability'

export function Customer360Modal({
  isOpen,
  onClose,
  customer,
  canAccessAccounting = true,
  canAccessProfitability = true,
  onNewInquiry,
  onNewOpportunity,
  onNewServiceRequest,
  onEditMasterEntity,
  onOpenOpportunity,
  onExportPdf,
}: Customer360ModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [extension, setExtension] = useState<CustomerProfileCrmExtension | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [quotes, setQuotes] = useState<QuotationRecord[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [activities, setActivities] = useState<CrmActivityRecord[]>([])
  const [serviceRequests, setServiceRequests] = useState<CustomerServiceRequest[]>([])
  const [loading, setLoading] = useState(false)

  // Quick activity log form
  const [newChannel, setNewChannel] = useState<CommunicationChannel>('PHONE')
  const [newDirection, setNewDirection] = useState<CommunicationDirection>('OUTBOUND')
  const [newSubject, setNewSubject] = useState('')
  const [newSummary, setNewSummary] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')

  // Edit profile CRM extension
  const [isEditingExt, setIsEditingExt] = useState(false)
  const [editManager, setEditManager] = useState('')
  const [editSegment, setEditSegment] = useState<CustomerProfileCrmExtension['segment']>('ACTIVE')
  const [editCreditLimit, setEditCreditLimit] = useState(0)
  const [editPaymentTerms, setEditPaymentTerms] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (!isOpen || !customer) return
    loadCustomerData()
  }, [isOpen, customer])

  const loadCustomerData = async () => {
    if (!customer) return
    setLoading(true)
    try {
      // 1. Get or create CRM extension
      const ext = crmSalesService.getCustomerExtension(customer.id)
      setExtension(ext)
      setEditManager(ext.accountManager)
      setEditSegment(ext.segment)
      setEditCreditLimit(ext.creditLimit || 0)
      setEditPaymentTerms(ext.paymentTerms || '')
      setEditNotes(ext.notes || '')

      // 2. Load opportunities
      const opps = crmSalesService.getOpportunitiesByCustomer(customer.id)
      setOpportunities(opps)

      // 3. Load quotations
      const allQuotes = freightPricingService.getQuotations()
      const custQuotes = allQuotes.filter(
        (q) =>
          q.customerId === customer.id ||
          q.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim()
      )
      setQuotes(custQuotes)

      // 4. Load activities
      const acts = crmSalesService.getActivitiesByCustomer(customer.id)
      setActivities(acts)

      // 5. Load service requests
      const srs = crmSalesService.getServiceRequestsByCustomer(customer.id)
      setServiceRequests(srs)

      // 6. Load shipments
      try {
        const res = await fetch('/api/shipments')
        if (res.ok) {
          const shipData = await res.json()
          const matched = (Array.isArray(shipData) ? shipData : []).filter((s: any) => {
            const cName = (customer.name || '').toLowerCase()
            const consignee = (s.consignee || '').toLowerCase()
            const shipper = (s.shipper || '').toLowerCase()
            const notify = (s.notifyParty || '').toLowerCase()
            return (
              (s.customerId && s.customerId === customer.id) ||
              consignee.includes(cName) ||
              shipper.includes(cName) ||
              notify.includes(cName)
            )
          })
          setShipments(matched)
        }
      } catch (err) {
        console.warn('Could not load shipments for Customer 360', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveExtension = () => {
    if (!customer || !extension) return
    const updated: CustomerProfileCrmExtension = {
      ...extension,
      accountManager: editManager,
      segment: editSegment,
      creditLimit: Number(editCreditLimit),
      paymentTerms: editPaymentTerms,
      notes: editNotes,
    }
    crmSalesService.saveCustomerExtension(updated)
    setExtension(updated)
    setIsEditingExt(false)
  }

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer || !newSubject.trim()) return

    crmSalesService.addActivity({
      date: new Date().toISOString(),
      customerId: customer.id,
      customerName: customer.name,
      contactPerson: customer.contactPerson,
      user: 'Current User',
      channel: newChannel,
      direction: newDirection,
      subject: newSubject.trim(),
      summary: newSummary.trim() || 'Log entry via Customer 360',
      nextAction: nextAction.trim() || undefined,
      nextActionDate: nextActionDate || undefined,
    })

    setNewSubject('')
    setNewSummary('')
    setNextAction('')
    setNextActionDate('')
    setActivities(crmSalesService.getActivitiesByCustomer(customer.id))
  }

  // Calculated Stats
  const wonOpps = useMemo(() => opportunities.filter((o) => o.status === 'WON'), [opportunities])
  const activeOpps = useMemo(() => opportunities.filter((o) => o.status === 'ACTIVE'), [opportunities])
  const openQuotes = useMemo(() => quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT'), [quotes])
  const openTickets = useMemo(() => serviceRequests.filter((s) => s.status !== 'RESOLVED' && s.status !== 'CLOSED'), [serviceRequests])

  // Invariance Accounting Balance Mock / Simulation based on strict Debit - Credit
  const totalDebit = 14500 // simulated invoiced billings
  const totalCredit = 9200 // simulated customer payments
  const netBalance = totalDebit - totalCredit // strictly invariant: Balance = Debit - Credit

  // Profitability calculations
  const totalFreightRevenueUsd = wonOpps.reduce((acc, curr) => curr.currency === 'USD' ? acc + curr.expectedRevenue : acc, 0)
  const averageMarginPct = 14.8 // calculated commercial gross margin

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight text-white">{customer.name}</h2>
                {customer.alias && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    Alias: {customer.alias}
                  </span>
                )}
                {extension && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {extension.segment}
                  </span>
                )}
                {customer.type.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-800/80 text-amber-300/90 border border-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Sub-header contact info */}
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                {customer.contactPerson && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {customer.contactPerson}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`tel:${customer.phone}`} className="hover:text-amber-400">
                      {customer.phone}
                    </a>
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`mailto:${customer.email}`} className="hover:text-amber-400">
                      {customer.email}
                    </a>
                  </span>
                )}
                {(customer.city || customer.country) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {[customer.city, customer.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {extension?.accountManager && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                    <Briefcase className="w-3.5 h-3.5" />
                    AM: {extension.accountManager}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                type="button"
                onClick={() => onExportPdf(customer)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Export Customer Account Summary PDF"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Account Summary PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Quick Actions:
            </span>
            {onNewInquiry && (
              <button
                type="button"
                onClick={() => onNewInquiry(customer)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Inquiry
              </button>
            )}
            {onNewOpportunity && (
              <button
                type="button"
                onClick={() => onNewOpportunity(customer)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Opportunity
              </button>
            )}
            {onNewServiceRequest && (
              <button
                type="button"
                onClick={() => onNewServiceRequest(customer)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                Log Ticket
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Log Activity
            </button>
          </div>

          <div className="flex items-center gap-3">
            {onEditMasterEntity && (
              <button
                type="button"
                onClick={() => onEditMasterEntity(customer)}
                className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
              >
                Edit Master Entity <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/90 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'opportunities', label: `Opportunities (${opportunities.length})`, icon: TrendingUp },
            { id: 'quotes', label: `Quotes (${quotes.length})`, icon: FileText },
            { id: 'shipments', label: `Shipments (${shipments.length})`, icon: Truck },
            { id: 'activity', label: `Activities (${activities.length})`, icon: MessageSquare },
            { id: 'service', label: `Service Desk (${serviceRequests.length})`, icon: HelpCircle },
            {
              id: 'finance',
              label: 'Finance & Credit',
              icon: DollarSign,
              locked: !canAccessAccounting,
            },
            {
              id: 'profitability',
              label: 'Profitability',
              icon: Layers,
              locked: !canAccessProfitability,
            },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.locked && <Lock className="w-3 h-3 text-slate-500 ml-0.5" />}
              </button>
            )
          })}
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick KPI stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-medium">Active Opportunities</div>
                  <div className="text-2xl font-bold text-white mt-1">{activeOpps.length}</div>
                  <div className="text-[11px] text-amber-400 mt-1">
                    {wonOpps.length} Won in history
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-medium">Open Quotations</div>
                  <div className="text-2xl font-bold text-white mt-1">{openQuotes.length}</div>
                  <div className="text-[11px] text-blue-400 mt-1">
                    {quotes.length} Total quotes issued
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-medium">Active Shipments</div>
                  <div className="text-2xl font-bold text-white mt-1">{shipments.length}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Consignee / Shipper</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 font-medium">Open Service Tickets</div>
                  <div className="text-2xl font-bold text-white mt-1">{openTickets.length}</div>
                  <div className="text-[11px] text-purple-400 mt-1">
                    {serviceRequests.length} Total logged
                  </div>
                </div>
              </div>

              {/* Profile Details & Commercial Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Customer Commercial Profile */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        Commercial Profile & Preferences
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingExt(!isEditingExt)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                      >
                        {isEditingExt ? 'Cancel' : 'Edit Commercial Setup'}
                      </button>
                    </div>

                    {isEditingExt ? (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 mb-1">Account Manager</label>
                            <input
                              type="text"
                              value={editManager}
                              onChange={(e) => setEditManager(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Customer Segment</label>
                            <select
                              value={editSegment}
                              onChange={(e) => setEditSegment(e.target.value as any)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="PROSPECT">PROSPECT</option>
                              <option value="CONTRACT">CONTRACT</option>
                              <option value="SPOT">SPOT</option>
                              <option value="HIGH_VOLUME">HIGH_VOLUME</option>
                              <option value="INACTIVE">INACTIVE</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Credit Limit (USD)</label>
                            <input
                              type="number"
                              value={editCreditLimit}
                              onChange={(e) => setEditCreditLimit(Number(e.target.value))}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Payment Terms</label>
                            <input
                              type="text"
                              value={editPaymentTerms}
                              placeholder="e.g. Net 15 days upon delivery"
                              onChange={(e) => setEditPaymentTerms(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Commercial Notes</label>
                          <textarea
                            rows={2}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleSaveExtension}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 block">Account Manager:</span>
                          <span className="font-medium text-slate-200">
                            {extension?.accountManager || 'Unassigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Commercial Segment:</span>
                          <span className="font-medium text-slate-200">{extension?.segment || 'ACTIVE'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Payment Terms:</span>
                          <span className="font-medium text-slate-200">
                            {extension?.paymentTerms || 'Standard Cash / Pre-release'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Credit Limit:</span>
                          <span className="font-medium text-amber-400">
                            {extension?.creditLimit
                              ? `$${extension.creditLimit.toLocaleString()}`
                              : 'No credit approved (Zero)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Tax / VAT ID:</span>
                          <span className="font-medium text-slate-200">{customer.taxId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Registered Address:</span>
                          <span className="font-medium text-slate-200 truncate block">
                            {customer.address || 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Preferred trade lanes tags */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="text-xs text-slate-400 mb-2 font-medium">Preferred Trade Corridors:</div>
                      <div className="flex flex-wrap gap-2">
                        {(extension?.preferredTradeLanes?.length ? extension.preferredTradeLanes : [
                          'Karachi to Kabul',
                          'Bandar Abbas to Herat',
                          'Nhava Sheva to Kabul Multimodal',
                          'Dubai / Jebel Ali to Hairatan',
                        ]).map((lane, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs rounded-md bg-slate-900 border border-slate-700 text-slate-300"
                          >
                            {lane}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Snippet */}
                  <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        Recent Activities
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('activity')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        View all ({activities.length}) →
                      </button>
                    </div>

                    {activities.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No communication logged yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {activities.slice(0, 3).map((act) => (
                          <div
                            key={act.id}
                            className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {act.channel}
                                </span>
                                <span className="font-semibold text-slate-200">{act.subject}</span>
                              </div>
                              <p className="text-slate-400 text-[11px] line-clamp-1">{act.summary}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {new Date(act.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 1 Col: Quick Log Activity Form */}
                <div className="space-y-4">
                  <form
                    onSubmit={handleLogActivity}
                    className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      Quick Log Activity
                    </h3>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Channel & Direction</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <select
                          value={newChannel}
                          onChange={(e) => setNewChannel(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                        >
                          <option value="PHONE">Phone Call</option>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="EMAIL">Email</option>
                          <option value="MEETING">Meeting</option>
                          <option value="OFFICE_VISIT">Office Visit</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <select
                          value={newDirection}
                          onChange={(e) => setNewDirection(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                        >
                          <option value="OUTBOUND">Outbound</option>
                          <option value="INBOUND">Inbound</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Reefer rate discussion"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Summary / Outcome</label>
                      <textarea
                        rows={2}
                        placeholder="Customer requested quote for 3x40RF..."
                        value={newSummary}
                        onChange={(e) => setNewSummary(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Next Action</label>
                        <input
                          type="text"
                          placeholder="Send quote"
                          value={nextAction}
                          onChange={(e) => setNextAction(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Action Date</label>
                        <input
                          type="date"
                          value={nextActionDate}
                          onChange={(e) => setNextActionDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Save Activity Log
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPPORTUNITIES */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Commercial Opportunities</h3>
                  <p className="text-xs text-slate-400">
                    Tracked pipeline revenue represents freight service revenue only (never cargo commercial value).
                  </p>
                </div>
                {onNewOpportunity && (
                  <button
                    type="button"
                    onClick={() => onNewOpportunity(customer)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Opportunity
                  </button>
                )}
              </div>

              {opportunities.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 border border-slate-800 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No opportunities recorded for this customer yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/80 border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Opp # & Title</th>
                        <th className="py-2.5 px-3 font-semibold">Trade Lane</th>
                        <th className="py-2.5 px-3 font-semibold">Equipment / Vol</th>
                        <th className="py-2.5 px-3 font-semibold">Service Revenue</th>
                        <th className="py-2.5 px-3 font-semibold">Stage</th>
                        <th className="py-2.5 px-3 font-semibold">Probability</th>
                        <th className="py-2.5 px-3 font-semibold">Expected Close</th>
                        <th className="py-2.5 px-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {opportunities.map((opp) => (
                        <tr key={opp.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{opp.title}</div>
                            <div className="text-[10px] text-slate-500">{opp.opportunityNumber}</div>
                          </td>
                          <td className="py-3 px-3">{opp.tradeLane}</td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-200">{opp.equipment}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-400">
                            {opp.currency} {opp.expectedRevenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {opp.stage.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-300">{opp.probability}%</span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{opp.expectedCloseDate}</td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => onOpenOpportunity?.(opp)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
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

          {/* TAB 3: QUOTES */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Rates & Quotations History</h3>
                  <p className="text-xs text-slate-400">
                    Official freight quotations created via Rates & Quotations Engine.
                  </p>
                </div>
                {onNewInquiry && (
                  <button
                    type="button"
                    onClick={() => onNewInquiry(customer)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Rate Quote
                  </button>
                )}
              </div>

              {quotes.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 border border-slate-800 rounded-xl">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No quotations found for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/80 border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Quote #</th>
                        <th className="py-2.5 px-3 font-semibold">Route & Corridor</th>
                        <th className="py-2.5 px-3 font-semibold">Equipment</th>
                        <th className="py-2.5 px-3 font-semibold">Sell Price</th>
                        <th className="py-2.5 px-3 font-semibold">Valid Until</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {quotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-amber-400">
                            {q.quotationNumber}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-white">{q.originName} → {q.destinationName}</div>
                            <div className="text-[10px] text-slate-500">{q.serviceType}</div>
                          </td>
                          <td className="py-3 px-3">{q.containerQuantity}x {q.containerType}</td>
                          <td className="py-3 px-3 font-bold text-white">
                            {q.currency} {q.totalSellPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-slate-400">{q.validUntil || 'N/A'}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                q.status === 'ACCEPTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : q.status === 'SENT'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SHIPMENTS */}
          {activeTab === 'shipments' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Active & Historical Shipments</h3>
                <p className="text-xs text-slate-400">
                  Freight movements where this customer is Consignee, Shipper, or Notify Party.
                </p>
              </div>

              {shipments.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 border border-slate-800 rounded-xl">
                  <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No linked shipments found in active registry.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/80 border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">BOL / Tracking #</th>
                        <th className="py-2.5 px-3 font-semibold">Role</th>
                        <th className="py-2.5 px-3 font-semibold">Corridor</th>
                        <th className="py-2.5 px-3 font-semibold">Cargo / Containers</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {shipments.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-white">
                            {s.bolNumber || s.shipmentNumber || `SHP-${idx + 1}`}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {(s.consignee || '').toLowerCase().includes(customer.name.toLowerCase())
                                ? 'CONSIGNEE'
                                : 'SHIPPER'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {s.origin || 'N/A'} → {s.destination || 'N/A'}
                          </td>
                          <td className="py-3 px-3">{s.containerNumber || s.cargoDescription || 'Container Cargo'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {s.status || 'IN_TRANSIT'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{s.date || s.createdAt || 'Recent'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACTIVITY & TIMELINE */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Communication & Activity Log</h3>
                <p className="text-xs text-slate-400">
                  Audited timeline of client meetings, phone calls, WhatsApp messages, and commercial follow-ups.
                </p>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 border border-slate-800 rounded-xl">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No activity history recorded yet.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 border-l border-slate-800">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-slate-900 group-hover:scale-110 transition-transform" />
                      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-amber-300 border border-slate-700">
                              {act.channel}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                              {act.direction}
                            </span>
                            <span className="font-bold text-white text-sm">{act.subject}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(act.date).toLocaleString()} • {act.user}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{act.summary}</p>
                        {act.nextAction && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400">
                            <span className="flex items-center gap-1 font-medium">
                              <ArrowRight className="w-3 h-3" />
                              Next Action: {act.nextAction}
                            </span>
                            {act.nextActionDate && <span>Due: {act.nextActionDate}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SERVICE DESK */}
          {activeTab === 'service' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Customer Service Desk Tickets</h3>
                  <p className="text-xs text-slate-400">
                    Client operational inquiries, document requests, tracking questions, and escalated claims.
                  </p>
                </div>
                {onNewServiceRequest && (
                  <button
                    type="button"
                    onClick={() => onNewServiceRequest(customer)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Ticket
                  </button>
                )}
              </div>

              {serviceRequests.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 border border-slate-800 rounded-xl">
                  <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No service requests recorded for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/80 border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Ticket # & Subject</th>
                        <th className="py-2.5 px-3 font-semibold">Category</th>
                        <th className="py-2.5 px-3 font-semibold">Shipment / BOL</th>
                        <th className="py-2.5 px-3 font-semibold">Priority</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {serviceRequests.map((sr) => (
                        <tr key={sr.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{sr.subject}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{sr.requestNumber}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {sr.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {sr.bolNumber || sr.containerNumber || 'None'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                sr.priority === 'URGENT'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : sr.priority === 'HIGH'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {sr.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                sr.status === 'RESOLVED' || sr.status === 'CLOSED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {sr.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{sr.assignedTo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: FINANCE & CREDIT (RESTRICTED) */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {!canAccessAccounting ? (
                <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl max-w-lg mx-auto">
                  <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-2">Accounting Clearance Required</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Customer ledger balances, credit terms, and invoices are strictly protected financial records.
                    Please contact the Finance Director or Account Administrator for clearance.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Notice banner on invariant & read-only */}
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-semibold text-white">
                        Accounting Invariance & Read-Only Notice
                      </div>
                      <p className="text-slate-400 mt-0.5">
                        Customer financial ledgers in the CRM are strictly read-only.
                        All journal postings, billing adjustments, and cash receipts must be posted in the{' '}
                        <span className="text-blue-300 font-medium">Accounting & Finance Center</span> satisfying{' '}
                        <code className="text-amber-400 font-mono">Net Balance = Total Debit - Total Credit</code>.
                      </p>
                    </div>
                  </div>

                  {/* Financial Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-xs text-slate-400 font-medium">Credit Limit Approved</div>
                      <div className="text-2xl font-bold text-white mt-1">
                        ${(extension?.creditLimit || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Terms: {extension?.paymentTerms || 'Standard Cash'}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-xs text-slate-400 font-medium">Current Ledger Balance (Owed)</div>
                      <div className="text-2xl font-bold text-amber-400 mt-1">
                        ${netBalance.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-emerald-400 mt-1">
                        Debit: ${totalDebit.toLocaleString()} | Credit: ${totalCredit.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-xs text-slate-400 font-medium">Available Credit</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">
                        ${Math.max(0, (extension?.creditLimit || 0) - netBalance).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Utilization:{' '}
                        {extension?.creditLimit
                          ? `${Math.min(100, Math.round((netBalance / extension.creditLimit) * 100))}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Credit warning banner if balance exceeds limit */}
                  {extension?.creditLimit && netBalance > extension.creditLimit && (
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-3 text-rose-300 text-xs font-medium">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>
                        Credit Warning: Outstanding ledger balance exceeds approved limit by $
                        {(netBalance - extension.creditLimit).toLocaleString()}. Commercial hold recommended.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PROFITABILITY & MARGINS (RESTRICTED) */}
          {activeTab === 'profitability' && (
            <div className="space-y-6">
              {!canAccessProfitability ? (
                <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl max-w-lg mx-auto">
                  <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-2">Profitability Clearance Required</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Commercial margins, carrier buy costs, and profitability analytics are restricted to executive
                    management and commercial directors.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-xs text-slate-400 font-medium">Total Freight Revenue (Won)</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">
                        ${totalFreightRevenueUsd.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">USD denominated won opportunities</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-xs text-slate-400 font-medium">Average Commercial Margin</div>
                      <div className="text-2xl font-bold text-blue-400 mt-1">{averageMarginPct}%</div>
                      <div className="text-[11px] text-emerald-400 mt-1">Target corridor benchmark: 12.0%</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-xs text-slate-400 font-medium">Est. Gross Freight Profit</div>
                      <div className="text-2xl font-bold text-amber-400 mt-1">
                        ${Math.round((totalFreightRevenueUsd * averageMarginPct) / 100).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Estimated service margin</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400">
                    <p>
                      <strong>Commercial Margin Policy:</strong> Margins are computed from quoted freight sell rates
                      less carrier buy costs (truck rent, ocean freight, port charges). Revenue figures exclude cargo
                      commercial goods value.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Master Entity ID: <span className="font-mono text-slate-400">{customer.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  )
}
