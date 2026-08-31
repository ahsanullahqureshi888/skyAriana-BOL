"use client"

import { useState, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Building2,
  ChevronRight,
  Sparkles,
  FileText,
  Search,
  X,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Truck,
  Receipt,
  Landmark,
  ExternalLink,
  Globe,
  Edit3,
  ArrowRightLeft,
  ArrowRight,
  Check,
  FolderSync,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { Input } from '@/components/ui/input'
import { Card, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useApp } from '@/lib/app-context'
import { toast } from 'sonner'

export function AccountsView() {
  const {
    accounts,
    addAccount,
    updateAccount,
    moveAccount,
    deleteAccount,
    moveCompany,
    updateCompany,
    selectAccount,
    selectCompany,
    isSyncing,
    syncCloudData,
    currentUser,
    setView,
  } = useApp()

  const [newAccountName, setNewAccountName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'accounts' | 'shippers'>('all')

  // Edit Account state
  const [accountToEdit, setAccountToEdit] = useState<{ id: string; name: string } | null>(null)
  const [editAccountName, setEditAccountName] = useState('')

  // Move / Merge Account state
  const [accountToMove, setAccountToMove] = useState<{ id: string; name: string; companiesCount: number } | null>(null)
  const [targetAccountId, setTargetAccountId] = useState('')

  // Move Company state (from Shippers list)
  const [companyToMove, setCompanyToMove] = useState<{ sourceAccountId: string; companyId: string; companyName: string } | null>(null)
  const [targetCompanyAccountId, setTargetCompanyAccountId] = useState('')

  // Delete Account state
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleAddAccount = useCallback(() => {
    if (newAccountName.trim()) {
      addAccount(newAccountName.trim())
      toast.success(`Account "${newAccountName.trim()}" created`)
      setNewAccountName('')
      setIsOpen(false)
    }
  }, [newAccountName, addAccount])

  const handleSaveEditAccount = useCallback(() => {
    if (accountToEdit && editAccountName.trim()) {
      updateAccount(accountToEdit.id, editAccountName.trim())
      toast.success(`Account renamed to "${editAccountName.trim()}"`)
      setAccountToEdit(null)
      setEditAccountName('')
    }
  }, [accountToEdit, editAccountName, updateAccount])

  const handleConfirmMoveAccount = useCallback(() => {
    if (accountToMove && targetAccountId && accountToMove.id !== targetAccountId) {
      const targetAcc = accounts.find(a => a.id === targetAccountId)
      moveAccount(accountToMove.id, targetAccountId)
      toast.success(`Moved all records from "${accountToMove.name}" to "${targetAcc?.name || 'target account'}"`)
      setAccountToMove(null)
      setTargetAccountId('')
    }
  }, [accountToMove, targetAccountId, accounts, moveAccount])

  const handleConfirmMoveCompany = useCallback(() => {
    if (companyToMove && targetCompanyAccountId && companyToMove.sourceAccountId !== targetCompanyAccountId) {
      const targetAcc = accounts.find(a => a.id === targetCompanyAccountId)
      moveCompany(companyToMove.sourceAccountId, companyToMove.companyId, targetCompanyAccountId)
      toast.success(`Moved "${companyToMove.companyName}" to "${targetAcc?.name || 'target account'}"`)
      setCompanyToMove(null)
      setTargetCompanyAccountId('')
    }
  }, [companyToMove, targetCompanyAccountId, accounts, moveCompany])

  const openDialog = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    setNewAccountName('')
  }, [])

  // Strict Shipper Isolation: Shippers only see their own created or assigned accounts
  const isShipper = currentUser?.role === 'shipper'
  const visibleAccounts = isShipper
    ? accounts.filter((acc) => {
        const u = (currentUser?.username || '').toLowerCase()
        const n = (currentUser?.name || '').toLowerCase()
        const accName = acc.name.toLowerCase()
        const createdBy = (acc.createdBy || '').toLowerCase()
        const shipperUser = (acc.shipperUsername || '').toLowerCase()
        return (
          createdBy === u ||
          shipperUser === u ||
          accName === u ||
          accName === n ||
          acc.companies?.some(
            (c) =>
              (c.createdBy || '').toLowerCase() === u ||
              c.name.toLowerCase() === u ||
              c.name.toLowerCase() === n
          )
        )
      })
    : accounts

  const totalCompanies = visibleAccounts.reduce((acc, a) => acc + (a.companies?.length || 0), 0)

  const allCompanies = visibleAccounts.flatMap((acc) =>
    (acc.companies || []).map((comp) => ({ account: acc, company: comp }))
  )

  const filteredAccounts = visibleAccounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.companies?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredCompanies = allCompanies.filter(({ account, company }) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const chartData = visibleAccounts.map(acc => ({
    name: acc.name.length > 12 ? acc.name.substring(0, 12) + '...' : acc.name,
    shippers: acc.companies?.length || 0,
    fullName: acc.name
  })).sort((a, b) => b.shippers - a.shippers).slice(0, 6)

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-white/80 backdrop-blur-xl border border-amber-200/60 rounded-3xl p-6 shadow-xl shadow-amber-900/5 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Accounts & Client Ledgers
            </h2>
            <span className="px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{accounts.length} Accounts • {totalCompanies} Shippers</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-bold">
            Manage business accounts, client companies, financial ledgers, and saved PDF documents
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <Button 
            type="button"
            variant="outline"
            onClick={() => syncCloudData()}
            disabled={isSyncing}
            className="gap-2 rounded-2xl border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-950 font-black shadow-sm h-11 px-4 text-xs cursor-pointer transition-all"
            title="Refresh and sync data from server across all devices"
          >
            <RefreshCw className={`h-4 w-4 text-blue-700 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Cloud Data"}</span>
            <span className="hidden sm:inline font-[vazirmatn] text-[10px] opacity-80">/ همگام‌سازی</span>
          </Button>

          <Button 
            type="button"
            onClick={openDialog} 
            className="gap-2 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all h-11 sm:h-12 px-5 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 text-amber-400" />
            <span>Add New Account / حساب جدید</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview Bar (Mobile Responsive Compact Grid) */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card 1 */}
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200/70 bg-white/95 p-3.5 sm:p-4 backdrop-blur-xl shadow-md shadow-blue-900/5 group hover:border-blue-400 transition-all">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-sm">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider truncate">Business Accounts</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{accounts.length}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/70 bg-white/95 p-3.5 sm:p-4 backdrop-blur-xl shadow-md shadow-indigo-900/5 group hover:border-indigo-400 transition-all">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-sm">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider truncate">Shippers / شرکت‌ها</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{totalCompanies}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-3.5 sm:p-4 backdrop-blur-xl shadow-sm">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider truncate">System Cloud Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <p className="text-xs sm:text-sm font-black text-emerald-800 truncate">Synced & Connected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Suite Quick Module Hub (Featured SKY DOC Launcher) */}
      <div className="mb-8 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
        {/* Glow Accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>SKY ARIANA Enterprise Module Suite</span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Live Portal
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Direct access to Document Management, Bills of Lading, CMR Waybills, Commercial Invoices &amp; Banking
                </p>
              </div>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            
            {/* 1. SKY DOC (Featured Flagship) */}
            <div 
              onClick={() => setView('sky-doc')}
              className="relative col-span-1 sm:col-span-2 lg:col-span-2 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/90 border-2 border-cyan-400/50 hover:border-cyan-300 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-xl shadow-cyan-950/50 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                        SKY DOC Enterprise
                      </h4>
                      <span className="flex items-center gap-1 px-2 py-0.2 rounded-md bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Live System
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-200/80 font-bold mt-0.5">
                      Enterprise Operating System &amp; Document Management • سیستم جامع اسناد
                    </p>
                  </div>
                </div>
                <div className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] text-slate-300 font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700">Multi-Company Files</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700">Digital Archive</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700">Cloud Sync</span>
              </div>

              <div className="mt-3.5 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">https://skyariana-doc-ten.vercel.app</span>
                <Button 
                  type="button" 
                  size="sm" 
                  className="h-7.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <span>Launch SKY DOC</span>
                  <span className="hidden xs:inline font-[vazirmatn] text-[10px]">/ باز کردن اسناد</span>
                </Button>
              </div>
            </div>

            {/* 2. BOL Editor */}
            <div 
              onClick={() => setView('bol')}
              className="bg-slate-900/90 hover:bg-slate-900 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                    Maritime
                  </span>
                </div>
                <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                  BOL Editor
                </h4>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  Bills of Lading, Seals &amp; Stamps • بارنامه
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-amber-400">
                <span>Create &amp; Print</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* 3. Sky CMR */}
            <div 
              onClick={() => setView('sky-cmr')}
              className="bg-slate-900/90 hover:bg-slate-900 border border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <Truck className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase">
                    Transit
                  </span>
                </div>
                <h4 className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                  Sky CMR
                </h4>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  Border Transit Waybills • سی‌ام‌آر
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-blue-400">
                <span>Open CMR</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* 4. Commercial Invoice Pad */}
            <div 
              onClick={() => setView('invoice-pad')}
              className="bg-slate-900/90 hover:bg-slate-900 border border-indigo-500/30 hover:border-indigo-400/60 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Receipt className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">
                    Customs
                  </span>
                </div>
                <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                  Invoice Pad
                </h4>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  Commercial Invoices • فاکتور
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-indigo-400">
                <span>Open Invoices</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* 5. Sky Bank */}
            <div 
              onClick={() => setView('bank')}
              className="bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Landmark className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                    Banking
                  </span>
                </div>
                <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                  Sky Bank
                </h4>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  Transactions &amp; Ledgers • بانک
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-emerald-400">
                <span>Open Bank</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      {accounts.length > 0 && (
        <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search account name or shipper company..."
              className="h-11 rounded-2xl border-slate-300 bg-white/90 pl-11 pr-10 text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl border border-slate-300/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-blue-950 shadow-sm border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({accounts.length + totalCompanies})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('accounts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeFilter === 'accounts'
                  ? 'bg-white text-blue-950 shadow-sm border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Accounts ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('shippers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeFilter === 'shippers'
                  ? 'bg-white text-blue-950 shadow-sm border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shippers ({totalCompanies})
            </button>
          </div>
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-strong sm:max-w-md rounded-3xl border-white/80 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center justify-between">
              <span>Create New Account</span>
              <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">ایجاد حساب جدید</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Account Name / نام حساب</label>
              <Input
                placeholder="e.g. HAJI-ABDUL-WASE-KHAN-ALOKOZAY..."
                value={newAccountName}
                onChange={e => setNewAccountName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddAccount()
                  }
                }}
                className="bg-white border-slate-300 focus:border-amber-500 h-11 font-extrabold text-slate-950 rounded-2xl"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-slate-100 rounded-xl font-bold" onClick={closeDialog}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleAddAccount} disabled={!newAccountName.trim()} className="bg-blue-900 hover:bg-blue-950 font-black rounded-xl text-white">
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Displays */}
      {accounts.length === 0 ? (
        <Card className="glass border-2 border-dashed border-amber-300/80 rounded-3xl overflow-hidden shadow-xl">
          <div className="flex flex-col items-center justify-center py-20 px-4 relative text-center">
            <div className="p-5 rounded-2xl bg-amber-100/80 mb-4 shadow-inner">
              <Building2 className="h-12 w-12 text-amber-800" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Welcome to SKY ARIANA LIMITED</h3>
            <p className="text-slate-600 text-center mb-6 max-w-md font-medium text-sm">
              Get started by creating your first account. Each account can contain multiple companies with dedicated ledgers, invoices, and BOL documents.
            </p>
            <Button 
              type="button"
              onClick={openDialog} 
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 rounded-2xl px-6 cursor-pointer"
            >
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Add Your First Account / حساب جدید</span>
            </Button>
          </div>
        </Card>
      ) : filteredAccounts.length === 0 && filteredCompanies.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center">
          <div className="max-w-sm rounded-3xl border border-dashed border-slate-300 bg-white/90 p-8 text-center shadow-lg backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="text-lg font-black text-slate-900">No accounts match search</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Try searching for another account or company name.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Main Accounts Grid Section */}
          {(activeFilter === 'all' || activeFilter === 'accounts') && filteredAccounts.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>Primary Business Accounts</span>
              </h3>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredAccounts.map(account => {
                  const totalDebit = account.companies?.reduce((sum, c) => 
                    sum + (c.ledgerEntries?.reduce((s, e) => s + (Number(e.debit) || 0), 0) || 0), 0
                  ) || 0
                  const totalCredit = account.companies?.reduce((sum, c) => 
                    sum + (c.ledgerEntries?.reduce((s, e) => s + (Number(e.credit) || 0), 0) || 0), 0
                  ) || 0
                  const netBalance = totalDebit - totalCredit

                  return (
                    <Card
                      key={account.id}
                      className="group relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-900/10 overflow-hidden cursor-pointer"
                      onClick={() => selectAccount(account)}
                    >
                      {/* Top Accent Gradient Line */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-800 to-amber-500 group-hover:h-2 transition-all duration-300" />

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-black text-slate-900 group-hover:text-blue-900 transition-colors truncate" title={account.name}>
                              {account.name}
                            </CardTitle>
                            <span className="text-xs text-amber-700 font-[vazirmatn] font-bold block">حساب تجاری اصلی</span>
                          </div>
                        </div>

                        {/* Card Action Buttons (Edit, Move, Delete) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-700 rounded-xl cursor-pointer transition-colors"
                            onClick={e => {
                              e.stopPropagation()
                              setAccountToEdit({ id: account.id, name: account.name })
                              setEditAccountName(account.name)
                            }}
                            title="Edit Account Name / ویرایش نام حساب"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-amber-50 hover:text-amber-800 rounded-xl cursor-pointer transition-colors"
                            onClick={e => {
                              e.stopPropagation()
                              setAccountToMove({
                                id: account.id,
                                name: account.name,
                                companiesCount: account.companies?.length || 0,
                              })
                              setTargetAccountId('')
                            }}
                            title="Move / Merge into Another Account / انتقال و ادغام حساب"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-xl cursor-pointer transition-colors"
                            onClick={e => {
                              e.stopPropagation()
                              setAccountToDelete({ id: account.id, name: account.name })
                            }}
                            title="Delete Account / حذف حساب"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Net Balance & Financial Indicator */}
                      <div className="mt-3.5 flex items-center justify-between gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-black text-slate-800">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Balance:</span>
                          <span className={`font-mono ${netBalance > 0 ? 'text-emerald-700 font-extrabold' : 'text-slate-700'}`}>
                            ${netBalance.toLocaleString()} USD
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-slate-500">
                          {account.companies?.length || 0} {(account.companies?.length || 0) === 1 ? 'Company' : 'Companies'}
                        </span>
                      </div>

                      {/* Company Tags Preview */}
                      {account.companies && account.companies.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {account.companies.slice(0, 3).map((comp) => (
                            <span
                              key={comp.id}
                              className="inline-block rounded-xl border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-[11px] font-black text-blue-950 truncate max-w-[200px]"
                            >
                              {comp.name}
                            </span>
                          ))}
                          {account.companies.length > 3 && (
                            <span className="inline-block rounded-xl border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                              +{account.companies.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                            <FileText className="h-4 w-4" />
                          </div>
                          <p className="text-xs font-black text-slate-800">
                            Manage Ledgers
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-blue-900 group-hover:translate-x-1 transition-transform bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200">
                          <span>View Companies</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Shipper Companies Grid Section */}
          {(activeFilter === 'all' || activeFilter === 'shippers') && filteredCompanies.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>Shipper Companies & Client Ledgers</span>
                  <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">دفاتر حساب مشتریان</span>
                </h3>
                <span className="text-xs font-extrabold text-slate-500">
                  {filteredCompanies.length} registered shipper ledgers
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredCompanies.map(({ account, company }) => {
                  const entryCount = company.ledgerEntries?.length || 0
                  return (
                    <Card
                      key={company.id}
                      className="group relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-900/10 overflow-hidden cursor-pointer"
                      onClick={() => {
                        selectAccount(account)
                        selectCompany(company)
                      }}
                    >
                      {/* Top Accent Gradient Line */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-900 via-purple-800 to-amber-500 group-hover:h-2 transition-all duration-300" />

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-md shadow-indigo-950/20">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-black text-slate-900 group-hover:text-indigo-900 transition-colors truncate" title={company.name}>
                              {company.name}
                            </CardTitle>
                            <span className="text-xs text-amber-700 font-[vazirmatn] font-bold block">دفتر حساب شرکت</span>
                          </div>
                        </div>

                        {/* Move Company Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl cursor-pointer transition-colors"
                          onClick={e => {
                            e.stopPropagation()
                            setCompanyToMove({
                              sourceAccountId: account.id,
                              companyId: company.id,
                              companyName: company.name,
                            })
                            setTargetCompanyAccountId('')
                          }}
                          title="Move Company to Another Account / انتقال شرکت به حساب دیگر"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/90 px-2.5 py-1 text-xs font-black text-indigo-950">
                          <span>{entryCount} {entryCount === 1 ? 'Ledger Entry' : 'Ledger Entries'}</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-600 truncate max-w-[140px]" title={account.name}>
                          {account.name}
                        </span>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                        <span className="text-xs font-bold text-slate-500">Shipper Ledger</span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950 group-hover:translate-x-1 transition-transform bg-indigo-50/90 px-3 py-1.5 rounded-xl border border-indigo-200">
                          <span>View Ledgers</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Analytics Chart at Bottom */}
          {chartData.length > 0 && (
            <div className="rounded-3xl border border-blue-100 bg-white/90 p-5 sm:p-6 backdrop-blur-xl shadow-md shadow-blue-900/5">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                <span>Top Accounts by Shippers Overview</span>
              </h3>
              <div className="h-[180px] sm:h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                      dy={8}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                      formatter={(value: number) => [<span className="font-black text-blue-900">{value} Shippers</span>, '']}
                      labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                    />
                    <Bar dataKey="shippers" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#1e3a8a' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Edit Account Name Dialog */}
      <Dialog open={!!accountToEdit} onOpenChange={(open) => !open && setAccountToEdit(null)}>
        <DialogContent className="glass-strong sm:max-w-md rounded-3xl border-white/80 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-800 shadow-sm">
                <Edit3 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Edit Account Name</span>
                  <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">ویرایش نام حساب</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Update primary business account title
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Account Name / نام حساب</label>
              <Input
                placeholder="e.g. NAJEB AMIN LTD..."
                value={editAccountName}
                onChange={e => setEditAccountName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveEditAccount()
                  }
                }}
                className="bg-white border-slate-300 focus:border-blue-500 h-11 font-extrabold text-slate-950 rounded-2xl"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="bg-slate-100 rounded-xl font-bold"
              onClick={() => setAccountToEdit(null)}
            >
              Cancel / لغو
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditAccount}
              disabled={!editAccountName.trim()}
              className="bg-blue-900 hover:bg-blue-950 font-black rounded-xl text-white shadow-md shadow-blue-900/20"
            >
              Save Changes / ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Move / Merge Account Dialog */}
      <Dialog open={!!accountToMove} onOpenChange={(open) => !open && setAccountToMove(null)}>
        <DialogContent className="glass-strong sm:max-w-md rounded-3xl border-amber-200/80 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-900 shadow-sm">
                <ArrowRightLeft className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Move & Merge Account</span>
                  <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">انتقال و ادغام حساب</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Transfer all companies & ledger entries into another account
                </p>
              </div>
            </div>
          </DialogHeader>

          {accountToMove && (
            <div className="space-y-4 py-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 font-bold block">Source Account (Moving From):</span>
                <span className="text-sm font-black text-blue-950">{accountToMove.name}</span>
                <span className="text-[11px] text-slate-500 block pt-0.5">
                  Contains <strong>{accountToMove.companiesCount}</strong> {accountToMove.companiesCount === 1 ? 'company' : 'companies'} and all linked ledgers.
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Select Destination Account / حساب مقصد
                </label>
                <select
                  value={targetAccountId}
                  onChange={e => setTargetAccountId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-2xl font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  <option value="">-- Choose Target Account / انتخاب حساب --</option>
                  {accounts
                    .filter(a => a.id !== accountToMove.id)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.companies?.length || 0} companies)
                      </option>
                    ))}
                </select>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                ⚠️ All companies and ledger records will be transferred to the destination account, and the source account will be safely merged.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="bg-slate-100 rounded-xl font-bold"
              onClick={() => setAccountToMove(null)}
            >
              Cancel / لغو
            </Button>
            <Button
              type="button"
              onClick={handleConfirmMoveAccount}
              disabled={!targetAccountId}
              className="bg-amber-600 hover:bg-amber-700 font-black rounded-xl text-white shadow-md shadow-amber-600/20"
            >
              Confirm Move / تایید انتقال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Move Company Dialog */}
      <Dialog open={!!companyToMove} onOpenChange={(open) => !open && setCompanyToMove(null)}>
        <DialogContent className="glass-strong sm:max-w-md rounded-3xl border-indigo-200/80 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-900 shadow-sm">
                <ArrowRightLeft className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Move Shipper Company</span>
                  <span className="text-xs text-indigo-700 font-[vazirmatn] font-bold">انتقال شرکت به حساب دیگر</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Transfer company ledger to another business account
                </p>
              </div>
            </div>
          </DialogHeader>

          {companyToMove && (
            <div className="space-y-4 py-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 font-bold block">Company (Moving):</span>
                <span className="text-sm font-black text-indigo-950">{companyToMove.companyName}</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Select Destination Account / حساب مقصد
                </label>
                <select
                  value={targetCompanyAccountId}
                  onChange={e => setTargetCompanyAccountId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-2xl font-bold text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                >
                  <option value="">-- Choose Target Account / انتخاب حساب --</option>
                  {accounts
                    .filter(a => a.id !== companyToMove.sourceAccountId)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="bg-slate-100 rounded-xl font-bold"
              onClick={() => setCompanyToMove(null)}
            >
              Cancel / لغو
            </Button>
            <Button
              type="button"
              onClick={handleConfirmMoveCompany}
              disabled={!targetCompanyAccountId}
              className="bg-indigo-700 hover:bg-indigo-800 font-black rounded-xl text-white shadow-md shadow-indigo-700/20"
            >
              Move Company / انتقال شرکت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Account Confirmation Dialog */}
      <Dialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <DialogContent className="glass-strong border-red-200 sm:max-w-md p-6 shadow-2xl rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100/90 text-red-600 shadow-sm">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Delete Account</span>
                  <span className="text-xs text-red-700 font-[vazirmatn] font-bold">حذف حساب</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Are you sure you want to delete this account?
                </p>
              </div>
            </div>
          </DialogHeader>

          {accountToDelete && (
            <div className="my-3 p-4 bg-red-50/70 rounded-2xl border border-red-200/80 text-xs space-y-1.5">
              <span className="text-slate-500 font-bold block">Account Name:</span>
              <span className="text-sm font-black text-slate-900">{accountToDelete.name}</span>
              <p className="text-[11px] text-red-700 font-medium pt-1">
                ⚠️ All associated companies and ledger entries will also be removed.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccountToDelete(null)}
              className="rounded-xl font-black text-xs h-10 px-4"
            >
              No, Cancel / رد
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (accountToDelete) {
                  deleteAccount(accountToDelete.id)
                  toast.success(`Account "${accountToDelete.name}" deleted`)
                  setAccountToDelete(null)
                }
              }}
              className="rounded-xl font-black text-xs h-10 px-5 bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Delete / هو، حذف یې کړه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
