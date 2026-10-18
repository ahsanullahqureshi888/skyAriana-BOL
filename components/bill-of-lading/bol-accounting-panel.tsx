"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Landmark,
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Send,
  Printer,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/lib/app-context"
import {
  BolAccountingRecord,
  BolChargeRecord,
  PaymentAllocationRecord,
  PaymentReceiptRecord,
  DEFAULT_CHARGE_TYPES,
  PaymentTerms,
  ChargeType,
} from "@/lib/types/bol-accounting"
import { AccountRecord, LedgerTransactionRecord, PaymentRecord } from "@/lib/types/ledger-system"
import { PrintableInvoiceModal } from "@/components/invoice/printable-invoice-modal"
import { PrintableReceiptModal } from "@/components/finance/printable-receipt-modal"
import { calculateFinancialTotals, roundMoney } from "@/lib/accounting/money"

interface BolAccountingPanelProps {
  bolNumber: string
  bolId?: string
  formData?: any
  onAccountingUpdate?: (accounting: BolAccountingRecord) => void
}

export function BolAccountingPanel({
  bolNumber,
  bolId,
  formData,
  onAccountingUpdate,
}: BolAccountingPanelProps) {
  const { setView } = useApp()
  const effectiveBolId = bolId || bolNumber || "NEW-BOL"

  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])

  // Accounting state
  const [accounting, setAccounting] = useState<BolAccountingRecord | null>(null)
  const [charges, setCharges] = useState<BolChargeRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [receipts, setReceipts] = useState<PaymentReceiptRecord[]>([])
  const [invoice, setInvoice] = useState<any | null>(null)

  // Bill-To Form
  const [billToPartyType, setBillToPartyType] = useState<string>("shipper")
  const [billToCompanyName, setBillToCompanyName] = useState<string>("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [currency, setCurrency] = useState<string>("USD")
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("30 Days")
  const [creditDays, setCreditDays] = useState<number>(30)
  const [billingContact, setBillingContact] = useState<string>("")
  const [billingNotes, setBillingNotes] = useState<string>("")

  // Modals
  const [showPostConfirm, setShowPostConfirm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceiptRecord | null>(null)

  // Payment Form
  const [payAmount, setPayAmount] = useState<string>("")
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [payMethod, setPayMethod] = useState<string>("Bank")
  const [payRef, setPayRef] = useState<string>("")
  const [payNotes, setPayNotes] = useState<string>("")
  const [isSubmittingPay, setIsSubmittingPay] = useState(false)

  // Adjustment Form
  const [adjNewTotal, setAdjNewTotal] = useState<string>("")
  const [adjReason, setAdjReason] = useState<string>("")
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false)

  // Void Form
  const [voidReason, setVoidReason] = useState<string>("")
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false)

  // Fetch Accounts and BOL Accounting Data
  const fetchData = async () => {
    if (!effectiveBolId || effectiveBolId === "NEW-BOL") return
    try {
      setLoading(true)
      const [accRes, bolRes] = await Promise.all([
        fetch("/api/accounting/ledgers"),
        fetch(`/api/accounting/bol/${encodeURIComponent(effectiveBolId)}`),
      ])

      const accData = await accRes.json()
      if (accData.success) {
        setAccounts(accData.accounts || [])
      }

      const bolData = await bolRes.json()
      if (bolData.success) {
        if (bolData.accounting) {
          setAccounting(bolData.accounting)
          setBillToPartyType(bolData.accounting.bill_to_party_type)
          setBillToCompanyName(bolData.accounting.bill_to_company_name)
          setSelectedAccountId(bolData.accounting.account_id)
          setCurrency(bolData.accounting.currency || "USD")
          setPaymentTerms(bolData.accounting.payment_terms || "30 Days")
          setCreditDays(bolData.accounting.credit_days || 30)
          setBillingContact(bolData.accounting.billing_contact || "")
          setBillingNotes(bolData.accounting.billing_notes || "")
        }
        setCharges(bolData.charges || [])
        setPayments(bolData.payments || [])
        setReceipts(bolData.receipts || [])
        setInvoice(bolData.invoice || null)
      }
    } catch (err) {
      console.error("[BolAccountingPanel] fetchData error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [effectiveBolId])

  // Sync initial party defaults from formData if accounting is new
  useEffect(() => {
    if (!accounting && formData) {
      if (billToPartyType === "shipper" && formData.shipper_name) {
        setBillToCompanyName(formData.shipper_name)
      } else if (billToPartyType === "consignee" && formData.consignee_name) {
        setBillToCompanyName(formData.consignee_name)
      } else if (billToPartyType === "notify_party" && formData.notify_party) {
        setBillToCompanyName(formData.notify_party)
      }
    }
  }, [formData, billToPartyType, accounting])

  // Automatically attempt to match or find account when bill-to party changes
  useEffect(() => {
    if (billToCompanyName && accounts.length > 0 && !selectedAccountId) {
      const match = accounts.find(
        (a) =>
          a.account_name.toLowerCase() === billToCompanyName.toLowerCase() ||
          (a.aliases && a.aliases.some((al) => al.toLowerCase() === billToCompanyName.toLowerCase()))
      )
      if (match) {
        setSelectedAccountId(match.id)
      }
    }
  }, [billToCompanyName, accounts, selectedAccountId])

  // Computed Totals
  const totals = useMemo(() => {
    return calculateFinancialTotals(charges)
  }, [charges])

  // Selected Account details & credit warnings
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null
  }, [accounts, selectedAccountId])

  const isCustomerOverCredit = useMemo(() => {
    if (!selectedAccount) return false
    // Standard threshold: warning if balance > 50,000 or credit limit
    return selectedAccount.current_balance > 50000
  }, [selectedAccount])

  // Handle Bill-To Party Preset Selection
  const handleSelectPartyPreset = (party: string) => {
    setBillToPartyType(party)
    let partyName = ""
    if (party === "shipper") partyName = formData?.shipper_name || ""
    else if (party === "consignee") partyName = formData?.consignee_name || ""
    else if (party === "notify_party") partyName = formData?.notify_party || ""

    if (partyName) {
      setBillToCompanyName(partyName)
      const matched = accounts.find(
        (a) =>
          a.account_name.toLowerCase() === partyName.toLowerCase() ||
          (a.aliases && a.aliases.some((al) => al.toLowerCase() === partyName.toLowerCase()))
      )
      if (matched) {
        setSelectedAccountId(matched.id)
      }
    }
  }

  // Add Charge Line
  const handleAddChargeLine = (type: ChargeType = "Ocean Freight") => {
    const newCharge: BolChargeRecord = {
      id: `NEW-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      bol_id: effectiveBolId,
      charge_type: type,
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      currency: currency || "USD",
      tax: 0,
      discount: 0,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setCharges([...charges, newCharge])
  }

  // Update Charge Line
  const handleUpdateCharge = (id: string, field: keyof BolChargeRecord, value: any) => {
    setCharges(
      charges.map((c) => {
        if (c.id !== id) return c
        const updated = { ...c, [field]: value }
        if (field === "quantity" || field === "rate") {
          const q = field === "quantity" ? Number(value) : c.quantity
          const r = field === "rate" ? Number(value) : c.rate
          updated.amount = roundMoney((Number(q) || 0) * (Number(r) || 0))
        }
        return updated
      })
    )
  }

  // Remove Charge Line
  const handleRemoveCharge = (id: string) => {
    setCharges(charges.filter((c) => c.id !== id))
  }

  // Save Accounting Draft
  const handleSaveDraft = async () => {
    if (!selectedAccountId) {
      toast.error("Please select a valid Ledger Account before saving accounting.")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/accounting/bol/${encodeURIComponent(effectiveBolId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bolNumber: bolNumber || effectiveBolId,
          billToPartyType,
          billToCompanyName: billToCompanyName || selectedAccount?.account_name || "Customer",
          accountId: selectedAccountId,
          currency,
          paymentTerms,
          creditDays,
          billingContact,
          billingNotes,
          charges,
          metadata: {
            shipper: formData?.shipper_name,
            consignee: formData?.consignee_name,
            origin: formData?.origin,
            destination: formData?.final_destination || formData?.place_of_delivery,
            containerNo: formData?.container_numbers,
            truckNo: formData?.truck_number,
            vesselVoyage: formData?.vessel_name ? `${formData.vessel_name} / ${formData.voyage_number || ""}` : undefined,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setAccounting(data.accounting)
        setCharges(data.charges || [])
        toast.success("BOL accounting draft saved successfully.")
        if (onAccountingUpdate) onAccountingUpdate(data.accounting)
      } else {
        toast.error(data.error || "Failed to save accounting")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save accounting")
    } finally {
      setLoading(false)
    }
  }

  // Post to Ledger
  const handlePostToLedger = async () => {
    try {
      setLoading(true)
      // Save latest state first
      await handleSaveDraft()

      const res = await fetch(`/api/accounting/bol/${encodeURIComponent(effectiveBolId)}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "Operator" }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Posted to ledger successfully!")
        setShowPostConfirm(false)
        await fetchData()
      } else if (data.code === "ALREADY_POSTED") {
        toast.warning(data.message)
        setShowPostConfirm(false)
      } else {
        toast.error(data.message || data.error || "Posting failed")
      }
    } catch (err: any) {
      toast.error(err.message || "Error posting to ledger")
    } finally {
      setLoading(false)
    }
  }

  // Record Payment
  const handleRecordPayment = async () => {
    const amountNum = Number(payAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }

    try {
      setIsSubmittingPay(true)
      const res = await fetch(`/api/accounting/bol/${encodeURIComponent(effectiveBolId)}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          date: payDate,
          currency,
          paymentMethod: payMethod,
          reference: payRef,
          notes: payNotes,
          user: "Operator",
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Payment recorded successfully!")
        setShowPaymentModal(false)
        setPayAmount("")
        setPayRef("")
        setPayNotes("")
        if (data.receipt) {
          setSelectedReceipt(data.receipt)
        }
        await fetchData()
      } else {
        toast.error(data.error || "Payment recording failed")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment")
    } finally {
      setIsSubmittingPay(false)
    }
  }

  // Create Adjustment
  const handleCreateAdjustment = async () => {
    const targetTotal = Number(adjNewTotal)
    if (isNaN(targetTotal) || targetTotal < 0) {
      toast.error("Please enter a valid adjusted total")
      return
    }

    try {
      setIsSubmittingAdj(true)
      const res = await fetch(`/api/accounting/bol/${encodeURIComponent(effectiveBolId)}/adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newTotal: targetTotal,
          reason: adjReason,
          user: "Operator",
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Adjustment recorded!")
        setShowAdjustmentModal(false)
        await fetchData()
      } else {
        toast.error(data.message || data.error || "Adjustment failed")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create adjustment")
    } finally {
      setIsSubmittingAdj(false)
    }
  }

  // Void Posting
  const handleVoidPosting = async () => {
    try {
      setIsSubmittingVoid(true)
      const res = await fetch(`/api/accounting/bol/${encodeURIComponent(effectiveBolId)}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: voidReason,
          user: "Operator",
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Posting successfully reversed!")
        setShowVoidModal(false)
        await fetchData()
      } else {
        toast.error(data.message || data.error || "Void failed")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reverse posting")
    } finally {
      setIsSubmittingVoid(false)
    }
  }

  // Copy WhatsApp Billing Snippet
  const handleCopyWhatsAppBilling = () => {
    const billTo = accounting?.bill_to_company_name || selectedAccount?.account_name || "Customer"
    const invNo = accounting?.invoice_number || "Draft"
    const totalStr = `${totals.grandTotal.toLocaleString()} ${currency}`
    const paidStr = `${(accounting?.amount_paid || 0).toLocaleString()} ${currency}`
    const dueStr = `${(accounting?.outstanding_balance || totals.grandTotal).toLocaleString()} ${currency}`
    const statusStr = accounting?.payment_status || "UNPAID"

    const message = `*SKY ARIANA LIMITED — SHIPMENT BILLING UPDATE*
━━━━━━━━━━━━━━━━━━━━
*Customer:* ${billTo}
*BOL Number:* ${bolNumber || "—"}
*Invoice:* ${invNo}
*Total Charges:* ${totalStr}
*Paid Amount:* ${paidStr}
*Balance Due:* ${dueStr}
*Payment Status:* ${statusStr}
━━━━━━━━━━━━━━━━━━━━
_Please arrange settlement of the outstanding balance. Thank you for choosing Sky Ariana._`

    navigator.clipboard.writeText(message)
    toast.success("WhatsApp billing update copied to clipboard!")
  }

  const isPosted = accounting?.accounting_status === "POSTED" || accounting?.accounting_status === "PAID" || accounting?.accounting_status === "PARTIALLY_PAID"

  return (
    <Card className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden my-6">
      {/* Header Bar */}
      <CardHeader className="py-3.5 px-6 border-b border-slate-200/60 bg-slate-50/70 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              Accounting & Invoice Integration
              {accounting?.accounting_status && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    accounting.accounting_status === "POSTED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : accounting.accounting_status === "PAID"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : accounting.accounting_status === "VOID"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  {accounting.accounting_status}
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-slate-500">
              Bill-to party, freight charges, invoice issuing, and customer ledger debits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {accounting?.invoice_number && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvoiceModal(true)}
              className="h-8 text-xs gap-1.5 border-slate-300"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              Invoice {accounting.invoice_number}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyWhatsAppBilling}
            className="h-8 text-xs gap-1.5 border-slate-300"
          >
            <Copy className="h-3.5 w-3.5 text-emerald-600" />
            WhatsApp
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0 text-slate-500"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-6 space-y-6">
          {/* Customer Overdue / Credit Alert Banner */}
          {isCustomerOverCredit && (
            <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Accounting Alert:</span> Customer{" "}
                  <strong>{selectedAccount?.account_name}</strong> has a high outstanding balance of{" "}
                  <strong>
                    {selectedAccount?.current_balance.toLocaleString()} {selectedAccount?.currency}
                  </strong>
                  .
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("accounting")}
                className="h-7 text-xs bg-white text-amber-900 border-amber-300"
              >
                Inspect Ledger
              </Button>
            </div>
          )}

          {/* Section 1: Bill-To Party & Ledger Account Selection */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Bill-To Customer / Paying Party
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Preset:</span>
                <Button
                  type="button"
                  size="sm"
                  variant={billToPartyType === "shipper" ? "default" : "outline"}
                  onClick={() => handleSelectPartyPreset("shipper")}
                  className="h-6 text-[11px] px-2"
                >
                  Shipper
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={billToPartyType === "consignee" ? "default" : "outline"}
                  onClick={() => handleSelectPartyPreset("consignee")}
                  className="h-6 text-[11px] px-2"
                >
                  Consignee
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={billToPartyType === "notify_party" ? "default" : "outline"}
                  onClick={() => handleSelectPartyPreset("notify_party")}
                  className="h-6 text-[11px] px-2"
                >
                  Notify Party
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={billToPartyType === "custom" ? "default" : "outline"}
                  onClick={() => handleSelectPartyPreset("custom")}
                  className="h-6 text-[11px] px-2"
                >
                  Custom
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Bill-To Company Name
                </label>
                <Input
                  value={billToCompanyName}
                  onChange={(e) => setBillToCompanyName(e.target.value)}
                  placeholder="e.g., NAJEB AMIN LTD"
                  className="bg-white h-9 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Linked Ledger Account
                </label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Select customer ledger account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.account_name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="bg-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="AFN">AFN (؋)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Payment Terms</label>
                  <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as PaymentTerms)}>
                    <SelectTrigger className="bg-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due Immediately">Due Immediately</SelectItem>
                      <SelectItem value="7 Days">7 Days</SelectItem>
                      <SelectItem value="15 Days">15 Days</SelectItem>
                      <SelectItem value="30 Days">30 Days</SelectItem>
                      <SelectItem value="45 Days">45 Days</SelectItem>
                      <SelectItem value="60 Days">60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Itemized Freight & Service Charges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Freight & Service Charges
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddChargeLine("Ocean Freight")}
                  className="h-7 text-xs gap-1 text-blue-700 bg-blue-50/50 border-blue-200"
                >
                  <Plus className="h-3 w-3" /> Add Freight
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddChargeLine("Documentation Fee")}
                  className="h-7 text-xs gap-1 text-slate-700 bg-white"
                >
                  <Plus className="h-3 w-3" /> Add Docs Fee
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddChargeLine("Customs Service")}
                  className="h-7 text-xs gap-1 text-slate-700 bg-white"
                >
                  <Plus className="h-3 w-3" /> Add Customs
                </Button>
              </div>
            </div>

            {charges.length === 0 ? (
              <div className="p-6 border border-dashed rounded-xl text-center bg-slate-50/40 text-slate-400 text-xs">
                No charges added to this BOL yet. Click "Add Freight" above to start.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 border-b">
                    <tr>
                      <th className="py-2 px-3 w-40">Charge Type</th>
                      <th className="py-2 px-3">Description / Route Leg</th>
                      <th className="py-2 px-3 w-20 text-right">Qty</th>
                      <th className="py-2 px-3 w-28 text-right">Rate ({currency})</th>
                      <th className="py-2 px-3 w-28 text-right font-bold">Amount</th>
                      <th className="py-2 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {charges.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <Select
                            value={c.charge_type}
                            onValueChange={(v) => handleUpdateCharge(c.id, "charge_type", v)}
                            disabled={isPosted}
                          >
                            <SelectTrigger className="h-7 text-xs bg-slate-50 border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 text-xs">
                              {DEFAULT_CHARGE_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            value={c.description}
                            onChange={(e) => handleUpdateCharge(c.id, "description", e.target.value)}
                            placeholder="Optional notes or leg"
                            disabled={isPosted}
                            className="h-7 text-xs bg-slate-50 border-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={c.quantity}
                            onChange={(e) => handleUpdateCharge(c.id, "quantity", e.target.value)}
                            disabled={isPosted}
                            className="h-7 text-xs text-right bg-slate-50 border-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={c.rate}
                            onChange={(e) => handleUpdateCharge(c.id, "rate", e.target.value)}
                            disabled={isPosted}
                            className="h-7 text-xs text-right bg-slate-50 border-slate-200 font-mono"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-800">
                          {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          {!isPosted && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCharge(c.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Totals & Summary Bar */}
            <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-md gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Total Charges
                  </span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {totals.grandTotal.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="border-l border-slate-700 pl-6">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Paid
                  </span>
                  <span className="text-xl font-bold font-mono text-blue-400">
                    {(accounting?.amount_paid || 0).toLocaleString()} {currency}
                  </span>
                </div>
                <div className="border-l border-slate-700 pl-6">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Outstanding
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-300">
                    {(accounting ? accounting.outstanding_balance : totals.grandTotal).toLocaleString()}{" "}
                    {currency}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isPosted ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      disabled={loading}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 text-xs"
                    >
                      Save Accounting Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowPostConfirm(true)}
                      disabled={loading || totals.grandTotal <= 0}
                      className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold h-9 text-xs shadow-md shadow-emerald-600/30 gap-1.5"
                    >
                      <Landmark className="h-4 w-4" />
                      Post to Ledger
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowPaymentModal(true)}
                      disabled={loading || (accounting?.outstanding_balance || 0) <= 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 text-xs gap-1.5 shadow-sm"
                    >
                      <DollarSign className="h-4 w-4" />
                      Record Payment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdjNewTotal(String(totals.grandTotal))
                        setShowAdjustmentModal(true)
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 text-xs gap-1"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Create Adjustment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVoidModal(true)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 h-9 text-xs gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Void / Reversal
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Payment History (if any) */}
          {payments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>3. Payment History</span>
                <span className="font-normal text-slate-400 text-[11px]">
                  {payments.length} payment(s) recorded
                </span>
              </label>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3 text-right">Amount Paid</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {payments.map((p) => {
                      const rcpt = receipts.find((r) => r.payment_id === p.id)
                      return (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-medium text-slate-800">{p.payment_date}</td>
                          <td className="py-2 px-3 text-slate-600">{p.payment_method}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{p.reference || "—"}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            {p.amount.toLocaleString()} {p.currency}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {rcpt && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReceipt(rcpt)}
                                className="h-6 text-[10px] px-2 gap-1 border-slate-200"
                              >
                                <Printer className="h-3 w-3 text-blue-600" />
                                Receipt {rcpt.receipt_number}
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
          )}
        </CardContent>
      )}

      {/* Confirmation Modal for Posting to Ledger */}
      <Dialog open={showPostConfirm} onOpenChange={setShowPostConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-600" />
              Confirm Ledger Posting
            </DialogTitle>
            <DialogDescription className="text-xs">
              Posting will generate an official invoice debit in the customer's account ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5 my-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Account:</span>
              <span className="font-bold text-slate-900">{selectedAccount?.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">BOL Reference:</span>
              <span className="font-mono text-slate-800">{bolNumber || effectiveBolId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Currency:</span>
              <span className="font-bold text-slate-800">{currency}</span>
            </div>
            <div className="border-t pt-2 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase font-bold">Charges Breakdown:</span>
              {charges.map((c) => (
                <div key={c.id} className="flex justify-between text-slate-600">
                  <span>{c.charge_type}:</span>
                  <span className="font-mono">{c.amount.toLocaleString()} {currency}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Debit Effect:</span>
              <span className="font-mono text-emerald-700">
                +{totals.grandTotal.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowPostConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePostToLedger}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm & Post to Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Record Customer Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Records payment against BOL {bolNumber}, creates a ledger credit, and issues a payment receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Amount ({currency})</label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(accounting?.outstanding_balance || totals.grandTotal)}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Payment Date</label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Payment Method</label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank">Bank Wire / Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Exchange">Exchange Company (Sarrafi)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Reference / Cheque No</label>
                <Input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g., TX-90214"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Notes / Remarks</label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Optional payment notes"
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRecordPayment}
              disabled={isSubmittingPay}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSubmittingPay ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Submit Payment & Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Modal */}
      <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              Create Post-Posting Adjustment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Creates an adjustment transaction (Debit or Credit) without altering historical records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Current Posted Total:</span>
                <span className="font-bold text-slate-800">
                  {accounting?.total_charges.toLocaleString()} {currency}
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">New Total Amount ({currency})</label>
              <Input
                type="number"
                value={adjNewTotal}
                onChange={(e) => setAdjNewTotal(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Adjustment Reason</label>
              <Input
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g., Demurrage fee added or rate discount agreed"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowAdjustmentModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateAdjustment}
              disabled={isSubmittingAdj}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isSubmittingAdj ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Modal */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <RotateCcw className="h-5 w-5" />
              Confirm Reversal / Void
            </DialogTitle>
            <DialogDescription className="text-xs">
              Creates a balancing credit reversal entry equal to the original debit, preserving full audit history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Reason for Reversal</label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Shipment cancelled by shipper"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowVoidModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleVoidPosting}
              disabled={isSubmittingVoid}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isSubmittingVoid ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reverse Posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Invoice Modal */}
      {invoice && (
        <PrintableInvoiceModal
          open={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          invoice={invoice}
          bolData={formData}
        />
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <PrintableReceiptModal
          open={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          receipt={selectedReceipt}
        />
      )}
    </Card>
  )
}
