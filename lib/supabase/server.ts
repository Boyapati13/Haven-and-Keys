import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the SERVICE_ROLE key.
 * This bypasses Row Level Security and must NEVER be exposed to the client.
 * Use this in API routes and server components only.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
