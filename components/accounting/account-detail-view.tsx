"use client"

import { useState, useEffect, useMemo } from "react"
import { AccountRecord, LedgerTransactionRecord, PaymentRecord } from "@/lib/types/ledger-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  CreditCard,
  PlusCircle,
  Printer,
  Share2,
  Search,
  Calendar,
  Filter,
  Package,
  FileText,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Edit3,
  TrendingDown,
  TrendingUp,
  Scale,
} from "lucide-react"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { NewLedgerEntryDialog } from "./new-ledger-entry-dialog"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { StatementPrintModal } from "./statement-print-modal"
import { toast } from "sonner"

interface AccountDetailViewProps {
  accountId: string
  onBack: () => void
  onOpenBol?: (bolNumber: string) => void
}

export function AccountDetailView({ accountId, onBack, onOpenBol }: AccountDetailViewProps) {
  const [account, setAccount] = useState<AccountRecord | null>(null)
  const [transactions, setTransactions] = useState<LedgerTransactionRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [linkedShipments, setLinkedShipments] = useState<any[]>([])
  const [linkedBols, setLinkedBols] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "debit" | "credit">("all")

  // Modals
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<LedgerTransactionRecord | null>(null)

  const fetchAccountData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/accounting/ledgers/${encodeURIComponent(accountId)}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setAccount(data.account)
        setTransactions(data.transactions)
        setPayments(data.payments || [])
        setLinkedShipments(data.linkedShipments || [])
        setLinkedBols(data.linkedBols || [])
      } else {
        toast.error(data.error || "Failed to load account ledger")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load ledger")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accountId) fetchAccountData()
  }, [accountId])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter === "debit" && t.debit <= 0) return false
      if (typeFilter === "credit" && t.credit <= 0) return false
      if (dateFrom && (t.transaction_date || "") < dateFrom) return false
      if (dateTo && (t.transaction_date || "") > dateTo) return false

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchDesc = (t.description || "").toLowerCase().includes(q)
        const matchRef = (t.reference_number || "").toLowerCase().includes(q)
        const matchInv = (t.invoice_number || "").toLowerCase().includes(q)
        const matchBol = (t.bol_number || "").toLowerCase().includes(q)
        const matchCont = (t.container_number || "").toLowerCase().includes(q)
        const matchCons = (t.consignee_name || "").toLowerCase().includes(q)
        const matchShip = (t.shipper_name || "").toLowerCase().includes(q)
        if (!matchDesc && !matchRef && !matchInv && !matchBol && !matchCont && !matchCons && !matchShip) {
          return false
        }
      }
      return true
    })
  }, [transactions, typeFilter, dateFrom, dateTo, searchQuery])

  const handleCopyWhatsApp = () => {
    if (!account) return
    const text = [
      `*SKY ARIANA LTD*`,
      `*Account Statement*`,
      `Account: *${account.display_name}*`,
      `Currency: *${account.currency}*`,
      `-----------------------------`,
      `Total Debit: *${account.currency === "AFN" ? "؋" : "$"}${account.total_debit.toLocaleString()}*`,
      `Total Credit: *${account.currency === "AFN" ? "؋" : "$"}${account.total_credit.toLocaleString()}*`,
      `*Net Balance: ${account.currency === "AFN" ? "؋" : "$"}${account.current_balance.toLocaleString()}*`,
      account.current_balance > 0
        ? `(Outstanding Balance)`
        : account.current_balance < 0
        ? `(Credit Advance Balance)`
        : `(Zero Balance)`,
      `Last Updated: ${new Date().toLocaleDateString()}`,
    ].join("\n")

    navigator.clipboard.writeText(text)
    toast.success("Account statement copied to clipboard for WhatsApp!")
  }

  if (isLoading && !account) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Clock className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-semibold">Loading ledger transactions...</p>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-bold">Account not found.</p>
        <Button onClick={onBack} variant="outline" size="sm" className="mt-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Ledgers
        </Button>
      </div>
    )
  }

  const isOutstanding = account.current_balance > 0.01
  const isAdvance = account.current_balance < -0.01
  const currSym = account.currency === "AFN" ? "؋" : "$"

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{account.display_name}</h2>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {account.account_type}
              </Badge>
              <Badge className="bg-slate-800 text-white text-[11px] font-mono font-bold">{account.currency}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Code: <span className="font-mono">{account.account_code || "N/A"}</span>
              {account.source && ` | Origin: ${account.source}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyWhatsApp} className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <Share2 className="h-3.5 w-3.5" />
            WhatsApp Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Print / PDF Statement
          </Button>
          <Button
            size="sm"
            onClick={() => setNewEntryOpen(true)}
            variant="outline"
            className="gap-1.5 text-xs border-blue-300 text-blue-700 dark:text-blue-400 hover:bg-blue-50"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Ledger Entry
          </Button>
          <Button
            size="sm"
            onClick={() => setPaymentOpen(true)}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Debit</p>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{currSym}{account.total_debit.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Charges / Receivables</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Credit</p>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{currSym}{account.total_credit.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Payments & Receipts</p>
          </CardContent>
        </Card>

        <Card className={`border ${isOutstanding ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50" : isAdvance ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-900/50" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Balance</p>
            <div className={`text-base sm:text-lg font-black font-mono mt-1 ${isOutstanding ? "text-amber-700 dark:text-amber-300" : isAdvance ? "text-purple-700 dark:text-purple-300" : "text-slate-900 dark:text-slate-100"}`}>
              {currSym}{account.current_balance.toLocaleString()}
            </div>
            <p className="text-[10px] font-semibold mt-0.5">
              {isOutstanding ? "⚠️ Net Outstanding" : isAdvance ? "✨ Advance / Credit" : "Settled"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Payments</p>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              {payments.length}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Recorded Receipts</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Transactions</p>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              {transactions.length}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Ledger Entries</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Linked Operations</p>
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              {linkedShipments.length} / {linkedBols.length}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Shipments / BOLs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
          <TabsTrigger value="transactions" className="text-xs font-semibold gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            Transactions ({filteredTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="shipments" className="text-xs font-semibold gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Linked Shipments ({linkedShipments.length})
          </TabsTrigger>
          <TabsTrigger value="bols" className="text-xs font-semibold gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Linked BOLs ({linkedBols.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Payment History ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-3 mt-3">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search description, reference, invoice, BOL, container..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                <span className="text-[11px] font-medium text-slate-500">From:</span>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-xs w-20 font-mono outline-hidden"
                />
                <span className="text-[11px] font-medium text-slate-500">To:</span>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-xs w-20 font-mono outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded p-0.5 text-xs font-medium">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-2 py-1 rounded cursor-pointer ${typeFilter === "all" ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter("debit")}
                  className={`px-2 py-1 rounded cursor-pointer ${typeFilter === "debit" ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Debits
                </button>
                <button
                  onClick={() => setTypeFilter("credit")}
                  className={`px-2 py-1 rounded cursor-pointer ${typeFilter === "credit" ? "bg-emerald-600 text-white font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Credits
                </button>
              </div>

              {(searchQuery || dateFrom || dateTo || typeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setDateFrom("")
                    setDateTo("")
                    setTypeFilter("all")
                  }}
                  className="h-8 text-xs text-slate-500"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Transactions Table Container */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-340px)] min-h-[300px] scrollbar-thin [scrollbar-color:rgba(148,163,184,0.45)_transparent]">
              <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3 w-10 sticky top-0 bg-slate-100 dark:bg-slate-800">#</th>
                    <th className="py-2.5 px-3 w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">Date</th>
                    <th className="py-2.5 px-3 min-w-[200px] sticky top-0 bg-slate-100 dark:bg-slate-800">Description</th>
                    <th className="py-2.5 px-3 w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">Ref / BOL</th>
                    <th className="py-2.5 px-3 w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">Invoice</th>
                    <th className="py-2.5 px-3 w-28 text-right sticky top-0 bg-slate-100 dark:bg-slate-800">Debit</th>
                    <th className="py-2.5 px-3 w-28 text-right sticky top-0 bg-slate-100 dark:bg-slate-800">Credit</th>
                    <th className="py-2.5 px-3 w-32 text-right sticky top-0 bg-slate-100 dark:bg-slate-800">Running Balance</th>
                    <th className="py-2.5 px-3 w-16 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No ledger transactions found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, idx) => (
                      <tr
                        key={t.id || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {t.transaction_date}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{t.description}</div>
                          {(t.container_number || t.consignee_name || t.truck_number) && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {t.container_number && <span className="font-mono mr-2">Cont: {t.container_number}</span>}
                              {t.consignee_name && <span>To: {t.consignee_name} </span>}
                              {t.truck_number && <span className="mr-2">Truck: {t.truck_number}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {t.bol_number ? (
                            <button
                              onClick={() => onOpenBol && onOpenBol(t.bol_number!)}
                              className="text-blue-600 hover:underline cursor-pointer"
                            >
                              {t.bol_number}
                            </button>
                          ) : (
                            t.reference_number || "-"
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {t.invoice_number || "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {t.debit > 0 ? (
                            <span className="text-blue-700 dark:text-blue-400">
                              {currSym}{t.debit.toLocaleString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          {t.credit > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {currSym}{t.credit.toLocaleString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {currSym}{t.running_balance.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 opacity-60 group-hover:opacity-100 cursor-pointer"
                            onClick={() => setEditingTx(t)}
                            title="Edit or Delete Transaction"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Transactions Summary Footer */}
            {account && (
              <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Total Transactions: <span className="font-bold text-slate-900 dark:text-white">{filteredTransactions.length}</span>
                </span>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">Total Debit:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      {currSym}{filteredTransactions.reduce((acc, t) => acc + (t.debit || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">Total Credit:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currSym}{filteredTransactions.reduce((acc, t) => acc + (t.credit || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">Current Balance:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {currSym}{account.current_balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Linked Shipments Tab */}
        <TabsContent value="shipments" className="mt-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Linked Consignments & Containers</h3>
            {linkedShipments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No shipments linked to this company yet. Newly created BOLs and shipments will appear here automatically.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2">Container #</th>
                      <th className="p-2">BOL #</th>
                      <th className="p-2">Route</th>
                      <th className="p-2">Commodity</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {linkedShipments.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-2 font-mono font-bold">{s.container_number || s.containerNo || "-"}</td>
                        <td className="p-2 font-mono text-blue-600">{s.bol_number || s.bolNo || "-"}</td>
                        <td className="p-2">{s.origin || "-"} &rarr; {s.destination || "-"}</td>
                        <td className="p-2">{s.cargo_description || s.commodity || "-"}</td>
                        <td className="p-2 font-mono">{s.shipment_date || s.date || "-"}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {s.status || "In Transit"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Linked BOLs Tab */}
        <TabsContent value="bols" className="mt-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Linked Bills of Lading</h3>
            {linkedBols.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No Bills of Lading linked to this company yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2">BOL #</th>
                      <th className="p-2">Shipper</th>
                      <th className="p-2">Consignee</th>
                      <th className="p-2">Cargo</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {linkedBols.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-2 font-mono font-bold text-blue-600">{b.bol_number}</td>
                        <td className="p-2">{b.shipper_name || "-"}</td>
                        <td className="p-2">{b.consignee_name || "-"}</td>
                        <td className="p-2">{b.cargo_description || "-"}</td>
                        <td className="p-2 font-mono">{b.issue_date || "-"}</td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => onOpenBol && onOpenBol(b.bol_number)}
                          >
                            Open BOL
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment & Settlement Log</h3>
              <Button size="sm" onClick={() => setPaymentOpen(true)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <CreditCard className="h-3 w-3 mr-1" />
                Record New Payment
              </Button>
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No direct payments recorded through the payment module yet. Historical payments imported from Excel are recorded in the Transactions tab.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-2 font-mono">{p.payment_date}</td>
                        <td className="p-2 font-mono font-bold text-emerald-600">
                          {currSym}{p.amount.toLocaleString()} {p.currency}
                        </td>
                        <td className="p-2 capitalize">{p.payment_method}</td>
                        <td className="p-2 font-mono text-[11px]">{p.reference || p.bank_reference || "-"}</td>
                        <td className="p-2 text-slate-600">{p.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        accountId={account.id}
        accountName={account.display_name}
        currency={account.currency}
        onPaymentSuccess={fetchAccountData}
      />

      <NewLedgerEntryDialog
        open={newEntryOpen}
        onOpenChange={setNewEntryOpen}
        accountId={account.id}
        accountName={account.display_name}
        currency={account.currency}
        onEntryCreated={fetchAccountData}
      />

      <EditTransactionDialog
        open={Boolean(editingTx)}
        onOpenChange={(open) => {
          if (!open) setEditingTx(null)
        }}
        transaction={editingTx}
        onTransactionUpdated={fetchAccountData}
      />

      <StatementPrintModal
        open={printOpen}
        onOpenChange={setPrintOpen}
        account={account}
        transactions={transactions}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  )
}
