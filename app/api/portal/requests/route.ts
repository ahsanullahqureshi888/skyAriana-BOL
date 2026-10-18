import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import {
  getPortalRequests,
  createPortalRequestRecord,
} from "@/lib/services/customer-portal-storage"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    // Return only this customer's requests
    const requests = await getPortalRequests(auth.session.customerId)
    return NextResponse.json({ success: true, requests })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    const { requestType, subject, message, shipmentId, bolNumber } = await request.json()

    if (!subject || !message || !requestType) {
      return NextResponse.json(
        { success: false, error: "Subject, message, and request type are required" },
        { status: 400 }
      )
    }

    const created = await createPortalRequestRecord({
      customerId: auth.session.customerId,
      customerName: auth.session.customerName,
      userId: auth.session.userId,
      userName: auth.session.username,
      shipmentId,
      bolNumber,
      requestType,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
    })

    return NextResponse.json({ success: true, request: created })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
