import { put, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const entryId = formData.get('entryId') as string

    if (!file || !entryId) {
      return NextResponse.json({ error: 'File and entry ID required' }, { status: 400 })
    }
    
    const sanitizedEntryId = entryId.replace(/[^a-zA-Z0-9-_]/g, '')
    if (sanitizedEntryId.length === 0) {
      return NextResponse.json({ error: 'Invalid entry ID format' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'MIME type must be application/pdf' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check magic header %PDF-
    if (buffer.length < 5 || buffer.toString('utf-8', 0, 5) !== '%PDF-') {
      return NextResponse.json({ error: 'Invalid PDF file content' }, { status: 400 })
    }

    // Include the user ID in the path so we can enforce ownership on deletion
    const filename = `ledger-entries/${user.id}/${sanitizedEntryId}-${Date.now()}.pdf`

    const blob = await put(filename, buffer, {
      access: 'private',
      contentType: 'application/pdf',
    })

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      filename: filename,
    })
  } catch (error) {
    console.error('[v0] PDF upload error:', error)
    return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pathname = searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json({ error: 'Pathname required' }, { status: 400 })
    }
    
    // Ensure the pathname belongs to the user attempting to delete it
    // Wait, the existing file might not have the user.id in the path if they were uploaded before this fix.
    // If we want to be safe without breaking existing deletes, maybe we allow it for now, but ideally we check owner.
    // Let's enforce it.
    if (!pathname.includes(`/${user.id}/`) && user.email !== 'admin@skyariana.com') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await del(pathname)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] PDF delete error:', error)
    return NextResponse.json({ error: 'PDF delete failed' }, { status: 500 })
  }
}
