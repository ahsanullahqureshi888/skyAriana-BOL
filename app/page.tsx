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
import { InvoicePadView } from '@/components/invoice-pad-view'
import { SkyCmrView } from '@/components/sky-cmr-view'
import { SkyDocView } from '@/components/sky-doc-view'
import { ShipperDashboardView } from '@/components/shipper-dashboard'
import { ErrorBoundary } from '@/components/error-boundary'

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
      } else {
        // Automatic master database hydration for all devices
        const autoHydrateAllDevices = async () => {
          try {
            const raw1 = window.localStorage.getItem("skybol:saved-documents")
            const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
            const docs1 = raw1 ? JSON.parse(raw1) : []
            const docs2 = raw2 ? JSON.parse(raw2) : []
            const localCount = Math.max(docs1.length, docs2.length)

            const res = await fetch("/api/sync", { cache: "no-store" })
            if (res.ok) {
              const body = await res.json()
              const data = body.data || body
              if (Array.isArray(data.documents) && data.documents.length > 0) {
                // If local storage has fewer documents or needs refresh, merge seamlessly
                const mergedMap = new Map<string, any>()
                for (const d of data.documents) {
                  const k = d.bol_number || d.id
                  if (k) mergedMap.set(k, d)
                }
                for (const d of [...docs1, ...docs2]) {
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
                  const curRaw = window.localStorage.getItem("skybol:account-custom-companies")
                  const cur = curRaw ? JSON.parse(curRaw) : []
                  window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(Array.from(new Set([...cur, ...incoming]))))
                }
                if (data.ledgerRecords) {
                  const curRaw = window.localStorage.getItem("skybol:account-ledgers")
                  const cur = curRaw ? JSON.parse(curRaw) : {}
                  window.localStorage.setItem("skybol:account-ledgers", JSON.stringify({ ...cur, ...data.ledgerRecords }))
                }
                if (data.companySettings && !window.localStorage.getItem("skybol:company-settings")) {
                  window.localStorage.setItem("skybol:company-settings", JSON.stringify(data.companySettings))
                  window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(data.companySettings))
                }

                window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
                window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))
              }
            }
          } catch (e) {}
        }
        void autoHydrateAllDevices()
      }
    }
  }, [])

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  if (currentUser?.role === 'shipper' || view === 'shipper-portal') {
    return <ShipperDashboardView />
  }

  const isFullBleedView = view === "bank" || view === "invoice-pad" || view === "sky-cmr" || view === "sky-doc"

  return (
    <div className={isFullBleedView ? "h-screen w-full flex flex-col overflow-hidden bg-slate-950" : "min-h-screen flex flex-col"}>
      <Header showBack={view !== 'accounts' && view !== 'settings' && !isFullBleedView} />
      <main className={isFullBleedView ? "flex-1 w-full h-full overflow-hidden flex flex-col min-h-0" : "flex-1"}>
        {view === 'accounts' && <AccountsView />}
        {view === 'companies' && <CompaniesView />}
        {view === 'ledger' && <LedgerView />}
        {view === 'invoice' && <InvoiceView />}
        {view === 'bol' && <BOLEditor />}
        {view === 'settings' && <SettingsView />}
        {view === 'bank' && <SkyBankView />}
        {view === 'invoice-pad' && <InvoicePadView />}
        {view === 'sky-cmr' && <SkyCmrView />}
        {view === 'sky-doc' && <SkyDocView />}
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  )
}
