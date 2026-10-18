import { NextResponse } from "next/server"
import { grantBolAccess, getAccessByBolId } from "@/lib/data/client-access"
import { createClientUser, getClientUsersByCompanyId } from "@/lib/data/client-users"
import { CustomerPortalUser } from "@/lib/types/customer-portal"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, payload } = body

    if (action === "grant_bol_access") {
      const rule = grantBolAccess({
        bol_id: payload.bolId,
        company_id: payload.companyId,
        access_role: payload.accessRole || "OTHER",
        can_view_tracking: payload.canViewTracking ?? true,
        can_view_documents: payload.canViewDocuments ?? false,
        can_view_financials: payload.canViewFinancials ?? false,
      } as any)
      return NextResponse.json({ success: true, rule })
    }

    if (action === "create_client_user") {
      const user = createClientUser({
        customerId: payload.companyId,
        customerName: payload.companyName,
        username: payload.username,
        email: payload.email,
        passwordHash: payload.password, // Plain text or hash for local
        salt: "local-salt",
        role: payload.role || "viewer",
        status: "active",
        preferredLanguage: "en",
        permissions: {
          viewShipments: true,
          viewBol: true,
          downloadBolPdf: true,
          viewTracking: true,
          viewContainerInfo: true,
          viewVesselInfo: true,
          viewDocuments: true,
          downloadDocuments: true,
          viewCommercialInvoice: true,
          viewPackingList: true,
          viewAccountLedger: payload.role === "customer_admin",
          viewOutstandingBalance: payload.role === "customer_admin",
          viewTransactionDetails: payload.role === "customer_admin",
          viewReports: false,
          generateTrackingPdf: true,
          copyShipmentUpdate: true
        }
      })
      return NextResponse.json({ success: true, user })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bolId = searchParams.get("bolId")
  const companyId = searchParams.get("companyId")

  if (bolId) {
    return NextResponse.json({ accessRules: getAccessByBolId(bolId) })
  }

  if (companyId) {
    return NextResponse.json({ users: getClientUsersByCompanyId(companyId) })
  }

  return NextResponse.json({ error: "Missing query params" }, { status: 400 })
}
