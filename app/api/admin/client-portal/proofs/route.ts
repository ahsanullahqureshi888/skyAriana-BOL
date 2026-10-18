import { NextResponse } from "next/server"
import { getPaymentProofs, reviewPaymentProof } from "@/lib/data/payment-proofs"

export async function GET() {
  try {
    const proofs = await getPaymentProofs()
    return NextResponse.json({ success: true, proofs })
  } catch (error: any) {
    console.error("Admin Payment Proofs GET Error:", error)
    return NextResponse.json({ error: "Failed to fetch payment proofs" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, status, reviewerName, reviewNotes } = body

    if (!id || !status) {
      return NextResponse.json({ error: "Proof ID and review status are required" }, { status: 400 })
    }

    const updated = await reviewPaymentProof(
      id,
      status,
      reviewerName || "Internal Staff",
      reviewNotes || ""
    )

    if (!updated) {
      return NextResponse.json({ error: "Payment proof not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, proof: updated })
  } catch (error: any) {
    console.error("Admin Payment Proofs POST Error:", error)
    return NextResponse.json({ error: "Failed to update review status" }, { status: 500 })
  }
}
