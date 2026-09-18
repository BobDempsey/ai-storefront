import { createNeonBackend } from './db/neon-backend'
import { createSupabaseBackend, missingSupabaseSettings } from './db/supabase-backend'
import { isDatabaseBackendName, type DatabaseBackend } from './db/backend'

let backend: DatabaseBackend | null = null

/**
 * Names the configuration this deployment's chosen backend needs and has not
 * got. An empty array means it is ready to connect.
 *
 * The backend is named in configuration rather than guessed from the shape of a
 * connection string. Guessing is how a shop ends up serving another shop's rows
 * with nothing in the logs saying so.
 */
export function missingDatabaseSettings(): string[] {
  const { databaseBackend, supabaseUrl, supabaseServiceKey, neonDatabaseUrl } = useRuntimeConfig()

  if (!databaseBackend) return ['NUXT_DATABASE_BACKEND']
  if (!isDatabaseBackendName(databaseBackend)) return ['NUXT_DATABASE_BACKEND']

  return databaseBackend === 'neon'
    ? neonDatabaseUrl
      ? []
      : ['NUXT_NEON_DATABASE_URL']
    : missingSupabaseSettings(supabaseUrl, supabaseServiceKey)
}

/**
 * The one database client. Server-only: on Supabase it is the service-role key,
 * which bypasses RLS, and on Neon it is a connection string. Neither ever
 * reaches a browser.
 *
 * The name is unchanged from when Supabase was the only backend, because every
 * call site imports it and the point of the backend interface is that none of
 * them had to move.
 */
export function useSupabase(): DatabaseBackend {
  if (backend) return backend

  const { databaseBackend, supabaseUrl, supabaseServiceKey } = useRuntimeConfig()

  const missing = missingDatabaseSettings()
  if (missing.length) {
    throw createError({
      statusCode: 500,
      statusMessage: `The database is not configured. Set ${missing.join(' and ')}.`
    })
  }

  // No fallback between backends, deliberately: a shop with a broken database
  // is visibly down, and a shop quietly serving another database's rows is not.
  backend =
    databaseBackend === 'neon'
      ? createNeonBackend(useRuntimeConfig().neonDatabaseUrl)
      : createSupabaseBackend(supabaseUrl, supabaseServiceKey)
  return backend
}
