import { NextRequest, NextResponse } from 'next/server'
import {
  getUserNotificationSettings,
  saveUserNotificationSettings,
} from '@/lib/notifications/notification-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user') || 'admin'
    const settings = await getUserNotificationSettings(userId)
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error('[API Notification Settings] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, settings } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    const updated = await saveUserNotificationSettings(userId, settings || {})
    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    console.error('[API Notification Settings] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
