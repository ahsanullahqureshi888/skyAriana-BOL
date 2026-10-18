"use client"

import { useState } from 'react'
import { Plus, Trash2, Building, FileText, Receipt, Sparkles, BookOpen, ArrowLeft, ChevronRight, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useApp } from '@/lib/app-context'

export function CompaniesView() {
  const { currentAccount, addCompany, deleteCompany, selectCompany, setView } = useApp()
  const [newCompanyName, setNewCompanyName] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  if (!currentAccount) return null

  const handleAddCompany = () => {
    if (newCompanyName.trim()) {
      addCompany(currentAccount.id, newCompanyName.trim())
      setNewCompanyName('')
      setIsOpen(false)
    }
  }

  const handleOpenDialog = () => {
    setIsOpen(true)
  }

  const totalEntries = currentAccount.companies.reduce((sum, c) => sum + c.ledgerEntries.length, 0)
  
  const grandTotalDebit = currentAccount.companies.reduce((sum, c) => 
    sum + c.ledgerEntries.reduce((s, e) => s + e.debit, 0), 0
  )
  const grandTotalCredit = currentAccount.companies.reduce((sum, c) => 
    sum + c.ledgerEntries.reduce((s, e) => s + e.credit, 0), 0
  )
  const grandNetBalance = grandTotalDebit - grandTotalCredit

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl font-sans">
      
      {/* Back Navigation Bar */}
      <div className="mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setView('accounts')}
          className="gap-2 bg-white/80 hover:bg-white border-amber-200/80 font-bold text-xs text-slate-700 rounded-xl shadow-2xs hover:border-amber-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-600" />
          <span>Back to All Business Accounts / بازگشت به حساب‌ها</span>
        </Button>
      </div>

      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-white/90 backdrop-blur-xl border border-amber-200/60 rounded-3xl p-6 shadow-xl shadow-amber-900/5 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight" title={currentAccount.name}>
              {currentAccount.name}
            </h2>
            <span className="px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{currentAccount.companies.length} {currentAccount.companies.length === 1 ? 'Company' : 'Companies'}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-bold flex items-center gap-2">
            <span>Shipper companies and ledgers belonging to this primary business account</span>
            <span className="text-amber-700 font-[vazirmatn]">• شرکت‌های تابع این حساب تجاری</span>
          </p>
        </div>

        <Button 
          type="button"
          onClick={handleOpenDialog} 
          className="relative z-10 gap-2 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all h-12 px-6 text-sm cursor-pointer"
        >
          <Plus className="h-5 w-5 text-amber-400" />
          <span>Add Company / ایجاد شرکت</span>
        </Button>
      </div>

      {/* KPI Stats Overview Bar */}
      {currentAccount.companies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Card 1 */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-amber-400 border border-slate-800 shadow-sm">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shipper Companies</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{currentAccount.companies.length}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-amber-400 border border-slate-800 shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recorded Entries</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{totalEntries}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Account Balance</p>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">
                ${grandNetBalance.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-bold">USD</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-strong rounded-3xl border-white/80 shadow-2xl sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center justify-between">
              <span>Add New Company</span>
              <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">ایجاد شرکت جدید</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Company Name / نام شرکت</label>
              <Input
                placeholder="e.g. ASADULLAH NIAMATULLAH HABIBI LTD..."
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
                className="bg-white border-slate-300 focus:border-amber-500 h-11 font-extrabold text-slate-950 rounded-2xl"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-slate-100 rounded-xl font-bold">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleAddCompany} disabled={!newCompanyName.trim()} className="bg-blue-900 hover:bg-blue-950 font-black rounded-xl text-white">
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Cards Grid */}
      {currentAccount.companies.length === 0 ? (
        <Card className="glass border-2 border-dashed border-amber-300/80 rounded-3xl overflow-hidden shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-20 relative text-center">
            <div className="p-5 rounded-2xl bg-amber-100/80 mb-4 shadow-inner">
              <Building className="h-12 w-12 text-amber-800" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Companies Yet</h3>
            <p className="text-slate-600 text-center mb-6 max-w-md font-medium text-sm">
              Add companies to this account to create ledgers and track invoices for each one.
            </p>
            <Button 
              type="button"
              onClick={handleOpenDialog} 
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-black shadow-xl shadow-blue-950/20 rounded-2xl px-6 cursor-pointer"
            >
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Add Your First Company / ایجاد شرکت</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentAccount.companies.map(company => {
            const totalDebit = company.ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
            const totalCredit = company.ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
            const balance = totalDebit - totalCredit

            return (
              <Card
                key={company.id}
                className="group relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-900/10 overflow-hidden cursor-pointer justify-between"
              >
                {/* Top Accent Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-800 to-amber-500 group-hover:h-2 transition-all duration-300" />

                <div>
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-black text-slate-900 group-hover:text-blue-900 transition-colors truncate" title={company.name}>
                          {company.name}
                        </CardTitle>
                        <span className="text-xs text-amber-700 font-[vazirmatn] font-bold block">دفتر حساب رسمی شرکت</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 rounded-xl"
                      onClick={e => {
                        e.stopPropagation()
                        deleteCompany(currentAccount.id, company.id)
                      }}
                      title="Delete Company"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-xs font-black text-blue-950">
                        <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                        <span>{company.ledgerEntries.length} {company.ledgerEntries.length === 1 ? 'Ledger Entry' : 'Ledger Entries'}</span>
                      </span>
                    </div>
                    
                    {company.ledgerEntries.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span className="text-slate-600 uppercase tracking-wider text-[11px]">Current Balance:</span>
                          <span className={`font-mono text-base font-black ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            ${balance.toLocaleString()} <span className="text-[10px] font-sans">USD</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-5">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="flex-1 gap-1.5 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xs shadow-md shadow-blue-950/20 rounded-xl h-10 cursor-pointer"
                      onClick={() => selectCompany(company)}
                    >
                      <BookOpen className="h-4 w-4 text-amber-400" />
                      <span>View Ledger</span>
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-black rounded-xl h-10 cursor-pointer"
                      onClick={() => {
                        selectCompany(company)
                        setView('invoice')
                      }}
                    >
                      <Receipt className="h-4 w-4 text-blue-700" />
                      <span>Invoice</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
