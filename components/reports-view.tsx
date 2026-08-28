"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  Scale,
  FileText,
  Truck,
  Building2,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Plus,
  Trash2,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Percent,
  Receipt,
  Eye,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  X,
  Edit2,
  Landmark
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import * as XLSX from "xlsx"

export interface CustomExpenseEntry {
  id: string
  date: string
  title: string
  category: "Driver Freight" | "Border Transit & Waybill" | "Port Clearance & Handling" | "Customs & Phyto" | "Fuel & Logistics" | "Warehouse & Storage" | "Admin & Office" | "Commission & Hawala" | "Other Expense"
  type: "expense" | "revenue"
  amount: number
  currency: string
  refNumber?: string
  shipperName?: string
  paymentMethod: "Cash" | "Bank Transfer" | "Hawala" | "Pending"
  notes?: string
  createdAt: string
}

const DEFAULT_EXPENSE_CATEGORIES = [
  "Driver Freight",
  "Border Transit & Waybill",
  "Port Clearance & Handling",
  "Customs & Phyto",
  "Fuel & Logistics",
  "Warehouse & Storage",
  "Admin & Office",
  "Commission & Hawala",
  "Other Expense",
] as const

const INITIAL_EXPENSES: CustomExpenseEntry[] = [
  {
    id: "exp-1",
    date: "1404-09-05",
    title: "Border Transit & Clearance - Nimroz to Chabahar",
    category: "Border Transit & Waybill",
    type: "expense",
    amount: 1450,
    currency: "USD",
    refNumber: "TC-7-975",
    shipperName: "NAJEB AMIN LTD",
    paymentMethod: "Bank Transfer",
    notes: "Customs declaration & convoy escort fee",
    createdAt: new Date().toISOString()
  },
  {
    id: "exp-2",
    date: "1404-09-12",
    title: "Port Nhava Sheva Terminal Handling Charge",
    category: "Port Clearance & Handling",
    type: "expense",
    amount: 1850,
    currency: "USD",
    refNumber: "BL-SCLJEANSA02230",
    shipperName: "ANI TRADERS",
    paymentMethod: "Bank Transfer",
    notes: "Container discharge & THC charges",
    createdAt: new Date().toISOString()
  },
  {
    id: "exp-3",
    date: "1404-09-18",
    title: "Truck Driver Rent & Advance Payment",
    category: "Driver Freight",
    type: "expense",
    amount: 2450,
    currency: "USD",
    refNumber: "TRK-4498",
    shipperName: "M/S KALU MAL MADAN LAL",
    paymentMethod: "Cash",
    notes: "Route Kandahar to Bandar Abbas",
    createdAt: new Date().toISOString()
  }
]

