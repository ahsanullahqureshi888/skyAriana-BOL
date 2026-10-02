"use client"

import '@/lib/polyfills'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { safeLazy, createSafeModule } from '@/lib/safe-lazy'
import { AppProvider, useApp } from '@/lib/app-context'
import { Header } from '@/components/header'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { LoginScreen } from '@/components/login-screen'
import { ErrorBoundary } from '@/components/error-boundary'
import { ModuleErrorBoundary } from '@/components/system/module-error-boundary'
import { StartupMachine } from '@/lib/startup/startup-machine'
import { scheduleIdlePreloads } from '@/lib/startup/module-preloader'
import { ModuleLoadingSkeleton } from '@/components/system/module-loading-skeleton'
import { toast } from 'sonner'
import { smartMergeLedgerRecords } from '@/lib/services/ledger-sync-utils'
import { UiOverflowDetector } from '@/components/system/ui-overflow-detector'
import { AppShell, MainWorkspace } from '@/components/layout'

const BOLEditor = createSafeModule('Bill of Lading', () => import('@/components/bill-of-lading/bol-editor').then(m => m.BOLEditor))
const AccountsView = createSafeModule('Customer Accounts', () => import('@/components/accounts-view').then(m => m.AccountsView))
const CompaniesView = createSafeModule('Companies', () => import('@/components/companies-view').then(m => m.CompaniesView))
const LedgerView = createSafeModule('Customer Ledger', () => import('@/components/ledger-view').then(m => m.LedgerView))

