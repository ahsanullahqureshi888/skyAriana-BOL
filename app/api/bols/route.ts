import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all BOLs for user
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[v0] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bols, error } = await supabase
      .from('bills_of_lading')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Supabase query error:', error)
      throw error
    }

    return NextResponse.json(bols || [])
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Error fetching BOLs:', errorMsg)
    
    // Return graceful error with fallback empty array
    return NextResponse.json(
      { 
        error: 'Failed to fetch bills of lading',
        details: errorMsg,
        bols: [] 
      },
      { status: 500 }
    )
  }
}

// POST - Create new BOL
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[v0] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Generate BOL number
    const bolNumber = `BOL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data: bol, error } = await supabase
      .from('bills_of_lading')
      .insert({
        user_id: user.id,
        bol_number: bolNumber,
        issue_date: body.issue_date || new Date().toISOString().split('T')[0],
        status: 'draft',
        ...body,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Supabase insert error:', error)
      throw error
    }

    return NextResponse.json(bol, { status: 201 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Error creating BOL:', errorMsg)
    return NextResponse.json(
      { 
        error: 'Failed to create bill of lading',
        details: errorMsg 
      },
      { status: 500 }
    )
  }
}
