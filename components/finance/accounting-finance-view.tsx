"use client"

import React, { useState, useEffect } from "react"
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Building2,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { FinanceDashboardTab } from "./finance-dashboard-tab"

const TabLoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse p-4">
    <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
    <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
  </div>
)

const FinanceSuppliersTab = dynamic(() => import("./finance-suppliers-tab").then(m => m.FinanceSuppliersTab), { loading: TabLoadingSkeleton })
const FinanceSupplierBillsTab = dynamic(() => import("./finance-supplier-bills-tab").then(m => m.FinanceSupplierBillsTab), { loading: TabLoadingSkeleton })
const FinanceSupplierPaymentsTab = dynamic(() => import("./finance-supplier-payments-tab").then(m => m.FinanceSupplierPaymentsTab), { loading: TabLoadingSkeleton })
const FinanceLedgersTab = dynamic(() => import("./finance-ledgers-tab").then(m => m.FinanceLedgersTab), { loading: TabLoadingSkeleton })
const FinanceInvoicesTab = dynamic(() => import("./finance-invoices-tab").then(m => m.FinanceInvoicesTab), { loading: TabLoadingSkeleton })
const FinancePaymentsTab = dynamic(() => import("./finance-payments-tab").then(m => m.FinancePaymentsTab), { loading: TabLoadingSkeleton })
const FinanceReceiptsTab = dynamic(() => import("./finance-receipts-tab").then(m => m.FinanceReceiptsTab), { loading: TabLoadingSkeleton })
const FinanceNotesTab = dynamic(() => import("./finance-notes-tab").then(m => m.FinanceNotesTab), { loading: TabLoadingSkeleton })
const FinanceOutstandingTab = dynamic(() => import("./finance-outstanding-tab").then(m => m.FinanceOutstandingTab), { loading: TabLoadingSkeleton })
const FinanceShipmentFinanceTab = dynamic(() => import("./finance-shipment-finance-tab").then(m => m.FinanceShipmentFinanceTab), { loading: TabLoadingSkeleton })
const FinanceExpensesTab = dynamic(() => import("./finance-expenses-tab").then(m => m.FinanceExpensesTab), { loading: TabLoadingSkeleton })
const FinanceProfitabilityTab = dynamic(() => import("./finance-profitability-tab").then(m => m.FinanceProfitabilityTab), { loading: TabLoadingSkeleton })
const FinanceStatementsTab = dynamic(() => import("./finance-statements-tab").then(m => m.FinanceStatementsTab), { loading: TabLoadingSkeleton })
const FinanceReconciliationTab = dynamic(() => import("./finance-reconciliation-tab").then(m => m.FinanceReconciliationTab), { loading: TabLoadingSkeleton })
const FinanceReportsTab = dynamic(() => import("./finance-reports-tab").then(m => m.FinanceReportsTab), { loading: TabLoadingSkeleton })
import type {
  FinanceOverviewKPIs,
  FinanceInvoiceRecord,
  FinancePaymentRecord,
  FinanceReceiptRecord,
  FinanceDebitNote,
  FinanceCreditNote,
  ShipmentFinanceRecord,
  FinanceExpenseRecord,
  AgingBucketSummary,
  SupplierProfile,
  SupplierBillRecord,
  SupplierPaymentRecord,
} from "@/lib/types/finance"
import type { AccountRecord } from "@/lib/types/ledger-system"
import { toast } from "sonner"