const MasterDataView = createSafeModule('Master Data', () => import('@/components/master-data/master-data-view').then(m => m.MasterDataView))
const SettingsView = createSafeModule('Settings & Diagnostics', () => import('@/components/settings-view').then(m => m.SettingsView))
const ShipmentOperationsDashboard = createSafeModule('Shipment Operations', () => import('@/components/shipments/shipment-operations-dashboard').then(m => m.ShipmentOperationsDashboard))
const ControlTowerView = createSafeModule('Control Tower', () => import('@/components/control-tower/control-tower-view').then(m => m.ControlTowerView))
const ShipperDashboardView = createSafeModule('Shipper Portal', () => import('@/components/shipper-dashboard').then(m => m.ShipperDashboardView))
const InvoiceView = createSafeModule('Invoice Center', () => import('@/components/invoice-view').then(m => m.InvoiceView))
const ReportsView = createSafeModule('Reports Center', () => import('@/components/reports-view').then(m => m.ReportsView))
const ExecutiveBiWorkspace = createSafeModule('Executive BI & Analytics Center', () => import('@/components/analytics/executive-bi-workspace').then(m => m.ExecutiveBiWorkspace))
const ExportCalculatorView = createSafeModule('Export Calculator', () => import('@/components/export-calculator-view').then(m => m.ExportCalculatorView))
const WhatsAppOperationsView = createSafeModule('WhatsApp Operations', () => import('@/components/whatsapp/whatsapp-operations-view').then(m => m.WhatsAppOperationsView))
const AdminCustomerPortalView = createSafeModule('Customer Portal Admin', () => import('@/components/customer-portal/admin-customer-portal-view').then(m => m.AdminCustomerPortalView))
const DocumentComplianceWorkspace = createSafeModule('Compliance Center', () => import('@/components/document-compliance/document-compliance-workspace').then(m => m.DocumentComplianceWorkspace))
const CustomerPortalView = createSafeModule('Customer Portal', () => import('@/components/customer-portal/customer-portal-view').then(m => m.CustomerPortalView))
const AccountingWorkspace = createSafeModule('Accounting Workspace', () => import('@/components/accounting/accounting-workspace').then(m => m.AccountingWorkspace))
const AccountingFinanceView = createSafeModule('Finance Center', () => import('@/components/finance/accounting-finance-view').then(m => m.AccountingFinanceView))
const WorkflowWorkspace = createSafeModule('Workflow Engine', () => import('@/components/workflow/workflow-workspace').then(m => m.WorkflowWorkspace))
const NotificationWorkspace = createSafeModule('Notification Center', () => import('@/components/notifications/notification-workspace').then(m => m.NotificationWorkspace))
const DataProtectionCenter = createSafeModule('Data Protection', () => import('@/components/data-protection/data-protection-center').then(m => m.DataProtectionCenter))
const AuditTrailCenter = createSafeModule('Audit Trail', () => import('@/components/audit/audit-trail-center').then(m => m.AuditTrailCenter))
const DailyOperationsCenter = createSafeModule('Daily Operations', () => import('@/components/daily-operations/daily-operations-center').then(m => m.DailyOperationsCenter))
const RouteLocationCenter = createSafeModule('Routes & Locations', () => import('@/components/locations/route-location-center').then(m => m.RouteLocationCenter))
const RatesQuotationsCenter = createSafeModule('Rates & Quotations', () => import('@/components/pricing/rates-quotations-center').then(m => m.RatesQuotationsCenter))
const FleetOperationsCenter = createSafeModule('Fleet Operations', () => import('@/components/fleet/fleet-operations-center').then(m => m.FleetOperationsCenter))
const WarehouseCargoCenter = createSafeModule('Warehouse Operations', () => import('@/components/warehouse/warehouse-cargo-center').then(m => m.WarehouseCargoCenter))
const CustomsBorderCenter = createSafeModule('Customs & Transit', () => import('@/components/customs/customs-border-center').then(m => m.CustomsBorderCenter))
const OceanOperationsCenter = createSafeModule('Ocean Operations', () => import('@/components/ocean/ocean-operations-center').then(m => m.OceanOperationsCenter))
const AirFreightCenter = createSafeModule('Air Freight', () => import('@/components/air/air-freight-center').then(m => m.AirFreightCenter))
const ClaimsCenter = createSafeModule('Claims & Incidents', () => import('@/components/claims/claims-center').then(m => m.ClaimsCenter))
const ProcurementCenterView = createSafeModule('Procurement & Vendors', () => import('@/components/procurement/procurement-center-view').then(m => m.ProcurementCenterView))
const CrmSalesCenter = createSafeModule('CRM & Sales', () => import('@/components/crm/crm-sales-center').then(m => m.CrmSalesCenter))
const PeriodClosingView = createSafeModule('Period Closing', () => import('@/components/accounting/period-closing/period-closing-view').then(m => m.PeriodClosingView))
const TreasuryWorkspace = createSafeModule('Treasury Workspace', () => import('@/components/accounting/treasury/treasury-workspace').then(m => m.TreasuryWorkspace))
const ManagementReportingWorkspace = createSafeModule('Management Reports', () => import('@/components/reports/management/management-reporting-workspace').then(m => m.ManagementReportingWorkspace))
const FileCenterWorkspace = createSafeModule('File Center', () => import('@/components/files/file-center-workspace').then(m => m.FileCenterWorkspace))
const CommunicationsWorkspace = createSafeModule('Communications Workspace', () => import('@/components/communications/communications-workspace').then(m => m.CommunicationsWorkspace))
import type { CustomerPortalSession } from '@/lib/types/customer-portal'

