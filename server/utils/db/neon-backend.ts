import { neon } from '@neondatabase/serverless'
import type { DatabaseBackend } from './backend'
import { NeonQuery, UnsupportedQueryError, type QueryResult, type SqlRunner } from './neon-sql'

/**
 * The only stored function this storefront calls. Naming it rather than
 * allowing any function is the same rule the rest of the shim follows: a call
 * it does not recognise fails loudly instead of doing something plausible.
 */
const CALLABLE_FUNCTIONS = ['create_order'] as const

const ARGUMENT_NAME = /^p_[a-z0-9_]*$/

/**
 * Builds the `select` that calls a stored function.
 *
 * Named notation (`p_customer => $1`) rather than positional, because
 * `create_order`'s two defaulted arguments mean the call sites omit keys and a
 * positional call would then pass the wrong value to the wrong parameter.
 * Postgres infers each placeholder's type from the function's own signature, so
 * a jsonb argument only has to arrive as its JSON text.
 */
export function buildRpc(fn: string, args: Record<string, unknown>): { text: string, params: unknown[] } {
  if (!(CALLABLE_FUNCTIONS as readonly string[]).includes(fn)) {
    throw new UnsupportedQueryError(`the function ${JSON.stringify(fn)}`)
  }

  const params: unknown[] = []
  const assignments = Object.entries(args).map(([name, value]) => {
    if (!ARGUMENT_NAME.test(name)) throw new UnsupportedQueryError(`the argument name ${JSON.stringify(name)}`)
    params.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : value)
    return `${name} => $${params.length}`
  })

  return { text: `SELECT public.${fn}(${assignments.join(', ')}) AS result`, params }
}

/** The backend, over any runner. Separated from `neon()` so the tests can drive it. */
export function createNeonBackendWith(run: SqlRunner): DatabaseBackend {
  const backend = {
    from(table: string) {
      return new NeonQuery(run, table)
    },

    async rpc(fn: string, args: Record<string, unknown> = {}): Promise<QueryResult<unknown>> {
      const built = buildRpc(fn, args)
      try {
        const rows = await run(built.text, built.params)
        return { data: rows[0]?.result ?? null, error: null, count: null, status: 200, statusText: 'OK' }
      } catch (cause) {
        const error = cause as { message?: unknown, code?: unknown, detail?: unknown, hint?: unknown }
        return {
          data: null,
          error: {
            // Intact, because orders.post.ts tells a sold-out item from an
            // empty cart by matching what create_order raised.
            message: typeof error?.message === 'string' ? error.message : String(cause),
            code: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
            details: typeof error?.detail === 'string' ? error.detail : '',
            hint: typeof error?.hint === 'string' ? error.hint : ''
          },
          count: null,
          status: 500,
          statusText: 'Internal Server Error'
        }
      }
    }
  }

  // The one cast in the shim, and the reason it is here rather than spread
  // across the call sites: `DatabaseBackend` is `supabase-js`'s own `from` and
  // `rpc`, whose generic return types are inferred from a select string by
  // type-level parsing this builder does not reproduce. Callers keep being
  // checked against `Database`; what the builder actually does is covered by
  // the unit tests beside it and by running tests/db against both backends.
  return backend as unknown as DatabaseBackend
}

/** The backend over a real Neon connection. */
export function createNeonBackend(connectionString: string): DatabaseBackend {
  const sql = neon(connectionString)
  return createNeonBackendWith(async (text, params) => {
    return (await sql.query(text, params)) as Record<string, unknown>[]
  })
}
