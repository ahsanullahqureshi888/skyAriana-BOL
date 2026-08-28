"use client"

import Image from 'next/image'
import { useState } from 'react'
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
  ChevronRight,
  Landmark
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'
import { PWAInstallButton } from '@/components/pwa-install-prompt'
import { CloudSyncModal } from '@/components/bill-of-lading/cloud-sync-modal'
import { CommandPalette } from '@/components/command-palette'
import { Command, Search } from 'lucide-react'

interface HeaderProps {
  showBack?: boolean
  title?: string
  subtitle?: string
}

export function Header({ showBack = false, title, subtitle }: HeaderProps) {
  const { goBack, currentAccount, currentCompany, view, setView, currentUser, logout } = useApp()
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const getTitle = () => {
    if (title) return title
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
    if (view === 'sky-doc') return 'Enterprise Operating System & Document Management • سیستم جامع اسناد و عملیات'
    if (view === 'sky-cmr') return 'International Consignment Note, Border Transit & Waybills • بارنامه بین‌المللی سی‌ام‌آر'
    if (view === 'invoice-pad') return 'Print-Ready A4 Commercial Invoices, Customs Valuations & Signatures • سیستم صدور فاکتور'
    if (view === 'bank') return 'Live Online Banking, Financial Ledgers & Transactions • پورتال معاملات بانکی'
    if (view === 'settings') return 'Users, Security Roles & Software Version'
    if (view === 'bol') return 'Create & Edit Bill of Lading Documents'
    if (view === 'ledger') return 'Company Ledger & Balance Statement'
    if (view === 'invoice') return 'Create & Print Commercial Invoice'
    if (view === 'companies') return 'Account Companies & Ledger Files'
    return 'International Freight & Logistics • سکای آریانا لمیتد'
  }

  const getViewBadge = () => {
    if (view === 'sky-doc') return { label: 'Sky Doc', color: 'bg-cyan-100 text-cyan-950 border-cyan-400' }
    if (view === 'sky-cmr') return { label: 'Sky CMR', color: 'bg-blue-100 text-blue-950 border-blue-400' }
    if (view === 'invoice-pad') return { label: 'Invoice Pad', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' }
    if (view === 'bank') return { label: 'Bank Portal', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    if (view === 'bol') return { label: 'BOL System', color: 'bg-amber-100 text-amber-900 border-amber-300' }
    if (view === 'settings') return { label: 'Settings', color: 'bg-purple-100 text-purple-900 border-purple-300' }
    if (view === 'ledger') return { label: 'Ledger', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    if (view === 'invoice') return { label: 'Invoice', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' }
    return { label: 'Accounts', color: 'bg-blue-100 text-blue-900 border-blue-300' }
  }

  const badge = getViewBadge()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-xs no-print transition-all">
      <div className="max-w-[1780px] w-full mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Left: Back button, Logo & Title Area */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="shrink-0 h-9 w-9 hover:bg-blue-50 text-blue-950 hover:text-blue-700 transition-colors rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Brand Logo with Glow */}
            <div 
              className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all rounded-xl p-0.5 bg-gradient-to-br from-blue-50 via-white to-sky-50 border border-blue-100 shadow-xs" 
              onClick={() => setView('accounts')}
              title="SKY ARIANA LIMITED"
            >
              <Image
                src="/logo.png"
                alt="SKY ARIANA LIMITED Logo"
                fill
                className="object-contain p-0.5 drop-shadow-xs"
                priority
              />
            </div>

            {/* Titles & Breadcrumbs */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-black text-blue-950 truncate leading-tight tracking-tight">
                  {getTitle()}
                </h1>
                <span className={`hidden xs:inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-2xs ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate font-semibold leading-tight mt-0.5">
                {getSubtitle()}
              </p>
            </div>
          </div>
          
          {/* Right: Quick Navigation Tabs & User Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {/* Accounts Navigation */}
            <Button
              variant={view === 'accounts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('accounts')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'accounts' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border-transparent' 
                  : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Accounts</span>
            </Button>

            {/* BOL Editor Navigation */}
            <Button
              variant={view === 'bol' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('bol')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'bol' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md shadow-amber-500/25' 
                  : 'bg-white/90 border-amber-200/90 text-amber-800 hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-amber-500 group-hover:text-amber-600" />
              <span className="font-extrabold">BOL Editor</span>
              <span className="hidden md:inline font-[vazirmatn] text-[10px] font-bold opacity-90">/ بارنامه</span>
            </Button>

            {/* Sky CMR Navigation */}
            <Button
              variant={view === 'sky-cmr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('sky-cmr')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'sky-cmr' 
                  ? 'bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-700 text-white border-transparent shadow-md shadow-blue-500/25' 
                  : 'bg-white/90 border-blue-200/90 text-blue-900 hover:bg-blue-50 hover:border-blue-300'
              }`}
              title="Sky CMR International Consignment Note & Border Waybill"
            >
              <Truck className="h-3.5 w-3.5 text-blue-600 group-hover:text-blue-700" />
              <span className="font-extrabold">Sky CMR</span>
              <span className="hidden md:inline font-[vazirmatn] text-[10px] font-bold opacity-90">/ سی‌ام‌آر</span>
            </Button>

            {/* Commercial Invoice Pad Navigation */}
            <Button
              variant={view === 'invoice-pad' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('invoice-pad')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'invoice-pad' 
                  ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white border-transparent shadow-md shadow-indigo-500/25' 
                  : 'bg-white/90 border-indigo-200/90 text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
              title="Sky Ariana Commercial Invoice Pad"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600 group-hover:text-indigo-700" />
              <span className="font-extrabold">Invoice Pad</span>
              <span className="hidden md:inline font-[vazirmatn] text-[10px] font-bold opacity-90">/ فاکتور</span>
            </Button>

            {/* Sky Bank Module Navigation */}
            <Button
              variant={view === 'bank' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('bank')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'bank' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent shadow-md shadow-emerald-500/25' 
                  : 'bg-white/90 border-emerald-200/90 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
              title="Sky Ariana Bank & Transactions Portal"
            >
              <Landmark className="h-3.5 w-3.5 text-emerald-600 group-hover:text-emerald-700" />
              <span className="font-extrabold">Sky Bank</span>
              <span className="hidden md:inline font-[vazirmatn] text-[10px] font-bold opacity-90">/ بانک</span>
            </Button>

            {/* Sky Doc Module Navigation */}
            <Button
              variant={view === 'sky-doc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('sky-doc')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'sky-doc' 
                  ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-700 text-white border-transparent shadow-md shadow-cyan-500/25' 
                  : 'bg-white/90 border-cyan-200/90 text-cyan-800 hover:bg-cyan-50 hover:border-cyan-300'
              }`}
              title="Sky Ariana Document Management System (SKY DOC)"
            >
              <FileText className="h-3.5 w-3.5 text-cyan-600 group-hover:text-cyan-700" />
              <span className="font-extrabold">SKY DOC</span>
              <span className="hidden md:inline font-[vazirmatn] text-[10px] font-bold opacity-90">/ اسناد</span>
            </Button>

            {/* Settings Navigation (Admins & Accountants only) */}
            {currentUser?.role !== 'shipper' && (
              <Button
                variant={view === 'settings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('settings')}
                className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  view === 'settings' 
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white border-transparent shadow-md shadow-purple-500/25' 
                    : 'bg-white/90 border-purple-200 text-purple-800 hover:bg-purple-50 hover:border-purple-300'
                }`}
                title="System Settings"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Settings</span>
              </Button>
            )}

            {/* Global Command Hub & Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="gap-1.5 h-8.5 sm:h-9 px-2 sm:px-2.5 rounded-xl text-xs font-black bg-slate-100/90 hover:bg-slate-200/90 border-slate-300 text-slate-800 transition-all cursor-pointer shadow-2xs group active:scale-95"
              title="Quick Search & Command Hub (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-600 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
              <span className="hidden sm:inline font-mono text-[10px] text-slate-500 bg-white/80 border border-slate-300/80 px-1 py-0.2 rounded font-bold">
                Ctrl+K
              </span>
            </Button>

            {/* Quick Cloud Sync Across Devices */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCloudSyncOpen(true)}
              className="gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-black bg-gradient-to-r from-blue-50 to-indigo-50/90 border-blue-200 text-blue-900 hover:bg-blue-100/90 transition-all cursor-pointer shadow-2xs group active:scale-95"
              title="Cloud Sync: Sync all BOLs, accounts, and ledgers between PC, Phone, and other devices"
            >
              <div className="relative">
                <Cloud className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <span className="font-extrabold text-blue-950">Cloud Sync</span>
              <span className="hidden xl:inline text-[9.5px] font-black bg-blue-200/80 text-blue-900 px-1.5 py-0.2 rounded-md">
                همگام‌سازی
              </span>
            </Button>

            {/* PWA Install App Button */}
            <PWAInstallButton />

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[11px] font-black text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-tight leading-tight">
                    {currentUser.role}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  title="Sign Out of Software"
                  className="h-8.5 sm:h-9 px-2 sm:px-2.5 rounded-xl border-red-200 text-red-700 bg-red-50/60 hover:bg-red-100 hover:text-red-800 text-xs font-bold gap-1 cursor-pointer transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}
          </div>

          {/* Transport Mode Icons (Decorative) */}
          <div className="hidden 2xl:flex items-center gap-2 text-blue-300/80 ml-1">
            <Plane className="h-3.5 w-3.5" />
            <Ship className="h-3.5 w-3.5" />
            <Truck className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Glowing Golden & Blue Accent Bottom Edge */}
      <div className="w-full h-[2.5px] bg-gradient-to-r from-amber-400 via-blue-600 to-cyan-400 shadow-[0_1px_6px_rgba(37,99,235,0.35)]" />

      {/* Cloud Sync Modal */}
      <CloudSyncModal open={isCloudSyncOpen} onOpenChange={setIsCloudSyncOpen} />

      {/* Command Palette Modal */}
      <CommandPalette 
        open={isCommandPaletteOpen} 
        onOpenChange={setIsCommandPaletteOpen} 
        onOpenCloudSync={() => setIsCloudSyncOpen(true)} 
      />
    </header>
  )
}

