import { createError } from 'h3'
import { vi } from 'vitest'

/**
 * Nuxt auto-imports `createError` and `useSupabase` into server code, so the
 * modules under test reference them as globals. Vitest runs those files
 * directly, outside Nitro, so the globals have to be supplied here.
 *
 * `createError` is the real one from h3, not a stand-in: a test asserting on a
 * 429 should be asserting on the object the route actually throws.
 */
vi.stubGlobal('createError', createError)

/** Replaced per test by `useSupabaseReturning`. Unset, it fails loudly. */
vi.stubGlobal('useSupabase', () => {
  throw new Error('useSupabase was called without a stub; use useSupabaseReturning()')
})

/** Replaced per test by `useRuntimeConfigReturning`. Unset, it fails loudly. */
vi.stubGlobal('useRuntimeConfig', () => {
  throw new Error('useRuntimeConfig was called without a stub; use useRuntimeConfigReturning()')
})

/**
 * The Pinia stores auto-import this from the persistedstate Nuxt module, and
 * they read it while the module is being evaluated, not when an action runs.
 * So it has to exist before a test file imports a store at all. The tests here
 * never install the plugin, so what these return is never used; they only have
 * to be callable.
 */
vi.stubGlobal('piniaPluginPersistedstate', {
  localStorage: () => undefined,
  sessionStorage: () => undefined,
  cookies: () => undefined
})

/**
 * Stubs the Nuxt runtime config for a test. Only the keys a test cares about
 * need supplying; anything else reads as undefined, which is what an unset
 * environment variable produces at runtime.
 */
export function useRuntimeConfigReturning(config: Record<string, unknown>) {
  vi.stubGlobal('useRuntimeConfig', () => config)
}

type Row = Record<string, unknown> | null

/**
 * A Supabase client stub shaped like the query chains promo.ts builds. Each
 * table gets `{ data, error }`, and every chained method returns the builder
 * until `maybeSingle()` resolves it.
 */
export function useSupabaseReturning(tables: Record<string, { data: Row; error: unknown }>) {
  const calls: { table: string; filters: Record<string, unknown> }[] = []

  vi.stubGlobal('useSupabase', () => ({
    from(table: string) {
      const record = { table, filters: {} as Record<string, unknown> }
      calls.push(record)

      const builder: Record<string, unknown> = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        eq(column: string, value: unknown) {
          record.filters[column] = value
          return builder
        },
        maybeSingle: async () => tables[table] ?? { data: null, error: null }
      }
      return builder
    }
  }))

  return calls
}
