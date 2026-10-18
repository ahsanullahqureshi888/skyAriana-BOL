/**
 * Sky Ariana Logistics — Comprehensive Finance & Accounting Types
 * Multi-Currency Segregation, Multi-BOL Invoicing, Receipts, Debit/Credit Notes,
 * Shipment Gross Profitability, and Aging Analysis.
 */

export type FinanceInvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"

export interface FinanceInvoiceItem {
  id: string
  description: string
  chargeType:
    | "freight"
    | "truck"
    | "shipping_line"
    | "port"
    | "customs"
    | "documentation"
    | "container"
    | "handling"
    | "demurrage"
    | "detention"
    | "other"
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  currency: string
  bolNumber?: string
  containerNumber?: string
}

export interface FinanceInvoiceRecord {
  id: string
  invoiceNumber: string // e.g. "SA-INV-2026-0001"
  issueDate: string
  dueDate: string
  paymentTerms: string // e.g. "Net 15 Days", "Due on Receipt"
  customerId: string
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  customerTaxId?: string
  bolNumbers: string[] // Supports multiple BOLs per invoice
  items: FinanceInvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  totalAmount: number
  currency: string
  paidAmount: number
  outstandingAmount: number
  status: FinanceInvoiceStatus
  notes?: string
  terms?: string
  postedToLedger: boolean
  postedLedgerTxId?: string
  postedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PaymentAllocation {
  invoiceId: string
  invoiceNumber: string
  allocatedAmount: number
}

export interface FinancePaymentRecord {
  id: string
  paymentNumber: string // e.g. "SA-PAY-2026-0001"
  customerId: string
  customerName: string
  paymentDate: string
  amount: number
  currency: string
  paymentMethod: "Cash" | "Bank Transfer" | "Exchange" | "Cheque" | "Other"
  bankAccountName?: string
  referenceNumber: string
  notes?: string
  receiptId?: string
  receiptNumber?: string
  allocations: PaymentAllocation[]
  unallocatedCredit: number // Overpayment retained as customer credit
  postedToLedger: boolean
  postedLedgerTxId?: string
  createdAt: string
  updatedAt: string
}

export interface FinanceReceiptRecord {
  id: string
  receiptNumber: string // e.g. "SA-RCP-2026-0001"
  receiptDate: string
  customerId: string
  customerName: string
  receivedFrom: string
  amount: number
  currency: string
  amountInWords: string
  paymentMethod: string
  referenceNumber: string
  appliedInvoices: string[]
  customerBalanceAfter?: number
  authorizedBy: string
  notes?: string
  createdAt: string
}

export interface FinanceDebitNote {
  id: string
  noteNumber: string // e.g. "SA-DN-2026-0001"
  date: string
  customerId: string
  customerName: string
  bolNumber?: string
  invoiceNumber?: string
  reason: string
  amount: number
  currency: string
  status: "draft" | "posted" | "cancelled"
  postedToLedger: boolean
  postedLedgerTxId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FinanceCreditNote {
  id: string
  noteNumber: string // e.g. "SA-CN-2026-0001"
  date: string
  customerId: string
  customerName: string
  bolNumber?: string
  invoiceNumber?: string
  reason: string
  amount: number
  currency: string
  status: "draft" | "posted" | "cancelled"
  postedToLedger: boolean
  postedLedgerTxId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ShipmentChargeItem {
  id: string
  chargeType:
    | "freight"
    | "truck"
    | "shipping_line"
    | "port"
    | "customs"
    | "documentation"
    | "container"
    | "handling"
    | "other"
  description: string
  amount: number
  currency: string
  isPayable: boolean
  payableTo?: string
  isReceivable: boolean
  receivableFrom?: string
  date: string
  reference?: string
}

export interface DirectCostsBreakdown {
  truck: number
  shippingLine: number
  port: number
  customs: number
  documentation: number
  container: number
  handling: number
  other: number
}

export interface ShipmentFinanceRecord {
  shipmentId: string
  bolNumber: string
  customerName: string
  currency: string
  freightRevenue: number // Service revenue (NOT goods commodity value!)
  directCosts: DirectCostsBreakdown
  totalDirectCosts: number
  grossProfit: number // Revenue - Total Direct Costs
  grossMarginPercent: number
  invoiceAmount: number
  paidAmount: number
  outstandingAmount: number
  paymentStatus: "unpaid" | "partially_paid" | "paid"
  charges: ShipmentChargeItem[]
  financiallyClosed: boolean
  financiallyClosedAt?: string
  updatedAt: string
}

export interface FinanceExpenseRecord {
  id: string
  date: string
  category:
    | "Truck"
    | "Shipping Line"
    | "Port"
    | "Customs"
    | "Documentation"
    | "Loading"
    | "Unloading"
    | "Warehouse"
    | "Handling"
    | "Office"
    | "Other"
  bolNumber?: string
  shipmentId?: string
  paidTo: string
  description: string
  amount: number
  currency: string
  paymentMethod: string
  reference: string
  attachmentUrl?: string
  createdAt: string
}

export interface AgingBucketSummary {
  currency: string
  current: number // Not due yet
  days1to30: number
  days31to60: number
  days61to90: number
  days90Plus: number
  totalOutstanding: number
  invoiceCount: number
}

export interface CustomerOutstandingSummary {
  customerId: string
  customerName: string
  balancesByCurrency: Record<string, { totalDebit: number; totalCredit: number; currentBalance: number }>
  overdueCount: number
  oldestDueDate?: string
}

export interface DatedExchangeRate {
  id: string
  effectiveDate: string
  fromCurrency: string
  toCurrency: string
  rate: number
  sourceOrNote?: string
  createdAt: string
}

export interface CurrencyTotalSummary {
  currency: string
  totalReceivable: number
  totalPayable: number
  netBalance: number
  overdueAmount: number
  todayReceived: number
  todayPaid: number
}

export interface FinanceOverviewKPIs {
  currencyTotals: Record<string, CurrencyTotalSummary>
  unpaidInvoiceCount: number
  partiallyPaidInvoiceCount: number
  paidInvoiceCount: number
  overdueInvoiceCount: number
  openShipmentFinanceCount: number
  unmatchedPaymentCount: number
}

export interface CustomerStatementParams {
  customerIdOrName: string
  currency?: string
  startDate?: string
  endDate?: string
}

export interface CustomerStatementResult {
  customerName: string
  currency: string
  period: string
  openingBalance: number
  transactions: Array<{
    date: string
    reference: string
    type: string
    description: string
    bolNumber?: string
    invoiceNumber?: string
    debit: number
    credit: number
    runningBalance: number
  }>
  totalDebit: number
  totalCredit: number
  closingBalance: number
  invarianceSatisfied: boolean
}

// ====================================================
// SUPPLIER & SHIPMENT COST TYPES (PHASE 8)
// ====================================================

export type SupplierCategory =
  | "Shipping Line"
  | "Trucking Company"
  | "Transporter"
  | "Customs Agent"
  | "Port Agent"
  | "Freight Forwarder"
  | "Terminal"
  | "Warehouse"
  | "Loading Company"
  | "Unloading Company"
  | "Inspection Company"
  | "Document Agent"
  | "Exchange / Finance Agent"
  | "Other Supplier"

export interface SupplierProfile {
  id: string
  supplierNumber: string // e.g. "SA-SUP-0001"
  name: string
  category: SupplierCategory
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  currency: string // Default currency (e.g. "USD", "AED")
  taxId?: string
  bankDetails?: string
  notes?: string
  isActive: boolean
  roles: ("supplier" | "customer")[] // Dual-role capability without profile duplication
  openingPayable: number
  totalBills: number
  totalPaid: number
  outstandingPayable: number
  advancePaid: number // Unallocated overpayment
  createdAt: string
  updatedAt: string
}

export type CostCategory =
  | "Ocean Freight Cost"
  | "Road Freight Cost"
  | "Reefer Cost"
  | "Container Cost"
  | "Shipping Line Charges"
  | "Port Charges"
  | "Terminal Charges"
  | "Documentation Cost"
  | "BOL Fee"
  | "Customs Cost"
  | "Transit Cost"
  | "Agent Fee"
  | "Loading Cost"
  | "Unloading Cost"
  | "Inspection Cost"
  | "Demurrage"
  | "Detention"
  | "Storage"
  | "Seal Cost"
  | "Truck Cost"
  | "Border Cost"
  | "Handling Cost"
  | "Switch B/L Cost"
  | "Insurance Cost"
  | "Bank Charge"
  | "Exchange Fee"
  | "Other Cost"
  | (string & {})

export type CostApprovalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "posted"
  | "void"
  | "reversed"

export type CostAllocationMethod =
  | "equal"
  | "by_container"
  | "by_weight"
  | "by_quantity"
  | "manual"

export interface CostContainerAllocation {
  id: string
  costId: string
  containerNumber: string
  allocatedAmount: number
  allocationMethod: CostAllocationMethod
  percentage: number
}

export interface ShipmentCostRecord {
  id: string
  costNumber: string // e.g. "SA-COST-2026-0001"
  bolNumber: string
  shipmentId?: string
  containerNumber?: string
  routeLeg?: string // e.g. "Kandahar -> Nimroz"
  supplierId: string
  supplierName: string
  costCategory: string
  description: string
  costDate: string
  costType: "estimated" | "actual"
  quantity: number
  rate: number
  amount: number
  currency: string
  baseCurrency: string // e.g. "USD"
  exchangeRate: number // Locked at posting time
  baseCurrencyAmount: number
  supplierInvoiceNumber?: string
  referenceNumber?: string
  dueDate?: string
  paymentStatus: "unpaid" | "partially_paid" | "paid"
  paidAmount: number
  outstandingAmount: number
  approvalStatus: CostApprovalStatus
  isInternalCost: boolean // Office internal cost without external supplier invoice
  estimatedAmount?: number // If converted from estimate
  varianceAmount?: number // actual - estimated
  variancePercent?: number
  supplierBillId?: string
  supplierBillNumber?: string
  postedToLedger: boolean
  postedLedgerTxId?: string
  containerAllocations?: CostContainerAllocation[]
  remarks?: string
  attachmentName?: string
  attachmentUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SupplierBillStatus =
  | "draft"
  | "received"
  | "approved"
  | "posted"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "disputed"
  | "void"

export interface SupplierBillItem {
  id: string
  costCategory: string
  description: string
  quantity: number
  rate: number
  amount: number
  currency: string
  bolNumber?: string
  shipmentId?: string
  containerNumber?: string
  routeLeg?: string
}

export interface SupplierBillRecord {
  id: string
  billNumber: string // e.g. "SA-SBILL-2026-0001"
  supplierId: string
  supplierName: string
  billDate: string
  dueDate: string
  currency: string
  baseCurrency: string
  exchangeRate: number
  bolNumbers: string[]
  shipmentId?: string
  containerNumbers?: string[]
  supplierInvoiceNumber: string
  items: SupplierBillItem[]
  subtotal: number
  tax: number
  discount: number
  totalAmount: number
  baseCurrencyTotal: number
  paidAmount: number
  outstandingPayable: number
  status: SupplierBillStatus
  postedToLedger: boolean
  postedLedgerTxId?: string
  attachmentUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierPaymentAllocation {
  billId: string
  billNumber: string
  allocatedAmount: number
}

export interface SupplierPaymentRecord {
  id: string
  paymentNumber: string // e.g. "SA-SPAY-2026-0001"
  supplierId: string
  supplierName: string
  paymentDate: string
  amount: number
  currency: string
  paymentMethod: "Bank Transfer" | "Cash" | "Exchange" | "Cheque" | "Other"
  referenceNumber: string
  bankReference?: string
  allocations: SupplierPaymentAllocation[]
  supplierAdvance: number // Overpayment retained as supplier advance
  bolNumber?: string
  postedToLedger: boolean
  postedLedgerTxId?: string
  remarks?: string
  attachmentUrl?: string
  createdAt: string
  updatedAt: string
}

export type SupplierTransactionType =
  | "SUPPLIER_BILL"
  | "SUPPLIER_PAYMENT"
  | "SUPPLIER_CREDIT"
  | "SUPPLIER_ADJUSTMENT"

export interface SupplierLedgerTransaction {
  id: string
  supplierId: string
  supplierName: string
  transactionDate: string
  transactionType: SupplierTransactionType
  referenceNumber: string
  billNumber?: string
  paymentNumber?: string
  bolNumber?: string
  description: string
  billAmount: number // Increases payable
  paymentAmount: number // Decreases payable
  runningPayable: number
  currency: string
  createdAt: string
}

export interface RouteCostTemplate {
  id: string
  corridorName: string // e.g. "Kandahar -> Nimroz -> Bandar Abbas -> Jebel Ali -> Nhava Sheva"
  origin: string
  destination: string
  legs: string[]
  expectedCostCategories: string[]
  defaultEstimates?: Record<string, number>
  currency: string
  createdAt: string
  updatedAt: string
}

export type ProfitStatus =
  | "PROFITABLE"
  | "BREAK EVEN"
  | "LOSS"
  | "INCOMPLETE DATA"

export interface BolFinancialSummary {
  bolNumber: string
  customerName: string
  currency: string
  baseCurrency: string
  route: string
  containerCount: number
  commodity: string
  // Revenue stream (Billed to customer)
  totalCustomerRevenue: number
  customerPaid: number
  customerOutstanding: number
  // Cost stream (Incurred to suppliers)
  estimatedSupplierCost: number
  approvedSupplierCost: number
  supplierPaid: number
  supplierOutstanding: number
  costVariance: number // approved - estimated
  isCostOverrun: boolean
  // Profitability metrics
  grossProfit: number // Revenue - approved Cost
  marginPercent: number | null // null rendered as "N/A"
  netCashExposure: number // customerPaid - supplierPaid
  profitStatus: ProfitStatus
  costCompletenessPercent: number
  hasMissingExchangeRate: boolean
  missingRateReason?: string
  financiallyClosed: boolean
}

export interface ProfitByCustomer {
  customerName: string
  shipmentCount: number
  currency: string
  totalRevenue: number
  totalCost: number
  grossProfit: number
  marginPercent: number | null
  outstandingReceivable: number
}

export interface ProfitByRoute {
  route: string
  shipmentCount: number
  currency: string
  totalRevenue: number
  totalCost: number
  grossProfit: number
  marginPercent: number | null
  avgRevenuePerShipment: number
  avgCostPerShipment: number
  avgProfitPerShipment: number
}

export interface ProfitByContainer {
  containerType: string // "40'RF", "40'HC", "20'DC"
  containerCount: number
  shipmentCount: number
  currency: string
  totalRevenue: number
  totalCost: number
  grossProfit: number
  marginPercent: number | null
}

export interface ProfitByCommodity {
  commodity: string
  shipmentCount: number
  currency: string
  totalRevenue: number
  totalCost: number
  grossProfit: number
  marginPercent: number | null
}

export interface MonthlyProfitSummary {
  month: string // "2026-03"
  currency: string
  revenue: number
  cost: number
  grossProfit: number
  marginPercent: number | null
  customerPayments: number
  supplierPayments: number
  receivables: number
  payables: number
}

export interface LossMakingShipment {
  bolNumber: string
  customerName: string
  route: string
  currency: string
  revenue: number
  cost: number
  lossAmount: number // positive number representing loss
  reason: string
}

export interface RateAnalysisRecord {
  route: string
  containerType: string
  customerRate: number
  avgActualCost: number
  avgProfit: number
  avgMarginPercent: number | null
  shipmentCount: number
  currency: string
}

