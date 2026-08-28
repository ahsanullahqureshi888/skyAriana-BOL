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
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  X,
  Edit2,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Container,
  Compass,
  Ship,
  Globe2,
  PackageCheck,
  Check
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
  containerNo?: string
  paymentMethod: "Cash" | "Bank Transfer" | "Hawala" | "Pending"
  notes?: string
  createdAt: string
}

export interface ContainerFreightRecord {
  id: string
  source: 'ledger' | 'bol'
  bolNumber: string
  invoiceNumber: string
  date: string
  shipperName: string
  consigneeName: string
  containerNo: string
  containerSize: '20FT' | '40FT' | '40HQ' | '40RF' | 'Other'
  direction: 'Export' | 'Import' | 'Transit'
  origin: string
  destination: string
  goodsDescription: string
  packagesCount: number
  netWeightKg: number
  grossWeightKg: number
  freightRevenue: number      // Invoiced Client Freight ($)
  shippingCost: number        // Ocean Line / Road Freight Cost ($)
  driverCost: number          // Truck Driver Rent ($)
  handlingCost: number        // Border Transit & Port Handling ($)
  totalCost: number           // Direct Logistics Outflow ($)
  netProfit: number           // freightRevenue - totalCost
  profitMargin: number        // (netProfit / freightRevenue) * 100
  status: 'Profitable' | 'Break-Even' | 'Loss'
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
    containerNo: "MYRU450180-0",
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
    containerNo: "TRIU8065361",
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
    containerNo: "HLXU870056-9",
    paymentMethod: "Cash",
    notes: "Route Kandahar to Bandar Abbas",
    createdAt: new Date().toISOString()
  }
]

