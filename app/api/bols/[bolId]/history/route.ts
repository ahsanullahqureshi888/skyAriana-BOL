import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch BOL history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const supabase = await createClient()
    const { bolId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: history, error } = await supabase
      .from('bol_history')
      .select('*')
      .eq('bol_id', bolId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(history)
  } catch (error) {
    console.error('[v0] Error fetching history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

// POST - Record action in BOL history
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const supabase = await createClient()
    const { bolId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: entry, error } = await supabase
      .from('bol_history')
      .insert({
        bol_id: bolId,
        user_id: user.id,
        action: body.action,
        changes: body.changes || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating history entry:', error)
    return NextResponse.json(
      { error: 'Failed to record action' },
      { status: 500 }
    )
  }
}
