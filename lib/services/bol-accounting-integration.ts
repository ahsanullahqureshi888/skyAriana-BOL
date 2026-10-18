import { getLedgerSystemDb, saveLedgerSystemDb } from "./ledger-db-service"
import { createOrUpdateInvoice, postInvoiceToLedger } from "./finance-service"
import { AccountRecord } from "@/lib/types/ledger-system"
import crypto from "crypto"

export async function autoProcessBolAccounting(bolData: any) {
  try {
    const charge = parseFloat(bolData.customer_freight_charge)
    if (isNaN(charge) || charge <= 0) return

    const shipperName = (bolData.shipper_name || "").trim()
    if (!shipperName || shipperName.toLowerCase() === "no shipper") return

    const db = await getLedgerSystemDb()

    // Find or create account for the shipper
    let account = db.accounts.find(
      (a) => a.account_name.toLowerCase() === shipperName.toLowerCase() && a.status !== "merged"
    )

    if (!account) {
      const accountId = `ACC-${crypto.randomBytes(6).toString("hex")}`
      account = {
        id: accountId,
        account_code: `AC-${String(db.accounts.length + 1).padStart(6, "0")}`,
        account_name: shipperName,
        display_name: shipperName,
        normalized_name: shipperName.toUpperCase().replace(/[\s\-_]+/g, " "),
        aliases: [],
        account_type: "customer",
        currency: bolData.customer_freight_currency || "USD",
        opening_balance: 0,
        total_debit: 0,
        total_credit: 0,
        current_balance: 0,
        status: "active",
        source: "bol_auto_create",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AccountRecord
      db.accounts.push(account)
      await saveLedgerSystemDb(db)
    }

    const currency = bolData.customer_freight_currency || "USD"
    const bolNumber = bolData.bol_number || bolData.id

    // Check if an invoice already exists for this BOL
    const existingInvoice = db.ledger_transactions.find(
      (t) => t.bol_number === bolNumber && t.transaction_type === "invoice" && !t.is_deleted
    )

    if (!existingInvoice) {
      // Create new invoice via finance-service
      const invoiceData = {
        account_id: account.id,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        currency: currency,
        subtotal: charge,
        tax_amount: 0,
        total_amount: charge,
        notes: `Auto-generated freight invoice for BOL: ${bolNumber}`,
        bol_reference: bolNumber,
        items: [
          {
            id: crypto.randomBytes(4).toString("hex"),
            description: `Freight Charge - ${bolData.port_of_loading || 'Origin'} to ${bolData.port_of_discharge || 'Destination'}`,
            chargeType: "freight",
            quantity: 1,
            unit: "trip",
            unitPrice: charge,
            amount: charge,
            currency: currency,
            bolNumber: bolNumber
          }
        ] as any
      }
      
      const invoice = await createOrUpdateInvoice(invoiceData)
      if (invoice) {
        // Automatically post to ledger to update customer balance!
        await postInvoiceToLedger(invoice.id)
      }
    } else {
      // If invoice exists, maybe update it? 
      // For now, to prevent duplicates, we just skip if an invoice is already tied to this BOL.
      // A more robust solution would update the invoice and adjust the ledger.
    }
  } catch (err) {
    console.error("[autoProcessBolAccounting] Error:", err)
  }
}
