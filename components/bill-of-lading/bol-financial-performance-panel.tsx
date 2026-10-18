"use client"

import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Plus,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney, roundMoney } from "@/lib/utils/money"
import type {
  BolFinancialSummary,
  ShipmentCostRecord,
  SupplierProfile,
  CostCategory,
  CostAllocationMethod,
} from "@/lib/types/finance"
import { toast } from "sonner"

const COST_CATEGORIES: CostCategory[] = [
  "Ocean Freight",
  "Port Handling (Origin)",
  "Port Handling (Destination)",
  "Origin Customs Clearance",
  "Destination Customs Clearance",
  "Border Clearance (Islam Qala / Torghundi)",
  "Border Clearance (Hairatan)",
  "Border Clearance (Spin Boldak)",
  "Trucking / Driver Rent",
  "Loading Labor",
  "Unloading Labor",
  "Terminal Storage / Demurrage",
  "Container Detention",
  "Documentation / Transit Pass Fee",
  "Escort / Security Fee",
  "Insurance",
  "Commission / Agent Fee",
  "Bank / Exchange Commission",
  "Other Cost",
]

interface BolFinancialPerformancePanelProps {
  bolNumber: string
  containers?: string[]
}

export function BolFinancialPerformancePanel({
  bolNumber,
  containers = [],
}: BolFinancialPerformancePanelProps) {
  const [summary, setSummary] = useState<BolFinancialSummary | null>(null)
  const [costs, setCosts] = useState<ShipmentCostRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Add Cost Modal State
  const [isAddCostOpen, setIsAddCostOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [costCategory, setCostCategory] = useState<CostCategory>("Trucking / Driver Rent")
  const [costType, setCostType] = useState<"estimated" | "actual">("actual")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [selectedContainer, setSelectedContainer] = useState("")
  const [allocationMethod, setAllocationMethod] = useState<CostAllocationMethod>("by_container")
  const [isSubmittingCost, setIsSubmittingCost] = useState(false)

  const loadBolFinancialData = async () => {
    if (!bolNumber) return
    try {
      setIsLoading(true)
      const [summaryRes, costsRes, suppliersRes] = await Promise.all([
        fetch(`/api/finance/profitability?bol=${encodeURIComponent(bolNumber)}`).then((r) => r.json()),
        fetch(`/api/finance/costs?bol=${encodeURIComponent(bolNumber)}`).then((r) => r.json()),
        fetch("/api/finance/suppliers").then((r) => r.json()),
      ])

      if (summaryRes.success && summaryRes.summary) {
        setSummary(summaryRes.summary)
      }
      if (costsRes.success && costsRes.data) {
        setCosts(costsRes.data)
      }
      if (suppliersRes.success && suppliersRes.data) {
        setSuppliers(suppliersRes.data)
      }
    } catch (err: any) {
      console.error("Error loading BOL financial performance:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBolFinancialData()
  }, [bolNumber])

  const handleAddCost = async () => {
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid cost amount")
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)

    try {
      setIsSubmittingCost(true)
      const payload = {
        bolNumber,
        costCategory,
        costType,
        supplierId: supplier ? supplier.id : "internal",
        supplierName: supplier ? supplier.name : "Internal Expense / Office",
        description: description.trim() || costCategory,
        amount: numAmount,
        currency,
        containerNumber: selectedContainer || undefined,
        approvalStatus: "approved",
      }

      const res = await fetch("/api/finance/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`Cost ${data.cost?.costNumber || ""} logged successfully!`)
        setIsAddCostOpen(false)
        setAmount("")
        setDescription("")
        setSelectedSupplierId("")
        loadBolFinancialData()
      } else {
        toast.error(data.error || "Failed to log cost")
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsSubmittingCost(false)
    }
  }

  const handleReverseCost = async (costId: string) => {
    if (!confirm("Are you sure you want to reverse this cost? A reversal adjustment entry will be created in the ledger.")) {
      return
    }
    try {
      const res = await fetch(`/api/finance/costs/${costId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reverse", remarks: "Reversed by user in BOL Editor" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Cost reversed successfully")
        loadBolFinancialData()
      } else {
        toast.error(data.error || "Failed to reverse cost")
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  const cur = summary?.currency || "USD"
  const grossProfit = summary?.grossProfit ?? 0
  const isProfitable = grossProfit > 0
  const isLoss = grossProfit < 0

  return (
    <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 mt-4 overflow-hidden">
      <CardHeader className="bg-slate-50/70 p-3.5 border-b border-slate-200 dark:bg-slate-850 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Shipment Financial Performance & Profitability
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isProfitable
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : isLoss
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {summary?.profitStatus || "NO DATA"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddCostOpen(true)}
              className="h-7 gap-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Shipment Cost
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0 text-slate-500"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 space-y-4">
          {/* Main Profitability Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500">Customer Revenue</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {formatMoney(summary?.totalCustomerRevenue || 0, cur)}
              </div>
              <div className="text-[11px] text-slate-400">
                Paid: {formatMoney(summary?.customerPaid || 0, cur)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500">Incurred Costs</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {formatMoney(summary?.approvedSupplierCost || 0, cur)}
              </div>
              <div className="text-[11px] text-slate-400">
                Paid: {formatMoney(summary?.supplierPaid || 0, cur)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500">Gross Profit / (Loss)</span>
              <div
                className={`text-base font-black ${
                  isProfitable
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isLoss
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {formatMoney(grossProfit, cur)}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Margin:{" "}
                {summary?.marginPercent !== null && summary?.marginPercent !== undefined
                  ? `${summary.marginPercent}%`
                  : "N/A"}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500">Net Cash Position</span>
              <div
                className={`text-base font-bold ${
                  (summary?.netCashExposure || 0) >= 0 ? "text-blue-600" : "text-amber-600"
                }`}
              >
                {formatMoney(summary?.netCashExposure || 0, cur)}
              </div>
              <div className="text-[10px] text-slate-400">Cash In - Cash Out</div>
            </div>
          </div>

          {/* Overrun Warning Banner */}
          {summary?.isCostOverrun && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Cost Overrun Alert:</strong> Actual supplier costs exceed initial estimates by{" "}
                <strong>{formatMoney(summary.costVariance, cur)}</strong>.
              </span>
            </div>
          )}

          {/* Missing Exchange Rate Warning */}
          {summary?.hasMissingExchangeRate && (
            <div className="flex items-center gap-2 rounded-md bg-rose-50 p-2.5 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>
                <strong>Exchange Rate Missing:</strong> {summary.missingRateReason}. Profit calculation is suspended until rates are configured.
              </span>
            </div>
          )}

          {/* Incurred Shipment Costs Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Recorded Shipment Expenses & Supplier Bills</span>
              <span className="text-[11px] font-normal text-slate-500">
                {costs.length} item(s) logged
              </span>
            </div>

            {costs.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                No expenses logged for this BOL yet. Click &quot;Log Shipment Cost&quot; to track driver rent, ocean freight, or customs fees.
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                    <tr>
                      <th className="p-2">Cost #</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Supplier</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {costs.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {c.costNumber}
                        </td>
                        <td className="p-2 font-semibold text-slate-800 dark:text-slate-200">
                          {c.costCategory}
                        </td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{c.supplierName}</td>
                        <td className="p-2 text-slate-500 dark:text-slate-400">{c.description}</td>
                        <td className="p-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              c.costType === "actual"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {c.costType}
                          </span>
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatMoney(c.amount, c.currency)}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              c.approvalStatus === "approved" || c.approvalStatus === "posted"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : c.approvalStatus === "reversed"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {c.approvalStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {c.approvalStatus !== "reversed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReverseCost(c.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              title="Reverse this cost"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Log Cost Modal */}
      <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Log Shipment Cost for BOL #{bolNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Supplier / Transporter
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="">Internal Office / General Vendor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Cost Category
                </label>
                <select
                  value={costCategory}
                  onChange={(e) => setCostCategory(e.target.value as any)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Cost Type</label>
                <select
                  value={costType}
                  onChange={(e) => setCostType(e.target.value as any)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="actual">Actual (Incurred)</option>
                  <option value="estimated">Estimated (Budget)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 h-9 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="USD">USD</option>
                  <option value="AFN">AFN</option>
                  <option value="AED">AED</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {containers.length > 0 && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Assign to Container
                </label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="">All Containers (General Allocation)</option>
                  {containers.map((cnt, i) => (
                    <option key={i} value={cnt}>
                      {cnt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Description / Remarks
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Islam Qala border crossing driver rent"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setIsAddCostOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCost}
              disabled={isSubmittingCost}
              className="bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {isSubmittingCost ? "Saving..." : "Save Cost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
