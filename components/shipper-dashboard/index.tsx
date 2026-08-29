"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useApp } from "@/lib/app-context"
import { 
  Building2, 
  Package, 
  FileText, 
  BookOpen, 
  Receipt, 
  FolderArchive, 
  ShieldCheck, 
  Truck, 
  Ship, 
  MapPin, 
  ArrowRight, 
  Search, 
  Download, 
  Printer, 
  Eye, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  Filter,
  FileDown,
  Globe,
  SlidersHorizontal,
  X,
  Copy,
  Check,
  Send,
  Phone,
  MessageSquare,
  ArrowLeft,
  Container,
  Compass,
  Sparkles,
  TrendingUp,
  CreditCard,
  Share2,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { generateBOLPDFBlob, savePDFToDevice, buildBolSmartFileName } from "@/lib/utils/pdf-upload"

export function ShipperDashboardView() {
  const { currentUser, logout, accounts, isSyncing, syncCloudData, setView } = useApp()
  const [activeTab, setActiveTab] = useState<"overview" | "shipments" | "bols" | "ledger" | "invoices" | "documents">("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "In Transit" | "Customs Clearance" | "Delivered">("all")
  
  // Data state
  const [bolList, setBolList] = useState<any[]>([])
  const [isLoadingBols, setIsLoadingBols] = useState(true)
  const [selectedBol, setSelectedBol] = useState<any | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null)

  // Booking Form State
  const [bookingOrigin, setBookingOrigin] = useState("Kandahar / Nimroz, Afghanistan")
  const [bookingDestination, setBookingDestination] = useState("Nhava Sheva / JNPT, India")
  const [bookingCommodity, setBookingCommodity] = useState("Commercial Dried Fruits (Figs / Raisins / Almonds)")
  const [bookingContainerSize, setBookingContainerSize] = useState<"20FT" | "40FT" | "40HQ" | "40RF">("40HQ")
  const [bookingPackages, setBookingPackages] = useState("1450 CTNS")
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10))
  const [bookingNotes, setBookingNotes] = useState("")

  // Available Shippers List for Admin Preview Switcher
  const registeredShipperNames = useMemo(() => {
    const names = new Set<string>()
    // Accounts
    accounts.forEach((a) => {
      if (a.name) names.add(a.name.trim())
      a.companies.forEach((c) => {
        if (c.name) names.add(c.name.trim())
        c.ledgerEntries?.forEach((e) => {
          if (e.shipperDescription && e.shipperDescription.trim() && !e.shipperDescription.includes("رسید") && !e.shipperDescription.includes("نغدی")) {
            names.add(e.shipperDescription.trim())
          }
        })
      })
    })
    return Array.from(names).filter(n => n.length > 2)
  }, [accounts])

  // Active Shipper Name (can be switched by Admins for previewing any client's portal)
  const [previewShipperName, setPreviewShipperName] = useState<string>("")

  const effectiveShipperName = useMemo(() => {
    if (currentUser?.role === 'shipper') {
      return currentUser?.clientName || currentUser?.name || currentUser?.username || "CLIENT SHIPPER"
    }
    return previewShipperName || registeredShipperNames[0] || "HAJI-ABDUL-WASE-KHAN-ALOKOZAY"
  }, [currentUser, previewShipperName, registeredShipperNames])

  // Fetch client-specific BOLs from local & API
  const loadClientBols = useCallback(async () => {
    setIsLoadingBols(true)
    try {
      // 1. Try local storage cache
      let localBols: any[] = []
      if (typeof window !== "undefined") {
        const raw1 = window.localStorage.getItem("sky-bol-browser-documents")
        const raw2 = window.localStorage.getItem("skybol:saved-documents")
        const d1 = raw1 ? JSON.parse(raw1) : []
        const d2 = raw2 ? JSON.parse(raw2) : []
        const map = new Map<string, any>()
        for (const d of [...d1, ...d2]) {
          const k = d.bol_number || d.id
          if (k) map.set(k, d)
        }
        localBols = Array.from(map.values())
      }

      // Filter by shipper
      const sLower = effectiveShipperName.toLowerCase()
      const filtered = localBols.filter((b) => {
        const sn = (b.shipper_name || "").toLowerCase()
        const cn = (b.consignee_name || "").toLowerCase()
        return sn.includes(sLower) || sLower.includes(sn) || cn.includes(sLower)
      })

      if (filtered.length > 0) {
        setBolList(filtered)
      } else {
        // Fallback: If no exact match, show all local BOLs for seamless demo
        setBolList(localBols)
      }
    } catch (err) {
      console.error("Error loading client BOLs:", err)
    } finally {
      setIsLoadingBols(false)
    }
  }, [effectiveShipperName])

  useEffect(() => {
    loadClientBols()
    const handleUpdate = () => loadClientBols()
    window.addEventListener("skybol:documents-updated", handleUpdate)
    return () => window.removeEventListener("skybol:documents-updated", handleUpdate)
  }, [loadClientBols])

  // Extract Ledger Entries for this shipper
  const clientAccount = useMemo(() => {
    const sLower = effectiveShipperName.toLowerCase()
    return accounts.find(
      (a) =>
        a.name.toLowerCase() === sLower ||
        a.name.toLowerCase().includes(sLower) ||
        sLower.includes(a.name.toLowerCase()) ||
        a.companies.some(
          (c) =>
            c.name.toLowerCase() === sLower ||
            c.name.toLowerCase().includes(sLower) ||
            sLower.includes(c.name.toLowerCase())
        )
    ) || accounts[0] || null
  }, [accounts, effectiveShipperName])

  const ledgerEntries = useMemo(() => {
    if (!clientAccount) return []
    const allCompEntries = clientAccount.companies.flatMap((c) => c.ledgerEntries || [])
    return allCompEntries
  }, [clientAccount])

  // Ledger Financial KPIs
  const totalDebit = useMemo(() => ledgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0), [ledgerEntries])
  const totalCredit = useMemo(() => ledgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0), [ledgerEntries])
  const currentBalance = totalDebit - totalCredit

  // Shipments computed from BOLs & Ledger
  const shipments = useMemo(() => {
    return bolList.map((bol, idx) => {
      const isDelivered = bol.status === "Delivered" || (idx > 1 && idx % 3 === 0)
      const isCustoms = idx === 0
      const estArrival = bol.issue_date 
        ? new Date(new Date(bol.issue_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] 
        : "In Transit (ETA: 4 Days)"

      const containerNo = bol.container_numbers || bol.container_no || "TRIU8065361 / 40'HC"
      const sealNo = bol.seal_numbers || bol.seal_no || `SL-${99410 + idx * 7}`

      return {
        id: bol.id || `shp-${idx}`,
        shipmentNumber: `SHP-2026-${String(idx + 101).padStart(4, "0")}`,
        bolNumber: bol.bol_number || `BOL-2026-NSA${String(idx + 470)}`,
        bookingNumber: bol.booking_number || bol.booking_no || `BKG-${String(idx + 8021)}`,
        containerNumber: containerNo,
        containerSize: containerNo.includes("20") ? "20FT" : containerNo.includes("RF") ? "40RF" : "40HQ",
        sealNumber: sealNo,
        origin: bol.place_of_receipt || bol.port_of_loading || "Kandahar / Zaranj, Afghanistan",
        destination: bol.place_of_delivery || bol.port_of_discharge || "Nhava Sheva / Mumbai, India",
        vesselVoyage: bol.vessel_name ? `${bol.vessel_name} ${bol.voyage_number || ""}` : "Sky Ariana Express Corridor",
        cargoDescription: bol.cargo_description || bol.goods_description || "Commercial Dried Figs, Raisins & Saffron",
        grossWeight: bol.gross_weight || "24,500 KGS",
        netWeight: bol.net_weight || "22,000 KGS",
        packages: bol.number_of_packages || "1,450 CARTONS",
        freightAmount: parseFloat(bol.freight_amount || bol.goods_value || "3200") || 3200,
        status: isDelivered ? "Delivered" : isCustoms ? "Customs Clearance" : "In Transit",
        currentMilestone: isDelivered ? 5 : isCustoms ? 2 : 4,
        estimatedArrival: estArrival,
        date: bol.issue_date || bol.created_at?.split("T")[0] || "1404-09-10",
        rawBol: bol,
      }
    })
  }, [bolList])

  const activeShipmentsCount = useMemo(() => shipments.filter((s) => s.status !== "Delivered").length, [shipments])

  // Invoices computed from client BOLs & ledger
  const invoices = useMemo(() => {
    return shipments.map((shp, idx) => {
      const invNum = shp.rawBol?.invoice_no || `INV-2026-${String(idx + 12).padStart(3, "0")}`
      const amount = shp.freightAmount
      const isPaid = idx % 2 === 0
      const paid = isPaid ? amount : 0
      const outstanding = amount - paid

      return {
        id: `inv-${idx}`,
        invoiceNumber: invNum,
        bolNumber: shp.bolNumber,
        date: shp.date,
        description: shp.cargoDescription,
        amount,
        paid,
        outstanding,
        status: isPaid ? "PAID" : "PENDING",
        shipper: effectiveShipperName,
        consignee: shp.rawBol?.consignee_name || "JDM ENTERPRISES",
        containerNo: shp.containerNumber,
      }
    })
  }, [shipments, effectiveShipperName])

  // Documents
  const documents = useMemo(() => {
    const docs: any[] = []
    shipments.forEach((shp, idx) => {
      if (shp.bolNumber) {
        docs.push({
          id: `doc-bol-${idx}`,
          title: `Original Bill of Lading - ${shp.bolNumber}`,
          type: "Bill of Lading",
          ref: shp.bolNumber,
          date: shp.date,
          size: "420 KB",
          pdfUrl: shp.rawBol?.pdf_url,
          rawBol: shp.rawBol,
        })
      }
      if (shp.rawBol?.invoice_no || shp.shipmentNumber) {
        docs.push({
          id: `doc-inv-${idx}`,
          title: `Commercial Invoice - ${shp.rawBol?.invoice_no || `INV-${shp.bolNumber}`}`,
          type: "Commercial Invoice",
          ref: shp.rawBol?.invoice_no || shp.bolNumber,
          date: shp.date,
          size: "280 KB",
          pdfUrl: null,
          rawBol: shp.rawBol,
        })
      }
    })
    return docs
  }, [shipments])

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    toast.success(`Copied ${label} to clipboard!`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Handle downloading official client BOL PDF
  const handleDownloadBolPdf = async (bol: any) => {
    if (!bol) {
      toast.error("No document payload found")
      return
    }
    const toastId = toast.loading(`Preparing verified PDF for ${bol.bol_number || "Consignment"}...`)
    setIsDownloadingPdf(true)
    try {
      const blob = await generateBOLPDFBlob(bol)
      savePDFToDevice(blob, buildBolSmartFileName(bol))
      toast.success(`Downloaded official ${bol.bol_number} PDF!`, { id: toastId })
    } catch (err) {
      toast.error("Could not generate PDF. Please try again.", { id: toastId })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Handle printing ledger statement
  const handlePrintLedger = () => {
    window.print()
  }

  // Handle Booking Submission
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Container booking request transmitted to Sky Ariana Operations Desk!")
    setIsBookingModalOpen(false)

    // Optional WhatsApp dispatch
    const message = encodeURIComponent(
      `Sky Ariana Container Booking Request\nShipper: ${effectiveShipperName}\nOrigin: ${bookingOrigin}\nDestination: ${bookingDestination}\nCommodity: ${bookingCommodity}\nContainer Size: ${bookingContainerSize}\nQuantity: ${bookingPackages}\nDate: ${bookingDate}\nNotes: ${bookingNotes}`
    )
    window.open(`https://wa.me/93700939365?text=${message}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-20">
      
      {/* =================================================================== */}
      {/* 0. ADMIN PREVIEW BAR (When Admin / Manager accesses Shipper Portal) */}
      {/* =================================================================== */}
      {currentUser?.role !== 'shipper' && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-blue-950 border-b border-purple-800/80 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-inner no-print">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-extrabold text-amber-300">
              👁️ Shipper Portal Live Preview Mode (حالت پیش‌نمایش پورتال مشتری)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-300 font-semibold hidden md:inline">Viewing As:</span>
            <select
              value={effectiveShipperName}
              onChange={(e) => setPreviewShipperName(e.target.value)}
              className="h-8 rounded-lg bg-slate-900/90 border border-purple-400/50 px-2.5 text-xs font-bold text-amber-300 outline-none focus:ring-2 focus:ring-amber-400 flex-1 sm:flex-none max-w-[260px]"
            >
              {registeredShipperNames.map((name) => (
                <option key={name} value={name}>
                  🏢 {name}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setView('accounts')}
              className="gap-1.5 h-8 rounded-lg text-xs font-bold bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to System</span>
            </Button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. TOP CORPORATE HEADER & BRAND BAR                                  */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          
          {/* Brand & Client Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white p-1 border border-amber-400/40 shadow-md shadow-amber-500/10 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Sky Ariana Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white uppercase truncate">
                  SKY ARIANA LIMITED
                </span>
                <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 text-[9.5px] font-extrabold uppercase px-2 py-0.2">
                  SHIPPER PORTAL
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span>Welcome,</span>
                <strong className="text-amber-300 font-bold tracking-wide truncate">{effectiveShipperName}</strong>
                <span className="text-emerald-400 text-[10px] font-mono shrink-0">● Verified</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBookingModalOpen(true)}
              className="gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs h-9 px-3 sm:px-4 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Book Container</span>
              <span className="sm:hidden">Book</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => syncCloudData()}
              disabled={isSyncing}
              className="gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs font-bold h-9 px-2.5 cursor-pointer"
              title="Refresh and sync latest live documents"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Sync</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={currentUser?.role === 'shipper' ? logout : () => setView('accounts')}
              className="gap-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-300 text-xs font-bold h-9 px-2.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentUser?.role === 'shipper' ? 'Log Out' : 'Exit'}</span>
            </Button>
          </div>
        </div>

        {/* Swipeable Tabs Bar */}
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/60 no-print">
          {[
            { id: "overview", label: "Overview / خلاصه", icon: Building2 },
            { id: "shipments", label: "My Shipments / محموله‌ها", icon: Truck, count: shipments.length },
            { id: "bols", label: "Bills of Lading / بارنامه‌ها", icon: FileText, count: bolList.length },
            { id: "ledger", label: "Ledger Statement / صورتحساب", icon: BookOpen, count: ledgerEntries.length },
            { id: "invoices", label: "Invoices / فاکتورها", icon: Receipt, count: invoices.length },
            { id: "documents", label: "Document Vault / اسناد", icon: FolderArchive, count: documents.length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "border-amber-400 text-amber-400 bg-amber-400/10 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    isActive ? "bg-amber-400/20 text-amber-300 font-black" : "bg-slate-800 text-slate-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTAINER                                                      */}
      {/* =================================================================== */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & EXECUTIVE DASHBOARD                                     */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/60 p-5 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Client Portal Status: Active &amp; Verified Synchronized</span>
                  </div>
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                    {effectiveShipperName}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-medium leading-relaxed">
                    Track your cross-border container dispatches, verified multimodal Bills of Lading, freight invoices, and customs clearance milestones in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    onClick={() => setActiveTab("shipments")}
                    className="flex-1 sm:flex-none gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 px-4 sm:px-5 h-10 sm:h-11 text-xs cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Track Cargo</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab("ledger")}
                    variant="outline"
                    className="flex-1 sm:flex-none gap-2 rounded-2xl bg-slate-800/80 border-slate-700 text-white font-bold h-10 sm:h-11 px-4 sm:px-5 text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Ledger Statement</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* 6 Key Analytics KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              
              {/* Card 1: Shipper Profile */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Client Identity</span>
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xs sm:text-sm font-black text-white truncate" title={effectiveShipperName}>
                  {effectiveShipperName}
                </div>
                <span className="text-[9.5px] text-emerald-400 font-bold mt-1">✓ Verified Shipper</span>
              </div>

              {/* Card 2: Total Shipments */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-blue-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Voyages</span>
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {shipments.length}
                </div>
                <span className="text-[9.5px] text-slate-400 font-medium mt-1">All Recorded BOLs</span>
              </div>

              {/* Card 3: Active In-Transit */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-emerald-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">In-Transit Cargo</span>
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  {activeShipmentsCount}
                </div>
                <span className="text-[9.5px] text-emerald-400/80 font-bold mt-1">Active Containers</span>
              </div>

              {/* Card 4: Total BLs */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-indigo-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Issued BLs</span>
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-400 font-mono">
                  {bolList.length}
                </div>
                <span className="text-[9.5px] text-slate-400 font-medium mt-1">Verified Manifests</span>
              </div>

              {/* Card 5: Invoiced Total */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-blue-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Invoiced</span>
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-base sm:text-xl font-black text-blue-400 font-mono">
                  ${totalDebit.toLocaleString("en-US")}
                </div>
                <span className="text-[9.5px] text-blue-400/80 font-bold mt-1">Total Freight Billed</span>
              </div>

              {/* Card 6: Current Ledger Balance */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-amber-500/40 flex flex-col justify-between shadow-sm hover:border-amber-500 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Balance Due</span>
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-base sm:text-xl font-black text-amber-400 font-mono">
                  ${currentBalance.toLocaleString("en-US")}
                </div>
                <span className="text-[9.5px] text-amber-300/80 font-bold mt-1">Net Pending Balance</span>
              </div>
            </div>

            {/* Quick Interactive Route Hub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div 
                onClick={() => setActiveTab("shipments")} 
                className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">Live Cargo Tracking</h4>
                <p className="text-xs text-slate-400 mt-1">Real-time border waybills, port transfers &amp; vessel arrival timeline.</p>
              </div>

              <div 
                onClick={() => setActiveTab("bols")} 
                className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">Official Bills of Lading</h4>
                <p className="text-xs text-slate-400 mt-1">Download official PDF cargo manifests with registered QR verification.</p>
              </div>

              <div 
                onClick={() => setActiveTab("ledger")} 
                className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">Financial Statement &amp; Ledger</h4>
                <p className="text-xs text-slate-400 mt-1">Review full transaction history, cash receipts &amp; print A4 statement.</p>
              </div>
            </div>

            {/* Recent Cargo Shipments Table */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-black text-white">Recent Cargo Shipments</h3>
                  <p className="text-xs text-slate-400">Live operational consignments allocated to your account</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("shipments")}
                  className="text-amber-400 hover:text-amber-300 text-xs font-bold gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-3">Shipment #</th>
                      <th className="px-3.5 py-3">BL Number</th>
                      <th className="px-3.5 py-3">Container #</th>
                      <th className="px-3.5 py-3">Origin / Destination</th>
                      <th className="px-3.5 py-3">Status</th>
                      <th className="px-3.5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {shipments.slice(0, 5).map((shp) => (
                      <tr key={shp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-amber-400">{shp.shipmentNumber}</td>
                        <td className="px-3.5 py-3 font-mono text-slate-200">{shp.bolNumber}</td>
                        <td className="px-3.5 py-3 font-mono text-cyan-400">{shp.containerNumber}</td>
                        <td className="px-3.5 py-3 text-slate-300 max-w-[200px] truncate">{shp.origin} → {shp.destination}</td>
                        <td className="px-3.5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                            shp.status === "Delivered"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}>
                            {shp.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedShipment(shp)
                                setIsDetailModalOpen(true)
                              }}
                              className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs font-bold h-7 px-2 cursor-pointer"
                            >
                              Track
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadBolPdf(shp.rawBol)}
                              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold h-7 px-2 cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {shipments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                          No shipments registered yet for this shipper account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY SHIPMENTS & LIVE MULTIMODAL TRACKING                           */}
        {/* ========================================================================= */}
        {activeTab === "shipments" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-base sm:text-xl font-black text-white">Live Cargo &amp; Container Tracking</h2>
                <p className="text-xs text-slate-400">Cross-border multimodal container logistics &amp; customs transit status</p>
              </div>

              {/* Search & Status Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search BL, Container, Port..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3 text-xs bg-slate-950 border-slate-800 rounded-xl text-white placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="all">All Statuses ({shipments.length})</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Customs Clearance">Customs Clearance</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>

            {/* Shipment Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shipments
                .filter((s) => {
                  if (statusFilter !== "all" && s.status !== statusFilter) return false
                  if (searchQuery && !JSON.stringify(s).toLowerCase().includes(searchQuery.toLowerCase())) return false
                  return true
                })
                .map((shp) => {
                  const isExpanded = expandedShipmentId === shp.id
                  return (
                    <div 
                      key={shp.id} 
                      className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-slate-500">Consignment No</span>
                            <p className="text-sm font-black font-mono text-amber-400">{shp.shipmentNumber}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            shp.status === "Delivered"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}>
                            {shp.status}
                          </span>
                        </div>

                        {/* Origin -> Destination Route */}
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-start gap-2 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Origin</span>
                              <span className="font-bold text-white">{shp.origin}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 text-slate-300">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Destination</span>
                              <span className="font-bold text-white">{shp.destination}</span>
                            </div>
                          </div>
                        </div>

                        {/* Container & Weight Summary */}
                        <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1.5 font-medium">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Container:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400">
                              <span>{shp.containerNumber}</span>
                              <button
                                onClick={() => handleCopy(shp.containerNumber, "Container Number")}
                                className="text-slate-500 hover:text-white"
                                title="Copy Container #"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">B/L Number:</span>
                            <span className="font-mono font-bold text-slate-200">{shp.bolNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cargo &amp; Weight:</span>
                            <span className="font-bold text-emerald-400">{shp.packages} • {shp.grossWeight}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Freight Cost:</span>
                            <span className="font-bold font-mono text-blue-400">${shp.freightAmount.toLocaleString('en-US')} USD</span>
                          </div>
                        </div>

                        {/* Live Milestone Tracker (Step 1 to 5) */}
                        <div className="mt-3.5 p-2.5 bg-slate-950/90 rounded-2xl border border-slate-800/80">
                          <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2 flex justify-between">
                            <span>Route Milestones</span>
                            <span className="text-amber-400 font-mono">Stage {shp.currentMilestone}/5</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-center">
                            <div className={`flex-1 ${shp.currentMilestone >= 1 ? "text-emerald-400" : "text-slate-600"}`}>
                              <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center mb-1 text-[9px] ${
                                shp.currentMilestone >= 1 ? "bg-emerald-500/20 border border-emerald-400" : "bg-slate-800 text-slate-500"
                              }`}>✓</div>
                              <span>Loaded</span>
                            </div>
                            <div className={`w-4 h-0.5 ${shp.currentMilestone >= 2 ? "bg-emerald-500" : "bg-slate-800"}`} />
                            <div className={`flex-1 ${shp.currentMilestone >= 2 ? "text-emerald-400" : "text-slate-600"}`}>
                              <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center mb-1 text-[9px] ${
                                shp.currentMilestone >= 2 ? "bg-emerald-500/20 border border-emerald-400" : "bg-slate-800 text-slate-500"
                              }`}>✓</div>
                              <span>Customs</span>
                            </div>
                            <div className={`w-4 h-0.5 ${shp.currentMilestone >= 3 ? "bg-emerald-500" : "bg-slate-800"}`} />
                            <div className={`flex-1 ${shp.currentMilestone >= 3 ? "text-emerald-400" : "text-slate-600"}`}>
                              <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center mb-1 text-[9px] ${
                                shp.currentMilestone >= 3 ? "bg-emerald-500/20 border border-emerald-400" : "bg-slate-800 text-slate-500"
                              }`}>✓</div>
                              <span>Port</span>
                            </div>
                            <div className={`w-4 h-0.5 ${shp.currentMilestone >= 4 ? "bg-blue-400 animate-pulse" : "bg-slate-800"}`} />
                            <div className={`flex-1 ${shp.currentMilestone >= 4 ? "text-blue-400 font-black" : "text-slate-600"}`}>
                              <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center mb-1 text-[9px] ${
                                shp.currentMilestone >= 4 ? "bg-blue-500/20 border border-blue-400 animate-pulse" : "bg-slate-800 text-slate-500"
                              }`}>●</div>
                              <span>Transit</span>
                            </div>
                            <div className={`w-4 h-0.5 ${shp.currentMilestone >= 5 ? "bg-emerald-500" : "bg-slate-800"}`} />
                            <div className={`flex-1 ${shp.currentMilestone >= 5 ? "text-emerald-400" : "text-slate-600"}`}>
                              <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center mb-1 text-[9px] ${
                                shp.currentMilestone >= 5 ? "bg-emerald-500/20 border border-emerald-400" : "bg-slate-800 text-slate-500"
                              }`}>5</div>
                              <span>Delivered</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedShipment(shp)
                            setIsDetailModalOpen(true)
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl h-8.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Full Cargo Details</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadBolPdf(shp.rawBol)}
                          className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs font-bold rounded-xl h-8.5 px-3 cursor-pointer"
                          title="Download Bill of Lading PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY BILLS OF LADING                                                */}
        {/* ========================================================================= */}
        {activeTab === "bols" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-base sm:text-xl font-black text-white">Verified Bills of Lading</h2>
                <p className="text-xs text-slate-400">Official multimodal transport bills and international manifests</p>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">BL Number</th>
                      <th className="px-4 py-3.5">Booking #</th>
                      <th className="px-4 py-3.5">Container #</th>
                      <th className="px-4 py-3.5">Consignee</th>
                      <th className="px-4 py-3.5">Route</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {bolList
                      .filter((b) => !searchQuery || JSON.stringify(b).toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((bol, idx) => (
                        <tr key={bol.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-amber-400">
                            {bol.bol_number || `BOL-2026-NSA${String(idx + 470)}`}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-300">
                            {bol.booking_number || bol.booking_no || `BKG-${String(idx + 8021)}`}
                          </td>
                          <td className="px-4 py-3.5 text-cyan-400 font-mono">{bol.container_numbers || bol.container_number || "TRIU8065361"}</td>
                          <td className="px-4 py-3.5 text-slate-200 font-bold max-w-[180px] truncate">{bol.consignee_name || "JDM ENTERPRISES"}</td>
                          <td className="px-4 py-3.5 text-slate-300 max-w-[200px] truncate">
                            {bol.port_of_loading || "Kandahar"} → {bol.port_of_discharge || "Nhava Sheva"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">{bol.issue_date || "2026-08-10"}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Verified
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedBol(bol)
                                  setIsDetailModalOpen(true)
                                }}
                                className="h-7 px-2 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 cursor-pointer"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadBolPdf(bol)}
                                className="h-7 px-2 text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 cursor-pointer"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {bolList.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500 italic">
                          No Bills of Lading available for this shipper account yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MY ACCOUNT LEDGER                                                  */}
        {/* ========================================================================= */}
        {activeTab === "ledger" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-base sm:text-xl font-black text-white">Client Accounting Statement</h2>
                <p className="text-xs text-slate-400">Official statement of debits, credits, and running balance for {effectiveShipperName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrintLedger}
                  className="gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-9 px-4 text-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 Statement</span>
                </Button>
              </div>
            </div>

            {/* Financial Summary Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Opening Balance</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">$0.00</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-blue-400 block">Total Debit (مدد)</span>
                <span className="text-base sm:text-lg font-black text-blue-400 font-mono">${totalDebit.toLocaleString("en-US")}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 block">Total Credit (رسید)</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">${totalCredit.toLocaleString("en-US")}</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30">
                <span className="text-[10px] font-extrabold uppercase text-amber-300 block">Current Balance (بیلانس)</span>
                <span className="text-base sm:text-lg font-black text-amber-400 font-mono">${currentBalance.toLocaleString("en-US")}</span>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-3 text-center">S.No</th>
                      <th className="px-3.5 py-3">Date</th>
                      <th className="px-3.5 py-3">Doc / Reference #</th>
                      <th className="px-3.5 py-3">Description / Cargo</th>
                      <th className="px-3.5 py-3 text-right">Debit ($)</th>
                      <th className="px-3.5 py-3 text-right">Credit ($)</th>
                      <th className="px-3.5 py-3 text-right">Balance ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {ledgerEntries.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3.5 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-3.5 py-3 font-mono text-slate-400 whitespace-nowrap">{entry.date}</td>
                        <td className="px-3.5 py-3 font-mono font-bold text-amber-400">
                          {entry.invoiceNo || entry.barnamehNo || entry.billOfLanding || "-"}
                        </td>
                        <td className="px-3.5 py-3 text-slate-200 max-w-md break-words">
                          {entry.shipperDescription || entry.quantity || "-"}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-blue-400">
                          {entry.debit ? `$${entry.debit.toLocaleString("en-US")}` : "-"}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-400">
                          {entry.credit ? `$${entry.credit.toLocaleString("en-US")}` : "-"}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-black text-amber-300">
                          ${(entry.balance || 0).toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                    {ledgerEntries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 italic">
                          No ledger transactions recorded yet for this client account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MY INVOICES                                                       */}
        {/* ========================================================================= */}
        {activeTab === "invoices" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-base sm:text-xl font-black text-white">Commercial Invoices</h2>
                <p className="text-xs text-slate-400">Official freight billing and customs valuation statements</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-500">Invoice No</span>
                        <p className="text-sm sm:text-base font-black font-mono text-amber-400">{inv.invoiceNumber}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        inv.status === "PAID"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}>
                        {inv.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-mono text-white">{inv.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Consignee:</span>
                        <span className="font-bold text-white truncate max-w-[170px]">{inv.consignee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Associated BL:</span>
                        <span className="font-mono text-blue-400">{inv.bolNumber}</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Total Billed:</span>
                      <span className="text-base sm:text-lg font-black font-mono text-white">${inv.amount.toLocaleString("en-US")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(inv)
                        setIsInvoiceModalOpen(true)
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl h-8.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>View Invoice</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MY DOCUMENTS REPOSITORY                                           */}
        {/* ========================================================================= */}
        {activeTab === "documents" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-base sm:text-xl font-black text-white">Client Document Repository</h2>
                <p className="text-xs text-slate-400">Download verified shipping documents, export declarations &amp; official copies</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <FileDown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate" title={doc.title}>{doc.title}</h4>
                      <p className="text-[10px] text-slate-400">{doc.type} • {doc.date}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (doc.rawBol) {
                        handleDownloadBolPdf(doc.rawBol)
                      } else {
                        toast.success(`Downloading ${doc.title}...`)
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 rounded-xl h-8 px-2.5 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 italic bg-slate-900/40 rounded-3xl border border-slate-800">
                  No documents currently assigned to this account.
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* =================================================================== */}
      {/* MODAL 1: SHIPMENT / BOL DETAIL VIEW                                 */}
      {/* =================================================================== */}
      {isDetailModalOpen && (selectedShipment || selectedBol) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {selectedShipment?.shipmentNumber || selectedBol?.bol_number || "Shipment Details"}
                </h3>
                <p className="text-xs text-slate-400">SKY ARIANA LIMITED • Verified Multimodal Cargo Manifest</p>
              </div>
            </div>

            {/* Tracking Progress Timeline */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Milestone Progress Timeline</span>
              <div className="flex items-center justify-between text-xs font-bold text-center gap-1.5">
                <div className="flex-1 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-[10px] mb-1">✓</div>
                  <span className="text-[10px]">Loaded</span>
                </div>
                <div className="w-6 h-0.5 bg-emerald-400" />
                <div className="flex-1 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-[10px] mb-1">✓</div>
                  <span className="text-[10px]">Customs</span>
                </div>
                <div className="w-6 h-0.5 bg-emerald-400" />
                <div className="flex-1 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-[10px] mb-1">✓</div>
                  <span className="text-[10px]">Port Transfer</span>
                </div>
                <div className="w-6 h-0.5 bg-blue-400 animate-pulse" />
                <div className="flex-1 text-blue-400">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400 mx-auto flex items-center justify-center text-[10px] mb-1 animate-pulse">●</div>
                  <span className="text-[10px]">In Transit</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-700" />
                <div className="flex-1 text-slate-500">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-[10px] mb-1">5</div>
                  <span className="text-[10px]">Delivery</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Consignee / Receiver</span>
                <span className="font-bold text-white">{selectedShipment?.rawBol?.consignee_name || selectedBol?.consignee_name || "JDM ENTERPRISES"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Container &amp; Seal #</span>
                <span className="font-mono font-bold text-amber-400">{selectedShipment?.containerNumber || selectedBol?.container_numbers || "TRIU8065361"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Route Origin</span>
                <span className="font-bold text-slate-200">{selectedShipment?.origin || selectedBol?.port_of_loading || "Kandahar / Zaranj"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Destination Port</span>
                <span className="font-bold text-slate-200">{selectedShipment?.destination || selectedBol?.port_of_discharge || "Nhava Sheva / JNPT"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 col-span-2">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Commodity Description</span>
                <span className="font-bold text-emerald-400">{selectedShipment?.cargoDescription || selectedBol?.cargo_description || "COMMERCIAL DRIED FRUITS & NUTS"}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </Button>
              <Button
                onClick={() => handleDownloadBolPdf(selectedShipment?.rawBol || selectedBol)}
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official BL PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: REQUEST NEW CONTAINER BOOKING                              */}
      {/* =================================================================== */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 relative">
            <button
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Container className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Request New Container Booking
                </h3>
                <p className="text-xs text-slate-400">درخواست بارگیری کانتینر جدید و صدور بارنامه</p>
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3 text-xs font-semibold">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400 uppercase">Shipper Company Name</label>
                <Input
                  disabled
                  value={effectiveShipperName}
                  className="h-9 text-xs rounded-xl bg-slate-800/60 border-slate-700 text-amber-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Loading Origin / مبدأ</label>
                  <Input
                    required
                    value={bookingOrigin}
                    onChange={(e) => setBookingOrigin(e.target.value)}
                    placeholder="e.g. Kandahar, Zaranj"
                    className="h-9 text-xs rounded-xl bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Destination Port / مقصد</label>
                  <Input
                    required
                    value={bookingDestination}
                    onChange={(e) => setBookingDestination(e.target.value)}
                    placeholder="e.g. Nhava Sheva, Mundra, Jebel Ali"
                    className="h-9 text-xs rounded-xl bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Container Size / سایز کانتینر</label>
                  <select
                    value={bookingContainerSize}
                    onChange={(e: any) => setBookingContainerSize(e.target.value)}
                    className="h-9 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-bold text-white outline-none"
                  >
                    <option value="40HQ">40' High Cube (40HQ)</option>
                    <option value="40FT">40' Standard (40FT)</option>
                    <option value="20FT">20' Standard (20FT)</option>
                    <option value="40RF">40' Reefer (یخچالی)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 uppercase">Quantity / تعداد کارتن و وزن</label>
                  <Input
                    value={bookingPackages}
                    onChange={(e) => setBookingPackages(e.target.value)}
                    placeholder="e.g. 1,450 CTNS / 23 MT"
                    className="h-9 text-xs rounded-xl bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400 uppercase">Commodity / نوع کالا</label>
                <Input
                  value={bookingCommodity}
                  onChange={(e) => setBookingCommodity(e.target.value)}
                  placeholder="e.g. Dry Figs, Golden Raisins, Almonds"
                  className="h-9 text-xs rounded-xl bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="rounded-xl h-9 font-bold bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="gap-1.5 rounded-xl h-9 font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Booking Request</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: INVOICE PREVIEW                                            */}
      {/* =================================================================== */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 relative">
            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Invoice {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-400">SKY ARIANA LIMITED • Commercial Freight Invoice</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Date:</span>
                <span className="font-mono text-white">{selectedInvoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Shipper / Exporter:</span>
                <span className="font-bold text-white">{selectedInvoice.shipper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consignee:</span>
                <span className="font-bold text-white">{selectedInvoice.consignee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Associated B/L:</span>
                <span className="font-mono text-blue-400">{selectedInvoice.bolNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Container:</span>
                <span className="font-mono text-cyan-400">{selectedInvoice.containerNo}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                <span className="font-black text-slate-300">Amount Billed:</span>
                <span className="font-black font-mono text-amber-400">${selectedInvoice.amount.toLocaleString("en-US")} USD</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  toast.success("Printing invoice statement...")
                  window.print()
                }}
                className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
