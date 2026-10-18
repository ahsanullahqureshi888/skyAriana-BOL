import { NextRequest, NextResponse } from "next/server"
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  evaluateSystemEvents,
} from "@/lib/services/notification-center-service"
import type {
  NotificationCategory,
  NotificationPriority,
} from "@/lib/types/communication"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Optionally evaluate system events on query if requested
    if (searchParams.get("evaluate") === "true") {
      await evaluateSystemEvents()
    }

    const filters = {
      user_id: searchParams.get("user_id") || undefined,
      category: (searchParams.get("category") as NotificationCategory) || undefined,
      priority: (searchParams.get("priority") as NotificationPriority) || undefined,
      unreadOnly: searchParams.get("unreadOnly") === "true",
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0,
    }

    const result = await getNotifications(filters)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[API Notifications] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load notifications" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.title || !body.message || !body.entity_id || !body.deduplication_key) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: title, message, entity_id, deduplication_key",
        },
        { status: 400 }
      )
    }

    const res = await createNotification(body)
    return NextResponse.json({ success: true, ...res })
  } catch (error: any) {
    console.error("[API Notifications] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create notification" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.markAll) {
      const res = await markAllAsRead(body.user_id)
      return NextResponse.json({ success: true, ...res })
    }

    if (body.id) {
      const updated = await markAsRead(body.id)
      return NextResponse.json({ success: true, notification: updated })
    }

    return NextResponse.json(
      { success: false, error: "Provide id or markAll: true" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("[API Notifications] PATCH error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update notification" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const clearAll = searchParams.get("clearAll") === "true"
    const userId = searchParams.get("user_id") || undefined

    if (clearAll) {
      const res = await clearAllNotifications(userId)
      return NextResponse.json({ success: true, ...res })
    }

    if (id) {
      const deleted = await deleteNotification(id)
      return NextResponse.json({ success: true, deleted })
    }

    return NextResponse.json(
      { success: false, error: "Provide id or clearAll=true" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("[API Notifications] DELETE error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete notification" },
      { status: 500 }
    )
  }
}
