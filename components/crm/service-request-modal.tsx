'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  User,
  Phone,
  FileText,
  Truck,
  MessageSquare,
  ShieldAlert,
  Eye,
  EyeOff,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import {
  CustomerServiceRequest,
  ServiceRequestCategory,
  ServiceRequestPriority,
  ServiceRequestStatus,
  CommunicationChannel,
} from '@/lib/types/crm-sales'
import { MasterEntity } from '@/lib/types/master-data'
import { crmSalesService } from '@/lib/services/crm-sales-service'
import { IncidentClaimsStore } from '@/lib/services/incident-claims-service'

interface ServiceRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (sr: CustomerServiceRequest) => void
  request?: CustomerServiceRequest | null
  initialCustomerId?: string
  initialCustomerName?: string
  customers: MasterEntity[]
}

const CATEGORIES: { value: ServiceRequestCategory; label: string }[] = [
  { value: 'TRACKING', label: 'Cargo Tracking & ETA Inquiries' },
  { value: 'DOCUMENT', label: 'Document Issuance (BOL, Certificate, Invoices)' },
  { value: 'BOOKING', label: 'Booking & Container Allocation' },
  { value: 'FINANCE', label: 'Billing, Invoices & Payment Confirmation' },
  { value: 'CUSTOMS', label: 'Border Station & Customs Transit' },
  { value: 'WAREHOUSE', label: 'Warehouse Receiving & Cross-Docking' },
  { value: 'CLAIM', label: 'Damage, Shortage & Demurrage Dispute' },
  { value: 'RATE', label: 'Quotation Follow-Up & Rate Request' },
  { value: 'GENERAL', label: 'General Commercial Service' },
  { value: 'OTHER', label: 'Other Special Request' },
]

