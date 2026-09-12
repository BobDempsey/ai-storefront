import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~~/server/types/database'

let client: SupabaseClient<Database> | null = null

/** Service-role client. Server-only, because it bypasses RLS. */
export function useSupabase(): SupabaseClient<Database> {
  if (client) return client

  const { supabaseUrl, supabaseServiceKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase is not configured. Set NUXT_SUPABASE_URL and NUXT_SUPABASE_SERVICE_KEY.'
    })
  }

  client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
  return client
}
