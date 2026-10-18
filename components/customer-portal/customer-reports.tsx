"use client"

import { useState, useEffect } from "react"
import { BarChart3, Download, Package, Layers, Calendar, CheckCircle2, Truck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CustomerPortalSession } from "@/lib/types/customer-portal"

interface CustomerReportsProps {
  session: CustomerPortalSession
}

export function CustomerReportsView({ session }: CustomerReportsProps) {
  const [reportType, setReportType] = useState<"monthly" | "containers">("monthly")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchReport = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/portal/reports?type=${reportType}`)
        if (res.ok) {
          const body = await res.json()
          if (isMounted && body.report) {
            setData(body.report)
          }
        }
      } catch (err) {
        console.error("Error loading report:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchReport()
    return () => {
      isMounted = false
    }
  }, [reportType])

  const handleExportCsv = () => {
    if (!data) return
    let csvContent = "data:text/csv;charset=utf-8,"

    if (reportType === "monthly" && data.summary?.shipments) {
      csvContent += "BOL Number,Date,Commodity,Packages,Gross Weight (KG),Origin,Destination,Status,ETA\n"
      data.summary.shipments.forEach((s: any) => {
        csvContent += `"${s.bolNumber}","${s.issueDate}","${s.commodity}","${s.cartons} ${s.packageType}","${s.grossWeightKg}","${s.origin}","${s.destination}","${s.currentStatus}","${s.eta || ""}"\n`
      })
    } else if (reportType === "containers" && data.containers) {
      csvContent += "Container Number,Type,BOL Number,Commodity,Location,Status,Destination,ETA\n"
      data.containers.forEach((c: any) => {
        csvContent += `"${c.containerNumber}","${c.containerType}","${c.bolNumber}","${c.commodity}","${c.currentLocation}","${c.status}","${c.destination}","${c.eta || ""}"\n`
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `SkyAriana-${session.customerName}-${reportType}-report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Operational Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidated logistics analysis and container summaries for <strong>{session.customerName}</strong>
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          variant="outline"
          className="h-9 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:text-white gap-2 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export CSV / Excel</span>
        </Button>
      </div>

      {/* Report Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setReportType("monthly")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            reportType === "monthly" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Monthly Consignment Report
        </button>
        <button
          onClick={() => setReportType("containers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            reportType === "containers" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Active Containers Inventory
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Generating report...</div>
      ) : !data ? (
        <div className="p-12 text-center text-xs text-slate-500">No report data found.</div>
      ) : reportType === "monthly" ? (
        /* Monthly Report View */
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 text-white p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Consignments</span>
              <div className="text-2xl font-black text-white mt-1">{data.summary?.totalShipments || 0}</div>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">In Transit</span>
              <div className="text-2xl font-black text-blue-400 mt-1">{data.summary?.inTransit || 0}</div>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Cartons</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {(data.summary?.totalCartons || 0).toLocaleString()}
              </div>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white p-4 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Gross Weight</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {(data.summary?.totalGrossWeightKg || 0).toLocaleString()} KG
              </div>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3">BOL</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Commodity</th>
                    <th className="p-3">Packages</th>
                    <th className="p-3">Gross Weight</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.summary?.shipments?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-blue-400 font-bold">{s.bolNumber}</td>
                      <td className="p-3 text-slate-400">{s.issueDate}</td>
                      <td className="p-3 font-medium text-slate-200">{s.commodity}</td>
                      <td className="p-3 text-slate-300">{s.cartons} {s.packageType}</td>
                      <td className="p-3 text-slate-300 font-mono">{s.grossWeightKg.toLocaleString()} KG</td>
                      <td className="p-3 text-slate-300">{s.destination}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 uppercase">
                          {s.currentStatus.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* Containers Report View */
        <Card className="bg-slate-900 border-slate-800 text-white rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Container Number</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">BOL Reference</th>
                  <th className="p-3">Commodity</th>
                  <th className="p-3">Current Location</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.containers?.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-white">{c.containerNumber}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {c.containerType}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-blue-400">{c.bolNumber}</td>
                    <td className="p-3 text-slate-200">{c.commodity}</td>
                    <td className="p-3 text-slate-300">{c.currentLocation}</td>
                    <td className="p-3 text-slate-300">{c.destination}</td>
                    <td className="p-3 text-amber-400 font-medium">{c.eta || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