export function ReportsView() {
  const { accounts, setView } = useApp()

  // State
  const [activeTab, setActiveTab] = useState<"pnl" | "shipments" | "balances" | "expenses">("pnl")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "last_month" | "year" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedShipper, setSelectedShipper] = useState<string>("all")
  const [selectedConsignee, setSelectedConsignee] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Custom Expenses
  const [customExpenses, setCustomExpenses] = useState<CustomExpenseEntry[]>([])
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [newExpTitle, setNewExpTitle] = useState("")
  const [newExpCategory, setNewExpCategory] = useState<CustomExpenseEntry["category"]>("Driver Freight")
  const [newExpType, setNewExpType] = useState<"expense" | "revenue">("expense")
  const [newExpAmount, setNewExpAmount] = useState("")
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [newExpRef, setNewExpRef] = useState("")
  const [newExpShipper, setNewExpShipper] = useState("")
  const [newExpPayMethod, setNewExpPayMethod] = useState<CustomExpenseEntry["paymentMethod"]>("Cash")
  const [newExpNotes, setNewExpNotes] = useState("")

  // Load Saved BOL documents from localStorage
  const [bolDocs, setBolDocs] = useState<any[]>([])

  const loadDocuments = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      const raw1 = window.localStorage.getItem("sky-bol-browser-documents")
      const raw2 = window.localStorage.getItem("skybol:saved-documents")
      const raw3 = window.localStorage.getItem("skybol:backup-documents")
      const d1 = raw1 ? JSON.parse(raw1) : []
      const d2 = raw2 ? JSON.parse(raw2) : []
      const d3 = raw3 ? JSON.parse(raw3) : []

      const merged = new Map<string, any>()
      for (const d of [...d1, ...d2, ...d3]) {
        const k = d.bol_number || d.id
        if (k && !merged.has(k)) merged.set(k, d)
      }

      setBolDocs(Array.from(merged.values()))
    } catch (e) {
      console.error("Error loading documents for reports:", e)
    }

    try {
      const savedExp = window.localStorage.getItem("skybol:custom-expenses")
      if (savedExp) {
        setCustomExpenses(JSON.parse(savedExp))
      } else {
        setCustomExpenses(INITIAL_EXPENSES)
        window.localStorage.setItem("skybol:custom-expenses", JSON.stringify(INITIAL_EXPENSES))
      }
    } catch (e) {
      setCustomExpenses(INITIAL_EXPENSES)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
    const handleUpdate = () => loadDocuments()
    window.addEventListener("skybol:documents-updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      window.removeEventListener("skybol:documents-updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [loadDocuments])

  // Save Custom Expenses
  const saveExpensesList = (newList: CustomExpenseEntry[]) => {
    setCustomExpenses(newList)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("skybol:custom-expenses", JSON.stringify(newList))
    }
  }

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newExpAmount) || 0
    if (!newExpTitle.trim() || amt <= 0) {
      toast.error("Please enter a valid title and amount")
      return
    }

    const entry: CustomExpenseEntry = {
      id: `exp-${Date.now()}`,
      date: newExpDate || new Date().toISOString().slice(0, 10),
      title: newExpTitle.trim(),
      category: newExpCategory,
      type: newExpType,
      amount: amt,
      currency: "USD",
      refNumber: newExpRef.trim() || undefined,
      shipperName: newExpShipper.trim() || undefined,
      paymentMethod: newExpPayMethod,
      notes: newExpNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    }

    const updated = [entry, ...customExpenses]
    saveExpensesList(updated)
    toast.success(`${newExpType === "expense" ? "Expense" : "Revenue"} record added successfully!`)
    setIsAddExpenseOpen(false)
    setNewExpTitle("")
    setNewExpAmount("")
    setNewExpRef("")
    setNewExpNotes("")
  }

  const handleDeleteExpense = (id: string) => {
    if (!confirm("Are you sure you want to delete this financial record?")) return
    const updated = customExpenses.filter(e => e.id !== id)
    saveExpensesList(updated)
    toast.success("Record removed")
  }

  // Unique Lists of Shippers and Consignees for filters
  const { allShippers, allConsignees } = useMemo(() => {
    const shippers = new Set<string>()
    const consignees = new Set<string>()

    bolDocs.forEach(d => {
      if (d.shipper_name && d.shipper_name.trim()) shippers.add(d.shipper_name.trim())
      if (d.consignee_name && d.consignee_name.trim()) consignees.add(d.consignee_name.trim())
    })

    accounts.forEach(a => {
      if (a.name && a.name.trim()) shippers.add(a.name.trim())
      a.companies?.forEach(c => {
        c.ledgerEntries?.forEach(e => {
          if (e.shipperDescription && e.shipperDescription.trim()) shippers.add(e.shipperDescription.trim())
          if (e.consignee && e.consignee.trim()) consignees.add(e.consignee.trim())
        })
      })
    })

    return {
      allShippers: Array.from(shippers).sort(),
      allConsignees: Array.from(consignees).sort()
    }
  }, [bolDocs, accounts])

  // Filtered BOL documents
  const filteredBOLs = useMemo(() => {
    return bolDocs.filter(d => {
      // Shipper filter
      if (selectedShipper !== "all") {
        if (!d.shipper_name || !d.shipper_name.toLowerCase().includes(selectedShipper.toLowerCase())) {
          return false
        }
      }
      // Consignee filter
      if (selectedConsignee !== "all") {
        if (!d.consignee_name || !d.consignee_name.toLowerCase().includes(selectedConsignee.toLowerCase())) {
          return false
        }
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          (d.bol_number && d.bol_number.toLowerCase().includes(q)) ||
          (d.shipper_name && d.shipper_name.toLowerCase().includes(q)) ||
          (d.consignee_name && d.consignee_name.toLowerCase().includes(q)) ||
          (d.truck_number && d.truck_number.toLowerCase().includes(q)) ||
          (d.driver_name && d.driver_name.toLowerCase().includes(q)) ||
          (d.goods_description && d.goods_description.toLowerCase().includes(q)) ||
          (d.cargo_description && d.cargo_description.toLowerCase().includes(q)) ||
          (d.port_of_loading && d.port_of_loading.toLowerCase().includes(q)) ||
          (d.port_of_discharge && d.port_of_discharge.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [bolDocs, selectedShipper, selectedConsignee, searchQuery])

  // Filtered Custom Expenses
  const filteredExpenses = useMemo(() => {
    return customExpenses.filter(e => {
      if (selectedShipper !== "all" && e.shipperName) {
        if (!e.shipperName.toLowerCase().includes(selectedShipper.toLowerCase())) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          e.title.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.refNumber && e.refNumber.toLowerCase().includes(q)) ||
          (e.shipperName && e.shipperName.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [customExpenses, selectedShipper, searchQuery])

  // Aggregated Financial Metrics (Revenue, Costs, Profit)
  const metrics = useMemo(() => {
    let totalFreightRevenue = 0
    let totalDriverCost = 0
    let totalCargoValue = 0
    let totalPackages = 0
    let totalNetWeightKg = 0
    let totalGrossWeightKg = 0

    filteredBOLs.forEach(d => {
      // Packages
      const pkgMatch = (d.number_of_packages || "").match(/\d[\d,]*/g)
      if (pkgMatch) {
        const val = parseInt(pkgMatch[0].replace(/,/g, ""), 10) || 0
        totalPackages += val
      }

      // Weights
      const nwMatch = (d.net_weight || "").match(/\d[\d,\.]*/g)
      if (nwMatch) {
        const val = parseFloat(nwMatch[0].replace(/,/g, "")) || 0
        totalNetWeightKg += val
      }

      const gwMatch = (d.gross_weight || "").match(/\d[\d,\.]*/g)
      if (gwMatch) {
        const val = parseFloat(gwMatch[0].replace(/,/g, "")) || 0
        totalGrossWeightKg += val
      }

      // Goods Value / Declared Value
      const gvMatch = (d.goods_value || "").match(/\d[\d,\.]*/g)
      if (gvMatch) {
        const val = parseFloat(gvMatch[0].replace(/,/g, "")) || 0
        totalCargoValue += val
      }

      // Driver Rent / Cost
      const drMatch = (d.driver_rent || "").match(/\d[\d,\.]*/g)
      if (drMatch) {
        const val = parseFloat(drMatch[0].replace(/,/g, "")) || 0
        totalDriverCost += val
      }
    })

    // Ledger debits (Client Billed Freight / Revenue) and credits (Payments Collected)
    let totalLedgerDebit = 0
    let totalLedgerCredit = 0
    let totalOutstandingBalance = 0

    accounts.forEach(a => {
      if (selectedShipper !== "all" && !a.name.toLowerCase().includes(selectedShipper.toLowerCase())) {
        return
      }
      a.companies?.forEach(c => {
        c.ledgerEntries?.forEach(e => {
          totalLedgerDebit += e.debit || 0
          totalLedgerCredit += e.credit || 0
        })
      })
    })

    totalOutstandingBalance = Math.max(0, totalLedgerDebit - totalLedgerCredit)

    // Custom Expenses & Extra Revenues
    let customExpenseSum = 0
    let customRevenueSum = 0

    filteredExpenses.forEach(e => {
      if (e.type === "expense") {
        customExpenseSum += e.amount || 0
      } else {
        customRevenueSum += e.amount || 0
      }
    })

    // Comprehensive Calculation:
    // Total Revenue = Ledger Debits (or Cargo values) + Custom Revenues
    const totalGrossRevenue = totalLedgerDebit > 0 ? (totalLedgerDebit + customRevenueSum) : (totalCargoValue * 0.12 + customRevenueSum)
    const totalOperationalCost = totalDriverCost + customExpenseSum
    const netProfit = totalGrossRevenue - totalOperationalCost
    const profitMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0

    return {
      totalBOLCount: filteredBOLs.length,
      totalPackages,
      totalNetWeightKg,
      totalGrossWeightKg,
      totalCargoValue,
      totalDriverCost,
      totalLedgerDebit,
      totalLedgerCredit,
      totalOutstandingBalance,
      customExpenseSum,
      customRevenueSum,
      totalGrossRevenue,
      totalOperationalCost,
      netProfit,
      profitMargin
    }
  }, [filteredBOLs, accounts, filteredExpenses, selectedShipper])

  // Company Balance Summary Table
  const companyBalanceRows = useMemo(() => {
    const rows: {
      accountName: string
      companyName: string
      entriesCount: number
      totalBilled: number
      totalReceived: number
      balance: number
      status: "Settled" | "Outstanding" | "Credit"
    }[] = []

    accounts.forEach(a => {
      if (selectedShipper !== "all" && !a.name.toLowerCase().includes(selectedShipper.toLowerCase())) {
        return
      }
      a.companies?.forEach(c => {
        let deb = 0
        let cred = 0
        c.ledgerEntries?.forEach(e => {
          deb += e.debit || 0
          cred += e.credit || 0
        })
        const bal = deb - cred
        rows.push({
          accountName: a.name,
          companyName: c.name,
          entriesCount: c.ledgerEntries?.length || 0,
          totalBilled: deb,
          totalReceived: cred,
          balance: bal,
          status: bal === 0 ? "Settled" : bal > 0 ? "Outstanding" : "Credit"
        })
      })
    })

    return rows.sort((a, b) => b.balance - a.balance)
  }, [accounts, selectedShipper])

  // Commodity Volume Ranking
  const commodityRanking = useMemo(() => {
    const map = new Map<string, { count: number; pkgs: number; weight: number }>()

    filteredBOLs.forEach(d => {
      const desc = (d.goods_description || d.cargo_description || d.description_of_goods || "General Produce").trim().toUpperCase()
      const key = desc.split(/[,|\n]/)[0].trim() || "GENERAL CARGO"
      
      let pkgs = 0
      const pMatch = (d.number_of_packages || "").match(/\d[\d,]*/g)
      if (pMatch) pkgs = parseInt(pMatch[0].replace(/,/g, ""), 10) || 0

      let wt = 0
      const wMatch = (d.net_weight || d.gross_weight || "").match(/\d[\d,\.]*/g)
      if (wMatch) wt = parseFloat(wMatch[0].replace(/,/g, "")) || 0

      const cur = map.get(key) || { count: 0, pkgs: 0, weight: 0 }
      map.set(key, {
        count: cur.count + 1,
        pkgs: cur.pkgs + pkgs,
        weight: cur.weight + wt
      })
    })

    return Array.from(map.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
  }, [filteredBOLs])

  // Top Shippers Ranking
  const topShippersRanking = useMemo(() => {
    const map = new Map<string, { count: number; pkgs: number; weight: number; value: number }>()

    filteredBOLs.forEach(d => {
      const name = (d.shipper_name || "Unknown Shipper").trim()
      let pkgs = 0
      const pMatch = (d.number_of_packages || "").match(/\d[\d,]*/g)
      if (pMatch) pkgs = parseInt(pMatch[0].replace(/,/g, ""), 10) || 0

      let wt = 0
      const wMatch = (d.net_weight || d.gross_weight || "").match(/\d[\d,\.]*/g)
      if (wMatch) wt = parseFloat(wMatch[0].replace(/,/g, "")) || 0

      let val = 0
      const vMatch = (d.goods_value || "").match(/\d[\d,\.]*/g)
      if (vMatch) val = parseFloat(vMatch[0].replace(/,/g, "")) || 0

      const cur = map.get(name) || { count: 0, pkgs: 0, weight: 0, value: 0 }
      map.set(name, {
        count: cur.count + 1,
        pkgs: cur.pkgs + pkgs,
        weight: cur.weight + wt,
        value: cur.value + val
      })
    })

    return Array.from(map.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.pkgs - a.pkgs)
      .slice(0, 6)
  }, [filteredBOLs])

  // Export to Excel / CSV
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      // 1. P&L Sheet
      const pnlData = [
        ["SKY ARIANA LIMITED - FINANCIAL & OPERATIONAL REPORT"],
        ["Generated At", new Date().toLocaleString()],
        ["Selected Shipper", selectedShipper],
        ["Selected Consignee", selectedConsignee],
        [],
        ["FINANCIAL METRIC", "AMOUNT (USD)"],
        ["Total Gross Freight / Revenue", metrics.totalGrossRevenue],
        ["Driver Freight Costs", metrics.totalDriverCost],
        ["Operational & Border Expenses", metrics.customExpenseSum],
        ["Total Operational Costs", metrics.totalOperationalCost],
        ["NET PROFIT / LOSS", metrics.netProfit],
        ["Profit Margin (%)", `${metrics.profitMargin.toFixed(2)}%`],
        ["Outstanding Client Receivables", metrics.totalOutstandingBalance],
        [],
        ["CARGO & LOGISTICS METRICS", "VALUE"],
        ["Total Shipments (BOLs)", metrics.totalBOLCount],
        ["Total Packages / Cartons", metrics.totalPackages],
        ["Total Net Weight (KGS)", metrics.totalNetWeightKg],
        ["Total Gross Weight (KGS)", metrics.totalGrossWeightKg],
        ["Total Cargo Declared Value", metrics.totalCargoValue]
      ]
      const wsPnl = XLSX.utils.aoa_to_sheet(pnlData)
      XLSX.utils.book_append_sheet(wb, wsPnl, "Profit & Loss")

      // 2. BOL Shipments Sheet
      const bolRows = filteredBOLs.map(d => ({
        "B/L Number": d.bol_number,
        "Date": d.issue_date,
        "Shipper": d.shipper_name,
        "Consignee": d.consignee_name,
        "Truck No": d.truck_number || "",
        "Driver": d.driver_name || "",
        "Packages": d.number_of_packages || "",
        "Net Weight (KG)": d.net_weight || "",
        "Gross Weight (KG)": d.gross_weight || "",
        "Goods Value ($)": d.goods_value || "",
        "Driver Rent ($)": d.driver_rent || "",
        "Origin": d.port_of_loading || "",
        "Destination": d.port_of_discharge || ""
      }))
      const wsBol = XLSX.utils.json_to_sheet(bolRows)
      XLSX.utils.book_append_sheet(wb, wsBol, "Shipments")

      // 3. Custom Expenses Sheet
      const expRows = filteredExpenses.map(e => ({
        "Date": e.date,
        "Type": e.type.toUpperCase(),
        "Category": e.category,
        "Title": e.title,
        "Amount ($)": e.amount,
        "Payment Method": e.paymentMethod,
        "Reference": e.refNumber || "",
        "Shipper": e.shipperName || "",
        "Notes": e.notes || ""
      }))
      const wsExp = XLSX.utils.json_to_sheet(expRows)
      XLSX.utils.book_append_sheet(wb, wsExp, "Expenses & Incomes")

      XLSX.writeFile(wb, `SkyAriana_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success("Excel report exported successfully!")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export Excel report")
    }
  }

  // Print Official Report
  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-200/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-5 md:p-7">
      <div className="max-w-[1780px] w-full mx-auto space-y-5">
        
        {/* TOP CONTROLS & HEADER BANNER */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-blue-950 dark:text-white">
                  Financial &amp; Operational Reports
                </h1>
                <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-bold text-[11px]">
                  گزارشات، سود و زیان و عملکرد
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Executive Profit &amp; Loss (P&amp;L), Shipment Volumes, Client Aging &amp; Cost Analysis
              </p>
            </div>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs hover:bg-emerald-100"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add Expense / Income</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 shadow-2xs hover:bg-blue-100"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Excel</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrintReport}
              className="gap-1.5 h-9 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-800"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official A4 Report</span>
            </Button>
          </div>
        </div>

        {/* FILTERS TOOLBAR (Shipper, Consignee, Search) */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          {/* Shipper Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Filter By Shipper (ارسال‌کننده)
            </label>
            <select
              value={selectedShipper}
              onChange={(e) => setSelectedShipper(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🏢 All Shippers / تمام شرکت‌ها ({allShippers.length})</option>
              {allShippers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Consignee Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Filter By Consignee (گیرنده)
            </label>
            <select
              value={selectedConsignee}
              onChange={(e) => setSelectedConsignee(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📦 All Consignees / تمام گیرنده‌ها ({allConsignees.length})</option>
              {allConsignees.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Live Search (جستجو)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search BOL #, Truck, Commodity..."
                className="h-9 pl-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Active Filter Reset */}
          <div className="flex items-end justify-between gap-2">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              Showing <span className="font-bold text-blue-600">{filteredBOLs.length}</span> shipments,{" "}
              <span className="font-bold text-emerald-600">{filteredExpenses.length}</span> entries
            </div>
            {(selectedShipper !== "all" || selectedConsignee !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedShipper("all")
                  setSelectedConsignee("all")
                  setSearchQuery("")
                }}
                className="h-8 px-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* EXECUTIVE KPI SUMMARY CARDS (Profit, Loss, Revenue, Cargo, Weight) */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: NET PROFIT / LOSS */}
          <Card className={`border shadow-sm rounded-2xl overflow-hidden transition-all relative ${
            metrics.netProfit >= 0
              ? "bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 border-emerald-500/40"
              : "bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-950 border-rose-500/40"
          }`}>
            <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Net Profit / Loss (سود/زیان خالص)
              </span>
              <div className={`p-2 rounded-xl ${
                metrics.netProfit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}>
                {metrics.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  metrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {metrics.netProfit >= 0 ? "+" : ""}${Math.abs(metrics.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 font-bold">USD</span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">Profit Margin:</span>
                <Badge className={`${
                  metrics.netProfit >= 0
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}>
                  {metrics.profitMargin.toFixed(1)}% Margin
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: GROSS REVENUE */}
          <Card className="bg-slate-900 border-blue-500/30 shadow-sm rounded-2xl overflow-hidden relative">
            <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Gross Revenue (مجموع عواید)
              </span>
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight">
                  ${metrics.totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 font-bold">USD</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Ledger Invoiced:</span>
                <span className="text-slate-200">${metrics.totalLedgerDebit.toLocaleString('en-US')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: OPERATIONAL EXPENSES */}
          <Card className="bg-slate-900 border-amber-500/30 shadow-sm rounded-2xl overflow-hidden relative">
            <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Total Expenses &amp; Freight (مصارف)
              </span>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Truck className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  ${metrics.totalOperationalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 font-bold">USD</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Driver Rents:</span>
                <span className="text-slate-200">${metrics.totalDriverCost.toLocaleString('en-US')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: CARGO VOLUME & PACKAGES */}
          <Card className="bg-slate-900 border-cyan-500/30 shadow-sm rounded-2xl overflow-hidden relative">
            <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Total Cargo Volume (محموله‌ها)
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Boxes className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight">
                  {metrics.totalPackages.toLocaleString('en-US')}
                </span>
                <span className="text-xs text-slate-400 font-bold">CTNS / Packages</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Net Weight:</span>
                <span className="text-slate-200">
                  {metrics.totalNetWeightKg.toLocaleString('en-US')} KGS ({(metrics.totalNetWeightKg / 1000).toFixed(1)} MT)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* NAVIGATION SUB-TABS */}
        {/* =================================================================== */}
        <div className="flex items-center gap-1.5 p-1 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-x-auto no-scrollbar no-print">
          <button
            onClick={() => setActiveTab("pnl")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "pnl"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Profit &amp; Loss Statement (سود و زیان)</span>
          </button>

          <button
            onClick={() => setActiveTab("shipments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "shipments"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Shipments &amp; Cargo Analytics ({filteredBOLs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("balances")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "balances"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Company Balances &amp; Receivables</span>
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "expenses"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Custom Expenses &amp; Incomes ({filteredExpenses.length})</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: PROFIT & LOSS STATEMENT (P&L) */}
        {/* =================================================================== */}
        {activeTab === "pnl" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Detailed P&L Breakdown Table */}
              <div className="lg:col-span-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-blue-950 dark:text-white">
                      Comprehensive Statement of Profit &amp; Loss
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Sky Ariana Limited • Detailed breakdown of operating revenues and logistics costs
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 font-mono">
                    P&amp;L Pro
                  </Badge>
                </div>

                <div className="space-y-3 font-sans">
                  {/* REVENUE SECTION */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg">
                      <span>1. OPERATING REVENUES / عواید عملیاتی</span>
                      <span>AMOUNT (USD)</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                      <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300">Client Freight Billed (Ledger Debits)</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">${metrics.totalLedgerDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300">Additional Logistics &amp; Customs Revenue</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">${metrics.customRevenueSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-blue-50/40 dark:bg-blue-950/20 font-black text-blue-950 dark:text-blue-300">
                        <span>TOTAL GROSS REVENUE (مجموع عواید)</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">${metrics.totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* COST OF OPERATIONS SECTION */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg">
                      <span>2. DIRECT LOGISTICS &amp; FREIGHT COSTS / مصارف مستقیم ترانزیت</span>
                      <span>AMOUNT (USD)</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                      <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300">Driver Freights &amp; Truck Rents (کرایه موترها)</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">${metrics.totalDriverCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="text-slate-700 dark:text-slate-300">Border Transit, Port Clearance &amp; OPEX</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">${metrics.customExpenseSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-amber-50/40 dark:bg-amber-950/20 font-black text-amber-950 dark:text-amber-300">
                        <span>TOTAL OPERATING COSTS (مجموع مصارف)</span>
                        <span className="text-sm text-amber-600 dark:text-amber-400">${metrics.totalOperationalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* NET PROFIT / LOSS SUMMARY */}
                  <div className={`p-4 rounded-xl border mt-3 flex items-center justify-between ${
                    metrics.netProfit >= 0
                      ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                      : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 text-rose-950 dark:text-rose-200"
                  }`}>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Final Balance Result (نتیجه نهایی)
                      </div>
                      <div className="text-base sm:text-lg font-black mt-0.5">
                        {metrics.netProfit >= 0 ? "NET OPERATING PROFIT (سود خالص عملیاتی)" : "NET OPERATING LOSS (زیان خالص عملیاتی)"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl sm:text-2xl font-black ${
                        metrics.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {metrics.netProfit >= 0 ? "+" : ""}${metrics.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        Margin: {metrics.profitMargin.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Card: Commodity & Logistics Breakdown */}
              <div className="space-y-5">
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-blue-500" />
                      <span>Top Cargo Commodities</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-bold">By Weight</span>
                  </div>

                  <div className="space-y-3">
                    {commodityRanking.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-4">No cargo data found</div>
                    ) : (
                      commodityRanking.map((c, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="truncate max-w-[170px] text-slate-800 dark:text-slate-200">
                              {idx + 1}. {c.name}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {c.weight.toLocaleString('en-US')} KG ({c.pkgs} CTN)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(10, (c.weight / (metrics.totalNetWeightKg || 1)) * 100))}%`
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Top Shipper Volume Card */}
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span>Top Shippers by Cartons</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-bold">Volume</span>
                  </div>

                  <div className="space-y-2.5">
                    {topShippersRanking.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-4">No shipper data found</div>
                    ) : (
                      topShippersRanking.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{s.count} Shipments • {s.weight.toLocaleString('en-US')} KG</div>
                          </div>
                          <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold text-[11px] shrink-0">
                            {s.pkgs.toLocaleString('en-US')} CTNS
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SHIPMENTS & CARGO VOLUME REPORT */}
        {/* =================================================================== */}
        {activeTab === "shipments" && (
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-blue-950 dark:text-white">
                  Active Bill of Lading &amp; Cargo Records
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Showing {filteredBOLs.length} verified freight documents
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-mono self-start sm:self-auto">
                {metrics.totalPackages.toLocaleString('en-US')} Total Cartons
              </Badge>
            </div>

            {/* Shipments Table */}
            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">B/L Number</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Shipper / Exporter</th>
                    <th className="p-3">Consignee / Importer</th>
                    <th className="p-3">Commodity &amp; Packages</th>
                    <th className="p-3 text-right">Net WT (KG)</th>
                    <th className="p-3 text-right">Gross WT (KG)</th>
                    <th className="p-3 text-right">Cargo Value</th>
                    <th className="p-3 text-right">Driver Rent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredBOLs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        No shipments matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBOLs.map((d, idx) => (
                      <tr key={d.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {d.bol_number || "NO-BL-NO"}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {d.issue_date || "-"}
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                          {d.shipper_name || "-"}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[180px] truncate">
                          {d.consignee_name || "-"}
                        </td>
                        <td className="p-3 max-w-[220px]">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {d.goods_description || d.cargo_description || "Produce"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {d.number_of_packages || "0 CTNS"}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          {d.net_weight || "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">
                          {d.gross_weight || "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {d.goods_value ? `$${d.goods_value}` : "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {d.driver_rent ? `$${d.driver_rent}` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: SHIPPERS & CONSIGNEES FINANCIAL BALANCES */}
        {/* =================================================================== */}
        {activeTab === "balances" && (
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-blue-950 dark:text-white">
                  Accounts Receivable &amp; Client Ledger Balances
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Statement of outstanding client debts, billing debits and received credits
                </p>
              </div>
              <Badge className="bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 font-mono self-start sm:self-auto">
                Total Receivables: ${metrics.totalOutstandingBalance.toLocaleString('en-US')} USD
              </Badge>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Transport Company</th>
                    <th className="p-3 text-center">Entries</th>
                    <th className="p-3 text-right">Total Invoiced (Debits)</th>
                    <th className="p-3 text-right">Total Paid (Credits)</th>
                    <th className="p-3 text-right">Current Balance Due</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {companyBalanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No account ledgers found.
                      </td>
                    </tr>
                  ) : (
                    companyBalanceRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          {r.accountName}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {r.companyName}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {r.entriesCount}
                        </td>
                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          ${r.totalBilled.toLocaleString('en-US')}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ${r.totalReceived.toLocaleString('en-US')}
                        </td>
                        <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">
                          ${r.balance.toLocaleString('en-US')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${
                            r.status === "Settled"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                          } font-bold text-[10px]`}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center no-print">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView('accounts')}
                            className="h-7 px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            Open Ledger
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CUSTOM EXPENSES & REVENUES MANAGER */}
        {/* =================================================================== */}
        {activeTab === "expenses" && (
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-blue-950 dark:text-white">
                  Custom Operational Expenses &amp; Direct Logistics Incomes
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Track custom expenses (border fees, port handling, driver rents, customs) directly integrated into P&amp;L
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddExpenseOpen(true)}
                className="gap-1.5 h-8.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Record</span>
              </Button>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Title / Description</th>
                    <th className="p-3">Ref # / Shipper</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3 text-right">Amount (USD)</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No custom expenses logged. Click "Add Record" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{e.date}</td>
                        <td className="p-3">
                          <Badge className={`${
                            e.type === "expense"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                          } font-bold text-[9.5px] uppercase`}>
                            {e.type}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{e.category}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{e.title}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {e.refNumber || e.shipperName || "-"}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{e.paymentMethod}</td>
                        <td className={`p-3 text-right font-black text-sm ${
                          e.type === "expense" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {e.type === "expense" ? "-" : "+"}${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center no-print">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(e.id)}
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* =================================================================== */}
      {/* MODAL: ADD EXPENSE / INCOME */}
      {/* =================================================================== */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Log Financial Entry / ثبت هزینه یا عاید</span>
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-xs font-semibold">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewExpType("expense")}
                  className={`py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    newExpType === "expense"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  📉 Operational Expense (مصرف)
                </button>
                <button
                  type="button"
                  onClick={() => setNewExpType("revenue")}
                  className={`py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    newExpType === "revenue"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  📈 Logistics Revenue (عاید)
                </button>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-500 uppercase">Title / عنوان مصرف یا عاید *</label>
                <Input
                  required
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder="e.g. Border Transit Clearance Nimroz, Driver Fuel..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-500 uppercase">Category / دسته‌بندی</label>
                  <select
                    value={newExpCategory}
                    onChange={(e: any) => setNewExpCategory(e.target.value)}
                    className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    {DEFAULT_EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-500 uppercase">Amount ($ USD) / مبلغ *</label>
                  <Input
                    required
                    type="number"
                    step="any"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-9 text-xs rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-500 uppercase">Date / تاریخ</label>
                  <Input
                    type="text"
                    value={newExpDate}
                    onChange={(e) => setNewExpDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-500 uppercase">Payment Method</label>
                  <select
                    value={newExpPayMethod}
                    onChange={(e: any) => setNewExpPayMethod(e.target.value)}
                    className="h-9 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="Cash">Cash (نقد)</option>
                    <option value="Bank Transfer">Bank Transfer (بانک)</option>
                    <option value="Hawala">Hawala (حواله صرافی)</option>
                    <option value="Pending">Pending (باقی)</option>
                  </select>
                </div>
              </div>

              {/* Ref & Shipper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-500 uppercase">Ref # (BOL / Invoice)</label>
                  <Input
                    value={newExpRef}
                    onChange={(e) => setNewExpRef(e.target.value)}
                    placeholder="e.g. TC-975, BL-02230"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-500 uppercase">Shipper / Client Name</label>
                  <Input
                    value={newExpShipper}
                    onChange={(e) => setNewExpShipper(e.target.value)}
                    placeholder="e.g. NAJEB AMIN LTD"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="rounded-xl h-9 font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="rounded-xl h-9 font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRINT-ONLY OFFICIAL A4 EXECUTIVE REPORT LAYOUT */}
      {/* =================================================================== */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">SKY ARIANA LIMITED</h1>
            <p className="text-xs font-bold text-slate-600">International Transport, Customs Clearance &amp; Freight Logistics</p>
            <p className="text-[10px] text-slate-500">Kandahar / Nimroz / Kabul Afghanistan • Tel: +93 700 9393 65 / +93 711 4355 29</p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black uppercase text-blue-900">Executive P&amp;L &amp; Operations Report</h2>
            <p className="text-[10px] font-mono text-slate-600">Generated: {new Date().toLocaleString()}</p>
            <p className="text-[10px] text-slate-600">Shipper: {selectedShipper} | Consignee: {selectedConsignee}</p>
          </div>
        </div>

        {/* Executive Numbers Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4 text-center">
          <div className="border border-slate-400 p-2 rounded">
            <div className="text-[9px] font-bold uppercase text-slate-600">Gross Revenue</div>
            <div className="text-sm font-black text-blue-900">${metrics.totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="border border-slate-400 p-2 rounded">
            <div className="text-[9px] font-bold uppercase text-slate-600">Total Costs</div>
            <div className="text-sm font-black text-amber-900">${metrics.totalOperationalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="border border-slate-900 bg-slate-100 p-2 rounded">
            <div className="text-[9px] font-black uppercase text-slate-900">Net Profit / Loss</div>
            <div className="text-sm font-black text-emerald-900">${metrics.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({metrics.profitMargin.toFixed(1)}%)</div>
          </div>
          <div className="border border-slate-400 p-2 rounded">
            <div className="text-[9px] font-bold uppercase text-slate-600">Cargo Cartons</div>
            <div className="text-sm font-black text-slate-900">{metrics.totalPackages.toLocaleString('en-US')} CTNS ({(metrics.totalNetWeightKg / 1000).toFixed(1)} MT)</div>
          </div>
        </div>

        {/* Financial Summary Table */}
        <table className="w-full text-xs border-collapse border border-slate-400 mb-6">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-400 p-1.5 text-left">P&amp;L Financial Item</th>
              <th className="border border-slate-400 p-1.5 text-right">Amount (USD)</th>
              <th className="border border-slate-400 p-1.5 text-left">Notes / Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold">1. Freight Billed to Clients (Ledger Debits)</td>
              <td className="border border-slate-400 p-1.5 text-right font-bold">${metrics.totalLedgerDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="border border-slate-400 p-1.5 text-slate-600">Total verified client freight charges</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold">2. Additional Logistics Incomes</td>
              <td className="border border-slate-400 p-1.5 text-right font-bold">${metrics.customRevenueSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="border border-slate-400 p-1.5 text-slate-600">Customs, documentation &amp; transit services</td>
            </tr>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400 p-1.5">TOTAL OPERATING REVENUE</td>
              <td className="border border-slate-400 p-1.5 text-right text-blue-900">${metrics.totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="border border-slate-400 p-1.5">Gross Inflow</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold">3. Driver Freights &amp; Truck Rents</td>
              <td className="border border-slate-400 p-1.5 text-right font-bold text-amber-900">${metrics.totalDriverCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="border border-slate-400 p-1.5 text-slate-600">Total verified driver freight payouts</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold">4. Border, Port Clearance &amp; Administrative OPEX</td>
              <td className="border border-slate-400 p-1.5 text-right font-bold text-amber-900">${metrics.customExpenseSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="border border-slate-400 p-1.5 text-slate-600">Customs, waybills &amp; terminal handling</td>
            </tr>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400 p-1.5">TOTAL OPERATIONAL EXPENSES</td>
              <td className="border border-slate-400 p-1.5 text-right text-amber-900">${metrics.totalOperationalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="border border-slate-400 p-1.5">Direct Outflows</td>
            </tr>
            <tr className="bg-slate-300 font-black">
              <td className="border border-slate-400 p-2">NET OPERATING PROFIT / (LOSS)</td>
              <td className="border border-slate-400 p-2 text-right text-base text-slate-950">${metrics.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</td>
              <td className="border border-slate-400 p-2">Margin: {metrics.profitMargin.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures & Stamp Box */}
        <div className="flex justify-between items-end pt-12 text-xs border-t border-slate-400">
          <div className="text-center w-48">
            <div className="border-b border-slate-600 pb-8"></div>
            <div className="font-bold mt-1">Prepared By: Finance Dept</div>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-600 pb-8"></div>
            <div className="font-bold mt-1">Authorized Audit Stamp</div>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-600 pb-8"></div>
            <div className="font-bold mt-1">Director Signature</div>
          </div>
        </div>
      </div>
    </div>
  )
}
