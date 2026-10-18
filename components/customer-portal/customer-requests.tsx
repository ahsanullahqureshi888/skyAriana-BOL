"use client"

import { useState, useEffect } from "react"
import { HelpCircle, Plus, Send, CheckCircle2, Clock, MessageSquare, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CustomerPortalSession, CustomerPortalRequest, PortalRequestType } from "@/lib/types/customer-portal"

interface CustomerRequestsProps {
  session: CustomerPortalSession
  initialBolNumber?: string
  initialShipmentId?: string
}

export function CustomerRequestsView({
  session,
  initialBolNumber,
  initialShipmentId,
}: CustomerRequestsProps) {
  const [requests, setRequests] = useState<CustomerPortalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(Boolean(initialBolNumber))

  const [requestType, setRequestType] = useState<PortalRequestType>(
    initialBolNumber ? "correction" : "document"
  )
  const [subject, setSubject] = useState(initialBolNumber ? `Correction request for ${initialBolNumber}` : "")
  const [message, setMessage] = useState("")
  const [bolNumber, setBolNumber] = useState(initialBolNumber || "")
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/portal/requests")
      if (res.ok) {
        const body = await res.json()
        if (Array.isArray(body.requests)) {
          setRequests(body.requests)
        }
      }
    } catch (err) {
      console.error("Failed to load requests:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    setSubmitting(true)
    setStatusMessage(null)

    try {
      const res = await fetch("/api/portal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          subject: subject.trim(),
          message: message.trim(),
          bolNumber: bolNumber.trim() || undefined,
          shipmentId: initialShipmentId,
        }),
      })

      if (res.ok) {
        setStatusMessage("Your ticket has been submitted to dispatch. A logistics officer will review it promptly.")
        setSubject("")
        setMessage("")
        setBolNumber("")
        setShowNewModal(false)
        fetchRequests()
      } else {
        const data = await res.json()
        setStatusMessage(data.error || "Submission failed.")
      }
    } catch (err) {
      setStatusMessage("Connection error.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            <span>Support & Requests</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit verified inquiries, document requests, or BOL correction requests directly to Sky Ariana dispatch.
          </p>
        </div>

        <Button
          onClick={() => setShowNewModal(!showNewModal)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 rounded-xl gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Request Ticket</span>
        </Button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* New Request Form Card */}
      {showNewModal && (
        <Card className="bg-slate-900 border-slate-800 text-white rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Submit New Operational Request</span>
            </h3>
            <button
              onClick={() => setShowNewModal(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Request Category</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="correction">BOL Correction / Amendment</option>
                  <option value="document">Document / PDF Request</option>
                  <option value="tracking">Tracking & Status Inquiry</option>
                  <option value="account">Account & Billing Inquiry</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Associated BOL Number (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. BOL-2026-NSA583"
                  value={bolNumber}
                  onChange={(e) => setBolNumber(e.target.value)}
                  className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Subject</label>
              <Input
                type="text"
                placeholder="Brief summary of your inquiry..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Detailed Message</label>
              <Textarea
                placeholder="Please describe the correction or document required with specific details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-xs rounded-xl"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 px-5 rounded-xl gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Submitting..." : "Send Request to Operations"}</span>
            </Button>
          </form>
        </Card>
      )}

      {/* Requests History List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Your Submitted Tickets ({requests.length})
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">No support requests submitted</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Have questions or need a document change? Click "New Request Ticket" above.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const statusColors: Record<string, string> = {
                open: "bg-blue-950 text-blue-400 border-blue-800/60",
                in_review: "bg-amber-950 text-amber-400 border-amber-800/60",
                resolved: "bg-emerald-950 text-emerald-400 border-emerald-800/60",
                closed: "bg-slate-800 text-slate-400 border-slate-700",
              }

              return (
                <Card key={r.id} className="bg-slate-900 border-slate-800 text-white p-4 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{r.subject}</span>
                        {r.bolNumber && (
                          <span className="font-mono text-[11px] text-blue-400 font-semibold">
                            [{r.bolNumber}]
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Submitted by {r.userName} • {new Date(r.createdAt).toLocaleString()} • Category: <strong className="capitalize">{r.requestType}</strong>
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${
                        statusColors[r.status] || "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                    {r.message}
                  </p>

                  {r.adminResponse && (
                    <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200 mt-2">
                      <div className="flex items-center gap-1.5 font-bold text-blue-300 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Sky Ariana Operations Reply:</span>
                      </div>
                      <p className="text-slate-300">{r.adminResponse}</p>
                      {r.respondedAt && (
                        <span className="text-[10px] text-blue-400/70 block mt-1">
                          Responded on {new Date(r.respondedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