function MainContent() {
  const { view, setView, accounts, selectAccount, selectCompany, isAuthenticated, currentUser, currentAccount, currentCompany } = useApp()
  const [previewSession, setPreviewSession] = useState<CustomerPortalSession | null>(null)

  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e?.detail?.view) {
        setView(e.detail.view)
      }
    }
    window.addEventListener("skybol:navigate-view", handleNavigate)
    return () => window.removeEventListener("skybol:navigate-view", handleNavigate)
  }, [setView])

  useEffect(() => {
    StartupMachine.getInstance().transition("READY")
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  const ledgerPanel = currentAccount && currentCompany && view !== 'accounts' && view !== 'companies'
    ? <LedgerView />
    : currentAccount && view !== 'accounts'
      ? <CompaniesView />
      : <AccountsView />

  const handlePreviewCustomer = async (customerId: string) => {
    try {
      const res = await fetch("/api/portal/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, adminName: currentUser?.name || "Administrator" }),
      })
      const data = await res.json()
      if (res.ok && data.session) {
        setPreviewSession(data.session)
        setView('customer-portal')
      } else {
        toast.error("Failed to generate preview session")
      }
    } catch {
      toast.error("Connection error")
    }
  }

  const isShipper = currentUser?.role === 'shipper' || view === 'shipper-portal'
  const isBolView = !isShipper && (view === 'bol' || view === 'accounts' || view === 'companies' || view === 'ledger')

  return (
    <AppShell
      header={<Header />}
      footer={<MobileBottomNav />}
    >
      <MainWorkspace
        fluid={isBolView || isShipper}
        noPadding={isBolView}
      >
        {isShipper ? (
          <div key="shipper-portal" className="animate-page-crossfade">
            <ModuleErrorBoundary moduleName="Shipper Portal">
              <ShipperDashboardView />
            </ModuleErrorBoundary>
          </div>
        ) : (
          <>
            {isBolView && (
              <div key="bol-editor" className="animate-page-crossfade flex-1 flex flex-col min-h-0 h-full">
                <ModuleErrorBoundary moduleName="Bill of Lading Workspace">
                  <BOLEditor accountLedgerPanel={ledgerPanel} />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'settings' && (
              <div key="settings" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Settings & Diagnostics">
                  <SettingsView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'document-compliance' && (
              <div key="document-compliance" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Compliance Center">
                  <DocumentComplianceWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'shipments' && (
              <div key="shipments" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Control Tower">
                  <ControlTowerView
                    onOpenBol={(bolNumber?: string) => {
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
                    onOpenOperationsReport={() => {
                      setView('reports')
                    }}
                  />
                </ModuleErrorBoundary>
              </div>
            )}
            {(view === 'invoice' || view === 'invoice-pad') && (
              <div key={view} className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Invoice Center">
                  <InvoiceView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'reports' && (
              <div key="reports" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Reports Center">
                  <ReportsView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'analytics' && (
              <div key="analytics" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Executive BI & Analytics Center">
                  <ExecutiveBiWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'export-calculator' && (
              <div key="export-calculator" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Export Calculator">
                  <ExportCalculatorView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'whatsapp' && (
              <div key="whatsapp" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="WhatsApp Operations">
                  <WhatsAppOperationsView
                    onOpenBol={() => setView('bol')}
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
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'customer-portal-admin' && (
              <div key="customer-portal-admin" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Customer Portal Admin">
                  <AdminCustomerPortalView onPreviewCustomer={handlePreviewCustomer} />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'accounting' && (
              <div key="accounting" className="animate-page-crossfade w-full flex-1 flex flex-col min-h-0">
                <ModuleErrorBoundary moduleName="Accounting Workspace">
                  <AccountingWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'period-closing' && (
              <div key="period-closing" className="animate-page-crossfade max-w-[1780px] mx-auto p-3 sm:p-6">
                <ModuleErrorBoundary moduleName="Period Closing">
                  <PeriodClosingView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'treasury' && (
              <div key="treasury" className="animate-page-crossfade max-w-[1780px] mx-auto p-3 sm:p-6">
                <ModuleErrorBoundary moduleName="Treasury Workspace">
                  <TreasuryWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'management-reports' && (
              <div key="management-reports" className="animate-page-crossfade max-w-[1780px] mx-auto p-3 sm:p-6">
                <ModuleErrorBoundary moduleName="Management Reports">
                  <ManagementReportingWorkspace userRole={currentUser?.role || 'admin'} />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'accounting-finance' && (
              <div key="accounting-finance" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Finance Center">
                  <AccountingFinanceView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'master-data' && (
              <div key="master-data" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Master Data">
                  <MasterDataView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'workflow' && (
              <div key="workflow" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Workflow Engine">
                  <WorkflowWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'notifications' && (
              <div key="notifications" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Notification Center">
                  <NotificationWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'data-protection' && (
              <div key="data-protection" className="animate-page-crossfade w-full max-w-[1780px] mx-auto px-3 sm:px-6 py-2">
                <ModuleErrorBoundary moduleName="Data Protection">
                  <DataProtectionCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'audit-history' && (
              <div key="audit-history" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Audit Trail">
                  <AuditTrailCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'daily-operations' && (
              <div key="daily-operations" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Daily Operations">
                  <DailyOperationsCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'routes-locations' && (
              <div key="routes-locations" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Routes & Locations">
                  <RouteLocationCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'rates-quotations' && (
              <div key="rates-quotations" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Rates & Quotations">
                  <RatesQuotationsCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'procurement' && (
              <div key="procurement" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Procurement & Vendors">
                  <ProcurementCenterView />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'fleet-operations' && (
              <div key="fleet-operations" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Fleet Operations">
                  <FleetOperationsCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'warehouse-cargo' && (
              <div key="warehouse-cargo" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Warehouse Operations">
                  <WarehouseCargoCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'customs-transit' && (
              <div key="customs-transit" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Customs & Transit">
                  <CustomsBorderCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'ocean-operations' && (
              <div key="ocean-operations" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Ocean Freight">
                  <OceanOperationsCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'air-freight' && (
              <div key="air-freight" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Air Freight">
                  <AirFreightCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'claims-incidents' && (
              <div key="claims-incidents" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Claims & Incidents">
                  <ClaimsCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'crm-sales' && (
              <div key="crm-sales" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="CRM & Sales">
                  <CrmSalesCenter />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'file-center' && (
              <div key="file-center" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="File & Attachment Center">
                  <FileCenterWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'communications' && (
              <div key="communications" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Communications Workspace">
                  <CommunicationsWorkspace />
                </ModuleErrorBoundary>
              </div>
            )}
            {view === 'customer-portal' && previewSession && (
              <div key="customer-portal-preview" className="animate-page-crossfade">
                <ModuleErrorBoundary moduleName="Customer Portal Preview">
                  <CustomerPortalView
                    session={previewSession}
                    onSignOut={() => {
                      setPreviewSession(null)
                      setView('customer-portal-admin')
                    }}
                  />
                </ModuleErrorBoundary>
              </div>
            )}
          </>
        )}
      </MainWorkspace>
      <UiOverflowDetector />
    </AppShell>
  )
}

import { FirstRunWizard } from '@/components/restore/first-run-wizard'

export default function Home() {
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false)
  const [hasGAuth, setHasGAuth] = useState<boolean>(false)

  useEffect(() => {
    // If local storage already confirms existing session or records, skip network request
    if (
      window.localStorage.getItem("skybol:first-run-completed") === "true" ||
      window.localStorage.getItem("skybol:user") ||
      window.localStorage.getItem("sky-bol-browser-documents") ||
      window.localStorage.getItem("skybol:saved-documents")
    ) {
      return
    }

    const checkSystemStatus = async () => {
      try {
        const res = await fetch("/api/system/status")
        if (res.ok) {
          const data = await res.json()
          if (data.isFirstRun) {
            setIsFirstRun(true)
          }
          setHasGAuth(Boolean(data.hasGoogleDriveAuth))
        }
      } catch (e) {
        // Fallback silently to normal app
      }
    }
    checkSystemStatus()
  }, [])

  if (isFirstRun) {
    return (
      <ErrorBoundary>
        <FirstRunWizard 
          onComplete={() => setIsFirstRun(false)} 
          hasGoogleDriveAuth={hasGAuth} 
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  )
}
