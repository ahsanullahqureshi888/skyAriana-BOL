"use client"

import Image from 'next/image'
import { ArrowLeft, Plane, Ship, Truck, FileText, Building2, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'

interface HeaderProps {
  showBack?: boolean
  title?: string
  subtitle?: string
}

export function Header({ showBack = false, title, subtitle }: HeaderProps) {
  const { goBack, currentAccount, currentCompany, view, setView, currentUser, logout } = useApp()

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
    if (view === 'ledger') return 'Company Ledger'
    if (view === 'invoice') return 'Create Invoice'
    if (view === 'companies') return 'Account Companies'
    return 'International Freight & Logistics • سکای آریانا لمیتد'
  }

  return (
    <header className="glass-strong sticky top-0 z-50 border-b border-blue-100/60 bg-white/90 backdrop-blur-xl no-print">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="shrink-0 h-9 w-9 hover:bg-blue-50 text-blue-900 transition-colors rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => setView('accounts')}>
              <Image
                src="/logo.png"
                alt="SKY ARIANA LIMITED Logo"
                fill
                className="object-contain drop-shadow-xs"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg font-extrabold text-blue-950 truncate leading-tight">
                {getTitle()}
              </h1>
              <p className="text-xs text-slate-500 truncate font-medium">
                {getSubtitle()}
              </p>
            </div>
          </div>
          
          {/* Quick Navigation Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={view === 'accounts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('accounts')}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold ${
                view === 'accounts' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Accounts</span>
            </Button>

            <Button
              variant={view === 'bol' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('bol')}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold ${
                view === 'bol' 
                  ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-md shadow-amber-500/20' 
                  : 'bg-white/80 border-amber-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>BOL Editor / بارنامه</span>
            </Button>

            <Button
              variant={view === 'settings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('settings')}
              className={`gap-1.5 h-9 rounded-xl text-xs font-bold ${
                view === 'settings' 
                  ? 'bg-purple-700 text-white border-purple-800 shadow-md shadow-purple-500/20' 
                  : 'bg-white/80 border-purple-200 text-purple-800 hover:bg-purple-50'
              }`}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Button>

            {/* Logout & User Profile */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[11px] font-black text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 uppercase tracking-tight leading-tight">
                    {currentUser.role}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  title="Sign Out"
                  className="h-9 px-2.5 rounded-xl border-red-200 text-red-700 bg-red-50/60 hover:bg-red-100 hover:text-red-800 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}
          </div>

          {/* Transport icons */}
          <div className="hidden xl:flex items-center gap-2.5 text-blue-400/80 ml-1">
            <Plane className="h-4 w-4" />
            <Ship className="h-4 w-4" />
            <Truck className="h-4 w-4" />
          </div>
        </div>
      </div>
      {/* Glowing Golden & Blue Accent Line */}
      <div className="w-full h-[2px] bg-gradient-to-r from-amber-300 via-blue-500 to-amber-500 shadow-[0_1px_8px_rgba(245,158,11,0.4)]" />
    </header>
  )
}
