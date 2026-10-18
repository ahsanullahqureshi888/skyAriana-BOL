import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { useApp } from '../App'
import { DEFAULT_COMPANY_NAME, BRAND_LOGO_SRC, resolveBrandAssetUrl } from '../config/branding'
import { useCompanyBranding } from '../hooks/useCompanySettings'
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  DollarSign, 
  Users, 
  PlusCircle, 
  ArrowRight, 
  Database, 
  TrendingUp, 
  Activity, 
  Sparkles, 
  Clock, 
  Building2, 
  BarChart3, 
  ChevronRight,
  Plane,
  Tag,
  ReceiptText,
  FileCheck2
} from 'lucide-react'

const Dashboard: React.FC = () => {
  const { t } = useApp()
  const { data: companySettings } = useCompanyBranding()
  const companyName = companySettings?.company_name?.trim() || t.company_name || DEFAULT_COMPANY_NAME
  const companyLogo = resolveBrandAssetUrl(companySettings?.logo_path) || BRAND_LOGO_SRC

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 15000, // Sync live telemetry every 15 seconds
  })

  const { data: recent, isLoading: loadingRecent } = useQuery({
    queryKey: ['dashboardRecent'],
    queryFn: dashboardApi.getRecentActivity,
    refetchInterval: 15000,
  })

  if (loadingSummary || loadingRecent) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400 animate-pulse">Synchronizing Workspace Telemetry...</p>
      </div>
    )
  }

  const totalAmt = parseFloat(summary?.total_amount || 0)
  const recAmt = parseFloat(summary?.amount_received || 0)
  const outAmt = parseFloat(summary?.outstanding_balance || 0)
  
  const collectionRate = totalAmt > 0 ? Math.min(100, Math.round((recAmt / totalAmt) * 100)) : 0
  const outstandingRate = totalAmt > 0 ? Math.max(0, 100 - collectionRate) : 0

  const financialCards = [
    { 
      title: 'Total Invoiced Volume', 
      val: `$${totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      iconColor: 'metric-icon--indigo', 
      elevatedColor: 'metric-card-elevated--indigo',
      badge: 'Grand Sum',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      caption: 'Cumulative commercial cargo value' 
    },
    { 
      title: 'Amount Received (Paid)', 
      val: `$${recAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
      icon: TrendingUp, 
      iconColor: 'metric-icon--teal', 
      elevatedColor: 'metric-card-elevated--teal',
      badge: `${collectionRate}% Collected`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      caption: 'Total settled cash & transfers' 
    },
    { 
      title: 'Outstanding Balance', 
      val: `$${outAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
      icon: AlertCircle, 
      iconColor: 'metric-icon--orange', 
      elevatedColor: 'metric-card-elevated--orange',
      badge: `${outstandingRate}% Pending`,
      badgeColor: outAmt > 0 ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-slate-50 text-slate-600 border-slate-200/60',
      caption: 'Unsettled receivables & dues' 
    },
  ]

  const documentCards = [
    { title: 'Total Invoices', val: summary?.total_invoices || 0, icon: FileText, iconColor: 'metric-icon--blue', elevatedColor: 'metric-card-elevated', caption: 'All documents', tag: 'All Docs' },
    { title: 'Paid & Cleared', val: summary?.paid_invoices || 0, icon: CheckCircle, iconColor: 'metric-icon--green', elevatedColor: 'metric-card-elevated--green', caption: 'Fully settled', tag: 'Cleared' },
    { title: 'Unpaid Invoices', val: summary?.unpaid_invoices || 0, icon: Clock, iconColor: 'metric-icon--red', elevatedColor: 'metric-card-elevated--red', caption: 'Awaiting transfer', tag: 'Pending' },
    { title: 'Partially Paid', val: summary?.partial_invoices || 0, icon: HelpCircle, iconColor: 'metric-icon--amber', elevatedColor: 'metric-card-elevated--amber', caption: 'Milestone paid', tag: 'In Progress' },
    { title: 'Overdue Shipments', val: summary?.overdue_invoices || 0, icon: AlertCircle, iconColor: 'metric-icon--red', elevatedColor: 'metric-card-elevated--red', caption: 'Past due date', tag: 'Critical' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 1. Hero Executive Console Banner */}
      <div 
        className="dashboard-hero rounded-3xl p-6 sm:p-7 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #091329 0%, #0f244c 50%, #1e3a8a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div className="relative z-10 flex items-center gap-5 max-w-3xl">
          <div className="hidden sm:flex bg-white/95 p-3 rounded-2xl shadow-xl border border-white/40 shrink-0">
            <img 
              src={companyLogo} 
              alt={`${companyName} logo`} 
              className="w-32 h-16 object-contain"
              onError={(e) => {
                const target = e.currentTarget
                target.onerror = null
                target.src = '/logo.jpg'
              }}
            />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-extrabold tracking-widest uppercase backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse inline-block" />
              <Sparkles size={13} className="text-cyan-400 inline" /> LIVE ENTERPRISE LOGISTICS CONSOLE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
              {companyName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
              Real-time financial telemetry, commercial cargo invoicing, and client receivables are synchronized and operational.
            </p>

            {/* Quick Action Buttons Directly in Banner */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <Link 
                to="/invoices/create" 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>New Invoice</span>
              </Link>
              <Link 
                to="/shipping-stickers" 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              >
                <Tag size={13} className="text-amber-400" />
                <span>Shipping Stickers</span>
              </Link>
              <Link 
                to="/air-waybills" 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              >
                <Plane size={13} className="text-sky-400" />
                <span>Air Waybills</span>
              </Link>
              <Link 
                to="/safta-certificates" 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              >
                <FileCheck2 size={13} className="text-emerald-400" />
                <span>SAFTA</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right Side Telemetry Card */}
        <div className="relative z-10 flex flex-row lg:flex-col items-center lg:items-stretch gap-4 shrink-0 bg-white/10 p-4 rounded-2xl border border-white/15 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-inner">
              <Activity size={20} />
            </div>
            <div>
              <span className="text-[9px] uppercase font-extrabold text-slate-300 block tracking-widest">SYSTEM STATUS</span>
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]">
                ● Telemetry Active
              </span>
            </div>
          </div>
          <div className="h-px bg-white/15 w-full my-0.5 hidden lg:block" />
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-slate-300 font-semibold">Collection Ratio:</span>
            <strong className="text-xs font-black text-cyan-200 bg-blue-500/30 px-2.5 py-1 rounded-lg border border-cyan-400/30 shadow-xs">
              {collectionRate}%
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Financial Receivables Telemetry Bar */}
      <div className="glass-panel p-5 border-l-4 border-l-blue-600 space-y-3.5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
                Financial Receivables Telemetry
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● LIVE
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Live collection progress across active commercial cargo shipments</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-extrabold">
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Received: {collectionRate}%
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Outstanding: {outstandingRate}%
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-extrabold text-slate-700">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Collected: ${recAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-slate-600">Total Ledger: ${totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="progress-bar-container h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80">
            <div 
              className="progress-bar-segment bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] transition-all duration-500" 
              style={{ width: `${collectionRate}%` }}
              title={`Received: ${collectionRate}%`}
            />
            <div 
              className="progress-bar-segment bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-500" 
              style={{ width: `${outstandingRate}%` }}
              title={`Outstanding: ${outstandingRate}%`}
            />
          </div>
        </div>
      </div>

      {/* 3. Financial Performance Ledger Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>💰 Financial Balances &amp; Cargo Value</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-bold">USD Currency Standard</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {financialCards.map((card, i) => {
            const Icon = card.icon
            return (
              <article key={i} className={`metric-card metric-card-elevated ${card.elevatedColor} !p-5 !min-h-[125px]`}>
                <div className={`metric-icon ${card.iconColor} !w-12 !h-12 !rounded-xl`}>
                  <Icon size={22} />
                </div>
                <div className="metric-content flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="metric-label !text-xs">{card.title}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <strong className="metric-value !text-xl lg:!text-2xl mt-1 font-black text-slate-900 tracking-tight">{card.val}</strong>
                  <span className="metric-caption !text-[11px] mt-0.5">{card.caption}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* 4. Commercial Document Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>📄 Commercial Document Telemetry</span>
          </h2>
          <Link to="/invoices" className="text-xs text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1">
            View All Documents <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {documentCards.map((card, i) => {
            const Icon = card.icon
            return (
              <article key={i} className={`metric-card metric-card-elevated ${card.elevatedColor} !p-3.5 !min-h-[105px]`}>
                <div className={`metric-icon ${card.iconColor} !w-9 !h-9 !rounded-lg`}>
                  <Icon size={17} />
                </div>
                <div className="metric-content flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="metric-label !text-[10px] truncate">{card.title}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <strong className="metric-value !text-xl font-black">{card.val}</strong>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {card.tag}
                    </span>
                  </div>
                  <span className="metric-caption !text-[10px] truncate mt-0.5">{card.caption}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* 5. Main Content Columns: Tables & Launchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Invoices & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Invoices Table */}
          <div className="glass-panel p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold"><FileText size={16}/></span>
                <div>
                  <h3 className="font-black text-base text-slate-800 tracking-tight">Recent Cargo Invoices</h3>
                  <p className="text-xs text-slate-500 font-medium">Latest commercial documents generated across workspaces</p>
                </div>
              </div>
              <Link to="/invoices" className="text-xs text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1.5 rounded-xl transition-all">
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="!py-2.5 !text-xs !font-black !text-slate-600">Invoice No</th>
                    <th className="!py-2.5 !text-xs !font-black !text-slate-600">Customer &amp; Party</th>
                    <th className="!py-2.5 !text-xs !font-black !text-slate-600">Grand Total</th>
                    <th className="!py-2.5 !text-xs !font-black !text-slate-600">Payment Status</th>
                    <th className="!py-2.5 !text-xs !font-black !text-slate-600 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent?.latest_invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="font-extrabold text-blue-600 py-3">
                        <Link to={`/invoices/${inv.id}`} className="hover:underline flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="text-slate-700 font-bold py-3 text-xs">{inv.customer_name}</td>
                      <td className="font-black text-slate-900 tabular-nums py-3 text-xs">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">{inv.currency}</span>
                        {parseFloat(inv.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <span className={`status-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          inv.status === 'paid' ? 'status-badge--paid !bg-emerald-50 !text-emerald-700 !border-emerald-200' :
                          inv.status === 'unpaid' ? 'status-badge--unpaid !bg-rose-50 !text-rose-700 !border-rose-200' :
                          'status-badge--partial !bg-amber-50 !text-amber-700 !border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inv.status === 'paid' ? 'bg-emerald-500 animate-pulse' :
                            inv.status === 'unpaid' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`}/>
                          <span className="capitalize">{inv.status}</span>
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link 
                          to={`/invoices/${inv.id}`} 
                          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white transition-all shadow-2xs"
                        >
                          View <ChevronRight size={12}/>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(!recent?.latest_invoices || recent.latest_invoices.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText size={28} className="text-slate-300"/>
                          <span>No commercial cargo invoices recorded yet.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="glass-panel p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold"><Activity size={16}/></span>
                <div>
                  <h3 className="font-black text-base text-slate-800 tracking-tight">System Audit &amp; Activity Log</h3>
                  <p className="text-xs text-slate-500 font-medium">Live event telemetry across invoicing and user actions</p>
                </div>
              </div>
              <Link to="/logs" className="text-xs text-indigo-600 hover:text-indigo-700 font-extrabold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1.5 rounded-xl transition-all">
                Audit Trail <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {recent?.recent_logs?.map((log: any) => (
                <div key={log.id} className="flex gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/50 transition-all text-xs items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {(log.user_name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 truncate">{log.user_name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">Action</span>
                      </div>
                      <p className="text-slate-600 font-medium text-xs mt-0.5 truncate">{log.details || log.action}</p>
                    </div>
                  </div>
                  <div className="text-slate-400 shrink-0 font-extrabold text-[11px] tabular-nums bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {(!recent?.recent_logs || recent.recent_logs.length === 0) && (
                <p className="text-center text-slate-400 text-xs py-6 font-bold">No recent activity telemetry logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Interactive Quick Launchpad & New Customers */}
        <div className="space-y-6">
          {/* Quick Launchpad */}
          <div className="glass-panel p-5 shadow-sm border-t-4 border-t-blue-600">
            <div className="pb-3 border-b border-slate-200/60 mb-4">
              <h3 className="font-black text-base text-slate-800 tracking-tight flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600"/> Document Suite Launchpad
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Quick access to logistics documents</p>
            </div>

            <div className="space-y-2.5">
              <Link to="/invoices/create" className="launchpad-card group !p-3">
                <div className="launchpad-card__icon bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm !w-10 !h-10">
                  <PlusCircle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors block">New Cargo Invoice</strong>
                    <ChevronRight size={14} className="text-slate-400 launchpad-card__arrow transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Commercial export invoice</p>
                </div>
              </Link>

              <Link to="/shipping-stickers" className="launchpad-card group !p-3">
                <div className="launchpad-card__icon bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm !w-10 !h-10">
                  <Tag size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors block">Shipping Stickers</strong>
                    <ChevronRight size={14} className="text-slate-400 launchpad-card__arrow transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">FSSAI compliant box labels</p>
                </div>
              </Link>

              <Link to="/air-waybills" className="launchpad-card group !p-3">
                <div className="launchpad-card__icon bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm !w-10 !h-10">
                  <Plane size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-slate-900 group-hover:text-sky-600 transition-colors block">Air Waybills (AWB)</strong>
                    <ChevronRight size={14} className="text-slate-400 launchpad-card__arrow transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">IATA freight bills</p>
                </div>
              </Link>

              <Link to="/safta-certificates" className="launchpad-card group !p-3">
                <div className="launchpad-card__icon bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm !w-10 !h-10">
                  <FileCheck2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors block">SAFTA Origin Cert</strong>
                    <ChevronRight size={14} className="text-slate-400 launchpad-card__arrow transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Trade agreement duty preference</p>
                </div>
              </Link>

              <Link to="/customers" className="launchpad-card group !p-3">
                <div className="launchpad-card__icon bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm !w-10 !h-10">
                  <Users size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-slate-900 group-hover:text-purple-600 transition-colors block">Customer Directory</strong>
                    <ChevronRight size={14} className="text-slate-400 launchpad-card__arrow transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Buyer &amp; importer profiles</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Newest Customers Panel */}
          <div className="glass-panel p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-50 text-teal-600 font-bold"><Users size={16}/></span>
                <div>
                  <h3 className="font-black text-base text-slate-800 tracking-tight">Newest Customers</h3>
                  <p className="text-xs text-slate-500 font-medium">Recent client onboardings</p>
                </div>
              </div>
              <Link to="/customers" className="text-xs text-teal-600 hover:text-teal-700 font-extrabold flex items-center gap-1 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1.5 rounded-xl transition-all">
                Directory <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recent?.latest_customers?.map((cust: any) => (
                <div key={cust.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50/60 hover:bg-slate-100/70 border border-slate-200/50 transition-all text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {(cust.company_name || 'C')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-800 block truncate leading-tight">{cust.company_name}</span>
                      <span className="text-[11px] text-slate-400 font-semibold mt-0.5 block truncate">
                        {cust.contact_person || 'Direct Account'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-600 font-black bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs shrink-0">
                    {cust.country || 'International'}
                  </span>
                </div>
              ))}
              {(!recent?.latest_customers || recent.latest_customers.length === 0) && (
                <p className="text-center text-slate-400 text-xs py-6 font-bold">No client accounts onboarded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
