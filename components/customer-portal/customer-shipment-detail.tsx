"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  Ship,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Copy,
  Check,
  Download,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CustomerPortalSession, CustomerShipmentDetail } from "@/lib/types/customer-portal"

interface CustomerShipmentDetailProps {
  session: CustomerPortalSession
  shipmentId: string
  onBack: () => void
  onRequestCorrection: (bolNumber: string, shipmentId: string) => void
}

export function CustomerShipmentDetailView({
  session,
  shipmentId,
  onBack,
  onRequestCorrection,
}: CustomerShipmentDetailProps) {
  const [shipment, setShipment] = useState<CustomerShipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLanguage, setCopiedLanguage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/portal/shipments/${shipmentId}`)
        if (!res.ok) {
          setError("Shipment not found or access restricted.")
          setLoading(false)
          return
        }
        const data = await res.json()
        if (isMounted && data.shipment) {
          setShipment(data.shipment)
        }
      } catch (err) {
        setError("Network error loading shipment details.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchDetail()
    return () => {
      isMounted = false
    }
  }, [shipmentId])

  // Build clean customer-safe update message
  const handleCopyUpdate = (lang: "en" | "fa" | "ps") => {
    if (!shipment) return

    let text = ""
    if (lang === "fa") {
      text = `📦 *گزارش وضعیت محموله اسکای آریانا*
شماره بارنامه: ${shipment.bolNumber}
کالا: ${shipment.commodity}
تعداد: ${shipment.cartons} بسته (${shipment.grossWeightKg.toLocaleString()} کیلوگرم)
کانتینر: ${shipment.containers?.[0]?.containerNumber || "نامشخص"}
موقعیت فعلی: ${shipment.currentLocation}
وضعیت: ${shipment.currentStatus.replace("_", " ")}
مقصد: ${shipment.destination}
تخمین رسیدن (ETA): ${shipment.vessel?.eta || shipment.eta || "در حال حرکت"}`
    } else if (lang === "ps") {
      text = `📦 *د بار د وضعیت خبرتیا - سکای اریانا*
د بارنامې شمېره: ${shipment.bolNumber}
توکي: ${shipment.commodity}
شمېر: ${shipment.cartons} کارتنه (${shipment.grossWeightKg.toLocaleString()} کیلو)
کانټینر: ${shipment.containers?.[0]?.containerNumber || "نامشخص"}
اوسنی ځای: ${shipment.currentLocation}
حالت: ${shipment.currentStatus.replace("_", " ")}
رسېدو ځای: ${shipment.destination}
د رسېدو نېټه (ETA): ${shipment.vessel?.eta || shipment.eta || "په لاره"}`
    } else {
      text = `📦 *SKY ARIANA SHIPMENT STATUS UPDATE*
BOL Number: ${shipment.bolNumber}
Commodity: ${shipment.commodity}
Quantity: ${shipment.cartons} ${shipment.packageType} (${shipment.grossWeightKg.toLocaleString()} KG)
Container: ${shipment.containers?.[0]?.containerNumber || "N/A"}
Current Location: ${shipment.currentLocation}
Status: ${shipment.currentStatus.replace("_", " ")}
Destination: ${shipment.destination}
ETA: ${shipment.vessel?.eta || shipment.eta || "In Transit"}`
    }

    navigator.clipboard.writeText(text)
    setCopiedLanguage(lang)
    setTimeout(() => setCopiedLanguage(null), 2500)
  }

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading shipment specifications...</div>
  }

  if (error || !shipment) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">{error || "Shipment Unavailable"}</h3>
        <p className="text-xs text-slate-400">
          This consignment does not belong to your customer profile or has been restricted by administration.
        </p>
        <Button onClick={onBack} variant="outline" size="sm" className="text-xs cursor-pointer">
          Back to Shipments
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Shipments</span>
        </Button>

        <Button
          onClick={() => onRequestCorrection(shipment.bolNumber, shipment.id)}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 gap-1.5 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Request Correction</span>
        </Button>
      </div>

      {/* Main Header Card */}
      <Card className="bg-slate-900 border-slate-800 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black font-mono tracking-tight text-white">
                {shipment.bolNumber}
              </h2>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800/80 uppercase">
                {shipment.currentStatus.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Internal Reference: <span className="font-mono text-slate-300">{shipment.referenceNumber}</span> • Customer Role: <span className="capitalize font-semibold text-blue-300">{shipment.customerRole}</span>
            </p>
          </div>

          {/* Quick Copy Status Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Copy Update:</span>
            <button
              onClick={() => handleCopyUpdate("en")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-blue-600 text-white transition-all cursor-pointer"
            >
              {copiedLanguage === "en" ? <Check className="w-3 h-3 text-emerald-400 inline mr-1" /> : null}
              EN
            </button>
            <button
              onClick={() => handleCopyUpdate("fa")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-blue-600 text-white transition-all cursor-pointer font-farsi"
            >
              {copiedLanguage === "fa" ? <Check className="w-3 h-3 text-emerald-400 inline mr-1" /> : null}
              فارسی
            </button>
            <button
              onClick={() => handleCopyUpdate("ps")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-blue-600 text-white transition-all cursor-pointer font-farsi"
            >
              {copiedLanguage === "ps" ? <Check className="w-3 h-3 text-emerald-400 inline mr-1" /> : null}
              پښتو
            </button>
          </div>
        </div>

        {/* Cargo & Logistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Commodity</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{shipment.commodity}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Quantity & Weights</span>
            <span className="font-bold text-slate-200 mt-0.5 block">
              {shipment.cartons} {shipment.packageType} ({shipment.grossWeightKg.toLocaleString()} KG)
            </span>
          </div>
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Origin Corridor</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{shipment.origin}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Final Destination</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">{shipment.destination}</span>
          </div>
        </div>
      </Card>

      {/* Grid: Route Timeline & Container/Vessel specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer-Safe Tracking Timeline (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Route & Checkpoint Timeline</span>
            </h3>

            {shipment.milestones.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No public tracking milestones recorded yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {shipment.milestones.map((m, idx) => {
                  const isCurrent = idx === shipment.milestones.length - 1
                  return (
                    <div key={m.id} className="relative">
                      {/* Circle indicator */}
                      <span
                        className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          m.completed
                            ? "bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/30"
                            : isCurrent
                            ? "bg-blue-500 border-blue-400 shadow-md shadow-blue-500/30 animate-pulse"
                            : "bg-slate-900 border-slate-700"
                        }`}
                      >
                        {m.completed && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </span>

                      <div className="space-y-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className={`text-xs font-bold ${isCurrent ? "text-blue-400" : "text-white"}`}>
                            {m.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {m.actualDate || (m.timestamp ? m.timestamp.substring(0, 10) : "")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{m.location}</span>
                        </p>
                        {m.description && (
                          <p className="text-[11px] text-slate-400 pt-0.5">{m.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Download Center */}
          <Card className="bg-slate-900 border-slate-800 text-white p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Consignment Documents & PDFs</span>
            </h3>

            {shipment.documents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No documents approved for customer portal view.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shipment.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Date: {doc.createdDate}</span>
                    </div>
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Container, Vessel & Route Telemetry (1 Col) */}
        <div className="space-y-4">
          {/* Container Specs */}
          <Card className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Assigned Containers</span>
            </h4>

            {shipment.containers.length === 0 ? (
              <p className="text-xs text-slate-500">Breakbulk / Truck consignment</p>
            ) : (
              <div className="space-y-2">
                {shipment.containers.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-white">{c.containerNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {c.containerType}
                      </span>
                    </div>
                    {c.sealNumber && (
                      <span className="text-[11px] text-slate-400 block">
                        Seal No: <strong className="text-slate-200 font-mono">{c.sealNumber}</strong>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Vessel & Voyage */}
          {shipment.vessel && (
            <Card className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Ship className="w-4 h-4 text-cyan-400" />
                <span>Ocean Vessel Information</span>
              </h4>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Vessel Name</span>
                  <span className="font-bold text-white text-sm">{shipment.vessel.vesselName}</span>
                </div>
                <div className="flex justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Voyage</span>
                    <span className="font-mono text-slate-200">{shipment.vessel.voyageNumber || "-"}</span>
                  </div>
                  {shipment.vessel.eta && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Port ETA</span>
                      <span className="font-bold text-amber-400">{shipment.vessel.eta}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Truck (Plate only, internal driver rents stripped) */}
          {shipment.truck?.afghanPlate && (
            <Card className="bg-slate-900 border-slate-800 text-white p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>Transit Truck Plate</span>
              </h4>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 uppercase block">Vehicle Registration</span>
                <span className="font-mono text-sm font-bold text-white mt-0.5 block">
                  {shipment.truck.afghanPlate}
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
