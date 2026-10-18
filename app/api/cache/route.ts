import { NextRequest, NextResponse } from 'next/server'
import { cacheDocument, getCachedDocument, invalidateDocumentCache } from '@/lib/redis'

// GET - Retrieve cached BOL document
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
    const docId = searchParams.get('id') || searchParams.get('key')

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Check cache first
    const cached = await getCachedDocument(docId)
    if (cached) {
      return NextResponse.json({ 
        data: cached, 
        source: 'cache',
        message: 'Document retrieved from cache'
      })
    }

    return NextResponse.json({ error: 'Document not found in cache' }, { status: 404 })
  } catch (error) {
    console.error('[v0] Error in cache GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Cache BOL document
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
    const docId = body.docId || body.key
    const data = body.data || body.value
    const expirationSeconds = body.expirationSeconds || 86400

    if (!docId || !data) {
      return NextResponse.json({ error: 'Document ID and data required' }, { status: 400 })
    }

    await cacheDocument(docId, data, expirationSeconds)

    return NextResponse.json({ 
      message: 'Document cached successfully',
      docId,
      expiresIn: expirationSeconds
    })
  } catch (error) {
    console.error('[v0] Error in cache POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Invalidate cache for document
export async function DELETE(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const { searchParams } = new URL(request.url)
    const docId = searchParams.get('id')

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    await invalidateDocumentCache(docId)

    return NextResponse.json({ 
      message: 'Document cache invalidated',
      docId
    })
  } catch (error) {
    console.error('[v0] Error in cache DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
