"use client"

import { AppProvider, useApp } from '@/lib/app-context'
import { Header } from '@/components/header'
import { AccountsView } from '@/components/accounts-view'
import { CompaniesView } from '@/components/companies-view'
import { LedgerView } from '@/components/ledger-view'
import { InvoiceView } from '@/components/invoice-view'
import { BOLEditor } from '@/components/bill-of-lading/bol-editor'
import { LoginScreen } from '@/components/login-screen'
import { SettingsView } from '@/components/settings-view'

function MainContent() {
  const { view, isAuthenticated } = useApp()

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack={view !== 'accounts' && view !== 'settings'} />
      <main className="flex-1">
        {view === 'accounts' && <AccountsView />}
        {view === 'companies' && <CompaniesView />}
        {view === 'ledger' && <LedgerView />}
        {view === 'invoice' && <InvoiceView />}
        {view === 'bol' && <BOLEditor />}
        {view === 'settings' && <SettingsView />}
      </main>
      <footer className="glass-strong border-t border-amber-200/80 bg-white/95 backdrop-blur-xl py-3.5 px-6 no-print shadow-xs mt-auto">
        <div className="container mx-auto text-center text-xs font-bold text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            <span>© {new Date().getFullYear()} SKY ARIANA LIMITED. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1">🇦🇫 AFGHANISTAN: <span className="font-extrabold text-slate-900">+93 700 939 365</span></span>
            <span className="text-amber-500 font-extrabold">•</span>
            <span className="flex items-center gap-1">🇮🇷 IRAN: <span className="font-extrabold text-slate-900">+98 9172325086</span></span>
            <span className="text-amber-500 font-extrabold">•</span>
            <span className="flex items-center gap-1">✉️ <span className="font-extrabold text-slate-900">info@skyariana.com</span></span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  )
}
