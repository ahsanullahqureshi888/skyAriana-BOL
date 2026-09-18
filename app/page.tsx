"use client"

import { useEffect } from 'react'
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

const BOLEditor = dynamic(safeLazy(() => import('@/components/bill-of-lading/bol-editor').then(m => m.BOLEditor)), { loading: ViewLoadingSkeleton })
const AccountsView = dynamic(safeLazy(() => import('@/components/accounts-view').then(m => m.AccountsView)), { loading: ViewLoadingSkeleton })
const CompaniesView = dynamic(safeLazy(() => import('@/components/companies-view').then(m => m.CompaniesView)), { loading: ViewLoadingSkeleton })
const LedgerView = dynamic(safeLazy(() => import('@/components/ledger-view').then(m => m.LedgerView)), { loading: ViewLoadingSkeleton })

const SettingsView = dynamic(safeLazy(() => import('@/components/settings-view').then(m => m.SettingsView)), { loading: ViewLoadingSkeleton })
const ShipmentOperationsDashboard = dynamic(safeLazy(() => import('@/components/shipments/shipment-operations-dashboard').then(m => m.ShipmentOperationsDashboard)), { loading: ViewLoadingSkeleton })

function MainContent() {
  const { view, setView, accounts, selectAccount, selectCompany, isAuthenticated, currentUser, currentAccount, currentCompany } = useApp()

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
                // If local storage has documents, merge preserving newest records and never dropping newly created BOLs
                const mergedMap = new Map<string, any>()
                const addOrMerge = (d: any) => {
                  const k = (d.bol_number || d.id || "").trim()
                  if (!k) return
                  const existing = mergedMap.get(k)
                  if (!existing) {
                    mergedMap.set(k, d)
                  } else {
                    const timeExisting = new Date(existing.updated_at || existing.created_at || existing.issue_date || 0).getTime()
                    const timeNew = new Date(d.updated_at || d.created_at || d.issue_date || 0).getTime()
                    if (timeNew >= timeExisting) {
                      mergedMap.set(k, { ...existing, ...d })
                    }
                  }
                }

                for (const d of data.documents) addOrMerge(d)
                for (const d of [...docs1, ...docs2]) addOrMerge(d)

                const allMerged = Array.from(mergedMap.values()).filter((d: any) => {
                  const s = (d.shipper_name || "").trim().toLowerCase()
                  const hasShipper = s !== "" && s !== "no shipper" && s !== "no-shipper" && s !== "none"
                  const hasBol = Boolean(d.bol_number && String(d.bol_number).trim().length > 3)
                  const q = (d.number_of_packages || "").trim().toLowerCase()
                  const hasPkg = q !== "" && q !== "0" && q !== "0-ctns" && q !== "0 ctns"
                  const nw = (d.net_weight || "").trim()
                  const gw = (d.gross_weight || "").trim()
                  const val = (d.goods_value || "").trim()
                  const cName = (d.consignee_name || "").trim().toLowerCase()
                  const hasConsignee = cName !== "" && cName !== "no consignee"
                  const hasDesc = (d.cargo_description || "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().length > 3
                  const hasDriver = Boolean((d.driver_name || "").trim() || (d.driver_rent || "").trim() || (d.truck_number || "").trim())
                  return hasShipper || hasBol || hasPkg || nw !== "" || gw !== "" || val !== "" || hasConsignee || hasDesc || hasDriver
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

  const ledgerPanel = currentAccount && currentCompany && view !== 'accounts' && view !== 'companies'
    ? <LedgerView />
    : currentAccount && view !== 'accounts'
      ? <CompaniesView />
      : <AccountsView />

  return (
    <div className="liquid-workspace min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 min-w-0">
        <div className={view === 'settings' || view === 'shipments' ? 'hidden' : undefined}>
          <BOLEditor accountLedgerPanel={ledgerPanel} />
        </div>
        {view === 'settings' && <SettingsView />}
        {view === 'shipments' && (
          <ShipmentOperationsDashboard
            onOpenBol={() => {
              setView('bol')
            }}
            onOpenLedger={(accountName?: string) => {
              if (accountName) {
                const foundAccount = accounts.find((a) => a.name.toLowerCase() === accountName.toLowerCase())
                if (foundAccount) {
                  selectAccount(foundAccount)
                  if (foundAccount.companies && foundAccount.companies.length > 0) {
                    selectCompany(foundAccount.companies[0])
                  }
                }
              }
              setView('ledger')
            }}
          />
        )}
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
