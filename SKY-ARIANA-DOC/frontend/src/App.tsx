import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translations } from './i18n/translations'
import type { Language } from './i18n/translations'
import { BRAND_LOGO_SRC, DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_SUBTITLE, resolveBrandAssetUrl } from './config/branding'
import { useCompanyBranding } from './hooks/useCompanySettings'
const Login = React.lazy(() => import('./pages/Login'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const InvoiceList = React.lazy(() => import('./pages/InvoiceList'))
const InvoiceForm = React.lazy(() => import('./pages/InvoiceForm'))
const InvoiceDetail = React.lazy(() => import('./pages/InvoiceDetail'))
const PrintPreview = React.lazy(() => import('./pages/PrintPreview'))
const AcciInvoices = React.lazy(() => import('./pages/AcciInvoices'))
const AcciPackingLists = React.lazy(() => import('./pages/AcciPackingLists'))
const ShippingStickers = React.lazy(() => import('./pages/ShippingStickers'))
const AirWaybills = React.lazy(() => import('./pages/AirWaybills'))
const SaftaCertificates = React.lazy(() => import('./pages/SaftaCertificates'))
const PackingLists = React.lazy(() => import('./pages/PackingLists'))
const Customers = React.lazy(() => import('./pages/Customers'))
const BusinessParties = React.lazy(() => import('./pages/BusinessParties'))
const Products = React.lazy(() => import('./pages/Products'))
const CompanySettings = React.lazy(() => import('./pages/CompanySettings'))
const Backups = React.lazy(() => import('./pages/Backups'))
const Logs = React.lazy(() => import('./pages/Logs'))
const UserManagement = React.lazy(() => import('./pages/UserManagement'))
const AccessDenied = React.lazy(() => import('./pages/AccessDenied'))
const SoftwareUpdate = React.lazy(() => import('./pages/SoftwareUpdate'))
const Ledger = React.lazy(() => import('./pages/Ledger'))
import { authApi } from './services/api'
import { Award, WalletCards } from 'lucide-react'
import SuspenseLoader from './components/SuspenseLoader'
import PageTransition from './components/PageTransition'

import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Database,
  History,
  LogOut,
  ChevronLeft,
  Globe,
  Menu,
  ShieldCheck,
  Ship,
  BellRing,
  ClipboardList,
  ClipboardCheck,
  Tag,
  ReceiptText,
  Plane,
  Sparkles,
  Search
} from 'lucide-react'

// Core Contexts
const AppContext = createContext<any>(null)

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

const queryClient = new QueryClient()

const BrandingDocumentTitle = () => {
  const { data: companyBranding } = useCompanyBranding()
  const companyName = companyBranding?.company_name?.trim() || DEFAULT_COMPANY_NAME

  useEffect(() => {
    document.title = companyName
  }, [companyName])

  return null
}

// Layout Wrapper
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { lang, t, dir, setUser, user } = useApp()
  const { data: companySettings } = useCompanyBranding()
  const [appZoom, setAppZoom] = useState(() => localStorage.getItem('app-ui-zoom') || '0.90')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSetZoom = (scale: string) => {
    setAppZoom(scale)
    localStorage.setItem('app-ui-zoom', scale)
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 820px)')
    const syncSidebar = () => {
      setIsMobile(mediaQuery.matches)
      if (mediaQuery.matches) setMobileSidebarOpen(false)
    }
    syncSidebar()
    mediaQuery.addEventListener?.('change', syncSidebar)
    return () => mediaQuery.removeEventListener?.('change', syncSidebar)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(false)
      return
    }

    setCollapsed((current) => {
      const next = !current
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const userData = user || JSON.parse(localStorage.getItem('user') || '{}')
  const isSuperAdmin = userData.role_name === 'Super Admin' || userData.role === 'Super Admin'
  const can = (permission: string) => isSuperAdmin || userData.permissions?.includes(permission)
  const sidebarSections = [
    {
      label: 'Main Portal',
      items: [{ name: t.dashboard, path: '/', icon: LayoutDashboard, badge: null }],
    },
    {
      label: 'Core Documents',
      items: [
        { name: t.invoices, path: '/invoices', icon: FileText, badge: 'COMMERCIAL' },
        { name: 'Packing Lists', path: '/packing-lists', icon: ClipboardList, badge: null },
        { name: 'Ledger Accounts', path: '/ledger', icon: WalletCards, badge: 'FINANCE' },
      ],
    },
    {
      label: 'ACCI & Freight Suite',
      items: [
        { name: t.acci_invoices, path: '/acci-invoices', icon: ReceiptText, badge: 'ACCI', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
        { name: 'ACCI Packing Lists', path: '/acci-packing-lists', icon: ClipboardCheck, badge: 'ACCI', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
        { name: 'Shipping Stickers', path: '/shipping-stickers', icon: Tag, badge: 'STICKER', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
        { name: 'Air Waybills', path: '/air-waybills', icon: Plane, badge: 'IATA', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' },
        { name: 'SAFTA Certificates', path: '/safta-certificates', icon: Award, badge: 'SAFTA', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
      ],
    },
    {
      label: 'Trade Directory',
      items: [
        { name: t.customers, path: '/customers', icon: Users, badge: null },
        ...(can('parties.view') ? [
          { name: 'Shippers & Exporters', path: '/shippers', icon: Ship, badge: null },
          { name: 'Notify Parties', path: '/notify-parties', icon: BellRing, badge: null },
        ] : []),
        { name: t.products, path: '/products', icon: Package, badge: null },
      ],
    },
    {
      label: 'Administration',
      items: [
        ...(can('company.view') ? [{ name: t.settings, path: '/settings', icon: Settings, badge: null }] : []),
        { name: t.backups, path: '/backups', icon: Database, badge: null },
        { name: t.activity_history, path: '/logs', icon: History, badge: null },
        { name: 'Software Updates', path: '/software-update', icon: Sparkles, badge: 'PRO', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
        ...(can('users.view') ? [{ name: 'User Management', path: '/user-management', icon: ShieldCheck, badge: null }] : []),
      ],
    },
  ]

  const activePath = location.pathname

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const userName = userData.name || 'User'
  const userRole = userData.role || 'Viewer'
  const userInitials = getInitials(userName)
  const sidebarCollapsed = isMobile ? false : collapsed
  const companyName = companySettings?.company_name?.trim() || t.company_name || DEFAULT_COMPANY_NAME
  const companySubtitle = companySettings?.subtitle?.trim() || DEFAULT_COMPANY_SUBTITLE
  const companyLogo = resolveBrandAssetUrl(companySettings?.logo_path) || BRAND_LOGO_SRC

  return (
    <div className="app-shell flex h-full w-full overflow-hidden app-background font-sans text-slate-800" dir={dir}>
      {/* Mobile Drawer Scrim */}
      {isMobile && mobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="mobile-drawer-scrim fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity animate-fade-in cursor-pointer border-0 w-full h-full"
          aria-label="Close menu backdrop"
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside className={`sidebar text-slate-100 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} ${isMobile ? `mobile-drawer ${mobileSidebarOpen ? 'is-open z-60' : 'is-closed'}` : ''} shrink-0 no-print`}>
        {/* Branding */}
        <div className="sidebar-brand h-18.5 flex items-center justify-between px-3.5 border-b border-white/10 shrink-0">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 text-left pl-0.5 overflow-hidden">
                <img src={companyLogo} alt={`${companyName} logo`} className="sidebar-logo w-14 h-11 rounded-xl object-contain bg-white/95 p-1 border border-white/20 shrink-0 shadow-md" />
                <div className="flex flex-col overflow-hidden">
                  <span className="sidebar-brand__name font-bold text-xs text-white truncate" title={companyName}>{companyName}</span>
                  <span className="sidebar-brand__subtitle text-[9px] text-slate-400 font-medium truncate" title={companySubtitle}>{companySubtitle}</span>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className="sidebar-collapse-button hover:bg-white/10 p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors shrink-0"
                title={isMobile ? 'Close sidebar' : 'Collapse sidebar'}
                aria-label={isMobile ? 'Close sidebar' : 'Collapse sidebar'}
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="sidebar-brand__compact mx-auto flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <img src={companyLogo} alt={`${companyName} logo`} className="w-9 h-9 rounded-lg object-contain bg-white/95 p-0.5 shadow-xs" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 sidebar-scroll py-3.5 space-y-4.5 px-3">
          {sidebarSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{section.label}</span>
                </div>
              )}
              {section.items.map((item: any) => {
                const Icon = item.icon
                const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path))
                return (
                  <div key={item.path} className="relative group">
                    <Link
                      to={item.path}
                      onClick={() => isMobile && setMobileSidebarOpen(false)}
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-xl font-medium text-xs transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 border border-blue-400/40'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={17} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        {!sidebarCollapsed && <span className="truncate text-xs">{item.name}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-md border ${item.badgeColor || 'bg-white/15 text-white/90 border-white/20'}`}>
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0 shadow-xs" />
                          )}
                        </div>
                      )}
                    </Link>

                    {/* Tooltip for collapsed sidebar */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-white/3">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-xl bg-white/5 border border-white/5`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative">
                <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-blue-400/40 shadow-sm">
                  {userInitials}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-white truncate">{userName}</span>
                  <span className="text-[9.5px] text-slate-400 font-medium truncate">{userRole}</span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title="Log out">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-12 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
            )}
            <h2 className="text-sm font-bold text-slate-800 tracking-tight hidden sm:block">{companyName}</h2>
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={15} />
              <input
                type="search"
                placeholder="Global Search (Invoices, Customers, Waybills...)"
                className="w-full bg-slate-100/50 hover:bg-slate-100 border border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-full pl-9 pr-4 py-1.5 text-xs font-medium text-slate-700 transition-all outline-none"
              />
            </div>
          </div>

          {/* Global Zoom Control */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs shrink-0 shadow-2xs">
            <span className="text-[11px] font-extrabold text-slate-500 px-1.5 flex items-center gap-1">
              <span>🔍</span> Zoom:
            </span>
            <button
              type="button"
              onClick={() => handleSetZoom('0.85')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                appZoom === '0.85' ? 'bg-white text-blue-600 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="85% High Density Compact View"
            >
              85%
            </button>
            <button
              type="button"
              onClick={() => handleSetZoom('0.90')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                appZoom === '0.90' ? 'bg-white text-blue-600 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="90% Balanced Out-Zoomed Executive View"
            >
              90%
            </button>
            <button
              type="button"
              onClick={() => handleSetZoom('1.0')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                appZoom === '1.0' ? 'bg-white text-blue-600 shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="100% Standard Size"
            >
              100%
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main 
          className="flex-1 flex flex-col min-h-0 overflow-x-hidden overflow-y-auto bg-slate-50 relative transition-all duration-200"
          style={{ zoom: appZoom }}
        >
          <React.Suspense fallback={<SuspenseLoader />}>
            {children}
          </React.Suspense>
        </main>
      </div>
    </div>
  )
}

const PermissionRoute = ({ permission, children }: { permission: string; children: React.ReactNode }) => {
  const { user } = useApp()
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  const userData = user || JSON.parse(localStorage.getItem('user') || '{}')
  const allowed = userData.role_name === 'Super Admin' || userData.role === 'Super Admin' || userData.permissions?.includes(permission)
  return <DashboardLayout>{allowed ? children : <AccessDenied />}</DashboardLayout>
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <DashboardLayout>{children}</DashboardLayout>
}

function App() {
  const [lang, setLang] = useState<Language>('en')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem('lang')
    if (savedLang === 'en' || savedLang === 'fa' || savedLang === 'ps') {
      setLang(savedLang)
    }
    const savedUser = localStorage.getItem('user')
    if (savedUser) setUser(JSON.parse(savedUser))
    if (localStorage.getItem('token')) {
      authApi.getMe().then((freshUser) => {
        localStorage.setItem('user', JSON.stringify(freshUser))
        setUser(freshUser)
      }).catch(() => undefined)
    }
  }, [])

  const t = translations[lang]
  const dir = lang === 'fa' || lang === 'ps' ? 'rtl' : 'ltr'

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px', borderRadius: '12px' } }} />
      <BrandingDocumentTitle />
      <AppContext.Provider value={{ lang, setLang, user, setUser, t, dir }}>
        <BrowserRouter>
          <React.Suspense fallback={<SuspenseLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/invoice/:id/print" element={<PrintPreview />} />
              <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><PageTransition><InvoiceList /></PageTransition></ProtectedRoute>} />
              <Route path="/invoices/create" element={<ProtectedRoute><PageTransition><InvoiceForm /></PageTransition></ProtectedRoute>} />
              <Route path="/invoices/:id/edit" element={<ProtectedRoute><PageTransition><InvoiceForm /></PageTransition></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><PageTransition><InvoiceDetail /></PageTransition></ProtectedRoute>} />
              <Route path="/acci-invoices" element={<ProtectedRoute><PageTransition><AcciInvoices /></PageTransition></ProtectedRoute>} />
              <Route path="/acci-packing-lists" element={<ProtectedRoute><PageTransition><AcciPackingLists /></PageTransition></ProtectedRoute>} />
              <Route path="/shipping-stickers" element={<ProtectedRoute><PageTransition><ShippingStickers /></PageTransition></ProtectedRoute>} />
              <Route path="/air-waybills" element={<ProtectedRoute><PageTransition><AirWaybills /></PageTransition></ProtectedRoute>} />
              <Route path="/safta-certificates" element={<ProtectedRoute><PageTransition><SaftaCertificates /></PageTransition></ProtectedRoute>} />
              <Route path="/ledger" element={<ProtectedRoute><PageTransition><Ledger /></PageTransition></ProtectedRoute>} />
              <Route path="/packing-lists" element={<ProtectedRoute><PageTransition><PackingLists /></PageTransition></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><PageTransition><Customers /></PageTransition></ProtectedRoute>} />
              <Route path="/shippers" element={<PermissionRoute permission="shippers.view"><PageTransition><BusinessParties partyType="shipper" /></PageTransition></PermissionRoute>} />
              <Route path="/notify-parties" element={<PermissionRoute permission="notify_parties.view"><PageTransition><BusinessParties partyType="notify_party" /></PageTransition></PermissionRoute>} />
              <Route path="/products" element={<ProtectedRoute><PageTransition><Products /></PageTransition></ProtectedRoute>} />
              <Route path="/settings" element={<PermissionRoute permission="company.view"><PageTransition><CompanySettings /></PageTransition></PermissionRoute>} />
              <Route path="/backups" element={<ProtectedRoute><PageTransition><Backups /></PageTransition></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute><PageTransition><Logs /></PageTransition></ProtectedRoute>} />
              <Route path="/software-update" element={<ProtectedRoute><PageTransition><SoftwareUpdate /></PageTransition></ProtectedRoute>} />
              <Route path="/user-management" element={<PermissionRoute permission="users.view"><PageTransition><UserManagement /></PageTransition></PermissionRoute>} />
              <Route path="/access-denied" element={<ProtectedRoute><PageTransition><AccessDenied /></PageTransition></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </AppContext.Provider>
    </QueryClientProvider>
  )
}

export default App
