import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import { getAllShipmentDocuments } from "@/lib/services/shipment-document-storage"
import { getAllInvoices } from "@/lib/services/invoice-storage-service"
import type { AccountRecord } from "@/lib/types/ledger-system"

export async function GET() {
  try {
    const session = await requireClientSession()
    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    // 1. Authorized BOLs for this company
    const accessRules = getAccessByCompanyId(session.companyId)
    const ruleBolIds = new Set(accessRules.map(r => (r.bol_id || "").trim().toLowerCase()))

    const allShipments = await getAllShipments()
    const clientShipments = allShipments.filter(s => {
      const sId = (s.id || "").trim().toLowerCase()
      const bNum = ((s as any).bolNumber || s.referenceNumber || "").trim().toLowerCase()
      const refNum = (s.referenceNumber || "").trim().toLowerCase()

      if (ruleBolIds.has(sId) || ruleBolIds.has(bNum) || ruleBolIds.has(refNum)) return true

      const shipperId = (s.shipper?.id || "").trim().toLowerCase()
      const shipperName = (s.shipper?.name || "").trim().toLowerCase()
      const consigneeId = (s.consignee?.id || "").trim().toLowerCase()
      const consigneeName = (s.consignee?.name || "").trim().toLowerCase()
      const notifyId = (s.notifyParty?.id || "").trim().toLowerCase()
      const notifyName = (s.notifyParty?.name || "").trim().toLowerCase()

      return (
        (companyId && shipperId === companyId) ||
        (companyName && shipperName && (shipperName === companyName || shipperName.includes(companyName) || companyName.includes(shipperName))) ||
        (companyId && consigneeId === companyId) ||
        (companyName && consigneeName && (consigneeName === companyName || consigneeName.includes(companyName) || companyName.includes(consigneeName))) ||
        (companyId && notifyId === companyId) ||
        (companyName && notifyName && (notifyName === companyName || notifyName.includes(companyName) || companyName.includes(notifyName)))
      )
    })

    const clientBolNumbers = new Set(clientShipments.map(s => ((s as any).bolNumber || s.referenceNumber || s.id || "").trim().toLowerCase()))

    // 2. Documents Ready for Client
    const allDocs = await getAllShipmentDocuments()
    const readyDocs = allDocs.filter(d => 
      clientBolNumbers.has((d.bolNumber || "").trim().toLowerCase()) &&
      (d.clientVisible || d.status === "ready" || d.status === "approved" || d.status === "issued")
    )

    // 3. Recent Shipment Updates
    const recentUpdates: Array<{
      bolNumber: string
      containerNumber: string
      title: string
      location: string
      status: string
      eta?: string
      timestamp: string
    }> = []

    clientShipments.forEach(s => {
      const rawMilestones = (s as any).timeline || s.milestones || []
      const latestMilestone = (rawMilestones as any[])
        .filter((m: any) => {
          if (m.visibility === "INTERNAL" || m.customerVisible === false) return false
          const desc = (m.description || "").toLowerCase()
          const title = (m.title || "").toLowerCase()
          return !desc.includes("driver rent") && !desc.includes("internal hold") && !title.includes("internal")
        })
        .slice(-1)[0]

      if (latestMilestone) {
        recentUpdates.push({
          bolNumber: (s as any).bolNumber || s.referenceNumber,
          containerNumber: s.container?.containerNumber || "",
          title: latestMilestone.title || latestMilestone.status,
          location: latestMilestone.location || s.currentLocation || "",
          status: s.status,
          eta: s.eta,
          timestamp: latestMilestone.timestamp || s.updatedAt || new Date().toISOString(),
        })
      }
    })

    // 4. Financials (Only if role allows: CLIENT_ADMIN or CLIENT_ACCOUNTING)
    const roleNorm = (session.role || "").toUpperCase()
    const canViewFinancials = roleNorm === "CLIENT_ADMIN" || roleNorm === "CLIENT_ACCOUNTING" || roleNorm === "CUSTOMER_ADMIN" || roleNorm === "ACCOUNTS"

    const outstandingBalances: Array<{ currency: string; debit: number; credit: number; balance: number; isCreditBalance: boolean }> = []
    let invoicesDueCount = 0
    let overdueInvoicesCount = 0

    if (canViewFinancials) {
      // Invoices
      const allInvoices = await getAllInvoices()
      const clientInvoices = (allInvoices as any[]).filter((inv: any) => {
        const bName = (inv.buyer_name || "").trim().toLowerCase()
        const bl = (inv.bl_no || "").trim().toLowerCase()
        return (
          (companyName && bName && (bName === companyName || bName.includes(companyName) || companyName.includes(bName))) ||
          clientBolNumbers.has(bl)
        )
      })

      const now = new Date()
      clientInvoices.forEach((inv: any) => {
        const isPaid = (inv.payment_status || "").toLowerCase() === "paid"
        if (!isPaid) {
          invoicesDueCount++
          if (inv.due_date && new Date(inv.due_date) < now) {
            overdueInvoicesCount++
          }
        }
      })

      // Ledger Accounts
      const db = await getLedgerSystemDb()
      const allAccounts = db.accounts || []
      const matchingAccounts = allAccounts.filter((acc: AccountRecord) => {
        const accId = (acc.id || "").toLowerCase()
        const accName = (acc.account_name || "").toLowerCase()
        const compId = (acc.company_id || acc.customer_id || (acc as any).related_entity_id || "").toLowerCase()

        return (
          compId === companyId ||
          accId === companyId ||
          (companyName && (accName === companyName || accName.includes(companyName) || companyName.includes(accName)))
        )
      })

      const balanceMap: Record<string, { debit: number; credit: number; balance: number }> = {}
      matchingAccounts.forEach((acc: AccountRecord) => {
        const cur = (acc.currency || "USD").toUpperCase()
        if (!balanceMap[cur]) {
          balanceMap[cur] = { debit: 0, credit: 0, balance: 0 }
        }
        balanceMap[cur].debit += Number(acc.total_debit) || 0
        balanceMap[cur].credit += Number(acc.total_credit) || 0
        balanceMap[cur].balance += Number(acc.current_balance) || 0
      })

      Object.entries(balanceMap).forEach(([currency, data]) => {
        outstandingBalances.push({
          currency,
          debit: Math.round(data.debit * 100) / 100,
          credit: Math.round(data.credit * 100) / 100,
          balance: Math.round(data.balance * 100) / 100,
          isCreditBalance: data.balance < 0,
        })
      })
    }

    const kpis = {
      activeShipments: clientShipments.filter(s => s.status !== "delivered").length,
      atSea: clientShipments.filter(s => s.status === "on_vessel" || (s.currentLocation || "").toLowerCase().includes("sea")).length,
      atPort: clientShipments.filter(s => s.status === "at_port" || s.status === "transshipment").length,
      delivered: clientShipments.filter(s => s.status === "delivered").length,
      documentsReady: readyDocs.length,
      invoicesDueCount,
      overdueInvoicesCount,
      outstandingBalances,
      canViewFinancials,
      recentUpdates: recentUpdates.slice(0, 5),
    }

    return NextResponse.json({
      success: true,
      company: {
        id: session.companyId,
        name: session.companyName,
      },
      kpis,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
