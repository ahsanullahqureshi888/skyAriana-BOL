import { NextRequest, NextResponse } from "next/server"
import {
  getAllShipments,
  saveShipment,
  updateShipmentStatus,
  generateSequenceNumber,
  validateShipmentDocuments,
  generateWhatsAppStatusMessage,
} from "@/lib/services/shipment-service"
import type { ShipmentMaster, ShipmentStatus } from "@/lib/types/shipment"

export async function GET(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("query") || searchParams.get("q") || "").toLowerCase().trim()
    const status = searchParams.get("status") as ShipmentStatus | null
    const location = searchParams.get("location")?.toLowerCase().trim()
    const clientId = searchParams.get("clientId") || searchParams.get("client")
    const role = searchParams.get("role") || "admin"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const idOnly = searchParams.get("id")

    let shipments = await getAllShipments()

    const headerRole = request.headers.get("x-user-role") || role
    const headerClient = request.headers.get("x-client-id") || request.headers.get("x-shipper-name") || clientId

    // If specific ID requested
    if (idOnly) {
      const found = shipments.find((s) => s.id === idOnly || s.referenceNumber === idOnly)
      if (!found) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
      }

      // Strict IDOR Protection: If requester is a client or shipper, verify ownership
      if (headerRole === "client" || headerRole === "shipper") {
        const clientFilter = (headerClient || "").trim().toLowerCase()
        const sName = (found.shipper?.name || "").toLowerCase()
        const sId = (found.shipper?.id || "").toLowerCase()
        const cName = (found.consignee?.name || "").toLowerCase()
        const cId = (found.consignee?.id || "").toLowerCase()
        const isOwner = Boolean(
          clientFilter &&
          (sName.includes(clientFilter) || clientFilter.includes(sName) || sId === clientFilter || cName.includes(clientFilter) || cId === clientFilter)
        )
        if (!isOwner) {
          return NextResponse.json({ error: "Forbidden: You do not have access to this shipment" }, { status: 403 })
        }
      }

      const mismatches = validateShipmentDocuments(found)
      return NextResponse.json({ shipment: found, mismatches })
    }

    // Role-based Client Access Restriction
    if (headerRole === "client" || headerRole === "shipper") {
      if (headerClient) {
        const clientFilter = headerClient.trim().toLowerCase()
        shipments = shipments.filter(
          (s) =>
            s.shipper?.id === headerClient ||
            s.shipper?.name?.toLowerCase().includes(clientFilter) ||
            clientFilter.includes((s.shipper?.name || "").toLowerCase()) ||
            s.consignee?.id === headerClient ||
            s.consignee?.name?.toLowerCase().includes(clientFilter)
        )
      } else {
        shipments = []
      }
    }

    // Filters
    if (status) {
      shipments = shipments.filter((s) => s.status === status)
    }

    if (location) {
      shipments = shipments.filter((s) => s.currentLocation.toLowerCase().includes(location))
    }

    if (query) {
      shipments = shipments.filter((s) => {
        const text = `${s.id} ${s.referenceNumber} ${s.shipper?.name} ${s.consignee?.name} ${s.container?.containerNumber} ${s.container?.sealNumber} ${s.vessel?.vesselName} ${s.truck?.driverName} ${s.truck?.afghanPlate} ${s.cargo?.commodity} ${s.cargo?.hsCode}`.toLowerCase()
        return text.includes(query)
      })
    }

    const total = shipments.length
    const startIndex = (page - 1) * limit
    const paginated = shipments.slice(startIndex, startIndex + limit)

    // Compute operational metrics
    const counts = {
      total,
      active: shipments.filter((s) => s.status !== "delivered" && s.status !== "cancelled").length,
      inTransit: shipments.filter((s) => s.status === "in_transit").length,
      atBorder: shipments.filter((s) => s.status === "at_border").length,
      atPort: shipments.filter((s) => s.status === "at_port" || s.status === "container_loading").length,
      onVessel: shipments.filter((s) => s.status === "on_vessel" || s.status === "vessel_departed").length,
      arrived: shipments.filter((s) => s.status === "arrived_destination").length,
      delivered: shipments.filter((s) => s.status === "delivered").length,
      delayed: shipments.filter((s) => s.status === "delayed" || Boolean(s.delayReason)).length,
      docsIncomplete: shipments.filter((s) => (s.documents || []).length < 4).length,
      paymentOutstanding: shipments.filter((s) => (s.finance?.customerOutstanding || 0) > 0).length,
    }

    // Location distribution
    const locationCounts: Record<string, number> = {}
    for (const s of shipments) {
      const loc = s.currentLocation || "Unknown"
      locationCounts[loc] = (locationCounts[loc] || 0) + 1
    }

    return NextResponse.json({
      shipments: paginated,
      total,
      page,
      limit,
      metrics: counts,
      locationCounts,
    })
  } catch (error) {
    console.error("[shipments] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const body = await request.json()
    const all = await getAllShipments()
    const existingIds = all.map((s) => s.id)

    const newId = body.id || generateSequenceNumber("SA-SHP", existingIds)
    const user = body.user || "Operations User"

    const newShipment: ShipmentMaster = {
      ...body,
      id: newId,
      referenceNumber: body.referenceNumber || newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user,
      lastUpdatedBy: user,
      documents: body.documents || [],
      attachments: body.attachments || [],
      milestones: body.milestones || [],
      auditLog: [
        {
          id: `audit-create-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user,
          field: "shipment",
          oldValue: null,
          newValue: newId,
          actionDescription: `Shipment ${newId} created`,
        },
      ],
    }

    await saveShipment(newShipment, user)
    return NextResponse.json({ success: true, shipment: newShipment })
  } catch (error) {
    console.error("[shipments] POST error:", error)
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const body = await request.json()
    const { action, shipmentId, statusUpdate, shipment, user = "Operations User" } = body

    const headerRole = request.headers.get("x-user-role")
    if ((headerRole === "client" || headerRole === "shipper") && action !== "generate_whatsapp") {
      return NextResponse.json({ error: "Forbidden: Clients cannot modify shipment operational records" }, { status: 403 })
    }

    if (action === "quick_status_update" && shipmentId && statusUpdate) {
      const updated = await updateShipmentStatus(shipmentId, {
        ...statusUpdate,
        user,
      })
      if (!updated) {
        return NextResponse.json({ error: "Shipment not found for status update" }, { status: 404 })
      }
      return NextResponse.json({ success: true, shipment: updated })
    }

    if (action === "generate_whatsapp" && shipmentId) {
      const all = await getAllShipments()
      const found = all.find((s) => s.id === shipmentId || s.referenceNumber === shipmentId)
      if (!found) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
      }
      const lang = body.language || "en"
      const message = generateWhatsAppStatusMessage(found, lang)
      return NextResponse.json({ success: true, message })
    }

    if (shipment && shipment.id) {
      const saved = await saveShipment(shipment, user)
      return NextResponse.json({ success: true, shipment: saved })
    }

    return NextResponse.json({ error: "Invalid action or payload" }, { status: 400 })
  } catch (error) {
    console.error("[shipments] PUT error:", error)
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 })
  }
}
