"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { safeLazy } from '@/lib/safe-lazy'
import { AppProvider, useApp } from '@/lib/app-context'
import { Header } from '@/components/header'
import { LoginScreen } from '@/components/login-screen'
import { ErrorBoundary } from '@/components/error-boundary'
import { toast } from 'sonner'
import { smartMergeLedgerRecords } from '@/lib/services/ledger-sync-utils'

function ViewLoadingSkeleton() {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in duration-100">
      <div className="w-12 h-12 rounded-2xl bg-blue-900/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
        <img src="/logo.png" alt="Sky Ariana" className="w-8 h-8 object-contain" />
      </div>
      <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
      </div>
      <p className="text-[11px] font-bold text-slate-400">Loading module...</p>
    </div>
  )
}

// Dynamic loaders with safe lazy wrappers
const viewLoaders: Record<string, () => Promise<any>> = {
  accounts: () => import('@/components/accounts-view'),
  companies: () => import('@/components/companies-view'),
  ledger: () => import('@/components/ledger-view'),
  invoice: () => import('@/components/invoice-view'),
  bol: () => import('@/components/bill-of-lading/bol-editor'),
  settings: () => import('@/components/settings-view'),
  bank: () => import('@/components/sky-bank-view'),
  'invoice-pad': () => import('@/components/invoice-pad-view'),
  'sky-cmr': () => import('@/components/sky-cmr-view'),
  'sky-doc': () => import('@/components/sky-doc-view'),
  reports: () => import('@/components/reports-view'),
  'shipper-portal': () => import('@/components/shipper-dashboard'),
  analytics: () => import('@/components/analytics-dashboard-view'),
}

export function preloadView(viewName: string) {
  try {
    const loader = viewLoaders[viewName]
    if (loader) {
      void loader()
    }
  } catch (_) {}
}

export function preloadAllViews() {
  if (typeof window === 'undefined') return
  const views = Object.keys(viewLoaders)
  const schedulePreload = () => {
    views.forEach((v, index) => {
      setTimeout(() => {
        preloadView(v)
      }, index * 40)
    })
  }

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(schedulePreload, { timeout: 1500 })
  } else {
    setTimeout(schedulePreload, 100)
  }
}

const AccountsView = dynamic(safeLazy(() => import('@/components/accounts-view').then(m => m.AccountsView)), { loading: ViewLoadingSkeleton })
const CompaniesView = dynamic(safeLazy(() => import('@/components/companies-view').then(m => m.CompaniesView)), { loading: ViewLoadingSkeleton })
const LedgerView = dynamic(safeLazy(() => import('@/components/ledger-view').then(m => m.LedgerView)), { loading: ViewLoadingSkeleton })
const InvoiceView = dynamic(safeLazy(() => import('@/components/invoice-view').then(m => m.InvoiceView)), { loading: ViewLoadingSkeleton })
const BOLEditor = dynamic(safeLazy(() => import('@/components/bill-of-lading/bol-editor').then(m => m.BOLEditor)), { loading: ViewLoadingSkeleton })
const SettingsView = dynamic(safeLazy(() => import('@/components/settings-view').then(m => m.SettingsView)), { loading: ViewLoadingSkeleton })
const SkyBankView = dynamic(safeLazy(() => import('@/components/sky-bank-view').then(m => m.SkyBankView)), { loading: ViewLoadingSkeleton })
const InvoicePadView = dynamic(safeLazy(() => import('@/components/invoice-pad-view').then(m => m.InvoicePadView)), { loading: ViewLoadingSkeleton })
const SkyCmrView = dynamic(safeLazy(() => import('@/components/sky-cmr-view').then(m => m.SkyCmrView)), { loading: ViewLoadingSkeleton })
const SkyDocView = dynamic(safeLazy(() => import('@/components/sky-doc-view').then(m => m.SkyDocView)), { loading: ViewLoadingSkeleton })
const ReportsView = dynamic(safeLazy(() => import('@/components/reports-view').then(m => m.ReportsView)), { loading: ViewLoadingSkeleton })
const ShipperDashboardView = dynamic(safeLazy(() => import('@/components/shipper-dashboard').then(m => m.ShipperDashboardView)), { loading: ViewLoadingSkeleton })
const AnalyticsDashboardView = dynamic(safeLazy(() => import('@/components/analytics-dashboard-view').then(m => m.AnalyticsDashboardView)), { loading: ViewLoadingSkeleton })
const QuickActionsWidget = dynamic(safeLazy(() => import('@/components/quick-actions-widget').then(m => m.QuickActionsWidget)), { ssr: false })

