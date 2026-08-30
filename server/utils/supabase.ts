import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** Service-role client. Server-only — it bypasses RLS. */
export function useSupabase(): SupabaseClient {
  if (client) return client

  const { supabaseUrl, supabaseServiceKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase is not configured. Set NUXT_SUPABASE_URL and NUXT_SUPABASE_SERVICE_KEY.'
    })
  }

  client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
  return client
}
