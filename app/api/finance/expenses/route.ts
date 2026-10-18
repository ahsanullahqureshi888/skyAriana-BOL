import { NextResponse } from "next/server"
import crypto from "crypto"
import {
  getAllFinanceExpenses,
  saveFinanceExpense,
} from "@/lib/services/finance-storage-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let expenses = await getAllFinanceExpenses()

    const bol = searchParams.get("bol")
    if (bol) {
      const b = bol.toLowerCase().trim()
      expenses = expenses.filter((e) => (e.bolNumber || "").toLowerCase().includes(b))
    }

    const category = searchParams.get("category")
    if (category && category !== "all") {
      expenses = expenses.filter((e) => e.category.toLowerCase() === category.toLowerCase())
    }

    const currency = searchParams.get("currency")
    if (currency && currency !== "all") {
      expenses = expenses.filter((e) => e.currency.toUpperCase() === currency.toUpperCase())
    }

    return NextResponse.json({ success: true, data: expenses })
  } catch (error: any) {
    console.error("[finance/expenses API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const now = new Date().toISOString()
    const expense = await saveFinanceExpense({
      id: body.id || `exp-${crypto.randomBytes(6).toString("hex")}`,
      date: body.date || now.split("T")[0],
      category: body.category || "Other",
      bolNumber: body.bolNumber,
      shipmentId: body.shipmentId,
      paidTo: body.paidTo || "Vendor",
      description: body.description || "",
      amount: Number(body.amount) || 0,
      currency: (body.currency || "USD").toUpperCase(),
      paymentMethod: body.paymentMethod || "Cash",
      reference: body.reference || "",
      attachmentUrl: body.attachmentUrl,
      createdAt: now,
    })

    return NextResponse.json({ success: true, data: expense })
  } catch (error: any) {
    console.error("[finance/expenses API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
