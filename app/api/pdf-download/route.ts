import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized access to documents" }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const pathname = searchParams.get("pathname")
    if (!pathname) return NextResponse.json({ error: "Pathname required" }, { status: 400 })

    const response = await fetch(`https://g76dyj2bzpk09vk3.public.blob.vercel-storage.com/${pathname}`, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Document not found or inaccessible" }, { status: response.status })
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
