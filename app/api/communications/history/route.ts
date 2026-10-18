import { NextRequest, NextResponse } from "next/server"
import {
  getCommunicationHistory,
  logCommunication,
} from "@/lib/services/communication-service"
import type {
  CommunicationChannel,
  CommunicationSentStatus,
  CommunicationType,
} from "@/lib/types/communication"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      entity_type: searchParams.get("entity_type") || undefined,
      entity_id: searchParams.get("entity_id") || undefined,
      communication_type: (searchParams.get("communication_type") as CommunicationType) || undefined,
      channel: (searchParams.get("channel") as CommunicationChannel) || undefined,
      sent_status: (searchParams.get("sent_status") as CommunicationSentStatus) || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100,
    }

    const history = await getCommunicationHistory(filters)
    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    console.error("[API Communications History] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load history" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.communication_type || !body.channel || !body.entity_id || !body.message_text) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: communication_type, channel, entity_id, message_text",
        },
        { status: 400 }
      )
    }

    const entry = await logCommunication(body)
    return NextResponse.json({ success: true, entry })
  } catch (error: any) {
    console.error("[API Communications History] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log communication" },
      { status: 500 }
    )
  }
}