function MainContent() {
  const { view, isAuthenticated, currentUser, setView } = useApp()
  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => new Set(['accounts']))

  // Track visited views to keep them alive and ready
  useEffect(() => {
    if (view) {
      setVisitedViews(prev => {
        if (prev.has(view)) return prev
        const next = new Set(prev)
        next.add(view)
        return next
      })
    }
  }, [view])

  // Instant background preloading for all modules
  useEffect(() => {
    preloadAllViews()
  }, [])

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

              const allMerged = Array.from(mergedMap.values()).filter((d: any) => {
                const s = (d.shipper_name || "").trim().toLowerCase()
                const hasShipper = s !== "" && s !== "no shipper" && s !== "no-shipper" && s !== "none"
                const q = (d.number_of_packages || "").trim().toLowerCase()
                const hasPkg = q !== "" && q !== "0" && q !== "0-ctns" && q !== "0 ctns"
                const nw = (d.net_weight || "").trim()
                const gw = (d.gross_weight || "").trim()
                const val = (d.goods_value || "").trim()
                const cName = (d.consignee_name || "").trim().toLowerCase()
                const hasConsignee = cName !== "" && cName !== "no consignee"
                const hasDesc = (d.cargo_description || "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().length > 5
                return hasShipper || hasPkg || nw !== "" || gw !== "" || val !== "" || (hasConsignee && hasDesc)
              })
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
                const merged = smartMergeLedgerRecords(data.ledgerRecords, cur)
                window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(merged))
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

                const allMerged = Array.from(mergedMap.values()).filter((d: any) => {
                  const s = (d.shipper_name || "").trim().toLowerCase()
                  const hasShipper = s !== "" && s !== "no shipper" && s !== "no-shipper" && s !== "none"
                  const q = (d.number_of_packages || "").trim().toLowerCase()
                  const hasPkg = q !== "" && q !== "0" && q !== "0-ctns" && q !== "0 ctns"
                  const nw = (d.net_weight || "").trim()
                  const gw = (d.gross_weight || "").trim()
                  const val = (d.goods_value || "").trim()
                  const cName = (d.consignee_name || "").trim().toLowerCase()
                  const hasConsignee = cName !== "" && cName !== "no consignee"
                  const hasDesc = (d.cargo_description || "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().length > 5
                  return hasShipper || hasPkg || nw !== "" || gw !== "" || val !== "" || (hasConsignee && hasDesc)
                })
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
                  const merged = smartMergeLedgerRecords(data.ledgerRecords, cur)
                  window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(merged))
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
      <main className={isFullBleedView ? "flex-1 w-full h-full overflow-hidden flex flex-col min-h-0 relative" : "flex-1 relative"}>
        {/* Accounts View */}
        {visitedViews.has('accounts') && (
          <div className={view === 'accounts' ? 'w-full' : 'hidden'}>
            <AccountsView />
          </div>
        )}

        {/* Companies View */}
        {visitedViews.has('companies') && (
          <div className={view === 'companies' ? 'w-full' : 'hidden'}>
            <CompaniesView />
          </div>
        )}

        {/* Ledger View */}
        {visitedViews.has('ledger') && (
          <div className={view === 'ledger' ? 'w-full' : 'hidden'}>
            <LedgerView />
          </div>
        )}

        {/* Invoice View */}
        {visitedViews.has('invoice') && (
          <div className={view === 'invoice' ? 'w-full' : 'hidden'}>
            <InvoiceView />
          </div>
        )}

        {/* Bill of Lading (BOL) Editor */}
        {visitedViews.has('bol') && (
          <div className={view === 'bol' ? 'w-full' : 'hidden'}>
            <BOLEditor />
          </div>
        )}

        {/* Settings View */}
        {visitedViews.has('settings') && (
          <div className={view === 'settings' ? 'w-full' : 'hidden'}>
            <SettingsView />
          </div>
        )}

        {/* Reports View */}
        {visitedViews.has('reports') && (
          <div className={view === 'reports' ? 'w-full' : 'hidden'}>
            <ReportsView />
          </div>
        )}

        {/* Executive Analytics Dashboard View */}
        {visitedViews.has('analytics') && (
          <div className={view === 'analytics' ? 'w-full' : 'hidden'}>
            <AnalyticsDashboardView />
          </div>
        )}

        {/* Full-bleed Iframes: Keep mounted to avoid reconnect/re-render lag */}
        {visitedViews.has('bank') && (
          <div className={view === 'bank' ? 'w-full h-full flex-1 flex flex-col min-h-0' : 'hidden'}>
            <SkyBankView />
          </div>
        )}

        {visitedViews.has('invoice-pad') && (
          <div className={view === 'invoice-pad' ? 'w-full h-full flex-1 flex flex-col min-h-0' : 'hidden'}>
            <InvoicePadView />
          </div>
        )}

        {visitedViews.has('sky-cmr') && (
          <div className={view === 'sky-cmr' ? 'w-full h-full flex-1 flex flex-col min-h-0' : 'hidden'}>
            <SkyCmrView />
          </div>
        )}

        {visitedViews.has('sky-doc') && (
          <div className={view === 'sky-doc' ? 'w-full h-full flex-1 flex flex-col min-h-0' : 'hidden'}>
            <SkyDocView />
          </div>
        )}
      </main>

      {/* Global Floating Quick Actions Speed Dial */}
      {!isFullBleedView && (
        <QuickActionsWidget
          onOpenCommandPalette={() => {
            window.dispatchEvent(new CustomEvent('skybol:open-command-palette'))
          }}
          onOpenCloudSync={() => {
            window.dispatchEvent(new CustomEvent('skybol:open-cloud-sync'))
          }}
          onOpenChat={() => {
            setView('analytics')
          }}
        />
      )}
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