export function ServiceRequestModal({
  isOpen,
  onClose,
  onSaved,
  request,
  initialCustomerId,
  initialCustomerName,
  customers,
}: ServiceRequestModalProps) {
  const isEditing = Boolean(request?.id)

  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [bolNumber, setBolNumber] = useState('')
  const [containerNumber, setContainerNumber] = useState('')
  const [category, setCategory] = useState<ServiceRequestCategory>('TRACKING')
  const [priority, setPriority] = useState<ServiceRequestPriority>('NORMAL')
  const [status, setStatus] = useState<ServiceRequestStatus>('OPEN')
  const [assignedTo, setAssignedTo] = useState('Customer Service Desk')
  const [dueDate, setDueDate] = useState('')
  const [customerVisible, setCustomerVisible] = useState(true)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState('')

  // New reply/communication thread item
  const [replyText, setReplyText] = useState('')
  const [replyChannel, setReplyChannel] = useState<CommunicationChannel>('WHATSAPP')
  const [replyCustomerVisible, setReplyCustomerVisible] = useState(true)
  const [escalatedIncidentId, setEscalatedIncidentId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (request) {
      setCustomerId(request.customerId)
      setCustomerName(request.customerName)
      setContactPerson(request.contactPerson || '')
      setContactPhone(request.contactPhone || '')
      setBolNumber(request.bolNumber || '')
      setContainerNumber(request.containerNumber || '')
      setCategory(request.category)
      setPriority(request.priority)
      setStatus(request.status)
      setAssignedTo(request.assignedTo)
      setDueDate(request.dueDate || '')
      setCustomerVisible(request.customerVisible)
      setSubject(request.subject)
      setDescription(request.description)
      setResolution(request.resolution || '')
      setEscalatedIncidentId(request.linkedIncidentId || null)
    } else {
      const matched = customers.find((c) => c.id === initialCustomerId)
      setCustomerId(initialCustomerId || (customers[0]?.id ?? ''))
      setCustomerName(matched?.name || initialCustomerName || (customers[0]?.name ?? ''))
      setContactPerson(matched?.contactPerson || '')
      setContactPhone(matched?.phone || '')
      setBolNumber('')
      setContainerNumber('')
      setCategory('TRACKING')
      setPriority('NORMAL')
      setStatus('OPEN')
      setAssignedTo('Customer Service Desk')
      setDueDate(new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0])
      setCustomerVisible(true)
      setSubject('')
      setDescription('')
      setResolution('')
      setEscalatedIncidentId(null)
    }
    setReplyText('')
  }, [isOpen, request, initialCustomerId, initialCustomerName, customers])

  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    const matched = customers.find((c) => c.id === id)
    if (matched) {
      setCustomerName(matched.name)
      if (matched.contactPerson) setContactPerson(matched.contactPerson)
      if (matched.phone) setContactPhone(matched.phone)
    }
  }

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!request || !replyText.trim()) return

    crmSalesService.addServiceRequestResponse(request.id, {
      user: 'Current User',
      channel: replyChannel,
      response: replyText.trim(),
      customerVisible: replyCustomerVisible,
    })

    const updated = crmSalesService.getServiceRequests().find((r: CustomerServiceRequest) => r.id === request.id)
    if (updated) {
      onSaved(updated)
    }
    setReplyText('')
  }

  const handleEscalateToIncident = () => {
    if (!window.confirm('Are you sure you want to escalate this ticket to the Operational Incident & Claims Center?')) {
      return
    }

    try {
      const claimsStore = IncidentClaimsStore.getInstance()
      const newInc = claimsStore.saveIncident({
        incidentType: category === 'CLAIM' ? 'CARGO_DAMAGE' : 'OTHER',
        customerName: customerName,
        bolNumber: bolNumber || undefined,
        containerNumber: containerNumber || undefined,
        description: `Escalated from Customer Service Desk Ticket [${request?.requestNumber || 'SR-NEW'}]: ${subject}. ${description}`,
        severity: priority === 'URGENT' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        reportedBySource: 'CUSTOMER',
        reportedByName: contactPerson || customerName,
        assignedTo: 'Claims Lead',
      })

      setEscalatedIncidentId(newInc.incidentNumber)

      if (request) {
        crmSalesService.saveServiceRequest({
          ...request,
          linkedIncidentId: newInc.incidentNumber,
        })
        crmSalesService.addServiceRequestResponse(request.id, {
          user: 'System Escalation',
          channel: 'OTHER',
          response: `Ticket escalated to Incident & Claims Center: Created Incident File #${newInc.incidentNumber}.`,
          customerVisible: false,
        })
        const updated = crmSalesService.getServiceRequests().find((r: CustomerServiceRequest) => r.id === request.id)
        if (updated) onSaved(updated)
      }

      alert(`Successfully escalated! Operational Incident File #${newInc.incidentNumber} created.`)
    } catch (err) {
      console.error('Failed to escalate incident', err)
      alert('Failed to escalate to Incident Center.')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName || !subject.trim() || !description.trim()) {
      alert('Please fill out Customer, Subject, and Description.')
      return
    }

    const payload: Partial<CustomerServiceRequest> = {
      ...(request || {}),
      customerId,
      customerName,
      contactPerson,
      contactPhone,
      bolNumber: bolNumber || undefined,
      containerNumber: containerNumber || undefined,
      category,
      priority,
      status,
      assignedTo,
      dueDate: dueDate || undefined,
      customerVisible,
      subject: subject.trim(),
      description: description.trim(),
      resolution: resolution.trim() || undefined,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? (request?.resolvedAt || new Date().toISOString()) : undefined,
      linkedIncidentId: escalatedIncidentId || undefined,
    }

    const saved = crmSalesService.saveServiceRequest(payload)
    onSaved(saved)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? `Service Desk Ticket: ${request?.requestNumber}` : 'Log Customer Service Request'}
              </h2>
              <p className="text-xs text-slate-400">
                Centralized customer operational inquiries, document issuance, cargo updates, and claim escalations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="sr-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Escalation notice if already escalated */}
            {escalatedIncidentId && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>
                    Linked Incident File: <strong className="font-mono">{escalatedIncidentId}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Claims Center Active</span>
              </div>
            )}

            {/* Row 1: Customer Selection & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Master <span className="text-rose-400">*</span>
                </label>
                <select
                  disabled={isEditing}
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white disabled:opacity-60"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            {/* Row 2: Category, Priority, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="LOW">LOW</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH (Urgent Ops)</option>
                  <option value="URGENT">URGENT (Critical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ticket Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="WAITING_CUSTOMER">WAITING_CUSTOMER</option>
                  <option value="WAITING_INTERNAL">WAITING_INTERNAL</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Row 3: BOL / Container References & Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  BOL Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BOL-2026-0412"
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Container # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MSKU9821340"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Agent</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            {/* Row 4: Subject & Portal Visibility */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Subject / Summary <span className="text-rose-400">*</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerVisible}
                    onChange={(e) => setCustomerVisible(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>Customer Portal Visible</span>
                </label>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Request for updated arrival notice and customs border transit seal"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            {/* Row 5: Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Detailed Inquiry / Request <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Customer requests confirmed delivery schedule to Kabul ICD and asks if port storage fees apply..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            {/* Resolution Text (Visible if status is RESOLVED or CLOSED) */}
            {(status === 'RESOLVED' || status === 'CLOSED') && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-2">
                <label className="block text-xs font-semibold text-emerald-300">
                  Resolution Notes (Sent to Customer / Audited)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provided original customs gate pass and verified zero demurrage at Bandar Abbas..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-700/60 text-xs text-white"
                />
              </div>
            )}

            {/* Escalation Button (if not already escalated) */}
            {isEditing && !escalatedIncidentId && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Escalate to Incident / Claims Center</div>
                  <div className="text-[11px] text-slate-400">
                    If this ticket involves cargo damage, wet cargo, shortage, or detention disputes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEscalateToIncident}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Escalate Incident
                </button>
              </div>
            )}
          </form>

          {/* Response Thread (Only in Edit mode) */}
          {isEditing && request && (
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Ticket Response & Communication History ({request.responses?.length || 0})
              </h3>

              {/* Thread list */}
              {(!request.responses || request.responses.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No responses posted on this ticket yet.</p>
              ) : (
                <div className="space-y-3">
                  {request.responses.map((resp) => (
                    <div
                      key={resp.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{resp.user}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-purple-400 border border-slate-800">
                            {resp.channel}
                          </span>
                          {resp.customerVisible ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                              <Eye className="w-3 h-3" /> Client Visible
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                              <EyeOff className="w-3 h-3" /> Internal Only
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500">{new Date(resp.date).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{resp.response}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Response Form */}
              <form onSubmit={handleAddReply} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Post Response / Ops Note</span>
                  <div className="flex items-center gap-3">
                    <select
                      value={replyChannel}
                      onChange={(e) => setReplyChannel(e.target.value as any)}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                      <option value="PHONE">Phone Call</option>
                      <option value="PORTAL">Customer Portal</option>
                      <option value="OTHER">Internal Note</option>
                    </select>

                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replyCustomerVisible}
                        onChange={(e) => setReplyCustomerVisible(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                      />
                      <span>Customer Visible</span>
                    </label>
                  </div>
                </div>

                <textarea
                  rows={2}
                  required
                  placeholder="Type reply or status update..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Send className="w-3 h-3" />
                    Post Response
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="sr-form"
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs transition-colors shadow"
          >
            {isEditing ? 'Save Ticket Changes' : 'Create Service Ticket'}
          </button>
        </div>

      </div>
    </div>
  )
}
