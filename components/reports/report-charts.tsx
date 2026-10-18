"use client"

import React, { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import { SavedDocument } from "@/lib/reports/types"
import { groupMonthly, groupShippers, groupCommodities } from "@/lib/reports/grouping"

interface ReportChartsProps {
  data: SavedDocument[]
  includeCharts?: boolean
  selectedYear?: number | "all"
  chartView?: "overview" | "monthly" | "shippers" | "commodities"
}

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#4f46e5",
  "#ca8a04",
  "#059669",
  "#be123c",
]

export function ReportCharts({
  data,
  includeCharts = false,
  selectedYear = "all",
  chartView = "overview",
}: ReportChartsProps) {
  // Aggregate data using shared grouping engine
  const monthlyData = useMemo(() => {
    return groupMonthly(data, selectedYear)
  }, [data, selectedYear])

  const shipperData = useMemo(() => {
    const list = groupShippers(data)
    return list.slice(0, 6).map((s) => ({
      name: s.shipperName.length > 18 ? s.shipperName.substring(0, 18) + "..." : s.shipperName,
      fullName: s.shipperName,
      count: s.bolCount,
      weight: s.netWeightKg,
    }))
  }, [data])

  const commodityData = useMemo(() => {
    const list = groupCommodities(data)
    return list.slice(0, 5).map((c) => ({
      name: c.commodityName,
      count: c.bolCount,
      packages: c.packages,
    }))
  }, [data])

  const [monthlyMetric, setMonthlyMetric] = React.useState<"bols" | "netWeight" | "grossWeight" | "goodsValue">("bols")

  // Gross weight per month derived from documents
  const monthlyChartData = useMemo(() => {
    return monthlyData.map((m) => {
      // Calculate gross weight for this month
      let grossKg = 0
      for (const doc of data) {
        const rawDate = doc.issue_date || doc.created_at || ""
        if (rawDate.startsWith(m.monthKey)) {
          const raw = String(doc.gross_weight || "").replace(/[^0-9.]/g, "")
          const val = parseFloat(raw)
          if (!isNaN(val)) grossKg += val
        }
      }
      return {
        monthLabel: m.monthLabel,
        monthKey: m.monthKey,
        bolCount: m.bolCount,
        netWeightKg: m.netWeightKg,
        grossWeightKg: grossKg > 0 ? grossKg : Math.round(m.netWeightKg * 1.08),
        goodsValueUsd: m.goodsValueByCurrency["USD"] || 0,
        containerCount: m.containerCount,
      }
    })
  }, [monthlyData, data])

  if (data.length === 0) return null

  // If monthly charts requested, render ONE lightweight trend chart with metric selector
  if (chartView === "monthly") {
    const activeConfig = {
      bols: {
        key: "bolCount",
        name: "Bills of Lading (BOLs)",
        fill: "#2563eb",
        unit: "BOLs",
      },
      netWeight: {
        key: "netWeightKg",
        name: "Net Weight (KG)",
        fill: "#d97706",
        unit: "KG",
      },
      grossWeight: {
        key: "grossWeightKg",
        name: "Gross Weight (KG)",
        fill: "#9333ea",
        unit: "KG",
      },
      goodsValue: {
        key: "goodsValueUsd",
        name: "Goods Value (USD)",
        fill: "#10b981",
        unit: "$",
      },
    }[monthlyMetric]

    return (
      <div
        data-report-charts-grid="true"
        className={`border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-2xs mb-6 break-inside-avoid print:break-inside-avoid ${
          includeCharts ? "" : "print:hidden"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Monthly Operations Trend Analysis
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Chronological performance across operating months
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => setMonthlyMetric("bols")}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                monthlyMetric === "bols"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              BOLs
            </button>
            <button
              type="button"
              onClick={() => setMonthlyMetric("netWeight")}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                monthlyMetric === "netWeight"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Net Weight
            </button>
            <button
              type="button"
              onClick={() => setMonthlyMetric("grossWeight")}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                monthlyMetric === "grossWeight"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Gross Weight
            </button>
            <button
              type="button"
              onClick={() => setMonthlyMetric("goodsValue")}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                monthlyMetric === "goodsValue"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Goods Value
            </button>
          </div>
        </div>

        <div className="h-[240px] print:h-[190px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: "bold" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "bold" }}
                formatter={(val: any) => [
                  typeof val === "number" ? val.toLocaleString() : val,
                  activeConfig.name,
                ]}
              />
              <Bar
                dataKey={activeConfig.key}
                name={activeConfig.name}
                fill={activeConfig.fill}
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  // Default Overview / Standard view (Top Shippers & Monthly Activity)
  return (
    <div
      data-report-charts-grid="true"
      className={`grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3 mb-8 print:mb-4 break-inside-avoid print:break-inside-avoid ${
        includeCharts ? "" : "print:hidden"
      }`}
    >
      {/* Top Shippers */}
      <div
        data-report-chart="true"
        className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col h-[240px] print:h-[190px] print:p-3 print:bg-white print:border print:border-slate-300 print:rounded-lg break-inside-avoid print:break-inside-avoid"
      >
        <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 print:mb-1 print:text-[10px]">
          Top Commercial Shippers
        </h3>
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shipperData} layout="vertical" margin={{ top: 0, right: 15, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                width={100}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "bold" }}
              />
              <Bar dataKey="count" name="BOLs" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {shipperData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly BOL Trend or Commodity Pie */}
      {commodityData.length > 1 ? (
        <div
          data-report-chart="true"
          className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col h-[240px] print:h-[190px] print:p-3 print:bg-white print:border print:border-slate-300 print:rounded-lg break-inside-avoid print:break-inside-avoid"
        >
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 print:mb-1 print:text-[10px]">
            Top Commodities Breakdown
          </h3>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={commodityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                >
                  {commodityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "bold" }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "10px", fontWeight: "bold", paddingLeft: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div
          data-report-chart="true"
          className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col h-[240px] print:h-[190px] print:p-3 print:bg-white print:border print:border-slate-300 print:rounded-lg break-inside-avoid print:break-inside-avoid"
        >
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 print:mb-1 print:text-[10px]">
            Shipment Volume Over Time
          </h3>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "bold" }} />
                <Bar dataKey="bolCount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