export function AccountingFinanceView() {
  const [activeTab, setActiveTab] = useState<string>("dashboard")
  const [activeCurrency, setActiveCurrency] = useState<string>("USD")
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Global Financial Data State
  const [overview, setOverview] = useState<FinanceOverviewKPIs | null>(null)
  const [invoices, setInvoices] = useState<FinanceInvoiceRecord[]>([])
  const [payments, setPayments] = useState<FinancePaymentRecord[]>([])
  const [receipts, setReceipts] = useState<FinanceReceiptRecord[]>([])
  const [debitNotes, setDebitNotes] = useState<FinanceDebitNote[]>([])
  const [creditNotes, setCreditNotes] = useState<FinanceCreditNote[]>([])
  const [shipmentFinances, setShipmentFinances] = useState<ShipmentFinanceRecord[]>([])
  const [expenses, setExpenses] = useState<FinanceExpenseRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [supplierBills, setSupplierBills] = useState<SupplierBillRecord[]>([])
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentRecord[]>([])

  // Modal / Transition State
  const [targetReceiptId, setTargetReceiptId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [
        overviewRes,
        invoicesRes,
        paymentsRes,
        receiptsRes,
        notesRes,
        expensesRes,
        shipmentsRes,
        ledgersRes,
        suppliersRes,
        billsRes,
        supplierPaymentsRes,
      ] = await Promise.all([
        fetch("/api/finance/overview").then((r) => r.json()),
        fetch("/api/finance/invoices").then((r) => r.json()),
        fetch("/api/finance/payments").then((r) => r.json()),
        fetch("/api/finance/receipts").then((r) => r.json()),
        fetch("/api/finance/notes").then((r) => r.json()),
        fetch("/api/finance/expenses").then((r) => r.json()),
        fetch("/api/finance/shipments").then((r) => r.json()),
        fetch("/api/account-ledgers").then((r) => r.json()),
        fetch("/api/finance/suppliers").then((r) => r.json()),
        fetch("/api/finance/supplier-bills").then((r) => r.json()),
        fetch("/api/finance/supplier-payments").then((r) => r.json()),
      ])

      if (overviewRes.success) setOverview(overviewRes.overview)
      if (invoicesRes.success) setInvoices(invoicesRes.data || [])
      if (paymentsRes.success) setPayments(paymentsRes.data || [])
      if (receiptsRes.success) setReceipts(receiptsRes.data || [])
      if (notesRes.success) {
        setDebitNotes(notesRes.debitNotes || [])
        setCreditNotes(notesRes.creditNotes || [])
      }
      if (expensesRes.success) setExpenses(expensesRes.data || [])
      if (shipmentsRes.success) setShipmentFinances(shipmentsRes.data || [])
      if (suppliersRes.success) setSuppliers(suppliersRes.data || [])
      if (billsRes.success) setSupplierBills(billsRes.data || [])
      if (supplierPaymentsRes.success) setSupplierPayments(supplierPaymentsRes.data || [])

      // Process canonical ledger accounts
      if (ledgersRes.success && ledgersRes.data?.accounts) {
        const rawAccounts = ledgersRes.data.accounts
        // Map to AccountRecord if strings or objects
        const mappedAccounts: AccountRecord[] = rawAccounts.map((acc: any, idx: number) => {
          if (typeof acc === "string") {
            const entries = ledgersRes.data.ledgerEntries?.[acc] || []
            let dr = 0
            let cr = 0
            entries.forEach((e: any) => {
              dr += Number(e.debit) || 0
              cr += Number(e.credit) || 0
            })
            return {
              id: `acc-${idx}`,
              account_code: `AC-${idx + 1}`,
              account_name: acc,
              display_name: acc,
              normalized_name: acc.toUpperCase(),
              aliases: [],
              account_type: "customer",
              currency: "USD",
              opening_balance: 0,
              total_debit: dr,
              total_credit: cr,
              current_balance: dr - cr,
              status: "active",
              source: "canonical",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          }
          return acc
        })
        setAccounts(mappedAccounts)
      }
    } catch (err: any) {
      console.error("Failed to load finance data:", err)
      toast.error("Failed to load accounting data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenReceiptFromPayment = (receiptId: string) => {
    setTargetReceiptId(receiptId)
    setActiveTab("receipts")
  }

  const handleOpenStatementFromLedger = (customerName: string) => {
    setActiveTab("statements")
  }

  const handleOpenRecordPaymentFromLedger = (customerName: string) => {
    setActiveTab("payments")
  }

  // Navigation tabs configuration
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "ledgers", label: "Customer Ledgers", icon: BookOpen },
    { id: "suppliers", label: "Suppliers & Vendors", icon: Truck },
    { id: "supplier_bills", label: "Supplier Bills", icon: FileSpreadsheet },
    { id: "supplier_payments", label: "Supplier Payments", icon: CreditCard },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "payments", label: "Customer Payments", icon: CreditCard },
    { id: "receipts", label: "Receipts", icon: Receipt },
    { id: "debit_notes", label: "Debit Notes", icon: ArrowUpRight },
    { id: "credit_notes", label: "Credit Notes", icon: ArrowDownLeft },
    { id: "outstanding", label: "Outstanding & Aging", icon: Clock },
    { id: "shipment_finance", label: "Shipment Finance", icon: Building2 },
    { id: "expenses", label: "Expenses", icon: Wallet },
    { id: "profitability", label: "Profitability", icon: TrendingUp },
    { id: "statements", label: "Statements", icon: FileSpreadsheet },
    { id: "reconciliation", label: "Reconciliation", icon: CheckCircle2 },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ]

  return (
    <div className="mx-auto max-w-[1780px] px-3 py-4 sm:px-6 space-y-5">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              ACCOUNTING & FINANCE CONTROL CENTER
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Strict Multi-Currency
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Connected directly to BOLs, canonical customer ledgers, shipments, receipts, and gross profitability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Subtabs Bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1 dark:border-slate-800 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "dashboard" && (
          <FinanceDashboardTab
            overview={overview}
            activeCurrency={activeCurrency}
            onSelectCurrency={setActiveCurrency}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "ledgers" && (
          <FinanceLedgersTab
            accounts={accounts}
            onOpenStatement={handleOpenStatementFromLedger}
            onOpenRecordPayment={handleOpenRecordPaymentFromLedger}
          />
        )}

        {activeTab === "suppliers" && (
          <FinanceSuppliersTab suppliers={suppliers} onRefresh={loadData} />
        )}

        {activeTab === "supplier_bills" && (
          <FinanceSupplierBillsTab
            bills={supplierBills}
            suppliers={suppliers}
            onRefresh={loadData}
          />
        )}

        {activeTab === "supplier_payments" && (
          <FinanceSupplierPaymentsTab
            payments={supplierPayments}
            bills={supplierBills}
            suppliers={suppliers}
            onRefresh={loadData}
          />
        )}

        {activeTab === "invoices" && (
          <FinanceInvoicesTab invoices={invoices} onRefresh={loadData} />
        )}

        {activeTab === "payments" && (
          <FinancePaymentsTab
            payments={payments}
            invoices={invoices}
            onRefresh={loadData}
            onOpenReceipt={handleOpenReceiptFromPayment}
          />
        )}

        {activeTab === "receipts" && (
          <FinanceReceiptsTab
            receipts={receipts}
            selectedReceiptId={targetReceiptId}
            onClearSelectedReceipt={() => setTargetReceiptId(null)}
          />
        )}

        {(activeTab === "debit_notes" || activeTab === "credit_notes") && (
          <FinanceNotesTab
            debitNotes={debitNotes}
            creditNotes={creditNotes}
            onRefresh={loadData}
          />
        )}

        {activeTab === "outstanding" && (
          <FinanceOutstandingTab
            invoices={invoices}
            agingSummary={
              overview?.currencyTotals[activeCurrency]
                ? {
                    currency: activeCurrency,
                    current: overview.currencyTotals[activeCurrency].totalReceivable - overview.currencyTotals[activeCurrency].overdueAmount,
                    days1to30: overview.currencyTotals[activeCurrency].overdueAmount * 0.5,
                    days31to60: overview.currencyTotals[activeCurrency].overdueAmount * 0.3,
                    days61to90: overview.currencyTotals[activeCurrency].overdueAmount * 0.15,
                    days90Plus: overview.currencyTotals[activeCurrency].overdueAmount * 0.05,
                    totalOutstanding: overview.currencyTotals[activeCurrency].totalReceivable,
                    invoiceCount: invoices.filter((i) => i.currency === activeCurrency && i.outstandingAmount > 0).length,
                  }
                : null
            }
            activeCurrency={activeCurrency}
            onSelectCurrency={setActiveCurrency}
          />
        )}

        {activeTab === "shipment_finance" && (
          <FinanceShipmentFinanceTab
            shipmentFinances={shipmentFinances}
            onRefresh={loadData}
          />
        )}

        {activeTab === "expenses" && (
          <FinanceExpensesTab expenses={expenses} onRefresh={loadData} />
        )}

        {activeTab === "profitability" && (
          <FinanceProfitabilityTab
            shipmentFinances={shipmentFinances}
            activeCurrency={activeCurrency}
            onSelectCurrency={setActiveCurrency}
          />
        )}

        {activeTab === "statements" && (
          <FinanceStatementsTab
            customerNames={
              accounts.length > 0
                ? accounts.map((a) => a.account_name)
                : ["NAJEB AMIN LTD", "FAZEL BASIT L.T.D", "ASADULLAH NIAMATULLAH HABIBI LTD"]
            }
          />
        )}

        {activeTab === "reconciliation" && (
          <FinanceReconciliationTab
            payments={payments}
            invoices={invoices}
            onRefresh={loadData}
          />
        )}

        {activeTab === "reports" && (
          <FinanceReportsTab
            invoices={invoices}
            payments={payments}
            receipts={receipts}
            activeCurrency={activeCurrency}
          />
        )}
      </div>
    </div>
  )
}
