import { NextResponse } from "next/server"
import {
  getAllDebitNotes,
  getAllCreditNotes,
} from "@/lib/services/finance-storage-service"
import {
  createAndPostDebitNote,
  createAndPostCreditNote,
} from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "debit" | "credit" | "all"

    if (type === "debit") {
      const notes = await getAllDebitNotes()
      return NextResponse.json({ success: true, data: notes })
    }

    if (type === "credit") {
      const notes = await getAllCreditNotes()
      return NextResponse.json({ success: true, data: notes })
    }

    const [debitNotes, creditNotes] = await Promise.all([
      getAllDebitNotes(),
      getAllCreditNotes(),
    ])

    return NextResponse.json({ success: true, debitNotes, creditNotes })
  } catch (error: any) {
    console.error("[finance/notes API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { noteType } = body // "debit" | "credit"

    if (noteType === "credit") {
      const result = await createAndPostCreditNote(body)
      return NextResponse.json({ success: true, data: result, noteType: "credit" })
    }

    // Default to debit note
    const result = await createAndPostDebitNote(body)
    return NextResponse.json({ success: true, data: result, noteType: "debit" })
  } catch (error: any) {
    console.error("[finance/notes API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
