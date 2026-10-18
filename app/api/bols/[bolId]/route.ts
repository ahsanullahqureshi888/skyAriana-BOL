import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch specific BOL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const supabase = await createClient()
    const { bolId } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bol, error } = await supabase
      .from('bills_of_lading')
      .select('*')
      .eq('id', bolId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('[v0] Error fetching BOL:', error)
      return NextResponse.json(
        { error: 'BOL not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bol)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Error fetching BOL:', errorMsg)
    return NextResponse.json(
      { error: 'Failed to fetch BOL' },
      { status: 500 }
    )
  }
}

// PUT - Update BOL
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const supabase = await createClient()
    const { bolId } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: bol, error } = await supabase
      .from('bills_of_lading')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bolId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[v0] Error updating BOL:', error)
      throw error
    }

    return NextResponse.json(bol)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Error updating BOL:', errorMsg)
    return NextResponse.json(
      { error: 'Failed to update BOL' },
      { status: 500 }
    )
  }
}

// DELETE - Remove BOL
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const supabase = await createClient()
    const { bolId } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('bills_of_lading')
      .delete()
      .eq('id', bolId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[v0] Error deleting BOL:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Error deleting BOL:', errorMsg)
    return NextResponse.json(
      { error: 'Failed to delete BOL' },
      { status: 500 }
    )
  }
}
