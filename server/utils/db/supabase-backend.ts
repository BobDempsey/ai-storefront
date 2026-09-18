import { createClient } from '@supabase/supabase-js'
import type { Database } from '~~/server/types/database'
import type { DatabaseBackend } from './backend'

/**
 * The Supabase backend: a service-role client, which is server-only because it
 * bypasses RLS. This is the code `server/utils/supabase.ts` held before the
 * backend became a setting, moved behind the interface unchanged.
 */
export function createSupabaseBackend(url: string, serviceKey: string): DatabaseBackend {
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false }
  })
}

/**
 * Names the settings this backend needs and has not got, or nothing at all when
 * it is ready. Returning the names rather than a boolean is what lets both the
 * startup check and the lazy path say which setting is missing.
 */
export function missingSupabaseSettings(url: string, serviceKey: string): string[] {
  const missing: string[] = []
  if (!url) missing.push('NUXT_SUPABASE_URL')
  if (!serviceKey) missing.push('NUXT_SUPABASE_SERVICE_KEY')
  return missing
}
