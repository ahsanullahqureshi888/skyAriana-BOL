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
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'
import { PWAInstallButton } from '@/components/pwa-install-prompt'
import { CloudSyncModal } from '@/components/bill-of-lading/cloud-sync-modal'

interface HeaderProps {
  showBack?: boolean
  title?: string
  subtitle?: string
}

export function Header({ showBack = false, title, subtitle }: HeaderProps) {
  const { goBack, currentAccount, currentCompany, view, setView, currentUser, logout } = useApp()
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)

  const getTitle = () => {
    if (title) return title
    if (view === 'settings') return 'System Settings & Management'
    if (view === 'bol') return 'Bill of Lading Editor'
    if (view === 'ledger' && currentCompany) return currentCompany.name
    if (view === 'invoice' && currentCompany) return `${currentCompany.name} - Invoice`
    if (view === 'companies' && currentAccount) return currentAccount.name
    return 'SKY ARIANA LIMITED'
  }

  const getSubtitle = () => {
    if (subtitle) return subtitle
    if (view === 'settings') return 'Users, Security Roles & Software Version'
    if (view === 'bol') return 'Create & Edit Bill of Lading Documents'
    if (view === 'ledger') return 'Company Ledger & Balance Statement'
    if (view === 'invoice') return 'Create & Print Commercial Invoice'
    if (view === 'companies') return 'Account Companies & Ledger Files'
    return 'International Freight & Logistics • سکای آریانا لمیتد'
  }

  const getViewBadge = () => {
    if (view === 'bol') return { label: 'BOL System', color: 'bg-amber-100 text-amber-900 border-amber-300' }
    if (view === 'settings') return { label: 'Settings', color: 'bg-purple-100 text-purple-900 border-purple-300' }
    if (view === 'ledger') return { label: 'Ledger', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    if (view === 'invoice') return { label: 'Invoice', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' }
    return { label: 'Accounts', color: 'bg-blue-100 text-blue-900 border-blue-300' }
  }

  const badge = getViewBadge()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-xs no-print transition-all">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Accounts Navigation */}
            <Button
              variant={view === 'accounts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('accounts')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'bol' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md shadow-amber-500/25' 
                  : 'bg-white/90 border-amber-200/90 text-amber-800 hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-amber-500 group-hover:text-amber-600" />
              <span className="font-extrabold">BOL Editor</span>
              <span className="hidden md:inline font-[vazirmatn] text-[10px] font-bold opacity-90">/ بارنامه</span>
            </Button>

            {/* Settings Navigation */}
            <Button
              variant={view === 'settings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('settings')}
              className={`gap-1 sm:gap-1.5 h-8.5 sm:h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                view === 'settings' 
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white border-transparent shadow-md shadow-purple-500/25' 
                  : 'bg-white/90 border-purple-200 text-purple-800 hover:bg-purple-50 hover:border-purple-300'
              }`}
              title="System Settings"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Settings</span>
            </Button>

            {/* Quick Cloud Sync Across Devices */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCloudSyncOpen(true)}
              className="gap-1 sm:gap-1.5 h-8.5 sm:h-9 rounded-xl text-xs font-bold bg-blue-50/80 border-blue-200 text-blue-900 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
              title="Cloud Sync: Sync all BOLs & Ledgers with other devices"
            >
              <Cloud className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Sync</span>
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
    </header>
  )
}

