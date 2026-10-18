import { NextResponse } from "next/server"
import crypto from "crypto"
import {
  getAllSupplierBills,
  saveSupplierBill,
  saveSupplierLedgerTransaction,
  nextSupplierBillNumber,
  getSupplierById,
} from "@/lib/services/finance-storage-service"
import { createOrUpdateSupplier } from "@/lib/services/finance-service"
import { roundMoney, addMoney, subMoney } from "@/lib/utils/money"
import type { SupplierBillRecord, SupplierLedgerTransaction } from "@/lib/types/finance"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get("supplierId")
    const status = searchParams.get("status")

    let bills = await getAllSupplierBills()

    if (supplierId) {
      bills = bills.filter((b) => b.supplierId === supplierId)
    }
    if (status) {
      bills = bills.filter((b) => b.status === status)
    }

    return NextResponse.json({ success: true, count: bills.length, data: bills })
  } catch (error: any) {
    console.error("[api/finance/supplier-bills GET] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.supplierId || !body.supplierName || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Supplier ID, supplier name, and line items are required" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const currency = (body.currency || "USD").toUpperCase()
    const baseCurrency = (body.baseCurrency || "USD").toUpperCase()
    const exchangeRate = Number(body.exchangeRate) || 1.0

    const subtotal = body.items.reduce(
      (sum: number, it: any) => addMoney(sum, roundMoney(Number(it.amount || (it.quantity || 1) * (it.rate || 0)), currency), currency),
      0
    )
    const tax = roundMoney(body.tax || 0, currency)
    const discount = roundMoney(body.discount || 0, currency)
    const totalAmount = subMoney(addMoney(subtotal, tax, currency), discount, currency)
    const baseCurrencyTotal = roundMoney(totalAmount * exchangeRate, baseCurrency)

    const id = `sbill-${crypto.randomBytes(6).toString("hex")}`
    const billNumber = await nextSupplierBillNumber()

    const bill: SupplierBillRecord = {
      id,
      billNumber,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      billDate: body.billDate || now.split("T")[0],
      dueDate: body.dueDate || "",
      currency,
      baseCurrency,
      exchangeRate,
      bolNumbers: Array.isArray(body.bolNumbers) ? body.bolNumbers : [],
      shipmentId: body.shipmentId,
      containerNumbers: Array.isArray(body.containerNumbers) ? body.containerNumbers : [],
      supplierInvoiceNumber: body.supplierInvoiceNumber || billNumber,
      items: body.items,
      subtotal,
      tax,
      discount,
      totalAmount,
      baseCurrencyTotal,
      paidAmount: 0,
      outstandingPayable: totalAmount,
      status: "posted",
      postedToLedger: true,
      postedLedgerTxId: `tx-sbill-${id}`,
      attachmentUrl: body.attachmentUrl,
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    }

    // Idempotent ledger entry
    const tx: SupplierLedgerTransaction = {
      id: `tx-sbill-${id}`,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      transactionDate: bill.billDate,
      transactionType: "SUPPLIER_BILL",
      referenceNumber: bill.billNumber,
      billNumber: bill.billNumber,
      bolNumber: bill.bolNumbers.join(", "),
      description: `Supplier Bill ${bill.billNumber} (${bill.supplierInvoiceNumber})`,
      billAmount: bill.totalAmount,
      paymentAmount: 0,
      runningPayable: 0,
      currency,
      createdAt: now,
    }
    await saveSupplierLedgerTransaction(tx)
    const savedBill = await saveSupplierBill(bill)

    // Refresh supplier balance
    const supplier = await getSupplierById(body.supplierId)
    if (supplier) await createOrUpdateSupplier({ ...supplier })

    return NextResponse.json({ success: true, bill: savedBill })
  } catch (error: any) {
    console.error("[api/finance/supplier-bills POST] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
