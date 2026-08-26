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
import { SkyBankView } from '@/components/sky-bank-view'

import { useEffect } from 'react'
import { toast } from 'sonner'

function MainContent() {
  const { view, isAuthenticated } = useApp()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      const syncCode = searchParams.get("sync") || searchParams.get("sync_code")
      if (syncCode) {
        const toastId = toast.loading(`Connecting & syncing documents for ${syncCode}...`)
        const performSync = async () => {
          try {
            let data: any = null
            try {
              const res = await fetch(`/api/sync?code=${encodeURIComponent(syncCode)}`)
              if (res.ok) {
                const body = await res.json()
                data = body.data || body
              }
            } catch (e) {}

            // Direct Global Relay Fallback
            if (!data || !Array.isArray(data.documents) || data.documents.length === 0) {
              const clean = syncCode.replace(/^SKY-?/, "").replace(/[\s-_]+/g, "")
              const rKeys = clean ? [`sky-relay-v3-${clean}`, `sky-relay-v3-${syncCode.toLowerCase()}`, "sky-relay-v3-master"] : ["sky-relay-v3-master"]
              for (const rk of rKeys) {
                try {
                  const rRes = await fetch(`https://cl1p.net/${encodeURIComponent(rk)}`)
                  if (rRes.ok) {
                    const html = await rRes.text()
                    const match = html.match(/<textarea[^>]*name=["']content["'][^>]*>([\s\S]*?)<\/textarea>/i) || html.match(/<textarea[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/textarea>/i)
                    if (match && match[1]) {
                      const raw = match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim()
                      const parsed = JSON.parse(raw)
                      if (parsed && (Array.isArray(parsed.documents) || parsed.documents)) {
                        data = parsed
                        break
                      }
                    }
                  }
                } catch (err) {}
              }
            }

            if (data && Array.isArray(data.documents) && data.documents.length > 0) {
              const storedLocal1 = window.localStorage.getItem("sky-bol-browser-documents")
              const storedLocal2 = window.localStorage.getItem("skybol:saved-documents")
              const storedLocal3 = window.localStorage.getItem("skybol:backup-documents")
              const list1: any[] = storedLocal1 ? JSON.parse(storedLocal1) : []
              const list2: any[] = storedLocal2 ? JSON.parse(storedLocal2) : []
              const list3: any[] = storedLocal3 ? JSON.parse(storedLocal3) : []

              const mergedMap = new Map<string, any>()
              for (const d of data.documents) {
                const k = d.bol_number || d.id
                if (k) mergedMap.set(k, d)
              }
              for (const d of [...list1, ...list2, ...list3]) {
                const k = d.bol_number || d.id
                if (k && !mergedMap.has(k)) mergedMap.set(k, d)
              }

              const allMerged = Array.from(mergedMap.values())
              const jsonStr = JSON.stringify(allMerged)
              window.localStorage.setItem("sky-bol-browser-documents", jsonStr)
              window.localStorage.setItem("skybol:saved-documents", jsonStr)
              window.localStorage.setItem("skybol:backup-documents", jsonStr)

              if (Array.isArray(data.customCompanies || data.accounts)) {
                const incoming = (data.customCompanies || data.accounts) as string[]
                const raw = window.localStorage.getItem("skybol:account-custom-companies")
                const cur = raw ? JSON.parse(raw) : []
                window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(Array.from(new Set([...cur, ...incoming]))))
              }
              if (data.ledgerRecords) {
                const raw = window.localStorage.getItem("skybol:account-ledgers")
                const cur = raw ? JSON.parse(raw) : {}
                window.localStorage.setItem("skybol:account-ledgers", JSON.stringify({ ...cur, ...data.ledgerRecords }))
              }
              if (data.companySettings) {
                window.localStorage.setItem("skybol:company-settings", JSON.stringify(data.companySettings))
                window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(data.companySettings))
              }

              window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
              window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))

              toast.success(`🎉 Synced ${allMerged.length} BOLs successfully to this device!`, { id: toastId })
              
              const cleanUrl = window.location.pathname
              window.history.replaceState({}, document.title, cleanUrl)
            } else {
              toast.error("Could not locate documents for this sync link.", { id: toastId })
            }
          } catch (e) {
            toast.error("Cloud sync connection error.", { id: toastId })
          }
        }
        performSync()
      }
    }
  }, [])

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack={view !== 'accounts' && view !== 'settings' && view !== 'bank'} />
      <main className="flex-1">
        {view === 'accounts' && <AccountsView />}
        {view === 'companies' && <CompaniesView />}
        {view === 'ledger' && <LedgerView />}
        {view === 'invoice' && <InvoiceView />}
        {view === 'bol' && <BOLEditor />}
        {view === 'settings' && <SettingsView />}
        {view === 'bank' && <SkyBankView />}
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
