"use client"

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { 
  ArrowLeft,
  Cloud, 
  Plane, 
  Ship, 
  Truck, 
  FileText, 
  Building2, 
  LogOut, 
  User as UserIcon, 
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Landmark,
  TrendingUp,
  BarChart3,
  Search,
  Command,
  LayoutGrid,
  Activity,
  CheckCircle2,
  ExternalLink,
  Compass,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'
import { PWAInstallButton } from '@/components/pwa-install-prompt'
import { CloudSyncModal } from '@/components/bill-of-lading/cloud-sync-modal'
import { CommandPalette } from '@/components/command-palette'
import { preloadView } from '@/app/page'
import { LiveCurrencyBar } from '@/components/live-currency-bar'
import { RouteOptimizerModal } from '@/components/route-optimizer-modal'
import { BatchDocumentBundleModal } from '@/components/batch-document-bundle-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  showBack?: boolean
  title?: string
  subtitle?: string
}

export function Header({ showBack = false, title, subtitle }: HeaderProps) {
  const { goBack, currentAccount, currentCompany, view, setView, currentUser, logout } = useApp()
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isRouteOptimizerOpen, setIsRouteOptimizerOpen] = useState(false)
  const [isBatchBundleOpen, setIsBatchBundleOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Track online/offline status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      const handleOpenPalette = () => setIsCommandPaletteOpen(true)
      const handleOpenSync = () => setIsCloudSyncOpen(true)
      const handleOpenRouteOptimizer = () => setIsRouteOptimizerOpen(true)
      const handleOpenBatchBundle = () => setIsBatchBundleOpen(true)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      window.addEventListener('skybol:open-command-palette', handleOpenPalette)
      window.addEventListener('skybol:open-cloud-sync', handleOpenSync)
      window.addEventListener('skybol:open-route-optimizer', handleOpenRouteOptimizer)
      window.addEventListener('skybol:open-batch-bundle', handleOpenBatchBundle)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        window.removeEventListener('skybol:open-command-palette', handleOpenPalette)
        window.removeEventListener('skybol:open-cloud-sync', handleOpenSync)
        window.removeEventListener('skybol:open-route-optimizer', handleOpenRouteOptimizer)
        window.removeEventListener('skybol:open-batch-bundle', handleOpenBatchBundle)
      }
    }
  }, [])


  const getTitle = () => {
    if (title) return title
    if (view === 'analytics') return 'Sky Ariana Executive Analytics'
    if (view === 'shipper-portal') return 'Sky Ariana Shipper Portal'
    if (view === 'reports') return 'Financial Reports & P&L Statement'
    if (view === 'export-calculator') return 'Export Logistics & Reefer Quote Engine'
    if (view === 'acci-portal') return 'ACCI Chamber of Commerce & Origin Suite'
    if (view === 'sky-doc') return 'Sky Ariana Document System (SKY DOC)'
    if (view === 'sky-cmr') return 'Sky CMR Express & Border Waybill'
    if (view === 'invoice-pad') return 'Commercial Invoice Pad'
    if (view === 'bank') return 'Sky Ariana Bank & Transactions'
    if (view === 'settings') return 'System Settings & Management'
    if (view === 'bol') return 'Bill of Lading Editor'
    if (view === 'ledger' && currentCompany) return currentCompany.name
    if (view === 'invoice' && currentCompany) return `${currentCompany.name} - Invoice`
    if (view === 'companies' && currentAccount) return currentAccount.name
    return 'SKY ARIANA LIMITED'
  }

  const getSubtitle = () => {
    if (subtitle) return subtitle
    if (view === 'analytics') return 'Multi-source Data Intelligence, Shipments & Ledger Statements • داشبورد تحلیل داده‌ها'
    if (view === 'shipper-portal') return 'Verified Client Consignments & Live Milestones • پورتال مشتریان'
    if (view === 'reports') return 'Executive Profit & Loss Statement, Cargo Volumes & Financial Aging • گزارشات مالی، سود و زیان'
    if (view === 'export-calculator') return 'Multi-Leg Corridors, Reefer Escort & Ocean Freight Pricing • ماشین حساب صادرات و ترانزیت'
    if (view === 'acci-portal') return 'Certificate of Origin, Packing Lists, SAFTA & Air Waybills • اسناد اتاق تجارت'
    if (view === 'sky-doc') return 'Enterprise Operating System & Document Management • سیستم جامع اسناد و عملیات'
    if (view === 'sky-cmr') return 'International Consignment Note, Border Transit & Waybills • بارنامه بین‌المللی سی‌ام‌آر'
    if (view === 'invoice-pad') return 'Print-Ready A4 Commercial Invoices & Customs Valuations • سیستم صدور فاکتور'
    if (view === 'bank') return 'Live Online Banking, Financial Ledgers & Transactions • پورتال معاملات بانکی'
    if (view === 'settings') return 'Users, Security Roles & Software Configuration'
    if (view === 'bol') return 'Create, Edit & Print Official Single-Page A4 Bill of Lading'
    if (view === 'ledger') return 'Company Ledger & Balance Statement'
    if (view === 'invoice') return 'Create & Print Commercial Invoice'
    if (view === 'companies') return 'Account Companies & Ledger Files'
    return 'International Freight & Logistics • سکای آریانا لمیتد'
  }

  const getViewBadge = () => {
    if (view === 'analytics') return { label: 'Analytics', color: 'bg-blue-50 text-blue-950 border-blue-300 ring-1 ring-blue-400/30' }
    if (view === 'shipper-portal') return { label: 'Shipper Portal', color: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/30' }
    if (view === 'reports') return { label: 'Financial Reports', color: 'bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/30' }
    if (view === 'export-calculator') return { label: 'Export Quote', color: 'bg-orange-50 text-orange-950 border-orange-300 ring-1 ring-orange-400/30' }
    if (view === 'acci-portal') return { label: 'ACCI Suite', color: 'bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-400/30' }
    if (view === 'sky-doc') return { label: 'SKY DOC', color: 'bg-cyan-50 text-cyan-950 border-cyan-300 ring-1 ring-cyan-400/30' }
    if (view === 'sky-cmr') return { label: 'Sky CMR', color: 'bg-blue-50 text-blue-950 border-blue-300 ring-1 ring-blue-400/30' }
    if (view === 'invoice-pad') return { label: 'Invoice Pad', color: 'bg-indigo-50 text-indigo-900 border-indigo-300 ring-1 ring-indigo-400/30' }
    if (view === 'bank') return { label: 'Bank Portal', color: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30' }
    if (view === 'bol') return { label: 'BOL Editor', color: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/30' }
    if (view === 'settings') return { label: 'Settings', color: 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400/30' }
    if (view === 'ledger') return { label: 'Ledger', color: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30' }
    if (view === 'invoice') return { label: 'Invoice', color: 'bg-indigo-50 text-indigo-900 border-indigo-300 ring-1 ring-indigo-400/30' }
    return { label: 'Accounts', color: 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-400/30' }
  }

  const badge = getViewBadge()

  // Secondary tools active status check
  const isSecondaryActive = view === 'sky-cmr' || view === 'invoice-pad' || view === 'bank' || view === 'export-calculator' || view === 'acci-portal'


  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-xs no-print transition-all duration-200 select-none">
      {/* Live FX Rates & Fast Currency Converter Ribbon */}
      <LiveCurrencyBar />

      <div className="max-w-[1880px] w-full mx-auto px-2.5 sm:px-4 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          
          {/* ================================================================= */}
          {/* LEFT: Brand Identity, Breadcrumbs & Live Status */}
          {/* ================================================================= */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="shrink-0 h-8.5 w-8.5 hover:bg-blue-50 text-blue-950 hover:text-blue-700 transition-all rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer active:scale-95"
                title="Go Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Brand Logo with Glow */}
            <div 
              className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all rounded-xl p-0.5 bg-gradient-to-br from-blue-50 via-white to-sky-50 border border-blue-200/80 shadow-2xs group" 
              onClick={() => setView('accounts')}
              title="SKY ARIANA LIMITED - Home"
            >
              <Image
                src="/logo.png"
                alt="SKY ARIANA LIMITED Logo"
                fill
                className="object-contain p-0.5 drop-shadow-xs group-hover:drop-shadow-sm transition-all"
                priority
              />
            </div>

            {/* Titles & Bilingual Breadcrumbs */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-black text-blue-950 truncate leading-tight tracking-tight">
                  {getTitle()}
                </h1>
                <span className={`hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-2xs ${badge.color}`}>
                  {badge.label}
                </span>
                
                {/* Live Connectivity Dot */}
                <div 
                  className={`hidden lg:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold border ${
                    isOnline 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                  title={isOnline ? 'System is online & connected to cloud' : 'Offline mode'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate font-semibold leading-tight mt-0.5">
                {getSubtitle()}
              </p>
            </div>
          </div>
          
          {/* ================================================================= */}
          {/* CENTER & RIGHT: Modern Segmented Navigation & Action Center */}
          {/* ================================================================= */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5">
            
            {/* Primary App Bar Segmented Container */}
            <nav className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              
              {/* 1. Accounts & Ledger */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('accounts')}
                onMouseEnter={() => preloadView('accounts')}
                onTouchStart={() => preloadView('accounts')}
                onFocus={() => preloadView('accounts')}
                className={`gap-1 sm:gap-1.5 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  view === 'accounts' || view === 'companies' || view === 'ledger' || view === 'invoice'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25' 
                    : 'text-slate-700 hover:bg-white hover:text-blue-700 hover:shadow-2xs'
                }`}
                title="Accounts & Ledger Files • حسابات و دفاتر"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-extrabold">Accounts</span>
                <span className="hidden xl:inline font-[vazirmatn] text-[9.5px] font-bold opacity-80">/ دفاتر</span>
              </Button>

              {/* 2. SKY DOC - Prominent OS Module */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('sky-doc')}
                onMouseEnter={() => preloadView('sky-doc')}
                onTouchStart={() => preloadView('sky-doc')}
                onFocus={() => preloadView('sky-doc')}
                className={`gap-1 sm:gap-1.5 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  view === 'sky-doc' 
                    ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-700 text-white shadow-sm shadow-cyan-500/30 ring-2 ring-cyan-400/40' 
                    : 'text-cyan-900 bg-cyan-50/70 hover:bg-cyan-100/90 border border-cyan-200/80'
                }`}
                title="Sky Ariana Document Management System (SKY DOC) • سیستم جامع اسناد"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping mr-0.2" />
                <FileText className="h-3.5 w-3.5 text-cyan-700 group-hover:text-cyan-900" />
                <span className="font-black tracking-tight">SKY DOC</span>
                <span className="hidden xl:inline font-[vazirmatn] text-[9.5px] font-bold opacity-85">/ اسناد</span>
              </Button>

              {/* 3. BOL Editor */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('bol')}
                onMouseEnter={() => preloadView('bol')}
                onTouchStart={() => preloadView('bol')}
                onFocus={() => preloadView('bol')}
                className={`gap-1 sm:gap-1.5 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  view === 'bol' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25' 
                    : 'text-amber-900 hover:bg-amber-50 hover:text-amber-900 hover:shadow-2xs'
                }`}
                title="Bill of Lading Editor • صدور و ویرایش بارنامه"
              >
                <FileText className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-extrabold">BOL Editor</span>
                <span className="hidden xl:inline font-[vazirmatn] text-[9.5px] font-bold opacity-80">/ بارنامه</span>
              </Button>

              {/* 4. Financial Reports */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('reports')}
                onMouseEnter={() => preloadView('reports')}
                onTouchStart={() => preloadView('reports')}
                onFocus={() => preloadView('reports')}
                className={`gap-1 sm:gap-1.5 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  view === 'reports' 
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-400/40' 
                    : 'text-emerald-950 hover:bg-emerald-50 hover:text-emerald-950 hover:shadow-2xs'
                }`}
                title="Financial Reports, P&L Statement & Aging • گزارشات مالی"
              >
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-extrabold">Reports</span>
                <span className="hidden xl:inline font-[vazirmatn] text-[9.5px] font-bold opacity-80">/ گزارشات</span>
              </Button>

              {/* 5. Executive Analytics Dashboard */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('analytics')}
                onMouseEnter={() => preloadView('analytics')}
                onTouchStart={() => preloadView('analytics')}
                onFocus={() => preloadView('analytics')}
                className={`gap-1 sm:gap-1.5 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  view === 'analytics' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-400/40' 
                    : 'text-blue-950 hover:bg-blue-50 hover:text-blue-900 hover:shadow-2xs'
                }`}
                title="Executive Analytics, BI Dashboards & AI Suite • داشبورد تحلیل داده‌ها"
              >
                <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-extrabold">Analytics</span>
                <span className="hidden xl:inline font-[vazirmatn] text-[9.5px] font-bold opacity-80">/ تحلیل</span>
              </Button>

              {/* 5. Direct Buttons on Extra Wide Screens (>= 1440px) OR Collapsed Dropdown Menu */}
              <div className="hidden 2xl:flex items-center gap-1 border-l border-slate-200/80 pl-1">
                {/* Export Logistics Calculator */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('export-calculator')}
                  onMouseEnter={() => preloadView('export-calculator')}
                  className={`gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    view === 'export-calculator' 
                      ? 'bg-orange-600 text-white shadow-xs' 
                      : 'text-orange-950 hover:bg-orange-50'
                  }`}
                  title="Export Logistics & Reefer Quote Engine • ماشین حساب ترانزیت"
                >
                  <Truck className="h-3.5 w-3.5 text-orange-600" />
                  <span>Export Quote</span>
                </Button>

                {/* ACCI Chamber Portal */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('acci-portal')}
                  onMouseEnter={() => preloadView('acci-portal')}
                  className={`gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    view === 'acci-portal' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'text-amber-950 hover:bg-amber-50'
                  }`}
                  title="ACCI Chamber of Commerce & Origin Suite • اسناد اتاق تجارت"
                >
                  <Building2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>ACCI Suite</span>
                </Button>

                {/* Sky CMR */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('sky-cmr')}
                  onMouseEnter={() => preloadView('sky-cmr')}
                  className={`gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    view === 'sky-cmr' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-blue-900 hover:bg-blue-50'
                  }`}
                  title="Sky CMR International Consignment Note"
                >
                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Sky CMR</span>
                </Button>

                {/* Invoice Pad */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('invoice-pad')}
                  onMouseEnter={() => preloadView('invoice-pad')}
                  className={`gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    view === 'invoice-pad' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-indigo-900 hover:bg-indigo-50'
                  }`}
                  title="Commercial Invoice Pad"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Invoice Pad</span>
                </Button>

                {/* Sky Bank */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('bank')}
                  onMouseEnter={() => preloadView('bank')}
                  className={`gap-1 h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    view === 'bank' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-emerald-900 hover:bg-emerald-50'
                  }`}
                  title="Sky Bank & Transactions"
                >
                  <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Sky Bank</span>
                </Button>
              </div>

              {/* "More Tools" Dropdown for Medium & Standard Screens */}
              <div className="2xl:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-1 h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isSecondaryActive 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-700 hover:bg-white hover:text-slate-900'
                      }`}
                      title="More Logistics Apps & Tools • ابزارهای تکمیلی"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="font-bold hidden xs:inline">Tools</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-1.5 bg-white rounded-2xl border-slate-200 shadow-xl">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                      Logistics, Trade & Banking Suite
                    </DropdownMenuLabel>
                    
                    <DropdownMenuItem 
                      onClick={() => setView('export-calculator')}
                      onMouseEnter={() => preloadView('export-calculator')}
                      className={`gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        view === 'export-calculator' ? 'bg-orange-50 text-orange-950 font-black' : 'text-slate-700 hover:bg-orange-50/60'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-orange-100/70 text-orange-700">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-orange-950">Export Logistics Quote</span>
                          <span className="text-[9px] font-[vazirmatn] text-orange-600 font-bold">صادرات</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">Multi-leg reefer & pricing calculator</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setView('acci-portal')}
                      onMouseEnter={() => preloadView('acci-portal')}
                      className={`gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        view === 'acci-portal' ? 'bg-amber-50 text-amber-950 font-black' : 'text-slate-700 hover:bg-amber-50/60'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-amber-950">ACCI Chamber Portal</span>
                          <span className="text-[9px] font-[vazirmatn] text-amber-600 font-bold">اتاق تجارت</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">Origin, SAFTA, AWB & Packing List</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setView('sky-cmr')}
                      onMouseEnter={() => preloadView('sky-cmr')}
                      className={`gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        view === 'sky-cmr' ? 'bg-blue-50 text-blue-900 font-black' : 'text-slate-700 hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-blue-950">Sky CMR Express</span>
                          <span className="text-[9px] font-[vazirmatn] text-blue-600 font-bold">سی‌ام‌آر</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">Border transit & consignment note</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setView('invoice-pad')}
                      onMouseEnter={() => preloadView('invoice-pad')}
                      className={`gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        view === 'invoice-pad' ? 'bg-indigo-50 text-indigo-900 font-black' : 'text-slate-700 hover:bg-indigo-50/60'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-100/70 text-indigo-700">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-indigo-950">Commercial Invoice Pad</span>
                          <span className="text-[9px] font-[vazirmatn] text-indigo-600 font-bold">فاکتور</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">Print-ready customs invoices</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setView('bank')}
                      onMouseEnter={() => preloadView('bank')}
                      className={`gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        view === 'bank' ? 'bg-emerald-50 text-emerald-900 font-black' : 'text-slate-700 hover:bg-emerald-50/60'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-700">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-950">Sky Bank Portal</span>
                          <span className="text-[9px] font-[vazirmatn] text-emerald-600 font-bold">بانک</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">Online transactions & ledgers</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    <DropdownMenuItem 
                      onClick={() => setIsRouteOptimizerOpen(true)}
                      className="gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer text-slate-700 hover:bg-blue-50/70 transition-colors"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                        <Compass className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-blue-950">Route Cost Optimizer</span>
                          <span className="text-[9px] font-[vazirmatn] text-blue-600 font-bold">مسیرها</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">Compare Afghan export corridors & margins</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setIsBatchBundleOpen(true)}
                      className="gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer text-slate-700 hover:bg-emerald-50/70 transition-colors"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-700">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-950">Complete Docket Pack</span>
                          <span className="text-[9px] font-[vazirmatn] text-emerald-600 font-bold">پک کامل</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">1-Click BOL, CMR, Invoice & Origin bundle</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>

                </DropdownMenu>
              </div>

            </nav>

            {/* Quick Command Hub & Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="gap-1.5 h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl text-xs font-black bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 transition-all cursor-pointer shadow-2xs group active:scale-95"
              title="Global Search & Quick Actions (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
              <span className="hidden md:inline font-mono text-[9.5px] text-slate-500 bg-white border border-slate-200 px-1 py-0.2 rounded font-bold">
                Ctrl+K
              </span>
            </Button>

            {/* Quick Cloud Sync */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCloudSyncOpen(true)}
              className="gap-1.5 h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-black bg-gradient-to-r from-blue-50 to-indigo-50/80 border-blue-200/90 text-blue-900 hover:bg-blue-100/90 transition-all cursor-pointer shadow-2xs group active:scale-95"
              title="Cloud Sync: Sync all BOLs, accounts, and ledgers between PC, Phone, and other devices • همگام‌سازی ابری"
            >
              <div className="relative">
                <Cloud className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-all" />
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
              <span className="hidden xs:inline">Cloud Sync</span>
            </Button>

            {/* Settings (Admin/Accountants) */}
            {currentUser?.role !== 'shipper' && (
              <Button
                variant={view === 'settings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('settings')}
                onMouseEnter={() => preloadView('settings')}
                className={`h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  view === 'settings' 
                    ? 'bg-purple-700 text-white shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-200'
                }`}
                title="System Settings & Role Security"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline font-bold">Settings</span>
              </Button>
            )}

            {/* PWA Install App Button */}
            <PWAInstallButton />

            {/* User Profile Capsule & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-200/80">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-black text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[8.5px] font-black text-amber-700 uppercase tracking-tight leading-tight">
                    {currentUser.role}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  title={`Signed in as ${currentUser.name} (${currentUser.role}). Click to Logout`}
                  className="h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl border-red-200/90 text-red-700 bg-red-50/50 hover:bg-red-100 hover:text-red-800 text-xs font-bold gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Glowing Golden & Cyan Accent Bottom Edge */}
      <div className="w-full h-[2.5px] bg-gradient-to-r from-amber-400 via-blue-600 to-cyan-400 shadow-[0_1px_6px_rgba(37,99,235,0.35)]" />

      {/* Cloud Sync Modal */}
      <CloudSyncModal open={isCloudSyncOpen} onOpenChange={setIsCloudSyncOpen} />

      {/* Route Optimizer Modal */}
      <RouteOptimizerModal open={isRouteOptimizerOpen} onOpenChange={setIsRouteOptimizerOpen} />

      {/* Complete Docket Pack Modal */}
      <BatchDocumentBundleModal open={isBatchBundleOpen} onOpenChange={setIsBatchBundleOpen} />

      {/* Command Palette Modal */}
      <CommandPalette 
        open={isCommandPaletteOpen} 
        onOpenChange={setIsCommandPaletteOpen} 
        onOpenCloudSync={() => setIsCloudSyncOpen(true)} 
      />
    </header>
  )
}

