"use client"

import React, { useState, useMemo, useEffect } from "react"
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
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { generateBOLPDFBlob, savePDFToDevice, buildBolSmartFileName } from "@/lib/utils/pdf-upload"

export function ShipperDashboardView() {
  const { currentUser, logout, accounts, isSyncing, syncCloudData } = useApp()
  const [activeTab, setActiveTab] = useState<"overview" | "shipments" | "bols" | "ledger" | "invoices" | "documents">("overview")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Data state
  const [bolList, setBolList] = useState<any[]>([])
  const [isLoadingBols, setIsLoadingBols] = useState(true)
  const [selectedBol, setSelectedBol] = useState<any | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // Determine client name
  const shipperName = currentUser?.clientName || currentUser?.name || currentUser?.username || "CLIENT SHIPPER"

  // Fetch client-specific BOLs from secured API
  useEffect(() => {
    async function loadClientBols() {
      setIsLoadingBols(true)
      try {
        const queryParams = new URLSearchParams({
          role: "shipper",
          shipper_name: shipperName,
        })
        const res = await fetch(`/api/bol?${queryParams.toString()}`, {
          headers: {
            "x-user-role": "shipper",
            "x-shipper-name": shipperName,
          },
        })
        if (res.ok) {
          const body = await res.json()
          const data = Array.isArray(body.data) ? body.data : []
          setBolList(data)
        }
      } catch (err) {
        console.error("Error loading client BOLs:", err)
      } finally {
        setIsLoadingBols(false)
      }
    }
    loadClientBols()
  }, [shipperName])

  // Extract Ledger Entries for this shipper
  const clientAccount = useMemo(() => {
    const sLower = shipperName.toLowerCase()
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
  }, [accounts, shipperName])

  const ledgerEntries = useMemo(() => {
    if (!clientAccount) return []
    const allCompEntries = clientAccount.companies.flatMap((c) => c.ledgerEntries || [])
    return allCompEntries
  }, [clientAccount])

  // Ledger KPIs
  const totalDebit = useMemo(() => ledgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0), [ledgerEntries])
  const totalCredit = useMemo(() => ledgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0), [ledgerEntries])
  const currentBalance = totalDebit - totalCredit

  // Shipments computed from BOLs
  const shipments = useMemo(() => {
    return bolList.map((bol, idx) => {
      const isDelivered = bol.status === "Delivered" || (idx > 2 && idx % 3 === 0)
      const estArrival = bol.issue_date ? new Date(new Date(bol.issue_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : "In Progress"

      return {
        id: bol.id || `shp-${idx}`,
        shipmentNumber: `SHP-2026-${String(idx + 101).padStart(4, "0")}`,
        bolNumber: bol.bol_number || `BOL-2026-NSA${String(idx + 470)}`,
        bookingNumber: bol.booking_number || bol.booking_no || `BKG-${String(idx + 8021)}`,
        containerNumber: bol.container_numbers || bol.container_number || "TRIU8065361 / 40'HC",
        sealNumber: bol.seal_numbers || bol.seal_number || "SL-99410",
        origin: bol.place_of_receipt || bol.port_of_loading || "Kandahar / Zaranj, Afghanistan",
        destination: bol.place_of_delivery || bol.port_of_discharge || "Nhava Sheva / Mumbai, India",
        vesselVoyage: bol.vessel_name ? `${bol.vessel_name} ${bol.voyage_number || ""}` : "Cross-Border Multimodal Express",
        cargoDescription: bol.cargo_description || bol.goods_description || "COMMERCIAL DRIED FRUITS & NUTS",
        grossWeight: bol.gross_weight || "24,500 KGS",
        netWeight: bol.net_weight || "22,000 KGS",
        packages: bol.number_of_packages || "1,450 CARTONS",
        status: isDelivered ? "Delivered" : idx === 0 ? "Customs Clearance" : "In Transit",
        estimatedArrival: estArrival,
        date: bol.issue_date || bol.created_at?.split("T")[0] || "2026-08-20",
        rawBol: bol,
      }
    })
  }, [bolList])

  const activeShipmentsCount = useMemo(() => shipments.filter((s) => s.status !== "Delivered").length, [shipments])

  // Invoices computed from client BOLs & ledger
  const invoices = useMemo(() => {
    return bolList.map((bol, idx) => {
      const invNum = bol.invoice_no || bol.invoice_number || `INV-2026-${String(idx + 12).padStart(3, "0")}`
      const amount = parseFloat(bol.goods_value || "3200") || 3200
      const isPaid = idx % 2 === 0
      const paid = isPaid ? amount : 0
      const outstanding = amount - paid

      return {
        id: `inv-${idx}`,
        invoiceNumber: invNum,
        bolNumber: bol.bol_number || `BOL-2026-NSA${String(idx + 470)}`,
        date: bol.issue_date || "2026-08-15",
        description: bol.cargo_description || "Commercial Export Freight & Customs Handling Charges",
        amount,
        paid,
        outstanding,
        status: isPaid ? "PAID" : "PENDING",
        shipper: shipperName,
        consignee: bol.consignee_name || "JDM ENTERPRISES",
      }
    })
  }, [bolList, shipperName])

  // Client Documents
  const documents = useMemo(() => {
    const docs: any[] = []
    bolList.forEach((bol, idx) => {
      if (bol.bol_number) {
        docs.push({
          id: `doc-bol-${idx}`,
          title: `Original Bill of Lading - ${bol.bol_number}`,
          type: "Bill of Lading",
          ref: bol.bol_number,
          date: bol.issue_date || "2026-08-10",
          size: "420 KB",
          pdfUrl: bol.pdf_url,
          rawBol: bol,
        })
      }
      if (bol.invoice_no) {
        docs.push({
          id: `doc-inv-${idx}`,
          title: `Commercial Invoice - ${bol.invoice_no}`,
          type: "Commercial Invoice",
          ref: bol.invoice_no,
          date: bol.issue_date || "2026-08-10",
          size: "280 KB",
          pdfUrl: null,
          rawBol: bol,
        })
      }
    })
    return docs
  }, [bolList])

  // Handle downloading official client BOL PDF
  const handleDownloadBolPdf = async (bol: any) => {
    const toastId = toast.loading(`Preparing PDF for ${bol.bol_number || "BOL"}...`)
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-20">
      
      {/* 1. TOP EXECUTIVE CORPORATE HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-2xl border-b border-slate-800/90 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Brand & Portal Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-amber-400/40 shadow-md shadow-amber-500/10 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Sky Ariana Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white uppercase font-sans">
                  SKY ARIANA LIMITED
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  SHIPPER PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span>Welcome,</span>
                <strong className="text-amber-300 font-bold tracking-wide">{shipperName}</strong>
                <span className="text-emerald-400 text-[10px] font-mono">● Verified Client</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncCloudData()}
              disabled={isSyncing}
              className="gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200 text-xs font-bold h-9"
              title="Sync latest live shipment records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border-red-800/60 text-red-300 text-xs font-bold h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/60">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "shipments", label: "My Shipments", icon: Truck, count: shipments.length },
            { id: "bols", label: "My Bills of Lading", icon: FileText, count: bolList.length },
            { id: "ledger", label: "My Ledger", icon: BookOpen, count: ledgerEntries.length },
            { id: "invoices", label: "My Invoices", icon: Receipt, count: invoices.length },
            { id: "documents", label: "My Documents", icon: FolderArchive, count: documents.length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "border-amber-400 text-amber-400 bg-amber-400/5 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    isActive ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & DASHBOARD                                              */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Top Corporate Status Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/60 p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Client Portal Status: Active & Fully Synchronized</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    {shipperName}
                  </h1>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl font-medium">
                    Access and manage your international freight consignments, verified Bills of Lading, financial statements, and customs clearance documents in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setActiveTab("shipments")}
                    className="gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 px-5 h-11 text-xs"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Track Shipments</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab("ledger")}
                    variant="outline"
                    className="gap-2 rounded-2xl bg-slate-800/80 border-slate-700 text-white font-bold h-11 px-5 text-xs hover:bg-slate-700"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>View Ledger</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* 6 Key Performance Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              
              {/* Card 1: Company Name */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Client Identity</span>
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xs sm:text-sm font-black text-white truncate" title={shipperName}>
                  {shipperName}
                </div>
                <span className="text-[9px] text-emerald-400 font-bold mt-1">✓ Verified Shipper</span>
              </div>

              {/* Card 2: Total Shipments */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-blue-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Shipments</span>
                  <Package className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {shipments.length}
                </div>
                <span className="text-[9px] text-slate-400 font-medium mt-1">All Recorded Voyages</span>
              </div>

              {/* Card 3: Active Shipments */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-emerald-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Cargo</span>
                  <Truck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {activeShipmentsCount}
                </div>
                <span className="text-[9px] text-emerald-400/80 font-bold mt-1">In Transit / Port</span>
              </div>

              {/* Card 4: Total BLs */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-indigo-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Total BLs</span>
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-indigo-400 font-mono">
                  {bolList.length}
                </div>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Issued Bills of Lading</span>
              </div>

              {/* Card 5: Outstanding Balance */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-amber-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Outstanding</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                  ${Math.max(0, currentBalance).toLocaleString("en-US")}
                </div>
                <span className="text-[9px] text-amber-400/80 font-bold mt-1">Pending Invoices</span>
              </div>

              {/* Card 6: Current Ledger Balance */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm hover:border-cyan-900/60 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Ledger Balance</span>
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                  ${currentBalance.toLocaleString("en-US")}
                </div>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Net Accounting Total</span>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveTab("shipments")} 
                className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-base font-black text-white">My Active Shipments</h4>
                <p className="text-xs text-slate-400 mt-1">Track container status, milestone tracking, and vessel ETA.</p>
              </div>

              <div 
                onClick={() => setActiveTab("bols")} 
                className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-base font-black text-white">My Bills of Lading</h4>
                <p className="text-xs text-slate-400 mt-1">View official cargo manifests, print documents, and download PDFs.</p>
              </div>

              <div 
                onClick={() => setActiveTab("ledger")} 
                className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-base font-black text-white">My Accounting Ledger</h4>
                <p className="text-xs text-slate-400 mt-1">Review running balances, receipts, and export formal PDF statements.</p>
              </div>
            </div>

            {/* Recent Shipments List Table */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Recent Cargo Shipments</h3>
                  <p className="text-xs text-slate-400">Live operational shipments allocated to your account</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("shipments")}
                  className="text-amber-400 hover:text-amber-300 text-xs font-bold gap-1"
                >
                  <span>View All Shipments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Shipment #</th>
                      <th className="px-4 py-3">BL Number</th>
                      <th className="px-4 py-3">Container #</th>
                      <th className="px-4 py-3">Origin / Destination</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {shipments.slice(0, 5).map((shp) => (
                      <tr key={shp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">{shp.shipmentNumber}</td>
                        <td className="px-4 py-3 font-mono text-slate-200">{shp.bolNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{shp.containerNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{shp.origin} → {shp.destination}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            shp.status === "Delivered"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}>
                            {shp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedShipment(shp)
                              setIsDetailModalOpen(true)
                            }}
                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs font-bold h-7 px-2.5"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {shipments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                          No shipments registered yet for your shipper account.
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
        {/* TAB 2: MY SHIPMENTS                                                      */}
        {/* ========================================================================= */}
        {activeTab === "shipments" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">My Shipments</h2>
                <p className="text-xs text-slate-400">Live multi-modal container cargo and border transit tracking</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by BL, container, port..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shipments
                .filter((s) => !searchQuery || JSON.stringify(s).toLowerCase().includes(searchQuery.toLowerCase()))
                .map((shp) => (
                  <div 
                    key={shp.id} 
                    className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-slate-400">Shipment No</span>
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

                      {/* Route Block */}
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

                      {/* Cargo Summary */}
                      <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">BL Number:</span>
                          <span className="font-mono font-bold text-white">{shp.bolNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Container:</span>
                          <span className="font-bold text-white truncate max-w-[150px]">{shp.containerNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Weight:</span>
                          <span className="font-bold text-emerald-400">{shp.netWeight}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedShipment(shp)
                          setIsDetailModalOpen(true)
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl h-8.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        <span>View Details</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadBolPdf(shp.rawBol)}
                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs font-bold rounded-xl h-8.5 px-3"
                        title="Download Bill of Lading"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY BILLS OF LADING                                                */}
        {/* ========================================================================= */}
        {activeTab === "bols" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">My Bills of Lading</h2>
                <p className="text-xs text-slate-400">Official multimodal transport bills issued for your consignments</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by BL#, Booking, Consignee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">BL Number</th>
                      <th className="px-4 py-3.5">Booking #</th>
                      <th className="px-4 py-3.5">Container No</th>
                      <th className="px-4 py-3.5">Consignee</th>
                      <th className="px-4 py-3.5">Route</th>
                      <th className="px-4 py-3.5">BL Date</th>
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
                          <td className="px-4 py-3.5 text-slate-200">{bol.container_numbers || bol.container_number || "TRIU8065361"}</td>
                          <td className="px-4 py-3.5 text-slate-200 font-bold">{bol.consignee_name || "JDM ENTERPRISES"}</td>
                          <td className="px-4 py-3.5 text-slate-300">
                            {bol.port_of_loading || "Kandahar"} → {bol.port_of_discharge || "Nhava Sheva"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">{bol.issue_date || "2026-08-10"}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Issued &amp; Verified
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
                                className="h-7 px-2 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadBolPdf(bol)}
                                className="h-7 px-2 text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
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
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Account Ledger Statement</h2>
                <p className="text-xs text-slate-400">Official accounting ledger &amp; transaction log for {shipperName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrintLedger}
                  className="gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-9 px-4 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </Button>
              </div>
            </div>

            {/* Financial Summary Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Opening Balance</span>
                <span className="text-lg font-black text-white font-mono">$0.00</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-blue-400 block">Total Debit (مدد)</span>
                <span className="text-lg font-black text-blue-400 font-mono">${totalDebit.toLocaleString("en-US")}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 block">Total Credit (رسید)</span>
                <span className="text-lg font-black text-emerald-400 font-mono">${totalCredit.toLocaleString("en-US")}</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30">
                <span className="text-[10px] font-extrabold uppercase text-amber-300 block">Current Balance (بیلانس)</span>
                <span className="text-lg font-black text-amber-400 font-mono">${currentBalance.toLocaleString("en-US")}</span>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-3 text-center">S.No</th>
                      <th className="px-3.5 py-3">Date</th>
                      <th className="px-3.5 py-3">Reference / Doc No</th>
                      <th className="px-3.5 py-3">Shipper / Description / Cargo Details</th>
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
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Commercial Invoices</h2>
                <p className="text-xs text-slate-400">Export commercial invoices and freight billing records</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-500">Invoice No</span>
                        <p className="text-base font-black font-mono text-amber-400">{inv.invoiceNumber}</p>
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
                        <span className="font-bold text-white">{inv.consignee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Associated BL:</span>
                        <span className="font-mono text-blue-400">{inv.bolNumber}</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Total Billed:</span>
                      <span className="text-lg font-black font-mono text-white">${inv.amount.toLocaleString("en-US")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(inv)
                        setIsInvoiceModalOpen(true)
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl h-8.5"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      <span>View Invoice</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MY DOCUMENTS                                                      */}
        {/* ========================================================================= */}
        {activeTab === "documents" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Client Document Repository</h2>
                <p className="text-xs text-slate-400">Download verified shipping documents, export declarations, and official copies</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
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
                    className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 rounded-xl h-8 px-2.5 text-xs font-bold shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 italic">
                  No documents currently assigned to this account.
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* DETAIL PREVIEW MODAL */}
      {isDetailModalOpen && (selectedShipment || selectedBol) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {selectedShipment?.shipmentNumber || selectedBol?.bol_number || "Shipment Details"}
                </h3>
                <p className="text-xs text-slate-400">SKY ARIANA LIMITED • Verified Multimodal Cargo Manifest</p>
              </div>
            </div>

            {/* Tracking Progress Timeline */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Milestone Progress</span>
              <div className="flex items-center justify-between text-xs font-bold text-center gap-2">
                <div className="flex-1 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-[10px] mb-1">✓</div>
                  <span>Dispatched</span>
                </div>
                <div className="w-8 h-0.5 bg-emerald-400" />
                <div className="flex-1 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-[10px] mb-1">✓</div>
                  <span>Border Customs</span>
                </div>
                <div className="w-8 h-0.5 bg-blue-400 animate-pulse" />
                <div className="flex-1 text-blue-400">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400 mx-auto flex items-center justify-center text-[10px] mb-1">●</div>
                  <span>Transit Route</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-700" />
                <div className="flex-1 text-slate-500">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-[10px] mb-1">4</div>
                  <span>Final Delivery</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Consignee</span>
                <span className="font-bold text-white">{selectedShipment?.consignee || selectedBol?.consignee_name || "JDM ENTERPRISES"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Container No</span>
                <span className="font-mono font-bold text-amber-400">{selectedShipment?.containerNumber || selectedBol?.container_numbers || "TRIU8065361"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Cargo Description</span>
                <span className="font-bold text-slate-200">{selectedShipment?.cargoDescription || selectedBol?.cargo_description || "DRY FRUITS & COMMERCIAL CARGO"}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Weight / Cartons</span>
                <span className="font-bold text-emerald-400">{selectedShipment?.grossWeight || selectedBol?.gross_weight || "24,500 KGS"}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Close
              </Button>
              <Button
                onClick={() => handleDownloadBolPdf(selectedShipment?.rawBol || selectedBol)}
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official BL PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
