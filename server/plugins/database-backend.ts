import { missingDatabaseSettings } from '../utils/supabase'

/**
 * Fails the server at startup when its database is not configured, naming the
 * settings it wanted.
 *
 * A shop that cannot reach its data should say so on the way up rather than
 * serve a page that half works: without this, a missing connection setting
 * first shows itself as a 502 on the catalogue, which reads like an outage at
 * the database rather than a deployment that was never told where its database
 * is.
 */
export default defineNitroPlugin(() => {
  const missing = missingDatabaseSettings()
  if (!missing.length) return

  throw new Error(
    `The database is not configured. Set ${missing.join(' and ')}. ` +
      'NUXT_DATABASE_BACKEND names the backend (supabase or neon); it is never guessed.'
  )
})
