import { describe, expect, it } from 'vitest'
import { NeonQuery, UnsupportedQueryError } from '~~/server/utils/db/neon-sql'
import { buildRpc, createNeonBackendWith } from '~~/server/utils/db/neon-backend'
import { searchFilter } from '~~/server/utils/search'

/**
 * The Neon shim is a hand-written query builder standing in for `supabase-js`,
 * so what it puts on the wire is the thing worth pinning: every call site was
 * left untouched by the move, which means nothing else in the repo would notice
 * if a WHERE clause quietly went missing.
 *
 * These tests drive it through a fake runner rather than a database. What it
 * does against real Postgres is covered by running tests/db against both
 * backends, which is a separate task in this change.
 */
function recorder(rows: Record<string, unknown>[][] = [[]]) {
  const calls: { text: string, params: unknown[] }[] = []
  let call = 0
  const run = (text: string, params: unknown[]) => {
    calls.push({ text, params })
    return Promise.resolve(rows[call++] ?? [])
  }
  return { calls, run }
}

function query(table = 'products', rows?: Record<string, unknown>[][]) {
  const { calls, run } = recorder(rows)
  return { calls, q: new NeonQuery(run, table) }
}

describe('reads', () => {
  it('builds a select with a column list, an equality filter and an order', async () => {
    const { calls, q } = query()
    await q.select('id, slug, name').eq('kind', 'digital').order('created_at', { ascending: true })

    expect(calls[0]!.text).toBe(
      'SELECT "id", "slug", "name" FROM public."products" WHERE "kind" = $1 ORDER BY "created_at" ASC'
    )
    expect(calls[0]!.params).toEqual(['digital'])
  })

  it('orders descending and limits', async () => {
    const { calls, q } = query('promo_codes')
    await q.select('code, percent').eq('active', true).order('created_at', { ascending: false }).limit(1)

    expect(calls[0]!.text).toBe(
      'SELECT "code", "percent" FROM public."promo_codes" WHERE "active" = $1 ORDER BY "created_at" DESC LIMIT 1'
    )
  })

  // The cart prices itself by asking for the products it holds, so an `in` that
  // dropped or mistyped an id would price a cart against the wrong rows.
  it('expands in() into one placeholder per value', async () => {
    const { calls, q } = query()
    await q.select('id').in('id', ['a', 'b', 'c'])

    expect(calls[0]!.text).toBe('SELECT "id" FROM public."products" WHERE "id" IN ($1, $2, $3)')
    expect(calls[0]!.params).toEqual(['a', 'b', 'c'])
  })

  it('matches nothing for an empty in() rather than writing invalid SQL', async () => {
    const { calls, q } = query()
    await q.select('id').in('id', [])

    expect(calls[0]!.text).toBe('SELECT "id" FROM public."products" WHERE false')
  })

  it('numbers parameters across several filters in order', async () => {
    const { calls, q } = query()
    await q.select('id').eq('kind', 'physical').in('id', ['x', 'y']).eq('in_stock', true)

    expect(calls[0]!.text).toContain('"kind" = $1')
    expect(calls[0]!.text).toContain('"id" IN ($2, $3)')
    expect(calls[0]!.text).toContain('"in_stock" = $4')
    expect(calls[0]!.params).toEqual(['physical', 'x', 'y', true])
  })
})

describe('single and maybeSingle', () => {
  it('returns the one row', async () => {
    const { q } = query('store_settings', [[{ sale_active: true, sale_percent: 20 }]])
    const { data, error } = await q.select('sale_active, sale_percent').eq('id', true).maybeSingle()

    expect(error).toBeNull()
    expect(data).toEqual({ sale_active: true, sale_percent: 20 })
  })

  it('gives maybeSingle null for no rows, and single an error', async () => {
    const empty = query('promo_codes', [[]])
    expect((await empty.q.select('id').eq('code', 'NOPE').maybeSingle()).data).toBeNull()

    const missing = query('orders', [[]])
    const { data, error } = await missing.q.select('total_cents').eq('id', 'gone').single()
    expect(data).toBeNull()
    expect(error?.code).toBe('PGRST116')
  })

  it('refuses more than one row for either', async () => {
    const many = query('promo_codes', [[{ id: 'a' }, { id: 'b' }]])
    expect((await many.q.select('id').maybeSingle()).error?.code).toBe('PGRST116')
  })
})

