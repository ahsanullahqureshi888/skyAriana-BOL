"use client"

import React from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts"
import { BarChart3 } from "lucide-react"

export interface AccountsOverviewChartProps {
  chartData: { name: string; shippers: number }[]
}

export function AccountsOverviewChart({ chartData }: AccountsOverviewChartProps) {
  if (!chartData || chartData.length === 0) return null

  return (
    <div className="rounded-3xl border border-blue-100 bg-white/90 p-5 sm:p-6 backdrop-blur-xl shadow-md shadow-blue-900/5">
      <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
        <span>Top Accounts by Shippers Overview</span>
      </h3>
      <div className="h-[180px] sm:h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                fontWeight: "bold",
              }}
              formatter={(value: any) => [
                <span key="val" className="font-black text-blue-900">
                  {value} Shippers
                </span>,
                "",
              ]}
              labelStyle={{ color: "#64748b", marginBottom: "4px" }}
            />
            <Bar dataKey="shippers" radius={[6, 6, 0, 0]}>
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? "#1e3a8a" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AccountsOverviewChart
