import { NextResponse } from "next/server"
import {
  checkCompanyDuplicate,
  checkBolDuplicate,
  checkPaymentDuplicate,
} from "@/lib/search/global-search-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, name, bolNumber, containerNumber, reference, amount, customerName } = body

    if (type === "company") {
      const result = await checkCompanyDuplicate(name)
      return NextResponse.json(result)
    }

    if (type === "bol") {
      const result = await checkBolDuplicate(bolNumber, containerNumber)
      return NextResponse.json(result)
    }

    if (type === "payment") {
      const result = await checkPaymentDuplicate(reference, Number(amount) || 0, customerName)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: "Invalid duplicate check type. Must be 'company', 'bol', or 'payment'." },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("[api/search/duplicates] Error checking duplicates:", error)
    return NextResponse.json(
      { error: "Failed to check duplicates", message: error?.message },
      { status: 500 }
    )
  }
}
