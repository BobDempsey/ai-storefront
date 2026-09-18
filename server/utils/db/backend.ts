import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~~/server/types/database'

/**
 * What the storefront asks of a database, and nothing more.
 *
 * The shape is `supabase-js`'s own `from` and `rpc`, deliberately: the fifteen
 * call sites across `server/api/` and `server/utils/` are already written and
 * already typed against it, so borrowing the surface is what lets the backend
 * become a setting without a single route changing. See design.md in
 * `openspec/changes/move-demo-database-to-neon/` for why a rewrite to SQL is a
 * later change rather than this one.
 *
 * A backend that is not Supabase implements as much of this surface as this
 * repo actually calls and throws on the rest. An unimplemented method must
 * fail loudly rather than return an empty result: a query that quietly matches
 * nothing looks like an empty catalogue, and nobody reports it.
 */
export type DatabaseBackend = Pick<SupabaseClient<Database>, 'from' | 'rpc'>

/** Which backends a deployment may name. */
export const DATABASE_BACKENDS = ['supabase', 'neon'] as const

export type DatabaseBackendName = (typeof DATABASE_BACKENDS)[number]

export function isDatabaseBackendName(value: string): value is DatabaseBackendName {
  return (DATABASE_BACKENDS as readonly string[]).includes(value)
}
