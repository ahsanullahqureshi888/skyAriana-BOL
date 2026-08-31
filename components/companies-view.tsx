"use client"

import { useState, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Building,
  FileText,
  Receipt,
  Sparkles,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Edit3,
  ArrowRightLeft,
} from 'lucide-react'
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
import { toast } from 'sonner'

export function CompaniesView() {
  const {
    accounts,
    currentAccount,
    addCompany,
    updateCompany,
    moveCompany,
    deleteCompany,
    updateAccount,
    selectCompany,
    setView,
  } = useApp()

  const [newCompanyName, setNewCompanyName] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Edit Account state (from header)
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [editAccountName, setEditAccountName] = useState('')

  // Edit Company state
  const [companyToEdit, setCompanyToEdit] = useState<{ id: string; name: string } | null>(null)
  const [editCompanyName, setEditCompanyName] = useState('')

  // Move Company state
  const [companyToMove, setCompanyToMove] = useState<{ id: string; name: string } | null>(null)
  const [targetAccountId, setTargetAccountId] = useState('')

  // Delete Company state
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string; name: string } | null>(null)

  if (!currentAccount) return null

  const handleAddCompany = () => {
    if (newCompanyName.trim()) {
      addCompany(currentAccount.id, newCompanyName.trim())
      toast.success(`Company "${newCompanyName.trim()}" created`)
      setNewCompanyName('')
      setIsOpen(false)
    }
  }

  const handleSaveEditAccount = () => {
    if (currentAccount && editAccountName.trim()) {
      updateAccount(currentAccount.id, editAccountName.trim())
      toast.success(`Account renamed to "${editAccountName.trim()}"`)
      setIsEditingAccount(false)
      setEditAccountName('')
    }
  }

  const handleSaveEditCompany = () => {
    if (currentAccount && companyToEdit && editCompanyName.trim()) {
      updateCompany(currentAccount.id, companyToEdit.id, editCompanyName.trim())
      toast.success(`Company renamed to "${editCompanyName.trim()}"`)
      setCompanyToEdit(null)
      setEditCompanyName('')
    }
  }

  const handleConfirmMoveCompany = () => {
    if (currentAccount && companyToMove && targetAccountId && targetAccountId !== currentAccount.id) {
      const targetAcc = accounts.find(a => a.id === targetAccountId)
      moveCompany(currentAccount.id, companyToMove.id, targetAccountId)
      toast.success(`Moved "${companyToMove.name}" to "${targetAcc?.name || 'target account'}"`)
      setCompanyToMove(null)
      setTargetAccountId('')
    }
  }

  const handleOpenDialog = () => {
    setIsOpen(true)
  }

  const totalEntries = currentAccount.companies.reduce((sum, c) => sum + c.ledgerEntries.length, 0)
  
  const grandTotalDebit = currentAccount.companies.reduce((sum, c) => 
    sum + c.ledgerEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0), 0
  )
  const grandTotalCredit = currentAccount.companies.reduce((sum, c) => 
    sum + c.ledgerEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0), 0
  )
  const grandNetBalance = grandTotalDebit - grandTotalCredit

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-700 rounded-xl cursor-pointer"
              onClick={() => {
                setEditAccountName(currentAccount.name)
                setIsEditingAccount(true)
              }}
              title="Edit Account Name / ویرایش نام حساب"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
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
          <div className="flex items-center gap-4 rounded-3xl border border-amber-200/60 bg-white/90 p-5 backdrop-blur-xl shadow-lg shadow-amber-900/5 relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Shipper Companies</p>
              <p className="text-3xl font-black text-slate-900 mt-0.5">{currentAccount.companies.length}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex items-center gap-4 rounded-3xl border border-amber-200/60 bg-white/90 p-5 backdrop-blur-xl shadow-lg shadow-amber-900/5 relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-md shadow-indigo-950/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Recorded Entries</p>
              <p className="text-3xl font-black text-slate-900 mt-0.5">{totalEntries}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex items-center gap-4 rounded-3xl border border-amber-200/60 bg-white/90 p-5 backdrop-blur-xl shadow-lg shadow-amber-900/5 relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Net Account Balance</p>
              <p className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
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
            const totalDebit = company.ledgerEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0)
            const totalCredit = company.ledgerEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0)
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

                    {/* Company Actions (Edit, Move, Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-50 hover:text-blue-700 rounded-xl cursor-pointer transition-colors"
                        onClick={e => {
                          e.stopPropagation()
                          setCompanyToEdit({ id: company.id, name: company.name })
                          setEditCompanyName(company.name)
                        }}
                        title="Edit Company Name / ویرایش نام شرکت"
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
                          setCompanyToMove({ id: company.id, name: company.name })
                          setTargetAccountId('')
                        }}
                        title="Move to Another Account / انتقال به حساب دیگر"
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
                          setCompanyToDelete({ id: company.id, name: company.name })
                        }}
                        title="Delete Company / حذف شرکت"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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

      {/* 1. Edit Account Name Dialog (from Header) */}
      <Dialog open={isEditingAccount} onOpenChange={setIsEditingAccount}>
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
                onKeyDown={e => e.key === 'Enter' && handleSaveEditAccount()}
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
              onClick={() => setIsEditingAccount(false)}
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

      {/* 2. Edit Company Name Dialog */}
      <Dialog open={!!companyToEdit} onOpenChange={(open) => !open && setCompanyToEdit(null)}>
        <DialogContent className="glass-strong sm:max-w-md rounded-3xl border-white/80 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-800 shadow-sm">
                <Edit3 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Edit Company Name</span>
                  <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">ویرایش نام شرکت</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Update company title across ledgers
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Company Name / نام شرکت</label>
              <Input
                placeholder="e.g. ASADULLAH HABIBI LTD..."
                value={editCompanyName}
                onChange={e => setEditCompanyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEditCompany()}
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
              onClick={() => setCompanyToEdit(null)}
            >
              Cancel / لغو
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditCompany}
              disabled={!editCompanyName.trim()}
              className="bg-blue-900 hover:bg-blue-950 font-black rounded-xl text-white shadow-md shadow-blue-900/20"
            >
              Save Changes / ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Move Company to Another Account Dialog */}
      <Dialog open={!!companyToMove} onOpenChange={(open) => !open && setCompanyToMove(null)}>
        <DialogContent className="glass-strong sm:max-w-md rounded-3xl border-amber-200/80 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-900 shadow-sm">
                <ArrowRightLeft className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Move Company to Another Account</span>
                  <span className="text-xs text-amber-700 font-[vazirmatn] font-bold">انتقال شرکت به حساب دیگر</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Transfer this company and its ledger entries to a different business account
                </p>
              </div>
            </div>
          </DialogHeader>

          {companyToMove && (
            <div className="space-y-4 py-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 font-bold block">Company (Moving):</span>
                <span className="text-sm font-black text-blue-950">{companyToMove.name}</span>
                <span className="text-[11px] text-slate-500 block pt-0.5">
                  Currently under account: <strong>{currentAccount.name}</strong>
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
                    .filter(a => a.id !== currentAccount.id)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.companies?.length || 0} companies)
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
              disabled={!targetAccountId}
              className="bg-amber-600 hover:bg-amber-700 font-black rounded-xl text-white shadow-md shadow-amber-600/20"
            >
              Move Company / انتقال شرکت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Company Confirmation Dialog */}
      <Dialog open={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
        <DialogContent className="glass-strong border-red-200 sm:max-w-md p-6 shadow-2xl rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100/90 text-red-600 shadow-sm">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Delete Company</span>
                  <span className="text-xs text-red-700 font-[vazirmatn] font-bold">حذف شرکت</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Are you sure you want to delete this company ledger?
                </p>
              </div>
            </div>
          </DialogHeader>

          {companyToDelete && (
            <div className="my-3 p-4 bg-red-50/70 rounded-2xl border border-red-200/80 text-xs space-y-1.5">
              <span className="text-slate-500 font-bold block">Company Name:</span>
              <span className="text-sm font-black text-slate-900">{companyToDelete.name}</span>
              <p className="text-[11px] text-red-700 font-medium pt-1">
                ⚠️ All ledger entries under this company will also be removed.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompanyToDelete(null)}
              className="rounded-xl font-black text-xs h-10 px-4"
            >
              No, Cancel / رد
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (companyToDelete && currentAccount) {
                  deleteCompany(currentAccount.id, companyToDelete.id)
                  toast.success(`Company "${companyToDelete.name}" deleted`)
                  setCompanyToDelete(null)
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
