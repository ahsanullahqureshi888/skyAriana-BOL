import type { FinanceReceiptRecord } from "@/lib/types/finance"
import { formatMoney } from "@/lib/utils/money"

/**
 * Builds a clean, professional WhatsApp payment confirmation receipt message.
 */
export function buildPaymentReceiptWhatsAppMessage(receipt: FinanceReceiptRecord): string {
  const invList =
    receipt.appliedInvoices && receipt.appliedInvoices.length > 0
      ? receipt.appliedInvoices.join(", ")
      : "Account Credit / General Balance"

  return `*SKY ARIANA LIMITED — OFFICIAL PAYMENT RECEIPT*
────────────────────────────
*Receipt No:* ${receipt.receiptNumber}
*Date:* ${receipt.receiptDate}
*Customer:* ${receipt.customerName}
*Amount Paid:* ${receipt.currency} ${formatMoney(receipt.amount)}
*Amount in Words:* ${receipt.amountInWords}
*Payment Method:* ${receipt.paymentMethod.replace(/_/g, " ").toUpperCase()}
*Ref / Tx ID:* ${receipt.referenceNumber || "N/A"}
*Invoices Covered:* ${invList}
────────────────────────────
Thank you for your business. For billing queries, contact accounts@skyariana.com.`
}

/**
 * Builds a polite, professional WhatsApp outstanding balance reminder.
 */
export function buildOutstandingBalanceWhatsAppMessage(
  customerName: string,
  currency: string,
  totalOutstanding: number,
  overdueAmount: number,
  openInvoices?: Array<{ invoiceNumber: string; balanceDue: number; dueDate: string }>
): string {
  let invBreakdown = ""
  if (openInvoices && openInvoices.length > 0) {
    invBreakdown =
      "\n*Pending Invoices:*\n" +
      openInvoices
        .map(
          (inv) =>
            `• ${inv.invoiceNumber} — ${currency} ${formatMoney(inv.balanceDue)} (Due: ${inv.dueDate})`
        )
        .join("\n")
  }

  return `*SKY ARIANA LIMITED — STATEMENT OF ACCOUNT*
────────────────────────────
Dear *${customerName}*,

This is a friendly reminder regarding your outstanding account balance with Sky Ariana Limited:

*Total Outstanding Balance:* ${currency} ${formatMoney(totalOutstanding)}
${overdueAmount > 0 ? `*Overdue Amount:* ${currency} ${formatMoney(overdueAmount)}\n` : ""}${invBreakdown}
────────────────────────────
Kindly arrange the settlement at your earliest convenience. Please share your bank transfer receipt with our finance team once completed.

Thank you for your continued partnership!`
}