describe('writes', () => {
  it('inserts a row and returns what it was asked for', async () => {
    const { calls, q } = query('email_subscribers', [[{ id: 'new-1' }]])
    const { data } = await q.insert({ email: 'buyer@example.com' }).select('id')

    expect(calls[0]!.text).toBe(
      'INSERT INTO public."email_subscribers" ("email") VALUES ($1) RETURNING "id"'
    )
    expect(data).toEqual([{ id: 'new-1' }])
  })

  // subscribe.ts tells a new subscriber from a repeat one by whether any row
  // came back, and sends the welcome email only for a new one. DO NOTHING is
  // what makes a repeat sign-up return nothing instead of raising.
  it('upserts with ON CONFLICT DO NOTHING, and a duplicate returns no rows', async () => {
    const { calls, q } = query('email_subscribers', [[]])
    const { data, error } = await q
      .upsert({ email: 'already@example.com' }, { onConflict: 'email', ignoreDuplicates: true })
      .select('id')

    expect(calls[0]!.text).toBe(
      'INSERT INTO public."email_subscribers" ("email") VALUES ($1) ON CONFLICT ("email") DO NOTHING RETURNING "id"'
    )
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // The SET values are numbered after the WHERE ones, because the filters were
  // added first and had already claimed their placeholders.
  it('updates the columns it was given, keeping the filter\'s parameters', async () => {
    const { calls, q } = query('store_settings')
    await q.update({ sale_active: true, sale_percent: 20 }).eq('id', true)

    expect(calls[0]!.text).toBe(
      'UPDATE public."store_settings" SET "sale_active" = $2, "sale_percent" = $3 WHERE "id" = $1'
    )
    expect(calls[0]!.params).toEqual([true, true, 20])
  })

  it('deletes with its filters and returns the ids it removed', async () => {
    const { calls, q } = query('orders', [[{ id: 'o1' }]])
    await q.delete().eq('is_test', true).lt('created_at', '2026-01-01').select('id')

    expect(calls[0]!.text).toBe(
      'DELETE FROM public."orders" WHERE "is_test" = $1 AND "created_at" < $2 RETURNING "id"'
    )
    expect(calls[0]!.params).toEqual([true, '2026-01-01'])
  })
})

describe('counts', () => {
  it('returns a count and no rows for a head query', async () => {
    const { calls, q } = query('products', [[{ count: 15 }]])
    const { data, count, error } = await q
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'physical')

    expect(calls).toHaveLength(1)
    expect(calls[0]!.text).toBe('SELECT count(*)::int AS count FROM public."products" WHERE "kind" = $1')
    expect(error).toBeNull()
    expect(count).toBe(15)
    expect(data).toEqual([])
  })

  it('returns the matched total alongside a page', async () => {
    const { calls, q } = query('products', [[{ count: 15 }], [{ id: 'a' }, { id: 'b' }]])
    const { data, count } = await q
      .select('id', { count: 'exact' })
      .order('created_at', { ascending: true })
      .range(0, 1)

    expect(count).toBe(15)
    expect(data).toHaveLength(2)
    expect(calls[1]!.text).toContain('LIMIT 2')
    expect(calls[1]!.text).not.toContain('OFFSET')
  })

  it('offsets a later page', async () => {
    const { calls, q } = query('products', [[{ count: 15 }], [{ id: 'm' }]])
    await q.select('id', { count: 'exact' }).range(12, 23)

    expect(calls[1]!.text).toContain('LIMIT 12 OFFSET 12')
  })
})

// products.get.ts turns this code into an empty page showing the true total, so
// a stale link to page nine is a dead end the visitor can see rather than a 502.
describe('a range past the end', () => {
  it('answers with PostgREST\'s own code rather than an empty page', async () => {
    const { q } = query('products', [[{ count: 15 }]])
    const { error, count } = await q.select('id', { count: 'exact' }).range(96, 107)

    expect(error?.code).toBe('PGRST103')
    expect(count).toBe(15)
  })

  it('does not raise it for a page that exists', async () => {
    const { q } = query('products', [[{ count: 15 }], [{ id: 'a' }]])
    expect((await q.select('id', { count: 'exact' }).range(12, 23)).error).toBeNull()
  })
})

describe('the or() filter', () => {
  it('translates what searchFilter builds into ILIKE predicates', async () => {
    const { calls, q } = query()
    await q.select('id').or(searchFilter('dragon'))

    expect(calls[0]!.text).toBe(
      'SELECT "id" FROM public."products" WHERE ("name" ILIKE $1 OR "description" ILIKE $2)'
    )
    expect(calls[0]!.params).toEqual(['%dragon%', '%dragon%'])
  })

  // A search for "50%" must find the row that says 50%, not every row: the
  // escaping searchFilter applies is Postgres's own, so it survives the move.
  it('keeps a literal percent escaped', async () => {
    const { calls, q } = query()
    await q.select('id').or(searchFilter('50%'))

    expect(calls[0]!.params).toEqual(['%50\\%%', '%50\\%%'])
  })

  it('combines with the filters around it', async () => {
    const { calls, q } = query()
    await q.select('id').eq('kind', 'digital').or(searchFilter('planter'))

    expect(calls[0]!.text).toBe(
      'SELECT "id" FROM public."products" WHERE "kind" = $1 AND ("name" ILIKE $2 OR "description" ILIKE $3)'
    )
    expect(calls[0]!.params).toEqual(['digital', '%planter%', '%planter%'])
  })

  it('throws on a filter form it cannot parse rather than matching everything', () => {
    const { q } = query()
    expect(() => q.select('id').or('name.eq.dragon')).toThrow(UnsupportedQueryError)
    expect(() => q.select('id').or('nonsense')).toThrow(UnsupportedQueryError)
  })
})

describe('rpc', () => {
  it('calls create_order by named argument and sends jsonb as JSON text', () => {
    const built = buildRpc('create_order', {
      p_customer: { name: 'Ada', email: 'ada@example.com' },
      p_items: [{ product_id: 'p1', quantity: 2 }],
      p_is_test: true
    })

    expect(built.text).toBe(
      'SELECT public.create_order(p_customer => $1, p_items => $2, p_is_test => $3) AS result'
    )
    expect(built.params[0]).toBe('{"name":"Ada","email":"ada@example.com"}')
    expect(built.params[1]).toBe('[{"product_id":"p1","quantity":2}]')
    expect(built.params[2]).toBe(true)
  })

  it('returns the order id the function produced', async () => {
    const backend = createNeonBackendWith(() => Promise.resolve([{ result: 'order-1' }]))
    const { data, error } = await backend.rpc('create_order', { p_customer: {}, p_items: [] })

    expect(error).toBeNull()
    expect(data).toBe('order-1')
  })

  // orders.post.ts tells a sold-out item from an empty cart by matching what
  // create_order raised. A wrapped message would make every one of them a 502.
  it('surfaces a raised exception with its message intact', async () => {
    const backend = createNeonBackendWith(() =>
      Promise.reject(Object.assign(new Error('unavailable_item'), { code: 'P0001' }))
    )
    const { data, error } = await backend.rpc('create_order', { p_customer: {}, p_items: [] })

    expect(data).toBeNull()
    expect(error?.message).toContain('unavailable_item')
    expect(error?.code).toBe('P0001')
  })

  it('refuses a function it was not built to call', () => {
    expect(() => buildRpc('drop_everything', {})).toThrow(UnsupportedQueryError)
  })
})

describe('what it does not implement', () => {
  it('throws rather than returning an empty result', () => {
    const { q } = query()
    expect(() => q.select('id').eq('kind; drop table products', 'x')).toThrow(UnsupportedQueryError)
    expect(() => q.upsert({ email: 'a@b.c' }, { onConflict: 'email' })).toThrow(UnsupportedQueryError)
    expect(() => q.select('id', { count: 'planned' })).toThrow(UnsupportedQueryError)
  })
})
