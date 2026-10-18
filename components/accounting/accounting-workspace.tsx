"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AllLedgersTab } from "./all-ledgers-tab"
import { AccountDetailView } from "./account-detail-view"
import { OutstandingDashboardTab } from "./outstanding-dashboard-tab"
import { AgingReportTab } from "./aging-report-tab"
import { ReconciliationTab } from "./reconciliation-tab"
import { BackupRestoreTab } from "./backup-restore-tab"
import { PeriodClosingView } from "./period-closing/period-closing-view"
import { TreasuryWorkspace } from "./treasury/treasury-workspace"
import { MergeAccountsDialog } from "./merge-accounts-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp } from "@/lib/app-context"
import { toast } from "sonner"
import {
  BookOpen,
  LayoutDashboard,
  Layers,
  Clock,
  ShieldCheck,
  Database,
  GitMerge,
  Plus,
  ArrowLeft,
  FileSpreadsheet,
  Lock,
  Landmark,
} from "lucide-react"

export function AccountingWorkspace() {
  const { setView } = useApp()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("ledgers")
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [newAccountOpen, setNewAccountOpen] = useState(false)

  // New Account State
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountType, setNewAccountType] = useState("customer")
  const [newAccountCurrency, setNewAccountCurrency] = useState("USD")
  const [newAccountOpening, setNewAccountOpening] = useState("0")
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountName.trim()) {
      toast.error("Account name is required.")
      return
    }

    try {
      setIsCreatingAccount(true)
      const res = await fetch("/api/accounting/ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_name: newAccountName.trim(),
          account_type: newAccountType,
          currency: newAccountCurrency,
          opening_balance: parseFloat(newAccountOpening) || 0,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Account "${data.account.display_name}" created successfully.`)
        setNewAccountName("")
        setNewAccountOpening("0")
        setNewAccountOpen(false)
        setSelectedAccountId(data.account.id)
      } else {
        toast.error(data.error || "Failed to create account.")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.")
    } finally {
      setIsCreatingAccount(false)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-3.5">
      {/* If a single account ledger is opened */}
      {selectedAccountId ? (
        <AccountDetailView
          accountId={selectedAccountId}
          onBack={() => setSelectedAccountId(null)}
          onOpenBol={(bolNo) => {
            setView("bol")
          }}
        />
      ) : (
        <div className="w-full flex-1 flex flex-col min-h-0 space-y-3.5">
          {/* Main Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    ACCOUNTING / COMPANY LEDGERS
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-Company Ledgers, Transaction History, Reconciliation, and Receivables Management
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMergeDialogOpen(true)}
                className="gap-1.5 text-xs text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:bg-purple-50 shadow-2xs cursor-pointer"
              >
                <GitMerge className="h-3.5 w-3.5" />
                Merge Accounts
              </Button>
              <Button
                size="sm"
                onClick={() => setNewAccountOpen(true)}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                New Account
              </Button>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="bg-slate-100/90 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 w-full justify-start overflow-x-auto h-auto min-h-10 rounded-xl gap-1 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsTrigger
                value="ledgers"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                Company Ledgers
              </TabsTrigger>
              <TabsTrigger
                value="dashboard"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-amber-600" />
                Outstanding Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="aging"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Clock className="h-3.5 w-3.5 text-purple-600" />
                Aging Report (AR)
              </TabsTrigger>
              <TabsTrigger
                value="reconcile"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Import & Reconciliation
              </TabsTrigger>
              <TabsTrigger
                value="backup"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Database className="h-3.5 w-3.5 text-slate-600" />
                Backup & Restore
              </TabsTrigger>
              <TabsTrigger
                value="period-closing"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                Period Closing
              </TabsTrigger>
              <TabsTrigger
                value="treasury"
                className="text-xs font-semibold gap-1.5 cursor-pointer px-3 py-1.5 h-8 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                Treasury & Bank/Cash
              </TabsTrigger>
            </TabsList>

            {/* Submodule Contents */}
            <TabsContent value="ledgers" className="mt-3 flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
              <AllLedgersTab
                onSelectAccount={(id) => setSelectedAccountId(id)}
                onNewAccountClick={() => setNewAccountOpen(true)}
              />
            </TabsContent>

            <TabsContent value="dashboard" className="mt-4">
              <OutstandingDashboardTab onSelectAccount={(id) => setSelectedAccountId(id)} />
            </TabsContent>

            <TabsContent value="aging" className="mt-4">
              <AgingReportTab onSelectAccount={(id) => setSelectedAccountId(id)} />
            </TabsContent>

            <TabsContent value="reconcile" className="mt-4">
              <ReconciliationTab />
            </TabsContent>

            <TabsContent value="backup" className="mt-4">
              <BackupRestoreTab />
            </TabsContent>

            <TabsContent value="period-closing" className="mt-4">
              <PeriodClosingView />
            </TabsContent>

            <TabsContent value="treasury" className="mt-4">
              <TreasuryWorkspace />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Account Merge Modal */}
      <MergeAccountsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        onMergeComplete={() => {
          setSelectedAccountId(null)
        }}
      />

      {/* Create New Account Modal */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              Create Master Ledger Account
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Account / Company Name *</Label>
              <Input
                required
                placeholder="e.g. Ariana Global Trading Ltd"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Account Type *</Label>
                <Select value={newAccountType} onValueChange={setNewAccountType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="shipper">Shipper</SelectItem>
                    <SelectItem value="consignee">Consignee</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="office_expense">Office Expense</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Default Currency *</Label>
                <Select value={newAccountCurrency} onValueChange={setNewAccountCurrency}>
                  <SelectTrigger className="mt-1 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="AFN">AFN (؋)</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="IRR">IRR</SelectItem>
                    <SelectItem value="PKR">PKR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newAccountOpening}
                onChange={(e) => setNewAccountOpening(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewAccountOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingAccount} className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
