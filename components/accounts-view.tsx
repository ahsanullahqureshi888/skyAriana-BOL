"use client"

import { useState, useCallback } from 'react'
import { Plus, Trash2, Building2, ChevronRight, Sparkles, FileText, Search, X, CheckCircle2, ArrowUpRight, BarChart3, AlertTriangle, RefreshCw } from 'lucide-react'
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

export function AccountsView() {
  const { accounts, addAccount, deleteAccount, selectAccount, selectCompany, isSyncing, syncCloudData, currentUser } = useApp()
  const [newAccountName, setNewAccountName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'accounts' | 'shippers'>('all')
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleAddAccount = useCallback(() => {
    if (newAccountName.trim()) {
      addAccount(newAccountName.trim())
      setNewAccountName('')
      setIsOpen(false)
    }
  }, [newAccountName, addAccount])

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
                {filteredAccounts.map(account => (
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 rounded-xl cursor-pointer"
                        onClick={e => {
                          e.stopPropagation()
                          setAccountToDelete({ id: account.id, name: account.name })
                        }}
                        title="Delete Account / حذف حساب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Company Tags Preview */}
                    {account.companies && account.companies.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {account.companies.slice(0, 4).map((comp) => (
                          <span
                            key={comp.id}
                            className="inline-block rounded-xl border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-[11px] font-black text-blue-950"
                          >
                            {comp.name}
                          </span>
                        ))}
                        {account.companies.length > 4 && (
                          <span className="inline-block rounded-xl border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                            +{account.companies.length - 4} more
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
                          {account.companies.length} {account.companies.length === 1 ? 'Company' : 'Companies'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-blue-900 group-hover:translate-x-1 transition-transform bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200">
                        <span>View Companies</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Card>
                ))}
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
                        <div className="p-1.5 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/90 px-2.5 py-1 text-xs font-black text-indigo-950">
                          <span>{entryCount} {entryCount === 1 ? 'Ledger Entry' : 'Ledger Entries'}</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-600 truncate max-w-[140px]">
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

      {/* Delete Account Confirmation Dialog */}
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