export function ReportsView() {
  const { accounts, setView } = useApp()

  // Navigation Sub-Tab State
  const [activeTab, setActiveTab] = useState<"pnl" | "containers" | "trade" | "shipments" | "balances" | "expenses">("containers")
  
  // Direction Filter: All, Export (صادرات), Import (واردات), Transit (ترانزیت)
  const [directionFilter, setDirectionFilter] = useState<"all" | "Export" | "Import" | "Transit">("all")
  
  // Container Size Filter: All, 20FT, 40FT, 40HQ
  const [sizeFilter, setSizeFilter] = useState<"all" | "20FT" | "40FT" | "40HQ">("all")

  // Date Filter & Selection
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "last_month" | "year">("all")
  const [selectedShipper, setSelectedShipper] = useState<string>("all")
  const [selectedConsignee, setSelectedConsignee] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Mobile Card Expansion State
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  
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
  const [newExpContainer, setNewExpContainer] = useState("")
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
      containerNo: newExpContainer.trim() || undefined,
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
    setNewExpContainer("")
    setNewExpNotes("")
  }

  const handleDeleteExpense = (id: string) => {
    if (!confirm("Are you sure you want to delete this financial record?")) return
    const updated = customExpenses.filter(e => e.id !== id)
    saveExpensesList(updated)
    toast.success("Record removed")
  }

  // =========================================================================
  // NORMALIZE & EXTRACT ALL CONTAINER FREIGHT SHIPMENT RECORDS
  // =========================================================================
  const allContainerRecords: ContainerFreightRecord[] = useMemo(() => {
    const list: ContainerFreightRecord[] = []
    const seen = new Set<string>()

    // 1. Process Accounts & Ledger Entries
    accounts.forEach((acc, accIdx) => {
      acc.companies?.forEach((comp, compIdx) => {
        comp.ledgerEntries?.forEach((entry, entryIdx) => {
          // If it's a debit (freight billing) or has container/BL details
          if (!entry.debit && !entry.containerNo && !entry.billOfLanding) return

          const rawContainer = (entry.containerNo || "").trim()
          const rawBL = (entry.billOfLanding || `BL-ACC-${entry.id}`).trim()
          const rawQty = (entry.quantity || "").trim()
          const shipper = (entry.shipperDescription || acc.name).trim()
          const consignee = (entry.consignee || "Consignee").trim()

          // Parse Packages
          let pkgs = 0
          const pkgMatches = rawQty.match(/\d[\d,]*/g)
          if (pkgMatches) {
            pkgs = parseInt(pkgMatches[0].replace(/,/g, ""), 10) || 0
          }

          // Parse Weights
          let nw = 0
          const nwMatch = rawQty.match(/NW\s*([0-9,.]+)\s*KGS/i) || rawQty.match(/([0-9,.]+)\s*KGS/i)
          if (nwMatch) {
            nw = parseFloat(nwMatch[1].replace(/,/g, "")) || 0
          }
          if (nw === 0 && pkgs > 0) {
            nw = pkgs * 16 // Approximate 16kg standard dry fruit carton
          }
          const gw = nw * 1.06

          // Detect Container Size
          let size: ContainerFreightRecord['containerSize'] = '40FT'
          const cUpper = (rawContainer + ' ' + rawQty).toUpperCase()
          if (cUpper.includes('20') || cUpper.includes("20'")) {
            size = '20FT'
          } else if (cUpper.includes('40\'RF') || cUpper.includes('REEFER') || cUpper.includes('RH')) {
            size = '40RF'
          } else if (cUpper.includes('HC') || cUpper.includes('HQ') || cUpper.includes("40'HC")) {
            size = '40HQ'
          } else if (cUpper.includes('40') || cUpper.includes("40'")) {
            size = '40FT'
          } else {
            size = nw > 18000 ? '40HQ' : '20FT'
          }

          // Detect Trade Direction (Export vs Import vs Transit)
          let direction: ContainerFreightRecord['direction'] = 'Export'
          const lowerAll = (rawQty + ' ' + rawBL + ' ' + shipper + ' ' + consignee).toLowerCase()
          if (
            lowerAll.includes('import') ||
            lowerAll.includes('sugar') ||
            lowerAll.includes('machinery') ||
            lowerAll.includes('steel') ||
            lowerAll.includes('fertilizer') ||
            lowerAll.includes('oil')
          ) {
            direction = 'Import'
          } else if (lowerAll.includes('transit') || lowerAll.includes('t.t') || lowerAll.includes('transshipment')) {
            direction = 'Transit'
          } else {
            // Afghan Dry Figs, Raisins, Almonds to India/UAE/Chabahar are primary Exports
            direction = 'Export'
          }

          // Financial Metrics
          const revenue = entry.debit || 3200
          // Direct Line & Ocean Shipping Cost
          const shippingCost = size === '20FT' ? 950 : size === '40RF' ? 1850 : 1450
          // Trucking / Driver Rent
          const driverCost = size === '20FT' ? 650 : 850
          // Terminal Handling & Border Waybill
          const handlingCost = 280

          const totalCost = shippingCost + driverCost + handlingCost
          const netProfit = revenue - totalCost
          const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

          const uniqueKey = `${rawBL}-${rawContainer || entry.id}`
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey)
            list.push({
              id: `rec-ledg-${entry.id}`,
              source: 'ledger',
              bolNumber: rawBL,
              invoiceNumber: entry.invoiceNo || `INV-${entry.sNo}`,
              date: entry.date || entry.dateOfShip || '1404-09-10',
              shipperName: shipper,
              consigneeName: consignee,
              containerNo: rawContainer || `CTNR-${rawBL.slice(-6)}`,
              containerSize: size,
              direction,
              origin: direction === 'Export' ? 'Kandahar / Nimroz (AF)' : 'Nhava Sheva / Dubai',
              destination: direction === 'Export' ? 'Nhava Sheva / Mundra (IN)' : 'Kabul / Kandahar (AF)',
              goodsDescription: rawQty || 'Fresh Dry Fruit Cargo',
              packagesCount: pkgs || 1450,
              netWeightKg: nw || 21500,
              grossWeightKg: Math.round(gw || 22800),
              freightRevenue: revenue,
              shippingCost,
              driverCost,
              handlingCost,
              totalCost,
              netProfit,
              profitMargin,
              status: netProfit > 0 ? 'Profitable' : netProfit === 0 ? 'Break-Even' : 'Loss'
            })
          }
        })
      })
    })

    // 2. Process Saved BOL Documents
    bolDocs.forEach((doc, docIdx) => {
      const rawBL = (doc.bol_number || `BOL-${doc.id || docIdx}`).trim()
      const rawContainer = (doc.container_numbers || doc.container_no || "").trim()
      const shipper = (doc.shipper_name || "Ex-Shipper").trim()
      const consignee = (doc.consignee_name || "Ex-Consignee").trim()
      const pol = (doc.port_of_loading || doc.place_of_receipt || "").trim()
      const pod = (doc.port_of_discharge || doc.place_of_delivery || "").trim()
      const desc = (doc.goods_description || doc.cargo_description || "").trim()

      // Parse Packages & Weights
      let pkgs = 0
      const pMatch = (doc.number_of_packages || "").match(/\d[\d,]*/g)
      if (pMatch) pkgs = parseInt(pMatch[0].replace(/,/g, ""), 10) || 0

      let nw = 0
      const nwMatch = (doc.net_weight || "").match(/\d[\d,\.]*/g)
      if (nwMatch) nw = parseFloat(nwMatch[0].replace(/,/g, "")) || 0

      let gw = 0
      const gwMatch = (doc.gross_weight || "").match(/\d[\d,\.]*/g)
      if (gwMatch) gw = parseFloat(gwMatch[0].replace(/,/g, "")) || 0

      // Detect Container Size
      let size: ContainerFreightRecord['containerSize'] = '40FT'
      const cUpper = (rawContainer + ' ' + (doc.container_size || '') + ' ' + desc).toUpperCase()
      if (cUpper.includes('20') || cUpper.includes("20'")) {
        size = '20FT'
      } else if (cUpper.includes('40\'RF') || cUpper.includes('REEFER') || cUpper.includes('RH')) {
        size = '40RF'
      } else if (cUpper.includes('HC') || cUpper.includes('HQ') || cUpper.includes("40'HC")) {
        size = '40HQ'
      }

      // Direction
      let direction: ContainerFreightRecord['direction'] = 'Export'
      const polLower = pol.toLowerCase()
      const podLower = pod.toLowerCase()
      if (
        polLower.includes('india') ||
        polLower.includes('nhava') ||
        polLower.includes('mundra') ||
        polLower.includes('china') ||
        polLower.includes('jebel') ||
        podLower.includes('kabul') ||
        podLower.includes('kandahar') ||
        podLower.includes('afghanistan')
      ) {
        direction = 'Import'
      } else if (polLower.includes('transit') || podLower.includes('transit')) {
        direction = 'Transit'
      } else {
        direction = 'Export'
      }

      // Financials
      let revenue = 0
      const revMatch = (doc.freight_amount || doc.goods_value || "").match(/\d[\d,\.]*/g)
      if (revMatch) revenue = parseFloat(revMatch[0].replace(/,/g, "")) || 0
      if (revenue === 0 || revenue > 50000) {
        revenue = size === '20FT' ? 2450 : 3400
      }

      let driverCost = 0
      const drMatch = (doc.driver_rent || "").match(/\d[\d,\.]*/g)
      if (drMatch) driverCost = parseFloat(drMatch[0].replace(/,/g, "")) || 0
      if (driverCost === 0) {
        driverCost = size === '20FT' ? 650 : 850
      }

      const shippingCost = size === '20FT' ? 950 : size === '40RF' ? 1850 : 1450
      const handlingCost = 280
      const totalCost = shippingCost + driverCost + handlingCost
      const netProfit = revenue - totalCost
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

      const uniqueKey = `${rawBL}-${rawContainer || doc.id}`
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey)
        list.push({
          id: `rec-bol-${doc.id || docIdx}`,
          source: 'bol',
          bolNumber: rawBL,
          invoiceNumber: doc.invoice_no || `INV-${docIdx + 1}`,
          date: doc.issue_date || '1404-09-15',
          shipperName: shipper,
          consigneeName: consignee,
          containerNo: rawContainer || `CTNR-${rawBL.slice(-6)}`,
          containerSize: size,
          direction,
          origin: pol || (direction === 'Export' ? 'Kandahar (AF)' : 'Nhava Sheva (IN)'),
          destination: pod || (direction === 'Export' ? 'Nhava Sheva / JNPT (IN)' : 'Kabul (AF)'),
          goodsDescription: desc || 'Dry Fruits & Agricultural Produce',
          packagesCount: pkgs || 1200,
          netWeightKg: nw || 19500,
          grossWeightKg: Math.round(gw || (nw ? nw * 1.06 : 20800)),
          freightRevenue: revenue,
          shippingCost,
          driverCost,
          handlingCost,
          totalCost,
          netProfit,
          profitMargin,
          status: netProfit > 0 ? 'Profitable' : netProfit === 0 ? 'Break-Even' : 'Loss'
        })
      }
    })

    return list
  }, [accounts, bolDocs])

  // Unique Lists of Shippers and Consignees for filters
  const { allShippers, allConsignees } = useMemo(() => {
    const shippers = new Set<string>()
    const consignees = new Set<string>()

    allContainerRecords.forEach(r => {
      if (r.shipperName) shippers.add(r.shipperName)
      if (r.consigneeName) consignees.add(r.consigneeName)
    })

    return {
      allShippers: Array.from(shippers).sort(),
      allConsignees: Array.from(consignees).sort()
    }
  }, [allContainerRecords])

  // Filtered Container Freight Records
  const filteredContainers = useMemo(() => {
    return allContainerRecords.filter(r => {
      // Direction Filter
      if (directionFilter !== "all" && r.direction !== directionFilter) {
        return false
      }
      // Size Filter
      if (sizeFilter !== "all" && r.containerSize !== sizeFilter) {
        return false
      }
      // Shipper Filter
      if (selectedShipper !== "all" && !r.shipperName.toLowerCase().includes(selectedShipper.toLowerCase())) {
        return false
      }
      // Consignee Filter
      if (selectedConsignee !== "all" && !r.consigneeName.toLowerCase().includes(selectedConsignee.toLowerCase())) {
        return false
      }
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          r.containerNo.toLowerCase().includes(q) ||
          r.bolNumber.toLowerCase().includes(q) ||
          r.shipperName.toLowerCase().includes(q) ||
          r.consigneeName.toLowerCase().includes(q) ||
          r.goodsDescription.toLowerCase().includes(q) ||
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [allContainerRecords, directionFilter, sizeFilter, selectedShipper, selectedConsignee, searchQuery])

  // Aggregate Metrics & Key Performance Indicators (KPIs)
  const containerMetrics = useMemo(() => {
    let totalContainers = 0
    let total20ft = 0
    let total40ft = 0
    let total40hq = 0
    let total40rf = 0

    let exportCount = 0
    let exportRevenue = 0
    let exportCost = 0
    let exportProfit = 0
    let exportWeightKg = 0
    let exportPkgs = 0

    let importCount = 0
    let importRevenue = 0
    let importCost = 0
    let importProfit = 0
    let importWeightKg = 0
    let importPkgs = 0

    let transitCount = 0
    let transitRevenue = 0
    let transitCost = 0
    let transitProfit = 0

    let totalGrossRevenue = 0
    let totalDirectCost = 0
    let totalNetProfit = 0
    let totalNetWeightKg = 0
    let totalGrossWeightKg = 0
    let totalPackages = 0

    filteredContainers.forEach(r => {
      totalContainers += 1
      totalGrossRevenue += r.freightRevenue
      totalDirectCost += r.totalCost
      totalNetProfit += r.netProfit
      totalNetWeightKg += r.netWeightKg
      totalGrossWeightKg += r.grossWeightKg
      totalPackages += r.packagesCount

      // Sizes
      if (r.containerSize === '20FT') total20ft += 1
      else if (r.containerSize === '40HQ') total40hq += 1
      else if (r.containerSize === '40RF') total40rf += 1
      else total40ft += 1

      // Directions
      if (r.direction === 'Export') {
        exportCount += 1
        exportRevenue += r.freightRevenue
        exportCost += r.totalCost
        exportProfit += r.netProfit
        exportWeightKg += r.grossWeightKg
        exportPkgs += r.packagesCount
      } else if (r.direction === 'Import') {
        importCount += 1
        importRevenue += r.freightRevenue
        importCost += r.totalCost
        importProfit += r.netProfit
        importWeightKg += r.grossWeightKg
        importPkgs += r.packagesCount
      } else {
        transitCount += 1
        transitRevenue += r.freightRevenue
        transitCost += r.totalCost
        transitProfit += r.netProfit
      }
    })

    // Custom Expenses summation
    let customExpenseSum = 0
    let customRevenueSum = 0
    customExpenses.forEach(e => {
      if (e.type === 'expense') customExpenseSum += e.amount || 0
      else customRevenueSum += e.amount || 0
    })

    const finalOperatingProfit = totalNetProfit + customRevenueSum - customExpenseSum
    const overallMargin = totalGrossRevenue > 0 ? (totalNetProfit / totalGrossRevenue) * 100 : 0
    const avgProfitPerContainer = totalContainers > 0 ? Math.round(totalNetProfit / totalContainers) : 0
    const avgRevenuePerContainer = totalContainers > 0 ? Math.round(totalGrossRevenue / totalContainers) : 0

    return {
      totalContainers,
      total20ft,
      total40ft,
      total40hq,
      total40rf,
      totalTEU: total20ft + (total40ft + total40hq + total40rf) * 2,
      exportCount,
      exportRevenue,
      exportCost,
      exportProfit,
      exportWeightKg,
      exportPkgs,
      exportMargin: exportRevenue > 0 ? (exportProfit / exportRevenue) * 100 : 0,
      avgExportProfitPerBox: exportCount > 0 ? Math.round(exportProfit / exportCount) : 0,
      importCount,
      importRevenue,
      importCost,
      importProfit,
      importWeightKg,
      importPkgs,
      importMargin: importRevenue > 0 ? (importProfit / importRevenue) * 100 : 0,
      avgImportProfitPerBox: importCount > 0 ? Math.round(importProfit / importCount) : 0,
      transitCount,
      transitRevenue,
      transitCost,
      transitProfit,
      totalGrossRevenue,
      totalDirectCost,
      totalNetProfit,
      finalOperatingProfit,
      overallMargin,
      avgProfitPerContainer,
      avgRevenuePerContainer,
      totalNetWeightKg,
      totalGrossWeightKg,
      totalPackages,
      customExpenseSum,
      customRevenueSum
    }
  }, [filteredContainers, customExpenses])

  // Commodity Breakdown by Direction (Top Export vs Top Import Goods)
  const tradeCommodities = useMemo(() => {
    const exportsMap = new Map<string, { count: number; pkgs: number; weight: number }>()
    const importsMap = new Map<string, { count: number; pkgs: number; weight: number }>()

    filteredContainers.forEach(r => {
      const desc = r.goodsDescription.split(/[,|\n]/)[0].trim().toUpperCase() || "GENERAL CARGO"
      const targetMap = r.direction === 'Import' ? importsMap : exportsMap
      const cur = targetMap.get(desc) || { count: 0, pkgs: 0, weight: 0 }
      targetMap.set(desc, {
        count: cur.count + 1,
        pkgs: cur.pkgs + r.packagesCount,
        weight: cur.weight + r.grossWeightKg
      })
    })

    const topExports = Array.from(exportsMap.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)

    const topImports = Array.from(importsMap.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)

    return { topExports, topImports }
  }, [filteredContainers])

  // Export to Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      // 1. Container P&L Worksheet
      const containerRows = filteredContainers.map(r => ({
        "Container #": r.containerNo,
        "Size": r.containerSize,
        "Trade Direction": r.direction,
        "B/L Number": r.bolNumber,
        "Invoice #": r.invoiceNumber,
        "Date": r.date,
        "Shipper": r.shipperName,
        "Consignee": r.consigneeName,
        "Route Origin": r.origin,
        "Destination": r.destination,
        "Commodity": r.goodsDescription,
        "Packages (CTN)": r.packagesCount,
        "Net Weight (KG)": r.netWeightKg,
        "Gross Weight (KG)": r.grossWeightKg,
        "Freight Invoiced ($)": r.freightRevenue,
        "Ocean / Shipping Line Cost ($)": r.shippingCost,
        "Truck Driver Rent ($)": r.driverCost,
        "Border & Port Handling ($)": r.handlingCost,
        "Total Direct Cost ($)": r.totalCost,
        "Net Freight Profit ($)": r.netProfit,
        "Margin (%)": `${r.profitMargin.toFixed(2)}%`,
        "P&L Status": r.status
      }))
      const wsContainers = XLSX.utils.json_to_sheet(containerRows)
      XLSX.utils.book_append_sheet(wb, wsContainers, "Container P&L")

      // 2. Executive Trade Summary Worksheet
      const summaryData = [
        ["SKY ARIANA LIMITED - EXECUTIVE CONTAINER & TRADE REPORT"],
        ["Report Date", new Date().toLocaleString()],
        ["Direction Filter", directionFilter],
        [],
        ["METRIC", "TOTAL", "EXPORT (صادرات)", "IMPORT (واردات)", "TRANSIT (ترانزیت)"],
        ["Container Count", containerMetrics.totalContainers, containerMetrics.exportCount, containerMetrics.importCount, containerMetrics.transitCount],
        ["Total TEU", containerMetrics.totalTEU, containerMetrics.exportCount * 2, containerMetrics.importCount * 2, containerMetrics.transitCount * 2],
        ["Gross Weight (MT)", (containerMetrics.totalGrossWeightKg / 1000).toFixed(1), (containerMetrics.exportWeightKg / 1000).toFixed(1), (containerMetrics.importWeightKg / 1000).toFixed(1), "-"],
        ["Total Freight Revenue ($)", containerMetrics.totalGrossRevenue, containerMetrics.exportRevenue, containerMetrics.importRevenue, containerMetrics.transitRevenue],
        ["Total Direct Costs ($)", containerMetrics.totalDirectCost, containerMetrics.exportCost, containerMetrics.importCost, containerMetrics.transitCost],
        ["Net Freight Profit ($)", containerMetrics.totalNetProfit, containerMetrics.exportProfit, containerMetrics.importProfit, containerMetrics.transitProfit],
        ["Freight Margin (%)", `${containerMetrics.overallMargin.toFixed(2)}%`, `${containerMetrics.exportMargin.toFixed(2)}%`, `${containerMetrics.importMargin.toFixed(2)}%`, "-"],
        ["Avg Profit / Container ($)", containerMetrics.avgProfitPerContainer, containerMetrics.avgExportProfitPerBox, containerMetrics.avgImportProfitPerBox, "-"]
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, wsSummary, "Trade Summary")

      XLSX.writeFile(wb, `SkyAriana_Container_Freight_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success("Container Excel report exported successfully!")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export Excel report")
    }
  }

  // Print Official A4 Report
  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2.5 sm:p-4 md:p-6 font-sans">
      <div className="max-w-[1780px] w-full mx-auto space-y-4 sm:space-y-6">

        {/* =================================================================== */}
        {/* TOP CONTROLS & HEADER BANNER */}
        {/* =================================================================== */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Container className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white">
                  Container Analytics &amp; Freight Profit/Loss
                </h1>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold text-[10px] sm:text-xs">
                  گزارش کانتینرها، صادرات/واردات و سود کرایه‌ها
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                Detailed Export vs. Import Analysis, Container TEU Tonnage &amp; Per-Box Freight Profit
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (Optimized for Mobile & Desktop) */}
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold bg-emerald-950/40 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Expense / Log</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold bg-blue-950/40 text-blue-300 border-blue-700 hover:bg-blue-900/60 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Excel</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrintReport}
              className="gap-1.5 h-9 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700 shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </Button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* DIRECTION TOGGLE CHIPS & FILTERS TOOLBAR (Mobile Swipeable) */}
        {/* =================================================================== */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 no-print">
          
          {/* Trade Direction Selector Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setDirectionFilter("all")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  directionFilter === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>All Trade ({allContainerRecords.length})</span>
              </button>

              <button
                onClick={() => setDirectionFilter("Export")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  directionFilter === "Export"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                <span>Export / صادرات ({allContainerRecords.filter(r => r.direction === 'Export').length})</span>
              </button>

              <button
                onClick={() => setDirectionFilter("Import")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  directionFilter === "Import"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/25"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-amber-300" />
                <span>Import / واردات ({allContainerRecords.filter(r => r.direction === 'Import').length})</span>
              </button>

              <button
                onClick={() => setDirectionFilter("Transit")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  directionFilter === "Transit"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-purple-300" />
                <span>Transit / ترانزیت ({allContainerRecords.filter(r => r.direction === 'Transit').length})</span>
              </button>
            </div>

            {/* Container Size Quick Filter */}
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
              <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Size:</span>
              {(['all', '20FT', '40FT', '40HQ'] as const).map(sz => (
                <button
                  key={sz}
                  onClick={() => setSizeFilter(sz)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sizeFilter === sz
                      ? "bg-slate-700 text-white border border-slate-600"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {sz.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Search, Shipper & Consignee Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-800">
            {/* Live Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Container #, B/L #, Shipper, Cargo..."
                className="h-9 pl-9 text-xs rounded-xl bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Shipper Selector */}
            <select
              value={selectedShipper}
              onChange={(e) => setSelectedShipper(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 text-xs font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🏢 All Shippers / تمام شرکت‌ها ({allShippers.length})</option>
              {allShippers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Consignee Selector */}
            <select
              value={selectedConsignee}
              onChange={(e) => setSelectedConsignee(e.target.value)}
              className="h-9 w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 text-xs font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📦 All Consignees / تمام گیرنده‌ها ({allConsignees.length})</option>
              {allConsignees.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Filter Summary / Reset */}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] text-slate-400 font-medium truncate">
                Showing <strong className="text-cyan-400">{filteredContainers.length}</strong> containers
              </span>
              {(directionFilter !== 'all' || sizeFilter !== 'all' || selectedShipper !== 'all' || selectedConsignee !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setDirectionFilter('all')
                    setSizeFilter('all')
                    setSelectedShipper('all')
                    setSelectedConsignee('all')
                    setSearchQuery('')
                  }}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* EXECUTIVE CONTAINER & FREIGHT KPI SUMMARY CARDS */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Card 1: TOTAL FREIGHT NET PROFIT */}
          <Card className={`border shadow-lg rounded-2xl overflow-hidden relative col-span-2 sm:col-span-1 ${
            containerMetrics.totalNetProfit >= 0
              ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40"
              : "bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40"
          }`}>
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                Container Freight Profit (سود کرایه‌ها)
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${
                containerMetrics.totalNetProfit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}>
                {containerMetrics.totalNetProfit >= 0 ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                  containerMetrics.totalNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  +${containerMetrics.totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold">USD</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className="text-slate-400">Avg / Container:</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  +${containerMetrics.avgProfitPerContainer} / Box
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: TOTAL CONTAINERS & TEU */}
          <Card className="bg-slate-900/90 border-cyan-500/30 shadow-lg rounded-2xl overflow-hidden relative">
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                Containers &amp; TEU (کانتینرها)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Container className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-400 tracking-tight">
                  {containerMetrics.totalContainers}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold">Boxes ({containerMetrics.totalTEU} TEU)</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400">
                <span>Sizes:</span>
                <span className="text-slate-200">
                  {containerMetrics.total40ft + containerMetrics.total40hq}x 40' • {containerMetrics.total20ft}x 20'
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: EXPORT VOLUME & VALUE */}
          <Card className="bg-slate-900/90 border-emerald-500/30 shadow-lg rounded-2xl overflow-hidden relative">
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                Total Export (صادرات افغانستان)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-400 tracking-tight">
                  {containerMetrics.exportCount}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold">Containers ({(containerMetrics.exportWeightKg / 1000).toFixed(1)} MT)</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400">
                <span>Export Revenue:</span>
                <span className="text-emerald-300">${containerMetrics.exportRevenue.toLocaleString('en-US')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: IMPORT VOLUME & VALUE */}
          <Card className="bg-slate-900/90 border-amber-500/30 shadow-lg rounded-2xl overflow-hidden relative">
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                Total Import (واردات)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-amber-400 tracking-tight">
                  {containerMetrics.importCount}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold">Containers ({(containerMetrics.importWeightKg / 1000).toFixed(1)} MT)</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-400">
                <span>Import Revenue:</span>
                <span className="text-amber-300">${containerMetrics.importRevenue.toLocaleString('en-US')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* SUB-TABS NAVIGATION (Responsive Swipeable Dock) */}
        {/* =================================================================== */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg overflow-x-auto no-scrollbar no-print">
          <button
            onClick={() => setActiveTab("containers")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "containers"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Container className="w-4 h-4" />
            <span>Container P&amp;L Manifest ({filteredContainers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("trade")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "trade"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>Export vs. Import Analysis (صادرات و واردات)</span>
          </button>

          <button
            onClick={() => setActiveTab("pnl")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "pnl"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Financial P&amp;L Statement</span>
          </button>

          <button
            onClick={() => setActiveTab("shipments")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "shipments"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Bill of Lading Documents</span>
          </button>

          <button
            onClick={() => setActiveTab("balances")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "balances"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Company Balances</span>
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "expenses"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expenses &amp; OPEX ({customExpenses.length})</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CONTAINER FREIGHT & PROFIT/LOSS MANIFEST (NEW CORE MODULE) */}
        {/* =================================================================== */}
        {activeTab === "containers" && (
          <div className="space-y-4">
            
            {/* Desktop Table View (Hidden on mobile < 768px) */}
            <div className="hidden md:block bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Container className="w-5 h-5 text-cyan-400" />
                    <span>Container Freight &amp; Direct Profit/Loss Statement</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold">
                    Freight billing revenue, carrier ocean freight, driver rent &amp; net operating profit per container box
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs">
                    Total Profit: +${containerMetrics.totalNetProfit.toLocaleString('en-US')} USD
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800/90 text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="p-3">Container #</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Direction</th>
                      <th className="p-3">B/L &amp; Shipper</th>
                      <th className="p-3">Cargo Commodity</th>
                      <th className="p-3 text-right">Packages / WT</th>
                      <th className="p-3 text-right text-blue-400">Freight Revenue</th>
                      <th className="p-3 text-right text-amber-400">Shipping Cost</th>
                      <th className="p-3 text-right text-emerald-400">Net Profit ($)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredContainers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-slate-400">
                          No containers matching the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredContainers.map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-cyan-400">
                            {r.containerNo}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-slate-800 text-slate-200 border-slate-700 font-mono text-[10px]">
                              {r.containerSize}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`${
                              r.direction === 'Export'
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                                : r.direction === 'Import'
                                ? "bg-amber-950/60 text-amber-300 border-amber-700"
                                : "bg-purple-950/60 text-purple-300 border-purple-700"
                            } font-bold text-[10px]`}>
                              {r.direction === 'Export' ? '↗ Export' : r.direction === 'Import' ? '↙ Import' : '↔ Transit'}
                            </Badge>
                          </td>
                          <td className="p-3 max-w-[200px]">
                            <div className="font-bold text-slate-100 truncate">{r.shipperName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.bolNumber}</div>
                          </td>
                          <td className="p-3 max-w-[180px] truncate text-slate-300">
                            {r.goodsDescription}
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-slate-200">{r.packagesCount} CTNS</div>
                            <div className="text-[10px] text-slate-400 font-mono">{(r.grossWeightKg / 1000).toFixed(1)} MT</div>
                          </td>
                          <td className="p-3 text-right font-black text-blue-400">
                            ${r.freightRevenue.toLocaleString('en-US')}
                          </td>
                          <td className="p-3 text-right font-bold text-amber-400">
                            ${r.totalCost.toLocaleString('en-US')}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-400 text-sm">
                            +${r.netProfit.toLocaleString('en-US')}
                            <span className="block text-[9.5px] font-bold text-emerald-500">{r.profitMargin.toFixed(1)}%</span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9.5px]">
                              Profitable
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (Optimized for Phones & Touch Screens) */}
            <div className="block md:hidden space-y-3">
              {filteredContainers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-900/90 rounded-2xl border border-slate-800">
                  No containers matching the selected filter criteria.
                </div>
              ) : (
                filteredContainers.map((r, idx) => {
                  const isExpanded = expandedCardId === r.id
                  return (
                    <div
                      key={r.id || idx}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3"
                    >
                      {/* Top Row: Container # + Direction Badge + Net Profit */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-cyan-400 text-sm">{r.containerNo}</span>
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9.5px] px-1.5 py-0 font-mono">
                              {r.containerSize}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-400 font-bold mt-0.5">{r.shipperName}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-black text-emerald-400">
                            +${r.netProfit.toLocaleString('en-US')}
                          </div>
                          <Badge className={`${
                            r.direction === 'Export'
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                              : r.direction === 'Import'
                              ? "bg-amber-950/60 text-amber-300 border-amber-700"
                              : "bg-purple-950/60 text-purple-300 border-purple-700"
                          } font-bold text-[9px] px-1.5 py-0`}>
                            {r.direction === 'Export' ? '↗ Export' : r.direction === 'Import' ? '↙ Import' : '↔ Transit'}
                          </Badge>
                        </div>
                      </div>

                      {/* Middle Row: Quick Stats (Revenue, Cost, Cargo) */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-800/60 rounded-xl text-center">
                        <div>
                          <div className="text-[9.5px] text-slate-400 font-bold uppercase">Freight Rev</div>
                          <div className="text-xs font-black text-blue-400">${r.freightRevenue.toLocaleString('en-US')}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] text-slate-400 font-bold uppercase">Total Cost</div>
                          <div className="text-xs font-black text-amber-400">${r.totalCost.toLocaleString('en-US')}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] text-slate-400 font-bold uppercase">Margin</div>
                          <div className="text-xs font-black text-emerald-400">{r.profitMargin.toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* Expandable Route & Cargo Details */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[220px]">
                          {r.packagesCount} CTNS • {r.goodsDescription}
                        </span>
                        <button
                          onClick={() => setExpandedCardId(isExpanded ? null : r.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300 animate-in fade-in">
                          <div className="flex justify-between">
                            <span className="text-slate-400">B/L Number:</span>
                            <span className="font-mono font-bold text-slate-100">{r.bolNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Consignee:</span>
                            <span className="font-bold text-slate-100">{r.consigneeName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Route Origin:</span>
                            <span className="text-slate-200">{r.origin}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Destination:</span>
                            <span className="text-slate-200">{r.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gross Weight:</span>
                            <span className="font-mono font-bold text-slate-200">{r.grossWeightKg.toLocaleString('en-US')} KGS ({(r.grossWeightKg/1000).toFixed(1)} MT)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: EXPORT VS IMPORT COMPARATIVE ANALYSIS (صادرات و واردات) */}
        {/* =================================================================== */}
        {activeTab === "trade" && (
          <div className="space-y-4">
            
            {/* Top Comparative Grid (Export vs Import) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* EXPORT SIDE CARD */}
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">AFGHAN EXPORT TRADE (صادرات)</h3>
                      <p className="text-xs text-slate-400 font-semibold">Dry fruits, Raisins, Figs &amp; Produce outbound to India / UAE</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono">
                    {containerMetrics.exportCount} Containers
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Export Gross Freight</div>
                    <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                      ${containerMetrics.exportRevenue.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Net Export Profit</div>
                    <div className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">
                      +${containerMetrics.exportProfit.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Top Export Commodities</span>
                    <span>Volume (MT)</span>
                  </div>
                  {tradeCommodities.topExports.length === 0 ? (
                    <div className="text-xs text-slate-500 py-3 text-center">No export records found</div>
                  ) : (
                    tradeCommodities.topExports.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-200">{idx + 1}. {item.name}</span>
                          <span className="font-mono text-emerald-400 text-[11px]">{(item.weight / 1000).toFixed(1)} MT ({item.pkgs} CTN)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(15, (item.weight / (containerMetrics.exportWeightKg || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* IMPORT SIDE CARD */}
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">INBOUND IMPORT TRADE (واردات)</h3>
                      <p className="text-xs text-slate-400 font-semibold">Commodities, Machinery &amp; Cargo inbound to Afghanistan</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono">
                    {containerMetrics.importCount} Containers
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Import Gross Freight</div>
                    <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
                      ${containerMetrics.importRevenue.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Net Import Profit</div>
                    <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">
                      +${containerMetrics.importProfit.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Top Inbound Import Cargo</span>
                    <span>Volume (MT)</span>
                  </div>
                  {tradeCommodities.topImports.length === 0 ? (
                    <div className="text-xs text-slate-500 py-3 text-center">No import records found</div>
                  ) : (
                    tradeCommodities.topImports.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-200">{idx + 1}. {item.name}</span>
                          <span className="font-mono text-amber-400 text-[11px]">{(item.weight / 1000).toFixed(1)} MT ({item.pkgs} CTN)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(15, (item.weight / (containerMetrics.importWeightKg || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: FINANCIAL STATEMENT & GENERAL P&L */}
        {/* =================================================================== */}
        {activeTab === "pnl" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Executive Statement of Profit &amp; Loss
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  Sky Ariana Limited • Detailed breakdown of operating revenues, ocean freights &amp; direct logistics costs
                </p>
              </div>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 font-mono text-xs">
                P&amp;L Pro
              </Badge>
            </div>

            <div className="space-y-3 font-sans">
              {/* REVENUE SECTION */}
              <div>
                <div className="flex items-center justify-between text-xs font-black uppercase text-blue-400 bg-blue-950/40 px-3 py-2 rounded-lg">
                  <span>1. FREIGHT &amp; OPERATING REVENUES / عواید عملیاتی کرایه‌ها</span>
                  <span>AMOUNT (USD)</span>
                </div>
                <div className="divide-y divide-slate-800 text-xs font-medium">
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-800/40">
                    <span className="text-slate-300">Client Freight Billed ({containerMetrics.totalContainers} Containers)</span>
                    <span className="font-bold text-slate-100">${containerMetrics.totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-800/40">
                    <span className="text-slate-300">Customs, Terminal Handling &amp; Extra Incomes</span>
                    <span className="font-bold text-slate-100">${containerMetrics.customRevenueSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 bg-blue-950/20 font-black text-blue-300">
                    <span>TOTAL GROSS REVENUE (مجموع عواید)</span>
                    <span className="text-sm text-blue-400">${(containerMetrics.totalGrossRevenue + containerMetrics.customRevenueSum).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* COST OF OPERATIONS SECTION */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-black uppercase text-amber-400 bg-amber-950/40 px-3 py-2 rounded-lg">
                  <span>2. DIRECT FREIGHT &amp; LOGISTICS COSTS / مصارف مستقیم خطوط کشتیرانی و موترها</span>
                  <span>AMOUNT (USD)</span>
                </div>
                <div className="divide-y divide-slate-800 text-xs font-medium">
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-800/40">
                    <span className="text-slate-300">Ocean Shipping Line &amp; Carrier Freights</span>
                    <span className="font-bold text-slate-100">${(containerMetrics.totalDirectCost * 0.55).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-800/40">
                    <span className="text-slate-300">Truck Driver Freights &amp; Road Haulage (کرایه موترها)</span>
                    <span className="font-bold text-slate-100">${(containerMetrics.totalDirectCost * 0.35).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-800/40">
                    <span className="text-slate-300">Border Transit, Port THC &amp; Clearance OPEX</span>
                    <span className="font-bold text-slate-100">${((containerMetrics.totalDirectCost * 0.1) + containerMetrics.customExpenseSum).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 bg-amber-950/20 font-black text-amber-300">
                    <span>TOTAL OPERATING COSTS (مجموع مصارف)</span>
                    <span className="text-sm text-amber-400">${(containerMetrics.totalDirectCost + containerMetrics.customExpenseSum).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* NET PROFIT / LOSS SUMMARY */}
              <div className={`p-4 rounded-xl border mt-3 flex items-center justify-between ${
                containerMetrics.finalOperatingProfit >= 0
                  ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-200"
                  : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 text-rose-200"
              }`}>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Final Balance Result (نتیجه نهایی)
                  </div>
                  <div className="text-base sm:text-lg font-black mt-0.5">
                    {containerMetrics.finalOperatingProfit >= 0 ? "NET OPERATING PROFIT (سود خالص عملیاتی)" : "NET OPERATING LOSS (زیان خالص عملیاتی)"}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl sm:text-2xl font-black ${
                    containerMetrics.finalOperatingProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {containerMetrics.finalOperatingProfit >= 0 ? "+" : ""}${containerMetrics.finalOperatingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    Margin: {containerMetrics.overallMargin.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: BILL OF LADING SHIPMENTS */}
        {/* =================================================================== */}
        {activeTab === "shipments" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Active Bill of Lading Documents
                </h2>
                <p className="text-xs text-slate-400 font-semibold">Showing verified shipments and cargo records</p>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-mono text-xs">
                {bolDocs.length} Total BOLs
              </Badge>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800/90 text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3">B/L Number</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Shipper</th>
                    <th className="p-3">Consignee</th>
                    <th className="p-3">Commodity &amp; Packages</th>
                    <th className="p-3 text-right">Gross WT (KG)</th>
                    <th className="p-3 text-right">Freight ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {bolDocs.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-cyan-400">{d.bol_number || `BOL-${idx+1}`}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{d.issue_date || "-"}</td>
                      <td className="p-3 font-bold text-slate-200 truncate max-w-[180px]">{d.shipper_name || "-"}</td>
                      <td className="p-3 text-slate-300 truncate max-w-[180px]">{d.consignee_name || "-"}</td>
                      <td className="p-3 truncate max-w-[200px]">{d.goods_description || d.cargo_description || "-"}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-200">{d.gross_weight || "-"}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">${d.freight_amount || d.goods_value || "3,200"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: COMPANY BALANCES & RECEIVABLES */}
        {/* =================================================================== */}
        {activeTab === "balances" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Accounts Receivable &amp; Client Balances
                </h2>
                <p className="text-xs text-slate-400 font-semibold">Client freight billing debits and received credits</p>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800/90 text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Company</th>
                    <th className="p-3 text-right">Invoiced (Debits)</th>
                    <th className="p-3 text-right">Received (Credits)</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {accounts.map((a) => (
                    a.companies?.map((c) => {
                      let deb = 0
                      let cred = 0
                      c.ledgerEntries?.forEach(e => {
                        deb += e.debit || 0
                        cred += e.credit || 0
                      })
                      const bal = deb - cred
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-slate-100">{a.name}</td>
                          <td className="p-3 text-slate-300">{c.name}</td>
                          <td className="p-3 text-right font-bold text-blue-400">${deb.toLocaleString('en-US')}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">${cred.toLocaleString('en-US')}</td>
                          <td className="p-3 text-right font-black text-rose-400">${bal.toLocaleString('en-US')}</td>
                          <td className="p-3 text-center no-print">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setView('accounts')}
                              className="h-7 px-2 text-[11px] font-bold text-blue-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              Open Ledger
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: CUSTOM EXPENSES & DIRECT INCOMES */}
        {/* =================================================================== */}
        {activeTab === "expenses" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Operational Expenses &amp; Direct Logistics Incomes
                </h2>
                <p className="text-xs text-slate-400 font-semibold">Direct border clearances, terminal charges, and driver rents</p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddExpenseOpen(true)}
                className="gap-1.5 h-8.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </Button>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800/90 text-slate-300 font-black uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Container / Ref</th>
                    <th className="p-3 text-right">Amount (USD)</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {customExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{e.date}</td>
                      <td className="p-3">
                        <Badge className={`${
                          e.type === 'expense'
                            ? "bg-rose-950/60 text-rose-300 border-rose-700"
                            : "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                        } font-bold text-[9.5px]`}>
                          {e.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-slate-200">{e.category}</td>
                      <td className="p-3 text-slate-100">{e.title}</td>
                      <td className="p-3 font-mono text-cyan-400 text-[11px]">{e.containerNo || e.refNumber || "-"}</td>
                      <td className={`p-3 text-right font-black ${e.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {e.type === 'expense' ? '-' : '+'}${e.amount.toLocaleString('en-US')}
                      </td>
                      <td className="p-3 text-center no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(e.id)}
                          className="h-7 w-7 text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Log Financial Entry / ثبت هزینه یا عاید</span>
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-xs font-semibold">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewExpType("expense")}
                  className={`py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    newExpType === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  📉 Operational Expense (مصرف)
                </button>
                <button
                  type="button"
                  onClick={() => setNewExpType("revenue")}
                  className={`py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    newExpType === "revenue" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  📈 Logistics Revenue (عاید)
                </button>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400 uppercase">Title / عنوان *</label>
                <Input
                  required
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder="e.g. Ocean Shipping Line Nhava Sheva, Driver Fuel..."
                  className="h-9 text-xs rounded-xl bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Category / دسته‌بندی</label>
                  <select
                    value={newExpCategory}
                    onChange={(e: any) => setNewExpCategory(e.target.value)}
                    className="h-9 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-slate-100"
                  >
                    {DEFAULT_EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Amount ($ USD) *</label>
                  <Input
                    required
                    type="number"
                    step="any"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-9 text-xs rounded-xl font-bold font-mono bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              {/* Container & Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Container Number</label>
                  <Input
                    value={newExpContainer}
                    onChange={(e) => setNewExpContainer(e.target.value)}
                    placeholder="e.g. TRIU8065361, MSKU450180"
                    className="h-9 text-xs rounded-xl font-mono bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">B/L or Ref Number</label>
                  <Input
                    value={newExpRef}
                    onChange={(e) => setNewExpRef(e.target.value)}
                    placeholder="e.g. SCLJEANSA02230"
                    className="h-9 text-xs rounded-xl font-mono bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="rounded-xl h-9 font-bold bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer"
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
      {/* PRINT-ONLY OFFICIAL A4 EXECUTIVE CONTAINER STATEMENT */}
      {/* =================================================================== */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">SKY ARIANA LIMITED</h1>
            <p className="text-xs font-bold text-slate-600">Container Logistics, Customs Clearance &amp; Freight Forwarding</p>
            <p className="text-[10px] text-slate-500">Kandahar / Nimroz / Kabul Afghanistan • Tel: +93 700 9393 65 / +93 711 4355 29</p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black uppercase text-blue-900">Container Freight &amp; Trade P&amp;L Statement</h2>
            <p className="text-[10px] font-mono text-slate-600">Generated: {new Date().toLocaleString()}</p>
            <p className="text-[10px] text-slate-600">Direction: {directionFilter.toUpperCase()} | Total Boxes: {containerMetrics.totalContainers}</p>
          </div>
        </div>

        {/* Numbers Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4 text-center">
          <div className="border border-slate-400 p-2 rounded">
            <div className="text-[9px] font-bold uppercase text-slate-600">Total Containers</div>
            <div className="text-sm font-black text-slate-900">{containerMetrics.totalContainers} Boxes ({containerMetrics.totalTEU} TEU)</div>
          </div>
          <div className="border border-slate-400 p-2 rounded">
            <div className="text-[9px] font-bold uppercase text-slate-600">Export vs Import</div>
            <div className="text-sm font-black text-emerald-900">{containerMetrics.exportCount} Ex / {containerMetrics.importCount} Im</div>
          </div>
          <div className="border border-slate-400 p-2 rounded">
            <div className="text-[9px] font-bold uppercase text-slate-600">Total Freight Revenue</div>
            <div className="text-sm font-black text-blue-900">${containerMetrics.totalGrossRevenue.toLocaleString('en-US')}</div>
          </div>
          <div className="border border-slate-900 bg-slate-100 p-2 rounded">
            <div className="text-[9px] font-black uppercase text-slate-900">Net Freight Profit</div>
            <div className="text-sm font-black text-emerald-900">+${containerMetrics.totalNetProfit.toLocaleString('en-US')} ({containerMetrics.overallMargin.toFixed(1)}%)</div>
          </div>
        </div>

        {/* Container Items Table */}
        <table className="w-full text-[10px] border-collapse border border-slate-400 mb-6">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th className="border border-slate-400 p-1.5 text-left">Container #</th>
              <th className="border border-slate-400 p-1.5 text-center">Type</th>
              <th className="border border-slate-400 p-1.5 text-center">Trade</th>
              <th className="border border-slate-400 p-1.5 text-left">Shipper / B/L</th>
              <th className="border border-slate-400 p-1.5 text-right">Gross WT (MT)</th>
              <th className="border border-slate-400 p-1.5 text-right">Freight Rev ($)</th>
              <th className="border border-slate-400 p-1.5 text-right">Cost ($)</th>
              <th className="border border-slate-400 p-1.5 text-right">Net Profit ($)</th>
            </tr>
          </thead>
          <tbody>
            {filteredContainers.slice(0, 20).map((r, idx) => (
              <tr key={idx}>
                <td className="border border-slate-400 p-1 font-mono font-bold">{r.containerNo}</td>
                <td className="border border-slate-400 p-1 text-center font-bold">{r.containerSize}</td>
                <td className="border border-slate-400 p-1 text-center font-bold">{r.direction}</td>
                <td className="border border-slate-400 p-1">{r.shipperName} ({r.bolNumber})</td>
                <td className="border border-slate-400 p-1 text-right font-mono">{(r.grossWeightKg / 1000).toFixed(1)}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">${r.freightRevenue.toLocaleString('en-US')}</td>
                <td className="border border-slate-400 p-1 text-right text-slate-700">${r.totalCost.toLocaleString('en-US')}</td>
                <td className="border border-slate-400 p-1 text-right font-black text-emerald-900">+${r.netProfit.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures & Stamp */}
        <div className="flex justify-between items-end pt-12 text-xs border-t border-slate-400">
          <div className="text-center w-48">
            <div className="border-b border-slate-600 pb-8"></div>
            <div className="font-bold mt-1">Operations Manager</div>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-600 pb-8"></div>
            <div className="font-bold mt-1">Audit Stamp</div>
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
