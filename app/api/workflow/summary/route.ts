import { NextRequest, NextResponse } from 'next/server'
import { getWorkflowMetrics } from '@/lib/workflows/task-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const user = searchParams.get('user') || undefined
    const metrics = await getWorkflowMetrics(user)
    return NextResponse.json({ success: true, metrics })
  } catch (error: any) {
    console.error('[API Workflow Summary] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
