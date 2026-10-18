import { NextResponse } from 'next/server'
import { airFreightStore } from '@/lib/services/air-freight-service'

export async function GET() {
  try {
    const store = airFreightStore
    const mawbs = store.getMawbs()
    const hawbs = store.getHawbs()
    return NextResponse.json({ success: true, mawbs, hawbs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = airFreightStore

    if (body.type === 'HAWB') {
      const hawb = store.saveHawb(body.data)
      return NextResponse.json({ success: true, data: hawb })
    }

    const mawb = store.saveMawb(body.data || body, body.editorName)
    return NextResponse.json({ success: true, data: mawb })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
