"use client"

import { useState, useEffect } from "react"
import {
  Package,
  Truck,
  Ship,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  DollarSign,
  AlertCircle,
  MapPin,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type {
  CustomerPortalSession,
  CustomerShipmentSummary,
  CustomerDocumentItem,
  CustomerLedgerSummary,
} from "@/lib/types/customer-portal"

interface CustomerDashboardProps {
  session: CustomerPortalSession
  onViewShipments: () => void
  onSelectShipment: (shipmentId: string) => void
  onViewDocuments: () => void
  onViewLedger: () => void
}

export function CustomerDashboard({
  session,
  onViewShipments,
  onSelectShipment,
  onViewDocuments,
  onViewLedger,
}: CustomerDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [shipments, setShipments] = useState<CustomerShipmentSummary[]>([])
  const [documents, setDocuments] = useState<CustomerDocumentItem[]>([])
  const [ledger, setLedger] = useState<CustomerLedgerSummary | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadDashboardData = async () => {
      setLoading(true)
      try {
        // 1. Fetch Shipments
        const shipRes = await fetch("/api/portal/shipments?limit=10")
        if (shipRes.ok) {
          const sData = await shipRes.json()
          if (isMounted && Array.isArray(sData.shipments)) {
            setShipments(sData.shipments)
          }
        }

        // 2. Fetch Documents if permitted
        if (session.permissions.viewDocuments || session.permissions.viewBol) {
          const docRes = await fetch("/api/portal/documents")
          if (docRes.ok) {
            const dData = await docRes.json()
            if (isMounted && Array.isArray(dData.documents)) {
              setDocuments(dData.documents)
            }
          }
        }

        // 3. Fetch Ledger if permitted
        if (session.permissions.viewAccountLedger) {
          const ledRes = await fetch("/api/portal/ledger")
          if (ledRes.ok) {
            const lData = await ledRes.json()
            if (isMounted && lData.ledger) {
              setLedger(lData.ledger)
            }
          }
        }
      } catch (err) {
        console.error("Dashboard data load error:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      isMounted = false
    }
  }, [session])

  // Aggregate status metrics
  const activeCount = shipments.filter((s) => s.currentStatus !== "delivered" && s.currentStatus !== "cancelled").length
  const inTransitCount = shipments.filter((s) => s.currentStatus === "in_transit").length
  const atBorderCount = shipments.filter((s) => s.currentStatus === "at_border").length
  const atPortCount = shipments.filter((s) => s.currentStatus === "at_port").length
  const vesselDepartedCount = shipments.filter((s) => s.currentStatus === "vessel_departed" || s.currentStatus === "on_vessel").length
  const arrivingSoonCount = shipments.filter((s) => s.currentStatus === "arrived_destination").length
  const deliveredCount = shipments.filter((s) => s.currentStatus === "delivered").length

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 border border-blue-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
              Sky Ariana Logistics Control
            </span>
            <h2 className="text-2xl font-black text-white mt-0.5">
              Welcome, {session.customerName}
            </h2>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Real-time consignment tracking, transit manifests, container telemetry, and verified accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={onViewShipments}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 px-4 rounded-xl gap-2 shadow-md cursor-pointer"
            >
              <span>Track Shipments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
            <Package className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">{activeCount}</div>
          <span className="text-[10px] text-slate-500">Live consignments</span>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">In Transit</span>
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{inTransitCount}</div>
          <span className="text-[10px] text-slate-500">Road corridor</span>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">At Border</span>
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{atBorderCount}</div>
          <span className="text-[10px] text-slate-500">Customs clearance</span>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">At Port</span>
            <Ship className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">{atPortCount}</div>
          <span className="text-[10px] text-slate-500">Container yard</span>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Vessel Sea</span>
            <Ship className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{vesselDepartedCount}</div>
          <span className="text-[10px] text-slate-500">Departed sea transit</span>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Arriving</span>
            <Clock className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">{arrivingSoonCount}</div>
          <span className="text-[10px] text-slate-500">Destination port</span>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 text-white p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{deliveredCount}</div>
          <span className="text-[10px] text-slate-500">Completed</span>
        </Card>
      </div>

      {/* Outstanding Balance Banner (If permitted) */}
      {session.permissions.viewOutstandingBalance && ledger && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Account Outstanding Balance
              </span>
              <div className="flex items-baseline gap-3 mt-0.5">
                {ledger.balancesByCurrency.map((b) => (
                  <div key={b.currency} className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-slate-400">{b.currency}</span>
                    <span
                      className={`text-lg font-black font-mono ${
                        b.outstandingBalance > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {b.outstandingBalance.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onViewLedger}
            className="text-xs border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            View Account Statement
          </Button>
        </div>
      )}

      {/* Main Grid: Recent Shipments & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Recent Consignments</span>
            </h3>
            <button
              onClick={onViewShipments}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading your shipments...</div>
          ) : shipments.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-800 p-8 text-center">
              <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">No active shipments found</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                New Bills of Lading and consignments will appear here once published.
              </p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {shipments.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectShipment(s.id)}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        {s.bolNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 uppercase">
                        {s.currentStatus.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 capitalize">
                        ({s.customerRole})
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {s.commodity} • {s.cartons} {s.packageType} ({s.grossWeightKg.toLocaleString()} KG)
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{s.origin}</span>
                      <span>→</span>
                      <span>{s.destination}</span>
                      {s.containerNumber && (
                        <span className="text-slate-500 font-mono">[{s.containerNumber}]</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {s.eta && (
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block">ETA</span>
                        <span className="text-xs font-semibold text-slate-300">{s.eta}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-slate-700 bg-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all cursor-pointer"
                    >
                      Track
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Documents & Upcoming Arrivals (1 Column) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Available Documents</span>
            </h3>
            <button
              onClick={onViewDocuments}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>All Documents</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white p-4 rounded-xl space-y-3">
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No documents available</p>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{d.title}</p>
                      <span className="text-[10px] text-slate-500 font-mono">BOL: {d.bolNumber}</span>
                    </div>
                    <a
                      href={d.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold border border-slate-700 shrink-0"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Help Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Customer Portal Support</span>
            </div>
            <p className="text-[11px]">
              Need a document amendment or custom invoice? Use the <strong>Requests</strong> tab to submit verified operational tickets directly to our dispatch desk.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
