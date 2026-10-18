import { NextResponse } from "next/server"
import { requireClientSession, assertFinancialAccess } from "@/lib/auth/client-auth"
import { getPaymentProofsByCompanyId, createPaymentProof } from "@/lib/data/payment-proofs"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import type { AccountRecord, LedgerTransactionRecord } from "@/lib/types/ledger-system"

export async function GET() {
  try {
    const session = await requireClientSession()
    assertFinancialAccess(session)

    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    // 1. Confirmed payments from ledger transactions
    const db = await getLedgerSystemDb()
    const allAccounts = db.accounts || []
    const matchingAccounts = allAccounts.filter((acc: AccountRecord) => {
      const accId = (acc.id || "").toLowerCase()
      const accName = (acc.account_name || "").toLowerCase()
      const compId = (acc.company_id || acc.customer_id || (acc as any).related_entity_id || "").toLowerCase()
      return compId === companyId || accId === companyId || (companyName && (accName === companyName || accName.includes(companyName)))
    })
    const matchingAccountIds = new Set(matchingAccounts.map(a => a.id))

    const confirmedPayments = (db.ledger_transactions || [])
      .filter((tx: LedgerTransactionRecord) => matchingAccountIds.has(tx.account_id) && tx.credit > 0 && !tx.is_deleted)
      .map(tx => ({
        id: tx.id,
        date: tx.transaction_date,
        amount: Number(tx.credit) || 0,
        currency: (tx.currency || "USD").toUpperCase(),
        method: "Bank / Transfer",
        reference: tx.reference_number || tx.invoice_number || "Direct Payment",
        bolNumber: tx.bol_number || "-",
        invoiceNumber: tx.invoice_number || "-",
        status: "CONFIRMED",
        receiptAvailable: true,
      }))

    // 2. Uploaded payment proofs
    const proofs = await getPaymentProofsByCompanyId(session.companyId)

    return NextResponse.json({
      success: true,
      confirmedPayments,
      proofSubmissions: proofs,
    })
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Payments API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClientSession()
    assertFinancialAccess(session)

    const body = await req.json()
    const { invoiceNumber, bolNumber, amount, currency, reference, fileDataUrl, fileName, note } = body

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 })
    }

    const proof = await createPaymentProof({
      companyId: session.companyId,
      companyName: session.companyName,
      invoiceNumber: invoiceNumber || "",
      bolNumber: bolNumber || "",
      amount: Number(amount),
      currency: currency || "USD",
      reference: reference || "",
      fileDataUrl: fileDataUrl || "",
      fileName: fileName || "payment-receipt",
      note: note || "",
      submittedBy: session.username,
    })

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully. Internal accounting will review and post to ledger.",
      proof,
    })
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Payment Proof Upload Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
