import { cookies } from "next/headers"
import { getSession } from "@/lib/data/client-sessions"
import { getAccessByCompanyId } from "@/lib/data/client-access"
import { getAllShipments } from "@/lib/services/shipment-service"
import type { ClientSession } from "@/lib/data/client-sessions"

export const CLIENT_SESSION_COOKIE = "client_portal_session"

export async function getClientSession(): Promise<ClientSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value
  
  if (!token) return null

  const session = getSession(token)
  if (!session) return null

  return session
}

export async function requireClientSession(): Promise<ClientSession> {
  const session = await getClientSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export function assertFinancialAccess(session: ClientSession) {
  const role = (session.role || "").toUpperCase()
  if (role === "CLIENT_OPERATIONS" || role === "OPERATIONS" || role === "VIEWER" || role === "CLIENT_VIEWER") {
    throw new Error("Forbidden: Financial access restricted for this portal role")
  }
}

export async function verifyBolAccess(
  session: ClientSession,
  bolIdOrNumber: string,
  type: "tracking" | "documents" | "financials" = "tracking"
): Promise<boolean> {
  const cleanTarget = (bolIdOrNumber || "").trim().toLowerCase()
  const companyId = (session.companyId || "").trim().toLowerCase()
  const companyName = (session.companyName || "").trim().toLowerCase()

  // 1. Explicit Access Rule Check
  const accessRules = getAccessByCompanyId(session.companyId)
  const matchingRule = accessRules.find(r => 
    (r.bol_id || "").trim().toLowerCase() === cleanTarget
  )

  if (matchingRule) {
    if (type === "tracking" && matchingRule.can_view_tracking !== false) return true
    if (type === "documents" && matchingRule.can_view_documents === true) return true
    if (type === "financials" && matchingRule.can_view_financials === true) return true
  }

  // 2. Direct Shipment Ownership Check
  const allShipments = await getAllShipments()
  const shipment = allShipments.find(s => 
    (s.id || "").trim().toLowerCase() === cleanTarget ||
    ((s as any).bolNumber || "").trim().toLowerCase() === cleanTarget ||
    (s.referenceNumber || "").trim().toLowerCase() === cleanTarget
  )

  if (shipment) {
    const sId = (shipment.shipper?.id || "").trim().toLowerCase()
    const sName = (shipment.shipper?.name || "").trim().toLowerCase()
    const conId = (shipment.consignee?.id || "").trim().toLowerCase()
    const conName = (shipment.consignee?.name || "").trim().toLowerCase()
    const notId = (shipment.notifyParty?.id || "").trim().toLowerCase()
    const notName = (shipment.notifyParty?.name || "").trim().toLowerCase()

    const isShipper = Boolean((companyId && sId === companyId) || (companyName && sName && (sName === companyName || sName.includes(companyName) || companyName.includes(sName))))
    const isConsignee = Boolean((companyId && conId === companyId) || (companyName && conName && (conName === companyName || conName.includes(companyName) || companyName.includes(conName))))
    const isNotify = Boolean((companyId && notId === companyId) || (companyName && notName && (notName === companyName || notName.includes(companyName) || companyName.includes(notName))))

    if (isShipper || isConsignee || isNotify) {
      if (type === "tracking") return true
      if (type === "documents") return true
      if (type === "financials") return Boolean(isShipper)
    }
  }

  return false
}
