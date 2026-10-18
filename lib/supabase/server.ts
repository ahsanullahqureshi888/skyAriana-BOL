import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for Server Components / Route Handlers.
 * If Supabase environment variables are missing (e.g. running in local offline mode),
 * returns a safe stub that fails gracefully rather than throwing an exception.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const errorResult = { data: null, error: new Error("Supabase is not configured") }
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase is not configured") }),
      },
      from: () => ({
        select: () => ({
          order: () => Promise.resolve(errorResult),
          eq: () => ({
            order: () => Promise.resolve(errorResult),
            maybeSingle: () => Promise.resolve(errorResult),
            single: () => Promise.resolve(errorResult),
          }),
          or: () => ({
            maybeSingle: () => Promise.resolve(errorResult),
          }),
          maybeSingle: () => Promise.resolve(errorResult),
          single: () => Promise.resolve(errorResult),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(errorResult),
            maybeSingle: () => Promise.resolve(errorResult),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: () => Promise.resolve(errorResult),
            }),
          }),
          or: () => ({
            select: () => ({
              maybeSingle: () => Promise.resolve(errorResult),
            }),
          }),
        }),
        delete: () => ({
          eq: () => Promise.resolve(errorResult),
          or: () => Promise.resolve(errorResult),
        }),
      }),
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
