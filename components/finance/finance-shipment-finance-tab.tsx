"use client"

import React, { useState } from "react"
import {
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  Lock,
  Search,
  Plus,
  Save,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMoney, roundMoney } from "@/lib/utils/money"
import type { ShipmentFinanceRecord } from "@/lib/types/finance"
import { toast } from "sonner"

interface FinanceShipmentFinanceTabProps {
  shipmentFinances: ShipmentFinanceRecord[]
  onRefresh: () => void
}

export function FinanceShipmentFinanceTab({
  shipmentFinances,
  onRefresh,
}: FinanceShipmentFinanceTabProps) {
  const [searchBol, setSearchBol] = useState("")
  const [selectedBol, setSelectedBol] = useState<string>(
    shipmentFinances[0]?.bolNumber || "BOL-2026-NSA583"
  )
  const [isSaving, setIsSaving] = useState(false)

  // Current selected finance record
  const currentRecord =
    shipmentFinances.find((s) => s.bolNumber.toLowerCase() === selectedBol.toLowerCase()) || {
      shipmentId: `SA-SHP-${selectedBol}`,
      bolNumber: selectedBol,
      customerName: "NAJEB AMIN LTD",
      currency: "USD",
      freightRevenue: 4500,
      directCosts: {
        truck: 1800,
        shippingLine: 1200,
        port: 250,
        customs: 150,
        documentation: 100,
        container: 0,
        handling: 50,
        other: 0,
      },
      totalDirectCosts: 3550,
      grossProfit: 950,
      grossMarginPercent: 21.11,
      invoiceAmount: 4500,
      paidAmount: 0,
      outstandingAmount: 4500,
      paymentStatus: "unpaid" as const,
      charges: [],
      financiallyClosed: false,
      updatedAt: new Date().toISOString(),
    }

  // Local editing state for costs & revenue
  const [revenue, setRevenue] = useState(String(currentRecord.freightRevenue))
  const [truckCost, setTruckCost] = useState(String(currentRecord.directCosts.truck))
  const [shippingLineCost, setShippingLineCost] = useState(String(currentRecord.directCosts.shippingLine))
  const [portCost, setPortCost] = useState(String(currentRecord.directCosts.port))
  const [customsCost, setCustomsCost] = useState(String(currentRecord.directCosts.customs))
  const [docCost, setDocCost] = useState(String(currentRecord.directCosts.documentation))
  const [handlingCost, setHandlingCost] = useState(String(currentRecord.directCosts.handling))
  const [financiallyClosed, setFinanciallyClosed] = useState(currentRecord.financiallyClosed)

  // Recalculate live
  const numRevenue = Number(revenue) || 0
  const numTotalCosts =
    (Number(truckCost) || 0) +
    (Number(shippingLineCost) || 0) +
    (Number(portCost) || 0) +
    (Number(customsCost) || 0) +
    (Number(docCost) || 0) +
    (Number(handlingCost) || 0)

  const numGrossProfit = roundMoney(numRevenue - numTotalCosts, 2)
  const numMargin = numRevenue > 0 ? roundMoney((numGrossProfit / numRevenue) * 100, 2) : 0

  React.useEffect(() => {
    setRevenue(String(currentRecord.freightRevenue ?? 0))
    setTruckCost(String(currentRecord.directCosts?.truck ?? 0))
    setShippingLineCost(String(currentRecord.directCosts?.shippingLine ?? 0))
    setPortCost(String(currentRecord.directCosts?.port ?? 0))
    setCustomsCost(String(currentRecord.directCosts?.customs ?? 0))
    setDocCost(String(currentRecord.directCosts?.documentation ?? 0))
    setHandlingCost(String(currentRecord.directCosts?.handling ?? 0))
    setFinanciallyClosed(Boolean(currentRecord.financiallyClosed))
  }, [currentRecord.bolNumber, currentRecord.freightRevenue, currentRecord.totalDirectCosts, currentRecord.financiallyClosed])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/finance/shipments/${currentRecord.bolNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freightRevenue: numRevenue,
          directCosts: {
            truck: Number(truckCost) || 0,
            shippingLine: Number(shippingLineCost) || 0,
            port: Number(portCost) || 0,
            customs: Number(customsCost) || 0,
            documentation: Number(docCost) || 0,
            container: 0,
            handling: Number(handlingCost) || 0,
            other: 0,
          },
          financiallyClosed,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update shipment finance")
      toast.success(`Shipment finance for ${currentRecord.bolNumber} saved successfully!`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Select BOL:
          </span>
          <Input
            placeholder="e.g. BOL-2026-NSA583"
            value={searchBol}
            onChange={(e) => setSearchBol(e.target.value)}
            className="h-8 w-52 text-xs font-mono font-bold"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold"
            onClick={() => {
              if (searchBol.trim()) setSelectedBol(searchBol.trim())
            }}
          >
            Load BOL Finance
          </Button>
          {shipmentFinances.length > 0 && (
            <select
              value={selectedBol}
              onChange={(e) => {
                setSelectedBol(e.target.value)
                setSearchBol(e.target.value)
              }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-mono font-bold dark:border-slate-800 dark:bg-slate-900"
            >
              {shipmentFinances.map((s) => (
                <option key={s.bolNumber} value={s.bolNumber}>
                  {s.bolNumber} — {s.customerName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={financiallyClosed ? "default" : "outline"}
            className={`h-8 gap-1.5 text-xs font-bold ${
              financiallyClosed ? "bg-slate-800 text-white" : ""
            }`}
            onClick={() => setFinanciallyClosed(!financiallyClosed)}
          >
            <Lock className="h-3.5 w-3.5" />
            {financiallyClosed ? "Financially Closed" : "Open for Adjustment"}
          </Button>
          <Button
            size="sm"
            disabled={isSaving}
            className="h-8 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Warning regarding Commodity vs Revenue */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
        <span className="font-bold">Accounting Rule:</span> A Bill of Lading&apos;s commodity
        goods value (e.g. raisin export value) is strictly excluded from company revenue. Company
        revenue is strictly derived from freight and logistics service invoices.
      </div>

      {/* Main KPI Summary Cards for this BOL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Freight Service Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {formatMoney(numRevenue, currentRecord.currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Customer billed freight amount</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Total Direct Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {formatMoney(numTotalCosts, currentRecord.currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Truck, shipping line, customs & port fees
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">
              Shipment Gross Profit & Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(numGrossProfit, currentRecord.currency)}
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Gross Margin: {numMargin}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cost Breakdown Form */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Financial Structure for {currentRecord.bolNumber} ({currentRecord.currency})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Customer Freight Charge (Revenue):
            </label>
            <Input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="h-8 max-w-xs text-sm font-bold font-mono"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Truck / Transporter Cost:
              </label>
              <Input
                type="number"
                value={truckCost}
                onChange={(e) => setTruckCost(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Shipping Line Cost:
              </label>
              <Input
                type="number"
                value={shippingLineCost}
                onChange={(e) => setShippingLineCost(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Port Handling Charges:
              </label>
              <Input
                type="number"
                value={portCost}
                onChange={(e) => setPortCost(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Customs & Border Clearance:
              </label>
              <Input
                type="number"
                value={customsCost}
                onChange={(e) => setCustomsCost(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Documentation & Phytosanitary:
              </label>
              <Input
                type="number"
                value={docCost}
                onChange={(e) => setDocCost(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Handling & Loading Expenses:
              </label>
              <Input
                type="number"
                value={handlingCost}
                onChange={(e) => setHandlingCost(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
