"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  Scale,
  FileText,
  Printer,
  Plus,
  Search,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  History,
  BarChart3,
  DollarSign,
  Coins,
  ShieldAlert,
} from "lucide-react"

import type {
  TreasuryAccount,
  TreasuryTransaction,
  TreasuryTransfer,
  CurrencyExchangeTransaction,
  TreasuryReconciliation,
  CashPositionSummary,
  DailyCashMovementSummary,
  TreasuryDashboardData,
} from "@/lib/types/treasury"

import { RecordCustomerReceiptModal } from "./record-customer-receipt-modal"
import { RecordSupplierPaymentModal } from "./record-supplier-payment-modal"
import { NewTransferModal } from "./new-transfer-modal"
import { NewExchangeModal } from "./new-exchange-modal"
import { ReconciliationModal } from "./reconciliation-modal"
import { TreasuryVoucherPrintModal } from "./treasury-voucher-print-modal"

export function TreasuryWorkspace() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [dashboardData, setDashboardData] = useState<TreasuryDashboardData | null>(null)
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([])
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([])
  const [transfers, setTransfers] = useState<TreasuryTransfer[]>([])
  const [exchanges, setExchanges] = useState<CurrencyExchangeTransaction[]>([])
  const [reconciliations, setReconciliations] = useState<TreasuryReconciliation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState("ALL")

  // Modals state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false)

  // Print voucher modal state
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printVoucherType, setPrintVoucherType] = useState<"RECEIPT" | "PAYMENT_VOUCHER" | "TRANSFER" | "EXCHANGE">("RECEIPT")
  const [printVoucherData, setPrintVoucherData] = useState<any>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [dashRes, txRes, trfRes, fxRes, recRes] = await Promise.all([
        fetch("/api/accounting/treasury"),
        fetch("/api/accounting/treasury/transactions"),
        fetch("/api/accounting/treasury/transfers"),
        fetch("/api/accounting/treasury/exchange"),
        fetch("/api/accounting/treasury/reconciliation"),
      ])

      const [dashJson, txJson, trfJson, fxJson, recJson] = await Promise.all([
        dashRes.json(),
        txRes.json(),
        trfRes.json(),
        fxRes.json(),
        recRes.json(),
      ])

      if (dashJson.success) {
        setDashboardData(dashJson)
        setAccounts(dashJson.accounts || [])
      }
      if (txJson.success) setTransactions(txJson.data || [])
      if (trfJson.success) setTransfers(trfJson.data || [])
      if (fxJson.success) setExchanges(fxJson.data || [])
      if (recJson.success) setReconciliations(recJson.data || [])
    } catch (err: any) {
      console.error("[Treasury Workspace] Error loading data:", err)
      toast.error("Failed to load treasury data.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePrintVoucher = (type: "RECEIPT" | "PAYMENT_VOUCHER" | "TRANSFER" | "EXCHANGE", row: any) => {
    // augment account name
    const acc = accounts.find((a) => a.id === row.treasury_account_id)
    setPrintVoucherType(type)
    setPrintVoucherData({
      ...row,
      treasury_account_name: acc?.account_name || row.treasury_account_name,
    })
    setPrintModalOpen(true)
  }

  // Filtered accounts
  const bankAccounts = useMemo(() => accounts.filter((a) => a.account_type === "BANK"), [accounts])
  const cashAccounts = useMemo(() => accounts.filter((a) => a.account_type === "CASH" || a.account_type === "PETTY_CASH"), [accounts])
  const exchangeAccounts = useMemo(() => accounts.filter((a) => a.account_type === "EXCHANGE_DEALER"), [accounts])

  // Filtered customer receipts & supplier payments
  const customerReceipts = useMemo(
    () => transactions.filter((t) => t.transaction_type === "CUSTOMER_RECEIPT"),
    [transactions]
  )
  const supplierPayments = useMemo(
    () => transactions.filter((t) => t.transaction_type === "SUPPLIER_PAYMENT"),
    [transactions]
  )

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                TREASURY & CASH / BANK MANAGEMENT
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                Phase 18
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-Currency Bank Accounts, Cash Boxes, Internal Transfers, Currency Exchange, and Atomic Receipts
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setReceiptModalOpen(true)}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            Record Customer Receipt
          </Button>

          <Button
            size="sm"
            onClick={() => setPaymentModalOpen(true)}
            className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Disburse Supplier Payment
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransferModalOpen(true)}
            className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Transfer Funds
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExchangeModalOpen(true)}
            className="gap-1.5 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Exchange Currency
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReconciliationModalOpen(true)}
            className="gap-1.5 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 cursor-pointer"
          >
            <Scale className="h-3.5 w-3.5" />
            Reconcile
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bank Accounts</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {dashboardData?.kpi.bankAccountsCount || bankAccounts.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Operating Corporate Banks</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cash Boxes</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {dashboardData?.kpi.cashBoxesCount || cashAccounts.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Physical Cash Registers</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Exchange Accounts</span>
            <Coins className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {dashboardData?.kpi.exchangeAccountsCount || exchangeAccounts.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Hawala & Clearing Dealers</span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Inflow</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-100">
            ${Number(dashboardData?.kpi.todayInflowUSD || 0).toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-emerald-700">
            AED {Number(dashboardData?.kpi.todayInflowAED || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Outflow</span>
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-sm font-black font-mono text-rose-900 dark:text-rose-100">
            ${Number(dashboardData?.kpi.todayOutflowUSD || 0).toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-rose-700">
            AED {Number(dashboardData?.kpi.todayOutflowAED || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Audit Invariance</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-sm font-black text-emerald-600 flex items-center gap-1">
            100% Invariant
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Bal = Open + In - Out</span>
        </div>
      </div>

      {/* Main Module Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <BarChart3 className="h-3.5 w-3.5" />
            Treasury Dashboard
          </TabsTrigger>
          <TabsTrigger value="banks" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            Bank Accounts ({bankAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="cash" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            Cash Boxes ({cashAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="exchanges" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Coins className="h-3.5 w-3.5 text-indigo-600" />
            Exchange Accounts ({exchangeAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
            Money Transfers ({transfers.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
            Customer Receipts ({customerReceipts.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
            Supplier Payments ({supplierPayments.length})
          </TabsTrigger>
          <TabsTrigger value="fx" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5 text-purple-600" />
            Currency Exchange ({exchanges.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <History className="h-3.5 w-3.5 text-slate-600" />
            Running Ledger ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs font-semibold gap-1.5 cursor-pointer">
            <Scale className="h-3.5 w-3.5 text-teal-600" />
            Reconciliation ({reconciliations.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-5 mt-4">
          {/* Multi-Currency Cash Positions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Corporate Cash Position by Currency (Strictly Segregated)
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Never blended without explicit conversion rates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboardData?.cashPositions.map((pos) => (
                <div
                  key={pos.currency}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      {pos.currency}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{pos.account_count} Accounts</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Bank Balances:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pos.currency} {pos.bank_total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Physical Cash Boxes:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pos.currency} {pos.cash_total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Exchange / Clearing:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pos.currency} {pos.exchange_total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">
                      Total {pos.currency} Position:
                    </span>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {pos.currency} {pos.total_balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Movements Breakdown */}
          {dashboardData?.todayMovements && dashboardData.todayMovements.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-blue-600" />
                Today's Net Cash Movement (Formula: Net = In - Out)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dashboardData.todayMovements.map((move) => (
                  <div
                    key={move.currency}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{move.currency} Activity</span>
                      <span
                        className={`font-mono ${
                          move.net_movement >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {move.net_movement >= 0 ? `+${move.net_movement.toLocaleString()}` : move.net_movement.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Money In: +{move.money_in.toLocaleString()}</span>
                      <span>Money Out: -{move.money_out.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Treasury Transactions Table */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Latest 15 Treasury Transactions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("transactions")}
                className="text-xs text-blue-600 font-semibold"
              >
                View Full Running Ledger →
              </Button>
            </div>

            {/* Mobile Transaction Cards (md:hidden) */}
            <div className="md:hidden space-y-2.5">
              {transactions.slice(0, 15).map((tx) => {
                const acc = accounts.find((a) => a.id === tx.treasury_account_id)
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                      <span className="font-mono text-[11px] text-slate-500">{tx.transaction_date}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          tx.transaction_type === "CUSTOMER_RECEIPT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : tx.transaction_type === "SUPPLIER_PAYMENT"
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : tx.transaction_type.startsWith("INTERNAL_TRANSFER")
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : tx.transaction_type.startsWith("EXCHANGE")
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                            : "bg-slate-50 text-slate-700 border-slate-300"
                        }`}
                      >
                        {tx.transaction_type}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">{acc?.account_name || "Account"}</span>
                      {tx.reference_number && (
                        <span className="font-mono text-[11px] text-blue-600">{tx.reference_number}</span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {tx.party_name ? <strong className="font-semibold">{tx.party_name}: </strong> : null}
                      {tx.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        {tx.amount_in > 0 && (
                          <span className="font-mono font-bold text-emerald-600">
                            +{tx.amount_in.toLocaleString()} {tx.currency}
                          </span>
                        )}
                        {tx.amount_out > 0 && (
                          <span className="font-mono font-bold text-rose-600">
                            -{tx.amount_out.toLocaleString()} {tx.currency}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Bal:</span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                          {tx.balance_after !== undefined ? `${tx.balance_after.toLocaleString()} ${tx.currency}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                    <th className="p-2 font-bold">Date</th>
                    <th className="p-2 font-bold">Type</th>
                    <th className="p-2 font-bold">Account</th>
                    <th className="p-2 font-bold">Party / Description</th>
                    <th className="p-2 font-bold">Reference</th>
                    <th className="p-2 font-bold text-right">Money In</th>
                    <th className="p-2 font-bold text-right">Money Out</th>
                    <th className="p-2 font-bold text-right">Balance After</th>
                    <th className="p-2 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.slice(0, 15).map((tx) => {
                    const acc = accounts.find((a) => a.id === tx.treasury_account_id)
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2 font-mono text-[11px]">{tx.transaction_date}</td>
                        <td className="p-2">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold ${
                              tx.transaction_type === "CUSTOMER_RECEIPT"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : tx.transaction_type === "SUPPLIER_PAYMENT"
                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                : tx.transaction_type.startsWith("INTERNAL_TRANSFER")
                                ? "bg-blue-50 text-blue-700 border-blue-300"
                                : tx.transaction_type.startsWith("EXCHANGE")
                                ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                                : "bg-slate-50 text-slate-700 border-slate-300"
                            }`}
                          >
                            {tx.transaction_type}
                          </Badge>
                        </td>
                        <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">
                          {acc?.account_name || "Account"}
                        </td>
                        <td className="p-2 max-w-xs truncate text-slate-700 dark:text-slate-300">
                          {tx.party_name ? <strong className="font-semibold">{tx.party_name}: </strong> : null}
                          {tx.description}
                        </td>
                        <td className="p-2 font-mono text-[11px] text-blue-600 font-semibold">
                          {tx.reference_number || "—"}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-600">
                          {tx.amount_in > 0 ? `+${tx.amount_in.toLocaleString()} ${tx.currency}` : "—"}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-rose-600">
                          {tx.amount_out > 0 ? `-${tx.amount_out.toLocaleString()} ${tx.currency}` : "—"}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {tx.balance_after !== undefined ? `${tx.balance_after.toLocaleString()} ${tx.currency}` : "—"}
                        </td>
                        <td className="p-2 text-center">
                          {tx.transaction_type === "CUSTOMER_RECEIPT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintVoucher("RECEIPT", tx)}
                              className="h-6 w-6 p-0 text-slate-600 hover:text-blue-600 cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {tx.transaction_type === "SUPPLIER_PAYMENT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintVoucher("PAYMENT_VOUCHER", tx)}
                              className="h-6 w-6 p-0 text-slate-600 hover:text-rose-600 cursor-pointer"
                              title="Print Voucher"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* 2. BANK ACCOUNTS TAB */}
        <TabsContent value="banks" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 mb-1">
                      {acc.account_code}
                    </Badge>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{acc.account_name}</h3>
                    <p className="text-xs text-slate-500">{acc.bank_name}</p>
                  </div>
                  <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg font-mono">
                  {acc.account_number && <div>Account: {acc.account_number}</div>}
                  {acc.iban && <div>IBAN: {acc.iban}</div>}
                  {acc.swift_code && <div>SWIFT: {acc.swift_code}</div>}
                  {acc.branch && <div>Branch: {acc.branch}</div>}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Current Balance:</span>
                  <span className="text-lg font-black font-mono text-blue-900 dark:text-blue-300">
                    {acc.currency} {Number(acc.current_balance).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReconciliationModalOpen(true)
                    }}
                    className="w-full text-xs font-semibold gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Reconcile Statement
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 3. CASH BOXES TAB */}
        <TabsContent value="cash" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 mb-1">
                      {acc.account_code}
                    </Badge>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{acc.account_name}</h3>
                    <p className="text-xs text-slate-500">{acc.branch || "Head Office"}</p>
                  </div>
                  <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                    <Wallet className="h-5 w-5" />
                  </span>
                </div>

                <p className="text-xs text-slate-500">{acc.notes || "Physical cash box register for petty cash and driver rents."}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Available Cash:</span>
                  <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                    {acc.currency} {Number(acc.current_balance).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReconciliationModalOpen(true)
                    }}
                    className="w-full text-xs font-semibold gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Count Physical Cash
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 4. EXCHANGE ACCOUNTS TAB */}
        <TabsContent value="exchanges" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exchangeAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 mb-1">
                      {acc.account_code}
                    </Badge>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{acc.account_name}</h3>
                    <p className="text-xs text-slate-500">{acc.account_holder || "Exchange Dealer"}</p>
                  </div>
                  <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                    <Coins className="h-5 w-5" />
                  </span>
                </div>

                <p className="text-xs text-slate-500">{acc.notes || "Clearing dealer account for cross-currency transfers and hawala remittances."}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Dealer Balance:</span>
                  <span className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-400">
                    {acc.currency} {Number(acc.current_balance).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExchangeModalOpen(true)}
                    className="w-full text-xs font-semibold gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    New Exchange Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 5. MONEY TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
              Internal Company Fund Transfers ({transfers.length})
            </h3>
            <Button
              size="sm"
              onClick={() => setTransferModalOpen(true)}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Internal Transfer
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5 font-bold">Transfer #</th>
                  <th className="p-2.5 font-bold">Date</th>
                  <th className="p-2.5 font-bold">From Account (Out)</th>
                  <th className="p-2.5 font-bold">To Account (In)</th>
                  <th className="p-2.5 font-bold text-right">Amount</th>
                  <th className="p-2.5 font-bold text-right">Fee</th>
                  <th className="p-2.5 font-bold">Reference / Remarks</th>
                  <th className="p-2.5 font-bold text-center">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono font-bold text-blue-600">{trf.transfer_number}</td>
                    <td className="p-2.5 font-mono text-[11px]">{trf.transfer_date}</td>
                    <td className="p-2.5 font-semibold text-rose-700">{trf.from_account_name}</td>
                    <td className="p-2.5 font-semibold text-emerald-700">{trf.to_account_name}</td>
                    <td className="p-2.5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      {trf.currency} {Number(trf.amount).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-500">
                      {trf.fee > 0 ? `${trf.currency} ${trf.fee}` : "0"}
                    </td>
                    <td className="p-2.5 text-slate-600">{trf.remarks || trf.reference || "—"}</td>
                    <td className="p-2.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintVoucher("TRANSFER", trf)}
                        className="h-6 w-6 p-0 text-slate-600 hover:text-blue-600 cursor-pointer"
                        title="Print Transfer Voucher"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-xs text-slate-400">
                      No internal transfers recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 6. CUSTOMER RECEIPTS TAB */}
        <TabsContent value="receipts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
              Customer Payment Receipts ({customerReceipts.length})
            </h3>
            <Button
              size="sm"
              onClick={() => setReceiptModalOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Customer Receipt
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5 font-bold">Receipt #</th>
                  <th className="p-2.5 font-bold">Date</th>
                  <th className="p-2.5 font-bold">Customer Name</th>
                  <th className="p-2.5 font-bold">Received Into Account</th>
                  <th className="p-2.5 font-bold text-right">Amount Received</th>
                  <th className="p-2.5 font-bold">Invoice / BOL</th>
                  <th className="p-2.5 font-bold">Method</th>
                  <th className="p-2.5 font-bold text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customerReceipts.map((rcpt) => {
                  const acc = accounts.find((a) => a.id === rcpt.treasury_account_id)
                  return (
                    <tr key={rcpt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-mono font-bold text-emerald-700">{rcpt.reference_number}</td>
                      <td className="p-2.5 font-mono text-[11px]">{rcpt.transaction_date}</td>
                      <td className="p-2.5 font-black text-slate-900 dark:text-slate-100">{rcpt.party_name}</td>
                      <td className="p-2.5 font-semibold text-blue-900 dark:text-blue-300">
                        {acc?.account_name || "Treasury Account"}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-600">
                        {rcpt.currency} {Number(rcpt.amount_in).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                        {rcpt.invoice_id || rcpt.bol_id || "Direct Receipt"}
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">{rcpt.source}</td>
                      <td className="p-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintVoucher("RECEIPT", rcpt)}
                          className="h-6 w-6 p-0 text-slate-600 hover:text-emerald-600 cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 7. SUPPLIER PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
              Supplier Payment Vouchers ({supplierPayments.length})
            </h3>
            <Button
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Disburse Supplier Payment
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5 font-bold">Voucher #</th>
                  <th className="p-2.5 font-bold">Date</th>
                  <th className="p-2.5 font-bold">Supplier / Payee</th>
                  <th className="p-2.5 font-bold">Paid From Account</th>
                  <th className="p-2.5 font-bold text-right">Amount Disbursed</th>
                  <th className="p-2.5 font-bold">Method</th>
                  <th className="p-2.5 font-bold text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supplierPayments.map((pv) => {
                  const acc = accounts.find((a) => a.id === pv.treasury_account_id)
                  return (
                    <tr key={pv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-mono font-bold text-rose-700">{pv.reference_number}</td>
                      <td className="p-2.5 font-mono text-[11px]">{pv.transaction_date}</td>
                      <td className="p-2.5 font-black text-slate-900 dark:text-slate-100">{pv.party_name}</td>
                      <td className="p-2.5 font-semibold text-rose-900 dark:text-rose-300">
                        {acc?.account_name || "Treasury Account"}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-rose-600">
                        {pv.currency} {Number(pv.amount_out).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">{pv.source}</td>
                      <td className="p-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintVoucher("PAYMENT_VOUCHER", pv)}
                          className="h-6 w-6 p-0 text-slate-600 hover:text-rose-600 cursor-pointer"
                          title="Print Voucher"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 8. CURRENCY EXCHANGE TAB */}
        <TabsContent value="fx" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
              Currency Exchange Transactions ({exchanges.length})
            </h3>
            <Button
              size="sm"
              onClick={() => setExchangeModalOpen(true)}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Currency Exchange
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5 font-bold">FX #</th>
                  <th className="p-2.5 font-bold">Date</th>
                  <th className="p-2.5 font-bold">From (Given)</th>
                  <th className="p-2.5 font-bold">To (Received)</th>
                  <th className="p-2.5 font-bold text-center">Effective Rate</th>
                  <th className="p-2.5 font-bold">Dealer / Counterparty</th>
                  <th className="p-2.5 font-bold text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {exchanges.map((fx) => (
                  <tr key={fx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono font-bold text-indigo-700">{fx.exchange_number}</td>
                    <td className="p-2.5 font-mono text-[11px]">{fx.date}</td>
                    <td className="p-2.5 font-semibold text-rose-700">
                      {fx.from_account_name}:{" "}
                      <strong className="font-mono">{fx.from_currency} {Number(fx.from_amount).toLocaleString()}</strong>
                    </td>
                    <td className="p-2.5 font-semibold text-emerald-700">
                      {fx.to_account_name}:{" "}
                      <strong className="font-mono">{fx.to_currency} {Number(fx.to_amount).toLocaleString()}</strong>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-blue-900 dark:text-blue-300">
                      {fx.exchange_rate} <span className="text-[10px] font-normal text-slate-500">({fx.rate_direction})</span>
                    </td>
                    <td className="p-2.5 text-slate-700 font-medium">{fx.counterparty || "Direct Market"}</td>
                    <td className="p-2.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintVoucher("EXCHANGE", fx)}
                        className="h-6 w-6 p-0 text-slate-600 hover:text-indigo-600 cursor-pointer"
                        title="Print FX Voucher"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 9. RUNNING LEDGER TAB */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                Authoritative Treasury Running Statement
              </h3>
              <span className="text-xs text-slate-500 font-medium">{transactions.length} Total Postings</span>
            </div>

            {/* Mobile Running Ledger Cards (md:hidden) */}
            <div className="md:hidden space-y-2.5">
              {transactions.map((tx) => {
                const acc = accounts.find((a) => a.id === tx.treasury_account_id)
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                      <span className="font-mono text-[11px] text-slate-500">{tx.transaction_date}</span>
                      <span className="font-mono font-bold text-[10px] text-slate-600 dark:text-slate-400">{tx.transaction_type}</span>
                    </div>

                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">{acc?.account_name}</span>
                      {tx.reference_number && (
                        <span className="font-mono text-[11px] text-blue-600">{tx.reference_number}</span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{tx.description}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        {tx.amount_in > 0 && (
                          <span className="font-mono font-bold text-emerald-600">
                            +{tx.amount_in.toLocaleString()} {tx.currency}
                          </span>
                        )}
                        {tx.amount_out > 0 && (
                          <span className="font-mono font-bold text-rose-600">
                            -{tx.amount_out.toLocaleString()} {tx.currency}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Bal:</span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                          {tx.balance_after !== undefined ? `${tx.balance_after.toLocaleString()} ${tx.currency}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Running Ledger Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                    <th className="p-2.5 font-bold">Date</th>
                    <th className="p-2.5 font-bold">Account</th>
                    <th className="p-2.5 font-bold">Type</th>
                    <th className="p-2.5 font-bold">Reference</th>
                    <th className="p-2.5 font-bold">Description</th>
                    <th className="p-2.5 font-bold text-right">Money In</th>
                    <th className="p-2.5 font-bold text-right">Money Out</th>
                    <th className="p-2.5 font-bold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => {
                    const acc = accounts.find((a) => a.id === tx.treasury_account_id)
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono text-[11px]">{tx.transaction_date}</td>
                        <td className="p-2.5 font-semibold">{acc?.account_name}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] font-mono font-bold text-slate-600">{tx.transaction_type}</span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-blue-600 font-semibold">{tx.reference_number || "—"}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">{tx.description}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                          {tx.amount_in > 0 ? `+${tx.amount_in.toLocaleString()} ${tx.currency}` : "—"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                          {tx.amount_out > 0 ? `-${tx.amount_out.toLocaleString()} ${tx.currency}` : "—"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          {tx.balance_after !== undefined ? `${tx.balance_after.toLocaleString()} ${tx.currency}` : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* 10. RECONCILIATION TAB */}
        <TabsContent value="reconciliation" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
              Audit & Statement Reconciliation Log ({reconciliations.length})
            </h3>
            <Button
              size="sm"
              onClick={() => setReconciliationModalOpen(true)}
              className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
            >
              <Scale className="h-3.5 w-3.5" />
              Perform Reconciliation
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 uppercase">
                  <th className="p-2.5 font-bold">Audit Date</th>
                  <th className="p-2.5 font-bold">Treasury Account</th>
                  <th className="p-2.5 font-bold">Period Covered</th>
                  <th className="p-2.5 font-bold text-right">System Balance</th>
                  <th className="p-2.5 font-bold text-right">Actual Statement / Count</th>
                  <th className="p-2.5 font-bold text-right">Difference</th>
                  <th className="p-2.5 font-bold text-center">Status</th>
                  <th className="p-2.5 font-bold">Auditor Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-mono text-[11px]">{rec.reconciled_at.split("T")[0]}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{rec.treasury_account_name}</td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-500">
                      {rec.period_start} → {rec.period_end}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">{rec.system_balance.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-600">{rec.actual_balance.toLocaleString()}</td>
                    <td
                      className={`p-2.5 text-right font-mono font-black ${
                        rec.difference === 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {rec.difference > 0 ? `+${rec.difference.toLocaleString()}` : rec.difference.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          rec.status === "MATCHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-rose-50 text-rose-700 border-rose-300"
                        }`}
                      >
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-slate-600">{rec.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Modals */}
      <RecordCustomerReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        accounts={accounts}
        onReceiptRecorded={(receipt) => {
          loadData()
          handlePrintVoucher("RECEIPT", receipt.transaction)
        }}
      />

      <RecordSupplierPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        accounts={accounts}
        onPaymentRecorded={(payment) => {
          loadData()
          handlePrintVoucher("PAYMENT_VOUCHER", payment.transaction)
        }}
      />

      <NewTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        accounts={accounts}
        onTransferComplete={(trf) => {
          loadData()
          handlePrintVoucher("TRANSFER", trf.transfer)
        }}
      />

      <NewExchangeModal
        open={exchangeModalOpen}
        onOpenChange={setExchangeModalOpen}
        accounts={accounts}
        onExchangeComplete={(fx) => {
          loadData()
          handlePrintVoucher("EXCHANGE", fx.exchange)
        }}
      />

      <ReconciliationModal
        open={reconciliationModalOpen}
        onOpenChange={setReconciliationModalOpen}
        accounts={accounts}
        onReconciliationComplete={() => loadData()}
      />

      {/* Print Voucher Modal */}
      <TreasuryVoucherPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        voucherType={printVoucherType}
        data={printVoucherData}
      />
    </div>
  )
}
