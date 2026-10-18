"use client"

import React, { useState } from "react"
import {
  PackageCheck,
  Truck,
  Anchor,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Search,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContainerPerformanceRow,
  CommodityAnalysisRow,
  TrackingPerformanceData,
  DocumentPerformanceData
} from "@/lib/types/management-reporting"

interface TabProps {
  containers: ContainerPerformanceRow[]
  commodities: CommodityAnalysisRow[]
  tracking: TrackingPerformanceData | null
  documents: DocumentPerformanceData | null
  onMetricClick: (metricId: string, title: string) => void
}

export function OperationsAnalyticsTab({
  containers,
  commodities,
  tracking,
  documents,
  onMetricClick,
}: TabProps) {
  const [subSection, setSubSection] = useState<"containers" | "commodities" | "tracking" | "documents">("containers")

  const formatMoney = (amount: number, curr = "USD") => {
    return `${curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub-section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Operational Logistics & Fleet Analytics
            </h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-500/30 text-[11px] font-mono">
              Live Transit Feeds
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Container utilization, border waiting times, port dwell times, and document completeness
          </p>
        </div>

        {/* Sub-section Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSubSection("containers")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subSection === "containers"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Containers ({containers.length})
          </button>
          <button
            onClick={() => setSubSection("commodities")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subSection === "commodities"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Commodities ({commodities.length})
          </button>
          <button
            onClick={() => setSubSection("tracking")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subSection === "tracking"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Tracking & Borders
          </button>
          <button
            onClick={() => setSubSection("documents")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              subSection === "documents"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Document Completeness
          </button>
        </div>
      </div>

      {/* 1. CONTAINER PERFORMANCE */}
      {subSection === "containers" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Container Equipment Performance & Gross Contribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown by Reefer (40&apos;RF), High Cube (40&apos;HC), Dry Cargo (20&apos;DC)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="text-left py-2.5 px-4 font-bold">Equipment Type</th>
                    <th className="text-center py-2.5 px-3 font-bold">Active Units</th>
                    <th className="text-right py-2.5 px-3 font-bold">Total Revenue</th>
                    <th className="text-right py-2.5 px-3 font-bold text-rose-600">Direct Cost</th>
                    <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Gross Profit</th>
                    <th className="text-center py-2.5 px-3 font-bold">Avg Transit</th>
                    <th className="text-left py-2.5 px-4 font-bold">Primary Transit Corridors</th>
                    <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {containers.map((c) => (
                    <tr key={c.containerType} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {c.containerType}
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono font-medium">{c.count}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{formatMoney(c.revenue)}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium text-rose-600 dark:text-rose-400">
                        {formatMoney(c.directCosts)}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(c.grossProfit)}
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono">{c.avgTransitDays} days</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {c.topRoutes.join(", ")}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMetricClick(`containers:${c.containerType}`, `${c.containerType} Details`)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. COMMODITY ANALYSIS */}
      {subSection === "commodities" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Commodity Volume & Revenue Analysis
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Fresh Fruits, Dried Fruits, Commercial Freight, Heavy Machinery
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="text-left py-2.5 px-4 font-bold">Commodity Description</th>
                    <th className="text-center py-2.5 px-3 font-bold">Shipments</th>
                    <th className="text-right py-2.5 px-3 font-bold">Packages (Cartons)</th>
                    <th className="text-right py-2.5 px-3 font-bold">Gross Weight (Kg)</th>
                    <th className="text-right py-2.5 px-3 font-bold text-emerald-600">Total Revenue</th>
                    <th className="text-left py-2.5 px-4 font-bold">Key Destinations</th>
                    <th className="text-center py-2.5 px-3 font-bold w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {commodities.map((cmd) => (
                    <tr key={cmd.commodity} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {cmd.commodity}
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono font-medium">{cmd.shipmentsCount}</td>
                      <td className="text-right py-2.5 px-3 font-mono">{cmd.totalPackages.toLocaleString()}</td>
                      <td className="text-right py-2.5 px-3 font-mono font-medium">{cmd.totalWeightKg.toLocaleString()} kg</td>
                      <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(cmd.revenue)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {cmd.topDestinations.join(", ")}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMetricClick(`commodity:${cmd.commodity}`, `${cmd.commodity} Shipments`)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. TRACKING & BORDER PERFORMANCE */}
      {subSection === "tracking" && tracking && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-slate-500">Active In Transit</span>
                <div className="text-lg font-bold font-mono text-blue-600 mt-1">{tracking.activeShipments}</div>
                <div className="text-[10px] text-slate-400">Live on road / sea</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-amber-600">Waiting at Borders</span>
                <div className="text-lg font-bold font-mono text-amber-600 mt-1">{tracking.atBorderCount}</div>
                <div className="text-[10px] text-slate-400">Customs / Escort</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-slate-500">Dwell at Ports</span>
                <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">{tracking.atPortCount}</div>
                <div className="text-[10px] text-slate-400">Port yards</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-rose-600">Delayed Shipments</span>
                <div className="text-lg font-bold font-mono text-rose-600 mt-1">{tracking.delayedCount}</div>
                <div className="text-[10px] text-slate-400">Needs intervention</div>
              </CardContent>
            </Card>
          </div>

          {/* Border Performance Table */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Border Transit Station Efficiency & Dwell Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <th className="text-left py-2.5 px-4 font-bold">Border Station</th>
                      <th className="text-center py-2.5 px-3 font-bold">Shipments Cleared</th>
                      <th className="text-center py-2.5 px-3 font-bold">Average Wait Time</th>
                      <th className="text-center py-2.5 px-3 font-bold text-rose-600">Peak Wait Time</th>
                      <th className="text-center py-2.5 px-3 font-bold text-amber-600">Currently Waiting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tracking.borderPerformance.map((b) => (
                      <tr key={b.borderStation} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-semibold">{b.borderStation}</td>
                        <td className="text-center py-2.5 px-3 font-mono">{b.shipmentCount}</td>
                        <td className="text-center py-2.5 px-3 font-mono">{b.avgWaitHours} hrs</td>
                        <td className="text-center py-2.5 px-3 font-mono font-bold text-rose-600">{b.longestWaitHours} hrs</td>
                        <td className="text-center py-2.5 px-3 font-mono font-bold text-amber-600">
                          {b.currentWaitingCount > 0 ? (
                            <Badge variant="destructive" className="bg-amber-500 text-white font-mono text-[10px]">
                              {b.currentWaitingCount} Trucks
                            </Badge>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Clear</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. DOCUMENT PERFORMANCE */}
      {subSection === "documents" && documents && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-slate-500">Total BOLs Active</span>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{documents.totalBols}</div>
                <div className="text-[10px] text-slate-400">Operations register</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-emerald-600">Fully Ready Docs</span>
                <div className="text-lg font-bold font-mono text-emerald-600 mt-1">{documents.readyCount}</div>
                <div className="text-[10px] text-slate-400">All required files attached</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-amber-600">Pending / Incomplete</span>
                <div className="text-lg font-bold font-mono text-amber-600 mt-1">{documents.incompleteCount}</div>
                <div className="text-[10px] text-slate-400">Missing seals or stamps</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-3">
                <span className="text-[11px] font-semibold text-blue-600">Avg Completion</span>
                <div className="text-lg font-bold font-mono text-blue-600 mt-1">{documents.avgCompletionHours}h</div>
                <div className="text-[10px] text-slate-400">Turnaround time</div>
              </CardContent>
            </Card>
          </div>

          {/* Missing Documents Urgent List */}
          {documents.missingDocuments.length > 0 && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  Urgent Action Items: Missing & Incomplete Shipment Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <th className="text-left py-2.5 px-4 font-bold">BOL Number</th>
                        <th className="text-left py-2.5 px-3 font-bold">Customer</th>
                        <th className="text-left py-2.5 px-3 font-bold">Missing Required Document</th>
                        <th className="text-left py-2.5 px-3 font-bold">Specific Missing Fields</th>
                        <th className="text-center py-2.5 px-3 font-bold">Days Pending</th>
                        <th className="text-center py-2.5 px-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {documents.missingDocuments.map((m) => (
                        <tr key={m.bolNumber} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{m.bolNumber}</td>
                          <td className="py-2.5 px-3 font-medium">{m.customerName}</td>
                          <td className="py-2.5 px-3 font-semibold text-rose-600">{m.requiredDocument}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {m.missingFields.join(", ")}
                          </td>
                          <td className="text-center py-2.5 px-3 font-mono font-bold">{m.daysPending} days</td>
                          <td className="text-center py-2.5 px-3">
                            <Badge variant={m.status === "CRITICAL" ? "destructive" : "outline"} className="text-[10px]">
                              {m.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
