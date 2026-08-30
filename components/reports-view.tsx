"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
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
  Check,
  Sun,
  Moon,
  ArrowDown,
  ArrowUp,
  SlidersHorizontal,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Coins,
  ArrowRightLeft
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
  getActiveExchangeRate,
  setActiveExchangeRate,
  parseFreightCost,
  DEFAULT_AFN_USD_RATE,
  runDataMigrationCleanup
} from "@/lib/services/currency-service"

/**
 * Dedicated Portal for Report Printing
 * Mounts #sky-reports-print-root directly on document.body for clean, unclipped print output
 */
function ReportPrintPortal({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const existing = document.getElementById("sky-reports-print-root") as HTMLDivElement | null
    const root = existing || document.createElement("div")

    root.id = "sky-reports-print-root"
    root.className = "reports-print-root"
    root.setAttribute("data-print-root", "true")
    if (!existing) {
      document.body.appendChild(root)
    }
    setContainer(root)

    return () => {
      if (!existing && root.parentElement === document.body) {
        document.body.removeChild(root)
      }
    }
  }, [])

  if (!container) return null
  return createPortal(children, container)
}

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
  freightRevenue: number          // Invoiced Client Freight ($ USD)
  shippingCost: number            // Ocean Line / Direct Shipping Cost ($ USD)
  shippingCostRaw?: number
  shippingCostCurrency?: 'USD' | 'AFN'
  shippingCostDisplay: string
  driverCost: number              // Normalized Truck Driver Rent ($ USD)
  driverCostRaw: number           // Original value (e.g., 46730 AFN)
  driverCostCurrency: 'USD' | 'AFN'
  driverCostDisplay: string       // Formatted: e.g. "46,730 AFN ($668 USD)"
  handlingCost: number            // Border Transit & Port Handling ($ USD)
  totalCost: number               // Total Normalized Logistics Outflow ($ USD)
  netProfit: number               // freightRevenue - totalCost ($ USD)
  profitMargin: number            // (netProfit / freightRevenue) * 100
  status: 'Profitable' | 'Break-Even' | 'Loss'
  exchangeRateUsed: number        // e.g., 70.0 AFN/USD
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

/**
 * Robust Currency Formatter that properly handles signed values without "+$-" glitches
 */
export function formatUSD(amount: number, signed = false, decimals = 0): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "$0"
  const isNeg = amount < 0
  const absVal = Math.abs(amount)
  const formatted = absVal.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  if (isNeg) {
    return `-$${formatted}`
  }
  if (signed && amount > 0) {
    return `+$${formatted}`
  }
  return `$${formatted}`
}

export function formatMargin(margin: number): string {
  if (isNaN(margin) || margin === null || margin === undefined) return "0.0%"
  const sign = margin > 0 ? "+" : ""
  return `${sign}${margin.toFixed(1)}%`
}

