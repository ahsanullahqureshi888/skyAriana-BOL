"use client"

import { AppProvider, useApp } from '@/lib/app-context'
import { Header } from '@/components/header'
import { AccountsView } from '@/components/accounts-view'
import { CompaniesView } from '@/components/companies-view'
import { LedgerView } from '@/components/ledger-view'
import { InvoiceView } from '@/components/invoice-view'

function MainContent() {
  const { view } = useApp()

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack={view !== 'accounts'} />
      <main className="flex-1">
        {view === 'accounts' && <AccountsView />}
        {view === 'companies' && <CompaniesView />}
        {view === 'ledger' && <LedgerView />}
        {view === 'invoice' && <InvoiceView />}
      </main>
      <footer className="glass-strong border-t border-white/20 py-4 no-print">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SKY ARIANA LIMITED. All rights reserved.</p>
          <p className="text-xs mt-1">
            AFGHANISTAN: +93 700 939 365 | IRAN: +98 9172325086 | info@skyariana.com
          </p>
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
