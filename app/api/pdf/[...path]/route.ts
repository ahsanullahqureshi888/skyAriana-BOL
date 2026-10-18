import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const resolvedParams = await params
    // 1. Authentication Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized access to private documents" },
          { status: 401 }
        )
      }
    }

    // 2. Construct Blob Path
    const pathMembers = resolvedParams?.path || []
    if (pathMembers.length === 0) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }
    
    const pathname = pathMembers.join("/")
    const projectId = process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.split('_')[1] : null

    // If no token is available or offline, we can't fetch from Vercel
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 501 })
    }

    // 3. Fetch Private Blob Using Authorization
    // The exact URL depends on the storage identifier.
    // We can use the official (virtual) API url format or direct download
    // @vercel/blob doesn't have a direct `get` method, it relies on short-lived tokens.
    // We can generate a client token and redirect, or just call the blob API
    // Actually, @vercel/blob provides a `createToken` for downloads.
    // For simplicity lets dynamically import @vercel/blob package and create a download url. 
    const { list } = await import("@vercel/blob")
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    if (!blobs || blobs.length === 0 || blobs[0].pathname !== pathname) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Now we have the public or private url

    const response = await fetch(blobs[0].downloadUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Document inaccessible" }, { status: response.status })
    }

    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pathname.split('/').pop()}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve document" }, { status: 500 })
  }
}
