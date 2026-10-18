"use client"

import Image from 'next/image'
import { useRef, useState, useMemo, startTransition } from 'react'
import { QuickShipmentModal } from '@/components/shipments/quick-shipment-modal'
import {
  LogOut,
  Settings,
  ArrowLeft,
  Package,
  MessageSquare,
  Users,
  BookOpen,
  Landmark,
  FileCheck2,
  Activity,
  ChevronDown,
  BarChart3,
  Calculator,
  Compass,
  Database,
  Zap,
  ShieldCheck,
  History,
  CalendarCheck2,
  Sparkles,
  Tag,
  Truck,
  Boxes,
  ShieldAlert,
  Ship,
  Plane,
  AlertTriangle,
  Lock,
  TrendingUp,
  FolderArchive,
  LayoutGrid,
  Search,
  Globe,
  Check,
  X,
  Plus,
  FileText,
  Receipt,
  Building2,
  ChevronRight,
  Layers,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react"
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'
import { HeaderCloudSyncButton } from '@/components/sync/header-cloud-sync-button'
import { ServerStatusPill } from '@/components/server/server-status-pill'
import { HeaderProtectionPill } from '@/components/backup/header-protection-pill'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/global-search'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  showBack?: boolean
  title?: string
  subtitle?: string
}

export interface EnterpriseModuleItem {
  id: string
  title: string
  shortLabel: string
  subtitle: string
  icon: React.ElementType
  category: 'ops' | 'finance' | 'commercial' | 'system'
  color: string
}