export function ReportsView() {
  const { accounts, setView } = useApp()

  // Theme Mode State: "light" | "dark"
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light")

  // Load & Persist Theme Preference
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("skybol:reports-theme") as "light" | "dark" | null
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeMode(savedTheme)
      } else {
        // Default to light theme matching application
        setThemeMode("light")
      }
    } catch {
      setThemeMode("light")
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light"
    setThemeMode(nextTheme)
    try {
      window.localStorage.setItem("skybol:reports-theme", nextTheme)
      toast.success(`${nextTheme === "light" ? "☀️ Light Theme" : "🌙 Dark Theme"} active`)
    } catch {
      // ignore
    }
  }

  const isLight = themeMode === "light"

  // Navigation Sub-Tab State
  const [activeTab, setActiveTab] = useState<"pnl" | "containers" | "trade" | "shipments" | "balances" | "expenses">("containers")
  
  // Direction Filter: All, Export (صادرات), Import (واردات), Transit (ترانزیت)
  const [directionFilter, setDirectionFilter] = useState<"all" | "Export" | "Import" | "Transit">("all")
  
  // Container Size Filter: All, 20FT, 40FT, 40HQ, 40RF
  const [sizeFilter, setSizeFilter] = useState<"all" | "20FT" | "40FT" | "40HQ" | "40RF">("all")

  // Profitability Status Filter: All, Profitable, Loss, Break-Even
  const [statusFilter, setStatusFilter] = useState<"all" | "Profitable" | "Loss" | "Break-Even">("all")

  // Date Filter & Selection
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "last_month" | "year" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [selectedShipper, setSelectedShipper] = useState<string>("all")
  const [selectedConsignee, setSelectedConsignee] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Print & PDF Export Configuration State
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printScope, setPrintScope] = useState<"active" | "all_containers" | "trade_summary" | "pnl_statement" | "bbl_manifest" | "company_balances" | "opex_expenses">("active")
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape")
  const [includeKpis, setIncludeKpis] = useState(true)
  const [includeSignatures, setIncludeSignatures] = useState(true)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  // Column Sorting State for Containers table
  const [sortField, setSortField] = useState<keyof ContainerFreightRecord>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
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

  // Exchange Rate State (AFN per USD)
  const [exchangeRate, setExchangeRate] = useState<number>(() => getActiveExchangeRate())
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [tempRateInput, setTempRateInput] = useState<string>(() => getActiveExchangeRate().toString())

  // Run historical data cleanup migration on mount or exchange rate change
  useEffect(() => {
    runDataMigrationCleanup(exchangeRate)
  }, [exchangeRate])

  // Listen for global exchange rate updates
  useEffect(() => {
    const handleRateChange = (e: any) => {
      if (e?.detail?.rate) {
        setExchangeRate(e.detail.rate)
        setTempRateInput(e.detail.rate.toString())
      }
    }
    window.addEventListener("skybol:exchange-rate-updated", handleRateChange)
    return () => window.removeEventListener("skybol:exchange-rate-updated", handleRateChange)
  }, [])

  const handleUpdateExchangeRate = (newRate: number) => {
    if (newRate >= 10 && newRate <= 300) {
      setExchangeRate(newRate)
      setActiveExchangeRate(newRate)
      toast.success(`💱 Exchange Rate updated: 1 USD = ${newRate} AFN`)
      setIsRateModalOpen(false)
    } else {
      toast.error("Please enter a realistic exchange rate (10 to 300 AFN/USD)")
    }
  }

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

          // Driver Rent & Trucking Normalization
          const driverParsed = parseFreightCost(entry.driverFreight, "AFN", exchangeRate)
          const driverCost = driverParsed.rawAmount > 0 
            ? driverParsed.normalizedUSD 
            : (size === '20FT' ? 650 : 850)
          const driverCostRaw = driverParsed.rawAmount > 0 ? driverParsed.rawAmount : driverCost
          const driverCostCurrency = driverParsed.rawAmount > 0 ? driverParsed.currency : 'USD'
          const driverCostDisplay = driverParsed.rawAmount > 0 
            ? driverParsed.formattedCombined 
            : `$${driverCost.toLocaleString("en-US")} USD`

          // Direct Ocean Line / Shipping Cost
          const shippingParsed = parseFreightCost(entry.shippingCost, "USD", exchangeRate)
          const defaultShippingCost = size === '20FT' ? 950 : size === '40RF' ? 1850 : 1450
          const shippingCost = shippingParsed.rawAmount > 0 ? shippingParsed.normalizedUSD : defaultShippingCost
          const shippingCostDisplay = shippingParsed.rawAmount > 0 
            ? shippingParsed.formattedCombined 
            : `$${shippingCost.toLocaleString("en-US")} USD`

          // Terminal Handling & Border Waybill
          const handlingCost = 280

          // Total Logistics Direct Cost ($ USD)
          const totalCost = Math.round((shippingCost + driverCost + handlingCost) * 100) / 100
          const netProfit = Math.round((revenue - totalCost) * 100) / 100
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
              shippingCostRaw: shippingParsed.rawAmount || shippingCost,
              shippingCostCurrency: shippingParsed.currency,
              shippingCostDisplay,
              driverCost,
              driverCostRaw,
              driverCostCurrency,
              driverCostDisplay,
              handlingCost,
              totalCost,
              netProfit,
              profitMargin,
              status: netProfit > 0 ? 'Profitable' : netProfit === 0 ? 'Break-Even' : 'Loss',
              exchangeRateUsed: exchangeRate
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

      // Driver Rent & Freight Normalization
      const driverParsed = parseFreightCost(doc.driver_rent, doc.driver_rent_currency || "AFN", exchangeRate)
      const driverCost = driverParsed.rawAmount > 0 
        ? driverParsed.normalizedUSD 
        : (size === '20FT' ? 650 : 850)
      const driverCostRaw = driverParsed.rawAmount > 0 ? driverParsed.rawAmount : driverCost
      const driverCostCurrency = driverParsed.rawAmount > 0 ? driverParsed.currency : 'USD'
      const driverCostDisplay = driverParsed.rawAmount > 0 
        ? driverParsed.formattedCombined 
        : `$${driverCost.toLocaleString("en-US")} USD`

      // Direct Ocean Line / Shipping Cost
      const shippingParsed = parseFreightCost(doc.shipping_cost, doc.shipping_cost_currency || "USD", exchangeRate)
      const defaultShippingCost = size === '20FT' ? 950 : size === '40RF' ? 1850 : 1450
      const shippingCost = shippingParsed.rawAmount > 0 ? shippingParsed.normalizedUSD : defaultShippingCost
      const shippingCostDisplay = shippingParsed.rawAmount > 0 
        ? shippingParsed.formattedCombined 
        : `$${shippingCost.toLocaleString("en-US")} USD`

      const handlingCost = 280
      const totalCost = Math.round((shippingCost + driverCost + handlingCost) * 100) / 100
      const netProfit = Math.round((revenue - totalCost) * 100) / 100
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
          shippingCostRaw: shippingParsed.rawAmount || shippingCost,
          shippingCostCurrency: shippingParsed.currency,
          shippingCostDisplay,
          driverCost,
          driverCostRaw,
          driverCostCurrency,
          driverCostDisplay,
          handlingCost,
          totalCost,
          netProfit,
          profitMargin,
          status: netProfit > 0 ? 'Profitable' : netProfit === 0 ? 'Break-Even' : 'Loss',
          exchangeRateUsed: exchangeRate
        })
      }
    })

    return list
  }, [accounts, bolDocs, exchangeRate])

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

  // Filtered & Sorted Container Freight Records
  const filteredContainers = useMemo(() => {
    const filtered = allContainerRecords.filter(r => {
      // Direction Filter
      if (directionFilter !== "all" && r.direction !== directionFilter) {
        return false
      }
      // Size Filter
      if (sizeFilter !== "all" && r.containerSize !== sizeFilter) {
        return false
      }
      // Status Filter
      if (statusFilter !== "all" && r.status !== statusFilter) {
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
      // Custom Date Range
      if (dateFilter === "custom") {
        if (customStartDate && r.date < customStartDate) return false
        if (customEndDate && r.date > customEndDate) return false
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

    // Sort by field
    return filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [allContainerRecords, directionFilter, sizeFilter, statusFilter, dateFilter, customStartDate, customEndDate, selectedShipper, selectedConsignee, searchQuery, sortField, sortOrder])

  // Handle Sort Toggle
  const handleSort = (field: keyof ContainerFreightRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

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
    let shippingLineCostSum = 0
    let driverFreightCostSum = 0
    let borderHandlingCostSum = 0

    filteredContainers.forEach(r => {
      totalContainers += 1
      totalGrossRevenue += r.freightRevenue
      totalDirectCost += r.totalCost
      totalNetProfit += r.netProfit
      totalNetWeightKg += r.netWeightKg
      totalGrossWeightKg += r.grossWeightKg
      totalPackages += r.packagesCount
      shippingLineCostSum += r.shippingCost || 0
      driverFreightCostSum += r.driverCost || 0
      borderHandlingCostSum += r.handlingCost || 0

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
      shippingLineCostSum,
      driverFreightCostSum,
      borderHandlingCostSum,
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

  // =========================================================================
  // EXPORT TO EXCEL SPREADSHEET (.xlsx)
  // =========================================================================
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
        "Freight Invoiced ($ USD)": r.freightRevenue,
        "Ocean / Shipping Line Cost ($ USD)": r.shippingCost,
        "Driver Rent (Native AFN/USD)": r.driverCostDisplay,
        "Driver Rent ($ USD Normalized)": r.driverCost,
        "Border & Port Handling ($ USD)": r.handlingCost,
        "Total Direct Cost ($ USD)": r.totalCost,
        "Net Freight Profit ($ USD)": r.netProfit,
        "Margin (%)": `${r.profitMargin.toFixed(2)}%`,
        "P&L Status": r.status,
        "Exchange Rate Applied (AFN/USD)": r.exchangeRateUsed || exchangeRate
      }))
      const wsContainers = XLSX.utils.json_to_sheet(containerRows)
      XLSX.utils.book_append_sheet(wb, wsContainers, "Container Manifest")

      // 2. Executive Trade Summary Worksheet
      const summaryData = [
        ["SKY ARIANA LIMITED - EXECUTIVE CONTAINER & TRADE REPORT"],
        ["Report Date", new Date().toLocaleString()],
        ["Direction Filter", directionFilter.toUpperCase()],
        ["Exchange Rate Applied", `1 USD = ${exchangeRate} AFN`],
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
      XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary")

      // 3. Operational Expenses Sheet
      const expRows = customExpenses.map(e => ({
        "Date": e.date,
        "Type": e.type.toUpperCase(),
        "Category": e.category,
        "Title": e.title,
        "Amount ($)": e.amount,
        "Container #": e.containerNo || "-",
        "Ref / B/L #": e.refNumber || "-",
        "Payment Method": e.paymentMethod,
        "Notes": e.notes || "-"
      }))
      const wsExp = XLSX.utils.json_to_sheet(expRows)
      XLSX.utils.book_append_sheet(wb, wsExp, "Expenses & OPEX")

      XLSX.writeFile(wb, `SkyAriana_Container_Freight_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success("Container Excel report exported successfully!")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export Excel report")
    }
  }

  // =========================================================================
  // EXPORT TO CSV (.csv)
  // =========================================================================
  const handleExportCSV = () => {
    try {
      const headers = [
        "Container No",
        "Size",
        "Trade Direction",
        "B/L No",
        "Invoice No",
        "Date",
        "Shipper",
        "Consignee",
        "Origin",
        "Destination",
        "Commodity",
        "Packages",
        "Net Wt (KG)",
        "Gross Wt (KG)",
        "Freight Revenue ($ USD)",
        "Shipping Line Cost ($ USD)",
        "Driver Rent (Native)",
        "Driver Rent ($ USD)",
        "Handling Cost ($ USD)",
        "Total Direct Cost ($ USD)",
        "Net Profit ($ USD)",
        "Margin (%)",
        "Status"
      ]

      const rows = filteredContainers.map(r => [
        `"${r.containerNo}"`,
        `"${r.containerSize}"`,
        `"${r.direction}"`,
        `"${r.bolNumber}"`,
        `"${r.invoiceNumber}"`,
        `"${r.date}"`,
        `"${(r.shipperName || "").replace(/"/g, '""')}"`,
        `"${(r.consigneeName || "").replace(/"/g, '""')}"`,
        `"${(r.origin || "").replace(/"/g, '""')}"`,
        `"${(r.destination || "").replace(/"/g, '""')}"`,
        `"${(r.goodsDescription || "").replace(/"/g, '""')}"`,
        r.packagesCount,
        r.netWeightKg,
        r.grossWeightKg,
        r.freightRevenue,
        r.shippingCost,
        `"${r.driverCostDisplay}"`,
        r.driverCost,
        r.handlingCost,
        r.totalCost,
        r.netProfit,
        `"${r.profitMargin.toFixed(1)}%"`,
        `"${r.status}"`
      ])

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `SkyAriana_Container_Manifest_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("CSV file exported successfully!")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export CSV")
    }
  }

  // =========================================================================
  // PRINT & HIGH-RES PDF EXPORT ENGINES
  // =========================================================================
  const handleDirectPrint = (orientation: "landscape" | "portrait" = printOrientation) => {
    document.body.classList.remove('ledger-landscape-active')
    document.body.removeAttribute('data-print-mode')
    document.documentElement.removeAttribute('data-print-mode')
    
    document.body.setAttribute('data-print-active', 'reports')
    document.documentElement.setAttribute('data-print-active', 'reports')
    document.body.setAttribute('data-print-orientation', orientation)
    document.documentElement.setAttribute('data-print-orientation', orientation)

    const cleanup = () => {
      document.body.removeAttribute('data-print-active')
      document.documentElement.removeAttribute('data-print-active')
      document.body.removeAttribute('data-print-orientation')
      document.documentElement.removeAttribute('data-print-orientation')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    setTimeout(() => {
      window.print()
      setTimeout(cleanup, 2500)
    }, 60)
  }

  const handleExportPDF = async () => {
    setIsExportingPDF(true)
    try {
      const printContainer = document.querySelector('#sky-reports-print-root') || document.querySelector('.reports-print-root')
      if (!printContainer) throw new Error('Print container not found')

      const { default: html2canvas } = await import('html2canvas')
      // @ts-ignore
      const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js')

      const isLandscape = printOrientation === 'landscape'
      const canvas = await html2canvas(printContainer as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: isLandscape ? 1400 : 1000,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = isLandscape ? 297 : 210
      const pdfHeight = isLandscape ? 210 : 297
      const imgProps = pdf.getImageProperties(imgData)
      const canvasHeightMM = (imgProps.height * pdfWidth) / imgProps.width

      let heightLeft = canvasHeightMM
      let position = 0

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightMM, undefined, 'FAST')
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - canvasHeightMM
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightMM, undefined, 'FAST')
        heightLeft -= pdfHeight
      }

      pdf.save(`SkyAriana_Report_${printScope}_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success("High-res PDF exported successfully!")
      setIsPrintDialogOpen(false)
    } catch (e) {
      console.error("PDF Export Error:", e)
      toast.error("Failed to export PDF")
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Active Report Scope Title for Print & UI
  const getActiveReportTitle = (scope: string) => {
    switch (scope) {
      case "trade_summary":
        return "Export vs. Import Comparative Trade Analysis (تحلیل صادرات و واردات)"
      case "pnl_statement":
        return "Executive Financial Statement of Profit & Loss (صورتحساب سود و زیان مالی)"
      case "bbl_manifest":
        return "Bill of Lading Shipments & Manifest (بارنامه‌ها و اسناد حمل)"
      case "company_balances":
        return "Accounts Receivable & Client Balance Summary (بیلانس حساب‌های مشتریان)"
      case "opex_expenses":
        return "Operational Logistics OPEX & Direct Expenses (مصارف عملیاتی و لجستیکی)"
      case "all_containers":
      default:
        return "Container Freight & Direct Profit/Loss Statement (گزارش کانتینرها و سود کرایه‌ها)"
    }
  }

  return (
    <div className={`min-h-screen p-2.5 sm:p-4 md:p-6 font-sans transition-colors duration-200 ${
      isLight 
        ? "bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/70 text-slate-900" 
        : "bg-slate-950 text-slate-100"
    }`}>
      <div className="max-w-[1780px] w-full mx-auto space-y-4 sm:space-y-6">

        {/* =================================================================== */}
        {/* TOP CONTROLS & HEADER BANNER */}
        {/* =================================================================== */}
        <div className={`backdrop-blur-xl border rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all ${
          isLight
            ? "bg-white/95 border-slate-200 shadow-slate-200/60 text-slate-900"
            : "bg-slate-900/90 border-slate-800 shadow-lg text-slate-100"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Container className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-base sm:text-xl md:text-2xl font-black tracking-tight ${
                  isLight ? "text-slate-900" : "text-white"
                }`}>
                  Container Analytics &amp; Freight Profit/Loss
                </h1>
                <Badge className={
                  isLight
                    ? "bg-cyan-100 text-cyan-800 border-cyan-300 font-bold text-[10px] sm:text-xs"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold text-[10px] sm:text-xs"
                }>
                  گزارش کانتینرها، صادرات/واردات و سود کرایه‌ها
                </Badge>
              </div>
              <p className={`text-[11px] sm:text-xs font-semibold mt-0.5 ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}>
                Detailed Export vs. Import Analysis, Container TEU Tonnage &amp; Per-Box Freight Profit
              </p>
            </div>
          </div>

          {/* Quick Action Buttons + Theme Toggle */}
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0 no-print">
            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all ${
                isLight
                  ? "bg-amber-50/90 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
                  : "bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700 hover:text-amber-200"
              }`}
              title="Toggle between Light and Dark themes"
            >
              {isLight ? <Sun className="w-4 h-4 text-amber-600 fill-amber-500" /> : <Moon className="w-4 h-4 text-amber-300 fill-amber-400" />}
              <span>{isLight ? "Light Mode" : "Dark Mode"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                isLight
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  : "bg-emerald-950/40 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60"
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add Expense / Log</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                isLight
                  ? "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100"
                  : "bg-blue-950/40 text-blue-300 border-blue-700 hover:bg-blue-900/60"
              }`}
              title="Download Excel Workbook with multiple sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                isLight
                  ? "bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100"
                  : "bg-cyan-950/40 text-cyan-300 border-cyan-700 hover:bg-cyan-900/60"
              }`}
              title="Download clean CSV table"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-600" />
              <span>CSV</span>
            </Button>

            {/* Live Exchange Rate Selector Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempRateInput(exchangeRate.toString())
                setIsRateModalOpen(true)
              }}
              className={`gap-1.5 h-9 rounded-xl text-xs font-black shrink-0 cursor-pointer border transition-all ${
                isLight
                  ? "bg-amber-50/90 hover:bg-amber-100/90 text-amber-900 border-amber-300 shadow-xs"
                  : "bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border-amber-700/50"
              }`}
              title="Click to view or adjust Afghan Afghani (AFN) to USD exchange rate"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>1 USD = {exchangeRate} AFN</span>
              <Badge className="ml-1 text-[9px] px-1 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400">
                Rate
              </Badge>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsPrintDialogOpen(true)}
              className="gap-1.5 h-9 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700 shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 / PDF</span>
            </Button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* DIRECTION TOGGLE CHIPS & FILTERS TOOLBAR */}
        {/* =================================================================== */}
        <div className={`border rounded-2xl p-3 sm:p-4 space-y-3 no-print transition-all ${
          isLight
            ? "bg-white/95 border-slate-200/90 shadow-md shadow-slate-200/40"
            : "bg-slate-900/90 border-slate-800"
        }`}>
          
          {/* Trade Direction Selector Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setDirectionFilter("all")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  directionFilter === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : isLight
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
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
                    : isLight
                    ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
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
                    : isLight
                    ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
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
                    : isLight
                    ? "bg-purple-50 text-purple-800 hover:bg-purple-100"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-purple-300" />
                <span>Transit / ترانزیت ({allContainerRecords.filter(r => r.direction === 'Transit').length})</span>
              </button>
            </div>

            {/* Container Size Quick Filter */}
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
              <span className={`text-[11px] font-bold mr-1 hidden sm:inline ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}>Size:</span>
              {(['all', '20FT', '40FT', '40HQ', '40RF'] as const).map(sz => (
                <button
                  key={sz}
                  onClick={() => setSizeFilter(sz)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sizeFilter === sz
                      ? isLight
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-700 text-white border border-slate-600"
                      : isLight
                      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {sz.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Search, Shipper & Consignee Filter Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1 border-t ${
            isLight ? "border-slate-200" : "border-slate-800"
          }`}>
            {/* Live Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${
                isLight ? "text-slate-400" : "text-slate-400"
              }`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Container #, B/L, Shipper..."
                className={`h-9 pl-9 text-xs rounded-xl ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                    : "bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
                }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className={`h-9 w-full rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "bg-slate-50 border border-slate-300 text-slate-800"
                  : "bg-slate-800/80 border border-slate-700 text-slate-200"
              }`}
            >
              <option value="all">⚡ All Statuses / تمام وضعیت‌ها</option>
              <option value="Profitable">🟢 Profitable / سودده (&gt; $0)</option>
              <option value="Loss">🔴 Loss / زیان‌ده (&lt; $0)</option>
              <option value="Break-Even">⚪ Break-Even / سر‌به‌سر ($0)</option>
            </select>

            {/* Shipper Selector */}
            <select
              value={selectedShipper}
              onChange={(e) => setSelectedShipper(e.target.value)}
              className={`h-9 w-full rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "bg-slate-50 border border-slate-300 text-slate-800"
                  : "bg-slate-800/80 border border-slate-700 text-slate-200"
              }`}
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
              className={`h-9 w-full rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? "bg-slate-50 border border-slate-300 text-slate-800"
                  : "bg-slate-800/80 border border-slate-700 text-slate-200"
              }`}
            >
              <option value="all">📦 All Consignees / تمام گیرنده‌ها ({allConsignees.length})</option>
              {allConsignees.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Filter Summary / Reset */}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className={`text-[11px] font-medium truncate ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                Showing <strong className={isLight ? "text-blue-700 font-black" : "text-cyan-400"}>{filteredContainers.length}</strong> containers
              </span>
              {(directionFilter !== 'all' || sizeFilter !== 'all' || statusFilter !== 'all' || selectedShipper !== 'all' || selectedConsignee !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setDirectionFilter('all')
                    setSizeFilter('all')
                    setStatusFilter('all')
                    setSelectedShipper('all')
                    setSelectedConsignee('all')
                    setSearchQuery('')
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
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
          <Card className={`border shadow-lg rounded-2xl overflow-hidden relative col-span-2 sm:col-span-1 transition-all ${
            containerMetrics.totalNetProfit >= 0
              ? isLight
                ? "bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-emerald-300 text-slate-900 shadow-emerald-500/5"
                : "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40"
              : isLight
                ? "bg-gradient-to-br from-rose-50/90 via-white to-orange-50/70 border-rose-300 text-slate-900 shadow-rose-500/5"
                : "bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40"
          }`}>
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                Container Freight Profit (سود کرایه‌ها)
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${
                containerMetrics.totalNetProfit >= 0 
                  ? isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400" 
                  : isLight ? "bg-rose-100 text-rose-700" : "bg-rose-500/20 text-rose-400"
              }`}>
                {containerMetrics.totalNetProfit >= 0 ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                  containerMetrics.totalNetProfit >= 0 
                    ? isLight ? "text-emerald-700" : "text-emerald-400" 
                    : isLight ? "text-rose-700" : "text-rose-400"
                }`}>
                  {formatUSD(containerMetrics.totalNetProfit, true, 0)}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}>USD</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className={isLight ? "text-slate-500" : "text-slate-400"}>Avg / Container:</span>
                <Badge className={
                  containerMetrics.avgProfitPerContainer >= 0
                    ? isLight
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]"
                    : isLight
                      ? "bg-rose-100 text-rose-800 border-rose-300 text-[10px]"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]"
                }>
                  {formatUSD(containerMetrics.avgProfitPerContainer, true, 0)} / Box
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: TOTAL CONTAINERS & TEU */}
          <Card className={`border shadow-lg rounded-2xl overflow-hidden relative transition-all ${
            isLight
              ? "bg-gradient-to-br from-cyan-50/80 via-white to-blue-50/60 border-cyan-200 text-slate-900 shadow-slate-200/50"
              : "bg-slate-900/90 border-cyan-500/30 text-slate-100"
          }`}>
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                Containers &amp; TEU (کانتینرها)
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${
                isLight ? "bg-cyan-100 text-cyan-700" : "bg-cyan-500/20 text-cyan-400"
              }`}>
                <Container className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                  isLight ? "text-cyan-800" : "text-cyan-400"
                }`}>
                  {containerMetrics.totalContainers}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}>Boxes ({containerMetrics.totalTEU} TEU)</span>
              </div>
              <div className={`mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                <span>Sizes:</span>
                <span className={isLight ? "text-slate-800 font-bold" : "text-slate-200"}>
                  {containerMetrics.total40ft + containerMetrics.total40hq}x 40' • {containerMetrics.total20ft}x 20'
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: EXPORT VOLUME & VALUE */}
          <Card className={`border shadow-lg rounded-2xl overflow-hidden relative transition-all ${
            isLight
              ? "bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border-emerald-200 text-slate-900 shadow-slate-200/50"
              : "bg-slate-900/90 border-emerald-500/30 text-slate-100"
          }`}>
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                Total Export (صادرات افغانستان)
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${
                isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400"
              }`}>
                <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                  isLight ? "text-emerald-700" : "text-emerald-400"
                }`}>
                  {containerMetrics.exportCount}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}>Containers ({(containerMetrics.exportWeightKg / 1000).toFixed(1)} MT)</span>
              </div>
              <div className={`mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                <span>Export Revenue:</span>
                <span className={isLight ? "text-emerald-700 font-extrabold" : "text-emerald-300"}>
                  {formatUSD(containerMetrics.exportRevenue, false, 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: IMPORT VOLUME & VALUE */}
          <Card className={`border shadow-lg rounded-2xl overflow-hidden relative transition-all ${
            isLight
              ? "bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 border-amber-200 text-slate-900 shadow-slate-200/50"
              : "bg-slate-900/90 border-amber-500/30 text-slate-100"
          }`}>
            <CardHeader className="pb-1 pt-3.5 px-3.5 sm:px-4 flex flex-row items-center justify-between">
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                Total Import (واردات)
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl ${
                isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-400"
              }`}>
                <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                  isLight ? "text-amber-700" : "text-amber-400"
                }`}>
                  {containerMetrics.importCount}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}>Containers ({(containerMetrics.importWeightKg / 1000).toFixed(1)} MT)</span>
              </div>
              <div className={`mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-bold ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                <span>Import Revenue:</span>
                <span className={isLight ? "text-amber-700 font-extrabold" : "text-amber-300"}>
                  {formatUSD(containerMetrics.importRevenue, false, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* SUB-TABS NAVIGATION (Responsive Swipeable Dock) */}
        {/* =================================================================== */}
        <div className={`flex items-center gap-1.5 p-1 border rounded-2xl shadow-lg overflow-x-auto no-scrollbar no-print transition-all ${
          isLight
            ? "bg-white/95 border-slate-200 shadow-slate-200/50"
            : "bg-slate-900/90 border-slate-800"
        }`}>
          <button
            onClick={() => setActiveTab("containers")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === "containers"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
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
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
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
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
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
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
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
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
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
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expenses &amp; OPEX ({customExpenses.length})</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CONTAINER FREIGHT & PROFIT/LOSS MANIFEST */}
        {/* =================================================================== */}
        {activeTab === "containers" && (
          <div className="space-y-4">
            
            {/* Desktop Table View */}
            <div className={`hidden md:block border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
              isLight
                ? "bg-white/95 border-slate-200 shadow-slate-200/50"
                : "bg-slate-900/90 border-slate-800"
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                isLight ? "border-slate-200" : "border-slate-800"
              }`}>
                <div>
                  <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}>
                    <Container className="w-5 h-5 text-cyan-600" />
                    <span>Container Freight &amp; Direct Profit/Loss Statement</span>
                  </h2>
                  <p className={`text-xs font-semibold ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    Freight billing revenue, carrier ocean freight, driver rent &amp; net operating profit per container box
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    containerMetrics.totalNetProfit >= 0
                      ? isLight ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-xs font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs"
                      : isLight ? "bg-rose-100 text-rose-800 border-rose-300 font-mono text-xs font-bold" : "bg-rose-500/20 text-rose-300 border-rose-500/40 font-mono text-xs"
                  }>
                    Total Profit: {formatUSD(containerMetrics.totalNetProfit, true, 0)} USD
                  </Badge>
                </div>
              </div>

              <div className={`overflow-x-auto no-scrollbar rounded-xl border ${
                isLight ? "border-slate-200" : "border-slate-800"
              }`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`font-black uppercase text-[10px] tracking-wider border-b ${
                    isLight
                      ? "bg-slate-100 text-slate-700 border-slate-200"
                      : "bg-slate-800/90 text-slate-300 border-slate-700"
                  }`}>
                    <tr>
                      <th className="p-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("containerNo")}>
                        <div className="flex items-center gap-1">
                          <span>Container #</span>
                          {sortField === "containerNo" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3">Type</th>
                      <th className="p-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("direction")}>
                        <div className="flex items-center gap-1">
                          <span>Direction</span>
                          {sortField === "direction" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("shipperName")}>
                        <div className="flex items-center gap-1">
                          <span>B/L &amp; Shipper</span>
                          {sortField === "shipperName" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3">Cargo Commodity</th>
                      <th className="p-3 text-right cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("grossWeightKg")}>
                        <div className="flex items-center justify-end gap-1">
                          <span>Packages / WT</span>
                          {sortField === "grossWeightKg" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-right cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("freightRevenue")}>
                        <div className="flex items-center justify-end gap-1 text-blue-600">
                          <span>Freight Revenue</span>
                          {sortField === "freightRevenue" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-right cursor-pointer select-none hover:text-indigo-600" onClick={() => handleSort("shippingCost")}>
                        <div className="flex items-center justify-end gap-1 text-indigo-600">
                          <span>Ocean Line ($)</span>
                          {sortField === "shippingCost" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-right cursor-pointer select-none hover:text-amber-600" onClick={() => handleSort("driverCost")}>
                        <div className="flex items-center justify-end gap-1 text-amber-600">
                          <span>Driver Rent (موتروان)</span>
                          {sortField === "driverCost" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-right cursor-pointer select-none hover:text-amber-600" onClick={() => handleSort("totalCost")}>
                        <div className="flex items-center justify-end gap-1 text-amber-700">
                          <span>Total Cost ($)</span>
                          {sortField === "totalCost" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-right cursor-pointer select-none hover:text-emerald-600" onClick={() => handleSort("netProfit")}>
                        <div className="flex items-center justify-end gap-1 text-emerald-600">
                          <span>Net Profit ($)</span>
                          {sortField === "netProfit" && (sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${
                    isLight ? "divide-slate-200 text-slate-800" : "divide-slate-800/60 text-slate-200"
                  }`}>
                    {filteredContainers.length === 0 ? (
                      <tr>
                        <td colSpan={12} className={`text-center py-10 ${
                          isLight ? "text-slate-500" : "text-slate-400"
                        }`}>
                          No containers matching the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredContainers.map((r, idx) => (
                        <tr key={r.id || idx} className={`transition-colors ${
                          isLight ? "hover:bg-blue-50/60" : "hover:bg-slate-800/40"
                        }`}>
                          <td className={`p-3 font-mono font-bold ${
                            isLight ? "text-cyan-700" : "text-cyan-400"
                          }`}>
                            {r.containerNo}
                          </td>
                          <td className="p-3">
                            <Badge className={`font-mono text-[10px] ${
                              isLight
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-slate-800 text-slate-200 border-slate-700"
                            }`}>
                              {r.containerSize}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`${
                              r.direction === 'Export'
                                ? isLight ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                                : r.direction === 'Import'
                                ? isLight ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-amber-950/60 text-amber-300 border-amber-700"
                                : isLight ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-purple-950/60 text-purple-300 border-purple-700"
                            } font-bold text-[10px]`}>
                              {r.direction === 'Export' ? '↗ Export' : r.direction === 'Import' ? '↙ Import' : '↔ Transit'}
                            </Badge>
                          </td>
                          <td className="p-3 max-w-[190px]">
                            <div className={`font-bold truncate ${isLight ? "text-slate-900" : "text-slate-100"}`}>{r.shipperName}</div>
                            <div className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>{r.bolNumber}</div>
                          </td>
                          <td className={`p-3 max-w-[160px] truncate ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                            {r.goodsDescription}
                          </td>
                          <td className="p-3 text-right">
                            <div className={`font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{r.packagesCount} CTNS</div>
                            <div className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-slate-400"}`}>{(r.grossWeightKg / 1000).toFixed(1)} MT</div>
                          </td>
                          <td className={`p-3 text-right font-black ${
                            isLight ? "text-blue-700" : "text-blue-400"
                          }`}>
                            {formatUSD(r.freightRevenue, false, 0)}
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${
                            isLight ? "text-indigo-700" : "text-indigo-400"
                          }`}>
                            {formatUSD(r.shippingCost, false, 0)}
                          </td>
                          <td className="p-3 text-right">
                            <div className={`font-bold text-[11px] ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                              {r.driverCostCurrency === 'AFN'
                                ? `${r.driverCostRaw.toLocaleString()} AFN`
                                : `$${r.driverCost.toLocaleString()} USD`}
                            </div>
                            {r.driverCostCurrency === 'AFN' && (
                              <div className={`text-[10px] font-mono font-bold ${
                                isLight ? "text-amber-700" : "text-amber-400"
                              }`}>
                                (${formatUSD(r.driverCost, false, 0)} USD)
                              </div>
                            )}
                          </td>
                          <td className={`p-3 text-right font-bold ${
                            isLight ? "text-amber-700" : "text-amber-400"
                          }`}>
                            {formatUSD(r.totalCost, false, 0)}
                          </td>
                          <td className={`p-3 text-right font-black text-sm ${
                            r.netProfit >= 0
                              ? isLight ? "text-emerald-700" : "text-emerald-400"
                              : isLight ? "text-rose-700" : "text-rose-400"
                          }`}>
                            {formatUSD(r.netProfit, true, 0)}
                            <span className={`block text-[9.5px] font-bold ${
                              r.profitMargin >= 0
                                ? isLight ? "text-emerald-600" : "text-emerald-500"
                                : isLight ? "text-rose-600" : "text-rose-400"
                            }`}>{formatMargin(r.profitMargin)}</span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[9.5px] ${
                              r.netProfit > 0
                                ? isLight ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : r.netProfit === 0
                                ? isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                                : isLight ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            }`}>
                              {r.status}
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
                <div className={`text-center py-10 rounded-2xl border ${
                  isLight ? "bg-white text-slate-500 border-slate-200" : "bg-slate-900/90 text-slate-400 border-slate-800"
                }`}>
                  No containers matching the selected filter criteria.
                </div>
              ) : (
                filteredContainers.map((r, idx) => {
                  const isExpanded = expandedCardId === r.id
                  return (
                    <div
                      key={r.id || idx}
                      className={`border rounded-2xl p-4 shadow-md space-y-3 transition-all ${
                        isLight
                          ? "bg-white border-slate-200"
                          : "bg-slate-900/90 border-slate-800"
                      }`}
                    >
                      {/* Top Row: Container # + Direction Badge + Net Profit */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-black text-sm ${
                              isLight ? "text-cyan-700" : "text-cyan-400"
                            }`}>{r.containerNo}</span>
                            <Badge className={`text-[9.5px] px-1.5 py-0 font-mono ${
                              isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                              {r.containerSize}
                            </Badge>
                          </div>
                          <div className={`text-[11px] font-bold mt-0.5 ${
                            isLight ? "text-slate-600" : "text-slate-400"
                          }`}>{r.shipperName}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-base font-black ${
                            r.netProfit >= 0
                              ? isLight ? "text-emerald-700" : "text-emerald-400"
                              : isLight ? "text-rose-700" : "text-rose-400"
                          }`}>
                            {formatUSD(r.netProfit, true, 0)}
                          </div>
                          <Badge className={`${
                            r.direction === 'Export'
                              ? isLight ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                              : r.direction === 'Import'
                              ? isLight ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-amber-950/60 text-amber-300 border-amber-700"
                              : isLight ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-purple-950/60 text-purple-300 border-purple-700"
                          } font-bold text-[9px] px-1.5 py-0`}>
                            {r.direction === 'Export' ? '↗ Export' : r.direction === 'Import' ? '↙ Import' : '↔ Transit'}
                          </Badge>
                        </div>
                      </div>

                      {/* Middle Row: Quick Stats (Revenue, Cost, Cargo) */}
                      <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-xl text-center ${
                        isLight ? "bg-slate-50 border border-slate-100" : "bg-slate-800/60"
                      }`}>
                        <div>
                          <div className={`text-[9.5px] font-bold uppercase ${
                            isLight ? "text-slate-500" : "text-slate-400"
                          }`}>Freight Rev</div>
                          <div className={`text-xs font-black ${
                            isLight ? "text-blue-700" : "text-blue-400"
                          }`}>{formatUSD(r.freightRevenue, false, 0)}</div>
                        </div>
                        <div>
                          <div className={`text-[9.5px] font-bold uppercase ${
                            isLight ? "text-slate-500" : "text-slate-400"
                          }`}>Total Cost</div>
                          <div className={`text-xs font-black ${
                            isLight ? "text-amber-700" : "text-amber-400"
                          }`}>{formatUSD(r.totalCost, false, 0)}</div>
                        </div>
                        <div>
                          <div className={`text-[9.5px] font-bold uppercase ${
                            isLight ? "text-slate-500" : "text-slate-400"
                          }`}>Margin</div>
                          <div className={`text-xs font-black ${
                            r.profitMargin >= 0
                              ? isLight ? "text-emerald-700" : "text-emerald-400"
                              : isLight ? "text-rose-700" : "text-rose-400"
                          }`}>{formatMargin(r.profitMargin)}</div>
                        </div>
                      </div>

                      {/* Expandable Route & Cargo Details */}
                      <div className={`flex items-center justify-between text-xs pt-1 border-t ${
                        isLight ? "border-slate-200" : "border-slate-800/80"
                      }`}>
                        <span className={`text-[11px] font-medium truncate max-w-[220px] ${
                          isLight ? "text-slate-600" : "text-slate-400"
                        }`}>
                          {r.packagesCount} CTNS • {r.goodsDescription}
                        </span>
                        <button
                          onClick={() => setExpandedCardId(isExpanded ? null : r.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className={`p-3 rounded-xl border space-y-2 text-[11px] animate-in fade-in ${
                          isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950/80 border-slate-800 text-slate-300"
                        }`}>
                          <div className="flex justify-between">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>B/L Number:</span>
                            <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{r.bolNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Consignee:</span>
                            <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{r.consigneeName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Route:</span>
                            <span className={isLight ? "text-slate-800" : "text-slate-200"}>{r.origin} → {r.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Ocean Line Cost:</span>
                            <span className={`font-mono font-bold ${isLight ? "text-indigo-700" : "text-indigo-400"}`}>{formatUSD(r.shippingCost, false, 0)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Driver Rent (موتروان):</span>
                            <div className="text-right">
                              <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                                {r.driverCostDisplay}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Port &amp; Handling:</span>
                            <span className={`font-mono font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{formatUSD(r.handlingCost, false, 0)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 font-bold">
                            <span className={isLight ? "text-slate-700" : "text-slate-300"}>Total Direct Cost:</span>
                            <span className={`font-mono ${isLight ? "text-amber-700" : "text-amber-400"}`}>{formatUSD(r.totalCost, false, 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Gross Weight:</span>
                            <span className={`font-mono font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{r.grossWeightKg.toLocaleString('en-US')} KGS ({(r.grossWeightKg/1000).toFixed(1)} MT)</span>
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
        {/* TAB 2: EXPORT VS IMPORT COMPARATIVE ANALYSIS */}
        {/* =================================================================== */}
        {activeTab === "trade" && (
          <div className="space-y-4">
            
            {/* Top Comparative Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* EXPORT SIDE CARD */}
              <div className={`border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
                isLight
                  ? "bg-white border-emerald-200 shadow-emerald-500/5 text-slate-900"
                  : "bg-slate-900/90 border-emerald-500/30 text-slate-100"
              }`}>
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isLight ? "border-slate-200" : "border-slate-800"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${
                      isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>AFGHAN EXPORT TRADE (صادرات)</h3>
                      <p className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Dry fruits, Raisins, Figs &amp; Produce outbound to India / UAE</p>
                    </div>
                  </div>
                  <Badge className={
                    isLight ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-mono" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono"
                  }>
                    {containerMetrics.exportCount} Containers
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-100" : "bg-slate-800/60"}`}>
                    <div className={`text-[10px] font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>Export Gross Freight</div>
                    <div className={`text-lg sm:text-xl font-black mt-0.5 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      {formatUSD(containerMetrics.exportRevenue, false, 0)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-100" : "bg-slate-800/60"}`}>
                    <div className={`text-[10px] font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>Net Export Profit</div>
                    <div className={`text-lg sm:text-xl font-black mt-0.5 ${
                      containerMetrics.exportProfit >= 0
                        ? isLight ? "text-emerald-700" : "text-emerald-300"
                        : isLight ? "text-rose-700" : "text-rose-400"
                    }`}>
                      {formatUSD(containerMetrics.exportProfit, true, 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className={`text-xs font-black uppercase tracking-wider flex items-center justify-between ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}>
                    <span>Top Export Commodities</span>
                    <span>Volume (MT)</span>
                  </div>
                  {tradeCommodities.topExports.length === 0 ? (
                    <div className={`text-xs py-3 text-center ${isLight ? "text-slate-400" : "text-slate-500"}`}>No export records found</div>
                  ) : (
                    tradeCommodities.topExports.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={isLight ? "text-slate-800" : "text-slate-200"}>{idx + 1}. {item.name}</span>
                          <span className={`font-mono text-[11px] ${isLight ? "text-emerald-700 font-bold" : "text-emerald-400"}`}>{(item.weight / 1000).toFixed(1)} MT ({item.pkgs} CTN)</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-slate-800"}`}>
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
              <div className={`border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
                isLight
                  ? "bg-white border-amber-200 shadow-amber-500/5 text-slate-900"
                  : "bg-slate-900/90 border-amber-500/30 text-slate-100"
              }`}>
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isLight ? "border-slate-200" : "border-slate-800"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${
                      isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>INBOUND IMPORT TRADE (واردات)</h3>
                      <p className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Commodities, Machinery &amp; Cargo inbound to Afghanistan</p>
                    </div>
                  </div>
                  <Badge className={
                    isLight ? "bg-amber-100 text-amber-800 border-amber-300 font-mono" : "bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono"
                  }>
                    {containerMetrics.importCount} Containers
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-100" : "bg-slate-800/60"}`}>
                    <div className={`text-[10px] font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>Import Gross Freight</div>
                    <div className={`text-lg sm:text-xl font-black mt-0.5 ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                      {formatUSD(containerMetrics.importRevenue, false, 0)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${isLight ? "bg-slate-50 border border-slate-100" : "bg-slate-800/60"}`}>
                    <div className={`text-[10px] font-bold uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>Net Import Profit</div>
                    <div className={`text-lg sm:text-xl font-black mt-0.5 ${
                      containerMetrics.importProfit >= 0
                        ? isLight ? "text-amber-700" : "text-amber-300"
                        : isLight ? "text-rose-700" : "text-rose-400"
                    }`}>
                      {formatUSD(containerMetrics.importProfit, true, 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className={`text-xs font-black uppercase tracking-wider flex items-center justify-between ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}>
                    <span>Top Inbound Import Cargo</span>
                    <span>Volume (MT)</span>
                  </div>
                  {tradeCommodities.topImports.length === 0 ? (
                    <div className={`text-xs py-3 text-center ${isLight ? "text-slate-400" : "text-slate-500"}`}>No import records found</div>
                  ) : (
                    tradeCommodities.topImports.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={isLight ? "text-slate-800" : "text-slate-200"}>{idx + 1}. {item.name}</span>
                          <span className={`font-mono text-[11px] ${isLight ? "text-amber-700 font-bold" : "text-amber-400"}`}>{(item.weight / 1000).toFixed(1)} MT ({item.pkgs} CTN)</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-slate-800"}`}>
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
          <div className={`border rounded-2xl p-4 sm:p-6 shadow-lg space-y-4 transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-slate-200/50 text-slate-900"
              : "bg-slate-900/90 border-slate-800 text-slate-100"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <h2 className={`text-base sm:text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  Executive Statement of Profit &amp; Loss
                </h2>
                <p className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Sky Ariana Limited • Detailed breakdown of operating revenues, ocean freights &amp; direct logistics costs
                </p>
              </div>
              <Badge className={
                isLight ? "bg-blue-100 text-blue-800 border-blue-300 font-mono text-xs" : "bg-blue-500/20 text-blue-300 border-blue-500/40 font-mono text-xs"
              }>
                P&amp;L Pro
              </Badge>
            </div>

            <div className="space-y-3 font-sans">
              {/* REVENUE SECTION */}
              <div>
                <div className={`flex items-center justify-between text-xs font-black uppercase px-3 py-2 rounded-lg ${
                  isLight ? "bg-blue-100/70 text-blue-900" : "bg-blue-950/40 text-blue-400"
                }`}>
                  <span>1. FREIGHT &amp; OPERATING REVENUES / عواید عملیاتی کرایه‌ها</span>
                  <span>AMOUNT (USD)</span>
                </div>
                <div className={`divide-y text-xs font-medium ${
                  isLight ? "divide-slate-200" : "divide-slate-800"
                }`}>
                  <div className={`flex items-center justify-between py-2 px-3 ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                  }`}>
                    <span className={isLight ? "text-slate-700" : "text-slate-300"}>Client Freight Billed ({containerMetrics.totalContainers} Containers)</span>
                    <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{formatUSD(containerMetrics.totalGrossRevenue, false, 2)}</span>
                  </div>
                  <div className={`flex items-center justify-between py-2 px-3 ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                  }`}>
                    <span className={isLight ? "text-slate-700" : "text-slate-300"}>Customs, Terminal Handling &amp; Extra Incomes</span>
                    <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{formatUSD(containerMetrics.customRevenueSum, false, 2)}</span>
                  </div>
                  <div className={`flex items-center justify-between py-2.5 px-3 font-black ${
                    isLight ? "bg-blue-50 text-blue-900" : "bg-blue-950/20 text-blue-300"
                  }`}>
                    <span>TOTAL GROSS REVENUE (مجموع عواید)</span>
                    <span className={`text-sm ${isLight ? "text-blue-800" : "text-blue-400"}`}>{formatUSD(containerMetrics.totalGrossRevenue + containerMetrics.customRevenueSum, false, 2)}</span>
                  </div>
                </div>
              </div>

              {/* COST OF OPERATIONS SECTION */}
              <div className="pt-2">
                <div className={`flex items-center justify-between text-xs font-black uppercase px-3 py-2 rounded-lg ${
                  isLight ? "bg-amber-100/70 text-amber-900" : "bg-amber-950/40 text-amber-400"
                }`}>
                  <span>2. DIRECT FREIGHT &amp; LOGISTICS COSTS / مصارف مستقیم خطوط کشتیرانی و موترها</span>
                  <span>AMOUNT (USD)</span>
                </div>
                <div className={`divide-y text-xs font-medium ${
                  isLight ? "divide-slate-200" : "divide-slate-800"
                }`}>
                  <div className={`flex items-center justify-between py-2 px-3 ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                  }`}>
                    <span className={isLight ? "text-slate-700" : "text-slate-300"}>Ocean Shipping Line &amp; Carrier Freights</span>
                    <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{formatUSD(containerMetrics.totalDirectCost * 0.55, false, 2)}</span>
                  </div>
                  <div className={`flex items-center justify-between py-2 px-3 ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                  }`}>
                    <span className={isLight ? "text-slate-700" : "text-slate-300"}>Truck Driver Freights &amp; Road Haulage (کرایه موترها)</span>
                    <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{formatUSD(containerMetrics.totalDirectCost * 0.35, false, 2)}</span>
                  </div>
                  <div className={`flex items-center justify-between py-2 px-3 ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                  }`}>
                    <span className={isLight ? "text-slate-700" : "text-slate-300"}>Border Transit, Port THC &amp; Clearance OPEX</span>
                    <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{formatUSD((containerMetrics.totalDirectCost * 0.1) + containerMetrics.customExpenseSum, false, 2)}</span>
                  </div>
                  <div className={`flex items-center justify-between py-2.5 px-3 font-black ${
                    isLight ? "bg-amber-50 text-amber-900" : "bg-amber-950/20 text-amber-300"
                  }`}>
                    <span>TOTAL OPERATING COSTS (مجموع مصارف)</span>
                    <span className={`text-sm ${isLight ? "text-amber-800" : "text-amber-400"}`}>{formatUSD(containerMetrics.totalDirectCost + containerMetrics.customExpenseSum, false, 2)}</span>
                  </div>
                </div>
              </div>

              {/* NET PROFIT / LOSS SUMMARY */}
              <div className={`p-4 rounded-xl border mt-3 flex items-center justify-between ${
                containerMetrics.finalOperatingProfit >= 0
                  ? isLight
                    ? "bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white border-emerald-300 text-emerald-950"
                    : "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-200"
                  : isLight
                    ? "bg-gradient-to-r from-rose-50 via-rose-50/50 to-white border-rose-300 text-rose-950"
                    : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 text-rose-200"
              }`}>
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    Final Balance Result (نتیجه نهایی)
                  </div>
                  <div className="text-base sm:text-lg font-black mt-0.5">
                    {containerMetrics.finalOperatingProfit >= 0 ? "NET OPERATING PROFIT (سود خالص عملیاتی)" : "NET OPERATING LOSS (زیان خالص عملیاتی)"}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl sm:text-2xl font-black ${
                    containerMetrics.finalOperatingProfit >= 0 
                      ? isLight ? "text-emerald-700" : "text-emerald-400" 
                      : isLight ? "text-rose-700" : "text-rose-400"
                  }`}>
                    {formatUSD(containerMetrics.finalOperatingProfit, true, 2)} USD
                  </div>
                  <div className={`text-xs font-bold ${
                    isLight ? "text-slate-600" : "text-slate-400"
                  }`}>
                    Margin: {formatMargin(containerMetrics.overallMargin)}
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
          <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-slate-200/50 text-slate-900"
              : "bg-slate-900/90 border-slate-800 text-slate-100"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <h2 className={`text-base sm:text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  Active Bill of Lading Documents
                </h2>
                <p className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Showing verified shipments and cargo records</p>
              </div>
              <Badge className={
                isLight ? "bg-cyan-100 text-cyan-800 border-cyan-300 font-mono text-xs" : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-mono text-xs"
              }>
                {bolDocs.length} Total BOLs
              </Badge>
            </div>

            <div className={`overflow-x-auto no-scrollbar rounded-xl border ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`font-black uppercase text-[10px] tracking-wider border-b ${
                  isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-800/90 text-slate-300 border-slate-700"
                }`}>
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
                <tbody className={`divide-y font-medium ${
                  isLight ? "divide-slate-200 text-slate-800" : "divide-slate-800/60 text-slate-200"
                }`}>
                  {bolDocs.map((d, idx) => (
                    <tr key={idx} className={`transition-colors ${
                      isLight ? "hover:bg-blue-50/60" : "hover:bg-slate-800/40"
                    }`}>
                      <td className={`p-3 font-mono font-bold ${isLight ? "text-cyan-700" : "text-cyan-400"}`}>{d.bol_number || `BOL-${idx+1}`}</td>
                      <td className={`p-3 font-mono text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>{d.issue_date || "-"}</td>
                      <td className={`p-3 font-bold truncate max-w-[180px] ${isLight ? "text-slate-900" : "text-slate-200"}`}>{d.shipper_name || "-"}</td>
                      <td className={`p-3 truncate max-w-[180px] ${isLight ? "text-slate-700" : "text-slate-300"}`}>{d.consignee_name || "-"}</td>
                      <td className={`p-3 truncate max-w-[200px] ${isLight ? "text-slate-700" : "text-slate-300"}`}>{d.goods_description || d.cargo_description || "-"}</td>
                      <td className={`p-3 text-right font-mono font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{d.gross_weight || "-"}</td>
                      <td className={`p-3 text-right font-bold ${isLight ? "text-emerald-700 font-black" : "text-emerald-400"}`}>{formatUSD(parseFloat(d.freight_amount || d.goods_value || 3200) || 3200, false, 0)}</td>
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
          <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-slate-200/50 text-slate-900"
              : "bg-slate-900/90 border-slate-800 text-slate-100"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <h2 className={`text-base sm:text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  Accounts Receivable &amp; Client Balances
                </h2>
                <p className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Client freight billing debits and received credits</p>
              </div>
            </div>

            <div className={`overflow-x-auto no-scrollbar rounded-xl border ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`font-black uppercase text-[10px] tracking-wider border-b ${
                  isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-800/90 text-slate-300 border-slate-700"
                }`}>
                  <tr>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Company</th>
                    <th className="p-3 text-right">Invoiced (Debits)</th>
                    <th className="p-3 text-right">Received (Credits)</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${
                  isLight ? "divide-slate-200 text-slate-800" : "divide-slate-800/60 text-slate-200"
                }`}>
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
                        <tr key={c.id} className={`transition-colors ${
                          isLight ? "hover:bg-blue-50/60" : "hover:bg-slate-800/40"
                        }`}>
                          <td className={`p-3 font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{a.name}</td>
                          <td className={`p-3 ${isLight ? "text-slate-700" : "text-slate-300"}`}>{c.name}</td>
                          <td className={`p-3 text-right font-bold ${isLight ? "text-blue-700" : "text-blue-400"}`}>{formatUSD(deb, false, 0)}</td>
                          <td className={`p-3 text-right font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>{formatUSD(cred, false, 0)}</td>
                          <td className={`p-3 text-right font-black ${
                            bal > 0 ? isLight ? "text-rose-700" : "text-rose-400" : isLight ? "text-emerald-700" : "text-emerald-400"
                          }`}>{formatUSD(bal, false, 0)}</td>
                          <td className="p-3 text-center no-print">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setView('accounts')}
                              className={`h-7 px-2 text-[11px] font-bold rounded-lg cursor-pointer ${
                                isLight ? "text-blue-700 hover:bg-blue-50" : "text-blue-400 hover:bg-slate-800"
                              }`}
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
          <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-slate-200/50 text-slate-900"
              : "bg-slate-900/90 border-slate-800 text-slate-100"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <h2 className={`text-base sm:text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  Operational Expenses &amp; Direct Logistics Incomes
                </h2>
                <p className={`text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Direct border clearances, terminal charges, and driver rents</p>
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

            <div className={`overflow-x-auto no-scrollbar rounded-xl border ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`font-black uppercase text-[10px] tracking-wider border-b ${
                  isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-800/90 text-slate-300 border-slate-700"
                }`}>
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
                <tbody className={`divide-y font-medium ${
                  isLight ? "divide-slate-200 text-slate-800" : "divide-slate-800/60 text-slate-200"
                }`}>
                  {customExpenses.map((e) => (
                    <tr key={e.id} className={`transition-colors ${
                      isLight ? "hover:bg-blue-50/60" : "hover:bg-slate-800/40"
                    }`}>
                      <td className={`p-3 font-mono text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>{e.date}</td>
                      <td className="p-3">
                        <Badge className={`${
                          e.type === 'expense'
                            ? isLight ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-rose-950/60 text-rose-300 border-rose-700"
                            : isLight ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                        } font-bold text-[9.5px]`}>
                          {e.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className={`p-3 font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{e.category}</td>
                      <td className={`p-3 ${isLight ? "text-slate-800" : "text-slate-100"}`}>{e.title}</td>
                      <td className={`p-3 font-mono text-[11px] ${isLight ? "text-cyan-700 font-bold" : "text-cyan-400"}`}>{e.containerNo || e.refNumber || "-"}</td>
                      <td className={`p-3 text-right font-black ${
                        e.type === 'expense'
                          ? isLight ? "text-rose-700" : "text-rose-400"
                          : isLight ? "text-emerald-700" : "text-emerald-400"
                      }`}>
                        {e.type === 'expense' ? `-${formatUSD(e.amount, false, 0)}` : `+${formatUSD(e.amount, false, 0)}`}
                      </td>
                      <td className="p-3 text-center no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(e.id)}
                          className={`h-7 w-7 rounded-lg cursor-pointer ${
                            isLight ? "text-rose-600 hover:bg-rose-50" : "text-rose-400 hover:bg-rose-950/40"
                          }`}
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
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4 ${
            isLight
              ? "bg-white border-slate-200 text-slate-900"
              : "bg-slate-900 border-slate-800 text-slate-100"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <h3 className={`text-base font-black flex items-center gap-2 ${
                isLight ? "text-slate-900" : "text-white"
              }`}>
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Log Financial Entry / ثبت هزینه یا عاید</span>
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className={`p-1 rounded-lg ${
                  isLight ? "text-slate-400 hover:text-slate-700" : "text-slate-400 hover:text-white"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-xs font-semibold">
              {/* Type Toggle */}
              <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl ${
                isLight ? "bg-slate-100" : "bg-slate-800"
              }`}>
                <button
                  type="button"
                  onClick={() => setNewExpType("expense")}
                  className={`py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    newExpType === "expense" 
                      ? "bg-rose-600 text-white shadow-xs" 
                      : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
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
                      : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  📈 Logistics Revenue (عاید)
                </button>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className={`text-[11px] uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>Title / عنوان *</label>
                <Input
                  required
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder="e.g. Ocean Shipping Line Nhava Sheva, Driver Fuel..."
                  className={`h-9 text-xs rounded-xl ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                      : "bg-slate-800 border-slate-700 text-slate-100"
                  }`}
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>Category / دسته‌بندی</label>
                  <select
                    value={newExpCategory}
                    onChange={(e: any) => setNewExpCategory(e.target.value)}
                    className={`h-9 w-full rounded-xl px-3 text-xs font-bold ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900"
                        : "bg-slate-800 border border-slate-700 text-slate-100"
                    }`}
                  >
                    {DEFAULT_EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>Amount ($ USD) *</label>
                  <Input
                    required
                    type="number"
                    step="any"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    placeholder="0.00"
                    className={`h-9 text-xs rounded-xl font-bold font-mono ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                        : "bg-slate-800 border-slate-700 text-slate-100"
                    }`}
                  />
                </div>
              </div>

              {/* Container & Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>Container Number</label>
                  <Input
                    value={newExpContainer}
                    onChange={(e) => setNewExpContainer(e.target.value)}
                    placeholder="e.g. TRIU8065361, MSKU450180"
                    className={`h-9 text-xs rounded-xl font-mono ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                        : "bg-slate-800 border-slate-700 text-slate-100"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] uppercase ${isLight ? "text-slate-600" : "text-slate-400"}`}>B/L or Ref Number</label>
                  <Input
                    value={newExpRef}
                    onChange={(e) => setNewExpRef(e.target.value)}
                    placeholder="e.g. SCLJEANSA02230"
                    className={`h-9 text-xs rounded-xl font-mono ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                        : "bg-slate-800 border-slate-700 text-slate-100"
                    }`}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                isLight ? "border-slate-200" : "border-slate-800"
              }`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className={`rounded-xl h-9 font-bold cursor-pointer ${
                    isLight
                      ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
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
      {/* MODAL: PRINT & PDF EXPORT STUDIO */}
      {/* =================================================================== */}
      {isPrintDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in no-print">
          <div className={`border rounded-2xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-5 ${
            isLight
              ? "bg-white border-slate-200 text-slate-900"
              : "bg-slate-900 border-slate-800 text-slate-100"
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3.5 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                    Report Print &amp; PDF Export Studio
                  </h3>
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Customize print layout, page orientation, and data scope
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintDialogOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                1. Select Report Section / انتخاب بخش گزارش
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: "all_containers", label: "Container Manifest & P&L", desc: `${filteredContainers.length} containers with costs & profit` },
                  { id: "trade_summary", label: "Executive Trade Summary", desc: "Export vs Import, TEU & Top Commodities" },
                  { id: "company_balances", label: "Client Receivables & Balances", desc: "Shipper & consignee financial ledgers" },
                  { id: "opex_expenses", label: "Logistics OPEX & Direct Costs", desc: `${customExpenses.length} logged expense items` },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPrintScope(s.id as any)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      printScope === s.id
                        ? isLight
                          ? "bg-blue-50/80 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                          : "bg-blue-950/40 border-blue-500 text-blue-200 ring-2 ring-blue-500/20"
                        : isLight
                        ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                        : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <div className="font-black text-xs">{s.label}</div>
                    <div className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Orientation */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                2. Page Orientation / جهت صفحه
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPrintOrientation("landscape")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    printOrientation === "landscape"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                      : isLight
                      ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                      : "border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="w-5 h-3.5 border-2 border-current rounded-sm"></div>
                  <span>Landscape (افقی - Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOrientation("portrait")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    printOrientation === "portrait"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                      : isLight
                      ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                      : "border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="w-3.5 h-5 border-2 border-current rounded-sm"></div>
                  <span>Portrait (عمودی)</span>
                </button>
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                3. Print Options / تنظیمات اضافی
              </label>
              <div className="flex flex-wrap gap-4 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeKpis}
                    onChange={(e) => setIncludeKpis(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Include Executive KPI Summary Tiles</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Include Official Signature &amp; Stamp Footer</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className={`flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintDialogOpen(false)}
                className={`rounded-xl text-xs font-bold ${
                  isLight ? "border-slate-300 text-slate-700" : "border-slate-700 text-slate-300"
                }`}
              >
                Cancel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className={`gap-1.5 rounded-xl text-xs font-bold ${
                  isLight ? "border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-100" : "border-blue-700 text-blue-300 bg-blue-950/30 hover:bg-blue-900/50"
                }`}
              >
                {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download PDF</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  handleDirectPrint(printOrientation)
                  setIsPrintDialogOpen(false)
                }}
                className="gap-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document Now</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PORTAL-BASED OFFICIAL MULTI-PAGE PRINTABLE REPORT */}
      {/* =================================================================== */}
      <ReportPrintPortal>
        <div className="reports-print-document font-sans text-slate-900 bg-white p-6 max-w-full">
          
          {/* 1. Official Letterhead Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-950 text-white font-black flex items-center justify-center text-sm tracking-wider">
                  SKY
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-none">
                    SKY ARIANA LOGISTICS &amp; FREIGHT FORWARDING LIMITED
                  </h1>
                  <p className="text-[10px] font-bold text-slate-700 tracking-wide mt-0.5">
                    شرکت خدمات ترانسپورت بین‌المللی و بارچلانی هوایی و زمینی اسکای آریانا
                  </p>
                </div>
              </div>
              <p className="text-[9.5px] text-slate-600 font-medium pt-1">
                Customs Clearance, Border Transit, Ocean &amp; Multimodal Freight Forwarding • Regional Logistics Hub
              </p>
              <p className="text-[9px] text-slate-500 font-mono">
                Kandahar / Nimroz / Kabul Afghanistan • Tel: +93 700 9393 65 / +93 711 4355 29 • Web: skyariana.com
              </p>
            </div>

            <div className="text-right shrink-0 space-y-1">
              <div className="inline-block bg-slate-900 text-white px-2.5 py-1 rounded font-black text-[11px] uppercase tracking-wider">
                OFFICIAL REPORT
              </div>
              <div className="text-[10px] font-bold text-blue-950 uppercase">
                {getActiveReportTitle(printScope)}
              </div>
              <div className="text-[9px] font-mono text-slate-600 space-y-0.5">
                <div>Date: <strong>{new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                <div>Filter Scope: <strong>{directionFilter.toUpperCase()}</strong> | Size: <strong>{sizeFilter.toUpperCase()}</strong></div>
                <div>Currency: <strong>USD ($)</strong></div>
              </div>
            </div>
          </div>

          {/* 2. Executive KPI Highlights Grid */}
          {includeKpis && (
            <div className="grid grid-cols-6 gap-2 mb-4">
              <div className="border border-slate-300 bg-slate-50/80 p-2 rounded text-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-600">Total Containers</div>
                <div className="text-xs font-black text-slate-900">{containerMetrics.totalContainers} Boxes</div>
                <div className="text-[8px] font-mono text-slate-500">{containerMetrics.totalTEU} TEU</div>
              </div>

              <div className="border border-slate-300 bg-slate-50/80 p-2 rounded text-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-600">Export vs Import</div>
                <div className="text-xs font-black text-emerald-800">{containerMetrics.exportCount} Ex / {containerMetrics.importCount} Im</div>
                <div className="text-[8px] font-mono text-slate-500">{containerMetrics.transitCount} Transit</div>
              </div>

              <div className="border border-slate-300 bg-slate-50/80 p-2 rounded text-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-600">Gross Weight</div>
                <div className="text-xs font-black text-slate-900">{(containerMetrics.totalGrossWeightKg / 1000).toFixed(1)} MT</div>
                <div className="text-[8px] font-mono text-slate-500">{(containerMetrics.totalNetWeightKg / 1000).toFixed(1)} Net MT</div>
              </div>

              <div className="border border-slate-300 bg-blue-50/50 p-2 rounded text-center">
                <div className="text-[8.5px] font-bold uppercase text-blue-900">Freight Revenue</div>
                <div className="text-xs font-black text-blue-950">{formatUSD(containerMetrics.totalGrossRevenue, false, 0)}</div>
                <div className="text-[8px] font-mono text-blue-700">Invoiced Total</div>
              </div>

              <div className="border border-slate-300 bg-rose-50/40 p-2 rounded text-center">
                <div className="text-[8.5px] font-bold uppercase text-rose-900">Direct Costs</div>
                <div className="text-xs font-black text-rose-950">{formatUSD(containerMetrics.totalDirectCost, false, 0)}</div>
                <div className="text-[8px] font-mono text-rose-700">Line + Driver + Port</div>
              </div>

              <div className="border border-slate-900 bg-emerald-50/60 p-2 rounded text-center">
                <div className="text-[8.5px] font-black uppercase text-emerald-950">Net Freight Profit</div>
                <div className="text-xs font-black text-emerald-900">{formatUSD(containerMetrics.totalNetProfit, true, 0)}</div>
                <div className="text-[8px] font-bold text-emerald-800">{formatMargin(containerMetrics.overallMargin)} Margin</div>
              </div>
            </div>
          )}

          {/* 3. Dynamic Report Scope Content */}
          
          {/* Scope A: Container Manifest & Detailed P&L */}
          {(printScope === "all_containers" || printScope === "active") && (
            <div className="space-y-2">
              <table className="reports-print-table w-full text-[9px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-black">
                    <th className="border border-slate-300 p-1 text-center w-6">#</th>
                    <th className="border border-slate-300 p-1 text-left">Container #</th>
                    <th className="border border-slate-300 p-1 text-center">Size</th>
                    <th className="border border-slate-300 p-1 text-center">Trade</th>
                    <th className="border border-slate-300 p-1 text-left">B/L &amp; Shipper</th>
                    <th className="border border-slate-300 p-1 text-left">Consignee</th>
                    <th className="border border-slate-300 p-1 text-left">Route</th>
                    <th className="border border-slate-300 p-1 text-right">Gross WT</th>
                    <th className="border border-slate-300 p-1 text-right">Freight Rev</th>
                    <th className="border border-slate-300 p-1 text-right">Line Cost</th>
                    <th className="border border-slate-300 p-1 text-right">Driver Rent</th>
                    <th className="border border-slate-300 p-1 text-right">Port/Handling</th>
                    <th className="border border-slate-300 p-1 text-right">Total Cost</th>
                    <th className="border border-slate-300 p-1 text-right font-black">Net Profit</th>
                    <th className="border border-slate-300 p-1 text-center">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContainers.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                      <td className="border border-slate-300 p-1 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 font-mono font-bold text-slate-900">{r.containerNo}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">{r.containerSize}</td>
                      <td className="border border-slate-300 p-1 text-center">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                          r.direction === 'Export' ? "bg-emerald-100 text-emerald-900" : r.direction === 'Import' ? "bg-amber-100 text-amber-900" : "bg-purple-100 text-purple-900"
                        }`}>
                          {r.direction}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-1">
                        <div className="font-bold text-slate-900">{r.shipperName || "N/A"}</div>
                        <div className="text-[8px] font-mono text-slate-500">{r.bolNumber}</div>
                      </td>
                      <td className="border border-slate-300 p-1 text-slate-800">{r.consigneeName || "N/A"}</td>
                      <td className="border border-slate-300 p-1 text-[8px] text-slate-600">
                        {r.origin} → {r.destination}
                      </td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{(r.grossWeightKg / 1000).toFixed(1)} MT</td>
                      <td className="border border-slate-300 p-1 text-right font-bold text-blue-950">{formatUSD(r.freightRevenue, false, 0)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{formatUSD(r.shippingCost, false, 0)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-700 font-bold">{r.driverCostDisplay || formatUSD(r.driverCost, false, 0)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{formatUSD(r.handlingCost, false, 0)}</td>
                      <td className="border border-slate-300 p-1 text-right font-bold text-slate-800">{formatUSD(r.totalCost, false, 0)}</td>
                      <td className={`border border-slate-300 p-1 text-right font-black ${
                        r.netProfit >= 0 ? "text-emerald-900 bg-emerald-50/40" : "text-rose-900 bg-rose-50/40"
                      }`}>
                        {formatUSD(r.netProfit, true, 0)}
                      </td>
                      <td className="border border-slate-300 p-1 text-center font-bold text-[8.5px]">
                        {formatMargin(r.profitMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 text-slate-950 font-black border-t-2 border-slate-800">
                    <td colSpan={7} className="border border-slate-400 p-1 text-right uppercase text-[9.5px]">
                      Grand Total ({filteredContainers.length} Containers):
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono">
                      {(containerMetrics.totalGrossWeightKg / 1000).toFixed(1)} MT
                    </td>
                    <td className="border border-slate-400 p-1 text-right text-blue-950 font-black">
                      {formatUSD(containerMetrics.totalGrossRevenue, false, 0)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono">
                      {formatUSD(containerMetrics.shippingLineCostSum, false, 0)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-bold">
                      {formatUSD(containerMetrics.driverFreightCostSum, false, 0)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono">
                      {formatUSD(containerMetrics.borderHandlingCostSum, false, 0)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-black">
                      {formatUSD(containerMetrics.totalDirectCost, false, 0)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right text-emerald-950 font-black bg-emerald-100/70">
                      {formatUSD(containerMetrics.totalNetProfit, true, 0)}
                    </td>
                    <td className="border border-slate-400 p-1 text-center font-black">
                      {formatMargin(containerMetrics.overallMargin)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Scope B: Executive Trade Summary */}
          {printScope === "trade_summary" && (
            <div className="space-y-4">
              <table className="reports-print-table w-full text-[9.5px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-black uppercase">
                    <th className="border border-slate-300 p-1.5 text-left">Trade Metric</th>
                    <th className="border border-slate-300 p-1.5 text-center">Total Overview</th>
                    <th className="border border-slate-300 p-1.5 text-center text-emerald-900">Export (صادرات)</th>
                    <th className="border border-slate-300 p-1.5 text-center text-amber-900">Import (واردات)</th>
                    <th className="border border-slate-300 p-1.5 text-center text-purple-900">Transit (ترانزیت)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-bold">Total Container Boxes</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold">{containerMetrics.totalContainers} Boxes</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-800">{containerMetrics.exportCount} Boxes</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-800">{containerMetrics.importCount} Boxes</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-purple-800">{containerMetrics.transitCount} Boxes</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-1.5 font-bold">TEU Capacity</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">{containerMetrics.totalTEU} TEU</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-emerald-800">{containerMetrics.exportCount * 2} TEU</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-amber-800">{containerMetrics.importCount * 2} TEU</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-purple-800">{containerMetrics.transitCount * 2} TEU</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-bold">Total Cargo Weight</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">{(containerMetrics.totalGrossWeightKg / 1000).toFixed(1)} MT</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-emerald-800">{(containerMetrics.exportWeightKg / 1000).toFixed(1)} MT</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-amber-800">{(containerMetrics.importWeightKg / 1000).toFixed(1)} MT</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-purple-800">-</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-1.5 font-bold">Gross Invoiced Freight ($)</td>
                    <td className="border border-slate-300 p-1.5 text-center font-black text-blue-950">{formatUSD(containerMetrics.totalGrossRevenue, false, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-800">{formatUSD(containerMetrics.exportRevenue, false, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-800">{formatUSD(containerMetrics.importRevenue, false, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-purple-800">{formatUSD(containerMetrics.transitRevenue, false, 0)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-bold">Direct Logistics Costs ($)</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-800">{formatUSD(containerMetrics.totalDirectCost, false, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-emerald-800">{formatUSD(containerMetrics.exportCost, false, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-amber-800">{formatUSD(containerMetrics.importCost, false, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-purple-800">{formatUSD(containerMetrics.transitCost, false, 0)}</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-black">
                    <td className="border border-slate-300 p-1.5">Net Trade Freight Profit ($)</td>
                    <td className="border border-slate-300 p-1.5 text-center text-emerald-950">{formatUSD(containerMetrics.totalNetProfit, true, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-emerald-900">{formatUSD(containerMetrics.exportProfit, true, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-amber-900">{formatUSD(containerMetrics.importProfit, true, 0)}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-purple-900">{formatUSD(containerMetrics.transitProfit, true, 0)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-bold">Profit Margin (%)</td>
                    <td className="border border-slate-300 p-1.5 text-center font-black">{formatMargin(containerMetrics.overallMargin)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-800">{formatMargin(containerMetrics.exportMargin)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-800">{formatMargin(containerMetrics.importMargin)}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-purple-800">-</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-1.5 font-bold">Average Profit / Container</td>
                    <td className="border border-slate-300 p-1.5 text-center font-black text-emerald-950">{formatUSD(containerMetrics.avgProfitPerContainer, true, 0)} / Box</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-800">{formatUSD(containerMetrics.avgExportProfitPerBox, true, 0)} / Box</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-800">{formatUSD(containerMetrics.avgImportProfitPerBox, true, 0)} / Box</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-purple-800">-</td>
                  </tr>
                </tbody>
              </table>

              {/* Commodity Sub-tables */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="border border-slate-300 rounded p-2">
                  <div className="font-black text-[10px] text-emerald-900 uppercase border-b pb-1 mb-1">
                    Top Export Cargoes (اقلام عمده صادراتی)
                  </div>
                  <table className="w-full text-[8.5px]">
                    <tbody>
                      {tradeCommodities.topExports.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="p-0.5 font-bold">{c.name}</td>
                          <td className="p-0.5 text-right font-mono">{c.count} boxes</td>
                          <td className="p-0.5 text-right font-mono">{(c.weight / 1000).toFixed(1)} MT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-300 rounded p-2">
                  <div className="font-black text-[10px] text-amber-900 uppercase border-b pb-1 mb-1">
                    Top Import Cargoes (اقلام عمده وارداتی)
                  </div>
                  <table className="w-full text-[8.5px]">
                    <tbody>
                      {tradeCommodities.topImports.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="p-0.5 font-bold">{c.name}</td>
                          <td className="p-0.5 text-right font-mono">{c.count} boxes</td>
                          <td className="p-0.5 text-right font-mono">{(c.weight / 1000).toFixed(1)} MT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Scope C: Receivables & Balances */}
          {printScope === "company_balances" && (
            <div className="space-y-2">
              <table className="reports-print-table w-full text-[9px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-black">
                    <th className="border border-slate-300 p-1 text-center w-6">#</th>
                    <th className="border border-slate-300 p-1 text-left">Company / Client Name</th>
                    <th className="border border-slate-300 p-1 text-center">Type</th>
                    <th className="border border-slate-300 p-1 text-center">Containers</th>
                    <th className="border border-slate-300 p-1 text-right">Invoiced ($)</th>
                    <th className="border border-slate-300 p-1 text-right">Received ($)</th>
                    <th className="border border-slate-300 p-1 text-right font-black">Outstanding Balance ($)</th>
                    <th className="border border-slate-300 p-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allShippers.map((shipper, idx) => {
                    const matched = filteredContainers.filter(r => r.shipperName.toLowerCase() === shipper.toLowerCase())
                    const totalInv = matched.reduce((s, r) => s + r.freightRevenue, 0)
                    return (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1 font-bold text-slate-900">{shipper}</td>
                        <td className="border border-slate-300 p-1 text-center font-mono text-[8.5px]">Shipper</td>
                        <td className="border border-slate-300 p-1 text-center font-mono">{matched.length}</td>
                        <td className="border border-slate-300 p-1 text-right font-bold text-blue-950">{formatUSD(totalInv, false, 0)}</td>
                        <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">$0</td>
                        <td className="border border-slate-300 p-1 text-right font-black text-rose-900">{formatUSD(totalInv, false, 0)}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-amber-800 text-[8px]">Pending Payment</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Scope D: Logistics OPEX & Direct Expenses */}
          {printScope === "opex_expenses" && (
            <div className="space-y-2">
              <table className="reports-print-table w-full text-[9px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-black">
                    <th className="border border-slate-300 p-1 text-center w-6">#</th>
                    <th className="border border-slate-300 p-1 text-left">Date</th>
                    <th className="border border-slate-300 p-1 text-center">Type</th>
                    <th className="border border-slate-300 p-1 text-left">Category</th>
                    <th className="border border-slate-300 p-1 text-left">Title / Description</th>
                    <th className="border border-slate-300 p-1 text-left">Container / Ref</th>
                    <th className="border border-slate-300 p-1 text-right font-black">Amount ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {customExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 p-4 text-center text-slate-500 font-medium italic">
                        No manual operational expenses recorded.
                      </td>
                    </tr>
                  ) : (
                    customExpenses.map((e, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1 font-mono text-slate-600">{e.date}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold uppercase text-[8px]">
                          <span className={e.type === 'expense' ? "text-rose-800" : "text-emerald-800"}>{e.type}</span>
                        </td>
                        <td className="border border-slate-300 p-1 font-bold text-slate-900">{e.category}</td>
                        <td className="border border-slate-300 p-1 text-slate-800">{e.title}</td>
                        <td className="border border-slate-300 p-1 font-mono text-slate-600">{e.containerNo || e.refNumber || "-"}</td>
                        <td className={`border border-slate-300 p-1 text-right font-black ${
                          e.type === 'expense' ? "text-rose-900" : "text-emerald-900"
                        }`}>
                          {e.type === 'expense' ? `-${formatUSD(e.amount, false, 0)}` : `+${formatUSD(e.amount, false, 0)}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {customExpenses.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-200 text-slate-950 font-black">
                      <td colSpan={6} className="border border-slate-400 p-1 text-right uppercase text-[9.5px]">
                        Net Custom OPEX Impact:
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-black">
                        {formatUSD(containerMetrics.customRevenueSum - containerMetrics.customExpenseSum, true, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 4. Official Signatures & Audit Stamp */}
          {includeSignatures && (
            <div className="flex justify-between items-end pt-8 mt-6 border-t-2 border-slate-800 text-[10px]">
              <div className="text-center w-44">
                <div className="border-b border-slate-400 pb-8"></div>
                <div className="font-bold text-slate-900 mt-1 uppercase">Operations Manager</div>
                <div className="text-[8px] text-slate-500">Logistics &amp; Dispatch</div>
              </div>
              <div className="text-center w-44">
                <div className="border-b border-slate-400 pb-8 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[7px] text-slate-400 uppercase text-center font-mono">
                    Official Stamp
                  </div>
                </div>
                <div className="font-bold text-slate-900 mt-1 uppercase">Chief Financial Officer</div>
                <div className="text-[8px] text-slate-500">Finance &amp; Audit</div>
              </div>
              <div className="text-center w-44">
                <div className="border-b border-slate-400 pb-8"></div>
                <div className="font-bold text-slate-900 mt-1 uppercase">Managing Director</div>
                <div className="text-[8px] text-slate-500">Sky Ariana Limited</div>
              </div>
            </div>
          )}

          {/* Document Footer Note */}
          <div className="text-center text-[7.5px] text-slate-400 font-mono pt-4 mt-2">
            This document is an official confidential export of SKY ARIANA LIMITED management information systems. Generated by SkyBOL v3.2 Enterprise.
          </div>

        </div>
      </ReportPrintPortal>

      {/* =================================================================== */}
      {/* EXCHANGE RATE CONFIGURATION MODAL */}
      {/* =================================================================== */}
      {isRateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Exchange Rate (نرخ تبادله اسعار)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">AFN to USD Currency Normalization</p>
                </div>
              </div>
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Afghan Afghani per 1 USD (افغانی در بدل یک دالر)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="10"
                    max="300"
                    value={tempRateInput}
                    onChange={(e) => setTempRateInput(e.target.value)}
                    className="font-mono font-black text-base h-10 pl-3 pr-16"
                    placeholder="70.0"
                  />
                  <div className="absolute right-3 top-2.5 text-xs font-black text-amber-600 dark:text-amber-400">
                    AFN / $
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  Example: 46,730 AFN driver rent at <strong>{parseFloat(tempRateInput) || 70.0} AFN/USD</strong> ={" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    ${Math.round(46730 / (parseFloat(tempRateInput) || 70.0)).toLocaleString()} USD
                  </strong>
                </p>
              </div>

              {/* Quick Rate Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Market Rate Presets:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[68.0, 70.0, 71.5, 75.0].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTempRateInput(preset.toString())}
                      className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        parseFloat(tempRateInput) === preset
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black"
                          : isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                      }`}
                    >
                      {preset.toFixed(1)} AFN
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRateModalOpen(false)}
                className="text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const val = parseFloat(tempRateInput)
                  if (!isNaN(val)) {
                    handleUpdateExchangeRate(val)
                  }
                }}
                className="text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 cursor-pointer"
              >
                Save &amp; Recalculate Reports
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