export const ENTERPRISE_MODULES: EnterpriseModuleItem[] = [
  // --- 1. FREIGHT & OPERATIONS ---
  {
    id: 'shipments',
    title: 'Control Tower',
    shortLabel: 'Control Tower',
    subtitle: 'Live logistics & active shipments',
    icon: Activity,
    category: 'ops',
    color: 'text-blue-500 dark:text-blue-400',
  },
  {
    id: 'analytics',
    title: 'Executive BI & Analytics',
    shortLabel: 'Analytics & BI',
    subtitle: 'Executive KPIs, margins & trends',
    icon: BarChart3,
    category: 'ops',
    color: 'text-indigo-400 dark:text-indigo-300',
  },
  {
    id: 'daily-operations',
    title: 'Daily Operations',
    shortLabel: 'Daily Ops',
    subtitle: "Daily tasks, follow-ups & EOD reports",
    icon: CalendarCheck2,
    category: 'ops',
    color: 'text-rose-500 dark:text-rose-400',
  },
  {
    id: 'ocean-operations',
    title: 'Ocean Operations',
    shortLabel: 'Ocean Ops',
    subtitle: 'Sea freight, voyages & container tracking',
    icon: Ship,
    category: 'ops',
    color: 'text-cyan-500 dark:text-cyan-400',
  },
  {
    id: 'procurement',
    title: 'Procurement & Vendors',
    shortLabel: 'Procurement',
    subtitle: 'Suppliers, RFQs & service orders',
    icon: Truck,
    category: 'ops',
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'air-freight',
    title: 'Air Freight & AWB',
    shortLabel: 'Air Freight',
    subtitle: 'Air cargo, schedules & MAWB/HAWB',
    icon: Plane,
    category: 'ops',
    color: 'text-sky-500 dark:text-sky-400',
  },
  {
    id: 'fleet-operations',
    title: 'Fleet & Trucking',
    shortLabel: 'Fleet Ops',
    subtitle: 'Truck fleet, drivers & border transit',
    icon: Truck,
    category: 'ops',
    color: 'text-orange-500 dark:text-orange-400',
  },
  {
    id: 'warehouse-cargo',
    title: 'Warehouse & Cargo',
    shortLabel: 'Warehouse',
    subtitle: 'Cross-docking, tally sheets & storage',
    icon: Boxes,
    category: 'ops',
    color: 'text-amber-500 dark:text-amber-400',
  },
  {
    id: 'customs-transit',
    title: 'Customs & Border',
    shortLabel: 'Customs',
    subtitle: 'Border clearance & transit bonds',
    icon: ShieldAlert,
    category: 'ops',
    color: 'text-indigo-400 dark:text-indigo-300',
  },
  {
    id: 'booking-containers',
    title: 'Booking & Containers',
    shortLabel: 'Bookings',
    subtitle: 'Shipping lines & container allocations',
    icon: Package,
    category: 'ops',
    color: 'text-teal-500 dark:text-teal-400',
  },
  {
    id: 'claims-incidents',
    title: 'Claims & Incidents',
    shortLabel: 'Claims Desk',
    subtitle: 'Cargo damage, shortage & disputes',
    icon: AlertTriangle,
    category: 'ops',
    color: 'text-amber-400 dark:text-amber-300',
  },

  // --- 2. FINANCE & ACCOUNTING ---
  {
    id: 'accounting',
    title: 'General Accounting',
    shortLabel: 'Accounting',
    subtitle: 'Customer & supplier running ledgers',
    icon: BookOpen,
    category: 'finance',
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  {
    id: 'accounting-finance',
    title: 'Finance & Balance Sheet',
    shortLabel: 'Finance',
    subtitle: 'P&L, balance sheet & trial balance',
    icon: Landmark,
    category: 'finance',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'treasury',
    title: 'Treasury & Bank / Cash',
    shortLabel: 'Treasury',
    subtitle: 'Bank accounts, cash tills & FX exchange',
    icon: Landmark,
    category: 'finance',
    color: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    id: 'period-closing',
    title: 'Period Closing & Locks',
    shortLabel: 'Period Closing',
    subtitle: 'Fiscal period locks & reconciliations',
    icon: Lock,
    category: 'finance',
    color: 'text-blue-500 dark:text-blue-300',
  },
  {
    id: 'management-reports',
    title: 'Management Reporting',
    shortLabel: 'Mgmt Reports',
    subtitle: 'Executive statements & margin audits',
    icon: TrendingUp,
    category: 'finance',
    color: 'text-indigo-500 dark:text-indigo-400',
  },
  {
    id: 'reports',
    title: 'Report Center & P&L',
    shortLabel: 'Reports & P&L',
    subtitle: 'Exportable statements & tax reports',
    icon: BarChart3,
    category: 'finance',
    color: 'text-amber-500 dark:text-amber-400',
  },
  {
    id: 'export-calculator',
    title: 'Transit Calculator',
    shortLabel: 'Calculator',
    subtitle: 'Multi-leg freight cost estimator',
    icon: Calculator,
    category: 'finance',
    color: 'text-emerald-400 dark:text-emerald-300',
  },

  // --- 3. COMMERCIAL & SALES ---
  {
    id: 'crm-sales',
    title: 'CRM & Sales Pipeline',
    shortLabel: 'CRM & Sales',
    subtitle: 'Leads, pipeline & customer desk',
    icon: Users,
    category: 'commercial',
    color: 'text-amber-500 dark:text-amber-400',
  },
  {
    id: 'rates-quotations',
    title: 'Rates & Quotations',
    shortLabel: 'Rates & Quotes',
    subtitle: 'Buy/sell pricing engine & rate cards',
    icon: Tag,
    category: 'commercial',
    color: 'text-indigo-400 dark:text-indigo-300',
  },
  {
    id: 'routes-locations',
    title: 'Routes & Locations',
    shortLabel: 'Routes Master',
    subtitle: 'Corridors, border stations & sea ports',
    icon: Compass,
    category: 'commercial',
    color: 'text-cyan-400 dark:text-cyan-300',
  },
  {
    id: 'customer-portal-admin',
    title: 'Customer Portal Admin',
    shortLabel: 'Portal Admin',
    subtitle: 'Client login management & visibility',
    icon: Users,
    category: 'commercial',
    color: 'text-purple-400 dark:text-purple-300',
  },
  {
    id: 'shipper-portal',
    title: 'Shipper Portal View',
    shortLabel: 'Shipper Portal',
    subtitle: 'Customer self-service cargo tracking',
    icon: Globe,
    category: 'commercial',
    color: 'text-blue-400 dark:text-blue-300',
  },

  // --- 4. COMPLIANCE, FILES & SYSTEMS ---
  {
    id: 'document-compliance',
    title: 'Document Compliance',
    shortLabel: 'Compliance',
    subtitle: 'Shipping documents & transit approvals',
    icon: FileCheck2,
    category: 'system',
    color: 'text-indigo-500 dark:text-indigo-400',
  },
  {
    id: 'file-center',
    title: 'File & Attachment Center',
    shortLabel: 'Files',
    subtitle: 'Digital shipment folders & documents',
    icon: FolderArchive,
    category: 'system',
    color: 'text-cyan-500 dark:text-cyan-400',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Operations',
    shortLabel: 'WhatsApp',
    subtitle: 'Client WhatsApp alerts & chat dispatch',
    icon: MessageSquare,
    category: 'system',
    color: 'text-green-500 dark:text-green-400',
  },
  {
    id: 'workflow',
    title: 'Workflow Engine',
    shortLabel: 'Workflow',
    subtitle: 'Milestone triggers & automated task gates',
    icon: Zap,
    category: 'system',
    color: 'text-amber-400 dark:text-amber-300',
  },
  {
    id: 'communications',
    title: 'Communications Center',
    shortLabel: 'Communications',
    subtitle: 'Central dispatch notices & alerts',
    icon: MessageSquare,
    category: 'system',
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  {
    id: 'master-data',
    title: 'Master Data Center',
    shortLabel: 'Master Data',
    subtitle: 'Shippers, consignees & carriers',
    icon: Database,
    category: 'system',
    color: 'text-indigo-400 dark:text-indigo-300',
  },
  {
    id: 'audit-history',
    title: 'Audit Trail & History',
    shortLabel: 'Audit Trail',
    subtitle: 'Immutable chronological change logs',
    icon: History,
    category: 'system',
    color: 'text-purple-500 dark:text-purple-400',
  },
  {
    id: 'data-protection',
    title: 'Data Protection & Backup',
    shortLabel: 'Backup & DR',
    subtitle: 'Encrypted backups & zero data loss',
    icon: ShieldCheck,
    category: 'system',
    color: 'text-emerald-500 dark:text-emerald-400',
  },
  {
    id: 'ai-assistant',
    title: 'Sky AI Operations Assistant',
    shortLabel: 'Ask AI',
    subtitle: 'AI copilot for shipments & ledgers',
    icon: Sparkles,
    category: 'system',
    color: 'text-purple-400 dark:text-purple-300',
  },
  {
    id: 'settings',
    title: 'System Settings',
    shortLabel: 'Settings',
    subtitle: 'Company profile, layouts & config',
    icon: Settings,
    category: 'system',
    color: 'text-slate-400 dark:text-slate-300',
  },
]

export function Header({ title, subtitle }: HeaderProps) {
  const { currentUser, logout, view, setView } = useApp()
  const previousView = useRef<typeof view>('accounts')
  const [showQuickShipment, setShowQuickShipment] = useState(false)
  const [megaSearch, setMegaSearch] = useState('')
  const [selectedMegaSuite, setSelectedMegaSuite] = useState<'all' | 'ops' | 'finance' | 'commercial' | 'system'>('all')

  // BOL & Account Ledger main workspace views
  const isBolWorkspace = ['bol', 'accounts', 'companies', 'ledger', 'invoice', 'reports', 'shipments'].includes(view as string)

  // Identify active category and current module details
  const currentModule = useMemo(() => {
    return ENTERPRISE_MODULES.find((m) => m.id === view)
  }, [view])

  const isOpsActive = useMemo(() => {
    return ENTERPRISE_MODULES.filter((m) => m.category === 'ops').some((m) => m.id === view)
  }, [view])

  const isFinanceActive = useMemo(() => {
    return ENTERPRISE_MODULES.filter((m) => m.category === 'finance').some((m) => m.id === view)
  }, [view])

  const isCommercialActive = useMemo(() => {
    return ENTERPRISE_MODULES.filter((m) => m.category === 'commercial').some((m) => m.id === view)
  }, [view])

  const isSystemActive = useMemo(() => {
    return ENTERPRISE_MODULES.filter((m) => m.category === 'system' && m.id !== 'whatsapp' && m.id !== 'workflow' && m.id !== 'ai-assistant').some((m) => m.id === view)
  }, [view])

  const isMoreActive = useMemo(() => {
    return isCommercialActive || isSystemActive || view === 'ai-assistant'
  }, [isCommercialActive, isSystemActive, view])

  // Filtered modules for Mega Menu search
  const filteredMegaModules = useMemo(() => {
    if (!megaSearch.trim()) return ENTERPRISE_MODULES
    const q = megaSearch.toLowerCase().trim()
    return ENTERPRISE_MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.shortLabel.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    )
  }, [megaSearch])

  const handleNavigate = (modId: any) => {
    if (view === modId) return
    previousView.current = view
    // Defer state transition out of Radix UI's synchronous ReactDOM.flushSync discrete event loop (< 16ms INP)
    setTimeout(() => {
      startTransition(() => {
        setView(modId)
      })
    }, 0)
  }

  const handleCreateNewBol = () => {
    setTimeout(() => {
      startTransition(() => {
        setView('bol')
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('skybol:new-bol'))
      }
    }, 0)
  }

  return (
    <header className="workspace-header sticky top-0 z-40 h-12 border-b border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95 no-print select-none shadow-xs transition-colors w-full max-w-full overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-full items-center justify-between gap-1 sm:gap-1.5 px-2 sm:px-3 min-w-0">
        
        {/* ================================================================= */}
        {/* LEFT: Logo & Core Workspace Switcher Dropdown                     */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <div
            className="flex items-center gap-1.5 transition-transform hover:scale-102 active:scale-98 cursor-pointer shrink-0"
            onClick={() => handleNavigate('bol')}
            title="Return to BOL Workspace"
          >
            <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs shrink-0">
              <Image
                src="/logo.png"
                alt="AQ Companies"
                width={28}
                height={28}
                className="shrink-0 object-contain drop-shadow-xs"
                priority
              />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1">
                <span className="block text-xs font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                  {title || 'AQ COMPANIES'}
                </span>
                <span className="hidden xl:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-200/60 dark:border-blue-800/40">
                  v5.1
                </span>
              </div>
              <span className="hidden min-[1920px]:block text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                Logistics & BOL Management
              </span>
            </div>
          </div>

          {/* Core Workspaces Switcher Dropdown */}
          {currentUser?.role !== 'shipper' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden md:flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 shadow-2xs shrink-0 whitespace-nowrap"
                  title="Core Workspaces (BOL, Accounts, Invoices, Ledgers, Reports, Shipments)"
                >
                  <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-extrabold hidden md:inline">
                    {isBolWorkspace && view !== 'bol'
                      ? view === 'accounts'
                        ? 'Accounts'
                        : view === 'ledger'
                        ? 'Ledger'
                        : view === 'invoice'
                        ? 'Invoices'
                        : view === 'reports'
                        ? 'Reports'
                        : view === 'companies'
                        ? 'Companies'
                        : view === 'shipments'
                        ? 'Shipments'
                        : 'Workspaces'
                      : 'Workspaces'}
                  </span>
                  <span className="hidden min-[1500px]:inline text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold">
                    7
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5 text-xs rounded-xl shadow-xl z-50">
                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Core Logistics Workspaces
                </DropdownMenuLabel>

                {/* 1. BOL Editor */}
                <DropdownMenuItem onClick={() => handleNavigate('bol')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'bol' ? 'bg-blue-600 text-white font-bold' : ''}`}>
                  <FileText className={`h-3.5 w-3.5 shrink-0 ${view === 'bol' ? 'text-white' : 'text-blue-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Bill of Lading Editor</p>
                    <p className={`text-[10px] truncate ${view === 'bol' ? 'text-blue-100' : 'text-slate-400'}`}>Create, edit & print BOLs</p>
                  </div>
                  {view === 'bol' && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />}
                </DropdownMenuItem>

                {/* 2. Customer Accounts */}
                <DropdownMenuItem onClick={() => handleNavigate('accounts')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'accounts' ? 'bg-emerald-600 text-white font-bold' : ''}`}>
                  <Users className={`h-3.5 w-3.5 shrink-0 ${view === 'accounts' ? 'text-white' : 'text-emerald-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Customer Accounts</p>
                    <p className={`text-[10px] truncate ${view === 'accounts' ? 'text-emerald-100' : 'text-slate-400'}`}>Master client ledger directory</p>
                  </div>
                  {view === 'accounts' && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />}
                </DropdownMenuItem>

                {/* 3. Running Ledger */}
                <DropdownMenuItem onClick={() => handleNavigate('ledger')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'ledger' ? 'bg-amber-600 text-white font-bold' : ''}`}>
                  <BookOpen className={`h-3.5 w-3.5 shrink-0 ${view === 'ledger' ? 'text-white' : 'text-amber-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Running Ledger</p>
                    <p className={`text-[10px] truncate ${view === 'ledger' ? 'text-amber-100' : 'text-slate-400'}`}>Debit / credit accounting statement</p>
                  </div>
                  {view === 'ledger' && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 ml-1" />}
                </DropdownMenuItem>

                {/* 4. Invoices & Billing */}
                <DropdownMenuItem onClick={() => handleNavigate('invoice')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'invoice' ? 'bg-indigo-600 text-white font-bold' : ''}`}>
                  <Receipt className={`h-3.5 w-3.5 shrink-0 ${view === 'invoice' ? 'text-white' : 'text-indigo-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Invoices & Billing</p>
                    <p className={`text-[10px] truncate ${view === 'invoice' ? 'text-indigo-100' : 'text-slate-400'}`}>Demurrage, freight & service invoices</p>
                  </div>
                  {view === 'invoice' && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />}
                </DropdownMenuItem>

                {/* 5. Reports Center & P&L */}
                <DropdownMenuItem onClick={() => handleNavigate('reports')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'reports' ? 'bg-rose-600 text-white font-bold' : ''}`}>
                  <BarChart3 className={`h-3.5 w-3.5 shrink-0 ${view === 'reports' ? 'text-white' : 'text-rose-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Reports Center & P&L</p>
                    <p className={`text-[10px] truncate ${view === 'reports' ? 'text-rose-100' : 'text-slate-400'}`}>Financial summaries & statements</p>
                  </div>
                  {view === 'reports' && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />}
                </DropdownMenuItem>

                {/* 6. Companies & Branches */}
                <DropdownMenuItem onClick={() => handleNavigate('companies')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'companies' ? 'bg-cyan-600 text-white font-bold' : ''}`}>
                  <Building2 className={`h-3.5 w-3.5 shrink-0 ${view === 'companies' ? 'text-white' : 'text-cyan-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Companies & Branches</p>
                    <p className={`text-[10px] truncate ${view === 'companies' ? 'text-cyan-100' : 'text-slate-400'}`}>Corporate accounts & affiliates</p>
                  </div>
                  {view === 'companies' && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />}
                </DropdownMenuItem>

                {/* 7. Control Tower / Shipments */}
                <DropdownMenuItem onClick={() => handleNavigate('shipments')} className={`cursor-pointer gap-2 py-2 px-2.5 rounded-lg ${view === 'shipments' ? 'bg-blue-600 text-white font-bold' : ''}`}>
                  <Activity className={`h-3.5 w-3.5 shrink-0 ${view === 'shipments' ? 'text-white' : 'text-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Control Tower</p>
                    <p className={`text-[10px] truncate ${view === 'shipments' ? 'text-blue-100' : 'text-slate-400'}`}>Live shipments & active transit</p>
                  </div>
                  {view === 'shipments' && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Back to BOL return button */}
          {currentUser?.role !== 'shipper' && !isBolWorkspace && (
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex h-7.5 gap-1 px-2 text-xs font-semibold border-blue-500/30 bg-blue-50/70 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/50 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
              onClick={() => handleNavigate('bol')}
              title="Return to BOL Workspace"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold hidden sm:inline">Back to BOL</span>
              <span className="font-bold sm:hidden">BOL</span>
            </Button>
          )}
        </div>

        {/* ================================================================= */}
        {/* CENTER: Comprehensive Topside Navigation & All Dropdown Menus     */}
        {/* ================================================================= */}
        {currentUser && currentUser.role !== 'shipper' && (
          <nav className="hidden md:flex items-center gap-0.5 xl:gap-1 shrink-0 min-w-0">
            
            {/* ------------------------------------------------------------- */}
            {/* 1. ALL MODULES ENTERPRISE LAUNCHER (MEGA-DROPDOWN)            */}
            {/* ------------------------------------------------------------- */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 shadow-2xs shrink-0 whitespace-nowrap"
                  title="All 33 Enterprise Modules Launcher"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-extrabold hidden md:inline">Modules</span>
                  <span className="hidden min-[1500px]:inline text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold">
                    33
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="center"
                sideOffset={8}
                className="w-[980px] max-w-[96vw] max-h-[82vh] overflow-hidden flex flex-col p-4 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Search Bar & Header inside Mega Dropdown */}
                <div className="shrink-0 mb-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                            Enterprise Module Launcher
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            {filteredMegaModules.length} Modules
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            4 Active Suites
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          Direct one-click access to all transport, financial, sales, and document workspaces
                        </p>
                      </div>
                    </div>

                    <div className="relative w-72 sm:w-80">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search modules... (ocean, invoice, fleet, rates)"
                        value={megaSearch}
                        onChange={(e) => setMegaSearch(e.target.value)}
                        className="w-full pl-8 pr-12 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      {megaSearch && (
                        <button
                          type="button"
                          onClick={() => setMegaSearch('')}
                          className="absolute right-2.5 top-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Suite Filter Tabs */}
                  <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                    {[
                      { key: 'all', label: 'All Modules', count: ENTERPRISE_MODULES.length, icon: LayoutGrid },
                      { key: 'ops', label: 'Operations', count: 11, icon: Truck, color: 'text-blue-600 dark:text-blue-400' },
                      { key: 'finance', label: 'Finance & Ledger', count: 7, icon: Landmark, color: 'text-emerald-600 dark:text-emerald-400' },
                      { key: 'commercial', label: 'Sales & CRM', count: 5, icon: Tag, color: 'text-amber-600 dark:text-amber-400' },
                      { key: 'system', label: 'Docs & Tools', count: 10, icon: ShieldCheck, color: 'text-purple-600 dark:text-purple-400' },
                    ].map((tab) => {
                      const Icon = tab.icon
                      const isSelected = selectedMegaSuite === tab.key && !megaSearch
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => {
                            setSelectedMegaSuite(tab.key as any)
                            if (megaSearch) setMegaSearch('')
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-inherit' : tab.color || ''}`} />
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                            isSelected
                              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Categorized Columns or Filtered Grid */}
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin [scrollbar-color:rgba(148,163,184,0.3)_transparent] [scrollbar-width:thin]">
                  {megaSearch.trim() || selectedMegaSuite !== 'all' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-1">
                      {(megaSearch.trim()
                        ? filteredMegaModules
                        : filteredMegaModules.filter((m) => m.category === selectedMegaSuite)
                      ).map((mod) => {
                        const Icon = mod.icon
                        const isActive = view === mod.id
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => handleNavigate(mod.id)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                              isActive
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:scale-105 transition-transform'
                            }`}>
                              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : mod.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs truncate">{mod.title}</span>
                                {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                              </div>
                              <p className={`text-[10.5px] leading-tight mt-0.5 line-clamp-1 ${
                                isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {mod.subtitle}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                      {filteredMegaModules.length === 0 && (
                        <div className="col-span-full py-8 text-center text-xs text-slate-500">
                          No enterprise modules matching "{megaSearch}". Try searching for ocean, fleet, invoice, or rates.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      
                      {/* Column 1: Freight Operations */}
                      <div className="space-y-1 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between px-2 py-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5" />
                            <span>Operations</span>
                          </div>
                          <span className="text-[10px] font-mono text-blue-500 font-extrabold">11</span>
                        </div>
                        {filteredMegaModules
                          .filter((m) => m.category === 'ops')
                          .map((mod) => {
                            const Icon = mod.icon
                            const isActive = view === mod.id
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleNavigate(mod.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                                    : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[11.5px] truncate flex items-center justify-between">
                                    <span>{mod.title}</span>
                                    {isActive && <Check className="h-3 w-3 text-white shrink-0 ml-1" />}
                                  </div>
                                  <div className={`text-[10px] leading-none truncate ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {mod.subtitle}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                      </div>

                      {/* Column 2: Finance & Accounting */}
                      <div className="space-y-1 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between px-2 py-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <Landmark className="h-3.5 w-3.5" />
                            <span>Finance</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-500 font-extrabold">7</span>
                        </div>
                        {filteredMegaModules
                          .filter((m) => m.category === 'finance')
                          .map((mod) => {
                            const Icon = mod.icon
                            const isActive = view === mod.id
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleNavigate(mod.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                                  isActive
                                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                    : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[11.5px] truncate flex items-center justify-between">
                                    <span>{mod.title}</span>
                                    {isActive && <Check className="h-3 w-3 text-white shrink-0 ml-1" />}
                                  </div>
                                  <div className={`text-[10px] leading-none truncate ${isActive ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {mod.subtitle}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                      </div>

                      {/* Column 3: Commercial & Sales */}
                      <div className="space-y-1 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between px-2 py-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            <span>Sales & CRM</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-500 font-extrabold">5</span>
                        </div>
                        {filteredMegaModules
                          .filter((m) => m.category === 'commercial')
                          .map((mod) => {
                            const Icon = mod.icon
                            const isActive = view === mod.id
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleNavigate(mod.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                                  isActive
                                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                                    : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[11.5px] truncate flex items-center justify-between">
                                    <span>{mod.title}</span>
                                    {isActive && <Check className="h-3 w-3 text-white shrink-0 ml-1" />}
                                  </div>
                                  <div className={`text-[10px] leading-none truncate ${isActive ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {mod.subtitle}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                      </div>

                      {/* Column 4: Compliance & System */}
                      <div className="space-y-1 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between px-2 py-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Docs & Tools</span>
                          </div>
                          <span className="text-[10px] font-mono text-purple-500 font-extrabold">10</span>
                        </div>
                        {filteredMegaModules
                          .filter((m) => m.category === 'system')
                          .map((mod) => {
                            const Icon = mod.icon
                            const isActive = view === mod.id
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleNavigate(mod.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
                                  isActive
                                    ? 'bg-purple-700 text-white shadow-2xs font-bold'
                                    : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[11.5px] truncate flex items-center justify-between">
                                    <span>{mod.title}</span>
                                    {isActive && <Check className="h-3 w-3 text-white shrink-0 ml-1" />}
                                  </div>
                                  <div className={`text-[10px] leading-none truncate ${isActive ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {mod.subtitle}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                      </div>

                    </div>
                  )}
                </div>

                {/* Footer bar */}
                <div className="shrink-0 pt-2.5 mt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Ctrl+K</kbd> for Smart Search</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Esc</kbd> to close</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>33 Systems Online & Synchronized</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* ------------------------------------------------------------- */}
            {/* 2. ADAPTIVE SUITES DROPDOWN (VISIBLE ON SCREENS < 1024px)     */}
            {/* Guarantees full dropdown access even on narrow/split screens! */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:hidden flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 whitespace-nowrap"
                    title="Suites Navigation Dropdown"
                  >
                    <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Suites</span>
                    <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1 text-xs rounded-xl shadow-xl z-50">
                  <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Operations & Finance Suites
                  </DropdownMenuLabel>
                  
                  {/* Operations Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2 font-medium">
                      <Truck className="h-3.5 w-3.5 text-blue-600" />
                      <span>Operations (11)</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60 p-1 text-xs rounded-xl shadow-xl z-50">
                      {ENTERPRISE_MODULES.filter(m => m.category === 'ops').map(mod => {
                        const Icon = mod.icon
                        const isActive = view === mod.id
                        return (
                          <DropdownMenuItem
                            key={mod.id}
                            onClick={() => handleNavigate(mod.id)}
                            className={`cursor-pointer gap-2 py-1.5 ${isActive ? 'bg-blue-600 text-white font-bold' : ''}`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : mod.color}`} />
                            <span className="truncate">{mod.title}</span>
                            {isActive && <Check className="h-3 w-3 text-white ml-auto" />}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Finance Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2 font-medium">
                      <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Finance & Ledger (7)</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60 p-1 text-xs rounded-xl shadow-xl z-50">
                      {ENTERPRISE_MODULES.filter(m => m.category === 'finance').map(mod => {
                        const Icon = mod.icon
                        const isActive = view === mod.id
                        return (
                          <DropdownMenuItem
                            key={mod.id}
                            onClick={() => handleNavigate(mod.id)}
                            className={`cursor-pointer gap-2 py-1.5 ${isActive ? 'bg-emerald-600 text-white font-bold' : ''}`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : mod.color}`} />
                            <span className="truncate">{mod.title}</span>
                            {isActive && <Check className="h-3 w-3 text-white ml-auto" />}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Sales & CRM Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2 font-medium">
                      <Tag className="h-3.5 w-3.5 text-amber-600" />
                      <span>Sales & CRM (5)</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60 p-1 text-xs rounded-xl shadow-xl z-50">
                      {ENTERPRISE_MODULES.filter(m => m.category === 'commercial').map(mod => {
                        const Icon = mod.icon
                        const isActive = view === mod.id
                        return (
                          <DropdownMenuItem
                            key={mod.id}
                            onClick={() => handleNavigate(mod.id)}
                            className={`cursor-pointer gap-2 py-1.5 ${isActive ? 'bg-amber-600 text-white font-bold' : ''}`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : mod.color}`} />
                            <span className="truncate">{mod.title}</span>
                            {isActive && <Check className="h-3 w-3 text-white ml-auto" />}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Compliance & System Tools Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                      <span>Docs & Tools (10)</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60 p-1 text-xs rounded-xl shadow-xl z-50">
                      {ENTERPRISE_MODULES.filter(m => m.category === 'system').map(mod => {
                        const Icon = mod.icon
                        const isActive = view === mod.id
                        return (
                          <DropdownMenuItem
                            key={mod.id}
                            onClick={() => handleNavigate(mod.id)}
                            className={`cursor-pointer gap-2 py-1.5 ${isActive ? 'bg-purple-700 text-white font-bold' : ''}`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : mod.color}`} />
                            <span className="truncate">{mod.title}</span>
                            {isActive && <Check className="h-3 w-3 text-white ml-auto" />}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 3. DESKTOP SUITE DROPDOWNS & MORE ▾ COLLAPSIBLE ADAPTIVE SUITE */}
            {/* ------------------------------------------------------------- */}
            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0 min-w-0">
              
              {/* Operations Dropdown (Primary - Always visible on desktop) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      isOpsActive
                        ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                    }`}
                    title="Freight & Transport Operations Suite"
                  >
                    <Truck className={`h-3.5 w-3.5 shrink-0 ${isOpsActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span>
                      {isOpsActive && currentModule?.category === 'ops' ? (
                        currentModule.shortLabel
                      ) : (
                        <>
                          <span className="hidden min-[1400px]:inline">Operations</span>
                          <span className="min-[1400px]:hidden">Ops</span>
                        </>
                      )}
                    </span>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 text-xs p-1.5 rounded-xl shadow-xl z-50">
                  <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Freight & Transport Operations
                  </DropdownMenuLabel>
                  {ENTERPRISE_MODULES.filter((m) => m.category === 'ops').map((mod) => {
                    const Icon = mod.icon
                    const isActive = view === mod.id
                    return (
                      <DropdownMenuItem
                        key={mod.id}
                        onClick={() => handleNavigate(mod.id)}
                        className={`cursor-pointer font-medium flex items-center justify-between py-2 px-2.5 rounded-lg ${
                          isActive ? 'bg-blue-600 text-white font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                          <span className="truncate">{mod.title}</span>
                        </div>
                        {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Finance Dropdown (Primary - Always visible on desktop) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      isFinanceActive
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                    }`}
                    title="Finance, Ledger & Accounting Suite"
                  >
                    <Landmark className={`h-3.5 w-3.5 shrink-0 ${isFinanceActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>
                      {isFinanceActive && currentModule?.category === 'finance'
                        ? currentModule.shortLabel
                        : 'Finance'}
                    </span>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 text-xs p-1.5 rounded-xl shadow-xl z-50">
                  <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Finance, Accounting & Ledgers
                  </DropdownMenuLabel>
                  {ENTERPRISE_MODULES.filter((m) => m.category === 'finance').map((mod) => {
                    const Icon = mod.icon
                    const isActive = view === mod.id
                    return (
                      <DropdownMenuItem
                        key={mod.id}
                        onClick={() => handleNavigate(mod.id)}
                        className={`cursor-pointer font-medium flex items-center justify-between py-2 px-2.5 rounded-lg ${
                          isActive ? 'bg-emerald-600 text-white font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                          <span className="truncate">{mod.title}</span>
                        </div>
                        {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sales & CRM Dropdown (Visible on >= 1280px / xl, otherwise in More Suites) */}
              <div className="hidden xl:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                        isCommercialActive
                          ? 'bg-amber-600 text-white shadow-xs shadow-amber-500/30'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                      }`}
                      title="Commercial, Sales Pipeline & Pricing Suite"
                    >
                      <Tag className={`h-3.5 w-3.5 shrink-0 ${isCommercialActive ? 'text-white' : 'text-amber-500 dark:text-amber-400'}`} />
                      <span>
                        {isCommercialActive && currentModule?.category === 'commercial' ? (
                          currentModule.shortLabel
                        ) : (
                          <>
                            <span className="hidden min-[1600px]:inline">Sales & </span>CRM
                          </>
                        )}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 text-xs p-1.5 rounded-xl shadow-xl z-50">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Commercial, CRM & Rates
                    </DropdownMenuLabel>
                    {ENTERPRISE_MODULES.filter((m) => m.category === 'commercial').map((mod) => {
                      const Icon = mod.icon
                      const isActive = view === mod.id
                      return (
                        <DropdownMenuItem
                          key={mod.id}
                          onClick={() => handleNavigate(mod.id)}
                          className={`cursor-pointer font-medium flex items-center justify-between py-2 px-2.5 rounded-lg ${
                            isActive ? 'bg-amber-600 text-white font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                            <span className="truncate">{mod.title}</span>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Docs & Tools Dropdown (Visible on >= 1280px / xl, otherwise in More Suites) */}
              <div className="hidden xl:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                        isSystemActive
                          ? 'bg-purple-700 text-white shadow-xs shadow-purple-500/30'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                      }`}
                      title="Compliance, Documents & System Tools"
                    >
                      <FileCheck2 className={`h-3.5 w-3.5 shrink-0 ${isSystemActive ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                      <span>
                        {isSystemActive && currentModule?.category === 'system' ? (
                          currentModule.shortLabel
                        ) : (
                          <>
                            <span className="hidden min-[1600px]:inline">Docs & </span>Tools
                          </>
                        )}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 text-xs p-1.5 rounded-xl shadow-xl z-50">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Compliance, Tools & Administration
                    </DropdownMenuLabel>
                    {ENTERPRISE_MODULES.filter((m) => m.category === 'system').map((mod) => {
                      const Icon = mod.icon
                      const isActive = view === mod.id
                      return (
                        <DropdownMenuItem
                          key={mod.id}
                          onClick={() => handleNavigate(mod.id)}
                          className={`cursor-pointer font-medium flex items-center justify-between py-2 px-2.5 rounded-lg ${
                            isActive ? 'bg-purple-700 text-white font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                            <span className="truncate">{mod.title}</span>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Direct Ask AI Pill Button (Visible on >= 1280px / xl, otherwise in More Suites) */}
              <button
                type="button"
                onClick={() => handleNavigate('ai-assistant')}
                className={`hidden xl:flex items-center gap-1 h-7.5 px-2 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  view === 'ai-assistant'
                    ? 'bg-purple-700 text-white shadow-xs shadow-purple-500/30'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 dark:hover:bg-purple-900/50'
                }`}
                title="Sky AI Operations Assistant"
              >
                <Sparkles className={`h-3.5 w-3.5 shrink-0 ${view === 'ai-assistant' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                <span className="font-extrabold">Ask AI</span>
              </button>

              {/* More Suites ▾ Dropdown (Responsive Fallback for screens < 1280px) */}
              <div className="flex xl:hidden items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                        isMoreActive
                          ? isCommercialActive
                            ? 'bg-amber-600 text-white shadow-xs'
                            : isSystemActive
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                      }`}
                      title="More Suites: Sales, CRM, Docs & Tools, Ask AI"
                    >
                      <Layers className={`h-3.5 w-3.5 shrink-0 ${isMoreActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>
                        {isCommercialActive
                          ? currentModule?.shortLabel || 'Sales & CRM'
                          : isSystemActive
                          ? currentModule?.shortLabel || 'Docs & Tools'
                          : view === 'ai-assistant'
                          ? 'Ask AI'
                          : 'More Suites'}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={6} className="w-[440px] max-w-[95vw] p-3 text-xs rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl z-50">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Enterprise Suites & Tools
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Direct Access
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-2.5 mb-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
                      {/* Column 1: Sales & Commercial */}
                      <div>
                        <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          <Tag className="h-3 w-3" />
                          <span>Sales & CRM</span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {ENTERPRISE_MODULES.filter((m) => m.category === 'commercial').map((mod) => {
                            const Icon = mod.icon
                            const isActive = view === mod.id
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleNavigate(mod.id)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-left ${
                                  isActive
                                    ? 'bg-amber-500 text-white font-bold'
                                    : 'text-slate-700 hover:text-slate-950 hover:bg-amber-50/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                                  <span className="truncate">{mod.title}</span>
                                </div>
                                {isActive && <Check className="h-3 w-3 text-white shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Column 2: Docs, Compliance & Tools */}
                      <div>
                        <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          <FileCheck2 className="h-3 w-3" />
                          <span>Docs & Tools</span>
                        </div>
                        <div className="space-y-0.5 mt-1 max-h-[220px] overflow-y-auto no-scrollbar">
                          {ENTERPRISE_MODULES.filter((m) => m.category === 'system').map((mod) => {
                            const Icon = mod.icon
                            const isActive = view === mod.id
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleNavigate(mod.id)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-left ${
                                  isActive
                                    ? 'bg-purple-700 text-white font-bold'
                                    : 'text-slate-700 hover:text-slate-950 hover:bg-purple-50/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : mod.color}`} />
                                  <span className="truncate">{mod.title}</span>
                                </div>
                                {isActive && <Check className="h-3 w-3 text-white shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Direct Ask AI Assistant Footer Banner */}
                    <button
                      type="button"
                      onClick={() => handleNavigate('ai-assistant')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        view === 'ai-assistant'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-800 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 dark:hover:bg-purple-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold leading-tight">Ask Sky AI Assistant</p>
                          <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 font-normal">Real-time logistics reasoning & document queries</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </button>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </div>

          </nav>
        )}

        {/* ================================================================= */}
        {/* RIGHT: Quick Action Dropdown, Search, Utilities & User Profile    */}
        {/* ================================================================= */}
        {currentUser && (
          <div className="flex items-center gap-1 xl:gap-1.5 shrink-0 ml-auto">
            
            {/* Global Omni Search */}
            <div className="shrink min-w-0">
              <GlobalSearch className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:text-slate-400 dark:hover:bg-slate-700/90 transition-all rounded-lg border border-slate-200/90 dark:border-slate-700/90 w-24 md:w-28 lg:w-32 xl:w-36 2xl:w-44 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs group shrink" />
              <div className="sm:hidden">
                <GlobalSearch mobileIconOnly />
              </div>
            </div>

            {/* Quick Action (+ New) Multi-Drop Button */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="hidden md:inline-flex h-7.5 gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-[11.5px] font-bold text-white shadow-xs cursor-pointer px-2 shrink-0 whitespace-nowrap active:scale-[0.98]"
                  title="Create New Document or Record"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">New</span>
                  <ChevronDown className="h-2.5 w-2.5 opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 text-xs rounded-xl shadow-xl z-50">
                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1">
                  Shipments & Freight
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleCreateNewBol} className="cursor-pointer gap-2 py-1.5 px-2">
                  <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">New Bill of Lading</p>
                    <p className="text-[10px] text-slate-400">Blank BOL document draft</p>
                  </div>
                  <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Ctrl+N</kbd>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowQuickShipment(true)} className="cursor-pointer gap-2 py-1.5 px-2">
                  <Package className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">Fast Shipment Entry</p>
                    <p className="text-[10px] text-slate-400">Quick dispatch registration</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigate('warehouse-cargo')} className="cursor-pointer gap-2 py-1.5 px-2">
                  <Boxes className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">New Cargo Tally / Receipt</p>
                    <p className="text-[10px] text-slate-400">Inward cargo receiving tally</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1">
                  Finance & Cash Desk
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleNavigate('invoice')} className="cursor-pointer gap-2 py-1.5 px-2">
                  <Receipt className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">New Customer Invoice</p>
                    <p className="text-[10px] text-slate-400">Issue commercial freight bill</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigate('treasury')} className="cursor-pointer gap-2 py-1.5 px-2">
                  <Landmark className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">New Treasury Voucher</p>
                    <p className="text-[10px] text-slate-400">Cash receipt or payment</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1">
                  Commercial & Sales
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleNavigate('crm-sales')} className="cursor-pointer gap-2 py-1.5 px-2">
                  <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">New Sales Lead</p>
                    <p className="text-[10px] text-slate-400">Register freight opportunity</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigate('rates-quotations')} className="cursor-pointer gap-2 py-1.5 px-2">
                  <Calculator className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">New Rate Quotation</p>
                    <p className="text-[10px] text-slate-400">Customer freight price quote</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Shipment Modal */}
            <QuickShipmentModal
              open={showQuickShipment}
              onOpenChange={setShowQuickShipment}
              onSaved={() => handleNavigate('bol')}
            />

            {/* Server Status Pill (Visible on 2xl+, hidden on laptop to preserve space) */}
            <div className="hidden 2xl:block shrink-0">
              <ServerStatusPill onOpenSettings={() => handleNavigate('settings')} />
            </div>

            {/* Data Protection Pill */}
            <div className="hidden sm:block shrink-0">
              <HeaderProtectionPill onOpenBackupCenter={() => handleNavigate('data-protection')} />
            </div>

            {/* Cloud Sync Button */}
            <div className="hidden sm:block shrink-0">
              <HeaderCloudSyncButton onOpenSettings={() => handleNavigate('settings')} />
            </div>

            {/* Notification Bell */}
            <div className="shrink-0">
              <NotificationBell
                onOpenCenter={() => handleNavigate('communications')}
                onOpenSettings={() => handleNavigate('settings')}
              />
            </div>

            {/* Theme Toggle */}
            <div className="hidden sm:block shrink-0">
              <ThemeToggle />
            </div>

            {/* Mobile Drawer Trigger (< md) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('skybol:open-mobile-drawer'))
                }
              }}
              className="md:hidden flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200/90 dark:border-slate-800/90 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
              title="Open All Modules Menu"
              aria-label="Open All Modules Menu"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </button>

            {/* User Profile Executive Dropdown */}
            <div className="hidden sm:block shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 pl-1 pr-1.5 min-[1680px]:pr-2 py-0.5 rounded-full border border-slate-200/90 dark:border-slate-800/90 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title={`${currentUser.name} (${currentUser.role})`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-[10px] font-black text-white shadow-2xs shrink-0"
                    >
                      {currentUser.name.trim().slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden min-[1680px]:inline text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[85px] truncate">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold leading-none text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                        <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          v5.1.0
                        </span>
                      </div>
                      <p className="text-[10px] leading-none text-slate-500 capitalize">{currentUser.role} • AQ Companies</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigate('settings')} className="cursor-pointer gap-2 py-2">
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">System Settings & Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate('audit-history')} className="cursor-pointer gap-2 py-2">
                    <History className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-medium">Audit Trail & Activity Log</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate('data-protection')} className="cursor-pointer gap-2 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium">Data Protection & Snapshots</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate('communications')} className="cursor-pointer gap-2 py-2">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium">Communications & Notices</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 py-2 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40">
                    <LogOut className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>
        )}
      </div>
    </header>
  )
}
